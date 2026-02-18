import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useTransfers } from '@/hooks/useTransfers';
import { TransferForm } from '@/components/transfers/TransferForm';
import { TransferCard } from '@/components/transfers/TransferCard';
import { WalletBalance } from '@/hooks/useTransfers';
import { PageShell } from '@/components/layout/PageShell';

const Transfers = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const { transfers, loading, createTransfer, deleteTransfer, getWalletBalances } = useTransfers();

  const handleOpenForm = async () => {
    const balances = await getWalletBalances();
    setWalletBalances(balances);
    setIsFormOpen(true);
  };

  const handleSubmit = async (data: any) => {
    await createTransfer(data);
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir esta transferência?')) {
      await deleteTransfer(id);
    }
  };

  return (
    <PageShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Transferências</h1>
            <p className="text-muted-foreground">
              Gerencie transferências entre suas carteiras
            </p>
          </div>
          <Button onClick={handleOpenForm}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transferência
          </Button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando transferências...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Nenhuma transferência cadastrada</p>
              <Button onClick={handleOpenForm} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira transferência
              </Button>
            </div>
          ) : (
            transfers.map((transfer) => (
              <TransferCard
                key={transfer.id}
                transfer={transfer}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Transferência</DialogTitle>
            </DialogHeader>
            <TransferForm
              onSubmit={handleSubmit}
              onCancel={() => setIsFormOpen(false)}
              walletBalances={walletBalances}
            />
          </DialogContent>
        </Dialog>
    </PageShell>
  );
};

export default Transfers;
