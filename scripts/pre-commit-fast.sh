#!/bin/bash

set -e

echo "# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
TS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx)$' | grep -v -E '(__tests__|\.test\.|\.spec\.)' || true)
JS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(js|jsx)$' || true)
ALL_TS_JS_FILES="$TS_FILES $JS_FILES"

if [ -z "$TS_FILES" ] && [ -z "$JS_FILES" ]; then
    print_status "INFO" "No TypeScript/JavaScript files staged - skipping checks"
    exit 0
fi

print_status "INFO" "Checking $(echo "$ALL_TS_JS_FILES" | wc -w) staged files..."Fast Pre-commit"
echo "=========================="

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

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
TS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx)$' | grep -v -E '(__tests__|\.test\.|\.spec\.)' || true)
JS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(js|jsx)$' || true)
ALL_TS_JS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [ -z "$TS_FILES" ] && [ -z "$JS_FILES" ] && [ -z "$ALL_TS_JS_FILES" ]; then
    print_status "INFO" "No TypeScript/JavaScript files staged - skipping checks"
    exit 0
fi

print_status "INFO" "Checking $(echo "$ALL_TS_JS_FILES" | wc -w) staged files..."

# 1. Lightning-fast type checking (workspace-aware)
if [ -n "$TS_FILES" ]; then
    print_status "INFO" "Type checking staged files..."
    
    # Check backend files - use workspace-aware command
    BACKEND_FILES=$(echo "$TS_FILES" | grep '^backend/' || true)
    if [ -n "$BACKEND_FILES" ]; then
        npm run type-check:backend --silent 2>/dev/null || {
            print_status "ERROR" "Backend type checking failed"
            exit 1
        }
    fi
    
    # Check frontend files - use workspace-aware command
    FRONTEND_FILES=$(echo "$TS_FILES" | grep '^frontend/' || true)
    if [ -n "$FRONTEND_FILES" ]; then
        npm run type-check:frontend --silent 2>/dev/null || {
            print_status "ERROR" "Frontend type checking failed"
            exit 1
        }
    fi
fi

# 2. Quick lint (workspace-aware)
if [ -n "$ALL_TS_JS_FILES" ]; then
    print_status "INFO" "Linting staged files..."
    
    # Backend linting - use workspace-aware command
    BACKEND_LINT_FILES=$(echo "$ALL_TS_JS_FILES" | tr ' ' '\n' | grep '^backend/' || true)
    if [ -n "$BACKEND_LINT_FILES" ]; then
        npm run lint:backend --silent 2>/dev/null || {
            print_status "ERROR" "Backend linting failed"
            exit 1
        }
    fi
    
    # Frontend linting - use workspace-aware command
    FRONTEND_LINT_FILES=$(echo "$ALL_TS_JS_FILES" | tr ' ' '\n' | grep '^frontend/' || true)
    if [ -n "$FRONTEND_LINT_FILES" ]; then
        npm run lint:frontend --silent 2>/dev/null || {
            print_status "ERROR" "Frontend linting failed"
            exit 1
        }
    fi
fi

# 3. Quick security check (only staged files)
if echo "$STAGED_FILES" | grep -qE '\.(env|json|yaml|yml)$'; then
    print_status "INFO" "Quick security scan on configuration files..."
    echo "$STAGED_FILES" | grep -E '\.(env|json|yaml|yml)$' | xargs -r grep -l "password\|secret\|key\|token" || true >/dev/null
fi

# Record timestamp for pre-push optimization
echo "$(date +%s)" > .git/hooks/pre-commit-timestamp

end_time=$(date +%s)
duration=$((end_time - start_time))

print_status "SUCCESS" "⚡ Pre-commit completed in ${duration}s"
print_status "INFO" "Full validation will run on pre-push"

# Record timestamp for pre-push optimization
echo "$(date +%s)" > "$(git rev-parse --git-dir)/hooks/pre-commit-timestamp"
