#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import function registry (single source of truth)
const {
  getRequiredFunctions,
  validateFunctionRegistry,
} = require('../dist/config/functions.config.js');

console.log('🔧 Ensuring all required functions are present...');

// Validate function registry first
const validation = validateFunctionRegistry(__dirname + '/..');
if (!validation.valid) {
  console.error('❌ Function registry validation failed:');
  validation.errors.forEach((error) => console.error(`   ${error}`));
  process.exit(1);
}

if (validation.warnings.length > 0) {
  console.warn('⚠️  Function registry warnings:');
  validation.warnings.forEach((warning) => console.warn(`   ${warning}`));
}

// Get required functions from registry
const requiredFunctions = getRequiredFunctions();
console.log(`� Checking ${requiredFunctions.length} required functions...`);

let hasErrors = false;

requiredFunctions.forEach((funcDef) => {
  const functionName = funcDef.name;
  const rootFunctionDir = functionName;

  // All functions in the registry are at the root level of the backend directory
  const srcFunctionDir = funcDef.sourceDir;

  // Check if function already exists at root level
  if (
    fs.existsSync(rootFunctionDir) &&
    fs.existsSync(path.join(rootFunctionDir, 'index.js')) &&
    fs.existsSync(path.join(rootFunctionDir, 'function.json'))
  ) {
    console.log(`✅ ${functionName}: Already present`);
    return;
  }

  // Function missing or incomplete, try to create it from source
  if (!fs.existsSync(srcFunctionDir)) {
    console.log(`❌ ${functionName}: Source not found in ${srcFunctionDir}`);
    hasErrors = true;
    return;
  }

  try {
    // Create root function directory
    if (!fs.existsSync(rootFunctionDir)) {
      fs.mkdirSync(rootFunctionDir, { recursive: true });
    }

    // Copy function.json
    const srcFunctionJson = path.join(srcFunctionDir, 'function.json');
    const destFunctionJson = path.join(rootFunctionDir, 'function.json');

    if (fs.existsSync(srcFunctionJson)) {
      fs.copyFileSync(srcFunctionJson, destFunctionJson);
      console.log(`✅ ${functionName}: Copied function.json`);
    } else {
      console.log(`❌ ${functionName}: function.json not found`);
      return;
    }

    // Try to copy index.js (either from source for JS functions or from dist for TS functions)
    const srcIndexJs = path.join(srcFunctionDir, 'index.js');
    const distIndexJs = path.join('dist', 'functions', functionName, 'index.js');
    const destIndexJs = path.join(rootFunctionDir, 'index.js');

    if (fs.existsSync(srcIndexJs)) {
      // JavaScript source exists, copy it
      fs.copyFileSync(srcIndexJs, destIndexJs);
      console.log(`✅ ${functionName}: Copied index.js from source`);
    } else if (fs.existsSync(distIndexJs)) {
      // TypeScript compiled version exists, copy it
      fs.copyFileSync(distIndexJs, destIndexJs);
      console.log(`✅ ${functionName}: Copied index.js from compiled TypeScript`);
    } else {
      console.log(`❌ ${functionName}: No index.js found in source or dist`);
      return;
    }

    console.log(`✅ ${functionName}: Successfully ensured`);
  } catch (error) {
    console.error(`❌ Error ensuring ${functionName}:`, error.message);
  }
});

// Final verification
console.log('\n🔍 Final verification of required functions:');
let allPresent = true;

requiredFunctions.forEach((funcDef) => {
  const functionName = funcDef.name;
  const hasIndexJs = fs.existsSync(path.join(functionName, 'index.js'));
  const hasFunctionJson = fs.existsSync(path.join(functionName, 'function.json'));

  if (hasIndexJs && hasFunctionJson) {
    console.log(`✅ ${functionName}: Ready`);
  } else {
    console.log(`❌ ${functionName}: Missing or incomplete`);
    allPresent = false;
  }
});

if (allPresent && !hasErrors) {
  console.log('\n🎉 All required functions are present!');
  process.exit(0);
} else {
  console.log('\n💥 Some required functions are missing!');
  console.log('\n🔧 To fix this issue:');
  console.log('1. Check the function registry in src/config/functions.config.ts');
  console.log('2. Either implement missing functions or mark them as not required');
  console.log('3. Ensure function names match between registry and source directories');
  process.exit(1);
}
