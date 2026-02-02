
# Plano: Suporte a Audio, Imagens e Documentos no Chat JARVIS

## Objetivo

Adicionar capacidade de enviar e receber midia (audio, imagens e documentos) no chat JARVIS, similar ao ChatGPT e WhatsApp.

## Arquitetura Atual

| Componente | Estado |
|------------|--------|
| `ff_conversation_messages` | Apenas campo `content` (texto) |
| `JarvisChat.tsx` | Input de texto apenas |
| `ChatMessage.tsx` | Renderiza apenas texto/markdown |
| `useJarvisChat.ts` | Envia apenas string |
| `ff-jarvis-chat` | Processa apenas texto |
| Storage | Bucket `social-images` existe |

## Visao Geral da Solucao

```text
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  JarvisChat.tsx                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [📎] [🎤] [_________ texto _________] [➤]               │   │
│  │      ^         ^                                        │   │
│  │  Anexar    Gravar                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ChatMessage.tsx                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [IMAGEM preview] ou [AUDIO player] ou [DOC link]        │   │
│  │  "Texto da mensagem..."                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                        STORAGE                                   │
├─────────────────────────────────────────────────────────────────┤
│  Bucket: chat-attachments/{tenant_id}/{conversation_id}/       │
│           {uuid}.{ext}                                          │
├─────────────────────────────────────────────────────────────────┤
│                        DATABASE                                  │
├─────────────────────────────────────────────────────────────────┤
│  ff_conversation_messages                                        │
│  + attachments: jsonb  (array de {type, url, name, size})       │
├─────────────────────────────────────────────────────────────────┤
│                     EDGE FUNCTION                                │
├─────────────────────────────────────────────────────────────────┤
│  ff-jarvis-chat                                                  │
│  - Recebe attachments[] com URLs                                 │
│  - Para imagens: envia como image_url ao OpenAI (GPT-4o Vision) │
│  - Para audio: transcreve via Whisper antes de processar        │
│  - Para docs: extrai texto ou menciona no contexto              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementacao Detalhada

### 1. Banco de Dados - Nova Coluna

Adicionar coluna `attachments` na tabela `ff_conversation_messages`:

```sql
ALTER TABLE ff_conversation_messages 
ADD COLUMN attachments jsonb DEFAULT NULL;

COMMENT ON COLUMN ff_conversation_messages.attachments IS 
'Array de anexos: [{type: "image"|"audio"|"document", url: string, name: string, size: number, mime_type: string}]';
```

### 2. Storage - Novo Bucket

Criar bucket para anexos do chat:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Usuarios podem fazer upload em suas proprias conversas
CREATE POLICY "Users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM tenants 
    WHERE user_id = auth.uid()
  )
);

-- RLS: Usuarios podem ver anexos de suas conversas
CREATE POLICY "Users can view their chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM tenants 
    WHERE user_id = auth.uid()
  )
);
```

### 3. Frontend - Input de Midia

#### 3.1 Novo Componente: `ChatInput.tsx`

Substituir o input simples por um componente completo:

```typescript
interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  isSending: boolean;
  disabled?: boolean;
}

interface Attachment {
  type: 'image' | 'audio' | 'document';
  file: File;
  preview?: string;
}

export function ChatInput({ onSend, isSending, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // ... handlers para anexos, gravacao, etc
}
```

Funcionalidades:
- Botao de anexar (📎) abre seletor de arquivos
- Botao de gravar audio (🎤) usa MediaRecorder API
- Preview de anexos antes de enviar
- Suporte a drag-and-drop

#### 3.2 Atualizar `ChatMessage.tsx`

Adicionar renderizacao de midia:

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  attachments?: Attachment[];  // NOVO
}

// Renderizar anexos
{message.attachments?.map((att, idx) => (
  <div key={idx}>
    {att.type === 'image' && (
      <img src={att.url} alt={att.name} className="rounded-lg max-w-[300px]" />
    )}
    {att.type === 'audio' && (
      <audio controls src={att.url} className="max-w-full" />
    )}
    {att.type === 'document' && (
      <a href={att.url} target="_blank" className="flex items-center gap-2">
        <FileText /> {att.name}
      </a>
    )}
  </div>
))}
```

### 4. Hook - Upload e Envio

Atualizar `useJarvisChat.ts`:

```typescript
interface SendMessageParams {
  message: string;
  attachments?: Array<{
    type: 'image' | 'audio' | 'document';
    file: File;
  }>;
}

// Funcao de upload
const uploadAttachment = async (file: File, conversationId: string) => {
  const ext = file.name.split('.').pop();
  const path = `${tenantId}/${conversationId}/${crypto.randomUUID()}.${ext}`;
  
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file);
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(path);
  
  return {
    type: getAttachmentType(file.type),
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    mime_type: file.type,
  };
};

// Envio atualizado
const sendMessage = useMutation({
  mutationFn: async ({ message, attachments }: SendMessageParams) => {
    let uploadedAttachments = [];
    
    // Upload dos anexos primeiro
    if (attachments?.length) {
      // Se nao tem conversationId, criar uma temp ID
      const targetConvId = conversationId || 'temp-' + Date.now();
      
      uploadedAttachments = await Promise.all(
        attachments.map(a => uploadAttachment(a.file, targetConvId))
      );
    }
    
    // Enviar para edge function
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/ff-jarvis-chat`,
      {
        method: 'POST',
        headers: { ... },
        body: JSON.stringify({
          message,
          conversationId,
          tenantId,
          attachments: uploadedAttachments,
        }),
      }
    );
    
    return response.json();
  },
});
```

### 5. Edge Function - Processamento de Midia

Atualizar `ff-jarvis-chat/index.ts`:

```typescript
// Tipos atualizados
interface ChatRequest {
  message: string;
  conversationId?: string;
  tenantId: string;
  attachments?: Array<{
    type: 'image' | 'audio' | 'document';
    url: string;
    name: string;
    mime_type: string;
  }>;
}

// Processar audio com Whisper (via OpenAI)
async function transcribeAudio(audioUrl: string): Promise<string> {
  // Baixar o audio
  const response = await fetch(audioUrl);
  const audioBlob = await response.blob();
  
  // Enviar para Whisper API
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', 'whisper-1');
  formData.append('language', 'pt');
  
  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });
  
  const result = await whisperRes.json();
  return result.text;
}

// Construir mensagem para OpenAI com midia
function buildMessageWithAttachments(
  message: string, 
  attachments: Attachment[]
): any {
  // Se tem imagens, usar formato multimodal
  const imageAttachments = attachments.filter(a => a.type === 'image');
  
  if (imageAttachments.length > 0) {
    return {
      role: 'user',
      content: [
        { type: 'text', text: message },
        ...imageAttachments.map(img => ({
          type: 'image_url',
          image_url: { url: img.url, detail: 'auto' }
        }))
      ]
    };
  }
  
  return { role: 'user', content: message };
}

// No handler principal
serve(async (req) => {
  const { message, attachments, ... } = await req.json();
  
  let processedMessage = message;
  let processedAttachments = attachments || [];
  
  // Transcrever audios
  for (const att of processedAttachments) {
    if (att.type === 'audio') {
      const transcription = await transcribeAudio(att.url);
      processedMessage = `[Audio transcrito: ${transcription}]\n\n${processedMessage}`;
    }
  }
  
  // Salvar mensagem com anexos
  await supabase.from('ff_conversation_messages').insert({
    conversation_id: convId,
    tenant_id: tenantId,
    role: 'user',
    content: processedMessage,
    attachments: processedAttachments.length > 0 ? processedAttachments : null,
  });
  
  // Construir mensagem para IA
  const userMessage = buildMessageWithAttachments(processedMessage, processedAttachments);
  
  // Chamar OpenAI com suporte a visao (GPT-4o)
  const aiResponse = await fetch(OPENAI_API_URL, {
    method: 'POST',
    body: JSON.stringify({
      model: 'gpt-4o', // Modelo com visao
      messages: [...history, userMessage],
      tools: TOOLS,
    }),
  });
  
  // ...
});
```

---

## Tipos de Midia Suportados

| Tipo | Extensoes | Limite | Processamento |
|------|-----------|--------|---------------|
| Imagem | jpg, png, gif, webp | 10MB | Vision (GPT-4o) |
| Audio | mp3, wav, m4a, ogg | 25MB | Whisper (transcricao) |
| Documento | pdf, txt, docx | 10MB | Extracao de texto |

---

## Arquivos a Modificar/Criar

| Arquivo | Alteracao |
|---------|-----------|
| **Migracao SQL** | Adicionar coluna `attachments` e bucket |
| `src/components/jarvis/chat/ChatInput.tsx` | **NOVO** - Input com anexos e gravacao |
| `src/components/jarvis/chat/ChatMessage.tsx` | Renderizar anexos (imagem/audio/doc) |
| `src/components/jarvis/chat/AttachmentPreview.tsx` | **NOVO** - Preview antes de enviar |
| `src/components/jarvis/chat/AudioRecorder.tsx` | **NOVO** - Gravacao de audio |
| `src/hooks/useJarvisChat.ts` | Upload de arquivos + envio de attachments |
| `src/pages/JarvisChat.tsx` | Integrar novo ChatInput |
| `supabase/functions/ff-jarvis-chat/index.ts` | Processar audio/imagem/docs |

---

## Fluxo de Usuario

### Enviar Imagem

1. Clica no 📎 ou arrasta imagem
2. Preview aparece abaixo do input
3. Digita texto opcional
4. Clica enviar
5. Imagem e feita upload para Storage
6. Edge function recebe URL e envia para GPT-4o Vision
7. JARVIS responde analisando a imagem

### Enviar Audio

1. Clica no 🎤 e segura para gravar
2. Solta para parar
3. Preview do audio aparece
4. Clica enviar
5. Audio e feito upload
6. Edge function transcreve com Whisper
7. Texto transcrito e processado pelo JARVIS

### Enviar Documento

1. Clica no 📎 e seleciona PDF/DOCX
2. Arquivo aparece como card
3. Envia
4. Edge function extrai texto (primeiras paginas)
5. JARVIS processa o conteudo

---

## Secao Tecnica Adicional

### Gravacao de Audio com MediaRecorder

```typescript
// Em AudioRecorder.tsx
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus'
  });
  
  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const file = new File([blob], 'audio.webm', { type: 'audio/webm' });
    onRecordingComplete(file);
  };
  
  mediaRecorder.start();
  mediaRecorderRef.current = mediaRecorder;
};
```

### Modelo para Visao

- Usar `gpt-4o` quando houver imagens (suporta vision)
- Manter `o3` para texto puro (melhor raciocinio)

### RLS para Bucket

O bucket sera privado, e o acesso sera via signed URLs ou atraves de RLS que verifica se o usuario pertence ao tenant da conversa.

---

## Resultado Esperado

1. Usuarios podem enviar imagens e JARVIS as analisa
2. Usuarios podem gravar audio e JARVIS transcreve + responde
3. Usuarios podem enviar documentos e JARVIS extrai informacoes
4. Anexos aparecem nas mensagens do historico
5. Interface similar ao ChatGPT/WhatsApp com botoes de midia
