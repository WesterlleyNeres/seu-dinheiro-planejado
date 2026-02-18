import { useCallback, useRef } from 'react';
import { Upload, FileJson, Check, X, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useChatGPTImport } from '@/hooks/useChatGPTImport';
import { cn } from '@/lib/utils';

interface ChatGPTImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatGPTImporter({ open, onOpenChange }: ChatGPTImporterProps) {
  const {
    step,
    conversations,
    selectedIds,
    progress,
    result,
    error,
    selectedStats,
    handleFileUpload,
    toggleConversation,
    selectAll,
    deselectAll,
    startImport,
    reset,
    goBack,
  } = useChatGPTImport();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Delay reset para não mostrar transição
    setTimeout(reset, 300);
  }, [onOpenChange, reset]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            Importar do ChatGPT
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload do arquivo conversations.json exportado do ChatGPT'}
            {step === 'select' && 'Selecione as conversas que deseja importar'}
            {step === 'importing' && 'Importando memórias...'}
            {step === 'done' && 'Importação concluída'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="flex-1 flex flex-col">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex-1 min-h-[200px] border-2 border-dashed rounded-lg',
                'flex flex-col items-center justify-center gap-4 p-8',
                'cursor-pointer transition-colors',
                'hover:border-primary hover:bg-primary/5',
                error && 'border-destructive'
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Arraste o arquivo aqui</p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                conversations.json
              </Badge>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {error && (
              <p className="mt-4 text-sm text-destructive text-center">{error}</p>
            )}

            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <h4 className="text-sm font-medium mb-2">Como exportar do ChatGPT:</h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Acesse chat.openai.com e faça login</li>
                <li>Clique no seu perfil → Settings</li>
                <li>Em Data Controls, clique em "Export data"</li>
                <li>Aguarde o email e baixe o arquivo ZIP</li>
                <li>Extraia e use o arquivo conversations.json</li>
              </ol>
            </div>
          </div>
        )}

        {/* Step 2: Select */}
        {step === 'select' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {conversations.length} conversas encontradas
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Selecionar todas
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Limpar
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => toggleConversation(conv.id)}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg cursor-pointer',
                      'border transition-colors',
                      selectedIds.has(conv.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-muted/50'
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(conv.id)}
                      onCheckedChange={() => toggleConversation(conv.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {conv.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(conv.createdAt)} • {conv.messageCount} mensagens
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="pt-4 mt-4 border-t flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{selectedStats.conversationCount}</span>
                <span className="text-muted-foreground"> conversas • </span>
                <span className="font-medium">{selectedStats.messageCount}</span>
                <span className="text-muted-foreground"> mensagens</span>
              </div>
              <Button
                onClick={startImport}
                disabled={selectedIds.size === 0}
              >
                Importar Selecionadas
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-6" />
            <p className="font-medium mb-4">Importando memórias...</p>
            <div className="w-full max-w-xs">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center mt-2">
                {progress}% concluído
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && result && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className={cn(
              'h-16 w-16 rounded-full flex items-center justify-center mb-6',
              result.errors > 0 ? 'bg-yellow-500/10' : 'bg-green-500/10'
            )}>
              {result.errors > 0 ? (
                <X className="h-8 w-8 text-yellow-500" />
              ) : (
                <Check className="h-8 w-8 text-green-500" />
              )}
            </div>

            <h3 className="text-lg font-semibold mb-2">
              {result.errors > 0 ? 'Importação parcial' : 'Importação concluída!'}
            </h3>

            <div className="text-center space-y-1 text-sm text-muted-foreground mb-6">
              <p>
                <span className="font-medium text-foreground">{result.imported}</span> memórias importadas
              </p>
              {result.duplicates > 0 && (
                <p>
                  <span className="font-medium text-foreground">{result.duplicates}</span> duplicatas ignoradas
                </p>
              )}
              {result.errors > 0 && (
                <p className="text-destructive">
                  <span className="font-medium">{result.errors}</span> erros
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                Importar outro arquivo
              </Button>
              <Button onClick={handleClose}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Trigger button separado para uso externo
export function ChatGPTImporterTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="gap-2 w-full sm:w-auto">
      <FileJson className="h-4 w-4" />
      <span className="hidden sm:inline">Importar ChatGPT</span>
      <span className="sm:hidden">Importar</span>
    </Button>
  );
}
