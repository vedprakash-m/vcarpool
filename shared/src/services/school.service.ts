/**
 * SCHOOL DOMAIN SERVICE
 *
 * Consolidated business logic for school management.
 * This replaces the scattered school logic found across multiple services.
 *
 * Key Features:
 * - School directory management
 * - Zone and boundary management
 * - Pickup/dropoff location management
 * - Safety zone validation
 * - Administrative oversight
 */

import {
  SchoolEntity,
  CreateSchoolRequest,
  UpdateSchoolRequest,
  SchoolQueryFilters,
  SchoolWithRelationships,
  SchoolStatus,
  SchoolTransportationZone,
  ValidationResult,
  PickupLocation,
  SchoolZone,
} from '../entities';

import {
  BaseService,
  ServiceResult,
  ServiceContext,
  DomainEvent,
  ValidationError,
  BusinessRule,
  ServiceDependencies,
} from './index';

export interface SchoolServiceDependencies extends ServiceDependencies {
  validationService: any;
  notificationService: any;
}

export class SchoolService extends BaseService {
  constructor(dependencies: SchoolServiceDependencies) {
    super(dependencies, 'SchoolService');
  }

  /**
   * CREATE SCHOOL
   *
   * Creates a new school with validation and safety checks.
   */
  async createSchool(
    request: CreateSchoolRequest,
    context: ServiceContext,
  ): Promise<ServiceResult<SchoolEntity>> {
    try {
      // Validate request
      const validation = await this.validateCreateSchoolRequest(request);
      if (!validation.isValid) {
        return this.createErrorResult(
          'Validation failed: ' + validation.errors.map((e) => e.message).join(', '),
        );
      }

      // Check business rules
      const ruleCheck = await this.checkSchoolCreationRules(request, context);
      if (!ruleCheck.success) {
        return this.createErrorResult(ruleCheck.error || 'Rule check failed');
      }

      // Create school entity
      const school: SchoolEntity = {
        id: this.generateId(),
        name: request.name,
        fullName: request.fullName,
        shortName: request.name.substring(0, 10),
        schoolCode: request.schoolCode,
        districtId: request.districtId,
        districtName: request.districtName,
        type: request.type,
        status: 'pending' as SchoolStatus,
        location: {
          address: request.address,
          city: '',
          state: '',
          zipCode: '',
          country: 'US',
          latitude: 0,
          longitude: 0,
          isValidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        transportationZones: [],
        serviceArea: {
          radiusMiles: 10,
        },
        gradesServed: request.gradesServed,
        studentCapacity: request.studentCapacity,
        currentEnrollment: 0,
        academicYear: {
          startDate: new Date(),
          endDate: new Date(),
          yearName: '2024-2025',
        },
        regularSchedule: request.regularSchedule,
        specialSchedules: [],
        calendarEvents: [],
        contactInfo: {
          primaryPhone: request.primaryContactPhone,
          primaryPhoneVerified: false,
          primaryEmail: request.primaryContactEmail || '',
          primaryEmailVerified: false,
          secondaryPhoneVerified: false,
          secondaryEmailVerified: false,
          preferredContactMethod: 'email',
          canReceiveSMS: false,
          canReceiveEmailNotifications: true,
          canReceivePushNotifications: true,
          verificationAttempts: 0,
        },
        contacts: [
          {
            role: 'principal',
            name: request.primaryContactName,
            email: request.primaryContactEmail,
            phone: request.primaryContactPhone,
            isActive: true,
          },
        ],
        operatingHours: {
          timeZone: 'America/New_York',
          schedule: {
            monday: { open: '08:00', close: '15:00', isClosed: false },
            tuesday: { open: '08:00', close: '15:00', isClosed: false },
            wednesday: { open: '08:00', close: '15:00', isClosed: false },
            thursday: { open: '08:00', close: '15:00', isClosed: false },
            friday: { open: '08:00', close: '15:00', isClosed: false },
            saturday: { open: '08:00', close: '15:00', isClosed: true },
            sunday: { open: '08:00', close: '15:00', isClosed: true },
          },
          holidays: [],
          lastUpdated: new Date(),
          updatedBy: request.createdBy,
        },
        safetyInformation: {
          emergencyContactName: request.emergencyContactName,
          emergencyContactPhone: request.emergencyContactPhone,
          visitorCheckInRequired: true,
          backgroundCheckRequired: true,
          idVerificationRequired: true,
          pickupRules: [],
          dropoffRules: [],
          authorizedPickupRequired: true,
        },
        carpoolSettings: {
          isParticipating: true,
          requiresApproval: false,
          notificationPreferences: {
            scheduleChanges: true,
            emergencyAlerts: true,
            groupUpdates: true,
          },
        },
        externalSystems: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: request.createdBy,
        lastModifiedBy: request.createdBy,
        version: 1,
        isVerified: false,
        dataSource: request.dataSource,
      };

      // Save to database
      const savedSchool = await this.dependencies.database.schools.create(school);

      // Send event
      await this.publishEvent({
        type: 'SCHOOL_CREATED',
        entityType: 'School',
        entityId: savedSchool.id,
        payload: savedSchool,
        context,
      });

      return this.createSuccessResult(savedSchool);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * UPDATE SCHOOL
   *
   * Updates an existing school with validation and permission checks.
   */
  async updateSchool(
    schoolId: string,
    request: UpdateSchoolRequest,
    context: ServiceContext,
  ): Promise<ServiceResult<SchoolEntity>> {
    try {
      // Check permissions
      const hasPermission = await this.checkSchoolPermission(schoolId, context.userId, 'update');
      if (!hasPermission) {
        return this.createErrorResult('Insufficient permissions to update school');
      }

      // Get existing school
      const existingSchool = await this.dependencies.database.schools.findById(schoolId);
      if (!existingSchool) {
        return this.createErrorResult('School not found');
      }

      // Validate request
      const validation = await this.validateUpdateSchoolRequest(request, existingSchool);
      if (!validation.isValid) {
        return this.createErrorResult(
          'Validation failed: ' + validation.errors.map((e) => e.message).join(', '),
        );
      }

      // Update school
      const updatedSchool = {
        ...existingSchool,
        ...request,
        metadata: {
          ...existingSchool.metadata,
          updatedAt: new Date(),
          updatedBy: context.userId,
          version: existingSchool.metadata.version + 1,
        },
      };

      // Save changes
      const savedSchool = await this.dependencies.database.schools.update(schoolId, updatedSchool);

      // Send event
      await this.publishEvent({
        type: 'SCHOOL_UPDATED',
        entityType: 'School',
        entityId: schoolId,
        payload: { before: existingSchool, after: savedSchool },
        context,
      });

      return this.createSuccessResult(savedSchool);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * GET SCHOOL BY ID
   *
   * Retrieves a school with optional relationship data.
   */
  async getSchoolById(
    schoolId: string,
    context?: ServiceContext,
    includeRelationships = false,
  ): Promise<ServiceResult<SchoolEntity | SchoolWithRelationships>> {
    try {
      // Get school
      const school = await this.dependencies.database.schools.findById(schoolId);
      if (!school) {
        return this.createErrorResult('School not found');
      }

      if (includeRelationships) {
        const schoolWithRelationships = await this.loadSchoolRelationships(school);
        return this.createSuccessResult(schoolWithRelationships);
      }

      return this.createSuccessResult(school);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * SEARCH SCHOOLS
   *
   * Searches for schools with filtering and pagination.
   */
  async searchSchools(
    filters: SchoolQueryFilters,
    context?: ServiceContext,
  ): Promise<ServiceResult<SchoolEntity[]>> {
    try {
      // Search database
      const schools = await this.dependencies.database.schools.search(filters);

      return this.createSuccessResult(schools);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * ADD PICKUP LOCATION
   *
   * Adds a new pickup location to a school.
   */
  async addPickupLocation(
    schoolId: string,
    location: PickupLocation,
    context: ServiceContext,
  ): Promise<ServiceResult<SchoolEntity>> {
    try {
      // Check permissions
      const hasPermission = await this.checkSchoolPermission(
        schoolId,
        context.userId,
        'manage_locations',
      );
      if (!hasPermission) {
        return this.createErrorResult('Insufficient permissions to manage pickup locations');
      }

      // Get existing school
      const school = await this.dependencies.database.schools.findById(schoolId);
      if (!school) {
        return this.createErrorResult('School not found');
      }

      // Validate location
      const validation = await this.validatePickupLocation(location);
      if (!validation.isValid) {
        return this.createErrorResult(
          'Validation failed: ' + validation.errors.map((e) => e.message).join(', '),
        );
      }

      // Add location
      const updatedSchool = {
        ...school,
        pickupLocations: [...school.pickupLocations, location],
        metadata: {
          ...school.metadata,
          updatedAt: new Date(),
          updatedBy: context.userId,
          version: school.metadata.version + 1,
        },
      };

      // Save changes
      const savedSchool = await this.dependencies.database.schools.update(schoolId, updatedSchool);

      // Send event
      await this.publishEvent({
        type: 'PICKUP_LOCATION_ADDED',
        entityType: 'School',
        entityId: schoolId,
        payload: { school: savedSchool, location },
        context,
      });

      return this.createSuccessResult(savedSchool);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * VALIDATE ADDRESS IN SCHOOL ZONE
   *
   * Validates if an address is within a school's service zone.
   */
  async validateAddressInZone(
    schoolId: string,
    address: string,
    context?: ServiceContext,
  ): Promise<ServiceResult<{ isValid: boolean; zone?: SchoolZone }>> {
    try {
      // Get school
      const school = await this.dependencies.database.schools.findById(schoolId);
      if (!school) {
        return this.createErrorResult('School not found');
      }

      // Validate address
      const addressValidation = await this.dependencies.validationService.validateAddress(address);
      if (!addressValidation.success) {
        return this.createErrorResult('Invalid address');
      }

      // Check zones
      for (const zone of school.zones) {
        const inZone = await this.isAddressInZone(addressValidation.data, zone);
        if (inZone) {
          return this.createSuccessResult({ isValid: true, zone });
        }
      }

      return this.createSuccessResult({ isValid: false });
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * GET SCHOOLS BY DISTRICT
   *
   * Gets all schools in a specific district.
   */
  async getSchoolsByDistrict(
    district: string,
    context?: ServiceContext,
  ): Promise<ServiceResult<SchoolEntity[]>> {
    try {
      const schools = await this.dependencies.database.schools.findByDistrict(district);
      return this.createSuccessResult(schools);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * GET NEARBY SCHOOLS
   *
   * Gets schools within a specified radius of a location.
   */
  async getNearbySchools(
    latitude: number,
    longitude: number,
    radiusKm: number,
    context?: ServiceContext,
  ): Promise<ServiceResult<SchoolEntity[]>> {
    try {
      const schools = await this.dependencies.database.schools.findNearby(
        latitude,
        longitude,
        radiusKm,
      );
      return this.createSuccessResult(schools);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Private helper methods
  private async validateCreateSchoolRequest(
    request: CreateSchoolRequest,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!request.name || request.name.trim().length < 3) {
      errors.push({
        field: 'name',
        message: 'School name must be at least 3 characters long',
        code: 'INVALID_NAME',
      });
    }

    if (!request.address) {
      errors.push({
        field: 'address',
        message: 'School address is required',
        code: 'MISSING_ADDRESS',
      });
    }

    if (!request.districtId) {
      errors.push({
        field: 'district',
        message: 'School district is required',
        code: 'MISSING_DISTRICT',
      });
    }

    return {
      warnings: [],
      isValid: errors.length === 0,
      errors,
    };
  }

  private async validateUpdateSchoolRequest(
    request: UpdateSchoolRequest,
    existing: SchoolEntity,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (request.name && request.name.trim().length < 3) {
      errors.push({
        field: 'name',
        message: 'School name must be at least 3 characters long',
        code: 'INVALID_NAME',
      });
    }

    return {
      warnings: [],
      isValid: errors.length === 0,
      errors,
    };
  }

  private async validatePickupLocation(location: PickupLocation): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!location.name || location.name.trim().length < 3) {
      errors.push({
        field: 'name',
        message: 'Pickup location name must be at least 3 characters long',
        code: 'INVALID_NAME',
      });
    }

    if (!location.address) {
      errors.push({
        field: 'address',
        message: 'Pickup location address is required',
        code: 'MISSING_ADDRESS',
      });
    }

    if (!location.location || !location.location.latitude || !location.location.longitude) {
      errors.push({
        field: 'location',
        message: 'Pickup location coordinates are required',
        code: 'MISSING_COORDINATES',
      });
    }

    return {
      warnings: [],
      isValid: errors.length === 0,
      errors,
    };
  }

  private async checkSchoolCreationRules(
    request: CreateSchoolRequest,
    context: ServiceContext,
  ): Promise<ServiceResult<void>> {
    // Check if school name already exists in district
    const existingSchool = await this.dependencies.database.schools.findByNameAndDistrict(
      request.name,
      request.districtId,
    );
    if (existingSchool) {
      return this.createErrorResult('School with this name already exists in the district');
    }

    return this.createSuccessResult(undefined as any as void);
  }

  private async checkSchoolPermission(
    schoolId: string,
    userId: string,
    permission: string,
  ): Promise<boolean> {
    // Check if user is system admin or school admin
    const userRole = await this.dependencies.database.userRoles.findByUserId(userId);
    return userRole && ['system_admin', 'school_admin'].includes(userRole.role);
  }

  private async loadSchoolRelationships(school: SchoolEntity): Promise<SchoolWithRelationships> {
    const [groups, activeTrips] = await Promise.all([
      this.dependencies.database.groups.findBySchoolId(school.id),
      this.dependencies.database.trips.findActiveBySchoolId(school.id),
    ]);

    return {
      ...school,
      carpoolGroups: groups || [],
      statistics: {
        totalCarpoolGroups: groups?.length || 0,
        activeCarpoolGroups: groups?.filter((g: any) => g.isActive).length || 0,
        totalCarpoolMembers: 0,
        totalChildrenServed: 0,
        averageGroupSize: 0,
        totalTripsCompleted: 0,
      },
      district: undefined,
    };
  }

  private async isAddressInZone(address: any, zone: SchoolZone): Promise<boolean> {
    // Implement zone validation logic
    // This could involve polygon containment checks, distance calculations, etc.
    // For now, return a simple implementation
    return true; // Placeholder
  }

  private getDefaultSafetySettings(): any {
    return {
      warnings: [],
      requireBackgroundCheck: true,
      requireInsurance: true,
      requireEmergencyContact: true,
      maxChildrenPerVehicle: 4,
      requireChildSeats: true,
      prohibitedAreas: [],
      speedLimits: {
        schoolZone: 25,
        residential: 35,
        highway: 65,
      },
    };
  }
}
