'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, MapPin, Users } from 'lucide-react';
import {
  School,
  GradeConfig,
  SUPPORTED_GRADES,
  DEFAULT_SCHOOLS,
} from '@/config/schools';

interface AdminSchoolConfigProps {
  onSchoolsChange?: (schools: School[]) => void;
  onGradesChange?: (grades: GradeConfig[]) => void;
}

export default function AdminSchoolConfig({
  onSchoolsChange,
  onGradesChange,
}: AdminSchoolConfigProps) {
  const [schools, setSchools] = useState<School[]>(DEFAULT_SCHOOLS);
  const [grades, setGrades] = useState<GradeConfig[]>(SUPPORTED_GRADES);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editingGrade, setEditingGrade] = useState<GradeConfig | null>(null);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [showAddGrade, setShowAddGrade] = useState(false);

  // School management
  const addSchool = (school: Omit<School, 'id'>) => {
    const newSchool: School = {
      ...school,
      id: `school-${Date.now()}`,
    };
    const updatedSchools = [...schools, newSchool];
    setSchools(updatedSchools);
    onSchoolsChange?.(updatedSchools);
    setShowAddSchool(false);
  };

  const updateSchool = (schoolId: string, updates: Partial<School>) => {
    const updatedSchools = schools.map(school =>
      school.id === schoolId ? { ...school, ...updates } : school
    );
    setSchools(updatedSchools);
    onSchoolsChange?.(updatedSchools);
    setEditingSchool(null);
  };

  const deleteSchool = (schoolId: string) => {
    const updatedSchools = schools.filter(school => school.id !== schoolId);
    setSchools(updatedSchools);
    onSchoolsChange?.(updatedSchools);
  };

  // Grade management
  const addGrade = (grade: Omit<GradeConfig, 'id'>) => {
    const newGrade: GradeConfig = {
      ...grade,
      id: `grade-${Date.now()}`,
    };
    const updatedGrades = [...grades, newGrade];
    setGrades(updatedGrades);
    onGradesChange?.(updatedGrades);
    setShowAddGrade(false);
  };

  const updateGrade = (gradeId: string, updates: Partial<GradeConfig>) => {
    const updatedGrades = grades.map(grade =>
      grade.id === gradeId ? { ...grade, ...updates } : grade
    );
    setGrades(updatedGrades);
    onGradesChange?.(updatedGrades);
    setEditingGrade(null);
  };

  const deleteGrade = (gradeId: string) => {
    const updatedGrades = grades.filter(grade => grade.id !== gradeId);
    setGrades(updatedGrades);
    onGradesChange?.(updatedGrades);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          School & Grade Configuration
        </h1>
        <p className="text-gray-600 mb-8">
          Configure supported schools and grades for the Carpool platform.
          These will appear as dropdown options during parent registration.
        </p>

        {/* Schools Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Schools</h2>
            <button
              onClick={() => setShowAddSchool(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add School
            </button>
          </div>

          <div className="grid gap-4">
            {schools.map(school => (
              <SchoolCard
                key={school.id}
                school={school}
                onEdit={() => setEditingSchool(school)}
                onDelete={() => deleteSchool(school.id)}
                onToggleActive={active =>
                  updateSchool(school.id, { isActive: active })
                }
              />
            ))}
          </div>
        </div>

        {/* Grades Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Supported Grades
            </h2>
            <button
              onClick={() => setShowAddGrade(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Grade
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grades.map(grade => (
              <GradeCard
                key={grade.id}
                grade={grade}
                onEdit={() => setEditingGrade(grade)}
                onDelete={() => deleteGrade(grade.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit School Modal */}
      {(showAddSchool || editingSchool) && (
        <SchoolFormModal
          school={editingSchool}
          onSave={
            editingSchool
              ? updates => updateSchool(editingSchool.id, updates)
              : addSchool
          }
          onCancel={() => {
            setShowAddSchool(false);
            setEditingSchool(null);
          }}
        />
      )}

      {/* Add/Edit Grade Modal */}
      {(showAddGrade || editingGrade) && (
        <GradeFormModal
          grade={editingGrade}
          onSave={
            editingGrade
              ? updates => updateGrade(editingGrade.id, updates)
              : addGrade
          }
          onCancel={() => {
            setShowAddGrade(false);
            setEditingGrade(null);
          }}
        />
      )}
    </div>
  );
}

// School Card Component
interface SchoolCardProps {
  school: School;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}

const SchoolCard: React.FC<SchoolCardProps> = ({
  school,
  onEdit,
  onDelete,
  onToggleActive,
}) => (
  <div
    className={`border rounded-lg p-4 ${
      school.isActive
        ? 'border-green-200 bg-green-50'
        : 'border-gray-200 bg-gray-50'
    }`}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <h3 className="font-semibold text-gray-900">{school.name}</h3>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              school.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {school.isActive ? 'Active' : 'Inactive'}
          </span>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full capitalize">
            {school.type}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <MapPin className="h-4 w-4 mr-1" />
          {school.address}, {school.city}, {school.state} {school.zipCode}
        </div>
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <Users className="h-4 w-4 mr-1" />
          Grades: {school.grades.join(', ')}
        </div>
        <p className="text-sm text-gray-600">
          Service Radius: {school.serviceRadius} miles
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onToggleActive(!school.isActive)}
          className={`px-3 py-1 text-sm rounded-md ${
            school.isActive
              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
        >
          {school.isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={onEdit}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

// Grade Card Component
interface GradeCardProps {
  grade: GradeConfig;
  onEdit: () => void;
  onDelete: () => void;
}

const GradeCard: React.FC<GradeCardProps> = ({ grade, onEdit, onDelete }) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{grade.label}</h3>
        <p className="text-sm text-gray-600 mb-2">
          Numeric: {grade.numericValue}
        </p>
        <div className="flex flex-wrap gap-1">
          {grade.schoolTypes.map(type => (
            <span
              key={type}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full capitalize"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center space-x-1">
        <button
          onClick={onEdit}
          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
        >
          <Edit className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  </div>
);

// School Form Modal Component
interface SchoolFormModalProps {
  school?: School | null;
  onSave: (school: any) => void;
  onCancel: () => void;
}

const SchoolFormModal: React.FC<SchoolFormModalProps> = ({
  school,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: school?.name || '',
    address: school?.address || '',
    city: school?.city || '',
    state: school?.state || '',
    zipCode: school?.zipCode || '',
    type: school?.type || 'elementary',
    grades: school?.grades || [],
    serviceRadius: school?.serviceRadius || 10,
    isActive: school?.isActive ?? true,
  });

  const handleGradeToggle = (gradeId: string) => {
    setFormData(prev => ({
      ...prev,
      grades: prev.grades.includes(gradeId)
        ? prev.grades.filter(g => g !== gradeId)
        : [...prev.grades, gradeId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {school ? 'Edit School' : 'Add New School'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={e =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="elementary">Elementary</option>
                  <option value="middle">Middle School</option>
                  <option value="high">High School</option>
                  <option value="k12">K-12</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={e =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={e =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={e =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.zipCode}
                  onChange={e =>
                    setFormData({ ...formData, zipCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Radius (miles)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.serviceRadius}
                onChange={e =>
                  setFormData({
                    ...formData,
                    serviceRadius: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supported Grades *
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {SUPPORTED_GRADES.map(grade => (
                  <label
                    key={grade.id}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={formData.grades.includes(grade.id)}
                      onChange={() => handleGradeToggle(grade.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{grade.id}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={e =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Active (available for registration)
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {school ? 'Update School' : 'Add School'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Grade Form Modal Component
interface GradeFormModalProps {
  grade?: GradeConfig | null;
  onSave: (grade: any) => void;
  onCancel: () => void;
}

const GradeFormModal: React.FC<GradeFormModalProps> = ({
  grade,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    label: grade?.label || '',
    numericValue: grade?.numericValue || 0,
    schoolTypes: grade?.schoolTypes || ['elementary'],
  });

  const handleSchoolTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      schoolTypes: prev.schoolTypes.includes(type)
        ? prev.schoolTypes.filter(t => t !== type)
        : [...prev.schoolTypes, type],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {grade ? 'Edit Grade' : 'Add New Grade'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Label *
              </label>
              <input
                type="text"
                required
                value={formData.label}
                onChange={e =>
                  setFormData({ ...formData, label: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 8th Grade, Kindergarten"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numeric Value *
              </label>
              <input
                type="number"
                required
                min="0"
                max="12"
                value={formData.numericValue}
                onChange={e =>
                  setFormData({
                    ...formData,
                    numericValue: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Types *
              </label>
              <div className="space-y-2">
                {['elementary', 'middle', 'high', 'k12'].map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.schoolTypes.includes(type)}
                      onChange={() => handleSchoolTypeToggle(type)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {grade ? 'Update Grade' : 'Add Grade'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
