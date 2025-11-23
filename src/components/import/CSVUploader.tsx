import { useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface CSVUploaderProps {
  onFileSelect: (file: File) => void;
}

export const CSVUploader = ({ onFileSelect }: CSVUploaderProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      validateAndSelectFile(file);
    },
    [onFileSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelectFile(file);
  };

  const validateAndSelectFile = (file: File) => {
    const validTypes = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      toast.error('Formato inválido. Use arquivos CSV ou TXT');
      return;
    }

    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    onFileSelect(file);
  };

  return (
    <Card className="p-8">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
      >
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleFileInput}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Arraste seu arquivo CSV aqui</h3>
          <p className="text-sm text-muted-foreground mb-4">
            ou clique para selecionar
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>CSV, TXT • Máximo 10MB</span>
          </div>
        </label>
      </div>
    </Card>
  );
};
