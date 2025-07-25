'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  UsersIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface DrivingParent {
  id: string;
  name: string;
  email: string;
  isActiveDriving: boolean;
  currentTripsAssigned: number;
  fairShareTrips: number;
  reliability: number;
  preferences: {
    preferredDays: string[];
    unavailableDays: string[];
    flexibilityScore: number;
  };
}

interface Child {
  id: string;
  name: string;
  grade: string;
  school: string;
  groupId: string;
  groupName: string;
}

interface TripAssignment {
  id: string;
  date: string;
  timeSlot: string;
  childId: string;
  childName: string;
  groupId: string;
  groupName: string;
  assignedDriverId: string;
  assignedDriverName: string;
  canReassignInternally: boolean;
  requiresApproval: boolean;
  conflictsWith?: string[];
}

interface GroupConflict {
  date: string;
  conflictingAssignments: TripAssignment[];
  type: 'time_overlap' | 'resource_conflict';
  severity: 'low' | 'medium' | 'high';
}

interface FamilyData {
  id: string;
  familyName: string;
  homeAddress: string;
  drivingParents: DrivingParent[];
  children: Child[];
  currentAssignments: TripAssignment[];
  totalTripsAssigned: number;
  fairShareTrips: number;
  crossGroupConflicts: any[];
}

interface EnhancedParentStudentAssignmentProps {
  familyId?: string;
  onAssignmentChanged?: (assignmentId: string, newDriverId: string) => void;
}

export default function EnhancedParentStudentAssignment({
  familyId,
  onAssignmentChanged,
}: EnhancedParentStudentAssignmentProps) {
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<TripAssignment | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [processingReassignment, setProcessingReassignment] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'conflicts'>('overview');

  const { toast } = useToast();

  useEffect(() => {
    if (familyId) {
      loadFamilyData();
    } else {
      loadCurrentUserFamilyData();
    }
  }, [familyId]);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      const endpoint = familyId 
        ? `/api/admin-parent-assignments?familyId=${familyId}`
        : '/api/families/me/assignments';
        
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFamilyData(data);
      }
    } catch (error) {
      console.error('Error loading family data:', error);
      toast({
        title: 'Loading Error',
        description: 'Failed to load family assignment data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUserFamilyData = async () => {
    // Load current user's family data
    await loadFamilyData();
  };

  const handleIntraFamilyReassignment = async (assignmentId: string, newDriverId: string) => {
    if (!familyData) return;

    try {
      setProcessingReassignment(true);
      
      const response = await fetch('/api/families/reassign-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          assignmentId,
          newDriverId,
          familyId: familyData.id,
          reassignmentType: 'intra-family', // No approval needed
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reassign trip');
      }

      const result = await response.json();

      toast({
        title: 'Trip Reassigned Successfully',
        description: `${result.assignmentDetails.childName}'s trip has been reassigned. All group members have been notified.`,
      });

      // Reload family data
      await loadFamilyData();
      setShowReassignModal(false);
      setSelectedAssignment(null);

      // Call callback if provided
      if (onAssignmentChanged) {
        onAssignmentChanged(assignmentId, newDriverId);
      }

    } catch (error) {
      console.error('Error reassigning trip:', error);
      toast({
        title: 'Reassignment Failed',
        description: 'Failed to reassign trip. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingReassignment(false);
    }
  };

  const detectCrossGroupConflicts = (): GroupConflict[] => {
    if (!familyData) return [];

    const conflicts: GroupConflict[] = [];
    const assignmentsByDate = new Map<string, TripAssignment[]>();

    // Group assignments by date
    familyData.currentAssignments.forEach(assignment => {
      if (!assignmentsByDate.has(assignment.date)) {
        assignmentsByDate.set(assignment.date, []);
      }
      assignmentsByDate.get(assignment.date)!.push(assignment);
    });

    // Check for conflicts
    assignmentsByDate.forEach((assignments, date) => {
      if (assignments.length > 1) {
        // Multiple assignments on same date - check for conflicts
        const drivingAssignments = assignments.filter((a: TripAssignment) => 
          familyData.drivingParents.some(parent => parent.id === a.assignedDriverId)
        );

        if (drivingAssignments.length > 1) {
          // Potential conflict - check time overlap
          const timeConflicts = drivingAssignments.filter((assignment: TripAssignment, index: number) => {
            return drivingAssignments.slice(index + 1).some((otherAssignment: TripAssignment) => {
              const time1 = new Date(`2024-01-01 ${assignment.timeSlot}`);
              const time2 = new Date(`2024-01-01 ${otherAssignment.timeSlot}`);
              const diffMinutes = Math.abs(time1.getTime() - time2.getTime()) / (1000 * 60);
              return diffMinutes < 60; // Conflict if within 1 hour
            });
          });

          if (timeConflicts.length > 0) {
            conflicts.push({
              date,
              conflictingAssignments: drivingAssignments,
              type: 'time_overlap',
              severity: 'high',
            });
          }
        }
      }
    });

    return conflicts;
  };

  const renderFairnessIndicator = (parent: DrivingParent) => {
    const fairnessRatio = parent.currentTripsAssigned / parent.fairShareTrips;
    let status = 'balanced';
    let color = 'green';
    let text = 'Meeting fair share';

    if (fairnessRatio > 1.2) {
      status = 'above';
      color = 'red';
      text = 'Above fair share';
    } else if (fairnessRatio < 0.8) {
      status = 'below';
      color = 'orange';
      text = 'Below fair share';
    }

    return (
      <div className={`flex items-center text-sm text-${color}-600`}>
        <div className={`w-2 h-2 rounded-full bg-${color}-600 mr-2`}></div>
        {text}
      </div>
    );
  };

  const renderOverviewMode = () => (
    <div className="space-y-6">
      {/* Family Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserGroupIcon className="h-5 w-5" />
            <span>{familyData?.familyName} Family Assignment Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Driving Parents Status */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Driving Parents</h4>
              <div className="space-y-3">
                {familyData?.drivingParents.map(parent => (
                  <div key={parent.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{parent.name}</span>
                      <Badge variant={parent.isActiveDriving ? 'default' : 'secondary'}>
                        {parent.isActiveDriving ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Assigned: {parent.currentTripsAssigned} trips</div>
                      <div>Fair Share: {parent.fairShareTrips} trips</div>
                      <div>Reliability: {parent.reliability}%</div>
                      {renderFairnessIndicator(parent)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Children & Groups */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Children & Groups</h4>
              <div className="space-y-3">
                {familyData?.children.map(child => (
                  <div key={child.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{child.name}</span>
                      <span className="text-sm text-gray-500">{child.grade}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>{child.school}</div>
                      <div className="text-blue-600">{child.groupName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Summary */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Weekly Summary</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Assignments:</span>
                    <span className="font-medium">{familyData?.currentAssignments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fair Share Target:</span>
                    <span className="font-medium">{familyData?.fairShareTrips}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cross-Group Conflicts:</span>
                    <span className={`font-medium ${detectCrossGroupConflicts().length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {detectCrossGroupConflicts().length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {familyData && familyData.currentAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Reassignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {familyData.currentAssignments
                .filter(assignment => assignment.canReassignInternally)
                .slice(0, 4)
                .map(assignment => (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{assignment.childName}</div>
                        <div className="text-sm text-gray-600">
                          {assignment.date} at {assignment.timeSlot}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowReassignModal(true);
                        }}
                      >
                        <ArrowsRightLeftIcon className="h-4 w-4 mr-1" />
                        Reassign
                      </Button>
                    </div>
                    <div className="text-sm text-gray-500">
                      Currently: {assignment.assignedDriverName}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderConflictsMode = () => {
    const conflicts = detectCrossGroupConflicts();

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
              <span>Cross-Group Scheduling Conflicts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conflicts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Conflicts Detected
                </h3>
                <p className="text-gray-600">
                  Your family's carpool schedule is well-balanced with no timing conflicts.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                      <span className="font-medium text-orange-900">
                        Schedule Conflict on {conflict.date}
                      </span>
                      <Badge variant="destructive">High Priority</Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {conflict.conflictingAssignments.map((assignment: TripAssignment) => (
                        <div key={assignment.id} className="bg-white rounded border p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{assignment.childName}</div>
                              <div className="text-sm text-gray-600">
                                {assignment.groupName} • {assignment.timeSlot}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{assignment.assignedDriverName}</div>
                              <div className="text-xs text-gray-500">Assigned Driver</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Suggested Resolution:</strong> Consider reassigning one of these trips to another family member or request a swap with another family.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderReassignmentModal = () => {
    if (!showReassignModal || !selectedAssignment || !familyData) return null;

    const availableDrivers = familyData.drivingParents.filter(
      parent => parent.id !== selectedAssignment.assignedDriverId && parent.isActiveDriving
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium mb-4">
            Reassign Trip for {selectedAssignment.childName}
          </h3>
          
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">
              <div><strong>Date:</strong> {selectedAssignment.date}</div>
              <div><strong>Time:</strong> {selectedAssignment.timeSlot}</div>
              <div><strong>Group:</strong> {selectedAssignment.groupName}</div>
              <div><strong>Current Driver:</strong> {selectedAssignment.assignedDriverName}</div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Select New Driver:
            </label>
            <div className="space-y-2">
              {availableDrivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => handleIntraFamilyReassignment(selectedAssignment.id, driver.id)}
                  disabled={processingReassignment}
                  className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{driver.name}</div>
                      <div className="text-sm text-gray-600">
                        {driver.currentTripsAssigned} trips assigned • {driver.reliability}% reliable
                      </div>
                    </div>
                    {renderFairnessIndicator(driver)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Intra-Family Reassignment:</strong> This change will happen immediately and all group members will be notified automatically.
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowReassignModal(false);
                setSelectedAssignment(null);
              }}
              disabled={processingReassignment}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };

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

  if (!familyData) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Family Data Found
            </h3>
            <p className="text-gray-600">
              Unable to load family assignment information. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with View Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Enhanced Parent-Student Assignments
          </h1>
          <p className="text-gray-600">
            Manage and coordinate family carpool assignments across multiple groups
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
            variant={viewMode === 'detailed' ? 'default' : 'outline'}
            onClick={() => setViewMode('detailed')}
            size="sm"
          >
            Detailed
          </Button>
          <Button
            variant={viewMode === 'conflicts' ? 'default' : 'outline'}
            onClick={() => setViewMode('conflicts')}
            size="sm"
            className={detectCrossGroupConflicts().length > 0 ? 'text-red-600 border-red-300' : ''}
          >
            Conflicts {detectCrossGroupConflicts().length > 0 && `(${detectCrossGroupConflicts().length})`}
          </Button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && renderOverviewMode()}
      {viewMode === 'conflicts' && renderConflictsMode()}

      {/* Reassignment Modal */}
      {renderReassignmentModal()}
    </div>
  );
}
