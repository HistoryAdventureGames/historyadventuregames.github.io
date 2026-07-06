// History Links persistence: high scores per mode (via the shared arcade
// storage factory), plus the Daily Challenge streak, which needs its own
// shape (last played date, last completed date, current streak, best streak).
import { createGameStorage } from "/arcade/storage.js";
import { offsetDateKey } from "./data.js";

const storage = createGameStorage("history-links");

export const getHighScore = storage.getHighScore;
export const setHighScoreIfBetter = storage.setHighScoreIfBetter;
export const getSettings = storage.getSettings;
export const saveSettings = storage.saveSettings;

const STREAK_KEY = "daily-streak";
const DEFAULT_STREAK = { lastPlayedDate: null, lastCompletedDate: null, currentStreak: 0, bestStreak: 0 };

export function getDailyStreak() {
  return { ...DEFAULT_STREAK, ...storage.readJson(STREAK_KEY, {}) };
}

// "Played" (attempted, win or lose) is what locks out a second try today --
// a loss still consumes the day's attempt, matching how daily-challenge
// games conventionally work.
export function hasPlayedDailyToday(todayKey) {
  return getDailyStreak().lastPlayedDate === todayKey;
}

export function recordDailyAttempt(todayKey, won) {
  const streak = getDailyStreak();
  if (streak.lastPlayedDate === todayKey) return streak;

  const continuesStreak = won && streak.lastCompletedDate === offsetDateKey(todayKey, -1);
  const currentStreak = won ? (continuesStreak ? streak.currentStreak + 1 : 1) : 0;
  const next = {
    lastPlayedDate: todayKey,
    lastCompletedDate: won ? todayKey : streak.lastCompletedDate,
    currentStreak,
    bestStreak: Math.max(streak.bestStreak, currentStreak),
  };
  storage.writeJson(STREAK_KEY, next);
  return next;
}
