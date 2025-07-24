import { CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import type { MakeupOption } from '@/hooks/useTravelingParentData';

interface MakeupOptionsListProps {
  makeupOptions: MakeupOption[];
  onDelete: (
    proposalId: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export function MakeupOptionsList({
  makeupOptions,
  onDelete,
}: MakeupOptionsListProps) {
  const getStatusIcon = (status: MakeupOption['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: MakeupOption['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const getMakeupTypeLabel = (type: MakeupOption['makeupType']) => {
    switch (type) {
      case 'extra_week':
        return 'Extra Week Day';
      case 'split_weeks':
        return 'Split Between Weeks';
      case 'weekend_trip':
        return 'Weekend Trip';
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const canDelete = (status: MakeupOption['status']) => {
    return status === 'proposed' || status === 'rejected';
  };

  const handleDelete = async (proposalId: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) {
      return;
    }

    const result = await onDelete(proposalId);
    if (!result.success) {
      alert(result.error || 'Failed to delete proposal');
    }
  };

  if (makeupOptions.length === 0) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Makeup Proposals
          </h3>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No makeup proposals yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Create a proposal to schedule makeup trips for your travel
              periods.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Makeup Proposals
        </h3>
        <div className="space-y-4">
          {makeupOptions.map(option => (
            <div
              key={option.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(option.status)}
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                        option.status
                      )}`}
                    >
                      {option.status.charAt(0).toUpperCase() +
                        option.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Date & Time
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(option.proposedDate)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatTime(option.proposedTime)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-900">Type</p>
                      <p className="text-sm text-gray-600">
                        {getMakeupTypeLabel(option.makeupType)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Trips to Makeup
                      </p>
                      <p className="text-sm text-gray-600">
                        {option.tripsToMakeup} trip
                        {option.tripsToMakeup !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {option.notes && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-900">Notes</p>
                      <p className="text-sm text-gray-600">{option.notes}</p>
                    </div>
                  )}

                  {option.adminNotes && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-900">
                        Admin Notes
                      </p>
                      <p className="text-sm text-gray-600">
                        {option.adminNotes}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Created {new Date(option.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {canDelete(option.status) && (
                  <button
                    onClick={() => handleDelete(option.id)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                    title="Delete proposal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
