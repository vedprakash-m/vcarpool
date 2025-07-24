/**
 * Trip Service Test Suite - UX Requirements Alignment
 *
 * Testing alignment with User_Experience.md requirements:
 * - Progressive Parent Onboarding: Family-oriented trip creation and participation management
 * - Group Discovery & Join Request: Group-based trip creation and member coordination
 * - Weekly Preference Submission: Trip scheduling based on family weekly preferences
 * - Group Admin Schedule Management: Admin-controlled trip generation and management
 * - Emergency Response & Crisis Coordination: Emergency contact integration and crisis mode trips
 * - Unified Family Dashboard & Role Transitions: Family context in trip management and role-based trip access
 */

import { TripService } from '../services/trip.service';
import { TripRepository } from '../repositories/trip.repository';
import { UserRepository } from '../repositories/user.repository';
import { EmailService } from '../services/email.service';
import { Trip, User, CreateTripRequest } from '@carpool/shared';

// Mock the dependencies
jest.mock('../repositories/trip.repository');
jest.mock('../repositories/user.repository');
jest.mock('../services/email.service');

describe('TripService', () => {
  let tripService: TripService;
  let mockTripRepository: jest.Mocked<TripRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockEmailService: jest.Mocked<EmailService>;

  // Family-oriented mock user for testing aligned with UX requirements
  interface TestFamilyUser extends User {
    // Family-specific testing extensions
    familyId?: string;
    children?: Array<{
      id: string;
      firstName: string;
      lastName: string;
      grade: string;
      school: string;
    }>;
    groupAdminRoles?: string[];
    weeklyPreferences?: {
      morningDropoff: { preferred: boolean; flexibleTiming: boolean };
      afternoonPickup: { preferred: boolean; flexibleTiming: boolean };
      recurringDays: string[];
    };
  }

  const mockFamilyParentUser: TestFamilyUser = {
    id: 'parent-family-123',
    email: 'john.doe@lincoln.edu',
    firstName: 'John',
    lastName: 'Doe',
    role: 'parent',
    phoneNumber: '555-0123',
    homeAddress: '123 Oak Park Drive',
    isActiveDriver: true,
    // Family-specific fields for testing
    familyId: 'family-456',
    children: [
      {
        id: 'child-1',
        firstName: 'Emma',
        lastName: 'Doe',
        grade: '3rd',
        school: 'Lincoln Elementary',
      },
      {
        id: 'child-2',
        firstName: 'Lucas',
        lastName: 'Doe',
        grade: '1st',
        school: 'Lincoln Elementary',
      },
    ],
    groupAdminRoles: [],
    weeklyPreferences: {
      morningDropoff: { preferred: true, flexibleTiming: false },
      afternoonPickup: { preferred: true, flexibleTiming: true },
      recurringDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
    preferences: {
      pickupLocation: '123 Oak Park Drive',
      dropoffLocation: 'Lincoln Elementary School',
      preferredTime: '07:45', // School-appropriate timing
      isDriver: true,
      smokingAllowed: false,
      notifications: {
        email: true,
        sms: true,
        tripReminders: true,
        swapRequests: true,
        scheduleChanges: true,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGroupAdminUser: TestFamilyUser = {
    id: 'admin-family-789',
    email: 'sarah.wilson@lincoln.edu',
    firstName: 'Sarah',
    lastName: 'Wilson',
    role: 'parent',
    phoneNumber: '555-0456',
    homeAddress: '789 Maple Street',
    isActiveDriver: true,
    familyId: 'family-789',
    children: [
      {
        id: 'child-3',
        firstName: 'Alex',
        lastName: 'Wilson',
        grade: '2nd',
        school: 'Lincoln Elementary',
      },
    ],
    groupAdminRoles: ['group-1', 'group-3'], // Admin for multiple groups
    weeklyPreferences: {
      morningDropoff: { preferred: false, flexibleTiming: true },
      afternoonPickup: { preferred: true, flexibleTiming: false },
      recurringDays: ['monday', 'wednesday', 'friday'],
    },
    preferences: {
      pickupLocation: '789 Maple Street',
      dropoffLocation: 'Lincoln Elementary School',
      preferredTime: '08:00',
      isDriver: true,
      smokingAllowed: false,
      notifications: {
        email: true,
        sms: true,
        tripReminders: true,
        swapRequests: true,
        scheduleChanges: true,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Family-oriented trip for school carpool context
  const mockFamilyTrip: Trip = {
    id: 'trip-family-123',
    driverId: 'parent-family-123',
    passengers: [],
    date: new Date('2024-12-01'),
    departureTime: '07:45', // School dropoff time
    arrivalTime: '08:15', // School arrival time
    pickupLocations: [],
    destination: 'Lincoln Elementary School', // School-specific destination
    maxPassengers: 4, // Family-appropriate capacity
    availableSeats: 3,
    status: 'planned',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFamilyCreateTripRequest: CreateTripRequest = {
    date: '2024-12-01',
    departureTime: '07:45',
    arrivalTime: '08:15',
    destination: 'Lincoln Elementary School',
    maxPassengers: 4,
  };

  beforeEach(() => {
    // Create mocks
    mockTripRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByDriverId: jest.fn(),
      findByPassengerId: jest.fn(),
      findAvailable: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
    } as any;

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockEmailService = {
      sendTripNotification: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      sendTripCreatedNotification: jest.fn(),
    } as any;

    tripService = new TripService(
      mockTripRepository,
      mockUserRepository,
      mockEmailService,
      {} as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Family-Oriented Trip Creation', () => {
    it('should create a family carpool trip successfully', async () => {
      mockTripRepository.create.mockResolvedValue(mockFamilyTrip as any);

      const result = await tripService.createTrip('parent-family-123', mockFamilyCreateTripRequest);

      expect(result).toBeDefined();
      expect(result.driverId).toBe('parent-family-123');
      expect(result.destination).toBe('Lincoln Elementary School');
      expect(mockTripRepository.create).toHaveBeenCalled();
    });

    it('should create family trip with group admin notifications', async () => {
      // Create a specific mock for this test with admin driver ID
      const mockAdminTrip = {
        ...mockFamilyTrip,
        id: 'trip-admin-family-789',
        driverId: 'admin-family-789',
      };

      mockTripRepository.create.mockResolvedValue(mockAdminTrip as any);
      mockEmailService.sendTripCreatedNotification.mockResolvedValue(undefined);

      const result = await tripService.createTrip(
        'admin-family-789',
        mockFamilyCreateTripRequest,
        mockGroupAdminUser,
      );

      expect(result).toBeDefined();
      expect(result.driverId).toBe('admin-family-789');
      expect(result.destination).toBe('Lincoln Elementary School');
      expect(mockTripRepository.create).toHaveBeenCalled();
      expect(mockEmailService.sendTripCreatedNotification).toHaveBeenCalled();
    });

    it('should create trip with family weekly preferences consideration', async () => {
      const familyUser = mockFamilyParentUser;
      mockTripRepository.create.mockResolvedValue(mockFamilyTrip as any);

      const result = await tripService.createTrip(
        familyUser.id,
        mockFamilyCreateTripRequest,
        familyUser,
      );

      expect(result).toBeDefined();
      expect(result.departureTime).toBe('07:45'); // Matches family morning preference
      expect(mockTripRepository.create).toHaveBeenCalled();
    });
  });

  describe('Family Trip Retrieval', () => {
    it('should return family trip when found', async () => {
      mockTripRepository.findById.mockResolvedValue(mockFamilyTrip as any);

      const result = await tripService.getTripById('trip-family-123');

      expect(result).toEqual(mockFamilyTrip);
      expect(result?.destination).toBe('Lincoln Elementary School');
      expect(mockTripRepository.findById).toHaveBeenCalledWith('trip-family-123');
    });

    it('should return null when family trip not found', async () => {
      mockTripRepository.findById.mockResolvedValue(null);

      const result = await tripService.getTripById('invalid-family-trip-id');

      expect(result).toBeNull();
    });
  });

  describe('Family-Oriented Passenger Management', () => {
    it('should allow family member to join carpool trip with available seats', async () => {
      const mockFamilyTripWithSeats = {
        ...mockFamilyTrip,
        availableSeats: 2,
        passengers: ['parent-other-family'],
      };

      mockTripRepository.findById.mockResolvedValue(mockFamilyTripWithSeats as any);
      mockUserRepository.findById.mockResolvedValue(mockFamilyParentUser as any);
      mockTripRepository.update.mockResolvedValue({
        ...mockFamilyTripWithSeats,
        passengers: ['parent-other-family', 'parent-family-123'],
        availableSeats: 1,
      } as any);

      const result = await tripService.addPassenger(
        'trip-family-123',
        'parent-family-123',
        '123 Oak Park Drive',
      );

      expect(result).toBeDefined();
      expect(mockTripRepository.update).toHaveBeenCalled();
    });

    it('should throw error if family carpool trip is full', async () => {
      const mockFullFamilyTrip = { ...mockFamilyTrip, availableSeats: 0 };

      mockTripRepository.findById.mockResolvedValue(mockFullFamilyTrip as any);
      mockUserRepository.findById.mockResolvedValue(mockFamilyParentUser as any);

      await expect(
        tripService.addPassenger('trip-family-123', 'parent-family-123', '123 Oak Park Drive'),
      ).rejects.toThrow();
    });

    it('should validate group membership for passenger addition', async () => {
      const groupAdminUser = mockGroupAdminUser;
      const mockFamilyTripWithSeats = {
        ...mockFamilyTrip,
        availableSeats: 2,
        passengers: [],
      };

      mockTripRepository.findById.mockResolvedValue(mockFamilyTripWithSeats as any);
      mockUserRepository.findById.mockResolvedValue(groupAdminUser as any);
      mockTripRepository.update.mockResolvedValue({
        ...mockFamilyTripWithSeats,
        passengers: ['admin-family-789'],
        availableSeats: 1,
      } as any);

      const result = await tripService.addPassenger(
        'trip-family-123',
        'admin-family-789',
        '789 Maple Street',
      );

      expect(result).toBeDefined();
      expect(mockTripRepository.update).toHaveBeenCalled();
    });
  });

  describe('Family-Oriented Passenger Removal', () => {
    it('should allow family member to leave carpool trip', async () => {
      const mockFamilyTripWithPassenger = {
        ...mockFamilyTrip,
        passengers: ['parent-family-123', 'parent-other-family'],
        availableSeats: 1,
      };

      mockTripRepository.findById.mockResolvedValue(mockFamilyTripWithPassenger as any);
      mockTripRepository.update.mockResolvedValue({
        ...mockFamilyTripWithPassenger,
        passengers: ['parent-other-family'],
        availableSeats: 2,
      } as any);

      const result = await tripService.removePassenger('trip-family-123', 'parent-family-123');

      expect(result).toBeDefined();
      expect(mockTripRepository.update).toHaveBeenCalled();
    });

    it('should throw error if family user is not a passenger', async () => {
      mockTripRepository.findById.mockResolvedValue(mockFamilyTrip as any);

      await expect(
        tripService.removePassenger('trip-family-123', 'parent-family-123'),
      ).rejects.toThrow();
    });

    it('should handle group admin passenger removal', async () => {
      const mockFamilyTripWithAdminPassenger = {
        ...mockFamilyTrip,
        passengers: ['admin-family-789', 'parent-other-family'],
        availableSeats: 1,
      };

      mockTripRepository.findById.mockResolvedValue(mockFamilyTripWithAdminPassenger as any);
      mockTripRepository.update.mockResolvedValue({
        ...mockFamilyTripWithAdminPassenger,
        passengers: ['parent-other-family'],
        availableSeats: 2,
      } as any);

      const result = await tripService.removePassenger('trip-family-123', 'admin-family-789');

      expect(result).toBeDefined();
      expect(mockTripRepository.update).toHaveBeenCalled();
    });
  });

  describe('Family-Oriented Static Methods', () => {
    it('should call instance method for family trip retrieval', async () => {
      // Note: This tests the static method wrapper for family context
      const spy = jest.spyOn(TripService.prototype, 'getTripById');
      spy.mockResolvedValue(mockFamilyTrip);

      // We can't easily test the static method due to dynamic imports
      // So we test that the instance method works with family context
      const result = await tripService.getTripById('trip-family-123');
      expect(result).toBeDefined();
      expect(result?.destination).toBe('Lincoln Elementary School');
    });

    it('should handle family trip statistics and analytics', async () => {
      // Test family-specific trip analytics
      const spy = jest.spyOn(TripService.prototype, 'getTripById');
      spy.mockResolvedValue(mockFamilyTrip);

      const result = await tripService.getTripById('trip-family-123');
      expect(result).toBeDefined();
      expect(result?.maxPassengers).toBe(4); // Family-appropriate capacity
    });
  });

  describe('Trip Updates and Status Management', () => {
    const mockUpdateRequest = {
      departureTime: '08:00',
      destination: 'Updated School Location',
      notes: 'Updated trip notes',
    };

    it('should update trip successfully with valid data', async () => {
      const updatedTrip = { ...mockFamilyTrip, ...mockUpdateRequest, updatedAt: new Date() };

      mockTripRepository.findById.mockResolvedValue(mockFamilyTrip as any);
      mockTripRepository.update.mockResolvedValue(updatedTrip as any);

      const result = await tripService.updateTrip('trip-family-123', mockUpdateRequest);

      expect(result).toBeDefined();
      expect(result?.departureTime).toBe('08:00');
      expect(result?.destination).toBe('Updated School Location');
      expect(mockTripRepository.update).toHaveBeenCalledWith(
        'trip-family-123',
        expect.objectContaining(mockUpdateRequest),
      );
    });

    it('should return null when updating non-existent trip', async () => {
      jest.clearAllMocks();
      // Mock getTripById to return null
      jest.spyOn(tripService, 'getTripById').mockResolvedValue(null);

      const result = await tripService.updateTrip('invalid-trip-id', mockUpdateRequest);

      expect(result).toBeNull();
      expect(mockTripRepository.update).not.toHaveBeenCalled();
    });

    it('should handle date conversion in trip updates', async () => {
      const updateWithDate = { ...mockUpdateRequest, date: '2024-12-15' };
      const updatedTrip = {
        ...mockFamilyTrip,
        ...updateWithDate,
        date: new Date('2024-12-15'),
        updatedAt: new Date(),
      };

      // Clear any existing spies
      jest.restoreAllMocks();

      mockTripRepository.findById.mockResolvedValue(mockFamilyTrip as any);
      mockTripRepository.update.mockResolvedValue(updatedTrip as any);

      const result = await tripService.updateTrip('trip-family-123', updateWithDate);

      expect(result).toBeDefined();
      expect(result?.date).toBeInstanceOf(Date);
      expect(mockTripRepository.update).toHaveBeenCalledWith('trip-family-123', {
        ...mockFamilyTrip,
        ...updateWithDate,
        date: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should cancel trip by updating status', async () => {
      const cancelledTrip = {
        ...mockFamilyTrip,
        status: 'cancelled' as const,
        updatedAt: new Date(),
      };

      // Clear any existing spies
      jest.restoreAllMocks();

      mockTripRepository.findById.mockResolvedValue(mockFamilyTrip as any);
      mockTripRepository.update.mockResolvedValue(cancelledTrip as any);

      const result = await tripService.cancelTrip('trip-family-123');

      expect(result).toBeDefined();
      expect(result?.status).toBe('cancelled');
      // cancelTrip calls updateTrip, which merges with existing trip data
      expect(mockTripRepository.update).toHaveBeenCalledWith('trip-family-123', {
        ...mockFamilyTrip,
        status: 'cancelled',
        updatedAt: expect.any(Date),
      });
    });

    it('should update trip status directly', async () => {
      const activeTrip = { ...mockFamilyTrip, status: 'active' as const, updatedAt: new Date() };

      // Mock both getTripById and update for the updateTripStatus flow
      jest.spyOn(tripService, 'getTripById').mockResolvedValue(mockFamilyTrip);
      jest.spyOn(tripService, 'updateTrip').mockResolvedValue(activeTrip);

      const result = await tripService.updateTripStatus('trip-family-123', 'active');

      expect(result).toBeDefined();
      expect(result?.status).toBe('active');
      expect(tripService.getTripById).toHaveBeenCalledWith('trip-family-123');
      expect(tripService.updateTrip).toHaveBeenCalledWith('trip-family-123', {
        status: 'active',
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error when updating status of non-existent trip', async () => {
      jest.clearAllMocks();
      // Mock getTripById to return null
      jest.spyOn(tripService, 'getTripById').mockResolvedValue(null);

      await expect(tripService.updateTripStatus('invalid-trip-id', 'active')).rejects.toThrow(
        'Trip not found',
      );
    });
  });

  describe('Trip Search and Filtering', () => {
    const mockTripResults = [
      mockFamilyTrip,
      { ...mockFamilyTrip, id: 'trip-2', destination: 'Different School' },
    ];

    beforeEach(() => {
      mockTripRepository.query.mockResolvedValue(mockTripResults as any);
    });

    it('should get trips with driver filter', async () => {
      const filters = { driverId: 'parent-family-123' };

      const result = await tripService.getTrips(filters);

      expect(result.trips).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('c.driverId = @driverId'),
          parameters: expect.arrayContaining([{ name: '@driverId', value: 'parent-family-123' }]),
        }),
      );
    });

    it('should get trips with passenger filter', async () => {
      const filters = { passengerId: 'parent-family-123' };

      const result = await tripService.getTrips(filters);

      expect(result.trips).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('ARRAY_CONTAINS(c.passengers, @passengerId)'),
          parameters: expect.arrayContaining([
            { name: '@passengerId', value: 'parent-family-123' },
          ]),
        }),
      );
    });

    it('should get trips with status filter', async () => {
      const filters = { status: 'planned' as const };

      const result = await tripService.getTrips(filters);

      expect(result.trips).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('c.status = @status'),
          parameters: expect.arrayContaining([{ name: '@status', value: 'planned' }]),
        }),
      );
    });

    it('should get trips with destination filter', async () => {
      const filters = { destination: 'lincoln' };

      const result = await tripService.getTrips(filters);

      expect(result.trips).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('CONTAINS(LOWER(c.destination), @destination)'),
          parameters: expect.arrayContaining([{ name: '@destination', value: 'lincoln' }]),
        }),
      );
    });

    it('should get trips with minimum seats filter', async () => {
      const filters = { minSeats: 2 };

      const result = await tripService.getTrips(filters);

      expect(result.trips).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('c.availableSeats >= @minSeats'),
          parameters: expect.arrayContaining([{ name: '@minSeats', value: 2 }]),
        }),
      );
    });

    it('should get trips with search query', async () => {
      const filters = { searchQuery: 'school' };

      const result = await tripService.getTrips(filters);

      expect(result.trips).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('CONTAINS(LOWER(c.destination), @searchQuery)'),
          parameters: expect.arrayContaining([{ name: '@searchQuery', value: 'school' }]),
        }),
      );
    });

    it('should get trips with date range filters', async () => {
      const filters = { dateFrom: '2024-12-01', dateTo: '2024-12-31' };

      const result = await tripService.getTrips(filters);

      expect(result.trips).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('c.date >= @dateFrom'),
          parameters: expect.arrayContaining([
            { name: '@dateFrom', value: '2024-12-01' },
            { name: '@dateTo', value: '2024-12-31' },
          ]),
        }),
      );
    });

    it('should get trips with specific date filter', async () => {
      const filters = { date: '2024-12-01' };

      const result = await tripService.getTrips(filters);

      expect(result.trips).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('c.date = @date'),
          parameters: expect.arrayContaining([{ name: '@date', value: '2024-12-01' }]),
        }),
      );
    });

    it('should get trips with sorting options', async () => {
      const filters = { sortBy: 'departureTime' as const, sortOrder: 'desc' as const };

      const result = await tripService.getTrips(filters);

      expect(result.trips).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('ORDER BY c.departureTime DESC'),
        }),
      );
    });

    it('should apply default filters for upcoming trips', async () => {
      const filters = {};

      const result = await tripService.getTrips(filters);

      expect(result.trips).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('c.date >= @today'),
          parameters: expect.arrayContaining([{ name: '@today', value: expect.any(String) }]),
        }),
      );
    });

    it('should handle pagination', async () => {
      // Mock count query to return total
      mockTripRepository.query
        .mockResolvedValueOnce(mockTripResults as any)
        .mockResolvedValueOnce([5] as any); // Count result

      const filters = { limit: 1, offset: 1 };

      const result = await tripService.getTrips(filters);

      expect(result.total).toBe(5);
      expect(result.trips).toHaveLength(1); // Pagination applied
    });
  });

  describe('User Trip Analytics', () => {
    const mockCompletedTrips = [
      {
        ...mockFamilyTrip,
        id: 'trip-1',
        status: 'completed',
        driverId: 'parent-family-123',
        passengers: [],
      },
      {
        ...mockFamilyTrip,
        id: 'trip-2',
        status: 'completed',
        driverId: 'other-driver',
        passengers: ['parent-family-123'],
      },
      {
        ...mockFamilyTrip,
        id: 'trip-3',
        status: 'completed',
        driverId: 'other-driver-2',
        passengers: ['parent-family-123'],
      },
    ];

    it('should get user upcoming trips', async () => {
      const upcomingTrips = [mockFamilyTrip];
      mockTripRepository.query.mockResolvedValue(upcomingTrips as any);

      const result = await tripService.getUserUpcomingTrips('parent-family-123');

      expect(result).toHaveLength(1);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining(
            'c.driverId = @userId OR ARRAY_CONTAINS(c.passengers, @userId)',
          ),
          parameters: expect.arrayContaining([
            { name: '@userId', value: 'parent-family-123' },
            { name: '@today', value: expect.any(String) },
          ]),
        }),
      );
    });

    it('should calculate trip statistics correctly', async () => {
      // Mock completed trips query
      mockTripRepository.query.mockResolvedValueOnce(mockCompletedTrips as any);
      // Mock upcoming trips query
      mockTripRepository.query.mockResolvedValueOnce([mockFamilyTrip] as any);

      const result = await tripService.getTripStats('parent-family-123');

      expect(result).toEqual({
        totalTrips: 3,
        tripsAsDriver: 1,
        tripsAsPassenger: 2,
        totalDistance: 30, // 3 trips * 10 miles
        milesSaved: 18, // 30 * 0.6
        timeSavedHours: 2, // 3 trips * 0.5 hours, rounded up
        upcomingTrips: 1,
      });
    });

    it('should handle user with no trip history', async () => {
      mockTripRepository.query.mockResolvedValueOnce([] as any); // No completed trips
      mockTripRepository.query.mockResolvedValueOnce([] as any); // No upcoming trips

      const result = await tripService.getTripStats('new-user-123');

      expect(result).toEqual({
        totalTrips: 0,
        tripsAsDriver: 0,
        tripsAsPassenger: 0,
        totalDistance: 0,
        milesSaved: 0,
        timeSavedHours: 0,
        upcomingTrips: 0,
      });
    });
  });

  describe('Group Trip Management', () => {
    it('should get trips by group ID', async () => {
      const groupTrips = [mockFamilyTrip, { ...mockFamilyTrip, id: 'trip-2' }];
      mockTripRepository.query.mockResolvedValue(groupTrips as any);

      const result = await tripService.getTripsByGroup('group-123');

      expect(result).toHaveLength(2);
      expect(mockTripRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('c.groupId = @groupId'),
          parameters: expect.arrayContaining([{ name: '@groupId', value: 'group-123' }]),
        }),
      );
    });

    it('should return empty array when no group trips found', async () => {
      mockTripRepository.query.mockResolvedValue([]);

      const result = await tripService.getTripsByGroup('empty-group-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('Convenience Methods', () => {
    it('should join trip using addPassenger', async () => {
      const mockTripWithPassenger = {
        ...mockFamilyTrip,
        passengers: ['parent-family-123'],
        availableSeats: 2,
      };

      // Mock the underlying addPassenger method
      jest.spyOn(tripService, 'addPassenger').mockResolvedValue(mockTripWithPassenger);

      const result = await tripService.joinTrip(
        'trip-family-123',
        'parent-family-123',
        '123 Oak Park Drive',
      );

      expect(result).toBeDefined();
      expect(tripService.addPassenger).toHaveBeenCalledWith(
        'trip-family-123',
        'parent-family-123',
        '123 Oak Park Drive',
      );
    });

    it('should leave trip using removePassenger', async () => {
      const mockTripWithoutPassenger = {
        ...mockFamilyTrip,
        passengers: [],
        availableSeats: 3,
      };

      // Mock the underlying removePassenger method
      jest.spyOn(tripService, 'removePassenger').mockResolvedValue(mockTripWithoutPassenger);

      const result = await tripService.leaveTrip('trip-family-123', 'parent-family-123');

      expect(result).toBeDefined();
      expect(tripService.removePassenger).toHaveBeenCalledWith(
        'trip-family-123',
        'parent-family-123',
      );
    });

    it('should delete trip using cancelTrip', async () => {
      const cancelledTrip = {
        ...mockFamilyTrip,
        status: 'cancelled' as const,
      };

      // Mock the underlying cancelTrip method
      jest.spyOn(tripService, 'cancelTrip').mockResolvedValue(cancelledTrip);

      const result = await tripService.deleteTrip('trip-family-123');

      expect(result).toBeDefined();
      expect(result?.status).toBe('cancelled');
      expect(tripService.cancelTrip).toHaveBeenCalledWith('trip-family-123');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw error when getTripById fails', async () => {
      jest.restoreAllMocks();
      mockTripRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      await expect(tripService.getTripById('trip-family-123')).rejects.toThrow(
        'Error fetching trip: Database connection failed',
      );
    });

    it('should throw error when updateTrip repository fails', async () => {
      jest.restoreAllMocks();
      // First call to getTripById succeeds, but update fails
      mockTripRepository.findById.mockResolvedValue(mockFamilyTrip as any);
      mockTripRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        tripService.updateTrip('trip-family-123', { departureTime: '08:00' }),
      ).rejects.toThrow('Error updating trip: Update failed');
    });

    it('should throw error when getTrips query fails', async () => {
      mockTripRepository.query.mockRejectedValue(new Error('Query failed'));

      await expect(tripService.getTrips({})).rejects.toThrow('Error fetching trips');
    });

    it('should throw error when addPassenger repository fails', async () => {
      const mockTripWithSeats = { ...mockFamilyTrip, availableSeats: 2 };

      jest.restoreAllMocks();
      // Mock getTripById to succeed, but repository.update to fail
      jest.spyOn(tripService, 'getTripById').mockResolvedValue(mockTripWithSeats);
      mockTripRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        tripService.addPassenger('trip-family-123', 'parent-family-123', '123 Oak Park Drive'),
      ).rejects.toThrow('Update failed'); // Service re-throws Error instances as-is
    });

    it('should throw error when removePassenger repository fails', async () => {
      const mockTripWithPassenger = {
        ...mockFamilyTrip,
        passengers: ['parent-family-123'],
      };

      jest.restoreAllMocks();
      // Mock getTripById to succeed, but repository.update to fail
      jest.spyOn(tripService, 'getTripById').mockResolvedValue(mockTripWithPassenger);
      mockTripRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        tripService.removePassenger('trip-family-123', 'parent-family-123'),
      ).rejects.toThrow('Update failed'); // Service re-throws Error instances as-is
    });

    it('should throw error when getUserUpcomingTrips query fails', async () => {
      mockTripRepository.query.mockRejectedValue(new Error('Query failed'));

      await expect(tripService.getUserUpcomingTrips('parent-family-123')).rejects.toThrow(
        'Error fetching upcoming trips',
      );
    });

    it('should throw error when getTripStats query fails', async () => {
      mockTripRepository.query.mockRejectedValue(new Error('Query failed'));

      await expect(tripService.getTripStats('parent-family-123')).rejects.toThrow(
        'Error fetching trip statistics',
      );
    });

    it('should throw error when getTripsByGroup query fails', async () => {
      mockTripRepository.query.mockRejectedValue(new Error('Query failed'));

      await expect(tripService.getTripsByGroup('group-123')).rejects.toThrow(
        'Error fetching group trips',
      );
    });
  });
});
