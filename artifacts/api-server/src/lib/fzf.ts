import { spawn } from "child_process";

export interface FzfResult {
  text: string;
  score: number;
  index: number;
}

/**
 * Run fzf as a subprocess for fast fuzzy matching.
 * fzf is used in --filter mode (non-interactive) for speed.
 */
export async function runFzf(
  items: string[],
  query: string,
  limit: number = 50
): Promise<{ results: FzfResult[]; elapsedMs: number }> {
  const start = performance.now();

  if (!query.trim()) {
    // No query — return items as-is up to limit with score 0
    const results = items.slice(0, limit).map((text, index) => ({
      text,
      score: 0,
      index,
    }));
    return { results, elapsedMs: performance.now() - start };
  }

  return new Promise((resolve, reject) => {
    // Use fzf --filter for non-interactive mode + --no-sort to keep fzf's own ranking
    // --with-nth=1 to only match on the text, not internal indices
    const fzf = spawn("fzf", [
      "--filter", query,
      "--no-sort",
      "--ansi",
    ]);

    let stdout = "";
    let stderr = "";

    fzf.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    fzf.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    fzf.on("close", (code) => {
      // fzf exits with 1 when no matches found — that's not an error for us
      if (code !== 0 && code !== 1) {
        reject(new Error(`fzf exited with code ${code}: ${stderr}`));
        return;
      }

      const elapsed = performance.now() - start;
      const matched = stdout
        .split("\n")
        .filter((line) => line.length > 0)
        .slice(0, limit);

      // Build a map from text to original index
      const textToIndex = new Map<string, number>();
      items.forEach((item, i) => {
        if (!textToIndex.has(item)) {
          textToIndex.set(item, i);
        }
      });

      // Score descends from matched.length (fzf returns best matches first)
      const results: FzfResult[] = matched.map((text, rank) => ({
        text,
        score: matched.length - rank,
        index: textToIndex.get(text) ?? -1,
      }));

      resolve({ results, elapsedMs: elapsed });
    });

    fzf.on("error", (err) => {
      reject(err);
    });

    // Write all items to fzf's stdin
    const input = items.join("\n");
    fzf.stdin.write(input);
    fzf.stdin.end();
  });
}
