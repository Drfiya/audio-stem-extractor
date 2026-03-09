#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# install.sh — One-time setup for macOS / Linux
# Usage:  ./install.sh
# ─────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

log() { echo ""; echo "🎵 [Install] $*"; }
ok()  { echo "   ✅ $*"; }
err() { echo "   ❌ $*"; }

# ── Check prerequisites ─────────────────────────────────

log "Checking prerequisites…"

if command -v python3 &>/dev/null; then
    ok "python3 found: $(python3 --version 2>&1)"
else
    err "python3 not found. Install Python 3.9+ from https://www.python.org"
    exit 1
fi

if command -v node &>/dev/null; then
    ok "node found: $(node --version)"
else
    err "node not found. Install Node.js 18+ from https://nodejs.org"
    exit 1
fi

if command -v ffmpeg &>/dev/null; then
    ok "ffmpeg found"
else
    echo "   ⚠️  ffmpeg not found. MP3 output will not work."
    echo "   Install with: brew install ffmpeg"
fi

# ── Backend setup ────────────────────────────────────────

log "Setting up backend…"

cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    ok "Created virtual environment"
fi

source venv/bin/activate
pip install --quiet -r requirements.txt
ok "Installed core dependencies"

# Install Demucs + soundfile (the heavy ML packages)
pip install --quiet demucs soundfile
ok "Installed Demucs + soundfile (this may have taken a while)"

# Create .env from example if missing
if [ ! -f ".env" ]; then
    cp ../.env.example .env
    ok "Created .env from template"
fi

cd "$SCRIPT_DIR"

# ── Frontend setup ───────────────────────────────────────

log "Setting up frontend…"

cd frontend
npm install --silent
ok "Installed frontend dependencies"
cd "$SCRIPT_DIR"

# ── Make launcher executable ─────────────────────────────

chmod +x launch.sh stop.sh
ok "Made scripts executable"

# ── Build macOS .app bundle ──────────────────────────────

log "Building StemSeparator.app…"

APP_DIR="StemSeparator.app/Contents"
mkdir -p "$APP_DIR/MacOS"
mkdir -p "$APP_DIR/Resources"

# Info.plist
cat > "$APP_DIR/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Stem Separator</string>
    <key>CFBundleDisplayName</key>
    <string>Stem Separator</string>
    <key>CFBundleIdentifier</key>
    <string>com.stemseparator.app</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleExecutable</key>
    <string>StemSeparator</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST

# Executable launcher (calls our launch.sh)
cat > "$APP_DIR/MacOS/StemSeparator" << LAUNCHER
#!/usr/bin/env bash
# StemSeparator.app — launches the stem separator
PROJECT_DIR="$SCRIPT_DIR"
cd "\$PROJECT_DIR"
exec "\$PROJECT_DIR/launch.sh"
LAUNCHER
chmod +x "$APP_DIR/MacOS/StemSeparator"

ok "Built StemSeparator.app"

# ── Copy to Desktop (optional) ───────────────────────────

DESKTOP_APP="$HOME/Desktop/StemSeparator.app"
if [ -d "$DESKTOP_APP" ]; then
    rm -rf "$DESKTOP_APP"
fi
cp -R StemSeparator.app "$DESKTOP_APP"
ok "Copied StemSeparator.app to Desktop"

# ── Done ─────────────────────────────────────────────────

log "✅ Installation complete!"
echo ""
echo "   Double-click 'Stem Separator' on your Desktop to start."
echo "   Or run:  ./launch.sh"
echo ""
