// Arcade hub: fetches the games manifest and renders one card per game.
// Adding a future arcade game only requires a new folder plus one new entry
// here — this page never needs to change.
const grid = document.querySelector("#arcadeGrid");

init();

async function init() {
  try {
    const response = await fetch("/arcade/games-manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`games-manifest.json returned ${response.status}`);
    const games = await response.json();
    renderGrid(Array.isArray(games) ? games : []);
  } catch (error) {
    grid.innerHTML = `
      <div class="arcade-error pixel-frame">
        <p>The game list could not load. Ask your teacher to check arcade/games-manifest.json.</p>
        <p class="card-meta">${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

function renderGrid(games) {
  grid.innerHTML = games.map(renderCard).join("");
}

function renderCard(game) {
  const isAvailable = game.status === "available";

  if (!isAvailable) {
    return `
      <div class="game-card game-card-locked pixel-frame" aria-disabled="true">
        <span class="game-card-ribbon pixel-font">Coming Soon</span>
        <span class="game-card-icon" aria-hidden="true">
          <svg class="pixel-icon" viewBox="0 0 24 24"><use href="#${escapeAttribute(game.icon || "pi-gear")}"></use></svg>
        </span>
        <h3>${escapeHtml(game.title)}</h3>
        <p>${escapeHtml(game.description || "")}</p>
      </div>
    `;
  }

  return `
    <a class="game-card game-card-available pixel-frame" href="${escapeAttribute(game.url)}">
      <span class="game-card-ribbon game-card-ribbon-live pixel-font">Play Now</span>
      <span class="game-card-icon" aria-hidden="true">
        <svg class="pixel-icon" viewBox="0 0 24 24"><use href="#${escapeAttribute(game.icon || "pi-gear")}"></use></svg>
      </span>
      <h3>${escapeHtml(game.title)}</h3>
      <p>${escapeHtml(game.description || "")}</p>
      ${game.tag ? `<p class="game-card-tag">${game.tag}</p>` : ""}
    </a>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
