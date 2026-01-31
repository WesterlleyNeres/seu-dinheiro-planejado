import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-token",
};

interface IngestPayload {
  phone_e164: string;
  message_type: "text" | "audio";
  text?: string;
  audio_url?: string;
  message_id?: string;
  sent_at?: string;
  actions?: Action[];
}

interface Action {
  type: "task" | "reminder" | "event" | "habit" | "memory" | "expense" | "income";
  title?: string;
  description?: string;
  due_at?: string;
  remind_at?: string;
  start_at?: string;
  end_at?: string;
  valor?: number;
  category?: string;
  tags?: string[];
  kind?: string;
  content?: string;
}

// Parse simple text for fallback
function parseSimpleText(text: string): Action[] {
  const lower = text.toLowerCase().trim();
  
  // Task
  if (lower.startsWith("tarefa:") || lower.startsWith("task:")) {
    const title = text.split(":").slice(1).join(":").trim();
    return [{ type: "task", title }];
  }
  
  // Reminder
  if (lower.startsWith("lembrete:") || lower.startsWith("reminder:")) {
    const title = text.split(":").slice(1).join(":").trim();
    return [{ type: "reminder", title }];
  }
  
  // Event
  if (lower.startsWith("evento:") || lower.startsWith("event:")) {
    const title = text.split(":").slice(1).join(":").trim();
    return [{ type: "event", title }];
  }
  
  // Expense
  if (lower.startsWith("gasto:") || lower.startsWith("despesa:")) {
    const parts = text.split(":").slice(1).join(":").trim();
    const match = parts.match(/(\d+(?:[.,]\d{2})?)/);
    if (match) {
      const valor = parseFloat(match[1].replace(",", "."));
      const title = parts.replace(match[0], "").trim() || "Despesa";
      return [{ type: "expense", title, valor }];
    }
  }
  
  // Memory
  if (lower.startsWith("lembrar:") || lower.startsWith("memoria:") || lower.startsWith("memória:")) {
    const content = text.split(":").slice(1).join(":").trim();
    return [{ type: "memory", content, kind: "note" }];
  }
  
  // Habit
  if (lower.startsWith("habito:") || lower.startsWith("hábito:")) {
    const title = text.split(":").slice(1).join(":").trim();
    return [{ type: "habit", title }];
  }
  
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate n8n token
    const n8nToken = req.headers.get("x-n8n-token");
    const expectedToken = Deno.env.get("N8N_WEBHOOK_TOKEN");
    
    if (expectedToken && n8nToken !== expectedToken) {
      return new Response(
        JSON.stringify({ ok: false, reply: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const payload: IngestPayload = await req.json();
    const { phone_e164, actions, text } = payload;
    
    if (!phone_e164) {
      return new Response(
        JSON.stringify({ ok: false, reply: "phone_e164 obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // 1. Resolve user/tenant by verified phone
    const { data: phone, error: phoneError } = await supabase
      .from("ff_user_phones")
      .select("*")
      .eq("phone_e164", phone_e164)
      .not("verified_at", "is", null)
      .maybeSingle();
    
    if (phoneError) throw phoneError;
    
    if (!phone) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          reply: "❌ Seu número não está verificado. Acesse fracttoflow.lovable.app/jarvis/settings para vincular e depois envie 'verificar' aqui." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { tenant_id, user_id } = phone;
    const created: string[] = [];
    
    // 2. If no actions, try simple text parsing
    let actionsToProcess = actions || [];
    
    if (actionsToProcess.length === 0 && text) {
      actionsToProcess = parseSimpleText(text);
    }
    
    if (actionsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          reply: "🤔 Não entendi. Tente:\n• tarefa: comprar leite\n• lembrete: reunião às 14h\n• evento: aniversário amanhã\n• despesa: 50 almoço" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 3. Process each action
    for (const action of actionsToProcess) {
      try {
        switch (action.type) {
          case "task":
            await supabase.from("ff_tasks").insert({
              tenant_id,
              created_by: user_id,
              title: action.title || "Nova tarefa",
              description: action.description || null,
              due_at: action.due_at || null,
              tags: action.tags || [],
              source: "whatsapp",
              status: "open",
              priority: "medium",
            });
            created.push(`📋 Tarefa: ${action.title}`);
            break;
            
          case "reminder":
            const remindAt = action.remind_at || new Date(Date.now() + 3600000).toISOString();
            await supabase.from("ff_reminders").insert({
              tenant_id,
              created_by: user_id,
              title: action.title || "Lembrete",
              remind_at: remindAt,
              channel: "whatsapp",
              status: "pending",
            });
            created.push(`⏰ Lembrete: ${action.title}`);
            break;
            
          case "event":
            const startAt = action.start_at || new Date().toISOString();
            await supabase.from("ff_events").insert({
              tenant_id,
              created_by: user_id,
              title: action.title || "Evento",
              description: action.description || null,
              start_at: startAt,
              end_at: action.end_at || null,
              all_day: !action.end_at,
              source: "whatsapp",
              status: "scheduled",
              priority: "medium",
            });
            created.push(`📅 Evento: ${action.title}`);
            break;
            
          case "habit":
            await supabase.from("ff_habits").insert({
              tenant_id,
              created_by: user_id,
              title: action.title || "Novo hábito",
              cadence: "daily",
              times_per_cadence: 1,
              target_type: "count",
              target_value: 1,
              active: true,
            });
            created.push(`🔄 Hábito: ${action.title}`);
            break;
            
          case "memory":
            await supabase.from("ff_memory_items").insert({
              tenant_id,
              user_id,
              kind: action.kind || "note",
              title: action.title || null,
              content: action.content || action.title || "",
              source: "whatsapp",
              metadata: {},
            });
            created.push(`🧠 Memória: ${action.title || action.content?.substring(0, 30)}`);
            break;
            
          case "expense":
          case "income":
            const tipo = action.type === "expense" ? "despesa" : "receita";
            
            // Get default category for user
            const { data: category } = await supabase
              .from("categories")
              .select("id")
              .eq("user_id", user_id)
              .eq("tipo", tipo)
              .limit(1)
              .single();
            
            if (category && action.valor) {
              const hoje = new Date().toISOString().split("T")[0];
              const mesRef = hoje.substring(0, 7);
              
              await supabase.from("transactions").insert({
                user_id,
                tipo,
                descricao: action.title || (tipo === "despesa" ? "Despesa WhatsApp" : "Receita WhatsApp"),
                valor: action.valor,
                data: hoje,
                mes_referencia: mesRef,
                category_id: category.id,
                status: "pendente",
              });
              created.push(`💰 ${tipo === "despesa" ? "Despesa" : "Receita"}: R$ ${action.valor.toFixed(2)}`);
            }
            break;
        }
      } catch (err) {
        console.error(`Error processing ${action.type}:`, err);
      }
    }
    
    // 4. Build response
    const reply = created.length > 0
      ? `✅ Criado:\n${created.join("\n")}`
      : "❌ Nenhum item foi criado. Tente novamente.";
    
    return new Response(
      JSON.stringify({ ok: true, reply, created }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ ok: false, reply: "❌ Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
