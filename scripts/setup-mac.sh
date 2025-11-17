#!/bin/bash

# POSPlus - macOS Development Environment Setup Script
# This script sets up the complete development environment for POSPlus on macOS

set -e

echo "=================================================="
echo "  POSPlus - macOS Development Environment Setup"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Check and install Homebrew
print_status "Checking for Homebrew..."
if ! command_exists brew; then
    print_warning "Homebrew not found. Installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    print_success "Homebrew installed successfully"
else
    print_success "Homebrew is already installed"
fi

# Update Homebrew
print_status "Updating Homebrew..."
brew update

# 2. Install Node.js via nvm (recommended) or directly
print_status "Checking for Node.js..."
if ! command_exists node; then
    print_warning "Node.js not found. Installing via Homebrew..."
    brew install node@20
    print_success "Node.js installed successfully"
else
    NODE_VERSION=$(node -v)
    print_success "Node.js is already installed: $NODE_VERSION"
fi

# Verify npm
if ! command_exists npm; then
    print_error "npm not found. Please reinstall Node.js"
    exit 1
fi

NPM_VERSION=$(npm -v)
print_success "npm version: $NPM_VERSION"

# 3. Install native dependencies for Electron
print_status "Installing native dependencies for Electron..."

# Install Python (required for node-gyp)
if ! command_exists python3; then
    print_warning "Installing Python3..."
    brew install python@3.11
fi

# Install pkg-config (required for some native modules)
if ! command_exists pkg-config; then
    print_warning "Installing pkg-config..."
    brew install pkg-config
fi

# Install cairo (required for canvas package)
print_status "Installing Cairo for canvas support..."
brew install cairo pango libpng jpeg giflib librsvg pixman

# Install libusb (required for usb package)
print_status "Installing libusb..."
brew install libusb

print_success "Native dependencies installed"

# 4. Install VSCode extensions (optional but recommended)
if command_exists code; then
    print_status "Installing recommended VSCode extensions..."

    extensions=(
        "ms-vscode.vscode-typescript-next"
        "dbaeumer.vscode-eslint"
        "esbenp.prettier-vscode"
        "bradlc.vscode-tailwindcss"
        "dsznajder.es7-react-js-snippets"
        "formulahendry.auto-rename-tag"
        "PKief.material-icon-theme"
        "eamodio.gitlens"
        "streetsidesoftware.code-spell-checker"
    )

    for ext in "${extensions[@]}"; do
        if code --list-extensions | grep -q "$ext"; then
            print_success "Extension $ext already installed"
        else
            code --install-extension "$ext" --force
            print_success "Installed extension: $ext"
        fi
    done
else
    print_warning "VSCode CLI not found. Install extensions manually or add 'code' to PATH"
fi

# 5. Navigate to project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
print_status "Working in: $PROJECT_DIR"

# 6. Clean previous installations
print_status "Cleaning previous installations..."
rm -rf node_modules
rm -f package-lock.json
print_success "Cleaned node_modules and package-lock.json"

# 7. Install project dependencies
print_status "Installing project dependencies..."
npm install
print_success "Dependencies installed successfully"

# 8. Rebuild native modules for Electron
print_status "Rebuilding native modules for Electron..."
npm run postinstall
print_success "Native modules rebuilt successfully"

# 9. Verify TypeScript compilation
print_status "Verifying TypeScript compilation..."
npx tsc --noEmit
print_success "TypeScript compilation verified"

# 10. Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file..."
    cat > .env << EOF
# POSPlus Environment Configuration
NODE_ENV=development
VITE_APP_VERSION=1.0.0
EOF
    print_success ".env file created"
fi

# 11. Create VSCode settings
print_status "Creating VSCode configuration..."
mkdir -p .vscode
cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "tailwindCSS.experimental.classRegex": [
    ["className=\"([^\"]*)", "([^\"]+)"],
    ["class=\"([^\"]*)", "([^\"]+)"]
  ],
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/release": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/release": true
  }
}
EOF

cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      },
      "args": [".", "--remote-debugging-port=9223"],
      "outputCapture": "std",
      "preLaunchTask": "npm: build:electron"
    },
    {
      "name": "Debug Renderer Process",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src/renderer"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack Debug",
      "configurations": ["Debug Main Process", "Debug Renderer Process"]
    }
  ]
}
EOF

cat > .vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: dev",
      "type": "npm",
      "script": "dev",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "npm: build:electron",
      "type": "npm",
      "script": "build:electron",
      "group": "build"
    },
    {
      "label": "npm: build",
      "type": "npm",
      "script": "build",
      "group": "build"
    }
  ]
}
EOF
print_success "VSCode configuration created"

# 12. Test the build
print_status "Testing build process..."
npm run build:electron
print_success "Build test passed"

echo ""
echo "=================================================="
echo "  Setup Complete!"
echo "=================================================="
echo ""
print_success "Your macOS development environment is ready!"
echo ""
echo "Next steps:"
echo "  1. Open the project in VSCode: code ."
echo "  2. Start development server: npm run dev"
echo "  3. Build for production: npm run build"
echo "  4. Package for Mac: npm run package:mac"
echo ""
echo "Useful commands:"
echo "  npm run dev          - Start development with hot reload"
echo "  npm run build        - Build for production"
echo "  npm run test         - Run tests"
echo "  npm run lint         - Check code quality"
echo "  npm run format       - Format code with Prettier"
echo "  npm run package:mac  - Create macOS installer"
echo ""
print_warning "For Windows builds, use a Windows machine or VM"
echo ""
