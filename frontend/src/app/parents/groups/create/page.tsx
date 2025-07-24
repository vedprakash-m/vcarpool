'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import {
  AcademicCapIcon,
  MapPinIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface CreateGroupForm {
  name: string;
  description: string;
  targetSchoolId: string;
  serviceArea: {
    centerLocation: {
      lat: number;
      lng: number;
    };
    radiusMiles: number;
  };
  maxChildren: number;
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
}

interface School {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  gradesServed: string[];
}

interface GroupTemplate {
  id: string;
  name: string;
  description: string;
  schedule: any;
  defaultRadius: number;
  defaultCapacity: number;
  ageGroups: string[];
}

export default function CreateGroupPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [templates, setTemplates] = useState<GroupTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<GroupTemplate | null>(null);

  const [formData, setFormData] = useState<CreateGroupForm>({
    name: '',
    description: '',
    targetSchoolId: '',
    serviceArea: {
      centerLocation: { lat: 0, lng: 0 },
      radiusMiles: 5,
    },
    maxChildren: 6,
    ageGroups: [],
    schedule: {
      daysOfWeek: [],
    },
  });

  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'parent')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Load schools and templates
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load schools
        const schoolsResponse = await fetch('/api/schools');
        if (schoolsResponse.ok) {
          const schoolsData = await schoolsResponse.json();
          setSchools(schoolsData.data.schools || []);
        }

        // Load templates
        const templatesResponse = await fetch(
          '/api/parent/groups/create?action=templates'
        );
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          setTemplates(templatesData.data.templates || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (user?.role === 'parent') {
      loadData();
    }
  }, [user]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setFormData(prev => ({
            ...prev,
            serviceArea: {
              ...prev.serviceArea,
              centerLocation: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              },
            },
          }));
        },
        error => {
          console.warn('Location access denied:', error);
        }
      );
    }
  }, []);

  const handleTemplateSelect = (template: GroupTemplate) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      name:
        prev.name ||
        `${template.name} - ${
          schools.find(s => s.id === prev.targetSchoolId)?.name || 'My School'
        }`,
      description: prev.description || template.description,
      maxChildren: template.defaultCapacity,
      ageGroups: template.ageGroups,
      schedule: template.schedule,
      serviceArea: {
        ...prev.serviceArea,
        radiusMiles: template.defaultRadius,
      },
    }));
  };

  const handleSchoolSelect = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    if (school) {
      setFormData(prev => ({
        ...prev,
        targetSchoolId: schoolId,
        name: selectedTemplate
          ? `${selectedTemplate.name} - ${school.name}`
          : `${school.name} Carpool`,
        ageGroups: school.gradesServed,
        serviceArea: {
          centerLocation: school.location,
          radiusMiles: prev.serviceArea.radiusMiles,
        },
      }));
    }
  };

  const handleCreateGroup = async () => {
    setIsCreating(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch('/api/parent/groups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: data.data.message,
        });

        // Redirect to group management after success
        setTimeout(() => {
          router.push(`/admin/groups/${data.data.group.id}`);
        }, 2000);
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
        text: 'Error creating group. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'parent') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            Only parents can create carpool groups.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎯 Create Your Carpool Group
          </h1>
          <p className="text-gray-600">
            Start organizing safe, reliable transportation for your children and
            neighborhood families. You'll automatically become the Group Admin
            while keeping your parent role.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[1, 2, 3].map(step => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {currentStep > step ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-600">
                  {step === 1 && 'Basic Info'}
                  {step === 2 && 'Schedule'}
                  {step === 3 && 'Review'}
                </span>
                {step < 3 && (
                  <div className="w-16 h-0.5 bg-gray-300 ml-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : message.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center">
              {message.type === 'success' && (
                <CheckCircleIcon className="w-5 h-5 mr-2" />
              )}
              {message.type === 'error' && (
                <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 1: Basic Information
              </h2>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Choose a Template (Optional)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <h3 className="font-medium text-gray-900">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {template.description}
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        {template.defaultCapacity} children •{' '}
                        {template.defaultRadius} miles
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* School Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target School *
                </label>
                <select
                  value={formData.targetSchoolId}
                  onChange={e => handleSchoolSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a school...</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Lincoln Elementary Morning Carpool"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your carpool group and what makes it special..."
                />
              </div>

              {/* Service Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Radius (miles)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    value={formData.serviceArea.radiusMiles}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        serviceArea: {
                          ...prev.serviceArea,
                          radiusMiles: parseInt(e.target.value),
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Children
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="12"
                    value={formData.maxChildren}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        maxChildren: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 2: Schedule & Timing
              </h2>

              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Days of Operation
                </label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(
                    day => (
                      <label key={day} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.schedule.daysOfWeek.includes(day)}
                          onChange={e => {
                            const updatedDays = e.target.checked
                              ? [...formData.schedule.daysOfWeek, day]
                              : formData.schedule.daysOfWeek.filter(
                                  d => d !== day
                                );
                            setFormData(prev => ({
                              ...prev,
                              schedule: {
                                ...prev.schedule,
                                daysOfWeek: updatedDays,
                              },
                            }));
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">
                          {day.slice(0, 3)}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Morning Pickup */}
              <div>
                <label className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={!!formData.schedule.morningPickup}
                    onChange={e => {
                      setFormData(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          morningPickup: e.target.checked
                            ? { startTime: '07:30', endTime: '08:00' }
                            : undefined,
                        },
                      }));
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Morning Pickup
                  </span>
                </label>
                {formData.schedule.morningPickup && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={formData.schedule.morningPickup.startTime}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            schedule: {
                              ...prev.schedule,
                              morningPickup: {
                                ...prev.schedule.morningPickup!,
                                startTime: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={formData.schedule.morningPickup.endTime}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            schedule: {
                              ...prev.schedule,
                              morningPickup: {
                                ...prev.schedule.morningPickup!,
                                endTime: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Afternoon Dropoff */}
              <div>
                <label className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={!!formData.schedule.afternoonDropoff}
                    onChange={e => {
                      setFormData(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          afternoonDropoff: e.target.checked
                            ? { startTime: '15:00', endTime: '16:00' }
                            : undefined,
                        },
                      }));
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Afternoon Dropoff
                  </span>
                </label>
                {formData.schedule.afternoonDropoff && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={formData.schedule.afternoonDropoff.startTime}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            schedule: {
                              ...prev.schedule,
                              afternoonDropoff: {
                                ...prev.schedule.afternoonDropoff!,
                                startTime: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={formData.schedule.afternoonDropoff.endTime}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            schedule: {
                              ...prev.schedule,
                              afternoonDropoff: {
                                ...prev.schedule.afternoonDropoff!,
                                endTime: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Step 3: Review & Create
              </h2>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4">
                  Group Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="font-medium">{formData.name}</span>
                  </div>

                  <div className="flex items-center">
                    <AcademicCapIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span>
                      {
                        schools.find(s => s.id === formData.targetSchoolId)
                          ?.name
                      }
                    </span>
                  </div>

                  <div className="flex items-center">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span>
                      {formData.serviceArea.radiusMiles} mile service radius
                    </span>
                  </div>

                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span>
                      {formData.schedule.daysOfWeek.length} days/week
                      {formData.schedule.morningPickup && ' • Morning pickup'}
                      {formData.schedule.afternoonDropoff &&
                        ' • Afternoon dropoff'}
                    </span>
                  </div>
                </div>

                {formData.description && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      {formData.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-8 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <InformationCircleIcon
                      className="h-5 w-5 text-blue-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      • You'll automatically become the Group Admin for this
                      group
                      <br />
                      • You can invite other families after the group is created
                      <br />
                      • You can start inviting other families from your school
                      <br />• Set up your first weekly schedule when you have
                      members
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                disabled={
                  (currentStep === 1 &&
                    (!formData.name || !formData.targetSchoolId)) ||
                  (currentStep === 2 &&
                    formData.schedule.daysOfWeek.length === 0)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleCreateGroup}
                disabled={isCreating}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Group...
                  </>
                ) : (
                  '🎉 Create Group'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
