// Timeline Builder's high scores are keyed by category + mode, so this
// composes that two-part key and delegates to the shared arcade storage
// factory (same localStorage keys as before the refactor -- no migration).
import { createGameStorage } from "/arcade/storage.js";

const storage = createGameStorage("timeline-builder");

export function getHighScore(categoryId, modeId) {
  return storage.getHighScore(highScoreKey(categoryId, modeId));
}

export function setHighScoreIfBetter(categoryId, modeId, entry) {
  return storage.setHighScoreIfBetter(highScoreKey(categoryId, modeId), entry);
}

export const getSettings = storage.getSettings;
export const saveSettings = storage.saveSettings;

function highScoreKey(categoryId, modeId) {
  return `${categoryId}:${modeId}`;
}
