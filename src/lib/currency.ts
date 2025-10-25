export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const parseCurrency = (value: string): number => {
  // Remove R$, spaces, and convert comma to dot
  const cleaned = value.replace(/[R$\s]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};
