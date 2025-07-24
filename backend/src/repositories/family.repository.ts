import { Container } from '@azure/cosmos';
import { Family } from '@carpool/shared';

export class FamilyRepository {
  constructor(private container: Container) {}

  async create(family: Family): Promise<Family> {
    const { resource } = await this.container.items.create(family);
    return resource as Family;
  }

  async findById(id: string): Promise<Family | null> {
    try {
      const { resource } = await this.container.item(id, id).read<Family>(); // Partition key is the id
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async update(id: string, family: Family): Promise<Family> {
    const { resource } = await this.container.item(id, id).replace(family);
    return resource as Family;
  }

  async delete(id: string): Promise<void> {
    await this.container.item(id, id).delete();
  }

  async findByParentId(parentId: string): Promise<Family[]> {
    const query = {
      query: 'SELECT * FROM c WHERE ARRAY_CONTAINS(c.parentIds, @parentId)',
      parameters: [{ name: '@parentId', value: parentId }],
    };

    const { resources } = await this.container.items.query<Family>(query).fetchAll();
    return resources;
  }
}
