import { CosmosClient } from '@azure/cosmos';

const endpoint = process.env.COSMOS_DB_ENDPOINT || '';
const key = process.env.COSMOS_DB_KEY || '';
const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'carpool';

export const cosmosClient = new CosmosClient({ endpoint, key });
export const database = cosmosClient.database(databaseId);

// Container names
const CONTAINER_NAMES = {
  users: 'users',
  trips: 'trips',
  schedules: 'schedules',
  swapRequests: 'swapRequests',
  emailTemplates: 'email-templates',
  messages: 'messages',
  chats: 'chats',
  chatParticipants: 'chatParticipants',
  notifications: 'notifications',
  weeklyPreferences: 'weeklyPreferences',
};

// Container references
export const containers = {
  users: database.container(CONTAINER_NAMES.users),
  trips: database.container(CONTAINER_NAMES.trips),
  schedules: database.container(CONTAINER_NAMES.schedules),
  swapRequests: database.container(CONTAINER_NAMES.swapRequests),
  emailTemplates: database.container(CONTAINER_NAMES.emailTemplates),
  messages: database.container(CONTAINER_NAMES.messages),
  chats: database.container(CONTAINER_NAMES.chats),
  chatParticipants: database.container(CONTAINER_NAMES.chatParticipants),
  notifications: database.container(CONTAINER_NAMES.notifications),
  weeklyPreferences: database.container(CONTAINER_NAMES.weeklyPreferences),
};

// Initialize database and containers
export async function initializeDatabase() {
  try {
    // Create database if it doesn't exist
    await cosmosClient.databases.createIfNotExists({ id: databaseId });

    // Create containers if they don't exist
    await database.containers.createIfNotExists({
      id: CONTAINER_NAMES.users,
      partitionKey: '/id',
    });

    await database.containers.createIfNotExists({
      id: CONTAINER_NAMES.trips,
      partitionKey: '/driverId',
    });

    await database.containers.createIfNotExists({
      id: CONTAINER_NAMES.schedules,
      partitionKey: '/userId',
    });

    await database.containers.createIfNotExists({
      id: CONTAINER_NAMES.swapRequests,
      partitionKey: '/requesterId',
    });

    await database.containers.createIfNotExists({
      id: CONTAINER_NAMES.emailTemplates,
      partitionKey: '/id',
    });

    await database.containers.createIfNotExists({
      id: CONTAINER_NAMES.messages,
      partitionKey: '/id',
    });

    await database.containers.createIfNotExists({
      id: CONTAINER_NAMES.chats,
      partitionKey: '/id',
    });

    await database.containers.createIfNotExists({
      id: CONTAINER_NAMES.chatParticipants,
      partitionKey: '/id',
    });

    await database.containers.createIfNotExists({
      id: CONTAINER_NAMES.notifications,
      partitionKey: '/id',
    });

    await database.containers.createIfNotExists({
      id: CONTAINER_NAMES.weeklyPreferences,
      partitionKey: '/driverParentId',
    });

    console.log('Database and containers initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
