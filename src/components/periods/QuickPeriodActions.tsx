import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { usePeriods } from '@/hooks/usePeriods';
import { Unlock, Lock } from 'lucide-react';

interface QuickPeriodActionsProps {
  year: number;
  month: number;
  status: 'open' | 'closed';
  onSuccess?: () => void;
}

export const QuickPeriodActions = ({ year, month, status, onSuccess }: QuickPeriodActionsProps) => {
  const [open, setOpen] = useState(false);
  const { reopenPeriod, closePeriod, loading } = usePeriods();

  const monthName = new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long' });

  const handleAction = async () => {
    const success = status === 'closed' 
      ? await reopenPeriod(year, month)
      : await closePeriod(year, month);

    if (success) {
      setOpen(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={status === 'closed' ? 'outline' : 'destructive'}
        >
          {status === 'closed' ? (
            <>
              <Unlock className="mr-2 h-4 w-4" />
              Reabrir Período
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Fechar Período
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {status === 'closed' ? 'Reabrir' : 'Fechar'} {monthName}/{year}?
          </DialogTitle>
          <DialogDescription>
            {status === 'closed' ? (
              <>
                Ao reabrir este período, você poderá novamente criar e editar
                transações em <strong>{monthName}/{year}</strong>.
              </>
            ) : (
              <>
                Ao fechar este período, nenhuma transação poderá ser criada ou
                editada em <strong>{monthName}/{year}</strong> até que seja reaberto.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAction}
            disabled={loading}
            variant={status === 'closed' ? 'default' : 'destructive'}
          >
            {loading ? 'Processando...' : status === 'closed' ? 'Reabrir' : 'Fechar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
