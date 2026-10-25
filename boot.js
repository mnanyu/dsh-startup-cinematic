/* ============================================================================
 * DEEPSEEK HARNESS — BOOT SEQUENCE
 * A dependency-free, canvas-assisted cinematic startup animation.
 *
 * Timeline (seconds at 1x):
 *   00.00  VOID       deep-space initialization
 *   01.55  IGNITION   neural core spins up / star tunnel accelerates
 *   03.55  ASCENT     vector window / camera shake
 *   03.84  IMPACT     white flash + shockwave
 *   04.06  SIGIL      whale particle sigil + chrome wordmark
 *   07.28  SYSTEMS    terminal boot checklist
 *   10.62  HARNESS    final lockup
 *
 * Query params (handy for previewing / embedding):
 *   ?seek=6.4        jump to a moment and continue from there
 *   ?freeze=1        render one frame at ?seek and stop
 *   ?speed=1.2       playback rate (0.4 – 2.5)
 *   ?mute=1          start with audio muted
 *   ?name=秋枫       replaces OPERATOR in the final welcome
 *   ?exit=1          fade to the landing screen after the sequence
 * ========================================================================== */
(function () {
  'use strict';

  var boot = document.getElementById('boot');
  var stage = document.getElementById('stage');
  var space = document.getElementById('space');
  var after = document.getElementById('after');

  var params = new URLSearchParams(window.location.search);
  var num = function (key, fallback) {
    var n = parseFloat(params.get(key));
    return isFinite(n) ? n : fallback;
  };

  var DURATION = 13.6;
  var FREEZE = params.get('freeze') === '1';
  var SPEED = Math.min(2.5, Math.max(0.4, num('speed', 1)));
  var AUTO_EXIT = params.get('exit') === '1';
  var EMBED = params.get('embed') === '1';
  var ALLOW_SKIP = params.get('skip') !== '0';
  var REDUCED = false;
  try { REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ── tiny helpers ──────────────────────────────────────────────────────── */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function easeOutCubic(u) { return 1 - Math.pow(1 - u, 3); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function $(id) { return document.getElementById(id); }

  /* ── DOM cache ─────────────────────────────────────────────────────────── */
  var ui = {
    cut: $('cut'),
    phaseNo: $('phaseNo'),
    phaseLabel: $('phaseLabel'),
    timelineFill: $('timelineFill'),
    timelineKnob: $('timelineKnob'),
    timeCode: $('timeCode'),
    timeSec: $('timeSec'),
    statCore: $('statCore'),
    statMem: $('statMem'),
    statLink: $('statLink'),
    railBars: $('railBars'),
    hex: $('hexStream'),
    typeLine: $('typeLine'),
    corePct: $('corePct'),
    coreStatus: $('coreStatus'),
    meterPct: $('meterPct'),
    meterFill: $('meterFill'),
    meterLabel: $('meterLabel'),
    termStatus: $('termStatus'),
    termId: $('termId'),
    bootlog: $('bootlog'),
    soundBtn: $('soundBtn'),
    skipBtn: $('skipBtn'),
    soundLabel: $('soundLabel'),
    soundIco: $('soundIco'),
    audioToast: $('audioToast'),
    welcome: $('welcome'),
    wordmark: $('wordmark'),
    sceneIntro: $('sceneIntro'),
    sceneCore: $('sceneCore'),
    sceneBrand: $('sceneBrand'),
    sceneTerminal: $('sceneTerminal'),
    sceneFinal: $('sceneFinal')
  };

  var scenes = {
    sceneIntro: ui.sceneIntro,
    sceneCore: ui.sceneCore,
    sceneBrand: ui.sceneBrand,
    sceneTerminal: ui.sceneTerminal,
    sceneFinal: ui.sceneFinal
  };

  if (!ALLOW_SKIP && ui.skipBtn) ui.skipBtn.style.display = 'none';
  if (EMBED) document.body.classList.add('is-embed');

  /* ── personalisation ───────────────────────────────────────────────────── */
  (function welcomeName() {
    var raw = (params.get('name') || 'OPERATOR').replace(/[<>&]/g, '').trim().slice(0, 24);
    if (!raw) raw = 'OPERATOR';
    ui.welcome.textContent = 'WELCOME BACK, ';
    var b = document.createElement('b');
    b.textContent = raw.toUpperCase();
    ui.welcome.appendChild(b);
  })();

  /* ── HUD furniture ─────────────────────────────────────────────────────── */
  var BAR_COUNT = 24;
  var bars = [];
  for (var bi = 0; bi < BAR_COUNT; bi++) {
    var bar = document.createElement('i');
    ui.railBars.appendChild(bar);
    bars.push(bar);
  }

  var ringTicks = $('ringTicks');
  if (ringTicks) {
    var NS = 'http://www.w3.org/2000/svg';
    for (var ti = 0; ti < 72; ti++) {
      var line = document.createElementNS(NS, 'line');
      var major = ti % 9 === 0;
      var inner = major ? 233 : 240;
      var outer = major ? 249 : 245;
      var a = (ti / 72) * Math.PI * 2;
      line.setAttribute('x1', String(300 + Math.cos(a) * inner));
      line.setAttribute('y1', String(300 + Math.sin(a) * inner));
      line.setAttribute('x2', String(300 + Math.cos(a) * outer));
      line.setAttribute('y2', String(300 + Math.sin(a) * outer));
      if (major) line.setAttribute('class', 'major');
      ringTicks.appendChild(line);
    }
  }

  var LOGS = [
    { t: 7.55, time: '00:07.55', key: 'NEURAL CORE', val: 'ONLINE', hot: false },
    { t: 8.02, time: '00:08.02', key: 'VECTOR MEMORY', val: '128.0 TB', hot: false },
    { t: 8.49, time: '00:08.49', key: 'AGENT RUNTIME', val: 'MOUNTED', hot: false },
    { t: 8.96, time: '00:08.96', key: 'SECURE CHANNEL', val: 'AES-512', hot: false },
    { t: 9.43, time: '00:09.43', key: 'INFERENCE ENGINE', val: 'READY', hot: true },
    { t: 9.90, time: '00:09.90', key: 'ALL SYSTEMS', val: 'NOMINAL', hot: true }
  ];

  var logEls = LOGS.map(function (entry) {
    var li = document.createElement('li');
    var t = document.createElement('span'); t.className = 't'; t.textContent = entry.time;
    var k = document.createElement('span'); k.className = 'k'; k.textContent = entry.key;
    var d = document.createElement('span'); d.className = 'd';
    var v = document.createElement('span'); v.className = 'v' + (entry.hot ? ' hot' : ''); v.textContent = entry.val;
    li.appendChild(t); li.appendChild(k); li.appendChild(d); li.appendChild(v);
    ui.bootlog.appendChild(li);
    return li;
  });

  /* ── phase table ───────────────────────────────────────────────────────── */
  var PHASES = [
    { t: 0.00, id: 'void', no: '01', label: 'DEEP SPACE INITIALIZATION', scene: 'sceneIntro' },
    { t: 1.55, id: 'ignition', no: '02', label: 'NEURAL CORE IGNITION', scene: 'sceneCore' },
    { t: 3.55, id: 'ascent', no: '03', label: 'VECTOR ASCENT', scene: 'sceneCore' },
    { t: 4.06, id: 'brand', no: '04', label: 'SIGIL SYNTHESIS', scene: 'sceneBrand' },
    { t: 7.28, id: 'terminal', no: '05', label: 'SYSTEM INTEGRATION', scene: 'sceneTerminal' },
    { t: 10.62, id: 'final', no: '06', label: 'HARNESS ONLINE', scene: 'sceneFinal' }
  ];

  var state = {
    t: 0,
    base: 0,
    startedAt: performance.now(),
    cueIndex: 0,
    phase: '',
    silent: false,
    finished: false,
    freeze: FREEZE,
    speed: SPEED,
    raf: 0,
    lastHex: 0,
    lastBars: 0,
    lastCoreStatus: '',
    lastTermStatus: ''
  };

  var cutTimer = 0;
  function cutTo(swap) {
    if (state.silent || REDUCED) { swap(); return; }
    clearTimeout(cutTimer);
    ui.cut.classList.add('is-on');
    Sound.tick(false);
    swap();
    cutTimer = setTimeout(function () {
      ui.cut.classList.remove('is-on');
    }, 105);
  }

  function setPhase(id) {
    var p = null;
    for (var i = 0; i < PHASES.length; i++) if (PHASES[i].id === id) p = PHASES[i];
    if (!p) return;
    state.phase = id;
    boot.setAttribute('data-phase', id);
    ui.phaseNo.textContent = p.no;
    ui.phaseLabel.textContent = p.label;
    for (var key in scenes) {
      if (!Object.prototype.hasOwnProperty.call(scenes, key)) continue;
      scenes[key].classList.toggle('is-on', key === p.scene);
    }
    if (id === 'brand') updateMarkAnchor();
  }

  /* ── sound ─────────────────────────────────────────────────────────────── */
  var Sound = (function () {
    var AC = window.AudioContext || window.webkitAudioContext;
    var ctx = null;
    var master = null;
    var compressor = null;
    var noise = null;
    var unlocked = false;
    var enabled = false;
    var userMuted = params.get('mute') === '1';
    var pad = null;
    var volume = 0.62;

    function ensure() {
      if (ctx) return true;
      if (!AC) return false;
      try {
        ctx = new AC();
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 18;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.25;
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(compressor);
        compressor.connect(ctx.destination);
        return true;
      } catch (e) {
        ctx = null;
        return false;
      }
    }

    function makeNoise() {
      if (noise) return noise;
      var len = Math.floor(ctx.sampleRate * 2.2);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = noise.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return noise;
    }

    function canPlay() { return unlocked && enabled && ctx; }

    function startPad() {
      if (!ctx || pad) return;
      var t = ctx.currentTime;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.055, t + 3.2);
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      filter.Q.value = 0.6;
      var freqs = [41.2, 61.74, 82.41];
      var oscs = [];
      for (var i = 0; i < freqs.length; i++) {
        var o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freqs[i];
        o.detune.value = (i - 1) * 5;
        o.connect(filter);
        o.start(t);
        oscs.push(o);
      }
      var air = ctx.createBufferSource();
      air.buffer = makeNoise();
      air.loop = true;
      var airFilter = ctx.createBiquadFilter();
      airFilter.type = 'bandpass';
      airFilter.frequency.value = 820;
      airFilter.Q.value = 0.5;
      var airGain = ctx.createGain();
      airGain.gain.value = 0.012;
      air.connect(airFilter); airFilter.connect(airGain); airGain.connect(filter);
      air.start(t);
      filter.connect(gain); gain.connect(master);
      pad = { gain: gain, oscs: oscs, air: air };
    }

    function blip(freq, dur, level, type) {
      if (!canPlay()) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level || 0.05, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.08));
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + (dur || 0.08) + 0.02);
    }

    function impact() {
      if (!canPlay()) return;
      var t = ctx.currentTime;
      var sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(130, t);
      sub.frequency.exponentialRampToValueAtTime(28, t + 1.25);
      var sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, t);
      sg.gain.exponentialRampToValueAtTime(0.9, t + 0.018);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      sub.connect(sg); sg.connect(master);
      sub.start(t); sub.stop(t + 1.55);

      var src = ctx.createBufferSource();
      src.buffer = makeNoise();
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2600, t);
      lp.frequency.exponentialRampToValueAtTime(160, t + 0.9);
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.34, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      src.connect(lp); lp.connect(ng); ng.connect(master);
      src.start(t); src.stop(t + 0.95);

      var ping = ctx.createOscillator();
      ping.type = 'triangle';
      ping.frequency.setValueAtTime(1860, t);
      ping.frequency.exponentialRampToValueAtTime(480, t + 0.32);
      var pg = ctx.createGain();
      pg.gain.setValueAtTime(0.0001, t);
      pg.gain.exponentialRampToValueAtTime(0.055, t + 0.006);
      pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      ping.connect(pg); pg.connect(master);
      ping.start(t); ping.stop(t + 0.45);
    }

    function riser(duration) {
      if (!canPlay()) return;
      var d = duration || 2.2;
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(52, t);
      o.frequency.exponentialRampToValueAtTime(410, t + d);
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.8;
      f.frequency.setValueAtTime(180, t);
      f.frequency.exponentialRampToValueAtTime(2200, t + d);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + d * 0.72);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); o.stop(t + d + 0.05);

      var src = ctx.createBufferSource();
      src.buffer = makeNoise();
      var nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.Q.value = 0.9;
      nf.frequency.setValueAtTime(240, t);
      nf.frequency.exponentialRampToValueAtTime(6200, t + d);
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.14, t + d * 0.8);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(nf); nf.connect(ng); ng.connect(master);
      src.start(t); src.stop(t + d + 0.05);
    }

    function glitch() {
      if (!canPlay()) return;
      for (var i = 0; i < 5; i++) {
        var wait = i * 0.045;
        var freq = rand(180, 1600);
        var t = ctx.currentTime + wait;
        var o = ctx.createOscillator();
        o.type = i % 2 ? 'square' : 'sawtooth';
        o.frequency.setValueAtTime(freq, t);
        o.frequency.setValueAtTime(rand(120, 2400), t + 0.018);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.035, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.06);
      }
    }

    function chord() {
      if (!canPlay()) return;
      var t = ctx.currentTime;
      var notes = [55, 110, 164.81, 220, 329.63, 493.88];
      for (var i = 0; i < notes.length; i++) {
        var o = ctx.createOscillator();
        o.type = i > 2 ? 'triangle' : 'sine';
        o.frequency.value = notes[i];
        o.detune.value = (i % 2 ? 3 : -3);
        var g = ctx.createGain();
        var peak = i > 3 ? 0.022 : 0.055;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 4.3);
      }
      var shimmer = ctx.createOscillator();
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(1760, t);
      shimmer.frequency.exponentialRampToValueAtTime(2637, t + 1.6);
      var sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, t);
      sg.gain.linearRampToValueAtTime(0.012, t + 0.8);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      shimmer.connect(sg); sg.connect(master);
      shimmer.start(t); shimmer.stop(t + 3.3);
    }

    function updateButton() {
      var on = enabled && !userMuted;
      ui.soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      ui.soundLabel.textContent = on ? '声音开启' : '声音关闭';
      ui.soundIco.textContent = on ? '◉' : '◌';
      ui.audioToast.classList.toggle('is-off', on || userMuted);
    }

    function unlock() {
      if (userMuted) return false;
      if (!ensure()) return false;
      if (ctx.state === 'suspended') {
        try { ctx.resume(); } catch (e) {}
      }
      if (!unlocked) {
        unlocked = true;
        enabled = true;
        startPad();
        blip(720, 0.05, 0.045, 'sine');
        setTimeout(function () { blip(1080, 0.08, 0.03, 'sine'); }, 70);
      }
      updateButton();
      return true;
    }

    function toggle() {
      if (!ensure()) return;
      if (!unlocked) {
        userMuted = false;
        unlock();
        return;
      }
      enabled = !enabled;
      if (!enabled) userMuted = true;
      else {
        userMuted = false;
        if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
        startPad();
        blip(840, 0.06, 0.04, 'sine');
      }
      updateButton();
    }

    function tick(hot) {
      if (!canPlay()) return;
      blip(hot ? 1320 : 980, 0.028, 0.025, 'square');
    }

    function duck() {
      if (!ctx) return;
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 0.12);
      master.gain.linearRampToValueAtTime(volume, t + 1.4);
    }

    function fadeOut() {
      if (!ctx) return;
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 1.1);
    }

    function restore() {
      if (!ctx) return;
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
      master.gain.linearRampToValueAtTime(volume, t + 0.4);
    }

    updateButton();

    return {
      unlock: unlock,
      toggle: toggle,
      impact: impact,
      riser: riser,
      glitch: glitch,
      chord: chord,
      tick: tick,
      duck: duck,
      fadeOut: fadeOut,
      restore: restore,
      isMuted: function () { return userMuted; }
    };
  })();

  /* ── canvas: star tunnel + particle sigil ─────────────────────────────── */
  var ctx = space.getContext('2d', { alpha: true, desynchronized: true });
  var W = 0, H = 0, DPR = 1, MAX_R = 0;
  var stars = [];
  var dust = [];
  var NARROW = window.innerWidth < 680;
  var STAR_COUNT = REDUCED ? 170 : (NARROW ? 360 : 620);
  var PARTICLE_COUNT = REDUCED ? 650 : (NARROW ? 2400 : 3600);

  var glowSprites = {};
  function makeGlow(color) {
    var c = document.createElement('canvas');
    c.width = c.height = 48;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, color);
    grad.addColorStop(0.18, color);
    grad.addColorStop(0.55, 'rgba(255,255,255,.12)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    return c;
  }
  glowSprites.white = makeGlow('rgba(255,255,255,.95)');
  glowSprites.cyan = makeGlow('rgba(76,238,255,.9)');
  glowSprites.orange = makeGlow('rgba(255,145,54,.9)');

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    space.width = Math.floor(W * DPR);
    space.height = Math.floor(H * DPR);
    space.style.width = W + 'px';
    space.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var nextMax = Math.max(W, H) * 0.78;
    if (MAX_R > 0) {
      var ratio = nextMax / MAX_R;
      for (var i = 0; i < stars.length; i++) stars[i].r *= ratio;
    }
    MAX_R = nextMax;
    if (!stars.length) initStars();
    updateMarkAnchor();
  }

  function initStars() {
    stars.length = 0;
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push({
        angle: rand(0, Math.PI * 2),
        r: rand(8, MAX_R),
        depth: rand(0.18, 1),
        spin: rand(-0.02, 0.02),
        color: Math.random() < 0.1 ? 'orange' : (Math.random() < 0.22 ? 'cyan' : 'white')
      });
    }
    dust.length = 0;
    for (var j = 0; j < 110; j++) {
      dust.push({ x: rand(0, 1), y: rand(0, 1), phase: rand(0, 6.28), size: rand(0.4, 1.4) });
    }
  }

  function warpAt(t) {
    if (t < 1.55) return 0.03 + 0.02 * Math.sin(t * 1.8);
    if (t < 3.7) {
      var u = (t - 1.55) / 2.15;
      return 0.08 + Math.pow(u, 2.35) * 1.5;
    }
    if (t < 4.06) return Math.max(0.02, 1.5 - (t - 3.7) * 4.2);
    return 0.025;
  }

  function drawSpace(t, dt) {
    var warp = REDUCED ? Math.min(warp, 0.25) : warpAt(t);
    ctx.clearRect(0, 0, W, H);

    var cx = W * 0.5;
    var cy = H * 0.47;
    var hueShift = t < 3.7 ? 1 : 0.75;

    /* central bloom */
    if (t > 1.1 && t < 4.4) {
      var bloom = clamp((t - 1.1) / 1.2, 0, 1) * (1 - clamp((t - 3.7) / 0.7, 0, 1));
      var rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.48);
      rg.addColorStop(0, 'rgba(255,224,190,' + (0.2 * bloom).toFixed(3) + ')');
      rg.addColorStop(0.22, 'rgba(255,122,28,' + (0.12 * bloom).toFixed(3) + ')');
      rg.addColorStop(0.62, 'rgba(0,92,160,' + (0.05 * bloom).toFixed(3) + ')');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }

    /* star tunnel — batched strokes for speed */
    var buckets = { white: [], cyan: [], orange: [] };
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var speed = (16 + s.depth * 52 + warp * 1180 * s.depth) * dt;
      s.r += speed;
      s.angle += s.spin * dt;
      if (s.r > MAX_R) {
        s.r = rand(4, MAX_R * 0.06);
        s.depth = rand(0.18, 1);
        s.angle = rand(0, Math.PI * 2);
      }
      var a = s.angle;
      var r = s.r;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r * 0.9;
      var len = (1.5 + speed * 2.7) * (0.4 + s.depth * 0.8);
      var x2 = cx + Math.cos(a) * Math.max(0, r - len);
      var y2 = cy + Math.sin(a) * Math.max(0, r - len) * 0.9;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) {
        if (x2 < -20 || x2 > W + 20 || y2 < -20 || y2 > H + 20) continue;
      }
      var alpha = Math.min(1, (0.18 + warp * 0.85) * (0.35 + s.depth * 0.8));
      buckets[s.color].push([x, y, x2, y2, alpha]);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    var colors = { white: '235,250,255', cyan: '80,230,255', orange: '255,154,66' };
    for (var key in buckets) {
      var list = buckets[key];
      if (!list.length) continue;
      for (var b = 0; b < list.length; b++) {
        var p = list[b];
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(' + colors[key] + ',' + p[4].toFixed(3) + ')';
        ctx.lineWidth = key === 'white' ? 1 : 1.2;
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(p[2], p[3]);
        ctx.stroke();
      }
    }

    /* distant dust — fixed points, gentle twinkle */
    for (var d = 0; d < dust.length; d++) {
      var q = dust[d];
      var tw = 0.28 + 0.55 * Math.abs(Math.sin(t * 0.7 + q.phase));
      ctx.fillStyle = 'rgba(192,235,255,' + tw.toFixed(3) + ')';
      ctx.fillRect(q.x * W, q.y * H, q.size, q.size);
    }
    ctx.restore();
  }

  /* the whale target is sampled once from the official path */
  var whalePath = window.WHALE_PATH ? new Path2D(window.WHALE_PATH) : null;
  var particleTargets = [];

  function sampleWhale() {
    if (!whalePath) {
      for (var n = 0; n < PARTICLE_COUNT; n++) {
        particleTargets.push({ x: rand(-0.24, 0.24), y: rand(-0.15, 0.15) });
      }
      return;
    }
    var SW = 640, SH = 480, pad = 28;
    var c = document.createElement('canvas');
    c.width = SW; c.height = SH;
    var g = c.getContext('2d');
    var pathW = 48.1, pathH = 36.3;
    var scale = Math.min((SW - pad * 2) / pathW, (SH - pad * 2) / pathH);
    var ox = (SW - pathW * scale) / 2 - 1.3 * scale;
    var oy = (SH - pathH * scale) / 2 - 7.0 * scale;
    g.setTransform(scale, 0, 0, scale, ox, oy);
    g.fillStyle = '#fff';
    g.fill(whalePath);
    var img = g.getImageData(0, 0, SW, SH).data;
    var pts = [];
    for (var y = 0; y < SH; y += 2) {
      for (var x = 0; x < SW; x += 2) {
        if (img[(y * SW + x) * 4 + 3] > 130) {
          pts.push({ x: (x - SW / 2) / SW, y: (y - SH / 2) / SW });
        }
      }
    }
    if (!pts.length) pts.push({ x: 0, y: 0 });
    for (var i = pts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pts[i]; pts[i] = pts[j]; pts[j] = tmp;
    }
    for (var k = 0; k < PARTICLE_COUNT; k++) {
      var p = pts[k % pts.length];
      particleTargets.push({ x: p.x, y: p.y });
    }
  }
  sampleWhale();

  var particles = [];
  (function makeParticles() {
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var target = particleTargets[i] || { x: 0, y: 0 };
      var color = target.x < -0.075 ? 'cyan' : (target.x > 0.11 ? 'orange' : 'white');
      particles.push({
        tx: target.x,
        ty: target.y,
        angle: rand(0, Math.PI * 2),
        radius: 35 + Math.pow(Math.random(), 0.72) * 480,
        spin: rand(0.24, 0.7),
        seed: rand(0, 100),
        delay: Math.random() * 0.5,
        size: rand(0.8, 2.2),
        alpha: rand(0.45, 1),
        color: color
      });
    }
  })();

  var markAnchorTop = 0;
  function updateMarkAnchor() {
    try {
      var wr = ui.wordmark.getBoundingClientRect();
      if (wr && wr.height > 0) markAnchorTop = wr.top;
    } catch (e) { /* keep the previous anchor */ }
  }

  function markBox() {
    var mw;
    if (W < 680) mw = Math.min(W * 0.47, H * 0.21);
    else mw = Math.min(W * 0.28, H * 0.30, 380);
    var mh = mw * 480 / 640;
    var gap = W < 680 ? 24 : 30;
    /* Hang the sigil a fixed distance above the wordmark, so the lockup keeps
       the same rhythm on a wide monitor and on a tall phone. */
    var cy = markAnchorTop ? markAnchorTop - gap - mh / 2 : H * 0.234;
    cy = clamp(cy, H * 0.12, H * 0.54);
    return { cx: W / 2, cy: cy, w: mw, h: mh };
  }

  function drawParticles(t) {
    if (!particles.length) return;
    var fadeOut = 1 - clamp((t - 7.0) / 0.65, 0, 1);
    if (t < 1.75 || fadeOut <= 0) return;
    var box = markBox();
    var assembly = 3.92;
    var coreVis = clamp((t - 1.85) / 1.0, 0, 1);
    var ctx2 = ctx;

    ctx2.save();
    ctx2.globalCompositeOperation = 'lighter';

    var glowList = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var x, y, a;

      if (t < assembly) {
        var ang = p.angle + t * (0.35 + p.spin * 0.42);
        var rad = (54 + p.radius * (1 - 0.22 * coreVis));
        x = box.cx + Math.cos(ang) * rad;
        y = box.cy + Math.sin(ang) * rad * 0.62;
        a = coreVis * (0.14 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2.6 + p.seed))) * fadeOut;
      } else {
        var local = t - assembly - p.delay;
        var q = clamp(local / 1.55, 0, 1);
        var e = easeOutCubic(q);
        var a0 = p.angle + assembly * (0.35 + p.spin * 0.42);
        var r0 = 54 + p.radius;
        var sx = box.cx + Math.cos(a0) * r0;
        var sy = box.cy + Math.sin(a0) * r0 * 0.62;
        var tx = box.cx + p.tx * box.w;
        var ty = box.cy + p.ty * box.w;
        var idle = q >= 1 ? Math.sin(t * 0.9 + p.seed) * 1.8 : 0;
        x = lerp(sx, tx, e) + idle;
        y = lerp(sy, ty, e) + (q >= 1 ? Math.cos(t * 0.76 + p.seed * 1.3) * 1.5 : 0);
        a = (0.16 + 0.84 * q) * p.alpha * fadeOut;
      }

      if (a <= 0.01) continue;
      ctx2.globalAlpha = a;
      ctx2.fillStyle = p.color === 'cyan' ? 'rgba(96,242,255,1)' : (p.color === 'orange' ? 'rgba(255,157,70,1)' : 'rgba(240,251,255,1)');
      ctx2.fillRect(x, y, p.size, p.size);
      if (i % 8 === 0) glowList.push([x, y, a, p.color, p.size]);
    }

    /* soft bloom pass only on a fraction of the particles */
    for (var g = 0; g < glowList.length; g++) {
      var it = glowList[g];
      var sprite = glowSprites[it[3]];
      var size = it[4] * 16;
      ctx2.globalAlpha = it[2] * 0.24;
      ctx2.drawImage(sprite, it[0] - size / 2, it[1] - size / 2, size, size);
    }

    /* a ghost fill + dashed contour makes the whale legible without flattening it */
    if (whalePath && t > 4.4 && fadeOut > 0) {
      var fillAlpha = clamp((t - 4.4) / 1.2, 0, 1) * fadeOut * 0.075;
      var sf = box.w / 50;
      ctx2.save();
      ctx2.globalAlpha = fillAlpha;
      ctx2.translate(box.cx - 25 * sf, box.cy - 25.2 * sf);
      ctx2.scale(sf, sf);
      var fillGrad = ctx2.createLinearGradient(-25, 0, 25, 0);
      fillGrad.addColorStop(0, 'rgba(76,228,255,1)');
      fillGrad.addColorStop(0.56, 'rgba(236,253,255,1)');
      fillGrad.addColorStop(1, 'rgba(255,151,58,1)');
      ctx2.fillStyle = fillGrad;
      ctx2.fill(whalePath);
      ctx2.restore();
    }
    if (whalePath && t > 4.55 && fadeOut > 0) {
      var oa = clamp((t - 4.55) / 1.0, 0, 1) * fadeOut * 0.28;
      var s = box.w / 50;
      ctx2.save();
      ctx2.translate(box.cx - 25 * s, box.cy - 25.2 * s);
      ctx2.scale(s, s);
      /* a wide, faint pass makes the edge glow; the thin pass keeps it crisp */
      ctx2.globalAlpha = oa * 0.2;
      ctx2.strokeStyle = 'rgba(112,238,255,1)';
      ctx2.lineWidth = 3.4 / s;
      ctx2.stroke(whalePath);
      ctx2.globalAlpha = oa;
      ctx2.strokeStyle = 'rgba(235,253,255,1)';
      ctx2.lineWidth = 0.9 / s;
      ctx2.stroke(whalePath);
      ctx2.restore();
    }

    ctx2.restore();
  }

  /* ── scene cues ────────────────────────────────────────────────────────── */
  var cues = [];
  function cue(t, fn) { cues.push({ t: t, fn: fn }); }

  cue(0.00, function () { setPhase('void'); });
  cue(1.55, function () { setPhase('ignition'); });
  cue(2.00, function () { if (!state.silent) Sound.riser(2.15); });
  cue(2.88, function () {
    ui.sceneCore.classList.add('is-charging');
    ui.coreStatus.textContent = 'PHASE ARRAY LOCKED';
  });
  cue(3.30, function () {
    ui.sceneCore.classList.add('is-charging');
    ui.coreStatus.textContent = 'VECTOR WINDOW OPEN';
    stage.classList.add('is-shaking');
  });
  cue(3.52, function () { setPhase('ascent'); });
  cue(3.70, function () { stage.classList.remove('is-shaking'); });
  cue(3.84, function () {
    if (!state.silent) {
      boot.classList.remove('is-flashing');
      void boot.offsetWidth;
      boot.classList.add('is-flashing', 'is-shocking');
      Sound.impact();
    }
  });
  cue(4.06, function () { setPhase('brand'); });
  cue(4.20, function () { ui.sceneBrand.classList.add('is-revealed'); });
  cue(5.42, function () {
    ui.wordmark.classList.add('is-glitching');
    if (!state.silent) Sound.glitch();
  });
  cue(5.88, function () { ui.wordmark.classList.remove('is-glitching'); });
  cue(6.20, function () { ui.sceneBrand.classList.add('is-alive'); });
  cue(7.26, function () {
    ui.sceneBrand.classList.remove('is-alive');
    cutTo(function () { setPhase('terminal'); });
  });

  LOGS.forEach(function (entry, i) {
    cue(entry.t, function () {
      logEls[i].classList.add('is-shown');
      if (!state.silent) Sound.tick(!!entry.hot);
    });
  });

  cue(10.10, function () {
    ui.termStatus.textContent = 'NOMINAL';
    ui.meterLabel.textContent = 'ALL SYSTEMS NOMINAL';
    if (!state.silent) Sound.tick(true);
  });
  cue(10.62, function () { cutTo(function () { setPhase('final'); }); });
  cue(10.95, function () { if (!state.silent) Sound.chord(); });
  var autoExitTimer = 0;
  cue(12.55, function () {
    if (AUTO_EXIT && !state.silent) {
      clearTimeout(autoExitTimer);
      autoExitTimer = setTimeout(finish, 1200);
    }
  });

  cues.sort(function (a, b) { return a.t - b.t; });

  function runCuesUpTo(t) {
    while (state.cueIndex < cues.length && cues[state.cueIndex].t <= t) {
      var c = cues[state.cueIndex++];
      try { c.fn(); } catch (e) { /* a cue must never break the show */ }
    }
  }

  /* ── HUD updates ───────────────────────────────────────────────────────── */
  var hexChars = '0123456789ABCDEF';
  function randomHex(len) {
    var s = '';
    for (var i = 0; i < len; i++) s += hexChars[Math.floor(Math.random() * 16)];
    return s;
  }

  function updateHud(t, now) {
    var pct = clamp(t / DURATION, 0, 1);
    ui.timelineFill.style.width = (pct * 100).toFixed(2) + '%';
    ui.timelineKnob.style.left = (pct * 100).toFixed(2) + '%';
    ui.timeSec.textContent = t.toFixed(1);
    var whole = Math.floor(t);
    ui.timeCode.textContent = '00:00:' + (whole < 10 ? '0' : '') + whole;

    var core = t < 3.9 ? clamp((t - 1.55) / 2.3, 0, 1) : 1;
    ui.statCore.textContent = t < 3.9 ? String(Math.round(core * 100)).padStart(2, '0') + '%' : 'ONLINE';
    ui.statMem.textContent = (118.4 + t * 2.6).toFixed(1) + ' TB';
    ui.statLink.textContent = (t < 3.9 ? Math.round(24 + core * 52) : 96) + '%';

    if (now - state.lastBars > 70) {
      state.lastBars = now;
      var energy = t > 7.2 && t < 10.6 ? 0.72 : (t > 12 ? 0.36 : 0.95);
      for (var i = 0; i < bars.length; i++) {
        var v = Math.abs(Math.sin(t * 2.2 + i * 0.52 + Math.sin(t * 0.8 + i * 0.31) * 0.7));
        bars[i].style.height = (9 + v * 82 * energy).toFixed(1) + '%';
        bars[i].style.opacity = String(0.3 + v * 0.6);
      }
    }

    if (now - state.lastHex > 125) {
      state.lastHex = now;
      var out = [];
      for (var h = 0; h < 13; h++) out.push('<span>' + randomHex(4) + ' ' + randomHex(4) + ' ' + randomHex(2) + '</span>');
      ui.hex.innerHTML = out.join('');
    }

    var typeText = 'INITIALIZING DEEPSEEK HARNESS';
    var typed = Math.floor(clamp((t - 0.22) / 0.034, 0, typeText.length));
    ui.typeLine.textContent = typeText.slice(0, typed);

    var cp = Math.round(clamp((t - 1.55) / 2.3, 0, 1) * 100);
    ui.corePct.textContent = String(cp).padStart(2, '0');
    var cs;
    if (t < 2.0) cs = 'SPOOLING PHASE ARRAY';
    else if (t < 2.7) cs = 'CALIBRATING NEURAL LATTICE';
    else if (t < 3.3) cs = 'PHASE ARRAY LOCKED';
    else if (t < 3.9) cs = 'VECTOR WINDOW OPEN';
    else cs = 'CORE ONLINE';
    if (cs !== state.lastCoreStatus) {
      state.lastCoreStatus = cs;
      ui.coreStatus.textContent = cs;
    }

    var mp = t < 7.55 ? 0 : Math.min(100, (t - 7.55) / 2.65 * 100);
    ui.meterPct.textContent = String(Math.round(mp));
    ui.meterFill.style.width = mp.toFixed(2) + '%';
    var ts;
    if (mp < 18) ts = 'CALIBRATING';
    else if (mp < 40) ts = 'MOUNTING';
    else if (mp < 66) ts = 'LINKING';
    else if (mp < 99) ts = 'VERIFYING';
    else ts = 'NOMINAL';
    if (ts !== state.lastTermStatus) {
      state.lastTermStatus = ts;
      ui.termStatus.textContent = ts;
      ui.meterLabel.textContent = ts === 'NOMINAL' ? 'ALL SYSTEMS NOMINAL' : ts;
    }
  }

  /* ── render loop ───────────────────────────────────────────────────────── */
  var lastT = 0;

  function render(t, dt, now) {
    drawSpace(t, dt);
    drawParticles(t);
    updateHud(t, now);

    if (!state.freeze && !REDUCED && t > 2.85 && t < 4.05) {
      var amp = (warpAt(t) - 0.2) * 2.2;
      if (amp > 0.1) {
        var sx = Math.sin(t * 73) * amp + Math.sin(t * 31) * amp * 0.4;
        var sy = Math.cos(t * 61) * amp * 0.65;
        space.style.transform = 'translate3d(' + sx.toFixed(2) + 'px,' + sy.toFixed(2) + 'px,0) scale(1.03)';
      } else {
        space.style.transform = '';
      }
    } else if (space.style.transform) {
      space.style.transform = '';
    }
  }

  function loop(now) {
    if (state.finished) return;
    var dt;
    if (state.freeze) {
      dt = 0.016;
    } else {
      var elapsed = (now - state.startedAt) / 1000;
      state.t = Math.min(DURATION, state.base + elapsed * state.speed);
      dt = Math.min(0.05, Math.max(0.004, state.t - lastT));
      lastT = state.t;
    }
    runCuesUpTo(state.t);
    render(state.t, dt, now);
    state.raf = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.freeze) {
      state.t = state.base;
      runCuesUpTo(state.t);
      render(state.t, 0.016, performance.now());
      return;
    }
    lastT = state.t;
    state.raf = requestAnimationFrame(loop);
  }

  /* ── controls ──────────────────────────────────────────────────────────── */
  function clearTransientClasses() {
    boot.classList.remove('is-flashing', 'is-shocking', 'is-done');
    ui.sceneCore.classList.remove('is-charging');
    ui.sceneBrand.classList.remove('is-revealed', 'is-alive');
    ui.wordmark.classList.remove('is-glitching');
    stage.classList.remove('is-shaking');
  }

  function reset() {
    if (autoExitTimer) { clearTimeout(autoExitTimer); autoExitTimer = 0; }
    if (cutTimer) { clearTimeout(cutTimer); cutTimer = 0; }
    ui.cut.classList.remove('is-on');
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.finished = false;
    state.t = 0;
    state.base = 0;
    state.startedAt = performance.now();
    state.cueIndex = 0;
    state.phase = '';
    state.silent = true;
    state.lastT = 0;
    lastT = 0;
    state.lastCoreStatus = '';
    state.lastTermStatus = '';
    clearTransientClasses();
    space.style.transform = '';
    after.classList.remove('is-visible');
    after.setAttribute('aria-hidden', 'true');
    boot.removeAttribute('aria-hidden');
    boot.classList.remove('is-done');
    boot.style.opacity = '';
    ui.bootlog.querySelectorAll('li').forEach(function (li) { li.classList.remove('is-shown'); });
    ui.meterFill.style.width = '0%';
    ui.meterPct.textContent = '0';
    ui.corePct.textContent = '00';
    ui.typeLine.textContent = '';
    ui.termStatus.textContent = 'CALIBRATING';
    ui.meterLabel.textContent = 'INITIALIZING';
    ui.hex.innerHTML = '';
    for (var i = 0; i < bars.length; i++) bars[i].style.height = '20%';
    for (var key in scenes) {
      if (Object.prototype.hasOwnProperty.call(scenes, key)) scenes[key].classList.remove('is-on');
    }
    Sound.restore();
    runCuesUpTo(0);
    state.silent = false;
    startLoop();
  }

  function replay() {
    reset();
  }

  function finish() {
    if (state.finished) return;
    state.finished = true;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
    boot.classList.add('is-done');
    boot.setAttribute('aria-hidden', 'true');
    Sound.fadeOut();
    if (EMBED) {
      try { window.parent.postMessage({ type: 'dsh-cinematic:done' }, '*'); } catch (e) {}
      return;
    }
    after.classList.add('is-visible');
    after.setAttribute('aria-hidden', 'false');
  }

  ui.soundBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    Sound.toggle();
  });

  $('replayBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    if (!Sound.isMuted()) Sound.unlock();
    replay();
  });

  $('skipBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    finish();
  });

  $('enterBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    finish();
  });

  ui.sceneFinal.addEventListener('click', function (e) {
    if (e.target.closest('button')) return;
    finish();
  });

  $('againBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    replay();
  });

  document.addEventListener('pointerdown', function (e) {
    if (e.target && e.target.closest && e.target.closest('.controls')) return;
    Sound.unlock();
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (state.finished) {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        Sound.unlock();
        replay();
      }
      return;
    }
    if (e.key === 'Escape') {
      if (!ALLOW_SKIP) return;
      e.preventDefault();
      finish();
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      Sound.unlock();
      replay();
      return;
    }
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      Sound.toggle();
      return;
    }
    Sound.unlock();
    if ((e.key === 'Enter' || e.key === ' ') && state.phase === 'final') {
      e.preventDefault();
      finish();
    }
  });

  window.addEventListener('resize', function () {
    resize();
    if (state.freeze) render(state.t, 0.016, performance.now());
  });

  /* exposed for embedding / testing */
  window.BootSequence = {
    play: function () {
      reset();
    },
    replay: replay,
    skip: finish,
    finish: finish,
    seek: function (seconds) {
      var target = clamp(Number(seconds) || 0, 0, DURATION);
      if (state.raf) cancelAnimationFrame(state.raf);
      state.finished = false;
      boot.classList.remove('is-done');
      state.silent = true;
      state.cueIndex = 0;
      state.base = target;
      state.startedAt = performance.now();
      state.t = target;
      lastT = target;
      runCuesUpTo(target);
      state.silent = false;
      startLoop();
    },
    config: {
      duration: DURATION,
      speed: SPEED,
      freeze: FREEZE
    }
  };

  /* ── boot ──────────────────────────────────────────────────────────────── */
  resize();
  var initial = clamp(num('seek', 0), 0, DURATION);
  state.base = initial;
  state.t = initial;
  state.startedAt = performance.now();
  state.silent = true;
  runCuesUpTo(initial);
  state.silent = false;
  lastT = initial;

  if (FREEZE) {
    render(initial, 0.016, performance.now());
  } else {
    startLoop();
  }

  if (EMBED) {
    setTimeout(function () {
      try { window.parent.postMessage({ type: 'dsh-cinematic:ready' }, '*'); } catch (e) {}
    }, 30);
  }
})();
