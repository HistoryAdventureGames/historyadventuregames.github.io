// Shared constants and the initial game state shape for Timeline Builder.

export const MODES = {
  easy: { id: "easy", label: "Easy", eventCount: 5, timeBudget: 60, scoreMultiplier: 1 },
  medium: { id: "medium", label: "Medium", eventCount: 10, timeBudget: 90, scoreMultiplier: 1.2 },
  hard: { id: "hard", label: "Hard", eventCount: 20, timeBudget: 150, scoreMultiplier: 1.5 },
  endless: { id: "endless", label: "Endless", eventCount: Infinity, timeBudget: 30, scoreMultiplier: 1.3 },
};

export const SCORING = {
  basePoints: 100,
  comboStep: 0.1,
  comboCap: 10,
  incorrectTimePenalty: 5,
  endlessCorrectTimeBonus: 2,
  endlessIncorrectTimePenalty: 5,
  endlessDrawBatch: 6,
};

export function createInitialGameState() {
  return {
    screen: "menu",
    categoryId: null,
    modeId: null,
    round: null,
    isPaused: false,
    settings: {
      soundEnabled: true,
      musicEnabled: true,
    },
  };
}

export function createRoundState({ categoryId, modeId, timeBudget }) {
  return {
    categoryId,
    modeId,
    tray: [],
    placed: [],
    total: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    correctCount: 0,
    attemptCount: 0,
    timeRemaining: timeBudget,
    status: "playing",
    pickedUpCardId: null,
    usedEventKeys: new Set(),
  };
}
