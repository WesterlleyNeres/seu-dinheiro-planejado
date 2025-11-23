import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { toast } from 'sonner';
import { Bell, Mail, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const AlertSettings = () => {
  const { settings, loading, updateSettings, sendTestAlert } = useAlertSettings();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleToggleEmail = async (enabled: boolean) => {
    try {
      await updateSettings({ email_enabled: enabled });
      toast.success(enabled ? 'Alertas por email ativados' : 'Alertas por email desativados');
    } catch (error) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleTimeChange = async (time: string) => {
    try {
      await updateSettings({ alert_time: time });
      toast.success('Horário atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar horário');
    }
  };

  const handleAlertTypeToggle = async (type: keyof typeof settings.alert_types, enabled: boolean) => {
    try {
      await updateSettings({
        alert_types: {
          ...settings.alert_types,
          [type]: enabled,
        },
      });
      toast.success('Preferências atualizadas');
    } catch (error) {
      toast.error('Erro ao atualizar preferências');
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      await sendTestAlert();
      toast.success('Email de teste enviado! Verifique sua caixa de entrada.');
    } catch (error) {
      toast.error('Erro ao enviar email de teste');
    } finally {
      setIsSendingTest(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Alertas e Notificações</CardTitle>
        </div>
        <CardDescription>
          Configure como e quando você deseja receber alertas sobre sua situação financeira
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="email-enabled">Receber alertas por email</Label>
          </div>
          <Switch
            id="email-enabled"
            checked={settings.email_enabled}
            onCheckedChange={handleToggleEmail}
          />
        </div>

        {settings.email_enabled && (
          <>
            {/* Time Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="alert-time">Horário do envio diário</Label>
              </div>
              <Select value={settings.alert_time} onValueChange={handleTimeChange}>
                <SelectTrigger id="alert-time" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="06:00">06:00</SelectItem>
                  <SelectItem value="07:00">07:00</SelectItem>
                  <SelectItem value="07:30">07:30</SelectItem>
                  <SelectItem value="08:00">08:00</SelectItem>
                  <SelectItem value="09:00">09:00</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alert Types */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Tipos de Alertas</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="upcoming-bills" className="font-normal">
                    Vencimentos próximos (7, 15, 30 dias)
                  </Label>
                  <Switch
                    id="upcoming-bills"
                    checked={settings.alert_types.upcoming_bills}
                    onCheckedChange={(checked) => handleAlertTypeToggle('upcoming_bills', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="budget-alerts" className="font-normal">
                    Orçamentos excedendo 80%
                  </Label>
                  <Switch
                    id="budget-alerts"
                    checked={settings.alert_types.budget_alerts}
                    onCheckedChange={(checked) => handleAlertTypeToggle('budget_alerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="statement-alerts" className="font-normal">
                    Faturas de cartão próximas
                  </Label>
                  <Switch
                    id="statement-alerts"
                    checked={settings.alert_types.statement_alerts}
                    onCheckedChange={(checked) => handleAlertTypeToggle('statement_alerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="goal-alerts" className="font-normal">
                    Metas próximas ao prazo
                  </Label>
                  <Switch
                    id="goal-alerts"
                    checked={settings.alert_types.goal_alerts}
                    onCheckedChange={(checked) => handleAlertTypeToggle('goal_alerts', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Test Button */}
            <Button
              onClick={handleSendTest}
              disabled={isSendingTest}
              variant="outline"
              className="w-full"
            >
              {isSendingTest ? 'Enviando...' : 'Enviar Email de Teste'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
