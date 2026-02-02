
# Plano: Melhorar Qualidade de Interacao do Chat JARVIS

## Problemas Identificados

Analisando os screenshots e os dados do banco, identifiquei os seguintes problemas:

### 1. Problema de Timing nas Acoes Encadeadas
- O JARVIS cria carteira e tenta criar transacao no mesmo ciclo
- Erro de foreign key: `transactions_wallet_id_fkey` pois a transacao e executada antes da carteira estar disponivel
- Resulta em "contratempo tecnico" repetido

### 2. Verbosidade Excessiva
- Respostas muito longas com informacoes repetidas
- O AI repete a mesma informacao sobre a carteira multiplas vezes
- Falta instrucao no system prompt para ser conciso

### 3. Ignora Perguntas Diretas
- Quando o usuario pergunta "voce tem acesso ao historico?", o AI ignora
- O system prompt esta focado demais em tarefas e nao em conversacao natural
- Falta instrucao para responder perguntas do usuario primeiro

### 4. System Prompt Muito Extenso
- O prompt tem muitas secoes que confundem o modelo
- Muitas "regras" fazem o AI perder o foco na mensagem do usuario

---

## Solucao Proposta

### Fase 1: Ajustar System Prompt (Prioridade Alta)

Modificar o `buildSystemPrompt` para:

1. **Adicionar regra de concisao**:
```
REGRAS DE COMUNICACAO:
- Respostas CONCISAS: maximo 2-3 paragrafos curtos
- PRIMEIRO responda a pergunta do usuario, DEPOIS ofereca ajuda adicional
- NAO repita informacoes ja mencionadas na conversa
- Evite verbosidade - va direto ao ponto
```

2. **Remover duplicacao de instrucoes** - Consolidar regras espalhadas

3. **Priorizar resposta a pergunta** - Antes de acao proativa, responder o que foi perguntado

### Fase 2: Corrigir Problema de Timing (Prioridade Alta)

O erro de FK acontece porque:
1. `create_wallet` retorna sucesso
2. `create_transaction` tenta usar o wallet_id imediatamente
3. Mas o modelo chama as duas funcoes no mesmo ciclo

Solucao: Modificar `create_transaction` para buscar o wallet pelo `nome` apos criar, com retry:

```typescript
// Em create_transaction, se wallet_id nao funcionar:
if (error?.code === '23503') { // FK violation
  // Tentar buscar carteira recem criada
  const { data: freshWallet } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  if (freshWallet) {
    walletId = freshWallet.id;
    // Retry insert
  }
}
```

### Fase 3: Adicionar Instrucoes de Contexto de Conversa

Adicionar ao system prompt:

```
REGRAS DE CONVERSA:
- Se o usuario faz uma pergunta, RESPONDA diretamente
- Perguntas como "voce tem acesso a X?" devem ser respondidas com "Sim, tenho acesso a..." ou "Nao, ainda nao..."
- NAO ignore perguntas para focar em tarefas pendentes
- Mantenha o contexto - nao repita informacoes ja discutidas
```

### Fase 4: Limitar Historico de Contexto

O historico carrega 20 mensagens, mas isso pode incluir muitas mensagens de tool que poluem o contexto.

Ajustar para filtrar melhor:

```typescript
// Atualmente carrega todas
.limit(20);

// Melhorar para carregar apenas mensagens relevantes
.in("role", ["user", "assistant"])
.limit(15);
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/ff-jarvis-chat/index.ts` | 1. Ajustar `buildSystemPrompt` para concisao<br>2. Adicionar retry em `create_transaction`<br>3. Filtrar historico melhor<br>4. Adicionar instrucoes de conversa natural |

---

## Mudancas Especificas no System Prompt

### Antes (verboso):
```
PERSONALIDADE:
- Tom britanico refinado, com elegancia e precisao
- Proativo: mencione informacoes relevantes do contexto ao cumprimentar
- Levemente sarcastico, mas sempre respeitoso e prestativo
- Voce conhece profundamente seu usuario atraves das memorias e contexto
- NUNCA invente informacoes - sempre consulte dados reais usando as ferramentas
```

### Depois (conciso e direto):
```
PERSONALIDADE:
- Elegante, inteligente, levemente sarcastico
- SEMPRE responda a pergunta do usuario PRIMEIRO
- Respostas CURTAS (2-3 paragrafos max)
- NAO repita informacoes ja ditas na conversa

PROIBIDO:
- Ignorar perguntas do usuario
- Respostas com mais de 4 paragrafos
- Repetir o mesmo status/informacao multiplas vezes
```

---

## Resultado Esperado

1. Respostas mais curtas e objetivas
2. O JARVIS responde perguntas diretas ("voce tem acesso?")
3. Transacoes funcionam mesmo quando carteira e criada na mesma sessao
4. Menos repeticao de informacoes sobre "contratempo tecnico"
5. Experiencia de chat mais fluida e natural

---

## Secao Tecnica

### Logica de Retry para create_transaction

```typescript
case "create_transaction": {
  let walletId = args.wallet_id as string;
  
  if (!walletId) {
    // Buscar carteira mais recente
    const { data: wallets } = await supabase
      .from("wallets")
      .select("id, nome")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!wallets?.length) {
      return "Erro: O usuario nao possui carteira. Crie uma primeiro.";
    }
    walletId = wallets[0].id;
  }

  // Primeira tentativa
  const { data, error } = await supabase
    .from("transactions")
    .insert({...})
    .select()
    .single();

  // Se FK violation, aguardar e tentar novamente
  if (error?.code === '23503') {
    await new Promise(r => setTimeout(r, 500)); // pequeno delay
    
    // Buscar wallet fresh
    const { data: freshWallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (freshWallet) {
      const { data: retryData, error: retryError } = await supabase
        .from("transactions")
        .insert({
          ...transactionData,
          wallet_id: freshWallet.id,
        })
        .select()
        .single();
      
      if (retryError) return `Erro: ${retryError.message}`;
      return `Transacao registrada com sucesso!`;
    }
  }

  if (error) return `Erro: ${error.message}`;
  return `Transacao registrada!`;
}
```

### Nova Estrutura do System Prompt (resumida)

```typescript
function buildSystemPrompt(userProfile: any, userContext: any): string {
  return `Voce e JARVIS, assistente pessoal do ${nickname}.

REGRAS OBRIGATORIAS:
1. Responda a PERGUNTA do usuario primeiro
2. Respostas CURTAS (max 3 paragrafos)
3. NAO repita informacoes da conversa
4. Va direto ao ponto

${contextSections} // dados financeiros, tarefas, etc

FERRAMENTAS: [lista resumida das capacidades]

Hoje: ${today}`;
}
```

O prompt sera reduzido de ~200 linhas para ~80 linhas, mantendo funcionalidade mas melhorando clareza.
