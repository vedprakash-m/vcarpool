#!/bin/bash

# Configuration Validation Script
# Validates configuration files and dependencies that would cause CI/CD failures
# Can run without Docker daemon for essential checks

set -e

echo "🔧 Configuration Validation"
echo "==========================="

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
VALIDATION_ERRORS=0

# Store current directory
ORIGINAL_DIR=$(pwd)
cd "$(dirname "$0")/.."

# Function to cleanup and restore
cleanup() {
    cd "$ORIGINAL_DIR"
}
trap cleanup EXIT

print_status "INFO" "Validating CI/CD critical configuration..."

# 1. Check required files for Docker builds
print_status "INFO" "Checking required files for Docker builds..."

required_files=(
    "package.json"
    "shared/package.json"
    "backend/package.json"
    "backend/local.settings.sample.json"
    "frontend/package.json"
    "e2e/docker/Dockerfile.backend-test"
    "e2e/docker/Dockerfile.frontend-test"
    "docker-compose.e2e.yml"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_status "ERROR" "Required file missing: $file"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    else
        print_status "SUCCESS" "Found: $file"
    fi
done

# 2. Validate git tracking of essential files
print_status "INFO" "Validating git tracking of essential configuration files..."

git_tracked_files=(
    "backend/local.settings.sample.json"
    "e2e/docker/Dockerfile.backend-test"
    "e2e/docker/Dockerfile.frontend-test"
    "docker-compose.e2e.yml"
)

for file in "${git_tracked_files[@]}"; do
    if [ -f "$file" ]; then
        if git ls-files --error-unmatch "$file" &> /dev/null; then
            print_status "SUCCESS" "Git tracked: $file"
        else
            print_status "ERROR" "File exists but not tracked by git: $file"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
    fi
done

# 3. Check for problematic git ignore patterns
print_status "INFO" "Checking .gitignore patterns..."

if [ -f ".gitignore" ]; then
    # Check if local.settings.sample.json would be ignored
    if git check-ignore "backend/local.settings.sample.json" 2>/dev/null; then
        print_status "ERROR" "local.settings.sample.json is being ignored by git - CI/CD will fail"
        print_status "INFO" "Check .gitignore for overly broad patterns like 'local.settings.*.json'"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    else
        print_status "SUCCESS" "local.settings.sample.json is not ignored by git"
    fi
    
    # Ensure local.settings.json is still ignored (security)
    if ! git check-ignore "backend/local.settings.json" 2>/dev/null; then
        print_status "WARNING" "local.settings.json should be ignored by git for security"
        print_status "INFO" "Consider adding 'local.settings.json' to .gitignore"
    else
        print_status "SUCCESS" "local.settings.json is properly ignored by git"
    fi
fi

# 4. Validate .dockerignore configuration
print_status "INFO" "Checking .dockerignore configuration..."

if [ -f ".dockerignore" ]; then
    # Check if local.settings.sample.json is properly included
    if grep -q "^local\.settings\.sample\.json$" .dockerignore; then
        print_status "ERROR" ".dockerignore excludes local.settings.sample.json - Docker build will fail"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    elif grep -q "^!local\.settings\.sample\.json$" .dockerignore; then
        print_status "SUCCESS" ".dockerignore explicitly includes local.settings.sample.json"
    else
        # Check if it's excluded by a broader pattern
        if echo "backend/local.settings.sample.json" | docker run --rm -i alpine:latest sh -c 'cat > /tmp/testfile && cat > /tmp/dockerignore && docker-ignore-filter /tmp/dockerignore < /tmp/testfile' 2>/dev/null | grep -q "backend/local.settings.sample.json"; then
            print_status "WARNING" "local.settings.sample.json may be excluded by .dockerignore patterns"
        else
            print_status "SUCCESS" "local.settings.sample.json should be included in Docker builds"
        fi
    fi
    
    # Ensure local.settings.json is excluded
    if ! grep -q "local\.settings\.json" .dockerignore; then
        print_status "WARNING" "local.settings.json should be excluded from Docker builds for security"
    else
        print_status "SUCCESS" "local.settings.json is properly excluded from Docker builds"
    fi
else
    print_status "WARNING" "No .dockerignore file found - may include unnecessary files in builds"
fi

# 5. Validate Dockerfile references
print_status "INFO" "Validating Dockerfile references..."

dockerfiles=(
    "e2e/docker/Dockerfile.backend-test"
    "e2e/docker/Dockerfile.frontend-test"
)

for dockerfile in "${dockerfiles[@]}"; do
    if [ -f "$dockerfile" ]; then
        # Check if Dockerfile references local.settings.sample.json
        if grep -q "local\.settings\.sample\.json" "$dockerfile"; then
            print_status "SUCCESS" "$dockerfile references local.settings.sample.json"
            
            # Check the specific COPY command
            if grep -A 5 -B 5 "local\.settings\.sample\.json" "$dockerfile" | grep -q "COPY.*local\.settings\.sample\.json"; then
                print_status "SUCCESS" "$dockerfile has proper COPY command for local.settings.sample.json"
            else
                print_status "WARNING" "$dockerfile references but may not properly copy local.settings.sample.json"
            fi
        else
            print_status "WARNING" "$dockerfile does not reference local.settings.sample.json"
        fi
    fi
done

# 6. Validate package.json workspace configuration
print_status "INFO" "Validating package.json workspace configuration..."

if [ -f "package.json" ]; then
    if jq -e '.workspaces' package.json >/dev/null 2>&1; then
        workspaces=$(jq -r '.workspaces[]' package.json 2>/dev/null || jq -r '.workspaces.packages[]' package.json 2>/dev/null)
        for workspace in $workspaces; do
            if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
                print_status "SUCCESS" "Workspace valid: $workspace"
            else
                print_status "ERROR" "Workspace directory or package.json missing: $workspace"
                VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
            fi
        done
    else
        print_status "WARNING" "No workspaces configuration found in package.json"
    fi
fi

# 7. Check for common monorepo dependency issues
print_status "INFO" "Checking for monorepo dependency issues..."

# Check if shared package exists and is buildable
if [ -d "shared" ]; then
    if [ -f "shared/package.json" ]; then
        print_status "SUCCESS" "Shared package found"
        
        # Check if shared package has build script
        if jq -e '.scripts.build' shared/package.json >/dev/null 2>&1; then
            print_status "SUCCESS" "Shared package has build script"
        else
            print_status "WARNING" "Shared package missing build script"
        fi
    else
        print_status "ERROR" "Shared directory exists but missing package.json"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
fi

# Summary
end_time=$(date +%s)
duration=$((end_time - start_time))

if [ $VALIDATION_ERRORS -eq 0 ]; then
    print_status "SUCCESS" "🎉 Configuration validation passed in ${duration}s"
    print_status "INFO" "No CI/CD configuration issues detected"
    exit 0
else
    print_status "ERROR" "❌ Configuration validation failed with $VALIDATION_ERRORS errors in ${duration}s"
    print_status "INFO" "Fix the errors above to prevent CI/CD failures"
    exit 1
fi
# Test pre-commit fix
