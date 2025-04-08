import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGame } from "@/hooks/use-game";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Award,
  History,
  TrendingUp,
} from "lucide-react";

// Types for game state
type GameState = 'idle' | 'playing' | 'cashed_out' | 'crashed';

// Result interface
interface GameResult {
  isWin: boolean;
  winAmount: number;
  cashoutMultiplier?: number;
}

export function CrashGame() {
  // User and game history data
  const { user } = useAuth();
  const { gameHistory, refreshGameHistory } = useGame();
  const { toast } = useToast();
  
  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [betAmount, setBetAmount] = useState(10);
  const [autoCashout, setAutoCashout] = useState<number | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  
  // Refs for animation
  const animationRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Fixed incremental update instead of using delta time - this way it's more reliable
  const incrementAmount = 0.03; // Higher value for more visible growth
  
  // Load user crash settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/crash-settings", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setBetAmount(parseFloat(data.betAmount));
          if (data.autoCashoutMultiplier) {
            setAutoCashout(parseFloat(data.autoCashoutMultiplier));
          }
        }
      } catch (error) {
        console.error("Error fetching crash settings:", error);
      }
    };

    if (user) {
      fetchSettings();
    }
  }, [user]);
  
  // Set up canvas for graph and load game history
  useEffect(() => {
    if (graphCanvasRef.current) {
      // Make sure canvas dimensions are set correctly
      const canvas = graphCanvasRef.current;
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = 300;
        console.log(`Canvas dimensions set: ${canvas.width}x${canvas.height}`);
      }
    }
    
    drawInitialGraph();
    if (user) {
      refreshGameHistory();
    }
    
    // Add a window resize handler
    const handleResize = () => {
      if (graphCanvasRef.current) {
        const canvas = graphCanvasRef.current;
        const container = canvas.parentElement;
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = 300;
          drawInitialGraph();
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [user, refreshGameHistory]);
  
  // Start crash game mutation
  const startCrashMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/crash/start", {
        betAmount: betAmount.toString(),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Store the crash point from the server
      setCrashPoint(data.crashPoint);
      // Update user data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      console.log("Game started with crash point:", data.crashPoint);
    },
    onError: (error: Error) => {
      setGameState('idle');
      toast({
        title: "Error Starting Game",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Cash out mutation
  const cashoutMutation = useMutation({
    mutationFn: async (cashoutAt: number) => {
      const res = await apiRequest("POST", "/api/crash/cashout", {
        betAmount: betAmount.toString(),
        cashoutMultiplier: cashoutAt.toString(),
        crashPoint: crashPoint?.toString() || "0",
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Store the result to show at the end of animation
      setGameResult(data);
      
      // Update user data and refresh game history
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      refreshGameHistory();
      
      // The actual animation will continue until it hits the crash point
      if (data.isWin) {
        setCashoutMultiplier(data.cashoutMultiplier);
        // Add a delay to show toast after animation
        setTimeout(() => {
          toast({
            title: "You Won!",
            description: `You've cashed out at ${data.cashoutMultiplier.toFixed(2)}x and won $${data.winAmount.toFixed(2)}!`,
          });
        }, 1000);
      }
    },
    onError: (error: Error) => {
      setGameState('idle');
      toast({
        title: "Error Cashing Out",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const drawInitialGraph = () => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Reset any previous transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill with dark background
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    const ySteps = [1, 1.5, 2, 3, 5, 10];
    const padding = 30;
    const graphHeight = canvas.height - padding * 2;
    
    ySteps.forEach(step => {
      const y = canvas.height - padding - (graphHeight * (step - 1) / 9);
      
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
      
      // Draw multiplier labels
      ctx.font = '12px Arial';
      ctx.fillStyle = '#a0aec0';
      ctx.textAlign = 'left';
      ctx.fillText(`${step.toFixed(1)}x`, 10, y + 4);
    });
    
    // Draw baseline (1.00x)
    ctx.beginPath();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
  };
  
  const drawCrashGraph = (timestamp: number) => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate elapsed time
    if (!lastUpdateRef.current) {
      lastUpdateRef.current = timestamp;
    }
    // const deltaTime = timestamp - lastUpdateRef.current;
    lastUpdateRef.current = timestamp;
    
    // Update multiplier based on fixed increment instead of delta time
    // This is more reliable across different devices/frame rates
    if (gameState === 'playing') {
      setCurrentMultiplier(prev => {
        // Add a fixed amount for each animation frame
        const newMultiplier = prev + incrementAmount;
        
        // Debug log
        if (prev % 0.2 < 0.03) { // Only log occasionally to avoid console spam
          console.log(`Updating multiplier: ${prev.toFixed(2)} -> ${newMultiplier.toFixed(2)}`);
        }
        
        // Check for auto cashout
        if (autoCashout && newMultiplier >= autoCashout && !cashoutMultiplier) {
          handleCashout();
        }
        
        // Check for crash
        if (crashPoint && newMultiplier >= crashPoint) {
          setGameState('crashed');
          // Show toast for loss
          if (!cashoutMultiplier) {
            toast({
              title: "Crashed!",
              description: `The game crashed at ${crashPoint.toFixed(2)}x!`,
              variant: "destructive",
            });
          }
          return crashPoint;
        }
        
        return newMultiplier;
      });
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill with dark background
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw baseline and grid
    const padding = 30;
    const graphWidth = canvas.width - padding * 2;
    const graphHeight = canvas.height - padding * 2;
    
    // Redraw grid lines
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    const ySteps = [1, 1.5, 2, 3, 5, 10];
    
    ySteps.forEach(step => {
      const y = canvas.height - padding - (graphHeight * (step - 1) / 9);
      
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
      
      // Draw multiplier labels
      ctx.font = '12px Arial';
      ctx.fillStyle = '#a0aec0';
      ctx.textAlign = 'left';
      ctx.fillText(`${step.toFixed(1)}x`, 10, y + 4);
    });
    
    // Draw baseline (1.00x)
    ctx.beginPath();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Determine curve color based on game state
    const curveColor = gameState === 'crashed' ? '#e53e3e' : 
                      cashoutMultiplier ? '#48bb78' : '#4CAF50';
    
    // Create gradient for the curve
    const gradient = ctx.createLinearGradient(
      padding, canvas.height - padding,
      padding + graphWidth, canvas.height - padding
    );
    
    if (gameState === 'crashed') {
      gradient.addColorStop(0, '#e53e3e33'); // Red with alpha
      gradient.addColorStop(1, '#e53e3e');
    } else if (cashoutMultiplier) {
      gradient.addColorStop(0, '#48bb7833'); // Green with alpha
      gradient.addColorStop(1, '#48bb78');
    } else {
      gradient.addColorStop(0, '#4CAF5033'); // Default green with alpha
      gradient.addColorStop(1, '#4CAF50');
    }
    
    // Draw filled area under curve
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    
    // Calculate curve points
    const points = 100;
    const curvePoints = [];
    
    for (let i = 0; i <= points; i++) {
      const progress = i / points;
      const targetMultiplier = gameState === 'idle' ? 1 : 
                              cashoutMultiplier || currentMultiplier;
      
      const x = padding + graphWidth * progress;
      const multiplierForCurve = 1 + (targetMultiplier - 1) * Math.min(1, progress * 1.5);
      const y = canvas.height - padding - (graphHeight * (multiplierForCurve - 1) / 9);
      
      curvePoints.push({ x, y });
      ctx.lineTo(x, y);
    }
    
    // Complete the path to create a filled area
    ctx.lineTo(padding + graphWidth, canvas.height - padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.closePath();
    
    // Fill the area under the curve
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw the curve line itself
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    
    for (const point of curvePoints) {
      ctx.lineTo(point.x, point.y);
    }
    
    ctx.strokeStyle = curveColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw cash out point if applicable
    if (cashoutMultiplier) {
      const x = padding + graphWidth;
      const y = canvas.height - padding - (graphHeight * (cashoutMultiplier - 1) / 9);
      
      // Draw glow around cashout point
      ctx.shadowColor = '#48bb78';
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#48bb78';
      ctx.fill();
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // Draw cashout label
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#48bb78';
      ctx.textAlign = 'right';
      ctx.fillText(`${cashoutMultiplier.toFixed(2)}x`, x - 10, y - 10);
    }
    
    // Draw crash point if game crashed
    if (gameState === 'crashed' && crashPoint) {
      const x = padding + graphWidth;
      const y = canvas.height - padding - (graphHeight * (crashPoint - 1) / 9);
      
      // Draw glow around crash point
      ctx.shadowColor = '#e53e3e';
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#e53e3e';
      ctx.fill();
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // Draw crash label
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#e53e3e';
      ctx.textAlign = 'right';
      ctx.fillText(`${crashPoint.toFixed(2)}x`, x - 10, y - 10);
    }
    
    // Draw current multiplier with glow effect
    drawMultiplierDisplay(ctx, canvas.width / 2, 60);
    
    // Continue animation if game is active
    if (gameState !== 'idle') {
      animationRef.current = requestAnimationFrame(drawCrashGraph);
    }
  };
  
  // Draw the current multiplier with dynamic styling
  const drawMultiplierDisplay = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const multiplierText = `${currentMultiplier.toFixed(2)}×`;
    
    // Determine text color based on game state
    let textColor = '#ffffff';
    let glowColor = '#4CAF50';
    
    if (gameState === 'crashed') {
      textColor = '#e53e3e';
      glowColor = '#e53e3e';
    } else if (gameState === 'cashed_out') {
      textColor = '#48bb78';
      glowColor = '#48bb78';
    }
    
    // Calculate text size based on multiplier
    const baseSize = 32;
    const sizeMultiplier = Math.min(1.5, 1 + (currentMultiplier - 1) * 0.05);
    const fontSize = baseSize * sizeMultiplier;
    
    // Apply glow effect that intensifies with higher multipliers
    const glowIntensity = Math.min(30, currentMultiplier * 3);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowIntensity;
    
    // Draw text
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(multiplierText, x, y);
    
    // Reset shadow
    ctx.shadowBlur = 0;
  };
  
  const handleStartGame = () => {
    if (!user || gameState !== 'idle') return;
    
    // Validate inputs
    if (betAmount <= 0) {
      toast({
        title: "Invalid Bet",
        description: "Bet amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    if (betAmount > parseFloat(user.balance)) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough funds to place this bet",
        variant: "destructive",
      });
      return;
    }
    
    // Reset game state immediately
    setGameState('playing');
    setCurrentMultiplier(1.00);
    setCashoutMultiplier(null);
    setGameResult(null);
    lastUpdateRef.current = 0;
    
    // Start animation immediately so the user sees movement
    animationRef.current = requestAnimationFrame(drawCrashGraph);
    
    // Call server to get crash point and start the game
    // We do this AFTER setting up the animation so the user sees immediate feedback
    startCrashMutation.mutate();
    
    console.log("Game starting... Animation and API call initiated");
  };
  
  const handleCashout = () => {
    // Only require game to be in playing state
    if (gameState !== 'playing') return;
    
    // Use a default high crash point if we don't have one from the server yet
    const effectiveCrashPoint = crashPoint || 10.0;
    
    console.log("Cashing out at:", currentMultiplier.toFixed(2), "crash point:", effectiveCrashPoint);
    
    setGameState('cashed_out');
    cashoutMutation.mutate(currentMultiplier);
  };
  
  const potentialWin = betAmount * currentMultiplier;
  
  // Filter crash game history
  const crashHistory = gameHistory
    .filter(history => history.gameType === 'crash')
    .slice(0, 10); // Take the 10 most recent games

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Game Controls */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" /> Crash Game
          </CardTitle>
          <CardDescription>
            Watch the multiplier climb and cash out before it crashes!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="crash-bet-amount">Bet Amount ($)</Label>
            <div className="flex items-center space-x-2 mt-1.5">
              <Input
                id="crash-bet-amount"
                type="number"
                min="1"
                step="1"
                value={betAmount}
                onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                disabled={gameState !== 'idle'}
              />
              <div className="flex space-x-1.5">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setBetAmount(Math.max(1, betAmount / 2))}
                  disabled={gameState !== 'idle'}
                >
                  ½
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setBetAmount(betAmount * 2)}
                  disabled={gameState !== 'idle'}
                >
                  2×
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => user && setBetAmount(parseFloat(user.balance))}
                  disabled={gameState !== 'idle'}
                >
                  Max
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="auto-cashout">Auto Cashout (Optional)</Label>
            <div className="flex items-center space-x-2 mt-1.5">
              <Input
                id="auto-cashout"
                type="number"
                min="1.01"
                step="0.1"
                placeholder="e.g. 2.00"
                value={autoCashout || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setAutoCashout(isNaN(value) ? null : value);
                }}
                disabled={gameState !== 'idle'}
              />
              <span className="text-sm text-muted-foreground">×</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Set a multiplier to automatically cash out
            </p>
          </div>

          <div className="flex justify-between px-1 mt-2">
            <div>
              <p className="text-sm text-muted-foreground">Current Multiplier</p>
              <p className={`font-medium text-lg ${
                gameState === 'crashed' ? 'text-destructive' :
                gameState === 'cashed_out' ? 'text-green-500' : ''
              }`}>
                {currentMultiplier.toFixed(2)}×
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Potential Win</p>
              <p className="font-medium text-lg">
                ${potentialWin.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-4">
          <Button 
            className="flex-1"
            variant={gameState === 'idle' ? "default" : "outline"}
            onClick={handleStartGame}
            disabled={gameState !== 'idle' || startCrashMutation.isPending}
          >
            {startCrashMutation.isPending ? "Starting..." : gameState === 'idle' ? "Start Game" : "Game in Progress"}
          </Button>
          
          <Button 
            className="flex-1"
            variant="destructive"
            onClick={handleCashout}
            disabled={gameState !== 'playing' || cashoutMutation.isPending}
          >
            {cashoutMutation.isPending ? "Cashing Out..." : "Cash Out"}
          </Button>
        </CardFooter>
      </Card>

      {/* Center Column - Game Graph */}
      <Card className="bg-card border-border lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" /> Crash Graph
          </CardTitle>
          <CardDescription>
            Watch the multiplier rise in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="crash-graph bg-background rounded-lg relative">
            <canvas 
              ref={graphCanvasRef} 
              className="w-full h-full"
              style={{ height: "300px" }}
            ></canvas>
            
            {/* Game State Overlay */}
            <AnimatePresence>
              {gameState === 'crashed' && gameResult && !gameResult.isWin && (
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div 
                    className="text-center p-4 bg-background/80 rounded-lg"
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", damping: 12 }}
                  >
                    <motion.h3 
                      className="text-3xl font-bold text-destructive mb-2"
                      initial={{ y: -10 }}
                      animate={{ y: 0 }}
                    >
                      <AlertCircle className="inline-block h-7 w-7 mr-2 mb-1" />
                      Crashed at {crashPoint?.toFixed(2)}×!
                    </motion.h3>
                    <p className="text-muted-foreground">
                      You lost ${betAmount.toFixed(2)}
                    </p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setGameState('idle')}
                    >
                      Play Again
                    </Button>
                  </motion.div>
                </motion.div>
              )}
              
              {gameState === 'cashed_out' && gameResult && gameResult.isWin && (
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div 
                    className="text-center p-4 bg-background/80 rounded-lg"
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", damping: 12 }}
                  >
                    <motion.h3 
                      className="text-3xl font-bold text-green-500 mb-2"
                      initial={{ y: -10 }}
                      animate={{ y: 0 }}
                    >
                      <Award className="inline-block h-7 w-7 mr-2 mb-1" />
                      Cashed Out at {cashoutMultiplier?.toFixed(2)}×!
                    </motion.h3>
                    <p className="text-foreground">
                      You won <span className="text-green-500 font-bold">${gameResult.winAmount.toFixed(2)}</span>
                    </p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setGameState('idle')}
                    >
                      Play Again
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Recent Results */}
          <div className="mt-4">
            <div className="flex items-center mb-2">
              <History className="h-4 w-4 mr-2 text-muted-foreground" />
              <h3 className="font-medium text-sm">Recent Results</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {crashHistory.length > 0 ? (
                crashHistory.map((game, index) => {
                  const isWin = game.outcome.startsWith('win');
                  const multiplier = game.outcome.match(/([0-9.]+)x/);
                  
                  return (
                    <Badge
                      key={index}
                      variant={isWin ? "outline" : "destructive"}
                      className={`font-mono ${
                        isWin ? 'border-green-500 text-green-500' : ''
                      }`}
                    >
                      {multiplier ? multiplier[1] + 'x' : game.outcome}
                    </Badge>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No recent games</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}