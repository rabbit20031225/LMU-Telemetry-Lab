@echo off
setlocal enabledelayedexpansion

:: 1. Initialize
set APP_VERSION=1.2.0
echo ===================================================
echo [START] Building LMU Telemetry Lab v%APP_VERSION%
echo ===================================================
cd /d "%~dp0"
echo [LOG] Current Path: %CD%
echo.

:: 2. Cleanup
echo [0/4] Cleaning up environment...
taskkill /F /IM "LMU Telemetry Lab.exe" /T 2>nul
taskkill /F /IM "lmu-telemetry-backend.exe" /T 2>nul

echo [LOG] Checking port 8000...
netstat -aon | findstr :8000 | findstr LISTENING > "%temp%\pids.txt"
for /f "usebackq tokens=5" %%a in ("%temp%\pids.txt") do (
    echo [LOG] Killing process %%a on port 8000...
    taskkill /F /PID %%a 2>nul
)
del "%temp%\pids.txt" 2>nul

echo [LOG] Cleaning directories...
if exist "dist-electron" rd /s /q "dist-electron"
if exist "dist" rd /s /q "dist"
if exist "build" rd /s /q "build"
if exist "frontend\dist" rd /s /q "frontend\dist"

:: 3. Frontend
echo [1/4] Building Frontend...
dir "frontend" >nul 2>nul
if errorlevel 1 goto ERR_FRONT_MISSING

pushd "%~dp0frontend"
echo [LOG] Running npm run build...
cmd /c npm run build
if errorlevel 1 goto ERR_FRONT_BUILD
popd

echo [LOG] Frontend build successful.

:: 4. Backend
echo [2/4] Packaging Backend (PyInstaller)...
dir ".venv" >nul 2>nul
if errorlevel 1 goto ERR_VENV_MISSING
dir "backend.spec" >nul 2>nul
if errorlevel 1 goto ERR_SPEC_MISSING

echo [LOG] Running PyInstaller...
cmd /c .venv\Scripts\python.exe -m PyInstaller backend.spec --noconfirm
if errorlevel 1 goto ERR_PYINST_FAIL

echo [LOG] Backend package successful.

:: 5. Electron
echo [3/4] Preparing Electron Shell...
dir "desktop" >nul 2>nul
if errorlevel 1 goto ERR_DESK_MISSING

pushd "%~dp0desktop"
echo [LOG] Running npm install in desktop...
cmd /c npm install
if errorlevel 1 goto ERR_NPM_INSTALL_FAIL
popd

echo [LOG] Electron dependencies ready.

:: 6. Final Pack
echo [4/4] Building Final Installer...
pushd "%~dp0desktop"
echo [LOG] Running electron-builder...
cmd /c npm run dist -- --win nsis
if errorlevel 1 goto ERR_DIST_FAIL
popd

echo.
echo ===================================================
echo [SUCCESS] DONE! Final installer: dist-electron/
echo ===================================================
pause
goto :EOF

:: --- ERROR HANDLERS ---
:ERR_FRONT_MISSING
echo [ERROR] frontend directory not found!
pause
exit /b 1

:ERR_FRONT_BUILD
echo [ERROR] Frontend build failed!
pause
exit /b 1

:ERR_VENV_MISSING
echo [ERROR] .venv not found in root!
pause
exit /b 1

:ERR_SPEC_MISSING
echo [ERROR] backend.spec not found in root!
pause
exit /b 1

:ERR_PYINST_FAIL
echo [ERROR] PyInstaller packaging failed!
pause
exit /b 1

:ERR_DESK_MISSING
echo [ERROR] desktop directory not found!
pause
exit /b 1

:ERR_NPM_INSTALL_FAIL
echo [ERROR] npm install failed in desktop!
pause
exit /b 1

:ERR_DIST_FAIL
echo [ERROR] Electron Builder failed!
pause
exit /b 1
