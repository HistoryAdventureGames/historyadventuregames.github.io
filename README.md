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
- `arcade/timeline-builder/` — the Timeline Builder game (see its own data format below).
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

No backend, database, login system, or build step is required.
