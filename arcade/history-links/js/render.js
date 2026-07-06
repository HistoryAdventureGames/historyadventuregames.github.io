// HTML-string renderers for each History Links screen.
import { MODES } from "./state.js";

const TIER_LABELS = { 1: "Foundational", 2: "Intermediate", 3: "Advanced", 4: "Expert" };

export function renderMenu({ manifest, modeId, teacherMode, practicePuzzleId, dailyStreak, hasPlayedToday, getHighScore }) {
  return `
    <section class="hl-menu" aria-labelledby="hlMenuHeading">
      <h2 id="hlMenuHeading" class="visually-hidden">Choose a mode</h2>

      <div class="hl-panel pixel-frame">
        <p class="hl-panel-label pixel-font">1. Choose a mode</p>
        <div class="hl-mode-row" role="group" aria-label="Game mode">
          ${Object.values(MODES).map((mode) => renderModeButton(mode, mode.id === modeId)).join("")}
        </div>
        ${renderModeDetail({ modeId, dailyStreak, hasPlayedToday, getHighScore })}
      </div>

      ${modeId === "practice" ? renderPuzzlePicker(manifest, practicePuzzleId) : ""}

      <div class="hl-panel pixel-frame hl-teacher-panel">
        <label class="hl-teacher-toggle">
          <input type="checkbox" id="teacherModeToggle" ${teacherMode ? "checked" : ""}>
          <span>
            <strong>Teacher Mode</strong>
            <span class="hl-teacher-detail">Turns off the timer and skips saving a score &mdash; built for playing as a class.</span>
          </span>
        </label>
      </div>

      <div class="hl-start-row">
        <button
          class="primary-button pixel-button hl-start-button"
          type="button"
          data-action="start-round"
          ${modeId === "practice" && !practicePuzzleId ? "disabled" : ""}
          ${modeId === "daily" && hasPlayedToday && !teacherMode ? "disabled" : ""}
        >
          ${modeId === "daily" && hasPlayedToday && !teacherMode ? "Come back tomorrow" : "Start"}
        </button>
        ${modeId === "practice" && !practicePuzzleId ? `<p class="hl-start-hint">Pick a puzzle above to begin.</p>` : ""}
        ${modeId === "daily" && hasPlayedToday && !teacherMode ? `<p class="hl-start-hint">You already solved today's puzzle. Try Teacher Mode to replay it untimed.</p>` : ""}
      </div>
    </section>
  `;
}

function renderModeButton(mode, isSelected) {
  return `
    <button
      class="hl-mode-button pixel-button ${isSelected ? "is-selected" : ""}"
      type="button"
      data-action="select-mode"
      data-mode-id="${mode.id}"
      aria-pressed="${isSelected}"
    >
      ${mode.label}
    </button>
  `;
}

function renderModeDetail({ modeId, dailyStreak, hasPlayedToday, getHighScore }) {
  if (modeId === "daily") {
    return `
      <p class="hl-mode-detail">One shared puzzle for today. Solve it to keep your streak alive.</p>
      <p class="hl-streak">
        Current streak: <strong>${dailyStreak.currentStreak}</strong> &middot;
        Best streak: <strong>${dailyStreak.bestStreak}</strong>
        ${hasPlayedToday ? " &middot; <strong>Solved today</strong>" : ""}
      </p>
    `;
  }

  if (modeId === "random") {
    const best = getHighScore("random");
    return `
      <p class="hl-mode-detail">A fresh puzzle pulled at random every time. Play as many rounds as you like.</p>
      ${best ? `<p class="hl-streak">Best score: <strong>${best.score}</strong></p>` : ""}
    `;
  }

  return `<p class="hl-mode-detail">Pick any puzzle below and take your time &mdash; untimed, and mistakes just help you learn.</p>`;
}

function renderPuzzlePicker(manifest, selectedId) {
  return `
    <div class="hl-panel pixel-frame">
      <p class="hl-panel-label pixel-font">2. Choose a puzzle</p>
      <div class="hl-puzzle-list">
        ${manifest.map((entry) => `
          <button
            class="hl-puzzle-card pixel-frame--sm pixel-frame ${entry.id === selectedId ? "is-selected" : ""}"
            type="button"
            data-action="select-practice-puzzle"
            data-puzzle-id="${escapeAttribute(entry.id)}"
            aria-pressed="${entry.id === selectedId}"
          >
            ${escapeHtml(entry.title)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderHud(round) {
  const mistakesRemaining = 4 - round.mistakes;

  return `
    <div class="hl-hud" role="group" aria-label="Round status">
      <div class="hl-hud-stat">
        <span class="hl-hud-label">Score</span>
        <span class="hl-hud-value">${round.score}</span>
      </div>
      <div class="hl-hud-stat">
        <span class="hl-hud-label">Mistakes Remaining</span>
        <span class="hl-hud-value hl-mistake-pips" aria-hidden="true">
          ${Array.from({ length: 4 }, (_, i) => `<span class="hl-mistake-pip ${i < mistakesRemaining ? "is-active" : ""}"></span>`).join("")}
        </span>
        <span class="visually-hidden">${mistakesRemaining} of 4 remaining</span>
      </div>
      ${round.timed ? `
        <div class="hl-hud-stat">
          <span class="hl-hud-label">Time</span>
          <span class="hl-hud-value" id="hlTimer">${Math.max(0, Math.ceil(round.timeRemaining))}s</span>
        </div>
      ` : `
        <div class="hl-hud-stat">
          <span class="hl-hud-label">Mode</span>
          <span class="hl-hud-value">${round.teacherMode ? "Teacher" : "Untimed"}</span>
        </div>
      `}
      <div class="hl-hud-actions">
        <button class="pixel-button arcade-icon-button" type="button" data-action="open-settings" aria-label="Settings">
          <svg class="pixel-icon" viewBox="0 0 24 24"><use href="#pi-gear"></use></svg>
        </button>
      </div>
    </div>
  `;
}

export function renderPlaying(round) {
  const remainingTiles = round.tiles.filter((tile) => !round.groups[tile.groupIndex].solved);
  const canSubmit = round.selectedItems.length === 4;

  return `
    <section class="hl-playing" aria-labelledby="hlPlayingHeading">
      <h2 id="hlPlayingHeading" class="visually-hidden">${escapeHtml(round.puzzleTitle)}</h2>
      ${renderHud(round)}

      <div class="hl-solved-groups">
        ${round.groups.filter((g) => g.solved).map(renderSolvedBanner).join("")}
      </div>

      <div class="hl-grid" data-tile-count="${remainingTiles.length}">
        ${remainingTiles.map((tile) => renderTile(tile, round.selectedItems.includes(tile.item))).join("")}
      </div>

      <div class="hl-feedback" aria-live="polite">${round.feedback ? `<p class="hl-feedback-message hl-feedback-${round.feedback.kind}">${escapeHtml(round.feedback.message)}</p>` : ""}</div>

      <div class="hl-actions">
        <button class="secondary-button pixel-button" type="button" data-action="shuffle-tiles">Shuffle</button>
        <button class="secondary-button pixel-button" type="button" data-action="deselect-all" ${round.selectedItems.length === 0 ? "disabled" : ""}>Deselect All</button>
        <button class="primary-button pixel-button" type="button" data-action="submit-guess" ${canSubmit ? "" : "disabled"}>Submit</button>
      </div>

      <div id="hlLiveRegion" class="visually-hidden" aria-live="polite"></div>
    </section>
  `;
}

function renderSolvedBanner(group) {
  const tier = group.tier || 1;
  return `
    <div class="hl-solved-banner hl-tier-${tier} pixel-frame">
      <p class="hl-solved-label">${escapeHtml(group.label)} <span class="hl-solved-tier">${TIER_LABELS[tier] || ""}</span></p>
      <p class="hl-solved-items">${group.items.map(escapeHtml).join(" &middot; ")}</p>
      <p class="hl-solved-explanation">${escapeHtml(group.explanation)}</p>
    </div>
  `;
}

function renderTile(tile, isSelected) {
  return `
    <button
      type="button"
      class="hl-tile pixel-frame--sm pixel-frame ${isSelected ? "is-selected" : ""}"
      data-action="toggle-tile"
      data-item="${escapeAttribute(tile.item)}"
      aria-pressed="${isSelected}"
    >
      ${escapeHtml(tile.item)}
    </button>
  `;
}

export function renderSettingsOverlay() {
  return `
    <div class="hl-overlay" data-settings-overlay role="dialog" aria-modal="true" aria-labelledby="hlSettingsHeading">
      <div class="hl-overlay-panel pixel-frame">
        <h2 id="hlSettingsHeading" class="pixel-heading">Settings</h2>
        <div class="hl-overlay-actions">
          <button class="primary-button pixel-button" type="button" data-action="close-settings">Resume</button>
          <button class="secondary-button pixel-button" type="button" data-action="restart-round">Restart Puzzle</button>
          <button class="secondary-button pixel-button" type="button" data-action="quit-to-menu">Quit to Menu</button>
        </div>
      </div>
    </div>
  `;
}

export function renderEndScreen({ round, isNewHighScore, streak }) {
  const won = round.status === "won";

  return `
    <section class="hl-end pixel-frame" aria-labelledby="hlEndHeading">
      <p class="eyebrow">${won ? "Puzzle Complete" : "Out of Guesses"}</p>
      <h2 id="hlEndHeading" class="pixel-heading">${won ? "All Linked Up!" : "Better Luck Next Time"}</h2>
      ${isNewHighScore ? `<p class="hl-new-high-score">New high score!</p>` : ""}

      ${!won ? `
        <div class="hl-reveal">
          <p class="hl-reveal-label">Here's how the rest connected:</p>
          ${round.groups.filter((g) => !g.solved).map(renderSolvedBanner).join("")}
        </div>
      ` : ""}

      <div class="hl-end-stats">
        <div><span class="hl-hud-label">Score</span><strong>${round.score}</strong></div>
        <div><span class="hl-hud-label">Groups Solved</span><strong>${round.solvedCount} / 4</strong></div>
        <div><span class="hl-hud-label">Mistakes</span><strong>${round.mistakes}</strong></div>
        ${streak ? `<div><span class="hl-hud-label">Daily Streak</span><strong>${streak.currentStreak}</strong></div>` : ""}
      </div>

      <div class="hl-end-actions">
        <button class="primary-button pixel-button" type="button" data-action="restart-round">Play Again</button>
        <button class="secondary-button pixel-button" type="button" data-action="quit-to-menu">Choose Another Mode</button>
      </div>
    </section>
  `;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttribute(value) {
  return escapeHtml(value);
}
