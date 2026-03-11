import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

export const SearchResultSchema = z.object({
  text: z.string(),
  score: z.coerce.number(),
  index: z.coerce.number(),
});

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  query: z.string(),
  total: z.coerce.number(),
  elapsedMs: z.coerce.number(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export function useFzfSearch() {
  return useMutation({
    mutationFn: async (data: { query: string; sourceId: number; limit?: number }) => {
      if (!data.query) {
        return { results: [], query: "", total: 0, elapsedMs: 0 };
      }
      
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      const parsed = SearchResponseSchema.safeParse(json);
      
      if (!parsed.success) {
        console.error("Search response parsing error", parsed.error);
        throw new Error("Invalid search response format");
      }
      return parsed.data;
    },
  });
}
