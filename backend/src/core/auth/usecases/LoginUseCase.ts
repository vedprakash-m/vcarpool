import { userDomainService } from '../../../services/domains/user-domain.service';
import { UserRepositoryPort } from '../../user/ports/UserRepositoryPort';

export class LoginUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(email: string, password: string) {
    // Use unified user domain service for authentication
    return await userDomainService.authenticateUser({ email, password });
  }
}
