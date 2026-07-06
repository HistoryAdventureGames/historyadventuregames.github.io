// Pure game-rule functions: guess evaluation and scoring. The engine never
// looks at a group's `relationship` field -- it only ever compares the four
// selected item strings against each group's `items` array. That's what
// lets new relationship types (or hundreds of new puzzles) ship as pure
// data, with zero changes here.
import { SCORING } from "./state.js";

export function evaluateSelection(selectedItems, groups) {
  const unsolvedGroups = groups.filter((group) => !group.solved);

  const exactMatch = unsolvedGroups.find((group) => isSameSet(group.items, selectedItems));
  if (exactMatch) return { result: "correct", groupIndex: exactMatch.index };

  // A widely-used, genre-standard assist: if three of the four picks belong
  // to one real group, say so instead of a flat "wrong" -- it rewards partial
  // understanding without giving the answer away.
  const almostMatch = unsolvedGroups.find((group) => countOverlap(group.items, selectedItems) === 3);
  if (almostMatch) return { result: "one-away", groupIndex: almostMatch.index };

  return { result: "incorrect", groupIndex: -1 };
}

export function computeScore({ solvedCount, mistakes, timed, timeRemaining }) {
  const base = solvedCount * SCORING.pointsPerGroup;
  const penalty = mistakes * SCORING.mistakePenalty;
  const timeBonus = timed && timeRemaining ? Math.round(Math.max(0, timeRemaining)) * SCORING.timeBonusPerSecond : 0;
  return Math.max(0, base - penalty + timeBonus);
}

function isSameSet(a, b) {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((value) => setA.has(value));
}

function countOverlap(a, b) {
  const setA = new Set(a);
  return b.filter((value) => setA.has(value)).length;
}
