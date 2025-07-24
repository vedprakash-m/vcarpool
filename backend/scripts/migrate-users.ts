#!/usr/bin/env node

/**
 * User Data Migration Script for Microsoft Entra ID Integration
 *
 * This script handles the migration of existing Carpool users to support
 * Microsoft Entra ID authentication while maintaining backward compatibility.
 *
 * Features:
 * - Migrates existing users to support Entra ID
 * - Links existing accounts with Entra ID objects
 * - Maintains data integrity during migration
 * - Provides rollback capabilities
 * - Comprehensive logging and reporting
 */

import { cosmosClient } from '../src/services/database.service';
import { VedUser } from '../../shared/src/types';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  backupPath: string;
  rollback: boolean;
}

interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  skippedUsers: number;
  errorUsers: number;
  warnings: string[];
  errors: string[];
}

interface UserBackup {
  id: string;
  originalData: any;
  migrationDate: Date;
  backupVersion: string;
}

class UserMigrationService {
  private config: MigrationConfig;
  private stats: MigrationStats;
  private backupFile: string;

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = {
      dryRun: false,
      batchSize: 100,
      logLevel: 'info',
      backupPath: './migration-backups',
      rollback: false,
      ...config,
    };

    this.stats = {
      totalUsers: 0,
      migratedUsers: 0,
      skippedUsers: 0,
      errorUsers: 0,
      warnings: [],
      errors: [],
    };

    this.backupFile = path.join(
      this.config.backupPath,
      `user-backup-${new Date().toISOString().split('T')[0]}.json`,
    );

    // Ensure backup directory exists
    if (!fs.existsSync(this.config.backupPath)) {
      fs.mkdirSync(this.config.backupPath, { recursive: true });
    }
  }

  private log(level: string, message: string, data?: any) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  private async createBackup(users: any[]): Promise<void> {
    this.log('info', `Creating backup of ${users.length} users`);

    const backup: UserBackup[] = users.map((user) => ({
      id: user.id,
      originalData: { ...user },
      migrationDate: new Date(),
      backupVersion: '1.0.0',
    }));

    fs.writeFileSync(this.backupFile, JSON.stringify(backup, null, 2));
    this.log('info', `Backup created: ${this.backupFile}`);
  }

  private async getAllUsers(): Promise<any[]> {
    this.log('info', 'Fetching all users from database');

    try {
      const container = cosmosClient.database('carpool').container('users');
      const { resources: users } = await container.items.query('SELECT * FROM c').fetchAll();

      this.log('info', `Found ${users.length} users in database`);
      return users;
    } catch (error) {
      this.log('error', 'Failed to fetch users from database', error);
      throw error;
    }
  }

  private migrateUserData(user: any): Partial<VedUser> {
    const migrationDate = new Date();

    // Base migration - add Entra ID support fields
    const migratedData: Partial<VedUser> = {
      ...user,
      authProvider: user.authProvider || 'legacy',
      entraObjectId: user.entraObjectId || null,
      migrationDate: user.migrationDate || migrationDate,
      updatedAt: migrationDate,
    };

    // Handle role normalization
    if (!migratedData.role || !['admin', 'parent', 'student'].includes(migratedData.role)) {
      migratedData.role = 'parent'; // Default role
      this.stats.warnings.push(`User ${user.id}: Role normalized to 'parent'`);
    }

    // Ensure required fields exist
    if (!migratedData.isActive) {
      migratedData.isActive = true;
    }

    if (!migratedData.createdAt) {
      migratedData.createdAt = migrationDate;
    }

    // Handle email domain mapping for potential Entra ID users
    if (migratedData.email && migratedData.email.endsWith('@vedid.onmicrosoft.com')) {
      // This user might already be using Entra ID
      migratedData.authProvider = 'entra';
      this.stats.warnings.push(
        `User ${user.id}: Marked as potential Entra ID user based on email domain`,
      );
    }

    // Preserve existing Entra ID mappings
    if (user.entraObjectId) {
      migratedData.authProvider = 'entra';
    }

    return migratedData;
  }

  private async updateUser(userId: string, userData: Partial<VedUser>): Promise<boolean> {
    if (this.config.dryRun) {
      this.log('debug', `[DRY RUN] Would update user ${userId}`, userData);
      return true;
    }

    try {
      const container = cosmosClient.database('carpool').container('users');
      await container.item(userId, userId).replace(userData);
      this.log('debug', `Successfully updated user ${userId}`);
      return true;
    } catch (error) {
      this.log('error', `Failed to update user ${userId}`, error);
      this.stats.errors.push(`User ${userId}: ${error.message}`);
      return false;
    }
  }

  private async processBatch(users: any[]): Promise<void> {
    this.log('info', `Processing batch of ${users.length} users`);

    for (const user of users) {
      try {
        // Check if user needs migration
        if (user.authProvider && user.migrationDate) {
          this.log('debug', `Skipping already migrated user ${user.id}`);
          this.stats.skippedUsers++;
          continue;
        }

        // Migrate user data
        const migratedData = this.migrateUserData(user);

        // Update user in database
        const success = await this.updateUser(user.id, migratedData);

        if (success) {
          this.stats.migratedUsers++;
          this.log('debug', `Migrated user ${user.id} (${user.email})`);
        } else {
          this.stats.errorUsers++;
        }
      } catch (error) {
        this.log('error', `Error processing user ${user.id}`, error);
        this.stats.errors.push(`User ${user.id}: ${error.message}`);
        this.stats.errorUsers++;
      }
    }
  }

  private async rollbackMigration(): Promise<void> {
    this.log('info', 'Starting migration rollback');

    if (!fs.existsSync(this.backupFile)) {
      throw new Error(`Backup file not found: ${this.backupFile}`);
    }

    const backupData: UserBackup[] = JSON.parse(fs.readFileSync(this.backupFile, 'utf-8'));
    this.log('info', `Restoring ${backupData.length} users from backup`);

    for (const backup of backupData) {
      try {
        if (this.config.dryRun) {
          this.log('debug', `[DRY RUN] Would rollback user ${backup.id}`);
          continue;
        }

        const container = cosmosClient.database('carpool').container('users');
        await container.item(backup.id, backup.id).replace(backup.originalData);
        this.log('debug', `Rolled back user ${backup.id}`);
      } catch (error) {
        this.log('error', `Failed to rollback user ${backup.id}`, error);
        this.stats.errors.push(`Rollback ${backup.id}: ${error.message}`);
      }
    }
  }

  private generateReport(): void {
    const report = {
      migrationDate: new Date().toISOString(),
      config: this.config,
      statistics: this.stats,
      summary: {
        totalProcessed: this.stats.migratedUsers + this.stats.skippedUsers + this.stats.errorUsers,
        successRate:
          this.stats.totalUsers > 0
            ? ((this.stats.migratedUsers / this.stats.totalUsers) * 100).toFixed(2) + '%'
            : '0%',
      },
    };

    const reportFile = path.join(
      this.config.backupPath,
      `migration-report-${new Date().toISOString().split('T')[0]}.json`,
    );

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    this.log('info', '=== MIGRATION REPORT ===');
    this.log('info', `Total Users: ${this.stats.totalUsers}`);
    this.log('info', `Migrated: ${this.stats.migratedUsers}`);
    this.log('info', `Skipped: ${this.stats.skippedUsers}`);
    this.log('info', `Errors: ${this.stats.errorUsers}`);
    this.log('info', `Success Rate: ${report.summary.successRate}`);
    this.log('info', `Warnings: ${this.stats.warnings.length}`);
    this.log('info', `Report saved: ${reportFile}`);

    if (this.stats.warnings.length > 0) {
      this.log('warn', 'Warnings encountered:');
      this.stats.warnings.forEach((warning) => this.log('warn', `  - ${warning}`));
    }

    if (this.stats.errors.length > 0) {
      this.log('error', 'Errors encountered:');
      this.stats.errors.forEach((error) => this.log('error', `  - ${error}`));
    }
  }

  async runMigration(): Promise<void> {
    try {
      this.log('info', 'Starting user migration for Entra ID integration');
      this.log('info', `Configuration: ${JSON.stringify(this.config, null, 2)}`);

      if (this.config.rollback) {
        await this.rollbackMigration();
        this.generateReport();
        return;
      }

      // Fetch all users
      const allUsers = await this.getAllUsers();
      this.stats.totalUsers = allUsers.length;

      if (allUsers.length === 0) {
        this.log('warn', 'No users found in database');
        return;
      }

      // Create backup
      await this.createBackup(allUsers);

      // Process users in batches
      for (let i = 0; i < allUsers.length; i += this.config.batchSize) {
        const batch = allUsers.slice(i, i + this.config.batchSize);
        await this.processBatch(batch);

        this.log(
          'info',
          `Processed ${Math.min(i + this.config.batchSize, allUsers.length)}/${
            allUsers.length
          } users`,
        );

        // Add small delay between batches to avoid overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.generateReport();
    } catch (error) {
      this.log('error', 'Migration failed with critical error', error);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const config: Partial<MigrationConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--batch-size':
        config.batchSize = parseInt(args[++i]) || 100;
        break;
      case '--log-level':
        config.logLevel = (args[++i] as any) || 'info';
        break;
      case '--backup-path':
        config.backupPath = args[++i] || './migration-backups';
        break;
      case '--rollback':
        config.rollback = true;
        break;
      case '--help':
        console.log(`
User Migration Script for Microsoft Entra ID Integration

Usage: node migrate-users.js [options]

Options:
  --dry-run           Run migration in preview mode without making changes
  --batch-size <n>    Process users in batches of n (default: 100)
  --log-level <level> Set log level: debug, info, warn, error (default: info)
  --backup-path <path> Directory for backup files (default: ./migration-backups)
  --rollback          Rollback to previous state using backup file
  --help              Show this help message

Examples:
  node migrate-users.js --dry-run                  # Preview migration
  node migrate-users.js --batch-size 50            # Run with smaller batches
  node migrate-users.js --rollback                 # Rollback migration
        `);
        return;
      default:
        console.warn(`Unknown argument: ${args[i]}`);
    }
  }

  try {
    const migrationService = new UserMigrationService(config);
    await migrationService.runMigration();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { UserMigrationService, MigrationConfig, MigrationStats };
