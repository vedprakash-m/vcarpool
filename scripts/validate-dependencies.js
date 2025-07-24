#!/usr/bin/env node

/**
 * Enhanced Dependency Validation Script for CI/CD Pipeline
 * Validates that all dependencies exist, are compatible, and secure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnhancedDependencyValidator {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.issues = [];
    this.warnings = [];
    this.workspaces = ['', 'backend', 'frontend', 'shared'];
  }

  async validate() {
    console.log('🔍 Enhanced dependency validation starting...\n');

    // Known problematic dependency versions
    this.checkProblematicVersions();
    
    // Validate each workspace
    for (const workspace of this.workspaces) {
      await this.validateWorkspace(workspace);
    }

    // Check for security vulnerabilities
    await this.checkSecurityVulnerabilities();
    
    // Check for circular dependencies
    await this.checkCircularDependencies();

    this.reportResults();
    return this.issues.length === 0;
  }

  checkProblematicVersions() {
    console.log('🚨 Checking for known problematic dependency versions...');
    
    const problematicDeps = [
      { name: 'madge', version: '6.3.1', reason: 'Version does not exist' },
      { name: '@azure/web-pubsub', version: '1.2.1', reason: 'Version does not exist' },
      { name: 'node-fetch', version: '^2.6.0', reason: 'ESM compatibility issues' }
    ];

    for (const workspace of this.workspaces) {
      const packageJsonPath = this.getPackageJsonPath(workspace);
      if (!fs.existsSync(packageJsonPath)) continue;

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      for (const problematic of problematicDeps) {
        if (allDeps[problematic.name]) {
          const version = allDeps[problematic.name];
          if (version.includes(problematic.version.replace('^', ''))) {
            this.issues.push({
              type: 'PROBLEMATIC_VERSION',
              workspace: workspace || 'root',
              package: problematic.name,
              version: version,
              reason: problematic.reason
            });
          }
        }
      }
    }
  }
      if (packageJson.devDependencies) {
        await this.validateDependencyObject(packageJson.devDependencies, 'devDependencies', workspace);
      }

      // Check for known problematic versions
      this.checkKnownIssues(packageJson, workspace);

    } catch (error) {
      this.addIssue(`Failed to validate ${workspace || 'root'}`, error.message);
    }

    console.log();
  }

  async validateDependencyObject(deps, type, workspace) {
    const knownProblematicVersions = {
      'madge': ['6.3.1'], // This version doesn't exist
      '@azure/web-pubsub': ['1.2.1'], // This version doesn't exist
      // Add more as discovered
    };

    for (const [name, version] of Object.entries(deps)) {
      // Check for known problematic versions
      if (knownProblematicVersions[name]) {
        const cleanVersion = version.replace(/[\^~>=<]/, '');
        if (knownProblematicVersions[name].includes(cleanVersion)) {
          this.addIssue(
            `${workspace || 'root'}/${type}`,
            `${name}@${version} - This version does not exist in npm registry`
          );
        }
      }

      // Check for extremely old or potentially insecure versions
      if (this.isVersionTooOld(name, version)) {
        this.addIssue(
          `${workspace || 'root'}/${type}`,
          `${name}@${version} - Version may be too old, consider updating`
        );
      }
    }
  }

  checkKnownIssues(packageJson, workspace) {
    const issues = [];

    // Check Node.js version compatibility
    if (packageJson.engines?.node) {
      const nodeVersion = packageJson.engines.node;
      if (!nodeVersion.includes('20') && !nodeVersion.includes('>=20')) {
        issues.push(`Node.js version ${nodeVersion} should support Node 20+`);
      }
    }

    // Check for missing critical scripts
    const requiredScripts = ['build', 'test', 'lint'];
    if (packageJson.scripts) {
      for (const script of requiredScripts) {
        if (!packageJson.scripts[script] && workspace !== '') {
          issues.push(`Missing required script: ${script}`);
        }
      }
    }

    // Report issues
    issues.forEach(issue => this.addIssue(`${workspace || 'root'}/configuration`, issue));
  }

  isVersionTooOld(name, version) {
    // List of critical packages that should be kept up to date
    const criticalPackages = {
      'typescript': '4.0.0',
      'react': '17.0.0',
      'next': '12.0.0',
      '@azure/functions': '3.0.0',
      'jest': '27.0.0'
    };

    if (!criticalPackages[name]) return false;

    const minVersion = criticalPackages[name];
    const currentVersion = version.replace(/[\^~>=<]/, '');
    
    // Simple version comparison (not semver compliant, but good enough for basic checks)
    return this.compareVersions(currentVersion, minVersion) < 0;
  }

  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  }

  addIssue(location, message) {
    this.issues.push({ location, message });
    console.log(`  ❌ ${location}: ${message}`);
  }

  reportResults() {
    console.log('\n📊 Dependency Validation Results:');
    console.log('=====================================');
    
    if (this.issues.length === 0) {
      console.log('✅ All dependencies are valid and compatible!\n');
      return;
    }

    console.log(`❌ Found ${this.issues.length} issues:\n`);
    
    this.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.location}`);
      console.log(`   ${issue.message}\n`);
    });

    console.log('🔧 Recommendations:');
    console.log('- Update package.json files to fix invalid versions');
    console.log('- Run npm update to get latest compatible versions');
    console.log('- Check npm registry for available versions');
    console.log('- Consider using npm-check-updates for automated updates\n');
  }

  async checkRegistryVersions(packageName) {
    try {
      const result = execSync(`npm view ${packageName} versions --json`, { 
        encoding: 'utf8',
        timeout: 10000 
      });
      const versions = JSON.parse(result);
      return Array.isArray(versions) ? versions : [versions];
    } catch (error) {
      console.warn(`⚠️  Could not check registry versions for ${packageName}`);
      return [];
    }
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  const validator = new DependencyValidator(process.cwd());
  
  validator.validate()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { DependencyValidator };
