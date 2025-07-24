#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import function registry (single source of truth)
// Note: This will work after TypeScript compilation
function getFunctionsToSetup() {
  try {
    const { getImplementedFunctions } = require('../dist/config/functions.config.js');
    return getImplementedFunctions();
  } catch (error) {
    // Fallback to legacy list if registry not available (during initial build)
    console.log('ℹ️  Using fallback function list (registry not available yet)');
    return [
      { name: 'hello', sourceDir: 'hello' },
      { name: 'auth-login-legacy', sourceDir: 'auth-login-legacy' },
      { name: 'auth-register-working', sourceDir: 'auth-register-working' },
      { name: 'trips-stats', sourceDir: 'trips-stats' },
      { name: 'users-me', sourceDir: 'users-me' },
      { name: 'users-change-password', sourceDir: 'users-change-password' },
      { name: 'admin-generate-schedule-simple', sourceDir: 'admin-generate-schedule-simple' },
      { name: 'parents-weekly-preferences-simple', sourceDir: 'parents-weekly-preferences-simple' },
    ];
  }
}

console.log('🔧 Setting up Azure Functions...');

const implementedFunctions = getFunctionsToSetup();
console.log(`📋 Setting up ${implementedFunctions.length} implemented functions...`);

implementedFunctions.forEach((funcDef) => {
  const functionName = funcDef.name;

  // All functions in the registry are at the root level of the backend directory
  const srcFunctionDir = funcDef.sourceDir;
  const distFunctionDir = path.join('dist', 'functions', funcDef.sourceDir);
  const rootFunctionDir = functionName;

  // Check if function already exists at root level (for legacy functions)
  if (
    fs.existsSync(path.join(rootFunctionDir, 'index.js')) &&
    fs.existsSync(path.join(rootFunctionDir, 'function.json'))
  ) {
    console.log(`✅ ${functionName}: Already present at root level`);
    return;
  }

  // Check if source function exists in src/functions
  if (!fs.existsSync(srcFunctionDir)) {
    console.log(`⚠️  Skipping ${functionName} - source not found at ${srcFunctionDir}`);
    return;
  }

  try {
    // Create root function directory (preserve existing if it's a JavaScript function)
    if (!fs.existsSync(rootFunctionDir)) {
      fs.mkdirSync(rootFunctionDir, { recursive: true });
    } else if (
      fs.existsSync(path.join(rootFunctionDir, 'index.js')) &&
      !fs.existsSync(path.join('src', 'functions', funcDef.sourceDir, 'index.js'))
    ) {
      // This is an existing JavaScript function, preserve it
      console.log(`📦 Preserving existing JavaScript function: ${functionName}`);
      return;
    }

    // Copy function.json from source
    const srcFunctionJson = path.join(srcFunctionDir, 'function.json');
    const destFunctionJson = path.join(rootFunctionDir, 'function.json');

    if (fs.existsSync(srcFunctionJson)) {
      fs.copyFileSync(srcFunctionJson, destFunctionJson);
      console.log(`✅ Copied function.json for ${functionName}`);
    } else {
      console.log(`❌ function.json not found for ${functionName}`);
      return;
    }

    // Try to copy JavaScript file first (for legacy functions)
    const srcIndexJs = path.join(srcFunctionDir, 'index.js');
    const destIndexJs = path.join(rootFunctionDir, 'index.js');

    if (fs.existsSync(srcIndexJs)) {
      fs.copyFileSync(srcIndexJs, destIndexJs);
      console.log(`✅ Copied index.js for ${functionName}`);
    } else {
      // If no JavaScript source, look for compiled TypeScript
      const distIndexJs = path.join(distFunctionDir, 'index.js');

      if (fs.existsSync(distIndexJs)) {
        fs.copyFileSync(distIndexJs, destIndexJs);
        console.log(`✅ Copied compiled TypeScript for ${functionName}`);

        // Also copy index.js.map if it exists
        const distIndexMap = path.join(distFunctionDir, 'index.js.map');
        const destIndexMap = path.join(rootFunctionDir, 'index.js.map');

        if (fs.existsSync(distIndexMap)) {
          fs.copyFileSync(distIndexMap, destIndexMap);
        }
      } else {
        console.log(`❌ ${functionName}: No index.js found in source or dist`);
        return;
      }
    }

    // Copy index.js.map if it exists (for compiled TypeScript debugging)
    const srcIndexMap = path.join(distFunctionDir, 'index.js.map');
    const destIndexMap = path.join(rootFunctionDir, 'index.js.map');

    if (fs.existsSync(srcIndexMap)) {
      fs.copyFileSync(srcIndexMap, destIndexMap);
    }
  } catch (error) {
    console.error(`❌ Error setting up ${functionName}:`, error.message);
  }
});

console.log('✅ Azure Functions setup completed!');
const configuredFunctions = implementedFunctions
  .filter((funcDef) => fs.existsSync(funcDef.name))
  .map((funcDef) => funcDef.name);
console.log(`📋 Functions configured: ${configuredFunctions.join(', ')}`);
