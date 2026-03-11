import { Link } from "wouter";
import { Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center font-mono">
      <div className="text-primary mb-6 animate-pulse">
        <Terminal className="w-20 h-20" />
      </div>
      <h1 className="text-4xl md:text-6xl font-bold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Process terminated. Route not found.</p>
      <Link href="/" className="px-6 py-3 bg-card border border-white/10 hover:border-primary/50 hover:bg-primary/5 rounded-lg text-foreground transition-all">
        Return to Finder
      </Link>
    </div>
  );
}
