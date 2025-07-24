import {
  Trip,
  TripStatus,
  TripStats,
  CreateTripRequest,
  UpdateTripRequest,
  ApiResponse,
  User,
} from '@carpool/shared';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from './email.service';
import { TripRepository } from '../repositories/trip.repository';
import { UserRepository } from '../repositories/user.repository';
import { Errors } from '../utils/error-handler';
import { ILogger } from '../utils/logger';

export class TripService {
  // Static methods for backward compatibility
  static async getTripById(tripId: string): Promise<Trip | null> {
    const { containers } = await import('../config/database');
    const tripRepository = new TripRepository(containers.trips);
    const userRepository = new UserRepository(containers.users);
    const emailService = new EmailService();
    const tripService = new TripService(tripRepository, userRepository, emailService);
    return tripService.getTripById(tripId);
  }

  static async updateTrip(tripId: string, updates: any): Promise<Trip | null> {
    const { containers } = await import('../config/database');
    const tripRepository = new TripRepository(containers.trips);
    const userRepository = new UserRepository(containers.users);
    const emailService = new EmailService();
    const tripService = new TripService(tripRepository, userRepository, emailService);
    return tripService.updateTrip(tripId, updates);
  }

  private logger: ILogger;

  constructor(
    private tripRepository: TripRepository,
    private userRepository: UserRepository,
    private emailService: EmailService,
    logger?: ILogger,
  ) {
    this.logger = logger || {
      debug: (message: string, data?: any) => console.debug(message, data),
      info: (message: string, data?: any) => console.info(message, data),
      warn: (message: string, data?: any) => console.warn(message, data),
      error: (message: string, error?: any) => console.error(message, error),
      setContext: () => {},
      child: () => this.logger,
      startTimer: (label: string) => () => console.time(label),
    };
  }

  /**
   * Create a new trip
   */
  async createTrip(driverId: string, tripData: CreateTripRequest, driver?: User): Promise<Trip> {
    const trip: Trip = {
      id: uuidv4(),
      driverId,
      passengers: [],
      date: new Date(tripData.date),
      departureTime: tripData.departureTime,
      arrivalTime: tripData.arrivalTime,
      pickupLocations: [],
      destination: tripData.destination,
      maxPassengers: tripData.maxPassengers,
      availableSeats: tripData.maxPassengers,
      status: 'planned' as TripStatus,
      cost: tripData.cost,
      notes: tripData.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createdTrip = await this.tripRepository.create(trip);

    // Send email notification if driver info is provided
    if (driver) {
      try {
        await this.emailService.sendTripCreatedNotification(
          driver.email,
          `${driver.firstName} ${driver.lastName}`,
          {
            date: tripData.date,
            departureTime: tripData.departureTime,
            destination: tripData.destination,
            maxPassengers: tripData.maxPassengers,
          },
        );
      } catch (error) {
        console.error('Failed to send email notification:', error);
        // Don't throw error - trip creation was successful
      }
    }

    return createdTrip;
  }

  /**
   * Get trip by ID
   */
  async getTripById(tripId: string): Promise<Trip | null> {
    try {
      return await this.tripRepository.findById(tripId);
    } catch (error: any) {
      console.error(`Error fetching trip with ID ${tripId}:`, error);
      throw Errors.InternalServerError(`Error fetching trip: ${error.message}`);
    }
  }

  /**
   * Get trips with filters
   */
  async getTrips(filters: {
    driverId?: string;
    passengerId?: string;
    status?: TripStatus;
    date?: string;
    destination?: string;
    origin?: string;
    maxPrice?: number;
    minSeats?: number;
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'date' | 'price' | 'destination' | 'availableSeats' | 'departureTime';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ trips: Trip[]; total: number }> {
    try {
      let query = 'SELECT * FROM c WHERE 1=1';
      const parameters: Array<{ name: string; value: any }> = [];

      if (filters.driverId) {
        query += ' AND c.driverId = @driverId';
        parameters.push({ name: '@driverId', value: filters.driverId });
      }

      if (filters.passengerId) {
        query += ' AND ARRAY_CONTAINS(c.passengers, @passengerId)';
        parameters.push({ name: '@passengerId', value: filters.passengerId });
      }

      if (filters.status) {
        query += ' AND c.status = @status';
        parameters.push({ name: '@status', value: filters.status });
      }

      // Enhanced destination search with partial matching
      if (filters.destination) {
        query += ' AND CONTAINS(LOWER(c.destination), @destination)';
        parameters.push({
          name: '@destination',
          value: filters.destination.toLowerCase(),
        });
      }

      // Enhanced origin search with partial matching
      if (filters.origin) {
        query += ' AND CONTAINS(LOWER(c.origin), @origin)';
        parameters.push({
          name: '@origin',
          value: filters.origin.toLowerCase(),
        });
      }

      // Price range filter removed - cost fields no longer used

      // Minimum available seats filter
      if (filters.minSeats) {
        query += ' AND c.availableSeats >= @minSeats';
        parameters.push({ name: '@minSeats', value: filters.minSeats });
      }

      // Global search query (searches in destination, notes, origin)
      if (filters.searchQuery) {
        query += ` AND (
          CONTAINS(LOWER(c.destination), @searchQuery) OR 
          CONTAINS(LOWER(c.notes), @searchQuery) OR 
          CONTAINS(LOWER(c.origin), @searchQuery)
        )`;
        parameters.push({
          name: '@searchQuery',
          value: filters.searchQuery.toLowerCase(),
        });
      }

      // Date range filtering
      if (filters.date) {
        query += ' AND c.date = @date';
        parameters.push({ name: '@date', value: filters.date });
      } else if (filters.dateFrom || filters.dateTo) {
        if (filters.dateFrom) {
          query += ' AND c.date >= @dateFrom';
          parameters.push({ name: '@dateFrom', value: filters.dateFrom });
        }
        if (filters.dateTo) {
          query += ' AND c.date <= @dateTo';
          parameters.push({ name: '@dateTo', value: filters.dateTo });
        }
      } else {
        // Default to upcoming trips if no date filters are specified
        const today = new Date().toISOString().split('T')[0];
        query += ' AND c.date >= @today';
        parameters.push({ name: '@today', value: today });
      }

      // Enhanced sorting options
      const sortBy = filters.sortBy || 'date';
      const sortOrder = filters.sortOrder || 'asc';

      switch (sortBy) {
        case 'price':
          query += ` ORDER BY c.cost ${sortOrder.toUpperCase()}`;
          break;
        case 'destination':
          query += ` ORDER BY c.destination ${sortOrder.toUpperCase()}`;
          break;
        case 'availableSeats':
          query += ` ORDER BY c.availableSeats ${sortOrder.toUpperCase()}`;
          break;
        case 'departureTime':
          query += ` ORDER BY c.departureTime ${sortOrder.toUpperCase()}`;
          break;
        case 'date':
        default:
          query += ` ORDER BY c.date ${sortOrder.toUpperCase()}, c.departureTime ASC`;
          break;
      }

      // Get the trips using the repository
      const trips = await this.tripRepository.query({
        query,
        parameters,
      });

      // Calculate total count for pagination
      const countQuery = query
        .replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c')
        .replace(/ORDER BY .+$/, '');

      // Get total count using repository
      const countResults = await this.tripRepository.query({
        query: countQuery,
        parameters,
      });

      const total = countResults.length > 0 ? parseInt(countResults[0] as unknown as string) : 0;

      // Apply pagination in the service layer if needed
      let paginatedTrips = trips;
      if (filters.limit && filters.limit > 0) {
        const offset = filters.offset || 0;
        paginatedTrips = trips.slice(offset, offset + filters.limit);
      }

      return {
        trips: paginatedTrips,
        total,
      };
    } catch (error) {
      console.error('Error fetching trips:', error);
      throw Errors.InternalServerError(
        `Error fetching trips: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update trip
   */
  async updateTrip(tripId: string, updates: UpdateTripRequest): Promise<Trip | null> {
    try {
      const existingTrip = await this.getTripById(tripId);
      if (!existingTrip) {
        return null;
      }

      const updatedTrip: Trip = {
        ...existingTrip,
        ...updates,
        // Ensure date is a Date object if provided
        date: updates.date ? new Date(updates.date) : existingTrip.date,
        updatedAt: new Date(),
      };

      return await this.tripRepository.update(tripId, updatedTrip);
    } catch (error) {
      console.error(`Error updating trip ${tripId}:`, error);
      throw Errors.InternalServerError(
        `Error updating trip: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Cancel trip
   */
  async cancelTrip(tripId: string): Promise<Trip | null> {
    return this.updateTrip(tripId, { status: 'cancelled' });
  }

  /**
   * Add passenger to trip
   */
  async addPassenger(
    tripId: string,
    passengerId: string,
    pickupLocation: string,
  ): Promise<Trip | null> {
    try {
      const trip = await this.getTripById(tripId);
      if (!trip) {
        throw Errors.NotFound('Trip not found');
      }

      if (trip.passengers.includes(passengerId)) {
        throw Errors.Conflict('User is already a passenger on this trip');
      }

      if (trip.availableSeats <= 0) {
        throw Errors.BadRequest('No available seats on this trip');
      }

      const updatedTrip: Trip = {
        ...trip,
        passengers: [...trip.passengers, passengerId],
        availableSeats: trip.availableSeats - 1,
        pickupLocations: [
          ...trip.pickupLocations,
          {
            userId: passengerId,
            address: pickupLocation,
            estimatedTime: trip.departureTime, // TODO: Calculate actual pickup time
          },
        ],
        updatedAt: new Date(),
      };

      return await this.tripRepository.update(tripId, updatedTrip);
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw AppErrors
      }
      console.error(`Error adding passenger to trip ${tripId}:`, error);
      throw Errors.InternalServerError(
        `Error adding passenger to trip: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Remove passenger from trip
   */
  async removePassenger(tripId: string, passengerId: string): Promise<Trip | null> {
    try {
      const trip = await this.getTripById(tripId);
      if (!trip) {
        throw Errors.NotFound('Trip not found');
      }

      if (!trip.passengers.includes(passengerId)) {
        throw Errors.BadRequest('User is not a passenger on this trip');
      }

      const updatedTrip: Trip = {
        ...trip,
        passengers: trip.passengers.filter((id: string) => id !== passengerId),
        availableSeats: trip.availableSeats + 1,
        pickupLocations: trip.pickupLocations.filter((loc: any) => loc.userId !== passengerId),
        updatedAt: new Date(),
      };

      return await this.tripRepository.update(tripId, updatedTrip);
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw AppErrors
      }
      console.error(`Error removing passenger from trip ${tripId}:`, error);
      throw Errors.InternalServerError(
        `Error removing passenger from trip: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Get user's upcoming trips (as driver or passenger)
   */
  async getUserUpcomingTrips(userId: string): Promise<Trip[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const query = {
        query: `
          SELECT * FROM c 
          WHERE (c.driverId = @userId OR ARRAY_CONTAINS(c.passengers, @userId))
          AND c.date >= @today
          AND c.status IN ('planned', 'active')
          ORDER BY c.date ASC, c.departureTime ASC
        `,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@today', value: today },
        ],
      };

      return await this.tripRepository.query(query);
    } catch (error) {
      console.error(`Error fetching upcoming trips for user ${userId}:`, error);
      throw Errors.InternalServerError(
        `Error fetching upcoming trips: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Get trip statistics for a user
   */
  async getTripStats(userId: string): Promise<TripStats> {
    try {
      const query = {
        query: `
          SELECT * FROM c 
          WHERE (c.driverId = @userId OR ARRAY_CONTAINS(c.passengers, @userId))
          AND c.status = 'completed'
        `,
        parameters: [{ name: '@userId', value: userId }],
      };

      const trips = await this.tripRepository.query(query);

      const tripsAsDriver = trips.filter((trip: Trip) => trip.driverId === userId);
      const tripsAsPassenger = trips.filter(
        (trip: Trip) => trip.passengers.includes(userId) && trip.driverId !== userId,
      );

      // Calculate miles and time savings instead of cost
      // Estimate average trip distance (can be enhanced with actual distance calculation later)
      const averageTripMiles = 10; // Estimate 10 miles per trip
      const totalMiles = trips.length * averageTripMiles;
      const timeSavedHours = Math.ceil(trips.length * 0.5); // Estimate 30min saved per trip

      // Get upcoming trips
      const upcomingTrips = await this.getUserUpcomingTrips(userId);

      return {
        totalTrips: trips.length,
        tripsAsDriver: tripsAsDriver.length,
        tripsAsPassenger: tripsAsPassenger.length,
        totalDistance: totalMiles,
        milesSaved: Math.ceil(totalMiles * 0.6), // Estimated miles saved by carpooling
        timeSavedHours,
        upcomingTrips: upcomingTrips.length,
      };
    } catch (error) {
      console.error(`Error fetching trip statistics for user ${userId}:`, error);
      throw Errors.InternalServerError(
        `Error fetching trip statistics: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Join a trip as a passenger
   */
  async joinTrip(tripId: string, userId: string, pickupLocation: string): Promise<Trip | null> {
    return this.addPassenger(tripId, userId, pickupLocation);
  }

  /**
   * Leave a trip as a passenger
   */
  async leaveTrip(tripId: string, userId: string): Promise<Trip | null> {
    return this.removePassenger(tripId, userId);
  }

  /**
   * Delete a trip (driver only)
   */
  async deleteTrip(tripId: string): Promise<Trip | null> {
    return this.cancelTrip(tripId);
  }

  /**
   * Update trip status
   */
  async updateTripStatus(tripId: string, status: TripStatus): Promise<Trip | null> {
    try {
      const trip = await this.getTripById(tripId);
      if (!trip) {
        throw new Error('Trip not found');
      }

      const updates = {
        status,
        updatedAt: new Date(),
      };

      return await this.updateTrip(tripId, updates);
    } catch (error: any) {
      console.error(`Error updating trip status for ${tripId}:`, error);
      throw Errors.InternalServerError(`Error updating trip status: ${error.message}`);
    }
  }

  /**
   * Get trips by group ID
   */
  async getTripsByGroup(groupId: string): Promise<Trip[]> {
    try {
      const query =
        'SELECT * FROM c WHERE c.groupId = @groupId ORDER BY c.date ASC, c.departureTime ASC';
      const parameters = [{ name: '@groupId', value: groupId }];

      const trips = await this.tripRepository.query({
        query,
        parameters,
      });

      return trips;
    } catch (error: any) {
      console.error(`Error fetching trips for group ${groupId}:`, error);
      throw Errors.InternalServerError(`Error fetching group trips: ${error.message}`);
    }
  }
}
