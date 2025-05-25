#!/bin/bash

# vCarpool Development Environment Setup Script
# Sets up a local development environment for the vCarpool project

set -e # Exit immediately if a command fails

echo "🚗 Setting up vCarpool development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."
TOOLS=("node" "npm" "az")
MISSING_TOOLS=()

for tool in "${TOOLS[@]}"; do
  if ! command -v $tool &> /dev/null; then
    MISSING_TOOLS+=($tool)
  fi
done

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
  echo "❌ Missing required tools: ${MISSING_TOOLS[@]}"
  echo "Please install them before proceeding."
  exit 1
fi

echo "✅ All prerequisite tools are installed"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_VERSION_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ $NODE_VERSION_MAJOR -lt 18 ]; then
  echo "❌ Node.js version $NODE_VERSION is not supported"
  echo "Please upgrade to Node.js 18.x or later"
  exit 1
fi

echo "✅ Using Node.js $NODE_VERSION"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Set up environment variables
echo "🔧 Setting up environment variables..."
ENV_FILES=(".env" "backend/.env" "frontend/.env")

for env_file in "${ENV_FILES[@]}"; do
  if [ ! -f "$env_file" ]; then
    echo "Creating $env_file..."
    if [ "$env_file" = ".env" ]; then
      cat > "$env_file" << EOF
# Root .env file for vCarpool
NODE_ENV=development
EOF
    elif [ "$env_file" = "backend/.env" ]; then
      cat > "$env_file" << EOF
# Backend .env file for vCarpool
NODE_ENV=development
JWT_SECRET=local-dev-jwt-secret
JWT_REFRESH_SECRET=local-dev-refresh-secret
EOF
    elif [ "$env_file" = "frontend/.env" ]; then
      cat > "$env_file" << EOF
# Frontend .env file for vCarpool
NEXT_PUBLIC_API_URL=http://localhost:7071/api
EOF
    fi
    echo "✅ Created $env_file"
  fi
done

# Build packages
echo "🏗️ Building packages..."
npm run build

# Setup development database if needed
if [ ! -d "./data" ]; then
  echo "📁 Creating local data directory..."
  mkdir -p "./data"
fi

echo "✅ Development environment setup complete!"
echo ""
echo "🚀 You can now start the development server with:"
echo "  npm run dev"
echo ""
echo "🧪 Run tests with:"
echo "  npm test"
echo ""
echo "🧹 Start a clean development environment with:"
echo "  npm run clean && npm run dev"
