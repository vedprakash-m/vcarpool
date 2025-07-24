/**
 * Admin Create User
 *
 * Migrated from JavaScript to TypeScript
 * Uses UserDomainService for unified user management
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  hasRole,
  corsMiddleware,
  validateBody,
} from '../src/middleware';
import { container } from '../src/container';
import { UserDomainService } from '../src/services/domains/user-domain.service';
import { UnifiedResponseHandler } from '../src/utils/unified-response.service';
import { UserRole, CreateUserRequest } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { ILogger } from '../src/utils/logger';
import { z } from 'zod';

// Validation schema for user creation
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['super_admin', 'group_admin', 'parent', 'student']),
  phoneNumber: z.string().optional(),
  homeAddress: z.string().optional(),
  isActiveDriver: z.boolean().optional(),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  preferences: z
    .object({
      maxWaitTime: z.number().min(0).max(60).optional(),
      maxDetour: z.number().min(0).max(30).optional(),
      driverAvailability: z.array(z.string()).optional(),
    })
    .optional(),
});

// Handler function
async function adminCreateUserHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>('ILogger').child({ requestId: request.requestId });
  const userDomainService = container.resolve<UserDomainService>('UserDomainService');

  try {
    const currentUserId = request.auth!.userId; // Ensured by authenticate middleware
    const body = await UnifiedResponseHandler.parseJsonBody(request);

    logger.info('Admin create user request', { currentUserId, targetUser: body.email });

    // Validate required fields
    const validationResult = CreateUserSchema.safeParse(body);
    if (!validationResult.success) {
      throw Errors.ValidationError('Invalid user data', validationResult.error.errors);
    }

    const userData = validationResult.data;

    // Check if user already exists
    const existingUser = await userDomainService.getUserByEmail(userData.email);
    if (existingUser.success) {
      throw Errors.Conflict('User with this email already exists');
    }

    // Create user request
    const createUserRequest: CreateUserRequest = {
      email: userData.email,
      password: userData.password || undefined, // Will be auto-generated if not provided
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      phoneNumber: userData.phoneNumber,
      homeAddress: userData.homeAddress,
      isActiveDriver: userData.isActiveDriver || false,
      emergencyContact: userData.emergencyContact,
      preferences: userData.preferences,
      createdBy: currentUserId,
      authProvider: 'legacy', // Admin-created users use legacy auth
    };

    // Create the user
    const result = await userDomainService.createUser(createUserRequest);

    if (!result.success) {
      throw Errors.BadRequest(result.message || 'Failed to create user');
    }

    // Log successful creation
    logger.info('User created successfully', {
      createdUserId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      createdBy: currentUserId,
    });

    // Return success response (without sensitive data)
    return UnifiedResponseHandler.success({
      message: 'User created successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        isActive: result.user.isActive,
        createdAt: result.user.createdAt,
      },
      // Include temporary password info if generated
      ...(result.temporaryPassword && {
        temporaryPassword: result.temporaryPassword,
        passwordChangeRequired: true,
      }),
    });
  } catch (error) {
    logger.error('Error in admin create user function', { error });
    return handleError(error, request);
  }
}

// Register the function with middleware composition
const composedHandler = compose(
  requestId,
  requestLogging,
  corsMiddleware,
  authenticate,
  hasRole('group_admin' as UserRole),
  validateBody(CreateUserSchema),
  adminCreateUserHandler,
);

app.http('admin-create-user', {
  methods: ['POST'],
  route: 'admin/users',
  authLevel: 'anonymous',
  handler: composedHandler,
});

export default adminCreateUserHandler;
