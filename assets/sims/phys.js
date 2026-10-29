/* ==========================================================================
   물리 실험 모음 (field: "phys")
   projectile · incline · atwood · banked-curve · loop · collision · rolling · damped-spring · pendulum
   oscillator · coupled · orbit · lagrange · waves · double-slit · efield · random-walk · heat · ising
   double-pendulum · lorenz3d · qm-packet
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
     2. 빗면 위의 물체와 마찰
     ====================================================================== */
  Lab.register({
    id: "incline", field: "phys", thumb: "incline",
    title: "빗면과 마찰 — 언제 미끄러지기 시작할까",
    desc: "경사각과 마찰 계수를 바꾸며 빗면 위 블록에 작용하는 중력, 수직항력, 마찰력을 자유물체도로 보고, 미끄러지기 시작하는 임계각과 가속도를 확인합니다.",
    tags: ["역학", "마찰", "자유물체도", "뉴턴 법칙"],
    note: "해볼 것: 경사각을 천천히 올려 보세요. tan θ가 μₛ를 넘는 임계각에서 블록이 미끄러지기 시작하고, 마찰력이 최대 정지 마찰력에서 운동 마찰력으로 뚝 떨어집니다. 미끄러지는 동안 경사를 다시 낮추면 임계각보다 낮아도 계속 미끄러지다가, tan θ가 μₖ보다 작아져야 감속해 멈춥니다. 질량을 바꾸면 모든 힘이 같은 비율로 바뀌므로 가속도 g(sin θ − μₖ cos θ)는 그대로입니다.",
    mount(S) {
      const g = 9.81, L = 4, BL = 0.5, D = L - BL; // 빗면 길이, 블록 길이, 블록이 미끄러질 수 있는 거리 (m)
      const MAT = { ice: [0.1, 0.03], wood: [0.5, 0.2], steel: [0.74, 0.57], rubber: [1, 0.8] }; // [μₛ, μₖ] 대략값
      const st = { th: 15, mus: 0.5, muk: 0.2, m: 2, comp: true };
      const rad = (d) => (d * Math.PI) / 180;
      // 블록: 빗면 위 끝에서 잰 위치 x (m), 속도 v, 미끄러진 시간 t. clean은 출발한 뒤 θ·μₖ를 바꾸지 않았다는 뜻
      let x, v, t, vPeak, sliding, atBottom, clean, hist;
      function reset() { x = 0; v = 0; t = 0; vPeak = 0; sliding = false; atBottom = false; clean = true; hist = []; }
      reset();
      const accel = () => g * (Math.sin(rad(st.th)) - st.muk * Math.cos(rad(st.th)));
      const thC = () => (Math.atan(st.mus) * 180) / Math.PI;
      /** 지금 마찰력. 미끄러지면 운동 마찰 μₖN, 멈춰 있으면 정지 마찰이 mg sin θ만큼 버틴다. 바닥에 닿은 뒤에는 null */
      function friction() {
        if (atBottom) return null;
        const th = rad(st.th);
        return sliding ? { f: st.muk * st.m * g * Math.cos(th), kind: "운동" } : { f: st.m * g * Math.sin(th), kind: "정지" };
      }
      /** 최근 0.25초 동안의 v–t 기울기 */
      function slope() {
        if (hist.length < 2 || (!sliding && !atBottom)) return null;
        const [t1, v1] = hist[hist.length - 1];
        for (let i = hist.length - 2; i >= 0; i--) if (t1 - hist[i][0] >= 0.25) return (v1 - hist[i][1]) / (t1 - hist[i][0]);
        return null;
      }
      const [left, right] = S.split(2);
      const cvS = S.canvas({ parent: left, aspect: 0.95, maxHeight: 400 }, (ctx, w, h) => {
        const P = VZ.palette(), th = rad(st.th), c = Math.cos(th), s = Math.sin(th);
        // 가장 가파른 60°에서도 빗면이 들어가고, 왼쪽에는 마찰력 화살표 자리가 남게 한다
        const xb = w - 24, yb = h - 70, Lpx = Math.min(w - 114, (yb - 30) / Math.sin(rad(60))), k = Lpx / L;
        const T = [xb - Lpx * c, yb - Lpx * s], u = [c, s], n = [s, -c]; // 빗면 위 끝, 빗면 아래 방향, 빗면 바깥 방향
        ctx.fillStyle = VZ.alpha(P.dim, 0.1); ctx.fillRect(0, yb, w, h - yb);
        ctx.strokeStyle = P.axis; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, yb); ctx.lineTo(w, yb); ctx.stroke();
        ctx.fillStyle = VZ.alpha(P.dim, 0.16); ctx.strokeStyle = P.dim;
        ctx.beginPath(); ctx.moveTo(T[0], T[1]); ctx.lineTo(xb, yb); ctx.lineTo(T[0], yb); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (th > 0) { ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(xb, yb, 40, Math.PI, Math.PI + th); ctx.stroke(); }
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12); ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(`θ = ${st.th}°`, xb - 52 * Math.cos(th / 2), yb - 52 * Math.sin(th / 2));
        // 블록 (가운데 점이 자유물체도의 출발점)
        const bw = BL * k, bh = bw * 0.62, d = x * k + bw / 2;
        const C = [T[0] + u[0] * d + n[0] * (bh / 2), T[1] + u[1] * d + n[1] * (bh / 2)];
        ctx.save(); ctx.translate(C[0], C[1]); ctx.rotate(th);
        ctx.fillStyle = VZ.alpha(P.accent, 0.22); ctx.strokeStyle = P.accent; ctx.lineWidth = 1.6;
        ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
        ctx.restore();
        ctx.fillStyle = P.text; ctx.beginPath(); ctx.arc(C[0], C[1], 3, 0, 7); ctx.fill();
        const fr = friction();
        if (fr) {
          const mg = st.m * g, N = mg * c, F = 70; // F: mg 화살표 길이(px). 다른 힘은 mg에 비례해 그린다
          // 옆으로 향한 화살표는 끝 너머에, 위아래로 향한 화살표는 끝 오른쪽에 이름을 단다
          const arrow = (dx, dy, col, label, thin) => {
            const len = Math.hypot(dx, dy);
            if (len < 4) return;
            const ex = C[0] + dx, ey = C[1] + dy, ux = dx / len, uy = dy / len, side = Math.abs(ux) > 0.35;
            ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = thin ? 1.4 : 2.6; ctx.setLineDash(thin ? [5, 4] : []);
            VZ.arrow(ctx, C[0], C[1], ex, ey, thin ? 6 : 9); ctx.setLineDash([]);
            if (!label) return;
            // 블록보다 짧은 화살표도 이름은 블록 바깥에 단다
            const r = Math.max(len, Math.hypot(bw, bh) / 2 + 4), lx = C[0] + ux * r, ly = C[1] + uy * r;
            ctx.font = VZ.font(11.5, false, 700);
            ctx.textAlign = side && ux < 0 ? "right" : "left";
            ctx.textBaseline = side ? (uy > 0.35 ? "top" : uy < -0.35 ? "bottom" : "middle") : "middle";
            ctx.fillText(label, side ? lx + ux * 6 : lx + 8, side ? ly + uy * 6 : ly - 4);
          };
          if (st.comp) {
            const cc = VZ.alpha(P.text, 0.45);
            arrow(u[0] * F * s, u[1] * F * s, cc, "", true);
            arrow(-n[0] * F * c, -n[1] * F * c, cc, "", true);
          }
          arrow(0, F, P.text, `mg = ${mg.toFixed(1)} N`);
          arrow(n[0] * F * c, n[1] * F * c, P.ok, `N = ${N.toFixed(1)} N`);
          arrow((-u[0] * F * fr.f) / mg, (-u[1] * F * fr.f) / mg, P.accent, `f = ${fr.f.toFixed(1)} N`);
        }
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        if (atBottom) {
          ctx.fillText(`도착 ${t.toFixed(2)} s · 도착 속력 ${v.toFixed(2)} m/s`, 10, 8);
          if (clean) ctx.fillText(`이론 √(2d/a) = ${Math.sqrt((2 * D) / accel()).toFixed(2)} s (d = ${D} m)`, 10, 26);
          ctx.fillText("‘다시 놓기’로 처음부터", 10, clean ? 44 : 26);
        } else ctx.fillText(`t = ${t.toFixed(2)} s · v = ${v.toFixed(2)} m/s`, 10, 8);
      });
      const cvG = S.canvas({ parent: right, aspect: 0.95, maxHeight: 400 }, (ctx, w, h) => {
        const P = VZ.palette(), mg = st.m * g, tc = thC(), sinC = mg * Math.sin(rad(tc)), kinC = st.muk * mg * Math.cos(rad(tc));
        const ths = VZ.linspace(0, 60, 241), N = (a) => mg * Math.cos(rad(a)), fr = friction();
        // 경사를 천천히 올릴 때의 마찰력: 임계각까지는 mg sin θ를 따라 오르다가 운동 마찰력으로 떨어진다
        const below = ths.filter((a) => a < tc).concat(tc <= 60 ? [tc] : []), above = tc <= 60 ? [tc].concat(ths.filter((a) => a > tc)) : [];
        VZ.chart(ctx, { x: 0, y: 0, w, h: h * 0.56 }, {
          x: [0, 60], y: [0, mg * Math.max(1.08, st.mus * 1.05)], xLabel: "경사각 θ (°)", title: "경사각에 따른 마찰력 (N)",
          series: [
            { data: ths.map((a) => [a, mg * Math.sin(rad(a))]), color: P.dim, width: 1.4, dash: [6, 4] },
            { data: ths.map((a) => [a, st.mus * N(a)]), color: P.accent2, width: 1.4, dash: [4, 4] },
            { data: ths.map((a) => [a, st.muk * N(a)]), color: VZ.alpha(P.accent2, 0.55), width: 1.4, dash: [2, 3] },
            { data: below.map((a) => [a, mg * Math.sin(rad(a))]), color: P.accent, width: 2.8 },
            { data: above.length ? [[tc, sinC], [tc, kinC]] : [], color: P.accent, width: 1.2, dash: [3, 3] },
            { data: above.map((a) => [a, st.muk * N(a)]), color: P.accent, width: 2.8 },
          ],
          vlines: tc <= 60 ? [{ x: tc, color: P.faint, label: `θc ${tc.toFixed(1)}°` }] : [],
          points: fr ? [{ x: st.th, y: fr.f, color: P.accent, r: 6 }] : [],
        });
        const theory = clean && hist.length ? [{ data: [[0, 0], [t, accel() * t]], color: P.dim, width: 1.4, dash: [5, 4] }] : [];
        VZ.chart(ctx, { x: 0, y: h * 0.56, w, h: h * 0.44 }, {
          x: [0, Math.max(2, t * 1.1)], y: [0, Math.max(1, vPeak * 1.15)], xLabel: "시간 (s)", title: "속도 v (m/s) — 기울기가 가속도",
          series: theory.concat([{ data: hist, color: P.accent, width: 2.2 }]),
          texts: hist.length ? [] : [{ x: 1, y: 0.5, text: "블록이 미끄러지면 여기에 그려집니다", align: "center", sans: true }],
        });
      });
      S.legend([
        { label: "마찰력 f", color: (P) => P.accent },
        { label: "mg sin θ", color: (P) => P.dim, dash: true },
        { label: "최대 정지 마찰력 μₛN", color: (P) => P.accent2, dash: true },
        { label: "운동 마찰력 μₖN", color: (P) => VZ.alpha(P.accent2, 0.55), dash: true },
      ]);
      const set = S.stats([{ k: "st", label: "상태" }, { k: "tc", label: "임계각 tan⁻¹ μₛ" }, { k: "f", label: "마찰력 f" }, { k: "a", label: "가속도 (이론)" }, { k: "am", label: "v–t 기울기 (측정)" }]);
      function readouts() {
        const fr = friction(), a = accel(), am = slope();
        set("st", atBottom ? `바닥 도착 <small>${t.toFixed(2)} s</small>` : !sliding ? "정지 <small>정지 마찰이 버팀</small>" : a > 1e-9 ? "미끄러지며 가속" : a < -1e-9 ? "미끄러지며 감속" : "등속으로 미끄러짐");
        set("tc", thC().toFixed(1) + "°");
        set("f", fr ? `${fr.f.toFixed(2)}<small>N · ${fr.kind}</small>` : "—");
        set("a", atBottom ? "—" : (sliding ? a : 0).toFixed(2) + "<small>m/s²</small>");
        set("am", am == null ? "—" : am.toFixed(2) + "<small>m/s²</small>");
      }
      S.range({ label: "경사각 θ", min: 0, max: 60, step: 0.5, value: st.th, fmt: (v) => v + "°", onInput: (v) => { st.th = v; if (sliding) clean = false; } });
      const mat = S.seg({ label: "재질 (대략값)", options: [["ice", "얼음"], ["wood", "나무"], ["steel", "강철"], ["rubber", "고무·콘크리트"]], value: "wood", onChange: (key) => {
        [st.mus, st.muk] = MAT[key]; rS.set(st.mus, false); rK.set(st.muk, false); if (sliding) clean = false;
      } });
      const rS = S.range({ label: "정지 마찰 계수 μₛ", min: 0, max: 1.2, step: 0.01, value: st.mus, fmt: (v) => v.toFixed(2), onInput: (v) => {
        st.mus = v; mat.set("", false);
        if (st.muk > v) { st.muk = v; rK.set(v, false); if (sliding) clean = false; } // 운동 마찰 계수는 정지 마찰 계수를 넘지 않는다
      } });
      const rK = S.range({ label: "운동 마찰 계수 μₖ", min: 0, max: 1.2, step: 0.01, value: st.muk, fmt: (v) => v.toFixed(2), onInput: (v) => {
        if (v > st.mus) { v = st.mus; rK.set(v, false); }
        st.muk = v; mat.set("", false); if (sliding) clean = false;
      } });
      S.range({ label: "질량 m", min: 0.5, max: 10, step: 0.5, value: st.m, fmt: (v) => v.toFixed(1) + " kg", onInput: (v) => (st.m = v) });
      S.check({ label: "중력의 두 성분(점선) 보기", value: st.comp, onChange: (v) => (st.comp = v) });
      S.button("다시 놓기", () => reset(), { primary: true });
      S.loop((dt) => {
        const th = rad(st.th), sn = Math.sin(th), cs = Math.cos(th);
        if (!atBottom) {
          if (!sliding && sn > st.mus * cs) { sliding = true; if (!hist.length) hist.push([0, 0]); }
          if (sliding) {
            // 뉴턴 제2법칙: 빗면 방향 알짜힘 mg sin θ − μₖN을 질량으로 나눈다. 한 단계 안에서 가속도는 일정하다
            const a = (st.m * g * sn - st.muk * st.m * g * cs) / st.m;
            let h = dt;
            if (x + v * h + 0.5 * a * h * h >= D) h = Math.abs(a) > 1e-12 ? (Math.sqrt(Math.max(0, v * v + 2 * a * (D - x))) - v) / a : (D - x) / v;
            if (a < 0 && v + a * h <= 0) { h = -v / a; sliding = false; } // 감속하다 멈춤
            x += v * h + 0.5 * a * h * h; v = sliding ? v + a * h : 0; t += h;
            if (x >= D - 1e-9) { x = D; atBottom = true; sliding = false; }
            hist.push([t, v]); vPeak = Math.max(vPeak, v);
          }
        }
        cvS.redraw(); cvG.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     3. 애트우드 기계
     ====================================================================== */
  Lab.register({
    id: "atwood", field: "phys", thumb: "atwood",
    title: "애트우드 기계 — 두 추가 만드는 느린 낙하",
    desc: "도르래에 걸린 두 추의 질량과 도르래 질량을 바꾸며 가속도와 양쪽 장력을 보고, a = (m₁ − m₂)g / (m₁ + m₂ + M/2)를 확인합니다.",
    tags: ["역학", "뉴턴 법칙", "장력", "도르래"],
    note: "해볼 것: 두 추의 질량을 거의 같게 하면 가속도가 g보다 훨씬 작아집니다. 낙하를 이렇게 느리게 만들어 관찰하는 것이 이 장치의 원래 목적입니다. 장력은 두 추의 무게 사이 값이라서 무거운 추의 무게보다 항상 작습니다. 도르래에 질량을 주면 두 장력이 달라지고, 그 차이 (M/2)a가 도르래를 돌립니다.",
    mount(S) {
      const g = 9.81, H = 1.5; // 처음 높이 (m). 내려가는 추가 이만큼 내려가면 바닥에 닿는다
      const st = { m1: 1.2, m2: 1, M: 0 };
      // 추 1이 내려간 거리 y (음수면 올라감)와 속도 v. 매개변수를 바꾸면 처음부터 다시 놓으므로 한 번 놓는 동안 가속도는 일정하다
      let y, v, t, done, hist;
      function reset() { y = 0; v = 0; t = 0; done = false; hist = [[0, 0]]; }
      reset();
      // 도르래는 균일한 원판(I = MR²/2)이고 줄은 미끄러지지 않는다: (T₁ − T₂)R = Iα, α = a/R
      const accOf = (m1) => (Math.abs(m1 - st.m2) < 1e-9 ? 0 : ((m1 - st.m2) * g) / (m1 + st.m2 + st.M / 2));
      const acc = () => accOf(st.m1);
      const tens = () => { const a = acc(); return [st.m1 * (g - a), st.m2 * (g + a)]; };
      const tEnd = () => (acc() ? Math.sqrt((2 * H) / Math.abs(acc())) : Infinity);
      function slope() {
        if (hist.length < 2) return null;
        const [t1, v1] = hist[hist.length - 1];
        for (let i = hist.length - 2; i >= 0; i--) if (t1 - hist[i][0] >= 0.25) return (v1 - hist[i][1]) / (t1 - hist[i][0]);
        return null;
      }
      const [left, right] = S.split(2);
      const cvS = S.canvas({ parent: left, aspect: 0.95, maxHeight: 400 }, (ctx, w, h) => {
        const P = VZ.palette(), cx = w / 2, cy = 58, R = 34, yf = h - 44; // 도르래 중심·반지름, 바닥
        const side = (m) => 22 + 14 * Math.cbrt(m); // 추 한 변 (px)
        const s1 = side(st.m1), s2 = side(st.m2);
        // 올라가는 추가 H만큼 올라가도 도르래에 닿지 않게 축척을 정한다
        const k = Math.min(75, (yf - cy - R - 24 - Math.max(s1, s2)) / (2 * H));
        const b1 = yf - (H - y) * k, b2 = yf - (H + y) * k, x1 = cx - R, x2 = cx + R; // 두 추의 아랫면, 두 줄의 x
        ctx.fillStyle = VZ.alpha(P.dim, 0.1); ctx.fillRect(0, yf, w, h - yf);
        ctx.strokeStyle = P.axis; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, yf); ctx.lineTo(w, yf); ctx.stroke();
        ctx.strokeStyle = VZ.alpha(P.dim, 0.5); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x1 - 50, yf - H * k); ctx.lineTo(x2 + 50, yf - H * k); ctx.stroke(); ctx.setLineDash([]);
        // 천장, 도르래, 줄
        ctx.strokeStyle = P.dim; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 16, 4); ctx.lineTo(cx + 16, 4); ctx.moveTo(cx, 4); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.strokeStyle = P.text; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x1, b1 - s1); ctx.lineTo(x1, cy); ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI); ctx.lineTo(x2, b2 - s2); ctx.stroke();
        ctx.fillStyle = VZ.alpha(P.dim, 0.12 + 0.1 * Math.min(1, st.M / 2)); ctx.strokeStyle = P.dim; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, 7); ctx.fill(); ctx.stroke();
        const phi = (-y * k) / (R - 2); // 왼쪽 줄이 내려가면 시계 반대 방향으로 돈다
        ctx.lineWidth = 1.4; ctx.beginPath();
        for (let i = 0; i < 3; i++) { const a = phi + (i * 2 * Math.PI) / 3; ctx.moveTo(cx, cy); ctx.lineTo(cx + (R - 4) * Math.cos(a), cy + (R - 4) * Math.sin(a)); }
        ctx.stroke();
        ctx.fillStyle = P.text; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, 7); ctx.fill();
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11.5, false); ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(`도르래 M = ${st.M.toFixed(1)} kg`, cx + R + 10, cy - 14);
        // 두 추
        [[x1, b1, s1, P.accent, "m₁"], [x2, b2, s2, P.accent2, "m₂"]].forEach(([xc, b, s, col, name]) => {
          ctx.fillStyle = VZ.alpha(col, 0.25); ctx.strokeStyle = col; ctx.lineWidth = 1.6;
          ctx.fillRect(xc - s / 2, b - s, s, s); ctx.strokeRect(xc - s / 2, b - s, s, s);
          ctx.fillStyle = P.text; ctx.font = VZ.font(11.5, false, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(name, xc, b - s / 2);
        });
        // 자유물체도: 추 바깥쪽에 장력(위)과 무게(아래). 네 힘을 같은 축척으로 그린다. 바닥에 닿으면 바닥이 받치므로 지운다
        if (!done) {
          const [T1, T2] = tens(), Fpx = 56 / Math.max(st.m1 * g, st.m2 * g, T1, T2);
          [[x1 - s1 / 2 - 12, b1 - s1 / 2, T1, st.m1 * g, "T₁", "m₁g", -1], [x2 + s2 / 2 + 12, b2 - s2 / 2, T2, st.m2 * g, "T₂", "m₂g", 1]].forEach(([ax, ay, T, W, nT, nW, dir]) => {
            ctx.textAlign = dir < 0 ? "right" : "left"; ctx.textBaseline = "middle"; ctx.font = VZ.font(11.5, false, 700);
            [[T * Fpx, -1, P.ok, `${nT} = ${T.toFixed(2)} N`], [W * Fpx, 1, P.text, `${nW} = ${W.toFixed(2)} N`]].forEach(([len, up, col, label]) => {
              ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.4;
              if (len >= 4) VZ.arrow(ctx, ax, ay, ax, ay + up * len, 8);
              ctx.fillText(label, ax + dir * 8, ay + up * Math.max(len - 6, 8));
            });
          });
        }
        // 왼쪽 위 안내 (좁은 화면에서도 도르래 왼쪽에 들어가게 짧은 줄로 나눈다)
        const lines = !acc() ? ["균형: a = 0", "움직이지 않습니다"]
          : done ? [`도착 ${t.toFixed(2)} s`, `이론 √(2h/a) = ${tEnd().toFixed(2)} s`, `h = ${H} m`]
          : [`t = ${t.toFixed(2)} s`, `속력 ${Math.abs(v).toFixed(2)} m/s`];
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        lines.forEach((s, i) => ctx.fillText(s, 10, 8 + i * 18));
      });
      const cvG = S.canvas({ parent: right, aspect: 0.95, maxHeight: 400 }, (ctx, w, h) => {
        const P = VZ.palette(), a = acc(), ms = VZ.linspace(0.1, 5, 246);
        VZ.chart(ctx, { x: 0, y: 0, w, h: h * 0.56 }, {
          x: [0, 5], y: [-g * 1.25, g * 1.25], xLabel: "m₁ (kg)", title: "m₁에 따른 가속도 a (m/s²)",
          series: [{ data: ms.map((m) => [m, accOf(m)]), color: P.accent, width: 2.4 }],
          hlines: [{ y: g, color: P.faint, label: "g" }, { y: -g, color: P.faint, label: "−g" }, { y: 0, color: P.axis, dash: [] }],
          vlines: [{ x: st.m2, color: P.faint, label: "m₁ = m₂" }],
          points: [{ x: st.m1, y: a, color: P.accent, r: 6 }],
        });
        const tE = tEnd(), aa = Math.abs(a);
        VZ.chart(ctx, { x: 0, y: h * 0.56, w, h: h * 0.44 }, {
          x: [0, a ? Math.max(1, tE * 1.05) : 2], y: [0, a ? Math.max(0.5, aa * tE * 1.15) : 1], xLabel: "시간 (s)", title: "속력 (m/s) — 기울기가 가속도의 크기",
          series: a ? [{ data: [[0, 0], [tE, aa * tE]], color: P.dim, width: 1.4, dash: [5, 4] }, { data: hist, color: P.accent, width: 2.2 }] : [],
          texts: a ? [] : [{ x: 1, y: 0.5, text: "a = 0 — 움직이지 않습니다", align: "center", sans: true }],
        });
      });
      const set = S.stats([{ k: "a", label: "가속도 (이론)" }, { k: "am", label: "v–t 기울기 (측정)" }, { k: "T1", label: "장력 T₁ (왼쪽)" }, { k: "T2", label: "장력 T₂ (오른쪽)" }, { k: "dT", label: "T₁ − T₂ = (M/2)a" }]);
      function readouts() {
        const a = acc(), [T1, T2] = tens(), am = slope();
        set("a", Math.abs(a).toFixed(3) + `<small>m/s²${a > 0 ? " · m₁이 내려감" : a < 0 ? " · m₂가 내려감" : ""}</small>`);
        set("am", am == null ? "—" : am.toFixed(3) + "<small>m/s²</small>");
        set("T1", T1.toFixed(2) + "<small>N</small>"); set("T2", T2.toFixed(2) + "<small>N</small>");
        set("dT", (Math.abs(T1 - T2) < 5e-3 ? 0 : T1 - T2).toFixed(2) + "<small>N</small>"); // 반올림 오차로 "-0.00"이 찍히지 않게
      }
      S.range({ label: "추 1 질량 m₁ (왼쪽)", min: 0.1, max: 5, step: 0.1, value: st.m1, fmt: (v) => v.toFixed(1) + " kg", onInput: (v) => { st.m1 = v; reset(); } });
      S.range({ label: "추 2 질량 m₂ (오른쪽)", min: 0.1, max: 5, step: 0.1, value: st.m2, fmt: (v) => v.toFixed(1) + " kg", onInput: (v) => { st.m2 = v; reset(); } });
      S.range({ label: "도르래 질량 M (균일한 원판)", min: 0, max: 5, step: 0.1, value: st.M, fmt: (v) => v.toFixed(1) + " kg", onInput: (v) => { st.M = v; reset(); } });
      S.button("다시 놓기", () => reset(), { primary: true });
      S.loop((dt) => {
        const a = acc();
        if (!done && a) {
          // 정지 상태에서 놓았고 가속도가 일정하므로 y = ½at², v = at. 바닥에 닿는 시각에서 멈춘다
          t = Math.min(t + dt, tEnd()); y = 0.5 * a * t * t; v = a * t;
          if (t >= tEnd()) done = true;
          hist.push([t, Math.abs(v)]);
        }
        cvS.redraw(); cvG.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     4. 원운동과 구심력 (경사 커브)
     ====================================================================== */
  Lab.register({
    id: "banked-curve", field: "phys", thumb: "banked",
    title: "경사 커브 — 원운동의 구심력은 누가 낼까",
    desc: "커브 반지름, 경사각, 노면 마찰 계수, 자동차 속력을 바꾸며 수직항력과 마찰력이 구심력을 어떻게 나눠 내는지 보고, 미끄러지지 않는 속력 범위와 이상 속력 √(gR tan θ)를 확인합니다.",
    tags: ["역학", "원운동", "구심력", "마찰"],
    note: "해볼 것: 경사각을 0°로 두면 평평한 도로라서 구심력을 마찰력만 냅니다. 이때 최대 속력은 √(μgR)입니다. 경사를 주면 수직항력의 안쪽 성분이 구심력을 보태 안전한 속력 범위가 넓어지고, 이상 속력 √(gR tan θ)에서는 마찰 없이도 커브를 돕니다. 빙판에서 경사가 있는 커브를 너무 천천히 돌면 안쪽으로 미끄러져 내려가는 것도 확인해 보세요.",
    mount(S) {
      const g = 9.81, KMH = 3.6, VMAX = 200; // 속력 슬라이더와 그래프의 최대값 (km/h)
      const MU = { dry: 0.8, wet: 0.5, snow: 0.25, ice: 0.1 }; // 노면별 정지 마찰 계수 대략값
      const st = { v: 70, R: 80, th: 15, mu: 0.5 };
      const rad = (d) => (d * Math.PI) / 180;
      let phi = 0; // 위에서 본 궤도 위 자동차의 각도
      // 수평으로 중심을 향하는 구심력 mv²/R을 수직항력 N과 도로 면을 따라 안쪽(아래)으로 향하는 마찰력 f가 함께 낸다:
      //   N sin θ + f cos θ = mv²/R,  N cos θ − f sin θ = mg.  모두 mg 단위로 돌려준다 (ac = v²/gR)
      function need(v, th = rad(st.th)) {
        const ac = (v * v) / (g * st.R);
        return { N: Math.cos(th) + ac * Math.sin(th), f: ac * Math.cos(th) - Math.sin(th), ac };
      }
      /** 미끄러지지 않는 속력 범위 [v_min, v_max] (m/s). |f| ≤ μN에서 나온다. 위쪽 한계가 없으면 Infinity */
      function range(th = rad(st.th)) {
        const s = Math.sin(th), c = Math.cos(th), m = st.mu, eps = 1e-9; // eps: 45°, μ = 1처럼 정확히 0이어야 할 분모의 반올림 오차
        const lo = s - m * c <= eps ? 0 : Math.sqrt((g * st.R * (s - m * c)) / (c + m * s));
        const hi = c - m * s <= eps ? Infinity : Math.sqrt((g * st.R * (s + m * c)) / (c - m * s));
        return [lo, hi];
      }
      const ideal = (th = rad(st.th)) => Math.sqrt(g * st.R * Math.tan(th));
      const state = () => { const n = need(st.v / KMH); return Object.assign(n, { ok: Math.abs(n.f) <= st.mu * n.N + 1e-12 }); };
      const [left, right] = S.split(2);
      const cvS = S.canvas({ parent: left, aspect: 0.95, maxHeight: 440 }, (ctx, w, h) => {
        const P = VZ.palette(), s = state(), th = rad(st.th), c = Math.cos(th), sn = Math.sin(th);
        const slip = s.ok ? 0 : s.f > 0 ? 1 : -1; // 1: 바깥쪽으로, −1: 안쪽으로 미끄러짐
        const carCol = slip ? P.bad : P.accent;
        // 화살표: 길이가 4px 미만이면 생략하고, 이름은 차를 비켜 단다. vpos("above"·"below")를 주면 이름을 화살표 끝의 위·아래에 단다
        const arrow = (C, dx, dy, col, label, dash, clear, vpos) => {
          const len = Math.hypot(dx, dy);
          if (len < 4) return;
          const ux = dx / len, uy = dy / len, side = Math.abs(ux) > 0.35;
          ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = dash ? 1.6 : 2.4; ctx.setLineDash(dash ? [5, 4] : []);
          VZ.arrow(ctx, C[0], C[1], C[0] + dx, C[1] + dy, 8); ctx.setLineDash([]);
          if (!label) return;
          const r = Math.max(len, clear), lx = C[0] + ux * r, ly = C[1] + uy * r;
          ctx.font = VZ.font(11.5, false, 700);
          ctx.textAlign = side && ux < 0 ? "right" : "left";
          if (vpos) { ctx.textBaseline = vpos === "above" ? "bottom" : "top"; ctx.fillText(label, lx, ly + (vpos === "above" ? -5 : 5)); return; }
          ctx.textBaseline = side ? (uy > 0.35 ? "top" : uy < -0.35 ? "bottom" : "middle") : "middle";
          ctx.fillText(label, side ? lx + ux * 6 : lx + 8, side ? ly + uy * 6 : ly - 4);
        };
        // ── 위에서 본 모습: 원 궤도를 시계 반대 방향으로 도는 자동차
        const top = h * 0.38, ox = w / 2, oy = top / 2 + 10, r = Math.min(w * 0.28, top / 2 - 18);
        ctx.strokeStyle = VZ.alpha(P.dim, 0.22); ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(ox, oy, r, 0, 7); ctx.stroke();
        ctx.strokeStyle = VZ.alpha(P.dim, 0.6); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox - r * 0.707, oy + r * 0.707); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = P.dim; ctx.beginPath(); ctx.arc(ox, oy, 3, 0, 7); ctx.fill();
        ctx.font = VZ.font(11.5, false); ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText(`R = ${st.R} m`, ox - r * 0.36 - 4, oy + r * 0.36);
        const cp = [ox + r * Math.cos(phi), oy - r * Math.sin(phi)], tv = [-Math.sin(phi), -Math.cos(phi)], tc = [-Math.cos(phi), Math.sin(phi)];
        ctx.save(); ctx.translate(cp[0], cp[1]); ctx.rotate(Math.atan2(tv[1], tv[0]));
        ctx.fillStyle = carCol; ctx.fillRect(-9, -5, 18, 10); ctx.restore();
        if (st.v > 0) {
          arrow(cp, tv[0] * 34, tv[1] * 34, P.text, "v", false, 12);
          arrow(cp, tc[0] * 26, tc[1] * 26, P.accent2, "a", false, 12);
        }
        if (slip) arrow(cp, -tc[0] * slip * 24, -tc[1] * slip * 24, P.bad); // 미끄러지는 쪽
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("위에서 본 모습 · 4배속", 10, 8);
        ctx.fillText(st.v > 0 ? `한 바퀴 ${((2 * Math.PI * st.R) / (st.v / KMH)).toFixed(1)} s` : "정지", 10, 26);
        // ── 앞에서 본 단면: 도로는 바깥쪽(오른쪽)이 높고, 곡선 중심은 왼쪽에 있다
        const y0 = top + 4;
        ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, y0); ctx.lineTo(w - 10, y0); ctx.stroke();
        ctx.fillStyle = P.dim; ctx.fillText("앞에서 본 단면 · 자유물체도", 10, y0 + 6);
        ctx.fillText("← 곡선 중심 쪽", 10, y0 + 24);
        const O = [w * 0.56, h - 58], d = [c, -sn], n = [-sn, -c], q = [-c, sn]; // 바퀴가 닿는 점, 도로 방향(바깥쪽 위), 도로 법선, 도로를 따라 안쪽 아래
        ctx.save(); ctx.beginPath(); ctx.rect(0, y0, w, h - y0); ctx.clip();
        ctx.fillStyle = VZ.alpha(P.dim, 0.14); ctx.strokeStyle = P.dim; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(O[0] - d[0] * w, O[1] - d[1] * w); ctx.lineTo(O[0] + d[0] * w, O[1] + d[1] * w); ctx.lineTo(w + 10, h + 10); ctx.lineTo(-10, h + 10); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(O[0] - d[0] * w, O[1] - d[1] * w); ctx.lineTo(O[0] + d[0] * w, O[1] + d[1] * w); ctx.stroke();
        ctx.restore();
        const C = [O[0] + n[0] * 15, O[1] + n[1] * 15]; // 차의 질량 중심
        ctx.save(); ctx.translate(C[0], C[1]); ctx.rotate(-th);
        ctx.fillStyle = VZ.alpha(carCol, 0.25); ctx.strokeStyle = carCol; ctx.lineWidth = 1.6;
        ctx.fillRect(-30, -20, 60, 24); ctx.strokeRect(-30, -20, 60, 24);
        ctx.fillStyle = P.text; [-18, 18].forEach((x) => { ctx.beginPath(); ctx.arc(x, 9, 6, 0, 7); ctx.fill(); });
        ctx.restore();
        ctx.fillStyle = P.text; ctx.beginPath(); ctx.arc(C[0], C[1], 3, 0, 7); ctx.fill();
        // 힘은 mg 단위. 미끄러질 때는 마찰력이 최대 정지 마찰력 μN에서 멈추므로 필요한 구심력에 못 미친다
        const fShow = VZ.clamp(s.f, -st.mu * s.N, st.mu * s.N), unit = Math.min(64, 120 / Math.max(1, s.N, Math.abs(fShow), s.ac));
        arrow(C, 0, unit, P.text, "mg", false, 34);
        arrow(C, n[0] * unit * s.N, n[1] * unit * s.N, P.ok, `N = ${s.N.toFixed(2)} mg`, false, 34);
        // 마찰력과 구심력은 둘 다 왼쪽을 향하기 쉬우니 이름을 아래·위로 나눠 단다
        arrow(C, q[0] * unit * fShow, q[1] * unit * fShow, P.accent, `f = ${Math.abs(fShow).toFixed(2)} mg${slip ? " (최대)" : ""}`, false, 34, "below");
        arrow(C, -unit * s.ac, 0, P.accent2, `mv²/R = ${s.ac.toFixed(2)} mg`, true, 34, "above");
      });
      const cvG = S.canvas({ parent: right, aspect: 0.95, maxHeight: 440 }, (ctx, w, h) => {
        const P = VZ.palette(), s = state(), [lo, hi] = range(), v0 = ideal() * KMH, vs = VZ.linspace(0, VMAX, 201);
        const at = (v) => need(v / KMH), dotCol = s.ok ? P.ok : P.bad;
        VZ.chart(ctx, { x: 0, y: 0, w, h: h * 0.52 }, {
          x: [0, VMAX], y: [-1.5, 1.5], xLabel: "속력 (km/h)", title: "속력에 따른 필요한 마찰력 f (mg 단위)",
          bands: [{ x0: Math.min(lo * KMH, VMAX), x1: Math.min(hi * KMH, VMAX), color: VZ.alpha(P.ok, 0.12) }],
          series: [
            { data: vs.map((v) => [v, st.mu * at(v).N]), color: P.accent2, width: 1.4, dash: [4, 4] },
            { data: vs.map((v) => [v, -st.mu * at(v).N]), color: P.accent2, width: 1.4, dash: [4, 4] },
            { data: vs.map((v) => [v, at(v).f]), color: P.accent, width: 2.4 },
          ],
          hlines: [{ y: 0, color: P.axis, dash: [] }],
          vlines: v0 <= VMAX ? [{ x: v0, color: P.faint, label: "이상 속력" }] : [],
          points: [{ x: st.v, y: s.f, color: dotCol, r: 6 }],
          texts: [{ x: VMAX - 3, y: 1.32, text: "+ 마찰이 안쪽으로", align: "right", sans: true }, { x: VMAX - 3, y: -1.32, text: "− 마찰이 바깥쪽으로", align: "right", sans: true }],
        });
        // 경사각을 훑으며 안전 속력 범위를 칠한다. 위쪽 한계가 없으면 그래프 위끝까지
        const ths = VZ.linspace(0, 45, 181), rr = ths.map((a) => range(rad(a))), cap = (v) => Math.min(v * KMH, VMAX);
        const C = VZ.chart(ctx, { x: 0, y: h * 0.52, w, h: h * 0.48 }, {
          x: [0, 45], y: [0, VMAX], xLabel: "경사각 θ (°)", title: "경사각에 따른 안전 속력 범위 (km/h)",
          series: [
            { data: ths.map((a, i) => [a, cap(rr[i][1])]), color: P.accent2, width: 1.6, dash: [4, 4] },
            { data: ths.map((a, i) => [a, cap(rr[i][0])]), color: P.accent2, width: 1.6, dash: [4, 4] },
            { data: ths.map((a) => [a, cap(ideal(rad(a)))]), color: P.dim, width: 1.4, dash: [6, 4] },
          ],
          vlines: [{ x: st.th, color: P.faint }],
          points: [{ x: st.th, y: Math.min(st.v, VMAX), color: dotCol, r: 6 }],
        });
        ctx.fillStyle = VZ.alpha(P.ok, 0.12); ctx.beginPath();
        ths.forEach((a, i) => (i ? ctx.lineTo(C.X(a), C.Y(cap(rr[i][1]))) : ctx.moveTo(C.X(a), C.Y(cap(rr[i][1])))));
        for (let i = ths.length - 1; i >= 0; i--) ctx.lineTo(C.X(ths[i]), C.Y(cap(rr[i][0])));
        ctx.closePath(); ctx.fill();
      });
      S.legend([
        { label: "필요한 마찰력", color: (P) => P.accent },
        { label: "최대 정지 마찰력 ±μN", color: (P) => P.accent2, dash: true },
        { label: "이상 속력", color: (P) => P.dim, dash: true },
        { label: "미끄러지지 않는 범위", color: (P) => VZ.alpha(P.ok, 0.45) },
      ]);
      const set = S.stats([{ k: "st", label: "상태" }, { k: "v0", label: "이상 속력 √(gR tan θ)" }, { k: "rg", label: "미끄러지지 않는 속력" }, { k: "f", label: "필요한 마찰 / 최대 정지 마찰" }, { k: "ac", label: "구심 가속도 v²/R" }]);
      function readouts() {
        const s = state(), [lo, hi] = range(), kmh = (x) => (x * KMH).toFixed(1);
        set("st", !s.ok ? `<span style="color:var(--bad)">${s.f > 0 ? "바깥쪽" : "안쪽"}으로 미끄러짐</span>`
          : Math.abs(s.f) < 0.005 ? "안전 <small>마찰 없이 돎</small>" : `안전 <small>마찰이 ${s.f > 0 ? "안쪽" : "바깥쪽"}으로</small>`);
        set("v0", kmh(ideal()) + "<small>km/h</small>");
        set("rg", `${kmh(lo)} ~ ${isFinite(hi) ? kmh(hi) : "∞"}<small>km/h</small>`);
        set("f", `${Math.abs(s.f).toFixed(2)} / ${(st.mu * s.N).toFixed(2)}<small>mg</small>`);
        set("ac", (s.ac * g).toFixed(2) + `<small>m/s² · ${s.ac.toFixed(2)} g</small>`);
      }
      S.range({ label: "속력 v", min: 0, max: VMAX, step: 1, value: st.v, fmt: (v) => v + " km/h", onInput: (v) => (st.v = v) });
      S.range({ label: "커브 반지름 R", min: 20, max: 300, step: 5, value: st.R, fmt: (v) => v + " m", onInput: (v) => (st.R = v) });
      S.range({ label: "경사각 θ", min: 0, max: 45, step: 0.5, value: st.th, fmt: (v) => v + "°", onInput: (v) => (st.th = v) });
      const road = S.seg({ label: "노면 (대략값)", options: [["dry", "마른 도로"], ["wet", "젖은 도로"], ["snow", "눈길"], ["ice", "빙판"]], value: "wet", onChange: (key) => { st.mu = MU[key]; rMu.set(st.mu, false); } });
      const rMu = S.range({ label: "정지 마찰 계수 μₛ", min: 0, max: 1.2, step: 0.01, value: st.mu, fmt: (v) => v.toFixed(2), onInput: (v) => { st.mu = v; road.set("", false); } });
      S.loop((dt) => {
        phi += (st.v / KMH / st.R) * dt * 4; // 4배속
        cvS.redraw(); cvG.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     5. 역학적 에너지 보존 (연직 루프)
     ====================================================================== */
  Lab.register({
    id: "loop", field: "phys", thumb: "loop",
    title: "연직 루프 — 꼭대기를 돌려면 얼마나 높이서 출발해야 할까",
    desc: "출발 높이, 루프 반지름, 마찰을 바꾸며 미끄러져 내려온 물체가 연직 루프를 도는지 봅니다. 운동·위치·열 에너지 막대와 꼭대기의 수직항력으로 최소 출발 높이 2.5R을 확인합니다.",
    tags: ["역학", "에너지 보존", "원운동", "수직항력"],
    note: "해볼 것: 마찰이 없을 때 출발 높이가 루프 반지름의 2.5배(2.5R)보다 낮으면 물체가 꼭대기에 닿기 전에 트랙에서 떨어집니다. 꼭대기에서도 원운동을 하려면 중력만으로 구심력이 되는 v² ≥ gR이 필요하기 때문입니다. h = 2R로 놓으면 떨어지는 높이가 5R/3인지 확인해 보세요. 마찰을 주면 열로 빠져나간 에너지만큼 더 높이서 출발해야 합니다. 에너지 막대의 합은 언제나 처음 위치 에너지 mgh와 같습니다. (굴러가는 공이라면 회전 운동 에너지 때문에 2.7R이 필요합니다.)",
    mount(S) {
      const g = 9.81, BETA = Math.PI / 4, RF = 0.6; // 비탈 기울기 45°, 비탈과 바닥을 잇는 오목한 곡선의 반지름 (m)
      const st = { h: 2, R: 1, mu: 0, rate: 0.5 };
      /** 출발 높이 h, 루프 반지름 R인 트랙. 트랙을 따라 잰 길이 s로 위치를 나타낸다.
          45° 비탈 → 오목한 곡선 → 평지 → 루프(시계 반대 방향으로 한 바퀴) → 나가는 평지 */
      function build(h, R) {
        const sb = Math.sin(BETA), cb = Math.cos(BETA);
        const d = (h - RF * (1 - cb)) / sb, xf = d * cb + RF * sb, gap = 0.3 + 0.5 * R, xL = xf + gap;
        // 각 조각은 at(u) → 위치 p, 진행 방향 T, 트랙이 미는 방향 n, 곡률 k (n 쪽으로 휜 정도)
        const line = (p0, T, len) => ({ len, at: (u) => ({ p: [p0[0] + T[0] * u, p0[1] + T[1] * u], T, n: [-T[1], T[0]], k: 0 }) });
        const arc = (c, r, a0, sweep) => ({ len: r * sweep, at: (u) => {
          const a = a0 + u / r, ca = Math.cos(a), sa = Math.sin(a);
          return { p: [c[0] + r * ca, c[1] + r * sa], T: [-sa, ca], n: [-ca, -sa], k: 1 / r }; // 물체는 원의 안쪽에 있다
        } });
        const segs = [
          line([0, h], [cb, -sb], d),
          arc([xf, RF], RF, -Math.PI / 2 - BETA, BETA),
          line([xf, 0], [1, 0], gap),
          arc([xL, R], R, -Math.PI / 2, 2 * Math.PI),
          line([xL, 0], [1, 0], 1.5 * R + 0.5),
        ];
        const starts = [];
        let total = 0;
        segs.forEach((sg) => { starts.push(total); total += sg.len; });
        return {
          segs, total, xL, xf, R, sFlat: starts[2], sTop: starts[3] + Math.PI * R,
          at(s) { let i = segs.length - 1; while (i > 0 && s < starts[i]) i--; return Object.assign(segs[i].at(VZ.clamp(s - starts[i], 0, segs[i].len)), { seg: i }); },
        };
      }
      // 트랙 위 운동 (질량 1 kg당): 수직항력 N = kv² + g nᵧ, 접선 가속도 = −g Tᵧ − μN sgn v. N이 음수면 트랙이 끌어당겨야 한다
      const normal = (q, v) => q.k * v * v + g * q.n[1];
      // 상태 [s, v, Q]. 마찰열 Q도 같은 단계로 적분해야 K + U + Q가 처음 mgh와 맞는다
      const deriv = (tr) => ([s, v]) => {
        const q = tr.at(s), fr = st.mu * Math.max(0, normal(q, v));
        return [v, -g * q.T[1] - fr * Math.sign(v), fr * Math.abs(v)];
      };
      /** 한 단계 적분. 조각 경계(곡률이 갑자기 바뀌어 마찰력이 뛰는 곳)를 넘거나 방향이 바뀌면 잘게 나눠 다시 적분한다.
          마찰이 있을 때 방향이 바뀌면 그 순간에서 멈추고 turned를 알린다 */
      function advance(tr, y, h) {
        const f = deriv(tr), flips = (a, b) => st.mu && a[1] && Math.sign(b[1]) !== Math.sign(a[1]);
        let y1 = rk4(f, y, h);
        if (tr.at(y1[0]).seg === tr.at(y[0]).seg && !flips(y, y1)) return { y: y1, turned: false };
        y1 = y;
        for (let i = 0; i < 64; i++) {
          const y2 = rk4(f, y1, h / 64);
          if (flips(y1, y2)) return { y: [y2[0], 0, y2[2]], turned: true };
          y1 = y2;
        }
        return { y: y1, turned: false };
      }
      /** 출발 높이 h에서 꼭대기를 지날 때의 수직항력 (mg 단위). 꼭대기 높이까지 못 올라가면 null. 떨어지는 것은 따지지 않는다 */
      function topN(h) {
        if (!st.mu) return h >= 2 * st.R ? (2 * h) / st.R - 5 : null; // 에너지 보존: v² = 2g(h − 2R), N/mg = v²/gR − 1
        const tr = build(h, st.R);
        let y = [0, 0, 0];
        for (let i = 0; i < 20000; i++) {
          y = advance(tr, y, 0.002).y;
          if (y[1] <= 0) return null;
          if (y[0] >= tr.sTop) return (y[1] * y[1]) / (g * st.R) - 1;
        }
        return null;
      }
      // 출발 높이에 따른 꼭대기 수직항력 곡선과 그것이 0이 되는 최소 출발 높이. R·μ가 바뀔 때만 다시 계산한다
      let curveKey = "", curve = [], hMin = null;
      function topCurve() {
        const key = st.R + "|" + st.mu;
        if (key === curveKey) return;
        curveKey = key; curve = []; hMin = null;
        for (let i = 0; i <= 90; i++) { const h = 0.5 + i * 0.05; curve.push([h, topN(h)]); }
        for (let i = 1; i < curve.length && hMin == null; i++) {
          const [h0, a] = curve[i - 1], [h1, b] = curve[i];
          if (a != null && b != null && a < 0 && b >= 0) hMin = h0 + (-a / (b - a)) * (h1 - h0);
        }
      }
      // 한 번 출발한 상태: 트랙 위(track) → 트랙을 떠나 날아감(air) → 끝(done: pass·fell·stopped)
      let tr, mode, s, v, p, vel, Q, t, tAir, trail, airPath, result, Ntop, detach;
      function reset() {
        topCurve();
        tr = build(st.h, st.R); mode = "track"; s = 0; v = 0; Q = 0; t = 0; tAir = 0;
        trail = []; airPath = []; result = null; Ntop = null; detach = null;
      }
      reset();
      function step(dt) {
        if (mode === "track") {
          const s0 = s, r = advance(tr, [s, v, Q], dt);
          [s, v, Q] = r.y;
          if (s < 0) { s = 0; v = Math.max(0, v); } // 출발점보다 위로는 못 간다
          const q = tr.at(s), N = normal(q, v);
          if (s0 < tr.sTop && s >= tr.sTop && q.seg === 3) Ntop = N / g;
          // 방향이 바뀌는 순간 정지 마찰이 버티면 멈춘다
          if (r.turned && Math.abs(g * q.T[1]) <= st.mu * Math.max(0, normal(q, 0))) { mode = "done"; result = "stopped"; }
          if (q.seg === 3 && N < 0) { // 루프에서 수직항력이 음수가 되면 트랙을 떠나 포물선 운동을 한다
            mode = "air"; p = q.p.slice(); vel = [q.T[0] * v, q.T[1] * v]; detach = { y: q.p[1] }; airPath = [p.slice()];
          } else if (s >= tr.total) { s = tr.total; mode = "done"; result = "pass"; }
        } else if (mode === "air") {
          p = [p[0] + vel[0] * dt, p[1] + vel[1] * dt - 0.5 * g * dt * dt]; vel[1] -= g * dt; tAir += dt;
          airPath.push(p.slice());
          if (tAir > 0.02 && Math.hypot(p[0] - tr.xL, p[1] - tr.R) >= tr.R) { mode = "done"; result = "fell"; } // 다시 루프에 닿음
        }
        t += dt;
      }
      const flying = () => mode === "air" || result === "fell";
      const pos = () => (flying() ? p : tr.at(s).p);
      const energy = () => (flying() ? { K: 0.5 * (vel[0] ** 2 + vel[1] ** 2), U: g * p[1] } : { K: 0.5 * v * v, U: g * tr.at(s).p[1] });
      const cvS = S.canvas({ aspect: 0.46, minHeight: 240, maxHeight: 330 }, (ctx, w, hc) => {
        const P = VZ.palette(), R = tr.R, xmin = -0.3, xmax = tr.xL + 1.5 * R + 0.7, ymax = Math.max(st.h, 2 * R, hMin || 0) + 0.35;
        // 맨 위 30px는 진행 문구 자리로 남긴다
        const Yg = hc - 24, k = Math.min((w - 20) / (xmax - xmin), (Yg - 34) / ymax), off = (w - 20 - (xmax - xmin) * k) / 2;
        const X = (x) => 10 + off + (x - xmin) * k, Y = (y) => Yg - y * k;
        ctx.fillStyle = VZ.alpha(P.dim, 0.1); ctx.fillRect(0, Yg, w, hc - Yg);
        ctx.strokeStyle = P.axis; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, Yg); ctx.lineTo(w, Yg); ctx.stroke();
        // 비탈 아래의 언덕과 트랙
        const pts = [];
        for (let u = 0; u <= tr.total + 1e-9; u += 0.02) pts.push(tr.at(u).p);
        ctx.fillStyle = VZ.alpha(P.dim, 0.14); ctx.beginPath(); ctx.moveTo(X(0), Y(0));
        for (let u = 0; u <= tr.sFlat + 1e-9; u += 0.02) { const q = tr.at(u).p; ctx.lineTo(X(q[0]), Y(q[1])); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = P.dim; ctx.lineWidth = 3; ctx.beginPath();
        pts.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.stroke();
        // 기준선: 출발 높이와 최소 출발 높이
        ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.font = VZ.font(11.5, false);
        ctx.strokeStyle = P.faint; ctx.beginPath(); ctx.moveTo(X(0), Y(st.h)); ctx.lineTo(X(tr.xL + R), Y(st.h)); ctx.stroke();
        ctx.fillStyle = P.dim; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(`출발 h = ${st.h.toFixed(2)} m`, X(0) + 12, Y(st.h) - 3);
        if (hMin) {
          ctx.strokeStyle = P.accent2; ctx.beginPath(); ctx.moveTo(X(tr.xf), Y(hMin)); ctx.lineTo(X(xmax), Y(hMin)); ctx.stroke();
          ctx.fillStyle = P.accent2; ctx.textAlign = "right"; ctx.fillText(`최소 높이 ${hMin.toFixed(2)} m`, X(xmax) - 2, Y(hMin) - 3);
        }
        ctx.setLineDash([]);
        // 지나온 길, 트랙을 떠난 뒤의 포물선, 물체
        ctx.strokeStyle = VZ.alpha(P.accent, 0.35); ctx.lineWidth = 2; ctx.beginPath();
        trail.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.stroke();
        if (airPath.length) {
          ctx.strokeStyle = P.bad; ctx.setLineDash([4, 3]); ctx.beginPath();
          airPath.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.stroke(); ctx.setLineDash([]);
        }
        const b = pos(), bx = X(b[0]), by = Y(b[1]);
        if (mode === "track") { // 수직항력과 중력 화살표 (mg = 22px)
          const q = tr.at(s), N = Math.max(0, normal(q, v)) / g, len = Math.min(80, 22 * N);
          ctx.lineWidth = 2.2; ctx.font = VZ.font(11.5, false, 700); ctx.textBaseline = "middle";
          ctx.strokeStyle = P.text; ctx.fillStyle = P.text; VZ.arrow(ctx, bx, by, bx, by + 22, 7);
          if (len >= 4) {
            const ex = bx + q.n[0] * len, ey = by - q.n[1] * len;
            ctx.strokeStyle = P.ok; ctx.fillStyle = P.ok; VZ.arrow(ctx, bx, by, ex, ey, 7);
            ctx.textAlign = q.n[0] < -0.3 ? "right" : "left"; ctx.fillText(`N = ${N.toFixed(2)} mg`, ex + (q.n[0] < -0.3 ? -6 : 6), ey - (q.n[1] > 0.3 ? 8 : q.n[1] < -0.3 ? -8 : 0));
          }
        }
        ctx.fillStyle = flying() ? P.bad : P.accent; ctx.beginPath(); ctx.arc(bx, by, 7, 0, 7); ctx.fill();
        const speed = flying() ? Math.hypot(vel[0], vel[1]) : Math.abs(v);
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`t = ${t.toFixed(2)} s · 속력 ${speed.toFixed(2)} m/s · ${st.rate === 1 ? "실제 속도" : st.rate + "배속"}`, 10, 8);
      });
      const [bl, br] = S.split(2);
      const cvE = S.canvas({ parent: bl, height: 210 }, (ctx) => {
        const P = VZ.palette(), E0 = g * st.h, { K, U } = energy(), names = ["운동 K", "위치 U", "열 Q", "합"];
        VZ.chart(ctx, null, {
          x: [-0.6, 3.6], y: [0, E0 * 1.18], xTicks: [0, 1, 2, 3], xFmt: (x) => names[Math.round(x)] || "", title: "에너지 (J, 질량 1 kg)",
          series: [[K, P.accent], [U, P.accent2], [Q, P.warn], [K + U + Q, P.dim]].map(([e, col], i) => ({ type: "bar", data: [[i, e]], color: col, barWidth: 0.62 })),
          hlines: [{ y: E0, color: P.faint, label: `처음 mgh = ${E0.toFixed(1)} J` }],
        });
      });
      const cvN = S.canvas({ parent: br, height: 210 }, (ctx) => {
        const P = VZ.palette(), i = Math.round((st.h - 0.5) / 0.05), cur = curve[i] && curve[i][1];
        VZ.chart(ctx, null, {
          x: [0.5, 5], y: [-1, 5], xLabel: "출발 높이 h (m)", title: "꼭대기 수직항력 N/mg",
          hbands: [{ y0: -1, y1: 0, color: VZ.alpha(P.bad, 0.08) }],
          series: [{ data: curve.map(([h, n]) => [h, n == null ? NaN : n]), color: P.accent, width: 2.2 }],
          hlines: [{ y: 0, color: P.axis, dash: [] }],
          vlines: hMin ? [{ x: hMin, color: P.accent2, label: `${(hMin / st.R).toFixed(2)}R`, align: hMin > 3.8 ? "right" : "left" }] : [],
          points: cur != null ? [{ x: st.h, y: VZ.clamp(cur, -1, 5), color: P.accent, r: 5 }] : [],
          // 곡선은 꼭대기에 닿을 수 있는 높이(2R 이상)부터 시작하므로 이 글은 곡선이 없는 왼쪽에 둔다
          texts: [{ x: 0.6, y: -0.5, text: "꼭대기 전에 떨어짐", align: "left", sans: true, color: P.bad }],
        });
      });
      const set = S.stats([{ k: "res", label: "결과" }, { k: "hmin", label: "최소 출발 높이" }, { k: "nt", label: "꼭대기 수직항력" }, { k: "det", label: "트랙을 떠난 높이" }, { k: "E", label: "K + U + Q" }]);
      function readouts() {
        const { K, U } = energy(), bad = (s) => `<span style="color:var(--bad)">${s}</span>`;
        set("res", result === "pass" ? "루프 통과" : result === "fell" ? bad("루프에서 떨어짐") : result === "stopped" ? "마찰로 멈춤"
          : mode === "air" ? bad("트랙을 떠남") : v < 0 ? "되돌아 내려오는 중" : "달리는 중");
        set("hmin", hMin ? `${hMin.toFixed(2)}<small>m · ${(hMin / st.R).toFixed(2)}R</small>` : "5 m 넘음");
        set("nt", Ntop != null ? Ntop.toFixed(2) + "<small>mg</small>" : "—");
        set("det", detach ? `${detach.y.toFixed(2)}<small>m · ${(detach.y / st.R).toFixed(3)}R</small>` : "—");
        set("E", (((K + U + Q) / (g * st.h)) * 100).toFixed(2) + "<small>% (처음 mgh 대비)</small>");
      }
      S.range({ label: "출발 높이 h", min: 0.5, max: 5, step: 0.05, value: st.h, fmt: (x) => x.toFixed(2) + " m", onInput: (x) => { st.h = x; reset(); } });
      S.range({ label: "루프 반지름 R", min: 0.4, max: 1.5, step: 0.05, value: st.R, fmt: (x) => x.toFixed(2) + " m", onInput: (x) => { st.R = x; reset(); } });
      S.range({ label: "운동 마찰 계수 μ", min: 0, max: 0.3, step: 0.01, value: st.mu, fmt: (x) => x.toFixed(2), onInput: (x) => { st.mu = x; reset(); } });
      S.seg({ label: "재생 속도", options: [["0.25", "¼배"], ["0.5", "½배"], ["1", "실제"]], value: "0.5", onChange: (x) => (st.rate = Number(x)) });
      S.button("다시 출발", () => reset(), { primary: true });
      S.loop((dt) => {
        if (mode !== "done") {
          const T = dt * st.rate, n = Math.ceil(T / 0.001); // 1 ms보다 잘게 나눠 적분한다
          for (let i = 0; i < n && mode !== "done"; i++) step(T / n);
        }
        trail.push(pos().slice()); if (trail.length > 600) trail.shift();
        cvS.redraw(); cvE.redraw(); cvN.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     6. 충돌과 운동량 보존
     ====================================================================== */
  Lab.register({
    id: "collision", field: "phys", thumb: "collision",
    title: "충돌 — 운동량은 늘 보존되고, 운동 에너지는 탄성 충돌에서만 보존된다",
    desc: "두 공의 질량, 반발 계수, 처음 속도를 바꾸며 일직선 충돌과 비껴 맞는 2차원 충돌을 봅니다. 충돌 전후의 운동량·운동 에너지 막대와 질량중심의 움직임으로 운동량 보존을 확인합니다.",
    tags: ["역학", "운동량 보존", "충돌", "반발 계수"],
    note: "해볼 것: 질량이 같은 두 공이 탄성 충돌(e = 1)하면 일직선에서는 속도를 맞바꾸고, 비껴 맞으면 직각(90°)으로 갈라집니다. 무거운 공이 멈춰 있는 가벼운 공을 때리면 가벼운 공은 처음 속도의 두 배 가까이로 튀어 나가고, 가벼운 공이 무거운 공을 때리면 거의 같은 속력으로 되튑니다. 반발 계수를 낮추면 운동 에너지는 줄지만 운동량의 합은 그대로이고, 질량중심(점선)은 충돌과 상관없이 같은 속도로 곧게 갑니다. 일직선에서 e = 0이면 두 공이 붙어서 질량중심과 함께 움직입니다. 위치–시간 그래프에서는 선이 많이 기울수록 빠르고, 멈춘 공은 세로선이 됩니다.",
    mount(S) {
      const L = 8, H = 2.2; // 화면의 가로 길이, 2차원 탁자의 세로 반폭 (m)
      const st = { dim: 1, m1: 1, m2: 1, e: 1, v1: 2, v2: 0, b: 0.5, rate: 0.5 };
      const rad = (m) => 0.22 * Math.cbrt(m); // 밀도가 같은 공이라 반지름은 질량의 세제곱근에 비례한다
      const kin = (m, v) => 0.5 * m * (v[0] ** 2 + v[1] ** 2);
      const f2 = (x) => (Math.abs(x) < 5e-3 ? 0 : x).toFixed(2); // 반올림 오차로 "-0.00"이 찍히지 않게
      /** 매끄러운 두 공(마찰·회전 없음)의 충돌. 충격량은 접촉한 두 중심을 잇는 방향 n으로만 작용하고,
          그 방향의 상대 속도가 e배로 줄며 뒤집힌다: J = (1 + e) m₁m₂/(m₁ + m₂) · (u₁ − u₂)·n */
      function bounce(m1, m2, e, n, u1, u2) {
        const J = ((1 + e) * m1 * m2 * ((u1[0] - u2[0]) * n[0] + (u1[1] - u2[1]) * n[1])) / (m1 + m2);
        return [[u1[0] - (J / m1) * n[0], u1[1] - (J / m1) * n[1]], [u2[0] + (J / m2) * n[0], u2[1] + (J / m2) * n[1]]];
      }
      // 2차원: 공 2의 중심이 공 1의 진행선에서 d = b(r₁ + r₂)만큼 아래에 있을 때 접촉 순간 공 1 → 공 2 방향
      const normalOf = (b) => [Math.sqrt(1 - b * b), -b];
      /** 두 속도 벡터 사이의 각 (°). 한쪽이 멈추면 NaN */
      const between = (a, b) => {
        const la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
        return la < 1e-6 || lb < 1e-6 ? NaN : (Math.acos(VZ.clamp((a[0] * b[0] + a[1] * b[1]) / (la * lb), -1, 1)) * 180) / Math.PI;
      };
      // 한 번 굴린 상태. 충돌 전후 모두 등속 직선 운동이라 시각 t만 있으면 위치를 식으로 바로 구한다
      let run, t;
      function reset() {
        const two = st.dim === 2, r1 = rad(st.m1), r2 = rad(st.m2), u1 = [st.v1, 0], u2 = [two ? 0 : st.v2, 0];
        run = { u1, u2, n: two ? normalOf(st.b) : [1, 0] };
        if (!two && st.v1 <= st.v2) { // 공 1이 공 2를 따라잡지 못한다
          Object.assign(run, { tc: null, p1: [1.2, 0], p2: [4.4, 0], w1: u1, w2: u2, tEnd: 2.5 });
        } else {
          // 접촉 위치를 화면 가운데쯤에 두고 거슬러 올라가 출발 위치를 정한다. 접촉까지는 1.5 s 이하이고 두 공 모두 화면 안에서 출발한다
          const c2 = [4.2, two ? -st.b * (r1 + r2) : 0], c1 = [c2[0] - (r1 + r2) * run.n[0], c2[1] - (r1 + r2) * run.n[1]];
          let tc = Math.min(1.5, (c1[0] - 0.5) / u1[0]);
          if (u2[0] < 0) tc = Math.min(tc, (L - 0.5 - c2[0]) / -u2[0]);
          const [w1, w2] = bounce(st.m1, st.m2, st.e, run.n, u1, u2);
          Object.assign(run, { tc, w1, w2, p1: [c1[0] - u1[0] * tc, c1[1]], p2: [c2[0] - u2[0] * tc, c2[1]], tEnd: tc + 2.5 });
        }
        // 오른쪽 그래프: 1차원은 질량비 m₂/m₁에 따른 충돌 후 속도와 질량중심 속도, 2차원은 b에 따른 갈라지는 각
        run.curve = two
          ? VZ.linspace(0.005, 0.995, 199).map((b) => [b, between(...bounce(st.m1, st.m2, st.e, normalOf(b), u1, u2))])
          : VZ.linspace(-1, 1, 161).map((l) => { const r = 10 ** l, [w1, w2] = bounce(1, r, st.e, [1, 0], u1, u2); return [r, w1[0], w2[0], (u1[0] + r * u2[0]) / (1 + r)]; });
        t = 0;
      }
      reset();
      const hit = () => run.tc != null && t >= run.tc;
      /** 공 i(0, 1)의 시각 s 위치와 속도 */
      function at(i, s) {
        const p = i ? run.p2 : run.p1, u = i ? run.u2 : run.u1;
        if (run.tc == null || s <= run.tc) return { p: [p[0] + u[0] * s, p[1] + u[1] * s], v: u };
        const w = i ? run.w2 : run.w1, d = s - run.tc;
        return { p: [p[0] + u[0] * run.tc + w[0] * d, p[1] + u[1] * run.tc + w[1] * d], v: w };
      }
      const cm = (s) => {
        const a = at(0, s).p, b = at(1, s).p, M = st.m1 + st.m2;
        return [(st.m1 * a[0] + st.m2 * b[0]) / M, (st.m1 * a[1] + st.m2 * b[1]) / M];
      };
      function ball(ctx, x, y, r, col, name) {
        ctx.fillStyle = VZ.alpha(col, 0.3); ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = VZ.palette().text; ctx.font = VZ.font(11, false, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(name, x, y + 0.5);
      }
      const path = (ctx, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };
      /** 1차원: 위는 트랙 위의 두 공과 속도 화살표, 아래는 같은 가로축을 쓰는 위치–시간 그래프 */
      function line(ctx, w, h, P, cols, kv) {
        const k = (w - 20) / L, X = (x) => 10 + x * k, Yt = 64 + 2 * rad(5) * k; // 트랙 높이. 가장 큰 공 위에도 화살표와 값이 들어간다
        ctx.fillStyle = VZ.alpha(P.dim, 0.1); ctx.fillRect(0, Yt, w, 6);
        ctx.strokeStyle = P.axis; ctx.lineWidth = 1.5; path(ctx, [[0, Yt], [w, Yt]]);
        const xc = X(cm(t)[0]); // 질량중심 표시
        ctx.fillStyle = P.dim; ctx.beginPath(); ctx.moveTo(xc, Yt + 1); ctx.lineTo(xc - 5, Yt + 10); ctx.lineTo(xc + 5, Yt + 10); ctx.closePath(); ctx.fill();
        [0, 1].forEach((i) => { const r = rad(i ? st.m2 : st.m1) * k; ball(ctx, X(at(i, t).p[0]), Yt - r, r, cols[i], String(i + 1)); });
        // 공 바로 위의 속도 화살표와 값. 두 값이 겹치면 공 1의 값을 공 2의 값보다 한 줄 위로 올린다
        ctx.font = VZ.font(11.5, false, 700); ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.lineWidth = 2.2;
        const tags = [0, 1].map((i) => {
          const { p, v } = at(i, t), x = X(p[0]), ya = Yt - 2 * rad(i ? st.m2 : st.m1) * k - 10, len = v[0] * kv, s = Math.abs(v[0]) < 5e-3 ? "정지" : `${f2(v[0])} m/s`;
          ctx.strokeStyle = cols[i]; ctx.fillStyle = cols[i];
          if (Math.abs(len) >= 4) VZ.arrow(ctx, x, ya, x + len, ya, 7);
          return { x: x + len / 2, y: ya - 5, s, wd: ctx.measureText(s).width };
        });
        if (Math.abs(tags[0].x - tags[1].x) < (tags[0].wd + tags[1].wd) / 2 + 8 && Math.abs(tags[0].y - tags[1].y) < 14) tags[0].y = Math.min(tags[0].y, tags[1].y - 14);
        tags.forEach((g, i) => { ctx.fillStyle = cols[i]; ctx.fillText(g.s, g.x, g.y); });
        // 위치–시간 그래프 (아래로 갈수록 나중)
        const y0 = Yt + 34, y1 = h - 12, T = (s) => y0 + (s / run.tEnd) * (y1 - y0);
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("위치–시간 그래프 · 아래로 갈수록 나중", 10, Yt + 14);
        ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.strokeRect(X(0), y0, L * k, y1 - y0);
        ctx.font = VZ.font(11, false); ctx.fillText("0 s", X(0) + 4, y0 + 3);
        ctx.textBaseline = "bottom"; ctx.fillText(`${run.tEnd.toFixed(1)} s`, X(0) + 4, y1 - 3);
        if (run.tc != null) {
          ctx.strokeStyle = P.faint; ctx.setLineDash([5, 4]); path(ctx, [[X(0), T(run.tc)], [X(L), T(run.tc)]]); ctx.setLineDash([]);
          ctx.textAlign = "right"; ctx.fillText(`충돌 ${run.tc.toFixed(2)} s`, X(L) - 4, T(run.tc) - 2);
        }
        ctx.save(); ctx.beginPath(); ctx.rect(X(0), y0, L * k, y1 - y0); ctx.clip();
        const times = hit() ? [0, run.tc, t] : [0, t];
        ctx.lineWidth = 2.2;
        [0, 1].forEach((i) => { ctx.strokeStyle = cols[i]; path(ctx, times.map((s) => [X(at(i, s).p[0]), T(s)])); });
        ctx.strokeStyle = P.dim; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); path(ctx, [[X(cm(0)[0]), T(0)], [X(cm(t)[0]), T(t)]]); ctx.setLineDash([]);
        [0, 1].forEach((i) => { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(X(at(i, t).p[0]), T(t), 3.5, 0, 7); ctx.fill(); });
        ctx.restore();
      }
      /** 2차원: 위에서 본 탁자. 지나온 길, 질량중심의 길, 충돌 뒤 두 공이 갈라지는 각 */
      function table(ctx, w, h, P, cols, kv) {
        const k = Math.min((w - 20) / L, (h - 40) / (2 * H)), ox = (w - L * k) / 2, oy = 30 + (h - 30 - 2 * H * k) / 2;
        const X = (x) => ox + x * k, Y = (y) => oy + (H - y) * k;
        ctx.fillStyle = VZ.alpha(P.dim, 0.07); ctx.fillRect(X(0), Y(H), L * k, 2 * H * k);
        ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.strokeRect(X(0), Y(H), L * k, 2 * H * k);
        ctx.save(); ctx.beginPath(); ctx.rect(X(0), Y(H), L * k, 2 * H * k); ctx.clip();
        // 공 1의 진행선과 공 2 중심을 지나는 평행선. 둘 사이 거리가 d = b(r₁ + r₂)
        const d = -run.p2[1];
        ctx.strokeStyle = P.faint; ctx.setLineDash([5, 4]);
        path(ctx, [[X(0), Y(0)], [X(L), Y(0)]]); path(ctx, [[X(0.3), Y(-d)], [X(run.p2[0]), Y(-d)]]); ctx.setLineDash([]);
        if (d * k > 6) {
          ctx.strokeStyle = P.dim; path(ctx, [[X(0.35), Y(0)], [X(0.35), Y(-d)]]);
          ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("d", X(0.35) + 5, Y(-d / 2));
        }
        const times = hit() ? [0, run.tc, t] : [0, t];
        ctx.lineWidth = 2;
        [0, 1].forEach((i) => { ctx.strokeStyle = VZ.alpha(cols[i], 0.5); path(ctx, times.map((s) => { const q = at(i, s).p; return [X(q[0]), Y(q[1])]; })); });
        const c0 = cm(0), c1 = cm(t);
        ctx.strokeStyle = P.dim; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); path(ctx, [[X(c0[0]), Y(c0[1])], [X(c1[0]), Y(c1[1])]]); ctx.setLineDash([]);
        // 충돌 뒤: 접촉 순간 공 1의 중심에서 두 공의 진행 방향과 그 사이 각. 공 2는 두 중심을 잇는 선을 따라 나가므로 같은 점에서 그릴 수 있다
        const phi = between(run.w1, run.w2);
        if (hit() && isFinite(phi)) {
          const c = at(0, run.tc).p, cx = X(c[0]), cy = Y(c[1]), a1 = Math.atan2(-run.w1[1], run.w1[0]), a2 = Math.atan2(-run.w2[1], run.w2[0]);
          let da = a2 - a1;
          if (da > Math.PI) da -= 2 * Math.PI; else if (da < -Math.PI) da += 2 * Math.PI;
          ctx.strokeStyle = P.text; ctx.lineWidth = 1.2;
          [a1, a2].forEach((a) => path(ctx, [[cx, cy], [cx + 64 * Math.cos(a), cy + 64 * Math.sin(a)]]));
          ctx.beginPath(); ctx.arc(cx, cy, 30, a1, a1 + da, da < 0); ctx.stroke();
          const am = a1 + da / 2;
          ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(`${phi.toFixed(1)}°`, cx + 48 * Math.cos(am), cy + 48 * Math.sin(am));
        }
        [0, 1].forEach((i) => {
          const { p, v } = at(i, t), x = X(p[0]), y = Y(p[1]), r = rad(i ? st.m2 : st.m1) * k, sp = Math.hypot(v[0], v[1]);
          ball(ctx, x, y, r, cols[i], String(i + 1));
          if (sp * kv >= 4) { // 공 가장자리에서 시작하는 속도 화살표
            const ux = v[0] / sp, uy = -v[1] / sp;
            ctx.strokeStyle = cols[i]; ctx.fillStyle = cols[i]; ctx.lineWidth = 2.2;
            VZ.arrow(ctx, x + ux * r, y + uy * r, x + ux * (r + sp * kv), y + uy * (r + sp * kv), 7);
          }
        });
        const cx = X(c1[0]), cy = Y(c1[1]); // 질량중심 ×
        ctx.strokeStyle = P.dim; ctx.lineWidth = 2; path(ctx, [[cx - 5, cy - 5], [cx + 5, cy + 5]]); path(ctx, [[cx - 5, cy + 5], [cx + 5, cy - 5]]);
        ctx.restore();
      }
      S.legend([{ label: "공 1", color: (P) => P.accent, dot: true }, { label: "공 2", color: (P) => P.accent2, dot: true }, { label: "질량중심 · 합", color: (P) => P.dim, dash: true }]);
      const cvS = S.canvas({ aspect: 0.5, minHeight: 300, maxHeight: 420 }, (ctx, w, h) => {
        const P = VZ.palette(), cols = [P.accent, P.accent2], kv = Math.min(16, w / 45); // 속도 화살표: 1 m/s당 px
        (st.dim === 2 ? table : line)(ctx, w, h, P, cols, kv);
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`t = ${t.toFixed(2)} s · ${st.rate === 1 ? "실제 속도" : st.rate + "배속"}`, 10, 8);
      });
      /** 충돌 전·후 두 묶음의 막대 (공 1, 공 2, 합). 충돌하기 전에는 충돌 후 막대를 옅게 그린다. 점선은 충돌 전의 합 */
      function bars(ctx, box, title, before, after) {
        const P = VZ.palette(), cols = [P.accent, P.accent2, P.dim], all = before.concat(after);
        const lo = Math.min(0, ...all), hi = Math.max(0, ...all), pad = 0.18 * (hi - lo || 1);
        const c = VZ.chart(ctx, box, {
          x: [-0.55, 1.55], y: [lo < 0 ? lo - pad : 0, hi + pad], xTicks: [0, 1], xFmt: () => "", title,
          series: [before, after].flatMap((vals, j) => vals.map((v, i) => ({ type: "bar", data: [[j + (i - 1) * 0.28, v]], color: j && !hit() ? VZ.alpha(cols[i], 0.3) : cols[i], barWidth: 0.24 }))),
          hlines: [{ y: 0, color: P.axis, dash: [] }, { y: before[2], color: P.faint }],
        });
        // 눈금 글꼴은 고정폭이라 한글 묶음 이름은 따로 쓴다
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11.5, false); ctx.textAlign = "center"; ctx.textBaseline = "top";
        ["충돌 전", "충돌 후"].forEach((s, j) => ctx.fillText(s, c.X(j), c.box.y + c.box.h + 5));
      }
      /** 2차원 운동량 벡터: 처음 운동량 p₁(= 합)이 충돌 뒤 p₁′ + p₂′로 나뉜다 (공 2는 처음에 멈춰 있다) */
      function vectors(ctx, box) {
        const P = VZ.palette(), pt = [st.m1 * run.u1[0], st.m1 * run.u1[1]], pa = [st.m1 * run.w1[0], st.m1 * run.w1[1]];
        ctx.fillStyle = P.text; ctx.font = VZ.font(12.5, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("운동량 벡터 p₁ = p₁′ + p₂′", box.x + 44, box.y + 4);
        const xs = [0, pa[0], pt[0]], ys = [0, pa[1], pt[1]], x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const s = Math.min((box.w - 80) / Math.max(x1 - x0, 1e-6), (box.h - 70) / Math.max(y1 - y0, 1e-6));
        const cx = box.x + box.w / 2, cy = box.y + 26 + (box.h - 26) / 2;
        const X = (x) => cx + (x - (x0 + x1) / 2) * s, Y = (y) => cy - (y - (y0 + y1) / 2) * s;
        const O = [X(0), Y(0)], A = [X(pa[0]), Y(pa[1])], B = [X(pt[0]), Y(pt[1])], G = [(O[0] + A[0] + B[0]) / 3, (O[1] + A[1] + B[1]) / 3];
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = P.dim; ctx.fillStyle = P.dim; ctx.setLineDash([5, 4]); VZ.arrow(ctx, O[0], O[1], B[0], B[1], 8); ctx.setLineDash([]);
        ctx.globalAlpha = hit() ? 1 : 0.3;
        if (Math.hypot(A[0] - O[0], A[1] - O[1]) > 3) { ctx.strokeStyle = P.accent; ctx.fillStyle = P.accent; VZ.arrow(ctx, O[0], O[1], A[0], A[1], 8); }
        ctx.strokeStyle = P.accent2; ctx.fillStyle = P.accent2; VZ.arrow(ctx, A[0], A[1], B[0], B[1], 8);
        const phi = between(run.w1, run.w2);
        if (Math.abs(phi - 90) < 0.5) { // 직각 표시
          const u = [O[0] - A[0], O[1] - A[1]], v = [B[0] - A[0], B[1] - A[1]], lu = Math.hypot(...u), lv = Math.hypot(...v), q = 9;
          ctx.strokeStyle = P.text; ctx.lineWidth = 1.2;
          path(ctx, [[A[0] + (u[0] / lu) * q, A[1] + (u[1] / lu) * q], [A[0] + (u[0] / lu + v[0] / lv) * q, A[1] + (u[1] / lu + v[1] / lv) * q], [A[0] + (v[0] / lv) * q, A[1] + (v[1] / lv) * q]]);
        }
        // 이름은 선분 바깥쪽(세 꼭짓점의 무게중심 반대편)에. 세 점이 한 줄이면 sgn 쪽(1 아래, −1 위)
        ctx.font = VZ.font(12, false, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const tag = (p, q, text, col, sgn) => {
          const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
          let nx = -(q[1] - p[1]) / l, ny = (q[0] - p[0]) / l;
          const side = (mx - G[0]) * nx + (my - G[1]) * ny;
          if (Math.abs(side) > 1 ? side < 0 : ny * sgn < 0) { nx = -nx; ny = -ny; }
          ctx.fillStyle = col; ctx.fillText(text, mx + nx * 14, my + ny * 14);
        };
        if (Math.hypot(A[0] - O[0], A[1] - O[1]) > 3) tag(O, A, "p₁′", P.accent, -1);
        tag(A, B, "p₂′", P.accent2, -1);
        ctx.globalAlpha = 1;
        tag(O, B, "p₁ (처음)", P.dim, 1);
      }
      const [bl, br] = S.split(2);
      const cvP = S.canvas({ parent: bl, aspect: 0.95, maxHeight: 380 }, (ctx, w, h) => {
        const top = { x: 0, y: 0, w, h: h * 0.52 }, bot = { x: 0, y: h * 0.52, w, h: h * 0.48 };
        if (st.dim === 2) vectors(ctx, top);
        else {
          const pb = [st.m1 * run.u1[0], st.m2 * run.u2[0]], pa = [st.m1 * run.w1[0], st.m2 * run.w2[0]];
          bars(ctx, top, "운동량 (kg·m/s, 오른쪽이 +)", [pb[0], pb[1], pb[0] + pb[1]], [pa[0], pa[1], pa[0] + pa[1]]);
        }
        const kb = [kin(st.m1, run.u1), kin(st.m2, run.u2)], ka = [kin(st.m1, run.w1), kin(st.m2, run.w2)];
        bars(ctx, bot, "운동 에너지 (J)", [kb[0], kb[1], kb[0] + kb[1]], [ka[0], ka[1], ka[0] + ka[1]]);
      });
      const cvG = S.canvas({ parent: br, aspect: 0.95, maxHeight: 380 }, (ctx) => {
        const P = VZ.palette();
        if (st.dim === 2) {
          const cur = between(run.w1, run.w2);
          VZ.chart(ctx, null, {
            x: [0, 1], y: [0, 180], yTicks: [0, 45, 90, 135, 180], xLabel: "비껴 맞는 정도 b = d / (r₁ + r₂)", title: "두 공이 갈라지는 각 (°)",
            series: [{ data: run.curve, color: P.accent, width: 2.4 }],
            hlines: [{ y: 90, color: P.faint }],
            points: isFinite(cur) ? [{ x: st.b, y: cur, color: P.accent, r: 6 }] : [],
            // b → 1이면 질량과 상관없이 곡선이 90°로 모이므로 이름은 왼쪽 끝에 단다
            texts: [{ x: 0.015, y: 90, text: "90°", baseline: "bottom", color: P.dim }],
          });
          return;
        }
        if (run.tc == null) {
          VZ.chart(ctx, null, {
            x: [0.1, 10], logX: true, xTicks: [0.1, 0.2, 0.5, 1, 2, 5, 10], y: [-1, 1], xLabel: "질량비 m₂ / m₁ (로그 눈금)", title: "질량비에 따른 충돌 후 속도 (m/s)",
            texts: [{ x: 1, y: 0, text: "v₁ ≤ v₂라서 부딪히지 않습니다", align: "center", sans: true }],
          });
          return;
        }
        const ys = run.curve.flatMap((c) => c.slice(1)), lo = Math.min(0, ...ys), hi = Math.max(0, ...ys), pad = 0.12 * (hi - lo);
        const first = run.curve[0], last = run.curve[run.curve.length - 1];
        VZ.chart(ctx, null, {
          x: [0.1, 10], logX: true, xTicks: [0.1, 0.2, 0.5, 1, 2, 5, 10], y: [lo - pad, hi + pad], xLabel: "질량비 m₂ / m₁ (로그 눈금)", title: "질량비에 따른 충돌 후 속도 (m/s)",
          series: [
            { data: run.curve.map((c) => [c[0], c[3]]), color: P.dim, width: 1.5, dash: [5, 4] },
            { data: run.curve.map((c) => [c[0], c[1]]), color: P.accent, width: 2.4 },
            { data: run.curve.map((c) => [c[0], c[2]]), color: P.accent2, width: 2.4 },
          ],
          vlines: [{ x: 1, color: P.faint, label: "m₁ = m₂" }], hlines: [{ y: 0, color: P.axis, dash: [] }],
          points: [{ x: st.m2 / st.m1, y: run.w1[0], color: P.accent, r: 6 }, { x: st.m2 / st.m1, y: run.w2[0], color: P.accent2, r: 6 }],
          // 오른쪽 끝에서는 v₂′가 질량중심 속도에 붙으므로 v₁′은 오른쪽 끝, v₂′는 왼쪽 끝에 이름을 단다
          texts: [{ x: 9.4, y: last[1], text: "v₁′", align: "right", baseline: "bottom", color: P.accent, size: 12, sans: true }, { x: 0.107, y: first[2], text: "v₂′", baseline: "bottom", color: P.accent2, size: 12, sans: true }],
        });
      });
      const set = S.stats([{ k: "v1", label: "공 1 충돌 후" }, { k: "v2", label: "공 2 충돌 후" }, { k: "p", label: "운동량 합 (전 → 후)" }, { k: "K", label: "운동 에너지 합 (전 → 후)" }, { k: "cm", label: "질량중심 속도 (전 → 후)" }, { k: "x", label: "" }]);
      const lastLabel = S.el.querySelector(".sim-readout").lastElementChild.querySelector(".k"); // 1차원과 2차원에서 이름이 다르다
      function readouts() {
        const two = st.dim === 2, M = st.m1 + st.m2;
        lastLabel.textContent = two ? "갈라진 각" : "반발 계수 (측정)";
        if (run.tc == null) { set("v1", "부딪히지 않음"); ["v2", "p", "K", "cm", "x"].forEach((k) => set(k, "—")); return; }
        const p0 = [st.m1 * run.u1[0] + st.m2 * run.u2[0], st.m1 * run.u1[1] + st.m2 * run.u2[1]], p1 = [st.m1 * run.w1[0] + st.m2 * run.w2[0], st.m1 * run.w1[1] + st.m2 * run.w2[1]];
        const K0 = kin(st.m1, run.u1) + kin(st.m2, run.u2), K1 = kin(st.m1, run.w1) + kin(st.m2, run.w2), loss = (1 - K1 / K0) * 100;
        const vel = (v) => {
          const sp = Math.hypot(v[0], v[1]), a = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
          if (sp < 5e-3) return "0.00<small>m/s · 멈춤</small>";
          if (!two) return `${f2(v[0])}<small>m/s${v[0] < 0 ? " · 왼쪽으로" : ""}</small>`;
          return `${sp.toFixed(2)}<small>m/s · ${Math.abs(a) < 0.05 ? "곧장 앞으로" : `${Math.abs(a).toFixed(1)}° ${a > 0 ? "위로" : "아래로"}`}</small>`;
        };
        set("v1", vel(run.w1)); set("v2", vel(run.w2));
        set("p", `${f2(p0[0])} → ${f2(p1[0])}<small>kg·m/s${two ? ` · 옆(y) ${f2(p0[1])} → ${f2(p1[1])}` : ""}</small>`);
        set("K", `${K0.toFixed(2)} → ${K1.toFixed(2)}<small>J · ${loss < 0.05 ? "그대로" : loss.toFixed(1) + "% 잃음"}</small>`);
        const vc = (p) => (two ? Math.hypot(p[0], p[1]) : p[0]) / M;
        set("cm", `${f2(vc(p0))} → ${f2(vc(p1))}<small>m/s</small>`);
        if (two) { const phi = between(run.w1, run.w2); set("x", isFinite(phi) ? phi.toFixed(1) + "°" : "—<small>공 1이 멈춤</small>"); }
        else set("x", ((run.w2[0] - run.w1[0]) / (run.u1[0] - run.u2[0])).toFixed(2) + "<small>(v₂′ − v₁′) / (v₁ − v₂)</small>");
      }
      const show = (g, on) => (g.el.closest(".ctrl").style.display = on ? "" : "none");
      let v2c, bc;
      S.seg({ label: "충돌 방식", options: [["1", "일직선 (1차원)"], ["2", "비껴 맞음 (2차원)"]], value: "1", onChange: (x) => { st.dim = Number(x); show(v2c, st.dim === 1); show(bc, st.dim === 2); reset(); } });
      S.range({ label: "공 1 질량 m₁", min: 0.5, max: 5, step: 0.1, value: st.m1, fmt: (x) => x.toFixed(1) + " kg", onInput: (x) => { st.m1 = x; reset(); } });
      S.range({ label: "공 2 질량 m₂", min: 0.5, max: 5, step: 0.1, value: st.m2, fmt: (x) => x.toFixed(1) + " kg", onInput: (x) => { st.m2 = x; reset(); } });
      S.range({ label: "반발 계수 e", min: 0, max: 1, step: 0.05, value: st.e, fmt: (x) => x.toFixed(2) + (x === 1 ? " 탄성" : x === 0 ? " 완전 비탄성" : ""), onInput: (x) => { st.e = x; reset(); } });
      S.range({ label: "공 1 처음 속도 v₁", min: 0.5, max: 5, step: 0.1, value: st.v1, fmt: (x) => x.toFixed(1) + " m/s", onInput: (x) => { st.v1 = x; reset(); } });
      v2c = S.range({ label: "공 2 처음 속도 v₂ (왼쪽이 −)", min: -3, max: 3, step: 0.1, value: st.v2, fmt: (x) => x.toFixed(1) + " m/s", onInput: (x) => { st.v2 = x; reset(); } });
      bc = S.range({ label: "비껴 맞는 정도 b = d / (r₁ + r₂)", min: 0, max: 0.95, step: 0.05, value: st.b, fmt: (x) => x.toFixed(2), onInput: (x) => { st.b = x; reset(); } });
      show(bc, false);
      S.seg({ label: "재생 속도", options: [["0.25", "¼배"], ["0.5", "½배"], ["1", "실제"]], value: "0.5", onChange: (x) => (st.rate = Number(x)) });
      S.button("다시 굴리기", () => reset(), { primary: true });
      S.loop((dt) => {
        t = Math.min(run.tEnd, t + dt * st.rate);
        cvS.redraw(); cvP.redraw(); cvG.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     7. 굴림 경주 (관성 모멘트)
     ====================================================================== */
  Lab.register({
    id: "rolling", field: "phys", thumb: "rolling",
    title: "굴림 경주 — 빗면을 가장 먼저 내려오는 것은 무엇일까",
    desc: "블록, 속 찬 구, 원판, 속 빈 구, 고리를 같은 빗면에서 함께 놓아 도착 순서를 봅니다. 가속도 a = g sin θ / (1 + I/mR²)와 병진·회전 에너지의 나눔을 확인하고, 마찰이 모자라면 미끄러지며 구르는 것도 봅니다.",
    tags: ["역학", "회전", "관성 모멘트", "에너지 보존"],
    note: "해볼 것: 도착 순서는 언제나 블록(마찰 없음) → 속 찬 구 → 원판 → 속 빈 구 → 고리입니다. 가속도가 I/mR², 곧 질량이 회전축에서 얼마나 멀리 퍼져 있는지로만 정해지기 때문입니다. 원판 B의 질량과 반지름을 바꿔도 원판과 나란히 도착하는지 보세요. 구르는 물체는 내려온 위치 에너지의 일부를 회전 에너지로 가져가서 그만큼 느립니다. 고리는 절반을 가져갑니다. 마찰 계수를 낮추거나 경사를 키우면 고리부터 미끄러지기 시작합니다. 미끄러지는 동안에는 가속도가 모양과 상관없이 g(sin θ − μ cos θ)라서 미끄러지는 물체끼리는 함께 도착하고, μ = 0이면 아무것도 돌지 않아 모두 블록과 함께 도착합니다.",
    mount(S) {
      const g = 9.81, L = 2, R0 = 0.1; // 빗면 길이, 원판 B를 뺀 물체의 반지름 (m)
      const st = { th: 20, mu: 0.4, RB: 0.1, mB: 1, rate: 0.5 };
      // k = I/(mR²). fill·lw는 장면에서 모양을 구별하는 채우기 농도와 테두리 굵기. 원판 B는 원판과 모양이 같고 질량·반지름만 다르다
      const OBJ = [
        { name: "블록 (마찰 없음)", short: "블록", k: 0, col: "dim", fill: 0.45, lw: 2 },
        { name: "속 찬 구", short: "속 찬 구", k: 2 / 5, I: "⅖mR²", col: "accent", fill: 0.6, lw: 1.5 },
        { name: "원판", short: "원판", k: 1 / 2, I: "½mR²", col: "accent2", fill: 0.3, lw: 2 },
        { name: "원판 B", short: "원판 B", k: 1 / 2, I: "½mR²", col: "accent2", fill: null, lw: 2, B: true },
        { name: "속 빈 구", short: "속 빈 구", k: 2 / 3, I: "⅔mR²", col: "ok", fill: 0.12, lw: 2.5 },
        { name: "고리", short: "고리", k: 1, I: "mR²", col: "bad", fill: 0, lw: 3.5 },
      ];
      /** 경사각 th(라디안), 마찰 계수 mu에서 물체(k)의 가속도 a와 접점의 회전 가속도 αR.
          미끄러지지 않고 구르려면 정지 마찰 f = kma가 μmg cos θ를 넘지 않아야 한다: μ ≥ k tan θ / (1 + k).
          모자라면 운동 마찰 μmg cos θ를 받으며 미끄러지고, 그 마찰의 토크로만 회전이 빨라진다 */
      function motion(k, th, mu) {
        const s = Math.sin(th), c = Math.cos(th);
        if (!k) return { a: g * s, aR: 0, slip: false }; // 마찰 없는 블록은 돌지 않고 미끄러진다
        if (mu >= (k * Math.tan(th)) / (1 + k)) { const a = (g * s) / (1 + k); return { a, aR: a, slip: false }; }
        return { a: g * (s - mu * c), aR: (mu * g * c) / k, slip: true };
      }
      /** 내려온 위치 에너지가 병진·회전 운동 에너지와 마찰열로 나뉘는 비율. 셋 다 t²에 비례하므로 내려오는 동안 변하지 않는다 */
      function shares(k, m, th) {
        const W = g * Math.sin(th) * m.a;
        return [(m.a * m.a) / W, (k * m.aR * m.aR) / W, m.slip ? (st.mu * g * Math.cos(th) * (m.a - m.aR)) / W : 0];
      }
      // 한 번 굴린 상태. 가속도가 일정하므로 시각 t만 있으면 위치와 굴러간 각을 식으로 바로 구한다
      let mot, tMax, t;
      function reset() {
        const th = (st.th * Math.PI) / 180;
        mot = OBJ.map((o) => { const m = motion(o.k, th, st.mu); m.tEnd = Math.sqrt((2 * L) / m.a); return m; });
        tMax = Math.max(...mot.map((m) => m.tEnd));
        t = 0;
      }
      reset();
      S.legend(OBJ.map((o) => ({ label: o.B ? "원판 B (질량·반지름 조절)" : o.name, color: (P) => P[o.col], dot: true })));
      /** 비스듬히 본 빗면. 레인은 화면 안쪽(오른쪽 위)으로 늘어서고, 앞 레인이 뒤 레인을 가린다 */
      const cvS = S.canvas({ aspect: 0.55, minHeight: 280, maxHeight: 420 }, (ctx, w, h) => {
        const P = VZ.palette(), th = (st.th * Math.PI) / 180, cs = Math.cos(th), sn = Math.sin(th), N = OBJ.length;
        // sp: 레인 사이 깊이 간격, q: 한 레인만큼 안쪽으로 가는 화면 벡터, r0: 원판 B를 뺀 물체의 반지름 (px)
        const sp = VZ.clamp(w / 22, 15, 34), q = [0.819 * sp, -0.574 * sp], r0 = 0.32 * sp, rB = (r0 * st.RB) / R0;
        const dw = N * q[0] + 2 * Math.max(r0, rB), dh = -N * q[1] + 2 * Math.max(r0, rB);
        // 빗면 길이 (px). 위 34px는 진행 문구, 아래 20px는 경사각 글자 자리이고, 빗면은 바닥에 붙인다
        const Lp = Math.min((w - 32 - dw) / cs, (h - 54 - dh) / sn);
        const T = [(w - Lp * cs - dw) / 2, h - 20 - Lp * sn], B = [T[0] + Lp * cs, T[1] + Lp * sn], C = [T[0], B[1]];
        const back = (p) => [p[0] + N * q[0], p[1] + N * q[1]];
        const poly = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
        ctx.fillStyle = VZ.alpha(P.dim, 0.1); ctx.fillRect(0, B[1], w, h - B[1]);
        ctx.strokeStyle = P.axis; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, B[1]); ctx.lineTo(w, B[1]); ctx.stroke();
        // 빗면(윗면)과 앞쪽 삼각형 면, 레인, 도착선
        ctx.strokeStyle = P.dim; ctx.lineWidth = 1.2;
        poly([T, B, back(B), back(T)]); ctx.fillStyle = VZ.alpha(P.dim, 0.08); ctx.fill(); ctx.stroke();
        poly([T, C, B]); ctx.fillStyle = VZ.alpha(P.dim, 0.2); ctx.fill(); ctx.stroke();
        const lane = (i, u) => [T[0] + (i + 0.5) * q[0] + u * cs, T[1] + (i + 0.5) * q[1] + u * sn]; // 레인 i에서 빗면을 따라 u px 내려온 접점
        ctx.strokeStyle = P.faint; ctx.lineWidth = 1;
        OBJ.forEach((o, i) => { const a = lane(i, 0), b = lane(i, Lp); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
        ctx.strokeStyle = P.text; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(...back(B)); ctx.stroke();
        // 경사각
        ctx.strokeStyle = P.text; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(B[0], B[1], 30, Math.PI, Math.PI + th); ctx.stroke();
        ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 700); ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillText(`θ = ${st.th}°`, B[0] - 8, B[1] + 4); // 경사가 작으면 빗면과 겹치므로 바닥선 아래에 쓴다
        // 물체 (뒤 레인부터). 둥근 물체에는 굴러간 각을 보여 주는 선을 긋는다
        for (let i = N - 1; i >= 0; i--) {
          const o = OBJ[i], m = mot[i], tau = Math.min(t, m.tEnd), p = lane(i, ((0.5 * m.a * tau * tau) / L) * Lp), col = P[o.col];
          const r = o.B ? rB : r0, c = [p[0] + r * sn, p[1] - r * cs];
          ctx.strokeStyle = col; ctx.lineWidth = o.lw;
          if (!o.k) {
            ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(th);
            ctx.fillStyle = VZ.alpha(col, o.fill); ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.strokeRect(-r, -r, 2 * r, 2 * r);
            ctx.restore();
            continue;
          }
          const fill = o.B ? VZ.clamp(0.1 + 0.1 * st.mB, 0.12, 0.6) : o.fill; // 원판 B는 무거울수록 진하게
          ctx.beginPath(); ctx.arc(c[0], c[1], r - o.lw / 2, 0, 7);
          if (fill) { ctx.fillStyle = VZ.alpha(col, fill); ctx.fill(); }
          ctx.stroke();
          const phi = (0.5 * m.aR * tau * tau) / (o.B ? st.RB : R0) - Math.PI / 2; // 접점이 굴러간 길이 ÷ 반지름
          ctx.strokeStyle = P.text; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + r * Math.cos(phi), c[1] + r * Math.sin(phi)); ctx.stroke();
        }
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`t = ${t.toFixed(2)} s · ${st.rate === 1 ? "실제 속도" : st.rate + "배속"} · 빗면 길이 ${L} m`, 10, 8);
      });
      const [bl, br] = S.split(2);
      const cvA = S.canvas({ parent: bl, aspect: 0.8, maxHeight: 330 }, (ctx) => {
        const P = VZ.palette(), ths = VZ.linspace(0, 60, 241), series = [], points = [];
        OBJ.forEach((o, i) => {
          if (o.B) return; // 원판과 같은 곡선
          const pts = ths.map((d) => { const m = motion(o.k, (d * Math.PI) / 180, st.mu); return [d, m.a / g, m.slip]; });
          series.push({ data: pts.map(([d, y, s]) => [d, s ? NaN : y]), color: P[o.col], width: 2.2 }, { data: pts.map(([d, y, s]) => [d, s ? y : NaN]), color: P[o.col], width: 2, dash: [5, 4] });
          points.push({ x: st.th, y: mot[i].a / g, color: P[o.col], r: 4.5 });
        });
        VZ.chart(ctx, null, { x: [0, 60], y: [0, 0.9], xLabel: "경사각 θ (°)", title: "경사각에 따른 가속도 a/g (점선: 미끄러짐)", series, vlines: [{ x: st.th, color: P.faint }], points });
      });
      const cvE = S.canvas({ parent: br, aspect: 0.8, maxHeight: 330 }, (ctx, w, h) => {
        const P = VZ.palette(), th = (st.th * Math.PI) / 180, x0 = 70, x1 = w - 14, top = 34, rh = Math.min(32, (h - top - 40) / OBJ.length), bh = rh * 0.66;
        ctx.fillStyle = P.text; ctx.font = VZ.font(12.5, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("내려온 위치 에너지의 나눔 (%)", 14, 8);
        // 막대 한 줄 = 한 물체: 병진(진한 색) + 회전(옅은 색) + 마찰열 = 100%. 마찰열은 연직 루프 실험과 같은 색
        const heat = VZ.alpha(P.warn, 0.55);
        OBJ.forEach((o, i) => {
          const col = P[o.col], y = top + i * rh, sh = shares(o.k, mot[i], th);
          ctx.fillStyle = col; ctx.font = VZ.font(11.5, false, 700); ctx.textAlign = "right"; ctx.textBaseline = "middle";
          ctx.fillText(o.short, x0 - 8, y + bh / 2);
          let x = x0;
          [[sh[0], col], [sh[1], VZ.alpha(col, 0.38)], [sh[2], heat]].forEach(([p, c], j) => {
            const ww = p * (x1 - x0);
            if (ww < 0.5) return;
            ctx.fillStyle = c; ctx.fillRect(x, y, ww, bh);
            if (ww > 30) { ctx.fillStyle = j ? P.text : P.bg; ctx.font = VZ.font(11, true, 600); ctx.textAlign = "center"; ctx.fillText(Math.round(p * 100) + "%", x + ww / 2, y + bh / 2 + 0.5); }
            x += ww;
          });
        });
        const yl = top + OBJ.length * rh + 8;
        ctx.font = VZ.font(11.5, false); ctx.textAlign = "left"; ctx.textBaseline = "middle";
        let xl = 14;
        [["병진", P.text], ["회전 (옅은 색)", VZ.alpha(P.text, 0.38)], ["마찰열", heat]].forEach(([s, c]) => {
          ctx.fillStyle = c; ctx.fillRect(xl, yl - 5, 10, 10); ctx.fillStyle = P.dim; ctx.fillText(s, xl + 14, yl);
          xl += ctx.measureText(s).width + 28;
        });
      });
      const set = S.stats(OBJ.map((o, i) => ({ k: "o" + i, label: o.k ? `${o.name} · I = ${o.I}` : o.name })).concat([{ k: "mu", label: "모두 구르려면 μ ≥" }]));
      function readouts() {
        const th = (st.th * Math.PI) / 180, nSlip = mot.filter((m) => m.slip).length;
        mot.forEach((m, i) => {
          const rank = 1 + mot.filter((n) => n.tEnd < m.tEnd - 1e-9).length, how = !OBJ[i].k ? "" : m.slip ? " · 미끄러지며 구름" : "";
          set("o" + i, (t >= m.tEnd ? `${m.tEnd.toFixed(2)}<small>s · ${rank}등</small>` : "—") + `<br><small>a = ${m.a.toFixed(2)} m/s²${how}</small>`);
        });
        set("mu", `${(Math.tan(th) / 2).toFixed(2)}<small>고리 기준 ½ tan θ${nSlip ? ` · 지금 ${nSlip}개가 미끄러짐` : ""}</small>`);
      }
      S.range({ label: "경사각 θ", min: 5, max: 60, step: 1, value: st.th, fmt: (x) => x + "°", onInput: (x) => { st.th = x; reset(); } });
      S.range({ label: "마찰 계수 μ (정지·운동 같음)", min: 0, max: 1, step: 0.01, value: st.mu, fmt: (x) => x.toFixed(2), onInput: (x) => { st.mu = x; reset(); } });
      S.range({ label: "원판 B 반지름 (나머지 10 cm)", min: 0.05, max: 0.2, step: 0.01, value: st.RB, fmt: (x) => Math.round(x * 100) + " cm", onInput: (x) => { st.RB = x; reset(); } });
      S.range({ label: "원판 B 질량 (나머지 1 kg)", min: 0.2, max: 5, step: 0.1, value: st.mB, fmt: (x) => x.toFixed(1) + " kg", onInput: (x) => { st.mB = x; reset(); } });
      S.seg({ label: "재생 속도", options: [["0.25", "¼배"], ["0.5", "½배"], ["1", "실제"]], value: "0.5", onChange: (x) => (st.rate = Number(x)) });
      S.button("다시 굴리기", () => reset(), { primary: true });
      S.loop((dt) => {
        t = Math.min(tMax + 0.3, t + dt * st.rate);
        cvS.redraw(); cvA.redraw(); cvE.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     8. 단진동과 감쇠 (질량–용수철–감쇠기)
     ====================================================================== */
  Lab.register({
    id: "damped-spring", field: "phys", thumb: "spring",
    title: "단진동과 감쇠 — 진동 없이 가장 빨리 멈추는 임계 감쇠",
    desc: "질량, 용수철 상수, 감쇠비를 바꾸며 용수철에 매인 물체가 진동하다 멈추는 모습을 봅니다. 주기 2π√(m/k), 감쇠 진동수 ω₀√(1 − ζ²), 과소·임계·과대 감쇠, 역학적 에너지가 열로 빠져나가는 과정을 확인합니다.",
    tags: ["진동", "단진동", "감쇠", "에너지"],
    note: "해볼 것: 감쇠가 없으면(ζ = 0) 물체는 주기 2π√(m/k)로 끝없이 진동합니다. 질량을 4배로 하면 주기가 2배가 되고, 주기는 진폭과 상관없습니다. 감쇠비를 키우면 진폭이 e^(−ζω₀t)로 줄고 주기도 조금 길어집니다. ζ = 1(임계 감쇠)이면 진동 없이 제자리로 돌아오는 가장 빠른 경우가 되고, 그보다 크면(과대 감쇠) 오히려 느리게 돌아옵니다. 자동차 완충기를 임계 감쇠 가까이 맞추는 까닭입니다. 에너지 그래프에서는 물체가 빠를 때 열이 많이 생겨 역학적 에너지가 계단처럼 줄어듭니다.",
    mount(S) {
      const X0 = 0.2; // 처음 변위 (m). 멈춘 채로 놓는다
      const st = { m: 1, k: 10, z: 0.1, rate: 1 };
      const w0 = () => Math.sqrt(st.k / st.m), cd = () => 2 * st.z * Math.sqrt(st.m * st.k); // 고유 각진동수, 감쇠 계수 c (N·s/m)
      // 상태 [x, v, Q]. 감쇠력이 빼앗은 열 Q = ∫cv² dt도 같은 단계로 적분해야 K + U + Q가 처음 에너지와 맞는다
      const f = ([x, v]) => { const c = cd(); return [v, (-st.k * x - c * v) / st.m, c * v * v]; };
      // 한 번 놓은 상태. ups: 위로 지나는 0점의 시각, peaks: 오른쪽 봉우리의 변위 (처음 놓은 자리가 첫 봉우리)
      let y, t, Tw, hist, ups, peaks;
      function reset() {
        y = [X0, 0, 0]; t = 0; hist = [[0, X0, 0, 0.5 * st.k * X0 * X0, 0]]; ups = []; peaks = [X0];
        Tw = (10 * Math.PI) / w0(); // 그래프 시간 폭: 고유 주기의 5배
      }
      reset();
      function step(h) {
        const y1 = rk4(f, y, h);
        if (y[0] < 0 && y1[0] >= 0) ups.push(t + (h * -y[0]) / (y1[0] - y[0])); // 선형 보간
        if (y[1] > 0 && y1[1] <= 0) peaks.push(y1[0]);
        y = y1; t += h;
      }
      const under = () => st.z < 1 - 1e-9;
      const wd = () => w0() * Math.sqrt(1 - st.z * st.z); // 감쇠 진동수 (과소 감쇠일 때)
      S.legend([
        { label: "변위", color: (P) => P.accent },
        { label: "임계 감쇠 (ζ = 1)", color: (P) => P.dim, dash: true },
        { label: "포락선 ∝ e^(−ζω₀t)", color: (P) => P.faint, dash: true },
      ]);
      const cvS = S.canvas({ aspect: 0.62, minHeight: 380, maxHeight: 470 }, (ctx, w, h) => {
        const P = VZ.palette(), yF = 114, eq = 0.55 * w, A = 0.11 * w, xs = A / X0; // 바닥 높이, 평형 위치 (px), 축척 (px/m)
        const bs = 32 + 12 * Math.cbrt(st.m), xl = eq + y[0] * xs - bs / 2, De = eq - bs / 2 - 14; // 물체 한 변, 물체 왼쪽 면, 평형일 때 벽–물체 거리
        ctx.strokeStyle = P.axis; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(14, yF); ctx.lineTo(w - 10, yF); ctx.moveTo(14, yF - 74); ctx.lineTo(14, yF); ctx.stroke();
        ctx.strokeStyle = P.faint; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(eq, yF - 78); ctx.lineTo(eq, yF + 4); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11, false); ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("x = 0", eq, yF + 4);
        // 용수철 (굵기는 용수철 상수에 따라)
        const ys = yF - 38, n = 14;
        ctx.strokeStyle = P.dim; ctx.lineWidth = 1.2 + st.k / 30; ctx.beginPath(); ctx.moveTo(14, ys);
        for (let i = 1; i < n; i++) ctx.lineTo(14 + ((xl - 14) * i) / n, ys + (i % 2 ? -9 : 9));
        ctx.lineTo(xl, ys); ctx.stroke();
        // 감쇠기: 벽에 붙은 원통과 물체에 붙은 피스톤. 피스톤 머리는 평형에서 원통 가운데에 온다
        const yd = yF - 14, c0 = 14 + 0.12 * De, c1 = 14 + 0.72 * De, head = xl - 0.6 * De;
        ctx.strokeStyle = P.dim; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(14, yd); ctx.lineTo(c0, yd); ctx.moveTo(c1, yd - 7); ctx.lineTo(c0, yd - 7); ctx.lineTo(c0, yd + 7); ctx.lineTo(c1, yd + 7); ctx.stroke();
        ctx.fillStyle = VZ.alpha(P.warn, 0.12 + 0.25 * Math.min(1, st.z)); ctx.fillRect(c0, yd - 7, c1 - c0, 14); // 감쇠가 클수록 진한 기름
        ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(head, yd - 5); ctx.lineTo(head, yd + 5); ctx.moveTo(head, yd); ctx.lineTo(xl, yd); ctx.stroke();
        // 물체
        ctx.fillStyle = VZ.alpha(P.accent, 0.3); ctx.strokeStyle = P.accent; ctx.lineWidth = 2;
        ctx.fillRect(xl, yF - bs, bs, bs); ctx.strokeRect(xl, yF - bs, bs, bs);
        ctx.fillStyle = P.text; ctx.font = VZ.font(11.5, false, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("m", xl + bs / 2, yF - bs / 2);
        // 물체에 작용하는 두 힘. 같은 축척으로 그린다
        const Fs = -st.k * y[0], Fd = -cd() * y[1], fpx = 70 / (st.k * X0 * Math.max(1, 2 * st.z)), cx = xl + bs / 2;
        [[Fs, P.accent2, "−kx", yF - bs - 10], [Fd, P.warn, "−cv", yF - bs - 26]].forEach(([F, col, s, ya]) => {
          const len = VZ.clamp(F * fpx, -90, 90);
          ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.2;
          if (Math.abs(len) >= 4) VZ.arrow(ctx, cx, ya, cx + len, ya, 7);
          ctx.font = VZ.font(11.5, false, 700); ctx.textAlign = len < 0 ? "right" : "left"; ctx.textBaseline = "middle";
          ctx.fillText(s, cx + len + (len < 0 ? -5 : 5), ya);
        });
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`t = ${t.toFixed(2)} s · ${st.rate === 1 ? "실제 속도" : st.rate + "배속"}`, 10, 8);
        // 변위 그래프
        const W = w0(), ts = VZ.linspace(0, Tw, 300), env = under() && st.z > 0 ? X0 / Math.sqrt(1 - st.z * st.z) : null;
        VZ.chart(ctx, { x: 0, y: yF + 20, w, h: h - yF - 20 }, {
          x: [0, Tw], y: [-1.2 * X0, 1.2 * X0], xLabel: "시간 (s)", title: "변위 x(t) (m)",
          series: [
            ...(env ? [1, -1].map((s) => ({ data: ts.map((u) => [u, s * env * Math.exp(-st.z * W * u)]), color: P.faint, width: 1.2, dash: [4, 4] })) : []),
            { data: ts.map((u) => [u, X0 * (1 + W * u) * Math.exp(-W * u)]), color: P.dim, width: 1.5, dash: [6, 4] },
            { data: hist.map((p) => [p[0], p[1]]), color: P.accent, width: 2.2 },
          ],
          hlines: [{ y: 0, color: P.axis, dash: [] }],
          points: [{ x: t, y: y[0], color: P.accent, r: 4.5 }],
        });
      });
      const [bl, br] = S.split(2);
      const cvE = S.canvas({ parent: bl, aspect: 0.8, maxHeight: 330 }, (ctx, w, h) => {
        const P = VZ.palette(), E0 = 0.5 * st.k * X0 * X0, pc = (e) => (100 * e) / E0, ts = VZ.linspace(0, Tw, 200);
        VZ.chart(ctx, { x: 0, y: 0, w, h: h - 22 }, {
          x: [0, Tw], y: [0, 108], xLabel: "시간 (s)", title: "에너지 (처음 에너지 대비 %)",
          series: [
            { data: ts.map((u) => [u, 100 * Math.exp(-2 * st.z * w0() * u)]), color: P.faint, width: 1.2, dash: [4, 4] },
            { data: hist.map((p) => [p[0], pc(p[2])]), color: P.accent, width: 1.3 },
            { data: hist.map((p) => [p[0], pc(p[3])]), color: P.accent2, width: 1.3 },
            { data: hist.map((p) => [p[0], pc(p[4])]), color: P.warn, width: 2 },
            { data: hist.map((p) => [p[0], pc(p[2] + p[3])]), color: P.text, width: 2.4 },
          ],
        });
        // 범례: 선이 처음과 끝에서 서로 겹쳐서 이름을 선 옆에 달기 어렵다
        let xl = 14;
        ctx.font = VZ.font(11.5, false); ctx.textAlign = "left"; ctx.textBaseline = "middle";
        [["K + U", P.text, 2.4], ["운동 K", P.accent, 1.3], ["위치 U", P.accent2, 1.3], ["열", P.warn, 2], ["e^(−2ζω₀t)", P.faint, 1.2]].forEach(([s, col, lw]) => {
          ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(xl, h - 9); ctx.lineTo(xl + 12, h - 9); ctx.stroke();
          ctx.fillStyle = P.dim; ctx.fillText(s, xl + 16, h - 9);
          xl += ctx.measureText(s).width + 26;
        });
      });
      const cvZ = S.canvas({ parent: br, aspect: 0.8, maxHeight: 330 }, (ctx) => {
        const P = VZ.palette(), zs = VZ.linspace(0, 2.5, 251), rate = (z) => (z <= 1 ? z : z - Math.sqrt(z * z - 1));
        VZ.chart(ctx, null, {
          x: [0, 2.5], y: [0, 1.15], xLabel: "감쇠비 ζ", title: "감쇠비에 따른 변화 (ω₀ 단위)",
          bands: [{ x0: 0, x1: 1, color: VZ.alpha(P.accent2, 0.06) }],
          series: [
            { data: zs.map((z) => [z, z <= 1 ? Math.sqrt(Math.max(0, 1 - z * z)) : NaN]), color: P.accent2, width: 2.2 },
            { data: zs.map((z) => [z, rate(z)]), color: P.accent, width: 2.4 },
          ],
          vlines: [{ x: 1, color: P.faint, label: "임계" }],
          points: [...(under() ? [{ x: st.z, y: Math.sqrt(1 - st.z * st.z), color: P.accent2, r: 5 }] : []), { x: st.z, y: rate(st.z), color: P.accent, r: 5 }],
          texts: [
            { x: 0.06, y: 1.09, text: "감쇠 진동수 ω_d", color: P.accent2, sans: true, size: 11.5 },
            { x: 1.06, y: 0.95, text: "되돌아오는 빠르기 (감쇠율)", color: P.accent, sans: true, size: 11.5 },
            { x: 0.5, y: 0.07, text: "과소 감쇠", align: "center", sans: true },
            { x: 1.75, y: 0.07, text: "과대 감쇠", align: "center", sans: true },
          ],
        });
      });
      const set = S.stats([
        { k: "T0", label: "고유 주기 2π√(m/k)" }, { k: "T", label: "측정 주기 (이론 2π/ω_d)" }, { k: "kind", label: "감쇠 상태" },
        { k: "r", label: "이웃 봉우리 비 (측정)" }, { k: "E", label: "역학적 에너지 K + U" }, { k: "sum", label: "K + U + 열" },
      ]);
      function readouts() {
        const E0 = 0.5 * st.k * X0 * X0, K = 0.5 * st.m * y[1] * y[1], U = 0.5 * st.k * y[0] * y[0];
        set("T0", ((2 * Math.PI) / w0()).toFixed(3) + `<small>s · ω₀ = ${w0().toFixed(2)} rad/s</small>`);
        const Td = under() ? ((2 * Math.PI) / wd()).toFixed(3) : null, n = ups.length;
        set("T", n >= 2 ? (ups[n - 1] - ups[n - 2]).toFixed(3) + `<small>s · 이론 ${Td}</small>` : Td ? `—<small>이론 ${Td} s</small>` : "—<small>진동하지 않음</small>");
        set("kind", (st.z === 0 ? "감쇠 없음" : under() ? "과소 감쇠" : st.z < 1 + 1e-9 ? "임계 감쇠" : "과대 감쇠") + `<small>c = ${cd().toFixed(2)} N·s/m</small>`);
        const m = peaks.length, rTh = under() ? Math.exp((-2 * Math.PI * st.z) / Math.sqrt(1 - st.z * st.z)) : null;
        const fr = (r) => (r >= 0.1 ? r.toFixed(3) : r >= 1e-3 ? r.toPrecision(3) : r.toExponential(2)); // ζ가 1에 가까우면 비가 아주 작다
        set("r", m >= 2 ? fr(peaks[m - 1] / peaks[m - 2]) + `<small>이론 ${fr(rTh)}</small>` : rTh != null ? `—<small>이론 ${fr(rTh)}</small>` : "—<small>봉우리 없음</small>");
        set("E", ((100 * (K + U)) / E0).toFixed(1) + `<small>% · 처음 ${E0.toFixed(3)} J</small>`);
        set("sum", ((100 * (K + U + y[2])) / E0).toFixed(2) + "<small>%</small>");
      }
      S.range({ label: "질량 m", min: 0.2, max: 5, step: 0.1, value: st.m, fmt: (x) => x.toFixed(1) + " kg", onInput: (x) => { st.m = x; reset(); } });
      S.range({ label: "용수철 상수 k", min: 1, max: 50, step: 1, value: st.k, fmt: (x) => x + " N/m", onInput: (x) => { st.k = x; reset(); } });
      const zr = S.range({ label: "감쇠비 ζ", min: 0, max: 2.5, step: 0.01, value: st.z, fmt: (x) => x.toFixed(2), onInput: (x) => { st.z = x; preset.set("", false); reset(); } });
      // 예시 감쇠비. 슬라이더를 조용히 옮겨야 슬라이더 쪽에서 이 선택을 지우지 않는다
      const preset = S.seg({ label: "감쇠 예시", options: [["0", "없음"], ["0.1", "과소"], ["1", "임계"], ["2", "과대"]], value: "0.1", onChange: (v) => { st.z = Number(v); zr.set(st.z, false); reset(); } });
      // 질량이 크고 용수철이 약하면 주기가 10 s를 넘으므로 빨리 감기도 둔다
      S.seg({ label: "재생 속도", options: [["0.5", "½배"], ["1", "실제"], ["2", "2배"], ["4", "4배"]], value: "1", onChange: (x) => (st.rate = Number(x)) });
      S.button("다시 놓기", () => reset(), { primary: true });
      S.loop((dt) => {
        if (t < Tw) {
          const T = Math.min(dt * st.rate, Tw - t), n = Math.ceil(T / 0.001); // 1 ms보다 잘게 나눠 적분한다
          for (let i = 0; i < n; i++) step(T / n);
          hist.push([t, y[0], 0.5 * st.m * y[1] * y[1], 0.5 * st.k * y[0] * y[0], y[2]]);
        }
        cvS.redraw(); cvE.redraw(); cvZ.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     9. 진자와 위상 공간
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
     10. 강제 감쇠 진동자와 공명
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
     11. 결합 진동자와 정규 모드
     ====================================================================== */
  Lab.register({
    id: "coupled", field: "phys", thumb: "coupled",
    title: "결합 진동자 — 두 물체 사이를 오가는 에너지와 정규 모드",
    desc: "용수철로 이어진 두 물체에서 결합 세기와 처음 조건을 바꾸며, 한 물체의 진동이 이웃으로 옮겨 갔다 돌아오는 맥놀이와 두 정규 모드(같은 방향 ω₀, 반대 방향 √(ω₀² + 2κ))를 봅니다.",
    tags: ["진동", "정규 모드", "맥놀이", "에너지"],
    note: "해볼 것: 한쪽만 당겨 놓으면 진동이 이웃 물체로 옮겨 갔다가 돌아옵니다. 이 움직임은 같은 방향 모드와 반대 방향 모드가 반씩 섞인 것이고, 두 모드의 진동수 차이가 맥놀이를 만들어 에너지가 π/(ω₂ − ω₁)마다 한쪽에서 다른 쪽으로 넘어갑니다. 같은 방향이나 반대 방향으로 놓으면 모드 하나만 들떠서 두 물체가 끝까지 같은 진폭으로 움직이고, 에너지는 옮겨 가지 않습니다. 같은 방향 모드에서는 가운데 용수철이 늘어나지 않으므로 진동수가 결합 세기와 상관없이 ω₀입니다. 결합을 약하게 하면 에너지가 옮겨 가는 데 오래 걸리고, 강하게 하면 가운데 용수철에도 에너지가 꽤 담겨서 한 물체로 다 넘어가지는 않습니다.",
    mount(S) {
      const A = 0.1, w0 = 2 * Math.PI, k = w0 * w0; // 처음 진폭 (m). 질량 1 kg, 바깥 용수철만 있을 때 주기 1 s
      const st = { r: 0.1, init: "one", rate: 1 }; // r = κ/ω₀² = 결합 용수철 상수 ÷ 바깥 용수철 상수
      const kc = () => st.r * k, w2 = () => w0 * Math.sqrt(1 + 2 * st.r), tTr = () => Math.PI / (w2() - w0);
      const f = ([x1, v1, x2, v2]) => { const c = kc(); return [v1, -k * x1 - c * (x1 - x2), v2, -k * x2 - c * (x2 - x1)]; };
      // 물체 1, 물체 2의 에너지(자기 바깥 용수철 포함)와 결합 용수철의 에너지
      const energy = ([x1, v1, x2, v2]) => [0.5 * v1 * v1 + 0.5 * k * x1 * x1, 0.5 * v2 * v2 + 0.5 * k * x2 * x2, 0.5 * kc() * (x1 - x2) ** 2];
      const INIT = { one: [A, 0], same: [A, A], opp: [A, -A] };
      // 한 번 놓은 상태. zc: 정규 모드 좌표 q₁ = (x₁ + x₂)/2, q₂ = (x₁ − x₂)/2가 위로 0을 지나는 시각
      let y, t, Tw, E0, hist, zc;
      function reset() {
        const [a, b] = INIT[st.init];
        y = [a, 0, b, 0]; t = 0; zc = [[], []];
        const e = energy(y); E0 = e[0] + e[1] + e[2]; hist = [[0, a, b, ...e]];
        Tw = VZ.clamp(4 * tTr(), 8, 40); // 그래프 시간 폭: 에너지가 두 번 오가는 동안
      }
      reset();
      function step(h) {
        const y1 = rk4(f, y, h);
        [[y[0] + y[2], y1[0] + y1[2]], [y[0] - y[2], y1[0] - y1[2]]].forEach(([q0, q1], i) => { if (q0 < 0 && q1 >= 0) zc[i].push(t + (h * -q0) / (q1 - q0)); }); // 선형 보간
        y = y1; t += h;
      }
      // 맥놀이 포락선 (이론). 한쪽만 당기면 x₁ = A cos ω̄t cos(Δω t/2), x₂ = A sin ω̄t sin(Δω t/2)
      const env = (i, u) => (st.init !== "one" ? A : A * Math.abs((i ? Math.sin : Math.cos)(((w2() - w0) * u) / 2)));
      const marks = () => (st.init === "one" ? Array.from({ length: Math.floor(Tw / tTr()) }, (_, n) => (n + 1) * tTr()) : []); // 에너지가 다 넘어가는 시각
      function zig(ctx, xa, xb, yc, amp) {
        ctx.beginPath(); ctx.moveTo(xa, yc);
        for (let i = 1; i < 12; i++) ctx.lineTo(xa + ((xb - xa) * i) / 12, yc + (i % 2 ? -amp : amp));
        ctx.lineTo(xb, yc); ctx.stroke();
      }
      S.legend([
        { label: "물체 1", color: (P) => P.accent }, { label: "물체 2", color: (P) => P.accent2 },
        { label: "결합 용수철", color: (P) => P.ok }, { label: "포락선 (이론)", color: (P) => P.faint, dash: true },
      ]);
      const cvS = S.canvas({ aspect: 0.66, minHeight: 400, maxHeight: 500 }, (ctx, w, h) => {
        const P = VZ.palette(), yF = 96, bs = 36, xs = (0.075 * w) / A, e1 = 0.33 * w, e2 = 0.67 * w; // 바닥 높이, 물체 한 변, 축척 (px/m), 평형 위치
        const p1 = e1 + y[0] * xs, p2 = e2 + y[2] * xs, yc = yF - bs / 2;
        ctx.strokeStyle = P.axis; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(14, yF); ctx.lineTo(w - 14, yF); ctx.moveTo(14, yF - 56); ctx.lineTo(14, yF); ctx.moveTo(w - 14, yF - 56); ctx.lineTo(w - 14, yF); ctx.stroke();
        ctx.strokeStyle = P.faint; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath();
        [e1, e2].forEach((e) => { ctx.moveTo(e, yF - 60); ctx.lineTo(e, yF + 4); }); ctx.stroke(); ctx.setLineDash([]);
        // 바깥 용수철 둘과 결합 용수철 (굵기는 결합 세기에 따라)
        ctx.strokeStyle = P.dim; ctx.lineWidth = 1.6; zig(ctx, 14, p1 - bs / 2, yc, 8); zig(ctx, p2 + bs / 2, w - 14, yc, 8);
        ctx.strokeStyle = P.ok; ctx.lineWidth = 1.2 + 3 * st.r; zig(ctx, p1 + bs / 2, p2 - bs / 2, yc, 8);
        [[p1, P.accent, "1"], [p2, P.accent2, "2"]].forEach(([p, col, s]) => {
          ctx.fillStyle = VZ.alpha(col, 0.3); ctx.strokeStyle = col; ctx.lineWidth = 2;
          ctx.fillRect(p - bs / 2, yF - bs, bs, bs); ctx.strokeRect(p - bs / 2, yF - bs, bs, bs);
          ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, p, yc);
        });
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`t = ${t.toFixed(2)} s · ${st.rate === 1 ? "실제 속도" : st.rate + "배속"}`, 10, 8);
        // 두 물체의 변위. 위아래로 나눠 그린다
        const ts = VZ.linspace(0, Tw, 400), gh = (h - yF - 12) / 2;
        [0, 1].forEach((i) => {
          const col = i ? P.accent2 : P.accent;
          VZ.chart(ctx, { x: 0, y: yF + 12 + i * gh, w, h: gh }, {
            x: [0, Tw], y: [-1.25 * A, 1.25 * A], xLabel: i ? "시간 (s)" : "", title: `물체 ${i + 1}의 변위 x${i ? "₂" : "₁"} (m)`,
            series: [
              ...[1, -1].map((s) => ({ data: ts.map((u) => [u, s * env(i, u)]), color: P.faint, width: 1.2, dash: [4, 4] })),
              { data: hist.map((p) => [p[0], p[1 + i]]), color: col, width: 1.6 },
            ],
            vlines: marks().map((x) => ({ x, color: VZ.alpha(P.ok, 0.6) })),
            hlines: [{ y: 0, color: P.axis, dash: [] }],
          });
        });
      });
      const [bl, br] = S.split(2);
      const cvE = S.canvas({ parent: bl, aspect: 0.8, maxHeight: 330 }, (ctx) => {
        const P = VZ.palette(), pc = (e) => (100 * e) / E0;
        VZ.chart(ctx, null, {
          x: [0, Tw], y: [0, 110], xLabel: "시간 (s)", title: "에너지 몫 (처음 에너지 대비 %)",
          series: [
            { data: hist.map((p) => [p[0], pc(p[5])]), color: P.ok, width: 1.4 },
            // 모드 하나만 들뜨면 두 물체의 몫이 같아 겹치므로 물체 1을 굵게 깔아 둘 다 보이게 한다
            { data: hist.map((p) => [p[0], pc(p[3])]), color: P.accent, width: 3.6 },
            { data: hist.map((p) => [p[0], pc(p[4])]), color: P.accent2, width: 1.8 },
          ],
          vlines: marks().map((x, n) => ({ x, color: VZ.alpha(P.ok, 0.6), label: n ? "" : "π/(ω₂ − ω₁)" })),
        });
      });
      const cvW = S.canvas({ parent: br, aspect: 0.8, maxHeight: 330 }, (ctx, w, h) => {
        const P = VZ.palette(), rs = VZ.linspace(0.005, 1, 200), tr = (r) => Math.PI / (w0 * (Math.sqrt(1 + 2 * r) - 1));
        VZ.chart(ctx, { x: 0, y: 0, w, h: h * 0.52 }, {
          x: [0, 1], y: [0.9, 1.8], title: "정규 모드 진동수 (ω₀ 단위)",
          series: [{ data: rs.map((r) => [r, 1]), color: P.dim, width: 2.2 }, { data: rs.map((r) => [r, Math.sqrt(1 + 2 * r)]), color: P.warn, width: 2.2 }],
          points: [{ x: st.r, y: 1, color: P.dim, r: 5 }, { x: st.r, y: Math.sqrt(1 + 2 * st.r), color: P.warn, r: 5 }],
          texts: [
            { x: 0.98, y: 1.03, text: "같은 방향 ω₁ = ω₀", align: "right", baseline: "bottom", color: P.dim, sans: true, size: 11.5 },
            { x: 0.03, y: 1.62, text: "반대 방향 ω₂ = √(ω₀² + 2κ)", color: P.warn, sans: true, size: 11.5 },
          ],
        });
        VZ.chart(ctx, { x: 0, y: h * 0.52, w, h: h * 0.48 }, {
          x: [0, 1], y: [0, 30], xLabel: "결합 세기 κ/ω₀²", title: "에너지가 옮겨 가는 시간 (s)",
          series: [{ data: rs.map((r) => [r, Math.min(tr(r), 40)]), color: P.ok, width: 2.2 }],
          points: [{ x: st.r, y: Math.min(tTr(), 30), color: P.ok, r: 5 }],
        });
      });
      const set = S.stats([
        { k: "T1", label: "같은 방향 모드 주기 (측정)" }, { k: "T2", label: "반대 방향 모드 주기 (측정)" },
        { k: "tr", label: "에너지가 옮겨 가는 시간 π/(ω₂ − ω₁)" }, { k: "Es", label: "에너지 몫: 물체 1 · 물체 2 · 결합" }, { k: "E", label: "전체 에너지" },
      ]);
      function readouts() {
        const per = (i) => { const z = zc[i], n = z.length; return n >= 2 ? z[n - 1] - z[n - 2] : null; };
        const T1 = per(0), T2 = per(1), th = [1, (2 * Math.PI) / w2()], off = [st.init === "opp", st.init === "same"];
        [T1, T2].forEach((T, i) => set("T" + (i + 1), T != null ? T.toFixed(3) + `<small>s · 이론 ${th[i].toFixed(3)}</small>` : off[i] ? "—<small>이 모드는 들뜨지 않음</small>" : `—<small>이론 ${th[i].toFixed(3)} s</small>`));
        set("tr", tTr().toFixed(2) + `<small>s${st.init !== "one" ? " · 모드 하나만 들떠서 옮겨 가지 않음" : T1 && T2 ? ` · 측정한 모드 주기로 ${((T1 * T2) / (2 * (T1 - T2))).toFixed(2)} s` : ""}</small>`);
        const e = energy(y), pc = (v) => Math.round((100 * v) / E0);
        set("Es", `${pc(e[0])}<small>% · </small>${pc(e[1])}<small>% · </small>${pc(e[2])}<small>%</small>`);
        set("E", ((100 * (e[0] + e[1] + e[2])) / E0).toFixed(2) + "<small>% (처음 대비)</small>");
      }
      S.range({ label: "결합 세기 κ/ω₀² (= k_c/k)", min: 0.02, max: 1, step: 0.01, value: st.r, fmt: (x) => x.toFixed(2), onInput: (x) => { st.r = x; reset(); } });
      S.seg({ label: "처음 조건 (10 cm 당겨 놓기)", options: [["one", "한쪽만"], ["same", "같은 방향"], ["opp", "반대 방향"]], value: "one", onChange: (v) => { st.init = v; reset(); } });
      S.seg({ label: "재생 속도", options: [["0.5", "½배"], ["1", "실제"], ["2", "2배"], ["4", "4배"]], value: "1", onChange: (x) => (st.rate = Number(x)) });
      S.button("다시 놓기", () => reset(), { primary: true });
      S.loop((dt) => {
        if (t < Tw) {
          const T = Math.min(dt * st.rate, Tw - t), n = Math.ceil(T / 0.001); // 1 ms보다 잘게 나눠 적분한다
          for (let i = 0; i < n; i++) step(T / n);
          hist.push([t, y[0], y[2], ...energy(y)]);
        }
        cvS.redraw(); cvE.redraw(); cvW.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     12. 케플러 궤도
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
     13. 라그랑주 점 (원 궤도 제한 삼체 문제)
     ====================================================================== */
  Lab.register({
    id: "lagrange", field: "phys", thumb: "lagrange",
    title: "라그랑주 점 — 두 천체와 함께 도는 다섯 개의 평형점",
    desc: "두 천체의 질량비와 시작점(L1~L5)을 바꾸며, 두 천체와 함께 도는 틀에서 가벼운 물체가 머무는지 벗어나는지 봅니다. 유효 퍼텐셜 등고선, L4·L5 둘레의 올챙이·말굽 궤도, 라우스 조건 μ < 0.0385, 야코비 상수 보존을 확인합니다.",
    tags: ["중력", "삼체 문제", "회전 기준계", "안정성"],
    note: "해볼 것: 태양–목성에서 L4 가까이 놓으면 L4 둘레를 천천히 오가는 올챙이 궤도가 그려집니다. 목성의 트로이 소행성들이 이렇게 움직입니다. 어긋난 각을 40°쯤으로 키우면 L3를 돌아 L5 쪽까지 갔다 오는 말굽 궤도가 됩니다. L1·L2·L3에서는 아주 조금만 어긋나도 점점 빨리 멀어지는데, 로그 눈금 그래프에서 곧은 선이 되면 지수적으로 멀어진다는 뜻입니다. 질량비를 0.0385보다 키우면 L4·L5도 불안정해집니다. 초록 점선은 물체의 야코비 상수로 정해지는 영속도 곡선이고, 물체는 이 곡선을 넘어가지 못합니다. 멈춘 틀로 바꾸면 L4의 물체가 작은 천체보다 60° 앞서 같은 궤도를 도는 것이 보입니다.",
    mount(S) {
      // 단위: 두 천체 사이 거리 1, 공전 각속도 1(공전 주기 2π), 전체 질량 1. 큰 천체는 (−μ, 0), 작은 천체는 (1 − μ, 0)에서 함께 돈다
      const PRE = { se: [3.003e-6, "태양", "지구"], sj: [9.54e-4, "태양", "목성"], em: [0.01215, "지구", "달"] };
      const MU_C = (1 - Math.sqrt(23 / 27)) / 2, VIEW = 1.6; // 라우스 한계 0.0385, 보기 범위
      const st = { mu: PRE.sj[0], pre: "sj", L: 3, dphi: 20, frame: "rot", rate: 4 };
      const names = () => (PRE[st.pre] ? PRE[st.pre].slice(1) : ["큰 천체", "작은 천체"]);
      // 회전하는 틀의 유효 퍼텐셜 Ω = (x² + y²)/2 + (1 − μ)/r₁ + μ/r₂. 운동 방정식 ẍ − 2ẏ = ∂Ω/∂x, ÿ + 2ẋ = ∂Ω/∂y
      const grad = (mu, x, y) => {
        const a = (1 - mu) / Math.hypot(x + mu, y) ** 3, b = mu / Math.hypot(x - 1 + mu, y) ** 3;
        return [x - a * (x + mu) - b * (x - 1 + mu), y - a * y - b * y];
      };
      const om2 = (mu, x, y) => x * x + y * y + (2 * (1 - mu)) / Math.hypot(x + mu, y) + (2 * mu) / Math.hypot(x - 1 + mu, y);
      const f = ([x, y, u, v]) => { const [gx, gy] = grad(st.mu, x, y); return [u, v, gx + 2 * v, gy - 2 * u]; };
      /** L1~L5. 일직선 위의 셋은 ∂Ω/∂x = 0을 이분법으로 푼다 */
      function lpoints(mu) {
        const g = (x) => grad(mu, x, 0)[0], root = (a, b) => { for (let i = 0; i < 100; i++) { const m = (a + b) / 2; if (g(a) * g(m) <= 0) b = m; else a = m; } return (a + b) / 2; };
        return [[root(-mu + 1e-9, 1 - mu - 1e-9), 0], [root(1 - mu + 1e-9, 3), 0], [root(-3, -mu - 1e-9), 0], [0.5 - mu, Math.sqrt(3) / 2], [0.5 - mu, -Math.sqrt(3) / 2]];
      }
      // L4·L5에 작게 어긋났을 때의 느린 진동(칭동) 각진동수. 27μ(1 − μ) > 1이면 불안정해서 NaN
      const wSlow = (mu) => { const d = 1 - 27 * mu * (1 - mu); return d > 0 ? Math.sqrt((1 - Math.sqrt(d)) / 2) : NaN; };
      // 일직선 L점에서 멀어지는 빠르기 λ. c = (1 − μ)/r₁³ + μ/r₂³일 때 λ² = (c − 2 + √(9c² − 8c))/2
      const lamCol = (mu, x) => { const c = (1 - mu) / Math.abs(x + mu) ** 3 + mu / Math.abs(x - 1 + mu) ** 3; return Math.sqrt((c - 2 + Math.sqrt(9 * c * c - 8 * c)) / 2); };
      const sci = (v) => {
        const e = Math.floor(Math.log10(v));
        return e >= -2 ? v.toPrecision(3) : `${(v / 10 ** e).toFixed(2)}×10${String(e).replace(/./g, (c) => "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"["-0123456789".indexOf(c)])}`;
      };
      // 한 번 놓은 상태. phi: 무게중심에서 잰 각(풀어 쓴 값), trail: 그림용 표본 [x, y, t, 각(°), L점과의 거리],
      // ring: 한 공전에 64번 잰 각과 위치. 최근 한 공전은 칭동 주기 측정용 이동 평균, 최근 두 공전은 멈춘 틀 그림에 쓴다
      let L, y, t, Tw, C0, phi, aPrev, trail, ts, dts, ring, lastAvg, tm, ups, cross, status;
      const isTri = () => st.L >= 3;
      function reset() {
        L = lpoints(st.mu);
        const [lx, ly] = L[st.L];
        if (isTri()) { // L4는 작은 천체 쪽(각이 줄어드는 쪽), L5는 반대로 같은 반지름에서 각만 옮긴다
          const r = Math.hypot(lx, ly), a = Math.atan2(ly, lx) + ((st.L === 3 ? -1 : 1) * st.dphi * Math.PI) / 180;
          y = [r * Math.cos(a), r * Math.sin(a), 0, 0];
        } else y = [lx, 1e-8, 0, 0]; // 일직선 L점은 축에 수직으로 10⁻⁸만 어긋나게 놓는다. 축 방향으로 밀면 불안정 모드 성분이 작아 처음 증가율이 흐려진다
        const ws = wSlow(st.mu);
        // 그래프 시간 폭(공전 횟수): L4·L5는 칭동 3번쯤, 일직선 L점은 10⁻⁸에서 1까지 멀어지는 시간(e배 18번쯤)
        Tw = TAU * (isTri() ? (isFinite(ws) ? VZ.clamp(3.2 / ws, 10, 800) : 20) : VZ.clamp(20 / (TAU * lamCol(st.mu, lx)) + 1, 3, 1500));
        t = 0; C0 = om2(st.mu, y[0], y[1]); aPrev = phi = Math.atan2(y[1], y[0]); status = "";
        trail = []; ts = 0; dts = Math.max(TAU / 64, Tw / 30000); ring = []; lastAvg = null; tm = 0; ups = []; cross = [null, null];
        sample();
      }
      const dist = () => Math.hypot(y[0] - L[st.L][0], y[1] - L[st.L][1]);
      function sample() {
        if (t >= ts) { trail.push([y[0], y[1], t, (((phi * 180) / Math.PI) % 360 + 360) % 360, dist()]); ts += dts; }
        if (t >= tm) { // 한 공전 이동 평균이 L4(L5)의 각을 위로 지나는 시각
          ring.push([phi, y[0], y[1], t]); if (ring.length > 128) ring.shift();
          if (ring.length >= 64) {
            const avg = ring.slice(-64).reduce((s, r) => s + r[0], 0) / 64 - Math.atan2(L[st.L][1], L[st.L][0]);
            if (lastAvg != null && lastAvg < 0 && avg >= 0) ups.push(t);
            lastAvg = avg;
          }
          tm += TAU / 64;
        }
        const d = dist(); // 일직선 L점: 거리가 10⁻⁶과 10⁻⁴을 처음 넘는 시각
        if (cross[0] == null && d >= 1e-6) cross[0] = t;
        if (cross[1] == null && d >= 1e-4) cross[1] = t;
      }
      const rHit = () => 0.1 * Math.cbrt(st.mu / 3); // 작은 천체의 힐 반지름의 1/10까지 다가가면 부딪힌 것으로 본다
      function advance(T) {
        let left = T, n = 0;
        while (left > 1e-12 && !status && t < Tw && n++ < 40000) {
          const r1 = Math.hypot(y[0] + st.mu, y[1]), r2 = Math.hypot(y[0] - 1 + st.mu, y[1]);
          const h = Math.min(left, Tw - t, 0.01, 0.02 * Math.min(r1, r2) ** 1.5); // 천체에 가까우면 간격을 줄인다
          y = rk4(f, y, h); t += h; left -= h;
          const a = Math.atan2(y[1], y[0]); let da = a - aPrev;
          if (da > Math.PI) da -= TAU; else if (da < -Math.PI) da += TAU;
          phi += da; aPrev = a;
          sample();
          if (r2 < rHit() || r1 < 0.02) status = "부딪혀 멈춤"; else if (Math.hypot(y[0], y[1]) > 3) status = "멀리 벗어남";
        }
      }
      reset();
      S.legend([
        { label: "시험 물체", color: (P) => P.accent, dot: true }, { label: "영속도 곡선", color: (P) => P.ok, dash: true }, { label: "유효 퍼텐셜 등고선", color: (P) => VZ.alpha(P.dim, 0.5) },
      ]);
      const [left, right] = S.split(2);
      let grid = null; // 유효 퍼텐셜(2Ω) 격자. 질량비나 캔버스 크기가 바뀔 때만 다시 계산한다
      const cvM = S.canvas({ parent: left, aspect: 1, maxHeight: 480 }, (ctx, w, h) => {
        const P = VZ.palette(), s = Math.min(w, h - 26) / (2 * VIEW), cx = w / 2, cy = 26 + (h - 26) / 2, rot = st.frame === "rot";
        const X = (x) => cx + x * s, Y = (v) => cy - v * s;
        const turn = (p, a) => (rot ? p : [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]); // 멈춘 틀에서는 시각 a만큼 돌려 그린다
        if (rot) {
          const nx = 160, key = st.mu + "|" + w + "|" + h;
          if (!grid || grid.key !== key) {
            const E = new Float64Array(nx * nx);
            for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) E[j * nx + i] = om2(st.mu, -VIEW + (2 * VIEW * i) / (nx - 1), VIEW - (2 * VIEW * j) / (nx - 1));
            grid = { key, E };
          }
          const gx = (i) => X(-VIEW + (2 * VIEW * i) / (nx - 1)), gy = (j) => Y(VIEW - (2 * VIEW * j) / (nx - 1)), CL = L.map(([x, v]) => om2(st.mu, x, v));
          ctx.lineWidth = 1; ctx.strokeStyle = VZ.alpha(P.dim, 0.22);
          [CL[3] + 0.3 * (CL[2] - CL[3]), CL[3] + 0.7 * (CL[2] - CL[3]), CL[0] + 0.05, CL[0] + 0.2, 3.6].forEach((lv) => VZ.contour(ctx, nx, nx, grid.E, lv, gx, gy));
          ctx.strokeStyle = VZ.alpha(P.dim, 0.5); [CL[0], CL[1], CL[2]].forEach((lv) => VZ.contour(ctx, nx, nx, grid.E, lv, gx, gy)); // L1·L2·L3를 지나는 등고선
          ctx.strokeStyle = P.ok; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); VZ.contour(ctx, nx, nx, grid.E, C0, gx, gy); ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = P.faint; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(cx, cy, (1 - st.mu) * s, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        }
        // 지나온 길 (멈춘 틀에서는 최근 두 공전만)
        ctx.strokeStyle = VZ.alpha(P.accent, 0.65); ctx.lineWidth = 1.4; ctx.beginPath();
        const pts = rot ? trail : ring.map((r) => [r[1], r[2], r[3]]);
        pts.forEach((p, i) => { const q = turn(p, p[2]); i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])); });
        ctx.stroke();
        // L점과 두 천체
        const [n1, n2] = names();
        ctx.font = VZ.font(11.5, false, 700);
        L.forEach((p, i) => {
          const q = turn(p, t), px = X(q[0]), py = Y(q[1]);
          ctx.strokeStyle = P.text; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px - 4, py - 4); ctx.lineTo(px + 4, py + 4); ctx.moveTo(px - 4, py + 4); ctx.lineTo(px + 4, py - 4); ctx.stroke();
          ctx.fillStyle = i === st.L ? P.accent : P.text; ctx.textAlign = i === 0 ? "right" : i === 1 ? "left" : "center"; ctx.textBaseline = i === 3 ? "bottom" : "top";
          ctx.fillText("L" + (i + 1), px + (i === 0 ? -3 : i === 1 ? 3 : 0), py + (i === 3 ? -6 : 6));
        });
        [[[-st.mu, 0], 8, P.warn, n1], [[1 - st.mu, 0], 5, P.accent2, n2]].forEach(([p, r, col, nm], i) => {
          const q = turn(p, t);
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), r, 0, 7); ctx.fill();
          ctx.fillStyle = P.dim; ctx.font = VZ.font(11.5, false); ctx.textAlign = "center"; ctx.textBaseline = i ? "bottom" : "top";
          ctx.fillText(nm, X(q[0]), Y(q[1]) + (i ? -9 : 11));
        });
        const q = turn(y, t);
        ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), 4.5, 0, 7); ctx.fill();
        ctx.fillStyle = P.dim; ctx.font = VZ.font(12, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`${(t / TAU).toFixed(1)}번째 공전 · ${rot ? "함께 도는 틀" : "멈춘 틀"}${status ? " · " + status : ""}`, 10, 6);
      });
      const cvR = S.canvas({ parent: right, aspect: 1, maxHeight: 480 }, (ctx, w, h) => {
        const P = VZ.palette(), top = { x: 0, y: 0, w, h: h * 0.52 }, bot = { x: 0, y: h * 0.52, w, h: h * 0.48 }, T = Tw / TAU;
        if (isTri()) {
          // 각이 0°/360°를 넘어가면 선을 끊는다
          const data = trail.map((p, i) => [p[2] / TAU, i && Math.abs(p[3] - trail[i - 1][3]) > 180 ? NaN : p[3]]);
          VZ.chart(ctx, top, {
            x: [0, T], y: [0, 360], yTicks: [0, 60, 180, 300, 360], yFmt: (v) => ({ 60: "L4", 180: "L3", 300: "L5" })[v] || String(v),
            xLabel: "시간 (공전 횟수)", title: "무게중심에서 잰 각 (작은 천체 = 0°)",
            series: [{ data, color: P.accent, width: 1.6 }], hlines: [60, 180, 300].map((v) => ({ y: v, color: P.faint })),
          });
        } else {
          const lam = lamCol(st.mu, L[st.L][0]);
          VZ.chart(ctx, top, {
            x: [0, T], y: [1e-9, 10], logY: true, xLabel: "시간 (공전 횟수)", title: "L점에서 벗어난 거리 (로그 눈금)",
            series: [
              { data: VZ.linspace(0, Tw, 100).map((u) => [u / TAU, 1e-8 * Math.exp(lam * u)]), color: P.faint, width: 1.3, dash: [5, 4] },
              { data: trail.map((p) => [p[2] / TAU, Math.max(p[4], 1e-12)]), color: P.accent, width: 1.8 },
            ],
            texts: [{ x: T * 0.03, y: 3e-9, text: "점선: 이론 기울기 e^(λt)", sans: true }],
          });
        }
        // 질량비에 따른 L4·L5 칭동 주기. 라우스 한계를 넘으면 불안정
        const ms = VZ.linspace(-6, Math.log10(MU_C) - 1e-4, 160).map((e) => 10 ** e);
        VZ.chart(ctx, bot, {
          x: [1e-6, 0.1], y: [1, 1000], logX: true, logY: true, xLabel: "질량비 μ (로그 눈금)", title: "L4·L5 칭동 주기 (공전 횟수)",
          bands: [{ x0: MU_C, x1: 0.1, color: VZ.alpha(P.bad, 0.1) }],
          series: [{ data: ms.map((m) => [m, 1 / wSlow(m)]), color: P.accent2, width: 2.2 }],
          vlines: [{ x: MU_C, color: P.bad, label: "0.0385", align: "right" }],
          points: Object.values(PRE).map(([m, a, b]) => ({ x: m, y: 1 / wSlow(m), color: P.dim, r: 3.5, label: `${a}–${b}` }))
            .concat(st.mu < MU_C ? [{ x: st.mu, y: 1 / wSlow(st.mu), color: P.accent, r: 5.5 }] : []),
          texts: [{ x: 0.06, y: 3, text: "불안정", align: "center", sans: true, color: P.bad }],
        });
      });
      const set = S.stats([{ k: "mu", label: "질량비 μ = m₂/(m₁ + m₂)" }, { k: "Lp", label: "시작점" }, { k: "stab", label: "L4·L5 안정성" }, { k: "x", label: "" }, { k: "C", label: "야코비 상수 C" }]);
      const xLab = S.el.querySelector(".sim-readout").children[3].querySelector(".k"); // 시작점에 따라 이름이 바뀐다
      function readouts() {
        const [n1, n2] = names(), [lx, ly] = L[st.L], ws = wSlow(st.mu);
        set("mu", sci(st.mu) + `<small>${n1}–${n2}</small>`);
        set("Lp", `L${st.L + 1}<small>(${lx.toFixed(4)}, ${ly.toFixed(4)})</small>`);
        set("stab", isFinite(ws) ? "안정<small>μ < 0.0385 (라우스 조건)</small>" : '<span style="color:var(--bad)">불안정</span><small>μ > 0.0385</small>');
        if (isTri()) {
          xLab.textContent = "칭동 주기 (측정)";
          // 측정한 모든 주기의 평균. μ가 크면 빠른 진동이 한 공전 이동 평균으로 다 걸러지지 않아 주기 하나하나는 조금씩 흔들린다
          const n = ups.length, per = n >= 2 ? (ups[n - 1] - ups[0]) / (n - 1) / TAU : null;
          set("x", !isFinite(ws) ? "—<small>불안정해서 L점을 떠남</small>" : (per ? per.toFixed(2) + "<small>공전" : "—<small>") + ` · 작은 진폭 이론 ${(1 / ws).toFixed(2)}</small>`);
        } else {
          xLab.textContent = "거리가 e배 되는 시간 (측정)";
          const tau = cross[1] != null ? (cross[1] - cross[0]) / Math.log(100) / TAU : null; // 10⁻⁶ → 10⁻⁴ 구간의 기울기
          set("x", (tau ? tau.toPrecision(3) + "<small>공전" : "—<small>") + ` · 이론 ${(1 / (lamCol(st.mu, lx) * TAU)).toPrecision(3)}</small>`);
        }
        const C = om2(st.mu, y[0], y[1]) - y[2] ** 2 - y[3] ** 2;
        set("C", C.toFixed(6) + `<small>처음과 차이 ${Math.abs(C - C0).toExponential(1)}</small>`);
      }
      const show = (g, on) => (g.el.closest(".ctrl").style.display = on ? "" : "none");
      // 눈금이 거칠면 예시 천체의 μ가 둥글려져 판독값과 어긋나므로 잘게 둔다
      const muR = S.range({ label: "질량비 μ (로그 눈금)", min: -6, max: -1, step: 0.0001, value: Math.log10(st.mu), fmt: (x) => sci(10 ** x), onInput: (x) => { st.mu = 10 ** x; st.pre = ""; pre.set("", false); reset(); } });
      // 예시 천체. 슬라이더를 조용히 옮겨야 슬라이더 쪽에서 이 선택을 지우지 않는다
      const pre = S.seg({ label: "두 천체", options: [["se", "태양–지구"], ["sj", "태양–목성"], ["em", "지구–달"]], value: st.pre, onChange: (v) => { st.pre = v; st.mu = PRE[v][0]; muR.set(Math.log10(st.mu), false); reset(); } });
      S.seg({ label: "시작점", options: [0, 1, 2, 3, 4].map((i) => [String(i), "L" + (i + 1)]), value: String(st.L), onChange: (v) => { st.L = Number(v); show(dR, isTri()); reset(); } });
      const dR = S.range({ label: "L4·L5에서 어긋난 각 Δφ (작은 천체 쪽)", min: 0, max: 55, step: 1, value: st.dphi, fmt: (x) => x + "°", onInput: (x) => { st.dphi = x; reset(); } });
      S.seg({ label: "보는 틀", options: [["rot", "함께 도는 틀"], ["inert", "멈춘 틀"]], value: st.frame, onChange: (v) => (st.frame = v) });
      S.seg({ label: "재생 속도 (1초에 공전)", options: [["1", "1번"], ["4", "4번"], ["16", "16번"], ["64", "64번"]], value: String(st.rate), onChange: (v) => (st.rate = Number(v)) });
      S.button("다시 놓기", () => reset(), { primary: true });
      S.loop((dt) => {
        advance(dt * st.rate * TAU);
        cvM.redraw(); cvR.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     14. 파동의 중첩
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
     15. 이중 슬릿 간섭
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
     16. 전기장과 전위
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
     17. 랜덤 워크와 확산
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
     18. 열 확산 (2D 열방정식)
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
     19. 이징 모형
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
     20. 이중 진자 — 카오스
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
     21. 로렌츠 끌개 (3D)
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
     22. 1차원 양자 파속 (퍼짐, 계단, 장벽 터널링, 우물)
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
