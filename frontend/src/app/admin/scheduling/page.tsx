'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  CalendarIcon,
  UsersIcon,
  AdjustmentsHorizontalIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface WeeklySchedule {
  id: string;
  groupId: string;
  group: {
    name: string;
    targetSchool: { name: string };
  };
  weekStartDate: string;
  weekEndDate: string;
  status:
    | 'preferences_open'
    | 'preferences_closed'
    | 'scheduling'
    | 'swaps_open'
    | 'finalized'
    | 'active'
    | 'completed';
  preferencesDeadline: string;
  swapsDeadline: string;
  assignments: any[];
  createdAt: string;
}

interface SchedulingStats {
  totalPreferences: number;
  submissionRate: number;
  averageMatchScore: number;
  conflicts: number;
}

export default function SchedulingDashboardPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] =
    useState<WeeklySchedule | null>(null);
  const [stats, setStats] = useState<SchedulingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // New schedule form
  const [showNewScheduleForm, setShowNewScheduleForm] = useState(false);
  const [newScheduleData, setNewScheduleData] = useState({
    groupId: 'group-1', // Default to first group
    weekStartDate: '',
  });

  // Redirect if not Group Admin
  useEffect(() => {
    if (
      !isLoading &&
      (!user || (user.role !== 'group_admin' && user.role !== 'admin'))
    ) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

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
        '/api/admin/weekly-scheduling?action=schedules&limit=20',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.data.schedules || []);

        if (data.data.schedules.length > 0 && !selectedSchedule) {
          setSelectedSchedule(data.data.schedules[0]);
        }
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to load schedules',
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

  const createNewSchedule = async () => {
    if (!newScheduleData.weekStartDate) {
      setMessage({
        type: 'error',
        text: 'Please select a week start date',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch(
        '/api/admin/weekly-scheduling?action=create-schedule',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newScheduleData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: 'Weekly schedule created successfully',
        });
        setShowNewScheduleForm(false);
        setNewScheduleData({ groupId: 'group-1', weekStartDate: '' });
        loadSchedules();
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
        text: 'Error creating schedule',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAssignments = async (forceRegenerate = false) => {
    if (!selectedSchedule) return;

    setGenerating(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch(
        '/api/admin/weekly-scheduling?action=generate-assignments',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scheduleId: selectedSchedule.id,
            forceRegenerate,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: data.data.message,
        });

        // Update the selected schedule with new assignments
        const updatedSchedule = data.data.schedule;
        setSelectedSchedule(updatedSchedule);

        // Update schedules list
        setSchedules(prev =>
          prev.map(s => (s.id === updatedSchedule.id ? updatedSchedule : s))
        );

        // Set stats from algorithm output
        if (data.data.algorithmOutput) {
          setStats({
            totalPreferences: data.data.algorithmOutput.assignments.length,
            submissionRate:
              data.data.algorithmOutput.algorithmStats
                .preferenceSatisfactionRate,
            averageMatchScore:
              data.data.algorithmOutput.algorithmStats.totalScore,
            conflicts: data.data.algorithmOutput.conflicts.length,
          });
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
        text: 'Error generating assignments',
      });
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      preferences_open: {
        color: 'bg-blue-100 text-blue-800',
        icon: ClockIcon,
        label: 'Preferences Open',
      },
      preferences_closed: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: ExclamationTriangleIcon,
        label: 'Preferences Closed',
      },
      scheduling: {
        color: 'bg-purple-100 text-purple-800',
        icon: AdjustmentsHorizontalIcon,
        label: 'Scheduling',
      },
      swaps_open: {
        color: 'bg-green-100 text-green-800',
        icon: ArrowPathIcon,
        label: 'Swaps Open',
      },
      finalized: {
        color: 'bg-green-100 text-green-800',
        icon: CheckCircleIcon,
        label: 'Finalized',
      },
      active: {
        color: 'bg-indigo-100 text-indigo-800',
        icon: PlayIcon,
        label: 'Active',
      },
      completed: {
        color: 'bg-gray-100 text-gray-800',
        icon: CheckCircleIcon,
        label: 'Completed',
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.preferences_open;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getNextMonday = () => {
    const today = new Date();
    const nextMonday = new Date(today);
    const daysUntilMonday = (8 - today.getDay()) % 7;
    nextMonday.setDate(
      today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday)
    );
    return nextMonday.toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'group_admin' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You must be a Group Admin to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <AdjustmentsHorizontalIcon className="h-8 w-8 mr-3 text-blue-600" />
                Weekly Scheduling Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Manage weekly schedules, preferences, and assignments
              </p>
            </div>

            <button
              onClick={() => setShowNewScheduleForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              New Schedule
            </button>
          </div>
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
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* New Schedule Modal */}
        {showNewScheduleForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Weekly Schedule
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Week Start Date (Monday)
                    </label>
                    <input
                      type="date"
                      value={newScheduleData.weekStartDate}
                      min={getNextMonday()}
                      onChange={e =>
                        setNewScheduleData(prev => ({
                          ...prev,
                          weekStartDate: e.target.value,
                        }))
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowNewScheduleForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNewSchedule}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Schedule'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Schedules List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Recent Schedules
                </h2>
              </div>

              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-6">
                    <div className="animate-pulse space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-300 rounded"></div>
                      ))}
                    </div>
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="p-6 text-center">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Schedules
                    </h3>
                    <p className="text-gray-600">
                      Create your first weekly schedule to get started.
                    </p>
                  </div>
                ) : (
                  schedules.map(schedule => (
                    <div
                      key={schedule.id}
                      onClick={() => setSelectedSchedule(schedule)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedSchedule?.id === schedule.id
                          ? 'bg-blue-50 border-r-4 border-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          Week of {formatDate(schedule.weekStartDate)}
                        </h3>
                        {getStatusBadge(schedule.status)}
                      </div>
                      <p className="text-xs text-gray-600">
                        {schedule.group.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {schedule.group.targetSchool.name}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Schedule Details */}
          <div className="lg:col-span-2">
            {selectedSchedule ? (
              <div className="space-y-6">
                {/* Schedule Overview */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {selectedSchedule.group.name}
                      </h2>
                      <p className="text-gray-600">
                        Week of {formatDate(selectedSchedule.weekStartDate)} -{' '}
                        {formatDate(selectedSchedule.weekEndDate)}
                      </p>
                    </div>
                    {getStatusBadge(selectedSchedule.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Preferences Deadline
                      </h4>
                      <p className="text-sm text-gray-900">
                        {formatDateTime(selectedSchedule.preferencesDeadline)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Swaps Deadline
                      </h4>
                      <p className="text-sm text-gray-900">
                        {formatDateTime(selectedSchedule.swapsDeadline)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                {stats && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <ChartBarIcon className="h-5 w-5 mr-2" />
                      Scheduling Statistics
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.totalPreferences}
                        </div>
                        <div className="text-sm text-gray-600">
                          Total Assignments
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {stats.submissionRate}%
                        </div>
                        <div className="text-sm text-gray-600">
                          Satisfaction Rate
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {stats.averageMatchScore}
                        </div>
                        <div className="text-sm text-gray-600">
                          Algorithm Score
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className={`text-2xl font-bold ${
                            stats.conflicts > 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {stats.conflicts}
                        </div>
                        <div className="text-sm text-gray-600">Conflicts</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Schedule Actions
                  </h3>

                  <div className="space-y-4">
                    {selectedSchedule.status === 'preferences_open' && (
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-blue-900">
                            Preferences Collection Phase
                          </h4>
                          <p className="text-sm text-blue-700">
                            Parents are submitting their weekly preferences
                          </p>
                        </div>
                        <ClockIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    )}

                    {(selectedSchedule.status === 'preferences_closed' ||
                      selectedSchedule.status === 'scheduling') && (
                      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-purple-900">
                            Ready for Assignment Generation
                          </h4>
                          <p className="text-sm text-purple-700">
                            Generate weekly assignments using the scheduling
                            algorithm
                          </p>
                        </div>
                        <button
                          onClick={() => generateAssignments(false)}
                          disabled={generating}
                          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
                        >
                          {generating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <PlayIcon className="h-4 w-4 mr-2" />
                              Generate Assignments
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {selectedSchedule.assignments.length > 0 && (
                      <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-yellow-900">
                            Regenerate Assignments
                          </h4>
                          <p className="text-sm text-yellow-700">
                            Override existing assignments with new ones
                          </p>
                        </div>
                        <button
                          onClick={() => generateAssignments(true)}
                          disabled={generating}
                          className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 flex items-center"
                        >
                          <ArrowPathIcon className="h-4 w-4 mr-2" />
                          Regenerate
                        </button>
                      </div>
                    )}

                    {selectedSchedule.status === 'swaps_open' && (
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-green-900">
                            Swap Requests Phase
                          </h4>
                          <p className="text-sm text-green-700">
                            Parents can request schedule swaps until deadline
                          </p>
                        </div>
                        <ArrowPathIcon className="h-8 w-8 text-green-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignments Preview */}
                {selectedSchedule.assignments.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Weekly Assignments
                    </h3>

                    <div className="space-y-3">
                      {selectedSchedule.assignments.map((assignment, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 capitalize">
                              {assignment.dayOfWeek} -{' '}
                              {formatDate(assignment.date)}
                            </h4>
                            <span className="text-sm text-gray-600">
                              Score: {assignment.algorithmScore || 0}/100
                            </span>
                          </div>

                          {assignment.morningTrip && (
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Driver:</span>{' '}
                              {assignment.morningTrip.driver.firstName}{' '}
                              {assignment.morningTrip.driver.lastName}
                              <span className="ml-4">
                                <span className="font-medium">Passengers:</span>{' '}
                                {assignment.morningTrip.passengers.length}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <AdjustmentsHorizontalIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Schedule
                </h3>
                <p className="text-gray-600">
                  Choose a weekly schedule from the list to view details and
                  manage assignments.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
