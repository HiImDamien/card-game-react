import type { GameRules, GameState, Move } from '../game';

/**
 * Layer 2: state management. Knows nothing about Klondike specifically —
 * it's parameterized by any GameRules. Knows nothing about React either;
 * the only React in this layer is the thin useGame hook.
 *
 * Undo/redo falls out of immutability: past/future are just arrays of
 * previous states (structurally shared, so this is cheap).
 */

export interface Session {
  readonly past: readonly GameState[];
  readonly present: GameState;
  readonly future: readonly GameState[];
}

export type Action =
  | { type: 'NEW_GAME'; seed?: number }
  | { type: 'MOVE'; move: Move }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export function newSession(rules: GameRules, seed: number = randomSeed()): Session {
  return { past: [], present: rules.setup(seed), future: [] };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function createGameReducer(rules: GameRules) {
  return function gameReducer(session: Session, action: Action): Session {
    switch (action.type) {
      case 'NEW_GAME':
        return newSession(rules, action.seed);

      case 'MOVE': {
        if (!rules.isLegalMove(session.present, action.move)) return session;
        return {
          past: [...session.past, session.present],
          present: rules.applyMove(session.present, action.move),
          future: [], // a new move invalidates the redo branch
        };
      }

      case 'UNDO': {
        if (session.past.length === 0) return session;
        return {
          past: session.past.slice(0, -1),
          present: session.past[session.past.length - 1],
          future: [session.present, ...session.future],
        };
      }

      case 'REDO': {
        if (session.future.length === 0) return session;
        return {
          past: [...session.past, session.present],
          present: session.future[0],
          future: session.future.slice(1),
        };
      }
    }
  };
}
