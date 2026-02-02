import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ==================== MULTI-AGENT CONFIGURATION ====================
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Orchestrator uses o3 for complex reasoning
const ORCHESTRATOR_MODEL = "o3";
// Specialized agents use gpt-4o-mini for efficiency
const AGENT_MODEL = "gpt-4o-mini";

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
Você é como o JARVIS do Tony Stark - elegante, inteligente e acolhedor.

ETAPAS DO ONBOARDING (siga na ordem):

1. **WELCOME** (etapa atual: welcome)
   - Apresente-se: "Olá! Eu sou o JARVIS, seu assistente pessoal aqui no Fractto Flow."
   - Pergunte: "Como posso te chamar?" ou "Qual seu nome/apelido?"
   - AGUARDE a resposta antes de continuar
   - Quando responder, use update_user_profile para salvar nickname e mude onboarding_step para 'profile'

2. **PROFILE** (etapa: profile)
   - Agradeça pelo nome: "Prazer em conhecê-lo, [nome]!"
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
   - Se recusar: tudo bem, pule

5. **COMPLETE** (etapa: complete)
   - Parabenize: "Pronto! Você está configurado, [nome]! 🎉"
   - Resuma o que foi criado
   - Use update_user_profile com onboarding_completed: true e onboarding_step: 'complete'
   - Sugira explorar: "Agora você pode explorar o Dashboard, ver suas tarefas, ou simplesmente conversar comigo!"

REGRAS DO ONBOARDING:
- Seja ACOLHEDOR e PACIENTE - nunca apresse o usuário
- Uma pergunta por vez - não sobrecarregue
- Se o usuário desviar do assunto, responda e gentilmente retome
- Use emojis moderadamente (1-2 por mensagem)
- Celebre cada pequena conquista
- NÃO force ações - sempre pergunte antes
- Se o usuário disser "pular" ou "depois", use update_user_profile para marcar onboarding_completed: true

ESTADO ATUAL DO ONBOARDING: ${userProfile?.onboarding_step || 'welcome'}
` : '';

  return `Você é JARVIS, o assistente pessoal superinteligente do ${nickname}. 
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
${contextSections}

CAPACIDADES: Finanças (carteiras, transações), Tarefas, Eventos, Hábitos, Memórias, Lembretes.

FLUXO PARA DESPESAS:
1. list_wallets (verificar se existe)
2. Se não houver: pergunte se quer criar
3. list_categories (mapear categoria)
4. create_transaction
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
      description: "Salva uma informação na memória do JARVIS.",
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
      description: "Registra despesa ou receita. Use list_wallets e list_categories antes para obter os IDs corretos.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["despesa", "receita"], description: "Tipo" },
          descricao: { type: "string", description: "Descrição" },
          valor: { type: "number", description: "Valor em reais" },
          wallet_id: { type: "string", description: "ID da carteira (UUID)" },
          category_id: { type: "string", description: "ID da categoria (UUID) ou nome da categoria" },
          data: { type: "string", description: "Data YYYY-MM-DD" },
          status: { type: "string", enum: ["paga", "pendente"], description: "Status" },
        },
        required: ["tipo", "descricao", "valor", "category_id"],
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
    console.log(`[JARVIS] Downloading document: ${fileName} (${mimeType})`);
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status}`);
    }

    // Plain text files: read directly
    if (mimeType === "text/plain" || fileName.endsWith(".txt")) {
      const text = await response.text();
      console.log(`[JARVIS] Extracted ${text.length} chars from text file`);
      return text;
    }

    // CSV files: read directly  
    if (mimeType === "text/csv" || fileName.endsWith(".csv")) {
      const text = await response.text();
      console.log(`[JARVIS] Extracted ${text.length} chars from CSV file`);
      return text;
    }

    // JSON files: read and format
    if (mimeType === "application/json" || fileName.endsWith(".json")) {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        const formatted = JSON.stringify(json, null, 2);
        console.log(`[JARVIS] Extracted ${formatted.length} chars from JSON file`);
        return formatted;
      } catch {
        return text;
      }
    }

    // PDF files: use pdfjs-dist legacy build (no canvas dependency)
    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      try {
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Use legacy build which doesn't require canvas
        const pdfjsLib = await import("https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.mjs");
        
        // CRITICAL: Disable worker (not available in edge functions)
        pdfjsLib.GlobalWorkerOptions.workerSrc = "";
        
        // Load PDF document with minimal options
        const loadingTask = pdfjsLib.getDocument({
          data: uint8Array,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: false,
        });
        
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const maxPages = Math.min(numPages, 10); // Process up to 10 pages
        
        let fullText = "";
        let pagesWithText = 0;
        let visualPages: number[] = [];
        
        console.log(`[JARVIS] Processing PDF: ${numPages} total pages, extracting up to ${maxPages}`);
        
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          try {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            const pageText = textContent.items
              .map((item: any) => item.str || "")
              .join(" ")
              .trim();
            
            if (pageText && pageText.length > 10) {
              pagesWithText++;
              fullText += `\n[Página ${pageNum}]\n${pageText}\n`;
            } else {
              visualPages.push(pageNum);
            }
          } catch (pageError) {
            console.error(`[JARVIS] Error extracting page ${pageNum}:`, pageError);
            visualPages.push(pageNum);
          }
        }
        
        console.log(`[JARVIS] PDF extraction complete: ${pagesWithText} pages with text, ${visualPages.length} visual pages`);
        
        // Build response based on what was extracted
        if (pagesWithText === 0) {
          return `[PDF "${fileName}" contém ${numPages} página(s), mas sem texto extraível. Este PDF parece ser baseado em imagens/diagrama visual. Para análise completa, envie as páginas como imagens/screenshots.]`;
        }
        
        let result = fullText.trim();
        
        if (visualPages.length > 0 && numPages <= 10) {
          result += `\n\n[Nota: Página(s) ${visualPages.join(", ")} parecem ser visuais/imagens e não puderam ser lidas como texto.]`;
        }
        
        if (numPages > 10) {
          result += `\n\n[Nota: PDF tem ${numPages} páginas, foram processadas apenas as primeiras 10.]`;
        }
        
        console.log(`[JARVIS] Extracted ${result.length} chars from PDF`);
        return result;
        
      } catch (pdfError) {
        console.error(`[JARVIS] PDF parse error:`, pdfError);
        return `[PDF "${fileName}" recebido, mas não foi possível processar. Erro: ${pdfError instanceof Error ? pdfError.message : 'desconhecido'}. Tente enviar como imagem/screenshot.]`;
      }
    }

    // Word documents (.docx): inform limitation
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx")) {
      return `[Documento Word "${fileName}" recebido. Para análise completa, exporte como PDF ou copie o texto diretamente.]`;
    }

    // Other formats: not supported
    return `[Documento "${fileName}" (${mimeType}) anexado. Formato não suportado para extração automática de texto.]`;

  } catch (e) {
    console.error(`[JARVIS] Document extraction failed for ${fileName}:`, e);
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
        { type: "text", text: message || "Analise esta imagem." },
        ...imageAttachments.map((img) => ({
          type: "image_url",
          image_url: { url: img.url, detail: "auto" },
        })),
      ],
    };
  }
  
  // Text-only message
  return { role: "user", content: message };
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

  // Multiple matches - return first but log
  console.log(`Multiple categories match "${categoryInput}":`, filtered.map((c: any) => c.nome));
  return { id: filtered[0].id, error: null };
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

      return JSON.stringify(data.map((m: any) => ({
        titulo: m.title,
        conteudo: m.content,
        tipo: m.kind,
        criado_em: m.created_at,
      })));
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
      let walletId = args.wallet_id as string;
      const tipo = args.tipo as string;
      const categoryInput = args.category_id as string;
      
      // Resolve category (can be UUID or name)
      const { id: resolvedCategoryId, error: categoryError } = await resolveCategoryId(
        supabase,
        userId,
        categoryInput,
        tipo
      );

      if (categoryError) {
        return categoryError;
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

      if (!walletId) {
        const wallet = await fetchLatestWallet();
        if (!wallet) {
          return "Erro: Nenhuma carteira cadastrada. Crie uma primeiro com create_wallet.";
        }
        walletId = wallet.id;
      }

      const transactionDate = (args.data as string) || today;
      const descricao = args.descricao as string;
      const valor = args.valor as number;

      // Check for duplicates
      const isDuplicate = await checkDuplicateTransaction(
        supabase,
        userId,
        walletId,
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

      const tipoLabel = data.tipo === "despesa" ? "Despesa" : "Receita";
      return `${tipoLabel} de R$ ${data.valor.toFixed(2)} registrada! Carteira: ${data.wallets?.nome}, Categoria: ${data.categories?.nome}`;
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
        role: m.role === "user" ? "Você" : "JARVIS",
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
          console.log(`[JARVIS] Transcribing audio: ${att.name}`);
          const transcription = await transcribeAudio(att.url, OPENAI_API_KEY);
          if (transcription) {
            processedMessage = `[Áudio transcrito: "${transcription}"]\n\n${processedMessage}`.trim();
          }
        } catch (e) {
          console.error(`[JARVIS] Audio transcription failed:`, e);
          processedMessage = `[Áudio enviado: ${att.name} - transcrição falhou]\n\n${processedMessage}`.trim();
        }
      }
    }

    // Extract text from document attachments
    for (const att of processedAttachments) {
      if (att.type === "document") {
        try {
          console.log(`[JARVIS] Extracting text from document: ${att.name}`);
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
            console.log(`[JARVIS] Document text extracted: ${truncatedText.length} chars (truncated: ${isTruncated})`);
          }
        } catch (e) {
          console.error(`[JARVIS] Document extraction failed:`, e);
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
      console.log("[JARVIS] User message not in history, forcing inclusion");
      history.push({
        id: insertedUserMsg.id,
        role: "user",
        content: processedMessage,
        tool_calls: null,
        tool_call_id: null,
        created_at: insertedUserMsg.created_at,
      });
    }

    console.log(`[JARVIS] Conv=${convId}, History count=${history.length}, Last msg role=${history[history.length - 1]?.role}, Attachments=${processedAttachments.length}`);

    const systemPrompt = buildSystemPrompt(userProfile, userContext);

    // Determine if we have images in this request
    const hasImages = processedAttachments.some((a: Attachment) => a.type === "image");
    
    // Use GPT-4o for vision (when images present), otherwise use o3 orchestrator
    const modelToUse = hasImages ? "gpt-4o" : ORCHESTRATOR_MODEL;

    // Build messages array
    const messages: any[] = [
      { role: "system", content: systemPrompt },
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
      messages.push(buildMessageWithAttachments(processedMessage, processedAttachments));
    } else {
      messages.push({ role: "user", content: processedMessage });
    }

    // Call OpenAI API
    let aiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        tools: TOOLS,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[JARVIS][${errorId}] OpenAI error:`, aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes na conta OpenAI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`OpenAI error: ${aiResponse.status} - ${errorText}`);
    }

    let aiData = await aiResponse.json();
    let assistantMessage = aiData.choices?.[0]?.message;

    // Handle tool calls loop
    let toolIterations = 0;
    const MAX_TOOL_ITERATIONS = 10;

    while (assistantMessage?.tool_calls?.length > 0 && toolIterations < MAX_TOOL_ITERATIONS) {
      toolIterations++;
      console.log(`[JARVIS] Tool iteration ${toolIterations}:`, assistantMessage.tool_calls.map((tc: any) => tc.function.name));

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
          console.error(`[JARVIS][${errorId}] Tool execution error:`, toolError);
          result = `Erro ao executar ${toolCall.function.name}: ${toolError instanceof Error ? toolError.message : 'Erro desconhecido'}`;
        }

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });

        await supabase.from("ff_conversation_messages").insert({
          conversation_id: convId,
          tenant_id: tenantId,
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });
      }

      messages.push(assistantMessage);
      messages.push(...toolResults);

      // Use gpt-4o-mini for tool follow-ups (cost optimization)
      aiResponse = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AGENT_MODEL,
          messages,
          tools: TOOLS,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`[JARVIS][${errorId}] OpenAI tool follow-up error:`, aiResponse.status, errorText);
        throw new Error(`OpenAI error on tool follow-up: ${aiResponse.status}`);
      }

      aiData = await aiResponse.json();
      assistantMessage = aiData.choices?.[0]?.message;
    }

    // Final response
    let finalContent = assistantMessage?.content;
    
    if (!finalContent || finalContent.trim().length === 0) {
      console.error(`[JARVIS][${errorId}] Empty response from AI`);
      finalContent = "Tive um problema ao gerar a resposta. Pode tentar novamente?";
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
        console.log(`[JARVIS] Generating title for new conversation ${convId}`);
        
        const titleRes = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: AGENT_MODEL,
            messages: [
              {
                role: "system",
                content: "Gere um título MUITO CURTO (2-5 palavras) que resume o assunto da conversa. Apenas o título, sem aspas ou pontuação final. Seja conciso e direto."
              },
              {
                role: "user",
                content: `Primeira mensagem do usuário: "${message.substring(0, 150)}"`
              }
            ],
            max_tokens: 20,
            temperature: 0.7,
          }),
        });

        if (titleRes.ok) {
          const titleData = await titleRes.json();
          const generatedTitle = titleData.choices?.[0]?.message?.content?.trim();

          if (generatedTitle) {
            await supabase
              .from("ff_conversations")
              .update({ 
                title: generatedTitle, 
                updated_at: new Date().toISOString() 
              })
              .eq("id", convId);
            
            console.log(`[JARVIS] Title generated: "${generatedTitle}"`);
          }
        } else {
          console.error(`[JARVIS] Failed to generate title: ${titleRes.status}`);
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
      } catch (titleError) {
        console.error(`[JARVIS] Error generating title:`, titleError);
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
    console.error(`[JARVIS][${errorId}] Chat error:`, error);
    return new Response(
      JSON.stringify({ 
        error: "Ocorreu um erro ao processar sua mensagem. Tente novamente.",
        errorId: errorId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
