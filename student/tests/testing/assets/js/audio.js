/* Boil an Egg — sound.
   Everything here is generated live with the Web Audio API.
   Nothing is downloaded, so the game still works offline and on GitHub Pages. */

var BoilAudio = (function () {
  'use strict';

  var ctx = null;
  var master = null;
  var noiseSrc = null;   // the continuous "shhhh" of hot water
  var noiseGain = null;
  var noiseFilter = null;
  var muted = false;
  var started = false;
  var bubbleClock = 0;

  // Browsers only allow sound to start after the player clicks or presses a key.
  function start() {
    if (started) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);

    // Two seconds of white noise, looped forever. This is the water bed.
    var frames = ctx.sampleRate * 2;
    var buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buffer;
    noiseSrc.loop = true;

    noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 420;
    noiseFilter.Q.value = 0.9;

    noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noiseSrc.start();
    started = true;
  }

  // A single bubble: a short sine that slides upward as it pops.
  function bubble(agitation) {
    if (!started || muted) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    var base = 140 + Math.random() * 260 + agitation * 180;
    var t = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 2.1, t + 0.07);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05 + agitation * 0.07, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + 0.12);
  }

  function tone(freq, when, dur, vol, type) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain); gain.connect(master);
    osc.start(when); osc.stop(when + dur + 0.02);
  }

  return {
    start: start,

    /* Called every frame.
       agitation 0..1 = how hard the water is boiling (driven by the heat setting)
       elapsed          = seconds the egg has been in the water
       cooking          = is the egg actually in the pot right now */
    update: function (dt, agitation, elapsed, cooking) {
      if (!started) return;
      var a = Math.max(0, Math.min(1, agitation));

      // The brief says the sound climbs "from low to loud" the longer it boils.
      // The agitation passed in already builds up over time, and on top of that
      // the sound keeps opening the longer the egg has been in.
      var lift = cooking ? Math.min(1, elapsed / 9) : 0;

      // Louder as the water gets more violent, and louder again with time.
      var target = 0.004 + a * a * 0.32 + lift * 0.07;
      noiseGain.gain.value += (target - noiseGain.gain.value) * Math.min(1, dt * 6);
      var freq = 300 + a * 900 + lift * 500;
      noiseFilter.frequency.value += (freq - noiseFilter.frequency.value) * Math.min(1, dt * 4);

      // Bubbles pop more often the hotter it is.
      bubbleClock -= dt;
      if (bubbleClock <= 0) {
        if (a > 0.12) bubble(a);
        bubbleClock = 0.5 / (0.4 + a * 7) * (0.6 + Math.random() * 0.9);
      }
    },

    /* Short jingles for the moment the egg is handed over. */
    cue: function (kind) {
      if (!started || muted) return;
      var t = ctx.currentTime;
      if (kind === 'perfect') {
        tone(784, t, 0.16, 0.16); tone(988, t + 0.09, 0.16, 0.16); tone(1319, t + 0.18, 0.30, 0.15);
      } else if (kind === 'close') {
        tone(659, t, 0.16, 0.14); tone(784, t + 0.10, 0.26, 0.13);
      } else if (kind === 'fail') {
        tone(330, t, 0.22, 0.14, 'sawtooth'); tone(220, t + 0.15, 0.42, 0.12, 'sawtooth');
      } else if (kind === 'plunge') {
        bubble(0.9); bubble(0.7);
      }
    },

    toggleMute: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.9;
      return muted;
    },
    isMuted: function () { return muted; }
  };
})();
