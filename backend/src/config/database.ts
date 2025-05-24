import { CosmosClient } from '@azure/cosmos';

const endpoint = process.env.COSMOS_DB_ENDPOINT || '';
const key = process.env.COSMOS_DB_KEY || '';
const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'vcarpool';

export const cosmosClient = new CosmosClient({ endpoint, key });
export const database = cosmosClient.database(databaseId);

// Container references
export const containers = {
  users: database.container('users'),
  trips: database.container('trips'),
  schedules: database.container('schedules'),
  swapRequests: database.container('swap-requests'),
  emailTemplates: database.container('email-templates')
};

// Initialize database and containers
export async function initializeDatabase() {
  try {
    // Create database if it doesn't exist
    await cosmosClient.databases.createIfNotExists({ id: databaseId });
    
    // Create containers if they don't exist
    await database.containers.createIfNotExists({
      id: 'users',
      partitionKey: '/id'
    });
    
    await database.containers.createIfNotExists({
      id: 'trips',
      partitionKey: '/driverId'
    });
    
    await database.containers.createIfNotExists({
      id: 'schedules',
      partitionKey: '/userId'
    });
    
    await database.containers.createIfNotExists({
      id: 'swap-requests',
      partitionKey: '/requesterId'
    });
    
    await database.containers.createIfNotExists({
      id: 'email-templates',
      partitionKey: '/id'
    });
    
    console.log('Database and containers initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
