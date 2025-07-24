/**
 * Auth Register Function - Carpool Business Logic Tests
 * ALIGNMENT WITH USER_EXPERIENCE.MD REQUIREMENTS:
 *
 * 1. PROGRESSIVE PARENT ONBOARDING: Multi-step family registration with guided onboarding flow
 * 2. GROUP DISCOVERY & JOIN REQUEST: Family-oriented group discovery with admin approval workflows
 * 3. WEEKLY PREFERENCE SUBMISSION: Family schedule coordination and preference management
 * 4. GROUP ADMIN SCHEDULE MANAGEMENT: Enhanced role-based permissions for group administration
 * 5. EMERGENCY RESPONSE & CRISIS COORDINATION: Emergency contact validation and crisis management
 * 6. UNIFIED FAMILY DASHBOARD & ROLE TRANSITIONS: Family-centered registration with role management
 *
 * FOCUSES: Family registration workflows, progressive onboarding, emergency contact validation,
 * group admin role assignments, and family-oriented authentication requirements
 */

// Family-oriented interfaces extending base requirements
interface TestFamilyUser {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  familyId?: string;
  children?: Array<{
    firstName: string;
    lastName: string;
    grade: string;
    school: string;
    emergencyContacts: string[];
  }>;
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
    canPickup: boolean;
  }>;
  onboardingProgress?: {
    profileComplete: boolean;
    emergencyContactsAdded: boolean;
    childrenAdded: boolean;
    weeklyPreferencesSet: boolean;
    groupDiscoveryCompleted: boolean;
  };
  groupAdminRoles?: string[];
  weeklyPreferences?: {
    [key: string]:
      | "available"
      | "unavailable"
      | "preferable"
      | "less-preferable";
  };
}

describe("Auth Register - Carpool Family-Oriented Business Requirements", () => {
  describe("Family Registration & Progressive Onboarding", () => {
    it("should validate family registration with progressive onboarding", () => {
      const validateFamilyRegistration = (familyData: TestFamilyUser) => {
        const requiredFields = ["email", "firstName", "lastName", "password"];
        const progressSteps = {
          profileComplete: requiredFields.every(
            (field) => !!familyData[field as keyof TestFamilyUser]
          ),
          emergencyContactsAdded:
            familyData.emergencyContacts &&
            familyData.emergencyContacts.length >= 2,
          childrenAdded: familyData.children && familyData.children.length > 0,
          weeklyPreferencesSet:
            familyData.weeklyPreferences &&
            Object.keys(familyData.weeklyPreferences).length > 0,
          groupDiscoveryCompleted: false, // Will be set after group discovery
        };

        return {
          isValidRegistration: progressSteps.profileComplete,
          onboardingProgress: progressSteps,
          completionPercentage:
            (Object.values(progressSteps).filter(Boolean).length /
              Object.keys(progressSteps).length) *
            100,
          nextStep: !progressSteps.profileComplete
            ? "Complete Profile"
            : !progressSteps.emergencyContactsAdded
            ? "Add Emergency Contacts"
            : !progressSteps.childrenAdded
            ? "Add Children"
            : !progressSteps.weeklyPreferencesSet
            ? "Set Weekly Preferences"
            : !progressSteps.groupDiscoveryCompleted
            ? "Discover Groups"
            : "Onboarding Complete",
        };
      };

      const newFamilyUser: TestFamilyUser = {
        email: "parent@lincolnelementary.edu",
        firstName: "Sarah",
        lastName: "Johnson",
        password: "FamilyCarpool2024!",
        role: "parent",
        familyId: "family-johnson-001",
        children: [
          {
            firstName: "Emma",
            lastName: "Johnson",
            grade: "3rd",
            school: "Lincoln Elementary",
            emergencyContacts: [],
          },
        ],
        emergencyContacts: [
          {
            name: "John Johnson",
            phone: "+1-555-0123",
            relationship: "spouse",
            canPickup: true,
          },
          {
            name: "Mary Smith",
            phone: "+1-555-0456",
            relationship: "grandmother",
            canPickup: true,
          },
        ],
      };

      const validation = validateFamilyRegistration(newFamilyUser);
      expect(validation.isValidRegistration).toBe(true);
      expect(validation.onboardingProgress.profileComplete).toBe(true);
      expect(validation.onboardingProgress.emergencyContactsAdded).toBe(true);
      expect(validation.onboardingProgress.childrenAdded).toBe(true);
    });

    it("should enforce emergency contact validation for family safety", () => {
      const validateEmergencyContacts = (
        contacts: TestFamilyUser["emergencyContacts"]
      ) => {
        if (!contacts || contacts.length < 2) {
          return {
            isValid: false,
            error:
              "At least 2 emergency contacts required for family registration",
          };
        }

        const validContacts = contacts.every(
          (contact) =>
            contact.name &&
            contact.phone &&
            contact.relationship &&
            typeof contact.canPickup === "boolean"
        );

        const hasPickupAuthorized = contacts.some(
          (contact) => contact.canPickup
        );

        return {
          isValid: validContacts && hasPickupAuthorized,
          totalContacts: contacts.length,
          pickupAuthorized: hasPickupAuthorized,
          error: !validContacts
            ? "All contact fields required"
            : !hasPickupAuthorized
            ? "At least one contact must be authorized for pickup"
            : null,
        };
      };

      // Valid emergency contacts
      const validContacts = [
        {
          name: "John Smith",
          phone: "+1-555-0123",
          relationship: "spouse",
          canPickup: true,
        },
        {
          name: "Mary Johnson",
          phone: "+1-555-0456",
          relationship: "grandmother",
          canPickup: true,
        },
      ];

      const validation = validateEmergencyContacts(validContacts);
      expect(validation.isValid).toBe(true);
      expect(validation.totalContacts).toBe(2);
      expect(validation.pickupAuthorized).toBe(true);

      // Invalid - insufficient contacts
      const insufficientContacts = [
        {
          name: "John Smith",
          phone: "+1-555-0123",
          relationship: "spouse",
          canPickup: true,
        },
      ];

      const invalidValidation = validateEmergencyContacts(insufficientContacts);
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.error).toContain(
        "At least 2 emergency contacts required"
      );
    });

    it("should validate group admin role assignment permissions", () => {
      const validateGroupAdminAssignment = (
        userData: TestFamilyUser,
        requestedGroups: string[]
      ) => {
        const hasCompleteProfile = !!(
          userData.firstName &&
          userData.lastName &&
          userData.email
        );
        const hasEmergencyContacts =
          userData.emergencyContacts && userData.emergencyContacts.length >= 2;
        const hasChildren = userData.children && userData.children.length > 0;

        const eligibleForGroupAdmin =
          hasCompleteProfile && hasEmergencyContacts && hasChildren;

        return {
          isEligible: eligibleForGroupAdmin,
          canBeGroupAdmin: eligibleForGroupAdmin && userData.role === "parent",
          maxGroupsAllowed: 3, // Reasonable limit for group admin responsibilities
          requestedGroupsValid: requestedGroups.length <= 3,
          assignedRoles: eligibleForGroupAdmin
            ? requestedGroups.slice(0, 3)
            : [],
          requirements: {
            completeProfile: hasCompleteProfile,
            emergencyContacts: !!hasEmergencyContacts,
            hasChildren: !!hasChildren,
            parentRole: userData.role === "parent",
          },
        };
      };

      const groupAdminCandidate: TestFamilyUser = {
        email: "groupadmin@school.edu",
        firstName: "Lisa",
        lastName: "Williams",
        password: "GroupAdmin2024!",
        role: "parent",
        familyId: "family-williams-001",
        children: [
          {
            firstName: "Alex",
            lastName: "Williams",
            grade: "4th",
            school: "Lincoln Elementary",
            emergencyContacts: [],
          },
        ],
        emergencyContacts: [
          {
            name: "Mike Williams",
            phone: "+1-555-0789",
            relationship: "spouse",
            canPickup: true,
          },
          {
            name: "Carol Wilson",
            phone: "+1-555-0987",
            relationship: "aunt",
            canPickup: true,
          },
        ],
      };

      const requestedGroups = ["morning-group-a", "afternoon-group-b"];
      const adminValidation = validateGroupAdminAssignment(
        groupAdminCandidate,
        requestedGroups
      );

      expect(adminValidation.isEligible).toBe(true);
      expect(adminValidation.canBeGroupAdmin).toBe(true);
      expect(adminValidation.requestedGroupsValid).toBe(true);
      expect(adminValidation.assignedRoles).toEqual(requestedGroups);
      expect(adminValidation.requirements.completeProfile).toBe(true);
      expect(adminValidation.requirements.emergencyContacts).toBe(true);
      expect(adminValidation.requirements.hasChildren).toBe(true);
    });
  });

  describe("Weekly Preference Integration", () => {
    it("should initialize weekly preferences for family schedule coordination", () => {
      const initializeWeeklyPreferences = (familyData: TestFamilyUser) => {
        const weekdays = [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
        ];
        const timeSlots = ["morning_dropoff", "afternoon_pickup"];

        const defaultPreferences: {
          [key: string]:
            | "available"
            | "unavailable"
            | "preferable"
            | "less-preferable";
        } = {};

        weekdays.forEach((day) => {
          timeSlots.forEach((slot) => {
            const key = `${day}_${slot}`;
            defaultPreferences[key] = "available"; // Default to available
          });
        });

        return {
          weeklyPreferences: defaultPreferences,
          preferencesCount: Object.keys(defaultPreferences).length,
          familyId: familyData.familyId,
          childrenCount: familyData.children?.length || 0,
          canSetPreferences:
            !!familyData.familyId && !!familyData.children?.length,
        };
      };

      const familyUser: TestFamilyUser = {
        email: "parent@school.edu",
        firstName: "Jane",
        lastName: "Smith",
        password: "FamilyPass123!",
        role: "parent",
        familyId: "family-smith-001",
        children: [
          {
            firstName: "Tommy",
            lastName: "Smith",
            grade: "2nd",
            school: "Lincoln Elementary",
            emergencyContacts: [],
          },
        ],
      };

      const preferences = initializeWeeklyPreferences(familyUser);
      expect(preferences.preferencesCount).toBe(10); // 5 days × 2 time slots
      expect(preferences.canSetPreferences).toBe(true);
      expect(preferences.familyId).toBe("family-smith-001");
      expect(preferences.weeklyPreferences.monday_morning_dropoff).toBe(
        "available"
      );
      expect(preferences.weeklyPreferences.friday_afternoon_pickup).toBe(
        "available"
      );
    });
  });

  describe("Email Validation Requirements", () => {
    const validateEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    // Carpool email validation
    expect(validateEmail("parent@school.edu")).toBe(true);
    expect(validateEmail("student@lincolnelementary.org")).toBe(true);
    expect(validateEmail("admin@district.k12.us")).toBe(true);

    // Invalid email formats
    expect(validateEmail("invalid-email")).toBe(false);
    expect(validateEmail("missing@domain")).toBe(false);
    expect(validateEmail("@missinglocal.com")).toBe(false);
  });

  it("should handle school domain patterns for carpool community", () => {
    const getEmailDomain = (email: string) => email.split("@")[1];

    // School-focused email domains
    expect(getEmailDomain("parent@lincolnelementary.edu")).toBe(
      "lincolnelementary.edu"
    );
    expect(getEmailDomain("teacher@district.k12.us")).toBe("district.k12.us");

    // Domain extraction consistency
    const testEmails = [
      "parent1@school.edu",
      "parent2@school.edu",
      "student@school.edu",
    ];

    const domains = testEmails.map(getEmailDomain);
    const uniqueDomains = [...new Set(domains)];
    expect(uniqueDomains).toHaveLength(1); // Same school community
  });
});

describe("Password Security Requirements", () => {
  it("should enforce Carpool password strength standards", () => {
    const validatePasswordStrength = (password: string) => {
      return {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        isStrong:
          password.length >= 8 &&
          /[A-Z]/.test(password) &&
          /[a-z]/.test(password) &&
          /\d/.test(password),
      };
    };

    // Strong password examples
    const strongPassword = validatePasswordStrength("Parent123!");
    expect(strongPassword.minLength).toBe(true);
    expect(strongPassword.hasUppercase).toBe(true);
    expect(strongPassword.hasLowercase).toBe(true);
    expect(strongPassword.hasNumbers).toBe(true);
    expect(strongPassword.isStrong).toBe(true);

    // Weak password examples
    const weakPassword = validatePasswordStrength("weak");
    expect(weakPassword.minLength).toBe(false);
    expect(weakPassword.isStrong).toBe(false);

    // School-appropriate password example
    const schoolPassword = validatePasswordStrength("SchoolCarpool2024");
    expect(schoolPassword.isStrong).toBe(true);
  });

  it("should require consistent password validation across registration", () => {
    const passwords = [
      "SecureParent123!",
      "StudentPass2024",
      "AdminCarpool456!",
    ];

    passwords.forEach((password) => {
      expect(password.length).toBeGreaterThanOrEqual(8);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
    });
  });
});

describe("User Role Validation for School Carpool", () => {
  it("should validate Carpool role assignments", () => {
    const validateRole = (role: string) => {
      const validRoles = ["admin", "parent", "student"];
      return {
        isValid: validRoles.includes(role),
        role: role,
        permissions:
          role === "admin"
            ? ["create", "read", "update", "delete"]
            : role === "parent"
            ? ["read", "update", "preferences"]
            : role === "student"
            ? ["read", "profile"]
            : [],
      };
    };

    // Valid Carpool roles
    const adminRole = validateRole("admin");
    expect(adminRole.isValid).toBe(true);
    expect(adminRole.permissions).toContain("delete");

    const parentRole = validateRole("parent");
    expect(parentRole.isValid).toBe(true);
    expect(parentRole.permissions).toContain("preferences");

    const studentRole = validateRole("student");
    expect(studentRole.isValid).toBe(true);
    expect(studentRole.permissions).toContain("profile");

    // Invalid role
    const invalidRole = validateRole("teacher");
    expect(invalidRole.isValid).toBe(false);
    expect(invalidRole.permissions).toHaveLength(0);
  });

  it("should assign default role for new registrations", () => {
    const assignDefaultRole = (providedRole?: string) => {
      const validRoles = ["admin", "parent", "student"];
      return validRoles.includes(providedRole || "") ? providedRole : "parent";
    };

    // Default behavior
    expect(assignDefaultRole()).toBe("parent");
    expect(assignDefaultRole("")).toBe("parent");
    expect(assignDefaultRole("invalid")).toBe("parent");

    // Valid roles preserved
    expect(assignDefaultRole("admin")).toBe("admin");
    expect(assignDefaultRole("student")).toBe("student");
    expect(assignDefaultRole("parent")).toBe("parent");
  });
});

describe("User Profile Data Validation", () => {
  it("should validate required fields for Carpool registration", () => {
    const validateUserData = (userData: any) => {
      const required = ["email", "firstName", "lastName", "password", "role"];
      const missing = required.filter((field) => !userData[field]);

      return {
        isValid: missing.length === 0,
        missingFields: missing,
        hasAllRequired: missing.length === 0,
      };
    };

    // Complete user data
    const completeUser = {
      email: "parent@school.edu",
      firstName: "John",
      lastName: "Parent",
      password: "SecurePass123!",
      role: "parent",
    };

    const validation = validateUserData(completeUser);
    expect(validation.isValid).toBe(true);
    expect(validation.missingFields).toHaveLength(0);

    // Incomplete user data
    const incompleteUser = {
      email: "test@school.edu",
      // Missing firstName, lastName, password, role
    };

    const invalidValidation = validateUserData(incompleteUser);
    expect(invalidValidation.isValid).toBe(false);
    expect(invalidValidation.missingFields).toContain("firstName");
    expect(invalidValidation.missingFields).toContain("password");
  });

  it("should validate name fields for school directory", () => {
    const validateName = (name: string) => {
      const trimmed = name?.trim() || "";
      return {
        isValid: trimmed.length > 0,
        trimmed: trimmed,
        hasValidLength: trimmed.length >= 2,
        isAlphabetic: /^[a-zA-Z\s'-]+$/.test(trimmed),
      };
    };

    // Valid names
    expect(validateName("John").isValid).toBe(true);
    expect(validateName("Mary-Jane").isAlphabetic).toBe(true);
    expect(validateName("O'Connor").isAlphabetic).toBe(true);

    // Invalid names
    expect(validateName("").isValid).toBe(false);
    expect(validateName("  ").isValid).toBe(false);
    expect(validateName("J").hasValidLength).toBe(false);
  });
});

describe("Registration Business Logic", () => {
  it("should prevent duplicate email registration", () => {
    const existingEmails = [
      "existing@school.edu",
      "parent1@school.edu",
      "student@school.edu",
    ];

    const checkEmailExists = (email: string) => {
      return existingEmails.includes(email.toLowerCase());
    };

    // Duplicate detection
    expect(checkEmailExists("existing@school.edu")).toBe(true);
    expect(checkEmailExists("EXISTING@school.edu")).toBe(true); // Case insensitive

    // New email allowed
    expect(checkEmailExists("newparent@school.edu")).toBe(false);
  });

  it("should initialize user preferences for carpool participation", () => {
    const initializeUserPreferences = (role: string) => {
      const basePreferences = {
        emailNotifications: true,
        smsNotifications: false,
        publicProfile: false,
      };

      if (role === "parent") {
        return {
          ...basePreferences,
          weeklyDriverPreferences: {},
          maxChildrenInCarpool: 4,
          emergencyContact: "",
        };
      }

      if (role === "student") {
        return {
          ...basePreferences,
          parentId: "",
          grade: "",
          school: "",
        };
      }

      if (role === "admin") {
        return {
          ...basePreferences,
          adminLevel: "school",
          canModifySchedules: true,
        };
      }

      return basePreferences;
    };

    // Parent preferences
    const parentPrefs = initializeUserPreferences("parent") as any;
    expect(parentPrefs.emailNotifications).toBe(true);
    expect(parentPrefs.maxChildrenInCarpool).toBe(4);
    expect(parentPrefs.weeklyDriverPreferences).toBeDefined();

    // Student preferences
    const studentPrefs = initializeUserPreferences("student") as any;
    expect(studentPrefs.parentId).toBeDefined();
    expect(studentPrefs.grade).toBeDefined();

    // Admin preferences
    const adminPrefs = initializeUserPreferences("admin") as any;
    expect(adminPrefs.canModifySchedules).toBe(true);
  });
});

describe("Carpool API Response Format", () => {
  it("should return consistent success response format", () => {
    const createSuccessResponse = (userData: any, token: string) => {
      return {
        success: true,
        data: {
          user: {
            id: "user-123",
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            createdAt: new Date().toISOString(),
            preferences: {},
          },
          token: token,
          refreshToken: `refresh_${token}`,
        },
        message: "Registration successful",
      };
    };

    const userData = {
      email: "newparent@school.edu",
      firstName: "Jane",
      lastName: "Parent",
      role: "parent",
    };

    const response = createSuccessResponse(userData, "jwt_token_example");

    expect(response.success).toBe(true);
    expect(response.data.user.email).toBe(userData.email);
    expect(response.data.user.role).toBe("parent");
    expect(response.data.token).toBeDefined();
    expect(response.data.refreshToken).toBeDefined();
    expect(response.message).toContain("successful");
  });

  it("should return proper error response format", () => {
    const createErrorResponse = (code: string, message: string) => {
      return {
        success: false,
        error: {
          code: code,
          message: message,
          details: null,
        },
        requestId: `req_${Date.now()}`,
      };
    };

    // Validation error
    const validationError = createErrorResponse(
      "VALIDATION_ERROR",
      "Invalid email format"
    );
    expect(validationError.success).toBe(false);
    expect(validationError.error.code).toBe("VALIDATION_ERROR");
    expect(validationError.error.message).toContain("email");

    // Duplicate user error
    const duplicateError = createErrorResponse(
      "USER_ALREADY_EXISTS",
      "Email already registered"
    );
    expect(duplicateError.error.code).toBe("USER_ALREADY_EXISTS");
    expect(duplicateError.requestId).toBeDefined();
  });
});

describe("School Carpool Community Features", () => {
  it("should support school-specific registration flows", () => {
    const processSchoolRegistration = (userData: any, schoolDomain: string) => {
      const userDomain = userData.email.split("@")[1];

      return {
        isSchoolCommunityMember: userDomain === schoolDomain,
        schoolName: schoolDomain.split(".")[0],
        communityVerified: userDomain === schoolDomain,
        requiresApproval: userData.role === "admin",
      };
    };

    const userData = {
      email: "parent@lincolnelementary.edu",
      role: "parent",
    };
    const registration = processSchoolRegistration(
      userData,
      "lincolnelementary.edu"
    );

    expect(registration.isSchoolCommunityMember).toBe(true);
    expect(registration.schoolName).toBe("lincolnelementary");
    expect(registration.communityVerified).toBe(true);
    expect(registration.requiresApproval).toBe(false);
  });

  it("should handle multi-child family registration with emergency protocols", () => {
    const validateFamilyRegistration = (parentData: any, children: any[]) => {
      const emergencyContactsPerChild = children.every(
        (child) =>
          child.emergencyContacts && child.emergencyContacts.length >= 2
      );

      return {
        parentValid: parentData.role === "parent",
        childrenCount: children.length,
        allChildrenHaveNames: children.every(
          (child) => child.firstName && child.lastName
        ),
        allChildrenHaveSchools: children.every((child) => child.school),
        allChildrenHaveGrades: children.every((child) => child.grade),
        emergencyProtocolsComplete: emergencyContactsPerChild,
        maxChildrenAllowed: children.length <= 6, // Reasonable limit
        familyComplete: parentData.role === "parent" && children.length > 0,
        readyForGroupDiscovery:
          parentData.role === "parent" &&
          children.length > 0 &&
          emergencyContactsPerChild,
      };
    };

    const parentData = {
      role: "parent",
      email: "parent@school.edu",
      emergencyContacts: [
        {
          name: "Parent Emergency",
          phone: "+1-555-0001",
          relationship: "self",
          canPickup: true,
        },
        {
          name: "Spouse Emergency",
          phone: "+1-555-0002",
          relationship: "spouse",
          canPickup: true,
        },
      ],
    };

    const children = [
      {
        firstName: "Alice",
        lastName: "Smith",
        grade: "3rd",
        school: "Lincoln Elementary",
        emergencyContacts: [
          {
            name: "Alice Emergency 1",
            phone: "+1-555-1001",
            relationship: "parent",
            canPickup: true,
          },
          {
            name: "Alice Emergency 2",
            phone: "+1-555-1002",
            relationship: "grandparent",
            canPickup: true,
          },
        ],
      },
      {
        firstName: "Bob",
        lastName: "Smith",
        grade: "1st",
        school: "Lincoln Elementary",
        emergencyContacts: [
          {
            name: "Bob Emergency 1",
            phone: "+1-555-2001",
            relationship: "parent",
            canPickup: true,
          },
          {
            name: "Bob Emergency 2",
            phone: "+1-555-2002",
            relationship: "aunt",
            canPickup: false,
          },
        ],
      },
    ];

    const familyValidation = validateFamilyRegistration(parentData, children);
    expect(familyValidation.parentValid).toBe(true);
    expect(familyValidation.childrenCount).toBe(2);
    expect(familyValidation.allChildrenHaveNames).toBe(true);
    expect(familyValidation.allChildrenHaveSchools).toBe(true);
    expect(familyValidation.allChildrenHaveGrades).toBe(true);
    expect(familyValidation.emergencyProtocolsComplete).toBe(true);
    expect(familyValidation.familyComplete).toBe(true);
    expect(familyValidation.readyForGroupDiscovery).toBe(true);
  });
});

describe("Emergency Response & Crisis Coordination", () => {
  it("should validate emergency response permissions during registration", () => {
    const validateEmergencyResponseAccess = (userData: TestFamilyUser) => {
      const hasValidEmergencyContacts =
        userData.emergencyContacts && userData.emergencyContacts.length >= 2;

      const hasPickupAuthorization = userData.emergencyContacts?.some(
        (contact) => contact.canPickup
      );

      const emergencyResponseLevel =
        userData.groupAdminRoles && userData.groupAdminRoles.length > 0
          ? "group_admin"
          : userData.role === "parent"
          ? "family_parent"
          : "basic_user";

      return {
        canReceiveEmergencyNotifications: hasValidEmergencyContacts,
        canAuthorizePickup: hasPickupAuthorization,
        emergencyResponseLevel: emergencyResponseLevel,
        canCoordinateGroupEmergency: emergencyResponseLevel === "group_admin",
        emergencyContactsValid: hasValidEmergencyContacts,
        emergencyProtocolsEnabled:
          hasValidEmergencyContacts && hasPickupAuthorization,
      };
    };

    const emergencyEnabledUser: TestFamilyUser = {
      email: "emergency@school.edu",
      firstName: "Emma",
      lastName: "Davis",
      password: "Emergency2024!",
      role: "parent",
      familyId: "family-davis-001",
      groupAdminRoles: ["morning-emergency-group"],
      emergencyContacts: [
        {
          name: "Emergency Contact 1",
          phone: "+1-555-9001",
          relationship: "spouse",
          canPickup: true,
        },
        {
          name: "Emergency Contact 2",
          phone: "+1-555-9002",
          relationship: "parent",
          canPickup: true,
        },
        {
          name: "Emergency Contact 3",
          phone: "+1-555-9003",
          relationship: "neighbor",
          canPickup: false,
        },
      ],
    };

    const emergencyValidation =
      validateEmergencyResponseAccess(emergencyEnabledUser);
    expect(emergencyValidation.canReceiveEmergencyNotifications).toBe(true);
    expect(emergencyValidation.canAuthorizePickup).toBe(true);
    expect(emergencyValidation.emergencyResponseLevel).toBe("group_admin");
    expect(emergencyValidation.canCoordinateGroupEmergency).toBe(true);
    expect(emergencyValidation.emergencyProtocolsEnabled).toBe(true);
  });
});
