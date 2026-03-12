import { useState, useRef } from "react";
import { Plus, Trash2, Database, AlertCircle, FileText, Calendar, Upload, FolderOpen, AlignLeft } from "lucide-react";
import { format } from "date-fns";
import { useSources, useCreateSource, useDeleteSource } from "@/hooks/use-sources";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

type InputMode = "paste" | "file" | "folder";

export default function Sources() {
  const { data, isLoading } = useSources();
  const { mutate: deleteSource, isPending: isDeleting } = useDeleteSource();
  const { mutate: createSource, isPending: isCreating } = useCreateSource();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<InputMode>("paste");
  const [formData, setFormData] = useState({ name: "", description: "", textBlob: "" });
  const [fileLabel, setFileLabel] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const sources = data?.sources || [];

  const resetForm = () => {
    setFormData({ name: "", description: "", textBlob: "" });
    setFileLabel("");
    setMode("paste");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileLabel(file.name);
    if (!formData.name) setFormData(f => ({ ...f, name: file.name.replace(/\.[^.]+$/, "") }));
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setFormData(f => ({ ...f, textBlob: text }));
    };
    reader.readAsText(file);
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      paths.push((f as any).webkitRelativePath || f.name);
    }
    paths.sort();
    const folderName = paths[0]?.split("/")[0] || "folder";
    setFileLabel(`${folderName}/ — ${paths.length} files`);
    if (!formData.name) setFormData(f => ({ ...f, name: folderName }));
    setFormData(f => ({ ...f, textBlob: paths.join("\n") }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const items = formData.textBlob
      .split("\n")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (!formData.name || items.length === 0) {
      toast({ title: "Validation Error", description: "Name and at least one item required.", variant: "destructive" });
      return;
    }

    createSource(
      { name: formData.name, description: formData.description, items },
      {
        onSuccess: () => {
          toast({ title: "Source Created", description: `Added ${items.length} items.` });
          setIsOpen(false);
          resetForm();
        }
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const itemCount = formData.textBlob.split("\n").filter(s => s.trim()).length;

  const modeBtn = (m: InputMode, label: string, Icon: React.ElementType) => (
    <button
      type="button"
      onClick={() => { setMode(m); setFormData(f => ({ ...f, textBlob: "" })); setFileLabel(""); }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
        mode === m
          ? "bg-primary text-primary-foreground"
          : "bg-black/20 text-muted-foreground hover:text-foreground hover:bg-white/5"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-background p-6 md:p-10">
      <div className="max-w-6xl w-full mx-auto">

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold font-mono flex items-center gap-3">
              <Database className="w-8 h-8 text-primary" />
              Data Sources
            </h1>
            <p className="text-muted-foreground mt-2 font-mono text-sm">Manage the datasets available for fuzzy searching.</p>
          </div>

          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-mono">
                <Plus className="w-4 h-4" /> Add Source
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-[620px] terminal-shadow">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle className="font-mono text-xl">Create New Source</DialogTitle>
                  <DialogDescription className="font-mono text-xs opacity-70">
                    Paste items, upload a text file, or import filenames from a folder.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-6 font-mono text-sm">
                  <div className="space-y-2">
                    <label className="text-muted-foreground">Identifier</label>
                    <input
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., linux_commands"
                      className="w-full bg-background border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-muted-foreground">Description (Optional)</label>
                    <input
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Common bash utilities"
                      className="w-full bg-background border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-muted-foreground">Input Mode</label>
                      <div className="flex gap-1">
                        {modeBtn("paste", "Paste", AlignLeft)}
                        {modeBtn("file", "File", Upload)}
                        {modeBtn("folder", "Folder", FolderOpen)}
                      </div>
                    </div>

                    {mode === "paste" && (
                      <textarea
                        required
                        value={formData.textBlob}
                        onChange={e => setFormData({ ...formData, textBlob: e.target.value })}
                        placeholder="/var/log/syslog&#10;sudo apt update&#10;git commit -m 'fix'"
                        className="w-full h-52 bg-background border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none no-scrollbar whitespace-nowrap overflow-x-auto leading-relaxed"
                      />
                    )}

                    {mode === "file" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground/70">
                          Pick a plain-text file (.txt, .csv, .log, etc.). Each line becomes a searchable item.
                        </p>
                        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                          <Upload className="w-8 h-8 text-muted-foreground/40 mb-2" />
                          {fileLabel
                            ? <span className="text-sm text-primary">{fileLabel}</span>
                            : <span className="text-sm text-muted-foreground">Click to choose a file</span>
                          }
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".txt,.csv,.log,.tsv,.md,.json,.yaml,.yml,.sh,.conf,.ini,.env,.list"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </label>
                        {formData.textBlob && (
                          <textarea
                            readOnly
                            value={formData.textBlob}
                            className="w-full h-28 bg-black/30 border border-white/5 rounded-md px-3 py-2 text-xs text-muted-foreground resize-none no-scrollbar overflow-x-auto whitespace-nowrap leading-relaxed"
                          />
                        )}
                      </div>
                    )}

                    {mode === "folder" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground/70">
                          Pick a folder — all file paths inside it become searchable items.
                        </p>
                        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                          <FolderOpen className="w-8 h-8 text-muted-foreground/40 mb-2" />
                          {fileLabel
                            ? <span className="text-sm text-primary">{fileLabel}</span>
                            : <span className="text-sm text-muted-foreground">Click to choose a folder</span>
                          }
                          <input
                            ref={folderInputRef}
                            type="file"
                            className="hidden"
                            {...({ webkitdirectory: "", directory: "" } as any)}
                            onChange={handleFolderChange}
                          />
                        </label>
                        {formData.textBlob && (
                          <textarea
                            readOnly
                            value={formData.textBlob}
                            className="w-full h-28 bg-black/30 border border-white/5 rounded-md px-3 py-2 text-xs text-muted-foreground resize-none no-scrollbar overflow-x-auto whitespace-nowrap leading-relaxed"
                          />
                        )}
                      </div>
                    )}

                    {itemCount > 0 && (
                      <p className="text-xs text-primary/70">
                        {itemCount.toLocaleString()} item{itemCount !== 1 ? "s" : ""} ready to index
                      </p>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                  <Button type="submit" disabled={isCreating || itemCount === 0}>
                    {isCreating ? "Indexing..." : "Save Index"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 glass-panel rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="glass-panel rounded-2xl p-16 flex flex-col items-center justify-center text-center border-dashed">
            <AlertCircle className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-mono font-medium mb-2">No datasets found</h3>
            <p className="text-muted-foreground max-w-sm mb-6">You haven't created any searchable data sources yet. Add one to start using the finder.</p>
            <Button onClick={() => setIsOpen(true)} variant="outline" className="font-mono border-dashed">
              Create First Source
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sources.map((source) => (
              <div
                key={source.id}
                className="glass-panel rounded-xl p-6 relative group hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.15)] flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-primary/10 p-3 rounded-lg text-primary">
                    <Database className="w-6 h-6" />
                  </div>
                  <button
                    onClick={() => handleDelete(source.id)}
                    disabled={isDeleting}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Delete source"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold font-mono text-foreground mb-1">{source.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 h-10">
                  {source.description || "No description provided."}
                </p>

                <div className="mt-auto space-y-2 text-xs font-mono text-muted-foreground/70 bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Lines Indexed:</span>
                    <span className="text-primary/90 font-bold">{source.itemCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Created:</span>
                    <span>{format(new Date(source.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this source? This cannot be undone.")) {
      deleteSource(id, {
        onSuccess: () => toast({ title: "Source Deleted" })
      });
    }
  }
}
