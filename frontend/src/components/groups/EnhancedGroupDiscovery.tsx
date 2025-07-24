/**
 * Enhanced Group Discovery Component
 * Intelligent group matching with scoring and real-time updates
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMobile } from '@/services/mobile.service';
import { useOffline } from '@/services/offline.service';
import { useRealTime } from '@/services/realtime.service';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import {
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  StarIcon,
  ArrowRightIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface GroupMatchCriteria {
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
    day: string;
    pickup: string;
    dropoff: string;
  }>;
  preferences: {
    maxDetourMinutes: number;
    preferredGroupSize: number;
    childrenAges: number[];
    sameschoolRequired: boolean;
    emergencyContactRequired: boolean;
  };
  excludeGroups?: string[];
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

interface EnhancedGroupDiscoveryProps {
  initialCriteria?: Partial<GroupMatchCriteria>;
  onGroupSelect?: (groupId: string) => void;
  className?: string;
}

export function EnhancedGroupDiscovery({
  initialCriteria,
  onGroupSelect,
  className = '',
}: EnhancedGroupDiscoveryProps) {
  const router = useRouter();
  const { isMobile, hapticFeedback } = useMobile();
  const { isOnline, getCachedResponse, cacheResponse } = useOffline();
  const { subscribe } = useRealTime();
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<GroupMatchCriteria | null>(
    (initialCriteria as GroupMatchCriteria) || null
  );
  const [showFilters, setShowFilters] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [totalFound, setTotalFound] = useState(0);

  // Subscribe to real-time group updates
  useEffect(() => {
    const unsubscribe = subscribe('group_updated', message => {
      const updatedGroupId = message.payload.groupId;
      setMatches(prev =>
        prev.map(match =>
          match.groupId === updatedGroupId
            ? { ...match, ...message.payload.updates }
            : match
        )
      );
    });

    return unsubscribe;
  }, [subscribe]);

  const searchGroups = useCallback(
    async (searchCriteria: GroupMatchCriteria) => {
      if (!isOnline) {
        // Try to get cached results
        const cacheKey = `group_search_${JSON.stringify(searchCriteria)}`;
        const cachedResults = await getCachedResponse(cacheKey);
        if (cachedResults) {
          setMatches(cachedResults.matches);
          setTotalFound(cachedResults.totalFound);
          setRecommendations(cachedResults.recommendations);
          return;
        } else {
          setError('No internet connection and no cached results available');
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/groups/discover', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify(searchCriteria),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const results = await response.json();

        setMatches(results.matches);
        setTotalFound(results.totalFound);
        setRecommendations(results.recommendations);

        // Cache results for offline use
        const cacheKey = `group_search_${JSON.stringify(searchCriteria)}`;
        await cacheResponse(cacheKey, results, 300000); // 5 minute cache
      } catch (err: any) {
        setError(err.message);
        console.error('Group discovery error:', err);
      } finally {
        setLoading(false);
      }
    },
    [isOnline, getCachedResponse, cacheResponse]
  );

  const handleRefresh = useCallback(async () => {
    if (criteria) {
      await searchGroups(criteria);
    }
  }, [criteria, searchGroups]);

  const handleGroupSelect = (groupId: string) => {
    hapticFeedback('light');
    if (onGroupSelect) {
      onGroupSelect(groupId);
    } else {
      router.push(`/groups/${groupId}`);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-blue-600 bg-blue-50';
    if (score >= 0.4) return 'text-amber-600 bg-amber-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getScoreStars = (score: number) => {
    const stars = Math.round(score * 5);
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i}>
        {i < stars ? (
          <StarIconSolid className="w-4 h-4 text-yellow-400" />
        ) : (
          <StarIcon className="w-4 h-4 text-gray-300" />
        )}
      </span>
    ));
  };

  const formatCompatibilityScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  // Initial search when criteria is provided
  useEffect(() => {
    if (criteria) {
      searchGroups(criteria);
    }
  }, [criteria, searchGroups]);

  if (!criteria) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Set Your Preferences
        </h3>
        <p className="text-gray-600 mb-4">
          Configure your search criteria to find the perfect carpool group
        </p>
        <button
          onClick={() => setShowFilters(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Set Preferences
        </button>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className={className}>
      <div className="space-y-6">
        {/* Header with Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Group Discovery
            </h2>
            {totalFound > 0 && (
              <p className="text-sm text-gray-600">
                Found {totalFound} matching groups
              </p>
            )}
          </div>

          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            {isMobile ? 'Filter' : 'Adjust Preferences'}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Searching for groups...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              <span className="font-medium text-red-800">Search Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={() => criteria && searchGroups(criteria)}
              className="mt-3 text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">
              💡 Recommendations
            </h3>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-blue-800 text-sm">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Group Matches */}
        {matches.length > 0 && (
          <div className="space-y-4">
            {matches.map(match => (
              <div
                key={match.groupId}
                onClick={() => handleGroupSelect(match.groupId)}
                className={`
                  bg-white border border-gray-200 rounded-lg p-4 cursor-pointer
                  transition-all duration-200 hover:shadow-md hover:border-blue-300
                  ${isMobile ? 'active:bg-gray-50' : 'hover:bg-gray-50'}
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {match.groupName}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Admin: {match.groupDetails.adminName}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`
                      px-3 py-1 rounded-full text-sm font-medium
                      ${getScoreColor(match.score)}
                    `}
                    >
                      {Math.round(match.score * 100)}% Match
                    </div>
                    <div className="flex gap-1">
                      {getScoreStars(match.score)}
                    </div>
                  </div>
                </div>

                {/* Key Insights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                    <span>{match.insights.detourMinutes} min detour</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <span>{match.insights.matchingTimeSlots} time matches</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <UserGroupIcon className="w-4 h-4 text-gray-400" />
                    <span>
                      {match.insights.currentMembers}/
                      {match.insights.maxCapacity} members
                    </span>
                  </div>

                  <div className="text-sm">
                    <span
                      className={`
                      px-2 py-1 rounded text-xs
                      ${
                        match.insights.schoolMatch
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    `}
                    >
                      {match.insights.schoolMatch
                        ? 'Same School'
                        : 'Different School'}
                    </span>
                  </div>
                </div>

                {/* Compatibility Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Location</div>
                    <div className="font-medium text-sm">
                      {formatCompatibilityScore(
                        match.compatibility.locationScore
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Schedule</div>
                    <div className="font-medium text-sm">
                      {formatCompatibilityScore(match.compatibility.timeScore)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Preferences</div>
                    <div className="font-medium text-sm">
                      {formatCompatibilityScore(
                        match.compatibility.preferenceScore
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Capacity</div>
                    <div className="font-medium text-sm">
                      {formatCompatibilityScore(
                        match.compatibility.capacityScore
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Social</div>
                    <div className="font-medium text-sm">
                      {formatCompatibilityScore(
                        match.compatibility.socialScore
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {match.groupDetails.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {match.groupDetails.description}
                  </p>
                )}

                {/* Action */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Age compatibility: {match.insights.ageCompatibility}
                  </div>

                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    View Details
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && matches.length === 0 && criteria && (
          <div className="text-center py-8">
            <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Matching Groups Found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your preferences or consider creating your own group
            </p>
            <button
              onClick={() => router.push('/groups/create')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Group
            </button>
          </div>
        )}

        {/* Offline Indicator */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-amber-800 text-sm text-center">
              📱 Offline mode: Showing cached results
            </p>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

export default EnhancedGroupDiscovery;
