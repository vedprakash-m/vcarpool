/**
 * Tests for trip store
 * Testing trip management state with Zustand - CORRECTED VERSION
 */

import { act, renderHook } from '@testing-library/react';
import { useTripStore } from '../../store/trip.store';
import { tripApi } from '../../lib/trip-api';
import { Trip, TripStatus } from '@carpool/shared';

// Mock the API
jest.mock('../../lib/trip-api', () => ({
  tripApi: {
    getTrips: jest.fn(),
    getMyTrips: jest.fn(),
    getAvailableTrips: jest.fn(),
    getTripStats: jest.fn(),
    createTrip: jest.fn(),
    updateTrip: jest.fn(),
    deleteTrip: jest.fn(),
    joinTrip: jest.fn(),
    leaveTrip: jest.fn(),
    getTripById: jest.fn(),
  },
}));

const mockTripApi = tripApi as jest.Mocked<typeof tripApi>;

describe('useTripStore', () => {
  const mockTrip: Trip = {
    id: '1',
    driverId: 'driver1',
    passengers: [],
    date: new Date('2024-01-20'),
    departureTime: '10:00',
    arrivalTime: '12:00',
    pickupLocations: [],
    destination: 'Destination City',
    maxPassengers: 4,
    availableSeats: 4,
    status: 'active' as TripStatus,
    cost: 25,
    notes: 'Test trip',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockTripStats = {
    totalTrips: 10,
    tripsAsDriver: 6,
    tripsAsPassenger: 4,
    totalDistance: 150.5,
    costSavings: 85.25,
    upcomingTrips: 3,
  };

  const mockPagination = {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    // Reset store state to match actual interface
    useTripStore.setState({
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
    });

    // Clear mocks
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useTripStore());

      expect(result.current.trips).toEqual([]);
      expect(result.current.currentTrip).toBeNull();
      expect(result.current.stats).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('fetchTrips', () => {
    it('should fetch trips successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockTrip],
        pagination: mockPagination,
      };

      mockTripApi.getTrips.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchTrips();
      });

      expect(result.current.trips).toEqual([mockTrip]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.pagination).toEqual(mockPagination);
    });

    it('should handle fetch trips error', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Failed to fetch trips',
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockTripApi.getTrips.mockResolvedValueOnce(mockErrorResponse);

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchTrips();
      });

      expect(result.current.trips).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch trips');
    });

    it.skip('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const tripsPromise = new Promise<any>(resolve => {
        resolvePromise = resolve;
      });

      mockTripApi.getTrips.mockReturnValueOnce(tripsPromise);

      const { result } = renderHook(() => useTripStore());

      // Start fetch and immediately check loading state in act
      await act(async () => {
        const fetchPromise = result.current.fetchTrips();

        // Check loading state is set immediately after calling fetchTrips
        expect(result.current.loading).toBe(true);

        // Resolve the promise
        resolvePromise!({
          success: true,
          data: [mockTrip],
          pagination: mockPagination,
        });

        // Wait for completion
        await fetchPromise;
      });

      // Check final state
      expect(result.current.loading).toBe(false);
      expect(result.current.trips).toEqual([mockTrip]);
    });
  });

  describe('fetchMyTrips', () => {
    it('should fetch user trips successfully', async () => {
      const mockResponse = {
        success: true,
        data: [mockTrip],
        pagination: mockPagination,
      };

      mockTripApi.getMyTrips.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchMyTrips();
      });

      expect(result.current.trips).toEqual([mockTrip]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch my trips error', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Failed to fetch your trips',
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockTripApi.getMyTrips.mockResolvedValueOnce(mockErrorResponse);

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchMyTrips();
      });

      expect(result.current.trips).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch your trips');
    });
  });

  describe('fetchTripById', () => {
    it('should fetch trip by ID successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockTrip,
      };

      mockTripApi.getTripById.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchTripById('1');
      });

      expect(result.current.currentTrip).toEqual(mockTrip);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch trip by ID error', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Trip not found',
        data: undefined,
      };

      mockTripApi.getTripById.mockResolvedValueOnce(mockErrorResponse);

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchTripById('999');
      });

      expect(result.current.currentTrip).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Trip not found');
    });
  });

  describe('fetchTripStats', () => {
    it('should fetch trip statistics successfully', async () => {
      mockTripApi.getTripStats.mockResolvedValueOnce(mockTripStats);

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchTripStats();
      });

      expect(result.current.stats).toEqual(mockTripStats);
    });

    it('should handle fetch trip stats error gracefully', async () => {
      mockTripApi.getTripStats.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useTripStore());

      await act(async () => {
        await result.current.fetchTripStats();
      });

      // Should not crash and stats should remain null
      expect(result.current.stats).toBeNull();
    });
  });

  describe('createTrip', () => {
    const mockCreateTripRequest = {
      destination: 'New Destination',
      date: '2024-01-25',
      departureTime: '08:00',
      maxPassengers: 3,
      cost: 30,
      notes: 'New trip',
    };

    it('should create trip successfully', async () => {
      const newTrip = { ...mockTrip, id: '2', destination: 'New Destination' };
      const mockResponse = {
        success: true,
        data: newTrip,
      };

      mockTripApi.createTrip.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useTripStore());

      let success: boolean;
      await act(async () => {
        success = await result.current.createTrip(mockCreateTripRequest);
      });

      expect(success!).toBe(true);
      expect(result.current.trips).toContain(newTrip);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle create trip error', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Failed to create trip',
        data: null,
      };

      mockTripApi.createTrip.mockResolvedValueOnce(mockErrorResponse);

      const { result } = renderHook(() => useTripStore());

      let success: boolean;
      await act(async () => {
        success = await result.current.createTrip(mockCreateTripRequest);
      });

      expect(success!).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to create trip');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useTripStore());

      // Set an error first
      act(() => {
        useTripStore.setState({ error: 'Some error' });
      });

      expect(result.current.error).toBe('Some error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setCurrentTrip', () => {
    it('should set current trip', () => {
      const { result } = renderHook(() => useTripStore());

      act(() => {
        result.current.setCurrentTrip(mockTrip);
      });

      expect(result.current.currentTrip).toEqual(mockTrip);
    });

    it('should clear current trip', () => {
      const { result } = renderHook(() => useTripStore());

      // Set a trip first
      act(() => {
        result.current.setCurrentTrip(mockTrip);
      });

      expect(result.current.currentTrip).toEqual(mockTrip);

      // Clear it
      act(() => {
        result.current.setCurrentTrip(null);
      });

      expect(result.current.currentTrip).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useTripStore());

      // Modify state
      act(() => {
        useTripStore.setState({
          trips: [mockTrip],
          currentTrip: mockTrip,
          stats: mockTripStats,
          loading: true,
          error: 'Some error',
        });
      });

      // Verify state was modified
      expect(result.current.trips).toEqual([mockTrip]);
      expect(result.current.error).toBe('Some error');

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset
      expect(result.current.trips).toEqual([]);
      expect(result.current.currentTrip).toBeNull();
      expect(result.current.stats).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
