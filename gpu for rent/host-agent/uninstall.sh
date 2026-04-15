#!/bin/bash
set -e

# =============================================================================
# Velocity Infra Host Agent Uninstaller
# =============================================================================

SERVICE_NAME="velocity-agent"
VELOCITY_DIR="/opt/velocity"
VELOCITY_USER_DIR="$HOME/.velocity"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo ""
echo -e "${RED}Velocity Infra Host Agent Uninstaller${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root: sudo bash uninstall.sh${NC}"
  exit 1
fi

read -rp "This will stop the agent, remove all files, and deregister this machine. Continue? [y/N] " confirm
if [[ ! "$confirm" =~ ^[yY]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""

# Stop and disable service
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl stop "$SERVICE_NAME"
  echo -e "${GREEN}[OK]${NC}  Service stopped"
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl disable "$SERVICE_NAME" 2>/dev/null
  echo -e "${GREEN}[OK]${NC}  Service disabled"
fi

# Remove service file
if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
  rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
  echo -e "${GREEN}[OK]${NC}  Systemd service removed"
fi

# Remove agent files
if [ -d "$VELOCITY_DIR" ]; then
  rm -rf "$VELOCITY_DIR"
  echo -e "${GREEN}[OK]${NC}  Removed $VELOCITY_DIR"
fi

# Remove user config
if [ -d "$VELOCITY_USER_DIR" ]; then
  rm -rf "$VELOCITY_USER_DIR"
  echo -e "${GREEN}[OK]${NC}  Removed $VELOCITY_USER_DIR"
fi

# Also check root's home
if [ -d "/root/.velocity" ]; then
  rm -rf "/root/.velocity"
  echo -e "${GREEN}[OK]${NC}  Removed /root/.velocity"
fi

echo ""
echo -e "${GREEN}Velocity Infra agent uninstalled successfully.${NC}"
echo ""
echo -e "${YELLOW}Note: Docker containers created by the agent are NOT removed.${NC}"
echo "  To clean up: docker ps -a --filter 'name=velocity-' | docker rm -f \$(docker ps -aq --filter 'name=velocity-')"
echo ""
