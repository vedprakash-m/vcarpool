const { app } = require("@azure/functions");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Mock emergency contact database
const mockEmergencyContacts = new Map();
const verificationCodes = new Map();

// Helper function to validate emergency contact data
function validateEmergencyContact(contact) {
  const errors = [];

  if (!contact.name || contact.name.trim().length < 2) {
    errors.push("Emergency contact name must be at least 2 characters");
  }

  if (
    !contact.relationship ||
    ![
      "parent",
      "guardian",
      "grandparent",
      "family_friend",
      "relative",
      "other",
    ].includes(contact.relationship)
  ) {
    errors.push("Valid relationship is required");
  }

  if (
    !contact.phoneNumber ||
    !/^\+?1?[2-9]\d{9}$/.test(contact.phoneNumber.replace(/\D/g, ""))
  ) {
    errors.push("Valid US phone number is required");
  }

  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.push("Valid email address is required if provided");
  }

  return errors;
}

// Helper function to generate verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to send verification SMS (mock)
async function sendVerificationSMS(phoneNumber, code, contactName) {
  // In production, use Azure Communication Services or Twilio
  console.log(
    `[MOCK SMS] Sending verification code ${code} to ${phoneNumber} for emergency contact ${contactName}`
  );

  // Simulate SMS delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    success: true,
    messageId: `mock_sms_${Date.now()}`,
    message: `Verification code sent to ${phoneNumber}`,
  };
}

app.http("emergency-contact-verification", {
  methods: ["POST", "PUT"],
  authLevel: "anonymous",
  route: "emergency-contacts/verify",
  handler: async (request, context) => {
    try {
      // Handle OPTIONS preflight request
      if (request.method === "OPTIONS") {
        return UnifiedResponseHandler.preflight();
      }

      const body = await request.json();
      const { action, userId, contactData, verificationCode } = body;

      // Mock authentication - in production, validate JWT token
      if (!userId) {
        return UnifiedResponseHandler.authError("Authentication required");
      }

      switch (action) {
        case "add_contact":
          // Validate emergency contact data
          const validationErrors = validateEmergencyContact(contactData);
          if (validationErrors.length > 0) {
            return UnifiedResponseHandler.validationError(
              "Validation failed",
              validationErrors
            );
          }

          // Generate and send verification code
          const code = generateVerificationCode();
          const contactId = `${userId}_${Date.now()}`;

          // Store contact data temporarily
          const contactKey = `${userId}_${contactData.phoneNumber}`;
          mockEmergencyContacts.set(contactKey, {
            id: contactId,
            userId,
            ...contactData,
            verified: false,
            createdAt: new Date().toISOString(),
          });

          // Store verification code
          verificationCodes.set(contactKey, {
            code,
            attempts: 0,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
            contactId,
          });

          // Send verification SMS
          const smsResult = await sendVerificationSMS(
            contactData.phoneNumber,
            code,
            contactData.name
          );

          return UnifiedResponseHandler.success(
            {
              contactId,
              message: `Verification code sent to ${contactData.phoneNumber}`,
              expiresAt: verificationCodes.get(contactKey).expiresAt,
            },
            200
          );

        case "verify_contact":
          if (!verificationCode || !contactData?.phoneNumber) {
            return UnifiedResponseHandler.validationError(
              "Verification code and phone number are required"
            );
          }

          const verifyKey = `${userId}_${contactData.phoneNumber}`;
          const storedVerification = verificationCodes.get(verifyKey);
          const storedContact = mockEmergencyContacts.get(verifyKey);

          if (!storedVerification || !storedContact) {
            return UnifiedResponseHandler.validationError(
              "No verification in progress for this contact"
            );
          }

          // Check if code expired
          if (new Date() > new Date(storedVerification.expiresAt)) {
            verificationCodes.delete(verifyKey);
            return UnifiedResponseHandler.validationError(
              "Verification code has expired"
            );
          }

          // Check attempt limit
          if (storedVerification.attempts >= 3) {
            verificationCodes.delete(verifyKey);
            return UnifiedResponseHandler.validationError(
              "Too many verification attempts"
            );
          }

          // Increment attempts
          storedVerification.attempts++;

          // Verify code
          if (storedVerification.code !== verificationCode) {
            return UnifiedResponseHandler.validationError(
              "Invalid verification code",
              { attemptsRemaining: 3 - storedVerification.attempts }
            );
          }

          // Mark contact as verified
          storedContact.verified = true;
          storedContact.verifiedAt = new Date().toISOString();

          // Clean up verification code
          verificationCodes.delete(verifyKey);

          return UnifiedResponseHandler.success(
            {
              message: "Emergency contact verified successfully",
              contact: {
                id: storedContact.id,
                name: storedContact.name,
                relationship: storedContact.relationship,
                phoneNumber: storedContact.phoneNumber,
                email: storedContact.email,
                verified: true,
                verifiedAt: storedContact.verifiedAt,
              },
            },
            200
          );

        case "get_contacts":
          // Get all verified emergency contacts for user
          const userContacts = Array.from(
            mockEmergencyContacts.values()
          ).filter((contact) => contact.userId === userId && contact.verified);

          return UnifiedResponseHandler.success(
            {
              contacts: userContacts.map((contact) => ({
                id: contact.id,
                name: contact.name,
                relationship: contact.relationship,
                phoneNumber: contact.phoneNumber,
                email: contact.email,
                verified: contact.verified,
                verifiedAt: contact.verifiedAt,
              })),
            },
            200
          );

        case "resend_code":
          if (!contactData?.phoneNumber) {
            return UnifiedResponseHandler.validationError(
              "Phone number is required"
            );
          }

          const resendKey = `${userId}_${contactData.phoneNumber}`;
          const existingContact = mockEmergencyContacts.get(resendKey);
          const existingVerification = verificationCodes.get(resendKey);

          if (!existingContact || existingContact.verified) {
            return UnifiedResponseHandler.validationError(
              "No unverified contact found for this phone number"
            );
          }

          // Generate new code
          const newCode = generateVerificationCode();
          verificationCodes.set(resendKey, {
            code: newCode,
            attempts: 0,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            contactId: existingContact.id,
          });

          // Send new verification SMS
          await sendVerificationSMS(
            contactData.phoneNumber,
            newCode,
            existingContact.name
          );

          return UnifiedResponseHandler.success(
            {
              message: `New verification code sent to ${contactData.phoneNumber}`,
              expiresAt: verificationCodes.get(resendKey).expiresAt,
            },
            200
          );

        default:
          return UnifiedResponseHandler.validationError(
            "Invalid action. Supported actions: add_contact, verify_contact, get_contacts, resend_code"
          );
      }
    } catch (error) {
      context.error("Emergency contact verification error:", error);
      return UnifiedResponseHandler.error(
        "INTERNAL_ERROR",
        "Internal server error",
        500,
        process.env.NODE_ENV === "development" ? error.message : undefined
      );
    }
  },
});
