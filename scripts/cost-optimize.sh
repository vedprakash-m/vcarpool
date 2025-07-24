#!/bin/bash

# Cost Optimization Script for Carpool
# Delete compute resources while preserving database to save costs

set -e

# Configuration
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

# Function to estimate costs
show_cost_analysis() {
    echo ""
    log "💰 Cost Analysis for Carpool Infrastructure"
    echo ""
    echo "🗄️  Database Resource Group: $DB_RESOURCE_GROUP"
    echo "   Resources:"
    if az group show --name "$DB_RESOURCE_GROUP" >/dev/null 2>&1; then
        az resource list --resource-group "$DB_RESOURCE_GROUP" --query "[].{Name:name, Type:type}" -o table
        echo "   Estimated cost: ~$24/month (Cosmos DB 400 RU/s)"
        echo "   Status: KEEP RUNNING (contains your data)"
    else
        echo "   Status: Does not exist"
    fi
    echo ""
    echo "⚡ Compute Resource Group: $COMPUTE_RESOURCE_GROUP"
    echo "   Resources:"
    if az group show --name "$COMPUTE_RESOURCE_GROUP" >/dev/null 2>&1; then
        az resource list --resource-group "$COMPUTE_RESOURCE_GROUP" --query "[].{Name:name, Type:type}" -o table
        echo "   Estimated cost: ~$50-100/month"
        echo "   Status: CAN BE DELETED for cost savings"
    else
        echo "   Status: Does not exist"
    fi
    echo ""
}

# Function to delete compute resources
delete_compute_resources() {
    log "Preparing to delete compute resources..."
    
    if ! az group show --name "$COMPUTE_RESOURCE_GROUP" >/dev/null 2>&1; then
        warning "Compute resource group '$COMPUTE_RESOURCE_GROUP' does not exist"
        return 0
    fi
    
    # Show what will be deleted
    echo ""
    warning "The following resources will be DELETED:"
    az resource list --resource-group "$COMPUTE_RESOURCE_GROUP" --query "[].{Name:name, Type:type, Location:location}" -o table
    
    echo ""
    warning "This action will:"
    echo "  - Delete Function App (backend API)"
    echo "  - Delete Static Web App (frontend)"
    echo "  - Delete Storage Account"
    echo "  - Delete Application Insights"
    echo "  - Delete Key Vault"
    echo "  - Save ~$50-100/month in Azure costs"
    echo ""
    warning "Your database and data will remain safe in '$DB_RESOURCE_GROUP'"
    echo ""
    
    # Confirmation prompt
    read -p "Are you sure you want to delete compute resources? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Deletion cancelled by user"
        return 0
    fi
    
    # Final confirmation
    read -p "Type 'DELETE' to confirm deletion of compute resources: " -r
    if [[ $REPLY != "DELETE" ]]; then
        log "Deletion cancelled - confirmation failed"
        return 0
    fi
    
    log "Deleting compute resource group: $COMPUTE_RESOURCE_GROUP"
    az group delete --name "$COMPUTE_RESOURCE_GROUP" --yes --no-wait
    
    success "Compute resource deletion initiated"
    log "Deletion is running in the background and may take 5-10 minutes"
    log "You can check status with: az group show --name $COMPUTE_RESOURCE_GROUP"
}

# Function to restore compute resources
restore_compute_resources() {
    log "Restoring compute resources..."
    
    if az group show --name "$COMPUTE_RESOURCE_GROUP" >/dev/null 2>&1; then
        warning "Compute resource group '$COMPUTE_RESOURCE_GROUP' already exists"
        echo "If you need to redeploy, delete it first or use the deploy script"
        return 1
    fi
    
    log "Running deployment script to restore compute resources..."
    /Users/vedprakashmishra/carpool/scripts/deploy-multi-rg.sh
    
    success "Compute resources restored"
    log "Your application should be accessible again"
}

# Function to check deletion status
check_deletion_status() {
    log "Checking deletion status..."
    
    if az group show --name "$COMPUTE_RESOURCE_GROUP" >/dev/null 2>&1; then
        warning "Compute resource group still exists - deletion may still be in progress"
        echo "Resources remaining:"
        az resource list --resource-group "$COMPUTE_RESOURCE_GROUP" --query "[].{Name:name, Type:type}" -o table
    else
        success "Compute resource group has been successfully deleted"
        echo ""
        log "Cost savings are now active! 💰"
        echo "To restore resources when needed, run:"
        echo "  ./scripts/cost-optimize.sh restore"
    fi
}

# Function to show help
show_help() {
    echo "Carpool Cost Optimization Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  analyze   - Show cost analysis (default)"
    echo "  delete    - Delete compute resources to save costs"
    echo "  restore   - Restore compute resources"
    echo "  status    - Check deletion status"
    echo "  help      - Show this help"
    echo ""
    echo "Cost Optimization Strategy:"
    echo "  1. Keep database running (contains your data)"
    echo "  2. Delete compute resources when not actively developing"
    echo "  3. Restore compute resources when needed"
    echo "  4. Save ~$50-100/month during inactive periods"
    echo ""
}

# Main execution
main() {
    case "${1:-analyze}" in
        "analyze")
            show_cost_analysis
            ;;
        "delete")
            show_cost_analysis
            delete_compute_resources
            ;;
        "restore")
            restore_compute_resources
            ;;
        "status")
            check_deletion_status
            ;;
        "help")
            show_help
            ;;
        *)
            error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

main "$@"
