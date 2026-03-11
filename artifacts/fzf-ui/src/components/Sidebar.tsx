import { Link, useLocation } from "wouter";
import { Terminal, Database, Settings, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Search, label: "Finder" },
    { href: "/sources", icon: Database, label: "Sources" },
  ];

  return (
    <aside className="w-16 md:w-64 border-r border-border bg-card/50 flex flex-col items-center md:items-stretch py-6 shrink-0 z-10 transition-all duration-300">
      <div className="flex items-center gap-3 px-0 md:px-6 mb-10 text-primary">
        <Terminal className="w-8 h-8 drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
        <span className="font-bold font-mono text-xl tracking-tight hidden md:block">FZF<span className="text-muted-foreground/50">.</span>UI</span>
      </div>

      <nav className="flex-1 w-full px-2 md:px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_hsl(var(--primary))] animate-in fade-in zoom-in" />
              )}
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden md:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="px-2 md:px-4 mt-auto">
        <button className="w-full flex items-center justify-center md:justify-start gap-3 px-3 py-3 rounded-xl text-muted-foreground hover:bg-white/5 transition-all">
          <Settings className="w-5 h-5" />
          <span className="hidden md:block">Settings</span>
        </button>
      </div>
    </aside>
  );
}
