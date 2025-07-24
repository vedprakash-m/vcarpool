import { Container } from '@azure/cosmos';
import { Trip } from '@carpool/shared';
import { TripRepositoryPort } from '../core/trips/ports/TripRepositoryPort';

export class TripRepository implements TripRepositoryPort {
  constructor(private container: Container) {}

  async create(trip: Trip): Promise<Trip> {
    const { resource } = await this.container.items.create(trip);
    return resource as Trip;
  }

  async findById(id: string): Promise<Trip | null> {
    try {
      const { resource } = await this.container.item(id).read<Trip>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async update(id: string, trip: Trip): Promise<Trip> {
    const { resource } = await this.container.item(id).replace(trip);
    return resource as Trip;
  }

  async delete(id: string): Promise<void> {
    await this.container.item(id).delete();
  }

  async findDriverTrips(driverId: string): Promise<Trip[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.driverId = @driverId ORDER BY c.date DESC',
      parameters: [{ name: '@driverId', value: driverId }],
    };

    const { resources } = await this.container.items.query<Trip>(query).fetchAll();
    return resources;
  }

  async findPassengerTrips(passengerId: string): Promise<Trip[]> {
    const query = {
      query:
        'SELECT * FROM c WHERE ARRAY_CONTAINS(c.passengers, @passengerId) ORDER BY c.date DESC',
      parameters: [{ name: '@passengerId', value: passengerId }],
    };

    const { resources } = await this.container.items.query<Trip>(query).fetchAll();
    return resources;
  }

  async findUpcomingTrips(userId: string): Promise<Trip[]> {
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

    const { resources } = await this.container.items.query<Trip>(query).fetchAll();
    return resources;
  }

  async findAvailableTrips(excludeUserId: string, date?: string): Promise<Trip[]> {
    let query = `
      SELECT * FROM c 
      WHERE c.availableSeats > 0
      AND c.status = 'planned'
      AND c.driverId != @userId
      AND NOT ARRAY_CONTAINS(c.passengers, @userId)
    `;

    const parameters = [{ name: '@userId', value: excludeUserId }];

    if (date) {
      query += ' AND c.date = @date';
      parameters.push({ name: '@date', value: date });
    } else {
      const today = new Date().toISOString().split('T')[0];
      query += ' AND c.date >= @today';
      parameters.push({ name: '@today', value: today });
    }

    query += ' ORDER BY c.date ASC, c.departureTime ASC';

    const { resources } = await this.container.items
      .query<Trip>({
        query,
        parameters,
      })
      .fetchAll();

    return resources;
  }

  async query(querySpec: {
    query: string;
    parameters: Array<{ name: string; value: any }>;
  }): Promise<Trip[]> {
    const { resources } = await this.container.items.query<Trip>(querySpec).fetchAll();
    return resources;
  }
}
