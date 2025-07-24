/**
 * EmergencyGuidelines component for the emergency panel
 * Displays safety guidelines and procedures for emergency situations
 */

import React from 'react';

export function EmergencyGuidelines() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h5 className="text-sm font-medium text-blue-900 mb-2">
        🚨 Emergency Guidelines
      </h5>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>
          • <strong>Life-threatening emergencies:</strong> Call 911 immediately
        </li>
        <li>
          • <strong>Vehicle issues:</strong> Pull over safely, then report
          emergency
        </li>
        <li>
          • <strong>Medical situations:</strong> Contact emergency services
          first, then admin
        </li>
        <li>
          • <strong>Route problems:</strong> Use backup request to get immediate
          help
        </li>
        <li>
          • <strong>Always communicate:</strong> Keep passengers and parents
          informed
        </li>
      </ul>
    </div>
  );
}
