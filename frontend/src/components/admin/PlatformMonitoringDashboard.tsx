'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Activity,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Server,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Bell,
  Settings,
  BarChart3,
  Monitor,
} from 'lucide-react';

interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  totalGroups: number;
  activeGroups: number;
  totalTrips: number;
  successfulTrips: number;
  userGrowthRate: number;
  groupGrowthRate: number;
  avgResponseTime: number;
  uptime: number;
  errorRate: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  database: {
    status: 'connected' | 'slow' | 'disconnected';
    responseTime: number;
    connections: number;
  };
  api: {
    status: 'healthy' | 'degraded' | 'down';
    avgResponseTime: number;
    errorRate: number;
  };
  notifications: {
    status: 'operational' | 'delayed' | 'failed';
    queueSize: number;
    failureRate: number;
  };
}

interface UserActivity {
  period: string;
  newUsers: number;
  activeUsers: number;
  retainedUsers: number;
  churnRate: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export default function PlatformMonitoringDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const { toast } = useToast();

  useEffect(() => {
    loadPlatformData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadPlatformData, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const loadPlatformData = async () => {
    try {
      setLoading(true);

      // Load all platform data in parallel
      const [metricsRes, healthRes, activityRes, alertsRes] = await Promise.all(
        [
          fetch(`/api/admin/platform-metrics?timeframe=${selectedTimeframe}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }),
          fetch('/api/admin/system-health', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }),
          fetch(`/api/admin/user-activity?timeframe=${selectedTimeframe}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }),
          fetch('/api/admin/alerts?limit=10', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }),
        ]
      );

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setSystemHealth(healthData);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setUserActivity(activityData.activity || []);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }
    } catch (error) {
      console.error('Error loading platform data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load platform monitoring data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        setAlerts(prev =>
          prev.map(alert =>
            alert.id === alertId ? { ...alert, resolved: true } : alert
          )
        );
        toast({
          title: 'Alert Resolved',
          description: 'Alert has been marked as resolved',
        });
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve alert',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'slow':
      case 'degraded':
      case 'delayed':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
      case 'disconnected':
      case 'down':
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Platform Monitoring</h1>
          <p className="text-gray-600">Real-time system health and analytics</p>
        </div>
        <div className="flex space-x-2">
          <select
            value={selectedTimeframe}
            onChange={e => setSelectedTimeframe(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <Button onClick={loadPlatformData} variant="outline">
            <Monitor className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Database</span>
                  <Badge
                    className={getStatusColor(systemHealth.database.status)}
                  >
                    {systemHealth.database.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Response Time: {systemHealth.database.responseTime}ms</p>
                  <p>Connections: {systemHealth.database.connections}</p>
                </div>
              </div>

              <div className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">API</span>
                  <Badge className={getStatusColor(systemHealth.api.status)}>
                    {systemHealth.api.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Avg Response: {systemHealth.api.avgResponseTime}ms</p>
                  <p>Error Rate: {systemHealth.api.errorRate}%</p>
                </div>
              </div>

              <div className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Notifications</span>
                  <Badge
                    className={getStatusColor(
                      systemHealth.notifications.status
                    )}
                  >
                    {systemHealth.notifications.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Queue Size: {systemHealth.notifications.queueSize}</p>
                  <p>Failure Rate: {systemHealth.notifications.failureRate}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">
                    {metrics.totalUsers.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />+
                    {metrics.userGrowthRate}% growth
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold">
                    {metrics.activeUsers.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">
                    {((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(
                      1
                    )}
                    % of total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Groups</p>
                  <p className="text-2xl font-bold">
                    {metrics.totalGroups.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />+
                    {metrics.groupGrowthRate}% growth
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Trip Success Rate</p>
                  <p className="text-2xl font-bold">
                    {(
                      (metrics.successfulTrips / metrics.totalTrips) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                  <p className="text-xs text-gray-600">
                    {metrics.successfulTrips.toLocaleString()} of{' '}
                    {metrics.totalTrips.toLocaleString()} trips
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold">
                    {metrics.avgResponseTime}ms
                  </p>
                  <p
                    className={`text-xs ${
                      metrics.avgResponseTime < 150
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {metrics.avgResponseTime < 150
                      ? 'Excellent'
                      : 'Needs optimization'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Server className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">System Uptime</p>
                  <p className="text-2xl font-bold">
                    {metrics.uptime.toFixed(2)}%
                  </p>
                  <p
                    className={`text-xs ${
                      metrics.uptime > 99.5
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {metrics.uptime > 99.5 ? 'Excellent' : 'Below target'}
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
                  <p className="text-sm text-gray-600">Error Rate</p>
                  <p className="text-2xl font-bold">
                    {metrics.errorRate.toFixed(2)}%
                  </p>
                  <p
                    className={`text-xs ${
                      metrics.errorRate < 1 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {metrics.errorRate < 1
                      ? 'Within limits'
                      : 'Above threshold'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Groups</p>
                  <p className="text-2xl font-bold">
                    {metrics.activeGroups.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">
                    {(
                      (metrics.activeGroups / metrics.totalGroups) *
                      100
                    ).toFixed(1)}
                    % of total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent alerts</p>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 border rounded ${
                    alert.resolved ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!alert.resolved && (
                      <Button
                        onClick={() => resolveAlert(alert.id)}
                        size="sm"
                        variant="outline"
                      >
                        Resolve
                      </Button>
                    )}
                    {alert.resolved && (
                      <Badge variant="outline" className="text-green-600">
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
