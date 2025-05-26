#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = (message) => console.log(`[CI Build] ${message}`);
const error = (message) => {
  console.error(`❌ [CI Build Error] ${message}`);
  process.exit(1);
};

const runCommand = (command, cwd = process.cwd()) => {
  log(`Running: ${command} in ${cwd}`);
  try {
    execSync(command, { stdio: 'inherit', cwd, env: { ...process.env, FORCE_COLOR: '1' } });
    return true;
  } catch (err) {
    error(`Command failed: ${command}\n${err.message}`);
    return false;
  }
};

const verifyDirectory = (dirPath, description) => {
  if (!fs.existsSync(dirPath)) {
    error(`Missing ${description} directory: ${dirPath}`);
  }
  log(`Verified ${description} directory: ${dirPath}`);
};

const main = async () => {
  log('Starting CI build process');
  
  // Set up paths
  const rootDir = process.cwd();
  const frontendDir = path.join(rootDir, 'frontend');
  const backendDir = path.join(rootDir, 'backend');
  const sharedDir = path.join(rootDir, 'shared');
  
  try {
    // 1. Install root dependencies
    log('Installing root dependencies...');
    runCommand('npm ci --prefer-offline --no-audit --no-fund');
    
    // 2. Build shared library first
    log('Building shared library...');
    runCommand('npm run build:shared');
    
    // 3. Install and build frontend
    log('Setting up frontend...');
    runCommand('npm ci --prefer-offline --no-audit --no-fund', frontendDir);
    runCommand('npm run build', frontendDir);
    
    // Verify frontend build
    const nextDir = path.join(frontendDir, '.next');
    verifyDirectory(nextDir, 'Next.js build output');
    verifyDirectory(path.join(nextDir, 'server'), 'Next.js server build');
    verifyDirectory(path.join(nextDir, 'static'), 'Next.js static assets');
    
    // 4. Install and build backend
    log('Setting up backend...');
    runCommand('npm ci --prefer-offline --no-audit --no-fund', backendDir);
    runCommand('npm run build', backendDir);
    
    // Verify backend build
    verifyDirectory(path.join(backendDir, 'dist'), 'Backend build output');
    
    log('✅ Build completed successfully');
    process.exit(0);
  } catch (err) {
    error(`Build failed: ${err.message}`);
  }
};

main();
