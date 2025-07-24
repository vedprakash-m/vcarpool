import { DatabaseService, databaseService, User } from '../../services/database.service';
import { configService } from '../../services/config.service';
import { UserEntity } from '@carpool/shared';

// Test fixture factory
function createTestUserData(
  overrides: Partial<Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'parent',
    authProvider: 'legacy',
    isActive: true,
    emailVerified: false,
    phoneVerified: false,
    emergencyContacts: [],
    groupMemberships: [],
    addressVerified: false,
    isActiveDriver: false,
    preferences: {
      isDriver: false,
      notifications: {
        email: true,
        sms: false,
        tripReminders: true,
        swapRequests: true,
        scheduleChanges: true,
      },
    },
    loginAttempts: 0,
    ...overrides,
  };
}

// Mock the Azure Cosmos SDK
jest.mock('@azure/cosmos', () => ({
  CosmosClient: jest.fn().mockImplementation(() => ({
    databases: {
      createIfNotExists: jest.fn().mockImplementation(() => ({
        database: {
          containers: {
            createIfNotExists: jest.fn().mockImplementation(() => ({
              container: {
                items: {
                  create: jest.fn(),
                  query: jest.fn().mockReturnValue({
                    fetchAll: jest.fn(),
                  }),
                },
                item: jest.fn().mockReturnValue({
                  replace: jest.fn(),
                  delete: jest.fn(),
                }),
              },
            })),
          },
        },
      })),
    },
  })),
}));

// Mock configService
jest.mock('../../services/config.service', () => ({
  configService: {
    shouldUseRealDatabase: jest.fn(),
    getConfig: jest.fn().mockReturnValue({
      cosmosDb: {
        endpoint: 'https://test.documents.azure.com:443/',
        key: 'test-key',
        databaseName: 'test-db',
        containerName: 'test-container',
      },
      auth: {
        bcryptRounds: 12,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
      },
    }),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockConfigService: jest.Mocked<typeof configService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = configService as jest.Mocked<typeof configService>;

    // Reset singleton instance
    (DatabaseService as any).instance = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);

      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization - In-Memory Mode', () => {
    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);
      databaseService = DatabaseService.getInstance();
    });

    it('should initialize in-memory storage when real database is not available', () => {
      expect(mockConfigService.shouldUseRealDatabase).toHaveBeenCalled();
    });

    it('should create test users in memory', async () => {
      // Wait a bit for async initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      const user = await databaseService.getUserByEmail('admin@carpool.com');
      expect(user).toBeTruthy();
      expect(user?.firstName).toBe('Admin');
      expect(user?.role).toBe('super_admin');
    });
  });

  describe('Initialization - Cosmos DB Mode', () => {
    it('should initialize Cosmos DB when real database is available', () => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(true);

      const instance = DatabaseService.getInstance();

      expect(instance).toBeDefined();
      expect(mockConfigService.shouldUseRealDatabase).toHaveBeenCalled();
    });

    it('should fall back to in-memory when Cosmos DB initialization fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockConfigService.shouldUseRealDatabase.mockReturnValue(true);

      // Mock Cosmos client to throw error
      const mockCosmosClient = require('@azure/cosmos').CosmosClient;
      mockCosmosClient.mockImplementation(() => {
        throw new Error('Cosmos DB connection failed');
      });

      const instance = DatabaseService.getInstance();

      expect(instance).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize Cosmos DB:', expect.any(Error));
      expect(consoleLogSpy).toHaveBeenCalledWith('Falling back to in-memory storage');

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('User Management - In-Memory Mode', () => {
    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);
      databaseService = DatabaseService.getInstance();
    });

    describe('createUser', () => {
      it('should create a user in memory', async () => {
        const userData = createTestUserData({
          passwordHash: 'hashed-password',
        });

        const user = await databaseService.createUser(userData);

        expect(user).toMatchObject(userData);
        expect(user.id).toBeDefined();
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
      });
    });

    describe('getUserByEmail', () => {
      it('should return user when found', async () => {
        // Wait for test users to be initialized
        await new Promise((resolve) => setTimeout(resolve, 10));

        const user = await databaseService.getUserByEmail('admin@carpool.com');

        expect(user).toBeTruthy();
        expect(user?.email).toBe('admin@carpool.com');
      });

      it('should return null when user not found', async () => {
        const user = await databaseService.getUserByEmail('nonexistent@example.com');

        expect(user).toBeNull();
      });
    });

    describe('updateUser', () => {
      it('should update existing user', async () => {
        // Wait for test users to be initialized
        await new Promise((resolve) => setTimeout(resolve, 10));

        const updates = { firstName: 'Updated' };
        const updatedUser = await databaseService.updateUser('admin@carpool.com', updates);

        expect(updatedUser).toBeTruthy();
        expect(updatedUser?.firstName).toBe('Updated');
        expect(updatedUser?.updatedAt).toBeDefined();
      });

      it('should return null when user does not exist', async () => {
        const updates = { firstName: 'Updated' };
        const result = await databaseService.updateUser('nonexistent@example.com', updates);

        expect(result).toBeNull();
      });
    });

    describe('deleteUser', () => {
      it('should delete existing user', async () => {
        // Wait for test users to be initialized
        await new Promise((resolve) => setTimeout(resolve, 10));

        const result = await databaseService.deleteUser('admin@carpool.com');

        expect(result).toBe(true);

        // Verify user is deleted
        const user = await databaseService.getUserByEmail('admin@carpool.com');
        expect(user).toBeNull();
      });

      it('should return false when user does not exist', async () => {
        const result = await databaseService.deleteUser('nonexistent@example.com');

        expect(result).toBe(false);
      });
    });
  });

  describe('User Management - Cosmos DB Mode', () => {
    let mockContainer: any;
    let mockCosmosClient: any;

    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(true);

      // Setup mock container
      mockContainer = {
        items: {
          create: jest.fn(),
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn(),
          }),
        },
        item: jest.fn().mockReturnValue({
          replace: jest.fn(),
          delete: jest.fn(),
        }),
      };

      // Setup mock Cosmos client
      mockCosmosClient = require('@azure/cosmos').CosmosClient;
      mockCosmosClient.mockImplementation(() => ({
        databases: {
          createIfNotExists: jest.fn().mockResolvedValue({
            database: {
              containers: {
                createIfNotExists: jest.fn().mockResolvedValue({
                  container: mockContainer,
                }),
              },
            },
          }),
        },
      }));

      databaseService = DatabaseService.getInstance();
    });

    describe('createUser', () => {
      it('should create user in Cosmos DB', async () => {
        const userData = createTestUserData({
          passwordHash: 'hashed-password',
        });

        const mockCreatedUser = { ...userData, id: 'generated-id' };
        mockContainer.items.create.mockResolvedValue({ resource: mockCreatedUser });

        const user = await databaseService.createUser(userData);

        expect(mockContainer.items.create).toHaveBeenCalledWith(expect.objectContaining(userData));
        expect(user).toEqual(mockCreatedUser);
      });

      it('should handle Cosmos DB creation errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const userData = createTestUserData({
          passwordHash: 'hashed-password',
        });

        mockContainer.items.create.mockRejectedValue(new Error('Cosmos DB error'));

        await expect(databaseService.createUser(userData)).rejects.toThrow('Failed to create user');
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error creating user in Cosmos DB:',
          expect.any(Error),
        );

        consoleSpy.mockRestore();
      });
    });

    describe('getUserByEmail', () => {
      it('should fetch user from Cosmos DB', async () => {
        const mockUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [mockUser] });

        const user = await databaseService.getUserByEmail('test@example.com');

        expect(user).toEqual(mockUser);
      });

      it('should return null when user not found in Cosmos DB', async () => {
        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [] });

        const user = await databaseService.getUserByEmail('nonexistent@example.com');

        expect(user).toBeNull();
      });

      it('should handle Cosmos DB query errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        mockContainer.items.query().fetchAll.mockRejectedValue(new Error('Query failed'));

        const user = await databaseService.getUserByEmail('test@example.com');

        expect(user).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching user from Cosmos DB:',
          expect.any(Error),
        );

        consoleSpy.mockRestore();
      });
    });

    describe('updateUser', () => {
      it('should update user in Cosmos DB', async () => {
        const existingUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
        const updates = { firstName: 'Updated' };
        const updatedUser = { ...existingUser, ...updates };

        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [existingUser] });
        mockContainer.item().replace.mockResolvedValue({ resource: updatedUser });

        const result = await databaseService.updateUser('test@example.com', updates);

        expect(result).toEqual(updatedUser);
        expect(mockContainer.item).toHaveBeenCalledWith('1', 'test@example.com');
      });

      it('should handle Cosmos DB update errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const existingUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [existingUser] });
        mockContainer.item().replace.mockRejectedValue(new Error('Update failed'));

        const result = await databaseService.updateUser('test@example.com', {
          firstName: 'Updated',
        });

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error updating user in Cosmos DB:',
          expect.any(Error),
        );

        consoleSpy.mockRestore();
      });
    });

    describe('deleteUser', () => {
      it('should delete user from Cosmos DB', async () => {
        const existingUser = { id: '1', email: 'test@example.com', firstName: 'Test' };

        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [existingUser] });
        mockContainer.item().delete.mockResolvedValue({});

        const result = await databaseService.deleteUser('test@example.com');

        expect(result).toBe(true);
        expect(mockContainer.item).toHaveBeenCalledWith('1', 'test@example.com');
      });

      it('should handle Cosmos DB delete errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const existingUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [existingUser] });
        mockContainer.item().delete.mockRejectedValue(new Error('Delete failed'));

        const result = await databaseService.deleteUser('test@example.com');

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error deleting user from Cosmos DB:',
          expect.any(Error),
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Login Attempt Management', () => {
    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);
      databaseService = DatabaseService.getInstance();
    });

    describe('recordLoginAttempt', () => {
      it('should record first login attempt', async () => {
        await databaseService.recordLoginAttempt('test@example.com');

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });

      it('should increment existing attempts', async () => {
        // Record multiple attempts
        await databaseService.recordLoginAttempt('test@example.com');
        await databaseService.recordLoginAttempt('test@example.com');
        await databaseService.recordLoginAttempt('test@example.com');

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });

      it('should lock account after max attempts', async () => {
        // Record max attempts (5 by default)
        for (let i = 0; i < 5; i++) {
          await databaseService.recordLoginAttempt('test@example.com');
        }

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(true);
      });
    });

    describe('clearLoginAttempts', () => {
      it('should clear login attempts for user', async () => {
        await databaseService.recordLoginAttempt('test@example.com');
        await databaseService.clearLoginAttempts('test@example.com');

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });
    });

    describe('isAccountLocked', () => {
      it('should return false when no attempts recorded', async () => {
        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });

      it('should return false when account is not locked', async () => {
        await databaseService.recordLoginAttempt('test@example.com');

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });

      it('should return true when account is locked', async () => {
        // Lock the account
        for (let i = 0; i < 5; i++) {
          await databaseService.recordLoginAttempt('test@example.com');
        }

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(true);
      });

      it('should clear expired locks', async () => {
        // Manually set an expired lock
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - 20); // 20 minutes ago

        await databaseService.recordLoginAttempt('test@example.com');
        // Access internal state to set expired lock
        const loginAttempts = (databaseService as any).loginAttempts;
        const attempt = loginAttempts.get('test@example.com');
        if (attempt) {
          attempt.lockedUntil = pastDate;
          attempt.attempts = 5;
        }

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      (DatabaseService as any).instance = undefined;
      jest.clearAllMocks();
    });

    describe('getLoginAttempts', () => {
      it('should return login attempts count', async () => {
        databaseService = DatabaseService.getInstance();

        await databaseService.recordLoginAttempt('test@example.com');
        await databaseService.recordLoginAttempt('test@example.com');

        const attempts = await databaseService.getLoginAttempts('test@example.com');
        expect(attempts).toBe(2);
      });

      it('should return 0 for user with no attempts', async () => {
        databaseService = DatabaseService.getInstance();

        const attempts = await databaseService.getLoginAttempts('noattempts@example.com');
        expect(attempts).toBe(0);
      });
    });

    describe('isUsingRealDatabase', () => {
      it('should return false when using in-memory storage', () => {
        databaseService = DatabaseService.getInstance();
        expect(databaseService.isUsingRealDatabase()).toBe(false);
      });
    });

    describe('healthCheck', () => {
      it('should return health status for in-memory mode', async () => {
        databaseService = DatabaseService.getInstance();

        const health = await databaseService.healthCheck();

        expect(health).toEqual({
          status: 'healthy',
          database: 'in-memory',
          userCount: expect.any(Number),
        });
      });
    });

    describe('getDefaultContainer', () => {
      it('should return undefined when using in-memory storage', () => {
        databaseService = DatabaseService.getInstance();
        expect(databaseService.getDefaultContainer()).toBeUndefined();
      });
    });
  });
});
