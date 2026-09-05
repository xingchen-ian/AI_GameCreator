# Game Design Mentor Agent — Design Plan

> Skeleton. Fill in the blanks; delete what you don't need.
> Goal: an agent with real game design knowledge that walks a **novice** through
> designing a game **step by step**.

---

## 1. What this agent is for

- **Who it teaches:** <!-- novice with no design background? student? someone who can code but not design? -->
- **What success looks like:** <!-- they finish a small game? they can name their core loop? -->
- **What it explicitly does NOT do:** <!-- design the game for them? write code? make art? -->
- **Where it runs:** <!-- Claude Code skill / chat / notebook / other -->

---

## 2. Persona and voice

- Stance: <!-- Socratic tutor? studio mentor? peer? -->
- Tone: <!-- -->
- How much it talks vs. asks: <!-- suggested: ask first, explain only after they try -->

---

## 3. Teaching rules

The rules that constrain the agent's behavior every turn. A few starters — rewrite them:

1. Ask before you tell.
2. One design question per message.
3. Every stage ends with something written down.
4. <!-- -->
5. <!-- -->

---

## 4. Knowledge base

What the agent actually knows. One row per concept; add files later if it outgrows this.

### Format for a concept entry

```
### <Concept name>
- One line:
- Why a novice needs it:
- Questions to ask the learner:
- Common novice failure:
- Example game:
- Source:
```

### Concepts to cover

| Area | Concepts | Status |
|---|---|---|
| Core loop | verb-first design, the repeat cycle | todo |
| Player motivation | MDA aesthetics, what players want | todo |
| Mechanics & systems | rules, states, feedback loops, dominant strategy | todo |
| Level & content | teaching order, first five minutes | todo |
| Game feel | input → response → feedback | todo |
| Prototyping & playtesting | scope, riskiest assumption, watching players | todo |
| <!-- --> | | |

### Written entries

<!-- Write concept cards here using the format above. Start with the 2-3 you care most about. -->

---

## 5. The stage ladder

The step-by-step path. Order by **risk** — scariest unknown first, not by how a finished
game gets described.

Per stage: **goal → what the agent does → the artifact produced → the gate to advance.**

| # | Stage | Goal | Artifact | Gate |
|---|---|---|---|---|
| 0 | Intake | know the learner | learner profile | <!-- --> |
| 1 | Seed verb | one sentence, a verb | doc § Seed | <!-- --> |
| 2 | Core loop | the repeat cycle | doc § Loop | <!-- --> |
| 3 | <!-- --> | | | |
| 4 | <!-- --> | | | |
| 5 | <!-- --> | | | |

### Stage detail

<!-- Expand each stage here once the table settles. -->

#### Stage 0 — Intake
- Goal:
- Agent does:
- Artifact:
- Gate:

---

## 6. State — what persists between sessions

The agent has to remember where the learner is, or "step by step" doesn't work.

- **Learner profile:** <!-- taste, skills, hours/week, deadline -->
- **Design doc:** <!-- the growing artifact, one section per stage -->
- **Session log:** <!-- what happened, what was committed to, what's next -->
- Where does this live? <!-- files in repo? the agent re-reads them each session? -->

---

## 7. Failure modes to watch for

| What the agent sees | What it means | What it should do |
|---|---|---|
| Learner describes story when asked about mechanics | setting ≠ game | <!-- --> |
| Feature list keeps growing | scope panic | <!-- --> |
| Learner agrees with everything | agent is designing it, not them | <!-- --> |
| <!-- --> | | |

---

## 8. Open questions

- <!-- How does the agent handle a learner who wants to skip a stage? -->
- <!-- How does it know a stage actually landed vs. was nodded through? -->
- <!-- -->

---

## 9. Notes / scratch

<!-- -->
