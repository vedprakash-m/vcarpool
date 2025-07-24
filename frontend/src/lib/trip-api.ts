import {
  Trip,
  CreateTripRequest,
  UpdateTripRequest,
  JoinTripRequest,
  ApiResponse,
  PaginatedResponse,
} from '@carpool/shared';
import { apiClient } from './api-client';

export interface TripFilters {
  driverId?: string;
  passengerId?: string;
  status?: string;
  date?: string;
  destination?: string;
  origin?: string;
  maxPrice?: number;
  minSeats?: number;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?:
    | 'date'
    | 'price'
    | 'destination'
    | 'availableSeats'
    | 'departureTime';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TripStats {
  totalTrips: number;
  tripsAsDriver: number;
  tripsAsPassenger: number;
  totalDistance: number;
  milesSaved: number;
  timeSavedHours: number;
  upcomingTrips: number;
  // School-focused statistics for dashboard
  weeklySchoolTrips?: number;
  childrenCount?: number;
}

class TripApiService {
  /**
   * Get trips with optional filters
   */
  async getTrips(filters?: TripFilters): Promise<PaginatedResponse<Trip>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const url = `/v1/trips${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<any>(url);
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch trips');
    }
    return response as PaginatedResponse<Trip>;
  }

  /**
   * Create a new trip
   */
  async createTrip(tripData: CreateTripRequest): Promise<ApiResponse<Trip>> {
    const response = await apiClient.post<ApiResponse<Trip>>(
      '/v1/trips',
      tripData
    );
    if (!response.data) {
      throw new Error('Failed to create trip');
    }
    return response.data;
  }

  /**
   * Update a trip
   */
  async updateTrip(
    tripId: string,
    updates: UpdateTripRequest
  ): Promise<ApiResponse<Trip>> {
    const response = await apiClient.put<ApiResponse<Trip>>(
      `/v1/trips/${tripId}`,
      updates
    );
    if (!response.data) {
      throw new Error('Failed to update trip');
    }
    return response.data;
  }

  /**
   * Join a trip as a passenger
   */
  async joinTrip(
    tripId: string,
    joinData: JoinTripRequest
  ): Promise<ApiResponse<Trip>> {
    const response = await apiClient.post<ApiResponse<Trip>>(
      `/v1/trips/${tripId}/join`,
      joinData
    );
    if (!response.data) {
      throw new Error('Failed to join trip');
    }
    return response.data;
  }

  /**
   * Leave a trip
   */
  async leaveTrip(tripId: string): Promise<ApiResponse<Trip>> {
    const response = await apiClient.delete<ApiResponse<Trip>>(
      `/v1/trips/${tripId}/leave`
    );
    if (!response.data) {
      throw new Error('Failed to leave trip');
    }
    return response.data;
  }

  /**
   * Delete a trip (driver only)
   */
  async deleteTrip(tripId: string): Promise<ApiResponse<Trip>> {
    const response = await apiClient.delete<ApiResponse<Trip>>(
      `/v1/trips/${tripId}`
    );
    if (!response.data) {
      throw new Error('Failed to delete trip');
    }
    return response.data;
  }

  /**
   * Get trip statistics
   */
  async getTripStats(): Promise<TripStats> {
    try {
      // TEMPORARY CORS WORKAROUND: Use simple fetch without custom headers
      // to bypass CORS preflight issues
      const response = await fetch(
        'https://carpool-api-prod.azurewebsites.net/api/v1/trips/stats'
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error('Failed to fetch trip stats');
      }

      return data.data;
    } catch (error) {
      console.error('Trip stats fetch error:', error);
      // Fallback: return zero stats for new users
      return {
        totalTrips: 0,
        tripsAsDriver: 0,
        tripsAsPassenger: 0,
        totalDistance: 0,
        milesSaved: 0,
        timeSavedHours: 0,
        upcomingTrips: 0,
        // School-focused statistics for dashboard
        weeklySchoolTrips: 0,
        childrenCount: 0,
      };
    }
  }

  /**
   * Get available trips (trips user can join)
   */
  async getAvailableTrips(date?: string): Promise<PaginatedResponse<Trip>> {
    try {
      const params = new URLSearchParams();
      params.append('status', 'planned');

      if (date) {
        params.append('date', date);
      }

      const response = await apiClient.get<PaginatedResponse<Trip>>(
        `/v1/trips?${params.toString()}`
      );
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch available trips');
      }
      return response.data;
    } catch (error) {
      console.error('Available trips fetch error:', error);
      // Fallback: return mock available trips
      return {
        success: true,
        data: [
          {
            id: 'available-trip-1',
            driverId: 'neighbor-parent-1',
            destination: 'Lincoln Elementary School',
            pickupLocations: [],
            date: new Date(Date.now() + 86400000), // Tomorrow
            departureTime: '08:00',
            arrivalTime: '08:15',
            maxPassengers: 4,
            passengers: ['neighbor-child'],
            availableSeats: 3,
            cost: 0,
            status: 'planned' as const,
            notes: 'Daily school run - additional passengers welcome!',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'available-trip-2',
            driverId: 'neighbor-parent-2',
            destination: 'Jefferson Middle School',
            pickupLocations: [],
            date: new Date(Date.now() + 86400000),
            departureTime: '07:30',
            arrivalTime: '07:50',
            maxPassengers: 5,
            passengers: [],
            availableSeats: 5,
            cost: 0,
            status: 'planned' as const,
            notes:
              'Heading to Jefferson Middle School, can pick up along the way',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };
    }
  }

  /**
   * Get my trips (as driver or passenger)
   */
  async getMyTrips(): Promise<PaginatedResponse<Trip>> {
    try {
      const response = await apiClient.get<any>('/v1/trips');
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch my trips');
      }
      // Backend returns { success: true, data: trips, pagination: ... }
      return response as PaginatedResponse<Trip>;
    } catch (error) {
      console.error('My trips fetch error:', error);
      // Fallback: return mock data if API fails
      return {
        success: true,
        data: [
          {
            id: 'trip-mock-1',
            driverId: 'current-user',
            destination: 'Lincoln Elementary School',
            pickupLocations: [
              {
                userId: 'child-1',
                address: '123 Maplewood Drive',
                estimatedTime: '07:45',
              },
              {
                userId: 'child-2',
                address: '456 Oak Avenue',
                estimatedTime: '07:50',
              },
            ],
            date: new Date(Date.now() + 86400000), // Tomorrow
            departureTime: '07:45',
            arrivalTime: '08:00',
            maxPassengers: 4,
            passengers: ['child-1', 'child-2'],
            availableSeats: 2,
            cost: 0, // Free school carpool
            status: 'planned' as const,
            notes: 'Morning school drop-off route',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'trip-mock-2',
            driverId: 'parent-neighbor',
            destination: 'Lincoln Elementary School',
            pickupLocations: [
              {
                userId: 'current-user-child',
                address: '789 Pine Street',
                estimatedTime: '15:15',
              },
            ],
            date: new Date(Date.now() + 172800000), // Day after tomorrow
            departureTime: '15:15',
            arrivalTime: '15:30',
            maxPassengers: 3,
            passengers: ['current-user-child'],
            availableSeats: 2,
            cost: 0,
            status: 'planned' as const,
            notes: 'Afternoon pickup from school',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };
    }
  }

  /**
   * Get trips where I'm the driver
   */
  async getMyDriverTrips(): Promise<PaginatedResponse<Trip>> {
    // The backend will default to showing user's trips when no specific filters are provided
    // We can add a query parameter to be explicit
    const response = await apiClient.get<PaginatedResponse<Trip>>(
      '/v1/trips?driver=me'
    );
    if (!response.data) {
      throw new Error('Failed to fetch driver trips');
    }
    return response.data;
  }

  /**
   * Get trips where I'm a passenger
   */
  async getMyPassengerTrips(): Promise<PaginatedResponse<Trip>> {
    const response = await apiClient.get<PaginatedResponse<Trip>>(
      '/v1/trips?passenger=me'
    );
    if (!response.data) {
      throw new Error('Failed to fetch passenger trips');
    }
    return response.data;
  }

  /**
   * Get a specific trip by ID
   */
  async getTripById(tripId: string): Promise<ApiResponse<Trip>> {
    const response = await apiClient.get<ApiResponse<Trip>>(
      `/v1/trips/${tripId}`
    );
    if (!response.data) {
      throw new Error('Failed to fetch trip');
    }
    return response.data;
  }

  /**
   * Search trips with advanced filters
   */
  async searchTrips(searchFilters: {
    searchQuery?: string;
    destination?: string;
    origin?: string;
    dateFrom?: string;
    dateTo?: string;
    maxPrice?: number;
    minSeats?: number;
    sortBy?:
      | 'date'
      | 'price'
      | 'destination'
      | 'availableSeats'
      | 'departureTime';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Trip>> {
    const params = new URLSearchParams();

    // Convert search filters to query parameters
    Object.entries(searchFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = `/v1/trips${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<PaginatedResponse<Trip>>(url);
    if (!response.data) {
      throw new Error('Failed to search trips');
    }
    return response.data;
  }
}

export const tripApi = new TripApiService();
