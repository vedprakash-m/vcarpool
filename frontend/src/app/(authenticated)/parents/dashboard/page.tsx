import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Car,
  Clock,
  Bell,
  Settings,
  MapPin,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Parent Dashboard - Carpool',
  description:
    "Manage your family's carpool activities, assignments, and preferences",
};

// Mock data - replace with real API calls
const mockData = {
  upcomingTrips: [
    {
      id: 1,
      date: '2025-01-15',
      time: '8:00 AM',
      type: 'Morning Drop-off',
      children: ['Emma', 'Liam'],
      location: 'Lincoln Elementary',
      status: 'confirmed',
    },
    {
      id: 2,
      date: '2025-01-15',
      time: '3:30 PM',
      type: 'Afternoon Pickup',
      children: ['Emma', 'Liam'],
      location: 'Lincoln Elementary',
      status: 'pending',
    },
  ],
  fairnessScore: 87,
  totalTrips: 24,
  thisWeekTrips: 3,
  notifications: [
    {
      id: 1,
      type: 'assignment',
      message: 'New carpool assignment for Wednesday',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: 2,
      type: 'swap',
      message: 'Sarah Johnson requested a trip swap',
      time: '1 day ago',
      unread: true,
    },
  ],
};

export default function ParentDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Parent Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back! Here's your carpool activity overview.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Fairness Score
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mockData.fairnessScore}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Car className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Trips
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mockData.totalTrips}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    This Week
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mockData.thisWeekTrips} trips
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bell className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Notifications
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {mockData.notifications.filter(n => n.unread).length} unread
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Trips */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Upcoming Trips
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {mockData.upcomingTrips.map(trip => (
                  <div key={trip.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {trip.status === 'confirmed' ? (
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          ) : (
                            <AlertCircle className="h-6 w-6 text-yellow-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {trip.type}
                          </p>
                          <p className="text-sm text-gray-500">
                            {trip.date} at {trip.time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {trip.children.join(', ')}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {trip.location}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 bg-gray-50">
                <Link
                  href="/parents/assignments"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all assignments →
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions & Notifications */}
          <div>
            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Quick Actions
                </h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                <Link
                  href="/parents/preferences"
                  className="flex items-center p-3 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 group"
                >
                  <Settings className="h-5 w-5 text-gray-400 group-hover:text-gray-500 mr-3" />
                  Update Preferences
                </Link>
                <Link
                  href="/parents/swaps"
                  className="flex items-center p-3 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 group"
                >
                  <Users className="h-5 w-5 text-gray-400 group-hover:text-gray-500 mr-3" />
                  Request Trip Swap
                </Link>
                <Link
                  href="/parents/groups"
                  className="flex items-center p-3 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 group"
                >
                  <Calendar className="h-5 w-5 text-gray-400 group-hover:text-gray-500 mr-3" />
                  Manage Groups
                </Link>
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Recent Notifications
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {mockData.notifications.slice(0, 3).map(notification => (
                  <div key={notification.id} className="px-6 py-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {notification.unread && (
                          <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 bg-gray-50">
                <Link
                  href="/parents/notifications"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all notifications →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
