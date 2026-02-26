import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const formatDate = (value?: string) => {
  if (!value) return "-";
  return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
};

const tierConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  expand: { label: "Expandir", variant: "default" },
  maintain: { label: "Manter", variant: "secondary" },
  reduce: { label: "Reduzir", variant: "outline" },
  reset: { label: "Resetar", variant: "destructive" },
};

const patternLabels: Record<string, string> = {
  prod_create_more_than_finish: "Cria mais do que conclui",
  emo_irritation_proxy: "Irritação/Dispersão",
  rel_no_connection_streak: "Sem conexão humana",
};

const severityConfig: Record<number, { label: string; className: string }> = {
  1: { label: "Baixa", className: "bg-emerald-100 text-emerald-800" },
  2: { label: "Média", className: "bg-amber-100 text-amber-800" },
  3: { label: "Alta", className: "bg-rose-100 text-rose-800" },
};

const vectorLabel = (value?: string | null) => {
  if (!value) return "-";
  const map: Record<string, string> = {
    produtividade: "Produtividade",
    emotional: "Emocional",
    emocional: "Emocional",
    relacional: "Relacional",
    rel: "Relacional",
    fisico: "Físico",
    físico: "Físico",
  };
  return map[value] || value;
};

const consentLabel = (value?: string) => {
  if (value === "granted") return "Consentiu";
  if (value === "declined") return "Recusou";
  if (value === "pending") return "Pendente";
  return "-";
};

const JarvisWestos = () => {
  const { user } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();
  const tenantId = tenant?.id ?? null;
  const userId = user?.id ?? null;
  const today = new Date().toISOString().split("T")[0];

  const checkinsQuery = useQuery({
    queryKey: ["westos", "checkins", tenantId, userId],
    enabled: Boolean(tenantId && userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ff_daily_checkins")
        .select("id, checkin_date, dominant_vector, nuclear_block_done, human_connection_done, focus_drift, mood, note")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .order("checkin_date", { ascending: false })
        .limit(14);

      if (error) throw error;
      return data || [];
    },
  });

  const cycleQuery = useQuery({
    queryKey: ["westos", "cycle", tenantId, userId, today],
    enabled: Boolean(tenantId && userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ff_cycles")
        .select("id, start_date, end_date, primary_metric, score_total, tier, notes")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
  });

  const patternsQuery = useQuery({
    queryKey: ["westos", "patterns", tenantId, userId],
    enabled: Boolean(tenantId && userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ff_behavior_patterns")
        .select("id, pattern_key, pattern_type, severity, last_seen_at, evidence")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("last_seen_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = tenantLoading || checkinsQuery.isLoading || cycleQuery.isLoading || patternsQuery.isLoading;
  const checkins = checkinsQuery.data || [];
  const patterns = patternsQuery.data || [];
  const cycle = cycleQuery.data;

  const lastCheckin = checkins[0];
  const lastCheckinDays = useMemo(() => {
    if (!lastCheckin?.checkin_date) return null;
    try {
      return differenceInCalendarDays(new Date(), parseISO(lastCheckin.checkin_date));
    } catch {
      return null;
    }
  }, [lastCheckin]);

  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">WestOS</h1>
            <p className="text-sm text-muted-foreground">Ciclos, check-ins e padrões ativos</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[280px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Ciclo atual
                </CardTitle>
                <CardDescription>Janela de 14 dias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {cycle ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Período</span>
                      <span className="text-sm font-medium">
                        {formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Score</span>
                      <span className="text-xl font-semibold">{cycle.score_total ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tier</span>
                      <Badge variant={tierConfig[cycle.tier || "maintain"]?.variant || "secondary"}>
                        {tierConfig[cycle.tier || "maintain"]?.label || "Manter"}
                      </Badge>
                    </div>
                    {cycle.notes && (
                      <p className="text-xs text-muted-foreground">{cycle.notes}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum ciclo ativo no momento.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Check-in mais recente
                </CardTitle>
                <CardDescription>Hoje ou último registrado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {lastCheckin ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Data</span>
                      <span className="text-sm font-medium">{formatDate(lastCheckin.checkin_date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Foco dominante</span>
                      <Badge variant="outline">{vectorLabel(lastCheckin.dominant_vector)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between rounded-md border border-border px-2 py-1">
                        <span className="text-muted-foreground">Humor</span>
                        <span className="font-semibold">{lastCheckin.mood ?? "-"}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-border px-2 py-1">
                        <span className="text-muted-foreground">Foco</span>
                        <span className="font-semibold">{lastCheckin.focus_drift ?? "-"}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Bloco nuclear</span>
                      <span className={cn("font-medium", lastCheckin.nuclear_block_done ? "text-emerald-600" : "text-muted-foreground")}
                      >
                        {lastCheckin.nuclear_block_done ? "Feito" : "Não"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Conexão humana</span>
                      <span className={cn("font-medium", lastCheckin.human_connection_done ? "text-emerald-600" : "text-muted-foreground")}
                      >
                        {lastCheckin.human_connection_done ? "Sim" : "Não"}
                      </span>
                    </div>
                    {lastCheckinDays !== null && (
                      <p className="text-xs text-muted-foreground">
                        Último check-in há {lastCheckinDays} {lastCheckinDays === 1 ? "dia" : "dias"}.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum check-in registrado ainda.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />
                  Padrões ativos
                </CardTitle>
                <CardDescription>{patterns.length} padrão(s) em monitoramento</CardDescription>
              </CardHeader>
              <CardContent>
                {patterns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum padrão ativo detectado.</p>
                ) : (
                  <div className="space-y-3">
                    {patterns.map((pattern) => {
                      const severity = severityConfig[pattern.severity] || severityConfig[1];
                      const consentStatus = (pattern.evidence as Record<string, unknown>)?.consent_status as string | undefined;

                      return (
                        <div key={pattern.id} className="rounded-lg border border-border px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                {patternLabels[pattern.pattern_key] || pattern.pattern_key}
                              </p>
                              <p className="text-xs text-muted-foreground">Último sinal: {formatDate(pattern.last_seen_at)}</p>
                            </div>
                            <Badge className={severity.className} variant="outline">
                              {severity.label}
                            </Badge>
                          </div>
                          {pattern.pattern_type !== "productivity" && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Consentimento: <span className="font-medium">{consentLabel(consentStatus)}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Check-ins (últimos 14 dias)
              </CardTitle>
              <CardDescription>Acompanhe o histórico recente</CardDescription>
            </CardHeader>
            <CardContent>
              {checkins.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum check-in registrado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {checkins.map((checkin) => (
                    <div
                      key={checkin.id}
                      className="flex flex-col gap-2 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold">{formatDate(checkin.checkin_date)}</p>
                        <p className="text-xs text-muted-foreground">Foco: {vectorLabel(checkin.dominant_vector)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">Humor {checkin.mood ?? "-"}</Badge>
                        <Badge variant="outline">Foco {checkin.focus_drift ?? "-"}</Badge>
                        <Badge variant="outline">Nuclear: {checkin.nuclear_block_done ? "Sim" : "Não"}</Badge>
                        <Badge variant="outline">Conexão: {checkin.human_connection_done ? "Sim" : "Não"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
};

export default JarvisWestos;
