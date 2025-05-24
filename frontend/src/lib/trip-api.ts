import { 
  Trip, 
  CreateTripRequest, 
  UpdateTripRequest, 
  JoinTripRequest,
  ApiResponse, 
  PaginatedResponse 
} from '@vcarpool/shared';
import { apiClient } from './api-client';

export interface TripFilters {
  driverId?: string;
  passengerId?: string;
  status?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export interface TripStats {
  totalTrips: number;
  tripsAsDriver: number;
  tripsAsPassenger: number;
  totalDistance: number;
  costSavings: number;
  upcomingTrips: number;
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
    const url = `/trips${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<PaginatedResponse<Trip>>(url);
    return response.data;
  }

  /**
   * Create a new trip
   */
  async createTrip(tripData: CreateTripRequest): Promise<ApiResponse<Trip>> {
    const response = await apiClient.post<ApiResponse<Trip>>('/trips', tripData);
    return response.data;
  }

  /**
   * Update a trip
   */
  async updateTrip(tripId: string, updates: UpdateTripRequest): Promise<ApiResponse<Trip>> {
    const response = await apiClient.put<ApiResponse<Trip>>(`/trips/${tripId}`, updates);
    return response.data;
  }

  /**
   * Join a trip as a passenger
   */
  async joinTrip(tripId: string, joinData: JoinTripRequest): Promise<ApiResponse<Trip>> {
    const response = await apiClient.post<ApiResponse<Trip>>(`/trips/${tripId}/join`, joinData);
    return response.data;
  }

  /**
   * Leave a trip
   */
  async leaveTrip(tripId: string): Promise<ApiResponse<Trip>> {
    const response = await apiClient.delete<ApiResponse<Trip>>(`/trips/${tripId}/leave`);
    return response.data;
  }

  /**
   * Get trip statistics
   */
  async getTripStats(): Promise<ApiResponse<TripStats>> {
    const response = await apiClient.get<ApiResponse<TripStats>>('/trips/stats');
    return response.data;
  }

  /**
   * Get available trips (trips user can join)
   */
  async getAvailableTrips(date?: string): Promise<PaginatedResponse<Trip>> {
    const params = new URLSearchParams();
    params.append('status', 'planned');
    
    if (date) {
      params.append('date', date);
    }

    const response = await apiClient.get<PaginatedResponse<Trip>>(`/trips?${params.toString()}`);
    return response.data;
  }

  /**
   * Get my trips (as driver or passenger)
   */
  async getMyTrips(): Promise<PaginatedResponse<Trip>> {
    const response = await apiClient.get<PaginatedResponse<Trip>>('/trips');
    return response.data;
  }

  /**
   * Get trips where I'm the driver
   */
  async getMyDriverTrips(): Promise<PaginatedResponse<Trip>> {
    // The backend will default to showing user's trips when no specific filters are provided
    // We can add a query parameter to be explicit
    const response = await apiClient.get<PaginatedResponse<Trip>>('/trips?driver=me');
    return response.data;
  }

  /**
   * Get trips where I'm a passenger
   */
  async getMyPassengerTrips(): Promise<PaginatedResponse<Trip>> {
    const response = await apiClient.get<PaginatedResponse<Trip>>('/trips?passenger=me');
    return response.data;
  }
}

export const tripApi = new TripApiService();
