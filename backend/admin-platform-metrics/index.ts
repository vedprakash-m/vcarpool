/**
 * Admin Platform Metrics Management
 *
 * Migrated from JavaScript to TypeScript
 * Provides comprehensive platform analytics for admin monitoring
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate } from '../src/middleware';
import UnifiedResponseHandler from '../src/utils/unified-response.service';

interface PlatformMetrics {
  timeframe: string;
  generatedAt: string;
  summary: {
    totalUsers: number;
    totalGroups: number;
    totalTrips: number;
    activeUsers: number;
    pendingRequests: number;
  };
  userMetrics: {
    newRegistrations: number;
    userGrowthRate: number;
    activeParents: number;
    activeStudents: number;
    userRetentionRate: number;
  };
  groupMetrics: {
    totalCarpoolGroups: number;
    averageGroupSize: number;
    activeGroups: number;
    groupGrowthRate: number;
  };
  tripMetrics: {
    totalTripsCompleted: number;
    totalTripsScheduled: number;
    averageTripsPerWeek: number;
    tripCompletionRate: number;
    cancelledTrips: number;
  };
  systemHealth: {
    uptime: string;
    responseTime: number;
    errorRate: number;
    databaseHealth: 'healthy' | 'degraded' | 'unhealthy';
  };
  performanceMetrics: {
    averageResponseTime: number;
    peakUsageHours: string[];
    systemLoad: number;
    memoryUsage: number;
  };
}

export async function adminPlatformMetrics(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Admin Platform Metrics API called');

  try {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return UnifiedResponseHandler.preflight();
    }

    // Apply authentication middleware
    const authResponse = await authenticate(request, context);
    if (authResponse) {
      return authResponse;
    }

    // Check if user is authenticated
    if (!request.auth) {
      return UnifiedResponseHandler.authError('Authentication required');
    }

    const user = request.auth;

    // Validate admin access
    if (user.role !== 'super_admin' && user.role !== 'group_admin') {
      return UnifiedResponseHandler.forbiddenError('Admin access required');
    }

    switch (request.method) {
      case 'GET':
        return await handleGetPlatformMetrics(request);

      default:
        return UnifiedResponseHandler.methodNotAllowedError(`Method ${request.method} not allowed`);
    }
  } catch (error) {
    context.log('Error in admin-platform-metrics', error);
    return UnifiedResponseHandler.internalError(
      'Failed to retrieve platform metrics',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

async function handleGetPlatformMetrics(request: HttpRequest): Promise<HttpResponseInit> {
  const queryParams = Object.fromEntries(request.query.entries());
  const timeframe = queryParams.timeframe || '7d';

  try {
    // For now, return mock metrics data until database integration is complete
    const mockMetrics = generateMockMetrics(timeframe);
    return UnifiedResponseHandler.success(mockMetrics);
  } catch (error) {
    throw error;
  }
}

function generateMockMetrics(timeframe: string): PlatformMetrics {
  const now = new Date();

  return {
    timeframe,
    generatedAt: now.toISOString(),
    summary: {
      totalUsers: 245,
      totalGroups: 18,
      totalTrips: 1287,
      activeUsers: 189,
      pendingRequests: 12,
    },
    userMetrics: {
      newRegistrations: 23,
      userGrowthRate: 12.5,
      activeParents: 156,
      activeStudents: 89,
      userRetentionRate: 87.3,
    },
    groupMetrics: {
      totalCarpoolGroups: 18,
      averageGroupSize: 13.6,
      activeGroups: 16,
      groupGrowthRate: 8.2,
    },
    tripMetrics: {
      totalTripsCompleted: 1287,
      totalTripsScheduled: 1342,
      averageTripsPerWeek: 45.2,
      tripCompletionRate: 95.9,
      cancelledTrips: 55,
    },
    systemHealth: {
      uptime: '99.8%',
      responseTime: 145,
      errorRate: 0.2,
      databaseHealth: 'healthy',
    },
    performanceMetrics: {
      averageResponseTime: 145,
      peakUsageHours: ['8:00 AM', '3:00 PM', '6:00 PM'],
      systemLoad: 23.5,
      memoryUsage: 67.8,
    },
  };
}
