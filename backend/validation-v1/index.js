const { ValidationService } = require('../shared/src/services');
const { databaseService } = require('../src/services/database.service');

module.exports = async function validationV1(context, req) {
  context.log('v1/validation endpoint called');

  try {
    const method = req.method;
    const action = req.params.action || 'address';

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

    // Initialize ValidationService with actual database service
    const validationService = new ValidationService({
      database: databaseService,
      cache: null, // TODO: Add cache service when available
      eventBus: null, // TODO: Add event bus when available
      logger: context.log,
      metrics: null, // TODO: Add metrics service when available
      geocodingService: null, // TODO: Add geocoding service integration
      complianceService: null, // TODO: Add compliance service integration
    });

    if (method === 'POST') {
      if (action === 'address') {
        const { address } = req.body;

        context.log('Validating address:', address);

        if (!address) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required field: address',
            },
          };
          return;
        }

        const result = await validationService.validateAddress(address);

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

      if (action === 'carpool-rules') {
        const { groupData } = req.body;

        context.log('Validating carpool rules for group:', groupData?.id);

        if (!groupData) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required field: groupData',
            },
          };
          return;
        }

        const result = await validationService.validateCarpoolRules(groupData);

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

      if (action === 'safety-requirements') {
        const { userData } = req.body;

        context.log('Validating safety requirements for user:', userData?.id);

        if (!userData) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required field: userData',
            },
          };
          return;
        }

        const result = await validationService.validateSafetyRequirements(userData);

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

      if (action === 'business-rules') {
        const { entityType, entityData } = req.body;

        context.log('Validating business rules for:', entityType);

        if (!entityType || !entityData) {
          context.res = {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            body: {
              success: false,
              error: 'Missing required fields: entityType, entityData',
            },
          };
          return;
        }

        const result = await validationService.validateBusinessRules(entityType, entityData);

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
      if (action === 'compliance-check') {
        const entityType = req.query.entityType;
        const entityId = req.query.entityId;

        context.log('Checking compliance for:', entityType, entityId);

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

        const result = await validationService.checkCompliance(entityType, entityId);

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
    context.log.error('ValidationService error:', error);

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
