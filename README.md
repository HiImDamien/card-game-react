# Solitaire

A React solitaire app architected so that the *second* game mode is cheap. Klondike is the first implementation, but nothing about Klondike leaks outside one file.

```bash
npm install
npm run dev     # play at localhost:5173
npm test        # 22 engine + store tests, no browser needed
npm run build   # type-check + production bundle
```

## Architecture: three layers, strict boundaries

```
src/
├── game/          Layer 1 — pure game engine. ZERO React imports.
│   ├── types.ts       Card, Pile, GameState, Move, GameRules interface
│   ├── deck.ts        52-card deck, seeded shuffle (mulberry32)
│   ├── rules/
│   │   └── klondike.ts    the ONLY file that knows Klondike's rules
│   └── index.ts       game mode registry
├── store/         Layer 2 — state management. Knows GameRules, not Klondike.
│   ├── gameReducer.ts     reducer + undo/redo history (pure, React-free)
│   └── useGame.ts         the single hook where the engine meets React
└── components/    Layer 3 — UI. Reads state, dispatches intents. No game logic.
    ├── Card.tsx  Pile.tsx  GameBoard.tsx  Toolbar.tsx
```

The dependency arrow points one way: `components → store → game`. Nothing in `game/` imports from the layers above it, which is why the entire rule set runs (and is tested) in plain Node with no browser.

## The decisions that matter

**Game logic is pure functions.** `isLegalMove(state, move)` and `applyMove(state, move)` take plain data and return plain data. They are tested with vitest in milliseconds, with hand-built board positions — no rendering, no mocking.

**`GameState` is JSON-serializable from day one.** No class instances, no functions, no Maps. This one decision makes four future features nearly free: undo history (keep old states), save/load (`JSON.stringify`), shareable deals (the `seed` reproduces any game exactly), and server sync.

**Game modes are plugins.** Every mode implements the `GameRules` interface: `setup`, `isLegalMove`, `applyMove`, `isWon`, `autoMove`. Adding Spider or FreeCell means writing one new file in `src/game/rules/` and registering it in `src/game/index.ts`. The store and UI layers don't change.

**Undo/redo is an array, not a system.** Because `applyMove` never mutates, the reducer just keeps `past` / `present` / `future` arrays of states (structurally shared, so memory is cheap). The test suite proves a 300-move random playout undoes back to a byte-identical initial deal.

**State management is `useReducer`, deliberately.** No Redux, no Zustand — at this size they'd be ceremony. The reducer is already pure and store-shaped, so if state ever needs to escape the component tree, migrating to Zustand is mechanical.

**Theming is CSS custom properties.** Card size, colors, stack offsets, and the card-back pattern are all variables in `index.css`. A theme is a `[data-theme]` block, not a component change.

## How to add a new game mode (the test of this architecture)

1. Create `src/game/rules/spider.ts` implementing `GameRules`.
2. Register it in the `RULES` record in `src/game/index.ts`.
3. Write tests against hand-built positions, like `klondike.test.ts` does.

That's the whole list. If step 4 ever involves touching `store/` or `components/`, the architecture has failed and the regression should be treated as a bug.

## Interaction model (current)

Click a face-up card to select it (and its run), click a destination to move. Double-click sends a card to its foundation. Click the stock to draw; click the empty stock to recycle the waste. Undo/redo in the toolbar.

## Roadmap

- [x] Pure engine + Klondike rules + tests
- [x] Playable UI with undo/redo
- [ ] Drag-and-drop (`@dnd-kit/core`) layered on top of the same `Move` dispatch
- [ ] Animations (`framer-motion`)
- [ ] Theme switcher (new CSS variable blocks)
- [ ] Spider / FreeCell via new `GameRules` implementations
- [ ] Daily challenge + shareable deals (seed is already in the URL-ready state)
- [ ] Stats & streaks (persist serialized state)
