#!/usr/bin/env bash
PID_FILE="$HOME/.fzf-launcher/server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "  FZF Launcher does not appear to be running (no PID file)."
  exit 0
fi

PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  rm -f "$PID_FILE"
  echo "  FZF Launcher stopped (PID $PID)."
else
  echo "  FZF Launcher was not running."
  rm -f "$PID_FILE"
fi
