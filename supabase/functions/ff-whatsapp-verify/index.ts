import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-token",
};

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
    
    const { phone_e164 } = await req.json();
    
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
    
    // Find and update phone
    const { data: phone, error } = await supabase
      .from("ff_user_phones")
      .update({ verified_at: new Date().toISOString() })
      .eq("phone_e164", phone_e164)
      .is("verified_at", null)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    
    if (!phone) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          reply: "Número não encontrado. Vincule primeiro em fracttoflow.lovable.app/jarvis/settings" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        ok: true, 
        reply: "✅ WhatsApp verificado com sucesso! Agora você pode criar tarefas, lembretes e mais enviando mensagens." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ ok: false, reply: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
