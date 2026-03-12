# FZF Launcher UI

A fast, local fuzzy finder with a web UI — powered by [fzf](https://github.com/junegunn/fzf).  
Runs entirely on your machine. No internet required after setup.

---

## Requirements

- **Node.js v18+** — [https://nodejs.org](https://nodejs.org)
- **fzf** — auto-downloaded during install, or install manually

---

## Quick Start

### Linux / macOS

```bash
cd fzf-launcher
chmod +x install.sh
./install.sh
npm start
```

### Windows (PowerShell)

```powershell
cd fzf-launcher
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
npm start
```

### Windows (double-click)

After running `install.ps1` once, you can just double-click **`start.bat`** to launch.

---

## What install does

1. Installs Node.js server dependencies
2. Downloads the fzf binary into `./bin/` (no system-wide install needed)
3. Builds the React frontend into `./public/`

---

## Usage

After `npm start`, the app opens automatically at **http://localhost:3579**

- **Finder tab** — type to fuzzy search any source
- **Sources tab** — add/remove searchable lists (one item per line)
- Keyboard: `↑↓` navigate · `Enter` copy · `Ctrl+K` focus search

---

## Ports

Default port is `3579`. Change it with an environment variable:

```bash
PORT=4000 npm start
```

---

## Data

All your sources are stored in `~/.fzf-launcher/data.db` (SQLite).  
To reset, delete that file.

---

## Manual fzf install (if auto-download fails)

```bash
# Linux
sudo apt install fzf
# or
brew install fzf

# macOS
brew install fzf

# Windows (Scoop)
scoop install fzf

# Windows (Chocolatey)
choco install fzf
```
