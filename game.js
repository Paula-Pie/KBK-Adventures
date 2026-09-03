(() => {
  'use strict';

  // ---------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------
  const COLS = 13, ROWS = 9;
  const GAME_TIME = 90; // seconds
  const START_LIVES = 3;
  const BOMB_FUSE = 1800; // ms
  const EXPLOSION_LIFE = 380; // ms
  const INVULN_MS = 1500;
  const PLAYER_SPEED = 3.4; // tiles/sec
  const ENEMY_SPEED = 1.5;
  const MAX_ENEMIES = 3;
  const ENEMY_RESPAWN_MS = 4500;
  const CRATE_PROB = 0.55;
  const POWERUP_CHANCE = 0.32;
  const SCORE = { crate: 10, enemy: 50, powerup: 5 };

  const TILE_EMPTY = 0, TILE_WALL = 1, TILE_CRATE = 2;
  const POWERUP_TYPES = ['speed', 'range', 'bomb', 'time'];

  const playerSprite = new Image();
  playerSprite.src = 'assets/player.png';
  const PLAYER_SPRITE_ASPECT = 165 / 205; // width / height of assets/player.png

  // ---------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const screenMenu = $('screen-menu');
  const screenGame = $('screen-game');
  const screenResults = $('screen-results');
  const nickInput = $('nick-input');
  const playBtn = $('play-btn');
  const menuError = $('menu-error');
  const miniBoardList = $('mini-board-list');
  const canvas = $('game-canvas');
  const ctx = canvas.getContext('2d');
  const hudTimer = $('hud-timer');
  const hudScore = $('hud-score');
  const hudLives = $('hud-lives');
  const retryBtn = $('retry-btn');
  const menuBtn = $('menu-btn');
  const resultTitle = $('result-title');
  const resultSub = $('result-sub');
  const resultScore = $('result-score');
  const resultRank = $('result-rank');
  const resultBoardBody = $('result-board-body');

  function showScreen(el) {
    [screenMenu, screenGame, screenResults].forEach((s) => (s.hidden = s !== el));
  }

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  let TILE = 48;
  let grid = [];
  let player, enemies, bombs, explosions, powerups;
  let score = 0, lives = START_LIVES, timeLeft = GAME_TIME;
  let running = false;
  let lastTs = 0;
  let nextEnemySpawnAt = 0;
  let currentNick = '';

  const keys = { up: false, down: false, left: false, right: false };

  // ---------------------------------------------------------------------
  // Level generation
  // ---------------------------------------------------------------------
  function inBounds(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }

  function generateLevel() {
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

    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (grid[r][c] !== TILE_EMPTY) continue;
        if (clearSet.has(`${c},${r}`)) continue;
        if (Math.random() < CRATE_PROB) grid[r][c] = TILE_CRATE;
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
  function makePlayer() {
    return {
      x: 1 * TILE, y: 1 * TILE,
      c: 1, r: 1,
      dir: 'down',
      moving: false,
      speed: PLAYER_SPEED,
      bombsMax: 1, bombsActive: 0,
      range: 1,
      invulnUntil: 0,
      standingOnBomb: null,
    };
  }

  function spawnEnemy() {
    const corners = [
      [COLS - 2, 1], [1, ROWS - 2], [COLS - 2, ROWS - 2],
    ];
    const spot = corners[Math.floor(Math.random() * corners.length)];
    enemies.push({
      x: spot[0] * TILE, y: spot[1] * TILE,
      c: spot[0], r: spot[1],
      dir: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
      speed: ENEMY_SPEED,
      retargetAt: 0,
      alive: true,
    });
  }

  function resetRunState() {
    generateLevel();
    player = makePlayer();
    enemies = [];
    bombs = [];
    explosions = [];
    powerups = [];
    score = 0;
    lives = START_LIVES;
    timeLeft = GAME_TIME;
    nextEnemySpawnAt = 800;
    spawnEnemy();
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

  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(document.activeElement)) return;
    if (KEY_MAP[e.code]) { keys[KEY_MAP[e.code]] = true; e.preventDefault(); }
    if (e.code === 'Space' && running) { placeBomb(); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    if (isTypingTarget(document.activeElement)) return;
    if (KEY_MAP[e.code]) { keys[KEY_MAP[e.code]] = false; e.preventDefault(); }
  });

  function bindHold(el, dir) {
    const on = (e) => { keys[dir] = true; e.preventDefault(); };
    const off = (e) => { keys[dir] = false; e.preventDefault(); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointerleave', off);
    el.addEventListener('pointercancel', off);
  }
  bindHold($('dpad-up'), 'up');
  bindHold($('dpad-down'), 'down');
  bindHold($('dpad-left'), 'left');
  bindHold($('dpad-right'), 'right');
  $('bomb-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); if (running) placeBomb(); });

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
          score += SCORE.crate;
          if (Math.random() < POWERUP_CHANCE) {
            powerups.push({ c, r, type: POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)] });
          }
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
        score += SCORE.enemy;
      }
    });
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

    if (dx !== 0 && dy !== 0) { dy = 0; } // cardinal movement only
    if (dx > 0) player.dir = 'right';
    else if (dx < 0) player.dir = 'left';
    else if (dy > 0) player.dir = 'down';
    else if (dy < 0) player.dir = 'up';

    const dist = player.speed * TILE * dt;
    const margin = TILE * 0.28;

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
      const margin = TILE * 0.3;
      const c = Math.floor((nx + TILE / 2) / TILE), r = Math.floor((ny + TILE / 2) / TILE);
      if (!isSolid(c, r)) {
        en.x = nx; en.y = ny;
      } else {
        en.retargetAt = 0;
      }
      en.c = Math.round(en.x / TILE);
      en.r = Math.round(en.y / TILE);

      const pc = Math.round(player.x / TILE), pr = Math.round(player.y / TILE);
      if (Math.abs(en.x - player.x) < TILE * 0.6 && Math.abs(en.y - player.y) < TILE * 0.6) {
        damagePlayer();
      }
    }
    enemies = enemies.filter((en) => en.alive);
    if (enemies.length < MAX_ENEMIES && now > nextEnemySpawnAt) {
      spawnEnemy();
      nextEnemySpawnAt = now + ENEMY_RESPAWN_MS;
    }
  }

  function updatePowerups() {
    const pc = Math.round(player.x / TILE), pr = Math.round(player.y / TILE);
    powerups = powerups.filter((p) => {
      if (p.c === pc && p.r === pr) {
        applyPowerup(p.type);
        score += SCORE.powerup;
        return false;
      }
      return true;
    });
  }

  function applyPowerup(type) {
    if (type === 'speed') player.speed = Math.min(player.speed + 0.5, 5.5);
    else if (type === 'range') player.range = Math.min(player.range + 1, 6);
    else if (type === 'bomb') player.bombsMax = Math.min(player.bombsMax + 1, 4);
    else if (type === 'time') timeLeft = Math.min(timeLeft + 5, GAME_TIME + 30);
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

    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; endRun('time'); }

    hudTimer.textContent = `⏱ ${Math.ceil(timeLeft)}`;
    hudTimer.classList.toggle('low', timeLeft <= 10);
    hudScore.textContent = `✨ ${score}`;
    renderLives();
  }

  function renderLives() {
    hudLives.innerHTML = '';
    for (let i = 0; i < START_LIVES; i++) {
      const span = document.createElement('span');
      span.className = 'life-icon' + (i < lives ? '' : ' lost');
      span.textContent = '📎';
      hudLives.appendChild(span);
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

  function drawFloor() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#E7DFCC' : '#DED4BC';
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }

  function drawWall(c, r) {
    const x = c * TILE, y = r * TILE;
    ctx.fillStyle = '#3B4252';
    roundRect(x + 2, y + 2, TILE - 4, TILE - 4, 5);
    ctx.fill();
    ctx.fillStyle = '#4B5468';
    ctx.fillRect(x + 5, y + 6, TILE - 10, TILE * 0.4);
    ctx.fillRect(x + 5, y + TILE * 0.52, TILE - 10, TILE * 0.4);
    ctx.fillStyle = '#8B95A8';
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

  const POWERUP_ICON = { speed: '☕', range: '📎', bomb: '🧷', time: '⏱️' };
  function drawPowerup(p) {
    const x = p.c * TILE + TILE / 2, y = p.r * TILE + TILE / 2;
    ctx.font = `${TILE * 0.55}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(POWERUP_ICON[p.type] || '★', x, y + 1);
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
      const h = TILE * 1.24;
      const w = h * PLAYER_SPRITE_ASPECT;
      const squash = player.moving ? 1 - Math.abs(Math.sin(now / 90)) * 0.05 : 1;
      ctx.drawImage(playerSprite, -w / 2, -h * 0.58 * squash, w, h * squash);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
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

    ctx.fillStyle = '#6B7280';
    roundRect(-TILE * 0.28, -TILE * 0.26, TILE * 0.56, TILE * 0.5, 8);
    ctx.fill();
    ctx.fillStyle = '#565D6B';
    ctx.fillRect(-TILE * 0.28, TILE * 0.02, TILE * 0.56, TILE * 0.08);

    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-6, -4, 5.5, 0, Math.PI * 2);
    ctx.arc(6, -4, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#B0121B';
    ctx.beginPath();
    ctx.arc(-6, -4, 2.4, 0, Math.PI * 2);
    ctx.arc(6, -4, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // angry mouth
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-5, 8); ctx.lineTo(5, 8);
    ctx.stroke();

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
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------------
  // Sizing
  // ---------------------------------------------------------------------
  function resizeCanvas() {
    const wrap = $('canvas-wrap');
    const availW = wrap.clientWidth - 16;
    const availH = wrap.clientHeight - 16;
    TILE = Math.max(24, Math.floor(Math.min(availW / COLS, availH / ROWS)));
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
  function startRun(nick) {
    currentNick = nick;
    showScreen(screenGame);
    resizeCanvas();
    resetRunState();
    running = true;
    lastTs = performance.now();
    requestAnimationFrame(loop);
  }

  async function endRun(reason) {
    running = false;
    keys.up = keys.down = keys.left = keys.right = false;

    resultTitle.textContent = reason === 'dead' ? 'Wypadek przy biurku!' : 'Koniec czasu!';
    resultSub.textContent = reason === 'dead'
      ? 'Uważaj na zbuntowane zszywacze następnym razem.'
      : 'Ale akcja w open space!';
    resultScore.textContent = String(score);
    resultRank.textContent = 'Wysyłanie wyniku…';
    showScreen(screenResults);

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
        const top = list.slice(0, 5);
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
    startRun(nickInput.value.trim());
  });
  nickInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') playBtn.click(); });

  retryBtn.addEventListener('click', () => startRun(currentNick));
  menuBtn.addEventListener('click', () => showScreen(screenMenu));

  const savedNick = localStorage.getItem('kbk-office-nick');
  if (savedNick) nickInput.value = savedNick;
  playBtn.addEventListener('click', () => localStorage.setItem('kbk-office-nick', nickInput.value.trim()));

  loadLeaderboard(null, null, miniBoardList);
})();
