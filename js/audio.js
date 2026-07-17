/* ============================================================
   SFX — volledig PROCEDURELE audio via Web Audio API.
   Geen bestanden, geen netwerk, 100% rechtenvrij (zelf gegenereerd).
   Muziek = simpele chiptune-loop per map-thema; effecten = synth-blips.
   ============================================================ */
const Sfx = {
  ctx: null, master: null, musicGain: null, sfxGain: null,
  enabled: true,      // legacy alias (= sfxOn); voor oude aanroepen
  musicOn: true, sfxOn: true,
  _curTheme: null, _step: 0, _timer: null, _theme: null, _intensity: 0,

  init() {
    this._native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    try { this.sfxOn = localStorage.getItem('tps_sfx') !== '0'; } catch (e) { this.sfxOn = true; }
    try { this.musicOn = localStorage.getItem('tps_music') !== '0'; } catch (e) { this.musicOn = true; }
    // migratie: oude gecombineerde 'tps_sound'-uit -> beide uit
    try { if (localStorage.getItem('tps_sound') === '0') { this.sfxOn = false; this.musicOn = false; } } catch (e) {}
    this.enabled = this.sfxOn;
    // Audio mag alleen starten/hervatten ROND een gebruikersgebaar — iOS is daar streng in en
    // negeert een resume() die uit een achtergrond-event komt. Deze listener blijft daarom
    // BESTAAN (niet eenmalig): komt de app terug en lukt het hervatten niet vanzelf, dan zet
    // de eerste de beste tik het geluid alsnog aan. Doet niets zolang alles al draait.
    // Blijvende gebaar-listener. Op iOS mag audio alleen ROND een tik (her)starten, én na een
    // 'interrupted' (backgrounden) meldt de context wel 'running' maar blijft stil -> de enige
    // echte fix is 'm binnen dit gebaar volledig OPNIEUW opbouwen. Doet niets zolang alles speelt.
    const kick = () => { if (!this.ctx || this.ctx.state !== 'running' || this._stale) this._rebuild(); };
    window.addEventListener('pointerdown', kick, { passive: true });
    window.addEventListener('touchstart', kick, { passive: true });
    window.addEventListener('keydown', kick);
    // iOS: bij weg-swipen raakt de AudioContext 'suspended' en loopt de muziek-timer uit de pas.
    // Deze handlers hervatten geluid + muziek zodra de app weer actief is.
    const wake = () => this.wake();   // focus/pageshow betekenen al "we zijn terug" -> niet op document.hidden wachten
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.wake(); });
    window.addEventListener('focus', wake);
    window.addEventListener('pageshow', wake);
    try {   // Capacitor (iOS-app): expliciet signaal als de app weer op de voorgrond komt
      const P = window.Capacitor && window.Capacitor.Plugins;
      if (P && P.App && P.App.addListener) P.App.addListener('appStateChange', (s) => { if (s && s.isActive) this.wake(); });
    } catch (e) {}
  },

  // terug uit de achtergrond: context hervatten én de muziek-loop VERS opstarten.
  // (alleen ctx.resume() is niet genoeg: de oude interval loopt uit de pas -> stilte)
  wake() {
    // In de app (Capacitor) mag audio zonder gebaar hervatten -> bij een verouderde/dode context
    // meteen een VERSE opbouwen, zodat het geluid terugkomt zonder dat je hoeft te tikken.
    // Lukt dat niet (dan zet _rebuild _stale weer true), dan pakt je eerste tik het alsnog.
    if (this._native && (this._stale || !this.ctx || this.ctx.state !== 'running')) { this._rebuild(); return; }
    this._ensure();
    if (!this.ctx) return;
    clearTimeout(this._wakeTimer);
    // iOS hervat soms pas rond een gebaar -> blijf het ~2s proberen. Lukt het dan nog niet,
    // dan pakt de blijvende 'kick'-listener (eerste tik) het alsnog op.
    const attempt = (tries) => {
      if (!this.ctx) return;
      // alles wat niet 'running' is hervatten -> dekt óók iOS' 'interrupted'-staat (na lang op de achtergrond)
      if (this.ctx.state !== 'running') { try { this.ctx.resume(); } catch (e) {} }
      if (this.ctx.state === 'running') {
        if (this.musicOn && this._curTheme) { this._stopLoop(); this._startLoop(); }   // schone herstart -> muziek komt terug
        return;
      }
      if (tries > 0) this._wakeTimer = setTimeout(() => attempt(tries - 1), 250);
    };
    attempt(8);
  },

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicOn ? 0.13 : 0; this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxOn ? 0.32 : 0; this.sfxGain.connect(this.master);
    // markeer de context als 'verouderd' zodra 'ie uit 'running' gaat (iOS: 'interrupted' bij
    // backgrounden) -> de eerstvolgende tik bouwt 'm dan opnieuw op.
    try { this.ctx.onstatechange = () => { if (this.ctx) this._stale = (this.ctx.state !== 'running'); }; } catch (e) {}
  },

  // Volledig NIEUWE AudioContext opbouwen. De enige betrouwbare fix voor iOS' 'interrupted -> stil':
  // resume() meldt dan wel 'running' maar geeft geen geluid. Wordt alleen aangeroepen vanuit een
  // gebruikersgebaar (de 'kick'-listener), anders zou de verse context suspended blijven.
  _rebuild() {
    try { if (this.ctx && this.ctx.state !== 'closed') this.ctx.close(); } catch (e) {}
    this.ctx = null; this.master = null; this.musicGain = null; this.sfxGain = null;
    this._stopLoop();
    this._ensure();                                    // verse context + gain-nodes + onstatechange
    if (this.ctx) { try { this.ctx.resume(); } catch (e) {} }   // binnen het gebaar -> gaat naar 'running'
    this._stale = false;
    const finish = () => {
      if (this.ctx && this.ctx.state === 'running') {
        if (this.musicOn && this._curTheme && !this._timer) this._startLoop();   // geluid terug
      } else {
        this._stale = true;   // nog niet 'running' (bv. web zonder gebaar) -> volgende tik probeert opnieuw
      }
    };
    finish();
    clearTimeout(this._wakeTimer);
    this._wakeTimer = setTimeout(finish, 200);   // context wordt soms 1 tick later pas 'running'
  },
  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this._curTheme && !this._timer && this.musicOn) this._startLoop();   // muziek (her)starten
  },
  // muziek en geluidseffecten los aan/uit
  setMusic(on) {
    this.musicOn = !!on;
    try { localStorage.setItem('tps_music', on ? '1' : '0'); } catch (e) {}
    this._ensure();
    if (this.musicGain) this.musicGain.gain.value = on ? 0.13 : 0;
    if (on) { this.resume(); if (this._curTheme && !this._timer) this._startLoop(); } else this._stopLoop();
  },
  setSfx(on) {
    this.sfxOn = !!on; this.enabled = !!on;
    try { localStorage.setItem('tps_sfx', on ? '1' : '0'); } catch (e) {}
    this._ensure();
    if (this.sfxGain) this.sfxGain.gain.value = on ? 0.32 : 0;
    if (on) this.resume();
  },
  setEnabled(on) { this.setSfx(on); this.setMusic(on); },   // legacy: zet allebei

  // ---------- effecten ----------
  _tone(freq, dur, type, vol, slideTo) {
    if (!this.sfxOn || !this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  },
  _noise(dur, vol, filtFreq, slideTo) {
    if (!this.sfxOn || !this.ctx) return;
    const t = this.ctx.currentTime, n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filtFreq || 1800, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(120, slideTo), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain); src.start(t); src.stop(t + dur + 0.02);
  },

  play(name) {
    if (!this.sfxOn) return;
    this._ensure(); if (!this.ctx) return;
    switch (name) {
      case 'jump': this._tone(320, 0.13, 'square', 0.22, 640); break;
      case 'swing': this._noise(0.1, 0.2, 3400, 1100); break;                                  // mep-zwiep
      case 'hit': this._noise(0.12, 0.42, 1400, 500); this._tone(150, 0.12, 'square', 0.3, 90); break;   // rake klap
      case 'gun': case 'shoot': this._noise(0.04, 0.3, 3200); this._tone(820, 0.04, 'square', 0.16, 280); break;  // scherpe tik (minigun/AK)
      case 'fireball': this._noise(0.24, 0.32, 1100, 360); this._tone(440, 0.22, 'sawtooth', 0.2, 150); break;     // vurige fwoosh
      case 'rocket': this._tone(900, 0.22, 'sawtooth', 0.2, 150); this._noise(0.34, 0.38, 1500, 280); break;       // raket-lancering (whoosh)
      case 'cannon': this._tone(64, 0.5, 'square', 0.55, 28); this._noise(0.4, 0.6, 480, 110); break;              // KANON: diepe boem
      case 'explos': this._noise(0.46, 0.58, 700, 180); this._tone(80, 0.42, 'square', 0.32, 36); break;           // explosie
      case 'zap': for (let i = 0; i < 5; i++) setTimeout(() => this._tone(1500 + Math.random() * 1400, 0.04, 'square', 0.2), i * 28); this._noise(0.14, 0.3, 6000); break;  // bliksem
      case 'dragonfire': this._noise(0.55, 0.42, 1100, 280); this._tone(110, 0.5, 'sawtooth', 0.2, 70); break;     // draak-vuurstraal
      case 'boing': this._tone(280, 0.2, 'sine', 0.32, 820); break;                            // strandbal
      case 'stomp': this._tone(95, 0.22, 'square', 0.5, 38); this._noise(0.2, 0.42, 420); break;                   // reus-dreun
      case 'monster': this._tone(85, 0.5, 'sawtooth', 0.42, 48); this._noise(0.4, 0.34, 650, 250); break;          // zeemonster-tentakel (gromp)
      case 'monkey': [880, 760, 1040].forEach((f, i) => setTimeout(() => this._tone(f, 0.07, 'square', 0.22, f * 1.15), i * 70)); break;  // aap-gekrijs
      case 'gorilla': this._tone(70, 0.6, 'square', 0.46, 42); this._noise(0.5, 0.4, 520, 200); break;             // gorilla-brul
      case 'lava': this._noise(0.6, 0.46, 520, 160); this._tone(58, 0.55, 'square', 0.36, 120); break;             // vulkaan-uitbarsting
      case 'beam': this._tone(220, 0.42, 'sawtooth', 0.26, 1500); this._noise(0.2, 0.2, 4000); break;              // cave-straal
      case 'pickup': this._tone(660, 0.09, 'square', 0.25); setTimeout(() => this._tone(990, 0.11, 'square', 0.25), 80); break;
      case 'coin': this._tone(940, 0.07, 'square', 0.22); setTimeout(() => this._tone(1320, 0.1, 'square', 0.22), 60); break;
      case 'bounce': this._tone(440, 0.08, 'sine', 0.25, 300); break;
      case 'splash': this._noise(0.22, 0.28, 1600, 600); break;
      case 'click': this._tone(680, 0.05, 'square', 0.18); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.16, 'square', 0.26), i * 110)); break;
      case 'lose': [392, 330, 262].forEach((f, i) => setTimeout(() => this._tone(f, 0.2, 'square', 0.24, f * 0.85), i * 150)); break;
      case 'mapintro': this._noise(0.5, 0.5, 2400, 320); this._tone(180, 0.5, 'sawtooth', 0.16, 900); setTimeout(() => { this._tone(70, 0.42, 'square', 0.42, 34); this._noise(0.36, 0.5, 620, 130); }, 400); break;   // map-intro: opzwepende whoosh + boem
      case 'drumroll': {   // echte snare-roffel: korte heldere ruis-tikken die versnellen + aanzwellen, dan een slotklap
        let d = 0; const N = 32;
        for (let i = 0; i < N; i++) {
          const p = i / (N - 1);
          setTimeout(() => this._noise(0.035, 0.12 + 0.30 * p, 3000 - 800 * p), d);   // snare-tik, wordt harder + iets doffer
          d += 84 - 52 * p;                                                            // interval loopt van 84ms naar 32ms (accelereert)
        }
        setTimeout(() => { this._noise(0.22, 0.6, 4200, 500); this._noise(0.5, 0.42, 820, 170); this._tone(72, 0.42, 'square', 0.42, 34); }, d + 40);   // crash + lage boem
        break;
      }
      case 'roundwin': this._tone(660, 0.1, 'square', 0.26); setTimeout(() => this._tone(880, 0.14, 'square', 0.26), 90); break;
      case 'roundlose': this._tone(440, 0.12, 'square', 0.24); setTimeout(() => this._tone(294, 0.16, 'square', 0.24, 250), 100); break;
    }
  },

  // ---------- muziek: gevechtsstijl (drums + drijvende bas + mineur-riff) per thema ----------
  // per thema een EIGEN toonladder, akkoordenschema, riff en drumpatroon -> elke map klinkt anders.
  // (alles wordt in code gesynthetiseerd -> volledig rechtenvrij; geen audiobestanden nodig.)
  THEMES: {
    menu: { root: 261.6, bpm: 104, lead: 'triangle', bass: 'square',
      scale: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16], prog: [0, 9, 5, 7],   // majeur, rustig
      riff: [0, -1, 2, -1, 4, -1, 2, -1, 5, -1, 4, -1, 2, -1, 0, -1],
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
    // Rustgevend (eindstandscherm): traag, warm, GEEN drums — zachte pad-bas + lang uitklinkende lead
    calm: { root: 261.6, bpm: 66, lead: 'sine', bass: 'sine', soft: true,
      scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], prog: [0, 5, 9, 4],   // majeur-pentatonisch, warm
      riff: [0, -1, -1, -1, 4, -1, -1, -1, 2, -1, -1, -1, 5, -1, -1, -1] },
    // Jungle: driftig, tribaal, dorisch
    jungle: { root: 220.0, bpm: 134, lead: 'square', bass: 'square',
      scale: [0, 2, 3, 5, 7, 9, 10, 12, 14, 16], prog: [0, 5, 7, 3],
      riff: [0, -1, 2, 3, -1, 4, 3, 2, 0, -1, 4, 5, 3, -1, 2, -1],
      kick: [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1], snare: [0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0] },
    // Airplane: licht, zwevend, majeur-pentatonisch
    airplane: { root: 349.2, bpm: 118, lead: 'triangle', bass: 'triangle',
      scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], prog: [0, 7, 9, 4],
      riff: [4, -1, -1, 2, 3, -1, -1, 4, 5, -1, 4, -1, 2, -1, 0, -1],
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
    // Volcano (lava): heftig, donker, frygisch + dubbele kick
    lava: { root: 174.6, bpm: 150, lead: 'sawtooth', bass: 'square',
      scale: [0, 1, 3, 5, 7, 8, 10, 12, 13, 15], prog: [0, 1, 0, 3],
      riff: [0, 1, 0, -1, 3, -1, 1, 0, 0, 1, 3, 4, -1, 1, 0, -1],
      kick: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
    // Pirate: zwierig, dramatisch mineur, marcherende kick
    pirate: { root: 196.0, bpm: 116, lead: 'square', bass: 'triangle',
      scale: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15], prog: [0, 7, 3, 10],
      riff: [0, -1, 3, -1, 4, 3, 2, -1, 5, -1, 4, 3, -1, 2, 0, -1],
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0] },
    // Cave: mysterieus, sober, langzaam
    cave: { root: 130.8, bpm: 100, lead: 'triangle', bass: 'sine',
      scale: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15], prog: [0, 3, 7, 5],
      riff: [0, -1, -1, -1, 3, -1, -1, -1, 5, -1, -1, 4, -1, -1, 2, -1],
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
    // Beach: zonnig, opgewekt, majeur-pentatonisch
    beach: { root: 293.7, bpm: 128, lead: 'square', bass: 'triangle',
      scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], prog: [0, 5, 9, 7],
      riff: [0, 2, -1, 4, 2, -1, 4, 5, -1, 4, 2, -1, 0, 2, -1, 4],
      kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1] },
    // Dohyo: Japans/taiko, zware trom
    dohyo: { root: 164.8, bpm: 112, lead: 'square', bass: 'square',
      scale: [0, 1, 5, 7, 8, 12, 13, 17, 19, 20], prog: [0, 0, 7, 7],
      riff: [0, -1, -1, -1, 0, -1, 3, -1, 5, -1, -1, -1, 3, -1, 0, -1],
      kick: [1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0], snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1] },
    // Temple: oud, ritueel, frygisch/exotisch (nieuw)
    temple: { root: 155.6, bpm: 104, lead: 'triangle', bass: 'sine',
      scale: [0, 1, 3, 5, 7, 8, 11, 12, 13, 15], prog: [0, 1, 5, 3],
      riff: [5, -1, 4, -1, 3, -1, 1, -1, 0, -1, 1, -1, 3, -1, 4, -1],
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
    // Sky Castle: episch, dramatisch mineur, drijvende kick
    castle: { root: 174.6, bpm: 140, lead: 'sawtooth', bass: 'square',
      scale: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15], prog: [0, 7, 8, 5],
      riff: [0, -1, 7, -1, 5, -1, 3, -1, 2, 3, 5, -1, 7, -1, 3, -1],
      kick: [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1] },
    // Arena (Knock-out): snel en agressief
    arena: { root: 130.8, bpm: 152, lead: 'sawtooth', bass: 'square',
      scale: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15], prog: [0, 3, 5, 7],
      riff: [0, 3, 0, 5, 0, 3, 4, -1, 0, 3, 0, 7, 5, 4, 3, -1],
      kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1] },
    // Boss: razendsnel en uitdagend — frygisch-dominant (dreigend/exotisch), dubbele stampende kick
    boss: { root: 146.8, bpm: 168, lead: 'sawtooth', bass: 'square',
      scale: [0, 1, 4, 5, 7, 8, 11, 12, 13, 16], prog: [0, 1, 0, 5],
      riff: [0, 7, 4, 1, 0, 4, 5, 1, 0, 7, 8, 6, 5, 4, 1, 0],
      kick: [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0], snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1] },
  },
  _minor: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15],   // fallback-toonladder
  _prog: [0, 10, 8, 7],                          // fallback-akkoorden
  _kickP: [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
  _snareP: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  _riff: [0, -1, 3, 4, -1, 3, 0, 2, 4, -1, 5, 4, 3, 2, 0, -1],   // scale-graden (-1 = rust)

  music(theme) {
    clearTimeout(this._calmTimer);                          // een verse pot annuleert een lopende eindstand-fade
    if (this.musicGain && this.ctx) { try { this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime); } catch (e) {} this.musicGain.gain.value = this.musicOn ? 0.13 : 0; }   // volume terug naar normaal
    if (!this.THEMES[theme]) theme = 'menu';
    if (this._curTheme === theme) return;
    this._curTheme = theme; this._theme = this.THEMES[theme]; this._step = 0;
    this._intensity = 0;                          // nieuw thema = terug naar normaal tempo (versus zet 'm daarna hoger)
    this._ensure();
    this._stopLoop();
    if (this.ctx && this.ctx.state === 'running') this._startLoop();
  },
  // 0 = normaal, 1 = uitdagender (sneller + drijvender), 2 = een-na-laatste-ronde (nog sneller)
  setMusicIntensity(level) {
    level = Math.max(0, level | 0);
    if (this._intensity === level) return;
    this._intensity = level;
    if (this._timer) { this._stopLoop(); this._startLoop(); }   // herstart de loop op het nieuwe tempo
  },
  stopMusic() { clearTimeout(this._calmTimer); this._curTheme = null; this._theme = null; this._intensity = 0; this._stopLoop(); },
  // Eindstandscherm: laat de matchmuziek langzaam wegzakken en ga zacht over naar het rustgevende 'calm'-thema.
  calmOutro() {
    this._ensure();
    if (!this.ctx || !this.musicOn) return;
    if (this._curTheme === 'calm') return;                   // al rustig
    clearTimeout(this._calmTimer);
    const g = this.musicGain, t = this.ctx.currentTime;
    try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value || 0.13, t); g.gain.linearRampToValueAtTime(0.0001, t + 1.8); } catch (e) {}   // 1) huidige muziek langzaam uitfaden
    this._calmTimer = setTimeout(() => {                     // 2) daarna rustgevend thema starten en zacht infaden
      if (!this.ctx || !this.musicOn) return;
      this._curTheme = 'calm'; this._theme = this.THEMES.calm; this._step = 0; this._intensity = 0;
      this._stopLoop(); if (this.ctx.state === 'running') this._startLoop();
      const t2 = this.ctx.currentTime;
      try { g.gain.cancelScheduledValues(t2); g.gain.setValueAtTime(0.0001, t2); g.gain.linearRampToValueAtTime(0.10, t2 + 2.6); } catch (e) {}
    }, 1850);
  },
  _stopLoop() { if (this._timer) { clearInterval(this._timer); this._timer = null; } },
  _startLoop() {
    if (!this._theme || this._timer || !this.ctx || !this.musicOn) return;
    const mul = 1 + 0.16 * (this._intensity || 0);   // 1.0 / 1.16 / 1.32 -> sneller bij hogere intensiteit
    const stepMs = 60000 / (this._theme.bpm * mul) / 4;   // 16e noten (strakker, energieker)
    this._timer = setInterval(() => this._tick(), stepMs);
  },
  _f(root, semi) { return root * Math.pow(2, semi / 12); },
  _tick() {
    if (!this.musicOn || !this.ctx || this.ctx.state !== 'running' || !this._theme) return;
    const th = this._theme, step = this._step;
    const prog = th.prog || this._prog, scale = th.scale || this._minor;
    const kick = th.kick || this._kickP, snare = th.snare || this._snareP, riff = th.riff || this._riff;
    const chord = prog[Math.floor(step / 4) % 4];
    // rustgevend thema: geen drums/hats — warme pad-bas + zachte, lang uitklinkende lead
    if (th.soft) {
      if (step % 8 === 0) this._mnote(this._f(th.root / 2, chord), 1.6, th.bass, 0.24);   // warme pad-bas (elke 2 tellen)
      const dg = riff[step];
      if (dg >= 0) this._mnote(this._f(th.root, chord + scale[dg]), 1.0, th.lead, 0.20);   // zachte lead, klinkt lang uit
      this._step = (step + 1) % 16; return;
    }
    // drums
    const inten = this._intensity || 0;
    if (kick[step]) this._kick();
    if (snare[step]) this._snare();
    if (step % 2 === 0) this._hat(step % 4 === 0 ? 0.1 : 0.07);
    if (inten >= 1 && step % 2 === 1) this._hat(0.06);                                   // drijvender: hats op elke stap
    if (inten >= 2 && (step === 2 || step === 6 || step === 10 || step === 14)) this._kick();   // extra stampende kick op de een-na-laatste ronde
    // drijvende bas (8e noten)
    if (step % 2 === 0) this._mnote(this._f(th.root / 2, chord), 0.18, th.bass, 0.42);
    // riff (eigen toonladder per map)
    const deg = riff[step];
    if (deg >= 0) this._mnote(this._f(th.root, chord + scale[deg]), 0.15, th.lead, 0.3);
    this._step = (step + 1) % 16;
  },
  _mnote(freq, dur, type, vol) {
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + dur + 0.02);
  },
  _kick() {
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + 0.18);
  },
  _snare() {
    const t = this.ctx.currentTime, n = Math.floor(this.ctx.sampleRate * 0.14), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(f); f.connect(g); g.connect(this.musicGain); s.start(t); s.stop(t + 0.16);
  },
  _hat(vol) {
    const t = this.ctx.currentTime, n = Math.floor(this.ctx.sampleRate * 0.03), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    s.connect(f); f.connect(g); g.connect(this.musicGain); s.start(t); s.stop(t + 0.04);
  },
};
window.Sfx = Sfx;
