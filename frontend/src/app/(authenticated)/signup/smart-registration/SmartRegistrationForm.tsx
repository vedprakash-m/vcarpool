'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AddressValidation from '@/components/AddressValidation';
import {
  Users,
  User,
  Mail,
  Phone,
  MapPin,
  Car,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  MapPinIcon,
  GraduationCap,
} from 'lucide-react';

interface SmartChild {
  name: string;
  birthDate: string; // Used for automatic grade inference
  grade?: string; // Optional, inferred from age
  school?: string; // Optional, auto-detected from address
  medicalNotes?: string;
}

interface SmartRegistrationData {
  primaryParent: {
    name: string;
    email: string;
    phone: string;
  };
  secondaryParent?: {
    name: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  children: SmartChild[];
  // Smart detection results
  detectedSchool?: {
    name: string;
    address: string;
    distance: number;
    confidence: number;
  };
  canDrive: boolean;
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    seats: number;
  };
}

interface SchoolDetectionResult {
  school: {
    name: string;
    address: string;
    type: string;
    grades: string[];
  };
  distance: number;
  confidence: number;
}

export default function SmartRegistrationForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);
  const [schoolDetectionResult, setSchoolDetectionResult] =
    useState<SchoolDetectionResult | null>(null);
  const [showManualOverride, setShowManualOverride] = useState(false);

  const [formData, setFormData] = useState<SmartRegistrationData>({
    primaryParent: {
      name: '',
      email: '',
      phone: '',
    },
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    children: [
      {
        name: '',
        birthDate: '',
      },
    ],
    canDrive: false,
  });

  // Smart school detection when address changes
  useEffect(() => {
    if (
      formData.address.street &&
      formData.address.city &&
      formData.address.state &&
      formData.address.zipCode
    ) {
      detectSchoolFromAddress();
    }
  }, [formData.address]);

  const detectSchoolFromAddress = async () => {
    setIsLoading(true);
    try {
      // Mock implementation - replace with actual API call
      const fullAddress = `${formData.address.street}, ${formData.address.city}, ${formData.address.state} ${formData.address.zipCode}`;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock school detection result
      const mockResult: SchoolDetectionResult = {
        school: {
          name: 'Lincoln Elementary School',
          address: '123 Oak Street, Springfield, IL 62701',
          type: 'elementary',
          grades: ['K', '1', '2', '3', '4', '5'],
        },
        distance: 2.3,
        confidence: 0.89,
      };

      setSchoolDetectionResult(mockResult);

      // Auto-update form data with detected school
      setFormData(prev => ({
        ...prev,
        detectedSchool: {
          name: mockResult.school.name,
          address: mockResult.school.address,
          distance: mockResult.distance,
          confidence: mockResult.confidence,
        },
        children: prev.children.map(child => ({
          ...child,
          school: child.school || mockResult.school.name,
        })),
      }));
    } catch (error) {
      console.error('School detection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Smart grade inference from birth date
  const inferGradeFromAge = (birthDate: string): string => {
    if (!birthDate) return '';

    const birth = new Date(birthDate);
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear();
    const hasHadBirthdayThisYear =
      now.getMonth() > birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());

    const actualAge = hasHadBirthdayThisYear ? age : age - 1;

    // Standard grade mapping (can be customized)
    const gradeMap: { [key: number]: string } = {
      5: 'K',
      6: '1',
      7: '2',
      8: '3',
      9: '4',
      10: '5',
      11: '6',
      12: '7',
      13: '8',
      14: '9',
      15: '10',
      16: '11',
      17: '12',
    };

    return gradeMap[actualAge] || '';
  };

  const handleChildChange = (
    index: number,
    field: keyof SmartChild,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) => {
        if (i === index) {
          const updatedChild = { ...child, [field]: value };

          // Auto-infer grade when birth date changes
          if (field === 'birthDate') {
            updatedChild.grade = inferGradeFromAge(value);
          }

          return updatedChild;
        }
        return child;
      }),
    }));
  };

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [
        ...prev.children,
        {
          name: '',
          birthDate: '',
          school: schoolDetectionResult?.school.name || '',
        },
      ],
    }));
  };

  const removeChild = (index: number) => {
    if (formData.children.length > 1) {
      setFormData(prev => ({
        ...prev,
        children: prev.children.filter((_, i) => i !== index),
      }));
    }
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Mock submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Smart registration data:', formData);
      router.push('/parents/registration-complete');
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Users className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Smart Family Registration
          </h1>
          <p className="text-gray-600 mt-2">
            We'll automatically detect your school and infer grades - just
            provide the essentials!
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center ${
                currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  currentStep >= 1
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                1
              </div>
              <span className="ml-2 text-sm font-medium">Family & Address</span>
            </div>
            <div
              className={`flex items-center ${
                currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  currentStep >= 2
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                2
              </div>
              <span className="ml-2 text-sm font-medium">Children</span>
            </div>
            <div
              className={`flex items-center ${
                currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  currentStep >= 3
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                3
              </div>
              <span className="ml-2 text-sm font-medium">Review</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8">
          {/* Step 1: Family & Address */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Family Information
              </h2>

              {/* Primary Parent */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.primaryParent.name}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          primaryParent: {
                            ...prev.primaryParent,
                            name: e.target.value,
                          },
                        }))
                      }
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.primaryParent.email}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          primaryParent: {
                            ...prev.primaryParent,
                            email: e.target.value,
                          },
                        }))
                      }
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="john.smith@email.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.primaryParent.phone}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        primaryParent: {
                          ...prev.primaryParent,
                          phone: e.target.value,
                        },
                      }))
                    }
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Home Address
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              street: e.target.value,
                            },
                          }))
                        }
                        className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="123 Main Street"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            address: { ...prev.address, city: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Springfield"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            address: { ...prev.address, state: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="IL"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={formData.address.zipCode}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              zipCode: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="62701"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Validation Component */}
              <AddressValidation
                onValidationComplete={isValid => setAddressValidated(isValid)}
                required={true}
              />

              {/* School Detection Result */}
              {isLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-blue-800">
                      Detecting nearby schools...
                    </span>
                  </div>
                </div>
              )}

              {schoolDetectionResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-green-900 font-medium">
                        School Automatically Detected!
                      </h4>
                      <p className="text-green-800 mt-1">
                        <strong>{schoolDetectionResult.school.name}</strong> -{' '}
                        {schoolDetectionResult.distance} miles away
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {schoolDetectionResult.school.address}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Confidence:{' '}
                        {Math.round(schoolDetectionResult.confidence * 100)}%
                      </p>
                      <button
                        onClick={() =>
                          setShowManualOverride(!showManualOverride)
                        }
                        className="text-sm text-green-700 underline mt-2"
                      >
                        Need to change? Click here
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Can Drive */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.canDrive}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        canDrive: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    I can drive for carpool groups
                  </span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={nextStep}
                  disabled={
                    !formData.primaryParent.name ||
                    !formData.primaryParent.email ||
                    !formData.address.street ||
                    !addressValidated
                  }
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Next: Add Children
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Children */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Children Information
                </h2>
                <button
                  onClick={addChild}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Child
                </button>
              </div>

              <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                💡 <strong>Smart Feature:</strong> We'll automatically calculate
                your child's grade based on their birth date. You can adjust it
                if needed.
              </p>

              {formData.children.map((child, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">
                      Child {index + 1}
                    </h3>
                    {formData.children.length > 1 && (
                      <button
                        onClick={() => removeChild(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Child's Name *
                      </label>
                      <input
                        type="text"
                        value={child.name}
                        onChange={e =>
                          handleChildChange(index, 'name', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Emma Smith"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Birth Date *
                      </label>
                      <input
                        type="date"
                        value={child.birthDate}
                        onChange={e =>
                          handleChildChange(index, 'birthDate', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Auto-inferred grade display */}
                  {child.grade && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="h-5 w-5 text-green-600" />
                        <span className="text-green-800 text-sm">
                          <strong>Inferred Grade:</strong>{' '}
                          {child.grade === 'K'
                            ? 'Kindergarten'
                            : `${child.grade}${
                                child.grade === '1'
                                  ? 'st'
                                  : child.grade === '2'
                                    ? 'nd'
                                    : child.grade === '3'
                                      ? 'rd'
                                      : 'th'
                              } Grade`}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Based on birth date. You can manually adjust this if
                        needed.
                      </p>
                    </div>
                  )}

                  {/* Auto-detected school display */}
                  {child.school && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="h-5 w-5 text-blue-600" />
                        <span className="text-blue-800 text-sm">
                          <strong>Detected School:</strong> {child.school}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Based on your home address. You can change this if
                        needed.
                      </p>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-between">
                <button
                  onClick={prevStep}
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={formData.children.some(
                    child => !child.name || !child.birthDate
                  )}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Review Registration
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Review Your Registration
              </h2>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-green-900 font-medium">
                      Smart Registration Complete!
                    </h3>
                    <p className="text-green-800 text-sm mt-1">
                      We've automatically detected your school and inferred
                      grades - much faster than traditional forms!
                    </p>
                  </div>
                </div>
              </div>

              {/* Registration Summary */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Family Contact</h4>
                  <p className="text-gray-600">{formData.primaryParent.name}</p>
                  <p className="text-gray-600">
                    {formData.primaryParent.email}
                  </p>
                  <p className="text-gray-600">
                    {formData.primaryParent.phone}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Address</h4>
                  <p className="text-gray-600">
                    {formData.address.street}
                    <br />
                    {formData.address.city}, {formData.address.state}{' '}
                    {formData.address.zipCode}
                  </p>
                </div>

                {schoolDetectionResult && (
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Detected School
                    </h4>
                    <p className="text-gray-600">
                      {schoolDetectionResult.school.name}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {schoolDetectionResult.distance} miles from home
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900">
                    Children ({formData.children.length})
                  </h4>
                  {formData.children.map((child, index) => (
                    <div key={index} className="text-gray-600 ml-4">
                      <p>
                        {child.name} - Grade {child.grade} at {child.school}
                      </p>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Driving</h4>
                  <p className="text-gray-600">
                    {formData.canDrive
                      ? 'Available to drive'
                      : 'Not available to drive'}
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={prevStep}
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg font-medium"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <CheckCircle className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
