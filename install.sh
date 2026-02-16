#!/usr/bin/env bash
set -euo pipefail

# OpenClaw Wizard — one-line installer
# Usage: curl -fsSL https://raw.githubusercontent.com/agentixfarm/openclaw-wizard/main/install.sh | bash

REPO="agentixfarm/openclaw-wizard"
INSTALL_DIR="${OPENCLAW_WIZARD_DIR:-$HOME/.openclaw-wizard}"
PORT="${OPENCLAW_PORT:-3030}"

echo ""
echo "  /\\_/\\"
echo " ( o.o )   OpenClaw Wizard Installer"
echo "  > ^ <"
echo ""

# ── Detect platform ──────────────────────────────────────
detect_platform() {
  local os arch

  case "$(uname -s)" in
    Linux*)  os="linux" ;;
    Darwin*) os="macos" ;;
    MINGW*|MSYS*|CYGWIN*) os="windows" ;;
    *) echo "  Unsupported OS: $(uname -s)"; exit 1 ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64) arch="amd64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) echo "  Unsupported architecture: $(uname -m)"; exit 1 ;;
  esac

  if [ "$os" = "windows" ]; then
    echo "openclaw-wizard-${os}-${arch}.exe"
  else
    echo "openclaw-wizard-${os}-${arch}"
  fi
}

BINARY_NAME=$(detect_platform)
echo "  Platform: ${BINARY_NAME}"

# ── Get latest release ───────────────────────────────────
echo "  Fetching latest release..."

LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_TAG" ]; then
  echo "  Could not find latest release. Check https://github.com/${REPO}/releases"
  exit 1
fi

echo "  Version: ${LATEST_TAG}"

# ── Download ─────────────────────────────────────────────
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${LATEST_TAG}/${BINARY_NAME}.tar.gz"

echo "  Downloading ${BINARY_NAME}.tar.gz..."

mkdir -p "$INSTALL_DIR"
curl -fsSL "$DOWNLOAD_URL" -o "/tmp/openclaw-wizard.tar.gz"
tar xzf "/tmp/openclaw-wizard.tar.gz" -C "$INSTALL_DIR"
chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
rm -f "/tmp/openclaw-wizard.tar.gz"

# Create a symlink for easy access
ln -sf "${INSTALL_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/openclaw-wizard"

echo ""
echo "  Installed to: ${INSTALL_DIR}/openclaw-wizard"

# ── Launch ───────────────────────────────────────────────
echo ""
echo "  Starting OpenClaw Wizard on http://localhost:${PORT}"
echo "  Press Ctrl+C to stop"
echo ""

exec "${INSTALL_DIR}/openclaw-wizard" --port "$PORT"
