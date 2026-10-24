/* ==========================================================================
   책 페이지 레이아웃 — 책 홈(index.html)과 챕터(chapters/*.html)가 함께 쓴다.
   <body data-root="../../" data-book="paper-review" data-field="dl" [data-chapter="p01"]>
   - 상단바: 챕터 서랍 · 책 로고 · 검색 · 서재로 · 테마 · 읽기 진행 막대
   - 챕터: 절 번호, 오른쪽 목차(스크롤 추적), 이전/다음, 퀴즈, KaTeX 수식
   - 책 홈: [data-chapter-grid], [data-book-sims], [data-paper-table], [data-fill]
   ========================================================================== */
(function () {
  "use strict";
  const { $, $$, esc } = LS;
  const book = LS.currentBook();
  if (!book) return;
  const body = document.body;
  const chSlug = body.dataset.chapter || "";
  const chapter = book.chapters.find((c) => c.slug === chSlug) || null;
  const url = LS.url;

  /* ------------------------------------------------------------ 데이터로 채우기 */
  // 제목·설명은 data/books.js가 기준. HTML에 적힌 값은 스크립트가 없을 때의 대비용이다.
  function fill() {
    const map = {
      "book-title": book.title, "book-series": book.series, "book-en": book.en, "book-desc": book.desc, "book-tagline": book.tagline,
      "book-status": LS.statusLabel(book), "chapter-count": book.chapters.length,
      "sim-count": new Set(book.chapters.flatMap((c) => c.sims)).size,
    };
    if (chapter) Object.assign(map, { "chapter-title": chapter.title, "chapter-num": chapter.num, "chapter-desc": chapter.desc });
    $$("[data-fill]").forEach((el) => { const v = map[el.dataset.fill]; if (v != null) el.textContent = v; });
    document.title = chapter ? `${chapter.num} ${chapter.title} · ${book.series}` : `${book.series} · ${book.title}`;
  }

  /* ------------------------------------------------------------ 상단바 + 서랍 */
  function topbar() {
    const bar = document.createElement("header");
    bar.className = "ls-topbar";
    bar.innerHTML = `<div class="nav-left">
        <button class="icon-btn" type="button" id="ls-menu" aria-label="챕터 목록 열기" title="챕터 목록">${LS.icons.menu}</button>
        <a class="ls-logo" href="${url(book.path + "index.html")}">${LS.logo()}<span>${esc(book.series)} <small>${esc(book.title)}</small></span></a>
      </div>
      <div class="nav-right">
        <a class="icon-btn" href="${url("index.html")}" title="서재로 돌아가기" aria-label="서재로 돌아가기">${LS.icons.shelf}<span class="lbl">서재</span></a>
        <a class="icon-btn" href="${url("lab/index.html")}" title="실험실" aria-label="실험실">${LS.icons.flask}<span class="lbl">실험실</span></a>
      </div>
      <div class="ls-progress"></div>`;
    bar.querySelector(".nav-left").after(LS.searchBox({ placeholder: "이 책과 실험 검색", preferBook: book.id }));
    bar.querySelector(".nav-right").append(LS.themeButton());
    body.prepend(bar);

    const drawer = document.createElement("nav");
    drawer.className = "ls-drawer";
    drawer.setAttribute("aria-label", "챕터 목록");
    drawer.innerHTML = `<a class="book-title" href="${url(book.path + "index.html")}">${esc(book.series)} · ${esc(book.title)}</a><h4>챕터</h4>
      <ul class="ls-chlist">${book.chapters.map((c) => `<li><a href="${url(c.href)}"${c === chapter ? ' class="active" aria-current="page"' : ""}><span class="num">${esc(c.num)}</span><span>${esc(c.title)}</span>${c.status === "slot" ? '<span class="pill slot">슬롯</span>' : ""}</a></li>`).join("")}</ul>
      <a class="back" href="${url("index.html")}">← 서재로</a><a class="back" style="border:0;margin-top:0" href="${url("lab/index.html")}">실험실 →</a>`;
    const back = document.createElement("div");
    back.className = "ls-drawer-backdrop";
    body.append(back, drawer);
    const toggle = (on) => body.classList.toggle("drawer-open", on);
    $("#ls-menu").addEventListener("click", () => toggle(true));
    back.addEventListener("click", () => toggle(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });

    const prog = $(".ls-progress", bar);
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------ 챕터: 목차 · 절 번호 · 이전/다음 */
  function chapterLayout() {
    const main = $("main.chapter");
    if (!main) return;
    const sections = $$(":scope > section[id]", main);
    let k = 0;
    sections.forEach((s) => {
      const h2 = $(":scope > h2", s);
      if (!h2 || s.classList.contains("keypoints") || s.classList.contains("quiz-sec") || h2.querySelector(".h-num")) return;
      k++;
      h2.insertAdjacentHTML("afterbegin", `<span class="h-num">${chapter ? Number(chapter.num) + "." : ""}${k}</span>`);
    });
    const layout = document.createElement("div");
    layout.className = "ls-layout";
    main.before(layout);
    layout.append(main);
    const toc = document.createElement("aside");
    toc.className = "ls-toc";
    toc.innerHTML = "<h4>이 장의 구성</h4>" + sections.map((s) => {
      const h2 = $(":scope > h2", s);
      const text = h2 ? h2.textContent.replace(/^[\d.]+/, "").trim() : s.id;
      return `<a href="#${esc(s.id)}">${esc(text)}</a>`;
    }).join("");
    layout.append(toc);
    if (window.IntersectionObserver) {
      const links = new Map(sections.map((s) => [s, toc.querySelector(`a[href="#${CSS.escape(s.id)}"]`)]));
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { toc.querySelectorAll("a").forEach((a) => a.classList.remove("active")); const a = links.get(e.target); if (a) a.classList.add("active"); } });
      }, { rootMargin: "-20% 0px -70% 0px" });
      sections.forEach((s) => io.observe(s));
    }
    if (chapter) {
      const prev = book.chapters[chapter.index - 1], next = book.chapters[chapter.index + 1];
      const pager = document.createElement("nav");
      pager.className = "ls-pager";
      pager.innerHTML = (prev ? `<a class="prev" href="${url(prev.href)}"><small>← 이전 장</small>${esc(prev.num)} ${esc(prev.title)}</a>` : `<a class="prev" href="${url(book.path + "index.html")}"><small>← 책 홈</small>${esc(book.title)}</a>`) +
        (next ? `<a class="next" href="${url(next.href)}"><small>다음 장 →</small>${esc(next.num)} ${esc(next.title)}</a>` : `<a class="next" href="${url("index.html")}"><small>마지막 장 · 서재로 →</small>${esc(LS.site.name)}</a>`);
      layout.after(pager);
    }
  }

  /* ------------------------------------------------------------ 퀴즈 */
  function quizzes() {
    $$(".quiz").forEach((quiz) => {
      const score = $(".quiz-score", quiz.parentElement);
      const qs = $$(".quiz-q", quiz);
      let right = 0, done = 0;
      qs.forEach((q) => {
        const opts = $$("button.opt", q);
        opts.forEach((b) => b.addEventListener("click", () => {
          if (q.classList.contains("done")) return;
          q.classList.add("done");
          const ok = b.hasAttribute("data-correct");
          b.classList.add(ok ? "right" : "wrong");
          opts.forEach((o) => { o.disabled = true; if (o.hasAttribute("data-correct")) o.classList.add("right"); });
          done++; if (ok) right++;
          if (score) score.textContent = `${done}/${qs.length} 풀이 · ${right}개 정답`;
        }));
      });
    });
  }

  /* ------------------------------------------------------------ 수식 (KaTeX, CDN에서 defer 로드) */
  function math() {
    const run = () => window.renderMathInElement && renderMathInElement(document.body, {
      delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
      throwOnError: false,
    });
    if (window.renderMathInElement) run();
    else addEventListener("load", run);
  }

  /* ------------------------------------------------------------ 책 홈 */
  function bookHome() {
    $$("[data-chapter-grid]").forEach((grid) => {
      grid.innerHTML = book.chapters.map((c) => `
        <a class="ch-card${c.status === "slot" ? " is-slot" : ""}" href="${url(c.href)}">
          <span class="num"><span>${book.kind === "papers" ? "PAPER" : "CHAPTER"} ${esc(c.num)}</span>${c.status ? `<span class="pill${c.status === "slot" ? " slot" : c.status === "done" ? " acc" : ""}">${esc(LS.chapterStatusLabel(c))}</span>` : ""}</span>
          <h3>${esc(c.title)}</h3>
          <p>${esc(c.desc || "")}</p>
          <span class="tags">${(c.paper && c.paper.year ? [`<span class="pill">${esc(c.paper.year)}</span>`] : []).concat((c.tags || []).map((t) => `<span class="pill">${esc(t)}</span>`)).concat(c.sims.map((id) => `<span class="pill acc">${esc((window.Lab && Lab.get(id) ? Lab.get(id).title.split(" — ")[0] : id))}</span>`)).join("")}</span>
        </a>`).join("");
    });
    $$("[data-book-sims]").forEach((grid) => {
      const ids = [...new Set(book.chapters.flatMap((c) => c.sims))].filter((id) => window.Lab && Lab.get(id));
      grid.innerHTML = ids.map((id) => {
        const s = Lab.get(id), ch = book.chapters.find((c) => c.sims.includes(id));
        return `<a class="exp-card" href="${LS.simUrl(id)}"><span class="ico">${Lab.thumb(s)}</span><b>${esc(s.title)}</b><p>${esc(s.desc || "")}</p><span class="row"><span class="pill acc">${esc(ch.num)}장</span>${(s.tags || []).slice(0, 2).map((t) => `<span class="pill">${esc(t)}</span>`).join("")}</span></a>`;
      }).join("");
    });
    // 논문 목록 표 (논문 리뷰 책)
    $$("[data-paper-table]").forEach((wrap) => {
      wrap.innerHTML = `<div class="table-wrap"><table class="paper-table"><thead><tr><th>#</th><th>논문</th><th>연도</th><th>학회/저널</th><th>태그</th><th>상태</th></tr></thead><tbody>${book.chapters.map((c) => {
        const p = c.paper || {};
        return `<tr><td class="num">${esc(c.num)}</td><td><a href="${url(c.href)}">${esc(c.title)}</a></td><td class="num">${esc(p.year || "—")}</td><td>${esc(p.venue || "—")}</td><td>${(p.tags || []).map((t) => `<span class="pill">${esc(t)}</span>`).join("") || "—"}</td><td><span class="pill${c.status === "slot" ? " slot" : ""}">${esc(LS.chapterStatusLabel(c))}</span></td></tr>`;
      }).join("")}</tbody></table></div>`;
    });
    // 논문 연대표: 연도가 있는 논문은 해당 연도에, 없으면 '미정' 줄에
    $$("[data-paper-timeline]").forEach((wrap) => {
      wrap.classList.add("paper-timeline");
      const c = document.createElement("canvas");
      wrap.appendChild(c);
      const items = book.chapters.map((ch) => ({ ch, y: ch.paper && ch.paper.year ? Number(ch.paper.year) : null }));
      const years = items.filter((i) => i.y).map((i) => i.y);
      const y0 = Math.min(2012, ...years), y1 = Math.max(new Date().getFullYear(), ...years);
      let hits = [];
      const cv = VZ.canvas(c, (ctx, w, h) => {
        const P = VZ.palette(), m = 60, X = (y) => m + ((y - y0) / (y1 - y0)) * (w - m - 20), base = h * 0.42;
        ctx.strokeStyle = P.axis; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(m, base); ctx.lineTo(w - 20, base); ctx.stroke();
        ctx.font = VZ.font(10.5); ctx.fillStyle = P.dim; ctx.textAlign = "center"; ctx.textBaseline = "top";
        for (let y = y0; y <= y1; y++) { ctx.beginPath(); ctx.moveTo(X(y), base - 4); ctx.lineTo(X(y), base + 4); ctx.stroke(); if ((y - y0) % 2 === 0 || w > 700) ctx.fillText(String(y).slice(2), X(y), base + 8); }
        ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.font = VZ.font(11, false);
        ctx.fillText("연도", m - 10, base); ctx.fillText("미정", m - 10, h - 26);
        hits = [];
        const stack = {};
        items.forEach((it, i) => {
          let x, y;
          if (it.y) { stack[it.y] = (stack[it.y] || 0) + 1; x = X(it.y); y = base - 16 - (stack[it.y] - 1) * 20; }
          else { const k = items.filter((j) => !j.y).indexOf(it); x = m + 14 + k * 30; y = h - 26; }
          ctx.fillStyle = it.y ? P.accent : "transparent"; ctx.strokeStyle = it.y ? P.accent : P.faint; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.setLineDash(it.y ? [] : [3, 3]); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = it.y ? P.bg : P.dim; ctx.font = VZ.font(9.5, true, 700); ctx.textAlign = "center"; ctx.fillText(it.ch.num, x, y + 0.5);
          hits.push({ x, y, ch: it.ch });
          void i;
        });
        ctx.fillStyle = P.dim; ctx.font = VZ.font(11, false); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("논문 연대표 — 점을 누르면 리뷰로 이동 (books.js의 paper.year를 채우면 위로 올라갑니다)", 12, 8);
      }, { height: 170 });
      VZ.drag(c, {
        down(p) { const h = hits.find((q) => Math.hypot(q.x - p.x, q.y - p.y) < 12); if (h) location.href = url(h.ch.href); return false; },
        hover(p) { c.style.cursor = hits.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 12) ? "pointer" : ""; },
      });
      void cv;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    fill();
    topbar();
    chapterLayout();
    quizzes();
    math();
    bookHome();
    body.append(LS.footer());
  });
})();
