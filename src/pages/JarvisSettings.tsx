import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleIntegration } from "@/hooks/useGoogleIntegration";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { 
  Settings, Moon, Calendar as CalendarIcon, Users, LogOut, 
  Info, Link2, Unlink, Bell, BellRing, Loader2 
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const JarvisSettings = () => {
  const { tenant, loading: tenantLoading } = useTenant();
  const { user, signOut } = useAuth();
  const { 
    isLoading: googleLoading, 
    isConnected: googleConnected, 
    connectedEmail,
    initiateConnection,
    disconnect
  } = useGoogleIntegration();
  
  const {
    isSupported: notifSupported,
    permission: notifPermission,
    isLoading: notifLoading,
    requestPermission,
    sendTestNotification,
  } = usePushNotifications();

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

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </CardTitle>
          <CardDescription>
            Receba alertas de lembretes no navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!notifSupported ? (
            <Alert variant="destructive">
              <AlertDescription>
                Seu navegador não suporta notificações push.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificações Push</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {notifPermission === "granted" 
                      ? "Ativadas - você receberá alertas"
                      : notifPermission === "denied"
                        ? "Bloqueadas - ative nas config. do navegador"
                        : "Desativadas"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {notifPermission === "granted" ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <BellRing className="h-3 w-3 mr-1" />
                      Ativas
                    </Badge>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={requestPermission}
                      disabled={notifLoading || notifPermission === "denied"}
                    >
                      {notifLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Ativar"
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              {notifPermission === "granted" && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Testar Notificação</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Envie uma notificação de teste
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={sendTestNotification}>
                      Testar
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Integrações
          </CardTitle>
          <CardDescription>
            Conecte serviços externos ao JARVIS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Placeholder Alert */}
          <Alert className="bg-muted/50 border-dashed">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-sm">Em desenvolvimento</AlertTitle>
            <AlertDescription className="text-xs">
              OAuth será ativado na próxima sprint. A estrutura abaixo está preparada.
            </AlertDescription>
          </Alert>
          
          {/* Google Calendar */}
          <div className="flex items-start gap-4 p-3 rounded-lg border bg-card">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Label className="font-medium">Google Calendar</Label>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    googleConnected 
                      ? "border-green-500 text-green-600 dark:text-green-400" 
                      : "border-muted text-muted-foreground"
                  )}
                >
                  {googleConnected ? "Conectado" : "Desconectado"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {googleConnected && connectedEmail
                  ? `Sincronizado com ${connectedEmail}`
                  : "Sincronize seus eventos automaticamente"}
              </p>
            </div>
            <Button 
              variant={googleConnected ? "destructive" : "outline"} 
              size="sm"
              disabled={googleLoading || initiateConnection.isPending || disconnect.isPending}
              onClick={() => {
                if (googleConnected) {
                  disconnect.mutate();
                } else {
                  initiateConnection.mutate();
                }
              }}
            >
              {(googleLoading || initiateConnection.isPending || disconnect.isPending) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : googleConnected ? (
                <>
                  <Unlink className="h-3.5 w-3.5 mr-1" />
                  Desconectar
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5 mr-1" />
                  Conectar
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* WhatsApp (placeholder) */}
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
