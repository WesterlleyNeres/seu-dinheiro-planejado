import { Transaction } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CalendarDayProps {
  date: Date;
  transactions: Transaction[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export const CalendarDay = ({
  date,
  transactions,
  isCurrentMonth,
  isToday,
  isSelected,
  onClick,
}: CalendarDayProps) => {
  const hasTransactions = transactions.length > 0;
  
  const receitas = transactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const despesas = transactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const totalReceitas = receitas;
  const totalDespesas = despesas;
  const saldo = receitas - despesas;
  const hasReceitas = receitas > 0;
  const hasDespesas = despesas > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "min-h-[64px] p-1 border rounded-lg text-left transition-all hover:shadow-md hover:border-primary/50 sm:min-h-[100px] sm:p-2",
        "flex flex-col gap-1",
        !isCurrentMonth && "opacity-40 hover:opacity-60",
        isToday && "ring-2 ring-primary",
        isSelected && "bg-primary/5",
        !hasTransactions && "hover:bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs font-medium sm:text-sm",
          isToday && "text-primary font-bold"
        )}>
          {date.getDate()}
        </span>
        
        {hasTransactions && (
          <div className="flex gap-1">
            {hasReceitas && (
              <div className="h-2 w-2 rounded-full bg-success" title="Receita" />
            )}
            {hasDespesas && (
              <div className="h-2 w-2 rounded-full bg-destructive" title="Despesa" />
            )}
          </div>
        )}
      </div>

      {hasTransactions && (
        <div className="hidden flex-1 flex-col justify-end gap-1 sm:flex">
          {hasReceitas && (
            <Badge 
              variant="outline" 
              className="bg-success/10 text-success border-success text-[10px] px-1 py-0 h-4 w-full justify-center"
            >
              +{formatCurrency(totalReceitas)}
            </Badge>
          )}
          {hasDespesas && (
            <Badge 
              variant="outline" 
              className="bg-destructive/10 text-destructive border-destructive text-[10px] px-1 py-0 h-4 w-full justify-center"
            >
              -{formatCurrency(totalDespesas)}
            </Badge>
          )}
        </div>
      )}
    </button>
  );
};
