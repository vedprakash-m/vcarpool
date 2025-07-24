// backend/src/services/child.service.ts

// This is a placeholder service to unblock development.
// In a real implementation, this would interact with a database.

import { Child } from '@carpool/shared';

export class ChildService {
  private static children: Child[] = [
    // Mock data
  ];
  private static idCounter = 0;

  public static async createChild(
    childData: Omit<Child, 'id' | 'familyId' | 'parentId' | 'createdAt' | 'updatedAt'>,
    familyId: string,
    parentId: string,
  ): Promise<Child> {
    const newChild: Child = {
      id: `child-${Date.now()}-${++this.idCounter}`,
      familyId,
      parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...childData,
    };
    this.children.push(newChild);
    return newChild;
  }

  async createChild(
    childData: Omit<Child, 'id' | 'familyId' | 'parentId' | 'createdAt' | 'updatedAt'>,
    familyId: string,
    parentId: string,
  ): Promise<Child> {
    const newChild: Child = {
      id: `child-${Date.now()}`,
      familyId,
      parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...childData,
    };
    ChildService.children.push(newChild);
    return newChild;
  }
}
