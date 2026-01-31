import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, Moon, Sun, Calendar, Users, LogOut } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const JarvisSettings = () => {
  const { tenant, loading: tenantLoading } = useTenant();
  const { user, signOut } = useAuth();

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Personalize seu JARVIS
          </p>
        </div>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Aparência
          </CardTitle>
          <CardDescription>
            Configure a aparência do seu assistente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dark-mode">Modo Escuro</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                JARVIS usa o tema escuro por padrão
              </p>
            </div>
            <Switch id="dark-mode" checked disabled />
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Integrações
          </CardTitle>
          <CardDescription>
            Conecte serviços externos ao JARVIS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Google Calendar</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sincronize seus eventos automaticamente
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Em breve
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>WhatsApp</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receba lembretes via WhatsApp
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Em breve
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workspace */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Espaço de Trabalho
          </CardTitle>
          <CardDescription>
            Gerencie seu espaço e membros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Nome do Espaço</Label>
              <p className="text-sm text-foreground mt-0.5">
                {tenant?.name || "Meu Espaço JARVIS"}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Membros</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Convide pessoas para compartilhar tarefas e eventos
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Em breve
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conta</CardTitle>
          <CardDescription>
            Informações da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>E-mail</Label>
            <p className="text-sm text-foreground mt-0.5">
              {user?.email}
            </p>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Módulo de Finanças</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Acesse suas finanças no FRACTTO FLOW
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                Ir para Finanças
              </Link>
            </Button>
          </div>
          <Separator />
          <Button variant="destructive" onClick={signOut} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sair da Conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default JarvisSettings;
