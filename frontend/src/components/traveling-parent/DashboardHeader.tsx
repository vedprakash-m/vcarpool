interface DashboardHeaderProps {
  groupName: string;
  makeupBalance: number;
}

export function DashboardHeader({
  groupName,
  makeupBalance,
}: DashboardHeaderProps) {
  return (
    <div className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Traveling Parent Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your carpool makeup schedules for{' '}
            <strong>{groupName}</strong>
          </p>
          <div className="mt-4 flex items-center space-x-4">
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <p className="text-sm font-medium text-blue-700">
                Makeup Balance: {makeupBalance} trips
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
