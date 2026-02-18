import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface QuickEventInputProps {
  onAdd: (data: { title: string; start_at: string; all_day: boolean }) => void;
  isLoading?: boolean;
}

export const QuickEventInput = ({ onAdd, isLoading }: QuickEventInputProps) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("09:00");
  const [allDay, setAllDay] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const start_at = allDay
      ? `${date}T00:00:00`
      : `${date}T${time}:00`;

    onAdd({ title: title.trim(), start_at, all_day: allDay });
    setTitle("");
  };

  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Título */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do compromisso..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          {/* Data */}
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-40"
          />

          {/* Hora (se não for dia inteiro) */}
          {!allDay && (
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full sm:w-28"
            />
          )}

          {/* Toggle dia inteiro */}
          <div className="flex items-center gap-2">
            <Switch checked={allDay} onCheckedChange={setAllDay} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Dia inteiro
            </span>
          </div>

          {/* Botão salvar */}
          <Button onClick={handleSubmit} disabled={!title.trim() || isLoading} size="icon">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
