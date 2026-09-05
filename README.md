# AI Game Creator · Independent Study

Shared working repository for the Fall 2026 independent study **AI-Assisted Game Design Engine**. Instructor: Xingchen Zhang. Student: Qiuci Gong (Josie).

## Open the course site

- [Syllabus](course/syllabus.html)
- [Studio · Week 01](course/studio/week-01.html)
- [Course hub](course/index.html)

Local preview from the repo root: `npx serve .` then open `/course/syllabus.html`.

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
