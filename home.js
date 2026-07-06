// Homepage interactions: scroll-reveal for sections below the hero.
// The legacy-hash redirect lives inline in index.html so it runs before paint.
(() => {
  const revealTargets = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window) || revealTargets.length === 0) {
    return;
  }

  document.documentElement.classList.add("js-reveal");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0, rootMargin: "0px 0px 120px 0px" },
  );

  revealTargets.forEach((el) => observer.observe(el));

  // Safety net: a very fast scroll (End key, flick, or a full-page capture
  // tool) can jump past a section between animation frames before the
  // observer ever reports it as intersecting. Never let content stay stuck
  // invisible — reveal everything after a short delay regardless.
  window.setTimeout(() => {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
    observer.disconnect();
  }, 2000);
})();
