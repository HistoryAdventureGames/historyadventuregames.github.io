// Historical Map Challenge persistence: high score per challenge, via the
// shared arcade storage factory (namespaced localStorage with the usual
// private-browsing safety).
import { createGameStorage } from "/arcade/storage.js";

const storage = createGameStorage("historical-map-challenge");

export const getHighScore = storage.getHighScore;
export const setHighScoreIfBetter = storage.setHighScoreIfBetter;
export const getSettings = storage.getSettings;
export const saveSettings = storage.saveSettings;
