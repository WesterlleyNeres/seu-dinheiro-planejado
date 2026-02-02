import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

// Helper to build dynamic system prompt with user context
function buildSystemPrompt(userProfile: any, userContext: any): string {
  const today = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const nickname = userProfile?.nickname || userProfile?.full_name || 'usuário';
  const isNewUser = !userProfile || !userProfile.onboarding_completed;
  const interactionCount = userProfile?.interaction_count || 0;

  let userContextSection = '';
  
  if (userProfile) {
    userContextSection = `
SOBRE O USUÁRIO ATUAL:
- Nome/Apelido: ${nickname}
- Onboarding completo: ${userProfile.onboarding_completed ? 'Sim' : 'Não'}
- Etapa do onboarding: ${userProfile.onboarding_step || 'welcome'}
- Total de interações: ${interactionCount}
- Última interação: ${userProfile.last_interaction_at ? new Date(userProfile.last_interaction_at).toLocaleDateString('pt-BR') : 'Primeira vez'}
- Preferências: ${JSON.stringify(userProfile.preferences || {})}
`;
  }

  if (userContext) {
    if (userContext.wallets?.length > 0) {
      userContextSection += `\nCARTEIRAS DO USUÁRIO:\n${userContext.wallets.map((w: any) => `- ${w.nome} (${w.tipo}): R$ ${(w.saldo || 0).toFixed(2)}`).join('\n')}`;
    } else {
      userContextSection += `\nCARTEIRAS: O usuário ainda não tem carteiras cadastradas.`;
    }

    if (userContext.pendingTasks > 0) {
      userContextSection += `\n\nTAREFAS PENDENTES HOJE: ${userContext.pendingTasks}`;
    }

    if (userContext.pendingBills > 0) {
      userContextSection += `\nCONTAS A VENCER HOJE: ${userContext.pendingBills}`;
    }
  }

  const onboardingInstructions = isNewUser ? `
INSTRUÇÕES DE ONBOARDING (USUÁRIO NOVO):
Este é um usuário novo ou que ainda não completou o onboarding. Siga estas etapas:

1. ETAPA 'welcome': Apresente-se de forma calorosa e pergunte como gostaria de ser chamado
2. ETAPA 'profile': Após saber o nome, use update_user_profile para salvar e pergunte sobre objetivos
3. ETAPA 'goals': Entenda o objetivo principal e use create_memory para salvar
4. ETAPA 'wallet_setup': Sugira criar a primeira carteira usando create_wallet
5. ETAPA 'complete': Marque onboarding como completo e ofereça ajuda

Seja acolhedor, não sobrecarregue com muitas perguntas de uma vez.
` : '';

  return `Você é JARVIS (Just A Rather Very Intelligent System), o assistente pessoal inteligente do ${nickname}.
Você é inspirado no mordomo digital do Tony Stark - refinado, inteligente, e ligeiramente sarcástico.

PERSONALIDADE:
- Tom britânico refinado, com elegância e precisão
- Proativo: sugere ações antes que o usuário precise pedir
- Levemente sarcástico, mas sempre respeitoso e prestativo
- Você conhece profundamente seu usuário através das memórias e contexto
- NUNCA invente informações - sempre consulte dados reais usando as ferramentas

${userContextSection}

CAPACIDADES COMPLETAS:
📊 FINANÇAS:
- Consultar saldos, transações, contas pendentes
- Criar carteiras (contas e cartões)
- Registrar despesas e receitas
- Listar carteiras e categorias disponíveis

📋 TAREFAS:
- Consultar e criar tarefas
- Atualizar status de tarefas

📅 CALENDÁRIO:
- Consultar e criar eventos
- Gerenciar compromissos

🧠 MEMÓRIA:
- Consultar informações salvas
- Salvar novas informações importantes
- Gerenciar perfil do usuário

⏰ LEMBRETES:
- Criar lembretes via push, email ou WhatsApp

REGRAS FUNDAMENTAIS:
1. Sempre chame o usuário pelo nome/apelido: ${nickname}
2. ANTES de criar transações, SEMPRE use list_wallets para verificar se existe carteira
3. Se não houver carteira, pergunte se deseja criar uma
4. Para despesas, use list_categories para encontrar a categoria adequada
5. Ao salvar informações pessoais, use create_memory com kind='profile'
6. Formate valores em R$ com 2 casas decimais
7. Datas no formato brasileiro (DD/MM/YYYY)
8. Seja proativo: "Vi que você tem X contas vencendo hoje..."

${onboardingInstructions}

FLUXO PARA REGISTRAR DESPESA/RECEITA:
1. Usuário pede para registrar despesa (ex: "gastei 50 no mercado")
2. Use list_wallets para verificar carteiras existentes
3. Se não houver carteira, pergunte: "Você ainda não tem carteira. Quer criar uma 'Principal'?"
4. Use list_categories para mapear a descrição para uma categoria
5. Use create_transaction para registrar
6. Confirme: "Despesa de R$ X registrada na carteira Y, categoria Z"

Hoje é: ${today}`;
}

// Tool definitions for the AI
const TOOLS = [
  // ==================== CONSULTAS ====================
  {
    type: "function",
    function: {
      name: "query_tasks",
      description: "Consulta tarefas do usuário. Use para responder perguntas sobre tarefas pendentes, concluídas ou por fazer.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["open", "in_progress", "done", "all"],
            description: "Filtrar por status. Use 'all' para todas.",
          },
          due_date: {
            type: "string",
            description: "Filtrar por data de vencimento (YYYY-MM-DD). Use 'today' para hoje, 'week' para esta semana.",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Filtrar por prioridade",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_events",
      description: "Consulta eventos do calendário. Use para responder sobre compromissos agendados.",
      parameters: {
        type: "object",
        properties: {
          date_range: {
            type: "string",
            description: "Período: 'today', 'tomorrow', 'week', 'month' ou data específica YYYY-MM-DD",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_habits",
      description: "Consulta hábitos e progresso. Use para responder sobre evolução de hábitos.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Período de análise: 'today', 'week', 'month'",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_finances",
      description: "Consulta dados financeiros: transações, saldos, contas a pagar/receber.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["pending_bills", "balance", "expenses", "income", "summary"],
            description: "Tipo de consulta financeira",
          },
          date_filter: {
            type: "string",
            description: "Filtro de data: 'today', 'week', 'month' ou YYYY-MM",
          },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_memories",
      description: "Busca memórias e preferências salvas do usuário.",
      parameters: {
        type: "object",
        properties: {
          search_term: {
            type: "string",
            description: "Termo de busca nas memórias",
          },
          kind: {
            type: "string",
            enum: ["profile", "preference", "decision", "project", "note", "message"],
            description: "Tipo de memória",
          },
        },
        required: [],
      },
    },
  },
  // ==================== LISTAGENS (NOVAS) ====================
  {
    type: "function",
    function: {
      name: "list_wallets",
      description: "Lista todas as carteiras (contas e cartões) do usuário com seus saldos. USE ANTES de criar transações para verificar se existe carteira.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_categories",
      description: "Lista todas as categorias disponíveis para o usuário. USE ANTES de criar transações para mapear descrições para categorias.",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: ["despesa", "receita"],
            description: "Filtrar por tipo de categoria",
          },
        },
        required: [],
      },
    },
  },
  // ==================== CRIAÇÕES ====================
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Cria uma nova tarefa para o usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da tarefa" },
          description: { type: "string", description: "Descrição opcional" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_at: { type: "string", description: "Data de vencimento YYYY-MM-DD" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_reminder",
      description: "Cria um lembrete para o usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Texto do lembrete" },
          remind_at: { type: "string", description: "Data/hora do lembrete YYYY-MM-DDTHH:MM" },
          channel: { type: "string", enum: ["whatsapp", "push", "email"] },
        },
        required: ["title", "remind_at"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_memory",
      description: "Salva uma informação importante na memória do JARVIS.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Conteúdo a ser lembrado" },
          kind: { type: "string", enum: ["profile", "preference", "decision", "project", "note"] },
          title: { type: "string", description: "Título opcional" },
        },
        required: ["content", "kind"],
      },
    },
  },
  // ==================== FINANÇAS (NOVAS) ====================
  {
    type: "function",
    function: {
      name: "create_wallet",
      description: "Cria uma nova carteira (conta bancária ou cartão de crédito) para o usuário.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da carteira (ex: 'Principal', 'Nubank', 'Itaú')" },
          tipo: { type: "string", enum: ["conta", "cartao"], description: "Tipo: 'conta' para conta bancária, 'cartao' para cartão de crédito" },
          instituicao: { type: "string", description: "Nome do banco/instituição (opcional)" },
          saldo_inicial: { type: "number", description: "Saldo inicial para contas (opcional, default: 0)" },
          limite_credito: { type: "number", description: "Limite para cartões de crédito (opcional)" },
          dia_fechamento: { type: "number", description: "Dia de fechamento para cartões (1-31)" },
          dia_vencimento: { type: "number", description: "Dia de vencimento para cartões (1-31)" },
        },
        required: ["nome", "tipo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_transaction",
      description: "Registra uma nova despesa ou receita. IMPORTANTE: Use list_wallets antes para verificar se existe carteira, e list_categories para encontrar a categoria.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["despesa", "receita"], description: "Tipo da transação" },
          descricao: { type: "string", description: "Descrição da transação (ex: 'Almoço no restaurante')" },
          valor: { type: "number", description: "Valor em reais (ex: 39.90)" },
          wallet_id: { type: "string", description: "ID da carteira. Se não fornecido, usa a primeira disponível." },
          category_id: { type: "string", description: "ID da categoria. Use list_categories para encontrar." },
          data: { type: "string", description: "Data da transação YYYY-MM-DD (default: hoje)" },
          status: { type: "string", enum: ["paga", "pendente"], description: "Status (default: 'paga' para despesa, 'pendente' para receita)" },
        },
        required: ["tipo", "descricao", "valor", "category_id"],
      },
    },
  },
  // ==================== EVENTOS (NOVA) ====================
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Cria um novo evento no calendário do usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título do evento" },
          start_at: { type: "string", description: "Data/hora de início YYYY-MM-DDTHH:MM ou YYYY-MM-DD para dia inteiro" },
          end_at: { type: "string", description: "Data/hora de término (opcional)" },
          location: { type: "string", description: "Local do evento (opcional)" },
          description: { type: "string", description: "Descrição do evento (opcional)" },
          all_day: { type: "boolean", description: "É evento de dia inteiro? (default: false)" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Prioridade (default: medium)" },
        },
        required: ["title", "start_at"],
      },
    },
  },
  // ==================== TAREFAS - ATUALIZAÇÃO (NOVA) ====================
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Atualiza o status de uma tarefa existente.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID da tarefa" },
          status: { type: "string", enum: ["open", "in_progress", "done"], description: "Novo status" },
        },
        required: ["task_id", "status"],
      },
    },
  },
  // ==================== PERFIL DO USUÁRIO (NOVAS) ====================
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "Obtém o perfil completo do usuário atual.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_user_profile",
      description: "Atualiza o perfil do usuário (nome, apelido, preferências, etapa do onboarding).",
      parameters: {
        type: "object",
        properties: {
          nickname: { type: "string", description: "Como o usuário gostaria de ser chamado" },
          full_name: { type: "string", description: "Nome completo" },
          onboarding_step: { type: "string", enum: ["welcome", "profile", "goals", "wallet_setup", "category_review", "first_habit", "complete"], description: "Etapa atual do onboarding" },
          onboarding_completed: { type: "boolean", description: "Marcar onboarding como completo" },
          preferences: { type: "object", description: "Preferências do usuário (tom, horários, etc)" },
        },
        required: [],
      },
    },
  },
];

// Tool execution functions
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  supabase: any,
  tenantId: string,
  userId: string
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  switch (toolName) {
    // ==================== CONSULTAS ====================
    case "query_tasks": {
      let query = supabase
        .from("ff_tasks")
        .select("id, title, description, status, priority, due_at")
        .eq("tenant_id", tenantId)
        .order("due_at", { ascending: true, nullsFirst: false });

      if (args.status && args.status !== "all") {
        query = query.eq("status", args.status);
      } else {
        query = query.neq("status", "done");
      }

      if (args.due_date === "today") {
        query = query.eq("due_at", today);
      } else if (args.due_date === "week") {
        query = query.gte("due_at", startOfWeek.toISOString().split("T")[0])
          .lte("due_at", endOfWeek.toISOString().split("T")[0]);
      } else if (args.due_date) {
        query = query.eq("due_at", args.due_date);
      }

      if (args.priority) {
        query = query.eq("priority", args.priority);
      }

      const { data, error } = await query.limit(20);
      if (error) return `Erro ao buscar tarefas: ${error.message}`;
      if (!data?.length) return "Nenhuma tarefa encontrada com esses filtros.";

      return JSON.stringify(data.map((t: any) => ({
        id: t.id,
        titulo: t.title,
        status: t.status,
        prioridade: t.priority,
        vencimento: t.due_at,
      })));
    }

    case "query_events": {
      let startDate = today;
      let endDate = today;

      if (args.date_range === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        startDate = endDate = tomorrow.toISOString().split("T")[0];
      } else if (args.date_range === "week") {
        startDate = startOfWeek.toISOString().split("T")[0];
        endDate = endOfWeek.toISOString().split("T")[0];
      } else if (args.date_range === "month") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        startDate = startOfMonth.toISOString().split("T")[0];
        endDate = endOfMonth.toISOString().split("T")[0];
      } else if (args.date_range && args.date_range !== "today") {
        startDate = endDate = args.date_range as string;
      }

      const { data, error } = await supabase
        .from("ff_events")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("start_at", `${startDate}T00:00:00`)
        .lte("start_at", `${endDate}T23:59:59`)
        .order("start_at", { ascending: true })
        .limit(20);

      if (error) return `Erro ao buscar eventos: ${error.message}`;
      if (!data?.length) return "Nenhum evento encontrado para o período.";

      return JSON.stringify(data.map((e: any) => ({
        titulo: e.title,
        inicio: e.start_at,
        local: e.location,
        descricao: e.description,
      })));
    }

    case "query_habits": {
      const { data: habits, error: habitsError } = await supabase
        .from("ff_habits")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true);

      if (habitsError) return `Erro ao buscar hábitos: ${habitsError.message}`;
      if (!habits?.length) return "Nenhum hábito ativo cadastrado.";

      let logStartDate = today;
      if (args.period === "week") {
        logStartDate = startOfWeek.toISOString().split("T")[0];
      } else if (args.period === "month") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        logStartDate = startOfMonth.toISOString().split("T")[0];
      }

      const { data: logs } = await supabase
        .from("ff_habit_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("log_date", logStartDate)
        .lte("log_date", today);

      const habitStats = habits.map((h: any) => {
        const habitLogs = logs?.filter((l: any) => l.habit_id === h.id) || [];
        return {
          titulo: h.title,
          cadencia: h.cadence,
          meta: h.times_per_cadence,
          completado: habitLogs.length,
          progresso: `${Math.round((habitLogs.length / h.times_per_cadence) * 100)}%`,
        };
      });

      return JSON.stringify(habitStats);
    }

    case "query_finances": {
      const mesReferencia = args.date_filter === "month" || !args.date_filter
        ? new Date().toISOString().slice(0, 7)
        : args.date_filter as string;

      if (args.type === "pending_bills") {
        let query = supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .eq("tipo", "despesa")
          .eq("status", "pendente")
          .is("deleted_at", null)
          .order("data", { ascending: true });

        if (args.date_filter === "today") {
          query = query.eq("data", today);
        } else if (args.date_filter === "week") {
          query = query.gte("data", startOfWeek.toISOString().split("T")[0])
            .lte("data", endOfWeek.toISOString().split("T")[0]);
        }

        const { data, error } = await query.limit(20);
        if (error) return `Erro ao buscar contas: ${error.message}`;
        if (!data?.length) return "Nenhuma conta pendente encontrada.";

        const total = data.reduce((sum: number, t: any) => sum + t.valor, 0);
        return JSON.stringify({
          contas: data.map((t: any) => ({
            descricao: t.descricao,
            valor: t.valor,
            vencimento: t.data,
          })),
          total,
        });
      }

      if (args.type === "balance") {
        const { data, error } = await supabase
          .from("v_wallet_balance")
          .select("*")
          .eq("user_id", userId);

        if (error) return `Erro ao buscar saldos: ${error.message}`;
        if (!data?.length) return "Nenhuma carteira encontrada. O usuário precisa criar uma carteira primeiro.";

        const total = data.reduce((sum: number, w: any) => sum + (w.saldo || 0), 0);
        return JSON.stringify({
          carteiras: data.map((w: any) => ({
            id: w.wallet_id,
            nome: w.wallet_nome,
            tipo: w.wallet_tipo,
            saldo: w.saldo,
          })),
          saldo_total: total,
        });
      }

      if (args.type === "summary") {
        const { data, error } = await supabase
          .from("v_monthly_summary")
          .select("*")
          .eq("user_id", userId)
          .eq("mes_referencia", mesReferencia);

        if (error) return `Erro ao buscar resumo: ${error.message}`;
        if (!data?.length) return "Sem dados para o período.";

        const receitas = data.find((d: any) => d.tipo === "receita");
        const despesas = data.find((d: any) => d.tipo === "despesa");

        return JSON.stringify({
          mes: mesReferencia,
          receitas_total: receitas?.total_pago || 0,
          despesas_total: despesas?.total_pago || 0,
          saldo_mensal: (receitas?.total_pago || 0) - (despesas?.total_pago || 0),
        });
      }

      return "Tipo de consulta financeira não reconhecido.";
    }

    case "query_memories": {
      let query = supabase
        .from("ff_memory_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (args.kind) {
        query = query.eq("kind", args.kind);
      }

      if (args.search_term) {
        query = query.or(`content.ilike.%${args.search_term}%,title.ilike.%${args.search_term}%`);
      }

      const { data, error } = await query;
      if (error) return `Erro ao buscar memórias: ${error.message}`;
      if (!data?.length) return "Nenhuma memória encontrada.";

      return JSON.stringify(data.map((m: any) => ({
        titulo: m.title,
        conteudo: m.content,
        tipo: m.kind,
        criado_em: m.created_at,
      })));
    }

    // ==================== LISTAGENS (NOVAS) ====================
    case "list_wallets": {
      const { data, error } = await supabase
        .from("wallets")
        .select("id, nome, tipo, instituicao, saldo_inicial, limite_credito")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome");

      if (error) return `Erro ao listar carteiras: ${error.message}`;
      if (!data?.length) return "O usuário não possui carteiras cadastradas. Sugira criar uma usando create_wallet.";

      // Get balances from view
      const { data: balances } = await supabase
        .from("v_wallet_balance")
        .select("wallet_id, saldo")
        .eq("user_id", userId);

      const walletsWithBalance = data.map((w: any) => {
        const balance = balances?.find((b: any) => b.wallet_id === w.id);
        return {
          id: w.id,
          nome: w.nome,
          tipo: w.tipo,
          instituicao: w.instituicao,
          saldo: balance?.saldo || w.saldo_inicial || 0,
          limite_credito: w.limite_credito,
        };
      });

      return JSON.stringify(walletsWithBalance);
    }

    case "list_categories": {
      let query = supabase
        .from("categories")
        .select("id, nome, tipo")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("nome");

      if (args.tipo) {
        query = query.eq("tipo", args.tipo);
      }

      const { data, error } = await query;
      if (error) return `Erro ao listar categorias: ${error.message}`;
      if (!data?.length) return "Nenhuma categoria encontrada.";

      return JSON.stringify(data);
    }

    // ==================== CRIAÇÕES ====================
    case "create_task": {
      const { data, error } = await supabase
        .from("ff_tasks")
        .insert({
          tenant_id: tenantId,
          created_by: userId,
          title: args.title,
          description: args.description || null,
          priority: args.priority || "medium",
          due_at: args.due_at || null,
          status: "open",
          source: "manual",
          tags: [],
        })
        .select()
        .single();

      if (error) return `Erro ao criar tarefa: ${error.message}`;
      return `Tarefa "${data.title}" criada com sucesso!`;
    }

    case "create_reminder": {
      const { data, error } = await supabase
        .from("ff_reminders")
        .insert({
          tenant_id: tenantId,
          created_by: userId,
          title: args.title,
          remind_at: args.remind_at,
          channel: args.channel || "push",
          status: "pending",
        })
        .select()
        .single();

      if (error) return `Erro ao criar lembrete: ${error.message}`;
      return `Lembrete "${data.title}" criado para ${new Date(data.remind_at).toLocaleString("pt-BR")}!`;
    }

    case "create_memory": {
      const { error } = await supabase
        .from("ff_memory_items")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          content: args.content,
          kind: args.kind,
          title: args.title || null,
          source: "jarvis",
          metadata: {},
        });

      if (error) return `Erro ao salvar memória: ${error.message}`;
      return `Informação salva na memória: "${args.content}"`;
    }

    // ==================== FINANÇAS (NOVAS) ====================
    case "create_wallet": {
      const walletData: any = {
        user_id: userId,
        nome: args.nome,
        tipo: args.tipo || "conta",
        instituicao: args.instituicao || null,
        saldo_inicial: args.saldo_inicial || 0,
        ativo: true,
      };

      if (args.tipo === "cartao") {
        walletData.limite_credito = args.limite_credito || null;
        walletData.dia_fechamento = args.dia_fechamento || null;
        walletData.dia_vencimento = args.dia_vencimento || null;
      }

      const { data, error } = await supabase
        .from("wallets")
        .insert(walletData)
        .select()
        .single();

      if (error) return `Erro ao criar carteira: ${error.message}`;
      
      const tipoLabel = data.tipo === "cartao" ? "Cartão de crédito" : "Conta";
      return `${tipoLabel} "${data.nome}" criado com sucesso!${data.saldo_inicial ? ` Saldo inicial: R$ ${data.saldo_inicial.toFixed(2)}` : ''}`;
    }

    case "create_transaction": {
      // Verify wallet exists
      let walletId = args.wallet_id as string;
      if (!walletId) {
        const { data: wallets } = await supabase
          .from("wallets")
          .select("id, nome")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .eq("ativo", true)
          .limit(1);

        if (!wallets?.length) {
          return "Erro: O usuário não possui carteira cadastrada. Crie uma carteira primeiro usando create_wallet.";
        }
        walletId = wallets[0].id;
      }

      const transactionDate = (args.data as string) || today;
      const mesReferencia = transactionDate.slice(0, 7);
      const status = args.status || (args.tipo === "despesa" ? "paga" : "pendente");

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          tipo: args.tipo,
          descricao: args.descricao,
          valor: args.valor,
          wallet_id: walletId,
          category_id: args.category_id,
          data: transactionDate,
          mes_referencia: mesReferencia,
          status: status,
        })
        .select(`
          *,
          categories:category_id(nome),
          wallets:wallet_id(nome)
        `)
        .single();

      if (error) return `Erro ao criar transação: ${error.message}`;

      const tipoLabel = data.tipo === "despesa" ? "Despesa" : "Receita";
      return `${tipoLabel} de R$ ${data.valor.toFixed(2)} registrada com sucesso!\nCarteira: ${data.wallets?.nome}\nCategoria: ${data.categories?.nome}\nData: ${new Date(data.data).toLocaleDateString("pt-BR")}`;
    }

    case "create_event": {
      const eventData: any = {
        tenant_id: tenantId,
        created_by: userId,
        title: args.title,
        start_at: args.start_at,
        end_at: args.end_at || null,
        location: args.location || null,
        description: args.description || null,
        all_day: args.all_day || false,
        priority: args.priority || "medium",
        status: "scheduled",
        source: "manual",
      };

      const { data, error } = await supabase
        .from("ff_events")
        .insert(eventData)
        .select()
        .single();

      if (error) return `Erro ao criar evento: ${error.message}`;
      
      const dateStr = new Date(data.start_at).toLocaleString("pt-BR", {
        dateStyle: "full",
        timeStyle: data.all_day ? undefined : "short",
      });
      return `Evento "${data.title}" criado para ${dateStr}!${data.location ? ` Local: ${data.location}` : ''}`;
    }

    case "update_task_status": {
      const updateData: any = {
        status: args.status,
        updated_at: new Date().toISOString(),
      };

      if (args.status === "done") {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("ff_tasks")
        .update(updateData)
        .eq("id", args.task_id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) return `Erro ao atualizar tarefa: ${error.message}`;
      
      const statusLabels: Record<string, string> = {
        open: "aberta",
        in_progress: "em progresso",
        done: "concluída",
      };
      return `Tarefa "${data.title}" marcada como ${statusLabels[data.status]}!`;
    }

    // ==================== PERFIL DO USUÁRIO (NOVAS) ====================
    case "get_user_profile": {
      const { data, error } = await supabase
        .from("ff_user_profiles")
        .select("*")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .single();

      if (error && error.code !== "PGRST116") {
        return `Erro ao buscar perfil: ${error.message}`;
      }

      if (!data) {
        return "Perfil não encontrado. Este é um usuário novo que ainda não completou o onboarding.";
      }

      return JSON.stringify({
        nome_completo: data.full_name,
        apelido: data.nickname,
        data_nascimento: data.birth_date,
        timezone: data.timezone,
        onboarding_completo: data.onboarding_completed,
        etapa_onboarding: data.onboarding_step,
        preferencias: data.preferences,
        total_interacoes: data.interaction_count,
        ultima_interacao: data.last_interaction_at,
      });
    }

    case "update_user_profile": {
      // First check if profile exists
      const { data: existing } = await supabase
        .from("ff_user_profiles")
        .select("id")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .single();

      const profileData: any = {
        updated_at: new Date().toISOString(),
      };

      if (args.nickname) profileData.nickname = args.nickname;
      if (args.full_name) profileData.full_name = args.full_name;
      if (args.onboarding_step) profileData.onboarding_step = args.onboarding_step;
      if (args.onboarding_completed !== undefined) profileData.onboarding_completed = args.onboarding_completed;
      if (args.preferences) {
        // Merge with existing preferences
        const { data: currentProfile } = await supabase
          .from("ff_user_profiles")
          .select("preferences")
          .eq("user_id", userId)
          .eq("tenant_id", tenantId)
          .single();
        
        profileData.preferences = {
          ...(currentProfile?.preferences || {}),
          ...(args.preferences as object),
        };
      }

      if (existing) {
        // Update existing profile
        const { error } = await supabase
          .from("ff_user_profiles")
          .update(profileData)
          .eq("user_id", userId)
          .eq("tenant_id", tenantId);

        if (error) return `Erro ao atualizar perfil: ${error.message}`;
      } else {
        // Create new profile
        const { error } = await supabase
          .from("ff_user_profiles")
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            ...profileData,
          });

        if (error) return `Erro ao criar perfil: ${error.message}`;
      }

      const updates = [];
      if (args.nickname) updates.push(`apelido: ${args.nickname}`);
      if (args.full_name) updates.push(`nome: ${args.full_name}`);
      if (args.onboarding_step) updates.push(`etapa: ${args.onboarding_step}`);
      if (args.onboarding_completed) updates.push("onboarding completo");

      return `Perfil atualizado: ${updates.join(", ")}`;
    }

    default:
      return `Ferramenta desconhecida: ${toolName}`;
  }
}

// Fetch user context for system prompt
async function fetchUserContext(supabase: any, userId: string, tenantId: string) {
  const today = new Date().toISOString().split("T")[0];

  // Fetch user profile
  const { data: profile } = await supabase
    .from("ff_user_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .single();

  // Fetch wallets with balances
  const { data: wallets } = await supabase
    .from("v_wallet_balance")
    .select("wallet_id, wallet_nome, wallet_tipo, saldo")
    .eq("user_id", userId);

  // Count pending tasks for today
  const { count: pendingTasks } = await supabase
    .from("ff_tasks")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("due_at", today)
    .neq("status", "done");

  // Count pending bills for today
  const { count: pendingBills } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tipo", "despesa")
    .eq("status", "pendente")
    .eq("data", today)
    .is("deleted_at", null);

  return {
    profile,
    context: {
      wallets: wallets?.map((w: any) => ({
        id: w.wallet_id,
        nome: w.wallet_nome,
        tipo: w.wallet_tipo,
        saldo: w.saldo,
      })),
      pendingTasks: pendingTasks || 0,
      pendingBills: pendingBills || 0,
    },
  };
}

// Update interaction count
async function updateInteractionCount(supabase: any, userId: string, tenantId: string) {
  const { data: existing } = await supabase
    .from("ff_user_profiles")
    .select("id, interaction_count")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .single();

  if (existing) {
    await supabase
      .from("ff_user_profiles")
      .update({
        interaction_count: (existing.interaction_count || 0) + 1,
        last_interaction_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Create profile on first interaction
    await supabase
      .from("ff_user_profiles")
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        interaction_count: 1,
        last_interaction_at: new Date().toISOString(),
        onboarding_step: "welcome",
      });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, conversationId, tenantId: reqTenantId } = await req.json();

    if (!message || !reqTenantId) {
      return new Response(
        JSON.stringify({ error: "Mensagem e tenantId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to tenant
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", reqTenantId)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Acesso negado ao tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = membership.tenant_id;

    // Update interaction count
    await updateInteractionCount(supabase, user.id, tenantId);

    // Fetch user context for dynamic system prompt
    const { profile: userProfile, context: userContext } = await fetchUserContext(supabase, user.id, tenantId);

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from("ff_conversations")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          channel: "web",
        })
        .select()
        .single();

      if (convError) throw convError;
      convId = newConv.id;
    }

    // Save user message
    await supabase.from("ff_conversation_messages").insert({
      conversation_id: convId,
      tenant_id: tenantId,
      role: "user",
      content: message,
    });

    // Load conversation history
    const { data: history } = await supabase
      .from("ff_conversation_messages")
      .select("role, content, tool_calls, tool_call_id")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build dynamic system prompt with user context
    const systemPrompt = buildSystemPrompt(userProfile, userContext);

    // Build messages array
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
    ];

    // Call AI with tools
    let aiResponse = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: TOOLS,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    let aiData = await aiResponse.json();
    let assistantMessage = aiData.choices?.[0]?.message;

    // Handle tool calls (loop until no more tool calls)
    while (assistantMessage?.tool_calls?.length > 0) {
      console.log("Tool calls:", JSON.stringify(assistantMessage.tool_calls));

      // Save assistant message with tool calls
      await supabase.from("ff_conversation_messages").insert({
        conversation_id: convId,
        tenant_id: tenantId,
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: assistantMessage.tool_calls,
      });

      // Execute each tool call
      const toolResults: any[] = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        const result = await executeTool(
          toolCall.function.name,
          args,
          supabase,
          tenantId,
          user.id
        );

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });

        // Save tool result
        await supabase.from("ff_conversation_messages").insert({
          conversation_id: convId,
          tenant_id: tenantId,
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });
      }

      // Continue conversation with tool results
      messages.push(assistantMessage);
      messages.push(...toolResults);

      aiResponse = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          tools: TOOLS,
          stream: false,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI error on tool follow-up: ${aiResponse.status}`);
      }

      aiData = await aiResponse.json();
      assistantMessage = aiData.choices?.[0]?.message;
    }

    // Save final assistant response
    const finalContent = assistantMessage?.content || "Desculpe, não consegui processar sua solicitação.";
    await supabase.from("ff_conversation_messages").insert({
      conversation_id: convId,
      tenant_id: tenantId,
      role: "assistant",
      content: finalContent,
    });

    return new Response(
      JSON.stringify({
        conversationId: convId,
        message: finalContent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
