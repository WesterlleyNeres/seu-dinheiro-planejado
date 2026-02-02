/**
 * Parser para arquivos de exportação do ChatGPT
 * Extrai conversas e mensagens do formato JSON exportado
 */

// Tipos do formato de exportação do ChatGPT
export interface ChatGPTExportConversation {
  id: string;
  title: string;
  create_time: number;
  update_time?: number;
  mapping: Record<string, ChatGPTNode>;
}

export interface ChatGPTNode {
  id?: string;
  message?: ChatGPTRawMessage;
  parent?: string;
  children?: string[];
}

export interface ChatGPTRawMessage {
  id: string;
  author: { role: 'user' | 'assistant' | 'system' | 'tool' };
  create_time?: number;
  content: {
    content_type: string;
    parts?: (string | null)[];
  };
}

// Tipos parseados para uso interno
export interface ParsedConversation {
  id: string;
  title: string;
  createdAt: Date;
  messageCount: number;
  messages: ParsedMessage[];
}

export interface ParsedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  hash: string;
  conversationId: string;
  conversationTitle: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
}

export interface ParseError {
  type: 'invalid_json' | 'invalid_format' | 'empty' | 'too_large';
  message: string;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Gera hash simples para deduplicação de conteúdo
 * Usa algoritmo djb2 para velocidade (não precisa ser criptográfico)
 */
export function generateHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
  }
  // Converter para hex positivo
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Valida se o arquivo é um JSON válido do ChatGPT
 */
export function validateFile(file: File): ParseError | null {
  if (file.size > MAX_FILE_SIZE) {
    return {
      type: 'too_large',
      message: `Arquivo muito grande (${Math.round(file.size / 1024 / 1024)}MB). Máximo: 500MB`,
    };
  }

  if (!file.name.endsWith('.json')) {
    return {
      type: 'invalid_format',
      message: 'O arquivo deve ser um JSON exportado do ChatGPT',
    };
  }

  return null;
}

/**
 * Extrai mensagens de uma conversa do ChatGPT
 */
function extractMessages(conversation: ChatGPTExportConversation): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const mapping = conversation.mapping || {};

  for (const nodeId in mapping) {
    const node = mapping[nodeId];
    const msg = node?.message;

    if (!msg) continue;

    // Filtrar apenas mensagens de user e assistant com conteúdo de texto
    const role = msg.author?.role;
    if (role !== 'user' && role !== 'assistant') continue;

    // Extrair conteúdo das parts
    const parts = msg.content?.parts;
    if (!parts || !Array.isArray(parts)) continue;

    // Concatenar todas as parts que são strings não-vazias
    const content = parts
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .join('\n')
      .trim();

    if (!content) continue;

    // Criar timestamp se disponível
    const timestamp = msg.create_time
      ? new Date(msg.create_time * 1000)
      : undefined;

    messages.push({
      role,
      content,
      timestamp,
      hash: generateHash(`${conversation.id}:${role}:${content}`),
      conversationId: conversation.id,
      conversationTitle: conversation.title || 'Conversa sem título',
    });
  }

  // Ordenar por timestamp se disponível
  messages.sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return a.timestamp.getTime() - b.timestamp.getTime();
  });

  return messages;
}

/**
 * Parseia o conteúdo JSON do arquivo de exportação
 */
export function parseExportContent(jsonContent: string): ParsedConversation[] | ParseError {
  let data: unknown;

  try {
    data = JSON.parse(jsonContent);
  } catch {
    return {
      type: 'invalid_json',
      message: 'O arquivo não é um JSON válido',
    };
  }

  // ChatGPT export é um array de conversas
  if (!Array.isArray(data)) {
    return {
      type: 'invalid_format',
      message: 'Formato inválido. O arquivo deve ser o export do ChatGPT (conversations.json)',
    };
  }

  if (data.length === 0) {
    return {
      type: 'empty',
      message: 'Nenhuma conversa encontrada no arquivo',
    };
  }

  const conversations: ParsedConversation[] = [];

  for (const item of data) {
    // Verificar se tem estrutura básica de conversa
    if (!item || typeof item !== 'object') continue;

    const conv = item as ChatGPTExportConversation;

    // Pular se não tem mapping (estrutura de mensagens)
    if (!conv.mapping || typeof conv.mapping !== 'object') continue;

    const messages = extractMessages(conv);

    // Só incluir conversas com pelo menos uma mensagem
    if (messages.length === 0) continue;

    conversations.push({
      id: conv.id || crypto.randomUUID(),
      title: conv.title || 'Conversa sem título',
      createdAt: conv.create_time ? new Date(conv.create_time * 1000) : new Date(),
      messageCount: messages.length,
      messages,
    });
  }

  if (conversations.length === 0) {
    return {
      type: 'empty',
      message: 'Nenhuma conversa válida encontrada no arquivo',
    };
  }

  // Ordenar por data (mais recentes primeiro)
  conversations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return conversations;
}

/**
 * Lê e parseia um arquivo de exportação do ChatGPT
 */
export async function parseExportFile(file: File): Promise<ParsedConversation[] | ParseError> {
  const validationError = validateFile(file);
  if (validationError) {
    return validationError;
  }

  try {
    const content = await file.text();
    return parseExportContent(content);
  } catch {
    return {
      type: 'invalid_json',
      message: 'Erro ao ler o arquivo',
    };
  }
}

/**
 * Converte uma mensagem parseada para o formato de ff_memory_items
 */
export function mapToMemoryItem(
  message: ParsedMessage,
  tenantId: string,
  userId: string
): {
  tenant_id: string;
  user_id: string;
  kind: string;
  title: string;
  content: string;
  source: string;
  metadata: Record<string, unknown>;
} {
  return {
    tenant_id: tenantId,
    user_id: userId,
    kind: message.role === 'user' ? 'chatgpt_user' : 'chatgpt_assistant',
    title: message.conversationTitle,
    content: message.content,
    source: 'chatgpt',
    metadata: {
      conversation_id: message.conversationId,
      content_hash: message.hash,
      original_timestamp: message.timestamp?.toISOString() || null,
      role: message.role,
    },
  };
}
