/**
 * Scheduling Domain Service
 *
 * Consolidates all scheduling-related business logic that was previously scattered
 * across multiple Azure Functions:
 * - admin-weekly-scheduling
 * - admin-generate-schedule-simple
 * - parents-weekly-preferences-simple
 * - admin-assignment-reminders
 * - admin-prefs-status
 * - fairness-tracking
 *
 * This service provides a unified interface for all scheduling operations,
 * including preference collection, schedule generation, and fairness tracking.
 */

import {
  UserEntity,
  GroupEntity,
  TripEntity,
  UserRole,
  PreferenceEntity,
  ScheduleEntity,
} from '@carpool/shared';
import { databaseService } from '../database.service';
import { tripDomainService } from './trip-domain.service';
import { ILogger } from '../../utils/logger';
import { Errors } from '../../utils/error-handler';
import { v4 as uuidv4 } from 'uuid';

// Export types for tests
export interface ScheduleGenerationRequest {
  groupId: string;
  weekStartDate: Date;
  requesterId: string;
  forceRegeneration?: boolean;
}

export interface PreferenceCollectionRequest {
  groupId: string;
  weekStartDate: Date;
  preferences: {
    [dayOfWeek: string]: {
      canDrive: boolean;
      canPassenger: boolean;
      preferredPickupTime?: string;
      preferredDropoffTime?: string;
      notes?: string;
    };
  };
  userId: string;
}

export interface ScheduleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: Array<{
    type: string;
    description: string;
    affectedUsers: string[];
  }>;
}

export interface ScheduleServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WeeklyPreference {
  id: string;
  userId: string;
  groupId: string;
  weekStartDate: Date;
  preferences: {
    [dayOfWeek: string]: {
      canDrive: boolean;
      canPassenger: boolean;
      preferredPickupTime?: string;
      preferredDropoffTime?: string;
      notes?: string;
    };
  };
  submittedAt: Date;
  status: 'pending' | 'submitted' | 'processed';
}

export interface WeeklySchedule {
  id: string;
  groupId: string;
  weekStartDate: Date;
  assignments: ScheduleAssignment[];
  generatedAt: Date;
  generatedBy: string;
  status: 'draft' | 'published' | 'archived';
  fairnessScore: number;
  notes?: string;
}

export interface ScheduleAssignment {
  id: string;
  dayOfWeek: number; // 0 = Monday, 4 = Friday
  date: Date;
  driverId: string;
  passengers: string[];
  scheduledStartTime: string;
  scheduledEndTime: string;
  estimatedDistance: number;
  fairnessImpact: number;
}

export interface LocalFairnessMetrics {
  userId: string;
  userName: string;
  totalAssignments: number;
  drivingAssignments: number;
  passengerAssignments: number;
  fairnessScore: number;
  fairnessDebt: number; // Negative means owes driving, positive means deserves rest
  weeklyCapacity: {
    canDrive: number;
    canPassenger: number;
  };
}

export interface ScheduleGenerationOptions {
  groupId: string;
  weekStartDate: Date;
  considerFairness: boolean;
  prioritizePreferences: boolean;
  allowPartialGeneration: boolean;
  notifyParticipants: boolean;
  dryRun?: boolean;
}

export interface ScheduleServiceResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  warnings?: string[];
}

export class SchedulingDomainService {
  private logger: ILogger;
  private inMemoryPreferences: Map<string, WeeklyPreference> = new Map();
  private inMemorySchedules: Map<string, WeeklySchedule> = new Map();
  private inMemoryFairnessMetrics: Map<string, LocalFairnessMetrics[]> = new Map();

  constructor(logger?: ILogger) {
    this.logger = logger || {
      debug: (msg: string, data?: any) => console.debug(msg, data),
      info: (msg: string, data?: any) => console.info(msg, data),
      warn: (msg: string, data?: any) => console.warn(msg, data),
      error: (msg: string, error?: any) => console.error(msg, error),
      setContext: () => {},
      child: () => this.logger,
      startTimer: (label: string) => {
        const start = Date.now();
        return () => {
          const elapsed = Date.now() - start;
          this.logger.info(`Timer ${label}: ${elapsed}ms`);
        };
      },
    };
  }

  /**
   * Submits weekly preferences for a user
   */
  async submitWeeklyPreferences(
    preference: Omit<WeeklyPreference, 'id' | 'submittedAt' | 'status'>,
  ): Promise<ScheduleServiceResult<WeeklyPreference>> {
    try {
      this.logger.info('Submitting weekly preferences', {
        userId: preference.userId,
        groupId: preference.groupId,
      });

      // Validate the group exists
      const group = await databaseService.getGroupById(preference.groupId);
      if (!group) {
        throw Errors.BadRequest('Group not found');
      }

      // Validate the user is a member of the group
      if (!group.members.some((member) => member.userId === preference.userId)) {
        throw Errors.BadRequest('User is not a member of this group');
      }

      // Check if preferences already exist for this week
      const existingPreferenceId = this.findExistingPreference(
        preference.userId,
        preference.groupId,
        preference.weekStartDate,
      );

      const preferenceId = existingPreferenceId || uuidv4();
      const weeklyPreference: WeeklyPreference = {
        ...preference,
        id: preferenceId,
        submittedAt: new Date(),
        status: 'submitted',
      };

      // Store the preference
      this.inMemoryPreferences.set(preferenceId, weeklyPreference);

      this.logger.info('Weekly preferences submitted', { preferenceId, userId: preference.userId });
      return {
        success: true,
        data: weeklyPreference,
        message: existingPreferenceId
          ? 'Preferences updated successfully'
          : 'Preferences submitted successfully',
      };
    } catch (error) {
      this.logger.error('Failed to submit weekly preferences', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets preference status for a group and week
   */
  async getPreferenceStatus(
    groupId: string,
    weekStartDate: Date,
    requesterId: string,
  ): Promise<
    ScheduleServiceResult<{
      totalMembers: number;
      submittedCount: number;
      pendingMembers: string[];
      submissionRate: number;
    }>
  > {
    try {
      this.logger.info('Getting preference status', { groupId, weekStartDate });

      // Validate access
      const group = await databaseService.getGroupById(groupId);
      if (!group) {
        throw Errors.BadRequest('Group not found');
      }

      const hasAccess =
        group.members.some((member) => member.userId === requesterId) ||
        group.groupAdminId === requesterId ||
        group.coAdminIds.includes(requesterId) ||
        (await this.isSystemAdmin(requesterId));
      if (!hasAccess) {
        throw Errors.Forbidden('Access denied');
      }

      // Get all preferences for this group and week
      const preferences = Array.from(this.inMemoryPreferences.values()).filter(
        (pref) => pref.groupId === groupId && this.isSameWeek(pref.weekStartDate, weekStartDate),
      );

      const submittedUserIds = preferences.map((pref) => pref.userId);
      const pendingMembers = group.members
        .filter((member) => !submittedUserIds.includes(member.userId))
        .map((member) => member.userId);

      const status = {
        totalMembers: group.members.length,
        submittedCount: preferences.length,
        pendingMembers,
        submissionRate:
          group.members.length > 0 ? (preferences.length / group.members.length) * 100 : 0,
      };

      this.logger.info('Preference status retrieved', {
        groupId,
        submissionRate: status.submissionRate,
      });
      return {
        success: true,
        data: status,
        message: 'Preference status retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get preference status', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generates a weekly schedule for a group
   */
  async generateWeeklySchedule(
    options: ScheduleGenerationOptions,
  ): Promise<ScheduleServiceResult<WeeklySchedule>> {
    try {
      this.logger.info('Generating weekly schedule', {
        groupId: options.groupId,
        weekStartDate: options.weekStartDate,
      });

      // Validate the group exists
      const group = await databaseService.getGroupById(options.groupId);
      if (!group) {
        throw Errors.BadRequest('Group not found');
      }

      // Get all preferences for this group and week
      const preferences = Array.from(this.inMemoryPreferences.values()).filter(
        (pref) =>
          pref.groupId === options.groupId &&
          this.isSameWeek(pref.weekStartDate, options.weekStartDate),
      );

      // Get current fairness metrics
      const fairnessMetrics = await this.calculateFairnessMetrics(options.groupId);

      // Generate assignments for each day of the week
      const assignments: ScheduleAssignment[] = [];
      const warnings: string[] = [];

      for (let dayOfWeek = 0; dayOfWeek < 5; dayOfWeek++) {
        // Monday to Friday
        const dayAssignment = await this.generateDayAssignment(
          group,
          preferences,
          fairnessMetrics,
          dayOfWeek,
          options.weekStartDate,
          options,
        );

        if (dayAssignment.assignment) {
          assignments.push(dayAssignment.assignment);
        }

        if (dayAssignment.warnings) {
          warnings.push(...dayAssignment.warnings);
        }
      }

      // Calculate overall fairness score
      const fairnessScore = this.calculateScheduleFairnessScore(assignments, fairnessMetrics);

      // Create the schedule
      const scheduleId = uuidv4();
      const schedule: WeeklySchedule = {
        id: scheduleId,
        groupId: options.groupId,
        weekStartDate: options.weekStartDate,
        assignments,
        generatedAt: new Date(),
        generatedBy: 'system', // TODO: Pass actual user ID
        status: options.dryRun ? 'draft' : 'published',
        fairnessScore,
        notes: warnings.length > 0 ? `Warnings: ${warnings.join('; ')}` : undefined,
      };

      // Store the schedule (unless dry run)
      if (!options.dryRun) {
        this.inMemorySchedules.set(scheduleId, schedule);

        // Create trips for each assignment
        await this.createTripsFromSchedule(schedule);
      }

      this.logger.info('Weekly schedule generated', {
        scheduleId,
        assignmentCount: assignments.length,
        fairnessScore,
        warningCount: warnings.length,
      });

      return {
        success: true,
        data: schedule,
        message: `Schedule generated with ${assignments.length} assignments`,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to generate weekly schedule', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets fairness metrics for a group
   */
  async getFairnessMetrics(
    groupId: string,
    requesterId: string,
  ): Promise<ScheduleServiceResult<LocalFairnessMetrics[]>> {
    try {
      this.logger.info('Getting fairness metrics', { groupId, requesterId });

      // Validate access
      const group = await databaseService.getGroupById(groupId);
      if (!group) {
        throw Errors.BadRequest('Group not found');
      }

      const hasAccess =
        group.members.some((member) => member.userId === requesterId) ||
        group.groupAdminId === requesterId ||
        group.coAdminIds.includes(requesterId) ||
        (await this.isSystemAdmin(requesterId));
      if (!hasAccess) {
        throw Errors.Forbidden('Access denied');
      }

      // Calculate fairness metrics
      const metrics = await this.calculateFairnessMetrics(groupId);

      this.logger.info('Fairness metrics retrieved', { groupId, memberCount: metrics.length });
      return {
        success: true,
        data: metrics,
        message: 'Fairness metrics retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to get fairness metrics', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sends reminder notifications for missing preferences
   */
  async sendPreferenceReminders(
    groupId: string,
    weekStartDate: Date,
    senderId: string,
  ): Promise<ScheduleServiceResult<void>> {
    try {
      this.logger.info('Sending preference reminders', { groupId, weekStartDate });

      // Get preference status
      const statusResult = await this.getPreferenceStatus(groupId, weekStartDate, senderId);
      if (!statusResult.success || !statusResult.data) {
        throw new Error('Failed to get preference status');
      }

      const { pendingMembers } = statusResult.data;

      // Send reminders to pending members
      for (const memberId of pendingMembers) {
        await this.sendReminderToMember(memberId, groupId, weekStartDate);
      }

      this.logger.info('Preference reminders sent', {
        groupId,
        reminderCount: pendingMembers.length,
      });
      return {
        success: true,
        message: `Reminders sent to ${pendingMembers.length} members`,
      };
    } catch (error) {
      this.logger.error('Failed to send preference reminders', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get weekly preferences for a specific user
   */
  async getWeeklyPreferences(
    userId: string,
    groupId: string,
    weekStartDate: Date,
  ): Promise<ScheduleServiceResult<WeeklyPreference[]>> {
    try {
      const preferences = Array.from(this.inMemoryPreferences.values()).filter(
        (pref) =>
          pref.userId === userId &&
          pref.groupId === groupId &&
          pref.weekStartDate.getTime() === weekStartDate.getTime(),
      );

      return {
        success: true,
        data: preferences,
      };
    } catch (error) {
      this.logger.error('Error getting weekly preferences', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update weekly preferences
   */
  async updateWeeklyPreferences(request: {
    userId: string;
    groupId: string;
    weekStartDate: Date;
    preferences: WeeklyPreference['preferences'];
  }): Promise<ScheduleServiceResult<WeeklyPreference>> {
    try {
      // Find existing preference
      const existingPref = Array.from(this.inMemoryPreferences.values()).find(
        (pref) =>
          pref.userId === request.userId &&
          pref.groupId === request.groupId &&
          pref.weekStartDate.getTime() === request.weekStartDate.getTime(),
      );

      if (!existingPref) {
        return {
          success: false,
          error: 'Preference not found',
        };
      }

      // Update the preference
      existingPref.preferences = request.preferences;
      existingPref.status = 'submitted';

      this.inMemoryPreferences.set(existingPref.id, existingPref);

      return {
        success: true,
        data: existingPref,
      };
    } catch (error) {
      this.logger.error('Error updating weekly preferences', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get a specific schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<ScheduleServiceResult<WeeklySchedule>> {
    try {
      const schedule = this.inMemorySchedules.get(scheduleId);

      if (!schedule) {
        return {
          success: false,
          error: 'Schedule not found',
        };
      }

      return {
        success: true,
        data: schedule,
      };
    } catch (error) {
      this.logger.error('Error getting schedule', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get schedules with filtering options
   */
  async getSchedules(options: {
    groupId?: string;
    weekStartDate?: Date;
    status?: 'draft' | 'published' | 'archived';
    limit?: number;
  }): Promise<ScheduleServiceResult<WeeklySchedule[]>> {
    try {
      let schedules = Array.from(this.inMemorySchedules.values());

      // Apply filters
      if (options.groupId) {
        schedules = schedules.filter((schedule) => schedule.groupId === options.groupId);
      }

      if (options.weekStartDate) {
        schedules = schedules.filter(
          (schedule) => schedule.weekStartDate.getTime() === options.weekStartDate!.getTime(),
        );
      }

      if (options.status) {
        schedules = schedules.filter((schedule) => schedule.status === options.status);
      }

      // Apply limit
      if (options.limit) {
        schedules = schedules.slice(0, options.limit);
      }

      return {
        success: true,
        data: schedules,
      };
    } catch (error) {
      this.logger.error('Error getting schedules', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: {
      status?: 'draft' | 'published' | 'archived';
      notes?: string;
    },
  ): Promise<ScheduleServiceResult<WeeklySchedule>> {
    try {
      const schedule = this.inMemorySchedules.get(scheduleId);

      if (!schedule) {
        return {
          success: false,
          error: 'Schedule not found',
        };
      }

      // Apply updates
      if (updates.status) {
        schedule.status = updates.status;
      }
      if (updates.notes !== undefined) {
        schedule.notes = updates.notes;
      }

      this.inMemorySchedules.set(scheduleId, schedule);

      return {
        success: true,
        data: schedule,
      };
    } catch (error) {
      this.logger.error('Error updating schedule', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<ScheduleServiceResult<void>> {
    try {
      const schedule = this.inMemorySchedules.get(scheduleId);

      if (!schedule) {
        return {
          success: false,
          error: 'Schedule not found',
        };
      }

      this.inMemorySchedules.delete(scheduleId);

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error('Error deleting schedule', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Private helper methods

  private findExistingPreference(
    userId: string,
    groupId: string,
    weekStartDate: Date,
  ): string | null {
    for (const [id, preference] of this.inMemoryPreferences.entries()) {
      if (
        preference.userId === userId &&
        preference.groupId === groupId &&
        this.isSameWeek(preference.weekStartDate, weekStartDate)
      ) {
        return id;
      }
    }
    return null;
  }

  private isSameWeek(date1: Date, date2: Date): boolean {
    const week1 = this.getWeekStart(date1);
    const week2 = this.getWeekStart(date2);
    return week1.getTime() === week2.getTime();
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(date.setDate(diff));
  }

  private async calculateFairnessMetrics(groupId: string): Promise<LocalFairnessMetrics[]> {
    const group = await databaseService.getGroupById(groupId);
    if (!group) return [];

    const metrics: LocalFairnessMetrics[] = [];

    // Get historical assignments (from previous schedules)
    const historicalSchedules = Array.from(this.inMemorySchedules.values()).filter(
      (schedule) => schedule.groupId === groupId,
    );

    for (const member of group.members) {
      const user = await databaseService.getUserById(member.userId);
      if (!user) continue;

      // Count historical assignments
      let totalAssignments = 0;
      let drivingAssignments = 0;
      let passengerAssignments = 0;

      for (const schedule of historicalSchedules) {
        for (const assignment of schedule.assignments) {
          if (assignment.driverId === member.userId) {
            drivingAssignments++;
            totalAssignments++;
          } else if (assignment.passengers.includes(member.userId)) {
            passengerAssignments++;
            totalAssignments++;
          }
        }
      }

      // Calculate fairness score
      const expectedDrivingRatio = 1 / group.members.length;
      const actualDrivingRatio = totalAssignments > 0 ? drivingAssignments / totalAssignments : 0;
      const fairnessScore =
        expectedDrivingRatio > 0 ? actualDrivingRatio / expectedDrivingRatio : 1;
      const fairnessDebt = expectedDrivingRatio - actualDrivingRatio;

      metrics.push({
        userId: member.userId,
        userName: `${user.firstName} ${user.lastName}`,
        totalAssignments,
        drivingAssignments,
        passengerAssignments,
        fairnessScore,
        fairnessDebt,
        weeklyCapacity: {
          canDrive: member.drivingPreferences?.canDrive ? 5 : 0,
          canPassenger: 5,
        },
      });
    }

    return metrics.sort((a, b) => a.fairnessScore - b.fairnessScore);
  }

  private async generateDayAssignment(
    group: GroupEntity,
    preferences: WeeklyPreference[],
    fairnessMetrics: LocalFairnessMetrics[],
    dayOfWeek: number,
    weekStartDate: Date,
    options: ScheduleGenerationOptions,
  ): Promise<{ assignment?: ScheduleAssignment; warnings?: string[] }> {
    const warnings: string[] = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const dayName = dayNames[dayOfWeek];

    // Get available drivers and passengers for this day
    const availableDrivers: string[] = [];
    const availablePassengers: string[] = [];

    for (const member of group.members) {
      const memberPreference = preferences.find((pref) => pref.userId === member.userId);
      const dayPref = memberPreference?.preferences[dayName];

      if (dayPref?.canDrive) {
        availableDrivers.push(member.userId);
      }
      if (dayPref?.canPassenger) {
        availablePassengers.push(member.userId);
      }
    }

    // Check if we have enough participants
    if (availableDrivers.length === 0) {
      warnings.push(`No available drivers for ${dayName}`);
      return { warnings };
    }

    if (availablePassengers.length === 0) {
      warnings.push(`No available passengers for ${dayName}`);
      return { warnings };
    }

    // Select driver based on fairness if enabled
    let selectedDriver: string;
    if (options.considerFairness) {
      // Select driver with highest fairness debt (most deserving)
      const driverMetrics = fairnessMetrics.filter((m) => availableDrivers.includes(m.userId));
      driverMetrics.sort((a, b) => b.fairnessDebt - a.fairnessDebt);
      selectedDriver = driverMetrics[0]?.userId || availableDrivers[0];
    } else {
      // Simple round-robin or random selection
      selectedDriver = availableDrivers[dayOfWeek % availableDrivers.length];
    }

    // Select passengers (exclude the driver)
    const eligiblePassengers = availablePassengers.filter((id) => id !== selectedDriver);
    const maxPassengers = Math.min(4, eligiblePassengers.length); // Assume max 4 passengers per trip
    const selectedPassengers = eligiblePassengers.slice(0, maxPassengers);

    // Create assignment
    const assignmentDate = new Date(weekStartDate);
    assignmentDate.setDate(assignmentDate.getDate() + dayOfWeek);

    const assignment: ScheduleAssignment = {
      id: uuidv4(),
      dayOfWeek,
      date: assignmentDate,
      driverId: selectedDriver,
      passengers: selectedPassengers,
      scheduledStartTime: '08:00', // Default, would be from preferences
      scheduledEndTime: '08:30', // Default, would be calculated
      estimatedDistance: 10, // Default, would be calculated from addresses
      fairnessImpact: this.calculateFairnessImpact(selectedDriver, fairnessMetrics),
    };

    return { assignment, warnings };
  }

  private calculateScheduleFairnessScore(
    assignments: ScheduleAssignment[],
    fairnessMetrics: LocalFairnessMetrics[],
  ): number {
    // Calculate how the schedule affects overall fairness
    const totalAssignments = assignments.length;
    if (totalAssignments === 0) return 1;

    const drivingDistribution = new Map<string, number>();

    for (const assignment of assignments) {
      const current = drivingDistribution.get(assignment.driverId) || 0;
      drivingDistribution.set(assignment.driverId, current + 1);
    }

    // Calculate variance in driving assignments
    const drivingCounts = Array.from(drivingDistribution.values());
    const meanDriving = drivingCounts.reduce((sum, count) => sum + count, 0) / drivingCounts.length;
    const variance =
      drivingCounts.reduce((sum, count) => sum + Math.pow(count - meanDriving, 2), 0) /
      drivingCounts.length;

    // Convert to fairness score (lower variance = higher fairness)
    return Math.max(0, 1 - variance);
  }

  private calculateFairnessImpact(
    driverId: string,
    fairnessMetrics: LocalFairnessMetrics[],
  ): number {
    const metric = fairnessMetrics.find((m) => m.userId === driverId);
    return metric ? metric.fairnessDebt : 0;
  }

  private async createTripsFromSchedule(schedule: WeeklySchedule): Promise<void> {
    for (const assignment of schedule.assignments) {
      const tripResult = await tripDomainService.createTrip(
        {
          groupId: schedule.groupId,
          driverId: assignment.driverId,
          scheduledStartTime: new Date(
            `${assignment.date.toISOString().split('T')[0]}T${assignment.scheduledStartTime}`,
          ),
          scheduledEndTime: new Date(
            `${assignment.date.toISOString().split('T')[0]}T${assignment.scheduledEndTime}`,
          ),
          pickupAddress: 'Default pickup address', // Would be from group settings
          dropoffAddress: 'Default dropoff address', // Would be from group settings
          maxPassengers: 4,
          passengers: assignment.passengers,
          notes: `Generated from weekly schedule ${schedule.id}`,
        },
        schedule.generatedBy,
      );

      if (!tripResult.success) {
        this.logger.warn('Failed to create trip from schedule assignment', {
          scheduleId: schedule.id,
          assignmentId: assignment.id,
          error: tripResult.error,
        });
      }
    }
  }

  private async sendReminderToMember(
    memberId: string,
    groupId: string,
    weekStartDate: Date,
  ): Promise<void> {
    // This would integrate with the notification service
    this.logger.info('Sending preference reminder', { memberId, groupId, weekStartDate });

    // TODO: Implement actual notification sending
  }

  private async isSystemAdmin(userId: string): Promise<boolean> {
    try {
      const user = await databaseService.getUserById(userId);
      return user?.role === 'super_admin' || user?.role === 'group_admin';
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const schedulingDomainService = new SchedulingDomainService();
