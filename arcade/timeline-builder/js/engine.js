// Pure game-rule functions: placement validation and scoring. Kept free of
// DOM/state mutation so the rules are easy to unit-reason-about and reuse.
import { SCORING } from "./state.js";

// A placement is correct if the candidate's year fits between whatever is
// already confirmed on either side of the chosen gap. Checking only the
// immediate neighbors (an incremental insertion sort) is enough to guarantee
// a fully sorted timeline once every card has been placed correctly, while
// still giving the player instant right/wrong feedback on each drop.
export function isPlacementCorrect(placedSequence, candidateEvent, gapIndex) {
  const left = placedSequence[gapIndex - 1];
  const right = placedSequence[gapIndex];
  const fitsLeft = !left || left.year <= candidateEvent.year;
  const fitsRight = !right || candidateEvent.year <= right.year;
  return fitsLeft && fitsRight;
}

export function comboMultiplier(combo) {
  return 1 + Math.min(combo, SCORING.comboCap) * SCORING.comboStep;
}

export function computePoints(scoreMultiplier, combo) {
  return Math.round(SCORING.basePoints * scoreMultiplier * comboMultiplier(combo));
}

export function computeAccuracy(correctCount, attemptCount) {
  if (attemptCount === 0) return 100;
  return Math.round((correctCount / attemptCount) * 100);
}

export function isRoundWon(round) {
  return round.modeId !== "endless" && round.placed.length === round.total && round.tray.length === 0;
}
