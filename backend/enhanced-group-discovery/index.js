/**
 * Enhanced Group Discovery Backend Service
 * Implements intelligent group matching with scoring algorithms
 */

import { Context } from '@azure/functions';
import { authenticateUser } from '../src/middleware/auth.middleware.js';
import { CosmosDBService } from '../src/services/cosmosdb.service.js';

interface GroupMatchCriteria {
  userId: string;
  homeLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  schoolLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  availableTimeSlots: Array<{
    day: string; // 'monday', 'tuesday', etc.
    pickup: string; // HH:MM format
    dropoff: string; // HH:MM format
  }>;
  preferences: {
    maxDetourMinutes: number;
    preferredGroupSize: number;
    childrenAges: number[];
    sameschoolRequired: boolean;
    emergencyContactRequired: boolean;
  };
  excludeGroups?: string[]; // Group IDs to exclude
}

interface GroupMatch {
  groupId: string;
  groupName: string;
  score: number;
  compatibility: {
    locationScore: number;
    timeScore: number;
    preferenceScore: number;
    capacityScore: number;
    socialScore: number;
  };
  insights: {
    detourMinutes: number;
    avgTravelTime: number;
    matchingTimeSlots: number;
    currentMembers: number;
    maxCapacity: number;
    ageCompatibility: string;
    schoolMatch: boolean;
  };
  groupDetails: {
    adminName: string;
    adminContact: string;
    description: string;
    createdDate: Date;
    activeMembers: number;
    weeklyTrips: number;
  };
}

interface DiscoveryResponse {
  matches: GroupMatch[];
  totalFound: number;
  searchCriteria: GroupMatchCriteria;
  recommendations: string[];
}

class GroupDiscoveryService {
  private cosmosService: CosmosDBService;

  constructor() {
    this.cosmosService = new CosmosDBService();
  }

  /**
   * Find matching groups based on comprehensive criteria
   */
  async findMatches(criteria: GroupMatchCriteria): Promise<DiscoveryResponse> {
    try {
      // Get all active groups within reasonable distance
      const nearbyGroups = await this.findNearbyGroups(criteria);
      
      // Score each group for compatibility
      const scoredMatches: GroupMatch[] = [];
      
      for (const group of nearbyGroups) {
        const match = await this.scoreGroupMatch(criteria, group);
        if (match.score > 0.3) { // Only include matches with >30% compatibility
          scoredMatches.push(match);
        }
      }

      // Sort by score (highest first)
      scoredMatches.sort((a, b) => b.score - a.score);

      // Generate recommendations
      const recommendations = this.generateRecommendations(criteria, scoredMatches);

      return {
        matches: scoredMatches.slice(0, 20), // Limit to top 20 matches
        totalFound: scoredMatches.length,
        searchCriteria: criteria,
        recommendations
      };
    } catch (error) {
      console.error('Error finding group matches:', error);
      throw new Error('Failed to find group matches');
    }
  }

  /**
   * Find groups within reasonable geographic distance
   */
  private async findNearbyGroups(criteria: GroupMatchCriteria) {
    const maxDistanceKm = 25; // 25km radius
    
    const query = `
      SELECT * FROM c 
      WHERE c.type = 'group' 
      AND c.status = 'active'
      AND c.school.latitude BETWEEN @minLat AND @maxLat
      AND c.school.longitude BETWEEN @minLng AND @maxLng
      ${criteria.excludeGroups?.length ? 'AND NOT ARRAY_CONTAINS(@excludeGroups, c.id)' : ''}
    `;

    // Simple bounding box calculation (approximate)
    const latDelta = maxDistanceKm / 111; // ~111km per degree of latitude
    const lngDelta = maxDistanceKm / (111 * Math.cos(criteria.schoolLocation.latitude * Math.PI / 180));

    const parameters = [
      { name: '@minLat', value: criteria.schoolLocation.latitude - latDelta },
      { name: '@maxLat', value: criteria.schoolLocation.latitude + latDelta },
      { name: '@minLng', value: criteria.schoolLocation.longitude - lngDelta },
      { name: '@maxLng', value: criteria.schoolLocation.longitude + lngDelta }
    ];

    if (criteria.excludeGroups?.length) {
      parameters.push({ name: '@excludeGroups', value: criteria.excludeGroups });
    }

    const results = await this.cosmosService.queryItems('carpool', query, parameters);
    return results.resources;
  }

  /**
   * Score a group's compatibility with user criteria
   */
  private async scoreGroupMatch(criteria: GroupMatchCriteria, group: any): Promise<GroupMatch> {
    // Calculate individual scores
    const locationScore = this.calculateLocationScore(criteria, group);
    const timeScore = this.calculateTimeScore(criteria, group);
    const preferenceScore = this.calculatePreferenceScore(criteria, group);
    const capacityScore = this.calculateCapacityScore(criteria, group);
    const socialScore = await this.calculateSocialScore(criteria, group);

    // Weighted overall score
    const score = (
      locationScore * 0.3 +
      timeScore * 0.25 +
      preferenceScore * 0.2 +
      capacityScore * 0.15 +
      socialScore * 0.1
    );

    // Get group insights
    const insights = await this.calculateInsights(criteria, group);
    const groupDetails = await this.getGroupDetails(group.id);

    return {
      groupId: group.id,
      groupName: group.name,
      score: Math.round(score * 100) / 100,
      compatibility: {
        locationScore: Math.round(locationScore * 100) / 100,
        timeScore: Math.round(timeScore * 100) / 100,
        preferenceScore: Math.round(preferenceScore * 100) / 100,
        capacityScore: Math.round(capacityScore * 100) / 100,
        socialScore: Math.round(socialScore * 100) / 100
      },
      insights,
      groupDetails
    };
  }

  /**
   * Calculate location compatibility score
   */
  private calculateLocationScore(criteria: GroupMatchCriteria, group: any): number {
    // Calculate distance to school
    const schoolDistance = this.calculateDistance(
      criteria.schoolLocation,
      group.school
    );

    // Calculate average distance to group members' homes
    const homeDistances = group.members?.map((member: any) => 
      this.calculateDistance(criteria.homeLocation, member.homeLocation)
    ) || [];

    const avgHomeDistance = homeDistances.length > 0 
      ? homeDistances.reduce((sum: number, dist: number) => sum + dist, 0) / homeDistances.length
      : 10; // Default if no members

    // Score based on school proximity (more important) and home proximity
    const schoolScore = Math.max(0, 1 - (schoolDistance / 5)); // Perfect score within 5km
    const homeScore = Math.max(0, 1 - (avgHomeDistance / 15)); // Perfect score within 15km

    return schoolScore * 0.7 + homeScore * 0.3;
  }

  /**
   * Calculate time compatibility score
   */
  private calculateTimeScore(criteria: GroupMatchCriteria, group: any): number {
    if (!group.schedule?.timeSlots) return 0.5; // Default if no schedule

    let totalMatches = 0;
    let totalSlots = criteria.availableTimeSlots.length;

    for (const userSlot of criteria.availableTimeSlots) {
      for (const groupSlot of group.schedule.timeSlots) {
        if (userSlot.day === groupSlot.day) {
          const userPickup = this.timeToMinutes(userSlot.pickup);
          const userDropoff = this.timeToMinutes(userSlot.dropoff);
          const groupPickup = this.timeToMinutes(groupSlot.pickup);
          const groupDropoff = this.timeToMinutes(groupSlot.dropoff);

          // Check if times overlap with some flexibility
          const pickupDiff = Math.abs(userPickup - groupPickup);
          const dropoffDiff = Math.abs(userDropoff - groupDropoff);

          if (pickupDiff <= 30 && dropoffDiff <= 30) { // 30 minute flexibility
            totalMatches++;
            break; // Don't count the same day multiple times
          }
        }
      }
    }

    return totalSlots > 0 ? totalMatches / totalSlots : 0;
  }

  /**
   * Calculate preference compatibility score
   */
  private calculatePreferenceScore(criteria: GroupMatchCriteria, group: any): number {
    let score = 0;
    let maxScore = 0;

    // Age compatibility
    if (criteria.preferences.childrenAges.length > 0 && group.memberAges?.length > 0) {
      const ageOverlap = this.calculateAgeOverlap(
        criteria.preferences.childrenAges,
        group.memberAges
      );
      score += ageOverlap * 0.3;
    }
    maxScore += 0.3;

    // Group size preference
    const currentSize = group.members?.length || 0;
    const preferredSize = criteria.preferences.preferredGroupSize;
    const sizeDiff = Math.abs(currentSize - preferredSize);
    const sizeScore = Math.max(0, 1 - (sizeDiff / preferredSize));
    score += sizeScore * 0.2;
    maxScore += 0.2;

    // School requirement
    if (criteria.preferences.sameschoolRequired) {
      if (group.school.name === criteria.schoolLocation.address) {
        score += 0.3;
      }
    } else {
      score += 0.15; // Partial credit for flexibility
    }
    maxScore += 0.3;

    // Emergency contact requirement
    if (criteria.preferences.emergencyContactRequired) {
      if (group.requiresEmergencyContact) {
        score += 0.2;
      }
    } else {
      score += 0.1; // Partial credit for flexibility
    }
    maxScore += 0.2;

    return maxScore > 0 ? score / maxScore : 0.5;
  }

  /**
   * Calculate capacity score
   */
  private calculateCapacityScore(criteria: GroupMatchCriteria, group: any): number {
    const currentMembers = group.members?.length || 0;
    const maxCapacity = group.maxCapacity || 8;
    const availableSpots = maxCapacity - currentMembers;

    if (availableSpots <= 0) return 0; // No capacity
    if (availableSpots >= 3) return 1; // Plenty of space
    
    return availableSpots / 3; // Score based on available spots
  }

  /**
   * Calculate social score based on user connections
   */
  private async calculateSocialScore(criteria: GroupMatchCriteria, group: any): Promise<number> {
    // This would integrate with social connections, mutual friends, etc.
    // For now, return a baseline score
    return 0.5;
  }

  /**
   * Calculate detailed insights for the match
   */
  private async calculateInsights(criteria: GroupMatchCriteria, group: any) {
    const schoolDistance = this.calculateDistance(
      criteria.homeLocation,
      group.school
    );

    const memberAges = group.memberAges || [];
    const ageCompatibility = this.getAgeCompatibilityText(
      criteria.preferences.childrenAges,
      memberAges
    );

    return {
      detourMinutes: Math.round(schoolDistance * 2), // Rough estimate
      avgTravelTime: Math.round(schoolDistance * 2.5), // Including stops
      matchingTimeSlots: this.countMatchingTimeSlots(criteria, group),
      currentMembers: group.members?.length || 0,
      maxCapacity: group.maxCapacity || 8,
      ageCompatibility,
      schoolMatch: group.school.name === criteria.schoolLocation.address
    };
  }

  /**
   * Get additional group details
   */
  private async getGroupDetails(groupId: string) {
    const group = await this.cosmosService.getItem('carpool', groupId, groupId);
    const admin = group.adminId ? await this.cosmosService.getItem('carpool', group.adminId, group.adminId) : null;

    return {
      adminName: admin ? `${admin.firstName} ${admin.lastName}` : 'Unknown',
      adminContact: admin?.email || '',
      description: group.description || '',
      createdDate: new Date(group.createdAt),
      activeMembers: group.members?.length || 0,
      weeklyTrips: group.weeklyTrips || 0
    };
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(criteria: GroupMatchCriteria, matches: GroupMatch[]): string[] {
    const recommendations: string[] = [];

    if (matches.length === 0) {
      recommendations.push("No matching groups found. Consider creating your own group!");
      recommendations.push("Try expanding your search radius or time flexibility.");
    } else if (matches.length === 1) {
      recommendations.push(`Found 1 great match! Consider reaching out to ${matches[0].groupDetails.adminName}.`);
    } else {
      const topMatch = matches[0];
      recommendations.push(`Top match: ${topMatch.groupName} with ${Math.round(topMatch.score * 100)}% compatibility.`);
      
      if (topMatch.score > 0.8) {
        recommendations.push("This is an excellent match! We recommend contacting this group soon.");
      } else if (topMatch.score > 0.6) {
        recommendations.push("This is a good match with some minor differences in preferences.");
      }
    }

    // Specific recommendations based on criteria
    if (criteria.preferences.maxDetourMinutes < 15) {
      recommendations.push("Consider increasing your detour tolerance for more group options.");
    }

    return recommendations;
  }

  // Helper methods
  private calculateDistance(point1: any, point2: any): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private calculateAgeOverlap(ages1: number[], ages2: number[]): number {
    const overlap = ages1.filter(age => ages2.includes(age)).length;
    const totalUnique = new Set([...ages1, ...ages2]).size;
    return totalUnique > 0 ? overlap / totalUnique : 0;
  }

  private getAgeCompatibilityText(userAges: number[], groupAges: number[]): string {
    const overlap = userAges.filter(age => groupAges.includes(age)).length;
    const totalUserAges = userAges.length;
    
    if (overlap === totalUserAges) return 'Perfect match';
    if (overlap > totalUserAges / 2) return 'Good match';
    if (overlap > 0) return 'Some overlap';
    return 'No age overlap';
  }

  private countMatchingTimeSlots(criteria: GroupMatchCriteria, group: any): number {
    let matches = 0;
    
    for (const userSlot of criteria.availableTimeSlots) {
      for (const groupSlot of group.schedule?.timeSlots || []) {
        if (userSlot.day === groupSlot.day) {
          const userPickup = this.timeToMinutes(userSlot.pickup);
          const groupPickup = this.timeToMinutes(groupSlot.pickup);
          
          if (Math.abs(userPickup - groupPickup) <= 30) {
            matches++;
            break;
          }
        }
      }
    }
    
    return matches;
  }
}

/**
 * Azure Function: Enhanced Group Discovery
 */
export async function main(context: Context): Promise<void> {
  context.log('Enhanced Group Discovery function triggered');

  try {
    // Authenticate user
    const user = await authenticateUser(context);
    if (!user) {
      context.res = {
        status: 401,
        body: { error: 'Authentication required' }
      };
      return;
    }

    // Parse request body
    const criteria: GroupMatchCriteria = context.req.body;
    
    // Validate required fields
    if (!criteria.homeLocation || !criteria.schoolLocation || !criteria.availableTimeSlots) {
      context.res = {
        status: 400,
        body: { error: 'Missing required criteria: homeLocation, schoolLocation, availableTimeSlots' }
      };
      return;
    }

    // Add user ID to criteria
    criteria.userId = user.id;

    // Initialize service and find matches
    const discoveryService = new GroupDiscoveryService();
    const results = await discoveryService.findMatches(criteria);

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: results
    };

  } catch (error: any) {
    context.log.error('Enhanced Group Discovery error:', error);
    
    context.res = {
      status: 500,
      body: { 
        error: 'Internal server error',
        message: error.message 
      }
    };
  }
}
