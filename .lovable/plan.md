
Objetivo: deixar o chat do JARVIS “100%” estável e consistente, eliminando respostas fora de contexto e a mensagem genérica “Desculpe, não consegui processar…”, com o mínimo de mudanças necessárias (para reduzir retrabalho/custo).

Diagnóstico (com base no código atual + screenshots)
1) Causa raiz principal (alta confiança): histórico errado enviado para a IA
- No backend function `supabase/functions/ff-jarvis-chat/index.ts`, a busca do histórico faz:
  - `.order("created_at", { ascending: true }).limit(15)`
- Isso pega as PRIMEIRAS 15 mensagens da conversa (as mais antigas), não as últimas.
- Quando a conversa já tem mais de 15 mensagens, a IA NÃO vê a mensagem atual do usuário (nem as últimas interações), então responde coisas “de trás” (ex.: responde sobre despesa/duplicidade quando você perguntou sobre histórico).
- Isso explica exatamente o comportamento do print: respostas desconectadas + o usuário repetindo a pergunta e o JARVIS “ignorando”.

2) Causa raiz secundária: mensagens “técnicas” de tool-call podem poluir a UX
- O backend salva mensagens de `assistant` que contêm `tool_calls` com `content` vazio.
- No frontend (`useJarvisChat`) vocês exibem todas as mensagens com `role === user|assistant` sem filtrar `tool_calls` / `content`.
- Isso pode gerar bolhas “vazias” ou interações confusas e aumentar a sensação de erro.

3) Fragilidade que pode causar falha real (intermitente) e custo: parsing e validação de argumentos das tools
- No loop de tools, faz `JSON.parse(toolCall.function.arguments || "{}")` sem try/catch.
- Se a IA mandar JSON malformado em algum momento, isso vira erro 500 e quebra o chat.
- Em `create_transaction`, `category_id` pode vir como nome (ex.: “Alimentação”) em vez de UUID → pode disparar erro e a IA tentar de novo, gerando duplicações/loops.

Plano de correção (prioridade: estabilizar chat agora)
Fase 0 — Validar rapidamente a hipótese (sem mexer em UX ainda)
- Ação: adicionar logs “cirúrgicos” no backend (edge function) para confirmar que o histórico enviado ao modelo NÃO contém a última mensagem do usuário quando a conversa é longa:
  - Logar: `convId`, contagem total de mensagens (query rápida), e o `created_at` + conteúdo das 3 últimas mensagens retornadas por `history`.
- Critério de sucesso: os logs mostrarem que o `history` não inclui a mensagem recém-inserida quando a conversa tem > 15 mensagens.

Fase 1 — Fix definitivo do histórico (mudança pequena, impacto enorme)
- Alterar a query do histórico no backend para buscar as ÚLTIMAS 15 mensagens e depois reordenar para cronologia:
  1) Buscar desc:
     - `.order("created_at", { ascending: false }).limit(15)`
  2) Reverter o array antes de montar `messages` (para ficar do mais antigo → mais novo).
- Garantia adicional:
  - Validar programaticamente que a última mensagem de `history` é a mensagem do usuário recém-inserida; se não for, forçar inclusão (fallback) para não perder o turno atual.

Por que isso resolve:
- A IA passa a ver exatamente o contexto recente e a pergunta atual → respostas deixam de “voltar no tempo” e o chat para de parecer quebrado.

Fase 2 — Evitar “bolhas técnicas” e ruído no chat (frontend)
- Ajustar `src/hooks/useJarvisChat.ts` para filtrar mensagens exibidas:
  - Exibir apenas:
    - `role === "user"`
    - `role === "assistant"` AND `content.trim().length > 0`
  - (Opcional) também excluir `assistant` que tenha `tool_calls` preenchido (se esse campo estiver vindo no select).
- Resultado:
  - O usuário só vê mensagens “humanas”, não mensagens intermediárias de tool-calling.

Fase 3 — Robustez “anti-quebra” (backend)
Essas mudanças evitam erro real e reduzem ciclos de tentativa (custo e confusão):
1) Safe JSON parse
- Envolver `JSON.parse(...)` em try/catch.
- Se falhar:
  - Salvar um registro do erro no log
  - Retornar um texto curto para o modelo: “Argumentos inválidos; gere novamente em JSON válido.”
  - Ou (mais confiável) fazer um “repair pass” com o modelo leve (AGENT_MODEL) pedindo para reemitir os argumentos em JSON válido.

2) Melhorar `create_transaction` para aceitar `category_id` por nome
- Se `category_id` não for UUID:
  - Tentar resolver por `categories.nome ilike %...%` filtrando pelo tipo (despesa/receita).
  - Se 1 match → usar o UUID encontrado.
  - Se 0 ou muitos matches → pedir ao usuário para escolher (ou chamar `list_categories` e pedir confirmação).

3) Idempotência simples para evitar duplicações
- Antes de inserir transação, checar se já existe transação muito parecida:
  - Mesmo `user_id`, `wallet_id`, `tipo`, `valor`, data (e/ou descrição similar) nas últimas 24h/mesma data.
- Se existir: retornar “Já existe um lançamento igual; não criei outro.” e orientar como editar/corrigir.
- Isso evita loops do modelo criando a mesma despesa várias vezes.

Fase 4 — Melhorar o erro mostrado ao usuário (sem ficar verboso)
- Hoje, quando `assistantMessage?.content` vem vazio, o backend devolve: “Desculpe, não consegui processar…”
- Trocar por:
  - “Tive um problema para gerar a resposta agora. Quer tentar novamente?” + um `error_id` interno nos logs para rastreio.
- E garantir que qualquer erro 500 do backend retorne JSON consistente (para o client mostrar toast com mensagem clara).

Plano de teste (para confirmar 100% e evitar nova rodada de ajustes)
1) Teste de conversa longa (o bug atual)
- Em uma conversa com mais de 15 mensagens:
  - Perguntar “Você tem acesso ao histórico?” e “Quais compromissos eu tenho essa semana?”
- Esperado: respostas coerentes com o turno atual (sem falar de uma despesa antiga do nada).

2) Teste de tool-calling com finanças
- “Registra uma despesa de 39,36 de almoço na conta BTG”
- Esperado:
  - Se categoria vier por nome, resolve corretamente
  - Se já existir lançamento igual, não duplica

3) Teste de robustez
- Fazer 5 envios seguidos (com pausa) e confirmar que não aparece “Desculpe, não consegui…” sem explicação
- Confirmar que não há bolhas vazias no chat

Escopo de mudanças (bem objetivo, para reduzir custo de iteração)
- Backend:
  - `supabase/functions/ff-jarvis-chat/index.ts`
    - Corrigir ordenação/limite do histórico (principal)
    - Safe parse + melhorias `create_transaction` (categoria por nome + dedupe)
    - Melhorar mensagens de erro e logs
- Frontend:
  - `src/hooks/useJarvisChat.ts`
    - Filtrar tool-call/assistente vazio no display

Riscos e mitigação
- Risco: conversas curtas (<15 msgs) já “funcionam” e podem mascarar o bug.
  - Mitigação: teste obrigatório em conversa longa.
- Risco: alteração de histórico mudar um pouco o “tom” do modelo (porque ele verá o contexto correto).
  - Mitigação: manter o prompt e tools como estão; apenas corrigir a janela de mensagens.

Resultado esperado após aplicar
- O JARVIS sempre responde à mensagem atual (sem “voltar no tempo”)
- Queda drástica de respostas irrelevantes/“erro genérico”
- Menos duplicações e menos loops de tool-calling
- UX do chat limpa (sem mensagens técnicas/vazias)
