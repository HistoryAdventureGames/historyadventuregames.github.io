// Fetches the shared pixel-icon sprite (single source of truth: /icon-sprite.html)
// and injects it once so <svg class="pixel-icon"><use href="#pi-name"/></svg> works.
(async () => {
  try {
    const response = await fetch("/icon-sprite.html", { cache: "force-cache" });
    if (!response.ok) return;
    const markup = await response.text();
    document.body.insertAdjacentHTML("afterbegin", markup);
  } catch {
    // Icons are decorative; a failed fetch just means no icon glyphs render.
  }
})();
