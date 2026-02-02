import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { JarvisMemoryItem } from "@/types/jarvis";

interface ConversationGroupProps {
  conversationId: string;
  title: string;
  items: JarvisMemoryItem[];
  onDeleteItem: (id: string) => void;
  onDeleteAll: (ids: string[]) => void;
}

const kindBadgeConfig: Record<string, { label: string; className: string }> = {
  chatgpt_user: { 
    label: "Você", 
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
  },
  chatgpt_assistant: { 
    label: "IA", 
    className: "bg-violet-500/20 text-violet-400 border-violet-500/30" 
  },
};

export const ConversationGroup = ({ 
  conversationId, 
  title, 
  items, 
  onDeleteItem,
  onDeleteAll,
}: ConversationGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLimit, setShowLimit] = useState(6);

  // Sort items by original timestamp if available
  const sortedItems = [...items].sort((a, b) => {
    const aTime = (a.metadata as Record<string, unknown>)?.original_timestamp;
    const bTime = (b.metadata as Record<string, unknown>)?.original_timestamp;
    if (aTime && bTime) {
      return new Date(String(aTime)).getTime() - new Date(String(bTime)).getTime();
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const displayedItems = sortedItems.slice(0, showLimit);
  const hasMore = sortedItems.length > showLimit;

  // Get the earliest date from items
  const earliestDate = sortedItems[0]?.created_at 
    ? format(new Date(sortedItems[0].created_at), "dd MMM yyyy", { locale: ptBR })
    : "";

  // Get model from first assistant message
  const modelSlug = sortedItems.find(
    (i) => (i.metadata as Record<string, unknown>)?.model_slug
  )?.metadata as Record<string, unknown>;

  const handleDeleteAll = () => {
    const allIds = items.map((i) => i.id);
    onDeleteAll(allIds);
  };

  return (
    <Card className="overflow-hidden border-border bg-card transition-all hover:border-primary/20">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                <MessageSquare className="h-5 w-5 text-violet-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/30">
                    ChatGPT
                  </Badge>
                  {modelSlug?.model_slug && (
                    <span className="text-xs text-muted-foreground">
                      {String(modelSlug.model_slug)}
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-foreground truncate">{title}</h3>
                <p className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "mensagem" : "mensagens"} · {earliestDate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso excluirá todas as {items.length} mensagens desta conversa. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <ChevronDown 
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )} 
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-4 py-3 space-y-2">
            {displayedItems.map((item) => {
              const badge = kindBadgeConfig[item.kind] || { label: item.kind, className: "" };
              return (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-lg bg-muted/30 p-3 group"
                >
                  <Badge 
                    variant="outline" 
                    className={cn("shrink-0 text-xs h-fit", badge.className)}
                  >
                    {badge.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                    {item.content}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}

            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setShowLimit((prev) => prev + 10)}
              >
                Ver mais {sortedItems.length - showLimit} mensagens
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const ConversationGroupSkeleton = () => (
  <Card className="overflow-hidden border-border bg-card animate-pulse">
    <div className="flex items-center gap-3 p-4">
      <div className="h-10 w-10 rounded-lg bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
      <div className="h-5 w-5 rounded bg-muted" />
    </div>
  </Card>
);
