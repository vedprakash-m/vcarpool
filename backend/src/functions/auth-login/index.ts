import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import 'reflect-metadata';
import { container } from '../../container';
import { loginSchema } from '@carpool/shared';
import { compose, validateBody, requestId, requestLogging } from '../../middleware';
import { LoginUseCase } from '../../core/auth/usecases/LoginUseCase';
import { handleError } from '../../utils/error-handler';
import { ILogger } from '../../utils/logger';

async function loginHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>('ILogger');
  const loginUseCase = container.resolve<LoginUseCase>('LoginUseCase');

  try {
    const { email, password } = request.validated!.body;

    const authResult = await loginUseCase.execute(email, password);

    if (!authResult.success || !authResult.user || !authResult.token) {
      return {
        status: 401,
        jsonBody: {
          success: false,
          message: authResult.message || 'Authentication failed',
        },
      };
    }

    logger.info(`User logged in successfully`, { userId: authResult.user.id });

    return {
      jsonBody: {
        success: true,
        message: 'Login successful',
        data: {
          user: authResult.user,
          accessToken: authResult.token,
          refreshToken: authResult.refreshToken,
        },
      },
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http('auth-login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: compose(requestId, requestLogging, validateBody(loginSchema))(loginHandler),
});
