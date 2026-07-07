// HTML-string renderers for each Historical Map Challenge screen. Pure
// functions of game state (same pattern as the other arcade games): main.js
// swaps the returned markup into #gameRoot and drives everything through
// [data-action] click delegation.
import { SCORING, maxRoundScore } from "./state.js";
import { categoryLabel, categoryBlurb, eraLabel, distinctCategories, challengesInCategory } from "./data.js";
import { starRating } from "./engine.js";

// ---------- Menu ----------

export function renderMenu({ manifest, categoryId, challengeId, getHighScore }) {
  if (manifest.length === 0) return renderEmptyState();

  const categories = distinctCategories(manifest);
  const activeCategory = categoryId && categories.includes(categoryId) ? categoryId : null;
  const challenges = activeCategory ? challengesInCategory(manifest, activeCategory) : [];

  return `
    <section class="mc-menu" aria-labelledby="mcMenuHeading">
      <h2 id="mcMenuHeading" class="visually-hidden">Choose a mode and a map</h2>

      <div class="mc-panel pixel-frame">
        <p class="mc-panel-label pixel-font">1. Choose a mode</p>
        <div class="mc-mode-row" role="group" aria-label="Mode">
          ${categories.map((id) => renderModeButton(id, id === activeCategory)).join("")}
        </div>
        ${activeCategory ? `<p class="mc-mode-detail">${escapeHtml(categoryBlurb(activeCategory))}</p>` : `<p class="mc-mode-detail">Pick a type of place to hunt for on the map.</p>`}
      </div>

      ${activeCategory ? renderChallengePicker(challenges, challengeId, getHighScore) : ""}

      <div class="mc-start-row">
        <button
          class="primary-button pixel-button mc-start-button"
          type="button"
          data-action="start-round"
          ${activeCategory ? "" : "disabled"}
        >
          ${activeCategory ? "Start" : "Choose a mode first"}
        </button>
        ${activeCategory ? `<p class="mc-start-hint">${challengeId ? "" : "No map picked — we'll surprise you with one."}</p>` : ""}
      </div>
    </section>
  `;
}

function renderModeButton(categoryId, isSelected) {
  return `
    <button
      class="mc-mode-button pixel-button ${isSelected ? "is-selected" : ""}"
      type="button"
      data-action="select-category"
      data-category-id="${escapeAttribute(categoryId)}"
      aria-pressed="${isSelected}"
    >
      ${escapeHtml(categoryLabel(categoryId))}
    </button>
  `;
}

function renderChallengePicker(challenges, challengeId, getHighScore) {
  return `
    <div class="mc-panel pixel-frame">
      <p class="mc-panel-label pixel-font">2. Choose a map</p>
      <div class="mc-challenge-grid" role="group" aria-label="Map challenge">
        ${renderSurpriseCard(challengeId === null)}
        ${challenges.map((entry) => renderChallengeCard(entry, entry.id === challengeId, getHighScore(entry.id))).join("")}
      </div>
    </div>
  `;
}

function renderSurpriseCard(isSelected) {
  return `
    <button
      class="mc-challenge-card mc-surprise-card pixel-frame ${isSelected ? "is-selected" : ""}"
      type="button"
      data-action="select-challenge"
      data-challenge-id=""
      aria-pressed="${isSelected}"
    >
      <span class="mc-challenge-title">Surprise me</span>
      <span class="mc-challenge-meta">A random map from this mode</span>
    </button>
  `;
}

function renderChallengeCard(entry, isSelected, best) {
  return `
    <button
      class="mc-challenge-card pixel-frame ${isSelected ? "is-selected" : ""}"
      type="button"
      data-action="select-challenge"
      data-challenge-id="${escapeAttribute(entry.id)}"
      aria-pressed="${isSelected}"
    >
      <span class="mc-challenge-tag">${escapeHtml(eraLabel(entry.era))}</span>
      <span class="mc-challenge-title">${escapeHtml(entry.title)}</span>
      ${best ? `<span class="mc-challenge-meta">Best: ${best.score}</span>` : `<span class="mc-challenge-meta">Not played yet</span>`}
    </button>
  `;
}

function renderEmptyState() {
  return `
    <section class="mc-empty pixel-frame" aria-labelledby="mcEmptyHeading">
      <h2 id="mcEmptyHeading" class="pixel-heading">No map challenges yet</h2>
      <p>Once a challenge is added to <code>data/manifest.json</code> (and its map image dropped into <code>maps/</code>), it will appear here to play.</p>
      <p class="mc-empty-hint">Building content? Use the <a href="author/">click-to-place authoring tool</a> to place terms on a map and export ready-to-paste JSON.</p>
    </section>
  `;
}

// ---------- Playing ----------

export function renderPlaying(round) {
  return `
    <section class="mc-play" aria-labelledby="mcPlayHeading">
      <h2 id="mcPlayHeading" class="visually-hidden">${escapeHtml(round.challengeTitle)}</h2>
      ${renderHud(round)}
      <div class="mc-play-body">
        ${renderMapSurface(round)}
        ${round.phase === "revealed" ? renderResultPanel(round) : renderTermPanel(round)}
      </div>
      <div id="mcLiveRegion" class="visually-hidden" aria-live="polite"></div>
    </section>
  `;
}

function renderHud(round) {
  return `
    <div class="mc-hud" role="group" aria-label="Round status">
      <div class="mc-hud-stat">
        <span class="mc-hud-label">Score</span>
        <span class="mc-hud-value" id="mcScore">${round.totalScore}</span>
      </div>
      <div class="mc-hud-stat">
        <span class="mc-hud-label">Term</span>
        <span class="mc-hud-value">${Math.min(round.index + 1, round.items.length)} <span class="mc-hud-of">/ ${round.items.length}</span></span>
      </div>
      <div class="mc-hud-progress" aria-hidden="true">
        ${round.items
          .map((_, i) => {
            const done = i < round.results.length;
            const current = i === round.index && round.phase === "placing";
            return `<span class="mc-pip ${done ? "is-done" : ""} ${current ? "is-current" : ""}"></span>`;
          })
          .join("")}
      </div>
      <div class="mc-hud-actions">
        <button class="pixel-button arcade-icon-button" type="button" data-action="open-settings" aria-label="Settings">
          <svg class="pixel-icon" viewBox="0 0 24 24"><use href="#pi-gear"></use></svg>
        </button>
      </div>
    </div>
  `;
}

function renderMapSurface(round) {
  const { map, guess, phase } = round;
  const target = phase === "revealed" ? round.items[round.index] : null;

  return `
    <div class="mc-map-wrap">
      <div class="mc-map" data-map-surface>
        <img class="mc-map-img" src="${escapeAttribute(map.src)}" alt="${escapeAttribute(map.alt)}" draggable="false">
        ${phase === "revealed" && guess && target ? renderRevealLine(guess, target) : ""}
        ${guess ? renderGuessPin(guess, phase === "revealed") : ""}
        ${target ? renderTargetPin(target) : ""}
        ${map.attribution ? `<span class="mc-map-credit">${escapeHtml(map.attribution)}</span>` : ""}
      </div>
    </div>
  `;
}

function renderRevealLine(guess, target) {
  return `
    <svg class="mc-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line x1="${guess.x * 100}" y1="${guess.y * 100}" x2="${target.x * 100}" y2="${target.y * 100}"></line>
    </svg>
  `;
}

function renderGuessPin(guess, locked) {
  return `<span class="mc-pin mc-pin-guess ${locked ? "is-locked" : ""}" data-guess-pin style="left:${guess.x * 100}%;top:${guess.y * 100}%"><span class="visually-hidden">Your guess</span></span>`;
}

function renderTargetPin(target) {
  return `
    <span class="mc-pin mc-pin-target" style="left:${target.x * 100}%;top:${target.y * 100}%">
      <span class="mc-pin-flag">${escapeHtml(target.label)}</span>
    </span>
  `;
}

function renderTermPanel(round) {
  const item = round.items[round.index];
  const hasGuess = Boolean(round.guess);

  return `
    <div class="mc-side">
      <div class="mc-term-card pixel-frame">
        <p class="mc-term-kicker pixel-font">Place this</p>
        <button class="mc-term-chip" type="button" data-term-chip aria-describedby="mcTermHelp">
          <span class="mc-term-chip-dot" aria-hidden="true"></span>
          <span class="mc-term-chip-label">${escapeHtml(item.label)}</span>
        </button>
        <p id="mcTermHelp" class="mc-term-help">Drag it onto the map, or tap the spot you think is right. Nudge with arrow keys.</p>
        ${item.hint ? renderHint(round) : ""}
      </div>
      <div class="mc-actions">
        <button class="primary-button pixel-button" type="button" data-action="lock-guess" ${hasGuess ? "" : "disabled"}>
          ${hasGuess ? "Lock in guess" : "Place a marker first"}
        </button>
      </div>
    </div>
  `;
}

function renderHint(round) {
  const item = round.items[round.index];
  if (round.hintShown) {
    return `<p class="mc-term-hint"><span class="mc-term-hint-label">Hint:</span> ${escapeHtml(item.hint)}</p>`;
  }
  return `<button class="text-button mc-hint-button" type="button" data-action="show-hint">Need a hint?</button>`;
}

function renderResultPanel(round) {
  const item = round.items[round.index];
  const result = round.results[round.results.length - 1];
  const isLast = round.index >= round.items.length - 1;
  const tier = proximityTier(result.distanceFraction);

  return `
    <div class="mc-side">
      <div class="mc-result-card pixel-frame mc-prox-${tier}">
        <p class="mc-result-proximity">${escapeHtml(result.label)}</p>
        <p class="mc-result-points">+${result.points}</p>
        <p class="mc-result-name">${escapeHtml(item.label)}</p>
        ${item.hint ? `<p class="mc-result-hint">${escapeHtml(item.hint)}</p>` : ""}
      </div>
      <div class="mc-actions">
        <button class="primary-button pixel-button" type="button" data-action="next-item">
          ${isLast ? "See your results" : "Next term"}
        </button>
      </div>
    </div>
  `;
}

// ---------- Settings overlay ----------

export function renderSettingsOverlay() {
  return `
    <div class="mc-overlay" data-settings-overlay role="dialog" aria-modal="true" aria-labelledby="mcSettingsHeading">
      <div class="mc-overlay-panel pixel-frame">
        <h2 id="mcSettingsHeading" class="pixel-heading">Paused</h2>
        <div class="mc-overlay-actions">
          <button class="primary-button pixel-button" type="button" data-action="close-settings">Resume</button>
          <button class="secondary-button pixel-button" type="button" data-action="restart-round">Restart</button>
          <button class="secondary-button pixel-button" type="button" data-action="quit-to-menu">Quit to Menu</button>
        </div>
      </div>
    </div>
  `;
}

// ---------- End screen ----------

export function renderEndScreen({ round, isNewHighScore, best }) {
  const stars = starRating(round.totalScore, round.items.length);
  const max = maxRoundScore(round);

  return `
    <section class="mc-end pixel-frame" aria-labelledby="mcEndHeading">
      <p class="eyebrow">Round Complete</p>
      <h2 id="mcEndHeading" class="pixel-heading">${escapeHtml(round.challengeTitle)}</h2>
      <p class="mc-stars" aria-label="${stars} of 3 stars">${renderStars(stars)}</p>
      ${isNewHighScore ? `<p class="mc-new-high-score">New best score!</p>` : ""}

      <div class="mc-end-score">
        <span class="mc-end-score-value">${round.totalScore}</span>
        <span class="mc-end-score-max">out of ${max}</span>
      </div>
      ${best ? `<p class="mc-end-best">Your best on this map: <strong>${best.score}</strong></p>` : ""}

      <ol class="mc-breakdown">
        ${round.results
          .map(
            (result) => `
          <li class="mc-breakdown-row">
            <span class="mc-breakdown-name">${escapeHtml(result.item.label)}</span>
            <span class="mc-breakdown-prox mc-prox-${proximityTier(result.distanceFraction)}">${escapeHtml(result.label)}</span>
            <span class="mc-breakdown-points">+${result.points}</span>
          </li>
        `,
          )
          .join("")}
      </ol>

      <div class="mc-end-actions">
        <button class="primary-button pixel-button" type="button" data-action="restart-round">Play Again</button>
        <button class="secondary-button pixel-button" type="button" data-action="quit-to-menu">Choose Another Map</button>
      </div>
    </section>
  `;
}

function renderStars(stars) {
  return Array.from({ length: 3 }, (_, i) => (i < stars ? "★" : "☆")).join("");
}

// A coarse 0–3 tier from the miss fraction, used to color proximity labels.
function proximityTier(distanceFraction) {
  if (distanceFraction <= SCORING.perfectFraction) return 3;
  if (distanceFraction <= 0.09) return 3;
  if (distanceFraction <= 0.18) return 2;
  if (distanceFraction <= 0.3) return 1;
  return 0;
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
