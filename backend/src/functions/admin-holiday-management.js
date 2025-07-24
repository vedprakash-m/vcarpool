const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.adminHolidayManagement = functions.https.onCall(
  async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      );
    }

    const {
      action,
      groupId,
      holidayData,
      familyVacationData,
      vacationId,
      holidayId,
    } = data;

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
          "Only group admin can manage holidays"
        );
      }

      switch (action) {
        case "add_school_holiday":
          return await addSchoolHoliday(groupId, holidayData);

        case "update_school_holiday":
          return await updateSchoolHoliday(groupId, holidayId, holidayData);

        case "delete_school_holiday":
          return await deleteSchoolHoliday(groupId, holidayId);

        case "add_family_vacation":
          return await addFamilyVacation(
            groupId,
            familyVacationData,
            context.auth.uid
          );

        case "update_family_vacation":
          return await updateFamilyVacation(
            groupId,
            vacationId,
            familyVacationData
          );

        case "delete_family_vacation":
          return await deleteFamilyVacation(groupId, vacationId);

        case "get_calendar":
          return await getHolidayCalendar(groupId);

        case "arrange_coverage":
          return await arrangeCoverage(groupId, vacationId);

        default:
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Invalid action specified"
          );
      }
    } catch (error) {
      console.error("Holiday management error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to process holiday management request"
      );
    }
  }
);

async function addSchoolHoliday(groupId, holidayData) {
  const holiday = {
    id: admin.firestore().collection("temp").doc().id,
    name: holidayData.name,
    type: holidayData.type, // 'school_holiday', 'teacher_workday', 'semester_break', 'weather_closure'
    start_date: holidayData.startDate,
    end_date: holidayData.endDate,
    description: holidayData.description || "",
    auto_adjust_scheduling: holidayData.autoAdjustScheduling || true,
    created_by: holidayData.createdBy,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    affects_all_families: true,
    notification_sent: false,
  };

  // Add to group's school holidays
  await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("school_holidays")
    .doc(holiday.id)
    .set(holiday);

  // Cancel existing trips for these dates
  if (holiday.auto_adjust_scheduling) {
    await cancelTripsForDates(groupId, holiday.start_date, holiday.end_date);
  }

  // Send notifications to all families
  await notifyFamiliesOfHoliday(groupId, holiday);

  return {
    success: true,
    holidayId: holiday.id,
    message: "School holiday added successfully",
  };
}

async function updateSchoolHoliday(groupId, holidayId, holidayData) {
  const holidayRef = db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("school_holidays")
    .doc(holidayId);

  await holidayRef.update({
    ...holidayData,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: "School holiday updated successfully" };
}

async function deleteSchoolHoliday(groupId, holidayId) {
  await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("school_holidays")
    .doc(holidayId)
    .delete();
  return { success: true, message: "School holiday deleted successfully" };
}

async function addFamilyVacation(groupId, vacationData, adminUserId) {
  const vacation = {
    id: admin.firestore().collection("temp").doc().id,
    family_id: vacationData.familyId,
    name: vacationData.name,
    type: vacationData.type, // 'family_vacation', 'parent_travel', 'child_absence'
    start_date: vacationData.startDate,
    end_date: vacationData.endDate,
    affected_members: vacationData.affectedMembers, // array of user IDs
    description: vacationData.description || "",
    coverage_needed: vacationData.coverageNeeded || true,
    coverage_arranged: false,
    backup_drivers: [],
    created_by: adminUserId,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    notification_sent: false,
  };

  // Add to group's family vacations
  await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("family_vacations")
    .doc(vacation.id)
    .set(vacation);

  // Automatically arrange coverage if needed
  if (vacation.coverage_needed) {
    await arrangeCoverage(groupId, vacation.id);
  }

  // Adjust fair share calculations for affected dates
  await adjustFairShareForVacation(groupId, vacation);

  return {
    success: true,
    vacationId: vacation.id,
    message: "Family vacation added successfully",
  };
}

async function updateFamilyVacation(groupId, vacationId, vacationData) {
  const vacationRef = db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("family_vacations")
    .doc(vacationId);

  await vacationRef.update({
    ...vacationData,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: "Family vacation updated successfully" };
}

async function deleteFamilyVacation(groupId, vacationId) {
  await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("family_vacations")
    .doc(vacationId)
    .delete();
  return { success: true, message: "Family vacation deleted successfully" };
}

async function getHolidayCalendar(groupId) {
  // Get school holidays
  const schoolHolidaysSnapshot = await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("school_holidays")
    .get();
  const schoolHolidays = schoolHolidaysSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Get family vacations
  const familyVacationsSnapshot = await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("family_vacations")
    .get();
  const familyVacations = familyVacationsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    school_holidays: schoolHolidays,
    family_vacations: familyVacations,
  };
}

async function arrangeCoverage(groupId, vacationId) {
  // Get vacation details
  const vacationDoc = await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("family_vacations")
    .doc(vacationId)
    .get();
  if (!vacationDoc.exists)
    return { success: false, message: "Vacation not found" };

  const vacation = vacationDoc.data();

  // Get all group members who can drive
  const groupMembersSnapshot = await db
    .collection("group_memberships")
    .where("group_id", "==", groupId)
    .where("status", "==", "approved")
    .get();

  const availableDrivers = [];
  for (const memberDoc of groupMembersSnapshot.docs) {
    const memberData = memberDoc.data();
    // Skip if this family is on vacation
    if (vacation.affected_members.includes(memberData.user_id)) continue;

    const userDoc = await db.collection("users").doc(memberData.user_id).get();
    const userData = userDoc.data();

    if (userData.can_drive && userData.vehicle_info) {
      availableDrivers.push({
        user_id: memberData.user_id,
        name: userData.name,
        vehicle_capacity: userData.vehicle_info.capacity,
      });
    }
  }

  // Simple coverage assignment (can be enhanced with more sophisticated algorithm)
  const backupDrivers = availableDrivers.slice(0, 2); // Assign top 2 available drivers

  // Update vacation with backup coverage
  await db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("family_vacations")
    .doc(vacationId)
    .update({
      backup_drivers: backupDrivers,
      coverage_arranged: backupDrivers.length > 0,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Send notifications to backup drivers
  for (const driver of backupDrivers) {
    await sendNotification(driver.user_id, {
      type: "coverage_request",
      title: "Backup Driving Request",
      message: `You've been selected to provide backup coverage for ${vacation.name}`,
      group_id: groupId,
      vacation_id: vacationId,
    });
  }

  return {
    success: true,
    message: "Coverage arranged successfully",
    backup_drivers: backupDrivers,
  };
}

async function cancelTripsForDates(groupId, startDate, endDate) {
  // Get all trips in the date range
  const tripsSnapshot = await db
    .collection("trips")
    .where("group_id", "==", groupId)
    .where("trip_date", ">=", startDate)
    .where("trip_date", "<=", endDate)
    .where("status", "==", "scheduled")
    .get();

  const batch = db.batch();

  tripsSnapshot.docs.forEach((tripDoc) => {
    batch.update(tripDoc.ref, {
      status: "cancelled_holiday",
      cancelled_at: admin.firestore.FieldValue.serverTimestamp(),
      cancellation_reason: "School holiday",
    });
  });

  await batch.commit();
}

async function adjustFairShareForVacation(groupId, vacation) {
  // Calculate the number of school days affected
  const vacationDays = calculateSchoolDays(
    vacation.start_date,
    vacation.end_date
  );

  // Update fairness tracking to reduce family's obligation
  const fairnessRef = db
    .collection("carpool_groups")
    .doc(groupId)
    .collection("fairness_tracking");

  // Find affected family's fairness record
  const familyFairnessSnapshot = await fairnessRef
    .where("family_id", "==", vacation.family_id)
    .get();

  if (!familyFairnessSnapshot.empty) {
    const familyFairnessDoc = familyFairnessSnapshot.docs[0];
    const currentData = familyFairnessDoc.data();

    await familyFairnessDoc.ref.update({
      vacation_adjustments: admin.firestore.FieldValue.increment(vacationDays),
      adjusted_fair_share: currentData.base_fair_share - vacationDays,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function notifyFamiliesOfHoliday(groupId, holiday) {
  // Get all group members
  const groupMembersSnapshot = await db
    .collection("group_memberships")
    .where("group_id", "==", groupId)
    .where("status", "==", "approved")
    .get();

  const notifications = [];

  for (const memberDoc of groupMembersSnapshot.docs) {
    const memberData = memberDoc.data();
    notifications.push(
      sendNotification(memberData.user_id, {
        type: "school_holiday",
        title: "School Holiday Added",
        message: `${holiday.name}: ${holiday.start_date} to ${holiday.end_date}. No carpools needed during this period.`,
        group_id: groupId,
        holiday_id: holiday.id,
      })
    );
  }

  await Promise.all(notifications);
}

async function sendNotification(userId, notificationData) {
  return db.collection("notifications").add({
    user_id: userId,
    ...notificationData,
    read: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function calculateSchoolDays(startDate, endDate) {
  // Simple calculation - can be enhanced to exclude weekends and existing holidays
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  // Rough estimate: 5/7 of days are school days (excluding weekends)
  return Math.floor((daysDiff * 5) / 7);
}
