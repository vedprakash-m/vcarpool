const { app } = require("@azure/functions");

/**
 * Assignment Confirmations Management
 * Handles assignment confirmation workflows, tracking, and notifications
 */

// Mock data - replace with actual database queries
const mockAssignments = [
  {
    id: "assign_001",
    familyId: "fam_001",
    tripId: "trip_001",
    date: "2025-01-15",
    type: "pickup",
    status: "pending", // pending, confirmed, declined, no_response
    assignedAt: "2025-01-14T10:00:00Z",
    respondedAt: null,
    confirmationNotes: "",
    children: ["Emma Smith", "Liam Smith"],
    location: "Tesla STEM High School",
    time: "3:30 PM",
  },
  {
    id: "assign_002",
    familyId: "fam_002",
    tripId: "trip_002",
    date: "2025-01-16",
    type: "dropoff",
    status: "confirmed",
    assignedAt: "2025-01-14T11:00:00Z",
    respondedAt: "2025-01-14T11:30:00Z",
    confirmationNotes: "Will be there on time!",
    children: ["Sarah Johnson"],
    location: "Washington Middle School",
    time: "8:00 AM",
  },
];

const mockFamilies = [
  { id: "fam_001", name: "Smith Family", primaryEmail: "john.smith@email.com" },
  {
    id: "fam_002",
    name: "Johnson Family",
    primaryEmail: "mike.johnson@email.com",
  },
];

/**
 * Get assignment confirmations for admin dashboard
 */
async function getAssignmentConfirmations(request, context) {
  context.log("Getting assignment confirmations");

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status"); // filter by status
    const familyId = url.searchParams.get("familyId"); // filter by family
    const date = url.searchParams.get("date"); // filter by date

    let assignments = [...mockAssignments];

    // Apply filters
    if (status) {
      assignments = assignments.filter((a) => a.status === status);
    }
    if (familyId) {
      assignments = assignments.filter((a) => a.familyId === familyId);
    }
    if (date) {
      assignments = assignments.filter((a) => a.date === date);
    }

    // Enrich with family information
    const enrichedAssignments = assignments.map((assignment) => {
      const family = mockFamilies.find((f) => f.id === assignment.familyId);
      return {
        ...assignment,
        familyName: family?.name || "Unknown Family",
        familyEmail: family?.primaryEmail || "",
      };
    });

    // Calculate summary statistics
    const summary = {
      total: assignments.length,
      pending: assignments.filter((a) => a.status === "pending").length,
      confirmed: assignments.filter((a) => a.status === "confirmed").length,
      declined: assignments.filter((a) => a.status === "declined").length,
      no_response: assignments.filter((a) => a.status === "no_response").length,
      response_rate:
        assignments.length > 0
          ? (
              ((assignments.length -
                assignments.filter(
                  (a) => a.status === "pending" || a.status === "no_response"
                ).length) /
                assignments.length) *
              100
            ).toFixed(1)
          : 0,
    };

    return {
      jsonBody: {
        success: true,
        data: {
          assignments: enrichedAssignments,
          summary,
        },
      },
      status: 200,
    };
  } catch (error) {
    context.log.error("Error getting assignment confirmations:", error);
    return {
      jsonBody: {
        success: false,
        error: "Failed to retrieve assignment confirmations",
      },
      status: 500,
    };
  }
}

/**
 * Submit assignment confirmation (from parent)
 */
async function submitAssignmentConfirmation(request, context) {
  context.log("Submitting assignment confirmation");

  try {
    const requestBody = await request.json();
    const { assignmentId, status, notes, parentId } = requestBody;

    // Validate required fields
    if (!assignmentId || !status) {
      return {
        jsonBody: {
          success: false,
          error: "Assignment ID and status are required",
        },
        status: 400,
      };
    }

    // Validate status values
    const validStatuses = ["confirmed", "declined"];
    if (!validStatuses.includes(status)) {
      return {
        jsonBody: {
          success: false,
          error: 'Invalid status. Must be "confirmed" or "declined"',
        },
        status: 400,
      };
    }

    // Find the assignment
    const assignmentIndex = mockAssignments.findIndex(
      (a) => a.id === assignmentId
    );
    if (assignmentIndex === -1) {
      return {
        jsonBody: {
          success: false,
          error: "Assignment not found",
        },
        status: 404,
      };
    }

    // Update the assignment
    mockAssignments[assignmentIndex] = {
      ...mockAssignments[assignmentIndex],
      status,
      confirmationNotes: notes || "",
      respondedAt: new Date().toISOString(),
    };

    // Log the confirmation for audit
    context.log(`Assignment ${assignmentId} ${status} by parent ${parentId}`);

    // TODO: Send notification to admin
    // TODO: Update scheduling algorithm if declined
    // TODO: Trigger backup assignment if needed

    return {
      jsonBody: {
        success: true,
        message: `Assignment ${status} successfully`,
        data: {
          assignmentId,
          status,
          timestamp: new Date().toISOString(),
        },
      },
      status: 200,
    };
  } catch (error) {
    context.log.error("Error submitting assignment confirmation:", error);
    return {
      jsonBody: {
        success: false,
        error: "Failed to submit confirmation",
      },
      status: 500,
    };
  }
}

/**
 * Send assignment confirmation reminders
 */
async function sendConfirmationReminders(request, context) {
  context.log("Sending assignment confirmation reminders");

  try {
    const hoursThreshold = 24; // Send reminders for assignments older than 24 hours
    const cutoffTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    // Find pending assignments older than threshold
    const pendingAssignments = mockAssignments.filter((assignment) => {
      const assignedAt = new Date(assignment.assignedAt);
      return assignment.status === "pending" && assignedAt < cutoffTime;
    });

    const reminders = [];

    for (const assignment of pendingAssignments) {
      const family = mockFamilies.find((f) => f.id === assignment.familyId);
      if (family) {
        // TODO: Actually send email/SMS reminder
        reminders.push({
          assignmentId: assignment.id,
          familyId: assignment.familyId,
          familyEmail: family.primaryEmail,
          tripDate: assignment.date,
          reminderSent: true,
        });

        context.log(
          `Reminder sent to ${family.primaryEmail} for assignment ${assignment.id}`
        );
      }
    }

    return {
      jsonBody: {
        success: true,
        message: `Sent ${reminders.length} assignment confirmation reminders`,
        data: {
          remindersSent: reminders.length,
          reminders: reminders,
        },
      },
      status: 200,
    };
  } catch (error) {
    context.log.error("Error sending confirmation reminders:", error);
    return {
      jsonBody: {
        success: false,
        error: "Failed to send reminders",
      },
      status: 500,
    };
  }
}

/**
 * Get assignment confirmation analytics
 */
async function getConfirmationAnalytics(request, context) {
  context.log("Getting assignment confirmation analytics");

  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days")) || 30;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Filter assignments within date range
    const assignmentsInRange = mockAssignments.filter((assignment) => {
      const assignedAt = new Date(assignment.assignedAt);
      return assignedAt >= startDate && assignedAt <= endDate;
    });

    // Calculate analytics
    const totalAssignments = assignmentsInRange.length;
    const confirmedCount = assignmentsInRange.filter(
      (a) => a.status === "confirmed"
    ).length;
    const declinedCount = assignmentsInRange.filter(
      (a) => a.status === "declined"
    ).length;
    const pendingCount = assignmentsInRange.filter(
      (a) => a.status === "pending"
    ).length;
    const noResponseCount = assignmentsInRange.filter(
      (a) => a.status === "no_response"
    ).length;

    const responseRate =
      totalAssignments > 0
        ? (((confirmedCount + declinedCount) / totalAssignments) * 100).toFixed(
            1
          )
        : 0;

    const confirmationRate =
      totalAssignments > 0
        ? ((confirmedCount / totalAssignments) * 100).toFixed(1)
        : 0;

    // Calculate average response time
    const respondedAssignments = assignmentsInRange.filter(
      (a) => a.respondedAt
    );
    const avgResponseTime =
      respondedAssignments.length > 0
        ? respondedAssignments.reduce((sum, assignment) => {
            const assigned = new Date(assignment.assignedAt);
            const responded = new Date(assignment.respondedAt);
            return sum + (responded.getTime() - assigned.getTime());
          }, 0) /
          respondedAssignments.length /
          (1000 * 60 * 60) // Convert to hours
        : 0;

    // Family response patterns
    const familyStats = {};
    assignmentsInRange.forEach((assignment) => {
      if (!familyStats[assignment.familyId]) {
        familyStats[assignment.familyId] = {
          total: 0,
          confirmed: 0,
          declined: 0,
          pending: 0,
          noResponse: 0,
        };
      }
      familyStats[assignment.familyId].total++;
      familyStats[assignment.familyId][assignment.status.replace("_", "")]++;
    });

    const analytics = {
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
        days,
      },
      summary: {
        totalAssignments,
        confirmedCount,
        declinedCount,
        pendingCount,
        noResponseCount,
        responseRate: parseFloat(responseRate),
        confirmationRate: parseFloat(confirmationRate),
        avgResponseTimeHours: Math.round(avgResponseTime * 10) / 10,
      },
      familyStats: Object.entries(familyStats).map(([familyId, stats]) => {
        const family = mockFamilies.find((f) => f.id === familyId);
        return {
          familyId,
          familyName: family?.name || "Unknown",
          ...stats,
          responseRate:
            stats.total > 0
              ? (
                  ((stats.confirmed + stats.declined) / stats.total) *
                  100
                ).toFixed(1)
              : 0,
        };
      }),
    };

    return {
      jsonBody: {
        success: true,
        data: analytics,
      },
      status: 200,
    };
  } catch (error) {
    context.log.error("Error getting confirmation analytics:", error);
    return {
      jsonBody: {
        success: false,
        error: "Failed to retrieve analytics",
      },
      status: 500,
    };
  }
}

/**
 * Update assignment status (admin override)
 */
async function updateAssignmentStatus(request, context) {
  context.log("Updating assignment status (admin)");

  try {
    const requestBody = await request.json();
    const { assignmentId, status, adminNotes, adminId } = requestBody;

    // Validate required fields
    if (!assignmentId || !status) {
      return {
        jsonBody: {
          success: false,
          error: "Assignment ID and status are required",
        },
        status: 400,
      };
    }

    // Find the assignment
    const assignmentIndex = mockAssignments.findIndex(
      (a) => a.id === assignmentId
    );
    if (assignmentIndex === -1) {
      return {
        jsonBody: {
          success: false,
          error: "Assignment not found",
        },
        status: 404,
      };
    }

    // Update the assignment
    mockAssignments[assignmentIndex] = {
      ...mockAssignments[assignmentIndex],
      status,
      adminNotes: adminNotes || "",
      adminOverride: true,
      adminId,
      updatedAt: new Date().toISOString(),
    };

    context.log(
      `Assignment ${assignmentId} updated to ${status} by admin ${adminId}`
    );

    return {
      jsonBody: {
        success: true,
        message: "Assignment status updated successfully",
        data: {
          assignmentId,
          status,
          adminOverride: true,
          timestamp: new Date().toISOString(),
        },
      },
      status: 200,
    };
  } catch (error) {
    context.log.error("Error updating assignment status:", error);
    return {
      jsonBody: {
        success: false,
        error: "Failed to update assignment status",
      },
      status: 500,
    };
  }
}

// Register HTTP functions
app.http("getAssignmentConfirmations", {
  methods: ["GET"],
  authLevel: "function",
  route: "admin/assignment-confirmations",
  handler: getAssignmentConfirmations,
});

app.http("submitAssignmentConfirmation", {
  methods: ["POST"],
  authLevel: "function",
  route: "assignments/{assignmentId}/confirm",
  handler: submitAssignmentConfirmation,
});

app.http("sendConfirmationReminders", {
  methods: ["POST"],
  authLevel: "function",
  route: "admin/assignment-confirmations/reminders",
  handler: sendConfirmationReminders,
});

app.http("getConfirmationAnalytics", {
  methods: ["GET"],
  authLevel: "function",
  route: "admin/assignment-confirmations/analytics",
  handler: getConfirmationAnalytics,
});

app.http("updateAssignmentStatus", {
  methods: ["PUT"],
  authLevel: "function",
  route: "admin/assignments/{assignmentId}/status",
  handler: updateAssignmentStatus,
});

module.exports = {
  getAssignmentConfirmations,
  submitAssignmentConfirmation,
  sendConfirmationReminders,
  getConfirmationAnalytics,
  updateAssignmentStatus,
};
