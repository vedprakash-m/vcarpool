import { TripService } from './services/trip.service';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { UserService } from './services/user.service';
import { containers } from './config/database';
import { TripRepository } from './repositories/trip.repository';
import { UserRepository } from './repositories/user.repository';
import { loggers, AzureLogger, ILogger } from './utils/logger';

export interface ServiceContainer {
  tripService: TripService;
  authService: AuthService;
  emailService: EmailService;
  userService: UserService;
  repositories: {
    tripRepository: TripRepository;
    userRepository: UserRepository;
  };
  loggers: {
    auth: ILogger;
    trip: ILogger;
    user: ILogger;
    system: ILogger;
    api: ILogger;
  };
}

export function createContainer(): ServiceContainer {
  // Create repositories
  const tripRepository = new TripRepository(containers.trips);
  const userRepository = new UserRepository(containers.users);
  
  // Create services with proper dependencies
  const emailService = new EmailService();
  const userService = new UserService(userRepository, loggers.user);
  const authService = new AuthService(userRepository, loggers.auth);
  const tripService = new TripService(tripRepository, userRepository, emailService, loggers.trip);
  
  return {
    tripService,
    authService,
    emailService,
    userService,
    repositories: {
      tripRepository,
      userRepository
    },
    loggers: loggers
  };
}

export const container = createContainer();
