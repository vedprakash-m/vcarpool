/**
 * Admin Assignment Reminders Management
 *
 * Migrated from JavaScript to TypeScript
 * Handles both timer-based and HTTP-based reminder execution
 */

import { HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import { authenticate } from '../src/middleware';
import UnifiedResponseHandler from '../src/utils/unified-response.service';

interface Assignment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  driverPhone: string;
  passengers: Array<{
    id: string;
    name: string;
    parentEmail: string;
    parentPhone: string;
  }>;
  routeType: 'school_pickup' | 'school_dropoff';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  reminder24hSent: boolean;
  reminder2hSent: boolean;
  notes?: string;
}

interface ReminderRequest {
  assignmentId: string;
  reminderType: 'assignment_reminder_24h' | 'assignment_reminder_2h' | 'assignment_reminder_now';
}

interface ReminderResult {
  success: boolean;
  message: string;
  notificationId?: string;
  recipientCount?: number;
}

interface NotificationData {
  type: string;
  recipient: string;
  subject: string;
  message: string;
  assignmentDetails: Assignment;
}

export async function adminAssignmentReminders(
  request: HttpRequest,
  context: InvocationContext,
  reminderTimer?: Timer,
): Promise<HttpResponseInit | void> {
  context.log('Assignment Reminders function triggered');

  // Handle timer-based execution
  if (reminderTimer) {
    context.log('Running scheduled assignment reminders check');
    await processScheduledReminders(context);
    return;
  }

  // Handle HTTP-based execution
  if (request) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return UnifiedResponseHandler.preflight();
    }

    try {
      return await processManualReminders(request, context);
    } catch (error) {
      return UnifiedResponseHandler.internalError(
        'Failed to process assignment reminders',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}

// Process scheduled reminders (timer-triggered)
async function processScheduledReminders(context: InvocationContext): Promise<void> {
  try {
    const now = new Date();

    // Calculate reminder times
    const reminder24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reminder2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Get assignments that need reminders
    const assignments = await getUpcomingAssignments(reminder24h, reminder2h, context);

    let remindersSent = 0;

    for (const assignment of assignments) {
      const assignmentTime = new Date(`${assignment.date}T${assignment.startTime}:00`);
      const timeUntilAssignment = assignmentTime.getTime() - now.getTime();
      const hoursUntil = timeUntilAssignment / (1000 * 60 * 60);

      // Send 24h reminder
      if (hoursUntil <= 24 && hoursUntil > 23 && !assignment.reminder24hSent) {
        await sendAssignmentReminder('assignment_reminder_24h', assignment, context);
        await markReminderSent(assignment.id, '24h', context);
        remindersSent++;
      }

      // Send 2h reminder
      if (hoursUntil <= 2 && hoursUntil > 1 && !assignment.reminder2hSent) {
        await sendAssignmentReminder('assignment_reminder_2h', assignment, context);
        await markReminderSent(assignment.id, '2h', context);
        remindersSent++;
      }
    }

    context.log(`Processed ${assignments.length} assignments, sent ${remindersSent} reminders`);
  } catch (error) {
    context.log('Scheduled reminders error:', error);
  }
}

// Process manual reminders (HTTP-triggered)
async function processManualReminders(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  // Apply authentication middleware
  const authResponse = await authenticate(request, context);
  if (authResponse) {
    return authResponse;
  }

  // Check if user is authenticated
  if (!request.auth) {
    return UnifiedResponseHandler.authError('Authentication required');
  }

  const user = request.auth;

  // Validate admin access
  if (user.role !== 'super_admin' && user.role !== 'group_admin') {
    return UnifiedResponseHandler.forbiddenError('Admin access required');
  }

  const body = (await request.json()) as ReminderRequest;

  // Validate required fields
  if (!body.assignmentId || !body.reminderType) {
    return UnifiedResponseHandler.validationError(
      'Missing required fields: assignmentId, reminderType',
    );
  }

  // Get specific assignment
  const assignment = await getAssignmentById(body.assignmentId, context);

  if (!assignment) {
    return UnifiedResponseHandler.notFoundError('Assignment not found');
  }

  // Send reminder
  const result = await sendAssignmentReminder(body.reminderType, assignment, context);

  return UnifiedResponseHandler.success(result);
}

// Get upcoming assignments that need reminders
async function getUpcomingAssignments(
  reminder24h: Date,
  reminder2h: Date,
  context: InvocationContext,
): Promise<Assignment[]> {
  // In production, this would query Cosmos DB
  // For development, return mock assignments
  return getMockUpcomingAssignments();
}

// Get assignment by ID
async function getAssignmentById(
  assignmentId: string,
  context: InvocationContext,
): Promise<Assignment | undefined> {
  // In production, this would query Cosmos DB
  // For development, return mock assignment
  const assignments = getMockUpcomingAssignments();
  return assignments.find((a) => a.id === assignmentId);
}

// Send assignment reminder
async function sendAssignmentReminder(
  reminderType: string,
  assignment: Assignment,
  context: InvocationContext,
): Promise<ReminderResult> {
  try {
    const notificationData = buildReminderNotificationData(reminderType, assignment);

    // In production, this would call the notification service
    context.log(`Reminder simulated: ${reminderType} for assignment ${assignment.id}`);

    return {
      success: true,
      message: 'Reminder sent successfully',
      notificationId: `notif-${Date.now()}`,
      recipientCount: assignment.passengers.length + 1, // passengers + driver
    };
  } catch (error) {
    context.log('Send reminder error:', error);
    return {
      success: false,
      message: 'Failed to send reminder',
    };
  }
}

// Mark reminder as sent
async function markReminderSent(
  assignmentId: string,
  reminderType: string,
  context: InvocationContext,
): Promise<void> {
  // In production, this would update Cosmos DB
  context.log(`Marked ${reminderType} reminder as sent for assignment ${assignmentId}`);
}

// Build notification data
function buildReminderNotificationData(
  reminderType: string,
  assignment: Assignment,
): NotificationData {
  let subject = '';
  let message = '';

  switch (reminderType) {
    case 'assignment_reminder_24h':
      subject = 'Carpool Assignment Reminder - Tomorrow';
      message = `You have a carpool assignment scheduled for tomorrow at ${assignment.startTime}`;
      break;
    case 'assignment_reminder_2h':
      subject = 'Carpool Assignment Reminder - 2 Hours';
      message = `Your carpool assignment starts in 2 hours at ${assignment.startTime}`;
      break;
    case 'assignment_reminder_now':
      subject = 'Carpool Assignment Reminder - Now';
      message = `Your carpool assignment is starting now at ${assignment.startTime}`;
      break;
    default:
      subject = 'Carpool Assignment Reminder';
      message = `You have a carpool assignment scheduled`;
  }

  return {
    type: reminderType,
    recipient: assignment.driverEmail,
    subject,
    message,
    assignmentDetails: assignment,
  };
}

// Mock data for development
function getMockUpcomingAssignments(): Assignment[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  return [
    {
      id: 'assignment-1',
      date: tomorrowStr,
      startTime: '08:00',
      endTime: '08:30',
      driverId: 'user-1',
      driverName: 'John Doe',
      driverEmail: 'john@example.com',
      driverPhone: '555-1234',
      passengers: [
        {
          id: 'child-1',
          name: 'Emily Smith',
          parentEmail: 'smith@example.com',
          parentPhone: '555-5678',
        },
        {
          id: 'child-2',
          name: 'Michael Johnson',
          parentEmail: 'johnson@example.com',
          parentPhone: '555-9012',
        },
      ],
      routeType: 'school_pickup',
      status: 'scheduled',
      reminder24hSent: false,
      reminder2hSent: false,
      notes: 'Regular pickup route',
    },
    {
      id: 'assignment-2',
      date: tomorrowStr,
      startTime: '15:30',
      endTime: '16:00',
      driverId: 'user-2',
      driverName: 'Jane Smith',
      driverEmail: 'jane@example.com',
      driverPhone: '555-5678',
      passengers: [
        {
          id: 'child-3',
          name: 'Sarah Williams',
          parentEmail: 'williams@example.com',
          parentPhone: '555-3456',
        },
      ],
      routeType: 'school_dropoff',
      status: 'scheduled',
      reminder24hSent: false,
      reminder2hSent: false,
      notes: 'Afternoon dropoff',
    },
  ];
}
