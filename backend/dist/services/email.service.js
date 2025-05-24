"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
class EmailService {
    config;
    constructor() {
        this.config = {
            apiKey: process.env.SENDGRID_API_KEY || '',
            fromEmail: process.env.FROM_EMAIL || 'noreply@vcarpool.com',
            fromName: process.env.FROM_NAME || 'VCarpool',
        };
    }
    /**
     * Send trip creation notification to driver
     */
    async sendTripCreatedNotification(driverEmail, driverName, tripDetails) {
        const emailData = {
            to: [driverEmail],
            templateId: 'trip-created',
            variables: {
                driverName,
                tripDate: new Date(tripDetails.date).toLocaleDateString(),
                departureTime: tripDetails.departureTime,
                destination: tripDetails.destination,
                maxPassengers: tripDetails.maxPassengers,
            },
        };
        await this.sendEmail(emailData);
    }
    /**
     * Send notification when someone joins a trip
     */
    async sendTripJoinedNotification(driverEmail, driverName, passengerName, tripDetails) {
        const emailData = {
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
    async sendJoinConfirmationNotification(passengerEmail, passengerName, driverName, tripDetails) {
        const emailData = {
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
    async sendTripReminder(emails, tripDetails) {
        const emailData = {
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
    async sendTripUpdateNotification(emails, updateDetails) {
        const emailData = {
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
    async sendTripCancelledNotification(emails, tripDetails) {
        const emailData = {
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
     * Core email sending method
     */
    async sendEmail(emailData) {
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
        }
        catch (error) {
            console.error('Failed to send email:', error);
            // Don't throw error to prevent email failures from breaking the main flow
        }
    }
    /**
     * Get email templates (for admin management)
     */
    async getEmailTemplates() {
        // In a real implementation, this would fetch from a database
        return [
            {
                id: 'trip-created',
                name: 'Trip Created',
                subject: 'Your carpool trip has been created',
                htmlContent: '<p>Hi {{driverName}}, your trip to {{destination}} on {{tripDate}} at {{departureTime}} has been created.</p>',
                textContent: 'Hi {{driverName}}, your trip to {{destination}} on {{tripDate}} at {{departureTime}} has been created.',
                variables: ['driverName', 'destination', 'tripDate', 'departureTime', 'maxPassengers'],
            },
            {
                id: 'trip-joined',
                name: 'Trip Joined',
                subject: 'Someone joined your carpool trip',
                htmlContent: '<p>Hi {{driverName}}, {{passengerName}} has joined your trip to {{destination}} on {{tripDate}}.</p>',
                textContent: 'Hi {{driverName}}, {{passengerName}} has joined your trip to {{destination}} on {{tripDate}}.',
                variables: ['driverName', 'passengerName', 'destination', 'tripDate'],
            },
            {
                id: 'join-confirmation',
                name: 'Join Confirmation',
                subject: 'You\'ve joined a carpool trip',
                htmlContent: '<p>Hi {{passengerName}}, you\'ve successfully joined {{driverName}}\'s trip to {{destination}} on {{tripDate}} at {{departureTime}}.</p>',
                textContent: 'Hi {{passengerName}}, you\'ve successfully joined {{driverName}}\'s trip to {{destination}} on {{tripDate}} at {{departureTime}}.',
                variables: ['passengerName', 'driverName', 'destination', 'tripDate', 'departureTime'],
            },
            {
                id: 'trip-reminder',
                name: 'Trip Reminder',
                subject: 'Reminder: Your carpool trip is tomorrow',
                htmlContent: '<p>Don\'t forget about your carpool trip to {{destination}} tomorrow at {{departureTime}} with {{driverName}}.</p>',
                textContent: 'Don\'t forget about your carpool trip to {{destination}} tomorrow at {{departureTime}} with {{driverName}}.',
                variables: ['destination', 'tripDate', 'departureTime', 'driverName'],
            },
            {
                id: 'trip-updated',
                name: 'Trip Updated',
                subject: 'Your carpool trip has been updated',
                htmlContent: '<p>{{driverName}} has updated the trip to {{destination}} on {{tripDate}}. Changes: {{changes}}.</p>',
                textContent: '{{driverName}} has updated the trip to {{destination}} on {{tripDate}}. Changes: {{changes}}.',
                variables: ['driverName', 'destination', 'tripDate', 'changes'],
            },
            {
                id: 'trip-cancelled',
                name: 'Trip Cancelled',
                subject: 'Carpool trip cancelled',
                htmlContent: '<p>Unfortunately, {{driverName}} has cancelled the trip to {{destination}} on {{tripDate}}. Reason: {{reason}}.</p>',
                textContent: 'Unfortunately, {{driverName}} has cancelled the trip to {{destination}} on {{tripDate}}. Reason: {{reason}}.',
                variables: ['driverName', 'destination', 'tripDate', 'reason'],
            },
        ];
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
//# sourceMappingURL=email.service.js.map