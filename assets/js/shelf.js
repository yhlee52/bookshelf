/* ==========================================================================
   서재(허브) 페이지 — <body class="shelf" data-page="home|library|lab|labview|notfound">
   상단바·꼬리말을 붙이고, 페이지별로 data/books.js와 실험 레지스트리를 그려 넣는다.
   ========================================================================== */
(function () {
  "use strict";
  const { $, $$, esc } = LS;
  const D = LS.data, S = LS.site, url = LS.url;
  const page = document.body.dataset.page;
  const sims = () => (window.Lab ? Lab.list() : []);
  const fieldOf = (id) => D.fieldById[id] || { name: id, color: "#888", colorDark: "#aaa" };
  const order = { published: 0, writing: 1, planned: 2 };
  const sortedBooks = () => D.books.slice().sort((a, b) => order[a.status] - order[b.status]);

  /* ------------------------------------------------------------ 머리말 */
  function header() {
    const NAV = [["index.html", "서재", "home"], ["library/index.html", "전체 책장", "library"], ["lab/index.html", "실험실", "lab"]];
    const bar = document.createElement("header");
    bar.className = "ls-topbar";
    bar.innerHTML = `<div class="nav-left"><a class="ls-logo" href="${url("index.html")}">${LS.logo()}<span>${esc(S.name)} <small>${esc(S.tagline || "")}</small></span></a>
      <nav class="ls-nav" aria-label="주 메뉴">${NAV.map(([h, t, k]) => `<a href="${url(h)}"${k === page || (k === "lab" && page === "labview") ? ' class="active" aria-current="page"' : ""}>${t}</a>`).join("")}</nav></div>
      <div class="nav-right"></div>`;
    bar.querySelector(".nav-left").after(LS.searchBox());
    const right = bar.querySelector(".nav-right");
    if (S.github) right.insertAdjacentHTML("beforeend", `<a class="icon-btn" href="${esc(S.github)}" rel="noopener" aria-label="GitHub 저장소" title="GitHub">${LS.icons.github}</a>`);
    right.append(LS.themeButton());
    document.body.prepend(bar);
  }

  const simCard = (s) => {
    const f = fieldOf(s.field), used = LS.chaptersUsingSim(s.id);
    const el = document.createElement("a");
    el.className = "exp-card";
    el.href = LS.simUrl(s.id);
    LS.tint(el, f);
    el.innerHTML = `<span class="ico">${Lab.thumb(s)}</span><b>${esc(s.title)}</b><p>${esc(s.desc || "")}</p>
      <span class="row"><span class="pill" style="color:var(--c)">${esc(f.name)}</span>${s.three ? '<span class="pill acc2">3D</span>' : ""}${used.length ? `<span class="pill">${used.length}개 장에서 사용</span>` : ""}</span>`;
    return el;
  };

  /* ------------------------------------------------------------ 홈 */
  function home() {
    const books = D.books, nCh = books.reduce((s, b) => s + b.chapters.length, 0);
    $("#hero-title").innerHTML = (S.heroTitle || ["", ""]).map((l, i) => (i === S.heroTitle.length - 1 ? `<em>${esc(l)}</em>` : esc(l))).join("<br>");
    $("#hero-text").textContent = S.heroText || S.description || "";
    $("#hero-stats").innerHTML = [[books.length, "권의 책"], [nCh, "개의 챕터"], [sims().length, "개의 실험"], [D.fields.length, "개 분야"]].map(([n, t]) => `<div><b>${n}</b><span>${t}</span></div>`).join("");
    $("#hero-fields").innerHTML = '<span class="label">분야별로 보기</span>' + D.fields.map((f) => `<a class="chip" href="${url("library/index.html?field=" + f.id)}"><span class="dot" style="background:${f.color}"></span>${esc(f.name)}</a>`).join("");

    // 가로 책장
    const rail = $("#rail");
    rail.innerHTML = sortedBooks().map(LS.bookCard).join("");
    const step = () => rail.clientWidth * 0.8;
    $("#rail-prev").addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: "smooth" }));
    $("#rail-next").addEventListener("click", () => rail.scrollBy({ left: step(), behavior: "smooth" }));

    // 분야 카드
    $("#field-cards").innerHTML = D.fields.map((f) => {
      const live = f.books.filter((b) => b.status !== "planned").length;
      return `<a class="field-card" href="${url("library/index.html?field=" + f.id)}" style="--c-l:${f.color};--c-d:${f.colorDark || f.color}" data-tint><span class="en">${esc(f.en)}</span><b>${esc(f.name)}</b><p>${esc(f.desc || "")}</p><span class="count">책 ${f.books.length}권 (진행 ${live}) · 실험 ${sims().filter((s) => s.field === f.id).length}개</span></a>`;
    }).join("");
    $$("[data-tint]").forEach((el) => el.classList.add("tint"));

    // 실험 미리보기 — 분야별로 고르게
    const picks = [];
    const byField = D.fields.map((f) => sims().filter((s) => s.field === f.id));
    for (let k = 0; picks.length < 8 && k < 10; k++) byField.forEach((arr) => { if (arr[k] && picks.length < 8) picks.push(arr[k]); });
    const grid = $("#home-sims");
    picks.forEach((s) => grid.appendChild(simCard(s)));
    $("#sim-total").textContent = sims().length;

    // 저자의 말
    $("#author-body").innerHTML = (S.authorNote || []).map((p) => `<p${p.slot ? ' class="slot" data-slot="저자의 말 슬롯"' : ""}>${esc(p.text || p)}</p>`).join("") + `<p class="sign">— ${esc(S.author || "")}</p>`;
  }

  /* ------------------------------------------------------------ 전체 책장 */
  function library() {
    const q0 = new URLSearchParams(location.search);
    const st = { q: q0.get("q") || "", field: q0.get("field") || "all", status: q0.get("status") || "all" };
    const input = $("#lib-q");
    input.value = st.q;
    const chipRow = (el, items, key) => {
      el.innerHTML = items.map(([v, t, c]) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${st[key] === v}">${c ? `<span class="dot" style="background:${c}"></span>` : ""}${esc(t)}</button>`).join("");
      el.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; st[key] = b.dataset.v; $$("button", el).forEach((x) => x.setAttribute("aria-pressed", x === b)); render(); });
    };
    chipRow($("#lib-fields"), [["all", "전체"], ...D.fields.map((f) => [f.id, f.name, f.color])], "field");
    chipRow($("#lib-status"), [["all", "전체"], ...Object.entries(D.statusLabels)], "status");
    input.addEventListener("input", () => { st.q = input.value; render(); });
    function render() {
      const q = st.q.trim().toLowerCase();
      const ok = (b) => (st.field === "all" || b.field === st.field) && (st.status === "all" || b.status === st.status) &&
        (!q || [b.title, b.series, b.en, b.desc, b.tagline, ...b.chapters.map((c) => c.title)].join(" ").toLowerCase().includes(q));
      let shown = 0;
      $("#groups").innerHTML = D.fields.map((f) => {
        const list = sortedBooks().filter((b) => b.field === f.id && ok(b));
        shown += list.length;
        if (!list.length) return "";
        return `<section class="shelf-group tint" style="--c-l:${f.color};--c-d:${f.colorDark || f.color}"><header><h2>${esc(f.name)}</h2><span class="en">${esc(f.en)}</span><p>${esc(f.desc || "")}</p></header><div class="grid">${list.map(LS.bookCard).join("")}</div><div class="shelf-board"></div></section>`;
      }).join("");
      $("#no-result").hidden = shown > 0;
      $("#lib-count").textContent = `${shown}권`;
      const p = new URLSearchParams();
      if (st.q) p.set("q", st.q);
      if (st.field !== "all") p.set("field", st.field);
      if (st.status !== "all") p.set("status", st.status);
      history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
    }
    render();
  }

  /* ------------------------------------------------------------ 실험실 */
  function lab() {
    const q0 = new URLSearchParams(location.search);
    const st = { q: q0.get("q") || "", field: q0.get("field") || "all", three: false };
    const input = $("#lab-q");
    input.value = st.q;
    const row = $("#lab-fields");
    row.innerHTML = [["all", "전체"], ...D.fields.map((f) => [f.id, f.name, f.color])].map(([v, t, c]) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${st.field === v}">${c ? `<span class="dot" style="background:${c}"></span>` : ""}${esc(t)}</button>`).join("") + '<button type="button" class="chip" data-three aria-pressed="false">3D만</button>';
    row.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-three")) { st.three = !st.three; b.setAttribute("aria-pressed", st.three); }
      else { st.field = b.dataset.v; $$("button[data-v]", row).forEach((x) => x.setAttribute("aria-pressed", x === b)); }
      render();
    });
    input.addEventListener("input", () => { st.q = input.value; render(); });
    function render() {
      const q = st.q.trim().toLowerCase();
      const list = sims().filter((s) => (st.field === "all" || s.field === st.field) && (!st.three || s.three) && (!q || [s.title, s.desc, ...(s.tags || [])].join(" ").toLowerCase().includes(q)));
      const grid = $("#lab-grid");
      grid.innerHTML = "";
      list.forEach((s) => grid.appendChild(simCard(s)));
      $("#lab-count").textContent = `${list.length} / ${sims().length}개`;
      $("#lab-none").hidden = list.length > 0;
    }
    render();
  }

  /* ------------------------------------------------------------ 실험 하나 크게 */
  function labview() {
    const id = new URLSearchParams(location.search).get("id");
    const s = id && window.Lab && Lab.get(id);
    const root = $("#lab-view");
    if (!s) {
      root.innerHTML = `<h1>실험을 찾을 수 없습니다</h1><p class="desc">주소의 <code>?id=</code> 값을 확인하거나 <a href="${url("lab/index.html")}">실험실 목록</a>에서 골라 주세요.</p>`;
      return;
    }
    const f = fieldOf(s.field), list = sims(), i = list.indexOf(s), prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    const used = LS.chaptersUsingSim(s.id);
    document.title = `${s.title} · 실험실 · ${S.name}`;
    document.body.dataset.field = s.field;
    root.innerHTML = `<div class="crumbs"><a href="${url("lab/index.html")}">실험실</a><span>/</span><a href="${url("lab/index.html?field=" + s.field)}">${esc(f.name)}</a></div>
      <h1>${esc(s.title)}</h1><p class="desc">${esc(s.desc || "")}</p>
      <div class="row" style="display:flex;gap:6px;flex-wrap:wrap">${(s.tags || []).map((t) => `<span class="pill">${esc(t)}</span>`).join("")}</div>
      <div id="sim-host"></div>
      <div class="used-in"><h2>이 실험이 들어 있는 곳</h2>${used.length ? `<ul>${used.map((c) => `<li><a href="${url(c.href)}">${esc(c.book.series)} · ${esc(c.num)} ${esc(c.title)}</a></li>`).join("")}</ul>` : "<p>아직 어느 챕터에도 넣지 않았습니다.</p>"}
        <p style="margin:10px 0 0;font-size:14px;color:var(--text-dim)">챕터에 넣으려면 HTML에 <code>&lt;div data-sim="${esc(s.id)}"&gt;&lt;/div&gt;</code> 한 줄을 쓰세요.</p></div>
      <div class="nav"><a class="btn" href="${LS.simUrl(prev.id)}">← ${esc(prev.title.split(" — ")[0])}</a><a class="btn" href="${LS.simUrl(next.id)}">${esc(next.title.split(" — ")[0])} →</a></div>`;
    Lab.mount($("#sim-host"), s.id, { noLink: true, lazy: false });
  }

  /* ------------------------------------------------------------ 404 */
  function notfound() {
    const box = $("#nf-books");
    if (box) box.innerHTML = sortedBooks().filter((b) => b.href).map(LS.bookCard).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    header();
    ({ home, library, lab, labview, notfound }[page] || (() => {}))();
    document.body.append(LS.footer());
  });
})();
