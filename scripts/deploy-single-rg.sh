#!/bin/bash

# Single Resource Group Deployment Script for Carpool
# This script deploys all resources to a single Azure resource group

set -e

# Configuration
APP_NAME="carpool"
ENVIRONMENT="${ENVIRONMENT:-dev}"
LOCATION="${AZURE_LOCATION:-eastus2}"
RESOURCE_GROUP_NAME="${APP_NAME}-${ENVIRONMENT}-rg"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting single resource group deployment for Carpool"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Environment: $ENVIRONMENT"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Location: $LOCATION"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Resource Group: $RESOURCE_GROUP_NAME"

# Create resource group if it doesn't exist
if az group show --name "$RESOURCE_GROUP_NAME" &> /dev/null; then
    echo "✅ Resource group '$RESOURCE_GROUP_NAME' already exists"
else
    echo "🔄 Creating resource group '$RESOURCE_GROUP_NAME'..."
    az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION"
    echo "✅ Resource group '$RESOURCE_GROUP_NAME' created"
fi

# Deploy infrastructure
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploying infrastructure to $RESOURCE_GROUP_NAME..."

az deployment group create \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --template-file "infra/main.bicep" \
    --parameters \
        environmentName="$ENVIRONMENT" \
        location="$LOCATION" \
    --verbose

echo "✅ Infrastructure deployment completed"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deployment finished successfully"

# Display outputs
echo ""
echo "🔍 Deployment outputs:"
az deployment group show \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --name "main" \
    --query "properties.outputs" \
    --output table

echo ""
echo "🎉 Single resource group deployment completed successfully!"
echo "Resource Group: $RESOURCE_GROUP_NAME"
echo "Environment: $ENVIRONMENT"
