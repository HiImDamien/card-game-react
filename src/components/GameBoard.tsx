import { useState } from 'react';
import type { GameApi } from '../store/useGame';
import { FOUNDATION_IDS, TABLEAU_IDS } from '../game/rules/klondike';
import { Pile, type Selection } from './Pile';

/**
 * Interaction model (click-to-move, pre-drag-and-drop):
 * - click a face-up card: select it (and its run)
 * - click another pile/card: attempt the move; on success or failure, clear selection
 * - double-click: auto-send to foundation
 * - click stock: draw
 */
export function GameBoard({ game }: { game: GameApi }) {
  const { state } = game;
  const [selection, setSelection] = useState<Selection | null>(null);

  function handleCardClick(pileId: string, cardId: string) {
    if (pileId === 'stock') {
      setSelection(null);
      game.draw();
      return;
    }

    const pile = state.piles[pileId];
    const card = pile.cards.find((c) => c.id === cardId);

    if (selection && !(selection.pileId === pileId && selection.cardId === cardId)) {
      // Second click = attempt move onto this pile.
      const moved = game.tryMove({ kind: 'stack', from: selection.pileId, cardId: selection.cardId, to: pileId });
      setSelection(null);
      if (moved) return;
    } else if (selection) {
      setSelection(null); // clicking the selected card deselects
      return;
    }

    if (card?.faceUp) setSelection({ pileId, cardId });
  }

  function handleEmptyClick(pileId: string) {
    if (pileId === 'stock') {
      setSelection(null);
      game.draw(); // empty stock click = recycle waste
      return;
    }
    if (selection) {
      game.tryMove({ kind: 'stack', from: selection.pileId, cardId: selection.cardId, to: pileId });
      setSelection(null);
    }
  }

  function handleDoubleClick(pileId: string, cardId: string) {
    setSelection(null);
    game.autoMove(pileId, cardId);
  }

  const pileProps = {
    selection,
    onCardClick: handleCardClick,
    onCardDoubleClick: handleDoubleClick,
    onEmptyClick: handleEmptyClick,
  };

  return (
    <div className="board">
      <div className="board__top">
        <div className="board__stock-waste">
          <Pile pile={state.piles['stock']} fanned={false} {...pileProps} />
          <Pile pile={state.piles['waste']} fanned={false} {...pileProps} />
        </div>
        <div className="board__foundations">
          {FOUNDATION_IDS.map((id) => (
            <Pile key={id} pile={state.piles[id]} fanned={false} {...pileProps} />
          ))}
        </div>
      </div>
      <div className="board__tableau">
        {TABLEAU_IDS.map((id) => (
          <Pile key={id} pile={state.piles[id]} fanned {...pileProps} />
        ))}
      </div>
    </div>
  );
}
