import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PreviewRow } from '@/hooks/useImporter';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImportPreviewProps {
  preview: PreviewRow[];
  onPreviewChange: (preview: PreviewRow[]) => void;
  onImport: () => void;
  loading: boolean;
}

export const ImportPreview = ({ preview, onPreviewChange, onImport, loading }: ImportPreviewProps) => {
  const [selectAll, setSelectAll] = useState(true);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    onPreviewChange(
      preview.map(row => ({
        ...row,
        selected: checked && !row.isDuplicate,
      }))
    );
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    onPreviewChange(
      preview.map(row => (row.id === id ? { ...row, selected: checked } : row))
    );
  };

  const selectedCount = preview.filter(r => r.selected).length;
  const duplicateCount = preview.filter(r => r.isDuplicate).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview da Importação</CardTitle>
        <CardDescription>
          Revise e selecione as transações que deseja importar
        </CardDescription>
        <div className="flex gap-4 mt-4">
          <Badge variant="secondary">
            Total: {preview.length}
          </Badge>
          <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Selecionadas: {selectedCount}
          </Badge>
          {duplicateCount > 0 && (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Duplicatas: {duplicateCount}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.slice(0, 50).map(row => (
                <TableRow key={row.id} className={row.isDuplicate ? 'bg-destructive/10' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={row.selected}
                      disabled={row.isDuplicate}
                      onCheckedChange={(checked) => handleRowSelect(row.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>{row.data ? formatDate(row.data) : '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.descricao}</TableCell>
                  <TableCell>
                    {row.categoryMatch ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{row.categoryMatch.categoryName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(row.categoryMatch.score * 100)}%
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sem categoria</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.valor)}
                  </TableCell>
                  <TableCell>
                    {row.isDuplicate ? (
                      <Badge variant="destructive">Duplicata</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {preview.length > 50 && (
          <p className="text-sm text-muted-foreground mt-2">
            Mostrando primeiras 50 de {preview.length} transações
          </p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onImport} disabled={selectedCount === 0 || loading}>
            {loading ? 'Importando...' : `Importar ${selectedCount} Transações`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
