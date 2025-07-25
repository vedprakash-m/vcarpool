'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CogIcon,
  ClockIcon,
  MapPinIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

interface TeslaSTEMEvent {
  id: string;
  title: string;
  type: 'workshop' | 'field_trip' | 'competition' | 'presentation' | 'guest_speaker';
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  participatingStudents: string[];
  transportationRequired: boolean;
  specialRequirements?: string[];
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  carpoolGroupsAffected: string[];
}

interface StudentParticipation {
  studentId: string;
  studentName: string;
  grade: string;
  parentName: string;
  parentEmail: string;
  participationLevel: 'full' | 'partial' | 'observer';
  specialNeeds?: string;
  emergencyContact: string;
  medicalInfo?: string;
}

interface TransportationPlan {
  eventId: string;
  eventTitle: string;
  totalStudents: number;
  carpoolGroups: {
    groupId: string;
    groupName: string;
    students: StudentParticipation[];
    assignedDriver: string;
    departureTime: string;
    pickupLocation: string;
    estimatedReturnTime: string;
    status: 'planned' | 'confirmed' | 'en_route' | 'arrived' | 'returning' | 'completed';
  }[];
  alternativeTransport?: {
    type: 'school_bus' | 'parent_shuttle' | 'tesla_transport';
    details: string;
  };
}

interface BetaTestingMetrics {
  totalFamilies: number;
  activeFamilies: number;
  totalEvents: number;
  successfulTransportations: number;
  reportedIssues: number;
  parentSatisfactionScore: number;
  systemReliabilityScore: number;
  avgResponseTime: number;
}

interface TeslaSTEMIntegrationProps {
  schoolId?: string;
  isAdminView?: boolean;
  onEventUpdated?: (eventId: string, updates: Partial<TeslaSTEMEvent>) => void;
}

export default function TeslaSTEMIntegration({
  schoolId,
  isAdminView = false,
  onEventUpdated,
}: TeslaSTEMIntegrationProps) {
  const [stemEvents, setSTEMEvents] = useState<TeslaSTEMEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TeslaSTEMEvent | null>(null);
  const [transportationPlans, setTransportationPlans] = useState<TransportationPlan[]>([]);
  const [betaMetrics, setBetaMetrics] = useState<BetaTestingMetrics | null>(null);
  const [studentParticipation, setStudentParticipation] = useState<StudentParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'events' | 'transportation' | 'beta_testing' | 'analytics'>('events');
  const [showEventModal, setShowEventModal] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadTeslaSTEMData();
  }, [schoolId]);

  const loadTeslaSTEMData = async () => {
    try {
      setLoading(true);
      const endpoint = schoolId 
        ? `/api/tesla-stem/schools/${schoolId}` 
        : '/api/tesla-stem/events';

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSTEMEvents(data.events || []);
        setTransportationPlans(data.transportationPlans || []);
        setBetaMetrics(data.betaMetrics || null);
        
        if (data.events && data.events.length > 0) {
          setSelectedEvent(data.events[0]);
          await loadEventParticipation(data.events[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading Tesla STEM data:', error);
      toast({
        title: 'Loading Error',
        description: 'Failed to load Tesla STEM integration data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEventParticipation = async (eventId: string) => {
    try {
      const response = await fetch(`/api/tesla-stem/events/${eventId}/participation`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const participation = await response.json();
        setStudentParticipation(participation);
      }
    } catch (error) {
      console.error('Error loading event participation:', error);
    }
  };

  const handleGenerateTransportationPlan = async (eventId: string) => {
    try {
      const response = await fetch('/api/tesla-stem/generate-transportation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          eventId,
          optimizeFor: 'efficiency', // Could be 'safety', 'cost', etc.
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate transportation plan');
      }

      const result = await response.json();

      toast({
        title: 'Transportation Plan Generated',
        description: `Created coordinated plan for ${result.totalStudents} students across ${result.carpoolGroups.length} groups.`,
      });

      // Reload transportation plans
      await loadTeslaSTEMData();

    } catch (error) {
      console.error('Error generating transportation plan:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate transportation plan. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const renderEventTypeIcon = (type: string) => {
    const iconMap = {
      workshop: BeakerIcon,
      field_trip: MapPinIcon,
      competition: ChartBarIcon,
      presentation: AcademicCapIcon,
      guest_speaker: UserGroupIcon,
    };

    const IconComponent = iconMap[type as keyof typeof iconMap] || AcademicCapIcon;
    return <IconComponent className="h-5 w-5" />;
  };

  const renderEventStatus = (status: string) => {
    const statusConfig = {
      scheduled: { color: 'gray', label: 'Scheduled' },
      confirmed: { color: 'blue', label: 'Confirmed' },
      in_progress: { color: 'green', label: 'In Progress' },
      completed: { color: 'green', label: 'Completed' },
      cancelled: { color: 'red', label: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    
    return (
      <Badge variant={status === 'confirmed' || status === 'in_progress' ? 'default' : 'secondary'}>
        {config.label}
      </Badge>
    );
  };

  const renderEventsMode = () => (
    <div className="space-y-6">
      {/* Events Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AcademicCapIcon className="h-5 w-5" />
              <span>Tesla STEM Program Events</span>
            </div>
            {isAdminView && (
              <Button onClick={() => setShowEventModal(true)}>
                Add Event
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stemEvents.map(event => (
              <div
                key={event.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedEvent?.id === event.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedEvent(event);
                  loadEventParticipation(event.id);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {renderEventTypeIcon(event.type)}
                    <h4 className="font-medium text-sm">{event.title}</h4>
                  </div>
                  {renderEventStatus(event.status)}
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <CalendarDaysIcon className="h-4 w-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>{event.startTime} - {event.endTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPinIcon className="h-4 w-4" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{event.participatingStudents.length} students</span>
                    {event.transportationRequired && (
                      <Badge variant="outline" className="text-xs">
                        Transport Needed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Event Details */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {renderEventTypeIcon(selectedEvent.type)}
              <span>{selectedEvent.title}</span>
              {renderEventStatus(selectedEvent.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Event Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Event Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span>{selectedEvent.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span>{selectedEvent.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="capitalize">{selectedEvent.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Students:</span>
                    <span>{selectedEvent.participatingStudents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Groups Affected:</span>
                    <span>{selectedEvent.carpoolGroupsAffected.length}</span>
                  </div>
                </div>

                {selectedEvent.specialRequirements && selectedEvent.specialRequirements.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Special Requirements</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedEvent.specialRequirements.map((req, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Participating Students */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Participating Students</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {studentParticipation.map(student => (
                    <div key={student.studentId} className="border border-gray-200 rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{student.studentName}</span>
                        <Badge variant="outline" className="text-xs">
                          {student.participationLevel}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>Grade {student.grade} • Parent: {student.parentName}</div>
                        {student.specialNeeds && (
                          <div className="text-orange-600 mt-1">
                            Special needs: {student.specialNeeds}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transportation Action */}
            {selectedEvent.transportationRequired && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-blue-900">Transportation Required</h5>
                    <p className="text-sm text-blue-700">
                      This event requires coordinated transportation for {selectedEvent.participatingStudents.length} students
                      across {selectedEvent.carpoolGroupsAffected.length} carpool groups.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleGenerateTransportationPlan(selectedEvent.id)}
                    size="sm"
                  >
                    Generate Plan
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderTransportationMode = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPinIcon className="h-5 w-5" />
            <span>Event Transportation Plans</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transportationPlans.length === 0 ? (
            <div className="text-center py-8">
              <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Transportation Plans
              </h3>
              <p className="text-gray-600">
                Generate transportation plans for events that require coordinated travel.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transportationPlans.map(plan => (
                <div key={plan.eventId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{plan.eventTitle}</h4>
                      <p className="text-sm text-gray-600">
                        {plan.totalStudents} students • {plan.carpoolGroups.length} carpool groups
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plan.carpoolGroups.map(group => (
                      <div key={group.groupId} className="border border-gray-100 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm">{group.groupName}</h5>
                          <Badge 
                            variant={group.status === 'confirmed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {group.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>Driver: {group.assignedDriver}</div>
                          <div>Students: {group.students.length}</div>
                          <div>Departure: {group.departureTime}</div>
                          <div>Pickup: {group.pickupLocation}</div>
                          <div>Return: {group.estimatedReturnTime}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {plan.alternativeTransport && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <h6 className="font-medium text-sm mb-1">Alternative Transportation</h6>
                      <p className="text-xs text-gray-600">
                        {plan.alternativeTransport.type.replace('_', ' ')}: {plan.alternativeTransport.details}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderBetaTestingMode = () => (
    <div className="space-y-6">
      {/* Beta Testing Metrics Dashboard */}
      {betaMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BeakerIcon className="h-5 w-5" />
              <span>Beta Testing Dashboard</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {betaMetrics.activeFamilies}/{betaMetrics.totalFamilies}
                </div>
                <div className="text-sm text-gray-600">Active Families</div>
                <div className="text-xs text-gray-500">
                  {Math.round((betaMetrics.activeFamilies / betaMetrics.totalFamilies) * 100)}% participation
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {betaMetrics.totalEvents}
                </div>
                <div className="text-sm text-gray-600">STEM Events</div>
                <div className="text-xs text-gray-500">
                  {betaMetrics.successfulTransportations} successful transports
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {betaMetrics.parentSatisfactionScore}%
                </div>
                <div className="text-sm text-gray-600">Parent Satisfaction</div>
                <div className="text-xs text-gray-500">
                  Based on {betaMetrics.activeFamilies} responses
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {betaMetrics.systemReliabilityScore}%
                </div>
                <div className="text-sm text-gray-600">System Reliability</div>
                <div className="text-xs text-gray-500">
                  {betaMetrics.reportedIssues} issues reported
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Response Time:</span>
                      <span>{betaMetrics.avgResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className="text-green-600">
                        {Math.round((betaMetrics.successfulTransportations / betaMetrics.totalEvents) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issue Rate:</span>
                      <span className={betaMetrics.reportedIssues > 5 ? 'text-red-600' : 'text-green-600'}>
                        {Math.round((betaMetrics.reportedIssues / betaMetrics.totalEvents) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Beta Readiness Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Core functionality stable</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <span className="text-sm">User feedback positive</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {betaMetrics.systemReliabilityScore > 95 ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
                      )}
                      <span className="text-sm">System reliability acceptable</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {betaMetrics.reportedIssues < 5 ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
                      )}
                      <span className="text-sm">Issue count within limits</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beta Testing Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Production Readiness Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Technical Requirements</h4>
              <div className="space-y-2">
                {[
                  { item: 'Event management system', status: 'complete' },
                  { item: 'Transportation coordination', status: 'complete' },
                  { item: 'Real-time notifications', status: 'complete' },
                  { item: 'Parent mobile interface', status: 'complete' },
                  { item: 'Admin dashboard', status: 'complete' },
                  { item: 'Emergency protocols', status: 'complete' },
                  { item: 'Data backup & recovery', status: 'pending' },
                  { item: 'Load testing', status: 'pending' },
                ].map((req, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    {req.status === 'complete' ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <ClockIcon className="h-4 w-4 text-orange-600" />
                    )}
                    <span className="text-sm">{req.item}</span>
                    <Badge 
                      variant={req.status === 'complete' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Program Requirements</h4>
              <div className="space-y-2">
                {[
                  { item: 'Tesla STEM curriculum integration', status: 'complete' },
                  { item: 'Parent training materials', status: 'complete' },
                  { item: 'Safety protocols documented', status: 'complete' },
                  { item: 'School administrator training', status: 'complete' },
                  { item: 'Student onboarding process', status: 'complete' },
                  { item: 'Feedback collection system', status: 'complete' },
                  { item: 'Legal compliance review', status: 'pending' },
                  { item: 'Insurance verification', status: 'pending' },
                ].map((req, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    {req.status === 'complete' ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <ClockIcon className="h-4 w-4 text-orange-600" />
                    )}
                    <span className="text-sm">{req.item}</span>
                    <Badge 
                      variant={req.status === 'complete' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
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
            Tesla STEM Integration & Beta Readiness
          </h1>
          <p className="text-gray-600">
            Coordinate STEM program events and monitor beta testing progress
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'events' ? 'default' : 'outline'}
            onClick={() => setViewMode('events')}
            size="sm"
          >
            Events
          </Button>
          <Button
            variant={viewMode === 'transportation' ? 'default' : 'outline'}
            onClick={() => setViewMode('transportation')}
            size="sm"
          >
            Transportation
          </Button>
          <Button
            variant={viewMode === 'beta_testing' ? 'default' : 'outline'}
            onClick={() => setViewMode('beta_testing')}
            size="sm"
          >
            Beta Testing
          </Button>
          <Button
            variant={viewMode === 'analytics' ? 'default' : 'outline'}
            onClick={() => setViewMode('analytics')}
            size="sm"
          >
            Analytics
          </Button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'events' && renderEventsMode()}
      {viewMode === 'transportation' && renderTransportationMode()}
      {viewMode === 'beta_testing' && renderBetaTestingMode()}

      {/* Event Creation Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Create Tesla STEM Event</h3>
            <p className="text-sm text-gray-600 mb-4">
              Event creation form would be implemented here
            </p>
            <Button onClick={() => setShowEventModal(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
