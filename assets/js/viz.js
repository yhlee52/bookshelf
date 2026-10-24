/* ==========================================================================
   VZ — 시각화 도구 상자
   - 수학: clamp/lerp/map, 시드 난수(rng), 정규분포(randn), 숫자 포맷
   - 색: CSS 변수 읽기, 팔레트, 투명도, 컬러맵(viridis·diverging)
   - 캔버스: HiDPI 자동 리사이즈, 보일 때만 도는 애니메이션 루프, 드래그
   - 차트: 축·눈금·격자·선/막대/산점도·기준선을 한 번에 그리는 VZ.chart
   - 3D: three.js를 필요할 때만 CDN에서 불러오는 VZ.three
   ========================================================================== */
(function () {
  "use strict";
  const VZ = (window.VZ = {});

  /* ------------------------------------------------------------ 수학 */
  VZ.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  VZ.lerp = (a, b, t) => a + (b - a) * t;
  VZ.map = (x, a, b, c, d) => c + ((x - a) * (d - c)) / (b - a);
  VZ.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  /** 시드 고정 난수 (mulberry32). 같은 시드 → 같은 그림 */
  VZ.rng = (seed = 1) => {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  VZ.randn = (rand = Math.random) => {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  VZ.fmt = (x, d = 3) => {
    if (!isFinite(x)) return "—";
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return x.toExponential(Math.max(0, d - 1)).replace("e+", "e");
    return Number(x.toPrecision(d)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  VZ.mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  VZ.std = (a) => { const m = VZ.mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length || 1)); };

  /* ------------------------------------------------------------ 색 */
  VZ.color = (name) => getComputedStyle(document.body).getPropertyValue("--" + name).trim();
  VZ.font = (px = 12, mono = true, weight = "") => `${weight ? weight + " " : ""}${px}px ${getComputedStyle(document.body).getPropertyValue(mono ? "--mono" : "--font")}`;
  VZ.palette = () => {
    const c = VZ.color;
    return {
      bg: c("canvas-bg"), text: c("text"), dim: c("text-dim"), faint: c("text-faint"),
      grid: c("grid"), axis: c("axis"), border: c("border"), surface: c("surface"), elev: c("bg-elev"),
      accent: c("accent"), accent2: c("accent-2"), ok: c("ok"), warn: c("warn"), bad: c("bad"),
      series: [c("accent"), c("accent-2"), c("warn"), c("ok"), c("bad"), c("text-dim")],
      dark: document.documentElement.dataset.theme === "dark",
    };
  };
  /** '#rgb' | '#rrggbb' | 'rgb(...)' → [r,g,b] */
  VZ.parse = (col) => {
    col = (col || "").trim();
    if (col[0] === "#") {
      let h = col.slice(1);
      if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
      const n = parseInt(h.slice(0, 6), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = col.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
  };
  VZ.alpha = (col, a) => { const [r, g, b] = VZ.parse(col); return `rgba(${r},${g},${b},${a})`; };
  VZ.mix = (c1, c2, t) => { const a = VZ.parse(c1), b = VZ.parse(c2); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`; };
  const stops = (arr) => (t) => {
    t = VZ.clamp(t, 0, 1) * (arr.length - 1);
    const i = Math.min(arr.length - 2, Math.floor(t)), f = t - i;
    return arr[i].map((v, k) => Math.round(v + (arr[i + 1][k] - v) * f));
  };
  /** 0..1 → [r,g,b] 순차 컬러맵 */
  VZ.viridis = stops([[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142], [31, 158, 137], [53, 183, 121], [110, 206, 88], [181, 222, 43], [253, 231, 37]]);
  VZ.magma = stops([[0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129], [181, 54, 122], [229, 80, 100], [251, 135, 97], [254, 194, 135], [252, 253, 191]]);
  /** -1..1 → 파랑-흰색-빨강 발산 컬러맵 (다크 모드면 가운데가 어둡다) */
  VZ.diverge = (t, dark) => {
    const mid = dark ? [24, 30, 44] : [247, 247, 247];
    const lo = [33, 102, 172], hi = [214, 64, 54];
    t = VZ.clamp(t, -1, 1);
    const end = t < 0 ? lo : hi, f = Math.abs(t);
    return mid.map((v, k) => Math.round(v + (end[k] - v) * f));
  };
  VZ.rgb = (a, alpha = 1) => (alpha === 1 ? `rgb(${a[0]},${a[1]},${a[2]})` : `rgba(${a[0]},${a[1]},${a[2]},${alpha})`);

  /** 테마가 바뀌면 다시 그리기 */
  VZ.onTheme = (cb) => window.addEventListener("ls:theme", () => requestAnimationFrame(() => { try { cb(); } catch (e) { console.error(e); } }));

  /* ------------------------------------------------------------ 캔버스 */
  /**
   * HiDPI 캔버스. 폭은 부모를 따르고 높이는 aspect(높이/폭)·height·min/maxHeight로 정한다.
   *   const cv = VZ.canvas(el, (ctx, w, h) => {...}, { aspect: 0.5, maxHeight: 420 });
   *   cv.redraw();  cv.w, cv.h, cv.ctx
   */
  VZ.canvas = (canvas, draw, opts = {}) => {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const ctx = canvas.getContext("2d");
    const st = { ctx, w: 0, h: 0, canvas, dpr: 1, draw };
    // 첫 그리기는 마이크로태스크로 미룬다: 실험의 mount()가 끝까지 실행되어
    // draw가 참조하는 변수들이 모두 초기화된 뒤에 그리게 하기 위해서다.
    let ready = false;
    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = Math.max(200, Math.floor(parent.clientWidth || 600));
      let h = opts.height || Math.round(w * (opts.aspect || 0.5));
      if (opts.minHeight) h = Math.max(h, opts.minHeight);
      if (opts.maxHeight) h = Math.min(h, opts.maxHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      st.w = w; st.h = h; st.dpr = dpr;
      if (opts.onResize) opts.onResize(w, h);
      st.redraw();
    }
    st.redraw = () => {
      if (!st.w || !ready) return;
      ctx.save();
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      if (!opts.noClear) {
        ctx.clearRect(0, 0, st.w, st.h);
        ctx.fillStyle = VZ.color("canvas-bg");
        ctx.fillRect(0, 0, st.w, st.h);
      }
      try { st.draw && st.draw(ctx, st.w, st.h); } finally { ctx.restore(); }
    };
    st.resize = resize;
    if (window.ResizeObserver) {
      let lastW = -1;
      new ResizeObserver(() => { if (!canvas.parentElement) return; const w = canvas.parentElement.clientWidth; if (w !== lastW) { lastW = w; resize(); } }).observe(canvas.parentElement);
    } else window.addEventListener("resize", resize);
    VZ.onTheme(st.redraw);
    resize();
    queueMicrotask(() => { ready = true; st.redraw(); });
    return st;
  };

  /**
   * 화면에 보일 때만 도는 애니메이션 루프. fn(dt초, t초)
   *   const loop = VZ.loop(el, (dt, t) => {...});  loop.stop(); loop.start(); loop.toggle()
   */
  VZ.loop = (el, fn) => {
    let raf = 0, last = 0, t = 0, visible = true, running = true;
    function frame(ts) {
      raf = 0;
      if (!running || !visible) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts; t += dt;
      try { fn(dt, t); } catch (e) { console.error(e); running = false; return; }
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && running && visible) { last = 0; raf = requestAnimationFrame(frame); } }
    if (window.IntersectionObserver && el) new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(el);
    if (document.hidden !== undefined) document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
    kick();
    return {
      start() { running = true; kick(); },
      stop() { running = false; },
      get running() { return running; },
      toggle() { running ? (running = false) : ((running = true), kick()); return running; },
    };
  };

  /**
   * 포인터 드래그 도우미. 좌표는 CSS px(캔버스 왼쪽 위 기준).
   *   VZ.drag(canvas, { down(p, e){ return true면 드래그 시작 }, move(p), up(p), hover(p) })
   */
  VZ.drag = (el, h) => {
    let active = false;
    const pos = (e) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    el.addEventListener("pointerdown", (e) => {
      const p = pos(e);
      if (h.down && h.down(p, e) === false) return;
      active = true;
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    el.addEventListener("pointermove", (e) => {
      const p = pos(e);
      if (active) h.move && h.move(p, e);
      else h.hover && h.hover(p, e);
    });
    const end = (e) => { if (!active) return; active = false; h.up && h.up(pos(e), e); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", (e) => { if (!active && h.leave) h.leave(e); });
  };

  /** 화살표 */
  VZ.arrow = (ctx, x0, y0, x1, y1, head = 8) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4));
    ctx.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
  };

  /* ------------------------------------------------------------ 차트 */
  const niceTicks = (a, b, n = 5) => {
    const span = b - a;
    if (!(span > 0)) return [a];
    const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n + 0.5) || raw;
    const out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
    return out;
  };
  const defFmt = (v) => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(0).replace("e+", "e") : String(Number(v.toPrecision(4))));
  /**
   * 좌표축이 있는 차트. box를 생략하면 캔버스 전체에 여백을 두고 그린다.
   * opts: { x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xTicks, yTicks, xFmt, yFmt, noGrid, title,
   *         series:[{ data:[[x,y],...], type:'line'|'bar'|'scatter'|'step', color, width, dash, fill, r, alpha, label }],
   *         vlines:[{x,color,label,dash}], hlines:[{y,color,label,dash}], bands:[{x0,x1,color}], hbands:[{y0,y1,color}],
   *         points:[{x,y,color,r,label}], texts:[{x,y,text,color,align}] }
   * 반환: { X(v)→px, Y(v)→px, iX(px)→v, iY(px)→v, box }
   */
  VZ.chart = (ctx, box, o) => {
    const P = VZ.palette();
    const dpr = (ctx.getTransform && ctx.getTransform().a) || 1;
    const W = ctx.canvas.width / dpr, H = ctx.canvas.height / dpr;
    if (!box) box = { x: 0, y: 0, w: W, h: H };
    const m = Object.assign({ l: o.yLabel ? 54 : 44, r: 12, t: o.title ? 24 : 12, b: o.xLabel ? 40 : 24 }, o.margin || {});
    const B = { x: box.x + m.l, y: box.y + m.t, w: box.w - m.l - m.r, h: box.h - m.t - m.b };
    const [x0, x1] = o.x, [y0, y1] = o.y;
    const lx = (v) => (o.logX ? Math.log10(v) : v), ly = (v) => (o.logY ? Math.log10(v) : v);
    const X = (v) => B.x + ((lx(v) - lx(x0)) / (lx(x1) - lx(x0))) * B.w;
    const Y = (v) => B.y + B.h - ((ly(v) - ly(y0)) / (ly(y1) - ly(y0))) * B.h;
    const iX = (px) => { const t = lx(x0) + ((px - B.x) / B.w) * (lx(x1) - lx(x0)); return o.logX ? Math.pow(10, t) : t; };
    const iY = (py) => { const t = ly(y0) + ((B.y + B.h - py) / B.h) * (ly(y1) - ly(y0)); return o.logY ? Math.pow(10, t) : t; };
    const logTicks = (a, b) => { const out = []; for (let e = Math.ceil(Math.log10(a) - 1e-9); e <= Math.log10(b) + 1e-9; e++) out.push(Math.pow(10, e)); return out; };
    const xFmt = o.xFmt || defFmt, yFmt = o.yFmt || defFmt;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = VZ.font(10.5);
    (o.bands || []).forEach((b) => { ctx.fillStyle = b.color || VZ.alpha(P.accent, 0.08); ctx.fillRect(X(b.x0), B.y, X(b.x1) - X(b.x0), B.h); });
    (o.hbands || []).forEach((b) => { ctx.fillStyle = b.color || VZ.alpha(P.accent, 0.08); ctx.fillRect(B.x, Y(b.y1), B.w, Y(b.y0) - Y(b.y1)); });
    const xt = o.xTicks || (o.logX ? logTicks(x0, x1) : niceTicks(x0, x1, Math.max(2, Math.round(B.w / 90))));
    const yt = o.yTicks || (o.logY ? logTicks(y0, y1) : niceTicks(y0, y1, Math.max(2, Math.round(B.h / 50))));
    ctx.strokeStyle = P.grid; ctx.fillStyle = P.dim;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach((v) => { const px = X(v); if (px < B.x - 1 || px > B.x + B.w + 1) return; if (!o.noGrid) { ctx.beginPath(); ctx.moveTo(px, B.y); ctx.lineTo(px, B.y + B.h); ctx.stroke(); } ctx.fillText(xFmt(v), px, B.y + B.h + 5); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yt.forEach((v) => { const py = Y(v); if (py < B.y - 1 || py > B.y + B.h + 1) return; if (!o.noGrid) { ctx.beginPath(); ctx.moveTo(B.x, py); ctx.lineTo(B.x + B.w, py); ctx.stroke(); } ctx.fillText(yFmt(v), B.x - 6, py); });
    ctx.strokeStyle = P.axis;
    ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(B.x, B.y + B.h); ctx.lineTo(B.x + B.w, B.y + B.h); ctx.stroke();
    ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false);
    if (o.xLabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(o.xLabel, B.x + B.w / 2, box.y + box.h - 2); }
    if (o.yLabel) { ctx.save(); ctx.translate(box.x + 12, B.y + B.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.yLabel, 0, 0); ctx.restore(); }
    if (o.title) { ctx.fillStyle = P.text; ctx.font = VZ.font(12.5, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(o.title, B.x, box.y + 4); }
    ctx.save(); ctx.beginPath(); ctx.rect(B.x, B.y - 2, B.w + 2, B.h + 4); ctx.clip();
    const base = Y(o.logY ? y0 : VZ.clamp(0, y0, y1));
    (o.series || []).forEach((s, i) => {
      const d = s.data || [];
      if (!d.length) return;
      const col = s.color || P.series[i % P.series.length];
      ctx.globalAlpha = s.alpha == null ? 1 : s.alpha;
      if (s.type === "bar") {
        ctx.fillStyle = col;
        const bw = s.barWidth != null ? Math.abs(X(d[0][0] + s.barWidth) - X(d[0][0])) : Math.max(1, (B.w / d.length) * 0.8);
        const off = s.offset || 0;
        d.forEach(([x, y]) => { const px = X(x) + off * bw, py = Y(y); ctx.fillRect(px - bw / 2, Math.min(py, base), bw, Math.abs(base - py)); });
      } else if (s.type === "scatter") {
        ctx.fillStyle = col;
        const r = s.r || 2.5;
        d.forEach(([x, y, c]) => { if (!isFinite(y)) return; if (c) ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(x), Y(y), r, 0, 7); ctx.fill(); });
      } else {
        ctx.strokeStyle = col; ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []); ctx.lineJoin = "round";
        ctx.beginPath();
        let started = false, prevY = 0;
        d.forEach(([x, y]) => {
          if (!isFinite(y) || (o.logY && y <= 0) || (o.logX && x <= 0)) { started = false; return; }
          const px = X(x), py = Y(y);
          if (!started) { ctx.moveTo(px, py); started = true; }
          else if (s.type === "step") { ctx.lineTo(px, prevY); ctx.lineTo(px, py); }
          else ctx.lineTo(px, py);
          prevY = py;
        });
        ctx.stroke();
        ctx.setLineDash([]);
        if (s.fill) {
          ctx.lineTo(X(d[d.length - 1][0]), base); ctx.lineTo(X(d[0][0]), base); ctx.closePath();
          ctx.fillStyle = s.fill === true ? VZ.alpha(col, 0.15) : s.fill; ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    });
    (o.vlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(X(l.x), B.y); ctx.lineTo(X(l.x), B.y + B.h); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.font = VZ.font(11); ctx.textAlign = l.align || "left"; ctx.textBaseline = "top"; ctx.fillText(l.label, X(l.x) + (l.align === "right" ? -4 : 4), B.y + 3); } });
    (o.hlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(B.x, Y(l.y)); ctx.lineTo(B.x + B.w, Y(l.y)); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.font = VZ.font(11); ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(l.label, B.x + B.w - 4, Y(l.y) - 3); } });
    (o.points || []).forEach((p) => { ctx.fillStyle = p.color || P.accent; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r || 4, 0, 7); ctx.fill(); if (p.label) { ctx.fillStyle = P.text; ctx.font = VZ.font(11); ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(p.label, X(p.x) + 6, Y(p.y) - 4); } });
    (o.texts || []).forEach((t) => { ctx.fillStyle = t.color || P.dim; ctx.font = VZ.font(t.size || 11, !t.sans); ctx.textAlign = t.align || "left"; ctx.textBaseline = t.baseline || "middle"; ctx.fillText(t.text, X(t.x), Y(t.y)); });
    ctx.restore();
    ctx.restore();
    return { X, Y, iX, iY, box: B };
  };

  /**
   * 2D 스칼라 장을 이미지로 그린다. valueAt(i, j) → 값, cmap(값) → [r,g,b]
   * smooth=false면 픽셀이 또렷한 격자로 보인다(이징 모형, 합성곱 등).
   */
  const buffers = {};
  VZ.field = (ctx, x, y, w, h, nx, ny, valueAt, cmap, smooth = true) => {
    const key = nx + "x" + ny;
    let B = buffers[key];
    if (!B) {
      const c = document.createElement("canvas");
      c.width = nx; c.height = ny;
      const cx = c.getContext("2d");
      B = buffers[key] = { c, cx, img: cx.createImageData(nx, ny) };
    }
    const data = B.img.data;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const col = cmap(valueAt(i, j)), k = (j * nx + i) * 4;
      data[k] = col[0]; data[k + 1] = col[1]; data[k + 2] = col[2]; data[k + 3] = col[3] == null ? 255 : col[3];
    }
    B.cx.putImageData(B.img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = smooth;
    ctx.drawImage(B.c, x, y, w, h);
    ctx.restore();
  };

  /**
   * 등고선 (marching squares). v는 길이 nx*ny 배열(행 우선),
   * X(i)·Y(j)는 격자 좌표(소수 가능) → 화면 px. 선 스타일은 미리 ctx에 지정.
   */
  VZ.contour = (ctx, nx, ny, v, level, X, Y) => {
    ctx.beginPath();
    const pts = [];
    const edge = (p, q, xp, yp, xq, yq) => {
      if ((p > level) !== (q > level)) { const t = (level - p) / (q - p); pts.push(xp + (xq - xp) * t, yp + (yq - yp) * t); }
    };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
      pts.length = 0;
      edge(a, b, i, j, i + 1, j); edge(b, c, i + 1, j, i + 1, j + 1); edge(c, d, i + 1, j + 1, i, j + 1); edge(d, a, i, j + 1, i, j);
      for (let k = 0; k + 3 < pts.length; k += 4) { ctx.moveTo(X(pts[k]), Y(pts[k + 1])); ctx.lineTo(X(pts[k + 2]), Y(pts[k + 3])); }
    }
    ctx.stroke();
  };

  /** 이산 범주 색 (라이트·다크 모두에서 읽히는 Tableau 10 계열) */
  VZ.cat = ["#e15759", "#4e79a7", "#f28e2b", "#59a14f", "#b07aa1", "#76b7b2", "#edc948", "#ff9da7", "#9c755f", "#bab0ac"];

  /* ------------------------------------------------------------ 외부 스크립트 */
  const loaded = {};
  VZ.load = (src) => (loaded[src] = loaded[src] || new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = false;
    s.onload = res; s.onerror = () => rej(new Error("load failed: " + src));
    document.head.appendChild(s);
  }));
  const THREE_SRC = "https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js";
  const ORBIT_SRC = "https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js";
  VZ.loadThree = () => VZ.load(THREE_SRC).then(() => VZ.load(ORBIT_SRC)).then(() => window.THREE);

  /**
   * three.js 씬 준비. 조명, 궤도 컨트롤, 리사이즈, 화면 밖 일시정지, HTML 라벨 포함.
   *   VZ.three(el, { camera:[x,y,z], target:[x,y,z], fov, autoRotate, controls:true }).then(T => {
   *     T.scene, T.camera, T.THREE;  T.onFrame((dt, t) => {...});  T.label('텍스트', [x,y,z]);
   *   })
   */
  VZ.three = (container, opts = {}) => VZ.loadThree().then((THREE) => {
    const w0 = container.clientWidth || 600, h0 = container.clientHeight || 400;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w0, h0);
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(opts.fov || 40, w0 / h0, 0.05, 2000);
    camera.position.set(...(opts.camera || [6, 5, 8]));
    const target = new THREE.Vector3(...(opts.target || [0, 0, 0]));
    let controls = null;
    if (opts.controls !== false && THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.target.copy(target);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = !!opts.autoRotate;
      controls.autoRotateSpeed = opts.autoRotateSpeed || 0.8;
      controls.enablePan = opts.pan !== false;
      if (opts.minDistance) controls.minDistance = opts.minDistance;
      if (opts.maxDistance) controls.maxDistance = opts.maxDistance;
      controls.update();
    } else camera.lookAt(target);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.75));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.75); d1.position.set(5, 10, 7); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(-6, 4, -5); scene.add(d2);

    const labels = [];
    const frames = [];
    const T = {
      THREE, scene, camera, renderer, controls,
      onFrame: (fn) => frames.push(fn),
      material: (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.5, metalness: 0.1 }, o)),
      color: (name) => new THREE.Color(VZ.color(name) || "#888"),
      label(text, pos, cls) {
        const el = document.createElement("div");
        el.className = "overlay-label" + (cls ? " " + cls : "");
        el.textContent = text;
        container.appendChild(el);
        const L = { el, pos: Array.isArray(pos) ? new THREE.Vector3(...pos) : pos };
        labels.push(L);
        return L;
      },
    };
    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(container);
    const v = new THREE.Vector3();
    T.loop = VZ.loop(container, (dt, t) => {
      frames.forEach((fn) => fn(dt, t));
      if (controls) controls.update();
      renderer.render(scene, camera);
      const w = container.clientWidth, h = container.clientHeight;
      labels.forEach((L) => {
        v.copy(L.pos).project(camera);
        const hidden = v.z > 1;
        L.el.style.display = hidden ? "none" : "";
        L.el.style.left = ((v.x + 1) / 2) * w + "px";
        L.el.style.top = ((1 - v.y) / 2) * h + "px";
      });
    });
    return T;
  });
})();
