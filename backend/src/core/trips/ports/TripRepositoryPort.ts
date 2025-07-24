import { Trip } from "@carpool/shared";

export interface TripRepositoryPort {
  create(trip: Trip): Promise<Trip>;
  findById(id: string): Promise<Trip | null>;
  update(id: string, trip: Trip): Promise<Trip>;
  delete(id: string): Promise<void>;
  findDriverTrips(driverId: string): Promise<Trip[]>;
  findPassengerTrips(passengerId: string): Promise<Trip[]>;
  findUpcomingTrips(userId: string): Promise<Trip[]>;
  findAvailableTrips(excludeUserId: string, date?: string): Promise<Trip[]>;
}
