'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import PhoneVerification from '@/components/PhoneVerification';
import AddressValidation from '@/components/AddressValidation';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface VerificationStatus {
  phoneVerified: boolean;
  addressVerified: boolean;
  emergencyContactVerified: boolean;
  allComplete: boolean;
}

export default function RegistrationCompletePage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<
    'phone' | 'address' | 'emergency' | 'complete'
  >('phone');
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>({
      phoneVerified: false,
      addressVerified: false,
      emergencyContactVerified: false,
      allComplete: false,
    });
  const [emergencyContact, setEmergencyContact] = useState({
    name: '',
    phone: '',
    relationship: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Redirect if not parent or already completed
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'parent')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Check verification status and set active step
  useEffect(() => {
    if (
      verificationStatus.phoneVerified &&
      !verificationStatus.addressVerified
    ) {
      setActiveStep('address');
    } else if (
      verificationStatus.phoneVerified &&
      verificationStatus.addressVerified &&
      !verificationStatus.emergencyContactVerified
    ) {
      setActiveStep('emergency');
    } else if (verificationStatus.allComplete) {
      setActiveStep('complete');
    }
  }, [verificationStatus]);

  const handlePhoneVerification = (verified: boolean) => {
    setVerificationStatus(prev => ({ ...prev, phoneVerified: verified }));
    if (verified) {
      setMessage({
        type: 'success',
        text: "Phone number verified! Now let's verify your address.",
      });
    }
  };

  const handleAddressValidation = (verified: boolean) => {
    setVerificationStatus(prev => ({ ...prev, addressVerified: verified }));
    if (verified) {
      setMessage({
        type: 'success',
        text: 'Address verified! Please add an emergency contact to complete registration.',
      });
    }
  };

  const saveEmergencyContact = async () => {
    if (
      !emergencyContact.name.trim() ||
      !emergencyContact.phone.trim() ||
      !emergencyContact.relationship.trim()
    ) {
      setMessage({
        type: 'error',
        text: 'Please fill in all emergency contact fields',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Mock emergency contact saving (in production, implement actual API)
      await new Promise(resolve => setTimeout(resolve, 1000));

      setVerificationStatus(prev => ({
        ...prev,
        emergencyContactVerified: true,
        allComplete: true,
      }));

      setMessage({
        type: 'success',
        text: 'Registration complete! You can now access carpool groups.',
      });

      // Redirect to group discovery after a brief delay
      setTimeout(() => {
        router.push('/parents/discover');
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error saving emergency contact',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (step: string) => {
    switch (step) {
      case 'phone':
        return verificationStatus.phoneVerified
          ? 'complete'
          : activeStep === 'phone'
            ? 'active'
            : 'pending';
      case 'address':
        return verificationStatus.addressVerified
          ? 'complete'
          : activeStep === 'address'
            ? 'active'
            : 'pending';
      case 'emergency':
        return verificationStatus.emergencyContactVerified
          ? 'complete'
          : activeStep === 'emergency'
            ? 'active'
            : 'pending';
      default:
        return 'pending';
    }
  };

  const getStepIcon = (step: string, status: string) => {
    const IconComponent =
      step === 'phone' ? PhoneIcon : step === 'address' ? MapPinIcon : UserIcon;

    if (status === 'complete') {
      return <CheckCircleIcon className="h-6 w-6 text-green-600" />;
    }

    return (
      <IconComponent
        className={`h-6 w-6 ${
          status === 'active' ? 'text-blue-600' : 'text-gray-400'
        }`}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'parent') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You must be a parent to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Complete Your Registration
          </h1>
          <p className="text-lg text-gray-600">
            Verify your information to access carpool groups safely
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            {[
              { key: 'phone', label: 'Phone Verification' },
              { key: 'address', label: 'Address Validation' },
              { key: 'emergency', label: 'Emergency Contact' },
            ].map((step, index) => {
              const status = getStepStatus(step.key);
              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      status === 'complete'
                        ? 'bg-green-100 border-green-500'
                        : status === 'active'
                          ? 'bg-blue-100 border-blue-500'
                          : 'bg-gray-100 border-gray-300'
                    }`}
                  >
                    {getStepIcon(step.key, status)}
                  </div>
                  <div className="ml-3">
                    <p
                      className={`text-sm font-medium ${
                        status === 'complete'
                          ? 'text-green-600'
                          : status === 'active'
                            ? 'text-blue-600'
                            : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      {status === 'complete'
                        ? 'Complete'
                        : status === 'active'
                          ? 'In Progress'
                          : 'Pending'}
                    </p>
                  </div>
                  {index < 2 && (
                    <div
                      className={`w-16 h-0.5 ml-6 ${
                        getStepStatus(
                          ['phone', 'address', 'emergency'][index + 1]
                        ) !== 'pending'
                          ? 'bg-green-400'
                          : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : message.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tesla Stem Service Area Notice */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <MapPinIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                🎯 Tesla Stem High School Service Area
              </h3>
              <p className="text-blue-800 mb-2">
                We currently support families within 25 miles of Tesla Stem High
                School in Redmond, WA.
              </p>
              <p className="text-sm text-blue-600">
                This ensures efficient carpool coordination and community safety
                for our initial launch.
              </p>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Phone Verification Step */}
          {(activeStep === 'phone' || verificationStatus.phoneVerified) && (
            <PhoneVerification
              onVerificationComplete={handlePhoneVerification}
              required={true}
            />
          )}

          {/* Address Validation Step */}
          {(activeStep === 'address' || verificationStatus.addressVerified) && (
            <AddressValidation
              onValidationComplete={handleAddressValidation}
              required={true}
            />
          )}

          {/* Emergency Contact Step */}
          {(activeStep === 'emergency' ||
            verificationStatus.emergencyContactVerified) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <UserIcon className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Emergency Contact <span className="text-red-500">*</span>
                </h3>
              </div>

              {verificationStatus.emergencyContactVerified ? (
                <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      Emergency contact verified
                    </p>
                    <p className="text-sm text-green-700">
                      {emergencyContact.name} - {emergencyContact.relationship}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4">
                    Please provide an emergency contact who can be reached if we
                    cannot contact you during carpool activities.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={emergencyContact.name}
                        onChange={e =>
                          setEmergencyContact(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="John Smith"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={emergencyContact.phone}
                        onChange={e =>
                          setEmergencyContact(prev => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="(555) 123-4567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship
                    </label>
                    <select
                      value={emergencyContact.relationship}
                      onChange={e =>
                        setEmergencyContact(prev => ({
                          ...prev,
                          relationship: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select relationship</option>
                      <option value="Spouse/Partner">Spouse/Partner</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Friend">Close Friend</option>
                      <option value="Neighbor">Neighbor</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <button
                    onClick={saveEmergencyContact}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Emergency Contact'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Completion Step */}
          {activeStep === 'complete' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                Registration Complete! 🎉
              </h2>
              <p className="text-green-700 mb-4">
                Your account is now fully verified and ready for carpool group
                access.
              </p>
              <p className="text-sm text-green-600 mb-6">
                You can now discover and join carpool groups in the Tesla Stem
                High School area.
              </p>
              <button
                onClick={() => router.push('/parents/discover')}
                className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Discover Carpool Groups →
              </button>
            </div>
          )}
        </div>

        {/* Safety Notice */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Safety & Verification Notice</p>
              <p>
                All verification steps are required to ensure the safety and
                security of our carpool community. Verified information helps us
                coordinate emergency communications and maintain trusted family
                networks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
