/**
 * Parent Group Search
 *
 * Migrated from JavaScript to TypeScript
 * Handles group search and join requests by parent users
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import {
  compose,
  requestId,
  requestLogging,
  authenticate,
  validateBody,
  corsMiddleware,
} from '../src/middleware';
import { groupDomainService } from '../src/services/domains/group-domain.service';
import { databaseService } from '../src/services/database.service';
import { UserRole } from '@carpool/shared';
import { handleError, Errors } from '../src/utils/error-handler';
import { z } from 'zod';

// Validation schemas
const GroupSearchSchema = z.object({
  schoolId: z.string().optional(),
  schoolName: z.string().optional(),
  userLat: z.number().optional(),
  userLng: z.number().optional(),
  maxDistanceMiles: z.number().optional(),
  ageGroups: z.array(z.string()).optional(),
  daysOfWeek: z.array(z.string()).optional(),
  morningPickup: z.boolean().optional(),
  afternoonDropoff: z.boolean().optional(),
});

const JoinRequestSchema = z.object({
  groupId: z.string(),
  message: z.string().optional(),
  childrenInfo: z
    .array(
      z.object({
        name: z.string(),
        age: z.number().optional(),
        grade: z.string().optional(),
      }),
    )
    .optional(),
});

interface GroupSearchCriteria {
  schoolId?: string;
  schoolName?: string;
  maxDistanceMiles: number;
  ageGroups: string[];
  daysOfWeek: string[];
  timePreferences: {
    morningPickup: boolean;
    afternoonDropoff: boolean;
  };
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface MatchResult {
  score: number;
  reasons: string[];
}

interface SearchResult {
  group: any;
  matchScore: number;
  distance: number | null;
  matchReasons: string[];
  canRequestToJoin: boolean;
}

// Handler function
async function parentGroupSearchHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const method = request.method;
    const action = request.query.get('action');
    const userId = request.auth!.userId; // Ensured by authenticate middleware

    context.log('Parent group search request', { method, action, userId });

    // Verify user is a parent
    const user = await databaseService.getUserById(userId);
    if (!user) {
      throw Errors.Unauthorized('User not found');
    }

    if (user.role !== 'parent') {
      throw Errors.Forbidden('Only parents can search groups');
    }

    // Validate registration requirements
    const registrationValidation = validateRegistrationRequirement(user);
    if (!registrationValidation.isValid) {
      throw Errors.Forbidden(registrationValidation.message || 'Registration validation failed');
    }

    switch (method) {
      case 'GET':
        if (action === 'search') {
          return await handleGroupSearch(request, userId, context);
        }
        if (action === 'my-requests') {
          return await handleGetMyRequests(userId, context);
        }
        break;

      case 'POST':
        if (action === 'join-request') {
          return await handleJoinRequest(request, userId, context);
        }
        break;
    }

    throw Errors.BadRequest(`Method ${method} with action ${action} not allowed`);
  } catch (error) {
    context.log('Parent group search error:', error);
    return handleError(error, request);
  }
}

async function handleGroupSearch(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const query = request.query;

    // Extract search parameters
    const searchCriteria: GroupSearchCriteria = {
      schoolId: query.get('schoolId') || undefined,
      schoolName: query.get('schoolName') || undefined,
      maxDistanceMiles: parseFloat(query.get('maxDistanceMiles') || '10'),
      ageGroups: query.get('ageGroups')?.split(',') || [],
      daysOfWeek: query.get('daysOfWeek')?.split(',') || [],
      timePreferences: {
        morningPickup: query.get('morningPickup') === 'true',
        afternoonDropoff: query.get('afternoonDropoff') === 'true',
      },
    };

    // Get user location
    const userLocation: UserLocation | null =
      query.get('userLat') && query.get('userLng')
        ? {
            latitude: parseFloat(query.get('userLat')!),
            longitude: parseFloat(query.get('userLng')!),
          }
        : null;

    // Use GroupDomainService to discover groups
    const groupsResult = await groupDomainService.discoverGroups(
      {
        schoolId: searchCriteria.schoolId,
        location: userLocation
          ? {
              address: '', // Not needed for coordinate-based search
              maxDistance: searchCriteria.maxDistanceMiles,
            }
          : undefined,
        maxMembers: undefined,
        hasOpenings: true,
        scheduleCompatibility: searchCriteria.daysOfWeek,
      },
      userId,
    );

    if (!groupsResult.success) {
      throw Errors.InternalServerError('Failed to search groups');
    }

    const groups = groupsResult.data || [];

    // Filter and score groups - using mock data structure for now
    const results: SearchResult[] = groups
      .map((groupResult) => {
        // Extract group from matching result
        const group = groupResult.group || groupResult;
        const distance = userLocation
          ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              group.serviceArea?.centerLocation?.latitude || 0,
              group.serviceArea?.centerLocation?.longitude || 0,
            )
          : null;

        const { score, reasons } = calculateMatchScore(group, searchCriteria, userLocation);

        return {
          group: {
            ...group,
            // Remove sensitive data for public search
            groupAdminName: group.groupAdminName,
          },
          matchScore: score,
          distance,
          matchReasons: reasons,
          canRequestToJoin:
            group.settings.isAcceptingMembers && group.members.length < group.maxMembers,
        };
      })
      .filter((result) => {
        // Apply distance filter
        if (userLocation && result.distance && result.distance > searchCriteria.maxDistanceMiles) {
          return false;
        }
        // Minimum match score threshold
        return result.matchScore >= 20;
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    const user = await databaseService.getUserById(userId);

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          results,
          total: results.length,
          searchCriteria,
          userInfo: {
            registrationComplete: true, // Assume complete if validated
            hasVerifiedAddress: user?.addressVerified || false,
            hasVerifiedPhone: user?.phoneVerified || false,
            hasEmergencyContacts: (user?.emergencyContacts?.length || 0) > 0,
          },
        },
        message: 'Group search completed successfully',
      },
    };
  } catch (error) {
    context.log('Group search error:', error);
    throw error;
  }
}

async function handleJoinRequest(
  request: HttpRequest,
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const body = await request.json();
    const validatedData = JoinRequestSchema.parse(body);

    context.log('Creating join request', { userId, groupId: validatedData.groupId });

    // Use GroupDomainService to create join request
    const result = await groupDomainService.requestJoinGroup({
      groupId: validatedData.groupId,
      userId,
      message: validatedData.message || '',
      childrenIds: [], // Map from childrenInfo if needed
    });

    if (!result.success) {
      throw Errors.ValidationError(result.error || 'Failed to create join request');
    }

    return {
      status: 201,
      jsonBody: {
        success: true,
        data: {
          joinRequest: result.data,
        },
        message: 'Join request submitted successfully. The Group Admin will review your request.',
      },
    };
  } catch (error) {
    context.log('Join request error:', error);
    throw error;
  }
}

async function handleGetMyRequests(
  userId: string,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    // Use GroupDomainService to get user's join requests
    const result = await groupDomainService.getJoinRequests('all'); // Get all and filter by user

    if (!result.success) {
      throw Errors.InternalServerError('Failed to get join requests');
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          requests: result.data || [],
          total: result.data?.length || 0,
        },
        message: 'Join requests retrieved successfully',
      },
    };
  } catch (error) {
    context.log('Get join requests error:', error);
    throw error;
  }
}

// Helper functions
function validateRegistrationRequirement(user: any): { isValid: boolean; message?: string } {
  // Simplified validation - assume if user exists and is active, they are valid
  if (!user.isActive) {
    return {
      isValid: false,
      message: 'Please complete your registration before accessing carpool groups.',
    };
  }

  if (!user.phoneVerified) {
    return {
      isValid: false,
      message: 'Please verify your phone number to access carpool groups.',
    };
  }

  if (!user.addressVerified) {
    return {
      isValid: false,
      message: 'Please verify your home address to access carpool groups.',
    };
  }

  if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
    return {
      isValid: false,
      message: 'Please add and verify emergency contacts to access carpool groups.',
    };
  }

  return { isValid: true };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function calculateMatchScore(
  group: any,
  searchCriteria: GroupSearchCriteria,
  userLocation: UserLocation | null,
): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  // Distance scoring (40 points max)
  if (userLocation && group.serviceArea?.centerLocation) {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      group.serviceArea.centerLocation.latitude,
      group.serviceArea.centerLocation.longitude,
    );

    if (distance <= (group.serviceArea.radiusMiles || 10)) {
      const distanceScore = Math.max(0, 40 - distance * 4); // Closer = higher score
      score += distanceScore;
      reasons.push(`Within service area (${distance.toFixed(1)} miles)`);
    }
  }

  // School match (30 points)
  if (searchCriteria.schoolId && group.targetSchoolId === searchCriteria.schoolId) {
    score += 30;
    reasons.push('Exact school match');
  } else if (
    searchCriteria.schoolName &&
    group.targetSchool?.name?.toLowerCase().includes(searchCriteria.schoolName.toLowerCase())
  ) {
    score += 20;
    reasons.push('School name match');
  }

  // Age group compatibility (20 points)
  if (searchCriteria.ageGroups.length > 0) {
    const ageIntersection = searchCriteria.ageGroups.filter((age) =>
      group.ageGroups?.includes(age),
    );
    if (ageIntersection.length > 0) {
      score += 20;
      reasons.push(`Compatible age groups (${ageIntersection.join(', ')})`);
    }
  }

  // Schedule compatibility (10 points)
  if (searchCriteria.daysOfWeek.length > 0) {
    const dayIntersection = searchCriteria.daysOfWeek.filter((day) =>
      group.schedule?.daysOfWeek?.includes(day),
    );
    if (dayIntersection.length > 0) {
      score += 10;
      reasons.push(`Compatible schedule (${dayIntersection.length} days)`);
    }
  }

  return { score, reasons };
}

// Register the function with middleware
app.http('parent-group-search', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'parent/groups',
  handler: compose(
    requestId,
    requestLogging,
    corsMiddleware,
    authenticate,
    validateBody(z.union([GroupSearchSchema, JoinRequestSchema]).optional()),
  )(parentGroupSearchHandler),
});
