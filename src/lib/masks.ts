export const maskCurrency = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Converte para número e divide por 100 para obter os centavos
  const amount = Number(numbers) / 100;
  
  // Formata como BRL
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

export const unmaskCurrency = (value: string): number => {
  // Remove R$ e espaços
  let cleaned = value.replace(/[R$\s]/g, '');
  // Remove pontos (separadores de milhares no Brasil)
  cleaned = cleaned.replace(/\./g, '');
  // Converte vírgula (separador decimal) para ponto
  cleaned = cleaned.replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export const maskDate = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  } else {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  }
};
