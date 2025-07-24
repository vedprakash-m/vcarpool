/**
 * Database Seeding Script for E2E Tests
 * Seeds the test database with initial data for consistent testing
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGODB_URL =
  process.env.MONGODB_URL ||
  'mongodb://testuser:testpass@localhost:27018/carpool_test?authSource=admin';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    const db = client.db('carpool_test');

    // Clear existing test data
    await clearCollections(db);

    // Seed users
    await seedUsers(db);

    // Seed schools
    await seedSchools(db);

    // Seed carpool groups
    await seedCarpoolGroups(db);

    // Seed join requests
    await seedJoinRequests(db);

    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function clearCollections(db) {
  console.log('🧹 Clearing existing collections...');

  const collections = [
    'users',
    'families',
    'children',
    'carpoolGroups',
    'trips',
    'joinRequests',
    'notifications',
  ];

  for (const collection of collections) {
    try {
      await db.collection(collection).deleteMany({});
      console.log(`  ✓ Cleared ${collection}`);
    } catch (error) {
      console.log(`  ⚠ Could not clear ${collection}:`, error.message);
    }
  }
}

async function seedUsers(db) {
  console.log('👥 Seeding users...');

  const saltRounds = 10;

  const users = [
    {
      id: 'user_admin_1',
      email: 'test.admin@example.com',
      passwordHash: await bcrypt.hash('testpass123', saltRounds),
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      phoneNumber: '+15551234567',
      isActiveDriver: false,
      emailVerified: true,
      phoneVerified: true,
      registrationComplete: true,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'user_parent_1',
      email: 'test.parent1@example.com',
      passwordHash: await bcrypt.hash('testpass123', saltRounds),
      firstName: 'Test',
      lastName: 'Parent One',
      role: 'parent',
      phoneNumber: '+15559876543',
      isActiveDriver: true,
      emailVerified: true,
      phoneVerified: true,
      registrationComplete: true,
      homeAddress: {
        street: '123 Test Street',
        city: 'Redmond',
        state: 'WA',
        zipCode: '98052',
        verified: true,
      },
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: true,
        },
        isDriver: true,
        smokingAllowed: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'user_parent_2',
      email: 'test.parent2@example.com',
      passwordHash: await bcrypt.hash('testpass123', saltRounds),
      firstName: 'Test',
      lastName: 'Parent Two',
      role: 'parent',
      phoneNumber: '+15556789012',
      isActiveDriver: false,
      emailVerified: true,
      phoneVerified: true,
      registrationComplete: true,
      homeAddress: {
        street: '456 Example Ave',
        city: 'Redmond',
        state: 'WA',
        zipCode: '98052',
        verified: true,
      },
      preferences: {
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
        isDriver: false,
        smokingAllowed: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  await db.collection('users').insertMany(users);
  console.log(`  ✓ Seeded ${users.length} users`);
}

async function seedSchools(db) {
  console.log('🏫 Seeding schools...');

  const schools = [
    {
      id: 'school_tesla_stem',
      name: 'Tesla STEM High School',
      address: '42005 SE 41st St, Redmond, WA 98052',
      type: 'high_school',
      grades: ['9', '10', '11', '12'],
      district: 'Lake Washington School District',
      active: true,
    },
    {
      id: 'school_redmond_elementary',
      name: 'Redmond Elementary School',
      address: '16800 NE 80th St, Redmond, WA 98052',
      type: 'elementary',
      grades: ['K', '1', '2', '3', '4', '5'],
      district: 'Lake Washington School District',
      active: true,
    },
  ];

  await db.collection('schools').insertMany(schools);
  console.log(`  ✓ Seeded ${schools.length} schools`);
}

async function seedCarpoolGroups(db) {
  console.log('🚗 Seeding carpool groups...');

  const groups = [
    {
      id: 'group_morning_tesla',
      title: 'Morning Tesla STEM Carpool',
      destination: 'Tesla STEM High School',
      createdBy: 'user_parent_1',
      participants: ['user_parent_1'],
      maxCapacity: 4,
      currentParticipants: 1,
      schedule: {
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        departureTime: '07:30',
        returnTime: '15:30',
      },
      costPerSeat: 5.0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'group_afternoon_tesla',
      title: 'Afternoon Tesla STEM Pickup',
      destination: 'Tesla STEM High School',
      createdBy: 'user_parent_2',
      participants: ['user_parent_2'],
      maxCapacity: 3,
      currentParticipants: 1,
      schedule: {
        days: ['monday', 'wednesday', 'friday'],
        departureTime: '15:30',
        returnTime: '16:00',
      },
      costPerSeat: 3.0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  await db.collection('carpoolGroups').insertMany(groups);
  console.log(`  ✓ Seeded ${groups.length} carpool groups`);
}

async function seedJoinRequests(db) {
  console.log('📋 Seeding join requests...');

  const joinRequests = [
    {
      id: 'request_1',
      groupId: 'group_morning_tesla',
      requesterId: 'user_parent_2',
      status: 'pending',
      requestMessage: 'Would like to join the morning carpool group for my child.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  await db.collection('joinRequests').insertMany(joinRequests);
  console.log(`  ✓ Seeded ${joinRequests.length} join requests`);
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Database seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
