# Independent Study: AI-Assisted Game Design Engine

**Draft syllabus v0.2 · Fall 2026 · for discussion**  
Course-specific pages follow this independent study. **Course Policies from Academic Honesty through Academic Resources are copied verbatim from INTM-SHU 247, 2026 Summer (last two pages) and must not be edited.** Other standard policy language (attendance, late work, devices, generative AI, instructional technology) follows that same 2026 template.

---

## Instructor Information

- Xingchen Zhang
- Clinical Assistant Professor
- Interactive Media Arts
- N304
- Office hours by appointment
- xz33@nyu.edu

## Course Information

- *Independent Study (course number as assigned)*
- AI-Assisted Game Design Engine
- Monday 8:30–11:00 a.m.
- Classroom *TBD*
- Expected weekly load: 10–12 hours, including the 2.5-hour class meeting

This independent study builds a constrained, browser-based, AI-assisted game design engine, then evaluates it with designer-users. It starts from the instructor’s summer teaching practice **Game Design from Life**: two pipelines in which guiding questions become a development outline (system diagram + summary) that an AI agent compiles into a minimum playable demo.

The engine is not a general-purpose Unity/Unreal competitor, and it is not a one-prompt game generator. It treats a **structured blueprint** as the single source of truth for human, agent, and evaluator; keeps **design decisions with the human**; and embeds **verification** in the tool so that “it compiles” is not the same as “the design holds.”

Prerequisite: working knowledge of at least one programming language and comfort with web development. Prior game-engine experience is useful but not required.

---

## Course Overview and Learning Outcomes

The study asks a practical question: when an AI agent joins game creation, what interaction structure and design language let a novice complete the loop *guide → structure → playable verification* without giving up authorship?

Work is organized in four phases:

1. **Weeks 1–3 · Frame.** Read game-design frameworks. Play and dissect the summer pipelines (emotion path; domain-learning path). Freeze a blueprint field list and a three-sprint plan.
2. **Weeks 4–7 · Sprint 1 (4 weeks).** Structure as a language: readable blueprint, visible gaps, any-entry scaffold, compile to a minimum demo. External test.
3. **Weeks 8–10 · Sprint 2 (3 weeks).** Working contract: the agent proposes; the human confirms before a change enters the blueprint. External test.
4. **Weeks 11–12 · Sprint 3 (2 weeks).** Close the loop: lightweight evaluation returns to the blueprint; a larger designer-user test; at least one change traceable to evidence.
5. **Week 13 · Writing.** Testing report (three-test comparison) and talk script.
6. **Week 14 · Public workshop.** Research presentation at NYU Shanghai for guests from computer science, interactive media, and sociology.

Four theoretical layers (plus a scaffold principle) are lenses for critique, not a queue of separate products:

| Lens | Claim in this study |
| --- | --- |
| **L1 Game Design Structure** | Structure is the basic language (MDA / patterns as vocabulary, not a forced wizard). |
| **L2 Human–AI Co-Creation** | Mixed-initiative working contract: both sides act; the human decides. |
| **L3 Design Verification Loop** | Evaluation lives in the tool and closes the design loop. |
| **L4 Learning-through-Design** | Using the engine is how a novice learns the language (observed in every test, not a fourth sprint). |
| **P-Scaffold** | Any entry; missing structure is visible; prompts are offers, not commands. |

Each sprint ends with something **other people can use**. Testers are **designer-users**: they make a small game *with* the engine, preferably from a lived-experience or domain-learning prompt, as in the summer courses. What thickens across sprints is the tool, not a new assignment genre.

Upon completion, the student will be able to:

- Read and write a game as a structured blueprint (intent, mechanics, entities/variables, challenge space, feedback, open slots), and explain that vocabulary using MDA and related frameworks.
- Specify and implement a human–AI working contract in which suggestions are distinct from committed design, and provenance of key decisions is visible.
- Design a lightweight verification path (structure gaps, run health, intent alignment) and treat playtest evidence as a reason to change the tool.
- Plan and run small designer-user tests, and write a report that compares three increments rather than celebrating a single demo.
- Present the work to a mixed public audience (CS / IMA / sociology) with a stable demo path and questions worth answering.

---

## Course Requirements

### Class participation

Attendance at every Monday meeting is required. This is a studio: 8:30–9:15 homework and reading; 9:15–10:15 work on the running system; 10:15–11:00 lock next week’s acceptance criteria (on sprint-review weeks, this block is the review and test). Unexcused absence or lateness affects the participation grade. Contact the instructor at least 24 hours in advance when absence is unavoidable.

### Weekly homework

Every week has a due item: a reading response, a build increment, a test protocol, a sprint memo, or a writing/talk deliverable. Reading responses are 400–600 words: one claim from the text, applied to one engine decision, plus a question for class. They are not summaries.

### Sprint reviews (3)

Each sprint is reviewed in class with a playable increment, a short memo against that sprint’s lens (L1 / L2 / L3), and an external designer-user test:

| Test | When | n (target) | What the test is for |
| --- | --- | --- | --- |
| Test 1 | Week 7 | 1–2 | Can a stranger fill the blueprint and reach a demo? Are gaps visible? |
| Test 2 | Week 10 | 2–3 | Is suggest ≠ commit visible? Does authorship stay with the user? |
| Test 3 | Weeks 11–12 | 5–8 | Does evaluation make “what’s missing / what’s off” perceptible? Did evidence change the engine? |

Recruitment for Test 3 begins in Week 9. Guests for Week 14 may be invited as testers earlier.

### Project documentation

A living engine design document (revised each sprint) and a weekly iteration log (intent; AI outputs accepted / modified / rejected and why; what will be verified next). These are the data for the testing report.

### Final products

1. A deployed browser-based engine (repository + URL + short design rationale).
2. A designer-user testing report (~2,500–4,000 words) comparing the three tests: question, method, findings, implications, limitations. Appendices: protocols and anonymized notes.
3. Week 14 public presentation: ~20 minutes of talk, a demo that will not fail in the room, and discussion prompts for CS, IMA, and sociology guests.

### Assigned readings

Typical week: one paper or book excerpt (about 15–25 pages), plus play/dissection of existing summer work in Weeks 1–3. Books are used as selected chapters via NYU Library; the MDA paper is required in full.

---

## Grading of Assignments

| Assignments / Activities | % of final grade |
| --- | ---: |
| Attendance and participation | 10% |
| Reading responses (10) | 10% |
| Design document and iteration logs | 15% |
| Sprint reviews (3) | 30% |
| Final engine (deployed) | 25% |
| User testing report | 10% |

**Attendance and participation — 10%**  
Preparedness for the Monday studio, follow-through on the previous week’s acceptance criteria, and quality of critique (including how testers are briefed and observed).

**Reading responses — 10%**  
Ten short responses. Graded on whether the framework is used as a design tool. Late policy below.

**Design document and iteration logs — 15%**  
The document must state evaluation criteria *before* the next build. Logs must distinguish human and agent moves. A beautiful engine with empty logs cannot receive full credit here.

**Sprint reviews — 30%**  
Weighted with the calendar: Sprint 1 (Weeks 4–7) **12%**; Sprint 2 (Weeks 8–10) **10%**; Sprint 3 (Weeks 11–12) **8%**. Each review grades the increment against its door, not against a finished commercial engine.

| Sprint | Door | A-level (sketch) |
| --- | --- | --- |
| 1 · Structure | A person can complete entry → blueprint → minimum demo. AI may compile; it may not silently rewrite design. | Criteria written before the build; open slots visible; any-entry is real, not a linear wizard. |
| 2 · Contract | Suggest / confirm / provenance / undo are in the interface. | A tester can point to which lines the human committed. |
| 3 · Loop | Evaluation returns to the blueprint; Test 3 runs; demo path for Week 14 is locked. | At least one engine change is traceable to test evidence. |

**Final engine — 25%**  
Deployed, scoped, coherent. Week-14 polish cannot replace a missing Sprint 1 substrate or an unconstrained Sprint 2.

**User testing report — 10%**  
Quality of protocol and use of evidence across three tests, not sample size. An A report shows what changed in the tool and what remains unknown.

### Letter grades

| Letter | Points | Percent |
| --- | --- | --- |
| A | 4.00 | 92.5% and higher |
| A- | 3.67 | 90.0–92.49% |
| B+ | 3.33 | 87.5–89.99% |
| B | 3.00 | 82.5–87.49% |
| B- | 2.67 | 80.0–82.49% |
| C+ | 2.33 | 77.5–79.99% |
| C | 2.00 | 72.5–77.49% |
| C- | 1.67 | 70.0–72.49% |
| D+ | 1.33 | 67.5–69.99% |
| D | 1.00 | 62.5–67.49% |
| D- | 0.67 | 60.0–62.49% |
| F | 0.00 | 59.99% and lower |

Grades are recorded in Albert according to Independent Study procedures.

---

## Course Schedule

Dates follow the NYU Shanghai Fall 2026 calendar. Homework listed for a class is **due at the start of that class**, unless noted.

### Weeks 1–3 · Frame

| Class | Topic | Reading (do before class) | Due at the start of class |
| --- | --- | --- | --- |
| **01** | Two summer pipelines; MDA as a lens | Hunicke, LeBlanc & Zubek, *MDA* (2004), full paper | Assignment given in class: (1) make a playable game with one summer pipeline; reflection in Class 02. (2) related research/product survey report. |
| **02** | Meaningful play; reflection on the pipeline game | Salen & Zimmerman, *Rules of Play*, chapter on meaningful play | Playable pipeline game; survey report. In class: written reflection on the making process. Reading response: map play onto Mechanics / Dynamics / Aesthetics. |
| **03** | Systems; freeze blueprint v0; sprint plan. Week 3 is also a technical warm-up for Sprint 1. | *Rules of Play*, selected pages on systems / rules | **Pipeline autopsy:** one summer project from questions → system diagram → demo; mark what the human wrote, what the agent filled, what was lost. Draft blueprint field list. |

**End of Week 3 gate:** field list v0 frozen; three sprint doors written as acceptance criteria; one filled sample blueprint (emotion *or* domain path).

### Weeks 4–7 · Sprint 1 — Structure as language (L1)

AI may compile blueprint → demo. It may not silently become the designer.

| Class | Topic | Reading | Due |
| --- | --- | --- | --- |
| **04** | Blueprint as SSOT; any-entry scaffold | Fullerton, *Game Design Workshop*, playcentric-process excerpt | Reading response: whose experience is the engine for—player of the demo, or designer-user of the tool? Design document v0 (intent, verbs, entities, out of scope). |
| **05** | Variables, feedback, challenge space | Meadows, *Thinking in Systems*, stocks / flows / feedback (selected); optional: summer methodology pages on challenge space | Working editor: the sample blueprint can be created and edited in the tool, not only in a document. Iteration log. |
| **06** | Visible gaps; Test 1 protocol | Short scaffold / anti-wizard note (instructor excerpt) | Playable compile path (blueprint → minimum demo). Test 1 protocol. **Recruit 1–2 testers for Class 07.** |
| **07** | **Sprint 1 review + Test 1** | None new | **Sprint 1 increment + 2-page review memo** (against the L1 door). In-class designer-user test. |

### Weeks 8–10 · Sprint 2 — Working contract (L2)

| Class | Topic | Reading | Due |
| --- | --- | --- | --- |
| **08** | Mixed-initiative; suggest ≠ commit | Yannakakis, Liapis & Alexopoulos, mixed-initiative co-creativity (2014) | Reading response: where, in *this* UI, is the agent allowed to act? Suggestion-rail spike. |
| **09** | Provenance, undo, boundary object | Amershi et al., *Guidelines for Human-AI Interaction* (2019)—only the guidelines that constrain this UI (about 3–4) | Confirm-to-write on the live path. Design document v2 (coupling: propose / constrain / evaluate). **Recruit Test 2 (2–3 people) and start recruiting Test 3 (5–8).** |
| **10** | **Sprint 2 review + Test 2** | Fullerton, playtesting chapters (start) | **Sprint 2 increment + review memo** (L2 door). In-class test. Test 3 protocol v1. |

### Weeks 11–12 · Sprint 3 — Close the loop (L3)

This sprint is closure and evidence, not a new subsystem. Evaluation probes reuse design questions already used in the summer courses (gaps, run health, intent still present).

| Class | Topic | Reading | Due |
| --- | --- | --- | --- |
| **11** | Evaluation as design feedback; Test 3 in progress | Fullerton, playtesting chapters (finish) | Lightweight eval returning to the blueprint. Test 3 sessions underway (notes, not analysis). |
| **12** | **Sprint 3 review;** lock Week 14 demo path | None new | **Sprint 3 increment + memo:** at least one engine change traceable to Test 3. Demo path written as a checklist. |

### Weeks 13–14 · Write and make public

| Class | Topic | Reading | Due |
| --- | --- | --- | --- |
| **13** | Writing studio; dry-run of the talk | None new | **Testing report draft** (three-test comparison). Talk script. Three discussion questions each for CS, IMA, and sociology guests. |
| **14** | **Public research workshop** at NYU Shanghai | — | **Final engine URL/repo.** Final report. Slides. In-room demo. |

---

## Course Materials

### Required texts (selected; NYU Library / provided PDFs)

- Hunicke, R., LeBlanc, M., & Zubek, R. (2004). *MDA: A Formal Approach to Game Design and Game Research.*
- Salen, K., & Zimmerman, E. (2004). *Rules of Play.* Selected chapters: meaningful play; systems; rules.
- Fullerton, T. *Game Design Workshop.* Selected: playcentric process; playtesting.
- Meadows, D. H. (2008). *Thinking in Systems.* Selected: stocks, flows, feedback.
- Yannakakis, G. N., Liapis, A., & Alexopoulos, C. (2014). Mixed-initiative co-creativity.
- Amershi, S., et al. (2019). *Guidelines for Human-AI Interaction.* CHI. (excerpt)

### Required existing work (Weeks 1–3)

Instructor materials from **Game Design from Life**: emotion-path and domain-learning question lists; system-diagram examples; playable summer demos. URLs and files distributed in Class 01.

### Tools

A laptop that can run a local web toolchain comfortably. The study is **browser-based** (not Unity). Specific stack (e.g. a small editor + agent compile path) is chosen in Week 3 against the frozen field list. Repository hosting: GitHub; public demo on GitHub Pages, itch.io, or an NYU host, decided in Sprint 1.

### Resources

- Access your course materials: distributed by the instructor (repository and weekly assignment notes)
- Databases, journal articles, and more: NYU Shanghai Library (shanghai.nyu.edu/academics/library)
- Academic support and tutoring: Academic Resource Center (shanghai.nyu.edu/arc)
- Obtain 24/7 technology assistance: IT Help Desk (nyu.edu/it/servicedesk)

---

## Course Policies

### Attendance and Tardiness

Because of the intensive nature of the course, attendance in all classes is mandatory. Each unexcused absence will result in a half-letter-point reduction in your grade (e.g., A > A-). If you know you are going to be absent or late, please let me know in advance so we can figure out how you can make up for what you missed in class.

**Absences and Grades**

- 3 absences will lead to an F for your participation grade.
- 4 absences will lead to a 1 point reduction in your final grade.
- 5 absences will lead to failure of the course.

**Absence Exceptions**

Observance of Religious Holidays: You may miss class for the observance of religious holidays. If you anticipate being absent because of religious observance, notify me in advance so we can create a plan for making up missed work. For more on this policy: https://www.nyu.edu/about/policies-guidelines-compliance/policies-and-guidelines/university-calendar-policy-on-religious-holidays.html

Competitions, Conferences, Presentations: You are permitted to be absent from classes to participate in competitions, conferences, and presentations, either at home or out of town, as approved by the Assistant Dean for Academic Affairs. Review the Undergraduate Bulletin for the conditions you must meet to obtain approval for this kind of absence.

Extended Illness: If you are ill and need to miss more than one week of classes, you must speak to the Health & Wellness Office. Once Health and Wellness verifies the reasons for your extended absence, I will consult with Academic Affairs and recommend the best course of action. I will not look at doctors’ notes, both for your health privacy reasons and because I cannot verify the authenticity or content of the notes.

### Tardiness

Punctual arrival is mandatory for this class. Be on time. Please do not leave in the middle of class unless it is an emergency.

### Late Assignments

Assignments are due at the date and time indicated on this syllabus. The late penalty for any assignments is one third of a letter grade per day (an A becomes an A-, etc.) All other late assignments will earn an F.

### Electronic Devices

Mobile Devices: You may not use mobile devices in class unless otherwise indicated.

Recording Class: To ensure the free and open discussion of ideas, you may not record classroom lectures, discussion and/or activities without my advance written permission; any such recording can be used solely for your own private use. If you have approved accommodations from the Office of Disability Resources permitting the recording of class meetings, you must present the accommodation letter to me in advance of any recording. On any days when classes will be recorded, I will notify all students in advance. Distribution or sale of class recordings is prohibited without the written permission of the instructor and other students who are recorded.

### Use of Generative AI Tools

In this course, ChatGPT, MidJourney, or other AI generative tools are allowed to be used for generating design assets for students’ projects. Like graphics, music, sound, and code. Students need to document what and how these assets are generated and used in their project documentation. However, writing assignments, like reading responses, documentations are not allowed to be generated by any AI tools.

### Instructional Technology

E-mail Communication: E-mail will be the main communication method out of class. Announcements, supplementary materials and academic feedback will be shared through email. Please check your mailbox frequently to get updates of class. You are welcome to contact me for making an appointment, asking questions and sharing suggestions to this course with emails. You are able to find the instructor’s email address on the course website.

Assignment Notification: All assignments will be posted to the course website. You are able to access the next assignment and related materials before the next class.

### Academic Honesty/Plagiarism

Carefully read NYUSH’s Statement on Academic Integrity (in the Undergraduate Bulletin). Breaches of academic integrity could result in failure of an assignment, failure of the course, or other sanctions, as determined by the Academic Affairs office.

### Disability Disclosure Statement

NYU is committed to providing equal educational opportunity and participation for students with disabilities. It is NYU Shanghai’s policy that no student with a qualified disability be excluded from participating in any NYU Shanghai program or activity, denied the benefits of any NYU Shanghai program or activity, or otherwise subjected to discrimination with regard to any NYU Shanghai program or activity. Any student who needs a reasonable accommodation based on a qualified disability is required to register with the CSD for assistance. Students can register online through the Moses Center and can contact the Director of the Academic Resource Center with questions or for assistance. Web site: https://www.nyu.edu/students/communities-and-groups/students-with-disabilities/academic.html

### Title IX Statement

Title IX of the Education Amendments of 1972 (Title IX) prohibits discrimination on the basis of sex in educational programs. It protects victims of sexual or gender-based bullying and harassment and survivors of gender-based violence. Protection from the discrimination on the basis of sex includes protection from being retaliated against for filing a complaint of discrimination or harassment. NYU Shanghai is committed to complying with Title IX and enforcing University policies prohibiting discrimination on the basis of sex. Shakera Turi (shakera.turi@nyu.edu), Executive Director of the Office of Equal Opportunity, serves as the University’s Title IX Coordinator. The Title IX Coordinator is a resource for any questions or concerns about sex discrimination, sexual harassment, sexual violence, or sexual misconduct and is available to discuss your rights and judicial options. University policies define prohibited conduct, provide informal and formal procedures for filing a complaint and a prompt and equitable resolution of complaints.

Links to the Title IX Policy and related documents:

- Sexual Misconduct, Relationship Violence, and Stalking Policy
- Procedures for Complaints Against Students
- Procedures for Complaints Against Employees
- Resource Guide for Students
- Resource Guide for Employees

## Academic Resources

### ARC Services

The Academic Resource Center (ARC) offers both individual, one-on-one tutoring as well as group sessions in a variety of ways, in a variety of courses. You can log on to WCOnline to book an appointment with a Global Writing & Speaking Fellow or a Learning Assistant (LA). The Global Writing & Speaking Fellows conduct individual consultations on writing, speaking, reading, and academic skills coaching. LAs provide both individual and small-group tutoring support in over 30 STEM, Business, Economics, IMA/IMB, and Chinese Language classes. Visit shanghai.nyu.edu/arc for more information about ARC services.

### Library Support

#### Library Services

The Library is available to support your research needs. They have access to over 27,000 print resources, 2,000 DVDs, and 1,000 databases (including over a million e-books, as well as streaming audio and video and image databases).

Librarians with expertise in your research topic are available to meet either in person or online by appointment or by email to help you navigate the research process. Our library team features experts in Business, Arts & Humanities, STEM, Social Sciences & Economics, and data tools & resources. Ask us how we can assist you in developing a research question and formulating a research strategy, to selecting databases, requesting materials, and citing your sources. Visit shanghai.nyu.edu/library for more information on:

- 24/7 access to e-books, e-journals, streaming media, and databases
- Booking one-on-one consultations for research help
- Asking the Library questions via chat or email

#### Electronic Reserves

Students can access course readings using their NYU credentials for courses they currently enrolled in at https://ares.library.nyu.edu/.

#### Interlibrary Loan Service

For materials not available to you immediately, you can request scanned copies of a book chapter or journal article through our Interlibrary Loan (ILL) service. If you don't know which chapter you need, you can request a Table of Content through ILL.

---

## Scope (so the sprints stay honest)

**In:** one design vocabulary that can hold both summer paths (emotion; domain learning) as pluggable intent packs; visible open slots; one or two agent generation paths behind confirmation; browser playable output; instrumentation sufficient for the tests (task completion, think-aloud notes).

**Out:** general-purpose editor; Unity/3D; multiplayer; “any game from a prompt”; a large-n study; a conference paper as a course requirement.

---

*Draft for instructor revision. Still to fill: course number, room, Fall 2026 Monday dates, demo host.*
