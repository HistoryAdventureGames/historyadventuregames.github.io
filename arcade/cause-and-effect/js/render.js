// HTML-string renderers for each Cause & Effect screen.
import { REGION_META, EFFECT_TYPE_META, getPair } from "./state.js";
import { topicsForRegion, regionsInManifest } from "./data.js";

export function renderMenu({ manifest, regionId, topicId, getHighScore }) {
  const regions = regionsInManifest(manifest);
  const topics = topicsForRegion(manifest, regionId);
  const best = getHighScore(regionId);

  return `
    <section class="ce-menu" aria-labelledby="ceMenuHeading">
      <h2 id="ceMenuHeading" class="visually-hidden">Choose a region and topic</h2>

      <div class="ce-panel pixel-frame">
        <p class="ce-panel-label pixel-font">1. Choose a region</p>
        <div class="ce-region-row" role="group" aria-label="History region">
          ${regions.map((id) => renderRegionButton(id, id === regionId)).join("")}
        </div>
        <p class="ce-region-detail">${escapeHtml((REGION_META[regionId] || {}).blurb || "")}</p>
      </div>

      <div class="ce-panel pixel-frame">
        <p class="ce-panel-label pixel-font">2. Choose a topic</p>
        <div class="ce-topic-grid" role="group" aria-label="Topic">
          ${renderSurpriseCard(topicId === null)}
          ${topics.map((entry) => renderTopicCard(entry, entry.id === topicId)).join("")}
        </div>
      </div>

      <div class="ce-start-row">
        <button class="primary-button pixel-button ce-start-button" type="button" data-action="start-round">
          Start
        </button>
        ${best ? `<p class="ce-start-hint">Best score in ${escapeHtml((REGION_META[regionId] || {}).label || regionId)}: <strong>${best.score}</strong></p>` : ""}
      </div>
    </section>
  `;
}

function renderRegionButton(regionId, isSelected) {
  const meta = REGION_META[regionId] || { label: titleCase(regionId) };
  return `
    <button
      class="ce-region-button pixel-button ${isSelected ? "is-selected" : ""}"
      type="button"
      data-action="select-region"
      data-region-id="${escapeAttribute(regionId)}"
      aria-pressed="${isSelected}"
    >
      ${escapeHtml(meta.label)}
    </button>
  `;
}

function renderSurpriseCard(isSelected) {
  return `
    <button
      class="ce-topic-card pixel-frame ${isSelected ? "is-selected" : ""}"
      type="button"
      data-action="select-topic"
      data-topic-id=""
      aria-pressed="${isSelected}"
    >
      <span class="ce-topic-title">Surprise me</span>
      <span class="ce-topic-sub">A random topic from this region.</span>
    </button>
  `;
}

function renderTopicCard(entry, isSelected) {
  return `
    <button
      class="ce-topic-card pixel-frame ${isSelected ? "is-selected" : ""}"
      type="button"
      data-action="select-topic"
      data-topic-id="${escapeAttribute(entry.id)}"
      aria-pressed="${isSelected}"
    >
      <span class="ce-topic-title">${escapeHtml(entry.title)}</span>
    </button>
  `;
}

export function renderHud(round) {
  return `
    <div class="ce-hud" role="group" aria-label="Round status">
      <div class="ce-hud-stat">
        <span class="ce-hud-label">Score</span>
        <span class="ce-hud-value">${round.score}</span>
      </div>
      <div class="ce-hud-stat">
        <span class="ce-hud-label">Matched</span>
        <span class="ce-hud-value">${round.matched.length} / ${round.pairs.length}</span>
      </div>
      <div class="ce-hud-stat">
        <span class="ce-hud-label">Mistakes</span>
        <span class="ce-hud-value">${round.mistakes}</span>
      </div>
      <div class="ce-hud-actions">
        <button class="pixel-button arcade-icon-button" type="button" data-action="open-settings" aria-label="Settings">
          <svg class="pixel-icon" viewBox="0 0 24 24"><use href="#pi-gear"></use></svg>
        </button>
      </div>
    </div>
  `;
}

export function renderPlaying(round) {
  const remainingCauses = round.causeCards.filter((card) => !round.matched.includes(card.pairId));
  const remainingEffects = round.effectCards.filter((card) => !round.matched.includes(card.pairId));

  return `
    <section class="ce-playing" aria-labelledby="cePlayingHeading">
      <h2 id="cePlayingHeading" class="visually-hidden">${escapeHtml(round.topicTitle)}</h2>
      ${renderHud(round)}

      <p class="ce-instruction">Pick a <strong>cause</strong>, then the <strong>effect</strong> it led to.</p>

      <div class="ce-columns">
        <div class="ce-column" aria-labelledby="ceCausesHeading">
          <h3 id="ceCausesHeading" class="ce-column-head">Causes</h3>
          <div class="ce-card-list">
            ${remainingCauses.map((card) => renderPlayCard(card, "cause", round.selectedCauseId === card.pairId)).join("")}
          </div>
        </div>
        <div class="ce-column" aria-labelledby="ceEffectsHeading">
          <h3 id="ceEffectsHeading" class="ce-column-head">Effects</h3>
          <div class="ce-card-list">
            ${remainingEffects.map((card) => renderPlayCard(card, "effect", round.selectedEffectId === card.pairId)).join("")}
          </div>
        </div>
      </div>

      <div class="ce-feedback" aria-live="polite">${round.feedback ? `<p class="ce-feedback-message ce-feedback-${round.feedback.kind}">${escapeHtml(round.feedback.message)}</p>` : ""}</div>

      ${round.matched.length > 0 ? `
        <div class="ce-matched">
          <h3 class="ce-matched-head">Matched (${round.matched.length})</h3>
          <div class="ce-matched-list">
            ${round.matched.map((pairId) => renderMatchedBanner(getPair(round, pairId))).join("")}
          </div>
        </div>
      ` : ""}

      <div class="ce-actions">
        <button class="secondary-button pixel-button" type="button" data-action="clear-selection" ${round.selectedCauseId || round.selectedEffectId ? "" : "disabled"}>Clear selection</button>
      </div>

      <div id="ceLiveRegion" class="visually-hidden" aria-live="polite"></div>
    </section>
  `;
}

function renderPlayCard(card, side, isSelected) {
  return `
    <button
      type="button"
      class="ce-card ce-card-${side} pixel-frame ${isSelected ? "is-selected" : ""}"
      data-action="select-card"
      data-side="${side}"
      data-pair-id="${escapeAttribute(card.pairId)}"
      aria-pressed="${isSelected}"
    >
      ${escapeHtml(card.text)}
    </button>
  `;
}

function renderMatchedBanner(pair) {
  if (!pair) return "";
  const typeMeta = pair.type ? EFFECT_TYPE_META[pair.type] : null;
  return `
    <div class="ce-matched-banner pixel-frame">
      <p class="ce-matched-pair">
        <span class="ce-matched-cause">${escapeHtml(pair.cause)}</span>
        <span class="ce-matched-arrow" aria-hidden="true">&rarr;</span>
        <span class="ce-matched-effect">${escapeHtml(pair.effect)}</span>
        ${typeMeta ? `<span class="ce-type-tag ce-type-${escapeAttribute(pair.type)}">${escapeHtml(typeMeta.label)}</span>` : ""}
      </p>
      ${pair.explanation ? `<p class="ce-matched-explanation">${escapeHtml(pair.explanation)}</p>` : ""}
    </div>
  `;
}

export function renderSettingsOverlay() {
  return `
    <div class="ce-overlay" data-settings-overlay role="dialog" aria-modal="true" aria-labelledby="ceSettingsHeading">
      <div class="ce-overlay-panel pixel-frame">
        <h2 id="ceSettingsHeading" class="pixel-heading">Settings</h2>
        <div class="ce-overlay-actions">
          <button class="primary-button pixel-button" type="button" data-action="close-settings">Resume</button>
          <button class="secondary-button pixel-button" type="button" data-action="restart-round">Restart Round</button>
          <button class="secondary-button pixel-button" type="button" data-action="quit-to-menu">Quit to Menu</button>
        </div>
      </div>
    </div>
  `;
}

export function renderEndScreen({ round, isNewHighScore }) {
  return `
    <section class="ce-end pixel-frame" aria-labelledby="ceEndHeading">
      <p class="eyebrow">Round Complete</p>
      <h2 id="ceEndHeading" class="pixel-heading">All Linked Up!</h2>
      ${isNewHighScore ? `<p class="ce-new-high-score">New best score!</p>` : ""}

      <div class="ce-end-stats">
        <div><span class="ce-hud-label">Score</span><strong>${round.score}</strong></div>
        <div><span class="ce-hud-label">Matched</span><strong>${round.matched.length} / ${round.pairs.length}</strong></div>
        <div><span class="ce-hud-label">Mistakes</span><strong>${round.mistakes}</strong></div>
      </div>

      <div class="ce-reveal">
        <p class="ce-reveal-label">Every cause and its effect:</p>
        <div class="ce-matched-list">
          ${round.pairs.map(renderMatchedBanner).join("")}
        </div>
      </div>

      <div class="ce-end-actions">
        <button class="primary-button pixel-button" type="button" data-action="restart-round">Play Again</button>
        <button class="secondary-button pixel-button" type="button" data-action="quit-to-menu">Choose Another Topic</button>
      </div>
    </section>
  `;
}

function titleCase(value) {
  return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
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
