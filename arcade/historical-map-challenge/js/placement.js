// Pointer-based placement for the map: unifies mouse, touch, and pen in one
// code path (native HTML5 drag-and-drop is poor on touch). Three gestures all
// resolve to the same thing — a normalized { x, y } drop point on the map:
//
//   1. Drag the active term chip onto the map.
//   2. Tap/click directly on the map (then optionally drag to fine-tune).
//   3. Drag the already-placed guess pin to move it.
//
// During a drag we move a live pin element directly (cheap) and only commit to
// game state via onPlace() on release, so the screen re-renders once per
// placement instead of on every pointer move.
const DRAG_THRESHOLD_PX = 6;

export class MapPlacer {
  constructor({ root, onPlace, canPlace }) {
    this.root = root;
    this.onPlace = onPlace;
    this.canPlace = canPlace || (() => true);
    this.active = null;

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);

    this.root.addEventListener("pointerdown", this.handlePointerDown);
  }

  destroy() {
    this.root.removeEventListener("pointerdown", this.handlePointerDown);
    this.detachMoveListeners();
  }

  handlePointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (!this.canPlace()) return;

    const surface = this.root.querySelector("[data-map-surface]");
    if (!surface) return;

    const onChip = event.target.closest("[data-term-chip]");
    const onPin = event.target.closest("[data-guess-pin]");
    const onSurface = event.target.closest("[data-map-surface]");
    if (!onChip && !onPin && !onSurface) return;

    // Dragging the chip or moving the pin shouldn't start native text/image
    // selection. A plain tap on the surface still commits immediately below.
    event.preventDefault();

    const point = this.pointFromEvent(event, surface);
    this.active = {
      surface,
      mode: onChip ? "chip" : "surface", // "chip" starts as a pending drag
      started: !onChip, // surface/pin taps place right away
      pin: this.ensurePin(surface),
      startX: event.clientX,
      startY: event.clientY,
    };

    if (this.active.started && point) this.movePin(point);

    document.addEventListener("pointermove", this.handlePointerMove);
    document.addEventListener("pointerup", this.handlePointerUp);
  }

  handlePointerMove(event) {
    if (!this.active) return;

    if (!this.active.started) {
      const moved = Math.hypot(event.clientX - this.active.startX, event.clientY - this.active.startY);
      if (moved < DRAG_THRESHOLD_PX) return;
      this.active.started = true;
    }

    const point = this.pointFromEvent(event, this.active.surface);
    if (point) this.movePin(point);
  }

  handlePointerUp(event) {
    this.detachMoveListeners();
    if (!this.active) return;

    const { surface, started, mode } = this.active;
    this.active = null;

    // A chip that never crossed the drag threshold is a plain click, not a
    // placement — ignore it so an accidental tap on the chip doesn't drop a
    // pin at the chip's own location.
    if (mode === "chip" && !started) return;

    const point = this.pointFromEvent(event, surface);
    if (point) this.onPlace(point.x, point.y);
  }

  detachMoveListeners() {
    document.removeEventListener("pointermove", this.handlePointerMove);
    document.removeEventListener("pointerup", this.handlePointerUp);
  }

  ensurePin(surface) {
    let pin = surface.querySelector("[data-guess-pin]");
    if (!pin) {
      pin = document.createElement("span");
      pin.className = "mc-pin mc-pin-guess mc-pin-live";
      pin.setAttribute("data-guess-pin", "");
      surface.appendChild(pin);
    }
    return pin;
  }

  movePin(point) {
    const pin = this.active.pin;
    pin.style.left = `${point.x * 100}%`;
    pin.style.top = `${point.y * 100}%`;
  }

  // Clamp to [0,1] so a drag that leaves the map still resolves to the nearest
  // on-map point rather than an out-of-bounds guess.
  pointFromEvent(event, surface) {
    const rect = surface.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    };
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
