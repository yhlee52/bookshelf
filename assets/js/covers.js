/* ==========================================================================
   책 표지 그림. books.js의 motif 이름 → SVG 문자열 (viewBox 0 0 200 130, 흰 선 위주)
   움직임은 base.css의 .cv-* 클래스가 담당하고, 카드에 마우스를 올렸을 때만 돈다.
   새 모티프를 만들려면 M에 함수를 하나 추가하고 books.js의 motif에 이름을 쓰면 된다.
   ========================================================================== */
(function () {
  "use strict";
  const W = "currentColor";
  const svg = (body) => `<svg class="cover-art" viewBox="0 0 200 130" aria-hidden="true" focusable="false">${body}</svg>`;
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const M = {
    // 어텐션 행렬 + 토큰 사이의 호
    attention() {
      const r = rnd(11); let s = "";
      range(7).forEach((j) => range(7).forEach((i) => {
        const v = i <= j ? 0.15 + 0.85 * Math.exp(-Math.abs(i - j) * 0.7) * (0.6 + 0.4 * r()) : 0.04;
        s += `<rect x="${110 + i * 12}" y="${14 + j * 12}" width="11" height="11" rx="2" fill="${W}" fill-opacity="${v.toFixed(2)}"${v > 0.6 ? ` class="cv-pulse" style="animation-delay:${(r() * 1.6).toFixed(2)}s"` : ""}/>`;
      }));
      const xs = [14, 32, 50, 68, 86];
      [[0, 3, 0.9], [1, 4, 0.6], [0, 2, 0.4], [2, 4, 0.75], [3, 4, 0.3]].forEach(([a, b, w]) => {
        const mx = (xs[a] + xs[b]) / 2, h = (xs[b] - xs[a]) * 0.85;
        s += `<path d="M${xs[a]} 92 Q${mx} ${92 - h} ${xs[b]} 92" fill="none" stroke="${W}" stroke-width="${(1 + w * 2.4).toFixed(1)}" stroke-opacity="${w}"/>`;
      });
      xs.forEach((x) => (s += `<rect x="${x - 7}" y="94" width="14" height="10" rx="2.5" fill="${W}" fill-opacity=".85"/>`));
      return svg(s);
    },
    // 겹쳐 흐르는 파형 + 예측 구간
    waves() {
      let s = `<rect x="128" y="8" width="66" height="112" rx="6" fill="${W}" fill-opacity=".1" stroke="${W}" stroke-opacity=".35" stroke-dasharray="3 4"/>`;
      // 주기 P만큼 밀었다가 되돌리면 이음매 없이 반복된다
      [[40, 12], [56, 9], [72, 7]].forEach(([P, A], k) => {
        let d = "";
        for (let x = 0; x <= 200 + P; x += 2) {
          const y = 30 + k * 32 + A * Math.sin((2 * Math.PI * x) / P) + 3 * Math.sin((4 * Math.PI * x) / P + k);
          d += (x ? "L" : "M") + x + " " + y.toFixed(1);
        }
        s += `<g class="cv-wave" style="--d:-${P}px;animation-duration:${1.6 + k * 0.6}s"><path d="${d}" fill="none" stroke="${W}" stroke-width="${2.2 - k * 0.4}" stroke-opacity="${1 - k * 0.22}"/></g>`;
      });
      return svg(s);
    },
    // 태양 주위의 타원 궤도
    orbit() {
      let s = "";
      [[86, 30, 0.55], [62, 22, 0.4], [38, 14, 0.3]].forEach(([rx, ry, o]) => (s += `<ellipse cx="100" cy="65" rx="${rx}" ry="${ry}" fill="none" stroke="${W}" stroke-opacity="${o}" stroke-width="1.4"/>`));
      s += `<circle cx="100" cy="65" r="11" fill="${W}"/><circle cx="100" cy="65" r="18" fill="${W}" fill-opacity=".14"/>`;
      s += `<g class="cv-orbit"><circle cx="186" cy="65" r="5" fill="${W}"/></g>`;
      s += `<g class="cv-orbit" style="animation-duration:3.2s"><circle cx="38" cy="65" r="3.5" fill="${W}"/></g>`;
      range(26).forEach((i) => { const r = rnd(i + 3); s += `<circle cx="${(r() * 200).toFixed(0)}" cy="${(r() * 130).toFixed(0)}" r="${(0.6 + r()).toFixed(1)}" fill="${W}" fill-opacity=".5"/>`; });
      return svg(s);
    },
    // 벡터장 화살표
    field() {
      let s = "";
      range(7).forEach((j) => range(11).forEach((i) => {
        const x = 12 + i * 17.6, y = 12 + j * 17.6;
        const dx = x - 100, dy = y - 65, a = Math.atan2(dy, dx) + Math.PI / 2 + 0.4;
        const L = 7, x2 = x + L * Math.cos(a), y2 = y + L * Math.sin(a);
        s += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${W}" stroke-opacity="${(0.25 + 0.6 * Math.exp(-Math.hypot(dx, dy) / 70)).toFixed(2)}" stroke-width="1.6" stroke-linecap="round"/>`;
      }));
      return svg(s + `<g class="cv-spin"><circle cx="100" cy="65" r="30" fill="none" stroke="${W}" stroke-dasharray="4 6" stroke-opacity=".7"/></g>`);
    },
    // 층으로 연결된 신경망
    network() {
      const L = [4, 6, 6, 3]; let s = "";
      const pts = L.map((n, li) => range(n).map((k) => [30 + li * 46, 65 + (k - (n - 1) / 2) * 17]));
      for (let li = 0; li < L.length - 1; li++) pts[li].forEach((a) => pts[li + 1].forEach((b) => (s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${W}" stroke-opacity=".22"/>`)));
      pts.flat().forEach((p, i) => (s += `<circle cx="${p[0]}" cy="${p[1]}" r="5.5" fill="${W}"${i % 3 === 0 ? ` class="cv-pulse" style="animation-delay:${(i * 0.13).toFixed(2)}s"` : ""}/>`));
      return svg(s);
    },
    // 빈 책: 점선 사각형과 +
    blank() {
      return svg(`<rect x="60" y="20" width="80" height="90" rx="8" fill="none" stroke="${W}" stroke-opacity=".6" stroke-dasharray="5 5"/><path d="M100 48v34M83 65h34" stroke="${W}" stroke-width="3" stroke-linecap="round"/>`);
    },
  };

  window.Covers = { art: (name) => (M[name] || M.blank)(), motifs: Object.keys(M) };
})();
