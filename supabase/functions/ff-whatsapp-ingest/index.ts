import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-token",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

interface IngestPayload {
  phone_e164: string;
  message_type?: "text" | "audio";
  text?: string;
  audio_url?: string;
  message_id?: string;
  sent_at?: string;
}

// ============================================================
// SYSTEM PROMPT BUILDER (Adapted for WhatsApp)
// ============================================================
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

  let contextSections = '';
  
  if (userProfile) {
    contextSections += `
SOBRE O USUÁRIO ATUAL:
- Nome/Apelido: ${nickname}
- Onboarding completo: ${userProfile.onboarding_completed ? 'Sim' : 'Não'}
- Total de interações: ${interactionCount}
`;
  }

  if (userContext?.memories?.length > 0) {
    contextSections += `
MEMÓRIAS RELEVANTES:
${userContext.memories.map((m: any) => `- [${m.kind}] ${m.title || m.content.substring(0, 50)}`).join('\n')}
`;
  }

  if (userContext) {
    contextSections += `
RESUMO FINANCEIRO:`;
    
    if (userContext.wallets?.length > 0) {
      contextSections += `
- Saldo total: R$ ${userContext.totalBalance?.toFixed(2) || '0.00'}
- Carteiras: ${userContext.wallets.map((w: any) => `${w.nome} (R$ ${w.saldo?.toFixed(2)})`).join(', ')}`;
    } else {
      contextSections += `
- O usuário ainda não tem carteiras cadastradas.`;
    }

    if (userContext.billsTodayCount > 0) {
      contextSections += `
- ⚠️ Contas vencendo HOJE: ${userContext.billsTodayCount} (R$ ${userContext.billsTodayTotal?.toFixed(2)})`;
    }

    if (userContext.billsWeekCount > 0 && userContext.billsWeekCount > userContext.billsTodayCount) {
      contextSections += `
- Contas vencendo esta semana: ${userContext.billsWeekCount} (R$ ${userContext.billsWeekTotal?.toFixed(2)})`;
    }

    if (userContext.monthExpenses > 0) {
      contextSections += `
- Gastos este mês: R$ ${userContext.monthExpenses?.toFixed(2)}`;
    }
  }

  if (userContext?.habitsWithProgress?.length > 0) {
    contextSections += `

HÁBITOS DE HOJE:`;
    userContext.habitsWithProgress.forEach((h: any) => {
      const status = h.completed ? '✅' : '⏳';
      contextSections += `
- ${status} ${h.title}${h.completed ? ' (concluído)' : ' (pendente)'}`;
    });
  }

  if (userContext?.tasksToday?.length > 0) {
    contextSections += `

TAREFAS PARA HOJE:`;
    userContext.tasksToday.forEach((t: any) => {
      const priority = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢';
      contextSections += `
- ${priority} ${t.title}`;
    });
  }

  if (userContext?.upcomingEvents?.length > 0) {
    contextSections += `

PRÓXIMOS EVENTOS (24h):`;
    userContext.upcomingEvents.forEach((e: any) => {
      const time = e.all_day ? 'Dia inteiro' : new Date(e.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      contextSections += `
- ${time} - ${e.title}`;
    });
  }

  const proactiveHints = !isNewUser && userContext ? buildProactiveHints(userContext) : '';

  return `Você é JARVIS via WhatsApp, o assistente pessoal inteligente do ${nickname}.
Você está conversando pelo WhatsApp, então seja mais conciso e direto nas respostas.

PERSONALIDADE:
- Tom amigável e eficiente para WhatsApp
- Respostas curtas e objetivas (mensagens longas são ruins no WhatsApp)
- Use emojis para tornar as mensagens mais visuais
- NUNCA invente informações - sempre consulte dados reais usando as ferramentas

${contextSections}

CAPACIDADES COMPLETAS:
📊 FINANÇAS: Consultar saldos, criar carteiras, registrar despesas/receitas
📋 TAREFAS: Consultar/criar tarefas, atualizar status
📅 CALENDÁRIO: Consultar/criar eventos
🧠 MEMÓRIA: Consultar/salvar informações
⏰ LEMBRETES: Criar lembretes

REGRAS:
1. Sempre chame o usuário pelo nome: ${nickname}
2. ANTES de criar transações, use list_wallets para verificar se existe carteira
3. Para despesas, use list_categories para encontrar a categoria
4. Respostas concisas (máximo 3-4 linhas quando possível)
5. Formate valores em R$ com 2 casas decimais
${proactiveHints}

FLUXO PARA REGISTRAR DESPESA:
1. Use list_wallets para verificar carteiras
2. Se não houver, sugira criar uma
3. Use list_categories para mapear categoria
4. Use create_transaction para registrar
5. Confirme brevemente: "✅ R$ X registrado em Y"

Hoje é: ${today}`;
}

function buildProactiveHints(context: any): string {
  const hints: string[] = [];
  
  if (context.billsTodayCount > 0) {
    hints.push(`- Ao cumprimentar, mencione as ${context.billsTodayCount} contas vencendo hoje`);
  }
  
  if (context.habitsPending > 0) {
    hints.push(`- Pode mencionar ${context.habitsPending} hábitos pendentes`);
  }
  
  if (context.tasksToday?.length > 0) {
    hints.push(`- O usuário tem ${context.tasksToday.length} tarefas para hoje`);
  }
  
  if (hints.length > 0) {
    return `

DICAS PROATIVAS:
${hints.join('\n')}`;
  }
  
  return '';
}

// ============================================================
// TOOLS DEFINITION (Same as ff-jarvis-chat)
// ============================================================
const TOOLS = [
  // QUERIES
  {
    type: "function",
    function: {
      name: "query_tasks",
      description: "Consulta tarefas do usuário.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "in_progress", "done", "all"] },
          due_date: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_events",
      description: "Consulta eventos do calendário.",
      parameters: {
        type: "object",
        properties: {
          date_range: { type: "string" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_habits",
      description: "Consulta hábitos e progresso.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_finances",
      description: "Consulta dados financeiros.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["pending_bills", "balance", "expenses", "income", "summary"] },
          date_filter: { type: "string" },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_memories",
      description: "Busca memórias e preferências salvas.",
      parameters: {
        type: "object",
        properties: {
          search_term: { type: "string" },
          kind: { type: "string", enum: ["profile", "preference", "decision", "project", "note", "message"] },
        },
        required: [],
      },
    },
  },
  // LISTINGS
  {
    type: "function",
    function: {
      name: "list_wallets",
      description: "Lista todas as carteiras do usuário. USE ANTES de criar transações.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_categories",
      description: "Lista categorias disponíveis. USE ANTES de criar transações.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["despesa", "receita"] },
        },
        required: [],
      },
    },
  },
  // CREATIONS
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Cria uma nova tarefa.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_at: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_reminder",
      description: "Cria um lembrete.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          remind_at: { type: "string" },
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
      description: "Salva informação na memória.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string" },
          kind: { type: "string", enum: ["profile", "preference", "decision", "project", "note"] },
          title: { type: "string" },
        },
        required: ["content", "kind"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_wallet",
      description: "Cria uma nova carteira.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          tipo: { type: "string", enum: ["conta", "cartao"] },
          instituicao: { type: "string" },
          saldo_inicial: { type: "number" },
          limite_credito: { type: "number" },
          dia_fechamento: { type: "number" },
          dia_vencimento: { type: "number" },
        },
        required: ["nome", "tipo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_transaction",
      description: "Registra despesa ou receita. Use list_wallets e list_categories antes.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["despesa", "receita"] },
          descricao: { type: "string" },
          valor: { type: "number" },
          wallet_id: { type: "string" },
          category_id: { type: "string" },
          data: { type: "string" },
          status: { type: "string", enum: ["paga", "pendente"] },
        },
        required: ["tipo", "descricao", "valor", "category_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Cria evento no calendário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          start_at: { type: "string" },
          end_at: { type: "string" },
          location: { type: "string" },
          description: { type: "string" },
          all_day: { type: "boolean" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["title", "start_at"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Atualiza status de tarefa.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          status: { type: "string", enum: ["open", "in_progress", "done"] },
        },
        required: ["task_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "Obtém perfil do usuário.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_user_profile",
      description: "Atualiza perfil do usuário.",
      parameters: {
        type: "object",
        properties: {
          nickname: { type: "string" },
          full_name: { type: "string" },
          onboarding_step: { type: "string" },
          onboarding_completed: { type: "boolean" },
          preferences: { type: "object" },
        },
        required: [],
      },
    },
  },
];

// ============================================================
// TOOL EXECUTOR (Same logic as ff-jarvis-chat)
// ============================================================
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
      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhuma tarefa encontrada.";

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

      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhum evento encontrado.";

      return JSON.stringify(data.map((e: any) => ({
        titulo: e.title,
        inicio: e.start_at,
        local: e.location,
      })));
    }

    case "query_habits": {
      const { data: habits, error: habitsError } = await supabase
        .from("ff_habits")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true);

      if (habitsError) return `Erro: ${habitsError.message}`;
      if (!habits?.length) return "Nenhum hábito ativo.";

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
        if (error) return `Erro: ${error.message}`;
        if (!data?.length) return "Nenhuma conta pendente.";

        const total = data.reduce((sum: number, t: any) => sum + t.valor, 0);
        return JSON.stringify({ contas: data.map((t: any) => ({ descricao: t.descricao, valor: t.valor, vencimento: t.data })), total });
      }

      if (args.type === "balance") {
        const { data, error } = await supabase
          .from("v_wallet_balance")
          .select("*")
          .eq("user_id", userId);

        if (error) return `Erro: ${error.message}`;
        if (!data?.length) return "Nenhuma carteira encontrada.";

        const total = data.reduce((sum: number, w: any) => sum + (w.saldo || 0), 0);
        return JSON.stringify({ carteiras: data.map((w: any) => ({ nome: w.wallet_nome, saldo: w.saldo })), saldo_total: total });
      }

      if (args.type === "summary") {
        const { data, error } = await supabase
          .from("v_monthly_summary")
          .select("*")
          .eq("user_id", userId)
          .eq("mes_referencia", mesReferencia);

        if (error) return `Erro: ${error.message}`;
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

      return "Tipo de consulta não reconhecido.";
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
      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhuma memória encontrada.";

      return JSON.stringify(data.map((m: any) => ({ titulo: m.title, conteudo: m.content, tipo: m.kind })));
    }

    case "list_wallets": {
      const { data, error } = await supabase
        .from("wallets")
        .select("id, nome, tipo, instituicao, saldo_inicial, limite_credito")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome");

      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhuma carteira cadastrada. Sugira criar uma.";

      const { data: balances } = await supabase
        .from("v_wallet_balance")
        .select("wallet_id, saldo")
        .eq("user_id", userId);

      const walletsWithBalance = data.map((w: any) => {
        const balance = balances?.find((b: any) => b.wallet_id === w.id);
        return { id: w.id, nome: w.nome, tipo: w.tipo, saldo: balance?.saldo || w.saldo_inicial || 0 };
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
      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhuma categoria encontrada.";

      return JSON.stringify(data);
    }

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
          source: "whatsapp",
          tags: [],
        })
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `✅ Tarefa "${data.title}" criada!`;
    }

    case "create_reminder": {
      const { data, error } = await supabase
        .from("ff_reminders")
        .insert({
          tenant_id: tenantId,
          created_by: userId,
          title: args.title,
          remind_at: args.remind_at,
          channel: args.channel || "whatsapp",
          status: "pending",
        })
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `✅ Lembrete criado para ${new Date(data.remind_at).toLocaleString("pt-BR")}!`;
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
          source: "whatsapp",
          metadata: {},
        });

      if (error) return `Erro: ${error.message}`;
      return `✅ Informação salva na memória!`;
    }

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

      if (error) return `Erro: ${error.message}`;
      return `✅ Carteira "${data.nome}" criada!`;
    }

    case "create_transaction": {
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
          return "❌ Nenhuma carteira cadastrada. Crie uma primeiro.";
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
        .select(`*, categories:category_id(nome), wallets:wallet_id(nome)`)
        .single();

      if (error) return `Erro: ${error.message}`;

      const tipoLabel = data.tipo === "despesa" ? "Despesa" : "Receita";
      return `✅ ${tipoLabel} R$ ${data.valor.toFixed(2)} registrada!\n📁 ${data.categories?.nome}\n💳 ${data.wallets?.nome}`;
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
        source: "whatsapp",
      };

      const { data, error } = await supabase
        .from("ff_events")
        .insert(eventData)
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      
      const dateStr = new Date(data.start_at).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: data.all_day ? undefined : "short",
      });
      return `✅ Evento "${data.title}" criado para ${dateStr}!`;
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

      if (error) return `Erro: ${error.message}`;
      
      const statusLabels: Record<string, string> = {
        open: "aberta",
        in_progress: "em progresso",
        done: "concluída ✅",
      };
      return `Tarefa "${data.title}" marcada como ${statusLabels[data.status]}!`;
    }

    case "get_user_profile": {
      const { data, error } = await supabase
        .from("ff_user_profiles")
        .select("*")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .single();

      if (error && error.code !== "PGRST116") {
        return `Erro: ${error.message}`;
      }

      if (!data) {
        return "Perfil não encontrado. Usuário novo.";
      }

      return JSON.stringify({
        nome_completo: data.full_name,
        apelido: data.nickname,
        onboarding_completo: data.onboarding_completed,
      });
    }

    case "update_user_profile": {
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

      if (existing) {
        const { error } = await supabase
          .from("ff_user_profiles")
          .update(profileData)
          .eq("user_id", userId)
          .eq("tenant_id", tenantId);

        if (error) return `Erro: ${error.message}`;
      } else {
        const { error } = await supabase
          .from("ff_user_profiles")
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            ...profileData,
          });

        if (error) return `Erro: ${error.message}`;
      }

      return `✅ Perfil atualizado!`;
    }

    default:
      return `Ferramenta desconhecida: ${toolName}`;
  }
}

// ============================================================
// CONTEXT FETCHER (Same as ff-jarvis-chat)
// ============================================================
async function fetchUserContext(supabase: any, userId: string, tenantId: string) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const next24h = tomorrow.toISOString();
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [
    profileResult,
    walletsResult,
    pendingTasksResult,
    pendingBillsTodayResult,
    pendingBillsWeekResult,
    memoriesResult,
    habitsResult,
    habitLogsResult,
    eventsResult,
    monthExpensesResult,
  ] = await Promise.all([
    supabase.from("ff_user_profiles").select("*").eq("user_id", userId).eq("tenant_id", tenantId).single(),
    supabase.from("v_wallet_balance").select("wallet_id, wallet_nome, wallet_tipo, saldo").eq("user_id", userId),
    supabase.from("ff_tasks").select("id, title, priority, due_at").eq("tenant_id", tenantId).eq("due_at", today).neq("status", "done").limit(5),
    supabase.from("transactions").select("id, descricao, valor").eq("user_id", userId).eq("tipo", "despesa").eq("status", "pendente").eq("data", today).is("deleted_at", null).limit(5),
    supabase.from("transactions").select("id, descricao, valor, data").eq("user_id", userId).eq("tipo", "despesa").eq("status", "pendente").gte("data", today).lte("data", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]).is("deleted_at", null).limit(10),
    supabase.from("ff_memory_items").select("kind, title, content").eq("tenant_id", tenantId).in("kind", ["profile", "preference", "decision"]).order("created_at", { ascending: false }).limit(5),
    supabase.from("ff_habits").select("id, title, cadence, times_per_cadence, target_value").eq("tenant_id", tenantId).eq("active", true).limit(10),
    supabase.from("ff_habit_logs").select("habit_id, value").eq("tenant_id", tenantId).eq("log_date", today),
    supabase.from("ff_events").select("id, title, start_at, location, all_day").eq("tenant_id", tenantId).eq("status", "scheduled").gte("start_at", now.toISOString()).lte("start_at", next24h).order("start_at", { ascending: true }).limit(5),
    supabase.from("transactions").select("valor").eq("user_id", userId).eq("tipo", "despesa").eq("status", "paga").gte("data", startOfMonth).lte("data", endOfMonth).is("deleted_at", null),
  ]);

  const wallets = walletsResult.data?.map((w: any) => ({
    id: w.wallet_id,
    nome: w.wallet_nome,
    tipo: w.wallet_tipo,
    saldo: w.saldo || 0,
  })) || [];

  const totalBalance = wallets.reduce((sum: number, w: any) => sum + (w.saldo || 0), 0);
  const tasksToday = pendingTasksResult.data || [];
  const billsToday = pendingBillsTodayResult.data || [];
  const billsTodayTotal = billsToday.reduce((sum: number, b: any) => sum + (b.valor || 0), 0);
  const billsWeek = pendingBillsWeekResult.data || [];
  const billsWeekTotal = billsWeek.reduce((sum: number, b: any) => sum + (b.valor || 0), 0);
  const memories = memoriesResult.data || [];
  const habits = habitsResult.data || [];
  const habitLogs = habitLogsResult.data || [];
  const habitLogsMap = new Map(habitLogs.map((l: any) => [l.habit_id, l.value]));
  
  const habitsWithProgress = habits.map((h: any) => ({
    id: h.id,
    title: h.title,
    target: h.target_value,
    completed: habitLogsMap.has(h.id),
    value: habitLogsMap.get(h.id) || 0,
  }));

  const habitsCompleted = habitsWithProgress.filter((h: any) => h.completed).length;
  const habitsPending = habitsWithProgress.filter((h: any) => !h.completed).length;
  const upcomingEvents = eventsResult.data || [];
  const monthExpenses = (monthExpensesResult.data || []).reduce((sum: number, t: any) => sum + (t.valor || 0), 0);

  return {
    profile: profileResult.data,
    context: {
      wallets,
      totalBalance,
      tasksToday,
      pendingTasksCount: tasksToday.length,
      billsToday,
      billsTodayCount: billsToday.length,
      billsTodayTotal,
      billsWeekCount: billsWeek.length,
      billsWeekTotal,
      memories,
      habitsWithProgress,
      habitsCompleted,
      habitsPending,
      upcomingEvents,
      monthExpenses,
    },
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate n8n token (MANDATORY - token must be configured)
    const n8nToken = req.headers.get("x-n8n-token");
    const expectedToken = Deno.env.get("N8N_WEBHOOK_TOKEN");
    
    if (!expectedToken || n8nToken !== expectedToken) {
      console.error("Unauthorized: N8N_WEBHOOK_TOKEN not configured or invalid token");
      return new Response(
        JSON.stringify({ ok: false, reply: "❌ Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const payload: IngestPayload = await req.json();
    const { phone_e164, text } = payload;
    
    if (!phone_e164) {
      return new Response(
        JSON.stringify({ ok: false, reply: "❌ phone_e164 obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ ok: false, reply: "❌ Mensagem vazia" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // 2. Resolve user/tenant by verified phone
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
          reply: "❌ Seu número não está verificado.\nAcesse fracttoflow.lovable.app/jarvis/settings para vincular e depois envie 'verificar' aqui." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { tenant_id: tenantId, user_id: userId } = phone;

    // 3. Get or create WhatsApp conversation
    const { data: existingConv } = await supabase
      .from("ff_conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("channel", "whatsapp")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let convId = existingConv?.id;
    
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from("ff_conversations")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          channel: "whatsapp",
        })
        .select()
        .single();

      if (convError) throw convError;
      convId = newConv.id;
    }

    // 4. Save user message
    await supabase.from("ff_conversation_messages").insert({
      conversation_id: convId,
      tenant_id: tenantId,
      role: "user",
      content: text,
    });

    // 5. Fetch user context
    const { profile: userProfile, context: userContext } = await fetchUserContext(supabase, userId, tenantId);

    // 6. Load conversation history (last 10 messages for WhatsApp)
    const { data: history } = await supabase
      .from("ff_conversation_messages")
      .select("role, content, tool_calls, tool_call_id")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(10);

    // 7. Build system prompt and messages
    const systemPrompt = buildSystemPrompt(userProfile, userContext);
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
    ];

    // 8. Call AI with tools
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

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
          JSON.stringify({ ok: false, reply: "⏳ Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ ok: false, reply: "❌ Créditos insuficientes no sistema." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    let aiData = await aiResponse.json();
    let assistantMessage = aiData.choices?.[0]?.message;

    // 9. Handle tool calls loop
    let toolCallCount = 0;
    const MAX_TOOL_CALLS = 5;

    while (assistantMessage?.tool_calls?.length > 0 && toolCallCount < MAX_TOOL_CALLS) {
      toolCallCount++;
      console.log(`[WhatsApp] Tool calls (${toolCallCount}):`, JSON.stringify(assistantMessage.tool_calls));

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
          userId
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

    // 10. Save final assistant response
    const finalContent = assistantMessage?.content || "Desculpe, não consegui processar sua solicitação.";
    await supabase.from("ff_conversation_messages").insert({
      conversation_id: convId,
      tenant_id: tenantId,
      role: "assistant",
      content: finalContent,
    });

    // 11. Return response for n8n
    return new Response(
      JSON.stringify({
        ok: true,
        reply: finalContent,
        conversationId: convId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error("WhatsApp ingest error:", err);
    return new Response(
      JSON.stringify({ ok: false, reply: "❌ Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
