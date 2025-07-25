'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  Activity,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface GroupLifecycleMetrics {
  activityScore: number;
  lastActivityDate: string;
  daysSinceLastActivity: number;
  weeklyPreferenceRate: number;
  memberEngagementRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedAction: string;
  // Enhanced metrics for Priority 3
  consecutiveInactiveWeeks: number;
  recentPreferences: number;
  recentAssignments: number;
  recentMessages: number;
  activeMemberCount: number;
  healthTrend: 'improving' | 'stable' | 'declining';
  fairnessScore?: number;
  groupAdminEngagement?: number;
}

interface GroupWithMetrics {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'pending_reactivation' | 'purged';
  groupAdminId: string;
  groupAdminName?: string;
  memberCount: number;
  createdAt: string;
  lifecycleMetrics: GroupLifecycleMetrics;
  // Enhanced properties for Priority 3
  isAtRisk?: boolean;
  riskFactors?: string[];
  lastReactivationRequest?: string;
  purgeDate?: string;
  betaProgram?: boolean;
}

interface LifecycleSummary {
  totalGroups: number;
  activeGroups: number;
  inactiveGroups: number;
  atRiskGroups: number;
  // Enhanced summary metrics for Priority 3
  pendingReactivation: number;
  purgedGroups: number;
  betaProgramGroups: number;
  averageActivityScore: number;
  groupsNeedingAttention: number;
  healthyGroups: number;
}

export default function GroupLifecycleDashboard() {
  const [groups, setGroups] = useState<GroupWithMetrics[]>([]);
  const [summary, setSummary] = useState<LifecycleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [runningInactivityCheck, setRunningInactivityCheck] = useState(false);
  const [sortBy, setSortBy] = useState<'activity' | 'risk' | 'members' | 'age'>('activity');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const { toast } = useToast();

  useEffect(() => {
    loadLifecycleData();
  }, []);

  const loadLifecycleData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/group-lifecycle-management', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load lifecycle data');
      }

      const data = await response.json();
      setGroups(data.groups);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error loading lifecycle data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group lifecycle data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const runInactivityCheck = async () => {
    try {
      setRunningInactivityCheck(true);
      const response = await fetch('/api/group-lifecycle-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          adminUserId: localStorage.getItem('userId'),
          forceCheck: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run inactivity check');
      }

      const result = await response.json();
      toast({
        title: 'Inactivity Check Complete',
        description: `Processed ${result.processedGroups} groups. ${result.warningsSent} warnings sent.`,
      });

      // Reload data to show updated status
      await loadLifecycleData();
    } catch (error) {
      console.error('Error running inactivity check:', error);
      toast({
        title: 'Error',
        description: 'Failed to run inactivity check',
        variant: 'destructive',
      });
    } finally {
      setRunningInactivityCheck(false);
    }
  };

  const handleReactivationRequest = async (
    groupId: string,
    action: 'approve' | 'deny'
  ) => {
    try {
      const response = await fetch('/api/group-lifecycle-management', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          groupId,
          action: action === 'approve' ? 'reactivate' : 'deny_reactivation',
          adminUserId: localStorage.getItem('userId'),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} reactivation`);
      }

      toast({
        title: `Reactivation ${action === 'approve' ? 'Approved' : 'Denied'}`,
        description: `Group reactivation request has been ${
          action === 'approve' ? 'approved' : 'denied'
        }.`,
      });

      // Reload data
      await loadLifecycleData();
    } catch (error) {
      console.error(`Error ${action}ing reactivation:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} reactivation request`,
        variant: 'destructive',
      });
    }
  };

  const getRiskLevelBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Risk</Badge>;
      case 'low':
        return <Badge variant="outline">Low Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-600">
            Active
          </Badge>
        );
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'pending_reactivation':
        return (
          <Badge
            variant="outline"
            className="border-orange-500 text-orange-600"
          >
            Pending Reactivation
          </Badge>
        );
      case 'purged':
        return <Badge variant="destructive">Purged</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getHealthTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const sortGroups = (groups: GroupWithMetrics[]) => {
    return [...groups].sort((a, b) => {
      switch (sortBy) {
        case 'activity':
          return a.lifecycleMetrics.activityScore - b.lifecycleMetrics.activityScore;
        case 'risk':
          const riskOrder = { high: 3, medium: 2, low: 1 };
          return riskOrder[b.lifecycleMetrics.riskLevel] - riskOrder[a.lifecycleMetrics.riskLevel];
        case 'members':
          return b.memberCount - a.memberCount;
        case 'age':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });
  };

  const filteredGroups = sortGroups(groups.filter(group => {
    const riskMatch = selectedRiskLevel === 'all' || group.lifecycleMetrics.riskLevel === selectedRiskLevel;
    const statusMatch = selectedStatus === 'all' || group.status === selectedStatus;
    return riskMatch && statusMatch;
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Groups</p>
                  <p className="text-2xl font-bold">{summary.totalGroups}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Healthy Groups</p>
                  <p className="text-2xl font-bold text-green-600">
                    {summary.healthyGroups}
                  </p>
                  <p className="text-xs text-gray-500">
                    Score ≥ 70
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Activity Score</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(summary.averageActivityScore)}/100
                  </p>
                  <p className="text-xs text-gray-500">
                    Platform Health
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Need Attention</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {summary.groupsNeedingAttention}
                  </p>
                  <p className="text-xs text-gray-500">
                    Pending Actions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {summary.betaProgramGroups > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 text-purple-600 font-bold">β</div>
                  <div>
                    <p className="text-sm text-gray-600">Beta Program</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {summary.betaProgramGroups}
                    </p>
                    <p className="text-xs text-gray-500">
                      Tesla STEM Groups
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Group Lifecycle Management</CardTitle>
            <div className="flex space-x-2">
              <Button
                onClick={runInactivityCheck}
                disabled={runningInactivityCheck}
                variant="outline"
              >
                {runningInactivityCheck ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Activity className="h-4 w-4 mr-2" />
                )}
                Run Inactivity Check
              </Button>
              <Button onClick={loadLifecycleData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Enhanced Filters and Controls */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Risk Level:</label>
                <select
                  value={selectedRiskLevel}
                  onChange={e => setSelectedRiskLevel(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status:</label>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending_reactivation">Pending Reactivation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sort By:</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="activity">Activity Score</option>
                  <option value="risk">Risk Level</option>
                  <option value="members">Member Count</option>
                  <option value="age">Creation Date</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">View:</label>
                <div className="flex space-x-2">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'outline'}
                    onClick={() => setViewMode('cards')}
                    size="sm"
                    className="flex-1"
                  >
                    Cards
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    onClick={() => setViewMode('table')}
                    size="sm"
                    className="flex-1"
                  >
                    Table
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Groups List */}
          <div className="space-y-4">
            {filteredGroups.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No groups found matching the selected criteria.
              </p>
            ) : viewMode === 'cards' ? (
              filteredGroups.map(group => (
                <Card key={group.id} className={`border-l-4 ${
                  group.lifecycleMetrics.riskLevel === 'high' ? 'border-l-red-500' :
                  group.lifecycleMetrics.riskLevel === 'medium' ? 'border-l-yellow-500' :
                  'border-l-green-500'
                } ${group.betaProgram ? 'bg-purple-50' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold flex items-center">
                            {group.name}
                            {group.betaProgram && (
                              <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                Beta
                              </span>
                            )}
                          </h3>
                          {getStatusBadge(group.status)}
                          {getRiskLevelBadge(group.lifecycleMetrics.riskLevel)}
                          {getHealthTrendIcon(group.lifecycleMetrics.healthTrend)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                          <div>
                            <p><strong>Members:</strong> {group.memberCount}</p>
                            <p><strong>Admin:</strong> {group.groupAdminName || 'Unknown'}</p>
                          </div>
                          <div>
                            <p><strong>Last Activity:</strong> {group.lifecycleMetrics.daysSinceLastActivity} days ago</p>
                            <p><strong>Activity Score:</strong> {group.lifecycleMetrics.activityScore}/100</p>
                          </div>
                          <div>
                            <p><strong>Preference Rate:</strong> {group.lifecycleMetrics.weeklyPreferenceRate}%</p>
                            <p><strong>Engagement Rate:</strong> {group.lifecycleMetrics.memberEngagementRate}%</p>
                          </div>
                          <div>
                            <p><strong>Inactive Weeks:</strong> {group.lifecycleMetrics.consecutiveInactiveWeeks}</p>
                            <p><strong>Active Members:</strong> {group.lifecycleMetrics.activeMemberCount}/{group.memberCount}</p>
                          </div>
                        </div>

                        {/* Enhanced Activity Indicators */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Recent Activity</span>
                              <span className="text-sm font-medium">
                                {group.lifecycleMetrics.recentPreferences + group.lifecycleMetrics.recentAssignments + group.lifecycleMetrics.recentMessages}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              {group.lifecycleMetrics.recentPreferences} prefs • {group.lifecycleMetrics.recentAssignments} trips • {group.lifecycleMetrics.recentMessages} messages
                            </div>
                          </div>
                          
                          {group.lifecycleMetrics.fairnessScore && (
                            <div className="bg-gray-50 p-3 rounded">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Fairness Score</span>
                                <span className="text-sm font-medium">{group.lifecycleMetrics.fairnessScore}/100</span>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Driving distribution balance
                              </div>
                            </div>
                          )}

                          {group.lifecycleMetrics.groupAdminEngagement && (
                            <div className="bg-gray-50 p-3 rounded">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Admin Engagement</span>
                                <span className="text-sm font-medium">{group.lifecycleMetrics.groupAdminEngagement}%</span>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Group Admin activity level
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm">
                            <strong>Recommended Action:</strong> {group.lifecycleMetrics.recommendedAction}
                          </p>
                          {group.isAtRisk && group.riskFactors && group.riskFactors.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-orange-600">Risk Factors:</p>
                              <ul className="text-xs text-gray-600 mt-1">
                                {group.riskFactors.map((factor, index) => (
                                  <li key={index}>• {factor}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {group.status === 'pending_reactivation' && (
                        <div className="ml-4 flex space-x-2">
                          <Button
                            onClick={() => handleReactivationRequest(group.id, 'approve')}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReactivationRequest(group.id, 'deny')}
                            size="sm"
                            variant="destructive"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Table view for more compact display
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Group</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Members</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Activity</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Risk</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map(group => (
                      <tr key={group.id} className={group.betaProgram ? 'bg-purple-50' : ''}>
                        <td className="border border-gray-200 px-4 py-2">
                          <div>
                            <div className="font-medium flex items-center">
                              {group.name}
                              {group.betaProgram && (
                                <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                  β
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{group.groupAdminName}</div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {getStatusBadge(group.status)}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="text-sm">
                            <div>{group.memberCount} total</div>
                            <div className="text-gray-500">
                              {group.lifecycleMetrics.activeMemberCount} active
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="text-sm">
                            <div className="flex items-center space-x-2">
                              <span>{group.lifecycleMetrics.activityScore}/100</span>
                              {getHealthTrendIcon(group.lifecycleMetrics.healthTrend)}
                            </div>
                            <div className="text-gray-500">
                              {group.lifecycleMetrics.daysSinceLastActivity} days ago
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {getRiskLevelBadge(group.lifecycleMetrics.riskLevel)}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {group.status === 'pending_reactivation' && (
                            <div className="flex space-x-1">
                              <Button
                                onClick={() => handleReactivationRequest(group.id, 'approve')}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-xs"
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleReactivationRequest(group.id, 'deny')}
                                size="sm"
                                variant="destructive"
                                className="text-xs"
                              >
                                Deny
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
