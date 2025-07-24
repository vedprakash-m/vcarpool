const { CosmosClient } = require("@azure/cosmos");
const jwt = require("jsonwebtoken");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Initialize Cosmos DB client
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY,
});

const database = cosmosClient.database(
  process.env.COSMOS_DB_DATABASE || "carpool"
);
const tripsContainer = database.container("trips");
const usersContainer = database.container("users");

module.exports = async function (context, req) {
  context.log("Database-integrated trips stats function started");
  context.log("Request method:", req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  try {
    // Extract user from JWT token (if provided)
    let userId = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "default-jwt-secret"
        );
        userId = decoded.userId;
        context.log("User ID from token:", userId);
      } catch (tokenError) {
        context.log("Token verification failed:", tokenError.message);
      }
    }

    if (userId) {
      // Query real database for user-specific statistics
      const tripsAsDriverQuery = {
        query: "SELECT * FROM c WHERE c.driverId = @userId",
        parameters: [{ name: "@userId", value: userId }],
      };

      const tripsAsPassengerQuery = {
        query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.passengers, @userId)",
        parameters: [{ name: "@userId", value: userId }],
      };

      const upcomingTripsQuery = {
        query:
          "SELECT * FROM c WHERE (c.driverId = @userId OR ARRAY_CONTAINS(c.passengers, @userId)) AND c.departureTime > @now",
        parameters: [
          { name: "@userId", value: userId },
          { name: "@now", value: new Date().toISOString() },
        ],
      };

      // Execute queries in parallel
      const [driverTripsResult, passengerTripsResult, upcomingTripsResult] =
        await Promise.all([
          tripsContainer.items.query(tripsAsDriverQuery).fetchAll(),
          tripsContainer.items.query(tripsAsPassengerQuery).fetchAll(),
          tripsContainer.items.query(upcomingTripsQuery).fetchAll(),
        ]);

      const driverTrips = driverTripsResult.resources;
      const passengerTrips = passengerTripsResult.resources;
      const upcomingTrips = upcomingTripsResult.resources;

      // Calculate statistics from real data
      const totalTrips = driverTrips.length + passengerTrips.length;
      const totalDistance =
        driverTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0) +
        passengerTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);

      // Calculate miles and time savings instead of cost
      const milesSaved = Math.ceil(totalDistance * 0.6); // Estimated miles saved by carpooling
      const timeSavedHours = Math.ceil(totalTrips * 0.5); // Estimate 30min saved per trip

      // Weekly school trips (filter for school-related trips)
      const schoolTrips = [...driverTrips, ...passengerTrips].filter(
        (trip) =>
          trip.destination && trip.destination.toLowerCase().includes("school")
      );
      const weeklySchoolTrips = Math.ceil(schoolTrips.length / 4); // Rough weekly average

      // Get user data for children count
      let childrenCount = 0;
      try {
        const { resource: user } = await usersContainer.item(userId).read();
        if (user && user.role === "parent") {
          // Query for children
          const childrenQuery = {
            query: "SELECT VALUE COUNT(1) FROM c WHERE c.parentId = @parentId",
            parameters: [{ name: "@parentId", value: userId }],
          };
          const childrenResult = await usersContainer.items
            .query(childrenQuery)
            .fetchAll();
          childrenCount = childrenResult.resources[0] || 0;
        }
      } catch (userError) {
        context.log("Error fetching user data:", userError.message);
      }

      const stats = {
        totalTrips: totalTrips,
        tripsAsDriver: driverTrips.length,
        tripsAsPassenger: passengerTrips.length,
        totalDistance: totalDistance,
        milesSaved: milesSaved,
        upcomingTrips: upcomingTrips.length,
        // School-focused statistics
        weeklySchoolTrips: weeklySchoolTrips,
        childrenCount: childrenCount,
        timeSavedHours: timeSavedHours,
      };

      context.log(
        "Returning database-calculated stats for user:",
        userId,
        stats
      );

      context.res = UnifiedResponseHandler.success(stats);
    } else {
      // Return zero stats for unauthenticated users or new users without groups
      context.log(
        "No valid user token, returning zero stats to trigger onboarding"
      );

      const zeroStats = {
        totalTrips: 0,
        tripsAsDriver: 0,
        tripsAsPassenger: 0,
        totalDistance: 0,
        milesSaved: 0,
        upcomingTrips: 0,
        // School-focused statistics for dashboard - zero for new users
        weeklySchoolTrips: 0,
        childrenCount: 0,
        timeSavedHours: 0,
      };

      context.res = UnifiedResponseHandler.success(zeroStats);
    }
  } catch (error) {
    context.log("Database stats error:", error);

    // Return zero stats on any error to prevent showing incorrect data
    const fallbackStats = {
      totalTrips: 0,
      tripsAsDriver: 0,
      tripsAsPassenger: 0,
      totalDistance: 0,
      milesSaved: 0,
      upcomingTrips: 0,
      // School-focused statistics for dashboard - zero for safety
      weeklySchoolTrips: 0,
      childrenCount: 0,
      timeSavedHours: 0,
    };

    context.res = UnifiedResponseHandler.success(fallbackStats);
  }
};
