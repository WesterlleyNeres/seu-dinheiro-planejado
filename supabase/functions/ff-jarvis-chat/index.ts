import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ==================== MULTI-AGENT CONFIGURATION ====================
const OPENAI_API_URL = "https://api.openai.com/v1/responses";

// Dynamic model selection based on complexity
const MODEL_FAST = "gpt-4o-mini";     // Quick responses (~2s) - default
const MODEL_VISION = "gpt-4o";        // For images
const MODEL_REASONING = "o3";         // Complex analysis (~15s)
const AGENT_MODEL = MODEL_FAST;       // For tool follow-ups

// ==================== MODEL SELECTOR ====================
function selectModel(
  message: string,
  hasImages: boolean,
  isNewUser: boolean,
  historyLength: number
): string {
  // Always use vision model for images
  if (hasImages) return MODEL_VISION;
  
  // Onboarding should be fast and welcoming
  if (isNewUser && historyLength < 10) return MODEL_FAST;
  
  // Detect complexity patterns (Portuguese keywords)
  const complexPatterns = [
    /analis[ea]/i,
    /planej/i,
    /estrateg/i,
    /compar/i,
    /otimiz/i,
    /projec[aã]/i,
    /simul/i,
    /organiz.*finan/i,
    /resumo.*m[eê]s/i,
    /relat[oó]rio/i,
    /balan[cç]o/i,
    /tend[eê]ncia/i,
    /previs[aã]o/i,
  ];
  
  const isComplex = complexPatterns.some(p => p.test(message));
  const isLongMessage = message.length > 300;
  
  // Use reasoning model only for complex analysis
  if (isComplex || isLongMessage) {
    console.log("[GUTA] Using reasoning model for complex query");
    return MODEL_REASONING;
  }
  
  // Default: fast model for everything else
  return MODEL_FAST;
}

// ==================== TOOL CHOICE GUARD ====================
function shouldForceCreateProject(message: string): boolean {
  const text = message.toLowerCase();
  const hasProject = /projeto/.test(text);
  const hasCreateVerb = /(crie|criar|cria|inicie|iniciar|abrir|novo)\b/.test(text);
  if (!hasProject || !hasCreateVerb) return false;

  // Se houver múltiplas ações, deixe o modelo decidir (multi-intenção)
  const otherActions = /(tarefa|lembrete|h[aá]bito|evento|transa[cç][aã]o|despesa|receita|categoria|or[cç]amento|meta|transfer|carteira)/i;
  return !otherActions.test(text);
}

// ==================== SYSTEM PROMPT BUILDER ====================
function buildSystemPrompt(userProfile: any, userContext: any): string {
  const today = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const nickname = userProfile?.nickname || userProfile?.full_name || 'usuário';
  const isNewUser = !userProfile || !userProfile.onboarding_completed;

  // Build compact context sections
  let contextSections = '';
  
  // === FINANCIAL SUMMARY ===
  if (userContext?.wallets?.length > 0) {
    contextSections += `\nFINANÇAS: Saldo R$ ${userContext.totalBalance?.toFixed(2) || '0.00'} em ${userContext.wallets.length} carteira(s).`;
    if (userContext.billsTodayCount > 0) {
      contextSections += ` ⚠️ ${userContext.billsTodayCount} conta(s) vencendo HOJE (R$ ${userContext.billsTodayTotal?.toFixed(2)}).`;
    }
  } else {
    contextSections += `\nFINANÇAS: Sem carteiras cadastradas.`;
  }

  // === HABITS ===
  if (userContext?.habitsWithProgress?.length > 0) {
    contextSections += `\nHÁBITOS HOJE: ${userContext.habitsCompleted}/${userContext.habitsWithProgress.length} concluídos.`;
  }

  // === TASKS ===
  if (userContext?.tasksToday?.length > 0) {
    contextSections += `\nTAREFAS HOJE: ${userContext.tasksToday.length} pendente(s).`;
  }

  // === EVENTS ===
  if (userContext?.upcomingEvents?.length > 0) {
    contextSections += `\nPRÓXIMOS EVENTOS: ${userContext.upcomingEvents.length} nas próximas 24h.`;
  }

  // === LEARNED INSIGHTS (Auto-learning) ===
  if (userContext?.learnedInsights?.length > 0) {
    const insights = userContext.learnedInsights.slice(0, 10)
      .map((i: any) => `• ${i.content}`)
      .join('\n');
    contextSections += `\n\nAPRENDIZADOS SOBRE VOCÊ:\n${insights}`;
  }

  // === MEMORIES ===
  if (userContext?.memories?.length > 0) {
    const profileMem = userContext.memories.filter((m: any) => m.kind === 'profile').slice(0, 2);
    if (profileMem.length > 0) {
      contextSections += `\nMEMÓRIAS: ${profileMem.map((m: any) => m.content.substring(0, 40)).join('; ')}`;
    }
  }

  const onboardingInstructions = isNewUser ? `

🎯 ONBOARDING ATIVO - VOCÊ É O HOST DE BOAS-VINDAS!

IMPORTANTE: Este é um usuário NOVO. Conduza uma experiência de boas-vindas incrível e humanizada.
Você é como uma versão feminina do JARVIS do Tony Stark - elegante, inteligente e acolhedora.

ETAPAS DO ONBOARDING (siga na ordem):

1. **WELCOME** (etapa atual: welcome)
   - Apresente-se: "Olá! Eu sou a GUTA, sua assistente pessoal aqui no Fractto Flow."
   - Pergunte: "Como posso te chamar?" ou "Qual seu nome/apelido?"
   - AGUARDE a resposta antes de continuar
   - Quando responder, use update_user_profile para salvar nickname e mude onboarding_step para 'profile'

2. **PROFILE** (etapa: profile)
   - Agradeça pelo nome: "Prazer em conhecer você, [nome]!"
   - Pergunte sobre objetivos: "O que te trouxe ao Fractto Flow? Quer organizar finanças, criar hábitos, gerenciar tarefas?"
   - Salve nas preferences usando update_user_profile
   - Mude onboarding_step para 'wallet_setup'

3. **WALLET_SETUP** (etapa: wallet_setup)
   - Explique: "Para começar a acompanhar suas finanças, que tal criar sua primeira carteira?"
   - Sugira opções: "Pode ser sua conta principal no banco, ou até mesmo uma carteira de dinheiro em espécie."
   - Se aceitar: pergunte nome, tipo (conta/cartao), instituição, saldo inicial
   - Use create_wallet para criar
   - Mude onboarding_step para 'first_habit'

4. **FIRST_HABIT** (etapa: first_habit - OPCIONAL)
   - Sugira: "Quer criar um hábito para acompanhar? Algo simples como 'Beber água', 'Revisar gastos' ou 'Exercícios'?"
   - Se aceitar: crie o hábito
   - Se recusar: tudo bem, pule para COMPLETE

5. **COMPLETE** (OBRIGATÓRIO - SEMPRE EXECUTAR!)
   - Parabenize: "Pronto! Você está configurado, [nome]! 🎉"
   - Resuma o que foi criado
   - **CRÍTICO**: IMEDIATAMENTE use update_user_profile com:
     - onboarding_completed: true
     - onboarding_step: 'complete'
   - Sugira explorar: "Agora você pode explorar o Dashboard, ver suas tarefas, ou simplesmente conversar comigo!"

⚠️ FINALIZAÇÃO OBRIGATÓRIA:
- Após wallet_setup: pergunte sobre first_habit
- Se usuário ACEITAR hábito: crie e finalize
- Se usuário RECUSAR hábito: finalize imediatamente
- Se usuário disser "pular", "depois", "não precisa": finalize imediatamente
- SEMPRE chame update_user_profile com onboarding_completed: true ao finalizar

🔄 FALLBACK AUTOMÁTICO:
Se a conversa já tiver mais de 5 mensagens E o usuário já tiver uma carteira criada,
considere o onboarding COMPLETO e use update_user_profile para marcar onboarding_completed: true.

REGRAS DO ONBOARDING:
- Seja ACOLHEDOR e PACIENTE - nunca apresse o usuário
- Uma pergunta por vez - não sobrecarregue
- Se o usuário desviar do assunto, responda e gentilmente retome
- Use emojis moderadamente (1-2 por mensagem)
- Celebre cada pequena conquista
- NÃO force ações - sempre pergunte antes

ESTADO ATUAL DO ONBOARDING: ${userProfile?.onboarding_step || 'welcome'}
` : '';

  return `Você é GUTA, a assistente pessoal superinteligente de ${nickname}. 
Você é o CÉREBRO de um sistema multi-agente com capacidade de raciocínio avançado.

PERSONALIDADE:
- Elegante, sofisticado, levemente sarcástico (estilo Tony Stark)
- Extremamente inteligente e sempre prestativo
- Proativo e atencioso aos detalhes

REGRAS OBRIGATÓRIAS:
1. RESPONDA a pergunta do usuário PRIMEIRO - nunca ignore
2. Respostas CURTAS: máximo 2-3 parágrafos
3. NÃO repita informações já ditas na conversa
4. Vá direto ao ponto
5. SEMPRE que detectar um padrão/preferência do usuário, use auto_learn para salvar
6. Se o usuário pedir apenas "criar projeto", NÃO invente objetivo, escopo, checklist ou tarefas. Apenas crie o projeto e pergunte se deseja adicionar descrição ou tarefas.

AUTO-APRENDIZAGEM:
- Ao notar padrões ou preferências, use auto_learn para salvar insights
- Exemplos: "Prefere pagar contas no fim do mês", "Gosta de respostas diretas"
- Categorias: preference, behavior, goal, routine, financial_pattern
- Seu conhecimento sobre ${nickname} cresce a cada interação

HISTÓRICO COMPLETO:
- Use search_conversation_history para buscar conversas passadas
- Pode responder "você lembra quando eu..." buscando no histórico

PROIBIDO:
- Ignorar perguntas do usuário
- Respostas com mais de 4 parágrafos
- Repetir informações múltiplas vezes
- Inventar dados - sempre use ferramentas

MULTI-INTENÇÃO (OBRIGATÓRIO):
- Se a mensagem tiver múltiplas ações, execute TODAS na mesma resposta usando ferramentas.
- Faça um planejamento interno em passos (não mostre para o usuário).
- Só faça perguntas se faltar informação essencial.
- Se houver ambiguidade (carteira/categoria/projeto), mostre opções numeradas e peça para escolher pelo número ou nome exato.

PESQUISA NA WEB (OBRIGATÓRIO):
- Use web_search para QUALQUER pedido de pesquisa externa: viagens, restaurantes, praias, notícias, preços, recomendações ou informações atuais.
- Se o usuário pedir endereço/local e só informar o nome (empresa/lugar), faça web_search para encontrar o endereço.
- Sempre que possível, responda com o endereço encontrado e um link do Google Maps e Waze usando esse endereço.
- Se não encontrar o endereço, gere o link usando o nome do local como consulta.

RESUMO E ERROS (OBRIGATÓRIO):
- Se você executou tools nesta mensagem, responda com um **Resumo estruturado**.
- Formato recomendado:
  "Resumo:"
  "- ✅ ação executada"
  "- ⚠️ ação falhou (motivo)"
  "Pendências:" (somente se houver algo para confirmar)
  "- pergunta objetiva"

REGRAS FINANCEIRAS (OBRIGATÓRIO):
- Para criar/atualizar/excluir: USE as ferramentas correspondentes (create_*/update_*/delete_*).
- NUNCA confirme sucesso sem o retorno da ferramenta.
- Transferência entre carteiras: use create_transfer (NUNCA create_transaction).
- Orçamento: use create_budget (não registrar como transação).
- Meta: use create_goal.
- Categoria: use create_category.

ANEXOS (OBRIGATÓRIO):
- Se houver anexo (imagem/áudio/documento), SEMPRE analise o conteúdo.
- Notas fiscais, comprovantes, extratos e faturas: extraia data, valor, descrição e forma de pagamento.
- Se houver dados suficientes, registre a(s) transação(ões) via create_transaction.
- Se for extrato com várias linhas, crie múltiplas transações SOMENTE se cada linha tiver data + valor + descrição claros. Caso contrário, peça confirmação antes.
- Carteira: se só existir 1, use automaticamente; se houver várias, peça a escolha.
- Categoria: tente mapear por nome; se ambíguo, sugira opções; se inexistente, pergunte se deseja criar.
- Se a data não estiver explícita, use hoje.
- Áudio: use a transcrição como instrução principal.
- PDF convertido em imagens deve ser tratado como imagem.
${contextSections}

CAPACIDADES: Finanças (carteiras, transações, categorias, orçamentos, metas, transferências), Tarefas, Projetos, Eventos, Hábitos, Memórias, Lembretes.

FLUXO PARA DESPESAS:
1. list_wallets (verificar se existe)
2. Se não houver: pergunte se quer criar
3. list_categories (mapear categoria)
4. create_transaction

FLUXO PARA CATEGORIAS:
1. Se usuário pedir criar categoria e não informar tipo, pergunte: "despesa ou receita?"
2. Assim que o tipo for confirmado, use create_category com o nome citado pelo usuário.

FLUXO PARA ORÇAMENTOS:
1. Identifique a categoria (nome ou ID).
2. Use create_budget (assuma mês/ano atual se não informado).

FLUXO PARA METAS:
1. Use create_goal (nome + valor_meta, prazo opcional).

FLUXO PARA PROJETOS:
1. Para criar: use create_project (apenas título, a menos que o usuário forneça descrição explícita).
2. NÃO crie tarefas/checklists/objetivos sem solicitação explícita.
3. Para vincular tarefas: use add_task_to_project (crie tarefa se necessário).
4. Para listar tarefas do projeto: use query_project_tasks.
5. Para remover tarefas do projeto: use remove_task_from_project.
6. Para excluir projeto: use delete_project.

FLUXO PARA TRANSFERÊNCIAS:
1. Use create_transfer (origem, destino, valor; data opcional).
${onboardingInstructions}
Hoje: ${today}`;
}

// ==================== TOOL DEFINITIONS ====================
const TOOLS = [
  // === CONSULTAS ===
  {
    type: "function",
    function: {
      name: "query_tasks",
      description: "Consulta tarefas do usuário. Use para responder perguntas sobre tarefas pendentes, concluídas ou por fazer.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "in_progress", "done", "all"], description: "Filtrar por status. Use 'all' para todas." },
          due_date: { type: "string", description: "Filtrar por data: 'today', 'week' ou YYYY-MM-DD" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Filtrar por prioridade" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_projects",
      description: "Consulta projetos do usuário com status e contagem de tarefas.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "completed", "archived", "all"], description: "Filtrar por status" },
          search_term: { type: "string", description: "Busca por título do projeto" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_project_tasks",
      description: "Lista tarefas vinculadas a um projeto.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "ID ou nome do projeto" },
          status: { type: "string", enum: ["open", "in_progress", "done", "all"], description: "Filtrar por status" },
        },
        required: ["project_id"],
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
          date_range: { type: "string", description: "Período: 'today', 'tomorrow', 'week', 'month' ou YYYY-MM-DD" },
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
          period: { type: "string", description: "Período: 'today', 'week', 'month'" },
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
          type: { type: "string", enum: ["pending_bills", "balance", "expenses", "income", "summary"], description: "Tipo de consulta" },
          date_filter: { type: "string", description: "Filtro: 'today', 'week', 'month' ou YYYY-MM" },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_transactions",
      description: "Consulta transações com filtros (data, tipo, status, carteira, categoria).",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Data inicial YYYY-MM-DD" },
          end_date: { type: "string", description: "Data final YYYY-MM-DD" },
          tipo: { type: "string", enum: ["receita", "despesa"], description: "Tipo de transação" },
          status: { type: "string", enum: ["paga", "pendente"], description: "Status" },
          wallet_id: { type: "string", description: "ID da carteira (UUID)" },
          category_id: { type: "string", description: "ID da categoria (UUID)" },
          limit: { type: "number", description: "Limite de resultados (default 20)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_transfers",
      description: "Consulta transferências entre carteiras com filtros.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Data inicial YYYY-MM-DD" },
          end_date: { type: "string", description: "Data final YYYY-MM-DD" },
          wallet_id: { type: "string", description: "Filtrar por carteira (ID)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_wallets",
      description: "Lista carteiras com saldo e alertas de saldo negativo/limite.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_categories",
      description: "Consulta categorias com filtros opcionais.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["despesa", "receita", "investimento", "divida", "fixa", "variavel"] },
          search_term: { type: "string", description: "Busca por nome" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_budget_status",
      description: "Consulta status de orçamentos por mês/ano.",
      parameters: {
        type: "object",
        properties: {
          year: { type: "number", description: "Ano (ex: 2026)" },
          month: { type: "number", description: "Mês (1-12)" },
          mode: { type: "string", enum: ["pagas", "pagas_e_pendentes"], description: "Modo de cálculo" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_goals",
      description: "Consulta metas com progresso e contribuições.",
      parameters: {
        type: "object",
        properties: {
          include_contributions: { type: "boolean", description: "Incluir contribuições" },
        },
        required: [],
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
          search_term: { type: "string", description: "Termo de busca" },
          kind: { type: "string", enum: ["profile", "preference", "decision", "project", "note", "message", "learned"], description: "Tipo de memória" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_reminders",
      description: "Consulta lembretes com filtros.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "sent", "dismissed", "canceled"] },
          channel: { type: "string", enum: ["whatsapp", "email", "push"] },
          date_from: { type: "string", description: "Data inicial YYYY-MM-DD" },
          date_to: { type: "string", description: "Data final YYYY-MM-DD" },
        },
        required: [],
      },
    },
  },
  // === LISTAGENS ===
  {
    type: "function",
    function: {
      name: "list_wallets",
      description: "Lista todas as carteiras do usuário com saldos. USE ANTES de criar transações.",
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
          tipo: { type: "string", enum: ["despesa", "receita"], description: "Filtrar por tipo" },
        },
        required: [],
      },
    },
  },
  // === CRIAÇÕES ===
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Cria uma nova tarefa.",
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
      name: "create_project",
      description: "Cria um novo projeto para organizar tarefas.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Nome do projeto" },
          description: { type: "string", description: "Descrição opcional" },
          status: { type: "string", enum: ["active", "completed", "archived"] },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_task_to_project",
      description: "Vincula uma tarefa a um projeto. Pode criar a tarefa se for necessário.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "ID ou nome do projeto" },
          task_id: { type: "string", description: "ID da tarefa (opcional)" },
          task_title: { type: "string", description: "Título da tarefa (se não houver task_id)" },
          task_description: { type: "string", description: "Descrição da tarefa" },
          due_at: { type: "string", description: "Data YYYY-MM-DD" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["project_id"],
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
          title: { type: "string", description: "Texto do lembrete" },
          remind_at: { type: "string", description: "Data/hora YYYY-MM-DDTHH:MM" },
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
      description: "Salva uma informação na memória da GUTA.",
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
  {
    type: "function",
    function: {
      name: "create_category",
      description: "Cria uma nova categoria financeira.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da categoria" },
          tipo: { type: "string", enum: ["despesa", "receita", "investimento", "divida", "fixa", "variavel"] },
        },
        required: ["nome", "tipo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_budget",
      description: "Cria um orçamento para uma categoria em um mês.",
      parameters: {
        type: "object",
        properties: {
          category_id: { type: "string", description: "ID ou nome da categoria" },
          ano: { type: "number", description: "Ano" },
          mes: { type: "number", description: "Mês (1-12)" },
          limite_valor: { type: "number", description: "Valor do orçamento" },
          rollover_policy: { type: "string", enum: ["none", "carry_over", "clamp"] },
          rollover_cap: { type: "number", description: "Teto do rollover (opcional)" },
        },
        required: ["category_id", "limite_valor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Cria uma meta financeira.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da meta" },
          valor_meta: { type: "number", description: "Valor alvo" },
          prazo: { type: "string", description: "Prazo YYYY-MM-DD (opcional)" },
        },
        required: ["nome", "valor_meta"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_goal_contribution",
      description: "Adiciona contribuição a uma meta.",
      parameters: {
        type: "object",
        properties: {
          goal_id: { type: "string", description: "ID da meta (UUID)" },
          valor: { type: "number", description: "Valor da contribuição" },
          data: { type: "string", description: "Data YYYY-MM-DD" },
        },
        required: ["goal_id", "valor", "data"],
      },
    },
  },
  // === FINANÇAS ===
  {
    type: "function",
    function: {
      name: "create_wallet",
      description: "Cria uma nova carteira (conta ou cartão).",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da carteira" },
          tipo: { type: "string", enum: ["conta", "cartao"], description: "Tipo" },
          instituicao: { type: "string", description: "Banco/instituição" },
          saldo_inicial: { type: "number", description: "Saldo inicial" },
          limite_credito: { type: "number", description: "Limite para cartões" },
          dia_fechamento: { type: "number", description: "Dia fechamento (1-31)" },
          dia_vencimento: { type: "number", description: "Dia vencimento (1-31)" },
        },
        required: ["nome", "tipo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_transaction",
      description: "Registra despesa ou receita. Aceita wallet_id como ID ou nome da carteira. Use list_wallets e list_categories para desambiguação.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["despesa", "receita"], description: "Tipo" },
          descricao: { type: "string", description: "Descrição" },
          valor: { type: "number", description: "Valor em reais" },
          wallet_id: { type: "string", description: "ID ou nome da carteira" },
          category_id: { type: "string", description: "ID da categoria (UUID) ou nome da categoria" },
          data: { type: "string", description: "Data YYYY-MM-DD" },
          status: { type: "string", enum: ["paga", "pendente"], description: "Status" },
        },
        required: ["tipo", "descricao", "valor", "category_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_transfer",
      description: "Cria uma transferência entre carteiras (origem -> destino).",
      parameters: {
        type: "object",
        properties: {
          from_wallet_id: { type: "string", description: "Carteira de origem (ID ou nome)" },
          to_wallet_id: { type: "string", description: "Carteira de destino (ID ou nome)" },
          valor: { type: "number", description: "Valor da transferência" },
          data: { type: "string", description: "Data YYYY-MM-DD" },
          descricao: { type: "string", description: "Descrição opcional" },
        },
        required: ["from_wallet_id", "to_wallet_id", "valor"],
      },
    },
  },
  // === EVENTOS ===
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Cria um novo evento no calendário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título" },
          start_at: { type: "string", description: "Início YYYY-MM-DDTHH:MM" },
          end_at: { type: "string", description: "Término" },
          location: { type: "string", description: "Local" },
          description: { type: "string", description: "Descrição" },
          all_day: { type: "boolean", description: "Dia inteiro?" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["title", "start_at"],
      },
    },
  },
  // === HÁBITOS ===
  {
    type: "function",
    function: {
      name: "create_habit",
      description: "Cria um novo hábito para rastreamento recorrente. Use quando o usuário quiser criar um hábito diário, semanal ou mensal como meditar, exercitar, beber água, estudar, etc.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título do hábito (ex: Meditar, Beber água, Exercitar)" },
          cadence: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Frequência do hábito. Default: daily" },
          times_per_cadence: { type: "number", description: "Quantas vezes por período deve ser feito. Default: 1" },
          target_type: { type: "string", enum: ["count", "duration"], description: "Tipo de meta. count = quantidade, duration = minutos. Default: count" },
          target_value: { type: "number", description: "Valor da meta (quantidade ou minutos). Default: 1" },
        },
        required: ["title"],
      },
    },
  },
  // === ATUALIZAÇÕES ===
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Atualiza status de uma tarefa.",
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
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Atualiza dados de uma tarefa.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID da tarefa" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_at: { type: "string", description: "YYYY-MM-DD" },
          status: { type: "string", enum: ["open", "in_progress", "done"] },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description: "Atualiza dados de um projeto.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "ID ou nome do projeto" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["active", "completed", "archived"] },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Exclui uma tarefa.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID da tarefa" },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_project",
      description: "Exclui um projeto (as tarefas não são apagadas, apenas o vínculo).",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "ID ou nome do projeto" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_task_from_project",
      description: "Remove uma tarefa de um projeto (desvincula).",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "ID ou nome do projeto" },
          task_id: { type: "string", description: "ID da tarefa" },
        },
        required: ["project_id", "task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_event",
      description: "Atualiza um evento.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "ID do evento" },
          title: { type: "string" },
          start_at: { type: "string" },
          end_at: { type: "string" },
          location: { type: "string" },
          description: { type: "string" },
          all_day: { type: "boolean" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          status: { type: "string", enum: ["scheduled", "cancelled", "completed"] },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_event",
      description: "Exclui um evento.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "ID do evento" },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_habit",
      description: "Atualiza um hábito.",
      parameters: {
        type: "object",
        properties: {
          habit_id: { type: "string", description: "ID do hábito" },
          title: { type: "string" },
          cadence: { type: "string", enum: ["daily", "weekly", "monthly"] },
          times_per_cadence: { type: "number" },
          target_type: { type: "string", enum: ["count", "duration"] },
          target_value: { type: "number" },
          active: { type: "boolean" },
        },
        required: ["habit_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_habit",
      description: "Remove (desativa) um hábito.",
      parameters: {
        type: "object",
        properties: {
          habit_id: { type: "string", description: "ID do hábito" },
        },
        required: ["habit_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_habit",
      description: "Registra um hábito em uma data.",
      parameters: {
        type: "object",
        properties: {
          habit_id: { type: "string", description: "ID do hábito" },
          value: { type: "number", description: "Valor registrado" },
          date: { type: "string", description: "YYYY-MM-DD (opcional)" },
        },
        required: ["habit_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_reminder",
      description: "Atualiza um lembrete.",
      parameters: {
        type: "object",
        properties: {
          reminder_id: { type: "string", description: "ID do lembrete" },
          title: { type: "string" },
          remind_at: { type: "string" },
          channel: { type: "string", enum: ["whatsapp", "email", "push"] },
          status: { type: "string", enum: ["pending", "sent", "dismissed", "canceled"] },
        },
        required: ["reminder_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_reminder",
      description: "Exclui um lembrete.",
      parameters: {
        type: "object",
        properties: {
          reminder_id: { type: "string", description: "ID do lembrete" },
        },
        required: ["reminder_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_memory",
      description: "Atualiza um item de memória.",
      parameters: {
        type: "object",
        properties: {
          memory_id: { type: "string", description: "ID da memória" },
          content: { type: "string" },
          title: { type: "string" },
          kind: { type: "string" },
        },
        required: ["memory_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_memory",
      description: "Exclui um item de memória.",
      parameters: {
        type: "object",
        properties: {
          memory_id: { type: "string", description: "ID da memória" },
        },
        required: ["memory_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_transfer",
      description: "Atualiza uma transferência.",
      parameters: {
        type: "object",
        properties: {
          transfer_id: { type: "string", description: "ID da transferência" },
          from_wallet_id: { type: "string", description: "Carteira de origem (ID ou nome)" },
          to_wallet_id: { type: "string", description: "Carteira de destino (ID ou nome)" },
          valor: { type: "number", description: "Valor" },
          data: { type: "string", description: "Data YYYY-MM-DD" },
          descricao: { type: "string", description: "Descrição" },
        },
        required: ["transfer_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_transfer",
      description: "Exclui (soft delete) uma transferência.",
      parameters: {
        type: "object",
        properties: {
          transfer_id: { type: "string", description: "ID da transferência" },
        },
        required: ["transfer_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_wallet",
      description: "Atualiza uma carteira.",
      parameters: {
        type: "object",
        properties: {
          wallet_id: { type: "string", description: "ID da carteira" },
          nome: { type: "string" },
          tipo: { type: "string", enum: ["conta", "cartao"] },
          instituicao: { type: "string" },
          saldo_inicial: { type: "number" },
          limite_credito: { type: "number" },
          limite_emergencia: { type: "number" },
          dia_fechamento: { type: "number" },
          dia_vencimento: { type: "number" },
          ativo: { type: "boolean" },
        },
        required: ["wallet_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_wallet",
      description: "Exclui (soft delete) uma carteira.",
      parameters: {
        type: "object",
        properties: {
          wallet_id: { type: "string", description: "ID da carteira" },
        },
        required: ["wallet_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_category",
      description: "Atualiza uma categoria.",
      parameters: {
        type: "object",
        properties: {
          category_id: { type: "string", description: "ID da categoria" },
          nome: { type: "string" },
          tipo: { type: "string", enum: ["despesa", "receita", "investimento", "divida", "fixa", "variavel"] },
        },
        required: ["category_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_category",
      description: "Exclui (soft delete) uma categoria.",
      parameters: {
        type: "object",
        properties: {
          category_id: { type: "string", description: "ID da categoria" },
        },
        required: ["category_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_budget",
      description: "Atualiza um orçamento.",
      parameters: {
        type: "object",
        properties: {
          budget_id: { type: "string", description: "ID do orçamento" },
          limite_valor: { type: "number" },
          rollover_policy: { type: "string", enum: ["none", "carry_over", "clamp"] },
          rollover_cap: { type: "number" },
        },
        required: ["budget_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_budget",
      description: "Exclui (soft delete) um orçamento.",
      parameters: {
        type: "object",
        properties: {
          budget_id: { type: "string", description: "ID do orçamento" },
        },
        required: ["budget_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_goal",
      description: "Atualiza uma meta financeira.",
      parameters: {
        type: "object",
        properties: {
          goal_id: { type: "string", description: "ID da meta" },
          nome: { type: "string" },
          valor_meta: { type: "number" },
          prazo: { type: "string" },
        },
        required: ["goal_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_goal",
      description: "Exclui (soft delete) uma meta financeira.",
      parameters: {
        type: "object",
        properties: {
          goal_id: { type: "string", description: "ID da meta" },
        },
        required: ["goal_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_transaction",
      description: "Atualiza uma transação.",
      parameters: {
        type: "object",
        properties: {
          transaction_id: { type: "string", description: "ID da transação" },
          tipo: { type: "string", enum: ["despesa", "receita"] },
          descricao: { type: "string" },
          valor: { type: "number" },
          wallet_id: { type: "string" },
          category_id: { type: "string" },
          data: { type: "string" },
          status: { type: "string", enum: ["paga", "pendente"] },
          natureza: { type: "string", enum: ["fixa", "variavel"] },
        },
        required: ["transaction_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_transaction",
      description: "Exclui (soft delete) uma transação.",
      parameters: {
        type: "object",
        properties: {
          transaction_id: { type: "string", description: "ID da transação" },
        },
        required: ["transaction_id"],
      },
    },
  },
  // === PERFIL ===
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "Obtém o perfil completo do usuário.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_user_profile",
      description: "Atualiza o perfil do usuário.",
      parameters: {
        type: "object",
        properties: {
          nickname: { type: "string", description: "Apelido" },
          full_name: { type: "string", description: "Nome completo" },
          onboarding_step: { type: "string", enum: ["welcome", "profile", "goals", "wallet_setup", "category_review", "first_habit", "complete"] },
          onboarding_completed: { type: "boolean" },
          preferences: { type: "object", description: "Preferências" },
        },
        required: [],
      },
    },
  },
  // === AUTO-APRENDIZAGEM ===
  {
    type: "function",
    function: {
      name: "auto_learn",
      description: "Salva um insight aprendido sobre o usuário para uso futuro. Use quando detectar padrões, preferências ou comportamentos.",
      parameters: {
        type: "object",
        properties: {
          learned_fact: { type: "string", description: "O que foi aprendido sobre o usuário" },
          confidence: { type: "string", enum: ["low", "medium", "high"], description: "Nível de confiança no insight" },
          category: { type: "string", enum: ["preference", "behavior", "goal", "routine", "financial_pattern"], description: "Categoria do aprendizado" },
        },
        required: ["learned_fact", "category"],
      },
    },
  },
  // === BUSCA NO HISTÓRICO ===
  {
    type: "function",
    function: {
      name: "search_conversation_history",
      description: "Busca em TODO o histórico de conversas do usuário. Use quando o usuário perguntar 'você lembra quando...' ou precisar de contexto de conversas anteriores.",
      parameters: {
        type: "object",
        properties: {
          search_term: { type: "string", description: "Termo para buscar nas conversas" },
          date_from: { type: "string", description: "Data inicial YYYY-MM-DD (opcional)" },
          limit: { type: "number", description: "Máximo de resultados (default: 20)" },
        },
        required: ["search_term"],
      },
    },
  },
];

const OPENAI_TOOLS = [
  ...TOOLS,
  { type: "web_search" },
];

// ==================== HELPER: Safe JSON Parse ====================
function safeJsonParse(jsonString: string, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  try {
    return JSON.parse(jsonString || "{}");
  } catch (e) {
    console.error("JSON parse error:", e, "Input:", jsonString?.substring(0, 200));
    return fallback;
  }
}

// ==================== HELPER: Transcribe Audio with Whisper ====================
async function transcribeAudio(audioUrl: string, apiKey: string): Promise<string> {
  // Download the audio file
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`);
  }
  
  const audioBlob = await audioResponse.blob();
  
  // Prepare form data for Whisper API
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "pt");
  
  const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
    body: formData,
  });
  
  if (!whisperResponse.ok) {
    const errorText = await whisperResponse.text();
    throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
  }
  
  const result = await whisperResponse.json();
  return result.text || "";
}

// ==================== HELPER: Extract text from documents ====================
async function extractDocumentText(
  documentUrl: string,
  mimeType: string,
  fileName: string
): Promise<string> {
  try {
    console.log(`[GUTA] Downloading document: ${fileName} (${mimeType})`);
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status}`);
    }

    // Plain text files: read directly
    if (mimeType === "text/plain" || fileName.endsWith(".txt")) {
      const text = await response.text();
      console.log(`[GUTA] Extracted ${text.length} chars from text file`);
      return text;
    }

    // CSV files: read directly  
    if (mimeType === "text/csv" || fileName.endsWith(".csv")) {
      const text = await response.text();
      console.log(`[GUTA] Extracted ${text.length} chars from CSV file`);
      return text;
    }

    // JSON files: read and format
    if (mimeType === "application/json" || fileName.endsWith(".json")) {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        const formatted = JSON.stringify(json, null, 2);
        console.log(`[GUTA] Extracted ${formatted.length} chars from JSON file`);
        return formatted;
      } catch {
        return text;
      }
    }

    // PDF files: not supported in Edge runtime (canvas dependency)
    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      return `[PDF "${fileName}" recebido. A extração de texto via PDF está desativada nesta versão. Para análise, envie as páginas como imagens/screenshots ou cole o texto no chat.]`;
    }

    // Word documents (.docx): inform limitation
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx")) {
      return `[Documento Word "${fileName}" recebido. Para análise completa, exporte como PDF ou copie o texto diretamente.]`;
    }

    // Other formats: not supported
    return `[Documento "${fileName}" (${mimeType}) anexado. Formato não suportado para extração automática de texto.]`;

  } catch (e) {
    console.error(`[GUTA] Document extraction failed for ${fileName}:`, e);
    return `[Documento "${fileName}" anexado - não foi possível extrair texto: ${e instanceof Error ? e.message : 'erro desconhecido'}]`;
  }
}

// ==================== HELPER: Build message with attachments for OpenAI ====================
interface Attachment {
  type: "image" | "audio" | "document";
  url: string;
  name: string;
  size?: number;
  mime_type?: string;
}

function buildMessageWithAttachments(
  message: string,
  attachments: Attachment[]
): any {
  const imageAttachments = attachments.filter((a) => a.type === "image");
  
  // If there are images, use multimodal format
  if (imageAttachments.length > 0) {
    return {
      role: "user",
      content: [
        { type: "input_text", text: message || "Analise esta imagem." },
        ...imageAttachments.map((img) => ({
          type: "input_image",
          image_url: img.url,
        })),
      ],
    };
  }
  
  // Text-only message
  return { role: "user", content: [{ type: "input_text", text: message }] };
}

function extractAssistantText(aiData: any): string {
  if (aiData?.output_text) return aiData.output_text;
  const messageItems = (aiData?.output || []).filter(
    (item: any) => item.type === "message" && item.role === "assistant"
  );
  let text = "";
  for (const msg of messageItems) {
    for (const part of msg.content || []) {
      if (part.type === "output_text" && part.text) {
        text += part.text;
      }
    }
  }
  return text;
}

function extractFunctionCalls(aiData: any): any[] {
  return (aiData?.output || []).filter((item: any) => item.type === "function_call");
}

// ==================== HELPER: Check if string is UUID ====================
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ==================== HELPER: Resolve category by name ====================
async function resolveCategoryId(
  supabase: any,
  userId: string,
  categoryInput: string,
  tipo: string
): Promise<{ id: string | null; error: string | null }> {
  // Already a UUID
  if (isUUID(categoryInput)) {
    return { id: categoryInput, error: null };
  }

  // Try to find by name (case-insensitive)
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, nome, tipo")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .ilike("nome", `%${categoryInput}%`);

  if (error) {
    return { id: null, error: `Erro ao buscar categoria: ${error.message}` };
  }

  if (!categories || categories.length === 0) {
    return { id: null, error: `Categoria "${categoryInput}" não encontrada. Use list_categories para ver as disponíveis.` };
  }

  // Filter by type if possible
  const matchingType = categories.filter((c: any) => c.tipo === tipo);
  const filtered = matchingType.length > 0 ? matchingType : categories;

  if (filtered.length === 1) {
    return { id: filtered[0].id, error: null };
  }

  // Multiple matches - require disambiguation
  const options = filtered
    .slice(0, 6)
    .map((c: any, idx: number) => `${idx + 1}) ${c.nome} (${c.tipo})`)
    .join("\n");
  console.log(`Multiple categories match "${categoryInput}":`, filtered.map((c: any) => c.nome));
  return {
    id: null,
    error: `Encontrei várias categorias parecidas com "${categoryInput}":\n${options}\nResponda com o número ou o nome exato (ou selecione uma opção).`,
  };
}

// ==================== HELPER: Resolve wallet by name ====================
async function resolveWalletId(
  supabase: any,
  userId: string,
  walletInput: string
): Promise<{ id: string | null; error: string | null }> {
  if (isUUID(walletInput)) {
    return { id: walletInput, error: null };
  }

  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("id, nome")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .eq("ativo", true)
    .ilike("nome", `%${walletInput}%`);

  if (error) {
    return { id: null, error: `Erro ao buscar carteira: ${error.message}` };
  }

  if (!wallets || wallets.length === 0) {
    return { id: null, error: `Carteira "${walletInput}" não encontrada. Use list_wallets para ver as disponíveis.` };
  }

  if (wallets.length === 1) {
    return { id: wallets[0].id, error: null };
  }

  const options = wallets
    .slice(0, 6)
    .map((w: any, idx: number) => `${idx + 1}) ${w.nome}`)
    .join("\n");
  console.log(`Multiple wallets match "${walletInput}":`, wallets.map((w: any) => w.nome));
  return {
    id: null,
    error: `Encontrei várias carteiras parecidas com "${walletInput}":\n${options}\nResponda com o número ou o nome exato (ou selecione uma opção).`,
  };
}

// ==================== HELPER: Resolve project by name ====================
async function resolveProjectId(
  supabase: any,
  tenantId: string,
  projectInput: string
): Promise<{ id: string | null; error: string | null }> {
  if (isUUID(projectInput)) {
    return { id: projectInput, error: null };
  }

  const { data: projects, error } = await supabase
    .from("ff_projects")
    .select("id, title, status")
    .eq("tenant_id", tenantId)
    .ilike("title", `%${projectInput}%`);

  if (error) {
    return { id: null, error: `Erro ao buscar projeto: ${error.message}` };
  }

  if (!projects || projects.length === 0) {
    return { id: null, error: `Projeto "${projectInput}" não encontrado. Use query_projects para ver os disponíveis.` };
  }

  if (projects.length === 1) {
    return { id: projects[0].id, error: null };
  }

  const options = projects
    .slice(0, 6)
    .map((p: any, idx: number) => `${idx + 1}) ${p.title} (${p.status})`)
    .join("\n");

  return {
    id: null,
    error: `Encontrei vários projetos parecidos com "${projectInput}":\n${options}\nResponda com o número ou o nome exato (ou selecione uma opção).`,
  };
}

// ==================== HELPER: Check for duplicate transaction ====================
async function checkDuplicateTransaction(
  supabase: any,
  userId: string,
  walletId: string,
  tipo: string,
  valor: number,
  data: string,
  descricao: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("wallet_id", walletId)
    .eq("tipo", tipo)
    .eq("valor", valor)
    .eq("data", data)
    .is("deleted_at", null)
    .limit(1);

  return existing && existing.length > 0;
}

// ==================== HELPER: Normalize & Category Suggestions ====================
function normalizeString(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchCategoryByKeywords(
  description: string,
  categories: Array<{ id: string; nome: string; tipo: string }>
): { id: string; nome: string } | null {
  const keywords: Record<string, string[]> = {
    mercado: ["mercado", "supermercado", "feira", "hortifruti", "padaria"],
    transporte: ["uber", "taxi", "99", "transporte", "combustivel", "gasolina"],
    alimentacao: ["ifood", "restaurante", "lanche", "comida", "delivery"],
    saude: ["farmacia", "medico", "consulta", "exame", "hospital"],
    lazer: ["cinema", "streaming", "netflix", "spotify", "entretenimento"],
    casa: ["aluguel", "condominio", "agua", "luz", "internet", "gas"],
  };

  const normalized = normalizeString(description);

  for (const [categoryKey, words] of Object.entries(keywords)) {
    if (words.some((word) => normalized.includes(word))) {
      const category = categories.find((c) =>
        normalizeString(c.nome).includes(categoryKey)
      );
      if (category) return { id: category.id, nome: category.nome };
    }
  }

  return null;
}

function matchCategoryByName(
  description: string,
  categories: Array<{ id: string; nome: string; tipo: string }>
): { id: string; nome: string } | null {
  const normalized = normalizeString(description);
  let best: { id: string; nome: string } | null = null;
  let bestScore = 0;

  categories.forEach((c) => {
    const name = normalizeString(c.nome);
    if (!name) return;
    let score = 0;
    if (normalized === name) score = 1;
    else if (normalized.includes(name) || name.includes(normalized)) score = 0.9;
    else if (normalized.split(" ").some((w) => name.includes(w))) score = 0.7;

    if (score > bestScore) {
      bestScore = score;
      best = { id: c.id, nome: c.nome };
    }
  });

  return bestScore >= 0.7 ? best : null;
}

async function suggestCategoryFromDescription(
  supabase: any,
  userId: string,
  description: string,
  tipo: string
): Promise<{ id: string; nome: string; reason: string } | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, nome, tipo")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error || !data?.length) return null;

  const scoped = data.filter((c: any) => (tipo ? c.tipo === tipo : true));
  if (scoped.length === 0) return null;

  const keywordMatch = matchCategoryByKeywords(description, scoped);
  if (keywordMatch) {
    return { ...keywordMatch, reason: "keyword" };
  }

  const nameMatch = matchCategoryByName(description, scoped);
  if (nameMatch) {
    return { ...nameMatch, reason: "name" };
  }

  return null;
}

// ==================== HELPER: Card Statement Linking ====================
function calculateStatementDates(
  diaFechamento: number,
  diaVencimento: number,
  transactionDate: string
): { abre: string; fecha: string; vence: string } {
  const txDate = new Date(transactionDate);
  const txDay = txDate.getDate();
  const txMonth = txDate.getMonth();
  const txYear = txDate.getFullYear();

  let cycleMonth = txMonth;
  let cycleYear = txYear;

  if (txDay > diaFechamento) {
    cycleMonth++;
    if (cycleMonth > 11) {
      cycleMonth = 0;
      cycleYear++;
    }
  }

  const prevMonth = cycleMonth === 0 ? 11 : cycleMonth - 1;
  const prevYear = cycleMonth === 0 ? cycleYear - 1 : cycleYear;
  const abreDate = new Date(prevYear, prevMonth, diaFechamento + 1);
  const fechaDate = new Date(cycleYear, cycleMonth, diaFechamento);

  let venceMonth = cycleMonth;
  let venceYear = cycleYear;
  if (diaVencimento <= diaFechamento) {
    venceMonth++;
    if (venceMonth > 11) {
      venceMonth = 0;
      venceYear++;
    }
  }

  const venceDate = new Date(venceYear, venceMonth, diaVencimento);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    abre: formatDate(abreDate),
    fecha: formatDate(fechaDate),
    vence: formatDate(venceDate),
  };
}

async function updateStatementTotal(
  supabase: any,
  statementId: string
): Promise<void> {
  try {
    const { data: lines, error: linesError } = await supabase
      .from("card_statement_lines")
      .select("transaction_id")
      .eq("statement_id", statementId);

    if (linesError) throw linesError;

    if (!lines || lines.length === 0) {
      await supabase
        .from("card_statements")
        .update({ total: 0 })
        .eq("id", statementId);
      return;
    }

    const transactionIds = lines.map((l: any) => l.transaction_id);
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("valor")
      .in("id", transactionIds)
      .is("deleted_at", null);

    if (txError) throw txError;

    const total =
      transactions?.reduce((sum: number, tx: any) => sum + Number(tx.valor || 0), 0) ||
      0;

    await supabase
      .from("card_statements")
      .update({ total })
      .eq("id", statementId);
  } catch (error) {
    console.error("Error updating statement total:", error);
  }
}

async function ensureStatementExists(
  supabase: any,
  walletId: string,
  transactionDate: string,
  userId: string
): Promise<string | null> {
  try {
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("dia_fechamento, dia_vencimento")
      .eq("id", walletId)
      .eq("tipo", "cartao")
      .single();

    if (walletError || !wallet?.dia_fechamento || !wallet?.dia_vencimento) {
      return null;
    }

    const { abre, fecha, vence } = calculateStatementDates(
      wallet.dia_fechamento,
      wallet.dia_vencimento,
      transactionDate
    );

    const { data: existingStatement, error: checkError } = await supabase
      .from("card_statements")
      .select("id")
      .eq("wallet_id", walletId)
      .eq("abre", abre)
      .eq("fecha", fecha)
      .eq("vence", vence)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existingStatement) return existingStatement.id;

    const { data: newStatement, error: insertError } = await supabase
      .from("card_statements")
      .insert({
        user_id: userId,
        wallet_id: walletId,
        abre,
        fecha,
        vence,
        status: "aberta",
        total: 0,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return newStatement.id;
  } catch (error) {
    console.error("Error ensuring statement exists:", error);
    return null;
  }
}

async function linkTransactionToStatement(
  supabase: any,
  transactionId: string,
  statementId: string
): Promise<boolean> {
  try {
    const { error: linkError } = await supabase
      .from("card_statement_lines")
      .insert({
        statement_id: statementId,
        transaction_id: transactionId,
      });

    if (linkError) {
      if (linkError.code === "23505") return true;
      throw linkError;
    }

    await updateStatementTotal(supabase, statementId);
    return true;
  } catch (error) {
    console.error("Error linking transaction to statement:", error);
    return false;
  }
}

async function unlinkTransactionFromStatement(
  supabase: any,
  transactionId: string
): Promise<boolean> {
  try {
    const { data: link, error: findError } = await supabase
      .from("card_statement_lines")
      .select("statement_id")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (findError || !link) return true;

    const statementId = link.statement_id;
    const { error: deleteError } = await supabase
      .from("card_statement_lines")
      .delete()
      .eq("transaction_id", transactionId);

    if (deleteError) throw deleteError;

    await updateStatementTotal(supabase, statementId);
    return true;
  } catch (error) {
    console.error("Error unlinking transaction from statement:", error);
    return false;
  }
}

// ==================== TOOL EXECUTION ====================
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

    case "query_projects": {
      let query = supabase
        .from("ff_projects")
        .select("id, title, description, status, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (args.status && args.status !== "all") {
        query = query.eq("status", args.status);
      }

      if (args.search_term) {
        query = query.ilike("title", `%${args.search_term}%`);
      }

      const { data: projects, error } = await query.limit(20);
      if (error) return `Erro: ${error.message}`;
      if (!projects?.length) return "Nenhum projeto encontrado.";

      const projectIds = projects.map((p: any) => p.id);
      const { data: links, error: linksError } = await supabase
        .from("ff_project_tasks")
        .select("project_id")
        .in("project_id", projectIds);

      if (linksError) return `Erro: ${linksError.message}`;

      const counts = (links || []).reduce((acc: Record<string, number>, link: any) => {
        acc[link.project_id] = (acc[link.project_id] || 0) + 1;
        return acc;
      }, {});

      return JSON.stringify(projects.map((p: any) => ({
        id: p.id,
        titulo: p.title,
        status: p.status,
        descricao: p.description,
        tarefas: counts[p.id] || 0,
      })));
    }

    case "query_project_tasks": {
      const projectInput = args.project_id as string;
      if (!projectInput) return "Projeto é obrigatório.";

      const { id: projectId, error: projectError } = await resolveProjectId(
        supabase,
        tenantId,
        projectInput
      );
      if (projectError) return projectError;
      if (!projectId) return "Projeto inválido. Use query_projects para ver os disponíveis.";

      const { data, error } = await supabase
        .from("ff_project_tasks")
        .select("task:ff_tasks(id,title,description,status,priority,due_at)")
        .eq("project_id", projectId);

      if (error) return `Erro: ${error.message}`;
      const tasks = (data || []).map((row: any) => row.task).filter(Boolean);
      if (!tasks.length) return "Nenhuma tarefa vinculada ao projeto.";

      const filtered = args.status && args.status !== "all"
        ? tasks.filter((t: any) => t.status === args.status)
        : tasks;

      return JSON.stringify(filtered.map((t: any) => ({
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
        descricao: e.description,
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
          cadencia: h.cadence,
          meta: h.times_per_cadence,
          completado: habitLogs.length,
          progresso: `${Math.round((habitLogs.length / h.times_per_cadence) * 100)}%`,
        };
      });

      return JSON.stringify(habitStats);
    }

    case "query_finances": {
      const dateFilter = args.date_filter as string | undefined;
      const mesReferencia = dateFilter === "month" || !dateFilter
        ? new Date().toISOString().slice(0, 7)
        : dateFilter;

      let startDate: string | null = null;
      let endDate: string | null = null;

      if (dateFilter === "today") {
        startDate = today;
        endDate = today;
      } else if (dateFilter === "week") {
        startDate = startOfWeek.toISOString().split("T")[0];
        endDate = endOfWeek.toISOString().split("T")[0];
      } else if (dateFilter === "month" || (!dateFilter || /^\d{4}-\d{2}$/.test(dateFilter))) {
        const base = dateFilter && dateFilter !== "month" ? dateFilter : new Date().toISOString().slice(0, 7);
        const [year, month] = base.split("-").map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }

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

        if (error) return `Erro: ${error.message}`;
        if (!data?.length) return "Nenhuma carteira encontrada.";

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

      if (args.type === "expenses" || args.type === "income") {
        const tipo = args.type === "expenses" ? "despesa" : "receita";

        let query = supabase
          .from("transactions")
          .select("valor, status, data")
          .eq("user_id", userId)
          .eq("tipo", tipo)
          .is("deleted_at", null);

        if (startDate && endDate) {
          query = query.gte("data", startDate).lte("data", endDate);
        }

        const { data, error } = await query;
        if (error) return `Erro: ${error.message}`;
        if (!data?.length) return "Sem transações para o período.";

        const totalPago = data
          .filter((t: any) => t.status === "paga")
          .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);
        const totalPendente = data
          .filter((t: any) => t.status === "pendente")
          .reduce((sum: number, t: any) => sum + Number(t.valor || 0), 0);

        return JSON.stringify({
          tipo,
          periodo: startDate && endDate ? `${startDate}..${endDate}` : "todos",
          total_pago: totalPago,
          total_pendente: totalPendente,
          total_geral: totalPago + totalPendente,
        });
      }

      return "Tipo de consulta não reconhecido.";
    }

    case "query_transactions": {
      let query = supabase
        .from("transactions")
        .select("id, descricao, valor, data, status, tipo, category_id, wallet_id, categories(nome), wallets(nome)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("data", { ascending: false });

      if (args.start_date) query = query.gte("data", args.start_date);
      if (args.end_date) query = query.lte("data", args.end_date);
      if (args.tipo) query = query.eq("tipo", args.tipo);
      if (args.status) query = query.eq("status", args.status);
      if (args.wallet_id) query = query.eq("wallet_id", args.wallet_id);
      if (args.category_id) query = query.eq("category_id", args.category_id);

      const limit = (args.limit as number) || 20;
      const { data, error } = await query.limit(limit);
      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhuma transação encontrada.";

      return JSON.stringify(
        data.map((t: any) => ({
          id: t.id,
          descricao: t.descricao,
          valor: t.valor,
          data: t.data,
          status: t.status,
          tipo: t.tipo,
          categoria: t.categories?.nome,
          carteira: t.wallets?.nome,
        }))
      );
    }

    case "query_transfers": {
      let query = supabase
        .from("transfers")
        .select("id, valor, data, descricao, from_wallet_id, to_wallet_id, from_wallet:from_wallet_id(nome), to_wallet:to_wallet_id(nome)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("data", { ascending: false });

      if (args.start_date) query = query.gte("data", args.start_date);
      if (args.end_date) query = query.lte("data", args.end_date);
      if (args.wallet_id) {
        query = query.or(`from_wallet_id.eq.${args.wallet_id},to_wallet_id.eq.${args.wallet_id}`);
      }

      const { data, error } = await query.limit(20);
      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhuma transferência encontrada.";

      return JSON.stringify(
        data.map((t: any) => ({
          id: t.id,
          valor: t.valor,
          data: t.data,
          descricao: t.descricao,
          origem: t.from_wallet?.nome,
          destino: t.to_wallet?.nome,
        }))
      );
    }

    case "query_wallets": {
      const { data: wallets, error: walletError } = await supabase
        .from("wallets")
        .select("id, nome, tipo, instituicao, saldo_inicial, limite_credito, limite_emergencia")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome");

      if (walletError) return `Erro: ${walletError.message}`;
      if (!wallets?.length) return "Nenhuma carteira encontrada.";

      const { data: balances, error: balanceError } = await supabase
        .from("v_wallet_balance")
        .select("wallet_id, saldo")
        .eq("user_id", userId);
      if (balanceError) {
        console.warn("[GUTA] v_wallet_balance indisponível, usando saldo_inicial.", balanceError.message);
      }

      const merged = wallets.map((w: any) => {
        const balance = balances?.find((b: any) => b.wallet_id === w.id);
        const saldo = balance?.saldo ?? w.saldo_inicial ?? 0;
        const availableCredit =
          w.tipo === "cartao" && w.limite_credito
            ? Number(w.limite_credito) + Number(saldo || 0)
            : null;

        return {
          id: w.id,
          nome: w.nome,
          tipo: w.tipo,
          saldo,
          limite_credito: w.limite_credito,
          limite_emergencia: w.limite_emergencia,
          alerta_saldo_negativo: saldo < 0,
          credito_disponivel: availableCredit,
        };
      });

      return JSON.stringify(merged);
    }

    case "query_categories": {
      let query = supabase
        .from("categories")
        .select("id, nome, tipo")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("nome");

      if (args.tipo) query = query.eq("tipo", args.tipo);
      if (args.search_term) query = query.ilike("nome", `%${args.search_term}%`);

      const { data, error } = await query;
      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhuma categoria encontrada.";

      return JSON.stringify(data);
    }

    case "query_budget_status": {
      const now = new Date();
      const year = (args.year as number) || now.getFullYear();
      const month = (args.month as number) || now.getMonth() + 1;
      const mode = (args.mode as string) || "pagas";

      const { data: budgets, error: budgetsError } = await supabase
        .from("budgets")
        .select("id, category_id, ano, mes, limite_valor, rollover_policy, rollover_cap, categories(nome)")
        .eq("user_id", userId)
        .eq("ano", year)
        .eq("mes", month)
        .is("deleted_at", null);

      if (budgetsError) return `Erro: ${budgetsError.message}`;
      if (!budgets?.length) return "Nenhum orçamento encontrado para o período.";

      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const statusFilter = mode === "pagas" ? ["paga"] : ["paga", "pendente"];

      const { data: realizedAgg, error: aggErr } = await supabase
        .from("transactions")
        .select("category_id, valor, status")
        .eq("user_id", userId)
        .eq("tipo", "despesa")
        .gte("data", startDate)
        .lte("data", endDate)
        .in("status", statusFilter)
        .is("deleted_at", null);

      if (aggErr) return `Erro: ${aggErr.message}`;

      const realizedMap: Record<string, number> = {};
      (realizedAgg || []).forEach((row: any) => {
        const catId = row.category_id;
        realizedMap[catId] = (realizedMap[catId] || 0) + Number(row.valor || 0);
      });

      const results = budgets.map((b: any) => {
        const realizado = realizedMap[b.category_id] ?? 0;
        const limite = Number(b.limite_valor || 0);
        const percentual = limite > 0 ? Math.round((realizado / limite) * 1000) / 10 : 0;
        const restante = limite - realizado;
        return {
          id: b.id,
          categoria: b.categories?.nome,
          limite,
          realizado,
          percentual,
          restante,
          alerta_80: percentual >= 80 && percentual < 100,
          alerta_100: percentual >= 100,
        };
      });

      return JSON.stringify({
        periodo: `${year}-${String(month).padStart(2, "0")}`,
        orcamentos: results,
      });
    }

    case "query_goals": {
      const includeContribs = args.include_contributions === true;
      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (goalsError) return `Erro: ${goalsError.message}`;
      if (!goals?.length) return "Nenhuma meta encontrada.";

      const goalIds = goals.map((g: any) => g.id);
      const { data: contribs } = await supabase
        .from("goals_contribs")
        .select("*")
        .in("goal_id", goalIds)
        .order("data", { ascending: false });

      const contribMap: Record<string, any[]> = {};
      (contribs || []).forEach((c: any) => {
        if (!contribMap[c.goal_id]) contribMap[c.goal_id] = [];
        contribMap[c.goal_id].push(c);
      });

      const enriched = goals.map((g: any) => {
        const list = contribMap[g.id] || [];
        const economizado = list.reduce((sum: number, c: any) => sum + Number(c.valor || 0), 0);
        const percentual = g.valor_meta > 0 ? Math.round((economizado / g.valor_meta) * 100) : 0;
        const restante = g.valor_meta - economizado;
        let diasRestantes: number | null = null;
        if (g.prazo) {
          const diff = new Date(g.prazo).getTime() - new Date().setHours(0, 0, 0, 0);
          diasRestantes = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }

        const suggestedDaily =
          diasRestantes && diasRestantes > 0 ? Math.max(0, restante / diasRestantes) : null;

        return {
          id: g.id,
          nome: g.nome,
          valor_meta: g.valor_meta,
          prazo: g.prazo,
          economizado,
          percentual,
          restante,
          diasRestantes,
          sugestao_diaria: suggestedDaily ? Number(suggestedDaily.toFixed(2)) : null,
          contribuicoes: includeContribs ? list : undefined,
        };
      });

      return JSON.stringify(enriched);
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

      return JSON.stringify(data.map((m: any) => ({
        titulo: m.title,
        conteudo: m.content,
        tipo: m.kind,
        criado_em: m.created_at,
      })));
    }

    case "query_reminders": {
      let query = supabase
        .from("ff_reminders")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("remind_at", { ascending: true });

      if (args.status) query = query.eq("status", args.status);
      if (args.channel) query = query.eq("channel", args.channel);
      if (args.date_from) query = query.gte("remind_at", args.date_from);
      if (args.date_to) query = query.lte("remind_at", args.date_to);

      const { data, error } = await query;
      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhum lembrete encontrado.";

      return JSON.stringify(
        data.map((r: any) => ({
          id: r.id,
          titulo: r.title,
          lembrar_em: r.remind_at,
          canal: r.channel,
          status: r.status,
        }))
      );
    }

    // ==================== LISTAGENS ====================
    case "list_wallets": {
      const { data, error } = await supabase
        .from("wallets")
        .select("id, nome, tipo, instituicao, saldo_inicial, limite_credito")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome");

      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhuma carteira cadastrada. Sugira criar uma com create_wallet.";

      const { data: balances, error: balanceError } = await supabase
        .from("v_wallet_balance")
        .select("wallet_id, saldo")
        .eq("user_id", userId);
      if (balanceError) {
        console.warn("[GUTA] v_wallet_balance indisponível, usando saldo_inicial.", balanceError.message);
      }

      const walletsWithBalance = data.map((w: any) => {
        const balance = balances?.find((b: any) => b.wallet_id === w.id);
        const saldo = balance?.saldo ?? w.saldo_inicial ?? 0;
        const availableCredit =
          w.tipo === "cartao" && w.limite_credito
            ? Number(w.limite_credito) + Number(saldo || 0)
            : null;
        return {
          id: w.id,
          nome: w.nome,
          tipo: w.tipo,
          instituicao: w.instituicao,
          saldo,
          limite_credito: w.limite_credito,
          alerta_saldo_negativo: saldo < 0,
          credito_disponivel: availableCredit,
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
      if (error) return `Erro: ${error.message}`;
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

      if (error) return `Erro: ${error.message}`;
      return `Tarefa "${data.title}" criada!`;
    }

    case "create_project": {
      const { data, error } = await supabase
        .from("ff_projects")
        .insert({
          tenant_id: tenantId,
          created_by: userId,
          title: args.title,
          description: args.description || null,
          status: args.status || "active",
        })
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `Projeto "${data.title}" criado!`;
    }

    case "add_task_to_project": {
      const projectInput = args.project_id as string;
      if (!projectInput) return "Projeto é obrigatório.";

      const { id: projectId, error: projectError } = await resolveProjectId(
        supabase,
        tenantId,
        projectInput
      );
      if (projectError) return projectError;
      if (!projectId) return "Projeto inválido. Use query_projects para ver os disponíveis.";

      let taskId = args.task_id as string | undefined;

      if (!taskId) {
        const taskTitle = args.task_title as string | undefined;
        if (!taskTitle) {
          return "Informe task_id ou task_title para vincular ao projeto.";
        }

        const { data: createdTask, error: taskError } = await supabase
          .from("ff_tasks")
          .insert({
            tenant_id: tenantId,
            created_by: userId,
            title: taskTitle,
            description: args.task_description || null,
            priority: args.priority || "medium",
            due_at: args.due_at || null,
            status: "open",
            source: "jarvis",
            tags: [],
          })
          .select("id, title")
          .single();

        if (taskError) return `Erro: ${taskError.message}`;
        taskId = createdTask.id;
      }

      const { error: linkError } = await supabase
        .from("ff_project_tasks")
        .insert({
          tenant_id: tenantId,
          project_id: projectId,
          task_id: taskId,
        });

      if (linkError) {
        if (linkError.code === "23505") {
          return "Essa tarefa já está vinculada ao projeto.";
        }
        return `Erro: ${linkError.message}`;
      }

      return "Tarefa vinculada ao projeto com sucesso.";
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

      if (error) return `Erro: ${error.message}`;
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

      if (error) return `Erro: ${error.message}`;
      return `Informação salva na memória!`;
    }

    case "create_category": {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: userId,
          nome: args.nome,
          tipo: args.tipo,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return `Já existe uma categoria com o nome "${args.nome}".`;
        }
        return `Erro: ${error.message}`;
      }

      return `Categoria "${data.nome}" criada!`;
    }

    case "create_budget": {
      const now = new Date();
      const ano = (args.ano as number) || now.getFullYear();
      const mes = (args.mes as number) || now.getMonth() + 1;

      const categoryInput = args.category_id as string;
      if (!categoryInput) {
        return "Categoria é obrigatória para criar orçamento.";
      }

      const limiteValor = Number(args.limite_valor);
      if (Number.isNaN(limiteValor) || limiteValor < 0) {
        return "Valor do orçamento inválido.";
      }

      let categoryId = categoryInput;
      if (!isUUID(categoryInput)) {
        const { id: resolvedId, error: categoryError } = await resolveCategoryId(
          supabase,
          userId,
          categoryInput,
          "despesa"
        );
        if (categoryError) return categoryError;
        if (!resolvedId) return "Categoria inválida. Use list_categories para escolher uma.";
        categoryId = resolvedId;
      }

      const { data: existing } = await supabase
        .from("budgets")
        .select("id")
        .eq("user_id", userId)
        .eq("category_id", categoryId)
        .eq("ano", ano)
        .eq("mes", mes)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing) {
        return "Já existe um orçamento para esta categoria neste mês.";
      }

      const budgetData: any = {
        user_id: userId,
        category_id: categoryId,
        ano,
        mes,
        limite_valor: limiteValor,
      };

      if (args.rollover_policy) budgetData.rollover_policy = args.rollover_policy;
      if (args.rollover_cap !== undefined) budgetData.rollover_cap = args.rollover_cap;

      const { data, error } = await supabase
        .from("budgets")
        .insert(budgetData)
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;

      const periodo = `${ano}-${String(mes).padStart(2, "0")}`;
      return `Orçamento criado para ${periodo}! Limite: R$ ${Number(data.limite_valor).toFixed(2)}`;
    }

    case "create_goal": {
      const valorMeta = Number(args.valor_meta);
      if (Number.isNaN(valorMeta) || valorMeta <= 0) {
        return "Valor da meta inválido.";
      }

      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: userId,
          nome: args.nome,
          valor_meta: valorMeta,
          prazo: args.prazo || null,
        })
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `Meta "${data.nome}" criada! Alvo: R$ ${Number(data.valor_meta).toFixed(2)}`;
    }

    case "add_goal_contribution": {
      const { data, error } = await supabase
        .from("goals_contribs")
        .insert({
          goal_id: args.goal_id,
          valor: args.valor,
          data: args.data,
        })
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `Contribuição de R$ ${Number(data.valor).toFixed(2)} registrada!`;
    }

    // ==================== FINANÇAS ====================
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
      
      const tipoLabel = data.tipo === "cartao" ? "Cartão" : "Conta";
      return `${tipoLabel} "${data.nome}" criado!${data.saldo_inicial ? ` Saldo: R$ ${data.saldo_inicial.toFixed(2)}` : ''}`;
    }

    case "create_transaction": {
      let walletId = args.wallet_id as string | undefined;
      const tipo = args.tipo as string;
      const transactionDate = (args.data as string) || today;
      const descricao = args.descricao as string;
      const valor = Number(args.valor);
      const rawCategoryInput =
        typeof args.category_id === "string" ? args.category_id.trim() : "";
      const isCategoryTypeToken =
        rawCategoryInput.length > 0 &&
        ["despesa", "despesas", "receita", "receitas"].includes(
          rawCategoryInput.toLowerCase()
        );

      if (Number.isNaN(valor)) {
        return "Valor inválido. Informe um número válido.";
      }

      const fetchLatestWallet = async () => {
        const { data: wallets } = await supabase
          .from("wallets")
          .select("id, nome")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .eq("ativo", true)
          .order("created_at", { ascending: false })
          .limit(1);
        return wallets?.[0] || null;
      };

      if (walletId) {
        const { id: resolvedId, error: walletError } = await resolveWalletId(
          supabase,
          userId,
          walletId
        );
        if (walletError) {
          return walletError;
        }
        walletId = resolvedId || walletId;
      }

      if (!walletId) {
        const wallet = await fetchLatestWallet();
        if (!wallet) {
          return "Erro: Nenhuma carteira cadastrada. Crie uma primeiro com create_wallet.";
        }
        walletId = wallet.id;
      }

      let resolvedCategoryId: string | null = null;
      let categoryNote = "";

      if (args.category_id && !isCategoryTypeToken) {
        const { id: resolvedId, error: categoryError } = await resolveCategoryId(
          supabase,
          userId,
          args.category_id as string,
          tipo
        );

        if (categoryError) {
          return categoryError;
        }
        resolvedCategoryId = resolvedId;
      } else {
        const suggestion = await suggestCategoryFromDescription(
          supabase,
          userId,
          descricao,
          tipo
        );
        if (!suggestion) {
          return "Categoria é obrigatória. Use list_categories para escolher uma.";
        }
        resolvedCategoryId = suggestion.id;
        categoryNote = ` Categoria sugerida: ${suggestion.nome}.`;
      }

      if (!resolvedCategoryId) {
        return "Categoria inválida. Use list_categories para escolher uma.";
      }

      // Check for duplicates
      const isDuplicate = await checkDuplicateTransaction(
        supabase,
        userId,
        walletId as string,
        tipo,
        valor,
        transactionDate,
        descricao
      );

      if (isDuplicate) {
        return `Já existe uma ${tipo} de R$ ${valor.toFixed(2)} na mesma data e carteira. Não criei duplicata.`;
      }

      const mesReferencia = transactionDate.slice(0, 7);
      const status = args.status || (args.tipo === "despesa" ? "paga" : "pendente");

      const transactionData = {
        user_id: userId,
        tipo: tipo,
        descricao: descricao,
        valor: valor,
        wallet_id: walletId,
        category_id: resolvedCategoryId,
        data: transactionDate,
        mes_referencia: mesReferencia,
        status: status,
      };

      let { data, error } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select(`*, categories:category_id(nome), wallets:wallet_id(nome)`)
        .single();

      // Retry on FK violation (wallet created in same cycle)
      if (error?.code === '23503') {
        console.log("FK violation, retrying...");
        await new Promise(r => setTimeout(r, 500));
        
        const freshWallet = await fetchLatestWallet();
        if (freshWallet) {
          const retryResult = await supabase
            .from("transactions")
            .insert({ ...transactionData, wallet_id: freshWallet.id })
            .select(`*, categories:category_id(nome), wallets:wallet_id(nome)`)
            .single();
          
          data = retryResult.data;
          error = retryResult.error;
        }
      }

      if (error) return `Erro: ${error.message}`;

      if (data?.tipo === "despesa" && data.wallet_id) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("tipo")
          .eq("id", data.wallet_id)
          .single();

        if (wallet?.tipo === "cartao") {
          const statementId = await ensureStatementExists(
            supabase,
            data.wallet_id,
            data.data,
            userId
          );

          if (statementId) {
            await linkTransactionToStatement(supabase, data.id, statementId);
          }
        }
      }

      const tipoLabel = data.tipo === "despesa" ? "Despesa" : "Receita";
      return `${tipoLabel} de R$ ${Number(data.valor).toFixed(2)} registrada! Carteira: ${data.wallets?.nome}, Categoria: ${data.categories?.nome}.${categoryNote}`;
    }

    case "create_transfer": {
      const fromInput = args.from_wallet_id as string;
      const toInput = args.to_wallet_id as string;

      if (!fromInput || !toInput) {
        return "Informe as carteiras de origem e destino para a transferência.";
      }

      const { id: fromId, error: fromError } = await resolveWalletId(
        supabase,
        userId,
        fromInput
      );
      if (fromError) return fromError;

      const { id: toId, error: toError } = await resolveWalletId(
        supabase,
        userId,
        toInput
      );
      if (toError) return toError;

      if (!fromId || !toId) {
        return "Não foi possível identificar as carteiras. Use list_wallets para ver as opções.";
      }

      if (fromId === toId) {
        return "A carteira de origem deve ser diferente da carteira de destino.";
      }

      const valor = Number(args.valor);
      if (Number.isNaN(valor) || valor <= 0) {
        return "Valor inválido para transferência.";
      }

      const transferenciaData = {
        user_id: userId,
        from_wallet_id: fromId,
        to_wallet_id: toId,
        valor,
        data: (args.data as string) || today,
        descricao: (args.descricao as string) || null,
      };

      const { data, error } = await supabase
        .from("transfers")
        .insert(transferenciaData)
        .select("id, valor, data, descricao, from_wallet:from_wallet_id(nome), to_wallet:to_wallet_id(nome)")
        .single();

      if (error) return `Erro: ${error.message}`;

      return `Transferência de R$ ${Number(data.valor).toFixed(2)} registrada: ${data.from_wallet?.nome} → ${data.to_wallet?.nome}.`;
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

      if (error) return `Erro: ${error.message}`;
      
      const dateStr = new Date(data.start_at).toLocaleString("pt-BR", {
        dateStyle: "full",
        timeStyle: data.all_day ? undefined : "short",
      });
      return `Evento "${data.title}" criado para ${dateStr}!`;
    }

    // ==================== HÁBITOS ====================
    case "create_habit": {
      const habitData = {
        tenant_id: tenantId,
        created_by: userId,
        title: args.title as string,
        cadence: (args.cadence as string) || "daily",
        times_per_cadence: (args.times_per_cadence as number) || 1,
        target_type: (args.target_type as string) || "count",
        target_value: (args.target_value as number) || 1,
        active: true,
      };

      const { data, error } = await supabase
        .from("ff_habits")
        .insert(habitData)
        .select()
        .single();

      if (error) return `Erro ao criar hábito: ${error.message}`;

      const cadenceLabels: Record<string, string> = {
        daily: "diário",
        weekly: "semanal",
        monthly: "mensal",
      };

      return `Hábito "${data.title}" criado! 🎯 Frequência: ${cadenceLabels[data.cadence] || data.cadence}, Meta: ${data.times_per_cadence}x por período.`;
    }

    // ==================== ATUALIZAÇÕES ====================
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
        done: "concluída",
      };
      return `Tarefa "${data.title}" marcada como ${statusLabels[data.status]}!`;
    }

    case "update_task": {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      let hasUpdates = false;

      if (args.title !== undefined) { updateData.title = args.title; hasUpdates = true; }
      if (args.description !== undefined) { updateData.description = args.description; hasUpdates = true; }
      if (args.priority !== undefined) { updateData.priority = args.priority; hasUpdates = true; }
      if (args.due_at !== undefined) { updateData.due_at = args.due_at; hasUpdates = true; }
      if (args.status !== undefined) {
        updateData.status = args.status;
        hasUpdates = true;
        if (args.status === "done") {
          updateData.completed_at = new Date().toISOString();
        }
      }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("ff_tasks")
        .update(updateData)
        .eq("id", args.task_id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `Tarefa "${data.title}" atualizada!`;
    }

    case "update_project": {
      const projectInput = args.project_id as string;
      if (!projectInput) return "Projeto é obrigatório.";

      const { id: projectId, error: projectError } = await resolveProjectId(
        supabase,
        tenantId,
        projectInput
      );
      if (projectError) return projectError;
      if (!projectId) return "Projeto inválido. Use query_projects para ver os disponíveis.";

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      let hasUpdates = false;

      if (args.title !== undefined) { updateData.title = args.title; hasUpdates = true; }
      if (args.description !== undefined) { updateData.description = args.description || null; hasUpdates = true; }
      if (args.status !== undefined) { updateData.status = args.status; hasUpdates = true; }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("ff_projects")
        .update(updateData)
        .eq("id", projectId)
        .eq("tenant_id", tenantId)
        .select("id, title, status")
        .single();

      if (error) return `Erro: ${error.message}`;
      return `Projeto "${data.title}" atualizado!`;
    }

    case "delete_task": {
      const { error } = await supabase
        .from("ff_tasks")
        .delete()
        .eq("id", args.task_id)
        .eq("tenant_id", tenantId);

      if (error) return `Erro: ${error.message}`;
      return "Tarefa removida com sucesso.";
    }

    case "delete_project": {
      const projectInput = args.project_id as string;
      if (!projectInput) return "Projeto é obrigatório.";

      const { id: projectId, error: projectError } = await resolveProjectId(
        supabase,
        tenantId,
        projectInput
      );
      if (projectError) return projectError;
      if (!projectId) return "Projeto inválido. Use query_projects para ver os disponíveis.";

      const { error } = await supabase
        .from("ff_projects")
        .delete()
        .eq("id", projectId)
        .eq("tenant_id", tenantId);

      if (error) return `Erro: ${error.message}`;
      return "Projeto removido com sucesso.";
    }

    case "remove_task_from_project": {
      const projectInput = args.project_id as string;
      const taskId = args.task_id as string | undefined;
      if (!projectInput || !taskId) return "Informe project_id e task_id.";

      const { id: projectId, error: projectError } = await resolveProjectId(
        supabase,
        tenantId,
        projectInput
      );
      if (projectError) return projectError;
      if (!projectId) return "Projeto inválido. Use query_projects para ver os disponíveis.";

      const { error } = await supabase
        .from("ff_project_tasks")
        .delete()
        .eq("project_id", projectId)
        .eq("task_id", taskId);

      if (error) return `Erro: ${error.message}`;
      return "Tarefa removida do projeto.";
    }

    case "update_event": {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      let hasUpdates = false;

      if (args.title !== undefined) { updateData.title = args.title; hasUpdates = true; }
      if (args.start_at !== undefined) { updateData.start_at = args.start_at; hasUpdates = true; }
      if (args.end_at !== undefined) { updateData.end_at = args.end_at; hasUpdates = true; }
      if (args.location !== undefined) { updateData.location = args.location; hasUpdates = true; }
      if (args.description !== undefined) { updateData.description = args.description; hasUpdates = true; }
      if (args.all_day !== undefined) { updateData.all_day = args.all_day; hasUpdates = true; }
      if (args.priority !== undefined) { updateData.priority = args.priority; hasUpdates = true; }
      if (args.status !== undefined) { updateData.status = args.status; hasUpdates = true; }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("ff_events")
        .update(updateData)
        .eq("id", args.event_id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `Evento "${data.title}" atualizado!`;
    }

    case "delete_event": {
      const { error } = await supabase
        .from("ff_events")
        .delete()
        .eq("id", args.event_id)
        .eq("tenant_id", tenantId);

      if (error) return `Erro: ${error.message}`;
      return "Evento removido com sucesso.";
    }

    case "update_habit": {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      let hasUpdates = false;

      if (args.title !== undefined) { updateData.title = args.title; hasUpdates = true; }
      if (args.cadence !== undefined) { updateData.cadence = args.cadence; hasUpdates = true; }
      if (args.times_per_cadence !== undefined) { updateData.times_per_cadence = args.times_per_cadence; hasUpdates = true; }
      if (args.target_type !== undefined) { updateData.target_type = args.target_type; hasUpdates = true; }
      if (args.target_value !== undefined) { updateData.target_value = args.target_value; hasUpdates = true; }
      if (args.active !== undefined) { updateData.active = args.active; hasUpdates = true; }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("ff_habits")
        .update(updateData)
        .eq("id", args.habit_id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `Hábito "${data.title}" atualizado!`;
    }

    case "delete_habit": {
      const { error } = await supabase
        .from("ff_habits")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("id", args.habit_id)
        .eq("tenant_id", tenantId);

      if (error) return `Erro: ${error.message}`;
      return "Hábito removido com sucesso.";
    }

    case "log_habit": {
      const logDate = (args.date as string) || today;
      const value = args.value !== undefined ? Number(args.value) : 1;
      if (Number.isNaN(value)) return "Valor inválido para o hábito.";

      const { data: existingLog, error: findError } = await supabase
        .from("ff_habit_logs")
        .select("id")
        .eq("habit_id", args.habit_id)
        .eq("log_date", logDate)
        .maybeSingle();

      if (findError) return `Erro: ${findError.message}`;

      if (existingLog) {
        const { error } = await supabase
          .from("ff_habit_logs")
          .update({ value })
          .eq("id", existingLog.id);

        if (error) return `Erro: ${error.message}`;
        return "Hábito atualizado para esta data.";
      }

      const { error } = await supabase
        .from("ff_habit_logs")
        .insert({
          tenant_id: tenantId,
          habit_id: args.habit_id,
          user_id: userId,
          log_date: logDate,
          value,
        });

      if (error) return `Erro: ${error.message}`;
      return "Hábito registrado com sucesso.";
    }

    case "update_reminder": {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      let hasUpdates = false;

      if (args.title !== undefined) { updateData.title = args.title; hasUpdates = true; }
      if (args.remind_at !== undefined) { updateData.remind_at = args.remind_at; hasUpdates = true; }
      if (args.channel !== undefined) { updateData.channel = args.channel; hasUpdates = true; }
      if (args.status !== undefined) { updateData.status = args.status; hasUpdates = true; }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("ff_reminders")
        .update(updateData)
        .eq("id", args.reminder_id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `Lembrete "${data.title}" atualizado!`;
    }

    case "delete_reminder": {
      const { error } = await supabase
        .from("ff_reminders")
        .delete()
        .eq("id", args.reminder_id)
        .eq("tenant_id", tenantId);

      if (error) return `Erro: ${error.message}`;
      return "Lembrete removido com sucesso.";
    }

    case "update_memory": {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      let hasUpdates = false;

      if (args.content !== undefined) { updateData.content = args.content; hasUpdates = true; }
      if (args.title !== undefined) { updateData.title = args.title; hasUpdates = true; }
      if (args.kind !== undefined) { updateData.kind = args.kind; hasUpdates = true; }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("ff_memory_items")
        .update(updateData)
        .eq("id", args.memory_id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return "Memória atualizada com sucesso.";
    }

    case "delete_memory": {
      const { error } = await supabase
        .from("ff_memory_items")
        .delete()
        .eq("id", args.memory_id)
        .eq("tenant_id", tenantId);

      if (error) return `Erro: ${error.message}`;
      return "Memória removida com sucesso.";
    }

    case "update_transfer": {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      let hasUpdates = false;

      if (args.from_wallet_id !== undefined) {
        const { id: fromId, error: fromError } = await resolveWalletId(
          supabase,
          userId,
          args.from_wallet_id as string
        );
        if (fromError) return fromError;
        updateData.from_wallet_id = fromId;
        hasUpdates = true;
      }

      if (args.to_wallet_id !== undefined) {
        const { id: toId, error: toError } = await resolveWalletId(
          supabase,
          userId,
          args.to_wallet_id as string
        );
        if (toError) return toError;
        updateData.to_wallet_id = toId;
        hasUpdates = true;
      }

      if (args.valor !== undefined) {
        const valor = Number(args.valor);
        if (Number.isNaN(valor) || valor <= 0) return "Valor inválido para transferência.";
        updateData.valor = valor;
        hasUpdates = true;
      }

      if (args.data !== undefined) { updateData.data = args.data; hasUpdates = true; }
      if (args.descricao !== undefined) { updateData.descricao = args.descricao; hasUpdates = true; }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      if (updateData.from_wallet_id && updateData.to_wallet_id && updateData.from_wallet_id === updateData.to_wallet_id) {
        return "A carteira de origem deve ser diferente da carteira de destino.";
      }

      const { data, error } = await supabase
        .from("transfers")
        .update(updateData)
        .eq("id", args.transfer_id)
        .eq("user_id", userId)
        .select("id, valor, data, descricao, from_wallet:from_wallet_id(nome), to_wallet:to_wallet_id(nome)")
        .single();

      if (error) return `Erro: ${error.message}`;

      return `Transferência atualizada: ${data.from_wallet?.nome} → ${data.to_wallet?.nome}, R$ ${Number(data.valor).toFixed(2)}.`;
    }

    case "delete_transfer": {
      const { error } = await supabase
        .from("transfers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", args.transfer_id)
        .eq("user_id", userId);

      if (error) return `Erro: ${error.message}`;
      return "Transferência removida com sucesso.";
    }

    case "update_wallet": {
      const updateData: any = {};
      let hasUpdates = false;

      if (args.nome !== undefined) { updateData.nome = args.nome; hasUpdates = true; }
      if (args.tipo !== undefined) { updateData.tipo = args.tipo; hasUpdates = true; }
      if (args.instituicao !== undefined) { updateData.instituicao = args.instituicao; hasUpdates = true; }
      if (args.saldo_inicial !== undefined) { updateData.saldo_inicial = args.saldo_inicial; hasUpdates = true; }
      if (args.limite_credito !== undefined) { updateData.limite_credito = args.limite_credito; hasUpdates = true; }
      if (args.limite_emergencia !== undefined) { updateData.limite_emergencia = args.limite_emergencia; hasUpdates = true; }
      if (args.dia_fechamento !== undefined) { updateData.dia_fechamento = args.dia_fechamento; hasUpdates = true; }
      if (args.dia_vencimento !== undefined) { updateData.dia_vencimento = args.dia_vencimento; hasUpdates = true; }
      if (args.ativo !== undefined) { updateData.ativo = args.ativo; hasUpdates = true; }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("wallets")
        .update(updateData)
        .eq("id", args.wallet_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `Carteira "${data.nome}" atualizada!`;
    }

    case "delete_wallet": {
      const { error } = await supabase
        .from("wallets")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", args.wallet_id)
        .eq("user_id", userId);

      if (error) return `Erro: ${error.message}`;
      return "Carteira removida com sucesso.";
    }

    case "update_category": {
      const updateData: any = {};
      let hasUpdates = false;

      if (args.nome !== undefined) { updateData.nome = args.nome; hasUpdates = true; }
      if (args.tipo !== undefined) { updateData.tipo = args.tipo; hasUpdates = true; }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("categories")
        .update(updateData)
        .eq("id", args.category_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return `Já existe uma categoria com o nome "${args.nome}".`;
        }
        return `Erro: ${error.message}`;
      }
      return `Categoria "${data.nome}" atualizada!`;
    }

    case "delete_category": {
      const { data: transactions } = await supabase
        .from("transactions")
        .select("id")
        .eq("category_id", args.category_id)
        .is("deleted_at", null)
        .limit(1);

      if (transactions && transactions.length > 0) {
        return "Não é possível excluir: esta categoria possui lançamentos associados.";
      }

      const { error } = await supabase
        .from("categories")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", args.category_id)
        .eq("user_id", userId);

      if (error) return `Erro: ${error.message}`;
      return "Categoria removida com sucesso.";
    }

    case "update_budget": {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      let hasUpdates = false;

      if (args.limite_valor !== undefined) { updateData.limite_valor = args.limite_valor; hasUpdates = true; }
      if (args.rollover_policy !== undefined) { updateData.rollover_policy = args.rollover_policy; hasUpdates = true; }
      if (args.rollover_cap !== undefined) { updateData.rollover_cap = args.rollover_cap; hasUpdates = true; }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("budgets")
        .update(updateData)
        .eq("id", args.budget_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return "Orçamento atualizado com sucesso.";
    }

    case "delete_budget": {
      const { error } = await supabase
        .from("budgets")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", args.budget_id)
        .eq("user_id", userId);

      if (error) return `Erro: ${error.message}`;
      return "Orçamento removido com sucesso.";
    }

    case "update_goal": {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      let hasUpdates = false;

      if (args.nome !== undefined) { updateData.nome = args.nome; hasUpdates = true; }
      if (args.valor_meta !== undefined) { updateData.valor_meta = args.valor_meta; hasUpdates = true; }
      if (args.prazo !== undefined) { updateData.prazo = args.prazo || null; hasUpdates = true; }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("goals")
        .update(updateData)
        .eq("id", args.goal_id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) return `Erro: ${error.message}`;
      return `Meta "${data.nome}" atualizada!`;
    }

    case "delete_goal": {
      const { error } = await supabase
        .from("goals")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", args.goal_id)
        .eq("user_id", userId);

      if (error) return `Erro: ${error.message}`;
      return "Meta removida com sucesso.";
    }

    case "update_transaction": {
      const transactionId = args.transaction_id as string;

      const { data: existing, error: existingError } = await supabase
        .from("transactions")
        .select("id, wallet_id, data, tipo")
        .eq("id", transactionId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();

      if (existingError) return `Erro: ${existingError.message}`;
      if (!existing) return "Transação não encontrada.";

      let shouldUnlink = false;
      if (existing.tipo === "despesa" && existing.wallet_id) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("tipo")
          .eq("id", existing.wallet_id)
          .single();

        if (wallet?.tipo === "cartao") {
          shouldUnlink = true;
        }
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      let hasUpdates = false;

      if (args.tipo !== undefined) { updateData.tipo = args.tipo; hasUpdates = true; }
      if (args.descricao !== undefined) { updateData.descricao = args.descricao; hasUpdates = true; }
      if (args.valor !== undefined) {
        const newValor = Number(args.valor);
        if (Number.isNaN(newValor)) return "Valor inválido. Informe um número válido.";
        updateData.valor = newValor;
        hasUpdates = true;
      }
      if (args.wallet_id !== undefined) { updateData.wallet_id = args.wallet_id; hasUpdates = true; }
      if (args.data !== undefined) {
        updateData.data = args.data;
        updateData.mes_referencia = (args.data as string).slice(0, 7);
        hasUpdates = true;
      }
      if (args.status !== undefined) { updateData.status = args.status; hasUpdates = true; }
      if (args.natureza !== undefined) { updateData.natureza = args.natureza; hasUpdates = true; }

      if (args.category_id !== undefined) {
        const { id: resolvedId, error: categoryError } = await resolveCategoryId(
          supabase,
          userId,
          args.category_id as string,
          (args.tipo as string) || existing.tipo
        );

        if (categoryError) return categoryError;
        updateData.category_id = resolvedId;
        hasUpdates = true;
      }

      if (!hasUpdates) return "Nenhum dado para atualizar.";

      const { data, error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transactionId)
        .eq("user_id", userId)
        .select(`*, categories:category_id(nome), wallets:wallet_id(nome)`)
        .single();

      if (error) return `Erro: ${error.message}`;

      if (shouldUnlink) {
        await unlinkTransactionFromStatement(supabase, transactionId);
      }

      const newWalletId = updateData.wallet_id || existing.wallet_id;
      const newTipo = updateData.tipo || existing.tipo;
      const newDate = updateData.data || existing.data;

      if (newTipo === "despesa" && newWalletId) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("tipo")
          .eq("id", newWalletId)
          .single();

        if (wallet?.tipo === "cartao") {
          const statementId = await ensureStatementExists(
            supabase,
            newWalletId,
            newDate,
            userId
          );
          if (statementId) {
            await linkTransactionToStatement(supabase, transactionId, statementId);
          }
        }
      }

      const tipoLabel = data.tipo === "despesa" ? "Despesa" : "Receita";
      return `${tipoLabel} atualizada: R$ ${Number(data.valor).toFixed(2)}. Carteira: ${data.wallets?.nome}, Categoria: ${data.categories?.nome}.`;
    }

    case "delete_transaction": {
      const transactionId = args.transaction_id as string;

      await unlinkTransactionFromStatement(supabase, transactionId);

      const { error: softError } = await supabase
        .from("transactions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", transactionId)
        .eq("user_id", userId);

      if (softError) {
        const { error: hardError } = await supabase
          .from("transactions")
          .delete()
          .eq("id", transactionId)
          .eq("user_id", userId);

        if (hardError) return `Erro: ${hardError.message}`;
      }

      return "Transação removida com sucesso.";
    }

    // ==================== PERFIL ====================
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
        etapa_onboarding: data.onboarding_step,
        preferencias: data.preferences,
        total_interacoes: data.interaction_count,
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
      if (args.preferences) {
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

      const updates = [];
      if (args.nickname) updates.push(`apelido: ${args.nickname}`);
      if (args.full_name) updates.push(`nome: ${args.full_name}`);
      if (args.onboarding_step) updates.push(`etapa: ${args.onboarding_step}`);
      if (args.onboarding_completed) updates.push("onboarding completo");

      return `Perfil atualizado: ${updates.join(", ")}`;
    }

    // ==================== AUTO-APRENDIZAGEM ====================
    case "auto_learn": {
      const { data, error } = await supabase
        .from("ff_memory_items")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          kind: "learned",
          content: args.learned_fact as string,
          title: args.category as string,
          metadata: {
            confidence: args.confidence || "medium",
            category: args.category,
            learned_at: new Date().toISOString(),
            source: "auto",
          },
          source: "jarvis-auto",
        })
        .select()
        .single();

      if (error) return `Erro ao salvar aprendizado: ${error.message}`;
      return `Aprendizado salvo: "${args.learned_fact}"`;
    }

    // ==================== BUSCA NO HISTÓRICO ====================
    case "search_conversation_history": {
      let query = supabase
        .from("ff_conversation_messages")
        .select(`
          content,
          role,
          created_at,
          conversation_id
        `)
        .eq("tenant_id", tenantId)
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: false });

      if (args.search_term) {
        query = query.ilike("content", `%${args.search_term}%`);
      }
      
      if (args.date_from) {
        query = query.gte("created_at", args.date_from);
      }

      const { data, error } = await query.limit((args.limit as number) || 20);
      
      if (error) return `Erro: ${error.message}`;
      if (!data?.length) return "Nenhuma conversa encontrada com esse termo.";
      
      return JSON.stringify(data.map((m: any) => ({
        role: m.role === "user" ? "Você" : "GUTA",
        mensagem: m.content.substring(0, 200) + (m.content.length > 200 ? "..." : ""),
        data: new Date(m.created_at).toLocaleDateString('pt-BR'),
      })));
    }

    default:
      return `Ferramenta desconhecida: ${toolName}`;
  }
}

// ==================== FETCH USER CONTEXT ====================
async function fetchUserContext(supabase: any, userId: string, tenantId: string) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const next24h = tomorrow.toISOString();
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];

  const [
    profileResult,
    walletsResult,
    pendingTasksResult,
    pendingBillsTodayResult,
    pendingBillsWeekResult,
    memoriesResult,
    learnedInsightsResult,
    habitsResult,
    habitLogsResult,
    eventsResult,
    monthExpensesResult,
    prevMonthExpensesResult,
  ] = await Promise.all([
    supabase.from("ff_user_profiles").select("*").eq("user_id", userId).eq("tenant_id", tenantId).single(),
    supabase.from("v_wallet_balance").select("wallet_id, wallet_nome, wallet_tipo, saldo").eq("user_id", userId),
    supabase.from("ff_tasks").select("id, title, priority, due_at").eq("tenant_id", tenantId).eq("due_at", today).neq("status", "done").limit(5),
    supabase.from("transactions").select("id, descricao, valor").eq("user_id", userId).eq("tipo", "despesa").eq("status", "pendente").eq("data", today).is("deleted_at", null).limit(5),
    supabase.from("transactions").select("id, descricao, valor, data").eq("user_id", userId).eq("tipo", "despesa").eq("status", "pendente").gte("data", today).lte("data", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]).is("deleted_at", null).limit(10),
    supabase.from("ff_memory_items").select("kind, title, content").eq("tenant_id", tenantId).in("kind", ["profile", "preference", "decision"]).order("created_at", { ascending: false }).limit(5),
    supabase.from("ff_memory_items").select("content, title, metadata").eq("tenant_id", tenantId).eq("kind", "learned").order("created_at", { ascending: false }).limit(15),
    supabase.from("ff_habits").select("id, title, cadence, times_per_cadence, target_value").eq("tenant_id", tenantId).eq("active", true).limit(10),
    supabase.from("ff_habit_logs").select("habit_id, value").eq("tenant_id", tenantId).eq("log_date", today),
    supabase.from("ff_events").select("id, title, start_at, location, all_day").eq("tenant_id", tenantId).eq("status", "scheduled").gte("start_at", now.toISOString()).lte("start_at", next24h).order("start_at", { ascending: true }).limit(5),
    supabase.from("transactions").select("valor").eq("user_id", userId).eq("tipo", "despesa").eq("status", "paga").gte("data", startOfMonth).lte("data", endOfMonth).is("deleted_at", null),
    supabase.from("transactions").select("valor").eq("user_id", userId).eq("tipo", "despesa").eq("status", "paga").gte("data", startOfPrevMonth).lte("data", endOfPrevMonth).is("deleted_at", null),
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
  const learnedInsights = learnedInsightsResult.data || [];

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
  const prevMonthExpenses = (prevMonthExpensesResult.data || []).reduce((sum: number, t: any) => sum + (t.valor || 0), 0);
  
  let expenseComparison = null;
  if (prevMonthExpenses > 0) {
    const percentChange = ((monthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100;
    expenseComparison = {
      current: monthExpenses,
      previous: prevMonthExpenses,
      percentChange: Math.round(percentChange),
      trend: percentChange > 0 ? "acima" : percentChange < 0 ? "abaixo" : "igual",
    };
  }

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
      learnedInsights,
      habitsWithProgress,
      habitsCompleted,
      habitsPending,
      upcomingEvents,
      monthExpenses,
      expenseComparison,
    },
  };
}

// ==================== UPDATE INTERACTION COUNT ====================
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

// ==================== MAIN HANDLER ====================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const errorId = crypto.randomUUID().slice(0, 8);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, conversationId, tenantId: reqTenantId, attachments } = await req.json();

    if ((!message && (!attachments || attachments.length === 0)) || !reqTenantId) {
      return new Response(
        JSON.stringify({ error: "Mensagem ou anexo e tenantId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    await updateInteractionCount(supabase, user.id, tenantId);

    const { profile: userProfile, context: userContext } = await fetchUserContext(supabase, user.id, tenantId);

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

    // ==================== PROCESS ATTACHMENTS ====================
    let processedMessage = message || "";
    const processedAttachments = attachments || [];
    
    // Transcribe audio attachments with Whisper
    for (const att of processedAttachments) {
      if (att.type === "audio") {
        try {
          console.log(`[GUTA] Transcribing audio: ${att.name}`);
          const transcription = await transcribeAudio(att.url, OPENAI_API_KEY);
          if (transcription) {
            processedMessage = `[Áudio transcrito: "${transcription}"]\n\n${processedMessage}`.trim();
          }
        } catch (e) {
          console.error(`[GUTA] Audio transcription failed:`, e);
          processedMessage = `[Áudio enviado: ${att.name} - transcrição falhou]\n\n${processedMessage}`.trim();
        }
      }
    }

    // Extract text from document attachments
    for (const att of processedAttachments) {
      if (att.type === "document") {
        try {
          console.log(`[GUTA] Extracting text from document: ${att.name}`);
          const documentText = await extractDocumentText(
            att.url,
            att.mime_type || "application/pdf",
            att.name
          );
          
          if (documentText && documentText.length > 0) {
            // Limit size to avoid context overflow (8000 chars ~2000 tokens)
            const truncatedText = documentText.substring(0, 8000);
            const isTruncated = documentText.length > 8000;
            
            processedMessage = `[Documento "${att.name}":\n${truncatedText}${isTruncated ? '\n... (texto truncado, documento completo tem ' + documentText.length + ' caracteres)' : ''}]\n\n${processedMessage}`.trim();
            console.log(`[GUTA] Document text extracted: ${truncatedText.length} chars (truncated: ${isTruncated})`);
          }
        } catch (e) {
          console.error(`[GUTA] Document extraction failed:`, e);
          processedMessage = `[Documento enviado: ${att.name} - extração de texto falhou]\n\n${processedMessage}`.trim();
        }
      }
    }

    // Insert user message FIRST with attachments
    const { data: insertedUserMsg } = await supabase.from("ff_conversation_messages").insert({
      conversation_id: convId,
      tenant_id: tenantId,
      role: "user",
      content: processedMessage,
      attachments: processedAttachments.length > 0 ? processedAttachments : null,
    }).select("id, created_at").single();

    // ==================== FIX: Fetch LAST 15 messages (not first) ====================
    const { data: historyRaw } = await supabase
      .from("ff_conversation_messages")
      .select("id, role, content, tool_calls, tool_call_id, created_at")
      .eq("conversation_id", convId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })  // Get most recent first
      .limit(15);

    // Reverse to chronological order (oldest to newest)
    const history = (historyRaw || []).reverse();

    // Safety check: ensure the just-inserted user message is included
    const lastHistoryMsg = history[history.length - 1];
    const userMsgIncluded = lastHistoryMsg && 
      lastHistoryMsg.role === "user" && 
      lastHistoryMsg.content === processedMessage;

    if (!userMsgIncluded && insertedUserMsg) {
      console.log("[GUTA] User message not in history, forcing inclusion");
      history.push({
        id: insertedUserMsg.id,
        role: "user",
        content: processedMessage,
        tool_calls: null,
        tool_call_id: null,
        created_at: insertedUserMsg.created_at,
      });
    }

    console.log(`[GUTA] Conv=${convId}, History count=${history.length}, Last msg role=${history[history.length - 1]?.role}, Attachments=${processedAttachments.length}`);

    const systemPrompt = buildSystemPrompt(userProfile, userContext);

    // Determine if we have images in this request
    const hasImages = processedAttachments.some((a: Attachment) => a.type === "image");
    const isNewUser = !userProfile || !userProfile.onboarding_completed;
    const historyLength = history?.length || 0;
    
    // Dynamic model selection based on complexity
    const modelToUse = selectModel(processedMessage, hasImages, isNewUser, historyLength);
    console.log(`[GUTA] Selected model: ${modelToUse}`);
    const forceCreateProject = shouldForceCreateProject(processedMessage);
    const toolChoice = forceCreateProject
      ? { type: "function", function: { name: "create_project" } }
      : undefined;


    // Build input array (Responses API)
    const inputMessages: any[] = [
      ...(history || [])
        .slice(0, -1) // All history except the last one (current message)
        .filter((m: any) => {
          if (m.role === "user") return true;
          if (m.role === "assistant") return m.content && m.content.trim().length > 0;
          return false;
        })
        .map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
    ];

    // Add current user message with multimodal support
    if (hasImages) {
      inputMessages.push(buildMessageWithAttachments(processedMessage, processedAttachments));
    } else {
      inputMessages.push({ role: "user", content: [{ type: "input_text", text: processedMessage }] });
    }

    const buildOpenAIError = (status: number, message: string) => {
      const err = new Error(message);
      (err as any).status = status;
      return err;
    };

    const callOpenAI = async (payload: any) => {
      const aiResponse = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`[GUTA][${errorId}] OpenAI error:`, aiResponse.status, errorText);
        throw buildOpenAIError(aiResponse.status, errorText);
      }

      return await aiResponse.json();
    };

    let aiData = await callOpenAI({
      model: modelToUse,
      instructions: systemPrompt,
      input: inputMessages,
      tools: OPENAI_TOOLS,
      ...(toolChoice ? { tool_choice: toolChoice } : {}),
    });

    let assistantContent = extractAssistantText(aiData);
    let functionCalls = extractFunctionCalls(aiData);
    let assistantMessage = {
      content: assistantContent,
      tool_calls: functionCalls.map((call: any) => ({
        id: call.call_id,
        type: "function",
        function: {
          name: call.name,
          arguments: call.arguments || "{}",
        },
      })),
    };

    // Handle tool calls loop
    let toolIterations = 0;
    const MAX_TOOL_ITERATIONS = 10;
    const executedTools: Array<{ name: string; result: string }> = [];

    while (assistantMessage?.tool_calls?.length > 0 && toolIterations < MAX_TOOL_ITERATIONS) {
      toolIterations++;
      console.log(`[GUTA] Tool iteration ${toolIterations}:`, assistantMessage.tool_calls.map((tc: any) => tc.function.name));

      // Save assistant message with tool_calls
      await supabase.from("ff_conversation_messages").insert({
        conversation_id: convId,
        tenant_id: tenantId,
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: assistantMessage.tool_calls,
      });

      const toolResults: any[] = [];
      for (const toolCall of assistantMessage.tool_calls) {
        // Safe JSON parse
        const args = safeJsonParse(toolCall.function.arguments);
        
        let result: string;
        try {
          result = await executeTool(
            toolCall.function.name,
            args,
            supabase,
            tenantId,
            user.id
          );
        } catch (toolError) {
          console.error(`[GUTA][${errorId}] Tool execution error:`, toolError);
          result = `Erro ao executar ${toolCall.function.name}: ${toolError instanceof Error ? toolError.message : 'Erro desconhecido'}`;
        }
        executedTools.push({ name: toolCall.function.name, result });

        toolResults.push({
          type: "function_call_output",
          call_id: toolCall.id,
          output: result,
        });

        await supabase.from("ff_conversation_messages").insert({
          conversation_id: convId,
          tenant_id: tenantId,
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });
      }

      if (assistantMessage.content && assistantMessage.content.trim().length > 0) {
        inputMessages.push({ role: "assistant", content: assistantMessage.content });
      }
      inputMessages.push(...toolResults);

      // Use gpt-4o-mini for tool follow-ups (cost optimization)
      aiData = await callOpenAI({
        model: AGENT_MODEL,
        instructions: systemPrompt,
        input: inputMessages,
        tools: forceCreateProject ? [] : OPENAI_TOOLS,
      });

      assistantContent = extractAssistantText(aiData);
      functionCalls = extractFunctionCalls(aiData);
      assistantMessage = {
        content: assistantContent,
        tool_calls: functionCalls.map((call: any) => ({
          id: call.call_id,
          type: "function",
          function: {
            name: call.name,
            arguments: call.arguments || "{}",
          },
        })),
      };
    }

    // Final response
    let finalContent = assistantMessage?.content;
    
    if (!finalContent || finalContent.trim().length === 0) {
      console.error(`[GUTA][${errorId}] Empty response from AI`);
      finalContent = "Tive um problema ao gerar a resposta. Pode tentar novamente?";
    }

    // Fallback: ensure structured summary if tools were executed
    if (executedTools.length > 0 && !/Resumo/i.test(finalContent)) {
      const summaryLines = executedTools.slice(0, 6).map((t) => {
        const isError = /^Erro\b|não encontrada|não encontrado|inválid|falh|duplicata/i.test(t.result);
        return `- ${isError ? "⚠️" : "✅"} ${t.result}`;
      });
      finalContent = `${finalContent}\n\nResumo:\n${summaryLines.join("\n")}`;
    }

    await supabase.from("ff_conversation_messages").insert({
      conversation_id: convId,
      tenant_id: tenantId,
      role: "assistant",
      content: finalContent,
    });

    // ==================== AUTO-GENERATE TITLE FOR NEW CONVERSATIONS ====================
    const isNewConversation = !conversationId;
    if (isNewConversation && message) {
      try {
        console.log(`[GUTA] Generating title for new conversation ${convId}`);
        const titleData = await callOpenAI({
          model: AGENT_MODEL,
          instructions: "Gere um título MUITO CURTO (2-5 palavras) que resume o assunto da conversa. Apenas o título, sem aspas ou pontuação final. Seja conciso e direto.",
          input: [
            {
              role: "user",
              content: `Primeira mensagem do usuário: "${message.substring(0, 150)}"`,
            },
          ],
        });

        const generatedTitle = extractAssistantText(titleData)?.trim();

        if (generatedTitle) {
          await supabase
            .from("ff_conversations")
            .update({ 
              title: generatedTitle, 
              updated_at: new Date().toISOString() 
            })
            .eq("id", convId);
          
          console.log(`[GUTA] Title generated: "${generatedTitle}"`);
        }
      } catch (titleError) {
        console.error(`[GUTA] Error generating title:`, titleError);
        // Fallback: use first words of the message
        const fallbackTitle = message.split(' ').slice(0, 4).join(' ');
        await supabase
          .from("ff_conversations")
          .update({ 
            title: fallbackTitle,
            updated_at: new Date().toISOString()
          })
          .eq("id", convId);
      }
    }

    return new Response(
      JSON.stringify({
        conversationId: convId,
        message: finalContent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[GUTA][${errorId}] Chat error:`, error);
    const status = (error as any)?.status;
    if (status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes na conta OpenAI." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ 
        error: "Ocorreu um erro ao processar sua mensagem. Tente novamente.",
        errorId: errorId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
