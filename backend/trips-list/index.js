const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Trips list function started");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    if (req.method !== "GET") {
      context.res = UnifiedResponseHandler.error(
        "METHOD_NOT_ALLOWED",
        "Method not allowed",
        405
      );
      return;
    }

    // Get configurable school name from environment or use default
    const primarySchool =
      process.env.PRIMARY_SCHOOL_NAME || "Main Elementary School";

    // Mock trip data for now - using configurable school names
    const mockTrips = [
      {
        id: "trip1",
        driverId: "user1",
        destination: `${primarySchool}`,
        date: new Date("2025-01-10"),
        departureTime: "08:00",
        arrivalTime: "08:30",
        maxPassengers: 4,
        passengers: ["user2", "user3"],
        availableSeats: 2,
        cost: 5.5,
        status: "planned",
        notes: "Regular morning school run",
      },
      {
        id: "trip2",
        driverId: "user2",
        destination: "Shopping Mall",
        date: new Date("2025-01-12"),
        departureTime: "14:00",
        arrivalTime: "14:20",
        maxPassengers: 3,
        passengers: [],
        availableSeats: 3,
        cost: 3.0,
        status: "planned",
        notes: "Weekend shopping trip",
      },
    ];

    context.res = UnifiedResponseHandler.success(mockTrips, {
      pagination: {
        page: 1,
        limit: 20,
        total: mockTrips.length,
        totalPages: 1,
      },
    });
  } catch (error) {
    context.log.error("Error in trips list:", error);
    context.res = UnifiedResponseHandler.handleException(error);
  }
};
