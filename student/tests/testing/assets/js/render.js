/* Boil an Egg — drawing.
   Canvas 2D only. The shapes are given a small, FIXED wobble so they look
   hand-drawn instead of machine-perfect. The wobble is seeded, not random per
   frame, otherwise the outlines would shiver. */

var BoilRender = (function () {
  'use strict';

  var W = 960, H = 600;

  // pot geometry
  var POT_X = 480, RIM_Y = 385, RIM_RX = 205, RIM_RY = 60, POT_BOTTOM = 512;

  var C = {
    wall:    '#FBEBD2',
    counter: '#EBD3AE',
    stove:   '#5C4A3C',
    ink:     '#4A3728',
    pot:     '#8C8FA0',
    potDark: '#6F7285',
    inner:   '#3E4152',
    water:   '#CFE3E7',
    waterHi: '#EAF4F6',
    shell:   '#FDF4E4',
    shellSh: '#E8D6BC',
    amber:   '#E8A33D',
    tomato:  '#D9613C',
    leaf:    '#7FA65C',
    paper:   '#FFFDF7',
    line:    '#E3CFAE',
    soft:    '#806A55'
  };

  var bubbles = [];
  var t = 0;

  function hash(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

  // A closed blobby ellipse whose radius wanders slightly. Seed keeps it stable.
  function roughEllipse(ctx, cx, cy, rx, ry, seed, amp, from, to) {
    var segs = 44, a0 = from === undefined ? 0 : from, a1 = to === undefined ? Math.PI * 2 : to;
    ctx.beginPath();
    for (var i = 0; i <= segs; i++) {
      var a = a0 + (a1 - a0) * (i / segs);
      var w = (hash(seed + i * 1.7) - 0.5) * 2 * (amp || 2);
      var x = cx + Math.cos(a) * (rx + w);
      var y = cy + Math.sin(a) * (ry + w * 0.5);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    if (a1 - a0 >= Math.PI * 2 - 0.001) ctx.closePath();
  }

  function roughRect(ctx, x, y, w, h, r, seed, amp) {
    amp = amp || 1.6;
    var pts = [], i;
    function edge(x1, y1, x2, y2, n, s) {
      for (i = 0; i < n; i++) {
        var k = i / n;
        pts.push([x1 + (x2 - x1) * k + (hash(s + i) - 0.5) * amp,
                  y1 + (y2 - y1) * k + (hash(s + i + 50) - 0.5) * amp]);
      }
    }
    edge(x + r, y, x + w - r, y, 8, seed);
    edge(x + w, y + r, x + w, y + h - r, 6, seed + 11);
    edge(x + w - r, y + h, x + r, y + h, 8, seed + 22);
    edge(x, y + h - r, x, y + r, 6, seed + 33);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  function ink(ctx, w) { ctx.strokeStyle = C.ink; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }

  function label(ctx, text, x, y, size, color, align, weight) {
    ctx.fillStyle = color || C.ink;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = (weight || 700) + ' ' + size + 'px ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", Quicksand, system-ui, sans-serif';
    ctx.fillText(text, x, y);
  }

  // ---------------------------------------------------------------- kitchen
  function drawRoom(ctx) {
    ctx.fillStyle = C.wall; ctx.fillRect(0, 0, W, 330);
    ctx.strokeStyle = '#F2DFC1'; ctx.lineWidth = 2;
    for (var x = 40; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 330); ctx.stroke(); }
    for (var y = 60; y < 330; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    ctx.fillStyle = C.counter; ctx.fillRect(0, 330, W, H - 330);
    ctx.beginPath(); ctx.moveTo(0, 331); ctx.lineTo(W, 331); ink(ctx, 3);

    // stove plate the pot stands on
    ctx.fillStyle = C.stove;
    roughRect(ctx, POT_X - 240, 470, 480, 92, 16, 7); ctx.fill(); ink(ctx, 3);
  }

  function drawFlame(ctx, heatIndex) {
    var tongues = [3, 6, 9][heatIndex];
    var maxH = [16, 30, 46][heatIndex];
    var spread = [70, 110, 150][heatIndex];
    for (var i = 0; i < tongues; i++) {
      var k = tongues === 1 ? 0.5 : i / (tongues - 1);
      var x = POT_X - spread + k * spread * 2;
      var flick = 0.72 + 0.28 * Math.sin(t * 9 + i * 2.1);
      var h = maxH * flick;
      ctx.beginPath();
      ctx.moveTo(x - 9, 500);
      ctx.quadraticCurveTo(x - 5, 500 - h * 0.6, x, 500 - h);
      ctx.quadraticCurveTo(x + 5, 500 - h * 0.6, x + 9, 500);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#F5C453' : C.tomato;
      ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  function drawPot(ctx, waterLevel, agitation) {
    // body
    ctx.beginPath();
    ctx.moveTo(POT_X - RIM_RX, RIM_Y);
    ctx.lineTo(POT_X - RIM_RX + 26, POT_BOTTOM);
    ctx.quadraticCurveTo(POT_X, POT_BOTTOM + 22, POT_X + RIM_RX - 26, POT_BOTTOM);
    ctx.lineTo(POT_X + RIM_RX, RIM_Y);
    ctx.closePath();
    ctx.fillStyle = C.pot; ctx.fill(); ink(ctx, 3.5);

    // handles
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.ellipse(POT_X + s * (RIM_RX + 26), RIM_Y + 26, 26, 13, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.potDark; ctx.fill(); ink(ctx, 3);
    });

    // dark inside of the pot
    roughEllipse(ctx, POT_X, RIM_Y, RIM_RX - 10, RIM_RY - 6, 3, 2);
    ctx.fillStyle = C.inner; ctx.fill();

    // WATER LEVEL — drops as the pot boils away. This is the "how long has it
    // been boiling" cue from the brief.
    var drop = (1 - waterLevel) * 72;
    var sy = RIM_Y + drop;
    var srx = (RIM_RX - 14) * (1 - (1 - waterLevel) * 0.10);
    var sry = (RIM_RY - 8) * (1 - (1 - waterLevel) * 0.10);

    roughEllipse(ctx, POT_X, sy, srx, sry, 5, 2.2);
    ctx.fillStyle = C.water; ctx.fill();

    // surface ripples get wider and faster with agitation
    ctx.save();
    roughEllipse(ctx, POT_X, sy, srx, sry, 5, 2.2); ctx.clip();
    ctx.strokeStyle = C.waterHi; ctx.lineWidth = 0.6 + agitation * 3;
    for (var r = 0; r < 4; r++) {
      var ph = t * (1.2 + agitation * 5) + r * 1.5;
      ctx.beginPath();
      for (var i = 0; i <= 30; i++) {
        var px = POT_X - srx + (2 * srx) * (i / 30);
        var py = sy - sry * 0.5 + r * sry * 0.42
               + Math.sin(i * 0.55 + ph) * (agitation * 9);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    // rim on top of everything
    roughEllipse(ctx, POT_X, RIM_Y, RIM_RX, RIM_RY, 3, 2.5);
    ink(ctx, 3.5);

    return { sy: sy, srx: srx, sry: sry };
  }

  function drawBubbles(ctx, surf, agitation, dt) {
    // spawn
    if (Math.random() < agitation * agitation * dt * 70) {
      bubbles.push({
        x: POT_X + (Math.random() - 0.5) * surf.srx * 1.6,
        y: surf.sy + surf.sry * 0.7,
        r: 2 + Math.random() * (2 + agitation * 5),
        v: 18 + Math.random() * 40 + agitation * 60,
        life: 1
      });
    }
    ctx.save();
    roughEllipse(ctx, POT_X, surf.sy, surf.srx, surf.sry, 5, 2.2); ctx.clip();
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.y -= b.v * dt;
      b.life -= dt * 1.4;
      if (b.life <= 0 || b.y < surf.sy - surf.sry) { bubbles.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + agitation * 0.4) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }

  function drawSteam(ctx, surf, agitation, elapsed, cooking) {
    var strength = agitation * (cooking ? Math.min(1, 0.45 + elapsed / 10) : 0.6);
    if (strength < 0.08) return;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.20 + strength * 0.45) + ')';
    ctx.lineWidth = 6 + strength * 6; ctx.lineCap = 'round';
    for (var s = 0; s < 3; s++) {
      var bx = POT_X - 90 + s * 90;
      ctx.beginPath();
      for (var i = 0; i <= 16; i++) {
        var k = i / 16;
        var y = surf.sy - 30 - k * (70 + strength * 90);
        var x = bx + Math.sin(t * 1.7 + k * 4 + s * 2) * (10 + k * 26 * strength);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /* The egg.
     Its MOTION comes from how cooked it is (the real signal): it sits still
     while raw, starts to turn around the pot near soft-boiled, and circles
     fast and violently by hard-boiled.
     Its SHAKE comes from how hard the water is boiling (the noise you have to
     learn to see past). A violent boil rattles a raw egg too.
     The three speckles on the shell are what make the turning readable — a
     plain oval rotating looks like a plain oval standing still. */
  function drawEgg(ctx, surf, doneness, agitation, size, inPot, spin, orbit) {
    var scale = { S: 0.84, M: 1, L: 1.18 }[size] || 1;
    var rx = 26 * scale, ry = 33 * scale;
    var x, y, tilt;

    // 0 while raw, 1 once it is turning hard. Same curve the logic uses.
    var roll = Math.max(0, Math.min(1, (doneness - 1.8) / 3.0));

    if (inPot) {
      var shake = agitation * agitation;
      // it travels around the pot, in an ellipse that matches the perspective
      var orbitR = roll * Math.min(56, surf.srx * 0.34);
      x = POT_X + Math.cos(orbit) * orbitR
              + Math.sin(t * 13.5) * shake * 9 + Math.sin(t * 7.1) * shake * 5;
      y = surf.sy + surf.sry * 0.15 + Math.sin(orbit) * orbitR * 0.34
              + Math.cos(t * 11.3) * shake * 5;
      // and it lolls further onto its side the harder it is turning
      tilt = spin + Math.sin(t * (3 + roll * 9)) * roll * 0.45;
    } else {
      x = 812; y = 455; tilt = -0.25;
    }

    // a wake in the water behind a fast-turning egg
    if (inPot && roll > 0.25) {
      ctx.save();
      roughEllipse(ctx, POT_X, surf.sy, surf.srx, surf.sry, 5, 2.2); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,' + (roll * 0.5) + ')';
      ctx.lineWidth = 2 + roll * 2;
      ctx.beginPath();
      for (var i = 0; i <= 14; i++) {
        var a = orbit - i * 0.075;
        var r = roll * Math.min(56, surf.srx * 0.34);
        var px = POT_X + Math.cos(a) * r, py = surf.sy + surf.sry * 0.15 + Math.sin(a) * r * 0.34;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt);
    roughEllipse(ctx, 0, 0, rx, ry, 9, 1.4);
    ctx.fillStyle = C.shell; ctx.fill(); ink(ctx, 3);

    // speckles — these rotate with the shell, so you can see it turning
    ctx.fillStyle = C.shellSh;
    [[0.30, -0.34, 0.15], [-0.34, 0.20, 0.12], [0.12, 0.52, 0.10]].forEach(function (d) {
      ctx.beginPath();
      ctx.ellipse(rx * d[0], ry * d[1], rx * d[2], ry * d[2] * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.beginPath();
    ctx.ellipse(-rx * 0.32, -ry * 0.34, rx * 0.30, ry * 0.22, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
    ctx.restore();

    if (!inPot) {
      label(ctx, 'the egg', 812, 512, 14, C.soft, 'center');
    }
  }

  // ---------------------------------------------------------------- customer
  function drawCustomer(ctx, view) {
    var bob = Math.sin(t * 2.2) * 3;
    var impatient = 1 - view.patienceFrac;
    var fidget = impatient > 0.55 ? Math.sin(t * (6 + impatient * 10)) * impatient * 5 : 0;
    var cx = 150 + fidget, cy = 168 + bob;

    // body
    roughEllipse(ctx, cx, cy + 96, 62, 62, 21, 2.5, Math.PI, Math.PI * 2);
    ctx.fillStyle = '#F2B8A0'; ctx.fill(); ink(ctx, 3);
    // head
    roughEllipse(ctx, cx, cy, 46, 46, 15, 2);
    ctx.fillStyle = '#FBD9BE'; ctx.fill(); ink(ctx, 3);
    // hair
    roughEllipse(ctx, cx, cy - 12, 47, 38, 17, 2, Math.PI, Math.PI * 2);
    ctx.fillStyle = '#5A4032'; ctx.fill();
    // eyes — they narrow as patience runs out
    var eyeH = 5 - impatient * 3.2;
    ctx.fillStyle = C.ink;
    [-16, 16].forEach(function (dx) {
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy + 4, 5, Math.max(1.4, eyeH), 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // mouth
    ctx.beginPath();
    if (impatient < 0.6) ctx.arc(cx, cy + 16, 11, 0.25, Math.PI - 0.25);
    else ctx.arc(cx, cy + 30, 11, Math.PI + 0.3, Math.PI * 2 - 0.3);
    ink(ctx, 2.5);
  }

  function drawTicket(ctx, view) {
    var x = 252, y = 66, w = 452, h = 140;

    // tail toward the customer
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 58); ctx.lineTo(x - 30, y + 84); ctx.lineTo(x + 6, y + 96);
    ctx.fillStyle = C.paper; ctx.fill(); ink(ctx, 3);

    roughRect(ctx, x, y, w, h, 14, 31);
    ctx.fillStyle = C.paper; ctx.fill(); ink(ctx, 3.5);

    label(ctx, 'ORDER', x + 22, y + 30, 13, C.soft, 'left');

    var sizeName = { S: 'Small egg', M: 'Medium egg', L: 'Large egg' }[view.eggSize];
    label(ctx, sizeName, x + 22, y + 62, 24, C.ink, 'left');
    label(ctx, 'cooked to', x + 22, y + 88, 15, C.soft, 'left', 600);
    label(ctx, view.desiredName, x + 132, y + 90, 26, C.tomato, 'left');

    // little egg picture matching the requested size
    var s = { S: 0.7, M: 0.88, L: 1.06 }[view.eggSize];
    ctx.save(); ctx.translate(x + w - 62, y + 62);
    roughEllipse(ctx, 0, 0, 24 * s, 30 * s, 41, 1.2);
    ctx.fillStyle = C.shell; ctx.fill(); ink(ctx, 2.5);
    ctx.restore();

    // PATIENCE — a draining bar. No numbers on purpose: the brief says time
    // has to be inferred, so this shows urgency without giving away a clock.
    var bx = x + 22, by = y + h - 32, bw = w - 44, bh = 16;
    roughRect(ctx, bx, by, bw, bh, 8, 55, 1);
    ctx.fillStyle = '#EFE2CB'; ctx.fill(); ink(ctx, 2.5);
    var f = Math.max(0, Math.min(1, view.patienceFrac));
    if (f > 0) {
      var col = f > 0.5 ? C.leaf : (f > 0.22 ? C.amber : C.tomato);
      var pulse = f < 0.22 ? 0.65 + 0.35 * Math.abs(Math.sin(t * 9)) : 1;
      ctx.save(); ctx.globalAlpha = pulse;
      roughRect(ctx, bx + 2, by + 2, Math.max(4, (bw - 4) * f), bh - 4, 6, 66, 1);
      ctx.fillStyle = col; ctx.fill();
      ctx.restore();
    }
    label(ctx, 'patience', bx, by - 6, 12, C.soft, 'left');
  }

  // ---------------------------------------------------------------- heat dial
  function drawHeatDial(ctx, heatIndex) {
    var x = 34, y = 452, w = 176, h = 118;
    roughRect(ctx, x, y, w, h, 12, 71);
    ctx.fillStyle = C.paper; ctx.fill(); ink(ctx, 3);
    label(ctx, 'HEAT', x + 16, y + 26, 13, C.soft, 'left');

    var names = ['Low', 'Medium', 'High'];
    for (var i = 0; i < 3; i++) {
      var bx = x + 16, by = y + 38 + i * 24, bw = w - 32, bh = 18;
      var on = i <= heatIndex;
      roughRect(ctx, bx, by, bw, bh, 6, 81 + i, 1.1);
      ctx.fillStyle = on ? [ '#F2D08A', C.amber, C.tomato ][i] : '#EFE2CB';
      ctx.fill(); ink(ctx, 2);
      label(ctx, names[i], bx + 9, by + 13.5, 12.5,
            i === heatIndex ? '#fff' : C.soft, 'left');
    }
  }

  // ---------------------------------------------------------------- public
  return {
    W: W, H: H,

    draw: function (ctx, view, dt) {
      t += dt;
      ctx.clearRect(0, 0, W, H);
      drawRoom(ctx);
      drawFlame(ctx, view.heatIndex);
      var surf = drawPot(ctx, view.waterLevel, view.agitation);
      drawBubbles(ctx, surf, view.agitation, dt);
      drawEgg(ctx, surf, view.doneness, view.agitation, view.eggSize, view.eggInPot, view.spin, view.orbit);
      drawSteam(ctx, surf, view.agitation, view.elapsed, view.eggInPot);
      drawHeatDial(ctx, view.heatIndex);
      if (view.customerVisible) { drawCustomer(ctx, view); drawTicket(ctx, view); }
    },

    reset: function () { bubbles.length = 0; }
  };
})();
