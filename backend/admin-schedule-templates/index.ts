/**
 * Admin Schedule Templates Management
 *
 * Migrated from JavaScript to TypeScript
 * Handles schedule template CRUD operations for admin users
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate } from '../src/middleware';
import UnifiedResponseHandler from '../src/utils/unified-response.service';

interface ScheduleTemplate {
  id: string;
  name: string;
  description?: string;
  groupId: string;
  isActive: boolean;
  weeklyPattern: {
    monday?: DaySchedule;
    tuesday?: DaySchedule;
    wednesday?: DaySchedule;
    thursday?: DaySchedule;
    friday?: DaySchedule;
    saturday?: DaySchedule;
    sunday?: DaySchedule;
  };
  settings: {
    maxPassengersPerTrip: number;
    defaultTripDuration: number; // in minutes
    bufferTime: number; // in minutes
    allowFlexibleTiming: boolean;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

interface DaySchedule {
  enabled: boolean;
  trips: Array<{
    id: string;
    type: 'pickup' | 'dropoff';
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    route: string;
    maxPassengers: number;
    defaultDriverId?: string;
    notes?: string;
  }>;
}

interface CreateTemplateRequest {
  name: string;
  description?: string;
  groupId: string;
  weeklyPattern: ScheduleTemplate['weeklyPattern'];
  settings?: Partial<ScheduleTemplate['settings']>;
}

interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  isActive?: boolean;
}

export async function adminScheduleTemplates(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Admin Schedule Templates API called');

  try {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return UnifiedResponseHandler.preflight();
    }

    // Apply authentication middleware
    const authResponse = await authenticate(request, context);
    if (authResponse) {
      return authResponse;
    }

    // Check if user is authenticated
    if (!request.auth) {
      return UnifiedResponseHandler.authError('Authentication required');
    }

    const user = request.auth;

    // Validate admin access
    if (user.role !== 'super_admin' && user.role !== 'group_admin') {
      return UnifiedResponseHandler.forbiddenError('Admin access required');
    }

    const templateId = request.params.id;
    const method = request.method.toUpperCase();

    switch (method) {
      case 'GET':
        return await handleGet(templateId, context);

      case 'POST':
        return await handlePost(request, user.userId, context);

      case 'PUT':
        return await handlePut(templateId, request, user.userId, context);

      case 'DELETE':
        return await handleDelete(templateId, context);

      default:
        return UnifiedResponseHandler.methodNotAllowedError(`Method ${method} not allowed`);
    }
  } catch (error) {
    context.log('Schedule templates error:', error);
    return UnifiedResponseHandler.internalError(
      'Failed to process schedule templates',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Handle GET requests - get all templates or specific template
async function handleGet(
  templateId: string | undefined,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    if (templateId) {
      // Get specific template
      const template = getMockTemplateById(templateId);
      if (!template) {
        return UnifiedResponseHandler.notFoundError('Template not found');
      }
      return UnifiedResponseHandler.success(template);
    } else {
      // Get all templates
      const templates = getMockTemplates();
      return UnifiedResponseHandler.success({
        templates,
        total: templates.length,
        pagination: {
          page: 1,
          limit: templates.length,
          total: templates.length,
        },
      });
    }
  } catch (error) {
    context.log('Get templates error:', error);
    throw error;
  }
}

// Handle POST requests - create new template
async function handlePost(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as CreateTemplateRequest;

    // Validate required fields
    if (!body.name || !body.groupId || !body.weeklyPattern) {
      return UnifiedResponseHandler.validationError(
        'Missing required fields: name, groupId, weeklyPattern',
      );
    }

    // Create new template
    const now = new Date().toISOString();
    const newTemplate: ScheduleTemplate = {
      id: `template-${Date.now()}`,
      name: body.name,
      description: body.description,
      groupId: body.groupId,
      isActive: true,
      weeklyPattern: body.weeklyPattern,
      settings: {
        maxPassengersPerTrip: body.settings?.maxPassengersPerTrip || 6,
        defaultTripDuration: body.settings?.defaultTripDuration || 30,
        bufferTime: body.settings?.bufferTime || 10,
        allowFlexibleTiming: body.settings?.allowFlexibleTiming || false,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      lastModifiedBy: userId,
    };

    return UnifiedResponseHandler.success(newTemplate);
  } catch (error) {
    context.log('Create template error:', error);
    throw error;
  }
}

// Handle PUT requests - update existing template
async function handlePut(
  templateId: string | undefined,
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    if (!templateId) {
      return UnifiedResponseHandler.validationError('Template ID is required');
    }

    const body = (await request.json()) as UpdateTemplateRequest;

    // Check if template exists
    const existingTemplate = getMockTemplateById(templateId);
    if (!existingTemplate) {
      return UnifiedResponseHandler.notFoundError('Template not found');
    }

    // Update template
    const updatedTemplate: ScheduleTemplate = {
      ...existingTemplate,
      ...body,
      id: templateId,
      settings: {
        ...existingTemplate.settings,
        ...body.settings,
      },
      updatedAt: new Date().toISOString(),
      lastModifiedBy: userId,
    };

    return UnifiedResponseHandler.success(updatedTemplate);
  } catch (error) {
    context.log('Update template error:', error);
    throw error;
  }
}

// Handle DELETE requests - delete template
async function handleDelete(
  templateId: string | undefined,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    if (!templateId) {
      return UnifiedResponseHandler.validationError('Template ID is required');
    }

    // Check if template exists
    const existingTemplate = getMockTemplateById(templateId);
    if (!existingTemplate) {
      return UnifiedResponseHandler.notFoundError('Template not found');
    }

    // In production, this would delete from database
    return UnifiedResponseHandler.success({
      message: 'Template deleted successfully',
      templateId,
    });
  } catch (error) {
    context.log('Delete template error:', error);
    throw error;
  }
}

// Mock data functions
function getMockTemplates(): ScheduleTemplate[] {
  return [
    {
      id: 'template-1',
      name: 'Standard Weekly Schedule',
      description: 'Default template for weekly carpool schedules',
      groupId: 'group-1',
      isActive: true,
      weeklyPattern: {
        monday: {
          enabled: true,
          trips: [
            {
              id: 'trip-1',
              type: 'pickup',
              startTime: '08:00',
              endTime: '08:30',
              route: 'North Route',
              maxPassengers: 4,
              notes: 'Morning pickup',
            },
            {
              id: 'trip-2',
              type: 'dropoff',
              startTime: '15:30',
              endTime: '16:00',
              route: 'North Route',
              maxPassengers: 4,
              notes: 'Afternoon dropoff',
            },
          ],
        },
        wednesday: {
          enabled: true,
          trips: [
            {
              id: 'trip-3',
              type: 'pickup',
              startTime: '08:00',
              endTime: '08:30',
              route: 'South Route',
              maxPassengers: 6,
              notes: 'Morning pickup',
            },
          ],
        },
        friday: {
          enabled: true,
          trips: [
            {
              id: 'trip-4',
              type: 'dropoff',
              startTime: '15:30',
              endTime: '16:00',
              route: 'Combined Route',
              maxPassengers: 8,
              notes: 'Friday afternoon dropoff',
            },
          ],
        },
      },
      settings: {
        maxPassengersPerTrip: 6,
        defaultTripDuration: 30,
        bufferTime: 10,
        allowFlexibleTiming: true,
      },
      createdAt: '2025-07-01T10:00:00Z',
      updatedAt: '2025-07-04T14:30:00Z',
      createdBy: 'admin-1',
      lastModifiedBy: 'admin-1',
    },
  ];
}

function getMockTemplateById(templateId: string): ScheduleTemplate | undefined {
  const templates = getMockTemplates();
  return templates.find((template) => template.id === templateId);
}
