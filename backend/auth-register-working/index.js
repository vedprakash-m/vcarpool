const { v4: uuidv4 } = require("uuid");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Registration function triggered");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  try {
    const { email, password, firstName, lastName, phoneNumber, department } =
      req.body || {};

    context.log("Registration request for:", email);

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      context.res = UnifiedResponseHandler.validationError(
        "Email, password, first name, and last name are required"
      );
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      context.res = UnifiedResponseHandler.validationError(
        "Invalid email format"
      );
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      context.res = UnifiedResponseHandler.validationError(
        "Password must be at least 8 characters long"
      );
      return;
    }

    // For immediate functionality, create mock user response
    const mockUser = {
      id: uuidv4(),
      email: email.toLowerCase(),
      firstName: firstName,
      lastName: lastName,
      role: "parent",
      phoneNumber: phoneNumber || null,
      department: department || null,
      homeAddress: null,
      isActiveDriver: false,
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
        isDriver: false,
        smokingAllowed: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create mock JWT tokens
    const mockToken = Buffer.from(
      JSON.stringify({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      })
    ).toString("base64");

    const mockRefreshToken = Buffer.from(
      JSON.stringify({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        type: "refresh",
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      })
    ).toString("base64");

    context.log("Registration successful for:", email);

    context.res = UnifiedResponseHandler.created({
      user: mockUser,
      token: mockToken,
      refreshToken: mockRefreshToken,
    });
  } catch (error) {
    context.log("Registration error:", error.message);
    context.res = UnifiedResponseHandler.internalError(
      "Registration failed. Please try again later."
    );
  }
};
