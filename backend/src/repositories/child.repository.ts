import { Container } from '@azure/cosmos';
import { Child } from '@carpool/shared';

export class ChildRepository {
  constructor(private container: Container) {}

  async create(child: Child): Promise<Child> {
    const { resource } = await this.container.items.create(child);
    return resource as Child;
  }

  async findById(id: string, familyId: string): Promise<Child | null> {
    try {
      // Both id and partition key (familyId) are needed for lookup
      const { resource } = await this.container.item(id, familyId).read<Child>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async update(id: string, familyId: string, child: Child): Promise<Child> {
    const { resource } = await this.container.item(id, familyId).replace(child);
    return resource as Child;
  }

  async delete(id: string, familyId: string): Promise<void> {
    await this.container.item(id, familyId).delete();
  }

  async findByFamilyId(familyId: string): Promise<Child[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.familyId = @familyId',
      parameters: [{ name: '@familyId', value: familyId }],
    };

    const { resources } = await this.container.items.query<Child>(query).fetchAll();
    return resources;
  }
}
