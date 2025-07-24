/**
 * DOMAIN SERVICES
 *
 * Consolidated business logic layer.
 * This replaces the scattered business logic found across multiple services.
 *
 * Key Features:
 * - Single responsibility principle
 * - Business rule enforcement
 * - Consistent validation
 * - Audit trail integration
 * - Error handling standardization
 * - Transaction management
 */

// Legacy services - temporarily excluded from emergency build
// export * from './user.service';
// export * from './group.service';
// export * from './school.service';
// export * from './trip.service';
// export * from './auth.service';
// export * from './notification.service';
// export * from './validation.service';
// export * from './audit.service';

// Common service interfaces
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: {
    executionTime: number;
    timestamp: Date;
    version: string;
  };
}

export interface ServiceContext {
  userId: string;
  userRole: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  timestamp: Date;
}

export interface DomainEvent {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  payload: any;
  context: ServiceContext;
  timestamp: Date;
  version: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  evaluate: (context: any) => boolean | Promise<boolean>;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ServiceDependencies {
  database: any;
  cache: any;
  eventBus: any;
  logger: any;
  metrics: any;

  // Domain services
  userService?: any;
  groupService?: any;
  schoolService?: any;
  tripService?: any;
  authService?: any;
  notificationService?: any;
  validationService?: any;
  auditService?: any;
}

export abstract class BaseService {
  protected dependencies: ServiceDependencies;
  protected serviceName: string;

  constructor(dependencies: ServiceDependencies, serviceName: string) {
    this.dependencies = dependencies;
    this.serviceName = serviceName;
  }

  protected async logEvent(event: DomainEvent): Promise<void> {
    // Log domain event
    this.dependencies.logger.info('Domain event', {
      service: this.serviceName,
      event: event.type,
      entityType: event.entityType,
      entityId: event.entityId,
      userId: event.context.userId,
      timestamp: event.timestamp,
    });
  }

  protected async validateBusinessRules(
    rules: BusinessRule[],
    context: any,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      try {
        const isValid = await rule.evaluate(context);
        if (!isValid) {
          errors.push({
            field: rule.id,
            message: rule.errorMessage,
            code: rule.id,
            value: context,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.dependencies.logger.error('Business rule evaluation failed', {
          service: this.serviceName,
          rule: rule.id,
          error: errorMessage,
          context,
        });

        errors.push({
          field: rule.id,
          message: 'Business rule evaluation failed',
          code: 'RULE_EVALUATION_ERROR',
          value: context,
        });
      }
    }

    return errors;
  }

  protected createServiceResult<T>(
    success: boolean,
    data?: T,
    error?: string,
    warnings?: string[],
  ): ServiceResult<T> {
    return {
      success,
      data,
      error,
      warnings,
      metadata: {
        executionTime: Date.now(),
        timestamp: new Date(),
        version: '1.0.0',
      },
    };
  }

  protected generateId(): string {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async publishEvent(
    event: Omit<DomainEvent, 'id' | 'timestamp' | 'version'>,
  ): Promise<void> {
    const fullEvent: DomainEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
      version: 1,
    };

    await this.logEvent(fullEvent);

    // Publish to event bus if available
    if (this.dependencies.eventBus) {
      await this.dependencies.eventBus.publish(fullEvent);
    }
  }

  protected createErrorResult<T>(error: string, warnings?: string[]): ServiceResult<T> {
    return {
      success: false,
      data: undefined as any,
      error,
      warnings,
      metadata: {
        executionTime: Date.now(),
        timestamp: new Date(),
        version: '1.0.0',
      },
    };
  }

  protected createSuccessResult<T>(data: T, warnings?: string[]): ServiceResult<T> {
    return {
      success: true,
      data,
      warnings,
      metadata: {
        executionTime: Date.now(),
        timestamp: new Date(),
        version: '1.0.0',
      },
    };
  }
}
