'use strict';
(() => {
// ================= 画布与缩放 =================
const W = 960, H = 600, TAU = Math.PI * 2;
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
const wrap = document.getElementById('wrap');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
cvs.width = W * DPR; cvs.height = H * DPR;
function fit() { wrap.style.fontSize = (wrap.clientWidth / W * 16) + 'px'; }
addEventListener('resize', fit); fit();

// ================= 规则常量 =================
const CAP = 3;              // 每个瓶子容量（份）
const COLS = 6, ROWS = 4;   // 空白区域网格
const GX = 60, GY = 30, CW = 140, CH = 110;
const GROW = 1.6;           // 生长动画时长（秒）
const SPEED = 230;          // 精灵飞行速度
const RANGE = 62;           // 采集距离
const COOL = 1.6;           // 颜色源恢复时间
const PORTAL = { x: 890, y: 190 };

// ================= 工具 =================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const shade = (c, k) => k >= 0 ? c.map(v => v + (255 - v) * k) : c.map(v => v * (1 + k));
const mixRGB = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const easeOutBack = t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function rng(seed) {
  return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hsl(c) {
  const [r, g, b] = c.map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = d / (1 - Math.abs(2 * l - 1));
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, l];
}
// 颜色 → 色系，决定长出什么
function classify(c) {
  const [h, s, l] = hsl(c);
  if (s < 0.1 || l > 0.9 || l < 0.12) return l > 0.75 ? 'light' : l < 0.3 ? 'dark' : 'gray';
  if (h >= 12 && h < 48 && l < 0.42) return 'brown';
  if (h < 12 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 165) return 'green';
  if (h < 250) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}
function circle(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function ellipse(x, y, rx, ry, fill, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// ================= 声音（WebAudio 合成） =================
let actx = null, muted = false;
function tone(f, dur = .3, type = 'sine', vol = .12, when = 0) {
  if (!actx || muted) return;
  const t = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + .05);
}
const PENTA = [523, 587, 659, 784, 880, 1047, 1175];
const sfx = {
  collect(c) { const n = PENTA[Math.floor(hsl(c)[0] / 360 * PENTA.length) % PENTA.length]; tone(n, .35, 'triangle', .13); tone(n * 2, .25, 'sine', .04, .06); },
  full() { tone(262, .25, 'sine', .08); tone(247, .3, 'sine', .07, .12); },
  grow(row) { const base = [784, 659, 523, 440][row]; [1, 1.25, 1.5, 2].forEach((m, i) => tone(base * m, .5, 'sine', .07, i * .09)); },
  portal() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .4, 'triangle', .06, i * .05)); },
  end() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, .8, 'sine', .07, i * .14)); },
};

// ================= 公园里的颜色源 =================
const SOURCES = [
  { id: 'tulip',     name: '郁金香红', hex: '#e2474b', x: 110, y: 240, top: 40 },
  { id: 'sakura',    name: '樱花粉',   hex: '#f4a6c3', x: 360, y: 215, top: 115 },
  { id: 'fountain',  name: '喷泉青',   hex: '#4fc6c8', x: 565, y: 255, top: 75 },
  { id: 'ginkgo',    name: '银杏黄',   hex: '#f3cb3f', x: 735, y: 225, top: 115 },
  { id: 'pond',      name: '湖水蓝',   hex: '#3f88d8', x: 225, y: 360, top: 30, range: 105, flat: true },
  { id: 'lawn',      name: '草地绿',   hex: '#5bae4e', x: 560, y: 410, top: 30, flat: true },
  { id: 'lavender',  name: '薰衣草紫', hex: '#9768cf', x: 390, y: 445, top: 40 },
  { id: 'persimmon', name: '柿子橙',   hex: '#f0832e', x: 860, y: 375, top: 105 },
  { id: 'bench',     name: '长椅棕',   hex: '#8b5a38', x: 705, y: 450, top: 40 },
  { id: 'dove',      name: '白鸽白',   hex: '#f5f3ec', x: 95,  y: 445, top: 28 },
  { id: 'stone',     name: '石子灰',   hex: '#8f9499', x: 255, y: 470, top: 18, flat: true },
];
const SRC = {};
SOURCES.forEach(s => { s.rgb = hex2rgb(s.hex); s.cool = 0; SRC[s.id] = s; });

// ================= 空白区域会长出什么 =================
const KIND = [
  { red: 'sunset', orange: 'sun', yellow: 'sun', green: 'aurora', blue: 'birds', purple: 'moon', pink: 'sunset', light: 'cloud', gray: 'raincloud', dark: 'night', brown: 'kite' },
  { red: 'maple', orange: 'ginkgo', yellow: 'ginkgo', green: 'oak', blue: 'mountains', purple: 'wisteria', pink: 'sakura', light: 'house', gray: 'tower', dark: 'pine', brown: 'cabin' },
  { red: 'rosebush', orange: 'sunflowers', yellow: 'sunflowers', green: 'bush', blue: 'stream', purple: 'lavender', pink: 'rosebush', light: 'fence', gray: 'rocks', dark: 'pine', brown: 'fence' },
  { red: 'tulips', orange: 'pumpkins', yellow: 'dandelions', green: 'grass', blue: 'pond', purple: 'violets', pink: 'daisies', light: 'daisies', gray: 'pebbles', dark: 'mushrooms', brown: 'stump' },
];
const NAME = {
  sunset: '晚霞', sun: '太阳', aurora: '极光', birds: '飞鸟', moon: '月亮', cloud: '白云', raincloud: '雨云', night: '星空', kite: '风筝',
  maple: '枫树', ginkgo: '银杏树', oak: '大树', mountains: '远山', wisteria: '紫藤', sakura: '樱花树', house: '小白屋', tower: '钟楼', pine: '松树', cabin: '小木屋',
  rosebush: '花丛', sunflowers: '向日葵', bush: '灌木丛', stream: '小溪', lavender: '薰衣草', fence: '篱笆', rocks: '岩石',
  tulips: '郁金香', pumpkins: '南瓜', dandelions: '蒲公英', grass: '青草地', pond: '池塘', violets: '紫罗兰', daisies: '小雏菊', pebbles: '鹅卵石', mushrooms: '蘑菇', stump: '树桩',
};
const ROWSCALE = [1, 1, .92, .85];

// ================= 状态 =================
const S = { mode: 'title', t: 0 };
const newBottle = () => ({ units: 0, log: [0, 0, 0], color: null, parts: [] });
const EPS = 8;
// 混色：按份数加权的几何平均（近似颜料的减色混合，蓝+黄≈绿）
function mixed(b, c) {
  const n = b.units + 1;
  const log = b.log.map((v, i) => v + Math.log(c[i] + EPS));
  return { log, units: n, color: log.map(v => Math.exp(v / n) - EPS) };
}
function reset() {
  S.bottles = [0, 1, 2].map(newBottle);
  S.sel = 0;
  S.cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) S.cells.push({ r, c, filled: false });
  S.player = { x: 820, y: 240, tx: null, ty: null, pending: null, face: -1 };
  SOURCES.forEach(s => s.cool = 0);
  S.particles = []; S.floats = [];
  S.stats = { collected: 0, injected: 0, mixed: 0, used: new Set(), trips: 0 };
  S.endAt = 0; S.hover = null;
}
reset();

// ================= DOM / HUD =================
const $ = id => document.getElementById(id);
const bottleEls = [];
for (let i = 0; i < 3; i++) {
  const el = document.createElement('button');
  el.className = 'bottle';
  el.innerHTML = `<kbd>${i + 1}</kbd><div class="glass"><div class="liquid"></div></div><div class="parts"></div><div class="lbl"></div>`;
  el.addEventListener('click', () => { selectBottle(i); el.blur(); });
  $('bottles').appendChild(el);
  bottleEls.push(el);
}
document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => b.blur()));

function refreshHUD() {
  S.bottles.forEach((b, i) => {
    const el = bottleEls[i];
    el.classList.toggle('sel', i === S.sel);
    const liq = el.querySelector('.liquid');
    liq.style.height = (b.units / CAP * 100) + '%';
    liq.style.backgroundColor = b.color ? css(b.color) : 'transparent';
    el.querySelector('.lbl').textContent = !b.units ? '空瓶' : (b.parts.length > 1 ? `混色·${b.parts.length}` : '纯色') + ` ${b.units}/${CAP}`;
    el.querySelector('.parts').innerHTML = b.parts.map(id => `<i style="background:${SRC[id].hex}" title="${SRC[id].name}"></i>`).join('');
  });
  const filled = S.cells.filter(c => c.filled).length;
  $('counter').textContent = `已生长 ${filled} / ${S.cells.length}`;
  $('btnGo').textContent = S.mode === 'park' ? '前往精灵空间 →' : '← 回公园采色';
  $('btnFinish').classList.toggle('hidden', S.mode !== 'space' || filled === 0);
}
function pulse(i) { const el = bottleEls[i]; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
let toastTimer = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200); }
let lastHint = null;
function updateHint() {
  let h = '';
  const anyColor = S.bottles.some(b => b.units);
  const filled = S.cells.filter(c => c.filled).length;
  if (S.mode === 'park') {
    if (S.stats.collected === 0) h = '靠近闪光的颜色，按 空格（或点击它）采进选中的瓶子';
    else if (S.stats.collected < 3) h = '按 1 / 2 / 3 换瓶子 · 同一个瓶子里的颜色会互相染色';
    else if (anyColor && S.stats.injected === 0) h = '颜色装好了？飞进右上角的精灵之门';
    else if (!anyColor && filled < S.cells.length) h = '继续采集颜色吧';
  } else if (S.mode === 'space') {
    if (!anyColor && filled < S.cells.length) h = filled ? '瓶子空了 · 回公园再采些颜色，或点「完成画作」' : '瓶子空了 · 先回公园采色';
    else if (S.stats.injected === 0) h = '选择瓶子，点击任意一格空白，注入一份颜色';
    else if (S.stats.injected < 4) h = '新的颜色只能紧挨着已长出的景物生长';
  }
  if (h !== lastHint) { lastHint = h; $('hint').textContent = h; $('hint').classList.toggle('hidden', !h); }
}

// ================= 状态切换 =================
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function start() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
  if (actx && actx.state === 'suspended') actx.resume();
  reset();
  S.mode = 'park';
  show('title', false); show('end', false); show('hud', true);
  lastHint = null; refreshHUD();
}
function goSpace() {
  S.mode = 'space'; S.stats.trips++;
  S.player.tx = null; S.player.pending = null;
  sfx.portal(); refreshHUD();
  if (!S.bottles[S.sel].units) { const i = S.bottles.findIndex(b => b.units); if (i >= 0) selectBottle(i); }
}
function goPark() {
  S.mode = 'park';
  Object.assign(S.player, { x: 820, y: 240, tx: null, ty: null, pending: null, face: -1 });
  sfx.portal(); refreshHUD();
}
function finish() {
  if (S.bottles.some(b => b.units)) { toast('瓶子里还有颜色，先把它们种下吧'); return; }
  S.endAt = S.t; // 等生长完成后结束
}
function endGame() {
  S.mode = 'end';
  show('hud', false); show('hint', false); lastHint = null;
  const st = S.stats, filled = S.cells.filter(c => c.filled).length;
  const kinds = new Set(S.cells.filter(c => c.filled).map(c => c.kind)).size;
  $('stats').innerHTML = `长出 <b>${filled}</b> 处景物（${kinds} 种），用了 <b>${st.used.size}</b> 种公园里的颜色，其中 <b>${st.mixed}</b> 次注入的是混色。往返公园 ${st.trips} 次。`;
  show('end', true);
  sfx.end();
}
function selectBottle(i) { S.sel = i; refreshHUD(); }

$('btnStart').onclick = start;
$('btnRestart').onclick = start;
$('btnGo').onclick = () => S.mode === 'park' ? goSpace() : goPark();
$('btnFinish').onclick = finish;
$('btnMute').onclick = () => { muted = !muted; $('btnMute').classList.toggle('off', muted); };
$('btnSave').onclick = () => { const a = document.createElement('a'); a.download = '采色精灵-我的世界.png'; a.href = cvs.toDataURL('image/png'); a.click(); };

// ================= 输入 =================
const keys = new Set();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (e.repeat && k === ' ') return;
  keys.add(k);
  if (S.mode === 'title' && (k === 'enter' || k === ' ')) start();
  else if (S.mode === 'end' && k === 'enter') start();
  else if (S.mode === 'park' || S.mode === 'space') {
    if (['1', '2', '3'].includes(k)) selectBottle(+k - 1);
    if (S.mode === 'park' && (k === ' ' || k === 'e')) tryCollect();
  }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
function toWorld(e) { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
cvs.addEventListener('pointerdown', e => {
  const p = toWorld(e);
  if (S.mode === 'park') {
    const s = SOURCES.find(s => Math.hypot(p.x - s.x, p.y - (s.y - s.top / 2)) < Math.max(40, s.top / 2 + 10) || (s.range && Math.hypot((p.x - s.x) / 1.1, (p.y - s.y) * 2) < 110));
    const P = S.player;
    if (s) {
      if (dist(P, s) < (s.range || RANGE)) collectFrom(s);
      else { P.tx = s.x; P.ty = s.y - 10; P.pending = s; }
    } else { P.tx = p.x; P.ty = p.y; P.pending = null; }
  } else if (S.mode === 'space') onSpaceClick(p.x, p.y);
});
cvs.addEventListener('pointermove', e => { const p = toWorld(e); S.hover = S.mode === 'space' ? cellAt(p.x, p.y) : null; });

// ================= 公园：移动与采集 =================
const dist = (P, s) => Math.hypot(P.x - s.x, P.y - (s.y - 10));
function nearest() {
  let best = null, bd = Infinity;
  for (const s of SOURCES) { const d = dist(S.player, s); if (d < (s.range || RANGE) && d < bd) { bd = d; best = s; } }
  return best;
}
function tryCollect() { const s = nearest(); if (s) collectFrom(s); }
function collectFrom(s) {
  if (s.cool > 0) { toast('这里的颜色正在慢慢恢复…'); return; }
  const b = S.bottles[S.sel];
  if (b.units >= CAP) { toast(`${S.sel + 1} 号瓶满了 · 按 1 / 2 / 3 换一个瓶子`); sfx.full(); return; }
  Object.assign(b, mixed(b, s.rgb));
  if (!b.parts.includes(s.id)) b.parts.push(s.id);
  s.cool = COOL;
  S.stats.collected++;
  for (let i = 0; i < 10; i++) S.particles.push({ kind: 'orb', x: s.x + (Math.random() - .5) * 40, y: s.y - s.top / 2 + (Math.random() - .5) * 30, c: s.rgb, life: 0, max: .5 + Math.random() * .3, delay: i * .03 });
  sfx.collect(s.rgb);
  refreshHUD(); pulse(S.sel);
}
function updatePark(dt) {
  const P = S.player;
  let dx = 0, dy = 0;
  if (keys.has('arrowleft') || keys.has('a')) dx--;
  if (keys.has('arrowright') || keys.has('d')) dx++;
  if (keys.has('arrowup') || keys.has('w')) dy--;
  if (keys.has('arrowdown') || keys.has('s')) dy++;
  if (dx || dy) {
    P.tx = null; P.pending = null;
    const m = Math.hypot(dx, dy); P.x += dx / m * SPEED * dt; P.y += dy / m * SPEED * dt;
    if (dx) P.face = Math.sign(dx);
  } else if (P.tx != null) {
    const vx = P.tx - P.x, vy = P.ty - P.y, d = Math.hypot(vx, vy);
    const stop = P.pending ? 36 : 3;
    if (d <= stop) {
      P.tx = null;
      if (P.pending) { collectFrom(P.pending); P.pending = null; }
    } else {
      const step = Math.min(d - stop + .1, SPEED * dt);
      P.x += vx / d * step; P.y += vy / d * step;
      if (Math.abs(vx) > 1) P.face = Math.sign(vx);
    }
  }
  P.x = clamp(P.x, 20, 940); P.y = clamp(P.y, 150, 488);
  SOURCES.forEach(s => s.cool = Math.max(0, s.cool - dt));
  if (Math.hypot(P.x - PORTAL.x, P.y - PORTAL.y) < 30) goSpace();
}

// ================= 精灵空间：注入与生长 =================
function cellAt(x, y) {
  const c = Math.floor((x - GX) / CW), r = Math.floor((y - GY) / CH);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  return S.cells[r * COLS + c];
}
function isValid(cell) {
  if (cell.filled) return false;
  if (!S.cells.some(c => c.filled)) return true;
  return [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => {
    const r = cell.r + dr, c = cell.c + dc;
    return r >= 0 && r < ROWS && c >= 0 && c < COLS && S.cells[r * COLS + c].filled;
  });
}
function onSpaceClick(x, y) {
  const cell = cellAt(x, y);
  if (!cell || cell.filled) return;
  const b = S.bottles[S.sel];
  if (!b.units) {
    const o = S.bottles.findIndex(bb => bb.units);
    toast(o >= 0 ? `${S.sel + 1} 号瓶是空的 · 按 ${o + 1} 选择有颜色的瓶子` : '瓶子都空了 · 回公园采集颜色吧');
    return;
  }
  if (!isValid(cell)) { toast('新的生长要紧挨着已经长出的景物'); return; }
  inject(cell, b);
}
function inject(cell, b) {
  Object.assign(cell, {
    filled: true, color: b.color.slice(), parts: b.parts.slice(), mixed: b.parts.length > 1,
    seed: Math.random() * 1e9 | 0, t0: S.t,
  });
  cell.cat = classify(cell.color);
  cell.kind = KIND[cell.r][cell.cat];
  b.units--;
  if (!b.units) Object.assign(b, newBottle());
  S.stats.injected++;
  if (cell.mixed) S.stats.mixed++;
  cell.parts.forEach(id => S.stats.used.add(id));
  const cx = GX + cell.c * CW + CW / 2, cy = GY + cell.r * CH + CH / 2;
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * TAU, v = 40 + Math.random() * 110;
    S.particles.push({ kind: 'spark', x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: cell.color, life: 0, max: .6 + Math.random() * .6 });
  }
  S.floats.push({ x: cx, y: cy - 30, text: NAME[cell.kind] + (cell.mixed ? ' ✦' : ''), t0: S.t + .5, c: cell.color });
  sfx.grow(cell.r);
  if (!b.units) { const o = S.bottles.findIndex(bb => bb.units); if (o >= 0) S.sel = o; }
  refreshHUD();
  if (S.cells.every(c => c.filled)) S.endAt = S.t;
}
function updateSpace() {
  if (S.endAt && S.cells.every(c => !c.filled || S.t - c.t0 > GROW + .6) && S.t - S.endAt > .8) endGame();
}

// ================= 绘制：公园 =================
const parkBG = document.createElement('canvas');
function buildPark() {
  parkBG.width = W * DPR; parkBG.height = H * DPR;
  const g = parkBG.getContext('2d'); g.scale(DPR, DPR);
  const r = rng(7);
  let gr = g.createLinearGradient(0, 0, 0, 140);
  gr.addColorStop(0, '#bfe0f5'); gr.addColorStop(1, '#f7efdf');
  g.fillStyle = gr; g.fillRect(0, 0, W, 140);
  // 城市天际线
  for (let x = -10; x < W; x += 30 + r() * 30) {
    const w = 26 + r() * 34, h = 30 + r() * 70;
    g.fillStyle = r() > .5 ? '#b9c6d6' : '#aab8ca';
    g.fillRect(x, 140 - h, w, h);
    g.fillStyle = 'rgba(255,255,240,.55)';
    for (let wy = 140 - h + 6; wy < 132; wy += 10) for (let wx = x + 5; wx < x + w - 6; wx += 9) if (r() > .45) g.fillRect(wx, wy, 4, 5);
  }
  // 远处树影
  for (let x = 0; x < W; x += 22) { g.fillStyle = r() > .5 ? '#8ebf78' : '#9cc985'; g.beginPath(); g.arc(x + r() * 10, 140, 14 + r() * 10, 0, TAU); g.fill(); }
  gr = g.createLinearGradient(0, 135, 0, H);
  gr.addColorStop(0, '#b8db92'); gr.addColorStop(1, '#93c672');
  g.fillStyle = gr; g.fillRect(0, 138, W, H);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(80,140,60,${.06 + r() * .08})`; g.beginPath(); g.ellipse(r() * W, 150 + r() * 450, 10 + r() * 30, 3 + r() * 6, 0, 0, TAU); g.fill(); }
  // 小路
  const path = () => { g.beginPath(); g.moveTo(-20, 300); g.bezierCurveTo(160, 270, 330, 300, 480, 320); g.bezierCurveTo(640, 340, 780, 260, PORTAL.x, PORTAL.y + 10); g.moveTo(480, 320); g.bezierCurveTo(470, 420, 520, 500, 500, 640); };
  g.lineCap = 'round';
  path(); g.strokeStyle = '#d8c59a'; g.lineWidth = 42; g.stroke();
  path(); g.strokeStyle = '#efe3c3'; g.lineWidth = 34; g.stroke();
}
buildPark();

const PARK_DRAW = {
  tulip(s, t) {
    ellipse(s.x, s.y, 50, 12, '#8d6a4b');
    for (let i = 0; i < 7; i++) {
      const x = s.x - 36 + i * 12, h = 24 + (i % 3) * 6, sw = Math.sin(t * 2 + i) * 1.5;
      ctx.strokeStyle = '#4f8a3c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, s.y - 2); ctx.lineTo(x + sw, s.y - h); ctx.stroke();
      ellipse(x - 4, s.y - 8, 5, 2, '#5d9a48', -.6);
      ctx.fillStyle = s.hex; ctx.beginPath(); ctx.moveTo(x + sw - 6, s.y - h - 10); ctx.lineTo(x + sw - 3, s.y - h - 5); ctx.lineTo(x + sw, s.y - h - 11); ctx.lineTo(x + sw + 3, s.y - h - 5); ctx.lineTo(x + sw + 6, s.y - h - 10); ctx.arc(x + sw, s.y - h - 5, 6, 0, Math.PI); ctx.fill();
    }
  },
  sakura(s, t) { tree(s.x, s.y, s.rgb, t, 'blossom'); },
  ginkgo(s, t) { tree(s.x, s.y, s.rgb, t, 'ginkgo'); },
  persimmon(s, t) {
    ctx.fillStyle = '#7a5438'; ctx.fillRect(s.x - 6, s.y - 55, 12, 55);
    [[0, -80, 34], [-26, -66, 24], [26, -66, 24], [0, -100, 24]].forEach(([dx, dy, rr]) => circle(s.x + dx, s.y + dy, rr, '#6f9e4f'));
    [[-18, -70], [10, -86], [22, -62], [-6, -96], [-28, -58], [4, -62]].forEach(([dx, dy]) => { circle(s.x + dx, s.y + dy, 6, s.hex); circle(s.x + dx - 2, s.y + dy - 2, 2, 'rgba(255,255,255,.5)'); });
  },
  fountain(s, t) {
    ellipse(s.x, s.y, 48, 15, '#c3c7cf'); ellipse(s.x, s.y - 3, 42, 11, s.hex);
    ctx.fillStyle = '#cfd3da'; ctx.fillRect(s.x - 5, s.y - 42, 10, 40); ellipse(s.x, s.y - 42, 16, 5, '#d8dbe1');
    ctx.strokeStyle = css(s.rgb, .8); ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const dir = i < 3 ? -1 : 1, k = (i % 3) + 1, ph = (t * 1.5 + i * .3) % 1;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - 46);
      ctx.quadraticCurveTo(s.x + dir * 10 * k, s.y - 72 - k * 4, s.x + dir * 13 * k, s.y - 6); ctx.stroke();
      circle(s.x + dir * 13 * k * ph, s.y - 46 - Math.sin(ph * Math.PI) * 22 + ph * 40, 2, css(s.rgb));
    }
  },
  pond(s, t) {
    ellipse(s.x, s.y, 108, 48, '#7fb06a'); ellipse(s.x, s.y, 100, 42, s.hex);
    ellipse(s.x - 20, s.y - 12, 60, 14, 'rgba(255,255,255,.15)');
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) { const ph = (t * .4 + i * .5) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(s.x + 25, s.y + 8, 8 + ph * 30, 3 + ph * 10, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ellipse(s.x - 50, s.y + 12, 11, 6, '#6aa457'); ellipse(s.x - 34, s.y + 20, 8, 4, '#6aa457'); circle(s.x - 50, s.y + 10, 3, '#f7b3c8');
    ctx.strokeStyle = '#5c8c45'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const x = s.x + 80 + i * 5; ctx.beginPath(); ctx.moveTo(x, s.y + 10); ctx.quadraticCurveTo(x + 3, s.y - 10, x + Math.sin(t + i) * 3, s.y - 24 - i * 2); ctx.stroke(); }
  },
  lawn(s, t) {
    ellipse(s.x, s.y, 62, 16, '#79c062');
    ctx.strokeStyle = s.hex; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) { const x = s.x - 52 + i * 5, h = 10 + (i * 7 % 13); ctx.beginPath(); ctx.moveTo(x, s.y + 4); ctx.quadraticCurveTo(x + 2, s.y - h / 2, x + Math.sin(t * 2 + i) * 3 + 2, s.y - h); ctx.stroke(); }
    [[-30, -4], [18, -2], [40, 2]].forEach(([dx, dy]) => [0, 1, 2].forEach(k => circle(s.x + dx + Math.cos(k * 2.1) * 3.5, s.y + dy + Math.sin(k * 2.1) * 3.5, 3.5, '#4a9a3e')));
  },
  lavender(s, t) {
    ellipse(s.x, s.y, 52, 11, '#7aa35f');
    for (let i = 0; i < 13; i++) {
      const x = s.x - 44 + i * 7.3, h = 26 + (i * 5 % 11), sw = Math.sin(t * 1.6 + i * .7) * 2;
      ctx.strokeStyle = '#5e8a4a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, s.y); ctx.lineTo(x + sw, s.y - h); ctx.stroke();
      for (let k = 0; k < 5; k++) ellipse(x + sw * (1 - k * .1), s.y - h + k * 4, 2.6, 3.2, k % 2 ? s.hex : '#b08ae0');
    }
  },
  bench(s) {
    ctx.fillStyle = '#5b4a3c'; ctx.fillRect(s.x - 36, s.y - 16, 4, 16); ctx.fillRect(s.x + 32, s.y - 16, 4, 16);
    ctx.fillStyle = s.hex;
    ctx.fillRect(s.x - 42, s.y - 20, 84, 6);
    ctx.fillRect(s.x - 42, s.y - 32, 84, 5); ctx.fillRect(s.x - 42, s.y - 41, 84, 5);
    ctx.fillStyle = '#5b4a3c'; ctx.fillRect(s.x - 38, s.y - 42, 3, 24); ctx.fillRect(s.x + 35, s.y - 42, 3, 24);
  },
  dove(s, t) {
    [[0, 0, 1], [26, 6, -1]].forEach(([dx, dy, f], i) => {
      const peck = Math.max(0, Math.sin(t * 3 + i * 2)) * 5;
      const x = s.x + dx, y = s.y + dy;
      ellipse(x, y + 2, 12, 3, 'rgba(0,0,0,.12)');
      ellipse(x, y - 9, 12, 8, s.hex);
      ellipse(x - f * 4, y - 10, 7, 4, '#dedbd2', f * .3);
      circle(x + f * 10, y - 15 + peck, 5, s.hex);
      circle(x + f * 12, y - 16 + peck, 1.2, '#333');
      ctx.fillStyle = '#e9a24f'; ctx.beginPath(); ctx.moveTo(x + f * 14, y - 16 + peck); ctx.lineTo(x + f * 19, y - 14 + peck); ctx.lineTo(x + f * 14, y - 13 + peck); ctx.fill();
    });
  },
  stone(s) {
    [[-22, 0, 11, 6], [-4, 3, 8, 5], [12, -1, 13, 7], [28, 4, 7, 4], [-34, 5, 6, 3]].forEach(([dx, dy, rx, ry], i) => {
      ellipse(s.x + dx, s.y + dy, rx, ry, i % 2 ? '#a3a8ad' : s.hex);
      ellipse(s.x + dx - rx * .3, s.y + dy - ry * .4, rx * .4, ry * .3, 'rgba(255,255,255,.35)');
    });
  },
};
function tree(x, y, c, t, type) {
  ctx.fillStyle = '#7a5438'; ctx.fillRect(x - 6, y - 58, 12, 58);
  ctx.strokeStyle = '#7a5438'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x - 18, y - 62); ctx.moveTo(x, y - 46); ctx.lineTo(x + 16, y - 66); ctx.stroke();
  if (type === 'blossom') {
    [[0, -84, 34], [-28, -72, 26], [28, -72, 26], [-12, -104, 24], [14, -102, 24]].forEach(([dx, dy, r], i) => circle(x + dx, y + dy, r, css(shade(c, i % 2 ? .1 : -.05))));
    for (let i = 0; i < 6; i++) { const ph = (t * .25 + i / 6) % 1; circle(x - 40 + i * 16 + Math.sin(t + i) * 6, y - 70 + ph * 72, 2.4, css(shade(c, .3), 1 - ph)); }
  } else {
    [[0, -110, 16], [-14, -94, 20], [14, -94, 20], [-26, -74, 22], [0, -78, 26], [26, -74, 22]].forEach(([dx, dy, r], i) => circle(x + dx, y + dy, r, css(shade(c, i % 2 ? .15 : -.08))));
    [[-30, 6], [-14, 3], [20, 5], [34, 2]].forEach(([dx, dy]) => ellipse(x + dx, y + dy, 4, 2, css(c)));
  }
}
function sparkleStar(x, y, r, c, a) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a; ctx.fillStyle = c;
  ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r * .3, 0); ctx.quadraticCurveTo(0, 0, 0, r); } ctx.fill();
  ctx.restore();
}
function drawPortal(t) {
  const { x, y } = PORTAL;
  ellipse(x, y + 22, 34, 8, 'rgba(90,60,140,.18)');
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `hsla(${(t * 60 + i * 120) % 360},80%,75%,.85)`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(x, y, 24 + i * 4 + Math.sin(t * 3 + i) * 2, 32 + i * 4, 0, 0, TAU); ctx.stroke();
  }
  const gr = ctx.createRadialGradient(x, y, 2, x, y, 26); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(220,200,255,.2)');
  ellipse(x, y, 22, 30, gr);
  for (let i = 0; i < 5; i++) { const a = t * 1.2 + i * TAU / 5; sparkleStar(x + Math.cos(a) * 42, y + Math.sin(a) * 46, 4, '#fff', .5 + .5 * Math.sin(t * 4 + i)); }
  ctx.fillStyle = '#6b4fa0'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('精灵之门', x, y + 50);
}
function drawSprite(x, y, t, tint) {
  const bob = Math.sin(t * 4) * 3;
  ellipse(x, y + 20, 13, 4, 'rgba(40,60,30,.18)');
  y += bob - 8;
  const gl = ctx.createRadialGradient(x, y, 4, x, y, 34);
  gl.addColorStop(0, css(tint, .55)); gl.addColorStop(1, css(tint, 0));
  circle(x, y, 34, gl);
  const f = Math.sin(t * 16) * .35;
  [-1, 1].forEach(side => { ctx.save(); ctx.translate(x, y - 2); ctx.scale(side, 1); ctx.rotate(-.5 + f); ellipse(13, -4, 12, 6, 'rgba(255,255,255,.75)'); ellipse(10, 4, 8, 4, 'rgba(255,255,255,.6)', .4); ctx.restore(); });
  const bd = ctx.createRadialGradient(x - 3, y - 4, 2, x, y, 13);
  bd.addColorStop(0, '#fff'); bd.addColorStop(1, css(shade(tint, .35)));
  circle(x, y, 12, bd);
  const fx = S.player.face * 2;
  circle(x - 4 + fx, y - 1, 1.8, '#3a3350'); circle(x + 4 + fx, y - 1, 1.8, '#3a3350');
  circle(x - 7 + fx, y + 3, 2.2, 'rgba(255,150,170,.6)'); circle(x + 7 + fx, y + 3, 2.2, 'rgba(255,150,170,.6)');
  ctx.strokeStyle = '#d9c8f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.quadraticCurveTo(x + 4, y - 20, x + 2, y - 24); ctx.stroke();
  sparkleStar(x + 2, y - 25, 4, '#ffe58a', 1);
}
function drawPrompt(s) {
  const b = S.bottles[S.sel];
  const bx = clamp(s.x, 100, W - 100), by = Math.max(56, s.y - s.top - 30);
  ctx.save();
  ctx.shadowColor = 'rgba(40,30,80,.2)'; ctx.shadowBlur = 8;
  rrect(bx - 92, by - 30, 184, 52, 14); ctx.fillStyle = 'rgba(255,252,246,.95)'; ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#3a3350'; ctx.textAlign = 'center'; ctx.font = '600 12px sans-serif';
  if (s.cool > 0) { ctx.fillText(`${s.name} · 恢复中…`, bx, by - 2); return; }
  if (b.units >= CAP) { ctx.fillText(`${S.sel + 1} 号瓶满了`, bx, by - 10); ctx.font = '11px sans-serif'; ctx.fillText('按 1 / 2 / 3 换一个瓶子', bx, by + 10); return; }
  ctx.fillText(`${s.name}  ·  空格 采进 ${S.sel + 1} 号瓶`, bx, by - 12);
  // 混色预览：瓶中 + 新色 = 结果
  const sy = by + 7, res = mixed(b, s.rgb).color;
  if (b.units) circle(bx - 50, sy, 9, css(b.color));
  else { ctx.setLineDash([3, 3]); ctx.strokeStyle = '#a99fc0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx - 50, sy, 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  ctx.fillStyle = '#7d7396'; ctx.font = '13px sans-serif'; ctx.fillText('+', bx - 25, sy + 4); ctx.fillText('=', bx + 25, sy + 4);
  circle(bx, sy, 9, s.hex); circle(bx + 50, sy, 10, css(res));
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; [bx - 50, bx, bx + 50].forEach(x => { ctx.beginPath(); ctx.arc(x, sy, 9.5, 0, TAU); ctx.stroke(); });
}
function drawPark(withPlayer) {
  const t = S.t;
  ctx.drawImage(parkBG, 0, 0, W, H);
  drawPortal(t);
  const near = withPlayer ? nearest() : null;
  const items = SOURCES.map(s => ({ y: s.flat ? -1 : s.y, d: () => drawSource(s, t, s === near) }));
  if (withPlayer) items.push({ y: S.player.y + 12, d: () => drawSprite(S.player.x, S.player.y, t, S.bottles[S.sel].color || [255, 240, 200]) });
  items.sort((a, b) => a.y - b.y).forEach(i => i.d());
  if (near) drawPrompt(near);
}
function drawSource(s, t, isNear) {
  const cy = s.y - s.top / 2;
  if (isNear && !s.cool) { const g = ctx.createRadialGradient(s.x, cy, 4, s.x, cy, s.top / 2 + 50); g.addColorStop(0, css(s.rgb, .35)); g.addColorStop(1, css(s.rgb, 0)); circle(s.x, cy, s.top / 2 + 50, g); }
  ctx.save();
  if (s.cool > 0) ctx.globalAlpha = .55;
  PARK_DRAW[s.id](s, t);
  ctx.restore();
  if (s.cool > 0) {
    ctx.strokeStyle = css(s.rgb); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y - s.top - 10, 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - s.cool / COOL)); ctx.stroke();
  } else {
    for (let i = 0; i < 3; i++) {
      const a = t * .9 + i * TAU / 3 + s.x;
      sparkleStar(s.x + Math.cos(a) * (s.top / 2 + 22), cy + Math.sin(a) * (s.top / 2 + 6), 4.5, s.id === 'dove' ? '#fff8c0' : css(shade(s.rgb, .45)), .55 + .45 * Math.sin(t * 3 + i * 2));
    }
  }
}

// ================= 绘制：精灵空间 =================
const ACCENT_DEFAULT = c => shade(c, .55);
const STEM = [86, 146, 72];
const DRAW = {
  // —— 天空 ——
  sun(c) {
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 62); g.addColorStop(0, css(shade(c, .4), .8)); g.addColorStop(1, css(c, 0)); circle(0, 0, 62, g);
    ctx.save(); ctx.rotate(S.t * .2); ctx.strokeStyle = css(c, .9); ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(44, 0); ctx.stroke(); }
    ctx.restore(); circle(0, 0, 26, css(c)); circle(-6, -6, 13, css(shade(c, .35)));
  },
  sunset(c, r, a) { circle(0, 26, 22, css(a)); cloudShape(-24, -6, 1, css(shade(c, .5))); cloudShape(28, 12, .8, css(shade(c, .2))); },
  cloud(c) { const d = Math.sin(S.t * .5) * 6; cloudShape(-14 + d, -8, 1.25, css(shade(c, .7))); cloudShape(30 - d, 16, .8, css(shade(c, .5))); },
  raincloud(c) {
    ctx.strokeStyle = css(shade(c, -.1), .7); ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const ph = (S.t * 1.4 + i * .37) % 1; const x = -30 + i * 10; ctx.beginPath(); ctx.moveTo(x - ph * 4, 10 + ph * 34); ctx.lineTo(x - ph * 4 - 3, 18 + ph * 34); ctx.stroke(); }
    cloudShape(0, -6, 1.2, css(c));
  },
  birds(c, r) {
    cloudShape(26, 14, .7, css(shade(c, .8)));
    ctx.strokeStyle = css(shade(c, -.55)); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x = -40 + i * 22 + Math.sin(S.t + i) * 4, y = -18 + (i % 2) * 14, f = Math.sin(S.t * 6 + i) * 4;
      ctx.beginPath(); ctx.moveTo(x - 9, y - f); ctx.quadraticCurveTo(x - 4, y - 4, x, y); ctx.quadraticCurveTo(x + 4, y - 4, x + 9, y - f); ctx.stroke();
    }
  },
  aurora(c) {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = css(shade(c, i * .2), .55 - i * .1); ctx.lineWidth = 12 - i * 3;
      ctx.beginPath();
      for (let x = -70; x <= 70; x += 7) { const y = -20 + i * 16 + Math.sin(x * .05 + S.t + i) * 9; x === -70 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
  },
  moon(c, r) {
    stars(r, shade(c, .85), 9);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 44); g.addColorStop(0, css(shade(c, .7), .5)); g.addColorStop(1, css(c, 0)); circle(0, 0, 44, g);
    circle(0, 0, 22, css(shade(c, .75)));
    circle(-7, -5, 4, css(shade(c, .5))); circle(6, 6, 5, css(shade(c, .55))); circle(8, -8, 2.5, css(shade(c, .5)));
  },
  night(c, r) { stars(r, shade(c, .9), 18); sparkleStar(18, -14, 7, css(shade(c, .95)), .9); },
  kite(c) {
    const s = Math.sin(S.t) * .15;
    ctx.save(); ctx.rotate(s);
    ctx.strokeStyle = 'rgba(80,60,40,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 24); ctx.quadraticCurveTo(-30, 40, -60, 55); ctx.stroke();
    ctx.fillStyle = css(c); ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(20, 0); ctx.lineTo(0, 24); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = css(shade(c, .35)); ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(20, 0); ctx.lineTo(0, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(-20, 0); ctx.lineTo(0, 0); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = css(shade(c, .4)); const x = -8 - i * 10, y = 30 + i * 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y - 4); ctx.lineTo(x - 5, y + 4); ctx.fill(); }
    ctx.restore();
  },
  // —— 远景 ——
  oak(c, r) { trunk(); [[0, -96, 26], [-26, -78, 26], [26, -78, 26], [-12, -62, 24], [14, -64, 24], [0, -78, 28]].forEach(([x, y, rr], i) => circle(x, y, rr, css(shade(c, i === 5 ? .12 : (i % 2 ? -.12 : 0))))); circle(-10, -92, 8, css(shade(c, .3))); },
  maple(c, r, a) { DRAW.oak(c, r); for (let i = 0; i < 8; i++) circle(-30 + r() * 60, -100 + r() * 50, 3.5, css(shade(c, -.25))); fallen(c, r); },
  ginkgo(c, r) {
    trunk();
    [[0, -116, 14], [-14, -100, 18], [14, -100, 18], [-24, -80, 22], [0, -84, 24], [24, -80, 22], [-12, -64, 18], [12, -64, 18]].forEach(([x, y, rr], i) => circle(x, y, rr, css(shade(c, i % 3 === 0 ? .2 : i % 3 === 1 ? 0 : -.1))));
    fallen(c, r);
  },
  sakura(c, r) {
    trunk();
    [[0, -88, 30], [-28, -74, 24], [28, -74, 24], [-12, -106, 22], [14, -104, 22]].forEach(([x, y, rr], i) => circle(x, y, rr, css(shade(c, i % 2 ? .2 : 0))));
    for (let i = 0; i < 12; i++) circle(-34 + r() * 68, -118 + r() * 60, 3, css(shade(c, .65)));
    for (let i = 0; i < 4; i++) { const ph = (S.t * .3 + i / 4) % 1; circle(-40 + i * 26, -60 + ph * 60, 2.4, css(shade(c, .4), 1 - ph)); }
  },
  wisteria(c, r) {
    trunk();
    [[0, -100, 26], [-30, -92, 20], [30, -92, 20]].forEach(([x, y, rr]) => circle(x, y, rr, css(mixRGB(c, STEM, .55))));
    for (let i = 0; i < 9; i++) {
      const x = -40 + i * 10, len = 22 + r() * 22, sw = Math.sin(S.t * 1.3 + i) * 2;
      for (let k = 0; k < 6; k++) { const t = k / 6; circle(x + sw * t, -90 + t * len, 4.5 - t * 2.5, css(shade(c, t * .5))); }
    }
  },
  mountains(c) {
    ctx.fillStyle = css(shade(c, .35)); ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(-30, -70); ctx.lineTo(10, 0); ctx.fill();
    ctx.fillStyle = css(c); ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(18, -92); ctx.lineTo(78, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(18, -92); ctx.lineTo(32, -70); ctx.lineTo(22, -74); ctx.lineTo(12, -66); ctx.lineTo(5, -72); ctx.fill();
  },
  house(c, r, a) {
    ctx.fillStyle = css(c); ctx.fillRect(-34, -56, 68, 56);
    ctx.fillStyle = css(S.curMixed ? a : shade(c, -.45)); ctx.beginPath(); ctx.moveTo(-44, -54); ctx.lineTo(0, -92); ctx.lineTo(44, -54); ctx.fill();
    ctx.fillStyle = css(shade(c, -.35)); ctx.fillRect(-9, -30, 18, 30);
    ctx.fillStyle = '#ffe79a'; ctx.fillRect(-28, -44, 13, 12); ctx.fillRect(15, -44, 13, 12);
    ctx.fillStyle = css(shade(c, -.25)); ctx.fillRect(18, -86, 10, 20);
  },
  tower(c, r, a) {
    ctx.fillStyle = css(c); ctx.fillRect(-18, -100, 36, 100);
    ctx.fillStyle = css(shade(c, -.3)); ctx.beginPath(); ctx.moveTo(-24, -98); ctx.lineTo(0, -128); ctx.lineTo(24, -98); ctx.fill();
    circle(0, -78, 11, '#fbf7ee'); ctx.strokeStyle = '#3a3350'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(0, -85); ctx.moveTo(0, -78); ctx.lineTo(5, -76); ctx.stroke();
    ctx.fillStyle = '#ffe79a'; for (let y = -56; y < -10; y += 16) ctx.fillRect(-6, y, 12, 9);
  },
  cabin(c) {
    ctx.fillStyle = css(c); ctx.fillRect(-36, -48, 72, 48);
    ctx.strokeStyle = css(shade(c, -.25)); ctx.lineWidth = 1.5; for (let y = -40; y < 0; y += 8) { ctx.beginPath(); ctx.moveTo(-36, y); ctx.lineTo(36, y); ctx.stroke(); }
    ctx.fillStyle = css(shade(c, -.4)); ctx.beginPath(); ctx.moveTo(-46, -46); ctx.lineTo(0, -82); ctx.lineTo(46, -46); ctx.fill();
    ctx.fillStyle = '#ffd77a'; ctx.fillRect(-24, -34, 14, 14); ctx.fillStyle = css(shade(c, -.5)); ctx.fillRect(8, -30, 16, 30);
    circle(-28, -96 - Math.sin(S.t) * 3, 5, 'rgba(255,255,255,.5)');
  },
  pine(c) {
    ctx.fillStyle = '#6b4a34'; ctx.fillRect(-4, -18, 8, 18);
    [[-14, 0], [-34, 1], [-54, 2]].forEach(([y], i) => { ctx.fillStyle = css(shade(c, i * .12)); ctx.beginPath(); ctx.moveTo(-30 + i * 6, y - 10); ctx.lineTo(0, y - 52 - i * 2); ctx.lineTo(30 - i * 6, y - 10); ctx.fill(); });
    ctx.fillStyle = css(shade(c, .15)); ctx.save(); ctx.translate(36, 0); ctx.scale(.6, .6);
    [[-14], [-34], [-54]].forEach(([y], i) => { ctx.beginPath(); ctx.moveTo(-30 + i * 6, y - 10); ctx.lineTo(0, y - 52); ctx.lineTo(30 - i * 6, y - 10); ctx.fill(); });
    ctx.restore();
  },
  // —— 中景 ——
  bush(c, r) { [[-30, -18, 20], [0, -26, 26], [30, -18, 20], [-14, -12, 16], [16, -12, 16]].forEach(([x, y, rr], i) => circle(x, y, rr, css(shade(c, i % 2 ? .15 : -.05)))); for (let i = 0; i < 5; i++) circle(-30 + r() * 60, -36 + r() * 24, 2.5, css(shade(c, .45))); },
  rosebush(c, r, a) {
    DRAW.bush(mixRGB(c, STEM, .7), r);
    for (let i = 0; i < 9; i++) { const x = -38 + r() * 76, y = -40 + r() * 32; circle(x, y, 6, css(c)); circle(x, y, 2.5, css(a)); }
  },
  sunflowers(c, r, a) {
    for (let i = 0; i < 3; i++) {
      const x = -30 + i * 30, h = 60 + (i === 1 ? 20 : 0) + r() * 10, sw = Math.sin(S.t + i) * 2;
      ctx.strokeStyle = css(STEM); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sw, -h); ctx.stroke();
      ellipse(x + 7, -h * .45, 8, 4, css(STEM), -.5);
      for (let k = 0; k < 12; k++) { const ang = k / 12 * TAU; ellipse(x + sw + Math.cos(ang) * 10, -h + Math.sin(ang) * 10, 6, 3, css(shade(c, k % 2 ? .15 : 0)), ang); }
      circle(x + sw, -h, 7, S.curMixed ? css(a) : '#7a4f2a');
    }
  },
  stream(c) {
    ctx.fillStyle = css(c); ctx.beginPath(); ctx.moveTo(-72, -26);
    ctx.bezierCurveTo(-30, -40, 20, -10, 72, -24); ctx.lineTo(72, -6); ctx.bezierCurveTo(20, 6, -30, -24, -72, -8); ctx.fill();
    ctx.strokeStyle = css(shade(c, .55), .8); ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const ph = (S.t * .5 + i / 3) % 1, x = -60 + ph * 120; ctx.beginPath(); ctx.moveTo(x, -18); ctx.lineTo(x + 12, -19); ctx.stroke(); }
    [[-50, -2], [42, -32], [58, -4]].forEach(([x, y]) => ellipse(x, y, 7, 4, '#a8a69c'));
  },
  lavender(c, r) {
    for (let i = 0; i < 12; i++) {
      const x = -48 + i * 8.5, h = 46 + r() * 20, sw = Math.sin(S.t * 1.4 + i * .6) * 2.5;
      ctx.strokeStyle = css(STEM); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sw, -h); ctx.stroke();
      for (let k = 0; k < 6; k++) ellipse(x + sw, -h + k * 4.5, 2.8, 3.4, css(shade(c, k % 2 ? .25 : 0)));
    }
  },
  fence(c, r) {
    DRAW.grass(STEM, r, null, .5);
    ctx.fillStyle = css(c);
    ctx.fillRect(-64, -30, 128, 5); ctx.fillRect(-64, -16, 128, 5);
    for (let x = -60; x <= 60; x += 20) { ctx.beginPath(); ctx.moveTo(x - 5, 0); ctx.lineTo(x - 5, -38); ctx.lineTo(x, -45); ctx.lineTo(x + 5, -38); ctx.lineTo(x + 5, 0); ctx.fill(); }
  },
  rocks(c, r) {
    [[-30, -12, 24, 15], [10, -18, 30, 20], [40, -8, 16, 10]].forEach(([x, y, rx, ry], i) => {
      ellipse(x, y, rx, ry, css(shade(c, i === 1 ? 0 : -.12)));
      ellipse(x - rx * .25, y - ry * .35, rx * .45, ry * .3, css(shade(c, .35)));
    });
    ctx.strokeStyle = css(STEM); ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const x = -50 + i * 34; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 2, -9); ctx.stroke(); }
  },
  // —— 近景 ——
  grass(c, r, a, k = 1) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 44 * k; i++) {
      const x = -64 + r() * 128, h = 14 + r() * 26, sw = Math.sin(S.t * 2 + x) * 3;
      ctx.strokeStyle = css(shade(c, r() * .3 - .25)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 2, -h / 2, x + sw + 3, -h); ctx.stroke();
    }
  },
  tulips(c, r) {
    DRAW.grass(STEM, r, null, .4);
    for (let i = 0; i < 6; i++) {
      const x = -50 + i * 20, h = 26 + r() * 16, sw = Math.sin(S.t * 1.5 + i) * 2;
      ctx.strokeStyle = css(STEM); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sw, -h); ctx.stroke();
      ellipse(x - 5, -8, 6, 2.5, css(STEM), -.6);
      ctx.fillStyle = css(shade(c, i % 2 ? .1 : 0)); ctx.beginPath(); ctx.moveTo(x + sw - 7, -h - 12); ctx.lineTo(x + sw - 3, -h - 6); ctx.lineTo(x + sw, -h - 13); ctx.lineTo(x + sw + 3, -h - 6); ctx.lineTo(x + sw + 7, -h - 12); ctx.arc(x + sw, -h - 6, 7, 0, Math.PI); ctx.fill();
    }
  },
  daisies(c, r, a) {
    DRAW.grass(STEM, r, null, .5);
    for (let i = 0; i < 7; i++) {
      const x = -54 + i * 18 + r() * 6, h = 14 + r() * 22, sw = Math.sin(S.t * 1.8 + i) * 2;
      ctx.strokeStyle = css(STEM); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sw, -h); ctx.stroke();
      for (let k = 0; k < 7; k++) { const ang = k / 7 * TAU; ellipse(x + sw + Math.cos(ang) * 5, -h + Math.sin(ang) * 5, 4, 2, css(c), ang); }
      circle(x + sw, -h, 3, css(S.curMixed ? a : [246, 196, 70]));
    }
  },
  dandelions(c, r, a) {
    DRAW.grass(STEM, r, null, .5);
    for (let i = 0; i < 6; i++) {
      const x = -50 + i * 20 + r() * 6, h = 18 + r() * 20;
      ctx.strokeStyle = css(STEM); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -h); ctx.stroke();
      if (i % 3 === 2) { for (let k = 0; k < 10; k++) { const ang = k / 10 * TAU; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x + Math.cos(ang) * 9, -h + Math.sin(ang) * 9); ctx.stroke(); } }
      else { circle(x, -h, 7, css(c)); circle(x, -h, 4, css(shade(c, -.15))); }
    }
  },
  violets(c, r, a) {
    DRAW.grass(STEM, r, null, .6);
    for (let i = 0; i < 8; i++) {
      const x = -56 + i * 16 + r() * 4, y = -8 - r() * 16;
      [0, 1, 2, 3, 4].forEach(k => { const ang = k / 5 * TAU - Math.PI / 2; ellipse(x + Math.cos(ang) * 4, y + Math.sin(ang) * 4, 3.6, 3, css(shade(c, k > 2 ? .2 : 0))); });
      circle(x, y, 1.8, css(S.curMixed ? a : [250, 220, 90]));
    }
  },
  pumpkins(c, r) {
    DRAW.grass(STEM, r, null, .4);
    [[-30, 13], [10, 18], [44, 11]].forEach(([x, rr]) => {
      for (let k = -1; k <= 1; k++) ellipse(x + k * rr * .45, -rr * .8, rr * .55, rr * .8, css(shade(c, k ? -.1 : .05)));
      ctx.fillStyle = '#5a7a3a'; ctx.fillRect(x - 2, -rr * 1.7, 4, 7);
    });
  },
  pond(c) {
    ellipse(0, -16, 62, 18, css(shade(c, -.15))); ellipse(0, -17, 56, 15, css(c));
    ellipse(-14, -22, 26, 5, css(shade(c, .4), .6));
    ctx.strokeStyle = css(shade(c, .6), .8); ctx.lineWidth = 1.2;
    const ph = (S.t * .4) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(18, -14, 6 + ph * 20, 2 + ph * 6, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    ellipse(-32, -10, 9, 4, css(STEM)); circle(-32, -12, 3, '#f7b3c8');
  },
  pebbles(c, r) { for (let i = 0; i < 9; i++) { const x = -56 + r() * 112, y = -4 - r() * 16, rx = 5 + r() * 9; ellipse(x, y, rx, rx * .6, css(shade(c, r() * .4 - .15))); ellipse(x - rx * .3, y - 2, rx * .35, rx * .2, 'rgba(255,255,255,.35)'); } },
  mushrooms(c, r, a) {
    DRAW.grass(STEM, r, null, .4);
    [[-30, 1], [6, 1.3], [38, .8]].forEach(([x, s]) => {
      ctx.fillStyle = '#f2e8d5'; ctx.fillRect(x - 4 * s, -20 * s, 8 * s, 20 * s);
      ctx.fillStyle = css(c); ctx.beginPath(); ctx.ellipse(x, -20 * s, 16 * s, 12 * s, 0, Math.PI, 0); ctx.fill();
      [[-6, -25], [4, -28], [8, -22]].forEach(([dx, dy]) => circle(x + dx * s, dy * s, 2.2 * s, css(shade(c, .7))));
    });
  },
  stump(c, r) {
    DRAW.grass(STEM, r, null, .4);
    ctx.fillStyle = css(c); ctx.fillRect(-22, -30, 44, 30); ellipse(0, -30, 22, 8, css(shade(c, .35)));
    ctx.strokeStyle = css(shade(c, -.2)); ctx.lineWidth = 1.2; [14, 9, 4].forEach(rr => { ctx.beginPath(); ctx.ellipse(0, -30, rr, rr * .36, 0, 0, TAU); ctx.stroke(); });
    ellipse(34, -6, 14, 6, css(shade(c, -.1))); ellipse(48, -6, 4, 5, css(shade(c, .3)));
  },
};
function cloudShape(x, y, s, fill) { ctx.fillStyle = fill; [[-20, 0, 16], [0, -10, 22], [22, 0, 15], [8, 4, 16]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill(); }); }
function stars(r, c, n) { for (let i = 0; i < n; i++) { const x = -64 + r() * 128, y = -48 + r() * 96; circle(x, y, .8 + r() * 1.6, css(c, .5 + .5 * Math.sin(S.t * 2 + i))); } }
function trunk() { ctx.fillStyle = '#7a5438'; ctx.fillRect(-6, -60, 12, 60); ctx.strokeStyle = '#7a5438'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(-16, -58); ctx.moveTo(0, -44); ctx.lineTo(16, -62); ctx.stroke(); }
function fallen(c, r) { for (let i = 0; i < 5; i++) ellipse(-50 + r() * 100, -2 + r() * 4, 4, 2, css(c), r() * 3); }

const washCvs = document.createElement('canvas');
washCvs.width = W * DPR; washCvs.height = H * DPR;
const wctx = washCvs.getContext('2d'); wctx.scale(DPR, DPR);
function washColor(cell) {
  const c = cell.color;
  if (cell.r === 0) return (cell.kind === 'night' || cell.kind === 'moon') ? mixRGB(c, [36, 34, 84], .55) : shade(c, .32);
  return shade(c, cell.r === 3 ? .32 : .45);
}
function drawSpace(final) {
  const t = S.t;
  let gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#3b2f6b'); gr.addColorStop(1, '#8a6fae');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const x = (i * 197 + t * 8 * (1 + i % 3)) % W, y = (i * 113 + Math.sin(t * .5 + i) * 20 + H) % H; circle(x, y, 1 + i % 3 * .6, `rgba(255,240,220,${.25 + .25 * Math.sin(t * 2 + i)})`); }
  // 纸面
  ctx.save(); ctx.shadowColor = 'rgba(20,10,40,.4)'; ctx.shadowBlur = 24;
  rrect(GX - 10, GY - 10, COLS * CW + 20, ROWS * CH + 20, 18); ctx.fillStyle = '#fbf7ee'; ctx.fill(); ctx.restore();
  // 颜色底色（模糊后像水彩晕开）
  wctx.clearRect(0, 0, W, H);
  for (const cell of S.cells) {
    if (!cell.filled) continue;
    const p = clamp((t - cell.t0) / GROW, 0, 1), a = Math.min(1, p * 1.6);
    const x = GX + cell.c * CW, y = GY + cell.r * CH, wc = washColor(cell);
    wctx.globalAlpha = a;
    if (cell.r === 0) { const g = wctx.createLinearGradient(0, y, 0, y + CH); g.addColorStop(0, css(shade(wc, -.08))); g.addColorStop(1, css(shade(wc, .25))); wctx.fillStyle = g; wctx.fillRect(x - 2, y - 2, CW + 4, CH + 4); }
    else { wctx.fillStyle = css(wc); wctx.fillRect(x - 2, y - 2, CW + 4, CH + 4); }
  }
  wctx.globalAlpha = 1;
  ctx.save(); rrect(GX - 4, GY - 4, COLS * CW + 8, ROWS * CH + 8, 14); ctx.clip();
  ctx.filter = 'blur(14px)'; ctx.drawImage(washCvs, 0, 0, W, H); ctx.filter = 'none';
  // 景物（从远到近）
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = S.cells[r * COLS + c];
    if (cell.filled) drawGrowth(cell, t);
  }
  ctx.restore();
  if (final) return;
  // 空白格
  const b = S.bottles[S.sel];
  for (const cell of S.cells) {
    if (cell.filled) continue;
    const x = GX + cell.c * CW, y = GY + cell.r * CH, ok = b.units && isValid(cell);
    if (ok) {
      const hv = S.hover === cell, pu = .5 + .5 * Math.sin(t * 3 + cell.c * .7 + cell.r);
      rrect(x + 8, y + 8, CW - 16, CH - 16, 12); ctx.fillStyle = css(b.color, hv ? .45 : .1 + pu * .12); ctx.fill();
      ctx.strokeStyle = css(shade(b.color, -.2), hv ? .9 : .5); ctx.lineWidth = hv ? 2.5 : 1.5; ctx.setLineDash([]); ctx.stroke();
      if (hv) circle(x + CW / 2, y + CH / 2, 6, css(b.color));
    } else {
      rrect(x + 8, y + 8, CW - 16, CH - 16, 12); ctx.strokeStyle = 'rgba(150,135,180,.32)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 6]); ctx.stroke(); ctx.setLineDash([]);
    }
  }
}
function drawGrowth(cell, t) {
  const p = clamp((t - cell.t0) / GROW, 0, 1);
  const e = easeOutBack(p) * ROWSCALE[cell.r];
  if (e < .01) return;
  const x = GX + cell.c * CW + CW / 2, y = cell.r === 0 ? GY + CH / 2 : GY + (cell.r + 1) * CH - 8;
  const acc = cell.mixed ? SRC[cell.parts[0]].rgb : ACCENT_DEFAULT(cell.color);
  ctx.save(); ctx.translate(x, y); ctx.scale(e, e);
  S.curMixed = cell.mixed;
  DRAW[cell.kind](cell.color, rng(cell.seed), acc);
  ctx.restore();
  // 混色长出的景物带一点闪光，并保留原色的痕迹
  if (cell.mixed && p >= 1) {
    cell.parts.forEach((id, i) => {
      const a = t * .8 + i * TAU / cell.parts.length + cell.seed;
      sparkleStar(x + Math.cos(a) * 46, (cell.r === 0 ? y : y - 45) + Math.sin(a) * 30, 4, SRC[id].hex, .5 + .5 * Math.sin(t * 3 + i));
    });
  }
}

// ================= 粒子与浮字 =================
function updateParticles(dt) {
  for (const p of S.particles) {
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.life += dt;
    if (p.kind === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .94; p.vy = p.vy * .94 - 10 * dt; }
    else { const k = Math.min(1, dt * 9); p.x += (S.player.x - p.x) * k; p.y += (S.player.y - 8 - p.y) * k; }
  }
  S.particles = S.particles.filter(p => p.life < p.max);
  S.floats = S.floats.filter(f => S.t - f.t0 < 1.8);
}
function drawParticles() {
  for (const p of S.particles) {
    if (p.delay > 0) continue;
    if (p.kind === 'orb' && S.mode !== 'park') continue;
    if (p.kind === 'spark' && S.mode !== 'space') continue;
    const a = 1 - p.life / p.max;
    if (p.kind === 'spark') sparkleStar(p.x, p.y, 5 * a + 1, css(p.c), a);
    else circle(p.x, p.y, 4 * a + 1, css(p.c, a));
  }
  if (S.mode !== 'space') return;
  for (const f of S.floats) {
    const k = S.t - f.t0; if (k < 0) continue;
    ctx.globalAlpha = clamp(1.8 - k, 0, 1) * clamp(k * 4, 0, 1);
    ctx.font = '600 14px sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,252,246,.95)'; ctx.strokeText(f.text, f.x, f.y - k * 18);
    ctx.fillStyle = css(shade(f.c, -.45)); ctx.fillText(f.text, f.x, f.y - k * 18);
    ctx.globalAlpha = 1;
  }
}

// ================= 主循环 =================
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  S.t += dt;
  if (S.mode === 'park') updatePark(dt);
  if (S.mode === 'space') updateSpace();
  updateParticles(dt);
  if (S.mode === 'park' || S.mode === 'space') updateHint();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (S.mode === 'title') drawPark(false);
  else if (S.mode === 'park') drawPark(true);
  else drawSpace(S.mode === 'end');
  drawParticles();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 调试/试玩用：在控制台 window.__game 查看状态
window.__game = S;
})();
