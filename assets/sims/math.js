/* ==========================================================================
   수학 실험 모음 (field: "math")
   bayes-base-rate — 기저율·민감도·특이도와 양성 예측도
   dist-explorer   — 자주 만나는 분포의 질량·밀도 함수, 누적 분포 함수, 표본의 평균과 분산
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
})();
