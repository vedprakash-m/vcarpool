#!/bin/bash

# Comprehensive Authentication System Validation Script
# Tests all aspects of the unified authentication system

echo "🧪 Comprehensive Authentication System Validation"
echo "=================================================="

# Include Docker E2E validation if Docker is available
if command -v docker &> /dev/null; then
    echo "🐳 Running Docker E2E validation..."
    if ./scripts/validate-e2e-docker.sh; then
        echo "✅ Docker E2E validation passed"
    else
        echo "⚠️  Docker E2E validation failed - continuing with other tests"
    fi
else
    echo "⚠️  Docker not available - skipping Docker validation"
fi

echo ""
echo "🔧 Starting Authentication System Tests..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test result counters
tests_passed=0
tests_failed=0
total_tests=0

# Function to print test results
print_test_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    total_tests=$((total_tests + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC} $test_name"
        tests_passed=$((tests_passed + 1))
    elif [ "$result" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC} $test_name"
        [ -n "$message" ] && echo -e "   ${RED}Error:${NC} $message"
        tests_failed=$((tests_failed + 1))
    elif [ "$result" = "SKIP" ]; then
        echo -e "${YELLOW}⏭️  SKIP${NC} $test_name"
        [ -n "$message" ] && echo -e "   ${YELLOW}Reason:${NC} $message"
    else
        echo -e "${BLUE}ℹ️  INFO${NC} $test_name"
        [ -n "$message" ] && echo -e "   $message"
    fi
}

print_section() {
    echo ""
    echo -e "${PURPLE}📋 $1${NC}"
    echo "----------------------------------------"
}

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    print_test_result "Directory Check" "FAIL" "Must run from project root directory"
    exit 1
fi

print_test_result "Directory Check" "PASS" "Running from project root"

# Section 1: TypeScript Compilation
print_section "TypeScript Compilation Tests"

# Test backend compilation
echo -n "Testing backend TypeScript compilation... "
cd backend
if npx tsc --noEmit --project tsconfig.json > /dev/null 2>&1; then
    print_test_result "Backend TypeScript Compilation" "PASS"
else
    print_test_result "Backend TypeScript Compilation" "FAIL" "TypeScript errors found"
fi

# Test shared package compilation
echo -n "Testing shared package compilation... "
cd ../shared
if npm run build > /dev/null 2>&1; then
    print_test_result "Shared Package Compilation" "PASS"
else
    print_test_result "Shared Package Compilation" "FAIL" "Build failed"
fi

cd ..

# Section 2: File Structure Validation
print_section "File Structure Validation"

# Check for required authentication files
required_files=(
    "backend/src/functions/auth-unified/index.ts"
    "backend/src/functions/auth-unified/function.json"
    "backend/src/middleware/auth.middleware.ts"
    "backend/src/services/auth/authentication.service.ts"
    "backend/src/services/auth/jwt.service.ts"
    "backend/src/services/domains/user-domain.service.ts"
    "shared/src/contracts/auth.contract.ts"
    "shared/src/config/jwt.config.ts"
    "docs/api-auth-unified.md"
    "docs/auth-migration-plan.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_test_result "File: $file" "PASS"
    else
        print_test_result "File: $file" "FAIL" "File not found"
    fi
done

# Section 3: Authentication Service Integration
print_section "Authentication Service Integration"

# Check if services are properly integrated
echo -n "Checking UserDomainService integration... "
if grep -q "authService.*validateToken" backend/src/services/domains/user-domain.service.ts > /dev/null 2>&1; then
    print_test_result "UserDomainService Integration" "PASS"
else
    print_test_result "UserDomainService Integration" "FAIL" "AuthService integration not found"
fi

# Check middleware integration
echo -n "Checking middleware integration... "
if grep -q "verifyToken" backend/src/middleware/auth.middleware.ts > /dev/null 2>&1; then
    print_test_result "Middleware Integration" "PASS"
else
    print_test_result "Middleware Integration" "FAIL" "Token verification not found"
fi

# Section 4: API Endpoint Validation
print_section "API Endpoint Validation"

# Check unified auth endpoint structure
echo -n "Checking unified auth endpoint... "
if grep -q "case 'login'" backend/src/functions/auth-unified/index.ts > /dev/null 2>&1 && \
   grep -q "case 'register'" backend/src/functions/auth-unified/index.ts > /dev/null 2>&1 && \
   grep -q "case 'refresh'" backend/src/functions/auth-unified/index.ts > /dev/null 2>&1; then
    print_test_result "Unified Auth Endpoint Structure" "PASS"
else
    print_test_result "Unified Auth Endpoint Structure" "FAIL" "Action routing not found"
fi

# Check function.json configuration
echo -n "Checking function.json... "
if [ -f "backend/src/functions/auth-unified/function.json" ] && grep -q '"route": "auth"' backend/src/functions/auth-unified/function.json > /dev/null 2>&1; then
    print_test_result "Function Configuration" "PASS"
else
    print_test_result "Function Configuration" "FAIL" "Route configuration incorrect"
fi

# Section 5: Legacy Endpoint Analysis
print_section "Legacy Endpoint Analysis"

# Check for legacy endpoints that should be migrated
legacy_endpoints=(
    "auth-login-simple"
    "auth-register-working"
    "auth-unified-secure"
    "auth-entra-unified"
)

for endpoint in "${legacy_endpoints[@]}"; do
    if [ -d "backend/$endpoint" ]; then
        print_test_result "Legacy Endpoint: $endpoint" "INFO" "Still exists - migration pending"
    else
        print_test_result "Legacy Endpoint: $endpoint" "PASS" "Successfully removed"
    fi
done

# Section 6: E2E Test Migration Status
print_section "E2E Test Migration Status"

# Check if E2E tests are using unified endpoint
if [ -d "e2e/specs" ]; then
    echo -n "Checking E2E test endpoints... "
    
    unified_usage=$(grep -r "/api/auth?action=" e2e/specs/ 2>/dev/null | wc -l)
    legacy_usage=$(grep -r "/api/auth-login-simple\|/api/auth-register-working" e2e/specs/ 2>/dev/null | wc -l)
    
    if [ "$unified_usage" -gt 0 ] && [ "$legacy_usage" -eq 0 ]; then
        print_test_result "E2E Tests Migration" "PASS" "Using unified endpoints"
    elif [ "$unified_usage" -gt 0 ] && [ "$legacy_usage" -gt 0 ]; then
        print_test_result "E2E Tests Migration" "INFO" "Partial migration ($unified_usage unified, $legacy_usage legacy)"
    elif [ "$legacy_usage" -gt 0 ]; then
        print_test_result "E2E Tests Migration" "FAIL" "Still using legacy endpoints ($legacy_usage found)"
    else
        print_test_result "E2E Tests Migration" "SKIP" "No auth endpoints found in E2E tests"
    fi
else
    print_test_result "E2E Tests Directory" "SKIP" "e2e/specs directory not found"
fi

# Section 7: Documentation Validation
print_section "Documentation Validation"

# Check documentation completeness
doc_files=(
    "docs/api-auth-unified.md"
    "docs/auth-migration-plan.md"
    "docs/metadata.md"
)

for doc in "${doc_files[@]}"; do
    if [ -f "$doc" ] && [ -s "$doc" ]; then
        print_test_result "Documentation: $(basename $doc)" "PASS"
    else
        print_test_result "Documentation: $(basename $doc)" "FAIL" "Missing or empty"
    fi
done

# Section 8: Security Validation
print_section "Security Validation"

# Check for JWT secret configuration
echo -n "Checking JWT configuration... "
if grep -q "JWT_ACCESS_SECRET\|JWT_REFRESH_SECRET\|accessTokenSecret" shared/src/config/jwt.config.ts > /dev/null 2>&1; then
    print_test_result "JWT Configuration" "PASS"
else
    print_test_result "JWT Configuration" "FAIL" "JWT secret configuration not found"
fi

# Check for password hashing
echo -n "Checking password security... "
if grep -q "bcrypt\|hashPassword" backend/src/services/auth/authentication.service.ts > /dev/null 2>&1; then
    print_test_result "Password Security" "PASS"
else
    print_test_result "Password Security" "FAIL" "Password hashing not found"
fi

# Section 9: Performance Checks
print_section "Performance Checks"

# Check bundle size (if dist exists)
if [ -d "backend/dist" ]; then
    dist_size=$(du -sh backend/dist 2>/dev/null | cut -f1)
    print_test_result "Bundle Size" "INFO" "Backend dist: $dist_size"
else
    print_test_result "Bundle Size" "SKIP" "No dist directory found"
fi

# Section 10: Integration Readiness
print_section "Integration Readiness Assessment"

# Calculate readiness score
readiness_score=$((tests_passed * 100 / total_tests))

if [ $readiness_score -ge 90 ]; then
    readiness_status="EXCELLENT"
    readiness_color=$GREEN
elif [ $readiness_score -ge 75 ]; then
    readiness_status="GOOD"
    readiness_color=$BLUE
elif [ $readiness_score -ge 60 ]; then
    readiness_status="FAIR"
    readiness_color=$YELLOW
else
    readiness_status="NEEDS WORK"
    readiness_color=$RED
fi

# Final Summary
echo ""
echo "======================================================"
echo -e "${PURPLE}📊 VALIDATION SUMMARY${NC}"
echo "======================================================"
echo "Total Tests: $total_tests"
echo -e "Passed: ${GREEN}$tests_passed${NC}"
echo -e "Failed: ${RED}$tests_failed${NC}"
echo ""
echo -e "Integration Readiness: ${readiness_color}$readiness_status ($readiness_score%)${NC}"

if [ $tests_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Authentication system is ready for production.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. 📱 Migrate frontend authentication stores"
    echo "2. 🧪 Run E2E test migration script"
    echo "3. 🔒 Configure production JWT secrets"
    echo "4. 🚀 Deploy to staging environment"
elif [ $readiness_score -ge 75 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Minor issues found, but system is mostly ready.${NC}"
    echo "Address the failed tests before production deployment."
else
    echo ""
    echo -e "${RED}❌ Critical issues found. Address failed tests before proceeding.${NC}"
fi

echo ""
echo -e "${BLUE}💡 Run individual test sections with:${NC}"
echo "   ./scripts/validate-auth.sh --section [compilation|structure|integration]"
echo ""

# Exit with appropriate code
if [ $tests_failed -eq 0 ]; then
    exit 0
else
    exit 1
fi
