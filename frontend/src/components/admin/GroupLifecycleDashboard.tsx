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
}

interface LifecycleSummary {
  totalGroups: number;
  activeGroups: number;
  inactiveGroups: number;
  atRiskGroups: number;
}

export default function GroupLifecycleDashboard() {
  const [groups, setGroups] = useState<GroupWithMetrics[]>([]);
  const [summary, setSummary] = useState<LifecycleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [runningInactivityCheck, setRunningInactivityCheck] = useState(false);
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

  const filteredGroups = groups.filter(group => {
    if (selectedRiskLevel === 'all') return true;
    return group.lifecycleMetrics.riskLevel === selectedRiskLevel;
  });

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
                  <p className="text-sm text-gray-600">Active Groups</p>
                  <p className="text-2xl font-bold text-green-600">
                    {summary.activeGroups}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Inactive Groups</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {summary.inactiveGroups}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">At Risk Groups</p>
                  <p className="text-2xl font-bold text-red-600">
                    {summary.atRiskGroups}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
          {/* Risk Level Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Filter by Risk Level:
            </label>
            <select
              value={selectedRiskLevel}
              onChange={e => setSelectedRiskLevel(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>

          {/* Groups List */}
          <div className="space-y-4">
            {filteredGroups.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No groups found matching the selected criteria.
              </p>
            ) : (
              filteredGroups.map(group => (
                <Card key={group.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold">
                            {group.name}
                          </h3>
                          {getStatusBadge(group.status)}
                          {getRiskLevelBadge(group.lifecycleMetrics.riskLevel)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <p>
                              <strong>Members:</strong> {group.memberCount}
                            </p>
                            <p>
                              <strong>Admin:</strong>{' '}
                              {group.groupAdminName || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p>
                              <strong>Last Activity:</strong>{' '}
                              {group.lifecycleMetrics.daysSinceLastActivity}{' '}
                              days ago
                            </p>
                            <p>
                              <strong>Activity Score:</strong>{' '}
                              {group.lifecycleMetrics.activityScore}/100
                            </p>
                          </div>
                          <div>
                            <p>
                              <strong>Preference Rate:</strong>{' '}
                              {group.lifecycleMetrics.weeklyPreferenceRate}%
                            </p>
                            <p>
                              <strong>Engagement Rate:</strong>{' '}
                              {group.lifecycleMetrics.memberEngagementRate}%
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm">
                            <strong>Recommended Action:</strong>{' '}
                            {group.lifecycleMetrics.recommendedAction}
                          </p>
                        </div>
                      </div>

                      {group.status === 'pending_reactivation' && (
                        <div className="ml-4 flex space-x-2">
                          <Button
                            onClick={() =>
                              handleReactivationRequest(group.id, 'approve')
                            }
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() =>
                              handleReactivationRequest(group.id, 'deny')
                            }
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
