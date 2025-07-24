/**
 * BackupDriversList component for the emergency panel
 * Displays available backup drivers with availability and location info
 */

import React from 'react';
import {
  UserGroupIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { BackupDriver } from '@/hooks/useEmergencyData';

interface BackupDriversListProps {
  drivers: BackupDriver[];
}

export function BackupDriversList({ drivers }: BackupDriversListProps) {
  return (
    <div>
      <h4 className="text-md font-semibold text-red-900 mb-3 flex items-center">
        <UserGroupIcon className="w-5 h-5 mr-2" />
        Available Backup Drivers
      </h4>
      <div className="space-y-3">
        {drivers.map(driver => (
          <div
            key={driver.id}
            className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h5 className="font-medium text-gray-900">{driver.name}</h5>
                <div
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    driver.available
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {driver.available ? (
                    <CheckCircleIcon className="w-3 h-3" />
                  ) : (
                    <XCircleIcon className="w-3 h-3" />
                  )}
                  <span>{driver.available ? 'Available' : 'Busy'}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1 flex items-center space-x-4">
                <span className="flex items-center">
                  <MapPinIcon className="w-3 h-3 mr-1" />
                  {driver.proximity}
                </span>
                <span className="flex items-center">
                  <ClockIcon className="w-3 h-3 mr-1" />
                  ETA: {driver.estimatedArrival}
                </span>
              </div>
            </div>
            {driver.available && (
              <div className="flex space-x-2">
                <a
                  href={`tel:${driver.phoneNumber}`}
                  className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  title="Call backup driver"
                >
                  <PhoneIcon className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
