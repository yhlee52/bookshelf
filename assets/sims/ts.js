/* ==========================================================================
   시계열 실험 모음 (field: "ts")
   ts-decompose · acf · fft · windowing · patching · forecast
   rnn-memory · tcn-receptive · anomaly
   timestral-flow · timestral-quantile · timestral-scaler · timestral-symavg (논문 리뷰 p02)
   ========================================================================== */
(function () {
  "use strict";
  const TAU = Math.PI * 2;
  const pts = (arr, x0 = 0) => arr.map((v, i) => [i + x0, v]);
  const variance = (a) => { const f = a.filter(isFinite), m = VZ.mean(f); return f.reduce((s, v) => s + (v - m) ** 2, 0) / (f.length || 1); };
  /** 추세 + 계절성 + 잡음 합성 시계열 */
  function synth(o) {
    const r = VZ.rng(o.seed || 1), n = o.n;
    return Array.from({ length: n }, (_, t) =>
      (o.level || 0) + (o.slope || 0) * t + (o.curve || 0) * (t / n) ** 2 * n * 0.1 +
      (o.amp || 0) * (Math.sin((TAU * t) / o.period) + 0.35 * Math.sin((2 * TAU * t) / o.period + 1)) +
      (o.shift && t > n * 0.62 ? o.shift : 0) + VZ.randn(r) * (o.noise || 0));
  }
  /** 중심 이동평균 (짝수 창이면 2×m 이동평균) */
  function centeredMA(y, m) {
    const n = y.length, out = new Array(n).fill(NaN), h = Math.floor(m / 2);
    for (let t = h; t < n - h; t++) {
      let s = 0;
      if (m % 2) { for (let k = -h; k <= h; k++) s += y[t + k]; out[t] = s / m; }
      else { for (let k = -h; k <= h; k++) s += (Math.abs(k) === h ? 0.5 : 1) * y[t + k]; out[t] = s / m; }
    }
    return out;
  }
  function acf(y, K) {
    const n = y.length, m = VZ.mean(y), d = y.map((v) => v - m), c0 = d.reduce((s, v) => s + v * v, 0);
    return Array.from({ length: K + 1 }, (_, k) => { let s = 0; for (let t = 0; t + k < n; t++) s += d[t] * d[t + k]; return s / c0; });
  }
  function pacf(r, K) {
    const out = [1], phi = [[]];
    phi[1] = [0, r[1]]; out[1] = r[1];
    for (let k = 2; k <= K; k++) {
      let num = r[k], den = 1;
      for (let j = 1; j < k; j++) { num -= phi[k - 1][j] * r[k - j]; den -= phi[k - 1][j] * r[j]; }
      const pkk = num / den;
      phi[k] = [0];
      for (let j = 1; j < k; j++) phi[k][j] = phi[k - 1][j] - pkk * phi[k - 1][k - j];
      phi[k][k] = pkk; out[k] = pkk;
    }
    return out;
  }
  /** 최소제곱 선형회귀 (정규방정식 + 가우스 소거) */
  function ols(X, y) {
    const m = X[0].length, A = Array.from({ length: m }, () => new Float64Array(m + 1));
    X.forEach((row, n) => { for (let i = 0; i < m; i++) { for (let j = 0; j < m; j++) A[i][j] += row[i] * row[j]; A[i][m] += row[i] * y[n]; } });
    for (let i = 0; i < m; i++) A[i][i] += 1e-8;
    for (let c = 0; c < m; c++) {
      let p = c; for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < m; r++) if (r !== c) { const k = A[r][c] / A[c][c]; for (let j = c; j <= m; j++) A[r][j] -= k * A[c][j]; }
    }
    return A.map((row, i) => row[m] / row[i]);
  }

  /* ======================================================================
     1. 시계열 분해
     ====================================================================== */
  Lab.register({
    id: "ts-decompose", field: "ts", thumb: "wave",
    title: "시계열 분해 — 추세 · 계절성 · 잔차",
    desc: "추세와 계절성, 잡음을 섞어 시계열을 만들고 고전적 분해(이동평균)로 다시 나눠 봅니다.",
    tags: ["분해", "추세", "계절성", "이동평균"],
    note: "해볼 것: <b>레벨 이동</b>을 켜면 이동평균 추세가 계단을 부드럽게 뭉개고, 그 오차가 잔차에 남습니다. 잡음을 키우면 계절성 강도 F<sub>S</sub>가 떨어집니다. (강도 = 1 − Var(잔차) / Var(성분 + 잔차))",
    mount(S) {
      const st = { slope: 0.03, period: 12, amp: 2, noise: 0.6, shift: false, seed: 1 };
      const N = 192;
      let y = [], tr = [], se = [], re = [];
      function compute() {
        y = synth({ n: N, level: 5, slope: st.slope, curve: 0.5, period: st.period, amp: st.amp, noise: st.noise, shift: st.shift ? 4 : 0, seed: st.seed });
        tr = centeredMA(y, st.period);
        const det = y.map((v, t) => v - tr[t]), sums = new Array(st.period).fill(0), cnt = new Array(st.period).fill(0);
        det.forEach((v, t) => { if (isFinite(v)) { sums[t % st.period] += v; cnt[t % st.period]++; } });
        const avg = sums.map((s, k) => s / Math.max(1, cnt[k])), mu = VZ.mean(avg);
        se = y.map((_, t) => avg[t % st.period] - mu);
        re = y.map((v, t) => v - tr[t] - se[t]);
      }
      compute();
      const cv = S.canvas({ aspect: 0.86, minHeight: 420, maxHeight: 560 }, (ctx, w, h) => {
        const P = VZ.palette(), ph = h / 4;
        const rng = (a, pad = 0.1) => { const f = a.filter(isFinite), lo = Math.min(...f), hi = Math.max(...f), d = hi - lo || 1; return [lo - d * pad, hi + d * pad]; };
        const panels = [
          ["관측값 y와 추세", [{ data: pts(y), color: P.dim, width: 1.3 }, { data: pts(tr), color: P.accent, width: 2.4 }], rng(y)],
          ["추세 T (중심 이동평균)", [{ data: pts(tr), color: P.accent, width: 2.2 }], rng(tr)],
          [`계절성 S (주기 ${st.period})`, [{ data: pts(se), color: P.accent2, width: 1.8 }], rng(se)],
          ["잔차 R = y − T − S", [{ type: "bar", data: pts(re), color: VZ.alpha(P.warn, 0.8), barWidth: 0.7 }], rng(re)],
        ];
        panels.forEach(([title, series, yr], i) => VZ.chart(ctx, { x: 0, y: i * ph, w, h: ph }, { x: [0, N - 1], y: yr, title, series, margin: { b: i === 3 ? 22 : 16, t: 22 }, xFmt: i === 3 ? undefined : () => "" }));
      });
      const set = S.stats([{ k: "ft", label: "추세 강도 F_T" }, { k: "fs", label: "계절성 강도 F_S" }, { k: "rs", label: "잔차 표준편차" }]);
      function upd() {
        compute(); cv.redraw();
        const vr = variance(re);
        set("ft", Math.max(0, 1 - vr / variance(tr.map((v, t) => v + re[t]))).toFixed(2));
        set("fs", Math.max(0, 1 - vr / variance(se.map((v, t) => v + re[t]))).toFixed(2));
        set("rs", Math.sqrt(vr).toFixed(3));
      }
      S.range({ label: "추세 기울기", min: -0.05, max: 0.1, step: 0.005, value: st.slope, fmt: (v) => v.toFixed(3), onInput: (v) => { st.slope = v; upd(); } });
      S.range({ label: "계절 주기", min: 4, max: 32, step: 1, value: st.period, onInput: (v) => { st.period = v; upd(); } });
      S.range({ label: "계절 진폭", min: 0, max: 5, step: 0.1, value: st.amp, fmt: (v) => v.toFixed(1), onInput: (v) => { st.amp = v; upd(); } });
      S.range({ label: "잡음 σ", min: 0, max: 3, step: 0.05, value: st.noise, fmt: (v) => v.toFixed(2), onInput: (v) => { st.noise = v; upd(); } });
      S.check({ label: "레벨 이동 (구조 변화)", value: false, onChange: (v) => { st.shift = v; upd(); } });
      S.button("새 잡음", () => { st.seed++; upd(); }, { primary: true });
      upd();
    },
  });

  /* ======================================================================
     2. 자기상관 ACF / PACF
     ====================================================================== */
  Lab.register({
    id: "acf", field: "ts", thumb: "bars",
    title: "자기상관 — ACF와 PACF로 과정 알아보기",
    desc: "AR, MA, 계절 AR, 랜덤 워크 과정을 만들고 자기상관(ACF)과 편자기상관(PACF) 모양으로 모형 차수를 읽어 냅니다.",
    tags: ["ACF", "PACF", "ARIMA", "정상성"],
    note: "해볼 것: <b>AR(p)</b>는 PACF가 p 시차 뒤 뚝 끊기고 ACF는 서서히 줄어듭니다. <b>MA(q)</b>는 반대로 ACF가 q 시차 뒤 끊깁니다. <b>랜덤 워크</b>의 ACF는 거의 줄지 않는데, 이것이 비정상성의 신호입니다. 점선은 ±1.96/√n 유의 한계입니다.",
    mount(S) {
      const st = { proc: "ar1", p1: 0.7, p2: 0.2, th: 0.6, seed: 1 };
      const N = 300, K = 30;
      let y = [], r = [], pr = [];
      function gen() {
        const rnd = VZ.rng(st.seed), e = Array.from({ length: N + 60 }, () => VZ.randn(rnd));
        const x = new Array(N + 60).fill(0);
        for (let t = 13; t < N + 60; t++) {
          if (st.proc === "ar1") x[t] = st.p1 * x[t - 1] + e[t];
          else if (st.proc === "ar2") x[t] = st.p1 * x[t - 1] + st.p2 * x[t - 2] + e[t];
          else if (st.proc === "ma1") x[t] = e[t] + st.th * e[t - 1];
          else if (st.proc === "arma") x[t] = st.p1 * x[t - 1] + e[t] + st.th * e[t - 1];
          else if (st.proc === "sar") x[t] = st.p1 * x[t - 12] + e[t];
          else x[t] = x[t - 1] + e[t];
          if (!isFinite(x[t]) || Math.abs(x[t]) > 1e6) x[t] = Math.sign(x[t] || 1) * 1e6;
        }
        y = x.slice(60);
        r = acf(y, K); pr = pacf(r, K);
      }
      gen();
      const cv = S.canvas({ aspect: 0.72, minHeight: 380, maxHeight: 520 }, (ctx, w, h) => {
        const P = VZ.palette(), h1 = h * 0.38, band = 1.96 / Math.sqrt(N);
        const yr = [Math.min(...y), Math.max(...y)], pad = (yr[1] - yr[0]) * 0.08 || 1;
        VZ.chart(ctx, { x: 0, y: 0, w, h: h1 }, { x: [0, N - 1], y: [yr[0] - pad, yr[1] + pad], title: "시계열 (n = 300)", series: [{ data: pts(y), color: P.accent, width: 1.3 }], margin: { t: 22 } });
        const bars = (vals, title, box) => VZ.chart(ctx, box, {
          x: [-0.5, K + 0.5], y: [-1, 1], title, xLabel: "시차 k",
          series: [{ type: "bar", data: vals.map((v, k) => [k, v]).slice(title.startsWith("P") ? 1 : 0), color: P.accent2, barWidth: 0.5 }],
          hbands: [{ y0: -band, y1: band, color: VZ.alpha(P.accent, 0.1) }],
          hlines: [{ y: band, color: P.accent }, { y: -band, color: P.accent }, { y: 0, color: P.axis, dash: [] }],
          margin: { t: 22 },
        });
        bars(r, "ACF (자기상관)", { x: 0, y: h1, w: w / 2, h: h - h1 });
        bars(pr, "PACF (편자기상관)", { x: w / 2, y: h1, w: w / 2, h: h - h1 });
      });
      const set = S.stats([{ k: "r1", label: "ρ(1)" }, { k: "stat", label: "정상성" }, { k: "sig", label: "유의한 ACF 시차 수" }]);
      const show = (g, on) => (g.el.closest(".ctrl").style.display = on ? "" : "none");
      function upd() {
        gen(); cv.redraw();
        set("r1", r[1].toFixed(3));
        let ok = true;
        if (st.proc === "ar1" || st.proc === "arma" || st.proc === "sar") ok = Math.abs(st.p1) < 1;
        if (st.proc === "ar2") ok = st.p1 + st.p2 < 1 && st.p2 - st.p1 < 1 && Math.abs(st.p2) < 1;
        if (st.proc === "rw") ok = false;
        set("stat", ok ? '<span style="color:var(--ok)">정상</span>' : '<span style="color:var(--bad)">비정상</span>');
        set("sig", r.slice(1).filter((v) => Math.abs(v) > 1.96 / Math.sqrt(N)).length);
        show(p1, st.proc !== "ma1" && st.proc !== "rw"); show(p2, st.proc === "ar2"); show(th, st.proc === "ma1" || st.proc === "arma");
      }
      S.select({ label: "과정", options: [["ar1", "AR(1)"], ["ar2", "AR(2)"], ["ma1", "MA(1)"], ["arma", "ARMA(1,1)"], ["sar", "계절 AR (시차 12)"], ["rw", "랜덤 워크"]], value: st.proc, onChange: (v) => { st.proc = v; upd(); } });
      const p1 = S.range({ label: "φ₁ (또는 Φ)", min: -0.99, max: 0.99, step: 0.01, value: st.p1, fmt: (v) => v.toFixed(2), onInput: (v) => { st.p1 = v; upd(); } });
      const p2 = S.range({ label: "φ₂", min: -0.99, max: 0.99, step: 0.01, value: st.p2, fmt: (v) => v.toFixed(2), onInput: (v) => { st.p2 = v; upd(); } });
      const th = S.range({ label: "θ (MA)", min: -0.99, max: 0.99, step: 0.01, value: st.th, fmt: (v) => v.toFixed(2), onInput: (v) => { st.th = v; upd(); } });
      S.button("새 표본", () => { st.seed++; upd(); }, { primary: true });
      upd();
    },
  });

  /* ======================================================================
     3. 푸리에 스펙트럼과 저역 통과 필터
     ====================================================================== */
  function fft(re, im, inv) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (TAU / len) * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let j = 0; j < len / 2; j++) {
          const a = i + j, b = a + len / 2, vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
  Lab.register({
    id: "fft", field: "ts", thumb: "bars",
    title: "푸리에 스펙트럼 — 주파수로 보는 시계열",
    desc: "세 개의 사인파와 잡음을 섞은 신호를 FFT로 분해하고, 차단 주파수 위를 지워 잡음을 걷어 냅니다.",
    tags: ["FFT", "스펙트럼", "필터", "주파수"],
    note: "해볼 것: 주파수를 정수가 아닌 값(예: 10.5 Hz)으로 두면 에너지가 이웃 칸으로 번지는 <b>스펙트럼 누설</b>이 생깁니다. 한 창(Hann)을 켜면 누설이 줄어듭니다. 신호 주파수가 나이퀴스트(64 Hz)에 가까워지면 시간 영역 모양이 어떻게 보이는지도 확인해 보세요.",
    mount(S) {
      const N = 256, FS = 128;
      const st = { f: [5, 18, 40], a: [1.5, 0.8, 0.4], noise: 0.5, cut: 25, hann: false, seed: 1 };
      let x = [], xf = [], mag = [], kept = 0;
      function compute() {
        const r = VZ.rng(st.seed);
        x = Array.from({ length: N }, (_, n) => st.f.reduce((s, f, k) => s + st.a[k] * Math.sin((TAU * f * n) / FS), 0) + VZ.randn(r) * st.noise);
        const w = (n) => (st.hann ? 0.5 - 0.5 * Math.cos((TAU * n) / (N - 1)) : 1);
        const re = x.map((v, n) => v * w(n)), im = new Array(N).fill(0);
        fft(re, im, false);
        mag = Array.from({ length: N / 2 + 1 }, (_, k) => (Math.hypot(re[k], im[k]) * (k === 0 || k === N / 2 ? 1 : 2)) / N);
        const re2 = x.slice(), im2 = new Array(N).fill(0);
        fft(re2, im2, false);
        let eAll = 0, eKeep = 0;
        for (let k = 0; k < N; k++) {
          const fk = (Math.min(k, N - k) * FS) / N, e = re2[k] ** 2 + im2[k] ** 2;
          eAll += e;
          if (fk > st.cut) { re2[k] = 0; im2[k] = 0; } else eKeep += e;
        }
        kept = eKeep / eAll;
        fft(re2, im2, true);
        xf = re2;
      }
      compute();
      const cvT = S.canvas({ aspect: 0.36, minHeight: 190, maxHeight: 280 }, (ctx) => {
        const P = VZ.palette(), lim = Math.max(...x.map(Math.abs)) * 1.1;
        VZ.chart(ctx, null, { x: [0, N / FS], y: [-lim, lim], xLabel: "시간 (초)", title: "시간 영역 — 회색: 원신호, 색: 필터 통과", series: [{ data: x.map((v, n) => [n / FS, v]), color: VZ.alpha(P.dim, 0.55), width: 1.2 }, { data: xf.map((v, n) => [n / FS, v]), color: P.accent, width: 2.2 }] });
      });
      const cvF = S.canvas({ aspect: 0.32, minHeight: 170, maxHeight: 240 }, (ctx) => {
        const P = VZ.palette();
        VZ.chart(ctx, null, {
          x: [0, FS / 2], y: [0, Math.max(0.5, ...mag) * 1.15], xLabel: "주파수 (Hz)", title: "진폭 스펙트럼 |X(f)|",
          series: [{ type: "bar", data: mag.map((m, k) => [(k * FS) / N, m]), color: P.accent2, barWidth: (FS / N) * 0.7 }],
          bands: [{ x0: st.cut, x1: FS / 2, color: VZ.alpha(P.dim, 0.12) }],
          vlines: [{ x: st.cut, color: P.accent, dash: [], label: "차단 " + st.cut + " Hz" }],
        });
      });
      const set = S.stats([{ k: "dom", label: "가장 센 주파수" }, { k: "res", label: "주파수 해상도" }, { k: "keep", label: "남긴 에너지" }]);
      function upd() {
        compute(); cvT.redraw(); cvF.redraw();
        const k = mag.indexOf(Math.max(...mag.slice(1)));
        set("dom", ((k * FS) / N).toFixed(1) + "<small>Hz</small>");
        set("res", (FS / N).toFixed(2) + "<small>Hz</small>");
        set("keep", (kept * 100).toFixed(1) + "<small>%</small>");
      }
      [0, 1, 2].forEach((i) => {
        S.range({ label: `성분 ${i + 1} 주파수`, min: 0.5, max: 63, step: 0.5, value: st.f[i], fmt: (v) => v.toFixed(1) + " Hz", onInput: (v) => { st.f[i] = v; upd(); } });
        S.range({ label: `성분 ${i + 1} 진폭`, min: 0, max: 2, step: 0.05, value: st.a[i], fmt: (v) => v.toFixed(2), onInput: (v) => { st.a[i] = v; upd(); } });
      });
      S.range({ label: "잡음 σ", min: 0, max: 2, step: 0.05, value: st.noise, fmt: (v) => v.toFixed(2), onInput: (v) => { st.noise = v; upd(); } });
      S.range({ label: "저역 통과 차단 주파수", min: 1, max: 64, step: 0.5, value: st.cut, fmt: (v) => v + " Hz", onInput: (v) => { st.cut = v; upd(); } });
      S.check({ label: "한 창(Hann window) 적용", value: false, onChange: (v) => { st.hann = v; upd(); } });
      upd();
    },
  });

  /* ======================================================================
     4. 슬라이딩 윈도우 데이터셋
     ====================================================================== */
  Lab.register({
    id: "windowing", field: "ts", thumb: "windows",
    title: "슬라이딩 윈도우 — 시계열을 (입력, 정답) 쌍으로",
    desc: "룩백 L, 예측 구간 H, 보폭 s로 하나의 긴 시계열을 지도학습 샘플로 자르는 과정을 봅니다.",
    tags: ["데이터셋", "룩백", "예측 구간", "데이터 누수"],
    note: "해볼 것: 시간 순 분할을 켜면 검증·테스트 구간과 겹치는 창이 회색으로 버려집니다. 무작위로 섞어 나누면 미래 값이 학습 입력에 섞이는 <b>데이터 누수</b>가 생기기 때문입니다. 보폭을 줄이면 샘플은 늘지만 서로 많이 겹칩니다.",
    mount(S) {
      const st = { L: 24, H: 8, s: 4, split: true, k: 0, playing: true };
      const N = 120;
      const y = synth({ n: N, level: 0, slope: 0.02, period: 20, amp: 1.2, noise: 0.25, seed: 7 });
      const nS = () => Math.max(0, Math.floor((N - st.L - st.H) / st.s) + 1);
      const trainEnd = Math.floor(N * 0.7), valEnd = Math.floor(N * 0.85);
      const role = (i) => {
        if (!st.split) return "train";
        const a = i * st.s, e = a + st.L + st.H;
        if (e <= trainEnd) return "train";
        if (a >= trainEnd && e <= valEnd) return "val";
        if (a >= valEnd) return "test";
        return "drop";
      };
      const cv = S.canvas({ aspect: 0.33, minHeight: 170, maxHeight: 260 }, (ctx) => {
        const P = VZ.palette(), a = st.k * st.s;
        VZ.chart(ctx, null, {
          x: [0, N - 1], y: [Math.min(...y) - 0.4, Math.max(...y) + 0.4], xLabel: "시간 t", title: `샘플 #${st.k + 1}: 입력 [${a}, ${a + st.L}) → 정답 [${a + st.L}, ${a + st.L + st.H})`,
          bands: [{ x0: a, x1: a + st.L, color: VZ.alpha(P.accent, 0.18) }, { x0: a + st.L, x1: a + st.L + st.H, color: VZ.alpha(P.accent2, 0.25) }].concat(st.split ? [{ x0: trainEnd, x1: valEnd, color: VZ.alpha(P.warn, 0.07) }, { x0: valEnd, x1: N, color: VZ.alpha(P.bad, 0.07) }] : []),
          series: [{ data: pts(y), color: P.dim, width: 1.4 }, { data: pts(y.slice(a, a + st.L), a), color: P.accent, width: 2.8 }, { data: pts(y.slice(a + st.L, a + st.L + st.H), a + st.L), color: P.accent2, width: 2.8 }],
          vlines: st.split ? [{ x: trainEnd, color: P.warn, label: "검증" }, { x: valEnd, color: P.bad, label: "테스트" }] : [],
        });
      });
      const cvM = S.canvas({ aspect: 0.4, minHeight: 200, maxHeight: 320 }, (ctx, w, h) => {
        const P = VZ.palette(), n = nS(), m = { l: 44, r: 12, t: 22, b: 10 }, pw = w - m.l - m.r, ph = h - m.t - m.b;
        const rh = Math.min(10, ph / Math.max(1, n)), cw = pw / N;
        ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`샘플 행렬 — ${n}개 행 (파랑: 입력 X, 분홍: 정답 y)`, m.l, 2);
        for (let i = 0; i < n; i++) {
          const a = i * st.s, yy = m.t + i * rh, rl = role(i);
          const alpha = rl === "drop" ? 0.12 : 1;
          ctx.globalAlpha = alpha * (i === st.k ? 1 : 0.75);
          ctx.fillStyle = P.accent; ctx.fillRect(m.l + a * cw, yy, st.L * cw, Math.max(1, rh - 1));
          ctx.fillStyle = P.accent2; ctx.fillRect(m.l + (a + st.L) * cw, yy, st.H * cw, Math.max(1, rh - 1));
          ctx.globalAlpha = 1;
          if (st.split && rl !== "train") { ctx.fillStyle = rl === "val" ? P.warn : rl === "test" ? P.bad : P.faint; ctx.fillRect(m.l - 8, yy, 5, Math.max(1, rh - 1)); }
        }
        if (n) { ctx.strokeStyle = P.text; ctx.lineWidth = 1.5; ctx.strokeRect(m.l + st.k * st.s * cw - 1, m.t + st.k * rh - 1, (st.L + st.H) * cw + 2, rh + 1); }
      });
      const set = S.stats([{ k: "n", label: "샘플 수" }, { k: "x", label: "X 모양" }, { k: "y", label: "y 모양" }, { k: "ov", label: "점 하나가 쓰이는 횟수" }]);
      function upd() {
        st.k = Math.min(st.k, Math.max(0, nS() - 1));
        cv.redraw(); cvM.redraw();
        const n = nS(), roles = Array.from({ length: n }, (_, i) => role(i)), tr = roles.filter((r) => r === "train").length;
        set("n", st.split ? `${tr} / ${roles.filter((r) => r === "val").length} / ${roles.filter((r) => r === "test").length}` : n);
        set("x", `(${n}, ${st.L})`); set("y", `(${n}, ${st.H})`);
        set("ov", "≈ " + ((st.L + st.H) / st.s).toFixed(1));
      }
      S.range({ label: "룩백 L", min: 4, max: 48, step: 1, value: st.L, onInput: (v) => { st.L = v; upd(); } });
      S.range({ label: "예측 구간 H", min: 1, max: 24, step: 1, value: st.H, onInput: (v) => { st.H = v; upd(); } });
      S.range({ label: "보폭 s", min: 1, max: 12, step: 1, value: st.s, onInput: (v) => { st.s = v; upd(); } });
      S.check({ label: "시간 순 학습/검증/테스트 분할 (70/15/15)", value: true, onChange: (v) => { st.split = v; upd(); } });
      const pb = S.button("일시정지", () => { st.playing = !st.playing; pb.textContent = st.playing ? "일시정지" : "재생"; }, { primary: true });
      let acc = 0;
      S.loop((dt) => { if (!st.playing) return; acc += dt; if (acc > 0.35) { acc = 0; st.k = (st.k + 1) % Math.max(1, nS()); upd(); } });
      upd();
    },
  });

  /* ======================================================================
     5. 패칭 (PatchTST 스타일 토큰화)
     ====================================================================== */
  Lab.register({
    id: "patching", field: "ts", thumb: "windows",
    title: "패칭 — 시계열을 트랜스포머 토큰으로",
    desc: "길이 336의 입력을 길이 P, 보폭 S의 패치로 잘라 토큰으로 만듭니다. 토큰 수와 어텐션 비용이 어떻게 줄어드는지 봅니다.",
    tags: ["PatchTST", "토큰화", "Transformer", "어텐션 비용"],
    note: "점 하나를 토큰 하나로 쓰면 336개 토큰 → 어텐션 비용 336² ≈ 11만. 패치 길이 16, 보폭 8이면 41개 토큰 → 약 1,700으로 줄어듭니다. 각 패치는 국소적인 모양(기울기, 굴곡)을 한 토큰에 담습니다.",
    mount(S) {
      const st = { P: 16, S: 8 };
      const L = 336;
      const y = synth({ n: L, level: 0, slope: 0.004, period: 24, amp: 1, noise: 0.3, seed: 3 }).map((v, t) => v + 0.6 * Math.sin((TAU * t) / 168));
      const nT = () => Math.floor((L - st.P) / st.S) + 1;
      const cv = S.canvas({ aspect: 0.3, minHeight: 170, maxHeight: 250 }, (ctx) => {
        const P = VZ.palette(), n = nT();
        const bands = Array.from({ length: n }, (_, i) => ({ x0: i * st.S, x1: i * st.S + st.P, color: VZ.alpha(i % 2 ? P.accent2 : P.accent, 0.13) }));
        VZ.chart(ctx, null, { x: [0, L], y: [Math.min(...y) - 0.3, Math.max(...y) + 0.3], xLabel: "시간", title: `입력 길이 ${L} → 패치 ${n}개`, series: [{ data: pts(y), color: P.text, width: 1.3 }], bands });
      });
      const cvM = S.canvas({ aspect: 0.38, minHeight: 180, maxHeight: 300 }, (ctx, w, h) => {
        const P = VZ.palette(), n = nT(), m = { l: 40, r: 120, t: 24, b: 10 };
        const lo = Math.min(...y), hi = Math.max(...y);
        const pw = w - m.l - m.r, ph = h - m.t - m.b;
        VZ.field(ctx, m.l, m.t, pw, ph, st.P, n, (i, j) => (y[j * st.S + i] - lo) / (hi - lo), (v) => VZ.viridis(v), false);
        ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`토큰 행렬 (${n} × ${st.P}) — 행 하나가 토큰 하나`, m.l, 4);
        ctx.font = VZ.font(10.5); ctx.fillStyle = P.dim; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        [0, n - 1].forEach((j) => ctx.fillText("#" + (j + 1), m.l - 6, m.t + ((j + 0.5) / n) * ph));
        // 어텐션 비용 비교 막대
        const bx = w - m.r + 20, bw = 26, full = L * L, cost = n * n, bh = ph;
        ctx.fillStyle = VZ.alpha(P.dim, 0.25); ctx.fillRect(bx, m.t, bw, bh);
        ctx.fillStyle = P.accent; const hh = Math.max(2, (cost / full) * bh); ctx.fillRect(bx + bw + 14, m.t + bh - hh, bw, hh);
        ctx.fillStyle = P.dim; ctx.font = VZ.font(10.5, false); ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText("점 단위", bx + bw / 2, m.t + bh + 2 > h - 12 ? m.t - 14 : m.t + bh + 2);
        ctx.fillText("패치", bx + bw * 1.5 + 14, m.t - 14);
      });
      const set = S.stats([{ k: "n", label: "토큰 수 N" }, { k: "c", label: "어텐션 비용 N²" }, { k: "r", label: "점 단위 대비" }, { k: "ov", label: "패치 겹침" }]);
      function upd() {
        st.S = Math.min(st.S, st.P); sS.set(st.S, false);
        cv.redraw(); cvM.redraw();
        const n = nT();
        set("n", n); set("c", (n * n).toLocaleString()); set("r", ((n * n) / (L * L) * 100).toFixed(2) + "<small>%</small>"); set("ov", Math.max(0, ((st.P - st.S) / st.P) * 100).toFixed(0) + "<small>%</small>");
      }
      S.range({ label: "패치 길이 P", min: 2, max: 64, step: 1, value: st.P, onInput: (v) => { st.P = v; upd(); } });
      const sS = S.range({ label: "보폭 S (≤ P)", min: 1, max: 64, step: 1, value: st.S, onInput: (v) => { st.S = v; upd(); } });
      upd();
    },
  });

  /* ======================================================================
     6. 예측 모형 비교
     ====================================================================== */
  Lab.register({
    id: "forecast", field: "ts", thumb: "windows",
    title: "예측 기준선 — 나이브부터 홀트-윈터스, AR까지",
    desc: "같은 시계열에 여러 고전 예측 모형을 맞추고 보류 구간에서 오차를 비교합니다. 딥러닝 모형이 넘어야 할 기준선입니다.",
    tags: ["예측", "지수평활", "AR", "기준선", "MAE"],
    note: "해볼 것: 계절성이 뚜렷한 데이터에서 <b>계절 나이브</b>가 의외로 강하다는 점을 확인해 보세요. 딥러닝 논문을 읽을 때 기준선이 적절했는지 따져 보는 습관이 중요합니다. 음영은 95% 예측 구간(근사)입니다.",
    mount(S) {
      const m = 12, N = 144;
      const st = { model: "hw", H: 24, alpha: 0.3, beta: 0.05, gamma: 0.2, p: 13, noise: 0.8, seed: 2 };
      let y = [], fc = null;
      const MODELS = { naive: "나이브", snaive: "계절 나이브", mean: "평균", drift: "드리프트", ses: "단순 지수평활", holt: "홀트 (추세)", hw: "홀트-윈터스 (가법)", ar: "AR(p)" };
      function gen() {
        const r = VZ.rng(st.seed); let e = 0;
        y = Array.from({ length: N }, (_, t) => { e = 0.5 * e + VZ.randn(r) * st.noise; return 20 + 0.08 * t + 3 * Math.sin((TAU * t) / m) + 1.2 * Math.cos((TAU * 2 * t) / m) + e; });
      }
      /** 모형별 [예측, 구간 반폭 배열 | null, 한 단계 잔차 σ] */
      function predict(model, tr, H) {
        const T = tr.length, last = tr[T - 1];
        const sd = (res) => Math.sqrt(res.filter(isFinite).reduce((s, v) => s + v * v, 0) / Math.max(1, res.filter(isFinite).length));
        const hs = Array.from({ length: H }, (_, h) => h + 1);
        if (model === "naive") { const s = sd(tr.slice(1).map((v, t) => v - tr[t])); return [hs.map(() => last), hs.map((h) => 1.96 * s * Math.sqrt(h))]; }
        if (model === "snaive") { const s = sd(tr.slice(m).map((v, t) => v - tr[t])); return [hs.map((h) => tr[T - m + ((h - 1) % m)]), hs.map((h) => 1.96 * s * Math.sqrt(Math.floor((h - 1) / m) + 1))]; }
        if (model === "mean") { const mu = VZ.mean(tr), s = VZ.std(tr); return [hs.map(() => mu), hs.map(() => 1.96 * s * Math.sqrt(1 + 1 / T))]; }
        if (model === "drift") { const b = (last - tr[0]) / (T - 1), s = sd(tr.slice(1).map((v, t) => v - tr[t] - b)); return [hs.map((h) => last + h * b), hs.map((h) => 1.96 * s * Math.sqrt(h * (1 + h / T)))]; }
        if (model === "ses") {
          let l = tr[0]; const res = [];
          tr.forEach((v) => { res.push(v - l); l = st.alpha * v + (1 - st.alpha) * l; });
          const s = sd(res.slice(1)); return [hs.map(() => l), hs.map((h) => 1.96 * s * Math.sqrt(1 + (h - 1) * st.alpha ** 2))];
        }
        if (model === "holt") {
          let l = tr[0], b = tr[1] - tr[0];
          tr.forEach((v) => { const lp = l; l = st.alpha * v + (1 - st.alpha) * (l + b); b = st.beta * (l - lp) + (1 - st.beta) * b; });
          return [hs.map((h) => l + h * b), null];
        }
        if (model === "hw") {
          let l = VZ.mean(tr.slice(0, m)), b = (VZ.mean(tr.slice(m, 2 * m)) - l) / m;
          const s = tr.slice(0, m).map((v) => v - l);
          for (let t = 0; t < T; t++) {
            const v = tr[t], sp = s[t % m], lp = l;
            l = st.alpha * (v - sp) + (1 - st.alpha) * (l + b);
            b = st.beta * (l - lp) + (1 - st.beta) * b;
            s[t % m] = st.gamma * (v - l) + (1 - st.gamma) * sp;
          }
          return [hs.map((h) => l + h * b + s[(T + h - 1) % m]), null];
        }
        // AR(p) + 절편, 최소제곱
        const p = st.p, X = [], Y = [];
        for (let t = p; t < T; t++) { X.push([1, ...Array.from({ length: p }, (_, i) => tr[t - 1 - i])]); Y.push(tr[t]); }
        const w = ols(X, Y), s = sd(Y.map((v, i) => v - X[i].reduce((a, x, j) => a + x * w[j], 0)));
        const hist = tr.slice(), out = [];
        for (let h = 0; h < H; h++) { const v = w[0] + w.slice(1).reduce((a, c, i) => a + c * hist[hist.length - 1 - i], 0); out.push(v); hist.push(v); }
        const psi = [1];
        for (let j = 1; j < H; j++) psi[j] = w.slice(1).reduce((a, c, i) => a + (j - 1 - i >= 0 ? c * psi[j - 1 - i] : 0), 0);
        let cum = 0; const half = psi.map((q) => { cum += q * q; return 1.96 * s * Math.sqrt(cum); });
        return [out, half];
      }
      const err = (f, te) => {
        const e = te.map((v, i) => f[i] - v);
        return { mae: VZ.mean(e.map(Math.abs)), rmse: Math.sqrt(VZ.mean(e.map((v) => v * v))), mape: VZ.mean(e.map((v, i) => Math.abs(v / te[i]))) * 100 };
      };
      let all = [];
      function compute() {
        const tr = y.slice(0, N - st.H), te = y.slice(N - st.H);
        fc = predict(st.model, tr, st.H);
        all = Object.keys(MODELS).map((k) => [k, err(predict(k, tr, st.H)[0], te).mae]);
      }
      gen(); compute();
      const cv = S.canvas({ aspect: 0.45, minHeight: 230, maxHeight: 340 }, (ctx) => {
        const P = VZ.palette(), T0 = N - st.H;
        const lo = Math.min(...y, ...fc[0].map((v, i) => v - (fc[1] ? fc[1][i] : 0))) - 1, hi = Math.max(...y, ...fc[0].map((v, i) => v + (fc[1] ? fc[1][i] : 0))) + 1;
        const C = VZ.chart(ctx, null, {
          x: [0, N - 1], y: [lo, hi], xLabel: "시간", title: MODELS[st.model] + " 예측",
          bands: [{ x0: T0 - 0.5, x1: N, color: VZ.alpha(P.accent2, 0.06) }],
          series: [{ data: pts(y.slice(0, T0)), color: P.dim, width: 1.5 }, { data: pts(y.slice(T0 - 1), T0 - 1), color: P.dim, width: 1.5, dash: [3, 3] }, { data: pts([y[T0 - 1], ...fc[0]], T0 - 1), color: P.accent, width: 2.6 }],
          vlines: [{ x: T0 - 0.5, color: P.accent2, label: "예측 시작" }],
        });
        if (fc[1]) {
          ctx.fillStyle = VZ.alpha(P.accent, 0.15); ctx.beginPath();
          fc[0].forEach((v, i) => { const x = C.X(T0 + i), yy = C.Y(v + fc[1][i]); i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); });
          for (let i = fc[0].length - 1; i >= 0; i--) ctx.lineTo(C.X(T0 + i), C.Y(fc[0][i] - fc[1][i]));
          ctx.closePath(); ctx.fill();
        }
      });
      const cvB = S.canvas({ height: 170 }, (ctx, w, h) => {
        const P = VZ.palette(), mx = Math.max(...all.map((a) => a[1])) * 1.15, n = all.length, ml = 120, bh = (h - 24) / n;
        ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("보류 구간 MAE (짧을수록 좋음)", 8, 2);
        const best = Math.min(...all.map((a) => a[1]));
        all.forEach(([k, v], i) => {
          const yy = 20 + i * bh;
          ctx.fillStyle = k === st.model ? P.text : P.dim; ctx.font = VZ.font(11.5, false, k === st.model ? 700 : 400); ctx.textAlign = "right"; ctx.textBaseline = "middle";
          ctx.fillText(MODELS[k], ml - 8, yy + bh / 2);
          ctx.fillStyle = k === st.model ? P.accent : VZ.alpha(P.dim, 0.4);
          const bw = ((w - ml - 60) * v) / mx; ctx.fillRect(ml, yy + bh * 0.18, bw, bh * 0.64);
          ctx.fillStyle = P.text; ctx.font = VZ.font(10.5, true); ctx.textAlign = "left"; ctx.fillText(v.toFixed(2) + (v === best ? " ★" : ""), ml + bw + 6, yy + bh / 2);
        });
      });
      const set = S.stats([{ k: "mae", label: "MAE" }, { k: "rmse", label: "RMSE" }, { k: "mape", label: "MAPE" }]);
      const show = (g, on) => (g.el.closest(".ctrl").style.display = on ? "" : "none");
      function upd() {
        compute(); cv.redraw(); cvB.redraw();
        const e = err(fc[0], y.slice(N - st.H));
        set("mae", e.mae.toFixed(3)); set("rmse", e.rmse.toFixed(3)); set("mape", e.mape.toFixed(2) + "<small>%</small>");
        show(sa, ["ses", "holt", "hw"].includes(st.model)); show(sb, ["holt", "hw"].includes(st.model)); show(sg, st.model === "hw"); show(sp, st.model === "ar");
      }
      S.select({ label: "모형", options: Object.entries(MODELS), value: st.model, onChange: (v) => { st.model = v; upd(); } });
      S.range({ label: "예측 구간 H", min: 6, max: 36, step: 1, value: st.H, onInput: (v) => { st.H = v; upd(); } });
      const sa = S.range({ label: "α (수준)", min: 0.01, max: 1, step: 0.01, value: st.alpha, fmt: (v) => v.toFixed(2), onInput: (v) => { st.alpha = v; upd(); } });
      const sb = S.range({ label: "β (추세)", min: 0, max: 0.5, step: 0.01, value: st.beta, fmt: (v) => v.toFixed(2), onInput: (v) => { st.beta = v; upd(); } });
      const sg = S.range({ label: "γ (계절)", min: 0, max: 0.9, step: 0.01, value: st.gamma, fmt: (v) => v.toFixed(2), onInput: (v) => { st.gamma = v; upd(); } });
      const sp = S.range({ label: "AR 차수 p", min: 1, max: 30, step: 1, value: st.p, onInput: (v) => { st.p = v; upd(); } });
      S.range({ label: "잡음 크기", min: 0, max: 3, step: 0.05, value: st.noise, fmt: (v) => v.toFixed(2), onInput: (v) => { st.noise = v; gen(); upd(); } });
      S.button("새 데이터", () => { st.seed++; gen(); upd(); }, { primary: true });
      upd();
    },
  });

  /* ======================================================================
     7. RNN vs LSTM 기억
     ====================================================================== */
  Lab.register({
    id: "rnn-memory", field: "ts", thumb: "curve",
    title: "RNN은 얼마나 오래 기억할까 — 기울기 소실",
    desc: "t=0에 들어온 입력 하나가 이후 은닉 상태에 미치는 영향 ∂hₜ/∂x₀을 단순 RNN과 LSTM 셀 상태에서 비교합니다.",
    tags: ["RNN", "LSTM", "기울기 소실", "BPTT"],
    note: "단순 RNN의 민감도는 매 단계 w·tanh′(·)를 곱하므로 |w|&lt;1이면 지수적으로 사라지고, 선형 RNN에서 |w|&gt;1이면 폭발합니다. LSTM의 셀 상태는 망각 게이트 f를 곱할 뿐이라 f≈1이면 오래 보존됩니다(‘상수 오차 회전목마’).",
    mount(S) {
      const st = { w: 0.9, f: 0.97, T: 80, linear: false, noise: false };
      let rnn = [], lstm = [], gR = [], gL = [];
      function compute() {
        const r = VZ.rng(5), x = Array.from({ length: st.T }, (_, t) => (t === 0 ? 1 : st.noise ? VZ.randn(r) * 0.3 : 0));
        let h = 0, c = 0, gr = 1, gl = 1;
        rnn = []; lstm = []; gR = []; gL = [];
        for (let t = 0; t < st.T; t++) {
          const a = st.w * h + x[t];
          h = st.linear ? a : Math.tanh(a);
          const dh = st.linear ? 1 : 1 - h * h;
          gr = t === 0 ? dh : gr * st.w * dh;
          const g = Math.tanh(x[t]);
          c = st.f * c + g;
          gl = t === 0 ? 1 - g * g : gl * st.f;
          rnn.push(h); lstm.push(c); gR.push(Math.abs(gr)); gL.push(Math.abs(gl));
        }
      }
      compute();
      const cvH = S.canvas({ aspect: 0.32, minHeight: 170, maxHeight: 240 }, (ctx) => {
        const P = VZ.palette(), lim = Math.max(1, ...rnn.map(Math.abs), ...lstm.map(Math.abs)) * 1.1;
        VZ.chart(ctx, null, { x: [0, st.T - 1], y: [-Math.min(lim, 50), Math.min(lim, 50)], title: "상태 값: RNN hₜ (색), LSTM cₜ (점선)", series: [{ data: pts(rnn), color: P.accent, width: 2.2 }, { data: pts(lstm), color: P.accent2, width: 2.2, dash: [6, 4] }] });
      });
      const cvG = S.canvas({ aspect: 0.4, minHeight: 200, maxHeight: 300 }, (ctx) => {
        const P = VZ.palette(), vals = gR.concat(gL).filter((v) => v > 0);
        const hi = Math.max(10, ...vals) * 2;
        VZ.chart(ctx, null, {
          x: [0, st.T - 1], y: [1e-8, Math.min(hi, 1e12)], logY: true, xLabel: "시간 단계 t", yLabel: "|∂상태ₜ/∂x₀|", title: "입력 x₀에 대한 민감도 (로그 축)",
          series: [{ data: gR.map((v, t) => [t, Math.max(v, 1e-30)]), color: P.accent, width: 2.4 }, { data: gL.map((v, t) => [t, Math.max(v, 1e-30)]), color: P.accent2, width: 2.4, dash: [6, 4] }],
          hlines: [{ y: 0.01, color: P.faint, label: "0.01 (기억 한계)" }],
        });
      });
      S.legend([{ label: "단순 RNN", color: (P) => P.accent }, { label: "LSTM 셀 상태", color: (P) => P.accent2, dash: true }]);
      const set = S.stats([{ k: "r", label: "RNN 기억 길이" }, { k: "l", label: "LSTM 기억 길이" }, { k: "g", label: "t=40 기울기 비 (LSTM/RNN)" }]);
      const memLen = (g) => { let k = 0; g.forEach((v, t) => { if (v > 0.01) k = t; }); return k >= st.T - 1 ? st.T + "+" : k; };
      function upd() {
        compute(); cvH.redraw(); cvG.redraw();
        set("r", memLen(gR) + "<small>단계</small>"); set("l", memLen(gL) + "<small>단계</small>");
        const t = Math.min(40, st.T - 1); set("g", VZ.fmt(gL[t] / Math.max(gR[t], 1e-300), 3));
      }
      S.range({ label: "RNN 순환 가중치 w", min: 0.3, max: 1.6, step: 0.01, value: st.w, fmt: (v) => v.toFixed(2), onInput: (v) => { st.w = v; upd(); } });
      S.range({ label: "LSTM 망각 게이트 f", min: 0.5, max: 1, step: 0.005, value: st.f, fmt: (v) => v.toFixed(3), onInput: (v) => { st.f = v; upd(); } });
      S.range({ label: "시퀀스 길이", min: 20, max: 200, step: 5, value: st.T, onInput: (v) => { st.T = v; upd(); } });
      S.check({ label: "선형 RNN (tanh 끄기) — 폭발 보기", value: false, onChange: (v) => { st.linear = v; upd(); } });
      S.check({ label: "이후 입력에 잡음 섞기", value: false, onChange: (v) => { st.noise = v; upd(); } });
      upd();
    },
  });

  /* ======================================================================
     8. TCN 수용 영역
     ====================================================================== */
  Lab.register({
    id: "tcn-receptive", field: "ts", thumb: "network",
    title: "팽창 인과 합성곱 — 수용 영역이 지수적으로 넓어지는 법",
    desc: "WaveNet·TCN의 핵심인 팽창(dilated) 인과 합성곱에서 출력 하나가 과거 몇 칸을 보는지 그래프로 확인합니다.",
    tags: ["TCN", "WaveNet", "합성곱", "수용 영역"],
    note: "해볼 것: 맨 위 줄의 점을 클릭해 다른 출력을 고르세요. 팽창을 켜면 층마다 간격이 1, 2, 4, 8…로 두 배가 되어 층 수에 대해 수용 영역이 지수적으로 커집니다. 모든 연결이 왼쪽(과거)으로만 향하는 것이 '인과' 조건입니다.",
    mount(S) {
      const st = { L: 4, k: 2, dil: true, sel: null };
      const dil = (l) => (st.dil ? Math.pow(2, l) : 1);
      const rf = () => 1 + (st.k - 1) * Array.from({ length: st.L }, (_, l) => dil(l)).reduce((a, b) => a + b, 0);
      const nT = () => Math.min(64, Math.max(16, rf() + 6));
      let hit = null;
      const cv = S.canvas({ aspect: 0.48, minHeight: 240, maxHeight: 400 }, (ctx, w, h) => {
        const P = VZ.palette(), T = nT(), m = { l: 70, r: 14, t: 18, b: 24 };
        const X = (t) => m.l + ((t + 0.5) / T) * (w - m.l - m.r), Y = (l) => h - m.b - (l / st.L) * (h - m.t - m.b);
        const sel = st.sel == null || st.sel >= T ? T - 1 : st.sel;
        const active = Array.from({ length: st.L + 1 }, () => new Set());
        active[st.L].add(sel);
        const edges = [];
        for (let l = st.L; l > 0; l--) active[l].forEach((t) => { for (let j = 0; j < st.k; j++) { const s = t - j * dil(l - 1); if (s >= 0) { active[l - 1].add(s); edges.push([l, t, s]); } } });
        // 흐린 전체 연결
        ctx.strokeStyle = VZ.alpha(P.dim, 0.08); ctx.lineWidth = 1;
        for (let l = st.L; l > 0; l--) for (let t = 0; t < T; t++) for (let j = 0; j < st.k; j++) { const s = t - j * dil(l - 1); if (s >= 0) { ctx.beginPath(); ctx.moveTo(X(t), Y(l)); ctx.lineTo(X(s), Y(l - 1)); ctx.stroke(); } }
        ctx.strokeStyle = VZ.alpha(P.accent, 0.85); ctx.lineWidth = 2;
        edges.forEach(([l, t, s]) => { ctx.beginPath(); ctx.moveTo(X(t), Y(l)); ctx.lineTo(X(s), Y(l - 1)); ctx.stroke(); });
        for (let l = 0; l <= st.L; l++) {
          ctx.fillStyle = P.dim; ctx.font = VZ.font(11, false); ctx.textAlign = "right"; ctx.textBaseline = "middle";
          ctx.fillText(l === 0 ? "입력" : l === st.L ? `출력 (d=${dil(l - 1)})` : `층 ${l} (d=${dil(l - 1)})`, m.l - 10, Y(l));
          for (let t = 0; t < T; t++) {
            const on = active[l].has(t);
            ctx.beginPath(); ctx.arc(X(t), Y(l), on ? 5 : 3.2, 0, 7);
            ctx.fillStyle = on ? (l === 0 ? P.accent2 : P.accent) : VZ.alpha(P.dim, 0.35); ctx.fill();
          }
        }
        ctx.fillStyle = P.dim; ctx.font = VZ.font(10.5); ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText("← 과거", X(0) + 14, h - m.b + 8); ctx.fillText("현재 →", X(T - 1) - 14, h - m.b + 8);
        hit = (p) => { const t = Math.round(((p.x - m.l) / (w - m.l - m.r)) * T - 0.5); return t >= 0 && t < T && Math.abs(p.y - Y(st.L)) < 24 ? t : null; };
      });
      const set = S.stats([{ k: "rf", label: "수용 영역" }, { k: "p", label: "파라미터 (채널 64)" }, { k: "eq", label: "팽창 없이 필요한 층" }]);
      function upd() {
        cv.redraw();
        set("rf", rf() + "<small>칸</small>"); set("p", (st.k * 64 * 64 * st.L).toLocaleString());
        set("eq", Math.ceil((rf() - 1) / (st.k - 1)) + "<small>층</small>");
      }
      S.range({ label: "층 수", min: 1, max: 6, step: 1, value: st.L, onInput: (v) => { st.L = v; upd(); } });
      S.range({ label: "커널 크기 k", min: 2, max: 4, step: 1, value: st.k, onInput: (v) => { st.k = v; upd(); } });
      S.check({ label: "팽창 (d = 1, 2, 4, 8 …)", value: true, onChange: (v) => { st.dil = v; upd(); } });
      VZ.drag(cv.canvas, { down(p) { const t = hit && hit(p); if (t != null) { st.sel = t; upd(); } return false; } });
      upd();
    },
  });

  /* ======================================================================
     9. 롤링 z-점수 이상 탐지
     ====================================================================== */
  Lab.register({
    id: "anomaly", field: "ts", thumb: "particles",
    title: "이상 탐지 — 롤링 z-점수",
    desc: "직전 w개 값의 평균과 표준편차로 현재 값이 얼마나 튀는지 재고, 임계값을 넘으면 이상으로 표시합니다.",
    tags: ["이상 탐지", "z-점수", "정밀도", "재현율"],
    note: "해볼 것: 임계값을 낮추면 재현율은 오르지만 거짓 경보가 늘어 정밀도가 떨어집니다. 창이 짧으면 계절 변동을 이상으로 오인하고, 길면 레벨 이동 직후에 둔감해집니다. ○ = 실제 이상, ● = 탐지.",
    mount(S) {
      const st = { w: 24, k: 3, spikes: true, shift: true, burst: true, seed: 3 };
      const N = 300;
      let y = [], truth = [], z = [], mu = [], sd = [], det = [];
      function gen() {
        const r = VZ.rng(st.seed);
        y = Array.from({ length: N }, (_, t) => 10 + 2 * Math.sin((TAU * t) / 50) + VZ.randn(r) * 0.5);
        truth = new Array(N).fill(false);
        if (st.spikes) for (let i = 0; i < 6; i++) { const t = 40 + Math.floor(r() * 250); y[t] += (r() < 0.5 ? -1 : 1) * (3 + r() * 2); truth[t] = true; }
        if (st.shift) { const t0 = 180; for (let t = t0; t < N; t++) y[t] += 4; for (let t = t0; t < t0 + 3; t++) truth[t] = true; }
        if (st.burst) for (let t = 110; t < 125; t++) { y[t] += VZ.randn(r) * 2.5; truth[t] = true; }
      }
      function detect() {
        z = new Array(N).fill(NaN); mu = new Array(N).fill(NaN); sd = new Array(N).fill(NaN); det = new Array(N).fill(false);
        for (let t = st.w; t < N; t++) {
          const win = y.slice(t - st.w, t), m = VZ.mean(win), s = Math.max(1e-6, VZ.std(win));
          mu[t] = m; sd[t] = s; z[t] = (y[t] - m) / s; det[t] = Math.abs(z[t]) > st.k;
        }
      }
      gen(); detect();
      const cv = S.canvas({ aspect: 0.38, minHeight: 200, maxHeight: 300 }, (ctx) => {
        const P = VZ.palette();
        const C = VZ.chart(ctx, null, {
          x: [0, N - 1], y: [Math.min(...y) - 1, Math.max(...y) + 1], title: "시계열과 롤링 평균 ± k·σ",
          series: [{ data: mu.map((m, t) => [t, m + st.k * sd[t]]), color: VZ.alpha(P.accent, 0.5), width: 1, dash: [4, 3] }, { data: mu.map((m, t) => [t, m - st.k * sd[t]]), color: VZ.alpha(P.accent, 0.5), width: 1, dash: [4, 3] }, { data: pts(y), color: P.dim, width: 1.3 }],
        });
        y.forEach((v, t) => {
          if (truth[t]) { ctx.strokeStyle = P.accent2; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(C.X(t), C.Y(v), 6, 0, 7); ctx.stroke(); }
          if (det[t]) { ctx.fillStyle = P.bad; ctx.beginPath(); ctx.arc(C.X(t), C.Y(v), 3.4, 0, 7); ctx.fill(); }
        });
      });
      const cvZ = S.canvas({ height: 150 }, (ctx) => {
        const P = VZ.palette(), lim = Math.min(15, Math.max(st.k + 1, ...z.filter(isFinite).map(Math.abs)));
        VZ.chart(ctx, null, {
          x: [0, N - 1], y: [-lim, lim], xLabel: "시간", title: "z-점수",
          series: [{ type: "bar", data: z.map((v, t) => [t, VZ.clamp(v, -lim, lim)]), color: VZ.alpha(P.accent, 0.7), barWidth: 0.8 }],
          hbands: [{ y0: -st.k, y1: st.k, color: VZ.alpha(P.ok, 0.08) }],
          hlines: [{ y: st.k, color: P.bad, label: "+k" }, { y: -st.k, color: P.bad }],
        });
      });
      const set = S.stats([{ k: "p", label: "정밀도" }, { k: "r", label: "재현율" }, { k: "f", label: "F1" }, { k: "n", label: "경보 수" }]);
      function upd() {
        detect(); cv.redraw(); cvZ.redraw();
        let tp = 0, fp = 0, fn = 0;
        for (let t = st.w; t < N; t++) { if (det[t] && truth[t]) tp++; else if (det[t]) fp++; else if (truth[t]) fn++; }
        const p = tp / Math.max(1, tp + fp), r = tp / Math.max(1, tp + fn);
        set("p", (p * 100).toFixed(0) + "<small>%</small>"); set("r", (r * 100).toFixed(0) + "<small>%</small>");
        set("f", (p + r ? (2 * p * r) / (p + r) : 0).toFixed(2)); set("n", tp + fp);
      }
      S.range({ label: "창 길이 w", min: 5, max: 80, step: 1, value: st.w, onInput: (v) => { st.w = v; upd(); } });
      S.range({ label: "임계값 k (σ 배수)", min: 1, max: 6, step: 0.1, value: st.k, fmt: (v) => v.toFixed(1), onInput: (v) => { st.k = v; upd(); } });
      S.check({ label: "순간 튐 (스파이크)", value: true, onChange: (v) => { st.spikes = v; gen(); upd(); } });
      S.check({ label: "레벨 이동", value: true, onChange: (v) => { st.shift = v; gen(); upd(); } });
      S.check({ label: "변동성 폭증 구간", value: true, onChange: (v) => { st.burst = v; gen(); upd(); } });
      S.button("새 데이터", () => { st.seed++; gen(); upd(); }, { primary: true });
      upd();
    },
  });

  /* ======================================================================
     10. Timestral — DHF 두 줄기 어텐션과 공변량 방화벽 (논문 리뷰 p02)
     mistralai/timestral의 masks.py 규칙(시간 마스크 · 변량 마스크 · 방화벽)을 옮겨
     "이 토큰의 출력에 어느 칸의 값이 섞여 들어오는가"를 층마다 추적한다.
     ====================================================================== */
  Lab.register({
    id: "timestral-flow", field: "ts", thumb: "grid", layout: "stack",
    title: "DHF 어텐션과 공변량 방화벽 — 정보 흐름 추적 (Timestral)",
    desc: "값을 담은 인코더 토큰과 값 없는 예측 토큰을 나눈 DHF 구조에서, 공개 코드의 마스크 규칙대로 정보를 흘려 어떤 값이 예측에 닿는지, 방화벽을 끄면 미래가 어떻게 새는지 봅니다.",
    tags: ["Timestral", "DHF", "어텐션 마스크", "공변량", "정보 누출"],
    note: "<b>읽는 법</b> — 행마다 위 칸은 <b>인코더 토큰</b>(그 패치의 실제 값과 결측 표시를 임베딩), 아래 칸은 <b>예측 토큰</b>(값 없이 학습된 질의 벡터)입니다. 칸을 클릭하면 그 토큰의 출력에 <em>어느 칸의 값이</em> 섞여 들어오는지 칠해집니다: 강조색 = 타깃 값, 보조색 = 과거 공변량, 초록 = 미래 공변량, <b>빨강 ✕ = 새어 들어온 미래 값</b>. 규칙은 공개 코드 <code>masks.py</code>와 같고, 층 구성은 Timestral-5M(8층)을 따릅니다.<br><b>해볼 것</b> ① 방화벽 ②를 끄면 과거 공변량의 미래 값(추론 때는 존재하지 않는 값)이 미래 공변량을 거쳐 예측 토큰으로 샙니다(빨간 화살표가 경로). 이 경로는 변량 → 시간 → 시간 → 변량 순서가 필요해서 <b>8층째에야</b> 처음 열립니다. ② 방화벽 ①까지 끄면 타깃 자신의 미래(정답)도 샙니다. ③ 방화벽 ①만 끄면 누출이 없습니다 — ②가 미래 공변량의 읽기를 막고, 과거 공변량은 인과적이라 미래를 들고 있지 않습니다. ④ 미래 공변량의 양방향 시간 어텐션을 끄면 미래 공변량의 미래 값(초록)이 예측에 닿지 않습니다. ⑤ 학습 모드에서는 모든 패치가 값 줄에서는 맥락으로, 예측 줄에서는 정답으로 동시에 쓰입니다.",
    mount(S) {
      const N = 12;
      const ROWS = [
        { name: "타깃 A", role: "target" }, { name: "타깃 B", role: "target" },
        { name: "과거 공변량", role: "past" }, { name: "미래 공변량", role: "known" },
      ];
      const R = ROWS.length, NS = R * N, NT = 2 * NS;
      // Timestral-5M의 block_schedule: 시간 어텐션 3층 다음에 시간+변량 1층, 두 번 반복
      const SCHED = ["time", "time", "time", "time_variate", "time", "time", "time", "time_variate"];
      const SUB = [];
      SCHED.forEach((k, li) => { SUB.push({ layer: li, axis: "t" }); if (k === "time_variate") SUB.push({ layer: li, axis: "v" }); });
      const st = { mode: "train", s: 6, K: 3, layers: 8, fw1: true, fw2: true, kBi: true, sel: null, hover: null };
      const tid = (str, r, p) => (str * R + r) * N + p;
      const untid = (id) => [Math.floor(id / NS), Math.floor((id % NS) / N), id % N];
      let len = N, hist = [], via = [], info = null;
      const horizon = () => Math.min(st.K, N - st.s);
      /** 예측 토큰이 속한 블록의 시작 패치 (compute_block_layout). 맥락 구간이면 −1 */
      function anchorOf(p) {
        if (p < st.s || p >= len) return -1;
        return st.mode === "train" ? st.s + st.K * Math.floor((p - st.s) / st.K) : st.s;
      }
      // 학습: 창 전체가 관측값 / 추론: 예측 구간에는 미래 공변량 값만 있다
      const hasVal = (r, p) => p < len && (st.mode === "train" || p < st.s || ROWS[r].role === "known");
      const exists = (str, r, p) => p < len && (str === 0 || anchorOf(p) >= 0);
      /** variate_firewall: 공변량은 타깃을, 양방향(미래 공변량) 행은 인과 행을 읽지 못한다 */
      function allowed(q, k) {
        const a = ROWS[q].role, b = ROWS[k].role;
        if (st.fw1 && a !== "target" && b === "target") return false;
        if (st.fw2 && st.kBi && a === "known" && b !== "known") return false;
        return true;
      }
      function reads(id, axis) {
        const [str, r, p] = untid(id), out = [];
        if (axis === "t") {
          if (str === 0) {
            const bi = ROWS[r].role === "known" && st.kBi;
            for (let j = 0; j < len; j++) if (bi || j <= p) out.push(tid(0, r, j));
          } else {
            // 예측 토큰: 블록 시작 이전의 인코더 토큰 + 같은 블록 안의 앞선 예측 토큰
            const b = anchorOf(p);
            for (let j = 0; j < b; j++) out.push(tid(0, r, j));
            for (let q = b; q <= p; q++) if (anchorOf(q) === b) out.push(tid(1, r, q));
          }
        } else {
          for (let k = 0; k < R; k++) if (k !== r && allowed(r, k) && exists(str, k, p)) out.push(tid(str, k, p));
        }
        // 가까운 패치부터: 누출 경로를 되짚을 때 가장 짧은 경유지가 잡히도록
        return out.sort((a, b) => Math.abs((a % N) - p) - Math.abs((b % N) - p));
      }
      function propagate() {
        len = st.mode === "train" ? N : st.s + horizon();
        const cur = Array.from({ length: NT }, () => new Uint8Array(NS));
        for (let r = 0; r < R; r++) for (let p = 0; p < N; p++) if (hasVal(r, p)) cur[tid(0, r, p)][r * N + p] = 1;
        hist = [cur]; via = [null];
        SUB.forEach((sub) => {
          const prev = hist[hist.length - 1], next = prev.map((a) => a.slice()), v = new Int16Array(NT * NS).fill(-1);
          for (let id = 0; id < NT; id++) {
            const [str, r, p] = untid(id);
            if (!exists(str, r, p)) continue;
            for (const y of reads(id, sub.axis)) {
              const src = prev[y], dst = next[id];
              for (let s = 0; s < NS; s++) if (src[s] && !dst[s]) { dst[s] = 1; v[id * NS + s] = y; }
            }
          }
          hist.push(next); via.push(v);
        });
      }
      const nSub = (L) => SUB.filter((x) => x.layer < L).length;
      /** 선택한 토큰 기준의 '미래' 경계: 예측 토큰은 블록 시작, 인코더 토큰은 자기 다음 패치 */
      const cutoff = (id) => { const [str, , p] = untid(id); return str === 1 ? anchorOf(p) : p + 1; };
      const isLeak = (id, s) => { const r = Math.floor(s / N), j = s % N; return j >= cutoff(id) && ROWS[r].role !== "known"; };
      function pathTo(id, s, depth) {
        const hops = [];
        let x = id;
        for (let k = depth; k >= 1; k--) {
          if (hist[k - 1][x][s]) continue;
          const y = via[k][x * NS + s];
          if (y < 0) break;
          hops.push({ from: y, to: x, k });
          x = y;
        }
        return hops.reverse();
      }
      let geo = null, hops = [];
      const cv = S.canvas({ aspect: 0.62, minHeight: 380, maxHeight: 560 }, (ctx, w, h) => {
        const P = VZ.palette(), lw = Math.min(112, w * 0.22), top = 66, bottom = 26, gap = 10;
        const cw = (w - lw - 8) / N, ch = (h - top - bottom - gap * (R - 1)) / (2 * R);
        const X = (p) => lw + p * cw, Y = (str, r) => top + r * (2 * ch + gap) + str * ch;
        geo = { X, Y, cw, ch, lw, top, gap };
        const rowCol = (r) => ({ target: P.accent, past: P.accent2, known: P.ok })[ROWS[r].role];
        // 층 구성 띠
        const nL = SCHED.length, bw = (w - lw - 8) / nL;
        ctx.font = VZ.font(11, false); ctx.fillStyle = P.dim; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText("층 구성", lw - 10, 17);
        SCHED.forEach((k, li) => {
          const x = lw + li * bw, on = li < st.layers;
          ctx.fillStyle = on ? VZ.alpha(k === "time" ? P.accent : P.warn, 0.85) : VZ.alpha(P.dim, 0.12);
          ctx.fillRect(x + 2, 6, bw - 4, 22);
          ctx.fillStyle = on ? "#fff" : P.dim; ctx.font = VZ.font(10.5, false, 600); ctx.textAlign = "center";
          ctx.fillText(bw > 62 ? (k === "time" ? `${li + 1} 시간` : `${li + 1} 시간+변량`) : `${li + 1}${k === "time" ? "T" : "TV"}`, x + bw / 2, 17);
        });
        // 열 머리: 맥락 / 블록
        ctx.font = VZ.font(10.5, false); ctx.textBaseline = "middle";
        const head = (a, b, label, col) => {
          if (b <= a) return;
          ctx.fillStyle = col; ctx.fillRect(X(a) + 1, 36, X(b) - X(a) - 2, 18);
          ctx.fillStyle = P.text; ctx.textAlign = "center"; ctx.fillText(label, (X(a) + X(b)) / 2, 45);
        };
        head(0, st.s, st.mode === "train" ? `최소 맥락 (s = ${st.s})` : `맥락 ${st.s}패치`, VZ.alpha(P.dim, 0.12));
        if (st.mode === "train") for (let b = st.s, k = 1; b < N; b += st.K, k++) head(b, Math.min(N, b + st.K), cw * Math.min(st.K, N - b) > 60 ? `블록 ${k}` : `${k}`, VZ.alpha(k % 2 ? P.warn : P.accent2, 0.16));
        else { head(st.s, len, "예측 블록", VZ.alpha(P.warn, 0.18)); head(len, N, cw * (N - len) > 90 ? "다음 호출" : "…", VZ.alpha(P.dim, 0.06)); }
        ctx.fillStyle = P.faint; ctx.font = VZ.font(9.5); ctx.textAlign = "center";
        for (let p = 0; p < N; p++) ctx.fillText(p + 1, X(p) + cw / 2, 60);
        const src = info, selCut = st.sel != null ? cutoff(st.sel) : 99;
        for (let r = 0; r < R; r++) {
          // 칸이 낮으면(좁은 화면) 보조 라벨을 줄여 겹치지 않게 한다
          const roomy = ch >= 30;
          ctx.fillStyle = P.text; ctx.font = VZ.font(12, false, 700); ctx.textAlign = "right"; ctx.textBaseline = "middle";
          ctx.fillText(ROWS[r].name, lw - 10, Y(0, r) + (roomy ? ch * 0.38 : ch * 0.5));
          ctx.fillStyle = P.dim; ctx.font = VZ.font(10, false);
          if (roomy) ctx.fillText("값 토큰", lw - 10, Y(0, r) + ch * 0.38 + 14);
          ctx.fillText(roomy ? "예측 토큰" : "예측", lw - 10, Y(1, r) + ch * 0.5);
          for (let str = 0; str < 2; str++) for (let p = 0; p < N; p++) {
            const x = X(p) + 1.5, y = Y(str, r) + 1.5, cww = cw - 3, chh = ch - 3, id = tid(str, r, p);
            if (!exists(str, r, p)) {
              if (p >= len) { ctx.strokeStyle = VZ.alpha(P.dim, 0.35); ctx.setLineDash([3, 3]); ctx.strokeRect(x, y, cww, chh); ctx.setLineDash([]); }
              continue;
            }
            if (str === 0) {
              const s = r * N + p, hit = src && src[s];
              if (hit) {
                const leak = isLeak(st.sel, s), knownFut = ROWS[r].role === "known" && p >= selCut;
                ctx.fillStyle = leak ? P.bad : VZ.alpha(rowCol(r), knownFut ? 1 : 0.78);
                ctx.fillRect(x, y, cww, chh);
                if (leak || knownFut) {
                  ctx.fillStyle = "#fff"; ctx.font = VZ.font(Math.min(14, chh * 0.6), false, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle";
                  ctx.fillText(leak ? "✕" : "→", x + cww / 2, y + chh / 2 + 0.5);
                }
              } else if (hasVal(r, p)) { ctx.fillStyle = VZ.alpha(rowCol(r), 0.13); ctx.fillRect(x, y, cww, chh); }
              else {
                ctx.strokeStyle = VZ.alpha(P.dim, 0.5); ctx.setLineDash([3, 3]); ctx.strokeRect(x, y, cww, chh); ctx.setLineDash([]);
                ctx.fillStyle = P.faint; ctx.font = VZ.font(10); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("∅", x + cww / 2, y + chh / 2);
              }
            } else {
              ctx.fillStyle = VZ.alpha(P.warn, 0.2); ctx.fillRect(x, y, cww, chh);
              ctx.fillStyle = VZ.alpha(P.warn, 0.9); ctx.font = VZ.font(10, false, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("q", x + cww / 2, y + chh / 2);
            }
            if (id === st.hover) { ctx.strokeStyle = P.dim; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, cww, chh); }
            if (id === st.sel) { ctx.strokeStyle = P.text; ctx.lineWidth = 3; ctx.strokeRect(x - 1, y - 1, cww + 2, chh + 2); }
          }
          ctx.lineWidth = 1;
        }
        // 맥락/예측 경계
        ctx.strokeStyle = VZ.alpha(P.text, 0.45); ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(X(st.s), 34); ctx.lineTo(X(st.s), h - bottom + 4); ctx.stroke(); ctx.setLineDash([]);
        // 누출 경로
        const cen = (id) => { const [str, r, p] = untid(id); return [X(p) + cw / 2, Y(str, r) + ch / 2]; };
        ctx.strokeStyle = P.bad; ctx.fillStyle = P.bad; ctx.lineWidth = 2.2;
        hops.forEach((hp, i) => {
          let [x0, y0] = cen(hp.from), [x1, y1] = cen(hp.to);
          const sameRow = Math.abs(y1 - y0) < 1, vertical = Math.abs(x1 - x0) < 1;
          // 변량 단계(세로 이동)는 값 줄이면 왼쪽, 예측 줄이면 오른쪽으로 비켜 그려 겹치지 않게
          if (vertical) { const dx = (untid(hp.to)[0] ? 1 : -1) * cw * 0.24; x0 += dx; x1 += dx; }
          const mx = (x0 + x1) / 2, my = sameRow ? y0 - ch * 0.9 : (y0 + y1) / 2;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
          const a = Math.atan2(y1 - my, x1 - mx);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 9 * Math.cos(a - 0.4), y1 - 9 * Math.sin(a - 0.4)); ctx.lineTo(x1 - 9 * Math.cos(a + 0.4), y1 - 9 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
          const sub = SUB[hp.k - 1], lx = sameRow ? mx : mx + 6, ly = sameRow ? (y0 + my) / 2 - 2 : my;
          const label = `${i + 1}. ${sub.layer + 1}층 ${sub.axis === "t" ? "시간" : "변량"}`;
          ctx.font = VZ.font(10, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "middle";
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = VZ.alpha(P.bg, 0.9); ctx.fillRect(lx - 2, ly - 8, tw + 4, 16);
          ctx.fillStyle = P.bad; ctx.fillText(label, lx, ly);
        });
        // 아래 설명줄
        const show = st.hover != null ? st.hover : st.sel;
        if (show != null) {
          const [str, r, p] = untid(show), b = str === 1 ? anchorOf(p) : -1;
          ctx.fillStyle = P.dim; ctx.font = VZ.font(11, false); ctx.textAlign = "left"; ctx.textBaseline = "bottom";
          ctx.fillText(`${ROWS[r].name} · 패치 ${p + 1} · ${str ? `예측 토큰 (블록 시작 ${b + 1}, 그 앞의 값 토큰만 읽음)` : ROWS[r].role === "known" && st.kBi ? "값 토큰 (시간축 양방향)" : "값 토큰 (시간축 인과)"}`, lw, h - 6);
        }
      });
      const set = S.stats([{ k: "n", label: "섞여 든 값 칸" }, { k: "kf", label: "미래 공변량 값" }, { k: "leak", label: "누출된 미래 값" }, { k: "first", label: "누출이 처음 생기는 층" }]);
      function upd() {
        propagate();
        if (st.sel == null || !exists(...untid(st.sel))) st.sel = tid(1, 0, st.s);
        const depth = nSub(st.layers);
        info = hist[depth][st.sel];
        let n = 0, kf = 0, leaks = [];
        for (let s = 0; s < NS; s++) if (info[s]) { n++; if (isLeak(st.sel, s)) leaks.push(s); else if (ROWS[Math.floor(s / N)].role === "known" && s % N >= cutoff(st.sel)) kf++; }
        // 다른 타깃의 미래 → 자기 미래 순으로 대표 경로 하나
        leaks.sort((a, b) => (Math.floor(b / N) !== untid(st.sel)[1]) - (Math.floor(a / N) !== untid(st.sel)[1]) || (a % N) - (b % N));
        hops = leaks.length ? pathTo(st.sel, leaks[0], depth) : [];
        let first = 0;
        for (let L = 1; L <= SCHED.length && !first; L++) { const a = hist[nSub(L)][st.sel]; for (let s = 0; s < NS; s++) if (a[s] && isLeak(st.sel, s)) { first = L; break; } }
        set("n", n + "<small>칸</small>"); set("kf", kf + "<small>칸</small>");
        set("leak", leaks.length ? `<span style="color:var(--bad)">${leaks.length}<small>칸</small></span>` : `<span style="color:var(--ok)">없음</span>`);
        set("first", first ? first + "<small>층째</small>" : "8층까지 없음");
        cv.redraw();
      }
      S.legend([
        { label: "타깃 값", color: (P) => P.accent }, { label: "과거 공변량 값", color: (P) => P.accent2 },
        { label: "미래 공변량 값", color: (P) => P.ok }, { label: "새어 든 미래 값", color: (P) => P.bad }, { label: "예측 토큰", color: (P) => VZ.alpha(P.warn, 0.6) },
      ]);
      S.seg({ label: "상황", options: [["train", "학습 (DHF: 창 전체가 관측값)"], ["infer", "추론 (미래 칸은 비어 있음)"]], value: st.mode, onChange: (v) => { st.mode = v; st.sel = null; upd(); } });
      S.range({ label: "맥락 패치 s", min: 2, max: 10, step: 1, value: st.s, onInput: (v) => { st.s = v; st.sel = null; upd(); } });
      S.range({ label: "블록 크기 K (패치)", min: 1, max: 6, step: 1, value: st.K, onInput: (v) => { st.K = v; upd(); } });
      const layerCtl = S.range({ label: "통과한 층 수", min: 0, max: 8, step: 1, value: st.layers, onInput: (v) => { st.layers = v; upd(); } });
      S.check({ label: "방화벽 ① 공변량 행은 타깃 행을 읽지 않음", value: true, onChange: (v) => { st.fw1 = v; upd(); } });
      S.check({ label: "방화벽 ② 미래 공변량 행은 인과 행을 읽지 않음", value: true, onChange: (v) => { st.fw2 = v; upd(); } });
      S.check({ label: "미래 공변량의 시간 어텐션을 양방향으로", value: true, onChange: (v) => { st.kBi = v; upd(); } });
      let timer = 0;
      S.button("층 하나씩 재생", () => {
        clearInterval(timer);
        layerCtl.set(0);
        timer = setInterval(() => { if (st.layers >= SCHED.length) { clearInterval(timer); return; } layerCtl.set(st.layers + 1); }, 700);
      }, { primary: true });
      S.button("방화벽 모두 켜기", () => {
        clearInterval(timer);
        st.fw1 = st.fw2 = st.kBi = true;
        S.controls.querySelectorAll(".check input").forEach((c) => (c.checked = true));
        layerCtl.set(8);
      });
      const hit = (p) => {
        if (!geo) return null;
        const col = Math.floor((p.x - geo.lw) / geo.cw);
        if (col < 0 || col >= N) return null;
        for (let r = 0; r < R; r++) for (let str = 0; str < 2; str++) {
          const y = geo.Y(str, r);
          if (p.y >= y && p.y < y + geo.ch) return exists(str, r, col) ? tid(str, r, col) : null;
        }
        return null;
      };
      VZ.drag(cv.canvas, {
        down(p) { const id = hit(p); if (id != null) { st.sel = id; upd(); } return false; },
        hover(p) { const id = hit(p); if (id !== st.hover) { st.hover = id; cv.redraw(); } },
        leave() { st.hover = null; cv.redraw(); },
      });
      upd();
    },
  });

  /* ======================================================================
     11. Timestral — 단조 분위수 헤드와 핀볼 손실 (논문 리뷰 p02)
     ====================================================================== */
  const LV21 = [0.01, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.99];
  const LV9 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const softplus = (x) => (x > 20 ? x : Math.log1p(Math.exp(x)));
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const pinball = (y, q, tau) => (y >= q ? tau * (y - q) : (1 - tau) * (q - y));
  /** timestral/model.py monotone_quantiles: 중앙값은 자유, 나머지는 중앙값 ± 누적(폭 계수 × 확률 간격 × softplus) */
  function monotoneQ(raw, lv, wf) {
    const m = lv.indexOf(0.5), q = new Array(lv.length);
    q[m] = raw[m];
    for (let i = m + 1; i < lv.length; i++) q[i] = q[i - 1] + wf * (lv[i] - lv[i - 1]) * softplus(raw[i]);
    for (let i = m - 1; i >= 0; i--) q[i] = q[i + 1] - wf * (lv[i + 1] - lv[i]) * softplus(raw[i]);
    return q;
  }
  Lab.register({
    id: "timestral-quantile", field: "ts", thumb: "curve",
    title: "단조 분위수 헤드와 핀볼 손실 (Timestral)",
    desc: "21개 분위수를 '중앙값 ± softplus 증분의 누적합'으로 만들어 교차를 막고, 핀볼 손실로 학습하면 참 분포의 분위수로 모이는 과정을 봅니다.",
    tags: ["Timestral", "분위수 회귀", "핀볼 손실", "CRPS", "확률 예측"],
    note: "왼쪽은 참 분포(막대)와 예측 분위수(세로선, 굵은 선 = 중앙값), 오른쪽은 분위수 함수 \\(q(\\tau)\\)입니다(회색 곡선 = 참값, 점 = 예측). <b>해볼 것</b> ① 분포를 바꿔 보세요 — 핀볼 손실만으로 비대칭·두 봉우리 분포의 분위수도 찾아갑니다. ② 헤드를 <b>독립 출력</b>으로 바꾸고 배치를 작게, 학습률을 크게 하면 이웃 분위수가 서로 뒤집히는(교차) 순간이 생깁니다(빨간 구간). 단조 헤드는 증분이 softplus라서 구조적으로 교차가 불가능합니다. ③ 21개 분위수의 평균 핀볼 손실은 CRPS를 이산적으로 근사합니다(블로그 설명). 폭 계수는 공개 설정값 3.0을 씁니다.",
    mount(S) {
      const DISTS = {
        normal: ["정규분포", (r) => VZ.randn(r)],
        skew: ["오른쪽 꼬리 (로그정규)", (r) => (Math.exp(0.75 * VZ.randn(r)) - 1) * 1.6],
        bimodal: ["두 봉우리", (r) => (r() < 0.6 ? -1.6 + 0.5 * VZ.randn(r) : 2 + 0.7 * VZ.randn(r))],
        heavy: ["두꺼운 꼬리 (t 분포, ν = 3)", (r) => { const z = VZ.randn(r); let c = 0; for (let i = 0; i < 3; i++) { const g = VZ.randn(r); c += g * g; } return z / Math.sqrt(c / 3); }],
        intermittent: ["간헐 수요 (55%가 0)", (r) => (r() < 0.55 ? 0 : -Math.log(1 - r()) * 2.5)],
      };
      const WF = 3.0;
      const st = { dist: "skew", head: "mono", nq: 21, lr: 0.03, batch: 32, run: true, step: 0, crossEver: 0 };
      let lv = LV21, raw = [], mom = [], vel = [], big = [], evalSet = [], rng = VZ.rng(5), lossHist = [], opt = 0, q = [], tq = [];
      const quant = (sorted, tau) => { const x = tau * (sorted.length - 1), i = Math.floor(x), f = x - i; return sorted[i] + (sorted[Math.min(sorted.length - 1, i + 1)] - sorted[i]) * f; };
      function data() {
        const r = VZ.rng(101), f = DISTS[st.dist][1];
        big = Array.from({ length: 20000 }, () => f(r)).sort((a, b) => a - b);
        const r2 = VZ.rng(202);
        evalSet = Array.from({ length: 3000 }, () => f(r2));
      }
      const evalLoss = (qq) => { let s = 0; for (const y of evalSet) for (let k = 0; k < lv.length; k++) s += pinball(y, qq[k], lv[k]); return s / (evalSet.length * lv.length); };
      function reset() {
        lv = st.nq === 21 ? LV21 : LV9;
        const r = VZ.rng(7);
        raw = lv.map(() => 0.6 * VZ.randn(r));
        mom = lv.map(() => 0); vel = lv.map(() => 0);
        st.step = 0; st.crossEver = 0; lossHist = []; rng = VZ.rng(9);
        tq = lv.map((t) => quant(big, t)); opt = evalLoss(tq);
        q = qOf(raw); lossHist.push([0, evalLoss(q)]);
      }
      const qOf = (rw) => (st.head === "mono" ? monotoneQ(rw, lv, WF) : rw.slice());
      function trainStep() {
        const f = DISTS[st.dist][1], K = lv.length, g = new Array(K).fill(0);
        for (let b = 0; b < st.batch; b++) { const y = f(rng); for (let k = 0; k < K; k++) g[k] += (y > q[k] ? -lv[k] : 1 - lv[k]) / (st.batch * K); }
        let gr;
        if (st.head === "mono") {
          const m = lv.indexOf(0.5);
          gr = new Array(K).fill(0);
          gr[m] = g.reduce((a, v) => a + v, 0);
          let acc = 0;
          for (let i = K - 1; i > m; i--) { acc += g[i]; gr[i] = acc * WF * (lv[i] - lv[i - 1]) * sigmoid(raw[i]); }
          acc = 0;
          for (let i = 0; i < m; i++) { acc += g[i]; gr[i] = -acc * WF * (lv[i + 1] - lv[i]) * sigmoid(raw[i]); }
        } else gr = g;
        st.step++;
        const b1 = 0.9, b2 = 0.999, c1 = 1 - b1 ** st.step, c2 = 1 - b2 ** st.step;
        for (let k = 0; k < K; k++) {
          const gk = gr[k] * K; // 수준 평균으로 작아진 기울기를 수준 합 기준으로 되돌린다
          mom[k] = b1 * mom[k] + (1 - b1) * gk; vel[k] = b2 * vel[k] + (1 - b2) * gk * gk;
          raw[k] -= (st.lr * mom[k] / c1) / (Math.sqrt(vel[k] / c2) + 1e-8);
        }
        q = qOf(raw);
        if (crossings() > 0) st.crossEver++;
      }
      const crossings = () => { let c = 0; for (let k = 1; k < q.length; k++) if (q[k] < q[k - 1]) c++; return c; };
      data(); reset();
      const xr = () => { const lo = quant(big, 0.005), hi = quant(big, 0.995), pad = (hi - lo) * 0.12 + 0.2; return [lo - pad, hi + pad]; };
      const levelCol = (P, t) => (t === 0.5 ? P.text : t < 0.5 ? VZ.mix(P.accent2, P.faint, (0.5 - t) * 1.2) : VZ.mix(P.accent, P.faint, (t - 0.5) * 1.2));
      const [left, right] = S.split(2);
      const cvD = S.canvas({ parent: left, aspect: 0.8, maxHeight: 340 }, (ctx) => {
        const P = VZ.palette(), [a, b] = xr(), nb = 48, bins = new Array(nb).fill(0);
        big.forEach((v) => { const i = Math.floor(((v - a) / (b - a)) * nb); if (i >= 0 && i < nb) bins[i]++; });
        const top = Math.max(...bins), bw = (b - a) / nb;
        const C = VZ.chart(ctx, null, {
          x: [a, b], y: [0, 1.08], title: "참 분포와 예측 분위수", xLabel: "값", yTicks: [],
          series: [{ type: "bar", data: bins.map((c, i) => [a + (i + 0.5) * bw, c / top]), color: VZ.alpha(P.dim, 0.28), barWidth: bw * 0.92 }],
        });
        const i10 = lv.indexOf(0.1), i90 = lv.indexOf(0.9);
        ctx.fillStyle = VZ.alpha(P.accent, 0.1); ctx.fillRect(C.X(Math.min(q[i10], q[i90])), C.box.y, Math.abs(C.X(q[i90]) - C.X(q[i10])), C.box.h);
        lv.forEach((t, k) => {
          const x = C.X(VZ.clamp(q[k], a, b));
          ctx.strokeStyle = levelCol(P, t); ctx.lineWidth = t === 0.5 ? 2.6 : 1.3;
          ctx.beginPath(); ctx.moveTo(x, C.box.y + 4); ctx.lineTo(x, C.box.y + C.box.h); ctx.stroke();
          ctx.fillStyle = P.dim; ctx.beginPath(); const tx = C.X(VZ.clamp(tq[k], a, b)), ty = C.box.y + C.box.h;
          ctx.moveTo(tx, ty - 6); ctx.lineTo(tx - 3.5, ty); ctx.lineTo(tx + 3.5, ty); ctx.closePath(); ctx.fill();
        });
        ctx.fillStyle = P.faint; ctx.font = VZ.font(10, false); ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillText("▲ 참 분위수 · 음영 = 10~90% 구간", C.box.x + C.box.w - 2, C.box.y + 2);
      });
      const cvQ = S.canvas({ parent: right, aspect: 0.8, maxHeight: 340 }, (ctx) => {
        const P = VZ.palette(), [a, b] = xr();
        const qs = q.map((v) => VZ.clamp(v, a, b));
        const C = VZ.chart(ctx, null, {
          x: [0, 1], y: [a, b], title: "분위수 함수 q(τ)", xLabel: "분위수 수준 τ",
          series: [{ data: VZ.linspace(0.005, 0.995, 120).map((t) => [t, quant(big, t)]), color: VZ.alpha(P.dim, 0.7), width: 2 }],
        });
        for (let k = 1; k < lv.length; k++) {
          ctx.strokeStyle = qs[k] < qs[k - 1] ? P.bad : P.accent; ctx.lineWidth = qs[k] < qs[k - 1] ? 3 : 1.8;
          ctx.beginPath(); ctx.moveTo(C.X(lv[k - 1]), C.Y(qs[k - 1])); ctx.lineTo(C.X(lv[k]), C.Y(qs[k])); ctx.stroke();
        }
        lv.forEach((t, k) => { ctx.fillStyle = levelCol(P, t); ctx.beginPath(); ctx.arc(C.X(t), C.Y(qs[k]), t === 0.5 ? 4.5 : 3.2, 0, 7); ctx.fill(); });
      });
      const cvL = S.canvas({ height: 130 }, (ctx) => {
        const P = VZ.palette(), last = lossHist[lossHist.length - 1][0] || 1, hi = Math.max(...lossHist.map((d) => d[1]), opt * 1.2);
        VZ.chart(ctx, null, {
          x: [0, Math.max(200, last)], y: [opt * 0.9, hi * 1.05], title: "평가용 표본의 평균 핀볼 손실", xLabel: "학습 단계",
          series: [{ data: lossHist, color: P.accent, width: 2 }], hlines: [{ y: opt, color: P.ok, label: "참 분위수일 때 (최저)" }],
        });
      });
      const set = S.stats([{ k: "l", label: "평균 핀볼 손실" }, { k: "o", label: "최저 가능값" }, { k: "cov", label: "10~90% 구간 실제 포함률" }, { k: "x", label: "지금 교차한 이웃 쌍" }, { k: "xe", label: "교차가 있었던 단계" }]);
      function stats() {
        const lo = q[lv.indexOf(0.1)], hi = q[lv.indexOf(0.9)];
        let inn = 0; for (const v of big) if (v >= Math.min(lo, hi) && v <= Math.max(lo, hi)) inn++;
        set("l", lossHist[lossHist.length - 1][1].toFixed(4)); set("o", opt.toFixed(4));
        set("cov", ((inn / big.length) * 100).toFixed(1) + "<small>% (목표 80%)</small>");
        const c = crossings();
        set("x", c ? `<span style="color:var(--bad)">${c}</span>` : "0"); set("xe", st.crossEver + `<small> / ${st.step}</small>`);
      }
      const redraw = () => { cvD.redraw(); cvQ.redraw(); cvL.redraw(); stats(); };
      S.loop(() => {
        if (!st.run) return;
        for (let i = 0; i < 4; i++) trainStep();
        if (st.step % 20 < 4) lossHist.push([st.step, evalLoss(q)]);
        if (st.step >= 3000) { st.run = false; playBtn.textContent = "▶ 재생"; }
        redraw();
      });
      S.select({ label: "참 분포", options: Object.entries(DISTS).map(([k, [n]]) => [k, n]), value: st.dist, onChange: (v) => { st.dist = v; data(); reset(); start(); } });
      S.seg({ label: "출력 헤드", options: [["mono", "단조 (Timestral)"], ["free", "독립 출력"]], value: st.head, onChange: (v) => { st.head = v; reset(); start(); } });
      S.seg({ label: "분위수 개수", options: [["21", "21개 (Timestral)"], ["9", "9개 (평가 지표)"]], value: "21", onChange: (v) => { st.nq = Number(v); reset(); start(); } });
      S.range({ label: "학습률", min: 0.002, max: 0.2, step: 0.002, value: st.lr, fmt: (v) => v.toFixed(3), onInput: (v) => { st.lr = v; } });
      S.range({ label: "배치 크기", min: 2, max: 256, step: 2, value: st.batch, onInput: (v) => { st.batch = v; } });
      const start = () => { st.run = true; playBtn.textContent = "❚❚ 정지"; redraw(); };
      const playBtn = S.button("❚❚ 정지", () => { st.run = !st.run; playBtn.textContent = st.run ? "❚❚ 정지" : "▶ 재생"; }, { primary: true });
      S.button("처음부터", () => { reset(); start(); });
      redraw();
    },
  });

  /* ======================================================================
     12. Timestral — 인과 패치 정규화와 asinh 압축 (논문 리뷰 p02)
     ====================================================================== */
  /** timestral/scaler.py compute_causal_statistics: 관측값만 쓰는 누적 평균·표준편차 (Welford, Bessel 보정, 최소 스케일) */
  function causalStats(x, obs, minScale = 1e-6) {
    const n = x.length, mean = new Float64Array(n), sd = new Float64Array(n);
    let w = 0, m = 0, m2 = 0;
    for (let t = 0; t < n; t++) {
      if (obs[t]) { w += 1; const d = x[t] - m; m += d / w; m2 += d * (x[t] - m); }
      mean[t] = m; sd[t] = Math.max(minScale, Math.sqrt(m2 / Math.max(1, w - 1)));
    }
    return { mean, sd };
  }
  Lab.register({
    id: "timestral-scaler", field: "ts", thumb: "wave",
    title: "인과 패치 정규화와 asinh 압축 (Timestral)",
    desc: "패치마다 '그 패치 끝까지 관측된 값'만으로 평균·표준편차를 구해 정규화하고 asinh로 큰 값을 눌러, 미래 정보 없이 스파이크와 레벨 이동을 다루는 방식을 봅니다.",
    tags: ["Timestral", "정규화", "asinh", "결측값", "패칭"],
    note: "위 그림의 음영 띠는 패치마다 쓰는 기준(평균 ± 표준편차)입니다. 각 패치는 <b>그 패치의 끝까지</b> 관측된 값만으로 통계를 내므로 미래를 보지 않습니다. 아래 그림은 모델에 실제로 들어가는 값 \\(\\operatorname{asinh}((x-\\mu_p)/\\sigma_p)\\)입니다. <b>해볼 것</b> ① 스파이크를 키워 보세요 — asinh가 없으면 입력이 수십까지 튀지만, asinh는 큰 값을 로그처럼 눌러 줍니다. ② <b>전역 정규화와 비교</b>를 켜면 창 전체(미래 포함)의 평균·표준편차를 쓰는 흔한 방식이 겹쳐 보입니다. 레벨 이동 이전 구간까지 이동 이후의 값에 영향을 받습니다. ③ 결측 구간의 값은 통계에서 빠지고 입력은 0이 되며, 결측 여부는 별도 채널(주황 막대)로 함께 임베딩됩니다. 커서를 올리면 그 패치의 기준값이 아래 판독 칸에 나옵니다.",
    mount(S) {
      const N = 320;
      const st = { P: 32, spike: 60, shift: 22, slope: 0.03, asinh: true, gap: true, global: false, hp: null };
      let x = [], obs = [], loc = [], sc = [], zC = [], zRaw = [], zG = [];
      function compute() {
        const r = VZ.rng(17);
        x = Array.from({ length: N }, (_, t) => 40 + st.slope * t + 6 * Math.sin((TAU * t) / 40) + VZ.randn(r) * 1.2 + (t === 120 ? st.spike : 0) + (t >= 210 ? st.shift : 0));
        obs = x.map((_, t) => !(st.gap && t >= 150 && t < 172));
        const cs = causalStats(x, obs), nP = N / st.P;
        loc = []; sc = [];
        for (let p = 0; p < nP; p++) { const e = (p + 1) * st.P - 1; loc.push(cs.mean[e]); sc.push(cs.sd[e]); }
        const ob = x.filter((_, t) => obs[t]), gm = VZ.mean(ob), gs = Math.max(1e-6, VZ.std(ob));
        zRaw = x.map((v, t) => (obs[t] ? (v - loc[Math.floor(t / st.P)]) / sc[Math.floor(t / st.P)] : 0));
        zC = zRaw.map((z, t) => (obs[t] && st.asinh ? Math.asinh(z) : z));
        zG = x.map((v, t) => { const z = obs[t] ? (v - gm) / gs : 0; return st.asinh ? Math.asinh(z) : z; });
        st.gm = gm; st.gs = gs;
      }
      compute();
      let C1 = null, C2 = null;
      const cvRaw = S.canvas({ aspect: 0.36, minHeight: 190, maxHeight: 280 }, (ctx) => {
        const P = VZ.palette(), ob = x.filter((_, t) => obs[t]), lo = Math.min(...ob, ...loc.map((l, p) => l - sc[p])), hi = Math.max(...ob, ...loc.map((l, p) => l + sc[p]));
        const pad = (hi - lo) * 0.08;
        C1 = VZ.chart(ctx, null, {
          x: [0, N], y: [lo - pad, hi + pad], title: `원래 값과 패치별 기준 μ_p ± σ_p (패치 ${st.P}스텝)`,
          series: [{ data: x.map((v, t) => [t, obs[t] ? v : NaN]), color: P.text, width: 1.3 }],
          bands: st.gap ? [{ x0: 150, x1: 172, color: VZ.alpha(P.warn, 0.12) }] : [],
          hlines: st.global ? [{ y: st.gm, color: P.accent2, label: "전역 평균 (미래 포함)" }, { y: st.gm + st.gs, color: VZ.alpha(P.accent2, 0.6) }, { y: st.gm - st.gs, color: VZ.alpha(P.accent2, 0.6) }] : [],
        });
        loc.forEach((l, p) => {
          const x0 = C1.X(p * st.P), x1 = C1.X((p + 1) * st.P);
          ctx.fillStyle = VZ.alpha(P.accent, p === st.hp ? 0.3 : 0.13); ctx.fillRect(x0, C1.Y(l + sc[p]), x1 - x0, C1.Y(l - sc[p]) - C1.Y(l + sc[p]));
          ctx.strokeStyle = P.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, C1.Y(l)); ctx.lineTo(x1, C1.Y(l)); ctx.stroke();
          ctx.strokeStyle = VZ.alpha(P.dim, 0.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, C1.box.y); ctx.lineTo(x1, C1.box.y + C1.box.h); ctx.stroke();
        });
      });
      const cvIn = S.canvas({ aspect: 0.3, minHeight: 170, maxHeight: 240 }, (ctx) => {
        const P = VZ.palette();
        const all = [...zC, ...(st.global ? zG : []), ...(st.asinh ? zRaw : [])].map(Math.abs);
        const lim = Math.min(80, Math.max(3, ...all)) * 1.08;
        C2 = VZ.chart(ctx, null, {
          x: [0, N], y: [-lim, lim], title: "모델 입력 (패치 임베딩에 들어가는 값)", xLabel: "시간",
          series: [
            ...(st.asinh ? [{ data: zRaw.map((z, t) => [t, obs[t] ? VZ.clamp(z, -lim, lim) : NaN]), color: VZ.alpha(P.dim, 0.55), width: 1, dash: [3, 3] }] : []),
            ...(st.global ? [{ data: zG.map((z, t) => [t, obs[t] ? z : NaN]), color: P.accent2, width: 1.3, dash: [5, 3] }] : []),
            { data: zC.map((z, t) => [t, obs[t] ? z : NaN]), color: P.accent, width: 1.6 },
          ],
          hlines: [{ y: 0, color: P.faint, dash: [] }],
        });
        if (st.gap) { ctx.fillStyle = VZ.alpha(P.warn, 0.85); for (let t = 150; t < 172; t++) ctx.fillRect(C2.X(t), C2.box.y + C2.box.h - 6, C2.X(t + 1) - C2.X(t) + 0.5, 6); }
      });
      S.legend([
        { label: "인과 정규화", color: (P) => P.accent }, { label: "asinh 적용 전", color: (P) => P.dim, dash: true },
        { label: "전역 정규화 (미래 포함)", color: (P) => P.accent2, dash: true }, { label: "결측 표시 채널", color: (P) => P.warn },
      ]);
      const set = S.stats([{ k: "mx", label: "모델 입력 최대 |값|" }, { k: "mr", label: "asinh 없을 때 최대 |값|" }, { k: "n", label: "패치(토큰) 수" }, { k: "p", label: "가리킨 패치의 μ · σ" }]);
      function upd() {
        compute(); cvRaw.redraw(); cvIn.redraw();
        set("mx", Math.max(...zC.map(Math.abs)).toFixed(2)); set("mr", Math.max(...zRaw.map(Math.abs)).toFixed(1));
        set("n", N / st.P);
        const p = st.hp != null ? st.hp : N / st.P - 1;
        set("p", `<small>#${p + 1}</small> ${loc[p].toFixed(1)} · ${sc[p].toFixed(2)}`);
      }
      S.seg({ label: "패치 길이 (Timestral = 32)", options: [["8", "8"], ["16", "16"], ["32", "32"]], value: "32", onChange: (v) => { st.P = Number(v); st.hp = null; upd(); } });
      S.range({ label: "스파이크 크기 (t = 120)", min: 0, max: 200, step: 5, value: st.spike, onInput: (v) => { st.spike = v; upd(); } });
      S.range({ label: "레벨 이동 (t ≥ 210)", min: -40, max: 40, step: 1, value: st.shift, onInput: (v) => { st.shift = v; upd(); } });
      S.range({ label: "추세 기울기", min: -0.15, max: 0.15, step: 0.005, value: st.slope, fmt: (v) => v.toFixed(3), onInput: (v) => { st.slope = v; upd(); } });
      S.check({ label: "asinh 압축", value: true, onChange: (v) => { st.asinh = v; upd(); } });
      S.check({ label: "결측 구간 (t = 150–171)", value: true, onChange: (v) => { st.gap = v; upd(); } });
      S.check({ label: "전역 정규화와 비교", value: false, onChange: (v) => { st.global = v; upd(); } });
      const probe = (C) => (p) => { if (!C) return; const t = C.iX(p.x); const hp = t >= 0 && t < N ? Math.floor(t / st.P) : null; if (hp !== st.hp) { st.hp = hp; upd(); } };
      VZ.drag(cvRaw.canvas, { hover: (p) => probe(C1)(p), leave: () => { st.hp = null; upd(); } });
      VZ.drag(cvIn.canvas, { hover: (p) => probe(C2)(p), leave: () => { st.hp = null; upd(); } });
      upd();
    },
  });

  /* ======================================================================
     13. Timestral — 반전 평균(clampsym)과 비음수 클리핑 (논문 리뷰 p02)
     forecaster.py의 기본값 symmetric_averaging=True, clip_nonnegative=True
     ====================================================================== */
  Lab.register({
    id: "timestral-symavg", field: "ts", thumb: "windows",
    title: "반전 평균과 비음수 클리핑 — Timestral의 기본 추론 설정",
    desc: "입력 x와 −x를 각각 예측한 뒤 두 번째를 뒤집어 평균하는 테스트 시간 증강이, 입력 부호와 무관한 모델 편향을 어떻게 지우는지와 그 비용(순전파 2배)을 봅니다.",
    tags: ["Timestral", "테스트 시간 증강", "분위수 예측", "WQL", "추론"],
    note: "장난감 '사전학습 모델'은 계절 나이브 예측에 과거 잔차의 분위수를 붙이고, 일부러 <b>입력과 무관하게 위로 치우친 편향 β</b>와 <b>오른쪽 꼬리를 늘리는 습관 γ</b>를 넣었습니다. 반전 패스는 \\(-x\\)를 예측한 뒤 \\(-q_{1-\\tau}(-x)\\)로 되돌린 것이고, 최종 출력은 두 패스의 평균입니다. <b>해볼 것</b> ① β·γ를 키우면 단일 패스의 WQL은 나빠지지만 반전 평균은 거의 그대로입니다 — 부호를 뒤집어도 바뀌지 않는 오차 성분은 평균에서 상쇄됩니다. ② β = γ = 0이면 장난감 모델이 이미 부호에 대칭이라 평균이 아무것도 바꾸지 않습니다. ③ 간헐 수요에서는 비음수 클리핑이 0 아래로 내려간 분위수를 잘라 줍니다. 공개 코드는 이 두 설정이 <b>기본으로 켜져</b> 있고, 세 벤치마크 제출도 이 기본값으로 계산되었습니다.",
    mount(S) {
      const per = 24, Lc = 168, H = 48, SHOW = 72;
      const st = { series: "season", beta: 0.5, gamma: 0.5, sym: true, clip: true, show: "all", seed: 4 };
      let y = [], fut = [], F1 = [], F2 = [], FA = [], FF = [];
      function gen() {
        const r = VZ.rng(st.seed * 31 + 7), n = Lc + H;
        if (st.series === "season") y = Array.from({ length: n }, (_, t) => 20 + 0.03 * t + 4 * Math.sin((TAU * t) / per) + 1.5 * Math.sin((2 * TAU * t) / per + 1) + VZ.randn(r) * 0.9);
        else if (st.series === "inter") y = Array.from({ length: n }, (_, t) => { const p = 0.28 + 0.22 * Math.sin((TAU * t) / per); return r() < p ? Math.round(-Math.log(1 - r()) * 3 + 1) : 0; });
        else y = Array.from({ length: n }, (_, t) => 12 + (t > 130 ? -5 : 0) + 3 * Math.sin((TAU * t) / per) + VZ.randn(r));
        fut = y.slice(Lc); y = y.slice(0, Lc);
      }
      /** 장난감 사전학습 모델: 계절 나이브 + 계절 차분 잔차의 분위수 + (입력 부호와 무관한) β·스케일 편향과 γ 꼬리 습관 */
      function toyForecast(x) {
        const n = x.length, res = [];
        for (let t = per; t < n; t++) res.push(x[t] - x[t - per]);
        res.sort((a, b) => a - b);
        const qr = (tau) => { const v = tau * (res.length - 1), i = Math.floor(v); return res[i] + (res[Math.min(res.length - 1, i + 1)] - res[i]) * (v - i); };
        const scale = Math.max(1e-6, VZ.std(res)), med = qr(0.5);
        return Array.from({ length: H }, (_, h) => {
          const base = x[n - per + (h % per)], grow = Math.sqrt(1 + Math.floor(h / per));
          return LV9.map((tau) => { let off = (qr(tau) - med) * grow; off *= off > 0 ? 1 + st.gamma : 1 - st.gamma; return base + med + st.beta * scale + off; });
        });
      }
      const nonneg = () => y.every((v) => v >= 0);
      const clip = (F) => (st.clip && nonneg() ? F.map((row) => row.map((v) => Math.max(0, v))) : F);
      const wql = (F) => { let s = 0; F.forEach((row, h) => row.forEach((q, k) => (s += pinball(fut[h], q, LV9[k])))); const d = fut.reduce((a, v) => a + Math.abs(v), 0) || 1; return (2 * s) / (LV9.length * d); };
      function compute() {
        F1 = toyForecast(y);
        const m = toyForecast(y.map((v) => -v));
        F2 = m.map((row) => row.map((_, k) => -row[LV9.length - 1 - k]));
        FA = F1.map((row, h) => row.map((v, k) => 0.5 * (v + F2[h][k])));
        F1 = clip(F1); F2 = clip(F2); FA = clip(FA);
        FF = st.sym ? FA : F1;
      }
      gen(); compute();
      const cv = S.canvas({ aspect: 0.5, minHeight: 240, maxHeight: 380 }, (ctx) => {
        const P = VZ.palette(), ctxPart = y.slice(Lc - SHOW);
        const all = [...ctxPart, ...fut, ...F1.flat(), ...F2.flat(), ...FA.flat()], lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.06;
        const C = VZ.chart(ctx, null, {
          x: [Lc - SHOW, Lc + H], y: [lo - pad, hi + pad], xLabel: "시간", title: "맥락 · 실제 미래 · 예측 분위수 (10~90% 띠와 중앙값)",
          series: [{ data: ctxPart.map((v, i) => [Lc - SHOW + i, v]), color: P.dim, width: 1.4 }, { data: fut.map((v, h) => [Lc + h, v]), color: P.text, width: 1.6, dash: [4, 3] }],
          vlines: [{ x: Lc, color: P.faint, label: "예측 시작" }],
        });
        const band = (F, col, a) => {
          ctx.fillStyle = VZ.alpha(col, a); ctx.beginPath();
          F.forEach((row, h) => (h ? ctx.lineTo : ctx.moveTo).call(ctx, C.X(Lc + h), C.Y(row[0])));
          for (let h = F.length - 1; h >= 0; h--) ctx.lineTo(C.X(Lc + h), C.Y(F[h][LV9.length - 1]));
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
          F.forEach((row, h) => (h ? ctx.lineTo : ctx.moveTo).call(ctx, C.X(Lc + h), C.Y(row[4])));
          ctx.stroke();
        };
        if (st.show === "all") { band(F1, P.accent2, 0.12); band(F2, P.warn, 0.12); band(FA, P.accent, 0.22); }
        else band(FF, P.accent, 0.22);
      });
      S.legend([
        { label: "단일 패스 f(x)", color: (P) => P.accent2 }, { label: "반전 패스 −f(−x)", color: (P) => P.warn },
        { label: "평균 (기본 출력)", color: (P) => P.accent }, { label: "실제 미래", color: (P) => P.text, dash: true },
      ]);
      const set = S.stats([{ k: "w1", label: "단일 패스 WQL" }, { k: "w2", label: "반전 패스 WQL" }, { k: "wa", label: "반전 평균 WQL" }, { k: "c", label: "최종 출력 · 순전파 횟수" }]);
      function upd() {
        compute(); cv.redraw();
        const a = wql(F1), b = wql(F2), c = wql(FA);
        set("w1", a.toFixed(3)); set("w2", b.toFixed(3));
        set("wa", c.toFixed(3) + `<small> (${c <= a ? "−" : "+"}${Math.abs(((c - a) / a) * 100).toFixed(0)}%)</small>`);
        set("c", st.sym ? "평균 · 2×" : "단일 · 1×");
      }
      S.select({ label: "시계열", options: [["season", "계절 + 추세"], ["inter", "간헐 수요 (음수 없음)"], ["shift", "레벨 하락 이후"]], value: st.series, onChange: (v) => { st.series = v; gen(); upd(); } });
      S.range({ label: "모델 편향 β (× 스케일)", min: -1, max: 1, step: 0.05, value: st.beta, fmt: (v) => v.toFixed(2), onInput: (v) => { st.beta = v; upd(); } });
      S.range({ label: "꼬리 습관 γ", min: -0.8, max: 0.8, step: 0.05, value: st.gamma, fmt: (v) => v.toFixed(2), onInput: (v) => { st.gamma = v; upd(); } });
      S.check({ label: "반전 평균 (symmetric_averaging)", value: true, onChange: (v) => { st.sym = v; upd(); } });
      S.check({ label: "비음수 클리핑 (clip_nonnegative)", value: true, onChange: (v) => { st.clip = v; upd(); } });
      S.seg({ label: "보기", options: [["all", "세 가지 모두"], ["final", "최종 출력만"]], value: st.show, onChange: (v) => { st.show = v; upd(); } });
      S.button("새 데이터", () => { st.seed++; gen(); upd(); }, { primary: true });
      upd();
    },
  });
})();
