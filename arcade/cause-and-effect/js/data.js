// Loads the topic manifest and individual topic files. Topic JSON is only
// fetched once a round actually needs it (menu screens work off the manifest's
// inline titles and regions alone).
import { SCORING, shuffle } from "./state.js";

const DATA_BASE_URL = new URL("../data/", import.meta.url);

let manifestPromise = null;
const topicPromises = new Map();

export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetchJson(new URL("manifest.json", DATA_BASE_URL)).catch((error) => {
      manifestPromise = null;
      throw error;
    });
  }
  return manifestPromise;
}

export async function loadTopic(entry) {
  if (!topicPromises.has(entry.id)) {
    topicPromises.set(
      entry.id,
      fetchJson(new URL(entry.file, DATA_BASE_URL)).catch((error) => {
        topicPromises.delete(entry.id);
        throw error;
      }),
    );
  }
  return topicPromises.get(entry.id);
}

export function topicsForRegion(manifest, regionId) {
  return manifest.filter((entry) => entry.region === regionId);
}

export function regionsInManifest(manifest) {
  const seen = [];
  manifest.forEach((entry) => {
    if (entry.region && !seen.includes(entry.region)) seen.push(entry.region);
  });
  return seen;
}

export function getRandomTopicEntry(manifest, regionId, excludeId) {
  const inRegion = topicsForRegion(manifest, regionId);
  const pool = inRegion.length > 1 ? inRegion.filter((entry) => entry.id !== excludeId) : inRegion;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

// Pick the subset of pairs used for one round: shuffle the topic's pairs and
// take up to roundSize of them, so topics with extra pairs stay replayable.
export function selectRoundPairs(topic) {
  const pairs = Array.isArray(topic.pairs) ? topic.pairs : [];
  return shuffle(pairs).slice(0, Math.min(SCORING.roundSize, pairs.length));
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}
