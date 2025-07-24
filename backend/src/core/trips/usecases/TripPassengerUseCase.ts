import { Trip, TripStatus } from "@carpool/shared";
import { TripRepositoryPort } from "../ports/TripRepositoryPort";
import { Errors } from "../../../utils/error-handler";

export class TripPassengerUseCase {
  constructor(private readonly tripRepository: TripRepositoryPort) {}

  /**
   * Join a trip as a passenger (adds the passenger and decreases seat count)
   */
  async joinTrip(
    tripId: string,
    passengerId: string,
    pickupLocation: string
  ): Promise<Trip | null> {
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw Errors.NotFound("Trip not found");
    }

    if (trip.passengers.includes(passengerId)) {
      throw Errors.Conflict("User is already a passenger on this trip");
    }

    if (trip.availableSeats <= 0 || trip.status !== ("planned" as TripStatus)) {
      throw Errors.BadRequest("No available seats on this trip");
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
          estimatedTime: trip.departureTime,
        },
      ],
      updatedAt: new Date(),
    };

    return this.tripRepository.update(tripId, updatedTrip);
  }

  /**
   * Leave a trip (removes passenger and frees seat)
   */
  async leaveTrip(tripId: string, passengerId: string): Promise<Trip | null> {
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw Errors.NotFound("Trip not found");
    }

    if (!trip.passengers.includes(passengerId)) {
      throw Errors.BadRequest("User is not a passenger on this trip");
    }

    const updatedTrip: Trip = {
      ...trip,
      passengers: trip.passengers.filter((id) => id !== passengerId),
      availableSeats: trip.availableSeats + 1,
      pickupLocations: trip.pickupLocations.filter(
        (loc: any) => loc.userId !== passengerId
      ),
      updatedAt: new Date(),
    };

    return this.tripRepository.update(tripId, updatedTrip);
  }
}
