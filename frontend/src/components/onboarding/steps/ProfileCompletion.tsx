'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ProfileCompletionProps {
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
}

interface ProfileData {
  phoneNumber: string;
  homeAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}

export default function ProfileCompletion({
  onNext,
  onPrevious,
  onComplete,
}: ProfileCompletionProps) {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<ProfileData>({
    phoneNumber: user?.phoneNumber || '',
    homeAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });

  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-populate from user data if available
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        phoneNumber: user.phoneNumber || prev.phoneNumber,
      }));
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Partial<ProfileData> = {};

    // Phone number validation
    if (!profileData.phoneNumber.trim()) {
      newErrors.phoneNumber =
        'Phone number is required for carpool coordination';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(profileData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    // Home address validation
    if (!profileData.homeAddress.trim()) {
      newErrors.homeAddress = 'Home address helps with pickup/dropoff planning';
    }

    // Emergency contact validation
    if (!profileData.emergencyContactName.trim()) {
      newErrors.emergencyContactName =
        'Emergency contact is required for safety';
    }

    if (!profileData.emergencyContactPhone.trim()) {
      newErrors.emergencyContactPhone = 'Emergency contact phone is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(profileData.emergencyContactPhone)) {
      newErrors.emergencyContactPhone = 'Please enter a valid phone number';
    }

    if (!profileData.emergencyContactRelation.trim()) {
      newErrors.emergencyContactRelation = 'Please specify the relationship';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // In production, this would call an API to update user profile
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = validateForm();

  return (
    <div className="space-y-6">
      {/* Success State */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mr-3" />
            <p className="text-green-800 font-medium">
              Profile updated successfully! 🎉
            </p>
          </div>
        </div>
      )}

      {/* Introduction */}
      <div className="text-center mb-6">
        <UserIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Complete Your Profile
        </h3>
        <p className="text-gray-600">
          Let's add some essential information to help with carpool coordination
          and safety.
        </p>
      </div>

      {/* Current Info Display */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">
          Your Current Information
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-blue-700">Name:</span>
            <span className="ml-2 font-medium">
              {user?.firstName} {user?.lastName}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Email:</span>
            <span className="ml-2 font-medium">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <PhoneIcon className="w-5 h-5 text-gray-600 mr-2" />
          <h4 className="text-lg font-medium text-gray-900">
            Contact Information
          </h4>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              value={profileData.phoneNumber}
              onChange={e => handleInputChange('phoneNumber', e.target.value)}
              placeholder="(555) 123-4567"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.phoneNumber
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Used for direct communication with other parents during carpools
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Home Address *
            </label>
            <input
              type="text"
              value={profileData.homeAddress}
              onChange={e => handleInputChange('homeAddress', e.target.value)}
              placeholder="123 Main Street, City, State 12345"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.homeAddress
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            {errors.homeAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.homeAddress}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Helps with efficient route planning and pickup coordination
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mr-2" />
          <h4 className="text-lg font-medium text-gray-900">
            Emergency Contact
          </h4>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-800">
            <strong>Important:</strong> This contact will be reached if you're
            unreachable during carpool times.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact Name *
            </label>
            <input
              type="text"
              value={profileData.emergencyContactName}
              onChange={e =>
                handleInputChange('emergencyContactName', e.target.value)
              }
              placeholder="John Smith"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.emergencyContactName
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            {errors.emergencyContactName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.emergencyContactName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Phone *
              </label>
              <input
                type="tel"
                value={profileData.emergencyContactPhone}
                onChange={e =>
                  handleInputChange('emergencyContactPhone', e.target.value)
                }
                placeholder="(555) 987-6543"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.emergencyContactPhone
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              {errors.emergencyContactPhone && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.emergencyContactPhone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship *
              </label>
              <select
                value={profileData.emergencyContactRelation}
                onChange={e =>
                  handleInputChange('emergencyContactRelation', e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.emergencyContactRelation
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              >
                <option value="">Select relationship</option>
                <option value="spouse">Spouse/Partner</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="relative">Other Relative</option>
                <option value="other">Other</option>
              </select>
              {errors.emergencyContactRelation && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.emergencyContactRelation}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">🔒 Privacy & Safety</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            • Your contact information is only shared with assigned carpool
            partners
          </li>
          <li>
            • Emergency contacts are used only in case of actual emergencies
          </li>
          <li>• You control your notification preferences in the next step</li>
          <li>
            • All data is securely stored and never shared with third parties
          </li>
        </ul>
      </div>

      {/* Action Button */}
      <div className="text-center">
        <button
          onClick={handleSave}
          disabled={!isFormValid || isSaving}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isFormValid && !isSaving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Saving Profile...
            </>
          ) : (
            'Save & Continue'
          )}
        </button>

        {!isFormValid && (
          <p className="mt-2 text-sm text-gray-500">
            Please fill in all required fields to continue
          </p>
        )}
      </div>
    </div>
  );
}
