const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("./db");
const { checkFzf, runFzf } = require("./fzf");

const PORT = process.env.PORT || 3579;
const app = express();

app.use(express.json());

// Serve built frontend
const PUBLIC = path.join(__dirname, "..", "public");
if (fs.existsSync(PUBLIC)) {
  app.use(express.static(PUBLIC));
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

// Import from local file or folder path
app.post("/api/sources/from-path", (req, res) => {
  const { targetPath, name, description, recursive } = req.body;
  if (!targetPath || !name) {
    return res.status(400).json({ error: "targetPath and name are required" });
  }

  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    return res.status(400).json({ error: `Path not found: ${resolved}` });
  }

  const stat = fs.statSync(resolved);
  let items = [];

  if (stat.isFile()) {
    const content = fs.readFileSync(resolved, "utf8");
    items = content.split("\n").map(l => l.trim()).filter(Boolean);
  } else if (stat.isDirectory()) {
    items = walkDir(resolved, resolved, recursive !== false);
    items.sort();
  } else {
    return res.status(400).json({ error: "Path must be a file or directory" });
  }

  if (items.length === 0) {
    return res.status(400).json({ error: "No items found at that path" });
  }

  const source = db.createSource(name, description || null, items);
  res.status(201).json(source);
});

function walkDir(base, dir, recursive) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    if (entry.isDirectory()) {
      if (recursive) results = results.concat(walkDir(base, full, true));
    } else {
      results.push(rel);
    }
  }
  return results;
}

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
