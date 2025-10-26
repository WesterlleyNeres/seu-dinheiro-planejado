import { useState } from 'react';
import { useGoals, Goal } from '@/hooks/useGoals';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalForm } from '@/components/goals/GoalForm';
import { ContributionForm } from '@/components/goals/ContributionForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { Plus, Target, TrendingUp, Wallet } from 'lucide-react';

const Goals = () => {
  const {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    deleteContribution,
    totals,
  } = useGoals();

  const [formOpen, setFormOpen] = useState(false);
  const [contributionFormOpen, setContributionFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();
  const [selectedGoalForContribution, setSelectedGoalForContribution] = useState<Goal | null>(null);

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormOpen(true);
  };

  const handleNewGoal = () => {
    setEditingGoal(undefined);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (editingGoal) {
      await updateGoal(editingGoal.id, data);
    } else {
      await createGoal(data);
    }
  };

  const handleAddContribution = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setSelectedGoalForContribution(goal);
      setContributionFormOpen(true);
    }
  };

  const handleContributionSubmit = async (data: any) => {
    if (selectedGoalForContribution) {
      await addContribution(selectedGoalForContribution.id, data);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground">
            Defina e acompanhe suas metas financeiras
          </p>
        </div>
        <Button onClick={handleNewGoal}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {goals.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma meta ainda</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Comece definindo sua primeira meta financeira e acompanhe seu progresso!
            </p>
            <Button onClick={handleNewGoal}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Metas Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{totals.metasAtivas}</div>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Alvo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold currency">
                    {formatCurrency(totals.totalAlvo)}
                  </div>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-success/20 bg-success/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Economizado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold currency text-success">
                    {formatCurrency(totals.totalEconomizado)}
                  </div>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Restante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold currency">
                    {formatCurrency(totals.totalRestante)}
                  </div>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">🎯 Metas Ativas</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={handleEditGoal}
                  onDelete={deleteGoal}
                  onAddContribution={handleAddContribution}
                  onDeleteContribution={deleteContribution}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Forms */}
      <GoalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={editingGoal}
        onSubmit={handleFormSubmit}
      />

      <ContributionForm
        open={contributionFormOpen}
        onOpenChange={setContributionFormOpen}
        goalName={selectedGoalForContribution?.nome || ''}
        onSubmit={handleContributionSubmit}
      />
    </div>
  );
};

export default Goals;
