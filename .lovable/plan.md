
# Plano: Implementar Fluxo de Bootstrap Multi-Tenant

## Visão Geral

Aprimorar o sistema multi-tenant para:
- Suportar usuários com múltiplos workspaces
- Criar tenant automático com nome personalizado
- Permitir troca de tenant ativa sem logout
- Persistir seleção entre sessões

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           Fluxo de Autenticação                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Login → AuthContext.user → TenantContext.fetchUserTenants()           │
│                                   │                                      │
│                                   ▼                                      │
│                    ┌──────────────────────────────┐                     │
│                    │  Usuário tem memberships?    │                     │
│                    └──────────────────────────────┘                     │
│                              │                                          │
│               ┌──────────────┴──────────────┐                          │
│               │                             │                           │
│               ▼ Sim                         ▼ Não                       │
│   ┌───────────────────────┐    ┌───────────────────────────────────┐   │
│   │ Carregar todos os     │    │ Criar tenant:                     │   │
│   │ tenants via JOIN      │    │ name = "Pessoal - {firstName}"    │   │
│   └───────────────────────┘    │ created_by = auth.uid()           │   │
│               │                │ + tenant_member role='owner'       │   │
│               ▼                └───────────────────────────────────┘   │
│   ┌───────────────────────┐                     │                       │
│   │ Restaurar último      │                     │                       │
│   │ tenant do localStorage│◄────────────────────┘                       │
│   │ ou usar o primeiro    │                                             │
│   └───────────────────────┘                                             │
│               │                                                          │
│               ▼                                                          │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │                    TenantContext.activeTenant                  │    │
│   │                    TenantContext.allTenants[]                  │    │
│   │                    TenantContext.switchTenant(id)              │    │
│   └───────────────────────────────────────────────────────────────┘    │
│               │                                                          │
│               ▼                                                          │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │  Se allTenants.length > 1 → Exibir TenantSwitcher no header   │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Parte 1: Atualizar TenantContext.tsx

### 1.1 Novo Estado

```typescript
interface TenantContextType {
  // Estado atual
  tenant: Tenant | null;           // Tenant ativo
  tenantId: string | null;         // ID do tenant ativo
  membership: TenantMember | null; // Membership ativa
  loading: boolean;
  error: string | null;
  
  // Novos campos
  allTenants: Tenant[];            // Todos os tenants do usuário
  allMemberships: TenantMember[];  // Todas as memberships
  switchTenant: (tenantId: string) => void;  // Trocar tenant
  refetch: () => Promise<void>;
}
```

### 1.2 Nova Lógica de Bootstrap

```typescript
const fetchUserTenants = async () => {
  if (!user) {
    resetState();
    return;
  }

  // 1. Buscar TODAS as memberships do usuário
  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("*, tenants(*)")
    .eq("user_id", user.id);

  if (memberships && memberships.length > 0) {
    // 2. Extrair tenants das memberships
    const tenants = memberships.map(m => m.tenants);
    
    // 3. Restaurar último tenant do localStorage ou usar primeiro
    const savedTenantId = localStorage.getItem(`ff_active_tenant_${user.id}`);
    const activeTenant = tenants.find(t => t.id === savedTenantId) || tenants[0];
    
    setAllTenants(tenants);
    setAllMemberships(memberships);
    setActiveTenant(activeTenant);
  } else {
    // 4. Criar novo tenant com nome personalizado
    const firstName = extractFirstName(user);
    const tenantName = `Pessoal - ${firstName}`;
    
    const { data: newTenant } = await supabase
      .from("tenants")
      .insert({ name: tenantName, created_by: user.id })
      .select()
      .single();
    
    // 5. Adicionar como owner
    await supabase
      .from("tenant_members")
      .insert({ tenant_id: newTenant.id, user_id: user.id, role: "owner" });
    
    setAllTenants([newTenant]);
    setActiveTenant(newTenant);
  }
};

// Helper para extrair primeiro nome
const extractFirstName = (user: User): string => {
  const fullName = user.user_metadata?.full_name;
  if (fullName) return fullName.split(" ")[0];
  return user.email?.split("@")[0] || "Usuário";
};
```

### 1.3 Função switchTenant

```typescript
const switchTenant = (tenantId: string) => {
  const newTenant = allTenants.find(t => t.id === tenantId);
  if (newTenant && user) {
    setTenant(newTenant);
    setMembership(allMemberships.find(m => m.tenant_id === tenantId) || null);
    localStorage.setItem(`ff_active_tenant_${user.id}`, tenantId);
    
    // Invalidar queries do React Query para recarregar dados
    queryClient.invalidateQueries();
  }
};
```

---

## Parte 2: Criar Componente TenantSwitcher

### 2.1 Novo Arquivo: `src/components/tenant/TenantSwitcher.tsx`

```typescript
// Dropdown que mostra todos os tenants disponíveis
// Só renderiza se houver mais de 1 tenant
// Integra com TenantContext.switchTenant()

interface TenantSwitcherProps {
  variant?: "header" | "sidebar"; // Estilos diferentes por contexto
}
```

### 2.2 Estrutura do Componente

```text
┌────────────────────────────────────┐
│  📦 Pessoal - West            ▼   │  ← Botão dropdown
└────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ ✓ Pessoal - West                   │  ← Item ativo (checkmark)
│   Casa - Família Silva             │  ← Outro tenant
│   ─────────────────────────────    │
│   + Criar novo espaço              │  ← Ação futura (opcional)
└────────────────────────────────────┘
```

### 2.3 Código Base

```typescript
export const TenantSwitcher = ({ variant = "header" }: TenantSwitcherProps) => {
  const { tenant, allTenants, switchTenant, loading } = useTenant();

  // Não renderizar se só tiver 1 tenant
  if (allTenants.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="truncate max-w-[150px]">{tenant?.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Seus espaços</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allTenants.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => switchTenant(t.id)}
            className="gap-2"
          >
            {t.id === tenant?.id && <Check className="h-4 w-4" />}
            <span className={t.id !== tenant?.id ? "ml-6" : ""}>
              {t.name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

## Parte 3: Integrar TenantSwitcher nos Layouts

### 3.1 Atualizar JarvisLayout.tsx

Adicionar TenantSwitcher no header ao lado da saudação:

```typescript
<header className="...">
  <div className="flex items-center justify-between">
    <div>
      <h1>{greeting()}, {userName}</h1>
      <p>{formatDate()}</p>
    </div>
    
    {/* Novo: Tenant Switcher */}
    <TenantSwitcher variant="header" />
  </div>
</header>
```

### 3.2 Atualizar AppLayout.tsx

Adicionar no topo da sidebar, abaixo do logo:

```typescript
{/* Logo */}
<div className="...">...</div>

{/* Novo: Tenant Switcher */}
<div className="border-b border-border px-4 py-2">
  <TenantSwitcher variant="sidebar" />
</div>

{/* Quick Period Actions */}
<div className="...">...</div>
```

---

## Parte 4: Integrar com React Query

### 4.1 Adicionar queryClient ao TenantContext

O contexto precisa invalidar todas as queries quando trocar de tenant:

```typescript
import { useQueryClient } from "@tanstack/react-query";

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  
  const switchTenant = (tenantId: string) => {
    // ... lógica de troca
    
    // Invalidar todas as queries para recarregar dados do novo tenant
    queryClient.invalidateQueries();
  };
};
```

---

## Resumo de Arquivos

### Criar (1 arquivo novo)

| Arquivo | Descrição |
|---------|-----------|
| `src/components/tenant/TenantSwitcher.tsx` | Dropdown para alternar entre tenants |

### Modificar (3 arquivos)

| Arquivo | Alteração |
|---------|-----------|
| `src/contexts/TenantContext.tsx` | Suporte a múltiplos tenants, switchTenant, localStorage |
| `src/components/layout/JarvisLayout.tsx` | Adicionar TenantSwitcher no header |
| `src/components/layout/AppLayout.tsx` | Adicionar TenantSwitcher na sidebar |

---

## Validação de RLS

A implementação respeita RLS porque:
1. Todas as queries já filtram por `tenant_id` via hooks existentes
2. `tenant_members` tem policy que só retorna memberships do usuário autenticado
3. `tenants` só pode ser lido se o usuário for membro
4. O `switchTenant` só permite trocar para tenants da lista `allTenants`

---

## Fluxo de Teste

1. **Usuário novo**: Login → Tenant "Pessoal - {nome}" criado automaticamente
2. **Usuário existente (1 tenant)**: Login → Carrega tenant → Sem switcher visível
3. **Usuário com múltiplos tenants**: Login → Carrega todos → Switcher aparece → Troca funciona
4. **Persistência**: Fechar aba → Reabrir → Último tenant selecionado restaurado

---

## Próximos Passos (Pós-Implementação)

- Implementar convite de membros via email
- Criar tela de gerenciamento de membros do tenant
- Adicionar roles (admin, editor, viewer) com permissões granulares
