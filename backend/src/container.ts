import 'reflect-metadata';
import { container as tsyringeContainer, DependencyContainer } from 'tsyringe';
import databaseService from './services/database.service';

// Import your services and repositories here
import { UserService } from './services/user.service';
import { TripService } from './services/trip.service';
import { FamilyService } from './services/family.service';
import { ChildService } from './services/child.service';
import { PreferenceService } from './services/preference.service';
import { SchedulingService } from './services/scheduling.service';
import { UserRepository } from './repositories/user.repository';
import { FamilyRepository } from './repositories/family.repository';
import { ChildRepository } from './repositories/child.repository';
import { TripRepository } from './repositories/trip.repository';
import { AzureLogger, ILogger } from './utils/logger';
import { CreateTripUseCase } from './core/trips/usecases/CreateTripUseCase';
import { TripPassengerUseCase } from './core/trips/usecases/TripPassengerUseCase';
import { NotificationService } from './services/notification.service';
import { PreferenceRepository } from './repositories/preference.repository';

export interface ServiceContainer extends DependencyContainer {
  userService: UserService;
  tripService: TripService;
  familyService: FamilyService;
  childService: ChildService;
  preferenceService: PreferenceService;
  schedulingService: SchedulingService;
  userRepository: UserRepository;
  familyRepository: FamilyRepository;
  childRepository: ChildRepository;
  tripRepository: TripRepository;
  preferenceRepository: PreferenceRepository;
  createTripUseCase: CreateTripUseCase;
  tripPassengerUseCase: TripPassengerUseCase;
  notificationService: NotificationService;
  loggers: {
    system: ILogger;
    trip: ILogger;
    auth: ILogger;
    user: ILogger;
  };
  // Explicitly include resolve method for type safety
  resolve<T>(token: string): T;
}

export function createContainer(): ServiceContainer {
  // Register services and repositories
  tsyringeContainer.register<UserService>('UserService', {
    useClass: UserService,
  });
  tsyringeContainer.register<TripService>('TripService', {
    useClass: TripService,
  });
  tsyringeContainer.register<FamilyService>('FamilyService', {
    useClass: FamilyService,
  });
  tsyringeContainer.register<ChildService>('ChildService', {
    useClass: ChildService,
  });
  tsyringeContainer.register<PreferenceService>('PreferenceService', {
    useClass: PreferenceService,
  });
  tsyringeContainer.register<SchedulingService>('SchedulingService', {
    useClass: SchedulingService,
  });
  tsyringeContainer.register<NotificationService>('NotificationService', {
    useClass: NotificationService,
  });

  tsyringeContainer.register<UserRepository>('UserRepository', {
    useClass: UserRepository,
  });
  tsyringeContainer.register<FamilyRepository>('FamilyRepository', {
    useClass: FamilyRepository,
  });
  tsyringeContainer.register<ChildRepository>('ChildRepository', {
    useClass: ChildRepository,
  });
  tsyringeContainer.register<TripRepository>('TripRepository', {
    useFactory: (c) => {
      const cosmosContainer = databaseService.getDefaultContainer();

      if (!cosmosContainer) {
        throw new Error(
          'Cosmos container is not initialized. Did DatabaseService fail to connect?',
        );
      }

      return new TripRepository(cosmosContainer);
    },
  });

  tsyringeContainer.register<PreferenceRepository>('PreferenceRepository', {
    useClass: PreferenceRepository,
  });

  // Logger registration
  const logger = new AzureLogger();
  tsyringeContainer.register<ILogger>('ILogger', { useValue: logger });

  const serviceContainer = tsyringeContainer as ServiceContainer;

  // Add service getters
  Object.defineProperty(serviceContainer, 'userService', {
    get: () => tsyringeContainer.resolve<UserService>('UserService'),
  });
  Object.defineProperty(serviceContainer, 'tripService', {
    get: () => tsyringeContainer.resolve<TripService>('TripService'),
  });
  Object.defineProperty(serviceContainer, 'familyService', {
    get: () => tsyringeContainer.resolve<FamilyService>('FamilyService'),
  });
  Object.defineProperty(serviceContainer, 'childService', {
    get: () => tsyringeContainer.resolve<ChildService>('ChildService'),
  });
  Object.defineProperty(serviceContainer, 'preferenceService', {
    get: () => tsyringeContainer.resolve<PreferenceService>('PreferenceService'),
  });
  Object.defineProperty(serviceContainer, 'schedulingService', {
    get: () => tsyringeContainer.resolve<SchedulingService>('SchedulingService'),
  });
  Object.defineProperty(serviceContainer, 'userRepository', {
    get: () => tsyringeContainer.resolve<UserRepository>('UserRepository'),
  });
  Object.defineProperty(serviceContainer, 'familyRepository', {
    get: () => tsyringeContainer.resolve<FamilyRepository>('FamilyRepository'),
  });
  Object.defineProperty(serviceContainer, 'childRepository', {
    get: () => tsyringeContainer.resolve<ChildRepository>('ChildRepository'),
  });
  Object.defineProperty(serviceContainer, 'tripRepository', {
    get: () => tsyringeContainer.resolve<TripRepository>('TripRepository'),
  });
  Object.defineProperty(serviceContainer, 'preferenceRepository', {
    get: () => tsyringeContainer.resolve<PreferenceRepository>('PreferenceRepository'),
  });
  Object.defineProperty(serviceContainer, 'notificationService', {
    get: () => tsyringeContainer.resolve<NotificationService>('NotificationService'),
  });

  // Add logger getters
  Object.defineProperty(serviceContainer, 'loggers', {
    get: () => ({
      system: logger,
      trip: logger,
      auth: logger,
      user: logger,
    }),
  });

  // Use-cases
  tsyringeContainer.register<CreateTripUseCase>('CreateTripUseCase', {
    useFactory: (c) => {
      const tripRepo = c.resolve<TripRepository>('TripRepository');
      return new CreateTripUseCase(tripRepo);
    },
  });

  tsyringeContainer.register<TripPassengerUseCase>('TripPassengerUseCase', {
    useFactory: (c) => {
      const tripRepo = c.resolve<TripRepository>('TripRepository');
      return new TripPassengerUseCase(tripRepo);
    },
  });

  return serviceContainer as ServiceContainer;
}

// Create and export the container instance
export const container = createContainer();
export { DependencyContainer };

// Helper function to get the container instance
export function getContainer(): ServiceContainer {
  return container;
}
