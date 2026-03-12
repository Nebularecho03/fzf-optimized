param()
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  +-------------------------------+"
Write-Host "  |   FZF Launcher -- Installer   |"
Write-Host "  +-------------------------------+"
Write-Host ""

# Check Node.js
try {
    $nodeVersion = (node --version 2>&1).ToString().Trim()
    $nodeMajor = [int]($nodeVersion.TrimStart('v').Split('.')[0])
    if ($nodeMajor -lt 18) {
        Write-Host "  x Node.js v18+ required (found $nodeVersion). Please upgrade from https://nodejs.org"
        exit 1
    }
    Write-Host "  v Node.js $nodeVersion"
} catch {
    Write-Host "  x Node.js not found. Install from https://nodejs.org (v18+) and re-run."
    exit 1
}

# Install server dependencies
Write-Host ""
Write-Host "  Installing server dependencies..."
npm install --silent
if ($LASTEXITCODE -ne 0) { Write-Host "  x npm install failed"; exit 1 }

# Auto-download fzf
Write-Host "  Installing fzf binary..."
node scripts/install-fzf.js
if ($LASTEXITCODE -ne 0) { Write-Host "  x fzf install failed"; exit 1 }

# Build frontend
Write-Host "  Building frontend..."
Set-Location client
npm install --silent
npm run build --silent
Set-Location ..

Write-Host ""
Write-Host "  v Setup complete!"
Write-Host ""
Write-Host "  To start:   npm start"
Write-Host "  Then open:  http://localhost:3579"
Write-Host ""
