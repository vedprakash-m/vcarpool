/**
 * Database Reset Script for E2E Tests
 * Resets the test database to a clean state
 */

const { MongoClient } = require('mongodb');

const MONGODB_URL =
  process.env.MONGODB_URL ||
  'mongodb://testuser:testpass@localhost:27018/carpool_test?authSource=admin';

async function resetDatabase() {
  console.log('🔄 Starting database reset...');

  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    const db = client.db('carpool_test');

    // Get all collections
    const collections = await db.listCollections().toArray();

    // Drop all collections
    for (const collection of collections) {
      try {
        await db.collection(collection.name).drop();
        console.log(`  ✓ Dropped collection: ${collection.name}`);
      } catch (error) {
        if (error.message.includes('ns not found')) {
          console.log(`  ⚠ Collection ${collection.name} not found (already dropped)`);
        } else {
          console.error(`  ❌ Failed to drop collection ${collection.name}:`, error.message);
        }
      }
    }

    // Recreate collections with proper indexes
    await createCollections(db);

    console.log('✅ Database reset completed successfully');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function createCollections(db) {
  console.log('📦 Creating collections with indexes...');

  // Users collection
  await db.createCollection('users');
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ role: 1 });
  console.log('  ✓ Created users collection');

  // Families collection
  await db.createCollection('families');
  await db.collection('families').createIndex({ parentId: 1 });
  console.log('  ✓ Created families collection');

  // Children collection
  await db.createCollection('children');
  await db.collection('children').createIndex({ familyId: 1 });
  await db.collection('children').createIndex({ school: 1 });
  console.log('  ✓ Created children collection');

  // Carpool groups collection
  await db.createCollection('carpoolGroups');
  await db.collection('carpoolGroups').createIndex({ createdBy: 1 });
  await db.collection('carpoolGroups').createIndex({ status: 1 });
  await db.collection('carpoolGroups').createIndex({ destination: 1 });
  console.log('  ✓ Created carpoolGroups collection');

  // Join requests collection
  await db.createCollection('joinRequests');
  await db.collection('joinRequests').createIndex({ groupId: 1 });
  await db.collection('joinRequests').createIndex({ requesterId: 1 });
  await db.collection('joinRequests').createIndex({ status: 1 });
  console.log('  ✓ Created joinRequests collection');

  // Notifications collection
  await db.createCollection('notifications');
  await db.collection('notifications').createIndex({ recipientId: 1 });
  await db.collection('notifications').createIndex({ createdAt: -1 });
  console.log('  ✓ Created notifications collection');

  // Schools collection
  await db.createCollection('schools');
  await db.collection('schools').createIndex({ name: 1 });
  await db.collection('schools').createIndex({ active: 1 });
  console.log('  ✓ Created schools collection');

  // Audit logs collection
  await db.createCollection('auditLogs');
  await db.collection('auditLogs').createIndex({ userId: 1 });
  await db.collection('auditLogs').createIndex({ action: 1 });
  await db.collection('auditLogs').createIndex({ timestamp: -1 });
  console.log('  ✓ Created auditLogs collection');
}

// Run reset if called directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('🎉 Database reset completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database reset failed:', error);
      process.exit(1);
    });
}

module.exports = { resetDatabase };
