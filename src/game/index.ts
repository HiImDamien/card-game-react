/**
 * Game mode registry. To add a new mode: implement GameRules,
 * import it here, add it to the record. Nothing else changes.
 */
import type { GameRules } from './types';
import { klondike } from './rules/klondike';

export const RULES: Readonly<Record<string, GameRules>> = {
  [klondike.id]: klondike,
};

export * from './types';
export { klondike };
