(function () {
  const weeks = window.WEEKS_DATA || [];
  const root = document.getElementById("session-root");
  if (!root || !weeks.length) return;

  const weekId = root.dataset.week;
  const index = weeks.findIndex((week) => week.id === weekId);
  const week = weeks[index];
  if (!week) {
    root.innerHTML = "<p class='shell'>Session not found.</p>";
    return;
  }

  document.body.classList.add(`phase-${week.phaseKey}`);
  document.title = `Week ${week.id} · ${week.title} · Studio`;

  const prev = weeks[index - 1];
  const next = weeks[index + 1];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderReadings(items) {
    if (!items.length) {
      return `<p class="empty-note">No assigned reading this week.</p>`;
    }
    return items
      .map(
        (item) => `
      <article class="reading-card">
        <div>
          <a href="${escapeHtml(item.href)}" target="_blank" rel="noopener">${escapeHtml(item.title)} ↗</a>
          <b class="access">${escapeHtml(item.access)}</b>
        </div>
        <div class="note">${escapeHtml(item.note || "")}</div>
      </article>`
      )
      .join("");
  }

  function renderGuidedQuestions() {
    const groups = week.questionGroups;
    const note = week.questionsNote
      ? `<p class="prompt-note">${escapeHtml(week.questionsNote)}</p>`
      : "";

    if (groups && groups.length) {
      const blocks = groups
        .map((group) => {
          return `<div class="question-group">
            <h3>${escapeHtml(group.title)}</h3>
            ${group.intro ? `<p class="group-intro">${escapeHtml(group.intro)}</p>` : ""}
            ${renderList(group.items || [], "question-list")}
          </div>`;
        })
        .join("");
      return `${note}${blocks}`;
    }

    const heading =
      week.readings && week.readings.length
        ? "Read toward an engine decision"
        : "After class";
    return `${note}<h3>${heading}</h3>${renderList(week.questions || [], "question-list")}`;
  }

  function renderList(items, className) {
    if (!items.length) return `<p class="empty-note">—</p>`;
    return `<ol class="${className}">${items
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("")}</ol>`;
  }

  function submitButtons() {
    const sub = week.submission || {};
    const game = sub.pipelineGame || {};
    const report = sub.surveyReport || {};

    function slot(title, inner) {
      return `<article class="submit-slot"><h4>${escapeHtml(title)}</h4>${inner}</article>`;
    }

    function urlLine(url, emptyLabel) {
      if (url && String(url).trim()) {
        return `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)} ↗</a></p>`;
      }
      return `<p class="submit-pending">${escapeHtml(emptyLabel)}</p>`;
    }

    const gameInner =
      urlLine(game.url, "Not submitted yet — paste the playable URL into submission.pipelineGame.url") +
      `<p class="submit-meta">Pipeline: <strong>${escapeHtml(game.pipeline || "—")}</strong></p>` +
      (game.note ? `<p>${escapeHtml(game.note)}</p>` : "");

    const reportInner =
      urlLine(report.url, "Not submitted yet — paste a doc URL into submission.surveyReport.url, or write the report in submission.surveyReport.body") +
      (report.body ? `<pre class="submit-body">${escapeHtml(report.body)}</pre>` : "");

    if (week.submission) {
      return `
        <div class="submit-slots">
          ${slot("Pipeline game", gameInner)}
          ${slot("Research / product survey report", reportInner)}
        </div>
        <p class="submit-hint">To submit: edit the <code>submission</code> object for this week in <code>course/studio/weeks-data.js</code> (that is this Submit section), then push. The live page is the official hand-in. Do not email or use Brightspace unless asked.</p>`;
    }

    return `<p class="submit-hint">Hand in by editing this Submit section: add a <code>submission</code> object on this week in <code>course/studio/weeks-data.js</code> (same pattern as Week 01), then push. What appears here is the official hand-in.</p>`;
  }

  function sessionMenuItems(base) {
    return weeks
      .map((item) => {
        const href = `${base}week-${item.id}.html`;
        const current = item.id === week.id ? " current" : "";
        return `<a class="${current.trim()}" href="${href}"><span class="w-no">${item.id}</span><span>${escapeHtml(
          item.title
        )}<span class="w-phase">${escapeHtml(item.phase)}</span></span></a>`;
      })
      .join("");
  }

  const navHtml = `
    <header class="topbar">
      <div class="shell topbar-inner">
        <a class="brand" href="../syllabus.html"><span class="brand-mark">AI</span><span>Research Studio · Fall 2026</span></a>
        <nav class="nav" aria-label="Studio navigation">
          <a href="../syllabus.html">Syllabus</a>
          <a href="../syllabus.html#schedule">14 Weeks</a>
          <details class="nav-drop" id="sessions-drop">
            <summary>Sessions</summary>
            <div class="nav-menu" role="menu">${sessionMenuItems("")}</div>
          </details>
        </nav>
      </div>
    </header>`;

  root.innerHTML = `
    ${navHtml}
    <section class="session-hero">
      <div class="shell">
        <div class="session-kicker">
          <span class="week-label">Week ${escapeHtml(week.id)}</span>
          <span class="phase-pill">${escapeHtml(week.phase)}</span>
        </div>
        <h1>${escapeHtml(week.title)}</h1>
        <p class="lead">${
          week.readings && week.readings.length
            ? "Readings, guided questions, assignment, and on-page submission for this Monday studio."
            : "Agenda, assignment, and on-page submission for this Monday studio. No assigned reading this week."
        }</p>
      </div>
    </section>
    <main>
      <div class="shell">
        <section class="panel">
          <h2>01 · Class agenda</h2>
          ${renderList(week.agenda, "agenda-list")}
        </section>

        <section class="panel">
          <h2>02 · Readings</h2>
          ${renderReadings(week.readings)}
        </section>

        <section class="panel">
          <h2>03 · Guided questions</h2>
          ${renderGuidedQuestions()}
        </section>

        <section class="panel">
          <h2>04 · Assignment</h2>
          <h3>${escapeHtml(week.assignment.summary)}</h3>
          ${renderList(week.assignment.deliverables, "deliverable-list")}
          <div class="criteria">
            <strong>Acceptance</strong>
            ${escapeHtml(week.assignment.criteria)}
          </div>
        </section>

        <section class="panel">
          <h2>05 · Submit</h2>
          <h3>Submit on this page</h3>
          <p class="submit-intro">
            This block <em>is</em> the hand-in. Edit the <code>submission</code> fields for this week in
            <code>course/studio/weeks-data.js</code>, push to GitHub, and they appear here.
            Do not email or use Brightspace unless asked.
          </p>
          ${submitButtons()}
        </section>

        <nav class="pager" aria-label="Adjacent sessions">
          ${
            prev
              ? `<a href="week-${prev.id}.html">← Week ${prev.id} · ${escapeHtml(prev.title)}</a>`
              : `<span></span>`
          }
          <a class="back" href="../syllabus.html#schedule">Back to syllabus</a>
          ${
            next
              ? `<a href="week-${next.id}.html">Week ${next.id} · ${escapeHtml(next.title)} →</a>`
              : `<span></span>`
          }
        </nav>
      </div>
    </main>
    <footer>
      <div class="shell footer-inner">
        <span>Week ${escapeHtml(week.id)} · AI-Assisted Game Design Engine · Fall 2026</span>
        <a href="../syllabus.html">Syllabus overview</a>
      </div>
    </footer>
  `;

  const drop = document.getElementById("sessions-drop");
  if (drop) {
    document.addEventListener("click", (event) => {
      if (!drop.open) return;
      if (!drop.contains(event.target)) drop.open = false;
    });
  }
})();
