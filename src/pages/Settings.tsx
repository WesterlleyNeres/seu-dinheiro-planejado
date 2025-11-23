import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetModeToggle } from '@/components/settings/BudgetModeToggle';
import { useUserSettings, BudgetMode } from '@/hooks/useUserSettings';
import { Separator } from '@/components/ui/separator';

const Settings = () => {
  const { settings, loading, updateSettings } = useUserSettings();

  const handleBudgetModeChange = async (mode: BudgetMode) => {
    await updateSettings({ budget_mode: mode });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          {settings && (
            <BudgetModeToggle
              value={settings.budget_mode}
              onChange={handleBudgetModeChange}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre o Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Versão</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sistema</span>
            <span className="font-medium">Seu Dinheiro Planejado</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
