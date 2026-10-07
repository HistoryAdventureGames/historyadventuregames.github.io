import { createInitialGameState, createRoundState, REGION_META } from "./state.js";
import { loadManifest, loadTopic, topicsForRegion, regionsInManifest, getRandomTopicEntry, selectRoundPairs } from "./data.js";
import { evaluateMatch, computeScore } from "./engine.js";
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

const audio = new AudioEngine();
audio.setSoundEnabled(gameState.settings.soundEnabled);
audio.musicEnabled = gameState.settings.musicEnabled;

let manifest = [];

init();

async function init() {
  applySettingsToToggles();
  renderLoading("Loading Cause & Effect...");

  try {
    manifest = await loadManifest();
  } catch (error) {
    root.innerHTML = `<div class="error-panel"><h2>Cause &amp; Effect could not load.</h2><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  // Default the selected region to the first one the manifest actually has.
  const regions = regionsInManifest(manifest);
  if (regions.length && !regions.includes(gameState.regionId)) {
    gameState.regionId = regions[0];
  }

  render();
}

function renderLoading(message) {
  root.innerHTML = `
    <div class="status-panel">
      <div class="loader" aria-hidden="true"></div>
      <h2>${escapeHtml(message)}</h2>
    </div>
  `;
}

// ---------- Rendering ----------

function render() {
  if (gameState.screen === "menu") {
    root.innerHTML = renderMenu({
      manifest,
      regionId: gameState.regionId,
      topicId: gameState.topicId,
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
    root.innerHTML = renderEndScreen({ round: gameState.round, isNewHighScore: gameState.round.isNewHighScore });
  }
}

function showSettingsOverlay() {
  root.insertAdjacentHTML("beforeend", renderSettingsOverlay());
}

function hideSettingsOverlay() {
  root.querySelector("[data-settings-overlay]")?.remove();
}

// ---------- Menu interactions ----------

function selectRegion(regionId) {
  if (!topicsForRegion(manifest, regionId).length) return;
  gameState.regionId = regionId;
  gameState.topicId = null; // reset to "Surprise me" when switching regions
  render();
}

function selectTopic(topicId) {
  // Empty string from the "Surprise me" card means random.
  gameState.topicId = topicId || null;
  render();
}

async function startRound() {
  let entry;
  if (gameState.topicId) {
    entry = manifest.find((item) => item.id === gameState.topicId) || null;
  } else {
    entry = getRandomTopicEntry(manifest, gameState.regionId, gameState.lastRandomTopicId);
    if (entry) gameState.lastRandomTopicId = entry.id;
  }

  if (!entry) {
    root.innerHTML = `<div class="error-panel"><h2>No topic is available for this region yet.</h2></div>`;
    return;
  }

  renderLoading("Loading topic...");

  let topic;
  try {
    topic = await loadTopic(entry);
  } catch (error) {
    root.innerHTML = `<div class="error-panel"><h2>Could not load this topic.</h2><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  // Carry the manifest's title/region onto the topic object so the round has
  // them even if the topic file omits them.
  const resolvedTopic = { ...topic, id: entry.id, title: topic.title || entry.title, region: topic.region || entry.region };
  const pairs = selectRoundPairs(resolvedTopic);

  if (pairs.length === 0) {
    root.innerHTML = `<div class="error-panel"><h2>This topic has no cause/effect pairs yet.</h2></div>`;
    return;
  }

  gameState.round = createRoundState({ topic: resolvedTopic, pairs });
  gameState.screen = "playing";
  gameState.isSettingsOpen = false;
  audio.resume();
  render();
  announce(`${resolvedTopic.title} loaded. Pick a cause, then the effect it led to.`);
}

// ---------- Matching ----------

function selectCard(side, pairId) {
  const round = gameState.round;
  if (!round || round.status !== "playing") return;
  if (round.matched.includes(pairId)) return;

  if (side === "cause") {
    round.selectedCauseId = round.selectedCauseId === pairId ? null : pairId;
  } else if (side === "effect") {
    round.selectedEffectId = round.selectedEffectId === pairId ? null : pairId;
  } else {
    return;
  }

  // Only evaluate once one card from each column is selected.
  if (round.selectedCauseId && round.selectedEffectId) {
    resolveSelection();
  } else {
    audio.play("click");
    round.feedback = null;
    render();
    focusCard(side, pairId);
  }
}

function resolveSelection() {
  const round = gameState.round;
  const causeId = round.selectedCauseId;
  const effectId = round.selectedEffectId;
  const result = evaluateMatch(causeId, effectId);

  if (result === "correct") {
    round.matched = [...round.matched, causeId];
    round.feedback = { kind: "correct", message: "Correct! Cause linked to its effect." };
    audio.play("correct");
    announce(round.feedback.message);
  } else {
    round.mistakes += 1;
    round.feedback = { kind: "incorrect", message: "Not a match — that effect came from a different cause." };
    audio.play("incorrect");
    announce(round.feedback.message);
    flashCards([["cause", causeId], ["effect", effectId]]);
  }

  round.selectedCauseId = null;
  round.selectedEffectId = null;
  round.score = computeScore({ matchedCount: round.matched.length, mistakes: round.mistakes });
  render();

  if (round.matched.length === round.pairs.length) {
    endRound();
  }
}

function clearSelection() {
  const round = gameState.round;
  if (!round) return;
  round.selectedCauseId = null;
  round.selectedEffectId = null;
  render();
}

function flashCards(pairs) {
  window.requestAnimationFrame(() => {
    pairs.forEach(([side, pairId]) => {
      const card = root.querySelector(`[data-side="${side}"][data-pair-id="${CSS.escape(pairId)}"]`);
      if (!card) return;
      card.classList.add("flash-incorrect");
      window.setTimeout(() => card.classList.remove("flash-incorrect"), 420);
    });
  });
}

function focusCard(side, pairId) {
  root.querySelector(`[data-side="${side}"][data-pair-id="${CSS.escape(pairId)}"]`)?.focus();
}

// ---------- Round lifecycle ----------

function endRound() {
  const round = gameState.round;
  round.status = "won";

  const result = setHighScoreIfBetter(round.regionId, { score: round.score });
  round.isNewHighScore = result.isNewHighScore && round.score > 0;

  gameState.screen = "end";
  render();
  audio.play("victory");
  burstConfetti();
  announce("Round complete. Every cause is linked to its effect.");
}

function restartRound() {
  hideSettingsOverlay();
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

  if (action === "select-card") {
    selectCard(target.dataset.side, target.dataset.pairId);
    return;
  }

  audio.play("click");

  switch (action) {
    case "select-region":
      selectRegion(target.dataset.regionId);
      break;
    case "select-topic":
      selectTopic(target.dataset.topicId);
      break;
    case "start-round":
      startRound();
      break;
    case "clear-selection":
      clearSelection();
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
  if (event.key === "Escape" && gameState.isSettingsOpen) closeSettings();
});

function announce(message) {
  const region = root.querySelector("#ceLiveRegion");
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
