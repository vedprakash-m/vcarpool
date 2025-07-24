const { app } = require('@azure/functions');

app.http('auth-login-legacy', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    context.log('Legacy login endpoint called');

    return {
      status: 200,
      jsonBody: {
        message: 'Legacy login endpoint - deprecated',
        status: 'deprecated',
      },
    };
  },
});
