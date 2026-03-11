import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, sourcesTable, sourceItemsTable } from "@workspace/db";
import {
  CreateSourceBody,
  DeleteSourceParams,
  ListSourcesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sources", async (_req, res): Promise<void> => {
  // Get sources with item counts
  const rows = await db
    .select({
      id: sourcesTable.id,
      name: sourcesTable.name,
      description: sourcesTable.description,
      createdAt: sourcesTable.createdAt,
      itemCount: count(sourceItemsTable.id),
    })
    .from(sourcesTable)
    .leftJoin(sourceItemsTable, eq(sourceItemsTable.sourceId, sourcesTable.id))
    .groupBy(sourcesTable.id)
    .orderBy(sourcesTable.createdAt);

  res.json(ListSourcesResponse.parse({ sources: rows }));
});

router.post("/sources", async (req, res): Promise<void> => {
  const parsed = CreateSourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, description, items } = parsed.data;

  // Insert source and items in a transaction
  const result = await db.transaction(async (tx) => {
    const [source] = await tx
      .insert(sourcesTable)
      .values({ name, description: description ?? null })
      .returning();

    if (items.length > 0) {
      await tx.insert(sourceItemsTable).values(
        items.map((text, position) => ({
          sourceId: source.id,
          text,
          position,
        }))
      );
    }

    return source;
  });

  res.status(201).json({
    id: result.id,
    name: result.name,
    description: result.description,
    itemCount: items.length,
    createdAt: result.createdAt,
  });
});

router.delete("/sources/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteSourceParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(sourcesTable)
    .where(eq(sourcesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Source not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
