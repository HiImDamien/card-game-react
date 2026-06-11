import { describe, expect, it } from 'vitest';
import type { Card, GameState, Pile, Rank, Suit } from '../types';
import { createDeck, shuffle } from '../deck';
import { FOUNDATION_IDS, TABLEAU_IDS, klondike } from '../rules/klondike';

// ---------- fixtures ----------

function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

/** A minimal hand-built state for surgical rule tests. */
function stateWith(pileCards: Partial<Record<string, Card[]>>): GameState {
  const base = klondike.setup(1);
  const piles: Record<string, Pile> = { ...base.piles };
  for (const [id, cards] of Object.entries(pileCards)) {
    piles[id] = { ...piles[id], cards: cards ?? [] };
  }
  return { ...base, piles };
}

// ---------- deck ----------

describe('deck', () => {
  it('has 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('shuffles deterministically by seed', () => {
    const deck = createDeck();
    expect(shuffle(deck, 42)).toEqual(shuffle(deck, 42));
    expect(shuffle(deck, 42)).not.toEqual(shuffle(deck, 43));
    expect(deck[0].id).toBe('spades-1'); // original untouched
  });
});

// ---------- setup ----------

describe('klondike setup', () => {
  const state = klondike.setup(7);

  it('deals 1..7 cards to tableau, only top face up', () => {
    TABLEAU_IDS.forEach((id, col) => {
      const cards = state.piles[id].cards;
      expect(cards).toHaveLength(col + 1);
      cards.forEach((c, i) => expect(c.faceUp).toBe(i === col));
    });
  });

  it('leaves 24 cards in stock, all face down', () => {
    expect(state.piles['stock'].cards).toHaveLength(24);
    expect(state.piles['stock'].cards.every((c) => !c.faceUp)).toBe(true);
  });

  it('is reproducible from the seed and JSON-serializable', () => {
    expect(klondike.setup(7)).toEqual(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

// ---------- move validation ----------

describe('tableau moves', () => {
  it('accepts descending rank with alternating color', () => {
    const s = stateWith({
      'tableau-0': [card('spades', 8)],
      'tableau-1': [card('hearts', 7)],
    });
    expect(
      klondike.isLegalMove(s, { kind: 'stack', from: 'tableau-1', cardId: 'hearts-7', to: 'tableau-0' }),
    ).toBe(true);
  });

  it('rejects same color or wrong rank', () => {
    const s = stateWith({
      'tableau-0': [card('spades', 8)],
      'tableau-1': [card('clubs', 7)], // same color
      'tableau-2': [card('hearts', 6)], // wrong rank
    });
    expect(
      klondike.isLegalMove(s, { kind: 'stack', from: 'tableau-1', cardId: 'clubs-7', to: 'tableau-0' }),
    ).toBe(false);
    expect(
      klondike.isLegalMove(s, { kind: 'stack', from: 'tableau-2', cardId: 'hearts-6', to: 'tableau-0' }),
    ).toBe(false);
  });

  it('only a King may land on an empty tableau', () => {
    const s = stateWith({
      'tableau-0': [],
      'tableau-1': [card('hearts', 13)],
      'tableau-2': [card('hearts', 12)],
    });
    expect(
      klondike.isLegalMove(s, { kind: 'stack', from: 'tableau-1', cardId: 'hearts-13', to: 'tableau-0' }),
    ).toBe(true);
    expect(
      klondike.isLegalMove(s, { kind: 'stack', from: 'tableau-2', cardId: 'hearts-12', to: 'tableau-0' }),
    ).toBe(false);
  });

  it('moves a whole run and flips the exposed card', () => {
    const hidden = card('diamonds', 2, false);
    const s = stateWith({
      'tableau-0': [hidden, card('spades', 9), card('hearts', 8)],
      'tableau-1': [card('diamonds', 10)],
    });
    const next = klondike.applyMove(s, {
      kind: 'stack', from: 'tableau-0', cardId: 'spades-9', to: 'tableau-1',
    });
    expect(next.piles['tableau-1'].cards.map((c) => c.id)).toEqual([
      'diamonds-10', 'spades-9', 'hearts-8',
    ]);
    expect(next.piles['tableau-0'].cards).toEqual([card('diamonds', 2, true)]); // auto-flipped
    expect(s.piles['tableau-0'].cards[0].faceUp).toBe(false); // original state untouched
  });

  it('rejects moving a face-down card', () => {
    const s = stateWith({
      'tableau-0': [card('spades', 9, false), card('hearts', 8)],
      'tableau-1': [card('diamonds', 10)],
    });
    expect(
      klondike.isLegalMove(s, { kind: 'stack', from: 'tableau-0', cardId: 'spades-9', to: 'tableau-1' }),
    ).toBe(false);
  });
});

describe('foundation moves', () => {
  it('accepts only Ace on empty, then same-suit ascending', () => {
    const s = stateWith({
      'foundation-0': [],
      'foundation-1': [card('hearts', 1)],
      'tableau-0': [card('hearts', 2)],
      'tableau-1': [card('spades', 1)],
      'tableau-2': [card('spades', 2)],
    });
    const m = (from: string, cardId: string, to: string) =>
      klondike.isLegalMove(s, { kind: 'stack', from, cardId, to });

    expect(m('tableau-1', 'spades-1', 'foundation-0')).toBe(true);
    expect(m('tableau-0', 'hearts-2', 'foundation-0')).toBe(false); // not an ace
    expect(m('tableau-0', 'hearts-2', 'foundation-1')).toBe(true); // hearts A → 2
    expect(m('tableau-2', 'spades-2', 'foundation-1')).toBe(false); // wrong suit
  });

  it('rejects multi-card moves to a foundation', () => {
    const s = stateWith({
      'foundation-0': [],
      'tableau-0': [card('spades', 2), card('hearts', 1)],
    });
    expect(
      klondike.isLegalMove(s, { kind: 'stack', from: 'tableau-0', cardId: 'spades-2', to: 'foundation-0' }),
    ).toBe(false);
  });
});

// ---------- draw & recycle ----------

describe('draw', () => {
  it('moves one card from stock to waste, face up', () => {
    const s = klondike.setup(3);
    const next = klondike.applyMove(s, { kind: 'draw' });
    expect(next.piles['stock'].cards).toHaveLength(23);
    expect(next.piles['waste'].cards).toHaveLength(1);
    expect(next.piles['waste'].cards[0].faceUp).toBe(true);
  });

  it('recycles waste into stock when stock is empty', () => {
    const s = stateWith({
      stock: [],
      waste: [card('hearts', 5), card('spades', 9)],
    });
    const next = klondike.applyMove(s, { kind: 'draw' });
    expect(next.piles['waste'].cards).toHaveLength(0);
    expect(next.piles['stock'].cards.map((c) => c.id)).toEqual(['spades-9', 'hearts-5']);
    expect(next.piles['stock'].cards.every((c) => !c.faceUp)).toBe(true);
  });

  it('is illegal when both stock and waste are empty', () => {
    const s = stateWith({ stock: [], waste: [] });
    expect(klondike.isLegalMove(s, { kind: 'draw' })).toBe(false);
  });
});

// ---------- autoMove & win ----------

describe('autoMove', () => {
  it('sends an eligible top card to its foundation', () => {
    const s = stateWith({
      'foundation-0': [card('hearts', 1)],
      'tableau-0': [card('hearts', 2)],
    });
    expect(klondike.autoMove(s, 'tableau-0', 'hearts-2')).toEqual({
      kind: 'stack', from: 'tableau-0', cardId: 'hearts-2', to: 'foundation-0',
    });
  });

  it('returns null for buried cards', () => {
    const s = stateWith({
      'foundation-0': [card('hearts', 1)],
      'tableau-0': [card('hearts', 2), card('spades', 5)],
    });
    expect(klondike.autoMove(s, 'tableau-0', 'hearts-2')).toBeNull();
  });
});

describe('win detection', () => {
  it('flips status to won when all foundations are complete', () => {
    const fullSuit = (suit: Suit): Card[] =>
      Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank));
    const s = stateWith({
      'foundation-0': fullSuit('spades'),
      'foundation-1': fullSuit('hearts').slice(0, 12),
      'foundation-2': fullSuit('diamonds'),
      'foundation-3': fullSuit('clubs'),
      'tableau-0': [card('hearts', 13)],
      stock: [], waste: [],
      'tableau-1': [], 'tableau-2': [], 'tableau-3': [],
      'tableau-4': [], 'tableau-5': [], 'tableau-6': [],
    });
    expect(klondike.isWon(s)).toBe(false);
    const next = klondike.applyMove(s, {
      kind: 'stack', from: 'tableau-0', cardId: 'hearts-13', to: 'foundation-1',
    });
    expect(next.status).toBe('won');
    expect(FOUNDATION_IDS.every((id) => next.piles[id].cards.length === 13)).toBe(true);
  });
});
