'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  MapPinIcon,
  UsersIcon,
  ClockIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface GroupTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultSettings: {
    maxMembers: number;
    serviceRadiusMiles: number;
    timeSlots: string[];
    targetAgeGroups: string[];
  };
}

interface SchoolInfo {
  id: string;
  name: string;
  address: string;
  distanceFromUser: number;
}

interface ParentLocationInfo {
  address: string;
  latitude: number;
  longitude: number;
  schoolsInArea: SchoolInfo[];
}

interface ParentInitiatedGroupCreationProps {
  searchCriteria?: {
    schoolId?: string;
    schoolName?: string;
    area?: string;
  };
  onGroupCreated?: (groupId: string) => void;
}

const GROUP_TEMPLATES: GroupTemplate[] = [
  {
    id: 'morning-pickup',
    name: 'Morning School Pickup',
    description: 'Daily morning transportation to school',
    icon: '🌅',
    defaultSettings: {
      maxMembers: 8,
      serviceRadiusMiles: 5,
      timeSlots: ['7:00 AM', '7:15 AM', '7:30 AM', '7:45 AM'],
      targetAgeGroups: ['Elementary', 'Middle School', 'High School'],
    },
  },
  {
    id: 'afternoon-pickup',
    name: 'After School Pickup',
    description: 'Daily afternoon transportation from school',
    icon: '🏫',
    defaultSettings: {
      maxMembers: 8,
      serviceRadiusMiles: 5,
      timeSlots: ['2:30 PM', '3:00 PM', '3:15 PM', '3:30 PM'],
      targetAgeGroups: ['Elementary', 'Middle School', 'High School'],
    },
  },
  {
    id: 'tesla-stem-specialized',
    name: 'Tesla STEM High School',
    description: 'Specialized group for Tesla STEM High School families',
    icon: '⚡',
    defaultSettings: {
      maxMembers: 10,
      serviceRadiusMiles: 25,
      timeSlots: ['7:30 AM', '7:45 AM', '8:00 AM'],
      targetAgeGroups: ['High School'],
    },
  },
  {
    id: 'activities-club',
    name: 'After-School Activities',
    description: 'Transportation for sports, clubs, and activities',
    icon: '🏃‍♂️',
    defaultSettings: {
      maxMembers: 6,
      serviceRadiusMiles: 8,
      timeSlots: ['4:00 PM', '5:00 PM', '6:00 PM'],
      targetAgeGroups: ['Elementary', 'Middle School', 'High School'],
    },
  },
];

export default function ParentInitiatedGroupCreation({
  searchCriteria,
  onGroupCreated,
}: ParentInitiatedGroupCreationProps) {
  const [step, setStep] = useState<'template' | 'details' | 'confirmation'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<GroupTemplate | null>(null);
  const [parentLocation, setParentLocation] = useState<ParentLocationInfo | null>(null);
  const [groupDetails, setGroupDetails] = useState({
    name: '',
    description: '',
    maxMembers: 8,
    serviceRadiusMiles: 5,
    targetSchoolId: '',
    targetSchoolName: '',
    primaryTimeSlot: '',
    isFlexibleTiming: true,
    welcomeMessage: '',
  });
  const [loading, setLoading] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadParentLocationInfo();
    
    // Pre-populate from search criteria if available
    if (searchCriteria) {
      setGroupDetails(prev => ({
        ...prev,
        targetSchoolId: searchCriteria.schoolId || '',
        targetSchoolName: searchCriteria.schoolName || '',
      }));
    }
  }, [searchCriteria]);

  const loadParentLocationInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/me', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setParentLocation({
          address: userData.homeAddress,
          latitude: userData.latitude,
          longitude: userData.longitude,
          schoolsInArea: userData.nearbySchools || [],
        });
      }
    } catch (error) {
      console.error('Error loading parent location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelection = (template: GroupTemplate) => {
    setSelectedTemplate(template);
    setGroupDetails(prev => ({
      ...prev,
      name: template.id === 'tesla-stem-specialized' 
        ? 'Tesla STEM Morning Carpool'
        : `${template.name} - ${parentLocation?.address.split(',')[1]?.trim() || 'Local Area'}`,
      description: template.description,
      maxMembers: template.defaultSettings.maxMembers,
      serviceRadiusMiles: template.defaultSettings.serviceRadiusMiles,
      primaryTimeSlot: template.defaultSettings.timeSlots[0],
      welcomeMessage: `Welcome to our ${template.name.toLowerCase()} group! We're excited to make school transportation easier and more reliable for all our families.`,
    }));
    setStep('details');
  };

  const handleGroupCreation = async () => {
    if (!selectedTemplate || !parentLocation) return;

    try {
      setCreatingGroup(true);
      
      const groupData = {
        name: groupDetails.name,
        description: groupDetails.description,
        school: {
          id: groupDetails.targetSchoolId,
          name: groupDetails.targetSchoolName,
        },
        settings: {
          maxMembers: groupDetails.maxMembers,
          serviceRadius: groupDetails.serviceRadiusMiles,
          primaryTimeSlot: groupDetails.primaryTimeSlot,
          isFlexibleTiming: groupDetails.isFlexibleTiming,
        },
        location: {
          centerPoint: {
            latitude: parentLocation.latitude,
            longitude: parentLocation.longitude,
          },
          serviceArea: `${groupDetails.serviceRadiusMiles}-mile radius`,
        },
        groupAdmin: {
          autoAssign: true, // Automatically assign creator as Group Admin
          welcomeMessage: groupDetails.welcomeMessage,
        },
        template: {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
        },
        betaProgram: selectedTemplate.id === 'tesla-stem-specialized',
      };

      const response = await fetch('/api/parent-group-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(groupData),
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      const result = await response.json();
      
      toast({
        title: 'Group Created Successfully! 🎉',
        description: `Your ${groupDetails.name} group is now ready. You've been assigned as Group Admin.`,
      });

      setStep('confirmation');

      // Call callback if provided
      if (onGroupCreated) {
        onGroupCreated(result.groupId);
      }

      // Navigate to group management after 3 seconds
      setTimeout(() => {
        router.push(`/groups/${result.groupId}/admin`);
      }, 3000);

    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Creation Failed',
        description: 'Failed to create group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingGroup(false);
    }
  };

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <RocketLaunchIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Start Your Own Carpool Group
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Be the first to organize carpooling for your school and neighborhood! 
          You'll automatically become the Group Admin while keeping your parent role to participate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GROUP_TEMPLATES.map(template => (
          <Card 
            key={template.id}
            className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-2 ${
              template.id === 'tesla-stem-specialized' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => handleTemplateSelection(template)}
          >
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-4xl mb-3">{template.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {template.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {template.description}
                </p>
                
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center justify-center space-x-4">
                    <span className="flex items-center">
                      <UsersIcon className="h-3 w-3 mr-1" />
                      {template.defaultSettings.maxMembers} max
                    </span>
                    <span className="flex items-center">
                      <MapPinIcon className="h-3 w-3 mr-1" />
                      {template.defaultSettings.serviceRadiusMiles}mi radius
                    </span>
                  </div>
                  {template.id === 'tesla-stem-specialized' && (
                    <div className="flex items-center justify-center text-blue-600 font-medium">
                      <StarIcon className="h-3 w-3 mr-1" />
                      Beta Program
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-600 mt-0.5">💡</div>
          <div>
            <p className="text-sm text-gray-700">
              <strong>New to Group Admin role?</strong> Don't worry! You'll get step-by-step guidance to:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• Set up your group preferences and rules</li>
              <li>• Invite other families to join</li>
              <li>• Generate weekly schedules with our algorithm</li>
              <li>• Manage group communication and coordination</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailsForm = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep('template')}
        >
          ← Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Customize Your {selectedTemplate?.name} Group
          </h2>
          <p className="text-gray-600">Fill in the details to set up your group</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Group Details Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={groupDetails.name}
              onChange={(e) => setGroupDetails(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Tesla STEM Morning Carpool"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={groupDetails.description}
              onChange={(e) => setGroupDetails(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Brief description of your carpool group..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Members
              </label>
              <select
                value={groupDetails.maxMembers}
                onChange={(e) => setGroupDetails(prev => ({ ...prev, maxMembers: parseInt(e.target.value) }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={6}>6 families</option>
                <option value={8}>8 families</option>
                <option value={10}>10 families</option>
                <option value={12}>12 families</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Radius
              </label>
              <select
                value={groupDetails.serviceRadiusMiles}
                onChange={(e) => setGroupDetails(prev => ({ ...prev, serviceRadiusMiles: parseInt(e.target.value) }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 miles</option>
                <option value={5}>5 miles</option>
                <option value={8}>8 miles</option>
                <option value={25}>25 miles (Tesla STEM)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Time Slot
            </label>
            <select
              value={groupDetails.primaryTimeSlot}
              onChange={(e) => setGroupDetails(prev => ({ ...prev, primaryTimeSlot: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {selectedTemplate?.defaultSettings.timeSlots.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Welcome Message for New Members
            </label>
            <textarea
              value={groupDetails.welcomeMessage}
              onChange={(e) => setGroupDetails(prev => ({ ...prev, welcomeMessage: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Welcome message for families joining your group..."
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Group Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">{groupDetails.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{groupDetails.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Max Members:</span>
                  <p className="font-medium">{groupDetails.maxMembers} families</p>
                </div>
                <div>
                  <span className="text-gray-500">Service Area:</span>
                  <p className="font-medium">{groupDetails.serviceRadiusMiles} mile radius</p>
                </div>
                <div>
                  <span className="text-gray-500">Primary Time:</span>
                  <p className="font-medium">{groupDetails.primaryTimeSlot}</p>
                </div>
                <div>
                  <span className="text-gray-500">Group Admin:</span>
                  <p className="font-medium">You (auto-assigned)</p>
                </div>
              </div>

              {parentLocation && (
                <div>
                  <span className="text-gray-500 text-sm">Centered Around:</span>
                  <p className="text-sm font-medium mt-1">{parentLocation.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  You'll be the Group Admin
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Review and approve join requests</li>
                  <li>• Generate weekly schedules</li>
                  <li>• Coordinate group communication</li>
                  <li>• Maintain group settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={() => setStep('template')}>
          Back to Templates
        </Button>
        <Button 
          onClick={handleGroupCreation}
          disabled={!groupDetails.name || creatingGroup}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {creatingGroup ? (
            <>Creating Group...</>
          ) : (
            <>
              Create Group
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto">
        <CheckCircleIcon className="h-20 w-20 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Group Created Successfully! 🎉
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Your <strong>{groupDetails.name}</strong> group is now live and ready for families to join. 
          You've been automatically assigned as the Group Admin.
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
          <div className="space-y-3 text-left text-sm">
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 font-bold">1.</span>
              <span>You'll be redirected to your Group Admin dashboard</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Invite families in your area to join</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Once you have 4+ families, start scheduling!</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-gray-500">
        Redirecting to your Group Admin dashboard in a few seconds...
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {step === 'template' && renderTemplateSelection()}
      {step === 'details' && renderDetailsForm()}
      {step === 'confirmation' && renderConfirmation()}
    </div>
  );
}
