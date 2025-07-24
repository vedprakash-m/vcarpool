'use client';

import React from 'react';
import {
  School,
  GradeConfig,
  getAllActiveSchools,
  getGradesForSchool,
  TESLA_STEM_GRADES,
} from '@/config/schools';

interface SchoolSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  schools?: School[];
}

interface GradeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  schoolId?: string;
  grades?: GradeConfig[];
}

export const SchoolSelect: React.FC<SchoolSelectProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Select School',
  required = false,
  schools,
}) => {
  const availableSchools = schools || getAllActiveSchools();

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${className}`}
      required={required}
    >
      <option value="">{placeholder}</option>
      {availableSchools.map(school => (
        <option key={school.id} value={school.name}>
          {school.name} - {school.city}, {school.state}
        </option>
      ))}
    </select>
  );
};

export const GradeSelect: React.FC<GradeSelectProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Select Grade',
  required = false,
  schoolId,
  grades,
}) => {
  // Use provided grades or Tesla STEM grades as default
  let availableGrades = grades || TESLA_STEM_GRADES;

  // If school is specified, filter grades by school
  if (schoolId) {
    const allSchools = getAllActiveSchools();
    const school = allSchools.find(s => s.id === schoolId);
    if (school) {
      availableGrades = getGradesForSchool(school);
    }
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${className}`}
      required={required}
    >
      <option value="">{placeholder}</option>
      {availableGrades.map(grade => (
        <option key={grade.id} value={grade.id}>
          {grade.label}
        </option>
      ))}
    </select>
  );
};
