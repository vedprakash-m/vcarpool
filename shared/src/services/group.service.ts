/**
 * GROUP DOMAIN SERVICE
 *
 * Consolidated business logic for carpool group management.
 * This replaces the scattered group logic found across multiple services.
 *
 * Key Features:
 * - Group lifecycle management
 * - Member management
 * - Route optimization
 * - Scheduling coordination
 * - Safety compliance
 * - Admin oversight
 */

import {
  GroupEntity,
  GroupMember,
  GroupStatus,
  CreateGroupRequest,
  UpdateGroupRequest,
  GroupQueryFilters,
  GroupWithRelationships,
  ValidationResult,
  ValidationError,
  GeographicLocation,
} from '../entities';

import {
  BaseService,
  ServiceResult,
  ServiceContext,
  DomainEvent,
  BusinessRule,
  ServiceDependencies,
} from './index';

export interface GroupServiceDependencies extends ServiceDependencies {
  userService: any;
  schoolService: any;
  tripService: any;
  notificationService: any;
}

export class GroupService extends BaseService {
  constructor(dependencies: GroupServiceDependencies) {
    super(dependencies, 'GroupService');
  }

  /**
   * CREATE GROUP
   *
   * Creates a new carpool group with validation and safety checks.
   */
  async createGroup(
    request: CreateGroupRequest,
    context: ServiceContext,
  ): Promise<ServiceResult<GroupEntity>> {
    try {
      // Validate request
      const validation = await this.validateCreateGroupRequest(request);
      if (!validation.isValid) {
        return this.createErrorResult(
          'Validation failed: ' + validation.errors.map((e) => e.message).join(', '),
        );
      }

      // Check business rules
      const ruleCheck = await this.checkGroupCreationRules(request, context);
      if (!ruleCheck.success) {
        return this.createErrorResult(ruleCheck.error || 'Rule check failed');
      }

      // Create group entity
      const group: GroupEntity = {
        id: this.generateId(),
        name: request.name,
        description: request.description,
        groupAdminId: context.userId,
        groupAdminName: '', // Will be populated from user service
        coAdminIds: [],
        targetSchoolId: request.targetSchoolId,
        targetSchoolName: '', // Will be populated from school service
        targetSchoolAddress: '', // Will be populated from school service
        serviceArea: {
          centerLocation: {
            address: request.serviceArea.centerAddress,
            latitude: 0,
            longitude: 0,
            zipCode: '',
            city: '',
            state: '',
            country: '',
            formattedAddress: request.serviceArea.centerAddress,
            isValidated: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          radiusMiles: request.serviceArea.radiusMiles,
          includedZipCodes: request.serviceArea.includeZipCodes || [],
          excludeZipCodes: request.serviceArea.excludeZipCodes || [],
          boundaryPolygon: [],
          isValidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        schedule: {
          operatingDays: request.operatingDays,
          morningPickup: request.morningPickup
            ? {
                ...request.morningPickup,
                isActive: true,
              }
            : undefined,
          afternoonDropoff: request.afternoonDropoff
            ? {
                ...request.afternoonDropoff,
                isActive: true,
              }
            : undefined,
          specialSchedules: [],
          exceptions: [],
          preferenceCollection: {
            isEnabled: true,
            collectionDay: 'sunday',
            collectionTime: '18:00',
            reminderHours: [48, 24, 6],
            cutoffHours: 12,
          },
          scheduleGeneration: {
            isAutomatic: true,
            generationDay: 'sunday',
            generationTime: '20:00',
            publishImmediately: false,
            requiresApproval: true,
          },
          lastUpdated: new Date(),
          updatedBy: context.userId,
        },
        members: [],
        maxMembers: request.maxMembers || 8,
        maxChildren: request.maxChildren || 12,
        pendingInvitations: [],
        joinRequests: [],
        settings: {
          isPublic: false,
          isAcceptingMembers: true,
          requiresApproval: true,
          allowSelfJoin: false,
          allowedGrades: [],
          backgroundCheckRequired: false,
          identityVerificationRequired: false,
          emergencyContactRequired: true,
          licenseVerificationRequired: true,
          insuranceVerificationRequired: true,
          vehicleInspectionRequired: false,
          notificationPreferences: {
            email: {
              enabled: true,
              frequency: 'immediate',
              types: ['group_update'],
            },
            sms: {
              enabled: true,
              frequency: 'immediate',
              types: ['group_update'],
            },
            push: {
              enabled: true,
              frequency: 'immediate',
              types: ['group_update'],
            },
            quietHours: {
              enabled: false,
              startTime: '22:00',
              endTime: '07:00',
              timeZone: 'America/Los_Angeles',
            },
            emergencyOverride: true,
            lastUpdated: new Date(),
            updatedBy: context.userId,
          },
          communicationChannels: ['email', 'app'],
        },
        status: 'forming' as GroupStatus,
        lifecycleHistory: [],
        activityMetrics: {
          totalMembers: 0,
          activeMembers: 0,
          totalChildren: 0,
          activeDrivers: 0,
          lastPreferenceSubmission: undefined,
          lastScheduleGeneration: undefined,
          lastMemberActivity: undefined,
          lastTripCompleted: undefined,
          averagePreferenceSubmissionRate: 0,
          averageTripCompletionRate: 0,
          memberSatisfactionScore: undefined,
          consecutiveInactiveWeeks: 0,
          inactivityDetectedAt: undefined,
          healthScore: 80,
          healthStatus: 'good',
          isAtRisk: false,
          riskFactors: [],
          lastCalculated: new Date(),
          calculatedBy: context.userId,
        },

        // === MISSING PROPERTIES ===
        inactivityWarningsSent: 0,
        auditLog: [],
        createdBy: context.userId,
        lastModifiedBy: context.userId,
        version: 1,
        lastSchemaUpdate: new Date(),

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      const savedGroup = await this.dependencies.database.groups.create(group);

      // Create membership for creator
      await this.addGroupMember(savedGroup.id, context.userId, 'owner', context);

      // Send event
      await this.publishEvent({
        type: 'GROUP_CREATED',
        entityType: 'Group',
        entityId: savedGroup.id,
        payload: savedGroup,
        context,
      });

      return this.createSuccessResult(savedGroup);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * UPDATE GROUP
   *
   * Updates an existing group with validation and permission checks.
   */
  async updateGroup(
    groupId: string,
    request: UpdateGroupRequest,
    context: ServiceContext,
  ): Promise<ServiceResult<GroupEntity>> {
    try {
      // Check permissions
      const hasPermission = await this.checkGroupPermission(groupId, context.userId, 'update');
      if (!hasPermission) {
        return this.createErrorResult('Insufficient permissions to update group');
      }

      // Get existing group
      const existingGroup = await this.dependencies.database.groups.findById(groupId);
      if (!existingGroup) {
        return this.createErrorResult('Group not found');
      }

      // Validate request
      const validation = await this.validateUpdateGroupRequest(request, existingGroup);
      if (!validation.isValid) {
        return this.createErrorResult(
          'Validation failed: ' + validation.errors.map((e) => e.message).join(', '),
        );
      }

      // Update group
      const updatedGroup = {
        ...existingGroup,
        ...request,
        metadata: {
          ...existingGroup.metadata,
          updatedAt: new Date(),
          updatedBy: context.userId,
          version: existingGroup.metadata.version + 1,
        },
      };

      // Save changes
      const savedGroup = await this.dependencies.database.groups.update(groupId, updatedGroup);

      // Send event
      await this.publishEvent({
        type: 'GROUP_UPDATED',
        entityType: 'Group',
        entityId: groupId,
        payload: { before: existingGroup, after: savedGroup },
        context,
      });

      return this.createSuccessResult(savedGroup);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * DELETE GROUP
   *
   * Soft deletes a group and handles cleanup.
   */
  async deleteGroup(groupId: string, context: ServiceContext): Promise<ServiceResult<void>> {
    try {
      // Check permissions
      const hasPermission = await this.checkGroupPermission(groupId, context.userId, 'delete');
      if (!hasPermission) {
        return this.createErrorResult('Insufficient permissions to delete group');
      }

      // Get existing group
      const existingGroup = await this.dependencies.database.groups.findById(groupId);
      if (!existingGroup) {
        return this.createErrorResult('Group not found');
      }

      // Check if group can be deleted
      const canDelete = await this.checkGroupDeletionRules(existingGroup, context);
      if (!canDelete.success) {
        return canDelete;
      }

      // Soft delete
      await this.dependencies.database.groups.softDelete(groupId, context.userId);

      // Cleanup related data
      await this.cleanupGroupData(groupId, context);

      // Send event
      await this.publishEvent({
        type: 'GROUP_DELETED',
        entityType: 'Group',
        entityId: groupId,
        payload: existingGroup,
        context,
      });

      return this.createSuccessResult(undefined as any as void);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * GET GROUP BY ID
   *
   * Retrieves a group with optional relationship data.
   */
  async getGroupById(
    groupId: string,
    context: ServiceContext,
    includeRelationships = false,
  ): Promise<ServiceResult<GroupEntity | GroupWithRelationships>> {
    try {
      // Check permissions
      const hasPermission = await this.checkGroupPermission(groupId, context.userId, 'read');
      if (!hasPermission) {
        return this.createErrorResult('Insufficient permissions to view group');
      }

      // Get group
      const group = await this.dependencies.database.groups.findById(groupId);
      if (!group) {
        return this.createErrorResult('Group not found');
      }

      if (includeRelationships) {
        const groupWithRelationships = await this.loadGroupRelationships(group);
        return this.createSuccessResult(groupWithRelationships);
      }

      return this.createSuccessResult(group);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * SEARCH GROUPS
   *
   * Searches for groups with filtering and pagination.
   */
  async searchGroups(
    filters: GroupQueryFilters,
    context: ServiceContext,
  ): Promise<ServiceResult<GroupEntity[]>> {
    try {
      // Apply permission-based filtering
      const permissionFilters = await this.applyPermissionFilters(filters, context);

      // Search database
      const groups = await this.dependencies.database.groups.search(permissionFilters);

      return this.createSuccessResult(groups);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * ADD GROUP MEMBER
   *
   * Adds a member to a group with role assignment.
   */
  async addGroupMember(
    groupId: string,
    userId: string,
    role: string,
    context: ServiceContext,
  ): Promise<ServiceResult<GroupMember>> {
    try {
      // Check permissions
      const hasPermission = await this.checkGroupPermission(
        groupId,
        context.userId,
        'manage_members',
      );
      if (!hasPermission) {
        return this.createErrorResult('Insufficient permissions to add group members');
      }

      // Validate user exists
      const user = await this.dependencies.userService.getUserById(userId);
      if (!user.success) {
        return this.createErrorResult('User not found');
      }

      // Check if already member
      const existingMembership =
        await this.dependencies.database.groupMemberships.findByGroupAndUser(groupId, userId);
      if (existingMembership) {
        return this.createErrorResult('User is already a member of this group');
      }

      // Create membership
      const membership: GroupMember = {
        id: this.generateId(),
        groupId,
        userId,
        role: role as any, // FIXME: proper role validation needed
        status: 'active',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        children: [],
        metrics: {
          totalTripsCompleted: 0,
          totalTripsAsDriver: 0,
          totalTripsAsPassenger: 0,
          reliabilityScore: 100,
          lastTripDate: undefined,
          lastPreferenceSubmission: undefined,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save membership
      const savedMembership = await this.dependencies.database.groupMemberships.create(membership);

      // Send event
      await this.publishEvent({
        type: 'GROUP_MEMBER_ADDED',
        entityType: 'GroupMembership',
        entityId: savedMembership.id,
        payload: savedMembership,
        context,
      });

      return this.createSuccessResult(savedMembership);
    } catch (error) {
      return this.createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Private helper methods
  private async validateCreateGroupRequest(request: CreateGroupRequest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!request.name || request.name.trim().length < 3) {
      errors.push({
        field: 'name',
        message: 'Group name must be at least 3 characters long',
        code: 'INVALID_NAME',
      });
    }

    if (!request.schoolId) {
      errors.push({
        field: 'schoolId',
        message: 'School ID is required',
        code: 'MISSING_SCHOOL_ID',
      });
    }

    return {
      warnings: [],
      isValid: errors.length === 0,
      errors,
    };
  }

  private async validateUpdateGroupRequest(
    request: UpdateGroupRequest,
    existing: GroupEntity,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (request.name && request.name.trim().length < 3) {
      errors.push({
        field: 'name',
        message: 'Group name must be at least 3 characters long',
        code: 'INVALID_NAME',
      });
    }

    return {
      warnings: [],
      isValid: errors.length === 0,
      errors,
    };
  }

  private async checkGroupCreationRules(
    request: CreateGroupRequest,
    context: ServiceContext,
  ): Promise<ServiceResult<void>> {
    // Check if user can create groups
    const userGroupCount = await this.dependencies.database.groups.countByCreator(context.userId);
    if (userGroupCount >= 5) {
      return this.createErrorResult('Maximum number of groups reached');
    }

    // Check school exists
    const school = await this.dependencies.schoolService.getSchoolById(request.schoolId);
    if (!school.success) {
      return this.createErrorResult('Invalid school ID');
    }

    return this.createSuccessResult(undefined as any as void);
  }

  private async checkGroupDeletionRules(
    group: GroupEntity,
    context: ServiceContext,
  ): Promise<ServiceResult<void>> {
    // Check if group has active trips
    const activeTrips = await this.dependencies.tripService.getActiveTripsForGroup(group.id);
    if (activeTrips.data && activeTrips.data.length > 0) {
      return this.createErrorResult('Cannot delete group with active trips');
    }

    return this.createSuccessResult(undefined as any as void);
  }

  private async checkGroupPermission(
    groupId: string,
    userId: string,
    permission: string,
  ): Promise<boolean> {
    const membership = await this.dependencies.database.groupMemberships.findByGroupAndUser(
      groupId,
      userId,
    );
    if (!membership) {
      return false;
    }

    // Define permission hierarchy
    const permissions: Record<string, string[]> = {
      read: ['member', 'admin', 'owner'],
      update: ['admin', 'owner'],
      delete: ['owner'],
      manage_members: ['admin', 'owner'],
    };

    return permissions[permission]?.includes(membership.role) || false;
  }

  private async loadGroupRelationships(group: GroupEntity): Promise<GroupWithRelationships> {
    const [members, school, trips] = await Promise.all([
      this.dependencies.database.groupMemberships.findByGroupId(group.id),
      this.dependencies.schoolService.getSchoolById(group.targetSchoolId),
      this.dependencies.tripService.getTripsByGroupId(group.id),
    ]);

    return {
      ...group,
      // We need to implement proper relationship loading
      groupAdmin: {
        id: group.groupAdminId,
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: undefined,
        isActive: true,
      },
      coAdmins: [],
      targetSchool: {
        id: group.targetSchoolId,
        name: group.targetSchoolName,
        address: group.targetSchoolAddress,
        location: {
          address: group.targetSchoolAddress,
          latitude: 0,
          longitude: 0,
          zipCode: '',
          city: '',
          state: '',
          country: '',
          formattedAddress: group.targetSchoolAddress,
          isValidated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        district: undefined,
        type: '',
        grades: [],
      },
      statistics: {
        totalMembers: group.activityMetrics.totalMembers,
        activeMembers: group.activityMetrics.activeMembers,
        totalChildren: group.activityMetrics.totalChildren,
        activeDrivers: group.activityMetrics.activeDrivers,
        averageRating: group.activityMetrics.memberSatisfactionScore || 0,
        totalTripsCompleted: 0,
        upcomingTrips: 0,
        pendingInvitations: group.pendingInvitations.length,
        pendingJoinRequests: group.joinRequests.length,
      },
    };
  }

  private async applyPermissionFilters(
    filters: GroupQueryFilters,
    context: ServiceContext,
  ): Promise<GroupQueryFilters> {
    // Apply user-specific filters based on permissions
    return {
      ...filters,
      // Add user-specific constraints
    };
  }

  private async cleanupGroupData(groupId: string, context: ServiceContext): Promise<void> {
    // Remove memberships
    await this.dependencies.database.groupMemberships.deleteByGroupId(groupId);

    // Cancel future trips
    await this.dependencies.tripService.cancelTripsByGroupId(groupId, context);

    // Send notifications
    await this.dependencies.notificationService.sendGroupDeletionNotification(groupId, context);
  }

  private getDefaultGroupSettings(): GroupSettings {
    return {
      maxMembers: 8,
      requireApproval: true,
      allowGuestInvites: false,
      autoScheduling: true,
      emergencyContactRequired: true,
      backgroundCheckRequired: true,
      insuranceRequired: true,
      notificationSettings: {
        email: true,
        sms: true,
        push: true,
      },
    };
  }
}

// Legacy types for compatibility
type GroupSettings = {
  maxMembers: number;
  requireApproval: boolean;
  allowGuestInvites: boolean;
  autoScheduling: boolean;
  emergencyContactRequired: boolean;
  backgroundCheckRequired: boolean;
  insuranceRequired: boolean;
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
};
