#!/bin/bash

# Multi-Resource Group Deployment Script for Carpool
# This script deploys infrastructure across two resource groups for cost optimization:
# - Database resources in carpool-db-rg (persistent)
# - Compute resources in carpool-rg (can be deleted to save costs)

set -e

# Configuration
LOCATION="eastus2"
APP_NAME="carpool"
ENVIRONMENT="${ENVIRONMENT:-prod}"
DB_RESOURCE_GROUP="${APP_NAME}-db-rg"
COMPUTE_RESOURCE_GROUP="${APP_NAME}-rg"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if resource group exists
check_resource_group() {
    local rg_name=$1
    if az group show --name "$rg_name" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to create resource group if it doesn't exist
ensure_resource_group() {
    local rg_name=$1
    local rg_type=$2
    
    if check_resource_group "$rg_name"; then
        success "Resource group '$rg_name' already exists"
    else
        log "Creating $rg_type resource group: $rg_name"
        az group create --name "$rg_name" --location "$LOCATION"
        success "Created resource group: $rg_name"
    fi
}

# Function to deploy database resources
deploy_database() {
    log "Deploying database resources to $DB_RESOURCE_GROUP..."
    
    # Check if this is a production environment with existing containers
    local skip_containers="false"
    if [ "$ENVIRONMENT" = "prod" ]; then
        # For production, check if containers already exist to avoid partition key conflicts
        local cosmos_account="${APP_NAME}-cosmos-${ENVIRONMENT}"
        if az cosmosdb sql container show --account-name "$cosmos_account" --resource-group "$DB_RESOURCE_GROUP" --database-name "carpool" --name "notifications" >/dev/null 2>&1; then
            log "Found existing containers in production, skipping container creation to avoid conflicts"
            skip_containers="true"
        fi
    fi
    
    # Deploy database.bicep
    if ! az deployment group create \
        --resource-group "$DB_RESOURCE_GROUP" \
        --template-file "infra/database.bicep" \
        --parameters \
            appName="$APP_NAME" \
            environmentName="$ENVIRONMENT" \
            location="$LOCATION" \
            keyVaultName="${APP_NAME}-kv-${ENVIRONMENT}" \
            skipContainerCreation="$skip_containers" \
        --verbose 2>&1; then
        error "Database deployment failed"
        return 1
    fi
    
    success "Database deployment completed"
}

# Function to deploy compute resources
deploy_compute() {
    log "Deploying compute resources to $COMPUTE_RESOURCE_GROUP..."
    
    # Deploy main-compute.bicep with reference to database RG
    az deployment group create \
        --resource-group "$COMPUTE_RESOURCE_GROUP" \
        --template-file "infra/main-compute.bicep" \
        --parameters \
            appName="$APP_NAME" \
            environmentName="$ENVIRONMENT" \
            location="$LOCATION" \
            keyVaultName="${APP_NAME}-kv-${ENVIRONMENT}" \
        --verbose
    
    success "Compute deployment completed"
}

# Function to verify deployments
verify_deployment() {
    log "Verifying multi-resource group deployment..."
    
    # Check database resources
    log "Checking database resources in $DB_RESOURCE_GROUP..."
    local cosmos_db_count=$(az cosmosdb list --resource-group "$DB_RESOURCE_GROUP" --query "length(@)" -o tsv)
    if [ "$cosmos_db_count" -gt 0 ]; then
        success "Database resources deployed successfully ($cosmos_db_count Cosmos DB accounts)"
    else
        error "No database resources found in $DB_RESOURCE_GROUP"
        return 1
    fi
    
    # Check compute resources
    log "Checking compute resources in $COMPUTE_RESOURCE_GROUP..."
    local function_app_count=$(az functionapp list --resource-group "$COMPUTE_RESOURCE_GROUP" --query "length(@)" -o tsv)
    local static_web_app_count=$(az staticwebapp list --resource-group "$COMPUTE_RESOURCE_GROUP" --query "length(@)" -o tsv)
    
    if [ "$function_app_count" -gt 0 ] && [ "$static_web_app_count" -gt 0 ]; then
        success "Compute resources deployed successfully ($function_app_count Function Apps, $static_web_app_count Static Web Apps)"
    else
        error "Compute resources incomplete in $COMPUTE_RESOURCE_GROUP"
        return 1
    fi
    
    success "Multi-resource group deployment verification completed"
}

# Function to get deployment outputs
get_outputs() {
    log "Getting deployment outputs..."
    
    # Get Function App name from compute deployment
    local function_app_name=$(az deployment group show \
        --resource-group "$COMPUTE_RESOURCE_GROUP" \
        --name "main-compute" \
        --query "properties.outputs.functionAppName.value" \
        --output tsv 2>/dev/null || echo "")
    
    # Get Static Web App name from compute deployment
    local static_web_app_name=$(az deployment group show \
        --resource-group "$COMPUTE_RESOURCE_GROUP" \
        --name "main-compute" \
        --query "properties.outputs.staticWebAppName.value" \
        --output tsv 2>/dev/null || echo "")
    
    # Get Cosmos DB endpoint from database deployment
    local cosmos_db_endpoint=$(az deployment group show \
        --resource-group "$DB_RESOURCE_GROUP" \
        --name "database" \
        --query "properties.outputs.cosmosDbEndpoint.value" \
        --output tsv 2>/dev/null || echo "")
    
    # Output for CI/CD pipeline
    if [ -n "$GITHUB_OUTPUT" ]; then
        echo "function-app-name=$function_app_name" >> "$GITHUB_OUTPUT"
        echo "static-web-app-name=$static_web_app_name" >> "$GITHUB_OUTPUT"
        echo "cosmos-db-endpoint=$cosmos_db_endpoint" >> "$GITHUB_OUTPUT"
        echo "database-resource-group=$DB_RESOURCE_GROUP" >> "$GITHUB_OUTPUT"
        echo "compute-resource-group=$COMPUTE_RESOURCE_GROUP" >> "$GITHUB_OUTPUT"
    fi
    
    echo "Deployment Outputs:"
    echo "  Function App: $function_app_name"
    echo "  Static Web App: $static_web_app_name"
    echo "  Cosmos DB Endpoint: $cosmos_db_endpoint"
    echo "  Database RG: $DB_RESOURCE_GROUP"
    echo "  Compute RG: $COMPUTE_RESOURCE_GROUP"
}

# Function to show cost optimization help
show_cost_optimization() {
    echo ""
    log "💰 Cost Optimization Information:"
    echo ""
    echo "This multi-resource group setup enables cost optimization:"
    echo ""
    echo "🗄️  Database Resource Group: $DB_RESOURCE_GROUP"
    echo "   - Contains: Cosmos DB"
    echo "   - Keep running: Always (contains your data)"
    echo "   - Cost: ~$24/month (400 RU/s)"
    echo ""
    echo "⚡ Compute Resource Group: $COMPUTE_RESOURCE_GROUP"
    echo "   - Contains: Function App, Static Web App, Storage, App Insights"
    echo "   - Can delete when not needed"
    echo "   - Recreation: Run this script again"
    echo "   - Savings: ~$50-100/month when deleted"
    echo ""
    echo "📋 To delete compute resources (save costs):"
    echo "   az group delete --name $COMPUTE_RESOURCE_GROUP --yes --no-wait"
    echo ""
    echo "📋 To recreate compute resources:"
    echo "   ./scripts/deploy-multi-rg.sh"
    echo ""
}

# Main execution
main() {
    log "Starting multi-resource group deployment for Carpool"
    log "Environment: $ENVIRONMENT"
    log "Location: $LOCATION"
    
    # Ensure both resource groups exist
    ensure_resource_group "$DB_RESOURCE_GROUP" "database"
    ensure_resource_group "$COMPUTE_RESOURCE_GROUP" "compute"
    
    # Deploy in order: database first, then compute
    deploy_database
    deploy_compute
    
    # Verify deployment
    verify_deployment
    
    # Get and display outputs
    get_outputs
    
    # Show cost optimization information
    show_cost_optimization
    
    success "Multi-resource group deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "verify")
        verify_deployment
        ;;
    "outputs")
        get_outputs
        ;;
    "help")
        echo "Usage: $0 [deploy|verify|outputs|help]"
        echo "  deploy  - Deploy both resource groups (default)"
        echo "  verify  - Verify existing deployment"
        echo "  outputs - Get deployment outputs"
        echo "  help    - Show this help"
        ;;
    *)
        error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
