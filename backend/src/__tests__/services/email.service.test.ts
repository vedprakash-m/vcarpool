/**
 * Email Service Test Suite - Comprehensive Coverage
 *
 * Testing all email service methods to improve coverage from 13.04% to 80%+
 * Includes all notification types, error handling, and template management
 */

import { EmailService } from '../../services/email.service';

// Mock process.env
const originalEnv = process.env;

describe('EmailService', () => {
  let emailService: EmailService;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset environment variables
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.SENDGRID_API_KEY = 'test-api-key';
    process.env.FROM_EMAIL = 'test@carpool.com';
    process.env.FROM_NAME = 'Test Carpool';

    emailService = new EmailService();

    // Mock console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with default config values when env vars are not set', () => {
      process.env.SENDGRID_API_KEY = '';
      process.env.FROM_EMAIL = '';
      process.env.FROM_NAME = '';

      const service = new EmailService();

      // We can't directly access private config, but we can test the behavior
      expect(service).toBeInstanceOf(EmailService);
    });

    it('should initialize with environment variable values when set', () => {
      process.env.SENDGRID_API_KEY = 'custom-key';
      process.env.FROM_EMAIL = 'custom@test.com';
      process.env.FROM_NAME = 'Custom Name';

      const service = new EmailService();

      expect(service).toBeInstanceOf(EmailService);
    });
  });

  describe('sendTripCreatedNotification', () => {
    it('should send trip created notification successfully', async () => {
      const driverEmail = 'driver@test.com';
      const driverName = 'John Driver';
      const tripDetails = {
        date: '2024-12-01',
        departureTime: '08:00',
        destination: 'School',
        maxPassengers: 4,
      };

      await emailService.sendTripCreatedNotification(driverEmail, driverName, tripDetails);

      expect(consoleSpy).toHaveBeenCalledWith('Sending email:', {
        to: [driverEmail],
        templateId: 'trip-created',
        variables: {
          driverName,
          tripDate: new Date(tripDetails.date).toLocaleDateString(),
          departureTime: tripDetails.departureTime,
          destination: tripDetails.destination,
          maxPassengers: tripDetails.maxPassengers,
        },
      });
    });

    it('should handle date formatting correctly', async () => {
      const driverEmail = 'driver@test.com';
      const driverName = 'John Driver';
      const tripDetails = {
        date: '2024-03-15',
        departureTime: '07:45',
        destination: 'Lincoln Elementary',
        maxPassengers: 3,
      };

      await emailService.sendTripCreatedNotification(driverEmail, driverName, tripDetails);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending email:',
        expect.objectContaining({
          variables: expect.objectContaining({
            tripDate: new Date('2024-03-15').toLocaleDateString(),
          }),
        }),
      );
    });
  });

  describe('sendTripJoinedNotification', () => {
    it('should send trip joined notification successfully', async () => {
      const driverEmail = 'driver@test.com';
      const driverName = 'John Driver';
      const passengerName = 'Jane Passenger';
      const tripDetails = {
        date: '2024-12-01',
        departureTime: '08:00',
        destination: 'School',
      };

      await emailService.sendTripJoinedNotification(
        driverEmail,
        driverName,
        passengerName,
        tripDetails,
      );

      expect(consoleSpy).toHaveBeenCalledWith('Sending email:', {
        to: [driverEmail],
        templateId: 'trip-joined',
        variables: {
          driverName,
          passengerName,
          tripDate: new Date(tripDetails.date).toLocaleDateString(),
          departureTime: tripDetails.departureTime,
          destination: tripDetails.destination,
        },
      });
    });

    it('should handle multiple passengers joining', async () => {
      const driverEmail = 'driver@test.com';
      const driverName = 'John Driver';
      const tripDetails = {
        date: '2024-12-01',
        departureTime: '08:00',
        destination: 'School',
      };

      // Test multiple passengers
      await emailService.sendTripJoinedNotification(
        driverEmail,
        driverName,
        'Passenger One',
        tripDetails,
      );

      await emailService.sendTripJoinedNotification(
        driverEmail,
        driverName,
        'Passenger Two',
        tripDetails,
      );

      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendJoinConfirmationNotification', () => {
    it('should send join confirmation notification successfully', async () => {
      const passengerEmail = 'passenger@test.com';
      const passengerName = 'Jane Passenger';
      const driverName = 'John Driver';
      const tripDetails = {
        date: '2024-12-01',
        departureTime: '08:00',
        destination: 'School',
      };

      await emailService.sendJoinConfirmationNotification(
        passengerEmail,
        passengerName,
        driverName,
        tripDetails,
      );

      expect(consoleSpy).toHaveBeenCalledWith('Sending email:', {
        to: [passengerEmail],
        templateId: 'join-confirmation',
        variables: {
          passengerName,
          driverName,
          tripDate: new Date(tripDetails.date).toLocaleDateString(),
          departureTime: tripDetails.departureTime,
          destination: tripDetails.destination,
        },
      });
    });

    it('should handle different time formats', async () => {
      const passengerEmail = 'passenger@test.com';
      const passengerName = 'Jane Passenger';
      const driverName = 'John Driver';
      const tripDetails = {
        date: '2024-12-01',
        departureTime: '15:30',
        destination: 'After School Program',
      };

      await emailService.sendJoinConfirmationNotification(
        passengerEmail,
        passengerName,
        driverName,
        tripDetails,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending email:',
        expect.objectContaining({
          variables: expect.objectContaining({
            departureTime: '15:30',
          }),
        }),
      );
    });
  });

  describe('sendTripReminder', () => {
    it('should send trip reminder to multiple emails', async () => {
      const emails = ['driver@test.com', 'passenger1@test.com', 'passenger2@test.com'];
      const tripDetails = {
        date: '2024-12-01',
        departureTime: '08:00',
        destination: 'School',
        driverName: 'John Driver',
      };

      await emailService.sendTripReminder(emails, tripDetails);

      expect(consoleSpy).toHaveBeenCalledWith('Sending email:', {
        to: emails,
        templateId: 'trip-reminder',
        variables: {
          tripDate: new Date(tripDetails.date).toLocaleDateString(),
          departureTime: tripDetails.departureTime,
          destination: tripDetails.destination,
          driverName: tripDetails.driverName,
        },
      });
    });

    it('should handle single email in array', async () => {
      const emails = ['driver@test.com'];
      const tripDetails = {
        date: '2024-12-01',
        departureTime: '08:00',
        destination: 'School',
        driverName: 'John Driver',
      };

      await emailService.sendTripReminder(emails, tripDetails);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending email:',
        expect.objectContaining({
          to: emails,
        }),
      );
    });

    it('should handle empty email array', async () => {
      const emails: string[] = [];
      const tripDetails = {
        date: '2024-12-01',
        departureTime: '08:00',
        destination: 'School',
        driverName: 'John Driver',
      };

      await emailService.sendTripReminder(emails, tripDetails);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending email:',
        expect.objectContaining({
          to: [],
        }),
      );
    });
  });

  describe('sendTripUpdateNotification', () => {
    it('should send trip update notification successfully', async () => {
      const emails = ['driver@test.com', 'passenger@test.com'];
      const updateDetails = {
        driverName: 'John Driver',
        changes: ['Time changed to 08:30', 'Pickup location updated'],
        tripDate: '2024-12-01',
        destination: 'School',
      };

      await emailService.sendTripUpdateNotification(emails, updateDetails);

      expect(consoleSpy).toHaveBeenCalledWith('Sending email:', {
        to: emails,
        templateId: 'trip-updated',
        variables: {
          driverName: updateDetails.driverName,
          changes: 'Time changed to 08:30, Pickup location updated',
          tripDate: new Date(updateDetails.tripDate).toLocaleDateString(),
          destination: updateDetails.destination,
        },
      });
    });

    it('should handle single change', async () => {
      const emails = ['test@test.com'];
      const updateDetails = {
        driverName: 'John Driver',
        changes: ['Time changed'],
        tripDate: '2024-12-01',
        destination: 'School',
      };

      await emailService.sendTripUpdateNotification(emails, updateDetails);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending email:',
        expect.objectContaining({
          variables: expect.objectContaining({
            changes: 'Time changed',
          }),
        }),
      );
    });

    it('should handle empty changes array', async () => {
      const emails = ['test@test.com'];
      const updateDetails = {
        driverName: 'John Driver',
        changes: [],
        tripDate: '2024-12-01',
        destination: 'School',
      };

      await emailService.sendTripUpdateNotification(emails, updateDetails);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending email:',
        expect.objectContaining({
          variables: expect.objectContaining({
            changes: '',
          }),
        }),
      );
    });
  });

  describe('sendTripCancelledNotification', () => {
    it('should send trip cancelled notification with reason', async () => {
      const emails = ['passenger1@test.com', 'passenger2@test.com'];
      const tripDetails = {
        date: '2024-12-01',
        destination: 'School',
        driverName: 'John Driver',
        reason: 'Car broke down',
      };

      await emailService.sendTripCancelledNotification(emails, tripDetails);

      expect(consoleSpy).toHaveBeenCalledWith('Sending email:', {
        to: emails,
        templateId: 'trip-cancelled',
        variables: {
          tripDate: new Date(tripDetails.date).toLocaleDateString(),
          destination: tripDetails.destination,
          driverName: tripDetails.driverName,
          reason: 'Car broke down',
        },
      });
    });

    it('should send trip cancelled notification without reason', async () => {
      const emails = ['passenger@test.com'];
      const tripDetails = {
        date: '2024-12-01',
        destination: 'School',
        driverName: 'John Driver',
      };

      await emailService.sendTripCancelledNotification(emails, tripDetails);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending email:',
        expect.objectContaining({
          variables: expect.objectContaining({
            reason: 'No reason provided',
          }),
        }),
      );
    });

    it('should handle empty reason string', async () => {
      const emails = ['passenger@test.com'];
      const tripDetails = {
        date: '2024-12-01',
        destination: 'School',
        driverName: 'John Driver',
        reason: '',
      };

      await emailService.sendTripCancelledNotification(emails, tripDetails);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending email:',
        expect.objectContaining({
          variables: expect.objectContaining({
            reason: 'No reason provided',
          }),
        }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const email = 'user@test.com';
      const resetDetails = {
        firstName: 'John',
        resetLink: 'https://carpool.com/reset?token=abc123',
        resetToken: 'abc123',
      };

      await emailService.sendPasswordResetEmail(email, resetDetails);

      expect(consoleSpy).toHaveBeenCalledWith('Sending email:', {
        to: [email],
        templateId: 'password-reset',
        variables: {
          firstName: resetDetails.firstName,
          resetLink: resetDetails.resetLink,
          resetToken: resetDetails.resetToken,
          expiresIn: '1 hour',
        },
      });
    });

    it('should handle different reset link formats', async () => {
      const email = 'user@test.com';
      const resetDetails = {
        firstName: 'Jane',
        resetLink: 'http://localhost:3000/reset/xyz789',
        resetToken: 'xyz789',
      };

      await emailService.sendPasswordResetEmail(email, resetDetails);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending email:',
        expect.objectContaining({
          variables: expect.objectContaining({
            resetLink: 'http://localhost:3000/reset/xyz789',
            resetToken: 'xyz789',
          }),
        }),
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const email = 'newuser@test.com';
      const userDetails = {
        firstName: 'John',
        lastName: 'Doe',
      };

      await emailService.sendWelcomeEmail(email, userDetails);

      expect(consoleSpy).toHaveBeenCalledWith('Sending email:', {
        to: [email],
        templateId: 'welcome',
        variables: {
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
        },
      });
    });

    it('should handle users with single names', async () => {
      const email = 'singlename@test.com';
      const userDetails = {
        firstName: 'Madonna',
        lastName: '',
      };

      await emailService.sendWelcomeEmail(email, userDetails);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending email:',
        expect.objectContaining({
          variables: expect.objectContaining({
            firstName: 'Madonna',
            lastName: '',
          }),
        }),
      );
    });
  });

  describe('getEmailTemplates', () => {
    it('should return all email templates', async () => {
      const templates = await emailService.getEmailTemplates();

      expect(templates).toHaveLength(6);
      expect(templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'trip-created',
            name: 'Trip Created',
            subject: 'Your carpool trip has been created',
          }),
          expect.objectContaining({
            id: 'trip-joined',
            name: 'Trip Joined',
            subject: 'Someone joined your carpool trip',
          }),
          expect.objectContaining({
            id: 'join-confirmation',
            name: 'Join Confirmation',
            subject: "You've joined a carpool trip",
          }),
          expect.objectContaining({
            id: 'trip-reminder',
            name: 'Trip Reminder',
            subject: 'Reminder: Your carpool trip is tomorrow',
          }),
          expect.objectContaining({
            id: 'trip-updated',
            name: 'Trip Updated',
            subject: 'Your carpool trip has been updated',
          }),
          expect.objectContaining({
            id: 'trip-cancelled',
            name: 'Trip Cancelled',
            subject: 'Carpool trip cancelled',
          }),
        ]),
      );
    });

    it('should return templates with proper structure', async () => {
      const templates = await emailService.getEmailTemplates();

      templates.forEach((template) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('subject');
        expect(template).toHaveProperty('htmlContent');
        expect(template).toHaveProperty('textContent');
        expect(template).toHaveProperty('variables');
        expect(Array.isArray(template.variables)).toBe(true);
      });
    });

    it('should return templates with correct variable placeholders', async () => {
      const templates = await emailService.getEmailTemplates();
      const tripCreatedTemplate = templates.find((t) => t.id === 'trip-created');

      expect(tripCreatedTemplate?.variables).toEqual([
        'driverName',
        'destination',
        'tripDate',
        'departureTime',
        'maxPassengers',
      ]);
    });
  });

  describe('error handling in sendEmail', () => {
    it('should handle email sending errors gracefully', async () => {
      // Mock console.log to throw an error (simulating email service failure)
      consoleSpy.mockImplementation(() => {
        throw new Error('Email service failure');
      });

      // This should not throw an error
      await expect(
        emailService.sendWelcomeEmail('test@test.com', { firstName: 'Test', lastName: 'User' }),
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send email:', expect.any(Error));
    });

    it('should continue execution after email failure', async () => {
      consoleSpy.mockImplementationOnce(() => {
        throw new Error('First email failed');
      });

      // First email fails
      await emailService.sendWelcomeEmail('test1@test.com', {
        firstName: 'Test1',
        lastName: 'User1',
      });

      // Reset mock for second email
      consoleSpy.mockImplementationOnce(() => {});

      // Second email should succeed
      await emailService.sendWelcomeEmail('test2@test.com', {
        firstName: 'Test2',
        lastName: 'User2',
      });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });
  });
});
