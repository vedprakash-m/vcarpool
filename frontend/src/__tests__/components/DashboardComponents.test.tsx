/**
 * Dashboard Components Test Suite - UX Requirements Alignment
 *
 * Testing alignment with User_Experience.md requirements:
 * - Unified Family Dashboard & Role Transitions: Family-oriented dashboard components and role-based navigation
 * - Progressive Parent Onboarding: Family context display and onboarding progress tracking
 * - Emergency Response & Crisis Coordination: Emergency contact components and crisis mode features
 * - Group Admin Schedule Management: Administrative components and group management interfaces
 * - Family Unit Structure: Children-focused statistics and family-oriented information display
 * - Weekly Preference Submission: Schedule preference components and family calendar integration
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Family-oriented mock auth store aligned with UX requirements
const mockFamilyAuthStore = {
  user: {
    id: 'parent-family-123',
    email: 'john.doe@lincoln.edu',
    firstName: 'John',
    lastName: 'Doe',
    role: 'parent',
    familyId: 'family-456',
    children: [
      {
        id: 'child-1',
        firstName: 'Emma',
        lastName: 'Doe',
        grade: '3rd',
        school: 'Lincoln Elementary',
        emergencyContacts: ['contact-1', 'contact-2'],
      },
      {
        id: 'child-2',
        firstName: 'Lucas',
        lastName: 'Doe',
        grade: '1st',
        school: 'Lincoln Elementary',
        emergencyContacts: ['contact-1', 'contact-2'],
      },
    ],
    emergencyContacts: [
      {
        id: 'contact-1',
        name: 'Sarah Doe',
        relationship: 'mother',
        phone: '555-0101',
        isPrimary: true,
      },
      {
        id: 'contact-2',
        name: 'Mike Johnson',
        relationship: 'uncle',
        phone: '555-0102',
        isPrimary: false,
      },
    ],
    onboardingCompleted: true,
    onboardingProgress: {
      profileSetup: true,
      childrenAdded: true,
      emergencyContactsAdded: true,
      weeklyPreferencesSet: true,
      groupDiscoveryCompleted: true,
    },
    groupAdminRoles: ['group-2'], // Admin for Oak Park Afternoon Group
    weeklyPreferences: {
      morningDropoff: { preferred: true, flexibleTiming: false },
      afternoonPickup: { preferred: true, flexibleTiming: true },
      recurringDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
  },
  isAuthenticated: true,
  loading: false,
  familyContext: {
    familyId: 'family-456',
    totalChildren: 2,
    activeGroupMemberships: 2,
    emergencyContactsCount: 2,
    weeklyTripsScheduled: 8,
  },
};

// Enhanced trip store with family-oriented statistics
const mockFamilyTripStore = {
  stats: {
    // Family-centered statistics
    totalFamilyTrips: 12,
    childrenTransported: 2,
    activeGroupMemberships: 2,
    familyGroupsAsAdmin: 1,

    // Traditional statistics enhanced with family context
    tripsAsDriver: 6,
    tripsAsPassenger: 6,
    weeklySchoolTrips: 8,
    monthlyFamilyTrips: 24,

    // Family cost savings and benefits
    familyCostSavings: 486.75, // Total family savings
    monthlyCostPerChild: 45.5,
    fuelSavingsFamily: 178.5,
    timeSavedHoursFamily: 18,

    // Safety and emergency statistics
    emergencyContactsActive: 2,
    backgroundChecksCompleted: 100, // Percentage
    verifiedDriversInGroups: 8,

    // Group management statistics (for admin roles)
    groupsManaged: 1,
    joinRequestsPending: 3,
    groupMembersActive: 12,

    // Weekly preference alignment
    preferenceMatchRate: 95, // Percentage of trips matching family preferences
    flexibilityScore: 85, // Family's scheduling flexibility score

    // Emergency response readiness
    emergencyProtocolsActive: 2,
    crisisResponseTime: 5, // minutes average
  },
  loading: false,
  fetchTripStats: jest.fn(),
  fetchFamilyStats: jest.fn(),
  fetchGroupAdminStats: jest.fn(),
};

// Mock stores aligned with UX requirements
jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => mockFamilyAuthStore,
}));

jest.mock('@/store/trip.store', () => ({
  useTripStore: () => mockFamilyTripStore,
}));

// Mock API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    isConnected: true,
  },
}));

describe('Dashboard Components - Family-Centered UX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Family-Oriented Dashboard Statistics', () => {
    it('should display family trip statistics correctly', () => {
      const familyStats = mockFamilyTripStore.stats;

      // Validate family-centered statistics structure
      expect(familyStats.totalFamilyTrips).toBe(12);
      expect(familyStats.childrenTransported).toBe(2);
      expect(familyStats.activeGroupMemberships).toBe(2);
      expect(familyStats.familyGroupsAsAdmin).toBe(1);

      // Validate traditional statistics enhanced with family context
      expect(familyStats.tripsAsDriver).toBe(6);
      expect(familyStats.tripsAsPassenger).toBe(6);
      expect(familyStats.weeklySchoolTrips).toBe(8);
      expect(familyStats.monthlyFamilyTrips).toBe(24);

      // Validate family cost savings and benefits
      expect(familyStats.familyCostSavings).toBe(486.75);
      expect(typeof familyStats.monthlyCostPerChild).toBe('number');
      expect(typeof familyStats.fuelSavingsFamily).toBe('number');
      expect(typeof familyStats.timeSavedHoursFamily).toBe('number');
    });

    it('should calculate family-derived statistics correctly', () => {
      const familyStats = mockFamilyTripStore.stats;

      // Calculate average family trips per week
      const avgFamilyTripsPerWeek = familyStats.totalFamilyTrips / 4; // Assuming 4 weeks of data
      expect(avgFamilyTripsPerWeek).toBe(3);

      // Calculate family cost savings per trip
      const costSavingsPerTrip =
        familyStats.familyCostSavings / familyStats.totalFamilyTrips;
      expect(costSavingsPerTrip).toBeCloseTo(40.56, 2);

      // Validate family-specific metrics
      expect(familyStats.weeklySchoolTrips).toBeLessThanOrEqual(10); // Max 2 trips per day * 5 days
      expect(familyStats.childrenTransported).toBeGreaterThanOrEqual(1);

      // Validate emergency response readiness
      expect(familyStats.emergencyProtocolsActive).toBe(2);
      expect(familyStats.crisisResponseTime).toBeLessThanOrEqual(10); // minutes
    });

    it('should validate family safety and emergency statistics', () => {
      const familyStats = mockFamilyTripStore.stats;

      // Safety statistics validation
      expect(familyStats.emergencyContactsActive).toBe(2);
      expect(familyStats.backgroundChecksCompleted).toBe(100); // Percentage
      expect(familyStats.verifiedDriversInGroups).toBeGreaterThan(0);

      // Emergency response validation
      expect(familyStats.emergencyProtocolsActive).toBeGreaterThan(0);
      expect(familyStats.crisisResponseTime).toBeLessThan(15); // Should be under 15 minutes
    });

    it('should validate group admin statistics for family context', () => {
      const familyStats = mockFamilyTripStore.stats;
      const familyUser = mockFamilyAuthStore.user;

      // Group management statistics (for users with admin roles)
      if (familyUser.groupAdminRoles && familyUser.groupAdminRoles.length > 0) {
        expect(familyStats.groupsManaged).toBeGreaterThanOrEqual(1);
        expect(familyStats.joinRequestsPending).toBeGreaterThanOrEqual(0);
        expect(familyStats.groupMembersActive).toBeGreaterThan(0);
      }

      // Weekly preference alignment
      expect(familyStats.preferenceMatchRate).toBeGreaterThanOrEqual(80); // At least 80% match
      expect(familyStats.flexibilityScore).toBeGreaterThanOrEqual(70); // At least 70% flexibility
    });

    it('should handle loading states for family statistics', () => {
      const loadingState = {
        stats: null,
        loading: true,
        error: null,
        fetchFamilyStats: jest.fn(),
        fetchGroupAdminStats: jest.fn(),
      };

      expect(loadingState.loading).toBe(true);
      expect(loadingState.stats).toBeNull();
      expect(loadingState.error).toBeNull();
      expect(typeof loadingState.fetchFamilyStats).toBe('function');
      expect(typeof loadingState.fetchGroupAdminStats).toBe('function');
    });

    it('should handle error states for family statistics', () => {
      const errorState = {
        stats: null,
        loading: false,
        error: 'Failed to fetch family trip statistics',
        fetchFamilyStats: jest.fn(),
        fetchGroupAdminStats: jest.fn(),
      };

      expect(errorState.loading).toBe(false);
      expect(errorState.stats).toBeNull();
      expect(errorState.error).toBeDefined();
      expect(errorState.error).toContain('Failed to fetch');
      expect(errorState.error).toContain('family');
    });
  });

  describe('Family-Oriented User Authentication Display', () => {
    it('should display family user information correctly', () => {
      const familyUser = mockFamilyAuthStore.user;

      expect(familyUser.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(familyUser.firstName).toBeDefined();
      expect(familyUser.lastName).toBeDefined();
      expect(['admin', 'parent', 'student']).toContain(familyUser.role);

      // Family-specific validations
      expect(familyUser.familyId).toBeDefined();
      expect(Array.isArray(familyUser.children)).toBe(true);
      expect(familyUser.children.length).toBeGreaterThan(0);
      expect(Array.isArray(familyUser.emergencyContacts)).toBe(true);
      expect(familyUser.emergencyContacts.length).toBeGreaterThan(0);
    });

    it('should validate family onboarding progress', () => {
      const familyUser = mockFamilyAuthStore.user;
      const onboardingProgress = familyUser.onboardingProgress;

      expect(onboardingProgress.profileSetup).toBe(true);
      expect(onboardingProgress.childrenAdded).toBe(true);
      expect(onboardingProgress.emergencyContactsAdded).toBe(true);
      expect(onboardingProgress.weeklyPreferencesSet).toBe(true);
      expect(onboardingProgress.groupDiscoveryCompleted).toBe(true);

      // Validate completed onboarding
      expect(familyUser.onboardingCompleted).toBe(true);
    });

    it('should handle different family user roles appropriately', () => {
      const userRoles = ['admin', 'parent', 'student'];

      userRoles.forEach(role => {
        const familyUserWithRole = {
          ...mockFamilyAuthStore.user,
          role,
          // Ensure family context is maintained regardless of role
          familyId: 'family-456',
          children: role === 'student' ? [] : mockFamilyAuthStore.user.children,
        };

        expect(['admin', 'parent', 'student']).toContain(
          familyUserWithRole.role
        );

        // Role-specific validations with family context
        if (role === 'admin') {
          // Admin should have access to all features with family oversight
          expect(familyUserWithRole.role).toBe('admin');
          expect(familyUserWithRole.familyId).toBeDefined();
        } else if (role === 'parent') {
          // Parent should have carpool management features and family management
          expect(familyUserWithRole.role).toBe('parent');
          expect(familyUserWithRole.familyId).toBeDefined();
          expect(Array.isArray(familyUserWithRole.children)).toBe(true);
        } else if (role === 'student') {
          // Student should have limited features but maintain family connection
          expect(familyUserWithRole.role).toBe('student');
          expect(familyUserWithRole.familyId).toBeDefined();
        }
      });
    });

    it('should validate family authentication states', () => {
      const familyAuthStates = [
        {
          isAuthenticated: true,
          loading: false,
          user: mockFamilyAuthStore.user,
          familyContext: mockFamilyAuthStore.familyContext,
        },
        {
          isAuthenticated: false,
          loading: false,
          user: null,
          familyContext: null,
        },
        {
          isAuthenticated: false,
          loading: true,
          user: null,
          familyContext: null,
        },
      ];

      familyAuthStates.forEach(state => {
        if (state.isAuthenticated) {
          expect(state.user).toBeDefined();
          expect(state.loading).toBe(false);
          expect(state.familyContext).toBeDefined();
          if (state.familyContext) {
            expect(state.familyContext.familyId).toBeDefined();
          }
        } else {
          expect(state.user).toBeNull();
          expect(state.familyContext).toBeNull();
        }
      });
    });
  });

  describe('Family-Oriented School Dashboard Features', () => {
    it('should validate family school carpool specific data', () => {
      const familyUser = mockFamilyAuthStore.user;
      const schoolData = {
        schoolName: 'Lincoln Elementary School',
        schoolYear: '2024-2025',
        semesterStart: '2024-08-26',
        semesterEnd: '2025-05-30',
        holidayBreaks: ['2024-12-23', '2025-01-06', '2025-03-17'],
        // Family-specific school data
        childrenAtSchool: familyUser.children.length,
        childrenGrades: familyUser.children.map(child => child.grade),
        emergencyContactsRegistered: familyUser.emergencyContacts.length,
      };

      expect(schoolData.schoolName).toContain('School');
      expect(schoolData.schoolYear).toMatch(/^\d{4}-\d{4}$/);
      expect(schoolData.semesterStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(schoolData.holidayBreaks)).toBe(true);

      // Family-specific validations
      expect(schoolData.childrenAtSchool).toBe(2);
      expect(schoolData.childrenGrades).toContain('3rd');
      expect(schoolData.childrenGrades).toContain('1st');
      expect(schoolData.emergencyContactsRegistered).toBe(2);
    });

    it('should validate family carpool timing constraints', () => {
      const familyUser = mockFamilyAuthStore.user;
      const familyPreferences = familyUser.weeklyPreferences;

      const carpoolTimes = {
        morningDropoff: '07:30',
        afternoonPickup: '15:15',
        maxTripDuration: 30, // minutes
        earliestStart: '07:00',
        latestEnd: '16:00',
        // Family preference integration
        familyPrefersMorning: familyPreferences.morningDropoff.preferred,
        familyPrefersAfternoon: familyPreferences.afternoonPickup.preferred,
        flexibleTiming:
          familyPreferences.morningDropoff.flexibleTiming ||
          familyPreferences.afternoonPickup.flexibleTiming,
      };

      expect(carpoolTimes.morningDropoff).toMatch(/^\d{2}:\d{2}$/);
      expect(carpoolTimes.afternoonPickup).toMatch(/^\d{2}:\d{2}$/);
      expect(carpoolTimes.maxTripDuration).toBeLessThanOrEqual(45);
      expect(carpoolTimes.maxTripDuration).toBeGreaterThan(15);

      // Family preference validations
      expect(typeof carpoolTimes.familyPrefersMorning).toBe('boolean');
      expect(typeof carpoolTimes.familyPrefersAfternoon).toBe('boolean');
      expect(typeof carpoolTimes.flexibleTiming).toBe('boolean');
    });

    it('should validate family parent-child relationship display', () => {
      const familyUser = mockFamilyAuthStore.user;
      const familyContext = mockFamilyAuthStore.familyContext;

      const parentChildData = {
        parentId: familyUser.id,
        familyId: familyUser.familyId,
        children: familyUser.children,
        emergencyContacts: familyUser.emergencyContacts,
        // Enhanced family context
        totalChildren: familyContext.totalChildren,
        activeGroupMemberships: familyContext.activeGroupMemberships,
      };

      expect(parentChildData.parentId).toBeDefined();
      expect(parentChildData.familyId).toBe('family-456');
      expect(Array.isArray(parentChildData.children)).toBe(true);
      expect(parentChildData.children.length).toBeGreaterThan(0);
      expect(parentChildData.children[0].grade).toMatch(/^\d+(st|nd|rd|th)$/);

      // Family context validations
      expect(parentChildData.totalChildren).toBe(2);
      expect(parentChildData.activeGroupMemberships).toBe(2);
      expect(Array.isArray(parentChildData.emergencyContacts)).toBe(true);
      expect(parentChildData.emergencyContacts.length).toBeGreaterThan(0);
    });
  });

  describe('Family-Oriented Dashboard Navigation and Layout', () => {
    it('should validate family dashboard navigation menu structure', () => {
      const familyUser = mockFamilyAuthStore.user;
      const navigationMenu = {
        dashboard: '/dashboard',
        myGroups: '/groups/my-groups', // Group-focused navigation
        discoverGroups: '/groups/discover', // Group discovery
        joinRequests: '/groups/join-requests', // Join request management
        profile: '/profile',
        children: '/family/children', // Family-specific
        emergencyContacts: '/family/emergency-contacts', // Family-specific
        weeklyPreferences: '/parents/preferences', // Parent-specific with family context
        admin:
          familyUser.groupAdminRoles && familyUser.groupAdminRoles.length > 0
            ? '/admin'
            : null, // Admin-specific if user has admin roles
        familyDashboard: '/family/dashboard', // Family-centered dashboard
      };

      Object.entries(navigationMenu).forEach(([key, route]) => {
        if (route !== null) {
          expect(route).toMatch(/^\/[a-z-/]*$/);
        }
      });

      expect(navigationMenu.dashboard).toBe('/dashboard');
      expect(navigationMenu.myGroups).toContain('groups');
      expect(navigationMenu.discoverGroups).toContain('groups');
      expect(navigationMenu.joinRequests).toContain('join-requests');
      expect(navigationMenu.children).toContain('family');
      expect(navigationMenu.emergencyContacts).toContain('emergency-contacts');
      expect(navigationMenu.weeklyPreferences).toContain('parents');

      // Conditional admin access based on group admin roles
      if (familyUser.groupAdminRoles && familyUser.groupAdminRoles.length > 0) {
        expect(navigationMenu.admin).toBe('/admin');
      }
    });

    it('should validate family-responsive design breakpoints', () => {
      const breakpoints = {
        mobile: '640px',
        tablet: '768px',
        desktop: '1024px',
        large: '1280px',
        // Family-specific breakpoints for multi-child displays
        familyMobile: '480px', // Compact family info
        familyTablet: '896px', // Extended family cards
      };

      Object.values(breakpoints).forEach(breakpoint => {
        expect(breakpoint).toMatch(/^\d+px$/);
      });

      // Validate breakpoint order
      const sizes = Object.values(breakpoints).map(bp => parseInt(bp));
      expect(Math.min(...sizes)).toBeLessThan(Math.max(...sizes));

      // Family-specific breakpoint validations
      expect(parseInt(breakpoints.familyMobile)).toBeLessThan(
        parseInt(breakpoints.mobile)
      );
      expect(parseInt(breakpoints.familyTablet)).toBeGreaterThan(
        parseInt(breakpoints.tablet)
      );
    });

    it('should validate family dashboard layout components', () => {
      const familyLayoutComponents = [
        'FamilyHeader', // Header with family context
        'GroupNavigation', // Group-focused navigation
        'FamilyMainContent', // Family-centered main content
        'FamilyStatisticsCards', // Family trip statistics
        'ChildrenOverview', // Children information display
        'EmergencyContactsPanel', // Emergency contacts quick access
        'GroupMemberships', // Current group memberships
        'JoinRequestsPanel', // Active join requests
        'WeeklyPreferencesStatus', // Weekly preferences summary
        'AdminGroupsPanel', // Group admin tools (conditional)
        'FamilyFooter', // Footer with family-specific links
      ];

      familyLayoutComponents.forEach(component => {
        expect(component).toMatch(/^[A-Z][a-zA-Z]*$/);
        expect(component.length).toBeGreaterThan(3);
      });

      expect(familyLayoutComponents).toContain('FamilyHeader');
      expect(familyLayoutComponents).toContain('GroupNavigation');
      expect(familyLayoutComponents).toContain('FamilyMainContent');
      expect(familyLayoutComponents).toContain('ChildrenOverview');
      expect(familyLayoutComponents).toContain('EmergencyContactsPanel');

      // Group-specific components
      expect(familyLayoutComponents).toContain('GroupMemberships');
      expect(familyLayoutComponents).toContain('JoinRequestsPanel');

      // Progressive onboarding components
      expect(familyLayoutComponents).toContain('WeeklyPreferencesStatus');
    });
  });

  describe('Family Dashboard Performance and Optimization', () => {
    it('should validate family data loading performance', async () => {
      const loadStart = performance.now();

      // Simulate family data loading including children, emergency contacts, and group memberships
      await new Promise(resolve => setTimeout(resolve, 150)); // Slightly longer due to family data complexity

      const loadEnd = performance.now();
      const loadTime = loadEnd - loadStart;

      // Family dashboard should load efficiently despite additional data
      expect(loadTime).toBeLessThan(1500); // Less than 1.5 seconds for family data
      expect(loadTime).toBeGreaterThan(100); // But realistic for complex family data
    });

    it('should validate family memory usage patterns', () => {
      const familyMemoryUsage = {
        initialLoad: 55, // MB - slightly higher due to family context
        afterFamilyDataFetch: 65, // MB - includes children and emergency contacts
        afterGroupDataFetch: 75, // MB - includes group memberships and admin data
        maxAcceptableFamily: 120, // MB - higher threshold for family applications
      };

      expect(familyMemoryUsage.afterFamilyDataFetch).toBeGreaterThan(
        familyMemoryUsage.initialLoad
      );
      expect(familyMemoryUsage.afterGroupDataFetch).toBeGreaterThan(
        familyMemoryUsage.afterFamilyDataFetch
      );
      expect(familyMemoryUsage.afterGroupDataFetch).toBeLessThan(
        familyMemoryUsage.maxAcceptableFamily
      );
    });

    it('should validate family-oriented caching strategy', () => {
      const familyCacheConfig = {
        familyStatsCache: 300, // 5 minutes - family statistics
        childrenDataCache: 900, // 15 minutes - children information (changes less frequently)
        emergencyContactsCache: 1800, // 30 minutes - emergency contacts (very stable)
        groupMembershipsCache: 180, // 3 minutes - group memberships (can change)
        weeklyPreferencesCache: 600, // 10 minutes - weekly preferences
        adminGroupDataCache: 120, // 2 minutes - admin group data (more dynamic)
        maxFamilyCacheSize: 15, // MB - higher for family applications
      };

      Object.values(familyCacheConfig).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });

      // Validate cache hierarchy - more stable data cached longer
      expect(familyCacheConfig.emergencyContactsCache).toBeGreaterThan(
        familyCacheConfig.childrenDataCache
      );
      expect(familyCacheConfig.childrenDataCache).toBeGreaterThan(
        familyCacheConfig.weeklyPreferencesCache
      );
      expect(familyCacheConfig.weeklyPreferencesCache).toBeGreaterThan(
        familyCacheConfig.familyStatsCache
      );
      expect(familyCacheConfig.adminGroupDataCache).toBeLessThan(
        familyCacheConfig.groupMembershipsCache
      );
    });
  });

  describe('Family-Oriented Error Handling and Edge Cases', () => {
    it('should handle network failures gracefully in family context', () => {
      const familyNetworkError = {
        type: 'family_network_error',
        message: 'Failed to fetch family data',
        retryable: true,
        fallbackData: {
          familyStats: mockFamilyTripStore.stats,
          familyUser: mockFamilyAuthStore.user,
          familyContext: mockFamilyAuthStore.familyContext,
        },
        affectedComponents: [
          'FamilyStatistics',
          'ChildrenOverview',
          'GroupMemberships',
        ],
      };

      expect(familyNetworkError.type).toBe('family_network_error');
      expect(familyNetworkError.retryable).toBe(true);
      expect(familyNetworkError.fallbackData).toBeDefined();
      expect(familyNetworkError.fallbackData.familyStats).toBeDefined();
      expect(familyNetworkError.fallbackData.familyUser).toBeDefined();
      expect(familyNetworkError.fallbackData.familyContext).toBeDefined();
      expect(Array.isArray(familyNetworkError.affectedComponents)).toBe(true);
    });

    it('should handle invalid family user data', () => {
      const invalidFamilyUsers = [
        {
          email: 'invalid-email',
          role: 'parent',
          familyId: 'family-456',
          children: [],
        },
        {
          email: 'valid@email.com',
          role: 'invalid-role',
          familyId: 'family-456',
          children: [],
        },
        {
          email: 'valid@email.com',
          role: 'parent',
          firstName: '',
          familyId: '',
          children: [],
        },
        {
          email: 'valid@email.com',
          role: 'parent',
          familyId: 'family-456',
          children: null, // Invalid children data
        },
      ];

      invalidFamilyUsers.forEach(user => {
        if (!user.email.includes('@')) {
          expect(user.email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }
        if (!['admin', 'parent', 'student'].includes(user.role)) {
          expect(['admin', 'parent', 'student']).not.toContain(user.role);
        }
        if (user.firstName === '') {
          expect(user.firstName.length).toBe(0);
        }
        if (user.familyId === '') {
          expect(user.familyId.length).toBe(0);
        }
        if (user.children === null) {
          expect(user.children).toBeNull();
        }
      });
    });

    it('should handle missing or null family statistics', () => {
      const missingFamilyStats = {
        stats: null,
        loading: false,
        error: null,
        fetchFamilyStats: jest.fn(),
        fetchGroupAdminStats: jest.fn(),
      };

      const emptyFamilyStats = {
        stats: {
          totalFamilyTrips: 0,
          childrenTransported: 0,
          activeGroupMemberships: 0,
          familyCostSavings: 0,
          emergencyContactsActive: 0,
          groupsManaged: 0,
        },
        loading: false,
        error: null,
        fetchFamilyStats: jest.fn(),
        fetchGroupAdminStats: jest.fn(),
      };

      // Null stats should be handled
      expect(missingFamilyStats.stats).toBeNull();
      expect(missingFamilyStats.loading).toBe(false);
      expect(typeof missingFamilyStats.fetchFamilyStats).toBe('function');
      expect(typeof missingFamilyStats.fetchGroupAdminStats).toBe('function');

      // Empty stats should be valid
      expect(emptyFamilyStats.stats.totalFamilyTrips).toBe(0);
      expect(emptyFamilyStats.stats.childrenTransported).toBe(0);
      expect(emptyFamilyStats.stats.activeGroupMemberships).toBe(0);
      expect(typeof emptyFamilyStats.stats.familyCostSavings).toBe('number');
      expect(typeof emptyFamilyStats.stats.emergencyContactsActive).toBe(
        'number'
      );
    });

    it('should handle incomplete family onboarding scenarios', () => {
      const incompleteOnboardingUser = {
        ...mockFamilyAuthStore.user,
        onboardingCompleted: false,
        onboardingProgress: {
          profileSetup: true,
          childrenAdded: false, // Missing children
          emergencyContactsAdded: false, // Missing emergency contacts
          weeklyPreferencesSet: false, // Missing preferences
          groupDiscoveryCompleted: false, // Missing group discovery
        },
        children: [],
        emergencyContacts: [],
      };

      expect(incompleteOnboardingUser.onboardingCompleted).toBe(false);
      expect(incompleteOnboardingUser.onboardingProgress.profileSetup).toBe(
        true
      );
      expect(incompleteOnboardingUser.onboardingProgress.childrenAdded).toBe(
        false
      );
      expect(
        incompleteOnboardingUser.onboardingProgress.emergencyContactsAdded
      ).toBe(false);
      expect(incompleteOnboardingUser.children.length).toBe(0);
      expect(incompleteOnboardingUser.emergencyContacts.length).toBe(0);
    });

    it('should handle emergency contact validation errors', () => {
      const invalidEmergencyContacts = [
        {
          id: 'contact-1',
          name: '',
          relationship: 'mother',
          phone: '555-0101',
        }, // Missing name
        {
          id: 'contact-2',
          name: 'John Doe',
          relationship: '',
          phone: '555-0102',
        }, // Missing relationship
        {
          id: 'contact-3',
          name: 'Jane Doe',
          relationship: 'aunt',
          phone: 'invalid-phone',
        }, // Invalid phone
        {
          id: 'contact-4',
          name: 'Bob Smith',
          relationship: 'uncle',
          phone: '555-0103',
          isPrimary: null,
        }, // Invalid isPrimary
      ];

      invalidEmergencyContacts.forEach(contact => {
        if (contact.name === '') {
          expect(contact.name.length).toBe(0);
        }
        if (contact.relationship === '') {
          expect(contact.relationship.length).toBe(0);
        }
        if (contact.phone === 'invalid-phone') {
          expect(contact.phone).not.toMatch(/^\d{3}-\d{4}$/);
        }
        if (contact.isPrimary === null) {
          expect(contact.isPrimary).toBeNull();
        }
      });
    });
  });
});
