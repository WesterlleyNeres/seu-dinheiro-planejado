
# Plano: Criar Documentação Técnica Completa do Sistema FRACTTO FLOW

## Objetivo
Criar um arquivo `DOCUMENTATION.md` contendo documentação técnica completa do sistema, incluindo arquitetura frontend/backend, banco de dados, integrações, e todos os detalhes técnicos para desenvolvedores e stakeholders.

---

## Estrutura da Documentação

### 1. Visão Geral do Sistema
- Nome: FRACTTO FLOW - "Suas Finanças, Peça por Peça"
- Versão: 1.0.0 (Produção)
- Propósito: Plataforma completa de gestão financeira pessoal
- URL Produção: https://fracttoflow.lovable.app

### 2. Stack Tecnológico

#### Frontend
- **Framework**: React 18.3.1 + TypeScript
- **Build Tool**: Vite
- **Estilização**: Tailwind CSS + shadcn/ui
- **Gerenciamento de Estado**: TanStack Query (React Query)
- **Roteamento**: React Router DOM 6.30.1
- **Validação**: Zod + React Hook Form
- **Gráficos**: Recharts 2.15.4
- **PDF**: jsPDF + jspdf-autotable
- **Datas**: date-fns 4.1.0

#### Backend (Lovable Cloud / Supabase)
- **Banco de Dados**: PostgreSQL 15+
- **Autenticação**: Supabase Auth
- **Edge Functions**: Deno Runtime
- **Automação**: pg_cron para jobs agendados

### 3. Estrutura de Diretórios

```text
src/
├── App.tsx                      # Roteamento principal
├── main.tsx                     # Entry point
├── index.css                    # Estilos globais
├── components/
│   ├── ui/                      # shadcn/ui components (50+)
│   ├── budget/                  # Componentes de orçamento
│   ├── calendar/                # Calendário financeiro
│   ├── dashboard/               # Cards do dashboard
│   ├── faq/                     # Sistema de FAQ
│   ├── forms/                   # Inputs customizados
│   ├── goals/                   # Metas financeiras
│   ├── import/                  # Importação CSV
│   ├── investments/             # Investimentos
│   ├── landing/                 # Landing page
│   ├── layout/                  # AppLayout, Sidebar
│   ├── periods/                 # Controle de períodos
│   ├── recurring/               # Transações recorrentes
│   ├── reports/                 # Gráficos e relatórios
│   ├── settings/                # Configurações
│   ├── statements/              # Faturas de cartão
│   ├── transactions/            # Lançamentos
│   ├── transfers/               # Transferências
│   └── wallets/                 # Carteiras/Limites
├── contexts/
│   └── AuthContext.tsx          # Autenticação global
├── hooks/                       # 20+ custom hooks
│   ├── useTransactions.ts
│   ├── useBudgets.ts
│   ├── useWallets.ts
│   ├── useGoals.ts
│   ├── useInvestments.ts
│   ├── useRecurringTransactions.ts
│   ├── useStatements.ts
│   ├── usePeriods.ts
│   ├── useReports.ts
│   ├── useImporter.ts
│   └── ...
├── lib/
│   ├── currency.ts              # Formatação BRL
│   ├── date.ts                  # Utilitários de data
│   ├── validations.ts           # Schemas Zod
│   ├── csvParser.ts             # Parser CSV
│   ├── categoryMatcher.ts       # Fuzzy matching
│   ├── deduplication.ts         # Fingerprint MD5
│   ├── pdfGenerator.ts          # Exportação PDF
│   └── ...
├── pages/                       # 14 páginas
│   ├── Landing.tsx
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── Transactions.tsx
│   ├── Categories.tsx
│   ├── Wallets.tsx
│   ├── Transfers.tsx
│   ├── Calendar.tsx
│   ├── Budget.tsx
│   ├── Goals.tsx
│   ├── Investments.tsx
│   ├── Reports.tsx
│   ├── Import.tsx
│   ├── FAQ.tsx
│   ├── Settings.tsx
│   └── NotFound.tsx
└── integrations/
    └── supabase/
        ├── client.ts            # Cliente Supabase
        └── types.ts             # Tipos auto-gerados
```

### 4. Schema do Banco de Dados (27 migrations)

#### Tabelas Principais

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `profiles` | Perfis de usuário (full_name) | Sim |
| `transactions` | Lançamentos financeiros | Sim |
| `categories` | Categorias (despesa/receita/investimento/divida) | Sim |
| `wallets` | Carteiras (conta corrente/cartão de crédito) | Sim |
| `budgets` | Orçamentos mensais por categoria | Sim |
| `goals` | Metas financeiras | Sim |
| `goals_contribs` | Contribuições para metas | Sim |
| `investments` | Investimentos (RF/RV/Fundo/Outros) | Sim |
| `investment_contribs` | Aportes em investimentos | Sim |
| `transfers` | Transferências entre carteiras | Sim |
| `recurring_transactions` | Transações recorrentes | Sim |
| `recurring_transaction_history` | Histórico de geração | Sim |
| `card_statements` | Faturas de cartão de crédito | Sim |
| `card_statement_lines` | Linhas da fatura (transações) | Sim |
| `periods` | Controle de períodos (aberto/fechado) | Sim |
| `payment_methods` | Formas de pagamento | Sim |
| `user_settings` | Configurações do usuário | Sim |
| `alert_settings` | Configurações de alertas | Sim |
| `alert_log` | Log de alertas enviados | Sim |
| `import_history` | Histórico de importações | Sim |
| `import_presets` | Presets de mapeamento CSV | Sim |
| `leads` | Contatos da landing page | Sim (INSERT only) |

#### Views Materializadas

| View | Descrição |
|------|-----------|
| `v_wallet_balance` | Saldo real-time de carteiras |
| `v_monthly_summary` | Resumo mensal por tipo |
| `v_category_spending` | Gastos por categoria |
| `v_balance_evolution` | Evolução de saldo |

#### Funções PostgreSQL

| Função | Descrição |
|--------|-----------|
| `fechar_mensal(user_id, year, month)` | Fecha período financeiro |
| `reabrir_mensal(user_id, year, month)` | Reabre período |
| `aplicar_rollover(user_id, year, month)` | Transfere saldo de orçamento |
| `process_recurring_transactions()` | Processa recorrências pendentes |
| `close_card_statement(statement_id)` | Fecha fatura de cartão |
| `pay_card_statement(...)` | Paga fatura de cartão |
| `calculate_next_occurrence(...)` | Calcula próxima data recorrente |
| `realizado_categoria(...)` | Calcula gasto realizado |

#### Triggers

- `sync_mes_referencia` - Sincroniza mes_referencia_int automaticamente
- `generate_fingerprint` - Gera fingerprint MD5 para deduplicação

#### Índices de Performance

- `transactions(user_id, mes_referencia_int)` - Consultas de orçamento
- `budgets(user_id, ano, mes, category_id)` - Orçamentos únicos
- `wallets(user_id, tipo, ativo)` - Filtro de carteiras
- `transfers(user_id, data)` - Histórico de transferências
- `ux_transactions_fingerprint` - Deduplicação (partial unique)

### 5. Edge Functions

#### `send-alerts`
- **Trigger**: Diário às 07:30 BRT (10:30 UTC)
- **Função**: Envia resumo financeiro por email
- **Integração**: Resend API
- **Alertas**:
  - Contas a vencer (7-30 dias)
  - Orçamentos > 80%
  - Faturas vencendo em 7 dias
  - Metas com prazo próximo

#### `generate-social-image`
- **Função**: Gera imagem OG para compartilhamento social
- **JWT**: Não requer (público)

### 6. Fluxos de Negócio

#### Transações
1. Simples (receita/despesa única)
2. Parceladas (grupo_parcelamento, parcela_numero/total)
3. Recorrentes (geração automática via pg_cron)

#### Cartão de Crédito
1. Configurar cartão (dia_fechamento, dia_vencimento, limite_credito)
2. Transações vinculadas automaticamente à fatura
3. Fechar fatura (status: aberta → fechada)
4. Pagar fatura (gera transferência, status: fechada → paga)

#### Orçamentos
1. Criar limite mensal por categoria
2. Budget mode: pagas vs pagas_e_pendentes
3. Rollover policies: none/carry_over/clamp
4. Fechamento de período bloqueia edições

#### Importação CSV
1. Upload arquivo
2. Detecção automática de colunas
3. Presets por banco (Nubank, Inter, Itaú)
4. Fuzzy matching de categorias
5. Fingerprint MD5 para deduplicação
6. Preview e confirmação

### 7. Segurança

#### Row Level Security (RLS)
- Todas as tabelas com RLS ativado
- Política base: `user_id = auth.uid()`
- Views com RLS via tabelas subjacentes
- Soft delete: `deleted_at IS NULL`

#### Proteções Adicionais
- Fingerprint para evitar duplicatas
- Período fechado bloqueia modificações
- Leads: INSERT público, SELECT restrito a service_role
- Leaked Password Protection (via dashboard)

### 8. Padrões de Desenvolvimento

#### Timezone
- Fixo em `America/Sao_Paulo`
- Usar `parseISO()` do date-fns (não `new Date(string)`)

#### Moeda
```typescript
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
```

#### Validação
- Zod schemas em `src/lib/validations.ts`
- React Hook Form + @hookform/resolvers

#### Toast Notifications
- sonner para notificações
- Mensagens amigáveis para erros de período fechado

### 9. Arquivos de Configuração

| Arquivo | Descrição |
|---------|-----------|
| `vite.config.ts` | Configuração Vite |
| `tailwind.config.ts` | Configuração Tailwind |
| `tsconfig.json` | TypeScript config |
| `supabase/config.toml` | Configuração Edge Functions |
| `components.json` | shadcn/ui config |

### 10. Documentos de Apoio Existentes

- `README.md` - Visão geral e setup
- `OPERATIONS.md` - Procedimentos operacionais
- `JORNADA_CLIENTE.md` - Jornada do usuário
- `APRESENTACAO_COMERCIAL.md` - Apresentação comercial

---

## Implementação

### Arquivo a Criar
- `DOCUMENTATION.md` - Documentação técnica completa (~800-1000 linhas)

### Conteúdo Incluído
1. Cabeçalho com badges e versão
2. Sumário navegável
3. Diagramas ER em Mermaid
4. Tabelas de referência
5. Exemplos de código
6. Guia de contribuição
7. Troubleshooting comum

### Seções Técnicas Detalhadas
- Schema completo de cada tabela
- Relacionamentos FK
- Políticas RLS por tabela
- Funções PostgreSQL com assinaturas
- Hooks com retornos tipados
- Edge Functions com payloads
