import { createInitialGameState, createRoundState, SCORING } from "./state.js";
import { loadManifest, loadChallenge, pickRoundItems, challengesInCategory, getRandomChallengeEntry } from "./data.js";
import { scoreGuess } from "./engine.js";
import { MapPlacer } from "./placement.js";
import { renderMenu, renderPlaying, renderSettingsOverlay, renderEndScreen } from "./render.js";
import { burstConfetti } from "/arcade/confetti.js";
import { AudioEngine } from "/arcade/audio.js";
import { getHighScore, setHighScoreIfBetter, getSettings, saveSettings } from "./storage.js";

const root = document.querySelector("#gameRoot");
const soundToggle = document.querySelector("#soundToggle");
const musicToggle = document.querySelector("#musicToggle");

const gameState = createInitialGameState();
gameState.settings = getSettings();
gameState.isSettingsOpen = false;
gameState.lastRandomId = null;

const audio = new AudioEngine();
audio.setSoundEnabled(gameState.settings.soundEnabled);
audio.musicEnabled = gameState.settings.musicEnabled;

let manifest = [];

// One placement controller for the whole game; it only acts while a round is
// in the "placing" phase, and drops its pin markers onto whatever map surface
// is currently rendered.
const placer = new MapPlacer({
  root,
  canPlace: () => gameState.screen === "playing" && gameState.round?.phase === "placing" && !gameState.isSettingsOpen,
  onPlace: (x, y) => placeGuess(x, y),
});

init();

async function init() {
  applySettingsToToggles();
  root.innerHTML = `
    <div class="status-panel">
      <div class="loader" aria-hidden="true"></div>
      <h2>Loading map challenges...</h2>
    </div>
  `;

  try {
    manifest = await loadManifest();
  } catch (error) {
    root.innerHTML = `
      <div class="error-panel">
        <h2>Historical Map Challenge could not load.</h2>
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
      categoryId: gameState.categoryId,
      challengeId: gameState.challengeId,
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
    root.innerHTML = renderEndScreen({
      round: gameState.round,
      isNewHighScore: gameState.round.isNewHighScore,
      best: getHighScore(gameState.round.challengeId),
    });
  }
}

function showSettingsOverlay() {
  root.insertAdjacentHTML("beforeend", renderSettingsOverlay());
}

function hideSettingsOverlay() {
  root.querySelector("[data-settings-overlay]")?.remove();
}

// ---------- Menu interactions ----------

function selectCategory(categoryId) {
  gameState.categoryId = categoryId;
  gameState.challengeId = null; // default to "Surprise me" within the new mode
  render();
}

function selectChallenge(challengeId) {
  gameState.challengeId = challengeId || null;
  render();
}

async function startRound() {
  if (!gameState.categoryId) return;

  const pool = challengesInCategory(manifest, gameState.categoryId);
  const entry = gameState.challengeId
    ? pool.find((item) => item.id === gameState.challengeId)
    : getRandomChallengeEntry(pool, gameState.lastRandomId);
  if (!entry) return;
  if (!gameState.challengeId) gameState.lastRandomId = entry.id;

  root.innerHTML = `
    <div class="status-panel">
      <div class="loader" aria-hidden="true"></div>
      <h2>Loading map...</h2>
    </div>
  `;

  let challenge;
  try {
    challenge = await loadChallenge(entry);
  } catch (error) {
    root.innerHTML = `<div class="error-panel"><h2>Could not load this challenge.</h2><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  if (challenge.items.length === 0 || !challenge.map.src) {
    root.innerHTML = `<div class="error-panel"><h2>This challenge has no map or terms yet.</h2><p>Add a map image and at least one term to <code>${escapeHtml(entry.file)}</code>.</p><button class="secondary-button pixel-button" type="button" data-action="quit-to-menu">Back to menu</button></div>`;
    return;
  }

  gameState.round = createRoundState({ challenge, items: pickRoundItems(challenge) });
  gameState.screen = "playing";
  gameState.isSettingsOpen = false;
  audio.resume();
  preloadMap(challenge.map.src);
  render();
  announce(`Round started. Place ${gameState.round.items[0].label} on the map.`);
}

// ---------- Placing & revealing ----------

function placeGuess(x, y) {
  const round = gameState.round;
  if (!round || round.phase !== "placing") return;
  round.guess = { x, y };
  render();
  // Keep the placement gesture ergonomic for keyboard users: after the
  // re-render, move focus onto the pin so arrow keys nudge it right away.
  root.querySelector("[data-guess-pin]")?.setAttribute("tabindex", "0");
  root.querySelector("[data-guess-pin]")?.focus();
}

function nudgeGuess(dx, dy) {
  const round = gameState.round;
  if (!round || round.phase !== "placing") return;
  const base = round.guess || { x: 0.5, y: 0.5 };
  round.guess = {
    x: clamp01(base.x + dx),
    y: clamp01(base.y + dy),
  };
  render();
  const pin = root.querySelector("[data-guess-pin]");
  if (pin) {
    pin.setAttribute("tabindex", "0");
    pin.focus();
  }
}

function lockGuess() {
  const round = gameState.round;
  if (!round || round.phase !== "placing" || !round.guess) return;

  const item = round.items[round.index];
  const result = scoreGuess(round.guess, item, round.map);
  round.results.push({ item, guess: round.guess, ...result });
  round.totalScore += result.points;
  round.phase = "revealed";

  audio.play(result.points >= SCORING.maxPointsPerItem * 0.5 ? "correct" : "incorrect");
  render();
  announce(`${result.label}. ${item.label} earned ${result.points} points. The correct location is now shown.`);
}

function showHint() {
  const round = gameState.round;
  if (!round || round.phase !== "placing") return;
  round.hintShown = true;
  render();
}

function nextItem() {
  const round = gameState.round;
  if (!round || round.phase !== "revealed") return;

  if (round.index >= round.items.length - 1) {
    finishRound();
    return;
  }

  round.index += 1;
  round.phase = "placing";
  round.guess = null;
  round.hintShown = false;
  render();
  announce(`Place ${round.items[round.index].label} on the map.`);
}

function finishRound() {
  const round = gameState.round;
  round.status = "complete";

  const result = setHighScoreIfBetter(round.challengeId, {
    score: round.totalScore,
    maxScore: round.items.length * SCORING.maxPointsPerItem,
  });
  round.isNewHighScore = result.isNewHighScore && round.totalScore > 0;

  gameState.screen = "end";
  render();

  if (starRatingIsGreat(round)) {
    audio.play("victory");
    burstConfetti();
  }
  announce(`Round complete. You scored ${round.totalScore} points.`);
}

function starRatingIsGreat(round) {
  return round.totalScore >= round.items.length * SCORING.maxPointsPerItem * 0.6;
}

// ---------- Round lifecycle ----------

function restartRound() {
  hideSettingsOverlay();
  gameState.isSettingsOpen = false;
  startRound();
}

function quitToMenu() {
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

  audio.play("click");

  switch (action) {
    case "select-category":
      selectCategory(target.dataset.categoryId);
      break;
    case "select-challenge":
      selectChallenge(target.dataset.challengeId);
      break;
    case "start-round":
      startRound();
      break;
    case "lock-guess":
      lockGuess();
      break;
    case "show-hint":
      showHint();
      break;
    case "next-item":
      nextItem();
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && gameState.isSettingsOpen) {
    closeSettings();
    return;
  }

  if (gameState.screen !== "playing" || gameState.isSettingsOpen) return;
  const round = gameState.round;
  if (!round) return;

  if (round.phase === "placing") {
    const step = event.shiftKey ? 0.05 : 0.01;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        nudgeGuess(-step, 0);
        break;
      case "ArrowRight":
        event.preventDefault();
        nudgeGuess(step, 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        nudgeGuess(0, -step);
        break;
      case "ArrowDown":
        event.preventDefault();
        nudgeGuess(0, step);
        break;
      case "Enter":
        if (round.guess) {
          event.preventDefault();
          lockGuess();
        }
        break;
      default:
        break;
    }
  } else if (round.phase === "revealed" && event.key === "Enter") {
    event.preventDefault();
    nextItem();
  }
});

// Warm the browser cache for the map so the first render isn't blank while the
// (potentially large) image downloads.
function preloadMap(src) {
  const img = new Image();
  img.src = src;
}

function announce(message) {
  const region = root.querySelector("#mcLiveRegion");
  if (region) region.textContent = message;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
