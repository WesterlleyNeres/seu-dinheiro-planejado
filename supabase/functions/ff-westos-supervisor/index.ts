import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function diffDays(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00Z`).getTime();
  const toDate = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor((toDate - fromDate) / DAY_MS);
}

function isWithinCooldown(lastInterventionAt?: string | null): boolean {
  if (!lastInterventionAt) return false;
  const last = new Date(lastInterventionAt).getTime();
  return Date.now() - last < 3 * DAY_MS;
}

function buildPushReminder(title: string) {
  return {
    title,
    channel: "push",
    remind_at: new Date(Date.now() + 60 * 1000).toISOString(),
  };
}

async function insertChatMessage(
  supabase: any,
  tenantId: string,
  userId: string,
  message: string
) {
  let conversationId: string | null = null;
  const { data: existingConv } = await supabase
    .from("ff_conversations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConv?.id) {
    conversationId = existingConv.id;
  } else {
    const { data: newConv, error: convError } = await supabase
      .from("ff_conversations")
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        title: "WestOS",
        channel: "web",
      })
      .select("id")
      .single();
    if (convError) throw convError;
    conversationId = newConv.id;
  }

  await supabase.from("ff_conversation_messages").insert({
    conversation_id: conversationId,
    tenant_id: tenantId,
    role: "assistant",
    content: message,
  });

  await supabase
    .from("ff_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

async function upsertPattern(
  supabase: any,
  tenantId: string,
  userId: string,
  detection: {
    key: string;
    type: "productivity" | "emotional" | "relational";
    severity: number;
    evidence: Record<string, unknown>;
    detected: boolean;
  }
) {
  const { data: existing } = await supabase
    .from("ff_behavior_patterns")
    .select("id, evidence, occurrences, is_active, first_seen_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("pattern_key", detection.key)
    .maybeSingle();

  if (!detection.detected) {
    if (existing?.is_active) {
      await supabase
        .from("ff_behavior_patterns")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return { existing, updated: false };
  }

  const now = new Date().toISOString();
  const prevEvidence = (existing?.evidence as Record<string, unknown>) || {};
  const mergedEvidence = {
    ...prevEvidence,
    ...detection.evidence,
  };

  const payload = {
    tenant_id: tenantId,
    user_id: userId,
    pattern_key: detection.key,
    pattern_type: detection.type,
    severity: detection.severity,
    first_seen_at: existing?.first_seen_at || now,
    last_seen_at: now,
    occurrences: (existing?.occurrences || 0) + 1,
    evidence: mergedEvidence,
    is_active: true,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("ff_behavior_patterns")
    .upsert(payload, { onConflict: "tenant_id,user_id,pattern_key" })
    .select("id, evidence")
    .single();

  if (error) throw error;
  return { existing: data, updated: true };
}

function computeTaskPattern(
  tasks: Array<{ id: string; created_at: string; completed_at: string | null }>,
  startDate: string,
  endDate: string
) {
  const createdCounts: Record<string, number> = {};
  const completedCounts: Record<string, number> = {};

  for (const task of tasks) {
    if (task.created_at) {
      const day = toDateOnly(task.created_at);
      if (day >= startDate && day <= endDate) {
        createdCounts[day] = (createdCounts[day] || 0) + 1;
      }
    }
    if (task.completed_at) {
      const day = toDateOnly(task.completed_at);
      if (day >= startDate && day <= endDate) {
        completedCounts[day] = (completedCounts[day] || 0) + 1;
      }
    }
  }

  const days = Object.keys(createdCounts).filter((day) =>
    (createdCounts[day] || 0) > (completedCounts[day] || 0)
  );

  return {
    days,
    createdCounts,
    completedCounts,
  };
}

function computeEmoPattern(checkins: Array<any>) {
  const matching = checkins.filter(
    (c) => Number(c.mood) <= 4 && Number(c.focus_drift) >= 2
  );
  return matching;
}

function computeRelPattern(checkins: Array<any>) {
  const sorted = [...checkins].sort((a, b) =>
    a.checkin_date.localeCompare(b.checkin_date)
  );

  let maxStreak = 0;
  let currentStreak = 0;
  let streakDates: string[] = [];
  let currentDates: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = sorted[i - 1];
    const isConnected = Boolean(current.human_connection_done);

    if (isConnected) {
      currentStreak = 0;
      currentDates = [];
      continue;
    }

    if (prev) {
      const gap = diffDays(prev.checkin_date, current.checkin_date);
      if (gap !== 1) {
        currentStreak = 0;
        currentDates = [];
      }
    }

    currentStreak += 1;
    currentDates.push(current.checkin_date);

    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
      streakDates = [...currentDates];
    }
  }

  return { maxStreak, streakDates };
}


function computeCycleScore(
  tasks: Array<{ id: string; created_at: string; completed_at: string | null }>,
  checkins: Array<{ nuclear_block_done: boolean | null; human_connection_done: boolean | null }>,
  startDate: string,
  endDate: string
) {
  let createdCount = 0;
  let completedCount = 0;

  for (const task of tasks) {
    if (task.created_at) {
      const day = toDateOnly(task.created_at);
      if (day >= startDate && day <= endDate) {
        createdCount += 1;
      }
    }
    if (task.completed_at) {
      const day = toDateOnly(task.completed_at);
      if (day >= startDate && day <= endDate) {
        completedCount += 1;
      }
    }
  }

  const nuclearDone = checkins.filter((c) => Boolean(c.nuclear_block_done)).length;
  const humanDone = checkins.filter((c) => Boolean(c.human_connection_done)).length;

  const scoreTotal = (completedCount - createdCount) + nuclearDone + humanDone;

  let tier = "maintain";
  if (scoreTotal >= 5) tier = "expand";
  else if (scoreTotal <= -7) tier = "reset";
  else if (scoreTotal <= -3) tier = "reduce";

  return {
    scoreTotal,
    tier,
    createdCount,
    completedCount,
    nuclearDone,
    humanDone,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let payload: { tenant_id?: string; user_id?: string } = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const { tenant_id: filterTenantId, user_id: filterUserId } = payload;

    let membersQuery = supabase
      .from("tenant_members")
      .select("tenant_id, user_id");

    if (filterTenantId) membersQuery = membersQuery.eq("tenant_id", filterTenantId);
    if (filterUserId) membersQuery = membersQuery.eq("user_id", filterUserId);

    const { data: members, error: membersError } = await membersQuery;
    if (membersError) throw membersError;

    const today = toDateOnly(new Date());
    const startDate = toDateOnly(addDays(new Date(), -13));

    let processed = 0;
    const errors: Array<{ tenant_id: string; user_id: string; error: string }> = [];

    for (const member of members || []) {
      const tenantId = member.tenant_id;
      const userId = member.user_id;

      try {
        const [
          checkinsResult,
          tasksResult,
          eventsResult,
          habitLogsResult,
          existingPatternsResult,
        ] = await Promise.all([
          supabase
            .from("ff_daily_checkins")
            .select("id, checkin_date, mood, focus_drift, human_connection_done, nuclear_block_done")
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .gte("checkin_date", startDate)
            .lte("checkin_date", today)
            .order("checkin_date", { ascending: true }),
          supabase
            .from("ff_tasks")
            .select("id, created_at, completed_at")
            .eq("tenant_id", tenantId)
            .eq("created_by", userId)
            .or(`created_at.gte.${startDate},completed_at.gte.${startDate}`),
          supabase
            .from("ff_events")
            .select("id, start_at, status")
            .eq("tenant_id", tenantId)
            .eq("created_by", userId)
            .gte("start_at", `${startDate}T00:00:00`)
            .lte("start_at", `${today}T23:59:59`),
          supabase
            .from("ff_habit_logs")
            .select("id, habit_id, log_date")
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .gte("log_date", startDate)
            .lte("log_date", today),
          supabase
            .from("ff_behavior_patterns")
            .select("id, pattern_key, is_active, evidence")
            .eq("tenant_id", tenantId)
            .eq("user_id", userId),
        ]);

        if (checkinsResult.error) throw checkinsResult.error;
        if (tasksResult.error) throw tasksResult.error;
        if (eventsResult.error) throw eventsResult.error;
        if (habitLogsResult.error) throw habitLogsResult.error;
        if (existingPatternsResult.error) throw existingPatternsResult.error;

        const checkins = checkinsResult.data || [];
        const tasks = tasksResult.data || [];
        const events = eventsResult.data || [];
        const habitLogs = habitLogsResult.data || [];

        const cycleMetrics = computeCycleScore(tasks, checkins, startDate, today);
        const cyclePayload = {
          tenant_id: tenantId,
          user_id: userId,
          start_date: startDate,
          end_date: today,
          primary_metric: "execution",
          score_total: cycleMetrics.scoreTotal,
          tier: cycleMetrics.tier,
          notes: `created:${cycleMetrics.createdCount} completed:${cycleMetrics.completedCount} nuclear:${cycleMetrics.nuclearDone} human:${cycleMetrics.humanDone}`,
          updated_at: new Date().toISOString(),
        };

        const { error: cycleError } = await supabase
          .from("ff_cycles")
          .upsert(cyclePayload, { onConflict: "tenant_id,user_id,start_date" });

        if (cycleError) throw cycleError;

        const taskPatternData = computeTaskPattern(tasks, startDate, today);
        const prodDays = taskPatternData.days.length;
        const prodDetected = prodDays >= 3;
        const prodSeverity = prodDays >= 8 ? 3 : prodDays >= 5 ? 2 : prodDays >= 3 ? 1 : 0;

        const emoMatches = computeEmoPattern(checkins);
        const emoDays = emoMatches.length;
        const emoDetected = emoDays >= 2;
        const emoSeverity = emoDays >= 4 ? 3 : emoDays >= 3 ? 2 : emoDays >= 2 ? 1 : 0;

        const relData = computeRelPattern(checkins);
        const relDetected = relData.maxStreak >= 3;
        const relSeverity = relData.maxStreak >= 7 ? 3 : relData.maxStreak >= 5 ? 2 : relData.maxStreak >= 3 ? 1 : 0;

        const patterns = [
          {
            key: "prod_create_more_than_finish",
            type: "productivity" as const,
            severity: prodSeverity,
            detected: prodDetected,
            evidence: {
              window_start: startDate,
              window_end: today,
              days_with_create_gt_finish: taskPatternData.days,
              created_counts: taskPatternData.createdCounts,
              completed_counts: taskPatternData.completedCounts,
              task_ids: tasks.map((t) => t.id),
              event_ids: events.map((e) => e.id),
              habit_log_ids: habitLogs.map((h) => h.id),
            },
          },
          {
            key: "emo_irritation_proxy",
            type: "emotional" as const,
            severity: emoSeverity,
            detected: emoDetected,
            evidence: {
              window_start: startDate,
              window_end: today,
              checkin_dates: emoMatches.map((c: any) => c.checkin_date),
              checkin_ids: emoMatches.map((c: any) => c.id),
              mood_threshold: 4,
              focus_drift_threshold: 2,
            },
          },
          {
            key: "rel_no_connection_streak",
            type: "relational" as const,
            severity: relSeverity,
            detected: relDetected,
            evidence: {
              window_start: startDate,
              window_end: today,
              max_streak: relData.maxStreak,
              streak_dates: relData.streakDates,
              checkin_ids: checkins.map((c: any) => c.id),
            },
          },
        ];

        const existingPatterns = existingPatternsResult.data || [];

        for (const detection of patterns) {
          const existingPattern = existingPatterns.find((p: any) => p.pattern_key === detection.key);
          const prevEvidence = (existingPattern?.evidence as Record<string, unknown>) || {};
          const consentStatus = prevEvidence.consent_status as string | undefined;
          const lastInterventionAt = prevEvidence.last_intervention_at as string | undefined;

          const mergedEvidence = {
            ...detection.evidence,
            last_intervention_at: lastInterventionAt || null,
            consent_status: consentStatus || (detection.type !== "productivity" ? "pending" : undefined),
          };

          const { updated } = await upsertPattern(supabase, tenantId, userId, {
            ...detection,
            evidence: mergedEvidence,
          });

          if (!updated) continue;

          // Intervention cooldown
          if (isWithinCooldown(lastInterventionAt)) continue;

          if (!detection.detected) continue;

          const isSensitive = detection.type === "emotional" || detection.type === "relational";
          const existingConsent = consentStatus;

          if (isSensitive && existingConsent === "declined") {
            continue;
          }

          let message = "";
          if (detection.key === "prod_create_more_than_finish") {
            message = `Você abriu mais tarefas do que fechou em ${prodDays} dias na última quinzena. Hoje fecha o quê antes de abrir outra?`;
          } else {
            message = "Percebi um padrão nos últimos dias. Quer explorar isso comigo agora ou prefere só registrar?";
          }

          // Push reminder
          const reminderPayload = buildPushReminder(message);
          await supabase.from("ff_reminders").insert({
            tenant_id: tenantId,
            created_by: userId,
            title: reminderPayload.title,
            channel: reminderPayload.channel,
            remind_at: reminderPayload.remind_at,
          });

          // Chat message
          await insertChatMessage(supabase, tenantId, userId, message);

          // Update evidence with intervention timestamp and consent status
          const newEvidence = {
            ...mergedEvidence,
            last_intervention_at: new Date().toISOString(),
            consent_status: isSensitive ? (existingConsent || "pending") : undefined,
          };

          await supabase
            .from("ff_behavior_patterns")
            .update({ evidence: newEvidence })
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .eq("pattern_key", detection.key);
        }

        processed += 1;
      } catch (err: any) {
        console.error("[WestOS] Error for member", tenantId, userId, err?.message || err);
        errors.push({ tenant_id: tenantId, user_id: userId, error: String(err?.message || err) });
      }
    }

    return new Response(
      JSON.stringify({ processed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[WestOS] Supervisor error", error);
    return new Response(
      JSON.stringify({ error: "Failed to run WestOS supervisor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
