
# Plano: Melhorar Pagina Habitos com Campos Completos e UX Aprimorada

## Visao Geral

A pagina de Habitos ja esta funcional, mas precisa de melhorias para exibir todos os campos e comunicar melhor o estado "ja registrado hoje".

---

## Analise do Estado Atual

| Componente | Status | Problema |
|------------|--------|----------|
| useJarvisHabits.ts | Completo | Nenhum - ja previne duplicidade |
| JarvisHabits.tsx | Completo | Nenhum ajuste necessario |
| HabitCardNectar.tsx | Funcional | Weekly dots sempre mostram 7 dias |
| HabitForm.tsx | Incompleto | target_type nao visivel, form nao reseta ao editar |

---

## Parte 1: Corrigir HabitForm

### Modificar: `src/components/jarvis/HabitForm.tsx`

#### 1.1 Adicionar useEffect para resetar form ao editar

```typescript
import { useEffect } from "react";

// Dentro do componente:
useEffect(() => {
  if (open) {
    form.reset({
      title: habit?.title || "",
      cadence: habit?.cadence || "weekly",
      times_per_cadence: habit?.times_per_cadence || 3,
      target_type: habit?.target_type || "count",
      target_value: habit?.target_value || 1,
    });
  }
}, [open, habit, form]);
```

#### 1.2 Adicionar campo target_type visivel

```typescript
<div className="grid grid-cols-2 gap-4">
  <FormField
    control={form.control}
    name="target_type"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Tipo de Meta</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="count">Contagem (vezes)</SelectItem>
            <SelectItem value="duration">Duracao (minutos)</SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
  
  <FormField
    control={form.control}
    name="target_value"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Valor por Registro</FormLabel>
        <FormControl>
          <Input type="number" min={1} {...field} />
        </FormControl>
        <FormDescription className="text-xs">
          {form.watch("target_type") === "duration" ? "Minutos por vez" : "Unidades por vez"}
        </FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

---

## Parte 2: Melhorar HabitCardNectar

### Modificar: `src/components/jarvis/HabitCardNectar.tsx`

#### 2.1 Adaptar dots ao cadence

```typescript
// Calcular numero de dots baseado no cadence
const getDotsCount = () => {
  switch (habit.cadence) {
    case "daily": return 1;
    case "weekly": return 7;
    case "monthly": return Math.min(progress.target, 10); // max 10 dots para mensal
  }
};

// Na renderizacao:
<div className="flex items-center gap-1 mt-2">
  {Array.from({ length: Math.min(progress.target, getDotsCount()) }).map((_, i) => (
    <div
      key={i}
      className={cn(
        "h-2 w-2 rounded-full transition-all",
        i < progress.completions ? "bg-primary" : "bg-muted"
      )}
    />
  ))}
</div>
```

#### 2.2 Adicionar mensagem "Ja registrado hoje"

```typescript
{/* Ao lado do botao, quando ja registrado */}
{isLoggedToday && (
  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
    Feito hoje!
  </span>
)}
```

#### 2.3 Mostrar unidade correta (vezes vs minutos)

```typescript
const getUnitLabel = () => {
  if (habit.target_type === "duration") {
    return progress.completions === 1 ? "minuto" : "minutos";
  }
  return progress.completions === 1 ? "vez" : "vezes";
};

// Na exibicao:
<p className="text-xs text-muted-foreground mt-0.5">
  {progress.completions}/{progress.target} {cadenceLabel[habit.cadence]}
  {habit.target_type === "duration" && " (min)"}
</p>
```

---

## Parte 3: Melhorar Feedback Visual de Loading

### Modificar: `src/components/jarvis/HabitCardNectar.tsx`

Adicionar prop `isLogging` para mostrar spinner durante mutacao:

```typescript
interface HabitCardNectarProps {
  // ... existentes
  isLogging?: boolean;
}

// No botao central:
<button
  onClick={() => onLog(habit.id)}
  disabled={isLoggedToday || isLogging}
  className={cn(
    "absolute inset-0 m-auto h-10 w-10 rounded-full flex items-center justify-center transition-all",
    isLoggedToday
      ? "bg-primary text-primary-foreground"
      : "bg-muted hover:bg-primary hover:text-primary-foreground"
  )}
>
  {isLogging ? (
    <Loader2 className="h-5 w-5 animate-spin" />
  ) : (
    <Check className="h-5 w-5" />
  )}
</button>
```

---

## Resumo de Arquivos

### Modificar (2 arquivos)

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/jarvis/HabitForm.tsx` | useEffect para reset + campo target_type visivel |
| `src/components/jarvis/HabitCardNectar.tsx` | Dots adaptativos + "Feito hoje!" + loading state |

---

## Campos do Formulario (Atualizados)

| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| title | text | - | Nome do habito (obrigatorio) |
| cadence | select | "weekly" | Diario / Semanal / Mensal |
| times_per_cadence | number | 3 | Meta de vezes por periodo |
| target_type | select | "count" | Contagem (vezes) ou Duracao (minutos) |
| target_value | number | 1 | Valor por cada registro |

---

## Logica de Prevencao de Duplicidade (Ja Implementada)

O hook `logHabit` ja verifica duplicidade:

```typescript
// Em useJarvisHabits.ts (linha 147-155)
const { data: existingLog } = await supabase
  .from("ff_habit_logs")
  .select("id")
  .eq("habit_id", habitId)
  .eq("log_date", logDate)
  .maybeSingle();

if (existingLog) {
  // Atualiza log existente em vez de criar novo
}
```

---

## Fluxo de Registro com Feedback

```text
1. Usuario clica no botao de check no card
2. Botao mostra spinner (isLogging=true)
3. Hook verifica se ja existe log para hoje
4. Se nao existe: cria novo log
5. Se existe: atualiza valor existente
6. UI atualiza: botao fica preenchido + "Feito hoje!" aparece
7. Toast: "Habito registrado! (emoji)"
```

---

## UI do Card Aprimorado

```text
┌─────────────────────────────────────────────────────────────────┐
│  ╭─────╮                                                    ... │
│  │  ✓  │  Fazer exercicio                                       │
│  ╰─────╯  2/3 por semana                      Feito hoje!       │
│                                                                  │
│           🔥 5 dias seguidos                                     │
│           ● ● ○ ○ ○ ○ ○                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estatisticas da Pagina (Ja Implementadas)

| Card | Valor | Icone |
|------|-------|-------|
| Metas atingidas | X/Y | Trophy |
| Progresso medio | X% | Flame |
| Habitos ativos | N | Target |

---

## Melhorias Futuras (Fora do Escopo Atual)

- Calculo de streak (dias consecutivos)
- Grafico de frequencia semanal/mensal
- Notificacoes de lembrete
- Historico de logs por habito
