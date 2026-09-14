window.WEEKS_DATA = [
  {
    id: "01",
    title: "Course plan and the summer pipeline",
    phase: "Frame",
    phaseKey: "frame",
    agenda: [
      "8:30–9:15 · Introduce the course plan, vision, and outcomes",
      "9:15–10:15 · Review the summer pipeline and discuss",
      "10:15–11:00 · Course logistics"
    ],
    readings: [],
    questionsNote:
      "Prompts only — you do not hand in answers. Use them while making the pipeline game and writing the survey.",
    questionGroups: [
      {
        title: "A · Summer pipeline",
        intro: "Ask these while you make the game.",
        items: [
          "Which path are you using (emotion / domain-learning), and what is the human-authored input that the rest of the pipeline is not allowed to invent?",
          "At which step did a vague intention become a system description an agent could compile? Copy that step (question list, diagram, or outline) into your notes.",
          "Where did the agent fill a gap? Keep it, rewrite it, or throw it away — and why, in one sentence?",
          "If this pipeline later becomes the engine, which of the steps you just used must stay visible on screen rather than happen inside the model?"
        ]
      },
      {
        title: "B · Survey",
        intro: "Ask these while you write the report.",
        items: [
          "Name one research project and one product that already claim AI can make a game. What structured representation do they use (GDD, graph, prompt chain, none)?",
          "What can a designer decide in that system, and what does the model decide by default?",
          "Where would your summer-pipeline game have broken if you had used that tool instead?",
          "What gap are you leaving for our engine — something neither the paper nor the product treats as a first-class object?"
        ]
      }
    ],
    assignment: {
      summary: "Two tasks after class. The reflection happens in Class 02.",
      deliverables: [
        "A playable game made with one summer pipeline (emotion path or domain-learning path)",
        "A written reflection on that making process — we will write and discuss it in Class 02",
        "A short report surveying related research and products (AI-assisted game-making tools, papers, and what they do / don’t cover)"
      ],
      criteria: "The game is playable and the pipeline used is identifiable. The report names specific systems or papers, not a generic list."
    },
    // Hand-in lives here. Edit these fields, push, and §05 Submit on the live page is the official submission.
    submission: {
      pipelineGame: {
        url: "https://boil-an-egg-josie.surge.sh",
        pipeline: "domain-learning path",
        note: "Boil an Egg — the novice treats doneness as a timing problem; the expert reads how the water boils, how the egg moves, and how loud the pot is. Play: game.html."
      },
      surveyReport: {
        url: "https://docs.google.com/document/d/1ssUvRNjCH8PJqIjNF5x62n5TI2JiaoHmhkfWCPx1C9U/edit",
        body: ""
      }
    }
  },
  {
    id: "02",
    title: "Meaningful play and translation",
    phase: "Frame",
    phaseKey: "frame",
    agenda: [
      "Held · Diagnosed linear Q&A: novices need a full game idea too early; hard to revise earlier answers",
      "Held · Direction: people lead; overview → deepen; minimum playable loop; win/lose early; life as material to expand",
      "Held · Compare guidance modes 1a / 1b / 1c next — do not lock 1b; no per-question feedback yet",
      "Carry · MDA + Rules of Play Ch. 3 still name translation success vs failure"
    ],
    classNotes: {
      held: "2026-09-14",
      sources: [
        {
          label: "Zoom Doc (class record)",
          href: "https://hub.zoom.us/doc/qSpRHnObQ0qfdUinb5L9MQ?from=hub&skipCheck=1"
        },
        {
          label: "Meeting note in repo",
          href: "https://github.com/xingchen-ian/AI_GameCreator/blob/main/shared/meeting-notes/2026-09-14-week02-meeting.md"
        }
      ],
      problem: [
        "Linear Q&A forces users to invent a complete game concept before they can answer later questions.",
        "Once the chain moves on, revising earlier answers breaks the flow and leaves little room to pause and think.",
        "Questions lean too hard on 1:1 life-to-game copying, so novices struggle to extract elements and expand creatively.",
        "Full AI control of the flow risks rambling or fixation; full human control without structure risks missing prompts for invention."
      ],
      decisions: [
        "People lead the design; AI proposes and records — it does not own the whole process.",
        "Restructure Q&A: show a game overview first (loop / challenge / win–lose), then deepen by section — not one long line of questions.",
        "Aim for a minimum playable loop after one round of answers; later play problems should trigger revision of earlier inputs (modification history matters).",
        "Name win / lose (or success / fail) conditions early — they shape the loop and challenges.",
        "Mine lived process along two paths — emotional impact and knowledge learning — then expand; do not 1:1 recreate the real event.",
        "UI should keep visible: actions, challenges, win/lose. Group questions (core loop / challenge / narrative) so users are not asked everything at once.",
        "Next class: simplify testing to 1a / 1b / 1c only, qualitative. Do not lock 1b. Do not collect per-question feedback yet (questions and flow are still coupled)."
      ],
      uiMustShow: [
        "Player actions / operations",
        "Challenges",
        "Win / lose (or success / fail) conditions"
      ],
      modes: [
        { id: "1a", label: "AI asks and runs the full flow", note: "Control case. Authorship is easy to lose." },
        { id: "1b", label: "Fixed stages; AI asks only inside a stage", note: "Closest to people-lead + visible stages. Not locked yet." },
        { id: "1c", label: "Write the whole thing, then AI review", note: "Useful as verification — not a substitute for guidance." }
      ],
      owners: [
        "Josie · design / refine the design flow so win–lose is prompted early; output clear interaction-flow options (chain, mesh, outline-first, progressive unlock) for Class 03 comparison.",
        "Xingchen · integrate methods for AI-guided mining of lived experience (emotion / learning) into engine prompts; before any INTM-SHU 247 trial, send and collect consent, then gather qualitative feedback on flow options."
      ],
      laterTogether: [
        "Rebuild Q&A around overview → deepen; support editing earlier answers during multi-round chat.",
        "Minimum-playable-loop generation after one answer round; auto-backtrack when later stages expose problems.",
        "A creativity / expansion module so life material is not only copied.",
        "Pull usable findings from existing papers on human–AI division of labor and template-based guidance."
      ],
      notThisWeek: [
        "Do not treat the long collaboration list as a started feature backlog.",
        "Do not collect per-question feedback yet.",
        "Do not mix education trials and full product features in one push.",
        "Open World Narratives remains dropped."
      ]
    },
    readings: [
      {
        title: "Hunicke, LeBlanc & Zubek · MDA",
        href: "https://users.cs.northwestern.edu/~hunicke/MDA.pdf",
        access: "Open PDF",
        note: "Translation lens: intent → mechanics → dynamics → aesthetics."
      },
      {
        title: "Salen & Zimmerman · Rules of Play, Ch. 3 Meaningful Play",
        href: "https://books.google.com/books?id=UM-xyczrZuQC&printsec=frontcover",
        access: "Preview",
        note: "Assigned via NYU Library (pp. 30–37). Meaningful for the designer-user of the engine, not only the end player."
      },
      {
        title: "Summer demos gallery",
        href: "https://xingchen-ian.github.io/game-design-from-life/summer-camp.html",
        access: "Course material",
        note: "Lived process → playable loop (expansion, not 1:1 copy)."
      },
      {
        title: "Emotion path",
        href: "https://xingchen-ian.github.io/game-design-from-life/practice.html",
        access: "Course material",
        note: "Emotional impact as one mining path into structure and mechanics."
      },
      {
        title: "Domain-learning path",
        href: "https://xingchen-ian.github.io/game-design-from-life/domain-learning.html",
        access: "Course material",
        note: "Knowledge / skill learning as the other mining path into challenge space."
      }
    ],
    questions: [
      "1a · AI asks and guides the full process — where does authorship slip, and when is this still useful?",
      "1b · Fixed stages; AI guides only inside a stage — what must each stage expose (loop, challenge, win/lose)?",
      "1c · Finish writing, then AI review — what can review catch that staged guidance cannot?",
      "How can timely questions and staged flow help the user elaborate their own ideas (not only fill blanks)?",
      "How do we keep cognitive load manageable — what stays visible, what is grouped, what waits?",
      "How do we push playability and imagination — expansion from lived material, not 1:1 life remakes?"
    ],
    assignment: {
      summary: "Week 02 homework (from Class 02 notes): choose and argue a design-guidance frame, then answer the three investigation questions.",
      deliverables: [
        "1 · Design guidance framework — write a short position on which structure to try first (do not lock forever): (a) AI asks and guides the full process; (b) fixed stages, AI guides only inside each stage; (c) user writes the whole design, then AI review",
        "1 · For the option you favor: sketch how stages / turns work, and note trade-offs vs the other two",
        "2 · Problem investigation — answer: (a) How can timely questions and a staged flow help users elaborate their own ideas?",
        "2 · (b) How do we keep users from carrying too much cognitive load?",
        "2 · (c) How do we make the resulting games more playable and more imaginative?",
        "Tie answers to Class 02 direction where useful: people lead; overview → deepen; early win/lose; life as material to expand"
      ],
      criteria: "Part 1 names a preferred frame among a/b/c with reasons; Part 2 answers all three investigation questions concretely enough to discuss in Class 03. 1b is not treated as already chosen."
    },
    submission: {
      guidanceFramework: {
        url: "",
        body: "",
        note: "Position on 1a / 1b / 1c + optional sketch link."
      },
      problemInvestigation: {
        url: "",
        body: ""
      }
    }
  },
  {
    id: "03",
    title: "Cases, frameworks, v0 plan",
    phase: "Frame",
    phaseKey: "frame",
    agenda: [
      "Review the two one-pagers: case studies + design-framework review",
      "Walk the v0 static scaffold and the next-week milestones (mode B)",
      "Keep today's A / B / C separate from Week 02's 1a / 1b / 1c",
      "Flag any case that involves minors; student tests wait until after v0"
    ],
    classNotes: {
      held: "2026-09-14",
      problemTitle: "What we settled today",
      decisionsTitle: "Build order",
      modesTitle: "A / B / C · today's labels (not Week 02)",
      ownersTitle: "This week's work",
      sources: [
        {
          label: "Meeting note in repo",
          href: "https://github.com/xingchen-ian/AI_GameCreator/blob/main/shared/meeting-notes/2026-09-14-week03-meeting.md"
        }
      ],
      problem: [
        "Build a staged, mostly static scaffold first. AI helps the user imagine and fill stages — it does not generate a whole game.",
        "Today's A / B / C is an implementation order. It is not Class 02's 1a / 1b / 1c (those stay on the Week 02 page)."
      ],
      decisions: [
        "Do B first: the user starts with ideas; AI gives feedback and prompts inside a visible scaffold.",
        "A later: AI drafts first, the user revises. Comparison, not this week's build.",
        "C is out for now. The transcript mixed 'AI does everything' and 'no AI' — do not implement C.",
        "Stages are real; inside a stage, AI may adjust follow-up questions from what it already collected.",
        "After a usable static v0, find student testers. Not this week."
      ],
      modes: [
        { id: "B", label: "User starts; AI feedback inside stages", note: "Build this first. Balances support with user control." },
        { id: "A", label: "AI drafts first, user revises", note: "Later comparison." },
        { id: "C", label: "Dropped this week", note: "Transcript mixed two meanings. Out." }
      ],
      owners: [
        "Josie · 0 one-page case studies; 1 one-page design-framework review; 2 v0 development plan + tech research.",
        "If a surveyed case involves minors, mark it on the case page. Do not recruit minors."
      ],
      notThisWeek: [
        "Student user tests (after v0).",
        "Implementing mode A or C.",
        "GitHub permissions, rb meeting, Albert grading — instructor logistics."
      ]
    },
    readings: [
      {
        title: "Week 02 studio · 1a / 1b / 1c notes",
        href: "week-02.html",
        access: "Prior session",
        note: "Different labels. Do not rename today's B as last week's 1b without checking."
      },
      {
        title: "Hunicke, LeBlanc & Zubek · MDA",
        href: "https://users.cs.northwestern.edu/~hunicke/MDA.pdf",
        access: "Open PDF",
        note: "Mechanics / Dynamics / Aesthetics. Use it to reverse a lived process into a small loop and challenges."
      },
      {
        title: "Schell · The Art of Game Design (Book of Lenses)",
        href: "https://search.library.nyu.edu/discovery/search?query=any,contains,Art%20of%20Game%20Design%20Schell&tab=Unified_NYUSH&search_scope=NYUSH&vid=01NYU_INST:NYUSH",
        access: "NYU Shanghai Library",
        note: "Practical lenses / handbook, not a philosophy text. E-book purchase is in progress; paper may be what you can open this week."
      },
      {
        title: "Course theoretical framework v0.2",
        href: "https://github.com/xingchen-ian/AI_GameCreator/blob/main/course/theoretical-framework.md",
        access: "Repo",
        note: "Four layers + scaffold. Background for the one-page review; do not copy the whole file onto the page."
      }
    ],
    questions: [
      "For each case: what does the human decide, what does the AI decide, and is that closer to today's A or B?",
      "Which design-framework pieces (MDA, lenses, workshop steps) should the static scaffold actually show?",
      "What is in v0 of mode B, and what waits for a later milestone?",
      "If a case involves minors, what do we mark, and what do we not do?"
    ],
    assignment: {
      summary: "Three documents this week. Submit on this page.",
      deliverables: [
        "0 · Case studies — one page. Compare related AI + game-design systems: what they do, pros / cons, fit for this engine.",
        "1 · Design-framework review — one page. MDA plus at least one handbook (Schell lenses or Fullerton workshop). Say what becomes a stage on our scaffold.",
        "2 · v0 development plan + tech research — document. A static staged scaffold for mode B, plus milestones for the next weeks."
      ],
      criteria: "Each item is one readable page or a short doc, not a dump. Cases that involve minors are flagged. Plan assumes mode B, not a full game generator. Student tests are not due this week."
    },
    submission: {
      caseStudies: {
        url: "",
        body: "",
        note: "One page. Flag minors if they appear in a case."
      },
      theoryReview: {
        url: "",
        body: ""
      },
      devPlan: {
        url: "",
        body: ""
      }
    }
  },
  {
    id: "04",
    title: "Blueprint as SSOT",
    phase: "Sprint 1",
    phaseKey: "s1",
    agenda: [
      "8:30–9:15 · Playcentric process → whose experience is the engine for?",
      "9:15–10:15 · Draft design document v0 inside the repo / tool",
      "10:15–11:00 · Acceptance criteria for a readable blueprint"
    ],
    readings: [
      {
        title: "Fullerton · playcentric-process excerpt",
        href: "https://www.gamedeveloper.com/design/book-excerpt-game-design-workshop",
        access: "Open excerpt",
        note: "Player experience goals, early prototyping, iteration."
      }
    ],
    questions: [
      "Who is the primary user of this engine: designer-user, eventual player, or both?",
      "Which blueprint fields must exist before any AI compilation is allowed?",
      "How will “out of scope” stay visible so the agent cannot silently expand it?"
    ],
    assignment: {
      summary: "Design document v0: intent, verbs, entities, constraints, out-of-scope. Answer: whose experience is this engine for?",
      deliverables: [
        "Design document v0 in the project repository",
        "One paragraph answering whose experience the engine serves"
      ],
      criteria: "Intent and out-of-scope are named; verbs and entities are listable."
    }
  },
  {
    id: "05",
    title: "Variables, feedback, challenge space",
    phase: "Sprint 1",
    phaseKey: "s1",
    agenda: [
      "8:30–9:15 · Stocks, flows, feedback ↔ challenge-space method",
      "9:15–10:15 · Build a working editor for the sample blueprint",
      "10:15–11:00 · Iteration-log format for the rest of Sprint 1"
    ],
    readings: [
      {
        title: "Meadows · Thinking in Systems (preview)",
        href: "https://books.google.com/books?id=JSgOSP1qklUC&printsec=frontcover",
        access: "Preview",
        note: "Stocks, flows, feedback, leverage. Full chapters via NYU Library."
      },
      {
        title: "Summer challenge-space method",
        href: "https://xingchen-ian.github.io/game-design-from-life/domain-learning.html",
        access: "Course material",
        note: "Variables that force new judgments when combined."
      }
    ],
    questions: [
      "Which blueprint fields act like stocks, and which like flows or feedback?",
      "How can challenge-space variables remain editable without becoming a wizard?",
      "What belongs in the iteration log that the final demo alone cannot show?"
    ],
    assignment: {
      summary: "Working editor: create and edit the sample blueprint inside the tool. Submit iteration log.",
      deliverables: [
        "Editor that creates and edits a sample blueprint",
        "Iteration log for this week’s changes"
      ],
      criteria: "A second person can open the tool and edit the sample without your narration."
    }
  },
  {
    id: "06",
    title: "Visible gaps and the first protocol",
    phase: "Sprint 1",
    phaseKey: "s1",
    agenda: [
      "8:30–9:15 · Negotiable scaffolds and anti-wizard design",
      "9:15–10:15 · Blueprint → demo path; gap visibility",
      "10:15–11:00 · Draft Test 1 protocol; begin recruitment"
    ],
    readings: [
      {
        title: "Instructor note · negotiable scaffolds and anti-wizard design",
        href: "../theoretical-framework.md",
        access: "Course material",
        note: "Any entry; missing structure stays visible; prompts are offers."
      }
    ],
    questions: [
      "How does the UI show what is missing without blocking progress?",
      "Where would a wizard silently decide for the designer, and how do you refuse that pattern?",
      "What must Test 1 observe that a demo video cannot prove?"
    ],
    assignment: {
      summary: "Playable blueprint → demo path; Test 1 protocol; recruit 1–2 designer-users.",
      deliverables: [
        "Working path from blueprint to minimum demo",
        "Test 1 protocol (tasks, prompts, observation foci)",
        "Recruitment note for 1–2 designer-users"
      ],
      criteria: "Gaps are visible in the UI; the protocol is runnable without you improvising."
    }
  },
  {
    id: "07",
    title: "Sprint 1 review + Test 1",
    phase: "Sprint 1 · Gate",
    phaseKey: "s1",
    agenda: [
      "8:30–9:15 · Schön: reflection-in-action during designer-user sessions",
      "9:15–10:15 · Run / debrief Test 1 (structural readability, any-entry)",
      "10:15–11:00 · L1 memo against the Sprint 1 door"
    ],
    readings: [
      {
        title: "Schön · The Reflective Practitioner (preview / borrow)",
        href: "https://openlibrary.org/works/OL7140277W/The_Reflective_Practitioner",
        access: "Preview / borrow",
        note: "Reflection-in-action and reflection-on-action."
      }
    ],
    questions: [
      "Where did you or the designer-user reflect-in-action while using the engine?",
      "What structural gaps were readable, and which remained invisible?",
      "Does the playable increment still express the tester’s structure, not yours?"
    ],
    assignment: {
      summary: "Playable increment + two-page memo against the L1 door + anonymized test notes.",
      deliverables: [
        "Playable Sprint 1 increment",
        "Two-page L1 memo",
        "Anonymized Test 1 notes"
      ],
      criteria: "Memo argues against the frozen L1 door; notes separate observation from interpretation."
    }
  },
  {
    id: "08",
    title: "Mixed initiative",
    phase: "Sprint 2",
    phaseKey: "s2",
    agenda: [
      "8:30–9:15 · MI-CC paper: where both sides act without collapsing agency",
      "9:15–10:15 · Define agent permissions; spike a suggestion rail",
      "10:15–11:00 · Acceptance criteria for “suggestion ≠ decision”"
    ],
    readings: [
      {
        title: "Yannakakis, Liapis & Alexopoulos · Mixed-Initiative Co-Creativity",
        href: "https://www.um.edu.mt/library/oar/bitstream/123456789/29459/1/Mixed-initiative_co-creativity.pdf",
        access: "Open PDF",
        note: "Both sides act; co-creativity vs mere authoring assistance."
      }
    ],
    questions: [
      "Where may the agent act proactively in this UI, and where must it wait?",
      "How will a designer-user tell a suggestion from a committed blueprint change?",
      "What would count as the agent fostering creativity rather than filling blanks?"
    ],
    assignment: {
      summary: "Define where the agent may act in this UI. Build a suggestion-rail spike.",
      deliverables: [
        "Written permission map for the agent",
        "Suggestion-rail spike in the running tool"
      ],
      criteria: "Permissions are specific to UI surfaces; suggestions are visually distinct."
    }
  },
  {
    id: "09",
    title: "Provenance, confirmation, undo",
    phase: "Sprint 2",
    phaseKey: "s2",
    agenda: [
      "8:30–9:15 · Amershi guidelines → confirm-to-write and undo",
      "9:15–10:15 · Wire confirm-to-write on the live path",
      "10:15–11:00 · Recruit Test 2; begin Test 3 recruitment"
    ],
    readings: [
      {
        title: "Amershi et al. · Guidelines for Human–AI Interaction",
        href: "https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf",
        access: "Open PDF",
        note: "Guidelines that constrain suggestion, confirmation, and control."
      }
    ],
    questions: [
      "Which 3–5 guidelines most constrain this engine’s suggestion → commit path?",
      "How is provenance of a key decision shown after the human confirms?",
      "What must undo restore: UI state, blueprint history, or both?"
    ],
    assignment: {
      summary: "Confirm-to-write on the live path; coupling section of design doc v2; recruit Test 2 and begin Test 3 recruitment.",
      deliverables: [
        "Confirm-to-write on the live path",
        "Design doc v2 · coupling / provenance section",
        "Test 2 recruitment; Test 3 recruitment started"
      ],
      criteria: "No silent blueprint writes; provenance is inspectable after confirm."
    }
  },
  {
    id: "10",
    title: "Sprint 2 review + Test 2",
    phase: "Sprint 2 · Gate",
    phaseKey: "s2",
    agenda: [
      "8:30–9:15 · Fullerton playtesting methods for designer-user sessions",
      "9:15–10:15 · Run / debrief Test 2 (suggestion vs decision)",
      "10:15–11:00 · L2 memo; Test 3 protocol v1"
    ],
    readings: [
      {
        title: "Fullerton · playtesting excerpt",
        href: "https://www.gamedeveloper.com/design/book-excerpt-game-design-workshop",
        access: "Open excerpt",
        note: "Observation, iteration, player experience goals applied to designer-users."
      }
    ],
    questions: [
      "Could testers point to what they—not the model—committed?",
      "Where did confirm / undo fail or feel invisible?",
      "What must Test 3 add that Test 2 did not yet stress?"
    ],
    assignment: {
      summary: "Playable increment + L2 memo + Test 2 notes + Test 3 protocol v1.",
      deliverables: [
        "Playable Sprint 2 increment",
        "L2 memo",
        "Anonymized Test 2 notes",
        "Test 3 protocol v1"
      ],
      criteria: "Memo argues the working-contract door; Test 3 protocol names new observation foci."
    }
  },
  {
    id: "11",
    title: "Evaluation as design feedback",
    phase: "Sprint 3",
    phaseKey: "s3",
    agenda: [
      "8:30–9:15 · Evaluation returning to the blueprint; summer alignment questions",
      "9:15–10:15 · Lightweight evaluators in the tool",
      "10:15–11:00 · Run Test 3 sessions; raw notes only"
    ],
    readings: [
      {
        title: "Fullerton · playtesting excerpt",
        href: "https://www.gamedeveloper.com/design/book-excerpt-game-design-workshop",
        access: "Open excerpt",
        note: "Finish the playtesting lens for Sprint 3 evidence."
      },
      {
        title: "Summer alignment questions",
        href: "https://xingchen-ian.github.io/game-design-from-life/domain-learning.html",
        access: "Course material",
        note: "Emotion equivalence, domain judgment, feedback, challenge progression."
      }
    ],
    questions: [
      "How does an evaluation result become a blueprint field change rather than a slide note?",
      "Which summer alignment questions can the tool ask without becoming a quiz?",
      "What will you refuse to conclude until raw Test 3 notes exist?"
    ],
    assignment: {
      summary: "Lightweight evaluation returns to blueprint. Run Test 3 sessions; collect raw notes, not conclusions.",
      deliverables: [
        "At least one evaluation path that writes back to the blueprint",
        "Raw Test 3 session notes"
      ],
      criteria: "Notes stay observational; evaluation is visible in the tool, not only in conversation."
    }
  },
  {
    id: "12",
    title: "Sprint 3 review and evidence",
    phase: "Sprint 3 · Gate",
    phaseKey: "s3",
    agenda: [
      "8:30–9:15 · Epistemic agency reading ↔ observed breakdowns",
      "9:15–10:15 · Trace one engine change to Test 3 evidence",
      "10:15–11:00 · Lock public demo checklist; L3 memo"
    ],
    readings: [
      {
        title: "Lee-Remond et al. · Designing Together",
        href: "https://doi.org/10.1080/15710882.2026.2655696",
        access: "Article",
        note: "Student game co-design and epistemic agency."
      }
    ],
    questions: [
      "Where did designer-users keep or lose epistemic agency while using the engine?",
      "Which observed breakdown maps to a missing verification loop step?",
      "Can you name one engine change that exists only because of Test 3?"
    ],
    assignment: {
      summary: "Increment + L3 memo; one engine change traced to Test 3; lock the public demo path as a checklist.",
      deliverables: [
        "Playable Sprint 3 increment",
        "L3 memo",
        "One change linked to Test 3 evidence",
        "Public demo checklist"
      ],
      criteria: "The change–evidence link is specific; the demo checklist is runnable cold."
    }
  },
  {
    id: "13",
    title: "Write the three-test comparison",
    phase: "Writing",
    phaseKey: "final",
    agenda: [
      "8:30–9:15 · Structure the testing report (question, method, three increments)",
      "9:15–10:15 · Draft findings, implications, limitations",
      "10:15–11:00 · Dry-run talk; write guest questions"
    ],
    readings: [],
    questions: [
      "What claim can you make across three tests that no single demo supports?",
      "Which limitation must appear before any guest from CS / IMA / sociology asks it?",
      "Which three questions are genuine enough that a wrong answer would change the work?"
    ],
    assignment: {
      summary: "Testing-report draft; talk script; three genuine questions each for CS, IMA, and sociology guests.",
      deliverables: [
        "Testing-report draft (2,500–4,000 word target)",
        "Talk script",
        "Nine guest questions (3 × CS / IMA / sociology)"
      ],
      criteria: "Comparison across three increments; questions are not rhetorical."
    }
  },
  {
    id: "14",
    title: "Public research workshop",
    phase: "Share",
    phaseKey: "final",
    agenda: [
      "Research talk",
      "Stable live demo (+ optional hands-on task)",
      "Cross-disciplinary discussion",
      "Final delivery handoff"
    ],
    readings: [],
    questions: [
      "What assumption about the blueprint do you most want challenged in the room?",
      "Where should agent permissions stop, according to a CS guest—and do you agree?",
      "Whose lived experience becomes legitimate design material in this engine?"
    ],
    assignment: {
      summary: "Engine URL/repository; final testing report; slides; stable in-room demo.",
      deliverables: [
        "Deployed engine URL + repository",
        "Final testing report",
        "Slides",
        "Stable in-room demo path"
      ],
      criteria: "Demo runs without heroics; report is the three-test comparison, not a victory lap."
    }
  }
];
