
# Plano: Reestruturar Pagina Agenda com Visao Semanal Agrupada

## Visao Geral

Transformar a pagina de Agenda para exibir eventos dos proximos 7 dias agrupados por data, com formulario de criacao rapida e badges de source.

---

## Estado Atual vs Novo

| Aspecto | Atual | Novo |
|---------|-------|------|
| Visualizacao | Calendario mensal | Lista semanal agrupada por dia |
| Agrupamento | Por dia selecionado | Automatico por data |
| Criacao rapida | Botao abre form | Input inline + form completo |
| Badges de source | Nao implementado | manual/google/whatsapp |
| Navegacao | Mes anterior/proximo | Proximos 7 dias fixos |

---

## Arquitetura da Nova Pagina

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                              HEADER                                      │
│  [Icon] Agenda                                        [+ Compromisso]   │
│         X eventos esta semana                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  [Input] Adicionar compromisso rapido...              [Salvar]  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Hoje, 31 de janeiro                                  3 eventos │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │ 09:00  Reuniao de equipe                   [Google] [...] │  │    │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │ 14:30  Call com cliente                       [App] [...] │   │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Amanha, 1 de fevereiro                              1 evento  │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │ Dia inteiro  Aniversario                       [App] [...] │  │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Parte 1: Atualizar Hook useJarvisEvents

### Modificar: `src/hooks/useJarvisEvents.ts`

Adicionar funcao para agrupar eventos por dia:

```typescript
// Novo helper: agrupar eventos por data
const groupEventsByDate = (events: JarvisEvent[]) => {
  const groups: Record<string, JarvisEvent[]> = {};
  
  events.forEach(event => {
    const dateKey = format(parseISO(event.start_at), "yyyy-MM-dd");
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
  });
  
  // Ordenar eventos dentro de cada dia por horario
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => 
      new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
  });
  
  return groups;
};

// Retornar no hook
return {
  // ... existentes
  getWeekEvents: () => getUpcomingEvents(7),
  groupedEvents: groupEventsByDate(getUpcomingEvents(7)),
};
```

---

## Parte 2: Criar Componente EventCardMinimal

### Novo arquivo: `src/components/jarvis/EventCardMinimal.tsx`

Card minimalista para a lista semanal:

```typescript
interface EventCardMinimalProps {
  event: JarvisEvent;
  onEdit: (event: JarvisEvent) => void;
  onDelete: (id: string) => void;
}

export const EventCardMinimal = ({ event, onEdit, onDelete }: EventCardMinimalProps) => {
  const startDate = parseISO(event.start_at);
  
  // Determinar badge de source
  const getSourceBadge = () => {
    if (event.google_event_id) {
      return { label: "Google", className: "bg-blue-500/10 text-blue-600" };
    }
    if (event.source === "google") {
      return { label: "Google", className: "bg-blue-500/10 text-blue-600" };
    }
    return { label: "App", className: "bg-primary/10 text-primary" };
  };
  
  const sourceBadge = getSourceBadge();
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:border-primary/30 transition-all group">
      {/* Horario */}
      <div className="w-14 flex-shrink-0 text-center">
        {event.all_day ? (
          <span className="text-xs text-muted-foreground">Dia todo</span>
        ) : (
          <span className="text-sm font-medium">{format(startDate, "HH:mm")}</span>
        )}
      </div>
      
      {/* Divider vertical */}
      <div className="w-0.5 h-8 bg-border" />
      
      {/* Conteudo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.title}</p>
        {event.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            {event.location}
          </p>
        )}
      </div>
      
      {/* Badge de source */}
      <Badge variant="secondary" className={cn("text-xs", sourceBadge.className)}>
        {sourceBadge.label}
      </Badge>
      
      {/* Menu */}
      <DropdownMenu>
        ...
      </DropdownMenu>
    </div>
  );
};
```

---

## Parte 3: Criar Componente DayEventGroup

### Novo arquivo: `src/components/jarvis/DayEventGroup.tsx`

Agrupador de eventos por dia:

```typescript
interface DayEventGroupProps {
  date: Date;
  events: JarvisEvent[];
  onEdit: (event: JarvisEvent) => void;
  onDelete: (id: string) => void;
}

export const DayEventGroup = ({ date, events, onEdit, onDelete }: DayEventGroupProps) => {
  const isToday = isSameDay(date, new Date());
  const isTomorrow = isSameDay(date, addDays(new Date(), 1));
  
  const getDateLabel = () => {
    if (isToday) return "Hoje";
    if (isTomorrow) return "Amanha";
    return format(date, "EEEE", { locale: ptBR }); // Ex: "quarta-feira"
  };
  
  return (
    <Card className="border-border/50">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-medium capitalize",
            isToday && "text-primary"
          )}>
            {getDateLabel()}
          </span>
          <span className="text-sm text-muted-foreground">
            {format(date, ", d 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          {events.length} {events.length === 1 ? "evento" : "eventos"}
        </Badge>
      </CardHeader>
      <CardContent className="p-2 space-y-2">
        {events.map(event => (
          <EventCardMinimal
            key={event.id}
            event={event}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </CardContent>
    </Card>
  );
};
```

---

## Parte 4: Criar Componente QuickEventInput

### Novo arquivo: `src/components/jarvis/QuickEventInput.tsx`

Input inline para criacao rapida de eventos:

```typescript
interface QuickEventInputProps {
  onAdd: (data: { title: string; start_at: string; all_day: boolean }) => void;
  isLoading?: boolean;
}

export const QuickEventInput = ({ onAdd, isLoading }: QuickEventInputProps) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("09:00");
  const [allDay, setAllDay] = useState(false);
  
  const handleSubmit = () => {
    if (!title.trim()) return;
    
    const start_at = allDay 
      ? `${date}T00:00:00` 
      : `${date}T${time}:00`;
    
    onAdd({ title: title.trim(), start_at, all_day: allDay });
    setTitle("");
  };
  
  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Titulo */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titulo do compromisso..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          
          {/* Data */}
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
          
          {/* Hora (se nao for dia inteiro) */}
          {!allDay && (
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-28"
            />
          )}
          
          {/* Toggle dia inteiro */}
          <div className="flex items-center gap-2">
            <Switch checked={allDay} onCheckedChange={setAllDay} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Dia inteiro
            </span>
          </div>
          
          {/* Botao salvar */}
          <Button onClick={handleSubmit} disabled={!title.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Parte 5: Reestruturar Pagina JarvisCalendar

### Modificar: `src/pages/JarvisCalendar.tsx`

Nova estrutura focada em visao semanal:

```typescript
const JarvisCalendar = () => {
  const { loading: tenantLoading } = useTenant();
  const { events, isLoading, createEvent, updateEvent, deleteEvent, getUpcomingEvents } = useJarvisEvents();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<JarvisEvent | null>(null);
  
  // Eventos dos proximos 7 dias agrupados
  const weekEvents = getUpcomingEvents(7);
  const groupedEvents = useMemo(() => {
    const groups: Record<string, JarvisEvent[]> = {};
    
    weekEvents.forEach(event => {
      const dateKey = format(parseISO(event.start_at), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    });
    
    // Ordenar por horario dentro de cada dia
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => 
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
    });
    
    return groups;
  }, [weekEvents]);
  
  // Ordenar datas
  const sortedDates = Object.keys(groupedEvents).sort();
  
  const handleQuickAdd = (data: { title: string; start_at: string; all_day: boolean }) => {
    createEvent.mutate(data);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              {weekEvents.length} eventos nos proximos 7 dias
            </p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Compromisso
        </Button>
      </div>
      
      {/* Quick Add */}
      <QuickEventInput onAdd={handleQuickAdd} isLoading={createEvent.isPending} />
      
      {/* Lista agrupada por dia */}
      {sortedDates.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {sortedDates.map(dateKey => (
            <DayEventGroup
              key={dateKey}
              date={parseISO(dateKey)}
              events={groupedEvents[dateKey]}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      
      {/* Form Dialog */}
      <EventForm ... />
    </div>
  );
};
```

---

## Resumo de Arquivos

### Criar (3 arquivos)

| Arquivo | Descricao |
|---------|-----------|
| `src/components/jarvis/EventCardMinimal.tsx` | Card minimalista com badge de source |
| `src/components/jarvis/DayEventGroup.tsx` | Agrupador de eventos por dia |
| `src/components/jarvis/QuickEventInput.tsx` | Input inline para criacao rapida |

### Modificar (2 arquivos)

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useJarvisEvents.ts` | Adicionar helper getUpcomingEvents |
| `src/pages/JarvisCalendar.tsx` | Nova UI com visao semanal |

---

## Badges de Source

| Condicao | Badge | Cor |
|----------|-------|-----|
| `google_event_id` existe | "Google" | Azul |
| `source === 'google'` | "Google" | Azul |
| `source === 'manual'` | "App" | Primary |
| Futuro: WhatsApp | "WhatsApp" | Verde |

---

## Campos Exibidos no Card Minimal

| Campo | Localizacao | Formato |
|-------|-------------|---------|
| Horario | Coluna esquerda | "HH:mm" ou "Dia todo" |
| title | Centro | Texto truncado |
| location | Centro (subtitulo) | Com icone MapPin |
| source | Badge direita | "Google" / "App" |

---

## Estado Vazio Personalizado

Quando nao houver eventos nos proximos 7 dias:

```typescript
<div className="py-16 text-center">
  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
  <h3 className="text-lg font-medium mb-1">Semana livre!</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Nenhum compromisso nos proximos 7 dias
  </p>
  <Button variant="outline" onClick={() => setFormOpen(true)}>
    <Plus className="h-4 w-4 mr-1" />
    Agendar compromisso
  </Button>
</div>
```

---

## Fluxo de Criacao Rapida

1. Usuario digita titulo no input
2. Seleciona data (default: hoje)
3. Seleciona horario OU marca "Dia inteiro"
4. Clica no botao ou pressiona Enter
5. Evento criado com source="manual", status="scheduled"
6. Lista atualiza automaticamente

---

## Ordenacao

- **Dias**: cronologica (hoje -> proximos dias)
- **Eventos dentro do dia**: por `start_at` ASC
- Eventos "Dia inteiro" aparecem primeiro (00:00)
