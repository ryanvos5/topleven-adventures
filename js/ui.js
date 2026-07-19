/* ============================================================
   UI — schermbeheer, shop, level-select, HUD.
   ============================================================ */

const UI = {
  el: {},

  init() {
    const $ = (id) => document.getElementById(id);
    // splash bij opstarten netjes laten wegfaden + daarna verwijderen (gegarandeerd weg)
    setTimeout(() => { const s = $('splash'); if (s) s.classList.add('fading'); }, 2000);
    setTimeout(() => { const s = $('splash'); if (s) s.classList.add('gone'); }, 2600);
    this.el = {
      hud: $('hud'), touch: $('touch-controls'), pause: $('pause-btn'),
      menu: $('menu-screen'), level: $('level-screen'), shop: $('shop-screen'),
      journey: $('journey-screen'), blacksmith: $('blacksmith-screen'),
      win: $('win-screen'), lose: $('lose-screen'),
      progressFill: $('progress-fill'), progressPlayer: $('progress-player'),
      levelName: $('level-name'), healthFill: $('health-fill'),
      coinCount: $('coin-count'), weaponName: $('weapon-name'),
      ammoCount: $('ammo-count'), ammoNum: $('ammo-num'),
      banner: $('game-banner'), bannerMain: $('banner-main'), bannerSub: $('banner-sub'),
      bossHpWrap: $('boss-hp-wrap'), bossHpFill: $('boss-hp-fill'), tutorialBox: $('tutorial-box'),
      menuCoins: $('menu-coin-count'), shopCoins: $('shop-coin-count'), menuRubies: $('menu-ruby-count'),
      levelGrid: $('level-grid'), shopGrid: $('shop-grid'),
      arena: $('arena-screen'), versus: $('versus-screen'),
      inventory: $('inventory-screen'),
      leaderboard: $('leaderboard-screen'), chat: $('chat-screen'),
      arenaRound: $('arena-round'), arenaCoins: $('arena-coins'), arenaBest: $('arena-best'),
      arenaLeft: $('arena-left'), arenaRecord: $('arena-record'),
      winKills: $('win-kills'), winCoins: $('win-coins'), winReplayNote: $('win-replay-note'),
      loseKills: $('lose-kills'), loseCoins: $('lose-coins'), loseTitle: $('lose-title'),
    };

    if (window.MenuBg) { MenuBg.init(); MenuBg.start(); }   // dynamische vulkaan-achtergrond
    this.renderChests();                                    // kist-balk op het menu

    // menu knoppen (singleplayer-werelden zijn uit — focus op multiplayer)
    $('btn-shop').onclick = () => this.openShop();
    $('btn-win-shop').onclick = () => this.openShop();
    document.querySelectorAll('.shop-tab').forEach((b) => { b.onclick = () => { this._shopTab = b.dataset.tab; this.renderShop(); }; });
    $('btn-journey').onclick = () => this.openJourney();
    // ---- Journey CO-OP (alleen met vrienden) ----
    $('btn-coop').onclick = () => {
      const pn = document.getElementById('coop-panel'); pn.classList.toggle('hidden');
      if (!pn.classList.contains('hidden')) { this.ensurePresence(); this.renderCoopFriends(); }
    };
    $('btn-inventory').onclick = () => this.openInventory();
    // ---- Training lobby ----
    { const tb = $('btn-training'); if (tb) tb.onclick = () => this.openTraining(); }
    { const q = $('btn-train-quit'); if (q) this._tap(q, () => Game.quitTraining(), { immediate: true }); }
    { const cb = $('train-computer-btn'); if (cb) this._tap(cb, () => this.openTrainComputer(), { immediate: true }); }
    { const cc = $('train-computer-close'); if (cc) this._tap(cc, () => this.closeTrainComputer(), { immediate: true }); }
    { const rp = $('train-clear-pu'); if (rp) rp.onclick = () => { Game.trainClearPowerups(); this.closeTrainComputer(); }; }
    $('btn-inventory-back').onclick = () => this.show('menu');
    document.querySelectorAll('#inv-tabs .shop-tab').forEach((b) => { b.onclick = () => { this._invTab = b.dataset.invtab; this.renderInventory(); }; });
    { const bb = $('btn-blacksmith'); if (bb) bb.onclick = () => this.openBlacksmith(); }
    document.querySelectorAll('#bs-tabs .shop-tab').forEach((b) => { if (b.dataset.bstab) b.onclick = () => { this._bsTab = b.dataset.bstab; this.renderBlacksmith(); }; });
    document.querySelectorAll('.chest-slot').forEach((b) => { b.onclick = () => this.chestClick(+b.dataset.chest); });
    document.querySelectorAll('.loadout-slot').forEach((b) => {
      // in-match: op pointerdown activeren, zodat een power-up ook werkt terwijl je beweegt
      this._tap(b, () => { const id = b.dataset.pu; if (id) { Game.usePowerupSlot(id); } }, { immediate: true });
    });
    // vlam-knop: op pointerdown vuren (niet 'click') — zo werkt de ability óók terwijl je een
    // beweeg-knop vasthoudt (op touch krijgt een 2e vinger geen 'click', alleen pointer-events).
    this._tap($('ability-btn'), () => Game.abilityButton(), { immediate: true });
    window.addEventListener('keydown', (e) => { if ((e.key === 'e' || e.key === 'E') && Game.state === 'versus') Game.abilityButton(); });   // desktop-toets
    $('btn-journey-skip').onclick = () => Game.skipStory();
    $('btn-journey-next').onclick = () => Game.storyNext();
    const aa = $('btn-arena-again'); if (aa) aa.onclick = () => this.show('menu');   // oude arena-knop (mode is weg)
    $('btn-next').onclick = () => Game.nextLevel();
    $('btn-retry').onclick = () => Game.retryLevel();

    // terug-knoppen
    document.querySelectorAll('[data-back]').forEach((b) => {
      b.onclick = () => {
        const t = b.dataset.back;
        if (t === 'level') { this.renderLevels(); this.show('level'); }
        else this.show('menu');
      };
    });
    // TERUG in het versus-scherm: eerst matchmaking + verbinding netjes stoppen
    $('btn-vs-back').onclick = () => { this._stopMatchmaking(); this.leaveLobby(); if (window.Net) Net.leaveVersus(); this.show('menu'); };

    // pauze
    this.el.pause.onclick = () => Game.togglePause();
    $('btn-resume').onclick = () => Game.togglePause();
    $('btn-restart').onclick = () => Game.retryLevel();
    $('btn-quit').onclick = () => Game.quitToMenu();
    // ---- Journey dood-scherm ----
    $('btn-jdeath-checkpoint').onclick = () => this.journeyCheckpointRestart();
    $('btn-jdeath-menu').onclick = () => { document.getElementById('jdeath-screen').classList.add('hidden'); Game.quitToMenu(); };


    // ---- instellingen (overlay met account / update / nieuw spel) ----
    $('btn-settings').onclick = () => document.getElementById('settings-screen').classList.remove('hidden');
    { const sbk = $('btn-settings-back'); if (sbk) sbk.onclick = () => document.getElementById('settings-screen').classList.add('hidden'); }
    // muziek + geluidseffecten los aan/uit
    const mb = $('btn-music'), fb = $('btn-sfx');
    this._updSoundBtn = () => {
      if (mb) mb.textContent = t(window.Sfx && Sfx.musicOn ? 'music_on' : 'music_off');
      if (fb) fb.textContent = t(window.Sfx && Sfx.sfxOn ? 'sfx_on' : 'sfx_off');
    };
    this._updSoundBtn();
    if (mb) mb.onclick = () => { if (window.Sfx) Sfx.setMusic(!Sfx.musicOn); this._updSoundBtn(); };
    if (fb) fb.onclick = () => { if (window.Sfx) Sfx.setSfx(!Sfx.sfxOn); this._updSoundBtn(); };
    // taal (Engels/Nederlands)
    if (window.I18N) {
      I18N.applyContent();   // config-content naar de gekozen taal (standaard Engels)
      I18N.apply();
      const markLang = () => document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === I18N.lang));
      markLang();
      document.querySelectorAll('.lang-btn').forEach((b) => { b.onclick = () => { I18N.set(b.dataset.lang); markLang(); }; });
    }
    { const db = $('btn-delete-account'); if (db) db.onclick = () => this.deleteAccount(); }
    // klikgeluid op menu-knoppen
    document.addEventListener('pointerdown', (e) => {
      if (typeof Game !== 'undefined') Game._lastInputTime = Date.now();   // elke aanraking telt als 'niet AFK'
      if (window.Sfx && e.target && e.target.closest && e.target.closest('.stone-btn,.stone-tile,.stone-icon,.big-btn,.shop-tab,.world-tab,.back-btn,.corner-back')) Sfx.play('click');
    });
    document.addEventListener('keydown', () => { if (typeof Game !== 'undefined') Game._lastInputTime = Date.now(); });
    // uit de app / tabblad weg: na >15s op de achtergrond word je uit een online match gezet (jij verliest)
    const inLiveVersus = () => typeof Game !== 'undefined' && Game.vs && !Game.vsBot && !Game.vs.over && Game.state === 'versus';
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (!inLiveVersus()) return;
        this._hiddenAt = Date.now();
        this._afkBgTimer = setTimeout(() => { if (document.hidden && inLiveVersus()) { Game._afkKicked = true; Game.forfeitVersus(); } }, AFK_KICK_MS + 200);
      } else {
        if (this._afkBgTimer) { clearTimeout(this._afkBgTimer); this._afkBgTimer = null; }
        const away = this._hiddenAt ? (Date.now() - this._hiddenAt) : 0; this._hiddenAt = 0;
        if (inLiveVersus()) {
          if (away > AFK_KICK_MS) { Game._afkKicked = true; Game.forfeitVersus(); }   // te lang weg -> jij verliest
          else Game._lastInputTime = Date.now();                                      // korte afwezigheid -> geen straf
        }
      }
    });

    // ---- account (inloggen / registreren) ----
    this.authMode = 'login';
    $('btn-account').onclick = () => this.openAuth('login');
    $('btn-logout').onclick = () => { if (window.Net) Net.logout(); };
    $('btn-nick').onclick = () => this.promptNickname();
    $('btn-auth-close').onclick = () => this.closeAuth();
    $('btn-auth-toggle').onclick = () => this.openAuth(this.authMode === 'login' ? 'register' : 'login');
    $('btn-auth-submit').onclick = () => this.submitAuth();
    $('btn-auth-apple').onclick = () => this.oauthLogin('apple');
    // ---- privacybeleid (Apple-eis) ----
    { const bp = $('btn-privacy'); if (bp) bp.onclick = () => this.openPrivacy(); }
    { const bap = $('btn-auth-privacy'); if (bap) bap.onclick = () => this.openPrivacy(); }
    { const bpb = $('btn-privacy-back'); if (bpb) bpb.onclick = () => this.closePrivacy(); }
    // ---- onboarding-coach (eerste keer) ----
    $('btn-coach-next').onclick = () => this.coachNext();
    $('btn-coach-skip').onclick = () => this.coachSkip();
    this.refreshAuthUI();

    // ---- vrienden (Friends) ----
    $('btn-chat').onclick = () => this.openFriends();
    $('btn-chat-back').onclick = () => { this.closeFriends(); this.show('menu'); };
    document.querySelectorAll('#friends-tabs .shop-tab').forEach((b) => { b.onclick = () => this.setFriendsTab(b.dataset.ftab); });
    $('friend-add-btn').onclick = () => this.friendAdd();
    $('friend-add-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.friendAdd(); });
    $('btn-convo-back').onclick = () => this.closeConvo();
    $('convo-send').onclick = () => this.sendConvo();
    $('convo-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.sendConvo(); });
    $('btn-convo-challenge').onclick = () => { if (this._convo) this.inviteFromChat(this._convo.id, this._convo.nick); };
    $('btn-invite-accept').onclick = () => this.acceptChatInvite();
    $('btn-invite-ignore').onclick = () => { document.getElementById('invite-screen').classList.add('hidden'); this._chatInvite = null; };

    // ---- leaderboard ----
    $('btn-leaderboard').onclick = () => this.openLeaderboard();
    document.querySelectorAll('#lb-tabs [data-lb]').forEach((t) => {
      t.onclick = () => {
        document.querySelectorAll('#lb-tabs [data-lb]').forEach((b) => b.classList.toggle('active', b === t));
        this.renderLeaderboard(t.dataset.lb);
      };
    });

    // versie-tag op het menu (om te zien welke build echt geladen is — helpt tegen cache-verwarring)
    { const bt = document.getElementById('build-tag'); if (bt) bt.textContent = 'version: ' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.0'); }
    // ---- 1 vs 1 online ----
    $('btn-versus').onclick = () => this.startMatchmaking();
    $('btn-rank').onclick = () => this.openRankScreen();
    $('btn-rank-back').onclick = () => document.getElementById('rank-screen').classList.add('hidden');
    $('btn-mm-cancel').onclick = () => this.cancelMatchmaking();
    $('btn-vs-host').onclick = () => this.versusHost();
    $('btn-vs-join').onclick = () => this.versusJoin();
    $('btn-vs-bot').onclick = () => this.openBotSetup();
    const diffSlider = document.getElementById('vs-diff-slider');
    if (diffSlider) diffSlider.oninput = () => this.setBotDiff(parseInt(diffSlider.value, 10));
    const roundsSlider = document.getElementById('vs-rounds-slider');
    if (roundsSlider) roundsSlider.oninput = () => this.setVoteRounds(parseInt(roundsSlider.value, 10));
    $('btn-vs-quit').onclick = () => {
      // tijdens de eerste-keer-tutorial: niet zomaar naar het menu, maar de onboarding netjes afronden
      // (coach sluiten + het inlog-/registratiescherm tonen), zodat het inlogscherm niet overgeslagen wordt
      if (Game.tutorial1v1 || this._onboarding) { this.finishTutorial(); return; }
      // training-lobby verlaten
      if (Game.state === 'training') { Game.quitTraining(); return; }
      // online tijdens een live match: bevestigen + verlaten = jij verliest, tegenstander wint
      if (Game.state === 'versus' && !Game.vsBot && window.Net && Net.versus) {
        if (confirm('Weet je zeker dat je de match wilt verlaten?')) Game.forfeitVersus();
      } else {
        Game.quitVersus();
      }
    };
    $('btn-vs-again').onclick = () => { document.getElementById('versus-result').classList.add('hidden'); this.openVersusLobby(); };
    $('btn-vs-menu').onclick = () => { document.getElementById('versus-result').classList.add('hidden'); this.leaveLobby(); this.show('menu'); };
    $('btn-vs-rematch').onclick = () => this.doRematch();
    $('btn-vs-back').onclick = () => { this.leaveLobby(); this.show('menu'); };
    $('btn-vs-ready').onclick = () => this.toggleReady();
    document.querySelectorAll('.vs-mode-btn').forEach((b) => {
      b.onclick = () => this.setVoteMode(b.dataset.mode);
    });

    // spel updaten (verse versie laden zonder het icoon te verwijderen)
    $('btn-update').onclick = () => this.forceUpdate();


    if (Input.isTouch()) document.body.classList.add('is-touch');
  },

  toggleFullscreen() {
    const el = document.documentElement;
    const isFs = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFs) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        const p = req.call(el);
        // probeer landscape af te dwingen (werkt op Android/Chrome; iPhone negeert dit stil)
        const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); } catch (e) {} };
        if (p && p.then) p.then(lock).catch(() => {}); else lock();
      } else {
        // iPhone Safari heeft geen fullscreen-API: tip de speler over 'Zet op beginscherm'
        alert('Tip voor iPhone: draai je telefoon horizontaal, of voeg de pagina toe aan je beginscherm (deel-knop -> "Zet op beginscherm") voor volledig scherm.');
      }
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
      try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) {}
    }
  },

  // toon één scherm; regel HUD/touch/pauze zichtbaarheid
  // Zombie Knock-out starten — dag-limiet via ACCOUNT (cache wissen helpt niet)
  async startArena() {
    // ingelogd: server bepaalt of je nog mag (atomair verbruiken)
    if (window.Net && Net.ready && Net.isLoggedIn()) {
      let left;
      try { left = await Net.arenaUsePlay(); }
      catch (e) { alert(tl('Kon de daglimiet niet controleren: ') + (e.message || e)); return; }
      if (left === -1) {
        alert('Je hebt vandaag al ' + ARENA_PLAYS_PER_DAY + ' keer Zombie Knock-out gespeeld.\nDe limiet reset elke ochtend om 06:00.');
        return;
      }
      this._arenaLeft = left;
      Game.startArena();
      return;
    }
    // niet ingelogd: verplicht inloggen zodat de daglimiet eerlijk telt (niet te omzeilen)
    if (window.Net && Net.ready) {
      alert('Log in met een account om Zombie Knock-out te spelen.\nZo geldt de daglimiet (3× per dag, reset 06:00) eerlijk voor iedereen.');
      this.openAuth('login');
      return;
    }
    // server onbereikbaar: lokale fallback zodat het offline speelbaar blijft
    const left = Storage.arenaPlaysLeft();
    if (left <= 0) { alert('Je hebt vandaag al ' + ARENA_PLAYS_PER_DAY + ' keer gespeeld. Kom morgen terug!'); return; }
    Storage.useArenaPlay();
    this._arenaLeft = left - 1;
    Game.startArena();
  },

  // Journey-tegel bijwerken (voortgang)
  updateArenaButton() {
    const c = document.getElementById('journey-prog');
    if (!c) return;
    const total = (JOURNEY[1].levels || []).length;
    const done = Math.min(total, Storage.data.journey1 || 0);
    if (done >= total) c.innerHTML = t('world') + ' 1 ' + this._ic('check'); else c.textContent = t('lvl') + ' ' + (done + 1) + '/' + total;
  },

  // ---------- JOURNEY (singleplayer) ----------
  openJourney() { this.renderJourney(); this.show('journey'); },

  // ---------- JOURNEY CO-OP (samen levels spelen via een kamercode) ----------
  _coopCbs() {
    const st = () => document.getElementById('coop-status');
    return {
      onMatch: (role) => {
        this._coopRole = role; this._coopConnected = true;
        if (st()) st().textContent = role === 'host' ? tl('✓ Verbonden! Kies een level om samen te spelen.') : tl('✓ Verbonden! Je maat kiest een level…');
      },
      onJStart: (p) => { if (p && p.n) this.beginCoopStage(p.n); },
      onJP: (p) => Game.onCoopP(p),
      onJZ: (p) => Game.onCoopZ(p),
      onJHit: (p) => Game.onCoopHit(p),
      onJCrate: (p) => Game.onCoopCrate(p),
      onJWin: () => Game.onCoopWin(),
      onJRS: () => Game.onCoopRespawnEnemies(),
      onJLose: () => Game.onCoopLose(),
    };
  },
  // online vrienden tonen met een "Uitnodigen"-knop
  async renderCoopFriends() {
    const box = document.getElementById('coop-friends'); if (!box) return;
    if (!window.Net || !Net.isLoggedIn()) { box.innerHTML = tl('<p class="screen-sub">Log in (menu ▸ account) en voeg vrienden toe om samen te spelen.</p>'); return; }
    box.innerHTML = tl('<p class="screen-sub">Laden…</p>');
    let ov; try { ov = await Net.friendsOverview(); } catch (e) { box.innerHTML = '<p class="screen-sub">⚠ ' + (e.message || e) + '</p>'; return; }
    const friends = ov.filter((r) => r.kind === 'friend');
    box.innerHTML = '';
    if (!friends.length) { box.innerHTML = tl('<p class="screen-sub">Nog geen vrienden. Voeg ze toe via de Friends-knop.</p>'); return; }
    friends.sort((a, b) => (Net.isOnline(b.other_id) ? 1 : 0) - (Net.isOnline(a.other_id) ? 1 : 0));
    friends.forEach((r) => {
      const online = Net.isOnline(r.other_id);
      const row = document.createElement('div'); row.className = 'friend-row';
      row.innerHTML = '<span class="fr-dot ' + (online ? 'on' : '') + '"></span><span class="fr-name">' + this._esc(r.nickname) + '</span>';
      const b = document.createElement('button'); b.className = 'fr-btn challenge'; b.textContent = online ? tl('Uitnodigen') : 'Offline';
      b.disabled = !online; b.onclick = () => this.coopInvite(r.other_id, r.nickname);
      const act = document.createElement('span'); act.className = 'fr-actions'; act.appendChild(b); row.appendChild(act);
      box.appendChild(row);
    });
  },
  // een vriend uitnodigen voor co-op: maak een kamer + stuur een co-op-uitnodiging
  async coopInvite(toId, toNick) {
    const st = document.getElementById('coop-status');
    if (!window.Net || !Net.ready) { if (st) st.textContent = tl('Geen verbinding met de server.'); return; }
    try {
      this._coopRole = 'host';
      const code = await Net.versusHost(this._coopCbs());
      Net.lobbyInvite(toId, code, true);                   // coop = true
      if (st) st.textContent = tl('Uitnodiging naar ') + toNick + tl(' gestuurd… wachten tot die meedoet.');
    } catch (e) { this._coopRole = null; if (st) st.textContent = '' + (e.message || e); }
  },
  beginCoopStage(n) {
    document.getElementById('versus-result').classList.add('hidden');
    const vh = document.getElementById('versus-hud'); if (vh) vh.classList.add('hidden');
    document.getElementById('loadout-bar').classList.add('hidden');
    document.getElementById('ability-btn').classList.add('hidden');
    Game.startJourneyStage(n, this._coopRole || 'guest');
  },
  coopReset() {
    this._coopRole = null; this._coopConnected = false;
    const st = document.getElementById('coop-status'); if (st) st.textContent = '';
    const pn = document.getElementById('coop-panel'); if (pn) pn.classList.add('hidden');
  },
  _journeyWorldLocked(w) {
    if (w <= 1) return false;
    // ontgrendeld als de vorige wereld is uitgespeeld (of je er al voortgang in had)
    return !Storage.journeyCleared(JOURNEY[w - 1].levels.length, w - 1) && !((Storage.data['journey' + w] || 0) > 0);
  },
  renderJourney() {
    let world = this._journeyWorld = this._journeyWorld || 1;
    if (this._journeyWorldLocked(world)) world = this._journeyWorld = 1;   // op-slot -> terug naar wereld 1
    // wereld-tabs (Eiland / Tempel)
    const tabs = document.getElementById('journey-worlds');
    if (tabs) {
      tabs.innerHTML = '';
      JOURNEY_ORDER.forEach((w) => {
        const locked = this._journeyWorldLocked(w);
        const b = document.createElement('button');
        b.className = 'shop-tab' + (w === world ? ' active' : '') + (locked ? ' locked' : '');
        b.innerHTML = (locked ? this._ic('lock') + ' ' : '') + JOURNEY[w].name;
        b.onclick = locked
          ? () => { const s = document.getElementById('journey-world'); if (s) s.textContent = t('unlock_gk_pre') + JOURNEY[w].name + (I18N.lang==='nl' ? ' vrij te spelen!' : '!'); }
          : () => { this._journeyWorld = w; this.renderJourney(); };
        tabs.appendChild(b);
      });
    }
    const sub = document.getElementById('journey-world');
    if (sub) sub.textContent = t('world') + ' ' + world + ' — ' + JOURNEY[world].name;
    const cb = document.getElementById('coop-bar'); if (cb) cb.classList.add('hidden');   // journey = singleplayer smash-duels
    const grid = document.getElementById('journey-grid');
    if (!grid) return;
    // ===== wereldkaart: levels als knopen langs een slingerpad, in het thema van de wereld =====
    grid.className = 'journey-map ' + (world === 2 ? 'temple' : 'island');
    grid.innerHTML = '';
    const levels = JOURNEY[world].levels;
    const cols = 5, x0 = 12, dx = 19, y0 = 20, dyr = 30, jit = [0, 5, -3, 6, -2];
    const pos = levels.map((lv, i) => {
      const row = Math.floor(i / cols), inRow = i % cols;
      const col = (row % 2 === 0) ? inRow : (cols - 1 - inRow);     // slingerend heen en weer
      return { x: x0 + col * dx, y: y0 + row * dyr + jit[col] };
    });
    let doneCount = 0; for (let i = 0; i < levels.length; i++) if (Storage.journeyCleared(i + 1, world)) doneCount = i + 1;
    // themadecoratie (piramides / struiken achterin)
    const decor = document.createElement('div'); decor.className = 'map-decor'; grid.appendChild(decor);
    // het pad (SVG)
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'journey-path'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
    const mkLine = (to, cls) => {
      const pl = document.createElementNS(svgNS, 'polyline');
      pl.setAttribute('points', pos.slice(0, to).map((p) => p.x + ',' + p.y).join(' '));
      pl.setAttribute('class', cls); pl.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(pl);
    };
    mkLine(levels.length, 'path-base');                                          // hele route (gestippeld)
    if (doneCount >= 1) mkLine(Math.min(levels.length, doneCount + 1), 'path-done');   // voltooid deel + naar de volgende
    grid.appendChild(svg);
    // de level-knopen
    levels.forEach((lv, i) => {
      const n = i + 1;
      const cleared = Storage.journeyCleared(n, world);
      const open = Storage.journeyUnlocked(n, world);
      const isBoss = lv.bossFight || lv.boss;
      const current = open && !cleared;
      const node = document.createElement('button');
      node.className = 'map-node' + (cleared ? ' cleared' : '') + (open ? '' : ' locked') + (isBoss ? ' boss' : '') + (current ? ' current' : '');
      node.style.left = pos[i].x + '%'; node.style.top = pos[i].y + '%';
      node.innerHTML = '<span class="map-node-num">' + (isBoss ? this._ic('crown') : n) + '</span>' +
        (cleared ? '<span class="map-node-mark">' + this._ic('star') + '</span>' : (open ? '' : '<span class="map-node-mark lock">' + this._ic('lock') + '</span>'));
      if (open) node.onclick = () => this.pickJourneyLevel(n);
      grid.appendChild(node);
    });
  },
  pickJourneyLevel(n) {
    const world = this._journeyWorld || 1;
    // Wereld 1: intro (vóór lvl 1) + boss-verhalen (vóór de bazen 5/10/15) — spelen ELKE keer (skipbaar).
    if (world === 1) {
      const script = this._journeyStoryFor(n);
      if (script) { this.playStory(script, n); return; }
    } else if (world === 2) {
      const script = this._journeyStory2For(n);
      if (script) { this.playStory(script, n); return; }
    }
    this.startJourneyLevel(n);
  },
  // welk verhaaltje hoort bij dit level? (intro vóór lvl 1, confrontatie bij elke nieuwe aap)
  // speelt nu elke keer dat je het level start — ook bij herhalen (te skippen met "Overslaan")
  _journeyStoryFor(n) {
    if (n === 1) return 'intro';
    if (n === 5) return 'bonzo';     // Bonzo (baas 1)
    if (n === 10) return 'koba';     // Koba (baas 2)
    if (n === 15) return 'kong';     // Gorilla King (eindbaas)
    return null;
  },
  // Wereld 2-verhalen: opening = slot-cutscene van wereld 1, plus de tempel-bazen.
  _journeyStory2For(n) {
    if (n === 1) return 'kongwin';   // overgang jungle -> tempel (slot van wereld 1)
    if (n === 5) return 'guardian';  // Temple Bewaker (baas 1)
    if (n === 10) return 'monnik';   // De Oude Monnik (baas 2)
    if (n === 15) return 'ninja';    // De Ninja (eindbaas wereld 2)
    return null;
  },
  // verhaal-cutscene op het canvas afspelen, daarna het level starten
  playStory(script, n) {
    ['menu', 'level', 'shop', 'journey', 'arena', 'win', 'lose', 'versus', 'leaderboard', 'chat', 'inventory'].forEach((s) => this.el[s].classList.add('hidden'));
    document.body.classList.add('in-game');
    this.el.hud.classList.add('hidden'); this.el.touch.classList.add('hidden'); this.el.pause.classList.add('hidden');
    Game.playJourneyIntro(script, () => this.startJourneyLevel(n));
  },
  // outro-cutscene (na een baas), daarna een willekeurige vervolgactie (bv. uitslagscherm)
  playEndStory(script, onDone) {
    ['menu', 'level', 'shop', 'journey', 'arena', 'win', 'lose', 'versus', 'leaderboard', 'chat', 'inventory'].forEach((s) => this.el[s].classList.add('hidden'));
    document.getElementById('versus-result').classList.add('hidden');
    const vw = document.getElementById('vs-win'); if (vw) vw.classList.add('hidden');   // win-celebratie weg
    document.body.classList.add('in-game');
    this.el.hud.classList.add('hidden'); this.el.touch.classList.add('hidden'); this.el.pause.classList.add('hidden');
    Game.playJourneyIntro(script, onDone || function () {});
  },
  startJourneyLevel(n) {
    document.getElementById('versus-result').classList.add('hidden');
    this.startJourneyBossFight(n);       // elk journey-level = een 1v1-smash-duel
  },
  // boss-fase (na de level-stage van 5/10/15): het bestaande 1v1-smash-duel
  // eerst het boss-verhaaltje afspelen (na de finish van het platform-level), dán het duel
  playBossStory(n) {
    const script = this._journeyStoryFor(n);
    if (!script) { this.startJourneyBossFight(n); return; }
    ['menu', 'level', 'shop', 'journey', 'arena', 'win', 'lose', 'versus', 'leaderboard', 'chat', 'inventory'].forEach((s) => this.el[s].classList.add('hidden'));
    document.getElementById('versus-result').classList.add('hidden');
    document.body.classList.add('in-game');
    this.el.hud.classList.add('hidden'); this.el.touch.classList.add('hidden'); this.el.pause.classList.add('hidden');
    Game.playJourneyIntro(script, () => this.startJourneyBossFight(n));
  },
  startJourneyBossFight(n) {
    document.getElementById('versus-result').classList.add('hidden');
    this.showVersus();                  // juiste HUD/touch-setup, alle schermen weg
    Game.startJourney(n, this._journeyWorld || 1);
    this.el.pause.classList.remove('hidden');                       // Journey heeft een pauzeknop (singleplayer)
    document.getElementById('btn-vs-quit').classList.add('hidden'); // pauzeknop vervangt de kruis-knop
  },
  // Journey-dood: kies checkpoint of menu
  showJourneyDeath(flagReached, coopOver) {
    const sub = document.getElementById('jdeath-sub');
    const btn = document.getElementById('btn-jdeath-checkpoint');
    if (coopOver) {
      // co-op: allebei tegelijk verslagen -> level mislukt, alleen terug naar menu
      if (sub) sub.textContent = t('both_defeated');
      if (btn) btn.classList.add('hidden');
    } else {
      if (btn) btn.classList.remove('hidden');
      if (sub) sub.textContent = flagReached ? tl('Je bent verslagen — je kunt vanaf de vlag verder.') : tl('Je bent verslagen.');
      if (btn) btn.innerHTML = this._ic('flag') + (flagReached ? ' Start vanaf checkpoint' : tl(' Opnieuw (vanaf begin)'));
    }
    document.getElementById('jdeath-screen').classList.remove('hidden');
  },
  journeyCheckpointRestart() {
    document.getElementById('jdeath-screen').classList.add('hidden');
    if (typeof Game.journeyRespawn === 'function') Game.journeyRespawn();
    Game.state = 'playing';
    if (window.Input) Input.clear();
  },
  showJourneyResult(won, idx, unlocks, rewards, myScore, oppScore, world) {
    world = world || this._journeyWorld || 1; this._journeyWorld = world;
    const levels = JOURNEY[world].levels, total = levels.length, hasNext = won && idx < total;
    const vw = document.getElementById('vs-win'); if (vw) vw.classList.add('hidden');   // win-celebratie weg
    const rb = document.getElementById('vs-round-banner'); if (rb) rb.classList.add('hidden');
    this.el.touch.classList.add('hidden'); document.body.classList.remove('in-game');
    this.el.pause.classList.add('hidden');
    document.getElementById('loadout-bar').classList.add('hidden');
    document.getElementById('ability-btn').classList.add('hidden');
    document.getElementById('versus-hud').classList.add('hidden');
    const t = document.getElementById('vs-result-title');
    if (won && idx >= total) t.innerHTML = (JOURNEY[world].name.toUpperCase()) + tl(' VERSLAGEN! ') + this._ic('trophy'); else t.textContent = won ? tl('LEVEL GEHAALD!') : tl('VERLOREN');
    t.className = 'screen-title ' + (noContest ? '' : (won ? 'win' : 'lose'));
    document.getElementById('vs-result-score').textContent = (myScore || 0) + ' – ' + (oppScore || 0);
    const xpEl = document.getElementById('vs-result-xp');
    xpEl.classList.remove('hidden');
    const lvlName = (levels[idx - 1] ? levels[idx - 1].name : ('Level ' + idx));
    xpEl.innerHTML = lvlName + '<br>' + (won ? 'Level ' + idx + tl(' gehaald!') : tl('Probeer het opnieuw.'));
    const voteBox = document.getElementById('vs-result-vote'); if (voteBox) voteBox.classList.add('hidden');
    const rs = document.getElementById('vs-rematch-status'); if (rs) rs.textContent = '';
    const rbtn = document.getElementById('btn-vs-rematch');
    rbtn.classList.remove('hidden'); rbtn.disabled = false;
    rbtn.innerHTML = won ? (hasNext ? this._ic('arrow-r') + ' VOLGENDE LEVEL' : this._ic('check') + ' KLAAR') : this._ic('refresh') + tl(' OPNIEUW');
    rbtn.onclick = () => {
      document.getElementById('versus-result').classList.add('hidden');
      if (won && hasNext) this.pickJourneyLevel(idx + 1);   // via story-check: verhaal speelt ook hier
      else if (!won) this.pickJourneyLevel(idx);
      else { Game.journey = null; this.openJourney(); }
    };
    const again = document.getElementById('btn-vs-again');
    again.classList.remove('hidden');            // versus verbergt 'm; in Journey is dit "WORLD MAP"
    again.textContent = I18N.t('world_map');
    again.onclick = () => { document.getElementById('versus-result').classList.add('hidden'); Game.journey = null; if (window.Net) Net.leaveVersus(); this.openJourney(); };
    document.getElementById('btn-vs-menu').onclick = () => { document.getElementById('versus-result').classList.add('hidden'); Game.journey = null; this.show('menu'); };
    document.getElementById('versus-result').classList.remove('hidden');
    document.getElementById('versus-screen').classList.add('hidden');
    const rw = (rewards || []).slice(); rw.push(...this._levelUpRewards());
    if (rw.length) this.showRewards(rw);   // beloning-popups (incl. level-up) bovenop de uitslag
  },

  // level-up-beloningen (300 munten/level; bij elk 10e level een auto-openende legendary kist)
  _levelUpRewards() {
    const lu = Storage.claimLevelUps();
    if (!lu) return [];
    const out = [{ type: 'levelup', level: lu.level, coins: lu.coins }];
    for (let L = lu.level - lu.levels + 1; L <= lu.level; L++) {
      const rarity = (L % 10 === 0) ? 'legendary' : (L % 5 === 0 ? 'epic' : null);   // 10e = legendary, 5e = epic
      if (!rarity) continue;
      const rw = Storage.rollChestRewards(rarity);                 // meteen toepassen (auto-open)
      Storage.data.coins = (Storage.data.coins || 0) + rw.gold;
      Storage.data.xp = (Storage.data.xp || 0) + rw.xp;
      Storage.data.powerups = Storage.data.powerups || {};
      for (const id in rw.pus) Storage.data.powerups[id] = (Storage.data.powerups[id] || 0) + rw.pus[id];
      if (rw.mats) { const m = Storage.materials(); for (const k in rw.mats) m[k] = (m[k] || 0) + rw.mats[k]; }
      if (rw.rubies) Storage.data.rubies = (Storage.data.rubies || 0) + rw.rubies;
      Storage.save();
      out.push({ type: 'chestopen', rarity, level: L });           // openings-animatie
      out.push({ type: 'earn', coins: rw.gold, xp: rw.xp, rubies: rw.rubies || 0 });
      for (const id in rw.pus) out.push({ type: 'pu', id, n: rw.pus[id] });
      for (const k in (rw.mats || {})) out.push({ type: 'mat', id: k, n: rw.mats[k] });
    }
    return out;
  },

  // ===== Beloning-popups met wachtrij: munten/xp + unlock-kaartjes (OK = volgende) =====
  showRewards(list, onDone) {
    this._rewardQueue = (list || []).filter(Boolean);
    this._rewardDone = onDone || null;
    this._rewardTotal = this._rewardQueue.length;
    this._rewardShown = 0;
    if (!this._rewardQueue.length) { if (onDone) onDone(); return; }
    const ok = document.getElementById('btn-reward-ok');
    if (ok) ok.onclick = () => { if (window.Sfx) Sfx.play('click'); this._nextReward(); };
    this._nextReward();
  },
  _nextReward() {
    const pop = document.getElementById('reward-pop'); if (!pop) return;
    const r = this._rewardQueue.shift();
    if (!r) { pop.classList.add('hidden'); const cb = this._rewardDone; this._rewardDone = null; if (cb) cb(); return; }
    this._rewardShown++;
    const cnt = document.getElementById('reward-count');
    if (cnt) cnt.textContent = (r.type !== 'legendaryopen' && this._rewardTotal > 1) ? (this._rewardShown + ' / ' + this._rewardTotal) : '';
    pop.classList.remove('hidden');
    const card = pop.querySelector('.reward-card');         // pop-animatie opnieuw afspelen
    if (card) { card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; }
    const ok = document.getElementById('btn-reward-ok');
    if (r.type === 'chestopen') {                            // mijlpaal-kist opent automatisch met animatie
      if (ok) ok.style.visibility = 'hidden';
      this._playChestOpen(r.rarity || 'legendary', r.level);
      return;
    }
    if (ok) ok.style.visibility = '';
    this._drawReward(r);
    if (window.Sfx) Sfx.play(r.type === 'earn' ? 'coin' : 'win');
  },
  // mijlpaal-kist die vanzelf openbarst (level-mijlpaal), daarna door naar de beloningen
  _playChestOpen(rarity, level) {
    const cv = document.getElementById('reward-canvas'), ctx = cv.getContext('2d');
    const title = document.getElementById('reward-title'), nameEl = document.getElementById('reward-name');
    const rn = (CHEST_TYPES[rarity] || {}).name || 'Kist';
    const emoji = this._ic('chest') + ' ';
    title.innerHTML = emoji + this._esc(rn.toUpperCase() + ' KIST!');
    nameEl.textContent = level ? ('Level ' + level + ' — bonuskist!') : 'Openen…';
    const t0 = (window.performance && performance.now) ? performance.now() : 0, DUR = 1900;
    if (window.Sfx) { try { Sfx.play('win'); } catch (e) {} }
    let done = false;
    const finish = () => {                                   // altijd doorschakelen (ook als rAF stilstaat)
      if (done) return; done = true;
      if (this._legRaf) cancelAnimationFrame(this._legRaf); this._legRaf = 0;
      const ok = document.getElementById('btn-reward-ok'); if (ok) ok.style.visibility = '';
      this._nextReward();
    };
    const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    const SHAKE_END = 0.4, OPEN_END = 0.72;   // rammelen -> deksel klapt open -> nagloeien
    const step = () => {
      if (done) return;
      const now = (window.performance && performance.now) ? performance.now() : t0 + DUR;
      const t = Math.min(1, (now - t0) / DUR);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const cx = cv.width / 2, cy = cv.height / 2 + 6;
      const band = (CHEST_TYPES[rarity] || {}).band || '#ffd24a';
      // deksel-opening (met kleine overshoot-pop)
      const openRaw = t <= SHAKE_END ? 0 : Math.min(1, (t - SHAKE_END) / (OPEN_END - SHAKE_END));
      const lidOpen = openRaw <= 0 ? 0 : Math.max(0, easeOutBack(openRaw));
      // achtergrondgloed groeit mee met het openen
      const glowT = Math.max(0, Math.min(1, (t - SHAKE_END * 0.6) / 0.45));
      const gr = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy - 4, 72);
      gr.addColorStop(0, 'rgba(255,244,180,' + (0.25 + glowT * 0.65).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, cv.width, cv.height);
      // eind-fade naar de volgende beloning
      const fade = t > 0.84 ? Math.max(0, 1 - (t - 0.84) / 0.16 * 0.85) : 1;
      ctx.save(); ctx.translate(cx, cy);
      if (t < SHAKE_END) { const s = t / SHAKE_END; ctx.translate(Math.sin(t * 58) * 2.2 * s, 0); ctx.rotate(Math.sin(t * 52) * 0.055 * s); }   // rammelen, bouwt op
      ctx.globalAlpha = fade; ctx.scale(3.1, 3.1);
      this._chestArt(ctx, rarity, Math.min(1, lidOpen));
      ctx.restore();
      // uitspattende sparkles/munten zodra het deksel losklapt
      if (openRaw > 0) {
        const pj = Math.min(1, (t - SHAKE_END) / 0.5);
        ctx.save(); ctx.translate(cx, cy - 6);
        for (let k = 0; k < 16; k++) {
          const a = -Math.PI / 2 + ((k / 15) - 0.5) * 2.3;   // kegel naar boven
          const rr = pj * (18 + (k % 5) * 9);
          ctx.globalAlpha = Math.max(0, 1 - pj) * fade;
          ctx.fillStyle = k % 3 ? '#fff0a0' : band;
          ctx.fillRect(Math.round(Math.cos(a) * rr - 1), Math.round(Math.sin(a) * rr - pj * 6 - 1), 3, 3);
        }
        ctx.restore();
      }
      if (t < 1 && !done) this._legRaf = requestAnimationFrame(step);
    };
    if (this._legRaf) cancelAnimationFrame(this._legRaf);
    if (this._legTimer) clearTimeout(this._legTimer);
    this._legTimer = setTimeout(finish, DUR + 150);          // garandeert de doorschakeling
    step();
  },
  _drawReward(r) {
    const title = document.getElementById('reward-title');
    const nameEl = document.getElementById('reward-name');
    const cv = document.getElementById('reward-canvas'), ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cv.width, cv.height);
    if (r.type === 'char') {
      title.textContent = t('unlocked');
      const c = CHARACTERS[r.id] || CHARACTERS.ryan;
      ctx.save(); ctx.translate(cv.width / 2, 8); ctx.scale(2.5, 2.5);
      Sprites.drawCharacter(ctx, 0, 42, 1, c.palette, { weapon: c.startMelee || c.forcedMelee || 'bat', build: c.build, hair: c.hair, hat: 'none', outfit: c.outfit });
      ctx.restore();
      nameEl.textContent = t('new_char') + (r.name || c.name);
    } else if (r.type === 'hat') {
      title.textContent = t('unlocked');
      const cc = CHARACTERS[Storage.data.equippedCharacter] || CHARACTERS.ryan;
      ctx.save(); ctx.translate(cv.width / 2, 8); ctx.scale(2.5, 2.5);
      Sprites.drawCharacter(ctx, 0, 42, 1, cc.palette, { weapon: cc.forcedMelee || 'bat', build: cc.build, hair: cc.hair, hat: r.id, outfit: cc.outfit });
      ctx.restore();
      nameEl.textContent = t('new_hat') + (r.name || (HATS[r.id] && HATS[r.id].name) || '');
    } else if (r.type === 'pu') {   // power-up uit een kist
      title.innerHTML = this._ic('bolt') + ' ' + t('reward_powerup');
      const pu = SHOP_POWERUPS[r.id] || {};
      ctx.save(); ctx.translate(cv.width / 2, cv.height / 2 - 6); ctx.scale(2.6, 2.6);
      if (Game && Game.drawDrop) Game.drawDrop(ctx, { kind: pu.kind, x: 0, y: 0, id: 0 });
      ctx.restore();
      nameEl.textContent = (pu.name || r.id) + (r.n > 1 ? '  x' + r.n : '');
    } else if (r.type === 'mat') {   // smeed-materiaal uit een kist
      title.innerHTML = this._ic('hammer') + ' ' + t('reward_material');
      const mt = (typeof MATERIALS !== 'undefined' && MATERIALS[r.id]) || { name: r.id, col: '#b0a080' };
      ctx.save(); ctx.translate(cv.width / 2, cv.height / 2 - 4); this._matArt(ctx, r.id, 3.2); ctx.restore();
      nameEl.textContent = (mt.name || r.id) + (r.n > 1 ? '  x' + r.n : '');
    } else if (r.type === 'chest') {   // nieuwe kist uit een match
      title.innerHTML = this._ic('chest') + ' ' + t('new_chest');
      ctx.save(); ctx.translate(cv.width / 2, cv.height / 2 - 6); ctx.scale(2.8, 2.8);
      this._chestArt(ctx, r.rarity); ctx.restore();
      nameEl.textContent = (CHEST_TYPES[r.rarity] || {}).name + t('chest_open_suffix');
    } else if (r.type === 'levelup') {   // level omhoog
      title.innerHTML = this._ic('star') + ' ' + t('level_up');
      ctx.fillStyle = '#ffd23a'; this._star(ctx, cv.width / 2, cv.height / 2 - 6, 30, 5);
      ctx.fillStyle = '#7a5600'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(r.level, cv.width / 2, cv.height / 2 - 4);
      nameEl.textContent = t('level_word') + ' ' + r.level + '  ·  +' + r.coins + ' ' + t('coins_word');
    } else { // 'earn' — munten + xp (+ robijnen)
      title.innerHTML = this._ic('trophy') + ' ' + t('reward');
      this._drawCoinXp(ctx, cv, r.coins || 0, r.xp || 0, r.rubies || 0);
      const parts = [];
      if (r.xp) parts.push('+' + r.xp + ' ' + t('xp_word'));
      if (r.coins) parts.push('+' + r.coins + ' ' + t('coins_word'));
      if (r.rubies) parts.push('+' + r.rubies + ' ' + t('rubies_word'));
      nameEl.textContent = parts.join('   ·   ');
    }
  },
  _drawCoinXp(ctx, cv, coins, xp, rubies) {
    const cx = cv.width / 2, cy = 54;
    const items = []; if (coins) items.push('coin'); if (xp) items.push('xp'); if (rubies) items.push('ruby');
    const n = items.length || 1, spread = 78;
    const xAt = (i) => (n <= 1) ? cx : (cx - spread / 2 + spread * (i / (n - 1)));
    items.forEach((it, i) => {
      const X = xAt(i);
      if (it === 'coin') {                                  // gouden munt
        ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(X, cy, 26, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(X, cy, 22, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = '#a9760a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, cy, 13, 0, 6.2832); ctx.stroke();
        ctx.fillStyle = '#a9760a'; ctx.fillRect(X - 2, cy - 8, 4, 16);
        ctx.fillStyle = '#ffe98a'; ctx.beginPath(); ctx.arc(X - 6, cy - 6, 6, 0, 6.2832); ctx.fill();
      } else if (it === 'xp') {                             // blauwe ster
        ctx.fillStyle = '#1e7fc0'; this._star(ctx, X, cy, 26, 5);
        ctx.fillStyle = '#46c0ff'; this._star(ctx, X, cy, 21, 5);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('XP', X, cy + 1);
      } else {                                              // robijn (rode edelsteen)
        const gem = (fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(X, cy + 22); ctx.lineTo(X - 20, cy - 3); ctx.lineTo(X - 10, cy - 17); ctx.lineTo(X + 10, cy - 17); ctx.lineTo(X + 20, cy - 3); ctx.closePath(); ctx.fill(); };
        gem('#e0364f');
        ctx.fillStyle = '#ff6f88'; ctx.beginPath(); ctx.moveTo(X - 10, cy - 17); ctx.lineTo(X - 20, cy - 3); ctx.lineTo(X - 3, cy - 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd0da'; ctx.beginPath(); ctx.moveTo(X - 6, cy - 17); ctx.lineTo(X + 2, cy - 17); ctx.lineTo(X - 2, cy - 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#a81e33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, cy + 22); ctx.lineTo(X - 20, cy - 3); ctx.lineTo(X - 10, cy - 17); ctx.lineTo(X + 10, cy - 17); ctx.lineTo(X + 20, cy - 3); ctx.closePath(); ctx.stroke();
      }
    });
  },
  _star(ctx, cx, cy, r, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const rad = (i % 2 === 0) ? r : r * 0.46, a = (Math.PI / pts) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  },

  showArenaOver(stats) {
    this.el.arenaRound.textContent = stats.round;
    this.el.arenaCoins.textContent = stats.coins;
    this.el.arenaBest.textContent = stats.best;
    const left = (typeof this._arenaLeft === 'number') ? this._arenaLeft : Storage.arenaPlaysLeft();
    this.el.arenaLeft.textContent = left;
    this.el.arenaRecord.classList.toggle('hidden', !stats.record);
    // knop uitschakelen als er geen pogingen meer zijn
    const again = document.getElementById('btn-arena-again');
    if (left <= 0) { again.classList.add('cant'); again.disabled = true; }
    else { again.classList.remove('cant'); again.disabled = false; }
    this.show('arena');
  },

  // ---- SPEL UPDATEN (verse versie laden) ----
  async forceUpdate() {
    const btn = document.getElementById('btn-update');
    if (btn) { btn.disabled = true; btn.textContent = tl('Updaten…'); }
    // eventuele caches legen (helpt bij hardnekkige browsers / PWA)
    try {
      if (window.caches && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {}
    // verse herladen met een unieke querystring -> browser haalt alles opnieuw op
    const base = location.origin + location.pathname;
    let stamp = '' + (window.Date && Date.now ? Date.now() : Math.floor(performance.now()));
    location.replace(base + '?u=' + stamp);
  },

  // ---- ACCOUNT-UI ----
  syncCoins() {
    if (this.el.menuCoins) this.el.menuCoins.textContent = Storage.data.coins;
    if (this.el.shopCoins) this.el.shopCoins.textContent = Storage.data.coins;
    if (this.el.menuRubies) this.el.menuRubies.textContent = Storage.rubies();
  },

  refreshAuthUI() {
    const status = document.getElementById('account-status');
    const btnAcc = document.getElementById('btn-account');
    const btnOut = document.getElementById('btn-logout');
    const inLogged = window.Net && Net.isLoggedIn && Net.isLoggedIn();
    // header-regel "Nickname | Lvl"
    const line = document.getElementById('menu-userline');
    if (line) line.textContent = (inLogged ? Net.nickname() : t('guest')) + ' | ' + t('lvl') + ' ' + playerLevel(Storage.data.xp || 0);
    if (!status || !btnAcc || !btnOut) return;
    const xpWrap = document.getElementById('xp-bar-wrap');
    const btnNick = document.getElementById('btn-nick');
    const btnDel = document.getElementById('btn-delete-account');
    if (inLogged) {
      this._authOnboarding = false;
      const authScreen = document.getElementById('auth-screen');
      if (authScreen && !authScreen.classList.contains('hidden')) setTimeout(() => authScreen.classList.add('hidden'), 500);
      status.innerHTML = this._ic('char') + ' ' + this._esc(Net.nickname()) + ' · ' + t('lvl') + ' ' + playerLevel(Storage.data.xp || 0);
      status.classList.remove('hidden');
      btnOut.classList.remove('hidden');
      btnAcc.classList.add('hidden');
      if (btnNick) btnNick.classList.remove('hidden');
      if (btnDel) btnDel.classList.remove('hidden');
      if (xpWrap) { xpWrap.classList.remove('hidden'); this.renderXpBar(); }
    } else {
      status.classList.add('hidden');
      btnOut.classList.add('hidden');
      btnAcc.classList.remove('hidden');
      if (btnNick) btnNick.classList.add('hidden');
      if (btnDel) btnDel.classList.add('hidden');
      if (xpWrap) xpWrap.classList.add('hidden');
    }
    this.updateArenaButton();
  },
  // taal gewisseld -> dynamische teksten opnieuw invullen + zichtbaar scherm hertekenen
  onLangChange() {
    if (this._updSoundBtn) this._updSoundBtn();
    document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === I18N.lang));
    this.refreshAuthUI();
    const vis = (id) => { const e = document.getElementById(id); return e && !e.classList.contains('hidden'); };
    if (vis('shop-screen') && this.renderShop) this.renderShop();
    if (vis('inventory-screen') && this.renderInventory) this.renderInventory();
    if (vis('blacksmith-screen') && this.renderBlacksmith) this.renderBlacksmith();
    if (vis('journey-screen') && this.renderJourney) this.renderJourney();
  },
  async deleteAccount() {
    if (!(window.Net && Net.isLoggedIn && Net.isLoggedIn())) return;
    const msg = I18N.lang === 'nl'
      ? 'Weet je zeker dat je je account definitief wilt verwijderen? Je online voortgang en leaderboard-plek gaan verloren.'
      : 'Are you sure you want to permanently delete your account? Your online progress and leaderboard spot will be lost.';
    if (!window.confirm(msg)) return;
    try {
      await Net.deleteAccount();
      this.refreshAuthUI();
      window.alert(I18N.lang === 'nl'
        ? 'Je account en gegevens zijn verwijderd.'
        : 'Your account and data have been deleted.');
    } catch (e) {
      this.refreshAuthUI();
      window.alert((I18N.lang === 'nl' ? 'Verwijderen mislukt: ' : 'Deletion failed: ') + String(e && e.message || e));
    }
  },

  // heeft de ingelogde speler een echte nickname? (anders valt nickname() terug op de e-mail)
  _hasNickname() {
    return !!(window.Net && Net.user && Net.user.user_metadata && Net.user.user_metadata.nickname);
  },

  async promptNickname() {
    const cur = this._hasNickname() ? Net.nickname() : '';
    const nick = window.prompt(tl('Kies je speler-naam (zo sta je op de leaderboard):'), cur);
    if (nick == null) return;                       // geannuleerd
    if (!nick.trim()) { alert(tl('Naam mag niet leeg zijn.')); return; }
    try { await Net.setNickname(nick); this.syncCoins(); }
    catch (e) { alert(tl('Kon de naam niet opslaan: ') + (e.message || e)); }
  },

  // na (her)inloggen: vraag een naam als die nog ontbreekt
  afterNetLogin() {
    this.refreshAuthUI();
    if (window.Net && Net.isLoggedIn() && !this._hasNickname()) {
      setTimeout(() => this.promptNickname(), 400);
    }
  },

  // na uitloggen (of account verwijderen): lokale voortgang is gereset -> UI naar de schone staat
  afterLogout() {
    const s = document.getElementById('settings-screen'); if (s) s.classList.add('hidden');
    this.refreshAuthUI();
    this.syncCoins();
    this.show('menu');
  },

  // XP-balk: voortgang binnen het huidige level
  renderXpBar() {
    const fill = document.getElementById('xp-bar-fill');
    const label = document.getElementById('xp-bar-label');
    if (!fill || !label) return;
    const xp = Storage.data.xp || 0;
    const L = playerLevel(xp);
    const start = xpForLevel(L), next = xpForLevel(L + 1);
    const into = xp - start, need = next - start;
    const pct = Math.max(0, Math.min(100, Math.round((into / need) * 100)));
    fill.style.width = pct + '%';
    label.textContent = 'Lvl ' + L + ' · ' + into + '/' + need + ' XP';
  },

  openAuth(mode, opts) {
    opts = opts || {};
    if (opts.onboarding) this._authOnboarding = true;   // na de tutorial: welkomst-context + andere sluit-knop
    this.authMode = mode;
    const isReg = mode === 'register';
    const onb = !!this._authOnboarding;
    document.getElementById('auth-title').textContent = onb ? tl('WELKOM, HELD!') : (isReg ? tl('REGISTREREN') : tl('INLOGGEN'));
    const sub = document.getElementById('auth-sub');
    if (sub) sub.textContent = onb ? tl('Maak een account zodat je voortgang op elk toestel bewaard blijft.') : tl('Optioneel — bewaar je voortgang op elk toestel.');
    document.getElementById('btn-auth-submit').textContent = isReg ? tl('ACCOUNT AANMAKEN') : tl('INLOGGEN');
    document.getElementById('btn-auth-toggle').textContent = isReg ? tl('Al een account? Inloggen') : tl('Nog geen account? Registreren');
    document.getElementById('btn-auth-close').textContent = onb ? tl('Later — speel als gast') : tl('Cancel');
    document.getElementById('auth-nick').classList.toggle('hidden', !isReg);
    document.getElementById('auth-pass').setAttribute('autocomplete', isReg ? 'new-password' : 'current-password');
    document.getElementById('auth-msg').textContent = '';
    document.getElementById('auth-screen').classList.remove('hidden');
  },

  closeAuth() {
    document.getElementById('auth-screen').classList.add('hidden');
    this._authOnboarding = false;
    this.maybeShowBeta();
  },

  // privacybeleid tonen (in-app, laadt de gebundelde privacy.html in een iframe; springt naar de juiste taal)
  openPrivacy() {
    const scr = document.getElementById('privacy-screen'); if (!scr) return;
    const fr = document.getElementById('privacy-frame');
    if (fr) { const anchor = (I18N.lang === 'nl') ? '#nl' : '#en'; if (!fr.src || fr.src === 'about:blank' || fr.getAttribute('src') === 'about:blank') fr.src = 'privacy.html' + anchor; else try { fr.contentWindow.location.hash = anchor; } catch (e) {} }
    scr.classList.remove('hidden');
  },
  closePrivacy() { const scr = document.getElementById('privacy-screen'); if (scr) scr.classList.add('hidden'); },

  // Apple-login (Supabase OAuth). Web/PWA: redirect-flow; onAuthStateChange vangt de sessie na terugkeer.
  async oauthLogin(provider) {
    const msg = document.getElementById('auth-msg');
    const aBtn = document.getElementById('btn-auth-apple');
    if (!window.Net || !Net.ready) { if (msg) { msg.style.color = '#ff6a6a'; msg.textContent = tl('Geen verbinding met de server.'); } return; }
    if (msg) { msg.style.color = ''; msg.textContent = tl('Bezig…'); }
    if (aBtn) aBtn.disabled = true;
    try {
      await Net.signInWithApple();
      // bij de redirect-flow navigeert de pagina weg; komt-ie terug zonder redirect, dan doet onAuthStateChange de rest
    } catch (e) {
      if (msg) { msg.style.color = '#ff6a6a'; msg.textContent = (e && e.message) ? e.message : tl('Inloggen mislukt — probeer e-mail.'); }
    } finally {
      if (aBtn) aBtn.disabled = false;
    }
  },

  // ================= ONBOARDING: coach Ryan (eerste keer opstarten) =================
  // Stappen: tekst + optioneel een touch-knop om uit te lichten ("druk hier").
  _coachSteps() {
    return [
      { text: 'Hoi, ik ben Ryan! Welkom bij Rymr Heroes. Ik leer je in 20 seconden hoe je vecht.' },
      { text: 'LOPEN — gebruik de pijltjes ◀ ▶ links onderin om te bewegen.', hl: '.touch-left' },
      { text: 'SPRINGEN — tik ▲ om te springen. Tik nóg eens in de lucht voor een dubbele sprong!', hl: '.touch-right [data-key="jump"]' },
      { text: 'BLOKKEREN — houd ▼ ingedrukt om klappen te blokkeren en minder schade te krijgen.', hl: '.touch-right [data-key="duck"]' },
      { text: 'SLAAN — tik op de wapen-knop om te meppen. Probeer de oefen-pop nu te raken!', hl: '.tbtn-melee' },
      { text: 'SPECIAAL — de vlammende knop is je krachtaanval. Die laadt op terwijl je vecht.', hl: '#ability-btn' },
      { text: 'DOEL — sla je tegenstander van het platform óf versla ’m. Wie de meeste rondes wint, wint de match!' },
      { text: 'Je bent er klaar voor, held! Druk op Klaar om te beginnen. 💪' },
    ];
  },

  startOnboarding() {
    if (this._onboarding) return;
    this._onboarding = true;
    this._tutStep = 0;
    try { Game.startTutorial(); } catch (e) { console.warn('startTutorial', e); this._onboarding = false; this.afterOnboarding(); return; }
    { const qb = document.getElementById('btn-vs-quit'); if (qb) qb.classList.add('hidden'); }   // geen losse ✕: alleen de coach (Overslaan/Klaar) sluit de tutorial
    this._drawCoachPortrait();
    this._showCoachStep();
  },

  _drawCoachPortrait() {
    const cv = document.getElementById('coach-portrait'); if (!cv) return;
    const c = CHARACTERS.ryan;
    try { this._drawCharPreview(cv, c.palette, { build: c.build, hair: c.hair, hat: 'none', outfit: c.outfit }, 0); } catch (e) {}
  },

  _clearCoachHighlight() {
    document.querySelectorAll('.tut-highlight').forEach((el) => el.classList.remove('tut-highlight'));
  },

  _showCoachStep() {
    const steps = this._coachSteps();
    const i = Math.max(0, Math.min(steps.length - 1, this._tutStep || 0));
    const step = steps[i];
    const panel = document.getElementById('tutorial-coach'); if (!panel) return;
    panel.classList.remove('hidden');
    const txt = document.getElementById('coach-text'); if (txt) txt.textContent = tl(step.text);
    // voortgangs-stipjes
    const dots = document.getElementById('coach-dots');
    if (dots) { dots.innerHTML = ''; for (let k = 0; k < steps.length; k++) { const d = document.createElement('span'); d.className = 'coach-dot' + (k === i ? ' on' : ''); dots.appendChild(d); } }
    // knop-labels
    const next = document.getElementById('btn-coach-next'); if (next) next.textContent = (i >= steps.length - 1) ? tl('Klaar!') : tl('Volgende');
    const skip = document.getElementById('btn-coach-skip'); if (skip) { skip.textContent = tl('Overslaan'); skip.classList.toggle('hidden', i >= steps.length - 1); }
    // touch-knop uitlichten (alleen op touch-toestellen zichtbaar)
    this._clearCoachHighlight();
    if (step.hl) { const el = document.querySelector(step.hl); if (el && !el.classList.contains('hidden')) el.classList.add('tut-highlight'); }
    if (window.Sfx) { try { Sfx.play('click'); } catch (e) {} }
  },

  coachNext() {
    const steps = this._coachSteps();
    if ((this._tutStep || 0) >= steps.length - 1) { this.finishTutorial(); return; }
    this._tutStep = (this._tutStep || 0) + 1;
    this._showCoachStep();
  },

  coachSkip() { this.finishTutorial(); },

  finishTutorial() {
    this._clearCoachHighlight();
    const panel = document.getElementById('tutorial-coach'); if (panel) panel.classList.add('hidden');
    this._onboarding = false;
    try { Game.tutorial1v1 = false; Game.quitVersus(); } catch (e) {}
    try { localStorage.setItem('zombiedash_onboarded', '1'); } catch (e) {}
    this.afterOnboarding();
  },

  // na de tutorial: inlog-/registratie-scherm (e-mail, Apple of Google)
  afterOnboarding() {
    if (window.Net && Net.isLoggedIn && Net.isLoggedIn()) return;   // al ingelogd (bv. bewaarde sessie) -> niet vragen
    setTimeout(() => { try { this.openAuth('register', { onboarding: true }); } catch (e) {} }, 450);
  },

  async submitAuth() {
    const msg = document.getElementById('auth-msg');
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const nick = document.getElementById('auth-nick').value;
    const submitBtn = document.getElementById('btn-auth-submit');
    if (!email || !pass) { msg.textContent = tl('Vul e-mail en wachtwoord in.'); return; }
    if (this.authMode === 'register' && !nick) { msg.textContent = tl('Kies een nickname.'); return; }
    if (pass.length < 6) { msg.textContent = tl('Wachtwoord moet minstens 6 tekens zijn.'); return; }
    msg.style.color = ''; msg.textContent = tl('Bezig…'); submitBtn.disabled = true;
    try {
      if (this.authMode === 'register') {
        const res = await Net.register(email, nick, pass);
        if (res.confirmed) {
          msg.style.color = '#7ad06a'; msg.textContent = tl('Account aangemaakt!');
          setTimeout(() => { document.getElementById('auth-screen').classList.add('hidden'); this.syncCoins(); this.maybeShowBeta(); }, 800);
        } else {
          msg.style.color = '#7ad06a';
          msg.textContent = tl('Bevestig je e-mail via de link die we stuurden, en log daarna in.');
        }
      } else {
        await Net.login(email, pass);
        msg.style.color = '#7ad06a'; msg.textContent = tl('Ingelogd!');
        setTimeout(() => { document.getElementById('auth-screen').classList.add('hidden'); this.syncCoins(); this.maybeShowBeta(); }, 700);
      }
    } catch (e) {
      msg.style.color = '#ff6a6a';
      msg.textContent = '' + (e && e.message ? e.message : 'Er ging iets mis.');
    } finally {
      submitBtn.disabled = false;
    }
  },

  // ---- LOBBY CHAT + PRESENCE ----
  // presence draait al op de menuschermen, zodat je op het hoofdmenu live ziet
  // hoeveel mensen er online zijn (groen puntje op de chat-knop).
  ensurePresence(tries) {
    tries = tries || 0;
    if (!window.Net) return;
    // wacht tot de server klaar is én de sessie/nickname geladen is (anders zou je als "Gast" verschijnen)
    if ((!Net.ready || !Net.authReady) && tries < 20) { setTimeout(() => this.ensurePresence(tries + 1), 400); return; }
    if (!Net.ready) return;
    if (Net.lobby || this._presenceJoining) { this.refreshChatBadge(); this.startDMInbox(); this.refreshFriendMeta(); return; }
    this._presenceJoining = true;
    Net.lobbyJoin({
      onPeers: (list) => { this._peers = list; this.refreshChatBadge(); if (this._friendsOpen) this.renderFriendsOnline(); },
      onInvite: (p) => this.onChatInvite(p),
    }).then(() => { this._presenceJoining = false; this.refreshChatBadge(); this.startDMInbox(); this.refreshFriendMeta(); })
      .catch(() => { this._presenceJoining = false; });
  },

  leavePresence() { if (window.Net) { Net.lobbyLeave(); Net.unsubscribeDMs(); } this._peers = []; this.refreshChatBadge(); },

  // vrije-tekst DM-chat aan/uit (v1: uit i.v.m. App Store 1.2 — zie CHAT_ENABLED in config.js)
  _chatOn() { return (typeof CHAT_ENABLED === 'undefined') || CHAT_ENABLED; },

  // externe link openen (App Store, mailto) — via de Capacitor Browser-plugin op iOS, anders het systeem
  _openExternal(url) {
    if (!url) return;
    try {
      const P = window.Capacitor && window.Capacitor.Plugins;
      if (P && P.Browser && P.Browser.open && url.slice(0, 4) === 'http') { P.Browser.open({ url }); return; }
    } catch (e) {}
    try { window.open(url, '_system'); } catch (e) { window.location.href = url; }
  },

  // BETA-welkomstpopup: elke keer bij opstarten (na het inlogscherm), weg te klikken
  maybeShowBeta() {
    if (this._betaShown) return;
    try { if (!localStorage.getItem('zombiedash_onboarded')) return; } catch (e) {}   // pas ná de eerste-keer tutorial/login
    const auth = document.getElementById('auth-screen');
    if (auth && !auth.classList.contains('hidden')) return;                            // niet over het inlogscherm heen
    if (document.body.classList.contains('in-game')) return;                           // niet tijdens een match
    this._betaShown = true;
    this.showBetaPopup();
  },

  showBetaPopup() {
    let sc = document.getElementById('beta-popup');
    if (!sc) {
      sc = document.createElement('div'); sc.id = 'beta-popup'; sc.className = 'overlay hidden';
      sc.innerHTML = '<div class="overlay-box beta-box">' +
        '<button class="corner-back" id="btn-beta-close" aria-label="Close"><svg class="ic"><use href="#ic-x"/></svg></button>' +
        '<h2 class="screen-title beta-title">' + tl('Welkom bij Rymr Heroes BETA') + '</h2>' +
        '<p class="beta-text">' + tl('We zijn net gestart! De komende maanden richten we ons op méér online spelers — en jij kunt ons daar enorm mee helpen:') + '</p>' +
        '<div class="beta-btns">' +
          '<button class="stone-btn beta-review" id="btn-beta-review">⭐ ' + tl('Schrijf een review') + '</button>' +
          '<button class="stone-btn beta-ideas" id="btn-beta-ideas">💡 ' + tl('Deel je idee') + '</button>' +
        '</div>' +
        '<p class="beta-foot">' + tl('Bedankt dat je erbij bent!') + ' 🎮</p>' +
      '</div>';
      document.body.appendChild(sc);
      document.getElementById('btn-beta-close').onclick = () => sc.classList.add('hidden');
      sc.onclick = (e) => { if (e.target === sc) sc.classList.add('hidden'); };
      this._tap(document.getElementById('btn-beta-review'), () => {
        this._openExternal(typeof BETA_REVIEW_URL !== 'undefined' ? BETA_REVIEW_URL : '');
        sc.classList.add('hidden');
      });
      this._tap(document.getElementById('btn-beta-ideas'), () => {
        this._openExternal(typeof BETA_IDEAS_URL !== 'undefined' ? BETA_IDEAS_URL : '');
        sc.classList.add('hidden');
      });
    }
    sc.classList.remove('hidden');
  },

  // DM-inbox (realtime): binnenkomende berichten -> live in het gesprek of anders een badge
  startDMInbox() {
    if (!this._chatOn()) return;                                      // chat uit (v1)
    if (!window.Net || !Net.isLoggedIn() || Net._dmChannel) return;   // niet dubbel abonneren
    Net.subscribeDMs((m) => {
      if (this._convo && this._convo.id === m.sender) { this.addConvoLine(m.body, false); }
      else { this._unreadDM = true; this.refreshChatBadge(); }
    });
  },
  // aantal openstaande vriendschapsverzoeken ophalen (voor de badge)
  async refreshFriendMeta() {
    if (!window.Net || !Net.isLoggedIn()) { this._reqCount = 0; this.refreshChatBadge(); return; }
    try {
      const ov = await Net.friendsOverview();
      this._reqCount = ov.filter((r) => r.kind === 'incoming').length;
    } catch (e) { this._reqCount = 0; }
    this.refreshChatBadge();
  },

  // badge op de Friends-knop: aantal openstaande verzoeken, anders een puntje bij een nieuw bericht
  refreshChatBadge() {
    const btn = document.getElementById('btn-chat');
    if (!btn) return;
    let dot = document.getElementById('chat-badge');
    if (!dot) { dot = document.createElement('span'); dot.id = 'chat-badge'; dot.className = 'chat-badge'; btn.appendChild(dot); }
    const req = this._reqCount || 0;
    if (req > 0) { dot.textContent = req; dot.classList.add('on'); }
    else if (this._unreadDM) { dot.textContent = '•'; dot.classList.add('on'); }
    else { dot.textContent = ''; dot.classList.remove('on'); }
  },

  openFriends() {
    this._friendsOpen = true;
    this._unreadDM = false;
    this.show('chat');
    this.closeConvo(true);                        // begin altijd in de lijst-weergave
    this.ensurePresence();                        // online-status + uitdagingen ontvangen
    const loggedIn = window.Net && Net.isLoggedIn();
    document.getElementById('friends-tabs').classList.toggle('hidden', !loggedIn);
    document.getElementById('ftab-list').classList.toggle('hidden', !loggedIn);
    document.getElementById('ftab-add').classList.add('hidden');
    document.getElementById('friends-login-msg').classList.toggle('hidden', !!loggedIn);
    if (!loggedIn) return;
    this.setFriendsTab('list');
    this.renderFriends();
    this.refreshChatBadge();
  },

  closeFriends() { this._friendsOpen = false; this.closeConvo(true); },

  setFriendsTab(tab) {
    this._friendsTab = tab;
    document.querySelectorAll('#friends-tabs .shop-tab').forEach((b) => b.classList.toggle('active', b.dataset.ftab === tab));
    document.getElementById('ftab-list').classList.toggle('hidden', tab !== 'list');
    document.getElementById('ftab-add').classList.toggle('hidden', tab !== 'add');
    if (tab === 'add') { const i = document.getElementById('friend-add-input'); if (i) setTimeout(() => i.focus(), 60); }
  },

  async renderFriends() {
    if (!window.Net || !Net.isLoggedIn()) return;
    const emptyEl = document.getElementById('friends-empty');
    emptyEl.textContent = tl('Laden…');
    let ov;
    try { ov = await Net.friendsOverview(); }
    catch (e) { emptyEl.textContent = '' + (e.message || e); return; }
    this._friends = ov;
    this._reqCount = ov.filter((r) => r.kind === 'incoming').length;
    this.refreshChatBadge();
    this._paintFriends();
  },

  // vrienden tekenen vanuit de cache (geen netwerk) — ook gebruikt bij presence-updates
  _paintFriends() {
    const ov = this._friends || [];
    const listEl = document.getElementById('friends-list');
    const reqEl = document.getElementById('friends-requests');
    const outEl = document.getElementById('friends-outgoing');
    const emptyEl = document.getElementById('friends-empty');
    if (!listEl) return;
    listEl.innerHTML = ''; reqEl.innerHTML = ''; outEl.innerHTML = '';
    const friends = ov.filter((r) => r.kind === 'friend');
    const incoming = ov.filter((r) => r.kind === 'incoming');
    const outgoing = ov.filter((r) => r.kind === 'outgoing');
    if (incoming.length) {
      const h = document.createElement('div'); h.className = 'friends-subhead'; h.textContent = tl('Verzoeken');
      reqEl.appendChild(h); incoming.forEach((r) => reqEl.appendChild(this._friendRow(r, 'incoming')));
    }
    const on = (id) => (window.Net && Net.isOnline(id)) ? 1 : 0;
    friends.sort((a, b) => on(b.other_id) - on(a.other_id));      // online-vrienden bovenaan
    friends.forEach((r) => listEl.appendChild(this._friendRow(r, 'friend')));
    emptyEl.textContent = (friends.length || incoming.length) ? '' : tl('Nog geen vrienden. Voeg er een toe via "Toevoegen".');
    if (outgoing.length) {
      const h = document.createElement('div'); h.className = 'friends-subhead'; h.textContent = tl('Verzonden verzoeken');
      outEl.appendChild(h); outgoing.forEach((r) => outEl.appendChild(this._friendRow(r, 'outgoing')));
    }
  },

  renderFriendsOnline() { if (this._friendsOpen && !this._convo) this._paintFriends(); },

  _friendRow(r, kind) {
    const row = document.createElement('div'); row.className = 'friend-row';
    const online = kind === 'friend' && window.Net && Net.isOnline(r.other_id);
    const lvl = (typeof playerLevel === 'function') ? playerLevel(r.xp || 0) : 1;
    row.innerHTML = '<span class="fr-dot ' + (online ? 'on' : '') + '"></span>' +
      '<span class="fr-name">' + this._esc(r.nickname) + '</span>' +
      '<span class="fr-lvl">Lvl ' + lvl + '</span>';
    const actions = document.createElement('span'); actions.className = 'fr-actions';
    const mk = (cls, ico, title, fn, disabled) => {
      const b = document.createElement('button'); b.className = 'fr-btn ' + cls; b.innerHTML = this._ic(ico);
      b.title = title; if (disabled) b.disabled = true; b.onclick = fn; return b;
    };
    if (kind === 'friend') {
      actions.appendChild(mk('challenge', 'swords', online ? 'Uitdagen' : 'Offline', () => this.inviteFromChat(r.other_id, r.nickname), !online));
      if (this._chatOn()) actions.appendChild(mk('', 'chat', 'Chatten', () => this.openConvo(r.other_id, r.nickname)));
      actions.appendChild(mk('danger', 'x', 'Vriend verwijderen', () => this.removeFriend(r.other_id, r.nickname)));
    } else if (kind === 'incoming') {
      actions.appendChild(mk('accept', 'check', 'Accepteren', () => this.acceptReq(r.other_id)));
      actions.appendChild(mk('danger', 'x', 'Weigeren', () => this.removeFriend(r.other_id, r.nickname, true)));
    } else {
      const w = document.createElement('span'); w.className = 'fr-pending'; w.textContent = 'wacht…'; actions.appendChild(w);
      actions.appendChild(mk('danger', 'x', 'Intrekken', () => this.removeFriend(r.other_id, r.nickname, true)));
    }
    row.appendChild(actions);
    return row;
  },

  async friendAdd() {
    const inp = document.getElementById('friend-add-input');
    const msg = document.getElementById('friend-add-msg');
    const name = (inp.value || '').trim();
    if (!name) return;
    if (!window.Net || !Net.isLoggedIn()) { msg.textContent = 'Log eerst in.'; return; }
    msg.textContent = 'Versturen…';
    let res;
    try { res = await Net.friendRequest(name); }
    catch (e) { msg.textContent = '' + (e.message || e); return; }
    const texts = {
      sent: 'Verzoek verstuurd naar ' + name + '.', now_friends: 'Jullie zijn nu vrienden!',
      already_sent: 'Je hebt al een verzoek gestuurd.', already_friends: 'Jullie zijn al vrienden.',
      not_found: 'Geen speler met die gebruikersnaam.', self: 'Je kunt jezelf niet toevoegen.',
      not_logged_in: 'Log eerst in.',
    };
    msg.textContent = texts[res] || res;
    if (res === 'sent' || res === 'now_friends') inp.value = '';
    this.renderFriends();
  },

  async acceptReq(id) { try { await Net.friendAccept(id); } catch (e) {} this.renderFriends(); },
  async removeFriend(id, nick, isReq) {
    if (!confirm((nick ? nick + ' ' : '') + (isReq ? 'weigeren/intrekken?' : 'als vriend verwijderen?'))) return;
    try { await Net.friendRemove(id); } catch (e) {}
    if (this._convo && this._convo.id === id) this.closeConvo(true);
    this.renderFriends();
  },

  // ---- DM-gesprek met 1 vriend (blijft opgeslagen) ----
  async openConvo(id, nick) {
    if (!this._chatOn()) return;                   // chat uit (v1)
    this._convo = { id: id, nick: nick };
    document.getElementById('friends-main').classList.add('hidden');
    document.getElementById('friends-convo').classList.remove('hidden');
    document.getElementById('convo-name').textContent = nick;
    const online = window.Net && Net.isOnline(id);
    const ch = document.getElementById('btn-convo-challenge');
    ch.disabled = !online; ch.innerHTML = this._ic('swords') + (online ? ' Uitdagen' : ' Offline');
    const box = document.getElementById('convo-messages'); box.innerHTML = '';
    document.getElementById('convo-msg').textContent = tl('Laden…');
    let msgs;
    try { msgs = await Net.loadMessages(id); }
    catch (e) { document.getElementById('convo-msg').textContent = '' + (e.message || e); return; }
    document.getElementById('convo-msg').textContent = '';
    const me = Net.user && Net.user.id;
    if (!msgs.length) this.addConvoLine('Nog geen berichten. Zeg hallo!', null);
    else msgs.forEach((m) => this.addConvoLine(m.body, m.sender === me));
    const inp = document.getElementById('convo-input'); if (inp) inp.focus();
  },

  closeConvo(silent) {
    this._convo = null;
    const c = document.getElementById('friends-convo'); if (c) c.classList.add('hidden');
    const m = document.getElementById('friends-main'); if (m) m.classList.remove('hidden');
    if (!silent && this._friendsOpen) this.renderFriends();
  },

  async sendConvo() {
    if (!this._chatOn() || !this._convo) return;   // chat uit (v1)
    const inp = document.getElementById('convo-input');
    const text = (inp.value || '').trim();
    if (!text) return;
    inp.value = '';
    this.addConvoLine(text, true);                 // eigen bericht meteen tonen
    try { await Net.sendMessage(this._convo.id, text); }
    catch (e) { document.getElementById('convo-msg').textContent = '' + (e.message || e); }
  },

  addConvoLine(text, me) {
    const box = document.getElementById('convo-messages'); if (!box) return;
    const row = document.createElement('div');
    row.className = 'dm-line' + (me === true ? ' me' : (me === null ? ' sys' : ''));
    row.innerHTML = '<span>' + this._esc(text) + '</span>';
    box.appendChild(row);
    while (box.children.length > 200) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  },

  // iemand uitnodigen vanuit de chat: maak een kamer + stuur de invite, ga naar de wachtruimte
  async inviteFromChat(toId, toNick) {
    if (!window.Net || !Net.ready) return;
    try {
      this._vsRole = 'host';
      const code = await Net.versusHost(this._versusCbs());
      Net.lobbyInvite(toId, code);            // broadcast op de nog-open chat-channel
      this.show('versus');                     // naar de versus-wachtruimte
      this._enterRoom(code);
      document.getElementById('vs-peer-status').textContent = tl('Uitnodiging naar ') + toNick + tl(' gestuurd… wachten tot die meedoet.');
    } catch (e) { alert(tl('Kon geen kamer maken: ') + (e.message || e)); }
  },

  onChatInvite(p) {
    this._chatInvite = p;
    document.getElementById('invite-text').textContent = (p.from || tl('Iemand')) + (p.coop ? tl(' nodigt je uit voor CO-OP!') : tl(' nodigt je uit voor een 1v1!'));
    document.getElementById('invite-screen').classList.remove('hidden');
  },

  acceptChatInvite() {
    const p = this._chatInvite; this._chatInvite = null;
    document.getElementById('invite-screen').classList.add('hidden');
    if (!p) return;
    this.closeFriends();
    if (p.coop) {                           // CO-OP-uitnodiging: sluit aan als co-op-maat, wacht op de level-keuze van de host
      this._coopRole = 'guest';
      this.openJourney();
      document.getElementById('coop-panel').classList.remove('hidden');
      const st = document.getElementById('coop-status'); if (st) st.textContent = tl('Meedoen…');
      Net.versusJoin(p.code, this._coopCbs());
      return;
    }
    this._vsRole = 'guest';                  // gewone 1v1-uitnodiging
    this.openVersusLobby();
    const inp = document.getElementById('vs-code-input'); if (inp) inp.value = p.code;
    this.versusJoin();
  },

  // ---- LEADERBOARD ----
  openLeaderboard() {
    document.querySelectorAll('#lb-tabs [data-lb]').forEach((b, i) => b.classList.toggle('active', i === 0));
    this.show('leaderboard');
    this.renderLeaderboard('rank');
  },

  async renderLeaderboard(sortBy) {
    const list = document.getElementById('lb-list');
    const msg = document.getElementById('lb-msg');
    list.innerHTML = ''; msg.textContent = tl('Laden…');
    if (!window.Net || !Net.ready) { msg.textContent = tl('Geen verbinding met de server.'); return; }
    let rows;
    try { rows = await Net.getLeaderboard(sortBy, 50); }
    catch (e) { msg.textContent = '' + (e.message || e); return; }
    if (!rows.length) { msg.textContent = tl('Nog geen spelers met een account. Log in en speel!'); return; }
    msg.textContent = '';
    const myNick = (window.Net && Net.isLoggedIn()) ? Net.nickname() : null;
    const statText = (r) => {
      if (sortBy === 'arena') return (r.arena_best || 0) + ' ronde';
      if (sortBy === 'wins') return (r.mp_wins || 0) + 'W ' + (r.mp_losses || 0) + 'L';
      if (sortBy === 'xp') return (r.xp || 0) + ' XP';
      return (r.rp || 0) + ' RP';
    };
    const rankChip = (rp) => { const idx = rankForRp(rp || 0), rk = RANKS[idx]; return '<span class="lb-rankbadge" style="color:' + rk.col + ';border-color:' + rk.col + '"><span class="lb-shield">' + rankShieldSVG(idx) + '</span>' + rk.name + '</span>'; };
    const makeRow = (r, rankText, me) => {
      const row = document.createElement('div');
      row.className = 'lb-row' + (me ? ' me' : '');
      row.innerHTML =
        '<span class="lb-rank">' + rankText + '</span>' +
        '<span class="lb-name">' + this._esc(r.nickname) + ' ' + rankChip(r.rp) + '</span>' +
        '<span class="lb-lvl">Lvl ' + playerLevel(r.xp || 0) + '</span>' +
        '<span class="lb-stat">' + statText(r) + '</span>';
      return row;
    };
    let meShown = false;
    rows.forEach((r, i) => {
      const me = myNick && r.nickname === myNick;
      if (me) meShown = true;
      const medal = i < 3 ? this._ic('medal') : (i + 1) + '.';
      list.appendChild(makeRow(r, medal, me));
    });
    // sta je niet in de getoonde top? toon je eigen rij apart onderaan
    if (myNick && !meShown && window.Net) {
      try {
        const mine = await Net.getMyRank(sortBy);
        if (mine) {
          const sep = document.createElement('div');
          sep.className = 'lb-sep'; sep.textContent = '• • •';
          list.appendChild(sep);
          list.appendChild(makeRow(mine, mine.rank + '.', true));
        }
      } catch (e) { /* stil */ }
    }
  },

  // eigen rank + RP-voortgang, verwerkt in de Power Smash-knop
  renderMenuRank() {
    const el = document.getElementById('tile-rank'); if (!el) return;
    const pr = Storage.rankProgress(), rk = pr.rank;
    el.innerHTML =
      '<span class="tr-badge" style="color:' + rk.col + '"><span class="tr-shield">' + rankShieldSVG(pr.idx) + '</span>' + rk.name + '</span>' +
      '<span class="tr-bar"><span style="width:' + Math.round(pr.pct * 100) + '%;background:' + rk.col + '"></span></span>' +
      '<span class="tr-rp">' + pr.rp + ' RP' + (pr.next ? (' · ' + pr.toNext + ' → ' + pr.next.name) : ' · MAX') + '</span>';
  },
  // rank-scherm openen (via de rank-banner): waar je nu bent, alle ranks + RP-drempels/beloningen
  openRankScreen() {
    const sc = document.getElementById('rank-screen'); if (!sc) return;
    sc.classList.remove('hidden');
    this.renderRankScreen();
    // terug-knop + klik-buiten (elke keer opnieuw binden zodat het zeker werkt)
    const back = document.getElementById('btn-rank-back');
    if (back) back.onclick = () => sc.classList.add('hidden');
    sc.onclick = (e) => { if (e.target === sc) sc.classList.add('hidden'); };
  },
  renderRankScreen() {
    const pr = Storage.rankProgress(), myIdx = pr.idx;
    const head = document.getElementById('rank-head');
    if (head) {
      head.innerHTML =
        '<span class="rk-hd-shield">' + rankShieldSVG(myIdx, 44) + '</span>' +
        '<div class="rk-hd-txt">' +
          '<div class="rk-hd-name" style="color:' + pr.rank.col + '">' + this._esc(pr.rank.name) + (pr.rank.title ? ' <span style="color:#cdb68e">— ' + this._esc(pr.rank.title) + '</span>' : '') + '</div>' +
          '<div class="rk-hd-rp">' + pr.rp + ' RP' + (pr.next ? (' · ' + pr.toNext + ' ' + tl('naar') + ' ' + this._esc(pr.next.name)) : ' · MAX RANK') + '</div>' +
          '<div class="rk-hd-bar"><span style="width:' + Math.round(pr.pct * 100) + '%;background:' + pr.rank.col + '"></span></div>' +
        '</div>';
    }
    const list = document.getElementById('rank-list');
    if (list) {
      let html = '';
      for (let i = RANKS.length - 1; i >= 0; i--) {   // hoogste rank bovenaan
        const r = RANKS[i], reached = myIdx >= i, isCur = myIdx === i;
        const rew = [];
        if (r.coins) rew.push(r.coins + ' <span class="coin-dot">●</span>');
        if (r.chest) rew.push(tl('kist'));
        html += '<div class="rk-row ' + (isCur ? 'current' : (reached ? 'reached' : 'locked')) + '">' +
          '<span class="rk-shield">' + rankShieldSVG(i, 30) + '</span>' +
          '<span class="rk-name" style="color:' + r.col + '">' + this._esc(r.name) + (r.title ? '<span class="rk-title">' + this._esc(r.title) + '</span>' : '') + '</span>' +
          '<span class="rk-rp">' + r.rp + ' RP</span>' +
          (rew.length ? '<span class="rk-reward">' + rew.join(' · ') + '</span>' : '') +
          (isCur ? '<span class="rk-you">' + tl('JIJ') + '</span>' : '') +
          '</div>';
      }
      list.innerHTML = html;
    }
    const foot = document.getElementById('rank-foot');
    if (foot && typeof RANK_RP !== 'undefined') {
      foot.innerHTML = tl('Winst') + ' +' + RANK_RP.win + ' RP · ' + tl('Verlies') + ' ' + RANK_RP.loss + ' RP · ' +
        tl('Winreeks') + ' +' + RANK_RP.streakBonus + ' · ' + tl('Hogere rank') + ' +' + RANK_RP.higherRankBonus;
    }
  },
  _esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; },
  // eigen pixel-icoon (vervangt standaard emoji) — als HTML-string voor innerHTML
  _ic(name) { return '<svg class="ic"><use href="#ic-' + name + '"/></svg>'; },

  // ---- 1 VS 1 LOBBY / SPEL ----
  // ---- MATCHMAKING: 8s zoeken naar een online tegenstander, anders een sterke bot ----
  startMatchmaking() {
    this.leaveLobby();
    this._botSetup = false; this._vsStarted = false; this._peer = null; this._myReady = false;
    this._vsRole = 'host';
    document.getElementById('versus-lobby').classList.add('hidden');
    document.getElementById('versus-wait').classList.add('hidden');
    document.getElementById('versus-result').classList.add('hidden');
    document.getElementById('versus-mm').classList.remove('hidden');
    document.getElementById('btn-vs-back').classList.add('hidden');   // tijdens zoeken: alleen Cancel, geen Back
    this.show('versus');
    this._mmSearching = true;
    let left = 8; const cnt = document.getElementById('mm-count'); if (cnt) cnt.textContent = left;
    if (this._mmIv) clearInterval(this._mmIv);
    this._mmIv = setInterval(() => {
      left--; if (cnt) cnt.textContent = Math.max(0, left);
      if (left <= 0) { clearInterval(this._mmIv); this._mmIv = 0; this.matchmakingToBot(); }
    }, 1000);
    if (window.Net && Net.ready && Net.findMatch) Net.findMatch(this._versusCbs());   // online zoeken (onMatch -> lobby)
  },
  _stopMatchmaking() {
    this._mmSearching = false;
    if (this._mmIv) { clearInterval(this._mmIv); this._mmIv = 0; }
    if (window.Net && Net.cancelMatchmaking) Net.cancelMatchmaking();
  },
  cancelMatchmaking() { this._stopMatchmaking(); if (window.Net) Net.leaveVersus(); this.show('menu'); },
  // online tegenstander gevonden -> normale map-vote-lobby (zonder kamercode)
  _matchmakingConnected() {
    this._stopMatchmaking();
    document.getElementById('versus-mm').classList.add('hidden');
    document.getElementById('btn-vs-back').classList.remove('hidden');
    this._vsStarted = false; this._myReady = false;
    this._myVote = { map: activeVersusMaps()[0].id, mode: 'smash', rounds: SMASH_ROUNDS };
    document.getElementById('versus-wait').classList.remove('hidden');
    document.querySelector('.vs-wait-label').classList.add('hidden');   // geen code bij matchmaking
    document.getElementById('vs-bot-diff').classList.add('hidden');
  },
  // geen online tegenstander binnen 8s -> matchmaking-bot (altijd een willekeurige map)
  matchmakingToBot() {
    this._stopMatchmaking();
    if (window.Net) Net.leaveVersus();   // eventuele half-open verbinding opruimen
    document.getElementById('versus-mm').classList.add('hidden');
    document.getElementById('btn-vs-back').classList.remove('hidden');
    this._matchType = 'mm';              // matchmaking -> random map (ook tegen de bot)
    this._botSetup = false; this._vsStarted = false;
    this._botDiff = 10;
    this._mmBotLevel = 10 + Math.floor(Math.random() * 11);   // Bot Lv 10..20
    this._myVote = { map: activeVersusMaps()[0].id, mode: 'smash', rounds: SMASH_ROUNDS };
    document.getElementById('versus-lobby').classList.add('hidden');
    document.getElementById('versus-result').classList.add('hidden');
    document.getElementById('versus-wait').classList.remove('hidden');
    document.querySelector('.vs-wait-label').classList.add('hidden');
    document.getElementById('vs-lobby-opts').classList.add('hidden');
    document.getElementById('vs-bot-diff').classList.add('hidden');
    document.getElementById('vs-peer-status').innerHTML = this._ic('bot') + ' ' + tl('Geen online speler gevonden — Bot Lv ') + this._mmBotLevel;
    this.show('versus');
    this._mmBotRoulette();               // map-roulette -> willekeurige map -> bot-match
  },
  // matchmaking-bot: draai de roulette en start op een willekeurige map (ook bij rematch)
  _mmBotRoulette() {
    this._vsStarted = false;
    document.getElementById('vs-lobby-opts').classList.add('hidden');
    const roul = document.getElementById('vs-roulette'); if (roul) roul.classList.remove('hidden');
    const t = document.getElementById('vs-roulette-title'); if (t) t.textContent = tl('Willekeurige map wordt gekozen…');
    this._renderRoulette();
    this._spinRoulette();
    setTimeout(() => {
      if (this._vsStarted) return;
      const map = activeVersusMaps()[Math.floor(Math.random() * activeVersusMaps().length)].id;
      this._myVote = this._myVote || { mode: 'smash', rounds: SMASH_ROUNDS };
      this._myVote.map = map;
      this._landRoulette(map, () => this.startBotMatch());
    }, 1200);
  },

  openVersusLobby() {
    this.leaveLobby();
    document.getElementById('btn-vs-back').classList.remove('hidden');
    document.getElementById('versus-lobby').classList.remove('hidden');
    document.getElementById('versus-wait').classList.add('hidden');
    document.getElementById('versus-result').classList.add('hidden');
    document.getElementById('versus-msg').textContent = '';
    document.getElementById('vs-code-input').value = '';
    this.show('versus');
  },

  _versusCbs() {
    return {
      onMatch: (role) => this._onVersusMatch(role),
      onLobby: (p) => this.onLobbyUpdate(p),
      onBegin: (p) => this.onLobbyBegin(p),
      onRematch: () => this.onRematch(),
      onState: (s) => Game.onVersusState(s),
      onHit: (p) => Game.onVersusHit(p),
      onFell: () => Game.onVersusFell(),
      onBurn: () => Game.onVersusBurn(),
      onShot: (p) => Game.onVersusShot(p),
      onQuake: (p) => Game.onVersusQuake(p),
      onAbility: (p) => Game.onVersusAbility(p),
      onOver: (p) => Game.onVersusOver(p),
      onPeerLeft: () => {
        if (Game.state === 'versus') { Game.endVersus(true, true); }   // tegenstander verliet = jij wint (forfeit)
        else if (Game.state === 'versusOver') {                   // op het uitslagscherm: rematch onmogelijk
          const rb = document.getElementById('btn-vs-rematch'); if (rb) { rb.disabled = true; rb.innerHTML = this._ic('refresh') + ' REMATCH'; }
          const rs = document.getElementById('vs-rematch-status'); if (rs) rs.textContent = tl('Tegenstander is weg — geen rematch mogelijk.');
          if (window.Net) Net.leaveVersus();
        } else { const ps = document.getElementById('vs-peer-status'); if (ps) ps.textContent = 'Tegenstander is weg…'; this._peer = null; document.getElementById('vs-lobby-opts').classList.add('hidden'); this.cancelCountdown(); }
      },
    };
  },

  async versusHost() {
    const msg = document.getElementById('versus-msg');
    if (!window.Net || !Net.ready) { msg.textContent = tl('Geen verbinding met de server.'); return; }
    msg.style.color = ''; msg.textContent = tl('Kamer aanmaken…');
    try {
      this._vsRole = 'host';
      const code = await Net.versusHost(this._versusCbs());
      this._enterRoom(code);
    } catch (e) { msg.style.color = '#ff6a6a'; msg.textContent = '' + (e.message || e); }
  },

  async versusJoin() {
    const msg = document.getElementById('versus-msg');
    const code = document.getElementById('vs-code-input').value;
    if (!code) { msg.textContent = tl('Vul de kamercode in.'); return; }
    if (!window.Net || !Net.ready) { msg.textContent = tl('Geen verbinding met de server.'); return; }
    msg.style.color = ''; msg.textContent = tl('Verbinden…');
    try {
      this._vsRole = 'guest';
      const c = await Net.versusJoin(code, this._versusCbs());
      this._enterRoom(c);
    } catch (e) { msg.style.color = '#ff6a6a'; msg.textContent = '' + (e.message || e); }
  },

  // bot-setup: kies map + wapenmodus, dan START
  openBotSetup() {
    this.leaveLobby();
    this._botSetup = true;
    this._matchType = 'bot';             // oefen-bot: zelf map kiezen (rematch = zelfde map)
    this._mmBotLevel = 0;                 // oefen-bot: geen echte inzet (geen XP/munten/kisten)
    this._myVote = { map: activeVersusMaps()[0].id, mode: 'smash', rounds: SMASH_ROUNDS };
    document.getElementById('versus-lobby').classList.add('hidden');
    document.getElementById('versus-result').classList.add('hidden');
    document.getElementById('versus-wait').classList.remove('hidden');
    document.querySelector('.vs-wait-label').classList.add('hidden');     // geen kamercode bij bot
    document.getElementById('vs-peer-status').textContent = tl('Kies een map en speel tegen de bot:');
    document.getElementById('vs-lobby-opts').classList.remove('hidden');
    this.renderMapVote();
    document.querySelectorAll('.vs-mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === 'melee'));
    document.getElementById('btn-vs-ready').innerHTML = this._ic('arrow-r') + ' START';
    document.getElementById('btn-vs-ready').classList.remove('on');
    document.getElementById('vs-ready-status').innerHTML = this._ic('bot') + ' Oefenpotje — geen XP';
    document.getElementById('vs-bot-diff').classList.remove('hidden');     // moeilijkheidsschuif tonen
    this.setBotDiff(this._botDiff || 5);
    this.show('versus');
  },

  // moeilijkheid + speelstijl-label bijwerken
  setBotDiff(n) {
    n = Math.max(1, Math.min(10, n || 5));
    this._botDiff = n;
    const prof = (typeof BOT_PROFILES !== 'undefined' && BOT_PROFILES[n - 1]) || null;
    const val = document.getElementById('vs-diff-val'); if (val) val.textContent = n;
    const nm = document.getElementById('vs-diff-name'); if (nm) nm.textContent = prof ? prof.name : '';
    const sl = document.getElementById('vs-diff-slider'); if (sl && +sl.value !== n) sl.value = n;
  },

  // tegen de bot spelen (lokaal, gekozen map, geen XP)
  startBotMatch() {
    this._botSetup = false;
    this._vsStarted = true;
    this._stopRoulette();
    const roul = document.getElementById('vs-roulette'); if (roul) roul.classList.add('hidden');
    const v = this._myVote || { map: (Game.vsMap && Game.vsMap.id) || activeVersusMaps()[0].id };
    Game.startVersus('host', { mapId: v.map, mode: 'smash', bot: true, diff: this._botDiff || 5, mmLevel: this._mmBotLevel || 0, swapSides: Math.random() < 0.5, rounds: this._lastRounds || SMASH_ROUNDS, timed: this._matchType === 'mm' });
  },

  // in een kamer: toon code, wacht op tegenstander
  _enterRoom(code) {
    this._vsStarted = false; this._peer = null; this._myReady = false;
    this._matchType = 'room';
    this._myVote = { map: activeVersusMaps()[0].id, mode: 'smash', rounds: SMASH_ROUNDS };
    document.getElementById('versus-msg').textContent = '';
    document.getElementById('versus-lobby').classList.add('hidden');
    document.getElementById('versus-wait').classList.remove('hidden');
    document.querySelector('.vs-wait-label').classList.remove('hidden');
    document.getElementById('vs-room-code').textContent = code;
    document.getElementById('vs-peer-status').textContent = tl('Wachten op tegenstander…');
    document.getElementById('vs-lobby-opts').classList.add('hidden');
  },

  // tegenstander aanwezig -> matchmaking = map-roulette; vriend/code-kamer = zelf kiezen + rondes
  _onVersusMatch(role) {
    if (role === 'host' || role === 'guest') this._vsRole = role;   // echte rol van Net (belangrijk bij matchmaking)
    const isMm = !!this._mmSearching;
    this._matchType = isMm ? 'mm' : 'room';
    if (isMm) this._matchmakingConnected();          // via matchmaking: mm-scherm weg, wachtruimte tonen
    if (window.Net && Net.lobby) Net.lobbyLeave();   // chat niet meer nodig tijdens het potje
    const bd = document.getElementById('vs-bot-diff'); if (bd) bd.classList.add('hidden');   // alleen bij bot
    if (this._matchType === 'mm') {                  // === RANDOM MATCHMAKING: map-roulette ===
      document.getElementById('vs-peer-status').textContent = tl('Tegenstander gevonden!');
      document.getElementById('vs-lobby-opts').classList.add('hidden');
      this._beginMmRoulette();
      return;
    }
    // === VRIEND / KAMER: zelf map kiezen + rondes ===
    document.getElementById('vs-peer-status').textContent = 'Tegenstander aanwezig!';
    document.getElementById('vs-roulette').classList.add('hidden');
    document.getElementById('vs-lobby-opts').classList.remove('hidden');
    this.renderMapVote();
    this._setupRoundsUI();
    this.refreshLobby();
    this.broadcastLobby();        // deel mijn (standaard) keuze
  },

  // ---- MATCHMAKING: map-roulette (willekeurige map, host beslist) ----
  _beginMmRoulette() {
    const roul = document.getElementById('vs-roulette'); if (roul) roul.classList.remove('hidden');
    const t = document.getElementById('vs-roulette-title'); if (t) t.textContent = tl('Willekeurige map wordt gekozen…');
    this._renderRoulette();
    this._spinRoulette();
    if (this._vsRole === 'host') {
      setTimeout(() => {
        if (this._vsStarted) return;
        const map = activeVersusMaps()[Math.floor(Math.random() * activeVersusMaps().length)].id;
        const swap = Math.random() < 0.5;
        if (window.Net) Net.versusSend('begin', { map, mode: 'smash', swap, rounds: SMASH_ROUNDS, roulette: 1 });
        this._landRoulette(map, () => this._beginMatch(map, 'smash', swap, SMASH_ROUNDS));
      }, 1400);
    }
  },
  _renderRoulette() {
    const strip = document.getElementById('vs-roulette-strip'); if (!strip) return;
    strip.innerHTML = '';
    activeVersusMaps().forEach((m) => {
      const tile = document.createElement('div'); tile.className = 'vs-roul-tile'; tile.dataset.map = m.id;
      tile.textContent = m.name; strip.appendChild(tile);
    });
  },
  _spinRoulette() {
    this._stopRoulette();
    const tiles = Array.prototype.slice.call(document.querySelectorAll('#vs-roulette-strip .vs-roul-tile'));
    if (!tiles.length) return;
    let i = 0;
    this._roulIv = setInterval(() => {
      tiles.forEach((t) => t.classList.remove('on'));
      tiles[i % tiles.length].classList.add('on'); i++;
    }, 90);
  },
  _stopRoulette() {
    if (this._roulIv) { clearInterval(this._roulIv); this._roulIv = 0; }
    if (this._roulTo) { clearTimeout(this._roulTo); this._roulTo = 0; }
  },
  _landRoulette(mapId, cb) {
    this._stopRoulette();
    const tiles = Array.prototype.slice.call(document.querySelectorAll('#vs-roulette-strip .vs-roul-tile'));
    if (!tiles.length) { cb(); return; }
    const targetIdx = Math.max(0, tiles.findIndex((t) => t.dataset.map === mapId));
    const total = tiles.length * 2 + targetIdx;   // een paar rondes en dan landen
    let step = 0, delay = 60;
    const tick = () => {
      tiles.forEach((t) => t.classList.remove('on'));
      tiles[step % tiles.length].classList.add('on');
      if (step >= total) {
        tiles[targetIdx].classList.add('picked');
        const t = document.getElementById('vs-roulette-title'); if (t) t.textContent = tiles[targetIdx].textContent + '!';
        if (window.Sfx) Sfx.play('pickup');
        this._roulTo = setTimeout(cb, 800);
        return;
      }
      step++; delay += 14;                          // afremmen
      this._roulTo = setTimeout(tick, Math.min(240, delay));
    };
    tick();
  },
  // ---- rondes-keuze (alleen in vriend/code-kamers) ----
  _setupRoundsUI() {
    const opt = document.getElementById('vs-rounds-opt'); if (!opt) return;
    const isRoom = this._matchType === 'room';
    opt.classList.toggle('hidden', !isRoom);
    if (!isRoom) return;
    if (this._myVote.rounds == null) this._myVote.rounds = SMASH_ROUNDS;
    const isHost = this._vsRole === 'host';
    const sl = document.getElementById('vs-rounds-slider'); if (sl) sl.disabled = !isHost;
    const note = document.getElementById('vs-rounds-note'); if (note) note.classList.toggle('hidden', isHost);
    this._updateRoundsDisplay();
  },
  _effectiveRounds() {
    const r = (this._vsRole === 'host') ? this._myVote.rounds : (this._peer && this._peer.rounds);
    return Math.max(3, Math.min(10, r || SMASH_ROUNDS));
  },
  _updateRoundsDisplay() {
    const val = document.getElementById('vs-rounds-val'); if (val) val.textContent = this._effectiveRounds();
    const sl = document.getElementById('vs-rounds-slider');
    if (sl && this._vsRole === 'host' && +sl.value !== (this._myVote.rounds || SMASH_ROUNDS)) sl.value = this._myVote.rounds || SMASH_ROUNDS;
  },
  setVoteRounds(n) {
    n = Math.max(3, Math.min(10, n || SMASH_ROUNDS));
    this._myVote.rounds = n;
    this._updateRoundsDisplay();
    if (!this._botSetup && this._matchType === 'room') this.broadcastLobby();
  },

  renderMapVote() {
    ['vs-map-list', 'vs-result-map-list'].forEach((listId) => {
      const list = document.getElementById(listId);
      if (!list) return;
      list.innerHTML = '';
      activeVersusMaps().forEach((m) => {
        const b = document.createElement('button');
        b.className = 'vs-map-btn' + (this._myVote.map === m.id ? ' picked' : '');
        b.dataset.map = m.id;
        b.innerHTML = '<span class="vs-map-name">' + m.name + '</span><span class="vs-map-votes" data-mv="' + m.id + '"></span>';
        b.onclick = () => this.setVoteMap(m.id);
        list.appendChild(b);
      });
    });
  },

  setVoteMap(id) {
    if (!this._botSetup && this._myReady) return;       // tijdens ready niet wisselen
    this._myVote.map = id;
    this.renderMapVote();
    if (!this._botSetup) { this.refreshLobby(); this.broadcastLobby(); }
  },
  setVoteMode(mode) {
    if (!this._botSetup && this._myReady) return;
    this._myVote.mode = mode;
    document.querySelectorAll('.vs-mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    if (!this._botSetup) { this.refreshLobby(); this.broadcastLobby(); }
  },
  toggleReady() {
    if (this._botSetup) { this.startBotMatch(); return; }   // in bot-setup = START
    this._myReady = !this._myReady;
    this.broadcastLobby(); this.refreshLobby(); this.checkBothReady();
  },

  broadcastLobby() {
    if (window.Net && Net.versus) Net.versusSend('lobby', { map: this._myVote.map, mode: this._myVote.mode, ready: !!this._myReady, rounds: this._myVote.rounds || SMASH_ROUNDS });
  },
  onLobbyUpdate(p) {
    this._peer = { map: p.map, mode: p.mode, ready: !!p.ready, rounds: p.rounds };
    this._updateRoundsDisplay();
    // op het uitslagscherm: alleen de stemmen bijwerken, NIET terug naar de lobby springen
    if (!document.getElementById('versus-result').classList.contains('hidden')) { this.refreshLobby(); return; }
    // tegenstander aanwezig -> zorg dat de opts zichtbaar zijn
    if (document.getElementById('vs-lobby-opts').classList.contains('hidden')) this._onVersusMatch();
    this.refreshLobby(); this.checkBothReady();
  },

  refreshLobby() {
    // map-stemmen tonen (in beide lijsten: lobby + uitslag)
    activeVersusMaps().forEach((m) => {
      let n = 0; if (this._myVote.map === m.id) n++; if (this._peer && this._peer.map === m.id) n++;
      document.querySelectorAll('[data-mv="' + m.id + '"]').forEach((el) => { el.textContent = n ? '●'.repeat(n) : ''; });
    });
    document.querySelectorAll('.vs-map-btn').forEach((b) => b.classList.toggle('picked', b.dataset.map === this._myVote.map));
    document.querySelectorAll('.vs-mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === this._myVote.mode));
    const ready = document.getElementById('btn-vs-ready');
    if (ready) { ready.innerHTML = this._myReady ? this._ic('check') + ' READY (klik om te annuleren)' : 'READY'; ready.classList.toggle('on', this._myReady); }
    const st = document.getElementById('vs-ready-status');
    const peerReady = this._peer && this._peer.ready;
    if (st) st.textContent = 'Jij: ' + (this._myReady ? 'klaar' : 'kiezen…') + '   •   Tegenstander: ' + (this._peer ? (peerReady ? 'klaar' : 'kiezen…') : '—');
  },

  checkBothReady() {
    if (this._myReady && this._peer && this._peer.ready) this.startCountdown();
    else this.cancelCountdown();
  },

  startCountdown() {
    if (this._cdTimer) return;          // al bezig
    this._cdLeft = 5000;
    const tick = () => {
      this._cdLeft -= 200;
      const st = document.getElementById('vs-ready-status');
      if (st) st.textContent = 'Start over ' + Math.ceil(this._cdLeft / 1000) + 's…';
      if (this._cdLeft <= 0) {
        clearInterval(this._cdTimer); this._cdTimer = null;
        if (this._vsRole === 'host') this.resolveAndBegin();   // host beslist de map/modus
        else { if (st) st.textContent = 'Starten…'; }          // gast wacht op 'begin'
      }
    };
    this._cdTimer = setInterval(tick, 200);
  },
  cancelCountdown() {
    if (this._cdTimer) { clearInterval(this._cdTimer); this._cdTimer = null; }
  },

  // host kiest de definitieve map + modus en stuurt 'begin'
  resolveAndBegin() {
    const mine = this._myVote, peer = this._peer || mine;
    const map = (mine.map === peer.map) ? mine.map : (Math.random() < 0.5 ? mine.map : peer.map);
    const mode = 'smash';                                   // online is altijd Power Smash
    const swap = Math.random() < 0.5;                       // host beslist de kant (soms links, soms rechts)
    const rounds = this._effectiveRounds();
    if (window.Net) Net.versusSend('begin', { map, mode, swap, rounds });
    this._beginMatch(map, mode, swap, rounds);
  },
  onLobbyBegin(p) {
    if (p.roulette && this._matchType === 'mm') {           // matchmaking: laat de roulette op de gekozen map landen
      this._landRoulette(p.map, () => this._beginMatch(p.map, p.mode, p.swap, p.rounds));
    } else {
      this._beginMatch(p.map, p.mode, p.swap, p.rounds);
    }
  },
  _beginMatch(map, mode, swap, rounds) {
    if (this._vsStarted) return;
    this._vsStarted = true;
    this._stopRoulette();
    this.cancelCountdown();
    this._lastRounds = Math.max(3, Math.min(10, rounds || this._lastRounds || SMASH_ROUNDS));
    document.getElementById('versus-result').classList.add('hidden');   // uitslag weg bij (re)start
    Game.startVersus(this._vsRole || 'host', { mapId: map, mode: mode, swapSides: !!swap, rounds: this._lastRounds, timed: this._matchType === 'mm' });
  },

  leaveLobby() {
    this.cancelCountdown();
    this._stopRoulette();
    this._vsStarted = false; this._peer = null; this._myReady = false; this._botSetup = false;
    const lbl = document.querySelector('.vs-wait-label'); if (lbl) lbl.classList.remove('hidden');
    const rb = document.getElementById('btn-vs-ready'); if (rb) { rb.textContent = 'READY'; rb.classList.remove('on'); }
    if (window.Net) Net.leaveVersus();   // alleen het versus-kanaal; presence blijft (teller op menu)
  },

  showVersus() {
    ['menu', 'level', 'shop', 'journey', 'arena', 'win', 'lose', 'versus', 'leaderboard', 'chat', 'inventory'].forEach((s) =>
      this.el[s].classList.add('hidden'));
    document.body.classList.add('in-game');
    this.el.hud.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.banner.classList.add('hidden');
    this.el.touch.classList.toggle('hidden', !Input.isTouch());
    document.getElementById('versus-hud').classList.remove('hidden');
    document.getElementById('btn-vs-quit').classList.remove('hidden');   // ✕ tonen (online); Journey verbergt 'm
    this.renderLoadoutBar();                                             // power-up-loadout onderin
    this.renderAbilityBtn();                                            // ability-vlam boven de melee-knop
    if (window.MenuBg) MenuBg.stop();                                   // geen vulkaan-bg tijdens een match
  },

  // ---------- TRAINING LOBBY ----------
  openTraining() {
    if (!window.Net || !Net.ready) { alert(tl('De training-lobby heeft internet nodig om andere spelers te zien.')); }
    Game.startTraining();
  },
  showTraining() {
    ['menu', 'level', 'shop', 'journey', 'arena', 'win', 'lose', 'versus', 'leaderboard', 'chat', 'inventory'].forEach((s) =>
      this.el[s] && this.el[s].classList.add('hidden'));
    document.body.classList.add('in-game');
    this.el.hud.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.banner.classList.add('hidden');
    this.el.touch.classList.toggle('hidden', !Input.isTouch());
    document.getElementById('versus-hud').classList.add('hidden');       // geen scores in training (eigen quit-knop in train-hud)
    const th = document.getElementById('train-hud'); if (th) th.classList.remove('hidden');
    const tp = document.getElementById('train-computer-panel'); if (tp) tp.classList.add('hidden');
    const tb = document.getElementById('train-computer-btn'); if (tb) tb.classList.add('hidden');
    document.getElementById('loadout-bar').classList.add('hidden');      // geen loadout-balk in training
    this.renderAbilityBtn();
    if (window.MenuBg) MenuBg.stop();
  },
  updateTrainingHud() {
    const n = (Game && Game.trainPeers) ? Object.keys(Game.trainPeers).length : 0;
    const el = document.getElementById('train-count'); if (el) el.textContent = (n + 1) + ' online';
  },
  trainSetNear(near) {
    const btn = document.getElementById('train-computer-btn');
    if (btn) btn.classList.toggle('hidden', !near);
    if (!near) this.closeTrainComputer();
  },
  openTrainComputer() {
    const panel = document.getElementById('train-computer-panel'); if (!panel) return;
    panel.classList.remove('hidden');
    this.renderTrainPowerups();
  },
  closeTrainComputer() { const p = document.getElementById('train-computer-panel'); if (p) p.classList.add('hidden'); },
  renderTrainPowerups() {
    const grid = document.getElementById('train-pu-grid'); if (!grid) return;
    grid.innerHTML = '';
    const divider = (txt) => { const d = document.createElement('div'); d.className = 'train-pu-divider'; d.textContent = txt; grid.appendChild(d); };
    // --- power-ups ---
    divider('POWER-UPS');
    const order = (typeof TRAINING_POWERUP_ORDER !== 'undefined') ? TRAINING_POWERUP_ORDER : POWERUP_ORDER;
    order.forEach((id) => {
      const pu = SHOP_POWERUPS[id]; if (!pu) return;
      const b = document.createElement('button'); b.className = 'train-pu'; b.dataset.kind = pu.kind;
      const cv = document.createElement('canvas'); cv.width = 44; cv.height = 44; cv.className = 'train-pu-ico';
      this._puIcon(cv, pu.kind);
      const lbl = document.createElement('span'); lbl.className = 'train-pu-lbl'; lbl.textContent = pu.name;
      b.appendChild(cv); b.appendChild(lbl);
      this._tap(b, () => { const k = b.dataset.kind; if (k) { Game.trainGivePowerup(k); this.closeTrainComputer(); } });
      grid.appendChild(b);
    });
    // --- melee-wapens ---
    divider(t('melee_weapons'));
    const melee = (typeof TRAINING_MELEE_ORDER !== 'undefined') ? TRAINING_MELEE_ORDER : [];
    melee.forEach((wid) => {
      const w = WEAPONS[wid]; if (!w) return;
      const b = document.createElement('button'); b.className = 'train-pu'; b.dataset.melee = wid;
      const cv = document.createElement('canvas'); cv.width = 44; cv.height = 44; cv.className = 'train-pu-ico';
      this._weaponIcon(cv, wid);
      const lbl = document.createElement('span'); lbl.className = 'train-pu-lbl'; lbl.textContent = w.name;
      b.appendChild(cv); b.appendChild(lbl);
      this._tap(b, () => { const k = b.dataset.melee; if (k) { Game.trainGiveMelee(k); this.closeTrainComputer(); } });
      grid.appendChild(b);
    });
    this._attachGridDrag(grid);
  },
  // sleep-scroll voor het power-up-grid (werkt óók onder touch-action:none, want we zetten scrollTop zelf)
  _attachGridDrag(grid) {
    if (grid._dragBound) return; grid._dragBound = true;
    let sy = 0, st = 0, id = null;
    grid.addEventListener('pointerdown', (e) => { id = e.pointerId; sy = e.clientY; st = grid.scrollTop; });
    grid.addEventListener('pointermove', (e) => { if (e.pointerId === id) grid.scrollTop = st - (e.clientY - sy); });
    const end = (e) => { if (e.pointerId === id) id = null; };
    grid.addEventListener('pointerup', end);
    grid.addEventListener('pointercancel', end);
  },
  // wapen-icoon gecentreerd op een klein canvas tekenen
  _weaponIcon(canvas, wid) {
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const s = 0.82;
    ctx.save(); ctx.translate(canvas.width / 2 - 26 * s, canvas.height / 2 - 24 * s);
    if (Sprites.drawWeaponIcon) Sprites.drawWeaponIcon(ctx, wid, s);
    ctx.restore();
  },

  // touch-knoppen tonen het pixel-icoon van het actieve wapen/powerup (i.p.v. emoji)
  updateTouchIcons() {
    const p = Game.player; if (!p) return;
    if (p.heli) { this._drawTbtnIcon('tbtn-melee-ic', 'rocket'); this._drawTbtnIcon('tbtn-fire-ic', 'ak47'); return; }   // heli: raket / minigun
    const meleeId = (p.swingWeapon && Game.time < (p.swingUntil || 0)) ? p.swingWeapon : (p.meleeId || 'bat');
    let fire;
    if (p.beachball > 0) fire = 'beachball';
    else if (p.coco > 0) fire = 'coco';
    else if (p.boomerang > 0) fire = 'boom';
    else if (p.dart > 0) fire = 'dart';
    else
    if (p.giant) fire = 'fist';                                     // reus kan niet vuren
    else if (p.fireballs > 0) fire = 'fireball';
    else if (p.smashRockets > 0) fire = 'rocket';
    else if (p.cannon > 0) fire = 'cannon';
    else if (p.gunAmmo > 0 && p.rangedId === 'ak47') fire = 'ak47';
    else if (p.rangedId) fire = p.rangedId;                         // campagne/arena vuurwapen
    else fire = meleeId;                                            // geen vuurwapen -> vuurknop slaat ook
    this._drawTbtnIcon('tbtn-melee-ic', meleeId);
    this._drawTbtnIcon('tbtn-fire-ic', fire);
  },
  _drawTbtnIcon(id, kind) {
    const cv = document.getElementById(id); if (!cv) return;
    if (cv._tok === kind) return; cv._tok = kind;                   // alleen hertekenen als 't verandert
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
    const P = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    if (kind === 'fireball') { P('#ff7a2a', 9, 7, 14, 16); P('#ffd24a', 13, 12, 6, 9); return; }
    if (kind === 'cannon') { P('#0e0e0e', 8, 9, 16, 15); P('#3a3a3a', 8, 9, 16, 3); P('#777', 14, 14, 3, 3); P('#6a4a2a', 15, 4, 2, 3); P('#ff8a3a', 15, 1, 2, 3); return; }
    if (kind === 'fist') { P('#3a7a4a', 9, 9, 14, 13); P('#2f5e38', 9, 9, 14, 3); P('#7affa0', 12, 12, 3, 3); return; }
    if (kind === 'beachball') { P('#ffffff', 8, 8, 16, 16); P('#e8483b', 8, 8, 16, 5); P('#3aa0e0', 8, 19, 16, 5); P('#f2c94c', 14, 8, 4, 16); return; }
    if (kind === 'coco') { P('#5e3f22', 8, 8, 16, 16); P('#8a5e36', 8, 8, 16, 5); P('#3a2614', 12, 14, 3, 3); P('#3a2614', 18, 18, 3, 3); return; }
    if (kind === 'boom') { P('#a8824a', 7, 14, 12, 4); P('#a8824a', 14, 7, 4, 12); P('#7a5e30', 7, 14, 4, 4); P('#7a5e30', 14, 7, 4, 4); return; }
    if (kind === 'dart') { P('#2f7a3a', 6, 14, 14, 3); P('#cfd6df', 19, 14, 5, 3); P('#6b4a2a', 5, 14, 3, 3); return; }
    const wid = (typeof WEAPONS !== 'undefined' && WEAPONS[kind]) ? kind : 'bat';
    ctx.save(); const s = 0.6; ctx.translate(15 - 25 * s, 16 - 23.5 * s); Sprites.drawWeaponIcon(ctx, wid, s); ctx.restore();
  },

  updateVersusHUD(v) {
    this.updateTouchIcons();
    this.renderAbilityBtn();
    const me = document.getElementById('vs-score-me');
    const them = document.getElementById('vs-score-them');
    if (me) me.textContent = v.myScore;
    if (them) them.textContent = v.oppScore;
    // nicknames + rank-icoontje naast de eigen hp-balk
    const myNick = (window.Net && Net.isLoggedIn && Net.isLoggedIn()) ? Net.nickname() : tl('Jij');
    this._setVsName('me', myNick, Storage.rankIndex());
    const oppNick = Game.vsBot ? 'Bot' : (v.oppName || tl('Tegenstander'));
    this._setVsName('them', oppNick, Game.vsBot ? -1 : rankForRp(v.oppRp || 0));
    // matchmaking-tijdklok (mm:ss)
    const tm = document.getElementById('vs-timer');
    if (tm) {
      if (v.timed && !v.timeUp) {
        tm.classList.remove('hidden');
        if (v.suddenDeath) { tm.textContent = tl('SUDDEN DEATH'); tm.className = 'vs-timer sd'; }
        else { const s = Math.max(0, Math.ceil(v.matchTimer / 1000)); tm.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); tm.className = 'vs-timer' + (s <= 20 ? ' urgent' : ''); }
      } else tm.classList.add('hidden');
    }
    // nuke-afteltimer (net onder de normale timer, als iemand een nuke heeft)
    const nt = document.getElementById('vs-nuke-timer');
    if (nt) {
      if (Game.nuke) {
        const secs = Math.max(0, Math.ceil((Game.nuke.until - Game.time) / 1000));
        nt.textContent = '☢ ' + secs + 's · ' + (Game.nuke.mine ? tl('OVERLEEF!') : tl('VERSLA ZE!'));
        nt.className = 'vs-nuke-timer ' + (Game.nuke.mine ? 'mine' : 'foe') + (secs <= 5 ? ' urgent' : '');
        nt.style.top = (tm && !tm.classList.contains('hidden')) ? '100px' : '8px';   // ruim onder de normale timer, of bovenaan als die er niet is
      } else nt.classList.add('hidden');
    }
    // mini-portretten naast de namen (1x per match opbouwen, gecachet op character+hoed)
    this._ensureVsPortrait('me', Storage.data.equippedChar || 'ryan', Storage.data.equippedHat);
    if (v.remote) this._ensureVsPortrait('them', v.remote.charId || 'ryan', v.remote.hat || 'none');
    // HP-balken
    const hpMe = document.getElementById('vs-hp-me');
    const hpThem = document.getElementById('vs-hp-them');
    const fracMe = Game.player ? Math.max(0, Math.min(100, (Game.player.hp / Game.player.maxHp) * 100)) : 100;
    const fracThem = v.remote ? Math.max(0, Math.min(100, (v.remote.hp / (v.remote.maxHp || 100)) * 100)) : 100;
    if (hpMe && Game.player) hpMe.style.width = fracMe + '%';
    if (hpThem && v.remote) hpThem.style.width = fracThem + '%';
    // 'ghost bar': net verloren HP blijft even bleek staan en loopt dan leeg (à la Street Fighter)
    this._vsGhost = this._vsGhost || { me: 100, them: 100 };
    const setGhost = (side, frac) => {
      const g = document.getElementById('vs-hp-ghost-' + side); if (!g) return;
      const cur = this._vsGhost[side];
      const nxt = frac >= cur ? frac : Math.max(frac, cur - 0.55);   // zakt ~33%/s achter de echte balk aan
      this._vsGhost[side] = nxt;
      g.style.width = nxt + '%';
    };
    if (Game.player) setGhost('me', fracMe);
    if (v.remote) setGhost('them', fracThem);
    // shield-balkjes (blauw, boven de hp)
    const shMe = document.getElementById('vs-shield-me'), shThem = document.getElementById('vs-shield-them');
    const setShield = (el, amt) => { if (!el) return; const on = amt > 0; el.classList.toggle('hidden', !on); if (on) el.firstElementChild.style.width = Math.max(0, Math.min(100, (amt / (typeof SMASH_SHIELD !== 'undefined' ? SMASH_SHIELD : 50)) * 100)) + '%'; };
    if (Game.player) setShield(shMe, Game.player.shieldHp || 0);
    if (v.remote) setShield(shThem, v.remote.shieldHp || 0);
    // harnas-HP (grijs balkje onder de normale hp)
    const arMe = document.getElementById('vs-armor-me');
    if (arMe && Game.player) { const amax = Game.player.armorMax || 0, on = amax > 0; arMe.classList.toggle('hidden', !on); if (on) arMe.firstElementChild.style.width = Math.max(0, Math.min(100, ((Game.player.armorHp || 0) / amax) * 100)) + '%'; }
    // guard-meter (eigen speler): zichtbaar als 'ie niet vol is; rood als 'ie gebroken is
    const gMe = document.getElementById('vs-guard-me');
    if (gMe && Game.player) {
      const gmax = (typeof GUARD_MAX !== 'undefined') ? GUARD_MAX : 2200;
      const frac = Math.max(0, Math.min(1, (Game.player.guard || 0) / gmax));
      gMe.classList.toggle('hidden', frac >= 0.999);
      gMe.firstElementChild.style.width = (frac * 100) + '%';
      gMe.classList.toggle('broken', !!Game.player._guardBroken);
    }
    const cd = document.getElementById('vs-countdown');
    if (cd) {
      const inIntro = v.introUntil && Game.time < v.introUntil;
      if (v.countdown > 0 && !inIntro) { cd.classList.remove('hidden'); cd.textContent = Math.ceil(v.countdown / 1000); }
      else cd.classList.add('hidden');
    }
    // grote "wint de ronde"-banner tijdens de freeze
    const rb = document.getElementById('vs-round-banner');
    if (rb) {
      if (v.roundMsg && v.roundFreezeUntil > Game.time) {
        rb.classList.remove('hidden');
        rb.innerHTML = '<span class="rb-title">' + tl('WINNER ROUND') + '</span><span class="rb-name">' + this._esc(v.roundWinName || '') + '</span>';
        rb.className = 'vs-round-banner ' + (v.roundWonByMe ? 'win' : 'lose');
      } else rb.classList.add('hidden');
    }
  },

  // mini-portret (canvas) vóór de naam in de versus-HUD; alleen opnieuw tekenen als character/hoed wisselt
  _ensureVsPortrait(side, cid, hat) {
    const host = document.getElementById('vs-name-' + side); if (!host) return;
    const key = cid + '|' + (hat || 'none');
    if (host._puKey === key) return;
    host._puKey = key;
    const old = host.querySelector('.vs-portrait'); if (old) old.remove();
    const c = CHARACTERS[cid] || CHARACTERS.ryan;
    const cv = document.createElement('canvas'); cv.width = 120; cv.height = 92; cv.className = 'vs-portrait';
    this._drawCharPreview(cv, c.palette, { build: c.build, hair: c.hair, hat: hat || 'none', outfit: c.outfit }, 0);
    host.insertBefore(cv, host.firstChild);
  },

  showWinCelebration(name, won) {
    const el = document.getElementById('vs-win'); if (!el) return;
    const nm = document.getElementById('vs-win-name'); if (nm) nm.textContent = name ? tl(name) : tl('Winnaar');
    el.classList.remove('hidden');
  },

  // map-intro bij de start van een potje (naam + korte hint), vóór het aftellen
  showMapIntro(map) {
    const el = document.getElementById('vs-map-intro'); if (!el || !map) return;
    const hints = { jungle: 'Stun-darts schieten door de arena', pirate: 'Pas op voor de zeemonster-tentakel', lava: 'Lavastraal barst uit het midden', temple: 'Deuren teleporteren je naar de overkant', airplane: 'Vogels + inzakkende wolk-platforms', castle: 'Een duikende draak knalt je van de map', dohyo: 'Kleine ring — sla ze er snel af', cave: 'Bliksem + vallende rotsblokken', beach: 'Getij + kaatsende strandbal' };
    const nm = document.getElementById('vmi-name'); if (nm) nm.textContent = map.name || 'Arena';
    const sub = document.getElementById('vmi-sub'); if (sub) sub.textContent = tl(hints[map.id] || 'Sla je tegenstander van de map!');
    el.classList.remove('hidden');
    el.classList.remove('vmi-in'); void el.offsetWidth; el.classList.add('vmi-in');   // animatie herstarten
  },
  hideMapIntro() { const el = document.getElementById('vs-map-intro'); if (el) el.classList.add('hidden'); },
  // nickname + rank-gem naast een hp-balk (alleen bij wijziging opnieuw zetten)
  _setVsName(side, nick, rankIdx) {
    const el = document.getElementById('vs-name-' + side); if (!el) return;
    const key = (nick || '') + '|' + rankIdx;
    if (el._key === key) return; el._key = key;
    const txt = el.querySelector('.vn-txt'); if (txt) txt.textContent = nick || '';
    const gem = el.querySelector('.vs-rank-gem');
    if (gem) {
      if (rankIdx == null || rankIdx < 0) { gem.style.display = 'none'; gem.innerHTML = ''; }
      else { gem.style.display = ''; const rk = RANKS[rankIdx] || RANKS[0]; gem.innerHTML = rankShieldSVG(rankIdx); gem.title = rk.name; }
    }
  },
  // grote midden-banner (TIJD! / SUDDEN DEATH)
  showBigMsg(text, kind, autoHideMs) {
    const el = document.getElementById('vs-bigmsg'); if (!el) return;
    el.textContent = text; el.className = 'vs-round-banner ' + (kind || 'win'); el.classList.remove('hidden');
    clearTimeout(this._bigMsgT);
    if (autoHideMs) this._bigMsgT = setTimeout(() => el.classList.add('hidden'), autoHideMs);
  },
  hideBigMsg() { const el = document.getElementById('vs-bigmsg'); if (el) el.classList.add('hidden'); },
  // korte melding onderin (bv. AFK-kick)
  toast(text) {
    let el = document.getElementById('tps-toast');
    if (!el) { el = document.createElement('div'); el.id = 'tps-toast'; el.className = 'tps-toast'; document.body.appendChild(el); }
    el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), 3000);
  },

  showVersusResult(won, myScore, oppScore, xpGained, isBot, coinsEarned, peerLeft, chestDrop, mmBot, rankRes, noContest) {
    const vw = document.getElementById('vs-win'); if (vw) vw.classList.add('hidden');
    // winnaar-podium: de winnende held groot op een sunburst, met confetti als JIJ wint
    const heroBox = document.getElementById('vs-result-hero');
    if (heroBox) {
      heroBox.classList.remove('hidden');
      heroBox.classList.toggle('lost', !won);
      const oldCv = heroBox.querySelector('canvas'); if (oldCv) oldCv.remove();
      let cid = Storage.data.equippedChar || 'ryan', hat = Storage.data.equippedHat;
      if (!won && typeof Game !== 'undefined' && Game.vs && Game.vs.remote && Game.vs.remote.charId) { cid = Game.vs.remote.charId; hat = Game.vs.remote.hat || 'none'; }
      const hc = CHARACTERS[cid] || CHARACTERS.ryan;
      const hcv = document.createElement('canvas'); hcv.width = 120; hcv.height = 92;
      this._drawCharPreview(hcv, hc.palette, { build: hc.build, hair: hc.hair, hat: hat || 'none', outfit: hc.outfit }, 0);
      heroBox.appendChild(hcv);
      let cf = heroBox.querySelector('.vrh-confetti');
      if (won) {
        if (!cf) {
          cf = document.createElement('div'); cf.className = 'vrh-confetti';
          for (let i = 0; i < 16; i++) {
            const p = document.createElement('i');
            p.style.left = (4 + Math.random() * 92) + '%';
            p.style.animationDelay = (Math.random() * 1.4) + 's';
            p.style.background = ['#f2c94c', '#6abe30', '#ff7a5a', '#7fb4ff', '#ffe27a'][i % 5];
            cf.appendChild(p);
          }
          heroBox.appendChild(cf);
        }
      } else if (cf) cf.remove();
    }
    if (window.Sfx && Sfx.calmOutro) Sfx.calmOutro();   // matchmuziek langzaam uit -> rustgevend thema

    // knop-bindingen herstellen (Journey kan ze hebben overschreven)
    document.getElementById('btn-vs-rematch').onclick = () => this.doRematch();
    // LOBBY-knop hier niet tonen (Rematch + Menu volstaan). Het element blijft bestaan:
    // Journey hergebruikt 'm als "WORLD MAP" en zet 'm daar weer zichtbaar.
    const ag = document.getElementById('btn-vs-again'); ag.classList.add('hidden'); ag.onclick = null;
    document.getElementById('btn-vs-menu').onclick = () => { document.getElementById('versus-result').classList.add('hidden'); this.leaveLobby(); this.show('menu'); };
    const rb = document.getElementById('vs-round-banner'); if (rb) rb.classList.add('hidden');
    document.getElementById('versus-hud').classList.add('hidden');
    document.getElementById('loadout-bar').classList.add('hidden');
    document.getElementById('ability-btn').classList.add('hidden');
    document.body.classList.remove('in-game');
    this.el.touch.classList.add('hidden');
    const t = document.getElementById('vs-result-title');
    if (noContest) t.textContent = tl('VERBINDING VERBROKEN');
    else if (won) t.innerHTML = tl('GEWONNEN! ') + this._ic('trophy'); else t.textContent = tl('VERLOREN');
    t.className = 'screen-title ' + (noContest ? '' : (won ? 'win' : 'lose'));
    document.getElementById('vs-result-score').textContent = myScore + ' – ' + oppScore;
    const xpEl = document.getElementById('vs-result-xp');
    xpEl.classList.remove('hidden');
    if (noContest) {                             // verbinding weg: uitleggen dat er niets is verrekend
      xpEl.innerHTML = tl('De verbinding met je tegenstander viel weg. Deze match telt niet mee — je rank en munten blijven ongewijzigd.');
    } else if (!isBot) {                         // echte online tegenstander -> XP + RP + rank
      let html = '+' + (xpGained || 0) + ' XP  ·  +' + (coinsEarned || 0) + ' ● ' + tl('munten');
      if (rankRes) {
        const d = rankRes.delta, rk = RANKS[rankRes.newIdx];
        html += '<br><span style="color:' + (d >= 0 ? '#7be07a' : '#ff7a6a') + ';font-weight:bold">' + (d >= 0 ? '+' : '') + d + ' RP</span>' +
          '  ·  <span style="color:' + rk.col + '">' + rk.name + '</span> (' + rankRes.newRp + ' RP)';
        if (rankRes.streakBonus) html += '<br><span style="color:#ffd24a">' + this._ic('fire') + ' ' + tl('Winreeks') + '! +' + rankRes.streakBonus + ' RP</span>';
        if (rankRes.higherBonus) html += (rankRes.streakBonus ? ' · ' : '<br>') + '<span style="color:#ffd24a">' + tl('Hogere rank verslagen') + ' +' + rankRes.higherBonus + ' RP</span>';
        if (rankRes.rankedUp) html += '<br><span style="color:' + rk.col + ';font-weight:bold">' + this._ic('rankup') + ' ' + tl('NIEUWE RANK') + ': ' + rk.name + (rk.title ? ' — ' + rk.title : '') + '!</span>';
      }
      html += (window.Net && Net.isLoggedIn() ? '' : '<br>' + tl('(log in om je rank & munten mee te tellen)'));
      xpEl.innerHTML = html;
    } else {
      xpEl.innerHTML = this._ic('bot') + ' ' + tl('Tegen de bot — telt niet mee voor rank of XP') + (coinsEarned > 0 ? '<br>+' + coinsEarned + ' ● ' + tl('munten') : '');
    }
    // rematch-knop voorbereiden
    this._rematchMine = false; this._rematchPeer = false; this._vsStarted = false; this._isBotResult = !!isBot;
    const rbtn = document.getElementById('btn-vs-rematch');
    const rs = document.getElementById('vs-rematch-status');
    const voteBox = document.getElementById('vs-result-vote');
    if (peerLeft) {
      // tegenstander heeft de match verlaten -> geen rematch mogelijk
      rbtn.disabled = true; rbtn.classList.add('hidden');
      rs.textContent = tl('Tegenstander heeft de match verlaten.');
      if (voteBox) voteBox.classList.add('hidden');
    } else {
      rbtn.disabled = false; rbtn.innerHTML = this._ic('refresh') + ' REMATCH'; rbtn.classList.remove('hidden');
      rs.textContent = isBot ? '' : tl('Beiden moeten op rematch drukken.');
      // map-stemmen voor de volgende pot: standaard de huidige map
      const curMap = (Game.vsMap && Game.vsMap.id) || activeVersusMaps()[0].id;
      const rr = this._lastRounds || SMASH_ROUNDS;
      this._myVote = { map: curMap, mode: 'smash', rounds: rr };
      this._myReady = false;
      this._peer = isBot ? null : { map: curMap, mode: 'smash', ready: false, rounds: rr };
      this.renderMapVote();
      this.refreshLobby();
      // matchmaking: geen map-stemmen op het uitslagscherm (rematch = weer een willekeurige map)
      if (voteBox) voteBox.classList.toggle('hidden', this._matchType === 'mm');
      if (!isBot) this.broadcastLobby();      // deel mijn (standaard) keuze met de tegenstander
    }

    document.getElementById('versus-result').classList.remove('hidden');
    this.refreshAuthUI();
    document.getElementById('versus-screen').classList.add('hidden');
    // gewonnen met beloning -> munten/xp-popup bovenop de uitslag
    const rlist = [];
    if (won && (xpGained > 0 || coinsEarned > 0)) rlist.push({ type: 'earn', coins: coinsEarned, xp: xpGained });
    if (chestDrop) rlist.push({ type: 'chest', rarity: chestDrop });   // losse kist
    let gotChest = !!chestDrop;
    if (rankRes && rankRes.rewards) for (const rw of rankRes.rewards) {   // rank-up-beloningen (munten + kist)
      if (rw.coins) rlist.push({ type: 'earn', coins: rw.coins, xp: 0, rank: rw.rank.name });
      if (rw.chest) { rlist.push({ type: 'chest', rarity: rw.chest }); gotChest = true; }
    }
    if (rankRes && rankRes.unlockedChars) for (const ch of rankRes.unlockedChars) rlist.push({ type: 'char', id: ch.id, name: ch.name });   // rank-helden vrijgespeeld
    if (gotChest) this.renderChests();
    rlist.push(...this._levelUpRewards());
    if (rlist.length) this.showRewards(rlist);
  },

  // ---- REMATCH ----
  doRematch() {
    if (this._isBotResult) {                 // tegen de bot: meteen opnieuw
      document.getElementById('versus-result').classList.add('hidden');
      if (this._matchType === 'mm') {        // matchmaking-bot: opnieuw een WILLEKEURIGE map (roulette)
        document.getElementById('versus-wait').classList.remove('hidden');
        document.querySelector('.vs-wait-label').classList.add('hidden');
        document.getElementById('vs-bot-diff').classList.add('hidden');
        document.getElementById('vs-peer-status').innerHTML = this._ic('bot') + ' Bot Lv ' + (this._mmBotLevel || 10);
        this.show('versus');
        this._mmBotRoulette();
      } else {                               // oefen-bot: zelfde gekozen map
        this.startBotMatch();
      }
      return;
    }
    // online: handshake (beiden ready)
    if (!window.Net || !Net.versus) {        // tegenstander al weg / geen kanaal
      document.getElementById('vs-rematch-status').textContent = tl('Geen verbinding meer — terug naar lobby.');
      return;
    }
    this._rematchMine = true;
    this.broadcastLobby();                 // mijn map-stem zeker meesturen
    Net.versusSend('rematch', {});
    const rb = document.getElementById('btn-vs-rematch');
    rb.disabled = true; rb.innerHTML = this._ic('check') + ' Wacht op tegenstander…';
    this.checkRematch();
  },

  onRematch() {
    this._rematchPeer = true;
    const rs = document.getElementById('vs-rematch-status');
    if (rs && !this._rematchMine) rs.innerHTML = this._ic('refresh') + ' Tegenstander wil een rematch! Druk ook op rematch.';
    this.checkRematch();
  },

  checkRematch() {
    if (!this._rematchMine || !this._rematchPeer) return;
    this._vsStarted = false;                                 // nieuwe pot: begin-guard resetten
    // de host bepaalt map + rondes en stuurt 'begin'; beiden starten
    if (this._vsRole === 'host') {
      const mode = 'smash', swap = Math.random() < 0.5, rounds = this._effectiveRounds();
      if (this._matchType === 'mm') {                        // matchmaking-rematch: opnieuw willekeurige map
        const map = activeVersusMaps()[Math.floor(Math.random() * activeVersusMaps().length)].id;
        if (window.Net) Net.versusSend('begin', { map, mode, swap, rounds });
        this._beginMatch(map, mode, swap, rounds);
      } else {
        const cur = (Game.vsMap && Game.vsMap.id) || activeVersusMaps()[0].id;
        const mine = (this._myVote && this._myVote.map) || cur;
        const peer = (this._peer && this._peer.map) || mine;
        const map = (mine === peer) ? mine : (Math.random() < 0.5 ? mine : peer);   // oneens -> loting
        if (window.Net) Net.versusSend('begin', { map, mode, swap, rounds });
        this._beginMatch(map, mode, swap, rounds);
      }
    } else {
      const rs = document.getElementById('vs-rematch-status'); if (rs) rs.textContent = 'Starten…';
    }
  },

  show(name) {
    ['menu', 'level', 'shop', 'journey', 'blacksmith', 'arena', 'win', 'lose', 'versus', 'leaderboard', 'chat', 'inventory'].forEach((s) => {
      if (this.el[s]) this.el[s].classList.toggle('hidden', s !== name);
    });
    const inGame = (name === 'game');
    document.body.classList.toggle('in-game', inGame);
    this.el.hud.classList.toggle('hidden', !inGame);
    this.el.pause.classList.toggle('hidden', !inGame);
    this.el.touch.classList.toggle('hidden', !inGame || !Input.isTouch());
    if (!inGame) { this.el.tutorialBox.classList.add('hidden'); this.el.banner.classList.add('hidden'); }
    // versus-HUD nooit laten hangen op een gewoon scherm (score/HP-balken/✕)
    const vh = document.getElementById('versus-hud'); if (vh) vh.classList.add('hidden');
    const vrb = document.getElementById('vs-round-banner'); if (vrb) vrb.classList.add('hidden');
    const vmi = document.getElementById('vs-map-intro'); if (vmi) vmi.classList.add('hidden');
    const vtm = document.getElementById('vs-timer'); if (vtm) vtm.classList.add('hidden');
    const vnt = document.getElementById('vs-nuke-timer'); if (vnt) vnt.classList.add('hidden');
    const vbm = document.getElementById('vs-bigmsg'); if (vbm) vbm.classList.add('hidden');
    const vw = document.getElementById('vs-win'); if (vw) vw.classList.add('hidden');
    const lb = document.getElementById('loadout-bar'); if (lb) lb.classList.add('hidden');   // loadout niet op menu's
    // vulkaan-achtergrond alleen laten draaien op de menuschermen (niet in het spel)
    if (window.MenuBg) { if (!inGame) MenuBg.start(); else MenuBg.stop(); }
    // kisten + live timer alleen op het hoofdmenu
    if (name === 'menu') { this.renderChests(); this.renderMenuRank(); this._startChestTimer(); } else this._stopChestTimer();
    if (name !== 'blacksmith') this._stopForgeTimer();
    if (name !== 'versus') this._stopMatchmaking();   // buiten het versus-scherm nooit blijven zoeken

    // munten- en robijntellers bijwerken
    this.el.menuCoins.textContent = Storage.data.coins;
    if (this.el.menuRubies) this.el.menuRubies.textContent = Storage.rubies();
    if (name === 'menu') { this.updateArenaButton(); this.refreshAuthUI(); this.ensurePresence(); if (window.Sfx) Sfx.music('menu'); this.maybeShowBeta(); }
    else if (name === 'game') { this.leavePresence(); }   // tijdens het spelen niet online in de lobby
  },

  // wereld 2 is pas open als wereld 1 (incl. boss) is uitgespeeld
  worldUnlocked(worldId) { return worldId === 1 || Storage.highestCleared(worldId - 1) >= 10; },

  // ---------- LEVEL SELECT ----------
  renderLevels() {
    if (!this.viewWorld || !this.worldUnlocked(this.viewWorld)) this.viewWorld = 1;
    // wereld-tabs
    const tabs = document.getElementById('world-tabs');
    tabs.innerHTML = '';
    WORLDS.forEach((w) => {
      const open = this.worldUnlocked(w.id);
      const tab = document.createElement('button');
      tab.className = 'world-tab' + (w.id === this.viewWorld ? ' active' : '') + (open ? '' : ' locked');
      if (open) tab.textContent = t('world') + ' ' + w.id; else tab.innerHTML = t('world') + ' ' + w.id + ' ' + this._ic('lock');
      if (open) tab.onclick = () => { this.viewWorld = w.id; this.renderLevels(); };
      tabs.appendChild(tab);
    });

    const world = WORLDS.find((w) => w.id === this.viewWorld);
    document.getElementById('world-sub').textContent = t('world') + ' ' + world.id + ' — ' + world.name;

    const grid = this.el.levelGrid;
    grid.innerHTML = '';
    const cleared = Storage.highestCleared(world.id);
    world.levels.forEach((lv) => {
      const unlocked = Storage.isLevelUnlocked(world.id, lv.id);
      const isCleared = lv.id <= cleared;
      const cell = document.createElement('div');
      cell.className = 'level-cell' + (unlocked ? '' : ' locked') + (isCleared ? ' cleared' : '');
      const badge = lv.mode === 'horde' ? '<div class="lvl-badge">HORDE</div>'
        : lv.mode === 'melee' ? '<div class="lvl-badge">MELEE</div>'
        : lv.mode === 'boss' ? '<div class="lvl-badge boss">BOSS</div>'
        : lv.parkour ? '<div class="lvl-badge">PARKOUR</div>' : '';
      cell.innerHTML = `${badge}<div class="num">${lv.id}</div><div class="stars">${isCleared ? this._ic('star') : ''}</div>`;
      if (unlocked) cell.onclick = () => Game.startLevel(world.id, lv.id);
      grid.appendChild(cell);
    });
  },

  // ---------- SHOP (wapens / characters / hoeden in tabs) ----------
  openShop() { if (!this._shopTab || this._shopTab === 'weapons') this._shopTab = 'chars'; this.show('shop'); this.renderShop(); },

  renderShop() {
    const tab = this._shopTab || 'chars';
    document.querySelectorAll('.shop-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    this.el.shopCoins.textContent = Storage.data.coins;
    // robijn-saldo tonen op de crates/rubies-tabs; muntsaldo verbergen daar
    const rubyWrap = document.getElementById('shop-rubies-wrap'), coinWrap = document.getElementById('shop-coins-wrap');
    const rubyTab = (tab === 'crates' || tab === 'rubies' || tab === 'skins');
    if (rubyWrap) { rubyWrap.classList.toggle('hidden', !rubyTab); const rc = document.getElementById('shop-ruby-count'); if (rc) rc.textContent = Storage.rubies(); }
    if (coinWrap) coinWrap.classList.toggle('hidden', rubyTab);
    // subnote boven de grid (overleeft _galleryify, dat de grid leegmaakt)
    const sub = document.getElementById('shop-subnote');
    if (sub) {
      let txt = '';
      if (tab === 'crates') txt = tl('Gekochte crates gaan meteen open — je buit wordt direct bijgeschreven.');
      else if (tab === 'skins') txt = tl('Skins zijn puur uiterlijk — ze veranderen niets aan je stats.');
      else if (tab === 'rubies' && !(window.IAP && IAP.available)) txt = tl('In-app aankopen worden binnenkort geactiveerd.');
      sub.textContent = txt; sub.classList.toggle('hidden', !txt);
    }
    this.el.shopGrid.innerHTML = '';
    this._charAnims = [];
    if (tab === 'chars') this.renderCharCards();
    else if (tab === 'hats') this.renderHatCards();
    else if (tab === 'skins') this.renderSkinCards();
    else if (tab === 'powerups') this.renderPowerupCards(this.el.shopGrid, 'shop');
    else if (tab === 'crates') this.renderCrateCards();
    else if (tab === 'rubies') this.renderRubyCards();
    else this.renderWeaponCards();
    this._galleryify(this.el.shopGrid, 'shop_' + tab);
  },

  // crate-icoon (gebruikt de bestaande kist-tekening) op een klein canvas
  _drawCrateIcon(canvas, rarity) {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2 + 14); ctx.scale(3, 3);
    this._chestArt(ctx, rarity, 0);
    ctx.restore();
  },

  // ---- Crates-tab: epic/legendary crates kopen met robijnen ----
  renderCrateCards() {
    const grid = this.el.shopGrid;
    (typeof CRATE_SHOP !== 'undefined' ? CRATE_SHOP : []).forEach((c) => {
      const type = CHEST_TYPES[c.rarity]; if (!type) return;
      const card = document.createElement('div');
      card.className = 'shop-card crate-card';
      const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; cv.className = 'pu-ico';
      this._drawCrateIcon(cv, c.rarity);
      const desc = c.rarity === 'legendary'
        ? tl('Beste buit: veel munten, XP, materialen en kans op zeldzame items.')
        : tl('Rijke buit: munten, XP, materialen en items.');
      const gold = type.gold ? (type.gold[0] + '–' + type.gold[1]) : '';
      const info2 = document.createElement('div');
      info2.innerHTML = '<div class="w-name" style="color:' + type.col + '">' + tl(type.name) + ' ' + tl('Crate') + '</div><div class="w-stats">' + desc + (gold ? '<br>' + tl('Munten') + ': ~' + gold : '') + '</div>';
      card.appendChild(cv); card.appendChild(info2);
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      const afford = Storage.rubies() >= c.costRubies;
      btn.classList.add(afford ? 'buy' : 'cant');
      btn.textContent = t('buy') + ' — ' + c.costRubies + ' ◆';
      card.appendChild(btn);
      this._tap(btn, () => this.buyCrate(c.rarity));
      // App Store-richtlijn 3.1.1: kansen tonen vóór aankoop
      const odds = document.createElement('button');
      odds.className = 'crate-odds-link';
      odds.textContent = tl('Kansen bekijken');
      this._tap(odds, () => this.openCrateOdds(c.rarity));
      card.appendChild(odds);
      grid.appendChild(card);
    });
  },

  // Loot box-kansen tonen vóór aankoop (App Store 3.1.1)
  openCrateOdds(rarity) {
    const pool = (typeof CRATE_POOLS !== 'undefined' && CRATE_POOLS[rarity]) || [];
    const draws = (typeof CRATE_DRAWS !== 'undefined' && CRATE_DRAWS[rarity]) || [2, 4];
    const type = (typeof CHEST_TYPES !== 'undefined' && CHEST_TYPES[rarity]) || {};
    let sc = document.getElementById('crate-odds');
    if (!sc) {
      sc = document.createElement('div'); sc.id = 'crate-odds'; sc.className = 'overlay hidden';
      sc.innerHTML = '<div class="overlay-box crate-odds-box">' +
        '<button class="corner-back" id="btn-crate-odds-back" aria-label="Back"><svg class="ic"><use href="#ic-undo"/></svg></button>' +
        '<h2 class="screen-title" id="co-title"></h2>' +
        '<div id="co-body" class="hs-stats"></div>' +
      '</div>';
      document.body.appendChild(sc);
    }
    const tot = pool.reduce((s, p) => s + p[1], 0) || 1;
    document.getElementById('co-title').textContent = tl(type.name || '') + ' ' + tl('Crate') + ' — ' + tl('Kansen');
    const body = document.getElementById('co-body');
    body.innerHTML = '';
    const note = (txt) => { const p = document.createElement('p'); p.className = 'screen-sub'; p.textContent = txt; body.appendChild(p); };
    note(tl('Elke crate geeft') + ' ' + draws[0] + '–' + draws[1] + ' ' + tl('power-ups — kans per power-up:'));
    pool.slice().sort((a, b) => b[1] - a[1]).forEach((p) => {
      const sp = (typeof SHOP_POWERUPS !== 'undefined' && SHOP_POWERUPS[p[0]]) || {};
      const pct = p[1] / tot * 100;
      const pctStr = (pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)) + '%';
      const row = document.createElement('div'); row.className = 'hs-row co-row';
      const left = document.createElement('span'); left.className = 'co-left';
      const cv = document.createElement('canvas'); cv.width = 30; cv.height = 30; cv.className = 'co-ico';
      this._puIcon(cv, sp.kind || p[0]);                 // eigen game-icoon i.p.v. emoji
      const nm = document.createElement('span'); nm.textContent = sp.name || p[0];
      left.appendChild(cv); left.appendChild(nm);
      const b = document.createElement('b'); b.textContent = pctStr;
      row.appendChild(left); row.appendChild(b);
      body.appendChild(row);
    });
    const rubyLine = rarity === 'epic' ? ' ' + tl('en 2–10 robijnen') : (rarity === 'legendary' ? ' ' + tl('en 5–20 robijnen') : '');
    note(tl('Altijd erbij: munten, XP en smeed-materialen') + rubyLine + '.');
    sc.classList.remove('hidden');
    document.getElementById('btn-crate-odds-back').onclick = () => sc.classList.add('hidden');
    sc.onclick = (e) => { if (e.target === sc) sc.classList.add('hidden'); };
  },

  buyCrate(rarity) {
    const res = Storage.buyCrate(rarity);
    if (res && typeof res === 'object') {   // beloning -> crate gaat meteen open met animatie
      if (window.Sfx) Sfx.play('pickup');
      this.renderShop();                    // robijn-saldo bijwerken
      this.showChestRewards(res);           // openings-animatie + buit-popups
    } else if (res === 'poor') {
      this.toast(tl('Niet genoeg robijnen. Koop er via de Rubies-tab.'));
    }
  },

  // ---- Rubies-tab: robijnen kopen met echt geld (Apple In-App Purchase) ----
  renderRubyCards() {
    const grid = this.el.shopGrid;
    const packs = (typeof RUBY_PACKS !== 'undefined') ? RUBY_PACKS : [];
    packs.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'shop-card ruby-card';
      const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; cv.className = 'pu-ico';
      this._drawRubyIcon(cv, p.rubies);
      const info = document.createElement('div');
      info.innerHTML = '<div class="w-name">' + p.rubies + ' ◆ ' + tl('Robijnen') + (p.best ? ' <span class="ruby-best">' + tl('Beste deal') + '</span>' : '') + '</div><div class="w-stats">' + tl('Koop via de App Store') + '</div>';
      card.appendChild(cv); card.appendChild(info);
      const btn = document.createElement('button');
      btn.className = 'shop-buy buy';
      // toon de echte App Store-prijs zodra StoreKit die geleverd heeft; anders de richtprijs
      const price = (window.IAP && IAP.priceFor && IAP.priceFor(p.product)) || p.price;
      btn.textContent = price;
      card.appendChild(btn);
      this._tap(btn, () => this.buyRubies(p));
      grid.appendChild(card);
    });
  },

  _drawRubyIcon(canvas, n) {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const px = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    // een trosje robijnen (meer robijnen = groter oogt via extra steentjes)
    const gem = (cx, cy, s) => {
      px('#ff9db0', cx - 2 * s, cy - 3 * s, 4 * s, s); px('#f24d68', cx - 3 * s, cy - 2 * s, 6 * s, s);
      px('#e0364f', cx - 3 * s, cy - s, 6 * s, s); px('#c72740', cx - 2 * s, cy, 4 * s, s);
      px('#a81e33', cx - s, cy + s, 2 * s, s); px('#ffd0da', cx + s, cy - 2 * s, s, 2 * s);
    };
    const big = n >= 500 ? 7 : 6;
    gem(48, 50, big);
    if (n >= 200) { gem(30, 62, 4); gem(66, 62, 4); }
    if (n >= 1000) { gem(38, 34, 3); gem(58, 34, 3); }
  },

  async buyRubies(pack) {
    if (!window.IAP) { this.toast(tl('In-app aankopen worden binnenkort geactiveerd.')); return; }
    const res = await IAP.buyRubies(pack);
    if (res === 'ok') {
      if (window.Sfx) Sfx.play('pickup');
      this.syncCoins();
      this.renderShop();
      this.toast('+' + pack.rubies + ' ◆ ' + tl('Robijnen'));
    } else if (res === 'unavailable') {
      this.toast(tl('In-app aankopen worden binnenkort geactiveerd.'));
    } else if (res === 'pending') {
      this.toast(tl('Aankoop wacht op goedkeuring.'));
    } else if (res === 'cancelled') {
      /* gebruiker annuleerde zelf — geen melding nodig */
    } else {
      this.toast(tl('Aankoop niet voltooid.'));
    }
  },

  // robuuste tik-binding: gebruikt pointer-events i.p.v. 'click'. Op touch met touch-action:none
  // + multitouch (bv. een vinger op een beweeg-knop) worden 'click'-events soms niet afgevuurd;
  // pointerup werkt daar wél. immediate:true = direct op pointerdown vuren (voor de ability-knop).
  _tap(el, fn, opts) {
    if (!el) return;
    opts = opts || {};
    if (opts.immediate) {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(e); });
      return;
    }
    let id = null, sx = 0, sy = 0, moved = false;
    el.addEventListener('pointerdown', (e) => { id = e.pointerId; sx = e.clientX; sy = e.clientY; moved = false; });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === id && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) moved = true; });
    el.addEventListener('pointerup', (e) => { if (e.pointerId === id) { id = null; if (!moved) { e.preventDefault(); fn(e); } } });
    el.addEventListener('pointercancel', () => { id = null; });
  },
  // power-up-kaartjes: KOOP (meermaals) in de shop; in de inventaris = loadout aan/uit + aantal
  renderPowerupCards(grid, mode) {
    // loadout-teller (alleen in de inventaris) — als losse regel boven de galerij zodat je ziet hoeveel je hebt gekozen
    const par = grid.parentNode;
    if (par) {
      let lc = par.querySelector('.loadout-count');
      if (mode === 'inventory') {
        if (!lc) { lc = document.createElement('div'); lc.className = 'loadout-count'; par.insertBefore(lc, grid); }
        const n = Storage.loadout().length;
        lc.textContent = tl('Loadout') + ': ' + n + ' / 3' + (n >= 3 ? ' ' + tl('(vol)') : '');
      } else if (lc) { lc.remove(); }
    }
    POWERUP_ORDER.forEach((id) => {
      const pu = SHOP_POWERUPS[id]; if (!pu) return;
      if (mode === 'shop' && pu.chestOnly) return;              // kist-only power-ups niet te koop
      const count = Storage.powerupCount(id);
      if (mode === 'inventory' && pu.chestOnly && count <= 0 && !Storage.inLoadout(id)) return;   // pas tonen als je 'm hebt (of 'm nog in je loadout zit om uit te trekken)
      const card = document.createElement('div');
      card.className = 'shop-card powerup-card' + (count > 0 ? ' owned' : '');
      const inLo = Storage.inLoadout(id);
      const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; cv.className = 'pu-ico';
      this._puIcon(cv, pu.kind);
      const info = document.createElement('div');
      info.innerHTML = '<div class="w-name">' + pu.name + (count > 0 ? ' <span class="pu-count">x' + count + '</span>' : '') + '</div><div class="w-stats">' + pu.desc + '</div>';
      card.appendChild(cv); card.appendChild(info);
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      if (mode === 'shop') {
        if (pu.costRubies) {                              // met robijnen te koop (◆)
          const afford = Storage.rubies() >= pu.costRubies;
          btn.classList.add(afford ? 'buy' : 'cant');
          btn.textContent = afford ? t('buy') + ' — ' + pu.costRubies + ' ◆' : pu.costRubies + ' ◆ ' + t('too_few');
        } else {
          const afford = Storage.data.coins >= pu.cost;
          btn.classList.add(afford ? 'buy' : 'cant');
          btn.textContent = t('buy') + ' — ' + pu.cost + ' ●';
        }
        this._tap(btn, () => { if (Storage.buyPowerup(id)) this.renderShop(); });
      } else {                              // inventaris: loadout-toggle
        if (inLo) { btn.classList.add('equipped'); btn.innerHTML = count > 0 ? this._ic('check') + ' ' + t('in_loadout') : this._ic('x') + ' ' + t('out_loadout'); card.classList.add('in-loadout'); if (count <= 0) card.classList.add('depleted'); this._tap(btn, () => { Storage.toggleLoadout(id); this.renderInventory(); }); }
        else if (count <= 0) { card.classList.add('locked'); btn.classList.add('cant'); btn.textContent = t('buy_in_shop'); }
        else { btn.classList.add('equip'); btn.textContent = t('choose'); this._tap(btn, () => { if (!Storage.toggleLoadout(id)) this.flashLoadoutFull(); this.renderInventory(); }); }
      }
      card.appendChild(btn);
      grid.appendChild(card);
    });
  },
  flashLoadoutFull() {
    const c = document.getElementById('inv-loadout-count'); if (c) { c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 500); }
  },
  // 2.5D power-up-icoon op een klein canvas tekenen (nieuwe look, met inkt-outline)
  _puIcon(canvas, kind) {
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sc = canvas.width / 22;
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(sc, sc);
    if (Sprites.drawPowerupIcon) Sprites.drawPowerupIcon(ctx, kind, 0, 0);
    else if (typeof Game !== 'undefined' && Game.drawDrop) Game.drawDrop(ctx, { kind, x: 0, y: 0, id: 0 });
    ctx.restore();
  },

  // ---------- INVENTARIS (3 tabs: power-ups / characters / hoeden) ----------
  openInventory() { if (!this._invTab) this._invTab = 'powerups'; this.show('inventory'); this.renderInventory(); },
  renderInventory() {
    const tab = this._invTab || 'powerups';
    document.querySelectorAll('#inv-tabs .shop-tab').forEach((b) => b.classList.toggle('active', b.dataset.invtab === tab));
    const grid = document.getElementById('inv-grid'); grid.innerHTML = '';
    const _lc = grid.parentNode && grid.parentNode.querySelector('.loadout-count'); if (_lc) _lc.remove();   // teller alleen bij power-ups-tab
    this._charAnims = [];
    const hint = document.getElementById('inv-hint');
    if (tab === 'powerups') {
      hint.classList.remove('hidden');
      hint.innerHTML = 'Kies max <b>3</b> power-ups voor je loadout (<span id="inv-loadout-count">' + Storage.loadout().length + '</span>/3). In een match activeer je ze; per gebruik gaat er 1 af.';
      this.renderPowerupCards(grid, 'inventory');
    } else if (tab === 'chars') { hint.classList.add('hidden'); this.renderOwnedChars(grid); }
    else if (tab === 'hats') { hint.classList.add('hidden'); this.renderOwnedHats(grid); }
    else if (tab === 'armor') { hint.classList.remove('hidden'); hint.innerHTML = tl('Harnas geeft <b>extra HP</b> (grijs balkje). Rust per slot 1 stuk uit. Smeed nieuwe stukken bij de <b>Blacksmith</b>.'); this.renderOwnedArmor(grid); }
    else if (tab === 'materials') { hint.classList.remove('hidden'); hint.innerHTML = tl('Materialen vind je in <b>kisten</b>. Gebruik ze bij de <b>Blacksmith</b> om harnas te smeden.'); this.renderMaterials(grid); }
    this._galleryify(grid, 'inv_' + tab);
  },
  // ---------- INVENTARIS: harnas ----------
  renderOwnedArmor(grid) {
    const eq = Storage.equippedArmor();
    let any = false;
    for (const set of ARMOR_SET_ORDER) for (const slot of ARMOR_SLOTS) {
      const id = set + '_' + slot; if (!Storage.hasArmor(id)) continue;
      any = true;
      const p = ARMOR_PIECES[id], dur = Storage.armorDur(id), broken = dur <= 0, equipped = eq[slot] === id;
      const durPct = Math.round(100 * dur / p.maxDur), eff = Storage.armorEffHp(id);
      const card = document.createElement('div'); card.className = 'shop-card armor-card' + (equipped ? ' equipped' : '') + (broken ? ' depleted' : '');
      const cv = this._armorPieceCanvas(id); card.appendChild(cv);
      const nm = document.createElement('div'); nm.className = 'shop-card-name'; nm.textContent = p.name; card.appendChild(nm);
      const hp = document.createElement('div'); hp.className = 'armor-hp'; hp.innerHTML = '+' + eff + (eff < p.hp ? '/' + p.hp : '') + ' HP · ' + ARMOR_SLOT_NAME[slot]; card.appendChild(hp);
      const durLbl = document.createElement('div'); durLbl.className = 'armor-dur-lbl' + (broken ? ' broken' : (durPct < 34 ? ' low' : '')); durLbl.innerHTML = this._ic('heart') + ' ' + (broken ? t('broken') : durPct + '%'); card.appendChild(durLbl);
      const durw = document.createElement('div'); durw.className = 'armor-dur' + (durPct < 34 ? ' low' : ''); const dspan = document.createElement('span'); dspan.style.width = durPct + '%'; durw.appendChild(dspan); card.appendChild(durw);
      const btn = document.createElement('button'); btn.className = 'shop-buy';
      if (broken) { btn.classList.add('buy'); btn.innerHTML = this._ic('hammer') + ' ' + t('repair_btn'); this._tap(btn, () => { this.openBlacksmith(); this._bsTab = set; this.renderBlacksmith(); }); }
      else if (equipped) { btn.classList.add('equipped'); btn.innerHTML = this._ic('check') + ' ' + t('equipped'); this._tap(btn, () => { Storage.equipArmor(id); this.renderInventory(); }); }
      else { btn.classList.add('equip'); btn.textContent = t('equip'); this._tap(btn, () => { Storage.equipArmor(id); this.renderInventory(); }); }
      card.appendChild(btn); grid.appendChild(card);
    }
    if (!any) { const e = document.createElement('p'); e.className = 'screen-sub'; e.textContent = tl('Nog geen harnas. Smeed er een bij de Blacksmith.'); grid.appendChild(e); }
  },
  renderMaterials(grid) {
    for (const id of MATERIAL_ORDER) {
      const m = MATERIALS[id], n = Storage.materials()[id] || 0;
      const card = document.createElement('div'); card.className = 'shop-card';
      const cv = document.createElement('canvas'); cv.width = 90; cv.height = 70; const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.save(); ctx.translate(45, 38); this._matArt(ctx, id, 4.4); ctx.restore(); card.appendChild(cv);
      const nm = document.createElement('div'); nm.className = 'shop-card-name'; nm.textContent = m.name; card.appendChild(nm);
      const cnt = document.createElement('div'); cnt.className = 'armor-hp'; cnt.textContent = 'Aantal: ' + n; card.appendChild(cnt);
      grid.appendChild(card);
    }
  },
  _matArt(ctx, id, scale) {
    const s = scale || 3; ctx.save(); ctx.scale(s, s);
    const P = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    const col = (MATERIALS[id] || {}).col || '#b0a080';
    if (id === 'leather') { P('#6e3f1c', -7, -5, 14, 10); P(col, -6, -4, 12, 8); P('#c98a5a', -5, -4, 10, 1); P('#5a3316', -3, -1, 2, 2); P('#5a3316', 2, 1, 2, 2); }
    else if (id === 'nails') { for (let k = 0; k < 3; k++) { const x = -5 + k * 4; P('#8a9098', x, -5, 2, 9); P('#e6ecf2', x - 1, -6, 4, 2); } }
    else { P(col, -7, -3, 14, 7); P(id === 'steel' ? '#cfe0f2' : '#dfe6ec', -7, -3, 14, 2); P('#5a636c', -7, 3, 14, 1); P('#7a828a', -5, -2, 3, 1); }
    ctx.restore();
  },
  // een harnas-stuk als losstaand icoon (voor de kaarten)
  _armorPieceCanvas(id) {
    const p = ARMOR_PIECES[id], set = ARMOR_SETS[p.set];
    const cv = document.createElement('canvas'); cv.width = 90; cv.height = 70; const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.save(); ctx.translate(45, 40); ctx.scale(3.4, 3.4);
    const P = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    const plate = (x, y, w, h) => { P(set.col, x, y, w, h); P('#ffffff40', x, y, w, 1); P(set.colDk, x, y, 1, h); P('#00000030', x, y + h - 1, w, 1); };
    if (p.slot === 'chest') {
      if (set.cape) { P('#8a1f1a', -8, -6, 3, 15); P('#c0392b', -8, -6, 3, 2); }              // mantelpunt
      plate(-5, -6, 10, 12); P(set.colDk, -1, -5, 2, 10); P('#ffffff55', 0, -4, 1, 8);        // borstplaat + ribbel
      P(set.col, -7, -6, 3, 3); P(set.col, 4, -6, 3, 3);                                       // schouderstukken
      if (set.trim) { P(set.trim, -5, -6, 10, 1); P(set.trim, -5, 5, 10, 1); }                 // gouden randen
    } else if (p.slot === 'bottom') { plate(-5, -4, 10, 5); plate(-5, 1, 4, 5); plate(1, 1, 4, 5); if (set.trim) P(set.trim, -5, -4, 10, 1); }
    else if (p.slot === 'feet') { plate(-6, 2, 5, 4); plate(1, 2, 5, 4); }
    else {   // helm + rode pluim
      P('#6a1512', -1, -12, 2, 4); P(set.plume, -1, -14, 3, 4);                                // pluim
      plate(-5, -7, 10, 6); P(set.col, -6, -1, 3, 5); P(set.col, 3, -1, 3, 5);                 // helm-dome + wangstukken
      P('#2b2f38', -4, -4, 8, 2); P('#8fd0ff', 1, -4, 2, 2);                                   // vizier + oog
      if (set.trim) P(set.trim, -5, -2, 10, 1);
    }
    ctx.restore();
    return cv;
  },

  // ---------- BLACKSMITH (smederij) ----------
  openBlacksmith() { if (!this._bsTab) this._bsTab = 'leather'; this.show('blacksmith'); this.renderBlacksmith(); this._startForgeTimer(); },
  _fmtDur(ms) { const m = Math.round(ms / 60000); if (m < 60) return m + 'm'; const h = Math.floor(m / 60); return h + 'u' + (m % 60 ? (m % 60) + 'm' : ''); },
  renderBlacksmith() {
    const set = this._bsTab || 'leather';
    document.querySelectorAll('#bs-tabs .shop-tab').forEach((b) => { if (b.dataset.bstab) b.classList.toggle('active', b.dataset.bstab === set); });
    // materiaal-strip
    const mats = document.getElementById('bs-mats');
    if (mats) { mats.innerHTML = '';
      for (const id of MATERIAL_ORDER) {
        const chip = document.createElement('span'); chip.className = 'mat-chip';
        const cv = document.createElement('canvas'); cv.width = 22; cv.height = 20; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.save(); c.translate(11, 11); this._matArt(c, id, 1.5); c.restore(); chip.appendChild(cv);
        const t = document.createElement('span'); t.innerHTML = MATERIALS[id].name + ' <b>' + (Storage.materials()[id] || 0) + '</b>'; chip.appendChild(t);
        mats.appendChild(chip);
      }
    }
    this._renderForgeSlot();
    const grid = document.getElementById('bs-grid'); grid.innerHTML = '';
    const busy = !!Storage.forge();
    for (const slot of ARMOR_SLOTS) {
      const id = set + '_' + slot, p = ARMOR_PIECES[id], owned = Storage.hasArmor(id), dur = Storage.armorDur(id);
      const repair = owned && dur < p.maxDur;
      const card = document.createElement('div'); card.className = 'shop-card armor-card';
      card.appendChild(this._armorPieceCanvas(id));
      const nm = document.createElement('div'); nm.className = 'shop-card-name'; nm.textContent = p.name; card.appendChild(nm);
      const eff = owned ? Storage.armorEffHp(id) : p.hp;
      const hp = document.createElement('div'); hp.className = 'armor-hp'; hp.innerHTML = '+' + eff + (owned && eff < p.hp ? '/' + p.hp : '') + ' HP · ' + ARMOR_SLOT_NAME[slot]; card.appendChild(hp);
      if (owned) {
        const durPct = Math.round(100 * dur / p.maxDur), broken = dur <= 0;
        const dl = document.createElement('div'); dl.className = 'armor-dur-lbl' + (broken ? ' broken' : (durPct < 34 ? ' low' : '')); dl.innerHTML = this._ic('heart') + ' ' + (broken ? t('broken') : durPct + '%'); card.appendChild(dl);
        const dw = document.createElement('div'); dw.className = 'armor-dur' + (durPct < 34 ? ' low' : ''); const ds = document.createElement('span'); ds.style.width = durPct + '%'; dw.appendChild(ds); card.appendChild(dw);
      }
      const cost = Storage.craftCost(id, repair), ms = Storage.craftMs(id, repair);
      const cl = document.createElement('div'); cl.className = 'armor-cost';
      cl.innerHTML = Object.keys(cost).map((k) => { const short = (Storage.materials()[k] || 0) < cost[k]; return '<span' + (short ? ' class="short"' : '') + '>' + cost[k] + ' ' + MATERIALS[k].name + '</span>'; }).join(' · ') + ' · ' + this._fmtDur(ms);
      card.appendChild(cl);
      const btn = document.createElement('button'); btn.className = 'bs-craft-btn';
      if (owned && dur >= p.maxDur) { btn.className += ' owned'; btn.textContent = t('made'); btn.disabled = true; }
      else if (busy) { btn.className += ' locked'; btn.textContent = t('smith_busy'); btn.disabled = true; }
      else {
        const can = Storage.canCraft(id, repair);
        btn.className += can ? ' equip' : ' locked'; btn.textContent = repair ? t('repair_btn') : t('forge_btn');
        if (can) this._tap(btn, () => { if (Storage.startCraft(id, repair)) { if (window.Sfx) Sfx.play('pickup'); this.renderBlacksmith(); } });
        else btn.disabled = true;
      }
      card.appendChild(btn); grid.appendChild(card);
    }
  },
  _renderForgeSlot() {
    const el = document.getElementById('bs-forge'); if (!el) return;
    const f = Storage.forge();
    if (!f) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    el.classList.remove('hidden'); el.innerHTML = '';
    const p = ARMOR_PIECES[f.id];
    const nm = document.createElement('span'); nm.className = 'bs-forge-name'; nm.textContent = (f.repair ? tl('Repareren: ') : tl('Smeden: ')) + p.name; el.appendChild(nm);
    if (Storage.forgeReady()) {
      const btn = document.createElement('button'); btn.className = 'bs-collect'; btn.textContent = t('collect');
      this._tap(btn, () => { const r = Storage.collectForge(); if (r) { if (window.Sfx) Sfx.play('coin'); this.renderBlacksmith(); } });
      el.appendChild(btn);
    } else {
      const tm = document.createElement('span'); tm.className = 'bs-forge-time'; tm.textContent = this._fmtChestTime(Storage.forgeSecondsLeft()); el.appendChild(tm);
      const skip = document.createElement('span'); skip.className = 'bs-skip';
      skip.innerHTML = '<svg class="px-icon" viewBox="0 0 8 8" width="11" height="11" shape-rendering="crispEdges"><rect x="2" y="1" width="4" height="1" fill="#ff9db0"/><rect x="1" y="2" width="6" height="1" fill="#f24d68"/><rect x="1" y="3" width="6" height="1" fill="#e0364f"/><rect x="2" y="4" width="4" height="1" fill="#c72740"/></svg> ' + Storage.forgeSkipCost();
      skip.onclick = () => this.forgeSkip();
      el.appendChild(skip);
    }
  },
  forgeSkip() {
    const cost = Storage.forgeSkipCost();
    if (Storage.rubies() < cost) { const el = document.getElementById('bs-forge'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } if (window.Sfx) Sfx.play('roundlose'); return; }
    if (Storage.skipForge()) { if (window.Sfx) Sfx.play('coin'); this.syncCoins(); this.renderBlacksmith(); }
  },
  _startForgeTimer() { if (this._forgeIv) return; this._forgeIv = setInterval(() => { const sc = document.getElementById('blacksmith-screen'); if (sc && !sc.classList.contains('hidden')) this._renderForgeSlot(); else this._stopForgeTimer(); }, 1000); },
  _stopForgeTimer() { if (this._forgeIv) { clearInterval(this._forgeIv); this._forgeIv = 0; } },

  // ---------- HOED-PREVIEW (shop / inventaris) — grote 2.5D buste met de hoed ----------
  _hatCanvas(id) {
    const canvas = document.createElement('canvas');
    canvas.width = 120; canvas.height = 92;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const sc = canvas.height / 30;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 - 2 * sc);
    ctx.scale(sc, sc);
    if (Sprites.drawHatBust) Sprites.drawHatBust(ctx, id, 0, 0, 0);
    ctx.restore();
    return canvas;
  },

  // ---------- CHARACTER-PREVIEW (shop / inventaris) — 2.5D net als in de game ----------
  // Maakt een canvas met grondschaduw + inkt-outline, en registreert 'm voor de idle-animatie.
  _charCanvas(palette, opts) {
    const canvas = document.createElement('canvas');
    canvas.width = 120; canvas.height = 92;
    this._charAnims = this._charAnims || [];
    this._charAnims.push({ canvas, palette, opts });
    this._drawCharPreview(canvas, palette, opts, (typeof performance !== 'undefined' ? performance.now() : 0));
    this._startCharAnim();
    return canvas;
  },
  // teken het character in de kaart: grondschaduw (diepte) + zachte idle-beweging, zoals in de game
  _drawCharPreview(canvas, palette, opts, t) {
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sc = canvas.height / 48;
    const footY = canvas.height / sc - 4;
    const ph = t / 640;
    const bob = Math.sin(ph);                                   // rustige adem/idle
    ctx.save();
    ctx.translate(canvas.width / 2, 0);
    ctx.scale(sc, sc);
    // zachte vloer-schijf (pedestal) — geeft diepte en laat de schaduw lezen op de donkere kaart
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#7fa6cf';
    ctx.beginPath(); ctx.ellipse(0, footY + 1.5, 13, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    Sprites.shadow(ctx, 0, footY, 9 - Math.max(0, bob) * 1.2);   // schaduw krimpt als hij 'ademt'
    const pose = Object.assign({ airborne: false }, opts, { walkPhase: Math.sin(ph) * 0.4, t: t });
    Sprites.drawCharacter(ctx, 0, footY - bob, 1, palette, pose);
    ctx.restore();
  },
  // gedeelde idle-animatielus: draait alleen als shop of inventaris zichtbaar is (throttled ~22fps)
  _startCharAnim() {
    if (this._charAnimRunning) return;
    this._charAnimRunning = true;
    let last = 0;
    const step = (now) => {
      const vis = (this.el.shop && !this.el.shop.classList.contains('hidden')) ||
                  (this.el.inventory && !this.el.inventory.classList.contains('hidden'));
      const anims = this._charAnims || [];
      if (!vis || !anims.length) { this._charAnimRunning = false; return; }
      if (now - last >= 45) {                                    // throttle: ~22 fps is genoeg voor idle
        last = now;
        for (const a of anims) {
          if (!a.canvas.isConnected) continue;
          const slide = a.canvas.closest ? a.canvas.closest('.gal-slide') : null;
          if (slide && !slide.classList.contains('active')) continue;   // alleen de grote actieve kaart animeren
          this._drawCharPreview(a.canvas, a.palette, a.opts, now);
        }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  // ---------- HORIZONTALE GALERIJ (shop + inventaris) ----------
  // Zet de reeds gebouwde .shop-card kinderen om in een carrousel:
  // 1 item groot in het midden (2.5D), buren kleiner, pijltjes om te scrollen.
  // Winkel/inventaris als HORIZONTALE plank: meerdere kaarten tegelijk zichtbaar,
  // sideways vegen/scrollen om er meer te zien (App Store-stijl, benut brede iOS-landscape).
  _galleryify(container, key) {
    if (this._galRO) { try { this._galRO.disconnect(); } catch (e) {} this._galRO = null; }
    if (this._galResizeHandler) { window.removeEventListener('resize', this._galResizeHandler); this._galResizeHandler = null; }
    const cards = Array.prototype.slice.call(container.children).filter((el) => el.classList && el.classList.contains('shop-card'));
    if (!cards.length) return;                     // niets om te tonen (bv. hint-tekst) — laat staan
    container.innerHTML = '';
    container.classList.add('gallery');

    const shelf = document.createElement('div'); shelf.className = 'shop-shelf';
    cards.forEach((card) => { const cell = document.createElement('div'); cell.className = 'shelf-cell'; cell.appendChild(card); shelf.appendChild(cell); });

    const prev = document.createElement('button'); prev.className = 'gal-arrow left'; prev.type = 'button'; prev.innerHTML = this._ic('arrow-l');
    const next = document.createElement('button'); next.className = 'gal-arrow right'; next.type = 'button'; next.innerHTML = this._ic('arrow-r');
    container.appendChild(prev); container.appendChild(shelf); container.appendChild(next);

    const step = () => { const cell = shelf.querySelector('.shelf-cell'); return ((cell ? cell.offsetWidth : 160) + 10) * 2; };
    const updateArrows = () => {
      const maxSL = shelf.scrollWidth - shelf.clientWidth;
      prev.disabled = shelf.scrollLeft <= 2;
      next.disabled = shelf.scrollLeft >= maxSL - 2;
      const hide = maxSL <= 4;                       // alles past -> pijlen verbergen + kaarten centreren
      prev.style.display = next.style.display = hide ? 'none' : '';
      shelf.classList.toggle('centered', hide);
    };
    prev.onclick = () => shelf.scrollBy({ left: -step(), behavior: 'smooth' });
    next.onclick = () => shelf.scrollBy({ left: step(), behavior: 'smooth' });

    // scrollpositie per tab onthouden
    this._galScroll = this._galScroll || {};
    shelf.addEventListener('scroll', () => { this._galScroll[key] = shelf.scrollLeft; updateArrows(); }, { passive: true });
    requestAnimationFrame(() => { shelf.scrollLeft = this._galScroll[key] || 0; updateArrows(); });

    this._galApply = updateArrows;
    if (typeof ResizeObserver !== 'undefined') { this._galRO = new ResizeObserver(() => updateArrows()); this._galRO.observe(shelf); }
    else { this._galResizeHandler = () => updateArrows(); window.addEventListener('resize', this._galResizeHandler); }
  },

  _spriteCard(palette, opts, nameHtml, owned) {
    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : '');
    const canvas = this._charCanvas(palette, opts);
    const info = document.createElement('div'); info.innerHTML = nameHtml;
    card.appendChild(canvas); card.appendChild(info);
    return card;
  },
  renderOwnedChars(grid) {
    grid.innerHTML = '';
    CHARACTER_ORDER.forEach((cid) => {
      if (!Storage.ownsCharacter(cid)) return;
      const c = CHARACTERS[cid]; const equipped = Storage.data.equippedCharacter === cid;
      const rend = charRender(cid, Storage.skinFor(cid));     // preview toont de skin die je op hebt
      const card = this._spriteCard(rend.palette, { weapon: c.startMelee || c.forcedMelee || 'bat', build: rend.build, hair: rend.hair, hat: Storage.data.equippedHat, outfit: rend.outfit }, '<div class="w-name">' + c.name + '</div>', true);
      const spr = card.querySelector('canvas');          // op het plaatje tikken -> stats-venster van de hero
      if (spr) { spr.style.cursor = 'pointer'; this._tap(spr, () => this.openHeroStats(cid), { immediate: true }); }
      const iBadge = document.createElement('span'); iBadge.className = 'hero-info-i'; iBadge.textContent = 'i';   // info-icoon -> stats
      this._tap(iBadge, () => this.openHeroStats(cid), { immediate: true });
      card.appendChild(iBadge);
      card.appendChild(this._charLevelBlock(cid));      // level + XP-balk + upgrade + stats
      const btn = document.createElement('button'); btn.className = 'shop-buy';
      if (equipped) { btn.classList.add('equipped'); btn.textContent = t('equipped'); }
      else { btn.classList.add('equip'); btn.textContent = t('equip'); this._tap(btn, () => { Storage.equipCharacter(cid); this.renderInventory(); }); }
      card.appendChild(btn);
      // snel van skin wisselen (alleen bij helden waar skins voor bestaan)
      if (skinsFor(cid).length) {
        const nOwned = skinsFor(cid).filter((id) => Storage.ownsSkin(id)).length;
        const sBtn = document.createElement('button');
        sBtn.className = 'shop-buy skin-btn';
        sBtn.innerHTML = t('skin_btn') + (nOwned ? ' <b>' + nOwned + '</b>' : '');
        this._tap(sBtn, () => this.openSkinPicker(cid));
        card.appendChild(sBtn);
      }
      grid.appendChild(card);
    });
  },
  /* Skin-kiezer: toont de standaard-look + alle skins van DEZE held die je hebt gekocht.
     Niet-gekochte skins staan hier bewust niet — die koop je in de shop. */
  openSkinPicker(cid) {
    const c = CHARACTERS[cid]; if (!c) return;
    let sc = document.getElementById('skin-picker');
    if (!sc) {
      sc = document.createElement('div'); sc.id = 'skin-picker'; sc.className = 'overlay hidden';
      sc.innerHTML =
        '<div class="overlay-box skin-pick-box">' +
          '<button class="corner-back" id="btn-skin-pick-back" aria-label="Back"><svg class="ic"><use href="#ic-undo"/></svg></button>' +
          '<h2 class="screen-title" id="sp-name"></h2>' +
          '<div id="sp-grid" class="sp-grid"></div>' +
          '<p id="sp-hint" class="screen-sub hidden"></p>' +
        '</div>';
      document.body.appendChild(sc);
    }
    document.getElementById('btn-skin-pick-back').onclick = () => sc.classList.add('hidden');
    sc.onclick = (e) => { if (e.target === sc) sc.classList.add('hidden'); };
    document.getElementById('sp-name').textContent = c.name;

    const grid = document.getElementById('sp-grid');
    grid.innerHTML = '';
    this._charAnims = this._charAnims || [];
    const cur = Storage.skinFor(cid);
    const mine = skinsFor(cid).filter((id) => Storage.ownsSkin(id));

    [null].concat(mine).forEach((sid) => {
      const sk = sid ? SKINS[sid] : null;
      const rar = sk ? (SKIN_RARITY[sk.rarity] || {}) : null;
      const on = (cur || null) === sid;
      const rend = charRender(cid, sid);

      const cell = document.createElement('div');
      cell.className = 'sp-cell' + (on ? ' on' : '');
      if (rar) cell.style.borderColor = rar.col;
      cell.appendChild(this._charCanvas(rend.palette, {
        weapon: c.forcedMelee || c.startMelee || 'bat', build: rend.build, hair: rend.hair,
        hat: Storage.data.equippedHat, outfit: rend.outfit,
      }));
      const nm = document.createElement('div'); nm.className = 'sp-nm';
      nm.textContent = sk ? sk.name : tl('Standaard');
      if (rar) nm.style.color = rar.col;
      cell.appendChild(nm);
      this._tap(cell, () => {
        Storage.equipSkin(cid, sid);
        if (window.Sfx) Sfx.play('pickup');
        this.openSkinPicker(cid);      // meteen zichtbaar welke nu aan staat
        this.renderInventory();        // en de kaart eronder bijwerken
      }, { immediate: true });
      grid.appendChild(cell);
    });

    const hint = document.getElementById('sp-hint');
    if (!mine.length) {
      hint.textContent = tl('Je hebt nog geen skins voor deze held. Koop ze in de shop bij Skins.');
      hint.classList.remove('hidden');
    } else hint.classList.add('hidden');

    sc.classList.remove('hidden');
  },

  // stats-venster van een hero (klik op het plaatje in de inventory)
  openHeroStats(cid) {
    const c = CHARACTERS[cid]; if (!c) return;
    let sc = document.getElementById('hero-stats');
    if (!sc) {
      sc = document.createElement('div'); sc.id = 'hero-stats'; sc.className = 'overlay hidden';
      sc.innerHTML =
        '<div class="overlay-box hero-stats-box">' +
          '<button class="corner-back" id="btn-hero-stats-back" aria-label="Back"><svg class="ic"><use href="#ic-undo"/></svg></button>' +
          '<h2 class="screen-title" id="hs-name"></h2>' +
          '<div id="hs-sprite" class="hs-sprite"></div>' +
          '<div id="hs-stats" class="hs-stats"></div>' +
          '<div id="hs-ability" class="hs-ability"></div>' +
        '</div>';
      document.body.appendChild(sc);
    }
    const st = (Storage.charStats ? Storage.charStats(cid) : { hpBonus: 0, speedMul: 1 });
    const lvl = (Storage.charLevelOf ? Storage.charLevelOf(cid) : 1);
    const weapon = c.forcedMelee || c.startMelee || 'bat';
    const baseDmg = (typeof WEAPONS !== 'undefined' && WEAPONS[weapon] && WEAPONS[weapon].damage) || 20;
    const baseHp = c.maxHp, hpBonus = st.hpBonus || 0;                 // basis + level-bonus apart tonen
    const dmg = Math.round(baseDmg * (c.meleeMul || 1));
    const baseSpeed = Math.round((c.speedMul || 1) * 100);
    const speedBonus = Math.round((c.speedMul || 1) * (st.speedMul || 1) * 100) - baseSpeed;
    const bonus = (n) => n > 0 ? ' <span class="hs-bonus">+' + n + '</span>' : '';
    const ab = (typeof ABILITIES !== 'undefined' && ABILITIES[c.ability]) ? ABILITIES[c.ability] : null;
    const chargeS = (c.abChargeS != null) ? c.abChargeS : ((typeof ABILITY_CHARGE_MS !== 'undefined') ? Math.round(ABILITY_CHARGE_MS * (c.abChargeMul || 1) / 1000) : 0);   // oplaadtijd van de ability
    const jumpVal = (typeof charJumpOf === 'function') ? Math.round(charJumpOf(c) * 100) : 100;   // relatieve spronghoogte (100 = normaal)
    document.getElementById('hs-name').innerHTML = this._esc(c.name) + ' <span class="hs-lvl">Lv ' + lvl + '</span>';
    const spr = document.getElementById('hs-sprite'); spr.innerHTML = '';
    spr.appendChild(this._charCanvas(c.palette, { weapon, build: c.build, hair: c.hair, hat: Storage.data.equippedHat, outfit: c.outfit }));
    document.getElementById('hs-stats').innerHTML =
      '<div class="hs-row"><span>' + this._ic('heart') + ' HP</span><b>' + baseHp + bonus(hpBonus) + '</b></div>' +
      '<div class="hs-row"><span>' + this._ic('swords') + ' Damage</span><b>' + dmg + '</b></div>' +
      '<div class="hs-row"><span>' + this._ic('run') + ' Speed</span><b>' + baseSpeed + bonus(speedBonus) + '</b></div>' +
      '<div class="hs-row"><span>' + this._ic('arrow-u') + ' ' + tl('Sprong') + '</span><b>' + jumpVal + '</b></div>' +
      (ab ? '<div class="hs-row"><span>' + this._ic('fire') + ' ' + tl('Oplaadtijd') + '</span><b>' + chargeS + 's</b></div>' : '');
    document.getElementById('hs-ability').innerHTML = ab
      ? '<div class="hs-ab-title">' + this._ic('fire') + ' ' + tl('Speciale ability') + ': <b>' + this._esc(ab.name) + '</b></div>' +
        '<div class="hs-ab-desc">' + this._esc(ab.desc) + '</div>'
      : '';
    document.getElementById('btn-hero-stats-back').onclick = () => sc.classList.add('hidden');
    sc.onclick = (e) => { if (e.target === sc) sc.classList.add('hidden'); };
    sc.classList.remove('hidden');
  },
  // level-blok voor een character-kaart: Lv x/20, XP-balk, upgrade-knop + stat-bonussen
  _charLevelBlock(cid) {
    const lvl = Storage.charLevelOf(cid), maxed = lvl >= CHAR_MAX_LEVEL;
    const wrap = document.createElement('div'); wrap.className = 'char-lvl';
    // kop: Lv x/20 + stat-bonussen
    const st = Storage.charStats(cid);
    const bonus = [];
    if (st.hpBonus > 0) bonus.push('+' + st.hpBonus + ' HP');
    if (st.speedMul > 1) bonus.push('+' + Math.round((st.speedMul - 1) * 100) + '% ' + tl('snelheid'));
    if (st.abilityDurMul > 1 && CHARACTERS[cid].ability) bonus.push('+' + Math.round((st.abilityDurMul - 1) * 100) + '% ability');
    wrap.innerHTML = '<div class="char-lvl-top"><span class="char-lvl-num">Lv ' + lvl + '<span class="char-lvl-max">/' + CHAR_MAX_LEVEL + '</span></span>' +
      (bonus.length ? '<span class="char-lvl-bonus">' + bonus.join(' · ') + '</span>' : '') + '</div>';
    // XP-balk
    const need = maxed ? 1 : charXpNeeded(lvl), cur = maxed ? 1 : Storage.charXpOf(cid);
    const barBg = document.createElement('div'); barBg.className = 'char-xp-bar';
    const fill = document.createElement('div'); fill.className = 'char-xp-fill'; fill.style.width = Math.round(Math.min(1, cur / need) * 100) + '%';
    barBg.appendChild(fill);
    const xpLbl = document.createElement('span'); xpLbl.className = 'char-xp-lbl';
    xpLbl.textContent = maxed ? 'MAX' : (cur + ' / ' + need + ' XP');
    barBg.appendChild(xpLbl); wrap.appendChild(barBg);
    // upgrade-knop
    const up = document.createElement('button'); up.className = 'char-upgrade';
    if (maxed) { up.classList.add('maxed'); up.textContent = 'MAX LEVEL'; up.disabled = true; }
    else if (!Storage.charXpFull(cid)) { up.classList.add('locked'); up.textContent = tl('XP-balk vullen'); up.disabled = true; }
    else {
      const cost = Storage.charUpgradeCost(cid), afford = (Storage.data.coins || 0) >= cost;
      up.classList.add(afford ? 'ready' : 'cant');
      up.innerHTML = 'UPGRADE — ' + cost + ' <span class="coin-dot">●</span>';
      if (afford) this._tap(up, () => { if (Storage.upgradeChar(cid)) { if (window.Sfx) Sfx.play('pickup'); this.syncCoins && this.syncCoins(); this.renderInventory(); } });
      else up.disabled = true;
    }
    wrap.appendChild(up);
    return wrap;
  },
  renderOwnedHats(grid) {
    grid.innerHTML = '';
    HAT_ORDER.forEach((hid) => {
      if (!Storage.ownsHat(hid)) return;
      const h = HATS[hid]; const equipped = Storage.data.equippedHat === hid;
      const card = document.createElement('div'); card.className = 'shop-card owned';
      card.appendChild(this._hatCanvas(hid));                       // grote 2.5D hoed-buste
      const info = document.createElement('div'); info.innerHTML = '<div class="w-name">' + h.name + '</div>';
      card.appendChild(info);
      const btn = document.createElement('button'); btn.className = 'shop-buy';
      if (equipped) { btn.classList.add('equipped'); btn.textContent = t('equipped'); }
      else { btn.classList.add('equip'); btn.textContent = hid === 'none' ? t('take_off') : t('put_on'); this._tap(btn, () => { Storage.equipHat(hid); this.renderInventory(); }); }
      card.appendChild(btn); grid.appendChild(card);
    });
  },

  // ---------- LOADOUT-BALK (in de match) ----------
  renderLoadoutBar() {
    const bar = document.getElementById('loadout-bar'); if (!bar) return;
    if (typeof Game === 'undefined' || Game.state !== 'versus') { bar.classList.add('hidden'); return; }   // alleen tijdens een 1v1-potje (niet in menu's/training)
    const lo = Storage.loadout();
    const slots = bar.querySelectorAll('.loadout-slot');
    slots.forEach((slot, i) => {
      const id = lo[i];
      if (!id) { slot.classList.add('empty'); slot.dataset.pu = ''; slot.innerHTML = ''; slot.disabled = true; return; }
      const pu = SHOP_POWERUPS[id]; const n = Storage.powerupCount(id);
      const usedThisMatch = !!(Game.vs && Game.vs._usedPU && Game.vs._usedPU[id]);   // deze match al ingezet -> op (max 1x)
      const off = n <= 0 || usedThisMatch;
      slot.classList.remove('empty'); slot.dataset.pu = id; slot.disabled = off;
      slot.classList.toggle('depleted', off);
      slot.classList.toggle('used', usedThisMatch);
      slot.innerHTML = '';
      const cv = document.createElement('canvas'); cv.width = 30; cv.height = 30; cv.className = 'lo-ico';
      this._puIcon(cv, pu.kind);
      const nEl = document.createElement('span'); nEl.className = 'lo-n'; nEl.textContent = n;
      slot.appendChild(cv); slot.appendChild(nEl);
      // controller gekoppeld: toon met welke D-pad-richting je 'm inzet (boven ↑ / midden → / onder ↓)
      if (typeof Input !== 'undefined' && Input.padConnected) {
        const key = document.createElement('span'); key.className = 'lo-key';
        key.textContent = ['↑', '→', '↓'][i] || '';
        slot.appendChild(key);
      }
    });
    bar.classList.toggle('hidden', lo.length === 0);
  },

  // ---------- ABILITY-VLAM (boven de melee-knop) ----------
  renderAbilityBtn() {
    const btn = document.getElementById('ability-btn'); if (!btn) return;
    const p = Game.player;
    if (!p || !p.ability || (Game.state !== 'versus' && Game.state !== 'training')) { btn.classList.add('hidden'); return; }
    btn.classList.remove('hidden');
    // Tempelbewaker met vallen-in-de-hand: knop wordt een "plaats val"-knop met resterend aantal
    if (p._trapCharges > 0) {
      btn.classList.add('ready');
      this._drawTrapButton(document.getElementById('ability-ic'), p._trapCharges);
      return;
    }
    const ready = (p.abCharge || 0) >= 1;
    btn.classList.toggle('ready', ready);
    this._drawAbilityFlame(document.getElementById('ability-ic'), p.ability, p.abCharge || 0, ready);
  },
  // vallen-knop: teken een val + het aantal dat je nog kunt plaatsen
  _drawTrapButton(cv, n) {
    if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H * 0.52;
    ctx.clearRect(0, 0, W, H);
    const px = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    px('#5a4630', cx - 11, cy, 22, 5);                                  // houten voetplaat
    px('#3f3020', cx - 11, cy, 22, 1);
    for (let i = -9; i <= 8; i += 4) px('#e8edf2', cx + i, cy - 5, 2, 4);   // metalen tanden
    px('#8a929c', cx - 11, cy - 1, 22, 1);
    ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('x' + n, cx, H * 0.2);                                 // resterend aantal bovenin
  },
  _drawAbilityFlame(cv, ability, charge, ready) {
    if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2;
    ctx.clearRect(0, 0, W, H);
    const flame = () => { ctx.beginPath(); ctx.moveTo(cx, H * 0.08); ctx.quadraticCurveTo(W * 0.92, H * 0.52, cx, H * 0.95); ctx.quadraticCurveTo(W * 0.08, H * 0.52, cx, H * 0.08); ctx.closePath(); };
    flame(); ctx.fillStyle = '#33241a'; ctx.fill();                         // lege (donkere) vlam
    ctx.save(); flame(); ctx.clip();                                        // vullen van onderaf op basis van charge
    const fy = H * (1 - Math.max(0, Math.min(1, charge)));
    const g = ctx.createLinearGradient(0, H, 0, 0); g.addColorStop(0, '#ffd24a'); g.addColorStop(0.5, '#ff8a2a'); g.addColorStop(1, '#ff5a2a');
    ctx.fillStyle = g; ctx.fillRect(0, fy, W, H - fy); ctx.restore();
    flame(); ctx.lineWidth = 1.6; ctx.strokeStyle = ready ? '#fff0a0' : '#6a4a30'; ctx.stroke();
    this._drawAbilityIcon(ctx, ability, cx, H * 0.58, ready || charge > 0.55);
  },
  _drawAbilityIcon(ctx, ability, cx, cy, bright) {
    const c = bright ? '#ffffff' : '#e8d2b8';
    const px = (x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    if (ability === 'heal') { px(cx - 1, cy - 5, 3, 11); px(cx - 5, cy - 1, 11, 3); }
    else if (ability === 'highjump') { px(cx - 4, cy + 1, 3, 3); px(cx - 1, cy - 2, 3, 3); px(cx + 2, cy + 1, 3, 3); }
    else if (ability === 'triplejump') { for (let k = 0; k < 2; k++) { const y = cy - 3 + k * 5; px(cx - 4, y + 1, 3, 2); px(cx - 1, y - 1, 3, 2); px(cx + 2, y + 1, 3, 2); } }
    else if (ability === 'zapdash') { px(cx, cy - 6, 3, 5); px(cx - 2, cy - 1, 5, 2); px(cx - 1, cy + 1, 3, 5); }
    else if (ability === 'fireaura10') { px(cx - 2, cy - 4, 4, 8); px(cx - 3, cy - 1, 6, 5); }
    else if (ability === 'earthquake') { for (let k = 0; k < 3; k++) { const y = cy - 4 + k * 4; px(cx - 6, y, 4, 2); px(cx - 1, y + 1, 4, 2); px(cx + 3, y, 3, 2); } }
    else if (ability === 'knife') { px(cx - 3, cy + 3, 3, 2); for (let k = 0; k < 5; k++) px(cx - 1 + k, cy + 2 - k, 2, 2); }
    else { ctx.fillStyle = c; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ability === 'ultrarage' ? '4×' : '2×', cx, cy); }   // rage
  },

  // ---------- KISTEN (op het hoofdmenu) ----------
  renderChests() {
    const bar = document.getElementById('chest-bar'); if (!bar) return;
    const chests = Storage.chests();
    bar.querySelectorAll('.chest-slot').forEach((slot, i) => {
      const c = chests[i];
      slot.innerHTML = '';
      if (!c) { slot.className = 'chest-slot empty'; slot.disabled = true; slot.style.borderColor = ''; slot.innerHTML = '<span class="chest-lbl">' + I18N.t('empty') + '</span>'; return; }
      const t = CHEST_TYPES[c.r], ready = Storage.chestReady(i);
      slot.className = 'chest-slot' + (ready ? ' ready' : '') + (c.u <= 0 ? ' idle' : ''); slot.disabled = false;
      slot.style.borderColor = t.col;
      const cv = document.createElement('canvas'); cv.width = 48; cv.height = 40; cv.className = 'chest-ico';
      this._drawChestIcon(cv, c.r, ready);
      const lbl = document.createElement('span'); lbl.className = 'chest-lbl';
      lbl.textContent = ready ? I18N.t('collect_ready') : (c.u <= 0 ? t.name : this._fmtChestTime(Storage.chestSecondsLeft(i)));
      slot.appendChild(cv); slot.appendChild(lbl);
      // bezig met openen -> robijn-knop om de wachttijd te skippen
      if (!ready && c.u > 0) {
        const cost = Storage.chestSkipCost(i);
        const skip = document.createElement('span'); skip.className = 'chest-skip'; skip.setAttribute('role', 'button');
        skip.innerHTML = '<svg class="px-icon" viewBox="0 0 8 8" width="11" height="11" shape-rendering="crispEdges"><rect x="2" y="1" width="4" height="1" fill="#ff9db0"/><rect x="1" y="2" width="6" height="1" fill="#f24d68"/><rect x="1" y="3" width="6" height="1" fill="#e0364f"/><rect x="2" y="4" width="4" height="1" fill="#c72740"/><rect x="3" y="5" width="2" height="1" fill="#a81e33"/></svg> ' + cost;
        skip.onclick = (e) => { e.stopPropagation(); this.chestSkip(i); };
        slot.appendChild(skip);
      }
    });
  },
  chestSkip(i) {
    const cost = Storage.chestSkipCost(i);
    if (Storage.rubies() < cost) {   // te weinig robijnen -> korte schud + foutgeluid
      const slot = document.querySelector('.chest-slot[data-chest="' + i + '"]');
      if (slot) { slot.classList.remove('shake'); void slot.offsetWidth; slot.classList.add('shake'); }
      if (window.Sfx) Sfx.play('roundlose');
      return;
    }
    if (Storage.skipChest(i)) {
      if (window.Sfx) Sfx.play('coin');
      this.syncCoins(); this.renderChests();
    }
  },
  _fmtChestTime(s) {
    if (s == null || s < 0) return 'Open';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return h + 'u' + (m < 10 ? '0' : '') + m + 'm';
    if (m > 0) return m + 'm' + (sec < 10 ? '0' : '') + sec + 's';
    return sec + 's';
  },
  // rarity-kist. lidOpen 0..1 = deksel dicht..helemaal open (deksel wordt los getekend en scharniert omhoog)
  _chestArt(ctx, rarity, lidOpen) {
    const t = CHEST_TYPES[rarity] || CHEST_TYPES.common;
    const open = Math.max(0, lidOpen || 0);
    const px = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    // ---- onderkant (body) ----
    px('rgba(0,0,0,0.35)', -13, 7, 26, 3);          // grondschaduw
    px(t.col, -13, -2, 26, 12);                     // body
    px('rgba(255,255,255,0.14)', -13, -2, 26, 1);   // bovenrand-highlight
    px(t.band, -13, 0, 26, 2);                      // gouden band op de body
    px('#2a1c08', -3, 3, 6, 5); px('#ffd24a', -1, 5, 2, 2);   // slot op de body-voorkant
    // ---- binnenkant + gloed die uit de kist komt (alleen als hij opengaat) ----
    if (open > 0.03) {
      px('#120c04', -11, -2, 22, 3);                // donkere binnenrand
      ctx.save();
      const gA = Math.min(1, open);
      const g = ctx.createRadialGradient(0, -2, 1, 0, -2, 24);
      g.addColorStop(0, '#fff8d0'); g.addColorStop(0.45, t.band); g.addColorStop(1, 'rgba(255,210,74,0)');
      ctx.globalAlpha = gA; ctx.fillStyle = g; ctx.fillRect(-24, -28, 48, 30);
      ctx.globalAlpha = gA * 0.5; ctx.fillStyle = '#fff2b0';   // lichtstralen omhoog
      for (let i = -2; i <= 2; i++) { ctx.save(); ctx.rotate(i * 0.22); ctx.fillRect(-1, -26, 2, 24); ctx.restore(); }
      ctx.restore();
    }
    // ---- deksel (los, scharniert omhoog + kantelt naar achteren) ----
    ctx.save();
    ctx.translate(0, -2 - open * 11);               // omhoog van de body af
    ctx.scale(1, 1 - open * 0.5);                   // verkort = kantelt naar achteren
    ctx.rotate(open * 0.1);                          // klein tikje kanteling
    px(t.col, -14, -8, 28, 8);                      // deksel-body
    px('rgba(255,255,255,0.28)', -14, -8, 28, 2);   // highlight bovenop
    px(t.band, -14, -3, 28, 2);                     // gouden band op het deksel
    px(t.band, -2, -8, 4, 8);                       // verticale band op het deksel
    px('#3a2a10', -3, -2, 6, 2);                    // klepje aan de voorrand van het deksel
    ctx.restore();
  },
  _drawChestIcon(canvas, rarity, ready) {
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (ready) { const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 2, canvas.width / 2, canvas.height / 2, 22); g.addColorStop(0, (CHEST_TYPES[rarity] || {}).band || '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.globalAlpha = 0.65; ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2 + 3); this._chestArt(ctx, rarity); ctx.restore();
  },
  chestClick(i) {
    const c = Storage.chests()[i]; if (!c) return;
    if (window.Sfx) Sfx.play('click');
    if (Storage.chestReady(i)) { const rw = Storage.collectChest(i); this.renderChests(); if (rw) this.showChestRewards(rw); }
    else if (c.u <= 0) { Storage.startChest(i); this.renderChests(); }   // tik = openen (timer start)
    // bezig met openen: laat de timer gewoon lopen
  },
  showChestRewards(rw) {
    const list = [{ type: 'chestopen', rarity: rw.rarity }];   // eerst de openings-animatie
    list.push({ type: 'earn', coins: rw.gold, xp: rw.xp, rubies: rw.rubies || 0 });
    for (const id in rw.pus) list.push({ type: 'pu', id, n: rw.pus[id] });
    for (const k in (rw.mats || {})) list.push({ type: 'mat', id: k, n: rw.mats[k] });
    list.push(...this._levelUpRewards());   // kist-xp kan je laten levelen (evt. mijlpaal-kist)
    this.showRewards(list);
  },
  _startChestTimer() { if (this._chestIv) return; this._chestIv = setInterval(() => this.renderChests(), 1000); },
  _stopChestTimer() { if (this._chestIv) { clearInterval(this._chestIv); this._chestIv = 0; } },

  renderWeaponCards() {
    const grid = this.el.shopGrid;

    WEAPON_ORDER.forEach((wid) => {
      const w = WEAPONS[wid];
      const owned = Storage.ownsWeapon(wid);
      const equipped = Storage.isEquipped(wid);

      const card = document.createElement('div');
      card.className = 'shop-card' + (owned ? ' owned' : '');

      const canvas = document.createElement('canvas');
      canvas.width = 110; canvas.height = 56;
      const cctx = canvas.getContext('2d');
      cctx.imageSmoothingEnabled = false;
      Sprites.drawWeaponIcon(cctx, wid, 2);

      const slot = w.type === 'melee' ? 'MELEE' : tl('VUURWAPEN');
      const dps = w.type === 'melee'
        ? `${tl('Schade')} <b>${w.damage}</b> · Melee`
        : `${tl('Schade')} <b>${w.damage}</b> · ${Math.round(60000 / w.cooldown)}/min`;

      const info = document.createElement('div');
      info.innerHTML = `<div class="w-name">${w.name} <span class="w-slot">${slot}</span></div>
        <div class="w-stats">${dps}<br>${w.desc}</div>`;

      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      if (equipped) {
        btn.classList.add('equipped'); btn.textContent = t('equipped');
      } else if (owned) {
        btn.classList.add('equip'); btn.textContent = t('equip');
        btn.onclick = () => { Storage.equipWeapon(wid); this.renderShop(); };
      } else if (Storage.data.coins >= w.cost) {
        btn.classList.add('buy'); btn.textContent = t('buy') + ` — ${w.cost} ●`;
        btn.onclick = () => {
          if (Storage.buyWeapon(wid)) { Storage.equipWeapon(wid); this.renderShop(); }
        };
      } else {
        btn.classList.add('cant'); btn.textContent = `${w.cost} ● ${t('too_few')}`;
      }

      card.appendChild(canvas);
      card.appendChild(info);
      card.appendChild(btn);
      grid.appendChild(card);
    });

    // ---- kogels bijkopen ----
    const aCard = document.createElement('div');
    aCard.className = 'shop-card owned';
    const aCanvas = document.createElement('canvas');
    aCanvas.width = 110; aCanvas.height = 56;
    const actx = aCanvas.getContext('2d');
    actx.imageSmoothingEnabled = false;
    Sprites.drawAmmoBox(actx, 55, 42, 0);
    Sprites.drawAmmoBox(actx, 40, 42, 1.5);
    Sprites.drawAmmoBox(actx, 70, 42, 3);
    const aInfo = document.createElement('div');
    aInfo.innerHTML = `<div class="w-name">Munitie <span class="w-slot">VOORRAAD</span></div>
      <div class="w-stats">${tl('Je hebt nu ')}<b>${Storage.data.ammo}</b> / ${AMMO_MAX} ${tl('kogels')}<br>+${AMMO_PACK.amount} ${tl('kogels per koop')}</div>`;
    const aBtn = document.createElement('button');
    aBtn.className = 'shop-buy';
    if (Storage.data.ammo >= AMMO_MAX) {
      aBtn.classList.add('cant'); aBtn.textContent = 'VOORRAAD VOL';
    } else if (Storage.data.coins >= AMMO_PACK.cost) {
      aBtn.classList.add('buy'); aBtn.textContent = t('buy') + ` +${AMMO_PACK.amount} — ${AMMO_PACK.cost} ●`;
      aBtn.onclick = () => { if (Storage.buyAmmo()) this.renderShop(); };
    } else {
      aBtn.classList.add('cant'); aBtn.textContent = `${AMMO_PACK.cost} ● ${t('too_few')}`;
    }
    aCard.appendChild(aCanvas);
    aCard.appendChild(aInfo);
    aCard.appendChild(aBtn);
    grid.appendChild(aCard);

    // ---- raketten bijkopen (alleen met Rocket Launcher) ----
    if (Storage.ownsWeapon('rocket')) {
      const rCard = document.createElement('div');
      rCard.className = 'shop-card owned';
      const rCanvas = document.createElement('canvas');
      rCanvas.width = 110; rCanvas.height = 56;
      const rctx = rCanvas.getContext('2d');
      rctx.imageSmoothingEnabled = false;
      Sprites.drawRocketPickup(rctx, 55, 40, 0);
      const rInfo = document.createElement('div');
      rInfo.innerHTML = `<div class="w-name">Raketten <span class="w-slot">RPG</span></div>
        <div class="w-stats">${tl('Je hebt nu ')}<b>${Storage.data.rockets}</b> ${tl('raketten')}<br>${tl('krachtig & explosief (AoE)')}</div>`;
      const rBtn = document.createElement('button');
      rBtn.className = 'shop-buy';
      if (Storage.data.coins >= ROCKET_COST) {
        rBtn.classList.add('buy'); rBtn.textContent = t('buy') + ` +1 — ${ROCKET_COST} ●`;
        rBtn.onclick = () => { if (Storage.buyRocket()) this.renderShop(); };
      } else {
        rBtn.classList.add('cant'); rBtn.textContent = `${ROCKET_COST} ● ${t('too_few')}`;
      }
      rCard.appendChild(rCanvas);
      rCard.appendChild(rInfo);
      rCard.appendChild(rBtn);
      grid.appendChild(rCard);
    }
  },

  // ---------- CHARACTERS-tab ----------
  renderCharCards() {
    const grid = this.el.shopGrid;
    const myLvl = playerLevel(Storage.data.xp || 0);

    CHARACTER_ORDER.forEach((cid) => {
      const c = CHARACTERS[cid];
      const owned = Storage.ownsCharacter(cid);
      const equipped = Storage.data.equippedCharacter === cid;

      const card = document.createElement('div');
      card.className = 'shop-card' + (owned ? ' owned' : '');

      // preview-tekening van het character (2.5D met grondschaduw + idle, net als in de game)
      const canvas = this._charCanvas(c.palette, {
        weapon: c.forcedMelee || 'bat', build: c.build, hair: c.hair, hat: Storage.data.equippedHat, outfit: c.outfit,
      });

      // alleen de naam op de kaart — alle stats + ability zitten achter de "i" (net als in de inventaris)
      const info = document.createElement('div');
      info.innerHTML = `<div class="w-name">${c.name}</div>`;

      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      if (equipped) {
        btn.classList.add('equipped'); btn.textContent = t('equipped');
      } else if (owned) {
        btn.classList.add('equip'); btn.textContent = t('equip');
        btn.onclick = () => { Storage.equipCharacter(cid); this.renderShop(); };
      } else if (c.journeyOnly) {
        card.classList.add('locked'); btn.classList.add('cant'); btn.innerHTML = this._ic('lock') + ' Journey';
      } else if (typeof c.rank === 'number') {                     // vrij te spelen door een rank te bereiken
        card.classList.add('locked'); btn.classList.add('cant');
        const rk = RANKS[c.rank] || {};
        btn.innerHTML = this._ic('lock') + ' <span style="color:' + (rk.col || '#fff') + '">' + this._esc(rk.name || ('Rank ' + c.rank)) + '</span>';
        const hint = document.createElement('div'); hint.className = 'w-unlock';
        hint.innerHTML = tl('Vrij te spelen bij') + ' <b style="color:' + (rk.col || '#fff') + '">' + this._esc(rk.name || '') + '</b>';
        info.appendChild(hint);
      } else if (c.costRubies) {                                   // met robijnen te koop (◆)
        if (Storage.rubies() >= c.costRubies) {
          btn.classList.add('buy'); btn.textContent = t('buy') + ` — ${c.costRubies} ◆`;
          btn.onclick = () => { if (Storage.buyCharacter(cid)) { Storage.equipCharacter(cid); if (window.Sfx) Sfx.play('pickup'); this.renderShop(); } };
        } else {
          btn.classList.add('cant'); btn.textContent = `${c.costRubies} ◆ ${t('too_few')}`;
        }
      } else if (Storage.data.coins >= c.cost) {
        btn.classList.add('buy'); btn.textContent = t('buy') + ` — ${c.cost} ●`;
        btn.onclick = () => { if (Storage.buyCharacter(cid)) { Storage.equipCharacter(cid); this.renderShop(); } };
      } else {
        btn.classList.add('cant'); btn.textContent = `${c.cost} ● ${t('too_few')}`;
      }

      card.appendChild(canvas);
      card.appendChild(info);
      // op het plaatje tikken of op de "i" -> stats-venster van de hero (zelfde als in de inventaris)
      canvas.style.cursor = 'pointer';
      this._tap(canvas, () => this.openHeroStats(cid), { immediate: true });
      const iBadge = document.createElement('span'); iBadge.className = 'hero-info-i'; iBadge.textContent = 'i';
      this._tap(iBadge, () => this.openHeroStats(cid), { immediate: true });
      card.appendChild(iBadge);
      card.appendChild(btn);
      grid.appendChild(card);
    });
  },

  /* ---------- SKINS-tab ----------
     Per held: eerst de standaard-look, daarna z'n skins. Alleen helden die je bezit,
     zodat de tab niet volloopt met dingen waar je niets mee kunt. */
  renderSkinCards() {
    const grid = this.el.shopGrid;
    const owned = CHARACTER_ORDER.filter((cid) => Storage.ownsCharacter(cid) && skinsFor(cid).length);

    if (!owned.length) {
      const empty = document.createElement('div');
      empty.className = 'shop-empty';
      empty.textContent = tl('Koop eerst een held — daarna kun je hier skins voor hem kopen.');
      grid.appendChild(empty);
      return;
    }

    owned.forEach((cid) => {
      const c = CHARACTERS[cid];
      const cur = Storage.skinFor(cid);

      // standaard-look = altijd gratis terug te zetten
      [null].concat(skinsFor(cid)).forEach((sid) => {
        const sk = sid ? SKINS[sid] : null;
        const rar = sk ? (SKIN_RARITY[sk.rarity] || {}) : null;
        const has = !sid || Storage.ownsSkin(sid);
        const on = (cur || null) === sid;

        const card = document.createElement('div');
        card.className = 'shop-card' + (has ? ' owned' : '');
        if (rar) card.style.borderColor = rar.col;

        const rend = charRender(cid, sid);
        card.appendChild(this._charCanvas(rend.palette, {
          weapon: c.forcedMelee || 'bat', build: rend.build, hair: rend.hair,
          hat: Storage.data.equippedHat, outfit: rend.outfit,
        }));

        // de shop is een carrousel (geen rijen), dus de held moet op de kaart zelf staan
        const info = document.createElement('div');
        info.innerHTML = '<div class="w-name">' + this._esc(sk ? sk.name : tl('Standaard')) + '</div>'
          + '<div class="w-stats">' + this._esc(c.name)
          + (rar ? ' · <span style="color:' + rar.col + '">' + this._esc(rar.name) + '</span>' : '') + '</div>';
        card.appendChild(info);

        const btn = document.createElement('button');
        btn.className = 'shop-buy';
        if (on) {
          btn.classList.add('equipped'); btn.textContent = t('equipped');
        } else if (has) {
          btn.classList.add('equip'); btn.textContent = t('equip');
          btn.onclick = () => { Storage.equipSkin(cid, sid); if (window.Sfx) Sfx.play('pickup'); this.renderShop(); };
        } else {
          const cost = skinCost(sid);
          if (Storage.rubies() >= cost) {
            btn.classList.add('buy'); btn.textContent = t('buy') + ' — ' + cost + ' ◆';
            btn.onclick = () => {
              if (Storage.buySkin(sid)) { Storage.equipSkin(cid, sid); if (window.Sfx) Sfx.play('pickup'); this.renderShop(); }
            };
          } else {
            btn.classList.add('cant'); btn.textContent = cost + ' ◆ ' + t('too_few');
          }
        }
        card.appendChild(btn);
        grid.appendChild(card);
      });
    });
  },

  // ---------- HOEDEN-tab ----------
  renderHatCards() {
    const grid = this.el.shopGrid;
    const cc = CHARACTERS[Storage.data.equippedCharacter] || CHARACTERS.ryan;
    const myLvl = playerLevel(Storage.data.xp || 0);

    HAT_ORDER.forEach((hid) => {
      const h = HATS[hid];
      const owned = Storage.ownsHat(hid);
      const equipped = Storage.data.equippedHat === hid;

      const card = document.createElement('div');
      card.className = 'shop-card' + (owned ? ' owned' : '');

      // preview: de hoed zelf als groot 2.5D-item (buste met de hoed erop)
      const canvas = this._hatCanvas(hid);

      const info = document.createElement('div');
      info.innerHTML = `<div class="w-name">${h.name}</div><div class="w-stats">${h.desc}</div>`;

      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      if (equipped) {
        btn.classList.add('equipped'); btn.textContent = t('equipped');
      } else if (owned) {
        btn.classList.add('equip'); btn.textContent = hid === 'none' ? t('take_off') : t('put_on');
        btn.onclick = () => { Storage.equipHat(hid); this.renderShop(); };
      } else if (h.journeyOnly) {
        card.classList.add('locked'); btn.classList.add('cant'); btn.innerHTML = this._ic('lock') + ' Journey';
      } else if (myLvl < (h.lvl || 0)) {
        card.classList.add('locked'); btn.classList.add('cant'); btn.innerHTML = this._ic('lock') + ' Level ' + h.lvl;
      } else if (Storage.data.coins >= h.cost) {
        btn.classList.add('buy'); btn.textContent = t('buy') + ` — ${h.cost} ●`;
        btn.onclick = () => { if (Storage.buyHat(hid)) { Storage.equipHat(hid); this.renderShop(); } };
      } else {
        btn.classList.add('cant'); btn.textContent = `${h.cost} ● ${t('too_few')}`;
      }

      card.appendChild(canvas);
      card.appendChild(info);
      card.appendChild(btn);
      grid.appendChild(card);
    });
  },

  // ---------- HUD (elke frame) ----------
  updateHUD(game) {
    this.updateTouchIcons();
    const lv = game.level;
    let prog;
    if (lv.arena) {
      prog = game.roundTarget ? Math.max(0, Math.min(1, game.roundKills / game.roundTarget)) : 0;
      this.el.levelName.textContent = 'ARENA';
    } else {
      prog = Math.max(0, Math.min(1, (game.player.x - 60) / (lv.length - 60)));
      this.el.levelName.textContent = 'LEVEL ' + lv.id;
    }
    this.el.progressFill.style.width = (prog * 100) + '%';
    this.el.progressPlayer.style.left = (prog * 100) + '%';
    this.el.healthFill.style.width = (game.player.hp / game.player.maxHp * 100) + '%';
    this.el.coinCount.textContent = game.runCoins;
    // melee-wapen altijd tonen (is altijd beschikbaar)
    this.el.weaponName.textContent = WEAPONS[game.player.meleeId].name;
    // vuurwapen + munitie alleen als er een gun is uitgerust
    if (game.player.rangedId) {
      const rw = WEAPONS[game.player.rangedId];
      this.el.ammoCount.classList.remove('hidden');
      if (rw.ammoType === 'rocket') {
        this.el.ammoNum.textContent = rw.name + '  x' + game.rockets;
        this.el.ammoCount.classList.toggle('low', game.rockets <= 0);
      } else {
        this.el.ammoNum.textContent = rw.name + ' ' + game.ammo;
        this.el.ammoCount.classList.toggle('low', game.ammo <= 10);
      }
    } else {
      this.el.ammoCount.classList.add('hidden');
    }
    this.updateBanner(game);
    this.updateTutorial(game);
  },

  // scherpe status-tekst (objectief / timers / boss) in de DOM
  updateBanner(game) {
    let main = '', sub = '', cls = '', bossFrac = -1;
    const lv = game.level;
    if (game.boss && game.boss.alive) {
      main = lv.balloonBoss ? 'BALLON ZOMBIE' : lv.apeBoss ? 'MEGA ZOMBIE-AAP' : 'MEGA ZOMBIE';
      sub = lv.balloonBoss ? 'spring & schiet de ballon neer!'
        : lv.apeBoss ? (game.boss.enraged ? 'RAZEND! spring weg van de schokgolf!' : 'ontwijk de sprong + spring bij de landing!')
        : 'raak alleen het HOOFD — spring!';
      cls = 'danger';
      bossFrac = Math.max(0, game.boss.hp / game.boss.maxHp);
    } else if (lv.arena) {
      main = 'RONDE ' + game.round; cls = 'good';
      if (game.roundBreak > 0) sub = 'RONDE VOLTOOID! +' + game.roundCfg.bonus + ' ●';
      else sub = 'nog ' + Math.max(0, game.roundTarget - game.roundKills) + ' zombies   •   record: ronde ' + Storage.data.arenaBest;
    } else if (lv.mode === 'horde') {
      const sec = Math.ceil(game.hordeLeft / 1000);
      main = 'OVERLEEF: ' + sec + 's'; cls = sec <= 5 ? 'danger' : '';
    } else {
      const parts = [];
      if (lv.killAll) {
        const rem = game.zombiesRemaining();
        main = rem > 0 ? ('ZOMBIES OVER: ' + rem) : 'NAAR DE FINISH!';
        cls = rem > 0 ? 'danger' : 'good';
      }
      if (lv.midTime && !game.midReached) parts.push('checkpoint: ' + Math.ceil(game.midLeft / 1000) + 's');
      if (lv.mode === 'melee') parts.push('alleen melee');
      sub = parts.join('   •   ');
    }
    if (main || sub) {
      this.el.banner.classList.remove('hidden');
      this.el.bannerMain.textContent = main;
      this.el.bannerMain.className = cls;
      this.el.bannerSub.textContent = sub;
      this.el.bossHpWrap.classList.toggle('hidden', bossFrac < 0);
      if (bossFrac >= 0) this.el.bossHpFill.style.width = (bossFrac * 100) + '%';
    } else {
      this.el.banner.classList.add('hidden');
    }
  },

  updateTutorial(game) {
    const show = game.tutorialMsg && game.time < game.tutorialUntil;
    this.el.tutorialBox.classList.toggle('hidden', !show);
    if (show) this.el.tutorialBox.textContent = game.tutorialMsg;
  },

  showWin(stats) {
    this.el.winKills.textContent = stats.kills;
    this.el.winCoins.textContent = stats.coins;
    this.el.winReplayNote.classList.toggle('hidden', !stats.replay);
    this.show('win');
  },
  showLose(stats) {
    this.el.loseKills.textContent = stats.kills;
    this.el.loseCoins.textContent = stats.coins;
    this.el.loseTitle.textContent = stats.reason === 'time' ? 'NIET BINNEN DE TIJD' : 'DOOD';
    this.show('lose');
  },
};
window.UI = UI;   // zodat window.UI-checks (o.a. in net.js) werken
