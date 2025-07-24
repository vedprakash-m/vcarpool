/**
 * Enhanced Email Templates for Beta Testing
 * 
 * Mobile-responsive, professionally designed email templates
 * for Tesla STEM High School carpool beta testing
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
  category: 'registration' | 'scheduling' | 'emergency' | 'group' | 'admin';
}

/**
 * Base template with Tesla STEM branding and mobile-responsive design
 */
const baseEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        /* Reset and base styles */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f7f9fc;
        }
        
        /* Container */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header .subtitle {
            font-size: 16px;
            opacity: 0.9;
        }
        
        /* Tesla STEM Badge */
        .tesla-badge {
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 6px 16px;
            font-size: 14px;
            font-weight: 500;
            margin: 12px auto 0;
            display: inline-block;
        }
        
        /* Content */
        .content {
            padding: 32px 24px;
        }
        
        .content h2 {
            color: #2d3748;
            font-size: 20px;
            margin-bottom: 16px;
            font-weight: 600;
        }
        
        .content p {
            margin-bottom: 16px;
            color: #4a5568;
            font-size: 16px;
        }
        
        /* Call-to-action button */
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 16px 0;
            transition: transform 0.2s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
        }
        
        /* Info boxes */
        .info-box {
            background-color: #edf2f7;
            border-left: 4px solid #667eea;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .info-box.emergency {
            background-color: #fed7d7;
            border-left-color: #e53e3e;
        }
        
        .info-box.success {
            background-color: #c6f6d5;
            border-left-color: #38a169;
        }
        
        /* Footer */
        .footer {
            background-color: #f1f5f9;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        /* Mobile responsive */
        @media screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            
            .content {
                padding: 24px 16px;
            }
            
            .header {
                padding: 20px 16px;
            }
            
            .header h1 {
                font-size: 22px;
            }
            
            .cta-button {
                display: block;
                text-align: center;
                margin: 20px 0;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🚗 Tesla STEM Carpool</h1>
            <div class="subtitle">Safe, Fair & Coordinated Transportation</div>
            <div class="tesla-badge">Beta Testing Program</div>
        </div>
        
        <div class="content">
            {{content}}
        </div>
        
        <div class="footer">
            <p><strong>Tesla STEM High School Carpool Beta</strong></p>
            <p>Questions? Contact your Group Admin or visit our <a href="https://carpool.vedprakash.net/help" style="color: #667eea;">Help Center</a></p>
            <p style="font-size: 12px; margin-top: 16px;">
                This is an automated message from the Tesla STEM Carpool coordination system.
            </p>
        </div>
    </div>
</body>
</html>
`;

/**
 * Enhanced Email Templates for Beta Testing
 */
export const betaEmailTemplates: EmailTemplate[] = [
  {
    id: 'welcome-registration',
    name: 'Welcome & Registration Complete',
    subject: '🎉 Welcome to Tesla STEM Carpool Beta!',
    html: baseEmailTemplate.replace('{{content}}', `
      <h2>Welcome to the Future of School Transportation! 🚗</h2>
      <p>Hi {{firstName}},</p>
      <p>Congratulations! You've successfully joined the <strong>Tesla STEM High School Carpool Beta Program</strong>. You're now part of an exclusive group helping to revolutionize how families coordinate safe, reliable transportation.</p>
      
      <div class="info-box success">
        <p><strong>✅ Your Registration is Complete</strong></p>
        <p>Address: {{homeAddress}}<br/>
        Students: {{studentCount}} student(s)<br/>
        Service Area: Within 25 miles of Tesla STEM High School</p>
      </div>
      
      <h2>Next Steps:</h2>
      <p>1. <strong>Join a Carpool Group:</strong> Browse and join groups in your area</p>
      <p>2. <strong>Submit Weekly Preferences:</strong> Let us know your driving availability</p>
      <p>3. <strong>Experience Fair Scheduling:</strong> Our algorithm ensures equitable driving distribution</p>
      
      <a href="https://carpool.vedprakash.net/groups/discover" class="cta-button">
        Find Carpool Groups
      </a>
      
      <div class="info-box">
        <p><strong>🎯 Beta Testing Goals</strong></p>
        <p>As a beta tester, you're helping us validate our core features and prepare for the full Tesla STEM launch in September 2025. Your feedback is invaluable!</p>
      </div>
      
      <p>Ready to make school transportation easier for everyone? Let's get started!</p>
      <p>Best regards,<br/>The Tesla STEM Carpool Team</p>
    `),
    text: `Welcome to Tesla STEM Carpool Beta!

Hi {{firstName}},

Congratulations! You've successfully joined the Tesla STEM High School Carpool Beta Program.

Your Registration Details:
- Address: {{homeAddress}}
- Students: {{studentCount}} student(s)
- Service Area: Within 25 miles of Tesla STEM High School

Next Steps:
1. Join a Carpool Group: Browse and join groups in your area
2. Submit Weekly Preferences: Let us know your driving availability  
3. Experience Fair Scheduling: Our algorithm ensures equitable driving distribution

Visit: https://carpool.vedprakash.net/groups/discover

As a beta tester, you're helping us validate our core features and prepare for the full Tesla STEM launch in September 2025.

Best regards,
The Tesla STEM Carpool Team`,
    variables: ['firstName', 'homeAddress', 'studentCount'],
    category: 'registration'
  },

  {
    id: 'weekly-schedule-ready',
    name: 'Weekly Schedule Generated',
    subject: '📅 Your Tesla STEM Carpool Schedule is Ready',
    html: baseEmailTemplate.replace('{{content}}', `
      <h2>Your Weekly Carpool Schedule 📅</h2>
      <p>Hi {{parentName}},</p>
      <p>Your Group Admin has generated this week's carpool schedule for <strong>{{groupName}}</strong>. Here are your assignments:</p>
      
      <div class="info-box">
        <p><strong>📋 Week of {{weekStart}}</strong></p>
        {{scheduleDetails}}
      </div>
      
      <div class="info-box success">
        <p><strong>✅ Fairness Score: {{fairnessScore}}/100</strong></p>
        <p>Your driving load is perfectly balanced with other families in your group.</p>
      </div>
      
      <h2>Important Reminders:</h2>
      <p>• <strong>Pickup Times:</strong> Please arrive 5 minutes early</p>
      <p>• <strong>Emergency Contact:</strong> {{emergencyContact}}</p>
      <p>• <strong>Changes:</strong> Contact your Group Admin for any schedule modifications</p>
      
      <a href="https://carpool.vedprakash.net/schedule/{{groupId}}" class="cta-button">
        View Full Schedule
      </a>
      
      <p>Need to request a swap or have questions? Contact your Group Admin or use our in-app messaging.</p>
      <p>Safe travels!</p>
      <p>The Tesla STEM Carpool Team</p>
    `),
    text: `Your Tesla STEM Carpool Schedule is Ready

Hi {{parentName}},

Your Group Admin has generated this week's carpool schedule for {{groupName}}.

Week of {{weekStart}}:
{{scheduleDetails}}

Fairness Score: {{fairnessScore}}/100
Your driving load is balanced with other families.

Important Reminders:
• Pickup Times: Please arrive 5 minutes early
• Emergency Contact: {{emergencyContact}}
• Changes: Contact your Group Admin for modifications

View Full Schedule: https://carpool.vedprakash.net/schedule/{{groupId}}

Safe travels!
The Tesla STEM Carpool Team`,
    variables: ['parentName', 'groupName', 'weekStart', 'scheduleDetails', 'fairnessScore', 'emergencyContact', 'groupId'],
    category: 'scheduling'
  },

  {
    id: 'emergency-notification',
    name: 'Emergency Notification',
    subject: '🚨 URGENT: Tesla STEM Carpool Emergency Alert',
    html: baseEmailTemplate.replace('{{content}}', `
      <div class="info-box emergency">
        <h2>🚨 EMERGENCY ALERT</h2>
        <p><strong>Time:</strong> {{timestamp}}</p>
        <p><strong>Group:</strong> {{groupName}}</p>
      </div>
      
      <h2>Emergency Details:</h2>
      <p>{{emergencyMessage}}</p>
      
      <div class="info-box">
        <p><strong>📞 Immediate Actions Required:</strong></p>
        <p>{{actionRequired}}</p>
      </div>
      
      <h2>Emergency Contacts:</h2>
      <p>• <strong>Group Admin:</strong> {{groupAdminName}} - {{groupAdminPhone}}</p>
      <p>• <strong>Tesla STEM Office:</strong> (425) 936-2410</p>
      <p>• <strong>Emergency Services:</strong> 911</p>
      
      <a href="tel:{{groupAdminPhone}}" class="cta-button" style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);">
        Call Group Admin Now
      </a>
      
      <div class="info-box emergency">
        <p><strong>⚠️ Safety First</strong></p>
        <p>If this is a medical emergency or immediate safety concern, please call 911 before contacting the group admin.</p>
      </div>
      
      <p>This emergency alert was sent to all members of {{groupName}}.</p>
      <p>Tesla STEM Carpool Safety Team</p>
    `),
    text: `🚨 URGENT: Tesla STEM Carpool Emergency Alert

Time: {{timestamp}}
Group: {{groupName}}

Emergency Details:
{{emergencyMessage}}

Immediate Actions Required:
{{actionRequired}}

Emergency Contacts:
• Group Admin: {{groupAdminName}} - {{groupAdminPhone}}
• Tesla STEM Office: (425) 936-2410  
• Emergency Services: 911

⚠️ Safety First: If this is a medical emergency or immediate safety concern, please call 911 before contacting the group admin.

This emergency alert was sent to all members of {{groupName}}.

Tesla STEM Carpool Safety Team`,
    variables: ['timestamp', 'groupName', 'emergencyMessage', 'actionRequired', 'groupAdminName', 'groupAdminPhone'],
    category: 'emergency'
  },

  {
    id: 'swap-request',
    name: 'Driving Swap Request',
    subject: '🔄 Tesla STEM Carpool Swap Request',
    html: baseEmailTemplate.replace('{{content}}', `
      <h2>Carpool Driving Swap Request 🔄</h2>
      <p>Hi {{recipientName}},</p>
      <p><strong>{{requesterName}}</strong> has requested to swap driving days with you in <strong>{{groupName}}</strong>.</p>
      
      <div class="info-box">
        <p><strong>📋 Swap Details:</strong></p>
        <p><strong>{{requesterName}} wants to swap:</strong><br/>
        {{requesterOriginalDay}} → {{requesterSwapDay}}</p>
        <p><strong>You would swap:</strong><br/>
        {{recipientOriginalDay}} → {{recipientSwapDay}}</p>
      </div>
      
      <div class="info-box">
        <p><strong>💬 Reason:</strong> {{swapReason}}</p>
      </div>
      
      <h2>Quick Response:</h2>
      <p>Please respond to this swap request as soon as possible. Swaps help maintain fairness and flexibility for all families.</p>
      
      <a href="https://carpool.vedprakash.net/swaps/approve/{{swapId}}" class="cta-button" style="background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);">
        ✅ Approve Swap
      </a>
      
      <a href="https://carpool.vedprakash.net/swaps/decline/{{swapId}}" class="cta-button" style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); margin-left: 12px;">
        ❌ Decline Swap
      </a>
      
      <p><strong>Questions?</strong> Contact your Group Admin or {{requesterName}} directly.</p>
      <p>Thank you for keeping our carpool coordination smooth!</p>
      <p>The Tesla STEM Carpool Team</p>
    `),
    text: `Tesla STEM Carpool Swap Request

Hi {{recipientName}},

{{requesterName}} has requested to swap driving days with you in {{groupName}}.

Swap Details:
{{requesterName}} wants to swap: {{requesterOriginalDay}} → {{requesterSwapDay}}
You would swap: {{recipientOriginalDay}} → {{recipientSwapDay}}

Reason: {{swapReason}}

Please respond as soon as possible:
• Approve: https://carpool.vedprakash.net/swaps/approve/{{swapId}}
• Decline: https://carpool.vedprakash.net/swaps/decline/{{swapId}}

Questions? Contact your Group Admin or {{requesterName}} directly.

The Tesla STEM Carpool Team`,
    variables: ['recipientName', 'requesterName', 'groupName', 'requesterOriginalDay', 'requesterSwapDay', 'recipientOriginalDay', 'recipientSwapDay', 'swapReason', 'swapId'],
    category: 'scheduling'
  },

  {
    id: 'group-admin-weekly-summary',
    name: 'Group Admin Weekly Summary',
    subject: '📊 Tesla STEM Carpool - Weekly Group Summary',
    html: baseEmailTemplate.replace('{{content}}', `
      <h2>Weekly Group Summary 📊</h2>
      <p>Hi {{adminName}},</p>
      <p>Here's your weekly performance summary for <strong>{{groupName}}</strong>:</p>
      
      <div class="info-box success">
        <p><strong>✅ Week of {{weekStart}} - Success Metrics</strong></p>
        <p>• <strong>Preference Submission Rate:</strong> {{submissionRate}}% ({{submittedCount}}/{{totalFamilies}} families)</p>
        <p>• <strong>Schedule Reliability:</strong> {{reliabilityScore}}%</p>
        <p>• <strong>Fairness Distribution:</strong> {{fairnessScore}}/100</p>
      </div>
      
      <h2>Group Activity:</h2>
      <p>• <strong>Swap Requests:</strong> {{swapRequests}} requests ({{approvedSwaps}} approved)</p>
      <p>• <strong>Emergency Notifications:</strong> {{emergencyCount}}</p>
      <p>• <strong>New Families Joined:</strong> {{newFamilies}}</p>
      
      {{#if (gt lateSubmissions 0)}}
      <div class="info-box">
        <p><strong>⚠️ Late Preference Submissions</strong></p>
        <p>{{lateSubmissions}} families submitted preferences after the Saturday 10PM deadline. Consider sending friendly reminders.</p>
      </div>
      {{/if}}
      
      <h2>Action Items:</h2>
      {{#if (gt pendingSwaps 0)}}
      <p>• <strong>{{pendingSwaps}} swap requests</strong> need your attention</p>
      {{/if}}
      {{#if (gt inactiveFamilies 0)}}
      <p>• <strong>{{inactiveFamilies}} families</strong> haven't participated in 2+ weeks</p>
      {{/if}}
      
      <a href="https://carpool.vedprakash.net/admin/{{groupId}}" class="cta-button">
        Manage Group
      </a>
      
      <div class="info-box">
        <p><strong>🎯 Beta Testing Feedback</strong></p>
        <p>Your group is performing excellently! Consider sharing feedback about features that work well or areas for improvement.</p>
      </div>
      
      <p>Thank you for being an amazing Group Admin and making Tesla STEM carpool coordination seamless!</p>
      <p>The Tesla STEM Carpool Team</p>
    `),
    text: `Tesla STEM Carpool - Weekly Group Summary

Hi {{adminName}},

Week of {{weekStart}} Summary for {{groupName}}:

Success Metrics:
• Preference Submission Rate: {{submissionRate}}% ({{submittedCount}}/{{totalFamilies}} families)
• Schedule Reliability: {{reliabilityScore}}%
• Fairness Distribution: {{fairnessScore}}/100

Group Activity:
• Swap Requests: {{swapRequests}} requests ({{approvedSwaps}} approved)
• Emergency Notifications: {{emergencyCount}}
• New Families Joined: {{newFamilies}}

{{#if (gt lateSubmissions 0)}}
Late Submissions: {{lateSubmissions}} families submitted after Saturday 10PM deadline.
{{/if}}

Action Items:
{{#if (gt pendingSwaps 0)}}• {{pendingSwaps}} swap requests need attention{{/if}}
{{#if (gt inactiveFamilies 0)}}• {{inactiveFamilies}} families haven't participated in 2+ weeks{{/if}}

Manage Group: https://carpool.vedprakash.net/admin/{{groupId}}

Thank you for being an amazing Group Admin!

The Tesla STEM Carpool Team`,
    variables: ['adminName', 'groupName', 'weekStart', 'submissionRate', 'submittedCount', 'totalFamilies', 'reliabilityScore', 'fairnessScore', 'swapRequests', 'approvedSwaps', 'emergencyCount', 'newFamilies', 'lateSubmissions', 'pendingSwaps', 'inactiveFamilies', 'groupId'],
    category: 'admin'
  }
];

/**
 * Template rendering utility
 */
export function renderEmailTemplate(templateId: string, variables: Record<string, any>): { subject: string; html: string; text: string } | null {
  const template = betaEmailTemplates.find(t => t.id === templateId);
  if (!template) {
    return null;
  }

  let renderedSubject = template.subject;
  let renderedHtml = template.html;
  let renderedText = template.text;

  // Replace variables in all template parts
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    renderedSubject = renderedSubject.replace(placeholder, String(value));
    renderedHtml = renderedHtml.replace(placeholder, String(value));
    renderedText = renderedText.replace(placeholder, String(value));
  }

  return {
    subject: renderedSubject,
    html: renderedHtml,
    text: renderedText
  };
}

/**
 * Get all templates by category
 */
export function getTemplatesByCategory(category: string): EmailTemplate[] {
  return betaEmailTemplates.filter(template => template.category === category);
}

/**
 * Get template validation
 */
export function validateTemplate(templateId: string, variables: Record<string, any>): { valid: boolean; missingVariables: string[] } {
  const template = betaEmailTemplates.find(t => t.id === templateId);
  if (!template) {
    return { valid: false, missingVariables: [] };
  }

  const missingVariables = template.variables.filter(variable => !(variable in variables));
  
  return {
    valid: missingVariables.length === 0,
    missingVariables
  };
}
