/**
 * Notification Template Registry Service
 * Central registry for all notification templates used in the Tesla STEM carpool beta
 * Provides template discovery, metadata, and validation for enhanced beta communications
 */

export interface NotificationTemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: 'emergency' | 'schedule' | 'group' | 'system' | 'swap';
  channel: 'email' | 'sms' | 'both';
  priority: 'critical' | 'high' | 'normal' | 'low';
  requiredFields: string[];
  optionalFields: string[];
  teslaSpecific: boolean;
  betaFeature: boolean;
  previewText?: string;
  estimatedLength?: {
    email?: number;
    sms?: number;
  };
}

export class NotificationTemplateRegistryService {
  private static instance: NotificationTemplateRegistryService;
  private templates: Map<string, NotificationTemplateMetadata> = new Map();

  private constructor() {
    this.initializeTemplates();
  }

  public static getInstance(): NotificationTemplateRegistryService {
    if (!NotificationTemplateRegistryService.instance) {
      NotificationTemplateRegistryService.instance = new NotificationTemplateRegistryService();
    }
    return NotificationTemplateRegistryService.instance;
  }

  private initializeTemplates(): void {
    // Email Templates
    this.registerTemplate({
      id: 'emergency-alert',
      name: 'Emergency Alert',
      description: 'Critical emergency notifications for immediate parent attention',
      category: 'emergency',
      channel: 'both',
      priority: 'critical',
      requiredFields: ['emergencyType', 'details', 'actionRequired', 'contactInfo'],
      optionalFields: ['location', 'timeEstimate'],
      teslaSpecific: true,
      betaFeature: true,
      previewText: 'EMERGENCY: Immediate attention required for carpool',
      estimatedLength: { email: 800, sms: 160 },
    });

    this.registerTemplate({
      id: 'weekly-schedule',
      name: 'Weekly Schedule',
      description: 'Weekly carpool schedule with pickup times and group details',
      category: 'schedule',
      channel: 'email',
      priority: 'high',
      requiredFields: ['parentName', 'weekStart', 'scheduleData'],
      optionalFields: ['notes', 'weather'],
      teslaSpecific: true,
      betaFeature: true,
      previewText: 'Your Tesla STEM carpool schedule for the week',
      estimatedLength: { email: 1200 },
    });

    this.registerTemplate({
      id: 'swap-request',
      name: 'Swap Request',
      description: 'Carpool assignment swap request notifications',
      category: 'swap',
      channel: 'both',
      priority: 'normal',
      requiredFields: ['requesterName', 'originalDate', 'requestedDate', 'reason'],
      optionalFields: ['urgencyLevel', 'additionalNotes'],
      teslaSpecific: true,
      betaFeature: true,
      previewText: 'Carpool swap request needs your response',
      estimatedLength: { email: 600, sms: 140 },
    });

    this.registerTemplate({
      id: 'group-update',
      name: 'Group Update',
      description: 'Updates about carpool group changes, new members, or important announcements',
      category: 'group',
      channel: 'email',
      priority: 'normal',
      requiredFields: ['groupName', 'updateType', 'details'],
      optionalFields: ['effectiveDate', 'actionRequired'],
      teslaSpecific: true,
      betaFeature: true,
      previewText: 'Important update about your carpool group',
      estimatedLength: { email: 700 },
    });

    this.registerTemplate({
      id: 'beta-welcome',
      name: 'Beta Welcome',
      description: 'Welcome message for Tesla STEM beta testing families',
      category: 'system',
      channel: 'email',
      priority: 'high',
      requiredFields: ['parentName', 'studentName', 'betaFeatures'],
      optionalFields: ['supportContact', 'feedbackLink'],
      teslaSpecific: true,
      betaFeature: true,
      previewText: 'Welcome to the Tesla STEM carpool beta program!',
      estimatedLength: { email: 1000 },
    });

    // SMS Templates
    this.registerTemplate({
      id: 'emergency-alert-sms',
      name: 'Emergency Alert SMS',
      description: 'Critical emergency SMS notifications',
      category: 'emergency',
      channel: 'sms',
      priority: 'critical',
      requiredFields: ['emergencyType', 'actionRequired'],
      optionalFields: ['location'],
      teslaSpecific: true,
      betaFeature: true,
      estimatedLength: { sms: 160 },
    });

    this.registerTemplate({
      id: 'pickup-reminder-sms',
      name: 'Pickup Reminder SMS',
      description: 'Reminder for upcoming pickup duties',
      category: 'schedule',
      channel: 'sms',
      priority: 'high',
      requiredFields: ['time', 'date', 'students'],
      optionalFields: ['weather'],
      teslaSpecific: true,
      betaFeature: true,
      estimatedLength: { sms: 120 },
    });

    this.registerTemplate({
      id: 'schedule-change-sms',
      name: 'Schedule Change SMS',
      description: 'Last-minute schedule change notifications',
      category: 'schedule',
      channel: 'sms',
      priority: 'high',
      requiredFields: ['changeType', 'newTime', 'date'],
      optionalFields: ['reason'],
      teslaSpecific: true,
      betaFeature: true,
      estimatedLength: { sms: 140 },
    });
  }

  private registerTemplate(metadata: NotificationTemplateMetadata): void {
    this.templates.set(metadata.id, metadata);
  }

  public getTemplate(templateId: string): NotificationTemplateMetadata | undefined {
    return this.templates.get(templateId);
  }

  public getAllTemplates(): NotificationTemplateMetadata[] {
    return Array.from(this.templates.values());
  }

  public getTemplatesByCategory(category: string): NotificationTemplateMetadata[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  public getTemplatesByChannel(channel: 'email' | 'sms' | 'both'): NotificationTemplateMetadata[] {
    return this.getAllTemplates().filter(
      template => template.channel === channel || template.channel === 'both'
    );
  }

  public getBetaTemplates(): NotificationTemplateMetadata[] {
    return this.getAllTemplates().filter(template => template.betaFeature);
  }

  public getTeslaSpecificTemplates(): NotificationTemplateMetadata[] {
    return this.getAllTemplates().filter(template => template.teslaSpecific);
  }

  public validateTemplateData(templateId: string, data: Record<string, any>): {
    isValid: boolean;
    missingFields: string[];
    errors: string[];
  } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return {
        isValid: false,
        missingFields: [],
        errors: [`Template ${templateId} not found`],
      };
    }

    const missingFields: string[] = [];
    const errors: string[] = [];

    // Check required fields
    for (const field of template.requiredFields) {
      if (!data[field] || data[field] === '') {
        missingFields.push(field);
      }
    }

    // Additional validation for specific templates
    if (templateId === 'emergency-alert' || templateId === 'emergency-alert-sms') {
      if (data.emergencyType && !['accident', 'weather', 'school', 'traffic', 'medical', 'other'].includes(data.emergencyType)) {
        errors.push('Invalid emergency type');
      }
    }

    if (templateId === 'weekly-schedule') {
      if (data.weekStart && !this.isValidDate(data.weekStart)) {
        errors.push('Invalid week start date');
      }
    }

    return {
      isValid: missingFields.length === 0 && errors.length === 0,
      missingFields,
      errors,
    };
  }

  public getEstimatedLength(templateId: string, channel: 'email' | 'sms'): number | undefined {
    const template = this.getTemplate(templateId);
    return template?.estimatedLength?.[channel];
  }

  public searchTemplates(query: string): NotificationTemplateMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTemplates().filter(
      template =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.category.toLowerCase().includes(lowerQuery)
    );
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  public getTemplateStats(): {
    total: number;
    byCategory: Record<string, number>;
    byChannel: Record<string, number>;
    betaCount: number;
    teslaCount: number;
  } {
    const templates = this.getAllTemplates();
    const byCategory: Record<string, number> = {};
    const byChannel: Record<string, number> = {};

    templates.forEach(template => {
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
      byChannel[template.channel] = (byChannel[template.channel] || 0) + 1;
    });

    return {
      total: templates.length,
      byCategory,
      byChannel,
      betaCount: templates.filter(t => t.betaFeature).length,
      teslaCount: templates.filter(t => t.teslaSpecific).length,
    };
  }
}

export default NotificationTemplateRegistryService;
