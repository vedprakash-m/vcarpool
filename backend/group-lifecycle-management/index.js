const { container } = require('../src/container');
const UnifiedResponseHandler = require('../src/utils/unified-response.service');

/**
 * Group Lifecycle Management System
 * Implements PRD requirements for automated group inactivity detection and management
 * Following tech spec: Group lifecycle with automated workflows
 */
module.exports = async function (context, req) {
  context.log('group-lifecycle-management HTTP trigger invoked');

  if (req.method === 'OPTIONS') {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetLifecycleStatus(context, req);
        break;
      case 'POST':
        await handleInactivityCheck(context, req);
        break;
      case 'PUT':
        await handleGroupStatusUpdate(context, req);
        break;
      default:
        context.res = UnifiedResponseHandler.methodNotAllowedError();
    }
  } catch (error) {
    context.log('Error in group-lifecycle-management', error);
    context.res = UnifiedResponseHandler.internalError();
  }
};

/**
 * Get lifecycle status for groups
 */
async function handleGetLifecycleStatus(context, req) {
  const { groupId, adminUserId } = req.query;

  if (!adminUserId) {
    context.res = UnifiedResponseHandler.authenticationError();
    return;
  }

  try {
    let query = "SELECT * FROM c WHERE c.type = 'carpool_group'";
    const parameters = [];

    // Check if user is Super Admin or specific group admin
    const userQuery = {
      query: "SELECT * FROM c WHERE c.id = @userId AND c.type = 'user'",
      parameters: [{ name: '@userId', value: adminUserId }],
    };

    const { resources: users } = await container.items.query(userQuery).fetchAll();
    if (users.length === 0) {
      context.res = UnifiedResponseHandler.authenticationError();
      return;
    }

    const user = users[0];
    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';

    if (groupId) {
      query += ' AND c.id = @groupId';
      parameters.push({ name: '@groupId', value: groupId });

      // Verify group admin access
      if (!isSuperAdmin) {
        query += ' AND c.groupAdminId = @adminUserId';
        parameters.push({ name: '@adminUserId', value: adminUserId });
      }
    } else if (!isSuperAdmin) {
      // Regular Group Admin can only see their groups
      query += ' AND c.groupAdminId = @adminUserId';
      parameters.push({ name: '@adminUserId', value: adminUserId });
    }

    const { resources: groups } = await container.items.query({ query, parameters }).fetchAll();

    // Calculate lifecycle metrics for each group
    const groupsWithMetrics = await Promise.all(
      groups.map(async (group) => {
        const lifecycleMetrics = await calculateGroupLifecycleMetrics(group, context);
        return {
          ...group,
          lifecycleMetrics,
        };
      }),
    );

    // Sort by activity level (least active first)
    groupsWithMetrics.sort((a, b) => {
      const aScore = a.lifecycleMetrics.activityScore;
      const bScore = b.lifecycleMetrics.activityScore;
      return aScore - bScore;
    });

    context.res = UnifiedResponseHandler.success({
      groups: groupsWithMetrics,
      summary: {
        totalGroups: groupsWithMetrics.length,
        activeGroups: groupsWithMetrics.filter((g) => g.status === 'active').length,
        inactiveGroups: groupsWithMetrics.filter((g) => g.status === 'inactive').length,
        atRiskGroups: groupsWithMetrics.filter((g) => g.lifecycleMetrics.riskLevel === 'high')
          .length,
      },
    });
  } catch (error) {
    context.log(`Error getting lifecycle status: ${error.message}`);
    context.res = UnifiedResponseHandler.internalError();
  }
}

/**
 * Run inactivity check on all groups
 */
async function handleInactivityCheck(context, req) {
  const { adminUserId, forceCheck = false } = req.body;

  if (!adminUserId) {
    context.res = UnifiedResponseHandler.authenticationError();
    return;
  }

  try {
    // Verify Super Admin access
    const userQuery = {
      query:
        "SELECT * FROM c WHERE c.id = @userId AND c.type = 'user' AND (c.role = 'super_admin' OR c.role = 'admin')",
      parameters: [{ name: '@userId', value: adminUserId }],
    };

    const { resources: users } = await container.items.query(userQuery).fetchAll();
    if (users.length === 0) {
      context.res = UnifiedResponseHandler.forbiddenError(
        'Only Super Admin can run inactivity checks',
      );
      return;
    }

    // Get all active groups
    const activeGroupsQuery = {
      query: "SELECT * FROM c WHERE c.type = 'carpool_group' AND c.status = 'active'",
      parameters: [],
    };

    const { resources: activeGroups } = await container.items.query(activeGroupsQuery).fetchAll();

    const results = {
      checkedGroups: 0,
      inactiveDetected: 0,
      warningsSent: 0,
      groupsMarkedInactive: 0,
      details: [],
    };

    for (const group of activeGroups) {
      results.checkedGroups++;

      const lifecycleMetrics = await calculateGroupLifecycleMetrics(group, context);
      const action = await processGroupInactivity(group, lifecycleMetrics, forceCheck, context);

      if (action.actionTaken !== 'none') {
        results.details.push({
          groupId: group.id,
          groupName: group.name,
          activityScore: lifecycleMetrics.activityScore,
          consecutiveInactiveWeeks: lifecycleMetrics.consecutiveInactiveWeeks,
          actionTaken: action.actionTaken,
          message: action.message,
        });

        if (action.actionTaken === 'warning_sent') {
          results.warningsSent++;
        } else if (action.actionTaken === 'marked_inactive') {
          results.groupsMarkedInactive++;
          results.inactiveDetected++;
        }
      }
    }

    context.res = UnifiedResponseHandler.success({
      message: 'Inactivity check completed',
      results,
      checkTimestamp: new Date().toISOString(),
    });
  } catch (error) {
    context.log(`Error running inactivity check: ${error.message}`);
    context.res = UnifiedResponseHandler.internalError();
  }
}

/**
 * Update group status (reactivation, purging, etc.)
 */
async function handleGroupStatusUpdate(context, req) {
  const { groupId, newStatus, userId, reason } = req.body;

  if (!groupId || !newStatus || !userId) {
    context.res = UnifiedResponseHandler.validationError(
      'Group ID, new status, and user ID are required',
    );
    return;
  }

  const validStatuses = ['active', 'inactive', 'purging', 'deleted', 'paused', 'archived'];
  if (!validStatuses.includes(newStatus)) {
    context.res = UnifiedResponseHandler.validationError('Invalid status');
    return;
  }

  try {
    // Get group and verify access
    const groupQuery = {
      query: "SELECT * FROM c WHERE c.id = @groupId AND c.type = 'carpool_group'",
      parameters: [{ name: '@groupId', value: groupId }],
    };

    const { resources: groups } = await container.items.query(groupQuery).fetchAll();
    if (groups.length === 0) {
      context.res = UnifiedResponseHandler.notFoundError('Group not found');
      return;
    }

    const group = groups[0];

    // Verify user has permission to change status
    const userQuery = {
      query: "SELECT * FROM c WHERE c.id = @userId AND c.type = 'user'",
      parameters: [{ name: '@userId', value: userId }],
    };

    const { resources: users } = await container.items.query(userQuery).fetchAll();
    if (users.length === 0) {
      context.res = UnifiedResponseHandler.authenticationError();
      return;
    }

    const user = users[0];
    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
    const isGroupAdmin = group.groupAdminId === userId;

    if (!isSuperAdmin && !isGroupAdmin) {
      context.res = UnifiedResponseHandler.forbiddenError('Insufficient permissions');
      return;
    }

    // Some status changes require Super Admin
    const superAdminOnlyStatuses = ['deleted', 'archived', 'purging'];
    if (superAdminOnlyStatuses.includes(newStatus) && !isSuperAdmin) {
      context.res = UnifiedResponseHandler.forbiddenError('Only Super Admin can set this status');
      return;
    }

    // Update group status
    const updatedGroup = {
      ...group,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      statusChangeHistory: [
        ...(group.statusChangeHistory || []),
        {
          fromStatus: group.status,
          toStatus: newStatus,
          changedBy: userId,
          changedAt: new Date().toISOString(),
          reason: reason || 'Manual status change',
        },
      ],
    };

    // Add specific fields for certain statuses
    if (newStatus === 'inactive') {
      updatedGroup.inactivityDetectedAt = new Date().toISOString();
    } else if (newStatus === 'purging') {
      updatedGroup.purgingStartedAt = new Date().toISOString();
      updatedGroup.purgingScheduledDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(); // 30 days
    } else if (newStatus === 'active') {
      // Clear inactivity flags when reactivating
      delete updatedGroup.inactivityDetectedAt;
      delete updatedGroup.purgingStartedAt;
      delete updatedGroup.purgingScheduledDate;
      updatedGroup.lastActivityAt = new Date().toISOString();
    }

    await container.items.upsert(updatedGroup);

    // Send notifications based on status change
    await notifyGroupStatusChange(updatedGroup, group.status, newStatus, user, reason, context);

    context.res = UnifiedResponseHandler.success({
      message: `Group status updated to ${newStatus}`,
      groupId,
      previousStatus: group.status,
      newStatus,
      updatedAt: updatedGroup.updatedAt,
    });
  } catch (error) {
    context.log(`Error updating group status: ${error.message}`);
    context.res = UnifiedResponseHandler.internalError();
  }
}

/**
 * Calculate comprehensive lifecycle metrics for a group
 */
async function calculateGroupLifecycleMetrics(group, context) {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  try {
    // Get recent activity data
    const activityQuery = {
      query: `
        SELECT * FROM c 
        WHERE c.groupId = @groupId 
        AND c.createdAt >= @fourWeeksAgo
        AND c.type IN ('driver_weekly_preference', 'ride_assignment', 'group_message')
        ORDER BY c.createdAt DESC
      `,
      parameters: [
        { name: '@groupId', value: group.id },
        { name: '@fourWeeksAgo', value: fourWeeksAgo.toISOString() },
      ],
    };

    const { resources: activityData } = await container.items.query(activityQuery).fetchAll();

    // Calculate metrics
    const lastActivityAt = group.lastActivityAt
      ? new Date(group.lastActivityAt)
      : new Date(group.createdAt);
    const daysSinceLastActivity = Math.floor(
      (now.getTime() - lastActivityAt.getTime()) / (24 * 60 * 60 * 1000),
    );

    const recentPreferences = activityData.filter(
      (item) => item.type === 'driver_weekly_preference',
    );
    const recentAssignments = activityData.filter((item) => item.type === 'ride_assignment');
    const recentMessages = activityData.filter((item) => item.type === 'group_message');

    // Calculate consecutive inactive weeks
    let consecutiveInactiveWeeks = group.activityMetrics?.consecutiveInactiveWeeks || 0;
    if (recentPreferences.length === 0 && recentAssignments.length === 0) {
      consecutiveInactiveWeeks = Math.floor(daysSinceLastActivity / 7);
    } else {
      consecutiveInactiveWeeks = 0;
    }

    // Calculate activity score (0-100)
    let activityScore = 100;

    // Deduct points for lack of activity
    activityScore -= Math.min(daysSinceLastActivity * 2, 50); // Max 50 points for recency
    activityScore -= Math.min(consecutiveInactiveWeeks * 10, 30); // Max 30 points for inactivity

    // Deduct points for low member engagement
    const activeMemberCount =
      group.members?.filter((m) =>
        activityData.some((a) => a.reporterUserId === m.userId || a.driverParentId === m.userId),
      ).length || 0;

    const memberEngagementRate =
      group.members?.length > 0 ? activeMemberCount / group.members.length : 0;
    activityScore -= (1 - memberEngagementRate) * 20; // Max 20 points for engagement

    activityScore = Math.max(0, Math.min(100, activityScore));

    // Determine risk level
    let riskLevel = 'low';
    if (activityScore < 30 || consecutiveInactiveWeeks >= 4) {
      riskLevel = 'high';
    } else if (activityScore < 60 || consecutiveInactiveWeeks >= 2) {
      riskLevel = 'medium';
    }

    return {
      activityScore: Math.round(activityScore),
      daysSinceLastActivity,
      consecutiveInactiveWeeks,
      recentPreferences: recentPreferences.length,
      recentAssignments: recentAssignments.length,
      recentMessages: recentMessages.length,
      activeMemberCount,
      memberEngagementRate: Math.round(memberEngagementRate * 100),
      riskLevel,
      calculatedAt: new Date().toISOString(),
    };
  } catch (error) {
    context.log(`Error calculating lifecycle metrics for group ${group.id}: ${error.message}`);
    return {
      activityScore: 0,
      daysSinceLastActivity: 999,
      consecutiveInactiveWeeks: 999,
      riskLevel: 'high',
      error: error.message,
    };
  }
}

/**
 * Process group inactivity and take appropriate action
 */
async function processGroupInactivity(group, metrics, forceCheck, context) {
  const { consecutiveInactiveWeeks, activityScore, riskLevel } = metrics;

  try {
    // Determine action based on inactivity level
    if (consecutiveInactiveWeeks >= 6 || activityScore < 20) {
      // Mark as inactive after 6 weeks
      const updatedGroup = {
        ...group,
        status: 'inactive',
        inactivityDetectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activityMetrics: {
          ...group.activityMetrics,
          consecutiveInactiveWeeks,
          lastCalculatedAt: new Date().toISOString(),
        },
      };

      await container.items.upsert(updatedGroup);

      // Notify Group Admin and members
      await notifyGroupInactivity(updatedGroup, 'marked_inactive', context);

      return {
        actionTaken: 'marked_inactive',
        message: `Group marked as inactive after ${consecutiveInactiveWeeks} weeks of inactivity`,
      };
    } else if (consecutiveInactiveWeeks >= 3 || activityScore < 40) {
      // Send warning after 3 weeks
      const lastWarning = group.activityMetrics?.lastInactivityWarning;
      const daysSinceLastWarning = lastWarning
        ? Math.floor(
            (new Date().getTime() - new Date(lastWarning).getTime()) / (24 * 60 * 60 * 1000),
          )
        : 999;

      if (forceCheck || daysSinceLastWarning > 7) {
        // Only warn once per week
        const updatedGroup = {
          ...group,
          activityMetrics: {
            ...group.activityMetrics,
            consecutiveInactiveWeeks,
            lastInactivityWarning: new Date().toISOString(),
            lastCalculatedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        };

        await container.items.upsert(updatedGroup);

        // Send warning notification
        await notifyGroupInactivity(updatedGroup, 'warning_sent', context);

        return {
          actionTaken: 'warning_sent',
          message: `Inactivity warning sent after ${consecutiveInactiveWeeks} weeks`,
        };
      }
    }

    // Update metrics even if no action taken
    if (consecutiveInactiveWeeks !== (group.activityMetrics?.consecutiveInactiveWeeks || 0)) {
      const updatedGroup = {
        ...group,
        activityMetrics: {
          ...group.activityMetrics,
          consecutiveInactiveWeeks,
          lastCalculatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };

      await container.items.upsert(updatedGroup);
    }

    return {
      actionTaken: 'none',
      message: `Group activity level: ${riskLevel} risk (${activityScore}/100)`,
    };
  } catch (error) {
    context.log(`Error processing inactivity for group ${group.id}: ${error.message}`);
    return {
      actionTaken: 'error',
      message: error.message,
    };
  }
}

/**
 * Notify about group inactivity
 */
async function notifyGroupInactivity(group, actionType, context) {
  try {
    // Get Group Admin details
    const adminQuery = {
      query: "SELECT * FROM c WHERE c.id = @adminId AND c.type = 'user'",
      parameters: [{ name: '@adminId', value: group.groupAdminId }],
    };

    const { resources: admins } = await container.items.query(adminQuery).fetchAll();
    if (admins.length === 0) {
      context.log(`Warning: Group Admin not found for group ${group.id}`);
      return;
    }

    const groupAdmin = admins[0];

    // Prepare notification data
    const notificationData = {
      groupName: group.name,
      actionType,
      consecutiveInactiveWeeks: group.activityMetrics?.consecutiveInactiveWeeks || 0,
      memberCount: group.members?.length || 0,
      reactivationUrl: `${process.env.FRONTEND_URL}/admin/groups/${group.id}/reactivate`,
      timestamp: new Date().toLocaleString(),
    };

    context.log(`Group inactivity notification: ${actionType} for group ${group.name}`);
    context.log(`Notification data: ${JSON.stringify(notificationData)}`);

    // In production, this would call the notifications-azure-comm function
  } catch (error) {
    context.log(`Error sending inactivity notification: ${error.message}`);
  }
}

/**
 * Notify about group status changes
 */
async function notifyGroupStatusChange(group, oldStatus, newStatus, changedBy, reason, context) {
  try {
    context.log(
      `Group status change: ${group.name} changed from ${oldStatus} to ${newStatus} by ${changedBy.firstName} ${changedBy.lastName}`,
    );

    // In production, this would send notifications to all group members
  } catch (error) {
    context.log(`Error sending status change notification: ${error.message}`);
  }
}
