
# Plano de Implementacao - Melhorias UX para JARVIS

## Resumo Geral

Este plano aborda quatro areas principais de melhorias:
1. **Fluxo "Nova Memoria"** - Modal ultra-rapido com Smart Kind
2. **Tags em Tarefas** - Sugestoes e melhor UX
3. **Exibicao de Streak** - Badge com tooltip
4. **Notificacoes Push** - Service Worker + Edge Function para lembretes

---

## Parte 1: Modal "Nova Memoria" Ultra-Rapido

### Arquivos a Modificar
| Arquivo | Acao |
|---------|------|
| `src/components/jarvis/MemoryForm.tsx` | Adicionar Smart Kind + otimizacoes UX |
| `src/hooks/useJarvisMemory.ts` | Adicionar optimistic update para insert no topo |

### Implementacao - MemoryForm.tsx

O modal atual ja funciona, mas precisa de:

**Smart Kind (Sugestao Automatica)**:
```typescript
const suggestKind = (text: string): string => {
  const lower = text.toLowerCase();
  
  // Preference patterns
  if (lower.includes("prefiro") || lower.includes("gosto de") || lower.includes("nao gosto")) {
    return "preference";
  }
  // Decision patterns
  if (lower.includes("decidi") || lower.includes("vou fazer") || lower.includes("escolhi")) {
    return "decision";
  }
  // Project patterns
  if (lower.includes("projeto") || lower.includes("plano") || lower.includes("meta")) {
    return "project";
  }
  // Profile patterns
  if (lower.includes("meu nome") || lower.includes("eu sou") || lower.includes("trabalho como")) {
    return "profile";
  }
  // Message patterns
  if (lower.includes("mensagem") || lower.includes("disse") || lower.includes("falou")) {
    return "message";
  }
  
  return "note"; // default
};
```

**Debounce para sugestao** (500ms apos parar de digitar):
```typescript
useEffect(() => {
  if (!content.trim() || userOverrodeKind) return;
  
  const timer = setTimeout(() => {
    const suggested = suggestKind(content);
    if (suggested !== kind) {
      setKind(suggested);
      setSuggestedKind(suggested);
    }
  }, 500);
  
  return () => clearTimeout(timer);
}, [content]);
```

**UI com indicador de sugestao**:
```tsx
<div className="space-y-2">
  <Label htmlFor="kind" className="flex items-center gap-2">
    Tipo
    {suggestedKind && !userOverrodeKind && (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 mr-1" />
        Sugerido
      </Badge>
    )}
  </Label>
  <Select 
    value={kind} 
    onValueChange={(v) => { setKind(v); setUserOverrodeKind(true); }}
  >
    ...
  </Select>
</div>
```

### Implementacao - useJarvisMemory.ts (Optimistic Update)

```typescript
const createMemoryItem = useMutation({
  mutationFn: async (input: CreateMemoryInput) => {
    // ... existing code
  },
  // Optimistic update para inserir no topo instantaneamente
  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey });
    
    const previousItems = queryClient.getQueryData<JarvisMemoryItem[]>(queryKey);
    
    // Criar item temporario
    const optimisticItem: JarvisMemoryItem = {
      id: `temp-${Date.now()}`,
      tenant_id: tenantId!,
      user_id: user!.id,
      kind: input.kind,
      title: input.title || null,
      content: input.content,
      metadata: (input.metadata || {}) as Record<string, unknown>,
      source: input.source || "manual",
      created_at: new Date().toISOString(),
    };
    
    queryClient.setQueryData<JarvisMemoryItem[]>(queryKey, (old) => 
      [optimisticItem, ...(old || [])]
    );
    
    return { previousItems };
  },
  onError: (err, input, context) => {
    queryClient.setQueryData(queryKey, context?.previousItems);
    toast({ title: "Erro ao salvar memoria", variant: "destructive" });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey });
  },
  onSuccess: () => {
    toast({ title: "Memoria salva!" });
  },
});
```

---

## Parte 2: UX de Tags em Tarefas

### Arquivos a Modificar
| Arquivo | Acao |
|---------|------|
| `src/components/jarvis/TaskForm.tsx` | Adicionar campo de tags com sugestoes |
| `src/components/jarvis/TaskFilters.tsx` | Melhorar empty state quando nao ha tags |

### Sugestoes de Tags Default

```typescript
const SUGGESTED_TAGS = [
  "trabalho",
  "pessoal", 
  "casa",
  "saude",
  "urgente",
  "dinheiro",
  "familia",
  "estudos",
];
```

### TaskForm.tsx - Adicionar Campo de Tags

Adicionar no schema zod:
```typescript
const taskFormSchema = z.object({
  // ... existing fields
  tags: z.array(z.string()).optional().default([]),
});
```

Novo campo no formulario:
```tsx
<div className="space-y-2">
  <Label>Tags</Label>
  <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
    {/* Tags selecionadas */}
    {selectedTags.map(tag => (
      <Badge key={tag} variant="secondary" className="gap-1">
        {tag}
        <button onClick={() => removeTag(tag)}>
          <X className="h-3 w-3" />
        </button>
      </Badge>
    ))}
    
    {/* Input para adicionar */}
    <Input
      placeholder="Adicionar tag..."
      className="w-24 h-6 text-xs border-none p-1"
      onKeyDown={handleAddTag}
    />
  </div>
  
  {/* Sugestoes (chips clicaveis) */}
  {showSuggestions && (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <span className="text-xs text-muted-foreground mr-1">Sugestoes:</span>
      {availableSuggestions.map(tag => (
        <Badge 
          key={tag} 
          variant="outline" 
          className="cursor-pointer hover:bg-primary/10"
          onClick={() => addTag(tag)}
        >
          <Plus className="h-3 w-3 mr-0.5" />
          {tag}
        </Badge>
      ))}
    </div>
  )}
</div>
```

Logica para mostrar sugestoes:
```typescript
// Combinar tags existentes do tenant + sugestoes padrao
const availableSuggestions = useMemo(() => {
  const combined = [...new Set([...allTags, ...SUGGESTED_TAGS])];
  return combined.filter(tag => !selectedTags.includes(tag)).slice(0, 8);
}, [allTags, selectedTags]);
```

### TaskFilters.tsx - Melhorar Empty State

Quando nao houver tags no tenant:
```tsx
{availableTags.length === 0 ? (
  <div className="p-4 text-center">
    <p className="text-sm text-muted-foreground mb-3">
      Nenhuma tag criada ainda
    </p>
    <p className="text-xs text-muted-foreground">
      Sugestoes para comecar:
    </p>
    <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
      {SUGGESTED_TAGS.slice(0, 5).map(tag => (
        <Badge key={tag} variant="outline" className="text-xs">
          {tag}
        </Badge>
      ))}
    </div>
  </div>
) : (
  // Lista normal de tags existentes
)}
```

---

## Parte 3: Exibicao de Streak com Tooltip

### Arquivos a Modificar
| Arquivo | Acao |
|---------|------|
| `src/components/jarvis/HabitCardNectar.tsx` | Adicionar Tooltip ao streak |

### Implementacao

Importar componentes de Tooltip:
```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

Atualizar secao de streak:
```tsx
{streak > 0 && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-warning/10 cursor-help">
          <Flame className="h-3.5 w-3.5 text-warning" />
          <span className="text-xs text-warning font-medium">
            {streak} {getStreakLabel(habit.cadence, streak)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <p className="text-xs">
          {getStreakTooltip(habit.cadence)}
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

Helpers para labels:
```typescript
const getStreakLabel = (cadence: string, streak: number) => {
  if (cadence === "daily") return streak === 1 ? "dia" : "dias seguidos";
  if (cadence === "weekly") return streak === 1 ? "semana" : "semanas seguidas";
  return streak === 1 ? "mes" : "meses seguidos";
};

const getStreakTooltip = (cadence: string) => {
  if (cadence === "daily") return "Dias consecutivos com pelo menos 1 registro";
  if (cadence === "weekly") return "Semanas consecutivas com a meta atingida";
  return "Meses consecutivos com a meta atingida";
};
```

### Atualizar Streak Apos Registro (Optimistic)

No `useJarvisHabits.ts`, o `logHabit` ja faz invalidateQueries. Para atualizar o streak sem refresh, o recalculo automatico ja acontece porque os dados de logs sao refetched.

Adicionar recalculo instantaneo no optimistic update:
```typescript
onMutate: async ({ habitId }) => {
  await queryClient.cancelQueries({ queryKey: logsQueryKey });
  
  const previousLogs = queryClient.getQueryData<JarvisHabitLog[]>(logsQueryKey);
  
  const optimisticLog: JarvisHabitLog = {
    id: `temp-${Date.now()}`,
    tenant_id: tenantId!,
    habit_id: habitId,
    user_id: user!.id,
    log_date: format(new Date(), "yyyy-MM-dd"),
    value: 1,
    created_at: new Date().toISOString(),
  };
  
  queryClient.setQueryData<JarvisHabitLog[]>(logsQueryKey, (old) =>
    [optimisticLog, ...(old || [])]
  );
  
  return { previousLogs };
},
```

---

## Parte 4: Notificacoes Push para Lembretes

### Arquivos a Criar/Modificar
| Arquivo | Acao |
|---------|------|
| `public/sw.js` | Criar Service Worker |
| `public/manifest.json` | Criar manifest para PWA |
| `src/hooks/usePushNotifications.ts` | Criar hook de notificacoes |
| `src/pages/JarvisSettings.tsx` | Adicionar UI de notificacoes |
| `supabase/functions/process-reminders/index.ts` | Edge Function para processar lembretes |
| `index.html` | Adicionar link do manifest |
| `supabase/config.toml` | Registrar nova Edge Function |

### 4.1 - Service Worker (`public/sw.js`)

```javascript
// Service Worker para notificacoes push
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Voce tem um lembrete',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/jarvis/reminders',
      reminderId: data.reminderId,
    },
    actions: [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
    tag: data.reminderId || 'jarvis-reminder',
    renotify: true,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'JARVIS Lembrete', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/jarvis/reminders')
    );
  }
});
```

### 4.2 - Manifest (`public/manifest.json`)

```json
{
  "name": "FRACTTO FLOW",
  "short_name": "JARVIS",
  "description": "Assistente pessoal JARVIS",
  "start_url": "/jarvis",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/favicon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

### 4.3 - Hook `usePushNotifications.ts`

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const usePushNotifications = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);

  // Verificar suporte
  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Registrar Service Worker
  useEffect(() => {
    if (!isSupported) return;
    
    navigator.serviceWorker.register("/sw.js").then(registration => {
      console.log("SW registrado:", registration);
    }).catch(err => {
      console.error("Erro ao registrar SW:", err);
    });
  }, [isSupported]);

  // Solicitar permissao
  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast({ title: "Notificacoes ativadas!" });
        setIsSubscribed(true);
        return true;
      } else {
        toast({ 
          title: "Permissao negada", 
          description: "Ative nas configuracoes do navegador",
          variant: "destructive" 
        });
        return false;
      }
    } catch (err) {
      console.error("Erro ao solicitar permissao:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, toast]);

  // Testar notificacao local
  const sendTestNotification = useCallback(() => {
    if (permission !== "granted") return;
    
    new Notification("Teste JARVIS", {
      body: "Suas notificacoes estao funcionando!",
      icon: "/favicon.svg",
    });
    
    toast({ title: "Notificacao de teste enviada!" });
  }, [permission, toast]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    requestPermission,
    sendTestNotification,
  };
};
```

### 4.4 - UI em JarvisSettings.tsx

Adicionar nova secao de notificacoes:
```tsx
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellRing, BellOff } from "lucide-react";

// Dentro do componente:
const {
  isSupported,
  permission,
  isLoading: notifLoading,
  requestPermission,
  sendTestNotification,
} = usePushNotifications();

// Nova Card apos Integrações:
<Card>
  <CardHeader>
    <CardTitle className="text-base flex items-center gap-2">
      <Bell className="h-4 w-4" />
      Notificacoes
    </CardTitle>
    <CardDescription>
      Receba alertas de lembretes no navegador
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {!isSupported ? (
      <Alert variant="destructive">
        <AlertDescription>
          Seu navegador nao suporta notificacoes push.
        </AlertDescription>
      </Alert>
    ) : (
      <>
        <div className="flex items-center justify-between">
          <div>
            <Label>Notificacoes Push</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {permission === "granted" 
                ? "Ativadas - voce recebera alertas"
                : permission === "denied"
                  ? "Bloqueadas - ative nas config. do navegador"
                  : "Desativadas"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {permission === "granted" ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <BellRing className="h-3 w-3 mr-1" />
                Ativas
              </Badge>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={requestPermission}
                disabled={notifLoading || permission === "denied"}
              >
                {notifLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ativar"}
              </Button>
            )}
          </div>
        </div>
        
        {permission === "granted" && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Testar Notificacao</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Envie uma notificacao de teste
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
```

### 4.5 - Edge Function `process-reminders`

Criar `supabase/functions/process-reminders/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const now = new Date().toISOString();
    
    // Buscar lembretes pendentes que ja passaram
    const { data: reminders, error } = await supabase
      .from("ff_reminders")
      .select("*")
      .eq("status", "pending")
      .eq("channel", "push")
      .lte("remind_at", now)
      .limit(100);
    
    if (error) throw error;
    
    console.log(`Encontrados ${reminders?.length || 0} lembretes para processar`);
    
    const processed: string[] = [];
    
    for (const reminder of reminders || []) {
      // Marcar como enviado
      await supabase
        .from("ff_reminders")
        .update({ 
          status: "sent", 
          updated_at: now 
        })
        .eq("id", reminder.id);
      
      processed.push(reminder.id);
      
      // Nota: Push real via Web Push API requer VAPID keys
      // Por ora, apenas marcamos como sent
      console.log(`Lembrete processado: ${reminder.title}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processed.length,
        ids: processed 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 4.6 - Atualizar index.html

Adicionar link do manifest no `<head>`:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#3b82f6" />
```

### 4.7 - Atualizar supabase/config.toml

```toml
[functions.process-reminders]
verify_jwt = false
```

---

## Fluxo de Notificacoes Push

```text
Usuario ativa notificacoes (JarvisSettings)
                ↓
Navegador solicita permissao
                ↓
Service Worker registrado
                ↓
           [Cron Job]
     process-reminders (a cada 5min)
                ↓
Busca ff_reminders: status=pending, remind_at <= now()
                ↓
Marca como "sent" + dispara push (quando implementado VAPID)
                ↓
Usuario recebe notificacao no navegador
```

---

## Entregaveis Finais

| Area | Arquivos |
|------|----------|
| **Memoria** | `MemoryForm.tsx`, `useJarvisMemory.ts` |
| **Tags** | `TaskForm.tsx`, `TaskFilters.tsx` |
| **Streak** | `HabitCardNectar.tsx` |
| **Push** | `public/sw.js`, `public/manifest.json`, `usePushNotifications.ts`, `JarvisSettings.tsx`, `process-reminders/index.ts`, `index.html`, `config.toml` |

---

## Observacoes Importantes

1. **Smart Kind**: Sugestao simples baseada em palavras-chave. Para IA real, seria necessario usar Lovable AI Gateway.

2. **Push Notifications**: A implementacao completa de Web Push requer:
   - Geracao de VAPID keys
   - Armazenamento de subscriptions por usuario
   - Servidor de push (ou servico como OneSignal)
   
   A versao atual configura a infraestrutura e permite notificacoes locais de teste.

3. **Cron para process-reminders**: Apos deploy, configurar cron via Supabase Dashboard para rodar a cada 5 minutos.

4. **Optimistic Updates**: Garantem UX instantanea sem aguardar resposta do servidor.
