

# Plano: Corrigir Processamento de Documentos no Chat JARVIS

## Problema Identificado

O PDF "Diagrama de Pacotes Invext.pdf" está sendo enviado corretamente para o storage, mas a edge function **não extrai o conteúdo** do documento. Apenas o link é passado para a IA, que não consegue "ler" URLs de PDFs.

**Fluxo atual (com bug):**
```text
Usuário envia PDF
      ↓
Upload para storage ✓
      ↓
Edge function recebe {type: "document", url: "https://..."} 
      ↓
Mensagem enviada ao GPT: "leia o documento"
      ↓
GPT não tem acesso à URL do PDF ← PROBLEMA
      ↓
JARVIS diz "não recebi arquivo"
```

## Solução

Adicionar extração de texto de documentos na edge function, similar ao que fazemos com áudio (Whisper):

```text
Usuário envia PDF
      ↓
Upload para storage ✓
      ↓
Edge function recebe {type: "document", url: "https://..."}
      ↓
NOVA ETAPA: Baixar PDF e extrair texto
      ↓
Texto extraído adicionado à mensagem: "[Documento: conteúdo...]"
      ↓
GPT processa o texto ✓
```

---

## Implementacao

### Edge Function - Processar Documentos

Adicionar função para extrair texto de PDFs e outros documentos:

```typescript
// Para PDFs: usar pdf-parse (biblioteca Deno)
// Para TXT: ler diretamente
// Para outros: mencionar que foi anexado

async function extractDocumentText(
  documentUrl: string, 
  mimeType: string, 
  fileName: string
): Promise<string> {
  try {
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }
    
    if (mimeType === "text/plain") {
      // Arquivos de texto: ler diretamente
      return await response.text();
    }
    
    if (mimeType === "application/pdf") {
      // PDFs: usar pdf-parse ou alternativa
      // Como pdf-parse requer Node, usaremos uma abordagem alternativa
      
      // Opção 1: Converter para imagem e usar Vision
      // Opção 2: Usar API externa de extração
      // Opção 3: Usar biblioteca Deno compatível
      
      // Implementação com mozilla/pdf.js via CDN
      const pdfBuffer = await response.arrayBuffer();
      const text = await extractPDFText(pdfBuffer);
      return text;
    }
    
    // Outros formatos: não suportado
    return `[Documento ${fileName} anexado - formato não suportado para leitura]`;
    
  } catch (e) {
    console.error("[JARVIS] Document extraction failed:", e);
    return `[Documento ${fileName} anexado - não foi possível extrair texto]`;
  }
}
```

### Integração no Fluxo Principal

No handler principal, após processar áudios:

```typescript
// Process documents
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
        // Limitar tamanho para não estourar contexto
        const truncatedText = documentText.substring(0, 8000);
        const isTruncated = documentText.length > 8000;
        
        processedMessage = `[Documento "${att.name}":\n${truncatedText}${isTruncated ? '\n... (texto truncado)' : ''}]\n\n${processedMessage}`.trim();
      }
    } catch (e) {
      console.error(`[JARVIS] Document extraction failed:`, e);
      processedMessage = `[Documento enviado: ${att.name} - extração de texto falhou]\n\n${processedMessage}`.trim();
    }
  }
}
```

---

## Abordagem para PDFs em Deno/Edge Functions

Como estamos em Deno (edge functions), precisamos de uma biblioteca compatível. Opções:

### Opção A: Usar PDF como Imagem (Vision)
- Converter primeira página para imagem
- Enviar ao GPT-4o Vision
- Limitação: apenas primeira página, depende de OCR

### Opção B: pdf-lib para extração básica
- Biblioteca Deno compatível
- Extrai texto embedded em PDFs
- Limitação: não funciona com PDFs escaneados

### Opção C: API externa (recomendada para produção)
- Usar serviço como Adobe PDF Extract, AWS Textract, etc.
- Requer configuração adicional

### Opção D: Fallback simples (implementação inicial)
- Tentar ler como texto
- Se for PDF, informar ao usuário que PDFs complexos precisam de OCR
- Sugerir enviar como imagem (screenshot)

**Recomendação**: Implementar Opção D primeiro (fallback) e depois evoluir para Opção A (Vision) ou C (API externa).

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/ff-jarvis-chat/index.ts` | Adicionar `extractDocumentText` e processar documentos no loop |

---

## Implementação Detalhada

Para a versão inicial, usaremos uma abordagem híbrida:

1. **PDFs**: Converter para data URL e enviar como imagem ao GPT-4o Vision
2. **TXT/Plain text**: Ler diretamente
3. **Outros**: Informar que formato não é suportado

### Código para PDF como Imagem

```typescript
async function processPDFAsImage(
  pdfUrl: string,
  apiKey: string
): Promise<{ type: "text" | "image_url"; content: any }> {
  // Baixar PDF e converter para base64
  const response = await fetch(pdfUrl);
  const buffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  
  // PDFs não podem ser enviados diretamente como imagem ao Vision
  // Precisamos de um serviço de conversão ou usar biblioteca
  
  // Fallback: informar que PDF foi recebido mas precisa de conversão
  return {
    type: "text",
    content: `[Documento PDF recebido. Para PDFs complexos, considere enviar como screenshot/imagem para melhor análise.]`
  };
}
```

### Solução Prática

Para PDFs, vamos usar uma abordagem que funciona no Deno:

```typescript
import * as pdfParse from "https://esm.sh/pdf-parse@1.1.1";

async function extractPDFContent(pdfUrl: string): Promise<string> {
  const response = await fetch(pdfUrl);
  const buffer = await response.arrayBuffer();
  
  try {
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (e) {
    console.error("PDF parse error:", e);
    return "";
  }
}
```

---

## Resultado Esperado

1. Usuário envia PDF
2. Edge function extrai texto do documento
3. Texto é incluído na mensagem: `[Documento "nome.pdf": conteúdo extraído...]`
4. JARVIS consegue analisar e responder sobre o documento
5. Se extração falhar, JARVIS informa claramente e sugere alternativas

---

## Seção Técnica: Limitações de PDFs em Edge Functions

Edge functions Deno têm limitações para parsing de PDFs:
- Timeout de 30-60 segundos
- Memória limitada
- Bibliotecas Node.js não funcionam diretamente

**Estratégia de fallback:**
1. Tentar extrair texto simples
2. Se falhar, informar usuário
3. Para PDFs complexos (diagramas como o enviado), sugerir enviar como imagem

O PDF do usuário "Diagrama de Pacotes Invext" é um **diagrama visual** - mesmo extraindo texto, seria melhor enviá-lo como imagem para o Vision analisar o layout.

