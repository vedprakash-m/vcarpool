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
} from 'lucide-react';

// ... (Keep all the interfaces: Child, FamilyRegistrationData)

interface Child {
  name: string;
  age: number;
  school: string;
  grade: string;
  medicalNotes: string;
}

interface FamilyRegistrationData {
  primaryParent: {
    name: string;
    email: string;
    phone: string;
    canDrive: boolean;
  };
  secondaryParent: {
    name: string;
    email: string;
    phone: string;
    canDrive: boolean;
  } | null;
  familyStructure: 'single' | 'dual';
  children: Child[];
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  vehicles: {
    make: string;
    model: string;
    year: number;
    capacity: number;
    licensePlate: string;
  }[];
  preferences: {
    availableDays: string[];
    timeSlots: string[];
    maxDistance: number;
    emergencyContact: string;
    emergencyPhone: string;
  };
}

// Add new interface for smart features
interface SmartDetectionResult {
  school: {
    name: string;
    address: string;
    type: string;
    grades: string[];
  };
  distance: number;
  confidence: number;
}

export default function FamilyRegistrationForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FamilyRegistrationData>({
    primaryParent: {
      name: '',
      email: '',
      phone: '',
      canDrive: true,
    },
    secondaryParent: null,
    familyStructure: 'single',
    children: [{ name: '', age: 0, school: '', grade: '', medicalNotes: '' }],
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    vehicles: [
      { make: '', model: '', year: 2020, capacity: 4, licensePlate: '' },
    ],
    preferences: {
      availableDays: [],
      timeSlots: [],
      maxDistance: 10,
      emergencyContact: '',
      emergencyPhone: '',
    },
  });

  const [schoolDetectionResult, setSchoolDetectionResult] =
    useState<SmartDetectionResult | null>(null);
  const [isDetectingSchool, setIsDetectingSchool] = useState(false);
  const [showSmartFeatures, setShowSmartFeatures] = useState(true);
  const [addressValidated, setAddressValidated] = useState(false);

  // Smart school detection when address changes
  useEffect(() => {
    if (
      showSmartFeatures &&
      formData.address.street &&
      formData.address.city &&
      formData.address.state
    ) {
      detectSchoolFromAddress();
    }
  }, [formData.address, showSmartFeatures]);

  const detectSchoolFromAddress = async () => {
    setIsDetectingSchool(true);
    try {
      // Mock implementation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock school detection result
      const mockResult: SmartDetectionResult = {
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

      // Auto-update children's school if not set
      setFormData(prev => ({
        ...prev,
        children: prev.children.map(child => ({
          ...child,
          school: child.school || mockResult.school.name,
        })),
      }));
    } catch (error) {
      console.error('School detection failed:', error);
    } finally {
      setIsDetectingSchool(false);
    }
  };

  // Smart grade inference from age
  const inferGradeFromAge = (age: number): string => {
    if (!age) return '';

    const gradeMap: { [key: number]: string } = {
      5: 'K',
      6: '1st',
      7: '2nd',
      8: '3rd',
      9: '4th',
      10: '5th',
      11: '6th',
      12: '7th',
      13: '8th',
      14: '9th',
      15: '10th',
      16: '11th',
      17: '12th',
    };

    return gradeMap[age] || '';
  };

  const handleInputChange = (
    section: keyof FamilyRegistrationData,
    field: string,
    value: any
  ) => {
    setFormData(prev => {
      // Handle nested objects
      if (typeof prev[section] === 'object' && prev[section] !== null) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value,
          },
        };
      }
      // Handle direct fields
      return {
        ...prev,
        [section]: value,
      };
    });
  };

  const handleChildChange = (index: number, field: keyof Child, value: any) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      ),
    }));
  };

  // Smart child change handler with grade inference
  const handleSmartChildChange = (
    index: number,
    field: keyof Child,
    value: any
  ) => {
    const newChildren = [...formData.children];
    newChildren[index] = { ...newChildren[index], [field]: value };

    // Auto-infer grade when age changes
    if (field === 'age' && showSmartFeatures && value) {
      newChildren[index].grade = inferGradeFromAge(parseInt(value));
    }

    setFormData(prev => ({
      ...prev,
      children: newChildren,
    }));
  };

  const handleVehicleChange = (
    index: number,
    field: keyof FamilyRegistrationData['vehicles'][0],
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      vehicles: prev.vehicles.map((vehicle, i) =>
        i === index ? { ...vehicle, [field]: value } : vehicle
      ),
    }));
  };

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [
        ...prev.children,
        { name: '', age: 0, school: '', grade: '', medicalNotes: '' },
      ],
    }));
  };

  const removeChild = (index: number) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
    }));
  };

  const addVehicle = () => {
    setFormData(prev => ({
      ...prev,
      vehicles: [
        ...prev.vehicles,
        { make: '', model: '', year: 2020, capacity: 4, licensePlate: '' },
      ],
    }));
  };

  const removeVehicle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index),
    }));
  };

  const handlePreferenceChange = (
    field: keyof FamilyRegistrationData['preferences'],
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/family-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      await response.json();

      router.push('/parents/dashboard?welcome=true');
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    // ... (Keep the entire renderStep switch statement here)
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Family Structure
              </h2>
              <p className="text-gray-600">
                Tell us about your family composition
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Structure
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        familyStructure: 'single',
                      }))
                    }
                    className={`p-4 border-2 rounded-lg text-center ${
                      formData.familyStructure === 'single'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <User className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <div className="text-sm font-medium">Single Parent</div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        familyStructure: 'dual',
                      }))
                    }
                    className={`p-4 border-2 rounded-lg text-center ${
                      formData.familyStructure === 'dual'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <div className="text-sm font-medium">Two Parents</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Parent Name
                  </label>
                  <input
                    type="text"
                    value={formData.primaryParent.name}
                    onChange={e =>
                      handleInputChange('primaryParent', 'name', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.primaryParent.email}
                    onChange={e =>
                      handleInputChange(
                        'primaryParent',
                        'email',
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.primaryParent.phone}
                    onChange={e =>
                      handleInputChange(
                        'primaryParent',
                        'phone',
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Can Drive?
                  </label>
                  <select
                    value={formData.primaryParent.canDrive ? 'yes' : 'no'}
                    onChange={e =>
                      handleInputChange(
                        'primaryParent',
                        'canDrive',
                        e.target.value === 'yes'
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="yes">Yes, I can drive</option>
                    <option value="no">No, I cannot drive</option>
                  </select>
                </div>
              </div>

              {formData.familyStructure === 'dual' && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Second Parent (Optional)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.secondaryParent?.name || ''}
                        onChange={e => {
                          const newSecondary = formData.secondaryParent || {
                            name: '',
                            email: '',
                            phone: '',
                            canDrive: true,
                          };
                          setFormData(prev => ({
                            ...prev,
                            secondaryParent: {
                              ...newSecondary,
                              name: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Second parent name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.secondaryParent?.email || ''}
                        onChange={e => {
                          const newSecondary = formData.secondaryParent || {
                            name: '',
                            email: '',
                            phone: '',
                            canDrive: true,
                          };
                          setFormData(prev => ({
                            ...prev,
                            secondaryParent: {
                              ...newSecondary,
                              email: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Second parent email"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Children Information
              </h2>
              <p className="text-gray-600">
                Add your children who will participate in carpools
              </p>
            </div>

            <div className="space-y-4">
              {showSmartFeatures && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 text-2xl">🧠</span>
                    <div>
                      <h4 className="text-blue-900 font-medium">
                        Smart Grade Inference Active
                      </h4>
                      <p className="text-blue-800 text-sm mt-1">
                        We'll automatically calculate your child's grade based
                        on their age. You can manually adjust if needed.
                      </p>
                      {schoolDetectionResult && (
                        <p className="text-blue-700 text-sm mt-1">
                          School will be auto-filled as:{' '}
                          <strong>{schoolDetectionResult.school.name}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {formData.children.map((child, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Child {index + 1}</h3>
                    {formData.children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={child.name}
                        onChange={e => {
                          const newChildren = [...formData.children];
                          newChildren[index].name = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            children: newChildren,
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Child's name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age
                      </label>
                      <input
                        type="number"
                        value={child.age}
                        onChange={e => {
                          if (showSmartFeatures) {
                            handleSmartChildChange(
                              index,
                              'age',
                              e.target.value
                            );
                          } else {
                            const newChildren = [...formData.children];
                            newChildren[index].age = parseInt(e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              children: newChildren,
                            }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Age"
                      />
                      {showSmartFeatures && child.age && (
                        <p className="text-xs text-green-600 mt-1">
                          ✨ Grade will be auto-inferred from age
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        School {schoolDetectionResult ? '(Auto-detected)' : ''}
                      </label>
                      <input
                        type="text"
                        value={child.school}
                        onChange={e => {
                          const newChildren = [...formData.children];
                          newChildren[index].school = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            children: newChildren,
                          }));
                        }}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          schoolDetectionResult ? 'bg-green-50' : ''
                        }`}
                        placeholder="School name"
                        disabled={showSmartFeatures && !!schoolDetectionResult}
                      />
                      {schoolDetectionResult && showSmartFeatures && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Auto-detected from your address
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grade {showSmartFeatures ? '(Auto-inferred)' : ''}
                      </label>
                      <input
                        type="text"
                        value={child.grade}
                        onChange={e => {
                          const newChildren = [...formData.children];
                          newChildren[index].grade = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            children: newChildren,
                          }));
                        }}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          showSmartFeatures && child.age ? 'bg-green-50' : ''
                        }`}
                        placeholder="Grade (e.g., 3rd, K)"
                        disabled={showSmartFeatures && !!child.age}
                      />
                      {showSmartFeatures && child.grade && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Inferred from age {child.age}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Medical notes (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Notes (Optional)
                    </label>
                    <textarea
                      value={child.medicalNotes}
                      onChange={e => {
                        const newChildren = [...formData.children];
                        newChildren[index].medicalNotes = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          children: newChildren,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any allergies, medical conditions, or special instructions..."
                      rows={2}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addChild}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Another Child
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Address & Vehicle
              </h2>
              <p className="text-gray-600">
                We need your address and vehicle information
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={e =>
                    handleInputChange('address', 'street', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={e =>
                      handleInputChange('address', 'city', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={e =>
                      handleInputChange('address', 'state', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={e =>
                      handleInputChange('address', 'zipCode', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12345"
                  />
                </div>
              </div>

              {/* Smart School Detection Results */}
              {isDetectingSchool && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-blue-800">
                      🎓 Detecting nearby schools automatically...
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
                        🎉 School Automatically Detected!
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
                        {Math.round(schoolDetectionResult.confidence * 100)}% |
                        Will auto-fill children's school
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Address Validation Component */}
              <AddressValidation
                onValidationComplete={isValid => setAddressValidated(isValid)}
                required={true}
              />

              {showSmartFeatures && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-blue-800 text-sm">
                        ✨ <strong>Smart Features Enabled:</strong> Automatic
                        school detection and grade inference
                      </span>
                    </div>
                    <button
                      onClick={() => setShowSmartFeatures(false)}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Use manual entry
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Vehicle Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Make & Model
                    </label>
                    <input
                      type="text"
                      value={`${formData.vehicles[0].make} ${formData.vehicles[0].model}`}
                      onChange={e => {
                        const [make, ...modelParts] = e.target.value.split(' ');
                        const newVehicles = [...formData.vehicles];
                        newVehicles[0].make = make || '';
                        newVehicles[0].model = modelParts.join(' ') || '';
                        setFormData(prev => ({
                          ...prev,
                          vehicles: newVehicles,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Toyota Camry"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <input
                      type="number"
                      value={formData.vehicles[0].year}
                      onChange={e => {
                        const newVehicles = [...formData.vehicles];
                        newVehicles[0].year = parseInt(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          vehicles: newVehicles,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2020"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seating Capacity
                    </label>
                    <select
                      value={formData.vehicles[0].capacity}
                      onChange={e => {
                        const newVehicles = [...formData.vehicles];
                        newVehicles[0].capacity = parseInt(e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          vehicles: newVehicles,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="4">4 seats</option>
                      <option value="5">5 seats</option>
                      <option value="7">7 seats</option>
                      <option value="8">8 seats</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Plate
                    </label>
                    <input
                      type="text"
                      value={formData.vehicles[0].licensePlate}
                      onChange={e => {
                        const newVehicles = [...formData.vehicles];
                        newVehicles[0].licensePlate = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          vehicles: newVehicles,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ABC123"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Review & Submit
              </h2>
              <p className="text-gray-600">
                Please review your information before submitting
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Family Structure</h3>
                <p className="text-gray-600">
                  {formData.familyStructure === 'single'
                    ? 'Single Parent'
                    : 'Two Parents'}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Primary Parent</h3>
                <p className="text-gray-600">
                  {formData.primaryParent.name} ({formData.primaryParent.email})
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Children</h3>
                <ul className="text-gray-600">
                  {formData.children.map((child, index) => (
                    <li key={index}>
                      {child.name}, age {child.age} - {child.school} (
                      {child.grade})
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Address</h3>
                <p className="text-gray-600">
                  {formData.address.street}, {formData.address.city},{' '}
                  {formData.address.state} {formData.address.zipCode}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">Vehicle</h3>
                <p className="text-gray-600">
                  {formData.vehicles[0].year} {formData.vehicles[0].make}{' '}
                  {formData.vehicles[0].model}({formData.vehicles[0].capacity}{' '}
                  seats)
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map(stepNum => (
                <div
                  key={stepNum}
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    stepNum <= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {stepNum}
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          {renderStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className={`flex items-center px-4 py-2 rounded-md ${
                step === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Submitting...' : 'Complete Registration'}
                <CheckCircle className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
