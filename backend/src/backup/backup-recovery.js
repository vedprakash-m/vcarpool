"use strict";
/**
 * Backup and Disaster Recovery Management
 * Provides automated backup, restoration, and disaster recovery capabilities
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../utils/logger");
const monitoring_enhanced_1 = require("../utils/monitoring-enhanced");
const monitoringService = monitoring_enhanced_1.MonitoringService.getInstance();
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class BackupAndRecoveryManager {
    cosmosClient;
    config;
    backupHistory = [];
    recoveryPlan;
    constructor(cosmosClient, config) {
        this.cosmosClient = cosmosClient;
        this.config = config;
        this.recoveryPlan = this.initializeRecoveryPlan();
        this.scheduleBackups();
    }
    /**
     * Perform a full backup of all collections
     */
    async performFullBackup() {
        const backupId = this.generateBackupId("full");
        const timestamp = new Date();
        logger_1.logger.info("Starting full backup", { backupId });
        const metadata = {
            id: backupId,
            type: "full",
            timestamp,
            size: 0,
            collections: [],
            checksum: "",
            encrypted: this.config.encryption.enabled,
            status: "in_progress",
        };
        try {
            // Get all databases and collections
            const { resources: databases } = await this.cosmosClient.databases
                .readAll()
                .fetchAll();
            for (const database of databases) {
                const db = this.cosmosClient.database(database.id);
                const { resources: collections } = await db.containers
                    .readAll()
                    .fetchAll();
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
            metadata.status = "completed";
            // Encrypt if configured
            if (this.config.encryption.enabled) {
                await this.encryptBackup(backupPath);
            }
            // Copy to secondary location if configured
            if (this.config.storage.secondary) {
                await this.copyToSecondaryStorage(backupPath);
            }
            this.backupHistory.push(metadata);
            logger_1.logger.info("Full backup completed", {
                backupId,
                size: metadata.size,
                collections: metadata.collections.length,
            });
            return metadata;
        }
        catch (error) {
            metadata.status = "failed";
            metadata.error = error instanceof Error ? error.message : "Unknown error";
            logger_1.logger.error("Full backup failed", { backupId, error });
            throw error;
        }
    }
    /**
     * Perform an incremental backup
     */
    async performIncrementalBackup(since) {
        const backupId = this.generateBackupId("incremental");
        const timestamp = new Date();
        const sinceDate = since || this.getLastBackupDate();
        logger_1.logger.info("Starting incremental backup", { backupId, since: sinceDate });
        const metadata = {
            id: backupId,
            type: "incremental",
            timestamp,
            size: 0,
            collections: [],
            checksum: "",
            encrypted: this.config.encryption.enabled,
            status: "in_progress",
        };
        try {
            // Get all databases and collections
            const { resources: databases } = await this.cosmosClient.databases
                .readAll()
                .fetchAll();
            for (const database of databases) {
                const db = this.cosmosClient.database(database.id);
                const { resources: collections } = await db.containers
                    .readAll()
                    .fetchAll();
                for (const collection of collections) {
                    const hasChanges = await this.backupCollectionIncremental(database.id, collection.id, backupId, sinceDate);
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
            }
            catch {
                // No changes to backup
                metadata.size = 0;
                metadata.checksum = "";
            }
            metadata.status = "completed";
            this.backupHistory.push(metadata);
            logger_1.logger.info("Incremental backup completed", {
                backupId,
                size: metadata.size,
                collections: metadata.collections.length,
            });
            return metadata;
        }
        catch (error) {
            metadata.status = "failed";
            metadata.error = error instanceof Error ? error.message : "Unknown error";
            logger_1.logger.error("Incremental backup failed", { backupId, error });
            throw error;
        }
    }
    /**
     * Restore from backup
     */
    async restoreFromBackup(options) {
        logger_1.logger.info("Starting restore operation", { ...options });
        try {
            const backup = this.backupHistory.find((b) => b.id === options.backupId);
            if (!backup) {
                throw new Error(`Backup ${options.backupId} not found`);
            }
            if (options.validateOnly) {
                await this.validateBackup(backup);
                logger_1.logger.info("Backup validation completed", {
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
                const [databaseId, collectionId] = collectionPath.split(".");
                await this.restoreCollection(databaseId, collectionId, options.backupId, options.targetDatabase);
            }
            logger_1.logger.info("Restore operation completed", { ...options });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            logger_1.logger.error("Restore operation failed", {
                options: { ...options },
                error: errorMessage,
            });
            throw error;
        }
    }
    /**
     * Execute disaster recovery plan
     */
    async executeDisasterRecovery() {
        logger_1.logger.info("Executing disaster recovery plan", {
            rto: this.recoveryPlan.rto,
            rpo: this.recoveryPlan.rpo,
        });
        let currentStep;
        try {
            // Send notifications
            await this.notifyDisasterRecoveryTeam();
            // Execute recovery steps in order
            for (const step of this.recoveryPlan.recoverySteps) {
                logger_1.logger.info(`Executing recovery step: ${step.description}`, {
                    stepId: step.id,
                });
                if (step.automated && step.script) {
                    await this.executeRecoveryScript(step.script);
                }
                else {
                    logger_1.logger.warn(`Manual intervention required for step: ${step.description}`, { stepId: step.id });
                }
            }
            // Verify system health
            await this.verifySystemHealth();
            logger_1.logger.info("Disaster recovery plan executed successfully");
        }
        catch (error) {
            logger_1.logger.error("Disaster recovery plan execution failed", { error });
            throw error;
        }
    }
    /**
     * Get backup status and metrics
     */
    getBackupMetrics() {
        const completedBackups = this.backupHistory.filter((b) => b.status === "completed");
        const failedBackups = this.backupHistory.filter((b) => b.status === "failed");
        const fullBackups = completedBackups.filter((b) => b.type === "full");
        const incrementalBackups = completedBackups.filter((b) => b.type === "incremental");
        return {
            totalBackups: this.backupHistory.length,
            totalSize: completedBackups.reduce((sum, backup) => sum + backup.size, 0),
            lastFullBackup: fullBackups.length > 0
                ? new Date(Math.max(...fullBackups.map((b) => b.timestamp.getTime())))
                : undefined,
            lastIncrementalBackup: incrementalBackups.length > 0
                ? new Date(Math.max(...incrementalBackups.map((b) => b.timestamp.getTime())))
                : undefined,
            successRate: this.backupHistory.length > 0
                ? (completedBackups.length / this.backupHistory.length) * 100
                : 0,
            storageUsage: {
                primary: completedBackups.reduce((sum, backup) => sum + backup.size, 0),
            },
        };
    }
    async backupCollection(databaseId, collectionId, backupId) {
        const container = this.cosmosClient
            .database(databaseId)
            .container(collectionId);
        const backupPath = this.getCollectionBackupPath(backupId, databaseId, collectionId);
        // Ensure backup directory exists
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        // Query all documents
        const { resources: documents } = await container.items.readAll().fetchAll();
        // Write to backup file
        await fs.writeFile(backupPath, JSON.stringify(documents, null, 2));
    }
    async backupCollectionIncremental(databaseId, collectionId, backupId, since) {
        const container = this.cosmosClient
            .database(databaseId)
            .container(collectionId);
        // Query documents modified since the specified date
        // Note: This requires a timestamp field in your documents
        const query = {
            query: "SELECT * FROM c WHERE c._ts > @timestamp",
            parameters: [
                { name: "@timestamp", value: Math.floor(since.getTime() / 1000) },
            ],
        };
        const { resources: documents } = await container.items
            .query(query)
            .fetchAll();
        if (documents.length === 0) {
            return false; // No changes
        }
        const backupPath = this.getCollectionBackupPath(backupId, databaseId, collectionId);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, JSON.stringify(documents, null, 2));
        return true;
    }
    async restoreCollection(databaseId, collectionId, backupId, targetDatabase) {
        const targetDbId = targetDatabase || databaseId;
        const container = this.cosmosClient
            .database(targetDbId)
            .container(collectionId);
        const backupPath = this.getCollectionBackupPath(backupId, databaseId, collectionId);
        // Read backup data
        const backupData = await fs.readFile(backupPath, "utf-8");
        const documents = JSON.parse(backupData);
        // Restore documents in batches
        const batchSize = 100;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            for (const document of batch) {
                try {
                    await container.items.upsert(document);
                }
                catch (error) {
                    logger_1.logger.warn("Failed to restore document", {
                        documentId: document.id,
                        error: error instanceof Error ? error.message : "Unknown error",
                    });
                }
            }
        }
    }
    scheduleBackups() {
        // In a real implementation, you would use a proper cron scheduler
        // This is a simplified version for demonstration
        // Schedule full backups (e.g., daily at 2 AM)
        setInterval(async () => {
            try {
                await this.performFullBackup();
            }
            catch (error) {
                logger_1.logger.error("Scheduled full backup failed", { error });
            }
        }, 24 * 60 * 60 * 1000); // Daily
        // Schedule incremental backups (e.g., every 4 hours)
        setInterval(async () => {
            try {
                await this.performIncrementalBackup();
            }
            catch (error) {
                logger_1.logger.error("Scheduled incremental backup failed", { error });
            }
        }, 4 * 60 * 60 * 1000); // Every 4 hours
        // Cleanup old backups
        setInterval(async () => {
            await this.cleanupOldBackups();
        }, 24 * 60 * 60 * 1000); // Daily
    }
    async cleanupOldBackups() {
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
                logger_1.logger.info("Deleted old backup", { backupId: backup.id });
            }
            catch (error) {
                logger_1.logger.warn("Failed to delete old backup", {
                    backupId: backup.id,
                    error,
                });
            }
        }
    }
    initializeRecoveryPlan() {
        return {
            rto: 60, // 1 hour
            rpo: 15, // 15 minutes
            criticalComponents: [
                "database",
                "authentication_service",
                "api_gateway",
                "user_management",
                "carpool_management",
            ],
            recoverySteps: [
                {
                    id: "assess_damage",
                    description: "Assess the extent of the disaster and affected components",
                    automated: false,
                    estimatedTime: 15,
                },
                {
                    id: "activate_secondary_region",
                    description: "Activate secondary Azure region if primary is unavailable",
                    automated: true,
                    estimatedTime: 10,
                    script: "az functionapp restart --name carpool-functions-secondary --resource-group carpool-rg",
                },
                {
                    id: "restore_database",
                    description: "Restore database from latest backup",
                    automated: true,
                    estimatedTime: 30,
                    dependencies: ["assess_damage"],
                },
                {
                    id: "verify_services",
                    description: "Verify all critical services are operational",
                    automated: true,
                    estimatedTime: 10,
                    dependencies: ["restore_database"],
                },
                {
                    id: "notify_users",
                    description: "Notify users that services have been restored",
                    automated: false,
                    estimatedTime: 5,
                    dependencies: ["verify_services"],
                },
            ],
            contactList: [
                {
                    name: "System Administrator",
                    role: "Primary Contact",
                    email: "admin@carpool.com",
                    phone: "+1-555-0100",
                },
                {
                    name: "Database Administrator",
                    role: "Database Recovery",
                    email: "dba@carpool.com",
                    phone: "+1-555-0101",
                },
            ],
        };
    }
    async calculateChecksum(filePath) {
        const { stdout } = await execAsync(`sha256sum "${filePath}"`);
        return stdout.split(" ")[0];
    }
    async encryptBackup(backupPath) {
        // In a real implementation, you would use proper encryption
        logger_1.logger.info("Encrypting backup", { backupPath });
    }
    async decryptBackup(backupPath) {
        // In a real implementation, you would use proper decryption
        logger_1.logger.info("Decrypting backup", { backupPath });
    }
    async copyToSecondaryStorage(backupPath) {
        // In a real implementation, you would copy to secondary storage location
        logger_1.logger.info("Copying backup to secondary storage", { backupPath });
    }
    async validateBackup(backup) {
        const backupPath = this.getBackupPath(backup.id);
        const currentChecksum = await this.calculateChecksum(backupPath);
        if (currentChecksum !== backup.checksum) {
            throw new Error(`Backup validation failed: checksum mismatch for ${backup.id}`);
        }
    }
    async notifyDisasterRecoveryTeam() {
        for (const contact of this.recoveryPlan.contactList) {
            logger_1.logger.error("DISASTER RECOVERY INITIATED", {
                title: "DISASTER RECOVERY INITIATED",
                message: `Disaster recovery plan has been activated. Your immediate attention is required.`,
                severity: "critical",
                data: { contact, recoveryPlan: this.recoveryPlan },
            });
        }
    }
    async executeRecoveryScript(script) {
        try {
            const { stdout, stderr } = await execAsync(script);
            logger_1.logger.info("Recovery script executed successfully", {
                script,
                stdout,
                stderr,
            });
        }
        catch (error) {
            logger_1.logger.error("Recovery script execution failed", { script, error });
            throw error;
        }
    }
    async verifySystemHealth() {
        // In a real implementation, you would perform comprehensive health checks
        logger_1.logger.info("Verifying system health after disaster recovery");
    }
    generateBackupId(type) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        return `${type}_backup_${timestamp}`;
    }
    getBackupPath(backupId) {
        return path.join(this.config.storage.primary, `${backupId}.json`);
    }
    getCollectionBackupPath(backupId, databaseId, collectionId) {
        return path.join(this.config.storage.primary, backupId, databaseId, `${collectionId}.json`);
    }
    getLastBackupDate() {
        const lastBackup = this.backupHistory
            .filter((b) => b.status === "completed")
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        return lastBackup ? lastBackup.timestamp : new Date(0);
    }
}
exports.default = BackupAndRecoveryManager;
