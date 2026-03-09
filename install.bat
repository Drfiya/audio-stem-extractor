@echo off
REM ─────────────────────────────────────────────────────────
REM install.bat — One-time setup for Windows
REM Usage:  double-click this file, or run from cmd: install.bat
REM ─────────────────────────────────────────────────────────

title Stem Separator — Installing...
echo.
echo  ========================================
echo    Stem Separator — Installation
echo  ========================================
echo.

REM ── Resolve project root ─────────────────────────────────
cd /d "%~dp0"

REM ── Check prerequisites ──────────────────────────────────

echo [Install] Checking prerequisites...

where python >nul 2>&1
if errorlevel 1 (
    echo    [X] python not found. Install Python 3.9+ from https://www.python.org
    echo        IMPORTANT: Check "Add Python to PATH" during installation.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('python --version 2^>^&1') do echo    [OK] %%v

where node >nul 2>&1
if errorlevel 1 (
    echo    [X] node not found. Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node --version 2^>^&1') do echo    [OK] Node %%v

where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo    [!] ffmpeg not found. MP3 output will not work.
    echo        Install from: https://ffmpeg.org/download.html
) else (
    echo    [OK] ffmpeg found
)

REM ── Backend setup ──────────────────────────────────────

echo.
echo [Install] Setting up backend...

cd backend

if not exist "venv" (
    python -m venv venv
    echo    [OK] Created virtual environment
)

call venv\Scripts\activate.bat

pip install --quiet -r requirements.txt
echo    [OK] Installed core dependencies

echo    [..] Installing Demucs + PyTorch (this may take several minutes)...
pip install --quiet demucs soundfile
echo    [OK] Installed Demucs + soundfile

REM Create .env from example if missing
if not exist ".env" (
    copy /Y "..\.env.example" ".env" >nul
    echo    [OK] Created .env from template
)

cd ..

REM ── Frontend setup ─────────────────────────────────────

echo.
echo [Install] Setting up frontend...

cd frontend
call npm install --silent
echo    [OK] Installed frontend dependencies
cd ..

REM ── Create Desktop shortcut ────────────────────────────

echo.
echo [Install] Creating Desktop shortcut...

set "SHORTCUT=%USERPROFILE%\Desktop\Stem Separator.lnk"
set "TARGET=%~dp0launch.bat"
set "ICON=%~dp0assets\icon.ico"
set "WORKDIR=%~dp0"

powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell; ^
     $s = $ws.CreateShortcut('%SHORTCUT%'); ^
     $s.TargetPath = '%TARGET%'; ^
     $s.WorkingDirectory = '%WORKDIR%'; ^
     $s.Description = 'Stem Separator — AI-powered audio splitting'; ^
     if (Test-Path '%ICON%') { $s.IconLocation = '%ICON%' }; ^
     $s.Save()"
echo    [OK] Created Desktop shortcut

REM ── Done ───────────────────────────────────────────────

echo.
echo  ========================================
echo    Installation complete!
echo.
echo    Double-click "Stem Separator" on your
echo    Desktop to start the application.
echo  ========================================
echo.
pause
