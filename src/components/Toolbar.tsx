import type { GameApi } from '../store/useGame';

export function Toolbar({ game }: { game: GameApi }) {
  return (
    <header className="toolbar">
      <h1 className="toolbar__title">Solitaire</h1>
      <div className="toolbar__stats">
        <span>Moves: {game.state.moveCount}</span>
        <span className="toolbar__seed">Deal #{game.state.seed}</span>
      </div>
      <div className="toolbar__actions">
        <button onClick={() => game.undo()} disabled={!game.canUndo}>Undo</button>
        <button onClick={() => game.redo()} disabled={!game.canRedo}>Redo</button>
        <button onClick={() => game.newGame()}>New Game</button>
      </div>
    </header>
  );
}
