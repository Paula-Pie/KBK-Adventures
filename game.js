(() => {
  'use strict';

  // ---------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------
  const START_LIVES = 4;
  const MAX_LIVES = 6;
  const LIFE_LEVELS = [3, 6, 8, 10]; // levels where the ❤️ extra-life powerup can drop
  const BOMB_FUSE = 1800; // ms
  const EXPLOSION_LIFE = 380; // ms
  const INVULN_MS = 1500;
  const PLAYER_SPEED = 3.4; // tiles/sec
  const ENEMY_SPEED_BASE = 1.5;
  const ENEMY_RESPAWN_MS = 4200;
  const POWERUP_CHANCE = 0.32;
  const SCORE = { crate: 10, enemy: 50, powerup: 5 };
  const LEVEL_CLEAR_BASE = 100;
  const QUIZ_BONUS = 25;
  // Trivia breaks — a pool of 9 questions, one per level transition (2 through 10). Each answer's
  // `v` is compared against `correct` to grade it. The pool is reshuffled at the start of every
  // run (see shuffleQuizzes/quizQueue) so which question lands on which transition varies between
  // playthroughs instead of always being the same question in the same spot.
  const QUIZ_POOL = [
    {
      img: 'assets/quiz-record.jpg?v=2',
      alt: 'record by Leviatan',
      question: 'Czy długopis RECORD ma tusz dokumentalny niemieckiego producenta DOCUMENTAL?',
      answers: [
        { label: 'Tak', v: 'tak' },
        { label: 'Nie', v: 'nie' },
      ],
      correct: 'tak',
    },
    {
      img: 'assets/quiz-soap.jpg?v=2',
      alt: 'Mydło w płynie d.rect Office',
      question: 'Jaki jest zapach różowego mydła d.rect?',
      answers: [
        { label: 'A) milk&honey', v: 'a' },
        { label: 'B) pomegranate (owoc granatu)', v: 'b' },
        { label: 'C) papaja', v: 'c' },
      ],
      correct: 'b',
    },
    {
      img: 'assets/quiz-screencleaner.jpg?v=2',
      alt: 'TFT/LCD Screen Cleaner d.rect Office',
      question: 'Ile ml ma płyn d.rect TFT/LCD do czyszczenia ekranów?',
      answers: [
        { label: 'A) 100 ml', v: '100' },
        { label: 'B) 150 ml', v: '150' },
        { label: 'C) 250 ml', v: '250' },
      ],
      correct: '250',
    },
    {
      img: 'assets/quiz-korektor.jpg?v=2',
      alt: 'Korektor w taśmie FORM+ by Leviatan',
      question: 'Ile metrów taśmy korekcyjnej ma korektor SMART FORM+ 5501?',
      answers: [
        { label: 'A) 10 m', v: '10' },
        { label: 'B) 12 m', v: '12' },
        { label: 'C) 14 m', v: '14' },
      ],
      correct: '14',
    },
    {
      img: 'assets/quiz-leviatan.jpg?v=2',
      alt: 'Siedziba Leviatan-Poligrafia',
      question: 'W którym roku powstała firma Leviatan-Poligrafia?',
      answers: [
        { label: 'A) w 1995', v: '1995' },
        { label: 'B) w 1989', v: '1989' },
        { label: 'C) w 1999', v: '1999' },
      ],
      correct: '1989',
    },
    {
      img: 'assets/quiz-hator.png?v=2',
      alt: 'Hator Gold — zestaw do renowacji napisów na płytach kamiennych',
      question: 'Czy w skład zestawu do renowacji napisów na nagrobkach wchodzi m.in. kamień szlifierski?',
      answers: [
        { label: 'Tak', v: 'tak' },
        { label: 'Nie', v: 'nie' },
      ],
      correct: 'tak',
    },
    {
      img: 'assets/quiz-nanotape.jpg?v=1',
      alt: 'Taśma Nano Tape',
      question: 'Czy taśma Nano Tape jest odrywalna (można ją oderwać i przykleić wiele razy)?',
      answers: [
        { label: 'Tak', v: 'tak' },
        { label: 'Nie', v: 'nie' },
      ],
      correct: 'tak',
    },
    {
      img: 'assets/quiz-kawa.jpg?v=2',
      alt: 'Kawa Life Up',
      question: 'Kawa w ofercie Leviatan to:',
      answers: [
        { label: 'A) Milano, Amsterdam, Brasilia, Budapest', v: 'a' },
        { label: 'B) Czechy, Argentyna, Monaco, Sycylia', v: 'b' },
        { label: 'C) Toskania, Morawy, Istria, Piemont', v: 'c' },
      ],
      correct: 'a',
    },
    {
      img: 'assets/quiz-zszywacz.png?v=2',
      alt: 'Zszywacz Smart FORM+ 5106 by Leviatan',
      question: 'Jaka technologia została użyta w najnowszym zszywaczu FORM+5106?',
      answers: [
        { label: 'A) Zszywanie standardowe (stapling)', v: 'a' },
        { label: 'B) Zszywanie zamykane (closed clinch)', v: 'b' },
        { label: 'C) Zszywanie płaskie (flat clinch)', v: 'c' },
      ],
      correct: 'c',
    },
  ];
  const LEVEL_BANNER_MS = 1500;

  const TILE_EMPTY = 0, TILE_WALL = 1, TILE_CRATE = 2;
  const POWERUP_TYPES = ['speed', 'range', 'bomb', 'time'];

  const TUTORIAL = {
    cols: 9, rows: 11, crateProb: 0.35, enemyMax: 1, enemySpeedMult: 0.7, time: 90,
    lane: false, floorA: '#DCEAF2', floorB: '#C9DEEB', wall: '#3A5468',
    name: 'Samouczek', tutorial: true,
  };

  const LEVELS = [
    { cols: 9, rows: 11, crateProb: 0.50, enemyMax: 2, enemySpeedMult: 1.00, time: 50, lane: false, floorA: '#E7DFCC', floorB: '#DED4BC', wall: '#3B4252', name: 'Recepcja' },
    { cols: 9, rows: 11, crateProb: 0.55, enemyMax: 2, enemySpeedMult: 1.05, time: 50, lane: false, floorA: '#DCEFE3', floorB: '#CBE3D3', wall: '#2F5548', name: 'Open Space' },
    { cols: 9, rows: 13, crateProb: 0.55, enemyMax: 3, enemySpeedMult: 1.10, time: 55, lane: true, floorA: '#E3E7F5', floorB: '#D0D8EF', wall: '#39415E', name: 'Sala Konferencyjna' },
    { cols: 13, rows: 15, crateProb: 0.58, enemyMax: 3, enemySpeedMult: 1.15, time: 65, lane: false, floorA: '#F2E7D0', floorB: '#E7D4A8', wall: '#5A4326', name: 'Archiwum' },
    { cols: 13, rows: 15, crateProb: 0.60, enemyMax: 3, enemySpeedMult: 1.20, time: 65, lane: true, floorA: '#DFE9F7', floorB: '#C4D9F0', wall: '#2E4766', name: 'Serwerownia' },
    { cols: 13, rows: 17, crateProb: 0.62, enemyMax: 4, enemySpeedMult: 1.25, time: 70, lane: false, floorA: '#F5E0E0', floorB: '#EFC4C4', wall: '#5A2E2E', name: 'Dział Marketingu' },
    { cols: 13, rows: 17, crateProb: 0.63, enemyMax: 4, enemySpeedMult: 1.30, time: 70, lane: true, floorA: '#EAEAEA', floorB: '#D6D6D6', wall: '#3A3A3A', name: 'Kuchnia Biurowa' },
    { cols: 15, rows: 17, crateProb: 0.65, enemyMax: 4, enemySpeedMult: 1.35, time: 75, lane: false, floorA: '#EDE3F5', floorB: '#DBC4EF', wall: '#3E2E5A', name: 'Gabinet Zarządu' },
    { cols: 15, rows: 17, crateProb: 0.68, enemyMax: 5, enemySpeedMult: 1.40, time: 80, lane: true, floorA: '#F5EFD0', floorB: '#EBDD9C', wall: '#5A4E1E', name: 'Skarbiec Faktur' },
    { cols: 15, rows: 19, crateProb: 0.72, enemyMax: 6, enemySpeedMult: 1.55, time: 90, lane: true, floorA: '#F0D9D9', floorB: '#E0AFAF', wall: '#5A1E1E', name: "PANIKA PRZED DEADLINE'M" },
  ];

  // Enemy roster — unlocked cumulatively as the player reaches minLevel.
  // weight controls how often a kind is picked once unlocked (rarer for tougher kinds).
  const ENEMY_KINDS = [
    { id: 'stapler', minLevel: 1, speedMult: 1.00, score: 50, weight: 5 },
    { id: 'printer', minLevel: 3, speedMult: 1.15, score: 65, weight: 4 },
    { id: 'mug', minLevel: 6, speedMult: 1.30, score: 85, weight: 3 },
  ];

  const playerSprite = new Image();
  playerSprite.src = 'assets/player.png?v=3';
  const PLAYER_SPRITE_ASPECT = 328 / 380; // width / height of assets/player.png

  // Embedded as a data URI (not a separate file request) so the lives/heart icon can never
  // fail to load due to a network hiccup, caching quirk, or asset path issue.
  const LOGO_DATA_URI = 'data:image/png;base64,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';
  const logoSprite = new Image();
  logoSprite.src = LOGO_DATA_URI;
  const LOGO_SPRITE_ASPECT = 300 / 167; // width / height of assets/logo.png (same crop as logo-white.png)

  // ---------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const screenMenu = $('screen-menu');
  const screenGame = $('screen-game');
  const screenResults = $('screen-results');
  const nickInput = $('nick-input');
  const playBtn = $('play-btn');
  const tutorialBtn = $('tutorial-btn');
  const menuError = $('menu-error');
  const miniBoardList = $('mini-board-list');
  const canvas = $('game-canvas');
  const ctx = canvas.getContext('2d');
  const hudLevel = $('hud-level');
  const hudTimer = $('hud-timer');
  const hudScore = $('hud-score');
  const hudLives = $('hud-lives');
  const levelBanner = $('level-banner');
  const levelBannerNum = $('level-banner-num');
  const levelBannerSub = $('level-banner-sub');
  const tutorialIntro = $('tutorial-intro');
  const introStartBtn = $('intro-start-btn');
  const quizScreen = $('quiz-screen');
  const quizImg = $('quiz-img');
  const quizQuestion = $('quiz-question');
  const quizAnswersWrap = $('quiz-answers');
  const quizPoints = $('quiz-points');
  const quizFeedback = $('quiz-feedback');
  const quizContinueBtn = $('quiz-continue-btn');
  const retryBtn = $('retry-btn');
  const menuBtn = $('menu-btn');
  const resultTitle = $('result-title');
  const resultSub = $('result-sub');
  const resultScore = $('result-score');
  const resultRank = $('result-rank');
  const resultBoardBody = $('result-board-body');
  const emailCapture = $('email-capture');
  const emailInput = $('email-input');
  const emailConsent = $('email-consent');
  const emailSubmitBtn = $('email-submit-btn');
  const emailSkipBtn = $('email-skip-btn');
  const emailNote = $('email-note');

  function showScreen(el) {
    [screenMenu, screenGame, screenResults].forEach((s) => (s.hidden = s !== el));
  }

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  let TILE = 48;
  let COLS = 13, ROWS = 9;
  let levelDef = LEVELS[0];
  let levelIdx = 1; // 1-based, 1..10
  let grid = [];
  let cratesRemaining = 0;
  let levelClearPending = false;
  let firstCrateDone = false;
  let lifeDropsThisLevel = 0;
  let timeDroppedThisLevel = false;
  let quizQueue = [];

  function shuffleQuizzes() {
    quizQueue = [...QUIZ_POOL];
    for (let i = quizQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [quizQueue[i], quizQueue[j]] = [quizQueue[j], quizQueue[i]];
    }
  }

  function lifeCap() { return levelIdx === 10 ? 2 : 1; }
  let player, enemies, bombs, explosions, powerups;
  let score = 0, lives = START_LIVES, timeLeft = 55;
  let running = false;
  let lastTs = 0;
  let nextEnemySpawnAt = 0;
  let currentNick = '';

  const keys = { up: false, down: false, left: false, right: false };

  function addScore(n) {
    if (levelDef.tutorial) return; // practice level never touches the real score
    score += n;
  }

  // ---------------------------------------------------------------------
  // Level generation
  // ---------------------------------------------------------------------
  function inBounds(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }

  function generateLevel(def) {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE_EMPTY));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) {
          grid[r][c] = TILE_WALL;
        } else if (r % 2 === 0 && c % 2 === 0) {
          grid[r][c] = TILE_WALL;
        }
      }
    }
    const clearZones = [
      [1, 1], [2, 1], [1, 2],
      [COLS - 2, 1], [COLS - 3, 1], [COLS - 2, 2],
      [1, ROWS - 2], [2, ROWS - 2], [1, ROWS - 3],
      [COLS - 2, ROWS - 2], [COLS - 3, ROWS - 2], [COLS - 2, ROWS - 3],
    ];
    const clearSet = new Set(clearZones.map(([c, r]) => `${c},${r}`));
    const midR = Math.floor(ROWS / 2), midC = Math.floor(COLS / 2);

    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (grid[r][c] !== TILE_EMPTY) continue;
        if (clearSet.has(`${c},${r}`)) continue;
        if (def.lane && (r === midR || c === midC)) continue;
        if (Math.random() < def.crateProb) grid[r][c] = TILE_CRATE;
      }
    }

    cratesRemaining = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === TILE_CRATE) cratesRemaining++;
      }
    }
  }

  function isSolid(c, r, ignoreBombAt) {
    if (!inBounds(c, r)) return true;
    if (grid[r][c] === TILE_WALL || grid[r][c] === TILE_CRATE) return true;
    if (bombs.some((b) => b.alive && b.c === c && b.r === r && !(ignoreBombAt && ignoreBombAt.c === c && ignoreBombAt.r === r))) {
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------
  // Entities
  // ---------------------------------------------------------------------
  function makePlayer(prev) {
    return {
      x: 1 * TILE, y: 1 * TILE,
      c: 1, r: 1,
      dir: 'down',
      moving: false,
      speed: prev ? prev.speed : PLAYER_SPEED,
      bombsMax: prev ? prev.bombsMax : 1,
      bombsActive: 0,
      range: prev ? prev.range : 1,
      invulnUntil: 0,
      standingOnBomb: null,
    };
  }

  function pickEnemyKind() {
    const pool = ENEMY_KINDS.filter((k) => k.minLevel <= levelIdx);
    const totalWeight = pool.reduce((sum, k) => sum + k.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const k of pool) {
      roll -= k.weight;
      if (roll <= 0) return k;
    }
    return pool[pool.length - 1];
  }

  const ENEMY_SAFE_SPAWN_TILES = 2.5; // minimum distance from the player a new enemy may spawn

  function spawnEnemy() {
    const corners = [
      [COLS - 2, 1], [1, ROWS - 2], [COLS - 2, ROWS - 2],
    ];
    const safeCorners = player
      ? corners.filter(([c, r]) => Math.hypot(c * TILE - player.x, r * TILE - player.y) > TILE * ENEMY_SAFE_SPAWN_TILES)
      : corners;
    if (safeCorners.length === 0) return false; // player is camping every spawn point — try again later

    const spot = safeCorners[Math.floor(Math.random() * safeCorners.length)];
    const kind = levelDef.tutorial ? ENEMY_KINDS[0] : pickEnemyKind();
    enemies.push({
      x: spot[0] * TILE, y: spot[1] * TILE,
      c: spot[0], r: spot[1],
      dir: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
      speed: ENEMY_SPEED_BASE * levelDef.enemySpeedMult * kind.speedMult,
      retargetAt: 0,
      alive: true,
      kind: kind.id,
      scoreValue: kind.score,
    });
    return true;
  }

  function startLevel(idx, prevPlayer) {
    levelIdx = idx;
    levelDef = idx === 0 ? TUTORIAL : LEVELS[idx - 1];
    COLS = levelDef.cols;
    ROWS = levelDef.rows;
    resizeCanvas();
    generateLevel(levelDef);
    player = makePlayer(prevPlayer);
    enemies = [];
    bombs = [];
    explosions = [];
    powerups = [];
    timeLeft = levelDef.time;
    levelClearPending = false;
    firstCrateDone = false;
    lifeDropsThisLevel = 0;
    timeDroppedThisLevel = false;
    nextEnemySpawnAt = performance.now() + ENEMY_RESPAWN_MS;
    if (levelDef.enemyMax > 0) spawnEnemy();
  }

  // ---------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------
  const KEY_MAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  function isTypingTarget(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  let lastKeyDir = null; // most-recently-pressed direction wins when two are held at once

  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(document.activeElement)) return;
    const dir = KEY_MAP[e.code];
    if (dir) { keys[dir] = true; lastKeyDir = dir; e.preventDefault(); }
    if (e.code === 'Space' && running) { placeBomb(); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    if (isTypingTarget(document.activeElement)) return;
    const dir = KEY_MAP[e.code];
    if (dir) {
      keys[dir] = false;
      e.preventDefault();
      if (lastKeyDir === dir) {
        lastKeyDir = ['up', 'down', 'left', 'right'].find((d) => keys[d]) || null;
      }
    }
  });
  // A key held down when the window/tab loses focus never gets its "keyup" — without this,
  // that direction stays stuck true forever, silently overriding whatever the player presses
  // next depending on axis priority. Clearing everything on blur is the standard fix.
  window.addEventListener('blur', () => {
    keys.up = keys.down = keys.left = keys.right = false;
    lastKeyDir = null;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      keys.up = keys.down = keys.left = keys.right = false;
      lastKeyDir = null;
    }
  });

  // Virtual joystick — always-visible base fixed in the left zone; drag the knob from its
  // center in any direction. Direction snaps to the nearest of the 4 cardinal directions
  // (grid movement, no diagonals).
  const joyZone = $('joystick-zone');
  const joyBase = $('joystick-base');
  const joyKnob = $('joystick-knob');
  if (joyZone && joyBase && joyKnob) {
    let joyPointerId = null;
    let centerX = 0, centerY = 0;
    const maxKnobTravel = 42; // px the knob can visually move from the base's center
    const deadZone = 10; // px of drag before a direction registers

    function clearJoyKeys() {
      keys.up = keys.down = keys.left = keys.right = false;
    }

    let lastJoyDir = null;

    function updateJoystick(clientX, clientY) {
      const dx = clientX - centerX, dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      const knobDist = Math.min(dist, maxKnobTravel);
      const angle = Math.atan2(dy, dx);
      joyKnob.style.transform = dist > 0
        ? `translate(${Math.cos(angle) * knobDist}px, ${Math.sin(angle) * knobDist}px)`
        : 'translate(0,0)';

      clearJoyKeys();
      if (dist < deadZone) { lastJoyDir = null; return; }

      // A few degrees of hysteresis around each 45° boundary so the direction doesn't flicker
      // between two directions when the thumb sits right on a boundary.
      const deg = angle * (180 / Math.PI);
      const bias = 6;
      const zones = [
        { dir: 'right', lo: -45 - (lastJoyDir === 'right' ? bias : 0), hi: 45 + (lastJoyDir === 'right' ? bias : 0) },
        { dir: 'down', lo: 45 - (lastJoyDir === 'down' ? bias : 0), hi: 135 + (lastJoyDir === 'down' ? bias : 0) },
        { dir: 'up', lo: -135 - (lastJoyDir === 'up' ? bias : 0), hi: -45 + (lastJoyDir === 'up' ? bias : 0) },
      ];
      let dir = zones.find((z) => deg > z.lo && deg <= z.hi)?.dir;
      if (!dir) dir = 'left'; // everything past ±135°
      lastJoyDir = dir;
      keys[dir] = true;
    }

    function resetJoystick() {
      joyPointerId = null;
      lastJoyDir = null;
      joyBase.classList.remove('armed');
      joyKnob.style.transform = 'translate(0,0)';
      clearJoyKeys();
    }

    joyZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      joyPointerId = e.pointerId;
      const baseRect = joyBase.getBoundingClientRect();
      centerX = baseRect.left + baseRect.width / 2;
      centerY = baseRect.top + baseRect.height / 2;
      joyBase.classList.add('armed');
      joyZone.setPointerCapture(e.pointerId);
      updateJoystick(e.clientX, e.clientY);
    });
    joyZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== joyPointerId) return;
      e.preventDefault();
      updateJoystick(e.clientX, e.clientY);
    });
    joyZone.addEventListener('pointerup', (e) => { if (e.pointerId === joyPointerId) resetJoystick(); });
    joyZone.addEventListener('pointercancel', (e) => { if (e.pointerId === joyPointerId) resetJoystick(); });
  }

  const bombZone = $('bomb-zone');
  if (bombZone) {
    bombZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      bombZone.classList.add('pressed');
      if (running) placeBomb();
    });
    const releaseBomb = () => bombZone.classList.remove('pressed');
    bombZone.addEventListener('pointerup', releaseBomb);
    bombZone.addEventListener('pointerleave', releaseBomb);
    bombZone.addEventListener('pointercancel', releaseBomb);
  }

  // Hard-block iOS Safari's pull-to-refresh / rubber-band scroll while the game screen is up —
  // CSS overscroll-behavior alone doesn't always catch it. Scrollable overlay cards (tutorial
  // briefing, quiz) are left alone so their own content can still scroll on short screens.
  document.addEventListener('touchmove', (e) => {
    if (screenGame.hidden) return;
    if (e.target.closest('.intro-card, .quiz-card, #touch-controls')) return;
    e.preventDefault();
  }, { passive: false });

  // Block iOS Safari pinch-to-zoom outright — it fires these non-standard gesture events
  // regardless of touch-action/viewport-meta settings, and multi-touch taps can trigger it
  // accidentally during play.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((evt) => {
    document.addEventListener(evt, (e) => e.preventDefault());
  });

  // ---------------------------------------------------------------------
  // Bombs / explosions
  // ---------------------------------------------------------------------
  function placeBomb() {
    if (player.bombsActive >= player.bombsMax) return;
    const c = Math.round(player.x / TILE), r = Math.round(player.y / TILE);
    if (bombs.some((b) => b.alive && b.c === c && b.r === r)) return;
    if (grid[r][c] !== TILE_EMPTY) return;
    const bomb = { c, r, placedAt: performance.now(), fuse: BOMB_FUSE, range: player.range, alive: true };
    bombs.push(bomb);
    player.bombsActive++;
    player.standingOnBomb = bomb;
  }

  function explodeBomb(bomb) {
    if (!bomb.alive) return;
    bomb.alive = false;
    player.bombsActive = Math.max(0, player.bombsActive - 1);

    const cells = [{ c: bomb.c, r: bomb.r }];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dc, dr] of dirs) {
      for (let i = 1; i <= bomb.range; i++) {
        const c = bomb.c + dc * i, r = bomb.r + dr * i;
        if (!inBounds(c, r) || grid[r][c] === TILE_WALL) break;
        cells.push({ c, r });
        if (grid[r][c] === TILE_CRATE) {
          grid[r][c] = TILE_EMPTY;
          addScore(SCORE.crate);
          cratesRemaining--;
          const lifeAllowed = LIFE_LEVELS.includes(levelIdx) && lifeDropsThisLevel < lifeCap();
          const forceTime = !timeDroppedThisLevel && cratesRemaining === 0;
          if (lifeAllowed && !firstCrateDone) {
            powerups.push({ c, r, type: 'life' });
            lifeDropsThisLevel++;
          } else if (forceTime) {
            powerups.push({ c, r, type: 'time' });
            timeDroppedThisLevel = true;
          } else if (Math.random() < POWERUP_CHANCE) {
            const pool = lifeAllowed ? [...POWERUP_TYPES, 'life'] : POWERUP_TYPES;
            const type = pool[Math.floor(Math.random() * pool.length)];
            if (type === 'life') lifeDropsThisLevel++;
            if (type === 'time') timeDroppedThisLevel = true;
            powerups.push({ c, r, type });
          }
          firstCrateDone = true;
          break;
        }
      }
    }
    explosions.push({ cells, startedAt: performance.now() });

    // chain reaction
    bombs.forEach((b) => {
      if (b.alive && cells.some((cell) => cell.c === b.c && cell.r === b.r)) explodeBomb(b);
    });

    // damage entities
    const hitSet = new Set(cells.map((c) => `${c.c},${c.r}`));
    const pc = Math.round(player.x / TILE), pr = Math.round(player.y / TILE);
    if (hitSet.has(`${pc},${pr}`)) damagePlayer();
    enemies.forEach((en) => {
      if (!en.alive) return;
      const ec = Math.round(en.x / TILE), er = Math.round(en.y / TILE);
      if (hitSet.has(`${ec},${er}`)) {
        en.alive = false;
        addScore(en.scoreValue || SCORE.enemy);
      }
    });

    if (cratesRemaining <= 0) levelClearPending = true;
  }

  function damagePlayer() {
    const now = performance.now();
    if (now < player.invulnUntil) return;
    lives--;
    player.invulnUntil = now + INVULN_MS;
    if (lives <= 0) endRun('dead');
  }

  // ---------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------
  function tryMove(dt) {
    let dx = 0, dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    player.moving = dx !== 0 || dy !== 0;
    if (!player.moving) return;

    // Cardinal movement only — when two directions are held at once, whichever was
    // pressed most recently wins instead of always favoring the horizontal axis.
    if (dx !== 0 && dy !== 0) {
      if (lastKeyDir === 'up' || lastKeyDir === 'down') dx = 0;
      else dy = 0;
    }
    if (dx > 0) player.dir = 'right';
    else if (dx < 0) player.dir = 'left';
    else if (dy > 0) player.dir = 'down';
    else if (dy < 0) player.dir = 'up';

    const dist = player.speed * TILE * dt;
    const margin = TILE * 0.24;

    // Corner-turn assist: while walking in a straight line, gently pull the player toward the
    // center of the perpendicular axis (never leaves the tile they're already standing in, so
    // it's always collision-safe). Without this, being even a couple pixels off-center is enough
    // for a turn to catch on the wall's edge — this is what "sliding into a corner" games rely on.
    const alignSpeed = player.speed * TILE * dt * 6;
    if (dx !== 0 && dy === 0) {
      const targetY = Math.round(player.y / TILE) * TILE;
      const diff = targetY - player.y;
      player.y += Math.abs(diff) < alignSpeed ? diff : Math.sign(diff) * alignSpeed;
    } else if (dy !== 0 && dx === 0) {
      const targetX = Math.round(player.x / TILE) * TILE;
      const diff = targetX - player.x;
      player.x += Math.abs(diff) < alignSpeed ? diff : Math.sign(diff) * alignSpeed;
    }

    if (dx !== 0) {
      const nx = player.x + dx * dist;
      const edgeX = dx > 0 ? nx + TILE - margin : nx + margin;
      const topR = Math.floor((player.y + margin) / TILE);
      const botR = Math.floor((player.y + TILE - margin) / TILE);
      const col = Math.floor(edgeX / TILE);
      const exempt = player.standingOnBomb;
      if (!isSolid(col, topR, exempt) && !isSolid(col, botR, exempt)) {
        player.x = nx;
      }
    }
    if (dy !== 0) {
      const ny = player.y + dy * dist;
      const edgeY = dy > 0 ? ny + TILE - margin : ny + margin;
      const leftC = Math.floor((player.x + margin) / TILE);
      const rightC = Math.floor((player.x + TILE - margin) / TILE);
      const row = Math.floor(edgeY / TILE);
      const exempt = player.standingOnBomb;
      if (!isSolid(leftC, row, exempt) && !isSolid(rightC, row, exempt)) {
        player.y = ny;
      }
    }

    player.c = Math.round(player.x / TILE);
    player.r = Math.round(player.y / TILE);
    if (player.standingOnBomb && (player.c !== player.standingOnBomb.c || player.r !== player.standingOnBomb.r)) {
      player.standingOnBomb = null;
    }
  }

  function updateEnemies(dt, now) {
    for (const en of enemies) {
      if (!en.alive) continue;
      if (now > en.retargetAt) {
        const dirs = ['up', 'down', 'left', 'right'].filter((d) => {
          const [dc, dr] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
          const c = Math.round(en.x / TILE) + dc, r = Math.round(en.y / TILE) + dr;
          return !isSolid(c, r);
        });
        en.dir = dirs.length ? dirs[Math.floor(Math.random() * dirs.length)] : en.dir;
        en.retargetAt = now + 900 + Math.random() * 900;
      }
      const [dc, dr] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[en.dir];
      const dist = en.speed * TILE * dt;
      const nx = en.x + dc * dist, ny = en.y + dr * dist;
      const c = Math.floor((nx + TILE / 2) / TILE), r = Math.floor((ny + TILE / 2) / TILE);
      if (!isSolid(c, r)) {
        en.x = nx; en.y = ny;
      } else {
        en.retargetAt = 0;
      }
      en.c = Math.round(en.x / TILE);
      en.r = Math.round(en.y / TILE);

      if (Math.abs(en.x - player.x) < TILE * 0.72 && Math.abs(en.y - player.y) < TILE * 0.72) {
        damagePlayer();
      }
    }
    enemies = enemies.filter((en) => en.alive);
    if (enemies.length < levelDef.enemyMax && now > nextEnemySpawnAt) {
      const spawned = spawnEnemy();
      nextEnemySpawnAt = now + (spawned ? ENEMY_RESPAWN_MS : 400);
    }
  }

  function updatePowerups() {
    const pc = Math.round(player.x / TILE), pr = Math.round(player.y / TILE);
    const enemyCells = levelIdx >= 2
      ? enemies.filter((e) => e.alive).map((e) => ({ c: Math.round(e.x / TILE), r: Math.round(e.y / TILE) }))
      : [];
    powerups = powerups.filter((p) => {
      if (p.c === pc && p.r === pr) {
        applyPowerup(p.type);
        addScore(SCORE.powerup);
        return false;
      }
      if (enemyCells.some((ec) => ec.c === p.c && ec.r === p.r)) {
        return false; // an enemy got to it first
      }
      return true;
    });
  }

  function applyPowerup(type) {
    if (type === 'speed') player.speed = Math.min(player.speed + 0.5, 5.5);
    else if (type === 'range') player.range = Math.min(player.range + 1, 6);
    else if (type === 'bomb') player.bombsMax = Math.min(player.bombsMax + 1, 4);
    else if (type === 'time') timeLeft = Math.min(timeLeft + 5, levelDef.time + 30);
    else if (type === 'life') lives = Math.min(lives + 1, MAX_LIVES);
  }

  function update(dt) {
    const now = performance.now();
    tryMove(dt);
    updateEnemies(dt, now);
    updatePowerups();

    bombs.forEach((b) => {
      if (b.alive && now - b.placedAt >= b.fuse) explodeBomb(b);
    });
    bombs = bombs.filter((b) => b.alive || now - b.placedAt < b.fuse + EXPLOSION_LIFE);
    explosions = explosions.filter((ex) => now - ex.startedAt < EXPLOSION_LIFE);

    if (levelClearPending) {
      levelClearPending = false;
      handleLevelClear();
      return;
    }

    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      if (levelDef.tutorial) { levelClearPending = true; }
      else { endRun('time'); return; }
    }

    hudLevel.textContent = levelDef.tutorial ? '🎓 Samouczek' : `🏢 ${levelIdx}/${LEVELS.length}`;
    hudTimer.textContent = `⏱ ${Math.ceil(timeLeft)}`;
    hudTimer.classList.toggle('low', timeLeft <= 10);
    hudScore.textContent = `✨ ${score}`;
    renderLives();
  }

  function handleLevelClear() {
    running = false;
    const wasTutorial = levelDef.tutorial;
    if (wasTutorial) {
      localStorage.setItem('kbk-tutorial-done', '1');
      lives = START_LIVES; // any damage taken during the tutorial never carries into the real game
    }

    const bonus = LEVEL_CLEAR_BASE + Math.round(timeLeft) * 2;
    addScore(bonus);
    hudScore.textContent = `✨ ${score}`;

    if (levelIdx >= LEVELS.length) {
      endRun('victory');
      return;
    }

    const nextIdx = levelIdx + 1;
    const nextDef = LEVELS[nextIdx - 1];
    levelBannerNum.textContent = wasTutorial ? 'START!' : `POZIOM ${nextIdx}`;
    levelBannerSub.textContent = wasTutorial
      ? `Powodzenia! • ${nextDef.name}`
      : `+${bonus} pkt bonusu • ${nextDef.name}`;
    levelBanner.hidden = false;

    setTimeout(() => {
      levelBanner.hidden = true;
      const prevPlayer = player;
      const proceed = () => { startLevel(nextIdx, prevPlayer); beginLoop(); };
      const quiz = quizQueue[nextIdx - 2];
      if (quiz) showQuiz(quiz, proceed);
      else proceed();
    }, LEVEL_BANNER_MS);
  }

  function renderLives() {
    hudLives.innerHTML = '';
    const slots = Math.max(START_LIVES, lives);
    for (let i = 0; i < slots; i++) {
      const img = document.createElement('img');
      img.className = 'life-icon' + (i < lives ? '' : ' lost');
      img.src = LOGO_DATA_URI;
      img.alt = '';
      hudLives.appendChild(img);
    }
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------
  function roundRect(x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r + amt)));
    g = Math.max(0, Math.min(255, Math.round(g + amt)));
    b = Math.max(0, Math.min(255, Math.round(b + amt)));
    return `rgb(${r},${g},${b})`;
  }

  function drawFloor() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? levelDef.floorA : levelDef.floorB;
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }

  function drawWall(c, r) {
    const x = c * TILE, y = r * TILE;
    const base = levelDef.wall;
    ctx.fillStyle = base;
    roundRect(x + 2, y + 2, TILE - 4, TILE - 4, 5);
    ctx.fill();
    ctx.fillStyle = shade(base, 24);
    ctx.fillRect(x + 5, y + 6, TILE - 10, TILE * 0.4);
    ctx.fillRect(x + 5, y + TILE * 0.52, TILE - 10, TILE * 0.4);
    ctx.fillStyle = shade(base, 90);
    ctx.beginPath();
    ctx.arc(x + TILE - 11, y + TILE * 0.26, 2.4, 0, Math.PI * 2);
    ctx.arc(x + TILE - 11, y + TILE * 0.72, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCrate(c, r) {
    const x = c * TILE, y = r * TILE;
    ctx.fillStyle = '#C89A5B';
    roundRect(x + 4, y + 4, TILE - 8, TILE - 8, 4);
    ctx.fill();
    ctx.strokeStyle = '#8F6B36';
    ctx.lineWidth = 2;
    roundRect(x + 4, y + 4, TILE - 8, TILE - 8, 4);
    ctx.stroke();
    ctx.strokeStyle = '#A9793F';
    ctx.beginPath();
    ctx.moveTo(x + TILE / 2, y + 4); ctx.lineTo(x + TILE / 2, y + TILE - 4);
    ctx.moveTo(x + 4, y + TILE / 2); ctx.lineTo(x + TILE - 4, y + TILE / 2);
    ctx.stroke();
  }

  function drawBomb(bomb, now) {
    const x = bomb.c * TILE + TILE / 2, y = bomb.r * TILE + TILE / 2;
    const t = (now - bomb.placedAt) / bomb.fuse;
    const pulse = 1 + Math.sin(t * 26) * 0.06 * t;
    const rad = TILE * 0.32 * pulse;
    ctx.fillStyle = '#1B1B1F';
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath(); ctx.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.32, 0, Math.PI * 2); ctx.fill();

    // paperclip on top
    ctx.strokeStyle = '#E31E24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y - rad - 4, 4, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y - rad - 2, 2.2, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (Math.floor(t * 10) % 2 === 0) {
      ctx.fillStyle = '#FFB020';
      ctx.beginPath();
      ctx.arc(x + 6, y - rad - 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawExplosion(ex, now) {
    const t = (now - ex.startedAt) / EXPLOSION_LIFE;
    const alpha = 1 - t;
    for (const cell of ex.cells) {
      const x = cell.c * TILE, y = cell.r * TILE;
      const grad = ctx.createRadialGradient(
        x + TILE / 2, y + TILE / 2, 2,
        x + TILE / 2, y + TILE / 2, TILE * 0.7
      );
      grad.addColorStop(0, `rgba(255,235,180,${alpha})`);
      grad.addColorStop(0.5, `rgba(255,176,32,${alpha * 0.9})`);
      grad.addColorStop(1, `rgba(255,107,53,0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, TILE, TILE);
    }
  }

  const POWERUP_ICON = { range: '📎', bomb: '🧷', speed: '☕', time: '⏰' };

  function drawPowerup(p) {
    const x = p.c * TILE + TILE / 2, y = p.r * TILE + TILE / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = TILE * 0.12;
    if (p.type === 'life') {
      if (logoSprite.complete && logoSprite.naturalWidth > 0) {
        const h = TILE * 0.56;
        const w = h * LOGO_SPRITE_ASPECT;
        ctx.drawImage(logoSprite, x - w / 2, y - h / 2, w, h);
      }
      ctx.restore();
      return;
    }
    ctx.font = `${TILE * 0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(POWERUP_ICON[p.type] || '★', x, y + 1);
    ctx.restore();
  }

  function drawPlayer(now) {
    const flash = now < player.invulnUntil && Math.floor(now / 100) % 2 === 0;
    if (flash) ctx.globalAlpha = 0.4;
    const cx = player.x + TILE / 2, cy = player.y + TILE / 2;
    const bob = player.moving ? Math.sin(now / 90) * 2 : 0;
    ctx.save();
    ctx.translate(cx, cy + bob);
    if (player.dir === 'left') ctx.scale(-1, 1);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(0, TILE * 0.36, TILE * 0.26, TILE * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    if (playerSprite.complete && playerSprite.naturalWidth > 0) {
      const h = TILE * 1.4;
      const w = h * PLAYER_SPRITE_ASPECT;
      const squash = player.moving ? 1 - Math.abs(Math.sin(now / 90)) * 0.05 : 1;
      ctx.drawImage(playerSprite, -w / 2, -h * 0.58 * squash, w, h * squash);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawEnemyEyes(y, glow) {
    const dx = TILE * 0.086, r = TILE * (glow ? 0.046 : 0.079), pr = TILE * (glow ? 0 : 0.034);
    ctx.fillStyle = glow ? '#FF4136' : '#fff';
    ctx.beginPath();
    ctx.arc(-dx, y, r, 0, Math.PI * 2);
    ctx.arc(dx, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (glow) {
      ctx.fillStyle = 'rgba(255,65,54,.35)';
      ctx.beginPath();
      ctx.arc(-dx, y, TILE * 0.086, 0, Math.PI * 2);
      ctx.arc(dx, y, TILE * 0.086, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#B0121B';
      ctx.beginPath();
      ctx.arc(-dx, y, pr, 0, Math.PI * 2);
      ctx.arc(dx, y, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStapler() {
    ctx.fillStyle = '#6B7280';
    roundRect(-TILE * 0.28, -TILE * 0.26, TILE * 0.56, TILE * 0.5, TILE * 0.11);
    ctx.fill();
    ctx.fillStyle = '#565D6B';
    ctx.fillRect(-TILE * 0.28, TILE * 0.02, TILE * 0.56, TILE * 0.08);
    drawEnemyEyes(-TILE * 0.057, false);
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = Math.max(1.4, TILE * 0.023);
    ctx.beginPath();
    ctx.moveTo(-TILE * 0.071, TILE * 0.114); ctx.lineTo(TILE * 0.071, TILE * 0.114);
    ctx.stroke();
  }

  function drawPrinter(now) {
    ctx.fillStyle = '#3A3E46';
    roundRect(-TILE * 0.3, -TILE * 0.27, TILE * 0.6, TILE * 0.52, TILE * 0.09);
    ctx.fill();
    ctx.fillStyle = '#EDEDED';
    ctx.fillRect(-TILE * 0.24, -TILE * 0.02, TILE * 0.48, TILE * 0.09);
    const blink = Math.floor(now / 400) % 2 === 0;
    ctx.fillStyle = blink ? '#FF4136' : '#7A1F1A';
    ctx.beginPath();
    ctx.arc(TILE * 0.2, -TILE * 0.18, TILE * 0.037, 0, Math.PI * 2);
    ctx.fill();
    // jammed paper corner
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-TILE * 0.18, TILE * 0.16);
    ctx.lineTo(-TILE * 0.06, TILE * 0.16);
    ctx.lineTo(-TILE * 0.12, TILE * 0.26);
    ctx.closePath();
    ctx.fill();
    drawEnemyEyes(-TILE * 0.171, false);
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = Math.max(1.2, TILE * 0.02);
    ctx.beginPath();
    ctx.arc(0, TILE * 0.086, TILE * 0.043, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawMug(now) {
    ctx.strokeStyle = '#8B5A2B';
    ctx.lineWidth = Math.max(2.5, TILE * 0.057);
    ctx.beginPath();
    ctx.arc(TILE * 0.22, 0, TILE * 0.1, -1.1, 1.1);
    ctx.stroke();
    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.arc(0, 2, TILE * 0.26, 0, Math.PI * 2);
    ctx.fill();
    const steamY = -TILE * 0.28 + Math.sin(now / 300) * 2;
    ctx.strokeStyle = 'rgba(180,180,180,.7)';
    ctx.lineWidth = Math.max(1.2, TILE * 0.023);
    const sx = TILE * 0.086, sx2 = TILE * 0.129, sx3 = TILE * 0.071, sx4 = TILE * 0.029;
    ctx.beginPath();
    ctx.moveTo(-sx, steamY + sx); ctx.quadraticCurveTo(-sx2, steamY, -sx, steamY - sx);
    ctx.moveTo(sx3, steamY + sx); ctx.quadraticCurveTo(sx4, steamY, sx3, steamY - sx);
    ctx.stroke();
    drawEnemyEyes(-TILE * 0.029, false);
    ctx.strokeStyle = '#4A2E12';
    ctx.lineWidth = Math.max(1.2, TILE * 0.023);
    ctx.beginPath();
    ctx.arc(0, TILE * 0.129, TILE * 0.05, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  function drawEnemy(en, now) {
    const cx = en.x + TILE / 2, cy = en.y + TILE / 2;
    const bob = Math.sin(now / 140 + en.c) * 1.6;
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(0, TILE * 0.32, TILE * 0.24, TILE * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(1.14, 1.14); // slightly bigger bodies — easier to see and to judge collisions against
    switch (en.kind) {
      case 'printer': drawPrinter(now); break;
      case 'mug': drawMug(now); break;
      default: drawStapler();
    }

    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFloor();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === TILE_WALL) drawWall(c, r);
        else if (grid[r][c] === TILE_CRATE) drawCrate(c, r);
      }
    }
    powerups.forEach(drawPowerup);
    const now = performance.now();
    bombs.forEach((b) => { if (b.alive) drawBomb(b, now); });
    explosions.forEach((ex) => drawExplosion(ex, now));
    enemies.forEach((en) => drawEnemy(en, now));
    drawPlayer(now);
  }

  // ---------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------
  function loop(ts) {
    if (!running) return;
    const dt = Math.min((ts - lastTs) / 1000, 0.05) || 0;
    lastTs = ts;
    update(dt);
    render();
    if (running) requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------------
  // Sizing
  // ---------------------------------------------------------------------
  function resizeCanvas() {
    const wrap = $('canvas-wrap');
    const availW = wrap.clientWidth - 6;
    const availH = wrap.clientHeight - 6;
    TILE = Math.max(20, Math.floor(Math.min(availW / COLS, availH / ROWS)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${TILE * COLS}px`;
    canvas.style.height = `${TILE * ROWS}px`;
    canvas.width = TILE * COLS * dpr;
    canvas.height = TILE * ROWS * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', () => { if (!screenGame.hidden && !running) resizeCanvas(); });

  // ---------------------------------------------------------------------
  // Run lifecycle
  // ---------------------------------------------------------------------
  function beginLoop() {
    running = true;
    lastTs = performance.now();
    requestAnimationFrame(loop);
  }

  function startRun(nick, forceTutorial) {
    currentNick = nick;
    showScreen(screenGame);
    levelBanner.hidden = true;
    score = 0;
    lives = START_LIVES;
    shuffleQuizzes();
    // Populate the HUD (lives row included) BEFORE startLevel() measures the available
    // canvas size — otherwise the board gets sized against a shorter, lives-less HUD and
    // ends up too tall once the lives icons appear, overlapping/hiding them.
    renderLives();
    hudScore.textContent = `✨ ${score}`;
    const skipTutorial = !forceTutorial && localStorage.getItem('kbk-tutorial-done') === '1';
    startLevel(skipTutorial ? 1 : 0, null);
    hudTimer.textContent = `⏱ ${Math.ceil(timeLeft)}`;
    hudLevel.textContent = levelDef.tutorial ? '🎓 Samouczek' : `🏢 ${levelIdx}/${LEVELS.length}`;
    render();
    if (skipTutorial) {
      beginLoop();
    } else {
      // Freeze on the briefing screen until the player is ready — nothing moves or counts down yet.
      running = false;
      if (tutorialIntro) tutorialIntro.hidden = false;
    }
  }

  if (introStartBtn) {
    introStartBtn.addEventListener('click', () => {
      tutorialIntro.hidden = true;
      beginLoop();
    });
  }

  let quizAnswered = false;
  let quizOnDone = null;
  let quizCorrectValue = null;

  function showQuiz(quiz, onDone) {
    quizOnDone = onDone;
    quizAnswered = false;
    quizCorrectValue = quiz.correct;
    quizImg.src = quiz.img;
    quizImg.alt = quiz.alt || '';
    quizQuestion.innerHTML = quiz.question;
    if (quizPoints) quizPoints.textContent = `za poprawną odpowiedź: +${QUIZ_BONUS} pkt`;
    quizFeedback.textContent = '';
    quizFeedback.className = 'quiz-feedback';
    quizContinueBtn.hidden = true;

    quizAnswersWrap.innerHTML = '';
    quiz.answers.forEach((a) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-answer';
      btn.dataset.value = a.v;
      btn.textContent = a.label;
      btn.addEventListener('click', () => onQuizAnswer(btn));
      quizAnswersWrap.appendChild(btn);
    });

    quizScreen.hidden = false;
  }

  function onQuizAnswer(btn) {
    if (quizAnswered) return;
    quizAnswered = true;
    const buttons = Array.from(quizAnswersWrap.children);
    const isCorrect = btn.dataset.value === quizCorrectValue;
    buttons.forEach((b) => {
      b.disabled = true;
      if (b.dataset.value === quizCorrectValue) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });
    if (isCorrect) {
      addScore(QUIZ_BONUS);
      quizFeedback.textContent = `✅ Dobrze! +${QUIZ_BONUS} pkt`;
      quizFeedback.className = 'quiz-feedback show correct';
    } else {
      const correctLabel = buttons.find((b) => b.dataset.value === quizCorrectValue)?.textContent || '';
      quizFeedback.textContent = `❌ Źle — poprawna odpowiedź: ${correctLabel} (+0 pkt)`;
      quizFeedback.className = 'quiz-feedback show wrong';
    }
    quizContinueBtn.hidden = false;
  }

  quizContinueBtn.addEventListener('click', () => {
    quizScreen.hidden = true;
    if (quizOnDone) { quizOnDone(); quizOnDone = null; }
  });

  async function endRun(reason) {
    running = false;
    keys.up = keys.down = keys.left = keys.right = false;

    if (reason === 'victory') {
      resultTitle.textContent = 'Ukończone wszystkie 10 poziomów!';
      resultSub.textContent = 'Legenda open space’u. Szacunek.';
    } else if (reason === 'dead') {
      resultTitle.textContent = 'Wypadek przy biurku!';
      resultSub.textContent = `Dotarłeś do poziomu ${levelIdx}/${LEVELS.length}. Uważaj na zbuntowane zszywacze następnym razem.`;
    } else {
      resultTitle.textContent = 'Koniec czasu!';
      resultSub.textContent = `Dotarłeś do poziomu ${levelIdx}/${LEVELS.length}. Ale akcja w open space!`;
    }
    resultScore.textContent = String(score);
    showScreen(screenResults);

    emailNote.hidden = true;
    emailInput.value = '';
    emailConsent.checked = true;

    loadLeaderboard(resultBoardBody, currentNick);
    loadLeaderboard(null, null, miniBoardList);

    if (localStorage.getItem('kbk-office-email-given')) {
      emailCapture.hidden = true;
      resultRank.textContent = 'Wysyłanie wyniku…';
      await submitToLeaderboard();
    } else {
      emailCapture.hidden = false;
      resultRank.textContent = 'Podaj maila, aby zapisać wynik w rankingu.';
    }
  }

  async function submitToLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick: currentNick, score }),
      });
      const data = await res.json();
      if (data.rank) {
        resultRank.textContent = data.improved
          ? `Nowy rekord! Miejsce #${data.rank}`
          : `Twoje najlepsze miejsce: #${data.rank}`;
      } else {
        resultRank.textContent = 'Wynik zapisany.';
      }
    } catch {
      resultRank.textContent = 'Nie udało się zapisać wyniku (offline?).';
    }

    loadLeaderboard(resultBoardBody, currentNick);
    loadLeaderboard(null, null, miniBoardList);
  }

  emailSkipBtn.addEventListener('click', () => {
    emailCapture.hidden = true;
    resultRank.textContent = 'Wynik nie trafił do rankingu — bez maila nie zapisujemy wyniku.';
  });

  emailSubmitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailNote.hidden = false;
      emailNote.textContent = 'Podaj poprawny adres e-mail.';
      return;
    }
    if (!emailConsent.checked) {
      emailNote.hidden = false;
      emailNote.textContent = 'Zaznacz zgodę, żeby zapisać e-mail.';
      return;
    }
    emailSubmitBtn.disabled = true;
    emailNote.hidden = false;
    emailNote.textContent = 'Zapisywanie…';
    try {
      const res = await fetch('/api/collect-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nick: currentNick, score, consent: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd zapisu.');

      localStorage.setItem('kbk-office-email-given', '1');

      emailNote.textContent = 'Zapisano! Dzięki!';
      resultRank.textContent = 'Wysyłanie wyniku…';
      await submitToLeaderboard();
      setTimeout(() => { emailCapture.hidden = true; }, 1200);
    } catch (err) {
      emailNote.textContent = 'Nie udało się zapisać (spróbuj ponownie).';
    } finally {
      emailSubmitBtn.disabled = false;
    }
  });

  // ---------------------------------------------------------------------
  // Leaderboard
  // ---------------------------------------------------------------------
  const MEDALS = ['🥇', '🥈', '🥉'];

  async function loadLeaderboard(tbody, highlightNick, miniEl) {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      const list = data.leaderboard || [];

      if (tbody) {
        tbody.innerHTML = '';
        if (!list.length) {
          tbody.innerHTML = '<tr><td colspan="3" style="opacity:.6;padding:10px 6px;">Bądź pierwszy w rankingu!</td></tr>';
        }
        list.forEach((entry, i) => {
          const tr = document.createElement('tr');
          if (highlightNick && entry.nick === highlightNick) tr.className = 'me';
          const medal = MEDALS[i] || '';
          tr.innerHTML = `<td class="rank">${medal || i + 1}</td><td>${escapeHtml(entry.nick)}</td><td class="score">${entry.score}</td>`;
          tbody.appendChild(tr);
        });
      }

      if (miniEl) {
        miniEl.innerHTML = '';
        const top = list.slice(0, 7);
        if (!top.length) {
          miniEl.innerHTML = '<div class="mini-row"><span class="mini-nick" style="opacity:.5">Nikt jeszcze nie grał — może Ty?</span></div>';
        }
        top.forEach((entry, i) => {
          const row = document.createElement('div');
          row.className = 'mini-row';
          row.innerHTML = `<span class="mini-rank">${MEDALS[i] || i + 1}</span><span class="mini-nick">${escapeHtml(entry.nick)}</span><span class="mini-score">${entry.score}</span>`;
          miniEl.appendChild(row);
        });
      }
    } catch {
      if (miniEl) miniEl.innerHTML = '<div class="mini-row"><span class="mini-nick" style="opacity:.5">Ranking niedostępny</span></div>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // ---------------------------------------------------------------------
  // Menu wiring
  // ---------------------------------------------------------------------
  function validateNick(v) {
    const trimmed = v.trim();
    if (trimmed.length < 2) return 'Nick musi mieć min. 2 znaki.';
    if (trimmed.length > 20) return 'Nick może mieć max. 20 znaków.';
    if (!/^[\p{L}0-9 _.\-]+$/u.test(trimmed)) return 'Dozwolone: litery, cyfry, spacje, - _ .';
    return null;
  }

  playBtn.addEventListener('click', () => {
    const err = validateNick(nickInput.value);
    if (err) { menuError.textContent = err; return; }
    menuError.textContent = '';
    localStorage.setItem('kbk-office-nick', nickInput.value.trim());
    startRun(nickInput.value.trim());
  });
  nickInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') playBtn.click(); });

  if (tutorialBtn) {
    tutorialBtn.addEventListener('click', () => {
      const err = validateNick(nickInput.value);
      if (err) { menuError.textContent = err; return; }
      menuError.textContent = '';
      localStorage.setItem('kbk-office-nick', nickInput.value.trim());
      startRun(nickInput.value.trim(), true);
    });
  }


  retryBtn.addEventListener('click', () => startRun(currentNick));
  menuBtn.addEventListener('click', () => showScreen(screenMenu));

  const savedNick = localStorage.getItem('kbk-office-nick');
  if (savedNick) nickInput.value = savedNick;

  loadLeaderboard(null, null, miniBoardList);
})();
