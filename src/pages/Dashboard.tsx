import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { getCurrentMonth } from "@/lib/date";
import { PageShell } from "@/components/layout/PageShell";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Target,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface DashboardData {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  metasProgresso: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    totalReceitas: 0,
    totalDespesas: 0,
    saldo: 0,
    metasProgresso: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const { year, month } = getCurrentMonth();
      const mesRef = `${year}-${String(month).padStart(2, '0')}`;

      // Get transactions for current month
      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select("tipo, valor, status")
        .eq("user_id", user?.id)
        .eq("mes_referencia", mesRef);

      if (transError) throw transError;

      // Calculate totals
      let receitas = 0;
      let despesas = 0;

      transactions?.forEach((t) => {
        if (t.status === "paga") {
          if (t.tipo === "receita") {
            receitas += Number(t.valor);
          } else {
            despesas += Number(t.valor);
          }
        }
      });

      // Get goals progress
      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select(`
          id,
          valor_meta,
          goals_contribs(valor)
        `)
        .eq("user_id", user?.id);

      if (goalsError) throw goalsError;

      let totalProgress = 0;
      if (goals && goals.length > 0) {
        goals.forEach((goal) => {
          const contributed = goal.goals_contribs?.reduce(
            (sum: number, c: any) => sum + Number(c.valor),
            0
          ) || 0;
          const progress = (contributed / Number(goal.valor_meta)) * 100;
          totalProgress += progress;
        });
        totalProgress = totalProgress / goals.length;
      }

      setData({
        totalReceitas: receitas,
        totalDespesas: despesas,
        saldo: receitas - despesas,
        metasProgresso: totalProgress,
      });
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageShell className="space-y-8" data-tour="dashboard-content">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das suas finanças</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Receitas do Mês"
          value={formatCurrency(data.totalReceitas)}
          icon={<ArrowUpCircle className="h-6 w-6" />}
          variant="success"
        />
        <StatCard
          title="Despesas do Mês"
          value={formatCurrency(data.totalDespesas)}
          icon={<ArrowDownCircle className="h-6 w-6" />}
          variant="danger"
        />
        <StatCard
          title="Saldo do Mês"
          value={formatCurrency(data.saldo)}
          icon={<Wallet className="h-6 w-6" />}
          variant={data.saldo >= 0 ? "success" : "danger"}
        />
        <StatCard
          title="Progresso das Metas"
          value={`${Math.round(data.metasProgresso)}%`}
          icon={<Target className="h-6 w-6" />}
          variant="default"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Button asChild className="h-auto flex-col gap-2 py-6">
            <Link to="/transactions">
              <Plus className="h-6 w-6" />
              <span>Novo Lançamento</span>
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-auto flex-col gap-2 py-6">
            <Link to="/goals">
              <Plus className="h-6 w-6" />
              <span>Nova Meta</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-6">
            <Link to="/reports">
              <Plus className="h-6 w-6" />
              <span>Ver Relatórios</span>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle>Primeiros Passos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Crie categorias para organizar suas transações</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Adicione suas receitas e despesas do mês</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Defina orçamentos para controlar seus gastos</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Crie metas financeiras e acompanhe seu progresso</span>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default Dashboard;
