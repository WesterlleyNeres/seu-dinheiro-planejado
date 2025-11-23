import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/currency';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BalanceLineChartProps {
  data: Array<{
    mes_referencia: string;
    receitas: number;
    despesas: number;
    saldo: number;
  }>;
  showProjection?: boolean;
}

export const BalanceLineChart = ({ data, showProjection = false }: BalanceLineChartProps) => {
  const chartData = data.map((item) => ({
    month: format(parseISO(item.mes_referencia + '-01'), 'MMM/yy', { locale: ptBR }),
    Saldo: item.saldo,
  }));

  return (
    <ChartContainer
      config={{
        Saldo: { label: 'Saldo', color: 'hsl(var(--primary))' },
      }}
      className="h-[400px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month"
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            tickFormatter={(value) => formatCurrency(value)}
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="Saldo"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4, fill: 'hsl(var(--primary))' }}
            strokeDasharray={showProjection ? '5 5' : '0'}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
