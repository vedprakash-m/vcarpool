/**
 * Admin School Management
 *
 * Migrated from JavaScript to TypeScript
 * Simplified implementation for core functionality
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  hasRole,
  corsMiddleware,
} from '../src/middleware';
import { container } from '../src/container';
import { UnifiedResponseHandler } from '../src/utils/unified-response.service';
import { UserRole } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { ILogger } from '../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Simplified school interface
interface School {
  id: string;
  name: string;
  address: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    zipCode?: string;
    city?: string;
    state?: string;
    country?: string;
    formattedAddress?: string;
  };
  district: string;
  type: 'elementary' | 'middle' | 'high' | 'k-12';
  grades: string[];
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Mock data storage
const mockSchools: School[] = [
  {
    id: 'school-1',
    name: 'Tesla STEM High School',
    address: '123 Oak Street, Springfield, IL 62701',
    location: {
      address: '123 Oak Street, Springfield, IL 62701',
      latitude: 47.674,
      longitude: -122.1215,
      zipCode: '62701',
      city: 'Springfield',
      state: 'IL',
      country: 'USA',
      formattedAddress: '123 Oak Street, Springfield, IL 62701, USA',
    },
    district: 'Springfield School District 186',
    type: 'elementary',
    grades: ['K', '1', '2', '3', '4', '5'],
    contactInfo: {
      phone: '(217) 555-0123',
      email: 'school-contact@example.com',
      website: 'https://example-school.edu',
    },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Handler function
async function adminSchoolManagementHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>('ILogger').child({ requestId: request.requestId });

  try {
    const method = request.method?.toUpperCase();
    const schoolId = request.query.get('schoolId');
    const currentUserId = request.auth!.userId; // Ensured by authenticate middleware

    logger.info('Admin school management request', { method, schoolId, currentUserId });

    switch (method) {
      case 'GET':
        if (schoolId) {
          // Get specific school
          const school = mockSchools.find((s) => s.id === schoolId);
          if (!school) {
            throw Errors.NotFound('School not found');
          }
          return UnifiedResponseHandler.success(school);
        } else {
          // Get all schools
          const activeSchools = mockSchools.filter((s) => s.isActive);
          return UnifiedResponseHandler.success(activeSchools);
        }

      case 'POST':
        const createBody = await UnifiedResponseHandler.parseJsonBody(request);
        const { name, address, location, district, type, grades, contactInfo } = createBody;

        if (!name || !address || !district || !type || !grades || !contactInfo) {
          throw Errors.BadRequest('Missing required fields for school creation');
        }

        const newSchool: School = {
          id: uuidv4(),
          name,
          address,
          location,
          district,
          type,
          grades,
          contactInfo,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: currentUserId,
        };

        mockSchools.push(newSchool);

        logger.info('School created successfully', {
          schoolId: newSchool.id,
          name: newSchool.name,
          createdBy: currentUserId,
        });

        return UnifiedResponseHandler.success({
          message: 'School created successfully',
          school: newSchool,
        });

      case 'PUT':
        if (!schoolId) {
          throw Errors.BadRequest('School ID is required for updates');
        }

        const updateBody = await UnifiedResponseHandler.parseJsonBody(request);
        const schoolIndex = mockSchools.findIndex((s) => s.id === schoolId);

        if (schoolIndex === -1) {
          throw Errors.NotFound('School not found');
        }

        const existingSchool = mockSchools[schoolIndex];
        const updatedSchool: School = {
          ...existingSchool,
          ...updateBody,
          updatedAt: new Date(),
          updatedBy: currentUserId,
        };

        mockSchools[schoolIndex] = updatedSchool;

        logger.info('School updated successfully', {
          schoolId,
          updatedBy: currentUserId,
        });

        return UnifiedResponseHandler.success({
          message: 'School updated successfully',
          school: updatedSchool,
        });

      case 'DELETE':
        if (!schoolId) {
          throw Errors.BadRequest('School ID is required for deletion');
        }

        const deleteIndex = mockSchools.findIndex((s) => s.id === schoolId);

        if (deleteIndex === -1) {
          throw Errors.NotFound('School not found');
        }

        // Soft delete by setting isActive to false
        mockSchools[deleteIndex] = {
          ...mockSchools[deleteIndex],
          isActive: false,
          updatedAt: new Date(),
          updatedBy: currentUserId,
        };

        logger.info('School deleted successfully', {
          schoolId,
          deletedBy: currentUserId,
        });

        return UnifiedResponseHandler.success({
          message: 'School deleted successfully',
        });

      default:
        throw Errors.BadRequest(`Method ${method} not supported`);
    }
  } catch (error) {
    logger.error('Error in admin school management function', { error });
    return handleError(error, request);
  }
}

// Register the function with middleware composition
app.http('admin-school-management', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  route: 'admin/schools',
  authLevel: 'anonymous',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    authenticate,
    hasRole('group_admin' as UserRole),
  )(adminSchoolManagementHandler),
});

export default adminSchoolManagementHandler;
