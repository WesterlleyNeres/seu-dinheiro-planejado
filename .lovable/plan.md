
# Plano: JARVIS - Assistente Pessoal Inteligente

## Visao Geral

Transformar o JARVIS em um assistente pessoal completo com inteligencia artificial, capaz de:
1. Receber mensagens via **WhatsApp**, **Web App** e futuramente **apps nativos**
2. Processar linguagem natural para executar acoes no sistema
3. Consultar dados de todos os modulos (Tarefas, Habitos, Financas, etc.)
4. Salvar todas as interacoes na **Memoria**
5. Importar historico de conversas do ChatGPT

---

## Arquitetura Proposta

```text
+------------------+     +------------------+     +------------------+
|    WhatsApp      |     |     Web App      |     |   App Nativo     |
|   (Evolution)    |     |   (React Chat)   |     |   (React Native) |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+--------+---------+     +--------+---------+     +--------+---------+
| ff-whatsapp-     |     | ff-jarvis-chat   |     | ff-jarvis-chat   |
| ingest           |     | (nova function)  |     | (mesma function) |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         +------------------------+------------------------+
                                  |
                                  v
                    +-------------+-------------+
                    |    Lovable AI Gateway     |
                    |  (google/gemini-3-flash)  |
                    +-------------+-------------+
                                  |
                                  v
                    +-------------+-------------+
                    |   Tool Calling + Actions  |
                    | - query_tasks             |
                    | - query_finances          |
                    | - create_task             |
                    | - create_memory           |
                    | - query_habits            |
                    +-------------+-------------+
                                  |
                                  v
                    +-------------+-------------+
                    |      PostgreSQL           |
                    |   (todas as tabelas)      |
                    +---------------------------+
```

---

## Etapas de Implementacao

### Fase 1: Chat Web com IA (Prioridade Alta)

| Item | Descricao |
|------|-----------|
| Nova pagina `/jarvis/chat` | Interface de chat moderna estilo iMessage/WhatsApp |
| Sidebar atualizada | Adicionar icone de chat na navegacao do JARVIS |
| Edge Function `ff-jarvis-chat` | Backend com Lovable AI + Tool Calling |
| Historico persistido | Mensagens salvas em nova tabela `ff_conversations` |
| Resposta em streaming | Tokens renderizados em tempo real |

**Interface do Chat:**
- Input na parte inferior
- Mensagens com bolhas (usuario vs assistente)
- Suporte a Markdown nas respostas
- Indicador de "digitando..."
- Botoes de acao rapida sugeridos

---

### Fase 2: Consultas Inteligentes (Tool Calling)

O assistente tera acesso a **ferramentas** para consultar e executar acoes:

| Ferramenta | Descricao | Exemplo de Prompt |
|------------|-----------|-------------------|
| `query_tasks` | Lista tarefas com filtros | "Quais tarefas tenho para hoje?" |
| `query_habits` | Progresso de habitos | "Como esta minha evolucao de habitos essa semana?" |
| `query_finances` | Contas, saldos, transacoes | "Quais contas vencem hoje?" / "Qual meu saldo?" |
| `query_events` | Eventos do calendario | "O que tenho agendado para amanha?" |
| `create_task` | Criar nova tarefa | "Crie uma tarefa: Ligar para contador" |
| `create_reminder` | Criar lembrete | "Me lembre de pagar a conta de luz amanha" |
| `create_memory` | Salvar informacao | "Lembre que prefiro reunioes pela manha" |
| `create_transaction` | Registrar despesa/receita | "Gastei 50 reais no almoco" |

**Exemplo de fluxo:**

```text
Usuario: "Quais contas vencem hoje?"

JARVIS:
1. Chama tool `query_finances` com filtro data_vencimento = hoje
2. Recebe lista de transacoes pendentes
3. Formata resposta amigavel:
   "Voce tem 2 contas vencendo hoje:
    - Spotify: R$ 21,90
    - Netflix: R$ 55,90
    Total: R$ 77,80"
```

---

### Fase 3: Importacao de Historico ChatGPT

| Item | Descricao |
|------|-----------|
| Upload de arquivo JSON | O ChatGPT exporta conversas em formato JSON |
| Parser no frontend | Extrair mensagens relevantes |
| Mapeamento para `ff_memory_items` | Salvar como memorias com `source: 'chatgpt'` |
| Filtros de importacao | Escolher quais conversas importar |
| Deduplicacao | Evitar duplicatas por fingerprint |

**Formato do export ChatGPT:**
```json
{
  "conversations": [
    {
      "title": "Planejamento semanal",
      "messages": [
        { "role": "user", "content": "..." },
        { "role": "assistant", "content": "..." }
      ]
    }
  ]
}
```

---

### Fase 4: Unificacao WhatsApp + Web

| Item | Descricao |
|------|-----------|
| Refatorar `ff-whatsapp-ingest` | Reutilizar logica do `ff-jarvis-chat` |
| Mesmo modelo de IA | WhatsApp usa a mesma inteligencia |
| Todas as mensagens na Memoria | Historico unificado visivel em `/jarvis/memory` |
| Contexto compartilhado | Chat web ve o que foi falado no WhatsApp |

---

## Estrutura de Dados

### Nova tabela: `ff_conversations`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants |
| `user_id` | uuid | FK auth.users |
| `channel` | text | 'web' / 'whatsapp' / 'app' |
| `created_at` | timestamptz | Data de inicio |

### Nova tabela: `ff_conversation_messages`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid | PK |
| `conversation_id` | uuid | FK ff_conversations |
| `role` | text | 'user' / 'assistant' / 'system' |
| `content` | text | Conteudo da mensagem |
| `tool_calls` | jsonb | Chamadas de ferramentas |
| `created_at` | timestamptz | Timestamp |

---

## Detalhes Tecnicos

### Edge Function `ff-jarvis-chat`

```text
1. Recebe mensagem do usuario
2. Carrega contexto (ultimas N mensagens da conversa)
3. Carrega memorias relevantes (busca semantica futura)
4. Chama Lovable AI com:
   - System prompt com personalidade JARVIS
   - Historico de mensagens
   - Definicao de tools disponiveis
5. Se IA retornar tool_call:
   - Executa query/insert no banco
   - Retorna resultado para IA continuar
6. Retorna resposta final via SSE (streaming)
7. Persiste mensagens na tabela
```

### System Prompt JARVIS

```text
Voce e JARVIS, o assistente pessoal do Westerlle. 
Sua missao e ajuda-lo a organizar sua vida pessoal e financeira.

Voce tem acesso a:
- Tarefas e compromissos
- Habitos e progresso
- Financas (contas, despesas, receitas, orcamentos)
- Memorias e preferencias salvas

Sempre seja:
- Conciso e objetivo
- Proativo em sugerir acoes
- Atento ao contexto anterior

Nunca invente informacoes - use as ferramentas para consultar dados reais.
```

---

## Proximos Passos Recomendados

1. **Criar tabelas** `ff_conversations` e `ff_conversation_messages`
2. **Criar Edge Function** `ff-jarvis-chat` com Lovable AI + tools
3. **Criar pagina** `/jarvis/chat` com interface de chat
4. **Atualizar sidebar** do JARVIS com link para chat
5. **Testar fluxo** completo de perguntas/acoes
6. **Adicionar importador** de historico ChatGPT

---

## Estimativa de Esforco

| Fase | Complexidade | Estimativa |
|------|--------------|------------|
| Fase 1: Chat Web | Media-Alta | 2-3 iteracoes |
| Fase 2: Tool Calling | Alta | 2-3 iteracoes |
| Fase 3: Import ChatGPT | Media | 1-2 iteracoes |
| Fase 4: Unificacao WhatsApp | Media | 1-2 iteracoes |

---

## Resultado Final

Apos implementacao, voce podera:

- Enviar "Quais tarefas tenho hoje?" no WhatsApp ou no chat web e receber a lista
- Dizer "Gastei 45 reais no Uber" e ter a despesa registrada automaticamente
- Perguntar "Como estao meus habitos essa semana?" e ver estatisticas
- Importar anos de conversas do ChatGPT como base de conhecimento
- Ter um assistente que conhece suas preferencias e historico
