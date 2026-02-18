export interface TourStep {
  id: string;
  targetSelector: string | null;
  targetRoute?: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlight?: boolean;
}

export const tourSteps: TourStep[] = [
  // === INTRODUÇÃO ===
  {
    id: 'welcome',
    targetSelector: '[data-tour="sidebar"]',
    targetRoute: '/jarvis',
    title: 'Bem-vindo ao Fractto Flow!',
    content: 'Este é o menu principal. Aqui você encontra todas as funcionalidades do sistema organizadas em dois módulos: Assistente (eu!) e Finanças.',
    position: 'right',
    spotlight: true,
  },
  
  // === GUTA MODULE ===
  {
    id: 'jarvis-home',
    targetSelector: '[data-tour="jarvis-content"]',
    targetRoute: '/jarvis',
    title: 'Início da GUTA',
    content: 'Aqui você vê suas tarefas pendentes, próximos eventos e hábitos do dia. É seu painel de produtividade!',
    position: 'bottom',
    spotlight: true,
  },
  {
    id: 'jarvis-chat',
    targetSelector: '[data-tour="chat-area"]',
    targetRoute: '/jarvis/chat',
    title: 'Chat com GUTA',
    content: 'Converse comigo em linguagem natural! Pode pedir para criar tarefas, registrar gastos, agendar eventos... eu entendo tudo.',
    position: 'center',
    spotlight: false,
  },
  {
    id: 'jarvis-tasks',
    targetSelector: '[data-tour="tasks-content"]',
    targetRoute: '/jarvis/tasks',
    title: 'Suas Tarefas',
    content: 'Gerencie suas tarefas com prioridades, tags e datas. Marque como concluídas e acompanhe seu progresso.',
    position: 'bottom',
    spotlight: true,
  },
  {
    id: 'jarvis-habits',
    targetSelector: '[data-tour="habits-content"]',
    targetRoute: '/jarvis/habits',
    title: 'Hábitos',
    content: 'Crie hábitos diários, semanais ou mensais. Eu te lembro de praticá-los e mostro seu streak!',
    position: 'bottom',
    spotlight: true,
  },
  {
    id: 'jarvis-calendar',
    targetSelector: '[data-tour="calendar-content"]',
    targetRoute: '/jarvis/calendar',
    title: 'Calendário de Eventos',
    content: 'Visualize todos os seus compromissos em um calendário integrado. Sincronize com o Google Calendar!',
    position: 'bottom',
    spotlight: true,
  },
  
  // === FINANÇAS MODULE ===
  {
    id: 'finance-dashboard',
    targetSelector: '[data-tour="dashboard-content"]',
    targetRoute: '/dashboard',
    title: 'Dashboard Financeiro',
    content: 'Visão geral das suas finanças: receitas, despesas e saldo do mês. Tudo em um só lugar!',
    position: 'bottom',
    spotlight: true,
  },
  {
    id: 'finance-wallets',
    targetSelector: '[data-tour="wallets-content"]',
    targetRoute: '/wallets',
    title: 'Suas Carteiras',
    content: 'Cadastre suas contas bancárias e cartões de crédito. O saldo atualiza automaticamente a cada lançamento.',
    position: 'bottom',
    spotlight: true,
  },
  {
    id: 'finance-transactions',
    targetSelector: '[data-tour="transactions-content"]',
    targetRoute: '/transactions',
    title: 'Lançamentos',
    content: 'Registre suas receitas e despesas. Use categorias para organizar e veja gráficos detalhados.',
    position: 'bottom',
    spotlight: true,
  },
  {
    id: 'finance-budget',
    targetSelector: '[data-tour="budget-content"]',
    targetRoute: '/budget',
    title: 'Orçamento Mensal',
    content: 'Defina limites por categoria. Te aviso quando estiver chegando perto do limite!',
    position: 'bottom',
    spotlight: true,
  },
  {
    id: 'finance-goals',
    targetSelector: '[data-tour="goals-content"]',
    targetRoute: '/goals',
    title: 'Metas Financeiras',
    content: 'Crie objetivos como "Reserva de emergência" ou "Viagem". Acompanhe as contribuições até atingir!',
    position: 'bottom',
    spotlight: true,
  },
  
  // === FINALIZAÇÃO ===
  {
    id: 'settings',
    targetSelector: '[data-tour="settings-content"]',
    targetRoute: '/settings',
    title: 'Configurações',
    content: 'Personalize alertas, tema e integrações. Conecte com Google Calendar e WhatsApp aqui.',
    position: 'bottom',
    spotlight: true,
  },
  {
    id: 'complete',
    targetSelector: null,
    title: 'Tour Completo! 🎉',
    content: 'Agora você conhece o Fractto Flow! Se tiver dúvidas, é só me chamar no chat. Estou sempre aqui para ajudar!',
    position: 'center',
    spotlight: false,
  },
];
