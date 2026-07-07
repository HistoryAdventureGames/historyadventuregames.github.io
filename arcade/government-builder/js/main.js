import { MODES, createInitialGameState, createRoundState } from "./state.js";
import { loadCrises, pickCrisis } from "./data.js";
import {
  applyGeneration,
  updateGoldenAge,
  checkGameOver,
  purchaseUpgrade,
  resolveCrisisOption,
  computeScore,
  determineEnding,
} from "./engine.js";
import {
  renderMenu,
  renderPlaying,
  renderCrisisOverlay,
  renderSettingsOverlay,
  renderEndScreen,
  escapeHtml,
} from "./render.js";
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

let crisisPool = [];

init();

async function init() {
  applySettingsToToggles();
  root.innerHTML = `
    <div class="status-panel">
      <div class="loader" aria-hidden="true"></div>
      <h2>Loading Government Builder...</h2>
    </div>
  `;

  try {
    crisisPool = await loadCrises();
  } catch (error) {
    root.innerHTML = `
      <div class="error-panel">
        <h2>Government Builder could not load.</h2>
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
      modeId: gameState.modeId,
      teacherMode: gameState.teacherMode,
      getHighScore,
    });
    return;
  }

  if (gameState.screen === "playing") {
    root.innerHTML = renderPlaying(gameState.round);
    if (gameState.round.activeCrisis) showCrisisOverlay();
    if (gameState.isSettingsOpen) showSettingsOverlay();
    return;
  }

  if (gameState.screen === "end") {
    const round = gameState.round;
    root.innerHTML = renderEndScreen({ round, ending: round.ending, isNewHighScore: round.isNewHighScore });
  }
}

function showCrisisOverlay() {
  root.insertAdjacentHTML("beforeend", renderCrisisOverlay(gameState.round.activeCrisis));
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

function toggleTeacherMode(enabled) {
  gameState.teacherMode = enabled;
  render();
}

function startRound() {
  const round = createRoundState({ modeId: gameState.modeId, teacherMode: gameState.teacherMode });
  gameState.round = round;
  gameState.screen = "playing";
  gameState.isSettingsOpen = false;
  audio.resume();
  render();
  announce("Term started. Set your policies, visit the Power-Up Shop, then end your turn.");
}

// ---------- Policies & shop ----------

function selectPolicyStance(policyId, stanceId) {
  const round = gameState.round;
  if (!round || round.status !== "playing" || round.activeCrisis) return;
  round.policyStances[policyId] = stanceId;
  render();
}

function buyUpgrade(upgradeId) {
  const round = gameState.round;
  if (!round || round.status !== "playing" || round.activeCrisis) return;
  const purchased = purchaseUpgrade(round, upgradeId);
  if (purchased) {
    audio.play("correct");
    render();
  }
}

// ---------- Turn lifecycle ----------

function endTurn() {
  const round = gameState.round;
  if (!round || round.status !== "playing" || round.activeCrisis) return;

  round.turn += 1;
  const generation = applyGeneration(round);
  const goldenAge = updateGoldenAge(round);

  const outcome = checkGameOver(round);
  if (outcome) {
    round.lastTurnSummary = summarizeGeneration(generation);
    finishRound(outcome);
    return;
  }

  const mode = MODES[round.modeId];
  const crisisRoll = Math.random();
  const shouldTriggerCrisis = round.turn > 1 && crisisRoll < mode.crisisChance;

  if (goldenAge.justActivated) {
    audio.play("victory");
    burstConfetti({ particleCount: 60 });
    round.lastTurnSummary = { kind: "good", message: "Golden Age begins! Sustained approval and stability now boost Treasury by 50%." };
  } else {
    round.lastTurnSummary = summarizeGeneration(generation);
  }

  if (shouldTriggerCrisis) {
    round.activeCrisis = pickCrisis(crisisPool, round.recentCrisisIds);
    round.recentCrisisIds = [...round.recentCrisisIds, round.activeCrisis.id].slice(-Math.max(1, crisisPool.length - 1));
  }

  render();
  announce(round.lastTurnSummary.message);
}

function summarizeGeneration(generation) {
  const parts = [];
  if (generation.treasuryPerTurn) parts.push(`Treasury ${signed(generation.treasuryPerTurn)}`);
  if (generation.approvalPerTurn) parts.push(`Approval ${signed(generation.approvalPerTurn)}`);
  if (generation.stabilityPerTurn) parts.push(`Stability ${signed(generation.stabilityPerTurn)}`);
  const message = parts.length > 0 ? parts.join(" · ") : "No change this turn.";
  return { kind: "neutral", message };
}

function signed(value) {
  return `${value > 0 ? "+" : ""}${Math.round(value)}`;
}

function resolveCrisis(optionIndex) {
  const round = gameState.round;
  if (!round || !round.activeCrisis) return;

  const crisis = round.activeCrisis;
  const result = resolveCrisisOption(round, crisis, optionIndex);
  round.activeCrisis = null;

  audio.play(result.isGoodOutcome ? "correct" : "incorrect");
  round.lastTurnSummary = { kind: result.isGoodOutcome ? "good" : "bad", message: crisisResultMessage(result) };

  const outcome = checkGameOver(round);
  render();
  announce(round.lastTurnSummary.message);

  if (outcome) finishRound(outcome);
}

function crisisResultMessage(result) {
  if (result.usedShield) return "Your Emergency Reserve absorbed the crisis's losses.";
  if (result.favored) return "Your prior policies paid off — this went better than expected.";
  if (result.resilience > 0) return "Your Diplomatic Corps softened the impact.";
  return result.isGoodOutcome ? "The nation weathered the crisis." : "The crisis took a real toll.";
}

function finishRound(outcome) {
  const round = gameState.round;
  round.status = outcome;
  round.score = computeScore(round);
  round.ending = determineEnding(round);

  let isNewHighScore = false;
  if (!round.teacherMode) {
    const result = setHighScoreIfBetter(round.modeId, { score: round.score });
    isNewHighScore = result.isNewHighScore && round.score > 0;
  }
  round.isNewHighScore = isNewHighScore;

  gameState.screen = "end";
  hideSettingsOverlay();
  render();

  if (round.ending.tone === "positive") {
    audio.play("victory");
    burstConfetti();
  } else if (round.ending.tone === "negative") {
    audio.play("incorrect");
  }
  announce(`${round.ending.heading}. ${round.ending.description}`);
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
  if (!gameState.round || gameState.round.status !== "playing" || gameState.round.activeCrisis) return;
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

  if (action !== "resolve-crisis") audio.play("click");

  switch (action) {
    case "select-mode":
      selectMode(target.dataset.modeId);
      break;
    case "start-round":
      startRound();
      break;
    case "select-policy-stance":
      selectPolicyStance(target.dataset.policyId, target.dataset.stanceId);
      break;
    case "buy-upgrade":
      buyUpgrade(target.dataset.upgradeId);
      break;
    case "end-turn":
      endTurn();
      break;
    case "resolve-crisis":
      resolveCrisis(Number(target.dataset.optionIndex));
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
  const region = root.querySelector("#gbLiveRegion");
  if (region) region.textContent = message;
}
