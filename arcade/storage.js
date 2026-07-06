// Shared localStorage helpers for arcade games. Each game calls
// createGameStorage(gameId) once and gets back namespaced high-score,
// settings, and generic key/value helpers -- so every game persists data
// the same way without re-implementing try/catch boilerplate around
// localStorage (which can throw in private browsing / storage-disabled modes).
export function createGameStorage(gameId) {
  function getHighScore(key) {
    return readJson(`highscore:${key}`, null);
  }

  function setHighScoreIfBetter(key, entry) {
    const current = getHighScore(key);
    if (current && current.score >= entry.score) return { isNewHighScore: false, highScore: current };

    const highScore = { ...entry, date: new Date().toISOString() };
    writeJson(`highscore:${key}`, highScore);
    return { isNewHighScore: true, highScore };
  }

  function getSettings() {
    return { soundEnabled: true, musicEnabled: true, ...readJson("settings", {}) };
  }

  function saveSettings(settings) {
    writeJson("settings", settings);
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(`${gameId}:${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(`${gameId}:${key}`, JSON.stringify(value));
    } catch {
      // Storage can fail in private browsing; the session still works, it just won't persist.
    }
  }

  return { getHighScore, setHighScoreIfBetter, getSettings, saveSettings, readJson, writeJson };
}
