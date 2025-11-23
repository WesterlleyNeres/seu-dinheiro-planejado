import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recurringTransactionSchema } from '@/lib/validations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useCategories } from '@/hooks/useCategories';
import { useWallets } from '@/hooks/useWallets';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { RecurringTransaction } from '@/hooks/useRecurringTransactions';
import { CurrencyInput } from '@/components/forms/CurrencyInput';

interface RecurringTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: RecurringTransaction;
  onSubmit: (data: any) => Promise<void>;
}

const FREQUENCIA_OPTIONS = [
  { value: 'semanal', label: 'Semanal (toda semana)' },
  { value: 'quinzenal', label: 'Quinzenal (a cada 15 dias)' },
  { value: 'mensal', label: 'Mensal (todo mês)' },
  { value: 'bimestral', label: 'Bimestral (a cada 2 meses)' },
  { value: 'trimestral', label: 'Trimestral (a cada 3 meses)' },
  { value: 'semestral', label: 'Semestral (a cada 6 meses)' },
  { value: 'anual', label: 'Anual (todo ano)' },
];

export function RecurringTransactionForm({
  open,
  onOpenChange,
  transaction,
  onSubmit,
}: RecurringTransactionFormProps) {
  const { categories } = useCategories();
  const { wallets } = useWallets();
  const { paymentMethods } = usePaymentMethods();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: transaction || {
      tipo: 'despesa',
      ativo: true,
      frequencia: 'mensal',
      dia_referencia: 1,
    },
  });

  const tipo = watch('tipo');
  const hasDataFim = watch('data_fim');

  const filteredCategories = categories.filter((c) => c.tipo === tipo);

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data);
    reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Editar Recorrência' : 'Nova Recorrência'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(value) => setValue('tipo', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo && (
                <p className="text-sm text-destructive">{errors.tipo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input {...register('descricao')} placeholder="Ex: Salário, Aluguel..." />
              {errors.descricao && (
                <p className="text-sm text-destructive">{errors.descricao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <CurrencyInput
                value={watch('valor')}
                onChange={(value) => setValue('valor', value)}
              />
              {errors.valor && (
                <p className="text-sm text-destructive">{errors.valor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={watch('category_id')}
                onValueChange={(value) => setValue('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Carteira (Opcional)</Label>
              <Select
                value={watch('wallet_id') || 'none'}
                onValueChange={(value) => setValue('wallet_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento (Opcional)</Label>
              <Select
                value={watch('payment_method_id') || 'none'}
                onValueChange={(value) =>
                  setValue('payment_method_id', value === 'none' ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Natureza (Opcional)</Label>
              <Select
                value={watch('natureza') || 'none'}
                onValueChange={(value) =>
                  setValue('natureza', value === 'none' ? null : (value as any))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="fixa">Fixa</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={watch('frequencia')}
                onValueChange={(value) => setValue('frequencia', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.frequencia && (
                <p className="text-sm text-destructive">{errors.frequencia.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Dia de Referência (1-31)</Label>
              <Input
                type="number"
                min="1"
                max="31"
                {...register('dia_referencia', { valueAsNumber: true })}
              />
              {errors.dia_referencia && (
                <p className="text-sm text-destructive">{errors.dia_referencia.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input type="date" {...register('data_inicio')} />
              {errors.data_inicio && (
                <p className="text-sm text-destructive">{errors.data_inicio.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={!hasDataFim}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValue('data_fim', null);
                    }
                  }}
                />
                <Label>Sem data de término (indefinido)</Label>
              </div>
              {hasDataFim !== null && hasDataFim !== undefined && (
                <>
                  <Label>Data de Término</Label>
                  <Input type="date" {...register('data_fim')} />
                  {errors.data_fim && (
                    <p className="text-sm text-destructive">{errors.data_fim.message}</p>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={watch('ativo')}
                onCheckedChange={(checked) => setValue('ativo', checked)}
              />
              <Label>Ativo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
