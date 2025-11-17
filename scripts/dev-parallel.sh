#!/bin/bash

# POSPlus - Parallel Development Script
# Run development server for multiple platforms without conflicts

set -e

echo "=================================================="
echo "  POSPlus - Parallel Development Environment"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Navigate to project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Configuration
VITE_PORT=${VITE_PORT:-5173}
ELECTRON_DEV=${ELECTRON_DEV:-true}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down development servers...${NC}"

    # Kill all child processes
    if [ ! -z "$VITE_PID" ]; then
        kill $VITE_PID 2>/dev/null || true
    fi
    if [ ! -z "$ELECTRON_PID" ]; then
        kill $ELECTRON_PID 2>/dev/null || true
    fi

    # Kill any remaining processes
    pkill -f "vite" 2>/dev/null || true
    pkill -f "electron" 2>/dev/null || true

    echo -e "${GREEN}Development servers stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if port is available
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}Port $port is in use. Killing existing process...${NC}"
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Main
echo -e "${BLUE}Starting parallel development environment...${NC}"
echo ""

# Check ports
check_port $VITE_PORT

# Build Electron main process first
echo -e "${BLUE}Building Electron main process...${NC}"
npm run build:electron

# Start Vite dev server
echo -e "${BLUE}Starting Vite development server on port $VITE_PORT...${NC}"
npm run dev:vite &
VITE_PID=$!

# Wait for Vite to be ready
echo -e "${YELLOW}Waiting for Vite server to start...${NC}"
npx wait-on http://localhost:$VITE_PORT --timeout 60000

echo -e "${GREEN}Vite server is ready!${NC}"

# Start Electron if enabled
if [ "$ELECTRON_DEV" = "true" ]; then
    echo -e "${BLUE}Starting Electron...${NC}"
    NODE_ENV=development npx electron ./dist/main/main-process/main.js &
    ELECTRON_PID=$!
    echo -e "${GREEN}Electron started!${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}  Development environment is running!${NC}"
echo "=================================================="
echo ""
echo "Services:"
echo "  - Vite Dev Server: http://localhost:$VITE_PORT"
if [ "$ELECTRON_DEV" = "true" ]; then
    echo "  - Electron: Running with DevTools enabled"
fi
echo ""
echo "Options:"
echo "  - Hot reload is enabled for React components"
echo "  - Modify main process files requires restart"
echo "  - Press Ctrl+C to stop all servers"
echo ""
echo "Tips for parallel Mac + Windows VM development:"
echo "  1. Share project folder via network or shared folder"
echo "  2. Run this script on Mac for Mac development"
echo "  3. Run setup-windows.ps1 + npm run dev on Windows VM"
echo "  4. Use different ports if running both simultaneously"
echo ""

# Keep script running
wait $VITE_PID $ELECTRON_PID
