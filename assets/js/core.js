/* ==========================================================================
   LabShelf 핵심 스크립트 — 전역 객체 LS
   - 경로: 모든 링크는 <body data-root="../../"> 기준 상대 경로 (GitHub Pages 하위 경로 대응)
   - 데이터: data/books.js(SHELF_DATA)를 정리해 서로 참조하기 쉽게 만든다
   - 테마, 아이콘, 통합 검색 상자, 꼬리말
   모든 스크립트는 defer로 로드되므로 이 시점에 <body>가 존재한다.
   ========================================================================== */
(function () {
  "use strict";

  const LS = (window.LS = {});
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  Object.assign(LS, { $, $$, esc });

  /* ------------------------------------------------------------ 경로 */
  LS.root = document.body.dataset.root || "";
  LS.url = (p) => LS.root + (p || "");
  LS.simUrl = (id) => LS.url("lab/view.html?id=" + encodeURIComponent(id));

  /* ------------------------------------------------------------ 데이터 */
  const D = window.SHELF_DATA || { fields: [], books: [] };
  D.fieldById = Object.fromEntries(D.fields.map((f) => [f.id, f]));
  D.bookById = Object.fromEntries(D.books.map((b) => [b.id, b]));
  D.books.forEach((b) => {
    b.fieldObj = D.fieldById[b.field] || D.fields[0];
    b.color = b.color || b.fieldObj.color;
    b.colorDark = b.colorDark || b.fieldObj.colorDark || b.color;
    b.href = b.status === "planned" ? "" : b.path + "index.html";
    b.chapters = b.chapters || [];
    b.chapters.forEach((c, i) => {
      c.book = b;
      c.index = i;
      c.href = b.path + "chapters/" + c.slug + ".html";
      c.sims = c.sims || [];
    });
  });
  D.fields.forEach((f) => (f.books = D.books.filter((b) => b.field === f.id)));
  LS.data = D;
  LS.site = window.SITE || { name: "LabShelf" };
  LS.currentBook = () => D.bookById[document.body.dataset.book] || null;
  LS.statusLabel = (b) => (D.statusLabels || {})[b.status] || b.status;
  LS.chapterStatusLabel = (c) => (D.chapterStatusLabels || {})[c.status] || c.status || "";
  /** 실험 id → 그 실험을 쓰는 챕터 목록 */
  LS.chaptersUsingSim = (id) => D.books.flatMap((b) => b.chapters.filter((c) => c.sims.includes(id)));
  /** 분야·책 색을 라이트/다크 두 벌로 걸어 둔다 (CSS의 .tint가 고른다) */
  LS.tint = (el, x) => {
    el.classList.add("tint");
    el.style.setProperty("--c-l", x.color);
    el.style.setProperty("--c-d", x.colorDark || x.color);
    return el;
  };

  /* ------------------------------------------------------------ 테마 */
  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const saved = () => { try { return localStorage.getItem("ls-theme"); } catch (e) { return null; } };
  LS.theme = {
    get: () => document.documentElement.dataset.theme || (mq && mq.matches ? "dark" : "light"),
    set(t, save = true) {
      document.documentElement.dataset.theme = t;
      if (save) { try { localStorage.setItem("ls-theme", t); } catch (e) {} }
      window.dispatchEvent(new CustomEvent("ls:theme", { detail: t }));
    },
    toggle() { LS.theme.set(LS.theme.get() === "dark" ? "light" : "dark"); },
  };
  if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = LS.theme.get();
  if (mq && mq.addEventListener) mq.addEventListener("change", (e) => { if (!saved()) LS.theme.set(e.matches ? "dark" : "light", false); });

  /* ------------------------------------------------------------ 아이콘 */
  const ico = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  LS.icons = {
    menu: ico('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    moon: ico('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    sun: ico('<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    search: ico('<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>', 'class="ico"'),
    shelf: ico('<path d="M4 5.5h5v14H4zM9 5.5h5v14H9zM16 7l3-1 2.6 13-3 1z"/>'),
    flask: ico('<path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3"/><path d="M7.5 15h9"/>'),
    left: ico('<path d="m14 6-6 6 6 6"/>'),
    right: ico('<path d="m10 6 6 6-6 6"/>'),
    expand: ico('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
    github: ico('<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'),
    blank: ico('<rect x="3.5" y="3.5" width="17" height="17" rx="2.5" stroke-dasharray="3 3"/><path d="M12 8v8M8 12h8"/>'),
  };
  let logoSeq = 0;
  LS.logo = () => {
    const id = "lsg" + logoSeq++;
    return `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#${id})"/><g fill="#fff"><rect x="8" y="9" width="4" height="15" rx="1.2" opacity=".95"/><rect x="13.5" y="12" width="4" height="12" rx="1.2" opacity=".7"/><rect x="19" y="9.6" width="4" height="14.6" rx="1.2" transform="rotate(-12 21 17)" opacity=".85"/></g><path d="M6 25.5h20" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".9"/></svg>`;
  };

  LS.themeButton = () => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "icon-btn";
    b.setAttribute("aria-label", "밝은/어두운 테마 전환");
    b.title = "테마 전환";
    const paint = () => { b.innerHTML = LS.theme.get() === "dark" ? LS.icons.sun : LS.icons.moon; };
    b.addEventListener("click", () => LS.theme.toggle());
    window.addEventListener("ls:theme", paint);
    paint();
    return b;
  };

  /* ------------------------------------------------------------ 통합 검색 */
  function buildIndex() {
    const items = [];
    D.books.forEach((b) => {
      items.push({ kind: "책", title: `${b.series} · ${b.title}`, sub: b.status === "planned" ? "집필 예정 · " + b.desc : b.desc, href: b.href ? LS.url(b.href) : LS.url("library/index.html?q=" + encodeURIComponent(b.title)), hay: [b.title, b.series, b.en, b.desc, b.tagline, b.fieldObj.name].join(" ") });
      b.chapters.forEach((c) => items.push({ kind: "장", title: `${c.num} ${c.title}`, sub: `${b.series} · ${c.desc || ""}`, href: LS.url(c.href), book: b.id, hay: [c.title, c.desc, (c.tags || []).join(" "), b.title].join(" ") }));
    });
    if (window.Lab) Lab.list().forEach((s) => items.push({ kind: "실험", title: s.title, sub: s.desc || "", href: LS.simUrl(s.id), hay: [s.title, s.desc, (s.tags || []).join(" "), s.id].join(" ") }));
    items.forEach((it) => (it.hay = it.hay.toLowerCase()));
    return items;
  }
  /**
   * 검색 상자. 책·챕터·실험을 한 번에 찾는다.
   *   el = LS.searchBox({ placeholder, preferBook })
   */
  LS.searchBox = (opts = {}) => {
    const box = document.createElement("div");
    box.className = "ls-search";
    box.innerHTML = `${LS.icons.search}<input type="search" aria-label="책, 챕터, 실험 검색" placeholder="${esc(opts.placeholder || "책 · 챕터 · 실험 검색")}" autocomplete="off"><div class="ls-search-results" role="listbox"></div>`;
    const input = $("input", box), out = $(".ls-search-results", box);
    let index = null, sel = -1;
    const close = () => { box.classList.remove("open"); out.innerHTML = ""; sel = -1; };
    function render() {
      const q = input.value.trim().toLowerCase();
      if (!q) return close();
      index = index || buildIndex();
      const terms = q.split(/\s+/);
      const hits = index
        .map((it) => {
          if (!terms.every((t) => it.hay.includes(t))) return null;
          let s = it.title.toLowerCase().includes(q) ? 3 : 1;
          if (opts.preferBook && it.book === opts.preferBook) s += 1;
          return { it, s };
        })
        .filter(Boolean)
        .sort((a, b) => b.s - a.s)
        .slice(0, 12);
      out.innerHTML = hits.length
        ? hits.map(({ it }) => `<a href="${esc(it.href)}" role="option"><span class="kind">${it.kind}</span><strong>${esc(it.title)}</strong><small>${esc(it.sub)}</small></a>`).join("")
        : `<p>"${esc(input.value)}"에 맞는 결과가 없습니다.</p>`;
      box.classList.add("open");
      sel = -1;
    }
    input.addEventListener("input", render);
    input.addEventListener("focus", render);
    input.addEventListener("keydown", (e) => {
      const links = $$("a", out);
      if (e.key === "Escape") { close(); input.blur(); return; }
      if (!links.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links.forEach((a, i) => a.classList.toggle("sel", i === sel));
        links[sel].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        location.href = links[Math.max(0, sel)].href;
      }
    });
    document.addEventListener("click", (e) => { if (!box.contains(e.target)) close(); });
    // "/" 키로 검색 열기
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    });
    return box;
  };

  /* ------------------------------------------------------------ 꼬리말 */
  LS.footer = () => {
    const f = document.createElement("footer");
    f.className = "ls-foot";
    const S = LS.site;
    f.innerHTML = `<div class="row"><a href="${LS.url("index.html")}">서재 홈</a><a href="${LS.url("library/index.html")}">전체 책장</a><a href="${LS.url("lab/index.html")}">실험실</a>${S.github ? `<a href="${esc(S.github)}" rel="noopener">GitHub</a>` : ""}</div>
      <div>© ${esc(S.year || new Date().getFullYear())} ${esc(S.author || "")} · ${esc(S.name)} — ${esc(S.tagline || "")}</div>`;
    return f;
  };

  /* ------------------------------------------------------------ 기타 */
  /** 데이터에 따라 책 표지(HTML 문자열)를 만든다. covers.js가 있으면 그림을 넣는다. */
  LS.cover = (b) => {
    const art = window.Covers ? Covers.art(b.motif) : "";
    const planned = b.status === "planned";
    return `<div class="cover${planned ? " planned" : ""}" style="--c:${esc(LS.theme.get() === "dark" ? b.colorDark : b.color)}" data-cover="${esc(b.id)}">
      <span class="c-status">${esc(LS.statusLabel(b))}</span>
      <span class="c-series">${esc(b.series)}</span>
      ${art}
      <span class="c-title">${esc(b.title)}</span>
      <span class="c-sub">${esc(b.tagline || b.en || "")}</span>
    </div>`;
  };
  // 테마가 바뀌면 표지 색도 바꾼다
  window.addEventListener("ls:theme", () => {
    $$("[data-cover]").forEach((el) => {
      const b = D.bookById[el.dataset.cover];
      if (b) el.style.setProperty("--c", LS.theme.get() === "dark" ? b.colorDark : b.color);
    });
  });
  LS.bookCard = (b) => {
    const n = b.chapters.length;
    const sims = new Set(b.chapters.flatMap((c) => c.sims)).size;
    const tag = b.href ? "a" : "div";
    return `<${tag} class="book-card" ${b.href ? `href="${esc(LS.url(b.href))}"` : 'aria-disabled="true" tabindex="0"'} title="${esc(b.desc)}">
      ${LS.cover(b)}
      <span class="meta"><b>${esc(b.title)}</b><span>${esc(b.fieldObj.name)} · ${b.status === "planned" ? "집필 예정" : `${n}개 챕터 · 실험 ${sims}개`}</span></span>
    </${tag}>`;
  };
})();
