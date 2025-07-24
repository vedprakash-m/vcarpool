'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';
import {
  CalendarIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  PhoneIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

interface StudentTrip {
  id: string;
  date: string;
  time: string;
  type: 'pickup' | 'dropoff';
  driver: {
    name: string;
    phone: string;
  };
  route: string;
  passengers: string[];
}

interface StudentProfile {
  id: string;
  fullName: string;
  studentId: string;
  phoneNumber?: string;
  parentId: string;
  parentName: string;
}

export default function StudentDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [upcomingTrips, setUpcomingTrips] = useState<StudentTrip[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Wait for auth store to hydrate
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasHydrated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Authentication check
  useEffect(() => {
    if (isLoading || !hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'student') {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isLoading, user, router, hasHydrated]);

  // Load student data
  useEffect(() => {
    if (isAuthenticated && user?.role === 'student') {
      loadStudentProfile();
      loadUpcomingTrips();
    }
  }, [isAuthenticated, user]);

  const loadStudentProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const response = await apiClient.get<StudentProfile>('/students/profile');

      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        // Mock data for development
        setProfile({
          id: 'student-1',
          fullName:
            `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
            'Student User',
          studentId: 'ST001',
          phoneNumber: user?.phoneNumber || '',
          parentId: 'parent-1',
          parentName: 'Parent Guardian',
        });
      }
    } catch (err: any) {
      console.error('Failed to load student profile:', err);
      // Use mock data as fallback
      setProfile({
        id: 'student-1',
        fullName:
          `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
          'Student User',
        studentId: 'ST001',
        phoneNumber: user?.phoneNumber || '',
        parentId: 'parent-1',
        parentName: 'Parent Guardian',
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadUpcomingTrips = async () => {
    try {
      setIsLoadingTrips(true);
      const response = await apiClient.get<StudentTrip[]>('/students/trips');

      if (response.success && response.data) {
        setUpcomingTrips(response.data);
      } else {
        // Mock data for development
        const mockTrips: StudentTrip[] = [
          {
            id: 'trip-1',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            time: '07:30',
            type: 'pickup',
            driver: {
              name: 'Sarah Johnson',
              phone: '(555) 123-4567',
            },
            route: 'Home → Lincoln Elementary',
            passengers: ['Emma Wilson', 'Jake Thompson'],
          },
          {
            id: 'trip-2',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            time: '15:15',
            type: 'dropoff',
            driver: {
              name: 'Mike Chen',
              phone: '(555) 987-6543',
            },
            route: 'Lincoln Elementary → Home',
            passengers: ['Sophie Davis', 'Alex Rodriguez'],
          },
          {
            id: 'trip-3',
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            time: '07:30',
            type: 'pickup',
            driver: {
              name: 'Lisa Park',
              phone: '(555) 456-7890',
            },
            route: 'Home → Lincoln Elementary',
            passengers: ['David Kim', 'Maya Patel'],
          },
        ];
        setUpcomingTrips(mockTrips);
      }
    } catch (err: any) {
      console.error('Failed to load upcoming trips:', err);
      setError('Failed to load upcoming trips');
    } finally {
      setIsLoadingTrips(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Loading screen
  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            My Carpool Schedule
          </h1>
          <p className="mt-2 text-gray-600">
            View your upcoming school trips and manage your profile
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">My Profile</h2>
          </div>
          <div className="px-6 py-4">
            {isLoadingProfile ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              </div>
            ) : profile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center mb-3">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {profile.fullName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Student ID: {profile.studentId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center mb-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-900">
                        {profile.phoneNumber || 'No phone number'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Parent/Guardian</p>
                  <p className="text-sm font-medium text-gray-900">
                    {profile.parentName}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Failed to load profile</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => router.push('/students/profile')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3 mr-4">
                <UserIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Profile
                </h3>
                <p className="text-sm text-gray-500">
                  Update your phone number and personal information
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/students/change-password')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3 mr-4">
                <KeyIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Change Password
                </h3>
                <p className="text-sm text-gray-500">
                  Update your account password
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Upcoming Trips */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Upcoming School Trips
            </h2>
          </div>
          <div className="px-6 py-4">
            {isLoadingTrips ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse border rounded-lg p-4">
                    <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : upcomingTrips.length > 0 ? (
              <div className="space-y-4">
                {upcomingTrips.map(trip => (
                  <div
                    key={trip.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(trip.date)}
                          </span>
                          <ClockIcon className="h-4 w-4 text-gray-400 ml-4 mr-1" />
                          <span className="text-sm text-gray-600">
                            {trip.time}
                          </span>
                        </div>

                        <div className="flex items-center mb-2">
                          <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {trip.route}
                          </span>
                        </div>

                        <div className="flex items-center mb-2">
                          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">
                            Driver: {trip.driver.name}
                          </span>
                          <PhoneIcon className="h-4 w-4 text-gray-400 ml-4 mr-1" />
                          <span className="text-sm text-gray-600">
                            {trip.driver.phone}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">
                            Other passengers: {trip.passengers.join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="ml-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            trip.type === 'pickup'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {trip.type === 'pickup'
                            ? 'School Drop-off'
                            : 'Home Pick-up'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming trips scheduled</p>
                <p className="text-sm text-gray-400">
                  Your parent/guardian will coordinate your school
                  transportation
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
