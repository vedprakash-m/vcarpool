/**
 * User Repository Test Suite - Comprehensive Coverage
 *
 * Testing all repository methods to improve coverage from 0% to 80%+
 * Includes error handling, query parameters, and edge cases
 */

import { UserRepository } from '../../repositories/user.repository';
import { User, UserRole } from '@carpool/shared';

// Mock the CosmosDB container
const mockContainer = {
  items: {
    create: jest.fn(),
    query: jest.fn().mockReturnValue({
      fetchAll: jest.fn(),
    }),
  },
  item: jest.fn().mockReturnValue({
    read: jest.fn(),
    replace: jest.fn(),
    delete: jest.fn(),
  }),
};

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository(mockContainer as any);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'parent' as UserRole,
        phoneNumber: '555-0123',
        preferences: {
          pickupLocation: '123 Main St',
          dropoffLocation: 'School',
          preferredTime: '08:00',
          isDriver: true,
          smokingAllowed: false,
          notifications: {
            email: true,
            sms: true,
            tripReminders: true,
            swapRequests: true,
            scheduleChanges: true,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContainer.items.create.mockResolvedValue({
        resource: mockUser,
      });

      const result = await userRepository.create(mockUser);

      expect(result).toEqual(mockUser);
      expect(mockContainer.items.create).toHaveBeenCalledWith(mockUser);
    });

    it('should handle create errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const createError = new Error('Database connection failed');

      mockContainer.items.create.mockRejectedValue(createError);

      await expect(userRepository.create(mockUser as any)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle duplicate user creation', async () => {
      const mockUser = { id: 'user-123', email: 'duplicate@example.com' };
      const duplicateError = new Error('Conflict');
      (duplicateError as any).code = 409;

      mockContainer.items.create.mockRejectedValue(duplicateError);

      await expect(userRepository.create(mockUser as any)).rejects.toThrow('Conflict');
    });
  });

  describe('findById', () => {
    it('should find user by id successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'parent',
      };

      mockContainer.item.mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: mockUser,
        }),
      });

      const result = await userRepository.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockContainer.item).toHaveBeenCalledWith('user-123');
    });

    it('should return null when user not found (404)', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).code = 404;

      mockContainer.item.mockReturnValue({
        read: jest.fn().mockRejectedValue(notFoundError),
      });

      const result = await userRepository.findById('nonexistent-user');

      expect(result).toBeNull();
    });

    it('should return null when resource is undefined', async () => {
      mockContainer.item.mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: undefined,
        }),
      });

      const result = await userRepository.findById('user-123');

      expect(result).toBeNull();
    });

    it('should throw error for non-404 errors', async () => {
      const serverError = new Error('Internal server error');
      (serverError as any).code = 500;

      mockContainer.item.mockReturnValue({
        read: jest.fn().mockRejectedValue(serverError),
      });

      await expect(userRepository.findById('user-123')).rejects.toThrow('Internal server error');
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Forbidden');
      (permissionError as any).code = 403;

      mockContainer.item.mockReturnValue({
        read: jest.fn().mockRejectedValue(permissionError),
      });

      await expect(userRepository.findById('user-123')).rejects.toThrow('Forbidden');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [mockUser],
        }),
      });

      const result = await userRepository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: 'test@example.com' }],
      });
    });

    it('should return null when no user found by email', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should return first user when multiple users with same email exist', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'duplicate@example.com', firstName: 'John' },
        { id: 'user-2', email: 'duplicate@example.com', firstName: 'Jane' },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: mockUsers,
        }),
      });

      const result = await userRepository.findByEmail('duplicate@example.com');

      expect(result).toEqual(mockUsers[0]);
    });

    it('should handle email query errors', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockRejectedValue(new Error('Email query failed')),
      });

      await expect(userRepository.findByEmail('test@example.com')).rejects.toThrow(
        'Email query failed',
      );
    });

    it('should handle email case sensitivity properly', async () => {
      const mockUser = { id: 'user-123', email: 'Test@Example.Com' };

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [mockUser],
        }),
      });

      const result = await userRepository.findByEmail('Test@Example.Com');

      expect(result).toEqual(mockUser);
      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: 'Test@Example.Com' }],
      });
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        role: 'parent' as UserRole,
        preferences: {
          pickupLocation: '456 Updated St',
          dropoffLocation: 'New School',
          preferredTime: '08:30',
          isDriver: false,
          smokingAllowed: false,
          notifications: {
            email: true,
            sms: false,
            tripReminders: true,
            swapRequests: false,
            scheduleChanges: true,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContainer.item.mockReturnValue({
        replace: jest.fn().mockResolvedValue({
          resource: mockUser,
        }),
      });

      const result = await userRepository.update('user-123', mockUser);

      expect(result).toEqual(mockUser);
      expect(mockContainer.item).toHaveBeenCalledWith('user-123');
    });

    it('should handle update errors', async () => {
      const updateError = new Error('Update failed');

      mockContainer.item.mockReturnValue({
        replace: jest.fn().mockRejectedValue(updateError),
      });

      await expect(userRepository.update('user-123', {} as any)).rejects.toThrow('Update failed');
    });

    it('should handle update conflict errors', async () => {
      const conflictError = new Error('Concurrency conflict');
      (conflictError as any).code = 412;

      mockContainer.item.mockReturnValue({
        replace: jest.fn().mockRejectedValue(conflictError),
      });

      await expect(userRepository.update('user-123', {} as any)).rejects.toThrow(
        'Concurrency conflict',
      );
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockContainer.item.mockReturnValue({
        delete: jest.fn().mockResolvedValue({}),
      });

      await userRepository.delete('user-123');

      expect(mockContainer.item).toHaveBeenCalledWith('user-123');
      expect(mockContainer.item().delete).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      const deleteError = new Error('Delete failed');

      mockContainer.item.mockReturnValue({
        delete: jest.fn().mockRejectedValue(deleteError),
      });

      await expect(userRepository.delete('user-123')).rejects.toThrow('Delete failed');
    });

    it('should handle delete of non-existent user', async () => {
      const notFoundError = new Error('User not found');
      (notFoundError as any).code = 404;

      mockContainer.item.mockReturnValue({
        delete: jest.fn().mockRejectedValue(notFoundError),
      });

      await expect(userRepository.delete('nonexistent-user')).rejects.toThrow('User not found');
    });
  });

  describe('findAll', () => {
    it('should find all users successfully', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', firstName: 'User', lastName: 'One' },
        { id: 'user-2', email: 'user2@example.com', firstName: 'User', lastName: 'Two' },
        { id: 'user-3', email: 'user3@example.com', firstName: 'User', lastName: 'Three' },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: mockUsers,
        }),
      });

      const result = await userRepository.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockContainer.items.query).toHaveBeenCalledWith('SELECT * FROM c');
    });

    it('should return empty array when no users exist', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      const result = await userRepository.findAll();

      expect(result).toEqual([]);
    });

    it('should handle findAll query errors', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockRejectedValue(new Error('Query all users failed')),
      });

      await expect(userRepository.findAll()).rejects.toThrow('Query all users failed');
    });
  });

  describe('query', () => {
    it('should execute custom query', async () => {
      const customQuerySpec = {
        query: 'SELECT * FROM c WHERE c.role = @role',
        parameters: [{ name: '@role', value: 'parent' }],
      };

      const mockResults = [
        { id: 'user-1', role: 'parent', firstName: 'Parent', lastName: 'One' },
        { id: 'user-2', role: 'parent', firstName: 'Parent', lastName: 'Two' },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: mockResults,
        }),
      });

      const result = await userRepository.query(customQuerySpec);

      expect(result).toEqual(mockResults);
      expect(mockContainer.items.query).toHaveBeenCalledWith(customQuerySpec);
    });

    it('should handle complex custom queries', async () => {
      const complexQuerySpec = {
        query:
          'SELECT * FROM c WHERE c.role = @role AND c.isActiveDriver = @isActive ORDER BY c.lastName',
        parameters: [
          { name: '@role', value: 'parent' },
          { name: '@isActive', value: true },
        ],
      };

      const mockResults = [
        { id: 'user-1', role: 'parent', isActiveDriver: true, lastName: 'Adams' },
        { id: 'user-2', role: 'parent', isActiveDriver: true, lastName: 'Brown' },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: mockResults,
        }),
      });

      const result = await userRepository.query(complexQuerySpec);

      expect(result).toEqual(mockResults);
      expect(mockContainer.items.query).toHaveBeenCalledWith(complexQuerySpec);
    });

    it('should handle custom query errors', async () => {
      const customQuerySpec = {
        query: 'INVALID SQL SYNTAX',
        parameters: [],
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockRejectedValue(new Error('Invalid query syntax')),
      });

      await expect(userRepository.query(customQuerySpec)).rejects.toThrow('Invalid query syntax');
    });

    it('should return empty array for query with no results', async () => {
      const customQuerySpec = {
        query: 'SELECT * FROM c WHERE c.nonexistentField = @value',
        parameters: [{ name: '@value', value: 'nothing' }],
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      const result = await userRepository.query(customQuerySpec);

      expect(result).toEqual([]);
    });
  });
});
