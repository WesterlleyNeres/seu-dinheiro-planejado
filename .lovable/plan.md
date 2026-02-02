
# Plano: Tornar o Sistema Compativel com Dispositivos Moveis (PWA)

## Visao Geral

Transformar o FRACTTO FLOW em uma **Progressive Web App (PWA)** completa, com navegacao otimizada para dispositivos moveis, que pode ser instalada na tela inicial do celular e funciona como um aplicativo nativo.

---

## Analise do Estado Atual

### O que ja existe:
- `useIsMobile()` hook para detectar dispositivos moveis (breakpoint 768px)
- `manifest.json` basico para PWA
- Service Worker (`sw.js`) para push notifications
- Grids responsivos com `md:` e `lg:` em algumas paginas
- Chat ja tem logica mobile (esconde sidebar, botao "Nova")

### Problemas Identificados:
1. **Sidebar fixa 256px** - nao esconde no mobile, ocupa tela inteira
2. **Layout com `pl-64` fixo** - quebra completamente no mobile
3. **Nenhuma navegacao mobile** - usuario fica sem acesso ao menu
4. **Tabelas nao responsivas** - Transactions, Wallets etc ficam ilegíveis
5. **PWA incompleto** - faltam icones em varios tamanhos, meta tags Apple
6. **Service Worker basico** - nao faz cache offline

---

## Arquitetura da Solucao

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    MOBILE-FIRST ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  DESKTOP (>= 768px)              MOBILE (< 768px)                   │
│  ┌─────────┬─────────────┐       ┌─────────────────────┐            │
│  │ Sidebar │   Content   │       │      Content        │            │
│  │  fixed  │   pl-64     │       │   full-width p-4    │            │
│  │  256px  │             │       │                     │            │
│  │         │             │       ├─────────────────────┤            │
│  │         │             │       │   Bottom Nav Bar    │            │
│  │         │             │       │   (5 main items)    │            │
│  └─────────┴─────────────┘       └─────────────────────┘            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  PWA ENHANCEMENTS                                                   │
│  - vite-plugin-pwa for auto-generated SW + manifest                 │
│  - Multiple icon sizes (192, 512, maskable)                         │
│  - Apple-specific meta tags                                         │
│  - Offline fallback page                                            │
│  - Cache strategies for static assets                               │
├─────────────────────────────────────────────────────────────────────┤
│  RESPONSIVE COMPONENTS                                              │
│  - MobileBottomNav (fixed bottom navigation)                        │
│  - MobileHeader (compact top bar with menu)                         │
│  - MobileSidebar (Sheet overlay when needed)                        │
│  - Responsive tables -> card layouts on mobile                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar

### 1. MobileBottomNav

Navegacao fixa no rodape com 5 itens principais:

```text
┌──────────────────────────────────────────────────┐
│                                                  │
│              (Conteudo da pagina)                │
│                                                  │
├──────────────────────────────────────────────────┤
│  🏠      💬      📊      💰      ⚙️             │
│ Inicio  Chat   Tarefas  $$    Config            │
└──────────────────────────────────────────────────┘
```

**Logica:**
- Exibido apenas em `isMobile`
- 5 rotas principais: JARVIS Home, Chat, Tarefas, Dashboard Financas, Configuracoes
- Indicador visual da rota ativa
- Safe area para iPhones com notch

### 2. MobileHeader

Header compacto para mobile:

```text
┌──────────────────────────────────────────────────┐
│  ☰  FRACTTO FLOW                      [Avatar]  │
└──────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Botao hamburger que abre Sheet com menu completo
- Logo compacto
- Avatar do usuario com dropdown

### 3. MobileSidebar (Sheet)

O menu lateral atual vira um Sheet (overlay) que desliza da esquerda:

```text
┌──────────────────────────────────────────────────┐
│  ┌────────────────┐                              │
│  │ FRACTTO FLOW   │                              │
│  │ ────────────── │                              │
│  │ Assistente     │                              │
│  │  • Inicio      │                              │
│  │  • Chat        │                              │
│  │  • Tarefas     │ <- Sheet (50-70% da tela)   │
│  │  • ...         │                              │
│  │ ────────────── │                              │
│  │ Financas       │                              │
│  │  • Dashboard   │                              │
│  │  • Lancamentos │                              │
│  │  • ...         │                              │
│  └────────────────┘                              │
└──────────────────────────────────────────────────┘
```

### 4. ResponsiveTable / CardList

Componente que renderiza dados em tabela no desktop e lista de cards no mobile:

**Desktop:**
```text
| Data | Descricao | Categoria | Valor |
|------|-----------|-----------|-------|
| 01/02| Aluguel   | Moradia   | R$1.5k|
```

**Mobile:**
```text
┌────────────────────────────────────┐
│ Aluguel               - R$ 1.500  │
│ 01/02 • Moradia          [Paga]   │
└────────────────────────────────────┘
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/layout/MobileBottomNav.tsx` | Navegacao inferior mobile |
| `src/components/layout/MobileHeader.tsx` | Header compacto mobile |
| `src/components/layout/MobileSidebar.tsx` | Menu lateral Sheet |
| `src/components/layout/ResponsiveLayout.tsx` | Layout wrapper mobile-aware |
| `src/components/ui/responsive-table.tsx` | Tabela que vira cards no mobile |
| `public/icons/icon-192.png` | Icone PWA 192x192 |
| `public/icons/icon-512.png` | Icone PWA 512x512 |
| `public/icons/icon-maskable.png` | Icone maskable para Android |
| `public/apple-touch-icon.png` | Icone para iOS |
| `public/offline.html` | Pagina de fallback offline |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `vite.config.ts` | Adicionar vite-plugin-pwa |
| `index.html` | Meta tags Apple, viewport, theme-color |
| `public/manifest.json` | Mais icones, screenshots, scope |
| `src/main.tsx` | Registrar SW customizado |
| `src/components/layout/UnifiedLayout.tsx` | Condicional desktop/mobile |
| `src/components/layout/UnifiedSidebar.tsx` | Esconder no mobile |
| `src/pages/Transactions.tsx` | Usar ResponsiveTable |
| `src/pages/Wallets.tsx` | Cards grid responsivo |
| `src/pages/Dashboard.tsx` | Ajustes padding mobile |
| `src/pages/JarvisChat.tsx` | Ajustar altura para bottom nav |
| `src/index.css` | Safe areas, touch targets |

---

## PWA Enhancements

### 1. vite-plugin-pwa

Instalar e configurar para gerar automaticamente:
- Service Worker com Workbox
- Manifest.json otimizado
- Auto-update de versoes

### 2. Meta Tags index.html

```html
<!-- Apple PWA -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="FRACTTO">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- Viewport otimizado -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">

<!-- Theme color dinamico -->
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f172a">
```

### 3. Manifest.json Completo

```json
{
  "name": "FRACTTO FLOW",
  "short_name": "FRACTTO",
  "description": "Suas financas e produtividade em um so lugar",
  "start_url": "/jarvis",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#10b981",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/mobile-1.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" }
  ],
  "categories": ["productivity", "finance"],
  "lang": "pt-BR"
}
```

### 4. Service Worker com Cache

```javascript
// Estrategias de cache:
// - Shell (HTML, CSS, JS): Cache-First
// - API calls: Network-First
// - Imagens: Stale-While-Revalidate
// - Offline fallback para navegacao
```

---

## CSS Mobile-First

### Safe Areas (iPhone notch)

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

.mobile-header {
  padding-top: calc(0.5rem + var(--safe-area-top));
}

.mobile-bottom-nav {
  padding-bottom: calc(0.5rem + var(--safe-area-bottom));
}
```

### Touch Targets

```css
@media (max-width: 767px) {
  /* Botoes maiores para touch */
  button, .btn {
    min-height: 44px;
    min-width: 44px;
  }
  
  /* Espacamento maior entre items clicaveis */
  .nav-item {
    padding: 0.75rem 1rem;
  }
}
```

---

## Fluxo de Navegacao Mobile

```text
Usuario abre app no celular
          ↓
Pagina inicial: /jarvis (Home)
          ↓
Bottom Nav sempre visivel (5 items)
          ↓
┌─────────────────────────────────────────┐
│ [Home] [Chat] [Tasks] [$$] [Settings]   │
└─────────────────────────────────────────┘
          ↓
Para mais opcoes → Hamburger menu → Sheet lateral
          ↓
Sheet contem todas as 20+ rotas organizadas
```

---

## Layout Responsivo Final

### UnifiedLayout.tsx (Atualizado)

```typescript
export const UnifiedLayout = ({ children }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: Sidebar fixa */}
      {!isMobile && <UnifiedSidebar />}
      
      {/* Mobile: Header com hamburger */}
      {isMobile && <MobileHeader />}
      
      {/* Tour Overlay */}
      <TourOverlay />
      
      {/* Conteudo principal */}
      <main className={cn(
        "min-h-screen",
        isMobile 
          ? "pt-14 pb-20 px-4" // space for header + bottom nav
          : "pl-64 p-6"        // sidebar padding
      )}>
        {children}
      </main>
      
      {/* Mobile: Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
};
```

---

## Pagina de Instalacao PWA

Criar uma rota `/install` com:

1. Instrucoes visuais de como instalar
2. Botao que dispara o prompt de instalacao (quando disponivel)
3. Deteccao automatica de plataforma (iOS/Android/Desktop)
4. Screenshots do app

```typescript
// src/pages/Install.tsx
const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  
  // Detectar evento beforeinstallprompt
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    
    // Detectar se ja esta instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);
  
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
      }
    }
  };
  
  // UI com instrucoes
};
```

---

## Resumo de Implementacao

### Fase 1: Infraestrutura Mobile
1. Criar MobileBottomNav
2. Criar MobileHeader
3. Criar MobileSidebar (Sheet)
4. Atualizar UnifiedLayout

### Fase 2: PWA Completo
5. Instalar vite-plugin-pwa
6. Atualizar manifest.json
7. Adicionar icones em todos os tamanhos
8. Atualizar index.html com meta tags
9. Configurar Service Worker com cache

### Fase 3: Componentes Responsivos
10. Criar ResponsiveTable
11. Atualizar Transactions para usar cards no mobile
12. Atualizar Wallets, Goals, Budget
13. Ajustar formularios para mobile

### Fase 4: Polish
14. Safe areas para notch
15. Touch targets minimos
16. Testes em dispositivos reais
17. Pagina /install

---

## Beneficios Esperados

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Navegacao mobile | Impossivel (sidebar fixa) | Bottom nav + Sheet menu |
| Instalavel | Parcialmente | PWA completo com prompt |
| Offline | Nao funciona | Pagina de fallback + cache |
| Performance | Sem cache | Assets em cache local |
| iOS | Sem suporte Apple | Meta tags + icones Apple |
| UX mobile | Quebrada | Otimizada touch-first |

---

## Secao Tecnica

### MobileBottomNav Implementation

```typescript
// src/components/layout/MobileBottomNav.tsx
import { Link, useLocation } from "react-router-dom";
import { Home, MessageCircle, CheckSquare, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/jarvis", icon: Home, label: "Inicio" },
  { href: "/jarvis/chat", icon: MessageCircle, label: "Chat" },
  { href: "/jarvis/tasks", icon: CheckSquare, label: "Tarefas" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Financas" },
  { href: "/settings", icon: Settings, label: "Config" },
];

export function MobileBottomNav() {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
      <div 
        className="flex items-center justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/jarvis" && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 min-w-[64px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### MobileHeader Implementation

```typescript
// src/components/layout/MobileHeader.tsx
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { getInitials } from "@/lib/jarvis-helpers";
import { MobileSidebar } from "./MobileSidebar";

export function MobileHeader() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const initials = getInitials(user?.email || "");

  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="FRACTTO" className="h-8 w-8" />
            <span className="font-semibold text-sm">FRACTTO</span>
          </div>
          
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>
      
      <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
    </>
  );
}
```

### vite.config.ts com PWA

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "FRACTTO FLOW",
        short_name: "FRACTTO",
        description: "Suas financas e produtividade",
        theme_color: "#10b981",
        background_color: "#0f172a",
        display: "standalone",
        scope: "/",
        start_url: "/jarvis",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/icon-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
```
