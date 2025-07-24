'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEntraAuthStore } from '../../store/entra-auth.store';

export function LoginForm() {
  const router = useRouter();
  const { loginWithEntra, loginWithLegacy, isLoading, error, clearError } =
    useEntraAuthStore();

  const [showLegacyLogin, setShowLegacyLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEntraLogin = async () => {
    try {
      clearError();
      await loginWithEntra();
      // Redirect will happen automatically
    } catch (error) {
      console.error('Entra login failed:', error);
    }
  };

  const handleLegacyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      clearError();
      await loginWithLegacy(email, password);
      router.push('/dashboard');
    } catch (error) {
      console.error('Legacy login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Carpool
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect with your school community for safe, reliable carpooling
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Authentication Error
                </h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {!showLegacyLogin ? (
            <>
              {/* Microsoft Entra ID Login (Primary) */}
              <div>
                <button
                  onClick={handleEntraLogin}
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M23.64 12.204c0-.815-.073-1.636-.22-2.425H12v4.598h6.54c-.288 1.494-1.158 2.776-2.465 3.627v3.009h3.992c2.34-2.148 3.573-5.307 3.573-8.809z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 24c3.24 0 5.954-1.077 7.94-2.907l-3.992-3.009c-1.077.72-2.465 1.158-3.948 1.158-3.043 0-5.622-2.058-6.54-4.817H1.46v3.105C3.485 21.318 7.466 24 12 24z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.46 14.425c-.234-.72-.372-1.494-.372-2.425s.138-1.705.372-2.425V6.47H1.46C.533 8.275 0 10.077 0 12s.533 3.725 1.46 5.53l3.1-2.405z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 4.817c1.714 0 3.252.588 4.467 1.746l3.35-3.35C17.954 1.144 15.24 0 12 0 7.466 0 3.485 2.682 1.46 6.47l4 3.105C6.378 6.875 8.957 4.817 12 4.817z"
                        />
                      </svg>
                      Continue with Microsoft
                    </div>
                  )}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">Or</span>
                </div>
              </div>

              {/* Legacy Login Option */}
              <div>
                <button
                  onClick={() => setShowLegacyLogin(true)}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign in with Email & Password
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Legacy Email/Password Form */}
              <form onSubmit={handleLegacyLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
              </form>

              <div>
                <button
                  onClick={() => setShowLegacyLogin(false)}
                  className="w-full flex justify-center py-2 px-4 text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  ← Back to Microsoft Sign In
                </button>
              </div>
            </>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our terms of service and privacy policy.
            <br />
            For security, we recommend using Microsoft authentication.
          </p>
        </div>
      </div>
    </div>
  );
}
