'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MapPinIcon,
  CalendarIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const advancedSearchSchema = z.object({
  searchQuery: z.string().optional(),
  destination: z.string().optional(),
  origin: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minSeats: z.number().min(1).max(8).optional(),
  sortBy: z
    .enum(['date', 'destination', 'availableSeats', 'departureTime'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

type AdvancedSearchForm = z.infer<typeof advancedSearchSchema>;

interface AdvancedTripSearchProps {
  onSearch: (filters: AdvancedSearchForm) => void;
  loading?: boolean;
}

export default function AdvancedTripSearch({
  onSearch,
  loading,
}: AdvancedTripSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AdvancedSearchForm>({
    resolver: zodResolver(advancedSearchSchema),
    defaultValues: {
      sortBy: 'date',
      sortOrder: 'asc',
    },
  });

  // Watch specific fields instead of all form values to avoid infinite re-renders
  const destination = watch('destination');
  const origin = watch('origin');
  const dateFrom = watch('dateFrom');
  const dateTo = watch('dateTo');
  const minSeats = watch('minSeats');

  useEffect(() => {
    // Track active filters for display
    const filters = [];
    if (destination) filters.push('destination');
    if (origin) filters.push('origin');
    if (dateFrom || dateTo) filters.push('date');
    if (minSeats) filters.push('seats');
    setActiveFilters(filters);
  }, [destination, origin, dateFrom, dateTo, minSeats]);

  const onSubmit = (data: AdvancedSearchForm) => {
    // Remove empty string values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(
        ([_, value]) => value !== undefined && value !== '' && value !== null
      )
    );
    onSearch(cleanData);
  };

  const clearFilters = () => {
    reset({
      searchQuery: '',
      destination: '',
      origin: '',
      dateFrom: '',
      dateTo: '',
      minSeats: undefined,
      sortBy: 'date',
      sortOrder: 'asc',
    });
    onSearch({});
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Basic Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('searchQuery')}
                  type="text"
                  placeholder="Search destinations, notes, or locations..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center px-4 py-3 border rounded-lg transition-colors ${
                  isExpanded || activeFilters.length > 0
                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
                Filters
                {activeFilters.length > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                    {activeFilters.length}
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 ml-2" />
                )}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </div>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {isExpanded && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Destination Filter */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  Destination
                </label>
                <input
                  {...register('destination')}
                  type="text"
                  placeholder="e.g., School, Downtown..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Origin Filter */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  Origin/Pickup Area
                </label>
                <input
                  {...register('origin')}
                  type="text"
                  placeholder="e.g., Neighborhood, Street..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Min Seats Filter */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  Min Available Seats
                </label>
                <select
                  {...register('minSeats', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  From Date
                </label>
                <input
                  {...register('dateFrom')}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  To Date
                </label>
                <input
                  {...register('dateTo')}
                  type="date"
                  min={dateFrom || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Sort Options */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">
                    Sort by:
                  </label>
                  <select
                    {...register('sortBy')}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="date">Date</option>
                    <option value="destination">Destination</option>
                    <option value="availableSeats">Available Seats</option>
                    <option value="departureTime">Departure Time</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">
                    Order:
                  </label>
                  <select
                    {...register('sortOrder')}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {activeFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {activeFilters.length > 0 && !isExpanded && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {activeFilters.map(filter => (
                <span
                  key={filter}
                  className="inline-flex items-center px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full"
                >
                  {filter}
                </span>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
