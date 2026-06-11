import { useMemo, useReducer } from 'react';
import type { GameRules, Move } from '../game';
import { createGameReducer, newSession, randomSeed } from './gameReducer';

/**
 * The single point where the engine meets React. Components consume
 * this hook and never touch game logic directly.
 */
export function useGame(rules: GameRules) {
  const reducer = useMemo(() => createGameReducer(rules), [rules]);
  const [session, dispatch] = useReducer(reducer, rules, () => newSession(rules));

  return {
    state: session.present,
    canUndo: session.past.length > 0,
    canRedo: session.future.length > 0,

    /** Attempt a move; returns whether it was legal (UI can shake/flash on false). */
    tryMove(move: Move): boolean {
      const legal = rules.isLegalMove(session.present, move);
      if (legal) dispatch({ type: 'MOVE', move });
      return legal;
    },

    /** Double-click: send card to its foundation if possible. */
    autoMove(pileId: string, cardId: string): boolean {
      const move = rules.autoMove(session.present, pileId, cardId);
      if (move) dispatch({ type: 'MOVE', move });
      return move !== null;
    },

    draw: () => dispatch({ type: 'MOVE', move: { kind: 'draw' } }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    newGame: (seed?: number) => dispatch({ type: 'NEW_GAME', seed: seed ?? randomSeed() }),
  };
}

export type GameApi = ReturnType<typeof useGame>;
