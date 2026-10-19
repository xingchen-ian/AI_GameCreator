'use strict';
/* 周六下午的数学小测 —— 原型
 * 时间单位：除特别注明外，均为「游戏分钟」(gm)。整场 60 gm。
 */

// ---------- 工具 ----------
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const now = () => performance.now();
const fmt = gm => { const s = Math.max(0, Math.round(gm * 60)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

// ---------- 常量 ----------
const TOTAL = 60;            // 考试时长
const STRESS_AT = 55;        // 最后 5 分钟进入高压
const SPEEDS = { fast: 3, std: 6, real: 60 }; // 现实秒 / 游戏分钟
const TAP_MS = 170;          // 短于此为「点」，长于此为「按住」
const SHAPES = ['▲', '●', '■', '◆', '✚'];
const INKS = ['#b8322a', '#2d5fa8', '#2f7d4f', '#c28a12'];
const DIFF_NAMES = ['易', '中', '难', '很难'];
const LETTERS = ['A', 'B', 'C', 'D'];

// ---------- 题目生成 ----------
function timeMult(d) {
  // 投入产出不可预测：同一难度耗时差异很大，难题有概率是「坑题」
  let m = clamp(Math.exp(gauss() * 0.35), 0.6, 2.2);
  if (d === 2 && Math.random() < 0.25) m *= 1.5;
  return m;
}
function baseQ(i, type, d, pts) {
  return {
    i, no: i + 1, type, diff: d, pts, mult: timeMult(d),
    read: false, everRead: false, skipped: false, reads: 0, label: null, halfEst: false,
    progress: 0, conf: 0.55, answered: false, locked: false, careless: false,
    verifyProg: 0, timeSpent: 0, insights: 0, breakthroughs: 0, flag: false, tapFails: 0, verifyFound: 0,
  };
}
function makeChoice(i, d) {
  const q = baseQ(i, 'choice', d, 5);
  q.total = [1.4, 2.4, 3.8][d] * q.mult;           // 稳健思考到完全看清所需时间
  q.verifyTotal = Math.max(0.4, q.total * 0.35);
  const h = rand(0, 360), s = rand(45, 70), l = rand(42, 60);
  q.target = { h, s, l };
  const dh = [[38, -55, 75], [14, -22, 30], [6, -9, 13]][d];
  const dl = [[0, 6, -8], [4, -5, 3], [2, -3, 4]][d];
  const opts = [{ h, s, l }];
  for (let k = 0; k < 3; k++) opts.push({ h: (h + dh[k] + 360) % 360, s: clamp(s + rand(-4, 4), 30, 85), l: clamp(l + dl[k], 25, 75) });
  const order = shuffle([0, 1, 2, 3]);
  q.options = order.map(k => opts[k]);
  q.correct = order.indexOf(0);
  q.bias = q.options.map(() => ({ h: rand(-1, 1), l: rand(-1, 1), ph: rand(0, 6.28) })); // 没看清时的「错觉」
  q.picked = null;
  return q;
}
function makeChain(i, d, pts) {
  const q = baseQ(i, 'chain', d, pts);
  q.steps = [3, 4, 5][d];
  q.total = [6, 9.5, 14][d] * q.mult;
  q.stepTotal = q.total / q.steps;
  q.verifyTotal = Math.max(0.6, q.total * 0.25);
  const sh = shuffle([...SHAPES]), co = shuffle([...INKS]);
  let shapeSeq, colorSeq;
  if (d === 0) { shapeSeq = [sh[0], sh[1]]; colorSeq = [co[0]]; }
  else if (d === 1) { shapeSeq = [sh[0], sh[1], sh[2]]; colorSeq = [co[0], co[1]]; }
  else { shapeSeq = [sh[0], sh[1], sh[2], sh[1]]; colorSeq = [co[0], co[1], co[2]]; }
  const L = [4, 6, 8][d];
  const at = k => ({ s: shapeSeq[k % shapeSeq.length], c: colorSeq[k % colorSeq.length] });
  q.given = [...Array(L)].map((_, k) => at(k));
  q.truth = [...Array(q.steps)].map((_, k) => at(L + k));
  q.shapePool = [...new Set(shapeSeq)];
  q.colorPool = [...new Set(colorSeq)];
  q.chain = [];
  makeCands(q);
  return q;
}
function makeCands(q) {
  const k = q.chain.length;
  if (k >= q.steps) { q.cands = null; return; }
  const t = q.truth[k];
  const otherColor = () => pick((q.colorPool.length > 1 ? q.colorPool : INKS).filter(c => c !== t.c));
  const otherShape = () => pick((q.shapePool.length > 1 ? q.shapePool : SHAPES).filter(s => s !== t.s));
  let a, b;
  if (q.diff === 0) { a = { s: otherShape(), c: t.c }; b = { s: pick(SHAPES.filter(s => s !== t.s && s !== a.s)), c: otherColor() }; }
  else { a = { s: t.s, c: otherColor() }; b = { s: otherShape(), c: t.c }; }
  q.cands = shuffle([{ ...t }, a, b]);
  q.candPh = q.cands.map(() => rand(0, 6.28));
}
function makeQuestions() {
  const qs = [];
  [0, 0, 0, 1, 0, 1, 1, 1, 2, 2].forEach((d, i) => {
    if (Math.random() < 0.25) d = clamp(d + (Math.random() < 0.5 ? -1 : 1), 0, 2);
    qs.push(makeChoice(i, d));
  });
  const bigD = [Math.random() < 0.5 ? 0 : 1, 1, 2, 2], bigP = [11, 12, 13, 14];
  bigD.forEach((d, i) => qs.push(makeChain(10 + i, d, bigP[i])));
  return qs; // 5×10 + 11+12+13+14 = 100
}

// ---------- 状态 ----------
let G = null;
let speedKey = 'std';
let muted = false;
try { speedKey = localStorage.getItem('quiz.speed') || 'std'; muted = localStorage.getItem('quiz.muted') === '1'; } catch (e) {}

function newGame() {
  G = {
    phase: 'play', t: 0, rsp: SPEEDS[speedKey] || 6, qs: makeQuestions(), cur: -1,
    reading: null, residue: 0, effects: [], nextEvent: rand(5, 9),
    checks: 0, switches: 0, tapFails: 0, clockUntil: 0, announced: {},
    hold: null, dirtySheet: true, dirtyWork: true, lastSheet: 0, refs: {}, stressOn: false,
  };
  $('#startScreen').classList.add('hidden');
  $('#endScreen').classList.add('hidden');
  $('#confirmScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#toasts').innerHTML = '';
  selectQ(0);
  bell(0.8, 0.06);
}
const curQ = () => (G && G.cur >= 0 ? G.qs[G.cur] : null);
const stress = () => clamp((G.t - STRESS_AT) / 0.5, 0, 1);
function addEff(kind, dur, mag) { G.effects.push({ kind, until: G.t + dur, mag }); }
function eff(kind) { return G.effects.reduce((m, e) => (e.kind === kind && e.until > G.t ? m + e.mag : m), 0); }
function solveMult() { return (1 - 0.5 * clamp(G.residue / 0.6, 0, 1)) * (1 - eff('slow')); }

// 感知难度：真实难度 + 噪声；最后 5 分钟与外部干扰会系统性抬高
function truthLevel(q) { return q.diff + Math.log2(q.mult) * 1.2 - q.insights * 0.4; }
function perceive(q, sd) { return truthLevel(q) + gauss() * sd; }
function shownLabel(q) { return q.label == null ? null : q.label + 0.6 * stress() + eff('bias'); }
function levelOf(v) { return v < 0.67 ? 0 : v < 1.5 ? 1 : v < 2.3 ? 2 : 3; }
function overallProgress(q) {
  if (q.type === 'choice') return q.progress;
  return clamp((q.chain.length + (q.chain.length < q.steps ? q.progress : 0)) / q.steps, 0, 1);
}

// ---------- 行动 ----------
function selectQ(i) {
  if (!G || G.phase !== 'play' || i === G.cur) return;
  const prev = curQ();
  releaseHold();
  if (prev) {
    G.switches++;
    const unfinished = !prev.answered && !prev.locked && (G.reading || prev.read);
    if (unfinished) {
      // 跳过：释放注意力，但留下残留；回来要重读，思路也忘掉一些
      prev.skipped = true; prev.read = false; prev.progress *= 0.8;
      G.residue = 0.6;
    } else {
      G.residue = Math.max(G.residue, 0.2);
    }
    G.reading = null;
  }
  G.cur = i;
  const q = curQ();
  if (!q.read && !q.locked) startReading(q);
  G.dirtySheet = G.dirtyWork = true;
}
function startReading(q) {
  const base = q.type === 'choice' ? 0.3 + 0.15 * q.diff : 0.8 + 0.3 * q.diff;
  const dur = base * (q.everRead ? 0.5 : 1) * (1 + 0.6 * stress()); // 高压下信息获取变慢
  G.reading = { left: dur, total: dur };
  G.dirtyWork = true;
}
function finishReading() {
  const q = curQ();
  G.reading = null;
  q.read = true; q.reads++;
  const est = perceive(q, q.everRead ? 0.45 : 0.7);
  q.label = q.label == null ? est : q.label * 0.4 + est * 0.6;
  if (q.everRead && q.insights < 1 && !q.answered && Math.random() < 0.25) {
    // 回顾已跳过的题：可能触发新思路分支
    q.insights++;
    const f = 0.65;
    q.mult *= f; q.total *= f; q.verifyTotal *= f; if (q.stepTotal) q.stepTotal *= f;
    q.label -= 0.4;
    toast(`重新读第 ${q.no} 题……好像换个角度就通了`, 'good');
  }
  q.everRead = true; q.skipped = false;
  G.dirtySheet = G.dirtyWork = true;
}
function canSolve(q) {
  return q && q.read && !G.reading && !q.locked && eff('block') <= 0 &&
    !(q.type === 'chain' && q.chain.length >= q.steps) && q.progress < 1;
}
function stepRate(q) { return 1 / (q.type === 'choice' ? q.total : q.stepTotal); }
function afterProgress(q) {
  if (!q.halfEst && overallProgress(q) >= 0.5) {
    q.halfEst = true;
    q.label = q.label * 0.4 + perceive(q, 0.3) * 0.6; // 做到一半，对难度的判断更准一些
    G.dirtySheet = true;
  }
  if (q.progress >= 1) { q.progress = 1; G.dirtyWork = true; }
}
function breakthrough(q) {
  q.progress = 1; q.conf = Math.min(1, q.conf + 0.2); q.breakthroughs++;
  toast('灵光一现！', 'good');
  afterProgress(q);
}
function steadySolve(q, dg) {
  if (!canSolve(q)) return;
  q.progress += stepRate(q) * dg * solveMult();
  q.conf += (0.88 - q.conf) * Math.min(1, dg * 0.8);
  if (q.diff >= 1 && Math.random() < dg * 0.03) return breakthrough(q);
  afterProgress(q);
}
function tapSolve(q) {
  if (!canSolve(q)) return;
  const pf = 0.012 + 0.008 * q.diff + 0.015 * stress();
  if (Math.random() < pf) {
    q.progress *= 1 - rand(0.2, 0.45);
    q.conf = Math.max(0.05, q.conf - 0.2);
    q.label += 0.3;
    q.tapFails++; G.tapFails++;
    toast('太急了，思路一乱——进度回退', 'bad');
    const b = G.refs.bar; if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
    G.dirtySheet = true;
    return;
  }
  q.progress += stepRate(q) * rand(0.5, 1.5) * (0.34 / G.rsp) * solveMult();
  q.conf = clamp(q.conf + rand(-0.035, 0.012), 0.05, 1);
  if (q.diff >= 1 && Math.random() < 0.004 * q.diff) return breakthrough(q);
  afterProgress(q);
}
function rollCareless(q) { return Math.random() < (1 - q.conf) * 0.22 + stress() * 0.05; }
function answer(k) {
  const q = curQ();
  if (!q || !q.read || G.reading || q.locked) return;
  if (eff('pen') > 0) { toast('笔没水了，写不出来……', 'event'); return; }
  if (eff('block') > 0) return;
  if (q.type === 'choice') {
    if (k >= 4) return;
    q.picked = k; q.answered = true;
    q.careless = rollCareless(q);
  } else {
    if (!q.cands || k >= q.cands.length) return;
    q.chain.push({ ...q.cands[k] });
    q.progress = 0; q.halfEst = q.halfEst && overallProgress(q) >= 0.5;
    makeCands(q);
    if (q.chain.length >= q.steps) { q.answered = true; q.careless = rollCareless(q); }
  }
  q.verifyProg = 0;
  scribble();
  G.dirtySheet = G.dirtyWork = true;
}
function canVerify(q) { return q && q.answered && !q.locked && !G.reading && eff('block') <= 0; }
function steadyVerify(q, dg) {
  if (!canVerify(q)) return;
  q.verifyProg += dg / q.verifyTotal * solveMult();
  if (q.verifyProg >= 1) finishVerify(q);
}
function tapVerify(q) {
  if (!canVerify(q)) return;
  q.verifyProg += (0.34 / G.rsp) / q.verifyTotal * solveMult();
  if (q.verifyProg >= 1) finishVerify(q);
}
function finishVerify(q) {
  // 验算只能降低错误概率，不能消除
  const msg = []; let reset = false;
  if (q.careless && Math.random() < 0.8) { q.careless = false; msg.push('发现一处笔误，已改正'); }
  if (q.type === 'choice') {
    if (q.picked !== q.correct && Math.random() < 0.35 + 0.45 * q.progress) {
      q.picked = null; q.answered = false; q.progress *= 0.6; reset = true;
      msg.push('前后对不上……这题答案作废，重新看');
    }
  } else {
    const w = q.chain.findIndex((c, k) => c.s !== q.truth[k].s || c.c !== q.truth[k].c);
    if (w >= 0 && Math.random() < 0.6) {
      q.chain = q.chain.slice(0, w); q.answered = false; q.progress = 0; q.halfEst = false; makeCands(q); reset = true;
      msg.push(`第 ${w + 1} 步推不下去，退回重做`);
    }
  }
  q.verifyProg = 0;
  releaseHold();
  if (reset) { q.conf = Math.max(0.2, q.conf - 0.25); q.verifyFound++; toast(msg.join('；'), 'bad'); }
  else { q.locked = true; q.conf = Math.max(q.conf, 0.9); toast(msg.length ? `${msg[0]}，验算通过` : '验算通过，心里踏实了一点', 'good'); }
  G.dirtySheet = G.dirtyWork = true;
}
function reread() {
  const q = curQ();
  if (!q || G.reading || q.locked) return;
  q.read = false;
  startReading(q);
}
function skip() {
  if (!G) return;
  const n = G.qs.length;
  for (let k = 1; k <= n; k++) {
    const q = G.qs[(G.cur + k) % n];
    if (!q.answered && !q.locked) return selectQ(q.i);
  }
  selectQ((G.cur + 1) % n);
}
function checkClock() {
  if (!G || G.phase !== 'play') return;
  G.checks++;
  G.clockUntil = now() + 2500;
  releaseHold();
  G.residue = Math.max(G.residue, 0.12); // 看表也会打断思路
  tick();
}
function toggleFlag() { const q = curQ(); if (q) { q.flag = !q.flag; G.dirtySheet = G.dirtyWork = true; } }

// ---------- 外部干扰 ----------
const EVENTS = [
  { text: '后排有人猛地咳嗽了几声——思路断了一下', go() { addEff('block', 0.25, 1); hit(-0.08); } },
  { text: '监考老师走到你身后，停了一会儿', go() { addEff('noise', 1.2, 1); } },
  { text: '笔没水了，得甩一甩', go() { addEff('pen', 0.5, 1); } },
  { text: '窗外开始施工，电钻声一阵一阵', go() { addEff('slow', 1.5, 0.3); } },
  { text: '有人提前交卷了，椅子拖得很响', go() { addEff('bias', 2, 0.4); hit(-0.05); } },
  { text: '风把试卷吹起一角', go() { addEff('block', 0.15, 1); } },
];
function hit(dc) { const q = curQ(); if (q) q.conf = clamp(q.conf + dc, 0.05, 1); }
function fireEvent() {
  const e = pick(EVENTS);
  e.go();
  toast(e.text, 'event');
  const w = $('#workWrap'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
  G.dirtySheet = true;
}

// ---------- 主循环 ----------
let lastTs = 0;
function frame(ts) {
  const dt = Math.min(0.5, (ts - (lastTs || ts)) / 1000);
  lastTs = ts;
  if (G && G.phase === 'play') { update(dt); render(); }
  requestAnimationFrame(frame);
}
function update(dt) {
  const dg = dt / G.rsp;
  G.t += dg;
  const q = curQ();
  if (q) q.timeSpent += dg;
  G.residue = Math.max(0, G.residue - dg);
  G.effects = G.effects.filter(e => e.until > G.t);

  if (G.reading) { G.reading.left -= dg; if (G.reading.left <= 0) finishReading(); }

  if (G.hold && now() - G.hold.down > TAP_MS) {
    G.hold.steady = true;
    if (G.hold.src === 'solve') steadySolve(q, dg); else steadyVerify(q, dg);
  }

  for (const m of [30, 15, 5]) {
    if (TOTAL - G.t <= m && !G.announced[m]) {
      G.announced[m] = true;
      toast(`监考老师：还有 ${m} 分钟。`, 'big', 3500);
      bell(0.6, 0.05);
    }
  }
  if (!G.stressOn && G.t >= STRESS_AT) { G.stressOn = true; G.dirtySheet = G.dirtyWork = true; }

  if (G.t >= G.nextEvent) {
    if (G.t > 2) fireEvent();
    G.nextEvent = G.t + (G.t >= STRESS_AT ? rand(1.5, 3) : rand(5, 9));
  }
  if (G.t >= TOTAL) endGame('time');
}

// ---------- 渲染 ----------
function estScore() {
  return Math.round(G.qs.reduce((s, q) => s + (q.answered ? q.pts * clamp(q.conf * 1.05 + (q.locked ? 0.05 : 0), 0, 1) : 0), 0));
}
function render() {
  const t = now();
  if (G.dirtySheet || t - G.lastSheet > 700) renderSheet();
  if (G.dirtyWork) renderWork();
  const q = curQ();
  const st = stress();

  document.body.style.setProperty('--sun', (G.t / TOTAL).toFixed(3));
  $('#vignette').style.opacity = st > 0 ? (0.55 + 0.45 * Math.sin(t / 1000 * 2 * Math.PI * 1.3)) * st : 0;

  const clk = $('#clockBtn');
  if (t < G.clockUntil) { clk.textContent = `剩 ${fmt(TOTAL - G.t)}`; clk.classList.add('showing'); clk.classList.toggle('late', G.t >= STRESS_AT); }
  else if (clk.classList.contains('showing')) { clk.innerHTML = '看表 <kbd>T</kbd>'; clk.classList.remove('showing', 'late'); }
  $('#est').textContent = estScore();

  const blocked = eff('block') > 0;
  $('#blockMsg').classList.toggle('on', blocked);
  $('#fog').style.opacity = clamp(G.residue / 0.6, 0, 1) * 0.8;

  $('#solvePad').classList.toggle('disabled', !canSolve(q));
  $('#verifyBtn').classList.toggle('disabled', !canVerify(q));
  $('#rereadBtn').classList.toggle('disabled', !q || !!G.reading || q.locked);
  $('#solvePad').classList.toggle('steady', !!(G.hold && G.hold.steady && G.hold.src === 'solve'));

  document.querySelectorAll('#sheet .qcard').forEach(el => {
    const qq = G.qs[+el.dataset.q];
    el.querySelector('.mini i').style.width = `${overallProgress(qq) * 100}%`;
  });

  const R = G.refs;
  if (!q) return;
  if (G.reading && R.read) {
    R.read.style.width = `${(1 - G.reading.left / G.reading.total) * 100}%`;
    return;
  }
  const noise = eff('noise');
  // 进度条：颜色 / 透明度 / 稳定性 映射信心值
  if (R.barFill) {
    const c = q.conf;
    const amp = (1 - c) * 3.5 + noise * 1.5 + st * 1.5;
    const wob = (Math.random() - 0.5) * (1 - c) * 3;
    R.barFill.style.width = `${clamp(q.progress * 100 + (q.progress > 0 ? wob : 0), 0, 100)}%`;
    R.barFill.style.background = `hsl(${8 + c * 158}, ${45 + c * 15}%, ${48 - c * 10}%)`;
    R.barFill.style.opacity = 0.35 + 0.65 * c;
    R.bar.style.transform = `translate(${(Math.random() - 0.5) * amp}px, ${(Math.random() - 0.5) * amp * 0.5}px)`;
  }
  if (R.vFill) R.vFill.style.width = `${q.verifyProg * 100}%`;
  if (R.hint) {
    let h = '';
    if (q.locked) h = '';
    else if (q.type === 'chain' && q.cands && q.progress >= 1) h = '这一步想清楚了——选一个。';
    else if (q.type === 'choice' && q.progress >= 1 && q.picked == null) h = '看得很清楚了——选一个吧。';
    else if (q.answered) h = '已作答。可以按住验算，或者去做别的题。';
    else if (G.residue > 0.05) h = '脑子里还残留着上一题……';
    if (R.hint.textContent !== h) R.hint.textContent = h;
  }
  const ts = t / 1000;
  if (q.type === 'choice' && R.sw) {
    const amp = (1 - q.progress) * 30 + (1 - q.conf) * 8 + noise * 8 + st * 6;
    const flick = 0.6 + (1 - q.conf) * 3;
    R.sw.forEach((el, k) => {
      const o = q.options[k], b = q.bias[k];
      const h = o.h + b.h * amp + Math.sin(ts * flick + b.ph) * amp * 0.35;
      const l = o.l + b.l * amp * 0.3 + Math.cos(ts * flick * 1.3 + b.ph) * amp * 0.1;
      const s = o.s * (0.55 + 0.45 * q.progress);
      el.style.background = `hsl(${h}, ${s}%, ${l}%)`;
    });
  }
  if (q.type === 'chain' && R.cands) {
    const p = q.progress;
    R.cands.forEach((el, k) => {
      const blur = (1 - p) * 7 + (1 - q.conf) * 1.2 + noise * 1.5 + st;
      const j = (1 - q.conf) * 2 + noise;
      el.style.filter = `blur(${blur.toFixed(2)}px) grayscale(${(1 - p).toFixed(2)})`;
      el.style.opacity = 0.45 + 0.55 * p;
      el.style.transform = `translate(${Math.sin(ts * 3 + q.candPh[k]) * j}px, ${Math.cos(ts * 2.3 + q.candPh[k]) * j}px)`;
    });
  }
}
function renderSheet() {
  G.lastSheet = now();
  G.dirtySheet = false;
  $('#sheet .cards').innerHTML = G.qs.map(q => {
    const lab = shownLabel(q);
    const lv = lab == null ? null : levelOf(lab);
    const st = q.locked ? '✓ 已验算' : q.answered ? '已作答' : q.skipped ? '跳过' : q.everRead ? '在做' : '未读';
    const cls = ['qcard', q.i === G.cur && 'cur', q.answered && 'answered', q.locked && 'locked',
      q.skipped && !q.answered && 'skipped', q.flag && 'flag', lv != null && `lab${lv}`].filter(Boolean).join(' ');
    return `<button class="${cls}" data-q="${q.i}" aria-label="第 ${q.no} 题"><span class="no">${q.no}</span>` +
      `<span class="meta">${q.type === 'choice' ? '' : '大题 '}${q.pts}分</span>` +
      `<span class="lab">${lv == null ? '?' : DIFF_NAMES[lv]}</span><span class="mini"><i></i></span><span class="st">${st}</span></button>`;
  }).join('');
}
function glyph(it, cls = 'glyph') { return `<span class="${cls}" style="color:${it.c}">${it.s}</span>`; }
function renderWork() {
  G.dirtyWork = false;
  const q = curQ(), w = $('#work');
  G.refs = {};
  if (!q) { w.innerHTML = '<p class="prompt">从左边选一道题。</p>'; return; }
  const lab = shownLabel(q);
  const head = `<div class="qhead"><h2>第 ${q.no} 题</h2><span class="tag">${q.type === 'choice' ? '选择题' : '大题'} · ${q.pts} 分</span>` +
    `<span class="perc">感觉难度 <b>${lab == null ? '还没读' : DIFF_NAMES[levelOf(lab)]}</b></span>` +
    `<button class="ghost flagBtn ${q.flag ? 'on' : ''}" data-act="flag">${q.flag ? '◯ 已圈' : '圈起来，待会儿回来'}</button></div>`;

  if (G.reading) {
    const n = q.type === 'choice' ? 3 : 5;
    w.innerHTML = head + `<div class="reading"><p>${q.everRead ? '重新读题……' : '读题中……'}</p><div class="lines">` +
      [...Array(n)].map(() => `<span style="width:${rand(45, 95)}%"></span>`).join('') +
      `</div><div class="readBar"><i></i></div></div>`;
    G.refs.read = w.querySelector('.readBar i');
    return;
  }
  let body = '';
  if (q.type === 'choice') {
    body = `<p class="prompt">找出与题干色块完全一致的选项。</p><div class="choice">` +
      `<div class="targetBox"><div class="swatch" style="background:hsl(${q.target.h},${q.target.s}%,${q.target.l}%)"></div><small>题干</small></div>` +
      `<div class="opts">` + q.options.map((_, k) =>
        `<button class="opt ${q.picked === k ? 'picked' : ''}" data-k="${k}" ${q.locked ? 'disabled' : ''}><span class="sw"></span><b>${LETTERS[k]}</b></button>`).join('') +
      `</div></div>`;
  } else {
    let chain = '';
    for (let k = 0; k < q.steps; k++) {
      if (k > 0) chain += `<span class="link ${k <= q.chain.length ? 'done' : ''}"></span>`;
      if (k < q.chain.length) chain += glyph(q.chain[k], 'node done');
      else if (k === q.chain.length) chain += `<span class="node now">?</span>`;
      else chain += `<span class="node"></span>`;
    }
    body = `<p class="prompt">观察规律，一步一步推出后面 ${q.steps} 项。每一步都对，才得分。</p>` +
      `<div class="given">${q.given.map(it => glyph(it)).join('')}</div>` +
      `<div class="chain">${chain}</div>` +
      (q.cands ? `<div class="cands">${q.cands.map((it, k) => `<button class="cand" data-k="${k}"><span style="color:${it.c}">${it.s}</span></button>`).join('')}</div>` : '');
  }
  const barLabel = q.type === 'chain' ? (q.chain.length < q.steps ? `第 ${q.chain.length + 1} / ${q.steps} 步` : '推完了') : '想清楚的程度';
  body += `<div class="barBlock"><div class="barLabel"><span>${barLabel}</span><span>${q.locked ? '' : (q.answered ? '验算进度 ↓' : '')}</span></div>` +
    `<div class="bar"><i></i></div>` + (q.answered && !q.locked ? `<div class="vbar"><i></i></div>` : '') +
    (q.locked ? `<span class="stampSmall">已验算</span>` : '') + `<div class="hint"></div></div>`;
  w.innerHTML = head + body;
  G.refs.bar = w.querySelector('.bar');
  G.refs.barFill = w.querySelector('.bar i');
  G.refs.vFill = w.querySelector('.vbar i');
  G.refs.hint = w.querySelector('.hint');
  G.refs.sw = [...w.querySelectorAll('.opt .sw')];
  G.refs.cands = [...w.querySelectorAll('.cand span')];
}

// ---------- 提示 ----------
function toast(text, kind = '', ms = 2600) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  const box = $('#toasts');
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 450);
}

// ---------- 声音 ----------
let AC = null;
function ac() { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} return AC; }
function tone(f, len, vol, type = 'sine', delay = 0) {
  if (muted) return; const a = ac(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + len + 0.05);
}
function bell(len = 2.5, vol = 0.08) { [880, 1318, 1760].forEach((f, i) => tone(f, len, vol / (i + 1))); }
function schoolBell() { for (let k = 0; k < 24; k++) tone(1050, 0.07, 0.05, 'square', k * 0.09); }
function tick() { tone(2200, 0.03, 0.04, 'square'); tone(1800, 0.03, 0.03, 'square', 0.25); }
function scribble() { tone(rand(300, 500), 0.05, 0.02, 'sawtooth'); }

// ---------- 结束与结算 ----------
function isCorrect(q) {
  if (!q.answered || q.careless) return false;
  if (q.type === 'choice') return q.picked === q.correct;
  return q.chain.every((c, k) => c.s === q.truth[k].s && c.c === q.truth[k].c);
}
function grade(s) { return s >= 90 ? '优秀' : s >= 75 ? '良好' : s >= 60 ? '及格' : '不及格'; }
function endGame(reason) {
  if (G.phase !== 'play') return;
  releaseHold();
  G.phase = 'end';
  const est = estScore();
  const score = G.qs.reduce((s, q) => s + (isCorrect(q) ? q.pts : 0), 0);
  reason === 'time' ? schoolBell() : bell(1.5, 0.06);
  $('#endReason').textContent = reason === 'time' ? '铃响了——停笔。' : `你提前交卷了（还剩大约 ${Math.ceil(TOTAL - G.t)} 分钟）。`;
  $('#finalScore').textContent = score;
  $('#gradeStamp').textContent = grade(score);

  // 遗憾与权衡的复盘
  const refl = [];
  refl.push(`交卷时你估自己 ${est} 分，实际 ${score} 分。`);
  const sunk = G.qs.filter(q => !isCorrect(q) && q.timeSpent >= 3).sort((a, b) => b.timeSpent - a.timeSpent)[0];
  if (sunk) refl.push(`你在第 ${sunk.no} 题上花了 ${Math.round(sunk.timeSpent)} 分钟，最后 0 分。`);
  const lockedWrong = G.qs.filter(q => q.locked && !isCorrect(q));
  if (lockedWrong.length) refl.push(`第 ${lockedWrong.map(q => q.no).join('、')} 题验算过了，还是错的——验算只能降低错误率。`);
  const missedEasy = G.qs.filter(q => !q.everRead && q.timeSpent < 0.05 && truthLevel(q) < 0.8);
  if (missedEasy.length) refl.push(`第 ${missedEasy.map(q => q.no).join('、')} 题其实不难，但你没来得及看。`);
  const wrongNoVerify = G.qs.filter(q => q.answered && !q.locked && !isCorrect(q));
  if (wrongNoVerify.length) refl.push(`第 ${wrongNoVerify.map(q => q.no).join('、')} 题写了答案、没验算，错了。`);
  refl.push(`这一小时你看了 ${G.checks} 次表，切了 ${G.switches} 次题，激进失手 ${G.tapFails} 次。`);
  const best = [...G.qs].map(q => ({ q, v: q.pts / (q.total + q.verifyTotal) }))
    .sort((a, b) => b.v - a.v).slice(0, 5).map(x => x.q.no).sort((a, b) => a - b);
  refl.push(`事后看，每分钟最划算的是第 ${best.join('、')} 题。`);
  $('#reflections').innerHTML = refl.map(r => `<li>${r}</li>`).join('');

  const rows = G.qs.map(q => {
    const ok = isCorrect(q);
    const lab = q.label == null ? '—' : DIFF_NAMES[levelOf(q.label)];
    const real = DIFF_NAMES[levelOf(truthLevel(q))];
    let res;
    if (!q.answered) res = q.everRead || q.timeSpent > 0.05 ? '没做完' : '没看';
    else if (ok) res = q.locked ? '✓ 验算后对' : '✓ 对';
    else res = q.locked ? '✗ 验算后仍错' : '✗ 错';
    const regret = (!ok && q.timeSpent >= 3) || (q.locked && !ok);
    return `<tr class="${regret ? 'regret' : ''}"><td>${q.no}</td><td>${q.type === 'choice' ? '选择' : '大题'}</td><td>${q.pts}</td>` +
      `<td>${lab}</td><td>${real}</td><td>${q.timeSpent.toFixed(1)} 分</td><td class="${ok ? 'ok' : q.answered ? 'no' : ''}">${res}</td><td>${ok ? q.pts : 0}</td></tr>`;
  }).join('');
  $('#review').innerHTML = `<thead><tr><th>题</th><th>类型</th><th>分值</th><th>你觉得</th><th>实际</th><th>用时</th><th>结果</th><th>得分</th></tr></thead><tbody>${rows}</tbody>`;
  $('#confirmScreen').classList.add('hidden');
  $('#endScreen').classList.remove('hidden');
  $('#vignette').style.opacity = 0;
}

// ---------- 输入 ----------
function pressStart(src) {
  if (!G || G.phase !== 'play' || G.hold) return;
  ac();
  G.hold = { src, down: now(), steady: false };
  (src === 'solve' ? $('#solvePad') : $('#verifyBtn')).classList.add('active');
}
function pressEnd(src) {
  if (!G || !G.hold || G.hold.src !== src) return;
  const h = G.hold;
  releaseHold();
  if (!h.steady && now() - h.down < TAP_MS) (src === 'solve' ? tapSolve : tapVerify)(curQ());
}
function releaseHold() {
  if (!G) return;
  G.hold = null;
  $('#solvePad').classList.remove('active', 'steady');
  $('#verifyBtn').classList.remove('active');
}
function bindPress(el, src) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); pressStart(src); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, () => pressEnd(src)));
  el.addEventListener('contextmenu', e => e.preventDefault());
}
bindPress($('#solvePad'), 'solve');
bindPress($('#verifyBtn'), 'verify');
$('#skipBtn').addEventListener('click', skip);
$('#rereadBtn').addEventListener('click', reread);
$('#clockBtn').addEventListener('click', checkClock);
$('#sheet').addEventListener('pointerdown', e => { const c = e.target.closest('.qcard'); if (c) selectQ(+c.dataset.q); });
$('#work').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (b) return answer(+b.dataset.k);
  if (e.target.closest('[data-act="flag"]')) toggleFlag();
});
$('#submitBtn').addEventListener('click', () => { if (G && G.phase === 'play') { releaseHold(); $('#confirmScreen').classList.remove('hidden'); } });
$('#confirmNo').addEventListener('click', () => $('#confirmScreen').classList.add('hidden'));
$('#confirmYes').addEventListener('click', () => endGame('submit'));
$('#againBtn').addEventListener('click', newGame);
$('#backBtn').addEventListener('click', () => { $('#endScreen').classList.add('hidden'); $('#app').classList.add('hidden'); $('#startScreen').classList.remove('hidden'); G = null; });
$('#startBtn').addEventListener('click', () => {
  const r = document.querySelector('input[name=speed]:checked');
  speedKey = r ? r.value : 'std';
  try { localStorage.setItem('quiz.speed', speedKey); } catch (e) {}
  newGame();
});
const updMute = () => { $('#muteBtn').textContent = muted ? '声音 关' : '声音 开'; };
$('#muteBtn').addEventListener('click', () => { muted = !muted; updMute(); try { localStorage.setItem('quiz.muted', muted ? '1' : '0'); } catch (e) {} });
updMute();
{ const r = document.querySelector(`input[name=speed][value=${speedKey}]`); if (r) r.checked = true; }

document.addEventListener('keydown', e => {
  if (!G || G.phase !== 'play' || !$('#confirmScreen').classList.contains('hidden')) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); if (!e.repeat) pressStart('solve'); return; }
  if (e.repeat) return;
  if (k === 'v') pressStart('verify');
  else if (k === 's') skip();
  else if (k === 'r') reread();
  else if (k === 't') checkClock();
  else if (/^[1-4]$/.test(k)) answer(+k - 1);
  else if (/^[a-d]$/.test(k)) answer('abcd'.indexOf(k));
});
document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); pressEnd('solve'); }
  else if (k === 'v') pressEnd('verify');
});
window.addEventListener('blur', releaseHold);

// 调试入口（试玩时可在控制台使用）
window.__quiz = { get G() { return G; }, isCorrect, skipTo(t) { if (G) G.t = t; } };

requestAnimationFrame(frame);
