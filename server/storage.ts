import { 
  users, type User, type InsertUser,
  gameHistory, type GameHistory, type InsertGameHistory,
  diceSettings, type DiceSettings, type InsertDiceSettings,
  crashSettings, type CrashSettings, type InsertCrashSettings
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, newBalance: number): Promise<User>;
  
  // Game history operations
  createGameHistory(history: InsertGameHistory): Promise<GameHistory>;
  getGameHistoryByUser(userId: number): Promise<GameHistory[]>;
  
  // Dice settings operations
  getDiceSettings(userId: number): Promise<DiceSettings | undefined>;
  createOrUpdateDiceSettings(settings: InsertDiceSettings): Promise<DiceSettings>;
  
  // Crash settings operations
  getCrashSettings(userId: number): Promise<CrashSettings | undefined>;
  createOrUpdateCrashSettings(settings: InsertCrashSettings): Promise<CrashSettings>;
  
  // Session store
  sessionStore: any;
}

// PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results.length > 0 ? results[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results.length > 0 ? results[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...insertUser,
      balance: "1000", // Initial balance
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async updateUserBalance(userId: number, newBalance: number): Promise<User> {
    const result = await db.update(users)
      .set({ balance: newBalance.toString() })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User not found");
    }
    
    return result[0];
  }

  // Game history methods
  async createGameHistory(insertHistory: InsertGameHistory): Promise<GameHistory> {
    const result = await db.insert(gameHistory).values({
      ...insertHistory,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getGameHistoryByUser(userId: number): Promise<GameHistory[]> {
    return await db.select()
      .from(gameHistory)
      .where(eq(gameHistory.userId, userId))
      .orderBy(gameHistory.createdAt);
  }

  // Dice settings methods
  async getDiceSettings(userId: number): Promise<DiceSettings | undefined> {
    const results = await db.select()
      .from(diceSettings)
      .where(eq(diceSettings.userId, userId));
    
    return results.length > 0 ? results[0] : undefined;
  }

  async createOrUpdateDiceSettings(insertSettings: InsertDiceSettings): Promise<DiceSettings> {
    // Check if settings already exist
    const existingSettings = await this.getDiceSettings(insertSettings.userId);
    
    if (existingSettings) {
      // Update existing settings
      const result = await db.update(diceSettings)
        .set({ 
          targetNumber: insertSettings.targetNumber, 
          betType: insertSettings.betType, 
          betAmount: insertSettings.betAmount,
          maxBet: insertSettings.maxBet || "1000"
        })
        .where(eq(diceSettings.id, existingSettings.id))
        .returning();
      
      return result[0];
    } else {
      // Create new settings
      const result = await db.insert(diceSettings).values({
        ...insertSettings,
        maxBet: insertSettings.maxBet || "1000"
      }).returning();
      
      return result[0];
    }
  }

  // Crash settings methods
  async getCrashSettings(userId: number): Promise<CrashSettings | undefined> {
    const results = await db.select()
      .from(crashSettings)
      .where(eq(crashSettings.userId, userId));
    
    return results.length > 0 ? results[0] : undefined;
  }

  async createOrUpdateCrashSettings(insertSettings: InsertCrashSettings): Promise<CrashSettings> {
    // Check if settings already exist
    const existingSettings = await this.getCrashSettings(insertSettings.userId);
    
    if (existingSettings) {
      // Update existing settings
      const result = await db.update(crashSettings)
        .set({ 
          betAmount: insertSettings.betAmount, 
          autoCashoutMultiplier: insertSettings.autoCashoutMultiplier,
        })
        .where(eq(crashSettings.id, existingSettings.id))
        .returning();
      
      return result[0];
    } else {
      // Create new settings
      const result = await db.insert(crashSettings).values({
        ...insertSettings,
      }).returning();
      
      return result[0];
    }
  }
}

export const storage = new DatabaseStorage();
