// Cause & Effect persistence: sound/music settings and a best score per region,
// via the shared arcade storage factory.
import { createGameStorage } from "/arcade/storage.js";

const storage = createGameStorage("cause-and-effect");

export const getHighScore = storage.getHighScore;
export const setHighScoreIfBetter = storage.setHighScoreIfBetter;
export const getSettings = storage.getSettings;
export const saveSettings = storage.saveSettings;
