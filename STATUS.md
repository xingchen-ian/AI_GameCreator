# STATUS · AI-Assisted Game Design Engine

> **Planning source for this folder.** Humans and AIs: read before work; update facts and next steps when they change.  
> Cross-tool rule file: [`AGENTS.md`](./AGENTS.md).  
> Weekly meeting notes stay in the log at the bottom (newest first).  
> Long writing goes in `course/`, `blueprint-schema-v0.md`, `student/`, not here.

- **Updated**: 2026-10-19
- **Target venue**: **CHI PLAY 2027 WiP**（CfP 未出，截稿/会期 **待核对**）；期刊线 CoDesign 保留
- **Owners**: Instructor (Xingchen) + Josie — both may edit; keep next steps ≤3

---

## One-liner

Independent study + engine research: structured **blueprint** as shared design language → minimal playable demo → verification loop. Builds on the teaching ops of *Game Design from Life*; does not replace that methodology repo.

---


## 投稿证据主源（投稿与截稿盯梢）

- **主源**：Independent Study（Josie）→ `student/` + `Independent Studies/Josie/game-agent-independent-study/`
- **课程材料**（`course/`）是教学脚手架，不单独充当 CHI PLAY / CoDesign 的研究贡献主体
- **CHI PLAY 2027 WiP**（目标会议，2026-09-30 确认）：CfP 未出，日期待核对；稿件应能讲清 blueprint 共享语言 + mode B 协作回路 +（有则）验证/下一步
- **CoDesign**：强调 human–AI *co-creation / collaboration*，不是泛「AI 写游戏」工具介绍
- **缺**：`student/report/` 仍空；三页作业（cases / framework / v0 plan）未齐则不宜开写正式投稿稿

## Urgency

| Level | Meaning |
|------|---------|
| 🟠 High | Fall 2026 course running; theory aimed at **CHI PLAY 2027 WiP** + journal track **CoDesign** |

This week: Week 07 — stabilize review + polish exam prototype; milestone human/AI note; prep Weeks 9–10 adult tests. IRB TBD → submit. **No research playtests until consent/IRB. No minors.**

---

## Progress (rough)

| Area | Status | Notes |
|------|:------:|-------|
| Course site + Pages | ✅ | https://xingchen-ian.github.io/AI_GameCreator/ |
| Syllabus / studio | 🟡 | Week 07 notes live: positioning · exam prototype · next build |
| Blueprint schema v0 | 🟡 | `blueprint-schema-v0.md` + sailing sample |
| Theoretical framework | 🟡 | `course/theoretical-framework.md` |
| Student engine / report | 🟡 | Josie owns `student/`; *Boil an Egg* is the Week 01 pipeline game |
| Guidance-mode decision | 🟡 | Class 02 1a/1b/1c stay as research labels. Today: **implement B first** (user starts; AI feedback). A later. C out. |
| CHI PLAY WiP draft | ⬜ | Framework first; draft later；**2027 CfP 未出**（2026 WIP 曾 6/3） |
| CoDesign journal | ⬜ | 强调 collaboration/co-creation；滚动投稿；篇幅待核实 |
| IRB usability (prospective) | 🟡 | NEW folder `irb-usability-2026/` v0.1 drafts（protocol/consent/flyer/survey/interview/checklist）. **Consent + RCO/IRB first — no research tests yet.** Distinct from IRB-2026-061. |

---

## Next steps (≤3)

1. **Josie · Week 07**: finish review-module debug + exam-prototype polish; notify when re-checkable.
2. **Xingchen · milestone note**: short human/AI boundary write-up; optional second themed demo.
3. **IRB + Weeks 9–10**: submit usability packet; after midterm, adult playtests only with consent/IRB. No minors.

---

## Key paths

| Use | Path |
|-----|------|
| Course site | https://xingchen-ian.github.io/AI_GameCreator/ |
| Week 02 studio | `course/studio/week-02.html` |
| Week 03 studio | `course/studio/week-03.html` |
| Week 06 studio | `course/studio/week-06.html` |
| Week 07 studio | `course/studio/week-07.html` |
| Math-quiz prototype | `student/tests/saturday-math-quiz/` |
| Week 02 notes | `shared/meeting-notes/2026-09-14-week02-meeting.md` |
| Week 03 notes | `shared/meeting-notes/2026-09-14-week03-meeting.md` |
| Week 06 notes | `shared/meeting-notes/2026-10-12-week06-meeting.md` |
| Week 07 notes | `shared/meeting-notes/2026-10-19-week07-meeting.md` |
| Meeting PDFs | `course/meeting-notes/` (Pages) |
| Student work | `student/` |
| IRB usability drafts | `irb-usability-2026/` |

---

## Weekly log (newest first)

### 2026-10-19 · Meeting PDFs on course site

- Uploaded Week 06 / Week 07 smart-minutes PDFs to `course/meeting-notes/` (Pages-downloadable).
- Index: https://xingchen-ian.github.io/AI_GameCreator/meeting-notes/

### 2026-10-19 · Week 07 on course site

- Studio Week 07: positioning (lived experience → expressive play) · exam prototype feedback · GDD/inspiration fixes · Weeks 9–10 adult tests.
- Note: `shared/meeting-notes/2026-10-19-week07-meeting.md`. Links playable `student/tests/saturday-math-quiz/`.

### 2026-10-19 · Week 06 on course site

- Studio Week 06: preview engine · in-class math-quiz pass · issues · next actions (prefill / system map / smart revise).
- Note: `shared/meeting-notes/2026-10-12-week06-meeting.md`. Industry side-chat stays off the public page.

### 2026-10-12 · IRB usability packet drafted (prospective)

- New study folder: `irb-usability-2026/` (protocol, consent, flyer, survey, interview guide, IRBManager checklist) — **not** secondary analysis; distinct from IRB-2026-061.
- Procedures: ~60 min playtest + observation notes (no screen/video) + survey + **optional** interview audio; compensation RMB 50; NYU Shanghai students ≥18; leisure time; flyer recruitment.
- Proposed **Exempt**; RCO determines; ~2–3 weeks after complete submit.
- Gate: **informed consent + exemption/approval before any research testing.**


### 2026-09-14 · 投稿侧：以 Independent Study 为主源

- 用户确认 AI-Game Engine 投稿研究贡献主要来自 Independent Study（非仅课程讲义）。
- 盯梢路径：`student/` + Josie IS 仓；CHI PLAY WiP / CoDesign 等三页材料与 report 齐后再压稿。

### 2026-09-14 · Week 03 meeting (today's notes)

- Static staged scaffold first; AI helps fill stages, does not generate a whole game.
- Today's A/B/C ≠ Week 02's 1a/1b/1c. **Implement B first.** A later. C out (transcript mixed two meanings).
- Josie homework: 0 case studies (one page); 1 framework review (one page); 2 v0 plan + tech research.
- Studio page rewritten; submit slots are caseStudies / theoryReview / devPlan.
- Note: `shared/meeting-notes/2026-09-14-week03-meeting.md`.
- Instructor-only: GitHub permissions; rb Wed/Fri; Albert grading needs no extra review after Jack.


### 2026-09-14 · Reading list page trimmed to English catalog

- `library-acquisition-list.html` is now an English reading list (A–D only): no purchase guidance, no “use in project” column, no Chinese editions.

### 2026-09-14 · Library acquisition list on course hub

- Published `course/library-acquisition-list.html` (sampled from sibling *Game Design from Life*); linked from course hub.

### 2026-09-14 · Week 03 plan set

- Week 03 becomes: review Week 02 homework → design test activity + careful data plan → explore technical prep in parallel.
- Old “pipeline autopsy / scope freeze” deferred; RoP systems kept as optional background only.

### 2026-09-14 · Week 02 homework set from class notes image

- Assignment is now: (1) design guidance framework a/b/c; (2) problem investigation — elaborate, cognitive load, playability + imagination.
- Submit slots: `guidanceFramework` + `problemInvestigation`.

### 2026-09-14 · Week 02 page refreshed from full meeting summary

- Expanded Class notes: linear-Q&A diagnosis, overview→deepen, min playable loop + revision history, win/lose early, emotion/learning mining, UI must-show, 1a/1b/1c, owners, later-together vs not-this-week.
- Assignment / questions aligned to flow options with early win–lose and revisability.
- Meeting note rewritten from the longer Zoom summary.

### 2026-09-14 · Week 02 page updated from class

- Studio Week 02 includes Class notes, revised assignment (flow options), Zoom + meeting-note links.

### 2026-09-14 · Week 02 held

- Linear Q&A is the problem; people lead; overview first; minimum loop early; win/lose early; life as material.
- Do **not** lock 1b this week. Next class: small test of 1a / 1b / 1c only.
- Full note: `shared/meeting-notes/2026-09-14-week02-meeting.md`.

---


## 变更 · 2026-10-12（研究负责人）

- 起草前瞻可用性测试 IRB 材料 v0.1 → `irb-usability-2026/`（与 2026-061 课程二次分析分开）。
- 未获豁免/批准前，闲暇招测数据不作研究发表数据。

## 变更 · 2026-09-30（研究负责人）

- 目标会议定为 **CHI PLAY 2027 WiP**（用户确认）；CfP 未出，截稿/会期待核对，不照搬 2026 日期。
- 仍然有效：未获 IRB 批准前，任何学生反馈/测试都不算研究数据。

## 变更 · 2026-09-28（研究负责人）

- **GameOne 学生反馈收集中**（教学/产品迭代用；未获 IRB 前不作研究发表数据）：
  - Sheet: https://docs.google.com/spreadsheets/d/19O3Rgotjp5c961Z8M_EcJwSicl-5vSz--5nKrhk3kUk/edit?usp=sharing

