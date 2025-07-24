/**
 * Trip Management E2E Tests
 * Tests trip creation, editing, cancellation, recurring trips, and driver assignment
 */

import { test, expect } from '@playwright/test';
import { TestUser, createTestUser, cleanupTestUser, makeApiRequest } from '../utils/test-helpers';

test.describe('Trip Management System', () => {
  let parentUser: TestUser;
  let adminUser: TestUser;
  let userToken: string;
  let adminToken: string;
  let testTripId: string;
  let testGroupId: string;

  test.beforeAll(async ({ request }) => {
    parentUser = await createTestUser('parent');
    adminUser = await createTestUser('admin');

    // Get authentication tokens
    const parentLoginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: parentUser.email,
      password: parentUser.password,
    });
    const parentLoginData = await parentLoginResponse.json();
    userToken = parentLoginData.token;

    const adminLoginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: adminUser.email,
      password: adminUser.password,
    });
    const adminLoginData = await adminLoginResponse.json();
    adminToken = adminLoginData.token;

    // Create a test group for trip management
    const groupResponse = await makeApiRequest(
      request,
      'POST',
      '/api/parent-group-creation',
      {
        name: 'Trip Management Test Group',
        school: 'Lincoln Elementary',
        maxCapacity: 4,
        schedule: {
          days: ['Monday', 'Wednesday', 'Friday'],
          pickupTime: '08:00',
          dropoffTime: '15:30',
        },
      },
      {
        Authorization: `Bearer ${userToken}`,
      },
    );
    const groupData = await groupResponse.json();
    testGroupId = groupData.groupId;
  });

  test.afterAll(async () => {
    if (parentUser) await cleanupTestUser(parentUser.email);
    if (adminUser) await cleanupTestUser(adminUser.email);
  });

  test.describe('Trip Creation Workflows', () => {
    test('create single trip - morning pickup', async ({ request }) => {
      const tripResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trips-create',
        {
          type: 'pickup',
          date: '2025-06-25',
          time: '08:00',
          groupId: testGroupId,
          driverId: parentUser.email,
          route: {
            startLocation: {
              address: '123 Start Street, San Francisco, CA 94105',
              coordinates: { latitude: 37.7749, longitude: -122.4194 },
            },
            stops: [
              {
                address: '456 Stop 1, San Francisco, CA 94105',
                coordinates: { latitude: 37.7849, longitude: -122.4094 },
                pickupTime: '08:05',
                children: ['child-1-id'],
              },
              {
                address: '789 Stop 2, San Francisco, CA 94105',
                coordinates: { latitude: 37.7649, longitude: -122.4294 },
                pickupTime: '08:10',
                children: ['child-2-id'],
              },
            ],
            destination: {
              address: 'Lincoln Elementary School, San Francisco, CA',
              coordinates: { latitude: 37.7549, longitude: -122.4394 },
              arrivalTime: '08:20',
            },
          },
          passengers: [
            {
              childId: 'child-1-id',
              parentId: parentUser.email,
              seatNumber: 1,
            },
          ],
          vehicle: {
            make: 'Toyota',
            model: 'Sienna',
            licensePlate: 'ABC123',
            color: 'Blue',
            seatCount: 7,
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(tripResponse.status()).toBe(200);
      const tripData = await tripResponse.json();
      expect(tripData.success).toBe(true);
      expect(tripData.tripId).toBeDefined();
      testTripId = tripData.tripId;
    });

    test('create return trip - afternoon dropoff', async ({ request }) => {
      const returnTripResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trips-create',
        {
          type: 'dropoff',
          date: '2025-06-25',
          time: '15:30',
          groupId: testGroupId,
          driverId: parentUser.email,
          linkedTripId: testTripId, // Link to morning pickup
          route: {
            startLocation: {
              address: 'Lincoln Elementary School, San Francisco, CA',
              coordinates: { latitude: 37.7549, longitude: -122.4394 },
            },
            stops: [
              {
                address: '789 Stop 2, San Francisco, CA 94105',
                coordinates: { latitude: 37.7649, longitude: -122.4294 },
                dropoffTime: '15:40',
                children: ['child-2-id'],
              },
              {
                address: '456 Stop 1, San Francisco, CA 94105',
                coordinates: { latitude: 37.7849, longitude: -122.4094 },
                dropoffTime: '15:45',
                children: ['child-1-id'],
              },
            ],
            destination: {
              address: '123 End Street, San Francisco, CA 94105',
              coordinates: { latitude: 37.7749, longitude: -122.4194 },
              arrivalTime: '15:50',
            },
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(returnTripResponse.status()).toBe(200);
      const returnTripData = await returnTripResponse.json();
      expect(returnTripData.success).toBe(true);
      expect(returnTripData.roundTripCreated).toBe(true);
    });

    test('create emergency trip - immediate departure', async ({ request }) => {
      const emergencyTripResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trips-create',
        {
          type: 'emergency',
          priority: 'urgent',
          date: new Date().toISOString().split('T')[0], // Today
          time: new Date(Date.now() + 1800000).toTimeString().substring(0, 5), // 30 minutes from now
          groupId: testGroupId,
          reason: 'School closure due to emergency',
          route: {
            startLocation: {
              address: 'Lincoln Elementary School, San Francisco, CA',
            },
            stops: [
              {
                address: '456 Emergency Stop, San Francisco, CA',
                children: ['child-1-id'],
              },
            ],
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(emergencyTripResponse.status()).toBe(200);
      const emergencyTripData = await emergencyTripResponse.json();
      expect(emergencyTripData.success).toBe(true);
      expect(emergencyTripData.emergency).toBe(true);
      expect(emergencyTripData.notificationsSent).toBe(true);
    });

    test('create trip with special requirements', async ({ request }) => {
      const specialTripResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trips-create',
        {
          type: 'pickup',
          date: '2025-06-26',
          time: '08:00',
          groupId: testGroupId,
          specialRequirements: {
            wheelchair: true,
            carSeat: { type: 'booster', count: 2 },
            allergies: ['peanuts', 'shellfish'],
            medications: [
              {
                name: 'EpiPen',
                instructions: 'For severe allergic reactions',
                location: 'Front compartment',
              },
            ],
          },
          notes: 'Child with special medical needs - please review emergency procedures',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(specialTripResponse.status()).toBe(200);
      const specialTripData = await specialTripResponse.json();
      expect(specialTripData.success).toBe(true);
      expect(specialTripData.specialRequirementsAcknowledged).toBe(true);
    });

    test('validate trip creation - insufficient driver capacity', async ({ request }) => {
      const invalidTripResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trips-create',
        {
          type: 'pickup',
          date: '2025-06-27',
          time: '08:00',
          groupId: testGroupId,
          passengers: Array.from({ length: 10 }, (_, i) => ({
            childId: `child-${i}-id`,
            parentId: `parent-${i}@example.com`,
            seatNumber: i + 1,
          })), // Too many passengers
          vehicle: {
            seatCount: 7, // Only 7 seats available
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(invalidTripResponse.status()).toBe(400);
      const invalidTripData = await invalidTripResponse.json();
      expect(invalidTripData.error).toContain('capacity');
    });
  });

  test.describe('Trip Editing and Modification', () => {
    test('update trip time and route', async ({ request }) => {
      const updateResponse = await makeApiRequest(
        request,
        'PUT',
        `/api/trips-edit/${testTripId}`,
        {
          time: '08:15', // Changed from 08:00
          route: {
            stops: [
              {
                address: '999 New Stop, San Francisco, CA 94105',
                coordinates: { latitude: 37.795, longitude: -122.4 },
                pickupTime: '08:20',
                children: ['child-3-id'],
              },
            ],
          },
          reason: 'Route optimization',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(updateResponse.status()).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.success).toBe(true);
      expect(updateData.updated).toBe(true);
      expect(updateData.notificationsQueued).toBe(true);
    });

    test('add passenger to existing trip', async ({ request }) => {
      const addPassengerResponse = await makeApiRequest(
        request,
        'PUT',
        `/api/trips-edit/${testTripId}`,
        {
          action: 'add_passenger',
          passenger: {
            childId: 'new-child-id',
            parentId: 'new-parent@example.com',
            pickupLocation: '555 New Address, San Francisco, CA',
            seatNumber: 2,
          },
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(addPassengerResponse.status()).toBe(200);
      const addPassengerData = await addPassengerResponse.json();
      expect(addPassengerData.success).toBe(true);
      expect(addPassengerData.passengerAdded).toBe(true);
    });

    test('remove passenger from trip', async ({ request }) => {
      const removePassengerResponse = await makeApiRequest(
        request,
        'PUT',
        `/api/trips-edit/${testTripId}`,
        {
          action: 'remove_passenger',
          passengerId: 'child-1-id',
          reason: 'Student absent today',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(removePassengerResponse.status()).toBe(200);
      const removePassengerData = await removePassengerResponse.json();
      expect(removePassengerData.success).toBe(true);
      expect(removePassengerData.passengerRemoved).toBe(true);
    });

    test('change trip driver - transfer ownership', async ({ request }) => {
      const changeDriverResponse = await makeApiRequest(
        request,
        'PUT',
        `/api/trips-edit/${testTripId}`,
        {
          action: 'change_driver',
          newDriverId: 'alternate-driver@example.com',
          reason: 'Original driver unavailable',
          transferTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(changeDriverResponse.status()).toBe(200);
      const changeDriverData = await changeDriverResponse.json();
      expect(changeDriverData.success).toBe(true);
      expect(changeDriverData.driverChanged).toBe(true);
      expect(changeDriverData.notificationsSent).toBe(true);
    });

    test('postpone trip to different date', async ({ request }) => {
      const postponeResponse = await makeApiRequest(
        request,
        'PUT',
        `/api/trips-edit/${testTripId}`,
        {
          action: 'postpone',
          newDate: '2025-06-30',
          newTime: '08:30',
          reason: 'Weather conditions',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(postponeResponse.status()).toBe(200);
      const postponeData = await postponeResponse.json();
      expect(postponeData.success).toBe(true);
      expect(postponeData.postponed).toBe(true);
    });
  });

  test.describe('Trip Cancellation', () => {
    test('cancel trip with advance notice', async ({ request }) => {
      const cancelResponse = await makeApiRequest(
        request,
        'DELETE',
        `/api/trips-cancel/${testTripId}`,
        {
          reason: 'School holiday',
          noticeHours: 24,
          refundPolicy: 'full_refund',
          alternativeArrangements: 'Parents will handle individual transport',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(cancelResponse.status()).toBe(200);
      const cancelData = await cancelResponse.json();
      expect(cancelData.success).toBe(true);
      expect(cancelData.cancelled).toBe(true);
      expect(cancelData.refundProcessed).toBe(true);
      expect(cancelData.notificationsSent).toBe(true);
    });

    test('cancel trip - last minute emergency', async ({ request }) => {
      // Create another trip to cancel
      const createResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trips-create',
        {
          type: 'pickup',
          date: new Date().toISOString().split('T')[0],
          time: '14:00',
          groupId: testGroupId,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      const createData = await createResponse.json();
      const emergencyTripId = createData.tripId;

      const emergencyCancelResponse = await makeApiRequest(
        request,
        'DELETE',
        `/api/trips-cancel/${emergencyTripId}`,
        {
          reason: 'Driver emergency',
          emergency: true,
          noticeHours: 0.5, // 30 minutes notice
          urgentNotification: true,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(emergencyCancelResponse.status()).toBe(200);
      const emergencyCancelData = await emergencyCancelResponse.json();
      expect(emergencyCancelData.success).toBe(true);
      expect(emergencyCancelData.emergency).toBe(true);
      expect(emergencyCancelData.urgentNotificationsSent).toBe(true);
    });

    test('bulk cancel recurring trips', async ({ request }) => {
      const bulkCancelResponse = await makeApiRequest(
        request,
        'DELETE',
        '/api/trips-bulk-cancel',
        {
          groupId: testGroupId,
          dateRange: {
            start: '2025-07-01',
            end: '2025-07-07',
          },
          reason: 'Summer break',
          cancelRecurring: true,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(bulkCancelResponse.status()).toBe(200);
      const bulkCancelData = await bulkCancelResponse.json();
      expect(bulkCancelData.success).toBe(true);
      expect(bulkCancelData.cancelledCount).toBeGreaterThan(0);
    });

    test('cancel trip - insufficient participants', async ({ request }) => {
      const insufficientCancelResponse = await makeApiRequest(
        request,
        'DELETE',
        '/api/trips-auto-cancel',
        {
          tripId: 'under-capacity-trip-id',
          reason: 'insufficient_participants',
          minimumParticipants: 3,
          currentParticipants: 1,
          refundPolicy: 'full_refund',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(insufficientCancelResponse.status()).toBe(200);
      const insufficientCancelData = await insufficientCancelResponse.json();
      expect(insufficientCancelData.success).toBe(true);
      expect(insufficientCancelData.autoCancel).toBe(true);
    });
  });

  test.describe('Recurring Trip Management', () => {
    test('create weekly recurring trip series', async ({ request }) => {
      const recurringResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trips-recurring',
        {
          template: {
            type: 'pickup',
            time: '08:00',
            groupId: testGroupId,
            route: {
              startLocation: '123 Start Street, San Francisco, CA',
              destination: 'Lincoln Elementary School, San Francisco, CA',
            },
          },
          recurrence: {
            frequency: 'weekly',
            days: ['Monday', 'Wednesday', 'Friday'],
            startDate: '2025-06-23',
            endDate: '2025-08-30',
            exceptions: ['2025-07-04'], // July 4th holiday
          },
          autoAssignDrivers: true,
          rotationPattern: 'round_robin',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(recurringResponse.status()).toBe(200);
      const recurringData = await recurringResponse.json();
      expect(recurringData.success).toBe(true);
      expect(recurringData.seriesId).toBeDefined();
      expect(recurringData.tripsCreated).toBeGreaterThan(0);
    });

    test('modify recurring trip series', async ({ request }) => {
      const modifySeriesResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/trips-recurring/series-id',
        {
          changes: {
            time: '08:15', // Change pickup time
            endDate: '2025-08-15', // Shorten series
          },
          applyTo: 'future_trips', // Only affect future trips
          reason: 'Schedule adjustment',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(modifySeriesResponse.status()).toBe(200);
      const modifySeriesData = await modifySeriesResponse.json();
      expect(modifySeriesData.success).toBe(true);
      expect(modifySeriesData.tripsModified).toBeGreaterThan(0);
    });

    test('add exception to recurring series', async ({ request }) => {
      const exceptionResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/trips-recurring/series-id/exceptions',
        {
          exceptionDates: ['2025-07-15', '2025-07-16'],
          reason: 'Teacher professional development days',
          notifyParticipants: true,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(exceptionResponse.status()).toBe(200);
      const exceptionData = await exceptionResponse.json();
      expect(exceptionData.success).toBe(true);
      expect(exceptionData.exceptionsAdded).toBe(2);
    });

    test('pause recurring trip series temporarily', async ({ request }) => {
      const pauseResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/trips-recurring/series-id/pause',
        {
          pauseStart: '2025-07-20',
          pauseEnd: '2025-07-27',
          reason: 'Summer camp week',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(pauseResponse.status()).toBe(200);
      const pauseData = await pauseResponse.json();
      expect(pauseData.success).toBe(true);
      expect(pauseData.paused).toBe(true);
    });

    test('resume paused recurring series', async ({ request }) => {
      const resumeResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/trips-recurring/series-id/resume',
        {
          resumeDate: '2025-07-28',
          adjustSchedule: true,
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(resumeResponse.status()).toBe(200);
      const resumeData = await resumeResponse.json();
      expect(resumeData.success).toBe(true);
      expect(resumeData.resumed).toBe(true);
    });
  });

  test.describe('Trip Statistics and Reporting', () => {
    test('get trip statistics overview', async ({ request }) => {
      const statsResponse = await makeApiRequest(request, 'GET', '/api/trips-stats', null, {
        Authorization: `Bearer ${userToken}`,
      });

      expect(statsResponse.status()).toBe(200);
      const statsData = await statsResponse.json();
      expect(statsData.totalTrips).toBeDefined();
      expect(statsData.totalMiles).toBeDefined();
      expect(statsData.totalSavings).toBeDefined();
      expect(statsData.environmentalImpact).toBeDefined();
    });

    test('get detailed trip statistics from database', async ({ request }) => {
      const dbStatsResponse = await makeApiRequest(
        request,
        'GET',
        '/api/trips-stats-db?period=30days&groupId=' + testGroupId,
        null,
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(dbStatsResponse.status()).toBe(200);
      const dbStatsData = await dbStatsResponse.json();
      expect(dbStatsData.stats).toBeDefined();
      expect(dbStatsData.stats.completedTrips).toBeDefined();
      expect(dbStatsData.stats.cancelledTrips).toBeDefined();
      expect(dbStatsData.stats.averageRating).toBeDefined();
    });

    test('generate trip efficiency report', async ({ request }) => {
      const efficiencyResponse = await makeApiRequest(
        request,
        'GET',
        '/api/trip-efficiency-report',
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(efficiencyResponse.status()).toBe(200);
      const efficiencyData = await efficiencyResponse.json();
      expect(efficiencyData.routeOptimization).toBeDefined();
      expect(efficiencyData.fuelEfficiency).toBeDefined();
      expect(efficiencyData.timeEfficiency).toBeDefined();
      expect(efficiencyData.recommendations).toBeDefined();
    });

    test('export trip data for analysis', async ({ request }) => {
      const exportResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trips-export',
        {
          format: 'csv',
          dateRange: {
            start: '2025-06-01',
            end: '2025-06-30',
          },
          includeFields: [
            'tripId',
            'date',
            'time',
            'driverId',
            'passengerCount',
            'distance',
            'duration',
            'status',
          ],
          groupId: testGroupId,
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(exportResponse.status()).toBe(200);
      const exportData = await exportResponse.json();
      expect(exportData.success).toBe(true);
      expect(exportData.downloadUrl).toBeDefined();
      expect(exportData.recordCount).toBeGreaterThan(0);
    });
  });

  test.describe('Real-time Trip Tracking', () => {
    test('start trip tracking', async ({ request }) => {
      const trackingResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trip-tracking/start',
        {
          tripId: testTripId,
          driverLocation: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
          estimatedArrival: '08:20',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(trackingResponse.status()).toBe(200);
      const trackingData = await trackingResponse.json();
      expect(trackingData.success).toBe(true);
      expect(trackingData.trackingStarted).toBe(true);
      expect(trackingData.sessionId).toBeDefined();
    });

    test('update driver location during trip', async ({ request }) => {
      const locationResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/trip-tracking/location',
        {
          tripId: testTripId,
          location: {
            latitude: 37.7849,
            longitude: -122.4094,
          },
          speed: 25,
          heading: 180,
          timestamp: new Date().toISOString(),
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(locationResponse.status()).toBe(200);
      const locationData = await locationResponse.json();
      expect(locationData.success).toBe(true);
      expect(locationData.locationUpdated).toBe(true);
    });

    test('complete trip and update status', async ({ request }) => {
      const completeResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trip-tracking/complete',
        {
          tripId: testTripId,
          completionTime: new Date().toISOString(),
          finalLocation: {
            latitude: 37.7549,
            longitude: -122.4394,
          },
          passengerDropoffs: [
            {
              childId: 'child-1-id',
              dropoffTime: '08:15',
              location: '456 Stop 1',
            },
          ],
          notes: 'Trip completed successfully',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(completeResponse.status()).toBe(200);
      const completeData = await completeResponse.json();
      expect(completeData.success).toBe(true);
      expect(completeData.tripCompleted).toBe(true);
    });

    test('handle trip emergency during transit', async ({ request }) => {
      const emergencyResponse = await makeApiRequest(
        request,
        'POST',
        '/api/trip-emergency',
        {
          tripId: testTripId,
          emergencyType: 'mechanical_breakdown',
          location: {
            latitude: 37.765,
            longitude: -122.42,
          },
          description: 'Flat tire on Market Street',
          severity: 'medium',
          alternativeArrangements: 'Backup driver dispatched',
        },
        {
          Authorization: `Bearer ${userToken}`,
        },
      );

      expect(emergencyResponse.status()).toBe(200);
      const emergencyData = await emergencyResponse.json();
      expect(emergencyData.success).toBe(true);
      expect(emergencyData.emergencyLogged).toBe(true);
      expect(emergencyData.notificationsSent).toBe(true);
    });
  });

  test.describe('Driver Assignment Management', () => {
    test('assign primary driver to trip', async ({ request }) => {
      const assignResponse = await makeApiRequest(
        request,
        'POST',
        '/api/driver-assignment',
        {
          tripId: testTripId,
          driverId: parentUser.email,
          assignmentType: 'primary',
          confirmation: 'auto_confirm',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(assignResponse.status()).toBe(200);
      const assignData = await assignResponse.json();
      expect(assignData.success).toBe(true);
      expect(assignData.driverAssigned).toBe(true);
    });

    test('assign backup driver for trip', async ({ request }) => {
      const backupResponse = await makeApiRequest(
        request,
        'POST',
        '/api/driver-assignment',
        {
          tripId: testTripId,
          driverId: 'backup-driver@example.com',
          assignmentType: 'backup',
          activationCriteria: {
            primaryUnavailable: true,
            noticePeriod: 2, // hours
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(backupResponse.status()).toBe(200);
      const backupData = await backupResponse.json();
      expect(backupData.success).toBe(true);
      expect(backupData.backupDriverAssigned).toBe(true);
    });

    test('automatic driver assignment based on availability', async ({ request }) => {
      const autoAssignResponse = await makeApiRequest(
        request,
        'POST',
        '/api/auto-driver-assignment',
        {
          tripId: 'new-trip-id',
          criteria: {
            proximity: 5, // miles
            availability: true,
            rating: 4.0, // minimum rating
            experience: 6, // months
          },
          fallbackOptions: {
            expandRadius: true,
            lowerRatingThreshold: 3.5,
          },
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(autoAssignResponse.status()).toBe(200);
      const autoAssignData = await autoAssignResponse.json();
      expect(autoAssignData.success).toBe(true);
      expect(autoAssignData.assignmentMethod).toBeDefined();
    });

    test('reassign driver due to unavailability', async ({ request }) => {
      const reassignResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/driver-reassignment',
        {
          tripId: testTripId,
          originalDriverId: parentUser.email,
          newDriverId: 'replacement-driver@example.com',
          reason: 'Original driver became unavailable',
          urgency: 'high',
          notificationPreference: 'immediate',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(reassignResponse.status()).toBe(200);
      const reassignData = await reassignResponse.json();
      expect(reassignData.success).toBe(true);
      expect(reassignData.driverReassigned).toBe(true);
      expect(reassignData.notificationsSent).toBe(true);
    });
  });
});
