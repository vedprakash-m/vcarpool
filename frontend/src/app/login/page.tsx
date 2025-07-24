'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { useEntraAuthStore } from '@/store/entra-auth.store';
import { TruckIcon as CarIcon } from '@heroicons/react/24/outline';

// Define the login schema directly to avoid import issues
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginRequest = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);

  // Entra ID authentication
  const { loginWithEntra, isLoading: entraLoading } = useEntraAuthStore();
  const isEntraEnabled = process.env.NEXT_PUBLIC_ENABLE_ENTRA_AUTH === 'true';
  const isLegacyEnabled = process.env.NEXT_PUBLIC_ENABLE_LEGACY_AUTH === 'true';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginRequest) => {
    try {
      await login(data);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    }
  };

  const handleEntraLogin = async () => {
    try {
      await loginWithEntra();
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Microsoft login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <CarIcon className="h-12 w-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isEntraEnabled && !isLegacyEnabled
              ? 'Sign in with Microsoft'
              : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isEntraEnabled && !isLegacyEnabled ? (
              'Use your Microsoft account to access Carpool'
            ) : (
              <>
                Or{' '}
                <Link
                  href="/register"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  create a new account
                </Link>
              </>
            )}
          </p>
        </div>

        {/* Microsoft Sign In Button */}
        {isEntraEnabled && (
          <div className="mt-6">
            <button
              type="button"
              onClick={handleEntraLogin}
              disabled={entraLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="microsoft-login-button"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="12" y="1" width="9" height="9" fill="#00a4ef" />
                <rect x="1" y="12" width="9" height="9" fill="#7fba00" />
                <rect x="12" y="12" width="9" height="9" fill="#ffb900" />
              </svg>
              {entraLoading ? 'Signing in...' : 'Continue with Microsoft'}
            </button>
          </div>
        )}

        {/* Divider */}
        {isEntraEnabled && isLegacyEnabled && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">
                  Or continue with email
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Traditional Login Form */}
        {isLegacyEnabled && (
          <form
            className="mt-8 space-y-6"
            onSubmit={handleSubmit(onSubmit)}
            data-testid="login-form"
          >
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  data-testid="email-input"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  {...register('password')}
                  type="password"
                  autoComplete="current-password"
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  data-testid="password-input"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="submit-login-button"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
