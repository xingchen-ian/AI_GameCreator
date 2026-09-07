# AI Game Creator · Independent Study

Shared working repository for the Fall 2026 independent study **AI-Assisted Game Design Engine**. Instructor: Xingchen Zhang. Student: Qiuci Gong (Josie).

## Open the course site

Live: [xingchen-ian.github.io/AI_GameCreator](https://xingchen-ian.github.io/AI_GameCreator/)

- [Syllabus](https://xingchen-ian.github.io/AI_GameCreator/syllabus.html)
- [Studio · Week 01](https://xingchen-ian.github.io/AI_GameCreator/studio/week-01.html)
- [Josie’s student folder](https://xingchen-ian.github.io/AI_GameCreator/student/)
- [Josie’s research map](https://xingchen-ian.github.io/AI_GameCreator/student/research/llm_agent_game_design_research_map.html)
- [Course hub](https://xingchen-ian.github.io/AI_GameCreator/)

Local preview from the repo root: `npx serve .` then open `/course/syllabus.html`.

On each deploy to `main`, GitHub Pages publishes:

- `course/` → site root
- `student/` → `/student/` (full tree; HTML is browsable)

Large binaries in `student/` will also publish; keep engine builds lean or host big assets elsewhere if the Pages artifact grows too large.

## Who owns which folder

| Path | Owner | What belongs here |
| --- | --- | --- |
| `course/` | Instructor | Syllabus, studio sessions, instructor notes that the site links to |
| `student/` | Josie | Research notes, engine, logs, tests, final report |
| `shared/` | Both | Meeting notes and other jointly written docs |
| `STATUS.md` | Both | Living weekly progress |

Do not mix instructor teaching assets into `student/`, and do not put engine/report work into `course/`. Details: [NOTICE.md](NOTICE.md).

Instructor teaching HTML lives in `course/`. Josie’s publishable work lives in `student/` and is mirrored onto Pages. The earlier intro deck and research survey live on the instructor’s machine only.

## How we work

1. Clone **this** repository (`xingchen-ian/AI_GameCreator`). It is the only working copy.
2. Branch off `main`. Open a pull request. Do not both push straight to `main`.
3. Before each meeting, update [STATUS.md](STATUS.md).
