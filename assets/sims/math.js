/* ==========================================================================
   수학 실험 모음 (field: "math")
   bayes-base-rate — 기저율·민감도·특이도와 양성 예측도
   ========================================================================== */
(function () {
  "use strict";

  Lab.register({
    id: "bayes-base-rate", field: "math", thumb: "bars", layout: "stack",
    title: "기저율과 베이즈 정리 — 양성의 의미",
    desc: "기저율, 민감도, 특이도를 바꾸고 양성 중 실제 해당자의 몫을 넓이로 확인합니다.",
    tags: ["베이즈 정리", "기저율", "조건부 확률", "분류"],
    note: "해볼 것: 민감도와 특이도를 고정하고 기저율만 1%에서 10%로 바꿔 보세요. 아래 넓이는 1만 명을 비율대로 나눈 <b>기대 인원</b>이며 실제 표집 결과가 아닙니다.",
    mount(S) {
      const st = { prior: 1, sensitivity: 90, specificity: 95 };
      const fmt = (n) => Number(n.toFixed(1)).toLocaleString("ko-KR", { maximumFractionDigits: 1 });
      const pct = (n) => (100 * n).toFixed(1) + "%";
      const cv = S.canvas({ aspect: 0.47, minHeight: 260, maxHeight: 360 }, (ctx, w, h) => {
        const P = VZ.palette();
        const pi = st.prior / 100, s = st.sensitivity / 100, f = 1 - st.specificity / 100;
        const left = 18, right = w - 18, top = 52, bottom = h - 56, width = right - left, height = bottom - top;
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
