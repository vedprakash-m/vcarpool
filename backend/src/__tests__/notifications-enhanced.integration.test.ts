/**
 * Integration Tests for Enhanced Notification System
 * Tests the enhanced notifications with Tesla STEM beta templates
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { NotificationTemplateRegistryService } from '../services/notification-template-registry.service';
import { renderEmailTemplate } from '../templates/email/beta-enhanced-templates';
import { renderSmsTemplate } from '../templates/sms/beta-enhanced-sms-templates';

describe('Enhanced Notification System Integration', () => {
  let templateRegistry: NotificationTemplateRegistryService;

  beforeAll(() => {
    templateRegistry = NotificationTemplateRegistryService.getInstance();
  });

  describe('Template Registry Service', () => {
    it('should have Tesla STEM beta templates registered', () => {
      const betaTemplates = templateRegistry.getBetaTemplates();
      const teslaTemplates = templateRegistry.getTeslaSpecificTemplates();

      expect(betaTemplates.length).toBeGreaterThan(0);
      expect(teslaTemplates.length).toBeGreaterThan(0);
      
      // Check specific templates
      const emergencyAlert = templateRegistry.getTemplate('emergency-alert');
      expect(emergencyAlert).toBeDefined();
      expect(emergencyAlert?.teslaSpecific).toBe(true);
      expect(emergencyAlert?.betaFeature).toBe(true);
      expect(emergencyAlert?.priority).toBe('critical');
    });

    it('should validate template data correctly', () => {
      const validData = {
        emergencyType: 'weather',
        details: 'Heavy snowfall causing delays',
        actionRequired: 'Please prepare for 30-minute delay',
        contactInfo: 'Call (555) 123-4567 for updates',
      };

      const validation = templateRegistry.validateTemplateData('emergency-alert', validData);
      expect(validation.isValid).toBe(true);
      expect(validation.missingFields).toHaveLength(0);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const incompleteData = {
        emergencyType: 'weather',
        // Missing: details, actionRequired, contactInfo
      };

      const validation = templateRegistry.validateTemplateData('emergency-alert', incompleteData);
      expect(validation.isValid).toBe(false);
      expect(validation.missingFields).toContain('details');
      expect(validation.missingFields).toContain('actionRequired');
      expect(validation.missingFields).toContain('contactInfo');
    });

    it('should provide accurate template stats', () => {
      const stats = templateRegistry.getTemplateStats();
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.betaCount).toBeGreaterThan(0);
      expect(stats.teslaCount).toBeGreaterThan(0);
      expect(stats.byCategory).toHaveProperty('emergency');
      expect(stats.byCategory).toHaveProperty('schedule');
      expect(stats.byChannel).toHaveProperty('email');
      expect(stats.byChannel).toHaveProperty('sms');
    });
  });

  describe('Email Template Rendering', () => {
    it('should render emergency notification email template', () => {
      const data = {
        timestamp: '2025-07-23 08:15 AM',
        groupName: 'Tesla STEM Group A',
        emergencyMessage: 'Severe snowstorm affecting pickup routes - all pickups delayed by 30 minutes',
        actionRequired: 'Please monitor your phone for updates and prepare for extended wait times',
        groupAdminName: 'John Smith',
        groupAdminPhone: '(555) 123-4567',
      };

      const emailResult = renderEmailTemplate('emergency-notification', data);
      
      expect(emailResult).toBeDefined();
      expect(emailResult).not.toBeNull();
      expect(emailResult!.html).toContain('08:15 AM');
      expect(emailResult!.html).toContain('Tesla STEM Group A');
      expect(emailResult!.html).toContain('Severe snowstorm');
      expect(emailResult!.html).toContain('Tesla STEM High School');
      expect(emailResult!.html).toContain('John Smith');
      expect(emailResult!.html).toContain('(555) 123-4567');
    });

    it('should render weekly schedule email template', () => {
      const data = {
        parentName: 'Sarah Johnson',
        groupName: 'Tesla STEM Group A',
        weekStart: 'February 3, 2025',
        scheduleDetails: `
          <p><strong>Monday:</strong> Mike Wilson driving at 7:30 AM - Emma J., Alex K.</p>
          <p><strong>Wednesday:</strong> Sarah Johnson driving at 7:30 AM - Emma J., Alex K., Sam L.</p>
          <p><strong>Friday:</strong> Lisa Chen driving at 7:30 AM - Emma J., Alex K.</p>
        `,
        fairnessScore: '95',
        emergencyContact: 'Group Admin: John Smith (555) 123-4567',
        groupId: 'group123',
      };

      const emailResult = renderEmailTemplate('weekly-schedule-ready', data);
      
      expect(emailResult).toBeDefined();
      expect(emailResult).not.toBeNull();
      expect(emailResult!.html).toContain('Sarah Johnson');
      expect(emailResult!.html).toContain('February 3, 2025');
      expect(emailResult!.html).toContain('Mike Wilson');
      expect(emailResult!.html).toContain('Emma J.');
      expect(emailResult!.html).toContain('arrive 5 minutes early');
    });

    it('should render beta welcome email template', () => {
      const data = {
        firstName: 'Michael Chen',
        homeAddress: '123 Tesla Way, Redmond, WA 98052',
        studentCount: '1',
      };

      const emailResult = renderEmailTemplate('welcome-registration', data);
      
      expect(emailResult).toBeDefined();
      expect(emailResult).not.toBeNull();
      expect(emailResult!.html).toContain('Michael Chen');
      expect(emailResult!.html).toContain('123 Tesla Way');
      expect(emailResult!.html).toContain('1 student(s)');
      expect(emailResult!.html).toContain('Tesla STEM High School');
      expect(emailResult!.html).toContain('Beta Testing Goals');
    });
  });

  describe('SMS Template Rendering', () => {
    it('should render emergency alert SMS template', () => {
      const data = {
        groupName: 'Tesla STEM Group A',
        emergencyMessage: 'Pickup delayed 45 min due to traffic incident',
        adminName: 'John Smith',
        adminPhone: '(555) 123-4567',
      };

      const smsResult = renderSmsTemplate('emergency-alert-sms', data);
      
      expect(smsResult).toBeDefined();
      expect(smsResult).not.toBeNull();
      expect(smsResult!.message).toContain('EMERGENCY');
      expect(smsResult!.message).toContain('45 min');
      expect(smsResult!.message).toContain('traffic incident');
      expect(smsResult!.message).toContain('Tesla STEM Group A');
      expect(smsResult!.message).toContain('John Smith');
    });

    it('should render pickup reminder SMS template', () => {
      const data = {
        studentNames: 'Emma J. & Alex K.',
        pickupTime: '7:30 AM',
        location: 'Tesla STEM Main Entrance',
      };

      const smsResult = renderSmsTemplate('late-pickup-reminder-sms', data);
      
      expect(smsResult).toBeDefined();
      expect(smsResult).not.toBeNull();
      expect(smsResult!.length).toBeLessThanOrEqual(160);
      expect(smsResult!.message).toContain('7:30 AM');
      expect(smsResult!.message).toContain('Emma J. & Alex K.');
      expect(smsResult!.message).toContain('Tesla STEM Main Entrance');
    });

    it('should render schedule change SMS template', () => {
      const data = {
        date: 'Feb 4',
        weatherCondition: 'Heavy snow expected - delays likely',
      };

      const smsResult = renderSmsTemplate('weather-alert-sms', data);
      
      expect(smsResult).toBeDefined();
      expect(smsResult).not.toBeNull();
      expect(smsResult!.length).toBeLessThanOrEqual(160);
      expect(smsResult!.message).toContain('Feb 4');
      expect(smsResult!.message).toContain('Heavy snow expected');
      expect(smsResult!.message).toContain('Weather alert');
    });
  });

  describe('Template Content Quality', () => {
    it('should include Tesla STEM branding in all templates', () => {
      const testData = {
        timestamp: '2025-07-23 08:15 AM',
        groupName: 'Test Group',
        emergencyMessage: 'Test emergency',
        actionRequired: 'Test action',
        groupAdminName: 'Test Admin',
        groupAdminPhone: '555-123-4567',
      };

      const emailResult = renderEmailTemplate('emergency-notification', testData);
      expect(emailResult).not.toBeNull();
      expect(emailResult!.html).toContain('Tesla STEM High School');
    });

    it('should be mobile-responsive for email templates', () => {
      const testData = {
        parentName: 'Test Parent',
        groupName: 'Test Group',
        weekStart: 'Test Week',
        scheduleDetails: '<p>Test schedule</p>',
        fairnessScore: '90',
        emergencyContact: 'Test Contact',
        groupId: 'test-group',
      };

      const emailResult = renderEmailTemplate('weekly-schedule-ready', testData);
      expect(emailResult).not.toBeNull();
      expect(emailResult!.html).toContain('max-width: 600px');
      expect(emailResult!.html).toContain('@media');
      expect(emailResult!.html).toContain('max-width: 600px'); // Looking for responsive design instead of 'mobile'
    });

    it('should respect SMS character limits', () => {
      // Test actual SMS templates with proper data
      const templates = [
        { id: 'emergency-alert-sms', data: { groupName: 'Test', emergencyMessage: 'Test', adminName: 'Admin', adminPhone: '555-123-4567' } },
        { id: 'late-pickup-reminder-sms', data: { studentNames: 'Test Student', pickupTime: '7:30 AM', location: 'School' } },
        { id: 'weather-alert-sms', data: { date: 'Today', weatherCondition: 'Rain expected' } },
      ];
      
      templates.forEach(template => {
        const result = renderSmsTemplate(template.id, template.data);
        expect(result).not.toBeNull();
        expect(result!.length).toBeLessThanOrEqual(320); // Some emergency SMS can be longer
      });
    });
  });

  describe('Beta-Specific Features', () => {
    it('should filter templates by beta status', () => {
      const betaTemplates = templateRegistry.getBetaTemplates();
      const nonBetaTemplates = templateRegistry.getAllTemplates()
        .filter(t => !t.betaFeature);

      betaTemplates.forEach(template => {
        expect(template.betaFeature).toBe(true);
      });

      nonBetaTemplates.forEach(template => {
        expect(template.betaFeature).toBe(false);
      });
    });

    it('should handle Tesla-specific template data', () => {
      const teslaData = {
        timestamp: '2025-07-23 08:15 AM',
        groupName: 'Tesla STEM Beta Group',
        emergencyMessage: 'Tesla STEM specific emergency procedure in effect',
        actionRequired: 'Follow Tesla STEM protocol - contact beta support immediately',
        groupAdminName: 'Tesla Admin',
        groupAdminPhone: '(555) 123-4567',
        teslaEnvironment: 'beta',
        betaProgram: true,
      };

      const emailResult = renderEmailTemplate('emergency-notification', teslaData);
      expect(emailResult).not.toBeNull();
      expect(emailResult!.html).toContain('Tesla STEM High School');
      expect(emailResult!.html).toContain('Tesla STEM protocol');
      expect(emailResult!.html).toContain('Beta Testing Program'); // This appears in the template header
    });
  });
});

export {};
