'use client';

import React, { useState } from 'react';
import {
  AcademicCapIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  HeartIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useMobile } from '@/services/mobile.service';

interface TeslaStemWelcomeStepProps {
  onNext: () => void;
  onSendNotification?: (type: 'welcome_email' | 'welcome_sms') => void;
}

/**
 * Tesla STEM Welcome Step Component
 * First onboarding step with Tesla STEM branding and beta program introduction
 * Integrates with Enhanced Notification System for welcome messages
 */
export default function TeslaStemWelcomeStep({
  onNext,
  onSendNotification,
}: TeslaStemWelcomeStepProps) {
  const [notificationSent, setNotificationSent] = useState(false);
  const { isMobile, hapticFeedback } = useMobile();

  const handleSendWelcomeNotification = () => {
    // Send both email and SMS welcome messages using Enhanced Notification System
    onSendNotification?.('welcome_email');
    onSendNotification?.('welcome_sms');
    setNotificationSent(true);
    
    if (isMobile) {
      hapticFeedback('light');
    }
  };

  const handleContinue = () => {
    if (isMobile) {
      hapticFeedback('medium');
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Tesla STEM Hero Section */}
      <div className="bg-gradient-to-br from-red-50 via-gray-50 to-blue-50 border border-red-200 rounded-2xl p-8 text-center">
        <div className="bg-gradient-to-r from-red-500 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <AcademicCapIcon className="h-10 w-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Tesla STEM Carpool!
        </h1>
        
        <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
          Join Tesla STEM High School's innovative carpool community. 
          Safe, smart, and seamlessly organized transportation for our amazing students and families.
        </p>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center mb-4">
            <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Tesla STEM Beta Program</h3>
          </div>
          
          <p className="text-gray-700 mb-4">
            You're part of our exclusive 8-week beta program! Help us perfect the future of school transportation 
            while enjoying priority support and early access to new features.
          </p>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-center mb-3">
              <HeartIcon className="h-5 w-5 text-red-500 mr-2" />
              <span className="font-semibold text-gray-900">Innovation • Science • Technology • Engineering • Math</span>
            </div>
            <p className="text-sm text-gray-700">
              Building tomorrow's transportation solutions, today.
            </p>
          </div>
        </div>
      </div>

      {/* Key Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-900 mb-4">What You Get:</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
              <span className="text-green-800 text-sm">Smart scheduling with fairness tracking</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
              <span className="text-green-800 text-sm">Mobile-first design for busy parents</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
              <span className="text-green-800 text-sm">Real-time coordination and updates</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
              <span className="text-green-800 text-sm">Tesla STEM community connection</span>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-4">Beta Program Benefits:</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              <span className="text-blue-800 text-sm">Priority customer support</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              <span className="text-blue-800 text-sm">Direct feedback to development team</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              <span className="text-blue-800 text-sm">Early access to new features</span>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              <span className="text-blue-800 text-sm">Shape the future of the platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start">
          <InformationCircleIcon className="h-6 w-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Tesla STEM Safety First</h3>
            <p className="text-yellow-800 text-sm">
              All families are verified Tesla STEM community members. Our platform includes emergency contacts, 
              real-time tracking, and direct communication with school administration when needed.
            </p>
          </div>
        </div>
      </div>

      {/* Welcome Notification */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Get Your Welcome Package</h3>
        <p className="text-gray-700 text-sm mb-4">
          Receive Tesla STEM-branded welcome materials and setup guides via email and text.
        </p>
        
        {!notificationSent ? (
          <button 
            onClick={handleSendWelcomeNotification}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all mb-4"
          >
            Send Tesla STEM Welcome Package
          </button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Welcome package sent!</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Check your email and phone for Tesla STEM carpool materials.
            </p>
          </div>
        )}
        
        <button 
          onClick={handleContinue}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Continue to Profile Setup
        </button>
      </div>
    </div>
  );
}
