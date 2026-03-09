#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# launch.sh — Start the Stem Separator (backend + frontend)
# Usage:  ./launch.sh
# ─────────────────────────────────────────────────────────
set -euo pipefail

# Resolve project root (directory containing this script)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BACKEND_PORT=8000
FRONTEND_PORT=5173
BACKEND_PID=""
FRONTEND_PID=""

# ── Logging ──────────────────────────────────────────────

log() { echo "🎵 [StemSep] $*"; }

# ── Cleanup on exit ──────────────────────────────────────

cleanup() {
    log "Shutting down…"
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
    # Kill any remaining child processes
    kill 0 2>/dev/null || true
    log "Done."
}
trap cleanup EXIT INT TERM

# ── Pre-flight checks ───────────────────────────────────

if [ ! -d "backend/venv" ]; then
    log "❌ No virtual environment found. Run install.sh first."
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    log "❌ Frontend dependencies not installed. Run install.sh first."
    exit 1
fi

# ── Kill any existing instances on our ports ─────────────

for port in $BACKEND_PORT $FRONTEND_PORT; do
    pid=$(lsof -ti:"$port" 2>/dev/null || true)
    if [ -n "$pid" ]; then
        log "Killing existing process on port $port (PID $pid)"
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
done

# ── Start backend ────────────────────────────────────────

log "Starting backend on port $BACKEND_PORT…"
(
    cd backend
    source venv/bin/activate
    uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" 2>&1 | \
        sed 's/^/   [backend] /'
) &
BACKEND_PID=$!

# ── Start frontend ───────────────────────────────────────

log "Starting frontend on port $FRONTEND_PORT…"
(
    cd frontend
    node node_modules/.bin/vite --port "$FRONTEND_PORT" 2>&1 | \
        sed 's/^/   [frontend] /'
) &
FRONTEND_PID=$!

# ── Wait for servers to be ready ─────────────────────────

log "Waiting for servers…"
MAX_WAIT=30
elapsed=0
while [ $elapsed -lt $MAX_WAIT ]; do
    backend_ok=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/docs" 2>/dev/null || echo "000")
    frontend_ok=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONTEND_PORT/" 2>/dev/null || echo "000")

    if [ "$backend_ok" = "200" ] && [ "$frontend_ok" = "200" ]; then
        break
    fi
    sleep 1
    elapsed=$((elapsed + 1))
done

if [ $elapsed -ge $MAX_WAIT ]; then
    log "⚠️  Timed out waiting for servers. Check the output above for errors."
    exit 1
fi

# ── Open browser ─────────────────────────────────────────

log "✅ Ready! Opening browser…"
open "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
xdg-open "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
log "Open http://localhost:$FRONTEND_PORT in your browser."

# ── Keep running until killed ────────────────────────────

log "Press Ctrl+C to stop."
wait
