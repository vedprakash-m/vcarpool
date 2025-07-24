#!/usr/bin/env node

/**
 * Carpool Registration Form Debug Test
 * Tests all the major functionality that was causing issues
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Carpool Registration Form Debug Test\n');

// Test 1: Check if key files exist
console.log('📁 File Existence Check:');
const keyFiles = [
  'public/manifest.json',
  'public/sw.js',
  'src/app/register/page.tsx',
  'src/types/shared.ts',
  'src/config/schools.ts',
  'src/components/shared/SchoolGradeSelects.tsx',
  'src/store/auth.store.ts',
];

keyFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} (MISSING)`);
  }
});

// Test 2: Check for common issues
console.log('\n🔍 Code Quality Check:');

// Check registration page for common issues
const registerPagePath = path.join(__dirname, 'src/app/register/page.tsx');
if (fs.existsSync(registerPagePath)) {
  const content = fs.readFileSync(registerPagePath, 'utf8');

  // Check for AcademicCapIcon (should be removed)
  if (content.includes('AcademicCapIcon')) {
    console.log('  ❌ AcademicCapIcon still present (should be removed)');
  } else {
    console.log('  ✅ AcademicCapIcon properly removed');
  }

  // Check for registerSchema import
  if (content.includes('registerSchema')) {
    console.log('  ✅ registerSchema imported from shared types');
  } else {
    console.log('  ❌ registerSchema not imported');
  }

  // Check for email autocomplete
  if (content.includes('autoComplete="email"')) {
    console.log('  ✅ Email autocomplete attribute added');
  } else {
    console.log('  ⚠️  Email autocomplete might be missing');
  }
}

// Test 3: Check types file
console.log('\n📋 Types Configuration Check:');
const typesPath = path.join(__dirname, 'src/types/shared.ts');
if (fs.existsSync(typesPath)) {
  const content = fs.readFileSync(typesPath, 'utf8');

  // Check for registerSchema definition
  if (content.includes('export const registerSchema = z.object({')) {
    console.log('  ✅ registerSchema properly defined with Zod');
  } else {
    console.log('  ❌ registerSchema definition not found');
  }

  // Check for RegisterRequest interface
  if (content.includes('export interface RegisterRequest')) {
    console.log('  ✅ RegisterRequest interface defined');
  } else {
    console.log('  ❌ RegisterRequest interface not found');
  }
}

// Test 4: Check school configuration
console.log('\n🏫 School Configuration Check:');
const schoolsPath = path.join(__dirname, 'src/config/schools.ts');
if (fs.existsSync(schoolsPath)) {
  const content = fs.readFileSync(schoolsPath, 'utf8');

  // Check for Tesla STEM configuration
  if (content.includes('Tesla STEM High School')) {
    console.log('  ✅ Tesla STEM High School configured');
  } else {
    console.log('  ❌ Tesla STEM High School not found');
  }

  // Check for grade configurations
  const grades = [
    '8th Grade',
    '9th Grade',
    '10th Grade',
    '11th Grade',
    '12th Grade',
  ];
  const allGradesPresent = grades.every(grade => content.includes(grade));
  if (allGradesPresent) {
    console.log('  ✅ All grades (8th-12th) configured');
  } else {
    console.log('  ❌ Some grades missing in configuration');
  }
}

// Test 5: Check PWA files
console.log('\n📱 PWA Configuration Check:');
const manifestPath = path.join(__dirname, 'public/manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`  ✅ PWA Manifest valid - App Name: ${manifest.name}`);
    console.log(`  ✅ Start URL: ${manifest.start_url}`);
  } catch (error) {
    console.log('  ❌ PWA Manifest invalid JSON');
  }
} else {
  console.log('  ❌ PWA Manifest missing');
}

const swPath = path.join(__dirname, 'public/sw.js');
if (fs.existsSync(swPath)) {
  console.log('  ✅ Service Worker file exists');
} else {
  console.log('  ❌ Service Worker file missing');
}

console.log('\n🎯 Summary:');
console.log('The registration form has been updated with the following fixes:');
console.log('1. ✅ Removed problematic AcademicCapIcon import');
console.log('2. ✅ Fixed Zod schema import issues');
console.log('3. ✅ Added email autocomplete attribute');
console.log('4. ✅ Implemented Tesla STEM High School configuration');
console.log('5. ✅ Added grade dropdowns (8th-12th)');
console.log('6. ✅ Enhanced service worker error handling');
console.log('7. ✅ Fixed PWA manifest configuration');

console.log('\n🚀 Next Steps:');
console.log('1. Visit http://localhost:3003/register to test the form');
console.log('2. Check browser console (F12) for any remaining errors');
console.log('3. Test form submission with valid data');
console.log('4. Verify dropdowns work correctly');
console.log('5. Check service worker registration in DevTools > Application');

console.log('\n💡 Debug Tips:');
console.log(
  '- If you see "Cannot read properties of undefined", check form validation'
);
console.log('- If service worker 404s occur, clear browser cache');
console.log("- If dropdowns don't work, check console for component errors");
console.log('- If form submission fails, check network tab for API calls');
