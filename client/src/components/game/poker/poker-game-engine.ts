/**
 * Texas Hold'Em Poker Game Engine
 * Handles game logic, card management, hand evaluation, and AI decision making
 */

import * as crypto from 'crypto';

// Card structure
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J, 12=Q, 13=K, 14=A
  hidden?: boolean;
}

// Game stages
export type GameStage = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

// Player actions
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'allin';

// Poker hand ranks (from lowest to highest)
export type HandRank = 
  'high-card' | 'pair' | 'two-pair' | 'three-kind' | 'straight' | 
  'flush' | 'full-house' | 'four-kind' | 'straight-flush' | 'royal-flush';

// Hand evaluation result
export interface HandEvaluation {
  rank: HandRank;
  cards: Card[];
  description: string;
  value: number; // Numeric rank for comparison
}

// Player information
export interface Player {
  id: string;
  name: string;
  chips: number;
  bet: number;
  folded: boolean;
  isAI: boolean;
  holeCards: Card[];
  handEvaluation?: HandEvaluation;
}

// Pot information
export interface Pot {
  amount: number;
  eligiblePlayers: string[]; // Player IDs
}

// Game state
export interface GameState {
  deck: Card[];
  players: Player[];
  communityCards: Card[];
  stage: GameStage;
  currentPlayerIndex: number;
  dealerIndex: number;
  pots: Pot[];
  mainPot: number;
  minBet: number;
  currentBet: number;
  winners: Player[];
  roundOver: boolean;
  log: string[];
}

// Constants
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
const STARTING_CHIPS = 1000;
const SMALL_BLIND = 5;
const BIG_BLIND = 10;
const MIN_BET = BIG_BLIND;

/**
 * Represents a complete poker game
 */
export class PokerGame {
  state: GameState;
  
  constructor(userChips = STARTING_CHIPS, aiChips = STARTING_CHIPS) {
    // Initialize a new game
    this.state = {
      deck: this.createShuffledDeck(),
      players: [
        {
          id: 'player',
          name: 'You',
          chips: userChips,
          bet: 0,
          folded: false,
          isAI: false,
          holeCards: []
        },
        {
          id: 'ai',
          name: 'Dealer',
          chips: aiChips,
          bet: 0,
          folded: false,
          isAI: true,
          holeCards: []
        }
      ],
      communityCards: [],
      stage: 'preflop',
      currentPlayerIndex: 0,
      dealerIndex: 1, // AI starts as dealer
      pots: [],
      mainPot: 0,
      minBet: MIN_BET,
      currentBet: 0,
      winners: [],
      roundOver: false,
      log: ['New game started']
    };
  }
  
  /**
   * Creates a fresh shuffled deck using cryptographic randomness
   */
  createShuffledDeck(): Card[] {
    const deck: Card[] = [];
    
    // Create a standard 52-card deck
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    
    // Shuffle using Fisher-Yates algorithm with cryptographic randomness
    for (let i = deck.length - 1; i > 0; i--) {
      // Generate cryptographically secure random number
      const j = Math.floor(this.getSecureRandom() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
  }
  
  /**
   * Generate a cryptographically secure random number between 0 and 1
   */
  getSecureRandom(): number {
    // Use Node.js crypto for server-side
    if (typeof window === 'undefined' && typeof crypto !== 'undefined') {
      const buffer = crypto.randomBytes(4);
      // Convert to a number between 0 and 1
      return buffer.readUInt32BE(0) / 0xFFFFFFFF;
    }
    // Use browser's crypto API for client-side
    else if (typeof window !== 'undefined' && window.crypto) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] / 0xFFFFFFFF;
    }
    // Fallback (less secure)
    else {
      console.warn('Secure random number generation not available');
      return Math.random();
    }
  }
  
  /**
   * Start a new hand (deal cards, post blinds)
   */
  startHand(): void {
    // Reset game state
    this.state.deck = this.createShuffledDeck();
    this.state.communityCards = [];
    this.state.mainPot = 0;
    this.state.pots = [];
    this.state.currentBet = 0;
    this.state.stage = 'preflop';
    this.state.roundOver = false;
    this.state.winners = [];
    this.state.log = ['New hand started'];
    
    // Reset player states
    for (const player of this.state.players) {
      player.bet = 0;
      player.folded = false;
      player.holeCards = [];
      player.handEvaluation = undefined;
    }
    
    // Rotate dealer position (button)
    this.state.dealerIndex = (this.state.dealerIndex + 1) % this.state.players.length;
    
    // Determine small and big blind positions
    const smallBlindPos = (this.state.dealerIndex + 1) % this.state.players.length;
    const bigBlindPos = (this.state.dealerIndex + 2) % this.state.players.length;
    
    // Post blinds
    this.postBlind(smallBlindPos, SMALL_BLIND);
    this.postBlind(bigBlindPos, BIG_BLIND);
    
    // Set current bet to big blind
    this.state.currentBet = BIG_BLIND;
    
    // Deal hole cards
    this.dealHoleCards();
    
    // First player to act is after big blind
    this.state.currentPlayerIndex = (bigBlindPos + 1) % this.state.players.length;
    
    // Log the action
    this.state.log.push(`Blinds posted: Small blind ${SMALL_BLIND}, Big blind ${BIG_BLIND}`);
  }
  
  /**
   * Post a blind bet for a player
   */
  postBlind(playerIndex: number, amount: number): void {
    const player = this.state.players[playerIndex];
    
    // Adjust amount if player doesn't have enough chips
    const actualAmount = Math.min(amount, player.chips);
    
    player.bet = actualAmount;
    player.chips -= actualAmount;
    this.state.mainPot += actualAmount;
    
    // Log the action
    this.state.log.push(`${player.name} posts ${actualAmount} ${amount === SMALL_BLIND ? 'small blind' : 'big blind'}`);
  }
  
  /**
   * Deal hole cards to all players
   */
  dealHoleCards(): void {
    for (const player of this.state.players) {
      // Each player gets 2 cards
      player.holeCards = [
        this.drawCard(),
        this.drawCard()
      ];
      
      // Hide AI cards initially
      if (player.isAI) {
        player.holeCards.forEach(card => card.hidden = true);
      }
    }
    
    // Log the action
    this.state.log.push('Hole cards dealt');
  }
  
  /**
   * Draw a card from the deck
   */
  drawCard(): Card {
    if (this.state.deck.length === 0) {
      throw new Error('No cards left in deck');
    }
    return this.state.deck.pop()!;
  }
  
  /**
   * Process a player action (fold, check, call, raise)
   */
  playerAction(action: PlayerAction, amount = 0): void {
    const player = this.state.players[this.state.currentPlayerIndex];
    
    switch (action) {
      case 'fold':
        player.folded = true;
        this.state.log.push(`${player.name} folds`);
        break;
        
      case 'check':
        // Can only check if no bet to call
        if (this.state.currentBet > player.bet) {
          throw new Error('Cannot check when there is a bet to call');
        }
        this.state.log.push(`${player.name} checks`);
        break;
        
      case 'call':
        const callAmount = Math.min(this.state.currentBet - player.bet, player.chips);
        player.chips -= callAmount;
        player.bet += callAmount;
        this.state.mainPot += callAmount;
        this.state.log.push(`${player.name} calls ${callAmount}`);
        break;
        
      case 'raise':
        // Validate minimum raise amount
        if (amount < this.state.minBet) {
          amount = this.state.minBet;
        }
        
        // Calculate total amount to put in (call amount + raise amount)
        const totalBet = this.state.currentBet + amount;
        const raiseAmount = Math.min(totalBet - player.bet, player.chips);
        
        player.chips -= raiseAmount;
        player.bet += raiseAmount;
        this.state.mainPot += raiseAmount;
        this.state.currentBet = player.bet;
        
        this.state.log.push(`${player.name} raises to ${player.bet}`);
        break;
        
      case 'allin':
        const allinAmount = player.chips;
        player.bet += allinAmount;
        player.chips = 0;
        this.state.mainPot += allinAmount;
        
        // If all-in is higher than current bet, update current bet
        if (player.bet > this.state.currentBet) {
          this.state.currentBet = player.bet;
        }
        
        this.state.log.push(`${player.name} goes all-in with ${allinAmount}`);
        break;
    }
    
    // Move to next player
    this.nextPlayer();
  }
  
  /**
   * AI makes a decision based on hand strength and game state
   */
  aiAction(): void {
    const ai = this.getCurrentPlayer();
    
    if (!ai.isAI) {
      throw new Error('Current player is not AI');
    }
    
    // Calculate hand strength (0-1)
    const handStrength = this.calculateAIHandStrength();
    
    // Add some randomness for bluffing
    const bluffFactor = this.getSecureRandom() * 0.2; // 0-0.2 randomness
    
    // Decide action based on effective hand strength (with bluff factor)
    const effectiveStrength = handStrength + bluffFactor;
    
    // Call amount needed
    const callAmount = this.state.currentBet - ai.bet;
    
    // Is this a preflop decision?
    const isPreflop = this.state.stage === 'preflop';
    
    // Decision making
    if (ai.chips === 0) {
      // AI has no chips, auto-check
      this.playerAction('check');
      return;
    }
    
    if (callAmount === 0) {
      // No bet to call - can check or raise
      if (effectiveStrength > 0.7) {
        // Strong hand - raise
        const raiseAmount = Math.floor(this.state.mainPot * 0.5 * effectiveStrength);
        this.playerAction('raise', Math.max(this.state.minBet, raiseAmount));
      } else if (effectiveStrength > 0.3) {
        // Medium hand - small raise
        this.playerAction('raise', this.state.minBet);
      } else {
        // Weak hand - check
        this.playerAction('check');
      }
    } else {
      // There's a bet to call
      if (effectiveStrength > 0.8) {
        // Very strong hand - raise big
        const raiseAmount = Math.floor(this.state.mainPot * 0.75 * effectiveStrength);
        this.playerAction('raise', Math.max(this.state.minBet, raiseAmount));
      } else if (effectiveStrength > 0.6) {
        // Strong hand - smaller raise
        const raiseAmount = Math.floor(this.state.mainPot * 0.3 * effectiveStrength);
        this.playerAction('raise', Math.max(this.state.minBet, raiseAmount));
      } else if (effectiveStrength > 0.4 || (isPreflop && effectiveStrength > 0.3)) {
        // Medium hand or decent preflop hand - call
        this.playerAction('call');
      } else {
        // Weak hand - fold
        this.playerAction('fold');
      }
    }
  }
  
  /**
   * Calculate AI hand strength for decision making (0-1 scale)
   */
  calculateAIHandStrength(): number {
    const ai = this.getCurrentPlayer();
    
    // Get all available cards (hole + community)
    const availableCards = [...ai.holeCards, ...this.state.communityCards];
    
    // If preflop, use simplified calculation based on hole cards
    if (this.state.stage === 'preflop') {
      return this.calculatePreflopHandStrength(ai.holeCards);
    }
    
    // Evaluate hand using all available cards
    const evaluation = this.evaluateHand(availableCards);
    
    // Convert hand rank to a strength value (0-1)
    let strength = 0;
    
    switch (evaluation.rank) {
      case 'high-card':
        strength = 0.1 + (this.getHighCardValue(evaluation.cards[0]) / 14) * 0.1;
        break;
      case 'pair':
        strength = 0.2 + (this.getPairValue(evaluation.cards) / 14) * 0.1;
        break;
      case 'two-pair':
        strength = 0.3 + (this.getHighestPairValue(evaluation.cards) / 14) * 0.1;
        break;
      case 'three-kind':
        strength = 0.4 + (this.getThreeKindValue(evaluation.cards) / 14) * 0.1;
        break;
      case 'straight':
        strength = 0.5 + (this.getHighCardValue(evaluation.cards[0]) / 14) * 0.1;
        break;
      case 'flush':
        strength = 0.6 + (this.getHighCardValue(evaluation.cards[0]) / 14) * 0.1;
        break;
      case 'full-house':
        strength = 0.7 + (this.getThreeKindValue(evaluation.cards) / 14) * 0.1;
        break;
      case 'four-kind':
        strength = 0.8 + (this.getFourKindValue(evaluation.cards) / 14) * 0.1;
        break;
      case 'straight-flush':
        strength = 0.9 + (this.getHighCardValue(evaluation.cards[0]) / 14) * 0.1;
        break;
      case 'royal-flush':
        strength = 1.0;
        break;
    }
    
    // Consider the stage - earlier stages should be more cautious
    if (this.state.stage === 'flop') {
      strength *= 0.85; // Reduce confidence on flop
    } else if (this.state.stage === 'turn') {
      strength *= 0.95; // Slightly reduce confidence on turn
    }
    
    return strength;
  }
  
  /**
   * Calculate preflop hand strength based on hole cards
   */
  calculatePreflopHandStrength(holeCards: Card[]): number {
    // Extract ranks
    const ranks = holeCards.map(card => card.rank);
    const suits = holeCards.map(card => card.suit);
    
    // Pair
    if (ranks[0] === ranks[1]) {
      // Pair value (higher pairs are better)
      const pairRank = ranks[0];
      // Scale from 0.5 (pair of 2s) to 0.9 (pair of Aces)
      return 0.5 + ((pairRank - 2) / 12) * 0.4;
    }
    
    // Suited cards
    const suited = suits[0] === suits[1];
    
    // High cards (A, K, Q, J)
    const hasAce = ranks.includes(14);
    const hasKing = ranks.includes(13);
    const hasQueen = ranks.includes(12);
    const hasJack = ranks.includes(11);
    
    // Connected cards (sequential ranks)
    const diff = Math.abs(ranks[0] - ranks[1]);
    const connected = diff === 1;
    const closelyConnected = diff <= 3;
    
    // Calculate strength
    let strength = 0.2; // Base strength
    
    // Add value for high cards
    if (hasAce) strength += 0.15;
    if (hasKing) strength += 0.1;
    if (hasQueen) strength += 0.05;
    if (hasJack) strength += 0.03;
    
    // Add value for suited cards
    if (suited) strength += 0.1;
    
    // Add value for connected cards
    if (connected) strength += 0.1;
    else if (closelyConnected) strength += 0.05;
    
    // Premium hands
    if (hasAce && hasKing) strength += 0.1;
    if (suited && connected && (hasAce || hasKing)) strength += 0.1;
    
    // Cap at 0.95 (pair of aces is still better)
    return Math.min(0.95, strength);
  }
  
  /**
   * Helper functions for hand strength calculation
   */
  getHighCardValue(card: Card): number {
    return card.rank;
  }
  
  getPairValue(cards: Card[]): number {
    // Find the pair value
    const rankCounts = this.countRanks(cards);
    
    // Convert entries to array before iterating
    const pairRank = Array.from(rankCounts.entries())
      .find(([_, count]) => count === 2);
      
    return pairRank ? parseInt(pairRank[0]) : 0;
  }
  
  getHighestPairValue(cards: Card[]): number {
    // Find the highest pair value
    const rankCounts = this.countRanks(cards);
    let highestPair = 0;
    
    // Convert entries to array before iterating
    Array.from(rankCounts.entries()).forEach(([rank, count]) => {
      if (count === 2 && parseInt(rank) > highestPair) {
        highestPair = parseInt(rank);
      }
    });
    
    return highestPair;
  }
  
  getThreeKindValue(cards: Card[]): number {
    // Find the three of a kind value
    const rankCounts = this.countRanks(cards);
    
    // Convert entries to array before iterating
    const threeRank = Array.from(rankCounts.entries())
      .find(([_, count]) => count === 3);
      
    return threeRank ? parseInt(threeRank[0]) : 0;
  }
  
  getFourKindValue(cards: Card[]): number {
    // Find the four of a kind value
    const rankCounts = this.countRanks(cards);
    
    // Convert entries to array before iterating
    const fourRank = Array.from(rankCounts.entries())
      .find(([_, count]) => count === 4);
      
    return fourRank ? parseInt(fourRank[0]) : 0;
  }
  
  /**
   * Move to the next player's turn
   */
  nextPlayer(): void {
    const startingIndex = this.state.currentPlayerIndex;
    
    do {
      // Move to next player
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      
      // If we've gone all the way around to the starting player, break
      if (this.state.currentPlayerIndex === startingIndex) {
        break;
      }
    } while (
      // Skip players who are folded or all-in
      this.state.players[this.state.currentPlayerIndex].folded || 
      this.state.players[this.state.currentPlayerIndex].chips === 0
    );
    
    // Check if the betting round is complete
    this.checkBettingRoundComplete();
  }
  
  /**
   * Check if the current betting round is complete
   */
  checkBettingRoundComplete(): void {
    // Get active players (not folded)
    const activePlayers = this.state.players.filter(p => !p.folded);
    
    // If only one player remains, they win
    if (activePlayers.length === 1) {
      this.endHand([activePlayers[0]]);
      return;
    }
    
    // Check if all active players have the same bet or are all-in
    const allBetsEqual = activePlayers.every(p => 
      p.bet === this.state.currentBet || p.chips === 0
    );
    
    // If all bets are equal, move to the next stage
    if (allBetsEqual) {
      this.moveToNextStage();
    }
  }
  
  /**
   * Move to the next stage of the game
   */
  moveToNextStage(): void {
    switch (this.state.stage) {
      case 'preflop':
        this.dealFlop();
        break;
        
      case 'flop':
        this.dealTurn();
        break;
        
      case 'turn':
        this.dealRiver();
        break;
        
      case 'river':
        this.showdown();
        break;
        
      case 'showdown':
        // Game is over, start a new hand
        this.state.roundOver = true;
        break;
    }
    
    // Reset bets for the new stage
    this.resetBetsForNewStage();
  }
  
  /**
   * Reset bets for a new betting stage
   */
  resetBetsForNewStage(): void {
    // Reset current bet
    this.state.currentBet = 0;
    
    // Reset player bets (but not chips already in pot)
    for (const player of this.state.players) {
      player.bet = 0;
    }
    
    // First player to act is after the dealer
    this.state.currentPlayerIndex = (this.state.dealerIndex + 1) % this.state.players.length;
    
    // Skip players who have folded or are all-in
    while (
      this.state.players[this.state.currentPlayerIndex].folded || 
      this.state.players[this.state.currentPlayerIndex].chips === 0
    ) {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      
      // If we've gone all the way around, break
      if (this.state.currentPlayerIndex === (this.state.dealerIndex + 1) % this.state.players.length) {
        break;
      }
    }
  }
  
  /**
   * Deal the flop (first 3 community cards)
   */
  dealFlop(): void {
    // Burn a card
    this.drawCard();
    
    // Deal 3 cards
    this.state.communityCards.push(this.drawCard());
    this.state.communityCards.push(this.drawCard());
    this.state.communityCards.push(this.drawCard());
    
    this.state.stage = 'flop';
    this.state.log.push('Flop dealt');
  }
  
  /**
   * Deal the turn (4th community card)
   */
  dealTurn(): void {
    // Burn a card
    this.drawCard();
    
    // Deal 1 card
    this.state.communityCards.push(this.drawCard());
    
    this.state.stage = 'turn';
    this.state.log.push('Turn dealt');
  }
  
  /**
   * Deal the river (5th and final community card)
   */
  dealRiver(): void {
    // Burn a card
    this.drawCard();
    
    // Deal 1 card
    this.state.communityCards.push(this.drawCard());
    
    this.state.stage = 'river';
    this.state.log.push('River dealt');
  }
  
  /**
   * Determine the winner(s) at showdown
   */
  showdown(): void {
    this.state.stage = 'showdown';
    
    // Reveal all cards
    for (const player of this.state.players) {
      if (player.holeCards) {
        player.holeCards.forEach(card => card.hidden = false);
      }
    }
    
    // Get active players (not folded)
    const activePlayers = this.state.players.filter(p => !p.folded);
    
    // Evaluate each player's hand
    for (const player of activePlayers) {
      const allCards = [...player.holeCards, ...this.state.communityCards];
      player.handEvaluation = this.evaluateHand(allCards);
      
      this.state.log.push(`${player.name} has ${player.handEvaluation.description}`);
    }
    
    // Sort players by hand rank
    activePlayers.sort((a, b) => {
      if (!a.handEvaluation || !b.handEvaluation) return 0;
      return b.handEvaluation.value - a.handEvaluation.value;
    });
    
    // Determine winner(s)
    const winners: Player[] = [];
    let highestValue = -1;
    
    for (const player of activePlayers) {
      if (!player.handEvaluation) continue;
      
      if (winners.length === 0 || player.handEvaluation.value === highestValue) {
        winners.push(player);
        highestValue = player.handEvaluation.value;
      }
    }
    
    // Award pot
    this.awardPot(winners);
    
    // Save winners to state
    this.state.winners = winners;
    
    // Log the winners
    if (winners.length === 1) {
      this.state.log.push(`${winners[0].name} wins ${this.state.mainPot} with ${winners[0].handEvaluation?.description}`);
    } else {
      const names = winners.map(w => w.name).join(', ');
      this.state.log.push(`Pot split between ${names}`);
    }
    
    this.state.roundOver = true;
  }
  
  /**
   * Award the pot to the winner(s)
   */
  awardPot(winners: Player[]): void {
    if (winners.length === 0) return;
    
    // Split pot evenly among winners
    const amountPerWinner = Math.floor(this.state.mainPot / winners.length);
    
    for (const winner of winners) {
      winner.chips += amountPerWinner;
    }
    
    // If there's a remainder due to odd chip, give it to the first winner
    const remainder = this.state.mainPot % winners.length;
    if (remainder > 0) {
      winners[0].chips += remainder;
    }
    
    // Reset pot
    this.state.mainPot = 0;
  }
  
  /**
   * End the hand early (e.g., when all but one player folds)
   */
  endHand(winners: Player[]): void {
    // Award pot to winner
    this.awardPot(winners);
    
    // Save winners to state
    this.state.winners = winners;
    
    // Log the winner
    this.state.log.push(`${winners[0].name} wins ${this.state.mainPot}`);
    
    // Reveal all cards
    for (const player of this.state.players) {
      if (player.holeCards) {
        player.holeCards.forEach(card => card.hidden = false);
      }
    }
    
    this.state.stage = 'showdown';
    this.state.roundOver = true;
  }
  
  /**
   * Get the current player
   */
  getCurrentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex];
  }
  
  /**
   * Evaluate a poker hand to determine its rank
   */
  evaluateHand(cards: Card[]): HandEvaluation {
    if (cards.length < 5) {
      throw new Error('At least 5 cards needed to evaluate a hand');
    }
    
    // Get the best 5-card combination
    const bestHand = this.getBestFiveCardHand(cards);
    
    // Check for different hand rankings from highest to lowest
    if (this.isRoyalFlush(bestHand)) {
      return {
        rank: 'royal-flush',
        cards: bestHand,
        description: 'Royal Flush',
        value: 10
      };
    }
    
    if (this.isStraightFlush(bestHand)) {
      return {
        rank: 'straight-flush',
        cards: bestHand,
        description: `Straight Flush, ${this.getCardName(bestHand[0])} high`,
        value: 9
      };
    }
    
    if (this.isFourOfAKind(bestHand)) {
      const fourKindRank = this.getFourKindValue(bestHand);
      return {
        rank: 'four-kind',
        cards: bestHand,
        description: `Four of a Kind, ${this.getRankName(fourKindRank)}s`,
        value: 8
      };
    }
    
    if (this.isFullHouse(bestHand)) {
      const threeKindRank = this.getThreeKindValue(bestHand);
      const pairRank = this.getPairValue(bestHand);
      return {
        rank: 'full-house',
        cards: bestHand,
        description: `Full House, ${this.getRankName(threeKindRank)}s over ${this.getRankName(pairRank)}s`,
        value: 7
      };
    }
    
    if (this.isFlush(bestHand)) {
      return {
        rank: 'flush',
        cards: bestHand,
        description: `Flush, ${this.getCardName(bestHand[0])} high`,
        value: 6
      };
    }
    
    if (this.isStraight(bestHand)) {
      return {
        rank: 'straight',
        cards: bestHand,
        description: `Straight, ${this.getCardName(bestHand[0])} high`,
        value: 5
      };
    }
    
    if (this.isThreeOfAKind(bestHand)) {
      const threeKindRank = this.getThreeKindValue(bestHand);
      return {
        rank: 'three-kind',
        cards: bestHand,
        description: `Three of a Kind, ${this.getRankName(threeKindRank)}s`,
        value: 4
      };
    }
    
    if (this.isTwoPair(bestHand)) {
      const pairs = this.getTwoPairValues(bestHand);
      return {
        rank: 'two-pair',
        cards: bestHand,
        description: `Two Pair, ${this.getRankName(pairs[0])}s and ${this.getRankName(pairs[1])}s`,
        value: 3
      };
    }
    
    if (this.isPair(bestHand)) {
      const pairRank = this.getPairValue(bestHand);
      return {
        rank: 'pair',
        cards: bestHand,
        description: `Pair of ${this.getRankName(pairRank)}s`,
        value: 2
      };
    }
    
    // High card
    return {
      rank: 'high-card',
      cards: bestHand,
      description: `High Card, ${this.getCardName(bestHand[0])}`,
      value: 1
    };
  }
  
  /**
   * Get the best 5-card combination from a set of cards
   */
  getBestFiveCardHand(cards: Card[]): Card[] {
    // If exactly 5 cards, return them
    if (cards.length === 5) {
      return [...cards].sort((a, b) => b.rank - a.rank);
    }
    
    // Get all possible 5-card combinations
    const combinations = this.getCombinations(cards, 5);
    
    // Evaluate each combination
    let bestHandValue = -1;
    let bestHand: Card[] = [];
    
    for (const combo of combinations) {
      const sortedCombo = [...combo].sort((a, b) => b.rank - a.rank);
      const handValue = this.getHandValue(sortedCombo);
      
      if (handValue > bestHandValue) {
        bestHandValue = handValue;
        bestHand = sortedCombo;
      }
    }
    
    return bestHand;
  }
  
  /**
   * Get all possible combinations of k elements from an array
   */
  getCombinations<T>(array: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (array.length === 0) return [];
    
    const result: T[][] = [];
    
    // Include the first element
    const first = array[0];
    const rest = array.slice(1);
    
    // Combinations including the first element
    const combsWithFirst = this.getCombinations(rest, k - 1);
    for (const c of combsWithFirst) {
      result.push([first, ...c]);
    }
    
    // Combinations excluding the first element
    const combsWithoutFirst = this.getCombinations(rest, k);
    for (const c of combsWithoutFirst) {
      result.push(c);
    }
    
    return result;
  }
  
  /**
   * Get a numeric value representing the hand strength (for comparison)
   */
  getHandValue(cards: Card[]): number {
    if (this.isRoyalFlush(cards)) return 10 * 15 + cards[0].rank;
    if (this.isStraightFlush(cards)) return 9 * 15 + cards[0].rank;
    
    if (this.isFourOfAKind(cards)) {
      const fourKindRank = this.getFourKindValue(cards);
      // Find the kicker
      const kicker = cards.find(c => c.rank !== fourKindRank);
      return 8 * 15 + fourKindRank + (kicker ? kicker.rank / 100 : 0);
    }
    
    if (this.isFullHouse(cards)) {
      const threeKindRank = this.getThreeKindValue(cards);
      const pairRank = this.getPairValue(cards);
      return 7 * 15 + threeKindRank + pairRank / 100;
    }
    
    if (this.isFlush(cards)) {
      return 6 * 15 + this.getHighCard(cards);
    }
    
    if (this.isStraight(cards)) {
      return 5 * 15 + cards[0].rank;
    }
    
    if (this.isThreeOfAKind(cards)) {
      const threeKindRank = this.getThreeKindValue(cards);
      // Find kickers
      const kickers = cards.filter(c => c.rank !== threeKindRank)
        .sort((a, b) => b.rank - a.rank);
      return 4 * 15 + threeKindRank + kickers[0].rank / 100 + kickers[1].rank / 10000;
    }
    
    if (this.isTwoPair(cards)) {
      const pairs = this.getTwoPairValues(cards);
      // Find kicker
      const kicker = cards.find(c => c.rank !== pairs[0] && c.rank !== pairs[1]);
      return 3 * 15 + pairs[0] + pairs[1] / 100 + (kicker ? kicker.rank / 10000 : 0);
    }
    
    if (this.isPair(cards)) {
      const pairRank = this.getPairValue(cards);
      // Find kickers
      const kickers = cards.filter(c => c.rank !== pairRank)
        .sort((a, b) => b.rank - a.rank);
      return 2 * 15 + pairRank + kickers[0].rank / 100 + kickers[1].rank / 10000 + kickers[2].rank / 1000000;
    }
    
    // High card
    return 1 * 15 + this.getHighCard(cards);
  }
  
  /**
   * Hand type checkers
   */
  isRoyalFlush(cards: Card[]): boolean {
    return (
      this.isStraightFlush(cards) && 
      cards[0].rank === 14 // Ace high
    );
  }
  
  isStraightFlush(cards: Card[]): boolean {
    return this.isFlush(cards) && this.isStraight(cards);
  }
  
  isFourOfAKind(cards: Card[]): boolean {
    const rankCounts = this.countRanks(cards);
    return Array.from(rankCounts.values()).includes(4);
  }
  
  isFullHouse(cards: Card[]): boolean {
    const rankCounts = this.countRanks(cards);
    const counts = Array.from(rankCounts.values());
    return counts.includes(3) && counts.includes(2);
  }
  
  isFlush(cards: Card[]): boolean {
    return new Set(cards.map(c => c.suit)).size === 1;
  }
  
  isStraight(cards: Card[]): boolean {
    // Sort by rank (high to low)
    const sortedCards = [...cards].sort((a, b) => b.rank - a.rank);
    
    // Check for A-5-4-3-2 straight
    if (
      sortedCards[0].rank === 14 && // Ace
      sortedCards[1].rank === 5 &&
      sortedCards[2].rank === 4 &&
      sortedCards[3].rank === 3 &&
      sortedCards[4].rank === 2
    ) {
      return true;
    }
    
    // Check for regular straight
    for (let i = 1; i < sortedCards.length; i++) {
      if (sortedCards[i - 1].rank !== sortedCards[i].rank + 1) {
        return false;
      }
    }
    
    return true;
  }
  
  isThreeOfAKind(cards: Card[]): boolean {
    const rankCounts = this.countRanks(cards);
    return Array.from(rankCounts.values()).includes(3);
  }
  
  isTwoPair(cards: Card[]): boolean {
    const rankCounts = this.countRanks(cards);
    const pairs = Array.from(rankCounts.values()).filter(count => count === 2);
    return pairs.length === 2;
  }
  
  isPair(cards: Card[]): boolean {
    const rankCounts = this.countRanks(cards);
    return Array.from(rankCounts.values()).includes(2);
  }
  
  /**
   * Helper method to count occurrences of each rank
   */
  countRanks(cards: Card[]): Map<string, number> {
    const counts = new Map<string, number>();
    
    for (const card of cards) {
      const rankStr = card.rank.toString();
      counts.set(rankStr, (counts.get(rankStr) || 0) + 1);
    }
    
    return counts;
  }
  
  /**
   * Helper method to get two pair values in descending order
   */
  getTwoPairValues(cards: Card[]): number[] {
    const rankCounts = this.countRanks(cards);
    const pairs: number[] = [];
    
    // Convert entries to array before iterating
    Array.from(rankCounts.entries()).forEach(([rank, count]) => {
      if (count === 2) {
        pairs.push(parseInt(rank));
      }
    });
    
    // Sort descending
    return pairs.sort((a, b) => b - a);
  }
  
  /**
   * Get the highest card rank in a hand
   */
  getHighCard(cards: Card[]): number {
    return Math.max(...cards.map(c => c.rank));
  }
  
  /**
   * Helper for getting card name (for descriptions)
   */
  getCardName(card: Card): string {
    return `${this.getRankName(card.rank)} of ${this.getSuitName(card.suit)}`;
  }
  
  /**
   * Helper for getting rank name
   */
  getRankName(rank: number): string {
    switch (rank) {
      case 14: return 'Ace';
      case 13: return 'King';
      case 12: return 'Queen';
      case 11: return 'Jack';
      default: return rank.toString();
    }
  }
  
  /**
   * Helper for getting suit name
   */
  getSuitName(suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'): string {
    return suit.charAt(0).toUpperCase() + suit.slice(1);
  }
}