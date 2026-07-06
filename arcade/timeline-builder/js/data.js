// Loads the category manifest and category event files. Category JSON is
// only fetched once a player actually picks it (or, for Endless, once the
// player picks Endless) — nothing beyond the small manifest loads up front.

const DATA_BASE_URL = new URL("../data/", import.meta.url);

let manifestPromise = null;
const categoryPromises = new Map();

export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetchJson(new URL("manifest.json", DATA_BASE_URL)).catch((error) => {
      manifestPromise = null;
      throw error;
    });
  }
  return manifestPromise;
}

export async function loadCategory(entry) {
  if (!categoryPromises.has(entry.id)) {
    categoryPromises.set(
      entry.id,
      fetchJson(new URL(entry.file, DATA_BASE_URL)).catch((error) => {
        categoryPromises.delete(entry.id);
        throw error;
      }),
    );
  }
  const data = await categoryPromises.get(entry.id);
  return normalizeCategoryEvents(entry.id, data.category || entry.label, data.events);
}

export async function loadAllCategories(manifest) {
  const categories = await Promise.all(manifest.map((entry) => loadCategory(entry)));
  return categories;
}

function normalizeCategoryEvents(categoryId, categoryLabel, rawEvents) {
  return (Array.isArray(rawEvents) ? rawEvents : [])
    .filter((event) => event && typeof event.year === "number" && typeof event.title === "string")
    .map((event, index) => ({
      id: `${categoryId}::${index}::${event.year}`,
      year: event.year,
      title: event.title,
      categoryId,
      categoryLabel,
    }));
}

export function drawRandomEvents(pool, count, excludeKeys = new Set()) {
  const available = pool.filter((event) => !excludeKeys.has(event.id));
  return shuffle(available).slice(0, Math.min(count, available.length));
}

export function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

export function formatYear(year) {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}
