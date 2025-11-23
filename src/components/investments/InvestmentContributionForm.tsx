import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { investmentContributionSchema } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { format } from 'date-fns';
import { Investment } from '@/hooks/useInvestments';

interface InvestmentContributionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  investment: Investment | null;
}

export const InvestmentContributionForm = ({
  open,
  onClose,
  onSubmit,
  investment,
}: InvestmentContributionFormProps) => {
  const form = useForm({
    resolver: zodResolver(investmentContributionSchema),
    defaultValues: {
      valor: 0,
      data: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const handleSubmit = async (data: any) => {
    if (!investment) return;

    await onSubmit({
      ...data,
      investment_id: investment.id,
    });
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Aporte</DialogTitle>
          {investment && (
            <p className="text-sm text-muted-foreground">{investment.nome}</p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                      placeholder="R$ 0,00"
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

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
