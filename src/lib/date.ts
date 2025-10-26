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

export const getFirstDayOfMonth = (year: number, month: number): Date => {
  return new Date(year, month - 1, 1);
};

export const getLastDayOfMonth = (year: number, month: number): Date => {
  return new Date(year, month, 0);
};

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

export const generateCalendarDays = (year: number, month: number): Date[] => {
  const firstDay = getFirstDayOfMonth(year, month);
  const lastDay = getLastDayOfMonth(year, month);
  
  const days: Date[] = [];
  
  // Adicionar dias do mês anterior para preencher início
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(firstDay);
    prevDate.setDate(prevDate.getDate() - (i + 1));
    days.push(prevDate);
  }
  
  // Adicionar dias do mês atual
  const daysInMonth = getDaysInMonth(year, month);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month - 1, i));
  }
  
  // Adicionar dias do próximo mês para preencher final
  const remainingDays = 42 - days.length; // 6 semanas × 7 dias
  for (let i = 1; i <= remainingDays; i++) {
    const nextDate = new Date(lastDay);
    nextDate.setDate(lastDay.getDate() + i);
    days.push(nextDate);
  }
  
  return days;
};

export const formatMonthYearFull = (year: number, month: number): string => {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy', { locale: ptBR });
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

export const formatDateKey = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
};
