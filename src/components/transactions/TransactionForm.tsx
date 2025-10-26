import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionSchema } from '@/lib/validations';
import { Transaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useWallets } from '@/hooks/useWallets';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, addMonths } from 'date-fns';
import { PaymentMethodSelect } from '@/components/forms/PaymentMethodSelect';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/currency';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
  onSubmit: (data: any) => Promise<void>;
}

export const TransactionForm = ({
  open,
  onOpenChange,
  transaction,
  onSubmit,
}: TransactionFormProps) => {
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(transaction?.tipo || 'despesa');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentType, setInstallmentType] = useState<'fixed' | 'calculated'>('fixed');
  const { categories } = useCategories();
  const { wallets } = useWallets();

  const form = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      tipo: transaction?.tipo || 'despesa',
      descricao: transaction?.descricao || '',
      valor: transaction?.valor || 0,
      data: transaction?.data || format(new Date(), 'yyyy-MM-dd'),
      category_id: transaction?.category_id || '',
      status: transaction?.status || 'pendente',
      forma_pagamento: transaction?.forma_pagamento || '',
      wallet_id: transaction?.wallet_id || null,
      payment_method_id: transaction?.payment_method_id || null,
      natureza: transaction?.natureza || null,
      isInstallment: false,
      installmentType: 'fixed',
      installmentCount: undefined,
      installmentValue: undefined,
      totalValue: undefined,
    },
  });

  useEffect(() => {
    if (transaction) {
      form.reset({
        tipo: transaction.tipo,
        descricao: transaction.descricao,
        valor: transaction.valor,
        data: transaction.data,
        category_id: transaction.category_id,
        status: transaction.status,
        forma_pagamento: transaction.forma_pagamento || '',
        wallet_id: transaction.wallet_id || null,
        payment_method_id: transaction.payment_method_id || null,
        natureza: transaction.natureza || null,
      });
      setTipo(transaction.tipo);
    }
  }, [transaction, form]);

  const handleSubmit = async (data: any) => {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  };

  const filteredCategories = categories.filter((cat) => {
    if (tipo === 'receita') return cat.tipo === 'receita';
    if (tipo === 'despesa') return cat.tipo === 'despesa';
    return false;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do lançamento financeiro
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setTipo(value as 'receita' | 'despesa');
                        form.setValue('category_id', '');
                      }}
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="despesa">Despesa</TabsTrigger>
                        <TabsTrigger value="receita">Receita</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Conta de luz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção de Parcelamento */}
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="installment-mode"
                    checked={isInstallment}
                    onCheckedChange={(checked) => {
                      setIsInstallment(checked);
                      if (!checked) {
                        form.setValue('installmentCount', undefined);
                        form.setValue('installmentValue', undefined);
                        form.setValue('totalValue', undefined);
                      }
                    }}
                    disabled={!!transaction}
                  />
                  <Label htmlFor="installment-mode" className="text-sm font-medium">
                    Lançamento Parcelado
                  </Label>
                </div>
              </div>

              {isInstallment && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  <Tabs 
                    value={installmentType} 
                    onValueChange={(v) => setInstallmentType(v as 'fixed' | 'calculated')}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="fixed">
                        Valor Fixo
                        <Badge variant="outline" className="ml-2 text-xs">
                          Ex: Luz
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="calculated">
                        Valor Total
                        <Badge variant="outline" className="ml-2 text-xs">
                          Ex: TV
                        </Badge>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {installmentType === 'fixed' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="installmentValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor de Cada Parcela</FormLabel>
                              <FormControl>
                                <CurrencyInput
                                  value={field.value || 0}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="installmentCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Parcelas</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={1} 
                                  max={60}
                                  placeholder="12"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {form.watch('installmentValue') && form.watch('installmentCount') && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">Valor Total:</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency((form.watch('installmentValue') || 0) * (form.watch('installmentCount') || 0))}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {installmentType === 'calculated' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="totalValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor Total</FormLabel>
                              <FormControl>
                                <CurrencyInput
                                  value={field.value || 0}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="installmentCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Parcelas</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={1} 
                                  max={60}
                                  placeholder="10"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {form.watch('totalValue') && form.watch('installmentCount') && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">Valor de Cada Parcela:</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency((form.watch('totalValue') || 0) / (form.watch('installmentCount') || 0))}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {form.watch('installmentCount') && form.watch('data') && (
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <p>📅 As parcelas terão vencimento mensal a partir de <strong>{format(new Date(form.watch('data')), 'dd/MM/yyyy')}</strong></p>
                      <p className="mt-1">Última parcela: <strong>{format(
                        addMonths(new Date(form.watch('data')), (form.watch('installmentCount') || 1) - 1),
                        'dd/MM/yyyy'
                      )}</strong></p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="paga">Paga</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wallet_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carteira (Opcional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Nenhuma</SelectItem>
                        {wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_method_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento (Opcional)</FormLabel>
                  <FormControl>
                    <PaymentMethodSelect
                      value={field.value || undefined}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {tipo === 'despesa' && (
              <FormField
                control={form.control}
                name="natureza"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Natureza (Opcional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Não especificado</SelectItem>
                        <SelectItem value="fixa">Fixa</SelectItem>
                        <SelectItem value="variavel">Variável</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {transaction ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
