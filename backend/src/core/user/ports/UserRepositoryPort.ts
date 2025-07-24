export interface UserRepositoryPort {
  create(user: any): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByEmail(email: string): Promise<any | null>;
  update(id: string, user: any): Promise<any>;
  delete(id: string): Promise<void>;
  findAll(): Promise<any[]>;
} 