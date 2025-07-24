import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import 'reflect-metadata';
import { container } from '../../container';
import { registerSchema, User, Child } from '@carpool/shared';
import { compose, validateBody, requestId, requestLogging } from '../../middleware';
import { userDomainService } from '../../services/domains/user-domain.service';
import { handleError } from '../../utils/error-handler';
import { ILogger } from '../../utils/logger';
import { FamilyService } from '../../services/family.service';
import { ChildService } from '../../services/child.service';

async function registerHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>('ILogger');
  const familyService = container.resolve<FamilyService>('FamilyService');
  const childService = container.resolve<ChildService>('ChildService');

  try {
    const { user: userData, family: familyData } = request.validated!.body;

    // 1. Create the user using unified domain service
    const registerResult = await userDomainService.registerUser({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      password: userData.password,
      phoneNumber: userData.phoneNumber,
    });

    if (!registerResult.success || !registerResult.user) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: registerResult.message || 'Registration failed',
        },
      };
    }

    const user = registerResult.user;

    // 2. Create the family and children, linking them to the user
    const family = await familyService.createFamilyForUser(familyData, user.id);

    // This is a simplified approach. A more robust solution would involve a transaction.
    const children: Child[] = [];
    for (const childData of familyData.children) {
      const child = await childService.createChild(childData, family.id, user.id);
      children.push(child);
    }

    logger.info('User and family registered successfully', {
      userId: user.id,
      familyId: family.id,
    });

    return {
      status: 201,
      jsonBody: {
        success: true,
        message: 'Registration successful',
        data: {
          user,
          family: {
            ...family,
            children,
          },
        },
      },
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http('auth-register', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/register',
  handler: compose(requestId, requestLogging, validateBody(registerSchema))(registerHandler),
});
