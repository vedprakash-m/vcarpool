'use client';

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ScaleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface FairnessReport {
  groupId: string;
  reportPeriod: {
    weeksBack: number;
    startDate: string;
    endDate: string;
  };
  fairnessMetrics: {
    totalTrips: number;
    totalWeeks: number;
    activeDrivers: number;
    driverStatistics: DriverStats[];
    groupFairnessScore: number;
    coefficientOfVariation: number;
    fairnessLevel: {
      level: string;
      description: string;
    };
    tripDistribution: {
      min: number;
      max: number;
      average: number;
      standardDeviation: number;
    };
  };
  recommendations: Recommendation[];
  generatedAt: string;
}

interface DriverStats {
  userId: string;
  userName: string;
  totalTrips: number;
  expectedTrips: number;
  fairnessScore: number;
  isActive: boolean;
  weeklyBreakdown: Record<string, number>;
}

interface Recommendation {
  type: string;
  priority: string;
  title: string;
  description: string;
  action: string;
  drivers?: Array<{
    userId: string;
    userName: string;
    currentRatio: number;
  }>;
  suggestedActions?: string[];
}

interface FairnessDashboardProps {
  groupId: string;
  userId: string;
  userRole: string;
}

/**
 * Fairness Dashboard Component
 * Implements PRD requirements for transparent driving distribution tracking
 * Following tech spec: Visual fairness display with recommendations
 */
export const FairnessDashboard: React.FC<FairnessDashboardProps> = ({
  groupId,
  userId,
  userRole,
}) => {
  const [report, setReport] = useState<FairnessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeksBack, setWeeksBack] = useState(8);

  useEffect(() => {
    loadFairnessReport();
  }, [groupId, userId, weeksBack]);

  const loadFairnessReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/fairness-tracking?groupId=${groupId}&userId=${userId}&weeksBack=${weeksBack}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load fairness report');
      }

      const reportData = await response.json();
      setReport(reportData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load fairness data'
      );
    } finally {
      setLoading(false);
    }
  };

  const getFairnessColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.8) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 0.6) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getDriverScoreColor = (score: number) => {
    if (score >= 0.8 && score <= 1.2) return 'text-green-600';
    if (score >= 0.6 && score <= 1.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-red-600">
          <ScaleIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">
            Unable to Load Fairness Data
          </p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button onClick={loadFairnessReport} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const { fairnessMetrics, recommendations } = report;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <ScaleIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Fairness Dashboard
              </h2>
              <p className="text-gray-600">
                Tracking period: {report.reportPeriod.startDate} to{' '}
                {report.reportPeriod.endDate}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Weeks to analyze:
            </label>
            <select
              value={weeksBack}
              onChange={e => setWeeksBack(parseInt(e.target.value))}
              className="input-field w-20"
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={16}>16</option>
            </select>
          </div>
        </div>

        {/* Overall Fairness Score */}
        <div
          className={`border rounded-lg p-4 ${getFairnessColor(
            fairnessMetrics.groupFairnessScore
          )}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Group Fairness Score</h3>
              <p className="text-sm opacity-90">
                {fairnessMetrics.fairnessLevel.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {(fairnessMetrics.groupFairnessScore * 100).toFixed(1)}%
              </div>
              <div className="text-sm opacity-90 capitalize">
                {fairnessMetrics.fairnessLevel.level}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">
            {fairnessMetrics.totalTrips}
          </div>
          <div className="text-sm text-gray-600">Total Trips</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">
            {fairnessMetrics.activeDrivers}
          </div>
          <div className="text-sm text-gray-600">Active Drivers</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">
            {fairnessMetrics.tripDistribution.average.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Avg Trips/Driver</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">
            {fairnessMetrics.coefficientOfVariation.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Variation Coefficient</div>
        </div>
      </div>

      {/* Driver Statistics */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Individual Driver Statistics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Trips
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Trips
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fairness Ratio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fairnessMetrics.driverStatistics
                .filter(driver => driver.isActive)
                .sort((a, b) => b.fairnessScore - a.fairnessScore)
                .map(driver => (
                  <tr key={driver.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {driver.userName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {driver.totalTrips}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {driver.expectedTrips.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${getDriverScoreColor(
                          driver.fairnessScore
                        )}`}
                      >
                        {driver.fairnessScore.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          driver.fairnessScore >= 0.8 &&
                          driver.fairnessScore <= 1.2
                            ? 'bg-green-100 text-green-800'
                            : driver.fairnessScore > 1.2
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {driver.fairnessScore >= 0.8 &&
                        driver.fairnessScore <= 1.2
                          ? 'Balanced'
                          : driver.fairnessScore > 1.2
                          ? 'Over-driving'
                          : 'Under-driving'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            Fairness Recommendations
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {recommendations.map((rec, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900">{rec.title}</h4>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(
                    rec.priority
                  )}`}
                >
                  {rec.priority} priority
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Recommended Action:
                </p>
                <p className="text-sm text-gray-700">{rec.action}</p>
                {rec.suggestedActions && rec.suggestedActions.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                    {rec.suggestedActions.map((action, actionIndex) => (
                      <li key={actionIndex}>{action}</li>
                    ))}
                  </ul>
                )}
              </div>
              {rec.drivers && rec.drivers.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Affected Drivers:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rec.drivers.map(driver => (
                      <span
                        key={driver.userId}
                        className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                      >
                        {driver.userName} ({driver.currentRatio.toFixed(2)})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(report.generatedAt).toLocaleString()}
      </div>
    </div>
  );
};

export default FairnessDashboard;
