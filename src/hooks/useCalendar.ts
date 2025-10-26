import { useState, useEffect, useMemo } from 'react';
import { generateCalendarDays, formatDateKey, getCurrentMonth } from '@/lib/date';
import { Transaction } from './useTransactions';

export interface UseCalendarReturn {
  currentMonth: number;
  currentYear: number;
  calendarDays: Date[];
  transactionsByDay: Map<string, Transaction[]>;
  nextMonth: () => void;
  prevMonth: () => void;
  goToToday: () => void;
}

export const useCalendar = (
  transactions: Transaction[],
  initialYear?: number,
  initialMonth?: number
): UseCalendarReturn => {
  const { year: currentYear, month: currentMonth } = getCurrentMonth();
  const [selectedYear, setSelectedYear] = useState(initialYear ?? currentYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth ?? currentMonth);

  // Sincronizar com valores externos quando mudarem
  useEffect(() => {
    if (initialYear !== undefined) setSelectedYear(initialYear);
  }, [initialYear]);
  
  useEffect(() => {
    if (initialMonth !== undefined) setSelectedMonth(initialMonth);
  }, [initialMonth]);

  const calendarDays = useMemo(() => {
    return generateCalendarDays(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const transactionsByDay = useMemo(() => {
    const grouped = new Map<string, Transaction[]>();
    
    transactions.forEach((transaction) => {
      const key = formatDateKey(new Date(transaction.data));
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(transaction);
    });

    return grouped;
  }, [transactions]);

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToToday = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  return {
    currentMonth: selectedMonth,
    currentYear: selectedYear,
    calendarDays,
    transactionsByDay,
    nextMonth,
    prevMonth,
    goToToday,
  };
};
