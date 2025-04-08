import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("1000"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Game history model
export const gameHistory = pgTable("game_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gameType: text("game_type").notNull(), // "dice", "crash", "poker"
  betAmount: decimal("bet_amount", { precision: 10, scale: 2 }).notNull(),
  outcome: text("outcome").notNull(), // win/loss or specific game outcome
  winAmount: decimal("win_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGameHistorySchema = createInsertSchema(gameHistory).omit({
  id: true,
  createdAt: true
});

// Dice game settings
export const diceSettings = pgTable("dice_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  targetNumber: integer("target_number").notNull().default(50),
  betType: text("bet_type").notNull().default("over"), // "over" or "under"
  betAmount: decimal("bet_amount", { precision: 10, scale: 2 }).notNull(),
  maxBet: decimal("max_bet", { precision: 10, scale: 2 }).notNull().default("1000"),
});

export const insertDiceSettingsSchema = createInsertSchema(diceSettings).omit({
  id: true
});

// Crash game settings
export const crashSettings = pgTable("crash_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  betAmount: decimal("bet_amount", { precision: 10, scale: 2 }).notNull(),
  autoCashoutMultiplier: decimal("auto_cashout_multiplier", { precision: 10, scale: 2 }),
});

export const insertCrashSettingsSchema = createInsertSchema(crashSettings).omit({
  id: true
});

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGameHistory = z.infer<typeof insertGameHistorySchema>;
export type GameHistory = typeof gameHistory.$inferSelect;

export type InsertDiceSettings = z.infer<typeof insertDiceSettingsSchema>;
export type DiceSettings = typeof diceSettings.$inferSelect;

export type InsertCrashSettings = z.infer<typeof insertCrashSettingsSchema>;
export type CrashSettings = typeof crashSettings.$inferSelect;
