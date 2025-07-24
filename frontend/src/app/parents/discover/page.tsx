'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  AcademicCapIcon,
  ClockIcon,
  UserGroupIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { AccessibleModal } from '@/components/ui/AccessibleComponents';

interface School {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface GroupSearchResult {
  group: {
    id: string;
    name: string;
    description: string;
    targetSchool: School;
    serviceArea: {
      radiusMiles: number;
    };
    maxChildren: number;
    memberCount: number;
    ageGroups: string[];
    schedule: {
      daysOfWeek: string[];
      morningPickup?: {
        startTime: string;
        endTime: string;
      };
      afternoonDropoff?: {
        startTime: string;
        endTime: string;
      };
    };
    tripAdmin: {
      firstName: string;
      lastName: string;
    };
  };
  matchScore: number;
  distance: number | null;
  matchReasons: string[];
  canRequestToJoin: boolean;
}

interface SearchCriteria {
  schoolName: string;
  userLat: string;
  userLng: string;
  maxDistanceMiles: number;
  ageGroups: string[];
  daysOfWeek: string[];
  morningPickup: boolean;
  afternoonDropoff: boolean;
}

export default function GroupDiscoveryPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    schoolName: '',
    userLat: '',
    userLng: '',
    maxDistanceMiles: 10,
    ageGroups: [],
    daysOfWeek: [],
    morningPickup: false,
    afternoonDropoff: false,
  });
  const [searchResults, setSearchResults] = useState<GroupSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupSearchResult | null>(
    null
  );
  const [joinRequestData, setJoinRequestData] = useState({
    message: '',
    childrenInfo: [] as { name: string; grade: string }[],
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Redirect if not parent
  useEffect(() => {
    if (
      !isLoading &&
      (!user || (user.role !== 'parent' && user.role !== 'group_admin'))
    ) {
      router.push('/dashboard');
    }

    // Pre-registration guard: ensure user has completed registration before accessing group discovery
    if (!isLoading && user && !user.registrationCompleted) {
      router.push('/register/complete');
    }
  }, [user, isLoading, router]);

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setSearchCriteria(prev => ({
            ...prev,
            userLat: position.coords.latitude.toString(),
            userLng: position.coords.longitude.toString(),
          }));
          setMessage({
            type: 'success',
            text: 'Location detected! Search will show distance-based results.',
          });
        },
        error => {
          setMessage({
            type: 'error',
            text: 'Could not detect location. You can still search by school name.',
          });
        }
      );
    } else {
      setMessage({
        type: 'error',
        text: 'Geolocation is not supported by this browser.',
      });
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const queryParams = new URLSearchParams({
        action: 'search',
        maxDistanceMiles: searchCriteria.maxDistanceMiles.toString(),
      });

      if (searchCriteria.schoolName) {
        queryParams.append('schoolName', searchCriteria.schoolName);
      }
      if (searchCriteria.userLat && searchCriteria.userLng) {
        queryParams.append('userLat', searchCriteria.userLat);
        queryParams.append('userLng', searchCriteria.userLng);
      }
      if (searchCriteria.ageGroups.length > 0) {
        queryParams.append('ageGroups', searchCriteria.ageGroups.join(','));
      }
      if (searchCriteria.daysOfWeek.length > 0) {
        queryParams.append('daysOfWeek', searchCriteria.daysOfWeek.join(','));
      }
      if (searchCriteria.morningPickup) {
        queryParams.append('morningPickup', 'true');
      }
      if (searchCriteria.afternoonDropoff) {
        queryParams.append('afternoonDropoff', 'true');
      }

      const token = localStorage.getItem('carpool_token');
      const response = await fetch(`/api/parent/groups?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data.results);
        setSearchPerformed(true);
        setMessage({
          type: 'success',
          text: `Found ${data.data.results.length} matching carpool groups`,
        });
      } else {
        const errorData = await response.json();

        // Handle registration-specific errors
        if (response.status === 401) {
          setMessage({
            type: 'error',
            text: 'Please log in to search for carpool groups.',
          });
          router.push('/auth/login');
          return;
        }

        if (response.status === 403 && errorData.error) {
          const {
            errorCode,
            message: errorMessage,
            missingRequirements,
          } = errorData.error;

          if (errorCode === 'REGISTRATION_INCOMPLETE') {
            setMessage({
              type: 'error',
              text: `Registration incomplete: ${errorMessage}${
                missingRequirements
                  ? ` Missing: ${missingRequirements.join(', ')}`
                  : ''
              }`,
            });
          } else if (errorCode === 'PHONE_NOT_VERIFIED') {
            setMessage({
              type: 'error',
              text: 'Please verify your phone number before searching for groups.',
            });
          } else if (errorCode === 'ADDRESS_NOT_VERIFIED') {
            setMessage({
              type: 'error',
              text: 'Please verify your home address before searching for groups.',
            });
          } else if (errorCode === 'EMERGENCY_CONTACT_NOT_VERIFIED') {
            setMessage({
              type: 'error',
              text: 'Please add and verify emergency contacts before searching for groups.',
            });
          } else {
            setMessage({
              type: 'error',
              text: errorMessage || 'Registration verification required.',
            });
          }
          return;
        }

        setMessage({
          type: 'error',
          text: 'Failed to search for groups',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error searching for groups',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async (group: GroupSearchResult) => {
    setSelectedGroup(group);
  };

  const submitJoinRequest = async () => {
    if (!selectedGroup) return;

    setIsSubmittingRequest(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch('/api/parent/groups?action=join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupId: selectedGroup.group.id,
          message: joinRequestData.message,
          childrenInfo: joinRequestData.childrenInfo,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: data.data.message,
        });
        setSelectedGroup(null);
        setJoinRequestData({ message: '', childrenInfo: [] });
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
        text: 'Error submitting join request',
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const addChild = () => {
    setJoinRequestData(prev => ({
      ...prev,
      childrenInfo: [...prev.childrenInfo, { name: '', grade: '' }],
    }));
  };

  const updateChild = (
    index: number,
    field: 'name' | 'grade',
    value: string
  ) => {
    setJoinRequestData(prev => ({
      ...prev,
      childrenInfo: prev.childrenInfo.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      ),
    }));
  };

  const removeChild = (index: number) => {
    setJoinRequestData(prev => ({
      ...prev,
      childrenInfo: prev.childrenInfo.filter((_, i) => i !== index),
    }));
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'parent' && user.role !== 'group_admin')) {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Registration Requirements Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                🎯 Registration Required for Group Access
              </h3>
              <p className="text-blue-800 mb-3">
                To discover and join carpool groups, you must first complete
                your registration with verified information:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 ml-4">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  ✓ Phone number verification (SMS)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  ✓ Home address validation (within 25 miles of Tesla Stem High
                  School)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  ✓ Emergency contact verification
                </li>
              </ul>
              <p className="text-sm text-blue-600 mt-3">
                <strong>Current Support Area:</strong> Tesla Stem High School,
                Redmond, WA and surrounding areas within 25 miles
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <MagnifyingGlassIcon className="h-8 w-8 mr-3 text-blue-600" />
            Discover Carpool Groups
          </h1>
          <p className="text-gray-600 mt-2">
            Find and join carpool groups near your school and location
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Search Criteria
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* School Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AcademicCapIcon className="h-4 w-4 inline mr-1" />
                School Name
              </label>
              <input
                type="text"
                value={searchCriteria.schoolName}
                onChange={e =>
                  setSearchCriteria(prev => ({
                    ...prev,
                    schoolName: e.target.value,
                  }))
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Lincoln Elementary"
              />
            </div>

            {/* Max Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                Max Distance (miles)
              </label>
              <input
                type="number"
                value={searchCriteria.maxDistanceMiles}
                onChange={e =>
                  setSearchCriteria(prev => ({
                    ...prev,
                    maxDistanceMiles: parseInt(e.target.value) || 10,
                  }))
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="50"
              />
            </div>

            {/* Location Button */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Location
              </label>
              <button
                onClick={getCurrentLocation}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <MapPinIcon className="h-4 w-4 mr-2" />
                Detect Location
              </button>
            </div>
          </div>

          {/* Age Groups */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age Groups/Grades
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'K',
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                '10',
                '11',
                '12',
              ].map(grade => (
                <label key={grade} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={searchCriteria.ageGroups.includes(grade)}
                    onChange={e => {
                      setSearchCriteria(prev => ({
                        ...prev,
                        ageGroups: e.target.checked
                          ? [...prev.ageGroups, grade]
                          : prev.ageGroups.filter(g => g !== grade),
                      }));
                    }}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">{grade}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Time Preferences */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ClockIcon className="h-4 w-4 inline mr-1" />
              Time Preferences
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={searchCriteria.morningPickup}
                  onChange={e =>
                    setSearchCriteria(prev => ({
                      ...prev,
                      morningPickup: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Morning Pickup
                </span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={searchCriteria.afternoonDropoff}
                  onChange={e =>
                    setSearchCriteria(prev => ({
                      ...prev,
                      afternoonDropoff: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Afternoon Dropoff
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  Search Groups
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchPerformed && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Search Results ({searchResults.length})
            </h2>

            {searchResults.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="text-center mb-6">
                  <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Groups Found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    We couldn't find any carpool groups that match your criteria
                    for your selected school and area.
                  </p>
                </div>

                {/* Create New Group Option */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-8 w-8 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        ></path>
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="text-lg font-semibold text-blue-900 mb-2">
                        🚀 Start Your Own Carpool Group
                      </h4>
                      <p className="text-blue-800 mb-4">
                        Be the first to organize carpooling for your school and
                        neighborhood! You'll automatically become the Group
                        Admin for the new group.
                      </p>
                      <button
                        onClick={() =>
                          (window.location.href = '/parents/groups/create')
                        }
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create New Group →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Or continue searching with different criteria:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() =>
                        setSearchCriteria(prev => ({
                          ...prev,
                          maxDistanceMiles: prev.maxDistanceMiles + 5,
                        }))
                      }
                      className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    >
                      Expand Search Area
                    </button>
                    <button
                      onClick={() =>
                        setSearchCriteria(prev => ({
                          ...prev,
                          schoolName: '',
                        }))
                      }
                      className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    >
                      Try Different School
                    </button>
                    <button
                      onClick={() =>
                        setSearchCriteria(prev => ({
                          ...prev,
                          ageGroups: [],
                        }))
                      }
                      className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    >
                      Browse All Groups
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {searchResults.map(result => (
                  <div
                    key={result.group.id}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {result.group.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            by {result.group.tripAdmin.firstName}{' '}
                            {result.group.tripAdmin.lastName}
                          </p>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getMatchScoreColor(
                            result.matchScore
                          )}`}
                        >
                          <StarIcon className="h-3 w-3 inline mr-1" />
                          {result.matchScore}% match
                        </div>
                      </div>

                      <p className="text-gray-700 mb-4">
                        {result.group.description}
                      </p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <AcademicCapIcon className="h-4 w-4 mr-2" />
                          {result.group.targetSchool.name}
                        </div>
                        {result.distance && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPinIcon className="h-4 w-4 mr-2" />
                            {result.distance} miles away
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <UserGroupIcon className="h-4 w-4 mr-2" />
                          {result.group.memberCount}/{result.group.maxChildren}{' '}
                          members
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          {result.group.schedule.daysOfWeek.length} days/week
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Match Reasons:
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {result.matchReasons.map((reason, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Grades: {result.group.ageGroups.join(', ')}
                        </div>
                        {result.canRequestToJoin ? (
                          <button
                            onClick={() => handleJoinRequest(result)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium flex items-center"
                          >
                            <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                            Request to Join
                          </button>
                        ) : (
                          <span className="text-red-600 text-sm font-medium flex items-center">
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Not Accepting
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Join Request Modal */}
        {selectedGroup && (
          <AccessibleModal
            isOpen={!!selectedGroup}
            onClose={() => setSelectedGroup(null)}
            title={`Request to Join: ${selectedGroup.group.name}`}
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700"
                >
                  Message to Group Admin (Optional)
                </label>
                <div className="mt-1">
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="input"
                    placeholder="Tell the Group Admin about yourself and why you'd like to join..."
                    value={joinRequestData.message}
                    onChange={e =>
                      setJoinRequestData(prev => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Children Information
                  </label>
                  <button
                    onClick={addChild}
                    className="text-blue-700 text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    + Add Child
                  </button>
                </div>

                {joinRequestData.childrenInfo.map((child, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={child.name}
                      onChange={e => updateChild(index, 'name', e.target.value)}
                      placeholder="Child's name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={child.grade}
                      onChange={e =>
                        updateChild(index, 'grade', e.target.value)
                      }
                      placeholder="Grade"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => removeChild(index)}
                      className="text-red-700 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={submitJoinRequest}
                  disabled={isSubmittingRequest}
                  className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
                >
                  {isSubmittingRequest ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </AccessibleModal>
        )}
      </div>
    </div>
  );
}
