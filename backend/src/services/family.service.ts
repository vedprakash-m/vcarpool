import { v4 as uuidv4 } from 'uuid';
import { Family } from '@carpool/shared';
import { FamilyRepository } from '../repositories/family.repository';
import { ILogger } from '../utils/logger';

export class FamilyService {
  constructor(private familyRepository: FamilyRepository, private logger: ILogger) {}

  private static families: Family[] = [
    // Mock data
    {
      id: 'family-1',
      name: 'The Simpsons',
      parentIds: ['user-1', 'user-2'],
      childIds: ['child-1', 'child-2'],
      primaryParentId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'family-2',
      name: 'The Griffins',
      parentIds: ['user-3', 'user-4'],
      childIds: ['child-3', 'child-4', 'child-5'],
      primaryParentId: 'user-3',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  public static async getFamiliesByGroup(groupId: string): Promise<Family[]> {
    console.log(`Fetching families for group ${groupId}...`);
    // In a real implementation, you would filter families by group
    return this.families;
  }

  public static async createFamily(
    name: string,
    primaryParentId: string,
    parentIds: string[],
  ): Promise<Family> {
    const newFamily: Family = {
      id: `family-${Date.now()}`,
      name,
      primaryParentId,
      parentIds,
      childIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.families.push(newFamily);
    return newFamily;
  }

  public static async updateFamily(familyId: string, updates: Partial<Family>): Promise<Family> {
    const familyIndex = this.families.findIndex((f) => f.id === familyId);
    if (familyIndex === -1) {
      throw new Error('Family not found');
    }
    this.families[familyIndex] = { ...this.families[familyIndex], ...updates };
    return this.families[familyIndex];
  }

  async addChildToFamily(familyId: string, childId: string): Promise<Family | null> {
    this.logger.info('Adding child to family', { familyId, childId });
    const family = await this.familyRepository.findById(familyId);

    if (!family) {
      this.logger.warn('Family not found', { familyId });
      return null;
    }

    if (family.childIds.includes(childId)) {
      this.logger.warn('Child already in family', { familyId, childId });
      return family; // No change needed
    }

    family.childIds.push(childId);
    family.updatedAt = new Date();

    return this.familyRepository.update(familyId, family);
  }

  async findFamilyById(id: string): Promise<Family | null> {
    return this.familyRepository.findById(id);
  }

  async findFamiliesByParent(parentId: string): Promise<Family[]> {
    return this.familyRepository.findByParentId(parentId);
  }

  async createFamilyForUser(familyData: any, userId: string): Promise<Family> {
    // For now, just create a new family with the user as the primary parent
    const newFamily: Family = {
      id: `family-${Date.now()}`,
      name: familyData.name || 'Unnamed Family',
      primaryParentId: userId,
      parentIds: [userId],
      childIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // In a real implementation, save to DB
    FamilyService.families.push(newFamily);
    return newFamily;
  }
}
