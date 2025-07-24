/**
 * Calendar grid component showing weekly schedule
 */

import { memo } from 'react';
import { CalendarAssignment } from '@/hooks/useCalendarData';
import { AssignmentCard } from './AssignmentCard';

interface CalendarGridProps {
  weekDates: Date[];
  isToday: (date: Date) => boolean;
  getAssignmentsForDate: (date: Date) => CalendarAssignment[];
  onDateClick?: (date: string) => void;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const CalendarGrid = memo(function CalendarGrid({
  weekDates,
  isToday,
  getAssignmentsForDate,
  onDateClick,
}: CalendarGridProps) {
  return (
    <div className="grid grid-cols-7 gap-4">
      {/* Day Headers */}
      {DAYS_OF_WEEK.map((day, index) => (
        <div key={day} className="text-center pb-2">
          <div className="text-sm font-medium text-gray-900">{day}</div>
          <div
            className={`text-lg font-semibold mt-1 ${
              isToday(weekDates[index]) ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {weekDates[index].getDate()}
          </div>
        </div>
      ))}

      {/* Assignment Cells */}
      {weekDates.map((date, index) => {
        const dayAssignments = getAssignmentsForDate(date);

        return (
          <div
            key={index}
            className={`min-h-[120px] border rounded-lg p-2 cursor-pointer transition-colors ${
              isToday(date)
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onDateClick?.(date.toISOString().split('T')[0])}
          >
            <div className="space-y-1">
              {dayAssignments.length === 0 ? (
                <div className="text-center text-gray-400 text-xs mt-4">
                  No trips
                </div>
              ) : (
                dayAssignments.map(assignment => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
