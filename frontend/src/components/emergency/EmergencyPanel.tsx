'use client';

import React, { useState, memo, useCallback, useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  ClockIcon,
  MapPinIcon,
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phoneNumber: string;
  email: string;
  available: boolean;
  priority: number;
}

interface BackupDriver {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  available: boolean;
  proximity: string;
  estimatedArrival: string;
}

interface EmergencyPanelProps {
  onEmergencyReport: (
    type: string,
    description: string,
    urgency: string
  ) => void;
  onRequestBackup: (assignmentId: string, reason: string) => void;
  onContactEmergency: (contactId: string, method: string) => void;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'admin-primary',
    name: 'School Admin',
    role: 'Primary Contact',
    phoneNumber: '(555) 123-4567',
    email: 'admin@school.edu',
    available: true,
    priority: 1,
  },
  {
    id: 'transport-coordinator',
    name: 'Transport Coordinator',
    role: 'Logistics Manager',
    phoneNumber: '(555) 234-5678',
    email: 'transport@school.edu',
    available: true,
    priority: 2,
  },
  {
    id: 'emergency-hotline',
    name: 'Emergency Hotline',
    role: '24/7 Support',
    phoneNumber: '(555) 911-HELP',
    email: 'emergency@school.edu',
    available: true,
    priority: 1,
  },
];

const BACKUP_DRIVERS: BackupDriver[] = [
  {
    id: 'backup-1',
    name: 'Sarah Johnson',
    phoneNumber: '(555) 345-6789',
    email: 'sarah.j@email.com',
    available: true,
    proximity: '0.8 miles',
    estimatedArrival: '7 minutes',
  },
  {
    id: 'backup-2',
    name: 'Mike Chen',
    phoneNumber: '(555) 456-7890',
    email: 'mike.chen@email.com',
    available: true,
    proximity: '1.2 miles',
    estimatedArrival: '10 minutes',
  },
  {
    id: 'backup-3',
    name: 'Lisa Rodriguez',
    phoneNumber: '(555) 567-8901',
    email: 'lisa.r@email.com',
    available: false,
    proximity: '2.1 miles',
    estimatedArrival: '15 minutes',
  },
];

const EMERGENCY_TYPES = [
  { value: 'medical', label: 'Medical Emergency', icon: '🚑', urgency: 'high' },
  {
    value: 'breakdown',
    label: 'Vehicle Breakdown',
    icon: '🔧',
    urgency: 'medium',
  },
  { value: 'accident', label: 'Traffic Accident', icon: '🚗', urgency: 'high' },
  {
    value: 'weather',
    label: 'Weather Emergency',
    icon: '⛈️',
    urgency: 'medium',
  },
  {
    value: 'route_blocked',
    label: 'Route Blocked',
    icon: '🚧',
    urgency: 'medium',
  },
  {
    value: 'late_emergency',
    label: 'Emergency Delay',
    icon: '⏰',
    urgency: 'low',
  },
  { value: 'other', label: 'Other Emergency', icon: '🚨', urgency: 'medium' },
];

export default memo(function EmergencyPanel({
  onEmergencyReport,
  onRequestBackup,
  onContactEmergency,
}: EmergencyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [showBackupRequest, setShowBackupRequest] = useState(false);
  const [selectedEmergencyType, setSelectedEmergencyType] = useState('');
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('medium');
  const [backupReason, setBackupReason] = useState('');

  const handleEmergencySubmit = () => {
    if (selectedEmergencyType && emergencyDescription.trim()) {
      const urgency =
        EMERGENCY_TYPES.find(t => t.value === selectedEmergencyType)?.urgency ||
        'medium';
      onEmergencyReport(selectedEmergencyType, emergencyDescription, urgency);
      setShowEmergencyForm(false);
      setSelectedEmergencyType('');
      setEmergencyDescription('');
    }
  };

  const handleBackupRequest = () => {
    if (backupReason.trim()) {
      onRequestBackup('current-assignment', backupReason);
      setShowBackupRequest(false);
      setBackupReason('');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow-lg">
      <div className="px-4 py-3 border-b border-red-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
            <h3 className="text-lg font-bold text-red-900">Emergency Panel</h3>
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              24/7 Support
            </span>
          </div>
          <div className="text-red-600">{isExpanded ? '−' : '+'}</div>
        </button>
        <p className="text-sm text-red-700 mt-1">
          Quick access to emergency contacts and backup coordination
        </p>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Emergency Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setShowEmergencyForm(true)}
              className="flex items-center justify-center p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <BellAlertIcon className="w-5 h-5 mr-2" />
              Report Emergency
            </button>

            <button
              onClick={() => setShowBackupRequest(true)}
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

          {/* Emergency Contacts */}
          <div>
            <h4 className="text-md font-semibold text-red-900 mb-3 flex items-center">
              <PhoneIcon className="w-5 h-5 mr-2" />
              Emergency Contacts
            </h4>
            <div className="space-y-3">
              {EMERGENCY_CONTACTS.map(contact => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900">
                        {contact.name}
                      </h5>
                      <span className="text-sm text-gray-500">
                        ({contact.role})
                      </span>
                      {contact.priority === 1 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          Priority
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {contact.phoneNumber} • {contact.email}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={`tel:${contact.phoneNumber}`}
                      onClick={() => onContactEmergency(contact.id, 'phone')}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <PhoneIcon className="w-4 h-4" />
                    </a>
                    <a
                      href={`mailto:${contact.email}`}
                      onClick={() => onContactEmergency(contact.id, 'email')}
                      className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <EnvelopeIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Available Backup Drivers */}
          <div>
            <h4 className="text-md font-semibold text-red-900 mb-3 flex items-center">
              <UserGroupIcon className="w-5 h-5 mr-2" />
              Available Backup Drivers
            </h4>
            <div className="space-y-3">
              {BACKUP_DRIVERS.map(driver => (
                <div
                  key={driver.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    driver.available
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200 opacity-75'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900">
                        {driver.name}
                      </h5>
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
                      >
                        <PhoneIcon className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-900 mb-2">
              🚨 Emergency Guidelines
            </h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>Life-threatening emergencies:</strong> Call 911
                immediately
              </li>
              <li>
                • <strong>Vehicle issues:</strong> Pull over safely, then report
                emergency
              </li>
              <li>
                • <strong>Medical situations:</strong> Contact emergency
                services first, then admin
              </li>
              <li>
                • <strong>Route problems:</strong> Use backup request to get
                immediate help
              </li>
              <li>
                • <strong>Always communicate:</strong> Keep passengers and
                parents informed
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Emergency Report Modal */}
      {showEmergencyForm && (
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
                onChange={e => setSelectedEmergencyType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select emergency type...</option>
                {EMERGENCY_TYPES.map(type => (
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
                onChange={e => setEmergencyDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={4}
                placeholder="Describe the emergency situation, your current location, and immediate needs..."
                required
              />
            </div>

            {selectedEmergencyType && (
              <div className="mb-4">
                <div className="text-sm text-gray-700">
                  <strong>Urgency Level:</strong>
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(
                      EMERGENCY_TYPES.find(
                        t => t.value === selectedEmergencyType
                      )?.urgency || 'medium'
                    )}`}
                  >
                    {EMERGENCY_TYPES.find(
                      t => t.value === selectedEmergencyType
                    )?.urgency?.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleEmergencySubmit}
                disabled={
                  !selectedEmergencyType || !emergencyDescription.trim()
                }
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Emergency Report
              </button>
              <button
                onClick={() => setShowEmergencyForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Request Modal */}
      {showBackupRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <UserGroupIcon className="w-5 h-5 text-orange-600 mr-2" />
              Request Backup Driver
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for backup request *
              </label>
              <textarea
                value={backupReason}
                onChange={e => setBackupReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                rows={3}
                placeholder="Explain why you need backup assistance (e.g., vehicle issue, family emergency, running late)..."
                required
              />
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800">
                <strong>Note:</strong> Backup drivers will be automatically
                notified and can respond within minutes. You'll receive
                confirmation once a backup is assigned.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBackupRequest}
                disabled={!backupReason.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Request Backup
              </button>
              <button
                onClick={() => setShowBackupRequest(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
