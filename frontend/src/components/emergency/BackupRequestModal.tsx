/**
 * BackupRequestModal component for the emergency panel
 * Modal form for requesting backup driver assistance
 */

import React from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';

interface BackupRequestModalProps {
  isVisible: boolean;
  backupReason: string;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function BackupRequestModal({
  isVisible,
  backupReason,
  onReasonChange,
  onSubmit,
  onCancel,
}: BackupRequestModalProps) {
  if (!isVisible) return null;

  const canSubmit = backupReason.trim();

  return (
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
            onChange={e => onReasonChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            rows={3}
            placeholder="Explain why you need backup assistance (e.g., vehicle issue, family emergency, running late)..."
            required
          />
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-800">
            <strong>Note:</strong> Backup drivers will be automatically notified
            and can respond within minutes. You'll receive confirmation once a
            backup is assigned.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Request Backup
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
