import { useEffect } from "react";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JarvisHabit } from "@/types/jarvis";

const habitFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(100),
  cadence: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  times_per_cadence: z.coerce.number().min(1).max(30).default(3),
  target_type: z.enum(["count", "duration"]).default("count"),
  target_value: z.coerce.number().min(1).default(1),
});

type HabitFormValues = z.infer<typeof habitFormSchema>;

interface HabitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: JarvisHabit | null;
  onSubmit: (values: HabitFormValues) => void;
  isLoading?: boolean;
}

export const HabitForm = ({
  open,
  onOpenChange,
  habit,
  onSubmit,
  isLoading,
}: HabitFormProps) => {
  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      title: "",
      cadence: "weekly",
      times_per_cadence: 3,
      target_type: "count",
      target_value: 1,
    },
  });

  // Reset form when dialog opens or habit changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: habit?.title || "",
        cadence: habit?.cadence || "weekly",
        times_per_cadence: habit?.times_per_cadence || 3,
        target_type: habit?.target_type || "count",
        target_value: habit?.target_value || 1,
      });
    }
  }, [open, habit, form]);

  const handleSubmit = (values: HabitFormValues) => {
    onSubmit(values);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {habit ? "Editar Hábito" : "Novo Hábito"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Hábito</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Fazer exercício, Ler 30 min..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cadence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Diário</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="times_per_cadence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vezes por período</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={30} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Meta de repetições
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="target_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Meta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="count">Contagem (vezes)</SelectItem>
                        <SelectItem value="duration">Duração (minutos)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor por Registro</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {form.watch("target_type") === "duration" ? "Minutos por vez" : "Unidades por vez"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : habit ? "Salvar" : "Criar Hábito"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
