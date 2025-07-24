import { EmailRequest, EmailTemplate } from '@carpool/shared';

interface EmailServiceConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class EmailService {
  private config: EmailServiceConfig;

  constructor() {
    this.config = {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.FROM_EMAIL || 'noreply@carpool.com',
      fromName: process.env.FROM_NAME || 'Carpool',
    };
  }

  /**
   * Send trip creation notification to driver
   */
  async sendTripCreatedNotification(
    driverEmail: string,
    driverName: string,
    tripDetails: {
      date: string;
      departureTime: string;
      destination: string;
      maxPassengers: number;
    },
  ): Promise<void> {
    const emailData: any = {
      to: [driverEmail],
      subject: 'New Trip Created',
      body: `A new trip has been created for ${tripDetails.destination}`,
      templateId: 'trip-created',
      variables: {
        driverName,
        tripDate: new Date(tripDetails.date).toLocaleDateString(),
        departureTime: tripDetails.departureTime,
        destination: tripDetails.destination,
        maxPassengers: tripDetails.maxPassengers,
      },
    } as any;

    await this.sendEmail(emailData);
  }

  /**
   * Send notification when someone joins a trip
   */
  async sendTripJoinedNotification(
    driverEmail: string,
    driverName: string,
    passengerName: string,
    tripDetails: {
      date: string;
      departureTime: string;
      destination: string;
    },
  ): Promise<void> {
    const emailData: any = {
      to: [driverEmail],
      templateId: 'trip-joined',
      variables: {
        driverName,
        passengerName,
        tripDate: new Date(tripDetails.date).toLocaleDateString(),
        departureTime: tripDetails.departureTime,
        destination: tripDetails.destination,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send confirmation to passenger when they join a trip
   */
  async sendJoinConfirmationNotification(
    passengerEmail: string,
    passengerName: string,
    driverName: string,
    tripDetails: {
      date: string;
      departureTime: string;
      destination: string;
    },
  ): Promise<void> {
    const emailData: any = {
      to: [passengerEmail],
      templateId: 'join-confirmation',
      variables: {
        passengerName,
        driverName,
        tripDate: new Date(tripDetails.date).toLocaleDateString(),
        departureTime: tripDetails.departureTime,
        destination: tripDetails.destination,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send trip reminder notifications (24 hours before)
   */
  async sendTripReminder(
    emails: string[],
    tripDetails: {
      date: string;
      departureTime: string;
      destination: string;
      driverName: string;
    },
  ): Promise<void> {
    const emailData: any = {
      to: emails,
      templateId: 'trip-reminder',
      variables: {
        tripDate: new Date(tripDetails.date).toLocaleDateString(),
        departureTime: tripDetails.departureTime,
        destination: tripDetails.destination,
        driverName: tripDetails.driverName,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send trip update notification
   */
  async sendTripUpdateNotification(
    emails: string[],
    updateDetails: {
      driverName: string;
      changes: string[];
      tripDate: string;
      destination: string;
    },
  ): Promise<void> {
    const emailData: any = {
      to: emails,
      templateId: 'trip-updated',
      variables: {
        driverName: updateDetails.driverName,
        changes: updateDetails.changes.join(', '),
        tripDate: new Date(updateDetails.tripDate).toLocaleDateString(),
        destination: updateDetails.destination,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send trip cancellation notification
   */
  async sendTripCancelledNotification(
    emails: string[],
    tripDetails: {
      date: string;
      destination: string;
      driverName: string;
      reason?: string;
    },
  ): Promise<void> {
    const emailData: any = {
      to: emails,
      templateId: 'trip-cancelled',
      variables: {
        tripDate: new Date(tripDetails.date).toLocaleDateString(),
        destination: tripDetails.destination,
        driverName: tripDetails.driverName,
        reason: tripDetails.reason || 'No reason provided',
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetDetails: {
      firstName: string;
      resetLink: string;
      resetToken: string;
    },
  ): Promise<void> {
    const emailData: any = {
      to: [email],
      templateId: 'password-reset',
      variables: {
        firstName: resetDetails.firstName,
        resetLink: resetDetails.resetLink,
        resetToken: resetDetails.resetToken,
        expiresIn: '1 hour',
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(
    email: string,
    userDetails: {
      firstName: string;
      lastName: string;
    },
  ): Promise<void> {
    const emailData: any = {
      to: [email],
      templateId: 'welcome',
      variables: {
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
      },
    };

    await this.sendEmail(emailData);
  }

  /**
   * Core email sending method
   */
  private async sendEmail(emailData: EmailRequest): Promise<void> {
    try {
      // In a real implementation, this would use SendGrid, AWS SES, or another email service
      // For now, we'll just log the email data
      console.log('Sending email:', {
        to: emailData.to,
        templateId: emailData.templateId,
        variables: emailData.variables,
      });

      // TODO: Implement actual email sending logic
      // Example with SendGrid:
      /*
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(this.config.apiKey);

      const msg = {
        to: emailData.to,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        templateId: emailData.templateId,
        dynamicTemplateData: emailData.variables,
      };

      await sgMail.send(msg);
      */
    } catch (error) {
      console.error('Failed to send email:', error);
      // Don't throw error to prevent email failures from breaking the main flow
    }
  }

  /**
   * Get email templates (for admin management)
   */
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    // In a real implementation, this would fetch from a database
    return [
      {
        id: 'trip-created',
        name: 'Trip Created',
        subject: 'Your carpool trip has been created',
        html: '<p>Hi {{driverName}}, your trip to {{destination}} on {{tripDate}} at {{departureTime}} has been created.</p>',
        text: 'Hi {{driverName}}, your trip to {{destination}} on {{tripDate}} at {{departureTime}} has been created.',
        htmlContent:
          '<p>Hi {{driverName}}, your trip to {{destination}} on {{tripDate}} at {{departureTime}} has been created.</p>',
        textContent:
          'Hi {{driverName}}, your trip to {{destination}} on {{tripDate}} at {{departureTime}} has been created.',
        bodyTemplate: "", variables: ['driverName', 'destination', 'tripDate', 'departureTime', 'maxPassengers'],
      },
      {
        id: 'trip-joined',
        name: 'Trip Joined',
        subject: 'Someone joined your carpool trip',
        html: '<p>Hi {{driverName}}, {{passengerName}} has joined your trip to {{destination}} on {{tripDate}}.</p>',
        text: 'Hi {{driverName}}, {{passengerName}} has joined your trip to {{destination}} on {{tripDate}}.',
        htmlContent:
          '<p>Hi {{driverName}}, {{passengerName}} has joined your trip to {{destination}} on {{tripDate}}.</p>',
        textContent:
          'Hi {{driverName}}, {{passengerName}} has joined your trip to {{destination}} on {{tripDate}}.',
        bodyTemplate: "", variables: ['driverName', 'passengerName', 'destination', 'tripDate'],
      },
      {
        id: 'join-confirmation',
        name: 'Join Confirmation',
        subject: "You've joined a carpool trip",
        html: "<p>Hi {{passengerName}}, you've successfully joined {{driverName}}'s trip to {{destination}} on {{tripDate}} at {{departureTime}}.</p>",
        text: "Hi {{passengerName}}, you've successfully joined {{driverName}}'s trip to {{destination}} on {{tripDate}} at {{departureTime}}.",
        htmlContent:
          "<p>Hi {{passengerName}}, you've successfully joined {{driverName}}'s trip to {{destination}} on {{tripDate}} at {{departureTime}}.</p>",
        textContent:
          "Hi {{passengerName}}, you've successfully joined {{driverName}}'s trip to {{destination}} on {{tripDate}} at {{departureTime}}.",
        bodyTemplate: "", variables: ['passengerName', 'driverName', 'destination', 'tripDate', 'departureTime'],
      },
      {
        id: 'trip-reminder',
        name: 'Trip Reminder',
        subject: 'Reminder: Your carpool trip is tomorrow',
        html: "<p>Don't forget about your carpool trip to {{destination}} tomorrow at {{departureTime}} with {{driverName}}.</p>",
        text: "Don't forget about your carpool trip to {{destination}} tomorrow at {{departureTime}} with {{driverName}}.",
        htmlContent:
          "<p>Don't forget about your carpool trip to {{destination}} tomorrow at {{departureTime}} with {{driverName}}.</p>",
        textContent:
          "Don't forget about your carpool trip to {{destination}} tomorrow at {{departureTime}} with {{driverName}}.",
        bodyTemplate: "", variables: ['destination', 'tripDate', 'departureTime', 'driverName'],
      },
      {
        id: 'trip-updated',
        name: 'Trip Updated',
        subject: 'Your carpool trip has been updated',
        html: '<p>{{driverName}} has updated the trip to {{destination}} on {{tripDate}}. Changes: {{changes}}.</p>',
        text: '{{driverName}} has updated the trip to {{destination}} on {{tripDate}}. Changes: {{changes}}.',
        htmlContent:
          '<p>{{driverName}} has updated the trip to {{destination}} on {{tripDate}}. Changes: {{changes}}.</p>',
        textContent:
          '{{driverName}} has updated the trip to {{destination}} on {{tripDate}}. Changes: {{changes}}.',
        bodyTemplate: "", variables: ['driverName', 'destination', 'tripDate', 'changes'],
      },
      {
        id: 'trip-cancelled',
        name: 'Trip Cancelled',
        subject: 'Carpool trip cancelled',
        html: '<p>Unfortunately, {{driverName}} has cancelled the trip to {{destination}} on {{tripDate}}. Reason: {{reason}}.</p>',
        text: 'Unfortunately, {{driverName}} has cancelled the trip to {{destination}} on {{tripDate}}. Reason: {{reason}}.',
        htmlContent:
          '<p>Unfortunately, {{driverName}} has cancelled the trip to {{destination}} on {{tripDate}}. Reason: {{reason}}.</p>',
        textContent:
          'Unfortunately, {{driverName}} has cancelled the trip to {{destination}} on {{tripDate}}. Reason: {{reason}}.',
        bodyTemplate: "", variables: ['driverName', 'destination', 'tripDate', 'reason'],
      },
    ];
  }
}

export const emailService = new EmailService();
