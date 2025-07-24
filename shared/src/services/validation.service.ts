/**
 * VALIDATION DOMAIN SERVICE
 *
 * Consolidated validation logic for all entities and operations.
 * This replaces the scattered validation logic found across multiple services.
 *
 * Key Features:
 * - Address validation and geocoding
 * - Business rule validation
 * - Data format validation
 * - Cross-entity validation
 * - Compliance checks
 */

import { GeographicLocation, ValidationResult, ValidationError } from '../entities';

import { BaseService, ServiceResult, ServiceContext, ServiceDependencies } from './index';

export interface ValidationServiceDependencies extends ServiceDependencies {
  geocodingService: any;
  complianceService: any;
}

export class ValidationService extends BaseService {
  constructor(dependencies: ValidationServiceDependencies) {
    super(dependencies, 'ValidationService');
  }

  /**
   * VALIDATE ADDRESS
   *
   * Validates and geocodes an address.
   */
  async validateAddress(address: string): Promise<ServiceResult<GeographicLocation>> {
    try {
      if (!address || address.trim().length === 0) {
        return this.createErrorResult('Address is required');
      }

      const cleanAddress = address.trim();

      // Basic address validation
      if (cleanAddress.length < 10) {
        return this.createErrorResult('Address is too short');
      }

      // Check for required address components
      const hasStreetNumber = /^\d+\s/.test(cleanAddress);
      const hasStreetName = /\d+\s+\w+/.test(cleanAddress);

      if (!hasStreetNumber || !hasStreetName) {
        return this.createErrorResult('Address must include street number and name');
      }

      // TODO: Implement actual geocoding service integration
      // For now, create a basic location object
      const location: GeographicLocation = {
        address: cleanAddress,
        latitude: 0,
        longitude: 0,
        zipCode: this.extractZipCode(cleanAddress),
        city: this.extractCity(cleanAddress),
        state: this.extractState(cleanAddress),
        country: 'US',
        isValidated: true,
        validationSource: 'manual',
        validatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return this.createSuccessResult(location);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Address validation failed',
      );
    }
  }

  /**
   * VALIDATE EMAIL
   *
   * Validates an email address format.
   */
  async validateEmail(email: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
        value: email,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * VALIDATE PHONE
   *
   * Validates a phone number format.
   */
  async validatePhone(phone: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      errors.push({
        field: 'phone',
        message: 'Invalid phone number format',
        code: 'INVALID_PHONE',
        value: phone,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * VALIDATE ENTITY BUSINESS RULES
   *
   * Validates business rules for an entity.
   */
  async validateEntityBusinessRules(
    entityType: string,
    entityData: any,
    operation: 'create' | 'update' | 'delete',
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      switch (entityType) {
        case 'user':
          await this.validateUserBusinessRules(entityData, operation, errors, warnings);
          break;
        case 'group':
          await this.validateGroupBusinessRules(entityData, operation, errors, warnings);
          break;
        case 'trip':
          await this.validateTripBusinessRules(entityData, operation, errors, warnings);
          break;
        case 'school':
          await this.validateSchoolBusinessRules(entityData, operation, errors, warnings);
          break;
        default:
          warnings.push({
            field: 'entityType',
            message: `Unknown entity type: ${entityType}`,
            code: 'UNKNOWN_ENTITY_TYPE',
          });
      }
    } catch (error) {
      errors.push({
        field: 'validation',
        message: 'Validation system error',
        code: 'VALIDATION_ERROR',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * VALIDATE SAFETY REQUIREMENTS
   *
   * Validates safety requirements for users and vehicles.
   */
  async validateSafetyRequirements(userId: string, vehicleId?: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // TODO: Get user data from database
      const user = await this.getUserData(userId);

      // Driver license validation
      if (user?.isDriver) {
        if (!user.driverLicense) {
          errors.push({
            field: 'driverLicense',
            message: 'Driver license is required for drivers',
            code: 'MISSING_DRIVER_LICENSE',
          });
        } else if (user.driverLicense.expirationDate < new Date()) {
          errors.push({
            field: 'driverLicense',
            message: 'Driver license has expired',
            code: 'EXPIRED_DRIVER_LICENSE',
          });
        }
      }

      // Insurance validation
      if (user?.isDriver) {
        if (!user.insurance) {
          errors.push({
            field: 'insurance',
            message: 'Insurance is required for drivers',
            code: 'MISSING_INSURANCE',
          });
        } else if (user.insurance.expirationDate < new Date()) {
          errors.push({
            field: 'insurance',
            message: 'Insurance has expired',
            code: 'EXPIRED_INSURANCE',
          });
        }
      }

      // Background check validation
      if (user?.isDriver) {
        if (!user.backgroundCheck) {
          errors.push({
            field: 'backgroundCheck',
            message: 'Background check is required for drivers',
            code: 'MISSING_BACKGROUND_CHECK',
          });
        } else if (user.backgroundCheck.status !== 'passed') {
          errors.push({
            field: 'backgroundCheck',
            message: 'Background check must be passed',
            code: 'FAILED_BACKGROUND_CHECK',
          });
        }
      }

      // Vehicle validation
      if (vehicleId) {
        const vehicle = await this.getVehicleData(vehicleId);
        if (!vehicle) {
          errors.push({
            field: 'vehicle',
            message: 'Vehicle not found',
            code: 'VEHICLE_NOT_FOUND',
          });
        } else {
          if (!vehicle.inspection || vehicle.inspection.expirationDate < new Date()) {
            errors.push({
              field: 'vehicleInspection',
              message: 'Vehicle inspection is required and must be current',
              code: 'MISSING_VEHICLE_INSPECTION',
            });
          }
        }
      }
    } catch (error) {
      errors.push({
        field: 'safety',
        message: 'Safety validation system error',
        code: 'SAFETY_VALIDATION_ERROR',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * VALIDATE COMPLIANCE
   *
   * Validates compliance with regulations and policies.
   */
  async validateCompliance(
    operation: string,
    data: any,
    context: ServiceContext,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // COPPA compliance for children
      if (data.age && data.age < 13) {
        if (!data.parentalConsent) {
          errors.push({
            field: 'parentalConsent',
            message: 'Parental consent required for children under 13',
            code: 'COPPA_VIOLATION',
          });
        }
      }

      // Privacy compliance
      if (operation === 'create' && data.entityType === 'user') {
        if (!data.privacyPolicyAccepted) {
          errors.push({
            field: 'privacyPolicyAccepted',
            message: 'Privacy policy must be accepted',
            code: 'PRIVACY_POLICY_REQUIRED',
          });
        }
      }

      // Data retention compliance
      if (operation === 'delete' && data.entityType === 'user') {
        const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (data.lastActivity && Date.now() - data.lastActivity.getTime() < retentionPeriod) {
          warnings.push({
            field: 'dataRetention',
            message: 'User data will be retained for 7 days as required by policy',
            code: 'DATA_RETENTION_NOTICE',
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'compliance',
        message: 'Compliance validation system error',
        code: 'COMPLIANCE_VALIDATION_ERROR',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * VALIDATE ENTITY
   *
   * Validates a complete entity with all its rules.
   */
  async validateEntity(
    entityType: string,
    entityData: any,
    operation: 'create' | 'update' | 'delete',
    context: ServiceContext,
  ): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    // Run all validation types
    const businessRules = await this.validateEntityBusinessRules(entityType, entityData, operation);
    const compliance = await this.validateCompliance(operation, entityData, context);

    // Combine results
    allErrors.push(...businessRules.errors);
    allErrors.push(...compliance.errors);
    allWarnings.push(...businessRules.warnings);
    allWarnings.push(...compliance.warnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  // Private helper methods
  private extractZipCode(address: string): string | undefined {
    const zipCodeRegex = /\b\d{5}(?:-\d{4})?\b/;
    const match = address.match(zipCodeRegex);
    return match ? match[0] : undefined;
  }

  private extractCity(address: string): string | undefined {
    // Basic city extraction - assumes city is before state/zip
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    return undefined;
  }

  private extractState(address: string): string | undefined {
    // Basic state extraction - assumes state is last before zip
    const stateRegex = /\b[A-Z]{2}\b/;
    const match = address.match(stateRegex);
    return match ? match[0] : undefined;
  }

  private async getUserData(userId: string): Promise<any> {
    // TODO: Implement database query for user data
    return null;
  }

  private async getVehicleData(vehicleId: string): Promise<any> {
    // TODO: Implement database query for vehicle data
    return null;
  }

  private async validateUserBusinessRules(
    userData: any,
    operation: string,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): Promise<void> {
    // Age validation
    if (userData.dateOfBirth) {
      const age = this.calculateAge(userData.dateOfBirth);
      if (age < 0 || age > 120) {
        errors.push({
          field: 'dateOfBirth',
          message: 'Invalid date of birth',
          code: 'INVALID_DATE_OF_BIRTH',
        });
      }
    }

    // Driver requirements
    if (userData.isDriver) {
      if (!userData.age || userData.age < 18) {
        errors.push({
          field: 'age',
          message: 'Drivers must be at least 18 years old',
          code: 'DRIVER_AGE_REQUIREMENT',
        });
      }
    }
  }

  private async validateGroupBusinessRules(
    groupData: any,
    operation: string,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): Promise<void> {
    // Group size limits
    if (groupData.members && groupData.members.length > 20) {
      errors.push({
        field: 'members',
        message: 'Group cannot exceed 20 members',
        code: 'GROUP_SIZE_LIMIT',
      });
    }

    // Driver requirements
    const drivers = groupData.members?.filter((m: any) => m.isDriver) || [];
    if (drivers.length === 0) {
      errors.push({
        field: 'drivers',
        message: 'Group must have at least one driver',
        code: 'MISSING_DRIVER',
      });
    }
  }

  private async validateTripBusinessRules(
    tripData: any,
    operation: string,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): Promise<void> {
    // Trip timing validation
    if (tripData.scheduledTime) {
      const tripTime = new Date(tripData.scheduledTime);
      const now = new Date();

      if (tripTime < now) {
        errors.push({
          field: 'scheduledTime',
          message: 'Trip cannot be scheduled in the past',
          code: 'PAST_TRIP_TIME',
        });
      }
    }

    // Capacity validation
    if (tripData.passengers && tripData.vehicle) {
      if (tripData.passengers.length > tripData.vehicle.capacity) {
        errors.push({
          field: 'passengers',
          message: 'Trip exceeds vehicle capacity',
          code: 'CAPACITY_EXCEEDED',
        });
      }
    }
  }

  private async validateSchoolBusinessRules(
    schoolData: any,
    operation: string,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): Promise<void> {
    // School address validation
    if (!schoolData.address) {
      errors.push({
        field: 'address',
        message: 'School address is required',
        code: 'MISSING_SCHOOL_ADDRESS',
      });
    }

    // Contact information validation
    if (!schoolData.contactEmail && !schoolData.contactPhone) {
      errors.push({
        field: 'contact',
        message: 'School must have at least one contact method',
        code: 'MISSING_CONTACT_INFO',
      });
    }
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}
