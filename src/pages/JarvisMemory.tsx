import { useState, useEffect, useMemo } from "react";
import { Lightbulb, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJarvisMemory } from "@/hooks/useJarvisMemory";
import { MemoryCard, MemoryCardSkeleton } from "@/components/jarvis/MemoryCard";
import { MemoryForm } from "@/components/jarvis/MemoryForm";

const kindFilterOptions = [
  { value: "all", label: "Todos os tipos" },
  { value: "profile", label: "Perfil" },
  { value: "preference", label: "Preferência" },
  { value: "decision", label: "Decisão" },
  { value: "project", label: "Projeto" },
  { value: "note", label: "Nota" },
  { value: "message", label: "Mensagem" },
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

  const handleCreate = (data: { kind: string; title?: string; content: string }) => {
    createMemoryItem.mutate(data);
  };

  const handleDelete = (id: string) => {
    deleteMemoryItem.mutate(id);
  };

  const isEmpty = !isLoading && filteredItems.length === 0;
  const isFiltered = kindFilter !== "all" || debouncedQuery.length > 0;

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
        <MemoryForm onSubmit={handleCreate} isLoading={createMemoryItem.isPending} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
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
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MemoryCardSkeleton key={i} />
          ))}
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
