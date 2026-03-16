const fs = require("fs");
const path = require("path");

const DEFAULT_IGNORES = new Set([".git", "node_modules"]);

function shouldSkipEntry(name, includeHidden) {
  if (!includeHidden && name.startsWith(".")) return true;
  if (!includeHidden && DEFAULT_IGNORES.has(name)) return true;
  return false;
}

async function scanDir(root, options = {}) {
  const {
    includeFiles = true,
    includeDirs = true,
    includeHidden = false,
    maxDepth = Infinity,
  } = options;

  const rootAbs = path.resolve(root);
  const results = [];

  async function walk(current, depth) {
    let entries;
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch (err) {
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (shouldSkipEntry(entry.name, includeHidden)) continue;
      if (entry.isSymbolicLink()) continue;

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (includeDirs) results.push(fullPath);
        if (depth < maxDepth) {
          await walk(fullPath, depth + 1);
        }
      } else if (entry.isFile()) {
        if (includeFiles) results.push(fullPath);
      }
    }
  }

  await walk(rootAbs, 0);
  return results;
}

module.exports = { scanDir };
