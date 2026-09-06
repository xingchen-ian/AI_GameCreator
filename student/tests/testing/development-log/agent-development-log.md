# Agent Development Log

Project Title: Boil an Egg
Student / Team: Josie
Original Life Experience: Boiling an egg for breakfast. Most people in China have had a morning where an egg is breakfast, and almost everyone does it by guessing at the clock.
Core Emotion: Light, warm, stress-relieving. A small relaxing game, not a tense one.
Core Mechanic: Hold Space to keep the egg in the water and release to hand it to the customer; the left and right arrow keys set the heat. There is no timer and no doneness readout, so the player must judge doneness from how hard the water boils, how the egg moves, and how loud the boil is.
Current Game Idea: Serve an endless queue of customers. Each one shows you the size of their egg and the doneness they want, then their patience starts draining. Serve within one level of the order to earn coins; miss by more, or let them walk out, and the run ends.
Current Graph / Data Structure Summary: Three separated data groups matching the hand-drawn system graph — environment (eggSize, desired, patienceLeft), player (heatIndex, eggInPot), calculated (doneness, agitation, waterLevel, coins). Doneness is a hidden value from 1 to 6 climbing at heat rate times size multiplier.
AI Agent Used: Claude Opus 5, via Claude Code
Development Period: 2026-09-05 — ongoing
Git Repository: Not set up yet. The project folder is currently untracked inside the AI_GameCreator repository and has not been committed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Interaction 01 — Raw Interaction Log

**Time:** 2026-09-05
**Development Stage:** Workspace indexing, before any design or code
**Current Goal:** Find out what actually exists in the project folder and what the brief does and does not specify
**Git Tag / Commit:** None — nothing committed at this point

### Student Prompt
Index the workspace: list every file, read the brief in full, read the system graph image, then report the domain, core learning shift, core mechanic, main data and challenge presets quoted directly, plus anything empty, missing or contradictory. Stop after the report and do not write code.

### Agent Response Summary
Listed the three files present, read the brief and the log protocol, and read the system graph image successfully. Quoted the requested fields verbatim. Reported three fields still marked "Not specified yet", the missing files the brief assumes, and ten contradictions or gaps inside the brief.

### AI Design Assumptions (REQUIRED — do not skip)
None. No design decisions were made at this step. Where the brief had no answer, the gap was reported rather than filled.

### Development Action
Read-only audit. No files created or changed.

### Files / Mechanics Changed
None.

### Immediate Result
Worked. Three findings mattered most: the brief file is named `domain-learning-brief.md`, not `brief.md` as section 11 assumes; pot power is listed as both environment data and player-controlled data; and the brief says roughly six doneness levels but only ever names about four.

### Student Follow-up (REQUIRED — do NOT write "TBD" or leave blank)
The student asked, in Chinese, which questions actually needed answering. The agent separated seven blocking questions from four that could wait. The student then answered all seven.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Interaction 02 — Raw Interaction Log

**Time:** 2026-09-06
**Development Stage:** Closing the design gaps before implementation
**Current Goal:** Get every blocking answer from the student so the first playable version does not need any invented mechanics
**Git Tag / Commit:** None — nothing committed at this point

### Student Prompt
Answered the blocking questions directly: use English names for the six doneness levels; holding the key keeps the egg in the pot and releasing takes it out; the player controls the heat; a run continues until failure with unlimited customers and a coin ranking at the end; easy patience is 8–12 seconds and hard is 4–8 seconds; two presets only; no timer; the project is called Boil an Egg by Josie; the core emotion is a light, warm, stress-relieving little game. Then, in a second message: remove the coin deduction entirely, so a customer either pays or does not; game over is the customer refusing to wait or the egg missing the order; the 8–12 seconds covers the whole cook; **difficulty must not change how fast the egg cooks — cooking speed depends only on heat and egg size**; and the patience countdown starts the moment the customer places their order.

### Agent Response Summary
Restated the design in under 200 words, proposed the folder structure and page list, and defined the first milestone. Flagged one conflict the student's answers created: a numeric patience countdown would hand the player a clock and undercut the stated learning shift, since cooking speed is fixed. Asked two remaining questions with options — how the coin tiers work now that deduction is gone, and whether the countdown shows digits.

### AI Design Assumptions (REQUIRED — do not skip)
1. **The water tells you about the pot; the egg's movement tells you about the egg.** The brief lists both as feedback but never says they are separate channels. The agent proposed treating them as separate, so that a hard boil shakes even a raw egg and the player has to see past it. Presented to the student as an interpretation, not a fact, and not objected to.
2. **Orders never ask for Raw or Overcooked.** These are the two ends of the ladder and read as failure states rather than things a customer would order, so orders are drawn from levels 2–5. The brief does not say this.

### Development Action
Design specification only. Still no code.

### Files / Mechanics Changed
None.

### Immediate Result
Worked. The student chose 5 coins for an exact match, 3 coins for one level off, and game over beyond that; and chose a draining patience meter with no digits, which resolves the conflict the agent raised. The student's rule that difficulty must not touch cooking speed is what keeps the two presets from being a difficulty slider.

### Student Follow-up (REQUIRED — do NOT write "TBD" or leave blank)
The student said "continue", which the agent took as approval to start building. Four questions are still unanswered and are not blocking: whether to rename `domain-learning-brief.md` to `brief.md`, whether `ratings.csv` is coming, the AI agent name and dates for the log header (filled in provisionally), and whether this folder should become its own git repository for GitHub Pages.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Interaction 03 — Raw Interaction Log

**Time:** 2026-09-06
**Development Stage:** First playable milestone
**Current Goal:** Ship the smallest complete version that proves the loop, together with the first real version of the website
**Git Tag / Commit:** None — the student has not asked for a commit yet

### Student Prompt
Build the first milestone: a playable demo with one complete observe → judge → act → feedback → adjust loop plus both challenge presets, and the first real version of `index.html` in the same pass.

### Agent Response Summary
Created the whole project space and implemented the game. Dependency track A — plain HTML, CSS, JavaScript and Canvas 2D, with the boiling sound generated by the Web Audio API so that nothing is downloaded from a CDN. Built the six-level doneness model, the three feedback channels, both presets, the coin rules, game over, and a per-difficulty best score in the browser.

### AI Design Assumptions (REQUIRED — do not skip)
1. **Three discrete heat levels** (Low / Medium / High) rather than a continuous dial. The brief only says "high / low heat". Three steps keep the water cue readable.
2. **Heat carries over between customers**, so the player can preheat for the next order. The brief does not mention this.
3. **A fairness guard on order generation.** Before an order is issued, the game checks it is reachable at full heat with 1.2 seconds of slack; if not, it rolls again. Without this, a large egg with a hard-boiled order and 4 seconds of patience would be impossible. This does not change cooking speed, so it does not violate the student's rule.
4. **Releasing Space serves the egg immediately.** The student said release takes the egg out, and the brief's action list has no separate serve step, so lifting and handing over were made one gesture. This means the player cannot lift the egg out to inspect it — a real design consequence the student should check.
5. **The result card auto-advances after 2.6 seconds** rather than waiting for a key, so the loop keeps flowing.
6. **Best score is stored in the browser's local storage**, one per difficulty. The student asked for a coin ranking; this is the smallest honest version of that, and it is private to each browser rather than a shared leaderboard.
7. **The water boils away over time** and the water line visibly drops. This comes from the brief's line about long evaporation meaning overcooked, but the brief never states it as a mechanic.
8. **English names chosen for the ladder:** Raw, Soft-Boiled, Jammy, Medium, Hard-Boiled, Overcooked.

### Development Action
Created the folder structure, three pages, three JavaScript modules, two stylesheets, the README and this log. Implemented state, rendering and sound.

### Files / Mechanics Changed
- `index.html` — new. Designer statement, domain knowledge, system design, honest project status, play link.
- `game.html` — new. The playable game.
- `process.html` — new. Development timeline drawn from this log.
- `README.md` — new. How to run, controls, dependency track, main variables.
- `assets/css/site.css`, `assets/css/game.css` — new.
- `assets/js/game.js` — new. Rules, state, loop, overlays, input.
- `assets/js/render.js` — new. Canvas 2D drawing with seeded hand-drawn wobble.
- `assets/js/audio.js` — new. Web Audio boiling bed, bubbles and result cues.
- `development-log/agent-development-log.md` — new. This file.

### Immediate Result
Partially verified. The three JavaScript files parse without error and the pages load and the loop runs. **Not yet verified by a human playing it:** whether the egg's spin is actually readable against the shaking of a hard boil at Hard difficulty, and whether 4-second patience feels fair or just frantic. That is the main open risk in this milestone.

One real failure during this step: the first attempt to write `assets/js/game.js` through a shell heredoc was corrupted mid-write — a stray fragment of text was inserted into the middle of the file and roughly a third of the functions were missing. The agent noticed it, said so, and rewrote the file with a different tool rather than patching around it.

### Student Follow-up (REQUIRED — do NOT write "TBD" or leave blank)
Pending. The student has not played it yet. The specific questions waiting on the student are: (1) is the egg's spin readable at high heat, or does the boiling water hide it too well; (2) does releasing Space to serve feel right, or should lifting the egg out and handing it over be two separate actions; (3) should the two presets be renamed to something less generic than Easy and Hard. No reflection entry has been written, because the student asked to be the one to trigger it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Interaction 04 — Raw Interaction Log

**Time:** 2026-09-06
**Development Stage:** First playtest of the milestone build, by the student
**Current Goal:** Make the pot actually behave like a pot — feedback that grows over time instead of sitting flat
**Git Tag / Commit:** None — still uncommitted

### Student Prompt
"这个还不对，理想情况下应该会随时间，气泡声音从小到大，翻滚也越来越明显" — this is not right yet; over time the bubbles and the sound should go from small to loud, and the rolling should become more and more obvious.

### Agent Response Summary
Agreed, and identified two separate causes rather than one. First, `agitation` was purely a function of the heat setting and was smoothed over about half a second, so the water snapped to the dial and then stayed flat forever — there was no build-up for the sound to climb along with. Second, the egg was only rotating about its own axis, and a nearly symmetrical oval rotating in place is visually almost identical to one standing still, so the "turning" was effectively invisible no matter how fast it went.

### AI Design Assumptions (REQUIRED — do not skip)
1. **A cold egg knocks the boil back, and a bigger egg knocks it back further.** The student asked for a build-up over time but did not say what resets it. Tying the knock-back to the egg going in makes the ramp happen once per customer without a fake reset, is physically true, and quietly gives egg size a second visible tell. This is an addition, not something the brief states.
2. **The egg circles the pot rather than spinning on the spot.** The brief says the egg "starts to turn around in the pot", which the first build read as axial rotation. Orbital motion is the other reading and it is far more visible.
3. **Speckles were added to the shell** purely so the turning is legible. Cosmetic, but it is the thing that actually makes the cue readable.
4. **The boil builds faster on high heat** (about 3.2 seconds to a full rolling boil at High, about 9.6 at Low).

### Development Action
Modified the agitation model, the egg motion model, and the sound. Cooking speed was deliberately left untouched, so the student's rule that difficulty and time must not affect how fast an egg cooks still holds — `doneness` is still exactly `heat rate × size multiplier`.

### Files / Mechanics Changed
- `assets/js/game.js` — added `potBuild` and `orbit` to the calculated data; the boil now climbs toward the heat ceiling instead of jumping to it; a cold egg subtracts from the build by an amount set by egg size; the egg's orbital speed and spin both scale with doneness; agitation smoothing tightened so the knock-back reads as a clear drop.
- `assets/js/render.js` — the egg now travels around the pot on a perspective ellipse, leaves a wake when it is turning hard, lolls onto its side as it cooks, and has three speckles that rotate with the shell.
- `assets/js/audio.js` — loudness now rises with elapsed boiling time as well as with agitation.
- `index.html` — the system design data table and the three feedback cards rewritten to describe the new behaviour.
- `process.html` — timeline entry added.

### Immediate Result
Worked, and is verified by machine rather than by eye. The test harness was extended to wrap the renderer and sample the game's live state each frame. It now confirms that the boil dips when the egg goes in and then climbs (0.244 → 0.366 → 0.497), and that the egg's turning accelerates as it cooks (0.46 radians in the first window, 2.48 in the next). 16 checks passing.

One wrong turn along the way: the first version of the build-up test failed, and the failure looked like a bug in the game. It was not — the boil really does dip and then climb, and the test had sampled during the dip. But it did expose that the agitation smoothing was slow enough to make the knock-back mushy, so the smoothing was tightened as a result.

### Student Follow-up (REQUIRED — do NOT write "TBD" or leave blank)
Pending. The student has not seen the new build yet. The open question is whether the ramp is now strong enough, or whether the build-up should be slower and more dramatic — and whether the egg circling the pot matches what she pictured by "翻滚", or whether she meant it tumbling end over end in place.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Interaction 05 — Raw Interaction Log

**Time:** 2026-09-06
**Development Stage:** Second playtest pass on the same build-up feature
**Current Goal:** Make the ramp actually start from calm — the previous fix built the mechanic but left three hidden floors that kept it from reading as "small to big"
**Git Tag / Commit:** None — still uncommitted

### Student Prompt
"水波的晃动剧烈程度也是从小到大，声音开头还不够小" — the ripple violence should also go from small to large, and the sound isn't quiet enough at the start.

### Agent Response Summary
Found three separate hard floors, all left over from the first pass, that were quietly keeping everything at a medium starting point instead of near-zero:
1. In `game.js`, the agitation target formula was `heatCeiling × (0.40 + 0.60 × potBuild)` — even at `potBuild = 0` the water was already at 40% of its ceiling.
2. In `render.js`, the ripple wander used a fixed `1.5 +` baseline and the stroke width a fixed `2 +` baseline, so ripples were visibly moving even when agitation was 0.
3. In `audio.js`, the noise-bed gain target had a fixed `0.02 +` floor, so the pot was never truly silent.

### AI Design Assumptions (REQUIRED — do not skip)
1. **`potBuild` now eases in with a square curve** (`0.05 + 0.95 × potBuild²`) instead of linearly, so the first second of building reads as clearly calmer than the last second. Not requested explicitly, but "from small to big" implied the curve itself should feel gradual, not just the endpoints.
2. Numeric floors (0.40, 1.5, 2, 0.02) were chosen by feel, not derived from anything in the brief — they are tuning values and may still need adjustment after a real playtest.

### Development Action
Removed all three floors and confirmed the change with the test harness rather than by eye.

### Files / Mechanics Changed
- `assets/js/game.js` — agitation-target formula: floor lowered from 40% to 5%, and now eases in on a squared curve.
- `assets/js/render.js` — ripple wander amplitude and stroke width no longer have a constant baseline; both scale from zero with agitation.
- `assets/js/audio.js` — noise-bed floor gain lowered from 0.02 to 0.004.

### Immediate Result
Worked. Extended the harness with two more checks: agitation is under 0.05 the instant a fresh pot appears (after letting the old value finish decaying — see below), and it ramps smoothly through four sampled points from 0.042 to 0.550 over the following few seconds. 18 of 18 checks passing.

One test mistake along the way: the first version of the new check measured agitation only 0.05 seconds after starting a new run and got 0.2047, which looked like the fix had failed. It hadn't — `agitation` is a continuously smoothed value and does not reset between runs (only `potBuild` resets to 0), so it was still chasing down from whatever the previous test had left it at. Fixed by giving it time to settle before sampling, not by changing the game.

### Student Follow-up (REQUIRED — do NOT write "TBD" or leave blank)
Pending. The student has not played this pass yet. Still open: whether the 0.40/1.5/2/0.02 floors (now 0.05/0/0/0.004) were tuned to the right feel, and whether the earlier open question about 翻滚 — circling the pot vs. tumbling end over end — is answered by the current motion.
