// Loads the crisis-card pool. Crises are content (titles, descriptions,
// option text) so they live in JSON, the same split Timeline Builder and
// History Links use between code (state.js) and data (their JSON files).
const DATA_BASE_URL = new URL("../data/", import.meta.url);

let crisesPromise = null;

export function loadCrises() {
  if (!crisesPromise) {
    crisesPromise = fetchJson(new URL("crises.json", DATA_BASE_URL)).catch((error) => {
      crisesPromise = null;
      throw error;
    });
  }
  return crisesPromise;
}

// Avoids repeating a crisis until the rest of the pool has been seen, the
// same "no immediate repeats" rule Timeline Builder's endless mode uses for
// events, so a short game doesn't feel like it's showing the same handful
// of cards over and over.
export function pickCrisis(pool, recentIds) {
  const eligible = pool.filter((crisis) => !recentIds.includes(crisis.id));
  const source = eligible.length > 0 ? eligible : pool;
  return source[Math.floor(Math.random() * source.length)];
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}
