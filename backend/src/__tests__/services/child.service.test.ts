import { ChildService } from '../../services/child.service';
import { Child, School } from '@carpool/shared';

describe('ChildService', () => {
  let childService: ChildService;

  // Mock school object
  const mockSchool: School = {
    id: 'school-123',
    name: 'Elementary School',
    address: '123 Main St',
    location: {
      address: '123 Main St',
      latitude: 0,
      longitude: 0,
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
    },
    type: 'elementary',
    grades: ['K', '1st', '2nd', '3rd', '4th', '5th'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    childService = new ChildService();
    // Clear static children array before each test
    (ChildService as any).children = [];
  });

  afterEach(() => {
    // Clean up static children array after each test
    (ChildService as any).children = [];
  });

  describe('createChild - static method', () => {
    it('should create a child with correct properties', async () => {
      const childData = {
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        grade: '3rd',
        school: mockSchool,
      };
      const familyId = 'family-123';
      const parentId = 'parent-456';

      const child = await ChildService.createChild(childData, familyId, parentId);

      expect(child).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        grade: '3rd',
        school: mockSchool,
        familyId: 'family-123',
        parentId: 'parent-456',
      });
      expect(child.id).toMatch(/^child-\d+-\d+$/);
      expect(child.createdAt).toBeInstanceOf(Date);
      expect(child.updatedAt).toBeInstanceOf(Date);
    });

    it('should add child to static children array', async () => {
      const childData = {
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
        grade: '5th',
        school: mockSchool,
      };
      const familyId = 'family-789';
      const parentId = 'parent-101';

      await ChildService.createChild(childData, familyId, parentId);

      const children = (ChildService as any).children;
      expect(children).toHaveLength(1);
      expect(children[0].firstName).toBe('Jane');
    });

    it('should create unique IDs for different children', async () => {
      const childData1 = {
        firstName: 'Child',
        lastName: 'One',
        fullName: 'Child One',
        grade: '2nd',
        school: mockSchool,
      };
      const childData2 = {
        firstName: 'Child',
        lastName: 'Two',
        fullName: 'Child Two',
        grade: '4th',
        school: mockSchool,
      };

      const child1 = await ChildService.createChild(childData1, 'family-1', 'parent-1');
      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1));
      const child2 = await ChildService.createChild(childData2, 'family-2', 'parent-2');

      expect(child1.id).not.toBe(child2.id);
      expect(child1.id).toMatch(/^child-\d+-\d+$/);
      expect(child2.id).toMatch(/^child-\d+-\d+$/);
    });
  });

  describe('createChild - instance method', () => {
    it('should create a child with correct properties', async () => {
      const childData = {
        firstName: 'Alice',
        lastName: 'Johnson',
        fullName: 'Alice Johnson',
        grade: '1st',
        school: mockSchool,
      };
      const familyId = 'family-555';
      const parentId = 'parent-777';

      const child = await childService.createChild(childData, familyId, parentId);

      expect(child).toMatchObject({
        firstName: 'Alice',
        lastName: 'Johnson',
        fullName: 'Alice Johnson',
        grade: '1st',
        school: mockSchool,
        familyId: 'family-555',
        parentId: 'parent-777',
      });
      expect(child.id).toMatch(/^child-\d+$/);
      expect(child.createdAt).toBeInstanceOf(Date);
      expect(child.updatedAt).toBeInstanceOf(Date);
    });

    it('should add child to static children array via instance method', async () => {
      const childData = {
        firstName: 'Bob',
        lastName: 'Wilson',
        fullName: 'Bob Wilson',
        grade: '6th',
        school: mockSchool,
      };
      const familyId = 'family-888';
      const parentId = 'parent-999';

      await childService.createChild(childData, familyId, parentId);

      const children = (ChildService as any).children;
      expect(children).toHaveLength(1);
      expect(children[0].firstName).toBe('Bob');
    });

    it('should handle minimal child data correctly', async () => {
      const childData = {
        firstName: 'Minimal',
        lastName: 'Child',
      };
      const familyId = 'family-min';
      const parentId = 'parent-min';

      const child = await childService.createChild(childData, familyId, parentId);

      expect(child.firstName).toBe('Minimal');
      expect(child.lastName).toBe('Child');
      expect(child.familyId).toBe('family-min');
      expect(child.parentId).toBe('parent-min');
      expect(child.grade).toBeUndefined();
      expect(child.school).toBeUndefined();
    });
  });

  describe('both methods working together', () => {
    it('should maintain the same children array for both static and instance methods', async () => {
      const staticChild = await ChildService.createChild(
        {
          firstName: 'Static',
          lastName: 'Child',
          fullName: 'Static Child',
          grade: '2nd',
          school: mockSchool,
        },
        'family-1',
        'parent-1',
      );

      const instanceChild = await childService.createChild(
        {
          firstName: 'Instance',
          lastName: 'Child',
          fullName: 'Instance Child',
          grade: '3rd',
          school: mockSchool,
        },
        'family-2',
        'parent-2',
      );

      const children = (ChildService as any).children;
      expect(children).toHaveLength(2);
      expect(children.map((c: Child) => c.firstName)).toEqual(['Static', 'Instance']);
    });
  });
});
