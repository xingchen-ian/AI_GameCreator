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
        url: "",
        pipeline: "",
        note: ""
      },
      surveyReport: {
        url: "",
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
      "8:30–9:15 · Reflection on the pipeline game made after Class 01",
      "9:15–10:15 · Discuss Chapter 3; map play onto M / D / A",
      "10:15–11:00 · Decide what “meaningful” means for a designer-user of the engine"
    ],
    readings: [
      {
        title: "Hunicke, LeBlanc & Zubek · MDA",
        href: "https://users.cs.northwestern.edu/~hunicke/MDA.pdf",
        access: "Open PDF",
        note: "Mechanics, dynamics, and aesthetics as a bidirectional lens."
      },
      {
        title: "Summer demos gallery",
        href: "https://xingchen-ian.github.io/game-design-from-life/summer-camp.html",
        access: "Course material",
        note: "Play at least three student games."
      },
      {
        title: "Emotion path",
        href: "https://xingchen-ian.github.io/game-design-from-life/practice.html",
        access: "Course material",
        note: "Lived event → emotional structure → playable mechanics."
      },
      {
        title: "Domain-learning path",
        href: "https://xingchen-ian.github.io/game-design-from-life/domain-learning.html",
        access: "Course material",
        note: "Novice/expert gap → skill loop → challenge space."
      },
      {
        title: "Salen & Zimmerman · Rules of Play, Ch. 3 Meaningful Play",
        href: "https://books.google.com/books?id=UM-xyczrZuQC&printsec=frontcover",
        access: "Preview",
        note: "Assigned full chapter via NYU Library (pp. 30–37)."
      }
    ],
    questions: [
      "What would “meaningful play” mean for the designer using the engine, rather than the eventual player?",
      "How can the engine make the relationship between a designer’s decision and its playable outcome both discernible and integrated?",
      "Can an AI-generated game function correctly but still lack meaningful play? What evidence would reveal this?",
      "How should playtest feedback return to the blueprint as an actionable design change?"
    ],
    assignment: {
      summary: "Map one summer game onto M/D/A; note where generated rules do or do not produce meaningful play.",
      deliverables: [
        "One M/D/A map of a summer game",
        "Reading response (400–600 words): one claim from Ch. 3 applied to one engine decision, plus a question for class"
      ],
      criteria: "The response uses the chapter’s vocabulary; the map shows at least one translation failure."
    }
  },
  {
    id: "03",
    title: "Pipeline autopsy and scope freeze",
    phase: "Frame",
    phaseKey: "frame",
    agenda: [
      "8:30–9:15 · Systems and rules chapters → blueprint field candidates",
      "9:15–10:15 · Autopsy one summer project: human / agent / lost meaning",
      "10:15–11:00 · Freeze blueprint v0 and the three sprint doors"
    ],
    readings: [
      {
        title: "Rules of Play · Ch. 5 Systems",
        href: "https://books.google.com/books?id=UM-xyczrZuQC&printsec=frontcover",
        access: "Preview",
        note: "pp. 48–55 · objects, attributes, relationships, environment."
      },
      {
        title: "Rules of Play · Ch. 11 Defining Rules",
        href: "https://books.google.com/books?id=UM-xyczrZuQC&printsec=frontcover",
        access: "Preview",
        note: "pp. 118–125 · what counts as a rule."
      },
      {
        title: "Rules of Play · Ch. 12 Rules on Three Levels",
        href: "https://books.google.com/books?id=UM-xyczrZuQC&printsec=frontcover",
        access: "Preview",
        note: "pp. 126–139 · constitutive, operational, implicit."
      },
      {
        title: "Rules of Play · Ch. 14 Games as Emergent Systems",
        href: "https://books.google.com/books?id=UM-xyczrZuQC&printsec=frontcover",
        access: "Preview",
        note: "pp. 150–171 · dynamics that are not pre-scripted."
      }
    ],
    questions: [
      "Ch. 5 — What are the objects, attributes, relationships, and environment of the proposed blueprint system?",
      "Ch. 5 — How should the engine expose missing relationships without prescribing a single “correct” design?",
      "Ch. 11 — In this engine, what is the difference between a rule, a constraint, an AI suggestion, and an implementation default?",
      "Ch. 11 — Which rules may the AI infer, and which must the human explicitly confirm?",
      "Ch. 12 — How do constitutive, operational, and implicit rules map onto the blueprint and playable demo?",
      "Ch. 12 — What information may be lost when AI translates a designer’s operational description into executable rules?",
      "Ch. 14 — What behaviors should emerge from interactions among rules rather than being explicitly scripted?",
      "Ch. 14 — When is unexpected behavior a productive discovery, and when is it evidence of structural failure?",
      "Trace one intention: meaningful-play goal → system relationship → rule representation → emergent behavior → evaluation. Where is distortion most likely?"
    ],
    assignment: {
      summary: "Trace one project end to end; mark what the human authored, what the agent filled, and what was lost. Freeze blueprint v0 and sprint doors.",
      deliverables: [
        "End-to-end autopsy of one summer project",
        "Blueprint field list v0",
        "Written freeze of Sprint 1 / 2 / 3 doors (L1 / L2 / L3)"
      ],
      criteria: "Authorship boundaries are explicit; the sprint doors are testable."
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
