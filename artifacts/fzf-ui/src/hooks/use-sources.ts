import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

// Schemas based on API definition
export const SourceSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  description: z.string().optional(),
  itemCount: z.coerce.number(),
  createdAt: z.string(),
});

export const SourcesResponseSchema = z.object({
  sources: z.array(SourceSchema),
});

export type Source = z.infer<typeof SourceSchema>;

export function useSources() {
  return useQuery({
    queryKey: ["/api/sources"],
    queryFn: async () => {
      const res = await fetch("/api/sources");
      if (!res.ok) throw new Error("Failed to fetch sources");
      const data = await res.json();
      const parsed = SourcesResponseSchema.safeParse(data);
      if (!parsed.success) {
        console.error("Sources parsing error", parsed.error);
        throw new Error("Invalid sources data format");
      }
      return parsed.data;
    },
  });
}

export function useCreateSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; items: string[] }) => {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create source");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
    },
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sources/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete source");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
    },
  });
}
