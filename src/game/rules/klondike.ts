import type { Card, GameRules, GameState, Move, Pile } from '../types';
import { colorOf, createDeck, flip, shuffle } from '../deck';

/**
 * Klondike (draw-1). The reference implementation of GameRules —
 * every function here is pure and browser-free.
 *
 * Piles: stock, waste, foundation-0..3, tableau-0..6
 */

const TABLEAU_COUNT = 7;
const FOUNDATION_COUNT = 4;

export const TABLEAU_IDS = Array.from({ length: TABLEAU_COUNT }, (_, i) => `tableau-${i}`);
export const FOUNDATION_IDS = Array.from({ length: FOUNDATION_COUNT }, (_, i) => `foundation-${i}`);

// ---------- helpers ----------

function top(pile: Pile): Card | undefined {
  return pile.cards[pile.cards.length - 1];
}

function withPiles(state: GameState, updates: Record<string, Pile>): GameState {
  return { ...state, piles: { ...state.piles, ...updates } };
}

/** The card and everything stacked on top of it. Empty array if not found. */
function runFrom(pile: Pile, cardId: string): readonly Card[] {
  const i = pile.cards.findIndex((c) => c.id === cardId);
  return i === -1 ? [] : pile.cards.slice(i);
}

/** Face-up run in strictly descending rank with alternating colors. */
function isValidRun(cards: readonly Card[]): boolean {
  if (cards.length === 0 || cards.some((c) => !c.faceUp)) return false;
  for (let i = 1; i < cards.length; i++) {
    const above = cards[i];
    const below = cards[i - 1];
    if (above.rank !== below.rank - 1 || colorOf(above.suit) === colorOf(below.suit)) return false;
  }
  return true;
}

function tableauAccepts(pile: Pile, incoming: Card): boolean {
  const t = top(pile);
  if (!t) return incoming.rank === 13; // empty tableau takes only a King
  return t.faceUp && incoming.rank === t.rank - 1 && colorOf(incoming.suit) !== colorOf(t.suit);
}

function foundationAccepts(pile: Pile, incoming: Card): boolean {
  const t = top(pile);
  if (!t) return incoming.rank === 1; // empty foundation takes only an Ace
  return incoming.suit === t.suit && incoming.rank === t.rank + 1;
}

/** Flip the newly exposed top card of a tableau pile, if face down. */
function autoFlipTop(pile: Pile): Pile {
  const t = top(pile);
  if (!t || t.faceUp) return pile;
  return { ...pile, cards: [...pile.cards.slice(0, -1), flip(t, true)] };
}

// ---------- rules ----------

export const klondike: GameRules = {
  id: 'klondike',
  name: 'Klondike',

  setup(seed: number): GameState {
    const deck = shuffle(createDeck(), seed);
    const piles: Record<string, Pile> = {};
    let cursor = 0;

    TABLEAU_IDS.forEach((id, col) => {
      const cards = deck.slice(cursor, cursor + col + 1).map((c, i) => flip(c, i === col));
      cursor += col + 1;
      piles[id] = { id, kind: 'tableau', cards };
    });

    FOUNDATION_IDS.forEach((id) => {
      piles[id] = { id, kind: 'foundation', cards: [] };
    });

    piles['stock'] = { id: 'stock', kind: 'stock', cards: deck.slice(cursor) };
    piles['waste'] = { id: 'waste', kind: 'waste', cards: [] };

    return { rulesId: 'klondike', seed, piles, moveCount: 0, status: 'playing' };
  },

  isLegalMove(state, move): boolean {
    if (state.status !== 'playing') return false;

    if (move.kind === 'draw') {
      return state.piles['stock'].cards.length > 0 || state.piles['waste'].cards.length > 0;
    }

    const from = state.piles[move.from];
    const to = state.piles[move.to];
    if (!from || !to || from.id === to.id) return false;

    const run = runFrom(from, move.cardId);
    if (!isValidRun(run)) return false;

    // Only the top card may leave waste or a foundation.
    if ((from.kind === 'waste' || from.kind === 'foundation') && run.length !== 1) return false;

    if (to.kind === 'tableau') return tableauAccepts(to, run[0]);
    if (to.kind === 'foundation') return run.length === 1 && foundationAccepts(to, run[0]);
    return false; // stock and waste are never drop targets
  },

  applyMove(state, move): GameState {
    if (move.kind === 'draw') {
      const stock = state.piles['stock'];
      const waste = state.piles['waste'];
      let next: GameState;
      if (stock.cards.length > 0) {
        const drawn = flip(stock.cards[stock.cards.length - 1], true);
        next = withPiles(state, {
          stock: { ...stock, cards: stock.cards.slice(0, -1) },
          waste: { ...waste, cards: [...waste.cards, drawn] },
        });
      } else {
        // Recycle: waste flips back over to become the stock.
        const recycled = [...waste.cards].reverse().map((c) => flip(c, false));
        next = withPiles(state, {
          stock: { ...stock, cards: recycled },
          waste: { ...waste, cards: [] },
        });
      }
      return { ...next, moveCount: state.moveCount + 1 };
    }

    const from = state.piles[move.from];
    const to = state.piles[move.to];
    const run = runFrom(from, move.cardId);

    let newFrom: Pile = { ...from, cards: from.cards.slice(0, from.cards.length - run.length) };
    if (newFrom.kind === 'tableau') newFrom = autoFlipTop(newFrom);

    const next = withPiles(state, {
      [from.id]: newFrom,
      [to.id]: { ...to, cards: [...to.cards, ...run] },
    });

    const moved = { ...next, moveCount: state.moveCount + 1 };
    return klondike.isWon(moved) ? { ...moved, status: 'won' } : moved;
  },

  isWon(state): boolean {
    return FOUNDATION_IDS.every((id) => state.piles[id].cards.length === 13);
  },

  autoMove(state, pileId, cardId): Move | null {
    const pile = state.piles[pileId];
    if (!pile || top(pile)?.id !== cardId) return null; // only top cards auto-move

    for (const fid of FOUNDATION_IDS) {
      const move: Move = { kind: 'stack', from: pileId, cardId, to: fid };
      if (klondike.isLegalMove(state, move)) return move;
    }
    return null;
  },
};
