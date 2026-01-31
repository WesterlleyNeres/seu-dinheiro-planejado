import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const now = new Date().toISOString();
    
    // Buscar lembretes pendentes que já passaram
    const { data: reminders, error } = await supabase
      .from("ff_reminders")
      .select("*")
      .eq("status", "pending")
      .lte("remind_at", now)
      .limit(100);
    
    if (error) throw error;
    
    console.log(`Encontrados ${reminders?.length || 0} lembretes para processar`);
    
    const processed: string[] = [];
    
    for (const reminder of reminders || []) {
      // Marcar como enviado
      const { error: updateError } = await supabase
        .from("ff_reminders")
        .update({ 
          status: "sent", 
          updated_at: now 
        })
        .eq("id", reminder.id);
      
      if (updateError) {
        console.error(`Erro ao atualizar reminder ${reminder.id}:`, updateError);
        continue;
      }
      
      processed.push(reminder.id);
      
      // Nota: Push real via Web Push API requer VAPID keys
      // Por ora, apenas marcamos como sent
      console.log(`Lembrete processado: ${reminder.title}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processed.length,
        ids: processed 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Erro:", err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
