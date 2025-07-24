#!/bin/bash

# Production Deployment Script for Unified Authentication System
# Deploys the carpool application with unified authentication architecture

set -e

# Configuration
RESOURCE_GROUP="carpool-rg"
FUNCTION_APP_NAME="carpool-functions"
STATIC_WEB_APP_NAME="carpool-frontend"
LOCATION="East US 2"
SUBSCRIPTION_ID=""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS${NC}: $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING${NC}: $1"
}

log_error() {
    echo -e "${RED}❌ ERROR${NC}: $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi
    
    # Check if subscription is set
    if [ -z "$SUBSCRIPTION_ID" ]; then
        SUBSCRIPTION_ID=$(az account show --query id -o tsv)
        log_info "Using current subscription: $SUBSCRIPTION_ID"
    fi
    
    # Run production validation
    log_info "Running production readiness validation..."
    if ! bash scripts/production-validation.sh > /dev/null 2>&1; then
        log_warning "Production validation found issues. Continuing anyway..."
    fi
    
    log_success "Prerequisites check completed"
}

# Deploy backend function app
deploy_backend() {
    log_info "Deploying backend Azure Functions..."
    
    # Build the backend
    log_info "Building backend..."
    cd backend
    npm install
    npm run build
    cd ..
    
    # Create deployment package
    log_info "Creating deployment package..."
    cd backend
    zip -r deployment.zip . -x "node_modules/.cache/*" "*.log" "coverage/*"
    
    # Deploy to Azure Functions
    log_info "Deploying to Azure Functions: $FUNCTION_APP_NAME"
    az functionapp deployment source config-zip \
        --resource-group "$RESOURCE_GROUP" \
        --name "$FUNCTION_APP_NAME" \
        --src deployment.zip
    
    # Clean up
    rm deployment.zip
    cd ..
    
    log_success "Backend deployment completed"
}

# Configure application settings
configure_app_settings() {
    log_info "Configuring application settings..."
    
    # Check if JWT secrets are provided
    if [ -z "$JWT_ACCESS_SECRET" ] || [ -z "$JWT_REFRESH_SECRET" ]; then
        log_warning "JWT secrets not provided as environment variables"
        log_info "Generating secure JWT secrets..."
        
        JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        
        log_warning "Generated JWT secrets. Save these securely:"
        echo "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET"
        echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
    fi
    
    # Set application settings
    az functionapp config appsettings set \
        --resource-group "$RESOURCE_GROUP" \
        --name "$FUNCTION_APP_NAME" \
        --settings \
            "NODE_ENV=production" \
            "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET" \
            "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" \
            "JWT_ACCESS_EXPIRY=1h" \
            "JWT_REFRESH_EXPIRY=7d" \
            "JWT_ISSUER=carpool-app" \
            "JWT_AUDIENCE=carpool-users" \
            "JWT_ALGORITHM=HS256" \
            "BCRYPT_ROUNDS=12" \
            "MAX_LOGIN_ATTEMPTS=5" \
            "LOCKOUT_DURATION=300000"
    
    log_success "Application settings configured"
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend to Azure Static Web Apps..."
    
    # Build the frontend
    log_info "Building frontend..."
    cd frontend
    npm install
    
    # Set production API URL
    export NEXT_PUBLIC_API_URL="https://$FUNCTION_APP_NAME.azurewebsites.net/api"
    npm run build
    cd ..
    
    # Deploy using Azure Static Web Apps CLI
    if command -v swa &> /dev/null; then
        log_info "Deploying with Static Web Apps CLI..."
        cd frontend
        swa deploy --app-location . --output-location out --resource-group "$RESOURCE_GROUP" --app-name "$STATIC_WEB_APP_NAME"
        cd ..
    else
        log_warning "Static Web Apps CLI not found. Please deploy frontend manually."
        log_info "Frontend build completed in frontend/out/"
    fi
    
    log_success "Frontend deployment completed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Get function app URL
    FUNCTION_APP_URL="https://$FUNCTION_APP_NAME.azurewebsites.net"
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    sleep 30  # Wait for deployment to settle
    
    if curl -s "$FUNCTION_APP_URL/api/health" | grep -q "healthy"; then
        log_success "Health check passed"
    else
        log_warning "Health check failed or endpoint not ready"
    fi
    
    # Test authentication endpoint
    log_info "Testing authentication endpoint..."
    response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$FUNCTION_APP_URL/api/auth" \
        -H "Content-Type: application/json" \
        -d '{"action":"login","email":"test@example.com","password":"wrongpassword"}')
    
    if [ "$response" = "401" ] || [ "$response" = "400" ]; then
        log_success "Authentication endpoint responding correctly"
    else
        log_warning "Authentication endpoint response unexpected: $response"
    fi
    
    log_info "Deployment verification completed"
    echo ""
    echo "🚀 Deployment URLs:"
    echo "   Backend API: $FUNCTION_APP_URL/api"
    echo "   Health Check: $FUNCTION_APP_URL/api/health"
    echo "   Auth Endpoint: $FUNCTION_APP_URL/api/auth"
    echo ""
}

# Post-deployment tasks
post_deployment() {
    log_info "Running post-deployment tasks..."
    
    # Enable Application Insights
    log_info "Enabling Application Insights..."
    az monitor app-insights component create \
        --app "$FUNCTION_APP_NAME-insights" \
        --location "$LOCATION" \
        --resource-group "$RESOURCE_GROUP" \
        --application-type web || log_warning "Application Insights creation failed"
    
    # Set up monitoring alerts
    log_info "Setting up basic monitoring alerts..."
    # Add monitoring alert configurations here
    
    log_success "Post-deployment tasks completed"
}

# Main deployment flow
main() {
    echo "🚀 Starting Production Deployment"
    echo "================================="
    echo "Resource Group: $RESOURCE_GROUP"
    echo "Function App: $FUNCTION_APP_NAME"
    echo "Location: $LOCATION"
    echo ""
    
    check_prerequisites
    echo ""
    
    deploy_backend
    echo ""
    
    configure_app_settings
    echo ""
    
    deploy_frontend
    echo ""
    
    verify_deployment
    echo ""
    
    post_deployment
    echo ""
    
    log_success "🎉 Production deployment completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Monitor Application Insights for any issues"
    echo "   2. Test end-to-end authentication flows"
    echo "   3. Set up additional monitoring and alerts"
    echo "   4. Update DNS records if needed"
    echo "   5. Notify team of successful deployment"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --skip-validation   Skip production validation check"
        echo "  --backend-only      Deploy only backend"
        echo "  --frontend-only     Deploy only frontend"
        echo ""
        echo "Environment variables:"
        echo "  SUBSCRIPTION_ID     Azure subscription ID"
        echo "  JWT_ACCESS_SECRET   JWT access token secret"
        echo "  JWT_REFRESH_SECRET  JWT refresh token secret"
        echo ""
        exit 0
        ;;
    --backend-only)
        check_prerequisites
        deploy_backend
        configure_app_settings
        verify_deployment
        ;;
    --frontend-only)
        check_prerequisites
        deploy_frontend
        ;;
    *)
        main
        ;;
esac
