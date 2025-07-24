# CI/CD Deployment Fix: Key Vault Naming Conflict Resolution

## Problem Summary

The deployment failed with error: `VaultAlreadyExists - The vault name 'carpool-kv' is already in use.`

This happened because:

1. The Key Vault name was hardcoded to 'carpool-kv' in the Bicep template
2. The deployment script wasn't passing environment-specific parameters
3. A Key Vault with this name exists (either active or soft-deleted)

## Changes Made

### 1. Fixed Bicep Templates

- **`infra/database.bicep`**: Updated Key Vault resource to use the `keyVaultName` parameter instead of hardcoded 'carpool-kv'
- **`infra/database.bicep`**: Changed default `keyVaultName` to use environment-specific naming: `${appName}-kv-${environmentName}`
- **`infra/main-compute.bicep`**: Updated default `keyVaultName` to match the new pattern

### 2. Updated Deployment Script

- **`scripts/deploy-multi-rg.sh`**: Added `keyVaultName` parameter to both database and compute deployments
- Now passes `carpool-kv-${ENVIRONMENT}` (e.g., `carpool-kv-prod` for production)

### 3. Created Diagnostic Tool

- **`scripts/fix-keyvault-conflict.sh`**: New script to diagnose and resolve Key Vault conflicts

## Environment-Specific Key Vault Names

The new naming convention follows the pattern established in parameter files:

- **Production**: `carpool-kv-prod`
- **Development**: `carpool-kv-dev`
- **Test**: `carpool-kv-test`

## Resolution Steps

### Option 1: Quick Fix (Recommended)

Re-run the CI/CD pipeline. The fixes will create a new Key Vault with environment-specific naming (`carpool-kv-prod`), avoiding the conflict.

### Option 2: If Old Key Vault is Soft-Deleted

If you see the same error again, run the diagnostic script:

```bash
# Check for Key Vault conflicts
./scripts/fix-keyvault-conflict.sh check

# If a soft-deleted vault is found and you don't need its data:
./scripts/fix-keyvault-conflict.sh purge
```

### Option 3: If You Need the Old Key Vault Data

If the old `carpool-kv` contains important data:

```bash
# Recover the soft-deleted vault
az keyvault recover --name carpool-kv --location eastus2

# Then rename it manually or export secrets before purging
```

## Verification

After deployment, you can verify the Key Vault was created with the correct name:

```bash
# Check if new environment-specific vault exists
az keyvault show --name carpool-kv-prod

# List all Key Vaults in the resource group
az keyvault list --resource-group carpool-db-rg --query "[].name" -o table
```

## Benefits of This Fix

1. **Environment Isolation**: Each environment gets its own Key Vault
2. **Idempotent Deployments**: No more naming conflicts on re-deployments
3. **Consistent Naming**: Follows the established pattern in parameter files
4. **Cost Optimization**: Aligns with the multi-RG deployment strategy

## Files Modified

- `infra/database.bicep` - Fixed Key Vault resource and parameter usage
- `infra/main-compute.bicep` - Updated default Key Vault naming
- `scripts/deploy-multi-rg.sh` - Added Key Vault name parameter passing
- `scripts/fix-keyvault-conflict.sh` - New diagnostic/fix tool

The deployment should now succeed with proper environment-specific Key Vault naming.
