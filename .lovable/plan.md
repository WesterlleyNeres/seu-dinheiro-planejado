
# Plano de Implementacao - Integracao WhatsApp via n8n

## Resumo

Implementar vinculacao de telefone no app e duas Edge Functions para receber comandos do WhatsApp (via n8n) e criar itens nas tabelas existentes do JARVIS (tasks, reminders, events, habits, memory) e transacoes financeiras.

---

## Parte 1: Banco de Dados

### Nova Tabela: ff_user_phones

```sql
CREATE TABLE public.ff_user_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  phone_e164 text NOT NULL,
  verified_at timestamptz NULL,
  verification_code text NULL,
  verification_expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT ff_user_phones_phone_unique UNIQUE (phone_e164)
);

-- Indexes
CREATE INDEX idx_ff_user_phones_tenant_user ON public.ff_user_phones(tenant_id, user_id);
CREATE INDEX idx_ff_user_phones_phone ON public.ff_user_phones(phone_e164);

-- Trigger updated_at
CREATE TRIGGER set_ff_user_phones_updated_at
  BEFORE UPDATE ON public.ff_user_phones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.ff_user_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phones"
  ON public.ff_user_phones FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own phones in their tenants"
  ON public.ff_user_phones FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own phones"
  ON public.ff_user_phones FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own phones"
  ON public.ff_user_phones FOR DELETE
  USING (user_id = auth.uid());
```

---

## Parte 2: Frontend - UI de Telefone

### Arquivos a Modificar/Criar

| Arquivo | Acao |
|---------|------|
| `src/hooks/useUserPhone.ts` | Novo hook para CRUD do telefone |
| `src/pages/JarvisSettings.tsx` | Adicionar secao de WhatsApp na Card "Conta" |
| `src/lib/masks.ts` | Adicionar funcao para formatar E.164 |

### Hook useUserPhone.ts

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UserPhone {
  id: string;
  tenant_id: string;
  user_id: string;
  phone_e164: string;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserPhone = () => {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const queryKey = ["user-phone", tenantId, user?.id];
  
  // Buscar telefone atual
  const { data: phone, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId || !user) return null;
      
      const { data, error } = await supabase
        .from("ff_user_phones")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserPhone | null;
    },
    enabled: !!tenantId && !!user,
  });
  
  // Salvar/atualizar telefone
  const savePhone = useMutation({
    mutationFn: async (phoneE164: string) => {
      if (!tenantId || !user) throw new Error("Not authenticated");
      
      // Upsert baseado no user_id + tenant_id
      const { data, error } = await supabase
        .from("ff_user_phones")
        .upsert({
          tenant_id: tenantId,
          user_id: user.id,
          phone_e164: phoneE164,
          verified_at: null, // Reset verificacao ao mudar numero
        }, {
          onConflict: "phone_e164",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Telefone salvo!" });
    },
    onError: (err) => {
      toast({ 
        title: "Erro ao salvar telefone", 
        description: err.message,
        variant: "destructive" 
      });
    },
  });
  
  // Remover telefone
  const removePhone = useMutation({
    mutationFn: async () => {
      if (!phone) throw new Error("No phone to remove");
      
      const { error } = await supabase
        .from("ff_user_phones")
        .delete()
        .eq("id", phone.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Telefone removido" });
    },
  });
  
  return {
    phone,
    isLoading,
    isVerified: !!phone?.verified_at,
    savePhone,
    removePhone,
  };
};
```

### UI em JarvisSettings.tsx

Adicionar nova secao WhatsApp na Card "Conta":

```tsx
// Imports adicionais
import { Phone, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUserPhone } from "@/hooks/useUserPhone";
import { useState, useEffect } from "react";

// Dentro do componente:
const { phone, isLoading: phoneLoading, isVerified, savePhone, removePhone } = useUserPhone();
const [phoneInput, setPhoneInput] = useState("");
const [isEditing, setIsEditing] = useState(false);

useEffect(() => {
  if (phone?.phone_e164) {
    setPhoneInput(phone.phone_e164);
  }
}, [phone]);

// Formatar para E.164
const formatToE164 = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55")) return `+${digits}`;
  if (digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
};

const handleSavePhone = () => {
  const e164 = formatToE164(phoneInput);
  if (e164.length >= 13) {
    savePhone.mutate(e164);
    setIsEditing(false);
  }
};

// Nova Card WhatsApp (apos Push Notifications):
<Card>
  <CardHeader>
    <CardTitle className="text-base flex items-center gap-2">
      <MessageSquare className="h-4 w-4" />
      WhatsApp
    </CardTitle>
    <CardDescription>
      Vincule seu WhatsApp para criar tarefas por mensagem
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Status */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Status</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          {!phone 
            ? "Nenhum telefone vinculado"
            : isVerified
              ? "Telefone verificado e ativo"
              : "Aguardando verificacao via WhatsApp"}
        </p>
      </div>
      <Badge 
        variant="outline" 
        className={cn(
          isVerified 
            ? "text-green-600 border-green-600" 
            : phone 
              ? "text-yellow-600 border-yellow-600"
              : "text-muted-foreground"
        )}
      >
        {isVerified ? (
          <>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verificado
          </>
        ) : phone ? (
          <>
            <Phone className="h-3 w-3 mr-1" />
            Pendente
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 mr-1" />
            Nao vinculado
          </>
        )}
      </Badge>
    </div>
    
    <Separator />
    
    {/* Campo de telefone */}
    <div className="space-y-2">
      <Label htmlFor="phone">Telefone (WhatsApp)</Label>
      <div className="flex gap-2">
        <Input
          id="phone"
          placeholder="+55 11 99999-9999"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          disabled={!isEditing && !!phone}
          className="flex-1"
        />
        {!phone || isEditing ? (
          <Button 
            size="sm" 
            onClick={handleSavePhone}
            disabled={savePhone.isPending || phoneInput.length < 10}
          >
            {savePhone.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Salvar"
            )}
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditing(true)}
          >
            Editar
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Formato: +55 DDD Numero (ex: +5511999999999)
      </p>
    </div>
    
    {/* Instrucoes de verificacao */}
    {phone && !isVerified && (
      <>
        <Separator />
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm">Como verificar</AlertTitle>
          <AlertDescription className="text-xs">
            Envie "verificar" para o WhatsApp do JARVIS. 
            Voce recebera uma confirmacao quando estiver ativo.
          </AlertDescription>
        </Alert>
      </>
    )}
    
    {/* Remover */}
    {phone && (
      <>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-destructive">Remover vinculo</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Desvincula seu WhatsApp do JARVIS
            </p>
          </div>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => removePhone.mutate()}
            disabled={removePhone.isPending}
          >
            Remover
          </Button>
        </div>
      </>
    )}
  </CardContent>
</Card>
```

---

## Parte 3: Edge Functions

### 3.1 ff_whatsapp_verify

Endpoint para marcar telefone como verificado (chamado pelo n8n apos o usuario enviar "verificar").

**Arquivo:** `supabase/functions/ff-whatsapp-verify/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar token do n8n (opcional, mas recomendado)
    const n8nToken = req.headers.get("x-n8n-token");
    const expectedToken = Deno.env.get("N8N_WEBHOOK_TOKEN");
    
    if (expectedToken && n8nToken !== expectedToken) {
      return new Response(
        JSON.stringify({ ok: false, reply: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { phone_e164 } = await req.json();
    
    if (!phone_e164) {
      return new Response(
        JSON.stringify({ ok: false, reply: "phone_e164 obrigatorio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // Buscar e atualizar
    const { data: phone, error } = await supabase
      .from("ff_user_phones")
      .update({ verified_at: new Date().toISOString() })
      .eq("phone_e164", phone_e164)
      .is("verified_at", null)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    
    if (!phone) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          reply: "Numero nao encontrado. Vincule primeiro em fracttoflow.lovable.app/jarvis/settings" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        ok: true, 
        reply: "WhatsApp verificado com sucesso! Agora voce pode criar tarefas, lembretes e mais enviando mensagens." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ ok: false, reply: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 3.2 ff_whatsapp_ingest

Endpoint principal que recebe mensagens parseadas do n8n e cria itens nas tabelas.

**Arquivo:** `supabase/functions/ff-whatsapp-ingest/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-token",
};

interface IngestPayload {
  phone_e164: string;
  message_type: "text" | "audio";
  text?: string;
  audio_url?: string;
  message_id?: string;
  sent_at?: string;
  actions?: Action[];
}

interface Action {
  type: "task" | "reminder" | "event" | "habit" | "memory" | "expense" | "income";
  title?: string;
  description?: string;
  due_at?: string;      // ISO date para tasks
  remind_at?: string;   // ISO datetime para reminders
  start_at?: string;    // ISO datetime para events
  end_at?: string;
  valor?: number;       // Para expenses/income
  category?: string;    // Nome da categoria
  tags?: string[];
  kind?: string;        // Para memory (profile, preference, etc)
  content?: string;     // Para memory
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar token do n8n
    const n8nToken = req.headers.get("x-n8n-token");
    const expectedToken = Deno.env.get("N8N_WEBHOOK_TOKEN");
    
    if (expectedToken && n8nToken !== expectedToken) {
      return new Response(
        JSON.stringify({ ok: false, reply: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const payload: IngestPayload = await req.json();
    const { phone_e164, actions, text } = payload;
    
    if (!phone_e164) {
      return new Response(
        JSON.stringify({ ok: false, reply: "phone_e164 obrigatorio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // 1. Resolver usuario/tenant pelo telefone verificado
    const { data: phone, error: phoneError } = await supabase
      .from("ff_user_phones")
      .select("*")
      .eq("phone_e164", phone_e164)
      .not("verified_at", "is", null)
      .maybeSingle();
    
    if (phoneError) throw phoneError;
    
    if (!phone) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          reply: "Seu numero nao esta verificado. Acesse fracttoflow.lovable.app/jarvis/settings para vincular e depois envie 'verificar' aqui." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { tenant_id, user_id } = phone;
    const created: string[] = [];
    
    // 2. Se nao tem actions, tentar parse simples do texto
    let actionsToProcess = actions || [];
    
    if (actionsToProcess.length === 0 && text) {
      // Parse simples (fallback)
      actionsToProcess = parseSimpleText(text);
    }
    
    if (actionsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          reply: "Nao entendi. Tente: 'tarefa: comprar leite' ou 'lembrete: reuniao amanha 14h'" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 3. Processar cada action
    for (const action of actionsToProcess) {
      try {
        switch (action.type) {
          case "task":
            await supabase.from("ff_tasks").insert({
              tenant_id,
              created_by: user_id,
              title: action.title || "Nova tarefa",
              description: action.description || null,
              due_at: action.due_at || null,
              tags: action.tags || [],
              source: "whatsapp",
              status: "open",
              priority: "medium",
            });
            created.push(`Tarefa: ${action.title}`);
            break;
            
          case "reminder":
            const remindAt = action.remind_at || new Date(Date.now() + 3600000).toISOString();
            await supabase.from("ff_reminders").insert({
              tenant_id,
              created_by: user_id,
              title: action.title || "Lembrete",
              remind_at: remindAt,
              channel: "whatsapp",
              status: "pending",
            });
            created.push(`Lembrete: ${action.title}`);
            break;
            
          case "event":
            const startAt = action.start_at || new Date().toISOString();
            await supabase.from("ff_events").insert({
              tenant_id,
              created_by: user_id,
              title: action.title || "Evento",
              description: action.description || null,
              start_at: startAt,
              end_at: action.end_at || null,
              all_day: !action.end_at,
              source: "whatsapp",
              status: "scheduled",
              priority: "medium",
            });
            created.push(`Evento: ${action.title}`);
            break;
            
          case "habit":
            await supabase.from("ff_habits").insert({
              tenant_id,
              created_by: user_id,
              title: action.title || "Novo habito",
              cadence: "daily",
              times_per_cadence: 1,
              target_type: "count",
              target_value: 1,
              active: true,
            });
            created.push(`Habito: ${action.title}`);
            break;
            
          case "memory":
            await supabase.from("ff_memory_items").insert({
              tenant_id,
              user_id,
              kind: action.kind || "note",
              title: action.title || null,
              content: action.content || action.title || "",
              source: "whatsapp",
              metadata: {},
            });
            created.push(`Memoria: ${action.title || action.kind}`);
            break;
            
          case "expense":
          case "income":
            // Para transacoes, precisamos resolver categoria
            const tipo = action.type === "expense" ? "despesa" : "receita";
            
            // Buscar categoria padrao do usuario
            const { data: category } = await supabase
              .from("categories")
              .select("id")
              .eq("user_id", user_id)
              .eq("tipo", tipo)
              .limit(1)
              .single();
            
            if (category && action.valor) {
              const hoje = new Date().toISOString().split("T")[0];
              const mesRef = hoje.substring(0, 7);
              
              await supabase.from("transactions").insert({
                user_id,
                tipo,
                descricao: action.title || (tipo === "despesa" ? "Despesa WhatsApp" : "Receita WhatsApp"),
                valor: action.valor,
                data: hoje,
                mes_referencia: mesRef,
                category_id: category.id,
                status: "pendente",
              });
              created.push(`${tipo === "despesa" ? "Despesa" : "Receita"}: R$ ${action.valor}`);
            }
            break;
        }
      } catch (err) {
        console.error(`Error processing ${action.type}:`, err);
      }
    }
    
    // 4. Montar resposta
    const reply = created.length > 0
      ? `Criado:\n${created.map(c => `- ${c}`).join("\n")}`
      : "Nenhum item foi criado. Tente novamente.";
    
    return new Response(
      JSON.stringify({ ok: true, reply, created }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ ok: false, reply: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Parse simples para fallback
function parseSimpleText(text: string): Action[] {
  const lower = text.toLowerCase().trim();
  
  // Tarefa
  if (lower.startsWith("tarefa:") || lower.startsWith("task:")) {
    const title = text.split(":").slice(1).join(":").trim();
    return [{ type: "task", title }];
  }
  
  // Lembrete
  if (lower.startsWith("lembrete:") || lower.startsWith("reminder:")) {
    const title = text.split(":").slice(1).join(":").trim();
    return [{ type: "reminder", title }];
  }
  
  // Evento
  if (lower.startsWith("evento:") || lower.startsWith("event:")) {
    const title = text.split(":").slice(1).join(":").trim();
    return [{ type: "event", title }];
  }
  
  // Despesa
  if (lower.startsWith("gasto:") || lower.startsWith("despesa:")) {
    const parts = text.split(":").slice(1).join(":").trim();
    const match = parts.match(/(\d+(?:[.,]\d{2})?)/);
    if (match) {
      const valor = parseFloat(match[1].replace(",", "."));
      const title = parts.replace(match[0], "").trim() || "Despesa";
      return [{ type: "expense", title, valor }];
    }
  }
  
  // Memoria
  if (lower.startsWith("lembrar:") || lower.startsWith("memoria:")) {
    const content = text.split(":").slice(1).join(":").trim();
    return [{ type: "memory", content, kind: "note" }];
  }
  
  return [];
}
```

### 3.3 Configuracao em config.toml

```toml
[functions.ff-whatsapp-verify]
verify_jwt = false

[functions.ff-whatsapp-ingest]
verify_jwt = false
```

---

## Parte 4: Documentacao para n8n

### Contrato da API

#### POST /functions/v1/ff-whatsapp-verify

**Headers:**
```
Content-Type: application/json
x-n8n-token: <N8N_WEBHOOK_TOKEN>
```

**Body:**
```json
{
  "phone_e164": "+5511999999999"
}
```

**Response:**
```json
{
  "ok": true,
  "reply": "WhatsApp verificado com sucesso! Agora voce pode criar tarefas..."
}
```

#### POST /functions/v1/ff-whatsapp-ingest

**Headers:**
```
Content-Type: application/json
x-n8n-token: <N8N_WEBHOOK_TOKEN>
```

**Body (com actions parseadas pelo n8n):**
```json
{
  "phone_e164": "+5511999999999",
  "message_type": "text",
  "text": "mensagem original",
  "message_id": "abc123",
  "sent_at": "2026-01-31T12:00:00Z",
  "actions": [
    {
      "type": "task",
      "title": "Comprar leite",
      "due_at": "2026-02-01"
    },
    {
      "type": "reminder",
      "title": "Reuniao com cliente",
      "remind_at": "2026-01-31T14:00:00Z"
    }
  ]
}
```

**Body (sem actions, usando fallback):**
```json
{
  "phone_e164": "+5511999999999",
  "message_type": "text",
  "text": "tarefa: comprar leite amanha"
}
```

**Response:**
```json
{
  "ok": true,
  "reply": "Criado:\n- Tarefa: Comprar leite",
  "created": ["Tarefa: Comprar leite"]
}
```

#### Tipos de Action

| type | Campos obrigatorios | Campos opcionais |
|------|---------------------|------------------|
| task | title | description, due_at, tags |
| reminder | title | remind_at (default: +1h) |
| event | title | description, start_at, end_at |
| habit | title | - |
| memory | content | title, kind |
| expense | title, valor | - |
| income | title, valor | - |

---

## Parte 5: Seguranca

1. **Token n8n**: Configurar secret `N8N_WEBHOOK_TOKEN` para validar chamadas
2. **RLS**: Tabela ff_user_phones protegida por user_id = auth.uid()
3. **Verificacao**: Apenas telefones com `verified_at` podem criar itens
4. **Multi-tenant**: Todo item criado usa tenant_id do usuario resolvido
5. **Sem SQL direto**: Edge Functions usam apenas operacoes tipadas do Supabase client

---

## Entregaveis

| Item | Descricao |
|------|-----------|
| Migration SQL | Tabela ff_user_phones com RLS |
| useUserPhone.ts | Hook para gerenciar telefone |
| JarvisSettings.tsx | UI de vinculacao WhatsApp |
| ff-whatsapp-verify | Edge Function para verificar numero |
| ff-whatsapp-ingest | Edge Function para receber mensagens |
| config.toml | Registro das novas functions |

---

## Fluxo Completo

```text
Usuario acessa Settings > WhatsApp
           |
           v
Digita +5511999999999 e clica "Salvar"
           |
           v
ff_user_phones: verified_at = NULL
           |
           v
Usuario envia "verificar" no WhatsApp
           |
           v
n8n recebe -> POST ff-whatsapp-verify
           |
           v
verified_at = now()
           |
           v
Usuario envia "tarefa: comprar leite"
           |
           v
n8n recebe -> POST ff-whatsapp-ingest
           |
           v
ff_tasks: nova tarefa criada
           |
           v
Resposta: "Criado: Tarefa: comprar leite"
```

---

## Observacoes Tecnicas

1. **Sem dependencias externas**: Edge Functions usam apenas Supabase client
2. **Fallback parse**: Se n8n nao enviar `actions`, a function tenta parse simples
3. **Fonte rastreavel**: Todos os itens criados via WhatsApp tem `source: "whatsapp"`
4. **Secret N8N_WEBHOOK_TOKEN**: Deve ser adicionado aos secrets do Supabase
5. **Formato E.164**: Telefone sempre armazenado como +5511999999999
