export const calculateBudgetStatus = (limite: number, realizado: number) => {
  const percentual = limite > 0 ? (realizado / limite) * 100 : 0;
  const restante = limite - realizado;

  let status: 'ok' | 'warning' | 'alert' | 'exceeded';
  if (percentual <= 70) {
    status = 'ok';
  } else if (percentual <= 90) {
    status = 'warning';
  } else if (percentual <= 100) {
    status = 'alert';
  } else {
    status = 'exceeded';
  }

  return {
    percentual: Math.round(percentual * 10) / 10,
    restante,
    excedeu: restante < 0,
    status,
  };
};

export const getBudgetStatusColor = (status: string): string => {
  switch (status) {
    case 'ok':
      return 'text-success';
    case 'warning':
      return 'text-warning';
    case 'alert':
      return 'text-orange-500';
    case 'exceeded':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
};

export const getBudgetProgressColor = (percentual: number): string => {
  if (percentual <= 70) return 'bg-success';
  if (percentual <= 90) return 'bg-warning';
  if (percentual <= 100) return 'bg-orange-500';
  return 'bg-destructive';
};
