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
import { format } from 'date-fns';
import { PaymentMethodSelect } from '@/components/forms/PaymentMethodSelect';

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
      });
      setTipo(transaction.tipo);
    }
  }, [transaction, form]);

  const handleSubmit = async (data: any) => {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  };

  const filteredCategories = categories.filter(
    (cat) => cat.tipo === 'receita' ? tipo === 'receita' : tipo === 'despesa'
  );

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
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
