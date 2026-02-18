import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/TenantContext";
import { useJarvisReminders } from "@/hooks/useJarvisReminders";
import { ReminderCard } from "@/components/jarvis/ReminderCard";
import { Plus, Bell, Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const JarvisReminders = () => {
  const { loading: tenantLoading } = useTenant();
  const { reminders, isLoading, createReminder, updateStatus, dismissReminder, deleteReminder } = useJarvisReminders();

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email" | "push">("push");

  const pendingReminders = reminders.filter(r => r.status === "pending");
  const completedReminders = reminders.filter(r => r.status !== "pending");

  const handleCreate = () => {
    if (!title.trim() || !remindAt) return;
    createReminder.mutate({
      title: title.trim(),
      remind_at: new Date(remindAt).toISOString(),
      channel,
    });
    setFormOpen(false);
    setTitle("");
    setRemindAt("");
    setChannel("push");
  };

  const handleDismiss = (id: string) => {
    dismissReminder.mutate(id);
  };

  const handleMarkAsSent = (id: string) => {
    updateStatus.mutate({ id, status: "sent" });
  };

  const handleCancel = (id: string) => {
    updateStatus.mutate({ id, status: "canceled" });
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este lembrete?")) {
      deleteReminder.mutate(id);
    }
  };

  if (tenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Lembretes</h1>
            <p className="text-sm text-muted-foreground">
              {pendingReminders.length} pendentes
            </p>
          </div>
        </div>

        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Lembrete
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending">
            Pendentes ({pendingReminders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Histórico ({completedReminders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <div className="space-y-3">
            {pendingReminders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhum lembrete pendente</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crie um lembrete para não esquecer nada importante
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingReminders.map(reminder => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onDismiss={handleDismiss}
                  onDelete={handleDelete}
                  onMarkAsSent={handleMarkAsSent}
                  onCancel={handleCancel}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="space-y-3">
            {completedReminders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Nenhum lembrete no histórico</p>
                </CardContent>
              </Card>
            ) : (
              completedReminders.map(reminder => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onDismiss={handleDismiss}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Lembrete</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sobre o que é o lembrete?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remind_at">Data e Hora</Label>
              <Input
                id="remind_at"
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Notificação Push</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim() || !remindAt}>
              Criar Lembrete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default JarvisReminders;
