/**
 * Enhanced SMS Templates for Beta Testing
 * 
 * Concise, actionable SMS templates optimized for mobile delivery
 * and Tesla STEM High School carpool beta testing
 */

export interface SmsTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
  category: 'registration' | 'scheduling' | 'emergency' | 'group' | 'admin';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  maxLength: number;
}

/**
 * Enhanced SMS Templates for Beta Testing
 */
export const betaSmsTemplates: SmsTemplate[] = [
  {
    id: 'welcome-registration-sms',
    name: 'Welcome Registration SMS',
    message: '🎉 Welcome to Tesla STEM Carpool Beta, {{firstName}}! Registration complete. Next: Join a group at carpool.vedprakash.net/groups/discover',
    variables: ['firstName'],
    category: 'registration',
    priority: 'normal',
    maxLength: 160
  },

  {
    id: 'weekly-schedule-ready-sms',
    name: 'Weekly Schedule Ready SMS',
    message: '📅 {{groupName}} carpool schedule ready! Week {{weekStart}}: {{yourDays}}. View full schedule: carpool.vedprakash.net/schedule/{{groupId}}',
    variables: ['groupName', 'weekStart', 'yourDays', 'groupId'],
    category: 'scheduling',
    priority: 'high',
    maxLength: 160
  },

  {
    id: 'emergency-alert-sms',
    name: 'Emergency Alert SMS',
    message: '🚨 EMERGENCY - {{groupName}}: {{emergencyMessage}} Contact Group Admin {{adminName}} at {{adminPhone}} immediately. If medical emergency, call 911 first.',
    variables: ['groupName', 'emergencyMessage', 'adminName', 'adminPhone'],
    category: 'emergency',
    priority: 'urgent',
    maxLength: 320
  },

  {
    id: 'swap-request-sms',
    name: 'Swap Request SMS',
    message: '🔄 Carpool swap request from {{requesterName}}: {{swapDetails}}. Quick response needed: carpool.vedprakash.net/swaps/{{swapId}}',
    variables: ['requesterName', 'swapDetails', 'swapId'],
    category: 'scheduling',
    priority: 'high',
    maxLength: 160
  },

  {
    id: 'swap-approved-sms',
    name: 'Swap Approved SMS',
    message: '✅ Swap approved! {{requesterName}} will drive {{newDay}} instead of {{originalDay}}. Thanks for the flexibility!',
    variables: ['requesterName', 'newDay', 'originalDay'],
    category: 'scheduling',
    priority: 'normal',
    maxLength: 160
  },

  {
    id: 'late-pickup-reminder-sms',
    name: 'Late Pickup Reminder SMS',
    message: '⏰ Reminder: You\'re driving {{studentNames}} today at {{pickupTime}}. Tesla STEM pickup location: {{location}}',
    variables: ['studentNames', 'pickupTime', 'location'],
    category: 'scheduling',
    priority: 'high',
    maxLength: 160
  },

  {
    id: 'preference-reminder-sms',
    name: 'Preference Submission Reminder SMS',
    message: '📝 Tesla STEM Carpool: Submit your weekly driving preferences by Sat 10PM. Group {{groupName}}: carpool.vedprakash.net/preferences',
    variables: ['groupName'],
    category: 'scheduling',
    priority: 'normal',
    maxLength: 160
  },

  {
    id: 'group-join-approval-sms',
    name: 'Group Join Approval SMS',
    message: '🎉 Welcome to {{groupName}}! Group Admin {{adminName}} approved your request. First preference deadline: Saturday 10PM.',
    variables: ['groupName', 'adminName'],
    category: 'group',
    priority: 'normal',
    maxLength: 160
  },

  {
    id: 'driver-no-show-alert-sms',
    name: 'Driver No-Show Alert SMS',
    message: '⚠️ Driver {{driverName}} no-show reported for {{pickupTime}}. Emergency backup: Contact {{backupDriver}} at {{backupPhone}}',
    variables: ['driverName', 'pickupTime', 'backupDriver', 'backupPhone'],
    category: 'emergency',
    priority: 'urgent',
    maxLength: 160
  },

  {
    id: 'fairness-alert-sms',
    name: 'Fairness Alert SMS',
    message: '⚖️ {{groupName}} fairness update: You\'ve driven {{yourTrips}} trips vs group avg {{avgTrips}}. Balance improving with upcoming assignments.',
    variables: ['groupName', 'yourTrips', 'avgTrips'],
    category: 'admin',
    priority: 'low',
    maxLength: 160
  },

  {
    id: 'schedule-conflict-sms',
    name: 'Schedule Conflict SMS',
    message: '⚠️ Schedule conflict {{conflictDate}}: No available drivers. Group Admin review needed: carpool.vedprakash.net/admin/{{groupId}}',
    variables: ['conflictDate', 'groupId'],
    category: 'admin',
    priority: 'high',
    maxLength: 160
  },

  {
    id: 'weather-alert-sms',
    name: 'Weather Alert SMS',
    message: '🌧️ Weather alert for {{date}}: {{weatherCondition}}. Check with your driver about pickup status. Stay safe!',
    variables: ['date', 'weatherCondition'],
    category: 'emergency',
    priority: 'high',
    maxLength: 160
  },

  {
    id: 'beta-feedback-request-sms',
    name: 'Beta Feedback Request SMS',
    message: '💭 Tesla STEM Carpool Beta: Your feedback matters! Quick 2-min survey: carpool.vedprakash.net/feedback/{{surveyId}}',
    variables: ['surveyId'],
    category: 'admin',
    priority: 'low',
    maxLength: 160
  },

  {
    id: 'pickup-location-change-sms',
    name: 'Pickup Location Change SMS',
    message: '📍 Pickup location changed for {{date}}: {{newLocation}} instead of {{oldLocation}}. Time remains {{pickupTime}}.',
    variables: ['date', 'newLocation', 'oldLocation', 'pickupTime'],
    category: 'scheduling',
    priority: 'high',
    maxLength: 160
  },

  {
    id: 'new-family-intro-sms',
    name: 'New Family Introduction SMS',
    message: '👋 {{groupName}}: Welcome new family {{familyName}}! {{studentNames}} will join our carpool. Please introduce yourselves.',
    variables: ['groupName', 'familyName', 'studentNames'],
    category: 'group',
    priority: 'normal',
    maxLength: 160
  }
];

/**
 * SMS Template rendering utility
 */
export function renderSmsTemplate(templateId: string, variables: Record<string, any>): { message: string; length: number } | null {
  const template = betaSmsTemplates.find(t => t.id === templateId);
  if (!template) {
    return null;
  }

  let renderedMessage = template.message;

  // Replace variables in template
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    renderedMessage = renderedMessage.replace(placeholder, String(value));
  }

  return {
    message: renderedMessage,
    length: renderedMessage.length
  };
}

/**
 * Get SMS templates by category
 */
export function getSmsTemplatesByCategory(category: string): SmsTemplate[] {
  return betaSmsTemplates.filter(template => template.category === category);
}

/**
 * Get SMS templates by priority
 */
export function getSmsTemplatesByPriority(priority: string): SmsTemplate[] {
  return betaSmsTemplates.filter(template => template.priority === priority);
}

/**
 * Validate SMS template
 */
export function validateSmsTemplate(templateId: string, variables: Record<string, any>): { 
  valid: boolean; 
  missingVariables: string[]; 
  exceedsLength: boolean; 
  estimatedLength: number 
} {
  const template = betaSmsTemplates.find(t => t.id === templateId);
  if (!template) {
    return { valid: false, missingVariables: [], exceedsLength: false, estimatedLength: 0 };
  }

  const missingVariables = template.variables.filter(variable => !(variable in variables));
  
  // Estimate rendered length
  let estimatedMessage = template.message;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    estimatedMessage = estimatedMessage.replace(placeholder, String(value));
  }
  
  const estimatedLength = estimatedMessage.length;
  const exceedsLength = estimatedLength > template.maxLength;

  return {
    valid: missingVariables.length === 0 && !exceedsLength,
    missingVariables,
    exceedsLength,
    estimatedLength
  };
}

/**
 * Get emergency SMS templates
 */
export function getEmergencySmsTemplates(): SmsTemplate[] {
  return betaSmsTemplates.filter(template => 
    template.category === 'emergency' || template.priority === 'urgent'
  );
}

/**
 * Split long SMS into multiple parts if needed
 */
export function splitLongSms(message: string, maxLength: number = 160): string[] {
  if (message.length <= maxLength) {
    return [message];
  }

  const parts: string[] = [];
  let remaining = message;
  let partNumber = 1;

  while (remaining.length > 0) {
    const isLastPart = remaining.length <= maxLength;
    let part: string;

    if (isLastPart) {
      part = remaining;
      remaining = '';
    } else {
      // Find the best place to split (prefer space, then punctuation)
      let splitIndex = maxLength - 10; // Leave room for part indicator
      const spaceIndex = remaining.lastIndexOf(' ', splitIndex);
      const punctIndex = remaining.lastIndexOf('.', splitIndex) || remaining.lastIndexOf('!', splitIndex) || remaining.lastIndexOf('?', splitIndex);

      if (spaceIndex > splitIndex - 20) {
        splitIndex = spaceIndex;
      } else if (punctIndex > splitIndex - 20) {
        splitIndex = punctIndex + 1;
      }

      part = remaining.substring(0, splitIndex);
      remaining = remaining.substring(splitIndex).trim();
    }

    // Add part indicator if multiple parts
    if (!isLastPart || partNumber > 1) {
      part += ` (${partNumber}/?)`;
    }

    parts.push(part);
    partNumber++;
  }

  // Update part indicators with total count
  if (parts.length > 1) {
    return parts.map((part, index) => 
      part.replace(/\(\d+\/\?\)/, `(${index + 1}/${parts.length})`)
    );
  }

  return parts;
}
