import { v4 as uuidv4 } from "uuid";
import { Trip, TripStatus, CreateTripRequest, User } from "@carpool/shared";
import { TripRepositoryPort } from "../ports/TripRepositoryPort";

export class CreateTripUseCase {
  constructor(private readonly tripRepository: TripRepositoryPort) {}

  async execute(
    driverId: string,
    data: CreateTripRequest,
    driver?: User
  ): Promise<Trip> {
    const trip: Trip = {
      id: uuidv4(),
      driverId,
      passengers: [],
      date: new Date(data.date),
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      pickupLocations: [],
      destination: data.destination,
      maxPassengers: data.maxPassengers,
      availableSeats: data.maxPassengers,
      status: "planned" as TripStatus,
      cost: data.cost,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.tripRepository.create(trip);
  }
}
