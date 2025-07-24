import React, { useState } from 'react';

interface EmergencyAlertProps {
  groupId: string;
  onClose: () => void;
}

const EmergencyAlert: React.FC<EmergencyAlertProps> = ({
  groupId,
  onClose,
}) => {
  const [alertType, setAlertType] = useState('');
  const [description, setDescription] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const emergencyTypes = [
    {
      id: 'traffic_vehicle',
      title: '🚗 Traffic/Vehicle Issue',
      subtitle: 'Car trouble, accident, traffic delay',
    },
    {
      id: 'schedule_emergency',
      title: '⏰ Schedule Emergency',
      subtitle: "Can't make pickup, need immediate help",
    },
    {
      id: 'medical_personal',
      title: '🏥 Medical/Personal Emergency',
      subtitle: 'Health issue, family emergency',
    },
    {
      id: 'contact_needed',
      title: '📞 Need Immediate Contact',
      subtitle: "Can't reach driver/parent, need assistance",
    },
  ];

  const handleTypeSelect = (type: string) => {
    setAlertType(type);
    setShowDetails(true);
  };

  const handleSendAlert = () => {
    // API call would go here
    console.log('Sending emergency alert:', {
      alertType,
      description,
      groupId,
    });

    // Show success message
    alert(
      'Emergency alert sent to your carpool group for coordination assistance.'
    );
    onClose();
  };

  if (!showDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-red-600">
              🚨 Emergency Alert System
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            ⚠️ EMERGENCY: Select the type of situation
          </p>

          <div className="space-y-3">
            {emergencyTypes.map(type => (
              <button
                key={type.id}
                onClick={() => handleTypeSelect(type.id)}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 text-left transition-colors"
              >
                <div className="font-medium text-gray-900">{type.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {type.subtitle}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedType = emergencyTypes.find(t => t.id === alertType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-red-600">
            🚨 {selectedType?.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's happening? (Brief description)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={3}
              placeholder="Minor fender bender on Oak Street. Kids are safe but car is not drivable. Need pickup assistance."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👥 Who should be notified immediately?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">All group members</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Group Admin</span>
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-xs text-yellow-800">
              ⚠️ <strong>Disclaimer:</strong> This alert notifies your carpool
              community for coordination assistance. For life-threatening
              emergencies, call 911 immediately.
            </p>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => setShowDetails(false)}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleSendAlert}
            disabled={!description.trim()}
            className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 transition-colors"
          >
            Send Alert Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyAlert;
