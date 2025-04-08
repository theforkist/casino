import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import * as crypto from "crypto";
import { CrashGame } from "./crash-game";
import { 
  insertGameHistorySchema, 
  insertDiceSettingsSchema, 
  insertCrashSettingsSchema 
} from "@shared/schema";

function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Game history routes
  app.get("/api/game-history", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const history = await storage.getGameHistoryByUser(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Error fetching game history" });
    }
  });

  app.post("/api/game-history", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const validatedData = insertGameHistorySchema.parse({
        ...req.body,
        userId
      });
      
      const result = await storage.createGameHistory(validatedData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Error creating game history" });
    }
  });

  // Dice game routes
  app.get("/api/dice-settings", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const settings = await storage.getDiceSettings(userId);
      if (settings) {
        res.json(settings);
      } else {
        // Default settings if none exist
        res.json({
          userId,
          targetNumber: 50,
          betType: "over",
          betAmount: "10.00",
          maxBet: "1000.00"
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching dice settings" });
    }
  });

  app.post("/api/dice-settings", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const validatedData = insertDiceSettingsSchema.parse({
        ...req.body,
        userId
      });
      
      const result = await storage.createOrUpdateDiceSettings(validatedData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Error updating dice settings" });
    }
  });

  app.post("/api/dice/play", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { betAmount, targetNumber, betType } = req.body;
      
      // Validate inputs
      const betAmountNum = parseFloat(betAmount);
      const targetNumberNum = parseInt(targetNumber);
      
      if (isNaN(betAmountNum) || betAmountNum <= 0) {
        return res.status(400).json({ message: "Invalid bet amount" });
      }
      
      if (isNaN(targetNumberNum) || targetNumberNum < 1 || targetNumberNum > 98) {
        return res.status(400).json({ message: "Target number must be between 1 and 98" });
      }
      
      if (betType !== "over" && betType !== "under") {
        return res.status(400).json({ message: "Bet type must be 'over' or 'under'" });
      }
      
      // Check if user has enough balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const balance = parseFloat(user.balance);
      if (balance < betAmountNum) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Get max bet from settings
      const settings = await storage.getDiceSettings(userId);
      const maxBet = settings ? parseFloat(settings.maxBet) : 1000;
      
      if (betAmountNum > maxBet) {
        return res.status(400).json({ message: `Maximum bet is ${maxBet}` });
      }
      
      // Roll the dice (1-100)
      const diceResult = Math.floor(Math.random() * 100) + 1;
      
      // Check if user won based on bet type
      let isWin = false;
      if (betType === "over") {
        isWin = diceResult > targetNumberNum;
      } else { // under
        isWin = diceResult < targetNumberNum;
      }
      
      // Calculate win chance and payout
      let winChance;
      if (betType === "over") {
        winChance = (100 - targetNumberNum) / 100;
      } else { // under
        winChance = targetNumberNum / 100;
      }
      
      const payout = 0.99 / winChance; // 99% RTP
      const winAmount = isWin ? betAmountNum * payout : 0;
      
      // Update user balance
      const newBalance = balance - betAmountNum + winAmount;
      await storage.updateUserBalance(userId, newBalance);
      
      // Save game history
      await storage.createGameHistory({
        userId,
        gameType: "dice",
        betAmount: betAmountNum.toString(),
        outcome: isWin ? `win (${betType} ${targetNumberNum})` : `loss (${betType} ${targetNumberNum})`,
        winAmount: winAmount.toString()
      });
      
      // Save updated dice settings
      await storage.createOrUpdateDiceSettings({
        userId,
        targetNumber: targetNumberNum,
        betType,
        betAmount: betAmountNum.toString(),
        maxBet: maxBet.toString()
      });
      
      res.json({
        diceResult,
        isWin,
        winAmount,
        newBalance,
        payout,
        winChance
      });
    } catch (error) {
      console.error("Dice game error:", error);
      res.status(500).json({ message: "Error playing dice game" });
    }
  });

  // Using the imported CrashGame class
  
  // New simplified crash game API
  app.get("/api/crash-settings", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const settings = await storage.getCrashSettings(userId);
      if (settings) {
        res.json(settings);
      } else {
        // Default settings if none exist
        res.json({
          userId,
          betAmount: "10.00",
          autoCashoutMultiplier: null
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching crash settings" });
    }
  });

  app.post("/api/crash-settings", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const validatedData = insertCrashSettingsSchema.parse({
        ...req.body,
        userId
      });
      
      const result = await storage.createOrUpdateCrashSettings(validatedData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Error updating crash settings" });
    }
  });

  // Single endpoint for crash game - much simpler
  app.post("/api/crash/game", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Extract action type and bet amount
      const { action, betAmount, cashoutMultiplier } = req.body;

      // Validate action
      if (!action || !["start", "cashout"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Handle different actions
      if (action === "start") {
        // Validate bet amount
        const betAmountNum = parseFloat(betAmount);
        if (isNaN(betAmountNum) || betAmountNum <= 0) {
          return res.status(400).json({ message: "Invalid bet amount" });
        }

        // Check balance
        const balance = parseFloat(user.balance);
        if (balance < betAmountNum) {
          return res.status(400).json({ message: "Insufficient balance" });
        }

        // Generate crash point
        const crashPoint = CrashGame.generateCrashPoint();

        // Deduct bet from balance
        const newBalance = balance - betAmountNum;
        await storage.updateUserBalance(userId, newBalance);

        // Return game data
        return res.json({
          result: "success",
          action: "start",
          crashPoint,
          betAmount: betAmountNum,
          newBalance
        });
      } 
      else if (action === "cashout") {
        // Validate required parameters
        const betAmountNum = parseFloat(betAmount);
        const cashoutMultiplierNum = parseFloat(cashoutMultiplier);
        const crashPointNum = parseFloat(req.body.crashPoint);

        if (isNaN(betAmountNum) || betAmountNum <= 0) {
          return res.status(400).json({ message: "Invalid bet amount" });
        }

        if (isNaN(cashoutMultiplierNum) || cashoutMultiplierNum < 1) {
          return res.status(400).json({ message: "Invalid cashout multiplier" });
        }

        if (isNaN(crashPointNum) || crashPointNum < 1) {
          return res.status(400).json({ message: "Invalid crash point" });
        }

        // Determine win/loss and amount
        const isWin = cashoutMultiplierNum <= crashPointNum;
        const winAmount = isWin ? betAmountNum * cashoutMultiplierNum : 0;

        // Update user balance
        const balance = parseFloat(user.balance);
        const newBalance = balance + winAmount;
        await storage.updateUserBalance(userId, newBalance);

        // Save game history
        await storage.createGameHistory({
          userId,
          gameType: "crash",
          betAmount: betAmountNum.toString(),
          outcome: isWin ? `win (${cashoutMultiplierNum.toFixed(2)}x)` : `loss (crashed at ${crashPointNum.toFixed(2)}x)`,
          winAmount: winAmount.toString()
        });

        // Save settings
        await storage.createOrUpdateCrashSettings({
          userId,
          betAmount: betAmountNum.toString(),
          autoCashoutMultiplier: isWin ? cashoutMultiplierNum.toString() : null
        });

        // Log and return result
        console.log(`Crash game cashout - User ${userId} ${isWin ? 'won' : 'lost'} with multiplier ${cashoutMultiplierNum.toFixed(3)}x (crash point: ${crashPointNum.toFixed(3)}x)`);

        return res.json({
          result: "success",
          action: "cashout",
          isWin,
          crashPoint: parseFloat(crashPointNum.toFixed(3)),
          cashoutMultiplier: parseFloat(cashoutMultiplierNum.toFixed(3)),
          winAmount,
          newBalance
        });
      }
    } catch (error) {
      console.error("Crash game error:", error);
      res.status(500).json({ message: "Error processing crash game request" });
    }
  });

  // Poker game routes
  app.post("/api/poker/play", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { betAmount, action } = req.body;
      
      // Validate inputs
      const betAmountNum = parseFloat(betAmount);
      
      if (isNaN(betAmountNum) || betAmountNum <= 0) {
        return res.status(400).json({ message: "Invalid bet amount" });
      }
      
      // Check if user has enough balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const balance = parseFloat(user.balance);
      if (balance < betAmountNum) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Simple poker game result
      const actions = ["fold", "call", "raise"];
      if (!actions.includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }
      
      // Simplified poker logic for demo
      let isWin = false;
      let winAmount = 0;
      let outcome = "";
      
      if (action === "fold") {
        isWin = false;
        outcome = "fold";
      } else {
        // Randomize win/loss for call and raise
        const random = Math.random();
        isWin = random > 0.6; // 40% win rate
        
        if (action === "call") {
          winAmount = isWin ? betAmountNum * 2 : 0;
          outcome = isWin ? "call (win)" : "call (loss)";
        } else { // raise
          winAmount = isWin ? betAmountNum * 3 : 0;
          outcome = isWin ? "raise (win)" : "raise (loss)";
        }
      }
      
      // Update user balance
      const newBalance = balance - betAmountNum + winAmount;
      await storage.updateUserBalance(userId, newBalance);
      
      // Save game history
      await storage.createGameHistory({
        userId,
        gameType: "poker",
        betAmount: betAmountNum.toString(),
        outcome,
        winAmount: winAmount.toString()
      });
      
      res.json({
        action,
        isWin,
        winAmount,
        newBalance
      });
    } catch (error) {
      res.status(500).json({ message: "Error playing poker game" });
    }
  });

  // Balance route
  app.post("/api/update-balance", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { amount } = req.body;
      const amountNum = parseFloat(amount);
      
      if (isNaN(amountNum)) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentBalance = parseFloat(user.balance);
      const newBalance = currentBalance + amountNum;
      
      if (newBalance < 0) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      const updatedUser = await storage.updateUserBalance(userId, newBalance);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating balance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate a crash point for the crash game using cryptographic randomness
function generateCrashPoint(): number {
  // Simple, proven approach for generating a crash point with a house edge
  const min = 1.01;  // Minimum crash point
  const max = 10.00; // Maximum crash point
  
  // Get 4 random bytes and convert to a float between 0 and 1
  const randomBytes = crypto.randomBytes(4);
  const randomFloat = randomBytes.readUInt32BE(0) / 0xFFFFFFFF;
  
  // Log the random value to verify it's working
  console.log(`Random float generated: ${randomFloat}`);
  
  // Using a simpler calculation that always produces valid crash points
  // We're using Math.random() as a fallback in case crypto has issues
  const r = randomFloat || Math.random();
  
  // This formula creates a distribution with a house edge
  // The 0.99 factor creates the house edge (1% edge)
  const crashPoint = 0.99 / (1.0 - r);
  
  // Clamp the result between min and max
  const finalCrashPoint = Math.min(max, Math.max(min, crashPoint));
  
  // Log the generated crash point
  console.log(`Generated crash point: ${finalCrashPoint.toFixed(2)}`);
  
  // Return the crash point rounded to 2 decimal places
  return parseFloat(finalCrashPoint.toFixed(2));
}
