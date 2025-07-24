/**
 * Single Source of Truth for Azure Functions Configuration
 *
 * This file defines all Azure Functions that should exist in the system.
 * Build scripts, validation, and deployment processes should reference this file.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FunctionDefinition {
  name: string;
  implemented: boolean;
  sourceDir: string;
  description: string;
  required: boolean;
  phase: 'phase1' | 'phase2' | 'phase3' | 'future';
  dependencies?: string[];
}

export const FUNCTION_REGISTRY: FunctionDefinition[] = [
  // Phase 1: Core Functions (Authentication & Basic Operations)
  {
    name: 'hello',
    implemented: true,
    sourceDir: 'hello', // Root level of backend directory
    description: 'Health check and basic connectivity test',
    required: true,
    phase: 'phase1',
  },
  {
    name: 'auth-login-legacy',
    implemented: true,
    sourceDir: 'auth-login-legacy', // Root level of backend directory
    description: 'Legacy authentication login system',
    required: true,
    phase: 'phase1',
  },
  {
    name: 'auth-register-working',
    implemented: true,
    sourceDir: 'auth-register-working', // Root level of backend directory
    description: 'Working user registration system',
    required: true,
    phase: 'phase1',
  },
  {
    name: 'auth-unified',
    implemented: true,
    sourceDir: 'src/functions/auth-unified', // TypeScript source in src/functions
    description: 'Unified authentication endpoint (login, register, refresh)',
    required: true,
    phase: 'phase1',
  },
  {
    name: 'trips-stats',
    implemented: true,
    sourceDir: 'trips-stats', // Root level of backend directory
    description: 'Trip statistics and analytics',
    required: true,
    phase: 'phase1',
  },
  {
    name: 'users-me',
    implemented: true,
    sourceDir: 'users-me', // Root level of backend directory
    description: 'User profile information endpoint',
    required: true,
    phase: 'phase1',
  },
  {
    name: 'users-change-password',
    implemented: true,
    sourceDir: 'users-change-password', // Root level of backend directory
    description: 'User password change functionality',
    required: true,
    phase: 'phase1',
  },

  // Phase 2: Scheduling Functions (TypeScript at root level - need compilation)
  {
    name: 'admin-generate-schedule-simple',
    implemented: false, // TypeScript source exists but not compiled
    sourceDir: 'admin-generate-schedule-simple',
    description: 'Generate weekly carpool schedules using simplified algorithm',
    required: false, // Temporarily not required until compilation is fixed
    phase: 'phase2',
  },
  {
    name: 'parents-weekly-preferences-simple',
    implemented: false, // TypeScript source exists but not compiled
    sourceDir: 'parents-weekly-preferences-simple',
    description: 'Parent weekly driving preference submission (simplified)',
    required: false, // Temporarily not required until compilation is fixed
    phase: 'phase2',
  },

  // Phase 2: Missing Functions (Need to be implemented)
  {
    name: 'admin-create-user',
    implemented: false,
    sourceDir: 'admin-create-user',
    description: 'Administrative user creation functionality',
    required: false, // Temporarily not required until implemented
    phase: 'phase2',
  },

  // Phase 3: Future Functions (Not yet required)
  {
    name: 'notifications-dispatch',
    implemented: false,
    sourceDir: 'notifications-dispatch',
    description: 'Central notification dispatching service',
    required: false,
    phase: 'phase3',
  },
  {
    name: 'admin-platform-metrics',
    implemented: false,
    sourceDir: 'admin-platform-metrics',
    description: 'Platform usage metrics and analytics',
    required: false,
    phase: 'phase3',
  },
];

/**
 * Get all functions that are marked as implemented
 */
export function getImplementedFunctions(): FunctionDefinition[] {
  return FUNCTION_REGISTRY.filter((func) => func.implemented);
}

/**
 * Get all functions that are required for the current deployment
 */
export function getRequiredFunctions(): FunctionDefinition[] {
  return FUNCTION_REGISTRY.filter((func) => func.required);
}

/**
 * Get functions by phase
 */
export function getFunctionsByPhase(
  phase: 'phase1' | 'phase2' | 'phase3' | 'future',
): FunctionDefinition[] {
  return FUNCTION_REGISTRY.filter((func) => func.phase === phase);
}

export function validateFunctionRegistry(basePath: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const implementedFunctions = FUNCTION_REGISTRY.filter((f) => f.implemented && f.required);

  for (const func of implementedFunctions) {
    // All functions in this registry are at the root level of the backend directory
    const sourcePath = path.resolve(basePath, func.sourceDir);

    if (!fs.existsSync(sourcePath)) {
      errors.push(
        `Function '${func.name}' marked as implemented but source not found at: ${sourcePath}`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
