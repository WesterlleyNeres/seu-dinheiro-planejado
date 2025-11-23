import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transferSchema } from '@/lib/validations';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWallets } from '@/hooks/useWallets';
import { formatCurrency } from '@/lib/currency';
import { WalletBalance } from '@/hooks/useTransfers';

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferFormProps {
  onSubmit: (data: TransferFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  walletBalances: WalletBalance[];
}

export const TransferForm = ({ onSubmit, onCancel, loading, walletBalances }: TransferFormProps) => {
  const { wallets } = useWallets();
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      data: new Date().toISOString().split('T')[0],
    },
  });

  const fromWalletId = watch('from_wallet_id');
  const toWalletId = watch('to_wallet_id');

  const fromBalance = walletBalances.find(wb => wb.wallet_id === fromWalletId);
  const toBalance = walletBalances.find(wb => wb.wallet_id === toWalletId);

  const activeWallets = wallets.filter(w => w.ativo);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="from_wallet_id">Carteira de Origem</Label>
        <Select
          value={fromWalletId}
          onValueChange={(value) => setValue('from_wallet_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a carteira de origem" />
          </SelectTrigger>
          <SelectContent>
            {activeWallets.map((wallet) => (
              <SelectItem key={wallet.id} value={wallet.id}>
                {wallet.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fromBalance && (
          <p className="text-sm text-muted-foreground">
            Saldo disponível: {formatCurrency(fromBalance.saldo)}
          </p>
        )}
        {errors.from_wallet_id && (
          <p className="text-sm text-destructive">{errors.from_wallet_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="to_wallet_id">Carteira de Destino</Label>
        <Select
          value={toWalletId}
          onValueChange={(value) => setValue('to_wallet_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a carteira de destino" />
          </SelectTrigger>
          <SelectContent>
            {activeWallets
              .filter(w => w.id !== fromWalletId)
              .map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.nome}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {toBalance && (
          <p className="text-sm text-muted-foreground">
            Saldo atual: {formatCurrency(toBalance.saldo)}
          </p>
        )}
        {errors.to_wallet_id && (
          <p className="text-sm text-destructive">{errors.to_wallet_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="valor">Valor</Label>
        <Input
          id="valor"
          type="number"
          step="0.01"
          placeholder="0,00"
          {...register('valor', { valueAsNumber: true })}
        />
        {errors.valor && (
          <p className="text-sm text-destructive">{errors.valor.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="data">Data</Label>
        <Input
          id="data"
          type="date"
          {...register('data')}
        />
        {errors.data && (
          <p className="text-sm text-destructive">{errors.data.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea
          id="descricao"
          placeholder="Adicione uma descrição..."
          {...register('descricao')}
        />
        {errors.descricao && (
          <p className="text-sm text-destructive">{errors.descricao.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Transferência'}
        </Button>
      </div>
    </form>
  );
};
