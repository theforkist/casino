import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

function formatNumber(num: number): string {
  return num.toFixed(2);
}

export function CrashGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Core game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCrashed, setIsCrashed] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Game values
  const [betAmount, setBetAmount] = useState("10.00");
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  
  // Animation reference
  const animationRef = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);
  
  // Canvas reference
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Load user data on mount
  useEffect(() => {
    if (user) {
      loadData();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [user]);
  
  // Load user data and settings
  const loadData = async () => {
    try {
      // Load settings
      const settingsResponse = await apiRequest("GET", "/api/crash-settings");
      const settings = await settingsResponse.json();
      setBetAmount(settings.betAmount || "10.00");
      
      // Load user balance
      const userResponse = await apiRequest("GET", "/api/user");
      const userData = await userResponse.json();
      setUserBalance(parseFloat(userData.balance));
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };
  
  // Set up the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const setupCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = 300;
      
      // Initial draw
      drawGame();
    };
    
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    
    return () => {
      window.removeEventListener('resize', setupCanvas);
    };
  }, [multiplier, isCrashed, hasCashedOut, isPlaying]);
  
  // Draw the game on canvas
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Vertical grid
    for (let i = 50; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal grid (multiplier levels)
    const levels = [1, 1.5, 2, 3, 5, 10];
    for (const level of levels) {
      const y = canvas.height - (canvas.height * (level / 15));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${level.toFixed(1)}x`, 5, y - 5);
    }
    
    // Only draw the curve if we've started
    if (hasStarted) {
      // Draw curve
      const points = calculateCurvePoints(canvas.width, canvas.height, multiplier);
      
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - (canvas.height * (1 / 15)));
      
      for (const point of points) {
        ctx.lineTo(point.x, point.y);
      }
      
      // Line color based on game state
      if (isCrashed) {
        ctx.strokeStyle = '#ff4444'; // Red for crash
      } else if (hasCashedOut) {
        ctx.strokeStyle = '#44ff44'; // Green for cash-out
      } else {
        ctx.strokeStyle = '#4499ff'; // Blue while playing
      }
      
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // Draw multiplier text
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let displayText = `${formatNumber(multiplier)}x`;
    
    if (isCrashed) {
      ctx.fillStyle = '#ff4444';
      displayText = `CRASHED AT ${formatNumber(crashPoint)}x`;
    } else if (hasCashedOut) {
      ctx.fillStyle = '#44ff44';
      displayText = `CASHED OUT ${formatNumber(multiplier)}x`;
    } else if (isPlaying) {
      ctx.fillStyle = '#4499ff';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    
    ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);
  };
  
  // Helper to calculate curve points
  const calculateCurvePoints = (width: number, height: number, currentMultiplier: number) => {
    const points = [];
    const numPoints = 100;
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints;
      const x = progress * width;
      const pointMultiplier = 1 + progress * (currentMultiplier - 1);
      const y = height - (height * (Math.min(pointMultiplier, 15) / 15));
      
      points.push({ x, y });
    }
    
    return points;
  };
  
  // Start the game
  const startGame = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to log in to play",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Reset state
      setIsLoading(true);
      setIsPlaying(false);
      setHasStarted(false);
      setIsCrashed(false);
      setHasCashedOut(false);
      setMultiplier(1.00);
      setWinAmount(0);
      
      // Request game from server
      const response = await apiRequest("POST", "/api/crash/game", {
        action: "start",
        betAmount
      });
      
      const data = await response.json();
      
      if (data.result === "success") {
        // Store crash point from server (hidden from user)
        setCrashPoint(data.crashPoint);
        
        // Update balance
        setUserBalance(data.newBalance);
        
        // Begin playing
        setIsPlaying(true);
        setHasStarted(true);
        
        // Start animation
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        lastUpdateTime.current = performance.now();
        animationRef.current = requestAnimationFrame(updateGame);
        
        toast({
          title: "Game Started",
          description: `Bet: $${formatNumber(parseFloat(betAmount))}`
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Game loop update
  const updateGame = (timestamp: number) => {
    if (!isPlaying || isCrashed || hasCashedOut) return;
    
    // Calculate time elapsed since last update
    const deltaTime = timestamp - lastUpdateTime.current;
    lastUpdateTime.current = timestamp;
    
    // Increase multiplier (slower growth - around 1x per 2-3 seconds)
    const growthRate = 0.0003; // Adjust this to control speed
    const newMultiplier = multiplier + (deltaTime * growthRate);
    
    setMultiplier(parseFloat(newMultiplier.toFixed(2)));
    
    // Check if crashed
    if (newMultiplier >= crashPoint) {
      setIsCrashed(true);
      setIsPlaying(false);
      
      toast({
        title: "Crashed!",
        description: `The game crashed at ${formatNumber(crashPoint)}x`,
        variant: "destructive"
      });
      
      return;
    }
    
    // Continue animation
    animationRef.current = requestAnimationFrame(updateGame);
    
    // Redraw
    drawGame();
  };
  
  // Cash out
  const cashOut = async () => {
    if (!isPlaying) return;
    
    try {
      // Stop animation immediately
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Lock UI
      setIsLoading(true);
      
      // Store current multiplier (crucial)
      const cashoutMultiplier = multiplier;
      
      // Call server to cash out
      const response = await apiRequest("POST", "/api/crash/game", {
        action: "cashout",
        betAmount,
        cashoutMultiplier: cashoutMultiplier,
        crashPoint
      });
      
      const data = await response.json();
      
      if (data.result === "success") {
        // Update state
        setHasCashedOut(true);
        setIsPlaying(false);
        setUserBalance(data.newBalance);
        setWinAmount(data.winAmount);
        
        toast({
          title: "Cashed Out!",
          description: `You won $${formatNumber(data.winAmount)}`
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
      
      // Resume game if there was an error
      if (isPlaying && !animationRef.current) {
        lastUpdateTime.current = performance.now();
        animationRef.current = requestAnimationFrame(updateGame);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset game to play again
  const resetGame = () => {
    setIsPlaying(false);
    setHasStarted(false);
    setIsCrashed(false);
    setHasCashedOut(false);
    setMultiplier(1.00);
    setWinAmount(0);
    drawGame();
  };
  
  return (
    <Card className="border border-gray-800">
      <CardContent className="p-6">
        {/* Game visualization */}
        <div className="relative mb-6 rounded-md overflow-hidden bg-black">
          <canvas
            ref={canvasRef}
            className="w-full h-[300px]"
          />
          
          {/* Overlay elements */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          )}
          
          {!hasStarted && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Ready to Play</h3>
                <p className="text-gray-400">Set your bet and click Start</p>
              </div>
            </div>
          )}
          
          {isCrashed && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center bg-card p-6 rounded-md shadow-lg">
                <h3 className="text-xl font-bold text-red-500 mb-2">Crashed!</h3>
                <p className="text-lg mb-3">
                  Game crashed at {formatNumber(crashPoint)}x
                </p>
                <Button
                  onClick={resetGame}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Play Again
                </Button>
              </div>
            </div>
          )}
          
          {hasCashedOut && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center bg-card p-6 rounded-md shadow-lg">
                <h3 className="text-xl font-bold text-green-500 mb-2">You Won!</h3>
                <p className="text-lg">
                  Cashed out at {formatNumber(multiplier)}x
                </p>
                <p className="text-2xl font-bold my-2">
                  ${formatNumber(winAmount)}
                </p>
                <Button
                  onClick={resetGame}
                  className="bg-blue-600 hover:bg-blue-700 mt-2"
                >
                  Play Again
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Bet Amount ($)</label>
            <Input
              type="number"
              min="1"
              step="1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={hasStarted || isLoading}
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
              disabled={hasStarted || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Game
            </Button>
            
            <Button
              onClick={cashOut}
              disabled={!isPlaying || isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Cash Out {isPlaying && `(${formatNumber(multiplier)}x)`}
            </Button>
          </div>
        </div>
        
        {/* Game info */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Provably fair | Maximum win: 100x</p>
        </div>
      </CardContent>
    </Card>
  );
}