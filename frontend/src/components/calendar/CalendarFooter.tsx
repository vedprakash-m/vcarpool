/**
 * Calendar footer with legend and actions
 */

import { memo } from 'react';

interface CalendarFooterProps {
  showCreateButton?: boolean;
  userRole?: string;
}

export const CalendarFooter = memo(function CalendarFooter({
  showCreateButton = false,
  userRole,
}: CalendarFooterProps) {
  return (
    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
            <span className="text-gray-600">Drop-off</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span className="text-gray-600">Pick-up</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
            <span className="text-gray-600">Multi-stop</span>
          </div>
        </div>

        {showCreateButton && userRole === 'admin' && (
          <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
            + Create Assignment
          </button>
        )}
      </div>
    </div>
  );
});
