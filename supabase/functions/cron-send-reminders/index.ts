import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simplified web push - just marks as sent for now
// Full implementation requires proper ECDH encryption
async function sendWebPushSimple(
  endpoint: string,
  vapidJwt: string,
  vapidPublicKey: string
): Promise<{ success: boolean; status?: number }> {
  try {
    // Simple ping to the endpoint
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${vapidJwt}, k=${vapidPublicKey}`,
        "Content-Type": "application/octet-stream",
        "Content-Length": "0",
        "TTL": "86400",
      },
    });
    
    return { success: response.ok, status: response.status };
  } catch {
    return { success: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const now = new Date().toISOString();
    
    // 1. Buscar lembretes pendentes que já passaram
    const { data: reminders, error: remindersError } = await supabase
      .from("ff_reminders")
      .select("*")
      .eq("status", "pending")
      .lte("remind_at", now)
      .limit(100);
    
    if (remindersError) {
      throw remindersError;
    }
    
    console.log(`[CRON] Found ${reminders?.length || 0} pending reminders`);
    
    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending reminders" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const processed: string[] = [];
    const failed: string[] = [];
    
    for (const reminder of reminders) {
      try {
        // 2. Buscar subscriptions ativas do usuário/tenant
        const { data: subscriptions } = await supabase
          .from("ff_push_subscriptions")
          .select("*")
          .eq("tenant_id", reminder.tenant_id)
          .eq("user_id", reminder.created_by)
          .eq("is_active", true);
        
        if (!subscriptions || subscriptions.length === 0) {
          // Sem subscription, incrementar attempt_count
          await supabase
            .from("ff_reminders")
            .update({
              attempt_count: (reminder.attempt_count || 0) + 1,
              last_attempt_at: now,
              updated_at: now,
            })
            .eq("id", reminder.id);
          
          console.log(`[CRON] No subscriptions for reminder ${reminder.id}, incrementing attempt`);
          continue;
        }
        
        // 3. Marcar como enviado (simulação - em produção enviaria push real)
        // Para envio real, precisaria de VAPID keys e encriptação completa
        
        let anySent = false;
        
        for (const sub of subscriptions) {
          // Simular envio (em produção, usar web-push library)
          // Por ora, apenas logamos
          console.log(`[CRON] Would send push to ${sub.endpoint.substring(0, 50)}...`);
          anySent = true;
          
          // Enviar notificação local via workaround (para teste)
          // Em produção real, usar a lógica completa de web-push
        }
        
        if (anySent) {
          // 4. Atualizar reminder para sent
          await supabase
            .from("ff_reminders")
            .update({
              status: "sent",
              sent_at: now,
              updated_at: now,
            })
            .eq("id", reminder.id);
          
          processed.push(reminder.id);
          console.log(`[CRON] Reminder ${reminder.id} marked as sent`);
        }
        
      } catch (err) {
        console.error(`[CRON] Error processing reminder ${reminder.id}:`, err);
        failed.push(reminder.id);
        
        // Registrar falha
        await supabase
          .from("ff_reminders")
          .update({
            attempt_count: (reminder.attempt_count || 0) + 1,
            last_attempt_at: now,
            updated_at: now,
          })
          .eq("id", reminder.id);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: processed.length,
        failed: failed.length,
        processed_ids: processed,
        failed_ids: failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[CRON] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
