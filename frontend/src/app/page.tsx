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
                Parent Login
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card">
              <div className="card-body text-center">
                <div className="w-12 h-12 mx-auto bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-secondary-900">
                  Parent Community Network
                </h3>
                <p className="mt-2 text-secondary-500">
                  Connect with parents from your school community for
                  convenient, coordinated transportation partnerships.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body text-center">
                <div className="w-12 h-12 mx-auto bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-secondary-900">
                  Flexible School Scheduling
                </h3>
                <p className="mt-2 text-secondary-500">
                  Coordinate morning drop-offs and afternoon pickups with
                  recurring schedules that work for your family's routine.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body text-center">
                <div className="w-12 h-12 mx-auto bg-primary-100 rounded-lg flex items-center justify-center">
                  <CarIcon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-secondary-900">
                  Cost-Effective Transportation
                </h3>
                <p className="mt-2 text-secondary-500">
                  Share fuel costs and reduce wear on your vehicle while
                  providing reliable school transportation for your children.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* School-focused testimonial/stats section */}
        <div className="mt-24 bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              Built for School Communities
            </h2>
            <p className="text-lg text-secondary-600 mb-8">
              Carpool makes school transportation coordination simple and
              organized for busy families
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  Organized
                </div>
                <div className="text-secondary-600">
                  Structured trip planning
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  Simple
                </div>
                <div className="text-secondary-600">Easy trip coordination</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  Savings
                </div>
                <div className="text-secondary-600">
                  Reduced transportation costs
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
