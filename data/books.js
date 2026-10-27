/* ==========================================================================
   서재 데이터 — 분야(fields)와 책(books), 각 책의 챕터 목록
   이 파일이 사이트 전체의 목차입니다. 책·챕터를 추가하면 홈, 전체 책장,
   책 홈의 챕터 카드, 챕터 서랍, 이전/다음 링크, 검색이 자동으로 갱신됩니다.

   책 status:     "published"(출간) | "writing"(집필 중) | "planned"(집필 예정 — 페이지 없음)
   챕터 status:   "slot"(빈 템플릿) | "draft"(작성 중) | "done"(완성)
   chapter.sims:  그 챕터에 들어 있는 실험 id (assets/sims/*.js의 id). 카드에 칩으로 표시됨
   book.parts:    (선택) 부 목록 [{title, desc}]. chapter.part(1부터)로 묶어 책 홈과 서랍에 부 제목을 단다
   motif:         표지 그림 (assets/js/covers.js): attention · waves · orbit · field · network · levels · blank
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
      desc: "운동·파동·장·통계역학을 시뮬레이션으로 체험하고, 양자역학을 기초부터 유도합니다." },
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
        { slug: "p01", num: "01", status: "draft", title: "CHARM: 센서 설명을 읽는 시계열 임베딩 모델", desc: "채널별 텍스트 설명으로 합성곱 커널과 어텐션 게이트를 만들고 JEPA로 학습하는 7.1M 파라미터 시계열 표현 모델.", sims: ["charm-gating", "charm-jepa", "tcn-receptive"], paper: { year: 2026, venue: "ICML 2026", tags: ["시계열 표현학습", "JEPA", "멀티모달"] } },
        { slug: "p02", num: "02", status: "draft", title: "Timestral: 미스트랄의 시계열 예측 파운데이션 모델", desc: "값 토큰과 예측 토큰을 나눈 DHF, 공변량 방화벽 마스크, 단조 분위수 헤드. 논문 대신 공개 코드와 세 벤치마크 원자료로 검증한 5M–209M 확률 예측 모델.", sims: ["timestral-flow", "timestral-quantile", "timestral-scaler", "timestral-symavg", "patching"], paper: { year: 2026, venue: "Mistral AI 모델 공개", tags: ["시계열 예측", "파운데이션 모델", "확률 예측"] } },
        { slug: "p03", num: "03", status: "draft", title: "OpenTSLM: 시계열을 읽고 설명하는 언어 모델", desc: "사전학습 LLM에 시계열을 소프트 프롬프트 또는 Flamingo식 교차 어텐션으로 붙이고, 근거 문장을 쓰며 답하도록 학습한 오픈소스 시계열 언어 모델.", sims: ["tslm-tokens", "flamingo-xattn", "tslm-noise"], paper: { year: 2026, venue: "ICML 2026", tags: ["시계열 언어모델", "멀티모달 LLM", "의료"] } },
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

    /* ------------------------------------------------------------ 양자역학 (이론서) */
    // 집필 규칙: books/quantum/GUIDE.md · 슬롯 챕터의 desc는 그 장의 절 목록이다 (작성하면 한두 문장 요약으로 바꾼다)
    {
      id: "quantum", field: "phys", status: "writing", kind: "textbook", motif: "levels",
      series: "QuantumBook", title: "차근차근 양자역학", en: "Quantum Mechanics, Step by Step",
      tagline: "벡터 공간에서 디랙 방정식까지",
      desc: "샨카의 양자역학 교과서 순서를 따라, 필요한 수학부터 공준, 1차원 문제, 각운동량, 근사법, 산란까지 한 절씩 유도하며 쌓아 가는 이론서입니다.",
      path: "books/quantum/",
      // 챕터의 part(1부터)가 이 배열을 가리킨다. 책 홈과 서랍에서 부별로 묶어 보여 준다.
      parts: [
        { title: "수학적 준비", desc: "양자역학의 언어인 선형대수를 디랙 표기법으로 익힙니다." },
        { title: "출발점", desc: "고전역학을 해밀턴 형식으로 다시 보고, 그것이 설명하지 못한 실험을 살핍니다." },
        { title: "양자역학의 뼈대", desc: "공준을 세우고 1차원 문제, 조화 진동자, 불확정성, 묘사, 경로 적분으로 구조를 다집니다." },
        { title: "대칭과 각운동량", desc: "여러 입자, 대칭과 보존, 각운동량, 수소 원자, 스핀과 그 합성을 다룹니다." },
        { title: "근사법", desc: "정확히 풀리지 않는 문제를 다루는 변분법, WKB, 섭동론, 산란 이론입니다." },
        { title: "더 나아가", desc: "밀도 행렬과 얽힘, 그리고 상대론적 양자역학의 입구입니다." },
      ],
      chapters: [
        { slug: "ch01", num: "01", part: 1, status: "draft", title: "벡터 공간과 디랙 표기법", desc: "상태가 사는 복소 벡터 공간을 공리에서 세우고, 내적과 슈바르츠 부등식, 그람-슈미트 과정, 브라·켓 표기법, 부분공간과 직합을 익힌다." },
        { slug: "ch02", num: "02", part: 1, status: "draft", title: "선형 연산자", desc: "연산자를 행렬로 다루고, 완비성 관계와 투영, 에르미트·유니타리 연산자, 고유값 문제와 스펙트럼 정리, 동시 대각화, 연산자의 지수 함수를 익힌다." },
        { slug: "ch03", num: "03", part: 1, status: "draft", title: "무한 차원으로", desc: "함수를 성분이 연속인 벡터로 보고, 디랙 델타와 위치 기저, 위치·운동량 연산자와 정준 교환 관계, 기저 바꾸기로서의 푸리에 변환, 연속 고유값의 델타 정규화와 상자 정규화를 익힌다." },
        { slug: "ch04", num: "04", part: 2, status: "draft", title: "고전역학 다시 보기", desc: "최소 작용의 원리에서 라그랑주 방정식을 유도하고, 해밀턴 형식과 위상 공간, 푸아송 괄호, 정준 변환과 생성자, 대칭과 보존 법칙을 양자역학과 같은 구조로 정리한다." },
        { slug: "ch05", num: "05", part: 2, status: "slot", title: "고전 물리가 막힌 곳", desc: "흑체 복사와 광전 효과 · 원자의 안정성과 선 스펙트럼 · 이중 슬릿 · 드브로이 파장 · 슈테른-게를라흐 실험" },
        { slug: "ch06", num: "06", part: 3, status: "slot", title: "양자역학의 공준", desc: "상태는 벡터 · 관측량은 에르미트 연산자 · 측정과 보른 규칙 · 기댓값과 분산 · 슈뢰딩거 방정식 · 정상 상태" },
        { slug: "ch07", num: "07", part: 3, status: "slot", title: "1차원 문제", desc: "자유 입자와 파속의 퍼짐 · 무한 우물 · 확률 흐름 · 계단 퍼텐셜의 반사와 투과 · 장벽과 터널링 · 유한 우물 · 1차원의 일반 정리" },
        { slug: "ch08", num: "08", part: 3, status: "slot", title: "조화 진동자", desc: "좌표 표현과 에르미트 다항식 · 사다리 연산자 · 수 연산자 기저 · 결맞음 상태" },
        { slug: "ch09", num: "09", part: 3, status: "slot", title: "불확정성과 고전 극한", desc: "일반 불확정성 관계 · 최소 불확정 파속 · 에너지-시간 관계 · 에렌페스트 정리" },
        { slug: "ch10", num: "10", part: 3, status: "slot", title: "세 가지 묘사", desc: "유니타리 변환 · 슈뢰딩거 묘사 · 하이젠베르크 묘사 · 상호작용 묘사" },
        { slug: "ch11", num: "11", part: 3, status: "slot", title: "경로 적분", desc: "전파 함수 · 파인만의 처방 · 자유 입자 계산 · 고전 극한과 정류 위상" },
        { slug: "ch12", num: "12", part: 4, status: "slot", title: "여러 입자와 동일 입자", desc: "텐서곱 공간 · 두 입자계 · 보손과 페르미온 · 파울리 배타 원리" },
        { slug: "ch13", num: "13", part: 4, status: "slot", title: "대칭과 보존", desc: "병진과 운동량 · 시간 병진과 에너지 · 패리티 · 시간 반전" },
        { slug: "ch14", num: "14", part: 4, status: "slot", title: "각운동량", desc: "2차원 회전 · 교환 관계 · 사다리 연산자로 푸는 고유값 문제 · 구면 조화 함수 · 중심력 문제" },
        { slug: "ch15", num: "15", part: 4, status: "slot", title: "수소 원자", desc: "2체 문제의 분리 · 지름 방정식과 라게르 다항식 · 에너지 준위와 축퇴 · 오비탈의 모양" },
        { slug: "ch16", num: "16", part: 4, status: "slot", title: "스핀", desc: "스핀 1/2와 파울리 행렬 · 슈테른-게를라흐 다시 보기 · 자기장 속 세차 운동 · 자기 공명" },
        { slug: "ch17", num: "17", part: 4, status: "slot", title: "각운동량의 합성", desc: "두 스핀의 삼중항과 단일항 · 클렙시-고든 계수 · 텐서 연산자" },
        { slug: "ch18", num: "18", part: 5, status: "slot", title: "변분법과 WKB", desc: "변분 원리 · 헬륨 바닥 상태 · WKB 근사 · 연결 공식 · 보어-좀머펠트 양자화" },
        { slug: "ch19", num: "19", part: 5, status: "slot", title: "시간 무관 섭동론", desc: "비축퇴 섭동 · 축퇴 섭동 · 슈타르크 효과 · 미세 구조 · 제이만 효과" },
        { slug: "ch20", num: "20", part: 5, status: "slot", title: "시간 의존 섭동론", desc: "상호작용 묘사에서의 전개 · 페르미 황금률 · 빛의 흡수와 방출 · 선택 규칙 · 단열 정리와 베리 위상" },
        { slug: "ch21", num: "21", part: 5, status: "slot", title: "산란", desc: "단면적 · 보른 근사 · 부분파 전개 · 위상 이동과 공명" },
        { slug: "ch22", num: "22", part: 6, status: "slot", title: "밀도 행렬과 얽힘", desc: "순수 상태와 혼합 상태 · 축약 밀도 행렬 · 얽힘 · EPR과 벨 부등식" },
        { slug: "ch23", num: "23", part: 6, status: "slot", title: "디랙 방정식", desc: "클라인-고든 방정식 · 디랙 방정식 · 스핀의 등장 · 수소 미세 구조 다시 보기" },
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
