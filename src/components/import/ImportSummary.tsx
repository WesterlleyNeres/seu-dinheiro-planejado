import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportSummary as ImportSummaryType } from '@/hooks/useImporter';
import { CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface ImportSummaryProps {
  summary: ImportSummaryType;
  onReset: () => void;
}

export const ImportSummary = ({ summary, onReset }: ImportSummaryProps) => {
  const [errorsOpen, setErrorsOpen] = useState(false);

  const downloadErrorReport = () => {
    const csv = [
      'Linha,Erro',
      ...summary.errorDetails.map(e => `${e.row},"${e.error}"`),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo da Importação</CardTitle>
        <CardDescription>
          Resultado do processamento das transações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{summary.total}</div>
                <p className="text-sm text-muted-foreground mt-1">Total</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-3xl font-bold text-green-600">{summary.imported}</div>
                <p className="text-sm text-muted-foreground mt-1">Importadas</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                <div className="text-3xl font-bold text-yellow-600">{summary.duplicates}</div>
                <p className="text-sm text-muted-foreground mt-1">Duplicatas</p>
              </div>
            </CardContent>
          </Card>

          <Card className={summary.errors > 0 ? 'border-red-500/50 bg-red-500/5' : ''}>
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className={`h-8 w-8 mx-auto mb-2 ${summary.errors > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
                <div className={`text-3xl font-bold ${summary.errors > 0 ? 'text-red-600' : ''}`}>
                  {summary.errors}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Erros</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {summary.errorDetails.length > 0 && (
          <Collapsible open={errorsOpen} onOpenChange={setErrorsOpen}>
            <Card className="border-red-500/50">
              <CardHeader>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Detalhes dos Erros</CardTitle>
                    <Button variant="ghost" size="sm">
                      {errorsOpen ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-2 max-h-[200px] overflow-auto">
                    {summary.errorDetails.map((error, index) => (
                      <div key={index} className="text-sm p-2 bg-muted rounded">
                        <span className="font-semibold">Linha {error.row}:</span>{' '}
                        <span className="text-muted-foreground">{error.error}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={downloadErrorReport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Relatório de Erros
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        <div className="flex justify-center gap-2">
          <Button onClick={onReset}>
            Fazer Nova Importação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
