/* ==========================================================================
   본문 위젯 — 코드 없이 HTML 속성만으로 그리는 그림
   1) 결과 차트:  <div data-chart='{"type":"bar","labels":["A","B"],"series":[{"name":"Ours","data":[1,2]}]}'></div>
      type: "bar"(묶음 막대) | "line" · 선택: title, xLabel, yLabel, yMin, yMax, highlight(시리즈 이름), digits, aspect
   2) 리뷰 레이더: <div data-radar='{"신규성":4,"명확성":3,"재현성":2}' data-max="5"></div>
      비교값: data-compare='{"신규성":3,...}' data-labels="이 논문,평균"
   3) <pre> 코드 블록 복사 버튼 (자동)
   ========================================================================== */
(function () {
  "use strict";

  function parse(el, attr) {
    try { return JSON.parse(el.getAttribute(attr)); }
    catch (e) { el.innerHTML = `<p class="slot" data-slot="JSON 오류">${attr} 값을 읽지 못했습니다: ${e.message}</p>`; return null; }
  }

  /* ------------------------------------------------------------ 결과 차트 */
  function dataChart(el) {
    const cfg = parse(el, "data-chart");
    if (!cfg) return;
    el.classList.add("data-chart");
    const labels = cfg.labels || [], series = cfg.series || [], n = labels.length, ns = series.length;
    const legend = document.createElement("div");
    legend.className = "legend";
    el.appendChild(legend);
    const c = document.createElement("canvas");
    el.appendChild(c);
    const colorOf = (s, i, P) => (cfg.highlight ? (s.name === cfg.highlight ? P.accent : VZ.alpha(P.dim, 0.55 + 0.1 * (i % 3))) : P.series[i % P.series.length]);
    const paintLegend = () => {
      const P = VZ.palette();
      legend.innerHTML = series.map((s, i) => `<span><i style="background:${colorOf(s, i, P)}"></i>${s.name || "시리즈 " + (i + 1)}</span>`).join("");
    };
    const all = series.flatMap((s) => s.data).filter(isFinite);
    const lo = cfg.yMin != null ? cfg.yMin : Math.min(0, ...all), hi = cfg.yMax != null ? cfg.yMax : Math.max(...all) * 1.12;
    VZ.canvas(c, (ctx) => {
      const P = VZ.palette();
      const digits = cfg.digits != null ? cfg.digits : 1;
      if (cfg.type === "line") {
        VZ.chart(ctx, null, {
          x: [0, Math.max(1, n - 1)], y: [lo, hi], title: cfg.title, xLabel: cfg.xLabel, yLabel: cfg.yLabel,
          xTicks: labels.map((_, i) => i), xFmt: (i) => labels[i] ?? "",
          series: series.map((s, i) => ({ data: s.data.map((v, k) => [k, v]), color: colorOf(s, i, P), width: s.name === cfg.highlight ? 3 : 2 })),
          points: series.flatMap((s, i) => s.data.map((v, k) => ({ x: k, y: v, color: colorOf(s, i, P), r: 3.5 }))),
        });
        return;
      }
      const bw = 0.8 / Math.max(1, ns);
      const C = VZ.chart(ctx, null, {
        x: [-0.5, n - 0.5], y: [lo, hi], title: cfg.title, xLabel: cfg.xLabel, yLabel: cfg.yLabel,
        xTicks: labels.map((_, i) => i), xFmt: (i) => labels[i] ?? "", noGrid: false,
        series: series.map((s, i) => ({ type: "bar", data: s.data.map((v, k) => [k, v]), color: colorOf(s, i, P), barWidth: bw, offset: i - (ns - 1) / 2 })),
      });
      ctx.font = VZ.font(10.5); ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillStyle = P.text;
      const px = Math.abs(C.X(bw) - C.X(0));
      // 막대가 글자보다 좁으면 값 라벨이 서로 겹치므로 생략한다 (정확한 값은 본문 표에 둔다)
      const fits = px >= ctx.measureText((0).toFixed(digits) + "0").width + 4;
      if (fits && cfg.values !== false) series.forEach((s, i) => s.data.forEach((v, k) => { if (isFinite(v)) ctx.fillText(Number(v).toFixed(digits), C.X(k) + (i - (ns - 1) / 2) * px, C.Y(v) - 3); }));
    }, { aspect: cfg.aspect || 0.45, maxHeight: 380, minHeight: 220 });
    paintLegend();
    VZ.onTheme(paintLegend);
  }

  /* ------------------------------------------------------------ 레이더 */
  function radar(el) {
    const a = parse(el, "data-radar");
    if (!a) return;
    const b = el.hasAttribute("data-compare") ? parse(el, "data-compare") : null;
    const max = Number(el.dataset.max || 5), keys = Object.keys(a), n = keys.length;
    const names = (el.dataset.labels || "이 논문,비교").split(",");
    el.classList.add("radar");
    if (b) {
      const lg = document.createElement("div");
      lg.className = "legend";
      el.appendChild(lg);
      const paint = () => { const P = VZ.palette(); lg.innerHTML = `<span><i style="background:${P.accent}"></i>${names[0]}</span><span><i class="dash" style="border-color:${P.accent2}"></i>${names[1] || "비교"}</span>`; };
      paint(); VZ.onTheme(paint);
    }
    const c = document.createElement("canvas");
    el.appendChild(c);
    VZ.canvas(c, (ctx, w, h) => {
      const P = VZ.palette(), cx = w / 2, cy = h / 2 + 4, R = Math.min(w, h) / 2 - 46;
      const pt = (i, v) => { const ang = -Math.PI / 2 + (i / n) * Math.PI * 2, r = (v / max) * R; return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]; };
      ctx.strokeStyle = P.grid; ctx.lineWidth = 1;
      for (let k = 1; k <= max; k++) { ctx.beginPath(); for (let i = 0; i <= n; i++) { const [x, y] = pt(i % n, k); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      for (let i = 0; i < n; i++) { const [x, y] = pt(i, max); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); }
      const poly = (vals, stroke, fill, dash) => {
        ctx.beginPath();
        keys.forEach((k, i) => { const [x, y] = pt(i, Number(vals[k]) || 0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        ctx.strokeStyle = stroke; ctx.lineWidth = 2.2; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
      };
      if (b) poly(b, P.accent2, null, [5, 4]);
      poly(a, P.accent, VZ.alpha(P.accent, 0.2));
      keys.forEach((k, i) => {
        const [x, y] = pt(i, Number(a[k]) || 0);
        ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
        const [lx, ly] = pt(i, max * 1.2);
        ctx.fillStyle = P.text; ctx.font = VZ.font(12.5, false, 600); ctx.textAlign = Math.abs(lx - cx) < 8 ? "center" : lx < cx ? "right" : "left"; ctx.textBaseline = "middle";
        ctx.fillText(`${k} ${a[k]}`, lx, ly);
      });
    }, { aspect: 0.8, maxHeight: 340, minHeight: 240 });
  }

  /* ------------------------------------------------------------ 코드 복사 */
  function copyButtons(root) {
    root.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".copy")) return;
      const b = document.createElement("button");
      b.className = "copy"; b.type = "button"; b.textContent = "복사";
      b.addEventListener("click", () => {
        const text = (pre.querySelector("code") || pre).innerText.replace(/복사$/, "");
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => (b.textContent = "복사됨"), () => (b.textContent = "실패")).finally(() => setTimeout(() => (b.textContent = "복사"), 1400));
      });
      pre.appendChild(b);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-chart]").forEach(dataChart);
    document.querySelectorAll("[data-radar]").forEach(radar);
    copyButtons(document);
  });
  window.Widgets = { dataChart, radar, copyButtons };
})();
