/* ==========================================================================
   서재 데이터 — 분야(fields)와 책(books), 각 책의 챕터 목록
   이 파일이 사이트 전체의 목차입니다. 책·챕터를 추가하면 홈, 전체 책장,
   책 홈의 챕터 카드, 챕터 서랍, 이전/다음 링크, 검색이 자동으로 갱신됩니다.

   책 status:     "published"(출간) | "writing"(집필 중) | "planned"(집필 예정 — 페이지 없음)
   챕터 status:   "slot"(빈 템플릿) | "draft"(작성 중) | "done"(완성)
   chapter.sims:  그 챕터에 들어 있는 실험 id (assets/sims/*.js의 id). 카드에 칩으로 표시됨
   motif:         표지 그림 (assets/js/covers.js): attention · waves · orbit · field · network · blank
   ========================================================================== */
window.SHELF_DATA = {
  statusLabels: { published: "출간", writing: "집필 중", planned: "집필 예정" },
  chapterStatusLabels: { slot: "빈 슬롯", draft: "작성 중", done: "완성" },

  fields: [
    { id: "dl", name: "딥러닝", en: "Deep Learning", color: "#4f46e5", colorDark: "#a5b4fc",
      desc: "논문을 읽고, 핵심 아이디어를 직접 돌려 보며 정리합니다." },
    { id: "ts", name: "시계열", en: "Time Series", color: "#0d9488", colorDark: "#5eead4",
      desc: "시간 순서가 있는 데이터를 다루는 통계와 딥러닝 모델." },
    { id: "phys", name: "물리학", en: "Physics", color: "#ea580c", colorDark: "#fdba74",
      desc: "운동·파동·장·통계역학을 시뮬레이션으로 체험합니다." },
    { id: "bridge", name: "융합 연구", en: "Physics × AI", color: "#c026d3", colorDark: "#f0abfc",
      desc: "물리 법칙을 아는 신경망, 신경망으로 푸는 물리." },
  ],

  books: [
    /* ------------------------------------------------------------ 논문 리뷰 */
    {
      id: "paper-review", field: "dl", status: "writing", kind: "papers", motif: "attention",
      series: "PaperBook", title: "딥러닝 논문 리뷰", en: "Deep Learning Paper Reviews",
      tagline: "논문 한 편을 실험 하나로",
      desc: "읽은 논문을 TL;DR, 방법, 결과, 한계, 구현 노트로 정리하고 핵심 아이디어를 인터랙티브 실험으로 재현합니다.",
      path: "books/paper-review/",
      chapters: [
        { slug: "p01", num: "01", status: "slot", title: "논문 리뷰 슬롯 01", desc: "리뷰할 논문을 정하면 제목과 한 줄 요약을 채우세요. (예시 실험: 어텐션)", sims: ["attention-qk", "attention-matrix"], paper: { year: null, venue: "", tags: [] } },
        { slug: "p02", num: "02", status: "slot", title: "논문 리뷰 슬롯 02", desc: "리뷰할 논문을 정하면 제목과 한 줄 요약을 채우세요. (예시 실험: 위치 인코딩·디코딩)", sims: ["posenc", "softmax-temp"], paper: { year: null, venue: "", tags: [] } },
        { slug: "p03", num: "03", status: "slot", title: "논문 리뷰 슬롯 03", desc: "리뷰할 논문을 정하면 제목과 한 줄 요약을 채우세요. (예시 실험: 합성곱·초기화)", sims: ["conv2d", "init-depth"], paper: { year: null, venue: "", tags: [] } },
        { slug: "p04", num: "04", status: "slot", title: "논문 리뷰 슬롯 04", desc: "리뷰할 논문을 정하면 제목과 한 줄 요약을 채우세요. (예시 실험: 확산 모델)", sims: ["diffusion2d"], paper: { year: null, venue: "", tags: [] } },
        { slug: "p05", num: "05", status: "slot", title: "논문 리뷰 슬롯 05", desc: "리뷰할 논문을 정하면 제목과 한 줄 요약을 채우세요. (예시 실험: 옵티마이저)", sims: ["optimizers", "lr-schedule", "landscape3d"], paper: { year: null, venue: "", tags: [] } },
        { slug: "p06", num: "06", status: "slot", title: "논문 리뷰 슬롯 06", desc: "리뷰할 논문을 정하면 제목과 한 줄 요약을 채우세요. (예시 실험: 신경망 학습·과적합)", sims: ["nn-playground", "overfit", "activations"], paper: { year: null, venue: "", tags: [] } },
      ],
    },

    /* ------------------------------------------------------------ 시계열 딥러닝 */
    {
      id: "timeseries-dl", field: "ts", status: "writing", kind: "textbook", motif: "waves",
      series: "SeriesBook", title: "시계열 딥러닝", en: "Deep Learning for Time Series",
      tagline: "과거로 미래를 읽는 법",
      desc: "분해·자기상관·스펙트럼 같은 고전 도구부터 RNN, TCN, 패칭 기반 트랜스포머까지 시계열 모델을 시뮬레이터로 익힙니다.",
      path: "books/timeseries-dl/",
      chapters: [
        { slug: "ch01", num: "01", status: "slot", title: "챕터 01 (제목 미정)", desc: "예시 실험: 추세·계절성·잡음으로 시계열 만들고 분해하기.", sims: ["ts-decompose"] },
        { slug: "ch02", num: "02", status: "slot", title: "챕터 02 (제목 미정)", desc: "예시 실험: 자기상관(ACF·PACF)과 푸리에 스펙트럼.", sims: ["acf", "fft"] },
        { slug: "ch03", num: "03", status: "slot", title: "챕터 03 (제목 미정)", desc: "예시 실험: 슬라이딩 윈도우 데이터셋과 패칭.", sims: ["windowing", "patching"] },
        { slug: "ch04", num: "04", status: "slot", title: "챕터 04 (제목 미정)", desc: "예시 실험: 나이브·지수평활·AR 예측 비교.", sims: ["forecast"] },
        { slug: "ch05", num: "05", status: "slot", title: "챕터 05 (제목 미정)", desc: "예시 실험: RNN과 LSTM의 기억 — 기울기 소실.", sims: ["rnn-memory"] },
        { slug: "ch06", num: "06", status: "slot", title: "챕터 06 (제목 미정)", desc: "예시 실험: 팽창 인과 합성곱(TCN)의 수용 영역.", sims: ["tcn-receptive"] },
        { slug: "ch07", num: "07", status: "slot", title: "챕터 07 (제목 미정)", desc: "예시 실험: 롤링 z-점수 이상 탐지.", sims: ["anomaly"] },
        { slug: "ch08", num: "08", status: "slot", title: "챕터 08 (제목 미정)", desc: "예시 실험: 카오스와 예측 가능성의 한계.", sims: ["lorenz3d"] },
      ],
    },

    /* ------------------------------------------------------------ 물리학 */
    {
      id: "physics", field: "phys", status: "writing", kind: "textbook", motif: "orbit",
      series: "PhysBook", title: "움직이는 물리학", en: "Physics in Motion",
      tagline: "방정식을 직접 굴려 보기",
      desc: "포물선 운동, 진동, 궤도, 파동, 전기장, 확산, 상전이, 카오스까지 — 미분방정식을 브라우저에서 적분하며 배웁니다.",
      path: "books/physics/",
      chapters: [
        { slug: "ch01", num: "01", status: "slot", title: "챕터 01 (제목 미정)", desc: "예시 실험: 공기 저항이 있는 포물선 운동.", sims: ["projectile"] },
        { slug: "ch02", num: "02", status: "slot", title: "챕터 02 (제목 미정)", desc: "예시 실험: 진자의 위상 공간, 강제 진동과 공명.", sims: ["pendulum", "oscillator"] },
        { slug: "ch03", num: "03", status: "slot", title: "챕터 03 (제목 미정)", desc: "예시 실험: 케플러 궤도와 면적 속도 일정.", sims: ["orbit"] },
        { slug: "ch04", num: "04", status: "slot", title: "챕터 04 (제목 미정)", desc: "예시 실험: 파동의 중첩과 이중 슬릿 간섭.", sims: ["waves", "double-slit"] },
        { slug: "ch05", num: "05", status: "slot", title: "챕터 05 (제목 미정)", desc: "예시 실험: 점전하가 만드는 전기장과 전위.", sims: ["efield"] },
        { slug: "ch06", num: "06", status: "slot", title: "챕터 06 (제목 미정)", desc: "예시 실험: 랜덤 워크와 열 확산.", sims: ["random-walk", "heat"] },
        { slug: "ch07", num: "07", status: "slot", title: "챕터 07 (제목 미정)", desc: "예시 실험: 이징 모형의 상전이 (몬테카를로).", sims: ["ising"] },
        { slug: "ch08", num: "08", status: "slot", title: "챕터 08 (제목 미정)", desc: "예시 실험: 이중 진자와 로렌츠 끌개 — 카오스.", sims: ["double-pendulum", "lorenz3d"] },
      ],
    },

    /* ------------------------------------------------------------ 집필 예정 (페이지 없음) */
    {
      id: "physics-ml", field: "bridge", status: "planned", kind: "textbook", motif: "field",
      series: "PINNBook", title: "물리 × 딥러닝", en: "Physics-Informed Machine Learning",
      tagline: "법칙을 아는 신경망",
      desc: "PINN, Neural ODE, 해밀토니안 신경망 등 물리 법칙과 딥러닝을 잇는 방법을 다룰 예정입니다.",
      path: "books/physics-ml/", chapters: [],
    },
    {
      id: "dl-foundations", field: "dl", status: "planned", kind: "textbook", motif: "network",
      series: "DeepBook", title: "딥러닝 기초", en: "Foundations of Deep Learning",
      tagline: "뉴런 하나에서 트랜스포머까지",
      desc: "논문 리뷰를 읽기 위한 기초 — 역전파, 최적화, 정규화, 아키텍처를 정리할 예정입니다.",
      path: "books/dl-foundations/", chapters: [],
    },
  ],
};
