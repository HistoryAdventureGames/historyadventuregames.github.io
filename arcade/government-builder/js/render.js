// HTML-string renderers for each Government Builder screen.
import { MODES, POLICIES, UPGRADES } from "./state.js";
import { upgradeCost } from "./engine.js";

export function renderMenu({ modeId, teacherMode, getHighScore }) {
  const best = getHighScore(modeId);
  return `
    <section class="gb-menu" aria-labelledby="gbMenuHeading">
      <h2 id="gbMenuHeading" class="visually-hidden">Choose a mode</h2>

      <div class="gb-panel pixel-frame">
        <p class="gb-panel-label pixel-font">1. Choose a mode</p>
        <div class="gb-mode-row" role="group" aria-label="Game mode">
          ${Object.values(MODES).map((mode) => renderModeButton(mode, mode.id === modeId)).join("")}
        </div>
        <p class="gb-mode-detail">${renderModeDetail(MODES[modeId])}</p>
        ${best ? `<p class="gb-streak">Best score: <strong>${best.score}</strong></p>` : ""}
      </div>

      <div class="gb-panel pixel-frame gb-teacher-panel">
        <label class="gb-teacher-toggle">
          <input type="checkbox" id="teacherModeToggle" ${teacherMode ? "checked" : ""}>
          <span>
            <strong>Teacher Mode</strong>
            <span class="gb-teacher-detail">Skips saving a score &mdash; built for playing together as a class.</span>
          </span>
        </label>
      </div>

      <div class="gb-start-row">
        <button class="primary-button pixel-button gb-start-button" type="button" data-action="start-round">Take Office</button>
      </div>
    </section>
  `;
}

function renderModeButton(mode, isSelected) {
  return `
    <button
      class="gb-mode-button pixel-button ${isSelected ? "is-selected" : ""}"
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
  const term = mode.turnBudget == null ? "Govern until your nation collapses." : `A ${mode.turnBudget}-turn term.`;
  return `${term} Starting treasury: ${mode.startingTreasury}.`;
}

export function renderHud(round) {
  const turnLabel = round.turnBudget == null ? `${round.turn}` : `${round.turn} / ${round.turnBudget}`;
  return `
    <div class="gb-hud" role="group" aria-label="Nation status">
      <div class="gb-hud-stat">
        <span class="gb-hud-label">Turn</span>
        <span class="gb-hud-value">${turnLabel}</span>
      </div>
      <div class="gb-hud-stat">
        <span class="gb-hud-label">Treasury</span>
        <span class="gb-hud-value gb-hud-treasury">${Math.round(round.treasury)}</span>
      </div>
      <div class="gb-hud-stat">
        <span class="gb-hud-label">Approval</span>
        <span class="gb-hud-value gb-hud-approval">${Math.round(round.approval)}</span>
      </div>
      <div class="gb-hud-stat">
        <span class="gb-hud-label">Stability</span>
        <span class="gb-hud-value gb-hud-stability">${Math.round(round.stability)}</span>
      </div>
      ${round.goldenAgeActive ? `
        <div class="gb-hud-stat gb-golden-age-badge pixel-font">
          <span class="gb-hud-label">Golden Age</span>
          <span class="gb-hud-value">&times;1.5 Treasury</span>
        </div>
      ` : ""}
      <div class="gb-hud-actions">
        <button class="pixel-button arcade-icon-button" type="button" data-action="open-settings" aria-label="Settings">
          <svg class="pixel-icon" viewBox="0 0 24 24"><use href="#pi-gear"></use></svg>
        </button>
      </div>
    </div>
  `;
}

export function renderPolicyPanel(round) {
  return `
    <div class="gb-panel gb-policy-panel pixel-frame">
      <p class="gb-panel-label pixel-font">Policies</p>
      <div class="gb-policy-list">
        ${POLICIES.map((policy) => renderPolicyRow(policy, round.policyStances[policy.id])).join("")}
      </div>
    </div>
  `;
}

function renderPolicyRow(policy, currentStanceId) {
  return `
    <div class="gb-policy-row">
      <span class="gb-policy-label">${escapeHtml(policy.label)}</span>
      <div class="gb-policy-stances" role="group" aria-label="${escapeAttribute(policy.label)}">
        ${policy.stances.map((stance) => `
          <button
            class="gb-stance-button pixel-button ${stance.id === currentStanceId ? "is-selected" : ""}"
            type="button"
            data-action="select-policy-stance"
            data-policy-id="${policy.id}"
            data-stance-id="${stance.id}"
            aria-pressed="${stance.id === currentStanceId}"
          >
            ${escapeHtml(stance.label)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderShopPanel(round) {
  return `
    <div class="gb-panel gb-shop-panel pixel-frame">
      <p class="gb-panel-label pixel-font">Power-Up Shop</p>
      <div class="gb-shop-grid">
        ${UPGRADES.map((upgrade) => renderUpgradeCard(upgrade, round)).join("")}
      </div>
    </div>
  `;
}

function renderUpgradeCard(upgrade, round) {
  const level = round.upgradeLevels[upgrade.id] || 0;
  const cost = upgradeCost(upgrade, level);
  const canAfford = round.treasury >= cost;

  return `
    <div class="gb-upgrade-card pixel-frame--sm pixel-frame">
      <span class="gb-upgrade-icon" aria-hidden="true">
        <svg class="pixel-icon" viewBox="0 0 24 24"><use href="#${upgrade.icon}"></use></svg>
      </span>
      <h3>${escapeHtml(upgrade.label)}</h3>
      <p class="gb-upgrade-description">${escapeHtml(upgrade.description)}</p>
      ${level > 0 ? `<p class="gb-upgrade-level">Level ${level}</p>` : ""}
      <button
        class="secondary-button pixel-button gb-buy-button"
        type="button"
        data-action="buy-upgrade"
        data-upgrade-id="${upgrade.id}"
        ${canAfford ? "" : "disabled"}
      >
        Buy &mdash; ${cost}
      </button>
    </div>
  `;
}

export function renderPlaying(round) {
  return `
    <section class="gb-playing" aria-labelledby="gbPlayingHeading">
      <h2 id="gbPlayingHeading" class="visually-hidden">Turn ${round.turn}</h2>
      ${renderHud(round)}

      <div class="gb-feedback" aria-live="polite">${round.lastTurnSummary ? `<p class="gb-feedback-message gb-feedback-${round.lastTurnSummary.kind}">${escapeHtml(round.lastTurnSummary.message)}</p>` : ""}</div>

      <div class="gb-panels">
        ${renderPolicyPanel(round)}
        ${renderShopPanel(round)}
      </div>

      <div class="gb-actions">
        <button class="primary-button pixel-button gb-end-turn-button" type="button" data-action="end-turn">End Turn</button>
      </div>

      <div id="gbLiveRegion" class="visually-hidden" aria-live="polite"></div>
    </section>
  `;
}

export function renderCrisisOverlay(crisis) {
  return `
    <div class="gb-overlay gb-crisis-overlay" data-crisis-overlay role="dialog" aria-modal="true" aria-labelledby="gbCrisisHeading">
      <div class="gb-overlay-panel gb-crisis-panel pixel-frame">
        <span class="gb-crisis-icon" aria-hidden="true">
          <svg class="pixel-icon" viewBox="0 0 24 24"><use href="#pi-alert"></use></svg>
        </span>
        <p class="eyebrow">International Crisis</p>
        <h2 id="gbCrisisHeading" class="pixel-heading">${escapeHtml(crisis.title)}</h2>
        <p class="gb-crisis-description">${escapeHtml(crisis.description)}</p>
        <div class="gb-crisis-options">
          ${crisis.options.map((option, index) => renderCrisisOption(option, index)).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderCrisisOption(option, index) {
  return `
    <button class="gb-crisis-option pixel-frame--sm pixel-frame" type="button" data-action="resolve-crisis" data-option-index="${index}">
      <span class="gb-crisis-option-label">${escapeHtml(option.label)}</span>
      <span class="gb-crisis-option-effects">${renderEffectPreview(option.effects)}</span>
    </button>
  `;
}

function renderEffectPreview(effects) {
  const labels = { treasury: "Treasury", approval: "Approval", stability: "Stability" };
  return Object.entries(effects || {})
    .map(([resource, value]) => {
      if (!value) return "";
      const sign = value > 0 ? "+" : "";
      return `<span class="gb-effect-tag ${value > 0 ? "is-positive" : "is-negative"}">${labels[resource] || resource} ${sign}${value}</span>`;
    })
    .join("");
}

export function renderSettingsOverlay() {
  return `
    <div class="gb-overlay" data-settings-overlay role="dialog" aria-modal="true" aria-labelledby="gbSettingsHeading">
      <div class="gb-overlay-panel pixel-frame">
        <h2 id="gbSettingsHeading" class="pixel-heading">Settings</h2>
        <div class="gb-overlay-actions">
          <button class="primary-button pixel-button" type="button" data-action="close-settings">Resume</button>
          <button class="secondary-button pixel-button" type="button" data-action="restart-round">Restart Term</button>
          <button class="secondary-button pixel-button" type="button" data-action="quit-to-menu">Quit to Menu</button>
        </div>
      </div>
    </div>
  `;
}

export function renderEndScreen({ round, ending, isNewHighScore }) {
  return `
    <section class="gb-end gb-end-${ending.tone} pixel-frame" aria-labelledby="gbEndHeading">
      <p class="eyebrow">${escapeHtml(ending.eyebrow)}</p>
      <h2 id="gbEndHeading" class="pixel-heading">${escapeHtml(ending.heading)}</h2>
      <p class="gb-end-description">${escapeHtml(ending.description)}</p>
      ${isNewHighScore ? `<p class="gb-new-high-score">New high score!</p>` : ""}

      <div class="gb-end-stats">
        <div><span class="gb-hud-label">Score</span><strong>${round.score}</strong></div>
        <div><span class="gb-hud-label">Turns</span><strong>${round.turn}</strong></div>
        <div><span class="gb-hud-label">Final Treasury</span><strong>${Math.round(round.treasury)}</strong></div>
        <div><span class="gb-hud-label">Final Approval</span><strong>${Math.round(round.approval)}</strong></div>
        <div><span class="gb-hud-label">Final Stability</span><strong>${Math.round(round.stability)}</strong></div>
        <div><span class="gb-hud-label">Crises Resolved</span><strong>${round.crisesResolved}</strong></div>
        <div><span class="gb-hud-label">Best Golden Age Streak</span><strong>${round.bestGoldenAgeStreak}</strong></div>
      </div>

      <div class="gb-end-actions">
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
