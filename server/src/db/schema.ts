import { serial, integer, boolean, pgTable, timestamp } from 'drizzle-orm/pg-core';

export const timersTable = pgTable('timers', {
  id: serial('id').primaryKey(),
  remaining_seconds: integer('remaining_seconds').notNull(), // Remaining time in seconds
  is_running: boolean('is_running').notNull().default(false), // Whether timer is currently running
  started_at: timestamp('started_at'), // When timer was started (nullable)
  created_at: timestamp('created_at').defaultNow().notNull()
});

// TypeScript type for the table schema
export type Timer = typeof timersTable.$inferSelect; // For SELECT operations
export type NewTimer = typeof timersTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { timers: timersTable };