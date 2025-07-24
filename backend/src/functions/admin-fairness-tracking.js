const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.adminFairnessTracking = functions.https.onCall(
  async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const { action, groupId, weekData, familyId } = data;

    try {
      // Verify user is group admin for the group
      const groupRef = db.collection("carpool_groups").doc(groupId);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Carpool group not found"
        );
      }

      const groupData = groupDoc.data();
      if (groupData.trip_admin_id !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only group admin can access fairness tracking"
        );
      }

      switch (action) {
        case "get_fairness_dashboard":
          return await getFairnessDashboard(groupId);

        case "update_weekly_assignments":
          return await updateWeeklyAssignments(groupId, weekData);

        case "get_family_history":
          return await getFamilyHistory(groupId, familyId);

        case "manual_adjustment":
          return await manualFairnessAdjustment(groupId, data.adjustment);

        case "reset_school_year":
          return await resetSchoolYearTracking(groupId);

        default:
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Invalid action specified"
          );
      }
    } catch (error) {
      console.error("Fairness tracking error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to process fairness tracking request"
      );
    }
  }
);

async function getFairnessDashboard(groupId) {
  // Get all family fairness records
  const fairnessSnapshot = await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("fairness_tracking")
    .get();

  const familyStats = fairnessSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      familyId: doc.id,
      ...data,
      // Calculate current equity score
      equityScore: calculateEquityScore(data),
    };
  });

  // Calculate overall group equity metrics
  const totalTrips = familyStats.reduce(
    (sum, family) => sum + family.totalTrips,
    0
  );
  const totalChildren = familyStats.reduce(
    (sum, family) => sum + (family.childrenCount || 1),
    0
  );
  const averageTripsPerChild =
    totalChildren > 0 ? totalTrips / totalChildren : 0;

  // Calculate debt spread (measure of fairness)
  const debts = familyStats.map((family) => family.fairnessDebt || 0);
  const maxDebt = Math.max(...debts);
  const minDebt = Math.min(...debts);
  const debtRange = maxDebt - minDebt;

  // Overall equity score (0-100, higher is more fair)
  const overallEquityScore = Math.max(0, 100 - debtRange * 10);

  return {
    families: familyStats,
    groupStats: {
      totalTrips,
      totalChildren,
      averageTripsPerChild: Math.round(averageTripsPerChild * 10) / 10,
      equityScore: Math.round(overallEquityScore),
      debtRange: Math.round(debtRange * 10) / 10,
      recommendations: generateEquityRecommendations(familyStats, debtRange),
    },
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function updateWeeklyAssignments(groupId, weekData) {
  const { weekStartDate, assignments } = weekData;
  const batch = db.batch();

  // Group assignments by family
  const familyAssignments = {};
  assignments.forEach((assignment) => {
    if (assignment.morningTrip && assignment.morningTrip.driverId) {
      const familyId = assignment.morningTrip.driverId.split("-spouse")[0];
      familyAssignments[familyId] = (familyAssignments[familyId] || 0) + 1;
    }
  });

  // Update fairness tracking for each family
  for (const [familyId, assignedTrips] of Object.entries(familyAssignments)) {
    const fairnessRef = db
      .collection("carpool_groups")
      .doc(groupId)
      .collection("fairness_tracking")
      .doc(familyId);

    const fairnessDoc = await fairnessRef.get();

    if (fairnessDoc.exists) {
      const currentData = fairnessDoc.data();
      const childrenCount = currentData.childrenCount || 1;
      const totalChildren = await getTotalChildrenInGroup(groupId);
      const weeklyFairShare =
        (assignments.length / totalChildren) * childrenCount;

      // Calculate debt adjustment
      const debtAdjustment = assignedTrips - weeklyFairShare;

      batch.update(fairnessRef, {
        totalTrips: admin.firestore.FieldValue.increment(assignedTrips),
        totalWeeks: admin.firestore.FieldValue.increment(1),
        fairnessDebt: admin.firestore.FieldValue.increment(debtAdjustment),
        weeklyHistory: admin.firestore.FieldValue.arrayUnion({
          weekStartDate,
          assignedTrips,
          fairShare: weeklyFairShare,
          debtChange: debtAdjustment,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        }),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Create new fairness tracking record
      batch.set(fairnessRef, {
        familyId,
        totalTrips: assignedTrips,
        totalWeeks: 1,
        childrenCount: 1, // Default, should be updated based on actual family data
        fairnessDebt:
          assignedTrips -
          assignments.length / (await getTotalChildrenInGroup(groupId)),
        weeklyHistory: [
          {
            weekStartDate,
            assignedTrips,
            fairShare:
              assignments.length / (await getTotalChildrenInGroup(groupId)),
            debtChange:
              assignedTrips -
              assignments.length / (await getTotalChildrenInGroup(groupId)),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  await batch.commit();
  return {
    success: true,
    message: "Weekly assignments updated in fairness tracking",
  };
}

async function getFamilyHistory(groupId, familyId) {
  const fairnessDoc = await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("fairness_tracking")
    .doc(familyId)
    .get();

  if (!fairnessDoc.exists) {
    return {
      familyId,
      totalTrips: 0,
      totalWeeks: 0,
      fairnessDebt: 0,
      weeklyHistory: [],
    };
  }

  const data = fairnessDoc.data();

  // Calculate trends and insights
  const weeklyHistory = data.weeklyHistory || [];
  const recentWeeks = weeklyHistory.slice(-8); // Last 8 weeks
  const trendDirection = calculateTrendDirection(recentWeeks);

  return {
    ...data,
    trends: {
      direction: trendDirection,
      recentAverageTrips:
        recentWeeks.reduce((sum, week) => sum + week.assignedTrips, 0) /
        recentWeeks.length,
      equityImproving: trendDirection === "improving",
    },
  };
}

async function manualFairnessAdjustment(groupId, adjustment) {
  const { familyId, adjustmentAmount, reason } = adjustment;

  const fairnessRef = db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("fairness_tracking")
    .doc(familyId);

  await fairnessRef.update({
    fairnessDebt: admin.firestore.FieldValue.increment(adjustmentAmount),
    manualAdjustments: admin.firestore.FieldValue.arrayUnion({
      amount: adjustmentAmount,
      reason,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      adminUserId: context.auth.uid,
    }),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: "Manual fairness adjustment applied" };
}

async function resetSchoolYearTracking(groupId) {
  const fairnessSnapshot = await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("fairness_tracking")
    .get();

  const batch = db.batch();

  fairnessSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      totalTrips: 0,
      totalWeeks: 0,
      fairnessDebt: 0,
      weeklyHistory: [],
      manualAdjustments: [],
      schoolYearStarted: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return {
    success: true,
    message: "School year fairness tracking reset successfully",
  };
}

// Helper functions
function calculateEquityScore(familyData) {
  const {
    totalTrips,
    totalWeeks,
    fairnessDebt,
    childrenCount = 1,
  } = familyData;

  if (totalWeeks === 0) return 100; // New families start with perfect score

  const averageTripsPerWeek = totalTrips / totalWeeks;
  const expectedTripsPerWeek = 1; // Simplified: assume 1 trip per week per child
  const equityRatio =
    averageTripsPerWeek / (expectedTripsPerWeek * childrenCount);

  // Convert to 0-100 score (1.0 ratio = 100 score)
  const baseScore = Math.min(100, equityRatio * 100);

  // Adjust for debt (debt reduces score)
  const debtPenalty = Math.abs(fairnessDebt || 0) * 5;

  return Math.max(0, Math.round(baseScore - debtPenalty));
}

async function getTotalChildrenInGroup(groupId) {
  // Get all approved group members
  const membersSnapshot = await db
    .collection("group_memberships")
    .where("group_id", "==", groupId)
    .where("status", "==", "approved")
    .get();

  // Count children (simplified: assume 1 child per membership)
  return membersSnapshot.docs.length;
}

function calculateTrendDirection(weeklyHistory) {
  if (weeklyHistory.length < 3) return "insufficient_data";

  const recent3 = weeklyHistory.slice(-3);
  const older3 = weeklyHistory.slice(-6, -3);

  if (older3.length === 0) return "insufficient_data";

  const recentAvgDebt =
    recent3.reduce((sum, week) => sum + (week.debtChange || 0), 0) /
    recent3.length;
  const olderAvgDebt =
    older3.reduce((sum, week) => sum + (week.debtChange || 0), 0) /
    older3.length;

  const difference = recentAvgDebt - olderAvgDebt;

  if (Math.abs(difference) < 0.1) return "stable";
  return difference < 0 ? "improving" : "worsening";
}

function generateEquityRecommendations(familyStats, debtRange) {
  const recommendations = [];

  if (debtRange > 2.0) {
    recommendations.push(
      "High disparity detected. Consider manual adjustments for families with high debt."
    );
  }

  const highDebtFamilies = familyStats.filter(
    (family) => (family.fairnessDebt || 0) > 1.5
  );
  if (highDebtFamilies.length > 0) {
    recommendations.push(
      `Prioritize ${highDebtFamilies
        .map((f) => f.familyId)
        .join(", ")} for upcoming driving assignments.`
    );
  }

  const lowDebtFamilies = familyStats.filter(
    (family) => (family.fairnessDebt || 0) < -1.5
  );
  if (lowDebtFamilies.length > 0) {
    recommendations.push(
      `Consider reducing assignments for ${lowDebtFamilies
        .map((f) => f.familyId)
        .join(", ")} in upcoming weeks.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Fairness distribution is well-balanced. Continue with current scheduling approach."
    );
  }

  return recommendations;
}
