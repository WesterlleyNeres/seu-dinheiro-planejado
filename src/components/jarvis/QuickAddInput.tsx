import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAddInputProps {
  placeholder?: string;
  onAdd: (title: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const QuickAddInput = ({
  placeholder = "O que você precisa fazer?",
  onAdd,
  isLoading = false,
  className,
}: QuickAddInputProps) => {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onAdd(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="h-12 pl-4 pr-12 text-sm bg-card border-border focus:border-primary transition-colors"
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
