import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, MoreVertical, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { JarvisMemoryItem } from "@/types/jarvis";

interface MemoryCardProps {
  memory: JarvisMemoryItem;
  onDelete: (id: string) => void;
}

const kindConfig: Record<string, { label: string; className: string }> = {
  profile: { label: "Perfil", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  preference: { label: "Preferência", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  decision: { label: "Decisão", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  project: { label: "Projeto", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  note: { label: "Nota", className: "bg-muted text-muted-foreground border-border" },
  message: { label: "Mensagem", className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  chatgpt_user: { label: "ChatGPT (Você)", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  chatgpt_assistant: { label: "ChatGPT (IA)", className: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  learned: { label: "Aprendido", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

const sourceLabels: Record<string, string> = {
  manual: "Manual",
  whatsapp: "WhatsApp",
  app: "App",
  chatgpt: "ChatGPT",
  "jarvis-auto": "Auto-aprendido",
};

export const MemoryCard = ({ memory, onDelete }: MemoryCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const kind = kindConfig[memory.kind] || kindConfig.note;
  const displayTitle = memory.title || memory.content.slice(0, 50);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memory.content);
      toast({ title: "Copiado!" });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja excluir esta memória?")) {
      onDelete(memory.id);
    }
  };

  return (
    <>
      <div className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className={cn("text-xs", kind.className)}>
            {kind.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <h3 className="mt-3 font-medium text-foreground line-clamp-1">
          {displayTitle}
        </h3>

        {/* Content preview */}
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {memory.content}
        </p>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {format(new Date(memory.created_at), "dd MMM yyyy", { locale: ptBR })}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCopy}
            >
              <Copy className="mr-1 h-3 w-3" />
              Copiar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowDetails(true)}
            >
              <Eye className="mr-1 h-3 w-3" />
              Ver mais
            </Button>
          </div>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", kind.className)}>
                {kind.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {sourceLabels[memory.source] || memory.source}
              </Badge>
            </div>
            <DialogTitle className="mt-2">
              {memory.title || "Memória"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="max-h-[300px] overflow-y-auto rounded-lg bg-muted/50 p-4">
              <p className="whitespace-pre-wrap text-sm">{memory.content}</p>
            </div>

            {/* Metadados extras para imports do ChatGPT */}
            {memory.source === 'chatgpt' && memory.metadata && (
              <div className="rounded-lg bg-muted/30 p-3 space-y-1 text-xs text-muted-foreground">
                {(memory.metadata as Record<string, unknown>).model_slug && (
                  <p>🤖 Modelo: <span className="text-foreground">{String((memory.metadata as Record<string, unknown>).model_slug)}</span></p>
                )}
                {(memory.metadata as Record<string, unknown>).original_timestamp && (
                  <p>📅 Data original: <span className="text-foreground">{format(new Date(String((memory.metadata as Record<string, unknown>).original_timestamp)), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></p>
                )}
                {Number((memory.metadata as Record<string, unknown>).attachment_count) > 0 && (
                  <p>📎 Anexos: <span className="text-foreground">{String((memory.metadata as Record<string, unknown>).attachment_count)}</span></p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Criado em {format(new Date(memory.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Fechar
              </Button>
              <Button onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar tudo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const MemoryCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
    <div className="h-5 w-20 rounded bg-muted" />
    <div className="mt-3 h-5 w-3/4 rounded bg-muted" />
    <div className="mt-2 space-y-1">
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
    </div>
    <div className="mt-4 flex justify-between">
      <div className="h-4 w-20 rounded bg-muted" />
      <div className="h-7 w-32 rounded bg-muted" />
    </div>
  </div>
);
