import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JarvisEvent } from "@/types/jarvis";

const eventFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  description: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  start_at: z.string().min(1, "Data de início é obrigatória"),
  end_at: z.string().optional().nullable(),
  all_day: z.boolean().default(false),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: JarvisEvent | null;
  onSubmit: (values: EventFormValues) => void;
  isLoading?: boolean;
}

export const EventForm = ({
  open,
  onOpenChange,
  event,
  onSubmit,
  isLoading,
}: EventFormProps) => {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      location: event?.location || "",
      start_at: event?.start_at?.slice(0, 16) || "",
      end_at: event?.end_at?.slice(0, 16) || null,
      all_day: event?.all_day || false,
      priority: event?.priority || "medium",
    },
  });

  const handleSubmit = (values: EventFormValues) => {
    onSubmit(values);
    form.reset();
    onOpenChange(false);
  };

  const allDay = form.watch("all_day");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {event ? "Editar Evento" : "Novo Evento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reunião com cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes do evento..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Escritório, Zoom, etc."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="all_day"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Dia inteiro</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input
                        type={allDay ? "date" : "datetime-local"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type={allDay ? "date" : "datetime-local"}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : event ? "Salvar" : "Criar Evento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
