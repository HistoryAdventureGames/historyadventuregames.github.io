# Map images

Drop the base map images used by Historical Map Challenge in this folder, then
reference each one from a challenge file's `map.src` (a bare filename here is
resolved to this folder, e.g. `"src": "united-states.png"`).

A map is just a blank/outline image. Terms are placed on it by normalized
coordinates (see `../data/challenges/_example.json`), so **the same image can
back many challenges** — a U.S. map can host Civil War battles, early cities,
the thirteen colonies, and so on.

## Current maps

Filenames are just a convention — a challenge file's `map.src` is what actually
wires it up — but keep new maps lowercase-with-hyphens to match these:

| File                    | Coverage                                    | Size (px)  |
| ----------------------- | -------------------------------------------- | ---------- |
| `world.png`             | Whole world                                  | 1200 × 608 |
| `eurasia.png`            | Europe + Asia (wide Mercator)                | 1040 × 605 |
| `europe.png`             | Europe                                       | 857 × 713  |
| `asia.png`               | Asia                                         | 822 × 713  |
| `mediterranean.png`      | Western/Central Europe, N. Africa, Mideast   | 1040 × 713 |
| `africa.png`             | Africa                                       | 729 × 713  |
| `americas.png`           | North + South America                        | 705 × 1009 |
| `united-states.png`      | United States (with county lines)            | 1200 × 750 |

All eight are sourced from d-maps.com. Per the license terms confirmed by the
site owner, d-maps.com permits commercial use of up to 10 of its maps — we're
using 8, so there's headroom for a couple more before that needs revisiting.
Each image carries a "© d-maps.com" credit baked into a corner of the graphic
itself; **don't crop that out** when adding new maps from the same source, and
don't add more from d-maps.com beyond the 10-map allowance without confirming
the terms again.

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
