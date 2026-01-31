

# Plano: Implementar Configuracoes > Integracoes (Google Calendar)

## Visao Geral

Transformar a secao de Integracoes na pagina de Configuracoes do JARVIS para mostrar o status de conexao com o Google Calendar, incluindo um hook para gerenciar os dados da tabela `ff_integrations_google` e uma UI preparada para OAuth futuro.

---

## Estado Atual vs Novo

| Aspecto | Atual | Novo |
|---------|-------|------|
| Botao Google Calendar | Desabilitado ("Em breve") | Funcional ("Conectar" / "Desconectar") |
| Status de conexao | Nenhum | Badge Conectado/Desconectado |
| Storage | Tabela existe, nao usada | Hook busca/cria entradas |
| Placeholder OAuth | Nenhum | Alert informativo |

---

## Arquitetura da Solucao

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         CARD INTEGRACOES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │   [Info Icon]  OAuth sera ativado na proxima sprint.            │    │
│  │                Abaixo esta a estrutura preparada.               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  [G] Google Calendar                         [Desconectado]     │    │
│  │      Sincronize seus eventos automaticamente                    │    │
│  │                                             [Conectar (Em breve)]│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ---- Separador ----                                                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  [WA] WhatsApp                                                   │    │
│  │      Receba lembretes via WhatsApp             [Em breve]       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Parte 1: Adicionar Tipo GoogleIntegration

### Modificar: `src/types/jarvis.ts`

```typescript
export interface GoogleIntegration {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expiry: string | null;
  scope: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## Parte 2: Criar Hook useGoogleIntegration

### Novo arquivo: `src/hooks/useGoogleIntegration.ts`

O hook gerencia o estado de conexao com Google Calendar:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { GoogleIntegration } from "@/types/jarvis";

export const useGoogleIntegration = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["google-integration", tenantId, user?.id];

  // Buscar integracao existente
  const { data: integration, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId || !user) return null;
      
      const { data, error } = await supabase
        .from("ff_integrations_google")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as GoogleIntegration | null;
    },
    enabled: !!tenantId && !!user,
  });

  // Status derivado
  const isConnected = !!integration?.access_token;
  
  // Placeholder: Iniciar conexao (sera OAuth real no futuro)
  const initiateConnection = useMutation({
    mutationFn: async () => {
      // Por enquanto, apenas mostra toast informativo
      throw new Error("OAuth ainda nao implementado");
    },
    onError: () => {
      toast({ 
        title: "Em desenvolvimento", 
        description: "A conexao com Google Calendar sera ativada em breve.",
      });
    },
  });

  // Desconectar (limpar tokens)
  const disconnect = useMutation({
    mutationFn: async () => {
      if (!integration) throw new Error("Nenhuma integracao encontrada");
      
      const { error } = await supabase
        .from("ff_integrations_google")
        .update({
          access_token: null,
          refresh_token: null,
          expiry: null,
          email: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Google Calendar desconectado" });
    },
    onError: (error) => {
      toast({ title: "Erro ao desconectar", description: error.message, variant: "destructive" });
    },
  });

  return {
    integration,
    isLoading,
    isConnected,
    initiateConnection,
    disconnect,
    // Informacoes extras para UI
    connectedEmail: integration?.email || null,
  };
};
```

---

## Parte 3: Reestruturar JarvisSettings - Secao Integracoes

### Modificar: `src/pages/JarvisSettings.tsx`

Nova estrutura da secao de Integracoes:

```typescript
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Calendar as CalendarIcon, Link, Unlink } from "lucide-react";
import { useGoogleIntegration } from "@/hooks/useGoogleIntegration";

// Dentro do componente:
const { 
  isLoading: googleLoading, 
  isConnected: googleConnected, 
  connectedEmail,
  initiateConnection,
  disconnect
} = useGoogleIntegration();

// Nova secao de integracoes:
<Card>
  <CardHeader>
    <CardTitle className="text-base flex items-center gap-2">
      <Link className="h-4 w-4" />
      Integracoes
    </CardTitle>
    <CardDescription>
      Conecte servicos externos ao JARVIS
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Placeholder Alert */}
    <Alert className="bg-muted/50 border-dashed">
      <Info className="h-4 w-4" />
      <AlertTitle className="text-sm">Em desenvolvimento</AlertTitle>
      <AlertDescription className="text-xs">
        OAuth sera ativado na proxima sprint. A estrutura abaixo esta preparada.
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
                ? "border-success text-success" 
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
        disabled={googleLoading}
        onClick={() => {
          if (googleConnected) {
            disconnect.mutate();
          } else {
            initiateConnection.mutate();
          }
        }}
      >
        {googleConnected ? (
          <>
            <Unlink className="h-3.5 w-3.5 mr-1" />
            Desconectar
          </>
        ) : (
          <>
            <Link className="h-3.5 w-3.5 mr-1" />
            Conectar
          </>
        )}
      </Button>
    </div>

    <Separator />

    {/* WhatsApp (mantido como placeholder) */}
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
```

---

## Resumo de Arquivos

### Criar (1 arquivo)

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useGoogleIntegration.ts` | Hook para gerenciar conexao Google |

### Modificar (2 arquivos)

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/jarvis.ts` | Adicionar interface GoogleIntegration |
| `src/pages/JarvisSettings.tsx` | Nova UI de integracoes com status |

---

## Estrutura da Tabela (Ja Existente)

A tabela `ff_integrations_google` ja existe com os campos:

| Campo | Tipo | Uso |
|-------|------|-----|
| id | uuid | PK |
| tenant_id | uuid | FK para tenants |
| user_id | uuid | ID do usuario |
| email | text | Email da conta Google conectada |
| access_token | text | Token de acesso (OAuth) |
| refresh_token | text | Token de refresh (OAuth) |
| expiry | timestamptz | Expiracao do token |
| scope | text | Escopos autorizados |
| created_at | timestamptz | Criacao |
| updated_at | timestamptz | Atualizacao |

---

## Estados da UI

| Estado | Badge | Botao | Descricao |
|--------|-------|-------|-----------|
| Desconectado | "Desconectado" (cinza) | "Conectar" (outline) | Sem tokens |
| Conectando | - | Disabled + Loader | Durante OAuth (futuro) |
| Conectado | "Conectado" (verde) | "Desconectar" (destructive) | access_token presente |
| Email visivel | - | - | Mostra email@exemplo.com |

---

## Fluxo de Conexao (Preparado para OAuth)

```text
1. Usuario clica "Conectar"
2. Toast: "OAuth sera ativado na proxima sprint"
3. [FUTURO] Redireciona para Google OAuth
4. [FUTURO] Callback salva tokens em ff_integrations_google
5. [FUTURO] UI atualiza para "Conectado"
```

---

## Fluxo de Desconexao

```text
1. Usuario clica "Desconectar"
2. Hook limpa access_token, refresh_token, email
3. Query invalida e refetch
4. UI atualiza para "Desconectado"
5. Toast: "Google Calendar desconectado"
```

---

## Seguranca

- Tokens armazenados na tabela com RLS por tenant_id e user_id
- Apenas o proprio usuario pode ver/modificar sua integracao
- Desconexao remove tokens completamente

