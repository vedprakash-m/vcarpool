const { app } = require("@azure/functions");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Mock data for traveling parent schedules and makeup options
const travelingParentSchedules = new Map();
const makeupOptions = new Map();
const groupMemberships = new Map();

// Initialize some mock data
const initializeMockData = () => {
  // Mock group memberships
  groupMemberships.set("user_001", {
    userId: "user_001",
    groupId: "tesla_stem_morning",
    role: "driver",
    drivingWeeks: ["2024-01-08", "2024-01-22", "2024-02-05"],
    makeupBalance: -2, // Owes 2 trips
    travelSchedule: {
      hasUpcomingTravel: true,
      travelPeriods: [
        {
          startDate: "2024-01-15",
          endDate: "2024-01-19",
          reason: "Business trip",
          affectedTrips: 4,
        },
      ],
    },
  });

  // Mock makeup options for the user
  makeupOptions.set("user_001", [
    {
      id: "makeup_001",
      userId: "user_001",
      groupId: "tesla_stem_morning",
      proposedDate: "2024-01-29",
      proposedTime: "07:30",
      makeupType: "extra_week",
      tripsToMakeup: 4,
      status: "proposed",
      createdAt: "2024-01-10T10:00:00Z",
    },
    {
      id: "makeup_002",
      userId: "user_001",
      groupId: "tesla_stem_morning",
      proposedDate: "2024-02-12",
      proposedTime: "07:30",
      makeupType: "split_weeks",
      tripsToMakeup: 2,
      status: "available",
      createdAt: "2024-01-10T10:05:00Z",
    },
  ]);
};

// Helper function to calculate makeup balance
function calculateMakeupBalance(userId, groupId) {
  const membership = groupMemberships.get(userId);
  if (!membership || membership.groupId !== groupId) {
    return 0;
  }

  return membership.makeupBalance || 0;
}

// Helper function to get available makeup dates
function getAvailableMakeupDates(groupId, weeksAhead = 6) {
  const availableDates = [];
  const today = new Date();

  for (let i = 1; i <= weeksAhead; i++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + i * 7);

    // Find Monday of that week
    const monday = new Date(weekStart);
    monday.setDate(weekStart.getDate() - weekStart.getDay() + 1);

    // Generate weekdays (Monday-Friday)
    for (let day = 0; day < 5; day++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + day);

      availableDates.push({
        date: date.toISOString().split("T")[0],
        dayOfWeek: date.toLocaleDateString("en-US", { weekday: "long" }),
        available: true, // In production, check against existing schedules
        conflictReason: null,
      });
    }
  }

  return availableDates;
}

// Helper function to validate makeup proposal
function validateMakeupProposal(proposal) {
  const errors = [];

  if (!proposal.proposedDate) {
    errors.push("Proposed date is required");
  } else {
    const proposedDate = new Date(proposal.proposedDate);
    const today = new Date();
    const sixWeeksFromNow = new Date(
      today.getTime() + 6 * 7 * 24 * 60 * 60 * 1000
    );

    if (proposedDate <= today) {
      errors.push("Proposed date must be in the future");
    }

    if (proposedDate > sixWeeksFromNow) {
      errors.push("Proposed date must be within 6 weeks");
    }
  }

  if (!proposal.proposedTime) {
    errors.push("Proposed time is required");
  }

  if (
    !proposal.makeupType ||
    !["extra_week", "split_weeks", "weekend_trip"].includes(proposal.makeupType)
  ) {
    errors.push(
      "Valid makeup type is required (extra_week, split_weeks, weekend_trip)"
    );
  }

  if (
    !proposal.tripsToMakeup ||
    proposal.tripsToMakeup < 1 ||
    proposal.tripsToMakeup > 5
  ) {
    errors.push("Trips to makeup must be between 1 and 5");
  }

  return errors;
}

// Initialize mock data
initializeMockData();

app.http("traveling-parent-makeup", {
  methods: ["GET", "POST", "PUT"],
  authLevel: "anonymous",
  route: "traveling-parent/makeup",
  handler: async (request, context) => {
    try {
      // Handle OPTIONS preflight request
      if (request.method === "OPTIONS") {
        return UnifiedResponseHandler.preflight();
      }

      const url = new URL(request.url);
      const action = url.searchParams.get("action");
      const userId = url.searchParams.get("userId");
      const groupId = url.searchParams.get("groupId");

      // Mock authentication - in production, validate JWT token
      if (!userId) {
        return UnifiedResponseHandler.authError("Authentication required");
      }

      switch (request.method) {
        case "GET": {
          if (action === "get_dashboard") {
            // Get traveling parent dashboard data
            const membership = groupMemberships.get(userId);
            const userMakeupOptions = makeupOptions.get(userId) || [];

            if (!membership) {
              return UnifiedResponseHandler.notFoundError(
                "User is not a member of any carpool group"
              );
            }

            const dashboard = {
              user: {
                id: userId,
                role: membership.role,
                makeupBalance: membership.makeupBalance,
              },
              group: {
                id: membership.groupId,
                name: "Tesla Stem Morning Carpool", // In production, fetch from group data
              },
              travelSchedule: membership.travelSchedule,
              makeupOptions: userMakeupOptions,
              availableDates: getAvailableMakeupDates(membership.groupId),
              statistics: {
                totalTripsOwed: Math.abs(membership.makeupBalance || 0),
                upcomingMakeups: userMakeupOptions.filter(
                  (option) =>
                    option.status === "confirmed" &&
                    new Date(option.proposedDate) > new Date()
                ).length,
                completedMakeups: userMakeupOptions.filter(
                  (option) => option.status === "completed"
                ).length,
              },
            };

            return UnifiedResponseHandler.success({ dashboard }, 200);
          }

          if (action === "get_makeup_options") {
            const userMakeupOptions = makeupOptions.get(userId) || [];
            const availableDates = getAvailableMakeupDates(groupId);

            return UnifiedResponseHandler.success(
              {
                makeupOptions: userMakeupOptions,
                availableDates,
                makeupBalance: calculateMakeupBalance(userId, groupId),
              },
              200
            );
          }

          return UnifiedResponseHandler.validationError(
            "Invalid GET action. Supported: get_dashboard, get_makeup_options"
          );
        }

        case "POST": {
          const body = await request.json();
          const { makeupProposal } = body;

          if (!makeupProposal) {
            return UnifiedResponseHandler.validationError(
              "Makeup proposal data is required"
            );
          }

          // Validate proposal
          const validationErrors = validateMakeupProposal(makeupProposal);
          if (validationErrors.length > 0) {
            return UnifiedResponseHandler.validationError(
              "Validation failed",
              validationErrors
            );
          }

          // Create new makeup option
          const makeupId = `makeup_${Date.now()}`;
          const newMakeup = {
            id: makeupId,
            userId,
            groupId: makeupProposal.groupId,
            proposedDate: makeupProposal.proposedDate,
            proposedTime: makeupProposal.proposedTime,
            makeupType: makeupProposal.makeupType,
            tripsToMakeup: makeupProposal.tripsToMakeup,
            notes: makeupProposal.notes || "",
            status: "proposed",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Add to user's makeup options
          const existingOptions = makeupOptions.get(userId) || [];
          makeupOptions.set(userId, [...existingOptions, newMakeup]);

          return UnifiedResponseHandler.success(
            {
              message: "Makeup proposal created successfully",
              makeupOption: newMakeup,
            },
            201
          );
        }

        case "PUT": {
          const updateBody = await request.json();
          const { makeupId, status, adminNotes } = updateBody;

          if (!makeupId || !status) {
            return UnifiedResponseHandler.validationError(
              "Makeup ID and status are required"
            );
          }

          // Find and update makeup option
          const userOptions = makeupOptions.get(userId) || [];
          const makeupIndex = userOptions.findIndex(
            (option) => option.id === makeupId
          );

          if (makeupIndex === -1) {
            return UnifiedResponseHandler.notFoundError(
              "Makeup option not found"
            );
          }

          // Update the makeup option
          userOptions[makeupIndex] = {
            ...userOptions[makeupIndex],
            status,
            adminNotes: adminNotes || userOptions[makeupIndex].adminNotes,
            updatedAt: new Date().toISOString(),
          };

          // If confirmed, update makeup balance
          if (status === "completed") {
            const membership = groupMemberships.get(userId);
            if (membership) {
              membership.makeupBalance =
                (membership.makeupBalance || 0) +
                userOptions[makeupIndex].tripsToMakeup;
            }
          }

          makeupOptions.set(userId, userOptions);

          return UnifiedResponseHandler.success(
            {
              message: "Makeup option updated successfully",
              makeupOption: userOptions[makeupIndex],
            },
            200
          );
        }

        default:
          return UnifiedResponseHandler.methodNotAllowedError(
            "Method not allowed"
          );
      }
    } catch (error) {
      context.error("Traveling parent makeup error:", error);
      return UnifiedResponseHandler.error(
        "INTERNAL_ERROR",
        "Internal server error",
        500,
        process.env.NODE_ENV === "development" ? error.message : undefined
      );
    }
  },
});
