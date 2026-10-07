// Shared constants and state shapes for Cause & Effect.
//
// A "region" the player picks (Global History / U.S. History) is just a tag on
// each topic in the manifest; the menu groups topics by whatever regions the
// manifest actually contains. REGION_META supplies friendly labels/blurbs for
// the regions we expect; an unknown region id falls back to a title-cased id.
//
// Each topic file is a flat list of cause/effect pairs. A round draws a random
// subset (roundSize) and shuffles the cause column and effect column
// independently, so a topic with more pairs than roundSize replays with fresh
// variety and nothing here needs to change when new topics are added as data.

export const REGION_META = {
  global: { label: "Global History", blurb: "Cause and effect across world history." },
  us: { label: "U.S. History", blurb: "Cause and effect across United States history." },
};

// Display-only tag on an effect: was it an immediate consequence or a
// longer-term historical trend? The engine never branches on it.
export const EFFECT_TYPE_META = {
  immediate: { label: "Immediate", blurb: "A direct, short-term consequence." },
  "long-term": { label: "Long-term", blurb: "A lasting historical trend or effect." },
};

export const SCORING = {
  pointsPerMatch: 100,
  mistakePenalty: 20,
  roundSize: 5, // at most this many pairs are drawn per round
};

export function createInitialGameState() {
  return {
    screen: "menu",
    regionId: "global",
    topicId: null, // null with a region selected = "Surprise me" (random topic)
    round: null,
    lastRandomTopicId: null,
    settings: {
      soundEnabled: true,
      musicEnabled: true,
    },
  };
}

// `pairs` is the already-shuffled, already-sliced list of pairs for this round.
// Each pair is { cause, effect, type, explanation }. We give each one a stable
// pairId for this round and build two independently-shuffled columns of cards
// that both reference it, so matching is just a pairId equality check.
export function createRoundState({ topic, pairs }) {
  const roundPairs = pairs.map((pair, index) => ({ ...pair, pairId: `p${index}` }));

  const causeCards = shuffle(
    roundPairs.map((pair) => ({ pairId: pair.pairId, text: pair.cause })),
  );
  const effectCards = shuffle(
    roundPairs.map((pair) => ({ pairId: pair.pairId, text: pair.effect, type: pair.type || null })),
  );

  return {
    topicId: topic.id,
    topicTitle: topic.title,
    regionId: topic.region,
    pairs: roundPairs,
    causeCards,
    effectCards,
    selectedCauseId: null,
    selectedEffectId: null,
    matched: [], // pairIds, in the order they were matched
    mistakes: 0,
    score: 0,
    status: "playing", // "playing" | "won"
    feedback: null, // { kind, message }
    isNewHighScore: false,
  };
}

export function getPair(round, pairId) {
  return round.pairs.find((pair) => pair.pairId === pairId) || null;
}

export function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
