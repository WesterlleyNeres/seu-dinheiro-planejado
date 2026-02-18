import { useState, useEffect } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MemoryFormProps {
  onSubmit: (data: { kind: string; title?: string; content: string }) => void;
  isLoading?: boolean;
}

const kindOptions = [
  { value: "note", label: "Nota" },
  { value: "profile", label: "Perfil" },
  { value: "preference", label: "Preferência" },
  { value: "decision", label: "Decisão" },
  { value: "project", label: "Projeto" },
  { value: "message", label: "Mensagem" },
];

// Smart Kind: sugere tipo automaticamente baseado no conteúdo
const suggestKind = (text: string): string => {
  const lower = text.toLowerCase();
  
  // Preference patterns
  if (lower.includes("prefiro") || lower.includes("gosto de") || lower.includes("não gosto") || lower.includes("favorito")) {
    return "preference";
  }
  // Decision patterns
  if (lower.includes("decidi") || lower.includes("vou fazer") || lower.includes("escolhi") || lower.includes("resolvi")) {
    return "decision";
  }
  // Project patterns
  if (lower.includes("projeto") || lower.includes("plano") || lower.includes("meta") || lower.includes("objetivo")) {
    return "project";
  }
  // Profile patterns
  if (lower.includes("meu nome") || lower.includes("eu sou") || lower.includes("trabalho como") || lower.includes("moro em")) {
    return "profile";
  }
  // Message patterns
  if (lower.includes("mensagem") || lower.includes("disse") || lower.includes("falou") || lower.includes("mandou")) {
    return "message";
  }
  
  return "note"; // default
};

export const MemoryForm = ({ onSubmit, isLoading }: MemoryFormProps) => {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [suggestedKind, setSuggestedKind] = useState<string | null>(null);
  const [userOverrodeKind, setUserOverrodeKind] = useState(false);

  // Debounce para sugestão de tipo (500ms após parar de digitar)
  useEffect(() => {
    if (!content.trim() || userOverrodeKind) return;
    
    const timer = setTimeout(() => {
      const suggested = suggestKind(content);
      if (suggested !== kind) {
        setKind(suggested);
        setSuggestedKind(suggested);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [content, userOverrodeKind, kind]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSubmit({
      kind,
      title: title.trim() || undefined,
      content: content.trim(),
    });

    // Reset form
    setKind("note");
    setTitle("");
    setContent("");
    setSuggestedKind(null);
    setUserOverrodeKind(false);
    setOpen(false);
  };

  const handleKindChange = (value: string) => {
    setKind(value);
    setUserOverrodeKind(true);
    setSuggestedKind(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset on close
      setKind("note");
      setTitle("");
      setContent("");
      setSuggestedKind(null);
      setUserOverrodeKind(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova Memória
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Memória</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="kind" className="flex items-center gap-2">
              Tipo
              {suggestedKind && !userOverrodeKind && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Sugerido
                </Badge>
              )}
            </Label>
            <Select value={kind} onValueChange={handleKindChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kindOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da memória"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva o conteúdo da memória..."
              rows={5}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!content.trim() || isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
