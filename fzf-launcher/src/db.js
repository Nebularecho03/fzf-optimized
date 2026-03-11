const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(require("os").homedir(), ".fzf-launcher");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "data.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS source_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_items_source ON source_items(source_id, position);
`);

const stmts = {
  listSources: db.prepare(`
    SELECT s.id, s.name, s.description, s.created_at,
           COUNT(i.id) as item_count
    FROM sources s
    LEFT JOIN source_items i ON i.source_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at ASC
  `),

  getSource: db.prepare("SELECT * FROM sources WHERE id = ?"),

  createSource: db.prepare(
    "INSERT INTO sources (name, description) VALUES (?, ?) RETURNING *"
  ),

  deleteSource: db.prepare("DELETE FROM sources WHERE id = ?"),

  insertItem: db.prepare(
    "INSERT INTO source_items (source_id, text, position) VALUES (?, ?, ?)"
  ),

  getItems: db.prepare(
    "SELECT text FROM source_items WHERE source_id = ? ORDER BY position ASC"
  ),
};

function listSources() {
  return stmts.listSources.all();
}

function getSource(id) {
  return stmts.getSource.get(id);
}

const createSourceTx = db.transaction((name, description, items) => {
  const [source] = stmts.createSource.all(name, description ?? null);
  for (let i = 0; i < items.length; i++) {
    stmts.insertItem.run(source.id, items[i], i);
  }
  return { ...source, item_count: items.length };
});

function createSource(name, description, items) {
  return createSourceTx(name, description, items);
}

function deleteSource(id) {
  const info = stmts.deleteSource.run(id);
  return info.changes > 0;
}

function getItems(sourceId) {
  return stmts.getItems.all(sourceId).map((r) => r.text);
}

module.exports = { listSources, getSource, createSource, deleteSource, getItems };
