import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ApiResponse, AuthResponse } from '@vcarpool/shared';
import { compose, cors, errorHandler } from '../../middleware';
import { container } from '../../container';

async function refreshTokenHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Parse request body
    const body = await request.json() as { refreshToken?: string };
    const { refreshToken } = body;
    
    if (!refreshToken) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Refresh token is required'
        } as ApiResponse
      };
    }
    
    const authService = container.authService;
    
    // Verify and refresh the token
    const { accessToken, user } = await authService.refreshAccessToken(refreshToken);
    
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          user,
          token: accessToken,
          refreshToken // Return the same refresh token
        },
        message: 'Token refreshed successfully'
      } as ApiResponse<AuthResponse>
    };
  } catch (error) {
    context.error('Error refreshing token:', error);
    return {
      status: 401,
      jsonBody: {
        success: false,
        error: 'Invalid or expired refresh token'
      } as ApiResponse
    };
  }
}

app.http('auth-refresh-token', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/refresh-token',
  handler: compose(
    cors,
    errorHandler
  )(refreshTokenHandler)
});
