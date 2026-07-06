// localStorage persistence for Timeline Builder: high scores and settings.
// Namespaced the same way the adventure library keys its saved progress.

const HIGH_SCORE_PREFIX = "timeline-builder:highscore:";
const SETTINGS_KEY = "timeline-builder:settings";

export function getHighScore(categoryId, modeId) {
  try {
    const raw = localStorage.getItem(highScoreKey(categoryId, modeId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setHighScoreIfBetter(categoryId, modeId, entry) {
  const current = getHighScore(categoryId, modeId);
  if (current && current.score >= entry.score) return { isNewHighScore: false, highScore: current };

  const highScore = { score: entry.score, accuracy: entry.accuracy, date: new Date().toISOString() };
  try {
    localStorage.setItem(highScoreKey(categoryId, modeId), JSON.stringify(highScore));
  } catch {
    // Storage can fail in private browsing; the session still works, it just won't persist.
  }
  return { isNewHighScore: true, highScore };
}

function highScoreKey(categoryId, modeId) {
  return `${HIGH_SCORE_PREFIX}${categoryId}:${modeId}`;
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { soundEnabled: true, musicEnabled: true };
    return { soundEnabled: true, musicEnabled: true, ...JSON.parse(raw) };
  } catch {
    return { soundEnabled: true, musicEnabled: true };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Non-fatal: settings just won't persist across sessions.
  }
}
