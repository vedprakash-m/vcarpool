const { AuditService } = require('../shared/src/services');
const { databaseService } = require('../src/services/database.service');

module.exports = async function auditV1(context, req) {
  context.log('v1/audit endpoint called');

  try {
    const method = req.method;
    const action = req.params.action || 'log';

    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
      context.res = {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      };
      return;
    }

    // Initialize AuditService with actual database service
    const auditService = new AuditService({
      database: databaseService,
      cache: null, // TODO: Add cache service when available
      eventBus: null, // TODO: Add event bus when available
      logger: context.log,
      metrics: null, // TODO: Add metrics service when available
      storageService: null, // TODO: Add storage service integration
      complianceService: null, // TODO: Add compliance service integration
    });

    if (method === 'POST') {
      if (action === 'log') {
        const auditEntry = req.body;

        context.log('Logging audit entry:', {
          entityType: auditEntry.entityType,
          entityId: auditEntry.entityId,
          action: auditEntry.action,
          userId: auditEntry.userId,
        });

        if (!auditEntry.entityType || !auditEntry.entityId || !auditEntry.action) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required fields: entityType, entityId, action',
            },
          };
          return;
        }

        const result = await auditService.logAuditEntry(auditEntry);

        context.res = {
          status: result.success ? 200 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: result.success,
            data: result.data,
            error: result.error,
          },
        };
        return;
      }

      if (action === 'security-event') {
        const securityEvent = req.body;

        context.log('Logging security event:', {
          eventType: securityEvent.eventType,
          userId: securityEvent.userId,
          severity: securityEvent.severity,
        });

        if (!securityEvent.eventType || !securityEvent.userId) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required fields: eventType, userId',
            },
          };
          return;
        }

        const result = await auditService.logSecurityEvent(securityEvent);

        context.res = {
          status: result.success ? 200 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: result.success,
            data: result.data,
            error: result.error,
          },
        };
        return;
      }

      if (action === 'performance-metric') {
        const performanceData = req.body;

        context.log('Logging performance metric:', {
          operation: performanceData.operation,
          duration: performanceData.duration,
          status: performanceData.status,
        });

        if (!performanceData.operation || !performanceData.duration) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required fields: operation, duration',
            },
          };
          return;
        }

        const result = await auditService.logPerformanceMetric(performanceData);

        context.res = {
          status: result.success ? 200 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: result.success,
            data: result.data,
            error: result.error,
          },
        };
        return;
      }
    }

    if (method === 'GET') {
      if (action === 'trail') {
        const entityType = req.query.entityType;
        const entityId = req.query.entityId;
        const limit = parseInt(req.query.limit) || 50;

        context.log('Getting audit trail for:', entityType, entityId);

        if (!entityType || !entityId) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required parameters: entityType, entityId',
            },
          };
          return;
        }

        const result = await auditService.getAuditTrail(entityType, entityId, limit);

        context.res = {
          status: result.success ? 200 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: result.success,
            data: result.data,
            error: result.error,
          },
        };
        return;
      }

      if (action === 'security-events') {
        const userId = req.query.userId;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const limit = parseInt(req.query.limit) || 50;

        context.log('Getting security events for user:', userId);

        const result = await auditService.getSecurityEvents(userId, startDate, endDate, limit);

        context.res = {
          status: result.success ? 200 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: result.success,
            data: result.data,
            error: result.error,
          },
        };
        return;
      }

      if (action === 'compliance-report') {
        const entityType = req.query.entityType;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        context.log('Getting compliance report for:', entityType);

        if (!entityType) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required parameter: entityType',
            },
          };
          return;
        }

        const result = await auditService.generateComplianceReport(entityType, startDate, endDate);

        context.res = {
          status: result.success ? 200 : 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: result.success,
            data: result.data,
            error: result.error,
          },
        };
        return;
      }
    }

    // Method not allowed
    context.res = {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: {
        success: false,
        error: 'Method not allowed',
      },
    };
  } catch (error) {
    context.log.error('AuditService error:', error);

    context.res = {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
    };
  }
};
