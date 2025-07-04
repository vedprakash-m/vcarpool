const { CosmosClient } = require("@azure/cosmos");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Email notification templates
const EMAIL_TEMPLATES = {
  swap_request_created: {
    subject: "New Carpool Swap Request from {requestingDriverName}",
    template: `
Dear {receivingDriverName},

{requestingDriverName} has requested to swap a carpool assignment with you.

Assignment Details:
• Date: {assignmentDate}
• Time: {assignmentTime}
• Route: {assignmentDescription}

Request Message:
"{requestMessage}"

Please log into the Carpool app to accept or decline this request.

You can contact {requestingDriverName} directly:
• Email: {requestingDriverEmail}
• Phone: {requestingDriverPhone}

Best regards,
Carpool System
    `,
  },
  swap_request_accepted: {
    subject: "Swap Request Accepted by {receivingDriverName}",
    template: `
Dear {requestingDriverName},

Great news! {receivingDriverName} has accepted your swap request.

Assignment Details:
• Date: {assignmentDate}
• Time: {assignmentTime}
• Route: {assignmentDescription}

Response Message:
"{responseMessage}"

Your assignment swap is now confirmed. Please coordinate with {receivingDriverName} for any additional details.

Contact Information:
• Email: {receivingDriverEmail}
• Phone: {receivingDriverPhone}

Best regards,
Carpool System
    `,
  },
  swap_request_declined: {
    subject: "Swap Request Declined by {receivingDriverName}",
    template: `
Dear {requestingDriverName},

{receivingDriverName} has declined your swap request for the following assignment:

Assignment Details:
• Date: {assignmentDate}
• Time: {assignmentTime}
• Route: {assignmentDescription}

Response Message:
"{responseMessage}"

You may want to reach out to other parents or contact the school administration for assistance with this assignment.

Best regards,
Carpool System
    `,
  },
  assignment_reminder_24h: {
    subject: "Carpool Assignment Reminder - Tomorrow {assignmentDate}",
    template: `
Dear {driverName},

This is a reminder that you have a carpool assignment tomorrow.

Assignment Details:
• Date: {assignmentDate}
• Time: {assignmentTime}
• Route: {assignmentDescription}
• Passengers: {passengerCount} students

Passenger Details:
{passengerList}

Route Information:
• Pickup: {pickupLocation}
• Drop-off: {dropoffLocation}

Please ensure you're prepared for your carpool assignment. If you need to make any last-minute changes, please contact the other parents or school administration immediately.

Need help? Log into the Carpool app or contact the school office.

Safe driving!
Carpool System
    `,
  },
  assignment_reminder_2h: {
    subject: "Carpool Assignment Starting Soon - {assignmentTime} Today",
    template: `
Dear {driverName},

Your carpool assignment starts in approximately 2 hours.

Assignment Details:
• Time: {assignmentTime}
• Route: {assignmentDescription}
• Passengers: {passengerCount} students

Quick Passenger List:
{passengerList}

Route: {pickupLocation} → {dropoffLocation}

If you're running late or have any issues, please contact the parents directly through the Carpool app.

Drive safely!
Carpool System
    `,
  },
};

module.exports = async function (context, req) {
  context.log("Notifications API called");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  try {
    const method = req.method;

    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res = UnifiedResponseHandler.authError(
        "Missing or invalid authorization token"
      );
      return;
    }

    switch (method) {
      case "POST":
        return await sendNotification(req, context);
      default:
        context.res = UnifiedResponseHandler.methodNotAllowedError(
          `Method ${method} not allowed`
        );
        return;
    }
  } catch (error) {
    context.log.error("Notifications error:", error);
    context.res = UnifiedResponseHandler.internalError("Internal server error");
  }
};

// Send notification
async function sendNotification(req, context) {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Validate required fields
    const requiredFields = ["type", "recipientEmail", "data"];
    for (const field of requiredFields) {
      if (!body[field]) {
        context.res = UnifiedResponseHandler.validationError(
          `Missing required field: ${field}`
        );
        return;
      }
    }

    const { type, recipientEmail, data } = body;

    // Validate notification type
    if (!EMAIL_TEMPLATES[type]) {
      context.res = UnifiedResponseHandler.validationError(
        `Invalid notification type: ${type}`,
        { supportedTypes: Object.keys(EMAIL_TEMPLATES) }
      );
      return;
    }

    // Get email template
    const template = EMAIL_TEMPLATES[type];

    // Process template with data
    const processedSubject = processTemplate(template.subject, data);
    const processedBody = processTemplate(template.template, data);

    // In a real implementation, this would use SendGrid, AWS SES, or similar
    // For now, we'll simulate email sending
    const emailResult = await simulateEmailSend({
      to: recipientEmail,
      subject: processedSubject,
      body: processedBody,
      type,
    });

    context.log(`Notification sent: ${type} to ${recipientEmail}`);

    context.res = UnifiedResponseHandler.success(
      {
        notificationId: emailResult.id,
        type,
        recipient: recipientEmail,
        subject: processedSubject,
        sentAt: new Date().toISOString(),
        status: "sent",
      },
      "Notification sent successfully"
    );
    return;
  } catch (error) {
    context.log.error("Send notification error:", error);
    throw error;
  }
}

// Process template with data substitution
function processTemplate(template, data) {
  let processed = template;

  // Replace all placeholders with data
  Object.keys(data).forEach((key) => {
    const placeholder = `{${key}}`;
    const value = data[key] || "";
    processed = processed.replace(
      new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
      value
    );
  });

  return processed;
}

// Simulate email sending (replace with actual email service)
async function simulateEmailSend({ to, subject, body, type }) {
  // In production, integrate with:
  // - SendGrid: await sgMail.send({ to, subject, text: body })
  // - AWS SES: await ses.sendEmail(params).promise()
  // - Azure Communication Services: await emailClient.send(message)

  return {
    id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    to,
    subject,
    type,
    status: "sent",
    sentAt: new Date().toISOString(),
    provider: "mock-email-service",
  };
}

// Helper function to format passenger list
function formatPassengerList(passengers) {
  if (!passengers || passengers.length === 0) {
    return "No passengers assigned";
  }

  return passengers
    .map((passenger, index) => {
      return `${index + 1}. ${passenger.name}${
        passenger.phoneNumber ? ` (${passenger.phoneNumber})` : ""
      }`;
    })
    .join("\n");
}

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Helper function to format time
function formatTime(timeString) {
  // Assumes time is in HH:MM format
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}
