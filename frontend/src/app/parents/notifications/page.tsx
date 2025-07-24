'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  BellIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface NotificationSettings {
  emailNotifications: boolean;
  swapRequestCreated: boolean;
  swapRequestResponded: boolean;
  assignmentReminder24h: boolean;
  assignmentReminder2h: boolean;
  assignmentChanges: boolean;
  weeklySchedule: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  emailNotifications: true,
  swapRequestCreated: true,
  swapRequestResponded: true,
  assignmentReminder24h: true,
  assignmentReminder2h: true,
  assignmentChanges: true,
  weeklySchedule: false,
};

export default function NotificationPreferencesPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  const [settings, setSettings] =
    useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Authentication check
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      router.push('/login');
      return;
    }

    if (!isLoading && user?.role !== 'parent' && user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Load notification settings
  useEffect(() => {
    if (user?.id) {
      loadNotificationSettings();
    }
  }, [user?.id]);

  const loadNotificationSettings = async () => {
    setIsLoadingSettings(true);
    try {
      // In production, this would load from an API
      // For now, use default settings
      setSettings(DEFAULT_SETTINGS);
    } catch (err) {
      setError('Failed to load notification settings');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSettingChange = (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // In production, this would save to an API
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setLastSaved(new Date());
    } catch (err) {
      setError('Failed to save notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Notification Preferences
              </h1>
              <p className="text-gray-600">
                Manage your email notification settings for carpool activities.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <XCircleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {lastSaved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  Settings saved successfully at{' '}
                  {lastSaved.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <BellIcon className="h-6 w-6 text-gray-400 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">
                Email Notifications
              </h2>
            </div>
          </div>

          <div className="p-6">
            {isLoadingSettings ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading settings...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Master Toggle */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Email Notifications
                      </h3>
                      <p className="text-sm text-gray-600">
                        Enable or disable all email notifications
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleSettingChange(
                        'emailNotifications',
                        !settings.emailNotifications
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.emailNotifications
                        ? 'bg-green-600'
                        : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.emailNotifications
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Individual Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Swap Request Notifications
                  </h4>

                  <div className="space-y-3 ml-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-800">
                          New Swap Requests
                        </h5>
                        <p className="text-sm text-gray-600">
                          Notify me when someone requests to swap assignments
                          with me
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleSettingChange(
                            'swapRequestCreated',
                            !settings.swapRequestCreated
                          )
                        }
                        disabled={!settings.emailNotifications}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.swapRequestCreated &&
                          settings.emailNotifications
                            ? 'bg-green-600'
                            : 'bg-gray-200'
                        } ${
                          !settings.emailNotifications
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.swapRequestCreated &&
                            settings.emailNotifications
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-800">
                          Swap Request Responses
                        </h5>
                        <p className="text-sm text-gray-600">
                          Notify me when someone accepts or declines my swap
                          request
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleSettingChange(
                            'swapRequestResponded',
                            !settings.swapRequestResponded
                          )
                        }
                        disabled={!settings.emailNotifications}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.swapRequestResponded &&
                          settings.emailNotifications
                            ? 'bg-green-600'
                            : 'bg-gray-200'
                        } ${
                          !settings.emailNotifications
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.swapRequestResponded &&
                            settings.emailNotifications
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Assignment Reminders
                  </h4>

                  <div className="space-y-3 ml-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-800">
                          24 Hour Reminders
                        </h5>
                        <p className="text-sm text-gray-600">
                          Remind me 24 hours before my carpool assignments
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleSettingChange(
                            'assignmentReminder24h',
                            !settings.assignmentReminder24h
                          )
                        }
                        disabled={!settings.emailNotifications}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.assignmentReminder24h &&
                          settings.emailNotifications
                            ? 'bg-green-600'
                            : 'bg-gray-200'
                        } ${
                          !settings.emailNotifications
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.assignmentReminder24h &&
                            settings.emailNotifications
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-800">
                          2 Hour Reminders
                        </h5>
                        <p className="text-sm text-gray-600">
                          Remind me 2 hours before my carpool assignments
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleSettingChange(
                            'assignmentReminder2h',
                            !settings.assignmentReminder2h
                          )
                        }
                        disabled={!settings.emailNotifications}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.assignmentReminder2h &&
                          settings.emailNotifications
                            ? 'bg-green-600'
                            : 'bg-gray-200'
                        } ${
                          !settings.emailNotifications
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.assignmentReminder2h &&
                            settings.emailNotifications
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Other Notifications
                  </h4>

                  <div className="space-y-3 ml-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-800">
                          Assignment Changes
                        </h5>
                        <p className="text-sm text-gray-600">
                          Notify me when my assignments are modified by admin
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleSettingChange(
                            'assignmentChanges',
                            !settings.assignmentChanges
                          )
                        }
                        disabled={!settings.emailNotifications}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.assignmentChanges &&
                          settings.emailNotifications
                            ? 'bg-green-600'
                            : 'bg-gray-200'
                        } ${
                          !settings.emailNotifications
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.assignmentChanges &&
                            settings.emailNotifications
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-800">
                          Weekly Schedule Summary
                        </h5>
                        <p className="text-sm text-gray-600">
                          Send me a weekly summary of my upcoming assignments
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleSettingChange(
                            'weeklySchedule',
                            !settings.weeklySchedule
                          )
                        }
                        disabled={!settings.emailNotifications}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.weeklySchedule && settings.emailNotifications
                            ? 'bg-green-600'
                            : 'bg-gray-200'
                        } ${
                          !settings.emailNotifications
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.weeklySchedule &&
                            settings.emailNotifications
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                About Email Notifications
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Notifications are sent to your registered email address:{' '}
                  <strong>{user?.email}</strong>
                </li>
                <li>
                  • You can update your email address in your profile settings
                </li>
                <li>
                  • Critical notifications (like last-minute assignment changes)
                  may still be sent even if disabled
                </li>
                <li>• Changes to these preferences take effect immediately</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
