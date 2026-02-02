import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

// System prompt defining JARVIS personality
const SYSTEM_PROMPT = `Você é JARVIS, o assistente pessoal inteligente do usuário.
Sua missão é ajudar a organizar a vida pessoal e financeira do seu criador.

Você tem acesso a:
- Tarefas e compromissos (ff_tasks)
- Eventos do calendário (ff_events)
- Hábitos e progresso (ff_habits, ff_habit_logs)
- Finanças (transactions, wallets, budgets)
- Memórias e preferências (ff_memory_items)
- Lembretes (ff_reminders)

Regras importantes:
1. Seja conciso e objetivo nas respostas
2. Use as ferramentas disponíveis para consultar dados reais - NUNCA invente informações
3. Quando o usuário perguntar sobre dados, use a ferramenta apropriada
4. Formate valores monetários em R$ com 2 casas decimais
5. Datas devem estar no formato brasileiro (DD/MM/YYYY)
6. Seja proativo em sugerir ações e próximos passos
7. Trate o usuário de forma pessoal e amigável

Hoje é: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

// Tool definitions for the AI
const TOOLS = [
  {
    type: "function",
    function: {
      name: "query_tasks",
      description: "Consulta tarefas do usuário. Use para responder perguntas sobre tarefas pendentes, concluídas ou por fazer.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["open", "in_progress", "done", "all"],
            description: "Filtrar por status. Use 'all' para todas.",
          },
          due_date: {
            type: "string",
            description: "Filtrar por data de vencimento (YYYY-MM-DD). Use 'today' para hoje, 'week' para esta semana.",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Filtrar por prioridade",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_events",
      description: "Consulta eventos do calendário. Use para responder sobre compromissos agendados.",
      parameters: {
        type: "object",
        properties: {
          date_range: {
            type: "string",
            description: "Período: 'today', 'tomorrow', 'week', 'month' ou data específica YYYY-MM-DD",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_habits",
      description: "Consulta hábitos e progresso. Use para responder sobre evolução de hábitos.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Período de análise: 'today', 'week', 'month'",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_finances",
      description: "Consulta dados financeiros: transações, saldos, contas a pagar/receber.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["pending_bills", "balance", "expenses", "income", "summary"],
            description: "Tipo de consulta financeira",
          },
          date_filter: {
            type: "string",
            description: "Filtro de data: 'today', 'week', 'month' ou YYYY-MM",
          },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_memories",
      description: "Busca memórias e preferências salvas do usuário.",
      parameters: {
        type: "object",
        properties: {
          search_term: {
            type: "string",
            description: "Termo de busca nas memórias",
          },
          kind: {
            type: "string",
            enum: ["profile", "preference", "decision", "project", "note", "message"],
            description: "Tipo de memória",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Cria uma nova tarefa para o usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da tarefa" },
          description: { type: "string", description: "Descrição opcional" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_at: { type: "string", description: "Data de vencimento YYYY-MM-DD" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_reminder",
      description: "Cria um lembrete para o usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Texto do lembrete" },
          remind_at: { type: "string", description: "Data/hora do lembrete YYYY-MM-DDTHH:MM" },
          channel: { type: "string", enum: ["whatsapp", "push", "email"] },
        },
        required: ["title", "remind_at"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_memory",
      description: "Salva uma informação importante na memória do JARVIS.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Conteúdo a ser lembrado" },
          kind: { type: "string", enum: ["profile", "preference", "decision", "project", "note"] },
          title: { type: "string", description: "Título opcional" },
        },
        required: ["content", "kind"],
      },
    },
  },
];

// Tool execution functions
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  supabase: any,
  tenantId: string,
  userId: string
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  switch (toolName) {
    case "query_tasks": {
      let query = supabase
        .from("ff_tasks")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("due_at", { ascending: true, nullsFirst: false });

      if (args.status && args.status !== "all") {
        query = query.eq("status", args.status);
      } else {
        query = query.neq("status", "done");
      }

      if (args.due_date === "today") {
        query = query.eq("due_at", today);
      } else if (args.due_date === "week") {
        query = query.gte("due_at", startOfWeek.toISOString().split("T")[0])
          .lte("due_at", endOfWeek.toISOString().split("T")[0]);
      } else if (args.due_date) {
        query = query.eq("due_at", args.due_date);
      }

      if (args.priority) {
        query = query.eq("priority", args.priority);
      }

      const { data, error } = await query.limit(20);
      if (error) return `Erro ao buscar tarefas: ${error.message}`;
      if (!data?.length) return "Nenhuma tarefa encontrada com esses filtros.";

      return JSON.stringify(data.map((t: any) => ({
        titulo: t.title,
        status: t.status,
        prioridade: t.priority,
        vencimento: t.due_at,
      })));
    }

    case "query_events": {
      let startDate = today;
      let endDate = today;

      if (args.date_range === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        startDate = endDate = tomorrow.toISOString().split("T")[0];
      } else if (args.date_range === "week") {
        startDate = startOfWeek.toISOString().split("T")[0];
        endDate = endOfWeek.toISOString().split("T")[0];
      } else if (args.date_range === "month") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        startDate = startOfMonth.toISOString().split("T")[0];
        endDate = endOfMonth.toISOString().split("T")[0];
      } else if (args.date_range && args.date_range !== "today") {
        startDate = endDate = args.date_range as string;
      }

      const { data, error } = await supabase
        .from("ff_events")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("start_at", `${startDate}T00:00:00`)
        .lte("start_at", `${endDate}T23:59:59`)
        .order("start_at", { ascending: true })
        .limit(20);

      if (error) return `Erro ao buscar eventos: ${error.message}`;
      if (!data?.length) return "Nenhum evento encontrado para o período.";

      return JSON.stringify(data.map((e: any) => ({
        titulo: e.title,
        inicio: e.start_at,
        local: e.location,
        descricao: e.description,
      })));
    }

    case "query_habits": {
      const { data: habits, error: habitsError } = await supabase
        .from("ff_habits")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true);

      if (habitsError) return `Erro ao buscar hábitos: ${habitsError.message}`;
      if (!habits?.length) return "Nenhum hábito ativo cadastrado.";

      // Get logs for the period
      let logStartDate = today;
      if (args.period === "week") {
        logStartDate = startOfWeek.toISOString().split("T")[0];
      } else if (args.period === "month") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        logStartDate = startOfMonth.toISOString().split("T")[0];
      }

      const { data: logs } = await supabase
        .from("ff_habit_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("log_date", logStartDate)
        .lte("log_date", today);

      const habitStats = habits.map((h: any) => {
        const habitLogs = logs?.filter((l: any) => l.habit_id === h.id) || [];
        const totalValue = habitLogs.reduce((sum: number, l: any) => sum + l.value, 0);
        return {
          titulo: h.title,
          cadencia: h.cadence,
          meta: h.times_per_cadence,
          completado: habitLogs.length,
          progresso: `${Math.round((habitLogs.length / h.times_per_cadence) * 100)}%`,
        };
      });

      return JSON.stringify(habitStats);
    }

    case "query_finances": {
      const mesReferencia = args.date_filter === "month" || !args.date_filter
        ? new Date().toISOString().slice(0, 7)
        : args.date_filter as string;

      if (args.type === "pending_bills") {
        let query = supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .eq("tipo", "despesa")
          .eq("status", "pendente")
          .is("deleted_at", null)
          .order("data", { ascending: true });

        if (args.date_filter === "today") {
          query = query.eq("data", today);
        } else if (args.date_filter === "week") {
          query = query.gte("data", startOfWeek.toISOString().split("T")[0])
            .lte("data", endOfWeek.toISOString().split("T")[0]);
        }

        const { data, error } = await query.limit(20);
        if (error) return `Erro ao buscar contas: ${error.message}`;
        if (!data?.length) return "Nenhuma conta pendente encontrada.";

        const total = data.reduce((sum: number, t: any) => sum + t.valor, 0);
        return JSON.stringify({
          contas: data.map((t: any) => ({
            descricao: t.descricao,
            valor: t.valor,
            vencimento: t.data,
          })),
          total,
        });
      }

      if (args.type === "balance") {
        const { data, error } = await supabase
          .from("v_wallet_balance")
          .select("*")
          .eq("user_id", userId);

        if (error) return `Erro ao buscar saldos: ${error.message}`;
        if (!data?.length) return "Nenhuma carteira encontrada.";

        const total = data.reduce((sum: number, w: any) => sum + (w.saldo || 0), 0);
        return JSON.stringify({
          carteiras: data.map((w: any) => ({
            nome: w.wallet_nome,
            tipo: w.wallet_tipo,
            saldo: w.saldo,
          })),
          saldo_total: total,
        });
      }

      if (args.type === "summary") {
        const { data, error } = await supabase
          .from("v_monthly_summary")
          .select("*")
          .eq("user_id", userId)
          .eq("mes_referencia", mesReferencia);

        if (error) return `Erro ao buscar resumo: ${error.message}`;
        if (!data?.length) return "Sem dados para o período.";

        const receitas = data.find((d: any) => d.tipo === "receita");
        const despesas = data.find((d: any) => d.tipo === "despesa");

        return JSON.stringify({
          mes: mesReferencia,
          receitas_total: receitas?.total_pago || 0,
          despesas_total: despesas?.total_pago || 0,
          saldo_mensal: (receitas?.total_pago || 0) - (despesas?.total_pago || 0),
        });
      }

      return "Tipo de consulta financeira não reconhecido.";
    }

    case "query_memories": {
      let query = supabase
        .from("ff_memory_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (args.kind) {
        query = query.eq("kind", args.kind);
      }

      if (args.search_term) {
        query = query.or(`content.ilike.%${args.search_term}%,title.ilike.%${args.search_term}%`);
      }

      const { data, error } = await query;
      if (error) return `Erro ao buscar memórias: ${error.message}`;
      if (!data?.length) return "Nenhuma memória encontrada.";

      return JSON.stringify(data.map((m: any) => ({
        titulo: m.title,
        conteudo: m.content,
        tipo: m.kind,
        criado_em: m.created_at,
      })));
    }

    case "create_task": {
      const { data, error } = await supabase
        .from("ff_tasks")
        .insert({
          tenant_id: tenantId,
          created_by: userId,
          title: args.title,
          description: args.description || null,
          priority: args.priority || "medium",
          due_at: args.due_at || null,
          status: "open",
          source: "manual",
          tags: [],
        })
        .select()
        .single();

      if (error) return `Erro ao criar tarefa: ${error.message}`;
      return `Tarefa "${data.title}" criada com sucesso!`;
    }

    case "create_reminder": {
      const { data, error } = await supabase
        .from("ff_reminders")
        .insert({
          tenant_id: tenantId,
          created_by: userId,
          title: args.title,
          remind_at: args.remind_at,
          channel: args.channel || "push",
          status: "pending",
        })
        .select()
        .single();

      if (error) return `Erro ao criar lembrete: ${error.message}`;
      return `Lembrete "${data.title}" criado para ${new Date(data.remind_at).toLocaleString("pt-BR")}!`;
    }

    case "create_memory": {
      const { error } = await supabase
        .from("ff_memory_items")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          content: args.content,
          kind: args.kind,
          title: args.title || null,
          source: "jarvis",
          metadata: {},
        });

      if (error) return `Erro ao salvar memória: ${error.message}`;
      return `Informação salva na memória: "${args.content}"`;
    }

    default:
      return `Ferramenta desconhecida: ${toolName}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, conversationId, tenantId: reqTenantId } = await req.json();

    if (!message || !reqTenantId) {
      return new Response(
        JSON.stringify({ error: "Mensagem e tenantId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to tenant
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", reqTenantId)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Acesso negado ao tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = membership.tenant_id;

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from("ff_conversations")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          channel: "web",
        })
        .select()
        .single();

      if (convError) throw convError;
      convId = newConv.id;
    }

    // Save user message
    await supabase.from("ff_conversation_messages").insert({
      conversation_id: convId,
      tenant_id: tenantId,
      role: "user",
      content: message,
    });

    // Load conversation history
    const { data: history } = await supabase
      .from("ff_conversation_messages")
      .select("role, content, tool_calls, tool_call_id")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build messages array
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history || []).map((m: any) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
    ];

    // Call AI with tools
    let aiResponse = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: TOOLS,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    let aiData = await aiResponse.json();
    let assistantMessage = aiData.choices?.[0]?.message;

    // Handle tool calls (loop until no more tool calls)
    while (assistantMessage?.tool_calls?.length > 0) {
      console.log("Tool calls:", JSON.stringify(assistantMessage.tool_calls));

      // Save assistant message with tool calls
      await supabase.from("ff_conversation_messages").insert({
        conversation_id: convId,
        tenant_id: tenantId,
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: assistantMessage.tool_calls,
      });

      // Execute each tool call
      const toolResults: any[] = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        const result = await executeTool(
          toolCall.function.name,
          args,
          supabase,
          tenantId,
          user.id
        );

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });

        // Save tool result
        await supabase.from("ff_conversation_messages").insert({
          conversation_id: convId,
          tenant_id: tenantId,
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });
      }

      // Continue conversation with tool results
      messages.push(assistantMessage);
      messages.push(...toolResults);

      aiResponse = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          tools: TOOLS,
          stream: false,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI error on tool follow-up: ${aiResponse.status}`);
      }

      aiData = await aiResponse.json();
      assistantMessage = aiData.choices?.[0]?.message;
    }

    // Save final assistant response
    const finalContent = assistantMessage?.content || "Desculpe, não consegui processar sua solicitação.";
    await supabase.from("ff_conversation_messages").insert({
      conversation_id: convId,
      tenant_id: tenantId,
      role: "assistant",
      content: finalContent,
    });

    return new Response(
      JSON.stringify({
        conversationId: convId,
        message: finalContent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
