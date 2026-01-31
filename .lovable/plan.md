

# Plano de Implementacao - Calculo de Streak para Habitos

## Resumo

Implementar calculo de streaks consecutivos para habitos no hook `useJarvisHabits.ts`, considerando logica diferenciada para habitos diarios (dias consecutivos) e semanais (semanas consecutivas com meta atingida).

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/hooks/useJarvisHabits.ts` | Modificar | Expandir query de logs para 90 dias + adicionar funcao `getHabitStreak()` |
| `src/pages/JarvisHabits.tsx` | Modificar | Passar prop `streak` para `HabitCardNectar` |
| `src/components/jarvis/HabitCardNectar.tsx` | Modificar | Ajustar label de streak para refletir cadencia (dias/semanas) |

---

## Detalhamento Tecnico

### 1. Expandir Query de Logs para 90 Dias

Atualmente a query busca apenas logs do mes atual, o que limita o calculo de streaks longos.

Modificacao na query `logsQueryKey`:

```typescript
// ANTES: apenas mes atual
const start = startOfMonth(new Date());
const end = endOfMonth(new Date());

// DEPOIS: ultimos 90 dias para cobrir streaks longos
const start = subDays(new Date(), 90);
const end = new Date();
```

Importar `subDays` do date-fns.

---

### 2. Funcao `getHabitStreak` - Logica Principal

Nova funcao no hook que calcula streak baseado na cadencia do habito:

```typescript
const getHabitStreak = (habit: JarvisHabit): number => {
  const habitLogs = logs.filter(l => l.habit_id === habit.id);
  
  if (habitLogs.length === 0) return 0;
  
  switch (habit.cadence) {
    case "daily":
      return calculateDailyStreak(habitLogs);
    case "weekly":
      return calculateWeeklyStreak(habitLogs, habit.times_per_cadence);
    case "monthly":
      return calculateMonthlyStreak(habitLogs, habit.times_per_cadence);
    default:
      return 0;
  }
};
```

---

### 3. Calculo de Streak Diario

Para habitos diarios, contar dias consecutivos com pelo menos 1 log:

```typescript
const calculateDailyStreak = (habitLogs: JarvisHabitLog[]): number => {
  // Obter datas unicas com logs, ordenadas desc
  const logDates = [...new Set(habitLogs.map(l => l.log_date))].sort().reverse();
  
  if (logDates.length === 0) return 0;
  
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  
  // Streak so conta se ultimo log foi hoje ou ontem
  if (logDates[0] !== today && logDates[0] !== yesterday) {
    return 0;
  }
  
  let streak = 0;
  let currentDate = logDates[0] === today 
    ? new Date() 
    : subDays(new Date(), 1);
  
  for (const logDate of logDates) {
    const expectedDate = format(currentDate, "yyyy-MM-dd");
    
    if (logDate === expectedDate) {
      streak++;
      currentDate = subDays(currentDate, 1);
    } else if (logDate < expectedDate) {
      // Gap encontrado, parar contagem
      break;
    }
  }
  
  return streak;
};
```

---

### 4. Calculo de Streak Semanal

Para habitos semanais, contar semanas consecutivas onde `times_per_cadence` foi atingido:

```typescript
const calculateWeeklyStreak = (
  habitLogs: JarvisHabitLog[], 
  timesPerCadence: number
): number => {
  // Agrupar logs por semana (ISO week)
  const weeklyCompletions = new Map<string, number>();
  
  habitLogs.forEach(log => {
    const weekKey = format(startOfWeek(new Date(log.log_date), { weekStartsOn: 0 }), "yyyy-MM-dd");
    weeklyCompletions.set(weekKey, (weeklyCompletions.get(weekKey) || 0) + log.value);
  });
  
  // Ordenar semanas desc
  const sortedWeeks = [...weeklyCompletions.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]));
  
  if (sortedWeeks.length === 0) return 0;
  
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
  const lastWeekStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 }), "yyyy-MM-dd");
  
  // Verificar se semana atual ou anterior tem completions
  const firstWeekInLogs = sortedWeeks[0][0];
  if (firstWeekInLogs !== currentWeekStart && firstWeekInLogs !== lastWeekStart) {
    return 0;
  }
  
  let streak = 0;
  let expectedWeek = firstWeekInLogs === currentWeekStart 
    ? new Date() 
    : subWeeks(new Date(), 1);
  
  for (const [weekStart, completions] of sortedWeeks) {
    const expectedWeekStart = format(startOfWeek(expectedWeek, { weekStartsOn: 0 }), "yyyy-MM-dd");
    
    if (weekStart === expectedWeekStart && completions >= timesPerCadence) {
      streak++;
      expectedWeek = subWeeks(expectedWeek, 1);
    } else if (weekStart === expectedWeekStart && completions < timesPerCadence) {
      // Semana existe mas meta nao atingida
      break;
    } else if (weekStart < expectedWeekStart) {
      // Gap de semana, parar
      break;
    }
  }
  
  return streak;
};
```

Importar `subWeeks` do date-fns.

---

### 5. Calculo de Streak Mensal (Bonus)

Similar ao semanal, mas agrupando por mes:

```typescript
const calculateMonthlyStreak = (
  habitLogs: JarvisHabitLog[], 
  timesPerCadence: number
): number => {
  const monthlyCompletions = new Map<string, number>();
  
  habitLogs.forEach(log => {
    const monthKey = format(startOfMonth(new Date(log.log_date)), "yyyy-MM");
    monthlyCompletions.set(monthKey, (monthlyCompletions.get(monthKey) || 0) + log.value);
  });
  
  const sortedMonths = [...monthlyCompletions.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]));
  
  if (sortedMonths.length === 0) return 0;
  
  const currentMonth = format(new Date(), "yyyy-MM");
  const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM");
  
  const firstMonthInLogs = sortedMonths[0][0];
  if (firstMonthInLogs !== currentMonth && firstMonthInLogs !== lastMonth) {
    return 0;
  }
  
  let streak = 0;
  let expectedMonth = firstMonthInLogs === currentMonth 
    ? new Date() 
    : subMonths(new Date(), 1);
  
  for (const [month, completions] of sortedMonths) {
    const expectedMonthKey = format(expectedMonth, "yyyy-MM");
    
    if (month === expectedMonthKey && completions >= timesPerCadence) {
      streak++;
      expectedMonth = subMonths(expectedMonth, 1);
    } else {
      break;
    }
  }
  
  return streak;
};
```

Importar `subMonths` do date-fns.

---

### 6. Retornar `getHabitStreak` no Hook

Adicionar ao return do hook:

```typescript
return {
  habits,
  logs,
  isLoading: habitsLoading || logsLoading,
  createHabit,
  updateHabit,
  deleteHabit,
  logHabit,
  getHabitProgress,
  isHabitLoggedToday,
  getHabitStreak, // NOVO
};
```

---

### 7. Passar Streak para o Card na Pagina

No arquivo `JarvisHabits.tsx`, adicionar a prop:

```tsx
<HabitCardNectar
  key={habit.id}
  habit={habit}
  progress={getHabitProgress(habit)}
  isLoggedToday={isHabitLoggedToday(habit.id)}
  streak={getHabitStreak(habit)} // NOVO
  isLogging={logHabit.isPending}
  onLog={handleLog}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

---

### 8. Ajustar Label de Streak no Card

No `HabitCardNectar.tsx`, o label deve refletir a cadencia:

```tsx
{streak > 0 && (
  <div className="flex items-center gap-1 mt-2">
    <Flame className="h-3.5 w-3.5 text-warning" />
    <span className="text-xs text-warning font-medium">
      {streak} {
        habit.cadence === "daily" 
          ? streak === 1 ? "dia" : "dias seguidos"
          : habit.cadence === "weekly"
            ? streak === 1 ? "semana" : "semanas seguidas"
            : streak === 1 ? "mes" : "meses seguidos"
      }
    </span>
  </div>
)}
```

---

## Fluxo de Dados

```text
Query logs (90 dias)
       ↓
getHabitStreak(habit)
       ↓
  switch (cadence)
       ↓
 daily → calculateDailyStreak()   → dias consecutivos com log
weekly → calculateWeeklyStreak()  → semanas com meta atingida
monthly → calculateMonthlyStreak() → meses com meta atingida
       ↓
  Retorna numero inteiro
       ↓
 Passa como prop para HabitCardNectar
       ↓
   Exibe com icone de fogo
```

---

## Otimizacao de Performance

1. **Query limitada a 90 dias**: Suficiente para streaks longos sem sobrecarregar
2. **useMemo para calculo**: Evitar recalculos desnecessarios
3. **Filtragem client-side**: Logs ja estao em memoria, nao precisa de nova query

```typescript
// Opcional: memoizar streaks para todos os habitos
const habitStreaks = useMemo(() => {
  return habits.reduce((acc, habit) => {
    acc[habit.id] = getHabitStreak(habit);
    return acc;
  }, {} as Record<string, number>);
}, [habits, logs]);
```

---

## Imports Necessarios (date-fns)

Adicionar ao `useJarvisHabits.ts`:

```typescript
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  format,
  subDays,    // NOVO
  subWeeks,   // NOVO
  subMonths   // NOVO
} from "date-fns";
```

---

## Casos de Borda Tratados

| Cenario | Comportamento |
|---------|---------------|
| Nenhum log registrado | Streak = 0 |
| Ultimo log ha 3 dias (daily) | Streak = 0 (quebrado) |
| Semana atual incompleta (weekly) | Conta se semana anterior estava completa |
| Habito criado hoje sem logs | Streak = 0 |
| Log registrado hoje (primeiro) | Streak = 1 |

---

## Entregaveis

1. `src/hooks/useJarvisHabits.ts` - Funcao `getHabitStreak()` + query 90 dias
2. `src/pages/JarvisHabits.tsx` - Passar prop `streak`
3. `src/components/jarvis/HabitCardNectar.tsx` - Label dinamico por cadencia

