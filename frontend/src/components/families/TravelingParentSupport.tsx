'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  PaperAirplaneIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface TravelPeriod {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  isRecurring: boolean;
  recurringPattern?: 'weekly' | 'biweekly' | 'monthly';
  status: 'pending' | 'approved' | 'active' | 'completed';
  impactedTrips: number;
  replacementArranged: boolean;
}

interface TravelingParent {
  id: string;
  name: string;
  email: string;
  phone: string;
  currentTravelPeriods: TravelPeriod[];
  upcomingTravelPeriods: TravelPeriod[];
  totalTripsAffected: number;
  reliabilityScore: number;
  lastTravelUpdate: string;
}

interface ReplacementDriver {
  id: string;
  name: string;
  relationship: 'spouse' | 'family' | 'backup_driver' | 'group_member';
  availability: 'available' | 'limited' | 'unavailable';
  distance: number; // km from affected routes
  reliability: number;
  acceptedReplacements: number;
}

interface TravelImpact {
  tripId: string;
  childName: string;
  groupName: string;
  date: string;
  timeSlot: string;
  originalDriver: string;
  replacementDriver?: string;
  replacementStatus: 'needed' | 'arranged' | 'confirmed' | 'failed';
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface TravelingSupportProps {
  parentId?: string;
  isAdminView?: boolean;
  onTravelPeriodUpdated?: (periodId: string, updates: Partial<TravelPeriod>) => void;
}

export default function TravelingParentSupport({
  parentId,
  isAdminView = false,
  onTravelPeriodUpdated,
}: TravelingSupportProps) {
  const [travelingParents, setTravelingParents] = useState<TravelingParent[]>([]);
  const [selectedParent, setSelectedParent] = useState<TravelingParent | null>(null);
  const [travelImpacts, setTravelImpacts] = useState<TravelImpact[]>([]);
  const [replacementDrivers, setReplacementDrivers] = useState<ReplacementDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'schedule' | 'replacements'>('overview');
  const [showAddTravelModal, setShowAddTravelModal] = useState(false);
  const [processingReplacement, setProcessingReplacement] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadTravelingParentsData();
  }, [parentId]);

  const loadTravelingParentsData = async () => {
    try {
      setLoading(true);
      const endpoint = parentId 
        ? `/api/traveling-parents/${parentId}` 
        : '/api/traveling-parents';

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTravelingParents(Array.isArray(data) ? data : [data]);
        
        if (data.length > 0) {
          setSelectedParent(data[0]);
          await loadTravelImpacts(data[0].id);
          await loadReplacementDrivers(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading traveling parents data:', error);
      toast({
        title: 'Loading Error',
        description: 'Failed to load traveling parent information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTravelImpacts = async (parentId: string) => {
    try {
      const response = await fetch(`/api/traveling-parents/${parentId}/impacts`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const impacts = await response.json();
        setTravelImpacts(impacts);
      }
    } catch (error) {
      console.error('Error loading travel impacts:', error);
    }
  };

  const loadReplacementDrivers = async (parentId: string) => {
    try {
      const response = await fetch(`/api/traveling-parents/${parentId}/replacement-drivers`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const drivers = await response.json();
        setReplacementDrivers(drivers);
      }
    } catch (error) {
      console.error('Error loading replacement drivers:', error);
    }
  };

  const handleArrangeReplacement = async (impactId: string, replacementDriverId: string) => {
    try {
      setProcessingReplacement(true);

      const response = await fetch('/api/traveling-parents/arrange-replacement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          impactId,
          replacementDriverId,
          parentId: selectedParent?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to arrange replacement');
      }

      const result = await response.json();

      toast({
        title: 'Replacement Arranged',
        description: `${result.replacementDriverName} has been assigned. Group notifications sent.`,
      });

      // Reload impacts to reflect changes
      if (selectedParent) {
        await loadTravelImpacts(selectedParent.id);
      }

    } catch (error) {
      console.error('Error arranging replacement:', error);
      toast({
        title: 'Arrangement Failed',
        description: 'Failed to arrange replacement driver. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingReplacement(false);
    }
  };

  const renderTravelPeriodStatus = (period: TravelPeriod) => {
    const statusConfig = {
      pending: { color: 'orange', label: 'Pending Approval' },
      approved: { color: 'blue', label: 'Approved' },
      active: { color: 'green', label: 'Currently Traveling' },
      completed: { color: 'gray', label: 'Completed' },
    };

    const config = statusConfig[period.status];
    
    return (
      <Badge variant={period.status === 'active' ? 'default' : 'secondary'}>
        {config.label}
      </Badge>
    );
  };

  const renderUrgencyIndicator = (urgency: string) => {
    const urgencyConfig = {
      low: { color: 'green', icon: CheckCircleIcon },
      medium: { color: 'yellow', icon: ClockIcon },
      high: { color: 'orange', icon: ExclamationTriangleIcon },
      critical: { color: 'red', icon: ExclamationTriangleIcon },
    };

    const config = urgencyConfig[urgency as keyof typeof urgencyConfig];
    const IconComponent = config.icon;

    return (
      <div className={`flex items-center text-${config.color}-600`}>
        <IconComponent className="h-4 w-4 mr-1" />
        <span className="text-sm font-medium capitalize">{urgency}</span>
      </div>
    );
  };

  const renderOverviewMode = () => (
    <div className="space-y-6">
      {/* Current Active Travel */}
      {selectedParent && selectedParent.currentTravelPeriods.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-900">
              <PaperAirplaneIcon className="h-5 w-5" />
              <span>Currently Traveling</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedParent.currentTravelPeriods.map(period => (
                <div key={period.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{period.reason}</h4>
                      <p className="text-sm text-gray-600">
                        {period.startDate} - {period.endDate}
                      </p>
                    </div>
                    {renderTravelPeriodStatus(period)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Trips Impacted:</span>
                      <span className="ml-2 text-red-600">{period.impactedTrips}</span>
                    </div>
                    <div>
                      <span className="font-medium">Replacement:</span>
                      <span className={`ml-2 ${period.replacementArranged ? 'text-green-600' : 'text-red-600'}`}>
                        {period.replacementArranged ? 'Arranged' : 'Needed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent Selection (Admin View) */}
      {isAdminView && travelingParents.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Traveling Parents Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {travelingParents.map(parent => (
                <div
                  key={parent.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedParent?.id === parent.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedParent(parent);
                    loadTravelImpacts(parent.id);
                    loadReplacementDrivers(parent.id);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{parent.name}</h4>
                    {parent.currentTravelPeriods.length > 0 && (
                      <Badge variant="default">Traveling</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Total Trips Affected: {parent.totalTripsAffected}</div>
                    <div>Reliability: {parent.reliabilityScore}%</div>
                    <div>Upcoming Travel: {parent.upcomingTravelPeriods.length}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Travel Impact Summary */}
      {selectedParent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarDaysIcon className="h-5 w-5" />
              <span>Travel Impact Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {travelImpacts.length}
                </div>
                <div className="text-sm text-gray-600">Total Impacted Trips</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {travelImpacts.filter(impact => impact.replacementStatus === 'confirmed').length}
                </div>
                <div className="text-sm text-gray-600">Replacements Confirmed</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {travelImpacts.filter(impact => impact.replacementStatus === 'needed').length}
                </div>
                <div className="text-sm text-gray-600">Still Need Coverage</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {travelImpacts.filter(impact => impact.urgency === 'critical').length}
                </div>
                <div className="text-sm text-gray-600">Critical Priority</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Travel Schedule */}
      {selectedParent && selectedParent.upcomingTravelPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upcoming Travel Schedule</span>
              <Button
                size="sm"
                onClick={() => setShowAddTravelModal(true)}
              >
                Add Travel Period
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedParent.upcomingTravelPeriods.map(period => (
                <div key={period.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{period.reason}</h4>
                      <p className="text-sm text-gray-600">
                        {period.startDate} - {period.endDate}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {period.isRecurring && (
                        <Badge variant="outline">
                          <ArrowPathIcon className="h-3 w-3 mr-1" />
                          Recurring
                        </Badge>
                      )}
                      {renderTravelPeriodStatus(period)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Will impact {period.impactedTrips} scheduled trips
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderReplacementsMode = () => (
    <div className="space-y-6">
      {/* Replacement Drivers Pool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserGroupIcon className="h-5 w-5" />
            <span>Available Replacement Drivers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {replacementDrivers.map(driver => (
              <div key={driver.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{driver.name}</h4>
                  <Badge 
                    variant={driver.availability === 'available' ? 'default' : 'secondary'}
                  >
                    {driver.availability}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Relationship:</span>
                    <span className="capitalize">{driver.relationship.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Distance:</span>
                    <span>{driver.distance}km away</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Reliability:</span>
                    <span>{driver.reliability}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Accepted:</span>
                    <span>{driver.acceptedReplacements} replacements</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Impacted Trips Requiring Replacement */}
      <Card>
        <CardHeader>
          <CardTitle>Trips Requiring Replacement Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {travelImpacts
              .filter(impact => impact.replacementStatus === 'needed')
              .map(impact => (
                <div key={impact.tripId} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {impact.childName} - {impact.groupName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {impact.date} at {impact.timeSlot}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {renderUrgencyIndicator(impact.urgency)}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Original driver: <strong>{impact.originalDriver}</strong> (traveling)
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {replacementDrivers
                      .filter(driver => driver.availability === 'available')
                      .map(driver => (
                        <Button
                          key={driver.id}
                          size="sm"
                          variant="outline"
                          onClick={() => handleArrangeReplacement(impact.tripId, driver.id)}
                          disabled={processingReplacement}
                          className="text-sm"
                        >
                          Assign {driver.name}
                          <span className="ml-1 text-xs text-gray-500">
                            ({driver.distance}km • {driver.reliability}%)
                          </span>
                        </Button>
                      ))}
                  </div>
                </div>
              ))}

            {travelImpacts.filter(impact => impact.replacementStatus === 'needed').length === 0 && (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  All Trips Covered
                </h3>
                <p className="text-gray-600">
                  Replacement drivers have been arranged for all impacted trips.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Traveling Parent Support System
          </h1>
          <p className="text-gray-600">
            Manage travel schedules and coordinate replacement coverage
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'overview' ? 'default' : 'outline'}
            onClick={() => setViewMode('overview')}
            size="sm"
          >
            Overview
          </Button>
          <Button
            variant={viewMode === 'schedule' ? 'default' : 'outline'}
            onClick={() => setViewMode('schedule')}
            size="sm"
          >
            Schedule
          </Button>
          <Button
            variant={viewMode === 'replacements' ? 'default' : 'outline'}
            onClick={() => setViewMode('replacements')}
            size="sm"
            className={travelImpacts.filter(i => i.replacementStatus === 'needed').length > 0 ? 'text-orange-600 border-orange-300' : ''}
          >
            Replacements 
            {travelImpacts.filter(i => i.replacementStatus === 'needed').length > 0 && 
              ` (${travelImpacts.filter(i => i.replacementStatus === 'needed').length})`
            }
          </Button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && renderOverviewMode()}
      {viewMode === 'replacements' && renderReplacementsMode()}

      {/* Add Travel Period Modal would go here */}
      {showAddTravelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add Travel Period</h3>
            <p className="text-sm text-gray-600 mb-4">
              Travel period creation form would be implemented here
            </p>
            <Button onClick={() => setShowAddTravelModal(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
