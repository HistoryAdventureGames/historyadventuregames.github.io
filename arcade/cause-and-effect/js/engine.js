// Pure game-rule functions: match evaluation and scoring. The engine only ever
// compares the two selected cards' pairIds, so new topics (or hundreds of new
// cause/effect pairs) ship as pure data with zero changes here.
import { SCORING } from "./state.js";

export function evaluateMatch(causeId, effectId) {
  return causeId === effectId ? "correct" : "incorrect";
}

export function computeScore({ matchedCount, mistakes }) {
  const base = matchedCount * SCORING.pointsPerMatch;
  const penalty = mistakes * SCORING.mistakePenalty;
  return Math.max(0, base - penalty);
}
