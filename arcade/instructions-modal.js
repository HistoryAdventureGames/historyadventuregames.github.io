// Reusable "How to Play" instructions modal, shared by every arcade game.
//
// Usage from a game page (after loading arcade.css and the icon sprite):
//   ArcadeInstructions.init({
//     gameId: "timeline-builder",       // namespaces the "seen it" flag
//     title: "How to Play Timeline Builder",
//     sections: [{ heading: "Goal", body: "..." }, ...],
//   });
// Any element with [data-instructions-open] anywhere on the page opens it.
// It also opens itself once, automatically, the first time a visitor loads
// that particular game (tracked in localStorage), then stays button-only.
(() => {
  function renderModal(title, sections) {
    return `
      <div class="instructions-overlay" id="instructionsOverlay" hidden>
        <div
          class="instructions-panel pixel-frame"
          role="dialog"
          aria-modal="true"
          aria-labelledby="instructionsTitle"
          tabindex="-1"
        >
          <div class="instructions-header">
            <h2 id="instructionsTitle" class="pixel-heading">${escapeHtml(title)}</h2>
            <button class="arcade-icon-button" type="button" data-instructions-close aria-label="Close instructions">
              <svg class="pixel-icon" viewBox="0 0 24 24" width="18" height="18"><use href="#pi-close"></use></svg>
            </button>
          </div>
          <div class="instructions-body">
            ${sections.map(renderSection).join("")}
          </div>
          <div class="instructions-footer">
            <button class="primary-button pixel-button" type="button" data-instructions-close>Got it, let's play</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSection({ heading, body }) {
    return `
      <section>
        <h3>${escapeHtml(heading)}</h3>
        <p>${body}</p>
      </section>
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

  window.ArcadeInstructions = {
    init({ gameId, title, sections, autoShowOnFirstVisit = true }) {
      if (document.getElementById("instructionsOverlay")) return;

      document.body.insertAdjacentHTML("beforeend", renderModal(title, sections));

      const overlay = document.getElementById("instructionsOverlay");
      const panel = overlay.querySelector(".instructions-panel");
      const storageKey = `arcade-instructions-seen:${gameId}`;
      let lastFocused = null;

      function open() {
        lastFocused = document.activeElement;
        overlay.hidden = false;
        document.body.style.overflow = "hidden";
        panel.focus();
        try {
          localStorage.setItem(storageKey, "true");
        } catch {
          // Private browsing or storage disabled -- the modal still works, it just reopens next visit.
        }
      }

      function close() {
        if (overlay.hidden) return;
        overlay.hidden = true;
        document.body.style.overflow = "";
        lastFocused?.focus();
      }

      document.addEventListener("click", (event) => {
        if (event.target.closest("[data-instructions-open]")) {
          open();
          return;
        }

        if (event.target === overlay || event.target.closest("[data-instructions-close]")) {
          close();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") close();
      });

      if (autoShowOnFirstVisit) {
        let alreadySeen = false;
        try {
          alreadySeen = localStorage.getItem(storageKey) === "true";
        } catch {
          // Treat storage failures as "not seen" -- showing once extra is harmless.
        }
        if (!alreadySeen) open();
      }
    },
  };
})();
