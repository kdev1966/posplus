# Windows Build Fix

## Problem
Error: "Le client ne dispose pas d'un privilège nécessaire" (Client doesn't have required privilege)

This happens because electron-builder needs to create symbolic links on Windows.

## ✅ SOLUTION 1: Enable Developer Mode (EASIEST)

### Automatic (Run as Administrator):
```powershell
.\enable-dev-mode.ps1
```

### Manual:
1. Open **Settings** (Windows + I)
2. Go to **Update & Security** → **For developers**
3. Enable **Developer Mode**
4. Close and reopen your terminal
5. Run: `npm run package:win`

## ✅ SOLUTION 2: Run PowerShell as Administrator

1. Close current PowerShell
2. Right-click **PowerShell** → **Run as Administrator**
3. Navigate to project:
   ```powershell
   cd M:\Users\dell\OneDrive\Bureau\devProjects\posplus
   ```
4. Run:
   ```powershell
   npm run package:win
   ```

## 🚀 After Fixing

Once Developer Mode is enabled or you're running as Admin:

```powershell
# For development (no packaging)
npm run dev

# For Windows portable build
npm run package:win
```

## 📝 Note

Developer Mode is the recommended solution as it:
- Only needs to be enabled once
- Doesn't require running as Administrator every time
- Is safer than always running with elevated privileges
