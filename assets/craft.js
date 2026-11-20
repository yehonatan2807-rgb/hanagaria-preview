/* הנגריה · scroll stage "מהשרטוט לבית".
   The track is pinned; scroll drives one value q (0..1) through the five steps:
   sketch draws in, raw wood wipes across, colour arrives, the piece settles in place.
   The last ~28% of the track is a hold on the finished piece. Once finished it stays
   finished until reload, and the pin collapses so scrolling back up never stalls. */
(function () {
  "use strict";
  /* runs after main.js (both deferred) has set .motion-on */
  document.addEventListener("DOMContentLoaded", init);
  function init() {
  var sec = document.querySelector("[data-craft]");
  var root = document.documentElement;
  if (!sec || !root.classList.contains("motion-on")) return;
  var track = sec.querySelector(".craft-track"), fig = sec.querySelector(".craft-frame");
  var rule = sec.querySelector(".craft-rule"), steps = [].slice.call(sec.querySelectorAll(".process-steps li"));
  var HOLD = 0.28, target = 0, q = 0, done = false, raf = 0, collapsed = false, idle = 0;
  [].forEach.call(sec.querySelectorAll("img"), function (im) { im.loading = "eager"; });

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(x, a, b) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }

  function measure() {
    if (collapsed) return 1;
    var r = track.getBoundingClientRect(), span = r.height - (window.innerHeight - (parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 0));
    if (span <= 0) return 1;
    var hdr = parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 0;
    return clamp((hdr - r.top) / span / (1 - HOLD));
  }
  function paint(v) {
    fig.style.setProperty("--sk", seg(v, 0.02, 0.30).toFixed(4));
    fig.style.setProperty("--raw", seg(v, 0.36, 0.62).toFixed(4));
    fig.style.setProperty("--col", seg(v, 0.62, 0.82).toFixed(4));
    fig.style.setProperty("--set", seg(v, 0.82, 1).toFixed(4));
    if (rule) rule.style.setProperty("--p", clamp(v).toFixed(4));
    steps.forEach(function (li, i) { li.classList.toggle("on", i === 0 ? v > 0.004 : v >= i * 0.2); });
  }
  function tick() {
    raf = 0;
    var d = target - q;
    q = Math.abs(d) < 0.001 ? target : q + d * 0.14;
    paint(q);
    if (q >= 0.999) done = true;
    if (q !== target) raf = requestAnimationFrame(tick);
  }
  function onScroll() {
    var m = measure();
    target = done ? 1 : m;
    if (!raf) raf = requestAnimationFrame(tick);
    clearTimeout(idle); idle = setTimeout(maybeCollapse, 180);
  }
  /* once finished and scrolled fully past, remove the pinned stretch without moving anything on screen */
  function maybeCollapse() {
    if (!done || collapsed) return;
    var r = sec.getBoundingClientRect();
    if (r.bottom > 0) return;
    var ref = sec.nextElementSibling; while (ref && !ref.getClientRects().length) ref = ref.nextElementSibling; ref = ref || sec; var before = ref.getBoundingClientRect().top;
    var sb = root.style.scrollBehavior; root.style.scrollBehavior = "auto";
    track.style.height = "auto"; collapsed = true;
    /* the browser may already anchor the scroll; correct only what actually moved */
    var shift = ref.getBoundingClientRect().top - before;
    if (Math.abs(shift) > 0.5) window.scrollTo(0, window.scrollY + shift);
    root.style.scrollBehavior = sb;
  }
  steps.forEach(function (li) { li.classList.remove("on"); });
  paint(0); onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  }
})();
