/**
 * EmergencyReportModal component for the emergency panel
 * Modal form for reporting emergency situations
 */

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { EmergencyType } from '@/hooks/useEmergencyData';

interface EmergencyReportModalProps {
  isVisible: boolean;
  selectedEmergencyType: string;
  emergencyDescription: string;
  emergencyTypes: EmergencyType[];
  onTypeChange: (type: string) => void;
  onDescriptionChange: (description: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  getUrgencyColor: (urgency: string) => string;
}

export function EmergencyReportModal({
  isVisible,
  selectedEmergencyType,
  emergencyDescription,
  emergencyTypes,
  onTypeChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
  getUrgencyColor,
}: EmergencyReportModalProps) {
  if (!isVisible) return null;

  const canSubmit = selectedEmergencyType && emergencyDescription.trim();
  const selectedType = emergencyTypes.find(
    t => t.value === selectedEmergencyType
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
          Report Emergency
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Emergency Type *
          </label>
          <select
            value={selectedEmergencyType}
            onChange={e => onTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">Select emergency type...</option>
            {emergencyTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={emergencyDescription}
            onChange={e => onDescriptionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows={4}
            placeholder="Describe the emergency situation, your current location, and immediate needs..."
            required
          />
        </div>

        {selectedType && (
          <div className="mb-4">
            <div className="text-sm text-gray-700">
              <strong>Urgency Level:</strong>
              <span
                className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(
                  selectedType.urgency
                )}`}
              >
                {selectedType.urgency.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Emergency Report
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
