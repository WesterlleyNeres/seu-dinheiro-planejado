import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import WhatsAppSection from "@/components/jarvis/settings/WhatsAppSection";
import GoogleCalendarSection from "@/components/jarvis/settings/GoogleCalendarSection";
import { 
  Settings, Moon, Users, LogOut, 
  Info, Bell, BellRing, BellOff, Loader2, AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";

const JarvisSettings = () => {
  const { tenant, loading: tenantLoading } = useTenant();
  const { user, signOut } = useAuth();
  
  const {
    isSupported: pushSupported,
    isVapidReady,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification,
  } = usePushSubscription();

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderPushStatus = () => {
    if (!pushSupported) {
      return (
        <Badge variant="outline" className="text-destructive border-destructive">
          <BellOff className="h-3 w-3 mr-1" />
          Não suportado
        </Badge>
      );
    }
    
    if (!isVapidReady) {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Não configurado
        </Badge>
      );
    }
    
    if (pushPermission === "denied") {
      return (
        <Badge variant="outline" className="text-destructive border-destructive">
          <BellOff className="h-3 w-3 mr-1" />
          Bloqueado
        </Badge>
      );
    }
    
    if (pushSubscribed) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <BellRing className="h-3 w-3 mr-1" />
          Ativo
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Bell className="h-3 w-3 mr-1" />
        Desativado
      </Badge>
    );
  };

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

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Receba alertas de lembretes no navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Status</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {!pushSupported 
                  ? "Seu navegador não suporta notificações push"
                  : !isVapidReady
                    ? "Aguardando configuração do servidor"
                    : pushPermission === "denied"
                      ? "Bloqueado nas configurações do navegador"
                      : pushSubscribed
                        ? "Você receberá alertas de lembretes"
                        : "Ative para receber alertas"}
              </p>
            </div>
            {renderPushStatus()}
          </div>
          
          {/* Error message */}
          {pushError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{pushError}</AlertDescription>
            </Alert>
          )}
          
          {/* Not supported alert */}
          {!pushSupported && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Navegador não suportado</AlertTitle>
              <AlertDescription>
                Use Chrome, Firefox, Edge ou Safari para receber notificações push.
              </AlertDescription>
            </Alert>
          )}
          
          {/* VAPID not configured alert */}
          {pushSupported && !isVapidReady && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Configuração pendente</AlertTitle>
              <AlertDescription>
                As chaves VAPID precisam ser configuradas no servidor. Contate o suporte.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Permission denied instructions */}
          {pushSupported && isVapidReady && pushPermission === "denied" && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Permissão bloqueada</AlertTitle>
              <AlertDescription>
                Para ativar, clique no ícone de cadeado na barra de endereço do navegador 
                e permita notificações para este site.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Actions */}
          {pushSupported && isVapidReady && pushPermission !== "denied" && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>{pushSubscribed ? "Notificações ativas" : "Ativar notificações"}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pushSubscribed 
                      ? "Clique para desativar" 
                      : "Clique para ativar alertas de lembretes"}
                  </p>
                </div>
                <Button
                  variant={pushSubscribed ? "destructive" : "default"}
                  size="sm"
                  onClick={() => pushSubscribed ? unsubscribePush() : subscribePush()}
                  disabled={pushLoading}
                >
                  {pushLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : pushSubscribed ? (
                    <>
                      <BellOff className="h-4 w-4 mr-1" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-1" />
                      Ativar
                    </>
                  )}
                </Button>
              </div>
              
              {/* Test notification */}
              {pushSubscribed && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Testar notificação</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Envie uma notificação de teste
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sendTestNotification}
                      disabled={pushLoading}
                    >
                      {pushLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Testar"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Integration */}
      <WhatsAppSection />

      {/* Google Calendar Integration */}
      <GoogleCalendarSection />

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
