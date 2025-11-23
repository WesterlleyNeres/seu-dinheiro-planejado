import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useWallets, Wallet } from '@/hooks/useWallets';
import { useTransfers } from '@/hooks/useTransfers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { walletSchema } from '@/lib/validations';
import { Plus, Pencil, Trash2, Wallet as WalletIcon, CreditCard, Building } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';
import { StatementsList } from '@/components/statements/StatementsList';

export default function Wallets() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | null>(null);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});

  const { wallets, loading, createWallet, updateWallet, deleteWallet } = useWallets();
  const { getWalletBalances } = useTransfers();

  useEffect(() => {
    loadBalances();
  }, [wallets]);

  const loadBalances = async () => {
    const balances = await getWalletBalances();
    const balancesMap: Record<string, number> = {};
    balances.forEach(wb => {
      balancesMap[wb.wallet_id] = wb.saldo;
    });
    setWalletBalances(balancesMap);
  };

  const form = useForm({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      nome: '',
      tipo: 'conta' as 'conta' | 'cartao',
      instituicao: '',
      dia_fechamento: undefined,
      dia_vencimento: undefined,
      ativo: true,
    },
  });

  const tipoWatch = form.watch('tipo');

  const handleSubmit = async (data: any) => {
    const submitData = { ...data };
    
    if (submitData.tipo === 'conta') {
      submitData.dia_fechamento = null;
      submitData.dia_vencimento = null;
    }

    if (editingWallet) {
      await updateWallet(editingWallet.id, submitData);
    } else {
      await createWallet(submitData);
    }
    setFormOpen(false);
    setEditingWallet(undefined);
    form.reset();
  };

  const handleEdit = (wallet: Wallet) => {
    setEditingWallet(wallet);
    form.reset({
      nome: wallet.nome,
      tipo: wallet.tipo,
      instituicao: wallet.instituicao || '',
      dia_fechamento: wallet.dia_fechamento || undefined,
      dia_vencimento: wallet.dia_vencimento || undefined,
      ativo: wallet.ativo,
    });
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingWallet(undefined);
    form.reset({
      nome: '',
      tipo: 'conta',
      instituicao: '',
      dia_fechamento: undefined,
      dia_vencimento: undefined,
      ativo: true,
    });
    setFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setWalletToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (walletToDelete) {
      await deleteWallet(walletToDelete);
      setWalletToDelete(null);
    }
  };

  const contas = wallets.filter((w) => w.tipo === 'conta');
  const cartoes = wallets.filter((w) => w.tipo === 'cartao');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Carteiras</h1>
            <p className="text-muted-foreground">Gerencie suas contas, cartões e faturas</p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Carteira
          </Button>
        </div>

        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="wallets">Carteiras</TabsTrigger>
            <TabsTrigger value="statements">Faturas</TabsTrigger>
          </TabsList>

          <TabsContent value="wallets" className="mt-6">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-56" />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {contas.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <WalletIcon className="h-5 w-5" />
                      Contas
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {contas.map((wallet) => (
                        <Card key={wallet.id}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                {wallet.nome}
                              </span>
                              <Badge variant={wallet.ativo ? 'default' : 'secondary'}>
                                {wallet.ativo ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {wallet.instituicao && (
                              <p className="text-sm text-muted-foreground">
                                {wallet.instituicao}
                              </p>
                            )}
                            <div className="p-3 bg-primary/5 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Saldo atual</p>
                              <p className="text-xl font-bold text-primary">
                                {formatCurrency(walletBalances[wallet.id] || 0)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(wallet)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(wallet.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {cartoes.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Cartões de Crédito
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {cartoes.map((wallet) => (
                        <Card key={wallet.id}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                {wallet.nome}
                              </span>
                              <Badge variant={wallet.ativo ? 'default' : 'secondary'}>
                                {wallet.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {wallet.instituicao && (
                              <p className="text-sm text-muted-foreground">
                                {wallet.instituicao}
                              </p>
                            )}
                            <div className="text-sm space-y-1">
                              {wallet.dia_fechamento && (
                                <p>Fechamento: dia {wallet.dia_fechamento}</p>
                              )}
                              {wallet.dia_vencimento && (
                                <p>Vencimento: dia {wallet.dia_vencimento}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(wallet)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(wallet.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {wallets.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">
                        Nenhuma carteira encontrada. Crie sua primeira carteira!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="statements" className="mt-6">
            <StatementsList />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWallet ? 'Editar Carteira' : 'Nova Carteira'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da carteira
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Nubank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="conta">Conta Bancária</SelectItem>
                        <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instituicao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instituição (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Banco do Brasil" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {tipoWatch === 'cartao' && (
                <>
                  <FormField
                    control={form.control}
                    name="dia_fechamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia de Fechamento</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Ex: 15"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dia_vencimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia de Vencimento</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Ex: 25"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Ativo</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingWallet ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta carteira? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
