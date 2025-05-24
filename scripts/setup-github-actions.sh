#!/bin/bash

# GitHub Actions Setup Script for vCarpool
# This script helps configure GitHub secrets and environment settings

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 vCarpool GitHub Actions Setup${NC}"
echo "=================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed. Please install it first:${NC}"
    echo "   brew install gh"
    echo "   or visit: https://cli.github.com/"
    exit 1
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first:${NC}"
    echo "   brew install azure-cli"
    echo "   or visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged into GitHub CLI
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  You need to authenticate with GitHub CLI${NC}"
    gh auth login
fi

# Check if user is logged into Azure CLI
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  You need to authenticate with Azure CLI${NC}"
    az login
fi

echo -e "${GREEN}✅ Prerequisites check completed${NC}"
echo

# Get repository information
REPO_OWNER=$(gh repo view --json owner --jq '.owner.login')
REPO_NAME=$(gh repo view --json name --jq '.name')

echo -e "${BLUE}📋 Repository Information:${NC}"
echo "   Owner: $REPO_OWNER"
echo "   Name: $REPO_NAME"
echo

# Create Azure Service Principal for GitHub Actions
echo -e "${BLUE}🔧 Setting up Azure Service Principal...${NC}"

SUBSCRIPTION_ID=$(az account show --query id --output tsv)
SP_NAME="sp-vcarpool-github-actions"

echo "   Subscription ID: $SUBSCRIPTION_ID"
echo "   Service Principal: $SP_NAME"

# Create service principal
echo "   Creating service principal..."
SP_OUTPUT=$(az ad sp create-for-rbac \
    --name "$SP_NAME" \
    --role contributor \
    --scopes "/subscriptions/$SUBSCRIPTION_ID" \
    --sdk-auth)

echo -e "${GREEN}✅ Service principal created successfully${NC}"

# Create GitHub environments
echo -e "${BLUE}🌍 Creating GitHub environments...${NC}"

ENVIRONMENTS=("dev" "test" "prod")

for env in "${ENVIRONMENTS[@]}"; do
    echo "   Creating environment: $env"
    
    # Create environment (this requires admin access to the repo)
    gh api repos/$REPO_OWNER/$REPO_NAME/environments/$env \
        --method PUT \
        --field wait_timer=0 \
        --field prevent_self_review=false \
        --field deployment_branch_policy='{"protected_branches":false,"custom_branch_policies":true}' \
        || echo "   Environment $env may already exist"
done

echo -e "${GREEN}✅ GitHub environments created${NC}"

# Set up GitHub secrets
echo -e "${BLUE}🔐 Setting up GitHub secrets...${NC}"

# AZURE_CREDENTIALS secret
echo "   Setting AZURE_CREDENTIALS secret..."
echo "$SP_OUTPUT" | gh secret set AZURE_CREDENTIALS

# Generate placeholder for Azure Static Web Apps token
echo "   Setting placeholder for AZURE_STATIC_WEB_APPS_TOKEN..."
echo "placeholder-token-configure-after-static-web-app-creation" | gh secret set AZURE_STATIC_WEB_APPS_TOKEN

echo -e "${GREEN}✅ GitHub secrets configured${NC}"

# Create parameters file for Bicep deployment
echo -e "${BLUE}📝 Creating Bicep parameters file...${NC}"

cat > infra/main.parameters.json << EOF
{
  "\$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "appName": {
      "value": "vcarpool"
    },
    "location": {
      "value": "East US"
    }
  }
}
EOF

echo -e "${GREEN}✅ Bicep parameters file created${NC}"

# Create local development environment files
echo -e "${BLUE}💻 Creating local development environment files...${NC}"

# Backend local.settings.json
if [ ! -f backend/local.settings.json ]; then
    cat > backend/local.settings.json << EOF
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "NODE_ENV": "development",
    "COSMOS_DB_ENDPOINT": "https://localhost:8081",
    "COSMOS_DB_KEY": "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
    "COSMOS_DB_DATABASE_ID": "vcarpool-local",
    "JWT_SECRET": "your-local-jwt-secret-key",
    "JWT_REFRESH_SECRET": "your-local-jwt-refresh-secret-key"
  },
  "Host": {
    "CORS": "*"
  }
}
EOF
    echo "   Created backend/local.settings.json"
fi

# Frontend environment file
if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << EOF
# Local development environment variables
NEXT_PUBLIC_API_BASE_URL=http://localhost:7071/api
NEXT_PUBLIC_ENVIRONMENT=development

# Analytics (optional for local development)
NEXT_PUBLIC_ANALYTICS_ID=

# Feature flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=true
EOF
    echo "   Created frontend/.env.local"
fi

echo -e "${GREEN}✅ Local development files created${NC}"

# Summary and next steps
echo
echo -e "${BLUE}🎉 Setup Complete!${NC}"
echo "=================="
echo
echo -e "${GREEN}✅ Completed:${NC}"
echo "   • Azure Service Principal created"
echo "   • GitHub environments created (dev, test, prod)"
echo "   • GitHub secrets configured"
echo "   • Bicep parameters file created"
echo "   • Local development files created"
echo
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo
echo -e "${BLUE}1. Configure Azure Static Web Apps Token:${NC}"
echo "   • Go to Azure Portal"
echo "   • Create a Static Web App resource (or use the one created by Bicep)"
echo "   • Get the deployment token from the Static Web App"
echo "   • Update the GitHub secret:"
echo "     gh secret set AZURE_STATIC_WEB_APPS_TOKEN"
echo
echo -e "${BLUE}2. Test the CI/CD Pipeline:${NC}"
echo "   • Push changes to 'develop' branch to test deployment"
echo "   • Use workflow_dispatch to manually trigger deployment"
echo "   • Monitor deployment in GitHub Actions tab"
echo
echo -e "${BLUE}3. Local Development:${NC}"
echo "   • Start Azure Cosmos DB Emulator (optional)"
echo "   • Run backend: cd backend && npm run dev"
echo "   • Run frontend: cd frontend && npm run dev"
echo
echo -e "${BLUE}4. Production Deployment:${NC}"
echo "   • Merge to 'main' branch for production deployment"
echo "   • Monitor deployment status in GitHub Actions"
echo "   • Verify application endpoints are working"
echo
echo -e "${BLUE}5. Monitoring Setup:${NC}"
echo "   • Configure Application Insights alerts"
echo "   • Set up monitoring dashboards"
echo "   • Review security recommendations"
echo
echo -e "${GREEN}🚀 Your vCarpool application is ready for CI/CD deployment!${NC}"
echo
echo -e "${BLUE}Useful Commands:${NC}"
echo "   • View workflow runs: gh run list"
echo "   • Watch workflow: gh run watch"
echo "   • Manual deployment: gh workflow run 'vCarpool CI/CD Pipeline' -f environment=dev"
echo
echo -e "${BLUE}Repository: https://github.com/$REPO_OWNER/$REPO_NAME${NC}"
echo -e "${BLUE}Actions: https://github.com/$REPO_OWNER/$REPO_NAME/actions${NC}"
