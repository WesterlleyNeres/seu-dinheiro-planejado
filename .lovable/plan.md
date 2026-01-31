
# Plano: Criar Estrutura de App com Layout Fixo

## Visao Geral

Unificar a estrutura do app com:
- **Sidebar fixa** para navegacao principal
- **Topbar unificada** com Tenant Switcher e avatar
- **Skeleton loading** durante carregamento do tenant
- **Consistencia** entre layouts JARVIS e Financas

---

## Analise do Estado Atual

| Componente | Existe | Observacao |
|------------|--------|------------|
| TenantContext | Sim | Completo com switchTenant e invalidateQueries |
| TenantSwitcher | Sim | Funciona como dropdown |
| AppLayout | Sim | Sidebar + conteudo, sem topbar separada |
| JarvisLayout | Sim | Sidebar iconica + header com saudacao |
| Avatar UI | Sim | Componente Radix disponivel |
| Skeleton | Sim | Componente basico disponivel |

---

## Arquitetura Proposta

```text
+------------------------------------------------------------------+
|                           TOPBAR (h-14)                          |
|  [Menu] [Logo/Breadcrumb]                   [Tenant] [Avatar]    |
+----------+-------------------------------------------------------+
|          |                                                       |
|  SIDEBAR |                   CONTEUDO                            |
|  (w-64)  |                                                       |
|          |                                                       |
|  - Home  |                                                       |
|  - Tasks |                                                       |
|  - Agenda|                                                       |
|  - ...   |                                                       |
|          |                                                       |
+----------+-------------------------------------------------------+
```

---

## Parte 1: Criar Componente Topbar

### Novo arquivo: `src/components/layout/Topbar.tsx`

Conteudo:
- **Lado esquerdo**: Logo ou titulo da pagina atual
- **Lado direito**: TenantSwitcher + Avatar do usuario com menu
- Menu do avatar: Ver perfil, Configuracoes, Sair

```typescript
interface TopbarProps {
  title?: string;
  showLogo?: boolean;
}

export const Topbar = ({ title, showLogo = false }: TopbarProps) => {
  const { user, signOut } = useAuth();
  const { loading: tenantLoading } = useTenant();
  
  // Extrair iniciais do nome ou email
  const initials = getInitials(user?.email || "");
  
  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-full items-center justify-between px-4">
        {/* Lado esquerdo */}
        <div className="flex items-center gap-3">
          {showLogo && <Logo />}
          {title && <h1 className="text-lg font-semibold">{title}</h1>}
        </div>
        
        {/* Lado direito */}
        <div className="flex items-center gap-3">
          <TenantSwitcher variant="header" />
          
          {/* Avatar com menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">Configuracoes</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
```

---

## Parte 2: Criar Componente Sidebar Unificada

### Novo arquivo: `src/components/layout/Sidebar.tsx`

Sidebar reutilizavel com secoes:
- **JARVIS** (Assistente)
- **Financas**

Props:
- `variant`: "full" (desktop) | "mobile" (drawer)
- `collapsed`: boolean para modo mini

```typescript
const sidebarNavigation = {
  jarvis: [
    { name: "Home", href: "/jarvis", icon: Brain },
    { name: "Tarefas", href: "/jarvis/tasks", icon: CheckSquare },
    { name: "Agenda", href: "/jarvis/calendar", icon: CalendarDays },
    { name: "Habitos", href: "/jarvis/habits", icon: Repeat },
    { name: "Lembretes", href: "/jarvis/reminders", icon: Bell },
  ],
  finances: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    // ... demais itens
  ],
  settings: [
    { name: "Configuracoes", href: "/settings", icon: Settings },
  ],
};
```

---

## Parte 3: Criar Componente TenantLoadingFallback

### Novo arquivo: `src/components/tenant/TenantLoadingFallback.tsx`

Skeleton animado exibido enquanto tenant carrega:

```typescript
export const TenantLoadingFallback = () => (
  <div className="flex h-screen">
    {/* Sidebar skeleton */}
    <aside className="w-64 border-r border-border p-4 space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-8 w-3/4" />
    </aside>
    
    {/* Content skeleton */}
    <main className="flex-1 p-8 space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </main>
  </div>
);
```

---

## Parte 4: Criar Layout Principal Unificado

### Novo arquivo: `src/components/layout/MainLayout.tsx`

Layout principal que combina Topbar + Sidebar + Conteudo:

```typescript
interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export const MainLayout = ({ children, title }: MainLayoutProps) => {
  const { loading: tenantLoading } = useTenant();
  
  // Fallback skeleton se tenant ainda nao carregou
  if (tenantLoading) {
    return <TenantLoadingFallback />;
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Topbar fixa */}
      <Topbar title={title} />
      
      <div className="flex">
        {/* Sidebar fixa */}
        <Sidebar />
        
        {/* Conteudo principal */}
        <main className="flex-1 pl-64 pt-14">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
```

---

## Parte 5: Atualizar TenantSwitcher

### Modificar: `src/components/tenant/TenantSwitcher.tsx`

Melhorias:
- Mostrar loading skeleton enquanto carrega
- Sempre renderizar (mesmo com 1 tenant) para manter consistencia visual
- Adicionar icone de check animado

```typescript
// Antes: if (allTenants.length <= 1) return null;
// Depois: Sempre mostrar, mas sem dropdown se for unico

if (allTenants.length === 1) {
  return (
    <div className="flex items-center gap-2 px-2 text-sm">
      <Building2 className="h-4 w-4" />
      <span className="truncate">{tenant?.name}</span>
    </div>
  );
}
```

---

## Parte 6: Adicionar Funcao de Iniciais

### Modificar: `src/lib/jarvis-helpers.ts`

Adicionar helper para extrair iniciais do nome/email:

```typescript
export const getInitials = (name: string): string => {
  if (!name) return "?";
  
  // Se for email, usar primeira letra do local part
  if (name.includes("@")) {
    return name.split("@")[0].charAt(0).toUpperCase();
  }
  
  // Se for nome completo, usar primeiras duas iniciais
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  
  return name.charAt(0).toUpperCase();
};
```

---

## Resumo de Arquivos

### Criar (3 arquivos)

| Arquivo | Descricao |
|---------|-----------|
| `src/components/layout/Topbar.tsx` | Barra superior com tenant switcher e avatar |
| `src/components/layout/Sidebar.tsx` | Sidebar unificada com secoes JARVIS/Financas |
| `src/components/tenant/TenantLoadingFallback.tsx` | Skeleton durante carregamento |

### Modificar (3 arquivos)

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/tenant/TenantSwitcher.tsx` | Sempre exibir, skeleton durante loading |
| `src/components/layout/AppLayout.tsx` | Usar novos componentes Topbar/Sidebar |
| `src/lib/jarvis-helpers.ts` | Adicionar getInitials() |

---

## Fluxo de Carregamento

1. Usuario acessa rota protegida
2. TenantContext inicia fetch de memberships
3. **TenantLoadingFallback** exibido com skeletons animados
4. Tenant carrega -> Layout completo renderiza
5. Usuario troca tenant -> `queryClient.invalidateQueries()` -> dados recarregam

---

## Requisitos Tecnicos Atendidos

| Requisito | Solucao |
|-----------|---------|
| Supabase client (auth + database) | TenantContext usa supabase.from() |
| Ao trocar tenant, recarregar listas | switchTenant() chama queryClient.invalidateQueries() |
| Fallback skeleton | TenantLoadingFallback com Skeleton animado |
| Sidebar com links especificos | Sidebar.tsx com secoes JARVIS/Financas |
| Topbar com Tenant Switcher | Topbar.tsx integra TenantSwitcher |
| Avatar do usuario | Avatar com fallback de iniciais |

---

## Navegacao Final

**Secao JARVIS (Assistente):**
- Home -> /jarvis
- Tarefas -> /jarvis/tasks
- Agenda -> /jarvis/calendar
- Habitos -> /jarvis/habits
- Lembretes -> /jarvis/reminders

**Secao Financas:**
- Dashboard -> /dashboard
- Lancamentos -> /transactions
- (demais itens existentes)

**Configuracoes:**
- Configuracoes -> /settings
