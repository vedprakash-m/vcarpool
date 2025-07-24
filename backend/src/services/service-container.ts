/**
 * SERVICE CONTAINER
 *
 * Dependency injection container for shared services.
 * Provides centralized service management and configuration.
 */

import { AuthenticationService } from './auth/authentication.service';
import { NotificationService } from '../../../shared/src/services/notification.service';
import { ValidationService } from '../../../shared/src/services/validation.service';
import { AuditService } from '../../../shared/src/services/audit.service';
import { databaseService } from './database.service';

interface ServiceDependencies {
  // Add database and other dependencies here
  databaseService?: any;
  configService?: any;
}

export class ServiceContainer {
  private static instance: ServiceContainer;
  private authService: AuthenticationService;
  private notificationService: NotificationService | null = null;
  private validationService: ValidationService | null = null;
  private auditService: AuditService | null = null;

  private constructor(dependencies: ServiceDependencies = {}) {
    // Initialize authentication service
    const logger = {
      debug: (msg: string, data?: any) => console.debug(msg, data),
      info: (msg: string, data?: any) => console.info(msg, data),
      warn: (msg: string, data?: any) => console.warn(msg, data),
      error: (msg: string, error?: any) => console.error(msg, error),
      setContext: () => {},
      child: () => logger,
      startTimer: (label: string) => () => {},
    };

    this.authService = new AuthenticationService(databaseService, logger);

    // Other services disabled for now to focus on authentication
    // this.notificationService = new NotificationService({...dependencies});
    // this.validationService = new ValidationService({...dependencies});
    // this.auditService = new AuditService({...dependencies});
  }

  public static getInstance(dependencies?: ServiceDependencies): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(dependencies);
    }
    return ServiceContainer.instance;
  }

  public getAuthService(): AuthenticationService {
    return this.authService;
  }

  public getNotificationService(): NotificationService | null {
    return this.notificationService;
  }

  public getValidationService(): ValidationService | null {
    return this.validationService;
  }

  public getAuditService(): AuditService | null {
    return this.auditService;
  }
}
