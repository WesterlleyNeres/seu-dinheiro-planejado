import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ColumnMapping } from '@/lib/csvParser';
import { CheckCircle2, Save } from 'lucide-react';
import { ImportPreset } from '@/hooks/useImporter';

interface ColumnMapperProps {
  headers: string[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onNext: () => void;
  presets: ImportPreset[];
  onApplyPreset: (preset: ImportPreset) => void;
  onSavePreset: (nome: string) => void;
}

export const ColumnMapper = ({ 
  headers, 
  mapping, 
  onMappingChange, 
  onNext, 
  presets,
  onApplyPreset,
  onSavePreset 
}: ColumnMapperProps) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
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

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim());
      setShowSaveDialog(false);
      setPresetName('');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Mapeamento de Colunas</CardTitle>
          <CardDescription>
            Relacione as colunas do seu arquivo com os campos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {presets.length > 0 && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Usar Preset</Label>
                <Select onValueChange={(value) => {
                  const preset = presets.find(p => p.id === value);
                  if (preset) onApplyPreset(preset);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map(preset => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.nome} {preset.is_default && '(Padrão)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(true)}
                disabled={!isComplete}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Preset
              </Button>
            </div>
          )}
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

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Preset</DialogTitle>
            <DialogDescription>
              Salve este mapeamento de colunas para reutilizar em futuras importações
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="preset-name">Nome do Preset</Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Ex: Banco do Brasil - Conta Corrente"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
