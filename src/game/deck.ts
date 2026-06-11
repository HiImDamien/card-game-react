import type { Card, Color, Rank, Suit } from './types';

export const SUITS: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function colorOf(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function cardId(suit: Suit, rank: Rank): string {
  return `${suit}-${rank}`;
}

/** A standard 52-card deck, face down, in canonical order. */
export function createDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank): Card => ({ id: cardId(suit, rank), suit, rank, faceUp: false })),
  );
}

/**
 * mulberry32 — tiny seeded PRNG. Seeded shuffles make every deal
 * reproducible: the same seed always produces the same game, which
 * enables shareable deals and daily challenges later.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates with a seeded PRNG. Returns a new array. */
export function shuffle(cards: readonly Card[], seed: number): Card[] {
  const rng = mulberry32(seed);
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function flip(card: Card, faceUp: boolean): Card {
  return card.faceUp === faceUp ? card : { ...card, faceUp };
}
