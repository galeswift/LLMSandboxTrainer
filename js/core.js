/* Tensorium core: DOM helpers, controls, math, passport stamps. */
(function () {
  const TM = (window.TM = { exhibits: [] });

  TM.register = (ex) => TM.exhibits.push(ex);

  // ---------- DOM ----------
  TM.el = function (tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") e.className = v;
        else if (k === "style" && typeof v === "object") {
          for (const [sk, sv] of Object.entries(v)) sk.startsWith("--") ? e.style.setProperty(sk, sv) : (e.style[sk] = sv);
        }
        else if (k === "html") e.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      e.append(kid.nodeType ? kid : String(kid));
    }
    return e;
  };
  const el = TM.el;

  TM.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  TM.accent = (node) => getComputedStyle(node).getPropertyValue("--accent").trim();
  TM.hexToRgb = function (hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  TM.mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  TM.rgb = (c, alpha = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;

  // ---------- Controls ----------
  let uid = 0;
  const nextId = (p) => `${p}-${++uid}`;

  TM.slider = function ({ id, label, min, max, step = 1, value, fmt = (v) => v, onInput }) {
    id = id || nextId("sl");
    const out = el("output", { class: "val", for: id }, fmt(value));
    const input = el("input", { type: "range", id, min, max, step, value });
    input.addEventListener("input", () => {
      const v = +input.value;
      out.textContent = fmt(v);
      onInput && onInput(v);
    });
    const wrap = el("label", { class: "ctl", for: id }, el("span", { class: "ctl-label" }, label), out, input);
    return {
      el: wrap,
      input,
      get: () => +input.value,
      set(v, fire) {
        input.value = v;
        out.textContent = fmt(+input.value);
        if (fire) onInput && onInput(+input.value);
      },
    };
  };

  TM.seg = function ({ label, options, value, onChange }) {
    const btns = [];
    const seg = el("div", { class: "seg", role: "group", "aria-label": label || "options" });
    let cur = value;
    for (const [val, text] of options) {
      const b = el("button", { type: "button", "aria-pressed": String(val === value) }, text);
      b.addEventListener("click", () => api.set(val, true));
      btns.push([val, b]);
      seg.append(b);
    }
    const api = {
      el: label ? el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, label), seg) : seg,
      get: () => cur,
      set(v, fire) {
        cur = v;
        for (const [val, b] of btns) b.setAttribute("aria-pressed", String(val === v));
        if (fire) onChange && onChange(v);
      },
    };
    return api;
  };

  TM.stepper = function ({ label, min, max, value, onChange }) {
    let v = value;
    const span = el("span", null, v);
    const upd = (nv) => {
      nv = Math.max(min, Math.min(max, nv));
      if (nv === v) return;
      v = nv;
      span.textContent = v;
      onChange && onChange(v);
    };
    const box = el(
      "span",
      { class: "stepper" },
      el("button", { type: "button", "aria-label": `decrease ${label || ""}`, onclick: () => upd(v - 1) }, "−"),
      span,
      el("button", { type: "button", "aria-label": `increase ${label || ""}`, onclick: () => upd(v + 1) }, "+")
    );
    return {
      el: label ? el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, label), box) : box,
      get: () => v,
      set(nv) {
        v = nv;
        span.textContent = v;
      },
    };
  };

  TM.btn = (text, onClick, cls = "") => el("button", { type: "button", class: `btn ${cls}`, onclick: onClick }, text);

  TM.canvas = function (w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = el("canvas", { class: "viz" });
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.aspectRatio = `${w} / ${h}`;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    c.W = w;
    c.H = h;
    c.ctx = ctx;
    c.pointer = (e) => {
      const r = c.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * w, ((e.clientY - r.top) / r.height) * h];
    };
    return c;
  };

  TM.stat = (k, v = "–") => {
    const vEl = el("div", { class: "v" }, v);
    const node = el("div", { class: "stat" }, el("div", { class: "k" }, k), vEl);
    return { el: node, set: (x) => (vEl.textContent = x) };
  };

  // ---------- Math ----------
  TM.rng = function (seed = 1) {
    let a = seed >>> 0;
    const r = function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.normal = () => {
      const u = Math.max(r(), 1e-12);
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
    };
    r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    return r;
  };

  TM.softmax = function (xs) {
    let m = -Infinity;
    for (const x of xs) if (x > m) m = x;
    if (m === -Infinity) return xs.map(() => 0);
    const ex = xs.map((x) => (x === -Infinity ? 0 : Math.exp(x - m)));
    const s = ex.reduce((a, b) => a + b, 0);
    return ex.map((e) => e / s);
  };

  TM.fmt = function (x, d = 2) {
    if (!isFinite(x)) return isNaN(x) ? "NaN" : x > 0 ? "∞" : "−∞";
    const s = Math.abs(x) >= 1e4 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(1) : x.toFixed(d);
    return s.replace("-", "−");
  };
  TM.sig = (x, n = 3) => (x === 0 ? "0" : Number(x.toPrecision(n)).toString());
  TM.clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ---------- Events ----------
  const listeners = {};
  TM.on = (ev, fn) => (listeners[ev] = listeners[ev] || []).push(fn);
  TM.off = (ev, fn) => (listeners[ev] = (listeners[ev] || []).filter((f) => f !== fn));
  TM.emit = (ev, data) => (listeners[ev] || []).forEach((fn) => fn(data));

  // ---------- Passport stamps (stored in this browser only) ----------
  const KEY = "tensorium.stamps.v1";
  let stamps = {};
  try {
    stamps = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch (e) {
    stamps = {};
  }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(stamps));
    } catch (e) {
      /* storage unavailable: stamps last for this visit only */
    }
  };
  TM.hasStamp = (ex, ch) => !!(stamps[ex] && stamps[ex][ch]);
  TM.award = function (ex, ch) {
    if (TM.hasStamp(ex, ch)) return;
    (stamps[ex] = stamps[ex] || {})[ch] = Date.now();
    save();
    TM.emit("stamp", { ex, ch });
  };
  TM.stampCount = (exId) => {
    const ex = TM.exhibits.find((e) => e.id === exId);
    return ex ? ex.challenges.filter((c) => TM.hasStamp(exId, c.id)).length : 0;
  };
  TM.totalStamps = () => TM.exhibits.reduce((n, ex) => n + TM.stampCount(ex.id), 0);
  TM.totalChallenges = () => TM.exhibits.reduce((n, ex) => n + ex.challenges.length, 0);
  TM.resetStamps = () => {
    stamps = {};
    save();
    TM.emit("stamp", null);
  };
})();
