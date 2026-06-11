import { klondike } from './game';
import { useGame } from './store/useGame';
import { GameBoard } from './components/GameBoard';
import { Toolbar } from './components/Toolbar';

export default function App() {
  const game = useGame(klondike);

  return (
    <div className="app">
      <Toolbar game={game} />
      <GameBoard game={game} />
      {game.state.status === 'won' && (
        <div className="win-banner">
          <div className="win-banner__card">
            <h2>You won!</h2>
            <p>{game.state.moveCount} moves · deal #{game.state.seed}</p>
            <button onClick={() => game.newGame()}>Play again</button>
          </div>
        </div>
      )}
    </div>
  );
}
