/* ==========================================================================
   서재 데이터 — 분야(fields)와 책(books), 각 책의 챕터 목록
   이 파일이 사이트 전체의 목차입니다. 책·챕터를 추가하면 홈, 전체 책장,
   책 홈의 챕터 카드, 챕터 서랍, 이전/다음 링크, 검색이 자동으로 갱신됩니다.

   책 status:     "published"(집필 완료) | "writing"(집필 중) | "planned"(집필 예정 — 페이지 없음)
   챕터 status:   "slot"(빈 템플릿) | "draft"(작성 중) | "done"(완성)
   chapter.sims:  그 챕터에 들어 있는 실험 id (assets/sims/*.js의 id). 카드에 칩으로 표시됨
   book.parts:    (선택) 부 목록 [{title, desc}]. chapter.part(1부터)로 묶어 책 홈과 서랍에 부 제목을 단다
   motif:         표지 그림 (assets/js/covers.js): attention · waves · orbit · field · network · levels · bell · lattice · blank
   ========================================================================== */
window.SHELF_DATA = {
  statusLabels: { published: "집필 완료", writing: "집필 중", planned: "집필 예정" },
  chapterStatusLabels: { slot: "빈 슬롯", draft: "작성 중", done: "완성" },

  fields: [
    { id: "dl", name: "딥러닝", en: "Deep Learning", color: "#4f46e5", colorDark: "#a5b4fc",
      desc: "논문을 읽고, 핵심 아이디어를 직접 돌려 보며 정리합니다." },
    { id: "ts", name: "시계열", en: "Time Series", color: "#0d9488", colorDark: "#5eead4",
      desc: "시간 순서가 있는 데이터를 다루는 통계와 딥러닝 모델." },
    { id: "phys", name: "물리학", en: "Physics", color: "#ea580c", colorDark: "#fdba74",
      desc: "운동·파동·장·통계역학을 시뮬레이션으로 체험하고, 양자역학을 기초부터 유도합니다." },
    { id: "math", name: "수학", en: "Mathematics", color: "#0284c7", colorDark: "#7dd3fc",
      desc: "머신러닝과 딥러닝이 기대는 선형대수와 확률·통계를 정의부터 유도하며 익힙니다." },
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
    // 집필 계획: books/physics/GUIDE.md · 1부 슬롯의 desc는 그 장의 실험 목록이다. sims에는 구현된(등록된) 실험만 넣는다
    {
      id: "physics", field: "phys", status: "writing", kind: "textbook", motif: "orbit",
      series: "PhysBook", title: "움직이는 물리학", en: "Physics in Motion",
      tagline: "방정식을 직접 굴려 보기",
      desc: "포물선 운동, 진동, 궤도, 파동, 전기장, 확산, 상전이, 카오스까지 — 미분방정식을 브라우저에서 적분하며 배웁니다.",
      path: "books/physics/",
      parts: [
        { title: "고전역학", desc: "힘과 운동, 에너지와 운동량, 회전, 진동, 궤도, 카오스까지 — 뉴턴 역학의 대표 실험을 매개변수를 바꿔 가며 확인합니다." },
        { title: "파동과 광학", desc: "파동이 겹쳐 만드는 정상파와 맥놀이, 빛의 이중 슬릿 간섭을 다룹니다." },
        { title: "전자기학", desc: "전하가 만드는 전기장과 전위를 다룹니다." },
        { title: "열과 통계역학", desc: "많은 입자의 무작위 운동이 만드는 확산과 열의 흐름, 온도가 만드는 상전이를 다룹니다." },
      ],
      chapters: [
        { slug: "ch01", num: "01", part: 1, status: "slot", title: "포물선 운동", desc: "실험: 포물선 운동과 공기 저항", sims: ["projectile"] },
        { slug: "ch02", num: "02", part: 1, status: "slot", title: "힘과 뉴턴 법칙", desc: "실험: 빗면 위의 물체와 마찰 · 애트우드 기계 · 원운동과 구심력 (경사 커브)", sims: ["incline", "atwood", "banked-curve"] },
        { slug: "ch03", num: "03", part: 1, status: "slot", title: "에너지와 운동량", desc: "실험: 역학적 에너지 보존 (연직 루프) · 충돌과 운동량 보존", sims: ["loop", "collision"] },
        { slug: "ch04", num: "04", part: 1, status: "slot", title: "강체의 회전", desc: "실험: 굴림 경주 (관성 모멘트)", sims: ["rolling"] },
        { slug: "ch05", num: "05", part: 1, status: "slot", title: "진동", desc: "실험: 단진동과 감쇠 · 진자", sims: ["damped-spring", "pendulum"] },
        { slug: "ch06", num: "06", part: 1, status: "slot", title: "공명과 결합 진동", desc: "실험: 강제 진동과 공명 · 결합 진동자", sims: ["oscillator", "coupled"] },
        { slug: "ch07", num: "07", part: 1, status: "slot", title: "중력과 궤도", desc: "실험: 케플러 궤도 · 라그랑주 점", sims: ["orbit", "lagrange"] },
        { slug: "ch08", num: "08", part: 1, status: "slot", title: "회전 기준계와 카오스", desc: "실험: 회전 기준계와 코리올리 힘 · 이중 진자와 카오스 · 로렌츠 끌개", sims: ["coriolis", "double-pendulum", "lorenz3d"] },
        { slug: "ch09", num: "09", part: 2, status: "slot", title: "파동의 중첩", desc: "실험: 파동의 중첩", sims: ["waves"] },
        { slug: "ch10", num: "10", part: 2, status: "slot", title: "빛의 간섭", desc: "실험: 이중 슬릿 간섭", sims: ["double-slit"] },
        { slug: "ch11", num: "11", part: 3, status: "slot", title: "전기장과 전위", desc: "실험: 점전하의 전기장과 전위", sims: ["efield"] },
        { slug: "ch12", num: "12", part: 4, status: "slot", title: "확산과 열", desc: "실험: 랜덤 워크와 확산 · 열 확산", sims: ["random-walk", "heat"] },
        { slug: "ch13", num: "13", part: 4, status: "slot", title: "이징 모형과 상전이", desc: "실험: 이징 모형의 상전이 (몬테카를로)", sims: ["ising"] },
      ],
    },

    /* ------------------------------------------------------------ 양자역학 (이론서) */
    // 집필 규칙: books/quantum/GUIDE.md · 슬롯 챕터의 desc는 그 장의 절 목록이다 (작성하면 한두 문장 요약으로 바꾼다)
    {
      id: "quantum", field: "phys", status: "published", kind: "textbook", motif: "levels",
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
        { slug: "ch01", num: "01", part: 1, status: "done", title: "벡터 공간과 디랙 표기법", desc: "상태가 사는 복소 벡터 공간을 공리에서 세우고, 내적과 슈바르츠 부등식, 그람-슈미트 과정, 브라·켓 표기법, 부분공간과 직합을 익힌다." },
        { slug: "ch02", num: "02", part: 1, status: "done", title: "선형 연산자", desc: "연산자를 행렬로 다루고, 완비성 관계와 투영, 에르미트·유니타리 연산자, 고유값 문제와 스펙트럼 정리, 동시 대각화, 연산자의 지수 함수를 익힌다." },
        { slug: "ch03", num: "03", part: 1, status: "done", title: "무한 차원으로", desc: "함수를 성분이 연속인 벡터로 보고, 디랙 델타와 위치 기저, 위치·운동량 연산자와 정준 교환 관계, 기저 바꾸기로서의 푸리에 변환, 연속 고유값의 델타 정규화와 상자 정규화를 익힌다." },
        { slug: "ch04", num: "04", part: 2, status: "done", title: "고전역학 다시 보기", desc: "최소 작용의 원리에서 라그랑주 방정식을 유도하고, 해밀턴 형식과 위상 공간, 푸아송 괄호, 정준 변환과 생성자, 대칭과 보존 법칙을 양자역학과 같은 구조로 정리한다." },
        { slug: "ch05", num: "05", part: 2, status: "done", title: "고전 물리가 막힌 곳", desc: "흑체 복사, 광전 효과와 콤프턴 산란, 원자의 안정성과 선 스펙트럼, 이중 슬릿, 드브로이 파장, 슈테른-게를라흐 실험에서 고전 물리가 어긋난 지점을 보고 양자역학의 공준으로 이어지는 교훈을 정리한다." },
        { slug: "ch06", num: "06", part: 3, status: "done", title: "양자역학의 공준", desc: "상태, 관측량, 측정(보른 규칙과 붕괴), 시간 변화(슈뢰딩거 방정식)의 네 공준을 세우고, 기댓값과 분산, 시간 변화 연산자, 정상 상태와 그 중첩의 진동을 익힌다." },
        { slug: "ch07", num: "07", part: 3, status: "done", title: "1차원 문제", desc: "자유 입자 파속의 퍼짐, 무한 우물, 확률 흐름, 계단의 반사와 투과, 장벽 터널링, 유한 우물의 속박 상태, 1차원 속박 상태의 일반 정리를 다룬다.", sims: ["qm-packet"] },
        { slug: "ch08", num: "08", part: 3, status: "done", title: "조화 진동자", desc: "평형점 근처의 진동을 조화 진동자로 보고, 좌표 표현의 급수 풀이(에르미트 다항식)와 사다리 연산자의 대수로 풀며, 수 연산자 기저의 행렬 계산과 고전 진동을 닮은 결맞음 상태를 다룬다." },
        { slug: "ch09", num: "09", part: 3, status: "done", title: "불확정성과 고전 극한", desc: "슈바르츠 부등식으로 일반 불확정성 관계를 유도하고 등호를 만드는 가우스 파속을 찾은 뒤, 불확정성으로 원자의 크기를 어림하고, 에너지-시간 관계를 상태가 변하는 빠르기와 수명·선폭으로 읽으며, 에렌페스트 정리로 고전 극한의 조건을 따진다." },
        { slug: "ch10", num: "10", part: 3, status: "done", title: "세 가지 묘사", desc: "시간 의존 유니타리 변환에서 출발해 슈뢰딩거·하이젠베르크·상호작용 묘사를 유도하고, 두 준위계와 조화 진동자의 시간 변화를 세 방식으로 계산한다. 푸아송 괄호와의 대응, 다른 시각의 교환자, 해밀토니안이 바뀔 때의 시간 순서도 다룬다." },
        { slug: "ch11", num: "11", part: 3, status: "done", title: "경로 적분", desc: "전파 함수의 합성 법칙과 곱 공식에서 시간 분할 경로 적분을 유도하고, 자유 입자의 전파 함수와 가우스 파속, 정류 위상에 따른 고전 극한을 계산한다. 작용이 이차식인 조화 진동자에서는 전파 함수의 대각합으로 에너지 준위를 다시 얻는다." },
        { slug: "ch12", num: "12", part: 4, status: "done", title: "여러 입자와 동일 입자", desc: "텐서곱과 크로네커 곱에서 출발해 두 입자 문제를 질량 중심과 상대 좌표로 나누고, 교환 연산자로 보손·페르미온 상태를 만든다. 교환 간섭이 입자 사이 거리와 빔 가르개 실험에 남기는 흔적, 파울리 배타 원리와 페르미 에너지, 스핀에 따라 준위를 가르는 교환 에너지를 유도한다." },
        { slug: "ch13", num: "13", part: 4, status: "done", title: "대칭과 보존", desc: "공간·시간 병진의 생성자에서 운동량·에너지 보존을 유도하고, 이산 병진의 블로흐 정리로 강결합 고리의 에너지 띠를 계산한다. 패리티 선택 규칙과 대칭이 만드는 축퇴, 이중 우물의 터널링, 스핀 없는 입자의 시간 반전과 실수 고유함수를 다룬다." },
        { slug: "ch14", num: "14", part: 4, status: "done", title: "각운동량", desc: "평면 회전과 각운동량 교환 관계에서 출발해 사다리 연산자의 고유값을 유도하고, 구면 조화 함수와 중심 퍼텐셜의 지름 방정식에 적용한다." },
        { slug: "ch15", num: "15", part: 4, status: "done", title: "수소 원자", desc: "전자·양성자의 운동을 환산 질량으로 분리하고 쿨롱 지름 방정식의 경계 조건에서 에너지 준위와 라게르 다항식을 유도한다. 1s·2s·2p 오비탈의 마디와 확률 분포를 계산한다." },
        { slug: "ch16", num: "16", part: 4, status: "done", title: "스핀", desc: "스핀 1/2의 파울리 행렬과 축별 측정 확률을 유도하고, 슈테른–게를라흐 장치의 분리, 전자 스핀의 세차 운동과 원형 구동장의 자기 공명 전이를 계산한다." },
        { slug: "ch17", num: "17", part: 4, status: "done", title: "각운동량의 합성", desc: "두 스핀을 삼중항과 단일항으로 나누는 데서 출발해 각운동량 합성 규칙과 클렙시–고든 계수를 구하고, 구면 텐서와 위그너–에카르트 정리로 선택 규칙을 유도한다." },
        { slug: "ch18", num: "18", part: 5, status: "done", title: "변분법과 WKB", desc: "변분 원리로 헬륨의 바닥 에너지를 추정하고, WKB 해와 전환점 연결 공식에서 양자화 조건을 유도한다." },
        { slug: "ch19", num: "19", part: 5, status: "done", title: "시간 무관 섭동론", desc: "비축퇴·축퇴 섭동론을 유도하고 수소 원자의 슈타르크 효과, 미세 구조, 제이만 효과에 적용한다." },
        { slug: "ch20", num: "20", part: 5, status: "done", title: "시간 의존 섭동론", desc: "다이슨 전개와 페르미 황금률로 전이를 계산하고, 빛의 흡수·방출과 선택 규칙, 단열 변화의 베리 위상을 다룬다." },
        { slug: "ch21", num: "21", part: 5, status: "done", title: "산란", desc: "확률 흐름에서 단면적을 정의하고 보른 근사와 부분파 위상 이동으로 산란 진폭, 광학 정리, 공명을 설명한다." },
        { slug: "ch22", num: "22", part: 6, status: "done", title: "밀도 행렬과 얽힘", desc: "순수·혼합 상태를 밀도 행렬로 구별하고 부분 추적과 슈미트 분해를 거쳐 벨 부등식 위반을 계산한다." },
        { slug: "ch23", num: "23", part: 6, status: "done", title: "디랙 방정식", desc: "클라인–고든 방정식에서 디랙 방정식으로 나아가 스핀과 자기 모멘트를 얻고 수소 미세 구조를 다시 계산한다." },
      ],
    },

    /* ------------------------------------------------------------ 선형대수 (이론서) */
    // 집필 규칙: books/linear-algebra/GUIDE.md · 슬롯 챕터의 desc는 그 장의 절 목록이다 (작성하면 한두 문장 요약으로 바꾼다)
    // 고급 장은 기존 장 사이에 끼우지 않고, parts 끝에 새 부를 더해 ch21부터 이어 붙인다 (GUIDE.md 9절)
    {
      id: "linear-algebra", field: "math", status: "writing", kind: "textbook", motif: "lattice",
      series: "LinAlgBook", title: "머신러닝을 위한 선형대수", en: "Linear Algebra for Machine Learning",
      tagline: "행렬 곱 뒤의 기하",
      desc: "벡터와 행렬 곱에서 출발해 부분공간, 직교성, 고유값과 특잇값 분해, 행렬 미적분, 텐서와 어텐션까지 — 신경망의 층과 기울기, 최적화를 행렬과 그 분해로 읽어 내는 이론서입니다.",
      path: "books/linear-algebra/",
      parts: [
        { title: "벡터와 행렬", desc: "벡터와 내적, 선형 사상으로서의 행렬, 연립 방정식이라는 기본 어휘를 익힙니다." },
        { title: "공간의 구조", desc: "기저와 차원, 랭크와 네 부분공간, 직교 투영, 행렬식으로 행렬이 공간을 어떻게 바꾸는지 봅니다." },
        { title: "행렬의 분해", desc: "고유값 분해, 스펙트럼 정리, 특잇값 분해로 행렬을 단순한 조각으로 나누고, 노름과 조건수로 그 크기를 잽니다." },
        { title: "미분과 최적화", desc: "벡터와 행렬로 미분하는 법을 세우고, 역전파를 야코비 행렬의 곱으로, 경사 하강법을 고유값으로 읽습니다." },
        { title: "딥러닝 속의 행렬", desc: "텐서와 einsum, 합성곱, 어텐션, 그래프 신경망을 앞에서 만든 도구로 다시 씁니다." },
        { title: "큰 행렬과 높은 차원", desc: "고차원 공간과 무작위 행렬의 성질을 보고, 곱셈만으로 큰 행렬의 고유값과 해를 구하는 반복법을 다룹니다." },
      ],
      chapters: [
        { slug: "ch01", num: "01", part: 1, status: "draft", title: "벡터와 내적", desc: "벡터를 화살표와 숫자 목록으로 읽고 선형 결합, 내적과 각도, L1·L2·L∞ 노름, 코시-슈바르츠 부등식과 삼각 부등식을 세운다. 정규화한 임베딩에서 내적, 코사인 유사도, 거리의 순위가 같아지는 이유와 대조 학습이 온도로 나누는 이유를 유도한다." },
        { slug: "ch02", num: "02", part: 1, status: "slot", title: "행렬과 행렬 곱", desc: "행렬은 선형 사상이다 · 행렬 곱은 사상의 합성 · 행렬 곱을 읽는 네 가지 방법 · 전치와 블록 행렬 · 곱하는 순서와 계산량 · 머신러닝에서: 선형 층과 미니배치" },
        { slug: "ch03", num: "03", part: 1, status: "slot", title: "연립 방정식과 LU 분해", desc: "가우스 소거법 · 피벗과 행 사다리꼴 · LU 분해 · 역행렬과 가역성 · 해가 없거나 무수히 많을 때 · 머신러닝에서: inv 대신 solve를 쓰는 이유" },
        { slug: "ch04", num: "04", part: 2, status: "slot", title: "벡터 공간과 기저", desc: "벡터 공간과 부분공간 · 생성과 선형 독립 · 기저와 차원 · 좌표와 기저 바꾸기 · 선형 사상의 행렬 표현 · 머신러닝에서: 임베딩 공간의 방향과 선형 표현 가설" },
        { slug: "ch05", num: "05", part: 2, status: "slot", title: "랭크와 네 부분공간", desc: "열공간과 영공간 · 행공간과 왼쪽 영공간 · 랭크-영공간 정리 · 랭크 1 행렬과 외적 · 곱의 랭크 · 머신러닝에서: 병목 층과 LoRA" },
        { slug: "ch06", num: "06", part: 2, status: "slot", title: "직교성과 투영", desc: "직교와 직교 여공간 · 직교 투영과 투영 행렬 · 최소제곱과 정규 방정식 · 그람-슈미트 과정과 QR 분해 · 직교 행렬: 회전과 반사 · 머신러닝에서: 직교 초기화와 노름 보존" },
        { slug: "ch07", num: "07", part: 2, status: "slot", title: "행렬식", desc: "넓이와 부피의 배율 · 세 가지 성질에서 공식으로 · 곱의 행렬식과 가역성 · 야코비 행렬식과 변수 변환 · 로그 행렬식 계산하기 · 머신러닝에서: 정규화 흐름의 로그 행렬식" },
        { slug: "ch08", num: "08", part: 3, status: "slot", title: "고유값과 고유벡터", desc: "방향이 바뀌지 않는 벡터 · 특성 방정식 · 대각화 · 행렬의 거듭제곱과 행렬 지수 · 복소 고유값과 회전 · 머신러닝에서: RNN의 기울기 폭발과 소실" },
        { slug: "ch09", num: "09", part: 3, status: "slot", title: "대칭 행렬과 양의 정부호 행렬", desc: "스펙트럼 정리 · 이차 형식 · 양의 정부호 판정 · 촐레스키 분해 · 레일리 몫과 최대·최소 고유값 · 머신러닝에서: 공분산 행렬과 커널 행렬은 왜 양의 준정부호인가" },
        { slug: "ch10", num: "10", part: 3, status: "slot", title: "특잇값 분해", desc: "원을 타원으로 · 특잇값 분해의 존재와 AᵀA · 외적의 합과 축약 SVD · 에카르트-영 정리 · 유사역행렬과 최소 노름 해 · 머신러닝에서: 가중치 압축과 저랭크 근사" },
        { slug: "ch11", num: "11", part: 3, status: "slot", title: "행렬 노름과 조건수", desc: "벡터 노름에서 행렬 노름으로 · 스펙트럼 노름과 프로베니우스 노름 · 조건수와 오차 증폭 · 정규 방정식과 QR의 수치 안정성 · 립시츠 상수와 층의 합성 · 머신러닝에서: 스펙트럼 정규화" },
        { slug: "ch12", num: "12", part: 4, status: "slot", title: "행렬 미적분", desc: "기울기, 야코비 행렬, 헤세 행렬 · 모양과 레이아웃 규약 · 미분 형식과 대각합 기법 · 자주 쓰는 공식 · 연쇄 법칙 · 머신러닝에서: 선형 층과 소프트맥스-교차 엔트로피의 기울기" },
        { slug: "ch13", num: "13", part: 4, status: "slot", title: "야코비 행렬로 보는 역전파", desc: "계산 그래프와 합성 함수 · 야코비 행렬의 곱 · 순방향 모드: 야코비-벡터 곱 · 역방향 모드: 벡터-야코비 곱 · 곱하는 순서와 비용 · 머신러닝에서: 헤세-벡터 곱과 작은 autograd" },
        { slug: "ch14", num: "14", part: 4, status: "slot", title: "이차 함수 위의 경사 하강법", desc: "이차 근사와 헤세 행렬 · 고유 기저에서 본 경사 하강법 · 조건수와 수렴 속도 · 모멘텀 · 뉴턴법과 전처리 · 머신러닝에서: 학습률의 상한과 Adam의 대각 전처리" },
        { slug: "ch15", num: "15", part: 5, status: "slot", title: "텐서와 einsum", desc: "축이 여럿인 배열 · 브로드캐스팅 · 아인슈타인 합 표기 · 크로네커 곱과 vec 연산 · 축약 순서와 계산량 · 머신러닝에서: einsum으로 읽는 층 구현" },
        { slug: "ch16", num: "16", part: 5, status: "slot", title: "합성곱과 푸리에 변환", desc: "합성곱은 선형 사상이다 · 퇴플리츠 행렬과 순환 행렬 · 이산 푸리에 변환은 기저 바꾸기 · 순환 행렬의 대각화와 합성곱 정리 · 2차원 합성곱과 im2col · 머신러닝에서: CNN 층을 행렬 곱으로" },
        { slug: "ch17", num: "17", part: 5, status: "slot", title: "어텐션의 선형대수", desc: "쌍선형 형식 QKᵀ · 소프트맥스와 행 확률 행렬 · 헤드 차원과 어텐션의 랭크 · 회전 행렬로 보는 위치 인코딩 · 선형 어텐션과 커널 · 머신러닝에서: KV 캐시와 계산량" },
        { slug: "ch18", num: "18", part: 5, status: "slot", title: "그래프와 라플라시안", desc: "인접 행렬과 차수 행렬 · 그래프 라플라시안과 이차 형식 · 고유값과 연결 성분 · 스펙트럼 군집 · 무작위 보행과 확률 행렬 · 머신러닝에서: 그래프 합성곱 신경망" },
        { slug: "ch19", num: "19", part: 6, status: "slot", title: "고차원 공간과 무작위 행렬", desc: "고차원에서는 부피가 껍질에 몰린다 · 무작위 벡터는 거의 직교한다 · 존슨-린덴스트라우스 보조정리 · 무작위 행렬의 특잇값 · 무작위 행렬의 곱 · 머신러닝에서: 초기화와 동역학적 등거리성" },
        { slug: "ch20", num: "20", part: 6, status: "slot", title: "큰 행렬을 위한 반복법", desc: "곱셈만 쓸 수 있을 때 · 거듭제곱법 · 크릴로프 부분공간과 란초스 방법 · 켤레 기울기법 · 무작위 SVD · 머신러닝에서: 헤세 행렬의 스펙트럼 추정" },
      ],
    },

    /* ------------------------------------------------------------ 통계 (이론서) */
    // 집필 규칙: books/statistics/GUIDE.md · 슬롯 챕터의 desc는 그 장의 절 목록이다 (작성하면 한두 문장 요약으로 바꾼다)
    // 고급 장은 기존 장 사이에 끼우지 않고, parts 끝에 새 부를 더해 ch21부터 이어 붙인다 (GUIDE.md 9절)
    {
      id: "statistics", field: "math", status: "writing", kind: "textbook", motif: "bell",
      series: "StatBook", title: "머신러닝을 위한 통계", en: "Statistics for Machine Learning",
      tagline: "손실 함수 뒤의 확률 모형",
      desc: "확률의 공리에서 출발해 분포, 추정, 정보 이론, 검정, 회귀, 잠재 변수 모형까지 — 딥러닝의 손실 함수와 정규화, 평가 지표 뒤에 있는 통계를 정의부터 유도하며 쌓아 가는 이론서입니다.",
      path: "books/statistics/",
      parts: [
        { title: "확률의 언어", desc: "불확실성을 셈하는 규칙과, 확률 변수·분포·공분산이라는 기본 어휘를 익힙니다." },
        { title: "평균과 표집", desc: "표본이 많아지면 평균이 왜 안정되는지 보고, 그 성질을 이용해 적분과 기댓값을 표집으로 계산합니다." },
        { title: "추정과 정보", desc: "데이터에서 모수를 고르는 두 원리인 최대 가능도와 베이즈 추론을 세우고, 둘을 잇는 정보 이론을 봅니다." },
        { title: "구간과 검정", desc: "추정값의 불확실성을 구간으로 나타내고, 차이가 우연인지 가리는 검정과 재표집을 다룹니다." },
        { title: "예측 모형", desc: "회귀와 분류를 확률 모형으로 다시 세우고, 과적합을 다루는 법과 분류기를 평가하는 법을 봅니다." },
        { title: "잠재 변수", desc: "관측되지 않는 변수로 데이터를 설명하는 혼합 모형과 EM 알고리즘을 거쳐 변분 오토인코더에 이릅니다." },
      ],
      chapters: [
        { slug: "ch01", num: "01", part: 1, status: "slot", title: "확률과 조건부 확률", desc: "표본 공간과 사건 · 확률의 공리 · 조건부 확률과 곱셈 규칙 · 전확률 공식과 베이즈 정리 · 사건의 독립 · 머신러닝에서: 분류기의 출력과 기저율" },
        { slug: "ch02", num: "02", part: 1, status: "slot", title: "확률 변수와 기댓값", desc: "확률 변수와 누적 분포 함수 · 확률 질량 함수와 확률 밀도 함수 · 기댓값과 그 선형성 · 분산과 적률 · 확률 변수의 변환 · 머신러닝에서: 손실은 기댓값이다" },
        { slug: "ch03", num: "03", part: 1, status: "slot", title: "자주 만나는 분포", desc: "베르누이·이항·범주·다항 분포 · 기하 분포와 포아송 분포 · 균등·지수·감마 분포 · 정규 분포 · 베타 분포와 디리클레 분포 · 머신러닝에서: 출력층은 분포의 모수를 낸다" },
        { slug: "ch04", num: "04", part: 1, status: "slot", title: "여러 확률 변수", desc: "결합·주변·조건부 분포 · 확률 변수의 독립과 조건부 독립 · 공분산, 상관계수, 공분산 행렬 · 조건부 기댓값과 반복 기댓값의 법칙 · 확률 변수의 합과 다변수 변환 · 머신러닝에서: 가중치 초기화와 분산 보존" },
        { slug: "ch05", num: "05", part: 1, status: "slot", title: "다변량 정규 분포", desc: "정의와 마할라노비스 거리 · 선형 변환과 표집 · 주변 분포와 조건부 분포 · 고유분해와 화이트닝 · 정규 분포의 곱과 합성곱 · 머신러닝에서: 재매개변수화와 확산 모델의 잡음" },
        { slug: "ch06", num: "06", part: 2, status: "slot", title: "큰 수의 법칙과 중심 극한 정리", desc: "표본 평균과 표준 오차 · 마르코프 부등식과 체비쇼프 부등식 · 큰 수의 법칙 · 중심 극한 정리 · 정규 근사가 깨질 때 · 머신러닝에서: 경험 위험과 미니배치 기울기의 잡음" },
        { slug: "ch07", num: "07", part: 2, status: "slot", title: "몬테카를로 방법", desc: "몬테카를로 적분 · 역변환 표집 · 기각 표집 · 중요도 표집 · 분산 줄이기 · 머신러닝에서: 기댓값의 기울기 추정" },
        { slug: "ch08", num: "08", part: 3, status: "slot", title: "추정량과 그 성질", desc: "통계적 모형과 추정량 · 적률법 · 편향과 분산 · 평균 제곱 오차 · 일치성 · 표본 분산은 왜 n − 1로 나누나 · 머신러닝에서: Adam의 편향 보정과 배치 정규화" },
        { slug: "ch09", num: "09", part: 3, status: "slot", title: "최대 가능도 추정", desc: "가능도 함수 · 로그 가능도와 최댓값 찾기 · 불변성과 일치성 · 피셔 정보 · 점근 정규성과 크라메르-라오 하한 · 장애 모수와 프로파일 가능도 · 머신러닝에서: 손실 함수는 음의 로그 가능도다" },
        { slug: "ch10", num: "10", part: 3, status: "slot", title: "베이즈 추론", desc: "사전 분포, 가능도, 사후 분포 · 켤레 사전 분포 · MAP 추정과 사후 평균 · 신용 구간과 사후 예측 분포 · 빈도주의와 베이즈 · 머신러닝에서: 가중치 감쇠는 사전 분포다" },
        { slug: "ch11", num: "11", part: 3, status: "slot", title: "엔트로피와 KL 발산", desc: "정보량과 엔트로피 · 교차 엔트로피와 KL 발산 · 깁스 부등식과 최대 가능도 · 미분 엔트로피와 최대 엔트로피 · 상호 정보량 · 정방향 KL과 역방향 KL · 머신러닝에서: 교차 엔트로피 손실, 지식 증류, 퍼플렉서티" },
        { slug: "ch12", num: "12", part: 4, status: "slot", title: "표본 분포와 신뢰 구간", desc: "표본 분포 · 카이제곱 분포와 t 분포 · 신뢰 구간 만들기 · 신뢰 구간의 올바른 해석 · 비율의 신뢰 구간 · 델타 방법 · 머신러닝에서: 테스트 정확도의 오차 막대" },
        { slug: "ch13", num: "13", part: 4, status: "slot", title: "가설 검정", desc: "귀무가설과 검정 통계량 · p값과 그 오해 · 제1종·제2종 오류와 검정력 · 가능도비 검정: 네이만-피어슨과 윌크스 · t 검정: 독립 표본과 대응 표본 · 다중 비교 · 머신러닝에서: 두 모델을 공정하게 비교하기" },
        { slug: "ch14", num: "14", part: 4, status: "slot", title: "부트스트랩과 재표집", desc: "경험 분포와 플러그인 원리 · 부트스트랩 표준 오차 · 부트스트랩 신뢰 구간 · 순열 검정 · 부트스트랩이 틀릴 때 · 머신러닝에서: 평가 지표의 신뢰 구간과 배깅" },
        { slug: "ch15", num: "15", part: 5, status: "slot", title: "선형 회귀", desc: "최소제곱과 정규 방정식 · 투영으로 보는 최소제곱 · 가우스 잡음 모형과 최대 가능도 · 계수의 불확실성 · 다중공선성과 리지 회귀 · 머신러닝에서: 마지막 층과 선형 탐침" },
        { slug: "ch16", num: "16", part: 5, status: "slot", title: "로지스틱 회귀와 일반화 선형 모형", desc: "로지스틱 회귀 · 가능도, 기울기, 볼록성 · 소프트맥스 회귀 · 지수족 · 일반화 선형 모형과 연결 함수 · 머신러닝에서: 로짓, 소프트맥스, 기울기 p − y" },
        { slug: "ch17", num: "17", part: 5, status: "slot", title: "편향-분산과 모형 선택", desc: "기대 위험과 경험 위험 · 예측 오차의 편향-분산 분해 · 과적합과 정규화 · 교차 검증 · 정보 기준: AIC와 BIC · 머신러닝에서: 조기 종료와 이중 하강" },
        { slug: "ch18", num: "18", part: 5, status: "slot", title: "분류기의 평가와 보정", desc: "혼동 행렬과 정밀도·재현율 · ROC 곡선과 AUC · 클래스 불균형과 PR 곡선 · 적절한 점수 규칙 · 확률 보정과 신뢰도 도표 · 머신러닝에서: 온도 스케일링과 기대 보정 오차" },
        { slug: "ch19", num: "19", part: 6, status: "slot", title: "혼합 모형과 EM 알고리즘", desc: "잠재 변수 모형 · 가우스 혼합 모형 · EM 알고리즘 · EM이 가능도를 올리는 이유: 증거 하한 · k-평균과의 관계 · 머신러닝에서: 임베딩 군집과 밀도 기반 이상 탐지" },
        { slug: "ch20", num: "20", part: 6, status: "slot", title: "주성분 분석에서 VAE까지", desc: "분산이 가장 큰 방향 · 특잇값 분해로 계산하기 · 확률적 PCA · 선형 오토인코더와 PCA · 머신러닝에서: 변분 오토인코더의 손실 읽기" },
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
