'use client';

import React, { useState } from 'react';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface SafetyReportFormProps {
  groupId: string;
  userId?: string;
  onReportSubmitted: (reportId: string) => void;
  onCancel?: () => void;
}

interface SafetyReportData {
  reportType: string;
  description: string;
  severity: string;
  isAnonymous: boolean;
  driverId?: string;
  incidentDate?: string;
}

/**
 * Safety Report Form Component
 * Implements PRD requirements for anonymous safety reporting
 * Following tech spec: Client-side form with backend validation
 */
export const SafetyReportForm: React.FC<SafetyReportFormProps> = ({
  groupId,
  userId,
  onReportSubmitted,
  onCancel,
}) => {
  const [formData, setFormData] = useState<SafetyReportData>({
    reportType: '',
    description: '',
    severity: 'medium',
    isAnonymous: false,
    driverId: '',
    incidentDate: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportTypes = [
    {
      value: 'vehicle_safety',
      label: 'Vehicle Safety Concern',
      description:
        'Issues with vehicle condition, safety equipment, or maintenance',
    },
    {
      value: 'driving_behavior',
      label: 'Driving Behavior',
      description:
        'Concerns about driving speed, phone use, or other unsafe practices',
    },
    {
      value: 'child_safety',
      label: 'Child Safety',
      description:
        'Issues related to child supervision, pickup procedures, or behavior',
    },
    {
      value: 'emergency',
      label: 'Emergency Situation',
      description: 'Immediate safety concerns requiring urgent attention',
    },
    {
      value: 'other',
      label: 'Other Safety Concern',
      description: 'Any other safety-related issue not covered above',
    },
  ];

  const severityLevels = [
    {
      value: 'low',
      label: 'Low',
      description: 'Minor concern, can be addressed in next review',
      color: 'text-green-600',
    },
    {
      value: 'medium',
      label: 'Medium',
      description: 'Moderate concern, should be addressed within 24 hours',
      color: 'text-yellow-600',
    },
    {
      value: 'high',
      label: 'High',
      description: 'Serious concern, needs immediate Group Admin attention',
      color: 'text-orange-600',
    },
    {
      value: 'critical',
      label: 'Critical',
      description: 'Immediate safety risk, auto-escalated to Super Admin',
      color: 'text-red-600',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validation
      if (!formData.reportType) {
        throw new Error('Please select a report type');
      }

      if (formData.description.trim().length < 10) {
        throw new Error(
          'Please provide a detailed description (at least 10 characters)'
        );
      }

      // Submit to backend
      const response = await fetch('/api/safety-reporting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId,
          reporterUserId: formData.isAnonymous ? null : userId,
          ...formData,
          description: formData.description.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit safety report');
      }

      const result = await response.json();
      onReportSubmitted(result.reportId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (
    field: keyof SafetyReportData,
    value: string | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center">
          <ShieldCheckIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Safety Report</h2>
            <p className="text-gray-600">
              Help us maintain a safe carpool environment
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Anonymous Option */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={formData.isAnonymous}
              onChange={e => updateFormData('isAnonymous', e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div>
              <div className="font-medium text-blue-900">
                Submit anonymously
              </div>
              <div className="text-sm text-blue-700">
                Your identity will not be shared with the Group Admin. Anonymous
                reports still receive full attention.
              </div>
            </div>
          </label>
        </div>

        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What type of safety concern is this? *
          </label>
          <div className="space-y-3">
            {reportTypes.map(type => (
              <label
                key={type.value}
                className="flex items-start space-x-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="reportType"
                  value={type.value}
                  checked={formData.reportType === type.value}
                  onChange={e => updateFormData('reportType', e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-500">
                    {type.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Severity Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Severity Level *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {severityLevels.map(level => (
              <label
                key={level.value}
                className="flex items-start space-x-3 cursor-pointer border border-gray-200 rounded-lg p-3 hover:border-gray-300"
              >
                <input
                  type="radio"
                  name="severity"
                  value={level.value}
                  checked={formData.severity === level.value}
                  onChange={e => updateFormData('severity', e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="flex-1">
                  <div className={`font-medium ${level.color}`}>
                    {level.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {level.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Incident Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            When did this occur?
          </label>
          <input
            type="date"
            value={formData.incidentDate}
            onChange={e => updateFormData('incidentDate', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="input-field"
          />
          <p className="text-sm text-gray-500 mt-1">
            Leave blank if this is an ongoing concern
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detailed Description *
          </label>
          <textarea
            value={formData.description}
            onChange={e => updateFormData('description', e.target.value)}
            placeholder="Please provide specific details about the safety concern. Include what happened, when, and any relevant context that would help address the issue."
            rows={6}
            className="input-field"
            minLength={10}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {formData.description.length}/500 characters (minimum 10 required)
          </p>
        </div>

        {/* Critical Report Warning */}
        {formData.severity === 'critical' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
              <div>
                <h3 className="font-medium text-red-900">
                  Critical Report Notice
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Critical safety reports are automatically escalated to the
                  Super Admin for immediate review. You may also want to contact
                  emergency services if there is immediate danger.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">* Required fields</div>
          <div className="flex space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn-outline"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.reportType ||
                formData.description.trim().length < 10
              }
              className="btn-primary"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Safety Report'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SafetyReportForm;
