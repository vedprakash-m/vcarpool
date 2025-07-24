#!/bin/bash

# Local CI Validation Script
# Replicates CI environment validation locally to catch issues before push

set -e  # Exit on any error

echo "🔄 Starting Local CI Validation (replicating CI environment)"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo -e "[$(date +'%H:%M:%S')] $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Docker Compose command detection (handle both docker-compose and docker compose)
get_docker_compose_cmd() {
    if command_exists docker-compose; then
        echo "docker-compose"
    elif command_exists docker && docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    else
        return 1
    fi
}

# Validate environment
log "${YELLOW}🔍 Validating environment...${NC}"

if ! command_exists npm; then
    log "${RED}❌ npm not found. Please install Node.js${NC}"
    exit 1
fi

if ! command_exists docker; then
    log "${RED}❌ Docker not found. Please install Docker${NC}"
    exit 1
fi

DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd)
if [ $? -ne 0 ]; then
    log "${RED}❌ Neither 'docker-compose' nor 'docker compose' found. Please install Docker Compose${NC}"
    exit 1
fi

log "   ✅ Using Docker Compose command: ${DOCKER_COMPOSE_CMD}"

# Check Node version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log "${RED}❌ Node.js version 18+ required. Current: $(node --version)${NC}"
    exit 1
fi

log "${GREEN}✅ Environment validation passed${NC}"

# Step 1: Clean environment (replicate CI fresh state)
log "${YELLOW}🧹 Cleaning environment (replicating CI fresh state)...${NC}"
npm run clean 2>/dev/null || true

# Note: Keep package-lock.json for CI mode (npm ci requires it)
rm -rf node_modules 2>/dev/null || true
rm -rf backend/node_modules 2>/dev/null || true
rm -rf frontend/node_modules 2>/dev/null || true
rm -rf shared/node_modules 2>/dev/null || true
rm -rf e2e/node_modules 2>/dev/null || true

# Step 2: Install dependencies (exactly like CI)
log "${YELLOW}📦 Installing dependencies (CI mode)...${NC}"
# First ensure we have a lock file (if missing, generate it)
if [ ! -f "package-lock.json" ]; then
    log "   📝 Generating package-lock.json..."
    npm install --package-lock-only
fi
npm ci --ignore-scripts

# Step 3: Build shared package first (critical for module resolution)
log "${YELLOW}🔨 Building shared package...${NC}"
npm run build --workspace=shared

# Verify shared package was built correctly
if [ ! -f "shared/dist/index.js" ]; then
    log "${RED}❌ Shared package build failed - index.js not found${NC}"
    exit 1
fi

if [ ! -f "shared/dist/index.d.ts" ]; then
    log "${RED}❌ Shared package build failed - index.d.ts not found${NC}"
    exit 1
fi

# Step 4: Check for missing config files that CI/CD would not have
log "${YELLOW}🔍 Checking for CI/CD environment compatibility...${NC}"
missing_files=""

# Check for files that Docker expects but might be gitignored
if [ ! -f "backend/local.settings.json" ]; then
    if [ ! -f "backend/local.settings.sample.json" ]; then
        missing_files="$missing_files backend/local.settings.sample.json"
        log "${RED}❌ Missing backend/local.settings.sample.json (required for Docker build)${NC}"
    else
        log "${YELLOW}⚠️  backend/local.settings.json missing (will use sample in Docker)${NC}"
    fi
fi

# Check for other potential gitignored files that Docker might need
if [ ! -f "backend/.env" ] && [ ! -f "backend/.env.sample" ]; then
    # This is ok, just noting for completeness
    log "${BLUE}ℹ️  No backend/.env files found (expected for this project)${NC}"
fi

if [ -n "$missing_files" ]; then
    log "${RED}❌ Missing files that would cause Docker build failures:${NC}"
    for file in $missing_files; do
        log "${RED}   - $file${NC}"
    done
    log "${YELLOW}💡 These files are needed for Docker builds in CI/CD${NC}"
    exit 1
fi

log "${GREEN}✅ Shared package built successfully${NC}"

# Step 4: Validate code quality (exactly like CI)
log "${YELLOW}🔍 Running validation checks...${NC}"

# Type checking
log "   🔤 Type checking..."
npm run type-check

# Linting
log "   🧹 Linting..."
npm run lint

# Security scan
log "   🔒 Security scanning..."
npm audit --audit-level high

# Step 5: Run tests (exactly like CI matrix)
log "${YELLOW}🧪 Running test suites...${NC}"

# Unit tests
log "   🔬 Unit tests..."
cd backend
npm test -- --coverage --passWithNoTests --ci --watchAll=false
cd ..

# Integration tests
log "   🔗 Integration tests..."
cd backend
npm run test:integration || {
    log "${RED}❌ Integration tests failed${NC}"
    log "${RED}   Check Jest config references and module mappings${NC}"
    exit 1
}
cd ..

# Step 6: E2E tests with Docker (exactly like CI)
log "${YELLOW}🌐 Running E2E tests with Docker...${NC}"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    log "${RED}❌ Docker is not running. Please start Docker Desktop${NC}"
    log "${YELLOW}💡 Docker is required for E2E testing to catch monorepo build issues${NC}"
    log "${YELLOW}   Start Docker Desktop and re-run this script to validate E2E setup${NC}"
    log "${YELLOW}   This script would have caught the CI/CD Docker build failure!${NC}"
    exit 1
fi

# Clean up any existing containers and images
log "   🧹 Cleaning up existing containers and test images..."
$DOCKER_COMPOSE_CMD -f docker-compose.e2e.yml down -v 2>/dev/null || true

# Remove any existing test images to ensure fresh build
docker image rm carpool-backend-test 2>/dev/null || true
docker image prune -f 2>/dev/null || true

# Test Docker build first (this catches monorepo issues)
log "   🔨 Testing Docker build (monorepo validation)..."

# Temporarily rename gitignored files to simulate CI/CD environment
TEMP_RENAMED_FILES=()
if [ -f "backend/local.settings.json" ]; then
    mv "backend/local.settings.json" "backend/local.settings.json.backup"
    TEMP_RENAMED_FILES+=("backend/local.settings.json")
    log "   📝 Temporarily hiding local.settings.json to simulate CI/CD environment"
fi

$DOCKER_COMPOSE_CMD -f docker-compose.e2e.yml build --no-cache || {
    log "${RED}❌ Docker build failed${NC}"
    log "${RED}   This exactly matches the CI/CD failure pattern!${NC}"
    log "${YELLOW}💡 Troubleshooting tips:${NC}"
    log "   1. Check if @carpool/shared package is properly built:"
    ls -la shared/dist/ 2>/dev/null || log "${RED}     ❌ shared/dist not found - run 'npm run build --workspace=shared'${NC}"
    log "   2. Verify Docker build context includes shared package:"
    log "      Docker context should be monorepo root (current directory)"
    log "   3. Ensure Dockerfile handles workspace dependencies correctly:"
    log "      Should use multi-stage build with shared package compilation"
    log "   4. Check Docker Compose configuration:"
    grep -A 5 "context:" docker-compose.e2e.yml || log "${RED}     ❌ Docker context not set to monorepo root${NC}"
    log "   5. Check for missing config files (may be gitignored):"
    log "      - backend/local.settings.json (should have sample version)"
    
    # Restore renamed files before exiting
    for file in "${TEMP_RENAMED_FILES[@]}"; do
        if [ -f "${file}.backup" ]; then
            mv "${file}.backup" "$file"
            log "   📝 Restored $file"
        fi
    done
    exit 1
}

# Restore any renamed files after successful build
for file in "${TEMP_RENAMED_FILES[@]}"; do
    if [ -f "${file}.backup" ]; then
        mv "${file}.backup" "$file"
        log "   📝 Restored $file after successful Docker build test"
    fi
done

# Start services
log "   🐳 Starting Docker services..."
$DOCKER_COMPOSE_CMD -f docker-compose.e2e.yml up -d

# Wait for services to be ready with proper health checks
log "   ⏳ Waiting for services to be ready..."
timeout 300 bash -c 'until '$DOCKER_COMPOSE_CMD' -f docker-compose.e2e.yml exec -T mongo mongosh --eval "db.adminCommand(\"ismaster\")" >/dev/null 2>&1; do echo "Waiting for MongoDB..."; sleep 5; done' || {
    log "${RED}❌ MongoDB failed to start${NC}"
    $DOCKER_COMPOSE_CMD -f docker-compose.e2e.yml logs mongo
    $DOCKER_COMPOSE_CMD -f docker-compose.e2e.yml down
    exit 1
}

# Additional health checks for backend service
timeout 300 bash -c 'until curl -f http://localhost:7072/api/health >/dev/null 2>&1; do echo "Waiting for backend..."; sleep 5; done' || {
    log "${YELLOW}⚠️  Backend health check failed, continuing with E2E tests anyway${NC}"
}

# Run E2E tests
log "   🎭 Running Playwright E2E tests..."
cd e2e
npm ci
npx playwright install --with-deps chromium
npx playwright test || {
    log "${RED}❌ E2E tests failed${NC}"
    cd ..
    $DOCKER_COMPOSE_CMD -f docker-compose.e2e.yml down
    exit 1
}
cd ..

# Cleanup Docker services
log "   🧹 Cleaning up Docker services..."
$DOCKER_COMPOSE_CMD -f docker-compose.e2e.yml down -v

# Step 7: Build applications (exactly like CI)
log "${YELLOW}🔨 Building applications...${NC}"

# Backend build
log "   ⚙️  Building backend..."
cd backend
npm run build
cd ..

# Frontend build
log "   🌐 Building frontend..."
cd frontend
npm run build
cd ..

# Step 8: Validate build artifacts
log "${YELLOW}📋 Validating build artifacts...${NC}"

# Check backend build
if [ ! -d "backend/dist" ]; then
    log "${RED}❌ Backend build artifacts missing${NC}"
    exit 1
fi

# Check frontend build
if [ ! -d "frontend/.next" ]; then
    log "${RED}❌ Frontend build artifacts missing${NC}"
    exit 1
fi

log "${GREEN}✅ Build artifacts validated${NC}"

# Step 9: Configuration validation
log "${YELLOW}⚙️  Validating configurations...${NC}"

# Check Jest configs exist
if [ ! -f "backend/jest.config.js" ]; then
    log "${RED}❌ Backend jest.config.js missing${NC}"
    exit 1
fi

if [ ! -f "backend/jest.config.integration.json" ]; then
    log "${RED}❌ Backend jest.config.integration.json missing${NC}"
    exit 1
fi

# Check package.json scripts
if ! grep -q "jest.config.integration.json" backend/package.json; then
    log "${RED}❌ Backend package.json has incorrect integration test config reference${NC}"
    exit 1
fi

# Validate shared package module resolution
log "   📦 Validating @carpool/shared module resolution..."
if [ ! -f "shared/dist/index.js" ]; then
    log "${RED}❌ @carpool/shared not built - required for module resolution${NC}"
    exit 1
fi

# Check Jest module mapping for @carpool/shared
if ! grep -q "@carpool/shared" backend/jest.config.js; then
    log "${RED}❌ Jest config missing @carpool/shared module mapping${NC}"
    exit 1
fi

if ! grep -q "@carpool/shared" backend/jest.config.integration.json; then
    log "${RED}❌ Jest integration config missing @carpool/shared module mapping${NC}"
    exit 1
fi

# Validate imports in test files
log "   🔍 Validating @carpool/shared imports in test files..."
FAILED_IMPORTS=$(grep -r "@carpool/shared" backend/src/__tests__/ || true)
if [ -n "$FAILED_IMPORTS" ]; then
    log "${GREEN}✅ Found @carpool/shared imports in test files (expected)${NC}"
else
    log "${YELLOW}⚠️  No @carpool/shared imports found in test files${NC}"
fi

log "${GREEN}✅ Configuration validation passed${NC}"

# Final summary
log ""
log "${GREEN}🎉 Local CI Validation PASSED${NC}"
log "${GREEN}=============================================${NC}"
log "${GREEN}✅ Environment setup${NC}"
log "${GREEN}✅ Dependencies installed${NC}"
log "${GREEN}✅ Shared package built${NC}"
log "${GREEN}✅ Code quality checks${NC}"
log "${GREEN}✅ Unit tests${NC}"
log "${GREEN}✅ Integration tests${NC}"
log "${GREEN}✅ E2E tests with Docker${NC}"
log "${GREEN}✅ Build artifacts${NC}"
log "${GREEN}✅ Configuration validation${NC}"
log ""
log "${GREEN}🚀 Ready for CI/CD pipeline!${NC}"
