import { useState } from 'react';
import { Transaction } from '@/hooks/useTransactions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
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
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface InstallmentGroupRowProps {
  parcels: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
}

export const InstallmentGroupRow = ({
  parcels,
  onEdit,
  onDelete,
  onToggleStatus,
}: InstallmentGroupRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (parcels.length === 0) return null;

  const firstParcel = parcels[0];
  // Calcular valor total baseado nas parcelas realmente presentes
  const totalValue = parcels.reduce((sum, p) => sum + Number(p.valor), 0);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      // Executar todas as exclusões em paralelo e aguardar completarem
      await Promise.all(
        parcels.map((parcel) => onDelete(parcel.id))
      );
      
      // Fechar dialog apenas APÓS todas as exclusões completarem
      setDeleteAllDialogOpen(false);
    } catch (error) {
      console.error('Erro ao excluir parcelas:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Main collapsed row */}
      <TableRow className="hover:bg-muted/50">
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-0 h-8 w-8"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>{formatDate(firstParcel.data)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-medium">{firstParcel.descricao}</span>
            <Badge variant="secondary" className="text-xs">
              🔢 {parcels.length} parcelas
            </Badge>
          </div>
        </TableCell>
        <TableCell>{firstParcel.category?.nome}</TableCell>
        <TableCell>
          <Badge
            variant={firstParcel.tipo === 'receita' ? 'default' : 'secondary'}
          >
            {firstParcel.tipo}
          </Badge>
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onToggleStatus(firstParcel.id, firstParcel.status)
            }
          >
            {firstParcel.status === 'paga' ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <Clock className="h-4 w-4 text-warning" />
            )}
          </Button>
        </TableCell>
        <TableCell
          className={`text-right font-semibold ${
            firstParcel.tipo === 'receita' ? 'text-success' : 'text-destructive'
          }`}
        >
          {firstParcel.tipo === 'receita' ? '+' : '-'}
          {formatCurrency(totalValue)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(firstParcel)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteAllDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded rows */}
      {expanded &&
        parcels.map((parcel) => (
          <TableRow
            key={parcel.id}
            className="bg-muted/30 hover:bg-muted/50"
          >
            <TableCell></TableCell>
            <TableCell className="pl-12">{formatDate(parcel.data)}</TableCell>
            <TableCell className="pl-12">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Parcela {parcel.parcela_numero}/{parcel.parcela_total}
                </span>
              </div>
            </TableCell>
            <TableCell>{parcel.category?.nome}</TableCell>
            <TableCell>
              <Badge
                variant={parcel.tipo === 'receita' ? 'default' : 'secondary'}
              >
                {parcel.tipo}
              </Badge>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleStatus(parcel.id, parcel.status)}
              >
                {parcel.status === 'paga' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Clock className="h-4 w-4 text-warning" />
                )}
              </Button>
            </TableCell>
            <TableCell
              className={`text-right ${
                parcel.tipo === 'receita' ? 'text-success' : 'text-destructive'
              }`}
            >
              {parcel.tipo === 'receita' ? '+' : '-'}
              {formatCurrency(Number(parcel.valor))}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(parcel)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(parcel.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}

      {/* Delete All Confirmation */}
      <AlertDialog
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Todas as Parcelas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir todas as {parcels.length} parcelas
              deste lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir Todas'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
