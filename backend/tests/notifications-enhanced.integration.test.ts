/**
 * Integration Tests for Enhanced Notification System
 * Tests the enhanced notifications with Tesla STEM beta templates
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { NotificationTemplateRegistryService } from '../src/services/notification-template-registry.service';
import { renderEmailTemplate } from '../src/templates/email/beta-enhanced-templates';
import { renderSmsTemplate } from '../src/templates/sms/beta-enhanced-sms-templates';

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
    it('should render emergency alert email template', () => {
      const data = {
        parentName: 'John Smith',
        emergencyType: 'weather',
        details: 'Severe snowstorm affecting pickup routes',
        actionRequired: 'Please monitor your phone for updates',
        contactInfo: 'Emergency line: (555) 123-4567',
        location: 'Tesla STEM High School',
        timeEstimate: '30 minutes delay expected',
      };

      const emailContent = renderEmailTemplate('emergency-alert', data);
      
      expect(emailContent).toBeDefined();
      expect(emailContent).toContain('John Smith');
      expect(emailContent).toContain('Severe snowstorm');
      expect(emailContent).toContain('Tesla STEM High School');
      expect(emailContent).toContain('(555) 123-4567');
      expect(emailContent).toContain('30 minutes delay expected');
    });

    it('should render weekly schedule email template', () => {
      const data = {
        parentName: 'Sarah Johnson',
        weekStart: '2025-02-03',
        scheduleData: [
          { day: 'Monday', pickup: '7:30 AM', driver: 'Mike Wilson', students: ['Emma J.', 'Alex K.'] },
          { day: 'Wednesday', pickup: '7:30 AM', driver: 'Sarah Johnson', students: ['Emma J.', 'Alex K.', 'Sam L.'] },
          { day: 'Friday', pickup: '7:30 AM', driver: 'Lisa Chen', students: ['Emma J.', 'Alex K.'] },
        ],
        notes: 'Please ensure students are ready 5 minutes early',
        weather: 'Clear weather expected all week',
      };

      const emailContent = renderEmailTemplate('weekly-schedule', data);
      
      expect(emailContent).toBeDefined();
      expect(emailContent).toContain('Sarah Johnson');
      expect(emailContent).toContain('February 3, 2025');
      expect(emailContent).toContain('Mike Wilson');
      expect(emailContent).toContain('Emma J.');
      expect(emailContent).toContain('7:30 AM');
      expect(emailContent).toContain('Clear weather expected');
    });

    it('should render beta welcome email template', () => {
      const data = {
        parentName: 'Michael Chen',
        studentName: 'David Chen',
        betaFeatures: [
          'Enhanced real-time notifications',
          'Smart scheduling optimization',
          'Improved group management',
          'Mobile-responsive interface',
        ],
        supportContact: 'beta-support@teslastemcarpool.com',
        feedbackLink: 'https://forms.teslastemcarpool.com/beta-feedback',
      };

      const emailContent = renderEmailTemplate('beta-welcome', data);
      
      expect(emailContent).toBeDefined();
      expect(emailContent).toContain('Michael Chen');
      expect(emailContent).toContain('David Chen');
      expect(emailContent).toContain('Tesla STEM High School');
      expect(emailContent).toContain('beta-support@teslastemcarpool.com');
      expect(emailContent).toContain('Enhanced real-time notifications');
      expect(emailContent).toContain('forms.teslastemcarpool.com');
    });
  });

  describe('SMS Template Rendering', () => {
    it('should render emergency alert SMS template', () => {
      const data = {
        emergencyType: 'accident',
        actionRequired: 'Pickup delayed 45 min due to traffic incident',
        location: 'Main St & 5th Ave',
      };

      const smsContent = renderSmsTemplate('emergency-alert-sms', data);
      
      expect(smsContent).toBeDefined();
      expect(smsContent.length).toBeLessThanOrEqual(160);
      expect(smsContent).toContain('EMERGENCY');
      expect(smsContent).toContain('45 min');
      expect(smsContent).toContain('traffic incident');
    });

    it('should render pickup reminder SMS template', () => {
      const data = {
        time: '7:30 AM',
        date: '2025-02-05',
        students: ['Emma J.', 'Alex K.'],
        weather: 'Rain expected - bring umbrellas',
      };

      const smsContent = renderSmsTemplate('pickup-reminder-sms', data);
      
      expect(smsContent).toBeDefined();
      expect(smsContent.length).toBeLessThanOrEqual(160);
      expect(smsContent).toContain('7:30 AM');
      expect(smsContent).toContain('Emma J.');
      expect(smsContent).toContain('Alex K.');
      expect(smsContent).toContain('umbrellas');
    });

    it('should render schedule change SMS template', () => {
      const data = {
        changeType: 'time_change',
        newTime: '8:00 AM',
        date: '2025-02-04',
        reason: 'Weather delay',
      };

      const smsContent = renderSmsTemplate('schedule-change-sms', data);
      
      expect(smsContent).toBeDefined();
      expect(smsContent.length).toBeLessThanOrEqual(160);
      expect(smsContent).toContain('8:00 AM');
      expect(smsContent).toContain('Feb 4');
      expect(smsContent).toContain('Weather delay');
    });
  });

  describe('Template Content Quality', () => {
    it('should include Tesla STEM branding in all templates', () => {
      const testData = {
        parentName: 'Test Parent',
        emergencyType: 'weather',
        details: 'Test emergency',
        actionRequired: 'Test action',
        contactInfo: 'Test contact',
      };

      const emailContent = renderEmailTemplate('emergency-alert', testData);
      expect(emailContent).toContain('Tesla STEM High School');
    });

    it('should be mobile-responsive for email templates', () => {
      const testData = {
        parentName: 'Test Parent',
        weekStart: '2025-02-03',
        scheduleData: [{ day: 'Monday', pickup: '7:30 AM', driver: 'Test Driver', students: ['Test Student'] }],
      };

      const emailContent = renderEmailTemplate('weekly-schedule', testData);
      expect(emailContent).toContain('max-width: 600px');
      expect(emailContent).toContain('@media');
      expect(emailContent).toContain('mobile');
    });

    it('should respect SMS character limits', () => {
      const templateIds = ['emergency-alert-sms', 'pickup-reminder-sms', 'schedule-change-sms'];
      
      templateIds.forEach(templateId => {
        const estimated = templateRegistry.getEstimatedLength(templateId, 'sms');
        expect(estimated).toBeLessThanOrEqual(160);
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
        parentName: 'Tesla Parent',
        emergencyType: 'school',
        details: 'Tesla STEM specific emergency procedure',
        actionRequired: 'Follow Tesla STEM protocol',
        contactInfo: 'Tesla STEM office: (555) 123-4567',
        teslaEnvironment: 'beta',
        betaProgram: true,
        schoolName: 'Tesla STEM High School',
      };

      const emailContent = renderEmailTemplate('emergency-alert', teslaData);
      expect(emailContent).toContain('Tesla STEM High School');
      expect(emailContent).toContain('Tesla STEM protocol');
      expect(emailContent).toContain('beta program');
    });
  });
});

export {};
