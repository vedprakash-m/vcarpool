const { container } = require('../src/container');
const UnifiedResponseHandler = require('../src/utils/unified-response.service');
const { v4: uuidv4 } = require('uuid');

/**
 * Safety Reporting System for Carpool Management
 * Implements PRD requirements for anonymous safety reporting and escalation
 * Following tech spec: Basic safety reporting with Group Admin notification
 */
module.exports = async function (context, req) {
  context.log('safety-reporting HTTP trigger invoked');

  if (req.method === 'OPTIONS') {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  try {
    if (req.method === 'POST') {
      await handleSafetyReport(context, req);
    } else if (req.method === 'GET') {
      await handleGetReports(context, req);
    } else {
      context.res = UnifiedResponseHandler.methodNotAllowedError();
    }
  } catch (error) {
    context.log('Error in safety-reporting', error);
    context.res = UnifiedResponseHandler.internalError();
  }
};

/**
 * Handle safety report submission
 */
async function handleSafetyReport(context, req) {
  const {
    groupId,
    reportType,
    description,
    isAnonymous,
    reporterUserId,
    driverId,
    incidentDate,
    severity,
  } = req.body;

  // Validation
  if (!groupId) {
    context.res = UnifiedResponseHandler.validationError('Group ID is required');
    return;
  }

  if (
    !reportType ||
    !['vehicle_safety', 'driving_behavior', 'child_safety', 'emergency', 'other'].includes(
      reportType,
    )
  ) {
    context.res = UnifiedResponseHandler.validationError('Valid report type is required');
    return;
  }

  if (!description || description.trim().length < 10) {
    context.res = UnifiedResponseHandler.validationError(
      'Description must be at least 10 characters',
    );
    return;
  }

  if (!severity || !['low', 'medium', 'high', 'critical'].includes(severity)) {
    context.res = UnifiedResponseHandler.validationError('Valid severity level is required');
    return;
  }

  try {
    // Verify group exists and get Group Admin
    const groupQuery = {
      query: "SELECT * FROM c WHERE c.id = @groupId AND c.type = 'carpool_group'",
      parameters: [{ name: '@groupId', value: groupId }],
    };

    const { resources: groups } = await container.items.query(groupQuery).fetchAll();
    if (groups.length === 0) {
      context.res = UnifiedResponseHandler.notFoundError('Carpool group not found');
      return;
    }

    const group = groups[0];
    const groupAdminId = group.groupAdminId;

    // Create safety report
    const reportId = uuidv4();
    const safetyReport = {
      id: reportId,
      type: 'safety_report',
      groupId,
      reportType,
      description: description.trim(),
      severity,
      isAnonymous: isAnonymous || false,
      reporterUserId: isAnonymous ? null : reporterUserId,
      driverId: driverId || null,
      incidentDate: incidentDate || new Date().toISOString(),
      status: 'open',
      escalationLevel: severity === 'critical' ? 'super_admin' : 'group_admin',
      assignedTo: severity === 'critical' ? 'super_admin' : groupAdminId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [
        {
          action: 'report_submitted',
          timestamp: new Date().toISOString(),
          by: isAnonymous ? 'anonymous' : reporterUserId,
          details: `${reportType} report submitted with ${severity} severity`,
        },
      ],
    };

    // Store safety report
    await container.items.create(safetyReport);

    context.log(
      `Safety report created: ${reportId} for group ${groupId} with severity ${severity}`,
    );

    // Send immediate notifications
    await notifyAboutSafetyReport(safetyReport, group, context);

    // Auto-escalate critical reports
    if (severity === 'critical') {
      await escalateToSuperAdmin(safetyReport, group, context);
    }

    context.res = UnifiedResponseHandler.success({
      message: 'Safety report submitted successfully',
      reportId,
      status: safetyReport.status,
      escalationLevel: safetyReport.escalationLevel,
      nextSteps:
        severity === 'critical'
          ? 'Report escalated to Super Admin for immediate review'
          : 'Group Admin has been notified and will review within 24 hours',
    });
  } catch (error) {
    context.log(`Error creating safety report: ${error.message}`);
    context.res = UnifiedResponseHandler.internalError();
  }
}

/**
 * Handle getting safety reports (for Group Admin and Super Admin)
 */
async function handleGetReports(context, req) {
  const { groupId, userId, userRole, status, reportType } = req.query;

  if (!userId || !userRole) {
    context.res = UnifiedResponseHandler.authenticationError();
    return;
  }

  try {
    let query = "SELECT * FROM c WHERE c.type = 'safety_report'";
    const parameters = [];

    // Role-based access control
    if (userRole === 'super_admin') {
      // Super Admin can see all reports
      if (groupId) {
        query += ' AND c.groupId = @groupId';
        parameters.push({ name: '@groupId', value: groupId });
      }
    } else if (userRole === 'group_admin') {
      // Group Admin can only see reports for their groups
      if (!groupId) {
        context.res = UnifiedResponseHandler.validationError('Group ID required for Group Admin');
        return;
      }

      // Verify user is Group Admin of this group
      const groupQuery = {
        query:
          "SELECT * FROM c WHERE c.id = @groupId AND c.type = 'carpool_group' AND c.groupAdminId = @userId",
        parameters: [
          { name: '@groupId', value: groupId },
          { name: '@userId', value: userId },
        ],
      };

      const { resources: groups } = await container.items.query(groupQuery).fetchAll();
      if (groups.length === 0) {
        context.res = UnifiedResponseHandler.forbiddenError('Access denied');
        return;
      }

      query += ' AND c.groupId = @groupId';
      parameters.push({ name: '@groupId', value: groupId });
    } else {
      // Regular users can only see their own reports (non-anonymous)
      query += ' AND c.reporterUserId = @userId';
      parameters.push({ name: '@userId', value: userId });
    }

    // Additional filters
    if (status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: status });
    }

    if (reportType) {
      query += ' AND c.reportType = @reportType';
      parameters.push({ name: '@reportType', value: reportType });
    }

    query += ' ORDER BY c.createdAt DESC';

    const { resources: reports } = await container.items.query({ query, parameters }).fetchAll();

    // Sanitize data based on role
    const sanitizedReports = reports.map((report) => {
      if (userRole !== 'super_admin' && userRole !== 'group_admin') {
        // Regular users only see their own reports with limited info
        return {
          id: report.id,
          reportType: report.reportType,
          severity: report.severity,
          status: report.status,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        };
      }

      // Group Admin and Super Admin see full details (except anonymous reporter info)
      const sanitized = { ...report };
      if (report.isAnonymous) {
        sanitized.reporterUserId = null;
        sanitized.timeline = sanitized.timeline.map((entry) => ({
          ...entry,
          by: entry.by === 'anonymous' ? 'anonymous' : entry.by,
        }));
      }

      return sanitized;
    });

    context.res = UnifiedResponseHandler.success({
      reports: sanitizedReports,
      count: sanitizedReports.length,
      groupId,
      userRole,
    });
  } catch (error) {
    context.log(`Error fetching safety reports: ${error.message}`);
    context.res = UnifiedResponseHandler.internalError();
  }
}

/**
 * Send notifications about new safety report
 */
async function notifyAboutSafetyReport(report, group, context) {
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
      reportType: report.reportType,
      severity: report.severity,
      timestamp: new Date(report.createdAt).toLocaleString(),
      reportId: report.id,
      reviewUrl: `${process.env.FRONTEND_URL}/admin/safety-reports/${report.id}`,
      isAnonymous: report.isAnonymous,
    };

    // Send notification via Azure Communication Services
    const notificationPayload = {
      recipients: [
        {
          email: groupAdmin.email,
          phone: groupAdmin.phoneNumber,
          name: `${groupAdmin.firstName} ${groupAdmin.lastName}`,
        },
      ],
      templateName: 'safety_report',
      data: notificationData,
      channel: report.severity === 'critical' ? 'both' : 'email',
      priority: report.severity === 'critical' ? 'high' : 'normal',
    };

    // Call notifications-azure-comm function
    // This would be an internal function call in production
    context.log(`Sending safety report notification to Group Admin: ${groupAdmin.email}`);
    context.log(`Notification data: ${JSON.stringify(notificationData)}`);
  } catch (error) {
    context.log(`Error sending safety report notification: ${error.message}`);
  }
}

/**
 * Escalate critical reports to Super Admin
 */
async function escalateToSuperAdmin(report, group, context) {
  try {
    // Get Super Admin (for beta, this is the platform owner)
    const superAdminQuery = {
      query: "SELECT * FROM c WHERE c.type = 'user' AND c.role = 'admin'",
      parameters: [],
    };

    const { resources: superAdmins } = await container.items.query(superAdminQuery).fetchAll();
    if (superAdmins.length === 0) {
      context.log(`Warning: No Super Admin found for escalation`);
      return;
    }

    const superAdmin = superAdmins[0];

    // Update report with escalation
    const updatedReport = {
      ...report,
      escalationLevel: 'super_admin',
      assignedTo: superAdmin.id,
      updatedAt: new Date().toISOString(),
      timeline: [
        ...report.timeline,
        {
          action: 'escalated_to_super_admin',
          timestamp: new Date().toISOString(),
          by: 'system',
          details: `Critical safety report auto-escalated to Super Admin`,
        },
      ],
    };

    await container.items.upsert(updatedReport);

    // Send critical notification to Super Admin
    const escalationData = {
      groupName: group.name,
      reportType: report.reportType,
      severity: report.severity,
      timestamp: new Date(report.createdAt).toLocaleString(),
      reportId: report.id,
      reviewUrl: `${process.env.FRONTEND_URL}/super-admin/safety-reports/${report.id}`,
      description:
        report.description.substring(0, 200) + (report.description.length > 200 ? '...' : ''),
    };

    context.log(
      `CRITICAL: Safety report ${report.id} escalated to Super Admin: ${superAdmin.email}`,
    );
    context.log(`Escalation data: ${JSON.stringify(escalationData)}`);
  } catch (error) {
    context.log(`Error escalating to Super Admin: ${error.message}`);
  }
}
