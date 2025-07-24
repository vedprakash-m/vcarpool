/**
 * Database Service for Carpool Application
 * Provides unified interface for Cosmos DB and in-memory storage
 * Updated to use unified UserEntity from shared/entities
 */

import { CosmosClient, Container, Database } from '@azure/cosmos';
import { configService } from './config.service';
import * as bcrypt from 'bcrypt';
import { UserEntity, GroupEntity } from '@carpool/shared';

// Use unified entity as the database interface
export type User = UserEntity;

export interface LoginAttempt {
  email: string;
  attempts: number;
  lockedUntil?: Date;
  lastAttempt: Date;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private cosmosClient?: CosmosClient;
  private database?: Database;
  private container?: Container;
  private inMemoryUsers: Map<string, User> = new Map();
  private loginAttempts: Map<string, LoginAttempt> = new Map();
  private useRealDatabase: boolean;

  private constructor() {
    this.useRealDatabase = configService.shouldUseRealDatabase();
    if (this.useRealDatabase) {
      this.initializeCosmosDB();
    } else {
      this.initializeInMemoryStorage();
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async initializeCosmosDB(): Promise<void> {
    try {
      const config = configService.getConfig();
      this.cosmosClient = new CosmosClient({
        endpoint: config.cosmosDb.endpoint,
        key: config.cosmosDb.key,
      });

      // Ensure database and container exist
      const { database } = await this.cosmosClient.databases.createIfNotExists({
        id: config.cosmosDb.databaseName,
      });
      this.database = database;

      const { container } = await this.database.containers.createIfNotExists({
        id: config.cosmosDb.containerName,
        partitionKey: '/email',
      });
      this.container = container;

      console.log('Cosmos DB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Cosmos DB:', error);
      console.log('Falling back to in-memory storage');
      this.useRealDatabase = false;
      this.initializeInMemoryStorage();
    }
  }

  private initializeInMemoryStorage(): void {
    // Initialize with test users matching the unified UserEntity structure
    const testUsers: User[] = [
      {
        id: '1',
        email: 'admin@carpool.com',
        authProvider: 'legacy',
        passwordHash: '', // Will be set below
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        phoneNumber: '+1234567890',
        emergencyContacts: [
          {
            name: 'Emergency Contact',
            phoneNumber: '+1234567899',
            relationship: 'Partner',
            verified: true,
          },
        ],
        familyId: undefined,
        groupMemberships: [],
        homeAddress: '123 Main St, Anytown, USA',
        addressVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        isActiveDriver: false,
        preferences: {
          isDriver: false,
          notifications: {
            email: true,
            sms: true,
            tripReminders: true,
            swapRequests: true,
            scheduleChanges: true,
          },
        },
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        email: 'parent@carpool.com',
        authProvider: 'legacy',
        passwordHash: '', // Will be set below
        firstName: 'John',
        lastName: 'Parent',
        role: 'parent',
        phoneNumber: '+1234567891',
        emergencyContacts: [
          {
            name: 'Jane Parent',
            phoneNumber: '+1234567892',
            relationship: 'Spouse',
            verified: true,
          },
        ],
        familyId: 'family-1',
        groupMemberships: [],
        homeAddress: '456 Oak Ave, Anytown, USA',
        addressVerified: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        isActiveDriver: true,
        preferences: {
          isDriver: true,
          pickupLocation: 'Home',
          dropoffLocation: 'School',
          preferredTime: '08:00',
          smokingAllowed: false,
          notifications: {
            email: true,
            sms: true,
            tripReminders: true,
            swapRequests: true,
            scheduleChanges: true,
          },
        },
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Hash passwords for test users
    const initializeTestUsers = async () => {
      const config = configService.getConfig();
      for (const user of testUsers) {
        if (user.passwordHash !== undefined) {
          user.passwordHash = await bcrypt.hash('password123', config.auth.bcryptRounds);
        }
        this.inMemoryUsers.set(user.email, user);
      }
    };

    initializeTestUsers().catch(console.error);
    console.log('In-memory storage initialized with unified UserEntity test users');
  }

  // User Management Methods
  public async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.useRealDatabase && this.container) {
      try {
        const { resource } = await this.container.items.create(user);
        return resource as User;
      } catch (error) {
        console.error('Error creating user in Cosmos DB:', error);
        throw new Error('Failed to create user');
      }
    } else {
      this.inMemoryUsers.set(user.email, user);
      return user;
    }
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    if (this.useRealDatabase && this.container) {
      try {
        const { resources } = await this.container.items
          .query({
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [{ name: '@email', value: email }],
          })
          .fetchAll();

        return resources.length > 0 ? (resources[0] as User) : null;
      } catch (error) {
        console.error('Error fetching user from Cosmos DB:', error);
        return null;
      }
    } else {
      return this.inMemoryUsers.get(email) || null;
    }
  }

  public async getUserByEntraId(entraId: string): Promise<User | null> {
    if (this.useRealDatabase && this.container) {
      try {
        const { resources } = await this.container.items
          .query({
            query: 'SELECT * FROM c WHERE c.entraObjectId = @entraId',
            parameters: [{ name: '@entraId', value: entraId }],
          })
          .fetchAll();

        return resources.length > 0 ? (resources[0] as User) : null;
      } catch (error) {
        console.error('Error fetching user by Entra ID from Cosmos DB:', error);
        return null;
      }
    } else {
      // Search through in-memory users for Entra ID
      for (const user of this.inMemoryUsers.values()) {
        if ((user as any).entraObjectId === entraId) {
          return user;
        }
      }
      return null;
    }
  }

  /**
   * Get user by ID
   */
  public async getUserById(id: string): Promise<User | null> {
    try {
      if (this.useRealDatabase && this.container) {
        const { resources } = await this.container.items
          .query({
            query: 'SELECT * FROM c WHERE c.id = @id',
            parameters: [{ name: '@id', value: id }],
          })
          .fetchAll();

        return resources.length > 0 ? (resources[0] as User) : null;
      } else {
        // Search through in-memory users for the ID
        for (const user of this.inMemoryUsers.values()) {
          if (user.id === id) {
            return user;
          }
        }
        return null;
      }
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  public async updateUser(email: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };

    if (this.useRealDatabase && this.container) {
      try {
        const { resource } = await this.container.item(user.id, email).replace(updatedUser);
        return resource as User;
      } catch (error) {
        console.error('Error updating user in Cosmos DB:', error);
        return null;
      }
    } else {
      this.inMemoryUsers.set(email, updatedUser);
      return updatedUser;
    }
  }

  /**
   * Update user by ID
   */
  public async updateUserById(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      if (this.useRealDatabase && this.container) {
        const user = await this.getUserById(id);
        if (!user) return null;

        const updatedUser = {
          ...user,
          ...updates,
          updatedAt: new Date(),
        };

        const { resource } = await this.container.item(id, user.email).replace(updatedUser);
        return resource as User;
      } else {
        // Find and update user in in-memory storage
        for (const [email, user] of this.inMemoryUsers.entries()) {
          if (user.id === id) {
            const updatedUser = {
              ...user,
              ...updates,
              updatedAt: new Date(),
            };
            this.inMemoryUsers.set(email, updatedUser);
            return updatedUser;
          }
        }
        return null;
      }
    } catch (error) {
      console.error('Error updating user by ID:', error);
      return null;
    }
  }

  public async deleteUser(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user) return false;

    if (this.useRealDatabase && this.container) {
      try {
        await this.container.item(user.id, email).delete();
        return true;
      } catch (error) {
        console.error('Error deleting user from Cosmos DB:', error);
        return false;
      }
    } else {
      return this.inMemoryUsers.delete(email);
    }
  }

  // Login Attempt Management
  public async recordLoginAttempt(email: string): Promise<void> {
    const config = configService.getConfig();
    const existing = this.loginAttempts.get(email);

    if (existing) {
      existing.attempts += 1;
      existing.lastAttempt = new Date();

      if (existing.attempts >= config.auth.maxLoginAttempts) {
        const lockoutEnd = new Date();
        lockoutEnd.setMinutes(lockoutEnd.getMinutes() + config.auth.lockoutDuration);
        existing.lockedUntil = lockoutEnd;
      }
    } else {
      this.loginAttempts.set(email, {
        email,
        attempts: 1,
        lastAttempt: new Date(),
      });
    }
  }

  public async clearLoginAttempts(email: string): Promise<void> {
    this.loginAttempts.delete(email);
  }

  public async isAccountLocked(email: string): Promise<boolean> {
    const attempt = this.loginAttempts.get(email);
    if (!attempt || !attempt.lockedUntil) return false;

    if (new Date() > attempt.lockedUntil) {
      // Lock has expired, clear attempts
      this.loginAttempts.delete(email);
      return false;
    }

    return true;
  }

  public async getLoginAttempts(email: string): Promise<number> {
    const attempt = this.loginAttempts.get(email);
    return attempt ? attempt.attempts : 0;
  }

  // Group Management Methods
  private inMemoryGroups: Map<string, GroupEntity> = new Map();
  private inMemoryJoinRequests: Map<string, any> = new Map();
  private inMemorySchools: any[] = [
    { id: 'school-1', name: 'Tesla STEM High School', address: '123 Innovation Way, Austin, TX' },
    { id: 'school-2', name: 'Austin High School', address: '456 Education Blvd, Austin, TX' },
  ];

  public async createGroup(groupData: GroupEntity): Promise<GroupEntity> {
    if (this.useRealDatabase && this.container) {
      try {
        const { resource } = await this.container.items.create(groupData);
        return resource as GroupEntity;
      } catch (error) {
        console.error('Error creating group in Cosmos DB:', error);
        throw new Error('Failed to create group');
      }
    } else {
      this.inMemoryGroups.set(groupData.id, groupData);
      return groupData;
    }
  }

  public async getGroupById(groupId: string): Promise<GroupEntity | null> {
    if (this.useRealDatabase && this.container) {
      try {
        const { resources } = await this.container.items
          .query({
            query: 'SELECT * FROM c WHERE c.id = @id AND c.type = "group"',
            parameters: [{ name: '@id', value: groupId }],
          })
          .fetchAll();

        return resources.length > 0 ? (resources[0] as GroupEntity) : null;
      } catch (error) {
        console.error('Error fetching group from Cosmos DB:', error);
        return null;
      }
    } else {
      return this.inMemoryGroups.get(groupId) || null;
    }
  }

  public async getGroupsBySchool(schoolId?: string): Promise<GroupEntity[]> {
    if (this.useRealDatabase && this.container) {
      try {
        const query = schoolId
          ? {
              query: 'SELECT * FROM c WHERE c.schoolId = @schoolId AND c.type = "group"',
              parameters: [{ name: '@schoolId', value: schoolId }],
            }
          : { query: 'SELECT * FROM c WHERE c.type = "group"' };

        const { resources } = await this.container.items.query(query).fetchAll();
        return resources as GroupEntity[];
      } catch (error) {
        console.error('Error fetching groups from Cosmos DB:', error);
        return [];
      }
    } else {
      const groups = Array.from(this.inMemoryGroups.values());
      return schoolId ? groups.filter((g) => g.schoolId === schoolId) : groups;
    }
  }

  public async updateGroup(
    groupId: string,
    updates: Partial<GroupEntity>,
  ): Promise<GroupEntity | null> {
    const group = await this.getGroupById(groupId);
    if (!group) return null;

    const updatedGroup = {
      ...group,
      ...updates,
      updatedAt: new Date(),
    };

    if (this.useRealDatabase && this.container) {
      try {
        const { resource } = await this.container.item(groupId, groupId).replace(updatedGroup);
        return resource as GroupEntity;
      } catch (error) {
        console.error('Error updating group in Cosmos DB:', error);
        return null;
      }
    } else {
      this.inMemoryGroups.set(groupId, updatedGroup);
      return updatedGroup;
    }
  }

  public async createJoinRequest(joinRequestData: any): Promise<any> {
    if (this.useRealDatabase && this.container) {
      try {
        const { resource } = await this.container.items.create(joinRequestData);
        return resource;
      } catch (error) {
        console.error('Error creating join request in Cosmos DB:', error);
        throw new Error('Failed to create join request');
      }
    } else {
      this.inMemoryJoinRequests.set(joinRequestData.id, joinRequestData);
      return joinRequestData;
    }
  }

  public async getJoinRequestById(requestId: string): Promise<any | null> {
    if (this.useRealDatabase && this.container) {
      try {
        const { resources } = await this.container.items
          .query({
            query: 'SELECT * FROM c WHERE c.id = @id AND c.type = "join-request"',
            parameters: [{ name: '@id', value: requestId }],
          })
          .fetchAll();

        return resources.length > 0 ? resources[0] : null;
      } catch (error) {
        console.error('Error fetching join request from Cosmos DB:', error);
        return null;
      }
    } else {
      return this.inMemoryJoinRequests.get(requestId) || null;
    }
  }

  public async updateJoinRequestStatus(requestId: string, status: string): Promise<void> {
    if (this.useRealDatabase && this.container) {
      try {
        const joinRequest = await this.getJoinRequestById(requestId);
        if (joinRequest) {
          joinRequest.status = status;
          joinRequest.updatedAt = new Date();
          await this.container.item(requestId, requestId).replace(joinRequest);
        }
      } catch (error) {
        console.error('Error updating join request status in Cosmos DB:', error);
        throw new Error('Failed to update join request status');
      }
    } else {
      const joinRequest = this.inMemoryJoinRequests.get(requestId);
      if (joinRequest) {
        joinRequest.status = status;
        joinRequest.updatedAt = new Date();
        this.inMemoryJoinRequests.set(requestId, joinRequest);
      }
    }
  }

  public async getSchools(): Promise<any[]> {
    // For now, return mock schools. In a real implementation, this would query the database
    return this.inMemorySchools;
  }

  // Utility Methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  public isUsingRealDatabase(): boolean {
    return this.useRealDatabase;
  }

  public async healthCheck(): Promise<{
    status: string;
    database: string;
    userCount?: number;
  }> {
    try {
      if (this.useRealDatabase && this.container) {
        const { resources } = await this.container.items
          .query('SELECT VALUE COUNT(1) FROM c')
          .fetchAll();
        return {
          status: 'healthy',
          database: 'cosmos-db',
          userCount: resources[0],
        };
      } else {
        return {
          status: 'healthy',
          database: 'in-memory',
          userCount: this.inMemoryUsers.size,
        };
      }
    } catch (error) {
      return {
        status: 'error',
        database: this.useRealDatabase ? 'cosmos-db' : 'in-memory',
      };
    }
  }

  // ADD BELOW: public accessor for the default Cosmos container so repositories can resolve it safely
  public getDefaultContainer(): Container | undefined {
    return this.container;
  }
}

export const databaseService = DatabaseService.getInstance();
export default databaseService;
