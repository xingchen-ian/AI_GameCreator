# Status

Update before each weekly meeting. Newest week at the top.

## 2026-09-07 · research map on the site

- Hub link to Josie’s research map was broken: Pages only published `course/`, while the HTML lives in `student/research/`. GitHub `blob` links also do not render the page.
- Fix: deploy workflow now copies `student/research/*.html` → site `/research/`. Hub links to `/research/llm_agent_game_design_research_map.html`.
- Josie already has write access. Pushing under `student/research/*.html` to `main` (via PR/merge) updates the public research pages after Pages deploy. Edits elsewhere in `student/` still do not appear on the site by design.

## 2026-09-05 · repo setup

- Course website is in `course/` (syllabus + studio). The intro deck and research survey stay local-only; they are not on GitHub.
- Josie’s existing notes and research map are in `student/research/`.
- Josie is a write collaborator; she works in `student/`.
- Course site: https://xingchen-ian.github.io/AI_GameCreator/ (publishes `course/` plus `student/research/*.html`).
- Open: weekday meeting slot.
