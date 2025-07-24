'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTripSchema, CreateTripRequest } from '../../../types/shared';
import { useTripStore } from '../../../store/trip.store';
import DashboardLayout from '../../../components/DashboardLayout';
import { SectionErrorBoundary } from '../../../components/SectionErrorBoundary';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function CreateTripPage() {
  const router = useRouter();
  const { createTrip, loading, error } = useTripStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTripRequest>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      maxPassengers: 4,
    },
  });

  const onSubmit = async (data: CreateTripRequest) => {
    setIsSubmitting(true);
    try {
      const success = await createTrip(data);
      if (success) {
        router.push('/trips');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mr-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Create New Trip
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Set up a new carpool trip and let others join
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <SectionErrorBoundary sectionName="Trip Creation Form">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Date */}
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Date *
                </label>
                <input
                  type="date"
                  id="date"
                  min={getTomorrowDate()}
                  {...register('date')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.date.message}
                  </p>
                )}
              </div>

              {/* Time Fields */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="departureTime"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Departure Time *
                  </label>
                  <input
                    type="time"
                    id="departureTime"
                    {...register('departureTime')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.departureTime && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.departureTime.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="arrivalTime"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Arrival Time *
                  </label>
                  <input
                    type="time"
                    id="arrivalTime"
                    {...register('arrivalTime')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.arrivalTime && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.arrivalTime.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Destination */}
              <div>
                <label
                  htmlFor="destination"
                  className="block text-sm font-medium text-gray-700"
                >
                  Destination *
                </label>
                <input
                  type="text"
                  id="destination"
                  placeholder="Enter destination address"
                  {...register('destination')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {errors.destination && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.destination.message}
                  </p>
                )}
              </div>

              {/* Max Passengers */}
              <div>
                <label
                  htmlFor="maxPassengers"
                  className="block text-sm font-medium text-gray-700"
                >
                  Max Passengers *
                </label>
                <select
                  id="maxPassengers"
                  {...register('maxPassengers', { valueAsNumber: true })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
                {errors.maxPassengers && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.maxPassengers.message}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Add any additional information about the trip..."
                  {...register('notes')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.notes.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting || loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Trip'
                  )}
                </button>
              </div>
            </form>
          </div>
        </SectionErrorBoundary>
      </div>
    </DashboardLayout>
  );
}
