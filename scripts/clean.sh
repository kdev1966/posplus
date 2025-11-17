#!/bin/bash

# POSPlus - Clean Script
# Cleans all build artifacts and temporary files

echo "=================================================="
echo "  POSPlus - Cleaning Build Artifacts"
echo "=================================================="

# Navigate to project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[CLEAN]${NC} $1"; }
print_success() { echo -e "${GREEN}[DONE]${NC} $1"; }

# Clean dist directory
if [ -d "dist" ]; then
    print_status "Removing dist directory..."
    rm -rf dist
    print_success "dist directory removed"
fi

# Clean release directory
if [ -d "release" ]; then
    print_status "Removing release directory..."
    rm -rf release
    print_success "release directory removed"
fi

# Clean node_modules (optional, pass --all flag)
if [ "$1" = "--all" ] || [ "$1" = "-a" ]; then
    if [ -d "node_modules" ]; then
        print_status "Removing node_modules..."
        rm -rf node_modules
        print_success "node_modules removed"
    fi

    if [ -f "package-lock.json" ]; then
        print_status "Removing package-lock.json..."
        rm -f package-lock.json
        print_success "package-lock.json removed"
    fi
fi

# Clean temporary files
print_status "Removing temporary files..."
rm -f *.log
rm -f .DS_Store
rm -rf .cache
rm -rf .parcel-cache
rm -rf .vite
print_success "Temporary files removed"

# Clean test artifacts
if [ -d "coverage" ]; then
    print_status "Removing test coverage reports..."
    rm -rf coverage
    print_success "Coverage reports removed"
fi

# Clean database files (only in dev mode)
if [ "$1" = "--db" ]; then
    print_status "Removing development database..."
    rm -f posplus.db
    rm -f posplus.db-journal
    rm -f posplus.db-shm
    rm -f posplus.db-wal
    print_success "Database files removed"
fi

echo ""
echo "=================================================="
echo "  Clean Complete!"
echo "=================================================="
echo ""
echo "Usage:"
echo "  ./scripts/clean.sh         - Clean build artifacts"
echo "  ./scripts/clean.sh --all   - Also remove node_modules"
echo "  ./scripts/clean.sh --db    - Also remove database files"
echo ""
