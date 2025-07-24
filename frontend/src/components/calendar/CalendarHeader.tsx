/**
 * Calendar header component with navigation
 */

import { memo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface CalendarHeaderProps {
  weekRangeText: string;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
  showCreateButton?: boolean;
  userRole?: string;
}

export const CalendarHeader = memo(function CalendarHeader({
  weekRangeText,
  onNavigateWeek,
  onGoToToday,
  showCreateButton = false,
  userRole,
}: CalendarHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            📅 Weekly Schedule
          </h2>
          <p className="text-sm text-gray-600 mt-1">{weekRangeText}</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateWeek('prev')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          <button
            onClick={onGoToToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            Today
          </button>

          <button
            onClick={() => onNavigateWeek('next')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
});
