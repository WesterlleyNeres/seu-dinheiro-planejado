export const calculateGoalStatus = (
  valorMeta: number, 
  economizado: number, 
  prazo: string | null
) => {
  const percentual = Math.round((economizado / valorMeta) * 100);
  const restante = valorMeta - economizado;
  const concluida = percentual >= 100;
  
  let diasRestantes: number | null = null;
  let prazoExpirado = false;
  
  if (prazo) {
    const diff = new Date(prazo).getTime() - new Date().setHours(0, 0, 0, 0);
    diasRestantes = Math.ceil(diff / (1000 * 60 * 60 * 24));
    prazoExpirado = diasRestantes < 0 && !concluida;
  }
  
  return {
    percentual,
    restante,
    concluida,
    diasRestantes,
    prazoExpirado,
    urgente: diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 7,
  };
};

export const getGoalProgressColor = (percentual: number): string => {
  if (percentual >= 100) return 'bg-success';
  if (percentual >= 81) return 'bg-orange-500';
  if (percentual >= 51) return 'bg-warning';
  return 'bg-primary';
};

export const getGoalStatusBadge = (goal: {
  percentual: number;
  prazoExpirado: boolean;
  urgente: boolean;
  concluida: boolean;
}) => {
  if (goal.concluida) {
    return { text: 'Concluída ✓', variant: 'default' as const };
  }
  if (goal.prazoExpirado) {
    return { text: 'Prazo expirado', variant: 'destructive' as const };
  }
  if (goal.urgente) {
    return { text: 'Urgente', variant: 'secondary' as const };
  }
  return null;
};

export const formatDaysRemaining = (days: number | null): string => {
  if (days === null) return 'Sem prazo definido';
  if (days < 0) return `Expirou há ${Math.abs(days)} dia(s)`;
  if (days === 0) return 'Expira hoje!';
  if (days === 1) return 'Expira amanhã';
  return `${days} dias restantes`;
};

export const calculateDailyContribution = (
  restante: number,
  diasRestantes: number | null
): { diaria: number | null; mensal: number | null } => {
  // Sem prazo, meta já atingida ou prazo expirado
  if (diasRestantes === null || diasRestantes <= 0 || restante <= 0) {
    return { diaria: null, mensal: null };
  }
  
  const diaria = restante / diasRestantes;
  const mensal = diaria * 30;
  
  return { diaria, mensal };
};

export type PaceStatus = 'ahead' | 'on_track' | 'behind' | 'completed' | 'no_deadline';

export interface PaceResult {
  status: PaceStatus;
  expectedPercent: number;
  actualPercent: number;
  differencePercent: number;
}

export const calculatePace = (
  valorMeta: number,
  economizado: number,
  prazo: string | null,
  createdAt: string
): PaceResult | null => {
  // Meta já concluída
  if (economizado >= valorMeta) {
    return { status: 'completed', expectedPercent: 100, actualPercent: 100, differencePercent: 0 };
  }
  
  // Sem prazo definido
  if (!prazo) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(createdAt);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(prazo);
  endDate.setHours(0, 0, 0, 0);
  
  // Prazo já venceu
  if (today > endDate) {
    return { 
      status: 'behind', 
      expectedPercent: 100, 
      actualPercent: Math.round((economizado / valorMeta) * 100),
      differencePercent: Math.round((economizado / valorMeta) * 100) - 100
    };
  }
  
  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (totalDays <= 0) return null;
  
  const expectedPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  const actualPercent = Math.round((economizado / valorMeta) * 100);
  const differencePercent = actualPercent - expectedPercent;
  
  let status: PaceStatus;
  if (differencePercent >= 5) status = 'ahead';
  else if (differencePercent >= -5) status = 'on_track';
  else status = 'behind';
  
  return { status, expectedPercent, actualPercent, differencePercent };
};

export const getPaceIndicator = (pace: PaceResult | null): {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
} | null => {
  if (!pace) return null;
  
  switch (pace.status) {
    case 'completed':
      return { icon: '🎉', label: 'Concluída!', color: 'text-success', bgColor: 'bg-success/10' };
    case 'ahead':
      return { icon: '🚀', label: 'Adiantado', color: 'text-success', bgColor: 'bg-success/10' };
    case 'on_track':
      return { icon: '✓', label: 'No Prazo', color: 'text-yellow-600', bgColor: 'bg-yellow-500/10' };
    case 'behind':
      return { icon: '⚠️', label: 'Atrasado', color: 'text-destructive', bgColor: 'bg-destructive/10' };
    default:
      return null;
  }
};