import { Container } from '@azure/cosmos';
import { User } from '@carpool/shared';
import { UserRepositoryPort } from '../core/user/ports/UserRepositoryPort';

export class UserRepository implements UserRepositoryPort {
  constructor(private container: Container) {}

  async create(user: User): Promise<User> {
    const { resource } = await this.container.items.create(user);
    return resource as User;
  }

  async findById(id: string): Promise<User | null> {
    try {
      const { resource } = await this.container.item(id).read<User>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = {
      query: 'SELECT * FROM c WHERE c.email = @email',
      parameters: [{ name: '@email', value: email }],
    };

    const { resources } = await this.container.items.query<User>(query).fetchAll();
    return resources.length > 0 ? resources[0] : null;
  }

  async update(id: string, user: User): Promise<User> {
    const { resource } = await this.container.item(id).replace(user);
    return resource as User;
  }

  async delete(id: string): Promise<void> {
    await this.container.item(id).delete();
  }

  async findAll(): Promise<User[]> {
    const query = 'SELECT * FROM c';
    const { resources } = await this.container.items.query<User>(query).fetchAll();
    return resources;
  }

  async query(querySpec: {
    query: string;
    parameters: Array<{ name: string; value: any }>;
  }): Promise<User[]> {
    const { resources } = await this.container.items.query<User>(querySpec).fetchAll();
    return resources;
  }
}
