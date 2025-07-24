import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { cosmosClient, database } from '../../config/database';

async function testDbHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    context.log('Testing database connection...');

    // Test 1: Client connection
    const dbList = await cosmosClient.databases.readAll().fetchAll();
    context.log('Databases found:', dbList.resources.length);

    // Test 2: Database access
    const containerList = await database.containers.readAll().fetchAll();
    context.log('Containers found:', containerList.resources.length);

    // Test 3: Simple query on users container
    const usersContainer = database.container('users');
    const query = 'SELECT VALUE COUNT(1) FROM c';
    const { resources } = await usersContainer.items.query(query).fetchAll();
    const userCount = resources[0] || 0;
    context.log('User count:', userCount);

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          databases: dbList.resources.length,
          containers: containerList.resources.length,
          userCount: userCount,
          endpoint: process.env.COSMOS_DB_ENDPOINT,
          databaseId: process.env.COSMOS_DB_DATABASE_ID,
        },
      },
    };
  } catch (error) {
    context.log('Database test error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
  }
}

app.http('test-db', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'test-db',
  handler: testDbHandler,
});
