/* ==========================================================================
   수학 실험 모음 (field: "math")
   bayes-base-rate — 기저율·민감도·특이도와 양성 예측도
   dist-explorer   — 자주 만나는 분포의 질량·밀도 함수, 누적 분포 함수, 표본의 평균과 분산
   gauss2d         — 2변량 정규 분포의 등고선 타원, 주축, 조건부 분포
   clt             — 표본 평균의 분포와 누적 평균 (큰 수의 법칙, 중심 극한 정리)
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------ 분포 도구 (dist-explorer) */
  // <dist-lib>
  // 로그 감마 함수 (Lanczos 근사, g=7)
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    x -= 1;
    let a = c[0];
    const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  // 정규화된 불완전 감마 함수 P(a, x) = 감마 분포의 누적 분포 함수 (급수와 연분수)
  function gammaP(a, x) {
    if (x <= 0) return 0;
    const pre = Math.exp(-x + a * Math.log(x) - lgamma(a));
    if (x < a + 1) {
      let ap = a, sum = 1 / a, del = sum;
      for (let n = 0; n < 500; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; }
      return sum * pre;
    }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a);
      b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return 1 - pre * h;
  }
  // 정규화된 불완전 베타 함수 I_x(a, b) = 베타 분포의 누적 분포 함수 (연분수)
  function betaI(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const front = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    const cf = (x, a, b) => {
      let c = 1, d = 1 - ((a + b) * x) / (a + 1);
      if (Math.abs(d) < 1e-300) d = 1e-300;
      d = 1 / d;
      let h = d;
      for (let m = 1; m < 500; m++) {
        const m2 = 2 * m;
        let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
        d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
        c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
        d = 1 / d; h *= d * c;
        aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
        d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
        c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
        d = 1 / d;
        const del = d * c; h *= del;
        if (Math.abs(del - 1) < 1e-14) break;
      }
      return h;
    };
    return x < (a + 1) / (a + b + 2) ? (front * cf(x, a, b)) / a : 1 - (front * cf(1 - x, b, a)) / b;
  }
  // 감마 표본 (Marsaglia-Tsang). 모양 a, 비율 1
  function gammaSample(a, rand) {
    if (a < 1) return gammaSample(a + 1, rand) * Math.pow(rand() || 1e-12, 1 / a);
    const d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = VZ.randn(rand); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = rand();
      if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  const lbinom = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
  // 분포 표: 각 분포는 모수 슬롯과, 모수 값에서 모형(질량·밀도, 누적, 평균, 분산, 표집)을 만드는 make를 갖는다
  const DIST = {
    bernoulli: {
      name: "베르누이 분포", disc: true,
      slots: [{ label: "성공 확률 p", lo: 0.05, hi: 0.95, step: 0.01, def: 0.3, fmt: (v) => v.toFixed(2) }],
      make: ([p]) => ({
        title: "Bernoulli(" + p.toFixed(2) + ")", ks: [0, 1], xr: [-0.7, 1.7],
        f: (k) => (k === 1 ? p : k === 0 ? 1 - p : 0), F: (x) => (x < 0 ? 0 : x < 1 ? 1 - p : 1),
        mean: p, vari: p * (1 - p), sample: (u) => (u() < p ? 1 : 0),
      }),
    },
    binomial: {
      name: "이항 분포", disc: true,
      slots: [
        { label: "시행 횟수 n", lo: 1, hi: 60, step: 1, def: 20, fmt: (v) => String(v) },
        { label: "성공 확률 p", lo: 0.05, hi: 0.95, step: 0.01, def: 0.3, fmt: (v) => v.toFixed(2) },
      ],
      make: ([n, p]) => {
        const f = (k) => (k < 0 || k > n ? 0 : Math.exp(lbinom(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)));
        const cum = []; let s = 0;
        for (let k = 0; k <= n; k++) { s += f(k); cum.push(Math.min(1, s)); }
        return {
          title: "Binomial(" + n + ", " + p.toFixed(2) + ")", ks: Array.from({ length: n + 1 }, (_, k) => k), xr: [-0.8, n + 0.8],
          f, F: (x) => (x < 0 ? 0 : x >= n ? 1 : cum[Math.floor(x)]),
          mean: n * p, vari: n * p * (1 - p),
          sample: (u) => { let c = 0; for (let i = 0; i < n; i++) if (u() < p) c++; return c; },
        };
      },
    },
    geometric: {
      name: "기하 분포", disc: true,
      slots: [{ label: "성공 확률 p", lo: 0.1, hi: 0.9, step: 0.01, def: 0.25, fmt: (v) => v.toFixed(2) }],
      make: ([p]) => {
        const q = 1 - p, kmax = Math.min(60, Math.max(8, Math.ceil(Math.log(0.002) / Math.log(q))));
        return {
          title: "Geometric(" + p.toFixed(2) + ")", ks: Array.from({ length: kmax }, (_, i) => i + 1), xr: [0.2, kmax + 0.8],
          f: (k) => (k < 1 ? 0 : Math.pow(q, k - 1) * p), F: (x) => (x < 1 ? 0 : 1 - Math.pow(q, Math.floor(x))),
          mean: 1 / p, vari: q / (p * p),
          sample: (u) => Math.max(1, Math.ceil(Math.log(1 - u()) / Math.log(q))),
        };
      },
    },
    poisson: {
      name: "포아송 분포", disc: true,
      slots: [{ label: "평균 개수 λ", lo: 0.5, hi: 20, step: 0.1, def: 3, fmt: (v) => v.toFixed(1) }],
      make: ([lam]) => {
        const kmax = Math.ceil(lam + 5 * Math.sqrt(lam) + 4);
        const f = (k) => (k < 0 ? 0 : Math.exp(k * Math.log(lam) - lam - lgamma(k + 1)));
        const cum = []; let s = 0;
        for (let k = 0; k <= kmax; k++) { s += f(k); cum.push(Math.min(1, s)); }
        return {
          title: "Poisson(" + lam.toFixed(1) + ")", ks: Array.from({ length: kmax + 1 }, (_, k) => k), xr: [-0.8, kmax + 0.8],
          f, F: (x) => (x < 0 ? 0 : x >= kmax ? 1 : cum[Math.floor(x)]),
          mean: lam, vari: lam,
          sample: (u) => { const L = Math.exp(-lam); let k = 0, pr = 1; do { k++; pr *= u(); } while (pr > L); return k - 1; },
        };
      },
    },
    uniform: {
      name: "균등 분포", disc: false,
      slots: [
        { label: "시작점 a", lo: -3, hi: 2, step: 0.1, def: 0, fmt: (v) => v.toFixed(1) },
        { label: "길이 b−a", lo: 0.5, hi: 6, step: 0.1, def: 2, fmt: (v) => v.toFixed(1) },
      ],
      make: ([a, len]) => {
        const b = a + len;
        return {
          title: "Uniform(" + a.toFixed(1) + ", " + b.toFixed(1) + ")", xr: [-4, 8],
          f: (x) => (x >= a && x <= b ? 1 / len : 0), F: (x) => (x <= a ? 0 : x >= b ? 1 : (x - a) / len),
          mean: (a + b) / 2, vari: (len * len) / 12, sample: (u) => a + len * u(),
        };
      },
    },
    exponential: {
      name: "지수 분포", disc: false,
      slots: [{ label: "비율 λ", lo: 0.5, hi: 3, step: 0.05, def: 1, fmt: (v) => v.toFixed(2) }],
      make: ([lam]) => ({
        title: "Exponential(" + lam.toFixed(2) + ")", xr: [0, 8],
        f: (x) => (x < 0 ? 0 : lam * Math.exp(-lam * x)), F: (x) => (x <= 0 ? 0 : 1 - Math.exp(-lam * x)),
        mean: 1 / lam, vari: 1 / (lam * lam), sample: (u) => -Math.log(1 - u()) / lam,
      }),
    },
    gamma: {
      name: "감마 분포", disc: false,
      slots: [
        { label: "모양 α", lo: 0.5, hi: 10, step: 0.1, def: 3, fmt: (v) => v.toFixed(1) },
        { label: "비율 λ", lo: 0.5, hi: 3, step: 0.05, def: 1, fmt: (v) => v.toFixed(2) },
      ],
      make: ([al, lam]) => ({
        title: "Gamma(" + al.toFixed(1) + ", " + lam.toFixed(2) + ")", xr: [0, Math.max(2, Math.ceil((al + 5 * Math.sqrt(al)) / lam))], diverges: al < 1,
        f: (x) => (x < 0 ? 0 : x === 0 ? (al === 1 ? lam : al < 1 ? Infinity : 0) : Math.exp(al * Math.log(lam) + (al - 1) * Math.log(x) - lam * x - lgamma(al))),
        F: (x) => gammaP(al, lam * x), mean: al / lam, vari: al / (lam * lam),
        sample: (u) => gammaSample(al, u) / lam,
      }),
    },
    normal: {
      name: "정규 분포", disc: false,
      slots: [
        { label: "평균 μ", lo: -5, hi: 5, step: 0.1, def: 0, fmt: (v) => v.toFixed(1) },
        { label: "표준편차 σ", lo: 0.5, hi: 2.5, step: 0.05, def: 1, fmt: (v) => v.toFixed(2) },
      ],
      make: ([mu, sg]) => ({
        title: "Normal(" + mu.toFixed(1) + ", " + (sg * sg).toFixed(2) + ")", xr: [-10, 10],
        f: (x) => Math.exp(-0.5 * ((x - mu) / sg) ** 2) / (sg * Math.sqrt(2 * Math.PI)),
        F: (x) => { const z = (x - mu) / (sg * Math.SQRT2); const p = 0.5 * gammaP(0.5, z * z); return z >= 0 ? 0.5 + p : 0.5 - p; },
        mean: mu, vari: sg * sg, sample: (u) => mu + sg * VZ.randn(u),
      }),
    },
    beta: {
      name: "베타 분포", disc: false,
      slots: [
        { label: "α", lo: 0.5, hi: 10, step: 0.1, def: 2, fmt: (v) => v.toFixed(1) },
        { label: "β", lo: 0.5, hi: 10, step: 0.1, def: 5, fmt: (v) => v.toFixed(1) },
      ],
      make: ([al, be]) => ({
        title: "Beta(" + al.toFixed(1) + ", " + be.toFixed(1) + ")", xr: [-0.05, 1.05], diverges: al < 1 || be < 1,
        f: (x) => (x < 0 || x > 1 ? 0 : x === 0 || x === 1 ? (x === 0 ? (al < 1 ? Infinity : al === 1 ? be : 0) : be < 1 ? Infinity : be === 1 ? al : 0) : Math.exp(lgamma(al + be) - lgamma(al) - lgamma(be) + (al - 1) * Math.log(x) + (be - 1) * Math.log(1 - x))),
        F: (x) => betaI(x, al, be), mean: al / (al + be), vari: (al * be) / ((al + be) ** 2 * (al + be + 1)),
        sample: (u) => { const x = gammaSample(al, u), y = gammaSample(be, u); return x / (x + y); },
      }),
    },
  };
  // </dist-lib>

  Lab.register({
    id: "dist-explorer", field: "math", thumb: "bars", layout: "stack",
    title: "분포 탐색기 — 모수를 바꿔 모양을 보기",
    desc: "자주 만나는 분포 아홉 가지의 모수를 바꾸며 질량·밀도 함수, 누적 분포 함수, 표본의 평균과 분산을 이론값과 비교합니다.",
    tags: ["확률 분포", "이항 분포", "포아송 분포", "정규 분포", "감마·베타 분포"],
    note: "해볼 것: 이항 분포에서 n을 키우고 p를 줄여 np를 3 근처로 두었다가 포아송 분포(λ=3)와 모양을 비교하세요. 감마 분포에서 α=1은 지수 분포이고 α가 커질수록 정규 분포를 닮아 갑니다. 표본 수를 100에서 10,000으로 올리면 표본 평균과 분산이 이론값에 다가갑니다. 표본은 시드를 고정해 뽑으며, '다시 뽑기'는 같은 설정에서 다른 표본을 뽑습니다.",
    mount(S) {
      const st = { key: "binomial", vals: [], seed: 1, n: 1000 };
      let model = null, xs = [], sorted = [], hist = null;
      const fmt = (v) => VZ.fmt(v, 4);
      const cv = S.canvas({ aspect: 0.92, minHeight: 380, maxHeight: 580 }, (ctx, w, h) => {
        if (!model) return;
        const P = VZ.palette();
        const top = { x: 0, y: 0, w, h: Math.round(h * 0.6) }, bot = { x: 0, y: Math.round(h * 0.6), w, h: h - Math.round(h * 0.6) };
        const d = DIST[st.key], m = model, [x0, x1] = m.xr;
        const grid = Array.from({ length: 241 }, (_, i) => x0 + ((x1 - x0) * i) / 240);
        // 위: 질량·밀도 함수와 표본
        let thMax = 0, series = [];
        if (d.disc) {
          const bars = m.ks.map((k) => [k, m.f(k)]);
          thMax = Math.max(...bars.map((b) => b[1]));
          series.push({ type: "bar", data: bars, barWidth: m.ks.length > 30 ? 0.9 : 0.7, color: P.accent, alpha: 0.5 });
          series.push({ type: "scatter", data: m.ks.map((k) => [k, hist.freq[k] || 0]), color: P.accent2, r: 3.4 });
          hist.max = Math.max(...m.ks.map((k) => hist.freq[k] || 0));
        } else {
          const skip = m.diverges ? 7 : 0;
          const ys = grid.map((x) => m.f(x));
          thMax = Math.max(...ys.slice(skip, ys.length - skip).filter(isFinite));
          series.push({ type: "bar", data: hist.centers.map((c, i) => [c, hist.dens[i]]), barWidth: hist.bw, color: P.accent2, alpha: 0.38 });
          series.push({ type: "line", data: grid.map((x, i) => [x, ys[i]]), color: P.accent, width: 2.4 });
        }
        const ymax = 1.2 * Math.max(thMax, Math.min(d.disc ? hist.max : Math.max(...hist.dens), 1.5 * thMax));
        // 이산 분포의 가로축은 정수 눈금만 쓴다
        let xTicks;
        if (d.disc) { const step = m.ks.length <= 12 ? 1 : m.ks.length <= 25 ? 2 : m.ks.length <= 50 ? 5 : 10; xTicks = m.ks.filter((k) => k % step === 0); }
        VZ.chart(ctx, top, { x: [x0, x1], y: [0, ymax], xTicks, title: m.title + " — " + (d.disc ? "확률 질량 함수" : "확률 밀도 함수"), series, vlines: [{ x: m.mean, color: P.dim, label: "평균", dash: [5, 4] }], margin: { l: 46 }, yFmt: (v) => String(Number(v.toPrecision(3))) });
        // 아래: 누적 분포 함수와 경험 누적 분포 함수
        const ecdf = (x) => { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= x) lo = mid + 1; else hi = mid; } return lo / sorted.length; };
        let cdfS, ecdfS;
        if (d.disc) {
          const pts = [[x0, 0]].concat(m.ks.map((k) => [k, m.F(k)]), [[x1, 1]]);
          cdfS = { type: "step", data: pts, color: P.accent, width: 2.2 };
          ecdfS = { type: "step", data: [[x0, 0]].concat(m.ks.map((k) => [k, ecdf(k)]), [[x1, ecdf(x1)]]), color: P.accent2, width: 1.6, dash: [5, 3] };
        } else {
          cdfS = { type: "line", data: grid.map((x) => [x, m.F(x)]), color: P.accent, width: 2.2 };
          ecdfS = { type: "line", data: grid.map((x) => [x, ecdf(x)]), color: P.accent2, width: 1.6, dash: [5, 3] };
        }
        VZ.chart(ctx, bot, { x: [x0, x1], y: [0, 1.04], xTicks, title: "누적 분포 함수", series: [cdfS, ecdfS], yTicks: [0, 0.5, 1], margin: { l: 46 }, yFmt: (v) => String(v) });
      });
      const set = S.stats([
        { k: "mean", label: "평균 (이론)" },
        { k: "smean", label: "평균 (표본)" },
        { k: "var", label: "분산 (이론)" },
        { k: "svar", label: "분산 (표본)" },
      ]);
      function build() {
        const d = DIST[st.key];
        model = d.make(st.vals);
        const rand = VZ.rng(st.seed * 7919 + 17);
        xs = new Array(st.n);
        for (let i = 0; i < st.n; i++) xs[i] = model.sample(rand);
        sorted = xs.slice().sort((a, b) => a - b);
        const mean = xs.reduce((s, v) => s + v, 0) / st.n;
        const vari = xs.reduce((s, v) => s + (v - mean) ** 2, 0) / (st.n - 1);
        if (d.disc) {
          const freq = {};
          xs.forEach((v) => { freq[v] = (freq[v] || 0) + 1 / st.n; });
          hist = { freq, max: 0 };
        } else {
          const NB = 40, [x0, x1] = model.xr, bw = (x1 - x0) / NB, cnt = new Array(NB).fill(0);
          xs.forEach((v) => { const b = Math.floor((v - x0) / bw); if (b >= 0 && b < NB) cnt[b]++; });
          hist = { bw, centers: cnt.map((_, i) => x0 + (i + 0.5) * bw), dens: cnt.map((c) => c / (st.n * bw)) };
        }
        set("mean", fmt(model.mean));
        set("smean", fmt(mean));
        set("var", fmt(model.vari));
        set("svar", fmt(vari));
        cv.redraw();
      }
      // 슬라이더는 0–100 위치로 두고 분포마다 모수 범위로 옮긴다 (범위가 분포마다 다르기 때문)
      const slots = [];
      const toVal = (spec, pos) => { const v = spec.lo + ((spec.hi - spec.lo) * pos) / 100; return Number((Math.round(v / spec.step) * spec.step).toFixed(6)); };
      const toPos = (spec, v) => Math.round((100 * (v - spec.lo)) / (spec.hi - spec.lo));
      const kinds = Object.keys(DIST).map((k) => [k, DIST[k].name]);
      S.select({ label: "분포", options: kinds, value: st.key, onChange: (k) => { st.key = k; configure(); } });
      [0, 1].forEach((i) => {
        slots[i] = S.range({ label: "모수", min: 0, max: 100, step: 1, value: 50,
          fmt: (pos) => { const spec = DIST[st.key].slots[i]; return spec ? spec.fmt(toVal(spec, pos)) : ""; },
          onInput: (pos) => { st.vals[i] = toVal(DIST[st.key].slots[i], pos); build(); } });
      });
      function configure() {
        const d = DIST[st.key];
        st.vals = d.slots.map((s) => s.def);
        slots.forEach((get, i) => {
          const wrap = get.el.parentElement, spec = d.slots[i];
          wrap.style.display = spec ? "" : "none";
          if (!spec) return;
          wrap.querySelector("span").firstChild.nodeValue = spec.label + " ";
          get.set(toPos(spec, spec.def), false);
          st.vals[i] = toVal(spec, toPos(spec, spec.def));
        });
        build();
      }
      S.seg({ label: "표본 수", options: [[100, "100"], [1000, "1,000"], [10000, "10,000"]], value: st.n, onChange: (v) => { st.n = Number(v); build(); } });
      S.button("다시 뽑기", () => { st.seed++; build(); }, { primary: true });
      S.legend([
        { label: "이론 (질량·밀도·누적)", color: (p) => p.accent },
        { label: "표본 (빈도·히스토그램·경험 누적)", color: (p) => p.accent2 },
      ]);
      configure();
    },
  });

  Lab.register({
    id: "bayes-base-rate", field: "math", thumb: "bars", layout: "stack",
    title: "기저율과 베이즈 정리 — 양성의 의미",
    desc: "기저율, 민감도, 특이도를 바꾸고 양성 중 실제 해당자의 몫을 넓이로 확인합니다.",
    tags: ["베이즈 정리", "기저율", "조건부 확률", "분류"],
    note: "해볼 것: 민감도와 특이도를 고정하고 기저율만 1%에서 10%로 바꿔 보세요. 맨 아래 막대에서 양성 판정 가운데 진양성의 몫이 어떻게 바뀌는지 보세요. 그림의 넓이는 1만 명을 비율대로 나눈 <b>기대 인원</b>이며 실제 표집 결과가 아닙니다.",
    mount(S) {
      const st = { prior: 1, sensitivity: 90, specificity: 95 };
      const fmt = (n) => Number(n.toFixed(1)).toLocaleString("ko-KR", { maximumFractionDigits: 1 });
      const pct = (n) => (100 * n).toFixed(1) + "%";
      const cv = S.canvas({ aspect: 0.5, minHeight: 330, maxHeight: 440 }, (ctx, w, h) => {
        const P = VZ.palette();
        const pi = st.prior / 100, s = st.sensitivity / 100, f = 1 - st.specificity / 100;
        const left = 18, right = w - 18, top = 52, bottom = h - 112, width = right - left, height = bottom - top;
        const split = left + width * pi;
        // 전체 넓이는 모집단에서 해당 집단의 비율이다. 각 열 안에서 세로 길이는 양성률이다.
        ctx.fillStyle = VZ.alpha(P.accent, 0.16);
        ctx.fillRect(left, top, width * pi, height);
        ctx.fillStyle = VZ.alpha(P.warn, 0.13);
        ctx.fillRect(split, top, width * (1 - pi), height);
        ctx.fillStyle = P.accent;
        ctx.fillRect(left, top, width * pi, height * s);
        ctx.fillStyle = P.warn;
        ctx.fillRect(split, top, width * (1 - pi), height * f);
        ctx.strokeStyle = P.axis;
        ctx.strokeRect(left, top, width, height);
        ctx.beginPath(); ctx.moveTo(split, top); ctx.lineTo(split, bottom); ctx.stroke();
        ctx.fillStyle = P.text;
        ctx.font = VZ.font(13, false, 700);
        ctx.textAlign = "left";
        ctx.fillText("전체 10,000명 (기대 인원)", left, 26);
        ctx.font = VZ.font(11, false);
        ctx.fillStyle = P.dim;
        ctx.fillText("실제 해당자", left, bottom + 18);
        ctx.textAlign = "right";
        ctx.fillText("비해당자", right, bottom + 18);
        // 열의 폭이 너무 좁아 보이지 않아도 위 판독값은 항상 정확한 넓이를 계산한다.
        if (width * pi < 2) {
          ctx.strokeStyle = P.accent;
          ctx.beginPath(); ctx.moveTo(left, top - 5); ctx.lineTo(left + 8, top - 5); ctx.stroke();
        }
        ctx.font = VZ.font(11, false, 700);
        ctx.textAlign = "right";
        ctx.fillStyle = P.warn;
        ctx.fillText("위양성 " + fmt(10000 * (1 - pi) * f) + "명", right - 7, Math.min(bottom - 9, top + height * f + 15));
        ctx.textAlign = "left";
        ctx.fillStyle = P.accent;
        ctx.fillText("진양성 " + fmt(10000 * pi * s) + "명", left + 6, top - 9);
        // 양성 판정자만 모은 막대: 위 그림의 두 양성 넓이를 한 줄로 이어 붙이면 진양성의 몫이 곧 양성 예측도다
        const tp = pi * s, fp = (1 - pi) * f, ppv = tp / (tp + fp), by = bottom + 62, bh = 22;
        ctx.font = VZ.font(12, false, 700);
        ctx.fillStyle = P.text;
        ctx.fillText("양성 판정 " + fmt(10000 * (tp + fp)) + "명만 모으면", left, by - 10);
        ctx.textAlign = "right";
        ctx.fillStyle = P.accent;
        ctx.fillText("진양성의 몫 " + pct(ppv), right, by - 10);
        ctx.fillRect(left, by, width * ppv, bh);
        ctx.fillStyle = P.warn;
        ctx.fillRect(left + width * ppv, by, width * (1 - ppv), bh);
        ctx.strokeStyle = P.axis;
        ctx.strokeRect(left, by, width, bh);
      });
      const set = S.stats([
        { k: "tp", label: "진양성 / 1만 명" },
        { k: "fp", label: "위양성 / 1만 명" },
        { k: "positive", label: "전체 양성 / 1만 명" },
        { k: "ppv", label: "양성 예측도" },
      ]);
      function update() {
        const pi = st.prior / 100, s = st.sensitivity / 100, f = 1 - st.specificity / 100;
        const tp = 10000 * pi * s, fp = 10000 * (1 - pi) * f;
        set("tp", fmt(tp) + "명");
        set("fp", fmt(fp) + "명");
        set("positive", fmt(tp + fp) + "명");
        set("ppv", pct(tp / (tp + fp)));
        cv.redraw();
      }
      S.range({ label: "기저율 P(D)", min: 0.1, max: 50, step: 0.1, value: st.prior,
        fmt: (v) => v.toFixed(1) + "%", onInput: (v) => { st.prior = v; update(); } });
      S.range({ label: "민감도 P(+|D)", min: 50, max: 100, step: 1, value: st.sensitivity,
        fmt: (v) => v + "%", onInput: (v) => { st.sensitivity = v; update(); } });
      S.range({ label: "특이도 P(-|Dᶜ)", min: 50, max: 100, step: 1, value: st.specificity,
        fmt: (v) => v + "%", onInput: (v) => { st.specificity = v; update(); } });
      S.legend([
        { label: "실제 해당 · 양성", color: (p) => p.accent },
        { label: "비해당 · 양성", color: (p) => p.warn },
      ]);
      update();
    },
  });

  // <gauss2d-lib>
  // 이변량 정규 분포: 모수 → 공분산의 고유분해, 조건부 분포, 표집 (5장)
  function g2model(mx, my, sx, sy, rho) {
    const a = sx * sx, c = sy * sy, b = rho * sx * sy;
    const disc = Math.sqrt((a - c) ** 2 + 4 * b * b);
    const th = 0.5 * Math.atan2(2 * b, a - c); // 큰 고유값 쪽 주축의 각도
    const s = Math.sqrt(1 - rho * rho);
    return {
      mx, my, sx, sy, rho, th, s,
      l1: (a + c + disc) / 2, l2: (a + c - disc) / 2,
      q1: [Math.cos(th), Math.sin(th)], q2: [-Math.sin(th), Math.cos(th)],
      slope: (rho * sy) / sx,
      condMean: (x) => my + rho * (sy / sx) * (x - mx),
      condSd: sy * s,
      // 표준 정규 쌍 (z1, z2) → 표본. 콜레스키 인자 L = [[sx, 0], [rho sy, sy sqrt(1 - rho^2)]]
      map: (z1, z2) => [mx + sx * z1, my + sy * (rho * z1 + s * z2)],
      // 마할라노비스 거리의 제곱
      delta2: (x, y) => { const u = (x - mx) / sx, v = (y - my) / sy; return (u * u - 2 * rho * u * v + v * v) / (s * s); },
    };
  }
  // 표본 2×2 공분산 행렬의 고유값 (큰 쪽, 작은 쪽)
  function g2eig(a, b, c) {
    const disc = Math.sqrt((a - c) ** 2 + 4 * b * b);
    return [(a + c + disc) / 2, (a + c - disc) / 2];
  }
  // </gauss2d-lib>

  Lab.register({
    id: "gauss2d", field: "math", thumb: "scatter", layout: "stack",
    title: "2변량 정규 분포 — 타원, 주축, 조건부 분포",
    desc: "평균, 표준편차, 상관계수를 바꾸며 이변량 정규 분포의 등고선 타원과 주축, 조건 x = x₀에서의 y의 분포(평균 직선과 분산)를 표본과 이론값으로 비교합니다.",
    tags: ["다변량 정규 분포", "공분산 행렬", "고유분해", "조건부 분포"],
    note: "해볼 것: ① ρ를 0에서 0.9까지 올리며 타원이 길어지고 주축(녹색)이 대각선으로 눕는 것을 보세요. 고유값은 σx = σy일 때 1 ± ρ입니다. ② σx와 σy를 다르게 두면 주축(녹색)과 평균 직선(주황)이 서로 다른 직선이 됩니다. 평균 직선의 기울기는 ρσy/σx이고 x₀를 옮기면 조건부 분포의 중심이 이 직선을 따라 움직입니다. ③ 조건부 분산 σy²(1 − ρ²)은 x₀에 상관없이 같습니다. ④ 표본의 조건부 평균과 분산은 x₀ ± 0.2σx 안에 든 표본으로 잽니다. x₀를 가장자리(예: 4σ)로 옮기면 그 표본이 8개 아래로 줄어 표본값을 내지 못하고(—), 표본이 적을 때는 이론값에서 크게 벗어납니다. 표본은 시드를 고정해 뽑고, 같은 표준 정규 난수에 모수를 입히므로 슬라이더를 움직이면 같은 점 구름이 변형됩니다. '다시 뽑기'는 다른 표본을 뽑습니다.",
    mount(S) {
      const st = { mx: 0, my: 0, sx: 1, sy: 1, rho: 0.8, x0: 1.5, n: 2000, seed: 1 };
      let Z = [], M = null, pts = [], band = null;
      const R = 6, fmt = (v) => VZ.fmt(v, 3), pct = (v) => (100 * v).toFixed(1) + "%";
      const draw = (ctx, w, h) => {
        if (!M) return;
        const P = VZ.palette(), m = M;
        const ml = 34, mr = 8, mt = 26, mb = 24;
        const q = Math.max(120, Math.min(h - mt - mb, 0.64 * w - ml - mr));
        const boxL = { x: 0, y: 0, w: q + ml + mr, h: q + mt + mb };
        const ticks = [-4, -2, 0, 2, 4];
        const c = VZ.chart(ctx, boxL, {
          x: [-R, R], y: [-R, R], xTicks: ticks, yTicks: ticks, title: "(x, y)의 표본", margin: { l: ml, r: mr, t: mt, b: mb },
          series: [{ type: "scatter", data: pts, color: P.accent, r: 2, alpha: 0.35 }],
          bands: band ? [{ x0: band.lo, x1: band.hi, color: VZ.alpha(P.accent2, 0.1) }] : [],
          vlines: [{ x: st.x0, color: P.dim, dash: [4, 4] }],
        });
        ctx.save();
        ctx.beginPath(); ctx.rect(c.box.x, c.box.y, c.box.w, c.box.h); ctx.clip();
        // 등고선 타원: 마할라노비스 거리 Δ = 1, 2, 3
        ctx.strokeStyle = P.accent; ctx.lineWidth = 1.8;
        [1, 2, 3].forEach((k) => {
          ctx.globalAlpha = 1.05 - 0.25 * k;
          ctx.beginPath();
          for (let i = 0; i <= 120; i++) { const t = (i / 120) * 2 * Math.PI, p = m.map(k * Math.cos(t), k * Math.sin(t)); i ? ctx.lineTo(c.X(p[0]), c.Y(p[1])) : ctx.moveTo(c.X(p[0]), c.Y(p[1])); }
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
        // 주축 (고유벡터 방향, 길이 2√λ)
        ctx.strokeStyle = P.ok; ctx.lineWidth = 2.2;
        [[m.q1, m.l1], [m.q2, m.l2]].forEach(([qv, l]) => {
          const r = 2 * Math.sqrt(l);
          ctx.beginPath(); ctx.moveTo(c.X(m.mx - r * qv[0]), c.Y(m.my - r * qv[1])); ctx.lineTo(c.X(m.mx + r * qv[0]), c.Y(m.my + r * qv[1])); ctx.stroke();
        });
        // 평균 직선 E[Y | X = x]
        ctx.strokeStyle = P.accent2; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(c.X(-R), c.Y(m.condMean(-R))); ctx.lineTo(c.X(R), c.Y(m.condMean(R))); ctx.stroke();
        // 조건부 평균 ± 표준편차
        const cm = m.condMean(st.x0);
        ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(c.X(st.x0), c.Y(cm - m.condSd)); ctx.lineTo(c.X(st.x0), c.Y(cm + m.condSd)); ctx.stroke();
        ctx.fillStyle = P.accent2; ctx.beginPath(); ctx.arc(c.X(st.x0), c.Y(cm), 5.5, 0, 7); ctx.fill();
        ctx.fillStyle = P.dim; ctx.beginPath(); ctx.arc(c.X(m.mx), c.Y(m.my), 3.5, 0, 7); ctx.fill();
        ctx.restore();
        // 오른쪽: x = x₀일 때 y의 분포 (이론 곡선, 근방 표본의 히스토그램, 주변 분포)
        const npdf = (y, mu, sd) => Math.exp(-0.5 * ((y - mu) / sd) ** 2) / (Math.sqrt(2 * Math.PI) * sd);
        const BW = 0.4, nb = Math.round((2 * R) / BW), cnt = new Array(nb).fill(0);
        if (band && band.ok) band.ys.forEach((v) => { const b = Math.floor((v + R) / BW); if (b >= 0 && b < nb) cnt[b]++; });
        const hd = band && band.ok ? cnt.map((v) => v / (band.ys.length * BW)) : [];
        const gy = VZ.linspace(-R, R, 241);
        const condPdf = (y) => npdf(y, cm, m.condSd), margPdf = (y) => npdf(y, m.my, m.sy);
        const dmax = 1.12 * Math.max(condPdf(cm), margPdf(m.my), ...hd, 0.05);
        const boxR = { x: boxL.w, y: 0, w: Math.max(40, w - boxL.w), h: boxL.h };
        const c2 = VZ.chart(ctx, boxR, {
          x: [0, dmax], y: [-R, R], xTicks: [], yTicks: [], title: "x = x₀일 때 y", margin: { l: 4, r: 6, t: mt, b: mb },
          series: [
            { type: "line", data: gy.map((y) => [margPdf(y), y]), color: P.dim, width: 1.6, dash: [5, 4] },
            { type: "line", data: gy.map((y) => [condPdf(y), y]), color: P.accent2, width: 2.6 },
          ],
        });
        ctx.save();
        ctx.beginPath(); ctx.rect(c2.box.x, c2.box.y, c2.box.w, c2.box.h); ctx.clip();
        ctx.fillStyle = VZ.alpha(P.accent2, 0.3);
        hd.forEach((d, i) => { if (d > 0) ctx.fillRect(c2.X(0), c2.Y(-R + (i + 1) * BW), c2.X(d) - c2.X(0), c2.Y(-R + i * BW) - c2.Y(-R + (i + 1) * BW)); });
        ctx.restore();
      };
      const cv = S.canvas({ aspect: 0.62, minHeight: 250, maxHeight: 560 }, draw);
      const set = S.stats([
        { k: "eigT", label: "고유값 λ₁, λ₂ (이론)" },
        { k: "eigS", label: "고유값 (표본)" },
        { k: "rhoS", label: "상관계수 (표본)" },
        { k: "cmT", label: "E[Y | x₀] (이론)" },
        { k: "cmS", label: "E[Y | x₀] (표본)" },
        { k: "cnt", label: "x₀ 근방 표본 수" },
        { k: "cvT", label: "Var(Y | x₀) (이론)" },
        { k: "cvS", label: "Var(Y | x₀) (표본)" },
        { k: "inT", label: "Δ ≤ 1, 2, 3 안의 비율 (이론)" },
        { k: "inS", label: "Δ ≤ 1, 2, 3 안의 비율 (표본)" },
      ]);
      function resample() {
        const rand = VZ.rng(st.seed * 104729 + 7);
        Z = Array.from({ length: st.n }, () => [VZ.randn(rand), VZ.randn(rand)]);
        update();
      }
      function update() {
        M = g2model(st.mx, st.my, st.sx, st.sy, st.rho);
        pts = Z.map((z) => M.map(z[0], z[1]));
        const n = pts.length;
        let mxs = 0, mys = 0;
        pts.forEach((p) => { mxs += p[0] / n; mys += p[1] / n; });
        let a = 0, b = 0, c = 0, i1 = 0, i2 = 0, i3 = 0;
        pts.forEach((p) => {
          a += (p[0] - mxs) ** 2 / (n - 1); b += ((p[0] - mxs) * (p[1] - mys)) / (n - 1); c += (p[1] - mys) ** 2 / (n - 1);
          const d2 = M.delta2(p[0], p[1]); if (d2 <= 1) i1++; if (d2 <= 4) i2++; if (d2 <= 9) i3++;
        });
        // x가 x₀ ± 0.2σx 안에 든 표본을 근방으로 삼는다 (8개 미만이면 표본값을 내지 않는다)
        const wd = 0.2 * st.sx;
        const ys = pts.filter((p) => Math.abs(p[0] - st.x0) <= wd).map((p) => p[1]);
        const enough = ys.length >= 8;
        band = { lo: st.x0 - wd, hi: st.x0 + wd, ys, ok: enough };
        const cm = enough ? VZ.mean(ys) : NaN, cvv = enough ? ys.reduce((s, v) => s + (v - cm) ** 2, 0) / (ys.length - 1) : NaN;
        const e = g2eig(a, b, c);
        set("eigT", fmt(M.l1) + ", " + fmt(M.l2));
        set("eigS", fmt(e[0]) + ", " + fmt(e[1]));
        set("rhoS", fmt(b / Math.sqrt(a * c)));
        set("cmT", fmt(M.condMean(st.x0)));
        set("cmS", fmt(cm));
        set("cnt", ys.length + "개 (|x − x₀| ≤ " + fmt(wd) + ")" + (enough ? "" : " · 너무 적음"));
        set("cvT", fmt(M.condSd ** 2));
        set("cvS", fmt(cvv));
        set("inT", [1, 4, 9].map((c2) => pct(1 - Math.exp(-c2 / 2))).join(" · "));
        set("inS", [i1, i2, i3].map((v) => pct(v / n)).join(" · "));
        cv.redraw();
      }
      const slider = (label, key, min, max, step, f) => S.range({ label, min, max, step, value: st[key], fmt: f, onInput: (v) => { st[key] = v; update(); } });
      const f1 = (v) => v.toFixed(1), f2 = (v) => v.toFixed(2);
      slider("평균 μx", "mx", -2, 2, 0.1, f1);
      slider("평균 μy", "my", -2, 2, 0.1, f1);
      slider("표준편차 σx", "sx", 0.5, 1.5, 0.1, f1);
      slider("표준편차 σy", "sy", 0.5, 1.5, 0.1, f1);
      slider("상관계수 ρ", "rho", -0.95, 0.95, 0.05, f2);
      slider("조건 값 x₀", "x0", -5, 5, 0.1, f1);
      S.seg({ label: "표본 수", options: [[500, "500"], [2000, "2,000"], [5000, "5,000"]], value: st.n, onChange: (v) => { st.n = Number(v); resample(); } });
      S.button("다시 뽑기", () => { st.seed++; resample(); }, { primary: true });
      S.legend([
        { label: "등고선 Δ = 1, 2, 3", color: (p) => p.accent },
        { label: "주축 (고유벡터)", color: (p) => p.ok },
        { label: "평균 직선 · 조건부 분포", color: (p) => p.accent2 },
        { label: "y의 주변 분포", color: (p) => p.dim, dash: true },
      ]);
      resample();
    },
  });

  // <clt-lib>
  // 표본 평균의 분포 (6장): 모분포와 모멘트, 표본 평균과 누적 평균의 표집, 정규 누적 분포 함수
  function normCdf(x) {
    // erfc의 체비쇼프 근사 (상대 오차 1.2e-7)
    const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? 1 - 0.5 * r : 0.5 * r;
  }
  function boxMuller(r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const CLT = {
    uniform: { name: "균등 U(0, 1)", mean: 0.5, vari: 1 / 12, skew: 0, sample: (r) => r() },
    exponential: { name: "지수 Exponential(1)", mean: 1, vari: 1, skew: 2, sample: (r) => { let u = 0; while (u === 0) u = r(); return -Math.log(u); } },
    bernoulli: { name: "베르누이 Bernoulli(0.1)", mean: 0.1, vari: 0.09, skew: 0.8 / 0.3, sample: (r) => (r() < 0.1 ? 1 : 0) },
    lognormal: { name: "로그정규 (σ = 1)", mean: Math.exp(0.5), vari: (Math.E - 1) * Math.E, skew: (Math.E + 2) * Math.sqrt(Math.E - 1), sample: (r) => Math.exp(boxMuller(r)) },
    cauchy: { name: "코시 Cauchy(0, 1)", mean: NaN, vari: NaN, skew: NaN, sample: (r) => Math.tan(Math.PI * (r() - 0.5)) },
  };
  // n개의 평균을 R번 구한다
  function sampleMeans(d, n, R, rand) {
    const out = new Float64Array(R);
    for (let i = 0; i < R; i++) { let s = 0; for (let k = 0; k < n; k++) s += d.sample(rand); out[i] = s / n; }
    return out;
  }
  // 한 번의 표집에서 k = 1..M의 누적 평균
  function runningMeans(d, M, rand) {
    const out = new Float64Array(M);
    let s = 0;
    for (let k = 0; k < M; k++) { s += d.sample(rand); out[k] = s / (k + 1); }
    return out;
  }
  function momentsOf(a) {
    const n = a.length;
    let m = 0;
    for (let i = 0; i < n; i++) m += a[i] / n;
    let v = 0, c3 = 0;
    for (let i = 0; i < n; i++) { const e = a[i] - m; v += e * e; c3 += e * e * e; }
    const sd = Math.sqrt(v / (n - 1));
    return { mean: m, sd, skew: c3 / n / Math.pow(v / n, 1.5) };
  }
  function quantileOf(sorted, q) {
    const p = q * (sorted.length - 1), lo = Math.floor(p), hi = Math.ceil(p);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo);
  }
  // 표준화한 값들과 N(0,1) 사이의 콜모고로프-스미르노프 거리 sup|F_n − Φ|
  function ksToNormal(zs) {
    const s = Float64Array.from(zs).sort(), n = s.length;
    let d = 0;
    for (let i = 0; i < n; i++) { const f = normCdf(s[i]); d = Math.max(d, Math.abs((i + 1) / n - f), Math.abs(i / n - f)); }
    return d;
  }
  // </clt-lib>

  Lab.register({
    id: "clt", field: "math", thumb: "bars", layout: "stack",
    title: "중심 극한 정리 — 표본 평균의 분포",
    desc: "모분포와 표본 크기 n을 바꾸며 표본 평균 2,000개의 히스토그램을 정규 근사와 비교하고, 표준 오차 σ/√n과 왜도 γ/√n의 이론값을 잽니다. 아래 그림은 한 번의 표집에서 누적 평균이 모평균에 다가가는 모습입니다. 코시 분포에서는 어느 쪽도 일어나지 않습니다.",
    tags: ["중심 극한 정리", "큰 수의 법칙", "표준 오차", "코시 분포"],
    note: "해볼 것: ① 균등 분포에서 n을 1에서 5까지만 올려도 히스토그램이 종 모양이 됩니다. ② 지수·베르누이·로그정규처럼 치우친 분포는 더 큰 n이 필요합니다. 왜도가 γ/√n으로 줄어드는 것을 판독값에서 보세요. 로그정규는 n = 100에서도 조금 치우쳐 있습니다. ③ 베르누이 분포에서 n이 작으면 평균이 k/n 값만 가져서 막대가 듬성듬성합니다. ④ 코시 분포에서는 n을 키워도 표본 평균의 사분위 범위가 2로 그대로이고, 아래 누적 평균은 가끔 큰 값이 나올 때마다 튑니다. 가로축을 '표본 평균'으로 바꾸면 n이 커질수록 분포가 좁아지는 것(σ/√n)이 보입니다. 표본은 시드를 고정해 뽑으며 KS 거리에는 표본 2,000개에서 오는 ±0.03 정도의 흔들림이 섞입니다.",
    mount(S) {
      const st = { key: "exponential", pos: 40, n: 16, axis: "z", seed: 1 };
      const R = 2000, MPATH = 3000;
      let means = null, path = null;
      const fmt = (v) => VZ.fmt(v, 3);
      const nOf = (pos) => Math.max(1, Math.round(Math.pow(10, (pos * 3) / 100)));
      const cv = S.canvas({ aspect: 0.92, minHeight: 380, maxHeight: 600 }, (ctx, w, h) => {
        if (!means) return;
        const P = VZ.palette(), d = CLT[st.key], n = st.n, cauchy = st.key === "cauchy";
        const se = Math.sqrt(d.vari / n), mu = d.mean;
        const top = { x: 0, y: 0, w, h: Math.round(h * 0.6) }, bot = { x: 0, y: Math.round(h * 0.6), w, h: h - Math.round(h * 0.6) };
        const standard = st.axis === "z" && !cauchy;
        let lo, hi, title, curve;
        if (cauchy) { lo = -8; hi = 8; title = "표본 평균 X̄ (n = " + n + ")의 분포 — 코시(0, 1)와 같다"; curve = (x) => 1 / (Math.PI * (1 + x * x)); }
        else if (standard) { lo = -4; hi = 4; title = "표준화한 표본 평균 Z = (X̄ − μ)/(σ/√n), n = " + n; curve = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }
        else { lo = mu - 4 * se; hi = mu + 4 * se; title = "표본 평균 X̄ (n = " + n + ")의 분포 — 정규 N(μ, σ²/n)과 비교"; curve = (x) => Math.exp(-0.5 * ((x - mu) / se) ** 2) / (Math.sqrt(2 * Math.PI) * se); }
        const NB = 40, bw = (hi - lo) / NB, cnt = new Array(NB).fill(0);
        for (let i = 0; i < R; i++) {
          const v = standard ? (means[i] - mu) / se : means[i];
          const b = Math.floor((v - lo) / bw);
          if (b >= 0 && b < NB) cnt[b]++;
        }
        const dens = cnt.map((c) => c / (R * bw));
        const grid = Array.from({ length: 241 }, (_, i) => lo + ((hi - lo) * i) / 240);
        const ymax = 1.15 * Math.max(...dens, ...grid.map(curve));
        VZ.chart(ctx, top, {
          x: [lo, hi], y: [0, ymax], title, margin: { l: 46 }, yFmt: (v) => String(Number(v.toPrecision(2))),
          series: [
            { type: "bar", data: dens.map((v, i) => [lo + (i + 0.5) * bw, v]), barWidth: bw, color: P.accent2, alpha: 0.42 },
            { type: "line", data: grid.map((x) => [x, curve(x)]), color: P.accent, width: 2.4 },
          ],
        });
        // 아래: 한 번의 표집에서 누적 평균
        const ks = Array.from({ length: MPATH }, (_, i) => i + 1);
        const ylo = cauchy ? -6 : mu - 2.4 * Math.sqrt(d.vari), yhi = cauchy ? 6 : mu + 2.4 * Math.sqrt(d.vari);
        const series = [{ type: "line", data: ks.map((k) => [k, path[k - 1]]), color: P.accent2, width: 1.8 }];
        if (!cauchy) {
          series.push({ type: "line", data: ks.map((k) => [k, mu + (2 * Math.sqrt(d.vari)) / Math.sqrt(k)]), color: P.dim, width: 1.2, dash: [5, 4] });
          series.push({ type: "line", data: ks.map((k) => [k, mu - (2 * Math.sqrt(d.vari)) / Math.sqrt(k)]), color: P.dim, width: 1.2, dash: [5, 4] });
        }
        VZ.chart(ctx, bot, {
          x: [1, MPATH], y: [ylo, yhi], logX: true, title: "누적 평균 (k = 1…" + MPATH + ")" + (cauchy ? " — 수렴하지 않는다" : ", 점선 μ ± 2σ/√k"),
          xLabel: "k", margin: { l: 46 }, yFmt: (v) => String(Number(v.toPrecision(3))), series,
          hlines: cauchy ? [{ y: 0, color: P.faint }] : [{ y: mu, color: P.ok, dash: [], width: 1.4 }],
        });
      });
      const set = S.stats([
        { k: "mean", label: "표본 평균들의 평균" },
        { k: "sd", label: "표본 평균들의 표준편차" },
        { k: "skew", label: "표본 평균들의 왜도" },
        { k: "iqr", label: "사분위 범위" },
        { k: "ks", label: "정규와의 거리 (KS)" },
        { k: "path", label: "누적 평균의 마지막 값" },
      ]);
      function build() {
        const d = CLT[st.key], n = st.n, cauchy = st.key === "cauchy";
        const rand = VZ.rng(st.seed * 7907 + 13);
        means = sampleMeans(d, n, R, rand);
        path = runningMeans(d, MPATH, VZ.rng(st.seed * 6571 + 5));
        const m = momentsOf(means), se = Math.sqrt(d.vari / n);
        const sorted = Float64Array.from(means).sort();
        const iqr = quantileOf(sorted, 0.75) - quantileOf(sorted, 0.25);
        if (cauchy) {
          set("mean", fmt(m.mean) + " <small>(μ 없음)</small>");
          set("sd", fmt(m.sd) + " <small>(σ 없음)</small>");
          set("skew", "—");
          set("iqr", fmt(iqr) + " <small>(코시 이론 2, n과 무관)</small>");
          set("ks", "—");
          set("path", fmt(path[MPATH - 1]) + " <small>(수렴하지 않음)</small>");
        } else {
          set("mean", fmt(m.mean) + " <small>(이론 " + fmt(d.mean) + ")</small>");
          set("sd", fmt(m.sd) + " <small>(이론 σ/√n = " + fmt(se) + ")</small>");
          set("skew", fmt(m.skew) + " <small>(이론 γ/√n = " + fmt(d.skew / Math.sqrt(n)) + ")</small>");
          set("iqr", fmt(iqr / se) + " σ/√n <small>(정규 1.349)</small>");
          set("ks", fmt(ksToNormal(Array.from(means, (v) => (v - d.mean) / se))));
          set("path", fmt(path[MPATH - 1]) + " <small>(μ = " + fmt(d.mean) + ", 2σ/√k = " + fmt((2 * Math.sqrt(d.vari)) / Math.sqrt(MPATH)) + ")</small>");
        }
        cv.redraw();
      }
      S.select({ label: "모분포", options: Object.keys(CLT).map((k) => [k, CLT[k].name]), value: st.key, onChange: (k) => { st.key = k; build(); } });
      S.range({ label: "표본 크기 n", min: 0, max: 100, step: 1, value: st.pos, fmt: (p) => String(nOf(p)), onInput: (p) => { st.pos = p; st.n = nOf(p); build(); } });
      S.seg({ label: "가로축", options: [["z", "표준화"], ["raw", "표본 평균"]], value: st.axis, onChange: (v) => { st.axis = v; cv.redraw(); } });
      S.button("다시 뽑기", () => { st.seed++; build(); }, { primary: true });
      S.legend([
        { label: "표본 평균 2,000개의 히스토그램", color: (p) => p.accent2 },
        { label: "이론 밀도 (정규 또는 코시)", color: (p) => p.accent },
        { label: "누적 평균", color: (p) => p.accent2 },
        { label: "μ ± 2σ/√k", color: (p) => p.dim, dash: true },
      ]);
      st.n = nOf(st.pos);
      build();
    },
  });

  // <importance-lib>
  // 중요도 표집 (7장): p = N(0,1)에서 꼬리 확률 I = P(X > c)를 제안 q = N(m, s²)로 추정한다.
  // 추정량은 g(x)w(x)의 평균(g = 1(x > c), w = p/q)이고 이론 분산은 E_q[(gw)²] − I²다.
  // E_q[(gw)²] = ∫_c^∞ p²/q dx 는 제곱을 완성해 닫힌 식으로 쓰인다 (a = 1 − 1/(2s²) > 0일 때만 유한).
  function logNormSf(z) {
    // log P(Z > z). z < 8은 erfc 근사를 쓰고 그 위는 점근 전개를 쓴다.
    if (z < 8) return Math.log(normCdf(-z));
    const z2 = z * z;
    return -0.5 * z2 - Math.log(z * Math.sqrt(2 * Math.PI)) + Math.log(1 - 1 / z2 + 3 / (z2 * z2) - 15 / (z2 * z2 * z2));
  }
  function logSecondMoment(c, m, s) {
    const a = 1 - 1 / (2 * s * s);
    if (a <= 1e-12) return Infinity;
    const K = (m * m) / (4 * a * Math.pow(s, 4)) + (m * m) / (2 * s * s);
    const z = Math.sqrt(2 * a) * (c + m / (2 * a * s * s));
    return Math.log(s / Math.sqrt(2 * a)) + K + logNormSf(z);
  }
  function isTheory(c, m, s) {
    const I = normCdf(-c), ls = logSecondMoment(c, m, s);
    const sec = ls === Infinity ? Infinity : Math.exp(ls);
    const varIS = sec === Infinity ? Infinity : Math.max(sec - I * I, 0);
    const varNv = I * (1 - I);
    return { I, sec, varIS, varNv, ratio: varIS === Infinity ? 0 : varNv / varIS, essFrac: sec === Infinity ? 0 : (I * I) / sec };
  }
  // Z: q의 표본을 만드는 표준 정규(x = m + s z), Z2: p에서 그대로 뽑는 보통 몬테카를로용 표준 정규
  // marks: 누적 추정값을 기록할 표본 번호(1부터, 오름차순)
  function isRun(c, m, s, Z, Z2, n, marks) {
    let sH = 0, sH2 = 0, hits = 0, nv = 0, nvHits = 0, j = 0;
    const isPath = new Float64Array(marks.length), nvPath = new Float64Array(marks.length);
    for (let i = 0; i < n; i++) {
      const z = Z[i], x = m + s * z;
      if (x > c) { const w = s * Math.exp(-0.5 * (x * x - z * z)); sH += w; sH2 += w * w; hits++; }
      if (Z2[i] > c) nvHits++;
      while (j < marks.length && marks[j] === i + 1) { isPath[j] = sH / (i + 1); nvPath[j] = nvHits / (i + 1); j++; }
    }
    const mean = sH / n, vr = n > 1 ? Math.max(sH2 / n - mean * mean, 0) * (n / (n - 1)) : 0;
    return { mean, se: Math.sqrt(vr / n), hits, nvMean: nvHits / n, nvHits, ess: sH2 > 0 ? (sH * sH) / sH2 : 0, isPath, nvPath };
  }
  // </importance-lib>

  Lab.register({
    id: "importance", field: "math", thumb: "curve", layout: "stack",
    title: "중요도 표집 — 제안 분포와 가중치 쏠림",
    desc: "표준 정규 분포의 꼬리 확률 P(X > c)를 정규 제안 분포 N(m, s²)에서 뽑은 표본과 가중치 p/q로 추정합니다. 제안 분포의 위치와 폭, 표본 수를 바꾸며 보통 몬테카를로와 추정값·표준 오차·유효 표본 크기를 비교하고, 가중치가 쏠릴 때 누적 추정값이 튀는 모습을 봅니다.",
    tags: ["중요도 표집", "유효 표본 크기", "분산 줄이기", "몬테카를로"],
    note: "해볼 것: ① 기본값(c = 4, q = N(4, 1))에서 보통 몬테카를로는 표본 10,000개 중 문턱을 넘는 것이 평균 0.3개라 대개 추정값이 0이고 가끔 크게 튑니다. 중요도 표집의 상대 표준 오차는 2% 안팎입니다. ② 제안 위치 m을 0으로 내리고 s = 1로 두면 q = p가 되어 보통 몬테카를로와 같아지고 분산 감소가 1입니다. m을 6 이상으로 올리거나 2 이하로 내려도 이론 분산이 다시 커집니다. ③ 폭 s를 줄이면 처음에는 분산이 줄지만 s가 0.71(= 1/√2) 아래로 가면 이론 분산이 무한대가 됩니다. 이때 표본에서 잰 표준 오차는 작아 보이는데도 가끔 아래 누적 추정값이 크게 튑니다. 표본이 드문 큰 가중치를 아직 못 봤기 때문입니다. ④ 표본 수를 늘리면 오차가 1/√n로 줄지만 분산이 무한이면 이 규칙이 깨집니다. 판독값의 n_eff는 (Σ g·w)² / Σ (g·w)²로 센 유효 표본 크기이고 이론값은 n · I² / E_q[(gw)²]입니다. 표본은 시드를 고정해 뽑으며 '다시 뽑기'는 다른 표본을 뽑습니다.",
    mount(S) {
      const st = { c: 4, m: 4, s: 1, n: 10000, seed: 1 };
      const NMAX = 100000;
      let Z = null, Z2 = null, run = null, th = null, marks = [];
      const fmt = (v) => VZ.fmt(v, 3), pct = (v) => (100 * v).toFixed(1) + "%";
      const npdf = (x, m, sd) => Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
      const makeMarks = (n) => {
        const out = [];
        for (let i = 0; i <= 160; i++) { const k = Math.max(1, Math.round(Math.pow(n, i / 160))); if (!out.length || k > out[out.length - 1]) out.push(k); }
        return out;
      };
      const cv = S.canvas({ aspect: 0.92, minHeight: 380, maxHeight: 620 }, (ctx, w, h) => {
        if (!run) return;
        const P = VZ.palette(), n = st.n;
        const top = { x: 0, y: 0, w, h: Math.round(h * 0.56) }, bot = { x: 0, y: Math.round(h * 0.56), w, h: h - Math.round(h * 0.56) };
        const lo = -3, hi = 8, grid = VZ.linspace(lo, hi, 331);
        const pf = (x) => npdf(x, 0, 1), qf = (x) => npdf(x, st.m, st.s);
        const ymax = 1.18 * Math.max(...grid.map(pf), ...grid.map(qf));
        const show = Math.min(n, 300), inH = [], outH = [];
        for (let i = 0; i < show; i++) { const x = st.m + st.s * Z[i]; (x > st.c ? inH : outH).push([x, 0.03 * ymax]); }
        VZ.chart(ctx, top, {
          x: [lo, hi], y: [0, ymax], title: "목표 p = N(0, 1), 제안 q = N(" + fmt(st.m) + ", " + fmt(st.s) + "²), 문턱 c = " + fmt(st.c),
          margin: { l: 40 }, yFmt: (v) => String(Number(v.toPrecision(2))),
          series: [
            { type: "line", data: grid.filter((x) => x >= st.c).map((x) => [x, pf(x)]), color: P.accent2, width: 1.5, fill: VZ.alpha(P.accent2, 0.35) },
            { type: "line", data: grid.map((x) => [x, pf(x)]), color: P.dim, width: 1.8, dash: [5, 4] },
            { type: "line", data: grid.map((x) => [x, qf(x)]), color: P.accent, width: 2.4 },
            { type: "scatter", data: outH, color: P.accent, r: 1.8, alpha: 0.4 },
            { type: "scatter", data: inH, color: P.accent2, r: 2.2, alpha: 0.9 },
          ],
          vlines: [{ x: st.c, color: P.accent2, dash: [3, 3] }],
        });
        const I = th.I, ks = marks;
        const rel = (v) => v / I;
        const seBand = (sign) => ks.map((k) => [k, 1 + sign * 2 * Math.sqrt(th.varIS / k) / I]);
        const series = [
          { type: "line", data: ks.map((k, j) => [k, rel(run.nvPath[j])]), color: P.accent2, width: 1.8 },
          { type: "line", data: ks.map((k, j) => [k, rel(run.isPath[j])]), color: P.accent, width: 2.2 },
        ];
        if (isFinite(th.varIS)) { series.push({ type: "line", data: seBand(1), color: P.dim, width: 1.1, dash: [5, 4] }); series.push({ type: "line", data: seBand(-1), color: P.dim, width: 1.1, dash: [5, 4] }); }
        VZ.chart(ctx, bot, {
          x: [1, n], y: [0, 3], logX: true, xLabel: "표본 수 k", margin: { l: 40 },
          title: "누적 추정값 ÷ 참값 (k = 1…" + n.toLocaleString("en-US") + ")" + (isFinite(th.varIS) ? ", 점선 1 ± 2 SE(k)" : " — 이론 분산이 무한대"),
          yFmt: (v) => String(Number(v.toPrecision(2))), series, hlines: [{ y: 1, color: P.ok, dash: [], width: 1.4 }],
        });
      });
      const set = S.stats([
        { k: "I", label: "참값 P(X > c)" },
        { k: "hits", label: "문턱을 넘은 표본 수 (제안 q | 보통)" },
        { k: "est", label: "중요도 표집 추정값 ± 표본 표준 오차" },
        { k: "nv", label: "보통 몬테카를로 추정값" },
        { k: "seT", label: "상대 표준 오차 (이론: 중요도 표집 | 보통)" },
        { k: "ratio", label: "분산 감소 Var(보통) ÷ Var(중요도) (이론)" },
        { k: "ess", label: "유효 표본 크기 n_eff (표본 | 이론)" },
      ]);
      function build() {
        const rand = VZ.rng(st.seed * 9973 + 11), rand2 = VZ.rng(st.seed * 7919 + 3);
        Z = new Float64Array(NMAX); Z2 = new Float64Array(NMAX);
        for (let i = 0; i < NMAX; i++) { Z[i] = VZ.randn(rand); Z2[i] = VZ.randn(rand2); }
        update();
      }
      function update() {
        const n = st.n;
        marks = makeMarks(n);
        th = isTheory(st.c, st.m, st.s);
        run = isRun(st.c, st.m, st.s, Z, Z2, n, marks);
        const I = th.I, fin = isFinite(th.varIS);
        set("I", VZ.fmt(I, 4));
        set("hits", run.hits.toLocaleString("en-US") + " | " + run.nvHits.toLocaleString("en-US") + " <small>(기대 " + fmt(n * normCdf(-(st.c - st.m) / st.s)) + " | " + fmt(n * I) + ")</small>");
        set("est", VZ.fmt(run.mean, 4) + " ± " + VZ.fmt(run.se, 2) + " <small>(" + (run.mean > 0 ? pct(run.se / run.mean) : "—") + ")</small>");
        set("nv", VZ.fmt(run.nvMean, 4) + " <small>(" + (run.nvMean > 0 ? "오차 " + pct(Math.abs(run.nvMean / I - 1)) : "문턱을 넘은 표본 없음") + ")</small>");
        set("seT", (fin ? pct(Math.sqrt(th.varIS / n) / I) : "∞") + " | " + pct(Math.sqrt(th.varNv / n) / I));
        set("ratio", fin ? fmt(th.ratio) + "배" : "0 <small>(분산 무한대)</small>");
        set("ess", fmt(run.ess) + " (" + pct(run.ess / n) + ") | " + fmt(n * th.essFrac) + " (" + pct(th.essFrac) + ")");
        cv.redraw();
      }
      const slider = (label, key, min, max, step, f) => S.range({ label, min, max, step, value: st[key], fmt: f, onInput: (v) => { st[key] = v; update(); } });
      slider("문턱 c", "c", 1, 5, 0.1, (v) => v.toFixed(1));
      slider("제안 위치 m", "m", -1, 7, 0.1, (v) => v.toFixed(1));
      slider("제안 폭 s", "s", 0.5, 3, 0.05, (v) => v.toFixed(2));
      S.seg({ label: "표본 수 n", options: [[100, "100"], [1000, "1,000"], [10000, "10,000"], [100000, "100,000"]], value: st.n, onChange: (v) => { st.n = Number(v); update(); } });
      S.button("다시 뽑기", () => { st.seed++; build(); }, { primary: true });
      S.legend([
        { label: "중요도 표집 (q에서 뽑아 p/q로 보정)", color: (p) => p.accent },
        { label: "보통 몬테카를로 (p에서 뽑음)", color: (p) => p.accent2 },
        { label: "목표 p", color: (p) => p.dim, dash: true },
        { label: "1 ± 2 SE (이론)", color: (p) => p.dim, dash: true },
      ]);
      build();
    },
  });
})();
