/* ==========================================================================
   히어로 장면 — 책 홈과 서재 홈의 첫 화면 그림
     <div class="hero-stage" data-hero="network"></div>   3D 신경망 + 신호 펄스 (논문 리뷰)
     <div class="hero-stage" data-hero="ribbons"></div>   3D 시계열 폭포 (시계열)
     <div class="hero-stage" data-hero="orbits"></div>    3D 행성 궤도 (물리)
     <div class="hero-stage" data-hero="orbital"></div>   3D 수소 오비탈 전자 구름 (양자역학)
     <div class="hero-stage" data-hero="gauss"></div>     3D 2변량 정규 분포 곡면과 쌓이는 표본 (통계)
     <canvas class="bg" data-hero="flow"></canvas>         2D 흐름장 입자 (서재 홈 배경)
   three.js를 못 불러오면 조용히 안내 문구만 남긴다.
   ========================================================================== */
(function () {
  "use strict";
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hexOf = (name) => new THREE.Color(VZ.color(name) || "#888");

  function fail(el) {
    const p = document.createElement("span");
    p.className = "hint";
    p.textContent = "3D 장면을 불러오지 못했습니다 (인터넷 연결 확인)";
    el.appendChild(p);
  }

  /* ------------------------------------------------------------ 신경망 */
  function network(el) {
    VZ.three(el, { camera: [8.5, 4.2, 9.5], target: [0, 0, 0], fov: 38, autoRotate: !reduced, autoRotateSpeed: 0.7, pan: false, minDistance: 7, maxDistance: 24 }).then((T) => {
      const { THREE, scene } = T;
      const shape = [[3, 3], [4, 4], [4, 4], [3, 3], [2, 1]];
      const layers = shape.map(([a, b], li) => {
        const out = [];
        for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) out.push(new THREE.Vector3((li - 2) * 2.4, (i - (a - 1) / 2) * 1.05, (j - (b - 1) / 2) * 1.05));
        return out;
      });
      const nodeMat = () => new THREE.MeshStandardMaterial({ color: hexOf("accent"), emissive: hexOf("accent"), emissiveIntensity: 0.15, roughness: 0.35 });
      const nodes = layers.map((L) => L.map((p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), nodeMat()); m.position.copy(p); scene.add(m); return m; }));
      const pos = [];
      layers.slice(0, -1).forEach((L, li) => L.forEach((a) => layers[li + 1].forEach((b) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z))));
      const eg = new THREE.BufferGeometry();
      eg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const edgeMat = new THREE.LineBasicMaterial({ color: hexOf("text-dim"), transparent: true, opacity: 0.16 });
      scene.add(new THREE.LineSegments(eg, edgeMat));
      const pulseMat = new THREE.MeshBasicMaterial({ color: hexOf("accent-2") });
      const pulses = Array.from({ length: 36 }, () => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), pulseMat);
        scene.add(m);
        const p = { m, li: 0, a: 0, b: 0, t: Math.random() };
        p.li = Math.floor(Math.random() * (layers.length - 1));
        p.a = Math.floor(Math.random() * layers[p.li].length);
        p.b = Math.floor(Math.random() * layers[p.li + 1].length);
        return p;
      });
      T.onFrame((dt) => {
        pulses.forEach((p) => {
          p.t += dt * 1.1;
          if (p.t >= 1) {
            const hit = nodes[p.li + 1][p.b];
            hit.material.emissiveIntensity = 1.1;
            p.t = 0; p.li++; p.a = p.b;
            if (p.li >= layers.length - 1) { p.li = 0; p.a = Math.floor(Math.random() * layers[0].length); }
            p.b = Math.floor(Math.random() * layers[p.li + 1].length);
          }
          p.m.position.lerpVectors(layers[p.li][p.a], layers[p.li + 1][p.b], p.t);
        });
        nodes.flat().forEach((n) => (n.material.emissiveIntensity = Math.max(0.15, n.material.emissiveIntensity * Math.pow(0.08, dt))));
      });
      window.addEventListener("ls:theme", () => requestAnimationFrame(() => {
        nodes.flat().forEach((n) => { n.material.color = hexOf("accent"); n.material.emissive = hexOf("accent"); });
        edgeMat.color = hexOf("text-dim"); pulseMat.color = hexOf("accent-2");
      }));
      T.label("입력", [-4.8, 2.1, 0]); T.label("은닉층", [0, 2.6, 0]); T.label("출력", [4.8, 1.2, 0]);
    }).catch(() => fail(el));
  }

  /* ------------------------------------------------------------ 시계열 폭포 */
  function ribbons(el) {
    VZ.three(el, { camera: [7, 4.6, 8.5], target: [0, 0, 0], fov: 38, autoRotate: !reduced, autoRotateSpeed: 0.45, pan: false, minDistance: 6, maxDistance: 22 }).then((T) => {
      const { THREE, scene } = T;
      const NS = 14, NP = 160, W = 9;
      const lines = [];
      const paint = () => {
        const a = hexOf("accent"), b = hexOf("accent-2");
        lines.forEach((l, k) => l.material.color.copy(a).lerp(b, k / (NS - 1)));
      };
      for (let k = 0; k < NS; k++) {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
        const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 + 0.6 * (k / NS) }));
        scene.add(l); lines.push(l);
      }
      paint();
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, NS * 0.42), new THREE.MeshBasicMaterial({ color: hexOf("accent-2"), transparent: true, opacity: 0.07, depthWrite: false }));
      box.position.set(W / 2 - 1.1, 0.2, 0); scene.add(box);
      const grid = new THREE.GridHelper(10, 20, 0x888888, 0x888888);
      grid.material.transparent = true; grid.material.opacity = 0.12; grid.position.y = -1.4; scene.add(grid);
      let t = 0;
      T.onFrame((dt) => {
        if (!reduced) t += dt;
        lines.forEach((l, k) => {
          const arr = l.geometry.attributes.position.array, z = (k - (NS - 1) / 2) * 0.42, f = 1 + k * 0.08;
          for (let i = 0; i < NP; i++) {
            const x = -W / 2 + (W * i) / (NP - 1), s = x * 1.3 + t * 1.6;
            arr[i * 3] = x;
            arr[i * 3 + 1] = 0.55 * Math.sin(s * f + k) + 0.3 * Math.sin(s * 2.7 * f + k * 0.7) + 0.18 * Math.sin(s * 6.1 + k * 1.3) + 0.12 * Math.sin(x * 0.6 + k);
            arr[i * 3 + 2] = z;
          }
          l.geometry.attributes.position.needsUpdate = true;
        });
      });
      window.addEventListener("ls:theme", () => requestAnimationFrame(() => { paint(); box.material.color = hexOf("accent-2"); }));
      T.label("과거 →", [-3.8, 1.5, -3]); T.label("예측 구간", [W / 2 - 1.1, 1.9, 0]);
    }).catch(() => fail(el));
  }

  /* ------------------------------------------------------------ 행성 궤도 */
  function orbits(el) {
    VZ.three(el, { camera: [0, 6.5, 11], target: [0, 0, 0], fov: 40, autoRotate: !reduced, autoRotateSpeed: 0.35, pan: false, minDistance: 6, maxDistance: 30 }).then((T) => {
      const { THREE, scene } = T;
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffc547 }));
      scene.add(sun);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.18 }));
      scene.add(glow);
      scene.add(new THREE.PointLight(0xfff1c8, 1.2, 60));
      const sp = [];
      for (let i = 0; i < 700; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 40; sp.push(r * Math.sqrt(1 - u * u) * Math.cos(a), r * u, r * Math.sqrt(1 - u * u) * Math.sin(a)); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
      const starMat = new THREE.PointsMaterial({ color: hexOf("text-dim"), size: 0.12, transparent: true, opacity: 0.6 });
      scene.add(new THREE.Points(sg, starMat));
      const P = [[1.6, 0.06, 0.1, 0x9aa5b1, 0.12], [2.5, 0.02, 0.05, 0xe8b86a, 0.2], [3.5, 0.03, 0.12, 0x4f8ef7, 0.22], [4.8, 0.09, -0.08, 0xe0634a, 0.17], [6.6, 0.05, 0.2, 0xd9a066, 0.42]];
      const planets = P.map(([a, e, inc, color, r], k) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
        scene.add(m);
        const b = a * Math.sqrt(1 - e * e), pts = [];
        for (let i = 0; i <= 160; i++) { const th = (i / 160) * Math.PI * 2; pts.push(new THREE.Vector3(a * Math.cos(th) - a * e, 0, b * Math.sin(th)).applyAxisAngle(new THREE.Vector3(1, 0, 0), inc)); }
        const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: hexOf("text-dim"), transparent: true, opacity: 0.25 }));
        scene.add(ring);
        return { m, a, e, b, inc, M: k * 1.7, n: Math.pow(a, -1.5) * 2.2, ring };
      });
      const axis = new THREE.Vector3(1, 0, 0);
      T.onFrame((dt) => {
        planets.forEach((p) => {
          if (!reduced) p.M += p.n * dt;
          let E = p.M; for (let i = 0; i < 5; i++) E = E - (E - p.e * Math.sin(E) - p.M) / (1 - p.e * Math.cos(E));
          p.m.position.set(p.a * (Math.cos(E) - p.e), 0, p.b * Math.sin(E)).applyAxisAngle(axis, p.inc);
        });
      });
      window.addEventListener("ls:theme", () => requestAnimationFrame(() => { starMat.color = hexOf("text-dim"); planets.forEach((p) => (p.ring.material.color = hexOf("text-dim"))); }));
    }).catch(() => fail(el));
  }

  /* ------------------------------------------------------------ 수소 오비탈 (양자역학) */
  // 3d_z² 오비탈 ψ ∝ e^{-r/3}(2z² − x² − y²) (보어 반지름 단위)의 |ψ|²에서 기각 표집한 점 구름. 색은 ψ의 부호
  function orbital(el) {
    VZ.three(el, { camera: [7, 4.5, 8], target: [0, 0, 0], fov: 40, autoRotate: !reduced, autoRotateSpeed: 0.5, pan: false, minDistance: 5, maxDistance: 24 }).then((T) => {
      const { THREE, scene } = T;
      const psi = (x, y, z) => Math.exp(-Math.hypot(x, y, z) / 3) * (2 * z * z - x * x - y * y);
      const L = 22, N = 6000, S = 0.16;  // 표집 상자 [-L, L]³, 점 개수, 장면 축척
      let max = 0;
      for (let i = 0; i < 40000; i++) { const z = (Math.random() * 2 - 1) * L, v = psi(0, 0, z); max = Math.max(max, v * v); }
      const pos = [], sign = [];
      while (pos.length < N * 3) {
        const x = (Math.random() * 2 - 1) * L, y = (Math.random() * 2 - 1) * L, z = (Math.random() * 2 - 1) * L, v = psi(x, y, z);
        if (Math.random() * max < v * v) { pos.push(x * S, z * S, y * S); sign.push(v > 0); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const col = new Float32Array(N * 3);
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false });
      scene.add(new THREE.Points(geo, mat));
      const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: hexOf("text") }));
      scene.add(nucleus);
      const paint = () => {
        const a = hexOf("accent"), b = hexOf("accent-2");
        sign.forEach((s, i) => (s ? a : b).toArray(col, i * 3));
        geo.attributes.color.needsUpdate = true;
        nucleus.material.color = hexOf("text");
      };
      paint();
      window.addEventListener("ls:theme", () => requestAnimationFrame(paint));
    }).catch(() => fail(el));
  }

  /* ------------------------------------------------------------ 2변량 정규 분포 (통계) */
  // 상관계수 R인 표준 2변량 정규 분포의 밀도 곡면과, 같은 분포에서 뽑혀 바닥에 쌓이는 표본.
  // 뒤쪽 두 벽에는 주변 분포 N(0, 1)의 곡선과 지금까지 뽑은 표본의 히스토그램(밀도 단위)을 그린다
  function gauss(el) {
    const far = el.clientWidth < 520 ? 1.4 : 1;   // 좁은 화면에서는 벽까지 들어오도록 카메라를 물린다
    VZ.three(el, { camera: [7.5 * far, 5.2 * far, 7.5 * far], target: [0, 0.7, 0], fov: 40, autoRotate: !reduced, autoRotateSpeed: 0.45, pan: false, minDistance: 6, maxDistance: 22 }).then((T) => {
      const { THREE, scene } = T;
      const R = 0.6, L = 3.2, HS = 11, HM = 5.5, N = 1500, BINS = 20;  // 상관계수, 그리는 범위 [-L, L], 곡면·주변 분포의 높이 배율, 표본 수, 히스토그램 칸 수
      const c = 1 - R * R;
      const pdf2 = (x, y) => Math.exp(-(x * x - 2 * R * x * y + y * y) / (2 * c)) / (2 * Math.PI * Math.sqrt(c));
      const pdf1 = (x) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
      const peak = pdf2(0, 0);
      // 장면 좌표: 데이터 x → X, 데이터 y → Z, 밀도 → 높이 Y
      // 곡면: x를 고정한 선과 y를 고정한 선으로 엮은 격자. 색은 높이를 따라 흐린 색에서 강조색으로
      const G = 28, K = 80, seg = [], hts = [];
      const at = (x, y) => { seg.push(x, pdf2(x, y) * HS, y); hts.push(pdf2(x, y) / peak); };
      for (let i = 0; i <= G; i++) {
        const u = -L + (2 * L * i) / G;
        for (let j = 0; j < K; j++) {
          const a = -L + (2 * L * j) / K, b = -L + (2 * L * (j + 1)) / K;
          at(u, a); at(u, b);
          at(a, u); at(b, u);
        }
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
      const col = new Float32Array(hts.length * 3);
      sg.setAttribute("color", new THREE.BufferAttribute(col, 3));
      scene.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 })));

      // 표본: 상자-뮐러로 뽑은 z1, z2에서 x = z1, y = R z1 + √(1 − R²) z2
      const gauss01 = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
      const xs = new Float32Array(N), ys = new Float32Array(N), pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const z1 = gauss01(), z2 = gauss01();
        xs[i] = z1; ys[i] = R * z1 + Math.sqrt(c) * z2;
        pos.set([xs[i], 0.02, ys[i]], i * 3);
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const ptMat = new THREE.PointsMaterial({ color: hexOf("accent-2"), size: 0.08, transparent: true, opacity: 0.85, depthWrite: false });
      scene.add(new THREE.Points(pg, ptMat));

      // 벽: p(x)는 z = −L, p(y)는 x = −L. 테두리, 주변 분포 곡선, 표본 히스토그램
      const HW = 2.6, frame = [], curve = [];
      [[-L, 0, -L], [L, 0, -L], [L, HW, -L], [-L, HW, -L], [-L, HW, L], [-L, 0, L]].forEach((p, i, A) => { if (i) frame.push(...A[i - 1], ...p); });
      frame.push(-L, 0, -L, -L, HW, -L);
      const frameMat = new THREE.LineBasicMaterial({ color: hexOf("text-dim"), transparent: true, opacity: 0.25 });
      scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(frame, 3)), frameMat));
      for (let j = 0; j < K; j++) {
        const a = -L + (2 * L * j) / K, b = -L + (2 * L * (j + 1)) / K;
        curve.push(a, pdf1(a) * HM, -L, b, pdf1(b) * HM, -L);
        curve.push(-L, pdf1(a) * HM, a, -L, pdf1(b) * HM, b);
      }
      const curveMat = new THREE.LineBasicMaterial({ color: hexOf("accent") });
      scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(curve, 3)), curveMat));
      const hpos = new Float32Array(BINS * 2 * 6 * 3);   // 칸마다 벽 두 개, 선분 세 개(꼭짓점 여섯 개)
      const hg = new THREE.BufferGeometry();
      hg.setAttribute("position", new THREE.BufferAttribute(hpos, 3));
      const histMat = new THREE.LineBasicMaterial({ color: hexOf("accent-2"), transparent: true, opacity: 0.7 });
      scene.add(new THREE.LineSegments(hg, histMat));
      const bw = (2 * L) / BINS;
      function hist(n) {
        const cx = new Array(BINS).fill(0), cy = new Array(BINS).fill(0);
        for (let i = 0; i < n; i++) {
          const a = Math.floor((xs[i] + L) / bw), b = Math.floor((ys[i] + L) / bw);
          if (a >= 0 && a < BINS) cx[a]++;
          if (b >= 0 && b < BINS) cy[b]++;
        }
        let k = 0;
        const put = (...p) => p.forEach((v) => (hpos[k++] = v));
        for (let i = 0; i < BINS; i++) {
          const u0 = -L + i * bw, u1 = u0 + bw, hx = n ? (cx[i] / (n * bw)) * HM : 0, hy = n ? (cy[i] / (n * bw)) * HM : 0;
          put(u0, 0, -L, u0, hx, -L, u0, hx, -L, u1, hx, -L, u1, hx, -L, u1, 0, -L);
          put(-L, 0, u0, -L, hy, u0, -L, hy, u0, -L, hy, u1, -L, hy, u1, -L, 0, u1);
        }
        hg.attributes.position.needsUpdate = true;
        pg.setDrawRange(0, n);
      }

      const paint = () => {
        const lo = hexOf("text-faint"), hi = hexOf("accent"), tmp = new THREE.Color();
        hts.forEach((h, i) => tmp.copy(lo).lerp(hi, Math.sqrt(h)).toArray(col, i * 3));
        sg.attributes.color.needsUpdate = true;
        ptMat.color = hexOf("accent-2"); histMat.color = hexOf("accent-2"); curveMat.color = hexOf("accent"); frameMat.color = hexOf("text-dim");
      };
      paint();
      window.addEventListener("ls:theme", () => requestAnimationFrame(paint));

      // 7초에 걸쳐 표본을 하나씩 뽑아 쌓는다 (움직임을 줄인 설정이면 처음부터 모두 보인다)
      let shown = reduced ? N : 0, acc = shown;
      hist(shown);
      T.onFrame((dt) => {
        if (shown >= N) return;
        acc = Math.min(N, acc + (N / 7) * dt);
        if (Math.floor(acc) !== shown) { shown = Math.floor(acc); hist(shown); }
      });
      T.label("p(x, y)", [0, peak * HS + 0.45, 0]); T.label("p(x)", [2.4, 1.1, -L]); T.label("p(y)", [-L, 1.1, 2.4]);
    }).catch(() => fail(el));
  }

  /* ------------------------------------------------------------ 2D 흐름장 (서재 배경) */
  function flow(canvas) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, parts = [];
    const N = 260;
    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = VZ.color("bg"); ctx.fillRect(0, 0, w, h);
      parts = Array.from({ length: N }, () => ({ x: Math.random() * w, y: Math.random() * h, life: Math.random() * 200 }));
    }
    const field = (x, y, t) => {
      const s = 0.0042;
      return Math.sin(x * s + t * 0.05) * 1.6 + Math.cos(y * s * 1.3 - t * 0.04) * 1.4 + Math.sin((x + y) * s * 0.7) * 1.1;
    };
    let t = 0;
    function frame(dt) {
      t += dt * 10;
      const bg = VZ.color("bg");
      ctx.fillStyle = VZ.alpha(bg, 0.06); ctx.fillRect(0, 0, w, h);
      const a = VZ.color("accent"), b = VZ.color("accent-2");
      parts.forEach((p, i) => {
        const ang = field(p.x, p.y, t), vx = Math.cos(ang) * 0.9, vy = Math.sin(ang) * 0.9;
        ctx.strokeStyle = VZ.alpha(i % 3 ? a : b, 0.28);
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); p.x += vx; p.y += vy; ctx.lineTo(p.x, p.y); ctx.stroke();
        if (--p.life < 0 || p.x < 0 || p.y < 0 || p.x > w || p.y > h) { p.x = Math.random() * w; p.y = Math.random() * h; p.life = 120 + Math.random() * 200; }
      });
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    window.addEventListener("ls:theme", () => requestAnimationFrame(() => { ctx.fillStyle = VZ.color("bg"); ctx.fillRect(0, 0, w, h); }));
    if (reduced) { for (let i = 0; i < 300; i++) frame(0.016); return; }
    VZ.loop(canvas, frame);
  }

  const HEROES = { network, ribbons, orbits, orbital, gauss, flow };
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-hero]").forEach((el) => {
      const fn = HEROES[el.dataset.hero];
      if (fn) fn(el);
    });
  });
})();
