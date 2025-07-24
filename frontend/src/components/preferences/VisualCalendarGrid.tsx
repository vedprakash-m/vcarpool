'use client';

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  routeType: 'school_dropoff' | 'school_pickup';
  description: string;
  maxPassengers: number;
}

interface CalendarGridProps {
  slots: TimeSlot[];
  preferences: {
    [slotId: string]: 'preferable' | 'less_preferable' | 'unavailable' | '';
  };
  onPreferenceChange: (slotId: string, level: string) => void;
  canEdit: boolean;
  constraints: {
    preferable: number;
    lessPreferable: number;
    unavailable: number;
  };
}

const PREFERENCE_LEVELS = [
  {
    value: '',
    label: 'No Preference',
    color: 'bg-gray-100 border-gray-200 text-gray-600',
    disabled: false,
  },
  {
    value: 'preferable',
    label: 'Prefer',
    color: 'bg-green-100 border-green-300 text-green-800',
    maxCount: 3,
  },
  {
    value: 'less_preferable',
    label: 'If Needed',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    maxCount: 2,
  },
  {
    value: 'unavailable',
    label: "Can't Drive",
    color: 'bg-red-100 border-red-300 text-red-800',
    maxCount: 2,
  },
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_PERIODS = [
  { label: 'Morning Drop-off', routeType: 'school_dropoff', icon: '🌅' },
  { label: 'Afternoon Pick-up', routeType: 'school_pickup', icon: '🌇' },
];

export default function VisualCalendarGrid({
  slots,
  preferences,
  onPreferenceChange,
  canEdit,
  constraints,
}: CalendarGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const getSlotByDayAndType = (dayOfWeek: number, routeType: string) => {
    return slots.find(
      slot => slot.dayOfWeek === dayOfWeek && slot.routeType === routeType
    );
  };

  const getPreferenceStyle = (slotId: string) => {
    const preference = preferences[slotId];
    const level = PREFERENCE_LEVELS.find(l => l.value === preference);
    return level
      ? level.color
      : PREFERENCE_LEVELS.length > 0
        ? PREFERENCE_LEVELS[0].color
        : '#gray-200';
  };

  const isPreferenceLimitReached = (level: string, currentSlotId: string) => {
    if (level === '' || !canEdit) return false;

    const currentPreference = preferences[currentSlotId];
    if (currentPreference === level) return false; // Allow deselecting current

    const levelConfig = PREFERENCE_LEVELS.find(l => l.value === level);
    if (!levelConfig?.maxCount) return false;

    const currentCount = Object.values(preferences).filter(
      p => p === level
    ).length;
    return currentCount >= levelConfig.maxCount;
  };

  const handleSlotClick = (slotId: string) => {
    if (!canEdit) return;
    setSelectedSlot(selectedSlot === slotId ? null : slotId);
  };

  const getSlotProgressionText = (preference: string) => {
    switch (preference) {
      case 'preferable':
        return 'High likelihood of assignment';
      case 'less_preferable':
        return 'May be assigned if needed';
      case 'unavailable':
        return 'Will not be assigned';
      default:
        return 'Available for any assignment';
    }
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <InformationCircleIcon className="w-4 h-4 mr-2" />
          Preference Levels
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {PREFERENCE_LEVELS.map(level => (
            <div
              key={level.value}
              className={`p-2 rounded border text-center ${level.color}`}
            >
              <div className="font-medium">{level.label}</div>
              {level.maxCount && (
                <div className="text-xs opacity-75">
                  Limit: {level.maxCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Constraint Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <CheckCircleIcon className="w-4 h-4 mr-2" />
          Your Current Selections
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div
              className={`text-lg font-bold ${
                constraints.preferable > 3 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {constraints.preferable}/3
            </div>
            <div className="text-gray-600">Preferred</div>
          </div>
          <div className="text-center">
            <div
              className={`text-lg font-bold ${
                constraints.lessPreferable > 2
                  ? 'text-red-600'
                  : 'text-yellow-600'
              }`}
            >
              {constraints.lessPreferable}/2
            </div>
            <div className="text-gray-600">If Needed</div>
          </div>
          <div className="text-center">
            <div
              className={`text-lg font-bold ${
                constraints.unavailable > 2 ? 'text-red-600' : 'text-red-600'
              }`}
            >
              {constraints.unavailable}/2
            </div>
            <div className="text-gray-600">Unavailable</div>
          </div>
        </div>

        {(constraints.preferable > 3 ||
          constraints.lessPreferable > 2 ||
          constraints.unavailable > 2) && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-800 text-sm">
              <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
              <span>
                You've exceeded the limits for some preferences. Please adjust
                before submitting.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ClockIcon className="w-5 h-5 mr-2" />
            Weekly Schedule
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Click on time slots to set your driving preferences
          </p>
        </div>

        <div className="p-4">
          {/* Time Period Headers */}
          {TIME_PERIODS.map(period => (
            <div key={period.routeType} className="mb-8 last:mb-0">
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-900 flex items-center mb-2">
                  <span className="text-lg mr-2">{period.icon}</span>
                  {period.label}
                </h4>
                <div className="h-px bg-gray-200"></div>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-5 gap-2">
                {DAY_NAMES.map((dayName, dayIndex) => {
                  const dayOfWeek = dayIndex + 1; // Monday = 1
                  const slot = getSlotByDayAndType(dayOfWeek, period.routeType);

                  if (!slot)
                    return (
                      <div key={dayIndex} className="text-center p-2"></div>
                    );

                  const isSelected = selectedSlot === slot.id;
                  const preference = preferences[slot.id] || '';
                  const isDisabled = !canEdit;

                  return (
                    <div key={slot.id} className="relative">
                      {/* Day Header */}
                      <div className="text-xs font-medium text-gray-500 text-center mb-2">
                        {dayName}
                      </div>

                      {/* Time Slot */}
                      <div
                        className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                        } ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:shadow-md'
                        } ${getPreferenceStyle(slot.id)}`}
                        onClick={() => handleSlotClick(slot.id)}
                        onMouseEnter={() => setShowTooltip(slot.id)}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <div className="text-center">
                          <div className="text-sm font-medium">
                            {slot.startTime}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {slot.endTime}
                          </div>

                          {preference && (
                            <div className="mt-2">
                              <div className="text-xs font-medium">
                                {
                                  PREFERENCE_LEVELS.find(
                                    l => l.value === preference
                                  )?.label
                                }
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tooltip */}
                        {showTooltip === slot.id && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
                            {slot.description}
                            <div className="text-xs opacity-75 mt-1">
                              {getSlotProgressionText(preference)}
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selection Panel for Selected Slot */}
      {selectedSlot && canEdit && (
        <div className="bg-white rounded-lg border border-blue-200 shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">
              Set Preference
            </h4>
            <button
              onClick={() => setSelectedSlot(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {(() => {
            const slot = slots.find(s => s.id === selectedSlot);
            if (!slot) return null;

            return (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">{slot.description}</span>
                  <br />
                  {slot.startTime} - {slot.endTime} • Max {slot.maxPassengers}{' '}
                  passengers
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PREFERENCE_LEVELS.map(level => {
                    const isCurrentLevel =
                      preferences[selectedSlot] === level.value;
                    const isLimitReached = isPreferenceLimitReached(
                      level.value,
                      selectedSlot
                    );
                    const isDisabled = isLimitReached && !isCurrentLevel;

                    return (
                      <button
                        key={level.value}
                        onClick={() =>
                          onPreferenceChange(selectedSlot, level.value)
                        }
                        disabled={isDisabled}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          isCurrentLevel
                            ? level.color + ' ring-2 ring-blue-500'
                            : isDisabled
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                              : level.color + ' hover:shadow-md'
                        }`}
                      >
                        <div>{level.label}</div>
                        {level.maxCount && (
                          <div className="text-xs opacity-75 mt-1">
                            Limit: {level.maxCount}
                          </div>
                        )}
                        {isLimitReached && !isCurrentLevel && (
                          <div className="text-xs text-red-600 mt-1">
                            Limit reached
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          💡 How to Use
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click on any time slot to set your preference level</li>
          <li>
            • Green = Prefer to drive, Yellow = Available if needed, Red =
            Cannot drive
          </li>
          <li>
            • You can select up to 3 preferred, 2 "if needed", and 2 unavailable
            slots
          </li>
          <li>
            • Hover over slots to see assignment likelihood based on your
            preference
          </li>
        </ul>
      </div>
    </div>
  );
}
