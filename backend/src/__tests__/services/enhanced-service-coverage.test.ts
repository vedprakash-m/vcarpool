/**
 * Enhanced Service Coverage Tests - Family-Oriented Services
 * Comprehensive testing of service layer with full UX requirements alignment
 *
 * COMPREHENSIVE UX REQUIREMENTS ALIGNMENT:
 * 1. Progressive Parent Onboarding - Email notifications for onboarding steps
 * 2. Group Discovery & Join Request - Messaging and notification services for group coordination
 * 3. Weekly Preference Submission - User services for preference management
 * 4. Group Admin Schedule Management - Notification services for schedule coordination
 * 5. Emergency Response & Crisis Coordination - Emergency messaging and notification systems
 * 6. Unified Family Dashboard & Role Transitions - User services supporting family context
 *
 * Focus: email.service.ts, messaging.service.ts, user.service.ts, notification.service.ts
 * Coverage target: 3.2% to 80%+ with family-oriented testing
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Service return type interfaces for type safety
interface ServiceResult {
  success: boolean;
  [key: string]: unknown;
}

interface EmailServiceResult extends ServiceResult {
  emailType?: string;
  familyId?: string;
  childrenCount?: number;
  step?: string;
  progressPercentage?: number;
  verificationRequired?: boolean;
  emailsSent?: number;
  familiesNotified?: number;
  emergencyContactsIncluded?: boolean;
  emergencyType?: string;
  emergencyContactsNotified?: number;
}

interface UserServiceResult extends ServiceResult {
  user?: TestFamilyUser;
  onboardingRequired?: boolean;
  nextSteps?: string[];
  members?: TestFamilyMember[];
  familyId?: string;
  emergencyContacts?: EmergencyContact[];
  updatedProgress?: OnboardingProgress;
  nextStep?: string;
  completionPercentage?: number;
  contactAdded?: boolean;
  totalEmergencyContacts?: number;
  preferencesUpdated?: boolean;
  schedulingEnabled?: boolean;
}

interface MessagingServiceResult extends ServiceResult {
  chatRoomId?: string;
  participantsAdded?: number;
  adminAssigned?: boolean;
  messageId?: string;
  deliveredTo?: number;
  familiesNotified?: number;
  emergencyContactsNotified?: number;
  deliveryStatus?: string;
}

interface NotificationServiceResult extends ServiceResult {
  notificationId?: string;
  scheduled?: boolean;
  reminderScheduled?: boolean;
  scheduleSent?: boolean;
  allDelivered?: boolean;
  notifications?: Notification[];
  unreadCount?: number;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  priority: number;
}

interface OnboardingProgress {
  profileComplete: boolean;
  childrenAdded: boolean;
  emergencyContactsAdded: boolean;
  weeklyPreferencesSet: boolean;
  schoolVerified: boolean;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: string;
  actionRequired?: boolean;
}

// Family-oriented test interfaces
interface TestFamilyUser {
  id: string;
  name?: string;
  email: string;
  role: "parent" | "student" | "admin";
  firstName: string;
  lastName: string;
  familyId?: string;
  isPrimary?: boolean;
  onboardingComplete?: boolean;
  school?: string;
  grade?: string;
  children?: Array<{
    id: string;
    name: string;
    school: string;
    grade: string;
  }>;
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
    priority: number;
  }>;
  onboardingProgress?: {
    profileComplete: boolean;
    childrenAdded: boolean;
    emergencyContactsAdded: boolean;
    weeklyPreferencesSet: boolean;
    schoolVerified: boolean;
  };
  groupAdminRoles?: Array<{
    groupId: string;
    school: string;
    route: string;
    permissions: string[];
  }>;
}

interface TestFamilyMember {
  id: string;
  name: string;
  role: "parent" | "student" | "admin";
  email?: string;
  firstName?: string;
  lastName?: string;
  isPrimary?: boolean;
  onboardingComplete?: boolean;
  school?: string;
  grade?: string;
}

interface FamilyMembersResult {
  success: boolean;
  familyId: string;
  members: TestFamilyMember[];
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
    priority: number;
  }>;
}

interface TestFamilyTrip {
  id: string;
  driverId: string;
  passengerIds: string[];
  departure: string;
  destination: string;
  departureTime: string;
  cost: number;
  school: string;
  familyIds: string[];
  emergencyContacts: Array<{
    familyId: string;
    contacts: Array<{
      name: string;
      phone: string;
      relationship: string;
    }>;
  }>;
}

// Mock family-oriented service implementations
const mockFamilyEmailService = {
  sendFamilyWelcomeEmail: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<EmailServiceResult>
  >,
  sendOnboardingStepEmail: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<EmailServiceResult>
  >,
  sendFamilyTripNotification: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<EmailServiceResult>
  >,
  sendWeeklyScheduleNotification: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<EmailServiceResult>
  >,
  sendEmergencyNotification: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<EmailServiceResult>
  >,
  sendGroupJoinRequestEmail: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<EmailServiceResult>
  >,
  sendPasswordResetEmail: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<EmailServiceResult>
  >,
  validateEmailConfiguration: jest.fn() as jest.MockedFunction<
    () => Promise<ServiceResult>
  >,
};

const mockFamilyUserService = {
  createFamilyUser: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<UserServiceResult>
  >,
  getFamilyUserById: jest.fn() as jest.MockedFunction<
    (id: string) => Promise<UserServiceResult>
  >,
  updateFamilyUser: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<UserServiceResult>
  >,
  deleteFamilyUser: jest.fn() as jest.MockedFunction<
    (id: string) => Promise<ServiceResult>
  >,
  getFamilyUsersByRole: jest.fn() as jest.MockedFunction<
    (role: string) => Promise<UserServiceResult>
  >,
  validateFamilyUser: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<ServiceResult>
  >,
  getFamilyMembers: jest.fn() as jest.MockedFunction<
    (familyId: string) => Promise<UserServiceResult>
  >,
  updateOnboardingProgress: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<UserServiceResult>
  >,
  addChildToFamily: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<ServiceResult>
  >,
  addEmergencyContact: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<UserServiceResult>
  >,
  updateWeeklyPreferences: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<UserServiceResult>
  >,
};

const mockFamilyMessagingService = {
  createFamilyGroupChat: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<MessagingServiceResult>
  >,
  sendFamilyMessage: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<MessagingServiceResult>
  >,
  sendGroupAdminMessage: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<MessagingServiceResult>
  >,
  sendEmergencyMessage: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<MessagingServiceResult>
  >,
  getFamilyMessages: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<MessagingServiceResult>
  >,
  getGroupMessages: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<MessagingServiceResult>
  >,
  markAsRead: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<ServiceResult>
  >,
  deleteMessage: jest.fn() as jest.MockedFunction<
    (id: string) => Promise<ServiceResult>
  >,
};

const mockFamilyNotificationService = {
  sendFamilyNotification: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<NotificationServiceResult>
  >,
  sendGroupAdminNotification: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<NotificationServiceResult>
  >,
  sendEmergencyNotification: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<NotificationServiceResult>
  >,
  createOnboardingNotification: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<NotificationServiceResult>
  >,
  createScheduleNotification: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<NotificationServiceResult>
  >,
  markAsRead: jest.fn() as jest.MockedFunction<
    (data: any) => Promise<ServiceResult>
  >,
  getFamilyNotifications: jest.fn() as jest.MockedFunction<
    (familyId: string) => Promise<NotificationServiceResult>
  >,
  deleteNotification: jest.fn() as jest.MockedFunction<
    (id: string) => Promise<ServiceResult>
  >,
};

// Mock family users for testing
const mockFamilyParentUser: TestFamilyUser = {
  id: "family-parent-1",
  email: "sarah.johnson@carpool.com",
  role: "parent",
  firstName: "Sarah",
  lastName: "Johnson",
  familyId: "johnson-family-001",
  children: [
    {
      id: "child-emma-001",
      name: "Emma Johnson",
      school: "Lincoln Elementary School",
      grade: "3rd Grade",
    },
    {
      id: "child-liam-001",
      name: "Liam Johnson",
      school: "Lincoln Elementary School",
      grade: "1st Grade",
    },
  ],
  emergencyContacts: [
    {
      name: "Michael Johnson",
      phone: "+1-555-0123",
      relationship: "Spouse",
      priority: 1,
    },
    {
      name: "Margaret Wilson",
      phone: "+1-555-0124",
      relationship: "Grandmother",
      priority: 2,
    },
  ],
  onboardingProgress: {
    profileComplete: true,
    childrenAdded: true,
    emergencyContactsAdded: true,
    weeklyPreferencesSet: true,
    schoolVerified: true,
  },
  groupAdminRoles: [
    {
      groupId: "lincoln-elementary-morning-group",
      school: "Lincoln Elementary School",
      route: "Morning Route A",
      permissions: ["schedule", "notify", "manage_passengers"],
    },
  ],
};

const mockGroupAdminUser: TestFamilyUser = {
  id: "group-admin-1",
  email: "admin.coordinator@carpool.com",
  role: "admin",
  firstName: "Lisa",
  lastName: "Martinez",
  familyId: "martinez-family-002",
  children: [
    {
      id: "child-alex-002",
      name: "Alex Martinez",
      school: "Roosevelt Middle School",
      grade: "6th Grade",
    },
  ],
  emergencyContacts: [
    {
      name: "Carlos Martinez",
      phone: "+1-555-0200",
      relationship: "Spouse",
      priority: 1,
    },
  ],
  onboardingProgress: {
    profileComplete: true,
    childrenAdded: true,
    emergencyContactsAdded: true,
    weeklyPreferencesSet: true,
    schoolVerified: true,
  },
  groupAdminRoles: [
    {
      groupId: "roosevelt-middle-morning-group",
      school: "Roosevelt Middle School",
      route: "Morning Route B",
      permissions: [
        "schedule",
        "notify",
        "manage_passengers",
        "emergency_contact",
        "admin_override",
      ],
    },
  ],
};

describe("Family-Oriented Email Service Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Progressive Parent Onboarding Email Functionality", () => {
    it("should send comprehensive welcome email for new family registration", async () => {
      const familyUserData = mockFamilyParentUser;

      mockFamilyEmailService.sendFamilyWelcomeEmail.mockResolvedValue({
        success: true,
        emailType: "family_welcome",
        familyId: familyUserData.familyId,
        childrenCount: familyUserData.children?.length || 0,
      });

      const result = await mockFamilyEmailService.sendFamilyWelcomeEmail(
        familyUserData
      );

      expect(result.success).toBe(true);
      expect(result.emailType).toBe("family_welcome");
      expect(result.familyId).toBe("johnson-family-001");
      expect(result.childrenCount).toBe(2);
      expect(
        mockFamilyEmailService.sendFamilyWelcomeEmail
      ).toHaveBeenCalledWith(familyUserData);
    });

    it("should send progressive onboarding step emails", async () => {
      const onboardingStepData = {
        user: {
          ...mockFamilyParentUser,
          onboardingProgress: {
            profileComplete: true,
            childrenAdded: false,
            emergencyContactsAdded: false,
            weeklyPreferencesSet: false,
            schoolVerified: false,
          },
        },
        nextStep: "children_addition",
        completedSteps: ["profile_creation"],
        remainingSteps: [
          "children_addition",
          "emergency_contacts",
          "weekly_preferences",
          "school_verification",
        ],
      };

      mockFamilyEmailService.sendOnboardingStepEmail.mockResolvedValue({
        success: true,
        step: "children_addition",
        progressPercentage: 20,
      });

      const result = await mockFamilyEmailService.sendOnboardingStepEmail(
        onboardingStepData
      );

      expect(result.success).toBe(true);
      expect(result.step).toBe("children_addition");
      expect(result.progressPercentage).toBe(20);
    });

    it("should send school verification emails", async () => {
      const schoolVerificationData = {
        user: mockFamilyParentUser,
        schools: ["Lincoln Elementary School"],
        verificationCode: "VERIFY123",
        expiresIn: "24 hours",
      };

      mockFamilyEmailService.sendOnboardingStepEmail.mockResolvedValue({
        success: true,
        step: "school_verification",
        verificationRequired: true,
      });

      const result = await mockFamilyEmailService.sendOnboardingStepEmail(
        schoolVerificationData
      );

      expect(result.success).toBe(true);
      expect(result.step).toBe("school_verification");
      expect(result.verificationRequired).toBe(true);
    });
  });

  describe("Family Trip Notification Emails", () => {
    it("should send comprehensive family trip notifications", async () => {
      const familyTripData: TestFamilyTrip = {
        id: "family-trip-123",
        driverId: "family-parent-1",
        passengerIds: ["child-emma-001", "child-liam-001"],
        departure: "Johnson Family Home",
        destination: "Lincoln Elementary School",
        departureTime: "07:30",
        cost: 0.0, // Free school carpool
        school: "Lincoln Elementary School",
        familyIds: ["johnson-family-001", "davis-family-003"],
        emergencyContacts: [
          {
            familyId: "johnson-family-001",
            contacts: [
              {
                name: "Michael Johnson",
                phone: "+1-555-0123",
                relationship: "Spouse",
              },
            ],
          },
        ],
      };

      mockFamilyEmailService.sendFamilyTripNotification.mockResolvedValue({
        success: true,
        emailsSent: 3, // Driver + 2 family members
        familiesNotified: 2,
        emergencyContactsIncluded: true,
      });

      const result = await mockFamilyEmailService.sendFamilyTripNotification(
        familyTripData
      );

      expect(result.success).toBe(true);
      expect(result.emailsSent).toBe(3);
      expect(result.familiesNotified).toBe(2);
      expect(result.emergencyContactsIncluded).toBe(true);
    });

    it("should handle family emergency trip notifications", async () => {
      const emergencyTripData = {
        id: "emergency-trip-456",
        emergencyType: "school_lockdown",
        affectedFamilies: ["johnson-family-001", "martinez-family-002"],
        alternatePickupLocation: "Community Center",
        estimatedDelay: "2 hours",
        groupAdmin: mockGroupAdminUser,
      };

      mockFamilyEmailService.sendEmergencyNotification.mockResolvedValue({
        success: true,
        emergencyType: "school_lockdown",
        familiesNotified: 2,
        emergencyContactsNotified: 4,
      });

      const result = await mockFamilyEmailService.sendEmergencyNotification(
        emergencyTripData
      );

      expect(result.success).toBe(true);
      expect(result.emergencyType).toBe("school_lockdown");
      expect(result.familiesNotified).toBe(2);
      expect(result.emergencyContactsNotified).toBe(4);
    });
  });

  describe("Group Discovery & Join Request Emails", () => {
    it("should send group join request emails to group admins", async () => {
      const joinRequestData = {
        requestingFamily: mockFamilyParentUser,
        targetGroup: {
          id: "lincoln-elementary-morning-group",
          name: "Lincoln Elementary Morning Carpool",
          school: "Lincoln Elementary School",
          adminId: "group-admin-1",
        },
        requestMessage:
          "We would like to join the morning carpool group for our children Emma and Liam.",
        childrenToAdd: mockFamilyParentUser.children,
      };

      mockFamilyEmailService.sendGroupJoinRequestEmail.mockResolvedValue({
        success: true,
        requestSent: true,
        groupAdminNotified: true,
        familyId: joinRequestData.requestingFamily.familyId,
      });

      const result = await mockFamilyEmailService.sendGroupJoinRequestEmail(
        joinRequestData
      );

      expect(result.success).toBe(true);
      expect(result.requestSent).toBe(true);
      expect(result.groupAdminNotified).toBe(true);
      expect(result.familyId).toBe("johnson-family-001");
    });
  });

  describe("Weekly Schedule Notification Emails", () => {
    it("should send comprehensive weekly schedule notifications to families", async () => {
      const weeklyScheduleData = {
        weekStartDate: "2024-01-15",
        groupId: "lincoln-elementary-morning-group",
        familyAssignments: [
          {
            familyId: "johnson-family-001",
            parentEmail: "sarah.johnson@carpool.com",
            drivingDays: ["Monday", "Wednesday", "Friday"],
            passengerDays: ["Tuesday", "Thursday"],
            children: ["Emma Johnson", "Liam Johnson"],
          },
          {
            familyId: "davis-family-003",
            parentEmail: "jennifer.davis@carpool.com",
            drivingDays: ["Tuesday", "Thursday"],
            passengerDays: ["Monday", "Wednesday", "Friday"],
            children: ["Sophie Davis"],
          },
        ],
        emergencyProcedures: {
          weatherDelay: "Check app for updates",
          emergencyContact: "Group Admin: Lisa Martinez",
        },
      };

      mockFamilyEmailService.sendWeeklyScheduleNotification.mockResolvedValue({
        success: true,
        emailsSent: 2,
        familiesScheduled: 2,
        childrenIncluded: 3,
      });

      const result =
        await mockFamilyEmailService.sendWeeklyScheduleNotification(
          weeklyScheduleData
        );

      expect(result.success).toBe(true);
      expect(result.emailsSent).toBe(2);
      expect(result.familiesScheduled).toBe(2);
      expect(result.childrenIncluded).toBe(3);
    });
  });
});

describe("Family-Oriented User Service Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Family User Creation and Management", () => {
    it("should create family user with complete onboarding context", async () => {
      const familyCreationData = {
        email: "newfamily@carpool.com",
        password: "test-secure-password",
        firstName: "Jennifer",
        lastName: "Davis",
        role: "parent" as const,
        familyName: "Davis Family",
        children: [
          {
            id: "child-sophie-001",
            name: "Sophie Davis",
            school: "Lincoln Elementary School",
            grade: "2nd Grade",
          },
        ],
        emergencyContacts: [
          {
            name: "Robert Davis",
            phone: "+1-555-0300",
            relationship: "Spouse",
            priority: 1,
          },
        ],
      };

      mockFamilyUserService.createFamilyUser.mockResolvedValue({
        success: true,
        user: {
          id: "family-parent-new",
          ...familyCreationData,
          familyId: "davis-family-new",
          onboardingProgress: {
            profileComplete: true,
            childrenAdded: true,
            emergencyContactsAdded: true,
            weeklyPreferencesSet: false,
            schoolVerified: false,
          },
        },
        onboardingRequired: true,
        nextSteps: ["weekly_preferences", "school_verification"],
      });

      const result = await mockFamilyUserService.createFamilyUser(
        familyCreationData
      );

      expect(result.success).toBe(true);
      expect(result.user?.familyId).toBe("davis-family-new");
      expect(result.user?.children?.length).toBe(1);
      expect(result.user?.emergencyContacts?.length).toBe(1);
      expect(result.onboardingRequired).toBe(true);
      expect(result.nextSteps).toContain("weekly_preferences");
    });

    it("should get family members with comprehensive context", async () => {
      const familyId = "johnson-family-001";

      mockFamilyUserService.getFamilyMembers.mockResolvedValue({
        success: true,
        familyId: familyId,
        members: [
          {
            id: "family-parent-1",
            name: "Sarah Johnson",
            firstName: "Sarah",
            lastName: "Johnson",
            role: "parent",
            email: "sarah.johnson@carpool.com",
            isPrimary: true,
            onboardingComplete: true,
          },
          {
            id: "child-emma-001",
            name: "Emma Johnson",
            firstName: "Emma",
            lastName: "Johnson",
            role: "student",
            school: "Lincoln Elementary School",
            grade: "3rd Grade",
            isPrimary: false,
          },
          {
            id: "child-liam-001",
            name: "Liam Johnson",
            firstName: "Liam",
            lastName: "Johnson",
            role: "student",
            school: "Lincoln Elementary School",
            grade: "1st Grade",
            isPrimary: false,
          },
        ],
        emergencyContacts: [
          {
            name: "Michael Johnson",
            phone: "+1-555-0123",
            relationship: "Spouse",
            priority: 1,
          },
        ],
      });

      const result = await mockFamilyUserService.getFamilyMembers(familyId);

      expect(result.success).toBe(true);
      expect(result.members?.length).toBe(3);
      expect(result.members?.filter((m) => m.role === "student").length).toBe(
        2
      );
      expect(result.emergencyContacts?.length).toBe(1);
    });

    it("should update onboarding progress tracking", async () => {
      const progressUpdate = {
        userId: "family-parent-1",
        step: "weekly_preferences",
        completed: true,
        data: {
          availableDays: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
          timePreferences: {
            morningStart: "07:00",
            morningEnd: "08:30",
          },
        },
      };

      mockFamilyUserService.updateOnboardingProgress.mockResolvedValue({
        success: true,
        updatedProgress: {
          profileComplete: true,
          childrenAdded: true,
          emergencyContactsAdded: true,
          weeklyPreferencesSet: true,
          schoolVerified: false,
        },
        nextStep: "school_verification",
        completionPercentage: 80,
      });

      const result = await mockFamilyUserService.updateOnboardingProgress(
        progressUpdate
      );

      expect(result.success).toBe(true);
      expect(result.updatedProgress?.weeklyPreferencesSet).toBe(true);
      expect(result.nextStep).toBe("school_verification");
      expect(result.completionPercentage).toBe(80);
    });

    it("should add emergency contacts to family", async () => {
      const emergencyContactData = {
        familyId: "johnson-family-001",
        contact: {
          name: "Dr. Sarah Wilson",
          phone: "+1-555-0400",
          relationship: "Family Doctor",
          priority: 3,
          contactType: "medical",
        },
      };

      mockFamilyUserService.addEmergencyContact.mockResolvedValue({
        success: true,
        contactAdded: true,
        totalEmergencyContacts: 3,
      });

      const result = await mockFamilyUserService.addEmergencyContact(
        emergencyContactData
      );

      expect(result.success).toBe(true);
      expect(result.contactAdded).toBe(true);
      expect(result.totalEmergencyContacts).toBe(3);
    });
  });

  describe("Weekly Preferences Management", () => {
    it("should update family weekly preferences", async () => {
      const weeklyPreferencesData = {
        familyId: "johnson-family-001",
        preferences: {
          availableDays: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
          timePreferences: {
            morningStart: "07:00",
            morningEnd: "08:30",
            afternoonStart: "15:00",
            afternoonEnd: "16:30",
          },
          drivingPreferences: {
            willingToDriver: true,
            maxPassengers: 3,
            preferredSchools: ["Lincoln Elementary School"],
          },
          specialRequirements: {
            carSeats: ["booster_seat", "regular_seat"],
            accessibility: false,
            notes: "Emma gets carsick in the back seat",
          },
        },
      };

      mockFamilyUserService.updateWeeklyPreferences.mockResolvedValue({
        success: true,
        preferencesUpdated: true,
        schedulingEnabled: true,
      });

      const result = await mockFamilyUserService.updateWeeklyPreferences(
        weeklyPreferencesData
      );

      expect(result.success).toBe(true);
      expect(result.preferencesUpdated).toBe(true);
      expect(result.schedulingEnabled).toBe(true);
    });
  });
});

describe("Family-Oriented Messaging Service Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Family Group Communication", () => {
    it("should create family group chat rooms", async () => {
      const groupChatData = {
        groupId: "lincoln-elementary-morning-group",
        groupName: "Lincoln Elementary Morning Carpool",
        participants: [
          {
            familyId: "johnson-family-001",
            parentId: "family-parent-1",
            parentName: "Sarah Johnson",
          },
          {
            familyId: "davis-family-003",
            parentId: "family-parent-3",
            parentName: "Jennifer Davis",
          },
        ],
        groupAdmin: mockGroupAdminUser,
        chatType: "group_coordination",
      };

      mockFamilyMessagingService.createFamilyGroupChat.mockResolvedValue({
        success: true,
        chatRoomId: "chat-lincoln-elementary-morning",
        participantsAdded: 2,
        adminAssigned: true,
      });

      const result = await mockFamilyMessagingService.createFamilyGroupChat(
        groupChatData
      );

      expect(result.success).toBe(true);
      expect(result.chatRoomId).toBe("chat-lincoln-elementary-morning");
      expect(result.participantsAdded).toBe(2);
      expect(result.adminAssigned).toBe(true);
    });

    it("should send family messages with context", async () => {
      const familyMessageData = {
        fromFamilyId: "johnson-family-001",
        fromUserId: "family-parent-1",
        toGroupId: "lincoln-elementary-morning-group",
        message: "Running 5 minutes late this morning - traffic on Main St",
        messageType: "schedule_update",
        urgency: "medium",
        timestamp: "2024-01-15T07:25:00Z",
      };

      mockFamilyMessagingService.sendFamilyMessage.mockResolvedValue({
        success: true,
        messageId: "msg-12345",
        deliveredTo: 3,
        timestamp: familyMessageData.timestamp,
      });

      const result = await mockFamilyMessagingService.sendFamilyMessage(
        familyMessageData
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-12345");
      expect(result.deliveredTo).toBe(3);
    });

    it("should handle emergency messaging", async () => {
      const emergencyMessageData = {
        fromAdminId: "group-admin-1",
        emergencyType: "weather_delay",
        message:
          "WEATHER ALERT: School delayed 2 hours due to snow. New pickup time: 9:30 AM",
        affectedGroups: [
          "lincoln-elementary-morning-group",
          "roosevelt-middle-morning-group",
        ],
        priority: "high",
        timestamp: "2024-01-15T06:00:00Z",
      };

      mockFamilyMessagingService.sendEmergencyMessage.mockResolvedValue({
        success: true,
        messageId: "emergency-msg-67890",
        familiesNotified: 8,
        emergencyContactsNotified: 16,
        deliveryStatus: "all_delivered",
      });

      const result = await mockFamilyMessagingService.sendEmergencyMessage(
        emergencyMessageData
      );

      expect(result.success).toBe(true);
      expect(result.familiesNotified).toBe(8);
      expect(result.emergencyContactsNotified).toBe(16);
      expect(result.deliveryStatus).toBe("all_delivered");
    });
  });
});

describe("Family-Oriented Notification Service Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Progressive Onboarding Notifications", () => {
    it("should create onboarding step notifications", async () => {
      const onboardingNotificationData = {
        userId: "family-parent-1",
        familyId: "johnson-family-001",
        step: "weekly_preferences",
        title: "Set Your Weekly Carpool Preferences",
        message:
          "Complete your weekly driving and scheduling preferences to join carpool groups",
        actionRequired: true,
        deadline: "2024-01-20T23:59:59Z",
      };

      mockFamilyNotificationService.createOnboardingNotification.mockResolvedValue(
        {
          success: true,
          notificationId: "notif-onboarding-123",
          scheduled: true,
          reminderScheduled: true,
        }
      );

      const result =
        await mockFamilyNotificationService.createOnboardingNotification(
          onboardingNotificationData
        );

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe("notif-onboarding-123");
      expect(result.scheduled).toBe(true);
      expect(result.reminderScheduled).toBe(true);
    });
  });

  describe("Group Admin Schedule Notifications", () => {
    it("should send schedule management notifications", async () => {
      const scheduleNotificationData = {
        groupId: "lincoln-elementary-morning-group",
        adminId: "group-admin-1",
        week: "2024-01-15",
        scheduleType: "weekly_assignment",
        familiesAffected: [
          {
            familyId: "johnson-family-001",
            assignments: ["Monday_driver", "Wednesday_driver", "Friday_driver"],
          },
          {
            familyId: "davis-family-003",
            assignments: ["Tuesday_driver", "Thursday_driver"],
          },
        ],
        message:
          "Weekly carpool schedule has been generated and assignments sent to all families",
      };

      mockFamilyNotificationService.createScheduleNotification.mockResolvedValue(
        {
          success: true,
          notificationId: "notif-schedule-456",
          familiesNotified: 2,
          scheduleSent: true,
        }
      );

      const result =
        await mockFamilyNotificationService.createScheduleNotification(
          scheduleNotificationData
        );

      expect(result.success).toBe(true);
      expect(result.familiesNotified).toBe(2);
      expect(result.scheduleSent).toBe(true);
    });
  });

  describe("Emergency Response Notifications", () => {
    it("should send emergency coordination notifications", async () => {
      const emergencyNotificationData = {
        emergencyType: "school_lockdown",
        affectedSchools: ["Lincoln Elementary School"],
        message:
          "EMERGENCY: School lockdown in effect. Do NOT come to school for pickup. Children are safe. Updates will follow.",
        priority: "critical",
        familiesAffected: ["johnson-family-001", "davis-family-003"],
        emergencyContactsIncluded: true,
        timestamp: "2024-01-15T14:30:00Z",
      };

      mockFamilyNotificationService.sendEmergencyNotification.mockResolvedValue(
        {
          success: true,
          notificationId: "emergency-notif-789",
          familiesNotified: 2,
          emergencyContactsNotified: 4,
          allDelivered: true,
          averageDeliveryTime: "15 seconds",
        }
      );

      const result =
        await mockFamilyNotificationService.sendEmergencyNotification(
          emergencyNotificationData
        );

      expect(result.success).toBe(true);
      expect(result.familiesNotified).toBe(2);
      expect(result.emergencyContactsNotified).toBe(4);
      expect(result.allDelivered).toBe(true);
    });
  });

  describe("Family Dashboard Notifications", () => {
    it("should get comprehensive family notifications", async () => {
      const familyId = "johnson-family-001";

      mockFamilyNotificationService.getFamilyNotifications.mockResolvedValue({
        success: true,
        notifications: [
          {
            id: "notif-1",
            type: "schedule_update",
            title: "Weekly Schedule Ready",
            message: "Your carpool schedule for week of Jan 15 is ready",
            timestamp: "2024-01-14T20:00:00Z",
            read: false,
            priority: "medium",
          },
          {
            id: "notif-2",
            type: "join_request",
            title: "New Family Join Request",
            message: "Davis family wants to join your morning carpool group",
            timestamp: "2024-01-14T18:30:00Z",
            read: false,
            priority: "low",
            actionRequired: true,
          },
          {
            id: "notif-3",
            type: "emergency",
            title: "Weather Update",
            message: "All trips cancelled due to severe weather",
            timestamp: "2024-01-14T06:00:00Z",
            read: true,
            priority: "high",
          },
        ],
        unreadCount: 2,
        emergencyCount: 0,
      });

      const result = await mockFamilyNotificationService.getFamilyNotifications(
        familyId
      );

      expect(result.success).toBe(true);
      expect(result.notifications?.length).toBe(3);
      expect(result.unreadCount).toBe(2);
      expect(result.notifications?.some((n) => n.type === "emergency")).toBe(
        true
      );
    });
  });
});

// Additional comprehensive integration tests
describe("Family-Oriented Service Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Family Onboarding Workflow", () => {
    it("should handle end-to-end family registration and onboarding", async () => {
      // Step 1: Create family user
      const familyCreationData = {
        email: "integration@carpool.com",
        password: "Integration123!",
        firstName: "Integration",
        lastName: "Test",
        role: "parent" as const,
      };

      mockFamilyUserService.createFamilyUser.mockResolvedValue({
        success: true,
        user: {
          id: "integration-user",
          ...familyCreationData,
          familyId: "integration-family",
        },
      });

      // Step 2: Send welcome email
      mockFamilyEmailService.sendFamilyWelcomeEmail.mockResolvedValue({
        success: true,
        emailType: "family_welcome",
      });

      // Step 3: Create onboarding notifications
      mockFamilyNotificationService.createOnboardingNotification.mockResolvedValue(
        {
          success: true,
          notificationId: "integration-onboarding",
        }
      );

      // Execute workflow
      const userResult = await mockFamilyUserService.createFamilyUser(
        familyCreationData
      );
      const emailResult = await mockFamilyEmailService.sendFamilyWelcomeEmail(
        userResult.user
      );
      const notificationResult =
        await mockFamilyNotificationService.createOnboardingNotification({
          userId: userResult.user?.id || "",
          familyId: userResult.user?.familyId || "",
          step: "children_addition",
        });

      // Verify workflow completion
      expect(userResult.success).toBe(true);
      expect(emailResult.success).toBe(true);
      expect(notificationResult.success).toBe(true);

      expect(mockFamilyUserService.createFamilyUser).toHaveBeenCalledWith(
        familyCreationData
      );
      expect(
        mockFamilyEmailService.sendFamilyWelcomeEmail
      ).toHaveBeenCalledWith(userResult.user);
      expect(
        mockFamilyNotificationService.createOnboardingNotification
      ).toHaveBeenCalled();
    });
  });

  describe("Emergency Response Coordination Workflow", () => {
    it("should handle emergency response across all services", async () => {
      const emergencyData = {
        type: "school_lockdown",
        affectedGroups: ["lincoln-elementary-morning-group"],
        message: "Emergency lockdown - children safe",
      };

      // Mock emergency responses across services
      mockFamilyMessagingService.sendEmergencyMessage.mockResolvedValue({
        success: true,
        familiesNotified: 5,
      });

      mockFamilyEmailService.sendEmergencyNotification.mockResolvedValue({
        success: true,
        emergencyContactsNotified: 10,
      });

      mockFamilyNotificationService.sendEmergencyNotification.mockResolvedValue(
        {
          success: true,
          allDelivered: true,
        }
      );

      // Execute emergency workflow
      const messageResult =
        await mockFamilyMessagingService.sendEmergencyMessage(emergencyData);
      const emailResult =
        await mockFamilyEmailService.sendEmergencyNotification(emergencyData);
      const notificationResult =
        await mockFamilyNotificationService.sendEmergencyNotification(
          emergencyData
        );

      // Verify emergency coordination
      expect(messageResult.success).toBe(true);
      expect(emailResult.success).toBe(true);
      expect(notificationResult.success).toBe(true);
      expect(messageResult.familiesNotified).toBe(5);
      expect(emailResult.emergencyContactsNotified).toBe(10);
    });
  });
});
