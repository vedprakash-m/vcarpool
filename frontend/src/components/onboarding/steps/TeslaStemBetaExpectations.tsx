/**
 * Tesla STEM Beta Expectations Step
 * 
 * Sets clear expectations for Tesla STEM families participating in the beta program,
 * including responsibilities, benefits, timeline, and feedback mechanisms.
 * 
 * Features:
 * - Tesla STEM-specific beta program details
 * - Clear timeline and expectations
 * - Feedback collection mechanisms
 * - Beta program agreement
 * - Mobile-optimized interactions
 */

import React, { useState, useCallback } from 'react';
import { 
  StarIcon, 
  ClockIcon, 
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { useMobile } from '@/services/mobile.service';
import { useTeslaStemOnboarding } from '@/contexts/TeslaStemOnboardingContext';

interface TeslaStemBetaExpectationsProps {
  onNext: () => void;
  onPrevious: () => void;
  onSendNotification?: (template: string) => void;
}

interface BetaExpectation {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  type: 'benefit' | 'responsibility' | 'timeline' | 'support';
}

const TeslaStemBetaExpectations: React.FC<TeslaStemBetaExpectationsProps> = ({
  onNext,
  onPrevious,
  onSendNotification,
}) => {
  const { hapticFeedback } = useMobile();
  const { updateUserProgress } = useTeslaStemOnboarding();
  
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [feedbackOptIn, setFeedbackOptIn] = useState(true);

  const betaExpectations: BetaExpectation[] = [
    {
      id: 'beta-benefits',
      title: 'Your Beta Program Benefits',
      description: 'What you get as a Tesla STEM beta participant',
      icon: StarIcon,
      type: 'benefit'
    },
    {
      id: 'responsibilities',
      title: 'Your Responsibilities',
      description: 'What we expect from beta participants',
      icon: CheckCircleIcon,
      type: 'responsibility'
    },
    {
      id: 'timeline',
      title: 'Beta Program Timeline',
      description: '8-week journey to perfect Tesla STEM carpooling',
      icon: ClockIcon,
      type: 'timeline'
    },
    {
      id: 'support',
      title: 'Support & Feedback',
      description: 'How we\'ll support you and collect your input',
      icon: HeartIcon,
      type: 'support'
    }
  ];

  const handleAgreementChange = useCallback((checked: boolean) => {
    hapticFeedback?.('light');
    setAgreementChecked(checked);
  }, [hapticFeedback]);

  const handleFeedbackOptInChange = useCallback((checked: boolean) => {
    hapticFeedback?.('light');
    setFeedbackOptIn(checked);
  }, [hapticFeedback]);

  const handleContinue = useCallback(() => {
    if (!agreementChecked) {
      if (onSendNotification) {
        onSendNotification('tesla_stem_agreement_required');
      }
      return;
    }

    // Update progress and preferences
    updateUserProgress({ 
      betaExpectationsReviewed: true
    });
    
    if (onSendNotification) {
      onSendNotification('tesla_stem_beta_welcome');
    }
    
    onNext();
  }, [agreementChecked, feedbackOptIn, updateUserProgress, onSendNotification, onNext]);

  const renderBenefits = () => (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
      <div className="flex items-center mb-4">
        <div className="bg-green-100 p-3 rounded-full mr-4">
          <StarIcon className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-green-900">Beta Program Benefits</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-start text-sm">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
          <span>Priority support from Tesla STEM families</span>
        </div>
        <div className="flex items-start text-sm">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
          <span>Advanced scheduling up to 4 weeks ahead</span>
        </div>
        <div className="flex items-start text-sm">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
          <span>Direct feedback line to development team</span>
        </div>
        <div className="flex items-start text-sm">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
          <span>Early access to new features</span>
        </div>
        <div className="flex items-start text-sm">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
          <span>Tesla STEM event coordination</span>
        </div>
        <div className="flex items-start text-sm">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
          <span>Recognition as founding Tesla STEM member</span>
        </div>
      </div>
    </div>
  );

  const renderResponsibilities = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
      <div className="flex items-center mb-4">
        <div className="bg-blue-100 p-3 rounded-full mr-4">
          <CheckCircleIcon className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-blue-900">Your Responsibilities</h3>
      </div>
      
      <div className="space-y-3">
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-start">
            <div className="bg-blue-100 p-2 rounded-full mr-3 mt-0.5">
              <span className="text-blue-600 font-bold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Active Participation</h4>
              <p className="text-gray-600 text-sm">Participate regularly in carpools and follow the schedule</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-start">
            <div className="bg-blue-100 p-2 rounded-full mr-3 mt-0.5">
              <span className="text-blue-600 font-bold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Constructive Feedback</h4>
              <p className="text-gray-600 text-sm">Share honest feedback about your experience</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-start">
            <div className="bg-blue-100 p-2 rounded-full mr-3 mt-0.5">
              <span className="text-blue-600 font-bold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Tesla STEM Community</h4>
              <p className="text-gray-600 text-sm">Support fellow Tesla STEM families in the program</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
      <div className="flex items-center mb-4">
        <div className="bg-purple-100 p-3 rounded-full mr-4">
          <ClockIcon className="h-6 w-6 text-purple-600" />
        </div>
        <h3 className="text-lg font-bold text-purple-900">8-Week Beta Timeline</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex">
          <div className="flex flex-col items-center mr-4">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <div className="w-0.5 h-12 bg-purple-300"></div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Weeks 1-2: Onboarding</h4>
            <p className="text-gray-600 text-sm">Complete setup, join groups, first rides</p>
          </div>
        </div>
        
        <div className="flex">
          <div className="flex flex-col items-center mr-4">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <div className="w-0.5 h-12 bg-purple-300"></div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Weeks 3-5: Active Use</h4>
            <p className="text-gray-600 text-sm">Regular carpooling, feedback collection</p>
          </div>
        </div>
        
        <div className="flex">
          <div className="flex flex-col items-center mr-4">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <div className="w-0.5 h-12 bg-purple-300"></div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Weeks 6-7: Refinement</h4>
            <p className="text-gray-600 text-sm">Feature improvements, advanced testing</p>
          </div>
        </div>
        
        <div className="flex">
          <div className="flex flex-col items-center mr-4">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Week 8: Launch Ready</h4>
            <p className="text-gray-600 text-sm">Final feedback, transition to full launch</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSupport = () => (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <div className="flex items-center mb-4">
        <div className="bg-red-100 p-3 rounded-full mr-4">
          <HeartIcon className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-red-900">Support & Communication</h3>
      </div>
      
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center mb-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h4 className="font-semibold text-gray-900">Weekly Check-ins</h4>
          </div>
          <p className="text-gray-600 text-sm">Brief surveys about your experience and suggestions</p>
        </div>
        
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center mb-2">
            <InformationCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <h4 className="font-semibold text-gray-900">Direct Support Line</h4>
          </div>
          <p className="text-gray-600 text-sm">Priority support for any issues or questions</p>
        </div>
        
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center mb-2">
            <StarIcon className="h-5 w-5 text-purple-600 mr-2" />
            <h4 className="font-semibold text-gray-900">Tesla STEM Community</h4>
          </div>
          <p className="text-gray-600 text-sm">Connect with other beta families in dedicated channels</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="bg-gradient-to-r from-red-100 to-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <StarIcon className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tesla STEM Beta Program</h2>
        <p className="text-gray-600">Let's set clear expectations for your beta experience</p>
      </div>

      {/* Beta Expectations Content */}
      <div className="space-y-6">
        {renderBenefits()}
        {renderResponsibilities()}
        {renderTimeline()}
        {renderSupport()}
      </div>

      {/* Important Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Important Beta Notice</h3>
            <p className="text-yellow-800 text-sm">
              This is a beta program for Tesla STEM families. While we strive for reliability, 
              you may encounter occasional issues. Your patience and feedback help us create 
              the best possible experience for the Tesla STEM community.
            </p>
          </div>
        </div>
      </div>

      {/* Agreement and Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Your Preferences</h3>
        
        <div className="space-y-4">
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={agreementChecked}
              onChange={(e) => handleAgreementChange(e.target.checked)}
              className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <div className="ml-3">
              <span className="text-gray-900 font-medium">
                I understand and agree to participate in the Tesla STEM Beta Program *
              </span>
              <p className="text-gray-600 text-sm mt-1">
                I understand the expectations, timeline, and my responsibilities as a beta participant
              </p>
            </div>
          </label>
          
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={feedbackOptIn}
              onChange={(e) => handleFeedbackOptInChange(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="ml-3">
              <span className="text-gray-900 font-medium">
                Send me feedback surveys and beta updates
              </span>
              <p className="text-gray-600 text-sm mt-1">
                Receive weekly check-ins and important beta program updates
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevious}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="h-4 w-4 mr-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z"
              clipRule="evenodd"
            />
          </svg>
          Previous
        </button>

        <button
          onClick={handleContinue}
          disabled={!agreementChecked}
          className={`flex items-center px-6 py-2 font-semibold rounded-lg transition-all ${
            agreementChecked
              ? 'bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Join Tesla STEM Beta
          <svg
            className="h-4 w-4 ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TeslaStemBetaExpectations;
