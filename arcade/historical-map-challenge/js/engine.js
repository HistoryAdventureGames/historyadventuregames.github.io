// Pure scoring logic for Historical Map Challenge — no DOM, no state mutation.
//
// A guess and a target are both { x, y } fractions (0–1) of the map image.
// We convert the miss into a fraction of the map's *diagonal* (aspect-correct,
// using the image's pixel width/height) so scoring feels the same regardless
// of whether the map is wide (world) or tall (a single country).
import { SCORING } from "./state.js";

export function scoreGuess(guess, target, map) {
  const distanceFraction = missFraction(guess, target, map);
  return {
    points: pointsForFraction(distanceFraction),
    distanceFraction,
    label: proximityLabel(distanceFraction),
  };
}

export function missFraction(guess, target, map) {
  const width = map && map.width > 0 ? map.width : 1;
  const height = map && map.height > 0 ? map.height : 1;
  const dx = (guess.x - target.x) * width;
  const dy = (guess.y - target.y) * height;
  const diagonal = Math.hypot(width, height);
  if (diagonal === 0) return 1;
  return Math.min(1, Math.hypot(dx, dy) / diagonal);
}

function pointsForFraction(distanceFraction) {
  const { maxPointsPerItem, perfectFraction, zeroFraction, falloffExponent } = SCORING;
  if (distanceFraction <= perfectFraction) return maxPointsPerItem;
  if (distanceFraction >= zeroFraction) return 0;
  const closeness = (zeroFraction - distanceFraction) / (zeroFraction - perfectFraction); // 1 → 0
  return Math.round(maxPointsPerItem * Math.pow(closeness, falloffExponent));
}

export function proximityLabel(distanceFraction) {
  if (distanceFraction <= SCORING.perfectFraction) return "Bullseye!";
  if (distanceFraction <= 0.09) return "Very close";
  if (distanceFraction <= 0.18) return "Close";
  if (distanceFraction <= 0.3) return "Not bad";
  return "Way off";
}

// A 0–3 star rating from the round's percentage of the maximum, used only for
// end-screen flavor.
export function starRating(totalScore, itemCount) {
  const max = itemCount * SCORING.maxPointsPerItem;
  if (max === 0) return 0;
  const pct = totalScore / max;
  if (pct >= 0.85) return 3;
  if (pct >= 0.6) return 2;
  if (pct >= 0.35) return 1;
  return 0;
}
