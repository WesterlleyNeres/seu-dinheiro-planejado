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

export const useCalendar = (transactions: Transaction[]): UseCalendarReturn => {
  const { year: currentYear, month: currentMonth } = getCurrentMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

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
