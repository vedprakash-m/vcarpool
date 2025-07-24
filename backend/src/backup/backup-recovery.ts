/**
 * Backup and Disaster Recovery Management
 * Provides automated backup, restoration, and disaster recovery capabilities
 */

import { CosmosClient } from '@azure/cosmos';
import { logger } from '../utils/logger';
import { MonitoringService } from '../utils/monitoring-enhanced';

const monitoringService = MonitoringService.getInstance();
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface BackupConfiguration {
  schedule: {
    full: string; // Cron expression for full backups
    incremental: string; // Cron expression for incremental backups
  };
  retention: {
    daily: number; // Days to keep daily backups
    weekly: number; // Weeks to keep weekly backups
    monthly: number; // Months to keep monthly backups
  };
  storage: {
    primary: string; // Primary backup location
    secondary?: string; // Secondary backup location for redundancy
  };
  encryption: {
    enabled: boolean;
    keyId?: string;
  };
}

export interface BackupMetadata {
  id: string;
  type: 'full' | 'incremental';
  timestamp: Date;
  size: number;
  collections: string[];
  checksum: string;
  encrypted: boolean;
  status: 'in_progress' | 'completed' | 'failed';
  error?: string;
}

export interface RestoreOptions {
  backupId: string;
  targetDatabase?: string;
  collections?: string[];
  pointInTime?: Date;
  validateOnly?: boolean;
}

export interface DisasterRecoveryPlan {
  rto: number; // Recovery Time Objective in minutes
  rpo: number; // Recovery Point Objective in minutes
  criticalComponents: string[];
  recoverySteps: RecoveryStep[];
  contactList: Array<{
    name: string;
    role: string;
    email: string;
    phone: string;
  }>;
}

export interface RecoveryStep {
  id: string;
  description: string;
  automated: boolean;
  estimatedTime: number; // minutes
  dependencies?: string[];
  script?: string;
}

class BackupAndRecoveryManager {
  private cosmosClient: CosmosClient;
  private config: BackupConfiguration;
  private backupHistory: BackupMetadata[] = [];
  private recoveryPlan: DisasterRecoveryPlan;

  constructor(cosmosClient: CosmosClient, config: BackupConfiguration) {
    this.cosmosClient = cosmosClient;
    this.config = config;
    this.recoveryPlan = this.initializeRecoveryPlan();
    this.scheduleBackups();
  }

  /**
   * Perform a full backup of all collections
   */
  async performFullBackup(): Promise<BackupMetadata> {
    const backupId = this.generateBackupId('full');
    const timestamp = new Date();

    logger.info('Starting full backup', { backupId });

    const metadata: BackupMetadata = {
      id: backupId,
      type: 'full',
      timestamp,
      size: 0,
      collections: [],
      checksum: '',
      encrypted: this.config.encryption.enabled,
      status: 'in_progress',
    };

    try {
      // Get all databases and collections
      const { resources: databases } = await this.cosmosClient.databases.readAll().fetchAll();

      for (const database of databases) {
        const db = this.cosmosClient.database(database.id);
        const { resources: collections } = await db.containers.readAll().fetchAll();

        for (const collection of collections) {
          await this.backupCollection(database.id, collection.id, backupId);
          metadata.collections.push(`${database.id}.${collection.id}`);
        }
      }

      // Calculate backup size and checksum
      const backupPath = this.getBackupPath(backupId);
      const stats = await fs.stat(backupPath);
      metadata.size = stats.size;
      metadata.checksum = await this.calculateChecksum(backupPath);
      metadata.status = 'completed';

      // Encrypt if configured
      if (this.config.encryption.enabled) {
        await this.encryptBackup(backupPath);
      }

      // Copy to secondary location if configured
      if (this.config.storage.secondary) {
        await this.copyToSecondaryStorage(backupPath);
      }

      this.backupHistory.push(metadata);
      logger.info('Full backup completed', {
        backupId,
        size: metadata.size,
        collections: metadata.collections.length,
      });

      return metadata;
    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Full backup failed', { backupId, error });
      throw error;
    }
  }

  /**
   * Perform an incremental backup
   */
  async performIncrementalBackup(since?: Date): Promise<BackupMetadata> {
    const backupId = this.generateBackupId('incremental');
    const timestamp = new Date();
    const sinceDate = since || this.getLastBackupDate();

    logger.info('Starting incremental backup', { backupId, since: sinceDate });

    const metadata: BackupMetadata = {
      id: backupId,
      type: 'incremental',
      timestamp,
      size: 0,
      collections: [],
      checksum: '',
      encrypted: this.config.encryption.enabled,
      status: 'in_progress',
    };

    try {
      // Get all databases and collections
      const { resources: databases } = await this.cosmosClient.databases.readAll().fetchAll();

      for (const database of databases) {
        const db = this.cosmosClient.database(database.id);
        const { resources: collections } = await db.containers.readAll().fetchAll();

        for (const collection of collections) {
          const hasChanges = await this.backupCollectionIncremental(
            database.id,
            collection.id,
            backupId,
            sinceDate,
          );

          if (hasChanges) {
            metadata.collections.push(`${database.id}.${collection.id}`);
          }
        }
      }

      // Calculate backup size and checksum
      const backupPath = this.getBackupPath(backupId);
      try {
        const stats = await fs.stat(backupPath);
        metadata.size = stats.size;
        metadata.checksum = await this.calculateChecksum(backupPath);
      } catch {
        // No changes to backup
        metadata.size = 0;
        metadata.checksum = '';
      }

      metadata.status = 'completed';
      this.backupHistory.push(metadata);

      logger.info('Incremental backup completed', {
        backupId,
        size: metadata.size,
        collections: metadata.collections.length,
      });

      return metadata;
    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Incremental backup failed', { backupId, error });
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(options: RestoreOptions): Promise<void> {
    logger.info('Starting restore operation', { ...options });

    try {
      const backup = this.backupHistory.find((b) => b.id === options.backupId);
      if (!backup) {
        throw new Error(`Backup ${options.backupId} not found`);
      }

      if (options.validateOnly) {
        await this.validateBackup(backup);
        logger.info('Backup validation completed', {
          backupId: options.backupId,
        });
        return;
      }

      // Decrypt backup if necessary
      const backupPath = this.getBackupPath(options.backupId);
      if (backup.encrypted) {
        await this.decryptBackup(backupPath);
      }

      // Restore collections
      const collectionsToRestore = options.collections || backup.collections;

      for (const collectionPath of collectionsToRestore) {
        const [databaseId, collectionId] = collectionPath.split('.');
        await this.restoreCollection(
          databaseId,
          collectionId,
          options.backupId,
          options.targetDatabase,
        );
      }

      logger.info('Restore operation completed', { ...options });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error('Restore operation failed', {
        options: { ...options },
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Execute disaster recovery plan
   */
  async executeDisasterRecovery(): Promise<void> {
    logger.info('Executing disaster recovery plan', {
      rto: this.recoveryPlan.rto,
      rpo: this.recoveryPlan.rpo,
    });

    let currentStep: RecoveryStep | undefined;
    try {
      // Send notifications
      await this.notifyDisasterRecoveryTeam();

      // Execute recovery steps in order
      for (const step of this.recoveryPlan.recoverySteps) {
        logger.info(`Executing recovery step: ${step.description}`, {
          stepId: step.id,
        });

        if (step.automated && step.script) {
          await this.executeRecoveryScript(step.script);
        } else {
          logger.warn(`Manual intervention required for step: ${step.description}`, {
            stepId: step.id,
          });
        }
      }

      // Verify system health
      await this.verifySystemHealth();

      logger.info('Disaster recovery plan executed successfully');
    } catch (error) {
      logger.error('Disaster recovery plan execution failed', { error });
      throw error;
    }
  }

  /**
   * Get backup status and metrics
   */
  getBackupMetrics(): {
    totalBackups: number;
    totalSize: number;
    lastFullBackup?: Date;
    lastIncrementalBackup?: Date;
    successRate: number;
    storageUsage: {
      primary: number;
      secondary?: number;
    };
  } {
    const completedBackups = this.backupHistory.filter((b) => b.status === 'completed');
    const failedBackups = this.backupHistory.filter((b) => b.status === 'failed');

    const fullBackups = completedBackups.filter((b) => b.type === 'full');
    const incrementalBackups = completedBackups.filter((b) => b.type === 'incremental');

    return {
      totalBackups: this.backupHistory.length,
      totalSize: completedBackups.reduce((sum, backup) => sum + backup.size, 0),
      lastFullBackup:
        fullBackups.length > 0
          ? new Date(Math.max(...fullBackups.map((b) => b.timestamp.getTime())))
          : undefined,
      lastIncrementalBackup:
        incrementalBackups.length > 0
          ? new Date(Math.max(...incrementalBackups.map((b) => b.timestamp.getTime())))
          : undefined,
      successRate:
        this.backupHistory.length > 0
          ? (completedBackups.length / this.backupHistory.length) * 100
          : 0,
      storageUsage: {
        primary: completedBackups.reduce((sum, backup) => sum + backup.size, 0),
      },
    };
  }

  private async backupCollection(
    databaseId: string,
    collectionId: string,
    backupId: string,
  ): Promise<void> {
    const container = this.cosmosClient.database(databaseId).container(collectionId);
    const backupPath = this.getCollectionBackupPath(backupId, databaseId, collectionId);

    // Ensure backup directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });

    // Query all documents
    const { resources: documents } = await container.items.readAll().fetchAll();

    // Write to backup file
    await fs.writeFile(backupPath, JSON.stringify(documents, null, 2));
  }

  private async backupCollectionIncremental(
    databaseId: string,
    collectionId: string,
    backupId: string,
    since: Date,
  ): Promise<boolean> {
    const container = this.cosmosClient.database(databaseId).container(collectionId);

    // Query documents modified since the specified date
    // Note: This requires a timestamp field in your documents
    const query = {
      query: 'SELECT * FROM c WHERE c._ts > @timestamp',
      parameters: [{ name: '@timestamp', value: Math.floor(since.getTime() / 1000) }],
    };

    const { resources: documents } = await container.items.query(query).fetchAll();

    if (documents.length === 0) {
      return false; // No changes
    }

    const backupPath = this.getCollectionBackupPath(backupId, databaseId, collectionId);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify(documents, null, 2));

    return true;
  }

  private async restoreCollection(
    databaseId: string,
    collectionId: string,
    backupId: string,
    targetDatabase?: string,
  ): Promise<void> {
    const targetDbId = targetDatabase || databaseId;
    const container = this.cosmosClient.database(targetDbId).container(collectionId);
    const backupPath = this.getCollectionBackupPath(backupId, databaseId, collectionId);

    // Read backup data
    const backupData = await fs.readFile(backupPath, 'utf-8');
    const documents = JSON.parse(backupData);

    // Restore documents in batches
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      for (const document of batch) {
        try {
          await container.items.upsert(document);
        } catch (error) {
          logger.warn('Failed to restore document', {
            documentId: document.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }

  private scheduleBackups(): void {
    // In a real implementation, you would use a proper cron scheduler
    // This is a simplified version for demonstration

    // Schedule full backups (e.g., daily at 2 AM)
    setInterval(
      async () => {
        try {
          await this.performFullBackup();
        } catch (error) {
          logger.error('Scheduled full backup failed', { error });
        }
      },
      24 * 60 * 60 * 1000,
    ); // Daily

    // Schedule incremental backups (e.g., every 4 hours)
    setInterval(
      async () => {
        try {
          await this.performIncrementalBackup();
        } catch (error) {
          logger.error('Scheduled incremental backup failed', { error });
        }
      },
      4 * 60 * 60 * 1000,
    ); // Every 4 hours

    // Cleanup old backups
    setInterval(
      async () => {
        await this.cleanupOldBackups();
      },
      24 * 60 * 60 * 1000,
    ); // Daily
  }

  private async cleanupOldBackups(): Promise<void> {
    const now = new Date();
    const cutoffDates = {
      daily: new Date(now.getTime() - this.config.retention.daily * 24 * 60 * 60 * 1000),
      weekly: new Date(now.getTime() - this.config.retention.weekly * 7 * 24 * 60 * 60 * 1000),
      monthly: new Date(now.getTime() - this.config.retention.monthly * 30 * 24 * 60 * 60 * 1000),
    };

    const backupsToDelete = this.backupHistory.filter((backup) => {
      return backup.timestamp < cutoffDates.daily;
    });

    for (const backup of backupsToDelete) {
      try {
        const backupPath = this.getBackupPath(backup.id);
        await fs.unlink(backupPath);

        // Remove from history
        const index = this.backupHistory.indexOf(backup);
        if (index > -1) {
          this.backupHistory.splice(index, 1);
        }

        logger.info('Deleted old backup', { backupId: backup.id });
      } catch (error) {
        logger.warn('Failed to delete old backup', {
          backupId: backup.id,
          error,
        });
      }
    }
  }

  private initializeRecoveryPlan(): DisasterRecoveryPlan {
    return {
      rto: 60, // 1 hour
      rpo: 15, // 15 minutes
      criticalComponents: [
        'database',
        'authentication_service',
        'api_gateway',
        'user_management',
        'carpool_management',
      ],
      recoverySteps: [
        {
          id: 'assess_damage',
          description: 'Assess the extent of the disaster and affected components',
          automated: false,
          estimatedTime: 15,
        },
        {
          id: 'activate_secondary_region',
          description: 'Activate secondary Azure region if primary is unavailable',
          automated: true,
          estimatedTime: 10,
          script:
            'az functionapp restart --name carpool-functions-secondary --resource-group carpool-rg',
        },
        {
          id: 'restore_database',
          description: 'Restore database from latest backup',
          automated: true,
          estimatedTime: 30,
          dependencies: ['assess_damage'],
        },
        {
          id: 'verify_services',
          description: 'Verify all critical services are operational',
          automated: true,
          estimatedTime: 10,
          dependencies: ['restore_database'],
        },
        {
          id: 'notify_users',
          description: 'Notify users that services have been restored',
          automated: false,
          estimatedTime: 5,
          dependencies: ['verify_services'],
        },
      ],
      contactList: [
        {
          name: 'System Administrator',
          role: 'Primary Contact',
          email: 'admin@carpool.com',
          phone: '+1-555-0100',
        },
        {
          name: 'Database Administrator',
          role: 'Database Recovery',
          email: 'dba@carpool.com',
          phone: '+1-555-0101',
        },
      ],
    };
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const { stdout } = await execAsync(`sha256sum "${filePath}"`);
    return stdout.split(' ')[0];
  }

  private async encryptBackup(backupPath: string): Promise<void> {
    // In a real implementation, you would use proper encryption
    logger.info('Encrypting backup', { backupPath });
  }

  private async decryptBackup(backupPath: string): Promise<void> {
    // In a real implementation, you would use proper decryption
    logger.info('Decrypting backup', { backupPath });
  }

  private async copyToSecondaryStorage(backupPath: string): Promise<void> {
    // In a real implementation, you would copy to secondary storage location
    logger.info('Copying backup to secondary storage', { backupPath });
  }

  private async validateBackup(backup: BackupMetadata): Promise<void> {
    const backupPath = this.getBackupPath(backup.id);
    const currentChecksum = await this.calculateChecksum(backupPath);

    if (currentChecksum !== backup.checksum) {
      throw new Error(`Backup validation failed: checksum mismatch for ${backup.id}`);
    }
  }

  private async notifyDisasterRecoveryTeam(): Promise<void> {
    for (const contact of this.recoveryPlan.contactList) {
      logger.error('DISASTER RECOVERY INITIATED', {
        title: 'DISASTER RECOVERY INITIATED',
        message: `Disaster recovery plan has been activated. Your immediate attention is required.`,
        severity: 'critical',
        data: { contact, recoveryPlan: this.recoveryPlan },
      });
    }
  }

  private async executeRecoveryScript(script: string): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync(script);
      logger.info('Recovery script executed successfully', {
        script,
        stdout,
        stderr,
      });
    } catch (error) {
      logger.error('Recovery script execution failed', { script, error });
      throw error;
    }
  }

  private async verifySystemHealth(): Promise<void> {
    // In a real implementation, you would perform comprehensive health checks
    logger.info('Verifying system health after disaster recovery');
  }

  private generateBackupId(type: 'full' | 'incremental'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}_backup_${timestamp}`;
  }

  private getBackupPath(backupId: string): string {
    return path.join(this.config.storage.primary, `${backupId}.json`);
  }

  private getCollectionBackupPath(
    backupId: string,
    databaseId: string,
    collectionId: string,
  ): string {
    return path.join(this.config.storage.primary, backupId, databaseId, `${collectionId}.json`);
  }

  private getLastBackupDate(): Date {
    const lastBackup = this.backupHistory
      .filter((b) => b.status === 'completed')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return lastBackup ? lastBackup.timestamp : new Date(0);
  }
}

export default BackupAndRecoveryManager;
