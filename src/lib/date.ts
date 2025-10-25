import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
};

export const formatMonthYear = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMMM yyyy', { locale: ptBR });
};

export const getMonthReference = (date: Date): string => {
  return format(date, 'yyyy-MM');
};

export const getCurrentMonth = (): { year: number; month: number } => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
};
