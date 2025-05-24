"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containers = exports.database = exports.cosmosClient = void 0;
exports.initializeDatabase = initializeDatabase;
const cosmos_1 = require("@azure/cosmos");
const endpoint = process.env.COSMOS_DB_ENDPOINT || '';
const key = process.env.COSMOS_DB_KEY || '';
const databaseId = process.env.COSMOS_DB_DATABASE_ID || 'vcarpool';
exports.cosmosClient = new cosmos_1.CosmosClient({ endpoint, key });
exports.database = exports.cosmosClient.database(databaseId);
// Container references
exports.containers = {
    users: exports.database.container('users'),
    trips: exports.database.container('trips'),
    schedules: exports.database.container('schedules'),
    swapRequests: exports.database.container('swap-requests'),
    emailTemplates: exports.database.container('email-templates')
};
// Initialize database and containers
async function initializeDatabase() {
    try {
        // Create database if it doesn't exist
        await exports.cosmosClient.databases.createIfNotExists({ id: databaseId });
        // Create containers if they don't exist
        await exports.database.containers.createIfNotExists({
            id: 'users',
            partitionKey: '/id'
        });
        await exports.database.containers.createIfNotExists({
            id: 'trips',
            partitionKey: '/driverId'
        });
        await exports.database.containers.createIfNotExists({
            id: 'schedules',
            partitionKey: '/userId'
        });
        await exports.database.containers.createIfNotExists({
            id: 'swap-requests',
            partitionKey: '/requesterId'
        });
        await exports.database.containers.createIfNotExists({
            id: 'email-templates',
            partitionKey: '/id'
        });
        console.log('Database and containers initialized successfully');
    }
    catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}
//# sourceMappingURL=database.js.map