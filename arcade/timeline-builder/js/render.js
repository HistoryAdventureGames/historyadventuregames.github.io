// HTML-string renderers for each Timeline Builder screen. Kept in one place
// so main.js only has to decide *when* to render, not *how*.
import { formatYear } from "./data.js";
import { MODES } from "./state.js";

export function renderMenu({ manifest, modeId, categoryId, getHighScore }) {
  const mode = MODES[modeId];
  const isEndless = modeId === "endless";

  return `
    <section class="tb-menu" aria-labelledby="tbMenuHeading">
      <h2 id="tbMenuHeading" class="visually-hidden">Set up your round</h2>

      <div class="tb-panel pixel-frame">
        <p class="tb-panel-label pixel-font">1. Choose a mode</p>
        <div class="tb-mode-row" role="group" aria-label="Difficulty mode">
          ${Object.values(MODES).map((m) => renderModeButton(m, m.id === modeId)).join("")}
        </div>
        <p class="tb-mode-detail">${renderModeDetail(mode)}</p>
      </div>

      <div class="tb-panel pixel-frame">
        <p class="tb-panel-label pixel-font">2. Choose an era</p>
        ${isEndless ? renderEndlessNotice(getHighScore) : renderCategoryGrid(manifest, categoryId, modeId, getHighScore)}
      </div>

      <div class="tb-start-row">
        <button
          class="primary-button pixel-button tb-start-button"
          type="button"
          data-action="start-round"
          ${isEndless || categoryId ? "" : "disabled"}
        >
          Start Round
        </button>
        ${!isEndless && !categoryId ? `<p class="tb-start-hint">Pick an era above to begin.</p>` : ""}
      </div>
    </section>
  `;
}

function renderModeButton(mode, isSelected) {
  return `
    <button
      class="tb-mode-button pixel-button ${isSelected ? "is-selected" : ""}"
      type="button"
      data-action="select-mode"
      data-mode-id="${mode.id}"
      aria-pressed="${isSelected}"
    >
      ${mode.label}
    </button>
  `;
}

function renderModeDetail(mode) {
  if (mode.id === "endless") return "Events keep coming from every era until the clock runs out.";
  return `${mode.eventCount} events &middot; ${mode.timeBudget}s on the clock`;
}

function renderEndlessNotice(getHighScore) {
  const best = getHighScore("all", "endless");
  return `
    <p class="tb-endless-notice">Endless mode mixes events from every era in the arcade. No category to pick — just start.</p>
    ${best ? `<p class="tb-best">Best score: <strong>${best.score}</strong></p>` : ""}
  `;
}

function renderCategoryGrid(manifest, categoryId, modeId, getHighScore) {
  return `
    <div class="tb-category-grid">
      ${manifest.map((entry) => {
        const best = getHighScore(entry.id, modeId);
        const isSelected = entry.id === categoryId;
        return `
          <button
            class="tb-category-card pixel-frame--sm pixel-frame ${isSelected ? "is-selected" : ""}"
            type="button"
            data-action="select-category"
            data-category-id="${entry.id}"
            aria-pressed="${isSelected}"
          >
            <span>${escapeHtml(entry.label)}</span>
            ${best ? `<span class="tb-best-badge">Best: ${best.score}</span>` : ""}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

export function renderHud(round, mode) {
  const accuracy = round.attemptCount === 0 ? 100 : Math.round((round.correctCount / round.attemptCount) * 100);
  const multiplier = (1 + Math.min(round.combo, 10) * 0.1).toFixed(1);

  return `
    <div class="tb-hud" role="group" aria-label="Round status">
      <div class="tb-hud-stat">
        <span class="tb-hud-label">Time</span>
        <span class="tb-hud-value" id="tbTimer">${Math.max(0, Math.ceil(round.timeRemaining))}s</span>
      </div>
      <div class="tb-hud-stat">
        <span class="tb-hud-label">Score</span>
        <span class="tb-hud-value" id="tbScore">${round.score}</span>
      </div>
      <div class="tb-hud-stat">
        <span class="tb-hud-label">Combo</span>
        <span class="tb-hud-value" id="tbCombo">&times;${multiplier}</span>
      </div>
      <div class="tb-hud-stat">
        <span class="tb-hud-label">Accuracy</span>
        <span class="tb-hud-value" id="tbAccuracy">${accuracy}%</span>
      </div>
      <div class="tb-hud-actions">
        <button class="pixel-button tb-icon-button" type="button" data-action="pause" aria-label="Pause">
          <svg class="pixel-icon" viewBox="0 0 24 24"><use href="#pi-pause"></use></svg>
        </button>
      </div>
    </div>
  `;
}

export function renderPlaying(round, mode) {
  return `
    <section class="tb-playing" aria-labelledby="tbPlayingHeading">
      <h2 id="tbPlayingHeading" class="visually-hidden">${escapeHtml(mode.label)} round in progress</h2>
      ${renderHud(round, mode)}
      <div class="tb-timeline-wrap">
        <p class="tb-section-label">Timeline (earliest &rarr; latest)</p>
        <div class="tb-timeline" data-timeline>
          ${renderTimelineContents(round)}
        </div>
      </div>
      <div class="tb-tray-wrap">
        <p class="tb-section-label">${round.tray.length > 0 ? "Drag an event onto the timeline" : "All events placed!"}</p>
        <div class="tb-tray" data-tray>
          ${round.tray.map((event) => renderTrayCard(event, round.pickedUpCardId === event.id)).join("")}
        </div>
      </div>
      <div id="tbLiveRegion" class="visually-hidden" aria-live="polite"></div>
    </section>
  `;
}

function renderTimelineContents(round) {
  const pickedUp = Boolean(round.pickedUpCardId);
  const parts = [renderGap(0, round, pickedUp)];
  round.placed.forEach((event, index) => {
    parts.push(renderPlacedCard(event));
    parts.push(renderGap(index + 1, round, pickedUp));
  });
  return parts.join("");
}

function renderGap(index, round, pickedUp) {
  const left = round.placed[index - 1];
  const right = round.placed[index];
  const label = left && right
    ? `Insert between ${left.title} and ${right.title}`
    : left
      ? `Insert after ${left.title}`
      : right
        ? `Insert before ${right.title}`
        : "Insert here";

  return `
    <button
      type="button"
      class="timeline-gap ${pickedUp ? "is-active-target" : ""}"
      data-gap-index="${index}"
      data-action="place-gap"
      tabindex="${pickedUp ? 0 : -1}"
      aria-label="${escapeAttribute(label)}"
    ></button>
  `;
}

function renderPlacedCard(event) {
  return `
    <div class="timeline-card is-correct" data-card-id="${escapeAttribute(event.id)}">
      <span class="timeline-card-year">${formatYear(event.year)}</span>
      <span class="timeline-card-title">${escapeHtml(event.title)}</span>
    </div>
  `;
}

function renderTrayCard(event, isPickedUp) {
  return `
    <button
      type="button"
      class="tray-card ${isPickedUp ? "is-picked-up" : ""}"
      data-card-id="${escapeAttribute(event.id)}"
      data-action="pickup-card"
      aria-pressed="${isPickedUp}"
    >
      <span class="tray-card-grip" aria-hidden="true"></span>
      <span class="tray-card-title">${escapeHtml(event.title)}</span>
      ${event.categoryLabel ? `<span class="tray-card-tag">${escapeHtml(event.categoryLabel)}</span>` : ""}
    </button>
  `;
}

export function renderPauseOverlay() {
  return `
    <div class="tb-overlay" role="dialog" aria-modal="true" aria-labelledby="tbPauseHeading">
      <div class="tb-overlay-panel pixel-frame">
        <h2 id="tbPauseHeading" class="pixel-heading">Paused</h2>
        <div class="tb-overlay-actions">
          <button class="primary-button pixel-button" type="button" data-action="resume">Resume</button>
          <button class="secondary-button pixel-button" type="button" data-action="restart-round">Restart Round</button>
          <button class="secondary-button pixel-button" type="button" data-action="quit-to-menu">Quit to Menu</button>
        </div>
      </div>
    </div>
  `;
}

export function renderEndScreen({ round, mode, highScoreEntry, isNewHighScore, accuracy }) {
  const won = round.status === "won";

  return `
    <section class="tb-end pixel-frame" aria-labelledby="tbEndHeading">
      <p class="eyebrow">${won ? "Round Complete" : "Time's Up"}</p>
      <h2 id="tbEndHeading" class="pixel-heading">${won ? "Timeline Complete!" : "Out of Time"}</h2>
      ${isNewHighScore ? `<p class="tb-new-high-score">New high score!</p>` : ""}
      <div class="tb-end-stats">
        <div><span class="tb-hud-label">Score</span><strong>${round.score}</strong></div>
        <div><span class="tb-hud-label">Accuracy</span><strong>${accuracy}%</strong></div>
        <div><span class="tb-hud-label">Best Combo</span><strong>&times;${(1 + Math.min(round.bestCombo, 10) * 0.1).toFixed(1)}</strong></div>
        <div><span class="tb-hud-label">High Score</span><strong>${highScoreEntry ? highScoreEntry.score : round.score}</strong></div>
      </div>
      <div class="tb-end-actions">
        <button class="primary-button pixel-button" type="button" data-action="restart-round">Play Again</button>
        <button class="secondary-button pixel-button" type="button" data-action="quit-to-menu">Choose Another Era</button>
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
