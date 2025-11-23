import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { Investment } from '@/hooks/useInvestments';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InvestmentCardProps {
  investment: Investment;
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
  onAddContribution: (investment: Investment) => void;
}

const investmentTypeLabels: Record<string, string> = {
  rf: 'Renda Fixa',
  rv: 'Renda Variável',
  fundo: 'Fundos',
  outros: 'Outros',
};

const investmentTypeColors: Record<string, string> = {
  rf: 'bg-success/10 text-success',
  rv: 'bg-primary/10 text-primary',
  fundo: 'bg-warning/10 text-warning',
  outros: 'bg-muted text-muted-foreground',
};

const statusColors: Record<string, string> = {
  ativo: 'bg-success/10 text-success',
  resgatado: 'bg-warning/10 text-warning',
  liquidado: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  ativo: 'Ativo',
  resgatado: 'Resgatado',
  liquidado: 'Liquidado',
};

export const InvestmentCard = ({
  investment,
  onEdit,
  onDelete,
  onAddContribution,
}: InvestmentCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-xl">{investment.nome}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge className={investmentTypeColors[investment.tipo]}>
                {investmentTypeLabels[investment.tipo]}
              </Badge>
              <Badge className={statusColors[investment.status]}>
                {statusLabels[investment.status]}
              </Badge>
            </div>
            {investment.corretora && (
              <p className="text-sm text-muted-foreground">
                Corretora: {investment.corretora}
              </p>
            )}
            {investment.wallet && (
              <p className="text-sm text-muted-foreground">
                Carteira: {investment.wallet.nome}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddContribution(investment)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(investment)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(investment.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">Valor Total</div>
          <div className="text-2xl font-bold">
            {formatCurrency(investment.total || 0)}
          </div>
        </div>

        {investment.observacoes && (
          <div>
            <div className="text-sm text-muted-foreground">Observações</div>
            <p className="text-sm">{investment.observacoes}</p>
          </div>
        )}

        {investment.contributions && investment.contributions.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Últimos Aportes</div>
            <div className="space-y-2">
              {investment.contributions.slice(0, 3).map((contrib) => (
                <div
                  key={contrib.id}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-muted-foreground">
                    {format(new Date(contrib.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(Number(contrib.valor))}
                  </span>
                </div>
              ))}
              {investment.contributions.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{investment.contributions.length - 3} aportes
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
