const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Look for fzf binary: first in ./bin/ (bundled), then in PATH
function getFzfBinary() {
  const ext = process.platform === "win32" ? ".exe" : "";
  const local = path.join(__dirname, "..", "bin", `fzf${ext}`);
  if (fs.existsSync(local)) return local;
  return `fzf${ext}`;
}

let _fzfVersion = null;

function checkFzf() {
  return new Promise((resolve) => {
    const bin = getFzfBinary();
    const proc = spawn(bin, ["--version"], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.on("close", (code) => {
      if (code === 0) {
        _fzfVersion = out.trim().split(/\s+/)[0];
        resolve({ available: true, version: _fzfVersion });
      } else {
        resolve({ available: false, version: null });
      }
    });
    proc.on("error", () => resolve({ available: false, version: null }));
  });
}

function runFzf(items, query, limit = 200) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();

    if (!query.trim()) {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
      return resolve({
        results: items.slice(0, limit).map((text, index) => ({ text, score: 0, index })),
        elapsedMs: elapsed,
      });
    }

    const bin = getFzfBinary();
    const proc = spawn(bin, ["--filter", query, "--no-sort"], {
      stdio: ["pipe", "pipe", "ignore"],
    });

    let stdout = "";
    proc.stdout.on("data", (d) => (stdout += d));

    proc.on("close", (code) => {
      if (code !== 0 && code !== 1) {
        return reject(new Error(`fzf exited with code ${code}`));
      }

      const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
      const matched = stdout
        .split("\n")
        .filter((l) => l.length > 0)
        .slice(0, limit);

      // Map text → original index (first occurrence)
      const textToIndex = new Map();
      items.forEach((item, i) => {
        if (!textToIndex.has(item)) textToIndex.set(item, i);
      });

      const results = matched.map((text, rank) => ({
        text,
        score: matched.length - rank,
        index: textToIndex.get(text) ?? -1,
      }));

      resolve({ results, elapsedMs: elapsed });
    });

    proc.on("error", (err) => reject(err));

    proc.stdin.write(items.join("\n"));
    proc.stdin.end();
  });
}

module.exports = { checkFzf, runFzf, getFzfBinary };
