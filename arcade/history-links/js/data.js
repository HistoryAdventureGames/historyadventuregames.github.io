// Loads the puzzle manifest and individual puzzle files, and provides the
// date math for picking "today's" puzzle. Puzzle JSON is only fetched once
// a round actually needs it (menu screens work off the manifest's inline
// titles alone).
const DATA_BASE_URL = new URL("../data/", import.meta.url);

let manifestPromise = null;
const puzzlePromises = new Map();

export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetchJson(new URL("manifest.json", DATA_BASE_URL)).catch((error) => {
      manifestPromise = null;
      throw error;
    });
  }
  return manifestPromise;
}

export async function loadPuzzle(entry) {
  if (!puzzlePromises.has(entry.id)) {
    puzzlePromises.set(
      entry.id,
      fetchJson(new URL(entry.file, DATA_BASE_URL)).catch((error) => {
        puzzlePromises.delete(entry.id);
        throw error;
      }),
    );
  }
  return puzzlePromises.get(entry.id);
}

// Deterministic "puzzle of the day": every device sees the same puzzle on
// the same calendar date, and it never runs out even with a small manifest
// -- it just cycles back through the pool once every manifest.length days.
export function getDailyPuzzleEntry(manifest, date = new Date()) {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const index = ((dayNumber % manifest.length) + manifest.length) % manifest.length;
  return manifest[index];
}

export function getRandomPuzzleEntry(manifest, excludeId) {
  const pool = manifest.length > 1 ? manifest.filter((entry) => entry.id !== excludeId) : manifest;
  return pool[Math.floor(Math.random() * pool.length)];
}

// A local (not UTC) YYYY-MM-DD key -- this is what "today" and "streak"
// tracking are keyed on, since the game runs entirely in the player's browser.
export function todayDateKey(date = new Date()) {
  return dateToKey(date);
}

export function offsetDateKey(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return dateToKey(date);
}

function dateToKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}
