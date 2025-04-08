import * as crypto from "crypto";

// Class to handle all crash game logic in one place
export class CrashGame {
  // Generate a crash point with a house edge (99% RTP)
  // Using the standard algorithm used in most crypto crash games
  public static generateCrashPoint(): number {
    // Get true random bytes for cryptographic security
    const buffer = crypto.randomBytes(4);
    // Convert to a number between 0 and 1
    const randomValue = buffer.readUInt32BE(0) / 0xFFFFFFFF;
    
    // Apply the formula: 1 / random^(1/houseEdge)
    // This gives us a distribution with a house edge
    // We use 0.99 for a 1% house edge (99% RTP)
    const houseEdge = 0.99;
    const e = 1 / houseEdge;
    
    // Standard industry formula for crash games
    let crashPoint = 1.001;  // Minimum crash point 1.001
    if(randomValue !== 0) {
      crashPoint = Math.max(1.001, (1 / Math.pow(randomValue, e)));
    }
    
    // Cap the crash point at 100x to prevent extreme outliers
    crashPoint = Math.min(100, crashPoint);
    
    // Log for debugging with 3 decimal places
    console.log(`CrashGame - Random value: ${randomValue}, Crash point: ${crashPoint.toFixed(3)}`);
    
    // Return with 3 decimal places
    return parseFloat(crashPoint.toFixed(3));
  }
  
  // Verify if a crash point is legitimate (for future provably fair implementation)
  public static verifyPoint(hash: string, seed: string): number {
    // This would be used for a provably fair implementation
    // For now, we'll just return a valid crash point
    return this.generateCrashPoint();
  }
}