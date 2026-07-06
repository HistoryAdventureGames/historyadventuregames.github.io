// Shared constants and state shapes for History Links.

export const MODES = {
  daily: { id: "daily", label: "Daily Challenge", timed: true, savesProgress: true },
  random: { id: "random", label: "Random Puzzle", timed: true, savesProgress: true },
  practice: { id: "practice", label: "Practice", timed: false, savesProgress: false },
};

export const SCORING = {
  pointsPerGroup: 100,
  mistakePenalty: 25,
  timeBonusPerSecond: 2,
  maxMistakes: 4,
  timeBudgetSeconds: 150,
};

export function createInitialGameState() {
  return {
    screen: "menu",
    modeId: "daily",
    teacherMode: false,
    selectedPracticePuzzleId: null,
    round: null,
    settings: {
      soundEnabled: true,
      musicEnabled: true,
    },
  };
}

// A puzzle's groups gain `solved` as the round progresses; tiles are a flat,
// shuffled list of { item, groupIndex } so the grid can reflow naturally as
// groups lock in, without the engine needing to know about layout.
export function createRoundState({ modeId, puzzle, timed, teacherMode }) {
  const groups = puzzle.groups.map((group, index) => ({ ...group, index, solved: false }));
  const tiles = shuffle(
    groups.flatMap((group) => group.items.map((item) => ({ item, groupIndex: group.index }))),
  );

  return {
    modeId,
    teacherMode,
    puzzleId: puzzle.id,
    puzzleTitle: puzzle.title,
    groups,
    tiles,
    selectedItems: [],
    mistakes: 0,
    solvedCount: 0,
    score: 0,
    timed: timed && !teacherMode,
    timeRemaining: timed && !teacherMode ? SCORING.timeBudgetSeconds : null,
    status: "playing",
    feedback: null,
  };
}

export function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
