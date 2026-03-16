const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("./db");
const { checkFzf, runFzf } = require("./fzf");
const { scanDir } = require("./scan");

const PORT = process.env.PORT || 3579;
const app = express();

app.use(express.json());

// Serve built frontend
const PUBLIC = path.join(__dirname, "..", "public");
if (fs.existsSync(PUBLIC)) {
  app.use(express.static(PUBLIC));
}

// Detach from terminal if requested (useful for standalone binaries)
if (
  !process.env.FZF_LAUNCHER_DETACHED &&
  (process.argv.includes("--detach") || process.env.DETACH === "1")
) {
  const { spawn } = require("child_process");
  const args = process.argv.slice(1).filter((a) => a !== "--detach");
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, FZF_LAUNCHER_DETACHED: "1" },
  });
  child.unref();
  process.exit(0);
}

// ── API ─────────────────────────────────────────────────────────────────────

app.get("/api/status", async (req, res) => {
  const fzfStatus = await checkFzf();
  res.json({
    fzf: fzfStatus.available,
    fzfVersion: fzfStatus.version,
    platform: process.platform,
    node: process.version,
  });
});

app.get("/api/sources", (req, res) => {
  res.json({ sources: db.listSources() });
});

app.post("/api/sources", (req, res) => {
  const { name, description, items } = req.body;
  if (!name || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "name and items[] are required" });
  }
  const source = db.createSource(name, description, items);
  res.status(201).json(source);
});

app.post("/api/sources/dir", async (req, res) => {
  const {
    dir,
    name,
    description,
    includeFiles = true,
    includeDirs = true,
    includeHidden = false,
    maxDepth,
  } = req.body || {};

  if (!dir || typeof dir !== "string") {
    return res.status(400).json({ error: "dir is required" });
  }

  const dirPath = path.resolve(dir);
  if (!includeFiles && !includeDirs) {
    return res.status(400).json({ error: "includeFiles or includeDirs must be true" });
  }
  let stats;
  try {
    stats = fs.statSync(dirPath);
  } catch (err) {
    return res.status(400).json({ error: "dir does not exist" });
  }
  if (!stats.isDirectory()) {
    return res.status(400).json({ error: "dir must be a directory" });
  }

  const depthValue =
    maxDepth === undefined || maxDepth === null
      ? Infinity
      : Number(maxDepth);
  if (Number.isNaN(depthValue) || depthValue < 0) {
    return res.status(400).json({ error: "maxDepth must be a non-negative number" });
  }

  try {
    const items = await scanDir(dirPath, {
      includeFiles: !!includeFiles,
      includeDirs: !!includeDirs,
      includeHidden: !!includeHidden,
      maxDepth: depthValue,
    });

    if (items.length === 0) {
      return res
        .status(400)
        .json({ error: "No files or folders found to index" });
    }

    const baseName = path.basename(dirPath);
    const resolvedName = name && name.trim().length > 0 ? name.trim() : baseName || dirPath;
    const source = db.createSource(resolvedName, description, items);
    res.status(201).json(source);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/sources/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const ok = db.deleteSource(id);
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.sendStatus(204);
});

app.post("/api/search", async (req, res) => {
  const { query, sourceId, limit } = req.body;
  if (query === undefined || !sourceId) {
    return res.status(400).json({ error: "query and sourceId are required" });
  }

  const source = db.getSource(sourceId);
  if (!source) return res.status(404).json({ error: "Source not found" });

  const items = db.getItems(sourceId);

  try {
    const { results, elapsedMs } = await runFzf(items, query, limit || 200);
    res.json({ results, query, total: results.length, elapsedMs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
if (fs.existsSync(PUBLIC)) {
  app.get("*", (req, res) => {
    res.sendFile(path.join(PUBLIC, "index.html"));
  });
}

// ── Start ────────────────────────────────────────────────────────────────────

async function start() {
  const fzfStatus = await checkFzf();

  app.listen(PORT, "127.0.0.1", () => {
    const url = `http://localhost:${PORT}`;
    console.log("");
    console.log("  ╔═══════════════════════════════╗");
    console.log("  ║        FZF Launcher UI        ║");
    console.log("  ╚═══════════════════════════════╝");
    console.log("");
    console.log(`  Running at  → ${url}`);
    console.log(`  fzf engine  → ${fzfStatus.available ? `v${fzfStatus.version} ✓` : "NOT FOUND ✗"}`);
    console.log(`  database    → ~/.fzf-launcher/data.db`);
    console.log("");

    if (!fzfStatus.available) {
      console.log("  ⚠  fzf not found! Install it:");
      console.log("     Linux:   sudo apt install fzf  OR  brew install fzf");
      console.log("     Windows: scoop install fzf  OR  choco install fzf");
      console.log("");
    }

    // Auto-open browser
    if (process.env.NO_OPEN !== "1") {
      import("open").then(({ default: open }) => open(url)).catch(() => {});
    }
  });
}

start();
