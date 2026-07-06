// A small, dependency-free confetti burst drawn on a full-viewport canvas
// that removes itself when the animation finishes.
const COLORS = ["#ffd166", "#2456d6", "#137a4b", "#b42318", "#ffffff"];

export function burstConfetti({ particleCount = 90 } = {}) {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const particles = Array.from({ length: particleCount }, () => ({
    x: canvas.width / 2,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 12,
    vy: Math.random() * -10 - 4,
    size: 4 + Math.random() * 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.3,
  }));

  const gravity = 0.35;
  let frame = 0;
  const maxFrames = 130;

  function tick() {
    frame += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    if (frame < maxFrames) {
      window.requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }

  window.requestAnimationFrame(tick);
}
