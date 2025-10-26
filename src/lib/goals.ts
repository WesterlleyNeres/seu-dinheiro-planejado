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
