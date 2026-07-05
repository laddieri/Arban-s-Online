'use client';

import { useState, useMemo } from 'react';
import { toLocalDateKey } from '@/utils/pageHistory';

interface CalendarProps {
  datesWithHistory: string[]; // Array of date strings (YYYY-MM-DD)
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  getPageCountForDate: (date: string) => number;
}

export default function Calendar({
  datesWithHistory,
  selectedDate,
  onDateSelect,
  getPageCountForDate,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Start with the most recent date with history, or current month
    if (datesWithHistory.length > 0) {
      return new Date(datesWithHistory[0] + 'T00:00:00');
    }
    return new Date();
  });

  // Get days in month
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysCount; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentMonth]);

  // Check if a date has history
  const hasHistory = (date: Date | null): boolean => {
    if (!date) return false;
    return datesWithHistory.includes(toLocalDateKey(date));
  };

  // Check if date is selected
  const isSelected = (date: Date | null): boolean => {
    if (!date || !selectedDate) return false;
    return toLocalDateKey(date) === selectedDate;
  };

  // Check if date is today
  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Handle date click
  const handleDateClick = (date: Date | null) => {
    if (!date || !hasHistory(date)) return;
    onDateSelect(toLocalDateKey(date));
  };

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          aria-label="Previous month"
        >
          <svg
            className="w-5 h-5 text-gray-700 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {monthName}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Today
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          aria-label="Next month"
        >
          <svg
            className="w-5 h-5 text-gray-700 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          </button>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map((date, index) => {
          const hasHistoryData = hasHistory(date);
          const selected = isSelected(date);
          const today = isToday(date);
          const pageCount = date && hasHistoryData ? getPageCountForDate(toLocalDateKey(date)) : 0;

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={!date || !hasHistoryData}
              className={`
                relative aspect-square rounded-lg p-2 text-sm transition-all
                ${!date ? 'invisible' : ''}
                ${hasHistoryData
                  ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900'
                  : 'cursor-default text-gray-300 dark:text-gray-600'
                }
                ${selected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : hasHistoryData
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white font-medium'
                  : ''
                }
                ${today && !selected
                  ? 'ring-2 ring-blue-600 ring-inset'
                  : ''
                }
              `}
              title={date && hasHistoryData ? `${pageCount} page${pageCount !== 1 ? 's' : ''} viewed` : ''}
            >
              {date && (
                <>
                  <div className="flex items-center justify-center h-full">
                    {date.getDate()}
                  </div>
                  {hasHistoryData && pageCount > 0 && (
                    <div
                      className={`
                        absolute bottom-1 left-1/2 transform -translate-x-1/2
                        text-xs font-bold
                        ${selected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}
                      `}
                    >
                      {pageCount > 9 ? '9+' : pageCount}
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-50 dark:bg-blue-900/30 rounded border-2 border-blue-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-50 dark:bg-blue-900/30 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Has History</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Selected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
