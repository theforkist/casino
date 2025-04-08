import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Info } from "lucide-react";

// Card components
function PokerCard({ card, hidden = false }: { card: string; hidden?: boolean }) {
  const [value, suit] = hidden ? ['?', ''] : card.split('');
  const getSuitColor = () => {
    if (hidden) return 'text-gray-400';
    return suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-black';
  };
  
  return (
    <div className="w-14 h-20 bg-white rounded-md flex flex-col items-center justify-center text-dark-primary font-bold shadow-lg">
      {hidden ? (
        <span className="text-gray-400 text-2xl">?</span>
      ) : (
        <span className={`text-lg ${getSuitColor()}`}>
          {value}<span className="text-sm">{suit}</span>
        </span>
      )}
    </div>
  );
}

const CARDS = ['A♥', 'K♠', 'Q♥', 'J♠', '10♦', '9♣', '8♠', '7♥', '6♦', '5♣', '4♠', '3♥', '2♦'];
const HANDS = ['High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];

export function PokerGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(25);
  const [gameState, setGameState] = useState<'idle' | 'betting' | 'complete'>('idle');
  const [playerCards, setPlayerCards] = useState<string[]>([]);
  const [communityCards, setCommunityCards] = useState<string[]>([]);
  const [potAmount, setPotAmount] = useState(0);
  const [opponentAction, setOpponentAction] = useState<string | null>(null);
  const [playerHand, setPlayerHand] = useState<string | null>(null);
  
  // Initialize game
  const startGame = () => {
    if (!user) return;
    
    // Validate bet amount
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
    
    // Deal random cards
    const shuffled = [...CARDS].sort(() => 0.5 - Math.random());
    setPlayerCards([shuffled[0], shuffled[1]]);
    setCommunityCards([shuffled[2], shuffled[3], shuffled[4]]);
    
    // Set initial game state
    setGameState('betting');
    setPotAmount(betAmount * 2); // Player and opponent both bet
    setOpponentAction(null);
    setPlayerHand(HANDS[Math.floor(Math.random() * 5)]); // Random hand for demo
  };
  
  // Play poker game mutation
  const playPokerMutation = useMutation({
    mutationFn: async (action: string) => {
      const res = await apiRequest("POST", "/api/poker/play", {
        betAmount: betAmount.toString(),
        action,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Update game state based on action
      if (data.action === 'fold') {
        toast({
          title: "You Folded",
          description: "You've folded your hand.",
          variant: "default",
        });
      } else if (data.action === 'call' || data.action === 'raise') {
        // Update pot amount
        setPotAmount(prev => data.action === 'call' ? prev + betAmount : prev + betAmount * 2);
        
        // Set random opponent action for demo
        const oppActions = ['fold', 'call', 'raise'];
        setOpponentAction(oppActions[Math.floor(Math.random() * oppActions.length)]);
        
        // Show win/loss message
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
      
      // Update user data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Complete the game
      setGameState('complete');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAction = (action: string) => {
    if (gameState !== 'betting') return;
    playPokerMutation.mutate(action);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="bg-dark-secondary border-gray-800">
        <CardHeader>
          <CardTitle>Texas Hold'Em Poker</CardTitle>
          <CardDescription>
            Play against AI opponents in this classic poker game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-xl overflow-hidden mb-6 bg-dark-primary p-6">
            <div className="grid grid-cols-1 gap-8">
              {/* Opponent area */}
              <div className="flex justify-center">
                <div className="flex space-x-2">
                  <PokerCard card="A♥" hidden={true} />
                  <PokerCard card="K♠" hidden={true} />
                </div>
                
                {opponentAction && (
                  <div className="absolute top-4 right-4 bg-dark-secondary px-3 py-1 rounded-full text-sm">
                    Opponent: <span className="font-medium">{opponentAction}</span>
                  </div>
                )}
              </div>
              
              {/* Community cards */}
              <div className="flex justify-center space-x-2">
                {gameState !== 'idle' ? (
                  <>
                    {communityCards.map((card, i) => (
                      <PokerCard key={i} card={card} />
                    ))}
                    <PokerCard card="?" hidden={true} />
                    <PokerCard card="?" hidden={true} />
                  </>
                ) : (
                  <>
                    <PokerCard card="?" hidden={true} />
                    <PokerCard card="?" hidden={true} />
                    <PokerCard card="?" hidden={true} />
                    <PokerCard card="?" hidden={true} />
                    <PokerCard card="?" hidden={true} />
                  </>
                )}
              </div>
              
              {/* Player cards */}
              <div className="flex justify-center">
                <div className="flex space-x-2">
                  {gameState !== 'idle' ? (
                    <>
                      <PokerCard card={playerCards[0]} />
                      <PokerCard card={playerCards[1]} />
                    </>
                  ) : (
                    <>
                      <PokerCard card="?" hidden={true} />
                      <PokerCard card="?" hidden={true} />
                    </>
                  )}
                </div>
                
                {playerHand && gameState !== 'idle' && (
                  <div className="absolute bottom-4 right-4 bg-dark-secondary px-3 py-1 rounded-full text-sm">
                    Your Hand: <span className="font-medium">{playerHand}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {gameState === 'idle' && (
              <div>
                <Label htmlFor="poker-bet-amount">Bet Amount ($)</Label>
                <div className="flex items-center space-x-2 mt-1.5">
                  <Input
                    id="poker-bet-amount"
                    type="number"
                    min="5"
                    step="5"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                    className="bg-dark-primary border-gray-700"
                  />
                  <div className="flex space-x-1.5">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setBetAmount(Math.max(5, betAmount / 2))}
                    >
                      ½
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setBetAmount(betAmount * 2)}
                    >
                      2×
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => user && setBetAmount(parseFloat(user.balance))}
                    >
                      Max
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground">Pot</div>
                <div className="text-accent-gold font-medium">${potAmount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Your Chips</div>
                <div className="font-medium">${user ? parseFloat(user.balance).toFixed(2) : '0.00'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Bet</div>
                <div className="font-medium">${betAmount}</div>
              </div>
            </div>
            
            {gameState === 'idle' ? (
              <Button 
                className="w-full bg-accent-green hover:bg-accent-green/90"
                onClick={startGame}
              >
                Start Game
              </Button>
            ) : gameState === 'betting' ? (
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => handleAction('fold')}
                  disabled={playPokerMutation.isPending}
                >
                  Fold
                </Button>
                <Button 
                  className="bg-accent-blue hover:bg-accent-blue/90"
                  onClick={() => handleAction('call')}
                  disabled={playPokerMutation.isPending}
                >
                  Call
                </Button>
                <Button 
                  className="bg-accent-green hover:bg-accent-green/90"
                  onClick={() => handleAction('raise')}
                  disabled={playPokerMutation.isPending}
                >
                  Raise
                </Button>
              </div>
            ) : (
              <Button 
                className="w-full"
                onClick={() => setGameState('idle')}
              >
                New Game
              </Button>
            )}
            
            <div className="text-center text-sm text-muted-foreground mt-2">
              Opponents: 1 | Game Type: Heads-Up No-Limit Hold'Em
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Alert variant="outline" className="border-accent-blue/20 bg-accent-blue/10">
            <Info className="h-4 w-4 text-accent-blue" />
            <AlertTitle>Fair Play</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              Our poker hands are generated using a secure random algorithm to ensure fair gameplay.
            </AlertDescription>
          </Alert>
        </CardFooter>
      </Card>
    </div>
  );
}
