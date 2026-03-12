import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const API = "/api";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function HighlightMatch({ text, query }) {
  if (!query) return <span>{text}</span>;
  const parts = [];
  let ti = 0, qi = 0;
  const tl = text.toLowerCase(), ql = query.toLowerCase();
  while (ti < text.length) {
    if (qi < ql.length && tl[ti] === ql[qi]) {
      parts.push(<span key={ti} className="match-char">{text[ti]}</span>);
      qi++;
    } else {
      parts.push(<span key={ti} className="dim-char">{text[ti]}</span>);
    }
    ti++;
  }
  return <>{parts}</>;
}

function Finder({ sources }) {
  const [sourceId, setSourceId] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [elapsedMs, setElapsedMs] = useState(null);
  const [total, setTotal] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debouncedQuery = useDebounce(query, 80);

  useEffect(() => {
    if (sources.length > 0 && sourceId === null) {
      setSourceId(sources[0].id);
    }
  }, [sources, sourceId]);

  useEffect(() => {
    if (!debouncedQuery || sourceId === null) {
      setResults([]);
      setElapsedMs(null);
      setTotal(0);
      return;
    }
    setLoading(true);
    fetch(`${API}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: debouncedQuery, sourceId, limit: 200 }),
    })
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setElapsedMs(data.elapsedMs);
        setTotal(data.total || 0);
        setSelectedIdx(0);
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery, sourceId]);

  const copyItem = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((p) => Math.min(p + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((p) => Math.max(p - 1, 0));
      }
      if (e.key === "Enter" && results[selectedIdx]) {
        copyItem(results[selectedIdx].text);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [results, selectedIdx, copyItem]);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIdx];
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIdx]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const activeSource = sources.find((s) => s.id === sourceId);

  return (
    <div className="finder">
      <div className="source-bar">
        <span className="source-label">TARGET</span>
        <div className="source-tabs">
          {sources.map((s) => (
            <button
              key={s.id}
              className={`source-tab ${s.id === sourceId ? "active" : ""}`}
              onClick={() => { setSourceId(s.id); setQuery(""); inputRef.current?.focus(); }}
            >
              {s.name} <span className="source-count">{s.item_count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="search-area">
        <div className="search-box">
          <span className="prompt">›</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="type to fuzzy find..."
            autoComplete="off"
            spellCheck="false"
            className="search-input"
          />
          {loading && <span className="spinner" />}
          <kbd className="shortcut">Ctrl K</kbd>
        </div>

        <div className="results-box">
          {!debouncedQuery ? (
            <div className="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <p>Enter a query to start fuzzy searching</p>
              <p className="hint">↑↓ navigate · Enter copy · Ctrl+K focus</p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="empty-state">
              <p className="no-results">0 matches for "{debouncedQuery}"</p>
            </div>
          ) : (
            <div ref={listRef} className="result-list">
              {results.map((r, i) => (
                <div
                  key={`${r.index}-${r.text}`}
                  className={`result-item ${i === selectedIdx ? "selected" : ""}`}
                  onMouseEnter={() => setSelectedIdx(i)}
                  onClick={() => copyItem(r.text)}
                >
                  <span className="result-idx">{r.index}</span>
                  <span className="result-text">
                    <HighlightMatch text={r.text} query={debouncedQuery} />
                  </span>
                  {copied === r.text && <span className="copied-badge">✓ copied</span>}
                  {i === selectedIdx && copied !== r.text && (
                    <span className="enter-hint">Enter to copy</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="status-bar">
          <span>{activeSource?.item_count ?? 0} items in source</span>
          {debouncedQuery && <span className="match-count">{total} matches</span>}
          {elapsedMs !== null && debouncedQuery && (
            <span className="elapsed">fzf · {elapsedMs.toFixed(1)}ms</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Sources({ sources, onRefresh }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState("paste"); // "paste" | "file" | "folder" | "path"
  const [localPath, setLocalPath] = useState("");
  const [recursive, setRecursive] = useState(true);
  const [fileLabel, setFileLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setName(""); setDesc(""); setText(""); setMode("paste");
    setLocalPath(""); setFileLabel(""); setError("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileLabel(file.name);
    if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target.result);
    reader.readAsText(file);
  };

  const handleFolderChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const paths = [];
    for (let i = 0; i < files.length; i++) {
      paths.push(files[i].webkitRelativePath || files[i].name);
    }
    paths.sort();
    const folderName = paths[0]?.split("/")[0] || "folder";
    setFileLabel(`${folderName}/ — ${paths.length} files`);
    if (!name) setName(folderName);
    setText(paths.join("\n"));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      if (mode === "path") {
        if (!localPath.trim() || !name.trim()) throw new Error("Name and path are required");
        const res = await fetch(`${API}/sources/from-path`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetPath: localPath.trim(),
            name: name.trim(),
            description: desc.trim() || undefined,
            recursive,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create");
      } else {
        if (!name.trim() || !text.trim()) throw new Error("Name and items are required");
        const items = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (items.length === 0) throw new Error("No items found");
        const res = await fetch(`${API}/sources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined, items }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create");
      }

      resetForm();
      setShowForm(false);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this source?")) return;
    await fetch(`${API}/sources/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const itemCount = text.split("\n").filter((l) => l.trim()).length;

  return (
    <div className="sources-page">
      <div className="sources-header">
        <h2>Sources</h2>
        <button className="btn-primary" onClick={() => { setShowForm((p) => !p); if (showForm) resetForm(); }}>
          {showForm ? "Cancel" : "+ New Source"}
        </button>
      </div>

      {showForm && (
        <form className="source-form" onSubmit={handleCreate}>
          <input
            className="form-input"
            placeholder="Source name (e.g. My Project Files)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="form-input"
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          <div className="mode-tabs">
            {[
              { id: "paste", label: "✏️ Paste" },
              { id: "file",  label: "📄 File" },
              { id: "folder", label: "📁 Folder" },
              { id: "path",  label: "🖥️ Local Path" },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`mode-tab ${mode === id ? "active" : ""}`}
                onClick={() => { setMode(id); setText(""); setFileLabel(""); setError(""); }}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "paste" && (
            <textarea
              className="form-textarea"
              placeholder={"One item per line:\ngit status\ngit log --oneline\ngit diff HEAD\n..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              required
            />
          )}

          {mode === "file" && (
            <div className="file-drop-zone">
              <label className="file-label-btn">
                {fileLabel || "Click to choose a text file (.txt, .csv, .log, ...)"}
                <input
                  type="file"
                  accept=".txt,.csv,.log,.tsv,.md,.json,.yaml,.yml,.sh,.conf,.ini,.env,.list"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </label>
              {text && (
                <textarea
                  className="form-textarea preview-readonly"
                  readOnly
                  value={text}
                  rows={5}
                />
              )}
            </div>
          )}

          {mode === "folder" && (
            <div className="file-drop-zone">
              <label className="file-label-btn">
                {fileLabel || "Click to choose a folder"}
                <input
                  type="file"
                  webkitdirectory=""
                  directory=""
                  style={{ display: "none" }}
                  onChange={handleFolderChange}
                />
              </label>
              {text && (
                <textarea
                  className="form-textarea preview-readonly"
                  readOnly
                  value={text}
                  rows={5}
                />
              )}
            </div>
          )}

          {mode === "path" && (
            <div className="path-mode">
              <p className="path-hint">
                Enter a local file or folder path. The server will read it directly from your filesystem.
              </p>
              <input
                className="form-input"
                placeholder={process.platform === "win32" ? "C:\\Users\\you\\projects\\myapp" : "/home/you/projects/myapp"}
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                required
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={recursive}
                  onChange={(e) => setRecursive(e.target.checked)}
                />
                Recurse into subdirectories
              </label>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="form-row">
            <span className="item-preview">
              {mode !== "path" && itemCount > 0 ? `${itemCount} items` : ""}
              {mode === "path" && localPath ? `→ ${localPath}` : ""}
            </span>
            <button
              className="btn-primary"
              type="submit"
              disabled={creating || (mode !== "path" && itemCount === 0 && !localPath)}
            >
              {creating ? "Importing..." : "Create Source"}
            </button>
          </div>
        </form>
      )}

      {sources.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "3rem" }}>
          <p>No sources yet. Create one above to start searching.</p>
        </div>
      ) : (
        <div className="source-list">
          {sources.map((s) => (
            <div key={s.id} className="source-card">
              <div className="source-info">
                <div className="source-name">{s.name}</div>
                {s.description && <div className="source-desc">{s.description}</div>}
                <div className="source-meta">{s.item_count} items · added {new Date(s.created_at).toLocaleDateString()}</div>
              </div>
              <button className="btn-danger" onClick={() => handleDelete(s.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("finder");
  const [sources, setSources] = useState([]);
  const [status, setStatus] = useState(null);

  const loadSources = useCallback(() => {
    fetch(`${API}/sources`)
      .then((r) => r.json())
      .then((d) => setSources(d.sources || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSources();
    fetch(`${API}/status`)
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, [loadSources]);

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          FZF.UI
        </div>
        <button className={`nav-item ${page === "finder" ? "active" : ""}`} onClick={() => setPage("finder")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Finder
        </button>
        <button className={`nav-item ${page === "sources" ? "active" : ""}`} onClick={() => setPage("sources")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
          Sources
        </button>
        {status && (
          <div className="sidebar-status">
            <span className={`status-dot ${status.fzf ? "ok" : "err"}`} />
            fzf {status.fzf ? status.fzfVersion : "not found"}
          </div>
        )}
      </nav>
      <main className="content">
        {page === "finder" && <Finder sources={sources} />}
        {page === "sources" && <Sources sources={sources} onRefresh={loadSources} />}
      </main>
    </div>
  );
}
