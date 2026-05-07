# Global History Adventure Library

Static GitHub Pages version of the Global History adventure game library.

## Deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload every file and folder from this package into the root of the repository.
3. Commit the files to the `main` branch.
4. In GitHub, open repository Settings.
5. Open Pages.
6. Set Source to `Deploy from a branch`.
7. Set Branch to `main`.
8. Set Folder to `/root`.
9. Save.

GitHub will publish the site at a URL like:

```text
https://your-username.github.io/your-repository-name/
```

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
