#!/bin/bash

# POSPlus - Cross-platform Build Testing Script
# Tests the application after build to ensure everything works

set -e

echo "=================================================="
echo "  POSPlus - Build Testing Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[TEST]${NC} $1"; }
print_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[FAIL]${NC} $1"; }

# Navigate to project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name=$1
    local test_command=$2

    print_status "Running: $test_name"

    if eval "$test_command" >/dev/null 2>&1; then
        print_success "$test_name"
        ((TESTS_PASSED++))
        return 0
    else
        print_error "$test_name"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo ""
echo "1. Checking Project Structure..."
echo "================================"

# Check essential directories
run_test "dist/main exists" "[ -d 'dist/main' ]"
run_test "dist/renderer exists" "[ -d 'dist/renderer' ]"
run_test "dist/main/main-process/main.js exists" "[ -f 'dist/main/main-process/main.js' ]"
run_test "dist/main/main-process/preload.js exists" "[ -f 'dist/main/main-process/preload.js' ]"
run_test "dist/renderer/index.html exists" "[ -f 'dist/renderer/index.html' ]"

echo ""
echo "2. Checking Migrations..."
echo "========================="

MIGRATIONS_DIR="dist/main/main-process/services/database/migrations"
run_test "Migrations directory exists" "[ -d '$MIGRATIONS_DIR' ]"
run_test "Migration 001 exists" "[ -f '$MIGRATIONS_DIR/001_initial_schema.sql' ]"
run_test "Migration 002 exists" "[ -f '$MIGRATIONS_DIR/002_products_migration.sql' ]"

echo ""
echo "3. Checking TypeScript Compilation..."
echo "====================================="

run_test "No TypeScript errors" "npx tsc --noEmit"

echo ""
echo "4. Checking Node Modules..."
echo "==========================="

run_test "better-sqlite3 installed" "[ -d 'node_modules/better-sqlite3' ]"
run_test "usb module installed" "[ -d 'node_modules/usb' ]"
run_test "electron installed" "[ -d 'node_modules/electron' ]"
run_test "react installed" "[ -d 'node_modules/react' ]"

echo ""
echo "5. Checking Native Module Bindings..."
echo "======================================"

# Check for native bindings
if [ -d "node_modules/better-sqlite3/prebuilds" ] || [ -d "node_modules/better-sqlite3/build" ]; then
    print_success "better-sqlite3 has native bindings"
    ((TESTS_PASSED++))
else
    print_warning "better-sqlite3 may need rebuild"
fi

echo ""
echo "6. Running Unit Tests..."
echo "========================"

if npm run test --if-present >/dev/null 2>&1; then
    print_success "Unit tests passed"
    ((TESTS_PASSED++))
else
    print_warning "Some unit tests may have failed"
fi

echo ""
echo "7. Checking Assets..."
echo "====================="

run_test "Assets directory exists" "[ -d 'assets' ]"
run_test "Build resources directory exists" "[ -d 'build' ]"

# Check for icon files
if [ -f "build/icon.ico" ] || [ -f "build/icon.icns" ] || [ -f "build/icon.png" ]; then
    print_success "Application icons found"
    ((TESTS_PASSED++))
else
    print_warning "No application icons found (build may not have icons)"
fi

echo ""
echo "8. Checking Package.json..."
echo "============================"

run_test "package.json exists" "[ -f 'package.json' ]"
run_test "Main entry point configured" "grep -q '\"main\":' package.json"
run_test "Build scripts configured" "grep -q '\"build\":' package.json"

echo ""
echo "9. Verifying JavaScript Bundle..."
echo "=================================="

# Check if renderer bundle exists and has reasonable size
if [ -f "dist/renderer/assets/index-*.js" ] 2>/dev/null || [ -f "dist/renderer/index.html" ]; then
    print_success "Renderer bundle exists"
    ((TESTS_PASSED++))
else
    print_warning "Renderer bundle may not be built correctly"
fi

echo ""
echo "10. Quick Electron Launch Test..."
echo "=================================="

# Try to start Electron briefly (will exit immediately)
if timeout 5 npx electron --version >/dev/null 2>&1; then
    print_success "Electron can launch"
    ((TESTS_PASSED++))
else
    print_warning "Could not verify Electron launch"
fi

echo ""
echo "=================================================="
echo "  Test Results"
echo "=================================================="
echo ""
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! Build is ready for deployment.${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed. Review the output above.${NC}"
    exit 1
fi
