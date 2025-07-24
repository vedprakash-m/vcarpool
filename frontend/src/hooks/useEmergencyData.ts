/**
 * Custom hook for managing emergency panel data and state
 * Handles emergency reporting, backup requests, and contact management
 */

import { useState, useCallback } from 'react';

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

interface EmergencyType {
  value: string;
  label: string;
  icon: string;
  urgency: string;
}

interface UseEmergencyDataProps {
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

const EMERGENCY_TYPES: EmergencyType[] = [
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

export function useEmergencyData({
  onEmergencyReport,
  onRequestBackup,
  onContactEmergency,
}: UseEmergencyDataProps) {
  // UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [showBackupRequest, setShowBackupRequest] = useState(false);

  // Form State
  const [selectedEmergencyType, setSelectedEmergencyType] = useState('');
  const [emergencyDescription, setEmergencyDescription] = useState('');
  const [backupReason, setBackupReason] = useState('');

  // Handlers
  const handleEmergencySubmit = useCallback(() => {
    if (selectedEmergencyType && emergencyDescription.trim()) {
      const urgency =
        EMERGENCY_TYPES.find(t => t.value === selectedEmergencyType)?.urgency ||
        'medium';
      onEmergencyReport(selectedEmergencyType, emergencyDescription, urgency);
      setShowEmergencyForm(false);
      setSelectedEmergencyType('');
      setEmergencyDescription('');
    }
  }, [selectedEmergencyType, emergencyDescription, onEmergencyReport]);

  const handleBackupRequest = useCallback(() => {
    if (backupReason.trim()) {
      onRequestBackup('current-assignment', backupReason);
      setShowBackupRequest(false);
      setBackupReason('');
    }
  }, [backupReason, onRequestBackup]);

  const handleContactEmergency = useCallback(
    (contactId: string, method: string) => {
      onContactEmergency(contactId, method);
    },
    [onContactEmergency]
  );

  // Utility functions
  const getUrgencyColor = useCallback((urgency: string) => {
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
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const showEmergencyReportForm = useCallback(() => {
    setShowEmergencyForm(true);
  }, []);

  const hideEmergencyReportForm = useCallback(() => {
    setShowEmergencyForm(false);
    setSelectedEmergencyType('');
    setEmergencyDescription('');
  }, []);

  const showBackupRequestForm = useCallback(() => {
    setShowBackupRequest(true);
  }, []);

  const hideBackupRequestForm = useCallback(() => {
    setShowBackupRequest(false);
    setBackupReason('');
  }, []);

  return {
    // Data
    emergencyContacts: EMERGENCY_CONTACTS,
    backupDrivers: BACKUP_DRIVERS,
    emergencyTypes: EMERGENCY_TYPES,

    // UI State
    isExpanded,
    showEmergencyForm,
    showBackupRequest,

    // Form State
    selectedEmergencyType,
    emergencyDescription,
    backupReason,

    // State Setters
    setSelectedEmergencyType,
    setEmergencyDescription,
    setBackupReason,

    // Handlers
    handleEmergencySubmit,
    handleBackupRequest,
    handleContactEmergency,

    // UI Controls
    toggleExpanded,
    showEmergencyReportForm,
    hideEmergencyReportForm,
    showBackupRequestForm,
    hideBackupRequestForm,

    // Utilities
    getUrgencyColor,
  };
}

export type { EmergencyContact, BackupDriver, EmergencyType };
