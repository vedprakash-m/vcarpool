// Placeholder for custom types
// This will be properly implemented later.

export interface Family {
  id: string;
  name: string;
  parentIds: string[];
  childIds: string[];
}

export interface Preference {
  id: string;
  familyId: string;
  date: string;
  canDrive: boolean;
}
