import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, Tag, ArrowUpDown, X } from "lucide-react";

export type PriorityFilter = "all" | "low" | "medium" | "high";
export type SortBy = "due_at" | "created_at";

interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  priorityFilter: PriorityFilter;
  onPriorityChange: (value: PriorityFilter) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  sortBy: SortBy;
  onSortChange: (value: SortBy) => void;
  availableTags: string[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const priorityLabels: Record<PriorityFilter, string> = {
  all: "Todas",
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export function TaskFilters({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  selectedTags,
  onTagsChange,
  sortBy,
  onSortChange,
  availableTags,
  onClearFilters,
  hasActiveFilters,
}: TaskFiltersProps) {
  const [tagsOpen, setTagsOpen] = useState(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Priority Filter */}
        <Select
          value={priorityFilter}
          onValueChange={(v) => onPriorityChange(v as PriorityFilter)}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent className="bg-background border">
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>

        {/* Tags Multi-Select */}
        <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Tag className="h-4 w-4" />
              Tags
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedTags.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 bg-background border" align="start">
            {availableTags.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                Nenhuma tag disponível
              </div>
            ) : (
              <Command>
                <CommandInput placeholder="Buscar tags..." />
                <CommandList>
                  <CommandEmpty>Nenhuma tag encontrada</CommandEmpty>
                  <CommandGroup>
                    {availableTags.map((tag) => (
                      <CommandItem
                        key={tag}
                        value={tag}
                        onSelect={() => toggleTag(tag)}
                        className="cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedTags.includes(tag)}
                          className="mr-2"
                        />
                        <span>{tag}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </PopoverContent>
        </Popover>

        {/* Sort Toggle */}
        <Select
          value={sortBy}
          onValueChange={(v) => onSortChange(v as SortBy)}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent className="bg-background border">
            <SelectItem value="due_at">Por prazo</SelectItem>
            <SelectItem value="created_at">Por criação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtros ativos:</span>
          {searchQuery && (
            <Badge variant="secondary">Busca: "{searchQuery}"</Badge>
          )}
          {priorityFilter !== "all" && (
            <Badge variant="secondary">
              Prioridade: {priorityLabels[priorityFilter]}
            </Badge>
          )}
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-6 px-2"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
}
