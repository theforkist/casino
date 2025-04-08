import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

// Chip colors and values
const CHIP_TYPES = [
  { value: 1, color: 'bg-red-600', borderColor: 'border-red-400', textColor: 'text-white' },
  { value: 5, color: 'bg-blue-600', borderColor: 'border-blue-400', textColor: 'text-white' },
  { value: 25, color: 'bg-green-600', borderColor: 'border-green-400', textColor: 'text-white' },
  { value: 100, color: 'bg-black', borderColor: 'border-gray-400', textColor: 'text-white' },
  { value: 500, color: 'bg-purple-600', borderColor: 'border-purple-400', textColor: 'text-white' },
];

interface PokerChipProps {
  value: number;
  className?: string;
  animate?: boolean;
  delay?: number;
  onClick?: () => void;
}

export const PokerChip: React.FC<PokerChipProps> = ({ 
  value, 
  className = '',
  animate = false,
  delay = 0,
  onClick
}) => {
  // Find closest chip type
  const chipType = CHIP_TYPES.reduce((prev, curr) => {
    return Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev;
  }, CHIP_TYPES[0]);
  
  const { color, borderColor, textColor } = chipType;
  
  return (
    <motion.div
      className={cn(
        "relative w-12 h-12 rounded-full flex items-center justify-center cursor-pointer",
        "border-4 shadow-md transform hover:scale-105 transition-transform",
        color, borderColor, className
      )}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { 
        opacity: 1, 
        y: 0,
        transition: { delay: delay / 1000, duration: 0.3 }
      } : undefined}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <div className={cn(
        "absolute inset-2 rounded-full border-2 border-opacity-30", 
        borderColor
      )} />
      <span className={cn("font-bold", textColor)}>
        {value}
      </span>
    </motion.div>
  );
};

// Stack of chips to represent a bet
interface ChipStackProps {
  amount: number;
  className?: string;
  animate?: boolean;
}

export const ChipStack: React.FC<ChipStackProps> = ({ 
  amount, 
  className = '',
  animate = false
}) => {
  if (amount <= 0) return null;
  
  // Break down the amount into chips
  const chips: number[] = [];
  let remaining = amount;
  
  // Start with highest value chips
  const sortedChipValues = [...CHIP_TYPES]
    .sort((a, b) => b.value - a.value)
    .map(chip => chip.value);
  
  for (const chipValue of sortedChipValues) {
    while (remaining >= chipValue) {
      chips.push(chipValue);
      remaining -= chipValue;
    }
  }
  
  // Add any remainder as the smallest chip
  if (remaining > 0) {
    chips.push(sortedChipValues[sortedChipValues.length - 1]);
  }
  
  // Limit to show max 5 chips in stack
  const displayChips = chips.slice(0, 5);
  const extraChipsCount = chips.length - displayChips.length;
  
  return (
    <div className={cn("relative", className)}>
      {/* Stack chips with slightly offset positions */}
      {displayChips.map((chipValue, index) => (
        <div
          key={`chip-${index}`}
          className="absolute"
          style={{ 
            top: `-${index * 4}px`, 
            left: `${index % 2 === 0 ? 0 : 2}px`,
            zIndex: displayChips.length - index
          }}
        >
          <PokerChip 
            value={chipValue} 
            animate={animate} 
            delay={index * 100} 
          />
        </div>
      ))}
      
      {/* Show bet amount */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-white text-xs whitespace-nowrap">
        ${amount}{extraChipsCount > 0 ? ` (+${extraChipsCount} more)` : ''}
      </div>
    </div>
  );
};

// Betting interface with chips and controls
interface BettingControlsProps {
  playerChips: number;
  currentBet: number;
  minBet: number;
  onBet: (action: any, amount?: number) => void; // Using 'any' to avoid PlayerAction type dependency
  canCheck: boolean;
  className?: string;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  playerChips,
  currentBet,
  minBet,
  onBet,
  canCheck,
  className = ''
}) => {
  const [betAmount, setBetAmount] = useState(minBet);
  const maxBet = playerChips;
  
  // Predefined bet amounts
  const quickBets = [
    { label: 'Min', value: minBet },
    { label: '1/4 Pot', value: Math.max(minBet, Math.floor(currentBet / 4)) },
    { label: '1/2 Pot', value: Math.max(minBet, Math.floor(currentBet / 2)) },
    { label: 'Pot', value: Math.max(minBet, currentBet) },
    { label: 'All In', value: maxBet }
  ];
  
  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    setBetAmount(value[0]);
  };
  
  // Handle direct input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setBetAmount(Math.min(Math.max(minBet, value), maxBet));
    }
  };
  
  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-gray-800/90 rounded-lg", className)}>
      {/* Available chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {CHIP_TYPES.map((chip) => (
          <PokerChip
            key={`chip-${chip.value}`}
            value={chip.value}
            onClick={() => setBetAmount(Math.min(betAmount + chip.value, maxBet))}
          />
        ))}
      </div>
      
      {/* Bet amount controls */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            type="number"
            min={minBet}
            max={maxBet}
            value={betAmount}
            onChange={handleInputChange}
            className="flex-grow"
          />
          <Button 
            variant="outline" 
            onClick={() => setBetAmount(minBet)}
            className="whitespace-nowrap"
          >
            Min
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setBetAmount(maxBet)}
            className="whitespace-nowrap"
          >
            Max
          </Button>
        </div>
        
        <Slider
          min={minBet}
          max={maxBet}
          step={1}
          value={[betAmount]}
          onValueChange={handleSliderChange}
        />
        
        {/* Quick bet options */}
        <div className="flex flex-wrap gap-2 mt-2">
          {quickBets.map((bet) => (
            <Button
              key={`quick-${bet.label}`}
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(bet.value)}
              className="flex-grow"
            >
              {bet.label} (${bet.value})
            </Button>
          ))}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <Button 
          variant="destructive" 
          onClick={() => onBet('fold')}
        >
          Fold
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => onBet(canCheck ? 'check' : 'call')}
          disabled={!canCheck && playerChips === 0}
        >
          {canCheck ? 'Check' : 'Call'}
        </Button>
        
        <Button 
          variant="default" 
          onClick={() => onBet('raise', betAmount)}
          disabled={playerChips === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Raise
        </Button>
        
        <Button 
          variant="default" 
          className="col-span-3 bg-red-600 hover:bg-red-700"
          onClick={() => onBet('allin')}
          disabled={playerChips === 0}
        >
          All In (${playerChips})
        </Button>
      </div>
    </div>
  );
};