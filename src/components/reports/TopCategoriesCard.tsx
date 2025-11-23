import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';

interface TopCategoriesCardProps {
  data: Array<{
    category_name: string;
    total: number;
    percentage: number;
    transactions_count: number;
  }>;
  tipo: 'receita' | 'despesa';
}

export const TopCategoriesCard = ({ data, tipo }: TopCategoriesCardProps) => {
  const top5 = data.slice(0, 5);

  if (top5.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Top 5 Categorias - {tipo === 'receita' ? 'Receitas' : 'Despesas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Top 5 Categorias - {tipo === 'receita' ? 'Receitas' : 'Despesas'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {top5.map((item, index) => (
            <div key={item.category_name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center">
                  {index + 1}
                </Badge>
                <div>
                  <p className="font-medium">{item.category_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.transactions_count} transações
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(item.total)}</p>
                <p className="text-sm text-muted-foreground">{item.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
