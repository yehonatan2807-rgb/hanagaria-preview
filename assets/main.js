/* site-format · main.js — shared behaviour for every site. No libraries.
   Reads page config from <script id="site-data">. Every feature is
   optional and only runs when its markup exists. */
(function () {
  "use strict";
  var D = {};
  try { D = JSON.parse(document.getElementById("site-data").textContent); } catch (e) {}
  var UI = D.ui || {};
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function waLink(text) { return "https://wa.me/" + (D.wa || "") + (text ? "?text=" + encodeURIComponent(text) : ""); }
  function track(name) {
    try {
      if (window.gtag) window.gtag("event", name);
      if (window.plausible) window.plausible(name);
    } catch (e) {}
  }

  /* ---------- demo guard ----------
     Until Shmulik approves the site, call and WhatsApp do not reach him: a tap shows a short note instead.
     Launch day: set DEMO = false here and in studio.html. */
  var DEMO = true;
  var demoToast = null;
  function demoSay() {
    if (!demoToast) { demoToast = document.createElement("div"); demoToast.className = "toast demo-toast"; demoToast.setAttribute("role", "status"); document.body.appendChild(demoToast); }
    demoToast.textContent = (document.documentElement.lang || "he").indexOf("he") === 0 ? "זה אתר לדוגמה. הכפתור יופעל אחרי אישור של שמוליק." : "This is a preview. This button goes live once the owner approves.";
    demoToast.classList.add("show");
    clearTimeout(demoToast.t); demoToast.t = setTimeout(function () { demoToast.classList.remove("show"); }, 3200);
  }
  if (DEMO) {
    /* the note's live region exists from the start, so screen readers announce it */
    demoToast = document.createElement("div"); demoToast.className = "toast demo-toast"; demoToast.setAttribute("role", "status"); document.body.appendChild(demoToast);
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="tel:"],a[href*="wa.me"],a[href*="whatsapp"]');
      if (a) { e.preventDefault(); e.stopPropagation(); demoSay(); }
    }, true);
  }

  /* ---------- accessibility menu (persisted per visitor) ---------- */
  var A11Y = ["text", "contrast", "links", "font", "motion"];
  var a11yState = store.get("a11y") || {};
  function applyA11y() {
    A11Y.forEach(function (k) {
      root.classList.toggle("a11y-" + k, !!a11yState[k]);
      var b = $('[data-a11y-opt="' + k + '"]');
      if (b) b.setAttribute("aria-pressed", a11yState[k] ? "true" : "false");
    });
  }
  applyA11y();
  var motionOn = function () { return D.motion !== "minimal" && !reduce.matches && !a11yState.motion; };
  if (motionOn()) root.classList.add("motion-on");

  var a11yBtn = $("[data-a11y-toggle]"), a11yPanel = $("#a11y-panel");
  if (a11yBtn && a11yPanel) {
    a11yBtn.addEventListener("click", function () {
      var open = a11yPanel.hidden;
      a11yPanel.hidden = !open;
      a11yBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("[data-a11y-opt]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-a11y-opt");
        a11yState[k] = !a11yState[k];
        store.set("a11y", a11yState); applyA11y();
        if (k === "motion") root.classList.toggle("motion-on", motionOn());
      });
    });
    var rs = $("[data-a11y-reset]");
    if (rs) rs.addEventListener("click", function () { a11yState = {}; store.set("a11y", a11yState); applyA11y(); root.classList.toggle("motion-on", motionOn()); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !a11yPanel.hidden) { a11yPanel.hidden = true; a11yBtn.setAttribute("aria-expanded", "false"); a11yBtn.focus(); }
    });
  }

  /* ---------- header shadow + mobile menu ---------- */
  var header = $("[data-header]");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  }
  var mBtn = $("[data-menu-toggle]"), mMenu = $("[data-mobile-menu]");
  function closeMenu(focusBtn) {
    if (!mMenu || mMenu.hidden) return;
    mMenu.hidden = true; mBtn.setAttribute("aria-expanded", "false");
    header.classList.remove("menu-open"); document.body.style.overflow = "";
    if (focusBtn) mBtn.focus();
  }
  if (mBtn && mMenu) {
    mBtn.addEventListener("click", function () {
      if (!mMenu.hidden) return closeMenu(false);
      mMenu.hidden = false; mBtn.setAttribute("aria-expanded", "true");
      header.classList.add("menu-open"); document.body.style.overflow = "hidden";
      var first = $("a", mMenu); if (first) first.focus();
    });
    mMenu.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(true); });
    window.addEventListener("resize", function () { if (window.innerWidth > 960) closeMenu(false); });
  }

  /* ---------- menu shows the section you are in (scroll spy) ---------- */
  var samePage = function (a) {
    var u = new URL(a.href, location.href), strip = function (x) { return x.replace(/index\.html$/, ""); };
    return u.hash && strip(u.pathname) === strip(location.pathname);
  };
  var spyLinks = $$(".nav a, .mobile-menu a, [data-spy] a").filter(samePage);
  if (spyLinks.length && "IntersectionObserver" in window) {
    var spyOn = function (id) {
      spyLinks.forEach(function (a) {
        if (new URL(a.href, location.href).hash.slice(1) === id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) spyOn(en.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    spyLinks.forEach(function (a) { var el = document.getElementById(new URL(a.href, location.href).hash.slice(1)); if (el) spy.observe(el); });
  }

  /* ---------- calm reveal ---------- */
  var rev = $$("[data-reveal]");
  if (rev.length && "IntersectionObserver" in window && root.classList.contains("motion-on")) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    rev.forEach(function (el) { io.observe(el); });
    setTimeout(function () { rev.forEach(function (el) { el.classList.add("in"); }); }, 4000); // safety: never leave content hidden
  } else { rev.forEach(function (el) { el.classList.add("in"); }); }

  /* ---------- intro curtain (once per session) ---------- */
  var intro = $("[data-intro]");
  if (intro) {
    var seen = false; try { seen = sessionStorage.getItem("intro") === "1"; } catch (e) {}
    if (seen || !motionOn()) intro.remove();
    else {
      try { sessionStorage.setItem("intro", "1"); } catch (e) {}
      setTimeout(function () { intro.classList.add("done"); setTimeout(function () { intro.remove(); }, 900); }, 1100);
    }
  }

  /* ---------- hero slideshow (pause button = WCAG 2.2.2) ---------- */
  var slides = $("[data-slides]");
  if (slides) {
    var items = $$(".slide", slides), idx = 0, timer = null, pauseBtn = $("[data-slides-pause]", slides);
    var next = function () { items[idx].classList.remove("is-on"); idx = (idx + 1) % items.length; items[idx].classList.add("is-on"); };
    var play = function () { if (items.length > 1 && motionOn()) timer = setInterval(next, 6500); };
    var stop = function () { clearInterval(timer); timer = null; };
    play();
    if (!motionOn() && pauseBtn) pauseBtn.hidden = true;
    if (pauseBtn) pauseBtn.addEventListener("click", function () {
      if (timer) { stop(); pauseBtn.setAttribute("aria-label", UI.play || "Play"); pauseBtn.firstElementChild.textContent = "▶"; }
      else { play(); pauseBtn.setAttribute("aria-label", UI.pause || "Pause"); pauseBtn.firstElementChild.textContent = "❚❚"; }
    });
  }

  /* ---------- opening hours: "open now" + today's row (Israel time) ---------- */
  var openEl = $("[data-open-now]");
  if (openEl && D.hours && D.hours.length) {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }, day = 0, hm = "00:00", h = "00", m = "00";
      parts.forEach(function (p) { if (p.type === "weekday") day = map[p.value]; if (p.type === "hour") h = p.value; if (p.type === "minute") m = p.value; });
      hm = (h === "24" ? "00" : h) + ":" + m;
      var today = D.hours.filter(function (x) { return x.days.indexOf(day) > -1; })[0];
      var isOpen = !!today && hm >= today.open && hm < today.close;
      openEl.textContent = isOpen ? UI.open_now : UI.closed_now;
      openEl.classList.toggle("is-open", isOpen);
      var row = $('.hours tr[data-day="' + day + '"]'); if (row) row.classList.add("today");
    } catch (e) {}
  }

  /* ---------- contact form → WhatsApp message (nothing stored) ---------- */
  $$("[data-wa-form]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      $$("[required]", f).forEach(function (inp) {
        var err = inp.parentNode.querySelector(".err");
        if (!inp.value.trim()) {
          ok = false; inp.setAttribute("aria-invalid", "true");
          if (!err) { err = document.createElement("span"); err.className = "err"; err.id = inp.id + "-err"; inp.parentNode.appendChild(err); inp.setAttribute("aria-describedby", err.id); }
          err.textContent = UI.required || "Required";
        } else { inp.removeAttribute("aria-invalid"); if (err) err.textContent = ""; }
      });
      if (!ok) { var bad = $('[aria-invalid="true"]', f); if (bad) bad.focus(); return; }
      var lines = [D.waMsg || ""];
      $$("input:not([type=hidden]), textarea, select", f).forEach(function (inp) {
        if (!inp.value.trim()) return;
        var lab = f.querySelector('label[for="' + inp.id + '"]');
        lines.push((lab ? lab.textContent : inp.name) + ": " + inp.value.trim());
      });
      track("form_whatsapp");
      if (DEMO) { demoSay(); return; }
      window.open(waLink(lines.filter(Boolean).join("\n")), "_blank", "noopener");
    });
  });

  /* ---------- WhatsApp cart ---------- */
  var cartRoot = $("[data-cart]");
  if (cartRoot && D.store && D.store.mode === "whatsapp") {
    var cart = store.get("cart") || [];
    var cur = D.store.currency || "₪";
    var listEl = $("[data-cart-items]"), totalEl = $("[data-cart-total]"), sendEl = $("[data-cart-send]");
    var countEls = $$("[data-cart-count]"), toast = $("[data-toast]"), lastFocus = null;
    var fmt = function (n) { return (Math.round(n * 100) / 100).toLocaleString("he-IL") + " " + cur; };
    var save = function () { store.set("cart", cart); draw(); };
    var draw = function () {
      var n = 0, sum = 0;
      cart.forEach(function (it) { n += it.q; sum += it.q * (parseFloat(it.p) || 0); });
      countEls.forEach(function (c) { c.textContent = n; c.hidden = n === 0; });
      if (!cart.length) { listEl.innerHTML = '<p class="cart-empty">' + (UI.cart_empty || "") + "</p>"; totalEl.textContent = ""; sendEl.hidden = true; return; }
      sendEl.hidden = false;
      listEl.innerHTML = cart.map(function (it, i) {
        var name = it.n.replace(/[<>&"]/g, "");
        return '<div class="cart-item"><strong>' + name + '</strong><span>' + (it.p ? fmt(it.q * it.p) : "") + '</span>' +
          '<div class="qty" role="group" aria-label="' + (UI.qty || "") + " " + name + '"><button type="button" data-q="' + i + '" data-d="-1" aria-label="-">−</button><span>' + it.q + '</span><button type="button" data-q="' + i + '" data-d="1" aria-label="+">+</button></div>' +
          '<button type="button" class="rm" data-rm="' + i + '">' + (UI.remove || "×") + "</button></div>";
      }).join("");
      totalEl.textContent = (UI.total || "") + ": " + fmt(sum);
      var msg = [D.waMsg || ""].concat(cart.map(function (it) { return "• " + it.n + " × " + it.q + (it.p ? " (" + fmt(it.q * it.p) + ")" : ""); }));
      msg.push((UI.total || "") + ": " + fmt(sum));
      sendEl.href = waLink(msg.filter(Boolean).join("\n"));
    };
    var openCart = function () { lastFocus = document.activeElement; cartRoot.hidden = false; document.body.style.overflow = "hidden"; var c = $("[data-cart-close].icon-btn", cartRoot); if (c) c.focus(); };
    var closeCart = function () { cartRoot.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); };
    $$("[data-cart-open]").forEach(function (b) { b.addEventListener("click", openCart); });
    $$("[data-cart-close]").forEach(function (b) { b.addEventListener("click", closeCart); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !cartRoot.hidden) closeCart(); });
    listEl.addEventListener("click", function (e) {
      var q = e.target.closest("[data-q]"), rm = e.target.closest("[data-rm]");
      if (q) { var it = cart[+q.dataset.q]; it.q = Math.max(1, it.q + (+q.dataset.d)); save(); }
      if (rm) { cart.splice(+rm.dataset.rm, 1); save(); }
    });
    sendEl.addEventListener("click", function () { track("order_whatsapp"); });
    $$("[data-add-to-cart]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.dataset.id, found = cart.filter(function (x) { return x.id === id; })[0];
        if (found) found.q++; else cart.push({ id: id, n: b.dataset.name, p: b.dataset.price, q: 1 });
        save();
        if (toast) { toast.textContent = (UI.added || "") + ": " + b.dataset.name; toast.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { toast.classList.remove("show"); }, 2200); }
      });
    });
    draw();
  }

  /* ---------- click tracking (only does something when analytics is on) ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]"); if (!a) return;
    var h = a.getAttribute("href");
    if (h.indexOf("tel:") === 0) track("click_call");
    else if (h.indexOf("wa.me") > -1) track("click_whatsapp");
    else if (h.indexOf("mailto:") === 0) track("click_email");
  });

  /* ---------- analytics: Plausible (no cookies) or GA4 behind a consent banner ---------- */
  var an = D.analytics || {};
  if (an.plausible) {
    var ps = document.createElement("script"); ps.defer = true; ps.src = "https://plausible.io/js/script.js"; ps.setAttribute("data-domain", an.plausible); document.head.appendChild(ps);
    window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
  }
  if (an.ga4) {
    var consent = store.get("consent");
    var loadGA = function () {
      var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + an.ga4; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date()); window.gtag("config", an.ga4, { anonymize_ip: true });
    };
    if (consent === "yes") loadGA();
    else if (consent !== "no") {
      var he = D.lang === "he";
      var bar = document.createElement("div");
      bar.className = "consent"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", he ? "עוגיות" : "Cookies");
      bar.innerHTML = '<p>' + (he ? "נשמח למדוד כניסות לאתר בעזרת Google Analytics כדי לשפר אותו. מסכימים?" : "May we measure visits with Google Analytics to improve the site?") +
        '</p><div class="btns"><button class="btn btn-primary btn-sm" type="button" data-c="yes">' + (he ? "מסכים/ה" : "Accept") + '</button><button class="btn btn-ghost btn-sm" type="button" data-c="no">' + (he ? "לא, תודה" : "No thanks") + "</button></div>";
      document.body.appendChild(bar);
      bar.addEventListener("click", function (e) { var b = e.target.closest("[data-c]"); if (!b) return; store.set("consent", b.dataset.c); if (b.dataset.c === "yes") loadGA(); bar.remove(); });
    }
  }

  $$("[data-year]").forEach(function (y) { y.textContent = new Date().getFullYear(); });
})();
