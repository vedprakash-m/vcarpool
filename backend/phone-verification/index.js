const { v4: uuidv4 } = require("uuid");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Mock phone verification storage (in production, use database/cache)
let mockVerificationCodes = new Map();
let mockVerifiedPhones = new Set();

// Mock users for testing
let mockUsers = [
  {
    id: "parent-123",
    email: "john.parent@example.com",
    phoneNumber: "+1234567890",
    phoneNumberVerified: false,
  },
  {
    id: "parent-456",
    email: "jane.parent@example.com",
    phoneNumber: "+1987654321",
    phoneNumberVerified: true,
  },
];

module.exports = async function (context, req) {
  context.log("Phone Verification API called");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  try {
    const method = req.method;
    const { action } = req.query;

    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res = UnifiedResponseHandler.authError(
        "Missing or invalid authorization token"
      );
      return;
    }

    // Extract user ID from token (mock - in production, decode JWT)
    const token = authHeader.split(" ")[1];
    const userId = "parent-123"; // In production, extract from JWT

    // Route based on method and action
    if (method === "POST" && action === "send-code") {
      return await sendVerificationCode(userId, req.body, context);
    }

    if (method === "POST" && action === "verify-code") {
      return await verifyCode(userId, req.body, context);
    }

    if (method === "GET" && action === "status") {
      return await getVerificationStatus(userId, context);
    }

    context.res =
      UnifiedResponseHandler.methodNotAllowedError("Method not allowed");
    return;
  } catch (error) {
    context.log.error("Phone Verification API error:", error);
    context.res = UnifiedResponseHandler.internalError(
      "Internal server error occurred"
    );
  }
};

// Send SMS verification code
async function sendVerificationCode(userId, requestData, context) {
  try {
    const { phoneNumber } = requestData;
    if (!phoneNumber) {
      context.res = UnifiedResponseHandler.validationError(
        "Phone number is required"
      );
      return;
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\D/g, ""))) {
      context.res = UnifiedResponseHandler.validationError(
        "Please enter a valid US phone number"
      );
      return;
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code (in production, store in database/cache)
    mockVerificationCodes.set(phoneNumber, {
      code: verificationCode,
      userId: userId,
      expiresAt: expiresAt,
      attempts: 0,
      maxAttempts: 3,
    });

    // In production, send SMS via Twilio, AWS SNS, or similar service
    context.log(
      `Mock SMS to ${phoneNumber}: Your Carpool verification code is ${verificationCode}`
    );

    // Update user's phone number
    const userIndex = mockUsers.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      mockUsers[userIndex].phoneNumber = phoneNumber;
    }

    context.res = UnifiedResponseHandler.success(
      {
        phoneNumber: phoneNumber,
        expiresIn: 600, // 10 minutes in seconds
        // In development, include the code for testing
        verificationCode:
          process.env.NODE_ENV === "development" ? verificationCode : undefined,
      },
      "Verification code sent successfully"
    );
    return;
  } catch (error) {
    context.log.error("Send verification code error:", error);
    throw error;
  }
}

// Verify SMS code
async function verifyCode(userId, requestData, context) {
  try {
    const { phoneNumber, code } = requestData;

    if (!phoneNumber || !code) {
      context.res = UnifiedResponseHandler.validationError(
        "Phone number and verification code are required"
      );
      return;
    }

    // Get stored verification data
    const storedData = mockVerificationCodes.get(phoneNumber);
    if (!storedData) {
      context.res = UnifiedResponseHandler.validationError(
        "No verification code pending for this phone number"
      );
      return;
    }

    // Check if code has expired
    if (new Date() > storedData.expiresAt) {
      mockVerificationCodes.delete(phoneNumber);
      context.res = UnifiedResponseHandler.validationError(
        "Verification code has expired. Please request a new one."
      );
      return;
    }

    // Check if too many attempts
    if (storedData.attempts >= storedData.maxAttempts) {
      mockVerificationCodes.delete(phoneNumber);
      context.res = UnifiedResponseHandler.validationError(
        "Too many verification attempts. Please request a new code."
      );
      return;
    }

    // Verify the code
    if (storedData.code !== code) {
      storedData.attempts++;
      mockVerificationCodes.set(phoneNumber, storedData);

      context.res = UnifiedResponseHandler.validationError(
        `Invalid verification code. ${
          storedData.maxAttempts - storedData.attempts
        } attempts remaining.`
      );
      return;
    }

    // Code is valid - mark phone as verified
    mockVerificationCodes.delete(phoneNumber);
    mockVerifiedPhones.add(phoneNumber);

    // Update user verification status
    const userIndex = mockUsers.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      mockUsers[userIndex].phoneNumberVerified = true;
    }

    context.res = UnifiedResponseHandler.success(
      {
        phoneNumber: phoneNumber,
        verified: true,
        verifiedAt: new Date().toISOString(),
      },
      "Phone number verified successfully"
    );
    return;
  } catch (error) {
    context.log.error("Verify code error:", error);
    throw error;
  }
}

// Get verification status
async function getVerificationStatus(userId, context) {
  try {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) {
      context.res = UnifiedResponseHandler.notFoundError("User not found");
      return;
    }

    context.res = UnifiedResponseHandler.success({
      phoneNumber: user.phoneNumber,
      verified: user.phoneNumberVerified || false,
      hasPendingVerification: user.phoneNumber
        ? mockVerificationCodes.has(user.phoneNumber)
        : false,
    });
    return;
  } catch (error) {
    context.log.error("Get verification status error:", error);
    throw error;
  }
}
