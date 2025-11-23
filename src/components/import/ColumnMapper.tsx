import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnMapping } from '@/lib/csvParser';
import { CheckCircle2 } from 'lucide-react';

interface ColumnMapperProps {
  headers: string[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onNext: () => void;
}

export const ColumnMapper = ({ headers, mapping, onMappingChange, onNext }: ColumnMapperProps) => {
  const requiredFields = [
    { key: 'data', label: 'Data', required: true },
    { key: 'valor', label: 'Valor', required: true },
    { key: 'descricao', label: 'Descrição', required: true },
  ];

  const optionalFields = [
    { key: 'categoria', label: 'Categoria' },
    { key: 'tipo', label: 'Tipo (Receita/Despesa)' },
    { key: 'wallet', label: 'Conta/Cartão' },
    { key: 'payment_method', label: 'Forma de Pagamento' },
    { key: 'status', label: 'Status' },
  ];

  const handleFieldChange = (field: string, value: string) => {
    onMappingChange({ ...mapping, [field]: value === 'none' ? undefined : value });
  };

  const isComplete = requiredFields.every(field => mapping[field.key as keyof ColumnMapping]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapeamento de Colunas</CardTitle>
        <CardDescription>
          Relacione as colunas do seu arquivo com os campos do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3">Campos Obrigatórios</h3>
            <div className="space-y-3">
              {requiredFields.map(field => (
                <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="flex items-center gap-2">
                    {field.label}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={mapping[field.key as keyof ColumnMapping] || 'none'}
                    onValueChange={(value) => handleFieldChange(field.key, value)}
                  >
                    <SelectTrigger className="col-span-2">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {headers.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping[field.key as keyof ColumnMapping] && (
                    <Badge variant="secondary" className="col-start-1 ml-auto">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Auto
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Campos Opcionais</h3>
            <div className="space-y-3">
              {optionalFields.map(field => (
                <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                  <Label>{field.label}</Label>
                  <Select
                    value={mapping[field.key as keyof ColumnMapping] || 'none'}
                    onValueChange={(value) => handleFieldChange(field.key, value)}
                  >
                    <SelectTrigger className="col-span-2">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {headers.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onNext} disabled={!isComplete}>
            Gerar Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
