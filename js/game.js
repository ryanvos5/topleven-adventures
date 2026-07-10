/* ============================================================
   GAME — loop, level-logica, rendering.
   ============================================================ */

const Game = {
  canvas: null, ctx: null,
  state: 'menu',          // menu | playing | paused | win | lose
  worldId: 1, level: null,
  player: null, zombies: [], bullets: [], particles: [], coinFx: [], ammoFx: [], ammoDrops: [], healthDrops: [], corpses: [], pendingZombies: [],
  obstacles: [], powerUps: [], enemyShots: [], platforms: [], rocketShots: [], rockets: 0,
  boss: null, shake: 0, hordeLeft: 0, lastHazard: -9999, bossAmmoTimer: 0,
  round: 1, roundTarget: 0, roundKills: 0, roundSpawned: 0, roundBreak: 0,
  cam: { x: 0 },
  time: 0, dtScale: 1, lastTs: 0,
  spawnTimer: 0, spawned: 0, spawnArmed: false,
  runCoins: 0, runKills: 0, ammo: 0,
  coinAnimFrame: 0, coinAnimTimer: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = CONFIG.VIEW_W;
    canvas.height = CONFIG.VIEW_H;
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame((t) => this.loop(t));
  },

  // full-screen: de interne BREEDTE groeit mee met het scherm (hoogte vast),
  // zodat de canvas het hele scherm vult -> geen zwarte zijbalken op brede schermen (iPhone).
  resize() {
    const aspect = (window.innerWidth || 1) / (window.innerHeight || 1);
    let vw = Math.round(CONFIG.VIEW_H * aspect);
    vw = Math.max(360, Math.min(520, vw));            // grenzen tegen extreme schermen
    if (vw % 2) vw++;                                  // even breedte = nettere pixels
    if (vw !== CONFIG.VIEW_W) {
      CONFIG.VIEW_W = vw;
      this.canvas.width = vw;                          // interne resolutie aanpassen
      this.ctx.imageSmoothingEnabled = false;          // (canvas.width reset de context)
    }
    const scale = Math.min(window.innerWidth / CONFIG.VIEW_W, window.innerHeight / CONFIG.VIEW_H);
    this.canvas.style.width = Math.floor(CONFIG.VIEW_W * scale) + 'px';
    this.canvas.style.height = Math.floor(CONFIG.VIEW_H * scale) + 'px';
  },

  // ---------- level starten ----------
  startLevel(worldId, levelId) {
    const world = WORLDS.find((w) => w.id === worldId);
    const level = world.levels.find((l) => l.id === levelId);
    this._beginLevel(level, worldId);
  },
  // gedeelde level-start (werelden én Journey-stages)
  _beginLevel(level, worldId) {
    this.worldId = worldId;
    this.level = level;
    this.jStage = null;                                  // Journey-stage wordt erna gezet (startJourneyStage)
    UI.viewWorld = worldId || 1; // level-select toont daarna deze wereld
    // al eerder voltooid? dan bij herhaling maar 15 munten (geen farmen)
    this.levelWasCleared = worldId ? (Storage.highestCleared(worldId) >= level.id) : false;

    this.player = new Player(Storage.data.equippedMelee, Storage.data.equippedRanged, Storage.data.equippedCharacter);
    // dubbel-jump vanaf wereld 2
    this.player.maxJumps = worldId >= DOUBLE_JUMP_FROM_WORLD ? 2 : 1;
    this.player.jumps = this.player.maxJumps;
    this.zombies = []; this.bullets = []; this.particles = []; this.coinFx = []; this.ammoFx = []; this.ammoDrops = []; this.healthDrops = []; this.corpses = []; this.pendingZombies = [];
    this.powerUps = []; this.enemyShots = []; this.platforms = []; this.rocketShots = [];
    this.boss = null; this.shake = 0; this.lastHazard = -9999; this.bossAmmoTimer = 0;
    this.cam.x = 0;
    this.spawnTimer = 0; this.spawned = 0; this.spawnArmed = false;
    this.endWaveDone = false; this.killReqBonus = 0;
    this.runCoins = 0; this.runKills = 0;
    this.ammo = Storage.data.ammo;   // blijvende voorraad uit vorige levels
    this.rockets = Storage.data.rockets;
    this.time = 0;
    this.theme = THEMES[level.theme] || THEMES.city;
    this.hordeLeft = level.mode === 'horde' ? level.hordeTime : 0;
    this.midLeft = level.midTime || 0;   // tijd om de checkpoint-vlag te halen
    this.midReached = false;
    this.loseReason = 'dead';             // 'dead' | 'time'

    this.buildBackdrop(level);
    this.buildObstacles(level);
    this.buildPlatforms(level);
    this.buildTutorials();

    // parkour: zet de speler op het startplatform
    if (level.parkour && this.platforms.length) {
      const p0 = this.platforms[0];
      this.player.x = p0.x; this.player.y = p0.y; this.player.onGround = true;
    }

    // boss-level: plaats de eindbaas
    if (level.isBoss) {
      let boss;
      if (level.balloonBoss) {
        boss = new Zombie(this.player.x + 160, level, ZOMBIE_TYPES.balloon);
        boss.maxHp = BALLOON_HP; boss.hp = BALLOON_HP; boss.y = 80;
      } else if (level.apeBoss) {
        boss = new Zombie(this.player.x + 220, level, ZOMBIE_TYPES.ape);
        boss.maxHp = APE_HP; boss.hp = APE_HP;
      } else {
        boss = new Zombie(this.player.x + 240, level, ZOMBIE_TYPES.boss);
        boss.maxHp = BOSS_HP; boss.hp = BOSS_HP;
      }
      this.boss = boss;
      this.zombies.push(boss);
    }

    this.state = 'playing';
    Input.clear();
    const pauseScreen = document.getElementById('pause-screen');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    UI.show('game');
  },

  // ---------- JOURNEY: Mario-stijl level-stage (side-scroller) ----------
  startJourneyStage(n, coopRole) {
    const lv = JOURNEY[1].levels[n - 1]; if (!lv) return;
    this.journey = null;                                // versus-journey context pas bij de boss-fase
    this._beginLevel(lv, 0);
    this.jStage = { idx: n, lv };
    this.levelWasCleared = Storage.journeyCleared(n);   // herhaling = geen kill-munten farmen
    // Mario-stage: geen doorlopende spawns; vijanden staan vast op hun patrouille-plek
    this.level = Object.assign({}, this.level, { zombieCount: 0, spawnEvery: 9e9, maxAlive: 0 });
    this.spawnArmed = true;
    // CO-OP: host simuleert de zombies; de gast krijgt ze via sync (zelf niets spawnen)
    this.coop = coopRole ? { role: coopRole, partner: null, z: [], _pT: 0, _zT: 0, won: false } : null;
    // Power Smash-juice-laag ook in de Journey (voor de bot-mensaap): impact/flits/KO
    this.hitStop = 0; this.impacts = []; this.floatTexts = []; this.hurtFlash = 0; this.smashFlash = 0; this.ko = null;
    this.brawlerSpawned = false;
    // Mario-regels
    this.player._marioTouch = true;                     // aanraking = helft HP (zie Player.takeDamage)
    this.player.downed = false; this._coopReviveAt = 0; // co-op respawn-state schoon
    this.player.maxJumps = 2; this.player.jumps = 2;    // dubbel-jump hoort bij het eiland
    this.tutorials = []; this.tutorialMsg = ''; this.tutorialUntil = 0;   // stads-tutorials horen hier niet
    // checkpoint-vlag halverwege (respawn-punt) — staat op vaste grond
    this.jFlagX = Math.round(lv.length * 0.5);
    this.jFlagReached = false;
    // Mario-layout: grond met ravijn-gaten (parkour!), zwevende platforms, kratten + patrouille-vijanden.
    // Volledig deterministisch, zodat co-op host + gast exact hetzelfde level zien.
    this._buildJourneyLayout(lv, n, coopRole !== 'guest');   // gast plaatst geen vijanden (krijgt ghosts via sync)
    if (window.Sfx) Sfx.music(lv.theme === 'beach' ? 'beach' : 'jungle');
  },

  // bouwt platforms + ravijn-gaten + kratten (+ patrouille-vijanden als placeEnemies)
  _buildJourneyLayout(lv, n, placeEnemies) {
    let seed = n * 6151 + 29;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const GY = CONFIG.GROUND_Y, flagX = this.jFlagX, end = lv.length - 200;
    this.platforms = []; this.pits = []; this.crates = [];
    this.jEnemySpawns = [];                                       // specs bewaren om bij respawn opnieuw te spawnen
    const kinds = ['health', 'rage', 'speed', 'shield', 'fireball'];
    let crateN = 0;
    const place = (type, x, y, range, chaser, shield) => {
      const dir = rnd() < 0.5 ? -1 : 1;
      this.jEnemySpawns.push({ type: type.id, x: Math.round(x), y: Math.round(y), range: Math.round(range), dir, chaser: !!chaser, shield: !!shield });
      if (!placeEnemies) return;
      this._spawnJourneyEnemy(type.id, Math.round(x), Math.round(y), Math.round(range), dir, !!chaser, !!shield);
    };
    const clear = (x, y) => !this.platforms.some((pf) => Math.abs(pf.x - x) < pf.w / 2 + 12 && Math.abs(pf.y - y) < 20) &&
                            !this.pits.some((p) => x > p.x0 - 12 && x < p.x1 + 12);
    const addCrate = (x, y) => {
      x = Math.round(x); if (!clear(x, y)) x += 62;                         // niet dóór een platform/gat
      if (clear(x, y)) { this.crates.push({ x, y: Math.round(y), kind: kinds[(n * 3 + crateN * 7) % kinds.length], broken: false }); crateN++; }
    };

    let x = 200;                                                            // veilig startstuk (geen gat)
    const diff = (n - 1) / 14;                                             // 0..1 moeilijkheid
    const hard = Math.max(0, (n - 10) / 8);                                // extra pittig vanaf lvl 11 (0.125..0.625)
    const shielded = n >= 11;                                              // vanaf lvl 11 hebben apen een schild (2x bespringen)
    while (x < end) {
      const nearFlag = Math.abs(x - flagX) < 130;
      // ---- RAVIJN-GAT: veel groter, alleen over via smallere/hogere stapstenen (val = respawn) ----
      const pitW0 = Math.round(150 + rnd() * 140 + diff * 130 + hard * 140);   // ~150..560 (breder vanaf lvl 11)
      const gatOverVlag = (x < flagX + 90) && (x + pitW0 > flagX - 90);    // gat zou de vlag overlappen -> niet doen
      if (x > 340 && !nearFlag && !gatOverVlag && rnd() < (0.52 + diff * 0.16 + hard * 0.14)) {
        const pitW = pitW0;
        const x0 = Math.round(x), x1 = Math.round(x + pitW);
        this.pits.push({ x0, x1 });
        const gapStep = 86 + diff * 20 + hard * 30;                        // grotere sprongen tussen stapstenen
        const steps = Math.max(2, Math.round(pitW / gapStep));
        const sw = Math.max(20, Math.round(38 - diff * 12 - hard * 8));    // smallere stapstenen (38..18)
        for (let s = 0; s < steps; s++) {
          const px = x0 + pitW * (s + 0.5) / steps;
          const py = GY - (26 + Math.floor(rnd() * (22 + diff * 22 + hard * 20)));   // hoger + meer hoogteverschil
          this.platforms.push({ x: Math.round(px), y: Math.round(py), w: sw });
          if (rnd() < 0.22) place(ZOMBIE_TYPES.apeling, Math.round(px), py, 6, false, shielded);   // aap op een stapsteen (extra lastig)
        }
        x = x1 + 56 + Math.floor(rnd() * 46);
        continue;
      }
      // ---- VASTE SECTIE: soms verhoogd platform + patrouille-apen + een krat ----
      const secW = 150 + Math.floor(rnd() * 130), cx = x + secW * 0.5;
      if (rnd() < 0.55) {
        const py = GY - (36 + Math.floor(rnd() * 46)), w = 44 + Math.floor(rnd() * 26);
        this.platforms.push({ x: Math.round(cx), y: Math.round(py), w: Math.round(w) });
        if (rnd() < 0.6) place(ZOMBIE_TYPES.apeling, Math.round(cx), py, Math.max(10, w / 2 - 12), false, shielded);
        if (rnd() < 0.42) addCrate(cx, py - 22);                            // krat BOVENOP het platform
      }
      if (rnd() < 0.7 && !nearFlag) {
        const ex = Math.round(x + secW * (0.28 + rnd() * 0.44));
        const boom = n >= 9 && rnd() < 0.34;
        place(boom ? ZOMBIE_TYPES.boomape : ZOMBIE_TYPES.apeling, ex, GY, 28 + Math.round(rnd() * 22), false, shielded);
      }
      if (rnd() < 0.42) addCrate(x + secW * (0.2 + rnd() * 0.55), GY - 34); // krat op de grond
      x += secW;
    }
    // (minimum-kratten + apen-op-krat-fix gebeurt hieronder, ná de vlag/finish-filters)
    // ---- VLAG-VEILIGE ZONE: rond de checkpoint-vlag vlakke, vaste grond ----
    // geen GAT onder/naast de vlag (ook al gefilterd bij het aanmaken; hier hard gegarandeerd)
    const FZ_PIT = 130, FZ_PLAT = 90;
    this.pits = this.pits.filter((p) => p.x1 <= flagX - FZ_PIT || p.x0 >= flagX + FZ_PIT);
    // geen PLATFORM dat (horizontaal) door de vlag heen loopt of er vlak naast zweeft
    this.platforms = this.platforms.filter((pf) => (pf.x + pf.w / 2) <= flagX - FZ_PLAT || (pf.x - pf.w / 2) >= flagX + FZ_PLAT);
    // geen apen op/door de vlag laten patrouilleren
    this.zombies = this.zombies.filter((z) => !z.patrol || z.patrolR < flagX - 26 || z.patrolL > flagX + 26);
    this.jEnemySpawns = this.jEnemySpawns.filter((s) => (s.x + s.range) < flagX - 26 || (s.x - s.range) > flagX + 26);
    // ---- FINISH-VLAG-ZONE: laatste stuk vóór de eindvlag altijd vlakke, vaste grond ----
    // (de vlag staat op x = lv.length; een gat/platform mag daar niet doorheen lopen)
    const finishX = lv.length, FZ_FIN = 160;
    this.pits = this.pits.filter((p) => p.x1 <= finishX - FZ_FIN);
    this.platforms = this.platforms.filter((pf) => (pf.x + pf.w / 2) <= finishX - FZ_FIN);
    this.zombies = this.zombies.filter((z) => !z.patrol || z.patrolR < finishX - FZ_FIN);
    this.jEnemySpawns = this.jEnemySpawns.filter((s) => (s.x + s.range) < finishX - FZ_FIN);
    // ---- KRATTEN NIET OP EEN PATROUILLE-AAP ---- (patrouille-apen lopen anders 'over' een krat)
    const enemyBlocked = (cx, cy) => this.jEnemySpawns.some((s) => s.type !== 'bird' && Math.abs(s.y - cy) < 30 && cx > s.x - s.range - 16 && cx < s.x + s.range + 16);
    const crateClear = (cx, cy) => clear(cx, cy) && !enemyBlocked(cx, cy) && cx > 40 && cx < finishX - FZ_FIN && Math.abs(cx - flagX) > 40;
    // bestaande kratten die op/onder een aap staan: opzij schuiven, anders weghalen
    this.crates = this.crates.filter((c) => {
      if (crateClear(c.x, c.y)) return true;
      for (let d = 1; d <= 6; d++) for (const nx of [c.x + d * 42, c.x - d * 42]) if (crateClear(nx, c.y)) { c.x = Math.round(nx); return true; }
      return false;                                          // nergens vrij -> krat weghalen
    });
    // minimum aantal kratten opnieuw garanderen (enemy-bewust; begrensde zoektocht -> geen oneindige lus)
    for (let guard = 0; this.crates.length < (lv.crates || 3) && guard < 60; guard++) {
      let cx2 = 240 + guard * 190;
      for (let k = 0; k < 10 && !crateClear(cx2, GY - 34); k++) cx2 += 44;
      if (crateClear(cx2, GY - 34)) this.crates.push({ x: Math.round(cx2), y: GY - 34, kind: kinds[(n * 3 + this.crates.length * 7) % kinds.length], broken: false });
    }
    // vogels vanaf level 6 (zweven heen en weer, aanraken = schade); vanaf lvl 11 fors meer
    if (n >= 6) {
      const birds = 1 + Math.floor((n - 6) / 3) + (n >= 11 ? 2 + Math.floor((n - 11) / 2) : 0);
      for (let i = 0; i < birds; i++) {
        const bx = Math.round(lv.length * (0.28 + i * (0.5 / Math.max(1, birds))) + (rnd() - 0.5) * 100);
        const by = 60 + Math.round(rnd() * 42);
        place(ZOMBIE_TYPES.bird, Math.max(220, Math.min(lv.length - 180, bx)), by, 60 + Math.round(rnd() * 50), n >= 9);   // vanaf lvl 9: achtervolgen
      }
    }
  },
  // één patrouille-vijand plaatsen vanuit een spec (nieuw + bij respawn)
  _spawnJourneyEnemy(typeId, x, y, range, dir, chaser, shield) {
    const z = new Zombie(x, this.level, ZOMBIE_TYPES[typeId]);
    z.x = x; z.patrolL = x - range; z.patrolR = x + range;
    z.y = y; z.patrolY = y; z.onGround = !z.type.flying; z.vy = 0; z.dir = dir || 1;
    z.chaser = !!chaser;
    if (shield && !z.type.flying) z.shieldHp = 1;                 // geschilde mensaap: 2x bespringen (schild kapot, dan dood)
    this.zombies.push(z);
  },
  // bij respawn: alle al-gedode apen komen weer terug (op hun oorspronkelijke plek)
  _respawnJourneyEnemies() {
    if (!this.jEnemySpawns) return;
    if (this.coop && this.coop.role === 'guest') return;         // gast bezit geen echte vijanden (host beheert ze + synct)
    this.zombies = this.zombies.filter((z) => !z.patrol);        // dode + levende patrouille-apen weg
    for (const s of this.jEnemySpawns) this._spawnJourneyEnemy(s.type, s.x, s.y, s.range, s.dir, s.chaser, s.shield);
  },
  // gast vraagt de host om de vijanden te resetten (na een respawn)
  onCoopRespawnEnemies() { if (this.coop && this.coop.role === 'host') this._respawnJourneyEnemies(); },

  // BOT-MENSAAP: verschijnt op de meeste levels halverwege en moet verslagen (Power Smash-stijl)
  _maybeSpawnBrawler() {
    if (this.brawlerSpawned || !this.jStage) return;
    if (this.coop && this.coop.role === 'guest') return;   // host spawnt + synct de bot-mensaap
    const n = this.jStage.idx;
    if (n < 2 || (n * 3) % 4 === 0) return;               // niet op het eerste level, en niet élk level ("soms")
    if (this.player.x < this.level.length * 0.6) return;  // pas voorbij de helft
    this.brawlerSpawned = true;
    const sx = Math.min(this.level.length - 120, this.player.x + 210);
    const z = new Zombie(sx, this.level, ZOMBIE_TYPES.brawler);
    z.brawler = true; z.dir = -1;
    this.zombies.push(z);
    this.shake = Math.max(this.shake, 12);
    this.smashFlash = Math.max(this.smashFlash, 130);
    this.addFloatText(this.player.x, CONFIG.GROUND_Y - 64, 'BOT-MENSAAP!', '#ff5a3a', true);
    if (window.Sfx) Sfx.play('gorilla');
  },

  // vlag gehaald + kratten kapot slaan + finish/boss-overgang
  updateJourneyStage(dt) {
    const lv = this.jStage.lv, p = this.player;
    // checkpoint-vlag
    if (lv.midFlag && !this.jFlagReached && p.x >= this.jFlagX) {
      this.jFlagReached = true;
      if (window.Sfx) Sfx.play('coin');
      for (let i = 0; i < 12; i++) this.particles.push(new Particle(this.jFlagX, CONFIG.GROUND_Y - 30, (Math.random() - 0.5) * 2.5, -Math.random() * 2.5, '#5aff7a', 500, 2));
    }
    // kratten: kapot te smashen met een melee-klap
    if (this.crates && this.time < p.attackAnimUntil) {
      for (const c of this.crates) {
        if (c.broken) continue;
        if (Math.abs(c.x - p.x) < 34 && Math.abs((c.y - 8) - (p.y - 16)) < 34) {
          c.broken = true;
          if (c.kind === 'health') this.healthDrops.push(new HealthPickup(c.x));
          else this.powerUps.push(new PowerUpPickup(c.x, c.kind));
          for (let i = 0; i < 12; i++) this.particles.push(new Particle(c.x, c.y - 8, (Math.random() - 0.5) * 3.5, -Math.random() * 3, Math.random() < 0.5 ? '#b98a5a' : '#8a5e36', 420, 2));
          this.shake = Math.max(this.shake, 4);
          if (window.Sfx) Sfx.play('hit');
          if (this.coop && window.Net) Net.versusSend('jcrate', { i: this.crates.indexOf(c) });   // partner ziet 'm ook breken
        }
      }
    }
    // co-op: state delen + gast-kant (ghost-zombies)
    if (this.coop) this._coopTick(dt);
  },

  // ---- CO-OP: sync-tick (speler-state altijd; host stuurt zombies, gast meldt treffers) ----
  _coopTick(dt) {
    const co = this.coop, p = this.player;
    // ---- partner-speler vloeiend naar de laatst gesynchte positie schuiven (geen lag/spring) ----
    if (co.partner && co.partner.tx != null) {
      const dx = co.partner.tx - co.partner.x, dy = co.partner.ty - co.partner.y;
      if (Math.abs(dx) > 200 || Math.abs(dy) > 120) { co.partner.x = co.partner.tx; co.partner.y = co.partner.ty; }   // grote sprong (respawn/teleport) -> direct
      else { const lp = Math.min(1, dt / 70); co.partner.x += dx * lp; co.partner.y += dy * lp; }
    }
    // ---- TETHER: blijf bij je partner (je kunt niet te ver uit elkaar) ----
    const TETHER = 300;
    if (co.partner && co.partner.al && p.hp > 0) {
      const dx = p.x - co.partner.x;
      if (dx > TETHER || dx < -TETHER) {
        p.x = co.partner.x + (dx > 0 ? TETHER : -TETHER);
        if (p.knockVx) p.knockVx = 0;
        this.tutorialMsg = 'Blijf bij je partner!'; this.tutorialUntil = this.time + 500;
      }
    }
    const atFin = p.hp > 0 && !p.downed && p.x >= this.level.length - 10;
    co._pT += dt;
    if (co._pT >= 100 && window.Net) {
      co._pT = 0;
      Net.versusSend('jp', { x: Math.round(p.x), y: Math.round(p.y), d: p.dir, wp: p.walkPhase || 0, a: this.time < p.attackAnimUntil ? 1 : 0, h: Math.round(p.hp), al: p.hp > 0 ? 1 : 0, ch: p.charId || 'ryan', g: p.onGround ? 1 : 0, f: atFin ? 1 : 0 });
    }
    if (co.role === 'host') {
      co._zT += dt;
      if (co._zT >= 120 && window.Net) {
        co._zT = 0;
        const list = [];
        for (let i = 0; i < this.zombies.length && list.length < 24; i++) {
          const z = this.zombies[i];
          if (!z.alive) continue;
          list.push([i, Math.round(z.x), Math.round(z.y), z.type.id, Math.round(z.hp), z.dir]);
        }
        Net.versusSend('jz', { l: list });
      }
      return;
    }
    // ---- GAST: ghost-zombies animeren, aanraking en eigen klappen/kogels doorgeven ----
    const lerp = Math.min(1, dt / 70);                     // vloeiend naar de laatst gesynchte positie schuiven
    for (const g of co.z) {
      if (g.tx != null) { g.x += (g.tx - g.x) * lerp; g.y += (g.ty - g.y) * lerp; }
      g.walkPhase = (g.walkPhase + dt / 140) % 4; g.cy = g.y - 14;
    }
    if (p.hp > 0) for (const g of co.z) {
      if (Math.abs(g.x - p.x) < 14 && Math.abs(g.y - p.y) < 26) p.takeDamage(10, 'touch');   // Mario-regel geldt ook hier
    }
    if (this.time < p.attackAnimUntil) {                 // melee raakt ghosts -> host past de schade toe
      for (const g of co.z) {
        if (g._hitAt && this.time - g._hitAt < 300) continue;
        if ((g.x - p.x) * p.dir > -8 && Math.abs(g.x - p.x) < 34 && Math.abs(g.y - p.y) < 30) {
          g._hitAt = this.time;
          if (window.Net) Net.versusSend('jhit', { i: g.i, dmg: Math.round(30 * (p.meleeMul || 1) * (p._rageActive ? 2 : 1)), d: (g.x >= p.x ? 1 : -1) });
          this.spawnBlood(g.x, g.y - 14);
        }
      }
    }
    if (this.bullets) for (const b of this.bullets) {     // kogels raken ghosts
      if (!b.alive) continue;
      for (const g of co.z) {
        if (Math.abs(b.x - g.x) < 10 && Math.abs(b.y - (g.y - 16)) < 18) {
          b.alive = false; g._hitAt = this.time;
          if (window.Net) Net.versusSend('jhit', { i: g.i, dmg: b.damage || 20, d: (b.vx >= 0 ? 1 : -1) });
          this.spawnBlood(g.x, g.y - 14);
          break;
        }
      }
    }
  },
  // co-op-berichten van de partner
  onCoopP(p) {
    if (!this.coop || !p) return;
    const co = this.coop, prev = co.partner;
    if (!prev) { co.partner = Object.assign({}, p, { x: p.x, y: p.y, tx: p.x, ty: p.y }); }   // eerste keer: direct op de plek
    else {                                                                                    // daarna: doel-positie bewaren -> vloeiend interpoleren (geen lag/spring)
      prev.tx = p.x; prev.ty = p.y;
      prev.d = p.d; prev.wp = p.wp; prev.a = p.a; prev.h = p.h; prev.al = p.al; prev.ch = p.ch; prev.g = p.g; prev.f = p.f;
    }
    co.partnerAtFinish = !!p.f;
  },
  onCoopZ(p) {
    if (!this.coop || this.coop.role !== 'guest' || !p || !p.l) return;
    const old = {}; for (const g of this.coop.z) old[g.i] = g;
    this.coop.z = p.l.map((r) => {
      const prev = old[r[0]];                              // interpoleer naar de nieuwe positie (vloeiend i.p.v. elke 120ms springen)
      const tx = r[1], ty = r[2];
      return { i: r[0], x: prev ? prev.x : tx, y: prev ? prev.y : ty, tx: tx, ty: ty,
        type: ZOMBIE_TYPES[r[3]] || ZOMBIE_TYPES.walker, hp: r[4], dir: r[5], alive: true,
        walkPhase: prev ? prev.walkPhase : 0, _hitAt: prev ? prev._hitAt : 0, tint: ((r[0] * 37) % 100) / 100, cy: (prev ? prev.y : ty) - 14, hitFlash: 0, atk: 'walk' };
    });
  },
  onCoopHit(p) {
    if (!this.coop || this.coop.role !== 'host' || !p) return;
    const z = this.zombies[p.i];
    if (z && z.alive) z.takeDamage(p.dmg || 20, p.d || 1, this, 6);
  },
  onCoopCrate(p) {
    if (!this.crates || !p || p.i == null) return;
    const c = this.crates[p.i];
    if (c && !c.broken) {
      c.broken = true;
      if (c.kind === 'health') this.healthDrops.push(new HealthPickup(c.x));
      else this.powerUps.push(new PowerUpPickup(c.x, c.kind));
      if (window.Sfx) Sfx.play('hit');
    }
  },
  onCoopWin() {
    if (this.jStage && this.state === 'playing') { if (this.coop) this.coop.won = true; this.win(); }
  },
  onCoopLose() { this._coopGameOver(true); },
  // co-op: allebei tegelijk dood -> level mislukt (game over, terug naar menu)
  _coopGameOver(fromNet) {
    if (this.state !== 'playing' || !this.jStage) return;
    if (!fromNet && window.Net) Net.versusSend('jlose', {});   // partner ook game-over zetten
    this.player.downed = false;
    this.state = 'jdead';
    if (window.Input) Input.clear();
    if (window.UI) UI.showJourneyDeath(this.jFlagReached, true);   // co-op-verlies: alleen 'terug naar menu'
    this.coop = null; if (window.Net) Net.leaveVersus(); if (window.UI && UI.coopReset) UI.coopReset();
  },

  // dood na de vlag -> respawn bij de vlag (Mario-checkpoint); co-op: ook vóór de vlag (bij de start)
  journeyRespawn() {
    const p = this.player;
    let rx = this.jFlagReached ? this.jFlagX : 60;
    if (this.coop && this.coop.partner && this.coop.partner.al) rx = Math.max(40, this.coop.partner.x);   // co-op: kom terug bij je partner
    // NOOIT in een gat respawnen: als rx boven een ravijn ligt, snap naar de dichtstbijzijnde vaste rand
    if (this.pits) for (const pit of this.pits) {
      if (rx > pit.x0 - 10 && rx < pit.x1 + 10) { rx = (rx - pit.x0 < pit.x1 - rx) ? pit.x0 - 16 : pit.x1 + 16; break; }
    }
    rx = Math.max(40, Math.min((this.level.length || 99999) - 40, rx));
    this._respawnJourneyEnemies();                              // alle gedode apen komen weer terug (host/solo)
    if (this.coop && this.coop.role === 'guest' && window.Net) Net.versusSend('jrs', {});   // gast: host laat de vijanden terugkomen
    p.hp = p.maxHp; p.x = rx; p.y = CONFIG.GROUND_Y; p.vy = 0; p.onGround = true; p.knockVx = 0; p.downed = false;
    p.burnUntil = 0; p._touchInvUntil = this.time + 2200;      // even onkwetsbaar na de respawn
    // zombies vlakbij het respawn-punt wegduwen (geen respawn-kill)
    for (const z of this.zombies) if (z.alive && Math.abs(z.x - rx) < 120) z.x += (z.x < rx ? -1 : 1) * 140;
    for (let i = 0; i < 14; i++) this.particles.push(new Particle(p.x, p.y - 14, (Math.random() - 0.5) * 3, -Math.random() * 3, '#5aff7a', 480, 2));
    this.shake = Math.max(this.shake, 5);
    if (window.Sfx) Sfx.play('roundlose');
  },

  // level-stage gehaald: door naar de boss (5/10/15) of belonen + resultaat
  finishJourneyStage() {
    const idx = this.jStage.idx, lv = this.jStage.lv;
    this.jStage = null;
    // co-op: partner meteen laten weten dat de finish gehaald is (allebei klaar)
    if (this.coop && !this.coop.won && window.Net) { this.coop.won = true; Net.versusSend('jwin', {}); }
    this.coop = null;
    if (lv.bossFight) { UI.playBossStory(idx); return; }   // finish = eerst het verhaal, dan de boss (co-op: ieder z'n eigen duel)
    this.state = 'versusOver';
    const first = !Storage.journeyCleared(idx);
    const unlocks = Storage.clearJourneyLevel(idx);
    const coins = first ? 40 + this.runCoins : 50;
    const xp = first ? 20 : 0;
    Storage.data.coins = (Storage.data.coins || 0) + coins;
    if (xp) Storage.data.xp = (Storage.data.xp || 0) + xp;
    Storage.save();
    const rewards = [{ type: 'earn', coins, xp }];
    for (const u of unlocks) rewards.push({ type: u.type, id: u.id, name: u.name });
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('touch-controls').classList.add('hidden');
    if (window.Sfx) Sfx.play('win');
    const self = this;
    UI.showWinCelebration('JIJ', true);
    setTimeout(function () { if (self.state === 'versusOver') UI.showJourneyResult(true, idx, unlocks, rewards, 1, 0); }, 2600);
  },

  // ---------- ZOMBIE KNOCK-OUT (arena) ----------
  // (de dag-poging is al verbruikt door UI.startArena — account of lokale fallback)
  startArena() {
    this.worldId = 0;
    if (window.Sfx) Sfx.music('arena');
    this.level = ARENA_LEVEL;
    UI.viewWorld = 1;
    this.player = new Player(Storage.data.equippedMelee, Storage.data.equippedRanged, Storage.data.equippedCharacter);
    this.player.maxJumps = 1; this.player.jumps = 1;
    this.player.x = ARENA_LEVEL.length / 2; // midden van de arena
    this.zombies = []; this.bullets = []; this.particles = []; this.coinFx = []; this.ammoFx = []; this.ammoDrops = []; this.healthDrops = []; this.corpses = []; this.pendingZombies = [];
    this.powerUps = []; this.enemyShots = []; this.platforms = []; this.obstacles = []; this.rocketShots = [];
    this.boss = null; this.shake = 0; this.bossAmmoTimer = 0;
    this.cam.x = 0; this.spawnTimer = 0; this.spawned = 0; this.spawnArmed = true;
    this.runCoins = 0; this.runKills = 0;
    this.ammo = ARENA_START_AMMO;
    this.rockets = Storage.data.rockets;
    this.time = 0;
    this.theme = THEMES.arena;
    this.levelWasCleared = false;
    this.tutorials = []; this.tutorialMsg = ''; this.tutorialUntil = 0;
    this.buildBackdrop(ARENA_LEVEL);
    this.beginRound(1);
    this.state = 'playing';
    Input.clear();
    const ps = document.getElementById('pause-screen'); if (ps) ps.classList.add('hidden');
    UI.show('game');
  },

  beginRound(round) {
    this.round = round;
    const r = arenaRound(round);
    this.roundCfg = r;
    // pas de "level"-spawnparameters aan voor deze ronde
    this.level.zombieHp = r.zombieHp;
    this.level.zombieSpeed = r.zombieSpeed;
    this.level.runnerChance = r.runnerChance;
    this.level.crawlerChance = r.crawlerChance;
    this.level.bruteChance = r.bruteChance;
    this.level.maxAlive = r.maxAlive;
    this.level.spawnEvery = r.spawnEvery;
    this.roundTarget = r.target;
    this.roundKills = 0;
    this.roundSpawned = 0;
    this.roundBreak = 0;
    this.spawnTimer = 0;
  },

  nextLevel() {
    const world = WORLDS.find((w) => w.id === this.worldId);
    const next = this.level.id + 1;
    if (next <= world.levels.length) this.startLevel(this.worldId, next);
    else { UI.renderLevels(); UI.show('level'); }
  },
  retryLevel() {
    const pauseScreen = document.getElementById('pause-screen');
    if (this.jStage) {                                     // Journey-stage (Mario-level) opnieuw
      const idx = this.jStage.idx; this.jStage = null;
      if (pauseScreen) pauseScreen.classList.add('hidden');
      UI.startJourneyLevel(idx);
      return;
    }
    if (this.journey) {                                    // Journey: zelfde level opnieuw
      const idx = this.journey.idx;
      this.vsPaused = false; if (pauseScreen) pauseScreen.classList.add('hidden');
      UI.startJourneyLevel(idx);
      return;
    }
    this.startLevel(this.worldId, this.level.id);
  },

  togglePause() {
    const pauseScreen = document.getElementById('pause-screen');
    if (this.state === 'playing') {
      this.state = 'paused'; Input.clear();
      if (pauseScreen) pauseScreen.classList.remove('hidden');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      if (pauseScreen) pauseScreen.classList.add('hidden');
    } else if (this.state === 'versus' && this.journey) {   // Journey: singleplayer, dus pauzeren mag
      this.vsPaused = !this.vsPaused;
      if (this.vsPaused) Input.clear();
      if (pauseScreen) pauseScreen.classList.toggle('hidden', !this.vsPaused);
    }
  },

  // level verlaten -> terug naar het hoofdmenu (geen beloning, run telt niet)
  quitToMenu() {
    const pauseScreen = document.getElementById('pause-screen');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    this.vsPaused = false;
    this.jStage = null;                                   // Journey-stage netjes loslaten
    if (this.coop) { this.coop = null; if (window.Net) Net.leaveVersus(); if (window.UI) UI.coopReset(); }   // co-op-kamer sluiten
    if (this.state === 'training') { this.quitTraining(); return; }               // training-lobby netjes opruimen
    if (this.journey || this.state === 'versus') { this.quitVersus(); return; }   // Journey/versus netjes opruimen
    this.state = 'menu';
    Input.clear();
    UI.show('menu');
  },

  // achtergrond vooraf bepalen (anders flikkeren ze). Twee lagen + deuren + lantaarns.
  buildBackdrop(level) {
    let seed = level.id * 9301 + 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

    const theme = THEMES[level.theme] || THEMES.city;

    // arena: geen gebouwen (eigen scene wordt in render getekend)
    if (theme.isArena) { this.backdrop = { arena: true, far: [], near: [], doors: [], lamps: [] }; return; }

    // berg-thema: driehoekige toppen i.p.v. gebouwen
    if (theme.mountains) {
      const far = [], near = [];
      let mx = -80;
      while (mx < level.length + 300) {
        const w = 120 + Math.floor(rnd() * 120), h = 90 + Math.floor(rnd() * 80);
        far.push({ x: mx, w, h, c: theme.far[Math.floor(rnd() * theme.far.length)] });
        mx += w * 0.6;
      }
      mx = -60;
      while (mx < level.length + 200) {
        const w = 90 + Math.floor(rnd() * 90), h = 70 + Math.floor(rnd() * 90);
        near.push({ x: mx, w, h, c: theme.near[Math.floor(rnd() * theme.near.length)], snow: rnd() > 0.5 });
        mx += w * 0.55;
      }
      this.backdrop = { mountains: true, far, near, doors: [], lamps: [] };
      return;
    }

    // jungle-thema: bomen (stam + kruin) i.p.v. gebouwen, geen deuren/lantaarns
    if (theme.jungle) {
      const far = [], near = [];
      let jx = -40;
      while (jx < level.length + 200) {
        const w = 50 + Math.floor(rnd() * 60), h = 80 + Math.floor(rnd() * 70);
        far.push({ x: jx, w, h, c: theme.far[Math.floor(rnd() * theme.far.length)] });
        jx += w * 0.7;
      }
      jx = -20;
      while (jx < level.length + 120) {
        const h = 86 + Math.floor(rnd() * 70);          // boomhoogte
        const cw = 40 + Math.floor(rnd() * 46);         // kruin-breedte
        near.push({ x: jx, h, cw, c: theme.near[Math.floor(rnd() * theme.near.length)] });
        jx += 46 + Math.floor(rnd() * 70);
      }
      this.backdrop = { jungle: true, far, near, doors: [], lamps: [] };
      return;
    }

    // verre laag (donker, klein, sterke parallax)
    const far = [];
    const farColors = theme.far;
    let x = -60;
    while (x < level.length + 300) {
      const w = 34 + Math.floor(rnd() * 44);
      const h = 70 + Math.floor(rnd() * 110);
      far.push({ x, w, h, c: farColors[Math.floor(rnd() * farColors.length)] });
      x += w + 4 + Math.floor(rnd() * 14);
    }

    // nabije laag (dichterbij, groter, met ramen + deuren)
    const near = [];
    const doors = [];
    const nearColors = theme.near;
    x = -30;
    while (x < level.length + 120) {
      const w = 70 + Math.floor(rnd() * 60);
      const h = 95 + Math.floor(rnd() * 80);
      const c = nearColors[Math.floor(rnd() * nearColors.length)];
      const hasDoor = rnd() > 0.35 && x > 120;
      const doorX = x + 12 + Math.floor(rnd() * Math.max(8, w - 36));
      const b = { x, w, h, c, hasDoor, doorX, openUntil: 0, lit: rnd() > 0.4 };
      near.push(b);
      if (hasDoor) doors.push({ x: doorX + 10, bld: b }); // spawn-punt midden voor de deur
      x += w + 2 + Math.floor(rnd() * 16);
    }

    // straatlantaarns langs de stoep
    const lamps = [];
    for (let lx = 80; lx < level.length; lx += 150 + Math.floor(rnd() * 90)) lamps.push({ x: lx });

    this.backdrop = { far, near, doors, lamps };
  },

  // obstakels langs de route: auto's (springen), lage balken (duiken),
  // gaten met spikes (springen), en explosieve vaten (schieten)
  buildObstacles(level) {
    this.obstacles = [];
    if (level.parkour || level.noObstacles) return;   // geen obstakels (bergen/jungle)
    // tutorial-level: vaste, goed gespreide layout (auto -> hek -> vat)
    if (this.worldId === 1 && level.id === 1) {
      this.obstacles = [
        { type: 'car', x: 360, w: 30, h: 22, color: '#7a3030' },
        { type: 'lowbar', x: 640, w: 22, h: 12 },
        { type: 'barrel', x: 920, w: 12, hp: 1, dead: false },
        { type: 'car', x: 1180, w: 30, h: 22, color: '#30507a' },
      ];
      return;
    }
    let seed = level.id * 4099 + 31;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const density = level.obstacleDensity || 0.6;
    let x = 220; // niet meteen bij de start
    while (x < level.length - 120) {
      const r = rnd();
      if (r < 0.34) {
        this.obstacles.push({ type: 'car', x, w: 30, h: 22, color: ['#7a3030', '#30507a', '#5a5a3a'][Math.floor(rnd() * 3)] });
      } else if (r < 0.55) {
        this.obstacles.push({ type: 'lowbar', x, w: 22, h: 12 });
      } else if (r < 0.72) {
        this.obstacles.push({ type: 'hazard', x, w: 26 });
      } else {
        this.obstacles.push({ type: 'barrel', x, w: 12, hp: 1, dead: false });
      }
      x += Math.round((150 + rnd() * 200) / density); // dichter bij hogere density
    }
  },

  // zwevende parkour-platforms genereren (wereld 2). Gaten = ravijn (val = dood).
  buildPlatforms(level) {
    this.platforms = [];
    this.pits = [];
    // Wereld 3 (jungle): zwevende platforms BOVEN de vaste grond + af en toe een ravijn-gat
    if (!level.parkour && level.platforms) {
      let seed = level.id * 5179 + 11;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      let x = 220;                                  // eerste stuk = veilige vaste grond
      while (x < level.length - 240) {
        if (level.pits && rnd() < 0.7) {
          // groot ravijn-gat: geen grond -> alleen oversteekbaar via platforms (val = dood)
          const pitW = 180 + Math.floor(rnd() * 220);  // 180..400 breed (flinke kloof)
          const x0 = Math.round(x), x1 = Math.round(x + pitW);
          this.pits.push({ x0, x1 });
          // stapsteen-platforms over het gat (segmenten ~62px -> haalbaar met (dubbel-)jump)
          const steps = Math.max(2, Math.round(pitW / 62));
          for (let s = 0; s < steps; s++) {
            const px = x0 + (pitW * (s + 0.5) / steps);
            const py = CONFIG.GROUND_Y - (24 + Math.floor(rnd() * 40));   // 24..64 boven de grond
            this.platforms.push({ x: Math.round(px), y: Math.round(py), w: Math.round(34 + rnd() * 16) });
          }
          x = x1 + 80 + Math.floor(rnd() * 90);        // korter stuk vaste grond na het gat
        } else {
          // los klim-/decoratief platform boven vaste grond
          const w = Math.round(40 + rnd() * 42);
          const py = Math.round(CONFIG.GROUND_Y - (30 + rnd() * 54));
          this.platforms.push({ x: Math.round(x), y: py, w });
          x += w + 60 + Math.floor(rnd() * 80);
        }
      }
      return;
    }
    if (!level.parkour) return;
    let seed = level.id * 7321 + 17;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    let y = CONFIG.GROUND_Y - 34;
    // breed, veilig startplatform
    this.platforms.push({ x: 44, y: y, w: 78 });
    let x = 44 + 39;
    while (x < level.length - 70) {
      const gap = level.gapMin + rnd() * (level.gapMax - level.gapMin);
      const w = Math.max(34, level.platMin + rnd() * (level.platMax - level.platMin));
      x += gap + w / 2;
      // hoogteverschil: omhoog beperkt (altijd haalbaar met dubbel-jump), omlaag mag vrij
      let dy = (rnd() - 0.5) * 2 * level.yJump;
      if (dy < 0) dy = Math.max(dy, -18);
      y += dy;
      y = Math.max(80, Math.min(CONFIG.GROUND_Y - 8, y));
      this.platforms.push({ x: Math.round(x), y: Math.round(y), w: Math.round(w) });
      x += w / 2;
    }
    // breed eindplatform bij de finish
    this.platforms.push({ x: level.length, y: Math.max(92, Math.min(CONFIG.GROUND_Y - 12, y)), w: 86 });
  },

  // staat (wereld-x) boven een ravijn-gat? (geen vaste grond hier -> val = dood)
  overPit(x) {
    if (!this.pits) return false;
    for (const p of this.pits) if (x > p.x0 && x < p.x1) return true;
    return false;
  },

  // bergtop (driehoek) tekenen
  drawPeak(ctx, sx, w, h, color, snow) {
    const baseY = CONFIG.GROUND_Y, topY = baseY - h, cx = sx + w / 2;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(sx, baseY); ctx.lineTo(cx, topY); ctx.lineTo(sx + w, baseY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(sx + w, baseY); ctx.lineTo(cx, baseY); ctx.closePath(); ctx.fill();
    if (snow) {
      ctx.fillStyle = '#e8eef4';
      ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx - w * 0.13, topY + h * 0.2); ctx.lineTo(cx + w * 0.13, topY + h * 0.2); ctx.closePath(); ctx.fill();
    }
  },

  // tutorial-triggers voor het allereerste level van elke wereld
  buildTutorials() {
    this.tutorials = [];
    this.tutorialMsg = '';
    this.tutorialUntil = 0;
    if (this.worldId === 1 && this.level.id === 1) {
      this.tutorials.push({ x: 90, text: tl('Versla ALLE zombies! Sla met de melee-knop of schiet'), shown: false });
      const car = this.obstacles.find((o) => o.type === 'car');
      if (car) this.tutorials.push({ x: car.x - 90, text: 'Een auto! Spring eroverheen (je kunt op het dak staan)', shown: false });
      const bar = this.obstacles.find((o) => o.type === 'lowbar');
      if (bar) this.tutorials.push({ x: bar.x - 90, text: 'Een hek! Bukken om eronderdoor te gaan', shown: false });
      const barrel = this.obstacles.find((o) => o.type === 'barrel');
      if (barrel) this.tutorials.push({ x: barrel.x - 80, text: 'Explosief vat! Schiet of sla het kapot', shown: false });
    } else if (this.worldId === 2 && this.level.id === 1) {
      this.tutorials.push({ x: 70, text: 'DUBBEL-JUMP! Druk 2x op springen in de lucht', shown: false });
      this.tutorials.push({ x: 240, text: 'Houd springen vast = hoger/verder. Val niet in het ravijn!', shown: false });
    }
  },

  // ---------- effecten ----------
  spawnMuzzleFlash(x, y, dir) {
    for (let i = 0; i < 5; i++)
      this.particles.push(new Particle(x, y, dir * (1 + Math.random() * 2), (Math.random() - 0.5) * 1.5, '#ffd24a', 120, 2));
  },
  // vuurbal afvuren: felle vlam-uitbarsting uit de hand (moment van afvuren)
  spawnFireCast(shooter, x, y, dir) {
    shooter._fireHandUntil = this.time + 220;                 // korte vlam-in-de-hand-flits (zie drawFireHand)
    const cols = ['#ff5a1e', '#ff8a2a', '#ffd24a', '#ffe9a0'];
    for (let i = 0; i < 12; i++) {
      const sp = 1.4 + Math.random() * 3.2, spr = (Math.random() - 0.5) * 1.8;
      this.particles.push(new Particle(x, y, dir * sp, spr - Math.random() * 1.2, cols[i & 3], 260 + Math.random() * 160, 2 + (i & 1)));
    }
    this.shake = Math.max(this.shake, 3);
  },
  // vlammende bal die je in de hand vasthoudt (continu zolang je een vuurbal hebt)
  drawFireHand(ctx, x, y, dir, t) {
    const hx = Math.round(x + dir * 13), hy = Math.round(y - 15);
    const fl = Math.round(Math.sin(t / 60) * 2), fl2 = Math.round(Math.sin(t / 38 + 1.7) * 2);
    // gloed rond de hand (donkeroranje halo)
    Sprites.px(ctx, '#c0401a', hx - 3, hy - 2, 7, 6);
    // vlamtongen die opflakkeren
    Sprites.px(ctx, '#ff5a1e', hx - 2, hy - 4 - fl, 5, 8);            // buitenvlam
    Sprites.px(ctx, '#ff9a2a', hx - 1, hy - 6 - fl, 3, 9);            // middenvlam
    Sprites.px(ctx, '#ffd24a', hx, hy - 7 - fl2, 2, 8);              // hete kern
    Sprites.px(ctx, '#fff3c0', hx, hy - 8 - fl2, 1, 4);             // wit-hete punt
    // kleine losvliegende vonk
    if (Math.sin(t / 90) > 0.6) Sprites.px(ctx, '#ffe27a', hx + 1, hy - 10 - fl2, 1, 1);
  },
  // vonkjes die van de vuurbal-in-de-hand omhoog dwarrelen (levendige "vlammende" look)
  _fireHoldEmbers(e) {
    if (!e || this.time < (e._fireEmberAt || 0)) return;
    e._fireEmberAt = this.time + 90;
    const hx = e.x + e.dir * 13, hy = e.y - 18;
    this.particles.push(new Particle(hx + (Math.random() - 0.5) * 3, hy, (Math.random() - 0.5) * 0.6, -0.8 - Math.random() * 0.9, Math.random() < 0.5 ? '#ff8a2a' : '#ffd24a', 300, 2));
  },
  spawnBlood(x, y) {
    for (let i = 0; i < 6; i++)
      this.particles.push(new Particle(x, y, (Math.random() - 0.5) * 3, -Math.random() * 2, '#8a2222', 350, 2));
  },
  // kogel ketst af op het baas-pantser (geen schade)
  spawnArmorSpark(x, y) {
    for (let i = 0; i < 5; i++)
      this.particles.push(new Particle(x, y, (Math.random() - 0.7) * 3, (Math.random() - 0.5) * 2.5, Math.random() < 0.5 ? '#cfd6df' : '#9aa3ad', 220, 2));
  },
  // perfecte parry: felle witte/gouden flits in een ring
  spawnParryFlash(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.particles.push(new Particle(x, y, Math.cos(a) * 3.2, Math.sin(a) * 3.2, (i % 2 ? '#fff7c8' : '#ffe27a'), 300, 2));
    }
    this._parryFx = { x, y, t: this.time };
  },
  // guard breekt: rode/grijze scherf-burst
  onGuardBreak(e) {
    for (let i = 0; i < 12; i++)
      this.particles.push(new Particle(e.x, e.y - 12, (Math.random() - 0.5) * 3.5, -Math.random() * 3, Math.random() < 0.5 ? '#ff7a5a' : '#9aa3ad', 360, 2));
    this.shake = Math.max(this.shake, 6);
  },
  spawnMeleeSwing(player) {
    const x = player.x + player.dir * 18, y = player.y - 16;
    for (let i = 0; i < 4; i++)
      this.particles.push(new Particle(x, y, player.dir * (1 + Math.random()), (Math.random() - 0.5) * 2, '#cfd6df', 130, 2));
  },

  // raak een explosief vat binnen straal r rond (x); true als er één ontplofte
  hitBarrels(x, r, game) {
    let hit = false;
    for (const o of this.obstacles) {
      if (o.type === 'barrel' && !o.dead && Math.abs(o.x - x) < r + o.w / 2) {
        this.explodeBarrel(o);
        hit = true;
      }
    }
    return hit;
  },

  explodeBarrel(o) {
    if (o.dead) return;
    o.dead = true;
    const R = 48;
    // schade aan zombies in de buurt
    for (const z of this.zombies) {
      if (z.alive && Math.abs(z.x - o.x) < R) z.takeDamage(140, Math.sign(z.x - o.x) || 1, this, 14);
    }
    // ook de speler raakt gewond als hij te dichtbij staat!
    if (Math.abs(this.player.x - o.x) < R - 8) this.player.takeDamage(22);
    // kettingreactie met andere vaten
    for (const b of this.obstacles) {
      if (b.type === 'barrel' && !b.dead && Math.abs(b.x - o.x) < R) this.explodeBarrel(b);
    }
    // knal-effect + schermschud
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4;
      const col = Math.random() < 0.5 ? '#ff8a3a' : (Math.random() < 0.5 ? '#ffd24a' : '#888');
      this.particles.push(new Particle(o.x, CONFIG.GROUND_Y - 10, Math.cos(a) * sp, Math.sin(a) * sp - 1, col, 420, 3));
    }
    this.shake = Math.max(this.shake, 8);
  },

  // explosie (raketten): AoE-schade aan zombies, geen zelfschade
  explodeAt(x, y, dmg) {
    for (const z of this.zombies) {
      if (z.alive && Math.abs(z.x - x) < ROCKET_AOE && Math.abs(z.cy - y) < ROCKET_AOE + 12) {
        z.takeDamage(dmg, Math.sign(z.x - x) || 1, this, 14);
      }
    }
    for (const o of this.obstacles) { if (o.type === 'barrel' && !o.dead && Math.abs(o.x - x) < ROCKET_AOE) this.explodeBarrel(o); }
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 5;
      const col = Math.random() < 0.5 ? '#ff8a3a' : (Math.random() < 0.5 ? '#ffd24a' : '#888');
      this.particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 1, col, 460, 3));
    }
    this.shake = Math.max(this.shake, 10);
  },

  onPowerUp(kind, x) {
    const pu = POWERUPS[kind];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 2;
      this.particles.push(new Particle(x, CONFIG.GROUND_Y - 16, Math.cos(a) * sp, Math.sin(a) * sp - 1, pu.color, 500, 2));
    }
    this.shake = Math.max(this.shake, 4);
  },

  onZombieKilled(z, reward) {
    if (z && z.brawler && this.triggerKO) {              // BOT-MENSAAP verslagen: Power Smash KO-cinematic
      this.triggerKO(z.x, z.cy, true);
      this.addFloatText(z.x, z.cy - 30, tl('VERSLAGEN!'), '#5aff7a', true);
    }
    if (this.level.arena) reward = Math.ceil(reward * ARENA_COIN_MULT); // minder munten in de arena
    else if (this.levelWasCleared) reward = 0;                          // herhaald level: geen kill-munten
    this.runCoins += reward;
    this.runKills += 1;
    if (this.level.arena) this.roundKills += 1;
    // lijk blijft op de grond liggen — NIET in de Mario-Journey (apen/vogels laten geen zombie-lijk achter)
    if (!this.jStage) {
      this.corpses.push({ x: z.x, dir: z.dir, type: z.type, tint: z.tint, flip: Math.random() < 0.5 });
      if (this.corpses.length > 60) this.corpses.shift();
    } else {
      for (let i = 0; i < 10; i++) this.particles.push(new Particle(z.x, z.cy, (Math.random() - 0.5) * 3.5, -Math.random() * 3, Math.random() < 0.5 ? '#6a4a2c' : '#caa06a', 420, 2));   // poef ipv lijk
    }
    // munitie valt soms op de grond (loop erover om op te rapen)
    if (Math.random() < (z.type.ammoDropChance || 0)) {
      const drop = (z.type.ammoDrop || 0) + Math.floor(Math.random() * 3);
      if (drop > 0) this.ammoDrops.push(new AmmoPickup(z.x, drop));
    }
    // soms een EHBO-doosje (vaker in melee-levels via healMult)
    if (Math.random() < (z.type.healChance || 0) * (this.level.healMult || 1)) this.healthDrops.push(new HealthPickup(z.x));
    // heel zeldzaam een raket — alleen als je de Rocket Launcher bezit
    if (Storage.ownsWeapon('rocket') && Math.random() < ROCKET_DROP_CHANCE) this.ammoDrops.push(new RocketPickup(z.x));
    // zeldzaam een power-up
    if (Math.random() < POWERUP_DROP_CHANCE) {
      const kind = POWERUP_LIST[Math.floor(Math.random() * POWERUP_LIST.length)];
      this.powerUps.push(new PowerUpPickup(z.x, kind));
    }
    // bloed + opspattende munt
    for (let i = 0; i < 10; i++)
      this.particles.push(new Particle(z.x, z.y - 14, (Math.random() - 0.5) * 4, -Math.random() * 3, '#6a9c4a', 400, 2));
    this.coinFx.push({ x: z.x, y: z.y - 24, vy: -0.8, life: 700 });
  },

  knockPlayer(dir, amount) {
    this.player.x = Math.max(20, Math.min(this.level.length + 40, this.player.x + dir * amount));
    // ook een beetje de lucht in
    if (this.player.onGround) {
      this.player.vy = -Math.min(7.5, 3 + amount * 0.4);
      this.player.onGround = false;
    }
  },

  // ---------- spawnen ----------
  updateSpawns(dt) {
    // ----- ARENA: spawnt van beide kanten, per ronde een vast aantal -----
    if (this.level.arena) {
      if (this.roundBreak > 0) return;                 // pauze tussen rondes
      if (this.roundSpawned >= this.roundTarget) return; // alles van deze ronde is al gespawnd
      const alive = this.zombies.reduce((n, z) => n + (z.alive ? 1 : 0), 0);
      if (alive >= this.level.maxAlive) return;
      this.spawnTimer += dt;
      if (this.spawnTimer < this.level.spawnEvery) return;
      this.spawnTimer = 0;
      // van links of rechts, net buiten beeld
      const fromLeft = Math.random() < 0.5;
      const sx = fromLeft ? (this.cam.x - 16) : (this.cam.x + CONFIG.VIEW_W + 16);
      const z = new Zombie(Math.max(20, Math.min(this.level.length + 20, sx)), this.level);
      this.zombies.push(z);
      this.roundSpawned++;
      return;
    }

    if (this.level.mode === 'boss') return;         // de baas regelt zijn eigen adds
    if (!this.spawnArmed) { this.spawnTimer = 0; return; }

    // kill-all-levels: spawn een vast totaal (zombieCount), daarna niets meer
    if (this.level.killAll && this.spawned >= this.level.zombieCount) return;

    // begrensd door hoeveel er tegelijk levend mogen zijn
    const aliveCount = this.zombies.reduce((n, z) => n + (z.alive ? 1 : 0), 0);
    if (aliveCount >= (this.level.maxAlive || 12)) { return; }

    this.spawnTimer += dt;
    // in horde-modus iets sneller spawnen voor de druk
    const interval = this.level.mode === 'horde' ? this.level.spawnEvery * 0.7 : this.level.spawnEvery;
    if (this.spawnTimer < interval) return;
    this.spawnTimer = 0;

    // parkour-levels: alleen vliegende zombie-vogels (uit de lucht, rechts)
    if (this.level.flyerOnly) {
      const z = new Zombie(this.cam.x + CONFIG.VIEW_W + 20, this.level, ZOMBIE_TYPES.flyer);
      z.y = 64 + Math.random() * 64;
      this.zombies.push(z);
      this.spawned++;
      return;
    }

    // jungle: af en toe vliegt er een vogel door het level (gewone schade)
    if (this.level.flyerChance && Math.random() < this.level.flyerChance) {
      const z = new Zombie(this.cam.x + CONFIG.VIEW_W + 20, this.level, ZOMBIE_TYPES.flyer);
      z.y = 60 + Math.random() * 70;
      this.zombies.push(z);
      this.spawned++;
      return;
    }

    // jungle: kleine luchtballon die zombies van bovenaf dropt (max 2 tegelijk)
    if (this.level.dropperChance && Math.random() < this.level.dropperChance) {
      const droppers = this.zombies.reduce((n, z) => n + (z.alive && z.type.id === 'dropper' ? 1 : 0), 0);
      if (droppers < 2) {
        const z = new Zombie(this.cam.x + CONFIG.VIEW_W + 20, this.level, ZOMBIE_TYPES.dropper);
        z.y = 44 + Math.random() * 18;
        this.zombies.push(z);
        this.spawned++;
        return;
      }
    }

    // probeer uit een deur in beeld te komen, anders vanaf de rechterkant
    let spawned = false;
    if (Math.random() < this.level.doorChance) {
      const visible = this.backdrop.doors.filter(
        (d) => d.x > this.cam.x + 20 && d.x < this.cam.x + CONFIG.VIEW_W - 20
      );
      if (visible.length) {
        const d = visible[Math.floor(Math.random() * visible.length)];
        d.bld.openUntil = this.time + 700;          // deur gaat open
        const z = new Zombie(d.x, this.level);
        z.emerging = 350;                            // vervaagt in
        this.zombies.push(z);
        this.particles.push(new Particle(d.x, CONFIG.GROUND_Y - 8, 0, -0.5, '#0a0d12', 300, 4));
        spawned = true;
      }
    }
    if (!spawned) {
      // vanaf de rechterkant (finish-kant), buiten beeld
      let sx = Math.max(this.player.x + 260, this.cam.x + CONFIG.VIEW_W + 20);
      sx = Math.min(sx, this.level.length + 80);
      this.zombies.push(new Zombie(sx, this.level));
    }
    this.spawned++;
  },

  // ---------- update ----------
  update(dt) {
    // Power Smash-juice: korte freeze-frame bij een rake klap (alleen in een Journey-stage)
    if (this.jStage && this.hitStop > 0) { this.hitStop = Math.max(0, this.hitStop - dt); return; }
    this.time += dt;
    this.dtScale = Math.min(3, dt / 16.6667);
    // juice-timers (impact-ringen / zweefcijfers / schermflitsen / KO)
    if (this.jStage) {
      if (this.impacts && this.impacts.length) this.impacts = this.impacts.filter((f) => this.time - f.born < f.dur);
      if (this.floatTexts && this.floatTexts.length) { for (const ft of this.floatTexts) { ft.y += ft.vy * this.dtScale; ft.vy += 0.05 * this.dtScale; } this.floatTexts = this.floatTexts.filter((ft) => this.time - ft.born < ft.dur); }
      if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt);
      if (this.smashFlash > 0) this.smashFlash = Math.max(0, this.smashFlash - dt);
      if (this.ko && this.time - this.ko.born > 1200) this.ko = null;
      this._maybeSpawnBrawler();
    }

    this.player.update(dt, this);

    // tutorial-popups (eerste levels): toon tekst als je een trigger-punt bereikt
    if (this.tutorials) {
      for (const tut of this.tutorials) {
        if (!tut.shown && this.player.x >= tut.x) { tut.shown = true; this.tutorialMsg = tut.text; this.tutorialUntil = this.time + 5000; }
      }
    }

    // "wapenen" zodra de speler iets doet: lopen, schieten, slaan of springen
    if (!this.spawnArmed && (this.player.x > 76 || Input.state.left || Input.state.right ||
        Input.state.attack || Input.state.melee || Input.jumpPressed)) this.spawnArmed = true;
    this.updateSpawns(dt);

    // extra eindgolf: bij het naderen van de finish komt er nog een flinke lading bij
    // (telt mee voor kill-all, zodat je 'm echt moet opruimen voor de finish)
    if (this.level.endWave && !this.endWaveDone && this.spawnArmed &&
        this.player.x > this.level.length * 0.82) {
      this.endWaveDone = true;
      const base = this.level.length;
      const n = 6 + Math.round((this.level.zombieCount || 30) * 0.10);
      for (let i = 0; i < n; i++) {
        const r = Math.random();
        const type = r < 0.4 ? ZOMBIE_TYPES.runner : (r < 0.62 ? ZOMBIE_TYPES.crawler : ZOMBIE_TYPES.walker);
        this.pendingZombies.push(new Zombie(base - 30 + Math.random() * 110, this.level, type));
      }
      // plus een paar luchtballonnen boven de finish
      for (let i = 0; i < 2; i++) {
        const d = new Zombie(base - 40 + Math.random() * 90, this.level, ZOMBIE_TYPES.dropper);
        d.y = 46 + Math.random() * 12;
        this.pendingZombies.push(d);
      }
      this.killReqBonus += n;   // deze golf hoort ook verslagen te worden
    }

    // in de boss fight valt er regelmatig munitie uit de lucht boven de speler
    if (this.level.isBoss && this.spawnArmed && this.boss && this.boss.alive) {
      this.bossAmmoTimer += dt;
      if (this.bossAmmoTimer >= 3800) {
        this.bossAmmoTimer = 0;
        const drop = new AmmoPickup(this.player.x + (Math.random() - 0.5) * 30, 30);
        drop.y = 6; drop.vy = 0; drop.vx = 0; drop.onGround = false; // valt recht naar beneden
        this.ammoDrops.push(drop);
      }
    }

    for (const z of this.zombies) z.update(dt, this);
    // door de baas opgeroepen zombies veilig na de lus toevoegen
    if (this.pendingZombies.length) { this.zombies.push(...this.pendingZombies); this.pendingZombies.length = 0; }
    for (const b of this.bullets) b.update(dt, this);
    for (const p of this.particles) p.update(dt, this);
    for (const c of this.coinFx) { c.y += c.vy * this.dtScale; c.life -= dt; }
    for (const a of this.ammoFx) { a.y += a.vy * this.dtScale; a.life -= dt; }
    for (const d of this.ammoDrops) d.update(dt, this);
    for (const h of this.healthDrops) h.update(dt, this);
    for (const pu of this.powerUps) pu.update(dt, this);
    for (const es of this.enemyShots) es.update(dt, this);
    for (const rk of this.rocketShots) rk.update(dt, this);

    // spikes/gaten: schade als je er op de grond op staat
    if (this.player.onGround && this.time - this.lastHazard > 500) {
      for (const o of this.obstacles) {
        if (o.type === 'hazard' && Math.abs(this.player.x - o.x) < o.w / 2 + 4) {
          this.player.takeDamage(12);
          this.knockPlayer(this.player.x < o.x ? -1 : 1, 6);
          this.lastHazard = this.time;
          break;
        }
      }
    }

    // schermschud aftellen
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 0.04);

    // opruimen (de baas wordt nooit weggecullt)
    // in kill-all/arena/Journey blijven levende zombies bestaan (vaste patrouille-plek!), anders cull links buiten beeld
    this.zombies = this.zombies.filter((z) => z.alive && (z === this.boss || this.level.killAll || this.level.arena || this.jStage || z.x > this.cam.x - 60));
    this.bullets = this.bullets.filter((b) => b.alive);
    this.particles = this.particles.filter((p) => p.life > 0);
    this.coinFx = this.coinFx.filter((c) => c.life > 0);
    this.ammoFx = this.ammoFx.filter((a) => a.life > 0);
    this.ammoDrops = this.ammoDrops.filter((d) => !d.dead);
    this.healthDrops = this.healthDrops.filter((h) => !h.dead);
    this.powerUps = this.powerUps.filter((pu) => !pu.dead);
    this.enemyShots = this.enemyShots.filter((es) => es.alive);
    this.rocketShots = this.rocketShots.filter((rk) => rk.alive);

    // munt-animatie frame
    this.coinAnimTimer += dt;
    if (this.coinAnimTimer > 120) { this.coinAnimTimer = 0; this.coinAnimFrame++; }

    // horde-timer (alleen actief zodra je begint te lopen)
    if (this.level.mode === 'horde' && this.spawnArmed) this.hordeLeft = Math.max(0, this.hordeLeft - dt);

    // checkpoint-vlag halverwege: haal 'm binnen de tijd
    if (this.level.midTime && !this.midReached) {
      if (this.player.x >= this.level.length * 0.5) {
        this.midReached = true;
      } else if (this.spawnArmed) {
        this.midLeft = Math.max(0, this.midLeft - dt);
        if (this.midLeft <= 0 && this.state === 'playing') { this.loseReason = 'time'; this.player.hp = 0; }
      }
    }

    // camera
    let target = this.player.x - CONFIG.VIEW_W * 0.35;
    this.cam.x = Math.max(0, Math.min(this.level.length - CONFIG.VIEW_W + 60, target));

    // in het ravijn / een jungle-gat gevallen = direct dood
    if ((this.level.parkour || this.overPit(this.player.x)) && this.player.y > FALL_DEATH_Y && this.state === 'playing') {
      this.player.hp = 0;
    }

    // ----- ARENA: rondes + game over -----
    if (this.level.arena) {
      if (this.player.hp <= 0) { this.arenaOver(); }
      else if (this.roundBreak > 0) {
        this.roundBreak -= dt;
        if (this.roundBreak <= 0) this.beginRound(this.round + 1);
      } else if (this.roundSpawned >= this.roundTarget && this.roundKills >= this.roundTarget) {
        // ronde voltooid: bonus + korte pauze
        this.runCoins += this.roundCfg.bonus;
        this.coinFx.push({ x: this.player.x, y: this.player.y - 30, vy: -0.8, life: 900 });
        this.roundBreak = 2400;
      }
      UI.updateHUD(this);
      return;
    }

    // Journey-stage: checkpoint-vlag + smash-kratten
    if (this.jStage) this.updateJourneyStage(dt);

    // win / verlies
    if (this.player.hp <= 0) {
      if (this.jStage && this.coop) {
        // co-op: 10 sec 'down' (partner speelt door), daarna respawn bij de partner
        const pl = this.player;
        if (!pl.downed) { pl.downed = true; this._coopReviveAt = this.time + 10000; if (window.Input) Input.clear(); this.shake = Math.max(this.shake, 6); }
        const pt = this.coop.partner;
        if (pt && !pt.al) { this._coopGameOver(false); return; }                         // allebei tegelijk down -> level mislukt
        if (pt && pt.al) { pl.x = pt.x; pl.y = pt.y; pl.vy = 0; pl.onGround = true; }   // volg je partner terwijl je wacht
        if (this.time >= this._coopReviveAt) { pl.downed = false; this.journeyRespawn(); }
        else { this.tutorialMsg = 'Terug in ' + Math.ceil((this._coopReviveAt - this.time) / 1000) + 's…'; this.tutorialUntil = this.time + 300; }
      }
      else if (this.jStage) { this.state = 'jdead'; Input.clear(); if (window.UI) UI.showJourneyDeath(this.jFlagReached); }   // solo: dood-scherm (checkpoint of menu)
      else this.lose();
    } else if (this.level.isBoss) {
      if (this.boss && !this.boss.alive) this.win();      // baas verslagen
    } else if (this.level.mode === 'horde') {
      if (this.hordeLeft <= 0 && this.spawnArmed) this.win(); // horde overleefd
    } else if (this.player.x >= this.level.length) {
      // kill-all: pas finishen als alle zombies dood zijn; Journey: eerst de bot-mensaap verslaan
      const brawlerBlocks = this.jStage && this.zombies.some((z) => z.alive && z.brawler);
      if ((!this.level.killAll || this.zombiesRemaining() <= 0) && !brawlerBlocks) {
        if (this.coop) {
          // co-op: allebei moeten over de finish zijn
          if (this.coop.partnerAtFinish) this.win();
          else { this.tutorialMsg = 'Wacht bij de finish op je partner!'; this.tutorialUntil = this.time + 600; }
        } else this.win();
      } else if (brawlerBlocks) { this.tutorialMsg = tl('Versla eerst de bot-mensaap!'); this.tutorialUntil = this.time + 900; }
    }

    UI.updateHUD(this);
  },

  win() {
    if (this.state !== 'playing') return;
    if (this.jStage) return this.finishJourneyStage();   // Journey: eigen beloningen/boss-overgang
    this.state = 'win';
    Storage.clearLevel(this.worldId, this.level.id);
    Storage.setAmmo(this.ammo);                  // kogel-eindstand blijft behouden
    Storage.setRockets(this.rockets);            // raket-eindstand blijft behouden
    // herhaald level = vaste 15 munten (geen farmen); eerste keer = volle beloning
    const total = this.levelWasCleared ? 15 : (this.runCoins + this.level.reward);
    Storage.addCoins(total);
    UI.showWin({ kills: this.runKills, coins: total, replay: this.levelWasCleared });
  },
  lose() {
    if (this.state !== 'playing') return;
    if (this.jStage) {                                   // Journey: verloren vóór de vlag
      const idx = this.jStage.idx; this.jStage = null;
      this.state = 'versusOver';
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('touch-controls').classList.add('hidden');
      if (window.Sfx) Sfx.play('lose');
      UI.showJourneyResult(false, idx, [], [], 0, 1);
      return;
    }
    this.state = 'lose';
    // GEEN munten en GEEN kogel-verlies bij een mislukte poging
    // (voorraad blijft zoals aan het begin van dit level)
    UI.showLose({ kills: this.runKills, coins: this.runCoins, reason: this.loseReason });
  },

  // aantal nog te doden zombies (kill-all-levels)
  zombiesRemaining() { return Math.max(0, this.level.zombieCount + (this.killReqBonus || 0) - this.runKills); },

  // arena voorbij: munten behoud je, highscore bijwerken
  arenaOver() {
    if (this.state !== 'playing') return;
    this.state = 'lose';
    Storage.addCoins(this.runCoins);
    const record = Storage.setArenaBest(this.round);
    UI.showArenaOver({ round: this.round, coins: this.runCoins, best: Storage.data.arenaBest, record: record });
  },

  // ---------- render ----------
  render() {
    const ctx = this.ctx;
    const W = CONFIG.VIEW_W, H = CONFIG.VIEW_H;

    const theme = this.theme || THEMES.city;

    // lucht (thema-kleuren)
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(0.6, theme.sky[1]);
    sky.addColorStop(1, theme.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // schermschud-offset (bij explosies)
    const shx = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    const shy = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    ctx.save();
    ctx.translate(shx, shy);

    if (theme.jungle) {
      // jungle: wazige zon door het bladerdak + lichtstralen
      ctx.globalAlpha = 0.16; Sprites.px(ctx, '#eaf6c0', W - 96, 16, 44, 44); ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.28; Sprites.px(ctx, '#f2f8cc', W - 86, 24, 24, 24); ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.06; ctx.fillStyle = '#dff0a8';
      for (let i = 0; i < 4; i++) { const lx = (i * 120 - this.cam.x * 0.1) % (W + 120) - 60; ctx.fillRect(lx, 0, 10, CONFIG.GROUND_Y); }
      ctx.globalAlpha = 1;
    } else if (!theme.mountains) {
      // sterren (statisch t.o.v. lucht)
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97) % W, sy = (i * 53) % 120;
        Sprites.px(ctx, i % 5 ? '#3a4660' : '#aeb8d0', sx, sy, 1, 1);
      }
      // maan met gloed
      ctx.globalAlpha = 0.18; Sprites.px(ctx, '#e8e2c8', W - 76, 24, 34, 34); ctx.globalAlpha = 1;
      Sprites.px(ctx, '#e8e2c8', W - 70, 30, 22, 22);
      Sprites.px(ctx, '#1a2438', W - 64, 26, 10, 22);
    } else {
      // berg-thema: zon + wolken
      ctx.globalAlpha = 0.2; Sprites.px(ctx, '#fff0c0', W - 72, 22, 32, 32); ctx.globalAlpha = 1;
      Sprites.px(ctx, '#ffe9a0', W - 66, 28, 20, 20);
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#cfe0ee';
      for (let i = 0; i < 5; i++) { const cx2 = (i * 140 - this.cam.x * 0.15) % (W + 120) - 60, cy2 = 24 + (i % 3) * 18; ctx.fillRect(cx2, cy2, 34, 7); ctx.fillRect(cx2 + 8, cy2 - 4, 22, 7); }
      ctx.globalAlpha = 1;
    }

    if (!this.level) return;

    // ---- verre laag (sterke parallax) ----
    const camFar = this.cam.x * 0.35;
    for (const b of this.backdrop.far) {
      const sx = b.x - camFar;
      if (sx + b.w < 0 || sx > W) continue;
      if (this.backdrop.mountains) this.drawPeak(ctx, sx, b.w, b.h, b.c, false);
      else if (this.backdrop.jungle) {
        ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.ellipse(sx + b.w / 2, CONFIG.GROUND_Y - b.h * 0.45, b.w * 0.6, b.h * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      }
      else Sprites.px(ctx, b.c, sx, CONFIG.GROUND_Y - b.h, b.w, b.h);
    }
    // mist-strook tussen lagen
    ctx.globalAlpha = 0.25;
    Sprites.px(ctx, theme.mountains ? '#9fb6cc' : (theme.jungle ? '#1e3a26' : '#2a3346'), 0, CONFIG.GROUND_Y - 40, W, 40);
    ctx.globalAlpha = 1;

    // ---- nabije laag (lichte parallax) ----
    const camNear = this.cam.x * 0.82;
    if (this.backdrop.mountains) {
      for (const b of this.backdrop.near) {
        const sx = b.x - camNear;
        if (sx + b.w < -10 || sx > W + 10) continue;
        this.drawPeak(ctx, sx, b.w, b.h, b.c, b.snow);
      }
    } else if (this.backdrop.jungle) {
      for (const b of this.backdrop.near) {
        const sx = b.x - camNear;
        if (sx < -50 || sx > W + 50) continue;
        const trunkTop = CONFIG.GROUND_Y - b.h;
        Sprites.px(ctx, '#3a2a1a', sx - 3, trunkTop, 6, b.h);          // stam
        Sprites.px(ctx, '#241a10', sx - 3, trunkTop, 2, b.h);          // schaduw
        ctx.fillStyle = b.c;                                            // kruin (overlappende cirkels)
        ctx.beginPath(); ctx.arc(sx, trunkTop, b.cw * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx - b.cw * 0.42, trunkTop + 7, b.cw * 0.46, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + b.cw * 0.42, trunkTop + 7, b.cw * 0.46, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.06)';                       // highlight
        ctx.beginPath(); ctx.arc(sx + b.cw * 0.18, trunkTop - b.cw * 0.2, b.cw * 0.32, 0, Math.PI * 2); ctx.fill();
      }
    } else
    for (const b of this.backdrop.near) {
      const sx = b.x - camNear;
      if (sx + b.w < -10 || sx > W + 10) continue;
      const top = CONFIG.GROUND_Y - b.h;
      Sprites.px(ctx, b.c, sx, top, b.w, b.h);
      Sprites.px(ctx, '#1f2738', sx, top, b.w, 3);            // dak-rand
      Sprites.px(ctx, '#00000033', sx, top, 3, b.h);          // schaduw links
      // ramen (deterministisch, geen geflikker)
      // patroon op VASTE wereldpositie (kolom/rij), niet op schermpositie -> geen geflikker
      let col = 0;
      for (let wx = sx + 7; wx < sx + b.w - 9; wx += 13) {
        let row = 0;
        for (let wy = top + 8; wy < CONFIG.GROUND_Y - 26; wy += 13) {
          const lit = b.lit && (((Math.round(b.x) * 17 + col * 31 + row * 7) % 100) < 22);
          Sprites.px(ctx, lit ? '#f2c94c' : '#10141d', wx, wy, 6, 7);
          if (lit) Sprites.px(ctx, '#fff4c8', wx, wy, 6, 2);
          row++;
        }
        col++;
      }
      // deur
      if (b.hasDoor) {
        const dx = b.doorX - camNear;
        const open = this.time < b.openUntil;
        Sprites.px(ctx, '#1a120c', dx, CONFIG.GROUND_Y - 26, 20, 26);   // kozijn
        Sprites.px(ctx, open ? '#05070a' : '#3a2a1c', dx + 2, CONFIG.GROUND_Y - 24, 16, 24); // deurblad
        if (!open) Sprites.px(ctx, '#caa84a', dx + 14, CONFIG.GROUND_Y - 12, 2, 2); // klink
        if (open) { ctx.globalAlpha = 0.5; Sprites.px(ctx, '#caa84a', dx + 2, CONFIG.GROUND_Y - 24, 16, 24); ctx.globalAlpha = 1; }
      }
    }

    // arena-scene (tribunes + hek + spotlights), in scherm-ruimte
    if (this.backdrop.arena) {
      const gy = CONFIG.GROUND_Y;
      // tribune-publiek (donkere bolletjes in rijen)
      for (let row = 0; row < 3; row++) {
        const ry = gy - 92 + row * 12;
        for (let cx2 = (row * 9) - (this.cam.x * 0.2 % 18); cx2 < W; cx2 += 18) {
          Sprites.px(ctx, row % 2 ? '#1c2030' : '#232838', cx2, ry, 6, 7);
          Sprites.px(ctx, '#3a4258', cx2 + 1, ry, 4, 3);
        }
      }
      // hek/balustrade voor de tribune
      Sprites.px(ctx, '#3a3326', 0, gy - 52, W, 4);
      for (let px = 0; px < W; px += 12) Sprites.px(ctx, '#2a2620', px, gy - 52, 2, 16);
      // spotlights van bovenaf
      ctx.globalAlpha = 0.12; ctx.fillStyle = '#ffe9a0';
      [W * 0.22, W * 0.5, W * 0.78].forEach((lx) => {
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx - 40, gy); ctx.lineTo(lx + 40, gy); ctx.closePath(); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // grond (wereld-ruimte)
    ctx.save();
    ctx.translate(-this.cam.x, 0);

    if (this.level.parkour) {
      // ravijn: donkere afgrond onderin (val = dood)
      Sprites.px(ctx, '#0c121c', this.cam.x, CONFIG.GROUND_Y - 2, W, H);
      ctx.globalAlpha = 0.6; Sprites.px(ctx, '#05070c', this.cam.x, CONFIG.GROUND_Y + 22, W, H); ctx.globalAlpha = 1;
      // zwevende platforms
      for (const pf of this.platforms) {
        if (pf.x + pf.w / 2 < this.cam.x - 12 || pf.x - pf.w / 2 > this.cam.x + W + 12) continue;
        Sprites.drawPlatform(ctx, pf.x, pf.y, pf.w);
      }
    } else {
      // stoep + straat (thema-kleuren)
      Sprites.px(ctx, theme.groundTop, this.cam.x, CONFIG.GROUND_Y, W, 6);    // stoeprand
      Sprites.px(ctx, theme.ground, this.cam.x, CONFIG.GROUND_Y + 6, W, H);   // ondergrond
      Sprites.px(ctx, theme.lamp, this.cam.x, CONFIG.GROUND_Y, W, 1);         // lichte rand
      ctx.globalAlpha = 0.25;
      Sprites.px(ctx, theme.lamp, this.cam.x, CONFIG.GROUND_Y + 1, W, 1);
      ctx.globalAlpha = 1;
      for (let gx = Math.floor(this.cam.x / 30) * 30; gx < this.cam.x + W; gx += 30) {
        Sprites.px(ctx, theme.groundTop, gx, CONFIG.GROUND_Y + 16, 14, 2);    // strepen/tegels
        Sprites.px(ctx, '#00000033', gx + 7, CONFIG.GROUND_Y + 26, 2, 2);     // gruis
      }
      // Journey (Mario): ravijn-gaten uit de grond snijden (val = respawn) + zwevende platforms
      if (this.jStage && this.pits) for (const p of this.pits) {
        if (p.x1 < this.cam.x - 12 || p.x0 > this.cam.x + W + 12) continue;
        const pw = p.x1 - p.x0;
        Sprites.px(ctx, '#0a1018', p.x0, CONFIG.GROUND_Y - 1, pw, H);       // donker gat over de grond heen
        ctx.globalAlpha = 0.6; Sprites.px(ctx, '#05070c', p.x0, CONFIG.GROUND_Y + 22, pw, H); ctx.globalAlpha = 1;
        Sprites.px(ctx, theme.groundTop, p.x0 - 5, CONFIG.GROUND_Y, 5, 4);  // afgebrokkelde randen
        Sprites.px(ctx, theme.groundTop, p.x1, CONFIG.GROUND_Y, 5, 4);
        Sprites.px(ctx, '#1a120a', p.x0 - 1, CONFIG.GROUND_Y, 2, 9);
        Sprites.px(ctx, '#1a120a', p.x1 - 1, CONFIG.GROUND_Y, 2, 9);
      }
      if (this.jStage) for (const pf of this.platforms) {
        if (pf.x + pf.w / 2 < this.cam.x - 12 || pf.x - pf.w / 2 > this.cam.x + W + 12) continue;
        Sprites.drawPlatform(ctx, pf.x, pf.y, pf.w, this.level.theme === 'beach' ? 'sand' : 'wood');
      }
      // straatlantaarns + lichtpoel
      for (const lp of this.backdrop.lamps) {
        if (lp.x < this.cam.x - 20 || lp.x > this.cam.x + W + 20) continue;
        Sprites.px(ctx, '#2a2e36', lp.x, CONFIG.GROUND_Y - 54, 3, 54);
        Sprites.px(ctx, '#2a2e36', lp.x - 6, CONFIG.GROUND_Y - 54, 14, 3);
        Sprites.px(ctx, theme.lamp, lp.x - 7, CONFIG.GROUND_Y - 52, 5, 4);
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = theme.lamp;
        ctx.beginPath();
        ctx.moveTo(lp.x - 5, CONFIG.GROUND_Y - 50);
        ctx.lineTo(lp.x - 26, CONFIG.GROUND_Y + 6);
        ctx.lineTo(lp.x + 22, CONFIG.GROUND_Y + 6);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // ravijn-gaten uit de bodem snijden (val = dood)
      if (this.pits) for (const p of this.pits) {
        if (p.x1 < this.cam.x - 12 || p.x0 > this.cam.x + W + 12) continue;
        const pw = p.x1 - p.x0;
        Sprites.px(ctx, '#0a1018', p.x0, CONFIG.GROUND_Y - 1, pw, H);
        ctx.globalAlpha = 0.6; Sprites.px(ctx, '#05070c', p.x0, CONFIG.GROUND_Y + 22, pw, H); ctx.globalAlpha = 1;
        // begroeide, afgebrokkelde randen
        Sprites.px(ctx, theme.groundTop, p.x0 - 5, CONFIG.GROUND_Y, 5, 4);
        Sprites.px(ctx, theme.groundTop, p.x1, CONFIG.GROUND_Y, 5, 4);
        Sprites.px(ctx, '#1a120a', p.x0 - 1, CONFIG.GROUND_Y, 2, 9);
        Sprites.px(ctx, '#1a120a', p.x1 - 1, CONFIG.GROUND_Y, 2, 9);
      }
      // zwevende platforms boven de grond (wereld 3)
      for (const pf of this.platforms) {
        if (pf.x + pf.w / 2 < this.cam.x - 12 || pf.x - pf.w / 2 > this.cam.x + W + 12) continue;
        Sprites.drawPlatform(ctx, pf.x, pf.y, pf.w);
      }
    }

    // finish — stok met wapperende vlag (op het eindplatform bij parkour)
    const fx = this.level.length;
    const wWorld = WORLDS.find((w) => w.id === this.worldId);
    const isLast = wWorld && this.level.id === wWorld.levels.length;
    const flagY = (this.level.parkour && this.platforms.length) ? this.platforms[this.platforms.length - 1].y : CONFIG.GROUND_Y;
    if (!this.level.isBoss && !this.level.arena) Sprites.drawFlag(ctx, fx, flagY, this.time, isLast);

    // checkpoint-vlag halverwege
    if (this.level.midTime) Sprites.drawCheckpoint(ctx, Math.round(this.level.length * 0.5), CONFIG.GROUND_Y, this.time, this.midReached);
    else if (this.level.midFlag) Sprites.drawCheckpoint(ctx, this.jFlagX, CONFIG.GROUND_Y, this.time, this.jFlagReached);   // Journey: respawn-vlag
    // Journey: smashbare power-up-kratten
    if (this.jStage && this.crates) for (const c of this.crates) {
      if (c.broken) continue;
      const bobC = Math.round(Math.sin(this.time / 300 + c.x) * 2);
      const cy = c.y + bobC;
      Sprites.px(ctx, '#10131c', c.x - 10, cy - 18, 20, 20);          // inkt-rand
      Sprites.px(ctx, '#a97844', c.x - 9, cy - 17, 18, 18);           // hout
      Sprites.px(ctx, '#c99a66', c.x - 9, cy - 17, 18, 4);            // licht bovenop
      Sprites.px(ctx, '#7c5228', c.x - 9, cy - 3, 18, 4);             // schaduw onder
      Sprites.px(ctx, '#5f3d1c', c.x - 9, cy - 10, 18, 2);            // band
      Sprites.px(ctx, '#ffd24a', c.x - 3, cy - 14, 6, 3);             // gouden bliksem (power-up!)
      Sprites.px(ctx, '#ffd24a', c.x - 1, cy - 11, 3, 5);
      Sprites.px(ctx, '#ffe27a', c.x - 2, cy - 13, 2, 2);
    }

    // partikels (achter entiteiten)
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      Sprites.px(ctx, p.color, p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // obstakels (auto's, lage balken, spikes, vaten)
    for (const o of this.obstacles) {
      if (o.x < this.cam.x - 40 || o.x > this.cam.x + CONFIG.VIEW_W + 40) continue;
      Sprites.drawObstacle(ctx, o, CONFIG.GROUND_Y);
    }

    // dode zombies blijven liggen (op de grond, achter alles)
    for (const cp of this.corpses) {
      Sprites.drawCorpse(ctx, cp.x, CONFIG.GROUND_Y, cp.dir, cp);
    }

    // munitie-pickups op de grond (knipperen als ze bijna weg zijn)
    for (const d of this.ammoDrops) {
      if (d.life < 3000 && Math.floor(d.life / 150) % 2 === 0) continue;
      if (d.onGround) Sprites.shadow(ctx, d.x, CONFIG.GROUND_Y, 6);
      if (d.isRocket) Sprites.drawRocketPickup(ctx, d.x, d.y, d.bob);
      else Sprites.drawAmmoBox(ctx, d.x, d.y, d.bob);
    }
    // EHBO-doosjes
    for (const h of this.healthDrops) {
      if (h.life < 3000 && Math.floor(h.life / 150) % 2 === 0) continue;
      if (h.onGround) Sprites.shadow(ctx, h.x, CONFIG.GROUND_Y, 6);
      Sprites.drawHealthBox(ctx, h.x, h.y, h.bob);
    }
    // power-ups
    for (const pu of this.powerUps) {
      if (pu.life < 3000 && Math.floor(pu.life / 150) % 2 === 0) continue;
      if (pu.onGround) Sprites.shadow(ctx, pu.x, CONFIG.GROUND_Y, 6);
      Sprites.drawPowerUp(ctx, pu.x, pu.y, pu.kind, pu.bob);
    }

    // zombies (op x gesorteerd zodat dichterbij vóór komt)
    const sorted = this.zombies.slice().sort((a, b) => a.x - b.x);
    for (const z of sorted) {
      let alpha = 1;
      if (z.emerging > 0) alpha = Math.min(1, 1 - z.emerging / 350 + 0.2);
      if (z.onGround && z.emerging <= 0) Sprites.shadow(ctx, z.x, CONFIG.GROUND_Y, 8 * z.scale);
      ctx.globalAlpha = alpha;
      if (z.hitFlash > 0) ctx.globalAlpha = alpha * 0.55;
      Sprites.drawZombie(ctx, z.x, z.y, z.dir, z);
      ctx.globalAlpha = 1;
      // zwakke-plek-indicator op de kop van de baas
      if (z.type.id === 'boss' && z.alive && z.emerging <= 0) {
        Sprites.drawWeakpoint(ctx, z.x, z.y + (z.weakTop + z.weakBot) / 2, z.weakHalfW, this.time);
      }
      // hp-balkje boven de kop (niet voor de baas — die heeft de grote balk)
      if (z.hp < z.maxHp && z.emerging <= 0 && z.type.id !== 'boss') {
        const bw = 16 * z.scale;
        const by = z.cy - z.halfH - 6;
        Sprites.px(ctx, '#000', z.x - bw / 2 - 1, by - 1, bw + 2, 4);
        const col = z.type.id === 'brute' ? '#d98a30' : '#6abe30';
        Sprites.px(ctx, col, z.x - bw / 2, by, bw * (z.hp / z.maxHp), 2);
      }
    }

    // CO-OP: gast ziet de zombies van de host als ghosts; partner altijd als tweede speler
    if (this.coop) {
      if (this.coop.role === 'guest') for (const g of this.coop.z) {
        Sprites.shadow(ctx, g.x, CONFIG.GROUND_Y, 8);
        Sprites.drawZombie(ctx, g.x, g.y, g.dir, g);
      }
      const pt = this.coop.partner;
      if (pt && pt.al) {
        const pch = CHARACTERS[pt.ch] || CHARACTERS.ryan;
        if (pt.g) Sprites.shadow(ctx, pt.x, pt.y + 1, 7);
        Sprites.drawCharacter(ctx, Math.round(pt.x), Math.round(pt.y), pt.d || 1, pch.palette, {
          walkPhase: pt.wp || 0, airborne: !pt.g, attacking: !!pt.a, weapon: 'bat',
          build: pch.build, hair: pch.hair, t: this.time,
        });
        ctx.fillStyle = '#8fd0ff'; ctx.font = 'bold 8px "Courier New", monospace'; ctx.textAlign = 'center';
        ctx.fillText('P2', Math.round(pt.x), Math.round(pt.y) - 46); ctx.textAlign = 'left';
      }
    }

    // kogels
    for (const b of this.bullets) Sprites.drawBullet(ctx, b.x, b.y);
    // baas-projectielen (zuur)
    for (const es of this.enemyShots) { if (es.boom) Sprites.drawBoomerangFly(ctx, es.x, es.y, es.spin); else Sprites.drawEnemyShot(ctx, es.x, es.y, es.spin); }
    // raketten
    for (const rk of this.rocketShots) Sprites.drawRocket(ctx, rk.x, rk.y, rk.vx);

    // co-op: terwijl je 'down' bent zie je jezelf als doorzichtige geest bij je partner
    if (this.player.downed) ctx.globalAlpha = 0.35;
    // speler (Ryan) — schaduw op de grond, of op het platform bij parkour
    if (this.player.onGround && !this.player.downed) Sprites.shadow(ctx, this.player.x, this.level.parkour ? this.player.y + 1 : CONFIG.GROUND_Y, 7);
    const swingingBat = this.time < (this.player.swingUntil || 0) && this.player.swingWeapon;
    const pOpts = {
      walkPhase: this.player.walkPhase,
      airborne: !this.player.onGround,
      ducking: this.player.ducking,
      attacking: this.time < this.player.attackAnimUntil,
      weapon: this.player._shieldUp ? 'shield' : (swingingBat ? this.player.swingWeapon : this.player.weaponId),
      build: this.player.build,
      hair: this.player.hairStyle,
      shielding: this.player._shieldUp,
      hat: Storage.data.equippedHat, t: this.time,
      rage: this.player.hasBuff('rage', this.time), burning: this.player.burnUntil > this.time,
      outfit: this.player.outfit,
    };
    Sprites.drawCharacter(ctx, this.player.x, this.player.y, this.player.dir, this.player.pal, pOpts);
    if (this.player.downed) ctx.globalAlpha = 1;
    // hit-flash: je ziet de klap aan je character (witte silhouet-flits) — Journey-mensapen
    if (this.player._flashUntil > this.time) {
      ctx.globalAlpha = Math.min(0.85, (this.player._flashUntil - this.time) / 360 * 0.95);
      Sprites.drawCharacter(ctx, this.player.x, this.player.y, this.player.dir, this._flashPal(this.player.pal), Object.assign({}, pOpts, { noInk: true }));
      ctx.globalAlpha = 1;
    }

    // zwevende munten
    for (const c of this.coinFx) {
      ctx.globalAlpha = Math.max(0, c.life / 700);
      Sprites.drawCoin(ctx, c.x, c.y, this.coinAnimFrame);
    }
    ctx.globalAlpha = 1;

    // zwevende "+kogels" / "+HP"
    ctx.font = '7px "Courier New", monospace';
    ctx.textAlign = 'center';
    for (const a of this.ammoFx) {
      ctx.globalAlpha = Math.max(0, a.life / 800);
      if (a.rocket) { ctx.fillStyle = '#ff8a3a'; ctx.fillText('+1 raket', a.x + 12, a.y); }
      else if (a.hp) { ctx.fillStyle = '#ff6b6b'; ctx.fillText('+' + a.hp + 'hp', a.x + 10, a.y); }
      else if (a.n > 0) { ctx.fillStyle = '#ffe9a0'; ctx.fillText('+' + a.n, a.x + 10, a.y); }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    // ---- Power Smash-juice (Journey): impact-schokgolven, KO-ring, zweefcijfers (wereld-ruimte) ----
    if (this.jStage) {
      if (this.impacts) for (const im of this.impacts) {
        const t = (this.time - im.born) / im.dur; if (t < 0 || t >= 1) continue;
        const R = (im.big ? 6 : 4) + t * (im.big ? 34 : 22);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = im.big ? 2.4 : 1.6; ctx.globalAlpha = (1 - t) * 0.9;
        ctx.beginPath(); ctx.arc(im.x, im.y, R, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (this.ko) {
        const t = (this.time - this.ko.born) / 520;
        if (t >= 0 && t < 1) {
          const R = 8 + t * 92; ctx.strokeStyle = this.ko.won ? '#9dffb0' : '#ff9a9a'; ctx.lineWidth = 3; ctx.globalAlpha = (1 - t) * 0.9;
          ctx.beginPath(); ctx.arc(this.ko.x, this.ko.y - 8, R, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      if (this.floatTexts) for (const ft of this.floatTexts) {
        const t = (this.time - ft.born) / ft.dur; if (t < 0 || t >= 1) continue;
        ctx.globalAlpha = t < 0.15 ? t / 0.15 : (1 - (t - 0.15) / 0.85);
        ctx.font = 'bold ' + Math.round(7 * ft.scale) + 'px "Courier New", monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#000'; ctx.fillText(ft.text, ft.x + 0.6, ft.y + 0.6);
        ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
      }
    }

    ctx.restore();   // wereld (camera)
    ctx.restore();   // schermschud

    // schermflitsen (Journey-juice): witte KO-flits + rode "jij geraakt"-rand
    if (this.jStage) {
      if (this.smashFlash > 0) { ctx.globalAlpha = Math.min(0.55, this.smashFlash / 210 * 0.55); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      if (this.hurtFlash > 0) {
        const ha = Math.min(0.5, this.hurtFlash / 240 * 0.5);
        const hg = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.75);
        hg.addColorStop(0, 'rgba(210,30,30,0)'); hg.addColorStop(1, 'rgba(190,20,20,' + ha + ')');
        ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
      }
    }

    // (objectief/timers/boss-naam staan nu als scherpe DOM-tekst, zie #game-banner)

    // actieve power-ups (icoontjes met aflopende balk), midden-onder
    const active = [];
    for (const k of POWERUP_LIST) {
      const end = this.player.buffs[k] || 0;
      if (end > this.time) active.push({ k, left: end - this.time });
    }
    if (active.length) {
      const iw = 30, totalW = active.length * iw, startX = (W - totalW) / 2;
      active.forEach((a, i) => {
        const pu = POWERUPS[a.k];
        const ix = startX + i * iw, iy = H - 16;
        ctx.fillStyle = '#000'; ctx.fillRect(ix, iy, 26, 11);
        ctx.fillStyle = pu.color; ctx.fillRect(ix, iy, 26 * Math.min(1, a.left / pu.dur), 11);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 7px "Courier New", monospace';
        ctx.textAlign = 'center'; ctx.fillText(pu.name, ix + 13, iy + 8);
        ctx.textAlign = 'left';
      });
    }

    // (pauze wordt nu als DOM-menu getoond, zie #pause-screen)
  },

  // ============ 1 vs 1 VERSUS ============
  // Journey-level starten (singleplayer tegen een mensaap-bot, Power Smash)
  startJourney(idx, worldId) {
    worldId = worldId || 1;
    const world = JOURNEY[worldId]; if (!world) return;
    const lv = world.levels[idx - 1]; if (!lv) return;
    // ---- Temple-wereld: eigen tempel-arena met DICHTE ondergrond (geen gat), per level iets anders ----
    let mapObj;
    if (worldId === 2) {
      const interior = idx >= 10;    // vanaf level 10: de tempel van BINNEN (donkere zaal, dichte vloer, alleen via de zijkant eraf)
      const layout = interior
        ? TEMPLE_INTERIOR_LAYOUTS[(lv.layout || 0) % TEMPLE_INTERIOR_LAYOUTS.length]   // smalle vloer met afgrond aan de zijkanten
        : TEMPLE_JOURNEY_LAYOUTS[(lv.layout || 0) % TEMPLE_JOURNEY_LAYOUTS.length];
      const treasure = idx === 15;   // eindbaas: donkere schatkamer vol goud & juwelen
      mapObj = {
        id: 'templeJ', name: lv.name, sky: interior ? ['#2c2016', '#0d0906'] : ['#f2b96a', '#9a5a4a'], void: '#0a0604', plat: 'stone', stone: true, temple: true, templeIn: interior, treasure: treasure, noPortals: true,
        w: 360, fallY: 214, spawnL: { x: 120, y: 150 }, spawnR: { x: 240, y: 150 }, platforms: layout,
      };
      this.journey = { world: worldId, idx, lv };
      this.startVersus('host', { mapObj, mode: 'smash', bot: true, diff: lv.diff, journey: true, journeyDrops: (lv.drops || []), boss: !!lv.boss, bossFight: !!lv.bossFight, botChar: lv.bot, swapSides: Math.random() < 0.5 });
      this.journey = { world: worldId, idx, lv };
      return;
    }
    // vanaf level 10 gaat het het oerwoud in -> jungle-maps (baas op level 15 met troonzaal)
    if (idx >= 10) {
      const layout = JUNGLE_LAYOUTS[(idx - 10) % JUNGLE_LAYOUTS.length];
      mapObj = {
        id: 'jungleJ', name: lv.name, sky: ['#2f6e3a', '#7fc06a'], void: '#0c2416', plat: 'wood', wood: true, jbg: true, throne: !!lv.boss,
        w: 360, fallY: 214, spawnL: { x: 120, y: 150 }, spawnR: { x: 240, y: 150 }, platforms: layout,
      };
    } else {
      const layout = BEACH_LAYOUTS[(idx - 1) % BEACH_LAYOUTS.length];
      mapObj = {
        id: 'beach', name: lv.name, sky: ['#8ad0f0', '#cde7f7'], void: '#1c4a5e', plat: 'sand', sand: true, beach: true,
        w: 360, fallY: 214, spawnL: { x: 120, y: 150 }, spawnR: { x: 240, y: 150 }, platforms: layout,
      };
    }
    this.journey = { world: 1, idx, lv };
    this.startVersus('host', { mapObj, mode: 'smash', bot: true, diff: lv.diff, journey: true, journeyDrops: (lv.drops || []), boss: !!lv.boss, bossFight: !!lv.bossFight, botChar: lv.bot, swapSides: Math.random() < 0.5 });
    this.journey = { world: 1, idx, lv };   // startVersus reset 'm; opnieuw zetten
  },

  // ===== Journey: verhaal-cutscenes (spelen op het canvas) =====
  // 'intro' = aangespoeld/ontvoerd (vóór level 1). De andere scripts spelen de eerste
  // keer dat je een NIEUWE mensaap tegenkomt: baviaan (lvl 5), koba (lvl 10), kong (lvl 15).
  _storyDef(script) {
    const S = {
      bonzo: { theme: 'jungle', foe: 'bonzo', scale: 1.15, caps: [
        'Diep in het oerwoud verspert een pezige chimp je de weg.',
        'BONZO — razendsnel en gemeen — springt van tak tot tak.',
        'Hij daagt je uit… knokken is je enige uitweg!'] },
      baviaan: { theme: 'beach', foe: 'baviaan', scale: 1.12, caps: [
        'Je breekt los en vlucht langs de vloedlijn…',
        'Maar een grotere, getekende BAVIAAN verspert je de weg.',
        'Hij bonkt op z\'n borst — vechten is je enige uitweg!'] },
      koba: { theme: 'jungle', foe: 'koba', scale: 1.16, caps: [
        'Diep in de jungle doemt de oude APENTEMPEL op.',
        'KOBA, de bruut die de horde leidt, wacht je op.',
        'Versla hem om door te dringen tot de top.'] },
      kong: { theme: 'jungle', foe: 'kong', scale: 1.5, caps: [
        'In het hart van de jungle rijst de troonzaal van de GORILLA KING op.',
        'De koning van het eiland brult — de grond trilt.',
        'Dit is het laatste gevecht. Versla de GORILLA KING!'] },
    };
    return S[script] || null;
  },
  playJourneyIntro(script, onDone) {
    if (typeof script === 'function') { onDone = script; script = 'intro'; }
    this._storyScript = script || 'intro';
    this._storyData = (this._storyScript !== 'intro') ? this._storyDef(this._storyScript) : null;
    this._storyChar = CHARACTERS[Storage.data.equippedCharacter] || CHARACTERS.ryan;
    this._storySegs = this._buildStorySegs(this._storyScript);   // klik-gestuurde stukjes
    this._storySeg = 0; this._storyElapsed = 0; this._storyClock = 0; this._storyFrozen = false;
    this._storyDone = onDone;
    this.state = 'story';
    const el = document.getElementById('journey-story'); if (el) el.classList.remove('hidden');
    this._showStoryNext(false);
    if (window.Sfx) Sfx.music(this._storyData && this._storyData.theme === 'jungle' ? 'jungle' : 'beach');
  },
  // het verhaal stopt na elke tekst en wacht op "Verder"; dit gaat naar het volgende stukje
  storyNext() {
    if (this.state !== 'story') return;
    const segs = this._storySegs || [];
    this._storySeg = (this._storySeg || 0) + 1;
    this._storyElapsed = 0; this._storyFrozen = false; this._showStoryNext(false);
    if (window.Sfx) Sfx.play('click');
    if (this._storySeg >= segs.length) this.finishStory();
  },
  _showStoryNext(show) {
    const b = document.getElementById('btn-journey-next'); if (b) b.classList.toggle('hidden', !show);
  },
  skipStory() { this.finishStory(); },
  finishStory() {
    if (this.state !== 'story') return;
    this.state = 'menu';
    const el = document.getElementById('journey-story'); if (el) el.classList.add('hidden');
    this._showStoryNext(false); this._storyFrozen = false; this._storySeg = 0;
    const cb = this._storyDone; this._storyDone = null;
    if (cb) cb();
  },
  _storyApe(ctx, x, fy, dir, ph) {
    Sprites.drawCharacter(ctx, Math.round(x), Math.round(fy), dir, CHARACTERS.aapje.palette, { walkPhase: ph, airborne: false, weapon: null, build: 'small', hair: 'natural' });
  },
  // een tegenstander-mensaap tekenen (eventueel groter geschaald, voor de eindbaas)
  _storyFighter(ctx, charId, fx, fy, dir, ph, scale, opts) {
    const c = CHARACTERS[charId] || CHARACTERS.aapje;
    const o = Object.assign({ walkPhase: ph, weapon: null, build: c.build, hair: c.hair }, opts || {});
    const s = scale || 1;
    if (s === 1) { Sprites.drawCharacter(ctx, Math.round(fx), Math.round(fy), dir, c.palette, o); return; }
    ctx.save(); ctx.translate(Math.round(fx), Math.round(fy)); ctx.scale(s, s);
    Sprites.drawCharacter(ctx, 0, 0, dir, c.palette, o);
    ctx.restore();
  },
  _storyBg(t, theme) {
    const ctx = this.ctx, W = CONFIG.VIEW_W, H = CONFIG.VIEW_H, gy = CONFIG.GROUND_Y;
    if (theme === 'temple') {
      // ---- avondlucht met kleurverloop + zon ----
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#f7c877'); sky.addColorStop(0.5, '#e79a5a'); sky.addColorStop(1, '#8a4a42'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.28; ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.arc(W * 0.5, 40, 34, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffedb0'; ctx.beginPath(); ctx.arc(W * 0.5, 40, 17, 0, 6.2832); ctx.fill();   // felle zonnekern
      // verre heuvels achter de tempels
      ctx.fillStyle = '#7a4a44'; for (let x = -10; x < W + 20; x += 70) { ctx.beginPath(); ctx.arc(x, gy - 6, 46, Math.PI, 0); ctx.fill(); }
      // geschaduwde piramides (twee tinten: zon-kant vs schaduw-kant)
      const pyr = (cx, w2, h2, lit, dark) => { for (let i = 0; i < h2; i += 4) { const iw = w2 * (1 - i / h2); const x0 = Math.round(cx - iw / 2), iwr = Math.round(iw); ctx.fillStyle = lit; ctx.fillRect(x0, gy - i - 4, iwr, 4); ctx.fillStyle = dark; ctx.fillRect(Math.round(cx), gy - i - 4, Math.round(x0 + iwr - cx), 4); } };
      pyr(58, 96, 66, '#9a7550', '#6e5236'); pyr(W - 58, 96, 66, '#9a7550', '#6e5236');
      pyr(W * 0.5, 82, 52, '#8a6a48', '#5e4630');
      // trap-treden op de grote middelste piramide + donkere ingang
      ctx.fillStyle = '#4a3826'; for (let s = 0; s < 4; s++) ctx.fillRect(Math.round(W * 0.5) - 10 + s, gy - 6 - s * 4, 20 - s * 2, 2);
      ctx.fillStyle = '#241a10'; ctx.fillRect(Math.round(W * 0.5) - 6, gy - 22, 12, 22);
      ctx.fillStyle = '#c98a3a'; ctx.fillRect(Math.round(W * 0.5) - 7, gy - 24, 14, 3);   // gouden latei boven de poort
      // fakkels naast de ingang (flakkerende gloed)
      const torch = (fx) => { ctx.fillStyle = '#3a2a18'; ctx.fillRect(fx, gy - 20, 2, 14); const fl = 3 + Math.round(Math.sin(t / 90 + fx) * 1.4); ctx.fillStyle = '#ffb23a'; ctx.beginPath(); ctx.arc(fx + 1, gy - 22, fl, 0, 6.2832); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(fx + 1, gy - 22, fl * 0.5, 0, 6.2832); ctx.fill(); };
      torch(W * 0.5 - 16); torch(W * 0.5 + 14);
      // stenen vloer met tegels + scheuren
      ctx.fillStyle = '#5a4028'; ctx.fillRect(0, gy, W, H - gy); ctx.fillStyle = '#6a4a30'; ctx.fillRect(0, gy, W, 4);
      ctx.fillStyle = '#4a3420'; for (let x = 6; x < W; x += 26) { Sprites.px(ctx, '#4a3420', x, gy + 8, 12, 2); Sprites.px(ctx, '#4a3420', x + 13, gy + 16, 2, H - gy - 16); }
      ctx.strokeStyle = '#3a2818'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W * 0.3, gy + 4); ctx.lineTo(W * 0.36, gy + 14); ctx.lineTo(W * 0.33, H); ctx.stroke();   // scheur
      return;
    }
    if (theme === 'jungle') {
      // ---- gelaagde jungle-lucht: donker bladerdak boven -> lichter naar de vloer ----
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#123f22'); sky.addColorStop(0.5, '#2f6e3a'); sky.addColorStop(1, '#88ca70'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // schuine zonneschacht door het bladerdak (diepte + sfeer)
      ctx.save(); ctx.globalAlpha = 0.10; ctx.fillStyle = '#eaffc0'; ctx.beginPath(); ctx.moveTo(W * 0.56, 0); ctx.lineTo(W * 0.76, 0); ctx.lineTo(W * 0.52, gy); ctx.lineTo(W * 0.36, gy); ctx.closePath(); ctx.fill(); ctx.restore();
      // verre, wazige boomlaag
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#1c5030'; for (let x = -8; x < W + 12; x += 34) { ctx.beginPath(); ctx.arc(x, 86, 24, 0, 6.2832); ctx.fill(); } ctx.globalAlpha = 1;
      // ==== BOOMSTAMMEN EERST (achter de bladeren) ====
      const trunks = [30, 128, 232, 322];
      trunks.forEach((tx, i) => {
        const tw = 9 + (i % 2) * 2;
        ctx.fillStyle = '#4a2f1a'; ctx.fillRect(tx, 34, tw, gy - 34);
        ctx.fillStyle = '#5e3d22'; ctx.fillRect(tx, 34, 3, gy - 34);              // licht-kant
        ctx.fillStyle = '#33200f'; ctx.fillRect(tx + tw - 2, 34, 2, gy - 34);     // schaduw-kant
        for (let y = 52; y < gy - 6; y += 14) Sprites.px(ctx, '#33200f', tx + 2, y, tw - 4, 2);   // bast-textuur
        ctx.fillStyle = '#4a2f1a'; ctx.fillRect(tx - 4, gy - 7, tw + 8, 7);        // wortelvoet
      });
      // ==== BLADERDAK BOVENOP (dekt de stamtoppen af) ====
      ctx.fillStyle = '#1e5a30'; for (let x = -10; x < W + 12; x += 22) { ctx.beginPath(); ctx.arc(x, 28, 22, 0, 6.2832); ctx.fill(); }   // donkere achterlaag
      ctx.fillStyle = '#2e7a3f'; for (let x = 4; x < W + 12; x += 26) { ctx.beginPath(); ctx.arc(x, 44, 19, 0, 6.2832); ctx.fill(); }
      ctx.fillStyle = '#3d9450'; for (let x = 14; x < W + 12; x += 30) { ctx.beginPath(); ctx.arc(x, 38, 12, 0, 6.2832); ctx.fill(); }    // lichte highlights
      // hangende lianen met blaadje
      ctx.strokeStyle = '#2b6b39'; ctx.lineWidth = 2; [70, 176, 292].forEach((vx, i) => { ctx.beginPath(); ctx.moveTo(vx, 40); for (let y = 40; y <= 92; y += 8) ctx.lineTo(vx + Math.sin((y + i * 20) / 14) * 4, y); ctx.stroke(); ctx.fillStyle = '#3d9450'; ctx.beginPath(); ctx.arc(vx + Math.sin((92 + i * 20) / 14) * 4, 94, 3, 0, 6.2832); ctx.fill(); });
      // vloer + grassprietjes + varens
      ctx.fillStyle = '#3d6b2e'; ctx.fillRect(0, gy, W, H - gy); ctx.fillStyle = '#2f5524'; ctx.fillRect(0, gy + 8, W, H - gy - 8);
      ctx.fillStyle = '#4f8a38'; ctx.fillRect(0, gy, W, 3);
      ctx.strokeStyle = '#5aa03f'; ctx.lineWidth = 1.3; for (let x = 6; x < W; x += 15) { const h = 4 + ((x * 7) % 5); ctx.beginPath(); ctx.moveTo(x, gy + 3); ctx.lineTo(x - 2, gy + 3 - h); ctx.moveTo(x, gy + 3); ctx.lineTo(x + 2, gy + 3 - h); ctx.moveTo(x, gy + 3); ctx.lineTo(x, gy + 3 - h - 1); ctx.stroke(); }
      return;
    }
    // ---- STRAND: zonnige lucht, gelaagde zee, glinsterende golven, nat zand ----
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#6ec1ea'); sky.addColorStop(0.6, '#a9dcf3'); sky.addColorStop(1, '#e6f5fb'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // zon met zachte gloed
    ctx.globalAlpha = 0.28; ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(W - 52, 32, 28, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff0a0'; ctx.beginPath(); ctx.arc(W - 52, 32, 14, 0, 6.2832); ctx.fill();
    // pluizige wolkjes
    const cloud = (cx, cy, s) => { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, 8 * s, 0, 6.2832); ctx.arc(cx + 9 * s, cy + 2, 10 * s, 0, 6.2832); ctx.arc(cx + 20 * s, cy, 8 * s, 0, 6.2832); ctx.fill(); };
    cloud(46 + (t * 0.004) % 30, 28, 1); cloud(150, 20, 0.75);
    // verre zee met horizon + dieptekleur
    const seaTop = gy - 32;
    const sea = ctx.createLinearGradient(0, seaTop, 0, gy); sea.addColorStop(0, '#2f8fc4'); sea.addColorStop(1, '#58b8e0'); ctx.fillStyle = sea; ctx.fillRect(0, seaTop, W, gy - seaTop);
    ctx.fillStyle = '#2477a8'; ctx.fillRect(0, seaTop, W, 2);   // horizonlijn
    // glinsterende golfkammen (bewegen mee)
    for (let y = seaTop + 7; y < gy - 3; y += 7) { for (let x = ((y * 3) % 18); x < W; x += 24) { const wob = Math.round(Math.sin(t / 300 + x * 0.1 + y) * 1.4); Sprites.px(ctx, 'rgba(255,255,255,0.45)', Math.round(x + (t * 0.02) % 24), y + wob, 6, 1); } }
    // schuimrand tegen het zand
    for (let x = 0; x < W; x += 10) { const f = Math.round(Math.sin(t / 260 + x * 0.14) * 2); Sprites.px(ctx, '#eef7fb', x, gy - 3 + f, 8, 2); }
    // zand met korrel-textuur + schelpjes
    ctx.fillStyle = '#e9d08a'; ctx.fillRect(0, gy, W, H - gy); ctx.fillStyle = '#d3b06a'; ctx.fillRect(0, gy + 8, W, H - gy - 8);
    ctx.fillStyle = '#f0dca0'; ctx.fillRect(0, gy, W, 3);
    for (let i = 0; i < 36; i++) { const gx = (i * 97) % W, gyy = gy + 6 + ((i * 53) % (H - gy - 8)); Sprites.px(ctx, 'rgba(120,90,40,0.32)', gx, gyy, 1, 1); }
    Sprites.px(ctx, '#f2c9b0', 62, gy + 13, 3, 2); Sprites.px(ctx, '#e8a9c0', 214, gy + 18, 3, 2);
  },
  // de cutscene is opgedeeld in stukjes: animatie speelt, bevriest aan het eind,
  // toont de tekst + "Verder"-knop; pas na een klik gaat het volgende stukje spelen.
  renderStory() {
    const segs = this._storySegs; if (!segs || !segs.length) { this.finishStory(); return; }
    const i = this._storySeg || 0; if (i >= segs.length) { this.finishStory(); return; }
    const seg = segs[i];
    if (!this._storyFrozen && (this._storyElapsed || 0) >= seg.dur) { this._storyFrozen = true; this._storyElapsed = seg.dur; this._showStoryNext(true); }
    const t = Math.min(this._storyElapsed || 0, seg.dur);
    if (window.Sfx && seg.theme) Sfx.music(seg.theme === 'jungle' ? 'jungle' : 'beach');   // muziek volgt de scène
    this._storyBg(this._storyClock || 0, seg.theme);   // achtergrond (golven) loopt door, ook tijdens bevriezen
    seg.draw(t);
    const cap = document.getElementById('journey-cap'); if (cap) cap.textContent = (window.I18N && I18N.cut) ? I18N.cut(seg.cap) : seg.cap;
  },
  // bouwt de stukjes (met tekst, duur en teken-functie) voor een verhaal-script
  _buildStorySegs(script) {
    const W = CONFIG.VIEW_W, gy = CONFIG.GROUND_Y;
    const ch = this._storyChar || CHARACTERS.ryan, pose0 = { build: ch.build, hair: ch.hair };
    const clk = () => this._storyClock || 0;
    if (script === 'intro') {
      const wreck = (c, x, y, w2) => { Sprites.px(c, '#5a3a22', x, y, w2, 4); Sprites.px(c, '#7a5230', x, y, w2, 1); Sprites.px(c, '#3f2817', x, y + 3, w2, 1); };
      const jungleEdge = (c) => {                          // donker oerwoud aan de rechterkant
        c.fillStyle = '#123a1c'; for (let x = W - 96; x < W + 12; x += 20) { c.beginPath(); c.arc(x, gy - 42, 26, 0, 6.2832); c.fill(); }
        c.fillStyle = '#0d2a14'; for (let x = W - 92; x < W + 12; x += 24) { c.beginPath(); c.arc(x, gy - 18, 22, 0, 6.2832); c.fill(); }
        Sprites.px(c, '#3a2414', W - 30, gy - 30, 6, 30); Sprites.px(c, '#3a2414', W - 62, gy - 26, 6, 26);
      };
      const waves = (c, x, y) => { c.strokeStyle = '#ffffff'; c.globalAlpha = 0.5; c.lineWidth = 1.4; for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc(x, y, 3 + k * 4 + ((clk() / 120) % 4), -0.9, 0.9); c.stroke(); } c.globalAlpha = 1; };
      const shout = (c, x, y) => { c.strokeStyle = '#ffef9a'; c.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const a = -0.6 + k * 0.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7 - 6); c.stroke(); } };
      const storm = (c, amt) => { c.globalAlpha = 0.3 * amt; c.fillStyle = '#20303f'; c.fillRect(0, 0, W, CONFIG.VIEW_H); c.globalAlpha = 0.9 * amt; c.fillStyle = '#5a6672'; for (let x = 20; x < W; x += 62) { c.beginPath(); c.arc(x + Math.sin(clk() / 900 + x) * 4, 24, 14, 0, 6.2832); c.arc(x + 16, 28, 12, 0, 6.2832); c.fill(); } c.globalAlpha = 1; };
      const P = (x) => Math.round(W * x);
      return [
        // ===== Scène 1 – Aangespoeld =====
        { theme: 'beach', dur: 2400, cap: 'Na een zware storm word je wakker op een verlaten strand…', draw: (t) => {
          const c = this.ctx; storm(c, 1); wreck(c, W * 0.62, gy - 3, 22); wreck(c, W * 0.2, gy + 2, 16);
          const wake = Math.min(1, t / 2400);
          Sprites.drawCharacter(c, P(0.42), Math.round(gy - 2), 1, ch.palette, Object.assign({ ducking: wake < 0.6, weapon: null }, pose0));
          if (wake > 0.5) { c.fillStyle = '#fff'; c.font = 'bold 12px "Courier New",monospace'; c.fillText('?', P(0.42) - 2, gy - 34); }
        } },
        { theme: 'beach', dur: 2200, cap: 'Je schip is verdwenen — overal liggen wrakstukken.', draw: (t) => {
          const c = this.ctx; storm(c, 0.45);
          Sprites.drawCharacter(c, P(0.5), Math.round(gy - 2), -1, ch.palette, Object.assign({ weapon: null }, pose0));
          const p = Math.min(1, t / 2200);
          wreck(c, 30 + p * 4, gy + 2, 20); wreck(c, 80, gy - 2, 14); wreck(c, 250 - p * 6, gy + 3, 24); wreck(c, 300, gy - 1, 12);
          Sprites.px(c, '#8a2a2a', 120, gy - 1, 10, 6); Sprites.px(c, '#b33', 120, gy - 1, 10, 2);   // stuk rood zeil
        } },
        { theme: 'beach', dur: 2400, cap: 'In de verte zie je een dicht oerwoud… en je hoort vreemde geluiden.', draw: () => {
          const c = this.ctx; jungleEdge(c);
          Sprites.drawCharacter(c, P(0.34), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          wreck(c, W * 0.14, gy + 2, 18); waves(c, W - 70, gy - 46);
        } },
        // ===== Scène 2 – De ontmoeting =====
        { theme: 'jungle', dur: 2400, cap: 'Je loopt het oerwoud in… en wordt plots omsingeld door mensapen.', draw: (t) => {
          const c = this.ctx;
          Sprites.drawCharacter(c, P(0.5), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          const p = Math.min(1, t / 2400), off = p * (W * 0.5 - 40 + 20);
          const lx = -20 + off, rx = (W + 20) - off;
          this._storyApe(c, lx, gy - 2, 1, clk() / 70); this._storyApe(c, lx - 22, gy - 2, 1, clk() / 70 + 2);
          this._storyApe(c, rx, gy - 2, -1, clk() / 70 + 1); this._storyApe(c, rx + 22, gy - 2, -1, clk() / 70 + 3);
        } },
        { theme: 'jungle', dur: 2200, cap: 'Ze staren je woedend aan en laten dreigende kreten horen.', draw: () => {
          const c = this.ctx;
          Sprites.drawCharacter(c, P(0.5), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          this._storyApe(c, P(0.5) - 46, gy - 2, 1, 0); this._storyApe(c, P(0.5) - 68, gy - 2, 1, 0);
          this._storyApe(c, P(0.5) + 46, gy - 2, -1, 0); this._storyApe(c, P(0.5) + 68, gy - 2, -1, 0);
          shout(c, P(0.5) - 54, gy - 26); shout(c, P(0.5) + 54, gy - 26);
        } },
        { theme: 'jungle', dur: 2000, cap: 'Je merkt meteen dat je hier niet welkom bent…', draw: () => {
          const c = this.ctx, jit = Math.round(Math.sin(clk() / 60) * 1.5);
          Sprites.drawCharacter(c, P(0.5) + jit, Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.fillStyle = '#8fd0ff'; c.fillRect(P(0.5) + 8 + jit, gy - 30, 2, 3);   // zweetdruppel
          this._storyApe(c, P(0.5) - 40, gy - 2, 1, 0); this._storyApe(c, P(0.5) - 62, gy - 2, 1, 0);
          this._storyApe(c, P(0.5) + 40, gy - 2, -1, 0); this._storyApe(c, P(0.5) + 62, gy - 2, -1, 0);
        } },
        // ===== Scène 3 – De achtervolging =====
        { theme: 'jungle', dur: 2000, cap: 'De leider — de GORILLA KING — brult luid en wijst naar jou!', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 110)) * 3;
          Sprites.drawCharacter(c, P(0.20), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          this._storyFighter(c, 'kong', W * 0.66, gy - 2 - bob, -1, 0, 1.6);
          shout(c, W * 0.66 - 22, gy - 46); shout(c, W * 0.66 + 16, gy - 46);
          c.fillStyle = '#ff5a5a'; c.font = 'bold 14px "Courier New",monospace'; c.fillText('!', P(0.46), gy - 30);
        } },
        { theme: 'jungle', dur: 2200, cap: 'De GORILLA KING en de hele groep zetten de achtervolging in!', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2200), px2 = (W * 0.72) - p * (W * 0.52);
          Sprites.drawCharacter(c, Math.round(px2), Math.round(gy - 2), -1, ch.palette, Object.assign({ walkPhase: clk() / 40, weapon: null }, pose0));
          this._storyFighter(c, 'kong', px2 + 46, gy - 2, -1, clk() / 50, 1.5);
          this._storyApe(c, px2 + 74, gy - 2, -1, clk() / 45); this._storyApe(c, px2 + 94, gy - 2, -1, clk() / 45 + 2); this._storyApe(c, px2 + 112, gy - 2, -1, clk() / 45 + 1);
          for (let k = 0; k < 3; k++) Sprites.px(c, '#caa860', Math.round(px2 + 56 + k * 10), gy - 1 - (k % 2) * 2, 3, 3);
        } },
        { theme: 'jungle', dur: 1600, cap: 'Er is maar één optie: VECHT!', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 90)) * 2;
          Sprites.drawCharacter(c, P(0.30), Math.round(gy - 2), 1, ch.palette, Object.assign({ attacking: true, weapon: null }, pose0));
          this._storyFighter(c, 'kong', W * 0.66, gy - 2 - bob, -1, 0, 1.6);
          this._storyApe(c, W * 0.66 + 30, gy - 2, -1, clk() / 50); this._storyApe(c, W * 0.66 + 50, gy - 2, -1, clk() / 50 + 2);
          c.fillStyle = '#ffef9a'; c.font = 'bold 16px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('VS', P(0.48), gy - 48); c.textAlign = 'left';
        } },
      ];
    }
    // ===== OUTRO na de Gorilla King -> naar Wereld 2 (De Verloren Tempel) =====
    if (script === 'kongwin') {
      const P = (x) => Math.round(W * x);
      const shout = (c, x, y) => { c.strokeStyle = '#ffef9a'; c.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const a = -0.6 + k * 0.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7 - 6); c.stroke(); } };
      const indi = (c, x, fy, dir, ph, weapon, scale) => this._storyFighter(c, 'indiaan', x, fy, dir, ph, scale || 1, { weapon: weapon || null });
      return [
        // ---- Cutscene: De Val van de Gorilla King ----
        { theme: 'jungle', dur: 2200, cap: 'Met de laatste slag versla je de machtige GORILLA KING… de jungle wordt eindelijk stil.', draw: () => {
          const c = this.ctx;
          this._storyFighter(c, 'kong', W * 0.62, gy - 2, 1, 0, 1.4, { squash: true });   // verslagen (platgeslagen)
          for (let k = 0; k < 3; k++) { const a = (clk() / 90 + k) % 3; Sprites.px(c, '#fff', Math.round(W * 0.62 - 6 - a * 4), gy - 20 - k * 3, 2, 2); }   // duizel-sterretjes
          Sprites.drawCharacter(c, P(0.34), Math.round(gy - 2), 1, ch.palette, Object.assign({ attacking: true, weapon: null }, pose0));
        } },
        { theme: 'jungle', dur: 2200, cap: 'Tussen de ruïnes ontdek je een verborgen pad uit het dichte oerwoud.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2200), x = P(0.3) + p * (W * 0.4);
          Sprites.px(c, '#0c1a0e', W - 60, gy - 40, 26, 40); Sprites.px(c, '#3a2414', W - 64, gy - 42, 4, 42); Sprites.px(c, '#3a2414', W - 32, gy - 42, 4, 42);   // donker pad-opening
          Sprites.drawCharacter(c, Math.round(x), Math.round(gy - 2), 1, ch.palette, Object.assign({ walkPhase: clk() / 60, weapon: null }, pose0));
        } },
        { theme: 'temple', dur: 2400, cap: 'Voor je liggen eeuwenoude tempels… maar een vijandige stam INDIANEN wacht je al op.', draw: () => {
          const c = this.ctx;
          Sprites.drawCharacter(c, P(0.24), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          indi(c, W * 0.66, gy - 2, -1, 0, 'spear', 1); indi(c, W * 0.78, gy - 2, -1, 0, 'crossbow', 1);
        } },
        // ---- Scène 1: De Oude Tempels ----
        { theme: 'temple', dur: 2200, cap: 'Voorzichtig zet je een stap tussen de oude stenen tempels.', draw: () => {
          const c = this.ctx, step = Math.round(Math.sin(clk() / 200) * 1.2);
          Sprites.drawCharacter(c, P(0.4) + step, Math.round(gy - 2), 1, ch.palette, Object.assign({ walkPhase: clk() / 90, weapon: null }, pose0));
        } },
        { theme: 'temple', dur: 2400, cap: 'Plotseling verschijnen krijgers uit de schaduwen — met speren en bogen.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400), off = p * (W * 0.5 - 44);
          Sprites.drawCharacter(c, P(0.5), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          indi(c, -18 + off, gy - 2, 1, clk() / 70, 'spear', 1); indi(c, -40 + off, gy - 2, 1, clk() / 70 + 2, 'crossbow', 1);
          indi(c, (W + 18) - off, gy - 2, -1, clk() / 70 + 1, 'spear', 1); indi(c, (W + 40) - off, gy - 2, -1, clk() / 70 + 3, 'crossbow', 1);
        } },
        { theme: 'temple', dur: 2000, cap: 'Ze zien je als een indringer en maken zich klaar voor de aanval.', draw: () => {
          const c = this.ctx;
          Sprites.drawCharacter(c, P(0.5), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          indi(c, P(0.5) - 46, gy - 2, 1, 0, 'spear', 1); indi(c, P(0.5) - 68, gy - 2, 1, 0, 'crossbow', 1);
          indi(c, P(0.5) + 46, gy - 2, -1, 0, 'spear', 1); indi(c, P(0.5) + 68, gy - 2, -1, 0, 'crossbow', 1);
          shout(c, P(0.5) - 54, gy - 28); shout(c, P(0.5) + 54, gy - 28);
        } },
        // ---- Scène 2: De Stamleider ----
        { theme: 'temple', dur: 2000, cap: 'De STAMLEIDER stapt naar voren en geeft een luid strijdsein!', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 110)) * 2.5;
          Sprites.drawCharacter(c, P(0.22), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          indi(c, W * 0.64, gy - 2 - bob, -1, 0, 'spear', 1.4);   // grote stamleider
          shout(c, W * 0.64 - 18, gy - 40); shout(c, W * 0.64 + 14, gy - 40);
          c.fillStyle = '#ff5a5a'; c.font = 'bold 14px "Courier New",monospace'; c.fillText('!', P(0.46), gy - 30);
        } },
        { theme: 'temple', dur: 2000, cap: 'De krijgers omsingelen je en blokkeren alle uitgangen.', draw: () => {
          const c = this.ctx;
          Sprites.drawCharacter(c, P(0.5), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          indi(c, P(0.5) - 44, gy - 2, 1, 0, 'crossbow', 1); indi(c, P(0.5) - 66, gy - 2, 1, 0, 'spear', 1);
          indi(c, P(0.5) + 44, gy - 2, -1, 0, 'spear', 1.4); indi(c, P(0.5) + 70, gy - 2, -1, 0, 'crossbow', 1);
        } },
        { theme: 'temple', dur: 1800, cap: 'Er is nog maar één optie: vecht je een weg door de tempels!', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 90)) * 2;
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ attacking: true, weapon: null }, pose0));
          indi(c, W * 0.64, gy - 2 - bob, -1, 0, 'spear', 1.4);
          indi(c, W * 0.64 + 26, gy - 2, -1, clk() / 60, 'crossbow', 1);
          c.fillStyle = '#ffef9a'; c.font = 'bold 16px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('VS', P(0.48), gy - 46); c.textAlign = 'left';
        } },
      ];
    }
    // ===== BONZO (Wereld 1, level 5) — nog op het strand aan de rand van de jungle =====
    if (script === 'bonzo') {
      const P = (x) => Math.round(W * x);
      const jungleEdge = (c) => {                          // donker oerwoud aan de rechterkant
        c.fillStyle = '#123a1c'; for (let x = W - 96; x < W + 12; x += 20) { c.beginPath(); c.arc(x, gy - 42, 26, 0, 6.2832); c.fill(); }
        c.fillStyle = '#0d2a14'; for (let x = W - 92; x < W + 12; x += 24) { c.beginPath(); c.arc(x, gy - 18, 22, 0, 6.2832); c.fill(); }
        Sprites.px(c, '#3a2414', W - 30, gy - 30, 6, 30); Sprites.px(c, '#3a2414', W - 62, gy - 26, 6, 26);
      };
      const shout = (c, x, y) => { c.strokeStyle = '#ffef9a'; c.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const a = -0.6 + k * 0.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7 - 6); c.stroke(); } };
      const eyes = (c, x, y) => { const gl = 0.6 + 0.4 * Math.abs(Math.sin(clk() / 200)); c.fillStyle = 'rgba(255,220,90,' + gl.toFixed(2) + ')'; c.fillRect(x, y, 3, 2); c.fillRect(x + 7, y, 3, 2); };
      const speed = (c, x, y, dir) => { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.4; for (let k = 0; k < 4; k++) { const yy = y - 2 - k * 4, len = 10 + (k % 2) * 6; c.beginPath(); c.moveTo(x, yy); c.lineTo(x + dir * len, yy); c.stroke(); } };
      const bonzo = (c, x, fy, dir, ph, opts) => this._storyFighter(c, 'bonzo', x, fy, dir, ph, 0.95, opts || {});
      const rustle = (c, x, y) => { c.strokeStyle = '#1c4a24'; c.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const a = -0.7 + k * 0.7 + Math.sin(clk() / 90) * 0.3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 8, y - 8 - Math.sin(a) * 4); c.stroke(); } };
      return [
        // ===== Scène 1 – Een vreemde stilte =====
        { theme: 'beach', dur: 2200, cap: 'Je verslaat de laatste vijanden… en plots wordt het doodstil.', draw: () => {
          const c = this.ctx; jungleEdge(c);
          Sprites.drawCharacter(c, P(0.36), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
        } },
        { theme: 'beach', dur: 2300, cap: 'Tussen de bomen hoor je snelle voetstappen — maar je ziet niemand.', draw: () => {
          const c = this.ctx; jungleEdge(c);
          Sprites.drawCharacter(c, P(0.36), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.fillStyle = '#fff'; c.font = 'bold 12px "Courier New",monospace'; c.fillText('?', P(0.36) + 6, gy - 32);
          rustle(c, W - 48, gy - 4); rustle(c, W - 78, gy - 2);
        } },
        { theme: 'beach', dur: 2200, cap: 'Iets houdt je vanuit de schaduwen nauwlettend in de gaten…', draw: () => {
          const c = this.ctx, jit = Math.round(Math.sin(clk() / 70) * 1.2); jungleEdge(c);
          Sprites.drawCharacter(c, P(0.36) + jit, Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.fillStyle = '#8fd0ff'; c.fillRect(P(0.36) + 8 + jit, gy - 30, 2, 3);   // zweetdruppel
          eyes(c, W - 58, gy - 34); eyes(c, W - 40, gy - 20);
        } },
        // ===== Scène 2 – De verschijning van Bonzo =====
        { theme: 'beach', dur: 2200, cap: 'Uit de struiken springt een kleine, gespierde krijger: BONZO!', draw: (t) => {
          const c = this.ctx; jungleEdge(c);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          const p = Math.min(1, t / 2200), arc = Math.sin(p * Math.PI) * 40;
          bonzo(c, W * 0.86 - p * (W * 0.24), gy - 2 - arc, -1, clk() / 40, { airborne: true });
        } },
        { theme: 'beach', dur: 2100, cap: 'Hij grijnst, slaat op zijn borst en daagt je uit.', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 90)) * 2; jungleEdge(c);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          bonzo(c, W * 0.62, gy - 2 - bob, -1, 0, { attacking: true });
          shout(c, W * 0.62 - 14, gy - 30); shout(c, W * 0.62 + 12, gy - 30);
        } },
        { theme: 'beach', dur: 2100, cap: 'Laat je niet misleiden door zijn formaat — hij is razendsnel en agressief.', draw: () => {
          const c = this.ctx, jit = Math.round(Math.sin(clk() / 55) * 1.5); jungleEdge(c);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          bonzo(c, W * 0.62 + jit, gy - 2, -1, clk() / 40, {});
          c.fillStyle = '#ff5a5a'; c.font = 'bold 13px "Courier New",monospace'; c.fillText('!', W * 0.62 - 2, gy - 30);
        } },
        // ===== Scène 3 – Het gevecht begint =====
        { theme: 'beach', dur: 2000, cap: 'Bonzo sprint met hoge snelheid op je af!', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2000), bx = (W * 0.78) - p * (W * 0.30); jungleEdge(c);
          Sprites.drawCharacter(c, P(0.26), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          speed(c, bx + 16, gy - 4, 1);
          bonzo(c, bx, gy - 2, -1, clk() / 26, {});
        } },
        { theme: 'beach', dur: 2000, cap: 'Zijn aanvallen zijn snel, onvoorspelbaar en dodelijk.', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 60)) * 2; jungleEdge(c);
          Sprites.drawCharacter(c, P(0.32), Math.round(gy - 2), 1, ch.palette, Object.assign({ ducking: true, weapon: null }, pose0));
          bonzo(c, W * 0.56, gy - 2 - bob, -1, clk() / 30, { attacking: true });
          for (let k = 0; k < 3; k++) Sprites.px(c, '#ffe79a', Math.round(W * 0.44 + k * 6), gy - 20 - k * 2, 3, 3);
        } },
        { theme: 'beach', dur: 1700, cap: 'Versla BONZO voordat hij jóu uitschakelt — VECHT!', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 80)) * 2; jungleEdge(c);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ attacking: true, weapon: null }, pose0));
          bonzo(c, W * 0.62, gy - 2 - bob, -1, 0, {});
          c.fillStyle = '#ffef9a'; c.font = 'bold 16px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('VS', P(0.48), gy - 46); c.textAlign = 'left';
        } },
      ];
    }
    // ===== KOBA (Wereld 1, level 10) — diep in het oerwoud, een reusachtige mensaap =====
    if (script === 'koba') {
      const P = (x) => Math.round(W * x);
      const shout = (c, x, y) => { c.strokeStyle = '#ffef9a'; c.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const a = -0.6 + k * 0.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8 - 7); c.stroke(); } };
      const foot = (c, x, y) => { c.fillStyle = '#20120a'; c.fillRect(x, y, 12, 6); c.fillRect(x + 1, y - 3, 3, 3); c.fillRect(x + 5, y - 3, 3, 3); c.fillRect(x + 9, y - 3, 3, 3); };   // enorme voetafdruk
      const brokenTree = (c, x, y) => { c.fillStyle = '#3a2414'; c.fillRect(x, y - 14, 6, 14); c.save(); c.translate(x + 3, y - 14); c.rotate(1.1); c.fillRect(-3, -22, 6, 22); c.restore(); c.fillStyle = '#5b3a22'; for (let k = 0; k < 3; k++) Sprites.px(c, '#5b3a22', x + 8 + k * 5, y - 2, 3, 2); };   // omgevallen boom + splinters
      const koba = (c, x, fy, dir, ph, opts) => this._storyFighter(c, 'koba', x, fy, dir, ph, 1.42, opts || {});
      const trem = () => Math.round(Math.sin(clk() / 30) * 1.4);   // grondbeving-tril
      return [
        // ===== Scène 1 – Een dreigende aanwezigheid =====
        { theme: 'jungle', dur: 2300, cap: 'Terwijl je dieper de jungle in loopt, begint de grond zacht te trillen.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2300), jit = Math.round(Math.sin(clk() / 45) * 1.1);
          Sprites.drawCharacter(c, P(0.24) + Math.round(p * 30), Math.round(gy - 2) + jit, 1, ch.palette, Object.assign({ walkPhase: clk() / 70, weapon: null }, pose0));
        } },
        { theme: 'jungle', dur: 2300, cap: 'Gebroken bomen en enorme voetafdrukken liggen verspreid om je heen.', draw: () => {
          const c = this.ctx;
          brokenTree(c, W * 0.14, gy); brokenTree(c, W * 0.8, gy);
          foot(c, W * 0.4, gy - 2); foot(c, W * 0.56, gy + 3); foot(c, W * 0.7, gy - 1);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
        } },
        { theme: 'jungle', dur: 2200, cap: 'Je voelt dat iets gigantisch dichtbij is…', draw: () => {
          const c = this.ctx, jit = trem();
          Sprites.drawCharacter(c, P(0.3) + jit, Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.fillStyle = '#8fd0ff'; c.fillRect(P(0.3) + 8 + jit, gy - 30, 2, 3);   // zweetdruppel
          c.globalAlpha = 0.4; c.fillStyle = '#0a1c0e'; c.beginPath(); c.ellipse(W * 0.72, gy - 30, 34, 40, 0, 0, 6.2832); c.fill(); c.globalAlpha = 1;   // dreigende schaduw
        } },
        // ===== Scène 2 – De komst van Koba =====
        { theme: 'jungle', dur: 2400, cap: 'Uit de dichte begroeiing verschijnt KOBA, een enorme gespierde mensaap.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400);
          Sprites.drawCharacter(c, P(0.24), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.fillStyle = '#153e1f'; for (let x = W - 70; x < W + 12; x += 18) { c.beginPath(); c.arc(x, gy - 40, 24 * (1 - p * 0.5), 0, 6.2832); c.fill(); }   // wijkende struiken
          koba(c, W * 0.9 - p * (W * 0.22), gy - 2, -1, clk() / 55, {});
        } },
        { theme: 'jungle', dur: 2300, cap: 'Met een oorverdovende brul slaat hij op zijn borst en staart je woedend aan.', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 90)) * 3, jit = trem();
          Sprites.drawCharacter(c, P(0.24) - Math.abs(jit), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          koba(c, W * 0.66, gy - 2 - bob, -1, 0, { attacking: true });
          shout(c, W * 0.66 - 20, gy - 48); shout(c, W * 0.66 + 16, gy - 48);
        } },
        { theme: 'jungle', dur: 2200, cap: 'Zijn kracht is ongekend en hij lijkt vastbesloten je tegen te houden.', draw: () => {
          const c = this.ctx, jit = trem();
          Sprites.drawCharacter(c, P(0.26), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          koba(c, W * 0.66 + jit, gy - 2, -1, clk() / 55, {});
          c.fillStyle = '#ff5a5a'; c.font = 'bold 14px "Courier New",monospace'; c.fillText('!', W * 0.66 - 2, gy - 44);
        } },
        // ===== Scène 3 – De strijd =====
        { theme: 'jungle', dur: 2200, cap: 'Koba zet een stap naar voren en de grond beeft onder zijn gewicht.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2200), kx = (W * 0.72) - p * (W * 0.08), jit = Math.round(Math.sin(clk() / 22) * 2);
          Sprites.drawCharacter(c, P(0.26), Math.round(gy - 2) + Math.abs(jit), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          koba(c, kx, gy - 2, -1, clk() / 45, {});
          for (let k = 0; k < 4; k++) Sprites.px(c, '#3d6b2e', Math.round(kx - 20 - k * 8), gy - 1 - (k % 2) * 2, 4, 2);   // opspattende aarde
        } },
        { theme: 'jungle', dur: 2000, cap: 'Ontsnappen is geen optie — het gevecht is begonnen.', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 80)) * 2;
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ ducking: true, weapon: null }, pose0));
          koba(c, W * 0.66, gy - 2 - bob, -1, clk() / 50, { attacking: true });
        } },
        { theme: 'jungle', dur: 1700, cap: 'Versla KOBA om je weg dieper de jungle in vrij te maken — VECHT!', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 80)) * 2.5;
          Sprites.drawCharacter(c, P(0.28), Math.round(gy - 2), 1, ch.palette, Object.assign({ attacking: true, weapon: null }, pose0));
          koba(c, W * 0.66, gy - 2 - bob, -1, 0, {});
          c.fillStyle = '#ffef9a'; c.font = 'bold 16px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('VS', P(0.47), gy - 52); c.textAlign = 'left';
        } },
      ];
    }
    // ===== GORILLA KING (Wereld 1, level 15) — de troonzaal diep in de jungle =====
    if (script === 'kong') {
      const P = (x) => Math.round(W * x);
      const shout = (c, x, y) => { c.strokeStyle = '#ffef9a'; c.lineWidth = 1.3; for (let k = 0; k < 3; k++) { const a = -0.6 + k * 0.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9 - 8); c.stroke(); } };
      const throne = (c, cx) => { const bx = cx - 20; c.fillStyle = '#5a4a38'; c.fillRect(bx, gy - 34, 40, 34); c.fillStyle = '#6a5844'; c.fillRect(bx, gy - 34, 40, 4); c.fillStyle = '#4a3c2c'; c.fillRect(bx - 4, gy - 54, 8, 54); c.fillRect(bx + 36, gy - 54, 8, 54); for (let y = gy - 30; y < gy; y += 8) Sprites.px(c, '#3a2e20', bx + 4, y, 32, 1); };   // stenen troon
      const bone = (c, x, y) => { c.fillStyle = '#e6e0d0'; c.fillRect(x, y, 8, 2); c.fillRect(x, y - 2, 2, 2); c.fillRect(x + 6, y - 2, 2, 2); c.fillRect(x, y + 2, 2, 2); c.fillRect(x + 6, y + 2, 2, 2); };
      const skull = (c, x, y) => { c.fillStyle = '#e6e0d0'; c.fillRect(x, y, 6, 5); c.fillStyle = '#2a2018'; c.fillRect(x + 1, y + 1, 2, 2); c.fillRect(x + 4, y + 1, 1, 2); };
      const brokenWpn = (c, x, y) => { c.strokeStyle = '#8a8f96'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8, y - 7); c.stroke(); c.fillStyle = '#5b3a22'; c.fillRect(x - 2, y - 1, 4, 3); };   // kapot zwaard
      const litter = (c) => { skull(c, W * 0.16, gy - 5); bone(c, W * 0.26, gy - 3); brokenWpn(c, W * 0.4, gy - 2); bone(c, W * 0.5, gy - 4); skull(c, W * 0.58, gy - 3); brokenWpn(c, W * 0.12, gy - 3); };
      const king = (c, x, fy, dir, ph, opts) => this._storyFighter(c, 'kong', x, fy, dir, ph, 1.5, opts || {});
      const shadow = (c) => { c.globalAlpha = 0.5; c.fillStyle = '#0a1c0e'; c.beginPath(); c.ellipse(W * 0.78, gy - 22, 26, 30, 0, 0, 6.2832); c.fill(); c.globalAlpha = 1; };
      return [
        // ===== Scène 1 – De Troon =====
        { theme: 'jungle', dur: 2400, cap: 'Na een lange tocht bereik je een eeuwenoude troon diep in de jungle.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400); throne(c, W * 0.78); shadow(c); litter(c);
          Sprites.drawCharacter(c, P(0.16) + Math.round(p * 28), Math.round(gy - 2), 1, ch.palette, Object.assign({ walkPhase: clk() / 70, weapon: null }, pose0));
        } },
        { theme: 'jungle', dur: 2300, cap: 'Overal liggen botten en kapotgeslagen wapens van eerdere uitdagers.', draw: () => {
          const c = this.ctx; throne(c, W * 0.78);
          skull(c, W * 0.2, gy - 5); bone(c, W * 0.3, gy - 3); brokenWpn(c, W * 0.42, gy - 2); bone(c, W * 0.52, gy - 5); skull(c, W * 0.62, gy - 3); brokenWpn(c, W * 0.34, gy - 3); bone(c, W * 0.14, gy - 4);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
        } },
        { theme: 'jungle', dur: 2000, cap: 'Een ijzige stilte hangt in de lucht…', draw: () => {
          const c = this.ctx, jit = Math.round(Math.sin(clk() / 80) * 1.1); throne(c, W * 0.78); shadow(c); litter(c);
          Sprites.drawCharacter(c, P(0.3) + jit, Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.fillStyle = '#8fd0ff'; c.fillRect(P(0.3) + 8 + jit, gy - 30, 2, 3);   // zweetdruppel
        } },
        // ===== Scène 2 – De Gorilla King =====
        { theme: 'jungle', dur: 2400, cap: 'Langzaam staat de GORILLA KING op van zijn stenen troon.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400), rise = (1 - p) * 14; throne(c, W * 0.78); litter(c);
          Sprites.drawCharacter(c, P(0.22), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          king(c, W * 0.76, gy - 2 + rise, -1, 0, {});
        } },
        { theme: 'jungle', dur: 2300, cap: 'Met een oorverdovende brul slaat hij op zijn borst en kijkt hij je recht aan.', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 90)) * 3, jit = Math.round(Math.sin(clk() / 26) * 1.4); throne(c, W * 0.78); litter(c);
          Sprites.drawCharacter(c, P(0.22) - Math.abs(jit), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          king(c, W * 0.72, gy - 2 - bob, -1, 0, { attacking: true });
          shout(c, W * 0.72 - 24, gy - 54); shout(c, W * 0.72 + 18, gy - 54);
        } },
        { theme: 'jungle', dur: 2200, cap: 'Zijn enorme kracht maakt meteen duidelijk: dit is de heerser van de jungle.', draw: () => {
          const c = this.ctx; throne(c, W * 0.82); litter(c);
          Sprites.drawCharacter(c, P(0.24), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          king(c, W * 0.7, gy - 2, -1, clk() / 55, {});
          c.fillStyle = '#ff5a5a'; c.font = 'bold 15px "Courier New",monospace'; c.fillText('!', W * 0.7 - 2, gy - 50);
        } },
        // ===== Scène 3 – Het Eindgevecht =====
        { theme: 'jungle', dur: 2200, cap: 'De GORILLA KING stapt van zijn troon en blokkeert de enige uitweg.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2200), kx = (W * 0.74) - p * (W * 0.06); throne(c, W * 0.86); litter(c);
          Sprites.drawCharacter(c, P(0.26), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          king(c, kx, gy - 2, -1, clk() / 45, {});
        } },
        { theme: 'jungle', dur: 2000, cap: 'Hij heft zijn gigantische vuisten en daagt je uit voor een laatste gevecht.', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 80)) * 2; litter(c);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ ducking: true, weapon: null }, pose0));
          king(c, W * 0.68, gy - 2 - bob, -1, 0, { attacking: true });
        } },
        { theme: 'jungle', dur: 1800, cap: 'Versla de GORILLA KING en ontsnap uit de jungle — VECHT!', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 80)) * 2.5; litter(c);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ attacking: true, weapon: null }, pose0));
          king(c, W * 0.68, gy - 2 - bob, -1, 0, {});
          c.fillStyle = '#ffef9a'; c.font = 'bold 16px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('VS', P(0.48), gy - 56); c.textAlign = 'left';
        } },
      ];
    }
    // ===== TEMPLE BEWAKER / GUARDIAN (Wereld 2, level 5) — de ingang van de grote tempel =====
    if (script === 'guardian') {
      const P = (x) => Math.round(W * x);
      const gx = W * 0.72;                                   // hart van de tempelpoort
      // hoge stenen pilaar met kapiteel + gegraveerde symbolen
      const pillar = (c, x) => { c.fillStyle = '#7a5a38'; c.fillRect(x, gy - 92, 16, 92); c.fillStyle = '#8a6a44'; c.fillRect(x - 3, gy - 96, 22, 6); c.fillRect(x - 2, gy - 6, 20, 6); c.fillStyle = '#5a4028'; for (let y = gy - 84; y < gy - 8; y += 12) Sprites.px(c, '#5a4028', x + 2, y, 12, 2); c.fillStyle = '#c98a3a'; Sprites.px(c, '#c98a3a', x + 5, gy - 60, 6, 6); Sprites.px(c, '#c98a3a', x + 5, gy - 42, 6, 6); };   // gouden glyphs
      // de grote poort met twee schuivende deuren (open = 0..1)
      const gate = (c, open) => {
        const gw = 104, gh = 104, bx = gx - gw / 2, by = gy - gh;
        c.fillStyle = '#7a5a38'; c.fillRect(bx, by, gw, gh);
        c.fillStyle = '#8a6a44'; c.fillRect(bx, by, gw, 6);
        c.strokeStyle = '#5a4028'; c.lineWidth = 1; for (let y = by + 12; y < gy; y += 16) { c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + gw, y); c.stroke(); }
        c.fillStyle = '#c98a3a'; c.fillRect(bx + 8, by + 8, gw - 16, 5);           // gouden latei
        c.fillStyle = '#b8912e'; Sprites.px(c, '#b8912e', gx - 3, by + 18, 6, 8); Sprites.px(c, '#b8912e', gx - 10, by + 20, 4, 5); Sprites.px(c, '#b8912e', gx + 6, by + 20, 4, 5);   // mysterieus symbool
        const oh = gh - 22, ow = 46, ox = gx - ow / 2, oy = gy - oh;
        c.fillStyle = '#160f08'; c.fillRect(ox, oy, ow, oh);                        // duistere doorgang
        const slide = Math.round(open * (ow / 2));
        c.fillStyle = '#4a3826'; c.fillRect(ox, oy, ow / 2 - slide, oh); c.fillRect(ox + ow / 2 + slide, oy, ow / 2 - slide, oh);   // schuifdeuren
        c.fillStyle = '#3a2c1c'; c.fillRect(ox + ow / 2 - slide - 2, oy, 2, oh); c.fillRect(ox + ow / 2 + slide, oy, 2, oh);
      };
      const guardian = (c, x, fy, dir, ph, opts) => this._storyFighter(c, 'guardian', x, fy, dir, ph, 1.32, Object.assign({ weapon: 'katana' }, opts || {}));
      const glowEyes = (c, x, y) => { const gl = 0.55 + 0.45 * Math.abs(Math.sin(clk() / 160)); c.fillStyle = 'rgba(120,230,255,' + gl.toFixed(2) + ')'; c.fillRect(x, y, 3, 2); c.fillRect(x + 6, y, 3, 2); };
      return [
        // ===== Scène 1 – De Tempel =====
        { theme: 'temple', dur: 2400, cap: 'Na een lange reis bereik je de ingang van een gigantische eeuwenoude tempel.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400); pillar(c, W * 0.42); pillar(c, W * 0.9); gate(c, 0);
          Sprites.drawCharacter(c, P(0.14) + Math.round(p * 26), Math.round(gy - 2), 1, ch.palette, Object.assign({ walkPhase: clk() / 70, weapon: null }, pose0));
        } },
        { theme: 'temple', dur: 2300, cap: 'Hoge stenen pilaren en mysterieuze symbolen wijzen erop dat niemand hier welkom is.', draw: () => {
          const c = this.ctx; pillar(c, W * 0.42); pillar(c, W * 0.9); gate(c, 0);
          Sprites.drawCharacter(c, P(0.26), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.fillStyle = '#c98a3a'; c.font = 'bold 10px "Courier New",monospace'; c.fillText('☥', W * 0.42 + 3, gy - 30); c.fillText('☸', W * 0.9 + 3, gy - 30);
        } },
        { theme: 'temple', dur: 2200, cap: 'De zware tempeldeuren beginnen langzaam open te schuiven…', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2200); pillar(c, W * 0.42); pillar(c, W * 0.9); gate(c, p * 0.6);
          Sprites.drawCharacter(c, P(0.26), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.fillStyle = '#8fd0ff'; c.fillRect(P(0.26) + 8, gy - 30, 2, 3);   // zweetdruppel
        } },
        // ===== Scène 2 – De Bewaker =====
        { theme: 'temple', dur: 2400, cap: 'Uit de duisternis verschijnt de TEMPLE BEWAKER, gehuld in eeuwenoud pantser.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400); pillar(c, W * 0.42); pillar(c, W * 0.9); gate(c, 1);
          Sprites.drawCharacter(c, P(0.2), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.globalAlpha = 0.4 + 0.6 * p; guardian(c, gx, gy - 2, -1, 0, {}); c.globalAlpha = 1;   // vervaagt uit de duisternis
        } },
        { theme: 'temple', dur: 2300, cap: 'Hij heft zijn wapen en gaat zwijgend voor de ingang staan.', draw: () => {
          const c = this.ctx; pillar(c, W * 0.42); pillar(c, W * 0.9); gate(c, 1);
          Sprites.drawCharacter(c, P(0.2), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          guardian(c, gx - 6, gy - 2, -1, 0, { attacking: true });
        } },
        { theme: 'temple', dur: 2100, cap: 'Niemand mag de tempel betreden zolang hij nog leeft.', draw: () => {
          const c = this.ctx; pillar(c, W * 0.42); pillar(c, W * 0.9); gate(c, 1);
          Sprites.drawCharacter(c, P(0.22), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          guardian(c, gx - 8, gy - 2, -1, 0, {});
          c.fillStyle = '#ff5a5a'; c.font = 'bold 14px "Courier New",monospace'; c.fillText('!', gx - 10, gy - 44);
        } },
        // ===== Scène 3 – De Uitdaging =====
        { theme: 'temple', dur: 2200, cap: 'De TEMPLE BEWAKER zet een stap naar voren en sluit de doorgang af.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2200), kx = (gx - 8) - p * (W * 0.1); pillar(c, W * 0.42); pillar(c, W * 0.9); gate(c, 1);
          Sprites.drawCharacter(c, P(0.24), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          guardian(c, kx, gy - 2, -1, clk() / 55, { attacking: true });
        } },
        { theme: 'temple', dur: 2000, cap: 'Zijn ogen lichten op terwijl hij zich klaarmaakt voor de strijd.', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 90)) * 2; pillar(c, W * 0.42); pillar(c, W * 0.9); gate(c, 1);
          Sprites.drawCharacter(c, P(0.26), Math.round(gy - 2), 1, ch.palette, Object.assign({ ducking: true, weapon: null }, pose0));
          guardian(c, W * 0.6, gy - 2 - bob, -1, 0, { attacking: true });
          glowEyes(c, W * 0.6 - 4, gy - 42);
        } },
        { theme: 'temple', dur: 1800, cap: 'Versla de TEMPLE BEWAKER en baan je een weg naar de geheimen van de tempel — VECHT!', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 80)) * 2.5; pillar(c, W * 0.9); gate(c, 1);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ attacking: true, weapon: null }, pose0));
          guardian(c, W * 0.62, gy - 2 - bob, -1, 0, { attacking: true });
          c.fillStyle = '#ffef9a'; c.font = 'bold 16px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('VS', P(0.47), gy - 50); c.textAlign = 'left';
        } },
      ];
    }
    // ===== DE OUDE MONNIK / MONNIK (Wereld 2, level 10) — diep in de tempel, een donkere zaal =====
    if (script === 'monnik') {
      const P = (x) => Math.round(W * x);
      // donkere binnenzaal die de tempel-buitenkant overdekt (pilaren + fakkels + glyphs)
      const hall = (c) => {
        c.fillStyle = '#221a12'; c.fillRect(0, 0, W, gy);                                   // donkere stenen wand
        c.fillStyle = '#2b2016'; for (let y = 6; y < gy; y += 16) { const off = ((y / 16) % 2) * 16; for (let x = -off; x < W; x += 32) Sprites.px(c, '#2b2016', x + 1, y, 30, 14); }
        // pilaren op de achtergrond
        [46, 180, 314].forEach((pxp) => { Sprites.px(c, '#463526', pxp - 11, 8, 22, gy - 8); Sprites.px(c, '#54402d', pxp - 11, 8, 6, gy - 8); Sprites.px(c, '#2c2015', pxp + 5, 8, 6, gy - 8); Sprites.px(c, '#5a4632', pxp - 14, 4, 28, 6); for (let y = 20; y < gy - 10; y += 7) Sprites.px(c, '#2c2015', pxp - 3, y, 6, 2); });
        // gouden glyphs op de wand
        c.globalAlpha = 0.5; const glyph = (gxp, gyp) => { Sprites.px(c, '#b8912e', gxp, gyp, 2, 8); Sprites.px(c, '#b8912e', gxp - 3, gyp + 2, 8, 2); Sprites.px(c, '#b8912e', gxp - 2, gyp + 6, 6, 2); }; glyph(108, 40); glyph(250, 46); glyph(300, 36); c.globalAlpha = 1;
      };
      const torch = (c, tx, ty) => { Sprites.px(c, '#3a2a18', tx - 1, ty, 3, 12); const fl = 3 + Math.round(Math.sin(clk() / 90 + tx) * 1.6); c.globalAlpha = 0.3; c.fillStyle = '#ff9a2a'; c.beginPath(); c.arc(tx, ty - 4, fl + 6, 0, 6.2832); c.fill(); c.globalAlpha = 1; c.fillStyle = '#ffb23a'; c.beginPath(); c.arc(tx, ty - 6, fl, 0, 6.2832); c.fill(); c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(tx, ty - 6, fl * 0.5, 0, 6.2832); c.fill(); };
      const torches = (c) => { torch(c, 108, 66); torch(c, 250, 68); torch(c, 300, 62); };
      const shout = (c, x, y) => { c.strokeStyle = '#ffef9a'; c.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const a = -0.6 + k * 0.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8 - 7); c.stroke(); } };
      const monk = (c, x, fy, dir, ph, opts) => this._storyFighter(c, 'monnik', x, fy, dir, ph, 1.14, opts || {});
      const mat = (c, cx) => { c.fillStyle = '#7a4a1e'; c.fillRect(cx - 18, gy - 3, 36, 4); c.fillStyle = '#9a6028'; c.fillRect(cx - 18, gy - 3, 36, 1); };   // meditatiematje
      return [
        // ===== Scène 1 – Diep in de Tempel =====
        { theme: 'temple', dur: 2400, cap: 'Je loopt dieper de eeuwenoude tempel in, waar het donker en doodstil is.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400); hall(c); torches(c);
          Sprites.drawCharacter(c, P(0.12) + Math.round(p * 26), Math.round(gy - 2), 1, ch.palette, Object.assign({ walkPhase: clk() / 70, weapon: null }, pose0));
        } },
        { theme: 'temple', dur: 2300, cap: 'Fakkels flikkeren langs de muren en vreemde tekens bedekken de stenen.', draw: () => {
          const c = this.ctx; hall(c); torches(c);
          Sprites.drawCharacter(c, P(0.24), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
        } },
        { theme: 'temple', dur: 2200, cap: 'In het midden van de zaal zit een oude monnik te mediteren.', draw: () => {
          const c = this.ctx; hall(c); torches(c); mat(c, W * 0.66);
          Sprites.drawCharacter(c, P(0.24), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          monk(c, W * 0.66, gy - 2, -1, 0, { ducking: true, weapon: null });   // zittend/mediterend
        } },
        // ===== Scène 2 – De Ontmoeting =====
        { theme: 'temple', dur: 2300, cap: 'Langzaam opent de monnik zijn ogen en kijkt hij je streng aan.', draw: () => {
          const c = this.ctx; hall(c); torches(c); mat(c, W * 0.66);
          Sprites.drawCharacter(c, P(0.26), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          monk(c, W * 0.66, gy - 2, -1, 0, { ducking: true, weapon: null });
          c.fillStyle = '#8fe0ff'; c.fillRect(Math.round(W * 0.66) - 6, gy - 20, 2, 2); c.fillRect(Math.round(W * 0.66) - 1, gy - 20, 2, 2);   // open ogen
        } },
        { theme: 'temple', dur: 2200, cap: 'Zonder een woord te zeggen staat hij op en grijpt zijn wapen.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2200), rise = (1 - p) * 10; hall(c); torches(c);
          Sprites.drawCharacter(c, P(0.26), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          monk(c, W * 0.66, gy - 2 + rise, -1, 0, { weapon: 'spear' });
        } },
        { theme: 'temple', dur: 2000, cap: 'Je bent niet welkom in zijn tempel.', draw: () => {
          const c = this.ctx; hall(c); torches(c);
          Sprites.drawCharacter(c, P(0.28), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          monk(c, W * 0.64, gy - 2, -1, 0, { weapon: 'spear' });
          c.fillStyle = '#ff5a5a'; c.font = 'bold 14px "Courier New",monospace'; c.fillText('!', W * 0.64 - 2, gy - 40);
        } },
        // ===== Scène 3 – De Strijd =====
        { theme: 'temple', dur: 2200, cap: 'De oude monnik neemt een gevechtshouding aan en wijst naar de uitgang.', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 100)) * 2; hall(c); torches(c);
          Sprites.drawCharacter(c, P(0.28), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          monk(c, W * 0.62, gy - 2 - bob, -1, 0, { attacking: true, weapon: 'spear' });
          shout(c, W * 0.62 - 16, gy - 40);
        } },
        { theme: 'temple', dur: 2000, cap: 'Hij zal je niet verder laten gaan zonder een gevecht.', draw: () => {
          const c = this.ctx; hall(c); torches(c);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ ducking: true, weapon: null }, pose0));
          monk(c, W * 0.6, gy - 2, -1, clk() / 55, { attacking: true, weapon: 'spear' });
        } },
        { theme: 'temple', dur: 1800, cap: 'Bereid je voor en versla de oude monnik — VECHT!', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 80)) * 2.5; hall(c); torches(c);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ attacking: true, weapon: null }, pose0));
          monk(c, W * 0.62, gy - 2 - bob, -1, 0, { weapon: 'spear' });
          c.fillStyle = '#ffef9a'; c.font = 'bold 16px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('VS', P(0.47), gy - 48); c.textAlign = 'left';
        } },
      ];
    }
    // ===== DE NINJA (Wereld 2, level 15) — de donkere schatkamer =====
    if (script === 'ninja') {
      const P = (x) => Math.round(W * x);
      // donkere schatkamer: stenen wand + goudstapels, juwelen, kisten en relikwieën
      const vault = (c, dark) => {
        c.fillStyle = dark ? '#120d09' : '#241a12'; c.fillRect(0, 0, W, gy);                       // wand
        if (!dark) for (let y = 4; y < gy; y += 16) { const off = ((y / 16) % 2) * 16; for (let x = -off; x < W; x += 32) Sprites.px(c, '#2c2117', x + 1, y, 30, 14); }
        const A = dark ? 0.35 : 1; c.globalAlpha = A;
        // goudstapels langs de achterwand
        const gold = (gx) => { c.fillStyle = '#e8b431'; for (let r = 0; r < 5; r++) { const rw = 30 - r * 5; Sprites.px(c, '#e8b431', gx - rw / 2, gy - 6 - r * 4, rw, 4); } c.fillStyle = '#fff0a0'; Sprites.px(c, '#fff0a0', gx - 12, gy - 6, 4, 2); };
        gold(60); gold(150); gold(300);
        // schatkist
        c.fillStyle = '#6a4326'; Sprites.px(c, '#6a4326', 96, gy - 20, 30, 20); c.fillStyle = '#8a5a30'; Sprites.px(c, '#8a5a30', 96, gy - 24, 30, 6); c.fillStyle = '#e8b431'; Sprites.px(c, '#e8b431', 108, gy - 22, 6, 8);
        // juwelen (gekleurde edelstenen)
        const gem = (gx, gy2, col) => { c.fillStyle = col; c.fillRect(gx, gy2, 4, 4); c.fillStyle = '#ffffff'; c.fillRect(gx + 1, gy2, 1, 1); };
        gem(48, gy - 4, '#e8425a'); gem(140, gy - 3, '#42a0e8'); gem(210, gy - 5, '#57e08a'); gem(290, gy - 3, '#c060e0'); gem(330, gy - 4, '#e8b431');
        // groot relikwie/afgodsbeeld op de achtergrond
        c.fillStyle = '#b89440'; Sprites.px(c, '#b89440', W * 0.5 - 8, gy - 44, 16, 40); Sprites.px(c, '#d8b048', W * 0.5 - 10, gy - 48, 20, 6); c.fillStyle = '#3a2e18'; Sprites.px(c, '#3a2e18', W * 0.5 - 4, gy - 40, 3, 3); Sprites.px(c, '#3a2e18', W * 0.5 + 2, gy - 40, 3, 3);
        c.globalAlpha = 1;
      };
      const torch = (c, tx, ty, on) => { Sprites.px(c, '#3a2a18', tx - 1, ty, 3, 12); if (!on) return; const fl = 3 + Math.round(Math.sin(clk() / 90 + tx) * 1.6); c.globalAlpha = 0.3; c.fillStyle = '#ff9a2a'; c.beginPath(); c.arc(tx, ty - 4, fl + 6, 0, 6.2832); c.fill(); c.globalAlpha = 1; c.fillStyle = '#ffb23a'; c.beginPath(); c.arc(tx, ty - 6, fl, 0, 6.2832); c.fill(); c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(tx, ty - 6, fl * 0.5, 0, 6.2832); c.fill(); };
      const torches = (c, on) => { torch(c, 108, 66, on); torch(c, 250, 68, on); };
      const star = (c, x, y) => { c.fillStyle = '#e8e8ee'; c.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + clk() / 200; c.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); c.lineTo(x + Math.cos(a + 0.78) * 1.6, y + Math.sin(a + 0.78) * 1.6); } c.closePath(); c.fill(); };   // werpster
      const ninja = (c, x, fy, dir, ph, opts) => this._storyFighter(c, 'ninja', x, fy, dir, ph, 1.1, opts || {});
      const redEyes = (c, x, y) => { c.fillStyle = '#ff2a2a'; c.fillRect(x, y, 2, 2); c.fillRect(x + 6, y, 2, 2); };
      return [
        // ===== Scène 1 – De Schatkamer =====
        { theme: 'temple', dur: 2400, cap: 'Je bereikt een donkere schatkamer vol goud, juwelen en oude relikwieën.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400); vault(c, false); torches(c, true);
          Sprites.drawCharacter(c, P(0.14) + Math.round(p * 24), Math.round(gy - 2), 1, ch.palette, Object.assign({ walkPhase: clk() / 70, weapon: null }, pose0));
        } },
        { theme: 'temple', dur: 2300, cap: 'Alles lijkt verlaten, maar de stilte voelt onheilspellend aan.', draw: () => {
          const c = this.ctx; vault(c, false); torches(c, true);
          Sprites.drawCharacter(c, P(0.28), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.fillStyle = '#8fd0ff'; c.fillRect(P(0.28) + 8, gy - 30, 2, 3);   // zweetdruppel
        } },
        { theme: 'temple', dur: 2200, cap: 'Terwijl je een stap vooruit zet, doven de fakkels plotseling uit…', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2200); vault(c, p > 0.5); torches(c, p <= 0.5);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          if (p > 0.5) { c.globalAlpha = 0.5; c.fillStyle = '#000'; c.fillRect(0, 0, W, gy); c.globalAlpha = 1; }
        } },
        // ===== Scène 2 – De Verschijning =====
        { theme: 'temple', dur: 2400, cap: 'Uit de schaduwen verschijnt geruisloos een mysterieuze NINJA.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400); vault(c, true); torches(c, false);
          Sprites.drawCharacter(c, P(0.24), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          c.globalAlpha = 0.3 + 0.7 * p; ninja(c, W * 0.66, gy - 2, -1, 0, {}); c.globalAlpha = 1;
          redEyes(c, Math.round(W * 0.66) - 5, gy - 24);
        } },
        { theme: 'temple', dur: 2200, cap: 'Met zijn zwaard in de hand blokkeert hij de enige uitgang.', draw: () => {
          const c = this.ctx; vault(c, true); torches(c, false);
          Sprites.drawCharacter(c, P(0.24), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          ninja(c, W * 0.64, gy - 2, -1, 0, { attacking: true, weapon: 'katana' });
        } },
        { theme: 'temple', dur: 2000, cap: 'Hij is de bewaker van de schat en zal niemand laten ontsnappen.', draw: () => {
          const c = this.ctx; vault(c, true); torches(c, false);
          Sprites.drawCharacter(c, P(0.26), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          ninja(c, W * 0.62, gy - 2, -1, 0, { weapon: 'katana' });
          redEyes(c, Math.round(W * 0.62) - 5, gy - 24);
          c.fillStyle = '#ff5a5a'; c.font = 'bold 14px "Courier New",monospace'; c.fillText('!', W * 0.62 - 2, gy - 40);
        } },
        // ===== Scène 3 – Het Eindgevecht =====
        { theme: 'temple', dur: 2200, cap: 'De NINJA pakt zijn ninja sterren en neemt een gevechtshouding aan.', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 100)) * 2; vault(c, true); torches(c, false);
          Sprites.drawCharacter(c, P(0.28), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          ninja(c, W * 0.62, gy - 2 - bob, -1, 0, { attacking: true });
          star(c, W * 0.55, gy - 22); star(c, W * 0.5, gy - 30);
        } },
        { theme: 'temple', dur: 2000, cap: 'Zijn snelheid en precisie maken hem een levensgevaarlijke tegenstander.', draw: () => {
          const c = this.ctx; vault(c, true); torches(c, false);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ ducking: true, weapon: null }, pose0));
          ninja(c, W * 0.6, gy - 2, -1, clk() / 40, { attacking: true, weapon: 'katana' });
          for (let k = 0; k < 3; k++) Sprites.px(c, 'rgba(255,255,255,0.6)', Math.round(W * 0.66 + k * 6), gy - 18 - k * 2, 5, 1);   // snelheidsstrepen
        } },
        { theme: 'temple', dur: 1800, cap: 'Versla de NINJA en claim de schat als jouw beloning — VECHT!', draw: () => {
          const c = this.ctx, bob = Math.abs(Math.sin(clk() / 80)) * 2.5; vault(c, false); torches(c, true);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ attacking: true, weapon: null }, pose0));
          ninja(c, W * 0.62, gy - 2 - bob, -1, 0, { weapon: 'katana' });
          c.fillStyle = '#ffef9a'; c.font = 'bold 16px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('VS', P(0.47), gy - 48); c.textAlign = 'left';
        } },
      ];
    }
    // ===== OUTRO na de Ninja -> Wereld 2 VOLTOOID (schatkamer -> geheime uitgang -> wordt vervolgd) =====
    if (script === 'ninjawin') {
      const P = (x) => Math.round(W * x), H = CONFIG.VIEW_H;
      const vault = (c) => {
        c.fillStyle = '#1e1610'; c.fillRect(0, 0, W, gy);
        for (let y = 4; y < gy; y += 16) { const off = ((y / 16) % 2) * 16; for (let x = -off; x < W; x += 32) Sprites.px(c, '#271c13', x + 1, y, 30, 14); }
        const gold = (x) => { for (let r = 0; r < 5; r++) { const rw = 32 - r * 6; Sprites.px(c, '#e8b431', x - rw / 2, gy - 6 - r * 4, rw, 4); } Sprites.px(c, '#fff0a0', x - 12, gy - 6, 4, 2); };
        gold(52); gold(150); gold(306);
        const gem = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 4, 4); c.fillStyle = '#fff'; c.fillRect(x + 1, y, 1, 1); };
        gem(92, gy - 4, '#e8425a'); gem(120, gy - 3, '#e8425a'); gem(210, gy - 5, '#42a0e8'); gem(258, gy - 4, '#e8425a'); gem(330, gy - 4, '#57e08a');
        Sprites.px(c, '#b89440', Math.round(W * 0.5) - 8, gy - 42, 16, 38); Sprites.px(c, '#d8b048', Math.round(W * 0.5) - 10, gy - 46, 20, 6);   // afgodsbeeld
      };
      const torch = (c, tx, ty) => { Sprites.px(c, '#3a2a18', tx - 1, ty, 3, 12); const fl = 3 + Math.round(Math.sin(clk() / 90 + tx) * 1.6); c.globalAlpha = 0.3; c.fillStyle = '#ff9a2a'; c.beginPath(); c.arc(tx, ty - 4, fl + 6, 0, 6.2832); c.fill(); c.globalAlpha = 1; c.fillStyle = '#ffb23a'; c.beginPath(); c.arc(tx, ty - 6, fl, 0, 6.2832); c.fill(); c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(tx, ty - 6, fl * 0.5, 0, 6.2832); c.fill(); };
      const torches = (c) => { torch(c, 108, 66); torch(c, 250, 68); };
      const sparkle = (c) => { for (let i = 0; i < 6; i++) { const sx = (i * 61 + 30) % W, ph = (clk() / 240 + i) % 3; if (ph < 1) Sprites.px(c, '#fff6c8', sx, gy - 10 - (i % 3) * 4, 2, 2); } };
      return [
        // ===== Scène 1 – De Overwinning =====
        { theme: 'temple', dur: 2400, cap: 'De ninja valt op de grond en verdwijnt langzaam in de schaduwen…', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400); vault(c); torches(c);
          c.globalAlpha = 1 - p * 0.8; this._storyFighter(c, 'ninja', W * 0.64, gy - 2, 1, 0, 1.1, { squash: true }); c.globalAlpha = 1;
          Sprites.drawCharacter(c, P(0.34), Math.round(gy - 2), 1, ch.palette, Object.assign({ attacking: true, weapon: null }, pose0));
        } },
        { theme: 'temple', dur: 2200, cap: 'De schatkamer is eindelijk veilig.', draw: () => {
          const c = this.ctx; vault(c); torches(c); sparkle(c);
          Sprites.drawCharacter(c, P(0.4), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
        } },
        { theme: 'temple', dur: 2200, cap: 'Het goud en de robijnen liggen voor het oprapen.', draw: () => {
          const c = this.ctx; vault(c); torches(c); sparkle(c);
          Sprites.drawCharacter(c, P(0.3), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          const gem = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 5, 5); c.fillStyle = '#fff'; c.fillRect(x + 1, y + 1, 1, 1); };
          gem(P(0.5), gy - 12, '#e8425a'); gem(P(0.58), gy - 8, '#e8425a'); gem(P(0.44), gy - 7, '#42a0e8');
        } },
        // ===== Scène 2 – De Schat =====
        { theme: 'temple', dur: 2300, cap: 'Je vult je tas met zoveel goud en robijnen als je kunt dragen.', draw: () => {
          const c = this.ctx; vault(c); torches(c); sparkle(c);
          Sprites.drawCharacter(c, P(0.44), Math.round(gy - 2), -1, ch.palette, Object.assign({ ducking: true, weapon: null }, pose0));
          for (let k = 0; k < 4; k++) Sprites.px(c, '#ffe27a', Math.round(P(0.4) + Math.sin(clk() / 120 + k) * 4), gy - 20 - k * 4, 3, 3);   // opdwarrelend goud
        } },
        { theme: 'temple', dur: 2300, cap: 'Tussen de schatten ontdek je een oude kaart en een verborgen hendel.', draw: () => {
          const c = this.ctx; vault(c); torches(c);
          Sprites.drawCharacter(c, P(0.34), Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
          Sprites.px(c, '#e8d8a8', W * 0.6, gy - 30, 16, 12); Sprites.px(c, '#b89050', W * 0.6, gy - 30, 16, 2); Sprites.px(c, '#8a5a2a', W * 0.6 + 4, gy - 26, 8, 1);   // oude kaart
          Sprites.px(c, '#6a6f78', W * 0.76, gy - 26, 3, 14); Sprites.px(c, '#c0303a', W * 0.76 - 2, gy - 28, 7, 4);   // hendel
        } },
        { theme: 'temple', dur: 2300, cap: 'Met een zwaar gerommel schuift een geheime doorgang open…', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2300), jit = Math.round(Math.sin(clk() / 24) * 1.2); vault(c); torches(c);
          const ow = 44, ox = Math.round(W * 0.72) - ow / 2, oy = gy - 46;
          c.fillStyle = '#080604'; c.fillRect(ox, oy, ow, 46);                                  // duistere doorgang
          const slide = Math.round(p * (ow / 2));
          c.fillStyle = '#3a2c1c'; c.fillRect(ox, oy, ow / 2 - slide, 46); c.fillRect(ox + ow / 2 + slide, oy, ow / 2 - slide, 46);   // schuifsteen
          Sprites.drawCharacter(c, P(0.3) + jit, Math.round(gy - 2), 1, ch.palette, Object.assign({ weapon: null }, pose0));
        } },
        // ===== Scène 3 – De Uitgang =====
        { theme: 'temple', dur: 2200, cap: 'Je volgt de geheime tunnel en laat de tempel achter je.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2200); c.fillStyle = '#140f0a'; c.fillRect(0, 0, W, gy);   // donkere tunnel
          for (let x = 0; x < W; x += 40) { c.fillStyle = '#0d0a07'; Sprites.px(c, '#0d0a07', x, 20, 22, gy - 20); }   // tunnel-ribbels
          Sprites.drawCharacter(c, P(0.28) + Math.round(p * 30), Math.round(gy - 2), 1, ch.palette, Object.assign({ walkPhase: clk() / 60, weapon: null }, pose0));
        } },
        { theme: 'temple', dur: 2400, cap: 'Het daglicht schijnt je tegemoet terwijl je de uitgang bereikt.', draw: (t) => {
          const c = this.ctx, p = Math.min(1, t / 2400); c.fillStyle = '#140f0a'; c.fillRect(0, 0, W, gy);
          const lightX = W * (0.9 - p * 0.2); const lg = c.createLinearGradient(lightX - 60, 0, W, 0); lg.addColorStop(0, 'rgba(255,244,200,0)'); lg.addColorStop(1, 'rgba(255,250,225,0.95)'); c.fillStyle = lg; c.fillRect(lightX - 60, 0, W - (lightX - 60), gy);
          Sprites.drawCharacter(c, P(0.4), Math.round(gy - 2), 1, ch.palette, Object.assign({ walkPhase: clk() / 60, weapon: null }, pose0));
        } },
        { theme: 'beach', dur: 2400, cap: 'Met de schat op zak begin je aan je volgende avontuur.', draw: () => {
          const c = this.ctx;   // buiten in het daglicht (beach-bg is al getekend)
          Sprites.drawCharacter(c, P(0.42), Math.round(gy - 2), 1, ch.palette, Object.assign({ walkPhase: clk() / 60, weapon: null }, pose0));
          Sprites.px(c, '#e8b431', P(0.42) - 10, gy - 16, 6, 8); Sprites.px(c, '#ffd24a', P(0.42) - 10, gy - 16, 6, 2);   // zak met goud op de rug
        } },
        // ===== Scène 4 – Zwart scherm: wordt vervolgd =====
        { theme: 'temple', dur: 3000, cap: 'Wordt vervolgd…', draw: (t) => {
          const c = this.ctx; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
          const a = Math.min(1, t / 900); c.globalAlpha = a; c.fillStyle = '#f4e8c0'; c.font = 'bold 17px "Courier New",monospace'; c.textAlign = 'center'; c.fillText((window.I18N && I18N.lang === 'en') ? 'TO BE CONTINUED…' : 'WORDT VERVOLGD…', W / 2, H / 2); c.textAlign = 'left'; c.globalAlpha = 1;
        } },
      ];
    }
    const sc = this._storyData; if (!sc) return [];
    const px = Math.round(W * 0.30), fxT = W * 0.68;
    return [
      { theme: sc.theme, dur: 2200, cap: sc.caps[0], draw: (t) => {
        const ctx = this.ctx, prog = Math.min(1, t / 2200), x = -20 + prog * (px + 20);
        Sprites.drawCharacter(ctx, Math.round(x), gy - 2, 1, ch.palette, Object.assign({ walkPhase: clk() / 70, weapon: null }, pose0));
      } },
      { theme: sc.theme, dur: 2300, cap: sc.caps[1], draw: (t) => {
        const ctx = this.ctx;
        Sprites.drawCharacter(ctx, px, gy - 2, 1, ch.palette, Object.assign({ weapon: null }, pose0));
        const prog = Math.min(1, t / 2300), fx = (W + 34) + prog * (fxT - (W + 34));
        this._storyFighter(ctx, sc.foe, fx, gy - 2, -1, clk() / 64, sc.scale);
      } },
      { theme: sc.theme, dur: 1400, cap: sc.caps[2], draw: () => {
        const ctx = this.ctx, c = clk();
        Sprites.drawCharacter(ctx, px, gy - 2, 1, ch.palette, Object.assign({ weapon: null }, pose0));
        const bob = Math.abs(Math.sin(c / 110)) * 2.5;
        this._storyFighter(ctx, sc.foe, fxT, gy - 2 - bob, -1, 0, sc.scale);
        for (let k = 0; k < 3; k++) { const a = (c / 70 + k) % 3; Sprites.px(ctx, '#ffffff', Math.round(fxT - 12 - a * 4), gy - 22 - k * 3, 2, 2); }
      } },
    ];
  },

  startVersus(role, opts) {
    opts = opts || {};
    this.journeyDrops = opts.journeyDrops || null;     // Journey: extra powerup-pool per level
    this._bossBot = !!opts.boss;                        // Journey-eindbaas (Gorilla King)
    this._mmBot = !!opts.mmLevel;                       // matchmaking-bot: echte inzet (XP/munten/kisten als online)
    this._quakeUntil = 0; this._selfQuakeUntil = 0;    // aardbeving-ability reset
    this.abilityFx = [];                                // magische ring-effecten
    this.zapFx = null;                                   // Ryan zap-dash bliksemboog
    // ---- visuele "juice"-laag (impact/KO/sfeer) ----
    this.hitStop = 0;                                    // korte freeze-frame bij een rake klap
    this.impacts = [];                                   // schokgolf-ringen op het raakpunt
    this.floatTexts = [];                                // zwevende schade-/combo-cijfers
    this.ambient = [];                                   // sfeer-deeltjes (embers/bladeren/nevel)
    this.hurtFlash = 0;                                  // rode schermrand-flits als JIJ geraakt wordt
    this.smashFlash = 0;                                 // witte flits bij een grote klap / KO
    this.ko = null;                                      // KO-cinematic {x,y,born,won}
    this._ambClock = 0;                                  // spawn-timer voor sfeer-deeltjes
    this.vsPaused = false;                              // verse pot is nooit gepauzeerd
    if (!opts.journey) this.journey = null;            // alleen Journey-context houden bij een Journey-potje
    if (window.Net && Net.lobby) Net.lobbyLeave();   // niet meer "online in de lobby" tijdens een potje
    const map = opts.mapObj || VERSUS_MAPS.find((m) => m.id === opts.mapId) || VERSUS_MAPS[0];
    const mode = (opts.mode === 'both') ? 'both' : (opts.mode === 'smash') ? 'smash' : 'melee';
    this.vsMap = map; this.vsMode = mode;
    this.vsMapW = map.w || CONFIG.VIEW_W;
    this._vsChallengeMusic = !opts.journey && !opts.bossFight && !opts.boss && mode === 'smash';   // online Power Smash-potje
    // muziek NIET meteen starten: eerst een map-intro (geen muziek, wat sfx), muziek start na het aftellen
    this._pendingMusicTheme = (opts.bossFight || opts.boss) ? 'boss' : map.id;
    if (window.Sfx) { Sfx.stopMusic(); Sfx.play('mapintro'); }
    this._lastInputTime = Date.now(); this._afkKicked = false;   // AFK-timer resetten bij matchstart
    this.vsFallY = map.fallY || FALL_DEATH_Y;
    this.vsCamX = 0; this.vsCamY = 0; this.vsCamZoom = 1;
    this.worldId = -1;
    this.level = { versus: true, parkour: true, mode: 'versus', length: this.vsMapW, isBoss: false };
    // Power Smash: iedereen start met de knuppel (of het start-wapen van je character); anders je eigen uitrusting
    const myChar = CHARACTERS[Storage.data.equippedCharacter] || {};
    const baseMelee = mode === 'smash' ? (myChar.startMelee || 'bat') : Storage.data.equippedMelee;
    const rangedId = mode === 'both' ? Storage.data.equippedRanged : null;
    this.player = new Player(baseMelee, rangedId, Storage.data.equippedCharacter);
    this._applyCharLevel(this.player);                 // per-character level-bonussen (+HP/+speed/langere abilities)
    this._setupPlayerArmor(this.player);               // harnas (blacksmith): extra grijze HP + slijtage-teller
    this.player.maxJumps = 2; this.player.jumps = 2;
    this.player.knockVx = 0; this.player.dead = false; this.player.respawnInvuln = 0;
    this.player.baseMelee = baseMelee; this.player.fireballs = 0; this.player.smashRockets = 0;
    this.player._weaponUntil = 0; this.player._fireCd = 0;
    this.zombies = []; this.bullets = []; this.particles = []; this.coinFx = []; this.ammoFx = [];
    this.ammoDrops = []; this.healthDrops = []; this.corpses = []; this.pendingZombies = [];
    this.powerUps = []; this.enemyShots = []; this.obstacles = []; this.rocketShots = []; this.platforms = [];
    this.ghostBullets = []; this.botBullets = [];
    this.drops = []; this._dropTimer = SMASH_DROP_EVERY; this._dropId = 1;
    this.nuke = null; this._nukeUsed = false;            // nuke-powerup: max 1x per match
    this.traps = [];                                     // Tempelbewaker-vallen
    this.portals = []; this._portalTimer = SMASH_PORTAL_EVERY;
    this._dragonUsed = false;                                        // max 1 draak per match
    this.dragons = [];
    // Cave: knoppen + muur + sfeer (bats/druppels)
    this.caveWall = null; this._caveArmAt = this.time + CAVE_ARM_MS; this.caveArmed = -1;
    this.caveButtons = (map.buttons || []).map((b) => ({ at: b.at, x: b.x, y: b.y }));
    this.caveBats = []; this.caveDrips = []; this.lightningFx = null; this.rocks = [];
    this._comboXp = 0;
    // Vulcan: lavastraal-state + sfeer (achtergrond-uitbarstingen + rook)
    this.vulcan = map.vulcan ? { state: 'idle', nextAt: this.time + VULCAN_EVERY, x: map.vulcanX || 360, hitP: false, hitB: false } : null;
    this.vulcanSmoke = []; this.vulcanBg = [];
    // Pirate: zeemonster-tentakel
    this.tentacle = map.pirate ? { state: 'idle', nextAt: this.time + PIRATE_TENT_EVERY, x: 360, mode: 'flat', hitP: false, hitB: false } : null;
    // Sky Castle: draak-snoekduik
    this.castleDragons = []; this._cDragonAt = map.castle ? this.time + CASTLE_DRAGON_EVERY + Math.random() * 4000 : 0;
    // Beach: getij + strandbal
    this.tide = map.beach ? { state: 'idle', nextAt: this.time + BEACH_TIDE_EVERY, level: 0, dir: 1, _sloshAt: 0 } : null;
    this.beachFx = [];
    this.ball = null;
    this.player.beachball = 0; this.player.coco = 0; this.player.boomerang = 0; this.player.dart = 0;
    this.player.cannon = 0; this.player.shieldHp = 0; this.player.gunAmmo = 0; this.player.giant = false; this.player._baseMaxHp = this.player.maxHp; this.player._caged = false; this.player.heli = false; this.player.heliMinigun = 0; this.player.heliRockets = 0;
    // Jungle: lianen + wilde aap in het midden + papegaaien
    this.vsVines = map.vines || null;
    this.gorilla = map.cage ? { x: map.cage.x, y: map.cage.floorY, hp: GORILLA_HP, maxHp: GORILLA_HP, dir: -1, alive: true, state: 'idle', swipeUntil: 0, swipeCd: 0, respawnAt: 0, hitFlash: 0, _net: 0 } : null;
    this.jungleCage = map.cage || null;
    this.jungleApe = map.ape ? { x: map.ape.x, floorY: map.ape.floorY, y: map.ape.floorY, vy: 0, state: 'idle', dir: 1, nextAt: this.time + 1400, hitP: false, hitB: false, _net: 0 } : null;
    this.monkey = null;
    this.parrots = [];
    // Airplane: vogels die vanaf de voorkant (links) langs scheren
    this.birds = []; this._birdAt = map.airplane ? this.time + 2600 : 0;
    // Jungle: stun-darts die af en toe door de map schieten
    this.darts = []; this._dartAt = map.darts ? this.time + 3500 : 0;
    this.ammo = mode === 'both' ? 999 : 0;
    this.rockets = 0;
    this.boss = null; this.shake = 0; this.cam.x = 0; this.time = 0; this.dtScale = 1;
    this.buildVersusPlatforms(map);
    const meLeft = (role === 'host') !== !!opts.swapSides;   // host = links, tenzij deze pot geswapt is
    const base = meLeft ? map.spawnL : map.spawnR;
    const sp = { x: base.x, y: base.y, dir: meLeft ? 1 : -1 };
    this.player.x = sp.x; this.player.y = sp.y; this.player.dir = sp.dir; this.player.onGround = true;
    const rb = meLeft ? map.spawnR : map.spawnL;
    this.vs = {
      role, spawn: sp, botSpawn: { x: rb.x, y: rb.y, dir: meLeft ? -1 : 1 },
      myScore: 0, oppScore: 0, target: (mode === 'smash' && opts.rounds) ? Math.max(3, Math.min(10, opts.rounds | 0)) : (mode === 'smash' ? SMASH_ROUNDS : 5),
      countdown: 3000, lastSwing: 0, botLastSwing: 0, netTimer: 0, over: false,
      introUntil: this.time + VERSUS_INTRO_MS, introShown: false, musicStarted: false,   // map-intro vóór het aftellen
      timed: !!opts.timed, matchTimer: opts.timed ? MATCH_TIME_MS : 0, timeUp: false, suddenDeath: false, zoomTarget: null,   // matchmaking: 3-min tijdslimiet
      roundFreezeUntil: 0, roundMsg: '',
      roundPlayStart: 0, _fleeWarnAt: 0, myLastHit: 0, oppLastHit: 0,   // anti-vluchten: laatste pvp-schade per kant
      remote: {
        x: rb.x, y: rb.y, tx: rb.x, ty: rb.y,
        dir: meLeft ? -1 : 1, walkPhase: 0, attacking: false, swingWeapon: null, heldWeapon: 'bat',
        alive: true, charId: 'ryan', lastSeen: 0, hp: 100, maxHp: 100,
      },
    };

    // ----- tegen de BOT (lokaal, geen XP) -----
    this.vsBot = !!opts.bot;
    this.bot = null;
    const lvl = Math.max(1, Math.min(10, opts.diff || 5));
    this.botLevel = lvl;
    this.botCfg = BOT_PROFILES[lvl - 1];
    if (opts.journey) {
      // Journey-mensapen zijn vechters: ze pakken geen ranged wapen op, dus laat ze niet op
      // schiet-afstand blijven hangen — ze komen naar je toe en meppen (diff bepaalt het tempo).
      this.botCfg = Object.assign({}, this.botCfg, { standoff: 22, aggro: Math.max(this.botCfg.aggro, 0.85), jumpy: Math.max(this.botCfg.jumpy, 0.6) });
    }
    if (this.vsBot) {
      const ids = CHARACTER_ORDER.filter((id) => !CHARACTERS[id].journeyOnly);   // bot pakt geen Journey-only karakters
      const botChar = opts.botChar || (opts.boss ? 'kong' : (ids[Math.floor(Math.random() * ids.length)] || 'ryan'));
      const melees = ['bat', 'machete', 'sword', 'axe', 'mace', 'katana'];
      const botMelee = mode === 'smash' ? ((CHARACTERS[botChar] && CHARACTERS[botChar].startMelee) || 'bat') : melees[Math.floor(Math.random() * melees.length)];
      const guns = ['pistol', 'uzi', 'ak47'];
      const botRanged = mode === 'both' ? guns[Math.floor(Math.random() * guns.length)] : null;
      const b = new Player(botMelee, botRanged, botChar);
      b.maxJumps = 2; b.jumps = 2; b.knockVx = 0; b.dead = false; b.respawnInvuln = 0;
      b.x = rb.x; b.y = rb.y; b.dir = this.vs.botSpawn.dir; b.onGround = true;
      b._think = 0; b._jumpCd = 0; b._shootCd = 0; b._blockUntil = 0; b._rangedId = botRanged;
      b.baseMelee = botMelee; b.fireballs = 0; b.smashRockets = 0; b._weaponUntil = 0; b._fireCd = 0;
      b.cannon = 0; b.shieldHp = 0; b.gunAmmo = 0; b.giant = false; b._baseMaxHp = b.maxHp; b._caged = false; b.heli = false; b.heliMinigun = 0; b.heliRockets = 0; b.beachball = 0;
      b.beachball = 0; b.coco = 0; b.boomerang = 0; b.dart = 0;
      // Journey-vijanden (koba/kong) houden hun oude stats + passives (online zijn ze aangepast)
      if (opts.journey && typeof JOURNEY_ENEMY_OVERRIDE !== 'undefined' && JOURNEY_ENEMY_OVERRIDE[botChar]) {
        const ov = JOURNEY_ENEMY_OVERRIDE[botChar];
        if (ov.maxHp) { b.maxHp = ov.maxHp; b.hp = ov.maxHp; b._baseMaxHp = ov.maxHp; }
        if (ov.speedMul != null) b.speedMul = ov.speedMul;
        if (ov.meleeMul != null) b.meleeMul = ov.meleeMul;
        if (ov.autoRage) { b.autoRage = true; b.rageEvery = ov.rageEvery || 14000; b.rageNextAt = b.rageEvery; }
      }
      if (opts.boss) { b.maxHp = 220; b.hp = 220; b._baseMaxHp = 220; }   // Gorilla King: extra taai
      // matchmaking-bot (Lv 10..20): boven Lv 10 iets meer HP + klap-schade
      if (opts.mmLevel && opts.mmLevel > 10) {
        const over = opts.mmLevel - 10;                 // 1..10
        b.maxHp = Math.round(b.maxHp * (1 + over * 0.06)); b.hp = b.maxHp; b._baseMaxHp = b.maxHp;
        b.meleeMul = (b.meleeMul || 1) * (1 + over * 0.03);
      }
      this.bot = b;
      this.vs.remote.charId = botChar;
    } else if (window.Net) {
      Net.setVersusCallbacks({
        onState: (s) => this.onVersusState(s),
        onHit: (p) => { if (p) p.pvp = 1; this.onVersusHit(p); },   // online: dit is een échte tegenstander-treffer (pvp)
        onParry: (p) => this.onVersusParry(p),
        onTide: (p) => this.onVersusTide(p),
        onBall: (p) => this.onVersusBall(p),
        onFell: () => this.onVersusFell(),
        onBurn: () => this.onVersusBurn(),
        onShot: (p) => this.onVersusShot(p),
        onRematch: () => UI.onRematch(),
        onOver: (p) => this.onVersusOver(p),
        onDrop: (p) => this.onVersusDrop(p),
        onPickup: (p) => this.onVersusPickup(p),
        onNuke: () => this.onVersusNuke(),
        onTraps: (p) => this.onVersusTraps(p),
        onRooted: () => this.onVersusRooted(),
        onPortal: (p) => this.onVersusPortal(p),
        onDragon: () => this.onVersusDragon(),
        onStun: () => this.onVersusStun(),
        onCaveArm: (p) => this.onCaveArm(p),
        onCaveWall: (p) => this.onCaveWall(p),
        onRocks: (p) => this.onVersusRocks(p),
        onLava: (p) => this.onVersusLava(p),
        onTentacle: (p) => this.onVersusTentacle(p),
        onGorilla: (p) => this.onVersusGorilla(p),
        onGorhit: (p) => this.onVersusGorhit(p),
        onMonkey: (p) => this.onVersusMonkey(p),
        onApe: (p) => this.onVersusApe(p),
      });
    }
    this.state = 'versus';
    const qb = document.getElementById('btn-vs-quit');     // online = LEAVE, bot = ✕
    if (qb) { qb.innerHTML = this.vsBot ? '<svg class="ic"><use href="#ic-x"/></svg>' : 'LEAVE'; qb.classList.toggle('leave', !this.vsBot); }
    Input.clear();
    UI.showVersus();
  },

  buildVersusPlatforms(map) {
    // platforms klonen met basis-positie (bx/by) zodat bewegende platforms kunnen oscilleren
    this.platforms = (map.platforms || []).map((p) => ({
      x: p.x, y: p.y, w: p.w, bx: p.x, by: p.y, mv: p.mv || null, dx: 0, dy: 0, soft: p.soft || false, slide: p.slide || 0, mast: p.mast || false,
      roof: p.roof || false,
      cloud: p.cloud || false, standT: 0, broken: false, reformAt: 0,   // wolk-platform (Airplane): max 5s, dan zak je erdoor
    }));
  },

  // bewegende platforms updaten (+ delta voor het meedragen van de speler)
  updateVersusPlatforms() {
    for (const p of this.platforms) {
      if (!p.mv) { p.dx = 0; p.dy = 0; continue; }
      const off = Math.sin(this.time * p.mv.speed + (p.mv.phase || 0)) * p.mv.amp;
      const nx = p.mv.axis === 'x' ? p.bx + off : p.bx;
      const ny = p.mv.axis === 'y' ? p.by + off : p.by;
      p.dx = nx - p.x; p.dy = ny - p.y; p.x = nx; p.y = ny;
    }
  },

  updateVersus(dt) {
    if (!this.vs) return;
    if (this.hitStop > 0 && this.vs.roundFreezeUntil <= this.time) { this.hitStop = Math.max(0, this.hitStop - dt); return; }   // freeze-frame bij een rake klap
    this.time += dt;
    if (this.abilityFx && this.abilityFx.length) this.abilityFx = this.abilityFx.filter((f) => this.time - f.born < f.dur);
    if (this.zapFx && this.time - this.zapFx.born >= this.zapFx.dur) this.zapFx = null;
    this.dtScale = Math.min(3, dt / 16.6667);
    // ---- visuele effect-timers (impact/KO/sfeer) ----
    if (this.impacts.length) this.impacts = this.impacts.filter((f) => this.time - f.born < f.dur);
    if (this.floatTexts.length) { for (const ft of this.floatTexts) { ft.y += ft.vy * this.dtScale; ft.vy += 0.05 * this.dtScale; } this.floatTexts = this.floatTexts.filter((ft) => this.time - ft.born < ft.dur); }
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.smashFlash > 0) this.smashFlash = Math.max(0, this.smashFlash - dt);
    if (this.ko && this.time - this.ko.born > 1200) this.ko = null;
    this._updateAmbient(dt);
    const v = this.vs;

    // map-intro bij de start van de match: toon de map (geen muziek, wat sfx), dán pas aftellen
    if (v.introUntil && this.time < v.introUntil) {
      if (!v.introShown) { v.introShown = true; if (window.UI && UI.showMapIntro) UI.showMapIntro(this.vsMap); if (window.Sfx) setTimeout(() => { try { Sfx.play('stomp'); } catch (e) {} }, 1100); }
      for (const p of this.particles) p.update(dt, this);
      this.particles = this.particles.filter((p) => p.life > 0);
      this.updateVersusCamera();
      if (window.UI && UI.updateVersusHUD) UI.updateVersusHUD(v);
      return;
    }
    if (v.introUntil) { v.introUntil = 0; if (window.UI && UI.hideMapIntro) UI.hideMapIntro(); }   // intro klaar -> nu het aftellen

    // tijd op (matchmaking): bevriezen, drumroll + camera zoomt op de winnaar
    if (v.timeUp) {
      for (const p of this.particles) p.update(dt, this);
      this.particles = this.particles.filter((p) => p.life > 0);
      this.updateVersusCamera();
      if (window.UI && UI.updateVersusHUD) UI.updateVersusHUD(v);
      return;
    }

    // ronde-freeze: even stilstaan met grote "wint de ronde"-tekst
    if (v.roundFreezeUntil > this.time) {
      for (const p of this.particles) p.update(dt, this);
      this.particles = this.particles.filter((p) => p.life > 0);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 0.04);
      if (this.ko) this.updateVersusCamera();          // KO-cinematic: camera zoomt in op de ring-out
      if (window.UI && UI.updateVersusHUD) UI.updateVersusHUD(v);
      return;
    } else if (v.roundMsg) {                          // freeze net afgelopen -> nieuwe ronde
      v.roundMsg = '';
      this.respawnLocal();
      if (this.vsBot) this.respawnBot(); else v.remote.alive = true;
      v.countdown = 1600;                             // korte aftelling: camera zoomt weer in op jou
    }

    this.updateVersusPlatforms();

    // AFK / uit-de-app-detectie (alleen echte online potjes)
    if (!this.vsBot && !v.over) {
      if (v.countdown > 0 || this.vsPaused) this._lastInputTime = Date.now();   // tijdens aftellen/pauze telt AFK niet
      else { this._checkVersusAfk(v); if (v.over) return; }
    }

    // matchmaking-tijdslimiet (3 min) -> meeste rondes wint (gelijk = sudden death)
    if (v.timed && !v.suddenDeath && v.matchTimer > 0 && v.countdown <= 0) {
      v.matchTimer -= dt;
      if (v.matchTimer <= 0) { v.matchTimer = 0; this._matchTimeUp(); if (v.timeUp) return; }
    }

    if (v.countdown > 0) {                             // korte aftelling vóór de start
      const before = v.countdown; v.countdown -= dt;
      if (before > 0 && v.countdown <= 0) {                       // aftellen klaar -> ronde begint: anti-vlucht-klok resetten
        v.roundPlayStart = this.time; v._fleeWarnAt = 0;
        v.myLastHit = this.time; v.oppLastHit = this.time;        // schade-klok per ronde opnieuw (verse 10s)
        if (!v.musicStarted) {                                    // eerste ronde -> muziek start
          v.musicStarted = true;
          if (window.Sfx) { Sfx.music(this._pendingMusicTheme || 'menu'); if (this._vsChallengeMusic) Sfx.setMusicIntensity(1); }
        }
      }
    } else {
      this.updateFleePunish(dt);                       // anti-vluchten: leider die niet aanvalt krijgt zelf schade
      if (this.player.respawnInvuln > 0) this.player.respawnInvuln -= dt;
      if (!this.player.dead && !this.player._trapCharges) this.player.abCharge = Math.min(1, this.player.abCharge + dt / (ABILITY_CHARGE_MS * (this.player.abChargeMul || 1)));   // ability laadt langzaam op (niet terwijl je nog vallen in de hand hebt)
      if (this.vsBot && this.bot && !this.bot.dead && this.bot.ability) this.bot.abCharge = Math.min(1, this.bot.abCharge + dt / (ABILITY_CHARGE_MS * (this.bot.abChargeMul || 1)));  // bot laadt óók op
      // vuurbal-in-de-hand: continu vonkjes zolang je 'm vasthoudt (speler + tegenstander/bot)
      if (!this.player.dead && this.player.fireballs > 0) this._fireHoldEmbers(this.player);
      if (this.vs && this.vs.remote && this.vs.remote.alive && this.vs.remote._fireHold) this._fireHoldEmbers(this.vs.remote);
      if (this._quakeUntil > this.time) this.updateEarthquake(dt);                                                // aardbeving-ability (bot)
      // online: de tegenstander gebruikte aardbeving op JOU -> jij wordt geschud
      if (this._selfQuakeUntil > this.time && !this.player.dead) {
        this.shake = Math.max(this.shake, 7);
        this.player.knockVx += (Math.random() - 0.5) * 6;
        if (this.player.onGround && Math.random() < 0.06) { this.player.vy = -4 - Math.random() * 3; this.player.onGround = false; }
      }
      if (this.player.heli) {
        this.updateHeli(dt);                          // gevechtsheli: vliegen + minigun/raketten
      } else {
        if (this.vsMode === 'smash') this.smashFire(dt);   // fireball/rocket op de vuurknop (vóór update)
        this.player.update(dt, this);                   // eigen speler: volledige besturing/fysica
      }
      this.player.x = Math.max(8, Math.min(this.vsMapW - 8, this.player.x));   // binnen de map
      this.carryOnPlatform();                          // meebewegen met bewegend platform
      if (this.vsMode === 'smash') this.updateSmash(dt);  // drops spawnen/oppakken + wapen-timer
      if (this.vsMap && this.vsMap.cave) this.updateCave(dt);   // knoppen/muur + sfeer
      if (this.vsMap && this.vsMap.vulcan) this.updateVulcan(dt);   // lavastraal + sfeer
      if (this.vsMap && this.vsMap.pirate) this.updatePirate(dt);   // zeemonster-tentakel
      if (this.vsMap && this.vsMap.beach) this.updateTide(dt);      // strand: getij/vloed
      if (this.ball) this.updateBall(dt);                           // strandbal
      if (this.vsMap && this.vsMap.darts) this.updateStunDarts(dt);    // Jungle: stun-darts schieten door de map
      if (this.vsMap && this.vsMap.castle) this.updateCastleDragon(dt); // Sky Castle: draak-snoekduik
      if (this.vsMap && this.vsMap.airplane) this.updateAirplane(dt);  // Airplane: wolk-timers + vogels
      if (this.player.giant) { if (this.time >= (this.player._giantUntil || 0)) this._endGiant(this.player); else this.giantContact(dt); }   // reus: 8s, dan terug
      if (this.vsBot) this.updateBot(dt);              // de AI-tegenstander
      this.checkVersusHit();
      // Just: stamp-schade op de tegenstander bij de landing
      if (this.player._poundHit) {
        this.player._poundHit = false;
        const r = v.remote;
        if (r.alive && Math.abs(r.x - this.player.x) < 40 && Math.abs(r.y - this.player.y) < 30) {
          const kd = r.x >= this.player.x ? 1 : -1;
          if (this.vsBot) this.applyHitToBot(kd, 16, -6, 24);
          else if (window.Net) Net.versusSend('hit', { dir: kd, power: 16, vy: -6, dmg: 24 });
          this.shake = Math.max(this.shake, 8);
        }
      }
      if (this.vsMode === 'both' || this.vsMode === 'smash') this.updateVersusBullets(dt);
      // Vince-vuuraura raakt de tegenstander
      if (this.player.fireAura && this.player._auraOn && v.remote.alive &&
          Math.abs(v.remote.x - this.player.x) < 24 && Math.abs(v.remote.y - this.player.y) < 26) {
        if (this.vsBot) { if (this.bot && this.bot.respawnInvuln <= 0) this.bot.burnUntil = this.time + 3000; }
        else if (this.time >= (v.burnSentAt || 0)) { v.burnSentAt = this.time + 600; if (window.Net) Net.versusSend('burn', {}); }
      }
      // eraf gevallen of doodgebrand -> punt voor de tegenstander
      if (!this.player.dead && (this.player.y > this.vsFallY || this.player.hp <= 0)) this.localFell();
    }

    // camera blijft op jou en zoomt mee; niemand wordt verplaatst (bot valt dus niet meer geforceerd)
    this.updateVersusCamera();

    // ghost-kogels van de tegenstander (alleen visueel)
    if (this.ghostBullets && this.ghostBullets.length) {
      for (const b of this.ghostBullets) { b.x += b.vx * this.dtScale; b.life -= dt; }
      this.ghostBullets = this.ghostBullets.filter((b) => b.life > 0 && b.x > -20 && b.x < this.vsMapW + 20);
    }

    // partikels
    for (const p of this.particles) p.update(dt, this);
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 0.04);

    // mijn stand uitzenden (~20x/sec)
    v.netTimer += dt;
    if (v.netTimer >= 50) { v.netTimer = 0; this.sendVersusState(); }

    // tegenstander vloeiend interpoleren
    const r = v.remote;
    r.x += (r.tx - r.x) * 0.35;
    r.y += (r.ty - r.y) * 0.35;

    if (window.UI && UI.updateVersusHUD) UI.updateVersusHUD(v);
  },

  // speler meedragen op een horizontaal bewegend platform
  carryOnPlatform() {
    const p = this.player;
    if (!p.onGround) return;
    for (const pf of this.platforms) {
      if (pf.dx && Math.abs(p.x - pf.x) < pf.w / 2 + p.w / 2 && Math.abs(p.y - pf.y) < 4) {
        p.x += pf.dx; break;
      }
    }
  },

  // klein beetje stuurhulp: alleen als de kogel de juiste kant op vliegt én dichtbij het doel is (niet te veel)
  _softAim(b, t) {
    const dx = t.x - b.x;
    if (Math.sign(dx) !== Math.sign(b.vx) || Math.abs(dx) > 80) return;
    const dy = (t.y - 14) - b.y;
    b.vy = (b.vy || 0) + Math.max(-0.12, Math.min(0.12, dy * 0.02)) * this.dtScale;
    b.vy = Math.max(-3, Math.min(3, b.vy));
  },

  // kogels in 'beide wapens'-modus: aankondigen, bewegen, treffers op de tegenstander
  updateVersusBullets(dt) {
    const r = this.vs.remote;
    for (const b of this.bullets) {
      if (!b._announced) {
        if (window.Net) Net.versusSend('shot', { x: Math.round(b.x), y: Math.round(b.y), vx: +b.vx.toFixed(2), k: b.kind || 0 });
        b._announced = true;
      }
    }
    for (const b of this.bullets) {
      if (b.kind === 'cannon' && b.homing && r.alive) {  // gericht: homing naar de tegenstander -> mist nooit
        const ang = Math.atan2((r.y - 14) - b.y, r.x - b.x), sp = 8;
        b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
        b.x += b.vx * this.dtScale; b.y += b.vy * this.dtScale;
        b.life += dt; if (b.life > 2500) b.alive = false;
      } else if ((b.kind === 'fire' || b.kind === 'rocket') && r.alive && r.heli && Math.sign(r.x - b.x) === Math.sign(b.vx)) {
        this._homeBullet(b, r.x, r.y - 12, b.kind === 'rocket' ? 6 : 7.5);   // gericht op een heli -> raakt altijd
        b.x += b.vx * this.dtScale; b.y += b.vy * this.dtScale; b.life += dt; if (b.life > 2500) b.alive = false;
      } else if (b.kind === 'coco') {                     // kokosbom: boog + ontploft op de grond
        b.vy = (b.vy || 0) + 0.4 * this.dtScale; b.x += b.vx * this.dtScale; b.y += b.vy * this.dtScale; b.life += dt;
        let land = b.y > CONFIG.GROUND_Y - 2;
        if (!land && b.vy > 0) for (const pf of this.platforms) { if (!pf.mast && b.x > pf.x - pf.w / 2 && b.x < pf.x + pf.w / 2 && b.y > pf.y - 4 && b.y < pf.y + 10) { land = true; break; } }
        if (land || b.life > 2600) this.explodeCoco(b);
      } else if (b.kind === 'boom') {                     // boemerang: vliegt uit en keert terug
        if (!b._ret && b.life > 420) { b.vx = -b.vx; b._ret = true; }
        b.x += b.vx * this.dtScale; b.life += dt; if (b.life > 1500) b.alive = false;
      } else {
        if ((b.kind === 'fire' || b.kind === 'rocket') && r.alive) this._softAim(b, r);  // klein beetje hulp dichtbij
        b.update(dt, this);
      }   // niet gericht (mist) of gewone kogel -> rechtdoor
    }
    for (const b of this.bullets) {
      const rw = b.kind === 'rocket' ? 16 : (b.kind === 'cannon' ? 18 : 11);
      const rh = b.kind === 'rocket' ? 20 : (b.kind === 'cannon' ? 22 : 16);
      if (b.alive && b.kind === 'coco' && r.alive && Math.abs(b.x - r.x) < 22 && Math.abs(b.y - (r.y - 14)) < 24) {
        this.explodeCoco(b); continue;                   // kokosbom raakt -> AoE-explosie
      }
      if (b.alive && r.alive && Math.abs(b.x - r.x) < rw && Math.abs(b.y - (r.y - 16)) < rh) {
        b.alive = false;
        const dmg = (b.hitDmg != null) ? b.hitDmg : Math.round((b.damage || 20) * 0.4);
        const power = (b.power != null) ? b.power : 9;
        const vy = b.kind === 'cannon' ? -8 : -3.5;
        const kd = Math.sign(b.vx) || 1;
        const stun = b._stun || 0;
        if (this.vsBot) { this.applyHitToBot(kd, power, vy, dmg); if (stun && this.bot) this.bot.stunUntil = Math.max(this.bot.stunUntil || 0, this.time + stun); }
        else if (window.Net) Net.versusSend('hit', { dir: kd, power: power, vy: vy, dmg: dmg, stun: stun });
        if (b.kind === 'fire') {                          // vuurbal laat ook branden
          if (this.vsBot) { if (this.bot && this.bot.respawnInvuln <= 0) this.bot.burnUntil = this.time + SMASH_FIRE_BURN; }
          else if (window.Net) Net.versusSend('burn', {});
        }
        this.spawnBlood(b.x, b.y);
        if (b.kind === 'cannon') this.shake = Math.max(this.shake, 8);
        if (b.kind) for (let i = 0; i < 8; i++) this.particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 3, -Math.random() * 2, b.kind === 'rocket' ? '#ffd24a' : (b.kind === 'cannon' ? '#888' : '#ff7a2a'), 320, 2));
        continue;
      }
      // kogel raakt de kooi-gorilla (Jungle)
      const g = this.gorilla;
      if (b.alive && g && g.alive && Math.abs(b.x - g.x) < 24 && Math.abs(b.y - (g.y - 18)) < 30) {
        b.alive = false;
        const dmg = (b.hitDmg != null) ? b.hitDmg : Math.round((b.damage || 20) * 0.4);
        this.hitGorilla(dmg);
      }
    }
    this.bullets = this.bullets.filter((b) => b.alive);
  },

  onVersusShot(p) {
    if (!this.ghostBullets) this.ghostBullets = [];
    if (this.ghostBullets.length < 40) this.ghostBullets.push({ x: p.x, y: p.y, vx: p.vx, life: 1200, kind: p.k || 0 });
    if (window.Sfx) { const k = p.k; Sfx.play(k === 'cannon' ? 'cannon' : k === 'rocket' ? 'rocket' : k === 'fire' ? 'fireball' : 'gun'); }   // tegenstander hoort je 'm afvuren
  },

  // ---- camera: blijft op JOU; schuift/zoomt mee naar de tegenstander als 'ie redelijk dichtbij is.
  // Niemand wordt verplaatst. Is de tegenstander te ver -> focus op jezelf (die mag dan uit beeld). ----
  updateVersusCamera() {
    const W = CONFIG.VIEW_W, H = CONFIG.VIEW_H, GY = CONFIG.GROUND_Y;
    const mapW = this.vsMapW || W;
    const p = this.player;
    const opp = this.vsBot ? this.bot : (this.vs ? this.vs.remote : null);
    const oppLive = !!(opp && (this.vsBot ? !opp.dead : opp.alive));
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // tijd op: dramatisch inzoomen op de winnaar
    if (this.vs && this.vs.timeUp && this.vs.zoomTarget) {
      const zt = this.vs.zoomTarget, zz = (this.vsCamZoom += (2.0 - this.vsCamZoom) * 0.1);
      const visW = W / zz, visH = H / zz;
      const tx = clamp(zt.x - visW / 2, 0, Math.max(0, mapW - visW));
      const ty = clamp(zt.y - 20 - visH / 2, -200, (GY + 28) - visH);
      this.vsCamX += (tx - this.vsCamX) * 0.14;
      this.vsCamY += (ty - this.vsCamY) * 0.14;
      return;
    }

    // aftelling (3s): strak inzoomen op JEZELF zodat je ziet welke kant je start
    if (this.vs && this.vs.countdown > 0) {
      const zz0 = (this.vsCamZoom += (1.7 - this.vsCamZoom) * 0.16);
      const visW = W / zz0, visH = H / zz0;
      let tx = (mapW <= visW) ? (mapW - visW) / 2 : clamp(p.x - visW / 2, 0, mapW - visW);
      let ty = Math.min((GY + 28) - visH, p.y - visH * 0.55); ty = Math.max(ty, -200);
      this.vsCamX += (tx - this.vsCamX) * 0.2;
      this.vsCamY += (ty - this.vsCamY) * 0.2;
      return;
    }

    // KO-cinematic (~0,9s): dramatisch inzoomen op de ring-out-plek
    if (this.ko && this.time - this.ko.born < 900) {
      const zz = (this.vsCamZoom += (1.85 - this.vsCamZoom) * 0.14);
      const visW = W / zz, visH = H / zz;
      let tx = clamp(this.ko.x - visW / 2, 0, Math.max(0, mapW - visW));
      let ty = clamp(this.ko.y - visH / 2, -200, (GY + 28) - visH);
      this.vsCamX += (tx - this.vsCamX) * 0.18;
      this.vsCamY += (ty - this.vsCamY) * 0.18;
      return;
    }

    const BIAS = 0.3, MX = 70, ZMIN = 0.6, ZMAX = 1.12;   // ruimer dichtbij
    const DEAD_X = 70, SHIFT_X = 110, CAPW = W / (2 * ZMIN);   // binnen DEAD_X leunt/zoomt het beeld NIET

    // ---- HORIZONTAAL: blijf op jou; leun/zoom pas naar de tegenstander voorbij de deadzone ----
    let cx, halfW;
    if (oppLive && !p.dead) {
      const dx = opp.x - p.x, dxA = Math.abs(dx), sgn = dx >= 0 ? 1 : -1;
      const beyond = Math.max(0, dxA - DEAD_X);                 // afstand voorbij de deadzone
      const sx = sgn * Math.min(beyond * BIAS, SHIFT_X);
      cx = p.x + sx;
      const playerHalf = Math.abs(sx) + MX;                     // jij altijd ruim in beeld
      const oppHalf = Math.abs(dx - sx) + MX * 0.7;             // tegenstander erbij (tot de zoom-grens)
      halfW = clamp(Math.max(playerHalf, oppHalf), MX, CAPW);
    } else {                                   // tegenstander weg/dood -> alleen jou volgen
      const f = (p.dead && oppLive) ? opp : p;
      cx = f.x; halfW = MX;
    }
    let z = clamp(W / (2 * halfW), ZMIN, ZMAX);   // zoom is puur HORIZONTAAL -> sprongen pulsen de zoom niet
    this.vsCamZoom += (z - this.vsCamZoom) * 0.1;
    const zz = this.vsCamZoom, visW = W / zz, visH = H / zz;

    let tx;
    if (mapW <= visW) tx = (mapW - visW) / 2;                       // map smaller dan beeld -> gecentreerd
    else tx = clamp(cx - visW / 2, 0, mapW - visW);

    // ---- VERTICAAL: puur op JOU. Vast (grond onderin); pas omhoog scrollen als jij hoog springt ----
    // (de tegenstander beweegt het beeld dus NIET op en neer)
    const restTy = (GY + 28) - visH;              // rustpositie: grond laag in beeld
    const followTy = p.y - visH * 0.32;           // hoog springen: jou bij de bovenkant houden
    let ty = Math.min(restTy, followTy);          // alleen omhoog volgen (springen), nooit omlaag wiebelen
    ty = Math.max(ty, -200);

    this.vsCamX += (tx - this.vsCamX) * 0.14;
    this.vsCamY += (ty - this.vsCamY) * 0.16;
  },

  // ---- POWER SMASH: vuurknop, drops, pickups ----
  smashFire() {
    const p = this.player;
    if (p.respawnInvuln > 0) return;                  // knippert (net gespawnd) -> je kunt niet vuren/raken
    if (!p.dead && Input.state.attack) {
      if (p.giant) { /* reus kan niet aanvallen */ }
      else if (p.cannon > 0) {                              // kanonskogel: altijd vuren; alleen richting de tegenstander = homing
        if (this.time >= (p._fireCd || 0)) {
          const oppX = this.vsBot ? (this.bot ? this.bot.x : p.x + p.dir * 100) : this.vs.remote.x;
          const facing = (Math.sign(oppX - p.x) === p.dir) || Math.abs(oppX - p.x) < 8;
          p.cannon--; p._fireCd = this.time + 900; this.spawnCannon(p, facing);   // niet gericht -> mist
        }
      } else if (p.gunAmmo > 0 && (p.rangedId === 'ak47' || p.rangedId === 'deagle' || p.rangedId === 'crossbow')) {  // geweren: vuren tot de kogels op zijn
        if (this.time >= (p._fireCd || 0)) {
          const g = GUN_STATS[p.rangedId];
          p.gunAmmo--; p._fireCd = this.time + g.cd; this.spawnGunShot(p, g);
          if (p.gunAmmo <= 0) { p.rangedId = null; p.weaponId = p.meleeId || 'bat'; }
        }
      } else if (p.beachball > 0 && !this.ball) {           // strandbal afschieten (1 actieve bal tegelijk)
        if (this.time >= (p._fireCd || 0)) { p.beachball--; p._fireCd = this.time + 500; this.spawnBall(p, 'me'); }
      } else if (p.coco > 0) {                               // kokosbom (lobt + ontploft)
        if (this.time >= (p._fireCd || 0)) { p.coco--; p._fireCd = this.time + 650; this.spawnCoco(p); }
      } else if (p.boomerang > 0) {                          // boemerang (keert terug)
        if (this.time >= (p._fireCd || 0)) { p.boomerang--; p._fireCd = this.time + 700; this.spawnBoomerang(p); }
      } else if (p.dart > 0) {                               // gifdart (snel + verdoving)
        if (this.time >= (p._fireCd || 0)) { p.dart--; p._fireCd = this.time + 280; this.spawnDart(p); }
      } else if (p.fireballs > 0 || p.smashRockets > 0 || p.stars > 0) {  // vuurwapen opgepakt -> vuren
        if (this.time >= (p._fireCd || 0)) {
          if (p.fireballs > 0) { p.fireballs--; p._fireCd = this.time + 420; this.spawnVersusProjectile(p, 'fire'); }
          else if (p.stars > 0) { p.stars--; p._fireCd = this.time + SMASH_STAR_CD; this.spawnVersusProjectile(p, 'star'); if (p.stars <= 0) { p.rangedId = null; if (p.weaponId === 'ninjastar') p.weaponId = p.meleeId || 'bat'; } }
          else { p.smashRockets--; p._fireCd = this.time + 850; this.spawnVersusProjectile(p, 'rocket'); if (p.smashRockets <= 0) { p.rangedId = null; if (p.weaponId === 'rocketlauncher') p.weaponId = p.meleeId || 'bat'; } }
        }
      } else {
        Input.state.melee = true;                          // alleen melee -> vuurknop slaat ook
      }
    }
    // attack NIET resetten -> vuurknop ingedrukt houden = automatisch doorvuren (snelheid via cooldown).
    // Player.update vuurt in versus niet zelf (gegated), dus geen dubbel schot.
  },

  // kanonskogel: vliegt hard naar de tegenstander (homing -> mist nooit), enorme knockback
  spawnCannon(p, homing) {
    const dir = p.dir;
    const bl = new Bullet(p.x + dir * 14, p.y - 16, dir * 8, 0, 0);
    bl.kind = 'cannon'; bl.hitDmg = 18; bl.power = 42; bl.vy = 0; bl.life = 0; bl.homing = !!homing;
    this.bullets.push(bl);
    this.spawnMuzzleFlash(p.x + dir * 14, p.y - 16, dir);
    this.shake = Math.max(this.shake, 5);
    if (window.Sfx) Sfx.play('cannon');
  },

  // AK47-kogel (Jungle): snel, rechtdoor
  spawnVersusGun(p) {
    const dir = p.dir;
    const bl = new Bullet(p.x + dir * 14, p.y - 16, dir * 9, 0, 0);
    bl.kind = 'gun'; bl.hitDmg = 13; bl.power = 7; bl.vy = 0; bl.life = 0;
    this.bullets.push(bl);
    this.spawnMuzzleFlash(p.x + dir * 14, p.y - 16, dir);
    if (window.Sfx) Sfx.play('shoot');
  },
  // geweerschot (AK47 / Desert Eagle / Kruisboog) met per-wapen-stats + eventuele terugslag
  spawnGunShot(p, g) {
    const dir = p.dir;
    const bl = new Bullet(p.x + dir * 14, p.y - 16, dir * (g.speed || 9), 0, 0);
    bl.kind = g.kind; bl.hitDmg = g.dmg; bl.power = g.power; bl.vy = 0; bl.life = 0;
    this.bullets.push(bl);
    this.spawnMuzzleFlash(p.x + dir * 14, p.y - 16, dir);
    if (g.recoil) { p.knockVx = -dir * g.recoil; p.vy = Math.min(p.vy || 0, -1.5); this.shake = Math.max(this.shake, 5); }   // Desert Eagle: terugslag
    if (window.Sfx && p === this.player) Sfx.play(g.kind === 'arrow' ? 'shoot' : 'gun');
  },

  spawnVersusProjectile(shooter, kind) {
    const dir = shooter.dir;
    const speed = kind === 'rocket' ? 6 : (kind === 'star' ? 11 : 7.5);   // ster vliegt snel
    const bl = new Bullet(shooter.x + dir * 14, shooter.y - 16, dir * speed, 0, 0);
    bl.kind = kind;
    if (kind === 'fire') { bl.hitDmg = 22; bl.power = 14; }
    else if (kind === 'star') { bl.hitDmg = SMASH_STAR_DMG; bl.power = 10; bl.spin = 0; }   // veel schade, weinig knockback
    else { bl.hitDmg = 40; bl.power = 26; }
    this.bullets.push(bl);
    if (kind === 'fire') this.spawnFireCast(shooter, shooter.x + dir * 14, shooter.y - 16, dir);   // vuur uit de hand
    else this.spawnMuzzleFlash(shooter.x + dir * 14, shooter.y - 16, dir);
    if (window.Sfx && shooter === this.player) Sfx.play(kind === 'rocket' ? 'rocket' : (kind === 'star' ? 'shoot' : 'fireball'));
  },

  // ===== Journey-eiland-powerups =====
  spawnCoco(p) {                                   // kokosbom: lobt in een boog
    const dir = p.dir, bl = new Bullet(p.x + dir * 12, p.y - 18, dir * 4.6, 0, 0);
    bl.kind = 'coco'; bl.hitDmg = 8; bl.power = COCO_KNOCK; bl.vy = -5.2; bl.life = 0; bl._grav = true; bl._aoe = true;
    this.bullets.push(bl); this.spawnMuzzleFlash(p.x + dir * 12, p.y - 16, dir);
    if (window.Sfx && p === this.player) Sfx.play('shoot');
  },
  spawnBoomerang(p) {                              // boemerang: vliegt uit en keert terug
    const dir = p.dir, bl = new Bullet(p.x + dir * 12, p.y - 16, dir * 7, 0, 0);
    bl.kind = 'boom'; bl.hitDmg = 7; bl.power = BOOM_KNOCK; bl.vy = 0; bl.life = 0; bl._ret = false;
    this.bullets.push(bl); this.spawnMuzzleFlash(p.x + dir * 12, p.y - 16, dir);
    if (window.Sfx && p === this.player) Sfx.play('boing');
  },
  spawnDart(p) {                                   // gifdart: snel + recht + korte verdoving
    const dir = p.dir, bl = new Bullet(p.x + dir * 14, p.y - 14, dir * 12, 0, 0);
    bl.kind = 'dart'; bl.hitDmg = 6; bl.power = DART_KNOCK; bl.vy = 0; bl.life = 0; bl._stun = DART_STUN;
    this.bullets.push(bl); this.spawnMuzzleFlash(p.x + dir * 14, p.y - 14, dir);
    if (window.Sfx && p === this.player) Sfx.play('gun');
  },
  explodeCoco(b) {
    for (let i = 0; i < 14; i++) this.particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (i % 2 ? '#caa860' : '#8a5e36'), 380, 3));
    this.shake = Math.max(this.shake, 5); if (window.Sfx) Sfx.play('explos');
    // AoE knockback op spelers binnen straal (firing-client autoritair: speler lokaal, tegenstander via hit)
    const hitR = (e, isMe) => {
      if (!e || e.dead || (isMe && e.respawnInvuln > 0)) return;
      if (Math.abs(e.x - b.x) < 34 && Math.abs((e.y - 12) - b.y) < 34) {
        const kd = e.x >= b.x ? 1 : -1;
        if (isMe) this.onVersusHit({ dir: kd, power: COCO_KNOCK, vy: -7, dmg: 8 });
        else if (this.vsBot) this.applyHitToBot(kd, COCO_KNOCK, -7, 8);
        else if (window.Net) Net.versusSend('hit', { dir: kd, power: COCO_KNOCK, vy: -7, dmg: 8 });
      }
    };
    hitR(this.player, true); hitR(this.vsBot ? this.bot : this.vs.remote, false);
    b.alive = false;
  },

  // ===== GEVECHTSHELI =====
  updateHeli(dt) {
    const p = this.player;
    const frozen = (p.stunUntil && this.time < p.stunUntil) || (p.flatUntil && this.time < p.flatUntil);
    const inp = frozen ? {} : Input.state;
    const s = HELI_SPEED * this.dtScale;
    const dx = ((inp.right && !inp.left) ? s : 0) - ((inp.left && !inp.right) ? s : 0);
    const dy = (inp.jump ? -s : 0) + (inp.duck ? s : 0);
    // botst niet door platforms heen (as voor as, anders blokkeren)
    if (dx) { if (!this.heliHits(p.x + dx, p.y)) p.x += dx; p.dir = dx > 0 ? 1 : -1; }
    if (dy) { if (!this.heliHits(p.x, p.y + dy)) p.y += dy; }
    p.vy = 0; p.knockVx = 0; p.onGround = false; p.walkPhase = 0;
    // niet uit beeld vliegen: binnen het zichtbare (gezoomde) scherm én de map houden
    const zz = this.vsCamZoom || 1, vW = CONFIG.VIEW_W / zz, vH = CONFIG.VIEW_H / zz;
    p.x = Math.max(Math.max(14, this.vsCamX + 16), Math.min(Math.min(this.vsMapW - 14, this.vsCamX + vW - 16), p.x));
    p.y = Math.max(this.vsCamY + 14, Math.min(Math.min(CONFIG.GROUND_Y - 2, this.vsCamY + vH - 12), p.y));
    // minigun (vuurknop, ingedrukt houden = doorvuren)
    if (!frozen && Input.state.attack && p.heliMinigun > 0 && this.time >= (p._heliFireCd || 0)) {
      p._heliFireCd = this.time + 80; p.heliMinigun--; this.spawnHeliBullet(p);
    }
    // raketten (meleeknop)
    if (!frozen && Input.state.melee && p.heliRockets > 0 && this.time >= (p._heliRocketCd || 0)) {
      p._heliRocketCd = this.time + 600; p.heliRockets--; this.spawnVersusProjectile(p, 'rocket'); this.shake = Math.max(this.shake, 4);
    }
    if (p.heliMinigun <= 0 && p.heliRockets <= 0) this.endHeli(p);   // alles op -> uitstappen
  },
  spawnHeliBullet(p) {
    const dir = p.dir;
    const bl = new Bullet(p.x + dir * 18, p.y - 10 + (Math.random() - 0.5) * 3, dir * 10, 0, 0);
    bl.kind = 'gun'; bl.hitDmg = 7; bl.power = 5; bl.vy = 0; bl.life = 0;
    this.bullets.push(bl);
    this.spawnMuzzleFlash(p.x + dir * 18, p.y - 10, dir);
    if (window.Sfx) Sfx.play('shoot');
  },
  // botst de heli (box rond p) tegen een platform?
  heliHits(x, y) {
    const hw = 16, htop = 28, hbot = 2;
    for (const pf of this.platforms) {
      if (pf.mast) continue;
      const pl = pf.x - pf.w / 2, pr = pf.x + pf.w / 2, pt = pf.y - 2, pb = pf.y + 12;
      if (x + hw > pl && x - hw < pr && y + hbot > pt && y - htop < pb) return true;
    }
    return false;
  },
  // sterke homing (mist nooit) — voor raket/vuurbal die gericht op een heli wordt afgevuurd
  _homeBullet(b, tx, ty, sp) {
    const ang = Math.atan2(ty - b.y, tx - b.x);
    b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
  },
  endHeli(p) {
    p.heli = false; p.heliMinigun = 0; p.heliRockets = 0;
    p.vy = 0; p.weaponId = p.meleeId || 'bat';
    for (let i = 0; i < 10; i++) this.particles.push(new Particle(p.x, p.y - 8, (Math.random() - 0.5) * 3, -Math.random() * 2, '#888', 320, 2));
  },
  drawHeli(ctx, cx, fy, dir, pal) {
    const t = this.time, f = dir, by = fy - 24;
    const green = '#3f5a3a', greenDk = '#26371f', glass = '#a8dcff', metal = '#7a7a7a', skin = (pal && pal.skin) || '#e8b98a';
    const P = (c, x, y, w, h) => Sprites.px(ctx, c, Math.round(x), Math.round(y), w, h);
    // staartboom + staartrotor (achterkant = tegengesteld aan dir)
    P(green, cx - f * 26, by + 4, 26, 4); P(greenDk, cx - f * 26, by + 6, 26, 2);
    const tr = 5 + Math.round(Math.abs(Math.sin(t / 28)) * 5);
    P(metal, cx - f * 27, by + 3 - (tr - 5), 2, tr); P(metal, cx - f * 27, by + 5, 2, tr);
    // romp
    P(greenDk, cx - 14, by, 28, 15); P(green, cx - 13, by + 1, 26, 4); P(green, cx - 13, by + 3, 25, 9);
    // cockpit-glas + piloot (voorkant = dir-kant)
    P(glass, cx + f * 4, by + 3, 9, 8); P(skin, cx + f * 6, by + 4, 4, 4); P('#1a1a1a', cx + f * (f > 0 ? 8 : 6), by + 5, 1, 2);
    // skids
    P(metal, cx - 13, by + 16, 26, 2); P(metal, cx - 10, by + 15, 2, 2); P(metal, cx + 8, by + 15, 2, 2);
    // hoofdrotor (draait: brede lijn die van breedte wisselt)
    P(metal, cx - 1, by - 3, 2, 3);
    const rw = 16 + Math.round(Math.sin(t / 26) * 9);
    P('#cfd6df', cx - rw, by - 4, rw * 2, 2);
    // minigun onder de neus
    P('#2a2a2a', cx + f * 12, by + 9, f * 6, 2);
  },

  // ===== BEACH: getij (vloed) =====
  beachWaterY() {
    const v = this.tide; if (!v) return 9999;
    return 164 - v.level * 22;   // lager water: laag ~164, vol ~142 (strand op y150)
  },
  _tidePhase(s) {
    const v = this.tide; v.state = s;
    if (s === 'rising') v.nextAt = this.time + BEACH_RISE;
    else if (s === 'flood') { v.nextAt = this.time + BEACH_FLOOD; v._sloshAt = this.time + BEACH_SLOSH; }
    else if (s === 'recede') v.nextAt = this.time + BEACH_RECEDE;
    else v.nextAt = this.time + BEACH_TIDE_EVERY;
  },
  onVersusTide(p) { if (!this.tide || !p) return; if (p.dir != null) this.tide.dir = p.dir; if (p.ph) this._tidePhase(p.ph); },
  updateTide(dt) {
    const v = this.tide; if (!v) return;
    if (this.vsBot || this.vs.role === 'host') {
      const adv = (cur, nx) => { if (v.state === cur && this.time >= v.nextAt) { this._tidePhase(nx); if (window.Net && !this.vsBot) Net.versusSend('tide', { ph: nx, dir: v.dir }); return true; } return false; };
      adv('idle', 'rising') || adv('rising', 'flood') || adv('flood', 'recede') || adv('recede', 'idle');
      if (v.state === 'flood' && this.time >= v._sloshAt) { v.dir = -v.dir; v._sloshAt = this.time + BEACH_SLOSH; if (window.Net && !this.vsBot) Net.versusSend('tide', { ph: 'flood', dir: v.dir }); }
    } else if ((v.state === 'rising' || v.state === 'flood' || v.state === 'recede') && this.time >= v.nextAt + 900) {
      this._tidePhase(v.state === 'recede' ? 'idle' : (v.state === 'flood' ? 'recede' : 'flood'));   // gast-vangnet
    }
    // niveau animeren naar het doel van de fase
    const target = (v.state === 'rising' || v.state === 'flood') ? 1 : 0;
    const rate = (v.state === 'rising') ? (dt / BEACH_RISE) : (v.state === 'recede') ? (dt / BEACH_RECEDE) : (dt / 500);
    v.level += (target - v.level) * Math.min(1, rate * 3.2);
    v.level = Math.max(0, Math.min(1, v.level));
    // golven nemen je mee als je in het water staat
    const surf = this.beachWaterY();
    const carry = (e) => {
      if (!e || e.dead) return;
      if (e.y >= surf - 2 && v.level > 0.25) {
        e.x += v.dir * BEACH_CARRY * this.dtScale;
        if (this.time >= (e._splashAt || 0)) { e._splashAt = this.time + 220; this.beachFx.push({ x: e.x + (Math.random() - 0.5) * 10, y: surf, life: 360 }); }
      }
    };
    carry(this.player); if (this.vsBot) carry(this.bot);
    for (const s of this.beachFx) s.life -= dt; this.beachFx = this.beachFx.filter((s) => s.life > 0);
  },

  // ===== BEACH: strandbal =====
  spawnBall(shooter, owner) {
    const dir = shooter.dir;
    this.ball = { mine: owner === 'me', owner, x: shooter.x + dir * 14, y: shooter.y - 16, vx: dir * 5.5, vy: -3, born: this.time, _cd: 0, _net: 0, grace: this.time + 250 };
    if (window.Sfx) Sfx.play('boing');
    if (owner === 'me' && window.Net && !this.vsBot) Net.versusSend('ball', { x: Math.round(this.ball.x), y: Math.round(this.ball.y), vx: +this.ball.vx.toFixed(2), vy: +this.ball.vy.toFixed(2) });
  },
  onVersusBall(p) {
    if (!p) return;
    if (!this.ball) { this.ball = { mine: false, owner: 'foe', born: this.time, grace: this.time }; if (window.Sfx) Sfx.play('boing'); }
    this.ball.mine = false; this.ball.x = p.x; this.ball.y = p.y; this.ball.vx = p.vx; this.ball.vy = p.vy;
  },
  explodeBall() {
    const b = this.ball; if (!b) return;
    for (let i = 0; i < 16; i++) this.particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 4.5, (Math.random() - 0.5) * 4.5, (i % 2 ? '#ff5a3a' : '#ffd24a'), 420, 3));
    this.shake = Math.max(this.shake, 6);
    if (window.Sfx) Sfx.play('explos');
    this.ball = null;
  },
  updateBall(dt) {
    const b = this.ball; if (!b) return;
    if (this.time - b.born > BALL_LIFE) { this.explodeBall(); return; }   // 15s -> ontploft
    const sim = b.mine || this.vsBot;                                     // online: alleen de eigenaar simuleert
    if (!sim) return;
    const sc = this.dtScale;
    b.vy += 0.4 * sc; b.x += b.vx * sc; b.y += b.vy * sc;
    if (b.x < 10) { b.x = 10; b.vx = Math.abs(b.vx) * 0.92; }
    if (b.x > this.vsMapW - 10) { b.x = this.vsMapW - 10; b.vx = -Math.abs(b.vx) * 0.92; }
    for (const pf of this.platforms) {
      if (pf.mast) continue;
      if (b.x > pf.x - pf.w / 2 - 6 && b.x < pf.x + pf.w / 2 + 6 && b.y > pf.y - 9 && b.y < pf.y + 7 && b.vy > 0) {
        b.y = pf.y - 9; b.vy = -Math.abs(b.vy) * 0.8; if (Math.abs(b.vy) < 2.2) b.vy = -4.5; b.vx *= 0.99;
      }
    }
    if (b.y > CONFIG.GROUND_Y - 2 && b.vy > 0) { b.y = CONFIG.GROUND_Y - 2; b.vy = -Math.abs(b.vy) * 0.8; }
    // treffers (na grace): beide spelers kunnen geraakt worden -> harde knockback
    if (this.time >= b.grace && this.time >= (b._cd || 0)) {
      const tryHit = (e, isMe) => {
        if (!e || e.dead || (isMe && e.respawnInvuln > 0)) return false;
        if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - (e.y - 14)) < 20) {
          const kd = b.x >= e.x ? 1 : -1;
          if (isMe) this.onVersusHit({ dir: kd, power: BALL_KNOCK, vy: -7, dmg: 6 });
          else if (this.vsBot) this.applyHitToBot(kd, BALL_KNOCK, -7, 6);
          else if (window.Net) Net.versusSend('hit', { dir: kd, power: BALL_KNOCK, vy: -7, dmg: 6 });
          b.vx = kd * Math.max(4.5, Math.abs(b.vx)); b.vy = -5; b._cd = this.time + 400;
          this.shake = Math.max(this.shake, 5);
          return true;
        }
        return false;
      };
      tryHit(this.player, true);
      tryHit(this.vsBot ? this.bot : this.vs.remote, false);
    }
    if (b.mine && !this.vsBot && window.Net) { b._net = (b._net || 0) + dt; if (b._net >= 70) { b._net = 0; Net.versusSend('ball', { x: Math.round(b.x), y: Math.round(b.y), vx: +b.vx.toFixed(2), vy: +b.vy.toFixed(2) }); } }
  },
  drawBall(ctx) {
    const b = this.ball; if (!b) return;
    const x = Math.round(b.x), y = Math.round(b.y), spin = Math.floor(this.time / 90) % 2;
    Sprites.px(ctx, '#ffffff', x - 5, y - 5, 10, 10);
    Sprites.px(ctx, '#e8483b', x - 5, y - 5, 10, 3);
    Sprites.px(ctx, '#3aa0e0', x - 5, y + 2, 10, 3);
    Sprites.px(ctx, '#f2c94c', x + (spin ? -2 : 0), y - 5, 2, 10);
    Sprites.px(ctx, '#2a8a3a', x + (spin ? 1 : 3), y - 5, 2, 10);
  },
  drawTideWater(ctx) {
    const v = this.tide; if (!v || v.level < 0.02) return;
    const W = this.vsMapW, surf = this.beachWaterY(), t = this.time;
    ctx.globalAlpha = 0.42; ctx.fillStyle = '#2f86c0';
    ctx.fillRect(0, surf, W, CONFIG.GROUND_Y + 60 - surf);
    ctx.globalAlpha = 0.6;
    for (let x = 0; x < W; x += 8) { const wob = Math.round(Math.sin(t / 180 + x * 0.12) * 2); Sprites.px(ctx, '#bfe6f5', x, surf - 1 + wob, 6, 2); }
    ctx.globalAlpha = 1;
    for (const s of this.beachFx) { ctx.globalAlpha = Math.max(0, s.life / 360); Sprites.px(ctx, '#eaffff', Math.round(s.x) - 2, Math.round(s.y) - 4, 4, 4); }
    ctx.globalAlpha = 1;
  },
  drawBeachBg(ctx) {
    const W = this.vsMapW, gy = CONFIG.GROUND_Y, t = this.time;
    // zon
    ctx.fillStyle = '#ffe79a'; ctx.beginPath(); ctx.arc(W - 52, 34, 15, 0, Math.PI * 2); ctx.fill();
    // vogels in de lucht (kleine bewegende V'tjes)
    ctx.strokeStyle = '#34506a'; ctx.lineWidth = 1.4;
    for (let k = 0; k < 4; k++) {
      const bx = ((k * 110 + t * 0.018) % (W + 60)) - 30, by = 26 + (k % 2) * 18 + Math.sin(t / 260 + k) * 2, fl = 3 + Math.sin(t / 90 + k) * 1.5;
      ctx.beginPath(); ctx.moveTo(bx - 5, by + fl); ctx.lineTo(bx, by); ctx.lineTo(bx + 5, by + fl); ctx.stroke();
    }
    // zee (lager: horizon net onder de strand-hoogte)
    const horizon = gy - 8;
    ctx.fillStyle = '#3f9fd0'; ctx.fillRect(0, horizon, W, gy + 70 - horizon);
    ctx.fillStyle = '#56b0dd'; ctx.fillRect(0, horizon, W, 5);
    // eilandjes in de verte (op de horizon, achter de grond)
    const island = (ix, iw, ih) => {
      ctx.fillStyle = '#caa860'; ctx.beginPath(); ctx.moveTo(ix - iw, horizon + 1); ctx.quadraticCurveTo(ix, horizon - ih, ix + iw, horizon + 1); ctx.fill();
      ctx.fillStyle = '#3a7a4a'; ctx.beginPath(); ctx.moveTo(ix - iw * 0.55, horizon - ih * 0.35); ctx.quadraticCurveTo(ix, horizon - ih, ix + iw * 0.55, horizon - ih * 0.35); ctx.fill();
      Sprites.px(ctx, '#6b4a2a', ix - 1, horizon - ih - 4, 2, 5);              // palmstam
      Sprites.px(ctx, '#3a8a4a', ix - 5, horizon - ih - 6, 11, 3);            // palmblad
    };
    island(64, 22, 13); island(196, 28, 17); island(300, 20, 11);
    // bewegende golflijnen op de zee
    for (let r = 0; r < 3; r++) {
      ctx.globalAlpha = 0.45 - r * 0.1;
      for (let x = -8; x < W + 8; x += 16) { const wob = Math.round(Math.sin(t / 300 + x * 0.08 + r) * 2); Sprites.px(ctx, '#cdeaf7', x + ((t * (0.2 + r * 0.1)) % 16), horizon + 6 + r * 6 + wob, 8, 2); }
    }
    ctx.globalAlpha = 1;
  },

  updateSmash(dt) {
    const p = this.player;
    if (p._weaponUntil && this.time > p._weaponUntil) { p.meleeId = p.baseMelee || 'bat'; p.weaponId = p.rangedId || p.meleeId; p._weaponUntil = 0; p.swingWeapon = null; }
    // drops spawnen: host (online) of lokaal (bot)
    if (this.vsBot || this.vs.role === 'host') {
      this._dropTimer -= dt;
      if (this._dropTimer <= 0 && this.drops.length < 3) { this._dropTimer = SMASH_DROP_EVERY; this.spawnDrop(); }
    }
    // eigen speler pakt op (niet tijdens het vliegen in de heli)
    for (const d of this.drops) {
      if (d.taken || this.player.heli) continue;
      if (Math.abs(this.player.x - d.x) < 16 && Math.abs((this.player.y - 12) - d.y) < 22) {
        d.taken = true; this.applyDrop(this.player, d);
        if (window.Net && !this.vsBot) Net.versusSend('pickup', { id: d.id });
      }
    }
    if (this.nuke) this._updateNuke();      // nuke-afteltimer -> detonatie
    // bot pakt op + wapen-timer
    if (this.vsBot && this.bot && !this.bot.dead) {
      for (const d of this.drops) {
        if (d.taken || d.kind === 'giant' || d.kind === 'heli' || d.kind === 'beachball' || d.kind === 'coco' || d.kind === 'boom' || d.kind === 'dart') continue;   // bot gebruikt deze niet
        if (Math.abs(this.bot.x - d.x) < 16 && Math.abs((this.bot.y - 12) - d.y) < 22) { d.taken = true; this.applyDrop(this.bot, d); }
      }
      if (this.bot._weaponUntil && this.time > this.bot._weaponUntil) { this.bot.meleeId = this.bot.baseMelee || 'bat'; this.bot.weaponId = this.bot.rangedId || this.bot.meleeId; this.bot._weaponUntil = 0; this.bot.swingWeapon = null; }
    }
    this.drops = this.drops.filter((d) => !d.taken && this.time - d.born < (d.kind === 'dragon' ? SMASH_DRAGON_LIFE : 16000));

    // ----- portalen: af en toe een paar dat je naar de overkant teleporteert (niet op maps met noPortals) -----
    if (!this.portals) this.portals = [];
    if ((this.vsBot || this.vs.role === 'host') && !(this.vsMap && this.vsMap.noPortals)) {
      this._portalTimer -= dt;
      if (this._portalTimer <= 0 && this.portals.length === 0) { this._portalTimer = SMASH_PORTAL_EVERY * ((this.vsMap && this.vsMap.portalMul) || 1); this.spawnPortal(); }
    }
    this.checkPortal(this.player);
    if (this.vsBot && this.bot && !this.bot.dead) this.checkPortal(this.bot);
    this.portals = this.portals.filter((pt) => this.time - pt.born < SMASH_PORTAL_LIFE);
    // ----- tempel-deuren: loop erin -> teleporteer naar het gekoppelde platform -----
    if (this.vsMap && this.vsMap.doors) {
      this.checkDoor(this.player);
      if (this.vsBot && this.bot && !this.bot.dead) this.checkDoor(this.bot);
    }
    if (this.traps && this.traps.length) this.updateTraps();   // Tempelbewaker-vallen: sta erop -> vast

    // draken (drakenei-powerup)
    this.updateDragons(dt);
    // vallende stenen (steen-powerup, alleen Cave)
    this.updateRocks(dt);
  },

  // roep een draak op die de tegenstander 10s lang met vuur bestookt
  spawnDragon(owner) {
    this.dragons = this.dragons || [];
    this.dragons = this.dragons.filter((d) => d.owner !== owner);   // max 1 per eigenaar
    this._dragonUsed = true;                                          // max 1 draak per match
    const W = CONFIG.VIEW_W;
    this.dragons.push({ owner, until: this.time + DRAGON_DUR, x: owner === 'me' ? -36 : W + 36, dir: owner === 'me' ? 1 : -1, nextSpit: this.time + 500, beam: null });
  },

  updateDragons(dt) {
    if (!this.dragons || !this.dragons.length) return;
    const W = CONFIG.VIEW_W;
    for (const d of this.dragons) {
      d.x += d.dir * 1.0 * this.dtScale;                            // heen en weer bovenin
      if (d.x > W + 36) d.dir = -1; else if (d.x < -36) d.dir = 1;
      if (this.time >= d.nextSpit) { d.nextSpit = this.time + DRAGON_SPIT_MS; this.dragonSpit(d); }
      if (d.beam && this.time > d.beam.until) d.beam = null;
    }
    this.dragons = this.dragons.filter((d) => this.time < d.until);
  },

  // een vuurstraal naar het doelwit + schade
  dragonSpit(d) {
    let wx = null, wy = null;
    const dmg = DRAGON_DMG;
    if (d.owner === 'me') {
      if (this.vsBot) {
        const b = this.bot; if (!b || b.dead) return;
        wx = b.x; wy = b.y;
        this.applyHitToBot(b.x >= this.player.x ? 1 : -1, 8, -4, dmg);
        if (b.respawnInvuln <= 0) b.burnUntil = this.time + SMASH_FIRE_BURN;   // draak-beam brandt korter
      } else {
        const r = this.vs.remote; if (!r || !r.alive) return;
        wx = r.x; wy = r.y;
        if (window.Net) { Net.versusSend('hit', { dir: (r.x >= this.player.x ? 1 : -1), power: 8, vy: -4, dmg }); Net.versusSend('burn', {}); }
      }
    } else if (d.owner === 'bot') {
      const p = this.player; wx = p.x; wy = p.y;
      if (!p.dead && p.respawnInvuln <= 0) { this.onVersusHit({ dir: (p.x >= this.bot.x ? 1 : -1), power: 8, vy: -4, dmg }); p.burnUntil = this.time + SMASH_FIRE_BURN; }   // draak-beam brandt korter
    } else {                                                        // 'foe': alleen visueel (echte schade komt via 'hit' van de eigenaar)
      const p = this.player; wx = p.x; wy = p.y;
    }
    if (wx == null) return;
    d.beam = { until: this.time + 320, wx, wy };
    if (window.Sfx) Sfx.play('dragonfire');
    for (let i = 0; i < 10; i++)
      this.particles.push(new Particle(wx + (Math.random() - 0.5) * 10, wy - 12 + (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 1.5, -Math.random() * 1.2, Math.random() < 0.5 ? '#ff7a2a' : '#ffd24a', 320, 2));
    this.shake = Math.max(this.shake, 4);
  },

  onVersusDragon() { this.spawnDragon('foe'); },

  // ---- CAVE: sfeer (bats/druppels) + knoppen + muur ----
  updateCave(dt) {
    const mapW = this.vsMapW;
    // vleermuizen
    if (!this.caveBats.length) for (let i = 0; i < 5; i++)
      this.caveBats.push({ x: Math.random() * mapW, y: -10 + Math.random() * 70, vx: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6), ph: Math.random() * 6 });
    for (const bt of this.caveBats) { bt.x += bt.vx * this.dtScale; bt.ph += dt * 0.02; bt.y += Math.sin(bt.ph) * 0.4; if (bt.x < -14) bt.x = mapW + 14; else if (bt.x > mapW + 14) bt.x = -14; }
    // waterdruppels
    if (Math.random() < 0.04) this.caveDrips.push({ x: Math.random() * mapW, y: -16 + Math.random() * 24, vy: 0 });
    for (const dr of this.caveDrips) { dr.vy += 0.25 * this.dtScale; dr.y += dr.vy * this.dtScale; }
    this.caveDrips = this.caveDrips.filter((dr) => dr.y < this.vsFallY);

    // knop scherp maken (host/lokaal)
    if ((this.vsBot || this.vs.role === 'host') && this.caveArmed < 0 && !this.caveWall && this.time >= this._caveArmAt) {
      this.caveArmed = Math.floor(Math.random() * this.caveButtons.length);
      if (window.Net && !this.vsBot) Net.versusSend('cavearm', { idx: this.caveArmed });
    }
    // knop indrukken
    if (this.caveArmed >= 0) {
      const b = this.caveButtons[this.caveArmed];
      const near = (e) => e && !e.dead && Math.abs(e.x - b.x) < 13 && Math.abs(e.y - b.y) < 16;
      if (near(this.player)) this.pressCaveButton(true);
      else if (this.vsBot && near(this.bot)) this.pressCaveButton(false);
    }
    // straal sweept over de map: raakt 'ie je -> schade + harde knockback (presser is veilig)
    if (this.caveWall) {
      const wl = this.caveWall;
      wl.x += CAVE_WALL_SPEED * this.dtScale;
      const safe = (e) => e._beamSafeUntil && this.time < e._beamSafeUntil;
      const hitIt = (e) => e && !e.dead && e.respawnInvuln <= 0 && !safe(e) && Math.abs(wl.x - e.x) < 11;
      if (!wl.hitP && hitIt(this.player)) {
        wl.hitP = true;
        this.onVersusHit({ dir: (this.player.x >= wl.x ? 1 : -1), power: CAVE_BEAM_KNOCK, vy: -7, dmg: 0 });   // alleen knockback, geen schade
      }
      if (this.vsBot && !wl.hitB && hitIt(this.bot)) {
        wl.hitB = true;
        this.applyHitToBot(this.bot.x >= wl.x ? 1 : -1, CAVE_BEAM_KNOCK, -7, 0);
      }
      if (wl.x > mapW + 30) this.caveWall = null;
    }
  },

  pressCaveButton(byPlayer) {
    if (this.caveArmed < 0) return;
    (byPlayer ? this.player : this.bot)._beamSafeUntil = this.time + 2200;   // de presser zelf is veilig
    this.triggerCaveWall();
    if (window.Net && !this.vsBot && byPlayer) Net.versusSend('cavewall', {});
  },
  triggerCaveWall() {
    this.caveWall = { x: -30, hitP: false, hitB: false };
    this.caveArmed = -1;
    this._caveArmAt = this.time + CAVE_ARM_MS;
    this.shake = Math.max(this.shake, 5);
    if (window.Sfx) Sfx.play('beam');
  },
  onCaveArm(p) { if (!this.caveWall) this.caveArmed = (p && typeof p.idx === 'number') ? p.idx : -1; },
  onCaveWall() { this.triggerCaveWall(); },

  // bliksem-effect op een doel (wereldpositie)
  strikeLightning(wx, wy) {
    this.lightningFx = { wx, wy, until: this.time + 450 };
    if (window.Sfx) Sfx.play('zap');
    for (let i = 0; i < 14; i++) this.particles.push(new Particle(wx + (Math.random() - 0.5) * 12, wy - 14 + (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 2, -Math.random() * 1.5, Math.random() < 0.5 ? '#9fe0ff' : '#4aa6ff', 360, 2));
    this.shake = Math.max(this.shake, 7);
  },
  // de tegenstander stunde MIJ (online) -> mezelf stunnen + bliksem tonen
  onVersusStun() {
    if (this.player.respawnInvuln <= 0 && !this.player.dead) this.player.stunUntil = this.time + SMASH_LIGHTNING_STUN;
    this.strikeLightning(this.player.x, this.player.y);
  },

  // ---- VULCAN: lavastraal + sfeer ----
  updateVulcan(dt) {
    const v = this.vulcan; if (!v) return;
    const mapW = this.vsMapW;
    // rook (stijgt op)
    if (Math.random() < 0.06) this.vulcanSmoke.push({ x: Math.random() * mapW, y: this.vsFallY - 6, vy: -(0.3 + Math.random() * 0.5), life: 2600 });
    for (const s of this.vulcanSmoke) { s.x += 0.2 * this.dtScale; s.y += s.vy * this.dtScale; s.life -= dt; }
    this.vulcanSmoke = this.vulcanSmoke.filter((s) => s.life > 0);
    // achtergrond-uitbarstingen (kleine lavaspatten ver weg)
    if (Math.random() < 0.014) this.vulcanBg.push({ x: 60 + Math.random() * (mapW - 120), y: this.vsFallY - 24, vy: -(1.6 + Math.random() * 1.6), life: 950 });
    for (const b of this.vulcanBg) { b.vy += 0.06 * this.dtScale; b.y += b.vy * this.dtScale; b.life -= dt; }
    this.vulcanBg = this.vulcanBg.filter((b) => b.life > 0);

    // toestand: host/lokaal stuurt, gast krijgt 'lava'
    if (this.vsBot || this.vs.role === 'host') {
      if (v.state === 'idle' && this.time >= v.nextAt) { this._vulcanPhase('bubble'); if (window.Net && !this.vsBot) Net.versusSend('lava', { ph: 'bubble' }); }
      else if (v.state === 'bubble' && this.time >= v.nextAt) { this._vulcanPhase('erupt'); if (window.Net && !this.vsBot) Net.versusSend('lava', { ph: 'erupt' }); }
      else if (v.state === 'erupt' && this.time >= v.nextAt) { this._vulcanPhase('idle'); if (window.Net && !this.vsBot) Net.versusSend('lava', { ph: 'idle' }); }
    } else if ((v.state === 'bubble' || v.state === 'erupt') && this.time >= v.nextAt + 600) {
      this._vulcanPhase('idle');     // gast-vangnet: trek de straal zelf in als de 'idle' niet aankwam
    }
    // lavastraal raakt spelers in de kolom -> hoog gelanceerd + 3s burn
    if (v.state === 'erupt') {
      const inJet = (e) => e && !e.dead && e.respawnInvuln <= 0 && Math.abs(e.x - v.x) < 18;
      if (!v.hitP && inJet(this.player)) { v.hitP = true; this.player.vy = -18; this.player.onGround = false; this.player.burnUntil = this.time + 3000; this.shake = Math.max(this.shake, 8); }
      if (this.vsBot && !v.hitB && inJet(this.bot)) { v.hitB = true; this.bot.vy = -18; this.bot.onGround = false; this.bot.burnUntil = this.time + 3000; }
      // vonken
      if (this.particles.length < 240) for (let i = 0; i < 2; i++) this.particles.push(new Particle(v.x + (Math.random() - 0.5) * 14, this.vsFallY - Math.random() * 120, (Math.random() - 0.5) * 1.2, -2 - Math.random() * 2, Math.random() < 0.5 ? '#ff7a2a' : '#ffd24a', 360, 2));
    }
  },
  _vulcanPhase(state) {
    const v = this.vulcan; v.state = state;
    if (state === 'bubble') v.nextAt = this.time + VULCAN_BUBBLE;
    else if (state === 'erupt') { v.nextAt = this.time + VULCAN_ERUPT; v.hitP = false; v.hitB = false; this.shake = Math.max(this.shake, 6); if (window.Sfx) Sfx.play('lava'); }
    else v.nextAt = this.time + VULCAN_EVERY;
  },
  onVersusLava(p) { if (this.vulcan && p && p.ph) this._vulcanPhase(p.ph); },

  // ---- PIRATE: zeemonster-tentakel ----
  updatePirate(dt) {
    const v = this.tentacle; if (!v) return;
    const W = this.vsMapW;
    if (this.vsBot || this.vs.role === 'host') {
      if (v.state === 'idle' && this.time >= v.nextAt) {
        const target = (Math.random() < 0.5) ? this.player : (this.vsBot ? this.bot : this.vs.remote);
        v.x = Math.max(70, Math.min(W - 70, Math.round(((target && target.x) || 360) + (Math.random() - 0.5) * 40)));
        v.mode = Math.random() < 0.5 ? 'flat' : 'knock';
        this._tentPhase('warn');
        if (window.Net && !this.vsBot) Net.versusSend('tentacle', { x: v.x, mode: v.mode, ph: 'warn' });
      } else if (v.state === 'warn' && this.time >= v.nextAt) {
        this._tentPhase('strike');
        if (window.Net && !this.vsBot) Net.versusSend('tentacle', { x: v.x, mode: v.mode, ph: 'strike' });
      } else if (v.state === 'strike' && this.time >= v.nextAt) { this._tentPhase('idle'); if (window.Net && !this.vsBot) Net.versusSend('tentacle', { ph: 'idle' }); }
    } else if ((v.state === 'warn' || v.state === 'strike') && this.time >= v.nextAt + 600) {
      this._tentPhase('idle');         // gast-vangnet: trek de tentakel zelf in als de 'idle' niet aankwam
    }
    if (v.state === 'strike') {
      const hit = (e) => e && !e.dead && e.respawnInvuln <= 0 && Math.abs(e.x - v.x) < 22;
      if (!v.hitP && hit(this.player)) { v.hitP = true; this._tentHit(this.player); }
      if (this.vsBot && !v.hitB && hit(this.bot)) { v.hitB = true; this._tentHit(this.bot); }
    }
  },
  _tentPhase(state) {
    const v = this.tentacle; v.state = state;
    if (state === 'warn') v.nextAt = this.time + PIRATE_TENT_WARN;
    else if (state === 'strike') { v.nextAt = this.time + PIRATE_TENT_STRIKE; v.hitP = false; v.hitB = false; this.shake = Math.max(this.shake, 6); if (window.Sfx) Sfx.play('monster'); }
    else v.nextAt = this.time + PIRATE_TENT_EVERY;
  },
  _tentHit(e) {
    if (this.tentacle.mode === 'flat') { e.flatUntil = this.time + SMASH_ROCK_FLAT; }     // platgeslagen (2s)
    else { const dir = e.x < this.tentacle.x ? -1 : 1; e.knockVx = dir * 30; e.vy = -7; e.onGround = false; }   // van de boot af
    this.shake = Math.max(this.shake, 8);
    for (let i = 0; i < 12; i++) this.particles.push(new Particle(e.x, e.y - 12, (Math.random() - 0.5) * 3, -Math.random() * 2, Math.random() < 0.5 ? '#3aa86a' : '#7fe0a0', 340, 2));
  },
  onVersusTentacle(p) {
    if (!this.tentacle || !p) return;
    if (p.x != null) this.tentacle.x = p.x;
    if (p.mode) this.tentacle.mode = p.mode;
    if (p.ph) this._tentPhase(p.ph);
  },

  // ---- JUNGLE: wilde aap in het midden (springt af en toe omhoog en mept je van de map) ----
  updateJungleApe(dt) {
    const a = this.jungleApe; if (!a) return;
    const dts = Math.min(3, dt / 16.6667);
    // host (of bot-potje) bepaalt WANNEER de aap springt en deelt dat
    if (this.vsBot || this.vs.role === 'host') {
      if (a.state === 'idle' && this.time >= a.nextAt) {
        a.state = 'jump'; a.vy = APE_JUMP_VY; a.hitP = false; a.hitB = false;
        this.shake = Math.max(this.shake, 4); if (window.Sfx) Sfx.play('gorilla');
        if (window.Net && !this.vsBot) Net.versusSend('ape', { ph: 'jump', x: a.x });
      }
    }
    // fysica draait op elke client zodat de sprong vloeiend is
    if (a.state === 'jump') {
      a.vy += APE_GRAV * dts; a.y += a.vy * dts;
      if (a.y >= a.floorY) { a.y = a.floorY; a.vy = 0; a.state = 'idle'; a.nextAt = this.time + APE_JUMP_EVERY; }
    }
    // raak-detectie: elke client op zijn eigen speler; het bot-potje ook op de bot
    const airborne = a.state === 'jump';
    const overlaps = (e) => e && !e.dead && e.respawnInvuln <= 0 && Math.abs(e.x - a.x) < 30 && Math.abs(e.y - a.y) < 34;
    if (airborne && !a.hitP && overlaps(this.player)) { a.hitP = true; this._apeSmack(this.player); }
    if (airborne && this.vsBot && !a.hitB && overlaps(this.bot)) { a.hitB = true; this._apeSmack(this.bot); }
    // host houdt de gasten op de hoogte van de positie
    if (window.Net && !this.vsBot && this.vs.role === 'host') { a._net += dt; if (a._net >= 90) { a._net = 0; Net.versusSend('ape', { y: Math.round(a.y), st: a.state, x: a.x }); } }
  },
  _apeSmack(e) {
    const dir = (e.x < this.jungleApe.x) ? -1 : 1;
    e.knockVx = dir * 30; e.vy = -7.5; e.onGround = false; e.stunUntil = this.time + 420; e.combo = 0;
    this.shake = Math.max(this.shake, 9); if (window.Sfx) Sfx.play('gorilla');
    for (let i = 0; i < 14; i++) this.particles.push(new Particle(e.x, e.y - 12, (Math.random() - 0.5) * 4, -Math.random() * 3, Math.random() < 0.5 ? '#caa06a' : '#8a5e38', 360, 2));
  },

  // ===== AIRPLANE: wolk-platforms (max 5s) + vogels vanaf de voorkant =====
  updateAirplane(dt) {
    const dts = Math.min(3, dt / 16.6667);
    // ---- wolk-platforms: sta je erop, dan zakken ze na 5s in; daarna vormen ze weer ----
    const onCloud = (e, pf) => e && !e.dead && e.onGround && Math.abs(e.x - pf.x) < pf.w / 2 + 4 && Math.abs(e.y - pf.y) < 4;
    for (const pf of this.platforms) {
      if (!pf.cloud) continue;
      if (pf.broken) { if (this.time >= pf.reformAt) { pf.broken = false; pf.standT = 0; } continue; }
      const stood = onCloud(this.player, pf) || (this.vsBot && onCloud(this.bot, pf));
      if (stood) {
        pf.standT += dt;
        if (pf.standT >= CLOUD_STAND_MS) {
          pf.broken = true; pf.reformAt = this.time + CLOUD_REFORM_MS; pf.standT = 0;
          for (let i = 0; i < 12; i++) this.particles.push(new Particle(pf.x + (Math.random() - 0.5) * pf.w, pf.y, (Math.random() - 0.5) * 2, Math.random() * 1.5, '#ffffff', 500, 3));
          if (window.Sfx) Sfx.play('jump');
        }
      } else if (pf.standT > 0) {
        pf.standT = Math.max(0, pf.standT - dt * 0.5);   // langzaam herstellen als je eraf stapt
      }
    }
    // ---- vogels: scheren vanaf de voorkant (links) naar achter (rechts) ----
    if (this.time >= this._birdAt) {
      this._birdAt = this.time + 2200 + Math.random() * 2200;
      const gy = (this.vsMap.platforms[0].y) || 178;
      const y = gy - (6 + Math.floor(Math.random() * 5) * 16);   // wisselende hoogtes: laag (springen) tot hoog (bukken)
      this.birds.push({ x: this.vsCamX - 30, y, vx: 3.2 + Math.random() * 1.6, born: this.time, hitP: false, hitB: false });
    }
    for (const b of this.birds) {
      b.x += b.vx * dts;
      const hit = (e) => e && !e.dead && e.respawnInvuln <= 0 && Math.abs(e.x - b.x) < 16 && Math.abs((e.y - 10) - b.y) < 14;
      if (!b.hitP && hit(this.player)) { b.hitP = true; this._birdHit(this.player); }
      if (!b.hitB && this.vsBot && hit(this.bot)) { b.hitB = true; this._birdHit(this.bot); }
    }
    this.birds = this.birds.filter((b) => b.x < (this.vsCamX + CONFIG.VIEW_W / (this.vsCamZoom || 1) + 40));
  },
  // ---- Jungle: stun-darts die af en toe door de map schieten (niet te vaak) ----
  updateStunDarts(dt) {
    const dts = this.dtScale;
    if (!this.darts) this.darts = [];
    if (this._dartAt && this.time >= this._dartAt) {
      this._dartAt = this.time + 5200 + Math.random() * 4800;               // ~5–10s tussen darts
      const fromLeft = Math.random() < 0.5;
      const visW = CONFIG.VIEW_W / (this.vsCamZoom || 1);
      const topY = (this.vsMap.camTop || 0) + 30, botY = (this.vsMap.fallY || 240) - 30;
      const y = Math.round(topY + Math.random() * Math.max(20, botY - topY));
      const sp = 4.4 + Math.random() * 1.8;
      const x = fromLeft ? (this.vsCamX - 30) : (this.vsCamX + visW + 30);
      this.darts.push({ x, y, vx: fromLeft ? sp : -sp, born: this.time, hitP: false, hitB: false });
    }
    for (const d of this.darts) {
      d.x += d.vx * dts;
      const hit = (e) => e && !e.dead && e.respawnInvuln <= 0 && Math.abs(e.x - d.x) < 12 && Math.abs((e.y - 12) - d.y) < 12;
      if (!d.hitP && hit(this.player)) { d.hitP = true; this._dartHit(this.player, d); }
      if (!d.hitB && this.vsBot && hit(this.bot)) { d.hitB = true; this._dartHit(this.bot, d); }
    }
    const visW = CONFIG.VIEW_W / (this.vsCamZoom || 1);
    this.darts = this.darts.filter((d) => d.x > this.vsCamX - 60 && d.x < this.vsCamX + visW + 60 && !(d.hitP && (!this.vsBot || d.hitB)));
  },
  // stun-dart raakt je -> korte verdoving + klein duwtje mee
  _dartHit(e, d) {
    e.stunUntil = this.time + 1000; e.combo = 0; e.knockVx = (d.vx > 0 ? 1 : -1) * 6;
    this.shake = Math.max(this.shake, 4); if (window.Sfx) Sfx.play('zap');
    for (let i = 0; i < 8; i++) this.particles.push(new Particle(e.x, e.y - 12, (Math.random() - 0.5) * 2.5, -Math.random() * 2, i % 2 ? '#8fd0ff' : '#b06bff', 320, 2));
    if (e === this.player) this.hurtFlash = Math.max(this.hurtFlash, 120);
  },
  drawStunDart(ctx, d) {
    const x = Math.round(d.x), y = Math.round(d.y), dir = d.vx > 0 ? 1 : -1;
    ctx.globalAlpha = 0.35; Sprites.px(ctx, '#8fd0ff', x - dir * 9, y, 18, 1); ctx.globalAlpha = 1;   // spoor
    Sprites.px(ctx, '#6b4a2a', x - dir * 6, y, 10, 2);                                                // schacht
    Sprites.px(ctx, '#2f7a3a', x - dir * 7, y - 2, 2, 6);                                             // groene veren
    Sprites.px(ctx, '#b06bff', x + dir * 4, y - 1, 3, 4);                                             // paarse stun-punt
    Sprites.px(ctx, '#e6d8ff', x + dir * 5, y, 1, 2);
  },
  // vogel raakt je -> MEGA knockback naar achter (rechts, weg van de voorkant)
  _birdHit(e) {
    e.knockVx = 40; e.vy = -8; e.onGround = false; e.combo = 0; e.stunUntil = this.time + 300;
    this.shake = Math.max(this.shake, 10); if (window.Sfx) Sfx.play('hit');
    for (let i = 0; i < 12; i++) this.particles.push(new Particle(e.x, e.y - 12, (Math.random() - 0.5) * 4, -Math.random() * 3, i % 2 ? '#ffffff' : '#cfd6df', 340, 2));
    if (e === this.player) this.hurtFlash = Math.max(this.hurtFlash, 180);
  },
  // vliegtuig-romp + dak (het dak is de ondergrond) — camera-ruimte (wereld)
  drawAirplane(ctx) {
    const roof = this.platforms.find((p) => p.roof); if (!roof) return;
    const x0 = roof.x - roof.w / 2, x1 = roof.x + roof.w / 2, ry = roof.y, w = roof.w, cx = roof.x;
    const body = '#c8ced6', bodyDk = '#9aa3ad', bodyLt = '#eef2f6', trim = '#3a6ea5', win = '#2a3a52';
    // vleugels (steken schuin naar buiten-onder achter het dak)
    Sprites.px(ctx, bodyDk, x0 - 70, ry + 26, 130, 10); Sprites.px(ctx, '#7f8791', x0 - 70, ry + 34, 130, 3);   // linkervleugel
    Sprites.px(ctx, bodyDk, x1 - 60, ry + 26, 130, 10); Sprites.px(ctx, '#7f8791', x1 - 60, ry + 34, 130, 3);   // rechtervleugel
    // staartvin (achter = rechts)
    Sprites.px(ctx, body, x1 - 26, ry - 46, 20, 50); Sprites.px(ctx, bodyLt, x1 - 26, ry - 46, 20, 3);
    Sprites.px(ctx, trim, x1 - 22, ry - 40, 12, 16);
    // romp (dik afgerond blok onder het dak)
    Sprites.px(ctx, body, x0 - 8, ry, w + 16, 62);
    Sprites.px(ctx, bodyLt, x0 - 8, ry, w + 16, 4);                     // dak-highlight (loopvlak)
    Sprites.px(ctx, bodyDk, x0 - 8, ry + 56, w + 16, 6);               // onderrand-schaduw
    Sprites.px(ctx, trim, x0 - 8, ry + 22, w + 16, 4);                 // sierlijn
    // ramen langs de romp
    for (let wx = x0 + 6; wx < x1 - 6; wx += 22) { Sprites.px(ctx, '#1c2740', wx, ry + 10, 8, 7); Sprites.px(ctx, win, wx + 1, ry + 11, 6, 5); Sprites.px(ctx, '#6a9fd0', wx + 1, ry + 11, 6, 2); }
    // cockpit (voorkant = links): schuine neus + raam
    Sprites.px(ctx, body, x0 - 30, ry + 8, 26, 40); Sprites.px(ctx, bodyLt, x0 - 30, ry + 8, 26, 3);
    Sprites.px(ctx, '#1c2740', x0 - 26, ry + 12, 12, 9); Sprites.px(ctx, '#6a9fd0', x0 - 26, ry + 12, 12, 3);   // cockpitraam
    // motoren onder de vleugels
    Sprites.px(ctx, '#5a636e', x0 - 44, ry + 36, 22, 9); Sprites.px(ctx, '#2a2f36', x0 - 46, ry + 38, 3, 5);
    Sprites.px(ctx, '#5a636e', x1 + 26, ry + 36, 22, 9); Sprites.px(ctx, '#2a2f36', x1 + 46, ry + 38, 3, 5);
    // het loopdak zelf (waar je op staat) — metalen paneellijnen
    Sprites.px(ctx, body, x0, ry - 2, w, 4);
    Sprites.px(ctx, bodyLt, x0, ry - 2, w, 1);
    for (let px = x0 + 20; px < x1; px += 40) Sprites.px(ctx, bodyDk, px, ry - 2, 1, 4);   // paneelnaden
  },
  // wolk-platform (Airplane): pluizige wolk; knippert/wiebelt als hij bijna inzakt
  drawCloudPlatform(ctx, pf) {
    if (pf.broken) return;                                             // ingezakt: niet tekenen
    const warn = pf.standT > CLOUD_STAND_MS - 1600;                    // laatste ~1,6s: waarschuwing
    const bob = Math.sin((this.time + pf.x * 7) / (warn ? 90 : 600)) * (warn ? 2.5 : 1.4);
    const x = pf.x, y = pf.y, w = pf.w;
    ctx.globalAlpha = warn ? (0.55 + Math.abs(Math.sin(this.time / 80)) * 0.4) : 0.95;
    const c = warn ? '#dfe6ef' : '#f2f7ff';
    Sprites.px(ctx, c, x - w / 2, y - 3 + bob, w, 8);
    for (let i = -w / 2; i < w / 2 - 2; i += 9) Sprites.px(ctx, warn ? '#eef2f8' : '#ffffff', x + i, y - 8 + bob, 13, 8);
    ctx.globalAlpha = 0.35; Sprites.px(ctx, '#c9d8ec', x - w / 2, y + 4 + bob, w, 3);
    ctx.globalAlpha = 1;
  },
  drawBird(ctx, b) {
    const x = Math.round(b.x), y = Math.round(b.y);
    const flap = Math.sin((this.time + b.born) / 90) * 4;
    Sprites.px(ctx, '#2a2a30', x - 6, y - Math.round(flap), 6, 2);     // achtervleugel
    Sprites.px(ctx, '#3a3a42', x, y + Math.round(flap), 6, 2);         // voorvleugel
    Sprites.px(ctx, '#1c1c22', x - 2, y - 1, 6, 3);                    // lijf
    Sprites.px(ctx, '#e8a83a', x + 4, y, 2, 1);                        // snavel (kijkt naar achter/rechts)
    Sprites.px(ctx, '#ff3030', x + 2, y - 1, 1, 1);                    // oog
  },
  // ---- Sky Castle: draak maakt af en toe een snoekduik dwars over de map ----
  updateCastleDragon(dt) {
    if (!this.castleDragons) this.castleDragons = [];
    if (!this._cDragonAt) { this._cDragonAt = this.time + CASTLE_DRAGON_EVERY + Math.random() * 4000; return; }   // eerste keer: scherpstellen
    if (this.time >= this._cDragonAt) {
      this._cDragonAt = this.time + CASTLE_DRAGON_EVERY + Math.random() * 6000;   // ~9–15s tussen duiken
      this.castleDragons.push({ fromLeft: Math.random() < 0.5, born: this.time, dur: CASTLE_DRAGON_DUR, x: 0, y: 0, hitP: false, hitB: false });
      if (window.Sfx) Sfx.play('swing');
    }
    const w = this.vsMap.w, gy = (this.vsMap.spawnL && this.vsMap.spawnL.y) || 178;
    for (const d of this.castleDragons) {
      const t = Math.max(0, Math.min(1, (this.time - d.born) / d.dur));
      d.t = t; d.dir = d.fromLeft ? 1 : -1;
      const x0 = d.fromLeft ? -60 : w + 60, x1 = d.fromLeft ? w + 60 : -60;
      d.x = x0 + (x1 - x0) * t;
      d.y = (this.vsMap.camTop - 6) + ((gy - 8) - (this.vsMap.camTop - 6)) * Math.sin(Math.PI * t);   // hoog -> laag in het midden -> hoog
      const hit = (e) => e && !e.dead && e.respawnInvuln <= 0 && Math.abs(e.x - d.x) < 22 && Math.abs((e.y - 14) - d.y) < 20;
      if (t > 0.12 && t < 0.88) {
        if (!d.hitP && hit(this.player)) { d.hitP = true; this._skyDragonHit(this.player, d); }
        if (!d.hitB && this.vsBot && hit(this.bot)) { d.hitB = true; this._skyDragonHit(this.bot, d); }
      }
    }
    this.castleDragons = this.castleDragons.filter((d) => (this.time - d.born) < d.dur + 250);
  },
  // Smoke Vanish: pluizige grijze rookwolk op (x,y)
  spawnSmokePuff(x, y) {
    const cols = ['#e2e6ea', '#c8ced6', '#aab0b8', '#8a9098'];
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * 6.2832, sp = 0.4 + Math.random() * 1.8;
      this.particles.push(new Particle(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 12, Math.cos(a) * sp, -0.4 - Math.random() * 1.5, cols[i % 4], 620 + Math.random() * 420, 3 + Math.round(Math.random() * 2)));
    }
    for (let i = 0; i < 4; i++) this.particles.push(new Particle(x + (Math.random() - 0.5) * 10, y - 6, (Math.random() - 0.5) * 1.6, -Math.random() * 1.2, '#b06bff', 460, 2));   // paarse vanish-vonkjes
    this.shake = Math.max(this.shake, 4);
  },
  // draak-duik raakt je -> harde knockback (van de map af) in de vliegrichting
  _skyDragonHit(e, d) {
    e.knockVx = d.dir * 52; e.vy = -8.5; e.onGround = false; e.combo = 0; e.stunUntil = this.time + 260;
    this.shake = Math.max(this.shake, 12); if (window.Sfx) Sfx.play('hit');
    for (let i = 0; i < 16; i++) this.particles.push(new Particle(e.x, e.y - 12, (Math.random() - 0.5) * 4.5, -Math.random() * 3, i % 3 ? '#ffce6a' : '#ff6a2a', 380, 2));
    if (e === this.player) this.hurtFlash = Math.max(this.hurtFlash, 200);
  },
  drawSkyDragon(ctx, d) {
    const x = Math.round(d.x), y = Math.round(d.y), dir = d.dir;
    const flap = Math.sin((this.time + d.born) / 70) * 6;
    const body = '#2f7a3a', bodyDk = '#1e5528', belly = '#8fd06a', wing = '#256a30', wingLt = '#3a9a44', horn = '#e8dcc0';
    // vleugels (klappen)
    ctx.globalAlpha = 0.95;
    Sprites.px(ctx, wing, x - dir * 14, y - 10 - Math.round(flap), 20, 12);
    Sprites.px(ctx, wingLt, x - dir * 14, y - 10 - Math.round(flap), 20, 3);
    Sprites.px(ctx, wing, x - dir * 6, y + 4 + Math.round(flap), 16, 10);
    ctx.globalAlpha = 1;
    // staart (achter)
    Sprites.px(ctx, bodyDk, x - dir * 26, y + 2, 16, 4);
    Sprites.px(ctx, body, x - dir * 18, y, 14, 6);
    // lijf
    Sprites.px(ctx, body, x - 8, y - 4, 22, 12);
    Sprites.px(ctx, belly, x - 6, y + 4, 18, 3);
    Sprites.px(ctx, bodyDk, x - 8, y - 4, 22, 2);
    // nek + kop (voor, in vliegrichting)
    Sprites.px(ctx, body, x + dir * 10, y - 8, 8, 8);
    Sprites.px(ctx, body, x + dir * 14, y - 10, 9, 8);
    Sprites.px(ctx, horn, x + dir * 15, y - 14, 2, 4);                 // hoorn
    Sprites.px(ctx, '#ffe14a', x + dir * 20, y - 8, 2, 2);            // oog
    // vuur-adem-gloed vóór de kop
    ctx.globalAlpha = 0.6; Sprites.px(ctx, '#ff8a2a', x + dir * 23, y - 7, 4, 3);
    ctx.globalAlpha = 0.35; Sprites.px(ctx, '#ffd06a', x + dir * 26, y - 7, 5, 3); ctx.globalAlpha = 1;
  },
  // Sky Castle-achtergrond: zon, verre wolken/horizon met kastelen, zwevende eilandjes,
  // een verre vliegende draak en de achter-torens van het eigen kasteel.
  drawCastleBg(ctx) {
    const W = this.vsMapW, t = this.time;
    // zon-gloed hoog links
    const sx = Math.round(W * 0.24);
    const sg = ctx.createRadialGradient(sx, 26, 6, sx, 26, 84);
    sg.addColorStop(0, 'rgba(255,240,200,0.55)'); sg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 92, -44, 184, 156);
    Sprites.px(ctx, '#fff2c8', sx - 7, 18, 14, 14);
    // hazige verre grond + kastelen in de verte
    ctx.globalAlpha = 0.26; Sprites.px(ctx, '#6a86b0', 0, 160, W, 12); ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.4;
    const farCastle = (bx) => { Sprites.px(ctx, '#41597e', bx, 150, 22, 14); Sprites.px(ctx, '#41597e', bx - 3, 146, 5, 18); Sprites.px(ctx, '#41597e', bx + 20, 146, 5, 18); Sprites.px(ctx, '#33486a', bx + 8, 143, 6, 21); Sprites.px(ctx, '#6a86b0', bx, 150, 22, 1); };
    farCastle(Math.round(W * 0.12)); farCastle(Math.round(W * 0.55)); farCastle(Math.round(W * 0.82));
    ctx.globalAlpha = 1;
    // drijvende wolken
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 8; i++) { const cx = ((i * 127) + t * 0.006) % (W + 120) - 60; Sprites.px(ctx, '#cfe0f2', Math.round(cx), 150 + ((i * 13) % 10), 46, 6); }
    ctx.globalAlpha = 1;
    // verre, langzaam driftende draak
    const fx = ((t * 0.02) % (W + 160)) - 80, fy = 58 + Math.sin(t / 900) * 10;
    ctx.globalAlpha = 0.5; const f = Math.sin(t / 220) * 3;
    Sprites.px(ctx, '#24405e', Math.round(fx) - 8, Math.round(fy - f), 10, 3);
    Sprites.px(ctx, '#24405e', Math.round(fx) + 2, Math.round(fy + f), 10, 3);
    Sprites.px(ctx, '#1c3350', Math.round(fx) - 2, Math.round(fy) - 1, 8, 3);
    ctx.globalAlpha = 1;
    // zwevende eilandjes (parallax)
    ctx.globalAlpha = 0.85;
    const isle = (bx, by, bw) => { Sprites.px(ctx, '#6b5f4a', bx, by, bw, 6); Sprites.px(ctx, '#4f4636', bx + 3, by + 6, bw - 6, 5); Sprites.px(ctx, '#3a3226', bx + Math.round(bw / 2) - 3, by + 11, 6, 5); Sprites.px(ctx, '#3a7a3f', bx, by - 3, bw, 3); };
    isle(Math.round(W * 0.06), 96, 40); isle(Math.round(W * 0.70), 74, 46); isle(Math.round(W * 0.42), 50, 34);
    ctx.globalAlpha = 1;
    // achter-torens van het eigen kasteel (achter de platforms)
    const tower = (cx, top, w) => {
      Sprites.px(ctx, '#5a5040', cx - w / 2, top, w, 178 - top + 6);
      Sprites.px(ctx, '#6a5f4a', cx - w / 2, top, w, 3);
      Sprites.px(ctx, '#443c30', cx + w / 2 - 3, top + 3, 3, 178 - top);
      for (let i = 0; i < w; i += 8) Sprites.px(ctx, '#5a5040', cx - w / 2 + i, top - 4, 4, 4);   // kantelen
      for (let yy = top + 10; yy < 168; yy += 18) Sprites.px(ctx, '#20304a', cx - 2, yy, 4, 7);   // raampjes
    };
    ctx.globalAlpha = 0.92;
    tower(154, 128, 30); tower(548, 128, 30); tower(351, 108, 26);
    ctx.globalAlpha = 1;
  },
  onVersusApe(p) {
    const a = this.jungleApe; if (!a || !p) return;
    if (p.x != null) a.x = p.x;
    if (p.ph === 'jump') { a.state = 'jump'; a.vy = APE_JUMP_VY; a.hitP = false; a.hitB = false; }
    else if (p.st) a.state = p.st;
    if (p.y != null) a.y = p.y;
  },

  // ---- JUNGLE: gorilla in de kooi ----
  _inCage(e) {
    const cg = this.jungleCage; if (!cg || !e || e.dead) return false;
    return Math.abs(e.x - cg.x) < cg.w / 2 + 6 && e.y > cg.floorY - 44 && e.y < cg.floorY + 12;
  },
  updateGorilla(dt) {
    const g = this.gorilla, cg = this.jungleCage; if (!g || !cg) return;
    if (g.hitFlash > 0) g.hitFlash -= dt;
    const host = this.vsBot || this.vs.role === 'host';
    if (!g.alive) return;                            // dood = weg voor de rest van het potje
    // doelwit: een speler die IN de kooi staat
    let target = this._inCage(this.player) ? this.player : (this.vsBot ? (this._inCage(this.bot) ? this.bot : null) : (this._inCage(this.vs.remote) ? this.vs.remote : null));
    if (host) {
      if (target) {
        g.dir = target.x >= g.x ? 1 : -1;
        if (Math.abs(target.x - g.x) > 14) g.x += g.dir * 0.5 * this.dtScale;
        g.x = Math.max(cg.x - cg.w / 2 + 12, Math.min(cg.x + cg.w / 2 - 12, g.x));
        if (this.time >= g.swipeCd && Math.abs(target.x - g.x) < GORILLA_REACH && Math.abs(target.y - g.y) < 38) {
          g.swipeCd = this.time + GORILLA_SWIPE_CD; g.swipeUntil = this.time + 260; g.state = 'swipe'; g._hitDone = false; this.shake = Math.max(this.shake, 5); if (window.Sfx) Sfx.play('gorilla');
        }
      }
      if (g.state === 'swipe' && this.time < g.swipeUntil && !g._hitDone) {
        g._hitDone = true;
        const kd = (t) => t.x >= g.x ? 1 : -1;
        // gorilla geeft GEEN knockback, alleen schade (power 0)
        if (this._inCage(this.player) && Math.abs(this.player.x - g.x) < GORILLA_REACH && this.player.respawnInvuln <= 0) this.onVersusHit({ dir: kd(this.player), power: 0, vy: 0, dmg: 18 });
        if (this.vsBot) { if (this._inCage(this.bot) && Math.abs(this.bot.x - g.x) < GORILLA_REACH) this.applyHitToBot(kd(this.bot), 0, 0, 18); }
        else if (this._inCage(this.vs.remote) && Math.abs(this.vs.remote.x - g.x) < GORILLA_REACH && window.Net) Net.versusSend('hit', { dir: kd(this.vs.remote), power: 0, vy: 0, dmg: 18 });
      }
      if (g.state === 'swipe' && this.time >= g.swipeUntil) g.state = 'idle';
      g._net += dt; if (g._net >= 100) { g._net = 0; this._broadcastGorilla(); }
    }
  },
  _broadcastGorilla() {
    if (window.Net && !this.vsBot && this.gorilla) Net.versusSend('gorilla', { x: Math.round(this.gorilla.x), hp: this.gorilla.hp, al: this.gorilla.alive ? 1 : 0, st: this.gorilla.state, d: this.gorilla.dir });
  },
  onVersusGorilla(p) {
    const g = this.gorilla; if (!g || !p) return;
    if (typeof p.x === 'number') g.x = p.x;
    if (typeof p.hp === 'number') g.hp = p.hp;
    g.alive = p.al !== 0; g.state = p.st || 'idle'; g.dir = p.d || -1;
  },
  // schade aan de gorilla (door een mep/kogel van de SPELER)
  hitGorilla(dmg) {
    const g = this.gorilla; if (!g || !g.alive) return;
    const lethal = (g.hp - dmg) <= 0;
    if (lethal) { this.player.hp = this.player.maxHp; this.spawnMonkey(true); }   // beloning: vol leven + helper-aapje
    g.hitFlash = 120;
    if (this.vsBot || this.vs.role === 'host') { g.hp -= dmg; if (g.hp <= 0) this._gorillaDie(); this._broadcastGorilla(); }
    else { if (window.Net) Net.versusSend('gorhit', { dmg }); if (lethal) { g.alive = false; g.state = 'dead'; } }
    for (let i = 0; i < 5; i++) this.particles.push(new Particle(g.x + (Math.random() - 0.5) * 16, g.y - 18, (Math.random() - 0.5) * 2, -Math.random() * 2, '#a33', 320, 2));
  },
  onVersusGorhit(p) {
    const g = this.gorilla; if (!g || !g.alive) return;
    if (this.vsBot || this.vs.role === 'host') { g.hp -= (p && p.dmg || 0); g.hitFlash = 120; if (g.hp <= 0) this._gorillaDie(); this._broadcastGorilla(); }
  },
  _gorillaDie() {
    const g = this.gorilla; g.alive = false; g.hp = 0; g.state = 'dead'; g.respawnAt = this.time + GORILLA_RESPAWN;
    this.shake = Math.max(this.shake, 9);
    if (this.player) this.player._caged = false;
    if (this.bot) this.bot._caged = false;
    for (let i = 0; i < 18; i++) this.particles.push(new Particle(g.x, g.y - 16, (Math.random() - 0.5) * 4, -Math.random() * 3, Math.random() < 0.5 ? '#5a3d22' : '#3a2615', 420, 3));
  },

  // opgesloten in de kooi tot de gorilla dood is (tralies dicht)
  confineCage(e) {
    const g = this.gorilla, cg = this.jungleCage; if (!g || !cg || !e || e.dead) return;
    if (!g.alive) { e._caged = false; return; }
    if (e.giant) {                                   // reus mag niet in de kooi -> gorilla mept 'm er meteen uit
      if (this._inCage(e)) {
        const side = e.x >= cg.x ? 1 : -1;
        e.x = cg.x + side * (cg.w / 2 + 18);
        e.knockVx = side * 12; e.vy = Math.min(e.vy, -5); e._caged = false;
        this.shake = Math.max(this.shake, 5);
      }
      return;
    }
    if (this._inCage(e)) e._caged = true;
    if (e._caged) {
      e.x = Math.max(cg.x - cg.w / 2 + 10, Math.min(cg.x + cg.w / 2 - 10, e.x));
      if (e.y < cg.top + 16) { e.y = cg.top + 16; if (e.vy < 0) e.vy = 0; }   // plafond: kun je er niet uit
    }
  },
  // de reus (Giant): bots iemand weg of stampt 'm (op iemand springen = schade)
  // reus-timer afgelopen -> terug naar normaal formaat (HP klemt op je basis-max)
  _endGiant(e) {
    if (!e || !e.giant) return;
    e.giant = false;
    if (e._baseMaxHp) e.maxHp = e._baseMaxHp;
    e.hp = Math.min(e.hp, e.maxHp);
    for (let i = 0; i < 12; i++) this.particles.push(new Particle(e.x, e.y - 14, (Math.random() - 0.5) * 3, -Math.random() * 2.5, '#7affa0', 380, 2));
    if (window.Sfx) Sfx.play('pickup');
  },
  giantContact(dt) {
    const p = this.player; if (!p.giant || p.dead) return;
    const opp = this.vsBot ? this.bot : this.vs.remote;
    const oppDead = this.vsBot ? (!opp || opp.dead) : (!opp || opp.alive === false);
    if (oppDead) return;
    const dxp = opp.x - p.x;
    // reus is enorm -> ook ruim verticaal bereik (kan iemand die aan een liaan slingert raken)
    if (Math.abs(dxp) < 38 && (opp.y - p.y) < 12 && (p.y - opp.y) < 60 && this.time >= (p._giantHitCd || 0)) {
      p._giantHitCd = this.time + 200;
      const stomp = p.vy > 2 && p.y < opp.y - 4;          // op iemand springen = schade
      const kd = dxp >= 0 ? 1 : -1;                        // weg van de reus = naar achter
      if (this.vsBot) this.applyHitToBot(kd, stomp ? 22 : 28, stomp ? -6 : -3, stomp ? 24 : 0);
      else if (window.Net) Net.versusSend('hit', { dir: kd, power: stomp ? 22 : 28, vy: stomp ? -6 : -3, dmg: stomp ? 24 : 0 });
      if (window.Sfx) Sfx.play('stomp');
      this.shake = Math.max(this.shake, 4);
    }
  },

  // helper-aapje (beloning voor wie de gorilla doodt): vecht mee tegen de tegenstander, heel het potje
  spawnMonkey(mine) {
    this.monkey = { mine: !!mine, x: this.player.x - this.player.dir * 16, y: this.player.y - 18, dir: this.player.dir, atkCd: this.time + 700, _net: 0 };
    if (mine && !this.vsBot && window.Net) Net.versusSend('monkey', { x: Math.round(this.monkey.x), y: Math.round(this.monkey.y), d: this.monkey.dir });
    for (let i = 0; i < 10; i++) this.particles.push(new Particle(this.monkey.x, this.monkey.y, (Math.random() - 0.5) * 3, -Math.random() * 3, '#caa06a', 380, 2));
  },
  updateMonkey(dt) {
    const m = this.monkey; if (!m || !m.mine) return;     // het aapje van de tegenstander komt via sync binnen
    const owner = this.player;
    const opp = this.vsBot ? this.bot : this.vs.remote;
    const oppDead = this.vsBot ? (!opp || opp.dead) : (!opp || opp.alive === false);
    // standaard: dicht bij de eigenaar blijven. Alleen op de tegenstander af als die in de buurt komt.
    let tx = owner.x - owner.dir * 16, ty = owner.y - 18;
    const oppNear = !oppDead && Math.abs(opp.x - owner.x) < 90 && Math.abs(opp.y - owner.y) < 60;
    if (oppNear) { tx = opp.x - Math.sign(opp.x - m.x || 1) * 12; ty = opp.y - 14; }
    m.x += Math.max(-3.2, Math.min(3.2, (tx - m.x) * 0.16));
    m.y += Math.max(-3.2, Math.min(3.2, (ty - m.y) * 0.16));
    if (Math.abs(tx - m.x) > 2) m.dir = tx >= m.x ? 1 : -1;
    if (oppNear && Math.abs(opp.x - m.x) < 18 && Math.abs(opp.y - m.y) < 22 && this.time >= (m.atkCd || 0) && (!this.vsBot || opp.respawnInvuln <= 0)) {
      m.atkCd = this.time + 850;
      if (window.Sfx) Sfx.play('monkey');
      const kd = opp.x >= m.x ? 1 : -1;
      if (this.vsBot) this.applyHitToBot(kd, 6, -3, 8);
      else if (window.Net) Net.versusSend('hit', { dir: kd, power: 6, vy: -3, dmg: 8 });
      for (let i = 0; i < 3; i++) this.particles.push(new Particle(opp.x, opp.y - 14, (Math.random() - 0.5) * 2, -Math.random() * 2, '#fff', 220, 2));
    }
    if (!this.vsBot && window.Net) { m._net += dt; if (m._net >= 80) { m._net = 0; Net.versusSend('monkey', { x: Math.round(m.x), y: Math.round(m.y), d: m.dir }); } }
  },
  onVersusMonkey(p) {
    if (!p) return;
    if (!this.monkey) this.monkey = { mine: false, x: p.x, y: p.y, dir: p.d || 1, atkCd: 0 };
    if (!this.monkey.mine) { this.monkey.x = p.x; this.monkey.y = p.y; this.monkey.dir = p.d || 1; }
  },
  drawMonkey(ctx) {
    const m = this.monkey; if (!m) return;
    const x = Math.round(m.x), y = Math.round(m.y), s = m.dir;
    const fur = '#8a5e34', furDk = '#5e3f22';
    const sw = Math.round(Math.sin(this.time / 90) * 2);
    Sprites.px(ctx, furDk, x - s * 7, y - 6, s * 3, 2);    // staart
    Sprites.px(ctx, fur, x - 5, y - 10, 10, 12);           // lijf
    Sprites.px(ctx, furDk, x - 5, y - 10, 3, 12);
    Sprites.px(ctx, '#d8b48a', x - 3, y - 6, 6, 6);        // buik
    Sprites.px(ctx, fur, x - 8, y - 16, 3, 3); Sprites.px(ctx, fur, x + 5, y - 16, 3, 3);   // oortjes
    Sprites.px(ctx, fur, x - 5, y - 17, 10, 9);            // kop
    Sprites.px(ctx, '#d8b48a', x - 3, y - 13, 6, 4);       // snuit
    Sprites.px(ctx, '#000', x - 3, y - 15, 2, 2); Sprites.px(ctx, '#000', x + 1, y - 15, 2, 2);   // ogen
    Sprites.px(ctx, fur, x + s * 5, y - 8 + sw, s * 4, 3); // zwaaiend armpje
  },

  // ---- steen-powerup: 3 grote stenen vallen -> geraakt = 2s platgedrukt ----
  rockTargetXs(centerX) {
    const xs = [centerX + (Math.random() - 0.5) * 20];     // 1 steen gericht op het doel
    for (let i = 1; i < SMASH_ROCK_COUNT; i++) xs.push(centerX + (Math.random() - 0.5) * 2 * SMASH_ROCK_SPREAD);
    return xs.map((x) => Math.max(20, Math.min(this.vsMapW - 20, Math.round(x))));
  },
  castRocks(xs) {
    if (!this.rocks) this.rocks = [];
    const top = (this.vsMap && this.vsMap.camTop) || 0;
    for (const x of xs) this.rocks.push({ x, y: top - 50 - Math.random() * 50, vy: 0, dead: false });
  },
  onVersusRocks(p) { if (p && p.xs) this.castRocks(p.xs); },
  updateRocks(dt) {
    if (!this.rocks || !this.rocks.length) return;
    for (const rk of this.rocks) {
      rk.vy += 0.5 * this.dtScale; rk.y += rk.vy * this.dtScale;
      const hit = (e) => e && !e.dead && e.respawnInvuln <= 0 && Math.abs(rk.x - e.x) < 17 && rk.y > e.y - 30 && rk.y < e.y + 6;
      if (hit(this.player)) { rk.dead = true; this.player.flatUntil = this.time + SMASH_ROCK_FLAT; this.rockSmash(rk.x, this.player.y); }
      else if (this.vsBot && hit(this.bot)) { rk.dead = true; this.bot.flatUntil = this.time + SMASH_ROCK_FLAT; this.rockSmash(rk.x, this.bot.y); }
      else if (rk.y > this.vsFallY) { rk.dead = true; this.rockSmash(rk.x, CONFIG.GROUND_Y); }
    }
    this.rocks = this.rocks.filter((rk) => !rk.dead);
  },
  rockSmash(x, y) {
    for (let i = 0; i < 12; i++) this.particles.push(new Particle(x + (Math.random() - 0.5) * 16, y, (Math.random() - 0.5) * 3, -Math.random() * 1.8, Math.random() < 0.5 ? '#7a6a58' : '#9a8a74', 340, 2));
    this.shake = Math.max(this.shake, 6);
  },

  // portaalpaar: één in de linkerhelft, één in de rechterhelft (host/lokaal bepaalt)
  spawnPortal() {
    const mapW = this.vsMapW;
    const left = this.platforms.filter((p) => p.x < mapW * 0.5);
    const right = this.platforms.filter((p) => p.x >= mapW * 0.5);
    if (!left.length || !right.length) return;
    const a = left[Math.floor(Math.random() * left.length)];
    const b = right[Math.floor(Math.random() * right.length)];
    const id = this._dropId++;
    const pt = { id, ax: Math.round(a.x), ay: Math.round(a.y), bx: Math.round(b.x), by: Math.round(b.y), born: this.time };
    this.portals.push(pt);
    if (window.Net && !this.vsBot) Net.versusSend('portal', { id: pt.id, ax: pt.ax, ay: pt.ay, bx: pt.bx, by: pt.by });
  },

  // speler die in een portaalmond stapt -> naar de andere mond
  checkPortal(pl) {
    if (!this.portals || !this.portals.length || pl.dead) return;
    if (this.time < (pl._portalCd || 0)) return;
    for (const pt of this.portals) {
      let tx = null, ty = null;
      if (Math.abs(pl.x - pt.ax) < 13 && Math.abs(pl.y - pt.ay) < 20) { tx = pt.bx; ty = pt.by; }
      else if (Math.abs(pl.x - pt.bx) < 13 && Math.abs(pl.y - pt.by) < 20) { tx = pt.ax; ty = pt.ay; }
      if (tx != null) {
        for (let i = 0; i < 16; i++) this.particles.push(new Particle(pl.x, pl.y - 12, (Math.random() - 0.5) * 3.2, (Math.random() - 0.5) * 3.2, '#b06bff', 360, 2));
        pl.x = tx; pl.y = ty; pl.vy = 0; pl.knockVx = 0; pl.onGround = true;
        pl._portalCd = this.time + 1300;     // niet meteen terugstappen
        for (let i = 0; i < 16; i++) this.particles.push(new Particle(pl.x, pl.y - 12, (Math.random() - 0.5) * 3.2, (Math.random() - 0.5) * 3.2, '#6bd0ff', 360, 2));
        this.shake = Math.max(this.shake, 5);
        break;
      }
    }
  },

  onVersusPortal(p) {
    if (!this.portals) this.portals = [];
    if (this.portals.some((pt) => pt.id === p.id)) return;
    this.portals.push({ id: p.id, ax: p.ax, ay: p.ay, bx: p.bx, by: p.by, born: this.time });
  },

  // TEMPEL-DEUR: sta je op een deur-blok bij de deur -> teleporteer naar de gekoppelde bestemming
  checkDoor(pl) {
    if (pl.dead || this.time < (pl._doorCd || 0)) return;
    const doors = this.vsMap && this.vsMap.doors; if (!doors) return;
    for (const d of doors) {
      if (Math.abs(pl.x - d.x) < 12 && pl.y <= d.y + 5 && pl.y >= d.y - 32) {
        for (let i = 0; i < 16; i++) this.particles.push(new Particle(pl.x, pl.y - 14, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, '#ffd24a', 340, 2));
        pl.x = d.tx; pl.y = d.ty; pl.vy = 0.5; pl.knockVx = 0; pl.onGround = false;   // kom boven het platform uit en zak erop
        pl._doorCd = this.time + 900;                                                  // niet meteen terugstappen
        for (let i = 0; i < 16; i++) this.particles.push(new Particle(pl.x, pl.y - 14, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, '#b06bff', 340, 2));
        this.shake = Math.max(this.shake, 5);
        if (window.Sfx && pl === this.player) Sfx.play('pickup');
        break;
      }
    }
  },

  // ===== TEMPELBEWAKER-VALLEN =====
  // 3 vallen op de grond bij de plaatser neerzetten
  placeTraps(placer, owner) {
    this.traps = this.traps || [];
    const gy = Math.round(placer.y);
    const xs = [-80, 0, 80].map((dx) => Math.max(20, Math.min(this.vsMapW - 20, Math.round(placer.x + dx))));
    for (const x of xs) {
      this.traps.push({ x, y: gy, owner, born: this.time });
      for (let i = 0; i < 5; i++) this.particles.push(new Particle(x, gy - 4, (Math.random() - 0.5) * 2, -Math.random() * 1.5, '#caa84a', 340, 2));
    }
    if (owner === 'me' && !this.vsBot && window.Net) Net.versusSend('traps', { xs, y: gy });
    if (window.Sfx) Sfx.play('stomp');
  },
  // Tempelbewaker: één val plaatsen op je huidige plek — alleen op de grond of een platform
  placeOneTrap(placer, owner) {
    if ((this.state !== 'versus' && this.state !== 'training') || this.vsPaused) return false;
    const p = placer; if (!p || p.dead || (p._trapCharges | 0) <= 0) return false;
    if (this.vs && (this.vs.countdown > 0 || this.vs.roundFreezeUntil > this.time)) return false;
    if (!p.onGround) {                                    // in de lucht -> hier kan geen val
      this.addFloatText(p.x, p.y - 20, 'ALLEEN OP DE GROND', '#ff9a5a', false);
      return false;
    }
    this.traps = this.traps || [];
    const x = Math.max(20, Math.min(this.vsMapW - 20, Math.round(p.x))), y = Math.round(p.y);
    this.traps.push({ x, y, owner, born: this.time });
    for (let i = 0; i < 6; i++) this.particles.push(new Particle(x, y - 4, (Math.random() - 0.5) * 2, -Math.random() * 1.5, '#caa84a', 340, 2));
    p._trapCharges--;
    if (owner === 'me' && !this.vsBot && window.Net) Net.versusSend('traps', { xs: [x], y });
    this.shake = Math.max(this.shake, 4);
    if (window.Sfx) Sfx.play('stomp');
    if (window.UI && UI.renderAbilityBtn) UI.renderAbilityBtn();
    return true;
  },
  // doorschijnende voorbeeld-val op je voeten tijdens het plaatsen (goud = kan, rood = niet)
  drawTrapPreview(ctx, x, y, ok) {
    x = Math.round(x); y = Math.round(y);
    ctx.globalAlpha = 0.5 + (ok ? Math.abs(Math.sin(this.time / 220)) * 0.2 : 0);
    const base = ok ? '#caa84a' : '#c0392b', teeth = ok ? '#e8edf2' : '#e07a6a';
    Sprites.px(ctx, base, x - 9, y - 3, 18, 4);
    for (let i = -7; i <= 6; i += 3) Sprites.px(ctx, teeth, x + i, y - 6, 2, 3);
    ctx.globalAlpha = 1;
  },
  // sta je op een val van je tegenstander -> 8s vastgeklonken (wel slaan, niet bewegen/springen)
  updateTraps() {
    const root = (e) => { if (!e || e.dead) return; e._rootedUntil = this.time + 8000; e.knockVx = 0; this.shake = Math.max(this.shake, 6); for (let k = 0; k < 12; k++) this.particles.push(new Particle(e.x, e.y - 6, (Math.random() - 0.5) * 3, -Math.random() * 2, '#8a6a3a', 460, 2)); if (window.Sfx) Sfx.play('stomp'); };
    const on = (e, t) => e && !e.dead && Math.abs(e.x - t.x) < 14 && e.onGround && Math.abs(e.y - t.y) < 16;
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const t = this.traps[i];
      if (this.time - t.born > 25000) { this.traps.splice(i, 1); continue; }   // oude vallen vervallen
      if (t.owner === 'me') {                       // val van de lokale speler -> treft de tegenstander
        const opp = this.vsBot ? this.bot : (this.vs ? this.vs.remote : null);
        if (on(opp, t)) { this.traps.splice(i, 1); if (this.vsBot) root(this.bot); else if (window.Net) { Net.versusSend('rooted', {}); this.spawnAbilityFx(opp.x, opp.y, '#8a6a3a'); } }
      } else {                                      // val van bot/online-tegenstander -> treft de speler
        if (on(this.player, t)) { this.traps.splice(i, 1); root(this.player); }
      }
    }
  },
  onVersusTraps(p) {
    if (!p || !p.xs) return; this.traps = this.traps || [];
    for (const x of p.xs) this.traps.push({ x: x, y: p.y, owner: 'foe', born: this.time });
  },
  onVersusRooted() {
    const p = this.player; if (p && !p.dead) { p._rootedUntil = this.time + 8000; p.knockVx = 0; this.shake = Math.max(this.shake, 6); if (window.Sfx) Sfx.play('stomp'); }
  },
  // val op de grond: houten plaat met metalen tanden, licht pulserend
  drawTrap(ctx, t) {
    const x = Math.round(t.x), y = Math.round(t.y);
    const pulse = Math.sin(this.time / 300 + t.x) > 0;
    Sprites.px(ctx, '#5a4630', x - 9, y - 3, 18, 4);              // houten voetplaat
    Sprites.px(ctx, '#3f3020', x - 9, y - 3, 18, 1);
    for (let i = -7; i <= 6; i += 3) Sprites.px(ctx, pulse ? '#e8edf2' : '#aab2bc', x + i, y - 6, 2, 3);   // metalen tanden
    Sprites.px(ctx, '#8a929c', x - 9, y - 4, 18, 1);
  },
  // ketens rond de voeten van een vastgeklonken vechter
  drawRooted(ctx, x, y) {
    Sprites.px(ctx, '#8a929c', x - 8, y - 3, 16, 3);             // grondketen
    Sprites.px(ctx, '#cfd6df', x - 8, y - 3, 16, 1);
    Sprites.px(ctx, '#6b7480', x - 3, y - 8, 2, 6); Sprites.px(ctx, '#6b7480', x + 1, y - 8, 2, 6);   // enkelboeien
  },

  spawnDrop() {
    let pool = SMASH_DROPS.slice();
    const mid = this.vsMap && this.vsMap.id;
    if (this.journeyDrops) {
      // Journey: eigen basis (geen smash-projectielen) + de NIEUWE eiland-powerups van dit level
      pool = [{ kind: 'weapon', w: 30 }, { kind: 'health', w: 20 }, { kind: 'rage', w: 8 }, { kind: 'speed', w: 8 }];
      for (const k of this.journeyDrops) pool.push({ kind: k, w: 11 });
    } else {
      if (mid === 'cave') pool.push({ kind: 'lightning', w: 8 });                     // bliksem op Cave
      if (mid === 'cave') pool.push({ kind: 'rock', w: 8 });                          // steen alleen op Cave
      if (mid === 'pirate') pool.push({ kind: 'cannon', w: 9 });                      // kanonskogel alleen op Pirate Ship
      if (mid === 'pirate') pool.push({ kind: 'shield', w: 9 });                      // shield op Pirate Ship
      if (mid === 'pirate') pool.push({ kind: 'smoke', w: 8 });                       // Smoke Vanish op Pirate Ship
      if (mid === 'airplane') {                                                       // Airplane: alle power-ups behalve reus/strandbal/ninjaster/rotsblok
        pool.push({ kind: 'lightning', w: 8 }); pool.push({ kind: 'cannon', w: 9 });
        pool.push({ kind: 'shield', w: 9 }); pool.push({ kind: 'ak47', w: 9 });
      }
      if (mid === 'beach') pool.push({ kind: 'beachball', w: 10 });                     // strandbal op Beach
      if (mid === 'temple') pool.push({ kind: 'ninjastar', w: 12 });                    // ninja-sterren op Temple
      if (mid === 'temple') pool.push({ kind: 'smoke', w: 8 });                         // Smoke Vanish op Temple
      if (mid === 'jungle') { pool.push({ kind: 'ak47', w: 9 }); pool.push({ kind: 'crossbow', w: 9 }); }  // AK47 + Kruisboog op Jungle
      if (mid === 'castle') {                                                          // Sky Castle: door de speler gekozen power-ups
        pool.push({ kind: 'shield', w: 9 }); pool.push({ kind: 'crossbow', w: 9 }); pool.push({ kind: 'fireball', w: 8 });
        pool.push({ kind: 'lightning', w: 8 }); pool.push({ kind: 'dragon', w: 5 });
      }
      if (mid === 'dohyo') {                                                          // Dohyo: ALLE power-ups
        pool.push({ kind: 'lightning', w: 8 }); pool.push({ kind: 'rock', w: 8 }); pool.push({ kind: 'cannon', w: 9 });
        pool.push({ kind: 'shield', w: 9 }); pool.push({ kind: 'ak47', w: 9 });
      }
    }
    if (this._dragonUsed) pool = pool.filter((d) => d.kind !== 'dragon');   // max 1 draak per match
    // nuke: zeldzaam, alleen in smash, maximaal 1x per match (en niet als er al eentje ligt)
    if (!this.journeyDrops && !this._nukeUsed && !this.drops.some((d) => !d.taken && d.kind === 'nuke')) pool.push({ kind: 'nuke', w: 6 });
    let tot = 0; for (const d of pool) tot += d.w;
    let r = Math.random() * tot, kind = 'health';
    for (const d of pool) { r -= d.w; if (r <= 0) { kind = d.kind; break; } }
    const pf = this.platforms[Math.floor(Math.random() * this.platforms.length)] || { x: 180, y: 140, w: 60 };
    const x = Math.round(pf.x + (Math.random() - 0.5) * Math.max(8, pf.w - 16));
    const y = Math.round(pf.y - 9);
    const wid = kind === 'weapon' ? SMASH_WEAPON_POOL[Math.floor(Math.random() * SMASH_WEAPON_POOL.length)] : 0;
    const id = this._dropId++;
    this.drops.push({ id, kind, x, y, wid, born: this.time, taken: false });
    if (window.Net && !this.vsBot) Net.versusSend('drop', { id, kind, x, y, wid });
  },

  // power-up uit je loadout activeren tijdens een match -> effect toepassen + 1 uit je voorraad
  usePowerupSlot(id) {
    if (this.state !== 'versus' || this.vsPaused) return false;
    const p = this.player; if (!p || p.dead) return false;
    if (this.vs && (this.vs.countdown > 0 || this.vs.roundFreezeUntil > this.time)) return false;
    const pu = SHOP_POWERUPS[id]; if (!pu) return false;
    if (Storage.powerupCount(id) <= 0) return false;
    if (!Storage.usePowerup(id)) return false;
    this.applyDrop(p, { kind: pu.kind, x: p.x, y: p.y - 8, wid: 'bat' });
    if (window.UI && UI.renderLoadoutBar) UI.renderLoadoutBar();
    return true;
  },

  // ===== CHARACTER-ABILITY activeren (vlam-knop, opgeladen) =====
  useAbility() {
    if ((this.state !== 'versus' && this.state !== 'training') || this.vsPaused) return false;
    const p = this.player; if (!p || p.dead || !p.ability) return false;
    if (this.vs && (this.vs.countdown > 0 || this.vs.roundFreezeUntil > this.time)) return false;
    if (p.abCharge < 1) return false;
    p.abCharge = 0;
    const opp = this.vsBot ? this.bot : (this.vs ? this.vs.remote : null);
    const now = this.time;
    const dm = p.abilityDurMul || 1;                    // character-level: langere ability-duur
    switch (p.ability) {
      case 'zapdash': this.zapDash(); break;
      case 'heal': p.hp = p.maxHp; this._abFx(p, '#5aff7a'); break;
      case 'highjump': p.jumpMul = 1.4; this._abFx(p, '#8fd0ff'); break;
      case 'fireaura10': p.fireAura = true; p.auraUntil = now + 10000 * dm; this._abFx(p, '#ff8a2a'); break;
      case 'triplejump': p.maxJumps = Math.max(p.maxJumps, 2) + 1; p.jumps = p.maxJumps; this._abFx(p, '#8fd0ff'); break;
      case 'rage10': p.buffs.rage = now + 10000 * dm; this._abFx(p, '#ff5a3a'); break;
      case 'rage8': p.buffs.rage = now + 8000 * dm; this._abFx(p, '#ff5a3a'); break;
      case 'ultrarage': p.buffs.rage = now + 5000 * dm; p._ultraUntil = now + 5000 * dm; this._abFx(p, '#ff2a2a'); break;
      case 'rage3': p.buffs.rage = now + 8000 * dm; p._rage3Until = now + 8000 * dm; this._abFx(p, '#ff3a2a'); break;
      case 'earthquake': this.startEarthquake(); break;
      case 'knife': p._bladeRounds = 1; p.meleeId = 'zapblade'; p.weaponId = 'zapblade'; this._abFx(p, '#cfe8ff'); break;
      case 'katanacombo': p.meleeId = 'katana'; p.weaponId = 'katana'; p._fastMeleeUntil = now + 5000 * dm; this._abFx(p, '#f2f6fa'); break;
      case 'traps': p._trapCharges = 3; this._abFx(p, '#caa84a'); this.addFloatText(p.x, p.y - 22, '3 VALLEN', '#ffd24a', false); break;   // 3 vallen in de hand — zelf plaatsen
      case 'stunstrike': p._stunStrikeUntil = now + 5000 * dm; this._abFx(p, '#8fd0ff'); break;
      case 'stunpulse': this.stunPulse(p, 'me'); break;
      case 'souldrain': this.soulDrain(p, 'me'); break;
      case 'invisible': p._invisUntil = now + 6000 * dm; this._abFx(p, '#b06bff'); break;
      default: break;
    }
    // magisch effect om de speler heen + online zichtbaar maken voor de tegenstander
    this.spawnAbilityFx(p.x, p.y, this._abilityColor(p.ability));
    if (!this.vsBot && window.Net) Net.versusSend('ability', { ab: p.ability });
    if (window.Sfx) Sfx.play('pickup');
    if (window.UI && UI.renderAbilityBtn) UI.renderAbilityBtn();
    return true;
  },
  // character-level-bonussen op de lokale speler zetten (+HP, +speed, langere abilities)
  _applyCharLevel(p) {
    if (!p || !p.charId || !Storage.charStats) return;
    const st = Storage.charStats(p.charId);
    p.maxHp += st.hpBonus; p.hp = p.maxHp;
    p.speed *= st.speedMul;
    p.abilityDurMul = st.abilityDurMul;
    p.charLvl = st.lvl;
  },
  // harnas (blacksmith): grijze extra-HP-pool die schade opvangt; wordt per ronde bijgevuld
  _setupPlayerArmor(p) {
    const bonus = (window.Storage && Storage.armorHpBonus) ? Storage.armorHpBonus() : 0;
    p.armorMax = bonus; p.armorHp = bonus; p._armorAbsorbed = 0;
    p.armorRender = this._buildArmorRender();
  },
  _buildArmorRender() {
    if (!window.Storage || !Storage.equippedArmorInfo || typeof ARMOR_SETS === 'undefined') return null;
    const info = Storage.equippedArmorInfo(); const out = {}; let any = false;
    for (const slot in info) { const it = info[slot]; if (it.broken) continue; const s = ARMOR_SETS[it.set]; if (s) { out[slot] = { col: s.col, colDk: s.colDk, plume: s.plume, trim: s.trim, cape: s.cape }; any = true; } }
    return any ? out : null;
  },
  // de vlam-knop (of E): met vallen-in-de-hand plaats je er één; anders zet je je ability in
  abilityButton() {
    const p = this.player;
    if (p && !p.dead && (p._trapCharges | 0) > 0) return this.placeOneTrap(p, 'me');
    return this.useAbility();
  },
  _abilityColor(ab) {
    return ({ heal: '#5aff7a', highjump: '#8fd0ff', triplejump: '#8fd0ff', fireaura10: '#ff8a2a',
      rage10: '#ff5a3a', rage8: '#ff5a3a', ultrarage: '#ff2a2a', rage3: '#ff3a2a', zapdash: '#ffe27a',
      earthquake: '#c8a060', knife: '#bfe6ff', katanacombo: '#e8edf2', stunstrike: '#8fd0ff', stunpulse: '#8fd0ff', souldrain: '#a45bff', invisible: '#b06bff' })[ab] || '#c9a6ff';
  },
  // Monnik-ability: energiegolf die iedereen binnen bereik verdooft (werkt tegen bot én online)
  stunPulse(src, who) {
    if (!src) return;
    const now = this.time;
    const stunMs = Math.round(STUN_PULSE_MS * ((src.abilityDurMul) || 1));   // character-level: langere verdoving
    this._abFx(src, '#8fd0ff');
    this.spawnStunPulseFx(src.x, src.y);              // zichtbare uitdijende ring
    this.shake = Math.max(this.shake, 8);
    if (window.Sfx) Sfx.play('stomp');
    // training: verdoof ALLE spelers binnen bereik (stuur elk een thit met stun)
    if (this.training && who === 'me') {
      for (const id in this.trainPeers) {
        const pe = this.trainPeers[id];
        if (Math.abs(pe.x - src.x) <= STUN_PULSE_RANGE && Math.abs((pe.y || 0) - src.y) <= 70 && window.Net) {
          Net.trainSend('thit', { to: id, from: Net.trainMyId(), dir: (pe.x >= src.x ? 1 : -1), power: 12, vy: -4, dmg: 0, stun: stunMs });
        }
      }
      return;
    }
    // doelwit bepalen: bot (vsBot) of de online-tegenstander
    const opp = who === 'me' ? (this.vsBot ? this.bot : (this.vs ? this.vs.remote : null)) : this.player;
    if (!opp) return;
    const inRange = Math.abs((opp.x || 0) - src.x) <= STUN_PULSE_RANGE && Math.abs((opp.y || 0) - src.y) <= 70;
    const kdir = (opp.x >= src.x) ? 1 : -1;
    if (who === 'me' && !this.vsBot) {
      // online: stuur een treffer met verdoving (geen schade) mee — de tegenstander verwerkt de stun
      if (inRange && window.Net) Net.versusSend('hit', { dir: kdir, power: 12, vy: -4, dmg: 0, stun: stunMs });
      return;
    }
    // lokaal (speler vs bot, of bot vs speler): pas de verdoving direct toe
    if (inRange && !opp.dead && (opp.respawnInvuln == null || opp.respawnInvuln <= 0)) {
      opp.stunUntil = Math.max(opp.stunUntil || 0, now + stunMs);
      opp.knockVx = kdir * 12; opp.vy = Math.min(opp.vy || 0, -4); opp.onGround = false; opp.combo = 0;
    }
  },
  // Soul Drain (Skeleton Knight): steelt HP van de tegenstander — 20 schade aan de vijand + jij herstelt 20 HP.
  soulDrain(src, who) {
    if (!src) return;
    const drain = 20;
    const before = src.hp; src.hp = Math.min(src.maxHp, src.hp + drain);   // jezelf genezen (tot je HP-max)
    const healed = Math.round(src.hp - before);
    this._abFx(src, '#a45bff');
    if (healed > 0) this.addFloatText(src.x, src.y - 28, '+' + healed + ' HP', '#8aff9a', false);
    // doelwit: bot (vsBot) of de online-tegenstander, of — als de bot dit inzet — de speler
    const opp = who === 'me' ? (this.vsBot ? this.bot : (this.vs ? this.vs.remote : null)) : this.player;
    if (!opp || opp.dead || opp.alive === false) return;
    const kdir = (opp.x >= src.x) ? 1 : -1;
    this.spawnSoulTether(src, opp);                    // paarse ziel-sliert die van de tegenstander naar jou stroomt
    if (who === 'me' && !this.vsBot) {                 // online: stuur de treffer, de tegenstander verwerkt de 20 schade
      if (window.Net) Net.versusSend('hit', { dir: kdir, power: 5, vy: -2, dmg: drain });
      return;
    }
    if (who === 'me') this.applyHitToBot(kdir, 5, -2, drain);                          // speler vs bot
    else this.onVersusHit({ dir: kdir, power: 5, vy: -2, dmg: drain, pvp: 1 });        // bot vs speler
  },
  // paarse ziel-stroom van de tegenstander (opp) naar de skeletridder (src)
  spawnSoulTether(src, opp) {
    const x1 = src.x, y1 = src.y - 14, x2 = (opp.x || x1), y2 = (opp.y || y1) - 14;
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const tt = i / n, x = x2 + (x1 - x2) * tt, y = y2 + (y1 - y2) * tt - Math.sin(tt * Math.PI) * 12;
      const vx = (x1 - x2) * 0.010, vy = -0.4 - Math.random() * 0.5;
      this.particles.push(new Particle(x, y, vx, vy, i % 2 ? '#c89bff' : '#8a4bff', 460, 2));
    }
    this.spawnAbilityFx(x2, y2, '#a45bff');            // paarse flits op de tegenstander
    if (window.Sfx) Sfx.play('fireball');
  },
  // uitdijende blauwe schokring op (x,y) — visuele feedback van de stun-pulse
  spawnStunPulseFx(x, y) {
    if (!this.abilityFx) this.abilityFx = [];
    this.abilityFx.push({ x, y, born: this.time, dur: 520, color: '#8fd0ff', ring: STUN_PULSE_RANGE });
    for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.2832; this.particles.push(new Particle(x + Math.cos(a) * 8, y - 12 + Math.sin(a) * 8, Math.cos(a) * 3.4, Math.sin(a) * 3.4, i % 2 ? '#bfe9ff' : '#8fd0ff', 480, 2)); }
  },
  // magische ring + sprankels rond een positie (moment van ability-inzet)
  spawnAbilityFx(x, y, color) {
    if (!this.abilityFx) this.abilityFx = [];
    this.abilityFx.push({ x, y, born: this.time, dur: 650, color: color || '#c9a6ff' });
    for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.2832; this.particles.push(new Particle(x + Math.cos(a) * 10, y - 12 + Math.sin(a) * 10, Math.cos(a) * 1.7, Math.sin(a) * 1.7 - 0.4, color || '#c9a6ff', 520, 2)); }
    this.shake = Math.max(this.shake, 3);
  },
  // online: de tegenstander zette zijn ability in -> toon het effect om hém heen
  onVersusAbility(payload) {
    const r = this.vs && this.vs.remote; if (!r) return;
    this.spawnAbilityFx(r.x, r.y, this._abilityColor(payload && payload.ab));
  },
  _abFx(p, col) {
    for (let i = 0; i < 16; i++) this.particles.push(new Particle(p.x, p.y - 14, (Math.random() - 0.5) * 3, -Math.random() * 3, col, 420, 3));
    this.shake = Math.max(this.shake, 4);
  },

  // ==== VISUELE "JUICE": impact-feedback, KO-cinematic, sfeer ====
  addHitFeel(x, y, dir, dmg, power, localVictim, victim) {
    const big = (dmg >= 26) || (power >= 30);
    // freeze-frame — alleen wanneer JIJ raakt (impact-juice); niet als JIJ geraakt wordt, anders
    // hangt je eigen besturing even -> voelt stroef. Interval-slot tegen snelvuur (AK/vuurbal).
    if (dmg > 0 && !localVictim && this.time - (this._hitStopAt || 0) > 90) { this.hitStop = Math.max(this.hitStop, big ? 85 : 52); this._hitStopAt = this.time; }
    this.addImpact(x, y, dir, big);                                          // schokgolf + richting-vonken
    if (dmg > 0) this.addFloatText(x, y - 8, '-' + dmg, big ? '#ff5a3a' : '#ffe27a', big);
    if (victim) victim._flashUntil = this.time + 130;                        // witte hit-flash op het slachtoffer
    if (localVictim && dmg > 0) this.hurtFlash = Math.max(this.hurtFlash, big ? 240 : 150);   // rode schermrand als JIJ geraakt wordt
    if (big) this.smashFlash = Math.max(this.smashFlash, 90);
    this.shake = Math.max(this.shake, big ? 10 : 7);
  },
  addImpact(x, y, dir, big) {
    this.impacts.push({ x, y, born: this.time, dur: big ? 260 : 200, big });
    const n = big ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const spread = (Math.random() - 0.5) * 1.4, sp = 3 + Math.random() * 3.5;
      this.particles.push(new Particle(x, y, dir * sp * (0.6 + Math.random()) + spread, -1 + spread - Math.random() * 2, i % 2 ? '#ffffff' : '#ffe27a', 300, big ? 3 : 2));
    }
  },
  addFloatText(x, y, text, color, big) {
    this.floatTexts.push({ x, y, vy: -1.1, text, color, born: this.time, dur: 700, scale: big ? 1.7 : 1.1 });
  },
  // KO-cinematic op de ring-out-plek: witte flits + schokgolf + "SMASH!"/"K.O."
  triggerKO(x, y, won) {
    const gy = (this.vsMap && this.vsMap.fallY) || 232;
    y = Math.max(24, Math.min(y, gy - 24));                                  // op het scherm houden (vallers zitten ver onderin)
    this.ko = { x, y, born: this.time, won: !!won };
    this.smashFlash = Math.max(this.smashFlash, 210);
    this.shake = Math.max(this.shake, 14);
    this.addFloatText(x, y - 18, won ? 'SMASH!' : 'K.O.', won ? '#5aff7a' : '#ff5a5a', true);
    for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.2832, sp = 3 + Math.random() * 4; this.particles.push(new Particle(x, y - 12, Math.cos(a) * sp, Math.sin(a) * sp - 1, i % 2 ? '#ffffff' : '#ffe27a', 520, 3)); }
    if (window.Sfx) Sfx.play('explos');
  },
  // sfeer-deeltjes per map (embers/bladeren/zeenevel/stof) — geven de arena leven
  _updateAmbient(dt) {
    const map = this.vsMap; if (!map) return;
    const kind = map.vulcan ? 'ember' : (map.jungle2 ? 'leaf' : ((map.beach || map.pirate) ? 'spray' : ((map.airplane || map.castle) ? 'spark' : ((map.cave || map.dohyo) ? 'dust' : null))));
    if (kind) {
      this._ambClock += dt;
      if (this._ambClock >= 150 && this.ambient.length < 55) {
        this._ambClock = 0;
        const W = this.vsMapW || 720, x = Math.random() * W, gy = (map.fallY || 232);
        if (kind === 'ember') this.ambient.push({ x, y: gy + 8, vx: (Math.random() - 0.5) * 0.4, vy: -0.6 - Math.random() * 0.9, c: Math.random() < 0.5 ? '#ff7a2a' : '#ffd24a', s: 2, born: this.time, dur: 2600 });
        else if (kind === 'leaf') this.ambient.push({ x, y: -50 - Math.random() * 60, vx: (Math.random() - 0.5) * 0.7, vy: 0.5 + Math.random() * 0.6, c: Math.random() < 0.5 ? '#4a8c1f' : '#6abe30', s: 2, born: this.time, dur: 4600, sway: Math.random() * 6.28 });
        else if (kind === 'spray') this.ambient.push({ x, y: gy - 4, vx: (Math.random() - 0.5) * 0.5, vy: -1 - Math.random() * 1.2, c: '#bfe9ff', s: 2, born: this.time, dur: 1400 });
        else if (kind === 'spark') this.ambient.push({ x, y: Math.random() * 200 - 70, vx: (Math.random() - 0.5) * 0.3, vy: -0.2 - Math.random() * 0.3, c: '#ffffff', s: 1, born: this.time, dur: 2800 });
        else this.ambient.push({ x, y: Math.random() * 180, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2, c: '#7a808c', s: 1, born: this.time, dur: 3200 });
      }
    }
    if (this.ambient.length) {
      for (const a of this.ambient) { a.x += a.vx * this.dtScale; a.y += a.vy * this.dtScale; if (a.sway != null) { a.sway += 0.05 * this.dtScale; a.x += Math.sin(a.sway) * 0.3; } }
      this.ambient = this.ambient.filter((a) => this.time - a.born < a.dur);
    }
  },
  _flashPal(pal) { const o = {}; for (const k in pal) o[k] = '#ffffff'; return o; },
  // de bot zet zijn eigen ability in (spiegel van useAbility, maar met de bot als bron en de speler als doelwit)
  botUseAbility() {
    const b = this.bot; if (!b || b.dead || !b.ability || b.abCharge < 1) return false;
    if (this.vs && (this.vs.countdown > 0 || this.vs.roundFreezeUntil > this.time)) return false;
    b.abCharge = 0; b._abCd = this.time + 1600;
    const now = this.time;
    switch (b.ability) {
      case 'zapdash': this.botZapDash(); break;
      case 'heal': b.hp = b.maxHp; this._abFx(b, '#5aff7a'); break;
      case 'highjump': b.jumpMul = 1.4; this._abFx(b, '#8fd0ff'); break;
      case 'fireaura10': b.fireAura = true; b.auraUntil = now + 10000; this._abFx(b, '#ff8a2a'); break;
      case 'triplejump': b.maxJumps = Math.max(b.maxJumps, 2) + 1; b.jumps = b.maxJumps; this._abFx(b, '#8fd0ff'); break;
      case 'rage10': b.buffs.rage = now + 10000; this._abFx(b, '#ff5a3a'); break;
      case 'rage8': b.buffs.rage = now + 8000; this._abFx(b, '#ff5a3a'); break;
      case 'ultrarage': b.buffs.rage = now + 5000; b._ultraUntil = now + 5000; this._abFx(b, '#ff2a2a'); break;
      case 'rage3': b.buffs.rage = now + 8000; b._rage3Until = now + 8000; this._abFx(b, '#ff3a2a'); break;
      case 'earthquake': this.botEarthquake(); break;
      case 'knife': b._bladeRounds = 1; b.meleeId = 'zapblade'; b.weaponId = 'zapblade'; this._abFx(b, '#cfe8ff'); break;
      case 'katanacombo': b.meleeId = 'katana'; b.weaponId = 'katana'; b._fastMeleeUntil = now + 5000; this._abFx(b, '#f2f6fa'); break;
      case 'traps': this.placeTraps(b, 'bot'); this._abFx(b, '#caa84a'); break;
      case 'stunstrike': b._stunStrikeUntil = now + 5000; this._abFx(b, '#8fd0ff'); break;
      case 'stunpulse': this.stunPulse(b, 'bot'); break;
      case 'souldrain': this.soulDrain(b, 'bot'); break;
      case 'invisible': b._invisUntil = now + 6000; this._abFx(b, '#b06bff'); break;
      default: break;
    }
    this.spawnAbilityFx(b.x, b.y, this._abilityColor(b.ability));
    if (window.Sfx) Sfx.play('pickup');
    return true;
  },
  // bot-versie van Ryans zap-dash: dasht naar de speler + bliksemboog
  botZapDash() {
    const b = this.bot, opp = this.player; if (!opp) return;
    const dir = (opp.x >= b.x) ? 1 : -1; b.dir = dir;
    const x0 = b.x;
    const nx = Math.max(8, Math.min(this.vsMapW - 8, opp.x - dir * 22));
    const n = 12;
    for (let i = 0; i <= n; i++) { const tx = x0 + (nx - x0) * (i / n), ty = b.y - 14 + (Math.random() - 0.5) * 10; this.particles.push(new Particle(tx, ty, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, i % 2 ? '#bfe6ff' : '#ffffff', 240 + Math.random() * 120, 2)); }
    for (let i = 0; i < 6; i++) this.particles.push(new Particle(nx, b.y - 14, (Math.random() - 0.5) * 4, -Math.random() * 3, i % 2 ? '#7fd4ff' : '#fff7c2', 320, 3));
    this.zapFx = { x0, y0: b.y - 14, x1: nx, y1: b.y - 14, born: this.time, dur: 240 };
    b.x = nx; b.knockVx = dir * 6;
    if (window.Sfx) Sfx.play('zap');
    this.shake = Math.max(this.shake, 6);
    if (Math.abs(opp.x - b.x) < 40 && Math.abs((opp.y || b.y) - b.y) < 40) this.onVersusHit({ dir, power: 26, vy: -7, dmg: 22 });
  },
  // bot-versie van Just' aardbeving: de speler wordt weggeschud
  botEarthquake() {
    this._selfQuakeUntil = this.time + 5000;
    if (window.Sfx) Sfx.play('stomp');
  },
  // Ryan: zap-dash naar de tegenstander -> schade + knockback
  zapDash() {
    const p = this.player;
    const opp = this.training ? this.trainNearestPeer(260) : (this.vsBot ? this.bot : (this.vs ? this.vs.remote : null));
    if (!opp) return;
    const dir = (opp.x >= p.x) ? 1 : -1; p.dir = dir;
    const x0 = p.x;                                     // start van de dash
    const target = opp.x - dir * 22;
    const nx = Math.max(8, Math.min(this.vsMapW - 8, target));
    // zap-spoor: elektrische vonken langs het pad
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const tx = x0 + (nx - x0) * (i / n), ty = p.y - 14 + (Math.random() - 0.5) * 10;
      this.particles.push(new Particle(tx, ty, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, i % 2 ? '#bfe6ff' : '#ffffff', 240 + Math.random() * 120, 2));
    }
    for (let i = 0; i < 6; i++) this.particles.push(new Particle(nx, p.y - 14, (Math.random() - 0.5) * 4, -Math.random() * 3, i % 2 ? '#7fd4ff' : '#fff7c2', 320, 3));
    // lingering bliksemboog van start -> eind (getekend in renderVersus)
    this.zapFx = { x0, y0: x0 === nx ? p.y - 14 : p.y - 14, x1: nx, y1: p.y - 14, born: this.time, dur: 240 };
    p.x = nx; p.knockVx = dir * 6;
    if (window.Sfx) Sfx.play('zap');
    this.shake = Math.max(this.shake, 6);
    // raak de tegenstander als 'ie binnen bereik is
    if (Math.abs(opp.x - p.x) < 40 && Math.abs((opp.y || p.y) - p.y) < 40) {
      if (this.training) { if (opp.id && window.Net) Net.trainSend('thit', { to: opp.id, from: Net.trainMyId(), dir, power: 26, vy: -7, dmg: 22 }); }
      else if (this.vsBot) this.applyHitToBot(dir, 26, -7, 22);
      else if (window.Net) Net.versusSend('hit', { dir, power: 26, vy: -7, dmg: 22 });
    }
  },
  // Just: aardbeving — map trilt, tegenstander wordt weggeschud (kan niet stil staan/springen)
  startEarthquake() {
    this._quakeUntil = this.time + 5000;
    if (!this.vsBot && window.Net) Net.versusSend('quake', { until: 5000 });   // online: tegenstander schudt zichzelf
    if (window.Sfx) Sfx.play('stomp');
  },
  updateEarthquake(dt) {
    this.shake = Math.max(this.shake, 7);
    if (this.vsBot && this.bot && !this.bot.dead && this.bot.respawnInvuln <= 0) {
      const b = this.bot;
      b.knockVx += (Math.random() - 0.5) * 6; b.vx = (b.vx || 0);
      b.x += (Math.random() - 0.5) * 3 * this.dtScale;
      if (b.onGround && Math.random() < 0.08) { b.vy = -4 - Math.random() * 3; b.onGround = false; }   // hij stuitert
      b._quakeStun = this.time + 120;   // bot kan niet gecontroleerd springen
    }
  },

  applyDrop(pl, d) {
    if (window.Sfx && pl === this.player) Sfx.play('pickup');
    for (let i = 0; i < 8; i++) this.particles.push(new Particle(d.x, d.y, (Math.random() - 0.5) * 2, -Math.random() * 2, '#ffe27a', 340, 2));
    // een ander vuurwapen pakken vervangt het vorige geweer (AK47/Deagle/Kruisboog)
    if (['fireball', 'rocket', 'cannon', 'giant', 'ninjastar', 'deagle', 'crossbow'].includes(d.kind)) { pl.gunAmmo = 0; if (pl.rangedId === 'ak47' || pl.rangedId === 'deagle' || pl.rangedId === 'crossbow') pl.rangedId = null; }
    if (d.kind === 'weapon') { pl.meleeId = d.wid; pl.weaponId = pl.rangedId || d.wid; pl._weaponUntil = this.time + SMASH_WEAPON_TIME; }
    else if (d.kind === 'giant') {                                    // REUS: gigantisch, 300 HP, 8s, kan niet aanvallen (wel schade krijgen)
      pl._baseMaxHp = pl._baseMaxHp || pl.maxHp;
      pl.giant = true; pl.maxHp = GIANT_HP; pl.hp = GIANT_HP; pl._giantUntil = this.time + GIANT_MS;
      pl.fireballs = 0; pl.smashRockets = 0; pl.cannon = 0; pl.gunAmmo = 0; pl.rangedId = null;
      for (let i = 0; i < 14; i++) this.particles.push(new Particle(pl.x, pl.y - 14, (Math.random() - 0.5) * 3, -Math.random() * 3, '#7affa0', 420, 3));
    }
    else if (d.kind === 'ak47') { pl.rangedId = 'ak47'; pl.gunAmmo = SMASH_AK_AMMO; pl.weaponId = 'ak47'; }   // AK47 met 30 kogels
    else if (d.kind === 'deagle') { pl.rangedId = 'deagle'; pl.gunAmmo = 3; pl.weaponId = 'deagle'; }       // Desert Eagle: 3 kogels
    else if (d.kind === 'crossbow') { pl.rangedId = 'crossbow'; pl.gunAmmo = 7; pl.weaponId = 'crossbow'; }  // Kruisboog: 7 pijlen
    else if (d.kind === 'chainsaw') { pl.meleeId = 'chainsaw'; pl.weaponId = 'chainsaw'; }                   // Kettingzaag: melee-wapen
    else if (d.kind === 'fireball') pl.fireballs = SMASH_FIREBALL_SHOTS;
    else if (d.kind === 'rocket') { pl.smashRockets = SMASH_ROCKETS; pl.rangedId = 'rocketlauncher'; pl.weaponId = 'rocketlauncher'; }   // echt een raketwerper vasthouden
    else if (d.kind === 'ninjastar') { pl.stars = SMASH_STARS; pl.rangedId = 'ninjastar'; pl.weaponId = 'ninjastar'; }                   // 3 ninja-sterren, ster in de hand
    else if (d.kind === 'smoke') { pl._invisUntil = this.time + 3000; this.spawnSmokePuff(pl.x, pl.y - 12); if (window.Sfx) Sfx.play('swing'); }   // Smoke Vanish: 3s onzichtbaar + rookwolk
    else if (d.kind === 'health') pl.hp = Math.min(pl.maxHp, pl.hp + 40);
    else if (d.kind === 'rage') pl.buffs.rage = this.time + POWERUPS.rage.dur;
    else if (d.kind === 'speed') pl.buffs.speed = this.time + POWERUPS.speed.dur;
    else if (d.kind === 'dragon') {
      if (!this._dragonUsed) {                                        // max 1 draak per match
        if (pl === this.player) { this.spawnDragon('me'); if (window.Net && !this.vsBot) Net.versusSend('dragon', {}); }
        else { this.spawnDragon('bot'); }
      }
    }
    else if (d.kind === 'lightning') {
      if (pl === this.player) {
        if (this.vsBot) { if (this.bot && this.bot.respawnInvuln <= 0 && !this.bot.dead) { this.bot.stunUntil = this.time + SMASH_LIGHTNING_STUN; this.strikeLightning(this.bot.x, this.bot.y); } }
        else { if (window.Net) Net.versusSend('stun', {}); const r = this.vs.remote; this.strikeLightning(r.x, r.y); }
      } else {                                   // bot pakte de bliksem -> stun de speler
        if (this.player.respawnInvuln <= 0 && !this.player.dead) { this.player.stunUntil = this.time + SMASH_LIGHTNING_STUN; this.strikeLightning(this.player.x, this.player.y); }
      }
    }
    else if (d.kind === 'rock') {
      if (pl === this.player) {
        const tx = this.vsBot ? (this.bot ? this.bot.x : pl.x) : this.vs.remote.x;
        const xs = this.rockTargetXs(tx); this.castRocks(xs);
        if (window.Net && !this.vsBot) Net.versusSend('rocks', { xs });
      } else { const xs = this.rockTargetXs(this.player.x); this.castRocks(xs); }   // bot pakte de steen
    }
    else if (d.kind === 'beachball') { pl.beachball = 1; }                          // strandbal (1 schot)
    else if (d.kind === 'coco') { pl.coco = COCO_AMMO; }                            // kokosbom
    else if (d.kind === 'boom') { pl.boomerang = BOOM_AMMO; }                       // boemerang
    else if (d.kind === 'dart') { pl.dart = DART_AMMO; }                            // gifdart
    else if (d.kind === 'cannon') { pl.cannon = (pl.cannon || 0) + 1; }            // 1 kanonskogel
    else if (d.kind === 'shield') { pl.shieldHp = SMASH_SHIELD; }                  // +50 hp schild
    else if (d.kind === 'heli') {                                                  // gevechtsheli: instappen
      pl.heli = true; pl.heliMinigun = HELI_MINIGUN; pl.heliRockets = HELI_ROCKETS;
      pl._heliFireCd = 0; pl._heliRocketCd = 0;
      pl.fireballs = 0; pl.smashRockets = 0; pl.cannon = 0; pl.gunAmmo = 0; pl.rangedId = null;
      pl.vy = 0; pl.onGround = false; pl.y -= 18;                                  // even opstijgen
      for (let i = 0; i < 14; i++) this.particles.push(new Particle(pl.x, pl.y + 6, (Math.random() - 0.5) * 3, Math.random() * 2, '#cfd6df', 360, 2));
    }
    else if (d.kind === 'nuke') {                                                  // NUKE: 15s afteltimer voor beide spelers
      if (!this._nukeUsed) {
        this._nukeUsed = true;
        this.nuke = { mine: (pl === this.player), until: this.time + NUKE_MS };    // 'mine' = de LOKALE speler is de drager (beschermd)
        if (pl === this.player && window.Net && !this.vsBot) Net.versusSend('nuke', {});   // tegenstander z'n timer starten
        this.smashFlash = Math.max(this.smashFlash || 0, 120); this.shake = Math.max(this.shake, 8);
        for (let i = 0; i < 22; i++) this.particles.push(new Particle(pl.x, pl.y - 14, (Math.random() - 0.5) * 4, -Math.random() * 3.5, i % 2 ? '#7dff5a' : '#ffe27a', 520, 3));
        if (window.Sfx) Sfx.play('gorilla');
      }
    }
  },

  onVersusDrop(p) {
    if (!this.drops) this.drops = [];
    if (this.drops.some((d) => d.id === p.id)) return;
    this.drops.push({ id: p.id, kind: p.kind, x: p.x, y: p.y, wid: p.wid, born: this.time, taken: false });
  },
  // tegenstander pakte de nuke -> jouw timer start (jij bent het doelwit als je 'm niet verslaat)
  onVersusNuke() {
    if (this._nukeUsed && !this.nuke) { /* al gebruikt en al gedetoneerd/gedefused */ }
    this._nukeUsed = true;
    this.nuke = { mine: false, until: this.time + NUKE_MS };
    this.smashFlash = Math.max(this.smashFlash || 0, 120); this.shake = Math.max(this.shake, 8);
    if (window.Sfx) Sfx.play('gorilla');
  },
  // nuke-afteltimer: loopt 'ie af terwijl de drager nog leeft -> de tegenstander van de drager gaat dood
  _updateNuke() {
    const nk = this.nuke; if (!nk || this.time < nk.until) return;
    this.nuke = null;
    this._nukeBoom();
    if (this.vsBot) {
      if (nk.mine) { if (this.bot && !this.bot.dead) { this.bot.dead = true; this.onVersusFell(); } }   // drager = speler -> bot dood
      else { if (!this.player.dead) this.localFell(); }                                                  // drager = bot -> speler dood
    } else if (!nk.mine && !this.player.dead) {
      this.localFell();   // ik ben het doelwit -> ik ga dood (stuurt 'fell'); is de drager mij, dan gaat de ander op z'n eigen client dood
    }
  },
  _nukeBoom() {
    this.smashFlash = Math.max(this.smashFlash || 0, 240);
    this.hurtFlash = Math.max(this.hurtFlash || 0, 200);
    this.shake = Math.max(this.shake, 18);
    const spots = [this.player];
    if (this.vsBot && this.bot) spots.push(this.bot); else if (this.vs && this.vs.remote) spots.push(this.vs.remote);
    for (const e of spots) for (let i = 0; i < 40; i++)
      this.particles.push(new Particle(e.x + (Math.random() - 0.5) * 40, e.y - 14 + (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 8, -Math.random() * 7, i % 3 ? '#ffb03a' : '#ff5a2a', 720, 4));
    if (window.Sfx) Sfx.play('gorilla');
  },
  onVersusPickup(p) {
    if (!this.drops) return;
    for (const d of this.drops) if (d.id === p.id) d.taken = true;
  },

  beginRoundFreeze(msg) {
    this.vs.roundFreezeUntil = this.time + 2200;       // ~2,2s freeze
    this.vs.roundMsg = msg;
    const iWon = !!(msg && msg.indexOf('JIJ') === 0);   // ronde-winnaar-naam voor de banner
    this.vs.roundWonByMe = iWon;
    this.vs.roundWinName = iWon
      ? ((window.Net && Net.isLoggedIn && Net.isLoggedIn()) ? Net.nickname() : tl('Jij'))
      : (this.vsBot ? 'Bot' : (this.vs.oppName || tl('Tegenstander')));
    if (window.Sfx) Sfx.play((msg && msg.indexOf('JIJ') === 0) ? 'roundwin' : 'roundlose');
    this.dragons = [];                                  // draken stoppen bij rondewissel
    this.rocks = [];
    this.caveWall = null; this.caveArmed = -1; this._caveArmAt = this.time + CAVE_ARM_MS;
    if (this.vulcan) { this.vulcan.state = 'idle'; this.vulcan.nextAt = this.time + VULCAN_EVERY; }
    if (this.tentacle) { this.tentacle.state = 'idle'; this.tentacle.nextAt = this.time + PIRATE_TENT_EVERY; }
    if (this.tide) { this.tide.state = 'idle'; this.tide.level = 0; this.tide.nextAt = this.time + BEACH_TIDE_EVERY; }
    this.ball = null;
    this.shake = Math.max(this.shake, 7);
  },

  // Anti-vluchten: staat iemand minstens 2 rondes voor én heeft die 10s geen schade aan de tegenstander gedaan, dan
  // begint de leider zélf schade te krijgen (loopt op) + de melding "NIET VLUCHTEN — VAL AAN!". Zodra hij weer raakt,
  // stopt het meteen. Geen ring/zones meer; alleen de vluchtende leider wordt gestraft.
  updateFleePunish(dt) {
    const v = this.vs;
    if (!v || v.over || v.timeUp || v.countdown > 0 || !v.roundPlayStart) return;
    const lead = (v.myScore || 0) - (v.oppScore || 0);
    let target = null, iAmFleer = false, since = 0;
    if (lead >= 2) {                                    // ik sta voor -> mijn uitgaande schade telt
      since = this.time - (v.myLastHit || v.roundPlayStart);
      if (since > FLEE_PUNISH_MS) { target = this.player; iAmFleer = true; }
    } else if (lead <= -2) {                            // tegenstander staat voor -> diens schade aan mij telt
      since = this.time - (v.oppLastHit || v.roundPlayStart);
      if (since > FLEE_PUNISH_MS) target = this.vsBot ? this.bot : null;   // online: de remote straft zichzelf op z'n eigen client
    }
    if (!target || target.dead || target.respawnInvuln > 0) return;
    const over = since - FLEE_PUNISH_MS;                                    // hoe lang al aan het vluchten (na de 10s)
    const dps = Math.min(FLEE_DPS_MAX, FLEE_DPS_BASE + over / 1000 * 4);    // schade loopt op hoe langer hij blijft rennen
    target.hp = Math.max(0, target.hp - dps * dt / 1000);                   // KO bij hp<=0 wordt door de bestaande check afgehandeld
    if (iAmFleer) {                                     // alleen de vluchtende leider zelf ziet de waarschuwing + voelt de flits
      this.hurtFlash = Math.max(this.hurtFlash || 0, 60);
      this.shake = Math.max(this.shake, 3);
      if (Math.random() < 0.4) this.spawnBlood(this.player.x, this.player.y - 14);
      if (!v._fleeWarnAt || this.time - v._fleeWarnAt > 2200) {
        v._fleeWarnAt = this.time;
        if (window.UI && UI.showBigMsg) UI.showBigMsg(tl('NIET VLUCHTEN — VAL AAN!'), 'lose', 1500);
        if (window.Sfx) Sfx.play('hit');
      }
    }
  },

  checkVersusHit() {
    const p = this.player, r = this.vs.remote;
    if (p.giant || p.heli) return;                    // reus/heli gebruiken geen melee-swing
    if (!r.alive) return;
    if (p.respawnInvuln > 0) return;                  // knippert (net gespawnd) -> je kunt zelf ook niet raken/comboën
    // alleen op het moment dat een NIEUWE mep begint (1 mep = 1 treffer)
    const sw = p.swingUntil || 0;
    if (sw && sw !== this.vs.lastSwing && this.time < sw) {
      this.vs.lastSwing = sw;
      const reach = Math.max(40, (WEAPONS[p.meleeId] && WEAPONS[p.meleeId].range) || 40);   // lang wapen (speer/hellebaard) reikt verder
      const dx = (r.x - p.x) * p.dir;
      const close = Math.abs(r.x - p.x) < 24;        // bijna in elkaar -> altijd raak (ook als je net de andere kant op kijkt)
      if ((close || (dx > -16 && dx < reach)) && Math.abs(r.y - p.y) < 34) {
        const kdir = (r.x >= p.x ? 1 : -1);
        // combo: opeenvolgende treffers binnen het venster -> hoger (x1..x5), meer schade
        p.combo = (this.time < (p.comboUntil || 0)) ? Math.min(COMBO_MAX, (p.combo || 0) + 1) : 1;
        p.comboUntil = this.time + COMBO_WINDOW;
        const wd = (WEAPONS[p.meleeId] ? WEAPONS[p.meleeId].damage : 34) * (p.meleeMul || 1) * p.rageMul(this.time) * comboMul(p.combo);
        const dmg = Math.round(wd * 0.45);                            // versus-melee-schade
        const kp = 15 + Math.max(0, p.combo - 1) * 8;                 // vanaf x2 fors meer knockback (x1=15 .. x5=47)
        const kvy = -5.5 - Math.max(0, p.combo - 1) * 0.7;            // en iets meer omhoog
        const sst = (p._stunStrikeUntil && this.time < p._stunStrikeUntil) ? 1000 : 0;   // stun-slag: verdoof de tegenstander
        if (sst) p._stunStrikeUntil = 0;                                                  // eenmalig
        if (this.vsBot) { this.applyHitToBot(kdir, kp, kvy, dmg, true); if (sst && this.bot && !this.bot.dead) this.bot.stunUntil = Math.max(this.bot.stunUntil || 0, this.time + sst); }   // bot wegslaan + schade; melee = parrybaar
        else { Net.versusSend('hit', { dir: p.dir, power: kp, vy: kvy, dmg: dmg, melee: 1, stun: sst }); this.addHitFeel(r.x, r.y - 16, kdir, dmg, kp, false, r); }
        if (!p._trapCharges) p.abCharge = Math.min(1, p.abCharge + (0.05 + 0.03 * Math.max(0, p.combo - 1)) / (p.abChargeMul || 1));   // ability laadt sneller op met combos (niet terwijl je vallen vasthoudt)
        // combo-XP (alleen online — geen XP-farmen tegen de bot)
        const cx = comboXp(p.combo);
        p._lastComboXp = this.vsBot ? 0 : cx;
        if (!this.vsBot) this._comboXp = (this._comboXp || 0) + cx;
        this.spawnBlood(r.x, r.y - 16);
        if (window.Sfx) Sfx.play('hit');
        this.shake = Math.max(this.shake, 6);
      }
      // mep raakt ook de kooi-gorilla (Jungle)
      const g = this.gorilla;
      if (g && g.alive) {
        const gdx = (g.x - p.x) * p.dir;
        if (gdx > -10 && gdx < reach && Math.abs(g.y - p.y) < 38) {
          const gwd = (WEAPONS[p.meleeId] ? WEAPONS[p.meleeId].damage : 34) * (p.meleeMul || 1) * (p.hasBuff('rage', this.time) ? 1.6 : 1);
          this.hitGorilla(Math.round(gwd * 0.45));
        }
      }
    }
  },

  // ===== BOT (lokale AI-tegenstander) =====
  updateBot(dt) {
    const b = this.bot, v = this.vs;
    if (b.respawnInvuln > 0) b.respawnInvuln -= dt;
    if (b.giant && this.time >= (b._giantUntil || 0)) this._endGiant(b);   // reus-timer bot
    const inp = this.botThink();
    b.update(dt, this, inp);
    // bot meebewegen op een horizontaal platform
    if (b.onGround) for (const pf of this.platforms) {
      if (pf.dx && Math.abs(b.x - pf.x) < pf.w / 2 + b.w / 2 && Math.abs(b.y - pf.y) < 4) { b.x += pf.dx; break; }
    }
    // bot-stand spiegelen naar de 'remote' (voor tekening + treffer-checks)
    const r = v.remote;
    r.x = r.tx = b.x; r.y = r.ty = b.y; r.dir = b.dir; r.onGround = b.onGround;
    r.attacking = this.time < b.attackAnimUntil; r.swingWeapon = (this.time < (b.swingUntil || 0)) ? b.swingWeapon : null;
    r.heldWeapon = b.weaponId || b.meleeId || 'bat';
    r._fireHold = b.fireballs > 0;                       // vuurbal-in-de-hand mee-spiegelen
    r.stunned = b.stunUntil && this.time < b.stunUntil;
    r.flat = b.flatUntil && this.time < b.flatUntil;
    r.rage = b.hasBuff('rage', this.time); r.burn = b.burnUntil > this.time;
    r.shieldHp = b.shieldHp || 0; r.giant = !!b.giant; r.heli = !!b.heli;
    r.walkPhase = b.walkPhase; r.alive = !b.dead; r.charId = b.charId;
    r.hp = b.hp; r.maxHp = b.maxHp; r.ducking = b.ducking;
    r.iv = !!(b._invisUntil && this.time < b._invisUntil);   // ninja onzichtbaar -> jij ziet 'm niet
    r.rooted = !!(b._rootedUntil && this.time < b._rootedUntil);   // in een val vast
    r._flashUntil = b._flashUntil || 0;                 // witte hit-flash mee-spiegelen
    r._fireHandUntil = b._fireHandUntil || 0;           // vuur-in-de-hand-flits mee-spiegelen

    // bot schiet: vuurwapen (beide-wapens) of fireball/rocket (smash)
    const p2 = this.player;
    const canShoot = b.onGround && !b.dead && this.time >= (b._shootCd || 0) && !p2.dead &&
      Math.abs(p2.y - b.y) < 22 && Math.abs(p2.x - b.x) > 30;
    if (canShoot) {
      const sdir = p2.x >= b.x ? 1 : -1;
      let bl = null;
      if (this.vsMode === 'both' && b._rangedId) {
        const wd = WEAPONS[b._rangedId] || WEAPONS.pistol;
        bl = new Bullet(b.x + sdir * 14, b.y - 16, sdir * (wd.bulletSpeed || 7), wd.damage, 0);
        b._shootCd = this.time + ((this.botCfg && this.botCfg.shootCd) || 1100);
      } else if (this.vsMode === 'smash' && b.fireballs > 0) {
        bl = new Bullet(b.x + sdir * 14, b.y - 16, sdir * 7.5, 0, 0); bl.kind = 'fire'; bl.hitDmg = 22; bl.power = 14;
        b.fireballs--; b._shootCd = this.time + 600;
      } else if (this.vsMode === 'smash' && b.stars > 0) {
        bl = new Bullet(b.x + sdir * 14, b.y - 16, sdir * 11, 0, 0); bl.kind = 'star'; bl.hitDmg = SMASH_STAR_DMG; bl.power = 10;
        b.stars--; b._shootCd = this.time + 320;
        if (b.stars <= 0) { b.rangedId = null; if (b.weaponId === 'ninjastar') b.weaponId = b.meleeId || 'bat'; }
      } else if (this.vsMode === 'smash' && b.smashRockets > 0) {
        bl = new Bullet(b.x + sdir * 14, b.y - 16, sdir * 6, 0, 0); bl.kind = 'rocket'; bl.hitDmg = 40; bl.power = 26;
        b.smashRockets--; b._shootCd = this.time + 950;
        if (b.smashRockets <= 0 && b.weaponId === 'rocketlauncher') b.weaponId = b.meleeId || 'bat';
      } else if (this.vsMode === 'smash' && b.cannon > 0) {
        bl = new Bullet(b.x + sdir * 14, b.y - 16, sdir * 8, 0, 0); bl.kind = 'cannon'; bl.hitDmg = 18; bl.power = 42;
        b.cannon--; b._shootCd = this.time + 900;
      } else if (this.vsMode === 'smash' && b.gunAmmo > 0 && b.rangedId === 'ak47') {
        bl = new Bullet(b.x + sdir * 14, b.y - 16, sdir * 9, 0, 0); bl.kind = 'gun'; bl.hitDmg = 13; bl.power = 7;
        b.gunAmmo--; b._shootCd = this.time + 220;
        if (b.gunAmmo <= 0) { b.rangedId = null; b.weaponId = b.meleeId || 'bat'; }
      }
      if (bl) { b.dir = sdir; this.botBullets.push(bl); if (bl.kind === 'fire') this.spawnFireCast(b, b.x + sdir * 14, b.y - 16, sdir); else this.spawnMuzzleFlash(b.x + sdir * 14, b.y - 16, sdir); if (window.Sfx) Sfx.play(bl.kind === 'cannon' ? 'cannon' : bl.kind === 'rocket' ? 'rocket' : bl.kind === 'fire' ? 'fireball' : 'gun'); }
    }
    // bot-kogels bewegen + de speler raken
    if (this.botBullets && this.botBullets.length) {
      for (const bl of this.botBullets) {
        if ((bl.kind === 'fire' || bl.kind === 'rocket') && !this.player.dead && this.player.respawnInvuln <= 0) {
          if (this.player.heli && Math.sign(this.player.x - bl.x) === Math.sign(bl.vx)) this._homeBullet(bl, this.player.x, this.player.y - 12, bl.kind === 'rocket' ? 6 : 7.5);
          else this._softAim(bl, this.player);
        }
        bl.x += bl.vx * this.dtScale; bl.y += (bl.vy || 0) * this.dtScale; bl.life += dt;
      }
      for (const bl of this.botBullets) {
        const rw = bl.kind === 'rocket' ? 16 : (bl.kind === 'cannon' ? 18 : 11);
        const rh = bl.kind === 'rocket' ? 20 : (bl.kind === 'cannon' ? 22 : 16);
        if (bl.alive && this.player.respawnInvuln <= 0 && !this.player.dead &&
            Math.abs(bl.x - this.player.x) < rw && Math.abs(bl.y - (this.player.y - 16)) < rh) {
          bl.alive = false;
          const dmg = (bl.hitDmg != null) ? bl.hitDmg : Math.round((bl.damage || 20) * 0.4);
          this.onVersusHit({ dir: Math.sign(bl.vx) || 1, power: (bl.power != null ? bl.power : 9), vy: bl.kind === 'cannon' ? -8 : -3.5, dmg: dmg, pvp: 1 });
          this.spawnBlood(bl.x, bl.y);
        }
      }
      this.botBullets = this.botBullets.filter((bl) => bl.alive && bl.life < 1500 && bl.x > -20 && bl.x < this.vsMapW + 20);
    }

    // bot (Just): stamp-schade op de speler bij de landing
    if (b._poundHit) {
      b._poundHit = false;
      if (Math.abs(this.player.x - b.x) < 40 && Math.abs(this.player.y - b.y) < 30 && this.player.respawnInvuln <= 0 && !this.player.dead) {
        const kd = this.player.x >= b.x ? 1 : -1;
        this.onVersusHit({ dir: kd, power: 16, vy: -6, dmg: 24, pvp: 1 });
        this.shake = Math.max(this.shake, 8);
      }
    }

    // bot's mep raakt de speler?
    const bsw = b.swingUntil || 0;
    if (bsw && bsw !== v.botLastSwing && this.time < bsw) {
      v.botLastSwing = bsw;
      const dxp = (this.player.x - b.x) * b.dir;
      const bClose = Math.abs(this.player.x - b.x) < 24;     // bijna in elkaar -> altijd raak
      if ((bClose || (dxp > -16 && dxp < 40)) && Math.abs(this.player.y - b.y) < 34 && this.player.respawnInvuln <= 0 && !this.player.dead && b.respawnInvuln <= 0) {
        const kd = this.player.x >= b.x ? 1 : -1;
        b.combo = (this.time < (b.comboUntil || 0)) ? Math.min(COMBO_MAX, (b.combo || 0) + 1) : 1;
        b.comboUntil = this.time + COMBO_WINDOW;
        const wd = (WEAPONS[b.meleeId] ? WEAPONS[b.meleeId].damage : 34) * (b.meleeMul || 1) * (b.hasBuff('rage', this.time) ? 1.6 : 1) * comboMul(b.combo);
        const kp = 15 + Math.max(0, b.combo - 1) * 8;                 // bot: vanaf x2 ook fors meer knockback
        const bsst = (b._stunStrikeUntil && this.time < b._stunStrikeUntil) ? 1000 : 0; if (bsst) b._stunStrikeUntil = 0;   // Monnik-boss: stun-slag
        this.onVersusHit({ dir: kd, power: kp, vy: -5.5 - Math.max(0, b.combo - 1) * 0.7, dmg: Math.round(wd * 0.45), melee: 1, stun: bsst, pvp: 1 });
        if (b.ability) b.abCharge = Math.min(1, b.abCharge + (0.05 + 0.03 * Math.max(0, b.combo - 1)) / (b.abChargeMul || 1));   // combo's laden de bot-ability sneller
        this.shake = Math.max(this.shake, 6);
      }
    }
    // bot's Vince-aura laat de speler branden
    if (b.fireAura && b._auraOn && this.player.respawnInvuln <= 0 &&
        Math.abs(this.player.x - b.x) < 24 && Math.abs(this.player.y - b.y) < 26) {
      this.player.burnUntil = this.time + 3000;
    }
    // bot eraf gevallen of doodgebrand -> punt voor de speler
    if (!b.dead && (b.y > FALL_DEATH_Y || b.hp <= 0)) { b.dead = true; this.onVersusFell(); }
  },

  applyHitToBot(dir, power, vy, dmg, melee) {
    const b = this.bot;
    if (!b || b.respawnInvuln > 0 || b.dead) return;
    const blocking = b.ducking && b.onGround && !b._guardBroken;
    const parry = blocking && !!melee && (this.time - (b._blockStart || 0)) <= PARRY_WINDOW;   // perfect block alleen bij melee
    if (parry) {
      // bot parriet -> de speler (aanvaller) stuitert alleen terug (geen stun meer)
      b.knockVx = 0; b.guard = Math.min(GUARD_MAX, b.guard + 400);
      this.spawnParryFlash(b.x, b.y - 14); this.shake = Math.max(this.shake, 6);
      const me = this.player;
      if (me && !me.dead && me.respawnInvuln <= 0) { me.knockVx = -dir * 20; me.vy = -4.5; me.onGround = false; me.combo = 0; }
      return;
    }
    b.combo = 0; b.comboUntil = 0;                    // geraakt worden verbreekt de combo
    if (dmg > 0 && this.vs) this.vs.myLastHit = this.time;   // ik deed schade aan de tegenstander ("ring sluit"-klok)
    b.knockVx = dir * power * (blocking ? 0.10 : 1);
    if (!blocking) { b.vy = vy; b.onGround = false; }
    if (dmg) b.takeDamage(Math.round(dmg * (blocking ? 0.25 : 1)), 0, this, 0);
    if (blocking) {
      this.spawnArmorSpark(b.x + b.dir * 10, b.y - 12);
      b.guard -= GUARD_HIT_COST;
      if (b.guard <= 0) { b.guard = 0; b._guardBroken = true; b._guardBrokenUntil = this.time + GUARD_BREAK_STUN; b.stunUntil = Math.max(b.stunUntil || 0, this.time + GUARD_BREAK_STUN); this.onGuardBreak(b); }
    }
    if (!blocking && dmg > 0) this.addHitFeel(b.x, b.y - 16, dir, dmg, power, false, b);   // impact-juice
    else this.shake = Math.max(this.shake, blocking ? 3 : 5);
  },

  respawnBot() {
    const b = this.bot; if (!b) return;
    const sp = this.vs.botSpawn;
    b.x = sp.x; b.y = sp.y; b.dir = sp.dir; b.vy = 0; b.knockVx = 0;
    b.onGround = true; b.dead = false; b.respawnInvuln = 1300; b.hp = b.maxHp; b.burnUntil = 0;
    b.swingWeapon = null; b.swingUntil = 0; b.stunUntil = 0; b.flatUntil = 0; b._rootedUntil = 0; b._invisUntil = 0; b._beamSafeUntil = 0; b.combo = 0; b.comboUntil = 0; b.vine = null; b._caged = false; b._trapCharges = 0;
    b.guard = GUARD_MAX; b._guardBroken = false; b._blockStart = 0;
    if (b.giant) { b.giant = false; if (b._baseMaxHp) b.maxHp = b._baseMaxHp; b.hp = b.maxHp; }
    b.heli = false; b.heliMinigun = 0; b.heliRockets = 0;
    if (this.vsMode === 'smash') { b.meleeId = b.baseMelee || 'bat'; b.weaponId = b.meleeId; b.fireballs = 0; b.smashRockets = 0; b.stars = 0; b.cannon = 0; b.shieldHp = 0; b._weaponUntil = 0; b.gunAmmo = 0; b.beachball = 0; b.coco = 0; b.boomerang = 0; b.dart = 0; }
    this.vs.remote.alive = true;
  },

  platformUnder(e) {
    for (const pf of this.platforms)
      if (Math.abs(e.x - pf.x) < pf.w / 2 + 2 && Math.abs(e.y - pf.y) < 4) return pf;
    return null;
  },
  nearestPlatform(x) {
    let best = null, bd = 1e9;
    for (const pf of this.platforms) { const d = Math.abs(pf.x - x); if (d < bd) { bd = d; best = pf; } }
    return best;
  },

  // is een ander platform bereikbaar met een (dubbel-)sprong?
  reachablePlatform(cur, tgt) {
    if (!cur || !tgt) return false;
    // wat de bot met een (dubbel)sprong echt haalt: niet te ver en niet te hoog -> niet de leegte in
    return Math.abs(tgt.x - cur.x) < 140 && (cur.y - tgt.y) < 100;
  },

  // beste tussenstap-platform richting de speler (wisselende route: laag/midden/hoog)
  bestHopToward(cur, tx, b) {
    if (this.time >= (b._routeAt || 0)) { b._route = Math.floor(Math.random() * 3); b._routeAt = this.time + 2500 + Math.random() * 2500; }
    const curDist = Math.abs(cur.x - tx);
    let best = null, bestScore = -1e9;
    for (const pf of this.platforms) {
      if (pf === cur) continue;                              // wolken mogen als opstapje dienen
      if (!this.reachablePlatform(cur, pf)) continue;
      const d = Math.abs(pf.x - tx);
      if (d > curDist - 2) continue;                        // moet dichter bij de speler brengen
      let score = (curDist - d);
      if (b._route === 2) score += (cur.y - pf.y) * 0.5;    // voorkeur omhoog
      else if (b._route === 0) score += (pf.y - cur.y) * 0.5;   // voorkeur omlaag
      score += (Math.random() - 0.5) * 24;                  // ruis -> variatie in route
      if (score > bestScore) { bestScore = score; best = pf; }
    }
    return best;
  },

  // de AI: speelstijl + moeilijkheid uit het profiel (this.botCfg, level 1..10)
  botThink() {
    const b = this.bot, p = this.player, now = this.time;
    const cfg = this.botCfg || BOT_PROFILES[4];
    const inp = { left: false, right: false, jump: false, duck: false, attack: false, melee: false, jumpPressed: false };
    if (b.dead) return inp;
    if (this._quakeUntil > now) return inp;   // aardbeving: de bot wordt weggeschud en kan niks doen
    const dx = p.x - b.x;
    const aDx = Math.abs(dx);
    const face = () => { if (aDx > 8) b.dir = dx > 0 ? 1 : -1; };
    // ABILITY: opgeladen? -> geregeld inzetten (slim: gevechts-abilities dichtbij, heal bij weinig leven)
    if (b.ability && b.abCharge >= 1 && now >= (b._abCd || 0) && this.vs && this.vs.countdown <= 0 && this.vs.roundFreezeUntil <= now) {
      let want;
      if (b.ability === 'zapdash') want = aDx > 40 && aDx < 260;                    // op afstand: erin dashen
      else if (b.ability === 'earthquake') want = aDx < 200;                         // vlakbij: schudden
      else if (b.ability === 'heal') want = b.hp < b.maxHp * 0.55;                   // pas helen als het nodig is
      else if (b.ability === 'fireaura10' || b.ability === 'knife') want = aDx < 90; // in de buurt om te raken
      else if (b.ability === 'souldrain') want = b.hp < b.maxHp * 0.9 || aDx < 300;  // steelt HP: inzetten als 'ie wat schade heeft of de speler in de buurt is
      else want = true;                                                              // buffs (rage/jumps): meteen
      if (want && Math.random() < 0.05) { this.botUseAbility(); return inp; }
    }
    const inRange = aDx < 32 && Math.abs(p.y - b.y) < 32;    // ook lichte sprongen -> bot kan je in de lucht raken
    if (inRange) { if (!b._inRangeSince) b._inRangeSince = now; } else b._inRangeSince = 0;
    // speler aan het blokken (bukken op de grond)? -> niet blind in het schild rammen
    const pBlock = p.ducking && p.onGround && !p._guardBroken;
    if (pBlock) { if (!b._sawBlockAt) b._sawBlockAt = now; } else b._sawBlockAt = 0;
    const canMelee = () => {
      if (!inRange || now < (b._meleeCd || 0)) return false;
      const reactNeed = (!p.onGround || !b.onGround) ? Math.min(cfg.react, 130) : cfg.react;   // luchtaanval = snappier
      if (!b._inRangeSince || (now - b._inRangeSince) < reactNeed) return false;
      // schild op: wacht kort en straf af, maar val er wél geregeld in aan zodat je kunt blocken/pareren
      if (pBlock) return (now - b._sawBlockAt) > 350 && Math.random() < (0.035 + cfg.aggro * 0.06);
      return true;
    };
    // onregelmatige mep-timing -> je kunt niet op ritme perfect blocken
    const doMelee = () => { inp.melee = true; b._meleeCd = now + cfg.meleeCd * (0.75 + Math.random() * 0.55); face(); };

    // in een zachte wolk? -> omhoog drijven en richting de speler (zo steek je de Sky-kloof over)
    let botCloud = null;
    for (const pf of this.platforms) {
      if (pf.soft && Math.abs(b.x - pf.x) < pf.w / 2 + b.w / 2 && b.y > pf.y - 16 && b.y < pf.y + 12) { botCloud = pf; break; }
    }
    if (botCloud) {
      if (dx > 6) inp.right = true; else if (dx < -6) inp.left = true; else face();
      if (p.y < b.y - 6) inp.jump = true;                    // speler hoger -> omhoog drijven; lager -> door de wolk zakken
      if (canMelee()) doMelee();
      return inp;
    }

    // IN DE LUCHT: bij een 'foutje' geen volle sprong/dubbelsprong -> valt korter
    if (!b.onGround) {
      const target = (b._jumpTarget && this.platforms.indexOf(b._jumpTarget) >= 0) ? b._jumpTarget : this.nearestPlatform(b.x);
      if (target) {
        if (target.x > b.x + 6) inp.right = true; else if (target.x < b.x - 6) inp.left = true; else face();
        if (b.vy < 0 && !b._fumble) inp.jump = true;
        if (!b._fumble && b.jumps > 0 && now >= b._jumpCd && b.vy > 1 && (Math.abs(target.x - b.x) > 30 || b.y > target.y + 6)) {
          inp.jump = true; inp.jumpPressed = true; b._jumpCd = now + 300;
        }
      }
      if (canMelee()) doMelee();
      return inp;
    }

    const cur = this.platformUnder(b) || this.nearestPlatform(b.x);   // randen: val terug op dichtstbijzijnde
    b._jumpTarget = null; b._fumble = false;
    const eL = cur ? cur.x - cur.w / 2 + 9 : 0;
    const eR = cur ? cur.x + cur.w / 2 - 9 : CONFIG.VIEW_W;

    // BLOKKEN (kans uit profiel)
    if (inRange && this.time < (p.swingUntil || 0) && now >= (b._blockUntil || 0) && now >= (b._blockCd || 0) && Math.random() < cfg.block) {
      b._blockUntil = now + 420; b._blockCd = now + 1500;
    }
    if (now < (b._blockUntil || 0)) { inp.duck = true; face(); return inp; }

    // korte pauzes (lage aggro pauzeert vaker) — ze komen nog steeds naar je toe
    if (now >= (b._engageAt || 0)) { b._engaged = Math.random() < cfg.aggro; b._engageAt = now + (b._engaged ? 700 : 450); }

    const playerPf = this.platformUnder(p) || this.nearestPlatform(p.x);
    const onSame = cur && playerPf && cur === playerPf;
    const playerAirAbove = !p.onGround && p.y < b.y - 6;

    // navigeren: zelfde/bereikbaar platform -> de speler; anders een tussenstap richting speler
    let hop = null;
    if (!onSame && cur && !playerAirAbove) {
      hop = this.reachablePlatform(cur, playerPf) ? playerPf : this.bestHopToward(cur, p.x, b);
    }

    if (hop && hop !== cur) {
      // op weg naar de speler (ook als die stilstaat, ver weg): naar de rand en eraf springen
      const tdx = hop.x - b.x;
      if (tdx > 6) inp.right = true; else if (tdx < -6) inp.left = true; else face();
      const nearEdge = (tdx > 0 && b.x > eR - 6) || (tdx < 0 && b.x < eL + 6) || hop.y < cur.y - 8;
      if (nearEdge && now >= b._jumpCd && Math.random() < Math.max(cfg.jumpy, 0.5)) {
        b._fumble = Math.random() < cfg.mistake;            // spring-foutje (minder bij hogere levels)
        inp.jump = true; inp.jumpPressed = true; b._jumpCd = now + 650; b._jumpTarget = hop;
      }
    } else {
      // op het speler-vlak: naderen rond de standoff + meppen
      let want = 0;
      if (aDx > cfg.standoff + 6) want = (dx > 0 ? 1 : -1);           // ook van ver naderen -> ze komen naar je toe
      else if (aDx < cfg.standoff - 12) want = (dx > 0 ? -1 : 1);     // te dichtbij -> spacing
      if (!b._engaged && want > 0) want = 0;                          // tijdens een pauze even niet naderen
      if (want > 0 && b.x < eR) inp.right = true;
      else if (want < 0 && b.x > eL) inp.left = true;
      else face();
      if (canMelee()) doMelee();
      if (b._engaged && p.y < b.y - 18 && aDx < 60 && b.x > eL + 4 && b.x < eR - 4 && now >= b._jumpCd && Math.random() < cfg.jumpy) {
        b._fumble = Math.random() < cfg.mistake;
        inp.jump = true; inp.jumpPressed = true; b._jumpCd = now + 650; b._jumpTarget = playerPf;
      }
    }
    return inp;
  },

  onVersusHit(payload) {
    const p = this.player;
    if (p.respawnInvuln > 0 || p.dead) return;       // net gespawnd = even onkwetsbaar
    if (payload && payload.pvp && payload.dmg > 0 && this.vs) this.vs.oppLastHit = this.time;   // tegenstander deed schade aan mij ("ring sluit"-klok; geen map-hazards)
    if (window.Sfx) Sfx.play('hit');
    const blocking = p.ducking && p.onGround && !p._guardBroken;   // bukken = blok
    const parry = blocking && !!payload.melee && (this.time - (p._blockStart || 0)) <= PARRY_WINDOW;   // perfect block alleen bij melee
    if (parry) {
      // 100% geblokt + de aanvaller stuitert alleen terug (geen stun meer)
      p.knockVx = 0; p.guard = Math.min(GUARD_MAX, p.guard + 400);
      this.spawnParryFlash(p.x, p.y - 14); this.shake = Math.max(this.shake, 6);
      if (this.vsBot && this.bot && !this.bot.dead) {
        const kd = this.bot.x >= p.x ? 1 : -1;
        this.bot.knockVx = kd * 20; this.bot.vy = -4.5; this.bot.onGround = false;
        this.bot.combo = 0;
      } else if (window.Net) Net.versusSend('parry', { dir: payload.dir || 1 });
      return;
    }
    p.combo = 0; p.comboUntil = 0;                    // geraakt worden verbreekt je combo
    p.knockVx = (payload.dir || 1) * (payload.power || 15) * (blocking ? 0.10 : 1);
    if (!blocking) { p.vy = payload.vy || -5.5; p.onGround = false; }
    if (payload.dmg) p.takeDamage(Math.round(payload.dmg * (blocking ? 0.25 : 1)));
    if (payload.stun && !blocking) p.stunUntil = Math.max(p.stunUntil || 0, this.time + payload.stun);   // gifdart
    if (blocking) {
      this.spawnArmorSpark(p.x + p.dir * 10, p.y - 12);
      p.guard -= GUARD_HIT_COST;
      if (p.guard <= 0) { p.guard = 0; p._guardBroken = true; p._guardBrokenUntil = this.time + GUARD_BREAK_STUN; p.stunUntil = Math.max(p.stunUntil || 0, this.time + GUARD_BREAK_STUN); this.onGuardBreak(p); }
    }
    if (!blocking && payload.dmg > 0) this.addHitFeel(p.x, p.y - 16, payload.dir || 1, payload.dmg, payload.power || 0, true, p);   // impact-juice + rode flits
    else this.shake = Math.max(this.shake, blocking ? 3 : 5);
  },

  // de aanvaller hoort dat z'n klap geparried is -> alleen terugstuiteren (geen stun meer)
  onVersusParry(payload) {
    const me = this.player;
    if (!me || me.dead) return;
    me.knockVx = -(payload && payload.dir ? payload.dir : 1) * 20; me.vy = -4.5; me.onGround = false;
    me.combo = 0;
    this.spawnParryFlash(me.x, me.y - 14); this.shake = Math.max(this.shake, 5);
  },

  localFell() {
    if (this.vs.over || this.vs.roundFreezeUntil > this.time) return;   // al klaar / al in freeze
    this.nuke = null; this.traps = [];                                  // KO ontmantelt de nuke + vallen weg
    this.player.dead = true;
    this.triggerKO(this.player.x, this.player.y, false);                // KO-cinematic (jij bent eraf)
    this.vs.oppScore++;
    // absolute score meesturen -> zelfherstellend tegen verloren/dubbele meldingen
    if (window.Net && !this.vsBot) Net.versusSend('fell', { winScore: this.vs.oppScore });
    if (this.vs.oppScore >= this.vs.target || this.vs.suddenDeath) { this.endVersus(false); return; }   // 8 rondes of sudden-death-ronde -> einde
    this._vsMusicTick();
    this.beginRoundFreeze('TEGENSTANDER wint de ronde');
  },
  respawnLocal() {
    const sp = this.vs.spawn;
    this.player.x = sp.x; this.player.y = sp.y; this.player.dir = sp.dir;
    this.player.vy = 0; this.player.knockVx = 0; this.player.onGround = true;
    this.player.dead = false; this.player.respawnInvuln = 1300;
    this.player.hp = this.player.maxHp; this.player.burnUntil = 0;   // fris (ook na burn-dood)
    this.player.stunUntil = 0; this.player.flatUntil = 0; this.player._rootedUntil = 0; this.player._invisUntil = 0; this.player._beamSafeUntil = 0; this.player._trapCharges = 0;
    this.player.combo = 0; this.player.comboUntil = 0; this.player.vine = null; this.player._caged = false;
    this.player.guard = GUARD_MAX; this.player._guardBroken = false; this.player._blockStart = 0;
    this.player.swingWeapon = null; this.player.swingUntil = 0;       // geen lingerende mep-animatie
    if (this.player.giant) { this.player.giant = false; if (this.player._baseMaxHp) this.player.maxHp = this.player._baseMaxHp; }  // reus eindigt bij rondewissel
    this.player.heli = false; this.player.heliMinigun = 0; this.player.heliRockets = 0;
    this.player.hp = this.player.maxHp;
    if (this.vsMode === 'smash') {                  // elke ronde weer met de knuppel
      this.player.meleeId = this.player.baseMelee || 'bat'; this.player.rangedId = null;
      this.player.weaponId = this.player.meleeId;    // ook het getekende wapen terug naar de knuppel
      this.player.fireballs = 0; this.player.smashRockets = 0; this.player.stars = 0; this.player.cannon = 0; this.player.shieldHp = 0; this.player._weaponUntil = 0; this.player.gunAmmo = 0; this.player.beachball = 0; this.player.coco = 0; this.player.boomerang = 0; this.player.dart = 0;
      this.player.armorHp = this.player.armorMax || 0;   // harnas elke ronde weer vol (grijs balkje)
      // Yarno's zap-mes blijft nog een ronde staan
      if (this.player._bladeRounds > 0) { this.player._bladeRounds--; if (this.player._bladeRounds > 0) { this.player.meleeId = 'zapblade'; this.player.weaponId = 'zapblade'; } }
    }
  },

  onVersusFell(payload) {
    if (this.vs.over) return;
    this.nuke = null; this.traps = [];                                  // KO ontmantelt de nuke + vallen weg
    // absolute score overnemen (max) -> dubbele meldingen tellen niet dubbel, gemiste herstellen
    const before = this.vs.myScore;
    if (payload && typeof payload.winScore === 'number') this.vs.myScore = Math.max(this.vs.myScore, payload.winScore);
    else this.vs.myScore++;
    if (this.vs.myScore > before) this.triggerKO(this.vs.remote.x, this.vs.remote.y, true);   // KO-cinematic (tegenstander eraf)
    if (this.vs.myScore >= this.vs.target || (this.vs.suddenDeath && this.vs.myScore > before)) { this.endVersus(true); return; }   // 8 rondes of sudden-death -> einde
    this._vsMusicTick();
    if (this.vs.roundFreezeUntil <= this.time) this.beginRoundFreeze('JIJ wint de ronde!');
  },
  // online-muziek: standaard uitdagend (1), en nog uitdagender zodra iemand op de een-na-laatste ronde staat (2)
  _vsMusicTick() {
    if (!window.Sfx || !this._vsChallengeMusic || !this.vs || this.vs.over) return;
    const near = Math.max(this.vs.myScore || 0, this.vs.oppScore || 0) >= (this.vs.target - 1);
    Sfx.setMusicIntensity(near ? 2 : 1);
  },

  // tegenstander meldt dat het potje voorbij is (vangnet als de laatste 'fell' verloren ging)
  onVersusOver(payload) {
    if (!this.vs || this.vs.over) return;
    const iLost = payload && payload.loserRole === this.vs.role;
    this.endVersus(!iLost);
  },

  onVersusBurn() {
    const p = this.player;
    if (p.respawnInvuln > 0 || p.dead) return;
    p.burnUntil = this.time + SMASH_FIRE_BURN;     // vuurbal/draak: korte brand
  },
  onVersusQuake(payload) {              // tegenstander gebruikte aardbeving op jou
    this._selfQuakeUntil = this.time + ((payload && payload.until) || 5000);
  },

  onVersusState(s) {
    if (!this.vs) return;
    const r = this.vs.remote;
    r.tx = s.x; r.ty = s.y; r.vy = s.vy || 0; r.dir = s.d || 1;
    r.onGround = s.g !== 0; r.attacking = s.a === 1;
    r.swingWeapon = s.sw || null; r.walkPhase = s.wp || 0;
    r.heldWeapon = s.wid || 'bat';
    r.stunned = s.su === 1;
    r.flat = s.fl === 1;
    r.hat = s.ht || 'none';
    r.rage = s.rg === 1; r.burn = s.bn === 1;
    r.shieldHp = s.shp || 0;
    r.giant = s.gi === 1;
    r.heli = s.hl === 1;
    r.alive = s.al !== 0; r.charId = s.ch || 'ryan';
    r.ducking = s.dk === 1; r.iv = s.iv === 1;   // tegenstander onzichtbaar
    r._fireHold = s.fb === 1;                     // tegenstander houdt een vuurbal vast
    if (typeof s.h === 'number') r.hp = s.h;
    if (typeof s.mh === 'number') r.maxHp = s.mh;
    if (typeof s.rp === 'number') { r.rp = s.rp; if (this.vs) this.vs.oppRp = s.rp; }   // tegenstander-RP (rank-badge + hogere-rank-bonus)
    if (s.nk && this.vs) this.vs.oppName = s.nk;   // tegenstander-nickname (voor de ronde-winnaar-banner)
    r.lastSeen = Date.now();   // echte tijd -> werkt ook als de tegenstander z'n app op de achtergrond zet
  },

  sendVersusState() {
    if (!window.Net) return;
    const p = this.player;
    Net.versusSend('state', {
      x: Math.round(p.x), y: Math.round(p.y), vy: +(p.vy || 0).toFixed(1), d: p.dir,
      g: p.onGround ? 1 : 0, a: this.time < p.attackAnimUntil ? 1 : 0,
      sw: (this.time < (p.swingUntil || 0)) ? (p.swingWeapon || 0) : 0,
      wid: p.weaponId || 0, su: (p.stunUntil && this.time < p.stunUntil) ? 1 : 0, fl: (p.flatUntil && this.time < p.flatUntil) ? 1 : 0, ht: Storage.data.equippedHat || 'none',
      rg: p.hasBuff('rage', this.time) ? 1 : 0, bn: (p.burnUntil > this.time) ? 1 : 0, shp: Math.round(p.shieldHp || 0), gi: p.giant ? 1 : 0, hl: p.heli ? 1 : 0,
      wp: p.walkPhase || 0, al: p.dead ? 0 : 1, ch: Storage.data.equippedCharacter || 'ryan',
      h: Math.round(p.hp), mh: p.maxHp, dk: p.ducking ? 1 : 0,
      iv: (p._invisUntil && this.time < p._invisUntil) ? 1 : 0,
      fb: p.fireballs > 0 ? 1 : 0,
      rp: Storage.data.rp || 0,
      nk: (window.Net && Net.isLoggedIn && Net.isLoggedIn()) ? (Net.nickname() || '') : '',
    });
  },

  endVersus(won, peerLeft) {
    if (this.vs && this.vs.over) return;
    if (this.vs) this.vs.over = true;
    this.state = 'versusOver';
    const isBot = this.vsBot;
    // harnas-slijtage: verwerk hoeveel schade het harnas deze match opving
    if (this.player && this.player._armorAbsorbed > 0 && Storage.applyArmorWear) { Storage.applyArmorWear(this.player._armorAbsorbed); this.player._armorAbsorbed = 0; }
    // ----- JOURNEY: eigen afhandeling (level halen, unlocks, eigen uitslag) -----
    if (this.journey) {
      const jr = this.journey, idx = jr.idx, jworld = jr.world || 1;
      let unlocks = [], rewards = [];
      if (won) {
        const first = !Storage.journeyCleared(idx, jworld);
        unlocks = Storage.clearJourneyLevel(idx, jworld);
        const isBossLv = jr.lv && (jr.lv.boss || jr.lv.bossFight);
        const worldEnd = JOURNEY[jworld] && idx >= JOURNEY[jworld].levels.length;   // laatste level van de wereld
        // eerste keer: volledige beloning; opnieuw spelen: 50 munten (geen xp). Wereld 2 uitgespeeld: extra + robijnen.
        let coins, xp, rubies = 0;
        if (first && jworld === 2 && worldEnd) { coins = 350; xp = 80; rubies = 5; }   // De Ninja verslagen -> Wereld 2 voltooid
        else { coins = first ? (isBossLv ? 150 : 40) : 50; xp = first ? (isBossLv ? 60 : 20) : 0; }
        Storage.data.coins = (Storage.data.coins || 0) + coins;
        if (rubies) Storage.data.rubies = (Storage.data.rubies || 0) + rubies;
        if (xp) Storage.data.xp = (Storage.data.xp || 0) + xp;
        Storage.save();
        if (won) Storage.addCharXp(Storage.data.equippedCharacter, first ? 12 : 5);   // character-XP door Journey te spelen (langzaam)
        rewards.push({ type: 'earn', coins, xp, rubies });
        for (const u of unlocks) rewards.push({ type: u.type, id: u.id, name: u.name });   // unlock-kaartjes
      }
      if (window.Sfx) Sfx.play(won ? 'win' : 'lose');
      const foeName = (jr.lv && jr.lv.bot && CHARACTERS[jr.lv.bot]) ? CHARACTERS[jr.lv.bot].name.toUpperCase() : 'BOT';
      const self = this, name = won ? 'JIJ' : foeName;
      const myScore = this.vs ? this.vs.myScore : 0, oppScore = this.vs ? this.vs.oppScore : 0;
      UI.showWinCelebration(name, won);
      const showRes = function () { UI.showJourneyResult(won, idx, unlocks, rewards, myScore, oppScore, jworld); };
      setTimeout(function () {
        if (self.state !== 'versusOver') return;
        // Gorilla King (Wereld 1, laatste level) verslagen -> outro-cutscene naar Wereld 2, dán de uitslag
        if (won && jworld === 1 && idx >= JOURNEY[1].levels.length) UI.playEndStory('kongwin', showRes);
        else if (won && jworld === 2 && idx >= JOURNEY[2].levels.length) UI.playEndStory('ninjawin', showRes);   // Wereld 2 voltooid-cutscene
        else showRes();
      }, 2600);
      return;
    }
    // betrouwbaar de uitslag naar de tegenstander sturen (paar keer tegen pakketverlies)
    if (!isBot && window.Net && this.vs) {
      const role = this.vs.role;
      const loserRole = won ? (role === 'host' ? 'guest' : 'host') : role;
      const send = () => Net.versusSend('over', { loserRole });
      send(); setTimeout(send, 300); setTimeout(send, 800);
    }
    // online: kanaal OPEN houden zodat een rematch mogelijk is (kanaal sluit pas bij menu/lobby)
    // tegen de bot: GEEN XP/wins. Echt duel: XP + wins (sync't naar de leaderboard).
    let gained = 0, coinsEarned = 0, chestDrop = null, rankRes = null;
    const realStakes = !isBot;                                 // alleen een échte online tegenstander telt (bots niet meer)
    if (realStakes) {
      gained = (won ? 100 : XP_LOSS) + (this._comboXp || 0);   // winst 100 XP + verdiende combo-XP
      coinsEarned = won ? 75 : 20;                              // winnaar 75 munten, verliezer 20
      Storage.data.xp = (Storage.data.xp || 0) + gained;
      Storage.data.coins = (Storage.data.coins || 0) + coinsEarned;
      if (won) Storage.data.mpWins = (Storage.data.mpWins || 0) + 1;
      else Storage.data.mpLosses = (Storage.data.mpLosses || 0) + 1;
      // RANK: RP-verandering + eventuele rank-up-beloningen (munten/kisten)
      rankRes = Storage.applyRankedResult({ won: won, quit: false, oppRp: (this.vs && typeof this.vs.oppRp === 'number') ? this.vs.oppRp : undefined });
      Storage.save();
      chestDrop = Storage.rollChestDrop(won);                  // soms nog een losse kist
      Storage.addCharXp(Storage.data.equippedCharacter, won ? 15 : 6);   // character-XP alleen bij echte potjes
    } else {
      // tegen een bot: GEEN XP/RP/wins/kisten — alleen een kleine munt-fooi
      coinsEarned = won ? 40 : 10;
      Storage.data.coins = (Storage.data.coins || 0) + coinsEarned;
      Storage.save();
    }
    this._lastRankResult = rankRes;
    const myScore = this.vs ? this.vs.myScore : 0, oppScore = this.vs ? this.vs.oppScore : 0;
    if (peerLeft) { UI.showVersusResult(won, myScore, oppScore, gained, isBot, coinsEarned, peerLeft, chestDrop, this._mmBot, rankRes); return; }
    // korte win-celebratie met de naam van de winnaar, dan pas het uitslagscherm
    const winnerName = won
      ? ((window.Net && Net.isLoggedIn && Net.isLoggedIn()) ? Net.nickname() : 'Jij')
      : (isBot ? 'Bot' : 'Tegenstander');
    if (window.Sfx) Sfx.play(won ? 'win' : 'lose');
    UI.showWinCelebration(winnerName, won);
    const self = this;
    setTimeout(function () {
      if (self.state !== 'versusOver') return;   // intussen weggegaan
      UI.showVersusResult(won, myScore, oppScore, gained, isBot, coinsEarned, peerLeft, chestDrop, self._mmBot, self._lastRankResult);
    }, 2600);
  },

  // AFK / uit-de-app: >15s geen input of geen updates van de tegenstander
  _checkVersusAfk(v) {
    const now = Date.now();
    if (!this._lastInputTime) this._lastInputTime = now;
    const anyInput = (typeof Input !== 'undefined') && Input.state && (Input.state.left || Input.state.right || Input.state.jump || Input.state.duck || Input.state.attack || Input.state.melee);
    if (anyInput) this._lastInputTime = now;
    const r = v.remote;
    // 1) tegenstander stuurt niks meer (weg / uit de app / afk op de achtergrond) -> JIJ wint
    if (r && r.lastSeen > 0 && now - r.lastSeen > AFK_KICK_MS) { this.endVersus(true, true); return; }   // peerLeft -> "tegenstander weg, jij wint"
    // 2) jij bent zelf >15s AFK (of net terug na lang weg) -> JIJ verliest; tegenstander wint (via 'bye')
    if (now - this._lastInputTime > AFK_KICK_MS) { this._afkKicked = true; this.forfeitVersus(); return; }
  },
  // matchmaking-tijd op: gelijk = sudden death, anders drumroll + zoom op de winnaar en einde
  _matchTimeUp() {
    const v = this.vs; if (!v || v.over || v.timeUp) return;
    if (v.myScore === v.oppScore) {                    // GELIJK -> sudden death (volgende ronde beslist)
      v.suddenDeath = true;
      if (window.Sfx) Sfx.play('zap');
      if (window.UI && UI.showBigMsg) UI.showBigMsg(tl('SUDDEN DEATH!'), 'lose', 2600);
      return;
    }
    const iWon = v.myScore > v.oppScore;
    v.timeUp = true;
    v.zoomTarget = iWon ? this.player : v.remote;       // camera zoomt op de winnaar
    if (window.Sfx) Sfx.play('drumroll');
    if (window.UI && UI.showBigMsg) UI.showBigMsg(tl('TIJD!'), 'win', 2400);
    const self = this;
    setTimeout(function () {
      if (!self.vs || self.vs.over) return;
      if (window.UI && UI.hideBigMsg) UI.hideBigMsg();
      self.endVersus(iWon);                             // win/lose-celebratie + uitslag (win-sound + naam)
    }, 2400);
  },
  // online match zelf verlaten: jij krijgt een loss (geen XP/munten), tegenstander wint (via 'bye')
  forfeitVersus() {
    const afk = this._afkKicked; this._afkKicked = false;
    if (this.vs && !this.vsBot) {
      Storage.data.mpLosses = (Storage.data.mpLosses || 0) + 1;
      Storage.applyRankedResult({ quit: true });   // leaven = -30 RP (streak reset)
      Storage.save();
    }
    this.quitVersus();   // Net.leaveVersus() stuurt 'bye' -> tegenstander wint
    if (afk && window.UI && UI.toast) UI.toast(tl('Uit de match gezet — te lang weg (AFK). Je verliest.'));
  },

  quitVersus() {
    if (window.Net) Net.leaveVersus();
    this.vsBot = false; this.bot = null;
    this.journey = null; this.journeyDrops = null;
    this.state = 'menu';
    UI.show('menu');
  },

  renderVersus() {
    if (!this.vs) return;
    const ctx = this.ctx, W = CONFIG.VIEW_W, H = CONFIG.VIEW_H;
    const map = this.vsMap || VERSUS_MAPS[0];
    // lucht (map-thema)
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, map.sky[0]); sky.addColorStop(1, map.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // wolk-parallax voor lucht-maps (scherm-ruimte, beweegt licht mee)
    if (map.clouds) {
      // zon (rechtsboven, lichte parallax)
      const sunX = W - 64 - this.vsCamX * 0.05, sunY = 42 - this.vsCamY * 0.05;
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#fff3c0'; ctx.beginPath(); ctx.arc(sunX, sunY, 34, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(sunX, sunY, 17, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff6cf'; ctx.beginPath(); ctx.arc(sunX, sunY, 11, 0, 6.2832); ctx.fill();
      // wolken (2 parallax-lagen)
      const cloud = (cx, cy, sc, a) => { ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.fillRect(cx, cy, 40 * sc, 9 * sc); ctx.fillRect(cx + 10 * sc, cy - 5 * sc, 24 * sc, 9 * sc); ctx.fillRect(cx + 4 * sc, cy - 2 * sc, 30 * sc, 7 * sc); };
      for (let i = 0; i < 4; i++) { const cx = ((i * 190 - this.vsCamX * 0.15) % (W + 220)) - 80; const cy = 30 + (i % 2) * 46 - this.vsCamY * 0.12; cloud(cx, cy, 1.4, 0.3); }   // ver
      for (let i = 0; i < 6; i++) { const cx = ((i * 150 - this.vsCamX * 0.3) % (W + 140)) - 60; const cy = 22 + (i % 3) * 52 - this.vsCamY * 0.25; cloud(cx, cy, 1.0, 0.6); }    // dichterbij
      ctx.globalAlpha = 1;
      // vogels (klein, klapperend, schuiven traag)
      ctx.strokeStyle = '#3a4760'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) {
        const bx = ((i * 95 + this.time * 0.018) % (W + 60)) - 30;
        const by = 24 + (i * 19 % 46) - this.vsCamY * 0.1;
        const fl = Math.sin(this.time / 160 + i) * 2.5;
        ctx.beginPath(); ctx.moveTo(bx - 4, by + fl); ctx.lineTo(bx, by - 1); ctx.lineTo(bx + 4, by + fl); ctx.stroke();
      }
    }

    const shx = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    const shy = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    const z = this.vsCamZoom || 1;
    const camX = this.vsCamX, camY = this.vsCamY, visW = W / z, visH = H / z;
    ctx.save(); ctx.translate(shx, shy); ctx.scale(z, z); ctx.translate(-camX, -camY);

    if (map.cave) this.drawCaveBg(ctx);                 // diepe grotten / vleermuizen / druppels
    if (map.vulcan) this.drawVulcanBg(ctx);             // verre uitbarstingen + rook
    if (map.pirate) this.drawPirateBg(ctx);             // piratenschip-achtergrond + water
    if (map.jungle2) this.drawJungleBg(ctx);            // oerwoud-achtergrond + papegaaien
    if (map.castle) this.drawCastleBg(ctx);             // Sky Castle: zwevend kasteel, verre draak + kastelen
    if (map.jbg) this.drawJungleBg(ctx);                // Journey-jungle: zelfde oerwoud-achtergrond (zonder kooi-gimmick)
    if (map.dohyo) this.drawDohyoBg(ctx);               // Japanse dojo + hangend dak met kwasten
    if (map.beach) this.drawBeachBg(ctx);               // strand: zee + golven achter
    if (map.treasure) this.drawTreasureBg(ctx);         // schatkamer: goud, juwelen, kisten, afgodsbeeld
    else if (map.templeIn) this.drawTempleInteriorBg(ctx);   // tempel van BINNEN: donkere zaal, pilaren, wandfakkels
    else if (map.temple) this.drawTempleBg(ctx);        // stenen tempel (buiten): verre piramide + fakkels

    // afgrond onderin (map-thema), camera-bewust (volle zichtbare breedte bij uitzoomen)
    ctx.fillStyle = map.void || '#06090d'; ctx.fillRect(camX - 4, CONFIG.GROUND_Y - 2, visW + 8, visH + Math.abs(camY) + 320);
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#04060a'; ctx.fillRect(camX - 4, CONFIG.GROUND_Y + 18, visW + 8, visH + Math.abs(camY) + 320); ctx.globalAlpha = 1;

    if (map.pirate) this.drawPirateHull(ctx);           // scheepsromp onder het dek
    if (map.airplane) this.drawAirplane(ctx);           // vliegtuig-romp + dak (het dak = de ondergrond)

    // platforms (bewegende krijgen een pijltjes-hint; zachte wolken pluizig; Vulcan = steen/schuin; Pirate = hout/masten)
    const platStyle = map.wood ? 'wood' : (map.stone ? 'stone' : (map.dohyo ? 'dohyo' : (map.sand ? 'sand' : null)));
    for (const pf of this.platforms) {
      if (pf.roof) continue;                             // vliegtuigdak wordt door drawAirplane getekend
      if (pf.cloud) { this.drawCloudPlatform(ctx, pf); continue; }   // wolk-platform (5s)
      if (pf.soft) { this.drawSoftCloud(ctx, pf); continue; }
      if (pf.mast) { this.drawMast(ctx, pf); continue; }
      if (pf.wall) { this.drawTempleBlock(ctx, pf); continue; }   // solide stenen muur-blok (langs lopen + erop staan)
      if (pf.slide) { this.drawSlantPlatform(ctx, pf, platStyle); }
      else Sprites.drawPlatform(ctx, pf.x, pf.y, pf.w, platStyle);
      if (pf.mv) { ctx.globalAlpha = 0.5; Sprites.px(ctx, '#ffe9a0', pf.x - 1, pf.y - 5, 2, 2); ctx.globalAlpha = 1; }
    }
    if (map.temple) this.drawTempleDoors(ctx);          // deuren op de muur-blokken

    if (map.pirate) this.drawPirateMast(ctx);           // middenmast loopt door het dek heen
    if (map.throne) this.drawThrone(ctx);               // troonzaal-eindbaas: troon achter de spelers
    if (map.jungle2) this.drawVines(ctx);              // lianen (achter de spelers)
    if (map.cave) this.drawCaveButtons(ctx);            // knoppen op de platforms

    // portalen (Power Smash) — achter de spelers
    if (this.portals) for (const pt of this.portals) this.drawPortal(ctx, pt);

    // Tempelbewaker-vallen op de grond
    if (this.traps) for (const t of this.traps) this.drawTrap(ctx, t);
    // drops (Power Smash)
    if (this.drops) for (const d of this.drops) { if (!d.taken) this.drawDrop(ctx, d); }
    // vallende stenen (steen-powerup)
    if (this.rocks) for (const rk of this.rocks) this.drawRock(ctx, rk);

    // kogels: gewoon + fireball/rocket + ghost van de tegenstander + bot
    const drawBullet = (b) => {
      if (b.kind === 'fire') {                          // flikkerende vuurbal met sliert erachter
        const d = Math.sign(b.vx) || 1, f = Math.floor(this.time / 45) % 2;
        Sprites.px(ctx, '#ff5a1e', b.x - d * 6, b.y - 1, 4, 2);                 // staart-vlam achter de bal
        Sprites.px(ctx, '#ff8a2a', b.x - d * 3 - 1, b.y - 2, 3, 4 + f);         // buitengloed
        Sprites.px(ctx, '#ff7a2a', b.x - 2, b.y - 3, 5, 6);                     // kern-vlam
        Sprites.px(ctx, '#ffd24a', b.x - 1, b.y - 2, 3, 4);                     // hete kern
        Sprites.px(ctx, '#fff3c0', b.x, b.y - 1 - f, 1, 2);                     // wit-hete punt
      }
      else if (b.kind === 'rocket') { Sprites.px(ctx, '#cfd6df', b.x - 3, b.y - 1, 6, 3); Sprites.px(ctx, '#ffd24a', b.x - (Math.sign(b.vx) || 1) * 3, b.y - 1, 2, 3); }
      else if (b.kind === 'cannon') { Sprites.px(ctx, '#0e0e0e', b.x - 4, b.y - 4, 8, 8); Sprites.px(ctx, '#3a3a3a', b.x - 4, b.y - 4, 8, 2); Sprites.px(ctx, '#666', b.x - 2, b.y - 3, 2, 2); }
      else if (b.kind === 'coco') { Sprites.px(ctx, '#5e3f22', b.x - 4, b.y - 4, 8, 8); Sprites.px(ctx, '#8a5e36', b.x - 4, b.y - 4, 8, 3); Sprites.px(ctx, '#3a2614', b.x - 1, b.y - 1, 2, 2); }
      else if (b.kind === 'boom') { const a = Math.floor(this.time / 40) % 2; Sprites.px(ctx, '#a8824a', b.x - 4, b.y - 1, 8, 2); Sprites.px(ctx, '#a8824a', b.x - 1, b.y - 4, 2, 8); if (a) { Sprites.px(ctx, '#caa860', b.x - 4, b.y - 4, 3, 3); Sprites.px(ctx, '#caa860', b.x + 1, b.y + 1, 3, 3); } }
      else if (b.kind === 'dart') { const d = Math.sign(b.vx) || 1; Sprites.px(ctx, '#2f7a3a', b.x - d * 4, b.y - 1, 8, 2); Sprites.px(ctx, '#cfd6df', b.x + d * 3, b.y - 1, 2, 2); }
      else if (b.kind === 'star') {   // draaiende ninja-ster (shuriken)
        const f = Math.floor(this.time / 35) % 2, c = '#cfd6df';
        if (f) { Sprites.px(ctx, c, b.x - 4, b.y - 1, 8, 2); Sprites.px(ctx, c, b.x - 1, b.y - 4, 2, 8); }        // +
        else { Sprites.px(ctx, c, b.x - 3, b.y - 3, 2, 2); Sprites.px(ctx, c, b.x + 1, b.y - 3, 2, 2); Sprites.px(ctx, c, b.x - 3, b.y + 1, 2, 2); Sprites.px(ctx, c, b.x + 1, b.y + 1, 2, 2); }   // x
        Sprites.px(ctx, '#8a929c', b.x - 1, b.y - 1, 2, 2); Sprites.px(ctx, '#3a3f46', b.x, b.y, 1, 1);          // naaf + gaatje
      }
      else Sprites.px(ctx, '#ffe27a', b.x - 1, b.y - 1, 3, 2);
    };
    if (this.bullets) for (const b of this.bullets) drawBullet(b);
    if (this.ghostBullets) for (const b of this.ghostBullets) drawBullet(b);
    if (this.botBullets) for (const b of this.botBullets) drawBullet(b);

    // sfeer-deeltjes (embers/bladeren/zeenevel/stof) — achter de spelers
    if (this.ambient && this.ambient.length) {
      for (const a of this.ambient) {
        const life = 1 - (this.time - a.born) / a.dur;
        ctx.globalAlpha = Math.max(0, Math.min(1, life * 1.4)) * 0.85;
        Sprites.px(ctx, a.c, Math.round(a.x), Math.round(a.y), a.s, a.s);
      }
      ctx.globalAlpha = 1;
    }

    // partikels
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      Sprites.px(ctx, p.color, p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // tegenstander (ghost) — ROOD pijltje erboven; onzichtbare ninja tekenen we niet (jij ziet 'm niet)
    const r = this.vs.remote;
    if (r.alive && !r.iv) {
      const rc = (CHARACTERS[r.charId] || CHARACTERS.ryan);
      if (r.onGround) Sprites.shadow(ctx, r.x, r.y + 1, r.giant ? 11 : 7);
      if (r.heli) { this.drawHeli(ctx, Math.round(r.x), Math.round(r.y), r.dir, rc.palette); }
      else {
      // zwaai-voortgang met een lokale klok (werkt voor bot én online: alleen een attacking-flag beschikbaar)
      if (r.attacking) { if (!r._swStart) r._swStart = this.time; } else r._swStart = 0;
      const rSwing = r.attacking ? Math.max(0, Math.min(1, (this.time - r._swStart) / 150)) : 0;
      ctx.save(); ctx.translate(Math.round(r.x), Math.round(r.y)); const rg = r.giant ? 2.2 : 1; ctx.scale(rg, rg);
      const rOpts = {
        walkPhase: r.walkPhase, airborne: !r.onGround, attacking: r.attacking, ducking: r.ducking, swing: rSwing,
        weapon: r.giant ? null : (r.swingWeapon || r.heldWeapon || 'bat'), build: rc.build, hair: rc.hair, squash: r.flat,
        hat: r.hat || 'none', t: this.time, rage: r.rage, burning: r.burn, outfit: rc.outfit,
      };
      Sprites.drawCharacter(ctx, 0, 0, r.dir, rc.palette, rOpts);
      if (r._flashUntil > this.time) { ctx.globalAlpha = Math.min(0.9, (r._flashUntil - this.time) / 130 * 0.95); Sprites.drawCharacter(ctx, 0, 0, r.dir, this._flashPal(rc.palette), rOpts); ctx.globalAlpha = 1; }   // witte hit-flash
      ctx.restore();
      if (r._fireHold || (r._fireHandUntil && this.time < r._fireHandUntil)) this.drawFireHand(ctx, r.x, r.y, r.dir, this.time);   // vuurbal continu in de hand
      }
      if (r.ducking) this.drawBlockGuard(ctx, Math.round(r.x), Math.round(r.y), r.dir);
      if (r.stunned) this.drawStunAura(ctx, Math.round(r.x), Math.round(r.y));
      if (r.rooted) this.drawRooted(ctx, Math.round(r.x), Math.round(r.y));
      this.drawVsMarker(ctx, Math.round(r.x), Math.round(r.y), rc.build, '#ff5a5a');
      if (this.vs && !this.vsBot && !this.journey && typeof r.rp === 'number') this.drawRankBadge(ctx, Math.round(r.x), Math.round(r.y), rc.build, rankForRp(r.rp));   // rank-icoon tegenstander
    }

    // eigen speler — GROEN pijltje erboven (knippert tijdens respawn)
    const p = this.player;
    const blink = p.respawnInvuln > 0 && Math.floor(this.time / 90) % 2 === 0;
    const pInvis = p._invisUntil && this.time < p._invisUntil;   // onzichtbaar -> jij ziet jezelf doorzichtig
    if (!p.dead) {
      if (pInvis) ctx.globalAlpha = 0.35;
      if (!blink) {
        if (p.onGround && !pInvis) Sprites.shadow(ctx, p.x, p.y + 1, p.giant ? 11 : 7);
        const swinging = this.time < (p.swingUntil || 0) && p.swingWeapon;
        if (p.heli) { this.drawHeli(ctx, Math.round(p.x), Math.round(p.y), p.dir, p.pal); }
        else {
        ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); const pg = p.giant ? 2.2 : 1; ctx.scale(pg, pg);
        const pSwing = this.time < p.attackAnimUntil ? Math.max(0, Math.min(1, 1 - (p.attackAnimUntil - this.time) / 150)) : 0;
        const pOpts = {
          walkPhase: p.walkPhase, airborne: !p.onGround, ducking: p.ducking,
          attacking: this.time < p.attackAnimUntil, swing: pSwing,
          weapon: p.giant ? null : (swinging ? p.swingWeapon : p.weaponId), build: p.build, hair: p.hairStyle,
          squash: (p.flatUntil && this.time < p.flatUntil),
          hat: Storage.data.equippedHat, t: this.time, armor: p.giant ? null : p.armorRender,
          rage: p.hasBuff('rage', this.time), burning: p.burnUntil > this.time, outfit: p.outfit,
        };
        Sprites.drawCharacter(ctx, 0, 0, p.dir, p.pal, pOpts);
        if (p._flashUntil > this.time) { ctx.globalAlpha = Math.min(0.9, (p._flashUntil - this.time) / 130 * 0.95); Sprites.drawCharacter(ctx, 0, 0, p.dir, this._flashPal(p.pal), pOpts); ctx.globalAlpha = 1; }   // witte hit-flash
        ctx.restore();
        if (p.fireballs > 0 || (p._fireHandUntil && this.time < p._fireHandUntil)) this.drawFireHand(ctx, p.x, p.y, p.dir, this.time);   // vuurbal continu in de hand
        if (p._trapCharges > 0) this.drawTrapPreview(ctx, p.x, p.y, p.onGround);   // voorbeeld-val tijdens plaatsen
        }
        if (p.ducking && p.onGround) this.drawBlockGuard(ctx, Math.round(p.x), Math.round(p.y), p.dir);
        if (p.stunUntil && this.time < p.stunUntil) this.drawStunAura(ctx, Math.round(p.x), Math.round(p.y));
        if (p._rootedUntil && this.time < p._rootedUntil) this.drawRooted(ctx, Math.round(p.x), Math.round(p.y));
      }
      this.drawVsMarker(ctx, Math.round(p.x), Math.round(p.y), p.build, '#5aff7a');
      if (this.vs && !this.vsBot && !this.journey) this.drawRankBadge(ctx, Math.round(p.x), Math.round(p.y), p.build, Storage.rankIndex());   // rank-icoon eigen speler
    }
    ctx.globalAlpha = 1;   // onzichtbaar-alpha resetten

    if (map.cave && this.caveWall) this.drawCaveWall(ctx);   // de muur sweept over de spelers heen
    if (map.vulcan) this.drawVulcanJet(ctx);                 // borrel-waarschuwing + lavastraal
    if (map.pirate && this.tentacle) this.drawTentacle(ctx); // zeemonster-tentakel
    if (map.jungle2 && this.jungleApe) this.drawJungleApe(ctx);  // wilde aap in het midden (vóór de spelers)
    if (map.airplane && this.birds) for (const b of this.birds) this.drawBird(ctx, b);   // vogels vóór de spelers
    if (map.darts && this.darts) for (const d of this.darts) this.drawStunDart(ctx, d);  // Jungle: stun-darts vóór de spelers
    if (map.castle && this.castleDragons) for (const d of this.castleDragons) this.drawSkyDragon(ctx, d);  // Sky Castle: duikende draak vóór de spelers
    if (this.ball) this.drawBall(ctx);                       // strandbal
    if (map.beach && this.tide) this.drawTideWater(ctx);     // vloed-water over de spelers
    // Ryan zap-dash: bliksemboog van start -> eind
    if (this.zapFx) {
      const z = this.zapFx, t = (this.time - z.born) / z.dur;
      if (t >= 0 && t < 1) {
        const a = 1 - t, dx = z.x1 - z.x0, dy = z.y1 - z.y0, len = Math.hypot(dx, dy) || 1;
        const nxp = -dy / len, nyp = dx / len;                 // loodrecht op het pad
        const segs = 9;
        // 2 lagen: dikke gloed + felle kern
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass ? '#ffffff' : '#7fd4ff';
          ctx.lineWidth = pass ? 1.4 : 3.2;
          ctx.globalAlpha = a * (pass ? 1 : 0.55);
          ctx.beginPath(); ctx.moveTo(z.x0, z.y0);
          for (let i = 1; i < segs; i++) {
            const f = i / segs;
            const zig = (i % 2 ? 1 : -1) * (4 + Math.random() * 5) * Math.sin(f * Math.PI);
            ctx.lineTo(z.x0 + dx * f + nxp * zig, z.y0 + dy * f + nyp * zig);
          }
          ctx.lineTo(z.x1, z.y1); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    // ability-effect: magische ring + sprankels rond de speler die 'm inzette
    if (this.abilityFx) for (const fx of this.abilityFx) {
      const t = (this.time - fx.born) / fx.dur; if (t < 0 || t >= 1) continue;
      const cy = fx.y - 12, R = 8 + t * (fx.ring ? fx.ring - 8 : 30), a = 1 - t;
      ctx.strokeStyle = fx.color; ctx.lineWidth = 2.5; ctx.globalAlpha = a * 0.85;
      ctx.beginPath(); ctx.arc(fx.x, cy, R, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = a * 0.5; ctx.beginPath(); ctx.arc(fx.x, cy, R * 0.6, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = a;
      for (let k = 0; k < 6; k++) { const ang = t * 6 + k * 1.05; Sprites.px(ctx, '#ffffff', Math.round(fx.x + Math.cos(ang) * R), Math.round(cy + Math.sin(ang) * R), 2, 2); }
      ctx.globalAlpha = 1;
    }
    // impact-schokgolven op de raakpunten
    if (this.impacts) for (const im of this.impacts) {
      const t = (this.time - im.born) / im.dur; if (t < 0 || t >= 1) continue;
      const R = (im.big ? 6 : 4) + t * (im.big ? 34 : 22), a = 1 - t;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = im.big ? 2.4 : 1.6; ctx.globalAlpha = a * 0.9;
      ctx.beginPath(); ctx.arc(im.x, im.y, R, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // KO-schokgolf op de ring-out-plek
    if (this.ko) {
      const t = (this.time - this.ko.born) / 520;
      if (t >= 0 && t < 1) {
        const R = 8 + t * 92, a = 1 - t;
        ctx.strokeStyle = this.ko.won ? '#9dffb0' : '#ff9a9a'; ctx.lineWidth = 3; ctx.globalAlpha = a * 0.9;
        ctx.beginPath(); ctx.arc(this.ko.x, this.ko.y - 8, R, 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = a * 0.5; ctx.beginPath(); ctx.arc(this.ko.x, this.ko.y - 8, R * 0.6, 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // zwevende schade-/combo-cijfers (wereld-ruimte, schalen mee met de zoom)
    if (this.floatTexts) for (const ft of this.floatTexts) {
      const t = (this.time - ft.born) / ft.dur; if (t < 0 || t >= 1) continue;
      ctx.globalAlpha = t < 0.15 ? t / 0.15 : (1 - (t - 0.15) / 0.85);
      ctx.font = 'bold ' + Math.round(7 * ft.scale) + 'px "Courier New", monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(ft.text, ft.x + 0.6, ft.y + 0.6);
      ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    ctx.restore();

    // schermflitsen + vignet (scherm-ruimte, over de wereld)
    if (this.smashFlash > 0) { ctx.globalAlpha = Math.min(0.6, this.smashFlash / 210 * 0.6); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (this.hurtFlash > 0) {
      const ha = Math.min(0.5, this.hurtFlash / 240 * 0.5);
      const hg = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.75);
      hg.addColorStop(0, 'rgba(210,30,30,0)'); hg.addColorStop(1, 'rgba(190,20,20,' + ha + ')');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.98);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    // draken (drakenei-powerup) — scherm-ruimte, over de wereld heen
    this.renderDragons(ctx);
    // bliksem (Cave/Sky) — scherm-ruimte
    this.renderLightning(ctx);
    // combo-teller
    this.drawComboHud(ctx);
    // NUKE-afteltimer wordt nu in de DOM getoond (net onder de normale timer) via UI.updateVersusHUD

    // Power Smash: huidige item/wapen (scherm-ruimte, onderin)
    if (this.vsMode === 'smash') {
      const p2 = this.player; let line = '';
      if (p2.fireballs > 0) line = 'FIRE x' + p2.fireballs;
      else if (p2.smashRockets > 0) line = 'RPG x' + p2.smashRockets;
      const wn = (WEAPONS[p2.meleeId] && p2.meleeId !== 'bat') ? WEAPONS[p2.meleeId].name : 'Bat';
      ctx.fillStyle = '#ffe27a'; ctx.font = 'bold 9px "Courier New", monospace'; ctx.textAlign = 'center';
      ctx.fillText(wn + (line ? '   ' + line : ''), W / 2, H - 7);
      ctx.textAlign = 'left';
    }
  },

  drawDrop(ctx, d) {
    const bob = Math.round(Math.sin((this.time + d.id * 200) / 300) * 2);
    const x = d.x, y = d.y + bob;
    ctx.globalAlpha = 0.22; Sprites.px(ctx, '#ffffff', x - 7, y - 9, 14, 16); ctx.globalAlpha = 1;
    if (d.kind === 'weapon') { Sprites.px(ctx, '#cfd6df', x - 5, y - 3, 10, 3); Sprites.px(ctx, '#9aa3ad', x - 5, y - 3, 10, 1); Sprites.px(ctx, '#5a3a22', x + 3, y - 4, 3, 5); }
    else if (d.kind === 'fireball') { Sprites.px(ctx, '#ff7a2a', x - 4, y - 5, 8, 9); Sprites.px(ctx, '#ffd24a', x - 2, y - 3, 4, 5); }
    else if (d.kind === 'rocket') { Sprites.px(ctx, '#3a4750', x - 5, y - 2, 9, 4); Sprites.px(ctx, '#d94343', x + 3, y - 2, 3, 4); Sprites.px(ctx, '#ffd24a', x - 6, y - 1, 2, 2); }
    else if (d.kind === 'health') { Sprites.px(ctx, '#ffffff', x - 5, y - 5, 10, 10); Sprites.px(ctx, '#d33', x - 1, y - 5, 3, 10); Sprites.px(ctx, '#d33', x - 5, y - 1, 10, 3); }
    else if (d.kind === 'rage') { Sprites.px(ctx, '#ff5a3a', x - 4, y - 5, 8, 9); Sprites.px(ctx, '#ffd24a', x - 1, y - 3, 2, 5); }
    else if (d.kind === 'speed') { Sprites.px(ctx, '#3ad0ff', x - 4, y - 5, 8, 9); Sprites.px(ctx, '#eaffff', x - 1, y - 3, 2, 5); }
    else if (d.kind === 'dragon') {
      // drakenei: paars ovaal met schubben + glans (zeldzaam)
      Sprites.px(ctx, '#5a2f93', x - 4, y - 7, 8, 12);
      Sprites.px(ctx, '#8a5ad0', x - 3, y - 7, 6, 12);
      Sprites.px(ctx, '#c9a6ff', x - 2, y - 6, 2, 3);          // glans
      Sprites.px(ctx, '#3f1f6e', x - 4, y - 3, 8, 1);          // schub-band
      Sprites.px(ctx, '#3f1f6e', x - 3, y, 6, 1);
      Sprites.px(ctx, '#ffd24a', x - 1, y - 9, 2, 2);          // sprankel = zeldzaam
    }
    else if (d.kind === 'lightning') {
      // bliksemschicht-icoon (alleen Cave)
      ctx.globalAlpha = 0.3; Sprites.px(ctx, '#bfe6ff', x - 5, y - 8, 10, 14); ctx.globalAlpha = 1;
      Sprites.px(ctx, '#ffd24a', x - 1, y - 7, 3, 5);
      Sprites.px(ctx, '#bfe6ff', x - 3, y - 3, 3, 5);
      Sprites.px(ctx, '#fff', x, y - 2, 2, 4);
    }
    else if (d.kind === 'rock') {
      // steen-icoon
      Sprites.px(ctx, '#6a5e50', x - 5, y - 5, 10, 9);
      Sprites.px(ctx, '#8a7c6a', x - 5, y - 5, 10, 2);
      Sprites.px(ctx, '#4a4036', x - 5, y + 3, 10, 1);
      Sprites.px(ctx, '#3a3229', x - 2, y - 2, 2, 2);
    }
    else if (d.kind === 'cannon') {
      // kanonskogel-icoon
      Sprites.px(ctx, '#0e0e0e', x - 5, y - 4, 10, 10);
      Sprites.px(ctx, '#3a3a3a', x - 5, y - 4, 10, 2);
      Sprites.px(ctx, '#777', x - 2, y - 2, 2, 2);
      Sprites.px(ctx, '#6a4a2a', x - 1, y - 7, 2, 3);   // lont
      Sprites.px(ctx, '#ff8a3a', x - 1, y - 9, 2, 2);   // vonkje
    }
    else if (d.kind === 'shield') {
      // schild-icoon (blauw)
      Sprites.px(ctx, '#2f7ad0', x - 5, y - 6, 10, 9);
      Sprites.px(ctx, '#7fc8ff', x - 5, y - 6, 10, 3);
      Sprites.px(ctx, '#2f7ad0', x - 4, y + 3, 8, 2);
      Sprites.px(ctx, '#1a4f8e', x - 5, y - 6, 2, 9);
      Sprites.px(ctx, '#dff0ff', x - 1, y - 4, 2, 5);   // glans / kruis
      Sprites.px(ctx, '#dff0ff', x - 3, y - 2, 6, 2);
    }
    else if (d.kind === 'giant') {
      // Giant-icoon (grote groene vuist)
      Sprites.px(ctx, '#2f8a3a', x - 5, y - 5, 10, 9);
      Sprites.px(ctx, '#3fb04a', x - 5, y - 5, 10, 3);
      Sprites.px(ctx, '#1f5e28', x - 5, y + 3, 10, 1);
      Sprites.px(ctx, '#7affa0', x - 3, y - 3, 2, 2);
      Sprites.px(ctx, '#cfffe0', x + 2, y - 8, 2, 2);   // sprankel
    }
    else if (d.kind === 'ak47') {
      // AK47-icoon
      Sprites.px(ctx, '#2a2a2e', x - 6, y - 2, 12, 3);  // loop
      Sprites.px(ctx, '#5a3a22', x + 2, y - 1, 4, 5);   // kolf
      Sprites.px(ctx, '#3a2f22', x - 2, y + 1, 3, 4);   // magazijn (gebogen)
      Sprites.px(ctx, '#1a1a1e', x - 1, y + 4, 3, 2);
      Sprites.px(ctx, '#888', x - 6, y - 2, 3, 1);
    }
    else if (d.kind === 'beachball') {
      // strandbal-icoon (gekleurde partjes)
      Sprites.px(ctx, '#ffffff', x - 5, y - 5, 10, 10);
      Sprites.px(ctx, '#e8483b', x - 5, y - 5, 10, 3);
      Sprites.px(ctx, '#3aa0e0', x - 5, y + 2, 10, 3);
      Sprites.px(ctx, '#f2c94c', x - 1, y - 5, 2, 10);
    }
    else if (d.kind === 'coco') {                      // kokosbom
      Sprites.px(ctx, '#5e3f22', x - 5, y - 5, 10, 10); Sprites.px(ctx, '#8a5e36', x - 5, y - 5, 10, 3);
      Sprites.px(ctx, '#3a2614', x - 2, y - 1, 2, 2); Sprites.px(ctx, '#3a2614', x + 1, y + 1, 2, 2);
      Sprites.px(ctx, '#3a8a4a', x - 1, y - 8, 2, 3);   // steeltje
    }
    else if (d.kind === 'boom') {                      // boemerang
      Sprites.px(ctx, '#a8824a', x - 5, y - 1, 7, 2); Sprites.px(ctx, '#a8824a', x - 1, y - 5, 2, 7);
      Sprites.px(ctx, '#7a5e30', x - 5, y - 1, 2, 2); Sprites.px(ctx, '#7a5e30', x - 1, y - 5, 2, 2);
    }
    else if (d.kind === 'dart') {                      // gifdart
      Sprites.px(ctx, '#2f7a3a', x - 5, y - 1, 8, 2); Sprites.px(ctx, '#cfd6df', x + 3, y - 1, 3, 2);
      Sprites.px(ctx, '#6b4a2a', x - 6, y - 1, 2, 2);
    }
    else if (d.kind === 'heli') {
      // gevechtsheli-icoon
      Sprites.px(ctx, '#cfd6df', x - 7, y - 6, 14, 2);   // hoofdrotor
      Sprites.px(ctx, '#7a7a7a', x - 1, y - 5, 2, 2);    // mast
      Sprites.px(ctx, '#3f5a3a', x - 5, y - 3, 9, 6);    // romp
      Sprites.px(ctx, '#a8dcff', x + 1, y - 2, 3, 3);    // cockpit
      Sprites.px(ctx, '#3f5a3a', x - 9, y - 1, 5, 2);    // staart
      Sprites.px(ctx, '#7a7a7a', x - 5, y + 3, 9, 1);    // ski
    }
    else if (d.kind === 'nuke') {
      // nuke-vat met stralings-symbool (geel/zwart)
      Sprites.px(ctx, '#f2c21a', x - 5, y - 5, 10, 10);          // geel vat
      Sprites.px(ctx, '#ffe86a', x - 5, y - 5, 10, 2);           // glans bovenop
      Sprites.px(ctx, '#b8920e', x - 5, y + 3, 10, 2);           // schaduw onder
      Sprites.px(ctx, '#1a1a1a', x - 1, y - 1, 2, 2);            // kern (stralings-symbool)
      Sprites.px(ctx, '#1a1a1a', x - 4, y - 4, 2, 2); Sprites.px(ctx, '#1a1a1a', x + 2, y - 4, 2, 2); Sprites.px(ctx, '#1a1a1a', x - 1, y + 2, 2, 2);   // 3 bladen
    }
    else if (d.kind === 'ninjastar') {
      // ninja-ster (shuriken): 4-punts metalen ster
      Sprites.px(ctx, '#cfd6df', x - 1, y - 5, 2, 10); Sprites.px(ctx, '#cfd6df', x - 5, y - 1, 10, 2);   // plus-vorm
      Sprites.px(ctx, '#f2f6fa', x - 1, y - 5, 2, 3); Sprites.px(ctx, '#f2f6fa', x - 5, y - 1, 3, 2);      // glans
      Sprites.px(ctx, '#8a929c', x - 2, y - 2, 4, 4);            // naaf
      Sprites.px(ctx, '#2a2f36', x - 1, y - 1, 2, 2);            // gaatje
    }
    else if (d.kind === 'smoke') {
      // Smoke Vanish: grijze rookwolk met een paars vanish-vonkje
      Sprites.px(ctx, '#c8ced6', x - 5, y - 2, 10, 6); Sprites.px(ctx, '#e2e6ea', x - 5, y - 2, 10, 2);   // wolk-body + highlight
      Sprites.px(ctx, '#aab0b8', x - 6, y, 3, 4); Sprites.px(ctx, '#aab0b8', x + 3, y, 3, 4);             // pluizige zijkanten
      Sprites.px(ctx, '#dfe4ea', x - 2, y - 5, 5, 3);                                                     // bolletje bovenop
      Sprites.px(ctx, '#9aa3ad', x - 4, y + 4, 8, 1);                                                     // onderrand-schaduw
      Sprites.px(ctx, '#b06bff', x + 3, y - 6, 2, 2); Sprites.px(ctx, '#d9b8ff', x - 5, y - 5, 1, 1);     // vanish-vonkjes
    }
    else if (d.kind === 'crossbow') {
      // kruisboog (zelfde vorm als in de inventaris/shop)
      Sprites.px(ctx, '#7a5230', x - 4, y - 1, 12, 3); Sprites.px(ctx, '#9a6a34', x - 4, y - 1, 12, 1);   // lade (stock) + highlight
      Sprites.px(ctx, '#4a3320', x - 8, y - 6, 2, 13);                                                    // boog-arm (verticaal)
      Sprites.px(ctx, '#4a3320', x - 8, y - 6, 3, 2); Sprites.px(ctx, '#4a3320', x - 8, y + 5, 3, 2);      // boog-uiteinden
      Sprites.px(ctx, '#888f99', x - 7, y, 12, 1);                                                         // pees
      Sprites.px(ctx, '#cfd6df', x + 4, y - 1, 5, 2); Sprites.px(ctx, '#ffffff', x + 7, y - 1, 2, 1);      // geladen pijl
      Sprites.px(ctx, '#3a2f22', x - 2, y + 2, 2, 3);                                                      // trekker/greep
    }
  },

  // draken tekenen (scherm-ruimte): de draak vliegt bovenin en spuugt vuur naar het doel
  renderDragons(ctx) {
    if (!this.dragons || !this.dragons.length) return;
    const camX = this.vsCamX, camY = this.vsCamY, z = this.vsCamZoom || 1;
    for (const d of this.dragons) {
      const dx = Math.round(d.x), dy = 18;
      if (d.beam) {
        const tx = Math.round((d.beam.wx - camX) * z), ty = Math.round((d.beam.wy - camY) * z - 8);
        this.drawFireBeam(ctx, dx + d.dir * 8, dy + 4, tx, ty);
      }
      Sprites.drawDragon(ctx, dx, dy, d.dir, this.time);
    }
  },

  drawFireBeam(ctx, x1, y1, x2, y2) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  },

  // ---- CAVE render ----
  drawCaveBg(ctx) {
    const mapW = this.vsMapW;
    // diepe grot-holtes achter de grond
    const holes = [[120, 150, 58, 40], [360, 168, 90, 54], [600, 150, 58, 40], [250, 116, 44, 28], [470, 116, 44, 28]];
    for (const h of holes) {
      ctx.globalAlpha = 0.65; Sprites.px(ctx, '#05030a', h[0] - h[2], h[1] - h[3], h[2] * 2, h[3] * 2);
      ctx.globalAlpha = 0.35; Sprites.px(ctx, '#1a1230', h[0] - h[2] + 2, h[1] - h[3] + 2, h[2] * 2 - 4, 3);
    }
    ctx.globalAlpha = 1;
    // vleermuizen
    for (const bt of this.caveBats) {
      const up = Math.sin(bt.ph) > 0 ? -2 : 0;
      const x = Math.round(bt.x), y = Math.round(bt.y);
      Sprites.px(ctx, '#0a0710', x - 3, y + up, 2, 2);
      Sprites.px(ctx, '#0a0710', x + 1, y + up, 2, 2);
      Sprites.px(ctx, '#1a1326', x - 1, y, 2, 2);
    }
    // waterdruppels
    for (const dr of this.caveDrips) Sprites.px(ctx, '#5aa0c8', Math.round(dr.x), Math.round(dr.y), 1, 3);
  },

  drawCaveButtons(ctx) {
    if (!this.caveButtons) return;
    for (let i = 0; i < this.caveButtons.length; i++) {
      const b = this.caveButtons[i];
      const armed = i === this.caveArmed;
      const blink = armed && Math.floor(this.time / 200) % 2 === 0;
      Sprites.px(ctx, '#2a2a33', b.x - 5, b.y - 6, 10, 6);                  // sokkel
      Sprites.px(ctx, armed ? (blink ? '#ff3030' : '#7a1414') : '#566', b.x - 3, b.y - 9, 6, 4);   // knop
      if (blink) { ctx.globalAlpha = 0.4; Sprites.px(ctx, '#ff5a5a', b.x - 7, b.y - 13, 14, 12); ctx.globalAlpha = 1; }
    }
  },

  drawCaveWall(ctx) {
    const wl = this.caveWall, map = this.vsMap;
    const y0 = (map.camTop || 0) - 20, y1 = this.vsFallY + 12, x = wl.x;
    ctx.globalAlpha = 0.3; Sprites.px(ctx, '#ff8a4a', x - 8, y0, 8, y1 - y0); ctx.globalAlpha = 1;   // gloed
    Sprites.px(ctx, '#c0392b', x - 3, y0, 6, y1 - y0);                    // dunne straal
    Sprites.px(ctx, '#ffd24a', x - 1, y0, 2, y1 - y0);                    // kern
    for (let i = 0; i < 3; i++) Sprites.px(ctx, '#ffe9a0', x - 2, y0 + ((this.time / 40 + i * 30) % (y1 - y0)), 4, 2);   // sprankels
  },

  // zachte wolk-platform (Sky): pluizig en doorschijnend (je zakt erdoorheen)
  drawSoftCloud(ctx, pf) {
    const x = pf.x, y = pf.y, w = pf.w;
    const bob = Math.sin((this.time + x * 7) / 600) * 1.5;
    ctx.globalAlpha = 0.85;
    Sprites.px(ctx, '#f2f7ff', x - w / 2, y - 3 + bob, w, 8);
    for (let i = -w / 2; i < w / 2 - 2; i += 9) Sprites.px(ctx, '#ffffff', x + i, y - 8 + bob, 13, 8);
    ctx.globalAlpha = 0.35; Sprites.px(ctx, '#c9d8ec', x - w / 2, y + 4 + bob, w, 3);   // zachte onderkant
    ctx.globalAlpha = 1;
  },

  drawRock(ctx, rk) {
    const x = Math.round(rk.x), y = Math.round(rk.y);
    ctx.globalAlpha = 0.25; Sprites.px(ctx, '#000', x - 9, y - 8, 18, 18); ctx.globalAlpha = 1;
    Sprites.px(ctx, '#6a5e50', x - 9, y - 8, 18, 16);
    Sprites.px(ctx, '#8a7c6a', x - 9, y - 8, 18, 3);
    Sprites.px(ctx, '#4a4036', x - 9, y + 5, 18, 3);
    Sprites.px(ctx, '#3a3229', x - 4, y - 3, 3, 3); Sprites.px(ctx, '#3a3229', x + 2, y + 1, 3, 3);
  },

  // schuin (gekanteld) stenen platform
  drawSlantPlatform(ctx, pf, style) {
    ctx.save();
    ctx.translate(Math.round(pf.x), Math.round(pf.y));
    ctx.rotate((pf.slide || 0) * 0.16);
    Sprites.drawPlatform(ctx, 0, 0, pf.w, style || 'stone');
    ctx.restore();
  },

  // mast met kraaiennest (Pirate): houten paal omlaag tot het dek + platform om bovenin te staan
  drawMast(ctx, pf) {
    const x = Math.round(pf.x), deckY = 178;
    Sprites.px(ctx, '#5a3d22', x - 2, pf.y, 4, deckY - pf.y);             // mastpaal
    Sprites.px(ctx, '#4a3219', x - 2, pf.y, 1, deckY - pf.y);
    Sprites.drawPlatform(ctx, pf.x, pf.y, pf.w, 'wood');                  // kraaiennest
    Sprites.px(ctx, '#3a2615', x - pf.w / 2, pf.y - 5, pf.w, 4);          // randje van het nest
  },

  // ===== TEMPLE =====
  // solide stenen muur-blok (pilaar): je loopt ernaast en staat op de bovenkant
  drawTempleBlock(ctx, pf) {
    const x0 = Math.round(pf.x - pf.w / 2), w = Math.round(pf.w);
    const top = Math.round(pf.y), bot = CONFIG.GROUND_Y + 48;
    Sprites.px(ctx, '#6b5f4a', x0, top, w, bot - top);                    // steen-body
    Sprites.px(ctx, '#8a7c60', x0, top, w, 3);                           // licht loopvlak bovenop
    Sprites.px(ctx, '#7d7058', x0, top + 3, 3, bot - top - 3);           // licht links
    Sprites.px(ctx, '#4f4636', x0 + w - 3, top + 3, 3, bot - top - 3);   // schaduw rechts
    for (let yy = top + 12; yy < bot; yy += 12) Sprites.px(ctx, '#4f4636', x0, yy, w, 1);          // horizontale voegen
    for (let yy = top + 3; yy < bot; yy += 24) {                                                    // verticale voegen (verspringend)
      Sprites.px(ctx, '#4f4636', x0 + Math.round(w / 3), yy, 1, 11);
      Sprites.px(ctx, '#4f4636', x0 + Math.round(2 * w / 3), yy + 12, 1, 11);
    }
  },
  // deuren op de muur-blokken (donkere opening met paarse teleport-gloed)
  drawTempleDoors(ctx) {
    if (!this.vsMap || !this.vsMap.doors) return;
    for (const d of this.vsMap.doors) {
      const x0 = Math.round(d.x - 6), top = Math.round(d.y - 22), h = 22;
      Sprites.px(ctx, '#8a7c60', x0 - 2, top - 3, 16, 3);               // boog bovenaan
      Sprites.px(ctx, '#161009', x0, top, 12, h);                       // donkere opening
      Sprites.px(ctx, '#0a0704', x0 + 2, top + 2, 8, h - 2);
      const glow = 0.35 + Math.sin(this.time / 280 + d.x) * 0.25;
      ctx.globalAlpha = Math.max(0, glow);
      Sprites.px(ctx, '#b06bff', x0, top, 12, 1); Sprites.px(ctx, '#b06bff', x0, top, 1, h); Sprites.px(ctx, '#b06bff', x0 + 11, top, 1, h);
      Sprites.px(ctx, '#8fd0ff', x0 + 4, top + h - 4, 4, 3);            // rune-gloed in de opening
      ctx.globalAlpha = 1;
    }
  },
  // BUITEN-tempel-achtergrond: avondlucht + zon, grote getrapte stenen tempel-piramide, jungle-treeline
  drawTempleBg(ctx) {
    const W = this.vsMapW, cx = Math.round(W / 2);
    // avondzon laag achter de tempel
    const sg = ctx.createRadialGradient(cx, 60, 6, cx, 60, 70);
    sg.addColorStop(0, 'rgba(255,236,170,0.9)'); sg.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = sg; ctx.fillRect(cx - 80, -30, 160, 130);
    Sprites.px(ctx, '#ffe9a0', cx - 8, 44, 16, 16);                     // zonschijf
    // grote getrapte tempel-piramide in het midden op de achtergrond
    const baseY = 172, tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const tw = 190 - i * 26, ty = baseY - i * 18;
      const col = i % 2 ? '#7a6a4e' : '#8a7a5a';
      Sprites.px(ctx, col, cx - tw / 2, ty - 18, tw, 18);
      Sprites.px(ctx, '#9a8a68', cx - tw / 2, ty - 18, tw, 3);         // lichte bovenrand per trede
      Sprites.px(ctx, '#5f5238', cx - tw / 2, ty - 2, tw, 2);          // schaduw onderrand
    }
    // trap in het midden van de piramide
    for (let i = 0; i < tiers * 3; i++) Sprites.px(ctx, '#6a5c40', cx - 6, baseY - i * 6, 12, 3);
    // tempel-ingang bovenop
    Sprites.px(ctx, '#2a2016', cx - 9, baseY - tiers * 18 - 16, 18, 16);
    Sprites.px(ctx, '#3a2e1e', cx - 11, baseY - tiers * 18 - 18, 22, 3);
    // jungle-treeline links en rechts (silhouet)
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 10; i++) {
      const tx = i < 5 ? 8 + i * 26 : W - (8 + (i - 5) * 26);
      const th = 30 + ((i * 37) % 22);
      Sprites.px(ctx, '#173a22', tx - 8, 172 - th, 16, th);           // struik-kruin
      Sprites.px(ctx, '#0e2716', tx - 8, 172 - th, 16, 4);
    }
    ctx.globalAlpha = 1;
  },

  // tempel-BINNENkant: donkere stenen zaal met pilaren, gouden glyphs en flakkerende wandfakkels
  drawTempleInteriorBg(ctx) {
    const W = this.vsMapW, gy = CONFIG.GROUND_Y;
    // donkere achterwand met blokken-metselwerk
    ctx.fillStyle = '#241a12'; ctx.fillRect(0, 0, W, gy);
    for (let y = 4; y < gy; y += 16) { const off = ((y / 16) % 2) * 16; for (let x = -off; x < W; x += 32) Sprites.px(ctx, '#2c2117', x + 1, y, 30, 14); }
    // zachte lichtschacht van bovenaf (door een dakopening)
    const lg = ctx.createLinearGradient(0, 0, 0, gy); lg.addColorStop(0, 'rgba(255,224,150,0.12)'); lg.addColorStop(1, 'rgba(255,224,150,0)');
    ctx.fillStyle = lg; ctx.fillRect(Math.round(W * 0.32), 0, Math.round(W * 0.36), gy);
    // rij zware pilaren op de achtergrond
    [40, 180, 320].forEach((px) => {
      Sprites.px(ctx, '#463526', px - 12, 8, 24, gy - 8);
      Sprites.px(ctx, '#54402d', px - 12, 8, 6, gy - 8);        // licht-kant
      Sprites.px(ctx, '#2c2015', px + 6, 8, 6, gy - 8);         // schaduw-kant
      Sprites.px(ctx, '#5a4632', px - 15, 3, 30, 6);            // kapiteel
      Sprites.px(ctx, '#5a4632', px - 15, gy - 10, 30, 10);     // voetstuk
      for (let y = 22; y < gy - 12; y += 7) Sprites.px(ctx, '#2c2015', px - 3, y, 6, 2);   // groeven
    });
    // gouden glyphs op de wand
    ctx.globalAlpha = 0.55;
    const glyph = (gx, gy2) => { Sprites.px(ctx, '#b8912e', gx, gy2, 2, 9); Sprites.px(ctx, '#b8912e', gx - 3, gy2 + 2, 8, 2); Sprites.px(ctx, '#b8912e', gx - 2, gy2 + 6, 6, 2); };
    glyph(108, 44); glyph(232, 50); glyph(285, 40);
    ctx.globalAlpha = 1;
    // flakkerende wandfakkels
    const torch = (tx, ty) => {
      Sprites.px(ctx, '#3a2a18', tx - 1, ty, 3, 13);
      const fl = 3 + Math.round(Math.sin(this.time / 90 + tx) * 1.7);
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.arc(tx, ty - 4, fl + 7, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffb23a'; ctx.beginPath(); ctx.arc(tx, ty - 6, fl, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(tx, ty - 6, fl * 0.5, 0, 6.2832); ctx.fill();
    };
    torch(108, 70); torch(232, 72); torch(285, 66);
  },

  // schatkamer-BINNENkant: donkere kamer met goudstapels, kisten, juwelen en een gouden afgodsbeeld
  drawTreasureBg(ctx) {
    const W = this.vsMapW, gy = CONFIG.GROUND_Y, cx = Math.round(W / 2);
    // donkere kamerwand met metselwerk
    ctx.fillStyle = '#1e1610'; ctx.fillRect(0, 0, W, gy);
    for (let y = 4; y < gy; y += 16) { const off = ((y / 16) % 2) * 16; for (let x = -off; x < W; x += 32) Sprites.px(ctx, '#271c13', x + 1, y, 30, 14); }
    // warme gouden gloed langs de vloer
    const g = ctx.createLinearGradient(0, gy - 72, 0, gy); g.addColorStop(0, 'rgba(230,180,60,0)'); g.addColorStop(1, 'rgba(230,180,60,0.20)'); ctx.fillStyle = g; ctx.fillRect(0, gy - 72, W, 72);
    // groot gouden afgodsbeeld centraal op de achtergrond
    Sprites.px(ctx, '#8a6a2c', cx - 13, gy - 56, 26, 52); Sprites.px(ctx, '#b89440', cx - 13, gy - 56, 20, 52); Sprites.px(ctx, '#d8b048', cx - 15, gy - 60, 30, 6);
    ctx.fillStyle = '#e83030'; ctx.fillRect(cx - 6, gy - 50, 3, 3); ctx.fillRect(cx + 4, gy - 50, 3, 3);   // robijn-ogen
    Sprites.px(ctx, '#3a2e18', cx - 4, gy - 42, 8, 2);
    // goudstapels tegen de wand (binnen de vloer, achter de spelers)
    const gold = (x) => { for (let r = 0; r < 5; r++) { const rw = 34 - r * 6; Sprites.px(ctx, '#e8b431', x - rw / 2, gy - 8 - r * 4, rw, 4); } Sprites.px(ctx, '#fff0a0', x - 14, gy - 8, 5, 2); };
    gold(66); gold(300);
    // schatkisten
    const chest = (x) => { Sprites.px(ctx, '#6a4326', x, gy - 18, 28, 18); Sprites.px(ctx, '#8a5a30', x, gy - 22, 28, 6); Sprites.px(ctx, '#c98a3a', x - 1, gy - 16, 30, 2); Sprites.px(ctx, '#e8b431', x + 11, gy - 20, 6, 8); };
    chest(92); chest(244);
    // losse juwelen
    const gem = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, 4, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y, 1, 1); };
    gem(128, gy - 5, '#e8425a'); gem(160, gy - 6, '#42a0e8'); gem(206, gy - 5, '#57e08a'); gem(228, gy - 6, '#c060e0');
    // wandfakkels (flakkerend)
    const torch = (tx, ty) => { Sprites.px(ctx, '#3a2a18', tx - 1, ty, 3, 13); const fl = 3 + Math.round(Math.sin(this.time / 90 + tx) * 1.7); ctx.globalAlpha = 0.3; ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.arc(tx, ty - 4, fl + 7, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#ffb23a'; ctx.beginPath(); ctx.arc(tx, ty - 6, fl, 0, 6.2832); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(tx, ty - 6, fl * 0.5, 0, 6.2832); ctx.fill(); };
    torch(70, 74); torch(290, 74);
    // fonkelingen op het goud
    ctx.fillStyle = '#fff6c8'; for (let i = 0; i < 5; i++) { const sx = (i * 71 + 40) % W, ph = (this.time / 260 + i) % 3; if (ph < 1) Sprites.px(ctx, '#fff6c8', sx, gy - 10 - (i % 3) * 4, 1, 1); }
  },

  // piratenschip-achtergrond: water + zeil + (langzaam opkomend) zeemonster op de achtergrond
  drawPirateBg(ctx) {
    const W = this.vsMapW, deckY = 178;
    // water (golvend) ver op de achtergrond
    for (let i = 0; i < W; i += 16) {
      const wy = deckY - 8 + Math.round(Math.sin(this.time / 320 + i * 0.05) * 2);
      ctx.globalAlpha = 0.5; Sprites.px(ctx, '#1d4f78', i, wy, 16, deckY - wy + 6); ctx.globalAlpha = 1;
      Sprites.px(ctx, '#2f74a8', i, wy, 9, 2);
    }
    // groot zeil op de achtergrond
    ctx.globalAlpha = 0.5;
    Sprites.px(ctx, '#d8cba8', W / 2 - 70, 26, 140, 64);
    Sprites.px(ctx, '#c8b890', W / 2 - 70, 26, 140, 4);
    Sprites.px(ctx, '#b84a3a', W / 2 - 12, 40, 24, 20);                   // doodskopvlag-vlak
    ctx.globalAlpha = 1;
    // zeemonster komt LANGZAAM uit het water op de achtergrond (achter het schip)
    this.drawSeaMonster(ctx);
  },

  // het zeemonster-hoofd dat langzaam uit het achtergrondwater opkomt
  drawSeaMonster(ctx) {
    const v = this.tentacle; if (!v || v.state === 'idle') return;
    const deckY = 178, x = v.x;
    let rise = 0;
    if (v.state === 'warn') rise = Math.max(0, Math.min(1, (PIRATE_TENT_WARN - (v.nextAt - this.time)) / PIRATE_TENT_WARN));
    else if (v.state === 'strike') rise = 1;
    const top = (deckY + 6) - Math.round(96 * rise);     // top van de kop, komt langzaam omhoog
    const h = (deckY + 6) - top;
    if (h < 4) return;
    Sprites.px(ctx, '#14352a', x - 26, top, 52, h);       // donkere kop
    Sprites.px(ctx, '#1f5640', x - 26, top, 52, 4);       // bovenrand
    Sprites.px(ctx, '#0e261d', x - 26, top, 4, h);        // schaduw
    if (h > 22) {                                         // gloeiende ogen verschijnen
      Sprites.px(ctx, '#ffe27a', x - 14, top + 9, 6, 6); Sprites.px(ctx, '#ffe27a', x + 8, top + 9, 6, 6);
      Sprites.px(ctx, '#000', x - 12, top + 11, 3, 3); Sprites.px(ctx, '#000', x + 10, top + 11, 3, 3);
    }
  },

  // zeemonster-tentakel: waarschuwing (water borrelt), daarna slaat 'ie LANGZAAM HARD op en neer
  drawTentacle(ctx) {
    const v = this.tentacle; if (!v || v.state === 'idle') return;
    const x = v.x, deckY = 178, waterY = deckY + 4;
    if (v.state === 'warn') {
      for (let i = 0; i < 7; i++) { const bx = x + Math.sin(this.time / 110 + i) * 14; const by = waterY - ((this.time / 170 + i * 6) % 18); Sprites.px(ctx, '#7fe0a0', Math.round(bx), Math.round(by), 3, 3); }
      ctx.globalAlpha = 0.5; Sprites.px(ctx, '#3aa86a', x - 16, waterY - 2, 32, 4); ctx.globalAlpha = 1;
    } else if (v.state === 'strike') {
      // de tentakel zwaait langzaam met grote slag op en neer
      const sway = Math.sin(this.time / 240);                            // langzaam
      const topY = (this.vsMap.camTop || 0) + 8 + Math.round(sway * 34);  // tip zwaait op/neer
      const h = waterY - topY;
      for (let i = 0; i < h; i += 4) {
        const t = i / h;
        const wob = Math.round(Math.sin(this.time / 200 + i * 0.1) * (4 + t * 22));
        const w = Math.max(4, Math.round(12 - t * 7));
        Sprites.px(ctx, '#2e8a58', x - w / 2 + wob, waterY - i, w, 4);
        Sprites.px(ctx, '#3aa86a', x - w / 2 + wob + 1, waterY - i, 2, 4);
        if (i % 12 === 0) Sprites.px(ctx, '#1e5e3a', x - w / 2 + wob, waterY - i, 2, 2);   // zuignap
      }
    }
  },

  // ---- JUNGLE render ----
  drawJungleBg(ctx) {
    const W = this.vsMapW, gy = CONFIG.GROUND_Y;
    for (let i = -40; i < W + 40; i += 70) { const h = 60 + ((Math.abs(i) * 37) % 50); Sprites.px(ctx, '#0f2a19', i, gy - h, 62, h); }
    for (let i = -20; i < W + 40; i += 92) { const h = 92 + ((Math.abs(i) * 23) % 64); Sprites.px(ctx, '#15391f', i, gy - h, 66, h); }
    for (let i = -40; i < W + 40; i += 42) Sprites.px(ctx, '#1c4a2c', i - 6, -34, 54, 38);   // bladerdak bovenin
    // papegaaien (vliegen traag over)
    const cols = ['#e8483b', '#f2c94c', '#3aa0e0', '#7affa0', '#ff8a3a'];
    for (let k = 0; k < 5; k++) {
      const px = ((k * 220 + this.time * 0.03) % (W + 90)) - 45;
      const py = 0 + (k * 27 % 80) + Math.sin(this.time / 120 + k) * 3;
      const c = cols[k % cols.length];
      Sprites.px(ctx, c, Math.round(px - 3), Math.round(py), 6, 3);            // lijf
      Sprites.px(ctx, c, Math.round(px - 5), Math.round(py - 1), 3, 2);        // vleugel
      Sprites.px(ctx, '#ffd24a', Math.round(px + 3), Math.round(py), 2, 2);    // snavel
      Sprites.px(ctx, '#1c4a2c', Math.round(px - 8), Math.round(py + 1), 4, 1);// staart
    }
  },
  // troonzaal-eindbaas: grote stenen/mos-troon met lianen en een schedel (achter de spelers)
  drawThrone(ctx) {
    const cx = 180, by = 150;                                  // op het hoofdplatform
    // lianen die van het bladerdak naar beneden hangen, achter de troon
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 5; i++) { const lx = cx - 60 + i * 30; Sprites.px(ctx, '#2e7a3f', lx, -20, 2, by - 40 + ((i * 13) % 20)); Sprites.px(ctx, '#3a8a4a', lx - 2, 40 + ((i * 17) % 30), 5, 4); }
    ctx.globalAlpha = 1;
    // stenen sokkel / treden
    Sprites.px(ctx, '#3a4a2e', cx - 40, by - 5, 80, 7);
    Sprites.px(ctx, '#4a5a3a', cx - 32, by - 11, 64, 7);
    // rugleuning (hoog, mos-steen) + hoorns bovenaan
    Sprites.px(ctx, '#4a3c28', cx - 26, by - 58, 52, 48);
    Sprites.px(ctx, '#5f4e34', cx - 21, by - 54, 42, 42);
    Sprites.px(ctx, '#3a2f1e', cx - 30, by - 66, 12, 16); Sprites.px(ctx, '#3a2f1e', cx + 18, by - 66, 12, 16);   // hoorns/punten
    // zitting + armleuningen
    Sprites.px(ctx, '#3a2f1e', cx - 26, by - 22, 52, 12);
    Sprites.px(ctx, '#4a3c28', cx - 34, by - 30, 10, 20); Sprites.px(ctx, '#4a3c28', cx + 24, by - 30, 10, 20);
    // gouden banden + schedel-embleem
    Sprites.px(ctx, '#caa12e', cx - 21, by - 40, 42, 3);
    Sprites.px(ctx, '#e8e0cf', cx - 8, by - 50, 16, 13);      // schedel
    Sprites.px(ctx, '#1a1a1a', cx - 5, by - 46, 4, 4); Sprites.px(ctx, '#1a1a1a', cx + 1, by - 46, 4, 4);
    Sprites.px(ctx, '#1a1a1a', cx - 2, by - 41, 4, 3);
    // mos op de armleuningen
    Sprites.px(ctx, '#3a8a4a', cx - 34, by - 30, 10, 3); Sprites.px(ctx, '#3a8a4a', cx + 24, by - 30, 10, 3);
  },
  // Dohyo-achtergrond: Japanse dojo met shoji-wand, rijzende zon en een hangend dak (tsuriyane) met 4 kwasten
  drawDohyoBg(ctx) {
    const W = this.vsMapW || 360, gy = CONFIG.GROUND_Y, cx = Math.round(W / 2);
    // rijzende zon achter het midden
    ctx.fillStyle = '#c85038'; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(cx, 96, 70, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // houten achterwand + shoji (rijstpapier) panelen
    Sprites.px(ctx, '#4a3826', 0, gy - 64, W, 12);                 // donkere houten plint boven de vloer
    for (let px = 8; px < W - 30; px += 48) {
      Sprites.px(ctx, '#e7ddc6', px, 34, 42, 80);                  // papier
      Sprites.px(ctx, '#6b5238', px, 34, 2, 80); Sprites.px(ctx, '#6b5238', px + 40, 34, 2, 80);  // verticale frames
      Sprites.px(ctx, '#6b5238', px, 34, 42, 2); Sprites.px(ctx, '#6b5238', px, 72, 42, 2);        // dwarslatten
      Sprites.px(ctx, '#6b5238', px + 20, 34, 1, 80);             // middenlat
    }
    // hangend dak (tsuriyane) boven de ring
    const ry = -6, rw = 96;
    Sprites.px(ctx, '#2a1c12', cx - rw / 2 - 6, ry + 12, rw + 12, 5);     // onderrand dak
    for (let i = 0; i < 9; i++) Sprites.px(ctx, '#7a2418', cx - rw / 2 + i * 3, ry + 2 + i, rw - i * 6, 1); // schuin pannendak
    Sprites.px(ctx, '#b8862e', cx - rw / 2 - 6, ry + 10, rw + 12, 2);     // gouden rand
    // 4 kwasten (fusa) aan de hoeken: paars, wit, rood, zwart
    const fusa = ['#6b3fa0', '#e8e0cf', '#c83838', '#2a2a2a'];
    const fx = [cx - rw / 2 - 4, cx - rw / 6, cx + rw / 6, cx + rw / 2 + 1];
    for (let i = 0; i < 4; i++) { Sprites.px(ctx, fusa[i], fx[i], ry + 16, 4, 9); Sprites.px(ctx, fusa[i], fx[i] + 1, ry + 25, 2, 3); }
    // verticale banners (nobori) aan de zijkanten
    Sprites.px(ctx, '#b83a2a', 6, 40, 7, 70); Sprites.px(ctx, '#e8e0cf', 8, 46, 3, 20);
    Sprites.px(ctx, '#b83a2a', W - 13, 40, 7, 70); Sprites.px(ctx, '#e8e0cf', W - 11, 46, 3, 20);
  },
  drawVines(ctx) {
    if (!this.vsVines) return;
    for (const vn of this.vsVines) {
      let angle = null, len = vn.len;
      // hangt iemand eraan? -> de liaan slingert mee
      if (this.player.vine && Math.abs(this.player.vine.vx - vn.x) < 2) { angle = this.player.vine.angle; len = this.player.vine.len; }
      else if (this.vs && this.vs.remote && this.vs.remote.alive && !this.vs.remote.onGround) {
        const r = this.vs.remote, dx = r.x - vn.x, dy = r.y - vn.ay, dist = Math.hypot(dx, dy);
        if (Math.abs(dx) < 16 && dy > 20 && dist < vn.len + 18) { angle = Math.atan2(dx, dy); len = Math.min(vn.len, dist); }
      }
      if (angle == null) angle = Math.sin(this.time / 900 + vn.x * 0.05) * 0.16;   // zachte sway als er niemand hangt
      for (let i = 0; i <= len; i += 6) {
        const sx = vn.x + Math.sin(angle) * i, sy = vn.ay + Math.cos(angle) * i;
        Sprites.px(ctx, (i % 18 < 9) ? '#3a6b2a' : '#346024', Math.round(sx) - 1, Math.round(sy), 3, 6);
      }
      Sprites.px(ctx, '#2a5020', vn.x - 2, vn.ay - 2, 5, 4);                   // ankerknoop
      Sprites.px(ctx, '#4a8a3a', Math.round(vn.x + Math.sin(angle) * len) - 3, Math.round(vn.ay + Math.cos(angle) * len), 7, 4);  // blad
    }
  },
  drawGorilla(ctx) {
    const g = this.gorilla; if (!g || !g.alive) return;
    const x = Math.round(g.x), y = Math.round(g.y), s = g.dir;
    const fur = (g.hitFlash > 0 && Math.floor(this.time / 60) % 2 === 0) ? '#d8a0a0' : '#3a3330', furDk = '#2a2522';
    Sprites.px(ctx, fur, x - 24, y - 30, 8, 26); Sprites.px(ctx, fur, x + 16, y - 30, 8, 26);   // armen
    Sprites.px(ctx, fur, x - 16, y - 34, 32, 34);                              // lijf
    Sprites.px(ctx, furDk, x - 16, y - 34, 5, 34);
    Sprites.px(ctx, '#5a524c', x - 8, y - 26, 16, 18);                         // borst
    Sprites.px(ctx, fur, x - 12, y - 47, 24, 15);                             // kop
    Sprites.px(ctx, '#d8b89a', x - 7, y - 40, 14, 6);                         // snuit
    Sprites.px(ctx, '#000', x - 5, y - 44, 2, 2); Sprites.px(ctx, '#000', x + 3, y - 44, 2, 2);  // ogen
    if (g.state === 'swipe') { Sprites.px(ctx, fur, x + (s > 0 ? 14 : -26), y - 46, 12, 8); }   // klap-arm omhoog
    if (g.hp < g.maxHp) { const bw = 44; Sprites.px(ctx, '#11151e', x - bw / 2 - 1, y - 58, bw + 2, 5); Sprites.px(ctx, '#cc3333', x - bw / 2, y - 57, Math.round(bw * Math.max(0, g.hp / g.maxHp)), 3); }
  },
  // de wilde aap in de jungle: bruine chimp die springt; armen omhoog tijdens de sprong
  drawJungleApe(ctx) {
    const a = this.jungleApe; if (!a) return;
    const x = Math.round(a.x), y = Math.round(a.y);
    const up = a.state === 'jump';
    const fur = '#6a4a2c', furDk = '#4a3220', chest = '#b98a5a';
    // schaduw op de grond wanneer 'ie in de lucht hangt
    if (up) { ctx.globalAlpha = 0.28; Sprites.px(ctx, '#000', x - 16, a.floorY - 3, 32, 5); ctx.globalAlpha = 1; }
    // armen: omhoog geheven tijdens de sprong (om je te meppen), anders omlaag
    if (up) { Sprites.px(ctx, fur, x - 26, y - 44, 9, 20); Sprites.px(ctx, fur, x + 17, y - 44, 9, 20); }
    else { Sprites.px(ctx, fur, x - 25, y - 30, 9, 26); Sprites.px(ctx, fur, x + 16, y - 30, 9, 26); }
    Sprites.px(ctx, fur, x - 15, y - 34, 30, 34);                              // lijf
    Sprites.px(ctx, furDk, x - 15, y - 34, 5, 34);                            // schaduwrand
    Sprites.px(ctx, chest, x - 8, y - 26, 16, 18);                            // borst/buik (lichter)
    Sprites.px(ctx, fur, x - 12, y - 47, 24, 15);                             // kop
    Sprites.px(ctx, furDk, x - 12, y - 47, 24, 3);                            // wenkbrauwrand
    Sprites.px(ctx, '#e8c8a0', x - 7, y - 40, 14, 7);                         // snuit
    Sprites.px(ctx, '#1a0e06', x - 3, y - 37, 2, 2); Sprites.px(ctx, '#1a0e06', x + 2, y - 37, 2, 2);   // neusgaten
    const eyeY = up ? y - 45 : y - 44;
    Sprites.px(ctx, '#000', x - 5, eyeY, 2, 2); Sprites.px(ctx, '#000', x + 3, eyeY, 2, 2);             // ogen
    if (up) { Sprites.px(ctx, '#c04030', x - 4, y - 42, 8, 3); }              // opengesperde bek tijdens de sprong
  },
  drawCage(ctx) {
    const cg = this.jungleCage; const L = cg.x - cg.w / 2, R = cg.x + cg.w / 2, top = cg.top, bot = cg.floorY + 4;
    Sprites.px(ctx, '#6b6b73', L - 4, top, 4, bot - top); Sprites.px(ctx, '#6b6b73', R, top, 4, bot - top);   // hoekpalen
    ctx.globalAlpha = 0.45;
    for (let bx = L + 6; bx < R; bx += 15) Sprites.px(ctx, '#9a9aa2', bx, top, 2, bot - top);   // zijtralies (doorzichtig)
    ctx.globalAlpha = 1;
    // bovenkant: tralies dicht zolang er iemand opgesloten is (gorilla leeft)
    const closed = this.gorilla && this.gorilla.alive && (this.player._caged || (this.bot && this.bot._caged) || (!this.vsBot && this._inCage(this.vs.remote)));
    if (closed) {
      Sprites.px(ctx, '#5a5a62', L - 4, top - 5, cg.w + 8, 5);                 // dwarsbalk
      for (let bx = L; bx <= R; bx += 9) Sprites.px(ctx, '#9a9aa2', bx, top - 4, 2, 7);   // dichte spijlen over de opening
    } else {
      Sprites.px(ctx, '#5a5a62', L - 4, top - 4, cg.w + 8, 4);                 // open: alleen de dwarsbalk
    }
  },

  // scheepsromp onder het dek (boot-vorm: breed bovenaan, smaller onderaan)
  drawPirateHull(ctx) {
    const W = this.vsMapW, deckY = 178;
    const left = 90, right = W - 90, bottom = deckY + 48;
    for (let y = 0; y < bottom - deckY; y++) {
      const t = y / (bottom - deckY);
      const inset = Math.round(t * t * 80);              // krommer naar onderen -> boog
      const lx = left + inset, rx = right - inset;
      const col = y < 4 ? '#6b4a2b' : (y < 10 ? '#5a3d22' : '#46301c');
      Sprites.px(ctx, col, lx, deckY + y, rx - lx, 1);
    }
    // plank-naden + kiel-streep
    for (let px = left + 30; px < right - 20; px += 60) Sprites.px(ctx, '#3a2615', px, deckY + 4, 1, 30);
    Sprites.px(ctx, '#3a2615', Math.round(W / 2) - 1, deckY + 4, 2, 42);
  },

  // de middenmast loopt door het dek heen tot in de romp
  drawPirateMast(ctx) {
    const W = this.vsMapW, x = Math.round(W / 2);
    Sprites.px(ctx, '#5a3d22', x - 3, 18, 6, 200);       // dikke mast van boven tot in de romp
    Sprites.px(ctx, '#4a3219', x - 3, 18, 2, 200);       // schaduwkant
    Sprites.px(ctx, '#6b4a2b', x - 34, 30, 68, 4);       // ra (dwarsbalk voor het zeil)
  },

  // Vulcan-achtergrond: verre vulkanen met gloeiende krater, lavaspatten + rook
  drawVulcanBg(ctx) {
    const baseY = this.vsFallY, mapW = this.vsMapW;
    const mtn = (mx, mw, mh) => {
      for (let i = 0; i < mh; i++) { const ww = Math.max(2, Math.round(mw * (1 - i / mh))); Sprites.px(ctx, '#1c0f0c', mx - ww, baseY - 26 - i, ww * 2, 1); }
      Sprites.px(ctx, '#ff5a2a', mx - 6, baseY - 26 - mh, 12, 3);   // gloeiende krater
      ctx.globalAlpha = 0.3; Sprites.px(ctx, '#ff7a2a', mx - 9, baseY - 30 - mh, 18, 5); ctx.globalAlpha = 1;
    };
    mtn(140, 64, 58); mtn(580, 74, 66);
    for (const b of this.vulcanBg) Sprites.px(ctx, '#ff7a2a', Math.round(b.x), Math.round(b.y), 2, 3);
    for (const s of this.vulcanSmoke) { ctx.globalAlpha = Math.max(0, Math.min(0.4, s.life / 3000)); Sprites.px(ctx, '#6a5a55', Math.round(s.x), Math.round(s.y), 6, 6); }
    ctx.globalAlpha = 1;
  },

  // de lavastraal in het midden (borrel-waarschuwing + uitbarsting)
  drawVulcanJet(ctx) {
    const v = this.vulcan; if (!v) return;
    const x = v.x, baseY = this.vsFallY, topY = ((this.vsMap.camTop || 0) - 10);
    if (v.state === 'bubble') {
      Sprites.px(ctx, '#ff5a2a', x - 13, baseY - 6, 26, 6);                      // gloeiende poel
      ctx.globalAlpha = 0.4; Sprites.px(ctx, '#ff7a2a', x - 15, baseY - 12, 30, 8); ctx.globalAlpha = 1;
      // bubbels komen nu veel hoger op (beter zichtbaar)
      for (let i = 0; i < 8; i++) {
        const bx = x + Math.sin(this.time / 110 + i * 1.3) * 11;
        const by = baseY - 6 - ((this.time / 150 + i * 9) % 56);
        const sz = 3 + (i % 3);
        Sprites.px(ctx, i % 2 ? '#ff9a3a' : '#ffd24a', Math.round(bx), Math.round(by), sz, sz);
      }
    } else if (v.state === 'erupt') {
      const w = 24, h = baseY - topY;                                            // dikkere straal
      ctx.globalAlpha = 0.3; Sprites.px(ctx, '#ff9a3a', x - w / 2 - 5, topY, w + 10, h); ctx.globalAlpha = 1;
      Sprites.px(ctx, '#ff5a1e', x - w / 2, topY, w, h);                          // buitenstraal
      Sprites.px(ctx, '#ff8a3a', x - w / 2 + 3, topY, w - 6, h);                  // mid
      Sprites.px(ctx, '#ffd24a', x - 5, topY, 10, h);                             // hete kern
    }
  },

  drawStunAura(ctx, x, footY) {
    const t = this.time;
    ctx.globalAlpha = 0.22; Sprites.px(ctx, '#6ab8ff', x - 7, footY - 32, 14, 32); ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      const a = t / 55 + i * Math.PI / 2;
      Sprites.px(ctx, (i % 2 ? '#cfeeff' : '#4aa6ff'), Math.round(x + Math.cos(a) * 9), Math.round(footY - 16 + Math.sin(a) * 13), 2, 2);
    }
  },

  // combo-teller in beeld (x1..x5) + verdiende XP
  drawComboHud(ctx) {
    const p = this.player;
    if (!p.combo || this.time >= (p.comboUntil || 0)) return;
    const W = CONFIG.VIEW_W;
    const alpha = Math.min(1, (p.comboUntil - this.time) / 400);     // fade-out op het einde
    ctx.save();
    ctx.globalAlpha = alpha; ctx.textAlign = 'center';
    const col = p.combo >= 5 ? '#ff4d4d' : (p.combo >= 3 ? '#ffb02e' : '#ffe27a');
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillStyle = '#000'; ctx.fillText('x' + p.combo, W / 2 + 1, 45);
    ctx.fillStyle = col; ctx.fillText('x' + p.combo, W / 2, 44);
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillStyle = '#cfe6ff';
    ctx.fillText(p._lastComboXp ? ('+' + p._lastComboXp + ' XP') : 'COMBO', W / 2, 57);
    ctx.restore();
    ctx.textAlign = 'left';
  },

  renderLightning(ctx) {
    if (!this.lightningFx) return;
    if (this.time > this.lightningFx.until) { this.lightningFx = null; return; }
    const camX = this.vsCamX, camY = this.vsCamY, z = this.vsCamZoom || 1;
    const tx = Math.round((this.lightningFx.wx - camX) * z), ty = Math.round((this.lightningFx.wy - camY) * z - 8);
    ctx.save(); ctx.lineCap = 'round';
    const zig = () => { ctx.beginPath(); ctx.moveTo(tx, 0); const segs = 6; for (let i = 1; i <= segs; i++) { const cy = ty * i / segs; const cx = tx + (i < segs ? (Math.random() - 0.5) * 24 : 0); ctx.lineTo(cx, cy); } ctx.stroke(); };
    ctx.globalAlpha = 0.4; ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 6; zig();
    ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; zig();
    ctx.restore();
  },

  // portaalmond (Power Smash): draaiende paars/blauwe ovaal op een platform
  drawPortal(ctx, pt) {
    const t = this.time;
    const mouth = (cx, footY) => {
      const cy = footY - 12, H = 13, W = 8, phase = t / 140;
      // zachte glow eromheen
      ctx.globalAlpha = 0.22; Sprites.px(ctx, '#b06bff', cx - W - 3, cy - H - 3, (W + 3) * 2, (H + 3) * 2); ctx.globalAlpha = 1;
      // ovaal opgebouwd uit rijen, kleur swirlt met hoogte + tijd
      for (let dy = -H; dy <= H; dy++) {
        const k = 1 - (dy * dy) / (H * H); if (k <= 0) continue;
        const w = Math.max(1, Math.round(W * Math.sqrt(k)));
        const band = Math.sin(phase + dy * 0.6);
        const col = band > 0.4 ? '#dff0ff' : (band > -0.2 ? '#b06bff' : '#7a3df0');
        Sprites.px(ctx, col, cx - w, cy + dy, w * 2, 1);
      }
      // donkere kern
      Sprites.px(ctx, '#2a1147', cx - 2, cy - 5, 4, 10);
      // twee draaiende sterretjes
      for (let i = 0; i < 2; i++) { const aa = phase + i * Math.PI; Sprites.px(ctx, '#eaffff', Math.round(cx + Math.cos(aa) * W), Math.round(cy + Math.sin(aa) * H), 2, 2); }
    };
    mouth(pt.ax, pt.ay);
    mouth(pt.bx, pt.by);
  },

  // blok-stand (bukken): glanzend schildje vóór de speler
  drawBlockGuard(ctx, x, footY, dir) {
    const gx = x + dir * 8;
    Sprites.px(ctx, '#9aa3ad', gx, footY - 16, 4 * dir, 12);          // metaal
    Sprites.px(ctx, '#c8ced6', gx, footY - 15, 2 * dir, 10);          // glans
    ctx.globalAlpha = 0.35; Sprites.px(ctx, '#bfe6ff', gx - 2, footY - 18, 8 * dir, 16); ctx.globalAlpha = 1;
  },

  // gekleurd pijltje boven een speler (groen = jij, rood = tegenstander)
  drawVsMarker(ctx, x, footY, build, color) {
    const head = build === 'tall' ? 46 : (build === 'small' ? 28 : 36);
    const bob = Math.round(Math.sin(this.time / 280) * 1.5);
    const ty = footY - head - 4 + bob;                 // bovenkant van het pijltje
    ctx.fillStyle = '#000';                              // donkere rand voor contrast
    ctx.beginPath(); ctx.moveTo(x - 5, ty - 1); ctx.lineTo(x + 5, ty - 1); ctx.lineTo(x, ty + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x - 4, ty); ctx.lineTo(x + 4, ty); ctx.lineTo(x, ty + 5); ctx.closePath(); ctx.fill();
  },
  // gerasteriseerd schild-embleem per rank (uit rankShieldSVG), 1x gecachet
  _rankImg(idx) {
    this._rankImgCache = this._rankImgCache || {};
    if (this._rankImgCache[idx]) return this._rankImgCache[idx];
    const img = new Image();
    try { img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(rankShieldSVG(idx, 48)); } catch (e) {}
    this._rankImgCache[idx] = img;
    return img;
  },
  // rank-embleem (schildje met edelsteen) boven de speler
  drawRankBadge(ctx, x, footY, build, idx) {
    const rk = RANKS[idx]; if (!rk) return;
    const head = build === 'tall' ? 46 : (build === 'small' ? 28 : 36);
    const bob = Math.round(Math.sin(this.time / 280) * 1.5);
    const cy = footY - head - 18 + bob;                 // midden van het embleem, boven het pijltje
    const img = this._rankImg(idx);
    if (img && img.complete && img.naturalWidth) {
      const h = 22, w = h * 48 / 60;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, Math.round(x - w / 2), Math.round(cy - h / 2), Math.round(w), h);
      ctx.imageSmoothingEnabled = false;
    } else {                                            // nog niet geladen -> klein edelsteentje
      const px = (c, xx, yy, w, h) => Sprites.px(ctx, c, Math.round(xx), Math.round(yy), w, h);
      px('#12100a', x - 5, cy - 6, 10, 12); px(rk.col, x - 4, cy - 5, 8, 10); px(rk.glow, x - 4, cy - 5, 8, 2);
    }
  },

  // ================= TRAINING LOBBY (online sandbox, N spelers) =================
  startTraining() {
    const map = TRAINING_MAP;
    this.state = 'training';
    this.training = true;
    this.vsMap = map; this.vsMode = 'smash'; this.vsMapW = map.w; this.vsBot = false; this.bot = null;
    this.vsPaused = false;
    this.time = 0; this.dtScale = 1; this.shake = 0;
    this.vsCamX = 0; this.vsCamY = 0; this.vsCamZoom = 1;
    this.vsFallY = 999999; this.worldId = -1;
    // solide ondergrond over de hele map: geen parkour, geen gaten -> je kunt niet vallen
    this.level = { versus: true, parkour: false, mode: 'versus', length: map.w, isBoss: false };
    this.pits = null;
    // effect-/laag-arrays resetten
    this.zombies = []; this.bullets = []; this.particles = []; this.coinFx = []; this.ammoFx = [];
    this.ammoDrops = []; this.healthDrops = []; this.corpses = []; this.pendingZombies = [];
    this.powerUps = []; this.enemyShots = []; this.obstacles = []; this.rocketShots = []; this.platforms = [];
    this.ghostBullets = []; this.botBullets = []; this.drops = []; this.traps = []; this.portals = []; this.dragons = [];
    this.abilityFx = []; this.impacts = []; this.floatTexts = []; this.ambient = []; this.zapFx = null; this.ko = null;
    this.hitStop = 0; this.hurtFlash = 0; this.smashFlash = 0; this._ambClock = 0;
    this.caveWall = null; this.rocks = []; this.ball = null; this.gorilla = null; this.jungleApe = null; this.birds = []; this._birdAt = 0; this.darts = []; this._dartAt = 0; this.castleDragons = []; this._cDragonAt = 0;
    this.tentacle = null; this.vulcan = null; this.tide = null; this.nuke = null;
    this.buildVersusPlatforms(map);
    // veilige stub zodat gedeelde helpers (applyDrop/smashFire) geen null-this.vs raken
    this.vs = { remote: { alive: false, x: -99999, y: 0, hp: 100, maxHp: 100 }, countdown: 0, roundFreezeUntil: 0, lastSwing: 0 };
    // lokale speler
    const baseMelee = (CHARACTERS[Storage.data.equippedCharacter] || {}).startMelee || 'bat';
    this.player = new Player(baseMelee, null, Storage.data.equippedCharacter);
    this._applyCharLevel(this.player);                 // per-character level-bonussen
    this.player.maxJumps = 2; this.player.jumps = 2;
    this.player.baseMelee = baseMelee; this.player._baseMaxHp = this.player.maxHp;
    this._trainClearWeapons(this.player);
    const sp = map.spawn;
    this.player.x = sp.x; this.player.y = sp.y; this.player.onGround = true; this.player.dir = 1;
    this.player.dead = false; this.player.respawnInvuln = 1000; this.player.charId = Storage.data.equippedCharacter || 'ryan';
    // peers + netwerk
    this.trainPeers = {}; this._trainNetAt = 0; this._trainLastAtk = 0; this._trainHitSet = {}; this._trainNear = false;
    this.trainOnline = false;
    if (window.Net && Net.ready) {
      Net.trainJoin({
        onState: (pl) => this.onTrainState(pl),
        onHit: (pl) => this.onTrainHit(pl),
        onBye: (pl) => { if (pl && pl.id) delete this.trainPeers[pl.id]; },
      }).then(() => { this.trainOnline = true; }).catch(() => { this.trainOnline = false; });
    }
    if (window.Sfx) Sfx.music('jungle');
    if (window.UI && UI.showTraining) UI.showTraining();
  },
  _trainClearWeapons(p) {
    p.fireballs = 0; p.smashRockets = 0; p.stars = 0; p.cannon = 0; p.gunAmmo = 0; p.rangedId = null;
    p.beachball = 0; p.coco = 0; p.boomerang = 0; p.dart = 0; p.shieldHp = 0; p.giant = false; p.heli = false;
    p.meleeId = p.baseMelee || 'bat';                                   // kettingzaag e.d. terug naar basis-melee
    p.weaponId = p.meleeId; p._weaponUntil = 0; p._fireCd = 0; p._trapCharges = 0;
    if (p._baseMaxHp) { p.maxHp = p._baseMaxHp; if (p.hp > p.maxHp) p.hp = p.maxHp; }
  },
  // Training: een melee-wapen kiezen (blijft ook na respawn = wordt je basis-melee)
  trainGiveMelee(id) {
    if (this.state !== 'training' || !this.player || this.player.dead || !WEAPONS[id]) return;
    const p = this.player;
    p.meleeId = id; p.baseMelee = id;
    if (!p.rangedId) p.weaponId = id;                    // niet vervangen als je net een geweer vasthoudt
    this.addFloatText(p.x, p.y - 24, (WEAPONS[id].name || id).toUpperCase(), '#e8edf2', false);
    if (window.Sfx) Sfx.play('pickup');
  },
  // Training: alle opgepakte power-ups weer weghalen (bv. reus terugzetten)
  trainClearPowerups() {
    if (this.state !== 'training' || !this.player) return;
    const p = this.player;
    this._trainClearWeapons(p);
    for (let i = 0; i < 10; i++) this.particles.push(new Particle(p.x, p.y - 12, (Math.random() - 0.5) * 3, -Math.random() * 2.5, '#bfe9ff', 380, 2));
    this.addFloatText(p.x, p.y - 22, 'POWER-UP WEG', '#bfe9ff', false);
    if (window.Sfx) Sfx.play('pickup');
  },
  quitTraining() {
    this.training = false;
    this.state = 'menu';
    if (window.Net) Net.trainLeave();
    this.vs = null; this.trainPeers = {};
    Input.clear();
    document.body.classList.remove('in-game');
    const th = document.getElementById('train-hud'); if (th) th.classList.add('hidden');
    if (window.UI) UI.show('menu');
  },
  trainNearestPeer(maxDist) {
    let best = null, bd = (maxDist || 1e9);
    for (const id in this.trainPeers) {
      const pe = this.trainPeers[id]; const d = Math.abs(pe.x - this.player.x);
      if (d < bd) { bd = d; best = pe; }
    }
    return best;
  },
  onTrainState(s) {
    if (!s || !s.id || !window.Net || s.id === Net.trainMyId()) return;
    let pe = this.trainPeers[s.id]; if (!pe) pe = this.trainPeers[s.id] = { id: s.id };
    pe.nick = s.nick || 'Speler'; pe.x = s.x; pe.y = s.y; pe.dir = s.d || 1; pe.walkPhase = s.wp || 0;
    pe.attacking = s.a === 1; pe.swingWeapon = s.sw || null; pe.heldWeapon = s.hw || 'bat';
    pe.hp = (s.hp != null) ? s.hp : 100; pe.maxHp = s.mh || 100; pe.charId = s.ch || 'ryan'; pe.hat = s.ht || 'none';
    pe.fireHold = s.fb === 1; pe.giant = s.gi === 1; pe.iv = s.iv === 1; pe.rage = s.rg === 1; pe.burn = s.bn === 1;
    pe.lastSeen = this.time;
  },
  onTrainHit(h) {
    if (!h || !window.Net || h.to !== Net.trainMyId()) return;
    const p = this.player; if (!p || p.dead || p.respawnInvuln > 0) return;
    p.hp -= (h.dmg || 0);
    if (h.dir) { p.knockVx = h.dir * (h.power || 12); p.vy = Math.min(p.vy || 0, h.vy || -4); p.onGround = false; }
    if (h.stun) p.stunUntil = Math.max(p.stunUntil || 0, this.time + h.stun);
    this.hurtFlash = Math.max(this.hurtFlash, 150);
    if (h.dmg > 0) this.addFloatText(p.x, p.y - 18, '-' + h.dmg, '#ff5a3a', h.dmg >= 26);
    this.shake = Math.max(this.shake, 6);
    if (p.hp <= 0) this.trainRespawn();
  },
  trainRespawn() {
    const p = this.player, sps = TRAINING_MAP.spawns || [TRAINING_MAP.spawn];
    const sp = sps[Math.floor(Math.abs(Math.sin(this.time * 0.13)) * sps.length) % sps.length] || TRAINING_MAP.spawn;
    for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.2832; this.particles.push(new Particle(p.x, p.y - 12, Math.cos(a) * 3, Math.sin(a) * 3 - 1, i % 2 ? '#ff5a5a' : '#ffffff', 480, 3)); }
    this._trainClearWeapons(p);
    p.x = sp.x; p.y = sp.y; p.vy = 0; p.knockVx = 0; p.onGround = true; p.dead = false;
    p.hp = p.maxHp; p.respawnInvuln = 1500; p.combo = 0;
    p.stunUntil = 0; p.flatUntil = 0; p._rootedUntil = 0; p._invisUntil = 0; p.jumpMul = 1;
    if (window.Sfx) Sfx.play('explos');
  },
  trainBroadcast() {
    if (!window.Net) return;
    const p = this.player;
    Net.trainSend('ts', {
      id: Net.trainMyId(), nick: Net.trainMyNick(),
      x: Math.round(p.x), y: Math.round(p.y), d: p.dir, wp: +(p.walkPhase || 0).toFixed(2),
      a: this.time < p.attackAnimUntil ? 1 : 0, sw: (this.time < (p.swingUntil || 0)) ? (p.swingWeapon || 0) : 0,
      hw: p.weaponId || p.meleeId || 'bat', hp: Math.round(Math.max(0, p.hp)), mh: p.maxHp,
      ch: p.charId || 'ryan', ht: Storage.data.equippedHat || 'none', fb: p.fireballs > 0 ? 1 : 0,
      gi: p.giant ? 1 : 0, iv: (p._invisUntil && this.time < p._invisUntil) ? 1 : 0,
      rg: p.hasBuff('rage', this.time) ? 1 : 0, bn: p.burnUntil > this.time ? 1 : 0,
    });
  },
  // melee-treffers op andere spelers (1 mep = 1 treffer per speler)
  trainingMeleeHits() {
    const p = this.player; if (p.dead || p.giant || p.heli) return;
    const sw = p.swingUntil || 0;
    if (!sw || this.time >= sw) return;
    if (sw !== this._trainLastAtk) { this._trainLastAtk = sw; this._trainHitSet = {}; }
    const reach = Math.max(40, (WEAPONS[p.meleeId] && WEAPONS[p.meleeId].range) || 40);   // lang wapen reikt verder
    for (const id in this.trainPeers) {
      if (this._trainHitSet[id]) continue;
      const pe = this.trainPeers[id];
      const dx = (pe.x - p.x) * p.dir, close = Math.abs(pe.x - p.x) < 24;
      if ((close || (dx > -16 && dx < reach)) && Math.abs((pe.y || p.y) - p.y) < 34) {
        this._trainHitSet[id] = 1;
        p.combo = (this.time < (p.comboUntil || 0)) ? Math.min(COMBO_MAX, (p.combo || 0) + 1) : 1;
        p.comboUntil = this.time + COMBO_WINDOW;
        const wd = (WEAPONS[p.meleeId] ? WEAPONS[p.meleeId].damage : 34) * (p.meleeMul || 1) * p.rageMul(this.time) * comboMul(p.combo);
        const dmg = Math.round(wd * 0.45), kp = 15 + Math.max(0, p.combo - 1) * 8, kvy = -5.5 - Math.max(0, p.combo - 1) * 0.7;
        const kdir = (pe.x >= p.x ? 1 : -1);
        if (window.Net) Net.trainSend('thit', { to: id, from: Net.trainMyId(), dir: kdir, power: kp, vy: kvy, dmg: dmg });
        this.addHitFeel(pe.x, pe.y - 16, kdir, dmg, kp, false, null);
        if (!p._trapCharges) p.abCharge = Math.min(1, p.abCharge + (0.05 + 0.03 * Math.max(0, p.combo - 1)) / (p.abChargeMul || 1));
        this.spawnBlood(pe.x, pe.y - 16);
        if (window.Sfx) Sfx.play('hit');
      }
    }
  },
  // kogels/projectielen raken andere spelers
  updateTrainingBullets(dt) {
    if (!this.bullets.length) return;
    for (const b of this.bullets) {
      if (b.kind === 'coco') {
        b.vy = (b.vy || 0) + 0.4 * this.dtScale; b.x += b.vx * this.dtScale; b.y += b.vy * this.dtScale; b.life += dt;
        let land = b.y > CONFIG.GROUND_Y - 2;
        if (!land && b.vy > 0) for (const pf of this.platforms) { if (!pf.mast && b.x > pf.x - pf.w / 2 && b.x < pf.x + pf.w / 2 && b.y > pf.y - 4 && b.y < pf.y + 10) { land = true; break; } }
        if (land || b.life > 2600) this.explodeCoco(b);
      } else if (b.kind === 'boom') {
        if (!b._ret && b.life > 420) { b.vx = -b.vx; b._ret = true; } b.x += b.vx * this.dtScale; b.life += dt; if (b.life > 1500) b.alive = false;
      } else { b.update(dt, this); }
    }
    for (const b of this.bullets) {
      if (!b.alive || b.kind === 'coco') continue;
      const rw = b.kind === 'rocket' ? 16 : (b.kind === 'cannon' ? 18 : 11), rh = b.kind === 'rocket' ? 20 : (b.kind === 'cannon' ? 22 : 16);
      for (const id in this.trainPeers) {
        const pe = this.trainPeers[id];
        if (Math.abs(b.x - pe.x) < rw && Math.abs(b.y - (pe.y - 16)) < rh) {
          b.alive = false;
          const dmg = (b.hitDmg != null) ? b.hitDmg : Math.round((b.damage || 20) * 0.4);
          const power = (b.power != null) ? b.power : 9, vy = b.kind === 'cannon' ? -8 : -3.5, kd = Math.sign(b.vx) || 1;
          if (window.Net) Net.trainSend('thit', { to: id, from: Net.trainMyId(), dir: kd, power: power, vy: vy, dmg: dmg, stun: b._stun || 0 });
          this.spawnBlood(b.x, b.y);
          for (let i = 0; i < 8; i++) this.particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 3, -Math.random() * 2, b.kind === 'rocket' ? '#ffd24a' : '#ff7a2a', 320, 2));
          this.shake = Math.max(this.shake, b.kind === 'cannon' ? 8 : 4);
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.alive);
  },
  // computer: geef de speler een power-up om uit te proberen
  trainGivePowerup(kind) {
    if (this.state !== 'training' || !this.player || this.player.dead) return;
    this.applyDrop(this.player, { kind, x: this.player.x, y: this.player.y - 10, id: 0 });
    this.addFloatText(this.player.x, this.player.y - 24, (SHOP_POWERUPS[kind] ? SHOP_POWERUPS[kind].name : kind).toUpperCase(), '#8fd0ff', false);
  },

  updateTraining(dt) {
    if (!this.player) return;
    this.time += dt;
    this.dtScale = Math.min(3, dt / 16.6667);
    if (this.abilityFx.length) this.abilityFx = this.abilityFx.filter((f) => this.time - f.born < f.dur);
    if (this.impacts.length) this.impacts = this.impacts.filter((f) => this.time - f.born < f.dur);
    if (this.floatTexts.length) { for (const ft of this.floatTexts) { ft.y += ft.vy * this.dtScale; ft.vy += 0.05 * this.dtScale; } this.floatTexts = this.floatTexts.filter((ft) => this.time - ft.born < ft.dur); }
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.smashFlash > 0) this.smashFlash = Math.max(0, this.smashFlash - dt);
    if (this.zapFx && this.time - this.zapFx.born >= this.zapFx.dur) this.zapFx = null;
    if (this.ko && this.time - this.ko.born > 1200) this.ko = null;
    this._updateAmbient(dt);
    this.updateVersusPlatforms();
    const p = this.player;
    if (p.respawnInvuln > 0) p.respawnInvuln -= dt;
    if (!p.dead && !p._trapCharges) p.abCharge = Math.min(1, p.abCharge + dt / (ABILITY_CHARGE_MS * (p.abChargeMul || 1)));
    if (!p.dead && p.fireballs > 0) this._fireHoldEmbers(p);
    if (p.heli) this.updateHeli(dt);
    else { this.smashFire(dt); p.update(dt, this); }
    p.x = Math.max(8, Math.min(this.vsMapW - 8, p.x));
    this.carryOnPlatform();
    this.updateTrainingBullets(dt);
    if (this.ball) this.updateBall(dt);
    this.trainingMeleeHits();
    if (this.traps && this.traps.length) this.traps = this.traps.filter((t) => this.time - t.born < 25000);
    if (!p.dead && p.hp <= 0) this.trainRespawn();
    for (const id in this.trainPeers) if (this.time - (this.trainPeers[id].lastSeen || 0) > 6000) delete this.trainPeers[id];
    // nabijheid van de computer
    const c = this.vsMap.computer;
    const near = Math.abs(p.x - c.x) < 44 && Math.abs(p.y - c.y) < 44;
    if (near !== this._trainNear) { this._trainNear = near; if (window.UI && UI.trainSetNear) UI.trainSetNear(near); }
    // netwerk: broadcast ~20x/s
    if (this.trainOnline && this.time >= this._trainNetAt) { this._trainNetAt = this.time + 50; this.trainBroadcast(); }
    this.updateTrainingCamera();
    if (window.UI && UI.updateTrainingHud) UI.updateTrainingHud();
  },
  updateTrainingCamera() {
    const W = CONFIG.VIEW_W, H = CONFIG.VIEW_H, GY = CONFIG.GROUND_Y, mapW = this.vsMapW;
    const p = this.player, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const z = 1.05; this.vsCamZoom += (z - this.vsCamZoom) * 0.1;
    const zz = this.vsCamZoom, visW = W / zz, visH = H / zz;
    let tx = (mapW <= visW) ? (mapW - visW) / 2 : clamp(p.x - visW / 2, 0, mapW - visW);
    const restTy = (GY + 28) - visH, followTy = p.y - visH * 0.34;
    let ty = Math.max(Math.min(restTy, followTy), -220);
    this.vsCamX += (tx - this.vsCamX) * 0.14;
    this.vsCamY += (ty - this.vsCamY) * 0.16;
  },
  _drawTrainBullet(ctx, b) {
    if (b.kind === 'fire') {
      const d = Math.sign(b.vx) || 1, f = Math.floor(this.time / 45) % 2;
      Sprites.px(ctx, '#ff5a1e', b.x - d * 6, b.y - 1, 4, 2); Sprites.px(ctx, '#ff8a2a', b.x - d * 3 - 1, b.y - 2, 3, 4 + f);
      Sprites.px(ctx, '#ff7a2a', b.x - 2, b.y - 3, 5, 6); Sprites.px(ctx, '#ffd24a', b.x - 1, b.y - 2, 3, 4); Sprites.px(ctx, '#fff3c0', b.x, b.y - 1 - f, 1, 2);
    } else if (b.kind === 'rocket') { Sprites.px(ctx, '#cfd6df', b.x - 3, b.y - 1, 6, 3); Sprites.px(ctx, '#ffd24a', b.x - (Math.sign(b.vx) || 1) * 3, b.y - 1, 2, 3); }
    else if (b.kind === 'cannon') { Sprites.px(ctx, '#0e0e0e', b.x - 4, b.y - 4, 8, 8); Sprites.px(ctx, '#666', b.x - 2, b.y - 3, 2, 2); }
    else if (b.kind === 'coco') { Sprites.px(ctx, '#5e3f22', b.x - 4, b.y - 4, 8, 8); Sprites.px(ctx, '#8a5e36', b.x - 4, b.y - 4, 8, 3); }
    else if (b.kind === 'star') { const f = Math.floor(this.time / 35) % 2, c = '#cfd6df'; if (f) { Sprites.px(ctx, c, b.x - 4, b.y - 1, 8, 2); Sprites.px(ctx, c, b.x - 1, b.y - 4, 2, 8); } else { Sprites.px(ctx, c, b.x - 3, b.y - 3, 2, 2); Sprites.px(ctx, c, b.x + 1, b.y - 3, 2, 2); Sprites.px(ctx, c, b.x - 3, b.y + 1, 2, 2); Sprites.px(ctx, c, b.x + 1, b.y + 1, 2, 2); } }
    else if (b.kind === 'dart') { const d = Math.sign(b.vx) || 1; Sprites.px(ctx, '#2f7a3a', b.x - d * 4, b.y - 1, 8, 2); Sprites.px(ctx, '#cfd6df', b.x + d * 3, b.y - 1, 2, 2); }
    else if (b.kind === 'deagle') { const d = Math.sign(b.vx) || 1; Sprites.px(ctx, '#ffd24a', b.x - d * 3, b.y - 1, 5, 3); Sprites.px(ctx, '#fff3c0', b.x + d, b.y - 1, 2, 2); }   // dikke gouden kogel
    else if (b.kind === 'arrow') { const d = Math.sign(b.vx) || 1; Sprites.px(ctx, '#6b4a2a', b.x - d * 5, b.y, 8, 1); Sprites.px(ctx, '#cfd6df', b.x + d * 3, b.y - 1, 3, 2); Sprites.px(ctx, '#8a5e36', b.x - d * 6, b.y - 1, 2, 3); }   // pijl: schacht + punt + veren
    else Sprites.px(ctx, '#ffe27a', b.x - 1, b.y - 1, 3, 2);
  },
  drawComputer(ctx, x, y) {
    const on = Math.sin(this.time / 260) > -0.4;
    Sprites.px(ctx, '#2a3140', x - 13, y - 26, 26, 20);           // behuizing
    Sprites.px(ctx, '#0e1016', x - 11, y - 24, 22, 15);           // scherm-rand
    Sprites.px(ctx, on ? '#5ad0ff' : '#245a72', x - 10, y - 23, 20, 13);   // scherm-gloed
    Sprites.px(ctx, '#ffd24a', x - 3, y - 19, 6, 6);              // power-up-icoon op scherm
    Sprites.px(ctx, '#ff8a2a', x - 2, y - 18, 4, 4);
    Sprites.px(ctx, '#20242c', x - 4, y - 6, 8, 3);              // voet
    Sprites.px(ctx, '#3a4150', x - 10, y - 3, 20, 3);           // basis/toetsenbord
    Sprites.px(ctx, '#8a929c', x - 8, y - 3, 16, 1);
    // "POWER-UPS"-label erboven
    ctx.font = 'bold 6px "Courier New", monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#0a0e16'; ctx.fillText('POWER-UPS', x, y - 30);
    ctx.fillStyle = '#ffd24a'; ctx.fillText('POWER-UPS', x, y - 31);
    ctx.textAlign = 'left';
  },
  drawTrainPeer(ctx, pe) {
    if (pe.iv) return;                                    // onzichtbare ninja: niet tekenen
    const rc = CHARACTERS[pe.charId] || CHARACTERS.ryan;
    const airborne = pe.y < CONFIG.GROUND_Y - 5;
    if (!airborne) Sprites.shadow(ctx, pe.x, Math.min(pe.y + 1, CONFIG.GROUND_Y), pe.giant ? 11 : 7);
    ctx.save(); ctx.translate(Math.round(pe.x), Math.round(pe.y)); const g = pe.giant ? 2.2 : 1; ctx.scale(g, g);
    Sprites.drawCharacter(ctx, 0, 0, pe.dir, rc.palette, {
      walkPhase: pe.walkPhase, airborne: airborne, attacking: pe.attacking,
      weapon: pe.giant ? null : (pe.swingWeapon || pe.heldWeapon || 'bat'), build: rc.build, hair: rc.hair,
      hat: pe.hat, t: this.time, rage: pe.rage, burning: pe.burn, outfit: rc.outfit,
    });
    ctx.restore();
    if (pe.fireHold) this.drawFireHand(ctx, pe.x, pe.y, pe.dir, this.time);
    // naam + hp-balk
    const nm = (pe.nick || 'Speler').slice(0, 12);
    ctx.font = 'bold 7px "Courier New", monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#000'; ctx.fillText(nm, pe.x + 0.5, pe.y - 39.5);
    ctx.fillStyle = '#e8edf2'; ctx.fillText(nm, pe.x, pe.y - 40);
    const hpW = 22, hpf = Math.max(0, Math.min(1, (pe.hp || 0) / (pe.maxHp || 100)));
    ctx.fillStyle = '#20140f'; ctx.fillRect(pe.x - hpW / 2, pe.y - 36, hpW, 3);
    ctx.fillStyle = hpf > 0.5 ? '#5aff7a' : (hpf > 0.25 ? '#ffd24a' : '#ff5a5a'); ctx.fillRect(pe.x - hpW / 2, pe.y - 36, hpW * hpf, 3);
    ctx.textAlign = 'left';
  },
  renderTraining() {
    if (!this.player || !this.vsMap) return;
    const ctx = this.ctx, W = CONFIG.VIEW_W, H = CONFIG.VIEW_H, GY = CONFIG.GROUND_Y, map = this.vsMap;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, map.sky[0]); sky.addColorStop(1, map.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const shx = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    const shy = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - this.dtScale * 0.5);
    const z = this.vsCamZoom || 1, camX = this.vsCamX, camY = this.vsCamY, visW = W / z, visH = H / z;
    ctx.save(); ctx.translate(shx, shy); ctx.scale(z, z); ctx.translate(-camX, -camY);
    // verre sterren-achtergrond
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let i = 0; i < 40; i++) { const sxp = (i * 137) % (map.w), syp = ((i * 71) % 120) - camY * 0.3; ctx.fillRect(sxp, syp, 1, 1); }
    // dichte ondergrond over de hele map (je valt er niet af)
    ctx.fillStyle = '#3a2f22'; ctx.fillRect(-40, GY, map.w + 80, visH + Math.abs(camY) + 260);
    ctx.fillStyle = '#2c241a'; ctx.fillRect(-40, GY + 10, map.w + 80, visH + Math.abs(camY) + 260);
    ctx.fillStyle = '#4a7a34'; ctx.fillRect(-40, GY - 3, map.w + 80, 4);     // grasrand
    ctx.fillStyle = '#2f5a24'; ctx.fillRect(-40, GY + 1, map.w + 80, 1);
    // zijmuren (visuele grens: je kunt niet van de map)
    ctx.fillStyle = '#20242c'; ctx.fillRect(-40, -240, 40, GY + 500); ctx.fillRect(map.w, -240, 40, GY + 500);
    // platforms
    for (const pf of this.platforms) Sprites.drawPlatform(ctx, pf.x, pf.y, pf.w, 'stone');
    // computer in de hoek
    this.drawComputer(ctx, map.computer.x, map.computer.y);
    // vallen
    if (this.traps) for (const t of this.traps) this.drawTrap(ctx, t);
    // kogels
    for (const b of this.bullets) this._drawTrainBullet(ctx, b);
    if (this.ball) this.drawBall(ctx);                        // strandbal
    // andere spelers
    for (const id in this.trainPeers) this.drawTrainPeer(ctx, this.trainPeers[id]);
    // sfeer + partikels
    if (this.ambient && this.ambient.length) { for (const a of this.ambient) { const life = 1 - (this.time - a.born) / a.dur; ctx.globalAlpha = Math.max(0, Math.min(1, life * 1.4)) * 0.8; Sprites.px(ctx, a.c, Math.round(a.x), Math.round(a.y), a.s, a.s); } ctx.globalAlpha = 1; }
    for (const pt of this.particles) { ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife); Sprites.px(ctx, pt.color, pt.x, pt.y, pt.size, pt.size); }
    ctx.globalAlpha = 1;
    // lokale speler
    const p = this.player;
    const blink = p.respawnInvuln > 0 && Math.floor(this.time / 90) % 2 === 0;
    const pInvis = p._invisUntil && this.time < p._invisUntil;
    if (!blink) {
      if (pInvis) ctx.globalAlpha = 0.35;
      const airborne = !p.onGround;
      if (!airborne && !pInvis) Sprites.shadow(ctx, p.x, Math.min(p.y + 1, GY), 7);
      if (p.heli) { this.drawHeli(ctx, Math.round(p.x), Math.round(p.y), p.dir, p.pal); }
      else {
        const swinging = this.time < (p.swingUntil || 0) && p.swingWeapon;
        ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); const pg = p.giant ? 2.2 : 1; ctx.scale(pg, pg);
        const pSwing = this.time < p.attackAnimUntil ? Math.max(0, Math.min(1, 1 - (p.attackAnimUntil - this.time) / 150)) : 0;
        const pOpts = {
          walkPhase: p.walkPhase, airborne: airborne, ducking: p.ducking, attacking: this.time < p.attackAnimUntil, swing: pSwing,
          weapon: p.giant ? null : (swinging ? p.swingWeapon : p.weaponId), build: p.build, hair: p.hairStyle,
          hat: Storage.data.equippedHat, t: this.time, rage: p.hasBuff('rage', this.time), burning: p.burnUntil > this.time, outfit: p.outfit,
        };
        Sprites.drawCharacter(ctx, 0, 0, p.dir, p.pal, pOpts);
        ctx.restore();
        if (p.fireballs > 0 || (p._fireHandUntil && this.time < p._fireHandUntil)) this.drawFireHand(ctx, p.x, p.y, p.dir, this.time);
        if (p._trapCharges > 0) this.drawTrapPreview(ctx, p.x, p.y, p.onGround);
      }
      ctx.globalAlpha = 1;
      // groen naam-pijltje + "JIJ"
      Sprites.px(ctx, '#5aff7a', Math.round(p.x) - 1, Math.round(p.y) - 44, 2, 4);
    }
    // ability-ring-effecten + zap-boog + impact-schokgolven
    if (this.abilityFx) for (const fx of this.abilityFx) { const t = (this.time - fx.born) / fx.dur; if (t < 0 || t >= 1) continue; const cy = fx.y - 12, R = 8 + t * (fx.ring ? fx.ring - 8 : 30), a = 1 - t; ctx.strokeStyle = fx.color; ctx.lineWidth = 2.5; ctx.globalAlpha = a * 0.85; ctx.beginPath(); ctx.arc(fx.x, cy, R, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1; }
    if (this.zapFx) { const t = (this.time - this.zapFx.born) / this.zapFx.dur; if (t < 1) { ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 2; ctx.globalAlpha = 1 - t; ctx.beginPath(); ctx.moveTo(this.zapFx.x0, this.zapFx.y0); ctx.lineTo(this.zapFx.x1, this.zapFx.y1); ctx.stroke(); ctx.globalAlpha = 1; } }
    if (this.impacts) for (const im of this.impacts) { const t = (this.time - im.born) / im.dur; if (t < 0 || t >= 1) continue; const R = (im.big ? 6 : 4) + t * (im.big ? 34 : 22); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = im.big ? 2.4 : 1.6; ctx.globalAlpha = (1 - t) * 0.9; ctx.beginPath(); ctx.arc(im.x, im.y, R, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1; }
    // zwevende schade-cijfers
    if (this.floatTexts) for (const ft of this.floatTexts) { ctx.globalAlpha = Math.max(0, 1 - (this.time - ft.born) / ft.dur); ctx.font = 'bold ' + Math.round(7 * (ft.scale || 1)) + 'px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(ft.text, ft.x + 0.5, ft.y + 0.5); ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y); ctx.globalAlpha = 1; ctx.textAlign = 'left'; }
    ctx.restore();
    // schermrand-flits als JIJ geraakt wordt
    if (this.hurtFlash > 0) { ctx.globalAlpha = Math.min(0.45, this.hurtFlash / 240 * 0.45); ctx.fillStyle = '#c0392b'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  },

  // ---------- hoofdloop ----------
  loop(ts) {
    let dt = ts - this.lastTs;
    this.lastTs = ts;
    if (!dt || dt > 100) dt = 16.6667; // bij tab-wissel niet wegspringen

    if (this.state === 'playing') this.update(dt);
    if (['playing', 'paused'].includes(this.state)) this.render();
    if (this.state === 'versus') { if (!this.vsPaused) this.updateVersus(dt); this.renderVersus(); }
    if (this.state === 'training') { this.updateTraining(dt); this.renderTraining(); }
    if (this.state === 'story') {
      this._storyClock = (this._storyClock || 0) + dt;                                   // ambient (golven) loopt door
      if (!this._storyFrozen) this._storyElapsed = (this._storyElapsed || 0) + dt;       // segment-animatie; bevriest aan het eind
      this.renderStory();
    }

    Input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  },
};
