import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, TrendingUp } from "lucide-react";

// Format numbers to 2 decimal places
function formatNumber(num: number) {
  return num.toFixed(2);
}

export function CrashGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCrashed, setIsCrashed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [crashPoint, setCrashPoint] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  
  // Animation references
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  
  // Settings
  const [betAmount, setBetAmount] = useState("10.00");
  const [gameResult, setGameResult] = useState<any>(null);
  
  // Load saved settings on mount
  useEffect(() => {
    if (user) {
      loadSettings();
    }
    return () => {
      // Clean up animation on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [user]);
  
  // Load saved settings
  const loadSettings = async () => {
    try {
      const response = await apiRequest("GET", "/api/crash-settings");
      const settings = await response.json();
      setBetAmount(settings.betAmount || "10.00");
    } catch (error) {
      console.error("Error loading settings:", error);
    }
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
      setIsLoading(true);
      setIsPlaying(false);
      setIsCrashed(false);
      setHasStarted(false);
      setCurrentMultiplier(1.00);
      setGameResult(null);
      
      // Call API to start the game
      const response = await apiRequest("POST", "/api/crash/game", {
        action: "start",
        betAmount
      });
      
      const data = await response.json();
      
      if (data.result === "success") {
        // Set the crash point (hidden from the user)
        setCrashPoint(data.crashPoint);
        
        // Start the game animation
        setIsPlaying(true);
        setHasStarted(true);
        startGameAnimation();
        
        toast({
          title: "Game started",
          description: `Bet: $${formatNumber(parseFloat(betAmount))}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error starting game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cash out of the game - improved version
  const cashOut = async () => {
    if (!isPlaying || !hasStarted) return;
    
    try {
      // Stop the animation immediately to freeze the multiplier
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      setIsLoading(true);
      console.log(`Cashing out at ${currentMultiplier}x`);
      
      // Make sure we're cashing out with the current multiplier, not 1.00
      // Store multiplier before API call to prevent race conditions
      const cashoutAt = currentMultiplier;
      
      // Call API to cash out with the exact current multiplier
      const response = await apiRequest("POST", "/api/crash/game", {
        action: "cashout",
        betAmount,
        cashoutMultiplier: cashoutAt, // Use stored value
        crashPoint
      });
      
      const data = await response.json();
      
      if (data.result === "success") {
        // Set game as complete
        setIsPlaying(false);
        
        // Store the result including the ACTUAL cashout multiplier
        setGameResult({
          isWin: true, // Manual cashout is always a win
          winAmount: data.winAmount,
          cashoutMultiplier: cashoutAt // Use our version, not server's
        });
        
        // Show toast with result
        toast({
          title: "Cashed Out!",
          description: `You cashed out at ${formatNumber(cashoutAt)}x and won $${formatNumber(data.winAmount)}`,
          variant: "default",
        });
      }
    } catch (error: any) {
      // If error occurs, show the error but continue the game
      toast({
        title: "Error cashing out",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      
      // Restart animation
      if (!animationFrameRef.current && isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateGameAnimation);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Game animation logic with better growth formula
  const startGameAnimation = () => {
    startTimeRef.current = performance.now();
    lastTimestampRef.current = performance.now();
    
    // Set initial multiplier
    setCurrentMultiplier(1.00);
    
    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(updateGameAnimation);
  };
  
  const updateGameAnimation = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate elapsed time
    const elapsed = timestamp - startTimeRef.current;
    const elapsedSeconds = elapsed / 1000;
    
    // Improved multiplier calculation - starts at 1.00 and grows exponentially
    // Using a faster growth rate (1.09) for more exciting gameplay
    // Growth rate affects how quickly the multiplier increases
    const growthRate = 1.09;
    const newMultiplier = Math.max(1.00, Math.pow(growthRate, elapsedSeconds));
    
    // Check if we've crashed - add a small buffer to avoid edge cases
    if (newMultiplier >= (crashPoint - 0.01)) {
      // Game over - crashed
      setIsPlaying(false);
      setIsCrashed(true);
      setCurrentMultiplier(crashPoint);
      
      // Set game result
      setGameResult({
        isWin: false,
        crashPoint
      });
      
      // Show crash toast
      toast({
        title: "Crashed!",
        description: `The game crashed at ${formatNumber(crashPoint)}x`,
        variant: "destructive",
      });
      
      // Stop animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Draw final state
      drawGameState(ctx, canvas.width, canvas.height, crashPoint);
      return;
    }
    
    // Update current multiplier with better precision (avoid jumps)
    setCurrentMultiplier(parseFloat(Math.min(newMultiplier, 100).toFixed(2)));
    
    // Draw game state
    drawGameState(ctx, canvas.width, canvas.height, newMultiplier);
    
    // Debug output
    console.log(`Animation frame: ${elapsedSeconds.toFixed(2)}s, multiplier: ${newMultiplier.toFixed(2)}x, target: ${crashPoint}x`);
    
    // Continue animation if still playing
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateGameAnimation);
    }
  };
  
  // Draw the game state on the canvas
  const drawGameState = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    multiplier: number
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set up drawing styles
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);
    
    // Draw crash curve
    const points: [number, number][] = [];
    const maxPoints = 100;
    const step = width / maxPoints;
    
    for (let i = 0; i < maxPoints; i++) {
      const x = i * step;
      // Calculate y based on logarithmic function to create a nice curve
      // We invert y because canvas 0,0 is top-left
      const factor = i / maxPoints;
      const y = height - (Math.pow(factor * multiplier, 1.5) * height * 0.8);
      points.push([x, y]);
    }
    
    // Draw path
    ctx.beginPath();
    ctx.strokeStyle = isCrashed ? '#ff4444' : '#44ff44';
    
    // Move to first point
    if (points.length > 0) {
      ctx.moveTo(points[0][0], points[0][1]);
      
      // Draw lines to each point
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
    }
    
    ctx.stroke();
    
    // Draw multiplier
    drawMultiplierDisplay(ctx, width / 2, height / 2);
  };
  
  // Draw the multiplier display
  const drawMultiplierDisplay = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Determine color based on game state
    if (isCrashed) {
      ctx.fillStyle = '#ff4444';
    } else if (isPlaying) {
      ctx.fillStyle = '#44ff44';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    
    // Draw multiplier
    ctx.fillText(`${formatNumber(currentMultiplier)}x`, x, y);
  };
  
  // Effect to resize canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Get container dimensions
      const container = canvas.parentElement;
      if (!container) return;
      
      // Set canvas dimensions
      canvas.width = container.clientWidth;
      canvas.height = 300;
      
      // Redraw
      if (!isPlaying) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawGameState(ctx, canvas.width, canvas.height, currentMultiplier);
        }
      }
    };
    
    // Initial resize
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying, currentMultiplier, isCrashed]);
  
  // Render game component
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-2xl">Crash Game</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Game Canvas */}
          <div className="w-full relative mb-4">
            <canvas 
              ref={canvasRef} 
              className="w-full h-[300px] rounded-md"
            />
            
            {/* Game Result Overlay */}
            {gameResult && !isPlaying && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                <div className="text-center bg-card p-4 rounded-md shadow-lg">
                  {gameResult.isWin ? (
                    <>
                      <h3 className="text-xl font-bold text-green-500">You Won!</h3>
                      <p className="text-lg">
                        Cashed out at {formatNumber(gameResult.cashoutMultiplier)}x
                      </p>
                      <p className="text-xl font-bold">
                        ${formatNumber(gameResult.winAmount)}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-red-500">Crashed!</h3>
                      <p className="text-lg">
                        At {formatNumber(gameResult.crashPoint || crashPoint)}x
                      </p>
                      <p className="text-lg">Better luck next time!</p>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Bet Amount</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isPlaying || isLoading}
                className="w-full"
              />
            </div>
            
            <div className="col-span-1 md:col-span-2 flex items-end space-x-2">
              <Button
                onClick={startGame}
                disabled={isPlaying || isLoading}
                variant="default"
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2" />
                )}
                Start Game
              </Button>
              
              <Button
                onClick={cashOut}
                disabled={!isPlaying || isLoading}
                variant={isPlaying ? "destructive" : "outline"}
                className="flex-1"
              >
                Cash Out {isPlaying && `(${formatNumber(currentMultiplier)}x)`}
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="text-center">
              Place your bet and click Start. Cash out before it crashes to win!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}