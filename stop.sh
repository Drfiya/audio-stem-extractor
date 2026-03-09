#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# stop.sh — Stop the Stem Separator servers
# ─────────────────────────────────────────────────────────
set -euo pipefail

log() { echo "🎵 [StemSep] $*"; }

for port in 8000 5173; do
    pid=$(lsof -ti:"$port" 2>/dev/null || true)
    if [ -n "$pid" ]; then
        kill -9 "$pid" 2>/dev/null || true
        log "Stopped process on port $port (PID $pid)"
    else
        log "Nothing running on port $port"
    fi
done

log "All servers stopped."
