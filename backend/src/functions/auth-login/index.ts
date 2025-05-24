import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { loginSchema, ApiResponse, AuthResponse } from '@vcarpool/shared';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { compose, cors, errorHandler, validateBody } from '../../middleware';

async function loginHandler(
  request: HttpRequest & { validatedBody: any },
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { email, password } = request.validatedBody;

  // Find user by email
  const userWithPassword = await UserService.getUserByEmail(email);
  if (!userWithPassword) {
    return {
      status: 401,
      jsonBody: {
        success: false,
        error: 'Invalid email or password'
      } as ApiResponse
    };
  }

  // Verify password
  const isPasswordValid = await AuthService.verifyPassword(password, userWithPassword.passwordHash);
  if (!isPasswordValid) {
    return {
      status: 401,
      jsonBody: {
        success: false,
        error: 'Invalid email or password'
      } as ApiResponse
    };
  }

  // Remove password hash from user object
  const { passwordHash, ...user } = userWithPassword;

  // Generate tokens
  const accessToken = AuthService.generateAccessToken(user);
  const refreshToken = AuthService.generateRefreshToken(user);

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: {
        user,
        token: accessToken,
        refreshToken
      }
    } as ApiResponse<AuthResponse>
  };
}

app.http('auth-login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: compose(
    cors,
    errorHandler,
    validateBody(loginSchema)
  )(loginHandler)
});
