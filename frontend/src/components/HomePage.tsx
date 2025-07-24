import Link from 'next/link';
import { TruckIcon as CarIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <CarIcon className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-2xl font-bold text-secondary-900">
                Carpool
              </span>
            </div>
            <div className="flex space-x-4">
              <Link href="/login" className="btn-outline">
                Sign In
              </Link>
              <Link href="/register" className="btn-primary">
                Join Today
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-secondary-900 sm:text-5xl md:text-6xl">
            <span className="block">Smart School</span>
            <span className="block text-primary-600">Carpool Coordination</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-secondary-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Connect with other parents to coordinate convenient school
            transportation. Share rides, reduce costs, and build community
            through organized carpool partnerships for your children's daily
            school commute.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link
                href="/register"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10"
              >
                Start Carpooling
              </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <Link
                href="/login"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-32">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-secondary-900 sm:text-4xl">
              Why Choose Carpool?
            </h2>
            <p className="mt-4 text-lg text-secondary-500">
              Everything you need to organize safe, efficient school
              transportation
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="flex justify-center items-center mx-auto h-12 w-12 rounded-md bg-primary-500 text-white">
                <CarIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-medium text-secondary-900">
                Smart Matching
              </h3>
              <p className="mt-2 text-base text-secondary-500">
                Find families with similar schedules and routes for optimal
                carpooling arrangements
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center items-center mx-auto h-12 w-12 rounded-md bg-primary-500 text-white">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-medium text-secondary-900">
                Safe & Secure
              </h3>
              <p className="mt-2 text-base text-secondary-500">
                Background checks and verification ensure your children's safety
                with trusted drivers
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center items-center mx-auto h-12 w-12 rounded-md bg-primary-500 text-white">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-medium text-secondary-900">
                Real-time Updates
              </h3>
              <p className="mt-2 text-base text-secondary-500">
                Get instant notifications about schedule changes, delays, and
                pickup confirmations
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-primary-600 rounded-lg shadow-xl overflow-hidden">
          <div className="px-6 py-12 sm:px-12 lg:py-16 lg:px-16">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Ready to start carpooling?
              </h2>
              <p className="mt-4 text-lg text-primary-100">
                Join thousands of families who trust Carpool for their school
                transportation needs
              </p>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 transition-colors duration-200"
                >
                  Get Started Today
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-12 md:flex md:items-center md:justify-between">
            <div className="flex justify-center space-x-6 md:order-2">
              <Link href="/about" className="text-gray-400 hover:text-gray-500">
                About
              </Link>
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-gray-500"
              >
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-gray-500">
                Terms
              </Link>
              <Link
                href="/contact"
                className="text-gray-400 hover:text-gray-500"
              >
                Contact
              </Link>
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-base text-gray-400">
                &copy; 2024 Carpool. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
