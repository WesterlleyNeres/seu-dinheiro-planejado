import { useState } from 'react';
import { CardStatement, useStatements } from '@/hooks/useStatements';
import { StatementCard } from './StatementCard';
import { StatementDetails } from './StatementDetails';
import { PayStatementDialog } from './PayStatementDialog';
import { useWallets } from '@/hooks/useWallets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const StatementsList = () => {
  const [selectedStatement, setSelectedStatement] = useState<CardStatement | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  const { statements, closeStatement, payStatement } = useStatements();
  const { wallets } = useWallets();

  const getWalletName = (walletId: string) => {
    return wallets.find(w => w.id === walletId)?.nome || 'Cartão';
  };

  const handleViewDetails = (statement: CardStatement) => {
    setSelectedStatement(statement);
    setDetailsOpen(true);
  };

  const handleOpenPayDialog = (statement: CardStatement) => {
    setSelectedStatement(statement);
    setPayDialogOpen(true);
  };

  const handleCloseStatement = async (statementId: string) => {
    if (confirm('Deseja fechar esta fatura? Todas as transações do período serão vinculadas.')) {
      await closeStatement(statementId);
    }
  };

  const handlePayStatement = async (data: any) => {
    if (!selectedStatement) return;
    
    setPaymentLoading(true);
    try {
      await payStatement(
        selectedStatement.id,
        data.payment_wallet_id,
        data.payment_date
      );
      setPayDialogOpen(false);
      setSelectedStatement(null);
    } finally {
      setPaymentLoading(false);
    }
  };

  const openStatements = statements.filter(s => s.status === 'aberta');
  const closedStatements = statements.filter(s => s.status === 'fechada');
  const paidStatements = statements.filter(s => s.status === 'paga');

  return (
    <div className="space-y-4">
      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="open">
            Abertas ({openStatements.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Fechadas ({closedStatements.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Pagas ({paidStatements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4 mt-4">
          {openStatements.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Nenhuma fatura aberta</p>
            </div>
          ) : (
            openStatements.map((statement) => (
              <StatementCard
                key={statement.id}
                statement={statement}
                walletName={getWalletName(statement.wallet_id)}
                onViewDetails={handleViewDetails}
                onClose={handleCloseStatement}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4 mt-4">
          {closedStatements.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Nenhuma fatura fechada</p>
            </div>
          ) : (
            closedStatements.map((statement) => (
              <StatementCard
                key={statement.id}
                statement={statement}
                walletName={getWalletName(statement.wallet_id)}
                onViewDetails={handleViewDetails}
                onPay={handleOpenPayDialog}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4 mt-4">
          {paidStatements.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Nenhuma fatura paga</p>
            </div>
          ) : (
            paidStatements.map((statement) => (
              <StatementCard
                key={statement.id}
                statement={statement}
                walletName={getWalletName(statement.wallet_id)}
                onViewDetails={handleViewDetails}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <StatementDetails
        statement={selectedStatement}
        walletName={selectedStatement ? getWalletName(selectedStatement.wallet_id) : ''}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedStatement(null);
        }}
      />

      <PayStatementDialog
        statement={selectedStatement}
        walletName={selectedStatement ? getWalletName(selectedStatement.wallet_id) : ''}
        open={payDialogOpen}
        onClose={() => {
          setPayDialogOpen(false);
          setSelectedStatement(null);
        }}
        onSubmit={handlePayStatement}
        loading={paymentLoading}
      />
    </div>
  );
};
