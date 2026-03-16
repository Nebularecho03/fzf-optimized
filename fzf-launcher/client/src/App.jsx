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
  const selected = results[selectedIdx];

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
                  <span className="result-text" title={r.text}>
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
          {selected?.text && (
            <span className="selected-path" title={selected.text}>
              {selected.text}
            </span>
          )}
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
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [dirPath, setDirPath] = useState("");
  const [dirName, setDirName] = useState("");
  const [dirDesc, setDirDesc] = useState("");
  const [includeFiles, setIncludeFiles] = useState(true);
  const [includeDirs, setIncludeDirs] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [creatingDir, setCreatingDir] = useState(false);
  const [showDirForm, setShowDirForm] = useState(false);
  const [dirError, setDirError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;
    const items = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (items.length === 0) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined, items }),
      });
      if (!res.ok) throw new Error("Failed to create");
      setName(""); setDesc(""); setText(""); setShowForm(false);
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

  const handleCreateDir = async (e) => {
    e.preventDefault();
    if (!dirPath.trim()) return;
    if (!includeFiles && !includeDirs) {
      setDirError("Select files or folders to index.");
      return;
    }
    setCreatingDir(true);
    setDirError("");
    try {
      const payload = {
        dir: dirPath.trim(),
        name: dirName.trim() || undefined,
        description: dirDesc.trim() || undefined,
        includeFiles,
        includeDirs,
        includeHidden,
      };
      const res = await fetch(`${API}/sources/dir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create directory source");
      }
      setDirPath("");
      setDirName("");
      setDirDesc("");
      setIncludeFiles(true);
      setIncludeDirs(true);
      setIncludeHidden(false);
      setShowDirForm(false);
      onRefresh();
    } catch (err) {
      setDirError(err.message);
    } finally {
      setCreatingDir(false);
    }
  };

  return (
    <div className="sources-page">
      <div className="sources-header">
        <h2>Sources</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-primary" onClick={() => setShowForm((p) => !p)}>
            {showForm ? "Cancel" : "+ New Source"}
          </button>
          <button className="btn-primary" onClick={() => setShowDirForm((p) => !p)}>
            {showDirForm ? "Cancel" : "+ Add Directory"}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="source-form" onSubmit={handleCreate}>
          <input
            className="form-input"
            placeholder="Source name (e.g. Git Commands)"
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
          <textarea
            className="form-textarea"
            placeholder={"One item per line:\ngit status\ngit log --oneline\ngit diff HEAD\n..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            required
          />
          {error && <p className="form-error">{error}</p>}
          <div className="form-row">
            <span className="item-preview">
              {text ? `${text.split("\n").filter((l) => l.trim()).length} items` : ""}
            </span>
            <button className="btn-primary" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Source"}
            </button>
          </div>
        </form>
      )}

      {showDirForm && (
        <form className="source-form" onSubmit={handleCreateDir}>
          <input
            className="form-input"
            placeholder="Directory path (e.g. /home/me/projects or C:\\Users\\me\\Documents)"
            value={dirPath}
            onChange={(e) => setDirPath(e.target.value)}
            required
          />
          <input
            className="form-input"
            placeholder="Source name (optional)"
            value={dirName}
            onChange={(e) => setDirName(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="Description (optional)"
            value={dirDesc}
            onChange={(e) => setDirDesc(e.target.value)}
          />
          <div className="form-options">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={includeFiles}
                onChange={(e) => setIncludeFiles(e.target.checked)}
              />
              Files
            </label>
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={includeDirs}
                onChange={(e) => setIncludeDirs(e.target.checked)}
              />
              Folders
            </label>
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={includeHidden}
                onChange={(e) => setIncludeHidden(e.target.checked)}
              />
              Include hidden
            </label>
          </div>
          {dirError && <p className="form-error">{dirError}</p>}
          <div className="form-row">
            <button className="btn-primary" type="submit" disabled={creatingDir}>
              {creatingDir ? "Indexing..." : "Create Directory Source"}
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
