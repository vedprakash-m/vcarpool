#!/bin/bash

# Azure Setup Validation Script
# Validates Azure authentication setup for GitHub Actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}🔍 Azure Setup Validation${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

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

validate_azure_cli() {
    echo "Checking Azure CLI..."
    
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed"
        echo "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        return 1
    fi
    
    if ! az account show &> /dev/null; then
        print_error "Not logged into Azure"
        echo "Run: az login"
        return 1
    fi
    
    print_success "Azure CLI is installed and authenticated"
    
    # Show current subscription
    SUBSCRIPTION_ID=$(az account show --query id --output tsv)
    TENANT_ID=$(az account show --query tenantId --output tsv)
    print_info "Current subscription: $SUBSCRIPTION_ID"
    print_info "Tenant ID: $TENANT_ID"
    
    return 0
}

validate_service_principal() {
    echo -e "\nChecking Service Principal..."
    
    APP_NAME="carpool-github-actions"
    
    # Check if service principal exists
    SP_COUNT=$(az ad sp list --display-name "$APP_NAME" --query "length(@)")
    
    if [ "$SP_COUNT" -eq 0 ]; then
        print_error "Service principal '$APP_NAME' not found"
        echo "Create with: ./scripts/setup-github-secrets.sh"
        return 1
    fi
    
    print_success "Service principal '$APP_NAME' exists"
    
    # Get client ID
    CLIENT_ID=$(az ad sp list --display-name "$APP_NAME" --query "[0].appId" --output tsv)
    print_info "Client ID: $CLIENT_ID"
    
    # Save for later use
    export AZURE_CLIENT_ID=$CLIENT_ID
    
    return 0
}

validate_federated_credentials() {
    echo -e "\nChecking federated credentials..."
    
    APP_NAME="carpool-github-actions"
    CLIENT_ID=$(az ad sp list --display-name "$APP_NAME" --query "[0].appId" --output tsv 2>/dev/null)
    
    if [ -z "$CLIENT_ID" ]; then
        print_error "Cannot check federated credentials - service principal not found"
        return 1
    fi
    
    # Check for federated credentials
    CREDS=$(az ad app federated-credential list --id "$CLIENT_ID" --query "length(@)" 2>/dev/null || echo "0")
    
    if [ "$CREDS" -eq 0 ]; then
        print_warning "No federated credentials found"
        echo "This means you're using client secrets instead of OIDC (less secure)"
        echo "Run: ./scripts/setup-github-secrets.sh to set up OIDC"
        return 1
    fi
    
    print_success "Federated credentials configured ($CREDS found)"
    
    # List the credentials
    echo "Configured credentials:"
    az ad app federated-credential list --id "$CLIENT_ID" --query "[].{name:name, subject:subject}" --output table 2>/dev/null || true
    
    return 0
}

validate_github_secrets() {
    echo -e "\nChecking GitHub secrets..."
    
    if ! command -v gh &> /dev/null; then
        print_warning "GitHub CLI not installed - cannot validate secrets automatically"
        echo "Install with: brew install gh"
        echo "Then run: gh auth login"
        echo ""
        print_info "Manual check: Go to your repository settings → Secrets and variables → Actions"
        return 1
    fi
    
    if ! gh auth status &> /dev/null; then
        print_warning "Not authenticated with GitHub CLI"
        echo "Run: gh auth login"
        return 1
    fi
    
    # Get repository info
    REPO_INFO=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || echo "")
    if [ -n "$REPO_INFO" ]; then
        print_info "Checking secrets for repository: $REPO_INFO"
    fi
    
    # Check if secrets exist
    REQUIRED_SECRETS=("AZURE_CLIENT_ID" "AZURE_TENANT_ID" "AZURE_SUBSCRIPTION_ID" "AZURE_STATIC_WEB_APPS_API_TOKEN")
    ALL_SECRETS_VALID=true
    SECRETS_OUTPUT=""
    
    # Get list of secrets
    if SECRETS_LIST=$(gh secret list 2>/dev/null); then
        for secret in "${REQUIRED_SECRETS[@]}"; do
            if echo "$SECRETS_LIST" | grep -q "$secret"; then
                print_success "Secret '$secret' is set"
                SECRETS_OUTPUT="${SECRETS_OUTPUT}✅ $secret\n"
            else
                print_error "Secret '$secret' is missing"
                SECRETS_OUTPUT="${SECRETS_OUTPUT}❌ $secret (missing)\n"
                ALL_SECRETS_VALID=false
            fi
        done
    else
        print_error "Failed to retrieve secrets list"
        echo "Make sure you have admin access to the repository"
        return 1
    fi
    
    echo ""
    echo "Secrets summary:"
    echo -e "$SECRETS_OUTPUT"
    
    if [ "$ALL_SECRETS_VALID" = true ]; then
        print_success "All required GitHub secrets are configured"
        return 0
    else
        print_error "Some GitHub secrets are missing"
        if [ -n "$REPO_INFO" ]; then
            echo "Set them at: https://github.com/$REPO_INFO/settings/secrets/actions"
        fi
        echo "Or run: ./scripts/setup-github-secrets.sh"
        return 1
    fi
}

validate_static_web_app() {
    echo -e "\nChecking Static Web Apps..."
    
    RESOURCE_GROUP="carpool-rg"
    APP_NAME="carpool-frontend"
    
    # First check if resource group exists
    if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "Resource group '$RESOURCE_GROUP' not found"
        echo "You may need to create it first: az group create --name $RESOURCE_GROUP --location eastus"
        return 1
    fi
    
    if az staticwebapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_success "Static Web App '$APP_NAME' exists"
        
        # Try to get the API key (this will only work if user has permissions)
        if API_KEY=$(az staticwebapp secrets list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.apiKey" --output tsv 2>/dev/null); then
            print_info "API key retrieved successfully (${#API_KEY} characters)"
        else
            print_warning "Cannot retrieve API key (permission issue)"
        fi
        
        return 0
    else
        print_warning "Static Web App '$APP_NAME' not found in resource group '$RESOURCE_GROUP'"
        echo "Create it with Azure portal or CLI, then get the deployment token"
        return 1
    fi
}

test_github_workflow_trigger() {
    echo -e "\nTesting workflow configuration..."
    
    if ! command -v gh &> /dev/null; then
        print_warning "GitHub CLI not available - cannot test workflow"
        return 1
    fi
    
    if ! gh auth status &> /dev/null; then
        print_warning "Not authenticated with GitHub CLI - cannot test workflow"
        return 1
    fi
    
    # List available workflows
    if WORKFLOWS=$(gh workflow list 2>/dev/null); then
        print_info "Available workflows:"
        echo "$WORKFLOWS"
        echo ""
        
        # Check if CI pipeline exists
        if echo "$WORKFLOWS" | grep -q -i "ci"; then
            print_success "CI workflow found"
            echo "Test it by pushing changes or running:"
            echo "gh workflow run 'CI Pipeline' --ref main"
        else
            print_warning "No CI workflow found"
        fi
    else
        print_warning "Cannot list workflows"
    fi
    
    return 0
}

generate_quick_fix_commands() {
    echo -e "\n🔧 Quick Fix Commands"
    echo "====================="
    
    if [ ! -z "$AZURE_CLIENT_ID" ]; then
        SUBSCRIPTION_ID=$(az account show --query id --output tsv)
        TENANT_ID=$(az account show --query tenantId --output tsv)
        
        echo "If secrets are missing, set them with:"
        echo ""
        echo "gh secret set AZURE_CLIENT_ID --body=\"$AZURE_CLIENT_ID\""
        echo "gh secret set AZURE_TENANT_ID --body=\"$TENANT_ID\""
        echo "gh secret set AZURE_SUBSCRIPTION_ID --body=\"$SUBSCRIPTION_ID\""
        echo "gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body=\"YOUR_TOKEN_HERE\""
        echo ""
    fi
    
    echo "Or run the automated setup:"
    echo "./scripts/setup-github-secrets.sh"
    echo ""
}

main() {
    print_header
    
    VALIDATION_PASSED=true
    
    validate_azure_cli || VALIDATION_PASSED=false
    validate_service_principal || VALIDATION_PASSED=false
    validate_federated_credentials # Don't fail on this - it's optional but recommended
    validate_github_secrets || VALIDATION_PASSED=false
    validate_static_web_app # Don't fail on this - it might not exist yet
    test_github_workflow_trigger
    
    echo ""
    if [ "$VALIDATION_PASSED" = true ]; then
        print_success "🎉 All critical validations passed!"
        echo "Your Azure GitHub Actions setup should be working correctly."
        echo ""
        echo "Next steps:"
        echo "1. Push some changes to trigger the CI pipeline"
        echo "2. Check the Actions tab in your GitHub repository"
        echo "3. Monitor for any authentication errors"
    else
        print_error "❌ Some validations failed"
        echo "Please fix the issues above before proceeding."
        echo ""
        generate_quick_fix_commands
        echo "For detailed help, check: docs/AZURE_GITHUB_SETUP.md"
    fi
    
    echo ""
}

main "$@"
