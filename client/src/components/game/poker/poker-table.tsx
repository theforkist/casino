import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PokerGame, GameState, PlayerAction } from './poker-game-engine';
import { PokerCard, CardGroup, EmptyCardSlot } from './poker-card';
import { ChipStack, BettingControls } from './poker-chips';
import { Button } from '@/components/ui/button';
import { 
  ArrowRightCircle, 
  Award, 
  ThumbsUp, 
  ThumbsDown, 
  Check, 
  RefreshCw, 
  AlertTriangle
} from 'lucide-react';

interface PokerTableProps {
  playerChips: number;
  aiChips: number;
  onGameEnd?: (playerChips: number, aiChips: number) => void;
  className?: string;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  playerChips = 1000,
  aiChips = 1000,
  onGameEnd,
  className = ''
}) => {
  // Game engine
  const [game] = useState(() => new PokerGame(playerChips, aiChips));
  const [gameState, setGameState] = useState<GameState>(game.state);
  const [handInProgress, setHandInProgress] = useState(false);
  const [playerTurn, setPlayerTurn] = useState(false);
  const [handEvaluation, setHandEvaluation] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  
  // Current game info
  const isPlayerTurn = gameState.currentPlayerIndex === 0 && !gameState.roundOver;
  const isAiTurn = gameState.currentPlayerIndex === 1 && !gameState.roundOver;
  const player = gameState.players[0];
  const ai = gameState.players[1];
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // Start a new hand
  const startHand = () => {
    game.startHand();
    setGameState({...game.state});
    setHandInProgress(true);
    setPlayerTurn(game.state.currentPlayerIndex === 0);
    setHandEvaluation(null);
    setShowAnimation('');
  };

  // Handle player actions
  const handlePlayerAction = (action: any, amount?: number) => {
    if (!isPlayerTurn) return;
    
    try {
      // Handle the action in the game engine
      switch (action) {
        case 'fold':
          game.playerAction('fold');
          break;
        case 'check':
          game.playerAction('check');
          break;
        case 'call':
          game.playerAction('call');
          break;
        case 'raise':
          if (amount) {
            game.playerAction('raise', amount);
          }
          break;
        case 'allin':
          game.playerAction('allin');
          break;
      }
      
      // Update state
      setGameState({...game.state});
      setPlayerTurn(false);
      
      // Show animation based on action
      setShowAnimation(action);
      setTimeout(() => setShowAnimation(''), 1500);
      
      // If the AI is next, start AI turn
      if (game.state.currentPlayerIndex === 1 && !game.state.roundOver) {
        handleAiTurn();
      }
      
      // If the hand is over, update evaluations
      if (game.state.roundOver) {
        updateHandEvaluation();
      }
    } catch (error) {
      console.error('Error processing player action:', error);
    }
  };
  
  // Handle AI's turn
  const handleAiTurn = () => {
    if (game.state.roundOver) return;
    
    setAiThinking(true);
    
    // Simulate AI thinking time (500-1500ms)
    const thinkingTime = 500 + Math.random() * 1000;
    
    setTimeout(() => {
      try {
        // Make AI decision
        game.aiAction();
        
        // Update state
        setGameState({...game.state});
        setAiThinking(false);
        
        // If the hand is over, update evaluations
        if (game.state.roundOver) {
          updateHandEvaluation();
        }
      } catch (error) {
        console.error('Error during AI turn:', error);
        setAiThinking(false);
      }
    }, thinkingTime);
  };
  
  // Update displayed hand evaluation
  const updateHandEvaluation = () => {
    if (!player.handEvaluation) return;
    
    setHandEvaluation(player.handEvaluation.description);
    
    // Notify about game end if someone is out of chips
    if ((player.chips <= 0 || ai.chips <= 0) && onGameEnd) {
      onGameEnd(player.chips, ai.chips);
    }
  };
  
  // Handle AI turns automatically
  useEffect(() => {
    if (isAiTurn && !aiThinking) {
      handleAiTurn();
    }
  }, [isAiTurn, aiThinking]);

  // Auto-evaluate hand when community cards change
  useEffect(() => {
    if (gameState.communityCards.length >= 3 && player.holeCards.length === 2) {
      try {
        const cards = [...player.holeCards, ...gameState.communityCards];
        if (cards.length >= 5) {
          const evaluation = game.evaluateHand(cards);
          setHandEvaluation(evaluation.description);
        }
      } catch (error) {
        console.error('Error evaluating hand:', error);
      }
    }
  }, [gameState.communityCards.length]);
  
  // Player can check if there's no bet to call
  const canCheck = gameState.currentBet <= player.bet;
  
  // Render stage name
  const getStageName = () => {
    switch (gameState.stage) {
      case 'preflop': return 'Pre-Flop';
      case 'flop': return 'Flop';
      case 'turn': return 'Turn';
      case 'river': return 'River';
      case 'showdown': return 'Showdown';
      default: return '';
    }
  };
  
  // Render action animation
  const renderActionAnimation = () => {
    if (!showAnimation) return null;
    
    let icon = null;
    let text = '';
    let bgColor = '';
    
    switch (showAnimation) {
      case 'fold':
        icon = <ThumbsDown className="w-8 h-8" />;
        text = 'Fold';
        bgColor = 'bg-red-600';
        break;
      case 'check':
        icon = <Check className="w-8 h-8" />;
        text = 'Check';
        bgColor = 'bg-blue-600';
        break;
      case 'call':
        icon = <ThumbsUp className="w-8 h-8" />;
        text = 'Call';
        bgColor = 'bg-green-600';
        break;
      case 'raise':
        icon = <ArrowRightCircle className="w-8 h-8" />;
        text = 'Raise';
        bgColor = 'bg-purple-600';
        break;
      case 'allin':
        icon = <AlertTriangle className="w-8 h-8" />;
        text = 'All In!';
        bgColor = 'bg-red-600';
        break;
    }
    
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className={cn(
          "absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2",
          "px-6 py-3 rounded-full z-50 flex items-center gap-2 text-white font-bold",
          bgColor
        )}
      >
        {icon}
        <span className="text-2xl">{text}</span>
      </motion.div>
    );
  };
  
  return (
    <div className={cn(
      "relative w-full max-w-4xl mx-auto aspect-[16/9] rounded-[12rem] overflow-hidden",
      "bg-gradient-to-b from-green-800 to-green-900 shadow-xl border-8 border-brown-900",
      className
    )}>
      {/* Felt table with markings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute inset-0 border-[3rem] border-brown-800 rounded-[10rem]" />
        
        <div className="absolute inset-[3rem] rounded-[7rem] bg-green-700 flex items-center justify-center">
          {/* Table logo */}
          <div className="absolute text-white/20 text-5xl font-bold select-none">
            JP CASINO
          </div>
          
          {/* Action animation */}
          <AnimatePresence>
            {renderActionAnimation()}
          </AnimatePresence>
          
          {/* AI player area */}
          <div className="absolute top-8 inset-x-0 flex flex-col items-center">
            <div className="relative mb-4">
              {/* AI avatar/chips area */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-2 text-white font-bold">
                    AI
                  </div>
                  <div className="px-3 py-1 bg-black/70 rounded-full text-white text-sm">
                    ${gameState.players[1].chips}
                  </div>
                </div>
                
                {/* AI bet area */}
                {gameState.players[1].bet > 0 && (
                  <div className="transform translate-y-4">
                    <ChipStack 
                      amount={gameState.players[1].bet} 
                      animate={true}
                    />
                  </div>
                )}
              </div>
              
              {/* AI action indicator */}
              {aiThinking && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-600 rounded-full text-white text-xs animate-pulse">
                  Thinking...
                </div>
              )}
              
              {isAiTurn && !aiThinking && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-600 rounded-full text-white text-xs">
                  AI's Turn
                </div>
              )}
            </div>
            
            {/* AI cards */}
            <CardGroup
              cards={gameState.players[1].holeCards}
              hidden={gameState.players[1].holeCards.map(c => 
                c.hidden !== undefined ? c.hidden : gameState.stage !== 'showdown'
              )}
              reveal={gameState.stage === 'showdown' || gameState.roundOver}
            />
          </div>
          
          {/* Community cards area */}
          <div className="flex flex-col items-center justify-center">
            <div className="mb-2 px-3 py-1 bg-black/70 rounded-full text-white text-sm">
              {getStageName()}
              {gameState.mainPot > 0 && (
                <span className="ml-2 font-bold">Pot: ${gameState.mainPot}</span>
              )}
            </div>
            
            {/* Community cards */}
            {gameState.communityCards.length > 0 ? (
              <CardGroup 
                cards={gameState.communityCards}
                reveal={true}
              />
            ) : (
              <EmptyCardSlot count={5} />
            )}
            
            {/* Hand evaluation */}
            {handEvaluation && (
              <div className="mt-2 px-4 py-1 bg-purple-700/90 rounded-full text-white font-medium">
                {handEvaluation}
              </div>
            )}
          </div>
          
          {/* Player area */}
          <div className="absolute bottom-8 inset-x-0 flex flex-col items-center">
            {/* Player cards */}
            <CardGroup
              cards={gameState.players[0].holeCards}
              className="mb-4"
            />
            
            {/* Player avatar/chips and bet area */}
            <div className="flex items-center gap-4">
              {/* Player bet area */}
              {gameState.players[0].bet > 0 && (
                <div className="transform -translate-y-4">
                  <ChipStack 
                    amount={gameState.players[0].bet} 
                    animate={true}
                  />
                </div>
              )}
              
              <div className="flex flex-col items-center relative">
                <div className="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center mb-2 text-white font-bold">
                  YOU
                </div>
                <div className="px-3 py-1 bg-black/70 rounded-full text-white text-sm">
                  ${gameState.players[0].chips}
                </div>
                
                {/* Player turn indicator */}
                {isPlayerTurn && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-600 rounded-full text-white text-xs">
                    Your Turn
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Game controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center p-4 z-10">
        {!handInProgress && (
          <Button 
            size="lg"
            onClick={startHand}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Deal New Hand
          </Button>
        )}
        
        {gameState.roundOver && handInProgress && (
          <Button 
            size="lg"
            onClick={startHand}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Next Hand
          </Button>
        )}
      </div>
      
      {/* Winner announcement */}
      <AnimatePresence>
        {gameState.roundOver && gameState.winners.length > 0 && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg px-6 py-3 flex items-center gap-3 z-10"
          >
            <Award className="w-6 h-6 text-yellow-400" />
            <div className="text-white">
              <div className="font-bold text-xl">
                {gameState.winners[0].name} Wins!
              </div>
              {gameState.winners[0].handEvaluation && (
                <div className="text-sm">
                  With {gameState.winners[0].handEvaluation.description}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Player betting controls */}
      {isPlayerTurn && (
        <div className="absolute right-0 bottom-32 z-10">
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="mr-6"
          >
            <BettingControls
              playerChips={player.chips}
              currentBet={gameState.currentBet}
              minBet={gameState.minBet}
              onBet={handlePlayerAction}
              canCheck={canCheck}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};