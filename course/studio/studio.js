(function () {
  const weeks = window.WEEKS_DATA || [];
  const config = window.STUDIO_CONFIG || { submit: {} };
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
      return `<p class="empty-note">No assigned reading this week — studio and writing focus.</p>`;
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

  function renderList(items, className) {
    if (!items.length) return `<p class="empty-note">—</p>`;
    return `<ol class="${className}">${items
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("")}</ol>`;
  }

  function submitButtons() {
    const submit = config.submit || {};
    const weekSubject = encodeURIComponent(
      `AI Game Design Engine · Week ${week.id} · ${week.title}`
    );
    const mailto =
      submit.mailto ||
      (config.instructorEmail
        ? `mailto:${config.instructorEmail}?subject=${weekSubject}`
        : "");

    const buttons = [
      {
        key: "brightspace",
        label: "Open Brightspace",
        href: submit.brightspace,
        secondary: false
      },
      {
        key: "drive",
        label: "Open Drive folder",
        href: submit.drive,
        secondary: true
      },
      {
        key: "mailto",
        label: "Email instructor",
        href: mailto,
        secondary: true
      }
    ];

    const configured = buttons.filter((button) => button.href);
    const html = buttons
      .map((button) => {
        if (!button.href) {
          return `<span class="submit-btn disabled" aria-disabled="true">${escapeHtml(
            button.label
          )} · not set</span>`;
        }
        return `<a class="submit-btn${button.secondary ? " secondary" : ""}" href="${escapeHtml(
          button.href
        )}" target="_blank" rel="noopener">${escapeHtml(button.label)} ↗</a>`;
      })
      .join("");

    const hint = configured.length
      ? `Submit Week ${week.id} through one of the links above. Update URLs in <code>studio/config.js</code> when destinations change.`
      : `Submission links are not configured yet. Set <code>submit.brightspace</code>, <code>submit.drive</code>, or <code>submit.mailto</code> in <code>studio/config.js</code>.`;

    return `<div class="submit-row">${html}</div><p class="submit-hint">${hint}</p>`;
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
        <p class="lead">Readings, guided questions, assignment, and external submission for this Monday studio.</p>
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
          <h3>Read toward an engine decision</h3>
          ${renderList(week.questions, "question-list")}
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
          <h3>Hand in through your course channel</h3>
          <p style="margin-top:0;color:var(--muted);font-size:14px;">
            This site does not store files. Use Brightspace, Drive, or email once configured.
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
