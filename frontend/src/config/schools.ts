// School and Grade Configuration for Carpool
export interface School {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  type: 'elementary' | 'middle' | 'high' | 'k12';
  grades: string[];
  isActive: boolean;
  serviceRadius: number; // in miles
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface GradeConfig {
  id: string;
  label: string;
  numericValue: number;
  schoolTypes: string[];
}

// Tesla STEM High School Configuration
export const TESLA_STEM_HIGH_SCHOOL: School = {
  id: 'tesla-stem-redmond',
  name: 'Tesla STEM High School',
  address: '15641 Bel-Red Rd',
  city: 'Redmond',
  state: 'WA',
  zipCode: '98052',
  type: 'high',
  grades: ['8th', '9th', '10th', '11th', '12th'],
  isActive: true,
  serviceRadius: 25,
  coordinates: {
    lat: 47.6565,
    lng: -122.1505,
  },
};

// Supported Grades Configuration
export const SUPPORTED_GRADES: GradeConfig[] = [
  {
    id: 'k',
    label: 'Kindergarten',
    numericValue: 0,
    schoolTypes: ['elementary', 'k12'],
  },
  {
    id: '1st',
    label: '1st Grade',
    numericValue: 1,
    schoolTypes: ['elementary', 'k12'],
  },
  {
    id: '2nd',
    label: '2nd Grade',
    numericValue: 2,
    schoolTypes: ['elementary', 'k12'],
  },
  {
    id: '3rd',
    label: '3rd Grade',
    numericValue: 3,
    schoolTypes: ['elementary', 'k12'],
  },
  {
    id: '4th',
    label: '4th Grade',
    numericValue: 4,
    schoolTypes: ['elementary', 'k12'],
  },
  {
    id: '5th',
    label: '5th Grade',
    numericValue: 5,
    schoolTypes: ['elementary', 'k12'],
  },
  {
    id: '6th',
    label: '6th Grade',
    numericValue: 6,
    schoolTypes: ['middle', 'k12'],
  },
  {
    id: '7th',
    label: '7th Grade',
    numericValue: 7,
    schoolTypes: ['middle', 'k12'],
  },
  {
    id: '8th',
    label: '8th Grade',
    numericValue: 8,
    schoolTypes: ['middle', 'high', 'k12'],
  },
  {
    id: '9th',
    label: '9th Grade',
    numericValue: 9,
    schoolTypes: ['high', 'k12'],
  },
  {
    id: '10th',
    label: '10th Grade',
    numericValue: 10,
    schoolTypes: ['high', 'k12'],
  },
  {
    id: '11th',
    label: '11th Grade',
    numericValue: 11,
    schoolTypes: ['high', 'k12'],
  },
  {
    id: '12th',
    label: '12th Grade',
    numericValue: 12,
    schoolTypes: ['high', 'k12'],
  },
];

// Default Schools (Tesla STEM + expandable)
export const DEFAULT_SCHOOLS: School[] = [TESLA_STEM_HIGH_SCHOOL];

// Helper Functions
export const getGradesForSchool = (school: School): GradeConfig[] => {
  return SUPPORTED_GRADES.filter(
    grade =>
      grade.schoolTypes.includes(school.type) &&
      school.grades.includes(grade.id)
  );
};

export const getSchoolsByType = (type: string): School[] => {
  return DEFAULT_SCHOOLS.filter(
    school => school.type === type && school.isActive
  );
};

export const getAllActiveSchools = (): School[] => {
  return DEFAULT_SCHOOLS.filter(school => school.isActive);
};

export const getSchoolById = (id: string): School | undefined => {
  return DEFAULT_SCHOOLS.find(school => school.id === id);
};

// Tesla STEM specific grades (8th-12th)
export const TESLA_STEM_GRADES = SUPPORTED_GRADES.filter(grade =>
  ['8th', '9th', '10th', '11th', '12th'].includes(grade.id)
);
