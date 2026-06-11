/**
 * Core primitives shared by every game mode.
 *
 * RULE: nothing in src/game/ may import React or anything from
 * src/store/ or src/components/. Pure data and pure functions only.
 */

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Color = 'red' | 'black';

/** 1 = Ace … 11 = Jack, 12 = Queen, 13 = King */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  /** Stable identity, e.g. "hearts-12". Never changes for the life of a game. */
  readonly id: string;
  readonly suit: Suit;
  readonly rank: Rank;
  readonly faceUp: boolean;
}

/** Semantic role of a pile. New game modes may add kinds here. */
export type PileKind = 'stock' | 'waste' | 'foundation' | 'tableau' | 'cell' | 'reserve';

export interface Pile {
  readonly id: string;
  readonly kind: PileKind;
  readonly cards: readonly Card[]; // index 0 = bottom, last = top
}

/**
 * The entire game, as plain JSON. Deliberately serializable from day one:
 * undo history, save/load, shareable seeds, and server sync all fall out
 * of this decision for free.
 */
export interface GameState {
  readonly rulesId: string;
  readonly seed: number;
  readonly piles: Readonly<Record<string, Pile>>;
  readonly moveCount: number;
  readonly status: 'playing' | 'won';
}

/**
 * Every player intent, normalized. Game modes interpret these:
 * - "stack": move `cardId` (and any cards on top of it) from one pile to another
 * - "draw": game-specific (Klondike: stock→waste, or recycle waste when stock is empty)
 */
export type Move =
  | { readonly kind: 'stack'; readonly from: string; readonly cardId: string; readonly to: string }
  | { readonly kind: 'draw' };

/**
 * The contract every game mode implements. Adding Spider, FreeCell, or
 * Pyramid means writing one new object that satisfies this interface —
 * no changes to the store or UI layers.
 */
export interface GameRules {
  readonly id: string;
  readonly name: string;
  /** Deal a fresh, deterministic game from a seed. */
  setup(seed: number): GameState;
  isLegalMove(state: GameState, move: Move): boolean;
  /** Pure: returns a new state, never mutates. Caller should validate first. */
  applyMove(state: GameState, move: Move): GameState;
  isWon(state: GameState): boolean;
  /** Best automatic destination for a card (double-click). Null if none. */
  autoMove(state: GameState, pileId: string, cardId: string): Move | null;
}
