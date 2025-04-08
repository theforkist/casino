import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/use-auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { PokerTable } from '@/components/game/poker/poker-table';
import { 
  AlertTriangle, 
  Award, 
  ChevronLeft, 
  Info, 
  RefreshCw
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function PokerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [playerChips, setPlayerChips] = useState(1000);
  const [aiChips, setAiChips] = useState(1000);
  const [gameCount, setGameCount] = useState(0);
  const [showGameEnd, setShowGameEnd] = useState(false);
  const [result, setResult] = useState<{ win: boolean; amount: number } | null>(null);
  
  // Save game result when a game ends
  const saveGameMutation = useMutation({
    mutationFn: async (data: { 
      result: 'win' | 'loss'; 
      game: string; 
      amount: number;
      details?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");
      
      const response = await apiRequest("POST", "/api/game-history", {
        userId: user.id,
        game: data.game,
        result: data.result,
        amount: data.amount,
        details: data.details || ''
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate game history cache
      queryClient.invalidateQueries({ queryKey: ["/api/game-history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving game result",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update user balance when game ends
  const updateBalanceMutation = useMutation({
    mutationFn: async (newBalance: number) => {
      if (!user) throw new Error("User not authenticated");
      
      const response = await apiRequest("POST", "/api/user/balance", {
        userId: user.id,
        balance: newBalance
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user cache
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating balance",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle end of a hand/game
  const handleGameEnd = (finalPlayerChips: number, finalAiChips: number) => {
    // Only process when actually different
    if (playerChips === finalPlayerChips && aiChips === finalAiChips) {
      return;
    }
    
    const chipDifference = finalPlayerChips - playerChips;
    
    // Record game result
    if (chipDifference !== 0) {
      const gameResult = {
        result: chipDifference > 0 ? 'win' as const : 'loss' as const,
        game: 'poker',
        amount: Math.abs(chipDifference),
        details: `Poker - ${chipDifference > 0 ? 'Won' : 'Lost'} ${Math.abs(chipDifference)} chips`
      };
      
      // Save result if user is logged in
      if (user) {
        // Save game history
        saveGameMutation.mutate(gameResult);
        
        // Update user balance
        const userBalance = typeof user.balance === 'number' ? user.balance : 0;
        const newBalance = userBalance + chipDifference;
        updateBalanceMutation.mutate(newBalance);
      }
      
      // Show toast notification
      toast({
        title: chipDifference > 0 ? "You won!" : "You lost!",
        description: `${chipDifference > 0 ? '+' : '-'}$${Math.abs(chipDifference)}`,
        variant: chipDifference > 0 ? "default" : "destructive",
      });
      
      // Set result state
      setResult({
        win: chipDifference > 0,
        amount: Math.abs(chipDifference)
      });
      
      // Show game end popup if player is out of chips
      if (finalPlayerChips <= 0 || finalAiChips <= 0) {
        setShowGameEnd(true);
      }
    }
    
    // Update chips
    setPlayerChips(finalPlayerChips);
    setAiChips(finalAiChips);
  };
  
  // Start a new game
  const handleNewGame = () => {
    setPlayerChips(1000);
    setAiChips(1000);
    setGameCount(gameCount + 1);
    setShowGameEnd(false);
    setResult(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Helmet>
        <title>Poker | JohnsProperty Casino</title>
      </Helmet>
      
      {/* Header bar */}
      <div className="relative bg-gray-800 px-4 py-3 shadow-md flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="text-gray-400 hover:text-white"
        >
          <a href="/">
            <ChevronLeft className="h-5 w-5" />
          </a>
        </Button>
        
        <h1 className="text-xl font-bold text-center">Texas Hold'Em Poker</h1>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <Info className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Texas Hold'Em Poker</SheetTitle>
              <SheetDescription>
                Play heads-up Texas Hold'Em against our AI dealer
              </SheetDescription>
            </SheetHeader>
            
            <div className="py-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="rules">
                  <AccordionTrigger>Rules</AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li>Each player is dealt two private cards ("hole cards").</li>
                      <li>Five community cards are dealt face-up on the "board".</li>
                      <li>Each player seeks the best five-card poker hand from any combination of their two hole cards and the five community cards.</li>
                      <li>Players bet in multiple rounds as cards are revealed.</li>
                      <li>The player with the best hand wins the pot.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="hand-rankings">
                  <AccordionTrigger>Hand Rankings</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      <li><strong>Royal Flush:</strong> A, K, Q, J, 10 of the same suit</li>
                      <li><strong>Straight Flush:</strong> Five sequential cards of the same suit</li>
                      <li><strong>Four of a Kind:</strong> Four cards of the same rank</li>
                      <li><strong>Full House:</strong> Three of a kind plus a pair</li>
                      <li><strong>Flush:</strong> Five cards of the same suit</li>
                      <li><strong>Straight:</strong> Five sequential cards</li>
                      <li><strong>Three of a Kind:</strong> Three cards of the same rank</li>
                      <li><strong>Two Pair:</strong> Two different pairs</li>
                      <li><strong>Pair:</strong> Two cards of the same rank</li>
                      <li><strong>High Card:</strong> Highest card plays</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="betting">
                  <AccordionTrigger>Betting Rounds</AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                      <li><strong>Pre-Flop:</strong> After receiving hole cards, betting begins.</li>
                      <li><strong>Flop:</strong> First three community cards are dealt, followed by betting.</li>
                      <li><strong>Turn:</strong> Fourth community card is dealt, followed by betting.</li>
                      <li><strong>River:</strong> Final community card is dealt, followed by betting.</li>
                      <li><strong>Showdown:</strong> If multiple players remain, best hand wins.</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Game area */}
        <div className="mb-8">
          <PokerTable 
            key={`game-${gameCount}`}
            playerChips={playerChips}
            aiChips={aiChips}
            onGameEnd={handleGameEnd}
            className="shadow-2xl"
          />
        </div>
        
        {/* Game controls */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            variant="outline"
            size="lg"
            onClick={handleNewGame}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Reset Game
          </Button>
        </div>
        
        {/* Game end popup */}
        {showGameEnd && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {playerChips > 0 ? (
                    <>
                      <Award className="h-6 w-6 text-yellow-400" />
                      You Won!
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                      Game Over
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {playerChips > 0 
                    ? "Congratulations! You've defeated the AI dealer!"
                    : "You're out of chips! Better luck next time."}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold mb-2">
                    {playerChips > 0 ? `+$${playerChips - 1000}` : '-$1000'}
                  </div>
                  <div className="text-gray-400">
                    Final Balance: ${playerChips}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-center">
                <Button size="lg" onClick={handleNewGame}>
                  Play Again
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}