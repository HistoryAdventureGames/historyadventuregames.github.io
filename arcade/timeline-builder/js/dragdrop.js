// Pointer-based drag and drop for the event tray -> timeline. Pointer Events
// unify mouse, touch, and pen in one code path (native HTML5 drag-and-drop
// behaves poorly on touch, which the spec requires supporting).
//
// A drag only "starts" once the pointer has moved past DRAG_THRESHOLD_PX.
// Below that, we never preventDefault or build a ghost, so a plain tap/click
// passes through untouched and is handled as a keyboard-equivalent pickup by
// main.js's click delegation — one code path for both interactions instead
// of two competing ones.
const DRAG_THRESHOLD_PX = 8;

export class DragController {
  constructor({ trayEl, timelineEl, onDrop, onDragStart, onDragEnd }) {
    this.trayEl = trayEl;
    this.timelineEl = timelineEl;
    this.onDrop = onDrop;
    this.onDragStart = onDragStart;
    this.onDragEnd = onDragEnd;
    this.pending = null;
    this.active = null;

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);

    this.trayEl.addEventListener("pointerdown", this.handlePointerDown);
  }

  handlePointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const card = event.target.closest("[data-card-id]");
    if (!card || card.getAttribute("aria-disabled") === "true") return;

    // Stop the browser's native text-selection/drag from starting once the
    // pointer moves — without this, dragging with a mouse selects text
    // instead of handing the gesture to handlePointerMove below. This does
    // not stop the click event a plain tap still synthesizes on release.
    event.preventDefault();

    this.pending = { card, startX: event.clientX, startY: event.clientY };
    document.addEventListener("pointermove", this.handlePointerMove);
    document.addEventListener("pointerup", this.handlePointerUp);
  }

  handlePointerMove(event) {
    if (this.active) {
      this.positionGhost(event.clientX, event.clientY);
      this.highlightNearestGap(event.clientX);
      return;
    }

    if (!this.pending) return;
    const dx = event.clientX - this.pending.startX;
    const dy = event.clientY - this.pending.startY;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

    this.beginDrag(this.pending.card, event);
  }

  beginDrag(card, event) {
    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add("drag-ghost");
    ghost.style.width = `${rect.width}px`;
    document.body.appendChild(ghost);

    this.active = {
      cardId: card.dataset.cardId,
      sourceCard: card,
      ghost,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    card.classList.add("is-lifted");
    this.positionGhost(event.clientX, event.clientY);
    this.onDragStart?.(this.active.cardId);
  }

  handlePointerUp(event) {
    document.removeEventListener("pointermove", this.handlePointerMove);
    document.removeEventListener("pointerup", this.handlePointerUp);
    this.pending = null;

    if (!this.active) return;
    const gapIndex = this.findNearestGapIndex(event.clientX);
    const cardId = this.active.cardId;
    this.cleanup();
    if (gapIndex !== null) this.onDrop(cardId, gapIndex);
  }

  positionGhost(clientX, clientY) {
    const { ghost, offsetX, offsetY } = this.active;
    ghost.style.left = `${clientX - offsetX}px`;
    ghost.style.top = `${clientY - offsetY}px`;
  }

  getGapEls() {
    return Array.from(this.timelineEl.querySelectorAll("[data-gap-index]"));
  }

  findNearestGapIndex(clientX) {
    const gaps = this.getGapEls();
    if (gaps.length === 0) return null;
    let closest = null;
    let closestDistance = Infinity;
    gaps.forEach((gapEl) => {
      const rect = gapEl.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(clientX - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = Number(gapEl.dataset.gapIndex);
      }
    });
    return closest;
  }

  highlightNearestGap(clientX) {
    const nearestIndex = this.findNearestGapIndex(clientX);
    this.getGapEls().forEach((gapEl) => {
      gapEl.classList.toggle("gap-active", Number(gapEl.dataset.gapIndex) === nearestIndex);
    });
  }

  cleanup() {
    this.active?.sourceCard?.classList.remove("is-lifted");
    this.active?.ghost?.remove();
    this.getGapEls().forEach((gapEl) => gapEl.classList.remove("gap-active"));
    this.active = null;
    this.onDragEnd?.();
  }
}
