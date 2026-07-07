// Government Builder's high scores are keyed by mode, delegating to the
// shared arcade storage factory (same approach as the other arcade games).
import { createGameStorage } from "/arcade/storage.js";

const storage = createGameStorage("government-builder");

export const getHighScore = storage.getHighScore;
export const setHighScoreIfBetter = storage.setHighScoreIfBetter;
export const getSettings = storage.getSettings;
export const saveSettings = storage.saveSettings;
