# History Adventure Games

A static, no-build-step site (GitHub Pages) with three sections:

- `/` — the homepage: hero, mission statement, and navigation into Adventures and the Arcade.
- `/adventures/` — the text-adventure library and player (`app.js`).
- `/arcade/` — the History Arcade hub, and each arcade game in its own folder (starting with `/arcade/timeline-builder/`).

## Important Files

- `index.html`, `home.css`, `home.js` — the homepage.
- `styles.css` — shared design tokens, header/footer, and typography used by every page.
- `pixel-ui.css` — shared pixel-inspired UI primitives (buttons, frames, decorative shapes) used by the homepage and the arcade.
- `icon-sprite.html` — the shared pixel-icon `<symbol>` sprite, injected at runtime by `scripts/load-icon-sprite.js`.
- `favicon.svg` — the site favicon.
- `adventures/index.html`, `adventures/app.js` — the adventure reader and game engine.
- `content/adventure-manifest.json` lists the available adventures.
- `content/adventures/` stores the adventure JSON files.
- `images/` stores the images used by the adventures.
- `arcade/index.html`, `arcade/arcade.css`, `arcade/arcade.js` — the Arcade hub.
- `arcade/games-manifest.json` — the registry of arcade games shown on the hub (see "Add a New Arcade Game" below).
- `arcade/instructions-modal.js` — the shared "How to Play" modal every arcade game should use (see below).
- `arcade/audio.js`, `arcade/confetti.js`, `arcade/storage.js` — shared, game-agnostic utilities every arcade game should import rather than reimplementing (see below).
- `arcade/timeline-builder/` — the Timeline Builder game (see its own data format below).
- `arcade/history-links/` — the History Links game (see its own data format below).
- `.nojekyll` tells GitHub Pages to serve the static files directly.

All shared assets (`/styles.css`, `/pixel-ui.css`, `/content/...`, `/images/...`, etc.) are referenced with root-absolute paths so they resolve correctly regardless of how deep a page lives (e.g. `/arcade/timeline-builder/`).

## Add a New Adventure

1. Put the new JSON file in:

```text
content/adventures/
```

2. Add one entry to:

```text
content/adventure-manifest.json
```

Use a relative file path:

```json
{
  "id": "new-adventure-id",
  "title": "New Adventure Title",
  "topic": "Historical Topic",
  "description": "Short student-friendly description.",
  "estimatedTime": "20-30 minutes",
  "file": "content/adventures/new-adventure-file.json"
}
```

## Add a New Arcade Game

The Arcade hub is manifest-driven, the same pattern as the adventure library:

1. Build the game in its own folder, e.g. `arcade/your-game/`, with its own `index.html`, CSS, and JS.
2. Add one entry to `arcade/games-manifest.json`:

```json
{
  "id": "your-game",
  "title": "Your Game",
  "description": "One sentence a student would understand.",
  "status": "available",
  "url": "/arcade/your-game/",
  "icon": "pi-gear"
}
```

Until the game is ready, set `"status": "coming-soon"` and omit `url` — it renders as a disabled placeholder card. `icon` refers to a `<symbol>` id from `icon-sprite.html`.

### Every game needs a "How to Play" modal

Load `/arcade/arcade.css` and `/arcade/instructions-modal.js` on the game page, add a trigger button anywhere with `data-instructions-open`, and register the copy once:

```html
<script src="/arcade/instructions-modal.js"></script>
<script>
  ArcadeInstructions.init({
    gameId: "your-game",
    title: "How to Play Your Game",
    sections: [
      { heading: "Goal", body: "..." },
      { heading: "Controls", body: "..." },
      { heading: "Scoring", body: "..." },
    ],
  });
</script>
```

It opens itself once automatically on a player's first visit to that game (tracked per `gameId` in `localStorage`), is dismissible via the close button, backdrop click, or Escape, and is mobile-friendly (scrolls internally, respects safe-area insets, locks background scroll while open).

### Shared game utilities: audio, confetti, storage

Three more things are game-agnostic on purpose — import them instead of writing a new copy per game:

- **`arcade/audio.js`** — `AudioEngine` class with procedurally-synthesized click/correct/incorrect/victory sounds and a generative ambient music loop, so no audio files need to be recorded or licensed. Swap in real recordings later by changing an entry in its `SOUND_MAP` from a synth function to a file URL.
- **`arcade/confetti.js`** — `burstConfetti()`, a small dependency-free canvas confetti burst for win screens.
- **`arcade/storage.js`** — `createGameStorage(gameId)` returns namespaced `getHighScore`/`setHighScoreIfBetter`/`getSettings`/`saveSettings`/`readJson`/`writeJson` helpers backed by `localStorage`, with the try/catch-for-private-browsing handling already done. Call it once per game (see `arcade/history-links/js/storage.js` for an example that layers a daily-streak shape on top via `readJson`/`writeJson`).

### Timeline Builder's data format

`arcade/timeline-builder/data/manifest.json` lists one entry per era; each points at a category file shaped like:

```json
{
  "category": "American Revolution",
  "events": [
    { "year": 1773, "title": "Boston Tea Party" },
    { "year": 1775, "title": "Battles of Lexington and Concord" }
  ]
}
```

Adding events only requires editing that category's JSON file — no code changes. Years may be negative for BCE dates. Category files are fetched lazily, only once a player picks that era (or picks Endless mode, which loads every category).

### History Links's data format

`arcade/history-links/data/manifest.json` lists one entry per puzzle (with its title inline, so the Practice picker can list puzzles without fetching every file); each points at a puzzle file shaped like:

```json
{
  "id": "puzzle-0001",
  "title": "American Foundations",
  "groups": [
    {
      "relationship": "same-amendment",
      "label": "Freedoms Protected by the First Amendment",
      "explanation": "Speech, religion, the press, and assembly are all freedoms protected by the First Amendment.",
      "tier": 3,
      "items": ["Speech", "Religion", "The Press", "Assembly"]
    }
  ]
}
```

A puzzle needs exactly 4 groups of 4 unique items (16 total). `relationship` is a free-text label (e.g. `"same-war"`, `"same-president"`, `"same-amendment"`) used only for display — the game engine (`arcade/history-links/js/engine.js`) never branches on it, it only ever compares the four selected item strings against each group's `items` array. That means **new relationship types are just new puzzle JSON, never an engine change**, and the puzzle pool scales to hundreds of puzzles by adding more files plus one manifest line each. `tier` (1-4) only controls the color/label ("Foundational" → "Expert") on the solved banner and is purely cosmetic.

Keep each group's `items` free of the word(s) that give the connection away (e.g. a "same first name" group should list surnames only, not the shared first name) — the explanation is shown after solving and can spell it out there.

The Daily Challenge picks `manifest[dayNumber % manifest.length]` (see `getDailyPuzzleEntry` in `arcade/history-links/js/data.js`), so it cycles through the pool rather than ever running out, and a streak is only extended by a **win** on a new day — a loss still consumes that day's attempt but resets the streak, and either way the day's puzzle can't be replayed for score until tomorrow (Teacher Mode bypasses this, since it never records a score).

No backend, database, login system, or build step is required.
