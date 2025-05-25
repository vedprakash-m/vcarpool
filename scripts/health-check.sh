#!/bin/bash

# Health Check Script for CI/CD Pipeline
# Validates that all required components are in place and functional
# Usage: ./health-check.sh [environment]

set -e  # Exit immediately if any command fails

ENV=${1:-dev}
echo "🏥 Running health check for environment: $ENV"

# Check Node.js version
NODE_VERSION=$(node -v)
echo "✅ Node.js version: $NODE_VERSION"

# Check NPM availability
NPM_VERSION=$(npm -v)
echo "✅ NPM version: $NPM_VERSION"

# Check TypeScript version
TS_VERSION=$(npx tsc --version)
echo "✅ TypeScript: $TS_VERSION"

# Check Azure CLI if available
if command -v az &> /dev/null; then
  AZ_VERSION=$(az --version | head -n 1)
  echo "✅ Azure CLI: $AZ_VERSION"
else
  echo "⚠️ Azure CLI not found - continuing without Azure checks"
fi

# Validate package.json files
for pkg in . backend frontend shared; do
  if [ -f "$pkg/package.json" ]; then
    echo "✅ package.json found in $pkg"
  else
    echo "❌ Missing package.json in $pkg"
    exit 1
  fi
done

# Check if key configuration files exist
CONFIG_FILES=(
  "backend/host.json"
  "frontend/next.config.js"
  "frontend/playwright.config.ts"
  "infra/core-infrastructure.bicep"
  ".github/workflows/ci-cd.yml"
)

for file in "${CONFIG_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file exists"
  else
    echo "❌ Missing $file"
    exit 1
  fi
done

# Validate workspace structure
WORKSPACES=$(jq -r '.workspaces | join(",")' package.json)
echo "✅ Workspace configuration: $WORKSPACES"

# Test directories
mkdir -p frontend/e2e/test-results
echo "✅ Ensured test directories exist"

echo "✅ Health check completed successfully!"
