#!/bin/bash
# Prepare project for Windows build
# This creates a clean package without node_modules

echo "Preparing POSPlus for Windows build..."

# Create export directory
EXPORT_DIR="posplus-windows-build"
rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

# Copy project files (excluding node_modules, release, dist)
rsync -av --progress . "$EXPORT_DIR" \
  --exclude node_modules \
  --exclude release \
  --exclude dist \
  --exclude .git \
  --exclude "$EXPORT_DIR" \
  --exclude "*.dmg" \
  --exclude "*.exe"

# Create Windows build instructions
cat > "$EXPORT_DIR/BUILD_ON_WINDOWS.md" << 'EOF'
# Building POSPlus on Windows

## Prerequisites

1. **Node.js** (v18 or later)
   - Download from https://nodejs.org
   - Choose LTS version

2. **Windows Build Tools** (for native modules)
   ```cmd
   npm install -g windows-build-tools
   ```
   Or install Visual Studio Build Tools manually

3. **Python** (usually included with windows-build-tools)

## Build Steps

1. Open Command Prompt or PowerShell as Administrator

2. Navigate to project folder:
   ```cmd
   cd C:\path\to\posplus-windows-build
   ```

3. Install dependencies:
   ```cmd
   npm install
   ```

4. Build portable version:
   ```cmd
   npm run package:win
   ```

5. Find the executable in `release/` folder:
   - `POSPlus 1.0.0.exe` (portable version)

## Troubleshooting

- If `better-sqlite3` fails to build, install:
  ```cmd
  npm install -g node-gyp
  npm install -g @electron/rebuild
  ```

- If you see Python errors:
  ```cmd
  npm config set python python3
  ```

- For Visual C++ errors, install:
  Visual C++ Redistributable for Visual Studio 2019
  https://aka.ms/vs/16/release/vc_redist.x64.exe
EOF

# Create a simple batch file for Windows
cat > "$EXPORT_DIR/build.bat" << 'EOF'
@echo off
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo Building POSPlus for Windows...
call npm run package:win
if errorlevel 1 (
    echo Build failed
    pause
    exit /b 1
)

echo Build complete! Check the release folder.
pause
EOF

echo ""
echo "========================================="
echo "Project prepared in: $EXPORT_DIR"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Copy the '$EXPORT_DIR' folder to Windows"
echo "2. On Windows, run: build.bat"
echo "   OR follow BUILD_ON_WINDOWS.md"
echo ""
echo "Size of export:"
du -sh "$EXPORT_DIR"
