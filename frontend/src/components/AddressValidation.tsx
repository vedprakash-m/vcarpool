'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface AddressValidationProps {
  onValidationComplete?: (verified: boolean) => void;
  required?: boolean;
}

interface AddressStatus {
  homeAddress: string;
  verified: boolean;
  homeLocation: {
    latitude: number;
    longitude: number;
  } | null;
  serviceArea: {
    school: string;
    maxDistance: number;
  };
}

interface ValidationResult {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distanceToSchool: number;
  serviceArea: {
    school: string;
    maxDistance: number;
  };
  verified: boolean;
  verifiedAt: string;
}

export default function AddressValidation({
  onValidationComplete,
  required = false,
}: AddressValidationProps) {
  const { user } = useAuthStore();
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<AddressStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Load address status on mount
  useEffect(() => {
    loadAddressStatus();
  }, []);

  const loadAddressStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch(
        '/api/address-validation-secure?action=status',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
        if (data.data.homeAddress) {
          setAddress(data.data.homeAddress);
        }
        if (data.data.verified && onValidationComplete) {
          onValidationComplete(true);
        }
      }
    } catch (error) {
      console.error('Failed to load address status:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateAddress = async () => {
    if (!address.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter your home address',
      });
      return;
    }

    setValidating(true);
    setMessage(null);
    setSuggestions([]);

    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch(
        '/api/address-validation-secure?action=validate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ address }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const result: ValidationResult = data.data;
        setMessage({
          type: 'success',
          text: `Address verified! Distance to ${
            result.serviceArea.school
          }: ${result.distanceToSchool.toFixed(1)} miles`,
        });
        await loadAddressStatus();
        if (onValidationComplete) {
          onValidationComplete(true);
        }
      } else {
        const {
          errorCode,
          message: errorMessage,
          suggestions: errorSuggestions,
        } = data.error;

        if (errorCode === 'OUTSIDE_SERVICE_AREA') {
          setMessage({
            type: 'error',
            text: errorMessage,
          });
        } else if (errorCode === 'INVALID_ADDRESS') {
          setMessage({
            type: 'error',
            text: errorMessage,
          });
          if (errorSuggestions && errorSuggestions.length > 0) {
            setSuggestions(errorSuggestions);
          }
        } else {
          setMessage({
            type: 'error',
            text: errorMessage || 'Failed to validate address',
          });
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error validating address',
      });
    } finally {
      setValidating(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setAddress(suggestion);
    setSuggestions([]);
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (status?.verified) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              Home Address Verified
            </h3>
            <p className="text-green-700 mb-2">✓ {status.homeAddress}</p>
            <p className="text-sm text-green-600">
              Within {status.serviceArea.maxDistance} miles of{' '}
              {status.serviceArea.school}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <MapPinIcon className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Home Address Verification
          {required && <span className="text-red-500 ml-1">*</span>}
        </h3>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Service Area:</strong> Within 25 miles of Tesla Stem High
          School, Redmond, WA
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Address validation ensures families are within our supported carpool
          area
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md ${
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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Home Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St, Redmond, WA 98052"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Enter your complete home address including city, state, and ZIP code
          </p>
        </div>

        {suggestions.length > 0 && (
          <div className="border border-gray-200 rounded-md">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700">Did you mean:</p>
            </div>
            <div className="divide-y divide-gray-200">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm text-gray-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={validateAddress}
          disabled={validating || !address.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {validating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Validating...</span>
            </>
          ) : (
            <>
              <MapPinIcon className="h-4 w-4" />
              <span>Validate Address</span>
            </>
          )}
        </button>
      </div>

      {required && !status?.verified && (
        <div className="mt-4 flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Address verification required</p>
            <p>
              Your home address must be verified and within 25 miles of Tesla
              Stem High School to access carpool groups. This ensures efficient
              route planning and community safety.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
