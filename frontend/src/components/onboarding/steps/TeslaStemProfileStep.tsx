'use client';

import React, { useState } from 'react';
import {
  UserGroupIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useMobile } from '@/services/mobile.service';

interface TeslaStemProfileStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSendNotification?: (type: 'profile_guidance' | 'address_verification') => void;
}

/**
 * Tesla STEM Profile Setup Step Component
 * Guides users through Tesla STEM-specific profile requirements
 * Integrates with address validation and emergency contact systems
 */
export default function TeslaStemProfileStep({
  onNext,
  onPrevious,
  onSendNotification,
}: TeslaStemProfileStepProps) {
  const [profileSteps, setProfileSteps] = useState({
    address: false,
    phone: false,
    emergency: false,
    students: false,
  });
  
  const { isMobile, hapticFeedback } = useMobile();

  const handleStepComplete = (step: keyof typeof profileSteps) => {
    setProfileSteps(prev => ({ ...prev, [step]: true }));
    
    if (isMobile) {
      hapticFeedback('light');
    }
    
    // Send guidance notifications for key steps
    if (step === 'address' && onSendNotification) {
      onSendNotification('address_verification');
    }
  };

  const allStepsComplete = Object.values(profileSteps).every(Boolean);

  const handleContinue = () => {
    if (isMobile) {
      hapticFeedback('medium');
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="bg-gradient-to-r from-red-100 to-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserGroupIcon className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tesla STEM Family Profile</h2>
        <p className="text-gray-600">
          Complete your profile to join the Tesla STEM carpool community
        </p>
      </div>

      {/* Profile Steps */}
      <div className="space-y-4">
        {/* Address Verification */}
        <div className={`border rounded-xl p-6 transition-all ${
          profileSteps.address 
            ? 'border-green-300 bg-green-50' 
            : 'border-gray-200 bg-white hover:border-red-300'
        }`}>
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-full ${
              profileSteps.address ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <MapPinIcon className={`h-6 w-6 ${
                profileSteps.address ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Home Address Verification</h3>
                {profileSteps.address && (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                )}
              </div>
              
              <p className="text-gray-600 text-sm mb-4">
                Verify your address within Tesla STEM's 25-mile service area for group matching
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-800 text-sm font-medium">Tesla STEM Service Area</p>
                    <p className="text-yellow-700 text-xs">
                      Must be within 25 miles of Tesla STEM High School for safety and coordination
                    </p>
                  </div>
                </div>
              </div>
              
              {!profileSteps.address ? (
                <button 
                  onClick={() => handleStepComplete('address')}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Verify Tesla STEM Address
                </button>
              ) : (
                <div className="text-green-700 text-sm font-medium">
                  ✓ Address verified within Tesla STEM service area
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Phone Verification */}
        <div className={`border rounded-xl p-6 transition-all ${
          profileSteps.phone 
            ? 'border-green-300 bg-green-50' 
            : 'border-gray-200 bg-white hover:border-red-300'
        }`}>
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-full ${
              profileSteps.phone ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <PhoneIcon className={`h-6 w-6 ${
                profileSteps.phone ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Phone Number Verification</h3>
                {profileSteps.phone && (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                )}
              </div>
              
              <p className="text-gray-600 text-sm mb-4">
                SMS verification ensures reliable communication for Tesla STEM carpool coordination
              </p>
              
              {!profileSteps.phone ? (
                <button 
                  onClick={() => handleStepComplete('phone')}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Verify Phone Number
                </button>
              ) : (
                <div className="text-green-700 text-sm font-medium">
                  ✓ Phone verified for Tesla STEM communications
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className={`border rounded-xl p-6 transition-all ${
          profileSteps.emergency 
            ? 'border-green-300 bg-green-50' 
            : 'border-gray-200 bg-white hover:border-red-300'
        }`}>
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-full ${
              profileSteps.emergency ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <ShieldCheckIcon className={`h-6 w-6 ${
                profileSteps.emergency ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Emergency Contacts</h3>
                {profileSteps.emergency && (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                )}
              </div>
              
              <p className="text-gray-600 text-sm mb-4">
                Required backup contacts for Tesla STEM safety protocols
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm font-medium">Tesla STEM Safety First</p>
                <p className="text-red-700 text-xs">
                  Emergency contacts must be available during carpool hours (7:00 AM - 4:00 PM)
                </p>
              </div>
              
              {!profileSteps.emergency ? (
                <button 
                  onClick={() => handleStepComplete('emergency')}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Add Emergency Contacts
                </button>
              ) : (
                <div className="text-green-700 text-sm font-medium">
                  ✓ Emergency contacts verified
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Student Information */}
        <div className={`border rounded-xl p-6 transition-all ${
          profileSteps.students 
            ? 'border-green-300 bg-green-50' 
            : 'border-gray-200 bg-white hover:border-red-300'
        }`}>
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-full ${
              profileSteps.students ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <UserGroupIcon className={`h-6 w-6 ${
                profileSteps.students ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Tesla STEM Student Information</h3>
                {profileSteps.students && (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                )}
              </div>
              
              <p className="text-gray-600 text-sm mb-4">
                Add your Tesla STEM students for accurate carpool coordination
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-800 text-sm font-medium">Student Requirements</p>
                <ul className="text-blue-700 text-xs mt-1 space-y-1">
                  <li>• Current Tesla STEM enrollment verification</li>
                  <li>• Grade level and program track</li>
                  <li>• Special transportation needs (if any)</li>
                </ul>
              </div>
              
              {!profileSteps.students ? (
                <button 
                  onClick={() => handleStepComplete('students')}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Add Tesla STEM Students
                </button>
              ) : (
                <div className="text-green-700 text-sm font-medium">
                  ✓ Tesla STEM students added
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion Status */}
      {allStepsComplete && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
          <div className="text-center">
            <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 mb-2">
              Tesla STEM Profile Complete!
            </h3>
            <p className="text-green-800 mb-4">
              Your family is now verified and ready to join Tesla STEM carpool groups.
            </p>
            
            <button 
              onClick={handleContinue}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all"
            >
              Continue to Group Discovery
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Need Help?</h3>
        <p className="text-gray-700 text-sm mb-4">
          Tesla STEM beta program includes priority support for profile setup.
        </p>
        
        <button 
          onClick={() => onSendNotification?.('profile_guidance')}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
        >
          Send Setup Guide to My Phone
        </button>
      </div>
    </div>
  );
}
