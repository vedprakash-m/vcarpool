/**
 * Calendar loading state component
 */

import { memo } from 'react';

export const CalendarLoading = memo(function CalendarLoading() {
  return (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading schedule...</p>
    </div>
  );
});
