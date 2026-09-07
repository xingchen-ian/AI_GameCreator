# AI Game Creator · Independent Study

Shared working repository for the Fall 2026 independent study **AI-Assisted Game Design Engine**. Instructor: Xingchen Zhang. Student: Qiuci Gong (Josie).

## Open the course site

Live: [xingchen-ian.github.io/AI_GameCreator](https://xingchen-ian.github.io/AI_GameCreator/)

- [Syllabus](https://xingchen-ian.github.io/AI_GameCreator/syllabus.html)
- [Studio · Week 01](https://xingchen-ian.github.io/AI_GameCreator/studio/week-01.html)
- [Josie’s research map](https://xingchen-ian.github.io/AI_GameCreator/research/llm_agent_game_design_research_map.html)
- [Course hub](https://xingchen-ian.github.io/AI_GameCreator/)

Local preview from the repo root: `npx serve .` then open `/course/syllabus.html`. Research HTML under `student/research/` is copied into the live site as `/research/` on each deploy to `main`.

## Who owns which folder

| Path | Owner | What belongs here |
| --- | --- | --- |
| `course/` | Instructor | Syllabus, studio sessions, instructor notes that the site links to |
| `student/` | Josie | Research notes, engine, logs, tests, final report |
| `shared/` | Both | Meeting notes and other jointly written docs |
| `STATUS.md` | Both | Living weekly progress |

Do not mix instructor teaching assets into `student/`, and do not put engine/report work into `course/`. Details: [NOTICE.md](NOTICE.md).

The only HTML site in this repository is `course/`. The earlier intro deck and research survey live on the instructor’s machine only.

## How we work

1. Clone **this** repository (`xingchen-ian/AI_GameCreator`). It is the only working copy.
2. Branch off `main`. Open a pull request. Do not both push straight to `main`.
3. Before each meeting, update [STATUS.md](STATUS.md).
