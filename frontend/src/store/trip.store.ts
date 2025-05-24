import { create } from 'zustand';
import { Trip, CreateTripRequest, UpdateTripRequest, JoinTripRequest } from '@vcarpool/shared';
import { tripApi, TripFilters, TripStats } from '../lib/trip-api';

interface TripStore {
  // State
  trips: Trip[];
  currentTrip: Trip | null;
  stats: TripStats | null;
  loading: boolean;
  error: string | null;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  fetchTrips: (filters?: TripFilters) => Promise<void>;
  fetchMyTrips: () => Promise<void>;
  fetchAvailableTrips: (date?: string) => Promise<void>;
  fetchTripStats: () => Promise<void>;
  createTrip: (tripData: CreateTripRequest) => Promise<boolean>;
  updateTrip: (tripId: string, updates: UpdateTripRequest) => Promise<boolean>;
  joinTrip: (tripId: string, pickupLocation: string) => Promise<boolean>;
  leaveTrip: (tripId: string) => Promise<boolean>;
  setCurrentTrip: (trip: Trip | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  trips: [],
  currentTrip: null,
  stats: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

export const useTripStore = create<TripStore>((set, get) => ({
  ...initialState,

  fetchTrips: async (filters) => {
    set({ loading: true, error: null });
    try {
      const response = await tripApi.getTrips(filters);
      if (response.success && response.data && response.pagination) {
        set({
          trips: response.data,
          pagination: response.pagination,
          loading: false,
        });
      } else {
        set({ error: response.error || 'Failed to fetch trips', loading: false });
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      set({ error: 'Failed to fetch trips', loading: false });
    }
  },

  fetchMyTrips: async () => {
    set({ loading: true, error: null });
    try {
      const response = await tripApi.getMyTrips();
      if (response.success && response.data && response.pagination) {
        set({
          trips: response.data,
          pagination: response.pagination,
          loading: false,
        });
      } else {
        set({ error: response.error || 'Failed to fetch your trips', loading: false });
      }
    } catch (error) {
      console.error('Error fetching my trips:', error);
      set({ error: 'Failed to fetch your trips', loading: false });
    }
  },

  fetchAvailableTrips: async (date) => {
    set({ loading: true, error: null });
    try {
      const response = await tripApi.getAvailableTrips(date);
      if (response.success && response.data && response.pagination) {
        set({
          trips: response.data,
          pagination: response.pagination,
          loading: false,
        });
      } else {
        set({ error: response.error || 'Failed to fetch available trips', loading: false });
      }
    } catch (error) {
      console.error('Error fetching available trips:', error);
      set({ error: 'Failed to fetch available trips', loading: false });
    }
  },

  fetchTripStats: async () => {
    try {
      const response = await tripApi.getTripStats();
      if (response.success && response.data) {
        set({ stats: response.data });
      }
    } catch (error) {
      console.error('Error fetching trip stats:', error);
    }
  },

  createTrip: async (tripData) => {
    set({ loading: true, error: null });
    try {
      const response = await tripApi.createTrip(tripData);
      if (response.success && response.data) {
        // Add the new trip to the beginning of the list
        const currentTrips = get().trips;
        set({
          trips: [response.data, ...currentTrips],
          loading: false,
        });
        return true;
      } else {
        set({ error: response.error || 'Failed to create trip', loading: false });
        return false;
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      set({ error: 'Failed to create trip', loading: false });
      return false;
    }
  },

  updateTrip: async (tripId, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await tripApi.updateTrip(tripId, updates);
      if (response.success && response.data) {
        // Update the trip in the list
        const currentTrips = get().trips;
        const updatedTrips = currentTrips.map(trip =>
          trip.id === tripId ? response.data! : trip
        );
        set({
          trips: updatedTrips,
          currentTrip: get().currentTrip?.id === tripId ? response.data : get().currentTrip,
          loading: false,
        });
        return true;
      } else {
        set({ error: response.error || 'Failed to update trip', loading: false });
        return false;
      }
    } catch (error) {
      console.error('Error updating trip:', error);
      set({ error: 'Failed to update trip', loading: false });
      return false;
    }
  },

  joinTrip: async (tripId, pickupLocation) => {
    set({ loading: true, error: null });
    try {
      const response = await tripApi.joinTrip(tripId, { pickupLocation });
      if (response.success && response.data) {
        // Update the trip in the list
        const currentTrips = get().trips;
        const updatedTrips = currentTrips.map(trip =>
          trip.id === tripId ? response.data! : trip
        );
        set({
          trips: updatedTrips,
          loading: false,
        });
        return true;
      } else {
        set({ error: response.error || 'Failed to join trip', loading: false });
        return false;
      }
    } catch (error) {
      console.error('Error joining trip:', error);
      set({ error: 'Failed to join trip', loading: false });
      return false;
    }
  },

  leaveTrip: async (tripId) => {
    set({ loading: true, error: null });
    try {
      const response = await tripApi.leaveTrip(tripId);
      if (response.success && response.data) {
        // Update the trip in the list
        const currentTrips = get().trips;
        const updatedTrips = currentTrips.map(trip =>
          trip.id === tripId ? response.data! : trip
        );
        set({
          trips: updatedTrips,
          loading: false,
        });
        return true;
      } else {
        set({ error: response.error || 'Failed to leave trip', loading: false });
        return false;
      }
    } catch (error) {
      console.error('Error leaving trip:', error);
      set({ error: 'Failed to leave trip', loading: false });
      return false;
    }
  },

  setCurrentTrip: (trip) => {
    set({ currentTrip: trip });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));
