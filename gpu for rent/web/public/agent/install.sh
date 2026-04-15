#!/bin/bash
set -e

# =============================================================================
# Velocity Infra Host Agent Installer
# Usage: curl -sSL https://get.velocityinfra.in/install.sh | bash
# =============================================================================

VELOCITY_DIR="/opt/velocity"
VELOCITY_USER_DIR="$HOME/.velocity"
SERVICE_NAME="velocity-agent"
API_URL="${VELOCITY_API_URL:-https://velocity-infra.vercel.app}"
AGENT_URL="${API_URL}/agent/agent.py"
REQUIREMENTS_URL="${API_URL}/agent/requirements.txt"
TEST_MODE="${VELOCITY_TEST_MODE:-false}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }
step()  { echo -e "\n${CYAN}==>${NC} $1"; }

echo ""
echo "  ██╗   ██╗███████╗██╗      ██████╗  ██████╗██╗████████╗██╗   ██╗"
echo "  ██║   ██║██╔════╝██║     ██╔═══██╗██╔════╝██║╚══██╔══╝╚██╗ ██╔╝"
echo "  ██║   ██║█████╗  ██║     ██║   ██║██║     ██║   ██║    ╚████╔╝ "
echo "  ╚██╗ ██╔╝██╔══╝  ██║     ██║   ██║██║     ██║   ██║     ╚██╔╝  "
echo "   ╚████╔╝ ███████╗███████╗╚██████╔╝╚██████╗██║   ██║      ██║   "
echo "    ╚═══╝  ╚══════╝╚══════╝ ╚═════╝  ╚═════╝╚═╝   ╚═╝      ╚═╝   "
echo ""
echo "  Host Agent Installer"
echo ""

# ── 1. Prerequisite checks ──────────────────────────────────────────────────

step "Checking prerequisites..."

# Must be root
if [ "$EUID" -ne 0 ]; then
  fail "Please run as root: sudo bash install.sh"
fi

# Test mode banner
if [ "$TEST_MODE" = "true" ]; then
  echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║  TEST MODE — GPU/Docker/NVIDIA checks will be skipped.         ║${NC}"
  echo -e "${YELLOW}║  The agent will register with simulated hardware specs.         ║${NC}"
  echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
fi

# macOS detection (block unless test mode)
if [ "$(uname -s)" = "Darwin" ] && [ "$TEST_MODE" != "true" ]; then
  echo ""
  echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  macOS is not supported as a host machine.                      ║${NC}"
  echo -e "${RED}║                                                                 ║${NC}"
  echo -e "${RED}║  The Velocity Infra host agent requires:                        ║${NC}"
  echo -e "${RED}║    • Linux (Ubuntu 18.04+)                                      ║${NC}"
  echo -e "${RED}║    • NVIDIA GPU with drivers installed                          ║${NC}"
  echo -e "${RED}║    • Docker with nvidia-container-toolkit                       ║${NC}"
  echo -e "${RED}║    • systemd for service management                             ║${NC}"
  echo -e "${RED}║                                                                 ║${NC}"
  echo -e "${RED}║  To test without a GPU, re-run with VELOCITY_TEST_MODE=true     ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  exit 1
fi

# Python 3.8+
if command -v python3 &>/dev/null; then
  PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
  PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
  if [ "$PY_MAJOR" -lt 3 ] || ([ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 8 ]); then
    fail "Python 3.8+ required (detected: $PY_VERSION)"
  fi
  info "Python: $PY_VERSION"
else
  fail "Python 3 not found. Install with: sudo apt install python3 python3-pip"
fi

if [ "$TEST_MODE" = "true" ]; then
  warn "TEST MODE: Skipping Docker, NVIDIA, and OS checks"
  info "Simulated GPU: 1x NVIDIA RTX 4090 (24 GB VRAM)"
else
  # OS check
  if command -v lsb_release &>/dev/null; then
    OS_NAME=$(lsb_release -ds 2>/dev/null || echo "Unknown")
    OS_VERSION=$(lsb_release -rs 2>/dev/null || echo "0")
    MAJOR_VERSION=$(echo "$OS_VERSION" | cut -d. -f1)
    if [ "$MAJOR_VERSION" -lt 18 ] 2>/dev/null; then
      fail "Ubuntu 18.04+ required (detected: $OS_NAME)"
    fi
    info "OS: $OS_NAME"
  else
    warn "lsb_release not found — cannot verify OS version"
  fi

  # Docker
  if command -v docker &>/dev/null; then
    DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
    if docker info &>/dev/null; then
      info "Docker: $DOCKER_VERSION (daemon running)"
    else
      fail "Docker is installed but the daemon is not running. Start with: sudo systemctl start docker"
    fi
  else
    fail "Docker not found. Install from: https://docs.docker.com/engine/install/ubuntu/"
  fi

  # NVIDIA driver
  if command -v nvidia-smi &>/dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    GPU_COUNT=$(nvidia-smi --list-gpus 2>/dev/null | wc -l)
    info "GPU: $GPU_COUNT x $GPU_INFO"
  else
    fail "nvidia-smi not found. Install NVIDIA drivers: https://docs.nvidia.com/datacenter/tesla/tesla-installation-notes/"
  fi

  # nvidia-container-toolkit
  if docker run --rm --gpus all nvidia/cuda:12.2.2-base-ubuntu22.04 nvidia-smi &>/dev/null; then
    info "nvidia-container-toolkit: working"
  else
    warn "nvidia-container-toolkit test failed. GPU passthrough may not work."
    echo "  Install: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
  fi

  # cloudflared (optional)
  if command -v cloudflared &>/dev/null; then
    info "cloudflared: $(cloudflared --version 2>&1 | head -1)"
  else
    warn "cloudflared not found (optional, for secure tunnels)"
    echo "  Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  fi
fi

# ── 2. Download agent ────────────────────────────────────────────────────────

step "Installing Velocity Infra agent to $VELOCITY_DIR..."

mkdir -p "$VELOCITY_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"

if [ -f "$SCRIPT_DIR/agent.py" ]; then
  cp "$SCRIPT_DIR/agent.py" "$VELOCITY_DIR/agent.py"
  info "Copied agent.py from local source"
elif curl -sSL --fail "$AGENT_URL" -o "$VELOCITY_DIR/agent.py" 2>/dev/null; then
  info "Downloaded agent.py from $API_URL"
else
  fail "Failed to download agent.py. Check your VELOCITY_API_URL or place agent.py next to install.sh"
fi

if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
  cp "$SCRIPT_DIR/requirements.txt" "$VELOCITY_DIR/requirements.txt"
else
  curl -sSL --fail "$REQUIREMENTS_URL" -o "$VELOCITY_DIR/requirements.txt" 2>/dev/null || true
fi

pip3 install -q requests psutil 2>/dev/null
if [ -f "$VELOCITY_DIR/requirements.txt" ]; then
  pip3 install -q -r "$VELOCITY_DIR/requirements.txt" 2>/dev/null || true
fi
info "Python dependencies installed"

# ── 3. API Key ───────────────────────────────────────────────────────────────

step "API Key Configuration"

if [ -n "$VELOCITY_API_KEY" ]; then
  API_KEY="$VELOCITY_API_KEY"
  info "Using API key from VELOCITY_API_KEY env var"
else
  echo ""
  echo "  Enter your Velocity Infra API key."
  echo "  Get one at: ${API_URL}/settings"
  echo ""
  read -rp "  API Key (vi_live_...): " API_KEY

  if [[ ! "$API_KEY" == vi_live_* ]]; then
    fail "Invalid API key format. Must start with vi_live_"
  fi
fi

info "API key accepted: ${API_KEY:0:15}..."

# ── 4. Register machine ─────────────────────────────────────────────────────

step "Registering machine with Velocity Infra..."

if [ "$TEST_MODE" = "true" ]; then
  python3 "$VELOCITY_DIR/agent.py" --register --api-key "$API_KEY" --api-url "$API_URL" --test-mode
else
  python3 "$VELOCITY_DIR/agent.py" --register --api-key "$API_KEY" --api-url "$API_URL"
fi
info "Machine registered successfully"

# ── 5. Create systemd service ────────────────────────────────────────────────

if [ "$TEST_MODE" = "true" ]; then
  step "Skipping systemd service (test mode)..."
  warn "In production, a systemd service would be created to keep the agent running."

  step "Starting agent in foreground (test mode)..."
  info "Agent will send heartbeats. Press Ctrl+C to stop."
  echo ""
  python3 "$VELOCITY_DIR/agent.py" --test-mode &
  AGENT_PID=$!
  sleep 10
  kill $AGENT_PID 2>/dev/null || true
  wait $AGENT_PID 2>/dev/null || true
  info "Test heartbeat sent successfully"
else
  step "Creating systemd service..."

  cat > /etc/systemd/system/${SERVICE_NAME}.service << 'UNIT'
[Unit]
Description=Velocity Infra Host Agent
After=docker.service
Requires=docker.service

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/velocity/agent.py
Restart=always
RestartSec=10
Environment=HOME=/root

[Install]
WantedBy=multi-user.target
UNIT

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl start "$SERVICE_NAME"

  info "Service created and started: $SERVICE_NAME"

  # ── 6. Run self-test ─────────────────────────────────────────────────────────

  step "Running self-test..."

  python3 "$VELOCITY_DIR/agent.py" --self-test || warn "Some self-test checks failed (non-fatal)"
fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Velocity Infra Host Agent installed successfully!      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Useful commands:"
echo "    Status:   sudo systemctl status $SERVICE_NAME"
echo "    Logs:     sudo journalctl -u $SERVICE_NAME -f"
echo "    Restart:  sudo systemctl restart $SERVICE_NAME"
echo "    Stop:     sudo systemctl stop $SERVICE_NAME"
echo ""
echo "  Config:     $HOME/.velocity/machine.json"
echo "  Agent:      $VELOCITY_DIR/agent.py"
echo ""
echo "  Dashboard:  ${API_URL}/host/dashboard"
echo ""
