#!/usr/bin/env bash
set -e

echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║   FZF Launcher — Installer   ║"
echo "  ╚═══════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "  ✗ Node.js not found. Install it from https://nodejs.org (v18+) and re-run."
  exit 1
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "  ✗ Node.js v18+ required (found $(node --version)). Please upgrade."
  exit 1
fi
echo "  ✓ Node.js $(node --version)"

# Check npm
if ! command -v npm &>/dev/null; then
  echo "  ✗ npm not found. It should come with Node.js."
  exit 1
fi
echo "  ✓ npm $(npm --version)"

# Install server deps
echo ""
echo "  Installing server dependencies..."
npm install --silent

# Auto-download fzf into ./bin/
echo "  Installing fzf binary..."
node scripts/install-fzf.js

# Build the frontend
echo "  Building frontend..."
cd client
npm install --silent
npm run build --silent
cd ..

echo ""
echo "  ✓ Setup complete!"
echo ""
echo "  To start:  npm start"
echo "  Then open: http://localhost:3579"
echo ""
