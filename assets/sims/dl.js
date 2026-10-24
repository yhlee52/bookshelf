/* ==========================================================================
   딥러닝 실험 모음 (field: "dl")
   nn-playground · optimizers · landscape3d · activations · init-depth
   attention-qk · attention-matrix · posenc · conv2d · softmax-temp
   diffusion2d · overfit · lr-schedule
   ========================================================================== */
(function () {
  "use strict";
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const pow10 = (v) => Math.pow(10, v);
  function erf(x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  /** 강조색 두 개 사이를 배경을 거쳐 잇는 발산 컬러맵 t∈[-1,1] */
  function pnMap(P, k = 0.75) {
    const bg = VZ.parse(P.bg), a = VZ.parse(P.accent), b = VZ.parse(P.accent2);
    return (t) => {
      t = VZ.clamp(t, -1, 1);
      const end = t >= 0 ? a : b, f = Math.abs(t) * k;
      return [bg[0] + (end[0] - bg[0]) * f, bg[1] + (end[1] - bg[1]) * f, bg[2] + (end[2] - bg[2]) * f];
    };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ======================================================================
     1. 신경망 놀이터
     ====================================================================== */
  Lab.register({
    id: "nn-playground", field: "dl", thumb: "scatter", layout: "stack",
    title: "신경망 놀이터 — 결정 경계가 자라는 과정",
    desc: "작은 MLP를 브라우저에서 직접 학습시켜 결정 경계와 각 뉴런이 배우는 특징을 봅니다.",
    tags: ["MLP", "역전파", "분류", "Adam"],
    note: "해볼 것: <b>나선</b> 데이터는 은닉층 1개·뉴런 2개로는 풀리지 않습니다. 층과 뉴런을 늘려 보세요. 오른쪽 네트워크 그림의 작은 사각형은 각 뉴런의 출력 지도이고, 선의 색과 굵기는 가중치의 부호와 크기입니다. (최적화: Adam, 손실: 이진 교차 엔트로피)",
    mount(S) {
      const st = { kind: "circle", noise: 0.08, layers: 2, width: 5, act: "tanh", lr: 0.03, playing: true, seed: 3 };
      const G = 40, DOM = 1.25;
      let data = [], test = [], net = [], inp = new Float64Array(2), t = 0, epoch = 0, hist = [];
      let grid = null;
      const F = { tanh: Math.tanh, relu: (x) => (x > 0 ? x : 0), sigmoid };
      const dF = { tanh: (z, a) => 1 - a * a, relu: (z) => (z > 0 ? 1 : 0), sigmoid: (z, a) => a * (1 - a) };

      function genData(n, rnd) {
        const out = [], nz = () => VZ.randn(rnd) * st.noise;
        for (let i = 0; i < n; i++) {
          const c = i % 2;
          let x, y;
          if (st.kind === "circle") { const r = c ? 0.62 + rnd() * 0.33 : rnd() * 0.42, a = rnd() * Math.PI * 2; x = r * Math.cos(a); y = r * Math.sin(a); }
          else if (st.kind === "xor") { x = (rnd() * 0.9 + 0.08) * (rnd() < 0.5 ? -1 : 1); y = (rnd() * 0.9 + 0.08) * (rnd() < 0.5 ? -1 : 1); out.push([x + nz(), y + nz(), x * y > 0 ? 1 : 0]); continue; }
          else if (st.kind === "gauss") { const m = c ? 0.42 : -0.42; x = m + VZ.randn(rnd) * 0.22; y = m + VZ.randn(rnd) * 0.22; }
          else { const k = Math.floor(i / 2) / (n / 2), r = 0.08 + k * 0.85, a = k * 1.75 * 2 * Math.PI + c * Math.PI; x = r * Math.sin(a); y = r * Math.cos(a); }
          out.push([x + nz(), y + nz(), c]);
        }
        return out;
      }
      function newData() { data = genData(200, VZ.rng(st.seed)); test = genData(200, VZ.rng(st.seed + 99)); }
      function buildNet() {
        const sizes = [2, ...Array(st.layers).fill(st.width), 1];
        const rnd = VZ.rng(st.seed * 7 + 1);
        net = [];
        for (let l = 1; l < sizes.length; l++) {
          const nin = sizes[l - 1], nout = sizes[l], sc = st.act === "relu" ? Math.sqrt(2 / nin) : Math.sqrt(1 / nin);
          const W = new Float64Array(nin * nout).map(() => VZ.randn(rnd) * sc);
          const z = () => new Float64Array(nin * nout), zb = () => new Float64Array(nout);
          net.push({ nin, nout, W, b: st.act === "relu" ? zb().fill(0.05) : zb(), gW: z(), gb: zb(), mW: z(), vW: z(), mb: zb(), vb: zb(), z: zb(), a: zb(), d: zb() });
        }
        t = 0; epoch = 0; hist = [];
      }
      function fwd(x, y) {
        inp[0] = x; inp[1] = y;
        let prev = inp;
        const f = F[st.act];
        for (let l = 0; l < net.length; l++) {
          const L = net[l], last = l === net.length - 1;
          for (let o = 0; o < L.nout; o++) {
            let s = L.b[o];
            const off = o * L.nin;
            for (let i = 0; i < L.nin; i++) s += L.W[off + i] * prev[i];
            L.z[o] = s;
            L.a[o] = last ? sigmoid(s) : f(s);
          }
          prev = L.a;
        }
        return prev[0];
      }
      const bce = (p, c) => -(c ? Math.log(p + 1e-9) : Math.log(1 - p + 1e-9));
      function trainEpoch() {
        net.forEach((L) => { L.gW.fill(0); L.gb.fill(0); });
        let loss = 0;
        const d = dF[st.act];
        for (const [x, y, c] of data) {
          const p = fwd(x, y);
          loss += bce(p, c);
          const n = net.length - 1;
          net[n].d[0] = p - c;
          for (let l = n; l >= 0; l--) {
            const L = net[l], prev = l ? net[l - 1].a : inp;
            for (let o = 0; o < L.nout; o++) {
              const dd = L.d[o], off = o * L.nin;
              L.gb[o] += dd;
              for (let i = 0; i < L.nin; i++) L.gW[off + i] += dd * prev[i];
            }
            if (l) {
              const Pl = net[l - 1];
              for (let i = 0; i < L.nin; i++) {
                let s = 0;
                for (let o = 0; o < L.nout; o++) s += L.W[o * L.nin + i] * L.d[o];
                Pl.d[i] = s * d(Pl.z[i], Pl.a[i]);
              }
            }
          }
        }
        t++;
        const b1 = 0.9, b2 = 0.999, n = data.length, c1 = 1 - Math.pow(b1, t), c2 = 1 - Math.pow(b2, t);
        const upd = (w, g, m, v) => {
          for (let k = 0; k < w.length; k++) {
            const gk = g[k] / n;
            m[k] = b1 * m[k] + (1 - b1) * gk;
            v[k] = b2 * v[k] + (1 - b2) * gk * gk;
            w[k] -= (st.lr * (m[k] / c1)) / (Math.sqrt(v[k] / c2) + 1e-8);
          }
        };
        net.forEach((L) => { upd(L.W, L.gW, L.mW, L.vW); upd(L.b, L.gb, L.mb, L.vb); });
        epoch++;
        return loss / n;
      }
      function evaluate() {
        let tl = 0, acc = 0;
        for (const [x, y, c] of test) { const p = fwd(x, y); tl += bce(p, c); acc += (p > 0.5 ? 1 : 0) === c ? 1 : 0; }
        return { tl: tl / test.length, acc: acc / test.length };
      }
      function computeGrid() {
        const maps = net.map((L) => Array.from({ length: L.nout }, () => new Float32Array(G * G)));
        for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
          const x = -DOM + (2 * DOM * (i + 0.5)) / G, y = DOM - (2 * DOM * (j + 0.5)) / G;
          fwd(x, y);
          net.forEach((L, l) => { for (let o = 0; o < L.nout; o++) maps[l][o][j * G + i] = L.a[o]; });
        }
        grid = maps;
      }

      const [left, right] = S.split(2);
      const cvB = S.canvas({ parent: left, aspect: 1, maxHeight: 460 }, drawBoundary);
      const cvN = S.canvas({ parent: right, aspect: 0.62, maxHeight: 290 }, drawNet);
      const cvL = S.canvas({ parent: right, aspect: 0.42, maxHeight: 200 }, drawLoss);

      function drawBoundary(ctx, w, h) {
        if (!grid) return;
        const P = VZ.palette(), cm = pnMap(P, 0.55), out = grid[grid.length - 1][0];
        const pad = 10, s = Math.min(w, h) - pad * 2, ox = (w - s) / 2, oy = (h - s) / 2;
        VZ.field(ctx, ox, oy, s, s, G, G, (i, j) => out[j * G + i] * 2 - 1, cm);
        ctx.strokeStyle = P.text; ctx.lineWidth = 1.6;
        VZ.contour(ctx, G, G, out, 0.5, (i) => ox + ((i + 0.5) / G) * s, (j) => oy + ((j + 0.5) / G) * s);
        const X = (x) => ox + ((x + DOM) / (2 * DOM)) * s, Y = (y) => oy + ((DOM - y) / (2 * DOM)) * s;
        data.forEach(([x, y, c]) => {
          ctx.beginPath(); ctx.arc(X(x), Y(y), 3.6, 0, 7);
          ctx.fillStyle = c ? P.accent : P.accent2; ctx.fill();
          ctx.strokeStyle = P.bg; ctx.lineWidth = 1.2; ctx.stroke();
        });
        ctx.strokeStyle = P.border; ctx.lineWidth = 1; ctx.strokeRect(ox, oy, s, s);
      }
      function drawNet(ctx, w, h) {
        if (!grid) return;
        const P = VZ.palette(), cm = pnMap(P, 0.85);
        const cols = [2, ...net.map((L) => L.nout)];
        const box = Math.min(34, (h - 30) / Math.max(...cols) - 6);
        const cx = (l) => 24 + (l * (w - 48 - box)) / (cols.length - 1);
        const cy = (l, k) => h / 2 + (k - (cols[l] - 1) / 2) * (box + 8);
        // 가중치 선
        net.forEach((L, l) => {
          for (let o = 0; o < L.nout; o++) for (let i = 0; i < L.nin; i++) {
            const wv = L.W[o * L.nin + i];
            ctx.strokeStyle = VZ.alpha(wv >= 0 ? P.accent : P.accent2, 0.55);
            ctx.lineWidth = VZ.clamp(Math.abs(wv) * 1.4, 0.3, 5);
            ctx.beginPath();
            const x0 = cx(l) + box, y0 = cy(l, i) + box / 2, x1 = cx(l + 1), y1 = cy(l + 1, o) + box / 2;
            ctx.moveTo(x0, y0); ctx.bezierCurveTo((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, x1, y1); ctx.stroke();
          }
        });
        // 노드 = 그 뉴런의 출력 지도
        const norm = (l, v) => (l === net.length - 1 || st.act === "sigmoid" ? v * 2 - 1 : st.act === "relu" ? Math.tanh(v) * 2 - 1 : v);
        for (let k = 0; k < 2; k++) VZ.field(ctx, cx(0), cy(0, k), box, box, G, G, (i, j) => (k === 0 ? (i / G) * 2 - 1 : 1 - (j / G) * 2), cm);
        grid.forEach((maps, l) => maps.forEach((m, o) => VZ.field(ctx, cx(l + 1), cy(l + 1, o), box, box, G, G, (i, j) => norm(l, m[j * G + i]), cm)));
        ctx.strokeStyle = P.border; ctx.lineWidth = 1;
        cols.forEach((n, l) => { for (let k = 0; k < n; k++) ctx.strokeRect(cx(l) + 0.5, cy(l, k) + 0.5, box, box); });
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11, false); ctx.textAlign = "center";
        cols.forEach((n, l) => ctx.fillText(l === 0 ? "입력" : l === cols.length - 1 ? "출력" : `은닉 ${l}`, cx(l) + box / 2, 14));
      }
      function drawLoss(ctx, w, h) {
        const P = VZ.palette();
        const n = Math.max(50, hist.length);
        const ymax = Math.max(0.8, ...hist.map((d) => Math.max(d[1], d[2])));
        VZ.chart(ctx, null, {
          x: [0, n], y: [0, Math.min(ymax, 2)], xLabel: "에폭", margin: { l: 40 },
          series: [
            { data: hist.map((d, i) => [i, d[1]]), color: P.accent, width: 2 },
            { data: hist.map((d, i) => [i, d[2]]), color: P.accent2, width: 2, dash: [5, 4] },
          ],
          texts: [{ x: n * 0.98, y: Math.min(ymax, 2) * 0.92, text: "— 학습   - - 테스트", align: "right", color: P.dim }],
        });
      }

      const set = S.stats([{ k: "ep", label: "에폭" }, { k: "tr", label: "학습 손실" }, { k: "te", label: "테스트 손실" }, { k: "acc", label: "테스트 정확도" }]);
      function refresh() {
        computeGrid();
        cvB.redraw(); cvN.redraw(); cvL.redraw();
        const last = hist[hist.length - 1];
        set("ep", epoch);
        if (last) { set("tr", last[1].toFixed(3)); set("te", last[2].toFixed(3)); set("acc", (last[3] * 100).toFixed(1) + "<small>%</small>"); }
      }
      function step(k) {
        let l = 0;
        for (let i = 0; i < k; i++) l = trainEpoch();
        const e = evaluate();
        hist.push([epoch, l, e.tl, e.acc]);
        if (hist.length > 400) hist = hist.filter((_, i) => i % 2 === 0);
      }
      function reset(regen) { if (regen) newData(); buildNet(); step(0); hist = []; refresh(); }

      S.seg({ label: "데이터", options: [["circle", "원"], ["xor", "XOR"], ["gauss", "두 덩어리"], ["spiral", "나선"]], value: st.kind, onChange: (v) => { st.kind = v; reset(true); } });
      S.range({ label: "잡음", min: 0, max: 0.3, step: 0.01, value: st.noise, fmt: (v) => v.toFixed(2), onInput: (v) => { st.noise = v; reset(true); } });
      S.range({ label: "은닉층 수", min: 1, max: 3, step: 1, value: st.layers, onInput: (v) => { st.layers = v; reset(false); } });
      S.range({ label: "층당 뉴런", min: 1, max: 8, step: 1, value: st.width, onInput: (v) => { st.width = v; reset(false); } });
      S.seg({ label: "활성화 함수", options: [["tanh", "tanh"], ["relu", "ReLU"], ["sigmoid", "sigmoid"]], value: st.act, onChange: (v) => { st.act = v; reset(false); } });
      S.range({ label: "학습률 (Adam)", min: -3, max: -0.7, step: 0.1, value: Math.log10(st.lr), fmt: (v) => pow10(v).toFixed(4), onInput: (v) => (st.lr = pow10(v)) });
      const playBtn = S.button("일시정지", () => { st.playing = !st.playing; playBtn.textContent = st.playing ? "일시정지" : "재생"; }, { primary: true });
      S.button("한 에폭", () => { step(1); refresh(); });
      S.button("가중치 초기화", () => { st.seed++; reset(false); });
      S.button("새 데이터", () => { st.seed++; reset(true); });

      reset(true);
      let fr = 0;
      S.loop(() => {
        if (!st.playing || epoch > 3000) return;
        step(4);
        if (++fr % 2 === 0) refresh();
      });
    },
  });

  /* ======================================================================
     2. 옵티마이저 경주
     ====================================================================== */
  Lab.register({
    id: "optimizers", field: "dl", thumb: "curve",
    title: "옵티마이저 경주 — SGD · 모멘텀 · RMSProp · Adam",
    desc: "같은 출발점에서 네 옵티마이저가 손실 지형을 내려가는 경로를 비교합니다.",
    tags: ["최적화", "SGD", "Adam", "모멘텀"],
    note: "해볼 것: 지형을 클릭하면 그 점에서 다시 출발합니다. <b>길쭉한 골짜기</b>에서 SGD가 지그재그로 느리게 가는 동안 모멘텀이 어떻게 앞서는지, <b>안장점</b>에서 누가 먼저 빠져나오는지 보세요. 기울기 잡음은 미니배치 SGD의 확률적 기울기를 흉내 냅니다.",
    mount(S) {
      const SURF = {
        valley: { name: "길쭉한 골짜기", xr: [-3, 3], yr: [-1.6, 1.6], f: (x, y) => 0.1 * x * x + 2 * y * y, g: (x, y) => [0.2 * x, 4 * y], start: [-2.7, 1.2], lr1: 0.05, lr2: 0.05 },
        rosen: { name: "로젠브록", xr: [-2, 2], yr: [-1, 3], f: (x, y) => (1 - x) ** 2 + 10 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 40 * x * (y - x * x), 20 * (y - x * x)], start: [-1.6, 2.6], lr1: 0.006, lr2: 0.06 },
        twohole: { name: "두 골짜기", xr: [-2, 2], yr: [-1.5, 1.5], f: (x, y) => (x * x - 1) ** 2 + 0.6 * y * y + 0.3 * x, g: (x, y) => [4 * x * (x * x - 1) + 0.3, 1.2 * y], start: [1.7, 1.2], lr1: 0.05, lr2: 0.05 },
        saddle: { name: "안장점", xr: [-2, 2], yr: [-3, 3], f: (x, y) => x * x - y * y + 0.1 * y ** 4, g: (x, y) => [2 * x, -2 * y + 0.4 * y ** 3], start: [-1.9, 0.002], lr1: 0.05, lr2: 0.05 },
      };
      const OPT = [
        { k: "sgd", name: "SGD", col: (P) => P.bad },
        { k: "mom", name: "모멘텀", col: (P) => P.warn },
        { k: "rms", name: "RMSProp", col: (P) => P.ok },
        { k: "adam", name: "Adam", col: (P) => P.accent },
      ];
      const st = { surf: "valley", lr1: 0.05, lr2: 0.05, noise: 0, speed: 2, start: null, running: true };
      const MAXS = 600, NX = 110, NY = 74;
      let runs = [], step = 0, fieldVals = null, fmin = 0, levels = [];
      const rnd = VZ.rng(5);

      function prepField() {
        const s = SURF[st.surf];
        fieldVals = new Float32Array(NX * NY);
        fmin = Infinity;
        const raw = new Float32Array(NX * NY);
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
          const x = VZ.lerp(s.xr[0], s.xr[1], i / (NX - 1)), y = VZ.lerp(s.yr[1], s.yr[0], j / (NY - 1));
          const v = s.f(x, y); raw[j * NX + i] = v; if (v < fmin) fmin = v;
        }
        let lo = Infinity, hi = -Infinity;
        for (let k = 0; k < raw.length; k++) { const v = Math.log(raw[k] - fmin + 0.02); fieldVals[k] = v; lo = Math.min(lo, v); hi = Math.max(hi, v); }
        for (let k = 0; k < raw.length; k++) fieldVals[k] = (fieldVals[k] - lo) / (hi - lo);
        levels = VZ.linspace(0.06, 0.94, 12);
      }
      function reset() {
        const s = SURF[st.surf], p0 = st.start || s.start;
        runs = OPT.map((o) => ({ ...o, x: p0[0], y: p0[1], vx: 0, vy: 0, sx: 0, sy: 0, mx: 0, my: 0, path: [[p0[0], p0[1]]], loss: [[0, s.f(p0[0], p0[1]) - fmin + 1e-9]], dead: false }));
        step = 0;
      }
      function advance() {
        const s = SURF[st.surf];
        step++;
        runs.forEach((r) => {
          if (r.dead) return;
          let [gx, gy] = s.g(r.x, r.y);
          if (st.noise) { gx += VZ.randn(rnd) * st.noise; gy += VZ.randn(rnd) * st.noise; }
          if (r.k === "sgd") { r.x -= st.lr1 * gx; r.y -= st.lr1 * gy; }
          else if (r.k === "mom") { r.vx = 0.9 * r.vx + gx; r.vy = 0.9 * r.vy + gy; r.x -= st.lr1 * r.vx; r.y -= st.lr1 * r.vy; }
          else if (r.k === "rms") { r.sx = 0.9 * r.sx + 0.1 * gx * gx; r.sy = 0.9 * r.sy + 0.1 * gy * gy; r.x -= (st.lr2 * gx) / (Math.sqrt(r.sx) + 1e-8); r.y -= (st.lr2 * gy) / (Math.sqrt(r.sy) + 1e-8); }
          else {
            r.mx = 0.9 * r.mx + 0.1 * gx; r.my = 0.9 * r.my + 0.1 * gy;
            r.sx = 0.999 * r.sx + 0.001 * gx * gx; r.sy = 0.999 * r.sy + 0.001 * gy * gy;
            const c1 = 1 - Math.pow(0.9, step), c2 = 1 - Math.pow(0.999, step);
            r.x -= (st.lr2 * r.mx / c1) / (Math.sqrt(r.sx / c2) + 1e-8);
            r.y -= (st.lr2 * r.my / c1) / (Math.sqrt(r.sy / c2) + 1e-8);
          }
          if (!isFinite(r.x) || !isFinite(r.y) || Math.abs(r.x) > 50 || Math.abs(r.y) > 50) { r.dead = true; return; }
          r.path.push([r.x, r.y]);
          r.loss.push([step, Math.max(1e-9, s.f(r.x, r.y) - fmin)]);
        });
      }

      prepField(); reset();
      const cv = S.canvas({ aspect: 0.62, maxHeight: 440 }, draw);
      const cvL = S.canvas({ height: 150 }, drawLoss);
      S.legend(OPT.map((o) => ({ label: o.name, color: o.col })));
      function draw(ctx, w, h) {
        const P = VZ.palette(), s = SURF[st.surf];
        const X = (x) => ((x - s.xr[0]) / (s.xr[1] - s.xr[0])) * w, Y = (y) => ((s.yr[1] - y) / (s.yr[1] - s.yr[0])) * h;
        const bg = VZ.parse(P.bg);
        VZ.field(ctx, 0, 0, w, h, NX, NY, (i, j) => fieldVals[j * NX + i], (v) => { const c = VZ.viridis(v); return c.map((x, k) => bg[k] + (x - bg[k]) * 0.38); });
        ctx.strokeStyle = VZ.alpha(P.text, 0.18); ctx.lineWidth = 1;
        levels.forEach((lv) => VZ.contour(ctx, NX, NY, fieldVals, lv, (i) => (i / (NX - 1)) * w, (j) => (j / (NY - 1)) * h));
        runs.forEach((r) => {
          const c = r.col(P);
          ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineJoin = "round";
          ctx.beginPath(); r.path.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
          const [x, y] = r.path[r.path.length - 1];
          ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(x), Y(y), 5.5, 0, 7); ctx.fill();
          ctx.strokeStyle = P.bg; ctx.lineWidth = 1.5; ctx.stroke();
        });
        const p0 = runs[0] && runs[0].path[0];
        if (p0) { ctx.strokeStyle = P.text; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(p0[0]), Y(p0[1]), 8, 0, 7); ctx.stroke(); }
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11.5, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`${s.name} · 단계 ${step}`, 10, 8);
      }
      function drawLoss(ctx) {
        const P = VZ.palette();
        const all = runs.flatMap((r) => r.loss.map((d) => d[1]));
        const hi = Math.max(1e-3, ...all) * 3, lo = Math.max(1e-9, Math.min(...all) / 3);
        VZ.chart(ctx, null, {
          x: [0, Math.max(100, step)], y: [Math.max(lo, hi * 1e-8), hi], logY: true, xLabel: "단계", yLabel: "f − f*",
          series: runs.map((r) => ({ data: r.loss, color: r.col(P), width: 1.8 })),
        });
      }
      const set = S.stats(OPT.map((o) => ({ k: o.k, label: o.name + " 손실" })));
      function readouts() { runs.forEach((r) => set(r.k, r.dead ? '<span style="color:var(--bad)">발산</span>' : VZ.fmt(r.loss[r.loss.length - 1][1], 3))); }

      S.select({ label: "손실 지형", options: Object.entries(SURF).map(([k, s]) => [k, s.name]), value: st.surf, onChange: (v) => { st.surf = v; st.start = null; lr1.set(Math.log10(SURF[v].lr1), false); lr2.set(Math.log10(SURF[v].lr2), false); st.lr1 = SURF[v].lr1; st.lr2 = SURF[v].lr2; prepField(); reset(); } });
      const lr1 = S.range({ label: "SGD·모멘텀 학습률", min: -3.5, max: -0.3, step: 0.05, value: Math.log10(st.lr1), fmt: (v) => VZ.fmt(pow10(v), 2), onInput: (v) => { st.lr1 = pow10(v); reset(); } });
      const lr2 = S.range({ label: "RMSProp·Adam 학습률", min: -3, max: -0.3, step: 0.05, value: Math.log10(st.lr2), fmt: (v) => VZ.fmt(pow10(v), 2), onInput: (v) => { st.lr2 = pow10(v); reset(); } });
      S.range({ label: "기울기 잡음 σ", min: 0, max: 3, step: 0.1, value: 0, fmt: (v) => v.toFixed(1), onInput: (v) => { st.noise = v; reset(); } });
      S.range({ label: "속도 (단계/프레임)", min: 1, max: 10, step: 1, value: st.speed, onInput: (v) => (st.speed = v) });
      S.button("다시 출발", () => reset(), { primary: true });
      S.button("출발점 초기화", () => { st.start = null; reset(); });

      VZ.drag(cv.canvas, {
        down(p) {
          const s = SURF[st.surf];
          st.start = [VZ.lerp(s.xr[0], s.xr[1], p.x / cv.w), VZ.lerp(s.yr[1], s.yr[0], p.y / cv.h)];
          reset(); cv.redraw(); cvL.redraw();
          return false;
        },
      });
      S.loop(() => {
        if (step < MAXS && runs.some((r) => !r.dead)) for (let i = 0; i < st.speed; i++) advance();
        cv.redraw(); cvL.redraw(); readouts();
      });
    },
  });

  /* ======================================================================
     3. 3D 손실 지형 위를 구르는 공
     ====================================================================== */
  Lab.register({
    id: "landscape3d", field: "dl", thumb: "surface", three: true, layout: "side",
    title: "3D 손실 지형 — 경사 하강법 vs 모멘텀",
    desc: "울퉁불퉁한 손실 곡면 위에 공 두 개를 굴려 국소 최소와 관성의 효과를 봅니다.",
    tags: ["최적화", "3D", "국소 최솟값"],
    note: "해볼 것: 곡면을 클릭하면 그 자리에 공을 떨어뜨립니다. <b>울퉁불퉁</b> 지형에서 경사 하강법(빨강)은 가까운 웅덩이에 갇히지만, 모멘텀(주황)은 관성으로 작은 언덕을 넘기도 합니다.",
    mount(S) {
      const SURF = {
        bumpy: { name: "울퉁불퉁", f: (x, z) => 0.06 * (x * x + z * z) + 0.45 * Math.sin(1.5 * x) * Math.cos(1.5 * z) },
        bowl: { name: "그릇", f: (x, z) => 0.08 * x * x + 0.22 * z * z },
        saddle: { name: "안장", f: (x, z) => 0.12 * (x * x - z * z) + 0.012 * z ** 4 },
        ripple: { name: "물결", f: (x, z) => 0.05 * (x * x + z * z) - 0.5 * Math.cos(Math.hypot(x, z) * 2) * Math.exp(-0.1 * (x * x + z * z)) },
      };
      const st = { surf: "bumpy", lr: 0.12, beta: 0.9 };
      const set = S.stats([{ k: "gd", label: "경사 하강 손실" }, { k: "mo", label: "모멘텀 손실" }, { k: "n", label: "단계" }]);
      S.select({ label: "지형", options: Object.entries(SURF).map(([k, s]) => [k, s.name]), value: st.surf, onChange: (v) => { st.surf = v; rebuild && rebuild(); } });
      S.range({ label: "학습률", min: 0.02, max: 0.5, step: 0.01, value: st.lr, fmt: (v) => v.toFixed(2), onInput: (v) => (st.lr = v) });
      S.range({ label: "모멘텀 β", min: 0, max: 0.98, step: 0.01, value: st.beta, fmt: (v) => v.toFixed(2), onInput: (v) => (st.beta = v) });
      let rebuild = null, drop = null;
      S.button("무작위 위치에서 굴리기", () => drop && drop(), { primary: true });

      S.three({ camera: [7.5, 6.5, 8.5], target: [0, -0.4, 0], autoRotate: true, autoRotateSpeed: 0.5 }).then((T) => {
        const { THREE, scene } = T;
        const R = 3.2, N = 90, H = 1.4;
        let mesh = null, wire = null;
        const f = (x, z) => SURF[st.surf].f(x, z) * H;
        const grad = (x, z) => { const e = 1e-3; return [(f(x + e, z) - f(x - e, z)) / (2 * e), (f(x, z + e) - f(x, z - e)) / (2 * e)]; };
        rebuild = () => {
          if (mesh) { scene.remove(mesh); scene.remove(wire); mesh.geometry.dispose(); }
          const geo = new THREE.PlaneGeometry(2 * R, 2 * R, N, N);
          geo.rotateX(-Math.PI / 2);
          const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
          let lo = Infinity, hi = -Infinity;
          for (let i = 0; i < pos.count; i++) { const y = f(pos.getX(i), pos.getZ(i)); pos.setY(i, y); lo = Math.min(lo, y); hi = Math.max(hi, y); }
          for (let i = 0; i < pos.count; i++) { const c = VZ.viridis((pos.getY(i) - lo) / (hi - lo)); cols[i * 3] = c[0] / 255; cols[i * 3 + 1] = c[1] / 255; cols[i * 3 + 2] = c[2] / 255; }
          geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
          geo.computeVertexNormals();
          mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.05, side: THREE.DoubleSide }));
          wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.06 }));
          scene.add(mesh); scene.add(wire);
          drop();
        };
        const mkBall = (color) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshStandardMaterial({ color, roughness: 0.3, emissive: color, emissiveIntensity: 0.25 }));
          const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 2000), 3));
          const tr = new THREE.Line(tg, new THREE.LineBasicMaterial({ color }));
          scene.add(m); scene.add(tr);
          return { m, tr, n: 0, x: 0, z: 0, vx: 0, vz: 0 };
        };
        const balls = [mkBall(0xef4444), mkBall(0xf59e0b)];
        let steps = 0;
        drop = (x0, z0) => {
          const r = Math.random;
          if (x0 == null) { x0 = (r() * 2 - 1) * R * 0.85; z0 = (r() * 2 - 1) * R * 0.85; }
          balls.forEach((b) => { b.x = x0; b.z = z0; b.vx = b.vz = 0; b.n = 0; });
          steps = 0;
        };
        rebuild();
        let acc = 0;
        T.onFrame((dt) => {
          acc += dt;
          while (acc > 1 / 30) {
            acc -= 1 / 30;
            if (steps > 1500) break;
            steps++;
            balls.forEach((b, k) => {
              const [gx, gz] = grad(b.x, b.z);
              if (k === 0) { b.x -= st.lr * gx; b.z -= st.lr * gz; }
              else { b.vx = st.beta * b.vx - st.lr * gx; b.vz = st.beta * b.vz - st.lr * gz; b.x += b.vx; b.z += b.vz; }
              b.x = VZ.clamp(b.x, -R, R); b.z = VZ.clamp(b.z, -R, R);
              const arr = b.tr.geometry.attributes.position.array;
              if (b.n < 2000) { arr[b.n * 3] = b.x; arr[b.n * 3 + 1] = f(b.x, b.z) + 0.03; arr[b.n * 3 + 2] = b.z; b.n++; }
              b.tr.geometry.attributes.position.needsUpdate = true;
              b.tr.geometry.setDrawRange(0, b.n);
            });
          }
          balls.forEach((b) => b.m.position.set(b.x, f(b.x, b.z) + 0.11, b.z));
          set("gd", (f(balls[0].x, balls[0].z) / H).toFixed(3));
          set("mo", (f(balls[1].x, balls[1].z) / H).toFixed(3));
          set("n", steps);
        });
        // 클릭(드래그가 아닌)으로 공 떨어뜨리기
        const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
        let down = null;
        T.renderer.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
        T.renderer.domElement.addEventListener("pointerup", (e) => {
          if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
          const r = T.renderer.domElement.getBoundingClientRect();
          ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
          ray.setFromCamera(ndc, T.camera);
          const hit = ray.intersectObject(mesh)[0];
          if (hit) drop(hit.point.x, hit.point.z);
        });
      }).catch(() => {});
    },
  });

  /* ======================================================================
     4. 활성화 함수
     ====================================================================== */
  Lab.register({
    id: "activations", field: "dl", thumb: "curve",
    title: "활성화 함수와 도함수",
    desc: "ReLU, GELU, SiLU, sigmoid, tanh… 모양과 기울기, 그리고 표준정규 입력을 통과한 출력 분포를 비교합니다.",
    tags: ["활성화", "GELU", "ReLU", "기울기 소실"],
    note: "해볼 것: 그래프 위에서 마우스를 움직여 보세요. sigmoid·tanh는 |x|가 커지면 도함수가 0에 가까워져(포화) 깊은 망에서 기울기가 사라집니다. 오른쪽 히스토그램은 N(0,1) 입력 4,000개를 통과시킨 출력 분포입니다.",
    mount(S) {
      const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2)), phi = (x) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
      const A = {
        relu: ["ReLU", (x) => Math.max(0, x), (x) => (x > 0 ? 1 : 0)],
        leaky: ["Leaky ReLU", (x) => (x > 0 ? x : 0.1 * x), (x) => (x > 0 ? 1 : 0.1)],
        elu: ["ELU", (x) => (x > 0 ? x : Math.exp(x) - 1), (x) => (x > 0 ? 1 : Math.exp(x))],
        gelu: ["GELU", (x) => x * Phi(x), (x) => Phi(x) + x * phi(x)],
        silu: ["SiLU (Swish)", (x) => x * sigmoid(x), (x) => { const s = sigmoid(x); return s * (1 + x * (1 - s)); }],
        softplus: ["Softplus", (x) => Math.log1p(Math.exp(x)), (x) => sigmoid(x)],
        sigmoid: ["Sigmoid", sigmoid, (x) => sigmoid(x) * (1 - sigmoid(x))],
        tanh: ["tanh", Math.tanh, (x) => 1 - Math.tanh(x) ** 2],
      };
      const st = { k: "gelu", deriv: true, all: true, x0: 1 };
      const xs = VZ.linspace(-5, 5, 301);
      const sample = Array.from({ length: 4000 }, (_, i) => VZ.randn(VZ.rng(i + 1)));
      const [a, b] = S.split(2);
      const cv = S.canvas({ parent: a, aspect: 0.78, maxHeight: 380 }, draw);
      const cvH = S.canvas({ parent: b, aspect: 0.78, maxHeight: 380 }, drawHist);
      let C = null;
      function draw(ctx) {
        const P = VZ.palette(), [, f, df] = A[st.k];
        const series = [];
        if (st.all) Object.entries(A).forEach(([k, [, g]]) => { if (k !== st.k) series.push({ data: xs.map((x) => [x, g(x)]), color: VZ.alpha(P.dim, 0.28), width: 1.2 }); });
        series.push({ data: xs.map((x) => [x, f(x)]), color: P.accent, width: 3 });
        if (st.deriv) series.push({ data: xs.map((x) => [x, df(x)]), color: P.accent2, width: 2, dash: [6, 4] });
        C = VZ.chart(ctx, null, {
          x: [-5, 5], y: [-1.5, 4], xLabel: "입력 x", series,
          vlines: [{ x: st.x0, color: P.faint }],
          points: [{ x: st.x0, y: f(st.x0), color: P.accent, r: 5 }].concat(st.deriv ? [{ x: st.x0, y: df(st.x0), color: P.accent2, r: 4 }] : []),
          texts: [{ x: -4.8, y: 3.7, text: A[st.k][0] + (st.deriv ? "  (점선: 도함수)" : ""), color: P.text, sans: true, size: 12.5 }],
        });
      }
      function drawHist(ctx) {
        const P = VZ.palette(), f = A[st.k][1];
        const lo = -2, hi = 4, nb = 48, bins = new Array(nb).fill(0);
        sample.forEach((x) => { const y = f(x), k = Math.floor(((y - lo) / (hi - lo)) * nb); if (k >= 0 && k < nb) bins[k]++; });
        const bw = (hi - lo) / nb;
        VZ.chart(ctx, null, {
          x: [lo, hi], y: [0, Math.max(...bins) * 1.1], xLabel: "출력 f(x)", title: "N(0,1) 입력 → 출력 분포", yFmt: () => "",
          series: [{ type: "bar", data: bins.map((c, k) => [lo + (k + 0.5) * bw, c]), color: VZ.alpha(P.accent, 0.75), barWidth: bw * 0.92 }],
        });
      }
      const set = S.stats([{ k: "x", label: "x" }, { k: "f", label: "f(x)" }, { k: "d", label: "f′(x)" }, { k: "d10", label: "f′(x)¹⁰ (10층)" }]);
      function upd() {
        const [, f, df] = A[st.k];
        set("x", st.x0.toFixed(2)); set("f", f(st.x0).toFixed(3)); set("d", df(st.x0).toFixed(3)); set("d10", VZ.fmt(Math.pow(df(st.x0), 10), 3));
        cv.redraw(); cvH.redraw();
      }
      S.select({ label: "함수", options: Object.entries(A).map(([k, v]) => [k, v[0]]), value: st.k, onChange: (v) => { st.k = v; upd(); } });
      S.check({ label: "도함수 보기", value: true, onChange: (v) => { st.deriv = v; upd(); } });
      S.check({ label: "다른 함수 흐리게 겹치기", value: true, onChange: (v) => { st.all = v; upd(); } });
      S.range({ label: "탐침 x", min: -5, max: 5, step: 0.01, value: st.x0, fmt: (v) => v.toFixed(2), onInput: (v) => { st.x0 = v; upd(); } });
      VZ.drag(cv.canvas, { hover: (p) => { if (!C) return; const x = C.iX(p.x); if (x >= -5 && x <= 5) { st.x0 = x; upd(); } }, down: (p) => { if (C) { st.x0 = VZ.clamp(C.iX(p.x), -5, 5); upd(); } }, move: (p) => { if (C) { st.x0 = VZ.clamp(C.iX(p.x), -5, 5); upd(); } } });
      upd();
    },
  });

  /* ======================================================================
     5. 깊이와 초기화 — 활성값·기울기의 폭발과 소실
     ====================================================================== */
  Lab.register({
    id: "init-depth", field: "dl", thumb: "heat",
    title: "깊이·초기화·잔차 연결 — 신호는 몇 층까지 살아남나",
    desc: "폭 64인 깊은 MLP에 무작위 입력을 넣어 층마다 활성값 분포와 역전파 기울기 크기를 추적합니다.",
    tags: ["초기화", "Xavier", "He", "ResNet", "기울기 소실"],
    note: "해볼 것: ReLU + <b>N(0,1)</b> 초기화는 몇 층 만에 폭발하고, <b>0.01배</b>는 소실됩니다. <b>He</b> 초기화는 ReLU에서, <b>Xavier</b>는 tanh에서 분포를 유지합니다. 잔차 연결을 켜면 기울기가 층을 거슬러 그대로 흐르는 길이 생깁니다.",
    mount(S) {
      const st = { depth: 20, act: "tanh", init: "xavier", res: false, seed: 1 };
      const Wd = 64, B = 128, NB = 44, LO = -3, HI = 3;
      let res = null;
      const ACT = { tanh: [Math.tanh, (z, a) => 1 - a * a], relu: [(z) => (z > 0 ? z : 0), (z) => (z > 0 ? 1 : 0)], sigmoid: [sigmoid, (z, a) => a * (1 - a)], linear: [(z) => z, () => 1] };
      function run() {
        const rnd = VZ.rng(st.seed);
        const std = { normal: 1, small: 0.01, xavier: Math.sqrt(1 / Wd), he: Math.sqrt(2 / Wd) }[st.init];
        const [f, df] = ACT[st.act];
        let A = new Float64Array(B * Wd).map(() => VZ.randn(rnd));
        const Ws = [], Zs = [], As = [A];
        const hists = [], stds = [];
        for (let l = 0; l < st.depth; l++) {
          const W = new Float64Array(Wd * Wd).map(() => VZ.randn(rnd) * std);
          const Z = new Float64Array(B * Wd), An = new Float64Array(B * Wd);
          for (let b = 0; b < B; b++) for (let o = 0; o < Wd; o++) {
            let s = 0;
            for (let i = 0; i < Wd; i++) s += A[b * Wd + i] * W[i * Wd + o];
            Z[b * Wd + o] = s;
            const a = f(s);
            An[b * Wd + o] = st.res ? A[b * Wd + o] + a : a;
          }
          Ws.push(W); Zs.push(Z); As.push(An);
          const h = new Array(NB).fill(0);
          for (let k = 0; k < An.length; k++) h[VZ.clamp(Math.floor(((An[k] - LO) / (HI - LO)) * NB), 0, NB - 1)]++;
          hists.push(h); stds.push(VZ.std(An));
          A = An;
        }
        let G = new Float64Array(B * Wd).map(() => VZ.randn(rnd));
        const gnorm = new Array(st.depth);
        for (let l = st.depth - 1; l >= 0; l--) {
          const W = Ws[l], Z = Zs[l], Aout = As[l + 1], Gp = new Float64Array(B * Wd);
          for (let b = 0; b < B; b++) for (let o = 0; o < Wd; o++) {
            const a = st.res ? Aout[b * Wd + o] - As[l][b * Wd + o] : Aout[b * Wd + o];
            const dz = G[b * Wd + o] * df(Z[b * Wd + o], a);
            if (dz === 0) continue;
            for (let i = 0; i < Wd; i++) Gp[b * Wd + i] += dz * W[i * Wd + o];
          }
          if (st.res) for (let k = 0; k < Gp.length; k++) Gp[k] += G[k];
          G = Gp;
          gnorm[l] = Math.sqrt(G.reduce((s, v) => s + v * v, 0) / G.length);
        }
        res = { hists, stds, gnorm };
      }
      const cvH = S.canvas({ aspect: 0.42, maxHeight: 300 }, drawHeat);
      const cvS = S.canvas({ height: 190 }, drawStd);
      function drawHeat(ctx, w, h) {
        if (!res) return;
        const P = VZ.palette(), L = res.hists.length;
        const m = { l: 46, r: 12, t: 22, b: 30 }, pw = w - m.l - m.r, ph = h - m.t - m.b;
        const bg = VZ.parse(P.bg);
        VZ.field(ctx, m.l, m.t, pw, ph, L, NB, (i, j) => { const hh = res.hists[i]; return hh[NB - 1 - j] / Math.max(...hh); }, (v) => { const c = VZ.magma(Math.pow(v, 0.6)); return v < 0.003 ? bg : c; }, false);
        ctx.fillStyle = P.dim; ctx.font = VZ.font(10.5); ctx.textAlign = "right"; ctx.textBaseline = "middle";
        [-3, -1.5, 0, 1.5, 3].forEach((v) => ctx.fillText(v, m.l - 6, m.t + ph * (1 - (v - LO) / (HI - LO))));
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        for (let l = 0; l < L; l += Math.ceil(L / 10)) ctx.fillText(l + 1, m.l + ((l + 0.5) / L) * pw, m.t + ph + 5);
        ctx.font = VZ.font(12, false, 700); ctx.fillStyle = P.text; ctx.textAlign = "left"; ctx.fillText("층별 활성값 분포 (가로: 층, 세로: 값, 밝을수록 많음 · 범위 밖은 끝에 쌓임)", m.l, 3);
      }
      function drawStd(ctx) {
        if (!res) return;
        const P = VZ.palette(), L = res.stds.length;
        const vals = res.stds.concat(res.gnorm).filter((v) => v > 0 && isFinite(v));
        const lo = Math.max(1e-12, Math.min(...vals) / 3), hi = Math.max(10, Math.max(...vals) * 3);
        VZ.chart(ctx, null, {
          x: [1, L], y: [lo, Math.min(hi, 1e12)], logY: true, xLabel: "층", yLabel: "크기",
          series: [
            { data: res.stds.map((v, i) => [i + 1, Math.max(v, 1e-30)]), color: P.accent, width: 2.4 },
            { data: res.gnorm.map((v, i) => [i + 1, Math.max(v, 1e-30)]), color: P.accent2, width: 2.4, dash: [6, 4] },
          ],
          hlines: [{ y: 1, color: P.faint, label: "1" }],
        });
      }
      S.legend([{ label: "활성값 표준편차", color: (P) => P.accent }, { label: "역전파 기울기 RMS", color: (P) => P.accent2, dash: true }], S.view);
      const set = S.stats([{ k: "a", label: "마지막 층 활성 σ" }, { k: "g", label: "첫 층 기울기 RMS" }, { k: "r", label: "기울기 비 (첫/끝)" }]);
      let pend = 0;
      function update() {
        cancelAnimationFrame(pend);
        pend = requestAnimationFrame(() => {
          run(); cvH.redraw(); cvS.redraw();
          const L = res.stds.length;
          set("a", VZ.fmt(res.stds[L - 1], 3)); set("g", VZ.fmt(res.gnorm[0], 3)); set("r", VZ.fmt(res.gnorm[0] / res.gnorm[L - 1], 3));
        });
      }
      S.range({ label: "깊이 (층 수)", min: 2, max: 50, step: 1, value: st.depth, onInput: (v) => { st.depth = v; update(); } });
      S.seg({ label: "활성화", options: [["tanh", "tanh"], ["relu", "ReLU"], ["sigmoid", "sigmoid"], ["linear", "선형"]], value: st.act, onChange: (v) => { st.act = v; update(); } });
      S.seg({ label: "가중치 초기화", options: [["normal", "N(0,1)"], ["small", "0.01배"], ["xavier", "Xavier"], ["he", "He"]], value: st.init, onChange: (v) => { st.init = v; update(); } });
      S.check({ label: "잔차 연결 (x + f(x))", value: false, onChange: (v) => { st.res = v; update(); } });
      S.button("다른 난수", () => { st.seed++; update(); });
      update();
    },
  });

  /* ======================================================================
     6. 어텐션: 쿼리와 키
     ====================================================================== */
  Lab.register({
    id: "attention-qk", field: "dl", thumb: "arcs",
    title: "어텐션 = 부드러운 검색 (쿼리 · 키 · 값)",
    desc: "2차원 쿼리 벡터를 끌어 키와의 내적, 소프트맥스 가중치, 값의 가중 평균이 어떻게 바뀌는지 봅니다.",
    tags: ["어텐션", "Transformer", "소프트맥스"],
    note: "해볼 것: 왼쪽에서 <b>쿼리 화살표 끝</b>이나 <b>키(원)</b>를 끌어 보세요. 출력(★)은 값(□)들의 가중 평균입니다. 온도를 낮추면 가장 비슷한 키 하나만 고르는 <b>하드 검색</b>, 높이면 모두를 고르게 섞는 평균이 됩니다.",
    mount(S) {
      const toks = [
        { n: "고양이", k: [1.6, 0.9], v: [1.9, -1.2] },
        { n: "강아지", k: [1.3, 1.6], v: [1.3, -2.0] },
        { n: "자동차", k: [-1.5, 0.8], v: [-2.0, -0.5] },
        { n: "바다", k: [-0.4, -1.7], v: [-0.6, 2.0] },
        { n: "사과", k: [0.9, -1.1], v: [0.9, 1.4] },
      ];
      const st = { q: [1.8, 0.6], T: 1, scale: true, drag: null };
      const R = 2.6;
      let W = [], sc = [], out = [0, 0];
      compute();
      const [a, b] = S.split(2);
      const cv = S.canvas({ parent: a, aspect: 1, maxHeight: 420 }, draw);
      const cvB = S.canvas({ parent: b, aspect: 1, maxHeight: 420 }, drawBars);
      function compute() {
        const d = st.scale ? Math.sqrt(2) : 1;
        sc = toks.map((t) => (st.q[0] * t.k[0] + st.q[1] * t.k[1]) / d);
        const m = Math.max(...sc), e = sc.map((s) => Math.exp((s - m) / st.T)), Z = e.reduce((x, y) => x + y, 0);
        W = e.map((x) => x / Z);
        out = [0, 1].map((i) => toks.reduce((s, t, k) => s + W[k] * t.v[i], 0));
      }
      let X, Y, iX, iY;
      function draw(ctx, w, h) {
        const P = VZ.palette(), s = Math.min(w, h) - 20, ox = (w - s) / 2, oy = (h - s) / 2;
        X = (x) => ox + ((x + R) / (2 * R)) * s; Y = (y) => oy + ((R - y) / (2 * R)) * s;
        iX = (px) => ((px - ox) / s) * 2 * R - R; iY = (py) => R - ((py - oy) / s) * 2 * R;
        ctx.strokeStyle = P.grid; ctx.lineWidth = 1;
        for (let v = -2; v <= 2; v++) { ctx.beginPath(); ctx.moveTo(X(v), Y(-R)); ctx.lineTo(X(v), Y(R)); ctx.moveTo(X(-R), Y(v)); ctx.lineTo(X(R), Y(v)); ctx.stroke(); }
        ctx.strokeStyle = P.axis; ctx.beginPath(); ctx.moveTo(X(-R), Y(0)); ctx.lineTo(X(R), Y(0)); ctx.moveTo(X(0), Y(-R)); ctx.lineTo(X(0), Y(R)); ctx.stroke();
        // 쿼리 방향에 수직인 등-점수 선 (q·k = 상수)
        const qn = Math.hypot(...st.q) || 1, ux = st.q[0] / qn, uy = st.q[1] / qn;
        ctx.strokeStyle = VZ.alpha(P.accent, 0.12); ctx.lineWidth = 1;
        for (let c = -3; c <= 3; c += 0.75) { ctx.beginPath(); ctx.moveTo(X(c * ux - 4 * uy), Y(c * uy + 4 * ux)); ctx.lineTo(X(c * ux + 4 * uy), Y(c * uy - 4 * ux)); ctx.stroke(); }
        toks.forEach((t, i) => {
          const c = VZ.cat[i];
          ctx.strokeStyle = VZ.alpha(c, 0.25 + 0.75 * W[i]); ctx.lineWidth = 1 + 6 * W[i];
          ctx.beginPath(); ctx.moveTo(X(t.v[0]), Y(t.v[1])); ctx.lineTo(X(out[0]), Y(out[1])); ctx.stroke();
          ctx.fillStyle = VZ.alpha(c, 0.35); ctx.strokeStyle = c; ctx.lineWidth = 1.5;
          ctx.fillRect(X(t.v[0]) - 6, Y(t.v[1]) - 6, 12, 12); ctx.strokeRect(X(t.v[0]) - 6, Y(t.v[1]) - 6, 12, 12);
          ctx.beginPath(); ctx.arc(X(t.k[0]), Y(t.k[1]), 8 + 6 * W[i], 0, 7); ctx.fillStyle = c; ctx.fill();
          ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 600); ctx.textAlign = "left"; ctx.textBaseline = "bottom";
          ctx.fillText(t.n, X(t.k[0]) + 12, Y(t.k[1]) - 6);
        });
        ctx.strokeStyle = P.text; ctx.fillStyle = P.text; ctx.lineWidth = 2.5;
        VZ.arrow(ctx, X(0), Y(0), X(st.q[0]), Y(st.q[1]), 11);
        ctx.font = VZ.font(12, true, 700); ctx.textAlign = "left"; ctx.fillText("q", X(st.q[0]) + 8, Y(st.q[1]) - 4);
        // 출력 별
        const sx = X(out[0]), sy = Y(out[1]);
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const r = k % 2 ? 5 : 12, ang = -Math.PI / 2 + (k * Math.PI) / 5; ctx.lineTo(sx + r * Math.cos(ang), sy + r * Math.sin(ang)); }
        ctx.closePath(); ctx.fillStyle = P.warn; ctx.fill(); ctx.strokeStyle = P.text; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("● 키   □ 값   ★ 출력 = Σ wᵢ·vᵢ", ox + 6, oy + 4);
      }
      function drawBars(ctx, w, h) {
        const P = VZ.palette(), n = toks.length, m = { l: 66, r: 16, t: 30, b: 16 }, rowH = (h - m.t - m.b) / n;
        const smax = Math.max(3, ...sc.map(Math.abs));
        ctx.font = VZ.font(12, false, 700); ctx.fillStyle = P.text; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`점수 q·k${st.scale ? "/√d" : ""}  →  softmax(점수 / ${st.T.toFixed(2)})`, 10, 6);
        const bw = w - m.l - m.r, half = bw * 0.36, zx = m.l + half;
        toks.forEach((t, i) => {
          const y = m.t + i * rowH, c = VZ.cat[i];
          ctx.fillStyle = P.text; ctx.font = VZ.font(12.5, false, 600); ctx.textAlign = "right"; ctx.textBaseline = "middle";
          ctx.fillText(t.n, m.l - 10, y + rowH / 2);
          // 점수 (가운데 0 기준 양방향)
          const sw = (sc[i] / smax) * half;
          ctx.fillStyle = VZ.alpha(P.dim, 0.35);
          ctx.fillRect(Math.min(zx, zx + sw), y + rowH * 0.18, Math.abs(sw), rowH * 0.22);
          ctx.fillStyle = P.dim; ctx.font = VZ.font(10.5); ctx.textAlign = sw >= 0 ? "left" : "right";
          ctx.fillText(sc[i].toFixed(2), zx + sw + (sw >= 0 ? 4 : -4), y + rowH * 0.29);
          // 가중치
          const ww = W[i] * (bw - 4);
          ctx.fillStyle = c; ctx.fillRect(m.l, y + rowH * 0.48, ww, rowH * 0.34);
          ctx.fillStyle = P.text; ctx.textAlign = "left"; ctx.font = VZ.font(11.5, true, 700);
          ctx.fillText((W[i] * 100).toFixed(1) + "%", m.l + ww + 6, y + rowH * 0.65);
        });
        ctx.strokeStyle = P.axis; ctx.beginPath(); ctx.moveTo(zx, m.t); ctx.lineTo(zx, h - m.b); ctx.stroke();
      }
      const set = S.stats([{ k: "H", label: "가중치 엔트로피" }, { k: "top", label: "가장 주목한 토큰" }, { k: "out", label: "출력 벡터" }]);
      function upd() {
        compute(); cv.redraw(); cvB.redraw();
        const H = -W.reduce((s, w) => s + (w > 0 ? w * Math.log2(w) : 0), 0);
        set("H", H.toFixed(2) + "<small>bit</small>");
        const k = W.indexOf(Math.max(...W)); set("top", toks[k].n);
        set("out", `(${out[0].toFixed(2)}, ${out[1].toFixed(2)})`);
      }
      S.range({ label: "온도 T", min: 0.05, max: 5, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { st.T = v; upd(); } });
      S.check({ label: "√d로 나누기 (scaled dot-product)", value: true, onChange: (v) => { st.scale = v; upd(); } });
      S.button("키 섞기", () => { const r = Math.random; toks.forEach((t) => (t.k = [(r() * 2 - 1) * 2.1, (r() * 2 - 1) * 2.1])); upd(); });
      VZ.drag(cv.canvas, {
        down(p) {
          const hit = (x, y) => Math.hypot(p.x - X(x), p.y - Y(y)) < 14;
          if (hit(st.q[0], st.q[1])) st.drag = "q";
          else { const i = toks.findIndex((t) => hit(t.k[0], t.k[1])); st.drag = i >= 0 ? i : "q"; }
          this.move(p);
        },
        move(p) {
          const v = [VZ.clamp(iX(p.x), -R, R), VZ.clamp(iY(p.y), -R, R)];
          if (st.drag === "q") st.q = v; else if (st.drag != null) toks[st.drag].k = v;
          upd();
        },
        up() { st.drag = null; },
      });
      upd();
    },
  });

  /* ======================================================================
     7. 어텐션 행렬 (멀티헤드 · 인과 마스크)
     ====================================================================== */
  Lab.register({
    id: "attention-matrix", field: "dl", thumb: "heat", layout: "stack",
    title: "셀프 어텐션 행렬 — 마스크와 멀티헤드",
    desc: "문장을 입력하면 무작위 투영으로 만든 Q·K에서 어텐션 행렬을 계산합니다. 인과 마스크, 헤드, 위치 인코딩의 효과를 봅니다.",
    tags: ["어텐션", "Transformer", "마스크", "멀티헤드"],
    note: "주의: 학습되지 않은 <b>무작위 가중치</b>라 의미 있는 패턴이 아니라 <b>계산 구조</b>를 보여 줍니다. 같은 단어는 같은 임베딩을 가지므로 서로 강하게 주목합니다. 인과 마스크를 켜면 위쪽 삼각형이 막혀 GPT처럼 과거만 봅니다. 행을 클릭하면 아래에 그 토큰이 어디를 보는지 호로 그립니다.",
    mount(S) {
      const st = { text: "고양이가 매트 위에 앉았다 그리고 고양이가 잠들었다 매트 는 따뜻했다", heads: 4, head: "avg", causal: false, pe: true, T: 1, shared: false, sel: 0 };
      const D = 32;
      let toks = [], A = [];
      function compute() {
        toks = st.text.trim().split(/\s+/).filter(Boolean).slice(0, 16);
        if (!toks.length) toks = ["(빈", "문장)"];
        const n = toks.length, dk = D / st.heads;
        const E = toks.map((t, p) => {
          const r = VZ.rng(hashStr(t));
          return Array.from({ length: D }, (_, i) => VZ.randn(r) + (st.pe ? (i % 2 ? Math.cos(p / Math.pow(100, (i - 1) / D)) : Math.sin(p / Math.pow(100, i / D))) * 1.2 : 0));
        });
        const mats = [];
        for (let hd = 0; hd < st.heads; hd++) {
          const rq = VZ.rng(1000 + hd), rk = VZ.rng(st.shared ? 1000 + hd : 2000 + hd);
          const Wq = Array.from({ length: D * dk }, () => VZ.randn(rq) / Math.sqrt(D)), Wk = Array.from({ length: D * dk }, () => VZ.randn(rk) / Math.sqrt(D));
          const proj = (e, Wm) => Array.from({ length: dk }, (_, j) => e.reduce((s, v, i) => s + v * Wm[i * dk + j], 0));
          const Q = E.map((e) => proj(e, Wq)), K = E.map((e) => proj(e, Wk));
          const M = Q.map((q, i) => {
            const s = K.map((k, j) => (st.causal && j > i ? -Infinity : (q.reduce((a, v, t) => a + v * k[t], 0) / Math.sqrt(dk)) / st.T));
            const m = Math.max(...s), e = s.map((v) => (v === -Infinity ? 0 : Math.exp(v - m))), Z = e.reduce((a, b) => a + b, 0);
            return e.map((v) => v / Z);
          });
          mats.push(M);
        }
        A = st.head === "avg" ? mats[0].map((row, i) => row.map((_, j) => mats.reduce((s, M) => s + M[i][j], 0) / mats.length)) : mats[Math.min(+st.head, st.heads - 1)];
        st.sel = Math.min(st.sel, n - 1);
      }
      compute();
      const cv = S.canvas({ aspect: 0.62, maxHeight: 470 }, draw);
      const cvA = S.canvas({ height: 150 }, drawArcs);
      let geo = null, hover = null;
      function draw(ctx, w, h) {
        const P = VZ.palette(), n = toks.length;
        const lab = 84, top = 70, cell = Math.min((w - lab - 20) / n, (h - top - 10) / n);
        const ox = lab + (w - lab - 20 - cell * n) / 2, oy = top;
        geo = { ox, oy, cell, n };
        const bg = VZ.parse(P.bg), ac = VZ.parse(P.accent);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const v = A[i][j], f = Math.pow(v, 0.7);
          const masked = st.causal && j > i;
          ctx.fillStyle = masked ? VZ.alpha(P.dim, 0.08) : `rgb(${bg.map((b, k) => Math.round(b + (ac[k] - b) * f)).join(",")})`;
          ctx.fillRect(ox + j * cell, oy + i * cell, cell - 1, cell - 1);
          if (cell > 30 && !masked) { ctx.fillStyle = f > 0.55 ? P.bg : P.dim; ctx.font = VZ.font(9.5); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(v.toFixed(2), ox + j * cell + cell / 2, oy + i * cell + cell / 2); }
        }
        ctx.strokeStyle = P.text; ctx.lineWidth = 2; ctx.strokeRect(ox - 1, oy + st.sel * cell - 1, cell * n + 1, cell + 1);
        if (hover) { ctx.strokeStyle = P.warn; ctx.strokeRect(ox + hover[1] * cell, oy + hover[0] * cell, cell - 1, cell - 1); }
        const short = (t) => (t.length > 5 ? t.slice(0, 5) + "…" : t);
        ctx.font = VZ.font(11.5, false); ctx.fillStyle = P.text;
        toks.forEach((t, i) => {
          ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillStyle = i === st.sel ? P.accent : P.text;
          ctx.fillText(short(t), ox - 8, oy + i * cell + cell / 2);
          ctx.save(); ctx.translate(ox + i * cell + cell / 2, oy - 6); ctx.rotate(-Math.PI / 4);
          ctx.textAlign = "left"; ctx.fillStyle = P.text; ctx.fillText(short(t), 0, 0); ctx.restore();
        });
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("행 = 쿼리(보는 쪽) · 열 = 키(보이는 쪽)", 8, 6);
      }
      function drawArcs(ctx, w, h) {
        const P = VZ.palette(), n = toks.length, gap = (w - 40) / n, base = h - 36;
        const xs = toks.map((_, i) => 20 + gap * (i + 0.5));
        const row = A[st.sel] || [];
        row.forEach((v, j) => {
          if (v < 0.01) return;
          const x0 = xs[st.sel], x1 = xs[j], mx = (x0 + x1) / 2, hh = Math.min(base - 8, Math.abs(x1 - x0) * 0.55 + 10);
          ctx.strokeStyle = VZ.alpha(P.accent, 0.2 + 0.8 * v); ctx.lineWidth = 1 + v * 10;
          ctx.beginPath(); ctx.moveTo(x0, base); ctx.quadraticCurveTo(mx, base - hh * 2, x1, base); ctx.stroke();
        });
        toks.forEach((t, i) => {
          ctx.fillStyle = i === st.sel ? P.accent : VZ.alpha(P.dim, 0.15);
          const tw = Math.min(gap - 4, 70);
          ctx.fillRect(xs[i] - tw / 2, base + 4, tw, 22);
          ctx.fillStyle = i === st.sel ? P.bg : P.text; ctx.font = VZ.font(11, false, 600); ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(t.length > 6 ? t.slice(0, 6) + "…" : t, xs[i], base + 15);
        });
      }
      const set = S.stats([{ k: "n", label: "토큰 수" }, { k: "cell", label: "선택한 칸" }, { k: "H", label: "선택 행 엔트로피" }]);
      function upd() {
        compute(); cv.redraw(); cvA.redraw();
        set("n", toks.length);
        const row = A[st.sel];
        set("H", (-row.reduce((s, v) => s + (v > 0 ? v * Math.log2(v) : 0), 0)).toFixed(2) + "<small>bit</small>");
      }
      S.text({ label: "문장 (띄어쓰기 = 토큰, 최대 16개)", value: st.text, onInput: (v) => { st.text = v; upd(); } });
      const headSeg = () => [["avg", "평균"], ...Array.from({ length: st.heads }, (_, i) => [String(i), "헤드 " + (i + 1)])];
      S.seg({ label: "헤드 수", options: [[1, "1"], [2, "2"], [4, "4"], [8, "8"]], value: st.heads, onChange: (v) => { st.heads = +v; st.head = "avg"; buildHeadSeg(); upd(); } });
      const headWrap = document.createElement("div");
      S.controls.appendChild(headWrap);
      function buildHeadSeg() {
        headWrap.innerHTML = '<div class="ctrl"><span>보기</span><div class="seg"></div></div>';
        const seg = headWrap.querySelector(".seg");
        headSeg().forEach(([v, t]) => {
          const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.classList.toggle("on", st.head === v);
          b.onclick = () => { st.head = v; seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); upd(); };
          seg.appendChild(b);
        });
      }
      buildHeadSeg();
      S.range({ label: "온도", min: 0.2, max: 3, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { st.T = v; upd(); } });
      S.check({ label: "인과 마스크 (미래 가리기)", value: false, onChange: (v) => { st.causal = v; upd(); } });
      S.check({ label: "위치 인코딩 더하기", value: true, onChange: (v) => { st.pe = v; upd(); } });
      S.check({ label: "W_Q = W_K (대칭 점수)", value: false, onChange: (v) => { st.shared = v; upd(); } });
      const cellAt = (p) => { if (!geo) return null; const j = Math.floor((p.x - geo.ox) / geo.cell), i = Math.floor((p.y - geo.oy) / geo.cell); return i >= 0 && j >= 0 && i < geo.n && j < geo.n ? [i, j] : null; };
      VZ.drag(cv.canvas, {
        hover(p) { hover = cellAt(p); cv.redraw(); if (hover) set("cell", `${toks[hover[0]]} → ${toks[hover[1]]}: ${(A[hover[0]][hover[1]] * 100).toFixed(1)}%`); },
        down(p) { const c = cellAt(p); if (c) { st.sel = c[0]; upd(); } return false; },
        leave() { hover = null; cv.redraw(); },
      });
      upd();
    },
  });

  /* ======================================================================
     8. 사인파 위치 인코딩
     ====================================================================== */
  Lab.register({
    id: "posenc", field: "dl", thumb: "heat",
    title: "사인파 위치 인코딩",
    desc: "PE(pos, 2i) = sin(pos / 10000^(2i/d)). 차원마다 파장이 다른 사인·코사인이 위치를 어떻게 부호화하는지 봅니다.",
    tags: ["Transformer", "위치 인코딩"],
    note: "해볼 것: 히트맵 위에서 행(위치)을 가리키면 오른쪽 그래프에 그 위치와 다른 모든 위치의 내적이 그려집니다. 거리가 멀수록 유사도가 줄어드는 모양이 상대 위치 정보를 담는 비결입니다. 왼쪽 열(낮은 차원)은 빠르게, 오른쪽 열은 천천히 변합니다.",
    mount(S) {
      const st = { d: 64, L: 100, base: 4, p: 20 };
      const pe = (p, i) => { const k = Math.floor(i / 2), ang = p / Math.pow(Math.pow(10, st.base), (2 * k) / st.d); return i % 2 ? Math.cos(ang) : Math.sin(ang); };
      const [a, b] = S.split(2);
      const cv = S.canvas({ parent: a, aspect: 0.95, maxHeight: 440 }, draw);
      const cvS = S.canvas({ parent: b, aspect: 0.95, maxHeight: 440 }, drawSim);
      let geo = null;
      function draw(ctx, w, h) {
        const P = VZ.palette(), m = { l: 40, r: 10, t: 24, b: 26 }, pw = w - m.l - m.r, ph = h - m.t - m.b;
        geo = { m, pw, ph };
        VZ.field(ctx, m.l, m.t, pw, ph, st.d, st.L, (i, j) => pe(j, i), (v) => VZ.diverge(v, P.dark), false);
        ctx.strokeStyle = P.text; ctx.lineWidth = 1.5; const y = m.t + ((st.p + 0.5) / st.L) * ph; ctx.beginPath(); ctx.moveTo(m.l - 4, y); ctx.lineTo(m.l + pw + 4, y); ctx.stroke();
        ctx.fillStyle = P.dim; ctx.font = VZ.font(10.5); ctx.textAlign = "right"; ctx.textBaseline = "middle";
        for (let p = 0; p < st.L; p += Math.ceil(st.L / 8)) ctx.fillText(p, m.l - 6, m.t + ((p + 0.5) / st.L) * ph);
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        [0, st.d / 2, st.d - 1].forEach((i) => ctx.fillText(i, m.l + ((i + 0.5) / st.d) * pw, m.t + ph + 5));
        ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 700); ctx.textAlign = "left"; ctx.fillText("위치(세로) × 차원(가로)", m.l, 4);
      }
      function drawSim(ctx) {
        const P = VZ.palette(), v0 = Array.from({ length: st.d }, (_, i) => pe(st.p, i));
        const data = Array.from({ length: st.L }, (_, q) => [q, v0.reduce((s, v, i) => s + v * pe(q, i), 0) / (st.d / 2)]);
        VZ.chart(ctx, null, { x: [0, st.L - 1], y: [-0.4, 1.05], xLabel: "위치 q", title: `PE(${st.p}) · PE(q) / (d/2)`, series: [{ data, color: P.accent, width: 2.2, fill: true }], vlines: [{ x: st.p, color: P.accent2, label: "pos " + st.p }] });
      }
      const set = S.stats([{ k: "min", label: "가장 짧은 파장" }, { k: "max", label: "가장 긴 파장" }]);
      function upd() {
        st.p = Math.min(st.p, st.L - 1);
        cv.redraw(); cvS.redraw();
        set("min", (2 * Math.PI).toFixed(2));
        set("max", VZ.fmt(2 * Math.PI * Math.pow(Math.pow(10, st.base), (st.d - 2) / st.d), 3));
      }
      S.range({ label: "모델 차원 d", min: 8, max: 256, step: 8, value: st.d, onInput: (v) => { st.d = v; upd(); } });
      S.range({ label: "문장 길이", min: 16, max: 256, step: 4, value: st.L, onInput: (v) => { st.L = v; upd(); } });
      S.range({ label: "밑 (10^x)", min: 1, max: 5, step: 0.1, value: st.base, fmt: (v) => VZ.fmt(pow10(v), 3), onInput: (v) => { st.base = v; upd(); } });
      const pick = (p) => { if (!geo) return; const q = Math.floor(((p.y - geo.m.t) / geo.ph) * st.L); if (q >= 0 && q < st.L) { st.p = q; upd(); } };
      VZ.drag(cv.canvas, { hover: pick, down: pick, move: pick });
      upd();
    },
  });

  /* ======================================================================
     9. 합성곱 필터
     ====================================================================== */
  Lab.register({
    id: "conv2d", field: "dl", thumb: "grid",
    title: "합성곱 필터 — 커널이 이미지를 훑는 방법",
    desc: "3×3 커널을 고르거나 직접 숫자를 바꿔 입력 이미지에 합성곱을 적용합니다. 입력 위에 직접 그릴 수도 있습니다.",
    tags: ["CNN", "합성곱", "에지 검출"],
    note: "해볼 것: 왼쪽 입력에 마우스로 그림을 그려 보세요. 출력 위를 가리키면 그 값을 만든 3×3 영역이 입력에 표시됩니다. 소벨 X/Y는 세로/가로 경계를, 라플라시안은 모든 방향의 경계를 찾습니다. (딥러닝 라이브러리의 'convolution'은 실제로는 커널을 뒤집지 않는 상호상관입니다.)",
    mount(S) {
      const N = 48;
      const K = {
        identity: ["항등", [0, 0, 0, 0, 1, 0, 0, 0, 0]],
        box: ["박스 흐림", [1, 1, 1, 1, 1, 1, 1, 1, 1].map((v) => v / 9)],
        gauss: ["가우시안 흐림", [1, 2, 1, 2, 4, 2, 1, 2, 1].map((v) => v / 16)],
        sharpen: ["선명하게", [0, -1, 0, -1, 5, -1, 0, -1, 0]],
        laplace: ["라플라시안 (윤곽)", [0, 1, 0, 1, -4, 1, 0, 1, 0]],
        sobelx: ["소벨 X (세로 경계)", [-1, 0, 1, -2, 0, 2, -1, 0, 1]],
        sobely: ["소벨 Y (가로 경계)", [-1, -2, -1, 0, 0, 0, 1, 2, 1]],
        emboss: ["엠보스", [-2, -1, 0, -1, 1, 1, 0, 1, 2]],
      };
      const st = { img: "shapes", k: "sobelx", ker: K.sobelx[1].slice(), stride: 1, relu: false, erase: false, hover: null };
      let img = new Float32Array(N * N), out = new Float32Array(N * N), on = N;
      function makeImage(kind) {
        img.fill(0);
        if (kind === "letter") {
          const c = document.createElement("canvas"); c.width = c.height = N;
          const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, N, N); x.fillStyle = "#fff"; x.font = "bold 40px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("가", N / 2, N / 2 + 2);
          const d = x.getImageData(0, 0, N, N).data; for (let k = 0; k < N * N; k++) img[k] = d[k * 4] / 255;
          return;
        }
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          let v = 0;
          if (kind === "shapes") {
            if (Math.hypot(i - 14, j - 15) < 9) v = 1;
            if (i > 26 && i < 42 && j > 8 && j < 22) v = 0.7;
            if (j > 28 && j < 44 && Math.abs(i - 24) < (j - 28) * 0.9) v = 0.85;
          } else if (kind === "checker") v = (Math.floor(i / 8) + Math.floor(j / 8)) % 2;
          else if (kind === "gradient") v = i / (N - 1) * 0.8 + (Math.hypot(i - 24, j - 24) < 12 ? 0.2 : 0);
          img[j * N + i] = v;
        }
      }
      function convolve() {
        const s = st.stride; on = Math.ceil(N / s); out = new Float32Array(on * on);
        for (let oj = 0; oj < on; oj++) for (let oi = 0; oi < on; oi++) {
          const cj = oj * s, ci = oi * s; let acc = 0;
          for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
            const y = cj + dj, x = ci + di;
            if (x >= 0 && y >= 0 && x < N && y < N) acc += img[y * N + x] * st.ker[(dj + 1) * 3 + (di + 1)];
          }
          out[oj * on + oi] = st.relu ? Math.max(0, acc) : acc;
        }
      }
      const [a, b] = S.split(2);
      const cvI = S.canvas({ parent: a, aspect: 1, maxHeight: 380 }, drawIn);
      const cvO = S.canvas({ parent: b, aspect: 1, maxHeight: 380 }, drawOut);
      const box = (w, h) => { const s = Math.min(w, h) - 36; return { s, ox: (w - s) / 2, oy: 26 }; };
      function drawIn(ctx, w, h) {
        const P = VZ.palette(), B = box(w, h);
        VZ.field(ctx, B.ox, B.oy, B.s, B.s, N, N, (i, j) => img[j * N + i], (v) => { const g = Math.round(VZ.clamp(v, 0, 1) * 255); return [g, g, g]; }, false);
        ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("입력 48×48 (그릴 수 있음)", B.ox, 6);
        if (st.hover) {
          const c = B.s / N, [oi, oj] = st.hover;
          ctx.strokeStyle = P.warn; ctx.lineWidth = 2; ctx.strokeRect(B.ox + (oi * st.stride - 1) * c, B.oy + (oj * st.stride - 1) * c, 3 * c, 3 * c);
        }
      }
      function drawOut(ctx, w, h) {
        const P = VZ.palette(), B = box(w, h);
        let mx = 1e-6; for (let k = 0; k < out.length; k++) mx = Math.max(mx, Math.abs(out[k]));
        const hasNeg = out.some((v) => v < -1e-6);
        VZ.field(ctx, B.ox, B.oy, B.s, B.s, on, on, (i, j) => out[j * on + i] / mx, (v) => (hasNeg ? VZ.diverge(v, P.dark) : ((g) => [g, g, g])(Math.round(VZ.clamp(v, 0, 1) * 255))), false);
        ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`출력 ${on}×${on}${hasNeg ? " (파랑 −, 빨강 +)" : ""}`, B.ox, 6);
        if (st.hover) { const c = B.s / on; ctx.strokeStyle = P.warn; ctx.lineWidth = 2; ctx.strokeRect(B.ox + st.hover[0] * c, B.oy + st.hover[1] * c, c, c); }
      }
      // 커널 편집 격자
      const kwrap = document.createElement("div");
      kwrap.className = "ctrl";
      kwrap.innerHTML = '<span>커널 (직접 수정 가능)</span><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px"></div>';
      const kgrid = kwrap.querySelector("div");
      const kin = Array.from({ length: 9 }, (_, i) => {
        const x = document.createElement("input");
        x.type = "number"; x.step = "0.1";
        x.style.cssText = "width:100%;font:13px var(--mono);padding:6px 4px;text-align:center;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text)";
        x.addEventListener("input", () => { st.ker[i] = parseFloat(x.value) || 0; upd(); });
        kgrid.appendChild(x);
        return x;
      });
      const showKernel = () => kin.forEach((x, i) => (x.value = +st.ker[i].toFixed(3)));
      const set = S.stats([{ k: "sum", label: "커널 합" }, { k: "v", label: "가리킨 출력값" }, { k: "sz", label: "출력 크기" }]);
      function upd() {
        convolve(); cvI.redraw(); cvO.redraw();
        set("sum", +st.ker.reduce((x, y) => x + y, 0).toFixed(3)); set("sz", `${on}×${on}`);
      }
      S.select({ label: "입력 이미지", options: [["shapes", "도형"], ["letter", "글자 '가'"], ["checker", "체커보드"], ["gradient", "그라디언트"], ["blank", "빈 화면 (직접 그리기)"]], value: st.img, onChange: (v) => { makeImage(v); upd(); } });
      S.select({ label: "커널 프리셋", options: Object.entries(K).map(([k, v]) => [k, v[0]]), value: st.k, onChange: (v) => { st.ker = K[v][1].slice(); showKernel(); upd(); } });
      S.controls.appendChild(kwrap);
      S.seg({ label: "스트라이드", options: [[1, "1"], [2, "2"]], value: 1, onChange: (v) => { st.stride = +v; upd(); } });
      S.check({ label: "ReLU 적용 (음수 → 0)", value: false, onChange: (v) => { st.relu = v; upd(); } });
      S.check({ label: "지우개로 그리기", value: false, onChange: (v) => (st.erase = v) });
      const paint = (p) => {
        const B = box(cvI.w, cvI.h), c = B.s / N, ci = (p.x - B.ox) / c, cj = (p.y - B.oy) / c;
        for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
          const x = Math.floor(ci + i), y = Math.floor(cj + j), d = Math.hypot(i, j);
          if (x >= 0 && y >= 0 && x < N && y < N && d <= 2.2) img[y * N + x] = st.erase ? 0 : Math.max(img[y * N + x], 1 - d * 0.18);
        }
        upd();
      };
      VZ.drag(cvI.canvas, { down: paint, move: paint });
      VZ.drag(cvO.canvas, {
        hover(p) {
          const B = box(cvO.w, cvO.h), c = B.s / on, i = Math.floor((p.x - B.ox) / c), j = Math.floor((p.y - B.oy) / c);
          st.hover = i >= 0 && j >= 0 && i < on && j < on ? [i, j] : null;
          if (st.hover) set("v", out[j * on + i].toFixed(3));
          cvI.redraw(); cvO.redraw();
        },
        leave() { st.hover = null; cvI.redraw(); cvO.redraw(); },
        down() { return false; },
      });
      makeImage(st.img); showKernel(); upd();
    },
  });

  /* ======================================================================
     10. 소프트맥스 온도와 디코딩 (top-k, top-p)
     ====================================================================== */
  Lab.register({
    id: "softmax-temp", field: "dl", thumb: "bars",
    title: "다음 토큰 고르기 — 온도 · top-k · top-p",
    desc: "언어 모델이 내놓은 로짓을 확률로 바꾸고, 온도와 top-k/top-p 잘라내기로 샘플링 분포가 어떻게 바뀌는지 봅니다.",
    tags: ["LLM", "디코딩", "소프트맥스", "샘플링"],
    note: "해볼 것: 온도를 0에 가깝게 하면 항상 '맑다'만 나오는 탐욕적 디코딩이 되고, 2 이상이면 '바나나'도 나옵니다. top-p = 0.9는 누적 확률 90%까지의 후보만 남깁니다. 회색 막대는 잘려 나간 후보입니다.",
    mount(S) {
      const base = [["맑다", 3.2], ["좋다", 2.9], ["흐리다", 2.1], ["춥다", 1.6], ["덥다", 1.2], ["이상하다", 0.4], ["최고다", 0.1], ["바나나", -1.5]];
      let logits = base.map((d) => d[1]);
      const st = { T: 1, k: 8, p: 1, samples: new Array(base.length).fill(0), nS: 0, last: [] };
      let probs = [], kept = [];
      function compute() {
        const z = logits.map((l) => l / Math.max(st.T, 1e-3)), m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), Z = e.reduce((a, b) => a + b, 0);
        const p = e.map((v) => v / Z);
        const order = p.map((v, i) => i).sort((a, b) => p[b] - p[a]);
        kept = new Array(p.length).fill(false);
        let cum = 0;
        order.forEach((i, r) => { if (r < st.k && (cum < st.p || r === 0)) { kept[i] = true; cum += p[i]; } });
        const Zk = p.reduce((s, v, i) => s + (kept[i] ? v : 0), 0);
        probs = p.map((v, i) => (kept[i] ? v / Zk : 0));
        return p;
      }
      const cv = S.canvas({ aspect: 0.5, maxHeight: 360 }, draw);
      let raw = [];
      function draw(ctx, w, h) {
        const P = VZ.palette(), n = base.length, m = { l: 40, r: 14, t: 44, b: 44 }, bw = (w - m.l - m.r) / n, ph = h - m.t - m.b;
        const ymax = Math.max(0.5, ...probs, ...raw) * 1.1;
        const Y = (v) => m.t + ph - (v / ymax) * ph;
        ctx.fillStyle = P.text; ctx.font = VZ.font(15, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("오늘 날씨가 ___", m.l, 10);
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11.5, false); ctx.textAlign = "right"; ctx.fillText("막대: 최종 확률 · 테두리: T=1 원래 확률 · ●: 샘플 빈도", w - m.r, 14);
        ctx.strokeStyle = P.grid; ctx.fillStyle = P.dim; ctx.font = VZ.font(10.5); ctx.textAlign = "right"; ctx.textBaseline = "middle";
        for (let v = 0; v <= ymax; v += ymax > 0.6 ? 0.2 : 0.1) { ctx.beginPath(); ctx.moveTo(m.l, Y(v)); ctx.lineTo(w - m.r, Y(v)); ctx.stroke(); ctx.fillText(v.toFixed(1), m.l - 6, Y(v)); }
        const p1 = (() => { const m0 = Math.max(...logits), e = logits.map((v) => Math.exp(v - m0)), Z = e.reduce((a, b) => a + b, 0); return e.map((v) => v / Z); })();
        base.forEach(([t], i) => {
          const x = m.l + i * bw + bw * 0.15, ww = bw * 0.7;
          ctx.fillStyle = kept[i] ? VZ.cat[i % 10] : VZ.alpha(P.dim, 0.25);
          ctx.fillRect(x, Y(probs[i] || (kept[i] ? 0 : raw[i])), ww, Y(0) - Y(probs[i] || (kept[i] ? 0 : raw[i])));
          ctx.strokeStyle = P.text; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeRect(x, Y(p1[i]), ww, Y(0) - Y(p1[i])); ctx.setLineDash([]);
          if (st.nS) { ctx.fillStyle = P.text; ctx.beginPath(); ctx.arc(x + ww / 2, Y(st.samples[i] / st.nS), 4, 0, 7); ctx.fill(); }
          ctx.fillStyle = kept[i] ? P.text : P.faint; ctx.font = VZ.font(12, false, 600); ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillText(t, x + ww / 2, h - m.b + 6);
          ctx.font = VZ.font(10); ctx.fillStyle = P.dim; ctx.fillText("z=" + logits[i].toFixed(1), x + ww / 2, h - m.b + 22);
          if (probs[i] > 0.005) { ctx.font = VZ.font(10.5, true, 700); ctx.fillStyle = P.text; ctx.textBaseline = "bottom"; ctx.fillText((probs[i] * 100).toFixed(0) + "%", x + ww / 2, Y(probs[i]) - 3); }
        });
      }
      const set = S.stats([{ k: "H", label: "엔트로피" }, { k: "kept", label: "남은 후보" }, { k: "gen", label: "최근 샘플" }]);
      function upd() {
        raw = compute(); cv.redraw();
        set("H", (-probs.reduce((s, v) => s + (v > 0 ? v * Math.log2(v) : 0), 0)).toFixed(2) + "<small>bit</small>");
        set("kept", kept.filter(Boolean).length + " / " + base.length);
        set("gen", st.last.length ? st.last.slice(-4).join(", ") : "—");
      }
      const draw1 = () => { let r = Math.random(), i = 0; while (i < probs.length - 1 && (r -= probs[i]) > 0) i++; return i; };
      S.range({ label: "온도 T", min: 0.05, max: 3, step: 0.05, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { st.T = v; st.samples.fill(0); st.nS = 0; upd(); } });
      S.range({ label: "top-k", min: 1, max: base.length, step: 1, value: base.length, onInput: (v) => { st.k = v; st.samples.fill(0); st.nS = 0; upd(); } });
      S.range({ label: "top-p (누적 확률)", min: 0.1, max: 1, step: 0.01, value: 1, fmt: (v) => v.toFixed(2), onInput: (v) => { st.p = v; st.samples.fill(0); st.nS = 0; upd(); } });
      S.button("1개 샘플", () => { const i = draw1(); st.samples[i]++; st.nS++; st.last.push(base[i][0]); upd(); }, { primary: true });
      S.button("1000번 샘플", () => { for (let k = 0; k < 1000; k++) st.samples[draw1()]++; st.nS += 1000; upd(); });
      S.button("로짓 섞기", () => { logits = logits.map((v) => VZ.clamp(v + VZ.randn() * 0.8, -3, 4)); st.samples.fill(0); st.nS = 0; upd(); });
      S.button("되돌리기", () => { logits = base.map((d) => d[1]); st.samples.fill(0); st.nS = 0; st.last = []; upd(); });
      upd();
    },
  });

  /* ======================================================================
     11. 2D 확산 모델 (정확한 점수 함수로 역확산)
     ====================================================================== */
  Lab.register({
    id: "diffusion2d", field: "dl", thumb: "particles",
    title: "확산 모델 — 잡음을 더하고, 거꾸로 걷어 내기",
    desc: "2차원 점 구름에 잡음을 단계적으로 더하는 순방향 과정과, 점수 함수로 잡음에서 데이터를 되살리는 역방향(DDPM) 과정을 봅니다.",
    tags: ["확산 모델", "DDPM", "점수 함수", "생성 모델"],
    note: "여기서는 신경망 대신 데이터로부터 <b>정확히 계산한 점수 함수</b>(작은 가우시안의 혼합)를 씁니다. 실제 확산 모델은 이 점수(또는 잡음 ε)를 신경망이 학습해 근사합니다. 화살표는 현재 단계의 점수 ∇log p<sub>t</sub>(x) — 입자가 끌려가는 방향입니다.",
    mount(S) {
      const NT = 200, R = 3, ND = 320, NP = 600, SIGD = 0.06;
      const st = { shape: "spiral", sched: "linear", t: 0, mode: "forward", speed: 2, arrows: true, showData: true };
      let data = [], eps = [], parts = [], beta = [], alpha = [], abar = [];
      function makeData() {
        const r = VZ.rng(4); data = [];
        for (let i = 0; i < ND; i++) {
          let x, y;
          if (st.shape === "spiral") { const t = 0.6 + (i / ND) * 3.4 * Math.PI, rr = t / (4 * Math.PI) * 2.1; x = rr * Math.cos(t); y = rr * Math.sin(t); }
          else if (st.shape === "moons") { const c = i % 2, a = r() * Math.PI; x = c ? 1 - Math.cos(a) - 0.5 : Math.cos(a) - 0.5; y = c ? 0.45 - Math.sin(a) : Math.sin(a) - 0.2; x *= 1.2; y *= 1.2; }
          else if (st.shape === "heart") { const t = r() * 2 * Math.PI; x = 16 * Math.sin(t) ** 3 / 13; y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 13 + 0.2; }
          else { const k = i % 8, a = (k / 8) * 2 * Math.PI; x = 1.6 * Math.cos(a) + VZ.randn(r) * 0.08; y = 1.6 * Math.sin(a) + VZ.randn(r) * 0.08; }
          data.push([x + VZ.randn(r) * 0.03, y + VZ.randn(r) * 0.03]);
        }
        const er = VZ.rng(9); eps = data.map(() => [VZ.randn(er), VZ.randn(er)]);
      }
      function makeSched() {
        beta = [0]; alpha = [1]; abar = [1];
        if (st.sched === "linear") for (let t = 1; t <= NT; t++) { beta[t] = 1e-4 + ((0.05 - 1e-4) * (t - 1)) / (NT - 1); }
        else { const s = 0.008, f = (t) => Math.cos(((t / NT + s) / (1 + s)) * Math.PI / 2) ** 2; for (let t = 1; t <= NT; t++) beta[t] = Math.min(0.999, 1 - f(t) / f(t - 1)); }
        for (let t = 1; t <= NT; t++) { alpha[t] = 1 - beta[t]; abar[t] = abar[t - 1] * alpha[t]; }
      }
      /** 노이즈 섞인 혼합분포의 점수 ∇log p_t(x) */
      function score(x, y, t) {
        const sa = Math.sqrt(abar[t]), s2 = abar[t] * SIGD * SIGD + (1 - abar[t]);
        let m = -Infinity; const lw = new Float64Array(ND);
        for (let i = 0; i < ND; i++) { const dx = x - sa * data[i][0], dy = y - sa * data[i][1]; lw[i] = -(dx * dx + dy * dy) / (2 * s2); if (lw[i] > m) m = lw[i]; }
        let Z = 0, mx = 0, my = 0;
        for (let i = 0; i < ND; i++) { const w = Math.exp(lw[i] - m); Z += w; mx += w * data[i][0]; my += w * data[i][1]; }
        mx /= Z; my /= Z;
        return [(sa * mx - x) / s2, (sa * my - y) / s2];
      }
      function startReverse() {
        const r = VZ.rng((Math.random() * 1e9) | 0);
        parts = Array.from({ length: NP }, () => [VZ.randn(r), VZ.randn(r)]);
        st.t = NT; st.mode = "reverse"; tSlider.set(NT, false);
      }
      function reverseStep() {
        const t = st.t;
        if (t <= 0) { st.mode = "done"; return; }
        const c1 = 1 / Math.sqrt(alpha[t]), sigma = t > 1 ? Math.sqrt((beta[t] * (1 - abar[t - 1])) / (1 - abar[t])) : 0;
        parts.forEach((p) => {
          const [sx, sy] = score(p[0], p[1], t);
          // ε̂ = −√(1−ᾱ)·score  →  x_{t−1} = (x − β/√(1−ᾱ)·ε̂)/√α + σz = (x + β·score)/√α + σz
          p[0] = c1 * (p[0] + beta[t] * sx) + sigma * VZ.randn();
          p[1] = c1 * (p[1] + beta[t] * sy) + sigma * VZ.randn();
        });
        st.t--;
        tSlider.set(st.t, false);
      }
      makeData(); makeSched();
      const cv = S.canvas({ aspect: 1, maxHeight: 440 }, draw);
      const cvS = S.canvas({ height: 140 }, drawSched);
      function draw(ctx, w, h) {
        const P = VZ.palette(), s = Math.min(w, h) - 16, ox = (w - s) / 2, oy = (h - s) / 2;
        const X = (x) => ox + ((x + R) / (2 * R)) * s, Y = (y) => oy + ((R - y) / (2 * R)) * s;
        ctx.strokeStyle = P.grid;
        for (let v = -3; v <= 3; v++) { ctx.beginPath(); ctx.moveTo(X(v), Y(-R)); ctx.lineTo(X(v), Y(R)); ctx.moveTo(X(-R), Y(v)); ctx.lineTo(X(R), Y(v)); ctx.stroke(); }
        const t = st.t;
        if (st.showData && (st.mode !== "forward" || t > 0)) { ctx.fillStyle = VZ.alpha(P.dim, 0.25); data.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(X(x), Y(y), 1.6, 0, 7); ctx.fill(); }); }
        if (st.arrows && t > 0) {
          ctx.strokeStyle = VZ.alpha(P.accent2, 0.6); ctx.fillStyle = VZ.alpha(P.accent2, 0.6); ctx.lineWidth = 1.1;
          const n = 15;
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
            const x = -R + ((i + 0.5) * 2 * R) / n, y = -R + ((j + 0.5) * 2 * R) / n, [gx, gy] = score(x, y, t);
            const L = Math.hypot(gx, gy), len = (Math.min(L, 4) / 4) * 0.32;
            if (L > 1e-6) VZ.arrow(ctx, X(x), Y(y), X(x + (gx / L) * len), Y(y + (gy / L) * len), 4);
          }
        }
        ctx.fillStyle = P.accent;
        if (st.mode === "forward") {
          const sa = Math.sqrt(abar[t]), sn = Math.sqrt(1 - abar[t]);
          data.forEach(([x, y], i) => { ctx.beginPath(); ctx.arc(X(sa * x + sn * eps[i][0]), Y(sa * y + sn * eps[i][1]), 2.4, 0, 7); ctx.fill(); });
        } else parts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(X(x), Y(y), 2.1, 0, 7); ctx.fill(); });
        ctx.fillStyle = P.text; ctx.font = VZ.font(12.5, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(st.mode === "forward" ? `순방향 q(x_t | x_0) · t = ${t}` : st.mode === "reverse" ? `역방향 생성 중 · t = ${t}` : "생성 완료 · t = 0", ox + 6, oy + 6);
      }
      function drawSched(ctx) {
        const P = VZ.palette();
        VZ.chart(ctx, null, {
          x: [0, NT], y: [0, 1], xLabel: "확산 단계 t", title: "— √ᾱ (신호 비율)    - - √(1−ᾱ) (잡음 비율)", margin: { b: 36 },
          series: [{ data: abar.map((v, t) => [t, Math.sqrt(v)]), color: P.accent, width: 2 }, { data: abar.map((v, t) => [t, Math.sqrt(1 - v)]), color: P.accent2, width: 2, dash: [5, 4] }],
          vlines: [{ x: st.t, color: P.text, dash: [] }],
        });
      }
      const set = S.stats([{ k: "t", label: "단계 t" }, { k: "ab", label: "ᾱ_t" }, { k: "snr", label: "SNR = ᾱ/(1−ᾱ)" }]);
      function upd() { cv.redraw(); cvS.redraw(); set("t", st.t); set("ab", abar[st.t].toFixed(4)); set("snr", st.t === 0 ? "∞" : VZ.fmt(abar[st.t] / (1 - abar[st.t]), 3)); }
      S.seg({ label: "데이터 모양", options: [["spiral", "나선"], ["moons", "두 달"], ["heart", "하트"], ["ring", "가우시안 8개"]], value: st.shape, onChange: (v) => { st.shape = v; makeData(); st.mode = "forward"; upd(); } });
      S.seg({ label: "잡음 스케줄", options: [["linear", "선형 β"], ["cosine", "코사인"]], value: st.sched, onChange: (v) => { st.sched = v; makeSched(); upd(); } });
      const tSlider = S.range({ label: "순방향 단계 t", min: 0, max: NT, step: 1, value: 0, onInput: (v) => { st.t = v; st.mode = "forward"; upd(); } });
      S.range({ label: "역방향 속도", min: 1, max: 8, step: 1, value: st.speed, onInput: (v) => (st.speed = v) });
      S.check({ label: "점수 화살표", value: true, onChange: (v) => { st.arrows = v; upd(); } });
      S.check({ label: "원본 데이터 흐리게", value: true, onChange: (v) => { st.showData = v; upd(); } });
      S.button("잡음에서 생성하기", () => { startReverse(); upd(); }, { primary: true });
      S.loop(() => { if (st.mode === "reverse") { for (let k = 0; k < st.speed; k++) reverseStep(); upd(); } });
      upd();
    },
  });

  /* ======================================================================
     12. 다항식 회귀와 과적합
     ====================================================================== */
  Lab.register({
    id: "overfit", field: "dl", thumb: "curve",
    title: "과적합과 정규화 — 다항식 차수와 테스트 오차",
    desc: "잡음 섞인 sin 곡선에 다항식을 맞춥니다. 차수가 커질수록 학습 오차는 줄지만 테스트 오차는 U자 곡선을 그립니다.",
    tags: ["과적합", "정규화", "편향-분산"],
    note: "해볼 것: 점 10개에 9차 다항식을 맞추면 모든 점을 지나지만 그 사이에서 크게 출렁입니다. L2 정규화(λ)를 키우거나 데이터를 늘리면 진정됩니다. 아래 그래프는 지금 λ에서 모든 차수의 학습/테스트 오차입니다.",
    mount(S) {
      const st = { n: 12, noise: 0.25, deg: 3, lam: -8, seed: 1 };
      const MAXD = 15;
      let tr = [], te = [];
      const truth = (x) => Math.sin(2 * Math.PI * x);
      function gen() {
        const r = VZ.rng(st.seed);
        tr = Array.from({ length: st.n }, () => { const x = r(); return [x, truth(x) + VZ.randn(r) * st.noise]; });
        const r2 = VZ.rng(st.seed + 500);
        te = Array.from({ length: 300 }, () => { const x = r2(); return [x, truth(x) + VZ.randn(r2) * st.noise]; });
      }
      const feats = (x, d) => { const u = 2 * x - 1, f = [1, u]; for (let k = 1; k < d; k++) f.push(((2 * k + 1) * u * f[k] - k * f[k - 1]) / (k + 1)); return f.slice(0, d + 1); };
      function fit(d, lam) {
        const m = d + 1, A = Array.from({ length: m }, () => new Float64Array(m + 1));
        tr.forEach(([x, y]) => { const f = feats(x, d); for (let i = 0; i < m; i++) { for (let j = 0; j < m; j++) A[i][j] += f[i] * f[j]; A[i][m] += f[i] * y; } });
        for (let i = 0; i < m; i++) A[i][i] += (i ? lam : 0) * tr.length + 1e-10;
        for (let c = 0; c < m; c++) {
          let piv = c; for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
          [A[c], A[piv]] = [A[piv], A[c]];
          for (let r = 0; r < m; r++) if (r !== c) { const k = A[r][c] / A[c][c]; for (let j = c; j <= m; j++) A[r][j] -= k * A[c][j]; }
        }
        return A.map((row, i) => row[m] / row[i]);
      }
      const pred = (w, x) => feats(x, w.length - 1).reduce((s, f, i) => s + f * w[i], 0);
      const rmse = (w, set) => Math.sqrt(set.reduce((s, [x, y]) => s + (pred(w, x) - y) ** 2, 0) / set.length);
      const cv = S.canvas({ aspect: 0.5, maxHeight: 340 }, draw);
      const cvE = S.canvas({ height: 190 }, drawErr);
      let curve = [], errs = [];
      function draw(ctx) {
        const P = VZ.palette();
        VZ.chart(ctx, null, {
          x: [0, 1], y: [-2, 2], xLabel: "x",
          series: [
            { data: VZ.linspace(0, 1, 200).map((x) => [x, truth(x)]), color: P.dim, width: 1.5, dash: [5, 4] },
            { data: curve, color: P.accent, width: 2.6 },
            { type: "scatter", data: te.slice(0, 80).map(([x, y]) => [x, y]), color: VZ.alpha(P.dim, 0.25), r: 2 },
            { type: "scatter", data: tr, color: P.accent2, r: 4.5 },
          ],
          texts: [{ x: 0.02, y: 1.8, text: `${st.deg}차 다항식 · λ = ${st.lam <= -8 ? 0 : VZ.fmt(pow10(st.lam), 2)}`, color: P.text, sans: true, size: 12.5 }],
        });
      }
      function drawErr(ctx) {
        const P = VZ.palette();
        const ymax = Math.min(2, Math.max(0.6, ...errs.map((e) => e[2])) * 1.1);
        VZ.chart(ctx, null, {
          x: [0, MAXD], y: [0, ymax], xLabel: "다항식 차수", yLabel: "RMSE",
          series: [{ data: errs.map((e) => [e[0], e[1]]), color: P.accent, width: 2 }, { data: errs.map((e) => [e[0], Math.min(e[2], ymax * 2)]), color: P.accent2, width: 2, dash: [6, 4] }],
          hlines: [{ y: st.noise, color: P.faint, label: "잡음 σ" }],
          vlines: [{ x: st.deg, color: P.text, dash: [] }],
          texts: [{ x: MAXD * 0.98, y: ymax * 0.9, text: "— 학습   - - 테스트", align: "right", color: P.dim }],
        });
      }
      const set = S.stats([{ k: "tr", label: "학습 RMSE" }, { k: "te", label: "테스트 RMSE" }, { k: "best", label: "테스트 최적 차수" }]);
      function upd() {
        const lam = st.lam <= -8 ? 0 : pow10(st.lam);
        const w = fit(st.deg, lam);
        curve = VZ.linspace(0, 1, 300).map((x) => [x, pred(w, x)]);
        errs = Array.from({ length: MAXD + 1 }, (_, d) => { const wd = fit(d, lam); return [d, rmse(wd, tr), rmse(wd, te)]; });
        cv.redraw(); cvE.redraw();
        set("tr", rmse(w, tr).toFixed(3)); set("te", rmse(w, te).toFixed(3));
        set("best", errs.reduce((b, e) => (e[2] < b[2] ? e : b))[0]);
      }
      S.range({ label: "다항식 차수", min: 0, max: MAXD, step: 1, value: st.deg, onInput: (v) => { st.deg = v; upd(); } });
      S.range({ label: "학습 데이터 수", min: 5, max: 100, step: 1, value: st.n, onInput: (v) => { st.n = v; gen(); upd(); } });
      S.range({ label: "잡음 σ", min: 0, max: 0.8, step: 0.01, value: st.noise, fmt: (v) => v.toFixed(2), onInput: (v) => { st.noise = v; gen(); upd(); } });
      S.range({ label: "L2 정규화 λ", min: -8, max: 0, step: 0.1, value: st.lam, fmt: (v) => (v <= -8 ? "0" : VZ.fmt(pow10(v), 2)), onInput: (v) => { st.lam = v; upd(); } });
      S.button("새 데이터 뽑기", () => { st.seed++; gen(); upd(); }, { primary: true });
      gen(); upd();
    },
  });

  /* ======================================================================
     13. 학습률 스케줄
     ====================================================================== */
  Lab.register({
    id: "lr-schedule", field: "dl", thumb: "curve",
    title: "학습률 스케줄 — 워밍업과 코사인 감쇠",
    desc: "상수, 계단, 지수, 코사인, 워밍업+코사인, 원사이클, 역제곱근(Transformer) 스케줄을 한 그래프에서 비교합니다.",
    tags: ["학습률", "워밍업", "코사인", "최적화"],
    note: "해볼 것: 워밍업 단계를 0으로 하면 학습 초반에 큰 학습률이 바로 걸립니다. 큰 배치나 Adam 계열에서 워밍업이 학습을 안정시키는 이유입니다. 그래프 위를 가리키면 그 단계의 학습률을 읽을 수 있습니다.",
    mount(S) {
      const st = { sel: "warmcos", total: 1000, warm: 100, base: 1e-3, min: 1e-5, probe: 300 };
      const SCH = {
        const: ["상수", (s) => st.base],
        step: ["계단 (×0.3 / 30%)", (s) => st.base * Math.pow(0.3, Math.floor(s / (st.total * 0.3)))],
        exp: ["지수 감쇠", (s) => st.base * Math.pow(Math.max(st.min, st.base * 1e-3) / st.base, s / st.total)],
        cos: ["코사인", (s) => st.min + 0.5 * (st.base - st.min) * (1 + Math.cos((Math.PI * s) / st.total))],
        warmcos: ["워밍업 + 코사인", (s) => (s < st.warm ? (st.base * (s + 1)) / Math.max(1, st.warm) : st.min + 0.5 * (st.base - st.min) * (1 + Math.cos((Math.PI * (s - st.warm)) / Math.max(1, st.total - st.warm))))],
        onecycle: ["원사이클", (s) => { const p = st.total * 0.3; return s < p ? st.base / 25 + (st.base - st.base / 25) * (0.5 - 0.5 * Math.cos((Math.PI * s) / p)) : st.min + (st.base - st.min) * (0.5 + 0.5 * Math.cos((Math.PI * (s - p)) / (st.total - p))); }],
        noam: ["역제곱근 (Transformer)", (s) => { const w = Math.max(1, st.warm), k = st.base * Math.sqrt(w); return k * Math.min(Math.pow(s + 1, -0.5), (s + 1) * Math.pow(w, -1.5)); }],
      };
      let C = null;
      const cv = S.canvas({ aspect: 0.5, maxHeight: 360 }, (ctx) => {
        const P = VZ.palette(), xs = VZ.linspace(0, st.total, 400);
        const series = Object.entries(SCH).map(([k, [, f]], i) => ({ data: xs.map((s) => [s, f(s)]), color: k === st.sel ? P.accent : VZ.alpha(VZ.cat[i], 0.45), width: k === st.sel ? 3.2 : 1.4 }));
        const f = SCH[st.sel][1];
        C = VZ.chart(ctx, null, {
          x: [0, st.total], y: [0, st.base * 1.15], xLabel: "학습 단계", yLabel: "학습률", yFmt: (v) => VZ.fmt(v, 2),
          series, bands: st.warm ? [{ x0: 0, x1: st.warm, color: VZ.alpha(P.warn, 0.1) }] : [],
          vlines: [{ x: st.probe, color: P.faint }], points: [{ x: st.probe, y: f(st.probe), color: P.accent, r: 5, label: VZ.fmt(f(st.probe), 3) }],
        });
      });
      S.legend(Object.entries(SCH).map(([k, [n]], i) => ({ label: n, color: VZ.cat[i] })));
      const set = S.stats([{ k: "lr", label: "선택 지점 학습률" }, { k: "avg", label: "평균 학습률" }]);
      function upd() {
        cv.redraw();
        const f = SCH[st.sel][1];
        set("lr", VZ.fmt(f(st.probe), 3));
        set("avg", VZ.fmt(VZ.mean(VZ.linspace(0, st.total, 500).map(f)), 3));
      }
      S.select({ label: "강조할 스케줄", options: Object.entries(SCH).map(([k, [n]]) => [k, n]), value: st.sel, onChange: (v) => { st.sel = v; upd(); } });
      S.range({ label: "전체 단계", min: 200, max: 5000, step: 100, value: st.total, onInput: (v) => { st.total = v; st.warm = Math.min(st.warm, v / 2); upd(); } });
      S.range({ label: "워밍업 단계", min: 0, max: 1000, step: 10, value: st.warm, onInput: (v) => { st.warm = Math.min(v, st.total / 2); upd(); } });
      S.range({ label: "최소 학습률 비율", min: 0, max: 0.5, step: 0.01, value: 0.01, fmt: (v) => v.toFixed(2), onInput: (v) => { st.min = st.base * v; upd(); } });
      const probe = (p) => { if (C) { st.probe = VZ.clamp(C.iX(p.x), 0, st.total); upd(); } };
      VZ.drag(cv.canvas, { hover: probe, down: probe, move: probe });
      upd();
    },
  });
})();
