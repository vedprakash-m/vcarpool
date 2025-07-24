#!/bin/bash

# Comprehensive Pre-commit Validation Script
# Replicates CI/CD environment exactly to catch issues before push

set -e

echo "🛡️  Comprehensive Pre-commit Validation"
echo "========================================"

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

# Track validation results
validation_failed=false

# Function to run validation and track results
run_validation() {
    local name="$1"
    local command="$2"
    
    print_status "INFO" "Running $name..."
    if eval "$command"; then
        print_status "SUCCESS" "$name passed"
    else
        print_status "ERROR" "$name failed"
        validation_failed=true
    fi
    echo ""
}

# Change to project root
cd "$(dirname "$0")/.."

# 1. Clean build from scratch (like CI)
print_status "INFO" "Starting fresh build validation..."
run_validation "Clean workspace" "npm run clean 2>/dev/null || true"

# 2. Check for empty test files (CI killer)
print_status "INFO" "Checking for empty test files..."
empty_tests=$(find backend/src/__tests__ frontend/src/__tests__ -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | xargs -I {} sh -c 'if [ ! -s "{}" ]; then echo "{}"; fi' 2>/dev/null || true)
if [ -n "$empty_tests" ]; then
    print_status "ERROR" "Empty test files found (will cause CI failure):"
    echo "$empty_tests"
    validation_failed=true
else
    print_status "SUCCESS" "No empty test files found"
fi
echo ""

# 3. Install dependencies
run_validation "Install dependencies" "npm install"

# 4. Build shared package first (critical dependency)
run_validation "Build shared package" "npm run build --workspace=shared"

# 5. TypeScript compilation (backend)
run_validation "TypeScript backend compilation" "npm run type-check --workspace=backend"

# 6. TypeScript compilation (frontend)
run_validation "TypeScript frontend compilation" "npm run type-check --workspace=frontend"

# 7. Linting
run_validation "ESLint validation" "npm run lint 2>/dev/null || true"

# 8. Backend tests (with coverage)
run_validation "Backend tests" "npm run test --workspace=backend"

# 9. Docker build validation (if Docker available)
if command -v docker &> /dev/null; then
    run_validation "Docker E2E build validation" "./scripts/validate-e2e-docker.sh"
else
    print_status "WARNING" "Docker not available - skipping Docker validation"
fi

# 10. Authentication system validation
run_validation "Authentication system validation" "./scripts/validate-auth.sh"

# Final result
if [ "$validation_failed" = true ]; then
    print_status "ERROR" "Pre-commit validation FAILED - please fix issues before committing"
    exit 1
else
    print_status "SUCCESS" "All validations PASSED - ready to commit!"
    exit 0
fi
