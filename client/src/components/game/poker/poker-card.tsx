import { useState, useEffect } from 'react';
import { Card as CardType } from './poker-game-engine';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Suit symbols and colors
const SUITS = {
  hearts: { symbol: '♥', color: 'text-red-500' },
  diamonds: { symbol: '♦', color: 'text-red-500' },
  clubs: { symbol: '♣', color: 'text-slate-800' },
  spades: { symbol: '♠', color: 'text-slate-800' },
};

// Rank display
const RANKS: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

interface PokerCardProps {
  card?: CardType;
  hidden?: boolean;
  className?: string;
  position?: number;  // Position in sequence (for animations)
  animationDelay?: number; // Delay in ms
  revealed?: boolean; // For flip animation
}

export const PokerCard: React.FC<PokerCardProps> = ({
  card,
  hidden = false,
  className = '',
  position = 0,
  animationDelay = 0,
  revealed = true
}) => {
  const [isRevealed, setIsRevealed] = useState(revealed);
  
  useEffect(() => {
    // If card is supposed to be revealed, add delay for animation
    if (revealed && !isRevealed) {
      const timer = setTimeout(() => {
        setIsRevealed(true);
      }, animationDelay);
      
      return () => clearTimeout(timer);
    }
    
    // Update reveal state when prop changes
    setIsRevealed(revealed);
  }, [revealed, animationDelay, isRevealed]);
  
  // Show card back if hidden or not revealed
  const showBack = hidden || !isRevealed;
  
  // If no card is provided, show an empty placeholder
  if (!card) {
    return (
      <div 
        className={cn(
          "relative w-24 h-36 rounded-lg bg-transparent border border-dashed border-gray-500",
          className
        )}
      />
    );
  }
  
  const { suit, rank } = card;
  const { symbol, color } = SUITS[suit];
  const rankDisplay = RANKS[rank];
  
  return (
    <motion.div
      initial={{ 
        y: -50, 
        opacity: 0,
        rotateY: showBack ? 180 : 0 
      }}
      animate={{ 
        y: 0, 
        opacity: 1,
        rotateY: showBack ? 180 : 0,
        transition: { 
          delay: animationDelay / 1000, 
          duration: 0.3,
          rotateY: { duration: 0.5 }
        }
      }}
      className={cn(
        "relative w-24 h-36 rounded-lg shadow-md perspective-1000",
        className
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Front of card */}
      <div 
        className={cn(
          "absolute w-full h-full backface-hidden rounded-lg bg-white p-2 flex flex-col",
          showBack ? 'opacity-0' : 'opacity-100'
        )}
        style={{ transform: 'rotateY(0deg)' }}
      >
        <div className="flex justify-between items-start">
          <div className={cn("text-lg font-bold", color)}>
            {rankDisplay}
          </div>
          <div className={cn("text-lg", color)}>
            {symbol}
          </div>
        </div>
        
        <div className={cn("flex-grow flex items-center justify-center text-4xl", color)}>
          {symbol}
        </div>
        
        <div className="flex justify-between items-end">
          <div className={cn("text-lg", color)}>
            {symbol}
          </div>
          <div className={cn("text-lg font-bold", color)}>
            {rankDisplay}
          </div>
        </div>
      </div>
      
      {/* Back of card */}
      <div 
        className={cn(
          "absolute w-full h-full backface-hidden rounded-lg flex items-center justify-center",
          showBack ? 'opacity-100' : 'opacity-0',
          "bg-gradient-to-br from-blue-600 to-blue-900 p-1"
        )}
        style={{ transform: 'rotateY(180deg)' }}
      >
        <div className="w-full h-full border-2 border-blue-300 rounded-md flex items-center justify-center">
          <div className="text-3xl text-white font-bold">JP</div>
        </div>
      </div>
    </motion.div>
  );
};

// A component for dealing with a collection of cards (e.g., hole cards, community cards)
interface CardGroupProps {
  cards: (CardType | undefined)[];
  hidden?: boolean[];
  className?: string;
  reveal?: boolean;
  revealDelay?: number;
}

export const CardGroup: React.FC<CardGroupProps> = ({
  cards,
  hidden = [],
  className = '',
  reveal = true,
  revealDelay = 0
}) => {
  return (
    <div className={cn("flex flex-row gap-2", className)}>
      {cards.map((card, index) => (
        <PokerCard
          key={card ? `${card.suit}-${card.rank}` : `placeholder-${index}`}
          card={card}
          hidden={hidden[index] || false}
          position={index}
          animationDelay={(index * 200) + revealDelay}
          revealed={reveal}
        />
      ))}
    </div>
  );
};

// Empty card slots for table positions
export const EmptyCardSlot: React.FC<{ count?: number; className?: string }> = ({
  count = 1,
  className = ''
}) => {
  return (
    <div className={cn("flex flex-row gap-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`empty-${index}`}
          className="w-24 h-36 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800/30"
        />
      ))}
    </div>
  );
};