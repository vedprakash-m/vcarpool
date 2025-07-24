#!/bin/bash

# Ultra-Fast Pre-push Hook
# For when you need to push quickly but still maintain basic quality

set -e

echo "⚡ Ultra-Fast Pre-push"
echo "===================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
    esac
}

start_time=$(date +%s)

# Store current directory
ORIGINAL_DIR=$(pwd)
cd "$(dirname "$0")/.."

# Function to cleanup and restore
cleanup() {
    cd "$ORIGINAL_DIR"
}
trap cleanup EXIT

# 1. Only type check - no linting, use workspace commands
print_status "INFO" "Quick type checking..."

# Ensure shared package is built first
npm run build:shared --silent || {
    print_status "ERROR" "Shared package build failed"
    exit 1
}

# Use workspace-aware type checking
npm run type-check:backend --silent || {
    print_status "ERROR" "Backend type check failed"
    exit 1
}

npm run type-check:frontend --silent || {
    print_status "ERROR" "Frontend type check failed"
    exit 1
}

# 2. Skip builds - trust that they work
print_status "INFO" "Skipping builds (CI will validate)"

# 3. Skip tests - CI will run them
print_status "INFO" "Skipping tests (CI will validate)"

# 4. Basic secret check only
if git diff --cached --name-only | grep -qE '\.(env|key|pem)$'; then
    print_status "ERROR" "Secrets files detected - please review"
    exit 1
fi

end_time=$(date +%s)
duration=$((end_time - start_time))

print_status "SUCCESS" "⚡ Ultra-fast validation completed in ${duration}s"
print_status "INFO" "Full validation will happen in CI pipeline"
