import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sourcesTable = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sourceItemsTable = pgTable("source_items", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => sourcesTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  position: integer("position").notNull(),
});

export const insertSourceSchema = createInsertSchema(sourcesTable).omit({ id: true, createdAt: true });
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Source = typeof sourcesTable.$inferSelect;

export const insertSourceItemSchema = createInsertSchema(sourceItemsTable).omit({ id: true });
export type InsertSourceItem = z.infer<typeof insertSourceItemSchema>;
export type SourceItem = typeof sourceItemsTable.$inferSelect;
