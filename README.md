# LabShelf · 인터랙티브 연구 서재

딥러닝 논문 리뷰, 시계열 딥러닝, 물리학을 **직접 움직여 보는 실험**과 함께 읽는 웹 교과서 서재입니다.
빌드 도구 없이 HTML · CSS · JavaScript 파일만으로 동작하므로 GitHub Pages에 그대로 올리면 됩니다.

- 서재(허브): 홈 · 전체 책장 · 실험실(모든 실험 모음) · 실험 크게 보기
- 책 4권: 딥러닝 논문 리뷰(리뷰 슬롯 6개), 시계열 딥러닝(챕터 슬롯 8개), 움직이는 물리학(3부 13장, 1부 고전역학부터 집필), 차근차근 양자역학(이론서, 6부 23장)
- 집필 예정 책 2권: 물리 × 딥러닝, 딥러닝 기초 (표지만 있고 페이지는 없음)
- 인터랙티브 실험 54개 (2D 캔버스 + 3D three.js), 책별 3D 첫 화면, 밝은/어두운 테마, 통합 검색

---

## 1. 내 컴퓨터에서 보기

**방법 A — 그냥 열기:** `index.html`을 더블클릭하면 브라우저에서 열립니다.

**방법 B — 로컬 서버 (권장, GitHub Pages와 가장 비슷):**

```bash
# 이 폴더에서
python -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

> 수식(KaTeX), 3D(three.js), 글꼴은 CDN에서 받아 오므로 인터넷 연결이 필요합니다.

---

## 2. GitHub Pages로 배포하기 (처음 하는 경우)

GitHub Pages는 GitHub 저장소의 파일을 그대로 웹사이트로 띄워 주는 무료 호스팅입니다.
공개(Public) 저장소면 무료입니다.

### 2-1. 저장소 만들기

1. <https://github.com> 에 로그인합니다. (계정이 없으면 가입)
2. 오른쪽 위 **+** → **New repository**
3. **Repository name**: 예) `labshelf` — 이 이름이 주소에 들어갑니다.
4. **Public** 선택 → **Create repository**

### 2-2. 파일 올리기 — 둘 중 하나를 고르세요

**방법 A: 웹 브라우저로 올리기 (git을 몰라도 됨)**

1. 방금 만든 저장소 화면에서 **uploading an existing file** 링크(또는 **Add file → Upload files**)를 누릅니다.
2. 이 폴더 **안의 내용물 전부**(`index.html`, `assets`, `books`, `data`, `lab`, `library`, `templates`, `404.html`, `.nojekyll` …)를 끌어다 놓습니다.
   - 폴더 자체가 아니라 **폴더 안의 파일들**을 올려야 `index.html`이 저장소 맨 위에 옵니다.
   - `.nojekyll`처럼 점으로 시작하는 파일은 탐색기에서 숨겨져 있을 수 있습니다. 보기 → 숨긴 항목을 켜고 함께 올리세요.
3. 아래 **Commit changes**를 누릅니다.

**방법 B: git 명령으로 올리기 (앞으로 계속 수정할 거라면 추천)**

```bash
# 이 폴더에서 한 번만
git init
git add .
git commit -m "첫 배포"
git branch -M main
git remote add origin https://github.com/<내-아이디>/<저장소-이름>.git
git push -u origin main
```

처음 `push`할 때 GitHub 로그인 창이 뜨면 로그인하면 됩니다.

### 2-3. Pages 켜기

1. 저장소 화면 위쪽 **Settings** → 왼쪽 메뉴 **Pages**
2. **Build and deployment** → **Source**: `Deploy from a branch`
3. **Branch**: `main` / `/ (root)` 선택 → **Save**
4. 1~2분 기다리면 같은 화면 위쪽에 주소가 나타납니다.

```
https://<내-아이디>.github.io/<저장소-이름>/
```

저장소 첫 화면의 **Actions** 탭에서 `pages build and deployment`가 초록색 ✓가 되면 배포가 끝난 것입니다.

### 2-4. 수정 후 다시 배포

파일을 고친 뒤 다시 올리기만 하면 자동으로 다시 배포됩니다.

```bash
git add .
git commit -m "3장 내용 추가"
git push
```

(웹으로 올린 경우에는 같은 파일을 다시 업로드하면 덮어써집니다.)

### 2-5. 자주 막히는 곳

| 증상 | 원인과 해결 |
|---|---|
| 주소에 들어가면 404 | 배포에 1~2분 걸립니다. Actions 탭이 초록색인지 확인하세요. `index.html`이 저장소 **맨 위**에 있어야 합니다. |
| 내 컴퓨터에선 되는데 배포하면 그림/스크립트가 안 나옴 | GitHub Pages는 **대소문자를 구분**합니다. Windows는 구분하지 않으므로 `Ch01.html`과 `ch01.html`을 섞어 쓰지 마세요. |
| 고쳤는데 그대로 보임 | 브라우저 캐시입니다. `Ctrl + F5`로 새로고침하세요. |
| 비공개(Private) 저장소에서 Pages 메뉴가 안 됨 | 무료 계정은 공개 저장소만 Pages를 쓸 수 있습니다. |
| 저장소 이름을 `<내-아이디>.github.io`로 만든 경우 | 주소가 `https://<내-아이디>.github.io/`가 됩니다. 사이트는 그대로 동작하지만, `404.html` 위쪽의 `FORCE_BASE`를 `"/"`로 바꿔 주세요. |

> 모든 링크가 상대 경로로 되어 있어서 `/<저장소-이름>/` 아래에 올려도, 개인 도메인에 올려도 그대로 동작합니다.
> `.nojekyll` 파일은 GitHub의 Jekyll 변환을 끄고 파일을 있는 그대로 보내게 합니다. 지우지 마세요.

---

## 3. 폴더 구조

```
index.html              서재 홈
library/index.html      전체 책장 (분야·상태 필터, 검색)
lab/index.html          실험실 — 모든 실험 목록
lab/view.html?id=…      실험 하나를 크게 보기
404.html                없는 주소용 페이지
data/
  site.js               사이트 이름·소개 문구·저자 정보
  books.js              ★ 분야·책·챕터 목록 (사이트 전체의 목차)
books/
  paper-review/         딥러닝 논문 리뷰  (index.html + chapters/p01~p06.html)
  timeseries-dl/        시계열 딥러닝     (index.html + chapters/ch01~ch08.html)
  physics/              움직이는 물리학   (index.html + chapters/ch01~ch13.html + GUIDE.md 집필 계획)
  quantum/              차근차근 양자역학 (index.html + chapters/ch01~ch23.html + GUIDE.md 집필 가이드)
templates/
  chapter.html          새 교과서형 챕터 틀 (실험 중심 책)
  textbook.html         새 이론서 장 틀 (정의·정리·예제·연습문제, 자동 번호)
  paper.html            새 논문 리뷰 틀
assets/
  css/base.css          공통 디자인 (색·글꼴·실험 카드·표지)
  css/shelf.css         서재 페이지 디자인
  css/book.css          책·챕터 페이지 디자인 (슬롯, 그림, 수식, 퀴즈…)
  js/core.js            경로·테마·검색 등 공통 기능
  js/viz.js             그리기 도구 (캔버스, 차트, 컬러맵, three.js 불러오기)
  js/lab.js             실험 등록과 실험 카드 틀
  js/book.js            책 페이지 레이아웃 (상단바, 목차, 이전/다음, 퀴즈, 수식)
  js/shelf.js           서재 페이지 렌더링
  js/widgets.js         결과 차트·레이더 차트·코드 복사
  js/heroes.js          첫 화면 3D 장면
  js/covers.js          책 표지 그림
  sims/dl.js            딥러닝 실험 18개
  sims/ts.js            시계열 실험 13개
  sims/phys.js          물리 실험 23개
```

---

## 4. 내용 채우기

### 4-1. 슬롯 채우기

점선 상자로 보이는 곳이 **슬롯**(빈자리)입니다. HTML에서 `class="slot"`이 붙은 요소입니다.

```html
<!-- 지금 -->
<p class="slot" data-slot="본문">도입 문단 — …</p>
<!-- 채운 뒤: class와 data-slot을 지우고 내용을 쓴다 -->
<p>시계열이란 시간 순서로 관측한 값의 나열이다. …</p>
```

### 4-2. 챕터 제목 바꾸기

제목·설명은 `data/books.js`에서만 바꾸면 됩니다. 챕터 페이지, 책 홈의 카드, 서랍 목차, 이전/다음 링크, 검색에 자동 반영됩니다.

```js
{ slug: "ch01", num: "01", status: "draft", title: "시계열 데이터의 모양", desc: "추세·계절성·잡음", sims: ["ts-decompose"] },
```

- `status`: `"slot"`(빈 틀) → `"draft"`(작성 중) → `"done"`(완성). 카드의 배지가 바뀝니다.
- 논문 리뷰는 `paper: { year: 2017, venue: "NeurIPS", tags: ["Transformer"] }`를 채우면 책 홈의 **논문 연대표**와 **표**에 나타납니다.

### 4-3. 새 챕터 추가

1. `templates/chapter.html`(논문이면 `templates/paper.html`)을 `books/<책>/chapters/<slug>.html`로 복사
2. 파일 안 `<body ...>`의 `data-book`, `data-field`, `data-chapter`를 고침
   (예: `data-book="physics" data-field="phys" data-chapter="ch14"`)
3. `data/books.js`의 그 책 `chapters` 배열에 한 줄 추가

### 4-4. 새 책 추가

1. `data/books.js`의 `books`에 항목 추가 (`status: "planned"`면 표지만 보이고 페이지는 없어도 됨)
2. 페이지를 만들 때는 `books/physics/` 폴더를 통째로 복사해 이름을 바꾸고, `index.html`과 챕터의 `data-book`을 새 id로 고칩니다.
3. 새 분야가 필요하면 `fields`에 추가하고, 강조색은 `assets/css/base.css`의 `body[data-field="…"]` 규칙을 하나 더 만듭니다.

### 4-5. 본문에 쓸 수 있는 부품

| 하고 싶은 것 | HTML |
|---|---|
| 실험 넣기 | `<div data-sim="optimizers"></div>` (id는 실험실 페이지의 각 실험 하단에 표시) |
| 실험 제목·안내 바꾸기 | `<div data-sim="fft" data-title="새 제목" data-note="해볼 것: …"></div>` |
| 수식 | 인라인 `\( E = mc^2 \)`, 블록 `<div class="formula">\[ … \]</div>` |
| 결과 막대 차트 | `<div data-chart='{"type":"bar","labels":["A","B"],"series":[{"name":"기준선","data":[60,70]},{"name":"제안","data":[65,78]}],"highlight":"제안"}'></div>` |
| 꺾은선 차트 | 위와 같고 `"type":"line"` |
| 리뷰 평가 레이더 | `<div data-radar='{"신규성":4,"명확성":3,"재현성":2}' data-max="5"></div>` |
| 강조 상자 | `<div class="callout tip"><strong>제목</strong><p>…</p></div>` (`tip` · `warn` · `deep`) |
| 정의·정리·예제·수학 상자 (이론서) | `<div class="box def" id="def-…"><div class="box-h">이름</div>…</div>` (`def` · `thm` · `ex` · `math`, 번호 자동) |
| 번호 식과 참조 (이론서) | `<div class="formula" id="eq-…">\[ … \]</div>`, 참조는 `<a class="ref" href="#eq-…"></a>` |
| 증명·풀이 접기, 연습문제 | `<details class="proof">`, `<div class="prob" data-level="2">…<details class="sol">…</details></div>` — `templates/textbook.html` 참고 |
| 퀴즈 | 챕터 맨 아래 예시 참고 — 정답 보기에 `data-correct` |
| 그림 | `<figure class="diagram"><svg viewBox="0 0 800 300">…</svg><figcaption>…</figcaption></figure>` |

SVG 그림 안에서는 테마를 따라 색이 바뀌는 클래스를 쓸 수 있습니다:
`t`(글자) `t-dim` `t-mono` `t-acc` · `s-line`(선) `s-acc` · `f-surface`(면) `f-acc` `f-acc-soft` · `flow-dash`(흐르는 점선)

---

## 5. 새 실험 만들기

`assets/sims/` 아래 파일(또는 새 파일)에 `Lab.register`를 추가합니다. 새 파일을 만들면 각 HTML의 `<script defer src=".../assets/sims/...">` 목록에도 추가하세요.

```js
Lab.register({
  id: "my-sim",                    // data-sim="my-sim"으로 부름
  field: "phys",                   // dl | ts | phys | bridge
  title: "내 실험 — 부제",
  desc: "실험실 카드에 보일 한 줄 설명",
  tags: ["태그"],
  thumb: "curve",                  // 썸네일 모양: curve bars heat scatter network orbit wave field surface arcs windows particles pendulum grid
  note: "해볼 것: …",
  mount(S) {
    const st = { k: 1 };
    const cv = S.canvas({ aspect: 0.5 }, (ctx, w, h) => {
      const P = VZ.palette();      // 테마 색
      VZ.chart(ctx, null, {
        x: [0, 10], y: [-1, 1],
        series: [{ data: VZ.linspace(0, 10, 200).map((x) => [x, Math.sin(st.k * x)]), color: P.accent }],
      });
    });
    S.range({ label: "진동수 k", min: 0.5, max: 5, step: 0.1, value: st.k, onInput: (v) => { st.k = v; cv.redraw(); } });
  },
});
```

`S`가 제공하는 것: `canvas` · `split` · `panel` · `range` · `select` · `seg` · `check` · `text` · `button` · `stats` · `legend` · `note` · `loop`(애니메이션) · `three`(3D).
기존 34개 실험의 코드가 모두 예제입니다.

---

## 6. 꾸미기

- 사이트 이름·소개·저자·GitHub 주소: `data/site.js`
- 분야 색: `data/books.js`의 `fields[].color` (표지·칩) + `assets/css/base.css`의 `body[data-field]` (책 페이지 강조색)
- 표지 그림: `data/books.js`의 `motif` (`attention` · `waves` · `orbit` · `field` · `network` · `levels` · `blank`), 새 그림은 `assets/js/covers.js`에 추가
- 서재 색(종이·책장): `assets/css/shelf.css` 맨 위
