import { useState, useEffect, useMemo } from "react";
import { Lightbulb, Search, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useJarvisMemory } from "@/hooks/useJarvisMemory";
import { MemoryCard, MemoryCardSkeleton } from "@/components/jarvis/MemoryCard";
import { MemoryForm } from "@/components/jarvis/MemoryForm";
import { ChatGPTImporter, ChatGPTImporterTrigger } from "@/components/jarvis/ChatGPTImporter";
import { ConversationGroup, ConversationGroupSkeleton } from "@/components/jarvis/ConversationGroup";
import type { JarvisMemoryItem } from "@/types/jarvis";

const kindFilterOptions = [
  { value: "all", label: "Todos os tipos" },
  { value: "profile", label: "Perfil" },
  { value: "preference", label: "Preferência" },
  { value: "decision", label: "Decisão" },
  { value: "project", label: "Projeto" },
  { value: "note", label: "Nota" },
  { value: "message", label: "Mensagem" },
  { value: "chatgpt_user", label: "ChatGPT (Você)" },
  { value: "chatgpt_assistant", label: "ChatGPT (IA)" },
  { value: "learned", label: "Aprendido" },
];

const JarvisMemory = () => {
  const {
    memoryItems,
    isLoading,
    createMemoryItem,
    deleteMemoryItem,
    searchMemory,
  } = useJarvisMemory();

  const [kindFilter, setKindFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [importerOpen, setImporterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "grouped">("grouped");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = debouncedQuery ? searchMemory(debouncedQuery) : memoryItems;

    if (kindFilter !== "all") {
      items = items.filter((item) => item.kind === kindFilter);
    }

    return items;
  }, [memoryItems, debouncedQuery, kindFilter, searchMemory]);

  // Group ChatGPT items by conversation_id
  const { groupedConversations, nonChatgptItems } = useMemo(() => {
    const chatgptItems = filteredItems.filter(
      (item) => item.source === "chatgpt" && (item.metadata as Record<string, unknown>)?.conversation_id
    );
    const otherItems = filteredItems.filter(
      (item) => item.source !== "chatgpt" || !(item.metadata as Record<string, unknown>)?.conversation_id
    );

    const groups: Map<string, { title: string; items: JarvisMemoryItem[] }> = new Map();

    chatgptItems.forEach((item) => {
      const convId = String((item.metadata as Record<string, unknown>).conversation_id);
      if (!groups.has(convId)) {
        groups.set(convId, { title: item.title || "Conversa", items: [] });
      }
      groups.get(convId)!.items.push(item);
    });

    // Sort groups by most recent item
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      const aLatest = Math.max(...a[1].items.map((i) => new Date(i.created_at).getTime()));
      const bLatest = Math.max(...b[1].items.map((i) => new Date(i.created_at).getTime()));
      return bLatest - aLatest;
    });

    return {
      groupedConversations: sortedGroups,
      nonChatgptItems: otherItems,
    };
  }, [filteredItems]);

  const handleCreate = (data: { kind: string; title?: string; content: string }) => {
    createMemoryItem.mutate(data);
  };

  const handleDelete = (id: string) => {
    deleteMemoryItem.mutate(id);
  };

  const handleDeleteAll = (ids: string[]) => {
    ids.forEach((id) => deleteMemoryItem.mutate(id));
  };

  const isEmpty = !isLoading && filteredItems.length === 0;
  const isFiltered = kindFilter !== "all" || debouncedQuery.length > 0;
  const hasChatgptItems = groupedConversations.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Memória</h1>
            <p className="text-sm text-muted-foreground">
              {memoryItems.length} {memoryItems.length === 1 ? "item salvo" : "itens salvos"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ChatGPTImporterTrigger onClick={() => setImporterOpen(true)} />
          <MemoryForm onSubmit={handleCreate} isLoading={createMemoryItem.isPending} />
        </div>
      </div>
      
      <ChatGPTImporter open={importerOpen} onOpenChange={setImporterOpen} />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kindFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar memórias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* View mode toggle - only show if there are ChatGPT items */}
        {hasChatgptItems && (
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as "cards" | "grouped")}
            className="shrink-0"
          >
            <ToggleGroupItem value="grouped" aria-label="Agrupar por conversa" title="Agrupar por conversa">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Ver como cards" title="Ver como cards">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {viewMode === "grouped" ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <ConversationGroupSkeleton key={i} />
              ))}
            </>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <MemoryCardSkeleton key={i} />
              ))}
            </div>
          )}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Lightbulb className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">
            {isFiltered
              ? "Nenhum resultado para os filtros aplicados"
              : "Nenhuma memória salva"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isFiltered
              ? "Tente ajustar os filtros ou a busca"
              : "Clique em 'Nova Memória' para adicionar"}
          </p>
        </div>
      ) : viewMode === "grouped" ? (
        <div className="space-y-4">
          {/* Grouped ChatGPT conversations */}
          {groupedConversations.map(([convId, group]) => (
            <ConversationGroup
              key={convId}
              conversationId={convId}
              title={group.title}
              items={group.items}
              onDeleteItem={handleDelete}
              onDeleteAll={handleDeleteAll}
            />
          ))}

          {/* Non-ChatGPT items as cards */}
          {nonChatgptItems.length > 0 && (
            <>
              {groupedConversations.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h2 className="text-sm font-medium text-muted-foreground mb-4">
                    Outras memórias
                  </h2>
                </div>
              )}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {nonChatgptItems.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default JarvisMemory;
