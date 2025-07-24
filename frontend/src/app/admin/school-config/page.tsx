'use client';

import React from 'react';
import AdminSchoolConfig from '@/components/admin/AdminSchoolConfig';

export default function AdminSchoolConfigPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <AdminSchoolConfig
          onSchoolsChange={schools => {
            console.log('Schools updated:', schools);
            // Here you could save to database/API
          }}
          onGradesChange={grades => {
            console.log('Grades updated:', grades);
            // Here you could save to database/API
          }}
        />
      </div>
    </div>
  );
}
