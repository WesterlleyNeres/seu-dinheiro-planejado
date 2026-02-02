import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useGoogleIntegration } from "@/hooks/useGoogleIntegration";
import { 
  Calendar as CalendarIcon, 
  Link2, 
  Unlink, 
  Loader2, 
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

const GoogleCalendarSection = () => {
  const { 
    isLoading,
    isConnected, 
    isSyncing,
    connectedEmail,
    lastSyncLabel,
    initiateConnection,
    disconnect,
    triggerSync,
  } = useGoogleIntegration();

  const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
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
        {/* Google Calendar */}
        <div className="flex flex-col gap-3 p-3 rounded-lg border bg-card">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="font-medium">Google Calendar</Label>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    isConnected 
                      ? "border-green-500 text-green-600 dark:text-green-400" 
                      : "border-muted text-muted-foreground"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : isConnected ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : null}
                  {isConnected ? "Conectado" : "Desconectado"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isConnected && connectedEmail
                  ? `Sincronizado com ${connectedEmail}`
                  : "Sincronize seus eventos automaticamente"}
              </p>
            </div>
          </div>

          {/* Connection status details */}
          {isConnected && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {lastSyncLabel 
                      ? `Última sincronização: ${lastSyncLabel}` 
                      : "Nunca sincronizado"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={triggerSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    )}
                    Sincronizar
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => disconnect.mutate()}
                    disabled={disconnect.isPending}
                  >
                    {disconnect.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Unlink className="h-3.5 w-3.5 mr-1" />
                        Desconectar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Connect button for disconnected state */}
          {!isConnected && !isLoading && (
            <>
              {!hasClientId ? (
                <Alert className="bg-yellow-500/10 border-yellow-500/30">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-sm">Configuração pendente</AlertTitle>
                  <AlertDescription className="text-xs">
                    Configure VITE_GOOGLE_CLIENT_ID no arquivo .env para ativar a conexão.
                  </AlertDescription>
                </Alert>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => initiateConnection.mutate()}
                  disabled={initiateConnection.isPending}
                >
                  {initiateConnection.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Conectar Google Calendar
                </Button>
              )}
            </>
          )}
        </div>

        <Separator />

        {/* WhatsApp (placeholder - já tem seção própria) */}
        <div className="flex items-center justify-between">
          <div>
            <Label>WhatsApp</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure seu telefone para receber lembretes
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Seção abaixo
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarSection;
