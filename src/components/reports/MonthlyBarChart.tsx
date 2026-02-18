import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/currency';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyBarChartProps {
  data: Array<{
    mes_referencia: string;
    receitas: number;
    despesas: number;
    saldo: number;
  }>;
}

export const MonthlyBarChart = ({ data }: MonthlyBarChartProps) => {
  const chartData = data.map((item) => ({
    month: format(parseISO(item.mes_referencia + '-01'), 'MMM/yy', { locale: ptBR }),
    Receitas: item.receitas,
    Despesas: item.despesas,
  }));

  return (
    <ChartContainer
      config={{
        Receitas: { label: 'Receitas', color: 'hsl(var(--success))' },
        Despesas: { label: 'Despesas', color: 'hsl(var(--destructive))' },
      }}
      className="h-[260px] sm:h-[400px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
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
          <Bar dataKey="Receitas" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
