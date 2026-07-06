import { MODES, SCORING, createInitialGameState, createRoundState } from "./state.js";
import { loadManifest, loadCategory, loadAllCategories, drawRandomEvents, shuffle } from "./data.js";
import { isPlacementCorrect, computePoints, computeAccuracy, isRoundWon } from "./engine.js";
import { DragController } from "./dragdrop.js";
import { renderMenu, renderPlaying, renderPauseOverlay, renderEndScreen } from "./render.js";
import { burstConfetti } from "/arcade/confetti.js";
import { AudioEngine } from "/arcade/audio.js";
import { getHighScore, setHighScoreIfBetter, getSettings, saveSettings } from "./storage.js";

const root = document.querySelector("#gameRoot");
const soundToggle = document.querySelector("#soundToggle");
const musicToggle = document.querySelector("#musicToggle");

const gameState = createInitialGameState();
gameState.settings = getSettings();
gameState.modeId = "easy";

const audio = new AudioEngine();
audio.setSoundEnabled(gameState.settings.soundEnabled);
audio.musicEnabled = gameState.settings.musicEnabled;

let manifest = [];
let allCategoriesPool = null;
let timerHandle = null;

init();

async function init() {
  applySettingsToToggles();
  applyRouteFromHash();
  root.innerHTML = `
    <div class="status-panel">
      <div class="loader" aria-hidden="true"></div>
      <h2>Loading the arcade data...</h2>
    </div>
  `;

  try {
    manifest = await loadManifest();
  } catch (error) {
    root.innerHTML = `
      <div class="error-panel">
        <h2>Timeline Builder could not load.</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
    return;
  }

  render();
}

function applyRouteFromHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const modeId = params.get("mode");
  const categoryId = params.get("category");
  if (modeId && MODES[modeId]) gameState.modeId = modeId;
  if (categoryId) gameState.categoryId = categoryId;
}

function updateMenuHash() {
  const params = new URLSearchParams();
  params.set("mode", gameState.modeId);
  if (gameState.categoryId) params.set("category", gameState.categoryId);
  history.replaceState(null, "", `#${params.toString()}`);
}

// ---------- Rendering ----------

function render() {
  if (gameState.screen === "menu") {
    root.innerHTML = renderMenu({
      manifest,
      modeId: gameState.modeId,
      categoryId: gameState.categoryId,
      getHighScore,
    });
    return;
  }

  if (gameState.screen === "playing") {
    root.innerHTML = renderPlaying(gameState.round, MODES[gameState.round.modeId]);
    setupDragController();
    if (gameState.isPaused) showPauseOverlay();
    return;
  }

  if (gameState.screen === "end") {
    const mode = MODES[gameState.round.modeId];
    const accuracy = computeAccuracy(gameState.round.correctCount, gameState.round.attemptCount);
    const highScoreEntry = getHighScore(highScoreCategoryKey(gameState.round), gameState.round.modeId);
    root.innerHTML = renderEndScreen({
      round: gameState.round,
      mode,
      highScoreEntry,
      isNewHighScore: gameState.round.isNewHighScore,
      accuracy,
    });
  }
}

function setupDragController() {
  const trayEl = root.querySelector("[data-tray]");
  const timelineEl = root.querySelector("[data-timeline]");
  if (!trayEl || !timelineEl) return;

  new DragController({
    trayEl,
    timelineEl,
    onDrop: (cardId, gapIndex) => attemptPlacement(cardId, gapIndex),
  });
}

function showPauseOverlay() {
  root.insertAdjacentHTML("beforeend", renderPauseOverlay());
}

function hidePauseOverlay() {
  root.querySelector(".tb-overlay")?.remove();
}

// ---------- Menu interactions ----------

function selectMode(modeId) {
  if (!MODES[modeId]) return;
  gameState.modeId = modeId;
  if (modeId === "endless") gameState.categoryId = null;
  updateMenuHash();
  render();
}

function selectCategory(categoryId) {
  gameState.categoryId = categoryId;
  updateMenuHash();
  render();
}

async function startRound() {
  const modeId = gameState.modeId;
  const mode = MODES[modeId];
  const categoryId = modeId === "endless" ? "all" : gameState.categoryId;
  if (modeId !== "endless" && !categoryId) return;

  root.innerHTML = `
    <div class="status-panel">
      <div class="loader" aria-hidden="true"></div>
      <h2>Building your timeline...</h2>
    </div>
  `;

  let firstBatch;
  try {
    if (modeId === "endless") {
      // loadCategory() (used by loadAllCategories) already returns a flat
      // array of normalized events per category, not a {events} wrapper.
      allCategoriesPool = allCategoriesPool || (await loadAllCategories(manifest)).flat();
      firstBatch = drawRandomEvents(allCategoriesPool, SCORING.endlessDrawBatch);
    } else {
      const entry = manifest.find((item) => item.id === categoryId);
      const events = await loadCategory(entry);
      firstBatch = shuffle(events).slice(0, Math.min(mode.eventCount, events.length));
    }
  } catch (error) {
    root.innerHTML = `<div class="error-panel"><h2>Could not load events.</h2><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  const round = createRoundState({ categoryId, modeId, timeBudget: mode.timeBudget });
  round.tray = firstBatch;
  round.total = modeId === "endless" ? Infinity : mode.eventCount;
  round.usedEventKeys = new Set(firstBatch.map((e) => e.id));

  gameState.round = round;
  gameState.screen = "playing";
  gameState.isPaused = false;
  audio.resume();
  startTimer();
  render();
  announce(`Round started. Drag or select an event to place it on the timeline.`);
}

// ---------- Timer ----------

function startTimer() {
  stopTimer();
  let lastTick = performance.now();
  timerHandle = window.setInterval(() => {
    if (gameState.isPaused || gameState.screen !== "playing") return;
    const now = performance.now();
    const delta = (now - lastTick) / 1000;
    lastTick = now;

    gameState.round.timeRemaining -= delta;
    updateHudTimer();

    if (gameState.round.timeRemaining <= 0) {
      gameState.round.timeRemaining = 0;
      endRound("time-up");
    }
  }, 200);
}

function stopTimer() {
  if (timerHandle) window.clearInterval(timerHandle);
  timerHandle = null;
}

function updateHudTimer() {
  const timerEl = root.querySelector("#tbTimer");
  if (timerEl) timerEl.textContent = `${Math.max(0, Math.ceil(gameState.round.timeRemaining))}s`;
}

// ---------- Placement ----------

function attemptPlacement(cardId, gapIndex) {
  const round = gameState.round;
  if (!round || round.status !== "playing") return;

  const cardIndex = round.tray.findIndex((event) => event.id === cardId);
  if (cardIndex === -1) return;
  const candidate = round.tray[cardIndex];

  const correct = isPlacementCorrect(round.placed, candidate, gapIndex);
  round.attemptCount += 1;
  round.pickedUpCardId = null;

  if (correct) {
    round.tray.splice(cardIndex, 1);
    round.placed.splice(gapIndex, 0, candidate);
    round.combo += 1;
    round.bestCombo = Math.max(round.bestCombo, round.combo);
    round.correctCount += 1;
    const mode = MODES[round.modeId];
    round.score += computePoints(mode.scoreMultiplier, round.combo - 1);
    audio.play("correct");
    flashCard(candidate.id, "correct");
    announce(`Correct. ${candidate.title} placed in ${formatYearForAnnounce(candidate.year)}.`);

    if (round.modeId === "endless") {
      round.timeRemaining = Math.min(round.timeRemaining + SCORING.endlessCorrectTimeBonus, 999);
      refillEndlessTrayIfNeeded();
    }
  } else {
    round.combo = 0;
    audio.play("incorrect");
    flashCard(candidate.id, "incorrect");
    const penalty = round.modeId === "endless" ? SCORING.endlessIncorrectTimePenalty : SCORING.incorrectTimePenalty;
    round.timeRemaining = Math.max(0, round.timeRemaining - penalty);
    announce(`Not quite. Try a different spot for ${candidate.title}.`);
  }

  render();

  if (correct && isRoundWon(round)) {
    endRound("won");
    return;
  }

  if (round.timeRemaining <= 0) {
    endRound("time-up");
  }
}

function refillEndlessTrayIfNeeded() {
  const round = gameState.round;
  if (round.tray.length > 2) return;

  let more = drawRandomEvents(allCategoriesPool, SCORING.endlessDrawBatch, round.usedEventKeys);
  if (more.length === 0) {
    // The combined event pool (~280 events) has been exhausted by a long
    // session. Let it recycle rather than leaving Endless mode stuck with an
    // empty tray — only currently placed/tray events stay excluded.
    round.usedEventKeys = new Set([...round.tray, ...round.placed].map((event) => event.id));
    more = drawRandomEvents(allCategoriesPool, SCORING.endlessDrawBatch, round.usedEventKeys);
  }
  more.forEach((event) => round.usedEventKeys.add(event.id));
  round.tray.push(...more);
}

function flashCard(cardId, kind) {
  window.requestAnimationFrame(() => {
    const card = root.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`);
    if (!card) return;
    card.classList.add(kind === "correct" ? "flash-correct" : "flash-incorrect");
    window.setTimeout(() => card.classList.remove("flash-correct", "flash-incorrect"), 420);
  });
}

// ---------- Pickup (keyboard + tap) ----------

function togglePickup(cardId) {
  const round = gameState.round;
  if (!round) return;
  round.pickedUpCardId = round.pickedUpCardId === cardId ? null : cardId;
  render();

  if (round.pickedUpCardId) {
    const firstGap = root.querySelector("[data-gap-index]");
    firstGap?.focus();
    announce("Event picked up. Use tab or arrow keys to choose a position, then press Enter to place it.");
  }
}

function cancelPickup() {
  const round = gameState.round;
  if (!round || !round.pickedUpCardId) return;
  const cardId = round.pickedUpCardId;
  round.pickedUpCardId = null;
  render();
  root.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`)?.focus();
  announce("Placement canceled.");
}

// ---------- Round lifecycle ----------

function endRound(reason) {
  stopTimer();
  const round = gameState.round;
  round.status = reason === "won" ? "won" : "time-up";

  const categoryKey = highScoreCategoryKey(round);
  const { isNewHighScore } = setHighScoreIfBetter(categoryKey, round.modeId, {
    score: round.score,
    accuracy: computeAccuracy(round.correctCount, round.attemptCount),
  });
  // A score of 0 "beating" a nonexistent previous high score isn't a real
  // achievement -- don't celebrate a round where nothing was ever placed.
  round.isNewHighScore = isNewHighScore && round.score > 0;

  gameState.screen = "end";
  render();

  if (reason === "won" || round.isNewHighScore) {
    audio.play("victory");
    burstConfetti();
  }
  announce(reason === "won" ? "Timeline complete." : "Time is up.");
}

function restartRound() {
  hidePauseOverlay();
  startRound();
}

function quitToMenu() {
  stopTimer();
  hidePauseOverlay();
  gameState.screen = "menu";
  gameState.round = null;
  gameState.isPaused = false;
  updateMenuHash();
  render();
}

function pauseGame() {
  if (!gameState.round || gameState.round.status !== "playing") return;
  gameState.isPaused = true;
  showPauseOverlay();
}

function resumeGame() {
  gameState.isPaused = false;
  hidePauseOverlay();
}

// ---------- High scores ----------

function highScoreCategoryKey(round) {
  return round.modeId === "endless" ? "all" : round.categoryId;
}

// ---------- Settings ----------

function applySettingsToToggles() {
  soundToggle?.setAttribute("aria-pressed", String(gameState.settings.soundEnabled));
  musicToggle?.setAttribute("aria-pressed", String(gameState.settings.musicEnabled));
  updateToggleIcon(soundToggle, gameState.settings.soundEnabled, "pi-speaker", "pi-speaker-off");
  updateToggleIcon(musicToggle, gameState.settings.musicEnabled, "pi-note", "pi-speaker-off");
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

  if (action !== "place-gap") audio.play("click");

  switch (action) {
    case "select-mode":
      selectMode(target.dataset.modeId);
      break;
    case "select-category":
      selectCategory(target.dataset.categoryId);
      break;
    case "start-round":
      startRound();
      break;
    case "pause":
      pauseGame();
      break;
    case "resume":
      resumeGame();
      break;
    case "restart-round":
      restartRound();
      break;
    case "quit-to-menu":
      quitToMenu();
      break;
    case "pickup-card":
      togglePickup(target.dataset.cardId);
      break;
    case "place-gap": {
      const round = gameState.round;
      if (round?.pickedUpCardId) attemptPlacement(round.pickedUpCardId, Number(target.dataset.gapIndex));
      break;
    }
    default:
      break;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") cancelPickup();

  if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && event.target.matches(".timeline-gap")) {
    const gaps = Array.from(root.querySelectorAll("[data-gap-index]"));
    const currentIndex = gaps.indexOf(event.target);
    if (currentIndex === -1) return;
    const nextIndex = event.key === "ArrowRight" ? currentIndex + 1 : currentIndex - 1;
    const next = gaps[Math.max(0, Math.min(gaps.length - 1, nextIndex))];
    next?.focus();
    event.preventDefault();
  }
});

function announce(message) {
  const region = root.querySelector("#tbLiveRegion");
  if (region) region.textContent = message;
}

function formatYearForAnnounce(year) {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
