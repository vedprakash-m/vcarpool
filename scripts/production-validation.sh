#!/bin/bash

# Production Readiness Validation Script
# Comprehensive check before production deployment

set -e

echo "🔍 Production Readiness Validation"
echo "=================================="
echo "Date: $(date)"
echo "Environment: Production Preparation"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0

print_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "✅ ${GREEN}PASS${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    elif [ "$status" = "WARN" ]; then
        echo -e "⚠️  ${YELLOW}WARN${NC} $test_name"
        [ -n "$details" ] && echo -e "   ${YELLOW}Warning${NC}: $details"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "❌ ${RED}FAIL${NC} $test_name"
        [ -n "$details" ] && echo -e "   ${RED}Error${NC}: $details"
    fi
}

echo "📋 Pre-Deployment Checklist"
echo "----------------------------------------"

# 1. TypeScript Compilation
echo -n "Testing TypeScript compilation... "
if cd backend && npx tsc --noEmit > /dev/null 2>&1; then
    print_test_result "Backend TypeScript Compilation" "PASS"
else
    print_test_result "Backend TypeScript Compilation" "FAIL" "TypeScript errors found"
fi
cd ..

# 2. Shared Package Build
echo -n "Testing shared package build... "
if cd shared && npm run build > /dev/null 2>&1; then
    print_test_result "Shared Package Build" "PASS"
else
    print_test_result "Shared Package Build" "FAIL" "Build errors found"
fi
cd ..

# 3. Environment Configuration Check
echo -n "Checking environment configuration... "
if [ -f "backend/local.settings.sample.json" ]; then
    if grep -q "JWT_ACCESS_SECRET\|JWT_REFRESH_SECRET" backend/local.settings.sample.json; then
        print_test_result "Environment Configuration Template" "PASS"
    else
        print_test_result "Environment Configuration Template" "FAIL" "Missing JWT configuration"
    fi
else
    print_test_result "Environment Configuration Template" "FAIL" "local.settings.sample.json not found"
fi

# 4. Authentication Endpoint Structure
echo -n "Validating unified auth endpoint... "
if [ -f "backend/src/functions/auth-unified/index.ts" ] && [ -f "backend/src/functions/auth-unified/function.json" ]; then
    print_test_result "Unified Auth Endpoint" "PASS"
else
    print_test_result "Unified Auth Endpoint" "FAIL" "Auth endpoint files missing"
fi

# 5. Health Check Endpoint
echo -n "Validating health check endpoint... "
if [ -f "backend/src/functions/health-check/index.ts" ] && [ -f "backend/src/functions/health-check/function.json" ]; then
    print_test_result "Health Check Endpoint" "PASS"
else
    print_test_result "Health Check Endpoint" "FAIL" "Health check files missing"
fi

# 6. Authentication Services
echo -n "Checking authentication services... "
if [ -f "backend/src/services/auth/authentication.service.ts" ] && [ -f "backend/src/services/auth/jwt.service.ts" ]; then
    print_test_result "Authentication Services" "PASS"
else
    print_test_result "Authentication Services" "FAIL" "Authentication service files missing"
fi

# 7. Middleware
echo -n "Checking authentication middleware... "
if [ -f "backend/src/middleware/auth.middleware.ts" ]; then
    print_test_result "Authentication Middleware" "PASS"
else
    print_test_result "Authentication Middleware" "FAIL" "Middleware file missing"
fi

# 8. Domain Services
echo -n "Checking domain services... "
if [ -f "backend/src/services/domains/user-domain.service.ts" ]; then
    print_test_result "Domain Services" "PASS"
else
    print_test_result "Domain Services" "FAIL" "Domain service files missing"
fi

# 9. Frontend Integration
echo -n "Checking frontend auth store... "
if [ -f "frontend/src/store/auth.store.ts" ]; then
    if grep -q "/api/auth" frontend/src/store/auth.store.ts; then
        print_test_result "Frontend Integration" "PASS"
    else
        print_test_result "Frontend Integration" "WARN" "May still use legacy endpoints"
    fi
else
    print_test_result "Frontend Integration" "FAIL" "Auth store missing"
fi

# 10. API Client Updates
echo -n "Checking API client updates... "
if [ -f "frontend/src/lib/api-client.ts" ]; then
    if grep -q "/api/auth" frontend/src/lib/api-client.ts; then
        print_test_result "API Client Updates" "PASS"
    else
        print_test_result "API Client Updates" "WARN" "May not be fully migrated"
    fi
else
    print_test_result "API Client Updates" "FAIL" "API client missing"
fi

# 11. Documentation
echo -n "Checking deployment documentation... "
if [ -f "docs/production-deployment.md" ]; then
    print_test_result "Deployment Documentation" "PASS"
else
    print_test_result "Deployment Documentation" "FAIL" "Deployment guide missing"
fi

# 12. Monitoring Configuration
echo -n "Checking monitoring configuration... "
if [ -f "docs/monitoring-configuration.md" ]; then
    print_test_result "Monitoring Configuration" "PASS"
else
    print_test_result "Monitoring Configuration" "FAIL" "Monitoring guide missing"
fi

# 13. Security Validation
echo -n "Checking security configuration... "
if grep -q "bcrypt\|hash" backend/src/services/auth/authentication.service.ts > /dev/null 2>&1; then
    print_test_result "Password Security" "PASS"
else
    print_test_result "Password Security" "FAIL" "Password hashing not found"
fi

# 14. JWT Configuration
echo -n "Checking JWT configuration... "
if grep -q "JWT_ACCESS_SECRET\|accessTokenSecret" shared/src/config/jwt.config.ts > /dev/null 2>&1; then
    print_test_result "JWT Configuration" "PASS"
else
    print_test_result "JWT Configuration" "FAIL" "JWT configuration not found"
fi

# 15. Database Integration
echo -n "Checking database services... "
if [ -f "backend/src/services/database.service.ts" ] || find backend/src -name "*.repository.ts" | head -1 > /dev/null; then
    print_test_result "Database Integration" "PASS"
else
    print_test_result "Database Integration" "WARN" "Database service files not clearly identified"
fi

echo ""
echo "📋 Legacy Endpoint Analysis"
echo "----------------------------------------"

# Count legacy endpoint references
LEGACY_COUNT=$(grep -r "v1/auth\|auth/login\|auth/register" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=out --exclude-dir=coverage --exclude="*.log" . 2>/dev/null | wc -l || echo "0")

if [ "$LEGACY_COUNT" -eq 0 ]; then
    print_test_result "Legacy Endpoint Cleanup" "PASS"
elif [ "$LEGACY_COUNT" -lt 20 ]; then
    print_test_result "Legacy Endpoint Cleanup" "WARN" "$LEGACY_COUNT legacy references remaining (mostly docs/tests)"
else
    print_test_result "Legacy Endpoint Cleanup" "FAIL" "$LEGACY_COUNT legacy references found"
fi

echo ""
echo "📋 Production Deployment Prerequisites"
echo "----------------------------------------"

# Check for production secrets template
echo -n "Checking production secrets template... "
if grep -q "GENERATE-STRONG-SECRET" docs/production-deployment.md > /dev/null 2>&1; then
    print_test_result "Production Secrets Template" "PASS"
else
    print_test_result "Production Secrets Template" "WARN" "Production secrets template may need updating"
fi

# Check for monitoring setup
echo -n "Checking monitoring setup... "
if grep -q "Application Insights\|KQL" docs/monitoring-configuration.md > /dev/null 2>&1; then
    print_test_result "Monitoring Setup" "PASS"
else
    print_test_result "Monitoring Setup" "FAIL" "Monitoring configuration incomplete"
fi

# Check for deployment scripts
echo -n "Checking deployment automation... "
if [ -f "scripts/deploy.sh" ] || [ -f "deploy.sh" ] || grep -q "az functionapp" docs/production-deployment.md > /dev/null 2>&1; then
    print_test_result "Deployment Automation" "PASS"
else
    print_test_result "Deployment Automation" "WARN" "Deployment automation not fully configured"
fi

echo ""
echo "📋 Performance and Security Checks"
echo "----------------------------------------"

# Check for performance testing setup
echo -n "Checking performance testing configuration... "
if grep -q "k6\|load.*test" docs/production-deployment.md > /dev/null 2>&1; then
    print_test_result "Performance Testing" "PASS"
else
    print_test_result "Performance Testing" "WARN" "Performance testing configuration needed"
fi

# Check for security configuration
echo -n "Checking security configuration... "
if grep -q "HTTPS\|CORS\|rate.*limit" docs/production-deployment.md > /dev/null 2>&1; then
    print_test_result "Security Configuration" "PASS"
else
    print_test_result "Security Configuration" "WARN" "Security configuration needs review"
fi

# Check for rollback plan
echo -n "Checking rollback plan... "
if grep -q "rollback\|emergency" docs/production-deployment.md > /dev/null 2>&1; then
    print_test_result "Rollback Plan" "PASS"
else
    print_test_result "Rollback Plan" "FAIL" "Rollback plan missing"
fi

echo ""
echo "========================================================"
echo "📊 PRODUCTION READINESS SUMMARY"
echo "========================================================"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS))"
echo ""

# Calculate readiness percentage
READINESS_PERCENT=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Production Readiness: $READINESS_PERCENT%"

if [ $READINESS_PERCENT -ge 90 ]; then
    echo -e "🚀 ${GREEN}READY FOR PRODUCTION DEPLOYMENT${NC}"
    echo ""
    echo "✅ System is ready for production deployment!"
    echo "📋 Next steps:"
    echo "   1. Set production environment variables"
    echo "   2. Generate secure JWT secrets"
    echo "   3. Configure monitoring and alerts"
    echo "   4. Run final security audit"
    echo "   5. Deploy to production"
    EXIT_CODE=0
elif [ $READINESS_PERCENT -ge 80 ]; then
    echo -e "⚠️  ${YELLOW}MOSTLY READY - Minor Issues${NC}"
    echo ""
    echo "System is mostly ready but address the failed tests before deployment."
    EXIT_CODE=1
else
    echo -e "❌ ${RED}NOT READY FOR PRODUCTION${NC}"
    echo ""
    echo "Critical issues found. Address failed tests before proceeding."
    EXIT_CODE=2
fi

echo ""
echo "💡 Run individual sections with:"
echo "   ./scripts/production-validation.sh"
echo ""

exit $EXIT_CODE
