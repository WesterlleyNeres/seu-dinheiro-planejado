import { Transaction } from '@/hooks/useTransactions';
import { CalendarDay } from './CalendarDay';
import { formatDateKey, isToday, isSameDay } from '@/lib/date';

interface CalendarGridProps {
  month: number;
  year: number;
  calendarDays: Date[];
  transactionsByDay: Map<string, Transaction[]>;
  onDayClick: (date: Date, transactions: Transaction[]) => void;
  selectedDate?: Date;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CalendarGrid = ({
  month,
  year,
  calendarDays,
  transactionsByDay,
  onDayClick,
  selectedDate,
}: CalendarGridProps) => {
  return (
    <div className="space-y-2">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-semibold text-muted-foreground py-1 sm:py-2 sm:text-sm"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((date, index) => {
          const dateKey = formatDateKey(date);
          const dayTransactions = transactionsByDay.get(dateKey) || [];
          const isCurrentMonth = date.getMonth() === month - 1;
          const isTodayDate = isToday(date);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;

          return (
            <CalendarDay
              key={index}
              date={date}
              transactions={dayTransactions}
              isCurrentMonth={isCurrentMonth}
              isToday={isTodayDate}
              isSelected={isSelected}
              onClick={() => onDayClick(date, dayTransactions)}
            />
          );
        })}
      </div>
    </div>
  );
};
