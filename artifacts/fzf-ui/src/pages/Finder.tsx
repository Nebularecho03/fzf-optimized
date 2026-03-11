import { useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { Search, Command, ChevronRight, FileX, Loader2, Database } from "lucide-react";
import { useSources } from "@/hooks/use-sources";
import { useFzfSearch } from "@/hooks/use-search";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

// Helper to highlight matching chars in terminal style
function FuzzyHighlight({ text, query }: { text: string; query: string }) {
  if (!query) return <span className="opacity-90">{text}</span>;
  
  const parts = [];
  let textIdx = 0;
  let queryIdx = 0;
  const qLower = query.toLowerCase();
  const tLower = text.toLowerCase();

  while (textIdx < text.length) {
    if (queryIdx < qLower.length && tLower[textIdx] === qLower[queryIdx]) {
      parts.push(
        <span key={textIdx} className="text-primary font-bold drop-shadow-[0_0_2px_hsl(var(--primary)/0.8)]">
          {text[textIdx]}
        </span>
      );
      queryIdx++;
    } else {
      parts.push(
        <span key={textIdx} className="opacity-60">
          {text[textIdx]}
        </span>
      );
    }
    textIdx++;
  }
  return <>{parts}</>;
}

export default function Finder() {
  const { data: sourcesData, isLoading: sourcesLoading } = useSources();
  const sources = sourcesData?.sources || [];
  
  const [activeSourceId, setActiveSourceId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 100);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { mutate: search, data: searchData, isPending: searchLoading } = useFzfSearch();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-select first source if none selected
  useEffect(() => {
    if (sources.length > 0 && activeSourceId === null) {
      setActiveSourceId(sources[0].id);
    }
  }, [sources, activeSourceId]);

  // Trigger search when debounced query or source changes
  useEffect(() => {
    if (activeSourceId !== null && debouncedQuery) {
      search({ query: debouncedQuery, sourceId: activeSourceId, limit: 100 });
      setSelectedIndex(0); // Reset selection on new search
    }
  }, [debouncedQuery, activeSourceId, search]);

  const results = debouncedQuery ? (searchData?.results || []) : [];

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!results.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          navigator.clipboard.writeText(selected.text);
          toast({
            title: "Copied to clipboard",
            description: selected.text,
            duration: 2000,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [results, selectedIndex, toast]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    
    // Global hotkey to focus search (Cmd+K / Ctrl+K)
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  if (sourcesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
          <Database className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold font-mono mb-2">No Sources Configured</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          FZF needs data to search through. Create a source first by providing a list of text items.
        </p>
        <Link href="/sources" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Manage Sources
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[100vh] bg-background">
      {/* Top Bar / Source Selector */}
      <div className="h-14 border-b border-white/5 flex items-center px-6 gap-4 shrink-0 bg-card/30">
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Target:</span>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {sources.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveSourceId(s.id); setQuery(""); inputRef.current?.focus(); }}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-mono transition-colors whitespace-nowrap",
                activeSourceId === s.id 
                  ? "bg-primary/20 text-primary border border-primary/30" 
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
              )}
            >
              {s.name} <span className="opacity-50 text-xs ml-1">({s.itemCount})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Search Area */}
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 md:p-8 overflow-hidden">
        
        {/* Search Input Container */}
        <div className="relative shrink-0 mb-6 group">
          <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full transition-opacity opacity-0 group-focus-within:opacity-100" />
          <div className="relative flex items-center bg-card border border-white/10 rounded-xl px-4 py-4 terminal-shadow focus-within:border-primary/50 transition-colors">
            <ChevronRight className="w-6 h-6 text-primary shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to fuzzy find..."
              className="flex-1 bg-transparent border-none outline-none text-xl md:text-3xl font-mono text-foreground placeholder:text-muted-foreground/30 focus:ring-0"
              spellCheck={false}
              autoComplete="off"
            />
            {searchLoading && debouncedQuery && (
              <Loader2 className="w-5 h-5 animate-spin text-primary ml-4 shrink-0" />
            )}
            <div className="hidden md:flex items-center gap-1.5 ml-4 shrink-0 px-2 py-1 rounded bg-muted/50 text-xs text-muted-foreground font-mono">
              <Command className="w-3 h-3" /> K
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto glass-panel rounded-xl flex flex-col relative">
          {!debouncedQuery ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40 font-mono">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p>Enter query to initiate fzf search</p>
            </div>
          ) : results.length === 0 && !searchLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50 font-mono">
              <FileX className="w-12 h-12 mb-4 opacity-30" />
              <p>0 matches found</p>
            </div>
          ) : (
            <div ref={listRef} className="py-2 px-2 flex-1">
              <AnimatePresence initial={false}>
                {results.map((res, idx) => {
                  const isActive = idx === selectedIndex;
                  return (
                    <motion.div
                      key={`${res.index}-${res.text}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.3) }}
                      className={cn(
                         "flex items-center gap-4 px-4 py-3 rounded-lg font-mono text-sm md:text-base cursor-pointer transition-all",
                         isActive 
                          ? "bg-primary/15 border-l-2 border-primary text-foreground shadow-[inset_0_0_20px_hsl(var(--primary)/0.05)]" 
                          : "border-l-2 border-transparent text-muted-foreground hover:bg-white/5"
                      )}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        navigator.clipboard.writeText(res.text);
                        toast({ title: "Copied!", description: res.text });
                      }}
                    >
                      <div className="w-8 text-right opacity-30 text-xs shrink-0">{res.index}</div>
                      <div className="flex-1 truncate">
                        <FuzzyHighlight text={res.text} query={debouncedQuery} />
                      </div>
                      {isActive && (
                         <div className="flex items-center gap-2 text-primary text-xs shrink-0 animate-in fade-in slide-in-from-right-4">
                           <span>Enter to copy</span>
                           <Command className="w-3 h-3" />
                         </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-10 mt-4 flex items-center justify-between text-xs font-mono text-muted-foreground/60 px-2 shrink-0">
           <div className="flex items-center gap-4">
             <span>{sources.find(s => s.id === activeSourceId)?.itemCount || 0} items in source</span>
             {debouncedQuery && (
               <span className="text-primary/70">{searchData?.total || 0} matches</span>
             )}
           </div>
           {debouncedQuery && searchData?.elapsedMs !== undefined && (
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
               fzf engine • {searchData.elapsedMs.toFixed(2)}ms
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
