import { FAQItem } from '@/types/faq';

export const faqItems: FAQItem[] = [
  {
    id: 'closed-period',
    category: 'Períodos e Bloqueios',
    severity: 'error',
    question: 'Erro: "Período fechado" ao tentar editar transação',
    answer: `**Causa**: Você está tentando criar, editar ou excluir uma transação de um mês que foi fechado.

**Por que isso acontece?** Fechar um período garante a integridade dos dados históricos e permite aplicar rollover de orçamentos com segurança.`,
    solution: [
      'Acesse **Orçamento** no menu lateral',
      'Localize o período fechado (indicado com ícone de cadeado)',
      'Clique em **"Reabrir Período"**',
      'Faça as edições necessárias',
      'Feche novamente quando terminar',
    ],
    relatedLinks: [
      { label: 'Ir para Orçamento', path: '/budget' },
      { label: 'Ver Lançamentos', path: '/transactions' },
    ],
    tags: ['período', 'fechado', 'bloqueio', 'editar', 'transação', 'locked'],
  },
  {
    id: 'recurring-not-generated',
    category: 'Recorrências',
    severity: 'warning',
    question: 'Transações recorrentes não foram geradas automaticamente',
    answer: `**Verificar**: As recorrências são processadas automaticamente, mas há alguns pontos de atenção.

**Possíveis causas**:
- Recorrência está **inativa** (campo "Ativo" desmarcado)
- **Data de fim** já passou
- **Data de início** ainda não chegou
- Período está **fechado** (bloqueia geração automática)`,
    solution: [
      'Acesse **Lançamentos** → aba **Recorrentes**',
      'Verifique o status (ícone verde = ativa, cinza = inativa)',
      'Confira as datas de início e fim',
      'Se necessário, reabra o período em **Orçamento**',
      'Clique em **"Gerar Agora"** para forçar processamento',
    ],
    relatedLinks: [
      { label: 'Ver Recorrências', path: '/transactions' },
      { label: 'Histórico de Geração', path: '/transactions' },
    ],
    tags: ['recorrente', 'automático', 'geração', 'não gerou', 'recurring'],
  },
  {
    id: 'import-duplicates',
    category: 'Importação',
    severity: 'warning',
    question: 'Importação de CSV criou transações duplicadas',
    answer: `**Como funciona**: O sistema usa um "fingerprint" (assinatura única) baseado em data + valor + descrição para detectar duplicatas.

**Por que aconteceu?**
- Arquivo foi importado mais de uma vez
- Pequenas diferenças no texto da descrição
- Sistema de detecção não identificou similaridade`,
    solution: [
      'Acesse **Lançamentos**',
      'Use filtros para encontrar duplicatas (mesma data + valor)',
      'Exclua manualmente as transações repetidas',
      'Na próxima importação, use a opção **"Pular duplicatas"**',
      'Considere padronizar descrições no CSV antes de importar',
    ],
    relatedLinks: [
      { label: 'Importar CSV', path: '/import' },
      { label: 'Ver Lançamentos', path: '/transactions' },
    ],
    tags: ['importação', 'csv', 'duplicata', 'repetido', 'fingerprint'],
  },
  {
    id: 'statement-wrong-total',
    category: 'Cartões e Faturas',
    severity: 'error',
    question: 'Valor da fatura do cartão está diferente do esperado',
    answer: `**Verificar ciclo de fechamento**: Faturas são geradas automaticamente com base nos dias de abertura, fechamento e vencimento do cartão.

**Causas comuns**:
- Transações fora do ciclo (data anterior ao "abre" ou posterior ao "fecha")
- Parcelamentos que iniciaram em outro ciclo
- Carteira configurada com dias incorretos`,
    solution: [
      'Acesse **Carteiras** e verifique dias de abertura/fechamento',
      'Em **Lançamentos**, filtre pela carteira do cartão',
      'Confira se as datas das transações estão dentro do ciclo',
      'Ajuste as datas se necessário',
      'Feche novamente a fatura para recalcular',
    ],
    relatedLinks: [
      { label: 'Ver Carteiras', path: '/wallets' },
      { label: 'Lançamentos do Cartão', path: '/transactions' },
    ],
    tags: ['fatura', 'cartão', 'valor', 'ciclo', 'fechamento', 'statement'],
  },
  {
    id: 'balance-mismatch',
    category: 'Saldos e Auditoria',
    severity: 'warning',
    question: 'Saldo da carteira não confere com o banco',
    answer: `**Como o saldo é calculado**:
Saldo Inicial + Total de Receitas - Total de Despesas = Saldo Atual

**Pontos de verificação**:
- **Saldo inicial** da carteira está correto?
- Há **transações pendentes** que ainda não foram pagas?
- **Transferências** entre carteiras estão balanceadas?
- Alguma **transação foi excluída** por engano?`,
    solution: [
      'Acesse **Carteiras** e revise o "Saldo Inicial"',
      'Em **Lançamentos**, filtre por "Pendente" e verifique o que falta pagar',
      'Confira **Transferências** para ver se há movimentações não registradas',
      'Use **Relatórios** para visualizar evolução do saldo',
      'Se necessário, ajuste o saldo inicial para refletir a realidade',
    ],
    relatedLinks: [
      { label: 'Ver Carteiras', path: '/wallets' },
      { label: 'Relatório de Saldo', path: '/reports' },
      { label: 'Transferências', path: '/transfers' },
    ],
    tags: ['saldo', 'diferença', 'auditoria', 'balance', 'carteira'],
  },
  {
    id: 'alerts-not-received',
    category: 'Configurações',
    severity: 'info',
    question: 'Não estou recebendo alertas por e-mail',
    answer: `**Sistema de alertas**: Funciona através de edge functions que verificam eventos (orçamento ultrapassado, faturas próximas do vencimento, etc.) e enviam notificações.

**O que verificar**:
- Alertas estão **habilitados** nas configurações?
- E-mail está confirmado no Supabase?
- Horário de envio configurado corretamente?
- Spam/lixo eletrônico do seu provedor?`,
    solution: [
      'Acesse **Configurações** → **Alertas**',
      'Ative "Habilitar alertas por e-mail"',
      'Selecione os tipos de alerta desejados',
      'Configure o horário de envio',
      'Verifique sua caixa de spam/lixo eletrônico',
      'Adicione o remetente à lista de contatos confiáveis',
    ],
    relatedLinks: [
      { label: 'Configurar Alertas', path: '/settings' },
    ],
    tags: ['alerta', 'email', 'notificação', 'spam', 'notification'],
  },
  {
    id: 'budget-not-updating',
    category: 'Períodos e Bloqueios',
    severity: 'warning',
    question: 'Orçamento não está atualizando com as transações',
    answer: `**Modo de cálculo**: O sistema oferece dois modos:
- **Competência**: Considera o mês de referência da transação
- **Caixa**: Considera apenas transações pagas

**Verificar**:
- Qual modo está ativo? (Competência vs Caixa)
- As transações estão marcadas como **"Paga"**?
- Categoria da transação existe no orçamento do mês?`,
    solution: [
      'Acesse **Configurações** e verifique o "Modo de Orçamento"',
      'Em **Lançamentos**, confira o status das transações (paga/pendente)',
      'Verifique se a categoria tem limite configurado para o mês',
      'Se usar modo Caixa, altere transações para "Paga" para contabilizar',
    ],
    relatedLinks: [
      { label: 'Configurações', path: '/settings' },
      { label: 'Ver Orçamento', path: '/budget' },
      { label: 'Lançamentos', path: '/transactions' },
    ],
    tags: ['orçamento', 'atualização', 'competência', 'caixa', 'budget'],
  },
  {
    id: 'rollover-not-applied',
    category: 'Períodos e Bloqueios',
    severity: 'error',
    question: 'Rollover de orçamento não foi aplicado no próximo mês',
    answer: `**Sequência correta**: Para o rollover funcionar, você deve:
1. Configurar política de rollover (carry_over ou clamp)
2. **Fechar o período** para consolidar saldos
3. Abrir o próximo período para receber o saldo transportado

**Importante**: Rollover **só é aplicado quando você fecha o período**. Não é automático.`,
    solution: [
      'Acesse **Orçamento**',
      'Selecione o mês anterior',
      'Clique em **"Fechar Período"**',
      'O sistema calculará saldos e aplicará rollover',
      'Navegue para o próximo mês e verifique',
      'Se já fechou e não funcionou, reabra e feche novamente',
    ],
    relatedLinks: [
      { label: 'Ver Orçamento', path: '/budget' },
    ],
    tags: ['rollover', 'transporte', 'saldo', 'período', 'fechamento'],
  },
  {
    id: 'installment-wrong-value',
    category: 'Cartões e Faturas',
    severity: 'warning',
    question: 'Parcelamento gerou valores incorretos nas parcelas',
    answer: `**Como funciona o parcelamento**:
- Você informa o **valor total** da compra
- Sistema divide pelo **número de parcelas**
- Se houver centavos, a primeira parcela recebe o ajuste

**Exemplo**: R$ 100,00 em 3x = R$ 33,34 + R$ 33,33 + R$ 33,33

**Problema comum**: Informar o valor da parcela individual ao invés do total.`,
    solution: [
      'Ao criar parcelamento, informe o **valor total** da compra',
      'Se já criou errado, exclua todas as parcelas',
      'Recrie informando corretamente o valor total',
      'Verifique se o número de parcelas está correto',
    ],
    relatedLinks: [
      { label: 'Criar Lançamento', path: '/transactions' },
    ],
    tags: ['parcelamento', 'parcela', 'valor', 'divisão', 'installment'],
  },
  {
    id: 'calendar-empty',
    category: 'Configurações',
    severity: 'info',
    question: 'Calendário está vazio ou não mostra transações',
    answer: `**Calendário visualiza transações por data**. Se estiver vazio:

**Verificar**:
- Há **transações cadastradas** no mês selecionado?
- Filtros de **carteira** ou **categoria** estão ativos?
- Você está visualizando o **mês correto**?`,
    solution: [
      'Navegue pelo calendário usando as setas < >',
      'Desative filtros clicando em "Limpar Filtros"',
      'Verifique se há transações em **Lançamentos** para esse período',
      'Clique em um dia específico para ver detalhes',
    ],
    relatedLinks: [
      { label: 'Ver Calendário', path: '/calendar' },
      { label: 'Criar Lançamento', path: '/transactions' },
    ],
    tags: ['calendário', 'vazio', 'filtro', 'visualização', 'calendar'],
  },
];
