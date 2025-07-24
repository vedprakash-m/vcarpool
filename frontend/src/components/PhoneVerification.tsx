'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface PhoneVerificationProps {
  onVerificationComplete?: (verified: boolean) => void;
  required?: boolean;
}

interface VerificationStatus {
  phoneNumber: string;
  verified: boolean;
  hasPendingVerification: boolean;
}

export default function PhoneVerification({
  onVerificationComplete,
  required = false,
}: PhoneVerificationProps) {
  const { user } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Load verification status on mount
  useEffect(() => {
    loadVerificationStatus();
  }, []);

  // Countdown timer for resend code
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const loadVerificationStatus = async () => {
    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch('/api/phone-verification?action=status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
        if (data.data.phoneNumber) {
          setPhoneNumber(data.data.phoneNumber);
        }
        if (data.data.verified && onVerificationComplete) {
          onVerificationComplete(true);
        }
      }
    } catch (error) {
      console.error('Failed to load verification status:', error);
    }
  };

  const sendVerificationCode = async () => {
    if (!phoneNumber.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter your phone number',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch('/api/phone-verification?action=send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('code');
        setCountdown(600); // 10 minutes
        setMessage({
          type: 'success',
          text: `Verification code sent to ${phoneNumber}`,
        });

        // In development, show the code
        if (data.data.verificationCode) {
          setMessage({
            type: 'info',
            text: `Development mode: Your verification code is ${data.data.verificationCode}`,
          });
        }
      } else {
        setMessage({
          type: 'error',
          text: data.error.message || 'Failed to send verification code',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error sending verification code',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter the verification code',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('carpool_token');
      const response = await fetch(
        '/api/phone-verification?action=verify-code',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ phoneNumber, code: verificationCode }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Phone number verified successfully!',
        });
        await loadVerificationStatus();
        if (onVerificationComplete) {
          onVerificationComplete(true);
        }
      } else {
        setMessage({
          type: 'error',
          text: data.error.message || 'Invalid verification code',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error verifying code',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (status?.verified) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <CheckCircleIcon className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              Phone Number Verified
            </h3>
            <p className="text-green-700">
              ✓ {status.phoneNumber} is verified and ready for carpool access
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <PhoneIcon className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Phone Number Verification
          {required && <span className="text-red-500 ml-1">*</span>}
        </h3>
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

      {step === 'phone' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              We'll send a verification code via SMS
            </p>
          </div>
          <button
            onClick={sendVerificationCode}
            disabled={loading || !phoneNumber.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </div>
      )}

      {step === 'code' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the 6-digit code sent to {phoneNumber}
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={verifyCode}
              disabled={loading || !verificationCode.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              onClick={() => {
                setStep('phone');
                setVerificationCode('');
                setMessage(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Change Number
            </button>
          </div>

          {countdown > 0 && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <ClockIcon className="h-4 w-4" />
              <span>Code expires in {formatTime(countdown)}</span>
            </div>
          )}

          {countdown === 0 && (
            <button
              onClick={sendVerificationCode}
              disabled={loading}
              className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Resend verification code
            </button>
          )}
        </div>
      )}

      {required && !status?.verified && (
        <div className="mt-4 flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            Phone verification is required to access carpool groups and ensure
            emergency contact capabilities.
          </p>
        </div>
      )}
    </div>
  );
}
