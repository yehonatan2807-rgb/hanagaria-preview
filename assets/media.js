/* הנגריה · background videos (hero workshop, hand-plane shavings).
   - plays only while on screen, pauses off screen (saves battery/data)
   - phone gets the portrait cut
   - keeps itself running: retries when the browser refuses or interrupts playback,
     after returning to the tab/app, and on the first tap when autoplay is blocked
     (iPhone Low Power Mode). Until then the poster shows, with no native play button.
   - pause button (WCAG 2.2.2); "stop animations" / reduced motion = poster only */
(function () {
  "use strict";
  var keepers = [];
  var needTap = false;

  function keep(v, allowed) {
    var k = { v: v, visible: !("IntersectionObserver" in window), last: -1, stuck: 0, errors: 0 };
    k.wants = function () { return k.visible && !document.hidden && allowed(); };
    k.play = function () {
      if (!k.wants() || !v.paused) return;
      v.muted = true;
      var p = v.play();
      if (p && p.catch) p.catch(function (err) { if (err && err.name === "NotAllowedError") needTap = true; });
    };
    v.muted = true; v.defaultMuted = true; v.setAttribute("muted", "");
    v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
    v.loop = true; v.controls = false;
    ["loadedmetadata", "loadeddata", "canplay", "canplaythrough", "ended"].forEach(function (n) { v.addEventListener(n, k.play); });
    v.addEventListener("playing", function () { needTap = false; k.errors = 0; k.stuck = 0; });
    v.addEventListener("pause", function () { setTimeout(k.play, 350); }); // the system interrupted it
    v.addEventListener("error", k.recover = function () {
      if (k.errors >= 3) return;
      k.errors++;
      setTimeout(function () { v.load(); k.play(); }, 1000 * k.errors);
    });
    var sources = v.querySelectorAll("source");
    if (sources.length) sources[sources.length - 1].addEventListener("error", k.recover);
    keepers.push(k);
    return k;
  }

  function resumeAll() { keepers.forEach(function (k) { k.play(); }); }

  /* a real tap unlocks blocked videos; off-screen ones are unlocked and paused again */
  function onGesture(e) {
    if (!needTap || (e.target && e.target.closest && e.target.closest("[data-video-toggle]"))) return;
    keepers.forEach(function (k) {
      if (!k.v.paused) return;
      if (k.wants()) { k.play(); return; }
      if (k.blockedByUser && k.blockedByUser()) return;
      var p = k.v.play();
      if (p && p.then) p.then(function () { if (!k.wants()) k.v.pause(); }).catch(function () {});
    });
  }

  /* watchdog: restarts a video that stopped or froze without telling anyone */
  function watchdog() {
    keepers.forEach(function (k) {
      var v = k.v;
      if (!k.wants()) { k.stuck = 0; return; }
      if (v.paused) { k.play(); return; }
      /* a video that is still downloading is not stuck: only act when neither the picture nor the download moves */
      var got = v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0;
      if (v.currentTime === k.last && got === k.got) k.stuck++; else k.stuck = 0;
      k.last = v.currentTime; k.got = got;
      if (k.stuck === 3 && v.readyState >= 3) { v.pause(); k.play(); }
      else if (k.stuck >= 15) {
        var at = v.currentTime;
        k.stuck = 0;
        v.addEventListener("loadedmetadata", function once() {
          v.removeEventListener("loadedmetadata", once);
          try { v.currentTime = at; } catch (err) {}
        });
        v.load(); k.play();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.documentElement;
    var vids = [].slice.call(document.querySelectorAll("[data-bg-video]"));
    if (!vids.length) return;
    var still = !root.classList.contains("motion-on");
    var phone = window.matchMedia("(max-width: 700px)").matches;

    vids.forEach(function (v, i) {
      var srcs = [].slice.call(v.querySelectorAll("source"));
      if (i === 0 && !still) v.preload = "auto"; // the opening film starts loading right away
      if (srcs.length > 1) { // choose one source ourselves; <source media> is not supported everywhere
        var pick = srcs.filter(function (s) { return phone ? s.getAttribute("media") : !s.getAttribute("media"); })[0] || srcs[srcs.length - 1];
        var already = v.currentSrc && v.currentSrc === pick.src; // the browser chose the same file: don't restart its download
        srcs.forEach(function (s) { if (s !== pick) s.remove(); });
        pick.removeAttribute("media");
        if (!already) v.load();
      }
      var box = v.closest("section, figure") || v.parentNode;
      var btn = box.querySelector("[data-video-toggle]");
      var userPaused = still;
      var k = keep(v, function () { return !userPaused; });
      k.blockedByUser = function () { return userPaused; };
      function label() { // the icon follows the visitor's choice, so a blocked video never asks for a press
        if (!btn) return;
        btn.setAttribute("aria-label", btn.getAttribute(userPaused ? "data-l-play" : "data-l-pause"));
        btn.firstElementChild.textContent = userPaused ? "▶" : "❚❚";
        btn.classList.toggle("is-paused", userPaused);
      }
      if (still) { v.removeAttribute("autoplay"); v.pause(); }
      if (btn) btn.addEventListener("click", function () {
        if (userPaused || v.paused) {
          userPaused = false;
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else { userPaused = true; v.pause(); }
        label();
      });
      if (i > 0 && !still && "IntersectionObserver" in window) { // later videos download only when the visitor scrolls near them
        var near = new IntersectionObserver(function (es) {
          if (!es[0].isIntersecting) return;
          near.disconnect();
          v.preload = "auto";
          if (v.readyState === 0 && v.paused) v.load();
          k.play();
        }, { rootMargin: "500px 0px" });
        near.observe(v);
      }
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            k.visible = e.isIntersecting;
            if (e.isIntersecting) k.play();
            else if (!v.paused) v.pause();
          });
        }, { threshold: 0.15 }).observe(v);
      } else k.play();
      /* the accessibility menu's "stop animations" also stops the videos, live */
      var stopped = still;
      new MutationObserver(function () {
        var off = !root.classList.contains("motion-on");
        if (off === stopped) return;
        stopped = off; userPaused = off;
        if (off) v.pause(); else k.play();
        label();
      }).observe(root, { attributes: true, attributeFilter: ["class"] });
      label();
    });

    document.addEventListener("visibilitychange", resumeAll);
    window.addEventListener("pageshow", resumeAll);
    window.addEventListener("focus", resumeAll);
    window.addEventListener("online", resumeAll);
    ["touchend", "pointerup", "click", "keydown"].forEach(function (n) {
      document.addEventListener(n, onGesture, { passive: true });
    });
    setInterval(watchdog, 2000);
  });
})();
