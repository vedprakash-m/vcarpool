# Infrastructure Templates

This directory contains the Azure Bicep templates for Carpool infrastructure deployment.

## 📁 Template Files

### 🎯 **Active Templates (Use These)**

#### `database.bicep` - Database Resource Group Template

- **Purpose**: Deploy persistent storage resources
- **Target Resource Group**: `carpool-db-rg`
- **Resources**: Cosmos DB account, database, and all collections
- **Cost**: ~$24/month (always running)
- **Parameters**: `database.parameters.json`
- **Usage**: `az deployment group create --resource-group carpool-db-rg --template-file database.bicep --parameters @database.parameters.json`

#### `main-compute.bicep` - Compute Resource Group Template

- **Purpose**: Deploy application runtime resources
- **Target Resource Group**: `carpool-rg`
- **Resources**: Function App, Static Web App, Storage, App Insights, Key Vault
- **Cost**: ~$50-100/month (can be deleted for cost savings)
- **Dependencies**: Requires database resource group to exist
- **Parameters**: `main-compute.parameters.json`
- **Usage**: `az deployment group create --resource-group carpool-rg --template-file main-compute.bicep --parameters @main-compute.parameters.json`

#### `storage.bicep` - Dedicated Storage Account Template

- **Purpose**: Deploy storage account to any resource group/location
- **Target Resource Group**: Flexible (e.g., `carpool-storage-rg`, `carpool-db-rg`)
- **Resources**: Storage account with optimal configuration for Azure Functions
- **Cost**: ~$5-15/month (depending on usage)
- **Benefits**: Isolation, cross-region deployment, better resource management
- **Usage**: `./scripts/deploy-storage.sh deploy --resource-group carpool-storage-rg --location eastus2`

### 🔄 **Legacy Template (Backup/Rollback)**

#### `main.bicep` - Single Resource Group Template

- **Purpose**: Deploy all resources to single resource group (legacy approach)
- **Target Resource Group**: `carpool-rg`
- **Resources**: All Carpool resources in one resource group
- **Status**: Maintained for rollback scenarios
- **Parameters**: `main.parameters.json`
- **Usage**: `az deployment group create --resource-group carpool-rg --template-file main.bicep --parameters @main.parameters.json`

### 📄 **Parameter Files**

- `database.parameters.json` - Production parameters for database resources
- `main-compute.parameters.json` - Production parameters for compute resources
- `main.parameters.json` - Production parameters for legacy single-RG deployment

**Note**: Parameter files are pre-configured for production environment. For dev/test environments, create separate parameter files or override values during deployment.

## 🚀 Deployment Methods

### **Recommended: Multi-Resource Group Deployment**

```bash
# Deploy using automation script (recommended)
./scripts/deploy-multi-rg.sh

# Or deploy manually
az deployment group create --resource-group carpool-db-rg --template-file infra/database.bicep --parameters appName=carpool environmentName=prod
az deployment group create --resource-group carpool-rg --template-file infra/main-compute.bicep --parameters appName=carpool environmentName=prod databaseResourceGroup=carpool-db-rg
```

### **Storage Account Deployment Options**

```bash
# Option 1: Deploy to dedicated storage resource group
./scripts/deploy-storage.sh deploy --resource-group carpool-storage-rg --location eastus2

# Option 2: Deploy to database resource group (consolidate persistent resources)
./scripts/deploy-storage.sh deploy --resource-group carpool-db-rg --location eastus2

# Option 3: Plan deployment first (dry run)
./scripts/deploy-storage.sh plan --resource-group carpool-storage-rg --location eastus2
```

### **Storage Account Migration**

```bash
# Complete migration workflow
./scripts/migrate-storage-account.sh plan --target-name carpoolsanew --target-rg carpool-storage-rg --target-location eastus2
./scripts/deploy-storage.sh deploy --resource-group carpool-storage-rg --location eastus2
./scripts/migrate-storage-account.sh migrate-data --target-name carpoolsanew --target-rg carpool-storage-rg
./scripts/migrate-storage-account.sh update-config --target-name carpoolsanew --target-rg carpool-storage-rg
./scripts/migrate-storage-account.sh verify --target-name carpoolsanew --target-rg carpool-storage-rg
```

### **Fallback: Single Resource Group Deployment**

```bash
# Legacy deployment method
az deployment group create --resource-group carpool-rg --template-file infra/main.bicep --parameters appName=carpool environmentName=prod
```

## 🧹 Template Cleanup (June 12, 2025)

Removed 15 redundant templates that were causing confusion:

**Deleted Files**:

- `test-*.bicep` (6 files) - Test/experimental templates
- `main-fixed.bicep`, `main-simplified.bicep`, `main-nocontainers.bicep` - Superseded variations
- `ci-cd-optimized.bicep` - CI/CD specific version (superseded)
- `core-infrastructure.bicep`, `core-resources.bicep` - Alternative approaches
- `minimal.bicep`, `minimal-working.bicep` - Minimal deployments (superseded)
- `storage-only.bicep` - Test template

**Benefits of Cleanup**:

- ✅ Reduced confusion (18 → 3 templates)
- ✅ Clear deployment paths
- ✅ Eliminated potential conflicts
- ✅ Easier maintenance

## 💰 Cost Optimization

The multi-resource group architecture enables cost optimization:

- **Database RG** (`carpool-db-rg`): Always running, contains data
- **Compute RG** (`carpool-rg`): Can be deleted to save ~$50-100/month
- **Restoration**: Quick 5-minute deployment when needed

See `scripts/cost-optimize.sh` for cost management commands.

## 🔧 Template Parameters

### Common Parameters (All Templates)

- `appName`: Application name prefix (default: 'carpool')
- `environmentName`: Environment (dev/test/prod, default: 'dev')
- `location`: Azure region (default: resourceGroup().location)

### Multi-Resource Group Specific

- `databaseResourceGroup`: Name of database resource group (for compute template)
- `cosmosDbAccountName`: Cosmos DB account name (for cross-RG references)

## 📋 Best Practices

1. **Use Multi-Resource Group**: Preferred for cost optimization
2. **Deploy Database First**: Database RG before compute RG
3. **Parameter Consistency**: Use same parameters across both templates
4. **Environment Management**: Use different parameter files for dev/test/prod
5. **Backup Strategy**: Keep `main.bicep` for emergency rollback scenarios

## 🆘 Troubleshooting

### Common Issues

**Cross-Resource Group Reference Errors**:

- Ensure database resource group exists before deploying compute resources
- Verify resource names match between templates

**Permission Errors**:

- Ensure deployment principal has Contributor access to both resource groups
- Check Azure RBAC assignments

**Template Conflicts**:

- Don't mix single-RG and multi-RG deployments in same subscription
- Use consistent naming conventions

### Support

For deployment issues, check:

1. `./scripts/deploy-multi-rg.sh verify` - Verify deployment status
2. Azure Portal → Resource Groups → Deployments tab
3. `az deployment group list --resource-group [rg-name]` - Check deployment history
