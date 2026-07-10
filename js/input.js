/* ============================================================
   INPUT — toetsenbord + touch-knoppen + game controller (Backbone e.d.).
   Exposeert Input.state: { left, right, jump, duck, attack, melee }
   De drie bronnen (toetsenbord / touch / controller) worden per frame
   samengevoegd naar Input.state, zodat ze naast elkaar kunnen werken.
   ============================================================ */

const Input = {
  state: { left: false, right: false, jump: false, duck: false, attack: false, melee: false },
  // 'pressed' = net dit frame ingedrukt (voor sprong 1x trigger)
  jumpPressed: false,

  ACTKEYS: ['left', 'right', 'jump', 'duck', 'attack', 'melee'],
  _kb:    { left: false, right: false, jump: false, duck: false, attack: false, melee: false },
  _touch: { left: false, right: false, jump: false, duck: false, attack: false, melee: false },
  _pad:   { left: false, right: false, jump: false, duck: false, attack: false, melee: false },
  _padPrev: {},        // vorige-frame knopstatus (edge-detectie voor ability + pauze + powerups)
  _pointerKey: {},
  padConnected: false, // is er een game controller gekoppeld? -> touch-knoppen verbergen, D-pad = powerups

  // toetsenbord + touch + controller combineren -> Input.state (+ jump edge-trigger)
  _apply() {
    const wasJump = this.state.jump;
    for (const k of this.ACTKEYS) this.state[k] = this._kb[k] || this._touch[k] || this._pad[k];
    if (this.state.jump && !wasJump) this.jumpPressed = true;
  },

  init() {
    const keyMap = {
      'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
      'ArrowRight': 'right', 'd': 'right', 'D': 'right',
      'ArrowUp': 'jump', 'w': 'jump', 'W': 'jump', ' ': 'jump',
      'ArrowDown': 'duck', 's': 'duck', 'S': 'duck',
      'j': 'attack', 'J': 'attack', 'f': 'attack', 'F': 'attack',
      'k': 'melee', 'K': 'melee', 'e': 'melee', 'E': 'melee',
    };

    window.addEventListener('keydown', (e) => {
      const action = keyMap[e.key];
      if (action) {
        this._kb[action] = true; this._apply();
        if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const action = keyMap[e.key];
      if (action) { this._kb[action] = false; this._apply(); }
    });

    // ---- touch/pointer knoppen (virtuele gamepad) ----
    // Elke vinger wordt los gevolgd en hit-getest tegen de knoppen, zodat je
    // soepel van knop naar knop kunt VEGEN (bv. links -> rechts) en multitouch werkt.
    const buttons = Array.prototype.slice.call(document.querySelectorAll('.tbtn'));

    const keyAt = (x, y) => {
      for (const b of buttons) {
        const r = b.getBoundingClientRect();
        // iets ruimere raakzone (8px) voor een soepel gevoel
        if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) return b.dataset.key;
      }
      return null;
    };
    const recompute = () => {
      const held = {};
      for (const id in this._pointerKey) { const k = this._pointerKey[id]; if (k) held[k] = true; }
      for (const k of this.ACTKEYS) this._touch[k] = !!held[k];
      this._apply();
      // 'pressed'-klasse voor visuele feedback
      for (const b of buttons) b.classList.toggle('pressed', held[b.dataset.key]);
    };

    // alle vingers vrijgeven (vangnet tegen 'blijvende' knoppen)
    const releaseAll = () => {
      if (Object.keys(this._pointerKey).length === 0) return;
      this._pointerKey = {};
      recompute();
    };

    const onDown = (e) => {
      const k = keyAt(e.clientX, e.clientY);
      if (k == null) return;
      e.preventDefault();
      // impliciete pointer-capture loslaten -> window krijgt move/up betrouwbaar binnen
      try { if (e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId); } catch (err) {}
      this._pointerKey[e.pointerId] = k;
      recompute();
    };
    const onMove = (e) => {
      if (!(e.pointerId in this._pointerKey)) return; // alleen vingers die op een knop begonnen
      e.preventDefault();
      const k = keyAt(e.clientX, e.clientY);
      if (k !== this._pointerKey[e.pointerId]) { this._pointerKey[e.pointerId] = k; recompute(); }
    };
    const onUp = (e) => {
      if (!(e.pointerId in this._pointerKey)) return;
      delete this._pointerKey[e.pointerId];
      recompute();
    };

    const tc = document.getElementById('touch-controls');
    tc.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    tc.addEventListener('contextmenu', (e) => e.preventDefault());

    // VANGNET 1: zodra er geen enkele vinger meer op het scherm is, alles vrijgeven.
    const onTouchEnd = (e) => { if (!e.touches || e.touches.length === 0) releaseAll(); };
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // VANGNET 2: app naar de achtergrond of venster verliest focus -> niets laten hangen.
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
    window.addEventListener('blur', () => releaseAll());

    // ---- game controller (Backbone / Xbox / PlayStation via Gamepad API) ----
    window.addEventListener('gamepadconnected', () => { this._setPadConnected(true); });
    window.addEventListener('gamepaddisconnected', () => {
      for (const k of this.ACTKEYS) this._pad[k] = false;
      this._padPrev = {};
      this._apply();
      this._setPadConnected(false);
    });
  },

  // controller aan/uit: touch-knoppen verbergen (behalve ability/powerups/pauze) + loadout-pijltjes verversen
  _setPadConnected(on) {
    if (this.padConnected === on) return;
    this.padConnected = on;
    if (typeof document !== 'undefined' && document.body) document.body.classList.toggle('pad-connected', on);
    if (typeof UI !== 'undefined' && UI.renderLoadoutBar) UI.renderLoadoutBar();   // ↑/→/↓-badges tonen/verbergen
  },

  // Elke frame aanroepen: leest de controller en vertaalt de knoppen naar Input.state.
  // Standaard-mapping (positie-gebaseerd, klopt voor Backbone/Xbox/PS):
  //  linker joystick X = links/rechts · knop 0 (X/Cross) = springen ·
  //  knop 2 (vierkant) of L2 = bukken/schild · knop 1 (rondje) = slaan ·
  //  R2 (7) = schieten/powerup afvuren · L1 (4) = speciale ability · Start (9) = pauze
  pollGamepad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    let gp = null;
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) { if (pads[i] && pads[i].connected) { gp = pads[i]; break; } }
    if (!gp) {
      if (this._pad.left || this._pad.right || this._pad.jump || this._pad.duck || this._pad.attack || this._pad.melee) {
        for (const k of this.ACTKEYS) this._pad[k] = false; this._apply();
      }
      return;
    }
    if (!this.padConnected) this._setPadConnected(true);   // controller actief (voor het geval het connect-event gemist is)
    const btn = (i) => { const b = gp.buttons[i]; return !!b && (b.pressed || b.value > 0.35); };
    const ax = gp.axes && gp.axes.length ? (gp.axes[0] || 0) : 0;
    const DEAD = 0.35;
    // continue acties — bewegen via de joystick (de D-pad is voor de powerups)
    this._pad.left   = ax < -DEAD;                       // linker joystick naar links
    this._pad.right  = ax > DEAD;                        // linker joystick naar rechts
    this._pad.jump   = btn(0);                           // X / Cross = springen
    this._pad.duck   = btn(2) || btn(6);                 // Vierkant of L2 = bukken/schild
    this._pad.melee  = btn(1);                           // Rondje = slaan
    this._pad.attack = btn(7) || btn(5);                 // R2 (of R1) = schieten / powerup afvuren
    this._apply();
    // edge-triggers (1x per druk)
    const rise = (i) => { const now = btn(i); const was = !!this._padPrev[i]; this._padPrev[i] = now; return now && !was; };
    const abL1 = rise(4);                               // L1 = speciale character-ability
    const dUp = rise(12), dRight = rise(15), dDown = rise(13);   // D-pad = powerups uit de loadout (↑=boven, →=midden, ↓=onder)
    const start = rise(9);                              // Start = pauze
    if (typeof Game !== 'undefined') {
      if (abL1 && Game.abilityButton) Game.abilityButton();
      if (Game.deployLoadout) { if (dUp) Game.deployLoadout(0); if (dRight) Game.deployLoadout(1); if (dDown) Game.deployLoadout(2); }
      if (start && Game.togglePause && (Game.state === 'versus' || Game.state === 'training' || Game.state === 'playing')) Game.togglePause();
    }
  },

  // reset 'pressed' flags aan einde van frame
  endFrame() { this.jumpPressed = false; },

  clear() {
    for (const k of this.ACTKEYS) { this.state[k] = this._kb[k] = this._touch[k] = this._pad[k] = false; }
    this.jumpPressed = false;
    this._pointerKey = {};
    document.querySelectorAll('.tbtn.pressed').forEach((b) => b.classList.remove('pressed'));
  },

  // is dit waarschijnlijk een touch-apparaat?
  isTouch() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }
};
