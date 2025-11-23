import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { payStatementSchema } from '@/lib/validations';
import { z } from 'zod';
import { CardStatement } from '@/hooks/useStatements';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWallets } from '@/hooks/useWallets';
import { formatCurrency } from '@/lib/currency';

type PayStatementFormData = z.infer<typeof payStatementSchema>;

interface PayStatementDialogProps {
  statement: CardStatement | null;
  walletName: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PayStatementFormData) => void;
  loading?: boolean;
}

export const PayStatementDialog = ({
  statement,
  walletName,
  open,
  onClose,
  onSubmit,
  loading,
}: PayStatementDialogProps) => {
  const { wallets } = useWallets();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PayStatementFormData>({
    resolver: zodResolver(payStatementSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  const paymentWalletId = watch('payment_wallet_id');

  // Filtrar apenas contas (não cartões)
  const paymentWallets = wallets.filter(w => w.tipo === 'conta' && w.ativo);

  if (!statement) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar Fatura</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cartão</span>
              <span className="font-medium">{walletName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total a Pagar</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(statement.total)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_wallet_id">Conta para Pagamento</Label>
            <Select
              value={paymentWalletId}
              onValueChange={(value) => setValue('payment_wallet_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {paymentWallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment_wallet_id && (
              <p className="text-sm text-destructive">{errors.payment_wallet_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Data do Pagamento</Label>
            <Input
              id="payment_date"
              type="date"
              {...register('payment_date')}
            />
            {errors.payment_date && (
              <p className="text-sm text-destructive">{errors.payment_date.message}</p>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Uma despesa no valor da fatura será criada na conta selecionada e todas as
              transações do cartão serão marcadas como pagas.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
