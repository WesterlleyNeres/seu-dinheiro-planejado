import { useState } from 'react';
import { Goal } from '@/hooks/useGoals';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/currency';
import { getGoalProgressColor, getGoalStatusBadge, formatDaysRemaining, calculateGoalStatus, calculateDailyContribution, calculatePace, getPaceIndicator } from '@/lib/goals';
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp, X, Target } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onAddContribution: (goalId: string) => void;
  onDeleteContribution: (contributionId: string) => void;
}

export const GoalCard = ({ 
  goal, 
  onEdit, 
  onDelete, 
  onAddContribution,
  onDeleteContribution 
}: GoalCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contribToDelete, setContribToDelete] = useState<string | null>(null);

  const percentual = goal.percentual || 0;
  const progressColor = getGoalProgressColor(percentual);
  const status = calculateGoalStatus(goal.valor_meta, goal.economizado || 0, goal.prazo);
  const statusBadge = getGoalStatusBadge(status);
  const contribuicaoSugerida = calculateDailyContribution(goal.restante || 0, goal.diasRestantes || null);
  const pace = calculatePace(goal.valor_meta, goal.economizado || 0, goal.prazo, goal.created_at);
  const paceIndicator = getPaceIndicator(pace);

  const handleDeleteContribution = (contribId: string) => {
    setContribToDelete(contribId);
  };

  const confirmDeleteContribution = () => {
    if (contribToDelete) {
      onDeleteContribution(contribToDelete);
      setContribToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">
                  {goal.nome}
                </h3>
                {statusBadge && (
                  <Badge variant={statusBadge.variant} className="shrink-0">
                    {statusBadge.text}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Meta: {formatCurrency(Number(goal.valor_meta))}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onAddContribution(goal.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(goal)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Economizado:</span>
            <span className="font-medium">
              {formatCurrency(goal.economizado || 0)} ({percentual}%)
            </span>
          </div>

          <div className="space-y-1.5">
            <Progress value={Math.min(percentual, 100)} className="h-2">
              <div
                className={`h-full transition-all ${progressColor}`}
                style={{ width: `${Math.min(percentual, 100)}%` }}
              />
            </Progress>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {status.concluida ? 'Excedente:' : 'Faltam:'}
            </span>
            <span className={`font-medium ${status.concluida ? 'text-success' : ''}`}>
              {formatCurrency(Math.abs(goal.restante || 0))}
            </span>
          </div>

          {goal.prazo && (
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Prazo:</span>
              <span className="text-sm">
                {format(new Date(goal.prazo), "dd/MM/yyyy", { locale: ptBR })}
                {' '}({formatDaysRemaining(goal.diasRestantes || null)})
              </span>
            </div>
          )}

          {contribuicaoSugerida.diaria !== null && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <Target className="h-4 w-4" />
                <span>Contribuição Sugerida</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">Por dia</span>
                  <span className="font-semibold">{formatCurrency(contribuicaoSugerida.diaria)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">Por mês</span>
                  <span className="font-semibold">{formatCurrency(contribuicaoSugerida.mensal!)}</span>
                </div>
              </div>
            </div>
          )}

          {pace && paceIndicator && (
            <div className={`p-3 rounded-lg ${paceIndicator.bgColor} border space-y-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{paceIndicator.icon}</span>
                  <span className={`font-medium ${paceIndicator.color}`}>
                    {paceIndicator.label}
                  </span>
                </div>
                <span className={`text-sm font-bold ${paceIndicator.color}`}>
                  {pace.differencePercent > 0 ? '+' : ''}{pace.differencePercent}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Esperado: {pace.expectedPercent}% | Real: {pace.actualPercent}%
              </div>
            </div>
          )}

          {goal.ultimaContribuicao && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Última contrib.:</span>
              <span className="text-sm">
                {formatCurrency(Number(goal.ultimaContribuicao.valor))} em{' '}
                {format(new Date(goal.ultimaContribuicao.data), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          )}

          {goal.contribuicoes && goal.contribuicoes.length > 0 && (
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => setExpanded(!expanded)}
              >
                <span className="text-sm font-medium">
                  📈 Histórico ({goal.contribuicoes.length} contribuições)
                </span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {expanded && (
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {goal.contribuicoes.map((contrib) => (
                    <div
                      key={contrib.id}
                      className="flex items-center justify-between text-sm py-2 px-3 rounded bg-muted/30 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {format(new Date(contrib.data), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(Number(contrib.valor))}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleDeleteContribution(contrib.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Goal Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Meta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a meta "{goal.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(goal.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Contribution Dialog */}
      <AlertDialog open={!!contribToDelete} onOpenChange={() => setContribToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contribuição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta contribuição? Esta ação não pode ser desfeita e o progresso da meta será recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteContribution} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
