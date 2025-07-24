'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface PotentialDriver {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  joinedDate?: string;
}

interface DriverDesignation {
  id: string;
  weekStartDate: string;
  driverId: string;
  designatedBy: string;
  designatedAt: string;
  isActive: boolean;
}

interface WeekDriverData {
  weekStartDate: string;
  drivers: (PotentialDriver & {
    isActive: boolean;
    designation?: DriverDesignation;
  })[];
  activeDriverCount: number;
  totalPotentialDrivers: number;
}

export default function AdminDriversPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  const [potentialDrivers, setPotentialDrivers] = useState<PotentialDriver[]>(
    []
  );
  const [currentWeekData, setCurrentWeekData] = useState<WeekDriverData | null>(
    null
  );
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(
    new Set()
  );
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Set default week to next Monday
  useEffect(() => {
    const getNextMonday = () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      return nextMonday.toISOString().split('T')[0];
    };

    setSelectedWeek(getNextMonday());
  }, []);

  // Load potential drivers
  useEffect(() => {
    if (user && user.role === 'admin') {
      loadPotentialDrivers();
    }
  }, [user]);

  // Load week data when week changes
  useEffect(() => {
    if (selectedWeek && user && user.role === 'admin') {
      loadWeekDriverData(selectedWeek);
    }
  }, [selectedWeek, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You must be an administrator to access this page.
          </p>
        </div>
      </div>
    );
  }

  const loadPotentialDrivers = async () => {
    try {
      setIsLoadingDrivers(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ||
          'https://carpool-api-prod.azurewebsites.net/api'
        }/v1/admin/driver-designations`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Failed to load potential drivers'
        );
      }

      setPotentialDrivers(result.data || []);
    } catch (error) {
      console.error('Load potential drivers error:', error);
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Failed to load potential drivers',
      });
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  const loadWeekDriverData = async (weekStartDate: string) => {
    try {
      setIsLoadingWeek(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ||
          'https://carpool-api-prod.azurewebsites.net/api'
        }/v1/admin/driver-designations/${weekStartDate}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Failed to load week driver data'
        );
      }

      const weekData = result.data;
      setCurrentWeekData(weekData);

      // Update selected driver IDs based on current designations
      const activeIds = new Set<string>(
        weekData.drivers
          .filter((d: any) => d.isActive)
          .map((d: any) => d.id as string)
      );
      setSelectedDriverIds(activeIds);
    } catch (error) {
      console.error('Load week driver data error:', error);
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Failed to load week driver data',
      });
    } finally {
      setIsLoadingWeek(false);
    }
  };

  const saveDriverDesignations = async () => {
    try {
      setIsSaving(true);
      setMessage(null);

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ||
          'https://carpool-api-prod.azurewebsites.net/api'
        }/v1/admin/driver-designations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            weekStartDate: selectedWeek,
            activeDriverIds: Array.from(selectedDriverIds),
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Failed to save driver designations'
        );
      }

      setMessage({
        type: 'success',
        text: `✅ Driver designations saved for week of ${formatDate(
          selectedWeek
        )}! ${selectedDriverIds.size} drivers designated.`,
      });

      // Reload week data to reflect changes
      loadWeekDriverData(selectedWeek);
    } catch (error) {
      console.error('Save driver designations error:', error);
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Failed to save driver designations',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDriverSelection = (driverId: string) => {
    const newSelection = new Set(selectedDriverIds);
    if (newSelection.has(driverId)) {
      newSelection.delete(driverId);
    } else {
      newSelection.add(driverId);
    }
    setSelectedDriverIds(newSelection);
  };

  const selectAllDrivers = () => {
    setSelectedDriverIds(new Set(potentialDrivers.map(d => d.id)));
  };

  const clearAllDrivers = () => {
    setSelectedDriverIds(new Set());
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedWeek);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate.toISOString().split('T')[0]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const hasChanges = currentWeekData
    ? selectedDriverIds.size !== currentWeekData.activeDriverCount ||
      !currentWeekData.drivers.every(
        d => d.isActive === selectedDriverIds.has(d.id)
      )
    : false;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  👥 Driver Management
                </h1>
                <p className="text-blue-100 mt-1">
                  Designate active drivers for weekly schedules
                </p>
              </div>
              <Link
                href="/admin"
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="mb-6">
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          </div>
        )}

        {/* Week Selection */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Week Selection
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateWeek('prev')}
                className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Previous Week
              </button>

              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  Week of {formatDate(selectedWeek)}
                </div>
                <input
                  type="date"
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(e.target.value)}
                  className="mt-2 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                onClick={() => navigateWeek('next')}
                className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Next Week
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </button>
            </div>

            {/* Week Summary */}
            {currentWeekData && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedDriverIds.size}
                    </div>
                    <div className="text-sm text-gray-600">Active Drivers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {currentWeekData.totalPotentialDrivers}
                    </div>
                    <div className="text-sm text-gray-600">Total Available</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(
                        (selectedDriverIds.size /
                          currentWeekData.totalPotentialDrivers) *
                          100
                      )}
                      %
                    </div>
                    <div className="text-sm text-gray-600">
                      Participation Rate
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Driver Selection */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Driver Designations
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={selectAllDrivers}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearAllDrivers}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={saveDriverDesignations}
                  disabled={!hasChanges || isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Designations'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {isLoadingDrivers || isLoadingWeek ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading drivers...</p>
              </div>
            ) : potentialDrivers.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No potential drivers found
                </h3>
                <p className="text-gray-600">
                  No parent users have indicated they can drive. Check user
                  profiles or encourage parents to update their driving
                  preferences.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {potentialDrivers.map(driver => {
                  const isSelected = selectedDriverIds.has(driver.id);
                  const currentDesignation = currentWeekData?.drivers.find(
                    d => d.id === driver.id
                  )?.designation;

                  return (
                    <div
                      key={driver.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleDriverSelection(driver.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                            ) : (
                              <div className="h-6 w-6 border-2 border-gray-300 rounded-full"></div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-medium text-gray-900 truncate">
                                {driver.name}
                              </h3>
                              {currentDesignation && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Previously Active
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                              <div className="flex items-center">
                                <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                                {driver.email}
                              </div>
                              {driver.phoneNumber && (
                                <div className="flex items-center">
                                  <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  {driver.phoneNumber}
                                </div>
                              )}
                              {driver.pickupLocation && (
                                <div className="flex items-center">
                                  <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  {driver.pickupLocation}
                                </div>
                              )}
                              {driver.joinedDate && (
                                <div className="flex items-center">
                                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  Joined{' '}
                                  {new Date(
                                    driver.joinedDate
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          {potentialDrivers.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {selectedDriverIds.size} of {potentialDrivers.length} drivers
                  selected
                </span>
                {hasChanges && (
                  <span className="text-orange-600 font-medium">
                    • Unsaved changes
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
