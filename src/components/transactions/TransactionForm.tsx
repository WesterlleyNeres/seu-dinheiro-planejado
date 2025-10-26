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
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
  onSubmit: (data: any) => Promise<void>;
  defaultDate?: Date;
}

export const TransactionForm = ({
  open,
  onOpenChange,
  transaction,
  onSubmit,
  defaultDate,
}: TransactionFormProps) => {
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(transaction?.tipo || 'despesa');
  const { categories } = useCategories();
  const { wallets } = useWallets();

  const defaultValues = {
    tipo: 'despesa' as 'receita' | 'despesa',
    descricao: '',
    valor: 0,
    data: format(new Date(), 'yyyy-MM-dd'),
    category_id: '',
    status: 'pendente' as 'paga' | 'pendente',
    forma_pagamento: '',
    wallet_id: null as string | null,
    payment_method_id: null as string | null,
    natureza: null as 'fixa' | 'variavel' | null,
    isInstallment: false,
    installmentType: 'fixed' as 'fixed' | 'calculated',
    installmentCount: undefined as number | undefined,
    installmentValue: undefined as number | undefined,
    totalValue: undefined as number | undefined,
  };

  const form = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  // Reset form when opening (new) or editing (existing transaction)
  useEffect(() => {
    if (open) {
      if (transaction) {
        // Editing existing transaction
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
          isInstallment: false,
          installmentType: 'fixed',
          installmentCount: undefined,
          installmentValue: undefined,
          totalValue: undefined,
        });
        setTipo(transaction.tipo);
      } else {
        // Creating new transaction - clean slate with optional defaultDate
        form.reset({
          ...defaultValues,
          data: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        });
        setTipo('despesa');
      }
    }
  }, [open, transaction, defaultDate]);

  const handleSubmit = async (data: any) => {
    try {
      // Normalize empty optional fields
      const sanitizedData = {
        ...data,
        forma_pagamento: data.forma_pagamento || undefined,
        wallet_id: data.wallet_id === 'none' ? null : data.wallet_id || null,
        natureza: data.natureza === 'none' ? null : data.natureza || null,
        installmentCount: data.installmentCount ? Math.floor(Number(data.installmentCount)) : undefined,
      };
      
      await onSubmit(sanitizedData);
      onOpenChange(false);
      form.reset(defaultValues);
      setTipo('despesa');
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
      toast({
        title: 'Erro ao criar lançamento',
        description: error instanceof Error ? error.message : 'Verifique os campos e tente novamente',
        variant: 'destructive',
      });
    }
  };

  const handleValidationError = (errors: any) => {
    console.error('Validation errors:', errors);
    const firstError = Object.values(errors)[0] as any;
    toast({
      title: 'Erro de validação',
      description: firstError?.message || 'Verifique os campos marcados',
      variant: 'destructive',
    });
  };

  const filteredCategories = categories.filter((cat) => {
    if (tipo === 'receita') return cat.tipo === 'receita';
    if (tipo === 'despesa') return cat.tipo === 'despesa';
    return false;
  });

  // Watch form values (replaces useState)
  const isInstallment = form.watch('isInstallment');
  const installmentType = form.watch('installmentType');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <div className="h-[85vh] max-h-[85vh] flex flex-col overflow-hidden min-h-0">
          <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {transaction ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do lançamento financeiro
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit, handleValidationError)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 pr-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
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
              <FormField
                control={form.control}
                name="isInstallment"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            id="installment-mode"
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (!checked) {
                                form.setValue('installmentCount', undefined);
                                form.setValue('installmentValue', undefined);
                                form.setValue('totalValue', undefined);
                              }
                            }}
                            disabled={!!transaction}
                          />
                        </FormControl>
                        <Label htmlFor="installment-mode" className="text-sm font-medium">
                          Lançamento Parcelado
                        </Label>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isInstallment && (form.watch('installmentCount') || form.watch('installmentValue') || form.watch('totalValue')) && (
                <Alert variant="default" className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Ative o "Lançamento Parcelado" acima para criar parcelas
                  </AlertDescription>
                </Alert>
              )}

              {isInstallment && (
                <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                  <FormField
                    control={form.control}
                    name="installmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Tabs 
                            value={field.value} 
                            onValueChange={(v) => {
                              field.onChange(v);
                            }}
                          >
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="fixed">
                                Valor Fixo
                              </TabsTrigger>
                              <TabsTrigger value="calculated">
                                Valor Total
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </FormControl>
                      </FormItem>
                    )}
                  />

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
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const numValue = value ? Number(value) : undefined;
                        field.onChange(numValue);
                        
                        // Auto-ativar parcelamento se usuário preencher o campo
                        if (numValue && numValue > 0 && !isInstallment) {
                          form.setValue('isInstallment', true, { shouldValidate: true });
                        }
                      }}
                    />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {form.watch('installmentValue') && form.watch('installmentCount') && (
                        <div className="bg-muted p-2 rounded-lg">
                          <p className="text-xs text-muted-foreground">Valor Total:</p>
                          <p className="text-base font-semibold">
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
                                  value={field.value || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const numValue = value ? Number(value) : undefined;
                                    field.onChange(numValue);
                                    
                                    // Auto-ativar parcelamento se usuário preencher o campo
                                    if (numValue && numValue > 0 && !isInstallment) {
                                      form.setValue('isInstallment', true, { shouldValidate: true });
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {form.watch('totalValue') && form.watch('installmentCount') && (
                        <div className="bg-muted p-2 rounded-lg">
                          <p className="text-xs text-muted-foreground">Valor de Cada Parcela:</p>
                          <p className="text-base font-semibold">
                            {formatCurrency((form.watch('totalValue') || 0) / (form.watch('installmentCount') || 0))}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {form.watch('installmentCount') && form.watch('data') && (
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded-lg">
                      <p>📅 Vencimento a partir de <strong>{format(new Date(form.watch('data')), 'dd/MM/yyyy')}</strong></p>
                      <p className="mt-0.5">Última parcela: <strong>{format(
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
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                      value={field.value === null || field.value === undefined ? 'none' : field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
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
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                      value={field.value === null || field.value === undefined ? 'none' : field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Não especificado</SelectItem>
                        <SelectItem value="fixa">Fixa</SelectItem>
                        <SelectItem value="variavel">Variável</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-background shadow-lg flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {transaction ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
