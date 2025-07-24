/**
 * Individual assignment card component
 */

import { memo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  ClockIcon,
  UserIcon,
  MapPinIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { CalendarAssignment } from '@/hooks/useCalendarData';

interface AssignmentCardProps {
  assignment: CalendarAssignment;
}

const ROUTE_TYPE_COLORS = {
  school_dropoff: 'bg-blue-100 text-blue-800 border-blue-200',
  school_pickup: 'bg-green-100 text-green-800 border-green-200',
  multi_stop: 'bg-purple-100 text-purple-800 border-purple-200',
  point_to_point: 'bg-orange-100 text-orange-800 border-orange-200',
};

const STATUS_COLORS = {
  scheduled: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const AssignmentCard = memo(function AssignmentCard({
  assignment,
}: AssignmentCardProps) {
  const { user } = useAuthStore();

  return (
    <div
      className={`p-2 rounded text-xs border ${
        ROUTE_TYPE_COLORS[assignment.routeType]
      }`}
    >
      <div className="flex items-center space-x-1 mb-1">
        <ClockIcon className="h-3 w-3" />
        <span className="font-medium">{assignment.startTime}</span>
      </div>

      <div className="truncate font-medium mb-1">{assignment.description}</div>

      {/* Role-specific information */}
      {user?.role === 'admin' && (
        <div className="space-y-1">
          <div className="flex items-center space-x-1">
            <UserIcon className="h-3 w-3" />
            <span className="truncate">{assignment.driverName || 'TBD'}</span>
          </div>
          {assignment.passengers && assignment.passengers.length > 0 && (
            <div className="text-xs text-gray-600">
              {assignment.passengers.length} passenger
              {assignment.passengers.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {user?.role === 'parent' && (
        <div className="space-y-1">
          {assignment.driverName === `${user.firstName} ${user.lastName}` ? (
            <div className="flex items-center space-x-1">
              <TruckIcon className="h-3 w-3" />
              <span className="text-xs font-medium">You're driving</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <UserIcon className="h-3 w-3" />
              <span className="truncate">{assignment.driverName}</span>
            </div>
          )}
          {assignment.pickupLocation && (
            <div className="flex items-center space-x-1">
              <MapPinIcon className="h-3 w-3" />
              <span className="truncate text-xs">
                {assignment.pickupLocation}
              </span>
            </div>
          )}
        </div>
      )}

      {user?.role === 'student' && (
        <div className="space-y-1">
          <div className="flex items-center space-x-1">
            <UserIcon className="h-3 w-3" />
            <span className="truncate">{assignment.driverName}</span>
          </div>
          {assignment.pickupLocation && (
            <div className="flex items-center space-x-1">
              <MapPinIcon className="h-3 w-3" />
              <span className="truncate text-xs">
                {assignment.pickupLocation}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Status indicator */}
      <div
        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
          STATUS_COLORS[assignment.status]
        }`}
      >
        {assignment.status.replace('_', ' ')}
      </div>
    </div>
  );
});
