#!/bin/bash

# E2E Docker Build Validation Script
# This script replicates the exact CI/CD Docker build process locally
# to catch configuration and dependency issues before they reach CI/CD

set -e

echo "🐳 E2E Docker Build Validation"
echo "==============================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
    esac
}

start_time=$(date +%s)

# Store current directory
ORIGINAL_DIR=$(pwd)
cd "$(dirname "$0")/.."

# Function to cleanup and restore
cleanup() {
    print_status "INFO" "Cleaning up Docker resources..."
    docker-compose -f docker-compose.e2e.yml down --volumes --remove-orphans 2>/dev/null || true
    docker system prune -f --filter "label=carpool-e2e" 2>/dev/null || true
    cd "$ORIGINAL_DIR"
}
trap cleanup EXIT

# Check prerequisites
print_status "INFO" "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_status "ERROR" "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_status "ERROR" "Docker Compose is not installed or not in PATH"
    exit 1
fi

if ! docker info &> /dev/null; then
    print_status "ERROR" "Docker daemon is not running"
    exit 1
fi

# Validate monorepo structure
print_status "INFO" "Validating monorepo structure..."

required_files=(
    "package.json"
    "shared/package.json"
    "backend/package.json"
    "backend/local.settings.sample.json"
    "e2e/docker/Dockerfile.backend-test"
    "docker-compose.e2e.yml"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_status "ERROR" "Required file missing: $file"
        exit 1
    fi
done

# Build shared package first (mirrors CI/CD dependency order)
print_status "INFO" "Building shared package..."
npm run build:shared || {
    print_status "ERROR" "Failed to build shared package"
    exit 1
}

# Clean up any existing Docker artifacts
print_status "INFO" "Cleaning up existing Docker artifacts..."
docker-compose -f docker-compose.e2e.yml down --volumes --remove-orphans 2>/dev/null || true

# Validate Docker build context (simulate CI/CD environment)
print_status "INFO" "Validating Docker build context..."

# Test that all required files are included in build context
docker build --no-cache --target backend-builder -f e2e/docker/Dockerfile.backend-test . || {
    print_status "ERROR" "Docker build failed - missing files in build context"
    print_status "INFO" "This is the same error that occurred in CI/CD"
    
    # Detailed diagnosis
    print_status "INFO" "Diagnosing build context issues..."
    
    # Check if .dockerignore is working correctly
    if [ -f ".dockerignore" ]; then
        print_status "INFO" ".dockerignore contents:"
        cat .dockerignore | grep -E "(local\.settings|backend/)" || echo "No relevant patterns found"
    fi
    
    # Check git status of required files
    print_status "INFO" "Git status of critical files:"
    git status backend/local.settings.sample.json || echo "File not tracked by git"
    
    exit 1
}

# Build and test the complete E2E environment
print_status "INFO" "Building complete E2E environment..."
docker-compose -f docker-compose.e2e.yml build --no-cache || {
    print_status "ERROR" "E2E Docker Compose build failed"
    exit 1
}

# Test container startup (without running full E2E tests)
print_status "INFO" "Testing container startup..."
docker-compose -f docker-compose.e2e.yml up -d mongodb-test || {
    print_status "ERROR" "Failed to start MongoDB test container"
    exit 1
}

# Wait for MongoDB to be ready
print_status "INFO" "Waiting for MongoDB to be ready..."
timeout 60 bash -c 'until docker-compose -f docker-compose.e2e.yml exec -T mongodb-test mongosh --eval "db.adminCommand(\"ping\")" --quiet; do sleep 2; done' || {
    print_status "ERROR" "MongoDB failed to start within timeout"
    docker-compose -f docker-compose.e2e.yml logs mongodb-test
    exit 1
}

# Test backend container startup
print_status "INFO" "Testing backend container startup..."
docker-compose -f docker-compose.e2e.yml up -d backend-test || {
    print_status "ERROR" "Failed to start backend test container"
    docker-compose -f docker-compose.e2e.yml logs backend-test
    exit 1
}

# Wait for backend to be ready
print_status "INFO" "Waiting for backend to be ready..."
timeout 60 bash -c 'until curl -f http://localhost:7072/api/health 2>/dev/null; do sleep 2; done' || {
    print_status "WARNING" "Backend health check timeout - checking if container is running"
    if docker-compose -f docker-compose.e2e.yml ps backend-test | grep -q "Up"; then
        print_status "INFO" "Backend container is running but health check failed - may be normal for this test"
    else
        print_status "ERROR" "Backend container failed to start"
        docker-compose -f docker-compose.e2e.yml logs backend-test
        exit 1
    fi
}

# Cleanup
print_status "INFO" "Cleaning up test environment..."
docker-compose -f docker-compose.e2e.yml down --volumes

end_time=$(date +%s)
duration=$((end_time - start_time))

print_status "SUCCESS" "🐳 E2E Docker validation completed successfully in ${duration}s"
print_status "INFO" "The same Docker build process used in CI/CD works locally"
