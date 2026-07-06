import { MODES, SCORING, createInitialGameState, createRoundState, shuffle } from "./state.js";
import { loadManifest, loadPuzzle, getDailyPuzzleEntry, getRandomPuzzleEntry, todayDateKey } from "./data.js";
import { evaluateSelection, computeScore } from "./engine.js";
import { renderMenu, renderPlaying, renderSettingsOverlay, renderEndScreen } from "./render.js";
import { burstConfetti } from "/arcade/confetti.js";
import { AudioEngine } from "/arcade/audio.js";
import {
  getHighScore,
  setHighScoreIfBetter,
  getSettings,
  saveSettings,
  getDailyStreak,
  hasPlayedDailyToday,
  recordDailyAttempt,
} from "./storage.js";

const root = document.querySelector("#gameRoot");
const soundToggle = document.querySelector("#soundToggle");
const musicToggle = document.querySelector("#musicToggle");

const gameState = createInitialGameState();
gameState.settings = getSettings();
gameState.isSettingsOpen = false;
gameState.lastRandomPuzzleId = null;

const audio = new AudioEngine();
audio.setSoundEnabled(gameState.settings.soundEnabled);
audio.musicEnabled = gameState.settings.musicEnabled;

let manifest = [];
let timerHandle = null;

init();

async function init() {
  applySettingsToToggles();
  root.innerHTML = `
    <div class="status-panel">
      <div class="loader" aria-hidden="true"></div>
      <h2>Loading History Links...</h2>
    </div>
  `;

  try {
    manifest = await loadManifest();
  } catch (error) {
    root.innerHTML = `
      <div class="error-panel">
        <h2>History Links could not load.</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
    return;
  }

  render();
}

// ---------- Rendering ----------

function render() {
  if (gameState.screen === "menu") {
    root.innerHTML = renderMenu({
      manifest,
      modeId: gameState.modeId,
      teacherMode: gameState.teacherMode,
      practicePuzzleId: gameState.selectedPracticePuzzleId,
      dailyStreak: getDailyStreak(),
      hasPlayedToday: hasPlayedDailyToday(todayDateKey()),
      getHighScore,
    });
    return;
  }

  if (gameState.screen === "playing") {
    root.innerHTML = renderPlaying(gameState.round);
    if (gameState.isSettingsOpen) showSettingsOverlay();
    return;
  }

  if (gameState.screen === "end") {
    const round = gameState.round;
    const streak = round.modeId === "daily" && !round.teacherMode ? getDailyStreak() : null;
    root.innerHTML = renderEndScreen({ round, isNewHighScore: round.isNewHighScore, streak });
  }
}

function showSettingsOverlay() {
  root.insertAdjacentHTML("beforeend", renderSettingsOverlay());
}

function hideSettingsOverlay() {
  root.querySelector("[data-settings-overlay]")?.remove();
}

// ---------- Menu interactions ----------

function selectMode(modeId) {
  if (!MODES[modeId]) return;
  gameState.modeId = modeId;
  render();
}

function selectPracticePuzzle(puzzleId) {
  gameState.selectedPracticePuzzleId = puzzleId;
  render();
}

function toggleTeacherMode(enabled) {
  gameState.teacherMode = enabled;
  render();
}

async function startRound() {
  const modeId = gameState.modeId;
  const mode = MODES[modeId];

  let entry;
  if (modeId === "daily") {
    entry = getDailyPuzzleEntry(manifest, new Date());
  } else if (modeId === "random") {
    entry = getRandomPuzzleEntry(manifest, gameState.lastRandomPuzzleId);
    gameState.lastRandomPuzzleId = entry.id;
  } else {
    entry = manifest.find((item) => item.id === gameState.selectedPracticePuzzleId);
    if (!entry) return;
  }

  root.innerHTML = `
    <div class="status-panel">
      <div class="loader" aria-hidden="true"></div>
      <h2>Loading puzzle...</h2>
    </div>
  `;

  let puzzle;
  try {
    puzzle = await loadPuzzle(entry);
  } catch (error) {
    root.innerHTML = `<div class="error-panel"><h2>Could not load this puzzle.</h2><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  const round = createRoundState({ modeId, puzzle, timed: mode.timed, teacherMode: gameState.teacherMode });
  gameState.round = round;
  gameState.screen = "playing";
  gameState.isSettingsOpen = false;
  audio.resume();
  if (round.timed) startTimer();
  render();
  announce("Puzzle loaded. Select four cards you think belong together, then submit.");
}

// ---------- Timer ----------

function startTimer() {
  stopTimer();
  let lastTick = performance.now();
  timerHandle = window.setInterval(() => {
    if (gameState.isSettingsOpen || gameState.screen !== "playing" || !gameState.round.timed) return;
    const now = performance.now();
    const delta = (now - lastTick) / 1000;
    lastTick = now;

    gameState.round.timeRemaining -= delta;
    updateHudTimer();

    if (gameState.round.timeRemaining <= 0) {
      gameState.round.timeRemaining = 0;
      gameState.round.score = computeScore(gameState.round);
      endRound("lost");
    }
  }, 200);
}

function stopTimer() {
  if (timerHandle) window.clearInterval(timerHandle);
  timerHandle = null;
}

function updateHudTimer() {
  const timerEl = root.querySelector("#hlTimer");
  if (timerEl) timerEl.textContent = `${Math.max(0, Math.ceil(gameState.round.timeRemaining))}s`;
}

// ---------- Tile selection & guessing ----------

function toggleTile(item) {
  const round = gameState.round;
  if (!round || round.status !== "playing") return;

  const alreadySelected = round.selectedItems.includes(item);
  if (alreadySelected) {
    round.selectedItems = round.selectedItems.filter((selected) => selected !== item);
  } else if (round.selectedItems.length < 4) {
    round.selectedItems = [...round.selectedItems, item];
  } else {
    return;
  }

  audio.play("click");
  render();
  // Every action re-renders the whole screen (same pattern as the rest of
  // the arcade), which would otherwise drop keyboard focus back to <body>
  // after every single tile press. Put it right back on the tile the
  // player just activated so Tab/Enter selection of four cards is usable.
  focusTile(item);
}

function deselectAll() {
  const round = gameState.round;
  if (!round) return;
  round.selectedItems = [];
  render();
}

function shuffleTiles() {
  const round = gameState.round;
  if (!round) return;
  round.tiles = shuffle(round.tiles);
  render();
  root.querySelector(".hl-grid [data-item]")?.focus();
}

function focusTile(item) {
  root.querySelector(`[data-item="${CSS.escape(item)}"]`)?.focus();
}

function submitGuess() {
  const round = gameState.round;
  if (!round || round.status !== "playing" || round.selectedItems.length !== 4) return;

  const guessedItems = [...round.selectedItems];
  const evaluation = evaluateSelection(guessedItems, round.groups);

  if (evaluation.result === "correct") {
    const group = round.groups[evaluation.groupIndex];
    group.solved = true;
    round.solvedCount += 1;
    round.feedback = { kind: "correct", message: `Correct! ${group.label}.` };
    audio.play("correct");
    announce(round.feedback.message);
  } else {
    round.mistakes += 1;
    const isOneAway = evaluation.result === "one-away";
    round.feedback = {
      kind: isOneAway ? "one-away" : "incorrect",
      message: isOneAway ? "One away! Three of these four belong together." : "Not quite — try a different combination.",
    };
    audio.play("incorrect");
    announce(round.feedback.message);
    flashTiles(guessedItems);
  }

  round.selectedItems = [];
  round.score = computeScore(round);
  render();

  if (round.solvedCount === 4) {
    endRound("won");
    return;
  }

  if (round.mistakes >= SCORING.maxMistakes) {
    endRound("lost");
    return;
  }

  // Wrong/one-away guesses leave their tiles in the grid; a correct guess
  // removes them (they moved into the new solved banner), so fall back to
  // the first remaining tile so keyboard play can continue without a
  // manual re-Tab from the top of the page.
  const firstGuessedTileStillPresent = guessedItems.find((item) => root.querySelector(`[data-item="${CSS.escape(item)}"]`));
  if (firstGuessedTileStillPresent) {
    focusTile(firstGuessedTileStillPresent);
  } else {
    root.querySelector(".hl-grid [data-item]")?.focus();
  }
}

function flashTiles(items) {
  window.requestAnimationFrame(() => {
    items.forEach((item) => {
      const tile = root.querySelector(`[data-item="${CSS.escape(item)}"]`);
      if (!tile) return;
      tile.classList.add("flash-incorrect");
      window.setTimeout(() => tile.classList.remove("flash-incorrect"), 420);
    });
  });
}

// ---------- Round lifecycle ----------

function endRound(reason) {
  stopTimer();
  const round = gameState.round;
  round.status = reason;

  let isNewHighScore = false;
  if (MODES[round.modeId].savesProgress && !round.teacherMode) {
    const result = setHighScoreIfBetter(round.modeId, { score: round.score });
    isNewHighScore = result.isNewHighScore && round.score > 0;
  }
  round.isNewHighScore = isNewHighScore;

  if (round.modeId === "daily" && !round.teacherMode) {
    recordDailyAttempt(todayDateKey(), reason === "won");
  }

  gameState.screen = "end";
  render();

  if (reason === "won") {
    audio.play("victory");
    burstConfetti();
  }
  announce(reason === "won" ? "Puzzle complete." : "Out of guesses.");
}

function restartRound() {
  hideSettingsOverlay();
  startRound();
}

function quitToMenu() {
  stopTimer();
  hideSettingsOverlay();
  gameState.screen = "menu";
  gameState.round = null;
  gameState.isSettingsOpen = false;
  render();
}

function openSettings() {
  if (!gameState.round || gameState.round.status !== "playing") return;
  gameState.isSettingsOpen = true;
  showSettingsOverlay();
}

function closeSettings() {
  gameState.isSettingsOpen = false;
  hideSettingsOverlay();
}

// ---------- Settings (sound/music) ----------

function applySettingsToToggles() {
  soundToggle?.setAttribute("aria-pressed", String(gameState.settings.soundEnabled));
  musicToggle?.setAttribute("aria-pressed", String(gameState.settings.musicEnabled));
  updateToggleIcon(soundToggle, gameState.settings.soundEnabled, "pi-speaker", "pi-speaker-off");
  updateToggleIcon(musicToggle, gameState.settings.musicEnabled, "pi-music", "pi-music-off");
}

function updateToggleIcon(button, enabled, onIcon, offIcon) {
  const use = button?.querySelector("use");
  if (!use) return;
  use.setAttribute("href", `#${enabled ? onIcon : offIcon}`);
}

soundToggle?.addEventListener("click", () => {
  gameState.settings.soundEnabled = !gameState.settings.soundEnabled;
  audio.setSoundEnabled(gameState.settings.soundEnabled);
  saveSettings(gameState.settings);
  applySettingsToToggles();
});

musicToggle?.addEventListener("click", () => {
  gameState.settings.musicEnabled = !gameState.settings.musicEnabled;
  audio.setMusicEnabled(gameState.settings.musicEnabled);
  saveSettings(gameState.settings);
  applySettingsToToggles();
  audio.resume();
});

// ---------- Input delegation ----------

root.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "toggle-tile") {
    toggleTile(target.dataset.item);
    return;
  }

  audio.play("click");

  switch (action) {
    case "select-mode":
      selectMode(target.dataset.modeId);
      break;
    case "select-practice-puzzle":
      selectPracticePuzzle(target.dataset.puzzleId);
      break;
    case "start-round":
      startRound();
      break;
    case "shuffle-tiles":
      shuffleTiles();
      break;
    case "deselect-all":
      deselectAll();
      break;
    case "submit-guess":
      submitGuess();
      break;
    case "open-settings":
      openSettings();
      break;
    case "close-settings":
      closeSettings();
      break;
    case "restart-round":
      restartRound();
      break;
    case "quit-to-menu":
      quitToMenu();
      break;
    default:
      break;
  }
});

root.addEventListener("change", (event) => {
  if (event.target.id === "teacherModeToggle") {
    toggleTeacherMode(event.target.checked);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && gameState.isSettingsOpen) closeSettings();
});

function announce(message) {
  const region = root.querySelector("#hlLiveRegion");
  if (region) region.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
