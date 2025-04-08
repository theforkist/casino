import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

// Format numbers to 2 decimal places
function formatNumber(num: number): string {
  return num.toFixed(2);
}

// Game states
type GameState = 'idle' | 'starting' | 'playing' | 'cashed_out' | 'crashed';

export function CrashGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [betAmount, setBetAmount] = useState("10.00");
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<any>(null);
  
  // Animation references
  const animationId = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const isAnimationActive = useRef<boolean>(false);
  
  // Load settings on mount
  useEffect(() => {
    if (user) {
      loadSettings();
    }
    
    // Cleanup on unmount
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
        isAnimationActive.current = false;
      }
    };
  }, [user]);

  // Load saved settings and user balance
  const loadSettings = async () => {
    try {
      // Load settings
      const response = await apiRequest("GET", "/api/crash-settings");
      const settings = await response.json();
      setBetAmount(settings.betAmount || "10.00");
      
      // Load user balance
      if (user) {
        const userResponse = await apiRequest("GET", "/api/user");
        const userData = await userResponse.json();
        setUserBalance(parseFloat(userData.balance));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  // Reset game to play again
  const resetGame = () => {
    setGameState('idle');
    setMultiplier(1.00);
    setGameResult(null);
    
    // Make sure animation is stopped
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
      animationId.current = null;
    }
    isAnimationActive.current = false;
    
    // Redraw the game in idle state
    drawGame(1.00);
  };

  // Start the game
  const startGame = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to play",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Update UI state
      setIsLoading(true);
      setGameState('starting');
      setMultiplier(1.00);
      setGameResult(null);
      
      // Request game start from server
      const response = await apiRequest("POST", "/api/crash/game", {
        action: "start",
        betAmount
      });
      
      const data = await response.json();
      
      if (data.result === "success") {
        // Store crash point (server-side generated, hidden from user)
        setCrashPoint(data.crashPoint);
        
        // Update user balance
        setUserBalance(data.newBalance);
        
        // Start animation
        setGameState('playing');
        startGameAnimation();
        
        toast({
          title: "Game Started",
          description: `Bet: $${formatNumber(parseFloat(betAmount))}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error starting game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      setGameState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  // Cash out of the game
  const cashOut = async () => {
    if (gameState !== 'playing') return;
    
    try {
      // Immediately stop animation and update UI
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
        animationId.current = null;
      }
      isAnimationActive.current = false;
      
      // Capture current multiplier (this is crucial to prevent the 1.00x issue)
      const cashoutMultiplier = multiplier;
      
      setIsLoading(true);
      
      // Request cashout from server with the captured multiplier
      const response = await apiRequest("POST", "/api/crash/game", {
        action: "cashout",
        betAmount,
        cashoutMultiplier: cashoutMultiplier,
        crashPoint
      });
      
      const data = await response.json();
      
      if (data.result === "success") {
        // Update game state
        setGameState('cashed_out');
        
        // Update user balance
        setUserBalance(data.newBalance);
        
        // Store result for display
        setGameResult({
          isWin: true,
          multiplier: cashoutMultiplier,
          amount: data.winAmount
        });
        
        toast({
          title: "Cashed Out!",
          description: `You cashed out at ${formatNumber(cashoutMultiplier)}x and won $${formatNumber(data.winAmount)}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error cashing out",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      
      // Resume animation if there was an error
      if (gameState === 'playing' && !isAnimationActive.current) {
        startGameAnimation();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Game animation
  const startGameAnimation = () => {
    // Reset any existing animation
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
    }
    
    // Set start time and state
    startTime.current = performance.now();
    isAnimationActive.current = true;
    
    // Begin animation loop
    animationId.current = requestAnimationFrame(updateAnimation);
  };

  // Animation update function
  const updateAnimation = (timestamp: number) => {
    if (gameState !== 'playing' || !isAnimationActive.current) return;
    
    // Calculate elapsed time in seconds
    const elapsed = (timestamp - startTime.current) / 1000;
    
    // Use a faster exponential growth function to ensure visible movement
    const growthFactor = 1.10; // Higher growth factor = faster increase
    const newMultiplier = Math.pow(growthFactor, elapsed);
    
    // Check if we've crashed
    if (newMultiplier >= crashPoint) {
      // Game over - crashed
      setGameState('crashed');
      setMultiplier(crashPoint);
      
      // Store result
      setGameResult({
        isWin: false,
        crashPoint
      });
      
      toast({
        title: "Crashed!",
        description: `The game crashed at ${formatNumber(crashPoint)}x`,
        variant: "destructive",
      });
      
      // Stop animation
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
        animationId.current = null;
      }
      isAnimationActive.current = false;
      
      // Draw final state
      drawGame(crashPoint);
      return;
    }
    
    // Update multiplier state (capped at 2 decimal places for display)
    setMultiplier(parseFloat(newMultiplier.toFixed(2)));
    
    // Draw updated game state
    drawGame(newMultiplier);
    
    // Continue animation
    animationId.current = requestAnimationFrame(updateAnimation);
  };

  // Draw game on canvas
  const drawGame = (currentMultiplier: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up drawing
    const width = canvas.width;
    const height = canvas.height;
    
    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let x = 50; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal grid lines (representing multiplier levels)
    const levels = [1, 1.5, 2, 3, 5, 10];
    for (const level of levels) {
      const y = height - (height * (Math.min(level, 15) / 15));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Draw multiplier label
      ctx.fillStyle = '#666666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${level.toFixed(1)}x`, 5, y - 5);
    }
    
    // Calculate points for crash curve
    const points: [number, number][] = [];
    const maxPoints = 100; // Use fixed number of points for smoother curve
    const step = width / maxPoints;
    
    // Generate curve points
    for (let i = 0; i <= maxPoints; i++) {
      const x = i * step;
      // Scale curve to fit visible area better
      const point = 1 + (i / maxPoints) * (currentMultiplier - 1);
      const y = height - (height * (Math.min(point, 15) / 15));
      points.push([x, y]);
    }
    
    // Draw crash curve
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      
      // Set line style based on game state
      if (gameState === 'crashed') {
        ctx.strokeStyle = '#ff4444';
      } else if (gameState === 'cashed_out') {
        ctx.strokeStyle = '#44ff44';
      } else {
        ctx.strokeStyle = '#4499ff';
      }
      
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // Draw current multiplier
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Set color based on game state
    if (gameState === 'crashed') {
      ctx.fillStyle = '#ff4444';
    } else if (gameState === 'playing') {
      ctx.fillStyle = '#4499ff';
    } else if (gameState === 'cashed_out') {
      ctx.fillStyle = '#44ff44';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    
    // Draw multiplier text
    ctx.fillText(`${formatNumber(currentMultiplier)}x`, width / 2, height / 2);
  };

  // Set up and resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = 300;
      
      // Draw initial state
      drawGame(multiplier);
    };
    
    // Initialize and handle resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [gameState, multiplier]);

  // Render component
  return (
    <Card className="border border-gray-800">
      <CardContent className="p-4">
        {/* Game Canvas */}
        <div className="relative mb-4 bg-black rounded-md overflow-hidden">
          <canvas 
            ref={canvasRef} 
            className="w-full h-[300px]"
          />
          
          {/* Game Overlays */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          )}
          
          {gameState === 'idle' && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Ready to Play</h3>
                <p className="text-gray-400">Set your bet and click Start</p>
              </div>
            </div>
          )}
          
          {gameState === 'crashed' && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center bg-card p-4 rounded-md shadow-md">
                <h3 className="text-xl font-bold text-red-500 mb-1">Crashed!</h3>
                <p className="text-lg">
                  At {formatNumber(crashPoint)}x
                </p>
                <Button 
                  onClick={resetGame} 
                  className="mt-2 bg-blue-600 hover:bg-blue-700"
                >
                  Play Again
                </Button>
              </div>
            </div>
          )}
          
          {gameState === 'cashed_out' && !isLoading && gameResult && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center bg-card p-4 rounded-md shadow-md">
                <h3 className="text-xl font-bold text-green-500 mb-1">You Won!</h3>
                <p className="text-lg">
                  Cashed out at {formatNumber(gameResult.multiplier)}x
                </p>
                <p className="text-xl font-bold mt-1">
                  ${formatNumber(gameResult.amount)}
                </p>
                <Button 
                  onClick={resetGame} 
                  className="mt-2 bg-blue-600 hover:bg-blue-700"
                >
                  Play Again
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Game Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Bet Amount ($)</label>
            <Input
              type="number"
              min="1"
              step="1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={gameState !== 'idle' || isLoading}
              className="w-full"
            />
            {userBalance !== null && (
              <div className="mt-1 text-xs text-muted-foreground">
                Balance: ${formatNumber(userBalance)}
              </div>
            )}
          </div>
          
          <div className="md:col-span-2 flex items-end space-x-2">
            <Button
              onClick={startGame}
              disabled={gameState !== 'idle' || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Game
            </Button>
            
            <Button
              onClick={cashOut}
              disabled={gameState !== 'playing' || isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Cash Out {gameState === 'playing' && `(${formatNumber(multiplier)}x)`}
            </Button>
          </div>
        </div>
        
        {/* Game Info */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Provably fair | Maximum win: 100x</p>
        </div>
      </CardContent>
    </Card>
  );
}