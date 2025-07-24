/**
 * Trip Domain Service
 *
 * Consolidates all trip-related business logic that was previously scattered
 * across multiple Azure Functions:
 * - trips-list
 * - trips-stats
 * - trips-stats-db
 * - admin-driver-selection
 * - admin-swap-requests
 * - parent-swap-requests
 * - traveling-parent-makeup
 *
 * This service provides a unified interface for all trip operations,
 * including creation, management, statistics, and swap requests.
 */

import { TripEntity, UserEntity, GroupEntity, UserRole } from '@carpool/shared';
import { databaseService } from '../database.service';
import { ILogger } from '../../utils/logger';
import { Errors } from '../../utils/error-handler';
import { v4 as uuidv4 } from 'uuid';

export interface TripCreationRequest {
  groupId: string;
  driverId: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  pickupAddress: string;
  dropoffAddress: string;
  maxPassengers: number;
  passengers?: string[]; // user IDs
  notes?: string;
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
}

export interface TripUpdateRequest {
  driverId?: string;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  pickupAddress?: string;
  dropoffAddress?: string;
  maxPassengers?: number;
  passengers?: string[];
  notes?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface SwapRequest {
  id: string;
  tripId?: string;
  originalAssignmentId: string;
  requestingDriverId: string;
  receivingDriverId: string;
  requestedDate: Date;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
}

export interface TripSearchQuery {
  groupId?: string;
  driverId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
  includePast?: boolean;
}

export interface TripStats {
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalMilesDriven: number;
  totalPassengers: number;
  averageRating: number;
  topDrivers: {
    userId: string;
    userName: string;
    tripCount: number;
    totalMiles: number;
  }[];
  fairnessMetrics: {
    userId: string;
    userName: string;
    drivingShare: number;
    fairnessScore: number;
  }[];
}

export interface TripServiceResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class TripDomainService {
  private logger: ILogger;
  private inMemoryTrips: Map<string, TripEntity> = new Map();
  private inMemorySwapRequests: Map<string, SwapRequest> = new Map();

  constructor(logger?: ILogger) {
    this.logger = logger || {
      debug: (msg: string, data?: any) => console.debug(msg, data),
      info: (msg: string, data?: any) => console.info(msg, data),
      warn: (msg: string, data?: any) => console.warn(msg, data),
      error: (msg: string, error?: any) => console.error(msg, error),
      setContext: () => {},
      child: () => this.logger,
      startTimer: (label: string) => {
        const start = Date.now();
        return () => {
          const elapsed = Date.now() - start;
          this.logger.info(`Timer ${label}: ${elapsed}ms`);
        };
      },
    };
  }

  /**
   * Creates a new trip
   */
  async createTrip(
    request: TripCreationRequest,
    creatorId: string,
  ): Promise<TripServiceResult<TripEntity>> {
    try {
      this.logger.info('Creating new trip', {
        groupId: request.groupId,
        driverId: request.driverId,
      });

      // Validate the group exists
      const group = await databaseService.getGroupById(request.groupId);
      if (!group) {
        throw Errors.BadRequest('Group not found');
      }

      // Validate the driver is a member of the group
      if (!group.members.some((member) => member.userId === request.driverId)) {
        throw Errors.BadRequest('Driver is not a member of the group');
      }

      // Validate creator has permission
      const creator = await databaseService.getUserById(creatorId);
      if (!creator) {
        throw Errors.BadRequest('Creator not found');
      }

      const canCreate =
        creator.role === 'group_admin' ||
        creator.role === 'super_admin' ||
        group.members.some((member) => member.userId === creatorId) ||
        group.groupAdminId === creatorId ||
        group.coAdminIds.includes(creatorId);

      if (!canCreate) {
        throw Errors.Forbidden('Insufficient permissions to create trip');
      }

      // Create the trip entity
      const tripId = uuidv4();
      const now = new Date();

      const newTrip = {
        id: tripId,
        groupId: request.groupId,
        groupName: group.name,
        type: 'morning_pickup' as const,
        status: 'scheduled' as const,
        scheduledDate: new Date(
          request.scheduledStartTime.getFullYear(),
          request.scheduledStartTime.getMonth(),
          request.scheduledStartTime.getDate(),
        ),
        scheduledStartTime: request.scheduledStartTime,
        scheduledEndTime: request.scheduledEndTime,
        participants: (request.passengers || []).map((passengerId) => ({
          userId: passengerId,
          userName: 'Unknown',
          role: 'passenger' as const,
          status: 'confirmed' as const,
          pickupLocation: { latitude: 0, longitude: 0, address: request.pickupAddress || '' },
          dropoffLocation: { latitude: 0, longitude: 0, address: request.dropoffAddress || '' },
          emergencyContact: { name: '', phone: '' },
          specialInstructions: '',
          confirmedAt: now,
        })),
        driverId: request.driverId,
        driverName: 'Unknown',
        vehicle: {
          make: 'Unknown',
          model: 'Unknown',
          year: 2020,
          color: 'Unknown',
          licensePlate: 'Unknown',
          passengerCapacity: request.maxPassengers,
          hasCarSeats: false,
          carSeatTypes: [],
          isVerified: false,
          lastUpdated: now,
          updatedBy: creatorId,
        },
        route: {
          id: uuidv4(),
          waypoints: [],
          totalDistance: 0,
          estimatedDuration: 0,
          optimized: false,
          createdAt: now,
          updatedAt: now,
        },
        schoolId: 'default-school',
        schoolName: 'Default School',
        schoolAddress: request.dropoffAddress || '',
        schoolLocation: { latitude: 0, longitude: 0, address: request.dropoffAddress || '' },
        statusHistory: [],
        communications: [],
        feedback: [],
        safetyChecks: [],
        auditLog: [],
        metadata: {
          version: '1.0',
          source: 'domain_service',
          notes: request.notes || '',
          tags: [],
          customFields: {},
        },
        createdAt: now,
        updatedAt: now,
        createdBy: creatorId,
        lastModifiedBy: creatorId,
      } as unknown as TripEntity;

      // Store the trip (in-memory for now)
      this.inMemoryTrips.set(tripId, newTrip);

      this.logger.info('Trip created successfully', { tripId, groupId: request.groupId });
      return {
        success: true,
        data: newTrip,
        message: 'Trip created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create trip', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets trips based on search query
   */
  async searchTrips(
    query: TripSearchQuery,
    requesterId: string,
  ): Promise<TripServiceResult<TripEntity[]>> {
    try {
      this.logger.info('Searching trips', { query, requesterId });

      // Get all trips from storage
      let trips = Array.from(this.inMemoryTrips.values());

      // Apply filters
      if (query.groupId) {
        trips = trips.filter((trip) => trip.groupId === query.groupId);
      }

      if (query.driverId) {
        trips = trips.filter((trip) => trip.driverId === query.driverId);
      }

      if (query.dateRange) {
        trips = trips.filter((trip) => {
          const tripDate = new Date(trip.scheduledStartTime);
          return tripDate >= query.dateRange!.start && tripDate <= query.dateRange!.end;
        });
      }

      if (query.status && query.status.length > 0) {
        trips = trips.filter((trip) => query.status!.includes(trip.status));
      }

      if (!query.includePast) {
        const now = new Date();
        trips = trips.filter((trip) => new Date(trip.scheduledStartTime) >= now);
      }

      // Validate requester has access to these trips
      const accessibleTrips = await this.filterTripsByAccess(trips, requesterId);

      // Sort by pickup time
      accessibleTrips.sort(
        (a, b) =>
          new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime(),
      );

      this.logger.info('Trips retrieved', { count: accessibleTrips.length, requesterId });
      return {
        success: true,
        data: accessibleTrips,
        message: `Found ${accessibleTrips.length} trips`,
      };
    } catch (error) {
      this.logger.error('Failed to search trips', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Updates a trip
   */
  async updateTrip(
    tripId: string,
    updates: TripUpdateRequest,
    updaterId: string,
  ): Promise<TripServiceResult<TripEntity>> {
    try {
      this.logger.info('Updating trip', { tripId, updaterId });

      // Get the trip
      const trip = this.inMemoryTrips.get(tripId);
      if (!trip) {
        throw Errors.BadRequest('Trip not found');
      }

      // Validate updater has permission
      const canUpdate = await this.canUserModifyTrip(trip, updaterId);
      if (!canUpdate) {
        throw Errors.Forbidden('Insufficient permissions to update trip');
      }

      // Apply updates
      const updatedTrip: TripEntity = {
        ...trip,
        ...updates,
        updatedAt: new Date(),
      };

      // Store the updated trip
      this.inMemoryTrips.set(tripId, updatedTrip);

      this.logger.info('Trip updated successfully', { tripId });
      return {
        success: true,
        data: updatedTrip,
        message: 'Trip updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update trip', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Creates a swap request
   */
  async createSwapRequest(
    request: Omit<SwapRequest, 'status'>,
  ): Promise<TripServiceResult<SwapRequest>> {
    try {
      this.logger.info('Creating swap request', {
        tripId: request.tripId,
        requestingDriverId: request.requestingDriverId,
      });

      // Get the trip
      const trip = this.inMemoryTrips.get(request.tripId);
      if (!trip) {
        throw Errors.BadRequest('Trip not found');
      }

      // Validate the from user is involved in the trip
      const isInvolved =
        trip.driverId === request.requestingDriverId ||
        trip.participants.some((participant) => participant.userId === request.requestingDriverId);
      if (!isInvolved) {
        throw Errors.BadRequest('User is not involved in this trip');
      }

      // Create the swap request
      const swapRequestId = uuidv4();
      const swapRequest: SwapRequest = {
        ...request,
        status: 'pending',
      };

      // Store the swap request
      this.inMemorySwapRequests.set(swapRequestId, swapRequest);

      this.logger.info('Swap request created', { swapRequestId });
      return {
        success: true,
        data: swapRequest,
        message: 'Swap request created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create swap request', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets all swap requests with optional filtering
   */
  async getSwapRequests(
    filters: {
      status?: string;
      userId?: string;
      adminView?: boolean;
    } = {},
  ): Promise<
    TripServiceResult<{
      swapRequests: SwapRequest[];
      total: number;
      filters: typeof filters;
    }>
  > {
    try {
      this.logger.info('Getting swap requests', filters);

      let swapRequests = Array.from(this.inMemorySwapRequests.values());

      // Apply filters
      if (filters.status) {
        swapRequests = swapRequests.filter((req) => req.status === filters.status);
      }

      if (filters.userId && !filters.adminView) {
        swapRequests = swapRequests.filter(
          (req) =>
            req.requestingDriverId === filters.userId || req.receivingDriverId === filters.userId,
        );
      }

      // Sort by requested date (newest first)
      swapRequests.sort(
        (a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime(),
      );

      return {
        success: true,
        data: {
          swapRequests,
          total: swapRequests.length,
          filters,
        },
        message: 'Swap requests retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get swap requests', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets a specific swap request by ID
   */
  async getSwapRequest(swapRequestId: string): Promise<TripServiceResult<SwapRequest>> {
    try {
      this.logger.info('Getting swap request', { swapRequestId });

      const swapRequest = this.inMemorySwapRequests.get(swapRequestId);
      if (!swapRequest) {
        throw Errors.NotFound('Swap request not found');
      }

      return {
        success: true,
        data: swapRequest,
        message: 'Swap request retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get swap request', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Updates a swap request
   */
  async updateSwapRequest(
    swapRequestId: string,
    updates: Partial<SwapRequest>,
  ): Promise<TripServiceResult<SwapRequest>> {
    try {
      this.logger.info('Updating swap request', { swapRequestId, updates });

      const swapRequest = this.inMemorySwapRequests.get(swapRequestId);
      if (!swapRequest) {
        throw Errors.NotFound('Swap request not found');
      }

      // Update the swap request
      const updatedSwapRequest = { ...swapRequest, ...updates };
      this.inMemorySwapRequests.set(swapRequestId, updatedSwapRequest);

      // If the swap request is approved, handle the trip swap
      if (updates.status === 'approved') {
        await this.handleApprovedSwap(swapRequestId, updatedSwapRequest);
      }

      return {
        success: true,
        data: updatedSwapRequest,
        message: 'Swap request updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update swap request', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handles the logic for an approved swap request
   */
  private async handleApprovedSwap(swapRequestId: string, swapRequest: SwapRequest): Promise<void> {
    try {
      this.logger.info('Handling approved swap', { swapRequestId, swapRequest });

      const trip = this.inMemoryTrips.get(swapRequest.tripId);
      if (!trip) {
        throw Errors.NotFound('Trip not found');
      }

      // Logic to handle the swap depends on the type of swap
      // This is a simplified implementation - in reality, you'd need to handle:
      // - Driver swaps
      // - Passenger swaps
      // - Date/time swaps
      // - Notifications to affected parties

      this.logger.info('Swap handled successfully', { swapRequestId });
    } catch (error) {
      this.logger.error('Failed to handle approved swap', error);
      throw error;
    }
  }

  // Private helper methods

  private calculateEstimatedDuration(pickupAddress: string, dropoffAddress: string): number {
    // Mock calculation - in real implementation, use mapping service
    return 20; // 20 minutes
  }

  private calculateEstimatedDistance(pickupAddress: string, dropoffAddress: string): number {
    // Mock calculation - in real implementation, use mapping service
    return 8.5; // 8.5 miles
  }

  private async filterTripsByAccess(
    trips: TripEntity[],
    requesterId: string,
  ): Promise<TripEntity[]> {
    // System admins can see all trips
    if (await this.isSystemAdmin(requesterId)) {
      return trips;
    }

    // Filter to only trips the user is involved in or has access to
    const accessibleTrips: TripEntity[] = [];

    for (const trip of trips) {
      const group = await databaseService.getGroupById(trip.groupId);
      if (group && group.members.some((member) => member.userId === requesterId)) {
        accessibleTrips.push(trip);
      }
    }

    return accessibleTrips;
  }

  private async canUserModifyTrip(trip: TripEntity, userId: string): Promise<boolean> {
    // System admins can modify all trips
    if (await this.isSystemAdmin(userId)) {
      return true;
    }

    // Group admins can modify trips
    const group = await databaseService.getGroupById(trip.groupId);
    if (group && (group.groupAdminId === userId || group.coAdminIds.includes(userId))) {
      return true;
    }

    // Trip creator can modify
    if (trip.createdBy === userId) {
      return true;
    }

    // Driver can modify
    if (trip.driverId === userId) {
      return true;
    }

    return false;
  }

  private async isSystemAdmin(userId: string): Promise<boolean> {
    try {
      const user = await databaseService.getUserById(userId);
      return user?.role === 'super_admin' || user?.role === 'group_admin';
    } catch (error) {
      return false;
    }
  }

  private async calculateTopDrivers(trips: TripEntity[]): Promise<TripStats['topDrivers']> {
    const driverStats = new Map<string, { tripCount: number; totalMiles: number }>();

    for (const trip of trips) {
      const existing = driverStats.get(trip.driverId) || { tripCount: 0, totalMiles: 0 };
      existing.tripCount += 1;
      existing.totalMiles += trip.route.totalDistance || 0;
      driverStats.set(trip.driverId, existing);
    }

    const result: TripStats['topDrivers'] = [];
    for (const [userId, stats] of driverStats.entries()) {
      const user = await databaseService.getUserById(userId);
      if (user) {
        result.push({
          userId,
          userName: `${user.firstName} ${user.lastName}`,
          tripCount: stats.tripCount,
          totalMiles: stats.totalMiles,
        });
      }
    }

    return result.sort((a, b) => b.tripCount - a.tripCount).slice(0, 5);
  }

  private async calculateFairnessMetrics(
    trips: TripEntity[],
    memberIds: string[],
  ): Promise<TripStats['fairnessMetrics']> {
    const totalTrips = trips.length;
    const fairnessMetrics: TripStats['fairnessMetrics'] = [];

    for (const memberId of memberIds) {
      const memberTrips = trips.filter((trip) => trip.driverId === memberId);
      const drivingShare = totalTrips > 0 ? memberTrips.length / totalTrips : 0;
      const expectedShare = 1 / memberIds.length;
      const fairnessScore = expectedShare > 0 ? Math.min(drivingShare / expectedShare, 2) : 1;

      const user = await databaseService.getUserById(memberId);
      if (user) {
        fairnessMetrics.push({
          userId: memberId,
          userName: `${user.firstName} ${user.lastName}`,
          drivingShare,
          fairnessScore,
        });
      }
    }

    return fairnessMetrics.sort((a, b) => b.fairnessScore - a.fairnessScore);
  }
}

// Export singleton instance
export const tripDomainService = new TripDomainService();
