const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Users me function started");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    // Return current user data
    // In a real app, this would verify the JWT token and get user from DB
    const user = {
      id: "mock-admin-id",
      email: "admin@example.com", // Mock email - not a real address
      firstName: "Test",
      lastName: "Admin",
      role: "admin",
      profilePicture: null,
      phoneNumber: null,
      organizationId: null,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false,
          tripReminders: true,
          swapRequests: true,
          scheduleChanges: true,
        },
        privacy: {
          showPhoneNumber: true,
          showEmail: false,
        },
        pickupLocation: "Home",
        dropoffLocation: "School",
        preferredTime: "08:00",
        isDriver: true,
        smokingAllowed: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    context.log("Returning user data for:", user.email);

    context.res = UnifiedResponseHandler.success(user);
  } catch (error) {
    context.log("Users me error:", error);
    context.res = UnifiedResponseHandler.handleException(error);
  }
};
