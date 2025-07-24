'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface ScheduleTemplate {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  routeType:
    | 'school_dropoff'
    | 'school_pickup'
    | 'multi_stop'
    | 'point_to_point';
  description: string;
  locationId?: string;
  maxPassengers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  routeType:
    | 'school_dropoff'
    | 'school_pickup'
    | 'multi_stop'
    | 'point_to_point';
  description: string;
  locationId?: string;
  maxPassengers: number;
  isActive: boolean;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const ROUTE_TYPES = [
  { value: 'school_dropoff', label: 'School Drop-off', icon: '🏫' },
  { value: 'school_pickup', label: 'School Pick-up', icon: '🚌' },
  { value: 'multi_stop', label: 'Multi-stop Route', icon: '🛣️' },
  { value: 'point_to_point', label: 'Point to Point', icon: '📍' },
];

export default function AdminTemplatesPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ScheduleTemplate | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [formData, setFormData] = useState<TemplateFormData>({
    dayOfWeek: 1, // Monday
    startTime: '07:30',
    endTime: '08:30',
    routeType: 'school_dropoff',
    description: '',
    locationId: '',
    maxPassengers: 4,
    isActive: true,
  });

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Load templates
  useEffect(() => {
    if (user && user.role === 'admin') {
      loadTemplates();
    }
  }, [user]);

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

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ||
          'https://carpool-api-prod.azurewebsites.net/api'
        }/v1/admin/schedule-templates`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load templates');
      }

      setTemplates(result.data || []);
    } catch (error) {
      console.error('Load templates error:', error);
      setMessage({
        type: 'error',
        text:
          error instanceof Error ? error.message : 'Failed to load templates',
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const url = editingTemplate
        ? `${
            process.env.NEXT_PUBLIC_API_URL ||
            'https://carpool-api-prod.azurewebsites.net/api'
          }/v1/admin/schedule-templates/${editingTemplate.id}`
        : `${
            process.env.NEXT_PUBLIC_API_URL ||
            'https://carpool-api-prod.azurewebsites.net/api'
          }/v1/admin/schedule-templates`;

      const response = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to save template');
      }

      setMessage({
        type: 'success',
        text: editingTemplate
          ? 'Template updated successfully!'
          : 'Template created successfully!',
      });

      // Reset form and reload templates
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Save template error:', error);
      setMessage({
        type: 'error',
        text:
          error instanceof Error ? error.message : 'Failed to save template',
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL ||
          'https://carpool-api-prod.azurewebsites.net/api'
        }/v1/admin/schedule-templates/${templateId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to delete template');
      }

      setMessage({
        type: 'success',
        text: 'Template deleted successfully!',
      });

      loadTemplates();
    } catch (error) {
      console.error('Delete template error:', error);
      setMessage({
        type: 'error',
        text:
          error instanceof Error ? error.message : 'Failed to delete template',
      });
    }
  };

  const startEdit = (template: ScheduleTemplate) => {
    setEditingTemplate(template);
    setFormData({
      dayOfWeek: template.dayOfWeek,
      startTime: template.startTime,
      endTime: template.endTime,
      routeType: template.routeType,
      description: template.description,
      locationId: template.locationId || '',
      maxPassengers: template.maxPassengers,
      isActive: template.isActive,
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setShowCreateForm(false);
    setFormData({
      dayOfWeek: 1,
      startTime: '07:30',
      endTime: '08:30',
      routeType: 'school_dropoff',
      description: '',
      locationId: '',
      maxPassengers: 4,
      isActive: true,
    });
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    const day = DAYS_OF_WEEK[template.dayOfWeek];
    if (!acc[day]) acc[day] = [];
    acc[day].push(template);
    return acc;
  }, {} as Record<string, ScheduleTemplate[]>);

  // Sort templates within each day by start time
  Object.keys(groupedTemplates).forEach(day => {
    groupedTemplates[day].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  📅 Schedule Templates
                </h1>
                <p className="text-green-100 mt-1">
                  Manage weekly carpool schedule templates
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

          {/* Actions */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                Create and manage recurring weekly schedule slots
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Template
              </button>
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

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-white shadow-lg rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day of Week *
                  </label>
                  <select
                    required
                    value={formData.dayOfWeek}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        dayOfWeek: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {DAYS_OF_WEEK.map((day, index) => (
                      <option key={index} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={e =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={e =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Route Type *
                  </label>
                  <select
                    required
                    value={formData.routeType}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        routeType: e.target.value as typeof formData.routeType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {ROUTE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Passengers *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="8"
                    value={formData.maxPassengers}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        maxPassengers: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location ID
                  </label>
                  <input
                    type="text"
                    value={formData.locationId}
                    onChange={e =>
                      setFormData({ ...formData, locationId: e.target.value })
                    }
                    placeholder="e.g., lincoln-elementary"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={e =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="e.g., Monday Morning School Drop-off"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Template is active
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Templates List */}
        <div className="space-y-8">
          {isLoadingTemplates ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No templates created yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first schedule template to get started
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Template
              </button>
            </div>
          ) : (
            DAYS_OF_WEEK.map(day => {
              const dayTemplates = groupedTemplates[day];
              if (!dayTemplates || dayTemplates.length === 0) return null;

              return (
                <div
                  key={day}
                  className="bg-white shadow rounded-lg overflow-hidden"
                >
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">{day}</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {dayTemplates.map(template => (
                      <div
                        key={template.id}
                        className="p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-2">
                              <h4 className="text-lg font-medium text-gray-900">
                                {template.description}
                              </h4>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  template.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {template.isActive ? (
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                ) : (
                                  <XCircleIcon className="h-4 w-4 mr-1" />
                                )}
                                {template.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {template.startTime} - {template.endTime}
                              </div>
                              <div className="flex items-center">
                                <UsersIcon className="h-4 w-4 mr-1" />
                                Max {template.maxPassengers} passengers
                              </div>
                              <div className="flex items-center">
                                <MapPinIcon className="h-4 w-4 mr-1" />
                                {
                                  ROUTE_TYPES.find(
                                    rt => rt.value === template.routeType
                                  )?.label
                                }
                              </div>
                              {template.locationId && (
                                <div className="flex items-center">
                                  <span>📍 {template.locationId}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => startEdit(template)}
                              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                              title="Edit template"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete template"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
