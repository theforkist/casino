import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ArrowDown01, ArrowUp10, History, Info, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

// Function to format number with commas
function formatNumber(num: number) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function DiceGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [targetNumber, setTargetNumber] = useState(50);
  const [betType, setBetType] = useState<"over" | "under">("over");
  const [betAmount, setBetAmount] = useState(10);
  const [result, setResult] = useState<any>(null);
  const [animating, setAnimating] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [maxBet, setMaxBet] = useState(1000);
  const diceRef = useRef<HTMLDivElement>(null);
  
  // Load game history
  const { data: gameHistory } = useQuery({
    queryKey: ["/api/game-history"],
    queryFn: async () => {
      const res = await fetch("/api/game-history", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch game history");
      return await res.json();
    },
    enabled: !!user,
  });
  
  // Filter history for dice games only
  const diceHistory = gameHistory?.filter((game: any) => game.gameType === 'dice') || [];

  // Load user dice settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/dice-settings", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setTargetNumber(data.targetNumber || 50);
          setBetType(data.betType || "over");
          setBetAmount(parseFloat(data.betAmount) || 10);
          setMaxBet(parseFloat(data.maxBet) || 1000);
        }
      } catch (error) {
        console.error("Error fetching dice settings:", error);
      }
    };

    if (user) {
      fetchSettings();
    }
  }, [user]);

  // Calculate win chance and payout
  const winChance = betType === "over" 
    ? (100 - targetNumber) / 100 
    : targetNumber / 100;
  
  const payout = 0.99 / winChance; // 99% RTP
  const potentialWin = betAmount * payout;

  // Roll dice mutation
  const rollDiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/dice/play", {
        betAmount: betAmount.toString(),
        targetNumber,
        betType,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Animate dice roll with 3D effect
      setAnimating(true);
      
      // Start rapid animation
      let count = 0;
      const spinAnimation = setInterval(() => {
        setDiceValue(Math.floor(Math.random() * 100) + 1);
        count++;
        
        // Add more spinning and rotation animations during this phase
        if (diceRef.current) {
          diceRef.current.style.transform = `rotateX(${Math.random() * 360}deg) rotateY(${Math.random() * 360}deg)`;
        }
        
        if (count > 15) {
          clearInterval(spinAnimation);
          
          // Slow down animation phase
          let slowCount = 0;
          const slowAnimation = setInterval(() => {
            slowCount++;
            setDiceValue(Math.floor(Math.random() * 100) + 1);
            
            if (slowCount > 5) {
              clearInterval(slowAnimation);
              
              // Final result
              setDiceValue(data.diceResult);
              setResult(data);
              setAnimating(false);
              
              // Reset transform
              if (diceRef.current) {
                diceRef.current.style.transform = 'none';
              }
              
              // Update user data after roll
              queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              queryClient.invalidateQueries({ queryKey: ["/api/game-history"] });
              
              // Show toast
              if (data.isWin) {
                toast({
                  title: "You Won!",
                  description: `You've won $${data.winAmount.toFixed(2)}!`,
                  variant: "default",
                });
              } else {
                toast({
                  title: "You Lost",
                  description: "Better luck next time!",
                  variant: "destructive",
                });
              }
            }
          }, 150);
        }
      }, 80);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRollDice = () => {
    if (!user) return;
    
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
    
    if (betAmount > maxBet) {
      toast({
        title: "Bet Exceeds Limit",
        description: `Maximum bet allowed is $${maxBet.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }
    
    if (targetNumber < 1 || targetNumber > 98) {
      toast({
        title: "Invalid Target",
        description: "Target number must be between 1 and 98",
        variant: "destructive",
      });
      return;
    }
    
    rollDiceMutation.mutate();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Tabs defaultValue="bet" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="bet">Place Bet</TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="bet">
          <Card className="bg-dark-secondary border-gray-800">
            <CardHeader>
              <CardTitle>Dice Game</CardTitle>
              <CardDescription>
                Bet whether the dice roll will be over or under your target number
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bet Type Selection */}
              <div className="flex flex-col space-y-3">
                <Label>Bet Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    type="button"
                    variant={betType === "over" ? "default" : "outline"}
                    className={betType === "over" ? "bg-accent-blue hover:bg-accent-blue/90" : ""}
                    onClick={() => setBetType("over")}
                    disabled={rollDiceMutation.isPending || animating}
                  >
                    <ArrowUp10 className="mr-2 h-4 w-4" />
                    Over {targetNumber}
                  </Button>
                  <Button 
                    type="button"
                    variant={betType === "under" ? "default" : "outline"}
                    className={betType === "under" ? "bg-accent-green hover:bg-accent-green/90" : ""}
                    onClick={() => setBetType("under")}
                    disabled={rollDiceMutation.isPending || animating}
                  >
                    <ArrowDown01 className="mr-2 h-4 w-4" />
                    Under {targetNumber}
                  </Button>
                </div>
              </div>
              
              {/* Target Number */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Target Number</Label>
                  <span className="text-sm text-muted-foreground">
                    Current: <Badge variant="outline">{targetNumber}</Badge>
                  </span>
                </div>
                <div className="pt-2">
                  <Slider
                    value={[targetNumber]}
                    min={1}
                    max={98}
                    step={1}
                    onValueChange={(vals) => setTargetNumber(vals[0])}
                    className="my-4"
                    disabled={rollDiceMutation.isPending || animating}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>50</span>
                    <span>98</span>
                  </div>
                </div>
              </div>
              
              {/* Bet Amount */}
              <div>
                <Label htmlFor="bet-amount">Bet Amount ($)</Label>
                <div className="flex items-center space-x-2 mt-1.5">
                  <Input
                    id="bet-amount"
                    type="number"
                    min="1"
                    max={maxBet}
                    step="1"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                    className="bg-dark-primary border-gray-700"
                    disabled={rollDiceMutation.isPending || animating}
                  />
                  <div className="flex space-x-1.5">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setBetAmount(Math.max(1, betAmount / 2))}
                      disabled={rollDiceMutation.isPending || animating}
                    >
                      ½
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setBetAmount(Math.min(maxBet, betAmount * 2))}
                      disabled={rollDiceMutation.isPending || animating}
                    >
                      2×
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => user && setBetAmount(Math.min(maxBet, parseFloat(user.balance)))}
                      disabled={rollDiceMutation.isPending || animating}
                    >
                      Max
                    </Button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Max bet: ${maxBet.toFixed(2)}
                </div>
              </div>

              <div className="flex justify-between px-1 bg-dark-primary/40 rounded-lg p-3">
                <div>
                  <p className="text-sm text-muted-foreground">Win Chance</p>
                  <p className="font-medium text-green-500">{(winChance * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payout</p>
                  <p className="font-medium">{payout.toFixed(2)}x</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Potential Win</p>
                  <p className="font-medium text-green-500">${potentialWin.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-accent-green hover:bg-accent-green/90"
                onClick={handleRollDice}
                disabled={rollDiceMutation.isPending || animating}
              >
                {rollDiceMutation.isPending || animating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Rolling...
                  </>
                ) : (
                  "Roll Dice"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card className="bg-dark-secondary border-gray-800">
            <CardHeader>
              <CardTitle>Dice Game History</CardTitle>
              <CardDescription>
                Your recent dice game results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {diceHistory.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {diceHistory.slice().reverse().map((game: any, index: number) => (
                    <div 
                      key={index} 
                      className="p-3 border border-gray-800 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={game.outcome.includes('win') ? "bg-green-500" : "bg-red-500"}>
                            {game.outcome.includes('win') ? 'Win' : 'Loss'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(game.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1">Bet: ${parseFloat(game.betAmount).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${game.outcome.includes('win') ? 'text-green-500' : 'text-red-500'}`}>
                          {game.outcome.includes('win') ? `+$${parseFloat(game.winAmount).toFixed(2)}` : `-$${parseFloat(game.betAmount).toFixed(2)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{game.outcome}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No dice game history yet. Start playing to see your results!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-dark-secondary border-gray-800">
        <CardHeader>
          <CardTitle>Game Result</CardTitle>
          <CardDescription>
            See your dice roll result here
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
          {diceValue ? (
            <div className="text-center">
              <div 
                ref={diceRef}
                className={`
                  dice-cube w-24 h-24 
                  ${animating ? 'animate-pulse transform transition-all duration-300' : ''} 
                  rounded-lg flex items-center justify-center text-4xl font-bold 
                  transition-all duration-500 
                  ${result?.isWin ? 'bg-green-500' : 'bg-red-500'}
                  shadow-lg perspective-3d
                `}
                style={{ 
                  transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
                }}
              >
                {diceValue}
              </div>
              
              {!animating && result && (
                <div className="mt-6 text-center">
                  <h3 className={`text-2xl font-bold ${result.isWin ? 'text-green-500' : 'text-red-500'}`}>
                    {result.isWin ? 'You Won!' : 'You Lost!'}
                  </h3>
                  <p className="text-lg mt-2">
                    {result.isWin ? (
                      <span>You won <span className="text-green-500 font-bold">${result.winAmount.toFixed(2)}</span></span>
                    ) : (
                      <span>Better luck next time!</span>
                    )}
                  </p>
                  <div className="mt-4 flex flex-col gap-1 bg-dark-primary/40 p-3 rounded-md">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Roll Result:</span>
                      <span className="font-medium">{result.diceResult}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium">{betType === "over" ? `> ${targetNumber}` : `< ${targetNumber}`}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payout:</span>
                      <span className="font-medium">{result.payout?.toFixed(2)}x</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="dice-cube w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center text-4xl font-bold mx-auto">
                ?
              </div>
              <p className="mt-6 text-muted-foreground">
                Place a bet and roll the dice to see results
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Alert className="border border-accent-blue/20 bg-accent-blue/10">
            <Info className="h-4 w-4 text-accent-blue" />
            <AlertTitle>Fair Play</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              Our games use provably fair algorithms to ensure random outcomes for all players.
            </AlertDescription>
          </Alert>
        </CardFooter>
      </Card>
    </div>
  );
}
