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

After running `install.ps1` once, double-click **`start.bat`** to launch.

---

## Running in the Background

Close the terminal and keep the server running:

### Linux / macOS

```bash
chmod +x start-bg.sh stop.sh
./start-bg.sh          # starts server, opens browser, detaches from terminal
./stop.sh              # stops the background server
```

Or with npm:

```bash
npm run start:bg       # start in background
npm run stop           # stop
```

Logs are written to `~/.fzf-launcher/server.log`.

### Windows

Double-click **`start.bat`** — uses `start /B` so the server keeps running when the terminal closes.  
To stop it, double-click **`stop.bat`**.

---

## What install does

1. Installs Node.js server dependencies
2. Downloads the fzf binary into `./bin/` (no system-wide install needed)
3. Builds the React frontend into `./public/`

---

## Usage

After `npm start`, the app opens automatically at **http://localhost:3579**

### Finder tab
- Type to fuzzy search any source
- **↑↓** navigate results
- **Enter** copy selected item to clipboard
- **Ctrl+O** open file/folder in your file manager (when result is a path)
- **Ctrl+K** focus the search box

### Sources tab
Create searchable lists from:
- **Paste** — type or paste items (one per line)
- **File** — pick a text file; each line becomes a searchable item
- **Folder** — pick a folder; all file paths inside become items
- **Local Path** — type an absolute path; the server reads it directly

### Opening files from search results
When a search result looks like a file path (e.g. `src/components/Button.jsx`), an **⎋ open** button appears on hover. Clicking it opens the file or folder in your OS default app (Finder / Explorer / xdg-open).

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
