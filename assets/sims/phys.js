/* ==========================================================================
   물리 실험 모음 (field: "phys")
   projectile · pendulum · oscillator · orbit · waves · double-slit · efield
   random-walk · heat · ising · double-pendulum · lorenz3d · qm-packet
   ========================================================================== */
(function () {
  "use strict";
  const TAU = Math.PI * 2;
  /** 고전 4차 룽게-쿠타. f(state) → 도함수 배열 */
  function rk4(f, y, dt) {
    const k1 = f(y), y2 = y.map((v, i) => v + (dt / 2) * k1[i]);
    const k2 = f(y2), y3 = y.map((v, i) => v + (dt / 2) * k2[i]);
    const k3 = f(y3), y4 = y.map((v, i) => v + dt * k3[i]);
    const k4 = f(y4);
    return y.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  function wl2rgb(nm) {
    let r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
    else r = 1;
    const f = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1;
    return [r, g, b].map((c) => Math.round(255 * Math.pow(Math.max(0, c * f), 0.8)));
  }

  /* ======================================================================
     1. 포물선 운동과 공기 저항
     ====================================================================== */
  Lab.register({
    id: "projectile", field: "phys", thumb: "curve",
    title: "포물선 운동 — 공기 저항이 바꾸는 것",
    desc: "발사 속도와 각도, 공기 저항을 바꿔 진공에서의 포물선과 실제 궤적을 비교합니다. 최적 발사각도 계산합니다.",
    tags: ["역학", "포물선", "공기 저항", "RK4"],
    note: "해볼 것: 진공에서는 45°가 최적이지만, 저항(v²에 비례)이 있으면 최적 각도가 45°보다 작아지고 궤적이 비대칭이 됩니다. 저항이 크면 공이 거의 수직으로 떨어지는 '종단 속도' 구간도 보입니다.",
    mount(S) {
      const G = { earth: 9.81, moon: 1.62, mars: 3.71, jupiter: 24.79 };
      const st = { v0: 30, ang: 45, k: 0.01, g: 9.81, t: 0 };
      function sim(ang, k, dt = 0.005) {
        const a = (ang * Math.PI) / 180;
        let y = [0, 0, st.v0 * Math.cos(a), st.v0 * Math.sin(a)];
        const path = [[0, 0, 0]];
        const f = ([, , vx, vy]) => { const v = Math.hypot(vx, vy); return [vx, vy, -k * v * vx, -st.g - k * v * vy]; };
        for (let i = 1; i < 200000; i++) {
          const n = rk4(f, y, dt);
          if (n[1] < 0) { const fr = y[1] / (y[1] - n[1]); path.push([y[0] + (n[0] - y[0]) * fr, 0, i * dt]); break; }
          y = n;
          if (i % 4 === 0) path.push([y[0], y[1], i * dt, y[2], y[3]]);
        }
        return path;
      }
      let pd = [], pv = [], opt = 45;
      function compute() {
        pd = sim(st.ang, st.k); pv = sim(st.ang, 0);
        let best = 0;
        for (let a = 5; a <= 85; a += 1) { const p = sim(a, st.k, 0.02), r = p[p.length - 1][0]; if (r > best) { best = r; opt = a; } }
      }
      compute();
      const cv = S.canvas({ aspect: 0.52, maxHeight: 380 }, (ctx) => {
        const P = VZ.palette();
        const xr = Math.max(...pv.map((p) => p[0]), ...pd.map((p) => p[0])) * 1.05 || 1, yr = Math.max(...pv.map((p) => p[1]), ...pd.map((p) => p[1])) * 1.2 || 1;
        const C = VZ.chart(ctx, null, {
          x: [0, xr], y: [0, yr], xLabel: "수평 거리 (m)", yLabel: "높이 (m)",
          series: [{ data: pv.map((p) => [p[0], p[1]]), color: P.dim, width: 1.6, dash: [6, 5] }, { data: pd.map((p) => [p[0], p[1]]), color: P.accent, width: 2.6 }],
        });
        // 0.25초마다 위치 점
        ctx.fillStyle = VZ.alpha(P.accent, 0.5);
        let next = 0.25;
        pd.forEach((p) => { if (p[2] >= next) { next += 0.25; ctx.beginPath(); ctx.arc(C.X(p[0]), C.Y(p[1]), 2.2, 0, 7); ctx.fill(); } });
        const i = Math.min(pd.length - 1, pd.findIndex((p) => p[2] >= st.t) < 0 ? pd.length - 1 : pd.findIndex((p) => p[2] >= st.t));
        const b = pd[i];
        if (b) {
          ctx.fillStyle = P.accent2; ctx.beginPath(); ctx.arc(C.X(b[0]), C.Y(b[1]), 7, 0, 7); ctx.fill();
          if (b[3] != null) { ctx.strokeStyle = P.text; ctx.fillStyle = P.text; ctx.lineWidth = 1.6; const s = 1.2; VZ.arrow(ctx, C.X(b[0]), C.Y(b[1]), C.X(b[0]) + b[3] * s, C.Y(b[1]) - b[4] * s, 7); }
        }
      });
      S.legend([{ label: "공기 저항 있음", color: (P) => P.accent }, { label: "진공 (포물선)", color: (P) => P.dim, dash: true }]);
      const set = S.stats([{ k: "r", label: "사거리" }, { k: "rv", label: "진공 사거리" }, { k: "h", label: "최고 높이" }, { k: "t", label: "비행 시간" }, { k: "o", label: "최적 각도" }]);
      function upd() {
        compute(); st.t = 0; cv.redraw();
        const last = pd[pd.length - 1];
        set("r", last[0].toFixed(1) + "<small>m</small>"); set("rv", pv[pv.length - 1][0].toFixed(1) + "<small>m</small>");
        set("h", Math.max(...pd.map((p) => p[1])).toFixed(1) + "<small>m</small>"); set("t", last[2].toFixed(2) + "<small>s</small>"); set("o", opt.toFixed(1) + "°");
      }
      S.range({ label: "발사 속도", min: 5, max: 60, step: 1, value: st.v0, fmt: (v) => v + " m/s", onInput: (v) => { st.v0 = v; upd(); } });
      S.range({ label: "발사 각도", min: 5, max: 85, step: 0.5, value: st.ang, fmt: (v) => v + "°", onInput: (v) => { st.ang = v; upd(); } });
      S.range({ label: "공기 저항 계수 k", min: 0, max: 0.05, step: 0.001, value: st.k, fmt: (v) => v.toFixed(3) + " /m", onInput: (v) => { st.k = v; upd(); } });
      S.seg({ label: "중력", options: [["earth", "지구"], ["moon", "달"], ["mars", "화성"], ["jupiter", "목성"]], value: "earth", onChange: (v) => { st.g = G[v]; upd(); } });
      S.button("다시 발사", () => (st.t = 0), { primary: true });
      S.loop((dt) => { const T = pd[pd.length - 1][2]; if (st.t <= T + 0.6) { st.t += dt * Math.max(1, T / 4); cv.redraw(); } });
      upd();
    },
  });

  /* ======================================================================
     2. 진자와 위상 공간
     ====================================================================== */
  Lab.register({
    id: "pendulum", field: "phys", thumb: "pendulum",
    title: "진자 — 작은 각 근사와 위상 공간",
    desc: "비선형 진자 방정식을 적분하며 (각도, 각속도) 위상 공간 궤적을 그립니다. 큰 진폭에서 주기가 길어지는 것을 확인합니다.",
    tags: ["진동", "위상 공간", "비선형", "에너지"],
    note: "해볼 것: 추를 마우스로 끌어 놓아 보세요. 작은 각에서는 위상 궤적이 타원이지만, 진폭이 180°에 가까워지면 분리선(separatrix) 근처로 가며 주기가 크게 늘어납니다. 반투명 진자는 작은 각 근사(sin θ ≈ θ)를 따른 결과입니다.",
    mount(S) {
      const st = { th0: 60, L: 1.5, gam: 0.05, ghost: true, drag: false };
      const g = 9.81;
      let s = [0, 0], sl = [0, 0], trail = [], t = 0, lastCross = null, period = NaN;
      const fN = ([th, w]) => [w, -(g / st.L) * Math.sin(th) - st.gam * w];
      const fL = ([th, w]) => [w, -(g / st.L) * th - st.gam * w];
      function reset() { const a = (st.th0 * Math.PI) / 180; s = [a, 0]; sl = [a, 0]; trail = []; t = 0; lastCross = null; period = NaN; }
      const ellipK = (k) => { let a = 1, b = Math.sqrt(1 - k * k); for (let i = 0; i < 20; i++) { const m = (a + b) / 2; b = Math.sqrt(a * b); a = m; } return Math.PI / (2 * a); };
      reset();
      const [left, right] = S.split(2);
      let geo = null;
      const cvP = S.canvas({ parent: left, aspect: 0.95, maxHeight: 400 }, (ctx, w, h) => {
        const P = VZ.palette(), px = w / 2, py = 30, sc = (h - 70) / 3.2;
        geo = { px, py, sc };
        ctx.strokeStyle = P.grid; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(px, py, st.L * sc, 0, Math.PI); ctx.stroke(); ctx.setLineDash([]);
        const drawP = (th, col, alpha) => {
          const x = px + st.L * sc * Math.sin(th), y = py + st.L * sc * Math.cos(th);
          ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        };
        if (st.ghost) drawP(sl[0], P.dim, 0.3);
        drawP(s[0], P.accent, 1);
        ctx.fillStyle = P.text; ctx.fillRect(px - 30, py - 4, 60, 4); ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        ctx.fillText(`θ = ${((s[0] * 180) / Math.PI).toFixed(1)}°`, 10, h - 8);
      });
      const cvF = S.canvas({ parent: right, aspect: 0.95, maxHeight: 400 }, (ctx, w, h) => {
        const P = VZ.palette(), wmax = 2.2 * Math.sqrt(g / st.L);
        const C = VZ.chart(ctx, null, { x: [-Math.PI, Math.PI], y: [-wmax, wmax], xLabel: "각도 θ (rad)", yLabel: "각속도 ω", title: "위상 공간", xTicks: [-3, -2, -1, 0, 1, 2, 3] });
        // 에너지 등고선과 분리선
        const nx = 80, ny = 60, E = new Float32Array(nx * ny);
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const th = -Math.PI + (TAU * i) / (nx - 1), om = wmax - (2 * wmax * j) / (ny - 1); E[j * nx + i] = 0.5 * om * om - (g / st.L) * Math.cos(th); }
        const X = (i) => C.X(-Math.PI + (TAU * i) / (nx - 1)), Y = (j) => C.Y(wmax - (2 * wmax * j) / (ny - 1));
        ctx.strokeStyle = VZ.alpha(P.dim, 0.2); ctx.lineWidth = 1;
        [-0.8, -0.5, -0.2, 0.3, 0.65, 1.6, 2.4].forEach((f) => VZ.contour(ctx, nx, ny, E, f * (g / st.L), X, Y));
        ctx.strokeStyle = VZ.alpha(P.accent2, 0.7); ctx.setLineDash([5, 4]); VZ.contour(ctx, nx, ny, E, g / st.L, X, Y); ctx.setLineDash([]);
        ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.beginPath();
        let prev = null;
        trail.forEach(([th, om]) => { const wr = Math.atan2(Math.sin(th), Math.cos(th)); if (prev != null && Math.abs(wr - prev) > Math.PI) ctx.moveTo(C.X(wr), C.Y(om)); else ctx.lineTo(C.X(wr), C.Y(om)); prev = wr; });
        ctx.stroke();
        const wr = Math.atan2(Math.sin(s[0]), Math.cos(s[0]));
        ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(C.X(wr), C.Y(s[1]), 5, 0, 7); ctx.fill();
      });
      const set = S.stats([{ k: "T", label: "측정 주기" }, { k: "T0", label: "작은 각 주기 2π√(L/g)" }, { k: "Tth", label: "이론 주기 (현재 진폭)" }, { k: "E", label: "역학적 에너지/m" }]);
      const th0 = S.range({ label: "처음 각도 θ₀", min: 1, max: 179, step: 1, value: st.th0, fmt: (v) => v + "°", onInput: (v) => { st.th0 = v; reset(); } });
      S.range({ label: "줄 길이 L", min: 0.3, max: 3, step: 0.1, value: st.L, fmt: (v) => v.toFixed(1) + " m", onInput: (v) => { st.L = v; reset(); } });
      S.range({ label: "감쇠 γ", min: 0, max: 1, step: 0.01, value: st.gam, fmt: (v) => v.toFixed(2) + " /s", onInput: (v) => { st.gam = v; } });
      S.check({ label: "작은 각 근사 진자 겹쳐 보기", value: true, onChange: (v) => (st.ghost = v) });
      S.button("다시 놓기", () => reset(), { primary: true });
      VZ.drag(cvP.canvas, {
        down(p) { if (!geo) return false; st.drag = true; this.move(p); },
        move(p) { const a = Math.atan2(p.x - geo.px, p.y - geo.py); st.th0 = Math.round((Math.abs(a) * 180) / Math.PI); s = [a, 0]; sl = [a, 0]; trail = []; t = 0; lastCross = null; period = NaN; th0.set(VZ.clamp(st.th0, 1, 179), false); cvP.redraw(); },
        up() { st.drag = false; },
      });
      S.loop((dt) => {
        if (!st.drag) {
          const n = 8, h = dt / n;
          for (let i = 0; i < n; i++) {
            const prev = s[0];
            s = rk4(fN, s, h); sl = rk4(fL, sl, h); t += h;
            if (prev < 0 && s[0] >= 0 && s[1] > 0) { if (lastCross != null) period = t - lastCross; lastCross = t; }
          }
          trail.push([s[0], s[1]]);
          if (trail.length > 900) trail.shift();
        }
        cvP.redraw(); cvF.redraw();
        const amp = Math.min(Math.abs((st.th0 * Math.PI) / 180), Math.PI - 1e-6);
        set("T", isFinite(period) ? period.toFixed(3) + "<small>s</small>" : "—");
        set("T0", (TAU * Math.sqrt(st.L / g)).toFixed(3) + "<small>s</small>");
        set("Tth", (4 * Math.sqrt(st.L / g) * ellipK(Math.sin(amp / 2))).toFixed(3) + "<small>s</small>");
        set("E", (0.5 * (st.L * s[1]) ** 2 + g * st.L * (1 - Math.cos(s[0]))).toFixed(2) + "<small>J/kg</small>");
      });
    },
  });

  /* ======================================================================
     3. 강제 감쇠 진동자와 공명
     ====================================================================== */
  Lab.register({
    id: "oscillator", field: "phys", thumb: "wave",
    title: "강제 진동과 공명",
    desc: "질량-용수철 계를 주기적인 힘으로 흔들 때 과도 응답이 사라지고 정상 상태가 되는 과정, 그리고 공명 곡선을 봅니다.",
    tags: ["진동", "공명", "Q 인자", "위상"],
    note: "해볼 것: 구동 주파수 ω를 고유 진동수 ω₀ 근처로 옮기면 진폭이 크게 커집니다. 감쇠 ζ를 줄이면 공명 봉우리가 높고 좁아집니다(Q = 1/2ζ). 위상 그래프에서 공명점을 지날 때 응답이 힘보다 90° 늦어지는 것도 확인하세요.",
    mount(S) {
      const st = { w0: 2, w: 1.6, z: 0.08, F: 1 };
      // 상태 [x, v, τ] — 시간 τ도 함께 적분해야 구동력이 RK4 각 단계에서 정확하다
      let y = [0, 0, 0], t = 0, hist = [];
      const f = ([x, v, tau]) => [v, st.F * Math.cos(st.w * tau) - 2 * st.z * st.w0 * v - st.w0 * st.w0 * x, 1];
      const amp = (w) => st.F / Math.sqrt((st.w0 ** 2 - w ** 2) ** 2 + (2 * st.z * st.w0 * w) ** 2);
      const phase = (w) => Math.atan2(2 * st.z * st.w0 * w, st.w0 ** 2 - w ** 2);
      function reset() { y = [0, 0, 0]; t = 0; hist = []; }
      const [left, right] = S.split(2);
      const cvT = S.canvas({ parent: left, aspect: 0.95, maxHeight: 400 }, (ctx, w, h) => {
        const P = VZ.palette(), A = Math.max(amp(st.w0) * 1.1, amp(st.w) * 1.3, 0.3);
        const top = 70, cx = w / 2, sc = (w * 0.32) / A, xm = cx + y[0] * sc;
        // 용수철과 질량
        ctx.strokeStyle = P.dim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, top - 20); ctx.lineTo(14, top + 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14, top);
        const coils = 14, x0 = 14, x1 = xm - 22;
        for (let i = 1; i <= coils; i++) ctx.lineTo(x0 + ((x1 - x0) * i) / coils, top + (i % 2 ? -9 : 9) * (i === coils ? 0 : 1));
        ctx.lineTo(x1, top); ctx.stroke();
        ctx.fillStyle = P.accent; ctx.fillRect(xm - 22, top - 20, 44, 40);
        ctx.strokeStyle = P.accent2; ctx.fillStyle = P.accent2; ctx.lineWidth = 2;
        const fx = Math.cos(st.w * t) * 30; VZ.arrow(ctx, xm, top + 32, xm + fx, top + 32, 7);
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11, false); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("구동력 F cos ωt", 10, top + 42);
        VZ.chart(ctx, { x: 0, y: top + 56, w, h: h - top - 56 }, {
          x: [Math.max(0, t - 30), Math.max(30, t)], y: [-A * 1.2, A * 1.2], xLabel: "시간 (s)", title: "변위 x(t)",
          series: [{ data: hist.map((p) => [p[0], p[2] * (A * 0.4) / st.F]), color: VZ.alpha(P.accent2, 0.45), width: 1.2 }, { data: hist.map((p) => [p[0], p[1]]), color: P.accent, width: 2 }],
        });
      });
      const cvR = S.canvas({ parent: right, aspect: 0.95, maxHeight: 400 }, (ctx, w, h) => {
        const P = VZ.palette(), ws = VZ.linspace(0.01, 5, 300), Am = Math.max(...ws.map(amp));
        VZ.chart(ctx, { x: 0, y: 0, w, h: h * 0.6 }, { x: [0, 5], y: [0, Am * 1.1], title: "공명 곡선 — 진폭 A(ω)", series: [{ data: ws.map((x) => [x, amp(x)]), color: P.accent, width: 2.4, fill: true }], vlines: [{ x: st.w0, color: P.faint, label: "ω₀" }], points: [{ x: st.w, y: amp(st.w), color: P.accent2, r: 6 }] });
        VZ.chart(ctx, { x: 0, y: h * 0.6, w, h: h * 0.4 }, { x: [0, 5], y: [0, Math.PI], xLabel: "구동 주파수 ω (rad/s)", title: "위상 지연 φ(ω)", yTicks: [0, Math.PI / 2, Math.PI], yFmt: (v) => (v < 0.1 ? "0" : v < 2 ? "π/2" : "π"), series: [{ data: ws.map((x) => [x, phase(x)]), color: P.accent2, width: 2 }], points: [{ x: st.w, y: phase(st.w), color: P.accent2, r: 5 }] });
      });
      const set = S.stats([{ k: "A", label: "정상 상태 진폭" }, { k: "ph", label: "위상 지연" }, { k: "Q", label: "Q 인자" }, { k: "wr", label: "공명 ω_r" }]);
      function upd() {
        set("A", amp(st.w).toFixed(3)); set("ph", ((phase(st.w) * 180) / Math.PI).toFixed(1) + "°"); set("Q", (1 / (2 * st.z)).toFixed(1));
        set("wr", 1 - 2 * st.z * st.z > 0 ? (st.w0 * Math.sqrt(1 - 2 * st.z * st.z)).toFixed(3) : "없음");
        cvR.redraw();
      }
      S.range({ label: "고유 진동수 ω₀", min: 0.5, max: 4, step: 0.05, value: st.w0, fmt: (v) => v.toFixed(2), onInput: (v) => { st.w0 = v; upd(); } });
      S.range({ label: "구동 주파수 ω", min: 0.1, max: 5, step: 0.02, value: st.w, fmt: (v) => v.toFixed(2), onInput: (v) => { st.w = v; upd(); } });
      S.range({ label: "감쇠비 ζ", min: 0.01, max: 1, step: 0.01, value: st.z, fmt: (v) => v.toFixed(2), onInput: (v) => { st.z = v; upd(); } });
      S.button("정지 상태에서 다시", () => reset(), { primary: true });
      S.loop((dt) => {
        const n = 10, h = dt / n;
        for (let i = 0; i < n; i++) { y = rk4(f, y, h); t = y[2]; }
        hist.push([t, y[0], Math.cos(st.w * t)]);
        while (hist.length && hist[0][0] < t - 30) hist.shift();
        cvT.redraw();
      });
      upd();
    },
  });

  /* ======================================================================
     4. 케플러 궤도
     ====================================================================== */
  Lab.register({
    id: "orbit", field: "phys", thumb: "orbit",
    title: "케플러 궤도 — 같은 시간, 같은 면적",
    desc: "중심별 주위를 도는 행성의 초기 속도를 바꿔 원·타원·포물선·쌍곡선 궤도를 만들고, 케플러 제2법칙을 확인합니다.",
    tags: ["중력", "케플러", "궤도", "각운동량"],
    note: "해볼 것: 속도를 원궤도 속도의 √2배(≈1.41)로 올리면 탈출 속도가 되어 궤도가 열립니다. 색칠된 부채꼴은 같은 시간 간격 동안 쓸고 지나간 면적인데, 가까울 때는 짧고 넓게, 멀 때는 길고 좁게 생겨도 넓이는 같습니다.",
    mount(S) {
      const st = { v: 0.75, ang: 0, speed: 3, dT: 0.4 };
      let s, trail, wedges, cur, tAcc, t;
      function reset() {
        const a = (st.ang * Math.PI) / 180;
        s = { x: 1, y: 0, vx: -st.v * Math.sin(a), vy: st.v * Math.cos(a) };
        trail = []; wedges = []; cur = [[s.x, s.y]]; tAcc = 0; t = 0;
      }
      reset();
      const acc = (x, y) => { const r3 = Math.pow(x * x + y * y, 1.5); return [-x / r3, -y / r3]; };
      function step(dt) {
        const [ax, ay] = acc(s.x, s.y);
        s.vx += (ax * dt) / 2; s.vy += (ay * dt) / 2;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const [bx, by] = acc(s.x, s.y);
        s.vx += (bx * dt) / 2; s.vy += (by * dt) / 2;
        t += dt; tAcc += dt;
        cur.push([s.x, s.y]);
        if (tAcc >= st.dT) { wedges.push(cur); if (wedges.length > 16) wedges.shift(); cur = [[s.x, s.y]]; tAcc = 0; }
      }
      const elems = () => {
        const r = Math.hypot(s.x, s.y), v2 = s.vx ** 2 + s.vy ** 2, E = v2 / 2 - 1 / r, h = s.x * s.vy - s.y * s.vx;
        const rv = s.x * s.vx + s.y * s.vy, ex = (v2 - 1 / r) * s.x - rv * s.vx, ey = (v2 - 1 / r) * s.y - rv * s.vy;
        const e = Math.hypot(ex, ey), a = E < 0 ? -1 / (2 * E) : Infinity;
        return { r, E, h, e, ex, ey, a, P: E < 0 ? TAU * Math.pow(a, 1.5) : Infinity };
      };
      const area = (poly) => { let A = 0; for (let i = 1; i < poly.length; i++) A += poly[i - 1][0] * poly[i][1] - poly[i][0] * poly[i - 1][1]; return Math.abs(A) / 2; };
      const cv = S.canvas({ aspect: 0.7, maxHeight: 460 }, (ctx, w, h) => {
        const P = VZ.palette(), el = elems();
        // 묶인 궤도는 타원의 중심(초점에서 −a·e 벡터)을 화면 가운데에 둔다
        const bound = el.E < 0 && el.a < 9;
        const span = bound ? Math.max(el.a * 1.12, 1.2) : 3.5;
        const ccx = bound ? -el.a * el.ex : 0, ccy = bound ? -el.a * el.ey : 0;
        const sc = Math.min(w, h) / (2 * span);
        const X = (x) => w / 2 + (x - ccx) * sc, Y = (y) => h / 2 - (y - ccy) * sc;
        wedges.forEach((poly, i) => {
          ctx.fillStyle = VZ.alpha(i % 2 ? P.accent : P.accent2, 0.22);
          ctx.beginPath(); ctx.moveTo(X(0), Y(0)); poly.forEach(([x, y]) => ctx.lineTo(X(x), Y(y))); ctx.closePath(); ctx.fill();
        });
        ctx.strokeStyle = VZ.alpha(P.dim, 0.7); ctx.lineWidth = 1.4; ctx.beginPath();
        trail.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
        const grd = ctx.createRadialGradient(X(0), Y(0), 2, X(0), Y(0), 22);
        grd.addColorStop(0, "#fff6c8"); grd.addColorStop(0.4, "#f5b93a"); grd.addColorStop(1, "rgba(245,185,58,0)");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(X(0), Y(0), 22, 0, 7); ctx.fill();
        ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(X(s.x), Y(s.y), 7, 0, 7); ctx.fill();
        ctx.strokeStyle = P.text; ctx.fillStyle = P.text; ctx.lineWidth = 1.6;
        VZ.arrow(ctx, X(s.x), Y(s.y), X(s.x + s.vx * 0.5), Y(s.y + s.vy * 0.5), 7);
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11.5, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`t = ${t.toFixed(1)} · 부채꼴 하나 = Δt ${st.dT}`, 10, 8);
      });
      const set = S.stats([{ k: "type", label: "궤도" }, { k: "e", label: "이심률 e" }, { k: "P", label: "주기" }, { k: "E", label: "에너지" }, { k: "A", label: "부채꼴 면적 편차" }]);
      function readouts() {
        const el = elems();
        set("type", el.r <= 0.02 ? '<span style="color:var(--bad)">충돌</span>' : el.E >= 0 ? (el.e > 1.01 ? "쌍곡선 (탈출)" : "포물선") : el.e < 0.02 ? "원" : "타원");
        set("e", el.e.toFixed(3)); set("P", isFinite(el.P) ? el.P.toFixed(2) : "∞"); set("E", el.E.toFixed(3));
        if (wedges.length > 2) { const A = wedges.map(area), m = VZ.mean(A); set("A", ((VZ.std(A) / m) * 100).toFixed(2) + "<small>%</small>"); }
      }
      S.range({ label: "속도 / 원궤도 속도", min: 0.3, max: 1.6, step: 0.01, value: st.v, fmt: (v) => v.toFixed(2), onInput: (v) => { st.v = v; reset(); } });
      S.range({ label: "발사 방향 (접선 기준)", min: -60, max: 60, step: 1, value: st.ang, fmt: (v) => v + "°", onInput: (v) => { st.ang = v; reset(); } });
      S.range({ label: "부채꼴 시간 간격 Δt", min: 0.1, max: 1.5, step: 0.05, value: st.dT, fmt: (v) => v.toFixed(2), onInput: (v) => { st.dT = v; wedges = []; } });
      S.range({ label: "재생 속도", min: 1, max: 10, step: 1, value: st.speed, onInput: (v) => (st.speed = v) });
      S.button("다시 출발", () => reset(), { primary: true });
      S.loop((dt) => {
        const n = 20 * st.speed, h = (dt * st.speed * 0.6) / n;
        for (let i = 0; i < n; i++) if (Math.hypot(s.x, s.y) > 0.02 && Math.hypot(s.x, s.y) < 40) step(h);
        trail.push([s.x, s.y]); if (trail.length > 3000) trail.shift();
        cv.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     5. 파동의 중첩
     ====================================================================== */
  Lab.register({
    id: "waves", field: "phys", thumb: "wave",
    title: "파동의 중첩 — 정상파, 맥놀이, 간섭",
    desc: "두 사인파를 더해 정상파(마디와 배), 맥놀이, 보강·상쇄 간섭을 만들어 봅니다.",
    tags: ["파동", "중첩", "정상파", "맥놀이"],
    note: "해볼 것: <b>정상파</b>는 같은 파동이 반대로 진행할 때 생기며 마디(●)는 움직이지 않습니다. <b>맥놀이</b>는 진동수가 조금 다른 두 파가 같은 방향으로 갈 때 생기는 느린 포락선입니다. 위상차를 π로 두면 같은 파가 완전히 상쇄됩니다.",
    mount(S) {
      const st = { A1: 1, A2: 1, r: 1, dir: -1, ph: 0, speed: 1, preset: "standing" };
      let t = 0;
      const k1 = TAU, w1 = TAU;
      const y1 = (x) => st.A1 * Math.sin(k1 * x - w1 * t);
      const y2 = (x) => st.A2 * Math.sin(k1 * st.r * x - st.dir * w1 * st.r * t + st.ph);
      const xs = VZ.linspace(0, 4, 500);
      const cv = S.canvas({ aspect: 0.5, maxHeight: 380 }, (ctx, w, h) => {
        const P = VZ.palette(), lim = (st.A1 + st.A2) * 1.15;
        const C = VZ.chart(ctx, null, {
          x: [0, 4], y: [-lim, lim], xLabel: "위치 x (파장 λ₁ 단위)",
          series: [{ data: xs.map((x) => [x, y1(x)]), color: VZ.alpha(P.accent, 0.4), width: 1.4 }, { data: xs.map((x) => [x, y2(x)]), color: VZ.alpha(P.accent2, 0.4), width: 1.4 }, { data: xs.map((x) => [x, y1(x) + y2(x)]), color: P.text, width: 2.8 }],
        });
        if (st.dir === -1 && st.r === 1 && Math.abs(st.A1 - st.A2) < 1e-9) {
          ctx.fillStyle = P.bad;
          // y₁+y₂ = 2A·sin(kx + φ/2)·cos(ωt + φ/2) → 마디는 x = n/2 − φ/4π (λ 단위)
          for (let n = 0; n <= 8; n++) { const x = (((n * 0.5 - st.ph / (2 * TAU)) % 4) + 4) % 4; ctx.beginPath(); ctx.arc(C.X(x), C.Y(0), 4.5, 0, 7); ctx.fill(); }
        }
      });
      S.legend([{ label: "파동 1", color: (P) => P.accent }, { label: "파동 2", color: (P) => P.accent2 }, { label: "합 y₁ + y₂", color: (P) => P.text }]);
      const set = S.stats([{ k: "max", label: "합성 최대 변위" }, { k: "beat", label: "맥놀이 진동수" }, { k: "node", label: "마디 간격" }]);
      function upd() {
        set("beat", st.dir === 1 && st.r !== 1 ? (Math.abs(1 - st.r)).toFixed(2) + "<small>f₁</small>" : "—");
        set("node", st.dir === -1 && st.r === 1 ? "λ/2" : "—");
      }
      const PRE = { standing: { r: 1, dir: -1, ph: 0, A2: 1 }, beats: { r: 1.1, dir: 1, ph: 0, A2: 1 }, construct: { r: 1, dir: 1, ph: 0, A2: 1 }, destruct: { r: 1, dir: 1, ph: Math.PI, A2: 1 } };
      let ctrls = {};
      S.seg({ label: "예시", options: [["standing", "정상파"], ["beats", "맥놀이"], ["construct", "보강 간섭"], ["destruct", "상쇄 간섭"]], value: st.preset, onChange: (v) => { Object.assign(st, PRE[v]); ctrls.r.set(st.r, false); ctrls.ph.set(st.ph, false); ctrls.A2.set(st.A2, false); ctrls.dir.set(String(st.dir), false); upd(); } });
      ctrls.A2 = S.range({ label: "파동 2 진폭", min: 0, max: 1.5, step: 0.05, value: st.A2, fmt: (v) => v.toFixed(2), onInput: (v) => { st.A2 = v; upd(); } });
      ctrls.r = S.range({ label: "파동 2 진동수 / 파동 1", min: 0.5, max: 2, step: 0.01, value: st.r, fmt: (v) => v.toFixed(2), onInput: (v) => { st.r = v; upd(); } });
      ctrls.ph = S.range({ label: "위상차", min: 0, max: TAU, step: 0.01, value: st.ph, fmt: (v) => (v / Math.PI).toFixed(2) + "π", onInput: (v) => { st.ph = v; upd(); } });
      ctrls.dir = S.seg({ label: "파동 2 진행 방향", options: [["1", "같은 방향 →"], ["-1", "반대 방향 ←"]], value: "-1", onChange: (v) => { st.dir = +v; upd(); } });
      S.range({ label: "재생 속도", min: 0, max: 2, step: 0.05, value: 1, fmt: (v) => v.toFixed(2) + "×", onInput: (v) => (st.speed = v) });
      S.loop((dt) => {
        t += dt * 0.35 * st.speed;
        cv.redraw();
        set("max", Math.max(...xs.map((x) => Math.abs(y1(x) + y2(x)))).toFixed(2));
      });
      upd();
    },
  });

  /* ======================================================================
     6. 이중 슬릿 간섭
     ====================================================================== */
  Lab.register({
    id: "double-slit", field: "phys", thumb: "heat", layout: "stack",
    title: "이중 슬릿 간섭 — 빛의 파동성",
    desc: "파장, 슬릿 간격, 슬릿 폭을 바꾸며 두 파원의 간섭 무늬와 스크린의 세기 분포를 봅니다.",
    tags: ["광학", "간섭", "회절", "파동"],
    note: "왼쪽 그림은 두 점파원에서 퍼지는 파면을 축척 없이 그린 것이고, 오른쪽 스크린과 아래 그래프는 실제 물리 값으로 계산한 I(y) = cos²(πdy/λL) · sinc²(πay/λL)입니다. 점선은 슬릿 하나의 회절 포락선입니다. 슬릿 간격 d가 클수록 무늬 간격이 좁아집니다.",
    mount(S) {
      const st = { lam: 532, d: 60, a: 12, L: 1.5 };
      let t = 0;
      const I = (y) => { const u = (Math.PI * st.d * 1e-6 * y) / (st.lam * 1e-9 * st.L), v = (Math.PI * st.a * 1e-6 * y) / (st.lam * 1e-9 * st.L); const sinc = Math.abs(v) < 1e-9 ? 1 : Math.sin(v) / v; return Math.cos(u) ** 2 * sinc ** 2; };
      const env = (y) => { const v = (Math.PI * st.a * 1e-6 * y) / (st.lam * 1e-9 * st.L); return Math.abs(v) < 1e-9 ? 1 : (Math.sin(v) / v) ** 2; };
      const Ymax = () => Math.min(0.2, 2.2 * (st.lam * 1e-9 * st.L) / (st.a * 1e-6));
      const cv = S.canvas({ aspect: 0.42, minHeight: 240, maxHeight: 380 }, (ctx, w, h) => {
        const P = VZ.palette(), col = wl2rgb(st.lam), bg = VZ.parse(P.bg);
        const fw = Math.floor(w * 0.72), nx = 150, ny = Math.round((150 * h) / fw);
        const lamPx = VZ.map(st.lam, 380, 750, 0.06, 0.12), dPx = VZ.map(st.d, 10, 200, 0.06, 0.4);
        const sy1 = 0.5 - dPx / 2, sy2 = 0.5 + dPx / 2, aspect = h / fw;
        VZ.field(ctx, 0, 0, fw, h, nx, ny, (i, j) => {
          const x = i / nx + 0.02, y = (j / ny) * aspect, k = TAU / lamPx;
          const r1 = Math.hypot(x, y - sy1 * aspect), r2 = Math.hypot(x, y - sy2 * aspect);
          return (Math.cos(k * r1 - t) / Math.sqrt(r1 + 0.05) + Math.cos(k * r2 - t) / Math.sqrt(r2 + 0.05)) / 4;
        }, (v) => { const f = Math.pow(VZ.clamp(Math.abs(v) * 0.85, 0, 1), 1.4) * 0.85; return bg.map((b, k) => Math.round(b + (col[k] - b) * f)); });
        ctx.fillStyle = P.text; ctx.fillRect(0, 0, 4, h); ctx.fillStyle = P.bg;
        [sy1, sy2].forEach((sy) => ctx.fillRect(0, sy * h - 3, 4, 6));
        // 스크린
        const sx = fw + 16, sw = w - sx - 10, ym = Ymax();
        for (let py = 0; py < h; py++) { const yv = ((py / h) * 2 - 1) * ym, v = I(yv); ctx.fillStyle = `rgb(${col.map((c) => Math.round(c * v + (P.dark ? 8 : 20) * (1 - v))).join(",")})`; ctx.fillRect(sx, py, sw, 1); }
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11, false); ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("스크린", sx + sw / 2, 4);
      });
      const cvI = S.canvas({ height: 160 }, (ctx) => {
        const P = VZ.palette(), ym = Ymax() * 1000, ys = VZ.linspace(-ym, ym, 800);
        VZ.chart(ctx, null, { x: [-ym, ym], y: [0, 1.05], xLabel: "스크린 위치 y (mm)", series: [{ data: ys.map((y) => [y, env(y / 1000)]), color: P.dim, width: 1.3, dash: [5, 4] }, { data: ys.map((y) => [y, I(y / 1000)]), color: VZ.rgb(wl2rgb(st.lam)), width: 2.2, fill: VZ.alpha(VZ.rgb(wl2rgb(st.lam)), 0.15) }] });
      });
      const set = S.stats([{ k: "dy", label: "무늬 간격 λL/d" }, { k: "c", label: "중앙 극대 폭 2λL/a" }, { k: "n", label: "포락선 안 밝은 무늬" }]);
      function upd() {
        cvI.redraw(); cv.redraw();
        set("dy", ((st.lam * 1e-9 * st.L) / (st.d * 1e-6) * 1000).toFixed(2) + "<small>mm</small>");
        set("c", ((2 * st.lam * 1e-9 * st.L) / (st.a * 1e-6) * 1000).toFixed(1) + "<small>mm</small>");
        set("n", 2 * Math.floor(st.d / st.a - 1e-9) + 1);
      }
      S.range({ label: "파장 λ", min: 380, max: 750, step: 1, value: st.lam, fmt: (v) => v + " nm", onInput: (v) => { st.lam = v; upd(); } });
      S.range({ label: "슬릿 간격 d", min: 10, max: 200, step: 1, value: st.d, fmt: (v) => v + " µm", onInput: (v) => { st.d = v; upd(); } });
      S.range({ label: "슬릿 폭 a", min: 2, max: 40, step: 0.5, value: st.a, fmt: (v) => v + " µm", onInput: (v) => { st.a = Math.min(v, st.d); upd(); } });
      S.range({ label: "스크린 거리 L", min: 0.3, max: 3, step: 0.05, value: st.L, fmt: (v) => v.toFixed(2) + " m", onInput: (v) => { st.L = v; upd(); } });
      S.loop((dt) => { t += dt * 5; cv.redraw(); });
      upd();
    },
  });

  /* ======================================================================
     7. 전기장과 전위
     ====================================================================== */
  Lab.register({
    id: "efield", field: "phys", thumb: "field",
    title: "점전하의 전기장 — 전기력선과 등전위선",
    desc: "전하를 끌어 옮기며 전기력선, 전위 지도, 등전위선이 어떻게 바뀌는지 봅니다.",
    tags: ["전자기학", "전기장", "전위", "쿨롱"],
    note: "해볼 것: 전하를 끌어 보세요. 전기력선은 +에서 나와 −로 들어가고 등전위선과 항상 수직입니다. 같은 부호 두 전하 사이에는 전기장이 0인 점이 생깁니다. 마우스를 올린 곳의 |E|와 V가 아래에 표시됩니다.",
    mount(S) {
      const PRE = {
        dipole: [{ x: -0.45, y: 0, q: 1 }, { x: 0.45, y: 0, q: -1 }],
        same: [{ x: -0.45, y: 0, q: 1 }, { x: 0.45, y: 0, q: 1 }],
        quad: [{ x: -0.4, y: -0.35, q: 1 }, { x: 0.4, y: -0.35, q: -1 }, { x: 0.4, y: 0.35, q: 1 }, { x: -0.4, y: 0.35, q: -1 }],
        uneven: [{ x: -0.4, y: 0, q: 2 }, { x: 0.5, y: 0.1, q: -1 }],
      };
      let Q = PRE.dipole.map((c) => ({ ...c }));
      const st = { lines: true, pot: true, eq: true, drag: -1 };
      const E = (x, y) => { let ex = 0, ey = 0; Q.forEach((c) => { const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy + 1e-6, r3 = r2 * Math.sqrt(r2); ex += (c.q * dx) / r3; ey += (c.q * dy) / r3; }); return [ex, ey]; };
      const V = (x, y) => Q.reduce((s, c) => s + c.q / Math.max(0.02, Math.hypot(x - c.x, y - c.y)), 0);
      let geo = null;
      const cv = S.canvas({ aspect: 0.62, maxHeight: 460 }, (ctx, w, h) => {
        const P = VZ.palette(), sc = w / 2.4, ar = h / w;
        const X = (x) => w / 2 + x * sc, Y = (y) => h / 2 - y * sc, iX = (px) => (px - w / 2) / sc, iY = (py) => (h / 2 - py) / sc;
        geo = { X, Y, iX, iY };
        const nx = 120, ny = Math.round(120 * ar), vals = new Float32Array(nx * ny);
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) vals[j * nx + i] = V(iX(((i + 0.5) / nx) * w), iY(((j + 0.5) / ny) * h));
        const sq = (v) => Math.sign(v) * Math.log1p(Math.abs(v)) / Math.log1p(30);
        if (st.pot) VZ.field(ctx, 0, 0, w, h, nx, ny, (i, j) => sq(vals[j * nx + i]), (v) => VZ.diverge(v * 0.85, P.dark));
        if (st.eq) {
          ctx.strokeStyle = VZ.alpha(P.text, 0.3); ctx.lineWidth = 1;
          [-8, -4, -2, -1, -0.5, 0.5, 1, 2, 4, 8].forEach((lv) => VZ.contour(ctx, nx, ny, vals, lv, (i) => ((i + 0.5) / nx) * w, (j) => ((j + 0.5) / ny) * h));
          ctx.setLineDash([4, 4]); ctx.strokeStyle = VZ.alpha(P.text, 0.45); VZ.contour(ctx, nx, ny, vals, 0, (i) => ((i + 0.5) / nx) * w, (j) => ((j + 0.5) / ny) * h); ctx.setLineDash([]);
        }
        if (st.lines) {
          const src = Q.some((c) => c.q > 0) ? Q.filter((c) => c.q > 0) : Q, sign = Q.some((c) => c.q > 0) ? 1 : -1;
          const xm = 1.2, ym = 1.2 * ar;
          ctx.strokeStyle = P.text; ctx.fillStyle = P.text; ctx.lineWidth = 1.2;
          src.forEach((c) => {
            const n = 10 * Math.abs(c.q);
            for (let k = 0; k < n; k++) {
              const a = (k / n) * TAU + 0.1;
              let x = c.x + 0.035 * Math.cos(a), y = c.y + 0.035 * Math.sin(a);
              ctx.beginPath(); ctx.moveTo(X(x), Y(y));
              let mid = null;
              for (let s = 0; s < 700; s++) {
                let [ex, ey] = E(x, y); let m = Math.hypot(ex, ey) || 1;
                const hx = x + sign * 0.006 * (ex / m), hy = y + sign * 0.006 * (ey / m);
                [ex, ey] = E(hx, hy); m = Math.hypot(ex, ey) || 1;
                x += sign * 0.012 * (ex / m); y += sign * 0.012 * (ey / m);
                ctx.lineTo(X(x), Y(y));
                if (s === 40) mid = [x, y, ex / m, ey / m];
                if (Math.abs(x) > xm || Math.abs(y) > ym || Q.some((o) => o !== c && Math.hypot(x - o.x, y - o.y) < 0.03)) break;
              }
              ctx.stroke();
              if (mid) { const [mx, my, ux, uy] = mid, s2 = sign; VZ.arrow(ctx, X(mx), Y(my), X(mx + s2 * ux * 0.03), Y(my + s2 * uy * 0.03), 6); }
            }
          });
        }
        Q.forEach((c) => {
          ctx.fillStyle = c.q > 0 ? "#e5484d" : "#3e63dd"; ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), 11 + 2 * Math.abs(c.q), 0, 7); ctx.fill();
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(X(c.x) - 5, Y(c.y)); ctx.lineTo(X(c.x) + 5, Y(c.y)); if (c.q > 0) { ctx.moveTo(X(c.x), Y(c.y) - 5); ctx.lineTo(X(c.x), Y(c.y) + 5); } ctx.stroke();
        });
      });
      const set = S.stats([{ k: "n", label: "전하 수 (알짜 전하)" }, { k: "E", label: "가리킨 곳 |E|" }, { k: "V", label: "가리킨 곳 V" }]);
      const upd = () => { cv.redraw(); set("n", `${Q.length} (${Q.reduce((s, c) => s + c.q, 0) > 0 ? "+" : ""}${Q.reduce((s, c) => s + c.q, 0)})`); };
      S.seg({ label: "배치", options: [["dipole", "쌍극자"], ["same", "같은 부호"], ["quad", "사중극자"], ["uneven", "+2와 −1"]], value: "dipole", onChange: (v) => { Q = PRE[v].map((c) => ({ ...c })); upd(); } });
      S.check({ label: "전기력선", value: true, onChange: (v) => { st.lines = v; upd(); } });
      S.check({ label: "전위 색 지도", value: true, onChange: (v) => { st.pot = v; upd(); } });
      S.check({ label: "등전위선", value: true, onChange: (v) => { st.eq = v; upd(); } });
      S.button("+ 전하 추가", () => { Q.push({ x: (Math.random() - 0.5) * 1.4, y: (Math.random() - 0.5) * 0.8, q: 1 }); upd(); });
      S.button("− 전하 추가", () => { Q.push({ x: (Math.random() - 0.5) * 1.4, y: (Math.random() - 0.5) * 0.8, q: -1 }); upd(); });
      VZ.drag(cv.canvas, {
        down(p) { if (!geo) return false; const i = Q.findIndex((c) => Math.hypot(geo.X(c.x) - p.x, geo.Y(c.y) - p.y) < 18); if (i < 0) return false; st.drag = i; },
        move(p) { if (st.drag < 0) return; Q[st.drag].x = VZ.clamp(geo.iX(p.x), -1.15, 1.15); Q[st.drag].y = VZ.clamp(geo.iY(p.y), -0.7, 0.7); upd(); },
        up() { st.drag = -1; },
        hover(p) { if (!geo) return; const x = geo.iX(p.x), y = geo.iY(p.y), [ex, ey] = E(x, y); set("E", VZ.fmt(Math.hypot(ex, ey), 3)); set("V", VZ.fmt(V(x, y), 3)); },
      });
      upd();
    },
  });

  /* ======================================================================
     8. 랜덤 워크와 확산
     ====================================================================== */
  Lab.register({
    id: "random-walk", field: "phys", thumb: "particles",
    title: "랜덤 워크 — 확산은 √t로 퍼진다",
    desc: "입자 600개가 매 단계 왼쪽·오른쪽으로 무작위로 한 칸씩 움직입니다. 위치 분포가 정규분포로 퍼지고 평균제곱변위가 t에 비례함을 확인합니다.",
    tags: ["통계역학", "확산", "브라운 운동", "중심극한정리"],
    note: "해볼 것: 오른쪽으로 갈 확률 p를 0.5에서 벗어나게 하면 분포 중심이 일정한 속도로 움직이는 표류(drift)가 생깁니다. 확산 모델(Diffusion model)의 순방향 과정도 이처럼 작은 무작위 걸음을 누적한 것입니다.",
    mount(S) {
      const M = 600, SHOW = 24, TMAX = 400;
      const st = { p: 0.5, speed: 2 };
      let x, hist, t, msd;
      function reset() { x = new Int32Array(M); hist = Array.from({ length: SHOW }, () => [0]); t = 0; msd = [[0, 0]]; }
      reset();
      function step() {
        for (let i = 0; i < M; i++) x[i] += Math.random() < st.p ? 1 : -1;
        t++;
        for (let i = 0; i < SHOW; i++) hist[i].push(x[i]);
        const mu = (2 * st.p - 1) * t; let s = 0; for (let i = 0; i < M; i++) s += (x[i] - mu) ** 2; msd.push([t, s / M]);
      }
      const cvP = S.canvas({ aspect: 0.4, minHeight: 200, maxHeight: 300 }, (ctx) => {
        const P = VZ.palette(), lim = Math.max(30, Math.sqrt(TMAX) * 3 + Math.abs(2 * st.p - 1) * TMAX), mu = 2 * st.p - 1, sd = 2 * Math.sqrt(st.p * (1 - st.p));
        const ts = VZ.linspace(0, TMAX, 100);
        VZ.chart(ctx, null, {
          x: [0, TMAX], y: [-lim, lim], xLabel: "단계 t", yLabel: "위치 x", title: `입자 ${SHOW}개의 경로와 ±2σ√t 포락선`,
          series: hist.map((h, i) => ({ data: h.map((v, k) => [k, v]), color: VZ.alpha(VZ.cat[i % 10], 0.75), width: 1.1 }))
            .concat([{ data: ts.map((s) => [s, mu * s + 2 * sd * Math.sqrt(s)]), color: P.text, width: 1.6, dash: [5, 4] }, { data: ts.map((s) => [s, mu * s - 2 * sd * Math.sqrt(s)]), color: P.text, width: 1.6, dash: [5, 4] }]),
          vlines: [{ x: t, color: P.faint }],
        });
      });
      const [a, b] = S.split(2);
      const cvH = S.canvas({ parent: a, aspect: 0.62, maxHeight: 240 }, (ctx) => {
        const P = VZ.palette(), mu = (2 * st.p - 1) * t, sd = 2 * Math.sqrt(st.p * (1 - st.p) * Math.max(t, 1));
        const lo = Math.floor(mu - 4 * sd) - 1, hi = Math.ceil(mu + 4 * sd) + 1, bw = Math.max(2, Math.ceil((hi - lo) / 40) * 2), nb = Math.ceil((hi - lo) / bw);
        const bins = new Array(nb).fill(0); for (let i = 0; i < M; i++) { const k = Math.floor((x[i] - lo) / bw); if (k >= 0 && k < nb) bins[k]++; }
        const dens = bins.map((c) => c / (M * bw));
        const gx = VZ.linspace(lo, hi, 200), g = gx.map((v) => Math.exp(-((v - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(TAU)));
        VZ.chart(ctx, null, { x: [lo, hi], y: [0, Math.max(...dens, ...g) * 1.15], xLabel: "위치", title: `t = ${t} 위치 분포`, yFmt: () => "", series: [{ type: "bar", data: dens.map((d, k) => [lo + (k + 0.5) * bw, d]), color: VZ.alpha(P.accent, 0.6), barWidth: bw * 0.9 }, { data: gx.map((v, i) => [v, g[i]]), color: P.accent2, width: 2.2 }] });
      });
      const cvM = S.canvas({ parent: b, aspect: 0.62, maxHeight: 240 }, (ctx) => {
        const P = VZ.palette(), D = 4 * st.p * (1 - st.p);
        VZ.chart(ctx, null, { x: [0, TMAX], y: [0, D * TMAX * 1.2], xLabel: "t", title: "평균제곱변위 ⟨(x−μt)²⟩", series: [{ data: [[0, 0], [TMAX, D * TMAX]], color: P.dim, width: 1.4, dash: [5, 4] }, { data: msd, color: P.accent, width: 2.2 }] });
      });
      const set = S.stats([{ k: "t", label: "단계" }, { k: "m", label: "평균 위치 (이론)" }, { k: "v", label: "분산 측정 / 이론" }]);
      S.range({ label: "오른쪽으로 갈 확률 p", min: 0.3, max: 0.7, step: 0.01, value: st.p, fmt: (v) => v.toFixed(2), onInput: (v) => { st.p = v; reset(); } });
      S.range({ label: "속도 (단계/프레임)", min: 1, max: 10, step: 1, value: st.speed, onInput: (v) => (st.speed = v) });
      S.button("다시 시작", () => reset(), { primary: true });
      S.loop(() => {
        if (t < TMAX) for (let i = 0; i < st.speed && t < TMAX; i++) step();
        cvP.redraw(); cvH.redraw(); cvM.redraw();
        const mu = (2 * st.p - 1) * t;
        set("t", t); set("m", `${VZ.mean(Array.from(x)).toFixed(1)} (${mu.toFixed(1)})`);
        set("v", `${(msd[msd.length - 1][1]).toFixed(0)} / ${(4 * st.p * (1 - st.p) * t).toFixed(0)}`);
      });
    },
  });

  /* ======================================================================
     9. 열 확산 (2D 열방정식)
     ====================================================================== */
  Lab.register({
    id: "heat", field: "phys", thumb: "heat",
    title: "열 확산 — 2D 열방정식 직접 그리기",
    desc: "격자 위에 뜨거운 곳과 차가운 곳을 그리면 ∂u/∂t = D∇²u에 따라 퍼져 나갑니다. 경계 조건에 따라 열이 빠져나가거나 갇힙니다.",
    tags: ["편미분방정식", "확산", "유한차분", "경계 조건"],
    note: "해볼 것: 캔버스에 마우스로 열을 칠해 보세요(오른쪽 버튼 또는 '차갑게' 모드는 음의 온도). <b>단열 경계</b>에서는 총 열량이 보존되고, <b>고정 경계(0°)</b>에서는 벽으로 빠져나갑니다. 확산 계수가 0.25를 넘으면 명시적 차분법이 불안정해지므로 여기서는 0.24로 제한했습니다.",
    mount(S) {
      const NX = 100, NY = 60;
      const st = { D: 0.2, bc: "fixed", mode: "hot", speed: 4, playing: true };
      let u = new Float32Array(NX * NY), v = new Float32Array(NX * NY), t = 0;
      const preset = (k) => {
        u.fill(0); t = 0;
        if (k === "spot") for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { if (Math.hypot(i - 30, j - 30) < 6) u[j * NX + i] = 1; if (Math.hypot(i - 70, j - 30) < 6) u[j * NX + i] = -1; }
        if (k === "bar") for (let j = 10; j < 50; j++) for (let i = 46; i < 54; i++) u[j * NX + i] = 1;
        if (k === "random") { const r = VZ.rng(Date.now() & 0xffff); for (let n = 0; n < 14; n++) { const ci = r() * NX, cj = r() * NY, s = r() < 0.6 ? 1 : -1; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (Math.hypot(i - ci, j - cj) < 3.5) u[j * NX + i] = s; } }
      };
      preset("spot");
      function step() {
        const D = st.D;
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
          const k = j * NX + i, c = u[k];
          const g = (ii, jj) => { if (ii < 0 || jj < 0 || ii >= NX || jj >= NY) return st.bc === "fixed" ? 0 : c; return u[jj * NX + ii]; };
          v[k] = c + D * (g(i - 1, j) + g(i + 1, j) + g(i, j - 1) + g(i, j + 1) - 4 * c);
        }
        [u, v] = [v, u]; t++;
      }
      const cv = S.canvas({ aspect: NY / NX, maxHeight: 420 }, (ctx, w, h) => {
        const P = VZ.palette();
        VZ.field(ctx, 0, 0, w, h, NX, NY, (i, j) => u[j * NX + i], (x) => VZ.diverge(x, P.dark));
        ctx.strokeStyle = VZ.alpha(P.text, 0.35); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke(); ctx.setLineDash([]);
        if (st.bc === "fixed") { ctx.strokeStyle = P.accent2; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, w - 3, h - 3); }
      });
      const cvL = S.canvas({ height: 130 }, (ctx) => {
        const P = VZ.palette(), j = Math.floor(NY / 2);
        VZ.chart(ctx, null, { x: [0, NX - 1], y: [-1.05, 1.05], title: "가운데 가로줄의 온도 분포", series: [{ data: Array.from({ length: NX }, (_, i) => [i, u[j * NX + i]]), color: P.accent, width: 2.2, fill: true }], hlines: [{ y: 0, color: P.axis, dash: [] }] });
      });
      const set = S.stats([{ k: "t", label: "시간 단계" }, { k: "Q", label: "총 열량 Σu" }, { k: "mx", label: "최고 / 최저 온도" }]);
      const paint = (p, e) => {
        const i0 = (p.x / cv.w) * NX, j0 = (p.y / cv.h) * NY, s = st.mode === "cold" || (e && e.buttons === 2) ? -1 : 1;
        for (let j = Math.floor(j0 - 4); j <= j0 + 4; j++) for (let i = Math.floor(i0 - 4); i <= i0 + 4; i++) if (i >= 0 && j >= 0 && i < NX && j < NY && Math.hypot(i - i0, j - j0) < 3.5) u[j * NX + i] = s;
        cv.redraw();
      };
      cv.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      VZ.drag(cv.canvas, { down: paint, move: paint });
      S.range({ label: "확산 계수 D·Δt/Δx²", min: 0.02, max: 0.24, step: 0.01, value: st.D, fmt: (v) => v.toFixed(2), onInput: (v) => (st.D = v) });
      S.seg({ label: "경계 조건", options: [["fixed", "고정 0° (열 빠짐)"], ["insul", "단열 (보존)"]], value: st.bc, onChange: (v) => (st.bc = v) });
      S.seg({ label: "붓", options: [["hot", "뜨겁게 +1"], ["cold", "차갑게 −1"]], value: st.mode, onChange: (v) => (st.mode = v) });
      S.range({ label: "속도 (단계/프레임)", min: 1, max: 20, step: 1, value: st.speed, onInput: (v) => (st.speed = v) });
      S.select({ label: "처음 상태", options: [["spot", "뜨거운 점 + 차가운 점"], ["bar", "뜨거운 막대"], ["random", "무작위 얼룩"], ["clear", "비우기"]], value: "spot", onChange: (v) => { preset(v); cv.redraw(); } });
      const pb = S.button("일시정지", () => { st.playing = !st.playing; pb.textContent = st.playing ? "일시정지" : "재생"; }, { primary: true });
      S.loop(() => {
        if (st.playing) for (let i = 0; i < st.speed; i++) step();
        cv.redraw(); cvL.redraw();
        let q = 0, mx = -Infinity, mn = Infinity; for (let k = 0; k < u.length; k++) { q += u[k]; if (u[k] > mx) mx = u[k]; if (u[k] < mn) mn = u[k]; }
        set("t", t); set("Q", q.toFixed(1)); set("mx", `${mx.toFixed(2)} / ${mn.toFixed(2)}`);
      });
    },
  });

  /* ======================================================================
     10. 이징 모형
     ====================================================================== */
  Lab.register({
    id: "ising", field: "phys", thumb: "grid",
    title: "이징 모형 — 온도가 만드는 상전이",
    desc: "2D 격자의 스핀들이 메트로폴리스 몬테카를로로 뒤집히며 임계 온도 근처에서 자화가 사라지는 상전이를 보여 줍니다.",
    tags: ["통계역학", "상전이", "몬테카를로", "볼츠만"],
    note: "해볼 것: 온도를 임계값 T<sub>c</sub> ≈ 2.269 아래로 내리면 같은 방향 스핀의 영역이 자라고 자화 |m|이 커집니다. T<sub>c</sub> 근처에서는 모든 크기의 얼룩이 섞인 프랙털 같은 무늬가 나타납니다. 이 볼츠만 분포 샘플링은 볼츠만 머신과 에너지 기반 모델의 뿌리이기도 합니다.",
    mount(S) {
      const N = 128, TC = 2 / Math.log(1 + Math.SQRT2);
      const st = { T: 2.0, h: 0, speed: 3, playing: true };
      const s = new Int8Array(N * N);
      let hist = [], sweeps = 0;
      const randomize = () => { for (let k = 0; k < s.length; k++) s[k] = Math.random() < 0.5 ? 1 : -1; hist = []; sweeps = 0; };
      const allUp = () => { s.fill(1); hist = []; sweeps = 0; };
      randomize();
      function sweep() {
        const b = 1 / st.T;
        for (let n = 0; n < N * N; n++) {
          const i = (Math.random() * N) | 0, j = (Math.random() * N) | 0, k = j * N + i;
          const nb = s[j * N + ((i + 1) % N)] + s[j * N + ((i + N - 1) % N)] + s[((j + 1) % N) * N + i] + s[((j + N - 1) % N) * N + i];
          const dE = 2 * s[k] * (nb + st.h);
          if (dE <= 0 || Math.random() < Math.exp(-b * dE)) s[k] = -s[k];
        }
        sweeps++;
      }
      const stats = () => {
        let m = 0, e = 0;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; m += s[k]; e -= s[k] * (s[j * N + ((i + 1) % N)] + s[((j + 1) % N) * N + i]) + st.h * s[k]; }
        return { m: m / (N * N), e: e / (N * N) };
      };
      const onsager = (T) => (T < TC ? Math.pow(1 - Math.pow(Math.sinh(2 / T), -4), 1 / 8) : 0);
      const [a, b] = S.split(2);
      const cvL = S.canvas({ parent: a, aspect: 1, maxHeight: 420 }, (ctx, w, h) => {
        const P = VZ.palette(), up = VZ.parse(P.accent), dn = P.dark ? [20, 26, 38] : [236, 240, 247], sz = Math.min(w, h) - 16;
        VZ.field(ctx, (w - sz) / 2, (h - sz) / 2, sz, sz, N, N, (i, j) => s[j * N + i], (v) => (v > 0 ? up : dn), false);
      });
      const cvC = S.canvas({ parent: b, aspect: 1, maxHeight: 420 }, (ctx, w, h) => {
        const P = VZ.palette(), Ts = VZ.linspace(0.5, 4, 200);
        VZ.chart(ctx, { x: 0, y: 0, w, h: h * 0.5 }, { x: [0, Math.max(200, hist.length)], y: [-1, 1], title: "자화 m (색) · 에너지/스핀 (점선)", series: [{ data: hist.map((d, i) => [i, d.m]), color: P.accent, width: 1.8 }, { data: hist.map((d, i) => [i, d.e / 2]), color: P.accent2, width: 1.4, dash: [4, 3] }] });
        VZ.chart(ctx, { x: 0, y: h * 0.5, w, h: h * 0.5 }, { x: [0.5, 4], y: [0, 1.05], xLabel: "온도 T", title: "온사거 해 |m|(T)와 현재 상태", series: [{ data: Ts.map((T) => [T, onsager(T)]), color: P.dim, width: 2 }], vlines: [{ x: TC, color: P.accent2, label: "Tc" }], points: hist.length ? [{ x: st.T, y: Math.abs(hist[hist.length - 1].m), color: P.accent, r: 6 }] : [] });
      });
      const set = S.stats([{ k: "T", label: "T / Tc" }, { k: "m", label: "자화 m" }, { k: "e", label: "에너지 / 스핀" }, { k: "th", label: "이론 |m| (h=0)" }, { k: "sw", label: "스윕 수" }]);
      S.range({ label: "온도 T", min: 0.5, max: 4, step: 0.01, value: st.T, fmt: (v) => v.toFixed(2), onInput: (v) => (st.T = v) });
      S.range({ label: "외부 자기장 h", min: -0.5, max: 0.5, step: 0.01, value: st.h, fmt: (v) => v.toFixed(2), onInput: (v) => (st.h = v) });
      S.range({ label: "속도 (스윕/프레임)", min: 1, max: 10, step: 1, value: st.speed, onInput: (v) => (st.speed = v) });
      const pb = S.button("일시정지", () => { st.playing = !st.playing; pb.textContent = st.playing ? "일시정지" : "재생"; }, { primary: true });
      S.button("무작위 (고온) 시작", () => randomize());
      S.button("모두 위로", () => allUp());
      S.loop(() => {
        if (st.playing) { for (let i = 0; i < st.speed; i++) sweep(); const q = stats(); hist.push(q); if (hist.length > 600) hist.shift(); }
        cvL.redraw(); cvC.redraw();
        const q = hist[hist.length - 1] || stats();
        set("T", (st.T / TC).toFixed(3)); set("m", q.m.toFixed(3)); set("e", q.e.toFixed(3)); set("th", onsager(st.T).toFixed(3)); set("sw", sweeps);
      });
    },
  });

  /* ======================================================================
     11. 이중 진자 — 카오스
     ====================================================================== */
  Lab.register({
    id: "double-pendulum", field: "phys", thumb: "pendulum",
    title: "이중 진자 — 초기값 민감성과 카오스",
    desc: "거의 같은 조건에서 출발한 두 이중 진자가 어느 순간 완전히 다른 운동을 하게 되는 과정을 봅니다.",
    tags: ["카오스", "비선형", "리아푸노프 지수", "예측 가능성"],
    note: "아래 그래프는 두 진자 각도 차이의 로그입니다. 처음에는 거의 직선으로(지수적으로) 커지다가 차이가 각도 범위만큼 커지면 포화됩니다. 직선 구간의 기울기가 최대 리아푸노프 지수이고, 이것이 날씨나 금융 시계열을 장기 예측하기 어려운 근본 이유입니다.",
    mount(S) {
      const g = 9.81, L1 = 1, L2 = 1, m1 = 1, m2 = 1;
      const st = { th1: 120, th2: -20, eps: -6, playing: true };
      const f = ([a1, a2, w1, w2]) => {
        const d = a1 - a2, den = 2 * m1 + m2 - m2 * Math.cos(2 * d);
        const A = (-g * (2 * m1 + m2) * Math.sin(a1) - m2 * g * Math.sin(a1 - 2 * a2) - 2 * Math.sin(d) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))) / (L1 * den);
        const B = (2 * Math.sin(d) * (w1 * w1 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(a1) + w2 * w2 * L2 * m2 * Math.cos(d))) / (L2 * den);
        return [w1, w2, A, B];
      };
      let P1, P2, tr1, tr2, t, dlog;
      function reset() {
        const a = (st.th1 * Math.PI) / 180, b = (st.th2 * Math.PI) / 180;
        P1 = [a, b, 0, 0]; P2 = [a + Math.pow(10, st.eps), b, 0, 0]; tr1 = []; tr2 = []; t = 0; dlog = [];
      }
      reset();
      const cv = S.canvas({ aspect: 0.62, maxHeight: 420 }, (ctx, w, h) => {
        const P = VZ.palette(), sc = Math.min(w, h) / 4.6, ox = w / 2, oy = h / 2 - 10;
        const pos = (p) => { const x1 = ox + L1 * sc * Math.sin(p[0]), y1 = oy + L1 * sc * Math.cos(p[0]); return [x1, y1, x1 + L2 * sc * Math.sin(p[1]), y1 + L2 * sc * Math.cos(p[1])]; };
        [[tr1, P.accent], [tr2, P.accent2]].forEach(([tr, c]) => { ctx.strokeStyle = VZ.alpha(c, 0.55); ctx.lineWidth = 1.4; ctx.beginPath(); tr.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); });
        [[P1, P.accent], [P2, P.accent2]].forEach(([p, c]) => {
          const [x1, y1, x2, y2] = pos(p);
          ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x1, y1, 8, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x2, y2, 9, 0, 7); ctx.fill();
        });
        ctx.fillStyle = P.text; ctx.beginPath(); ctx.arc(ox, oy, 4, 0, 7); ctx.fill();
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(`t = ${t.toFixed(1)} s · 처음 차이 10^${st.eps} rad`, 10, 8);
      });
      const cvD = S.canvas({ height: 150 }, (ctx) => {
        const P = VZ.palette();
        VZ.chart(ctx, null, { x: [0, Math.max(20, t)], y: [st.eps - 1, 1], xLabel: "시간 (s)", title: "log₁₀ |Δθ₁|", series: [{ data: dlog, color: P.accent, width: 1.8 }], hlines: [{ y: 0, color: P.faint, label: "1 rad" }] });
      });
      S.legend([{ label: "진자 A", color: (P) => P.accent }, { label: "진자 B (θ₁ + ε)", color: (P) => P.accent2 }]);
      const set = S.stats([{ k: "d", label: "|Δθ₁|" }, { k: "lam", label: "지수 추정 λ" }, { k: "tp", label: "예측 한계 (Δ>0.1 rad)" }]);
      let tPred = null;
      S.range({ label: "처음 θ₁", min: -180, max: 180, step: 1, value: st.th1, fmt: (v) => v + "°", onInput: (v) => { st.th1 = v; reset(); tPred = null; } });
      S.range({ label: "처음 θ₂", min: -180, max: 180, step: 1, value: st.th2, fmt: (v) => v + "°", onInput: (v) => { st.th2 = v; reset(); tPred = null; } });
      S.range({ label: "처음 차이 ε", min: -10, max: -1, step: 1, value: st.eps, fmt: (v) => "10^" + v, onInput: (v) => { st.eps = v; reset(); tPred = null; } });
      const pb = S.button("일시정지", () => { st.playing = !st.playing; pb.textContent = st.playing ? "일시정지" : "재생"; }, { primary: true });
      S.button("다시 시작", () => { reset(); tPred = null; });
      S.loop((dt) => {
        if (st.playing && t < 120) {
          const n = 16, h = Math.min(dt, 0.033) / n;
          for (let i = 0; i < n; i++) { P1 = rk4(f, P1, h); P2 = rk4(f, P2, h); t += h; }
          const sc = Math.min(cv.w, cv.h) / 4.6, ox = cv.w / 2, oy = cv.h / 2 - 10;
          const tip = (p) => [ox + sc * (Math.sin(p[0]) + Math.sin(p[1])), oy + sc * (Math.cos(p[0]) + Math.cos(p[1]))];
          tr1.push(tip(P1)); tr2.push(tip(P2)); if (tr1.length > 500) { tr1.shift(); tr2.shift(); }
          const d = Math.abs(Math.atan2(Math.sin(P1[0] - P2[0]), Math.cos(P1[0] - P2[0])));
          dlog.push([t, Math.log10(Math.max(d, 1e-16))]);
          if (tPred == null && d > 0.1) tPred = t;
        }
        cv.redraw(); cvD.redraw();
        const last = dlog[dlog.length - 1];
        if (last) {
          set("d", VZ.fmt(Math.pow(10, last[1]), 3));
          const lin = dlog.filter((p) => p[1] < -2 && p[0] > 1);
          if (lin.length > 20) { const a = lin[0], b2 = lin[lin.length - 1]; set("lam", (((b2[1] - a[1]) * Math.LN10) / (b2[0] - a[0])).toFixed(2) + "<small>/s</small>"); }
          set("tp", tPred ? tPred.toFixed(1) + "<small>s</small>" : "—");
        }
      });
    },
  });

  /* ======================================================================
     12. 로렌츠 끌개 (3D)
     ====================================================================== */
  Lab.register({
    id: "lorenz3d", field: "phys", thumb: "surface", three: true,
    title: "로렌츠 끌개 — 나비 모양의 카오스",
    desc: "로렌츠 방정식을 적분해 두 궤적을 3D로 그립니다. 아주 작은 차이에서 출발한 두 궤적이 끌개 위에서 결국 갈라집니다.",
    tags: ["카오스", "3D", "미분방정식", "예측 가능성"],
    note: "dx/dt = σ(y − x), dy/dt = x(ρ − z) − y, dz/dt = xy − βz (σ = 10, β = 8/3). ρ가 약 24.74보다 작으면 궤적이 한 점으로 수렴하고, 크면 나비 모양의 이상한 끌개가 나타납니다. 시계열 모형의 '예측 가능 구간'을 생각할 때 좋은 예입니다.",
    mount(S) {
      const st = { rho: 28, eps: -5, speed: 1 };
      const sig = 10, beta = 8 / 3, MAXP = 12000;
      const f = ([x, y, z]) => [sig * (y - x), x * (st.rho - z) - y, x * y - beta * z];
      let A, B, t, hist;
      function reset() {
        // 과도 구간을 건너뛰도록 먼저 조용히 적분해 끌개 위에서 출발한다
        A = [1, 1, 1];
        for (let i = 0; i < 1500; i++) A = rk4(f, A, 0.005);
        B = [A[0] + Math.pow(10, st.eps), A[1], A[2]]; t = 0; hist = []; clear && clear();
      }
      let clear = null;
      reset();
      const panel = S.panel();
      const cvP = S.canvas({ parent: panel, height: 150 }, (ctx) => {
        const P = VZ.palette();
        VZ.chart(ctx, null, { x: [Math.max(0, t - 30), Math.max(30, t)], y: [-25, 25], title: "x(t): 두 궤적 (색 / 점선)", series: [{ data: hist.map((h) => [h[0], h[1]]), color: P.accent, width: 1.6 }, { data: hist.map((h) => [h[0], h[2]]), color: P.accent2, width: 1.6, dash: [5, 3] }] });
      });
      const set = S.stats([{ k: "t", label: "시간" }, { k: "d", label: "두 궤적 거리" }, { k: "fp", label: "고정점 안정성" }]);
      S.range({ label: "ρ (레일리 수)", min: 5, max: 40, step: 0.1, value: st.rho, fmt: (v) => v.toFixed(1), onInput: (v) => { st.rho = v; reset(); } });
      S.range({ label: "처음 차이 ε", min: -10, max: -1, step: 1, value: st.eps, fmt: (v) => "10^" + v, onInput: (v) => { st.eps = v; reset(); } });
      S.range({ label: "속도", min: 0.2, max: 3, step: 0.1, value: st.speed, fmt: (v) => v.toFixed(1) + "×", onInput: (v) => (st.speed = v) });
      S.button("다시 시작", () => reset(), { primary: true });
      S.three({ camera: [5.5, 3.2, 6.5], target: [0, 0, 0], autoRotate: true, autoRotateSpeed: 0.6, height: 400 }).then((T) => {
        const { THREE, scene } = T;
        const mk = (color) => {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3));
          geo.setDrawRange(0, 0);
          const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 }));
          scene.add(line); scene.add(head);
          return { geo, head, n: 0 };
        };
        const LA = mk(0x6366f1), LB = mk(0xf97316);
        const toV = (p) => [p[0] * 0.12, (p[2] - 25) * 0.12, p[1] * 0.12];
        const axes = new THREE.GridHelper(8, 16, 0x888888, 0x888888);
        axes.material.transparent = true; axes.material.opacity = 0.15; axes.position.y = -3.2; scene.add(axes);
        clear = () => { [LA, LB].forEach((L) => { L.n = 0; L.geo.setDrawRange(0, 0); }); };
        const push = (L, p) => {
          const arr = L.geo.attributes.position.array, v = toV(p);
          if (L.n >= MAXP) { arr.copyWithin(0, 3); L.n = MAXP - 1; }
          arr[L.n * 3] = v[0]; arr[L.n * 3 + 1] = v[1]; arr[L.n * 3 + 2] = v[2]; L.n++;
          L.geo.attributes.position.needsUpdate = true; L.geo.setDrawRange(0, L.n);
          L.head.position.set(v[0], v[1], v[2]);
        };
        T.onFrame((dt) => {
          const n = Math.round(6 * st.speed), h = 0.005;
          for (let i = 0; i < n; i++) { A = rk4(f, A, h); B = rk4(f, B, h); t += h; push(LA, A); push(LB, B); }
          hist.push([t, A[0], B[0]]); while (hist.length && hist[0][0] < t - 30) hist.shift();
          cvP.redraw();
          set("t", t.toFixed(1)); set("d", VZ.fmt(Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]), 3));
          set("fp", st.rho < 1 ? "원점 안정" : st.rho < 24.74 ? "두 고정점 안정" : '<span style="color:var(--bad)">모두 불안정 → 카오스</span>');
        });
      }).catch(() => {});
    },
  });

  /* ======================================================================
     13. 1차원 양자 파속 (퍼짐, 계단, 장벽 터널링, 우물)
     ====================================================================== */
  // ħ = m = 1 단위. 크랭크-니콜슨: (1 + iHΔt/2)ψⁿ⁺¹ = (1 − iHΔt/2)ψⁿ, 양 끝은 ψ = 0.
  // 행렬이 삼중 대각이고 비대각 원소가 상수이므로 토마스 알고리즘으로 푼다. 노름이 정확히 보존된다.
  // 페이지에서 <div data-sim="qm-packet" data-preset="free|step|barrier|well"></div>로 처음 퍼텐셜을 고른다.
  Lab.register({
    id: "qm-packet", field: "phys", thumb: "wave",
    title: "1차원 파속 — 퍼짐, 반사, 터널링",
    desc: "가우스 파속이 자유 공간에서 퍼지고, 계단·장벽·우물 퍼텐셜에서 반사하고 투과하는 모습을 슈뢰딩거 방정식을 직접 풀어 보여 줍니다.",
    tags: ["양자역학", "슈뢰딩거 방정식", "터널링", "파속"],
    note: "ħ = m = 1 단위로 슈뢰딩거 방정식을 크랭크-니콜슨 방법으로 풉니다. 회색 띠가 퍼텐셜, 점선이 파속의 평균 에너지 E₀입니다. 투과 확률은 퍼텐셜 오른쪽, 반사 확률은 왼쪽에 있는 |ψ|²의 넓이입니다. 파속은 여러 에너지가 섞여 있으므로 평면파 공식의 T(E₀)와 조금 다르며, 파속 폭 σ를 키울수록(에너지 퍼짐이 작을수록) 가까워집니다. '자유'에서는 σ를 작게 할수록 빨리 퍼집니다. Δx 옆 괄호는 해석해 σ√(1 + (t/σ²)²)/√2이고, 계산 격자 때문에 오래 지나면 1~2% 작게 나옵니다.",
    mount(S) {
      const pre = ["free", "step", "barrier", "well"].includes(S.el.dataset.preset) ? S.el.dataset.preset : "barrier";
      const st = { pot: pre, E0: pre === "free" ? 1.2 : 1.5, V0: 2, a: 1.5, sig: pre === "free" ? 3 : 6 };
      const N = 3000, L = 300, dx = L / N, dt = 0.05, XP = 150; // 폭 a는 Δx의 정수배로 잡아 장벽 폭이 정확하다
      const re = new Float64Array(N), im = new Float64Array(N), V = new Float64Array(N);
      const cpr = new Float64Array(N), cpi = new Float64Array(N), ivr = new Float64Array(N), ivi = new Float64Array(N);
      const dpr = new Float64Array(N), dpi = new Float64Array(N);
      const br = 0, bi = -dt / (4 * dx * dx); // 비대각 원소 b = −iΔt/4Δx²
      let t = 0, done = false, x0 = 0, rho0 = 0;
      const xs = Array.from({ length: N }, (_, j) => (j + 0.5) * dx);
      const region = () => (st.pot === "free" ? [L, L] : st.pot === "step" ? [XP, L] : [XP, XP + st.a]);
      function setup() {
        const [xa, xb] = region();
        for (let j = 0; j < N; j++) V[j] = st.pot === "free" ? 0 : xs[j] >= xa && xs[j] < xb ? (st.pot === "well" ? -st.V0 : st.V0) : 0;
        // 대각 원소 a_j = 1 + iΔt(1/Δx² + V_j)/2 와 토마스 알고리즘의 앞 단계 계수
        for (let j = 0; j < N; j++) {
          let ar = 1, ai = (dt / 2) * (1 / (dx * dx) + V[j]);
          if (j > 0) { // a_j − b·c'_{j−1}
            const pr = br * cpr[j - 1] - bi * cpi[j - 1], pi = br * cpi[j - 1] + bi * cpr[j - 1];
            ar -= pr; ai -= pi;
          }
          const m2 = ar * ar + ai * ai;
          ivr[j] = ar / m2; ivi[j] = -ai / m2;
          cpr[j] = br * ivr[j] - bi * ivi[j]; cpi[j] = br * ivi[j] + bi * ivr[j];
        }
        // 처음 파속
        const k0 = Math.sqrt(2 * st.E0);
        x0 = st.pot === "free" ? 60 : XP - 4 * st.sig - 20;
        const nrm = Math.pow(Math.PI * st.sig * st.sig, -0.25);
        for (let j = 0; j < N; j++) {
          const g = nrm * Math.exp(-((xs[j] - x0) ** 2) / (2 * st.sig * st.sig));
          re[j] = g * Math.cos(k0 * xs[j]); im[j] = g * Math.sin(k0 * xs[j]);
        }
        rho0 = 1 / (Math.sqrt(Math.PI) * st.sig);
        t = 0; done = false;
      }
      function step() {
        // 오른쪽: r = (1 − iHΔt/2)ψ
        for (let j = 0; j < N; j++) {
          const lr = j > 0 ? re[j - 1] : 0, li = j > 0 ? im[j - 1] : 0, rr = j < N - 1 ? re[j + 1] : 0, ri = j < N - 1 ? im[j + 1] : 0;
          const d = (dt / 2) * (1 / (dx * dx) + V[j]), o = dt / (4 * dx * dx);
          // (1 − i d)ψ_j + i o (ψ_{j+1} + ψ_{j−1})
          const r0 = re[j] + d * im[j] - o * (ri + li), i0 = im[j] - d * re[j] + o * (rr + lr);
          // d'_j = (r_j − b d'_{j−1}) / den_j
          let nr = r0, ni = i0;
          if (j > 0) { nr -= br * dpr[j - 1] - bi * dpi[j - 1]; ni -= br * dpi[j - 1] + bi * dpr[j - 1]; }
          dpr[j] = nr * ivr[j] - ni * ivi[j]; dpi[j] = nr * ivi[j] + ni * ivr[j];
        }
        re[N - 1] = dpr[N - 1]; im[N - 1] = dpi[N - 1];
        for (let j = N - 2; j >= 0; j--) {
          re[j] = dpr[j] - (cpr[j] * re[j + 1] - cpi[j] * im[j + 1]);
          im[j] = dpi[j] - (cpr[j] * im[j + 1] + cpi[j] * re[j + 1]);
        }
        t += dt;
      }
      // 평면파 투과 확률 T(E)
      function Tplane(E) {
        const V0 = st.V0, a = st.a;
        if (st.pot === "free") return 1;
        if (st.pot === "step") { if (E <= V0) return 0; const k = Math.sqrt(2 * E), q = Math.sqrt(2 * (E - V0)); return (4 * k * q) / (k + q) ** 2; }
        if (st.pot === "well") { const q = Math.sqrt(2 * (E + V0)); return 1 / (1 + (V0 * V0 * Math.sin(q * a) ** 2) / (4 * E * (E + V0))); }
        if (Math.abs(E - V0) < 1e-9) return 1 / (1 + (V0 * a * a) / 2);
        if (E < V0) { const kap = Math.sqrt(2 * (V0 - E)); return 1 / (1 + (V0 * V0 * Math.sinh(kap * a) ** 2) / (4 * E * (V0 - E))); }
        const q = Math.sqrt(2 * (E - V0)); return 1 / (1 + (V0 * V0 * Math.sin(q * a) ** 2) / (4 * E * (E - V0)));
      }
      const cv = S.canvas({ aspect: 0.5, minHeight: 230, maxHeight: 360 }, (ctx) => {
        const P = VZ.palette();
        const ymax = 1.3 * rho0, [xa, xb] = region();
        const data = [];
        for (let j = 0; j < N; j += 4) data.push([xs[j], re[j] * re[j] + im[j] * im[j]]);
        const ch = VZ.chart(ctx, null, { x: [0, L], y: [0, ymax], xLabel: "위치 x (ħ = m = 1)", yFmt: (v) => v.toFixed(2), series: [] });
        // 퍼텐셜과 평균 에너지 (같은 눈금: V0 또는 E0 가운데 큰 것이 높이의 75%)
        if (st.pot !== "free") {
          const vs = (0.75 * ymax) / Math.max(st.V0, st.E0);
          ctx.fillStyle = VZ.alpha(P.dim, 0.18);
          const top = st.pot === "well" ? ymax : st.V0 * vs;
          ctx.fillRect(ch.X(xa), ch.Y(top), Math.max(2, ch.X(xb) - ch.X(xa)), ch.Y(0) - ch.Y(top));
          ctx.fillStyle = P.dim; ctx.font = VZ.font(11, false); ctx.textAlign = "left"; ctx.textBaseline = "bottom";
          ctx.fillText(st.pot === "well" ? "우물 −V₀" : "V₀", ch.X(Math.min(xb, L - 20)) + 4, ch.Y(Math.min(top, ymax)) + (st.pot === "well" ? 14 : -2));
          if (st.pot !== "well") {
            ctx.strokeStyle = P.dim; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.beginPath();
            ctx.moveTo(ch.X(0), ch.Y(st.E0 * vs)); ctx.lineTo(ch.X(L), ch.Y(st.E0 * vs)); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillText("E₀", ch.X(4), ch.Y(st.E0 * vs) - 2);
          }
        }
        VZ.chart(ctx, null, { x: [0, L], y: [0, ymax], noGrid: true, xTicks: [], yTicks: [], margin: { b: 40 }, series: [{ data, color: P.accent, width: 2, fill: VZ.alpha(P.accent, 0.18) }] });
      });
      const set = S.stats([{ k: "t", label: "시간 t" }, { k: "R", label: "반사 확률" }, { k: "T", label: "투과 확률" }, { k: "Tp", label: "평면파 공식 T(E₀)" }, { k: "dx", label: "위치 퍼짐 Δx (식)" }]);
      function readout() {
        const [xa, xb] = region();
        let Rl = 0, Tr = 0, n = 0, mx = 0, mx2 = 0;
        for (let j = 0; j < N; j++) {
          const p = (re[j] * re[j] + im[j] * im[j]) * dx;
          n += p; mx += p * xs[j]; mx2 += p * xs[j] * xs[j];
          if (xs[j] < xa) Rl += p; else if (xs[j] >= (st.pot === "step" ? xa : xb)) Tr += p;
        }
        set("t", t.toFixed(1));
        if (st.pot === "free") {
          const dxn = Math.sqrt(Math.max(0, mx2 / n - (mx / n) ** 2));
          const th = (st.sig / Math.SQRT2) * Math.sqrt(1 + (t / (st.sig * st.sig)) ** 2);
          set("R", "—"); set("T", "—"); set("Tp", "—"); set("dx", dxn.toFixed(2) + " <small>(" + th.toFixed(2) + ")</small>");
        } else {
          set("R", (Rl * 100).toFixed(1) + "%"); set("T", (Tr * 100).toFixed(1) + "%"); set("Tp", (Tplane(st.E0) * 100).toFixed(1) + "%"); set("dx", "—");
        }
        // 벽에 닿기 전에 멈춘다 (양 끝 15 단위)
        let edge = 0;
        for (let j = 0; j < N; j++) if (xs[j] < 15 || xs[j] > L - 15) edge += (re[j] * re[j] + im[j] * im[j]) * dx;
        if (edge > 2e-3 && !done) { done = true; lp.stop(); playBtn.textContent = "다시 재생"; }
      }
      // 설정을 바꾸면 처음부터 다시 재생한다
      function restart() { setup(); readout(); cv.redraw(); lp.start(); playBtn.textContent = "멈춤"; }
      S.seg({ label: "퍼텐셜", options: [["free", "자유"], ["step", "계단"], ["barrier", "장벽"], ["well", "우물"]], value: st.pot, onChange: (v) => { st.pot = v; restart(); } });
      S.range({ label: "평균 에너지 E₀", min: 0.2, max: 4, step: 0.05, value: st.E0, fmt: (v) => v.toFixed(2), onInput: (v) => { st.E0 = v; restart(); } });
      S.range({ label: "퍼텐셜 크기 V₀", min: 0.5, max: 4, step: 0.05, value: st.V0, fmt: (v) => v.toFixed(2), onInput: (v) => { st.V0 = v; restart(); } });
      S.range({ label: "폭 a (장벽·우물)", min: 0.4, max: 8, step: 0.1, value: st.a, fmt: (v) => v.toFixed(1), onInput: (v) => { st.a = v; restart(); } });
      S.range({ label: "파속 폭 σ", min: 2, max: 12, step: 0.5, value: st.sig, fmt: (v) => v.toFixed(1), onInput: (v) => { st.sig = v; restart(); } });
      const playBtn = S.button("멈춤", () => { if (done) return restart(); playBtn.textContent = lp.toggle() ? "멈춤" : "재생"; }, { primary: true });
      S.button("처음부터", () => restart());
      setup();
      const lp = S.loop(() => { if (done) return; for (let k = 0; k < 4; k++) step(); readout(); cv.redraw(); });
      readout();
    },
  });
})();
