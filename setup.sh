#!/usr/bin/env bash
set -euo pipefail

# OpenClaw Wizard — build & launch (for developers with Rust installed)
# For pre-built binaries, see: https://github.com/openclaw/openclaw-wizard/releases
#
# Usage: ./setup.sh [--port 3030] [--no-open]

PORT="${OPENCLAW_PORT:-3030}"
NO_OPEN=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --port) PORT="$2"; shift 2 ;;
    --no-open) NO_OPEN="--no-open"; shift ;;
    *) shift ;;
  esac
done

echo ""
echo "  🐾  OpenClaw Wizard"
echo "  ──────────────────────"
echo ""

# ── Prerequisites ──────────────────────────────────────────
check() { command -v "$1" &>/dev/null; }

if ! check node; then
  echo "  ✗ Node.js not found. Install from https://nodejs.org"
  exit 1
fi

if ! check cargo; then
  echo "  ✗ Rust not found. Install from https://rustup.rs"
  echo "  Tip: Use pre-built binaries instead — see GitHub Releases."
  exit 1
fi

echo "  ✓ Node.js $(node -v)"
echo "  ✓ Rust $(rustc --version | awk '{print $2}')"
echo ""

# ── Build frontend ─────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "  → Building frontend..."
(cd frontend && npm ci --silent && npm run build --silent)

rm -rf backend/static
cp -r frontend/dist backend/static
echo "  ✓ Frontend built"

# ── Build & run backend ────────────────────────────────────
echo "  → Building backend..."
(cd backend && cargo build --release --quiet)
echo "  ✓ Backend built"
echo ""
echo "  🚀 Launching on http://127.0.0.1:${PORT}"
echo "     Press Ctrl+C to stop"
echo ""

# Run from backend/ dir so ServeDir::new("static") resolves correctly
cd "$SCRIPT_DIR/backend"
exec target/release/openclaw-wizard --port "$PORT" $NO_OPEN
