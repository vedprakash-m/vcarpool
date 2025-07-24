/**
 * EmergencyActionButtons component for the emergency panel
 * Provides quick access to emergency actions
 */

import React from 'react';
import {
  BellAlertIcon,
  UserGroupIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

interface EmergencyActionButtonsProps {
  onReportEmergency: () => void;
  onRequestBackup: () => void;
}

export function EmergencyActionButtons({
  onReportEmergency,
  onRequestBackup,
}: EmergencyActionButtonsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <button
        onClick={onReportEmergency}
        className="flex items-center justify-center p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        <BellAlertIcon className="w-5 h-5 mr-2" />
        Report Emergency
      </button>

      <button
        onClick={onRequestBackup}
        className="flex items-center justify-center p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
      >
        <UserGroupIcon className="w-5 h-5 mr-2" />
        Request Backup
      </button>

      <a
        href="tel:911"
        className="flex items-center justify-center p-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
      >
        <PhoneIcon className="w-5 h-5 mr-2" />
        Call 911
      </a>
    </div>
  );
}
