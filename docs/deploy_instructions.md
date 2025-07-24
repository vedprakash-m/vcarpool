# Carpool App Deployment Instructions

**Cost-Optimized Single Environment Deployment**

## Resource Organization

- **carpool-db-rg**: Persistent resources (database, key vault, storage)
- **carpool-rg**: Compute resources (functions, web app, insights)

## Entra ID Configuration

- Resource Group: `ved-id-rg`
- Tenant ID: `VED`
- Domain: `VedID.onmicrosoft.com`

## Deploy Persistent Resources (carpool-db-rg)

```bash
az group create --name carpool-db-rg --location eastus
az deployment group create --resource-group carpool-db-rg --template-file infra/database.bicep
```

## Deploy Compute Resources (carpool-rg)

```bash
az group create --name carpool-rg --location eastus
az deployment group create --resource-group carpool-rg --template-file infra/main-compute.bicep
```

## Environment Variables (Function App)

```bash
# JWT Configuration
JWT_ACCESS_SECRET=<32-byte-hex>
JWT_REFRESH_SECRET=<32-byte-hex>
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Database
COSMOS_DB_ENDPOINT=https://carpool-db.documents.azure.com:443/
COSMOS_DB_DATABASE_ID=carpool

# Entra ID
AZURE_TENANT_ID=VED
AZURE_CLIENT_ID=<from-ved-id-rg>
AZURE_CLIENT_SECRET=<from-carpool-kv>
```

## Resource Names (Static/Idempotent)

- Database: `carpool-db`
- Key Vault: `carpool-kv`
- Storage: `carpoolsa`
- Function App: `carpool-api`
- Web App: `carpool-web`
- Insights: `carpool-insights`

## Pause/Resume Operations

**Pause**: `az group delete --name carpool-rg --yes`
**Resume**: Re-run compute deployment above

## Deploy Application Code

```bash
# Backend
func azure functionapp publish carpool-api

# Frontend
npm run build && az staticwebapp deploy --name carpool-web
```
