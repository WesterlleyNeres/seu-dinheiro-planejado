# Jornada do Cliente – Sistema de Controle Financeiro v1.1

## **Versão do Sistema**: 1.1.0  
**Última Atualização**: Janeiro 2025

---

## **Visão Geral**

Este guia conduz novos usuários desde o cadastro inicial até o controle avançado de finanças pessoais. A sequência respeita as dependências do sistema e maximiza a experiência de uso, evitando erros comuns.

---

## **1. Acesso Inicial e Configuração Básica**

### **1.1 Cadastro / Login**
- **Ação**: Criar conta com e-mail, senha e nome completo
- **O que acontece automaticamente**:
  - Sistema cria perfil de usuário
  - Gera **categorias padrão** (Assinaturas, Mercado, Salário, etc.)
  - Configura **métodos de pagamento padrão** (Dinheiro, PIX, Débito, Crédito)

### **1.2 Revisão de Categorias e Métodos**
- **Localização**: Menu → Categorias
- **Recomendação**: Revisar e personalizar conforme sua realidade
  - Editar nomes de categorias existentes
  - Adicionar categorias específicas (ex: "Transporte Escolar", "Academia")
  - Configurar cores para identificação visual
- **Por que fazer isso primeiro?**: Evita confusão ao lançar transações posteriormente

---

## **2. Configuração de Carteiras** ⚠️ **Obrigatório antes de transações**

### **2.1 Criar Carteiras**
- **Localização**: Menu → Carteiras
- **Tipos disponíveis**:
  
  **Contas Bancárias** (`tipo: "conta"`):
  - Informar **saldo inicial**
  - Exemplo: Conta Corrente, Poupança, Carteira Digital
  
  **Cartões de Crédito** (`tipo: "cartão"`):
  - Informar **dia de fechamento** (ex: dia 10)
  - Informar **dia de vencimento** (ex: dia 17)
  - Limite (opcional)
  - **Não precisa informar saldo inicial**

### **2.2 Por que é obrigatório?**
- Toda transação precisa estar associada a uma carteira
- Sem carteiras cadastradas, não é possível lançar despesas ou receitas

---

## **3. Lançamentos e Operações Básicas**

### **3.1 Criar Transações Simples**
- **Localização**: Menu → Transações → Botão "+"
- **Campos obrigatórios**:
  - Descrição
  - Valor
  - Data
  - Categoria
  - Carteira
  - Método de pagamento
  - Status (Paga/Pendente)

### **3.2 Transações Parceladas**
- **Como usar**:
  1. Marcar checkbox "Parcelada"
  2. Informar **número de parcelas** (ex: 12x)
  3. Informar **valor total** (sistema calcula valor da parcela)
  4. Sistema gera **automaticamente** as parcelas nos meses subsequentes
- **Exemplo**: Compra de R$ 1.200 em 12x → 12 transações de R$ 100

### **3.3 Transações Recorrentes** 🔄
- **Quando usar**: Assinaturas, aluguel, salário, contas fixas
- **Configuração**:
  - **Frequência**: Semanal, Quinzenal, Mensal, Bimestral, Trimestral, Semestral, Anual
  - **Dia de referência**: Dia do mês/semana que deve ocorrer
  - **Data início**: Primeira ocorrência
  - **Data fim** (opcional): Quando encerrar
  - **Status**: Ativo/Inativo

- **Comportamento automático**:
  - Sistema processa recorrências **diariamente às 02:30 BRT**
  - **Catch-up automático**: Se estiver atrasado, gera todas as ocorrências pendentes até hoje
  - Status pode ser alternado entre "Ativo" e "Inativo" a qualquer momento

### **3.4 Transferências entre Carteiras**
- **Localização**: Menu → Transferências
- **Quando usar**: Mover dinheiro entre contas, recarregar carteira digital, etc.
- **Importante**: Transferências **não contam** como receita ou despesa, apenas atualizam saldos

---

## **4. Orçamentos e Controle Mensal**

### **4.1 Criar Orçamentos por Categoria**
- **Localização**: Menu → Orçamento → Botão "+"
- **Campos**:
  - Categoria
  - **Limite mensal** (ex: Mercado = R$ 800)
  - **Modo de cálculo**:
    - "Somente Pagas": Considera apenas transações pagas
    - "Pagas + Pendentes": Inclui transações pendentes no realizado

### **4.2 Política de Rollover** (Transferência de Saldo)
- **O que é**: Transferir saldo não gasto para o próximo mês
- **Opções**:
  - `none`: Sem transferência (orçamento reinicia zerado)
  - `carry_over`: Transfere todo o saldo restante
  - `clamp`: Transfere até um valor máximo definido

- **Como aplicar**:
  1. Fechar o período do mês atual
  2. Clicar em "Aplicar Rollover" na página de Orçamento
  3. Sistema cria/atualiza orçamentos do próximo mês automaticamente

### **4.3 Fechamento de Períodos** 🔒
- **Localização**: Orçamento → Botão "Fechar Período"
- **O que faz**:
  - **Bloqueia** criação/edição/exclusão de transações daquele mês
  - Garante integridade dos dados históricos
  - Permite aplicar rollover com segurança

- **Reabertura**:
  - Botão "Reabrir Período" disponível se precisar corrigir algo
  - Desbloqueio apenas para o mês específico

- **Mensagem amigável**:
  - Ao tentar editar transação de período fechado:
    > "Período fechado. Reabra o mês em Orçamento/Relatórios para editar estes lançamentos."

---

## **5. Faturas de Cartão de Crédito**

### **5.1 Consultar Fatura**
- **Localização**: Carteiras → [Cartão específico] → Aba "Faturas"
- **Informações exibidas**:
  - Ciclo atual (data início/fim)
  - Valor total da fatura
  - Compras do período
  - Status (Aberta/Fechada/Paga)

### **5.2 Fechar Fatura**
- **Ação**: Botão "Fechar Fatura"
- **O que acontece**:
  - Sistema agrupa todas as compras pendentes do período
  - Marca fatura como "Fechada"
  - Valor total é calculado

### **5.3 Pagar Fatura**
- **Ação**: Botão "Pagar Fatura"
- **Passos**:
  1. Selecionar **conta de origem** (de onde sairá o dinheiro)
  2. Confirmar **data de pagamento**
  3. Sistema cria transação de despesa única
  4. Todas as compras da fatura são quitadas automaticamente

### **5.4 Reclassificar Categorias**
- **Funcionalidade**: Editar categoria de compras diretamente na fatura
- **Proteção**: Índice único impede duplicação de linhas de fatura

---

## **6. Importação de Extratos (CSV)**

### **6.1 Formatos Suportados**
- ✅ **CSV** (arquivos separados por vírgula ou ponto-e-vírgula)
- ❌ **OFX não suportado** (apenas CSV)

### **6.2 Processo de Importação**

**Passo 1: Upload**
- **Localização**: Menu → Importar
- Arrastar arquivo CSV ou clicar para selecionar

**Passo 2: Mapeamento de Campos**
- Sistema detecta automaticamente colunas comuns (data, valor, descrição)
- Ajustar mapeamento manualmente se necessário
- **Presets salvos**: Use configurações de importações anteriores

**Passo 3: Revisão e Deduplicação**
- Sistema calcula **fingerprint** de cada transação: `MD5(user_id|descrição|data|valor)`
- **Deduplicação automática**: Transações duplicadas são **ignoradas silenciosamente**
- Revisar categorias sugeridas (sistema usa matching inteligente)

**Passo 4: Importação Final**
- Confirmar importação
- Sistema registra histórico
- Sucesso parcial exibido se houver duplicatas detectadas

### **6.3 Salvar Presets**
- Após mapear colunas, salvar configuração com nome (ex: "Banco XYZ")
- Reutilizar em futuras importações do mesmo banco

---

## **7. Metas e Investimentos**

### **7.1 Criar Metas Financeiras**
- **Localização**: Menu → Metas → Botão "+"
- **Campos**:
  - Objetivo (ex: "Viagem", "Carro")
  - Valor total desejado
  - Prazo (data limite)
- **Progresso**: Atualizado conforme contribuições

### **7.2 Registrar Investimentos** (Opcional)
- **Localização**: Menu → Investimentos
- **Funcionalidades**:
  - Cadastrar produtos (CDB, Ações, Fundos, etc.)
  - Registrar aportes
  - Acompanhar alocação percentual
  - Visualizar evolução do patrimônio

---

## **8. Relatórios e Análises**

### **8.1 Abas Disponíveis**
- **Evolução**: Gráfico de saldos ao longo do tempo
- **Categorias**: Distribuição de gastos por categoria (pizza/barras)
- **Projeções**: Tendências futuras baseadas em histórico
- **Insights**: Análise de recorrências e padrões de gastos

### **8.2 Filtros**
- Período (mês/trimestre/ano/customizado)
- Tipo (Receitas/Despesas/Ambos)
- Categoria específica
- Carteira específica
- Status (Pagas/Pendentes/Ambas)

### **8.3 Exportação**
- **CSV**: Para análise externa (Excel, Google Sheets)
- **PDF**: Relatórios formatados para impressão/compartilhamento
- **Uso**: Registro contábil, declaração de imposto de renda

---

## **9. Alertas e Configurações**

### **9.1 Ativar Alertas por E-mail**
- **Localização**: Menu → Configurações → Seção "Alertas"
- **Funcionalidades**:
  - Resumo diário automático
  - Contas a vencer (7-30 dias)
  - Orçamentos >80% gastos
  - Faturas vencendo em 7 dias
  - Metas com prazo próximo

### **9.2 Configuração do Agendamento** ⚠️ **Ação Manual Necessária**
- **Importante**: O envio automático de alertas requer configuração adicional
- **Opções**:
  
  **Opção A (Recomendada)**: Via Dashboard Supabase
  - Acessar painel de Edge Functions
  - Configurar Cron Schedule para `send-alerts`
  - Expressão: `30 10 * * *` (07:30 BRT = 10:30 UTC)
  
  **Opção B (Avançada)**: Via `pg_net` (requer configuração técnica)

### **9.3 Teste Manual**
- Botão "Enviar Email de Teste" na seção de Alertas
- Verifica se configuração de envio está correta

### **9.4 Outras Configurações**
- **Modo de orçamento**: Pagas vs Pagas+Pendentes (global)
- **Tema**: Claro/Escuro/Automático
- **Idioma**: Português (outros em desenvolvimento)
- **Horário de alertas**: Definir hora preferida para receber resumos

---

## **10. Finalização e Boas Práticas**

### **10.1 Rotina Mensal Recomendada**
1. **Durante o mês**:
   - Lançar transações regularmente
   - Acompanhar orçamentos
   - Verificar faturas de cartão

2. **Fim do mês**:
   - Verificar se todas as transações foram registradas
   - Fechar faturas de cartão em aberto
   - **Fechar o período** (bloqueia edições)
   - **Aplicar rollover** de orçamentos (se configurado)

3. **Início do mês seguinte**:
   - Revisar metas e ajustar se necessário
   - Registrar novos aportes em investimentos
   - Verificar recorrências processadas automaticamente

### **10.2 Backup e Segurança**
- Exportar dados em CSV/PDF **mensalmente**
- Manter cópias de segurança locais
- Revisar logs de importação em caso de inconsistências

### **10.3 Checklist de Validação**
- [ ] Todas as carteiras cadastradas
- [ ] Categorias personalizadas
- [ ] Orçamentos definidos para categorias principais
- [ ] Recorrências configuradas e ativas
- [ ] Alertas habilitados (se desejado)
- [ ] Período anterior fechado corretamente

---

## **11. Solução de Problemas Comuns**

### **Erro: "Período fechado"**
- **Causa**: Tentativa de editar transação de mês fechado
- **Solução**: Reabrir período em Orçamento → Botão "Reabrir Período"

### **Recorrências não geraram transações**
- **Verificar**:
  - Status está "Ativo"?
  - Data de início já passou?
  - Data fim não foi atingida?
- **Solução manual**: Orçamento → Botão "Processar Recorrências"

### **Importação duplicou transações**
- **Causa**: Fingerprint não detectou duplicata (dados diferentes)
- **Solução**: Sistema ignora duplicatas automaticamente; verificar se descrição/valor/data são exatamente iguais

### **Fatura de cartão com valor incorreto**
- **Verificar**:
  - Todas as compras estão marcadas como "Crédito"?
  - Datas das compras estão dentro do ciclo correto?
- **Solução**: Editar compras individuais antes de fechar fatura

### **Saldo de carteira não confere**
- **Causas comuns**:
  - Transferências não registradas
  - Transações duplicadas (importação + manual)
  - Saldo inicial incorreto
- **Solução**: Exportar CSV e fazer auditoria manual

---

## **12. Materiais de Apoio Recomendados**

### **Guia Rápido em PDF**
- Infográfico: Fluxo "Cadastrar Carteira → Definir Categorias → Criar Orçamento → Lançar Transações → Fechar Mês"
- Checklist imprimível de configuração inicial

### **Vídeo-Aula Inicial** (Sugestão)
- Demonstração completa do fluxo:
  1. Criar carteira
  2. Configurar orçamento de mercado
  3. Lançar compra parcelada
  4. Transferir dinheiro entre contas
  5. Fechar período

### **Checklist Interativo no App** (Futuro)
- Destacar pendências: "Você não tem carteiras cadastradas"
- Sugerir ações: "Categorias sem orçamento definido"
- Progresso de configuração: Barra 0-100%

### **FAQ - Perguntas Frequentes**
- Como reabrir um período fechado?
- Por que minha recorrência não gerou transações?
- Como importar extratos do meu banco?
- Como configurar alertas automáticos?

---

## **Versão e Atualizações**

- **Versão atual**: 1.1.0
- **Data**: Janeiro 2025
- **Próxima revisão**: Trimestral
- **Changelog v1.1**:
  - ✅ Deduplicação automática em importações (fingerprint)
  - ✅ Mensagens amigáveis para período fechado
  - ✅ Otimização de consultas de orçamento (server-side)
  - ✅ Proteção contra duplicação em faturas (índice único)
  - ✅ Catch-up automático de recorrências atrasadas

---

## **Suporte e Contato**

Para dúvidas, problemas ou sugestões:
1. Consultar esta documentação
2. Verificar FAQ no aplicativo
3. Contactar suporte técnico

**Boas práticas**: Seguindo esta jornada estruturada, você terá controle total sobre suas finanças, evitará erros comuns e aproveitará ao máximo todos os recursos do sistema!

---

## **Fluxograma Visual da Jornada**

```mermaid
flowchart TD
    Start([👤 Novo Usuário]) --> Signup[📝 Cadastro/Login]
    Signup --> AutoSetup[⚙️ Setup Automático]
    AutoSetup --> |Cria perfil, categorias<br/>e métodos padrão| ReviewCat[📋 Revisar Categorias]
    
    ReviewCat --> CreateWallet[💳 CRIAR CARTEIRAS]
    
    style CreateWallet fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px,color:#fff
    
    CreateWallet --> WalletType{Tipo de Carteira?}
    WalletType --> |Conta Bancária| BankAccount[🏦 Conta: Informar Saldo Inicial]
    WalletType --> |Cartão de Crédito| CreditCard[💳 Cartão: Dias Fechamento/Vencimento]
    
    BankAccount --> StartTransactions[📊 Iniciar Lançamentos]
    CreditCard --> StartTransactions
    
    StartTransactions --> TransactionType{Tipo de Lançamento?}
    
    TransactionType --> |Simples| SimpleTransaction[💵 Transação Simples<br/>Descrição, Valor, Data,<br/>Categoria, Carteira]
    TransactionType --> |Parcelada| Installment[🔢 Parcelada<br/>Nº parcelas + Valor Total<br/>Sistema gera automaticamente]
    TransactionType --> |Recorrente| Recurring[🔄 Recorrente<br/>Frequência, Dia Referência<br/>Status: Ativo/Inativo]
    TransactionType --> |Transferência| Transfer[↔️ Transferência<br/>Entre Carteiras<br/>Não conta como receita/despesa]
    
    SimpleTransaction --> HasMoreTrans{Mais<br/>Transações?}
    Installment --> HasMoreTrans
    Recurring --> RecurringNote[💡 Catch-up automático<br/>Processa diariamente 02:30 BRT]
    RecurringNote --> HasMoreTrans
    Transfer --> HasMoreTrans
    
    HasMoreTrans --> |Sim| TransactionType
    HasMoreTrans --> |Não| ImportOption{Importar<br/>Extrato?}
    
    ImportOption --> |Sim| ImportCSV[📁 Importar CSV]
    ImportCSV --> MapColumns[🗺️ Mapear Colunas]
    MapColumns --> Dedup[🔍 Deduplicação<br/>Fingerprint: MD5<br/>user|desc|data|valor]
    Dedup --> SavePreset{Salvar<br/>Preset?}
    SavePreset --> |Sim| PresetSaved[💾 Preset Salvo]
    SavePreset --> |Não| CreateBudgets
    PresetSaved --> CreateBudgets
    ImportOption --> |Não| CreateBudgets
    
    CreateBudgets[🎯 Criar Orçamentos]
    CreateBudgets --> BudgetSettings[⚙️ Configurar por Categoria<br/>Limite Mensal<br/>Modo: Pagas ou Pagas+Pendentes]
    BudgetSettings --> RolloverPolicy{Política de<br/>Rollover?}
    
    RolloverPolicy --> |none| NoRollover[❌ Sem Transferência]
    RolloverPolicy --> |carry_over| CarryOver[✅ Transfere Tudo]
    RolloverPolicy --> |clamp| Clamp[📏 Transfere até Limite]
    
    NoRollover --> MonthEnd
    CarryOver --> MonthEnd
    Clamp --> MonthEnd
    
    MonthEnd{Fim do Mês?}
    MonthEnd --> |Não| MonthlyTracking[📊 Acompanhamento Mensal]
    MonthlyTracking --> CheckInvoices{Tem Cartão<br/>de Crédito?}
    
    CheckInvoices --> |Sim| ViewInvoice[📄 Consultar Fatura<br/>Ciclo, Total, Compras]
    ViewInvoice --> CloseInvoice[🔒 Fechar Fatura]
    CloseInvoice --> PayInvoice[💰 Pagar Fatura<br/>Selecionar Conta Origem<br/>Sistema quita todas compras]
    PayInvoice --> MonthEnd
    CheckInvoices --> |Não| MonthEnd
    
    MonthEnd --> |Sim| ClosePeriod[🔐 FECHAR PERÍODO]
    
    style ClosePeriod fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px,color:#fff
    
    ClosePeriod --> BlockEdits[🚫 Bloqueia Edições<br/>Garante Integridade]
    BlockEdits --> ApplyRollover[🔄 Aplicar Rollover<br/>Transfere Saldos para<br/>Próximo Mês]
    
    ApplyRollover --> Goals{Tem Metas<br/>ou Investimentos?}
    
    Goals --> |Metas| CreateGoal[🎯 Criar Meta Financeira<br/>Objetivo, Valor, Prazo]
    CreateGoal --> GoalContrib[💰 Registrar Contribuições]
    GoalContrib --> Reports
    
    Goals --> |Investimentos| CreateInvest[📈 Cadastrar Investimentos<br/>CDB, Ações, Fundos]
    CreateInvest --> InvestContrib[💵 Registrar Aportes<br/>Acompanhar Alocação %]
    InvestContrib --> Reports
    
    Goals --> |Não| Reports
    
    Reports[📊 Relatórios e Análises]
    Reports --> ReportTypes[📈 Evolução: Saldos ao longo do tempo<br/>📊 Categorias: Distribuição de gastos<br/>🔮 Projeções: Tendências futuras<br/>💡 Insights: Padrões de gastos]
    
    ReportTypes --> ExportData{Exportar<br/>Dados?}
    ExportData --> |CSV| ExportCSV[📄 Exportar CSV<br/>Análise externa]
    ExportData --> |PDF| ExportPDF[📑 Exportar PDF<br/>Impressão/Compartilhamento]
    ExportData --> |Não| Alerts
    ExportCSV --> Alerts
    ExportPDF --> Alerts
    
    Alerts{Ativar<br/>Alertas?}
    Alerts --> |Sim| ConfigAlerts[📧 Configurar Alertas<br/>Resumo diário, Contas a vencer<br/>Orçamentos >80%, Faturas]
    ConfigAlerts --> ScheduleNote[⚠️ Configurar agendamento<br/>manualmente via Dashboard]
    ScheduleNote --> NextMonth
    Alerts --> |Não| NextMonth
    
    NextMonth[📅 Próximo Mês]
    NextMonth --> MonthlyTracking
    
    style Start fill:#4ecdc4,stroke:#1a535c,stroke-width:2px
    style AutoSetup fill:#ffe66d,stroke:#ff6b6b,stroke-width:2px
    style Dedup fill:#95e1d3,stroke:#38ada9,stroke-width:2px
    style BlockEdits fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px
    style RecurringNote fill:#a8e6cf,stroke:#56ab91,stroke-width:2px
    style ScheduleNote fill:#ffd93d,stroke:#f6b93b,stroke-width:2px
    
    classDef decision fill:#fff,stroke:#4a90e2,stroke-width:2px
    class WalletType,TransactionType,HasMoreTrans,ImportOption,SavePreset,RolloverPolicy,MonthEnd,CheckInvoices,Goals,ExportData,Alerts decision
```

### **Legenda do Fluxograma**

- 🔴 **Vermelho**: Etapas críticas obrigatórias (Criar Carteiras, Fechar Período)
- 🔵 **Azul**: Pontos de decisão
- 🟡 **Amarelo**: Avisos importantes
- 🟢 **Verde**: Processos automatizados
- ⬜ **Cinza**: Etapas opcionais

---

**Fim da Documentação** | Versão 1.1.0 | Janeiro 2025
