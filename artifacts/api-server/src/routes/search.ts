import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sourcesTable, sourceItemsTable } from "@workspace/db";
import { FzfSearchBody, FzfSearchResponse } from "@workspace/api-zod";
import { runFzf } from "../lib/fzf.js";

const router: IRouter = Router();

router.post("/search", async (req, res): Promise<void> => {
  const parsed = FzfSearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, sourceId, limit } = parsed.data;

  // Verify source exists
  const [source] = await db
    .select()
    .from(sourcesTable)
    .where(eq(sourcesTable.id, sourceId));

  if (!source) {
    res.status(404).json({ error: "Source not found" });
    return;
  }

  // Load all items for the source, ordered by position
  const items = await db
    .select({ text: sourceItemsTable.text })
    .from(sourceItemsTable)
    .where(eq(sourceItemsTable.sourceId, sourceId))
    .orderBy(sourceItemsTable.position);

  const texts = items.map((i) => i.text);

  const { results, elapsedMs } = await runFzf(texts, query, limit ?? 50);

  res.json(
    FzfSearchResponse.parse({
      results,
      query,
      total: results.length,
      elapsedMs,
    })
  );
});

export default router;
