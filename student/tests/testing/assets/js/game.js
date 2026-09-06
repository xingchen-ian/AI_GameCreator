/* Boil an Egg — game logic.
   The three kinds of data from the system graph are kept in three separate
   objects on purpose, so the design stays readable in the code:
     environment  = what the world hands you   (you can see it, you cannot change it)
     player       = what you control           (heat, and whether the egg is in the water)
     calculated   = what the system works out  (doneness, water, coins)
*/

(function () {
  'use strict';

  // =====================================================================
  // DESIGN CONSTANTS — these come from the brief, they are not free tuning
  // =====================================================================

  // Six levels of doneness. Within 1 level of the order still counts (brief §8).
  var DONENESS = ['', 'Raw', 'Soft-Boiled', 'Jammy', 'Medium', 'Hard-Boiled', 'Overcooked'];

  // How fast the egg cooks. THIS IS THE SAME IN BOTH PRESETS.
  // Cooking speed depends only on the heat and the size of the egg.
  var HEAT = [
    { name: 'Low',    rate: 0.45 },
    { name: 'Medium', rate: 0.85 },
    { name: 'High',   rate: 1.35 }
  ];
  var SIZE = {
    S: { name: 'Small',  mult: 1.25, chill: 0.45 },
    M: { name: 'Medium', mult: 1.00, chill: 0.60 },
    L: { name: 'Large',  mult: 0.80, chill: 0.75 }
  };

  // The two presets differ ONLY in how long customers wait and in how widely
  // the orders vary. They never touch the cooking model above.
  var PRESETS = {
    easy: { label: 'Easy', patience: [8, 12], sizes: ['M'],           desired: [2, 3, 4] },
    hard: { label: 'Hard', patience: [4, 8],  sizes: ['S', 'M', 'L'], desired: [2, 3, 4, 5] }
  };

  var ACCEPTABLE_GAP = 1;   // within one level still pays
  var COINS_EXACT = 5;
  var COINS_CLOSE = 3;
  var EVAPORATION = 0.055;  // how fast the water boils away, per unit of heat rate
  var REACTION_TIME = 1.2;  // every order must be reachable with this much slack
  var BUILD_TIME = 3.2;     // seconds to work up to a full rolling boil at High heat

  // =====================================================================
  // STATE
  // =====================================================================

  var phase = 'menu';       // menu | playing | result | gameover
  var presetKey = 'easy';

  var environment = { eggSize: 'M', desired: 3, patienceMax: 10, patienceLeft: 10 };
  var player      = { heatIndex: 1, eggInPot: false };
  var calculated  = { doneness: 1, elapsed: 0, waterLevel: 1, agitation: 0,
                      potBuild: 0, spin: 0, orbit: 0, coins: 0, served: 0 };

  var resultTimer = 0;
  var lastResult = null;
  var armed = true;         // Space must be released before a new egg goes in
  var spaceDown = false;

  // =====================================================================
  // DOM
  // =====================================================================

  var canvas   = document.getElementById('scene');
  var ctx      = canvas.getContext('2d');
  var elCoins  = document.getElementById('hud-coins');
  var elBest   = document.getElementById('hud-best');
  var elPreset = document.getElementById('hud-preset');
  var elServed = document.getElementById('hud-served');
  var overlay  = document.getElementById('overlay');
  var soundBtn = document.getElementById('btn-sound');

  var DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width  = BoilRender.W * DPR;
  canvas.height = BoilRender.H * DPR;
  ctx.scale(DPR, DPR);

  function bestKey() { return 'boil-an-egg:best:' + presetKey; }

  function readBest() {
    try { return parseInt(localStorage.getItem(bestKey()), 10) || 0; } catch (e) { return 0; }
  }

  function writeBest(v) {
    try { if (v > readBest()) localStorage.setItem(bestKey(), String(v)); } catch (e) { /* private mode */ }
  }

  function syncHud() {
    elCoins.textContent  = calculated.coins;
    elServed.textContent = calculated.served;
    elBest.textContent   = readBest();
    elPreset.textContent = PRESETS[presetKey].label;
  }

  // =====================================================================
  // RULES
  // =====================================================================

  function cookRate() { return HEAT[player.heatIndex].rate * SIZE[environment.eggSize].mult; }

  function currentLevel() { return Math.min(6, Math.max(1, Math.floor(calculated.doneness))); }

  /* Fairness check. At full heat, can this egg actually reach the level the
     customer asked for before they walk out? If not, roll a different order.
     This stops the game handing out impossible tickets — it is not a
     difficulty adjustment, the cooking speed is untouched. */
  function reachable(size, desired, patience) {
    var fastest = HEAT[HEAT.length - 1].rate * SIZE[size].mult;
    return (desired - 1) / fastest + REACTION_TIME <= patience;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function newCustomer() {
    var p = PRESETS[presetKey];
    var size, desired, patience, guard = 0;
    do {
      patience = p.patience[0] + Math.random() * (p.patience[1] - p.patience[0]);
      size = pick(p.sizes);
      desired = pick(p.desired);
      guard++;
    } while (!reachable(size, desired, patience) && guard < 300);

    environment.eggSize     = size;
    environment.desired     = desired;
    environment.patienceMax = patience;
    environment.patienceLeft = patience;

    player.eggInPot     = false;
    calculated.doneness = 1;
    calculated.elapsed  = 0;
    calculated.waterLevel = 1;
    calculated.spin     = 0;
    calculated.orbit    = 0;

    armed = !spaceDown;   // still holding Space? then they must let go first
    phase = 'playing';
    hideOverlay();
  }

  function lessonFor(level, desired, size) {
    if (level === desired) {
      return size === 'L'
        ? 'A large egg needs longer at the same boil. You read that correctly.'
        : 'You read the pot and the egg, not a clock.';
    }
    if (level < desired) {
      return size === 'L'
        ? 'Large eggs climb slower. The water looked ready, but the egg was still behind it.'
        : 'Under. Hold it in longer, or raise the heat before you start.';
    }
    return size === 'S'
      ? 'Small eggs climb fast. That rolling boil went past the order sooner than it looked.'
      : 'Over. Lift it sooner, or run a lower heat so you have time to judge.';
  }

  function serve() {
    var level = currentLevel();
    var desired = environment.desired;
    var gap = Math.abs(level - desired);

    player.eggInPot = false;
    armed = false;

    if (gap > ACCEPTABLE_GAP) {
      BoilAudio.cue('fail');
      gameOver('The egg was ' + DONENESS[level] + '.',
               'They asked for ' + DONENESS[desired] + '. Too far off, so the customer left without paying.');
      return;
    }

    var earned = gap === 0 ? COINS_EXACT : COINS_CLOSE;
    calculated.coins += earned;
    calculated.served++;
    BoilAudio.cue(gap === 0 ? 'perfect' : 'close');

    lastResult = {
      level: level, desired: desired, gap: gap, earned: earned,
      lesson: lessonFor(level, desired, environment.eggSize)
    };
    phase = 'result';
    resultTimer = 2.6;
    showResult();
    syncHud();
  }

  function gameOver(title, why) {
    phase = 'gameover';
    player.eggInPot = false;
    writeBest(calculated.coins);
    showGameOver(title, why);
    syncHud();
  }

  function startRun(key) {
    presetKey = key;
    calculated.coins = 0;
    calculated.served = 0;
    calculated.potBuild = 0;   // the pot starts cold
    player.heatIndex = 1;
    BoilRender.reset();
    BoilAudio.start();
    syncHud();
    newCustomer();
  }

  // =====================================================================
  // LOOP
  // =====================================================================

  function update(dt) {
    // The pot takes time to work up to a full rolling boil, and a cold egg
    // knocks it back. This is why the bubbles and the sound climb from small to
    // loud the longer it boils, instead of jumping straight to the dial setting.
    var heatRate = HEAT[player.heatIndex].rate;
    var buildSpeed = heatRate / HEAT[HEAT.length - 1].rate;   // low heat builds slower
    calculated.potBuild = Math.min(1, calculated.potBuild + dt * buildSpeed / BUILD_TIME);

    // The heat dial still moves the water immediately, so raising the heat
    // always feels like it did something. The build-up rides on top of it.
    var target = [0.18, 0.55, 1.0][player.heatIndex] * (0.05 + 0.95 * calculated.potBuild * calculated.potBuild);
    calculated.agitation += (target - calculated.agitation) * Math.min(1, dt * 5);

    if (phase === 'playing') {
      environment.patienceLeft -= dt;
      if (environment.patienceLeft <= 0) {
        gameOver('The customer stopped waiting.',
                 'They wanted ' + DONENESS[environment.desired] + ', but they could not wait that long.');
        return;
      }

      calculated.waterLevel = Math.max(0.42,
        calculated.waterLevel - HEAT[player.heatIndex].rate * EVAPORATION * dt);

      if (player.eggInPot) {
        calculated.doneness = Math.min(6.4, calculated.doneness + cookRate() * dt);
        calculated.elapsed += dt;
      }
    } else if (phase === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0) newCustomer();
    }

    // How the egg moves. This is the doneness signal, and it is deliberately
    // mixed with the shaking that the boil itself causes.
    //   still  ->  starts to turn around the pot  ->  turns fast and violently
    var roll = Math.max(0, Math.min(1, (calculated.doneness - 1.8) / 3.0));
    if (player.eggInPot) {
      calculated.spin  += Math.pow(roll, 1.3) * 8.5 * dt;
      calculated.orbit += Math.pow(roll, 1.15) * 3.4 * dt;
    }

    BoilAudio.update(dt, calculated.agitation, calculated.elapsed, player.eggInPot);
  }

  function view() {
    return {
      phase: phase,
      heatIndex: player.heatIndex,
      agitation: calculated.agitation,
      waterLevel: calculated.waterLevel,
      eggInPot: player.eggInPot,
      doneness: calculated.doneness,
      spin: calculated.spin,
      orbit: calculated.orbit,
      potBuild: calculated.potBuild,
      elapsed: calculated.elapsed,
      eggSize: environment.eggSize,
      desired: environment.desired,
      desiredName: DONENESS[environment.desired],
      patienceFrac: environment.patienceLeft / environment.patienceMax,
      customerVisible: phase === 'playing' || phase === 'result'
    };
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    BoilRender.draw(ctx, view(), dt);
    requestAnimationFrame(frame);
  }

  // =====================================================================
  // OVERLAYS
  // =====================================================================

  function hideOverlay() {
    overlay.hidden = true;
    overlay.innerHTML = '';
  }

  function panel(cls, html) {
    overlay.hidden = false;
    overlay.className = 'overlay ' + cls;
    overlay.innerHTML = html;
  }

  function showMenu() {
    phase = 'menu';
    panel('dim',
      '<div class="panel">' +
        '<h2>Boil an Egg</h2>' +
        '<p class="sub">Customers keep coming. There is no clock and no doneness meter — ' +
        'read the water, the wobble of the egg, and the sound of the boil.</p>' +
        '<div class="preset-row">' +
          '<button class="preset" data-preset="easy">' +
            '<span class="name">Easy</span>' +
            '<span class="desc">Patient customers. Every egg is medium. Orders stay near the middle of the ladder.</span>' +
          '</button>' +
          '<button class="preset" data-preset="hard">' +
            '<span class="name">Hard</span>' +
            '<span class="desc">Customers leave sooner. Egg size and the order both swing widely, so the same boil no longer means the same doneness.</span>' +
          '</button>' +
        '</div>' +
        '<p class="tiny">Hold <b>Space</b> to keep the egg in the water. Let go and it goes straight to the customer. ' +
        '<b>&larr; &rarr;</b> change the heat.</p>' +
      '</div>');
  }

  function showResult() {
    var r = lastResult;
    var cls = r.gap === 0 ? 'perfect' : 'close';
    var word = r.gap === 0 ? 'Exactly right' : 'Close enough';
    panel('result',
      '<div class="panel slim">' +
        '<div class="verdict ' + cls + '">' + word + '</div>' +
        '<div class="compare">' +
          '<div><span>you served</span><b>' + DONENESS[r.level] + '</b></div>' +
          '<div><span>they wanted</span><b>' + DONENESS[r.desired] + '</b></div>' +
        '</div>' +
        '<div class="earned">+' + r.earned + ' coins</div>' +
        '<div class="lesson">' + r.lesson + '</div>' +
      '</div>');
  }

  function showGameOver(title, why) {
    panel('dim',
      '<div class="panel">' +
        '<h2>' + title + '</h2>' +
        '<p class="sub">' + why + '</p>' +
        '<p><b style="font-size:30px;color:var(--amber)">' + calculated.coins + ' coins</b><br>' +
        '<span class="tiny">' + calculated.served + ' eggs served on ' + PRESETS[presetKey].label +
        ' &middot; your best here: ' + readBest() + '</span></p>' +
        '<p><button class="btn" data-action="again">Cook again</button> ' +
        '<button class="btn ghost" data-action="menu">Change difficulty</button></p>' +
      '</div>');
  }

  // One click handler for every button the overlay ever shows.
  overlay.addEventListener('click', function (e) {
    var preset = e.target.closest('[data-preset]');
    if (preset) { startRun(preset.getAttribute('data-preset')); return; }

    var action = e.target.closest('[data-action]');
    if (!action) return;
    if (action.getAttribute('data-action') === 'again') startRun(presetKey);
    else showMenu();
  });

  soundBtn.addEventListener('click', function () {
    BoilAudio.start();
    var m = BoilAudio.toggleMute();
    soundBtn.textContent = m ? 'Sound: off' : 'Sound: on';
  });

  // =====================================================================
  // INPUT
  // =====================================================================

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (spaceDown) return;          // ignore auto-repeat
      spaceDown = true;
      BoilAudio.start();
      if (phase === 'playing' && armed && !player.eggInPot) {
        player.eggInPot = true;
        // A cold egg cools the water, so the boil drops back and has to climb
        // again. A bigger egg knocks it back further.
        calculated.potBuild = Math.max(0, calculated.potBuild - SIZE[environment.eggSize].chill);
        BoilAudio.cue('plunge');
      }
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      if (phase === 'playing' || phase === 'result') {
        player.heatIndex = Math.max(0, player.heatIndex - 1);
      }
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      if (phase === 'playing' || phase === 'result') {
        player.heatIndex = Math.min(HEAT.length - 1, player.heatIndex + 1);
      }
    }
  });

  window.addEventListener('keyup', function (e) {
    if (e.code !== 'Space') return;
    spaceDown = false;
    // Letting go IS handing the egg over. There is no separate serve button.
    if (phase === 'playing' && player.eggInPot) serve();
    armed = true;
  });

  // =====================================================================
  // GO
  // =====================================================================

  syncHud();
  showMenu();
  requestAnimationFrame(frame);
})();
