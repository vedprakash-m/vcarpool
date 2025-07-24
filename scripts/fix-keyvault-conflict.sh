#!/bin/bash

# Fix Key Vault naming conflict by purging soft-deleted vault
# This script helps resolve the "VaultAlreadyExists" error during deployment

set -e

# Configuration
VAULT_NAME="carpool-kv"
LOCATION="eastus2"

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

# Function to check if vault exists in active state
check_active_vault() {
    log "Checking for active Key Vault: $VAULT_NAME"
    if az keyvault show --name "$VAULT_NAME" >/dev/null 2>&1; then
        success "Active Key Vault found: $VAULT_NAME"
        return 0
    else
        log "No active Key Vault found with name: $VAULT_NAME"
        return 1
    fi
}

# Function to check if vault exists in soft-deleted state
check_soft_deleted_vault() {
    log "Checking for soft-deleted Key Vault: $VAULT_NAME"
    if az keyvault list-deleted --query "[?name=='$VAULT_NAME']" -o tsv | grep -q "$VAULT_NAME"; then
        success "Soft-deleted Key Vault found: $VAULT_NAME"
        return 0
    else
        log "No soft-deleted Key Vault found with name: $VAULT_NAME"
        return 1
    fi
}

# Function to show soft-deleted vault details
show_soft_deleted_details() {
    log "Getting details of soft-deleted Key Vault..."
    az keyvault list-deleted --query "[?name=='$VAULT_NAME']" -o table
}

# Function to purge soft-deleted vault
purge_soft_deleted_vault() {
    log "Purging soft-deleted Key Vault: $VAULT_NAME"
    warning "This action is IRREVERSIBLE. The vault and all its secrets will be permanently deleted."
    
    # Get the vault details first
    local vault_location=$(az keyvault list-deleted --query "[?name=='$VAULT_NAME'].properties.location" -o tsv)
    if [ -z "$vault_location" ]; then
        error "Could not determine location of soft-deleted vault"
        return 1
    fi
    
    log "Vault location: $vault_location"
    log "Purging vault..."
    
    if az keyvault purge --name "$VAULT_NAME" --location "$vault_location"; then
        success "Key Vault successfully purged: $VAULT_NAME"
        log "You can now retry the deployment with the new environment-specific naming"
    else
        error "Failed to purge Key Vault: $VAULT_NAME"
        return 1
    fi
}

# Function to show resolution options
show_resolution_options() {
    log "Resolution options for Key Vault naming conflict:"
    echo ""
    echo "1. 🗑️  Purge the soft-deleted vault (if you don't need the old data):"
    echo "   $0 purge"
    echo ""
    echo "2. 🔄 Recover the soft-deleted vault (if you want to keep the old data):"
    echo "   az keyvault recover --name $VAULT_NAME --location $LOCATION"
    echo ""
    echo "3. ✅ The deployment script has been updated to use environment-specific naming:"
    echo "   - Production: carpool-kv-prod"
    echo "   - Development: carpool-kv-dev"
    echo "   - Test: carpool-kv-test"
    echo ""
    echo "After choosing an option, retry the deployment."
}

# Main execution
main() {
    log "Diagnosing Key Vault naming conflict for: $VAULT_NAME"
    echo ""
    
    # Check both active and soft-deleted states
    local has_active=false
    local has_soft_deleted=false
    
    if check_active_vault; then
        has_active=true
    fi
    
    if check_soft_deleted_vault; then
        has_soft_deleted=true
        show_soft_deleted_details
    fi
    
    # Provide recommendations based on findings
    if [ "$has_active" = true ]; then
        warning "An active Key Vault with name '$VAULT_NAME' already exists."
        log "The deployment script has been updated to use environment-specific naming."
        log "The new vault will be named: carpool-kv-prod (for production)"
    elif [ "$has_soft_deleted" = true ]; then
        warning "A soft-deleted Key Vault with name '$VAULT_NAME' exists."
        show_resolution_options
    else
        success "No naming conflicts found for '$VAULT_NAME'"
        log "The deployment should work after the recent fixes."
    fi
}

# Handle script arguments
case "${1:-check}" in
    "check")
        main
        ;;
    "purge")
        if check_soft_deleted_vault; then
            purge_soft_deleted_vault
        else
            error "No soft-deleted vault found to purge"
            exit 1
        fi
        ;;
    "show-deleted")
        show_soft_deleted_details
        ;;
    "help")
        echo "Usage: $0 [check|purge|show-deleted|help]"
        echo "  check        - Check for vault conflicts (default)"
        echo "  purge        - Purge soft-deleted vault"
        echo "  show-deleted - Show soft-deleted vault details"
        echo "  help         - Show this help"
        ;;
    *)
        error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
