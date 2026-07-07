// Loads the challenge manifest and individual challenge files, and normalizes
// them. Challenge JSON is only fetched once a player actually starts a round;
// the menu works off the manifest's inline titles/categories alone.
import { CATEGORY_META, ERA_META, SCORING, shuffle } from "./state.js";

const DATA_BASE_URL = new URL("../data/", import.meta.url);
const MAPS_BASE_URL = "/arcade/historical-map-challenge/maps/";

let manifestPromise = null;
const challengePromises = new Map();

export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetchJson(new URL("manifest.json", DATA_BASE_URL))
      .then((entries) => (Array.isArray(entries) ? entries : []))
      .catch((error) => {
        manifestPromise = null;
        throw error;
      });
  }
  return manifestPromise;
}

export async function loadChallenge(entry) {
  if (!challengePromises.has(entry.id)) {
    challengePromises.set(
      entry.id,
      fetchJson(new URL(entry.file, DATA_BASE_URL))
        .then((raw) => normalizeChallenge(raw, entry))
        .catch((error) => {
          challengePromises.delete(entry.id);
          throw error;
        }),
    );
  }
  return challengePromises.get(entry.id);
}

function normalizeChallenge(raw, entry) {
  const rawMap = raw.map || {};
  const src = rawMap.src ? resolveMapSrc(rawMap.src) : "";
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .filter((item) => item && typeof item.label === "string" && isFraction(item.x) && isFraction(item.y))
    .map((item, index) => ({
      id: String(item.id || `${entry.id}::${index}`),
      label: item.label,
      x: clampFraction(item.x),
      y: clampFraction(item.y),
      hint: typeof item.hint === "string" ? item.hint : "",
    }));

  return {
    id: raw.id || entry.id,
    title: raw.title || entry.title,
    category: raw.category || entry.category || "landmarks",
    era: raw.era || entry.era || "world",
    map: {
      src,
      width: Number(rawMap.width) || 0,
      height: Number(rawMap.height) || 0,
      alt: rawMap.alt || `Blank map for ${raw.title || entry.title}`,
      attribution: rawMap.attribution || "",
    },
    items,
  };
}

// Map paths may be given root-absolute ("/arcade/.../maps/world.png") or as a
// bare filename ("world.png"), which we resolve against the game's maps folder.
function resolveMapSrc(src) {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("/")) return src;
  return MAPS_BASE_URL + src.replace(/^\.?\//, "");
}

export function pickRoundItems(challenge) {
  return shuffle(challenge.items).slice(0, Math.min(SCORING.roundSize, challenge.items.length));
}

// ---------- Menu helpers (operate on the lightweight manifest) ----------

// Distinct categories, in the order CATEGORY_META lists them, then any extras
// in first-seen order — so the mode buttons have a stable, sensible order.
export function distinctCategories(manifest) {
  const present = new Set(manifest.map((entry) => entry.category).filter(Boolean));
  const known = Object.keys(CATEGORY_META).filter((id) => present.has(id));
  const extras = [...present].filter((id) => !CATEGORY_META[id]);
  return [...known, ...extras];
}

export function categoryLabel(categoryId) {
  return CATEGORY_META[categoryId]?.label || titleCase(categoryId);
}

export function categoryBlurb(categoryId) {
  return CATEGORY_META[categoryId]?.blurb || "";
}

export function eraLabel(era) {
  return ERA_META[era] || titleCase(era || "");
}

export function challengesInCategory(manifest, categoryId) {
  return manifest.filter((entry) => entry.category === categoryId);
}

export function getRandomChallengeEntry(entries, excludeId) {
  const pool = entries.length > 1 ? entries.filter((entry) => entry.id !== excludeId) : entries;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

function titleCase(value) {
  return String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isFraction(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function clampFraction(value) {
  return Math.max(0, Math.min(1, value));
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}
