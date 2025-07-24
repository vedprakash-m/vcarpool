"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripRepository = void 0;
class TripRepository {
    container;
    constructor(container) {
        this.container = container;
    }
    async create(trip) {
        const { resource } = await this.container.items.create(trip);
        return resource;
    }
    async findById(id) {
        try {
            const { resource } = await this.container.item(id).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    async update(id, trip) {
        const { resource } = await this.container.item(id).replace(trip);
        return resource;
    }
    async delete(id) {
        await this.container.item(id).delete();
    }
    async findDriverTrips(driverId) {
        const query = {
            query: "SELECT * FROM c WHERE c.driverId = @driverId ORDER BY c.date DESC",
            parameters: [{ name: "@driverId", value: driverId }]
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources;
    }
    async findPassengerTrips(passengerId) {
        const query = {
            query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.passengers, @passengerId) ORDER BY c.date DESC",
            parameters: [{ name: "@passengerId", value: passengerId }]
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources;
    }
    async findUpcomingTrips(userId) {
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
                { name: "@userId", value: userId },
                { name: "@today", value: today }
            ]
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources;
    }
    async findAvailableTrips(excludeUserId, date) {
        let query = `
      SELECT * FROM c 
      WHERE c.availableSeats > 0
      AND c.status = 'planned'
      AND c.driverId != @userId
      AND NOT ARRAY_CONTAINS(c.passengers, @userId)
    `;
        const parameters = [{ name: "@userId", value: excludeUserId }];
        if (date) {
            query += " AND c.date = @date";
            parameters.push({ name: "@date", value: date });
        }
        else {
            const today = new Date().toISOString().split('T')[0];
            query += " AND c.date >= @today";
            parameters.push({ name: "@today", value: today });
        }
        query += " ORDER BY c.date ASC, c.departureTime ASC";
        const { resources } = await this.container.items.query({
            query,
            parameters
        }).fetchAll();
        return resources;
    }
    async query(querySpec) {
        const { resources } = await this.container.items.query(querySpec).fetchAll();
        return resources;
    }
}
exports.TripRepository = TripRepository;
