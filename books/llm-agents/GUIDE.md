# 『LLM에서 자율 에이전트까지』 집필 계획

> 현재는 **기획안**입니다. 8부 43장의 제목, 절 제목, 실험 질문과 빈 페이지를 만들었으며, 본문·퀴즈·실험 구현은 없습니다. 목차의 기준은 [data/books.js](../../data/books.js)의 `llm-agents` 항목입니다.

## 1. 책의 질문과 독자

이 책의 질문은 “다음 토큰을 예측하는 언어모델을 어떻게 오래 일하고 검증 가능한 에이전트 시스템으로 만들까?”입니다. 앞부분(1–4부)은 LLM의 원리에서 시작해 추론형 언어모델(RLM), 시각 언어모델(VLM), 검색, 도구 사용과 행동 루프로 이어지는 일반 원리를 다룹니다. 뒷부분(5–7부)은 Claude를 쓰는 환경에서 에이전트를 이루는 구성요소가 **무엇이고, 어떻게 작동하며, 전체 에이전트에서 어떤 일을 맡는지** 설명하고, 그 구성요소를 조합하고 오래 실행하고 평가하는 방법으로 나아갑니다. 8부는 같은 순서로 Codex 환경을 따로 살핍니다. 모델의 능력을 늘리는 길(VLM·RLM)과 모델 바깥에 실행 시스템을 만드는 길(agent·harness)을 혼동하지 않습니다.

독자는 LLM이나 에이전트를 쓰고 있지만 원리를 잘 모르는 사람, 어렴풋이 알지만 자기 에이전트 환경을 꾸리기 어려운 사람, 개별 구성요소를 알고 직접 구축해 보려는 사람입니다. Python으로 작은 실험을 해 본 정도를 가정합니다. 신경망의 세부 수학은 [『머신러닝을 위한 선형대수』](../linear-algebra/index.html), 확률과 평가의 배경은 [『머신러닝을 위한 통계』](../statistics/index.html)에 맡깁니다. 『딥러닝 기초』와는 별개의 책입니다.

**표기:** 이 책에서 RLM은 **Reasoning Language Model(추론형 언어모델)**을 뜻합니다. 이 용어는 [Besta 외, *Reasoning Language Models: A Blueprint*](https://arxiv.org/abs/2501.11223)를 따르며, 같은 대상을 LRM(Large Reasoning Model)이라고도 부릅니다. 이름이 같은 Recursive Language Models와는 다른 것입니다. VLM과 RLM은 에이전트의 필수 선행 단계가 아니라 서로 다른 능력 확장입니다. Agent, skill, workflow, harness, loop engineering은 모델 자체가 아닌 실행 시스템의 층에서 설명합니다.

## 2. 전체 스토리라인

| 부 | 장 | 왜 다음 부로 가는가 |
|---|---|---|
| 1부 언어모델의 출발 | 01–04 | 토큰을 이어 쓰는 언어모델이 문맥을 이용하고 지시를 따르는 모델이 되기까지의 최소 원리를 세웁니다. |
| 2부 추론형 언어모델 | 05–08 | 추론형 언어모델(RLM)의 학습과 추론 시 계산을 살피고, 정답과 그럴듯한 풀이를 구분하는 검증과 예산을 맞춘 비교를 세웁니다. |
| 3부 눈과 외부 지식 | 09–12 | VLM, 검색, 긴 문맥 처리로 모델의 입력과 참고 자료를 넓힙니다. 9–10장은 건너뛰어도 되고, 11–12장은 20장의 바탕이 됩니다. |
| 4부 행동하는 모델 | 13–16 | 도구 사용에서 시작해 관찰, 재계획, 상태 관리가 이어지는 단일 에이전트의 작업 루프를 만듭니다. |
| 5부 Claude 에이전트의 구성요소 | 17–24 | Claude Code를 이루는 구성요소가 각각 무엇이고, 어떻게 작동하며, 전체 에이전트에서 어떤 일을 맡는지 하나씩 살핍니다. |
| 6부 구성요소를 조합하기 | 25–28 | 구성요소를 엮어 workflow와 검증 구조를 만들고, plugin으로 묶어 나누고, 프로그램에서 에이전트를 부릅니다. |
| 7부 장기 실행과 평가 | 29–32 | harness와 loop engineering으로 작업을 이어 가고, 실제 산출물과 비용으로 평가한 뒤, 실제 환경 하나를 사례로 해부합니다. |
| 8부 Codex로 다시 만들기 | 33–43 | 5–7부에서 Claude로 살핀 구성요소, 조합, 장기 실행을 Codex 환경에서 같은 순서로 따로 살핍니다. |

읽기 경로는 **모델의 출력 → 추론과 검증 → 이미지·자료 입력 → 도구 행동 → Claude의 구성요소 → 조합과 배포 → 장기 루프와 평가 → Codex로 다시**입니다. 반드시 거치는 줄기는 1부 → 2부 → 4–7부입니다. 8부는 Codex를 쓰는 독자가 5–7부를 읽은 뒤 골라 읽습니다. 2부를 줄기에 두는 이유는 에이전트가 RLM을 꼭 써야 해서가 아니라, 7–8장에서 세우는 검증기와 예산을 맞춘 비교를 26장과 31장에서 다시 쓰기 때문입니다. 3부는 골라 읽습니다. 9–10장(VLM)은 건너뛰어도 4부로 갈 수 있지만, 11–12장의 검색과 긴 문맥은 20장 컨텍스트 관리의 바탕입니다. 최신 연구의 발표 순서나 모두가 따라야 하는 단일 기술 발전 경로를 주장하지 않습니다.

4부의 일반 원리는 5부에서 Claude의 구성요소로 다시 만납니다. 두 장을 짝지어 읽으면 원리와 구현이 이어집니다.

| 4부 (일반 원리) | 5부 (Claude의 구현) |
|---|---|
| 13 도구를 호출하는 모델 | 19 도구와 MCP |
| 14 단일 에이전트의 행동 루프 | 17 Claude 에이전트의 해부도 |
| 15 계획·재계획·중단 | 23 Hook과 자동 실행 · 24 권한·설정·신뢰 경계 |
| 16 상태와 기억 | 18 CLAUDE.md와 메모리 |

8부의 장은 5–7부의 장과 하나씩 짝을 이룹니다. 두 환경의 설명을 한 장에 섞지 않고, 같은 질문을 Codex 환경에서 따로 답합니다.

| 8부 (Codex) | 짝이 되는 Claude 장 |
|---|---|
| 33 Codex 에이전트의 해부도 | 17 |
| 34 AGENTS.md와 메모리 | 18 |
| 35 Codex의 도구와 MCP | 19 |
| 36 Codex의 컨텍스트 관리 | 20 |
| 37 Codex의 Skill | 21 |
| 38 Codex의 Subagent | 22 |
| 39 Codex의 Hook | 23 |
| 40 샌드박스·승인·규칙 | 24 |
| 41 Codex에서 구성요소 조합하기 | 25–27 |
| 42 프로그램으로 부르는 Codex | 28 |
| 43 Codex의 장기 실행과 평가 | 29–31 |

각 장의 네 절 제목은 [data/books.js](../../data/books.js)의 `chapters[].desc`와 동일합니다. 장 파일은 절 제목만 놓은 빈 슬롯입니다. 앞부분에서 재현이 어려운 대규모 학습은 작은 계산·행동 비교로 원리를 확인하고, 5부부터 Claude Code 실습으로 넘어갑니다.

### 겹치기 쉬운 장의 경계

같은 낱말이 여러 장에 나오는 주제는 아래처럼 나눕니다. 앞 장은 개념을 처음 세우고, 뒤 장은 그것을 시스템에서 다시 씁니다. 장을 쓰다가 경계를 넘는 내용이 나오면 설명을 되풀이하지 않고 해당 장으로 링크합니다.

| 주제 | 장 | 나누는 기준 |
|---|---|---|
| 추론의 비용 | 05 · 07 · 08 | 05장은 단계적 풀이가 도움이 되는 과제와 그렇지 않은 과제, 07장은 후보 수·재시도로 계산을 늘리는 방법과 그 비용, 08장은 같은 예산에서 공정하게 비교하는 법 |
| 평가 | 08 · 31 | 08장은 모델 응답 하나의 정답 평가, 31장은 여러 단계 실행의 경로·최종 상태·비용 평가 |
| 긴 문맥 | 12 · 20 | 12장은 한 번의 호출에서 모델이 긴 입력을 어떻게 쓰는지(모델의 성질), 20장은 여러 차례 행동하는 동안 무엇을 문맥에 남기고 언제 읽을지(Claude에서의 관리) |
| 문맥 나누기 | 20 · 22 | 20장은 에이전트 하나가 자기 문맥을 관리하는 법, 22장은 일을 나눠 독립된 문맥에 맡기는 법 |
| 부작용과 권한 | 13 · 24 | 13장은 도구마다 읽기·쓰기 부작용을 표시하고, 24장은 그 표시를 근거로 실행을 허용·확인·거부하는 규칙과 도구 결과 속 지시(프롬프트 주입)를 다룸 |
| 절차 | 21 · 25 | 21장은 반복 절차를 skill로 묶는 방법, 25장은 순서를 코드가 정할지 모델이 고를지 고르는 기준 |
| 위임과 검증 | 22 · 26 | 22장은 subagent에 일을 맡기는 장치, 26장은 그 장치로 작업자와 검증자를 나누는 설계 |
| 멈추는 조건 | 15 · 30 | 15장은 한 작업 안에서 에이전트가 멈추는 조건(안쪽 루프), 30장은 여러 시도와 세션을 다시 시작하고 끝내는 바깥 루프 |
| 기억과 재개 | 16 · 18 · 29 | 16장은 무엇을 기록해 넘길지(일반 원리), 18장은 Claude가 매번 읽는 지시와 자동 메모리, 29장은 누가 언제 저장하고 복원하는지(실행 환경의 장치) |

## 3. 장 한 편의 구성

1. 앞 장에서 남긴 질문과 이 장의 목표.
2. 네 절. 실제 집필에서는 내용에 맞게 절을 나눌 수 있습니다.
   - 1–4부와 6–7부: 문제 → 구성요소 → 동작·실패 → 다음 단계.
   - 5부(Claude의 구성요소)와 8부(Codex의 구성요소): **무엇인가 → 어떻게 작동하나**(언제 불러오고, 문맥에 무엇이 들어가며, 누가 결정하나) **→ 전체에서 맡는 일**(LLM의 어떤 한계를 메우나, 다른 구성요소와의 경계) **→ 작게 만들어 보기**. 예시는 마지막에 짧게 둡니다.
3. 실험: 기준 설계와 바꿀 요소 한 가지, 관측값, 예산과 반복 수, 실패 조건을 먼저 정합니다. 장 파일의 ‘실험 계획’ 슬롯에는 무엇을 바꾸고 무엇을 관측하는지 드러나는 질문 한 문장을 둡니다. 8부 슬롯의 실험 질문은 집필할 때 정하고, 지금은 짝이 되는 Claude 장만 적어 둡니다.
4. 핵심 정리, 설명이 있는 확인 퀴즈, 재현 가능한 연습문제.

새 개념은 무엇이 부족해서 필요한지부터 설명합니다. 모델 내부에 접근할 수 없으면 출력과 실행 기록만 관측했다고 분명히 씁니다. 자료의 주장, 이 책의 설명, 실험에서 확인한 결과를 구분합니다. `status: "slot"`은 본문과 실험을 아직 작성하지 않았다는 뜻입니다. 장을 쓰고 검증한 뒤에만 `draft`로 바꾸며, `done`은 사용자 확인 뒤에 사용합니다. 구현되지 않은 실험 id는 `sims`에 넣지 않습니다.

## 4. 실습과 예시 저장소

- 이 저장소(`bookshelf`)에는 설명, 도해, 공개 가능한 실험 결과와 링크를 둡니다. 정적 GitHub Pages 안에서 Claude 실행을 요구하지 않습니다.
- 1–3부는 작은 모형·고정된 예시·제한된 모델 비교로 핵심 개념을 분리합니다. 4부부터 도구 실행 기록을 읽습니다.
- 5–7부의 실습은 장마다 **빈 폴더에서 구성요소 하나를 작게 만들어 보는** 독립 예제로 합니다. 앞 장의 실습 결과가 없어도 각 장을 따라 할 수 있게 씁니다.
- 실습에 쓴 Claude Code 버전, 과제 입력, 모델 설정, 예산, 반복 횟수, 판정 코드를 기록합니다. 같은 과제와 예산으로 기준 설계와 변경 설계를 비교합니다. 완료라는 문장보다 실제 결과 파일·검사 결과를 우선합니다.
- 비용이 큰 학습, 캠페인, 외부 서비스 호출은 계획만으로 자동 실행하지 않습니다. 적은 비용의 재현 가능한 과제를 먼저 설계합니다.

### 예시 저장소: ai_sci_cowork

[ai_sci_cowork](https://github.com/yhlee52/ai_sci_cowork)는 Claude Code의 agent·skill·hook·plugin으로 만든 작은 AI 연구실 환경이며, 이 책에서는 **예시 하나**로만 씁니다. 32장 사례 연구에서 구성요소들이 실제 환경 하나에서 어떻게 맞물리는지 보여 주고, 다른 장에서는 필요할 때만 짧게 인용합니다. 책의 설명과 실습은 ai_sci_cowork 없이도 성립해야 합니다.

**기준 버전은 [v0.10.0](https://github.com/yhlee52/ai_sci_cowork/tree/v0.10.0)(커밋 `c0b2e7e`)입니다.** 인용할 때는 태그 주소(`…/blob/v0.10.0/<경로>`)를 씁니다. ai_sci_cowork를 고친 뒤 책을 함께 고쳐야 하는지는 아래 표로 확인합니다. 장 본문이나 실습에서 ai_sci_cowork를 새로 인용하면 이 표에 행을 추가합니다.

| 위치 | 무엇을 인용하나 | 기준 버전 |
|---|---|---|
| [chapters/ch32.html](chapters/ch32.html) | 사례 연구 전체: 구성요소 지도, `/ai-lab:work` 한 번의 흐름, 설계 결정 | v0.10.0 |
| [index.html](index.html) ‘실습과 예시’ 절 | 저장소 소개와 링크, 기준 버전 | v0.10.0 |
| 이 문서 §4 | 기준 버전과 이 표 | v0.10.0 |

## 5. 집필 자료와 검증

이 책의 출발 자료는 원 논문과 공식 문서입니다. 아래 표는 장마다 먼저 읽을 자료의 출발점이며, 장을 쓸 때 판본과 현재 동작을 다시 확인합니다. 5–7부의 Claude 구성요소는 [Claude Code 공식 문서](https://code.claude.com/docs/en/overview)를 기준으로 하며, 기능과 이름이 자주 바뀌므로 장을 쓸 때 확인한 날짜를 남깁니다. 8부는 Codex 공식 문서를 기준으로 하며, 장별 자료는 집필할 때 정합니다.

| 장 | 자료 |
|---|---|
| 01 | Sennrich 외, [Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909) (BPE) · Holtzman 외, [The Curious Case of Neural Text Degeneration](https://arxiv.org/abs/1904.09751) (샘플링) |
| 02 | Vaswani 외, [Attention Is All You Need](https://arxiv.org/abs/1706.03762) |
| 03 | Brown 외, [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) |
| 04 | Ouyang 외, [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) (InstructGPT) |
| 05 | Wei 외, [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903) |
| 05–06 | Besta 외, [Reasoning Language Models: A Blueprint](https://arxiv.org/abs/2501.11223) (RLM이라는 용어와 범위) · DeepSeek-AI, [DeepSeek-R1](https://arxiv.org/abs/2501.12948) |
| 07 | Wang 외, [Self-Consistency Improves Chain of Thought Reasoning](https://arxiv.org/abs/2203.11171) · Snell 외, [Scaling LLM Test-Time Compute Optimally](https://arxiv.org/abs/2408.03314) |
| 07–08 | Lightman 외, [Let's Verify Step by Step](https://arxiv.org/abs/2305.20050) (과정 검증기) |
| 09 | Radford 외, [CLIP](https://arxiv.org/abs/2103.00020) |
| 10 | Liu 외, [Visual Instruction Tuning](https://arxiv.org/abs/2304.08485) (LLaVA) |
| 11 | Lewis 외, [Retrieval-Augmented Generation](https://arxiv.org/abs/2005.11401) |
| 12 | Liu 외, [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) |
| 13 | Schick 외, [Toolformer](https://arxiv.org/abs/2302.04761) |
| 14 | Yao 외, [ReAct](https://arxiv.org/abs/2210.03629) |
| 17 | Claude Code, [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) |
| 18 | Claude Code, [Memory](https://code.claude.com/docs/en/memory) |
| 19 | Claude Code, [MCP](https://code.claude.com/docs/en/mcp) · [Model Context Protocol 명세](https://modelcontextprotocol.io/specification) |
| 20 | Claude Code, [Context window](https://code.claude.com/docs/en/context-window) · Anthropic, [Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) |
| 21 | Claude Code, [Skills](https://code.claude.com/docs/en/skills) · Anthropic, [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills) |
| 22 | Claude Code, [Subagents](https://code.claude.com/docs/en/sub-agents) |
| 23 | Claude Code, [Hooks 안내](https://code.claude.com/docs/en/hooks-guide) · [Hooks 참조](https://code.claude.com/docs/en/hooks) |
| 24 | Claude Code, [Permissions](https://code.claude.com/docs/en/permissions) · [Settings](https://code.claude.com/docs/en/settings) · [Sandboxing](https://code.claude.com/docs/en/sandboxing) · Greshake 외, [Not what you've signed up for: … Indirect Prompt Injection](https://arxiv.org/abs/2302.12173) |
| 25 | Anthropic, [Building effective agents](https://www.anthropic.com/research/building-effective-agents) |
| 27 | Claude Code, [Plugins](https://code.claude.com/docs/en/plugins/overview) · [Plugin marketplaces](https://code.claude.com/docs/en/plugins/create-marketplace) |
| 28 | Claude Code, [Headless](https://code.claude.com/docs/en/headless) · [Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview) |
| 29 | Anthropic, [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) · Claude Code, [/goal](https://code.claude.com/docs/en/goal) · [Scheduled tasks](https://code.claude.com/docs/en/scheduled-tasks) |
| 30 | Lulla 외, [Loop Engineering: Building Blocks, Adoption, and Impact](https://arxiv.org/abs/2608.21884) |
| 31 | Anthropic, [Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) · Jimenez 외, [SWE-bench](https://arxiv.org/abs/2310.06770) |
| 32 | [ai_sci_cowork v0.10.0](https://github.com/yhlee52/ai_sci_cowork/tree/v0.10.0) (README, docs/설계_근거.md) |

새로운 용어와 최신 제품 기능은 바뀔 수 있습니다. 특히 loop engineering은 연구와 현장 실천이 진행 중인 주제이므로 검증된 결과와 제안된 관행을 나누어 씁니다. 그림·예제·연습문제는 새로 만들고, 출처의 결론을 실제 실험 범위보다 크게 말하지 않습니다.

## 6. 진행

1장부터 한 장씩 집필합니다. 먼저 이 기획의 장별 범위와 실험 질문을 검토하고, 그 뒤 한 장씩 브랜치와 PR로 올립니다. 집필 중 장을 나누거나 합치면 `data/books.js`, 책 홈, 이 계획 문서를 함께 갱신합니다. 책의 모든 페이지는 모바일·다크 모드·링크·수식 오류를 확인합니다.

Codex는 Claude 설명(5–7부) 뒤의 8부에 따로 두고, 5–7부 본문에는 섞지 않습니다. 8부는 지금 장 제목과 절 제목, 짝이 되는 장만 정해 두었습니다. 다른 에이전트 도구를 더 다루게 되면 같은 방식으로 뒤에 붙입니다.
