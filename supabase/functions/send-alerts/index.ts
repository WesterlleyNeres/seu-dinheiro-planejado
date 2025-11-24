import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { generateAlertEmail } from "./emailTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AlertData {
  upcomingBills: Array<{
    descricao: string;
    valor: number;
    data: string;
    daysUntil: number;
  }>;
  budgetAlerts: Array<{
    category: string;
    spent: number;
    limit: number;
    percentage: number;
  }>;
  statementAlerts: Array<{
    wallet: string;
    vence: string;
    total: number;
    daysUntil: number;
  }>;
  goalAlerts: Array<{
    nome: string;
    progress: number;
    target: number;
    prazo: string;
    daysUntil: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { test, userId } = await req.json();

    // Test mode: single user
    if (test && userId) {
      const alertData = await collectAlertData(supabase, userId);
      const { data: user } = await supabase.auth.admin.getUserById(userId);
      
      if (!user?.user?.email) {
        throw new Error("Email do usuário não encontrado");
      }

      const emailHtml = generateAlertEmail(alertData, user.user.email);
      
      await resend.emails.send({
        from: "FRACTTO FLOW <onboarding@resend.dev>",
        to: [user.user.email],
        subject: "☀️ Seu Resumo Financeiro - FRACTTO FLOW [TESTE]",
        html: emailHtml,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Email de teste enviado" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Production mode: all users with alerts enabled
    const today = new Date().toISOString().split("T")[0];
    
    const { data: users, error: usersError } = await supabase
      .from("alert_settings")
      .select("user_id, alert_types")
      .eq("email_enabled", true);

    if (usersError) throw usersError;

    let sent = 0;
    let failed = 0;

    for (const userSettings of users) {
      try {
        // Check idempotency
        const { data: existing } = await supabase
          .from("alert_log")
          .select("id")
          .eq("user_id", userSettings.user_id)
          .eq("alert_date", today)
          .eq("alert_type", "daily_digest")
          .single();

        if (existing) {
          console.log(`Alert already sent today for user ${userSettings.user_id}`);
          continue;
        }

        const alertData = await collectAlertData(supabase, userSettings.user_id);
        
        // Skip if no alerts
        const hasAlerts =
          alertData.upcomingBills.length > 0 ||
          alertData.budgetAlerts.length > 0 ||
          alertData.statementAlerts.length > 0 ||
          alertData.goalAlerts.length > 0;

        if (!hasAlerts) {
          console.log(`No alerts for user ${userSettings.user_id}`);
          continue;
        }

        const { data: user } = await supabase.auth.admin.getUserById(userSettings.user_id);
        
        if (!user?.user?.email) {
          console.error(`No email for user ${userSettings.user_id}`);
          failed++;
          continue;
        }

        const emailHtml = generateAlertEmail(alertData, user.user.email);
        
        await resend.emails.send({
          from: "FRACTTO FLOW <onboarding@resend.dev>",
          to: [user.user.email],
          subject: "☀️ Seu Resumo Financeiro - FRACTTO FLOW",
          html: emailHtml,
        });

        // Log success
        await supabase.from("alert_log").insert({
          user_id: userSettings.user_id,
          alert_date: today,
          alert_type: "daily_digest",
        });

        sent++;
      } catch (error) {
        console.error(`Failed to send alert to user ${userSettings.user_id}:`, error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ sent, failed }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function collectAlertData(supabase: any, userId: string): Promise<AlertData> {
  const today = new Date();
  const days7 = new Date(today);
  days7.setDate(days7.getDate() + 7);
  const days15 = new Date(today);
  days15.setDate(days15.getDate() + 15);
  const days30 = new Date(today);
  days30.setDate(days30.getDate() + 30);

  // Upcoming bills (pendente transactions in next 7-30 days)
  const { data: bills } = await supabase
    .from("transactions")
    .select("descricao, valor, data")
    .eq("user_id", userId)
    .eq("status", "pendente")
    .eq("tipo", "despesa")
    .gte("data", today.toISOString().split("T")[0])
    .lte("data", days30.toISOString().split("T")[0])
    .is("deleted_at", null)
    .order("data", { ascending: true })
    .limit(10);

  const upcomingBills = (bills || []).map((b: any) => ({
    descricao: b.descricao,
    valor: Number(b.valor),
    data: b.data,
    daysUntil: Math.ceil((new Date(b.data).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  }));

  // Budget alerts (>80%)
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, limite_valor, category_id, categories(nome)")
    .eq("user_id", userId)
    .eq("ano", currentYear)
    .eq("mes", currentMonth)
    .is("deleted_at", null);

  const budgetAlerts = [];
  for (const budget of budgets || []) {
    const { data: realizado } = await supabase.rpc("realizado_categoria", {
      p_user_id: userId,
      p_category_id: budget.category_id,
      p_year: currentYear,
      p_month: currentMonth,
    });

    const percentage = (Number(realizado) / Number(budget.limite_valor)) * 100;
    if (percentage >= 80) {
      budgetAlerts.push({
        category: budget.categories.nome,
        spent: Number(realizado),
        limit: Number(budget.limite_valor),
        percentage,
      });
    }
  }

  // Statement alerts (due in next 7 days)
  const { data: statements } = await supabase
    .from("card_statements")
    .select("wallet_id, vence, total, wallets(nome)")
    .eq("user_id", userId)
    .eq("status", "fechada")
    .gte("vence", today.toISOString().split("T")[0])
    .lte("vence", days7.toISOString().split("T")[0]);

  const statementAlerts = (statements || []).map((s: any) => ({
    wallet: s.wallets.nome,
    vence: s.vence,
    total: Number(s.total),
    daysUntil: Math.ceil((new Date(s.vence).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  }));

  // Goal alerts (deadline < 7 days)
  const { data: goals } = await supabase
    .from("goals")
    .select("nome, valor_meta, prazo")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("prazo", "is", null)
    .gte("prazo", today.toISOString().split("T")[0])
    .lte("prazo", days7.toISOString().split("T")[0]);

  const goalAlerts = [];
  for (const goal of goals || []) {
    const { data: contribs } = await supabase
      .from("goals_contribs")
      .select("valor")
      .eq("goal_id", goal.id);

    const progress = (contribs || []).reduce((sum: number, c: any) => sum + Number(c.valor), 0);

    goalAlerts.push({
      nome: goal.nome,
      progress,
      target: Number(goal.valor_meta),
      prazo: goal.prazo,
      daysUntil: Math.ceil((new Date(goal.prazo).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    });
  }

  return {
    upcomingBills,
    budgetAlerts,
    statementAlerts,
    goalAlerts,
  };
}

serve(handler);
