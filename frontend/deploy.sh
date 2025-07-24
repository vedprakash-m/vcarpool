#!/bin/bash
set -e

echo "🚀 Starting Carpool frontend deployment..."

# Get the current working directory
echo "📍 Current directory: $(pwd)"
echo "📁 Directory contents:"
ls -la

# Check if we're in the correct location
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Are we in the frontend directory?"
  exit 1
fi

# Navigate to workspace root if needed
if [ -d "../shared" ]; then
  echo "🔄 Found shared package directory"
  
  echo "🔧 Building shared package..."
  cd ../shared
  npm ci --prefer-offline --no-audit --no-fund
  npm run build
  echo "✅ Shared package built successfully"
  
  echo "📋 Copying shared package to frontend..."
  cd ../frontend
  
  # Create the node_modules directory structure
  mkdir -p node_modules/@carpool/shared
  
  # Copy the built shared package
  if [ -d "../shared/dist" ]; then
    cp -r ../shared/dist/* node_modules/@carpool/shared/ 2>/dev/null || echo "⚠️  No dist files to copy"
  fi
  
  if [ -f "../shared/package.json" ]; then
    cp ../shared/package.json node_modules/@carpool/shared/package.json 2>/dev/null || echo "⚠️  No package.json to copy"
  fi
  
  echo "✅ Shared package copied successfully"
else
  echo "⚠️  Shared package directory not found, assuming it's already set up"
fi

echo "🏗️  Installing frontend dependencies..."
npm ci --prefer-offline --no-audit --no-fund

echo "🔍 Verifying shared package..."
if [ -d "node_modules/@carpool/shared" ]; then
  echo "✅ Shared package found in node_modules"
  ls -la node_modules/@carpool/shared/
else
  echo "❌ Shared package not found in node_modules"
fi

echo "🎯 Building frontend..."
npm run build

echo "✅ Frontend deployment completed successfully!" 