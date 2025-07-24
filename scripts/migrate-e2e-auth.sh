#!/bin/bash

# E2E Authentication Endpoint Migration Script
# Migrates all E2E tests from legacy auth endpoints to unified /api/auth endpoint

echo "🔄 Starting E2E Authentication Endpoint Migration..."
echo "📍 Working directory: $(pwd)"

# Define color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "e2e/specs" ]; then
    print_error "e2e/specs directory not found. Please run this script from the project root."
    exit 1
fi

# Create backup directory
backup_dir="e2e/specs_backup_$(date +%Y%m%d_%H%M%S)"
print_info "Creating backup at $backup_dir"
cp -r e2e/specs "$backup_dir"

# Count files to be migrated
total_files=$(find e2e/specs -name "*.spec.ts" | wc -l)
print_info "Found $total_files test files to migrate"

# Migration mappings
declare -A endpoint_mappings=(
    ["/api/auth-login-simple"]="/api/auth?action=login"
    ["/api/auth-register-working"]="/api/auth?action=register"
    ["/api/auth-refresh-token"]="/api/auth?action=refresh"
    ["/api/auth-forgot-password"]="/api/auth?action=forgot-password"
    ["/api/auth-reset-password"]="/api/auth?action=reset-password"
    ["/api/auth-unified-secure"]="/api/auth?action=login"
    ["/api/auth-entra-unified"]="/api/auth?action=login"
)

# Function to migrate a single file
migrate_file() {
    local file="$1"
    local changes_made=0
    
    print_info "Migrating: $file"
    
    # Create temporary file for modifications
    local temp_file=$(mktemp)
    cp "$file" "$temp_file"
    
    # Apply each mapping
    for old_endpoint in "${!endpoint_mappings[@]}"; do
        new_endpoint="${endpoint_mappings[$old_endpoint]}"
        
        # Check if file contains the old endpoint
        if grep -q "$old_endpoint" "$temp_file"; then
            print_status "  Replacing $old_endpoint -> $new_endpoint"
            
            # Use sed to replace the endpoint
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|$old_endpoint|$new_endpoint|g" "$temp_file"
            else
                # Linux
                sed -i "s|$old_endpoint|$new_endpoint|g" "$temp_file"
            fi
            
            changes_made=$((changes_made + 1))
        fi
    done
    
    # If changes were made, replace the original file
    if [ $changes_made -gt 0 ]; then
        mv "$temp_file" "$file"
        print_status "  ✅ $changes_made endpoint(s) updated in $file"
    else
        rm "$temp_file"
        print_info "  No authentication endpoints found in $file"
    fi
    
    return $changes_made
}

# Main migration loop
total_changes=0
migrated_files=0

print_info "Starting migration of test files..."

for file in e2e/specs/*.spec.ts; do
    if [ -f "$file" ]; then
        migrate_file "$file"
        changes=$?
        
        if [ $changes -gt 0 ]; then
            total_changes=$((total_changes + changes))
            migrated_files=$((migrated_files + 1))
        fi
    fi
done

# Migration summary
echo ""
echo "📊 Migration Summary:"
echo "   Total files scanned: $total_files"
echo "   Files modified: $migrated_files"
echo "   Total endpoint changes: $total_changes"
echo "   Backup created at: $backup_dir"

if [ $total_changes -gt 0 ]; then
    print_status "Migration completed successfully!"
    echo ""
    echo "🔍 Next steps:"
    echo "   1. Review the changes: git diff e2e/specs/"
    echo "   2. Run E2E tests to verify: npm run test:e2e"
    echo "   3. If issues occur, restore from backup: cp -r $backup_dir/* e2e/specs/"
    echo ""
    print_warning "Remember to update any custom authentication test helpers!"
else
    print_warning "No authentication endpoints found in E2E tests."
    print_info "This might indicate that:"
    echo "   • Tests are already using the unified endpoint"
    echo "   • Authentication is handled differently"
    echo "   • Tests are in a different location"
fi

# Optional: Show a preview of changes
echo ""
read -p "Would you like to see a preview of the changes? (y/n): " show_preview

if [[ $show_preview =~ ^[Yy]$ ]]; then
    echo ""
    echo "📋 Preview of changes:"
    for file in e2e/specs/*.spec.ts; do
        if [ -f "$file" ]; then
            echo "   File: $file"
            for old_endpoint in "${!endpoint_mappings[@]}"; do
                new_endpoint="${endpoint_mappings[$old_endpoint]}"
                if grep -q "$new_endpoint" "$file"; then
                    echo "     ✅ $old_endpoint -> $new_endpoint"
                fi
            done
        fi
    done
fi

echo ""
print_status "E2E Authentication Migration Script completed!"

# Verification step
echo ""
print_info "Running verification..."

# Check for any remaining legacy endpoints
legacy_count=0
for old_endpoint in "${!endpoint_mappings[@]}"; do
    if grep -r "$old_endpoint" e2e/specs/ > /dev/null 2>&1; then
        legacy_count=$((legacy_count + 1))
        print_warning "Legacy endpoint still found: $old_endpoint"
    fi
done

if [ $legacy_count -eq 0 ]; then
    print_status "Verification passed: No legacy endpoints found!"
else
    print_warning "Verification found $legacy_count legacy endpoint(s) remaining"
    echo "   You may need to review these manually"
fi
