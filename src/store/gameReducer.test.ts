import { describe, expect, it } from 'vitest';
import type { Move } from '../game';
import { klondike } from '../game';
import { TABLEAU_IDS, FOUNDATION_IDS } from '../game/rules/klondike';
import { mulberry32 } from '../game/deck';
import { createGameReducer, newSession, type Session } from './gameReducer';

const reduce = createGameReducer(klondike);

describe('gameReducer', () => {
  it('ignores illegal moves', () => {
    const s = newSession(klondike, 1);
    const next = reduce(s, {
      type: 'MOVE',
      move: { kind: 'stack', from: 'tableau-0', cardId: 'nope', to: 'tableau-1' },
    });
    expect(next).toBe(s); // same reference: nothing happened
  });

  it('undo/redo round-trips', () => {
    const s0 = newSession(klondike, 1);
    const s1 = reduce(s0, { type: 'MOVE', move: { kind: 'draw' } });
    expect(s1.present).not.toEqual(s0.present);

    const s2 = reduce(s1, { type: 'UNDO' });
    expect(s2.present).toEqual(s0.present);
    expect(s2.future).toHaveLength(1);

    const s3 = reduce(s2, { type: 'REDO' });
    expect(s3.present).toEqual(s1.present);
  });

  it('a new move clears the redo branch', () => {
    let s = newSession(klondike, 1);
    s = reduce(s, { type: 'MOVE', move: { kind: 'draw' } });
    s = reduce(s, { type: 'UNDO' });
    s = reduce(s, { type: 'MOVE', move: { kind: 'draw' } });
    expect(s.future).toHaveLength(0);
  });

  it('survives a 300-move random playout and undoes back to the initial deal', () => {
    const rng = mulberry32(99);
    const initial = newSession(klondike, 12345);
    let session: Session = initial;
    let applied = 0;

    const allPiles = ['waste', ...TABLEAU_IDS, ...FOUNDATION_IDS];

    for (let i = 0; i < 300; i++) {
      // Gather candidate moves: every face-up card to every pile, plus draw.
      const candidates: Move[] = [{ kind: 'draw' }];
      for (const from of allPiles) {
        for (const card of session.present.piles[from].cards) {
          if (!card.faceUp) continue;
          for (const to of allPiles) {
            if (to !== from) candidates.push({ kind: 'stack', from, cardId: card.id, to });
          }
        }
      }
      const legal = candidates.filter((m) => klondike.isLegalMove(session.present, m));
      if (legal.length === 0) break;
      const move = legal[Math.floor(rng() * legal.length)];
      session = reduce(session, { type: 'MOVE', move });
      applied++;
    }

    expect(applied).toBeGreaterThan(50); // playout actually exercised the engine

    // Cards are never created or destroyed.
    const cardCount = Object.values(session.present.piles)
      .reduce((n, p) => n + p.cards.length, 0);
    expect(cardCount).toBe(52);

    // Undo everything → byte-identical to the original deal.
    while (session.past.length > 0) session = reduce(session, { type: 'UNDO' });
    expect(session.present).toEqual(initial.present);
  });
});
