# Boil an Egg

A small browser game for **Game Design from Everyday Life** (CGDD), by **Josie**.

You cook eggs for an endless queue of customers. There is no timer and no doneness meter. You
decide when the egg is ready by reading how hard the water boils, how the egg moves, and how loud
the pot has become.

**Core learning shift:** from counting time in your head or going on feeling, to observing how the
water boils, how the egg moves, and the sound of the boil.

---

## How to run it

The game is plain HTML, CSS and JavaScript. There is no build step and nothing to install.

Any static server works. From this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

Opening `index.html` straight from the file system also works, since there are no ES modules and
nothing is fetched at runtime. A server is still recommended because it matches how GitHub Pages
serves the site.

---

## Controls

| Key | What it does |
| --- | --- |
| **Space (hold)** | Keeps the egg in the water. The egg only cooks while the key is down. |
| **Space (release)** | Lifts the egg out **and hands it straight to the customer.** There is no separate serve key, so let go only when you mean it. |
| **← / →** | Lower / raise the heat. Low, Medium, High. The setting carries over to the next customer. |

Sound starts on your first key press, because browsers block audio until then. The **Sound** button
in the top bar mutes it.

---

## The rules

Six levels of doneness: **Raw · Soft-Boiled · Jammy · Medium · Hard-Boiled · Overcooked**

- Serve **exactly** the level they asked for → **5 coins**
- Serve **one level off** → **3 coins**
- Serve **two or more levels off** → the customer leaves without paying → **run over**
- The **patience bar empties** → the customer stops waiting → **run over**

Coins are never taken away. A run lasts until you fail, and your score is the coins you collected.
Your best run per difficulty is saved in your own browser's local storage.

---

## Main variables

The code keeps the three groups from the system graph in three separate objects, in
`assets/js/game.js`.

### Environment — the world hands these to you, you cannot change them

| Variable | Meaning | Visible to the player? |
| --- | --- | --- |
| `eggSize` | `S` / `M` / `L`. Changes how fast the egg cooks. | Yes — on the order ticket |
| `desired` | The doneness level the customer ordered, 1–6. | Yes — on the order ticket |
| `patienceLeft` | Seconds until this customer walks out. Starts draining when they order. | Only as a draining bar, **never as a number** |

### Player — what you control

| Variable | Meaning |
| --- | --- |
| `heatIndex` | `0` Low, `1` Medium, `2` High. |
| `eggInPot` | True while Space is held. Releasing serves the egg. |

### Calculated — what the system works out

| Variable | Meaning | Visible? |
| --- | --- | --- |
| `doneness` | Hidden value climbing 1 → 6 at `HEAT[heatIndex].rate × SIZE[eggSize].mult`. | **No.** This is the hidden number the game is about. |
| `agitation` | How hard the water boils. Follows the heat setting. | Yes — ripples, bubbles, steam, volume |
| `waterLevel` | Boils away over time, so the water line drops. | Yes |
| `coins` | Score for the run. | Yes |

### The cooking model

```
doneness += HEAT[heatIndex].rate × SIZE[eggSize].mult × dt

HEAT   Low 0.45   Medium 0.85   High 1.35     (levels per second)
SIZE   Small 1.25   Medium 1.00   Large 0.80  (multiplier)
```

**This is identical in both presets.** Difficulty never changes how fast an egg cooks.

### The two challenge presets

|  | Easy | Hard |
| --- | --- | --- |
| Customer patience | 8–12 s | 4–8 s |
| Egg sizes | Medium only | Small, Medium, Large |
| Orders | Soft-Boiled, Jammy, Medium | Soft-Boiled → Hard-Boiled |

They differ only in patience and in how widely the order varies — not in the cooking model. Short
patience pushes you onto high heat, and high heat is exactly the condition where the shaking water
hides what the egg is doing.

---

## Dependency track

**Track A — no build step.** HTML, CSS, plain JavaScript, Canvas 2D, Web Audio API.

- **No npm, no bundler, no `node_modules`.**
- **No CDN and no remote requests.** The boiling sound is synthesised in the browser rather than
  loaded as an audio file, so nothing has to be downloaded and the game works offline.
- **No external fonts.** The page uses the system rounded font stack.
- Every internal link and asset path is **relative**, because GitHub Pages serves the site from a
  repository subpath and any path starting with `/` would break there.

---

## Project structure

```
index.html                        Home: designer statement, domain knowledge, system design
game.html                         The playable game
process.html                      Human-AI development timeline
README.md                         This file
domain-learning-brief.md          The design specification
system-graph.png                  Hand-drawn system graph
assets/css/site.css               Shared styling
assets/css/game.css               Game screen styling
assets/js/game.js                 Rules, state, loop, input
assets/js/render.js               Canvas 2D drawing
assets/js/audio.js                Web Audio sound
development-log/agent-development-log.md
```

---

## Current state

First playable milestone, 6 September 2026. The complete loop and both presets work.

**Not built yet:** background music, hand-drawn character art beyond the current simple shapes, and
any playtesting with real players. The
[development process page](process.html) lists what is unverified.
