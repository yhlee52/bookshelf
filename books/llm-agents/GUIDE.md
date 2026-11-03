# 『LLM에서 자율 에이전트까지』 집필 계획

> 현재는 **기획안**입니다. 7부 28장의 제목, 절 제목, 실험 질문과 빈 페이지를 만들었으며, 본문·퀴즈·실험 구현은 없습니다. 목차의 기준은 [data/books.js](../../data/books.js)의 `llm-agents` 항목입니다.

## 1. 책의 질문과 독자

이 책의 질문은 “다음 토큰을 예측하는 언어모델을 어떻게 오래 일하고 검증 가능한 에이전트 시스템으로 만들까?”입니다. LLM의 원리에서 시작해 추론형 언어모델(RLM), 시각 언어모델(VLM), 검색, 도구, agent, skill, workflow, harness, loop engineering으로 이어집니다. 모델의 능력을 늘리는 길(VLM·RLM)과 모델 바깥에 실행 시스템을 만드는 길(agent·harness)을 혼동하지 않습니다.

독자는 Python으로 작은 실험을 해 본 적은 있지만 LLM과 에이전트 설계를 체계적으로 공부하지 않은 사람입니다. 신경망의 세부 수학은 [『머신러닝을 위한 선형대수』](../linear-algebra/index.html), 확률과 평가의 배경은 [『머신러닝을 위한 통계』](../statistics/index.html)에 맡깁니다. 『딥러닝 기초』와는 별개의 책입니다.

**표기:** 이 책에서 RLM은 **Reasoning Language Model(추론형 언어모델)**을 뜻합니다. Recursive Language Models를 뜻하지 않습니다. VLM과 RLM은 에이전트의 필수 선행 단계가 아니라 서로 다른 능력 확장입니다. Agent, skill, workflow, harness, loop engineering은 모델 자체가 아닌 실행 시스템의 층에서 설명합니다.

## 2. 전체 스토리라인

| 부 | 장 | 왜 다음 부로 가는가 |
|---|---|---|
| 1부 언어모델의 출발 | 01–04 | 토큰을 이어 쓰는 언어모델이 문맥을 이용하고 지시를 따르는 모델이 되기까지의 최소 원리를 세웁니다. |
| 2부 추론형 언어모델 | 05–08 | Reasoning Language Model(RLM)의 학습과 추론 시 계산을 살피고, 정답과 그럴듯한 풀이를 구분합니다. |
| 3부 눈과 외부 지식 | 09–12 | VLM, 검색, 긴 문맥 처리로 모델의 입력과 참고 자료를 넓힙니다. 이들은 에이전트의 필수 선행 단계가 아닌 선택 가능한 능력입니다. |
| 4부 행동하는 모델 | 13–16 | 도구 사용에서 시작해 관찰, 재계획, 상태 관리가 이어지는 단일 에이전트의 작업 루프를 만듭니다. |
| 5부 에이전트의 부품 | 17–20 | 도구 계약, 컨텍스트, skill, hook과 권한을 설계해 재사용 가능한 실행 환경을 만듭니다. |
| 6부 일을 나누는 구조 | 21–24 | 고정된 workflow와 모델 주도 agent, 위임과 검증, 사람의 결정을 조합합니다. |
| 7부 장기 실행과 검증 | 25–28 | harness와 loop engineering으로 작업을 이어 가고, 실제 산출물과 비용을 기준으로 개선 여부를 평가합니다. |

읽기 경로는 **모델의 출력 → 추론과 검증 → 이미지·자료 입력 → 도구 행동 → 재사용 부품 → 역할과 사람의 결정 → 장기 루프와 평가**입니다. 1–2부는 기초, 3부는 선택 가능한 능력, 4–7부는 실행 시스템입니다. 최신 연구의 발표 순서나 모두가 따라야 하는 단일 기술 발전 경로를 주장하지 않습니다.

각 장의 네 절 제목은 [data/books.js](../../data/books.js)의 `chapters[].desc`와 동일합니다. 장 파일은 절 제목만 놓은 빈 슬롯입니다. 앞부분에서 재현이 어려운 대규모 학습은 작은 계산·행동 비교로 원리를 확인하고, 후반부에서 Claude Code 실습으로 넘어갑니다.

## 3. 장 한 편의 구성

1. 앞 장에서 남긴 질문과 이 장의 목표.
2. 네 절: 문제 → 구성요소 → 동작·실패 → 다음 단계. 실제 집필에서는 내용에 맞게 절을 나눌 수 있습니다.
3. 실험: 기준 설계와 바꿀 요소 한 가지, 관측값, 예산과 반복 수, 실패 조건을 먼저 정합니다.
4. 핵심 정리, 설명이 있는 확인 퀴즈, 재현 가능한 연습문제.

새 개념은 무엇이 부족해서 필요한지부터 설명합니다. 모델 내부에 접근할 수 없으면 출력과 실행 기록만 관측했다고 분명히 씁니다. 자료의 주장, 이 책의 설명, 실험에서 확인한 결과를 구분합니다. `status: "slot"`은 본문과 실험을 아직 작성하지 않았다는 뜻입니다. 장을 쓰고 검증한 뒤에만 `draft`로 바꾸며, `done`은 사용자 확인 뒤에 사용합니다. 구현되지 않은 실험 id는 `sims`에 넣지 않습니다.

## 4. 실습 저장소와 연결

- 이 저장소(`bookshelf`)에는 설명, 도해, 공개 가능한 실험 결과와 링크를 둡니다. 정적 GitHub Pages 안에서 Claude 실행을 요구하지 않습니다.
- [ai_sci_cowork](https://github.com/yhlee52/ai_sci_cowork)는 Claude Code의 agent·skill·hook·상태·캠페인 루프를 살피는 **동반 실습 환경**입니다. 연구 결과는 그 플러그인이 만드는 별도 연구실 작업 공간에 둡니다.
- 1–3부는 작은 모형·고정된 예시·제한된 모델 비교로 핵심 개념을 분리합니다. 4부부터 도구 실행 기록을 읽고, 5–7부에서 `agents/`, `skills/`, `hooks/`, `scripts/lab.py`를 구성요소별로 켜거나 빼며 비교할 계획입니다.
- 실습을 집필할 때 사용한 외부 저장소의 **커밋/버전**, 과제 입력, 모델 설정, 예산, 반복 횟수, 판정 코드를 기록합니다. 같은 과제와 예산으로 기준 설계와 변경 설계를 비교합니다. 완료라는 문장보다 실제 결과 파일·검사 결과를 우선합니다.
- 비용이 큰 학습, 캠페인, 외부 서비스 호출은 계획만으로 자동 실행하지 않습니다. 적은 비용의 재현 가능한 과제를 먼저 설계합니다.

## 5. 집필 자료와 검증

이 책의 출발 자료는 원 논문과 공식 문서입니다. 다음은 집필 전 읽을 자료의 예시이며, 장을 쓸 때 판본과 현재 동작을 다시 확인합니다.

- LLM·추론: [Attention Is All You Need](https://arxiv.org/abs/1706.03762), [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165), [InstructGPT](https://arxiv.org/abs/2203.02155), [DeepSeek-R1](https://arxiv.org/abs/2501.12948)
- 이미지·검색: [CLIP](https://arxiv.org/abs/2103.00020), [Visual Instruction Tuning (LLaVA)](https://arxiv.org/abs/2304.08485), [Retrieval-Augmented Generation](https://arxiv.org/abs/2005.11401)
- agent·실행 시스템: [ReAct](https://arxiv.org/abs/2210.03629), [Building effective agents](https://www.anthropic.com/research/building-effective-agents), [Agent Skills](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills), [Effective context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents), [Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents), [Loop Engineering: Building Blocks, Adoption, and Impact](https://arxiv.org/abs/2608.21884)

새로운 용어와 최신 제품 기능은 바뀔 수 있습니다. 특히 loop engineering은 연구와 현장 실천이 진행 중인 주제이므로 검증된 결과와 제안된 관행을 나누어 씁니다. 그림·예제·연습문제는 새로 만들고, 출처의 결론을 실제 실험 범위보다 크게 말하지 않습니다.

## 6. 진행

1장부터 한 장씩 집필합니다. 먼저 이 기획의 장별 범위와 실험 질문을 검토하고, 그 뒤 한 장씩 브랜치와 PR로 올립니다. 집필 중 장을 나누거나 합치면 `data/books.js`, 책 홈, 이 계획 문서를 함께 갱신합니다. 책의 모든 페이지는 모바일·다크 모드·링크·수식 오류를 확인합니다.
