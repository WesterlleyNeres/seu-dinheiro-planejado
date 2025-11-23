import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface CategoryPieChartProps {
  data: Array<{
    category_name: string;
    total: number;
    percentage: number;
  }>;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const CategoryPieChart = ({ data }: CategoryPieChartProps) => {
  const chartData = data.map((item, index) => ({
    name: item.category_name,
    value: item.percentage,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <ChartContainer
      config={{}}
      className="h-[350px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
            outerRadius={100}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
