import { Transfer } from '@/hooks/useTransfers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWallets } from '@/hooks/useWallets';

interface TransferCardProps {
  transfer: Transfer;
  onDelete: (id: string) => void;
}

export const TransferCard = ({ transfer, onDelete }: TransferCardProps) => {
  const { wallets } = useWallets();

  const fromWallet = wallets.find(w => w.id === transfer.from_wallet_id);
  const toWallet = wallets.find(w => w.id === transfer.to_wallet_id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-muted-foreground">{fromWallet?.nome || 'Origem'}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{toWallet?.nome || 'Destino'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(transfer.valor)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(transfer.data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            {transfer.descricao && (
              <p className="text-sm text-muted-foreground">{transfer.descricao}</p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(transfer.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
