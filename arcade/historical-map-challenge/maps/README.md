# Map images

Drop the base map images used by Historical Map Challenge in this folder, then
reference each one from a challenge file's `map.src` (a bare filename here is
resolved to this folder, e.g. `"src": "united-states.png"`).

A map is just a blank/outline image. Terms are placed on it by normalized
coordinates (see `../data/challenges/_example.json`), so **the same image can
back many challenges** — a U.S. map can host Civil War battles, early cities,
the thirteen colonies, and so on.

## Recommended filenames

These match the uploaded base maps; use whatever names you like as long as the
challenge files point at them:

| File                 | Coverage                          |
| -------------------- | --------------------------------- |
| `world.png`          | Whole world                       |
| `eurasia.png`        | Europe + Asia                     |
| `asia.png`           | Asia                              |
| `europe-africa.png`  | Europe, Africa & the Middle East  |
| `north-america.png`  | North America                     |
| `americas.png`       | North + South America             |
| `united-states.png`  | United States                     |

## Tips

- **Big enough to read, small enough to load fast.** ~1600–2000px on the long
  edge and a compressed PNG/WebP is a good target; these files ship to every
  player.
- **Record the pixel dimensions** in the challenge's `map.width` / `map.height`
  — the authoring tool fills these in for you automatically. They only affect
  scoring (aspect-correct distance), not layout.
- **Licensing:** make sure you have the right to publish each image. If a map
  carries a visible watermark or requires credit, either use a version you're
  cleared to use or put the required credit in `map.attribution` (shown in the
  corner of the map in-game).
