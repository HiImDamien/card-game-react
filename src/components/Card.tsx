import type { Card as CardType } from '../game';
import { colorOf } from '../game/deck';

const SUIT_GLYPHS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' } as const;
const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface CardProps {
  card: CardType;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

export function Card({ card, selected, onClick, onDoubleClick }: CardProps) {
  if (!card.faceUp) {
    return <div className="card card--back" aria-label="face-down card" />;
  }

  const label = `${RANK_LABELS[card.rank]}${SUIT_GLYPHS[card.suit]}`;
  return (
    <div
      className={`card card--face card--${colorOf(card.suit)}${selected ? ' card--selected' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="button"
      aria-label={label}
    >
      <span className="card__corner">{label}</span>
      <span className="card__pip">{SUIT_GLYPHS[card.suit]}</span>
      <span className="card__corner card__corner--flipped">{label}</span>
    </div>
  );
}
