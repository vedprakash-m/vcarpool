/**
 * EmergencyContactsList component for the emergency panel
 * Displays available emergency contacts with communication options
 */

import React from 'react';
import {
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { EmergencyContact } from '@/hooks/useEmergencyData';

interface EmergencyContactsListProps {
  contacts: EmergencyContact[];
  onContactEmergency: (contactId: string, method: string) => void;
}

export function EmergencyContactsList({
  contacts,
  onContactEmergency,
}: EmergencyContactsListProps) {
  return (
    <div>
      <h4 className="text-md font-semibold text-red-900 mb-3 flex items-center">
        <PhoneIcon className="w-5 h-5 mr-2" />
        Emergency Contacts
      </h4>
      <div className="space-y-3">
        {contacts.map(contact => (
          <div
            key={contact.id}
            className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h5 className="font-medium text-gray-900">{contact.name}</h5>
                <span className="text-sm text-gray-500">({contact.role})</span>
                <div
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    contact.available
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {contact.available ? (
                    <CheckCircleIcon className="w-3 h-3" />
                  ) : (
                    <XCircleIcon className="w-3 h-3" />
                  )}
                  <span>{contact.available ? 'Available' : 'Busy'}</span>
                </div>
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
                title="Call contact"
              >
                <PhoneIcon className="w-4 h-4" />
              </a>
              <a
                href={`mailto:${contact.email}`}
                onClick={() => onContactEmergency(contact.id, 'email')}
                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                title="Email contact"
              >
                <EnvelopeIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
