/* ==========================================================================
   Lab — 실험(시뮬레이터) 레지스트리와 카드 틀
   실험 정의는 assets/sims/*.js에서 Lab.register({...})로 등록한다.
   페이지에서는 아래 한 줄이면 실험 카드가 자동으로 만들어진다.
     <div data-sim="optimizers"></div>
     <div data-sim="optimizers" data-title="제목 바꾸기" data-note="해볼 것 바꾸기"></div>
   카드는 화면 근처에 왔을 때 비로소 mount(S)가 실행된다(지연 로딩).

   등록 형식
     Lab.register({
       id: "optimizers", title: "옵티마이저 경주", field: "dl", tags: ["최적화"],
       desc: "한 줄 설명", thumb: "curve", layout: "side" | "stack", three: false,
       note: "해볼 것: ...",
       mount(S) { const cv = S.canvas({ aspect: .6 }, draw); const lr = S.range({...}); ... }
     });
   ========================================================================== */
(function () {
  "use strict";
  const Lab = (window.Lab = {});
  const defs = {}, order = [];
  let uid = 0;

  Lab.register = (def) => {
    if (defs[def.id]) console.warn("duplicate sim id", def.id);
    defs[def.id] = def;
    order.push(def.id);
  };
  Lab.get = (id) => defs[id];
  Lab.list = () => order.map((id) => defs[id]);

  /* ------------------------------------------------------------ 썸네일 (실험 목록용) */
  const R = (seed) => VZ.rng(seed);
  const TH = {
    curve: () => { let d = ""; for (let i = 0; i <= 40; i++) { const x = 8 + i * 3.6, y = 38 - 22 * Math.sin(i / 6) * Math.exp(-i / 40); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); } return `<path d="M8 62H154M8 6V62" stroke="currentColor" stroke-opacity=".35"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="80" cy="${38 - 22 * Math.sin(20 / 6) * Math.exp(-0.5)}" r="4" fill="currentColor"/>`; },
    bars: () => { const r = R(3); let s = `<path d="M8 62H154" stroke="currentColor" stroke-opacity=".35"/>`; for (let i = 0; i < 12; i++) { const h = 10 + 44 * Math.exp(-((i - 4) ** 2) / 10) + r() * 6; s += `<rect x="${12 + i * 12}" y="${62 - h}" width="9" height="${h}" rx="1.5" fill="currentColor" fill-opacity="${0.35 + 0.05 * i}"/>`; } return s; },
    heat: () => { let s = ""; for (let j = 0; j < 6; j++) for (let i = 0; i < 16; i++) { const v = 0.5 + 0.5 * Math.sin(i * 0.5 + j * 0.9) * Math.cos(j * 0.4 - i * 0.2); s += `<rect x="${8 + i * 9.2}" y="${5 + j * 10}" width="8.6" height="9.4" fill="currentColor" fill-opacity="${(0.08 + 0.85 * v).toFixed(2)}"/>`; } return s; },
    scatter: () => { const r = R(5); let s = `<path d="M10 60C50 50 60 14 150 10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>`; for (let i = 0; i < 46; i++) { const a = r() < 0.5, x = 14 + r() * 136, y = 8 + r() * 54; const above = y < 60 - (x - 10) * 0.36; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="currentColor" fill-opacity="${above ? 0.9 : 0.3}"/>`; void a; } return s; },
    network: () => { const L = [3, 5, 5, 2]; let s = "", pts = L.map((n, li) => Array.from({ length: n }, (_, k) => [22 + li * 38, 35 + (k - (n - 1) / 2) * 12])); for (let li = 0; li < L.length - 1; li++) pts[li].forEach((a) => pts[li + 1].forEach((b) => (s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="currentColor" stroke-opacity=".28"/>`))); pts.flat().forEach((p) => (s += `<circle cx="${p[0]}" cy="${p[1]}" r="4.2" fill="currentColor"/>`)); return s; },
    orbit: () => `<ellipse cx="80" cy="35" rx="62" ry="24" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.5"/><path d="M80 35 L138 28 A62 24 0 0 0 128 17 Z" fill="currentColor" fill-opacity=".25"/><circle cx="62" cy="35" r="7" fill="currentColor"/><circle cx="138" cy="28" r="4" fill="currentColor"/>`,
    wave: () => { let s = ""; [0, 1, 2].forEach((k) => { let d = ""; for (let i = 0; i <= 60; i++) { const x = 6 + i * 2.5, y = 35 + (k - 1) * 0 + (14 - k * 4) * Math.sin(i / (3 + k * 1.5) + k); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); } s += `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${2.4 - k * 0.6}" stroke-opacity="${1 - k * 0.3}"/>`; }); return s; },
    field: () => { let s = ""; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; s += `<path d="M54 35 Q ${80 + 30 * Math.cos(a)} ${35 + 40 * Math.sin(a)} 106 35" fill="none" stroke="currentColor" stroke-opacity=".45"/>`; } return s + `<circle cx="54" cy="35" r="8" fill="currentColor"/><circle cx="106" cy="35" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M102 35h8" stroke="currentColor" stroke-width="2"/>`; },
    surface: () => { let s = ""; for (let j = 0; j < 7; j++) { let d = ""; for (let i = 0; i <= 20; i++) { const x = 14 + i * 6.6 + j * 2, y = 18 + j * 6.5 + 10 * Math.sin(i / 3.2) * Math.cos(j / 2.5); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); } s += `<path d="${d}" fill="none" stroke="currentColor" stroke-opacity="${0.3 + j * 0.1}" stroke-width="1.4"/>`; } return s + `<circle cx="96" cy="36" r="4.5" fill="currentColor"/>`; },
    arcs: () => { let s = ""; const xs = [16, 40, 64, 88, 112, 140]; [[1, 4, 0.9], [0, 2, 0.5], [2, 5, 0.7], [3, 4, 0.35], [1, 3, 0.4]].forEach(([a, b, w]) => { const mx = (xs[a] + xs[b]) / 2, h = (xs[b] - xs[a]) * 0.5; s += `<path d="M${xs[a]} 50 Q${mx} ${50 - h} ${xs[b]} 50" fill="none" stroke="currentColor" stroke-width="${1 + w * 3}" stroke-opacity="${w}"/>`; }); xs.forEach((x) => (s += `<rect x="${x - 9}" y="52" width="18" height="11" rx="3" fill="currentColor" fill-opacity=".8"/>`)); return s; },
    windows: () => { let d = ""; for (let i = 0; i <= 50; i++) { const x = 6 + i * 3, y = 40 - 12 * Math.sin(i / 4) - i * 0.25; d += (i ? "L" : "M") + x + " " + y.toFixed(1); } return `<rect x="22" y="10" width="54" height="50" rx="4" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-dasharray="3 3"/><rect x="76" y="10" width="24" height="50" rx="4" fill="currentColor" fill-opacity=".32"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.2"/>`; },
    particles: () => { const r = R(9); let s = "", x = 80, y = 35, d = "M80 35"; for (let i = 0; i < 70; i++) { x = VZ.clamp(x + (r() - 0.5) * 12, 8, 152); y = VZ.clamp(y + (r() - 0.5) * 10, 6, 64); d += `L${x.toFixed(1)} ${y.toFixed(1)}`; } for (let i = 0; i < 40; i++) s += `<circle cx="${(8 + r() * 144).toFixed(1)}" cy="${(6 + r() * 58).toFixed(1)}" r="1.6" fill="currentColor" fill-opacity=".35"/>`; return s + `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6"/>`; },
    pendulum: () => `<path d="M60 6h40" stroke="currentColor" stroke-width="2"/><path d="M50 52 A46 46 0 0 0 110 52" fill="none" stroke="currentColor" stroke-dasharray="3 4" stroke-opacity=".6"/><line x1="80" y1="6" x2="108" y2="50" stroke="currentColor" stroke-width="2"/><circle cx="108" cy="50" r="8" fill="currentColor"/><circle cx="80" cy="6" r="3" fill="currentColor"/>`,
    incline: () => `<path d="M10 62H150L10 18Z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-opacity=".5"/><path d="M128 62A22 22 0 0 1 129 55.4" fill="none" stroke="currentColor" stroke-opacity=".6"/><g transform="translate(66 35.6) rotate(17.4)"><rect x="-13" y="-15" width="26" height="15" rx="2" fill="currentColor"/></g>`,
    grid: () => { const r = R(11); let s = ""; for (let j = 0; j < 7; j++) for (let i = 0; i < 18; i++) s += `<rect x="${8 + i * 8}" y="${6 + j * 8.4}" width="7" height="7.4" rx="1" fill="currentColor" fill-opacity="${r() < 0.5 + 0.03 * (i - 9) ? 0.85 : 0.12}"/>`; return s; },
  };
  Lab.thumb = (def) => `<svg viewBox="0 0 160 70" aria-hidden="true">${(TH[def.thumb] || TH.curve)()}</svg>`;

  /* ------------------------------------------------------------ 카드 틀 */
  function build(el, def, opts) {
    el.classList.add("sim");
    if (!el.id) el.id = "sim-" + def.id;
    const viewHref = typeof LS !== "undefined" ? LS.simUrl(def.id) : "lab/view.html?id=" + def.id;
    const title = opts.title || def.title;
    el.innerHTML = `<div class="sim-head"><span class="sim-tag${def.three ? " three" : ""}">${def.three ? "3D" : "SIMULATOR"}</span><h3></h3>${opts.noLink ? "" : `<a class="sim-link" href="${viewHref}" title="실험실에서 크게 보기">↗ 크게 보기</a>`}</div>
      <div class="sim-body${def.layout === "stack" ? "" : " side"}"><div class="sim-view"><div class="loading">불러오는 중…</div></div><div class="sim-controls"></div></div>`;
    el.querySelector("h3").textContent = title;
    return el;
  }

  function scaffold(el, def, opts) {
    const view = el.querySelector(".sim-view"), controls = el.querySelector(".sim-controls");
    view.innerHTML = "";
    let readout = null, legendEl = null;
    const nid = () => `${def.id}-c${uid++}`;
    const ctrlWrap = (label, inner, out) => {
      const w = document.createElement("label");
      w.className = "ctrl";
      w.innerHTML = `<span>${label}${out ? " <output></output>" : ""}</span>`;
      w.appendChild(inner);
      controls.appendChild(w);
      return w;
    };
    let btnRow = null;
    const S = {
      el, view, controls, def,
      palette: VZ.palette,
      onTheme: VZ.onTheme,
      /** 캔버스 추가. opts: aspect/height/minHeight/maxHeight/parent */
      canvas(o = {}, draw) {
        const c = document.createElement("canvas");
        (o.parent || view).appendChild(c);
        return VZ.canvas(c, draw, o);
      },
      /** 보기 영역 바로 아래에 붙는 보조 패널(3D 아래 2D 그래프 등) */
      panel() {
        const p = document.createElement("div");
        p.className = "sim-panel";
        view.after(p);
        return p;
      },
      /** 보기 영역을 n칸으로 나눈다 → 각 칸 div 배열 */
      split(n = 2) {
        const s = document.createElement("div");
        s.className = "split";
        view.appendChild(s);
        return Array.from({ length: n }, () => s.appendChild(document.createElement("div")));
      },
      range({ label, min, max, step = 1, value, fmt, onInput }) {
        const input = document.createElement("input");
        Object.assign(input, { type: "range", id: nid(), min, max, step, value });
        const w = ctrlWrap(label, input, true);
        const out = w.querySelector("output");
        const upd = (fire) => {
          const v = Number(input.value);
          input.style.setProperty("--fill", ((v - min) / (max - min)) * 100 + "%");
          out.textContent = fmt ? fmt(v) : String(v);
          if (fire && onInput) onInput(v);
        };
        input.addEventListener("input", () => upd(true));
        upd(false);
        btnRow = null;
        const get = () => Number(input.value);
        get.set = (v, fire = true) => { input.value = v; upd(fire); };
        get.el = input;
        return get;
      },
      select({ label, options, value, onChange }) {
        const sel = document.createElement("select");
        sel.id = nid();
        sel.innerHTML = options.map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
        if (value != null) sel.value = value;
        sel.addEventListener("change", () => onChange && onChange(sel.value));
        ctrlWrap(label, sel, false);
        btnRow = null;
        const get = () => sel.value;
        get.set = (v, fire = true) => { sel.value = v; if (fire && onChange) onChange(v); };
        get.el = sel;
        return get;
      },
      seg({ label, options, value, onChange }) {
        const seg = document.createElement("div");
        seg.className = "seg";
        seg.setAttribute("role", "group");
        let cur = value != null ? String(value) : String(options[0][0]);
        seg.innerHTML = options.map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join("");
        const btns = [...seg.querySelectorAll("button")];
        const set = (v, fire = true) => {
          cur = String(v);
          btns.forEach((b) => { const on = b.dataset.v === cur; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
          if (fire && onChange) onChange(cur);
        };
        btns.forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); set(b.dataset.v); }));
        set(cur, false);
        if (label) { const w = document.createElement("div"); w.className = "ctrl"; w.innerHTML = `<span>${label}</span>`; w.appendChild(seg); controls.appendChild(w); }
        else controls.appendChild(seg);
        btnRow = null;
        const get = () => cur;
        get.set = set;
        return get;
      },
      check({ label, value, onChange }) {
        const w = document.createElement("label");
        w.className = "check";
        w.innerHTML = `<input type="checkbox"${value ? " checked" : ""}> <span>${label}</span>`;
        const input = w.querySelector("input");
        input.addEventListener("change", () => onChange && onChange(input.checked));
        controls.appendChild(w);
        btnRow = null;
        const get = () => input.checked;
        get.set = (v, fire = true) => { input.checked = v; if (fire && onChange) onChange(v); };
        return get;
      },
      text({ label, value, onInput }) {
        const input = document.createElement("input");
        Object.assign(input, { type: "text", id: nid(), value: value || "" });
        input.addEventListener("input", () => onInput && onInput(input.value));
        ctrlWrap(label, input, false);
        btnRow = null;
        const get = () => input.value;
        get.el = input;
        return get;
      },
      /** 버튼. 연달아 부르면 한 줄에 나란히 놓인다. */
      button(label, onClick, o = {}) {
        if (!btnRow) { btnRow = document.createElement("div"); btnRow.className = "ctrl-row"; controls.appendChild(btnRow); }
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn" + (o.primary ? " primary" : "");
        b.textContent = label;
        b.addEventListener("click", () => onClick(b));
        btnRow.appendChild(b);
        return b;
      },
      /** 수치 판독 칸. S.stats([{k:'loss', label:'손실'}]) → set('loss', '0.12') */
      stats(list) {
        if (!readout) { readout = document.createElement("div"); readout.className = "sim-readout"; el.insertBefore(readout, el.querySelector(".sim-note")); }
        const map = {};
        list.forEach((s) => {
          const d = document.createElement("div");
          d.className = "stat";
          d.innerHTML = `<span class="k">${s.label}</span><span class="v">—</span>`;
          readout.appendChild(d);
          map[s.k] = d.querySelector(".v");
        });
        return (k, html) => { if (map[k]) map[k].innerHTML = html; };
      },
      /** 범례 (보기 영역 위쪽). items: [{label, color, dash, dot}] */
      legend(items, parent) {
        if (!legendEl) { legendEl = document.createElement("div"); legendEl.className = "legend"; (parent || view).prepend(legendEl); }
        const paint = () => {
          const P = VZ.palette();
          legendEl.innerHTML = items.map((it) => {
            const c = typeof it.color === "function" ? it.color(P) : it.color;
            return `<span><i class="${it.dot ? "dot" : it.dash ? "dash" : ""}" style="${it.dash ? `border-color:${c}` : `background:${c}`}"></i>${it.label}</span>`;
          }).join("");
        };
        paint();
        VZ.onTheme(paint);
        return legendEl;
      },
      note(html) {
        let n = el.querySelector(".sim-note");
        if (!n) { n = document.createElement("div"); n.className = "sim-note"; el.appendChild(n); }
        n.innerHTML = html;
      },
      loop: (fn) => VZ.loop(el, fn),
      /** 3D 보기 영역 준비 → Promise<T> (VZ.three 참고) */
      three(o = {}) {
        view.classList.add("three");
        if (o.height) view.style.height = o.height + "px";
        const ld = document.createElement("div");
        ld.className = "loading";
        ld.textContent = "3D 엔진(three.js) 불러오는 중…";
        view.appendChild(ld);
        return VZ.three(view, o).then((T) => {
          ld.remove();
          if (o.hint !== false) { const h = document.createElement("span"); h.className = "hint"; h.textContent = o.hint || "드래그: 회전 · 휠: 확대"; view.appendChild(h); }
          return T;
        }, (err) => { ld.textContent = "3D 엔진을 불러오지 못했습니다 (인터넷 연결 확인)."; throw err; });
      },
    };
    return S;
  }

  /**
   * 요소 하나를 실험 카드로 만든다. 지연 로딩 여부는 opts.lazy(기본 true)
   *   Lab.mount(el, "optimizers", { title, note, noLink, lazy })
   */
  Lab.mount = (el, id, opts = {}) => {
    const def = defs[id];
    if (!def) {
      el.classList.add("sim");
      el.innerHTML = `<div class="sim-head"><span class="sim-tag">?</span><h3>등록되지 않은 실험: ${String(id).replace(/</g, "&lt;")}</h3></div><div class="sim-note">assets/sims/*.js에 이 id가 있는지 확인하세요.</div>`;
      return;
    }
    build(el, def, opts);
    if (opts.note || def.note) {
      const n = document.createElement("div");
      n.className = "sim-note";
      n.innerHTML = opts.note || def.note;
      el.appendChild(n);
    }
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      const S = scaffold(el, def, opts);
      try { def.mount(S); }
      catch (e) { console.error(e); S.view.innerHTML = `<div class="loading">실험을 실행하지 못했습니다: ${e.message}</div>`; }
    };
    if (opts.lazy === false || !window.IntersectionObserver) run();
    else {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); run(); } }, { rootMargin: "400px 0px" });
      io.observe(el);
    }
  };

  /** 페이지 안의 모든 [data-sim] 자리를 실험 카드로 */
  Lab.mountAll = (root = document) => {
    root.querySelectorAll("[data-sim]:not([data-sim-ready])").forEach((el) => {
      el.dataset.simReady = "1";
      Lab.mount(el, el.dataset.sim, { title: el.dataset.title, note: el.dataset.note });
    });
  };
  document.addEventListener("DOMContentLoaded", () => Lab.mountAll());
})();
