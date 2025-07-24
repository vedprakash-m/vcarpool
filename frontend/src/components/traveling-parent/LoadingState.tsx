import { Users } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading Dashboard
        </h2>
        <p className="text-gray-600">Please wait while we load your data...</p>
      </div>
    </div>
  );
}

export function NoGroupState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No Group Membership
        </h2>
        <p className="text-gray-600">
          You are not a member of any carpool group.
        </p>
      </div>
    </div>
  );
}
