import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { registerSchema, ApiResponse, AuthResponse } from '@vcarpool/shared';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { compose, cors, errorHandler, validateBody } from '../../middleware';

async function registerHandler(
  request: HttpRequest & { validatedBody: any },
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { email, password, firstName, lastName, phoneNumber, department } = request.validatedBody;

  // Check if user already exists
  const existingUser = await UserService.getUserByEmail(email);
  if (existingUser) {
    return {
      status: 409,
      jsonBody: {
        success: false,
        error: 'User with this email already exists'
      } as ApiResponse
    };
  }

  // Hash password
  const passwordHash = await AuthService.hashPassword(password);

  // Create user
  const user = await UserService.createUser({
    email,
    passwordHash,
    firstName,
    lastName,
    phoneNumber,
    department
  });

  // Generate tokens
  const accessToken = AuthService.generateAccessToken(user);
  const refreshToken = AuthService.generateRefreshToken(user);

  return {
    status: 201,
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

export default compose(
  cors,
  errorHandler,
  validateBody(registerSchema)
)(registerHandler);

app.http('auth-register', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/register',
  handler: compose(
    cors,
    errorHandler,
    validateBody(registerSchema)
  )(registerHandler)
});
