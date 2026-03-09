@echo off
REM ─────────────────────────────────────────────────────────
REM stop.bat — Stop the Stem Separator servers
REM ─────────────────────────────────────────────────────────

echo [StemSep] Stopping servers...

REM Kill processes on port 8000 (backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo [StemSep] Stopping backend (PID %%a)
    taskkill /F /PID %%a >nul 2>&1
)

REM Kill processes on port 5173 (frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo [StemSep] Stopping frontend (PID %%a)
    taskkill /F /PID %%a >nul 2>&1
)

echo [StemSep] All servers stopped.
pause
