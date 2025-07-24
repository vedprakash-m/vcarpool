import { User, UserPreferences, ApiResponse } from '@carpool/shared';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/user.repository';
import { Errors } from '../utils/error-handler';
import { ILogger } from '../utils/logger';

export class UserService {
  // Static methods for backward compatibility
  static async getUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    // Create a temporary instance for static calls
    const { containers } = await import('../config/database');
    const userRepository = new UserRepository(containers.users);
    const userService = new UserService(userRepository);
    return userService.getUserByEmail(email);
  }

  static async createUser(userData: any): Promise<User> {
    const { containers } = await import('../config/database');
    const userRepository = new UserRepository(containers.users);
    const userService = new UserService(userRepository);
    return userService.createUser(userData);
  }

  private logger: ILogger;

  constructor(
    private userRepository: UserRepository,
    logger?: ILogger,
  ) {
    // Use provided logger or create a simple implementation
    this.logger = logger || {
      debug: (message: string, data?: any) => console.debug(message, data),
      info: (message: string, data?: any) => console.info(message, data),
      warn: (message: string, data?: any) => console.warn(message, data),
      error: (message: string, error?: any) => console.error(message, error),
      setContext: () => {},
      child: () => this.logger,
      startTimer: (label: string) => () => console.time(label),
    };
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    department?: string;
  }): Promise<User> {
    try {
      // Check if user with this email already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw Errors.Conflict('User with this email already exists');
      }

      const user: User = {
        id: uuidv4(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        department: userData.department,
        role: 'parent', // Default role
        preferences: {
          pickupLocation: '',
          dropoffLocation: '',
          preferredTime: '08:00',
          isDriver: false,
          smokingAllowed: false,
          notifications: {
            email: true,
            sms: false,
            tripReminders: true,
            swapRequests: true,
            scheduleChanges: true,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store user with password hash
      const userWithPassword = {
        ...user,
        passwordHash: userData.passwordHash,
      };

      await this.userRepository.create(userWithPassword as User);

      // Return user without password hash
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      if (error instanceof Error) {
        throw error; // Re-throw AppErrors
      }
      throw Errors.InternalServerError(
        `Error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find user by email (instance method)
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const userWithPassword = await this.userRepository.findByEmail(email);
      if (!userWithPassword) return null;

      // Remove password hash from response
      const { passwordHash, ...user } = userWithPassword as any;
      return user as User;
    } catch (error) {
      this.logger.error(`Error finding user by email ${email}:`, error as Record<string, unknown>);
      throw Errors.InternalServerError(
        `Error finding user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findById(userId);
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw Errors.InternalServerError(
        `Error fetching user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    try {
      const user = await this.userRepository.findByEmail(email);
      // Note: Repository returns User with passwordHash from database
      // Type assertion is needed since the User interface doesn't include passwordHash for security
      return user as (User & { passwordHash: string }) | null;
    } catch (error) {
      console.error(`Error fetching user by email ${email}:`, error);
      throw Errors.InternalServerError(
        `Error fetching user by email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      department?: string;
      preferences?: Partial<UserPreferences>;
      resetToken?: string;
      resetTokenExpiry?: Date;
      passwordHash?: string;
    },
  ): Promise<User | null> {
    try {
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        return null;
      }

      // Merge user preferences if provided
      const updatedPreferences = updates.preferences
        ? {
            ...existingUser.preferences,
            ...updates.preferences,
            notifications: updates.preferences.notifications
              ? {
                  ...existingUser.preferences.notifications,
                  ...updates.preferences.notifications,
                }
              : existingUser.preferences.notifications,
          }
        : existingUser.preferences;

      const updatedUser = {
        ...existingUser,
        firstName: updates.firstName ?? existingUser.firstName,
        lastName: updates.lastName ?? existingUser.lastName,
        phoneNumber: updates.phoneNumber ?? existingUser.phoneNumber,
        department: updates.department ?? existingUser.department,
        preferences: updatedPreferences,
        updatedAt: new Date(),
        // Add password reset fields (these won't be returned in User type but will be stored)
        ...(updates.resetToken && { resetToken: updates.resetToken }),
        ...(updates.resetTokenExpiry && {
          resetTokenExpiry: updates.resetTokenExpiry,
        }),
        ...(updates.passwordHash && { passwordHash: updates.passwordHash }),
      };

      return await this.userRepository.update(userId, updatedUser);
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw Errors.InternalServerError(
        `Error updating user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return false;
      }

      await this.userRepository.delete(userId);
      return true;
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw Errors.InternalServerError(
        `Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all users with pagination
   */
  async getUsers(
    options: {
      limit?: number;
      offset?: number;
      searchTerm?: string;
    } = {},
  ): Promise<{ users: User[]; total: number }> {
    try {
      let query = 'SELECT * FROM c';
      const parameters: Array<{ name: string; value: any }> = [];

      // Add search filter if provided
      if (options.searchTerm) {
        query += ` WHERE CONTAINS(
          LOWER(c.firstName), @searchTerm) OR 
          CONTAINS(LOWER(c.lastName), @searchTerm) OR 
          CONTAINS(LOWER(c.email), @searchTerm)`;
        parameters.push({
          name: '@searchTerm',
          value: options.searchTerm.toLowerCase(),
        });
      }

      // Add ordering
      query += ' ORDER BY c.lastName';

      // Get all users with the filter
      const users = await this.userRepository.query({ query, parameters });

      // Calculate total count
      const total = users.length;

      // Apply pagination in the service layer
      let paginatedUsers = users;
      if (options.limit && options.limit > 0) {
        const offset = options.offset || 0;
        paginatedUsers = users.slice(offset, offset + options.limit);
      }

      // Remove password hashes
      const sanitizedUsers = paginatedUsers.map((user) => {
        // Use type casting to handle the password hash property
        const userWithPassword = user as any;
        const { passwordHash, ...userWithoutPassword } = userWithPassword;
        return userWithoutPassword as User;
      });

      return {
        users: sanitizedUsers,
        total,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw Errors.InternalServerError(
        `Error fetching users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
