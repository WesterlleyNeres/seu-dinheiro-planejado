
## Plano: Correção de Criação de Hábitos e Layout Sobreposto

Este plano resolve dois problemas reportados:
1. **JARVIS criando tarefa em vez de hábito** - O assistente não possui a ferramenta de criação de hábitos
2. **Menu lateral sobrepondo conteúdo** - O primeiro card das páginas está com texto cortado

---

### Diagnóstico Detalhado

#### Problema 1: Ausência da ferramenta `create_habit`

A Edge Function `ff-jarvis-chat` possui 16+ ferramentas, incluindo:
- `query_habits` - para consultar hábitos
- `create_task` - para criar tarefas
- `create_event` - para criar eventos
- `create_memory` - para criar memórias

**Porém NÃO possui `create_habit`!**

Quando o usuário disse "Quero um novo hábito de meditar todos os dias!", o AI não encontrou uma ferramenta adequada e usou `create_task` como fallback mais próximo, resultando na criação de uma tarefa chamada "Meditar" em vez de um hábito.

#### Problema 2: Layout sobreposto

Analisando as screenshots fornecidas:
- Na página de **Hábitos** (imagem 2): O primeiro card mostra apenas o ícone do troféu, sem o valor numérico visível
- Na página de **Tarefas** (imagem 3): Os filtros e tabs aparecem cortados na esquerda

**Causa provável:** O layout está correto (`pl-64` para compensar o sidebar de `w-64`), mas o primeiro card do grid de estatísticas pode estar tendo um problema de overflow ou o padding não está sendo aplicado corretamente em telas menores que não são detectadas como "mobile" pelo hook `useIsMobile` (breakpoint em 768px).

Olhando a imagem 2 mais atentamente, parece que a janela está em um tamanho maior que 768px (desktop), mas menor que a largura ideal. O valor "0/0" do primeiro card deveria estar visível mas está cortado.

---

### Solução Proposta

#### Parte 1: Adicionar ferramenta `create_habit` ao JARVIS

Vou adicionar à Edge Function `ff-jarvis-chat`:

1. **Definição da ferramenta** (na seção TOOLS):
```text
{
  type: "function",
  function: {
    name: "create_habit",
    description: "Cria um novo hábito para rastreamento recorrente. Use quando o usuário quiser criar um hábito.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título do hábito" },
        description: { type: "string", description: "Descrição opcional" },
        cadence: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Frequência" },
        times_per_cadence: { type: "number", description: "Quantas vezes por período (default: 1)" },
        color: { type: "string", description: "Cor do hábito (hex)" },
      },
      required: ["title"],
    },
  },
}
```

2. **Implementação do executor** (na função executeTool):
```text
case "create_habit": {
  const { data, error } = await supabase
    .from("ff_habits")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      title: args.title,
      description: args.description || null,
      cadence: args.cadence || "daily",
      times_per_cadence: args.times_per_cadence || 1,
      color: args.color || "#10b981",
    })
    .select()
    .single();

  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({
    success: true,
    habit: { id: data.id, title: data.title, cadence: data.cadence },
  });
}
```

#### Parte 2: Corrigir Layout Sobreposto

O problema parece estar na forma como o grid de estatísticas renderiza em telas intermediárias. Vou:

1. **Adicionar margem de segurança ao conteúdo principal:**
   - Ajustar o padding do layout para garantir que não haja corte

2. **Corrigir overflow nos cards de estatísticas:**
   - Adicionar `overflow-hidden` aos cards
   - Garantir que o grid respeite os limites do container

3. **Verificar responsividade intermediária:**
   - Ajustar o grid para funcionar melhor entre 768px e 1024px

---

### Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/ff-jarvis-chat/index.ts` | Adicionar definição e implementação da ferramenta `create_habit` |
| `src/pages/JarvisHabits.tsx` | Ajustar grid de estatísticas para evitar overflow |
| `src/pages/JarvisTasks.tsx` | Verificar e ajustar layout se necessário |
| `src/components/layout/UnifiedLayout.tsx` | Ajustar padding lateral para evitar corte de conteúdo |

---

### Detalhes Técnicos

#### Alteração na Edge Function

Na seção de definição de ferramentas (`TOOLS` array, após `create_event`):
```text
{
  type: "function",
  function: {
    name: "create_habit",
    description: "Cria um novo hábito para rastreamento recorrente. Use quando o usuário quiser criar um hábito diário, semanal ou mensal.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título do hábito" },
        description: { type: "string", description: "Descrição opcional" },
        cadence: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Frequência. Default: daily" },
        times_per_cadence: { type: "number", description: "Vezes por período. Default: 1" },
        color: { type: "string", description: "Cor hex opcional" },
      },
      required: ["title"],
    },
  },
}
```

Na função `executeTool`, adicionar case para `create_habit`:
```text
case "create_habit": {
  const { data, error } = await supabase
    .from("ff_habits")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      title: args.title as string,
      description: (args.description as string) || null,
      cadence: (args.cadence as string) || "daily",
      times_per_cadence: (args.times_per_cadence as number) || 1,
      color: (args.color as string) || "#10b981",
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return JSON.stringify({ error: `Erro ao criar hábito: ${error.message}` });
  }

  return JSON.stringify({
    success: true,
    message: `Hábito "${data.title}" criado com sucesso!`,
    habit: {
      id: data.id,
      title: data.title,
      cadence: data.cadence,
      times_per_cadence: data.times_per_cadence,
    },
  });
}
```

#### Ajustes de Layout

No `JarvisHabits.tsx`, ajustar o grid de estatísticas:
```text
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

Adicionar `min-w-0` aos cards para evitar overflow.

---

### Resultado Esperado

Após a implementação:
- O JARVIS poderá criar hábitos corretamente quando o usuário pedir
- A resposta será algo como: "Seu novo hábito de meditar está configurado! ☀️ O hábito 'Meditar' foi criado para ser feito diariamente."
- O layout não terá mais conteúdo cortado ou sobreposto pelo menu lateral
- Os cards de estatísticas serão exibidos corretamente em todas as larguras de tela
