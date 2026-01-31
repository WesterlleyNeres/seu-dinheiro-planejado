
# Plano: Redesign UI JARVIS - Estilo Néctar (Dark Mode)

## Visão Geral

Redesenhar completamente a UI do módulo JARVIS com visual inspirado no Néctar:
- **Dark mode by default** com gradientes sutis azul/ciano
- **Design minimalista** com cards flutuantes
- **Interações de 1 clique** para completar tarefas/hábitos
- **Sidebar icônica** compacta (estilo Néctar)
- **Suporte multi-tenant** (West + esposa) já funcional

---

## Análise do Design Néctar

Baseado no screenshot capturado:

| Característica | Néctar | FRACTTO FLOW (Atual) |
|----------------|--------|----------------------|
| Tema | Dark (azul profundo) | Light/Dark parcial |
| Sidebar | Ícones compactos, minimalista | Lista expandida |
| Cards | Flutuantes, bordas sutis | Cards padrão shadcn |
| Ações | 1-click checkboxes | Menus dropdown |
| Cores | Gradiente azul/ciano | Verde esmeralda |

---

## Parte 1: Sistema de Cores (Dark Mode)

### Atualizar `src/index.css`

Criar nova paleta "jarvis" inspirada no Néctar:

```css
.jarvis-theme {
  --background: 220 40% 6%;      /* Azul profundo quase preto */
  --foreground: 210 20% 95%;
  --card: 220 35% 10%;           /* Cards sutilmente mais claros */
  --card-foreground: 210 20% 95%;
  --primary: 192 95% 55%;        /* Ciano vibrante */
  --primary-foreground: 220 40% 6%;
  --accent: 200 80% 60%;         /* Azul accent */
  --muted: 220 30% 15%;
  --muted-foreground: 210 15% 60%;
  --border: 220 30% 18%;
}
```

---

## Parte 2: Novo Layout JARVIS

### 2.1 Criar `JarvisLayout.tsx`

Layout dedicado para o módulo JARVIS com:
- **Sidebar icônica** (60px) com tooltip nos ícones
- **Área principal** com padding generoso
- **Header minimal** com saudação contextual
- **Animações sutis** de entrada

```text
┌──────┬──────────────────────────────────────┐
│ 🧠   │  Olá, West. Hoje é sexta-feira.     │
│ ✓    │  ─────────────────────────────────  │
│ 📅   │                                      │
│ 🔄   │  [Cards de conteúdo aqui]           │
│ 🔔   │                                      │
│ ⚙️   │                                      │
└──────┴──────────────────────────────────────┘
```

### 2.2 Componente `JarvisSidebar.tsx`

```typescript
const jarvisNav = [
  { icon: Brain, label: "Início", href: "/jarvis" },
  { icon: CheckSquare, label: "Tarefas", href: "/jarvis/tasks" },
  { icon: CalendarDays, label: "Agenda", href: "/jarvis/calendar" },
  { icon: Repeat, label: "Hábitos", href: "/jarvis/habits" },
  { icon: Bell, label: "Lembretes", href: "/jarvis/reminders" },
  { icon: Settings, label: "Configurações", href: "/jarvis/settings" },
];
```

---

## Parte 3: Páginas JARVIS Redesenhadas

### 3.1 Home (`JarvisDashboard.tsx`)

**Novo design:**
- Saudação contextual com nome do usuário
- Cards resumo com animação de contagem
- Lista "O que fazer hoje" em checklist
- Seção "Próximos eventos" estilo timeline

```text
┌─────────────────────────────────────────────┐
│  Olá, West 👋                               │
│  Sexta-feira, 31 de Janeiro                 │
├─────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ 5       │ │ 2       │ │ 3/7     │       │
│  │ tarefas │ │ eventos │ │ hábitos │       │
│  └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────┤
│  ✅ O que fazer hoje                        │
│  ─────────────────────────────────────────  │
│  ☐ Finalizar relatório          alta  📅   │
│  ☐ Ligar para médico           média  ⏰   │
│  ☑ Revisar código (concluída)              │
└─────────────────────────────────────────────┘
```

### 3.2 Tarefas (`JarvisTasks.tsx`)

**Novo design:**
- Input de criação rápida no topo
- Lista com checkbox à esquerda (1-click)
- Badge de prioridade colorido
- Animação de riscar ao completar

### 3.3 Hábitos (`JarvisHabits.tsx`)

**Novo design:**
- Grid de hábitos com círculo de progresso
- Botão de check grande e destacado
- Streak counter com emoji de fogo
- Visualização semanal (7 bolinhas)

### 3.4 Lembretes (`JarvisReminders.tsx`) - **NOVA PÁGINA**

Criar página completa de lembretes:
- Lista cronológica
- Badge de canal (WhatsApp/Email/Push)
- Ação de dismiss com swipe

### 3.5 Configurações JARVIS (`JarvisSettings.tsx`) - **NOVA PÁGINA**

- Toggle de tema
- Configuração de horário de lembretes
- Conexão Google Calendar (placeholder)
- Gerenciamento de tenant members

---

## Parte 4: Componentes UI Redesenhados

### 4.1 `TaskCardNectar.tsx`

```typescript
// Novo design com checkbox proeminente
- Checkbox circular grande (24px)
- Título com fade ao completar
- Micro-animação de check
- Swipe para deletar (mobile)
```

### 4.2 `HabitCardNectar.tsx`

```typescript
// Design com progresso circular
- Círculo SVG de progresso
- Botão de check central
- Streak badge
- Dias da semana (●●●○○○○)
```

### 4.3 `ReminderCard.tsx`

```typescript
// Card de lembrete
- Ícone de canal (WhatsApp/bell)
- Horário destacado
- Botão dismiss
```

### 4.4 `QuickAddInput.tsx`

```typescript
// Input de adição rápida estilo Néctar
- Placeholder "O que você precisa fazer?"
- Submit com Enter ou botão
- Parsing inteligente de data ("amanhã às 14h")
```

---

## Parte 5: Rotas e Navegação

### Adicionar novas rotas em `App.tsx`:

```typescript
// Novas rotas JARVIS
<Route path="/jarvis/reminders" element={<JarvisReminders />} />
<Route path="/jarvis/settings" element={<JarvisSettings />} />
```

### Atualizar `AppLayout.tsx`:

Criar toggle entre "modo finanças" e "modo JARVIS":
- Layout atual para finanças
- `JarvisLayout` para rotas `/jarvis/*`

---

## Parte 6: Dark Mode Toggle

### Implementar com next-themes (já instalado):

```typescript
// ThemeProvider no App.tsx
<ThemeProvider attribute="class" defaultTheme="dark">
  ...
</ThemeProvider>

// Toggle no JarvisSettings
<Switch onCheckedChange={toggleTheme} />
```

---

## Resumo de Arquivos

### Criar (8 arquivos)

| Arquivo | Descrição |
|---------|-----------|
| `src/components/layout/JarvisLayout.tsx` | Layout exclusivo JARVIS |
| `src/components/jarvis/JarvisSidebar.tsx` | Sidebar icônica |
| `src/components/jarvis/TaskCardNectar.tsx` | Card de tarefa redesenhado |
| `src/components/jarvis/HabitCardNectar.tsx` | Card de hábito com progresso circular |
| `src/components/jarvis/ReminderCard.tsx` | Card de lembrete |
| `src/components/jarvis/QuickAddInput.tsx` | Input de adição rápida |
| `src/pages/JarvisReminders.tsx` | Página de lembretes |
| `src/pages/JarvisSettings.tsx` | Configurações JARVIS |

### Modificar (6 arquivos)

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Adicionar tema jarvis dark |
| `src/App.tsx` | Adicionar ThemeProvider + novas rotas |
| `src/pages/JarvisDashboard.tsx` | Redesign completo |
| `src/pages/JarvisTasks.tsx` | Redesign com novo card |
| `src/pages/JarvisHabits.tsx` | Redesign com círculo de progresso |
| `src/pages/JarvisCalendar.tsx` | Ajustes de tema |

---

## Ordem de Implementação

1. **Tema Dark Mode** - CSS variables + ThemeProvider
2. **JarvisLayout + Sidebar** - Novo layout dedicado
3. **Componentes UI** - Cards redesenhados
4. **Dashboard** - Redesign da home
5. **Páginas** - Tasks, Habits, Calendar atualizadas
6. **Novas páginas** - Reminders + Settings
7. **Rotas** - Integração final

---

## Diferenças vs Néctar (Originalidade)

Para não plagiar, o FRACTTO FLOW terá:
- Paleta verde/esmeralda como accent secundário (identidade própria)
- Integração nativa com módulo de finanças
- Toggle entre "modo finanças" e "modo assistente"
- Branding FRACTTO FLOW mantido
- Estética inspirada, não copiada
