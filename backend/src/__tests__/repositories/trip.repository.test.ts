/**
 * Trip Repository Test Suite - Comprehensive Coverage
 *
 * Testing all repository methods to improve coverage from 0% to 80%+
 * Includes error handling, query parameters, and edge cases
 */

import { TripRepository } from '../../repositories/trip.repository';
import { Trip, TripStatus } from '@carpool/shared';

// Mock the CosmosDB container
const mockContainer = {
  items: {
    create: jest.fn(),
    query: jest.fn().mockReturnValue({
      fetchAll: jest.fn(),
    }),
  },
  item: jest.fn().mockReturnValue({
    read: jest.fn(),
    replace: jest.fn(),
    delete: jest.fn(),
  }),
};

describe('TripRepository', () => {
  let tripRepository: TripRepository;

  beforeEach(() => {
    tripRepository = new TripRepository(mockContainer as any);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a trip successfully', async () => {
      const mockTrip: Trip = {
        id: 'trip-123',
        driverId: 'driver-123',
        passengers: [],
        date: new Date('2024-12-01'),
        departureTime: '08:00',
        arrivalTime: '08:30',
        pickupLocations: [],
        destination: 'School',
        maxPassengers: 4,
        availableSeats: 4,
        status: 'planned' as TripStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContainer.items.create.mockResolvedValue({
        resource: mockTrip,
      });

      const result = await tripRepository.create(mockTrip);

      expect(result).toEqual(mockTrip);
      expect(mockContainer.items.create).toHaveBeenCalledWith(mockTrip);
    });

    it('should handle create errors', async () => {
      const mockTrip = { id: 'trip-123' };
      const createError = new Error('Database connection failed');

      mockContainer.items.create.mockRejectedValue(createError);

      await expect(tripRepository.create(mockTrip as any)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('findById', () => {
    it('should find trip by id successfully', async () => {
      const mockTrip = {
        id: 'trip-123',
        driverId: 'driver-123',
        status: 'planned',
      };

      mockContainer.item.mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: mockTrip,
        }),
      });

      const result = await tripRepository.findById('trip-123');

      expect(result).toEqual(mockTrip);
      expect(mockContainer.item).toHaveBeenCalledWith('trip-123');
    });

    it('should return null when trip not found (404)', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).code = 404;

      mockContainer.item.mockReturnValue({
        read: jest.fn().mockRejectedValue(notFoundError),
      });

      const result = await tripRepository.findById('nonexistent-trip');

      expect(result).toBeNull();
    });

    it('should return null when resource is undefined', async () => {
      mockContainer.item.mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: undefined,
        }),
      });

      const result = await tripRepository.findById('trip-123');

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const serverError = new Error('Internal server error');
      (serverError as any).code = 500;

      mockContainer.item.mockReturnValue({
        read: jest.fn().mockRejectedValue(serverError),
      });

      await expect(tripRepository.findById('trip-123')).rejects.toThrow('Internal server error');
    });
  });

  describe('update', () => {
    it('should update trip successfully', async () => {
      const mockTrip: Trip = {
        id: 'trip-123',
        driverId: 'driver-123',
        passengers: ['passenger-456'],
        date: new Date('2024-12-01'),
        departureTime: '08:00',
        arrivalTime: '08:30',
        pickupLocations: [],
        destination: 'Updated School',
        maxPassengers: 4,
        availableSeats: 3,
        status: 'active' as TripStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContainer.item.mockReturnValue({
        replace: jest.fn().mockResolvedValue({
          resource: mockTrip,
        }),
      });

      const result = await tripRepository.update('trip-123', mockTrip);

      expect(result).toEqual(mockTrip);
      expect(mockContainer.item).toHaveBeenCalledWith('trip-123');
    });

    it('should handle update errors', async () => {
      const updateError = new Error('Update failed');

      mockContainer.item.mockReturnValue({
        replace: jest.fn().mockRejectedValue(updateError),
      });

      await expect(tripRepository.update('trip-123', {} as any)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('should delete trip successfully', async () => {
      mockContainer.item.mockReturnValue({
        delete: jest.fn().mockResolvedValue({}),
      });

      await tripRepository.delete('trip-123');

      expect(mockContainer.item).toHaveBeenCalledWith('trip-123');
      expect(mockContainer.item().delete).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      const deleteError = new Error('Delete failed');

      mockContainer.item.mockReturnValue({
        delete: jest.fn().mockRejectedValue(deleteError),
      });

      await expect(tripRepository.delete('trip-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('findDriverTrips', () => {
    it('should find trips by driver id', async () => {
      const mockTrips = [
        { id: 'trip-1', driverId: 'driver-123', date: '2024-12-01' },
        { id: 'trip-2', driverId: 'driver-123', date: '2024-12-02' },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: mockTrips,
        }),
      });

      const result = await tripRepository.findDriverTrips('driver-123');

      expect(result).toEqual(mockTrips);
      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: 'SELECT * FROM c WHERE c.driverId = @driverId ORDER BY c.date DESC',
        parameters: [{ name: '@driverId', value: 'driver-123' }],
      });
    });

    it('should return empty array when no trips found', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      const result = await tripRepository.findDriverTrips('driver-123');

      expect(result).toEqual([]);
    });

    it('should handle query errors', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockRejectedValue(new Error('Query failed')),
      });

      await expect(tripRepository.findDriverTrips('driver-123')).rejects.toThrow('Query failed');
    });
  });

  describe('findPassengerTrips', () => {
    it('should find trips by passenger id', async () => {
      const mockTrips = [
        { id: 'trip-1', passengers: ['passenger-123'], date: '2024-12-01' },
        { id: 'trip-2', passengers: ['passenger-123', 'passenger-456'], date: '2024-12-02' },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: mockTrips,
        }),
      });

      const result = await tripRepository.findPassengerTrips('passenger-123');

      expect(result).toEqual(mockTrips);
      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query:
          'SELECT * FROM c WHERE ARRAY_CONTAINS(c.passengers, @passengerId) ORDER BY c.date DESC',
        parameters: [{ name: '@passengerId', value: 'passenger-123' }],
      });
    });

    it('should return empty array when no passenger trips found', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      const result = await tripRepository.findPassengerTrips('passenger-123');

      expect(result).toEqual([]);
    });

    it('should handle passenger query errors', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockRejectedValue(new Error('Passenger query failed')),
      });

      await expect(tripRepository.findPassengerTrips('passenger-123')).rejects.toThrow(
        'Passenger query failed',
      );
    });
  });

  describe('findUpcomingTrips', () => {
    it('should find upcoming trips for user as driver and passenger', async () => {
      const mockTrips = [
        {
          id: 'trip-1',
          driverId: 'user-123',
          date: '2024-12-15',
          departureTime: '08:00',
          status: 'planned',
        },
        {
          id: 'trip-2',
          passengers: ['user-123'],
          date: '2024-12-16',
          departureTime: '08:30',
          status: 'active',
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: mockTrips,
        }),
      });

      const result = await tripRepository.findUpcomingTrips('user-123');

      expect(result).toEqual(mockTrips);
      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: expect.stringContaining(
          'c.driverId = @userId OR ARRAY_CONTAINS(c.passengers, @userId)',
        ),
        parameters: expect.arrayContaining([
          { name: '@userId', value: 'user-123' },
          { name: '@today', value: expect.any(String) },
        ]),
      });
    });

    it('should filter by today date correctly', async () => {
      const today = new Date().toISOString().split('T')[0];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      await tripRepository.findUpcomingTrips('user-123');

      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: expect.stringContaining('c.date >= @today'),
        parameters: expect.arrayContaining([{ name: '@today', value: today }]),
      });
    });

    it('should handle upcoming trips query errors', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockRejectedValue(new Error('Upcoming trips query failed')),
      });

      await expect(tripRepository.findUpcomingTrips('user-123')).rejects.toThrow(
        'Upcoming trips query failed',
      );
    });
  });

  describe('findAvailableTrips', () => {
    it('should find available trips without date filter', async () => {
      const mockTrips = [
        {
          id: 'trip-1',
          driverId: 'other-driver',
          availableSeats: 2,
          status: 'planned',
          passengers: [],
          date: '2024-12-15',
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: mockTrips,
        }),
      });

      const result = await tripRepository.findAvailableTrips('user-123');

      expect(result).toEqual(mockTrips);
      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: expect.stringContaining('c.availableSeats > 0'),
        parameters: expect.arrayContaining([
          { name: '@userId', value: 'user-123' },
          { name: '@today', value: expect.any(String) },
        ]),
      });
    });

    it('should find available trips with specific date filter', async () => {
      const specificDate = '2024-12-15';
      const mockTrips = [
        {
          id: 'trip-1',
          driverId: 'other-driver',
          availableSeats: 3,
          status: 'planned',
          date: specificDate,
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: mockTrips,
        }),
      });

      const result = await tripRepository.findAvailableTrips('user-123', specificDate);

      expect(result).toEqual(mockTrips);
      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: expect.stringContaining('c.date = @date'),
        parameters: expect.arrayContaining([
          { name: '@userId', value: 'user-123' },
          { name: '@date', value: specificDate },
        ]),
      });
    });

    it('should exclude user as driver and passenger', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      await tripRepository.findAvailableTrips('user-123');

      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: expect.stringContaining('c.driverId != @userId'),
        parameters: expect.any(Array),
      });

      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: expect.stringContaining('NOT ARRAY_CONTAINS(c.passengers, @userId)'),
        parameters: expect.any(Array),
      });
    });

    it('should handle available trips query errors', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockRejectedValue(new Error('Available trips query failed')),
      });

      await expect(tripRepository.findAvailableTrips('user-123')).rejects.toThrow(
        'Available trips query failed',
      );
    });
  });

  describe('query', () => {
    it('should execute custom query', async () => {
      const customQuerySpec = {
        query: 'SELECT * FROM c WHERE c.customField = @value',
        parameters: [{ name: '@value', value: 'test' }],
      };

      const mockResults = [
        { id: 'result-1', customField: 'test' },
        { id: 'result-2', customField: 'test' },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: mockResults,
        }),
      });

      const result = await tripRepository.query(customQuerySpec);

      expect(result).toEqual(mockResults);
      expect(mockContainer.items.query).toHaveBeenCalledWith(customQuerySpec);
    });

    it('should handle custom query errors', async () => {
      const customQuerySpec = {
        query: 'INVALID SQL',
        parameters: [],
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockRejectedValue(new Error('Invalid query syntax')),
      });

      await expect(tripRepository.query(customQuerySpec)).rejects.toThrow('Invalid query syntax');
    });

    it('should return empty array for query with no results', async () => {
      const customQuerySpec = {
        query: 'SELECT * FROM c WHERE c.nonexistent = @value',
        parameters: [{ name: '@value', value: 'nothing' }],
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      const result = await tripRepository.query(customQuerySpec);

      expect(result).toEqual([]);
    });
  });
});
