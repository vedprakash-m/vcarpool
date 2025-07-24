import { Calendar, Clock } from 'lucide-react';

interface TravelPeriod {
  startDate: string;
  endDate: string;
  reason: string;
  affectedTrips: number;
}

interface TravelScheduleCardProps {
  hasUpcomingTravel: boolean;
  travelPeriods: TravelPeriod[];
}

export function TravelScheduleCard({
  hasUpcomingTravel,
  travelPeriods,
}: TravelScheduleCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">
              Travel Schedule
            </h3>
            <p className="text-sm text-gray-600">
              {hasUpcomingTravel
                ? `${travelPeriods.length} upcoming travel period${
                    travelPeriods.length !== 1 ? 's' : ''
                  }`
                : 'No upcoming travel scheduled'}
            </p>
          </div>
        </div>

        {hasUpcomingTravel && travelPeriods.length > 0 && (
          <div className="mt-6 space-y-4">
            {travelPeriods.map((period, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(period.startDate)} -{' '}
                      {formatDate(period.endDate)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {period.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-600">
                      {period.affectedTrips} trips affected
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasUpcomingTravel && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-green-600" />
              <p className="ml-2 text-sm text-green-700">
                No upcoming travel scheduled. Your regular carpool schedule is
                active.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
