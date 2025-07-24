'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  HomeIcon,
  CalendarIcon,
  TruckIcon as CarIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'My Trips', href: '/trips', icon: CalendarIcon },
  { name: 'Profile', href: '/profile', icon: UserCircleIcon },
];

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-sm border-r border-gray-200">
      <div className="px-4 py-6">
        {/* Logo */}
        <div className="flex items-center mb-8">
          <CarIcon className="h-8 w-8 text-primary-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">Carpool</span>
        </div>

        {/* User Info */}
        {user && (
          <div className="mb-8 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-semibold">
                  {(user.firstName && user.firstName[0]) || '?'}
                  {(user.lastName && user.lastName[0]) || '?'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user.firstName || 'Unknown'} {user.lastName || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.role || 'user'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Note: Individual trip creation removed - Carpool uses group-based scheduling */}

        {/* Navigation Links */}
        <ul className="space-y-1">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.name}>
                <button
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Logout */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
