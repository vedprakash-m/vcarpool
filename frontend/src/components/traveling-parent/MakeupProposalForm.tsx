import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { MakeupProposal } from '@/hooks/useTravelingParentData';

interface MakeupProposalFormProps {
  onSubmit: (
    proposal: MakeupProposal
  ) => Promise<{ success: boolean; error?: string }>;
  availableDates: Array<{
    date: string;
    dayOfWeek: string;
    available: boolean;
    conflictReason?: string;
  }>;
}

export function MakeupProposalForm({
  onSubmit,
  availableDates,
}: MakeupProposalFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<MakeupProposal>({
    proposedDate: '',
    proposedTime: '07:30',
    makeupType: 'extra_week',
    tripsToMakeup: 1,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await onSubmit(proposal);

      if (result.success) {
        // Reset form and close
        setProposal({
          proposedDate: '',
          proposedTime: '07:30',
          makeupType: 'extra_week',
          tripsToMakeup: 1,
          notes: '',
        });
        setIsOpen(false);
      } else {
        setError(result.error || 'Failed to submit proposal');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableDatesForSelect = () => {
    return availableDates.filter(date => date.available).slice(0, 30); // Limit to next 30 available dates
  };

  if (!isOpen) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Create Makeup Proposal
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Propose makeup dates for missed carpool trips during your travel.
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Create Makeup Proposal
          </h3>
          <button
            onClick={() => {
              setIsOpen(false);
              setError(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="proposedDate"
              className="block text-sm font-medium text-gray-700"
            >
              Proposed Date
            </label>
            <select
              id="proposedDate"
              value={proposal.proposedDate}
              onChange={e =>
                setProposal({ ...proposal, proposedDate: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select a date...</option>
              {getAvailableDatesForSelect().map(date => (
                <option key={date.date} value={date.date}>
                  {new Date(date.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="proposedTime"
              className="block text-sm font-medium text-gray-700"
            >
              Proposed Time
            </label>
            <select
              id="proposedTime"
              value={proposal.proposedTime}
              onChange={e =>
                setProposal({ ...proposal, proposedTime: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="07:30">7:30 AM</option>
              <option value="08:00">8:00 AM</option>
              <option value="08:30">8:30 AM</option>
              <option value="15:00">3:00 PM</option>
              <option value="15:30">3:30 PM</option>
              <option value="16:00">4:00 PM</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="makeupType"
              className="block text-sm font-medium text-gray-700"
            >
              Makeup Type
            </label>
            <select
              id="makeupType"
              value={proposal.makeupType}
              onChange={e =>
                setProposal({ ...proposal, makeupType: e.target.value as any })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="extra_week">Extra Week Day</option>
              <option value="split_weeks">Split Between Weeks</option>
              <option value="weekend_trip">Weekend Trip</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="tripsToMakeup"
              className="block text-sm font-medium text-gray-700"
            >
              Number of Trips to Makeup
            </label>
            <select
              id="tripsToMakeup"
              value={proposal.tripsToMakeup}
              onChange={e =>
                setProposal({
                  ...proposal,
                  tripsToMakeup: parseInt(e.target.value),
                })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700"
            >
              Notes (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={proposal.notes}
              onChange={e =>
                setProposal({ ...proposal, notes: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Any additional information..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setError(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
