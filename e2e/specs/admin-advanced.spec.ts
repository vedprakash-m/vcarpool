/**
 * Admin Advanced Functionality E2E Tests
 * Tests complete admin workflow coverage, role management, school configuration,
 * schedule templates, group lifecycle, and weekly scheduling automation
 */

import { test, expect } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser, makeApiRequest } from '../utils/test-helpers';

test.describe('Advanced Admin Functionality', () => {
  let adminUser: TestUser;
  let parentUser1: TestUser;
  let parentUser2: TestUser;
  let adminToken: string;
  let userToken1: string;
  let userToken2: string;
  let testSchoolId: string;
  let testTemplateId: string;
  let testGroupId: string;

  test.beforeAll(async ({ request }) => {
    // Create test users
    adminUser = await createTestUser('admin');
    parentUser1 = await createTestUser('parent');
    parentUser2 = await createTestUser('parent');

    // Get authentication tokens
    const adminLoginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: adminUser.email,
      password: adminUser.password,
    });
    const adminLoginData = await adminLoginResponse.json();
    adminToken = adminLoginData.token;

    const parent1LoginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: parentUser1.email,
      password: parentUser1.password,
    });
    const parent1LoginData = await parent1LoginResponse.json();
    userToken1 = parent1LoginData.token;

    const parent2LoginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: parentUser2.email,
      password: parentUser2.password,
    });
    const parent2LoginData = await parent2LoginResponse.json();
    userToken2 = parent2LoginData.token;
  });

  test.afterAll(async () => {
    if (adminUser) await cleanupTestUser(adminUser.email);
    if (parentUser1) await cleanupTestUser(parentUser1.email);
    if (parentUser2) await cleanupTestUser(parentUser2.email);
  });

  test.describe('Role Management System', () => {
    test('view all user roles and permissions', async ({ request }) => {
      const rolesResponse = await makeApiRequest(
        request,
        'GET',
        '/api/admin-role-management',
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(rolesResponse.status()).toBe(200);
      const rolesData = await rolesResponse.json();
      expect(rolesData.users).toBeDefined();
      expect(Array.isArray(rolesData.users)).toBe(true);
      expect(rolesData.roleTypes).toBeDefined();
      expect(rolesData.permissions).toBeDefined();
    });

    test('promote parent to admin role', async ({ request }) => {
      const promoteResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/admin-role-management',
        {
          userId: parentUser1.email,
          action: 'promote',
          newRole: 'admin',
          permissions: ['manage_groups', 'view_analytics', 'manage_schedules'],
          reason: 'Experienced parent taking on admin responsibilities',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(promoteResponse.status()).toBe(200);
      const promoteData = await promoteResponse.json();
      expect(promoteData.success).toBe(true);
      expect(promoteData.roleChanged).toBe(true);
      expect(promoteData.newRole).toBe('admin');
    });

    test('assign specific permissions to user', async ({ request }) => {
      const permissionsResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/admin-role-management',
        {
          userId: parentUser2.email,
          action: 'assign_permissions',
          permissions: ['view_group_analytics', 'moderate_discussions', 'manage_own_group'],
          expiryDate: '2025-12-31',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(permissionsResponse.status()).toBe(200);
      const permissionsData = await permissionsResponse.json();
      expect(permissionsData.success).toBe(true);
      expect(permissionsData.permissionsAssigned).toBe(true);
    });

    test('revoke admin privileges', async ({ request }) => {
      const revokeResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/admin-role-management',
        {
          userId: parentUser1.email,
          action: 'revoke',
          revokeType: 'partial',
          permissions: ['manage_schedules'],
          reason: 'Restructuring admin responsibilities',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(revokeResponse.status()).toBe(200);
      const revokeData = await revokeResponse.json();
      expect(revokeData.success).toBe(true);
      expect(revokeData.permissionsRevoked).toBe(true);
    });

    test('create custom role with specific permissions', async ({ request }) => {
      const customRoleResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-role-management/custom-roles',
        {
          roleName: 'Group Coordinator',
          description: 'Manages specific carpool groups',
          permissions: [
            'manage_assigned_groups',
            'view_group_analytics',
            'send_group_notifications',
            'moderate_group_discussions',
          ],
          restrictions: {
            groupLimit: 3,
            regionLimit: 'same_school_district',
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(customRoleResponse.status()).toBe(200);
      const customRoleData = await customRoleResponse.json();
      expect(customRoleData.success).toBe(true);
      expect(customRoleData.roleCreated).toBe(true);
      expect(customRoleData.roleId).toBeDefined();
    });

    test('audit role changes and permissions', async ({ request }) => {
      const auditResponse = await makeApiRequest(
        request,
        'GET',
        '/api/admin-role-management/audit?period=30days&userId=' + parentUser1.email,
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(auditResponse.status()).toBe(200);
      const auditData = await auditResponse.json();
      expect(auditData.auditLog).toBeDefined();
      expect(Array.isArray(auditData.auditLog)).toBe(true);
      expect(auditData.summary).toBeDefined();
    });
  });

  test.describe('School Configuration Management', () => {
    test('create new school configuration', async ({ request }) => {
      const schoolResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-school-management',
        {
          name: 'Lincoln Elementary School',
          address: {
            street: '123 Education Way',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94105',
          },
          contact: {
            phone: '+14155551234',
            email: 'admin@lincoln.edu',
            principalName: 'Dr. Jane Smith',
          },
          schedule: {
            startTime: '08:00',
            endTime: '15:30',
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          },
          carpoolPolicies: {
            minimumAge: 5,
            maximumCapacity: 8,
            backgroundCheckRequired: true,
            insuranceRequired: true,
          },
          boundaries: {
            serviceRadius: 10, // miles
            restrictToDistrict: true,
            specialZones: [
              {
                name: 'Extended Pickup Zone',
                radius: 15,
                conditions: 'Special needs students only',
              },
            ],
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(schoolResponse.status()).toBe(200);
      const schoolData = await schoolResponse.json();
      expect(schoolData.success).toBe(true);
      expect(schoolData.schoolId).toBeDefined();
      testSchoolId = schoolData.schoolId;
    });

    test('update school policies and settings', async ({ request }) => {
      const updateResponse = await makeApiRequest(
        request,
        'PUT',
        `/api/admin-school-management/${testSchoolId}`,
        {
          carpoolPolicies: {
            minimumAge: 6, // Updated from 5
            maximumCapacity: 6, // Updated from 8
            newPolicies: {
              emergencyContactRequired: true,
              medicalInfoRequired: true,
              waiverRequired: true,
            },
          },
          communicationPreferences: {
            defaultLanguage: 'en',
            supportedLanguages: ['en', 'es', 'zh'],
            notificationMethods: ['email', 'sms', 'app'],
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(updateResponse.status()).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.success).toBe(true);
      expect(updateData.updated).toBe(true);
    });

    test('configure school holiday calendar', async ({ request }) => {
      const holidayResponse = await makeApiRequest(
        request,
        'POST',
        `/api/admin-school-management/${testSchoolId}/calendar`,
        {
          holidays: [
            {
              name: 'Independence Day',
              date: '2025-07-04',
              type: 'federal',
              recurring: true,
            },
            {
              name: 'Thanksgiving Break',
              startDate: '2025-11-28',
              endDate: '2025-11-29',
              type: 'school',
            },
            {
              name: 'Winter Break',
              startDate: '2025-12-23',
              endDate: '2026-01-06',
              type: 'school',
            },
          ],
          autoSuspendCarpools: true,
          notifyParents: true,
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(holidayResponse.status()).toBe(200);
      const holidayData = await holidayResponse.json();
      expect(holidayData.success).toBe(true);
      expect(holidayData.holidaysAdded).toBe(3);
    });

    test('set up emergency procedures', async ({ request }) => {
      const emergencyResponse = await makeApiRequest(
        request,
        'PUT',
        `/api/admin-school-management/${testSchoolId}/emergency`,
        {
          procedures: {
            weatherClosure: {
              enabled: true,
              autoNotification: true,
              notificationMethods: ['sms', 'email', 'app'],
              decisionTime: '06:00',
            },
            lockdown: {
              enabled: true,
              autoSuspendCarpools: true,
              emergencyContacts: [
                {
                  name: 'Police Department',
                  phone: '911',
                },
                {
                  name: 'School District Office',
                  phone: '+14155559999',
                },
              ],
            },
            medicalEmergency: {
              enabled: true,
              requireParentNotification: true,
              emergencyServices: '+14155558888',
            },
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(emergencyResponse.status()).toBe(200);
      const emergencyData = await emergencyResponse.json();
      expect(emergencyData.success).toBe(true);
      expect(emergencyData.proceduresConfigured).toBe(true);
    });

    test('manage school districts and zones', async ({ request }) => {
      const zonesResponse = await makeApiRequest(
        request,
        'POST',
        `/api/admin-school-management/${testSchoolId}/zones`,
        {
          zones: [
            {
              name: 'North Zone',
              boundaries: {
                coordinates: [
                  { lat: 37.8, lng: -122.4 },
                  { lat: 37.85, lng: -122.4 },
                  { lat: 37.85, lng: -122.35 },
                  { lat: 37.8, lng: -122.35 },
                ],
              },
              restrictions: {
                maxTravelTime: 30, // minutes
                preferredRoutes: ['Highway 101', 'Van Ness Ave'],
              },
            },
            {
              name: 'South Zone',
              boundaries: {
                center: { lat: 37.75, lng: -122.4 },
                radius: 5, // miles
              },
              specialRequirements: {
                bridgeCrossing: false,
                hillClimbing: true,
              },
            },
          ],
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(zonesResponse.status()).toBe(200);
      const zonesData = await zonesResponse.json();
      expect(zonesData.success).toBe(true);
      expect(zonesData.zonesCreated).toBe(2);
    });
  });

  test.describe('Schedule Templates Management', () => {
    test('create weekly schedule template', async ({ request }) => {
      const templateResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-schedule-templates',
        {
          name: 'Standard Weekly Template',
          description: 'Default weekly carpool schedule for regular school days',
          type: 'weekly',
          schedule: {
            Monday: {
              morning: {
                pickupStart: '07:30',
                pickupEnd: '08:00',
                schoolArrival: '08:15',
              },
              afternoon: {
                schoolDeparture: '15:30',
                dropoffStart: '15:45',
                dropoffEnd: '16:15',
              },
            },
            Tuesday: {
              morning: {
                pickupStart: '07:30',
                pickupEnd: '08:00',
                schoolArrival: '08:15',
              },
              afternoon: {
                schoolDeparture: '15:30',
                dropoffStart: '15:45',
                dropoffEnd: '16:15',
              },
            },
            Wednesday: {
              morning: {
                pickupStart: '07:30',
                pickupEnd: '08:00',
                schoolArrival: '08:15',
              },
              afternoon: {
                schoolDeparture: '13:00', // Early dismissal
                dropoffStart: '13:15',
                dropoffEnd: '13:45',
              },
            },
            Thursday: {
              morning: {
                pickupStart: '07:30',
                pickupEnd: '08:00',
                schoolArrival: '08:15',
              },
              afternoon: {
                schoolDeparture: '15:30',
                dropoffStart: '15:45',
                dropoffEnd: '16:15',
              },
            },
            Friday: {
              morning: {
                pickupStart: '07:30',
                pickupEnd: '08:00',
                schoolArrival: '08:15',
              },
              afternoon: {
                schoolDeparture: '15:30',
                dropoffStart: '15:45',
                dropoffEnd: '16:15',
              },
            },
          },
          applicableSchools: [testSchoolId],
          defaultDriverRotation: 'round_robin',
          bufferTime: 10, // minutes
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(templateResponse.status()).toBe(200);
      const templateData = await templateResponse.json();
      expect(templateData.success).toBe(true);
      expect(templateData.templateId).toBeDefined();
      testTemplateId = templateData.templateId;
    });

    test('create special event template', async ({ request }) => {
      const specialTemplateResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-schedule-templates',
        {
          name: 'Field Trip Template',
          description: 'Modified schedule for field trip days',
          type: 'special_event',
          schedule: {
            morning: {
              pickupStart: '07:00', // Earlier pickup
              pickupEnd: '07:30',
              departureLocation: 'School Parking Lot',
              eventStart: '08:00',
            },
            afternoon: {
              eventEnd: '16:00',
              pickupLocation: 'Museum Exit',
              dropoffStart: '16:30',
              dropoffEnd: '17:00',
            },
          },
          specialRequirements: {
            parentPermissionRequired: true,
            emergencyContactRequired: true,
            medicalInfoRequired: true,
            additionalInsurance: true,
          },
          notifications: {
            advance: 7, // days
            reminder: 1, // day before
            dayOf: true,
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(specialTemplateResponse.status()).toBe(200);
      const specialTemplateData = await specialTemplateResponse.json();
      expect(specialTemplateData.success).toBe(true);
      expect(specialTemplateData.templateId).toBeDefined();
    });

    test('modify existing template', async ({ request }) => {
      const modifyResponse = await makeApiRequest(
        request,
        'PUT',
        `/api/admin-schedule-templates/${testTemplateId}`,
        {
          changes: {
            Wednesday: {
              afternoon: {
                schoolDeparture: '12:30', // Changed from 13:00
                dropoffStart: '12:45',
                dropoffEnd: '13:15',
              },
            },
          },
          reason: 'School requested earlier Wednesday dismissal',
          effectiveDate: '2025-07-01',
          notifyAffectedGroups: true,
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(modifyResponse.status()).toBe(200);
      const modifyData = await modifyResponse.json();
      expect(modifyData.success).toBe(true);
      expect(modifyData.templateUpdated).toBe(true);
    });

    test('apply template to multiple groups', async ({ request }) => {
      const applyResponse = await makeApiRequest(
        request,
        'POST',
        `/api/admin-schedule-templates/${testTemplateId}/apply`,
        {
          targetGroups: ['group-1-id', 'group-2-id', 'group-3-id'],
          startDate: '2025-06-30',
          endDate: '2025-08-30',
          overrideExisting: false,
          notifyParticipants: true,
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(applyResponse.status()).toBe(200);
      const applyData = await applyResponse.json();
      expect(applyData.success).toBe(true);
      expect(applyData.groupsUpdated).toBe(3);
    });

    test('export template for reuse', async ({ request }) => {
      const exportResponse = await makeApiRequest(
        request,
        'GET',
        `/api/admin-schedule-templates/${testTemplateId}/export?format=json`,
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(exportResponse.status()).toBe(200);
      const exportData = await exportResponse.json();
      expect(exportData.template).toBeDefined();
      expect(exportData.metadata).toBeDefined();
      expect(exportData.compatibility).toBeDefined();
    });
  });

  test.describe('Group Lifecycle Management', () => {
    test('monitor group creation and approval workflow', async ({ request }) => {
      const lifecycleResponse = await makeApiRequest(
        request,
        'GET',
        '/api/admin-group-lifecycle',
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(lifecycleResponse.status()).toBe(200);
      const lifecycleData = await lifecycleResponse.json();
      expect(lifecycleData.groups).toBeDefined();
      expect(lifecycleData.pendingApprovals).toBeDefined();
      expect(lifecycleData.statistics).toBeDefined();
    });

    test('approve pending group creation', async ({ request }) => {
      // First create a group that needs approval
      const createResponse = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-creation',
        {
          name: 'Pending Approval Group',
          school: testSchoolId,
          requiresApproval: true,
        },
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      const createData = await createResponse.json();
      const pendingGroupId = createData.groupId;

      // Admin approves the group
      const approveResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/admin-group-lifecycle/approve',
        {
          groupId: pendingGroupId,
          action: 'approve',
          conditions: ['background_checks_completed', 'insurance_verified', 'vehicle_inspected'],
          notes: 'All requirements met for approval',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(approveResponse.status()).toBe(200);
      const approveData = await approveResponse.json();
      expect(approveData.success).toBe(true);
      expect(approveData.approved).toBe(true);
      testGroupId = pendingGroupId;
    });

    test('monitor group health and performance', async ({ request }) => {
      const healthResponse = await makeApiRequest(
        request,
        'GET',
        `/api/admin-group-lifecycle/health/${testGroupId}`,
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(healthResponse.status()).toBe(200);
      const healthData = await healthResponse.json();
      expect(healthData.overallHealth).toBeDefined();
      expect(healthData.metrics).toBeDefined();
      expect(healthData.alerts).toBeDefined();
      expect(healthData.recommendations).toBeDefined();
    });

    test('intervene in struggling group', async ({ request }) => {
      const interventionResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-group-lifecycle/intervention',
        {
          groupId: testGroupId,
          interventionType: 'performance_improvement',
          issues: ['low_participation', 'frequent_cancellations', 'communication_problems'],
          actions: [
            {
              type: 'assign_coordinator',
              details: {
                coordinatorId: parentUser1.email,
                duration: '30_days',
              },
            },
            {
              type: 'schedule_consultation',
              details: {
                consultantId: adminUser.email,
                scheduledDate: '2025-06-30',
              },
            },
            {
              type: 'implement_guidelines',
              details: {
                guidelines: [
                  'mandatory_weekly_checkin',
                  'standardized_communication',
                  'performance_tracking',
                ],
              },
            },
          ],
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(interventionResponse.status()).toBe(200);
      const interventionData = await interventionResponse.json();
      expect(interventionData.success).toBe(true);
      expect(interventionData.interventionPlan).toBeDefined();
    });

    test('archive inactive group', async ({ request }) => {
      const archiveResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/admin-group-lifecycle/archive',
        {
          groupId: 'inactive-group-id',
          reason: 'No activity for 60 days',
          archiveType: 'soft_archive', // Preserves data but marks inactive
          notifyMembers: true,
          retentionPeriod: '2_years',
          dataExport: true,
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(archiveResponse.status()).toBe(200);
      const archiveData = await archiveResponse.json();
      expect(archiveData.success).toBe(true);
      expect(archiveData.archived).toBe(true);
      expect(archiveData.exportUrl).toBeDefined();
    });

    test('generate group lifecycle report', async ({ request }) => {
      const reportResponse = await makeApiRequest(
        request,
        'GET',
        '/api/admin-group-lifecycle/report?period=quarterly',
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(reportResponse.status()).toBe(200);
      const reportData = await reportResponse.json();
      expect(reportData.summary).toBeDefined();
      expect(reportData.trends).toBeDefined();
      expect(reportData.successMetrics).toBeDefined();
      expect(reportData.recommendations).toBeDefined();
    });
  });

  test.describe('Weekly Scheduling Automation', () => {
    test('set up automatic weekly scheduling', async ({ request }) => {
      const autoScheduleResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-weekly-scheduling/automation',
        {
          name: 'Lincoln Elementary Auto Schedule',
          schoolId: testSchoolId,
          templateId: testTemplateId,
          schedule: {
            frequency: 'weekly',
            planningDay: 'Friday',
            planningTime: '15:00',
            publishDay: 'Sunday',
            publishTime: '18:00',
          },
          criteria: {
            balanceWorkload: true,
            respectPreferences: true,
            minimizeDistance: true,
            considerRatings: true,
          },
          notifications: {
            draftReady: ['admin_team'],
            published: ['all_participants'],
            changes: ['affected_participants'],
          },
          exceptions: {
            holidays: 'auto_skip',
            emergencies: 'manual_override',
            lowParticipation: 'threshold_3',
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(autoScheduleResponse.status()).toBe(200);
      const autoScheduleData = await autoScheduleResponse.json();
      expect(autoScheduleData.success).toBe(true);
      expect(autoScheduleData.automationId).toBeDefined();
    });

    test('generate weekly schedule manually', async ({ request }) => {
      const generateResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-weekly-scheduling',
        {
          week: '2025-06-23',
          groupId: testGroupId,
          algorithm: 'optimized',
          constraints: {
            maxTripsPerDriver: 3,
            maxConsecutiveDays: 2,
            respectTimePreferences: true,
            balanceGroups: true,
          },
          preview: false, // Generate actual schedule
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(generateResponse.status()).toBe(200);
      const generateData = await generateResponse.json();
      expect(generateData.success).toBe(true);
      expect(generateData.schedule).toBeDefined();
      expect(generateData.assignments).toBeDefined();
    });

    test('review and approve draft schedule', async ({ request }) => {
      const reviewResponse = await makeApiRequest(
        request,
        'GET',
        '/api/admin-weekly-scheduling/draft?week=2025-06-30',
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(reviewResponse.status()).toBe(200);
      const reviewData = await reviewResponse.json();
      expect(reviewData.draft).toBeDefined();

      // Approve the draft
      const approveResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/admin-weekly-scheduling/approve',
        {
          draftId: reviewData.draft.id,
          modifications: [
            {
              tripId: 'trip-1-id',
              change: 'reassign_driver',
              newDriverId: parentUser2.email,
              reason: 'Better route optimization',
            },
          ],
          publishNow: true,
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(approveResponse.status()).toBe(200);
      const approveData = await approveResponse.json();
      expect(approveData.success).toBe(true);
      expect(approveData.published).toBe(true);
    });

    test('handle scheduling conflicts automatically', async ({ request }) => {
      const conflictResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-weekly-scheduling/resolve-conflicts',
        {
          week: '2025-07-07',
          conflicts: [
            {
              type: 'driver_unavailable',
              tripId: 'trip-conflict-id',
              originalDriver: parentUser1.email,
              conflictReason: 'Vacation',
            },
            {
              type: 'route_overlap',
              affectedTrips: ['trip-1', 'trip-2'],
              overlapType: 'time_conflict',
            },
          ],
          resolutionStrategy: 'auto_with_notification',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(conflictResponse.status()).toBe(200);
      const conflictData = await conflictResponse.json();
      expect(conflictData.success).toBe(true);
      expect(conflictData.resolutions).toBeDefined();
      expect(conflictData.conflictsResolved).toBeGreaterThan(0);
    });

    test('optimize existing schedule', async ({ request }) => {
      const optimizeResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-weekly-scheduling/optimize',
        {
          week: '2025-07-14',
          groupId: testGroupId,
          optimizationGoals: [
            'minimize_total_distance',
            'balance_driver_workload',
            'reduce_pickup_time',
            'maximize_efficiency',
          ],
          constraints: {
            maintainPreferences: true,
            respectAvailability: true,
            minimumNotice: 24, // hours
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(optimizeResponse.status()).toBe(200);
      const optimizeData = await optimizeResponse.json();
      expect(optimizeData.success).toBe(true);
      expect(optimizeData.improvements).toBeDefined();
      expect(optimizeData.metrics).toBeDefined();
    });

    test('schedule emergency replacement drivers', async ({ request }) => {
      const emergencyScheduleResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-weekly-scheduling/emergency',
        {
          affectedTrips: [
            {
              tripId: 'emergency-trip-1',
              originalDriver: parentUser1.email,
              date: '2025-06-25',
              urgency: 'high',
            },
          ],
          replacementCriteria: {
            proximity: 10, // miles
            availability: 'immediate',
            minimumRating: 4.0,
          },
          fallbackOptions: {
            expandRadius: true,
            contactBackupDrivers: true,
            notifyParents: true,
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(emergencyScheduleResponse.status()).toBe(200);
      const emergencyScheduleData = await emergencyScheduleResponse.json();
      expect(emergencyScheduleData.success).toBe(true);
      expect(emergencyScheduleData.replacements).toBeDefined();
    });

    test('generate scheduling analytics report', async ({ request }) => {
      const analyticsResponse = await makeApiRequest(
        request,
        'GET',
        '/api/admin-weekly-scheduling/analytics?period=monthly',
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(analyticsResponse.status()).toBe(200);
      const analyticsData = await analyticsResponse.json();
      expect(analyticsData.efficiency).toBeDefined();
      expect(analyticsData.driverUtilization).toBeDefined();
      expect(analyticsData.satisfactionScores).toBeDefined();
      expect(analyticsData.optimizationOpportunities).toBeDefined();
    });
  });

  test.describe('System-Wide Administration', () => {
    test('view system health dashboard', async ({ request }) => {
      const healthResponse = await makeApiRequest(
        request,
        'GET',
        '/api/admin-system-health',
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(healthResponse.status()).toBe(200);
      const healthData = await healthResponse.json();
      expect(healthData.systemStatus).toBeDefined();
      expect(healthData.activeUsers).toBeDefined();
      expect(healthData.activeCarpools).toBeDefined();
      expect(healthData.systemAlerts).toBeDefined();
    });

    test('manage system-wide configurations', async ({ request }) => {
      const configResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/admin-system-config',
        {
          globalSettings: {
            maxGroupSize: 8,
            defaultRadius: 10,
            minimumNoticeHours: 4,
            backgroundCheckValidity: 365, // days
          },
          features: {
            realTimeTracking: true,
            automaticScheduling: true,
            emergencyAlerts: true,
            analyticsReporting: true,
          },
          policies: {
            dataRetention: 7, // years
            privacyLevel: 'strict',
            auditLogging: true,
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(configResponse.status()).toBe(200);
      const configData = await configResponse.json();
      expect(configData.success).toBe(true);
      expect(configData.configUpdated).toBe(true);
    });

    test('export comprehensive system report', async ({ request }) => {
      const exportResponse = await makeApiRequest(
        request,
        'POST',
        '/api/admin-system-export',
        {
          reportType: 'comprehensive',
          dateRange: {
            start: '2025-06-01',
            end: '2025-06-30',
          },
          includeData: [
            'user_analytics',
            'carpool_metrics',
            'financial_summary',
            'safety_incidents',
            'system_performance',
          ],
          format: 'excel',
          includeCharts: true,
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(exportResponse.status()).toBe(200);
      const exportData = await exportResponse.json();
      expect(exportData.success).toBe(true);
      expect(exportData.downloadUrl).toBeDefined();
      expect(exportData.reportSize).toBeDefined();
    });
  });
});
