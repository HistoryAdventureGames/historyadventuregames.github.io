# Global History Adventure Library


## Important Files

- `index.html` is the homepage.
- `app.js` is the adventure reader and game engine.
- `styles.css` is the site design.
- `content/adventure-manifest.json` lists the available adventures.
- `content/adventures/` stores the adventure JSON files.
- `images/` stores the SVG images used by the adventures.
- `.nojekyll` tells GitHub Pages to serve the static files directly.

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

No backend, database, login system, or build step is required.
