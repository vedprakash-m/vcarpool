'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { TruckIcon as CarIcon } from '@heroicons/react/24/outline';

interface DayPreference {
  canDrive: boolean;
  preferredRole: 'driver' | 'passenger' | 'either' | 'unavailable';
  timeConstraints?: {
    earliestPickup?: string;
    latestDropoff?: string;
  };
  maxPassengers?: number;
  notes?: string;
}

interface WeeklyPreferences {
  id?: string;
  scheduleId: string;
  drivingAvailability: {
    monday: DayPreference;
    tuesday: DayPreference;
    wednesday: DayPreference;
    thursday: DayPreference;
    friday: DayPreference;
  };
  specialRequests?: string;
  emergencyContact?: string;
  submittedAt?: string;
  isLateSubmission?: boolean;
}

interface WeeklySchedule {
  id: string;
  groupId: string;
  group: {
    name: string;
    targetSchool: { name: string };
  };
  weekStartDate: string;
  weekEndDate: string;
  status: string;
  preferencesDeadline: string;
  swapsDeadline: string;
}

export default function WeeklyPreferencesPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] =
    useState<WeeklySchedule | null>(null);
  const [preferences, setPreferences] = useState<WeeklyPreferences>({
    scheduleId: '',
    drivingAvailability: {
      monday: { canDrive: false, preferredRole: 'either' },
      tuesday: { canDrive: false, preferredRole: 'either' },
      wednesday: { canDrive: false, preferredRole: 'either' },
      thursday: { canDrive: false, preferredRole: 'either' },
      friday: { canDrive: false, preferredRole: 'either' },
    },
    specialRequests: '',
    emergencyContact: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  const daysOfWeek = [
    { key: 'monday', label: 'Monday', date: '' },
    { key: 'tuesday', label: 'Tuesday', date: '' },
    { key: 'wednesday', label: 'Wednesday', date: '' },
    { key: 'thursday', label: 'Thursday', date: '' },
    { key: 'friday', label: 'Friday', date: '' },
  ];

  // Redirect if not parent
  useEffect(() => {
    if (
      !isLoading &&
      (!user || (user.role !== 'parent' && user.role !== 'trip_admin'))
    ) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Load available schedules and existing preferences
  useEffect(() => {
    if (user) {
      loadSchedules();
    }
  }, [user]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch(
        '/api/admin/weekly-scheduling?action=schedules&status=preferences_open',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.data.schedules || []);

        if (data.data.schedules.length > 0) {
          const firstSchedule = data.data.schedules[0];
          setSelectedSchedule(firstSchedule);
          setPreferences(prev => ({ ...prev, scheduleId: firstSchedule.id }));
          loadExistingPreferences(firstSchedule.id);
        }
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to load weekly schedules',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error loading schedules',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExistingPreferences = async (scheduleId: string) => {
    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch(
        `/api/admin/weekly-scheduling?action=my-preferences&scheduleId=${scheduleId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data.preferences) {
          setPreferences(data.data.preferences);
          setMessage({
            type: 'info',
            text: `Preferences already submitted${
              data.data.preferences.isLateSubmission ? ' (late submission)' : ''
            }. You can update them below.`,
          });
        }
      }
    } catch (error) {
      console.error('Error loading existing preferences:', error);
    }
  };

  const updateDayPreference = (
    day: string,
    field: keyof DayPreference,
    value: any
  ) => {
    setPreferences(prev => ({
      ...prev,
      drivingAvailability: {
        ...prev.drivingAvailability,
        [day]: {
          ...prev.drivingAvailability[
            day as keyof typeof prev.drivingAvailability
          ],
          [field]: value,
        },
      },
    }));
  };

  const handleScheduleChange = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      setSelectedSchedule(schedule);
      setPreferences(prev => ({ ...prev, scheduleId }));
      loadExistingPreferences(scheduleId);
    }
  };

  const isDeadlinePassed = (deadline: string) => {
    return new Date() > new Date(deadline);
  };

  const getDeadlineStatus = () => {
    if (!selectedSchedule) return null;

    const deadline = new Date(selectedSchedule.preferencesDeadline);
    const now = new Date();
    const hoursUntilDeadline =
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeadline < 0) {
      return {
        type: 'error',
        message: 'Deadline has passed - submissions at Group Admin discretion',
      };
    } else if (hoursUntilDeadline < 24) {
      return {
        type: 'warning',
        message: `Deadline in ${Math.round(hoursUntilDeadline)} hours`,
      };
    } else {
      return {
        type: 'info',
        message: `Deadline: ${deadline.toLocaleDateString()} at ${deadline.toLocaleTimeString()}`,
      };
    }
  };

  const validatePreferences = () => {
    const errors = [];

    // Check if at least one day has availability
    const hasAvailability = Object.values(preferences.drivingAvailability).some(
      day => day.preferredRole !== 'unavailable'
    );

    if (!hasAvailability) {
      errors.push('Please indicate availability for at least one day');
    }

    // Check driving days have passenger capacity
    Object.entries(preferences.drivingAvailability).forEach(
      ([day, dayPref]) => {
        if (
          dayPref.canDrive &&
          dayPref.preferredRole === 'driver' &&
          !dayPref.maxPassengers
        ) {
          errors.push(
            `${day}: Please specify maximum passengers when willing to drive`
          );
        }
      }
    );

    return errors;
  };

  const submitPreferences = async () => {
    const errors = validatePreferences();
    if (errors.length > 0) {
      setMessage({
        type: 'error',
        text: errors.join('. '),
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch(
        '/api/admin/weekly-scheduling?action=submit-preferences',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scheduleId: preferences.scheduleId,
            drivingAvailability: preferences.drivingAvailability,
            specialRequests: preferences.specialRequests,
            emergencyContact: preferences.emergencyContact,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: data.data.message,
        });

        // Refresh to show updated status
        if (selectedSchedule) {
          loadExistingPreferences(selectedSchedule.id);
        }
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.error.message,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error submitting preferences',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getFormattedWeekDates = () => {
    if (!selectedSchedule) return daysOfWeek;

    const startDate = new Date(selectedSchedule.weekStartDate);
    return daysOfWeek.map((day, index) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + index);
      return {
        ...day,
        date: date.toLocaleDateString(),
      };
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'parent' && user.role !== 'trip_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You must be a parent to access this page.
          </p>
        </div>
      </div>
    );
  }

  const deadlineStatus = getDeadlineStatus();
  const weekDates = getFormattedWeekDates();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="h-8 w-8 mr-3 text-blue-600" />
            Weekly Driving Preferences
          </h1>
          <p className="text-gray-600 mt-2">
            Submit your driving availability and preferences for the upcoming
            week
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-md border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : message.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : message.type === 'info'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center">
              {message.type === 'success' && (
                <CheckCircleIcon className="h-5 w-5 mr-2" />
              )}
              {message.type === 'warning' && (
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              )}
              {message.type === 'info' && (
                <InformationCircleIcon className="h-5 w-5 mr-2" />
              )}
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        )}

        {/* Schedule Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Select Week
          </h2>

          {loading ? (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-300 rounded w-full"></div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Open Preference Periods
              </h3>
              <p className="text-gray-600">
                There are currently no weeks open for preference submission.
              </p>
            </div>
          ) : (
            <div>
              <select
                value={selectedSchedule?.id || ''}
                onChange={e => handleScheduleChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {schedules.map(schedule => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.group.name} - Week of{' '}
                    {formatDate(schedule.weekStartDate)} (
                    {schedule.group.targetSchool.name})
                  </option>
                ))}
              </select>

              {deadlineStatus && (
                <div
                  className={`mt-3 p-3 rounded-md ${
                    deadlineStatus.type === 'error'
                      ? 'bg-red-50 text-red-800'
                      : deadlineStatus.type === 'warning'
                        ? 'bg-yellow-50 text-yellow-800'
                        : 'bg-blue-50 text-blue-800'
                  }`}
                >
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">
                      {deadlineStatus.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Daily Preferences */}
        {selectedSchedule && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Daily Availability
            </h2>

            <div className="space-y-6">
              {weekDates.map(day => {
                const dayPref =
                  preferences.drivingAvailability[
                    day.key as keyof typeof preferences.drivingAvailability
                  ];

                return (
                  <div
                    key={day.key}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {day.label}
                        <span className="text-sm text-gray-500 ml-2">
                          ({day.date})
                        </span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Preferred Role */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preferred Role
                        </label>
                        <select
                          value={dayPref.preferredRole}
                          onChange={e =>
                            updateDayPreference(
                              day.key,
                              'preferredRole',
                              e.target.value
                            )
                          }
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="either">
                            Either Driver or Passenger
                          </option>
                          <option value="driver">Prefer to Drive</option>
                          <option value="passenger">
                            Prefer to be Passenger
                          </option>
                          <option value="unavailable">Unavailable</option>
                        </select>
                      </div>

                      {/* Can Drive Toggle */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Can Drive
                        </label>
                        <div className="flex items-center h-10">
                          <input
                            type="checkbox"
                            checked={dayPref.canDrive}
                            onChange={e =>
                              updateDayPreference(
                                day.key,
                                'canDrive',
                                e.target.checked
                              )
                            }
                            disabled={dayPref.preferredRole === 'unavailable'}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            <CarIcon className="h-4 w-4 inline mr-1" />
                            Available to drive
                          </span>
                        </div>
                      </div>

                      {/* Max Passengers */}
                      {dayPref.canDrive && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Passengers
                          </label>
                          <select
                            value={dayPref.maxPassengers || ''}
                            onChange={e =>
                              updateDayPreference(
                                day.key,
                                'maxPassengers',
                                parseInt(e.target.value)
                              )
                            }
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select...</option>
                            <option value="1">1 passenger</option>
                            <option value="2">2 passengers</option>
                            <option value="3">3 passengers</option>
                            <option value="4">4 passengers</option>
                          </select>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="md:col-span-2 lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={dayPref.notes || ''}
                          onChange={e =>
                            updateDayPreference(
                              day.key,
                              'notes',
                              e.target.value
                            )
                          }
                          placeholder="Any special constraints..."
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Additional Information */}
        {selectedSchedule && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Additional Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={preferences.emergencyContact || ''}
                  onChange={e =>
                    setPreferences(prev => ({
                      ...prev,
                      emergencyContact: e.target.value,
                    }))
                  }
                  placeholder="Emergency contact number"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requests
                </label>
                <textarea
                  value={preferences.specialRequests || ''}
                  onChange={e =>
                    setPreferences(prev => ({
                      ...prev,
                      specialRequests: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Any special requests or constraints..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {selectedSchedule && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Submit Preferences
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  You can update your preferences until the deadline
                </p>
              </div>

              <button
                onClick={submitPreferences}
                disabled={submitting || !selectedSchedule}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Submit Preferences
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
