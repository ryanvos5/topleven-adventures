/* ============================================================
   SFX — volledig PROCEDURELE audio via Web Audio API.
   Geen bestanden, geen netwerk, 100% rechtenvrij (zelf gegenereerd).
   Muziek = simpele chiptune-loop per map-thema; effecten = synth-blips.
   ============================================================ */
const Sfx = {
  ctx: null, master: null, musicGain: null, sfxGain: null,
  enabled: true,
  _curTheme: null, _step: 0, _timer: null, _theme: null,

  init() {
    try { this.enabled = localStorage.getItem('tps_sound') !== '0'; } catch (e) { this.enabled = true; }
    // audio mag pas starten na een gebruikersgebaar (browserregel)
    const kick = () => { this.resume(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); window.removeEventListener('touchstart', kick); };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    window.addEventListener('touchstart', kick);
  },

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.enabled ? 0.9 : 0; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.13; this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.32; this.sfxGain.connect(this.master);
  },
  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this._curTheme && !this._timer) this._startLoop();   // muziek (her)starten
  },
  setEnabled(on) {
    this.enabled = !!on;
    try { localStorage.setItem('tps_sound', on ? '1' : '0'); } catch (e) {}
    this._ensure();
    if (this.master) this.master.gain.value = on ? 0.9 : 0;
    if (on) this.resume();
  },

  // ---------- effecten ----------
  _tone(freq, dur, type, vol, slideTo) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  },
  _noise(dur, vol, filtFreq, slideTo) {
    if (!this.enabled || !this.ctx) return;
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
    if (!this.enabled) return;
    this._ensure(); if (!this.ctx) return;
    switch (name) {
      case 'jump': this._tone(320, 0.13, 'square', 0.22, 640); break;
      case 'hit': this._noise(0.12, 0.4, 1400, 500); this._tone(150, 0.12, 'square', 0.28, 90); break;
      case 'shoot': this._noise(0.05, 0.22, 2600); break;
      case 'rocket': this._noise(0.2, 0.4, 900, 300); this._tone(120, 0.2, 'sawtooth', 0.2, 60); break;
      case 'explos': this._noise(0.42, 0.5, 700, 200); this._tone(90, 0.4, 'square', 0.25, 40); break;
      case 'pickup': this._tone(660, 0.09, 'square', 0.25); setTimeout(() => this._tone(990, 0.11, 'square', 0.25), 80); break;
      case 'coin': this._tone(940, 0.07, 'square', 0.22); setTimeout(() => this._tone(1320, 0.1, 'square', 0.22), 60); break;
      case 'bounce': this._tone(440, 0.08, 'sine', 0.25, 300); break;
      case 'splash': this._noise(0.22, 0.28, 1600, 600); break;
      case 'click': this._tone(680, 0.05, 'square', 0.18); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.16, 'square', 0.26), i * 110)); break;
      case 'lose': [392, 330, 262].forEach((f, i) => setTimeout(() => this._tone(f, 0.2, 'square', 0.24, f * 0.85), i * 150)); break;
    }
  },

  // ---------- muziek (chiptune-loop per thema) ----------
  THEMES: {
    menu:   { root: 261.6, bpm: 92,  lead: 'triangle', bass: 'sine' },
    jungle: { root: 220.0, bpm: 104, lead: 'square',   bass: 'triangle' },
    sky:    { root: 329.6, bpm: 88,  lead: 'sine',     bass: 'sine' },
    lava:   { root: 174.6, bpm: 118, lead: 'sawtooth', bass: 'square' },
    pirate: { root: 196.0, bpm: 96,  lead: 'triangle', bass: 'triangle' },
    cave:   { root: 146.8, bpm: 80,  lead: 'sine',     bass: 'sine' },
    beach:  { root: 293.7, bpm: 110, lead: 'square',   bass: 'triangle' },
    dohyo:  { root: 164.8, bpm: 86,  lead: 'square',   bass: 'square' },
    arena:  { root: 130.8, bpm: 126, lead: 'sawtooth', bass: 'square' },
  },
  // I - V - vi - IV (in halve tonen), pentatonisch erbovenop
  _prog: [0, 7, 9, 5],
  _penta: [0, 2, 4, 7, 9, 12],

  music(theme) {
    if (!this.THEMES[theme]) theme = 'menu';
    if (this._curTheme === theme) return;
    this._curTheme = theme; this._theme = this.THEMES[theme]; this._step = 0;
    this._ensure();
    this._stopLoop();
    if (this.ctx && this.ctx.state === 'running') this._startLoop();
  },
  stopMusic() { this._curTheme = null; this._theme = null; this._stopLoop(); },
  _stopLoop() { if (this._timer) { clearInterval(this._timer); this._timer = null; } },
  _startLoop() {
    if (!this._theme || this._timer || !this.ctx) return;
    const stepMs = 60000 / this._theme.bpm / 2;   // 8e noten
    this._timer = setInterval(() => this._tick(), stepMs);
  },
  _f(root, semi) { return root * Math.pow(2, semi / 12); },
  _tick() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running' || !this._theme) return;
    const th = this._theme, step = this._step, chord = this._prog[Math.floor(step / 4) % 4];
    // bas op de tel
    if (step % 4 === 0) this._mnote(this._f(th.root / 2, chord), 0.26, th.bass, 0.5);
    // melodie-arpeggio
    const pent = this._penta[(step * 2 + chord) % this._penta.length];
    if (step % 2 === 0 || Math.random() < 0.5) this._mnote(this._f(th.root, chord + pent), 0.16, th.lead, 0.32);
    this._step = (step + 1) % 16;
  },
  _mnote(freq, dur, type, vol) {
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + dur + 0.02);
  },
};
window.Sfx = Sfx;
