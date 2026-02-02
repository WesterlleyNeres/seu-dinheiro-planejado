

# Plano: Corrigir Leitura de PDFs no JARVIS

## Problema Identificado

A biblioteca `pdf-parse` (via esm.sh) não funciona em Deno/Edge Functions porque depende de `fs.readFileSync` do Node.js, que não existe nesse ambiente.

Erro nos logs:
```
[JARVIS] PDF parse error: Error: [unenv] fs.readFileSync is not implemented yet!
```

## Solução: Usar pdf.js (Mozilla) via Deno

O `pdf.js` da Mozilla tem uma versão que funciona em browsers/Deno sem dependências de Node.js. Vamos usar `pdfjs-dist` via esm.sh com a opção `legacy` que não depende de workers ou filesystem.

## Arquitetura da Solução

```text
PDF Upload
    ↓
Edge Function recebe URL do PDF
    ↓
┌─────────────────────────────────────────┐
│ 1. Baixar PDF como ArrayBuffer          │
│ 2. Carregar com pdf.js (pdfjs-dist)     │
│ 3. Para cada página (até 10):           │
│    a. Extrair texto da página           │
│    b. Se texto vazio → converter em     │
│       imagem (canvas) para Vision       │
│ 4. Combinar texto + imagens             │
└─────────────────────────────────────────┘
    ↓
Texto extraído OU imagens para GPT-4o Vision
```

## Implementacao

### Nova Funcao: `extractPDFContent`

```typescript
// Usar pdfjs-dist com configuração específica para Deno
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.min.mjs";

async function extractPDFContent(
  pdfUrl: string,
  maxPages: number = 10
): Promise<{ text: string; pageImages: string[] }> {
  // Baixar PDF
  const response = await fetch(pdfUrl);
  const arrayBuffer = await response.arrayBuffer();
  
  // Configurar pdf.js para não usar workers (edge functions)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  
  // Carregar documento
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const totalPages = Math.min(pdf.numPages, maxPages);
  let fullText = "";
  const pageImages: string[] = [];
  
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    
    if (pageText.trim()) {
      fullText += `\n--- Página ${i} ---\n${pageText}`;
    } else {
      // Página sem texto: renderizar como imagem (se possível)
      // Nota: Em Deno sem canvas, vamos informar que é visual
      pageImages.push(`Página ${i}: conteúdo visual/imagem`);
    }
  }
  
  return { text: fullText.trim(), pageImages };
}
```

### Fallback: Converter PDFs Visuais em Imagem

Como Deno não tem `canvas` nativo para renderizar páginas PDF como imagens, para PDFs visuais/diagramas usaremos uma abordagem alternativa:

1. Tentar extrair texto com pdf.js
2. Se não houver texto suficiente, informar ao usuário para enviar como imagem/screenshot
3. OU usar um serviço externo (ConvertAPI, CloudConvert) para converter PDF → PNG

### Implementação Simplificada (sem dependências de canvas)

```typescript
import { getDocument, GlobalWorkerOptions } from "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.min.mjs?target=deno";

GlobalWorkerOptions.workerSrc = ""; // Desabilitar worker

async function extractPDFText(pdfUrl: string, maxPages: number = 10): Promise<string> {
  const response = await fetch(pdfUrl);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  const pdf = await getDocument({ data: uint8Array }).promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  
  let fullText = "";
  let hasAnyText = false;
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str || "")
      .join(" ")
      .trim();
    
    if (pageText) {
      hasAnyText = true;
      fullText += `\n[Página ${pageNum}]\n${pageText}\n`;
    }
  }
  
  if (!hasAnyText) {
    return `[PDF com ${pdf.numPages} página(s), mas sem texto extraível. Parece ser um documento visual/escaneado. Para análise, envie como imagem ou screenshot.]`;
  }
  
  return fullText.trim();
}
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/ff-jarvis-chat/index.ts` | Substituir `pdf-parse` por `pdfjs-dist`, implementar `extractPDFText` |

---

## Seção Técnica

### Por que pdf.js funciona e pdf-parse não

| Biblioteca | Problema em Deno |
|------------|------------------|
| `pdf-parse` | Usa `fs.readFileSync` internamente |
| `pdfjs-dist` | Versão pura JavaScript, funciona em browsers/Deno |

### Configuração do pdf.js para Edge Functions

```typescript
// Importar versão minificada (menor bundle)
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.min.mjs?target=deno";

// CRÍTICO: Desabilitar worker (não funciona em edge functions)
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

// Carregar PDF a partir de ArrayBuffer
const loadingTask = pdfjsLib.getDocument({ 
  data: new Uint8Array(arrayBuffer),
  // Opções adicionais para melhorar compatibilidade
  disableFontFace: true,
  useSystemFonts: false,
});
```

### Limite de Páginas

Conforme solicitado, processaremos até **10 páginas** por padrão para balancear contexto vs. performance.

### Fluxo Atualizado

```text
1. Usuário envia PDF
2. Edge function baixa o PDF
3. Carrega com pdfjs-dist (sem workers)
4. Para cada página (1 a 10):
   - Extrai texto com getTextContent()
   - Se tem texto: adiciona ao buffer
   - Se não tem texto: marca como "visual"
5. Se extraiu texto: adiciona ao processedMessage
6. Se não extraiu: sugere enviar como imagem
7. Continua com o fluxo normal de IA
```

## Resultado Esperado

1. PDFs com texto embutido são lidos corretamente (ex: documentos Word convertidos)
2. PDFs visuais/escaneados informam claramente que precisam ser enviados como imagem
3. Limite de 10 páginas garante performance adequada
4. Sem erros de `fs.readFileSync`

