import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

// Format with three decimal places
function formatNumber(num: number): string {
  return num.toFixed(3);
}

export function CrashGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Basic game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [betAmount, setBetAmount] = useState("10.00");
  const [currentMultiplier, setCurrentMultiplier] = useState(1.000);
  const [crashPoint, setCrashPoint] = useState(0);
  const [userWon, setUserWon] = useState(false);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Game interval to avoid animation frame issues
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const crashPointRef = useRef<number>(0);
  const multiplierRef = useRef<number>(1.000);
  const lastUpdateRef = useRef<number>(Date.now());
  
  // Canvas ref for visualizing the game
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load user balance & settings when component mounts
  useEffect(() => {
    if (user) {
      loadData();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user]);
  
  // Load user data and settings
  const loadData = async () => {
    try {
      // Get saved settings
      const settingsResponse = await apiRequest("GET", "/api/crash-settings");
      const settings = await settingsResponse.json();
      if (settings && settings.betAmount) {
        setBetAmount(settings.betAmount);
      }
      
      // Get user balance
      const userResponse = await apiRequest("GET", "/api/user");
      const userData = await userResponse.json();
      if (userData && userData.balance) {
        setUserBalance(parseFloat(userData.balance));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };
  
  // Set up canvas when component mounts or dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Resize canvas to parent container
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      canvas.width = parent.clientWidth;
      canvas.height = 300;
      
      // Draw current state
      renderGame();
    };
    
    // Initial setup
    resize();
    
    // Listen for resize
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isPlaying, gameOver, currentMultiplier, userWon]);
  
  // Draw game on canvas
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    const drawGrid = () => {
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let x = 50; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Horizontal lines (multiplier levels)
      const levels = [1, 1.25, 1.5, 2, 3, 5, 10];
      for (const level of levels) {
        // Scale y position logarithmically to better show the curve
        const y = height - (height * (Math.log(level) / Math.log(20)));
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        
        // Label
        ctx.fillStyle = '#666666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${level.toFixed(2)}x`, 5, y - 5);
      }
    };
    
    // Draw growth curve
    const drawCurve = () => {
      if (currentMultiplier <= 1.000) return;
      
      const points = [];
      const numPoints = 100;
      
      // Generate points
      for (let i = 0; i < numPoints; i++) {
        const x = (i / numPoints) * width;
        const m = 1 + (i / numPoints) * (currentMultiplier - 1);
        // Scale y position logarithmically
        const y = height - (height * (Math.log(m) / Math.log(20)));
        points.push({ x, y });
      }
      
      // Draw path
      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(0, height - (height * (Math.log(1) / Math.log(20))));
        
        for (const point of points) {
          ctx.lineTo(point.x, point.y);
        }
        
        // Set line style based on game state
        if (gameOver && !userWon) {
          ctx.strokeStyle = '#ff3333'; // Red for crash
        } else if (gameOver && userWon) {
          ctx.strokeStyle = '#33ff33'; // Green for cash out
        } else {
          ctx.strokeStyle = '#3399ff'; // Blue during play
        }
        
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    };
    
    // Draw multiplier text
    const drawMultiplier = () => {
      ctx.font = 'bold 42px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Set text color based on game state
      if (gameOver && !userWon) {
        ctx.fillStyle = '#ff3333'; // Red for crash
      } else if (gameOver && userWon) {
        ctx.fillStyle = '#33ff33'; // Green for cash out
      } else if (isPlaying) {
        ctx.fillStyle = '#3399ff'; // Blue during play
      } else {
        ctx.fillStyle = '#ffffff'; // White when idle
      }
      
      // Draw text
      ctx.fillText(`${formatNumber(currentMultiplier)}×`, width / 2, height / 2);
    };
    
    // Execute drawing functions
    drawGrid();
    drawCurve();
    drawMultiplier();
  };
  
  // Start the game
  const startGame = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to play",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Reset game state
      setLoading(true);
      setIsPlaying(false);
      setGameOver(false);
      setCurrentMultiplier(1.000);
      setUserWon(false);
      multiplierRef.current = 1.000;
      
      // Call server to start game
      const response = await apiRequest("POST", "/api/crash/game", {
        action: "start",
        betAmount
      });
      
      const data = await response.json();
      
      if (data.result === "success") {
        // Store crash point (server generated, hidden from user)
        setCrashPoint(data.crashPoint);
        crashPointRef.current = data.crashPoint;
        
        // Update balance
        setUserBalance(data.newBalance);
        
        // Start game
        setIsPlaying(true);
        lastUpdateRef.current = Date.now();
        
        // Start the game loop using setInterval for better reliability
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        timerRef.current = setInterval(() => {
          const now = Date.now();
          const elapsed = (now - lastUpdateRef.current) / 1000;
          lastUpdateRef.current = now;
          
          // Update multiplier - use a growth factor for more visible movement
          // Slower growth rate (0.7) gives a steadier climb
          const growthFactor = 0.7; 
          const newMultiplier = multiplierRef.current + (elapsed * growthFactor);
          
          // Update refs and state (with 3 decimal places)
          multiplierRef.current = parseFloat(newMultiplier.toFixed(3));
          setCurrentMultiplier(multiplierRef.current);
          
          // Check if crashed
          if (multiplierRef.current >= crashPointRef.current) {
            // Game crashed
            setGameOver(true);
            setIsPlaying(false);
            setUserWon(false);
            
            // Stop the interval
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            toast({
              title: "Crashed!",
              description: `Game crashed at ${formatNumber(crashPointRef.current)}×`,
              variant: "destructive",
            });
          }
          
          // Render updated state
          renderGame();
        }, 50); // Update every 50ms for smooth animation
        
        toast({
          title: "Game Started",
          description: `Bet placed: $${parseFloat(betAmount).toFixed(2)}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Cash out
  const cashOut = async () => {
    if (!isPlaying) return;
    
    try {
      // Pause the game immediately
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setLoading(true);
      
      // Store exact multiplier at cashout time (important)
      const cashoutMultiplier = multiplierRef.current;
      
      // Request cashout from server
      const response = await apiRequest("POST", "/api/crash/game", {
        action: "cashout",
        betAmount,
        cashoutMultiplier,
        crashPoint: crashPointRef.current
      });
      
      const data = await response.json();
      
      if (data.result === "success") {
        // Update game state
        setGameOver(true);
        setIsPlaying(false);
        setUserWon(true);
        setWinAmount(data.winAmount);
        setUserBalance(data.newBalance);
        
        toast({
          title: "Cashed Out!",
          description: `You won $${data.winAmount.toFixed(2)} at ${formatNumber(cashoutMultiplier)}×`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      
      // Resume game if there was an error
      if (isPlaying && !timerRef.current) {
        startGameTimer();
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to restart the timer
  const startGameTimer = () => {
    lastUpdateRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;
      
      // Update multiplier
      const growthFactor = 0.7;
      const newMultiplier = multiplierRef.current + (elapsed * growthFactor);
      
      // Update refs and state (with 3 decimal places)
      multiplierRef.current = parseFloat(newMultiplier.toFixed(3));
      setCurrentMultiplier(multiplierRef.current);
      
      // Check if crashed
      if (multiplierRef.current >= crashPointRef.current) {
        setGameOver(true);
        setIsPlaying(false);
        setUserWon(false);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      
      renderGame();
    }, 50);
  };
  
  // Reset the game
  const resetGame = () => {
    // Clean up any existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset game state
    setIsPlaying(false);
    setGameOver(false);
    setCurrentMultiplier(1.000);
    multiplierRef.current = 1.000;
    setUserWon(false);
    setWinAmount(0);
    
    // Render reset state
    renderGame();
  };
  
  return (
    <Card className="border border-gray-800">
      <CardContent className="p-6">
        {/* Game visualization */}
        <div className="relative mb-6 bg-black rounded-lg overflow-hidden">
          <canvas 
            ref={canvasRef} 
            className="w-full h-[300px]"
          />
          
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          )}
          
          {/* Game over overlay */}
          {gameOver && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center bg-card p-6 rounded-lg shadow-lg max-w-[80%]">
                {userWon ? (
                  <>
                    <h3 className="text-xl font-bold text-green-500 mb-2">Success!</h3>
                    <p className="text-lg mb-1">
                      You cashed out at {formatNumber(currentMultiplier)}×
                    </p>
                    <p className="text-2xl font-bold mb-4">
                      +${winAmount.toFixed(2)}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-red-500 mb-2">Crashed!</h3>
                    <p className="text-lg mb-1">
                      Game crashed at {formatNumber(crashPoint)}×
                    </p>
                    <p className="text-lg font-medium mb-4 text-red-400">
                      You lost ${parseFloat(betAmount).toFixed(2)}
                    </p>
                  </>
                )}
                
                <Button
                  onClick={resetGame}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Play Again
                </Button>
              </div>
            </div>
          )}
          
          {/* Ready state overlay */}
          {!isPlaying && !gameOver && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Ready to Play</h3>
                <p className="text-gray-400 max-w-xs mx-auto">
                  Set your bet and click Start. Cash out before the crash to win!
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Game controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Bet Amount ($)</label>
            <Input
              type="number"
              min="1"
              step="1"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={isPlaying || loading}
              className="w-full"
            />
            {userBalance !== null && (
              <div className="mt-1 text-xs text-muted-foreground">
                Balance: ${userBalance.toFixed(2)}
              </div>
            )}
          </div>
          
          <div className="md:col-span-2 flex items-end space-x-2">
            <Button
              onClick={startGame}
              disabled={isPlaying || loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Game
            </Button>
            
            <Button
              onClick={cashOut}
              disabled={!isPlaying || loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Cash Out {isPlaying && `(${formatNumber(currentMultiplier)}×)`}
            </Button>
          </div>
        </div>
        
        {/* Game info */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Provably fair | Maximum win: 100×</p>
        </div>
      </CardContent>
    </Card>
  );
}