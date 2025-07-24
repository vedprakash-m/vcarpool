/**
 * Multi-User Scenarios E2E Tests
 * Tests parent-to-parent interactions, group coordination, swap requests, and driver selection
 */

import { test, expect } from '@playwright/test';
import {
  TestUser,
  TestCarpoolGroup,
  createTestUser,
  cleanupTestUser,
  makeApiRequest,
} from '../utils/test-helpers';

test.describe('Multi-User Interaction Scenarios', () => {
  let parentUser1: TestUser;
  let parentUser2: TestUser;
  let parentUser3: TestUser;
  let adminUser: TestUser;
  let userToken1: string;
  let userToken2: string;
  let userToken3: string;
  let adminToken: string;
  let testGroupId: string;

  test.beforeAll(async ({ request }) => {
    // Create multiple test users
    parentUser1 = await createTestUser('parent');
    parentUser2 = await createTestUser('parent');
    parentUser3 = await createTestUser('parent');
    adminUser = await createTestUser('admin');

    // Get authentication tokens
    const login1Response = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: parentUser1.email,
      password: parentUser1.password,
    });
    const login1Data = await login1Response.json();
    userToken1 = login1Data.token;

    const login2Response = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: parentUser2.email,
      password: parentUser2.password,
    });
    const login2Data = await login2Response.json();
    userToken2 = login2Data.token;

    const login3Response = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: parentUser3.email,
      password: parentUser3.password,
    });
    const login3Data = await login3Response.json();
    userToken3 = login3Data.token;

    const adminLoginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
      email: adminUser.email,
      password: adminUser.password,
    });
    const adminLoginData = await adminLoginResponse.json();
    adminToken = adminLoginData.token;

    // Create a test carpool group for interactions
    const groupResponse = await makeApiRequest(
      request,
      'POST',
      '/api/parent-group-creation',
      {
        name: 'Multi-User Test Group',
        school: 'Lincoln Elementary',
        maxCapacity: 4,
        schedule: {
          days: ['Monday', 'Wednesday', 'Friday'],
          pickupTime: '08:00',
          dropoffTime: '15:30',
        },
        description: 'Test group for multi-user scenarios',
      },
      {
        Authorization: `Bearer ${userToken1}`,
      },
    );
    const groupData = await groupResponse.json();
    testGroupId = groupData.groupId;
  });

  test.afterAll(async () => {
    if (parentUser1) await cleanupTestUser(parentUser1.email);
    if (parentUser2) await cleanupTestUser(parentUser2.email);
    if (parentUser3) await cleanupTestUser(parentUser3.email);
    if (adminUser) await cleanupTestUser(adminUser.email);
  });

  test.describe('Parent-to-Parent Interactions', () => {
    test('parent requests to join existing group', async ({ request }) => {
      // Parent 2 searches for and requests to join Parent 1's group
      const searchResponse = await makeApiRequest(
        request,
        'POST',
        '/api/parent-group-search',
        {
          school: 'Lincoln Elementary',
          radius: 10,
        },
        {
          Authorization: `Bearer ${userToken2}`,
        },
      );

      const searchData = await searchResponse.json();
      expect(searchData.groups.length).toBeGreaterThan(0);

      // Request to join the group
      const joinResponse = await makeApiRequest(
        request,
        'POST',
        '/api/parent-join-request',
        {
          groupId: testGroupId,
          message: 'I would like to join your carpool group for my child.',
          childrenCount: 1,
        },
        {
          Authorization: `Bearer ${userToken2}`,
        },
      );

      expect(joinResponse.status()).toBe(200);
      const joinData = await joinResponse.json();
      expect(joinData.success).toBe(true);
      expect(joinData.requestId).toBeDefined();
    });

    test('group creator reviews and approves join request', async ({ request }) => {
      // Get pending join requests for the group
      const requestsResponse = await makeApiRequest(
        request,
        'GET',
        `/api/parent-join-requests?groupId=${testGroupId}`,
        null,
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      const requestsData = await requestsResponse.json();
      expect(requestsData.requests.length).toBeGreaterThan(0);

      const pendingRequest = requestsData.requests[0];

      // Approve the join request
      const approveResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/parent-join-request',
        {
          requestId: pendingRequest.id,
          action: 'approve',
          message: 'Welcome to our carpool group!',
        },
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      expect(approveResponse.status()).toBe(200);
      const approveData = await approveResponse.json();
      expect(approveData.success).toBe(true);
      expect(approveData.approved).toBe(true);
    });

    test('parent communication through group messaging', async ({ request }) => {
      // Send a message to the group
      const messageResponse = await makeApiRequest(
        request,
        'POST',
        '/api/group-messaging',
        {
          groupId: testGroupId,
          message: 'Hello everyone! Looking forward to carpooling together.',
          type: 'general',
        },
        {
          Authorization: `Bearer ${userToken2}`,
        },
      );

      expect(messageResponse.status()).toBe(200);
      const messageData = await messageResponse.json();
      expect(messageData.success).toBe(true);
      expect(messageData.messageId).toBeDefined();
    });

    test('group members view and respond to messages', async ({ request }) => {
      // Get group messages
      const messagesResponse = await makeApiRequest(
        request,
        'GET',
        `/api/group-messaging?groupId=${testGroupId}&limit=10`,
        null,
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      expect(messagesResponse.status()).toBe(200);
      const messagesData = await messagesResponse.json();
      expect(Array.isArray(messagesData.messages)).toBe(true);

      if (messagesData.messages.length > 0) {
        const messageId = messagesData.messages[0].id;

        // Reply to a message
        const replyResponse = await makeApiRequest(
          request,
          'POST',
          '/api/group-messaging',
          {
            groupId: testGroupId,
            message: 'Great to have you in the group!',
            type: 'reply',
            replyToId: messageId,
          },
          {
            Authorization: `Bearer ${userToken1}`,
          },
        );

        expect(replyResponse.status()).toBe(200);
        const replyData = await replyResponse.json();
        expect(replyData.success).toBe(true);
      }
    });

    test('direct messaging between parents', async ({ request }) => {
      // Send direct message from parent 1 to parent 2
      const dmResponse = await makeApiRequest(
        request,
        'POST',
        '/api/direct-messaging',
        {
          recipientId: parentUser2.email,
          subject: 'Carpool coordination',
          message: 'Can we coordinate pickup times for this week?',
          priority: 'normal',
        },
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      expect(dmResponse.status()).toBe(200);
      const dmData = await dmResponse.json();
      expect(dmData.success).toBe(true);
      expect(dmData.messageId).toBeDefined();
    });
  });

  test.describe('Group Coordination Workflows', () => {
    test('schedule weekly driver rotation', async ({ request }) => {
      const scheduleResponse = await makeApiRequest(
        request,
        'POST',
        '/api/group-driver-rotation',
        {
          groupId: testGroupId,
          week: '2025-06-23',
          rotationPattern: 'weekly',
          drivers: [
            { userId: parentUser1.email, days: ['Monday'] },
            { userId: parentUser2.email, days: ['Wednesday'] },
            { userId: parentUser1.email, days: ['Friday'] },
          ],
        },
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      expect(scheduleResponse.status()).toBe(200);
      const scheduleData = await scheduleResponse.json();
      expect(scheduleData.success).toBe(true);
      expect(scheduleData.schedule).toBeDefined();
    });

    test('coordinate emergency driver replacement', async ({ request }) => {
      const emergencyResponse = await makeApiRequest(
        request,
        'POST',
        '/api/emergency-coordination',
        {
          groupId: testGroupId,
          originalDriver: parentUser1.email,
          affectedDate: '2025-06-25',
          reason: 'Sick child',
          urgency: 'high',
        },
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      expect(emergencyResponse.status()).toBe(200);
      const emergencyData = await emergencyResponse.json();
      expect(emergencyData.success).toBe(true);
      expect(emergencyData.replacementRequestId).toBeDefined();
    });

    test('volunteer for emergency replacement', async ({ request }) => {
      // Parent 2 volunteers to replace Parent 1
      const volunteerResponse = await makeApiRequest(
        request,
        'POST',
        '/api/emergency-volunteer',
        {
          requestId: 'emergency-replacement-request-id',
          volunteerId: parentUser2.email,
          message: 'I can cover your shift tomorrow!',
        },
        {
          Authorization: `Bearer ${userToken2}`,
        },
      );

      expect(volunteerResponse.status()).toBe(200);
      const volunteerData = await volunteerResponse.json();
      expect(volunteerData.success).toBe(true);
      expect(volunteerData.volunteered).toBe(true);
    });

    test('group expense sharing and tracking', async ({ request }) => {
      const expenseResponse = await makeApiRequest(
        request,
        'POST',
        '/api/group-expenses',
        {
          groupId: testGroupId,
          type: 'fuel',
          amount: 25.5,
          description: 'Gas for week of June 23rd',
          paidBy: parentUser1.email,
          splitBetween: [parentUser1.email, parentUser2.email],
        },
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      expect(expenseResponse.status()).toBe(200);
      const expenseData = await expenseResponse.json();
      expect(expenseData.success).toBe(true);
      expect(expenseData.expenseId).toBeDefined();
    });

    test('settle group expenses', async ({ request }) => {
      const settlementResponse = await makeApiRequest(
        request,
        'POST',
        '/api/expense-settlement',
        {
          groupId: testGroupId,
          payerId: parentUser2.email,
          payeeId: parentUser1.email,
          amount: 12.75,
          expenseIds: ['expense-id-1'],
        },
        {
          Authorization: `Bearer ${userToken2}`,
        },
      );

      expect(settlementResponse.status()).toBe(200);
      const settlementData = await settlementResponse.json();
      expect(settlementData.success).toBe(true);
      expect(settlementData.settled).toBe(true);
    });
  });

  test.describe('Swap Request Management', () => {
    test('create swap request between parents', async ({ request }) => {
      const swapResponse = await makeApiRequest(
        request,
        'POST',
        '/api/parent-swap-requests',
        {
          groupId: testGroupId,
          originalDate: '2025-06-25',
          originalDriver: parentUser1.email,
          requestedDate: '2025-06-27',
          reason: 'Doctor appointment',
          urgency: 'normal',
        },
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      expect(swapResponse.status()).toBe(200);
      const swapData = await swapResponse.json();
      expect(swapData.success).toBe(true);
      expect(swapData.requestId).toBeDefined();
    });

    test('respond to swap request', async ({ request }) => {
      // Parent 2 accepts the swap request
      const responseResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/parent-swap-requests',
        {
          requestId: 'swap-request-id',
          action: 'accept',
          message: 'No problem, I can swap with you!',
        },
        {
          Authorization: `Bearer ${userToken2}`,
        },
      );

      expect(responseResponse.status()).toBe(200);
      const responseData = await responseResponse.json();
      expect(responseData.success).toBe(true);
      expect(responseData.accepted).toBe(true);
    });

    test('counter-propose alternative swap', async ({ request }) => {
      const counterResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/parent-swap-requests',
        {
          requestId: 'swap-request-id',
          action: 'counter_propose',
          counterProposal: {
            alternativeDate: '2025-06-26',
            message: 'How about Thursday instead?',
          },
        },
        {
          Authorization: `Bearer ${userToken2}`,
        },
      );

      expect(counterResponse.status()).toBe(200);
      const counterData = await counterResponse.json();
      expect(counterData.success).toBe(true);
      expect(counterData.counterProposed).toBe(true);
    });

    test('decline swap request with explanation', async ({ request }) => {
      const declineResponse = await makeApiRequest(
        request,
        'PUT',
        '/api/parent-swap-requests',
        {
          requestId: 'swap-request-id',
          action: 'decline',
          message: 'Sorry, I have a conflict that day.',
        },
        {
          Authorization: `Bearer ${userToken2}`,
        },
      );

      expect(declineResponse.status()).toBe(200);
      const declineData = await declineResponse.json();
      expect(declineData.success).toBe(true);
      expect(declineData.declined).toBe(true);
    });

    test('automatic swap request to group members', async ({ request }) => {
      const autoSwapResponse = await makeApiRequest(
        request,
        'POST',
        '/api/auto-swap-request',
        {
          groupId: testGroupId,
          originalDate: '2025-06-30',
          originalDriver: parentUser1.email,
          reason: 'Family emergency',
          urgency: 'high',
          broadcastToGroup: true,
        },
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      expect(autoSwapResponse.status()).toBe(200);
      const autoSwapData = await autoSwapResponse.json();
      expect(autoSwapData.success).toBe(true);
      expect(autoSwapData.broadcastId).toBeDefined();
    });
  });

  test.describe('Driver Selection Processes', () => {
    test('nominate preferred drivers for route', async ({ request }) => {
      const nominationResponse = await makeApiRequest(
        request,
        'POST',
        '/api/driver-nomination',
        {
          groupId: testGroupId,
          nominatedDrivers: [
            {
              driverId: parentUser1.email,
              preference: 'high',
              reason: 'Reliable and punctual',
            },
            {
              driverId: parentUser2.email,
              preference: 'medium',
              reason: 'Available on Wednesdays',
            },
          ],
          route: 'morning_pickup',
        },
        {
          Authorization: `Bearer ${userToken2}`,
        },
      );

      expect(nominationResponse.status()).toBe(200);
      const nominationData = await nominationResponse.json();
      expect(nominationData.success).toBe(true);
      expect(nominationData.nominationsRecorded).toBe(true);
    });

    test('vote on driver assignments', async ({ request }) => {
      const voteResponse = await makeApiRequest(
        request,
        'POST',
        '/api/driver-voting',
        {
          groupId: testGroupId,
          proposalId: 'driver-assignment-proposal-id',
          votes: [
            {
              driverId: parentUser1.email,
              vote: 'approve',
              timeSlot: 'Monday_morning',
            },
            {
              driverId: parentUser2.email,
              vote: 'approve',
              timeSlot: 'Wednesday_morning',
            },
          ],
        },
        {
          Authorization: `Bearer ${userToken3}`,
        },
      );

      expect(voteResponse.status()).toBe(200);
      const voteData = await voteResponse.json();
      expect(voteData.success).toBe(true);
      expect(voteData.votesRecorded).toBe(true);
    });

    test('automatic driver rotation based on fairness algorithm', async ({ request }) => {
      const autoRotationResponse = await makeApiRequest(
        request,
        'POST',
        '/api/auto-driver-rotation',
        {
          groupId: testGroupId,
          period: 'monthly',
          criteria: {
            balanceWorkload: true,
            considerPreferences: true,
            respectAvailability: true,
          },
          startDate: '2025-07-01',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(autoRotationResponse.status()).toBe(200);
      const autoRotationData = await autoRotationResponse.json();
      expect(autoRotationData.success).toBe(true);
      expect(autoRotationData.rotationSchedule).toBeDefined();
    });

    test('emergency driver assignment', async ({ request }) => {
      const emergencyAssignmentResponse = await makeApiRequest(
        request,
        'POST',
        '/api/emergency-driver-assignment',
        {
          groupId: testGroupId,
          date: '2025-06-24',
          timeSlot: 'morning',
          reason: 'Original driver unavailable',
          urgency: 'critical',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(emergencyAssignmentResponse.status()).toBe(200);
      const emergencyData = await emergencyAssignmentResponse.json();
      expect(emergencyData.success).toBe(true);
      expect(emergencyData.assignedDriver).toBeDefined();
    });
  });

  test.describe('Conflict Resolution', () => {
    test('report conflict between group members', async ({ request }) => {
      const conflictResponse = await makeApiRequest(
        request,
        'POST',
        '/api/conflict-reporting',
        {
          groupId: testGroupId,
          reportedBy: parentUser1.email,
          conflictWith: parentUser2.email,
          type: 'schedule_disagreement',
          description: 'Disagreement about pickup times',
          severity: 'medium',
        },
        {
          Authorization: `Bearer ${userToken1}`,
        },
      );

      expect(conflictResponse.status()).toBe(200);
      const conflictData = await conflictResponse.json();
      expect(conflictData.success).toBe(true);
      expect(conflictData.conflictId).toBeDefined();
    });

    test('mediate conflict through admin intervention', async ({ request }) => {
      const mediationResponse = await makeApiRequest(
        request,
        'POST',
        '/api/conflict-mediation',
        {
          conflictId: 'conflict-id',
          mediatorId: adminUser.email,
          resolution: 'Compromise on pickup time: 8:15 AM',
          requiredActions: [
            {
              userId: parentUser1.email,
              action: 'update_availability',
            },
            {
              userId: parentUser2.email,
              action: 'acknowledge_change',
            },
          ],
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(mediationResponse.status()).toBe(200);
      const mediationData = await mediationResponse.json();
      expect(mediationData.success).toBe(true);
      expect(mediationData.resolutionId).toBeDefined();
    });

    test('escalate unresolved conflicts', async ({ request }) => {
      const escalationResponse = await makeApiRequest(
        request,
        'POST',
        '/api/conflict-escalation',
        {
          conflictId: 'unresolved-conflict-id',
          escalatedBy: adminUser.email,
          escalationLevel: 'school_administration',
          reason: 'Unable to reach agreement',
        },
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(escalationResponse.status()).toBe(200);
      const escalationData = await escalationResponse.json();
      expect(escalationData.success).toBe(true);
      expect(escalationData.escalated).toBe(true);
    });
  });

  test.describe('Group Performance Analytics', () => {
    test('track group engagement metrics', async ({ request }) => {
      const engagementResponse = await makeApiRequest(
        request,
        'GET',
        `/api/group-analytics?groupId=${testGroupId}&type=engagement&period=30days`,
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(engagementResponse.status()).toBe(200);
      const engagementData = await engagementResponse.json();
      expect(engagementData.metrics).toBeDefined();
      expect(engagementData.metrics.messageFrequency).toBeDefined();
      expect(engagementData.metrics.participationRate).toBeDefined();
    });

    test('analyze swap request patterns', async ({ request }) => {
      const swapAnalyticsResponse = await makeApiRequest(
        request,
        'GET',
        `/api/swap-analytics?groupId=${testGroupId}&period=90days`,
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(swapAnalyticsResponse.status()).toBe(200);
      const swapAnalyticsData = await swapAnalyticsResponse.json();
      expect(swapAnalyticsData.patterns).toBeDefined();
      expect(swapAnalyticsData.success_rate).toBeDefined();
      expect(swapAnalyticsData.common_reasons).toBeDefined();
    });

    test('generate group health report', async ({ request }) => {
      const healthResponse = await makeApiRequest(
        request,
        'GET',
        `/api/group-health?groupId=${testGroupId}`,
        null,
        {
          Authorization: `Bearer ${adminToken}`,
        },
      );

      expect(healthResponse.status()).toBe(200);
      const healthData = await healthResponse.json();
      expect(healthData.overallHealth).toBeDefined();
      expect(healthData.communicationScore).toBeDefined();
      expect(healthData.reliabilityScore).toBeDefined();
      expect(healthData.recommendations).toBeDefined();
    });
  });
});
