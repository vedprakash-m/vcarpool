"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripService = void 0;
const uuid_1 = require("uuid");
const email_service_1 = require("./email.service");
const trip_repository_1 = require("../repositories/trip.repository");
const user_repository_1 = require("../repositories/user.repository");
const error_handler_1 = require("../utils/error-handler");
class TripService {
    tripRepository;
    userRepository;
    emailService;
    // Static methods for backward compatibility  
    static async getTripById(tripId) {
        const { containers } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const tripRepository = new trip_repository_1.TripRepository(containers.trips);
        const userRepository = new user_repository_1.UserRepository(containers.users);
        const emailService = new email_service_1.EmailService();
        const tripService = new TripService(tripRepository, userRepository, emailService);
        return tripService.getTripById(tripId);
    }
    static async updateTrip(tripId, updates) {
        const { containers } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const tripRepository = new trip_repository_1.TripRepository(containers.trips);
        const userRepository = new user_repository_1.UserRepository(containers.users);
        const emailService = new email_service_1.EmailService();
        const tripService = new TripService(tripRepository, userRepository, emailService);
        return tripService.updateTrip(tripId, updates);
    }
    logger;
    constructor(tripRepository, userRepository, emailService, logger) {
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.logger = logger || {
            debug: (message, data) => console.debug(message, data),
            info: (message, data) => console.info(message, data),
            warn: (message, data) => console.warn(message, data),
            error: (message, error) => console.error(message, error),
            setContext: () => { },
            child: () => this.logger,
            startTimer: (label) => () => console.time(label)
        };
    }
    /**
     * Create a new trip
     */
    async createTrip(driverId, tripData, driver) {
        const trip = {
            id: (0, uuid_1.v4)(),
            driverId,
            passengers: [],
            date: new Date(tripData.date),
            departureTime: tripData.departureTime,
            arrivalTime: tripData.arrivalTime,
            pickupLocations: [],
            destination: tripData.destination,
            maxPassengers: tripData.maxPassengers,
            availableSeats: tripData.maxPassengers,
            status: 'planned',
            cost: tripData.cost,
            notes: tripData.notes,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const createdTrip = await this.tripRepository.create(trip);
        // Send email notification if driver info is provided
        if (driver) {
            try {
                await this.emailService.sendTripCreatedNotification(driver.email, `${driver.firstName} ${driver.lastName}`, {
                    date: tripData.date,
                    departureTime: tripData.departureTime,
                    destination: tripData.destination,
                    maxPassengers: tripData.maxPassengers
                });
            }
            catch (error) {
                console.error('Failed to send email notification:', error);
                // Don't throw error - trip creation was successful
            }
        }
        return createdTrip;
    }
    /**
     * Get trip by ID
     */
    async getTripById(tripId) {
        try {
            return await this.tripRepository.findById(tripId);
        }
        catch (error) {
            console.error(`Error fetching trip with ID ${tripId}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error fetching trip: ${error.message}`);
        }
    }
    /**
     * Get trips with filters
     */
    async getTrips(filters) {
        try {
            let query = 'SELECT * FROM c WHERE 1=1';
            const parameters = [];
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
            if (filters.date) {
                query += ' AND c.date = @date';
                parameters.push({ name: '@date', value: filters.date });
            }
            else {
                // Default to upcoming trips if no date is specified
                const today = new Date().toISOString().split('T')[0];
                query += ' AND c.date >= @today';
                parameters.push({ name: '@today', value: today });
            }
            // Order by date and departure time
            query += ' ORDER BY c.date ASC, c.departureTime ASC';
            // Get the trips using the repository
            const trips = await this.tripRepository.query({
                query,
                parameters
            });
            // Calculate total count
            let countQuery = query.replace('SELECT * FROM c', 'SELECT VALUE COUNT(1) FROM c')
                .replace(' ORDER BY c.date ASC, c.departureTime ASC', '');
            // Get total count using repository
            const countResults = await this.tripRepository.query({
                query: countQuery,
                parameters
            });
            const total = countResults.length > 0 ? parseInt(countResults[0]) : 0;
            // Apply pagination in the service layer if needed
            let paginatedTrips = trips;
            if (filters.limit && filters.limit > 0) {
                const offset = filters.offset || 0;
                paginatedTrips = trips.slice(offset, offset + filters.limit);
            }
            return {
                trips: paginatedTrips,
                total
            };
        }
        catch (error) {
            console.error('Error fetching trips:', error);
            throw error_handler_1.Errors.InternalServerError(`Error fetching trips: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update trip
     */
    async updateTrip(tripId, updates) {
        try {
            const existingTrip = await this.getTripById(tripId);
            if (!existingTrip) {
                return null;
            }
            const updatedTrip = {
                ...existingTrip,
                ...updates,
                // Ensure date is a Date object if provided
                date: updates.date ? new Date(updates.date) : existingTrip.date,
                updatedAt: new Date()
            };
            return await this.tripRepository.update(tripId, updatedTrip);
        }
        catch (error) {
            console.error(`Error updating trip ${tripId}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error updating trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Cancel trip
     */
    async cancelTrip(tripId) {
        return this.updateTrip(tripId, { status: 'cancelled' });
    }
    /**
     * Add passenger to trip
     */
    async addPassenger(tripId, passengerId, pickupLocation) {
        try {
            const trip = await this.getTripById(tripId);
            if (!trip) {
                throw error_handler_1.Errors.NotFound('Trip not found');
            }
            if (trip.passengers.includes(passengerId)) {
                throw error_handler_1.Errors.Conflict('User is already a passenger on this trip');
            }
            if (trip.availableSeats <= 0) {
                throw error_handler_1.Errors.BadRequest('No available seats on this trip');
            }
            const updatedTrip = {
                ...trip,
                passengers: [...trip.passengers, passengerId],
                availableSeats: trip.availableSeats - 1,
                pickupLocations: [
                    ...trip.pickupLocations,
                    {
                        userId: passengerId,
                        address: pickupLocation,
                        estimatedTime: trip.departureTime // TODO: Calculate actual pickup time
                    }
                ],
                updatedAt: new Date()
            };
            return await this.tripRepository.update(tripId, updatedTrip);
        }
        catch (error) {
            if (error instanceof Error) {
                throw error; // Re-throw AppErrors
            }
            console.error(`Error adding passenger to trip ${tripId}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error adding passenger to trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Remove passenger from trip
     */
    async removePassenger(tripId, passengerId) {
        try {
            const trip = await this.getTripById(tripId);
            if (!trip) {
                throw error_handler_1.Errors.NotFound('Trip not found');
            }
            if (!trip.passengers.includes(passengerId)) {
                throw error_handler_1.Errors.BadRequest('User is not a passenger on this trip');
            }
            const updatedTrip = {
                ...trip,
                passengers: trip.passengers.filter((id) => id !== passengerId),
                availableSeats: trip.availableSeats + 1,
                pickupLocations: trip.pickupLocations.filter((loc) => loc.userId !== passengerId),
                updatedAt: new Date()
            };
            return await this.tripRepository.update(tripId, updatedTrip);
        }
        catch (error) {
            if (error instanceof Error) {
                throw error; // Re-throw AppErrors
            }
            console.error(`Error removing passenger from trip ${tripId}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error removing passenger from trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get user's upcoming trips (as driver or passenger)
     */
    async getUserUpcomingTrips(userId) {
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
                    { name: '@today', value: today }
                ]
            };
            return await this.tripRepository.query(query);
        }
        catch (error) {
            console.error(`Error fetching upcoming trips for user ${userId}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error fetching upcoming trips: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get trip statistics for a user
     */
    async getTripStats(userId) {
        try {
            const query = {
                query: `
          SELECT * FROM c 
          WHERE (c.driverId = @userId OR ARRAY_CONTAINS(c.passengers, @userId))
          AND c.status = 'completed'
        `,
                parameters: [{ name: '@userId', value: userId }]
            };
            const trips = await this.tripRepository.query(query);
            const tripsAsDriver = trips.filter((trip) => trip.driverId === userId);
            const tripsAsPassenger = trips.filter((trip) => trip.passengers.includes(userId) && trip.driverId !== userId);
            // Calculate approximate cost savings (simplified calculation)
            const costSavings = tripsAsPassenger.reduce((total, trip) => {
                return total + (trip.cost || 0);
            }, 0);
            return {
                totalTrips: trips.length,
                tripsAsDriver: tripsAsDriver.length,
                tripsAsPassenger: tripsAsPassenger.length,
                totalDistance: 0, // TODO: Implement distance calculation
                costSavings
            };
        }
        catch (error) {
            console.error(`Error fetching trip statistics for user ${userId}:`, error);
            throw error_handler_1.Errors.InternalServerError(`Error fetching trip statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.TripService = TripService;
//# sourceMappingURL=trip.service.js.map