/* הנגריה · background videos (hero workshop, hand-plane shavings).
   - plays only while on screen, pauses off screen (saves battery/data)
   - phone gets the portrait cut
   - visible pause button (WCAG 2.2.2); "stop animations" / reduced motion = poster only */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var root = document.documentElement;
    var vids = [].slice.call(document.querySelectorAll("[data-bg-video]"));
    if (!vids.length) return;
    var still = !root.classList.contains("motion-on");
    var phone = window.matchMedia("(max-width: 700px)").matches;

    vids.forEach(function (v) {
      var srcs = [].slice.call(v.querySelectorAll("source"));
      if (srcs.length > 1) { // choose one source ourselves; <source media> is not supported everywhere
        var pick = srcs.filter(function (s) { return phone ? s.getAttribute("media") : !s.getAttribute("media"); })[0] || srcs[srcs.length - 1];
        srcs.forEach(function (s) { if (s !== pick) s.remove(); });
        pick.removeAttribute("media"); v.load();
      }
      v.muted = true;
      var box = v.closest("section, figure") || v.parentNode;
      var btn = box.querySelector("[data-video-toggle]");
      var userPaused = still;
      function label() {
        if (!btn) return;
        var paused = v.paused;
        btn.setAttribute("aria-label", btn.getAttribute(paused ? "data-l-play" : "data-l-pause"));
        btn.firstElementChild.textContent = paused ? "▶" : "❚❚";
        btn.classList.toggle("is-paused", paused);
      }
      function play() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      if (still) { v.removeAttribute("autoplay"); v.pause(); }
      v.addEventListener("play", label); v.addEventListener("pause", label);
      if (btn) btn.addEventListener("click", function () {
        if (v.paused) { userPaused = false; play(); } else { userPaused = true; v.pause(); }
      });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && !userPaused) play();
            else if (!e.isIntersecting && !v.paused) v.pause();
          });
        }, { threshold: 0.15 }).observe(v);
      } else if (!userPaused) play();
      /* the accessibility menu's "stop animations" also stops the videos, live */
      var stopped = still;
      new MutationObserver(function () {
        var off = !root.classList.contains("motion-on");
        if (off === stopped) return;
        stopped = off; userPaused = off;
        if (off) { v.pause(); return; }
        var r = v.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) play();
      }).observe(root, { attributes: true, attributeFilter: ["class"] });
      label();
    });
  });
})();
