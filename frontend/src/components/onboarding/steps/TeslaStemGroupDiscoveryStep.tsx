/**
 * Tesla STEM Group Discovery Step
 * 
 * Helps Tesla STEM families discover and join appropriate carpool groups
 * based on their location, schedule, and student needs.
 * 
 * Features:
 * - Tesla STEM-specific group matching
 * - Geographic proximity analysis (25-mile radius)
 * - Grade-level and program track alignment
 * - Beta program priority matching
 */

import React, { useState, useCallback } from 'react';
import { MapPinIcon, UserGroupIcon, ClockIcon, StarIcon } from '@heroicons/react/24/outline';
import { useMobile } from '@/services/mobile.service';
import { useTeslaStemOnboarding } from '@/contexts/TeslaStemOnboardingContext';

interface TeslaStemGroupDiscoveryStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSendNotification?: (template: string) => void;
}

interface TeslaStemGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  maxMembers: number;
  distance: number; // miles from Tesla STEM
  schedule: {
    dropoffTime: string;
    pickupTime: string;
    days: string[];
  };
  gradeRange: string;
  programTracks: string[];
  isBetaGroup: boolean;
  safetyRating: number;
  adminName: string;
}

const TeslaStemGroupDiscoveryStep: React.FC<TeslaStemGroupDiscoveryStepProps> = ({
  onNext,
  onPrevious,
  onSendNotification,
}) => {
  const { hapticFeedback } = useMobile();
  const { updateUserProgress } = useTeslaStemOnboarding();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(15);

  // Mock Tesla STEM groups data
  const teslaStemGroups: TeslaStemGroup[] = [
    {
      id: 'tesla-stem-innovation-north',
      name: 'Tesla STEM Innovation North',
      description: 'North Seattle families focused on STEM excellence',
      memberCount: 8,
      maxMembers: 12,
      distance: 3.2,
      schedule: {
        dropoffTime: '7:45 AM',
        pickupTime: '3:30 PM',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      },
      gradeRange: '9-12',
      programTracks: ['Engineering', 'Computer Science', 'Robotics'],
      isBetaGroup: true,
      safetyRating: 4.9,
      adminName: 'Dr. Jennifer Martinez',
    },
    {
      id: 'tesla-stem-tech-pioneers',
      name: 'Tesla STEM Tech Pioneers',
      description: 'Technology-focused families building the future',
      memberCount: 6,
      maxMembers: 10,
      distance: 5.7,
      schedule: {
        dropoffTime: '8:00 AM',
        pickupTime: '3:45 PM',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      },
      gradeRange: '10-12',
      programTracks: ['Computer Science', 'AI/ML', 'Cybersecurity'],
      isBetaGroup: true,
      safetyRating: 4.8,
      adminName: 'Prof. Michael Chen',
    },
    {
      id: 'tesla-stem-green-energy',
      name: 'Tesla STEM Green Energy Collective',
      description: 'Sustainable transportation for sustainable education',
      memberCount: 7,
      maxMembers: 10,
      distance: 8.1,
      schedule: {
        dropoffTime: '7:30 AM',
        pickupTime: '4:00 PM',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      },
      gradeRange: '9-11',
      programTracks: ['Environmental Science', 'Engineering', 'Math'],
      isBetaGroup: true,
      safetyRating: 4.7,
      adminName: 'Dr. Sarah Thompson',
    },
  ];

  const handleGroupSelection = useCallback(async (groupId: string) => {
    hapticFeedback('medium');
    setSelectedGroupId(groupId);
    
    // Send notification about group interest
    onSendNotification?.('tesla_stem_group_interest');
    
    // Update progress
    await updateUserProgress({
      groupDiscoveryCompleted: true,
    });
  }, [hapticFeedback, onSendNotification, updateUserProgress]);

  const handleContinue = useCallback(async () => {
    hapticFeedback('light');
    
    if (selectedGroupId) {
      onSendNotification?.('tesla_stem_group_selected');
    }
    
    onNext();
  }, [hapticFeedback, selectedGroupId, onSendNotification, onNext]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="bg-gradient-to-r from-blue-100 to-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserGroupIcon className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Discover Your Tesla STEM Community
        </h2>
        <p className="text-gray-600">
          Join a carpool group that matches your family's schedule and your student's STEM interests
        </p>
      </div>

      {/* Search Radius Selector */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <MapPinIcon className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="font-semibold text-blue-900">Search Radius</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">Distance from Tesla STEM: {searchRadius} miles</span>
            <span className="text-xs text-blue-700">Max: 25 miles</span>
          </div>
          <input
            type="range"
            min="5"
            max="25"
            value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            className="w-full h-2 bg-blue-200 rounded-lg appearance-none slider"
          />
        </div>
      </div>

      {/* Available Groups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Available Tesla STEM Groups</h3>
          <span className="text-sm text-gray-600">
            {teslaStemGroups.filter(g => g.distance <= searchRadius).length} groups found
          </span>
        </div>

        {teslaStemGroups
          .filter(group => group.distance <= searchRadius)
          .map((group) => (
            <div
              key={group.id}
              className={`border rounded-xl p-6 transition-all cursor-pointer ${
                selectedGroupId === group.id
                  ? 'border-red-300 bg-red-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-red-200 hover:shadow-sm'
              }`}
              onClick={() => handleGroupSelection(group.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="font-semibold text-gray-900 mr-3">{group.name}</h4>
                    {group.isBetaGroup && (
                      <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                        Beta Group
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{group.description}</p>
                  
                  {/* Group Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Members:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {group.memberCount}/{group.maxMembers}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Distance:</span>
                      <span className="ml-1 font-medium text-gray-900">{group.distance} mi</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Grades:</span>
                      <span className="ml-1 font-medium text-gray-900">{group.gradeRange}</span>
                    </div>
                    <div className="flex items-center">
                      <StarIcon className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="font-medium text-gray-900">{group.safetyRating}</span>
                    </div>
                  </div>
                </div>
                
                {selectedGroupId === group.id && (
                  <div className="ml-4">
                    <div className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">✓</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule Information */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-2">
                  <ClockIcon className="h-4 w-4 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-900">Schedule</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Drop-off:</span>
                    <span className="ml-1 font-medium">{group.schedule.dropoffTime}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Pick-up:</span>
                    <span className="ml-1 font-medium">{group.schedule.pickupTime}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Days:</span>
                    <span className="ml-1 font-medium">{group.schedule.days.join(', ')}</span>
                  </div>
                </div>
              </div>

              {/* Program Tracks */}
              <div className="mb-4">
                <span className="text-sm text-gray-600 mb-2 block">STEM Program Tracks:</span>
                <div className="flex flex-wrap gap-2">
                  {group.programTracks.map((track) => (
                    <span
                      key={track}
                      className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full"
                    >
                      {track}
                    </span>
                  ))}
                </div>
              </div>

              {/* Group Admin */}
              <div className="text-sm text-gray-600">
                <span>Group Admin: </span>
                <span className="font-medium text-gray-900">{group.adminName}</span>
              </div>
            </div>
          ))}
      </div>

      {/* Information Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          </svg>
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">Beta Program Benefits</h4>
            <p className="text-yellow-800 text-sm">
              As a Tesla STEM beta family, you get priority placement in groups and direct input on 
              features that will shape the future of school transportation.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onPrevious}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
            <path
              clipRule="evenodd"
              d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z"
              fillRule="evenodd"
            />
          </svg>
          Previous
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleContinue}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedGroupId}
            className="flex items-center px-6 py-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all"
          >
            {selectedGroupId ? 'Join Group' : 'Continue'}
            <svg className="h-4 w-4 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path
                clipRule="evenodd"
                d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
                fillRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeslaStemGroupDiscoveryStep;
