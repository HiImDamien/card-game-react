import type { Pile as PileType } from '../game';
import { Card } from './Card';

export interface Selection {
  pileId: string;
  cardId: string;
}

interface PileProps {
  pile: PileType;
  /** Stack cards with a vertical offset (tableau) vs squared (foundation/stock/waste). */
  fanned: boolean;
  selection: Selection | null;
  onCardClick: (pileId: string, cardId: string) => void;
  onCardDoubleClick: (pileId: string, cardId: string) => void;
  onEmptyClick: (pileId: string) => void;
}

export function Pile({ pile, fanned, selection, onCardClick, onCardDoubleClick, onEmptyClick }: PileProps) {
  const selectedIndex =
    selection?.pileId === pile.id
      ? pile.cards.findIndex((c) => c.id === selection.cardId)
      : -1;

  return (
    <div
      className={`pile pile--${pile.kind}${fanned ? ' pile--fanned' : ''}`}
      data-pile-id={pile.id}
      onClick={(e) => {
        if (e.target === e.currentTarget) onEmptyClick(pile.id);
      }}
    >
      {pile.cards.length === 0 && <div className="pile__placeholder" />}
      {pile.cards.map((card, i) => (
        <div
          key={card.id}
          className="pile__slot"
          style={fanned ? { ['--stack-index' as string]: i } : undefined}
        >
          <Card
            card={card}
            selected={selectedIndex !== -1 && i >= selectedIndex}
            onClick={(e) => {
              e.stopPropagation();
              onCardClick(pile.id, card.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onCardDoubleClick(pile.id, card.id);
            }}
          />
          {/* face-down cards still need a click target (e.g. stock) */}
          {!card.faceUp && (
            <div
              className="pile__cover"
              onClick={(e) => {
                e.stopPropagation();
                onCardClick(pile.id, card.id);
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
