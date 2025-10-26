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
    .filter(t => t.tipo === 'receita' && t.status === 'paga')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const despesas = transactions
    .filter(t => t.tipo === 'despesa' && t.status === 'paga')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const saldo = receitas - despesas;
  const hasReceitas = receitas > 0;
  const hasDespesas = despesas > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "min-h-[100px] p-2 border rounded-lg text-left transition-all hover:shadow-md hover:border-primary/50",
        "flex flex-col gap-1",
        !isCurrentMonth && "opacity-40 hover:opacity-60",
        isToday && "ring-2 ring-primary",
        isSelected && "bg-primary/5",
        !hasTransactions && "hover:bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-sm font-medium",
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
        <div className="flex-1 flex flex-col justify-end gap-1">
          <Badge 
            variant={saldo >= 0 ? "default" : "destructive"}
            className={cn(
              "text-[10px] px-1 py-0 h-5 w-full justify-center font-mono",
              saldo >= 0 ? "bg-success/10 text-success border-success/20 hover:bg-success/20" : ""
            )}
          >
            {formatCurrency(Math.abs(saldo))}
          </Badge>
          
          <span className="text-[10px] text-muted-foreground text-center">
            {transactions.length} {transactions.length === 1 ? 'lançamento' : 'lançamentos'}
          </span>
        </div>
      )}
    </button>
  );
};
