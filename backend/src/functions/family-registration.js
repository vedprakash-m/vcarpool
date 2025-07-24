const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.familyRegistration = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated"
    );
  }

  const { action } = data;

  try {
    switch (action) {
      case "register_family_structure":
        return await registerFamilyStructure(data.familyData, context.auth.uid);

      case "add_second_parent":
        return await addSecondParent(
          data.familyId,
          data.parentData,
          context.auth.uid
        );

      case "create_join_request":
        return await createFamilyJoinRequest(
          data.familyId,
          data.groupId,
          context.auth.uid
        );

      case "get_family_profile":
        return await getFamilyProfile(data.familyId, context.auth.uid);

      case "update_family_profile":
        return await updateFamilyProfile(
          data.familyId,
          data.updates,
          context.auth.uid
        );

      case "invite_second_parent":
        return await inviteSecondParent(
          data.familyId,
          data.inviteData,
          context.auth.uid
        );

      default:
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid action specified"
        );
    }
  } catch (error) {
    console.error("Family registration error:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to process family registration request"
    );
  }
});

async function registerFamilyStructure(familyData, userId) {
  const { familyStructure, children, primaryParent } = familyData;

  // Validate family structure
  if (!["single_parent", "two_parents"].includes(familyStructure)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid family structure"
    );
  }

  if (!children || children.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "At least one child is required"
    );
  }

  // Create family record
  const familyId = admin.firestore().collection("temp").doc().id;
  const familyData = {
    id: familyId,
    familyStructure,
    primaryParentId: userId,
    secondParentId: familyStructure === "two_parents" ? null : undefined,
    secondParentInvited: false,
    childrenCount: children.length,
    children: children.map((child, index) => ({
      id: `child-${familyId}-${index}`,
      name: child.name,
      grade: child.grade,
      school: child.school,
      specialNeeds: child.specialNeeds || null,
      transportationNeeds: child.transportationNeeds,
    })),
    status: "registration_complete",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Update primary parent's profile
  await db
    .collection("users")
    .doc(userId)
    .update({
      familyId,
      role: "primary_parent",
      name: primaryParent.name,
      email: primaryParent.email,
      phone: primaryParent.phone,
      canDrive: primaryParent.canDrive,
      vehicleInfo: primaryParent.canDrive ? primaryParent.vehicleInfo : null,
      drivingAvailability: primaryParent.canDrive
        ? primaryParent.drivingAvailability
        : null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Create family record
  await db.collection("families").doc(familyId).set(familyData);

  // Create family units (one per child)
  const batch = db.batch();
  children.forEach((child, index) => {
    const unitId = `unit-${familyId}-${index}`;
    const unitRef = db.collection("family_units").doc(unitId);

    batch.set(unitRef, {
      id: unitId,
      familyId,
      childId: `child-${familyId}-${index}`,
      childName: child.name,
      parentIds: [userId],
      primaryParentId: userId,
      secondParentId: familyStructure === "two_parents" ? null : undefined,
      transportationNeeds: child.transportationNeeds,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return {
    success: true,
    familyId,
    message: "Family structure registered successfully",
    familyUnits: children.length,
    nextStep:
      familyStructure === "two_parents"
        ? "invite_second_parent"
        : "ready_to_join_groups",
  };
}

async function addSecondParent(familyId, parentData, primaryParentId) {
  // Verify the requesting user is the primary parent
  const familyDoc = await db.collection("families").doc(familyId).get();
  if (!familyDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Family not found");
  }

  const family = familyDoc.data();
  if (family.primaryParentId !== primaryParentId) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only primary parent can add second parent"
    );
  }

  // Check if user already exists
  let secondParentUserId;
  const existingUserSnapshot = await db
    .collection("users")
    .where("email", "==", parentData.email)
    .get();

  if (existingUserSnapshot.empty) {
    // Create new user record for second parent
    secondParentUserId = admin.firestore().collection("temp").doc().id;
    await db
      .collection("users")
      .doc(secondParentUserId)
      .set({
        id: secondParentUserId,
        familyId,
        role: "second_parent",
        name: parentData.name,
        email: parentData.email,
        phone: parentData.phone,
        canDrive: parentData.canDrive,
        vehicleInfo: parentData.canDrive ? parentData.vehicleInfo : null,
        drivingAvailability: parentData.canDrive
          ? parentData.drivingAvailability
          : null,
        accountStatus: "pending_activation",
        invitedBy: primaryParentId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
  } else {
    // Link existing user to family
    secondParentUserId = existingUserSnapshot.docs[0].id;
    await db
      .collection("users")
      .doc(secondParentUserId)
      .update({
        familyId,
        role: "second_parent",
        canDrive: parentData.canDrive,
        vehicleInfo: parentData.canDrive ? parentData.vehicleInfo : null,
        drivingAvailability: parentData.canDrive
          ? parentData.drivingAvailability
          : null,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  // Update family record
  await db.collection("families").doc(familyId).update({
    secondParentId: secondParentUserId,
    secondParentAdded: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update all family units with second parent
  const familyUnitsSnapshot = await db
    .collection("family_units")
    .where("familyId", "==", familyId)
    .get();

  const batch = db.batch();
  familyUnitsSnapshot.docs.forEach((unitDoc) => {
    batch.update(unitDoc.ref, {
      parentIds: [primaryParentId, secondParentUserId],
      secondParentId: secondParentUserId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  // Send invitation email if new user
  if (existingUserSnapshot.empty) {
    await sendParentInvitationEmail(
      secondParentUserId,
      parentData.email,
      family
    );
  }

  return {
    success: true,
    message: "Second parent added successfully",
    secondParentId: secondParentUserId,
    requiresActivation: existingUserSnapshot.empty,
  };
}

async function createFamilyJoinRequest(familyId, groupId, userId) {
  // Verify user belongs to this family
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists || userDoc.data().familyId !== familyId) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "User does not belong to this family"
    );
  }

  // Get family and group information
  const [familyDoc, groupDoc] = await Promise.all([
    db.collection("families").doc(familyId).get(),
    db.collection("carpool_groups").doc(groupId).get(),
  ]);

  if (!familyDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Family not found");
  }
  if (!groupDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Carpool group not found"
    );
  }

  const family = familyDoc.data();
  const group = groupDoc.data();

  // Check for child conflicts (children can only be in one group)
  for (const child of family.children) {
    const existingMemberships = await db
      .collection("group_memberships")
      .where("child_id", "==", child.id)
      .where("status", "in", ["approved", "pending"])
      .get();

    if (!existingMemberships.empty) {
      throw new functions.https.HttpsError(
        "already-exists",
        `Child ${child.name} is already in another carpool group. Children can only be in one group at a time.`
      );
    }
  }

  // Create join request for the family
  const joinRequest = {
    id: `jr-${Date.now()}`,
    familyId: family.id,
    groupId: "group-1", // Assume a default group for now
    status: "pending",
    requiredApprovals: 1, // Group admin approval only
    approvals: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection("join_requests").doc(joinRequest.id).set(joinRequest);

  // Notify group admin
  await notifyTripAdmin(group.trip_admin_id, {
    type: "family_join_request",
    title: "New Family Join Request",
    message: `${family.children
      .map((c) => c.name)
      .join(", ")} family has requested to join your carpool group`,
    groupId,
    joinRequestId: joinRequest.id,
  });

  return {
    success: true,
    joinRequestId: joinRequest.id,
    message: "Family join request submitted successfully",
    familyUnitsRequested: family.children.length,
    estimatedProcessingTime: "24-48 hours",
  };
}

async function getFamilyProfile(familyId, userId) {
  // Get family data
  const familyDoc = await db.collection("families").doc(familyId).get();
  if (!familyDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Family not found");
  }

  const family = familyDoc.data();

  // Verify user belongs to this family
  if (family.primaryParentId !== userId && family.secondParentId !== userId) {
    throw new functions.https.HttpsError("permission-denied", "Access denied");
  }

  // Get parent profiles
  const parentPromises = [
    db.collection("users").doc(family.primaryParentId).get(),
  ];
  if (family.secondParentId) {
    parentPromises.push(
      db.collection("users").doc(family.secondParentId).get()
    );
  }

  const parentDocs = await Promise.all(parentPromises);
  const parents = parentDocs
    .map((doc) => (doc.exists ? doc.data() : null))
    .filter(Boolean);

  // Get family units
  const familyUnitsSnapshot = await db
    .collection("family_units")
    .where("familyId", "==", familyId)
    .get();
  const familyUnits = familyUnitsSnapshot.docs.map((doc) => doc.data());

  // Get group memberships
  const membershipsSnapshot = await db
    .collection("group_memberships")
    .where("family_id", "==", familyId)
    .get();
  const memberships = membershipsSnapshot.docs.map((doc) => doc.data());

  return {
    family,
    parents,
    familyUnits,
    memberships,
    summary: {
      childrenCount: family.children.length,
      parentsCount: parents.length,
      drivingParents: parents.filter((p) => p.canDrive).length,
      activeGroupMemberships: memberships.filter((m) => m.status === "approved")
        .length,
    },
  };
}

async function updateFamilyProfile(familyId, updates, userId) {
  // Verify user belongs to this family
  const familyDoc = await db.collection("families").doc(familyId).get();
  if (!familyDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Family not found");
  }

  const family = familyDoc.data();
  if (family.primaryParentId !== userId && family.secondParentId !== userId) {
    throw new functions.https.HttpsError("permission-denied", "Access denied");
  }

  // Update family record
  await db
    .collection("families")
    .doc(familyId)
    .update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: userId,
    });

  return { success: true, message: "Family profile updated successfully" };
}

async function inviteSecondParent(familyId, inviteData, primaryParentId) {
  const { email, message } = inviteData;

  // Verify user is primary parent
  const familyDoc = await db.collection("families").doc(familyId).get();
  if (
    !familyDoc.exists ||
    familyDoc.data().primaryParentId !== primaryParentId
  ) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only primary parent can send invitations"
    );
  }

  const family = familyDoc.data();

  // Create invitation record
  const invitationId = admin.firestore().collection("temp").doc().id;
  await db
    .collection("parent_invitations")
    .doc(invitationId)
    .set({
      id: invitationId,
      familyId,
      invitedEmail: email,
      invitedBy: primaryParentId,
      customMessage: message,
      status: "sent",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Send invitation email
  await sendParentInvitationEmail(null, email, family, message, invitationId);

  return {
    success: true,
    invitationId,
    message: "Invitation sent successfully",
    expiresIn: "7 days",
  };
}

// Helper functions
async function getDrivingCapabilities(familyId) {
  const parentSnapshot = await db
    .collection("users")
    .where("familyId", "==", familyId)
    .get();

  const drivingParents = parentSnapshot.docs
    .map((doc) => doc.data())
    .filter((parent) => parent.canDrive);

  return {
    totalDrivers: drivingParents.length,
    vehicles: drivingParents
      .map((parent) => parent.vehicleInfo)
      .filter(Boolean),
    maxCapacity: Math.max(
      ...drivingParents.map((parent) => parent.vehicleInfo?.capacity || 0),
      0
    ),
  };
}

async function countDrivingParents(familyId) {
  const parentSnapshot = await db
    .collection("users")
    .where("familyId", "==", familyId)
    .where("canDrive", "==", true)
    .get();

  return parentSnapshot.docs.length;
}

async function sendParentInvitationEmail(
  userId,
  email,
  family,
  customMessage = "",
  invitationId = ""
) {
  // In a real implementation, this would integrate with an email service
  console.log(`Sending invitation email to ${email} for family ${family.id}`);

  // For now, just create a notification record
  return db.collection("notifications").add({
    type: "parent_invitation",
    recipientEmail: email,
    familyId: family.id,
    invitationId,
    title: "You've been invited to join a carpool family",
    message: `You've been invited to join the ${family.children
      .map((c) => c.name)
      .join(", ")} family carpool. ${customMessage}`,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function notifyTripAdmin(adminUserId, notificationData) {
  return db.collection("notifications").add({
    user_id: adminUserId,
    ...notificationData,
    read: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}
