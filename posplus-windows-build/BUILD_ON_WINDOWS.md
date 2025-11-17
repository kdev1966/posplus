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
