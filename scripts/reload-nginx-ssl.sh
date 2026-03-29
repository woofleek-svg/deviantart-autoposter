#!/bin/bash
# Monthly nginx SSL certificate reload script
# Restarts frontend container to pick up renewed Let's Encrypt certificates

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/nginx-reload.log"
COMPOSE_DIR="$SCRIPT_DIR"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Log with timestamp
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting nginx SSL reload..." >> "$LOG_FILE"

# Change to compose directory and restart frontend
cd "$COMPOSE_DIR" || exit 1
docker compose restart frontend >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Nginx reloaded successfully" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Failed to reload nginx" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
