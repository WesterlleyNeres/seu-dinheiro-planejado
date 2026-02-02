
# Plano: JARVIS - O Cerebro Central do Sistema

## Visao Transformadora

O JARVIS deixa de ser apenas um chatbot e se torna o **cerebro central** de todo o sistema - um mordomo digital sofisticado que:

1. **Conhece profundamente cada usuario** - Perfil, preferencias, historico, padroes de comportamento
2. **Faz o onboarding completo** - Guia novos usuarios por todas as funcionalidades do sistema
3. **Aprende continuamente** - Atualiza sua base de conhecimento a cada interacao
4. **Age de forma humanizada** - Tom refinado, proativo, contextual
5. **Tem acesso total ao sistema** - Pode consultar E executar acoes em todos os modulos

---

## Lacunas Identificadas (Fase 2.1)

Com base na analise do screenshot e do codigo, identifiquei que o JARVIS:

| Capacidade | Status | Problema |
|------------|--------|----------|
| Consultar tarefas | ✅ Funciona | - |
| Consultar financas | ✅ Funciona | - |
| Criar tarefa | ✅ Funciona | - |
| **Criar carteira** | ❌ Falta | Nao consegue criar wallets |
| **Criar transacao** | ❌ Falta | Nao consegue registrar despesas/receitas |
| **Criar evento** | ❌ Falta | Nao consegue criar compromissos |
| **Listar carteiras** | ❌ Falta | Precisa saber quais carteiras existem |
| **Listar categorias** | ❌ Falta | Precisa mapear "almoco" para uma categoria |
| **Perfil do usuario** | ❌ Falta | Nao conhece o usuario profundamente |
| **Onboarding** | ❌ Falta | Nao guia novos usuarios |

---

## Arquitetura do "Cerebro Central"

```text
                    +---------------------------+
                    |         JARVIS            |
                    |    (Cerebro Central)      |
                    +-------------+-------------+
                                  |
         +------------------------+------------------------+
         |                        |                        |
         v                        v                        v
+--------+--------+     +---------+---------+     +--------+--------+
|    WhatsApp     |     |     Web Chat      |     |   App Nativo    |
|   (Evolution)   |     |   /jarvis/chat    |     |   (Futuro)      |
+-----------------+     +-------------------+     +-----------------+

                    +---------------------------+
                    |   Camada de Inteligencia  |
                    +---------------------------+
                    | - Lovable AI Gateway      |
                    | - Tool Calling            |
                    | - Contexto do Usuario     |
                    | - Memoria de Longo Prazo  |
                    +-------------+-------------+
                                  |
    +-----------------------------+-----------------------------+
    |              |              |              |              |
    v              v              v              v              v
+-------+     +--------+     +---------+     +-------+     +--------+
|Tarefas|     |Eventos |     | Habitos |     |Financ.|     |Memoria |
+-------+     +--------+     +---------+     +-------+     +--------+
```

---

## Etapas de Implementacao

### ETAPA 1: Tabela de Perfil do Usuario (Nova)

Criar tabela `ff_user_profiles` para armazenar informacoes do usuario que o JARVIS conhece:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK auth.users |
| `tenant_id` | uuid | FK tenants |
| `full_name` | text | Nome completo |
| `nickname` | text | Como gosta de ser chamado |
| `birth_date` | date | Data de nascimento |
| `timezone` | text | Fuso horario (default: America/Sao_Paulo) |
| `locale` | text | Idioma preferido |
| `onboarding_completed` | boolean | Ja fez onboarding? |
| `onboarding_step` | text | Etapa atual do onboarding |
| `preferences` | jsonb | Preferencias gerais (tom de comunicacao, etc) |
| `last_interaction_at` | timestamptz | Ultima interacao |
| `interaction_count` | integer | Total de interacoes |
| `created_at` | timestamptz | - |
| `updated_at` | timestamptz | - |

---

### ETAPA 2: Tools de Acao no Modulo Financas

Adicionar novas ferramentas na Edge Function `ff-jarvis-chat`:

| Tool | Parametros | Descricao |
|------|------------|-----------|
| `list_wallets` | - | Lista todas as carteiras do usuario |
| `list_categories` | `tipo` (despesa/receita) | Lista categorias disponiveis |
| `create_wallet` | `nome`, `tipo`, `instituicao`, `saldo_inicial` | Cria nova carteira |
| `create_transaction` | `tipo`, `descricao`, `valor`, `wallet_id`, `category_name` | Registra despesa/receita |
| `create_event` | `title`, `start_at`, `end_at`, `location` | Cria evento no calendario |
| `update_task_status` | `task_id`, `status` | Marca tarefa como concluida |

**Logica Inteligente para Transacoes:**

1. Quando usuario pede para registrar despesa:
   - JARVIS chama `list_wallets` para verificar se existe carteira
   - Se nao existir, pergunta: "Voce ainda nao tem carteira cadastrada. Quer que eu crie uma?"
   - Chama `list_categories` para encontrar categoria adequada
   - Se nao encontrar, sugere categoria mais proxima ou pergunta
   - Registra a transacao com `create_transaction`

---

### ETAPA 3: Sistema de Onboarding Interativo

Fluxo quando novo usuario acessa o JARVIS pela primeira vez:

```text
JARVIS: "Ola! Eu sou o JARVIS, seu assistente pessoal. 
        Estou aqui para ajudar a organizar sua vida pessoal e financeira.
        
        Antes de comecarmos, gostaria de te conhecer melhor.
        Como voce gostaria que eu te chamasse?"

Usuario: "Pode me chamar de Wester"

JARVIS: "Perfeito, Wester! Prazer em conhece-lo. 
        
        Vou te guiar pelas principais funcionalidades do sistema:
        
        1. **Financas** - Controle de despesas, receitas e orcamentos
        2. **Tarefas** - Organizacao de afazeres com prioridades
        3. **Habitos** - Acompanhamento de rotinas diarias
        4. **Eventos** - Calendario de compromissos
        5. **Memoria** - Informacoes que salvo sobre voce
        
        Por onde gostaria de comecar? Ou se preferir, 
        me conte um pouco sobre seu objetivo principal aqui."
```

**Etapas do Onboarding:**

| Etapa | Nome | Pergunta do JARVIS |
|-------|------|-------------------|
| 1 | `profile` | Como voce gostaria que eu te chamasse? |
| 2 | `goals` | Qual seu principal objetivo ao usar o sistema? |
| 3 | `wallet_setup` | Vamos configurar sua primeira carteira? |
| 4 | `category_review` | Que tal revisar as categorias de despesas? |
| 5 | `first_habit` | Quer criar seu primeiro habito para acompanhar? |
| 6 | `complete` | Pronto! Estou a disposicao. |

---

### ETAPA 4: System Prompt Aprimorado

Atualizar o prompt do JARVIS para refletir sua nova identidade:

```text
Voce e JARVIS (Just A Rather Very Intelligent System), o assistente pessoal 
inteligente do seu criador. Voce e inspirado no mordomo digital do Tony Stark.

SOBRE VOCE:
- Voce tem personalidade refinada, inteligente e ligeiramente sarcastica
- Voce e proativo e sugere acoes antes que o usuario precise pedir
- Voce conhece profundamente seu usuario atraves das memorias salvas
- Voce NUNCA inventa informacoes - sempre consulta os dados reais

SOBRE O USUARIO:
[Contexto dinamico injetado: nome, preferencias, ultima interacao, etc.]

CAPACIDADES:
- Gerenciar vida financeira (carteiras, transacoes, orcamentos)
- Organizar tarefas e prioridades
- Acompanhar habitos e rotinas
- Gerenciar calendario e compromissos
- Lembrar informacoes importantes
- Enviar lembretes por WhatsApp, email ou push

REGRAS:
1. Sempre enderece o usuario pelo nome/apelido
2. Antes de criar transacoes, verifique se existe carteira
3. Ao salvar informacoes pessoais, use a ferramenta create_memory com kind='profile'
4. Se for a primeira interacao, inicie o onboarding
5. Formate valores em R$ e datas no formato brasileiro

ONBOARDING:
Se o usuario ainda nao completou o onboarding:
- Guie-o passo a passo pelas funcionalidades
- Pergunte sobre preferencias e objetivos
- Configure carteira e categorias iniciais
- Mantenha tom acolhedor e nao sobrecarregue

Hoje e: [data atual]
```

---

### ETAPA 5: Injecao de Contexto do Usuario

Antes de cada chamada ao AI, buscar e injetar:

1. **Perfil do usuario** (nome, preferencias)
2. **Memorias relevantes** (ultimas 5 memorias do tipo 'profile' e 'preference')
3. **Estado do onboarding**
4. **Resumo financeiro rapido** (saldo, contas a vencer)
5. **Tarefas pendentes para hoje**

Isso permite respostas como:
- "Bom dia, Wester! Vi que voce tem 3 tarefas para hoje e 2 contas a vencer."
- "Lembro que voce prefere reunioes pela manha. Quer que eu agende para as 9h?"

---

### ETAPA 6: Importador de Historico ChatGPT (Fase 3)

| Item | Implementacao |
|------|---------------|
| Upload JSON | Componente de upload na pagina `/jarvis/memory` |
| Parser | Extrair `conversations[].messages[]` |
| Filtros | Checkbox para selecionar conversas |
| Mapeamento | Cada mensagem vira `ff_memory_item` com `source: 'chatgpt'` |
| Deduplicacao | Hash do conteudo para evitar duplicatas |

---

### ETAPA 7: Unificacao WhatsApp + Web (Fase 4)

Refatorar `ff-whatsapp-ingest` para:

1. Reutilizar o motor de IA do `ff-jarvis-chat`
2. Compartilhar o mesmo historico de conversas
3. Ter acesso as mesmas ferramentas
4. Salvar mensagens no mesmo formato

---

## Detalhes Tecnicos

### Novas Tools para Edge Function

```text
list_wallets
  - Retorna: [{id, nome, tipo, saldo_calculado}]

list_categories  
  - Parametros: tipo ('despesa' | 'receita')
  - Retorna: [{id, nome}]

create_wallet
  - Parametros: nome, tipo, instituicao?, saldo_inicial?
  - Logica: Insere em 'wallets', retorna confirmacao

create_transaction
  - Parametros: tipo, descricao, valor, wallet_id?, category_name, data?
  - Logica:
    1. Se wallet_id nao fornecido, usa primeira carteira
    2. Busca category_id pelo nome (ilike match)
    3. Se categoria nao encontrada, cria ou pergunta
    4. Insere transacao
    5. Retorna confirmacao com saldo atualizado

create_event
  - Parametros: title, start_at, end_at?, location?, all_day?
  - Logica: Insere em 'ff_events'

get_user_profile
  - Retorna perfil e preferencias do usuario
  - Usado para injetar contexto no system prompt

update_user_profile
  - Parametros: nickname, preferences, onboarding_step, etc.
  - Atualiza perfil progressivamente
```

---

## Resultado Esperado

Apos implementacao completa:

**Cenario 1 - Novo Usuario:**
```text
Usuario: "Ola"
JARVIS: "Ola! Sou o JARVIS, seu assistente pessoal. 
        Como gostaria que eu te chamasse?"
Usuario: "Wester"  
JARVIS: "Prazer, Wester! Vamos configurar o sistema juntos..."
```

**Cenario 2 - Registrar Despesa:**
```text
Usuario: "Gastei 39,36 no almoco"
JARVIS: [verifica carteiras, encontra "Principal"]
        [busca categorias, mapeia "almoco" para "Alimentacao"]
        "Despesa de R$ 39,36 registrada na carteira Principal, 
        categoria Alimentacao. Seu saldo atual e R$ 1.250,00."
```

**Cenario 3 - Consulta Proativa:**
```text
Usuario: "Bom dia"
JARVIS: "Bom dia, Wester! 
        Voce tem 2 contas vencendo hoje (Spotify R$ 21,90 e Netflix R$ 55,90)
        e 3 tarefas pendentes. Quer que eu liste?"
```

---

## Cronograma de Implementacao

| Fase | Prioridade | Estimativa |
|------|------------|------------|
| Fase 2.1: Tools de Financas | Alta | Esta iteracao |
| Etapa 1: Tabela `ff_user_profiles` | Alta | Esta iteracao |
| Etapa 2: Novas tools na Edge Function | Alta | Esta iteracao |
| Etapa 3: System Prompt aprimorado | Alta | Esta iteracao |
| Etapa 4: Injecao de contexto | Media | Proxima iteracao |
| Etapa 5: Onboarding interativo | Media | Proxima iteracao |
| Fase 3: Importador ChatGPT | Media | Futura |
| Fase 4: Unificacao WhatsApp | Media | Futura |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/migrations/...` | Criar tabela `ff_user_profiles` |
| `supabase/functions/ff-jarvis-chat/index.ts` | Adicionar novas tools + prompt aprimorado |
| `src/types/jarvis.ts` | Adicionar tipo `JarvisUserProfile` |
| `src/hooks/useJarvisChat.ts` | (opcional) Passar contexto do usuario |
| `.lovable/plan.md` | Atualizar status das fases |

---

## Proximo Passo Recomendado

Implementar **Fase 2.1** agora, que inclui:

1. Criar tabela `ff_user_profiles`
2. Adicionar tools: `list_wallets`, `list_categories`, `create_wallet`, `create_transaction`, `create_event`
3. Aprimorar System Prompt com personalidade JARVIS
4. Injetar contexto basico do usuario

Isso resolve o problema do screenshot (JARVIS criando tarefa ao inves de transacao) e estabelece a base para o onboarding.
