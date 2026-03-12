#!/usr/bin/env bash
# Start FZF Launcher in the background — terminal can be closed safely.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$HOME/.fzf-launcher/server.log"
PID_FILE="$HOME/.fzf-launcher/server.pid"

mkdir -p "$HOME/.fzf-launcher"

if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "  FZF Launcher is already running (PID $OLD_PID)."
    echo "  Open http://localhost:3579 in your browser."
    echo "  To stop it: ./stop.sh"
    exit 0
  fi
fi

cd "$DIR"
NO_OPEN=1 nohup node src/server.js > "$LOG" 2>&1 &
echo $! > "$PID_FILE"

sleep 1
if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo ""
  echo "  FZF Launcher started in background (PID $(cat "$PID_FILE"))"
  echo "  Open http://localhost:3579 in your browser."
  echo "  Logs: $LOG"
  echo "  To stop: ./stop.sh"
  echo ""
  # Open browser
  URL="http://localhost:3579"
  if command -v xdg-open &>/dev/null; then
    xdg-open "$URL" &>/dev/null &
  elif command -v open &>/dev/null; then
    open "$URL" &>/dev/null &
  fi
else
  echo "  ERROR: Server failed to start. Check logs: $LOG"
  exit 1
fi
