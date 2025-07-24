#!/bin/bash

# Azure Service Principal Setup Script for GitHub Actions
# This script creates the service principal and provides the secrets needed for GitHub Actions

set -e

echo "🚀 Azure Service Principal Setup for GitHub Actions"
echo "==================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Azure CLI is installed and user is logged in
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

if ! az account show &> /dev/null; then
    print_error "Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Get current subscription info
SUBSCRIPTION_ID=$(az account show --query "id" -o tsv)
TENANT_ID=$(az account show --query "tenantId" -o tsv)
ACCOUNT_NAME=$(az account show --query "name" -o tsv)

print_info "Current Azure context:"
echo "  Account: $ACCOUNT_NAME"
echo "  Subscription ID: $SUBSCRIPTION_ID"
echo "  Tenant ID: $TENANT_ID"

echo

# Confirm subscription
read -p "Is this the correct subscription? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Please switch to the correct subscription with:"
    echo "  az account set --subscription <subscription-id>"
    exit 1
fi

# Configuration
APP_NAME="carpool-github-actions"
RESOURCE_GROUP="carpool-rg"
GITHUB_REPO_URL=""

# Ask for GitHub repository URL
echo
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/carpool): " GITHUB_REPO_URL

if [[ -z "$GITHUB_REPO_URL" ]]; then
    print_error "GitHub repository URL is required"
    exit 1
fi

# Extract org and repo name from URL
GITHUB_ORG=$(echo "$GITHUB_REPO_URL" | sed -n 's/.*github\.com\/\([^\/]*\)\/.*/\1/p')
GITHUB_REPO=$(echo "$GITHUB_REPO_URL" | sed -n 's/.*github\.com\/[^\/]*\/\([^\/]*\).*/\1/p')

if [[ -z "$GITHUB_ORG" || -z "$GITHUB_REPO" ]]; then
    print_error "Could not parse GitHub repository URL. Please check the format."
    exit 1
fi

print_info "GitHub repository: $GITHUB_ORG/$GITHUB_REPO"

# Create resource group if it doesn't exist
echo
print_info "Ensuring resource group exists..."
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    print_info "Creating resource group '$RESOURCE_GROUP'..."
    az group create --name "$RESOURCE_GROUP" --location "East US 2"
    print_success "Resource group created"
else
    print_success "Resource group already exists"
fi

# Create service principal
echo
print_info "Creating service principal..."

# Check if service principal already exists
EXISTING_SP=$(az ad sp list --display-name "$APP_NAME" --query "[0].appId" -o tsv 2>/dev/null || echo "")

if [[ -n "$EXISTING_SP" ]]; then
    print_warning "Service principal '$APP_NAME' already exists"
    read -p "Do you want to recreate it? This will reset credentials (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deleting existing service principal..."
        az ad sp delete --id "$EXISTING_SP"
        print_success "Existing service principal deleted"
    else
        CLIENT_ID="$EXISTING_SP"
        print_info "Using existing service principal: $CLIENT_ID"
    fi
fi

if [[ -z "$CLIENT_ID" ]]; then
    print_info "Creating new service principal..."
    
    # Create service principal with contributor role
    SP_OUTPUT=$(az ad sp create-for-rbac \
        --name "$APP_NAME" \
        --role "Contributor" \
        --scopes "/subscriptions/$SUBSCRIPTION_ID" \
        --json-auth)
    
    CLIENT_ID=$(echo "$SP_OUTPUT" | jq -r '.clientId')
    print_success "Service principal created with ID: $CLIENT_ID"
fi

# Add additional permissions for Static Web Apps if needed
print_info "Adding Website Contributor role for Static Web Apps..."
az role assignment create \
    --assignee "$CLIENT_ID" \
    --role "Website Contributor" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    2>/dev/null || print_warning "Could not assign Website Contributor role (may not be needed)"

# Configure OIDC federated credentials
echo
print_info "Configuring OIDC federated credentials..."

# Main branch credential
print_info "Adding federated credential for main branch..."
az ad app federated-credential create \
    --id "$CLIENT_ID" \
    --parameters '{
        "name": "carpool-main-branch",
        "issuer": "https://token.actions.githubusercontent.com",
        "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':ref:refs/heads/main",
        "description": "Main branch deployment",
        "audiences": ["api://AzureADTokenExchange"]
    }' 2>/dev/null || print_warning "Main branch federated credential may already exist"

# Pull request credential  
print_info "Adding federated credential for pull requests..."
az ad app federated-credential create \
    --id "$CLIENT_ID" \
    --parameters '{
        "name": "carpool-pull-requests",
        "issuer": "https://token.actions.githubusercontent.com", 
        "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':pull_request",
        "description": "Pull request validation",
        "audiences": ["api://AzureADTokenExchange"]
    }' 2>/dev/null || print_warning "Pull request federated credential may already exist"

print_success "OIDC federated credentials configured"

# Output GitHub secrets
echo
echo "🔑 GitHub Repository Secrets"
echo "============================"
echo
print_success "Configure these secrets in your GitHub repository:"
echo "Go to: $GITHUB_REPO_URL/settings/secrets/actions"
echo
echo "Secret Name: AZURE_CLIENT_ID"
echo "Secret Value: $CLIENT_ID"
echo
echo "Secret Name: AZURE_TENANT_ID"  
echo "Secret Value: $TENANT_ID"
echo
echo "Secret Name: AZURE_SUBSCRIPTION_ID"
echo "Secret Value: $SUBSCRIPTION_ID"
echo

# Check for Static Web App
print_info "Checking for existing Static Web App..."
SWA_NAME="carpool-frontend"
SWA_TOKEN=""

if az staticwebapp show --name "$SWA_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    print_success "Static Web App '$SWA_NAME' found"
    SWA_TOKEN=$(az staticwebapp secrets list \
        --name "$SWA_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.apiKey" \
        --output tsv 2>/dev/null || echo "")
    
    if [[ -n "$SWA_TOKEN" ]]; then
        echo "Secret Name: AZURE_STATIC_WEB_APPS_API_TOKEN"
        echo "Secret Value: $SWA_TOKEN"
        echo
    fi
else
    print_warning "Static Web App '$SWA_NAME' not found"
    print_info "It will be created during deployment. You can add the token later."
fi

# GitHub CLI setup (optional)
if command -v gh &> /dev/null && gh auth status &> /dev/null; then
    echo
    read -p "Do you want to automatically configure GitHub secrets using GitHub CLI? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setting GitHub secrets..."
        
        gh secret set AZURE_CLIENT_ID --body "$CLIENT_ID" --repo "$GITHUB_ORG/$GITHUB_REPO"
        gh secret set AZURE_TENANT_ID --body "$TENANT_ID" --repo "$GITHUB_ORG/$GITHUB_REPO"  
        gh secret set AZURE_SUBSCRIPTION_ID --body "$SUBSCRIPTION_ID" --repo "$GITHUB_ORG/$GITHUB_REPO"
        
        if [[ -n "$SWA_TOKEN" ]]; then
            gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body "$SWA_TOKEN" --repo "$GITHUB_ORG/$GITHUB_REPO"
        fi
        
        print_success "GitHub secrets configured automatically!"
    fi
fi

echo
print_success "Setup completed!"
print_info "Next steps:"
echo "1. Verify all secrets are configured in GitHub repository settings"
echo "2. Test the workflow by pushing changes or manually triggering"
echo "3. Run './scripts/validate-azure-setup.sh' to validate the setup"
echo
echo "For troubleshooting, see: docs/AZURE_GITHUB_SETUP.md"
