import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  variation: number;
  percentage: number;
}

export const ComparisonCard = ({
  title,
  currentValue,
  previousValue,
  variation,
  percentage,
}: ComparisonCardProps) => {
  const isPositive = variation > 0;
  const isNeutral = variation === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold">{formatCurrency(currentValue)}</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            vs {formatCurrency(previousValue)}
          </span>
          <div
            className={cn(
              'flex items-center gap-1 font-medium',
              isNeutral
                ? 'text-muted-foreground'
                : isPositive
                ? 'text-success'
                : 'text-destructive'
            )}
          >
            {isNeutral ? (
              <Minus className="h-4 w-4" />
            ) : isPositive ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
            <span>
              {Math.abs(percentage).toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
