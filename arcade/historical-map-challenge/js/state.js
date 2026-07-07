// Shared constants and state shapes for Historical Map Challenge.
//
// A "mode" the player picks (Battles, Empires, Countries...) is a content
// CATEGORY: every challenge file declares which category it belongs to, and
// the menu builds its mode list from whatever categories the manifest
// actually contains. CATEGORY_META just supplies friendly labels/blurbs for
// the categories we expect; unknown categories fall back to a title-cased id.

export const CATEGORY_META = {
  battles: { label: "Battles", blurb: "Pinpoint where history's key battles were fought." },
  empires: { label: "Empires", blurb: "Locate the heartland of great empires and civilizations." },
  countries: { label: "Countries", blurb: "Place countries — ancient and modern — on the map." },
  cities: { label: "Cities", blurb: "Find historic cities, capitals, and centers of trade." },
  landmarks: { label: "Landmarks", blurb: "Place wonders, monuments, and famous sites." },
  explorers: { label: "Explorations", blurb: "Trace where voyages of exploration began and ended." },
};

// Era ids -> the short tag shown on a challenge card, so a "Battles" mode can
// hold both an ancient and a U.S. challenge and the player can tell them apart.
export const ERA_META = {
  ancient: "Ancient",
  world: "World",
  us: "U.S.",
};

export const SCORING = {
  maxPointsPerItem: 1000,
  // Distances are measured as a fraction of the map image's diagonal, so the
  // same feel holds on a tall U.S. map and a wide world map.
  perfectFraction: 0.03, // within this of the target = full points ("bullseye")
  zeroFraction: 0.45, // beyond this = zero points
  falloffExponent: 1.35, // >1 makes near-misses fall off a little faster
  roundSize: 8, // at most this many terms are drawn per round
};

export function createInitialGameState() {
  return {
    screen: "menu",
    categoryId: null,
    challengeId: null, // null with a category selected = "Surprise me" (random)
    settings: {
      soundEnabled: true,
      musicEnabled: true,
    },
  };
}

// `items` is the already-shuffled, already-sliced list of terms for this round.
// Each item is { id, label, x, y, hint }; x/y are the target location as
// fractions (0–1) of the map image (top-left origin).
export function createRoundState({ challenge, items }) {
  return {
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    categoryId: challenge.category,
    map: challenge.map, // { src, width, height, alt, attribution }
    items,
    index: 0, // which term is active
    phase: "placing", // "placing" | "revealed"
    guess: null, // { x, y } fraction — the pending marker before it's locked
    hintShown: false,
    results: [], // one per placed term: { item, guess, points, distanceFraction, label }
    totalScore: 0,
    status: "playing", // "playing" | "complete"
  };
}

export function maxRoundScore(round) {
  return round.items.length * SCORING.maxPointsPerItem;
}

export function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
