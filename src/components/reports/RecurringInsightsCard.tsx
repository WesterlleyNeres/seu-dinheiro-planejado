import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { Repeat, TrendingUp, Calendar } from 'lucide-react';

interface RecurringInsightsCardProps {
  data: {
    total_recurring: number;
    active_recurring: number;
    monthly_impact: number;
    next_occurrences: Array<{
      descricao: string;
      valor: number;
      proxima_ocorrencia: string;
    }>;
  };
}

export const RecurringInsightsCard = ({ data }: RecurringInsightsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Insights de Recorrências
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total de Recorrências</p>
            <p className="text-2xl font-bold">{data.total_recurring}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ativas</p>
            <p className="text-2xl font-bold text-success">{data.active_recurring}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Impacto Mensal Estimado</p>
          </div>
          <p className="text-xl font-bold">{formatCurrency(data.monthly_impact)}</p>
        </div>

        {data.next_occurrences.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Próximas Ocorrências</p>
            </div>
            <div className="space-y-2">
              {data.next_occurrences.map((occ, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{occ.descricao}</span>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(occ.valor)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(occ.proxima_ocorrencia)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
