@echo off
REM ─────────────────────────────────────────────────────────
REM launch.bat — Start the Stem Separator (backend + frontend)
REM Usage:  double-click this file, or run from cmd: launch.bat
REM ─────────────────────────────────────────────────────────

title Stem Separator
echo.
echo  ========================================
echo    Stem Separator — Starting up...
echo  ========================================
echo.

REM ── Resolve project root ─────────────────────────────────
cd /d "%~dp0"

REM ── Pre-flight checks ────────────────────────────────────
if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] No virtual environment found. Run install.bat first.
    pause
    exit /b 1
)
if not exist "frontend\node_modules" (
    echo [ERROR] Frontend dependencies not installed. Run install.bat first.
    pause
    exit /b 1
)

REM ── Start backend in background ──────────────────────────
echo [StemSep] Starting backend on port 8000...
start /B "backend" cmd /c "cd backend && call venv\Scripts\activate.bat && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

REM ── Start frontend in background ─────────────────────────
echo [StemSep] Starting frontend on port 5173...
start /B "frontend" cmd /c "cd frontend && node node_modules\.bin\vite --port 5173"

REM ── Wait for servers to be ready ─────────────────────────
echo [StemSep] Waiting for servers...
set /a attempts=0
:waitloop
if %attempts% GEQ 30 (
    echo [StemSep] Timed out waiting for servers. Check for errors above.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul

REM Check if backend is responding
curl -s -o nul -w "%%{http_code}" http://localhost:8000/docs 2>nul | findstr "200" >nul
if errorlevel 1 (
    set /a attempts+=1
    goto waitloop
)

REM Check if frontend is responding
curl -s -o nul -w "%%{http_code}" http://localhost:5173/ 2>nul | findstr "200" >nul
if errorlevel 1 (
    set /a attempts+=1
    goto waitloop
)

REM ── Open browser ─────────────────────────────────────────
echo.
echo [StemSep] Ready! Opening browser...
start http://localhost:5173

echo.
echo  ========================================
echo    Stem Separator is running!
echo    Close this window to stop the app.
echo  ========================================
echo.

REM ── Keep window open (closing it kills child processes) ──
cmd /k
