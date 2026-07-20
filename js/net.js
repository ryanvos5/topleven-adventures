/* ============================================================
   NET — accounts (Supabase Auth) + cloud-opslag van voortgang.
   Inloggen is OPTIONEEL: zonder account speel je gewoon lokaal door.
   De publieke 'anon'-sleutel hieronder is veilig om in de client te zetten;
   echte beveiliging gebeurt server-side via Row Level Security.
   ============================================================ */
const SUPA_URL = 'https://ldzdfgfaqiwwdogpltsu.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkemRmZ2ZhcWl3d2RvZ3BsdHN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NzgwNzQsImV4cCI6MjA5NjA1NDA3NH0.bzoEhgQB727gjS0JfEqxjLlqyam0fuy0J7UovCeg6oY';
// deep-link waarop de app na social-login terugkomt (custom URL-scheme = bundle-id).
// Deze exacte URL moet ook in Supabase → Authentication → URL Configuration → Redirect URLs staan.
const OAUTH_REDIRECT = 'nl.thebrandingfive.rymrheroes://login-callback';

const Net = {
  sb: null,
  user: null,
  ready: false,
  authReady: false,     // true zodra de sessie (wel/niet ingelogd) is opgehaald
  pushTimer: null,
  isNative: false,

  init() {
    if (!window.supabase || !window.supabase.createClient) {
      console.warn('[Net] supabase-js niet geladen — alleen lokaal spelen.');
      return;
    }
    this.isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    try {
      this.sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
        // PKCE + in de app zelf de callback afhandelen (geen automatische URL-detectie in de WebView)
        auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce', detectSessionInUrl: !this.isNative },
        /* Realtime. eventsPerSecond: zonder deze regel throttelt de client naar 10/sec
           -> haperende sync. 40 geeft ruimte voor de state-updates + losse events.

           De twee regels daaronder zijn de kern van de "match bevriest 5-10s"-klacht:
           - De standaard herverbind-backoff is [1s, 2s, 5s, 10s]. Valt de websocket
             even weg (mobiel netwerk, WiFi<->4G, korte stilte), dan duurt het daardoor
             5 tot 10 seconden voor je weer verbonden bent. Met deze reeks is dat ~0,2s
             en merk je er niets van.
           - De heartbeat stond op 30s. Phoenix sluit de socket ZELF zodra een antwoord
             niet binnen is voor de volgende hartslag, dus één gemiste beat kostte je
             een halve minuut voor 'ie het doorhad. Op 15s is dat veel sneller opgemerkt. */
        realtime: {
          params: { eventsPerSecond: 40 },
          heartbeatIntervalMs: 15000,
          reconnectAfterMs: (tries) => [200, 400, 800, 1500, 3000][tries - 1] || 5000,
        },
      });
    } catch (e) { console.warn('[Net] init faalde', e); return; }
    this.ready = true;
    if (this.isNative) this._initNativeAuthDeepLink();   // vang de social-login-redirect op in de app
    this.loadMapRotation();   // welke maps staan aan/uit (cloud, door de eigenaar beheerd via de Map Maker)

    // bestaande sessie herstellen
    this.sb.auth.getSession().then(({ data }) => {
      if (data && data.session) {
        this.user = data.session.user;
        this.afterLogin();
      }
      this.authReady = true;
      this._refreshUI();
      if (this.lobby) this.lobbyRefreshNick();   // presence-naam bijwerken zodra sessie bekend is
    }).catch(() => { this.authReady = true; });
    this.sb.auth.onAuthStateChange((_evt, session) => {
      this.user = session ? session.user : null;
      this.authReady = true;
      this._refreshUI();
      if (this.lobby) this.lobbyRefreshNick();   // bij inloggen/uitloggen de naam updaten
    });
  },

  // ---- map-rotatie (cloud): welke maps zijn uitgezet ----
  loadMapRotation() {
    if (!this.sb) return;
    this.sb.from('app_config').select('value').eq('key', 'rotation').maybeSingle().then(({ data }) => {
      if (data && data.value && Array.isArray(data.value.disabled)) {
        window.MAP_DISABLED = new Set(data.value.disabled);
        try { localStorage.setItem('tps_maprotation', JSON.stringify({ disabled: data.value.disabled })); } catch (e) {}
      }
    }).catch(() => {});
  },
  // alleen de eigenaar mag schrijven (RLS); geeft de Supabase-promise terug
  saveMapRotation(disabledArr) {
    if (!this.sb) return Promise.reject(new Error('no client'));
    return this.sb.from('app_config').upsert({ key: 'rotation', value: { disabled: disabledArr }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  },

  isLoggedIn() { return !!this.user; },
  nickname() {
    if (!this.user) return null;
    return (this.user.user_metadata && this.user.user_metadata.nickname) || this.user.email || 'Speler';
  },

  // ---- auth ----
  async register(email, nickname, password) {
    if (!this.ready) throw new Error('Geen verbinding met de server.');
    const { data, error } = await this.sb.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { nickname: (nickname || '').trim() },
        emailRedirectTo: location.origin + location.pathname,
      },
    });
    if (error) throw error;
    if (data.session) {            // bevestiging staat uit -> meteen ingelogd
      this.user = data.user;
      await this.ensureProfile();
      await this.pushCloudSave();
      this._refreshUI();
      return { confirmed: true };
    }
    return { confirmed: false };   // moet eerst e-mail bevestigen
  },

  async login(email, password) {
    if (!this.ready) throw new Error('Geen verbinding met de server.');
    const { data, error } = await this.sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    this.user = data.user;
    await this.afterLogin();
    this._refreshUI();
    return data;
  },

  // ---- sociale login (Apple / Google) via Supabase OAuth ----
  // Web/PWA: redirect-flow -> na akkoord komt de gebruiker terug op deze pagina en herkent
  // onAuthStateChange de sessie. In de iOS-app (Capacitor) opent dit de systeem-browser; om
  // de sessie terug te vangen is een deep-link (custom URL-scheme) + provider-config nodig.
  async signInWithOAuth(provider) {
    if (!this.ready) throw new Error('Geen verbinding met de server.');
    if (this.isNative) {
      // native (iOS-app): open het provider-scherm in een in-app browser; de app vangt de
      // redirect (OAUTH_REDIRECT) op via de deep-link-listener en wisselt de code in voor een sessie.
      const { data, error } = await this.sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo: OAUTH_REDIRECT, skipBrowserRedirect: true },
      });
      if (error) throw error;
      const P = (window.Capacitor && window.Capacitor.Plugins) || {};
      if (data && data.url) {
        if (P.Browser && P.Browser.open) await P.Browser.open({ url: data.url, presentationStyle: 'popover' });
        else window.open(data.url, '_system');
      }
      return data;
    }
    // web/PWA: klassieke redirect-flow op de huidige pagina
    const redirectTo = location.origin + location.pathname;
    const { data, error } = await this.sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: false },
    });
    if (error) throw error;
    return data;
  },

  // iOS: luister naar de terugkeer-deep-link na social-login en maak de sessie compleet
  _initNativeAuthDeepLink() {
    try {
      const P = (window.Capacitor && window.Capacitor.Plugins) || {};
      if (!P.App || !P.App.addListener) return;
      P.App.addListener('appUrlOpen', async (evt) => {
        const url = evt && evt.url;
        if (!url || url.indexOf('login-callback') === -1) return;
        try { if (P.Browser && P.Browser.close) await P.Browser.close(); } catch (e) {}
        try {
          let code = null;
          try { code = new URL(url).searchParams.get('code'); } catch (e) {
            const m = url.match(/[?&]code=([^&]+)/); code = m ? decodeURIComponent(m[1]) : null;
          }
          if (!code) return;
          const { error } = await this.sb.auth.exchangeCodeForSession(code);   // PKCE -> sessie
          if (error) throw error;
          // onAuthStateChange werkt de UI bij
        } catch (e) { console.warn('[Net] social-login callback', e); }
      });
    } catch (e) { console.warn('[Net] deep-link init', e); }
  },
  async signInWithApple() { return this.signInWithOAuth('apple'); },

  async logout() {
    if (!this.ready) return;
    try { if (this.user) await this.pushCloudSave(); } catch (e) {}   // huidige voortgang eerst veilig in de cloud
    try { await this.sb.auth.signOut(); } catch (e) {}
    this.user = null;
    // lokale voortgang wissen zodat die NIET naar een volgend account lekt (kopie-exploit)
    try { if (window.Storage && Storage.reset) Storage.reset(); } catch (e) {}
    this._refreshUI();
    if (window.UI && UI.afterLogout) UI.afterLogout();
  },
  // account definitief verwijderen (Apple-eis): server-side RPC wist alle data + het auth-account,
  // daarna hoe dan ook lokaal uitloggen. Een echte fout wordt doorgegeven zodat de UI het kan tonen.
  async deleteAccount() {
    if (!this.ready) throw new Error('Geen verbinding met de server.');
    let rpcError = null;
    try { const { error } = await this.sb.rpc('delete_account'); rpcError = error || null; }
    catch (e) { rpcError = e; }
    try { await this.sb.auth.signOut(); } catch (e) {}
    this.user = null;
    try { if (window.Storage && Storage.reset) Storage.reset(); } catch (e) {}   // gewiste account-data ook lokaal weg
    this._refreshUI();
    if (window.UI && UI.afterLogout) UI.afterLogout();
    if (rpcError) throw rpcError;
  },

  // na (her)inloggen: profiel borgen + cloud-save mergen
  async afterLogin() {
    await this.ensureProfile();
    await this.loadCloudSave();
    if (window.UI && UI.afterNetLogin) UI.afterNetLogin();
  },

  async ensureProfile() {
    if (!this.user) return;
    const nick = (this.user.user_metadata && this.user.user_metadata.nickname) || null;
    const row = { id: this.user.id, updated_at: new Date().toISOString() };
    if (nick) row.nickname = nick;   // alleen zetten als we een naam hebben (bestaande naam niet wissen)
    try {
      await this.sb.from('game_profiles').upsert(row, { onConflict: 'id' });
    } catch (e) { console.warn('[Net] ensureProfile', e); }
  },

  // nickname instellen/wijzigen (auth-metadata + leaderboard-rij)
  async setNickname(nick) {
    nick = (nick || '').trim();
    if (!nick) throw new Error('Vul een naam in.');
    if (nick.length > 20) nick = nick.slice(0, 20);
    if (!this.user) throw new Error('Je bent niet ingelogd.');
    const { error: e1 } = await this.sb.auth.updateUser({ data: { nickname: nick } });
    if (e1) throw e1;
    const { error: e2 } = await this.sb.from('game_profiles')
      .update({ nickname: nick, updated_at: new Date().toISOString() }).eq('id', this.user.id);
    if (e2) throw e2;
    if (this.user.user_metadata) this.user.user_metadata.nickname = nick;
    this._refreshUI();
    return nick;
  },

  // ---- cloud-opslag ----
  async loadCloudSave() {
    if (!this.user) return;
    try {
      const { data, error } = await this.sb.from('game_profiles')
        .select('save_data').eq('id', this.user.id).maybeSingle();
      if (error) { console.warn('[Net] loadCloudSave', error); return; }
      if (data && data.save_data) {
        Storage.mergeCloud(data.save_data);      // neem het beste van cloud + lokaal
        await this.pushCloudSave();              // schrijf de samengevoegde stand terug
      } else {
        await this.pushCloudSave();              // nog geen cloud-save: zet de lokale erin
      }
    } catch (e) { console.warn('[Net] loadCloudSave', e); }
    if (window.UI && UI.syncCoins) UI.syncCoins();
  },

  // gedebouncede push (wordt vanuit Storage.save aangeroepen)
  queueCloudSave() {
    if (!this.user) return;
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.pushCloudSave(), 1500);
  },
  async pushCloudSave() {
    if (!this.user) return;
    try {
      await this.sb.from('game_profiles')
        .update({
          save_data: Storage.data,
          mp_wins: Storage.data.mpWins || 0,
          mp_losses: Storage.data.mpLosses || 0,
          rp: Storage.data.rp || 0,
          xp: Storage.data.xp || 0,
          arena_best: Storage.data.arenaBest || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.user.id);
    } catch (e) { console.warn('[Net] pushCloudSave', e); }
  },

  // leaderboard ophalen (sort_by: 'xp' | 'arena' | 'wins')
  async getLeaderboard(sortBy, limit) {
    if (!this.ready) throw new Error('Geen verbinding met de server.');
    const { data, error } = await this.sb.rpc('get_leaderboard', {
      sort_by: sortBy || 'xp', limit_n: limit || 50,
    });
    if (error) throw error;
    return data || [];
  },

  // eigen positie op de ranglijst (of null als niet ingelogd / geen rij)
  async getMyRank(sortBy) {
    if (!this.ready || !this.user) return null;
    const { data, error } = await this.sb.rpc('get_my_rank', { sort_by: sortBy || 'xp' });
    if (error) { console.warn('[Net] getMyRank', error); return null; }
    return (data && data[0]) || null;
  },

  // ---- Knock-out dag-limiet via account (reset 06:00 Amsterdam) ----
  async arenaPlaysLeft() {
    if (!this.ready || !this.user) return null;          // niet ingelogd
    const { data, error } = await this.sb.rpc('arena_plays_left');
    if (error) { console.warn('[Net] arenaPlaysLeft', error); return null; }
    return data;
  },
  async arenaUsePlay() {
    if (!this.ready || !this.user) return null;
    const { data, error } = await this.sb.rpc('arena_use_play');
    if (error) throw error;
    return data;                                          // resterend, of -1 als op
  },

  _refreshUI() { if (window.UI && UI.refreshAuthUI) UI.refreshAuthUI(); },

  // ============ 1 vs 1 MULTIPLAYER (Supabase Realtime) ============
  versus: null,

  makeRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // zonder verwarrende tekens
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  },

  // host maakt een kamer, guest doet mee. cbs = { onPresence, onState, onHit, onFell }
  async versusHost(cbs) { return this._versusJoin(this.makeRoomCode(), 'host', cbs); },
  async versusJoin(code, cbs) {
    if (!code || code.length < 3) throw new Error('Vul een geldige kamercode in.');
    return this._versusJoin(code.toUpperCase().trim(), 'guest', cbs);
  },

  // ---- random matchmaking: zoek een willekeurige tegenstander via een gedeeld kanaal ----
  _mmCode(a, b) {
    const s = [a, b].sort().join('|'); let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return 'MM' + h.toString(36).toUpperCase().slice(0, 6);
  },
  // begin te zoeken. cbs = versus-callbacks (onMatch vuurt zodra er verbonden is).
  findMatch(cbs) {
    if (!this.ready) return false;
    this.cancelMatchmaking(); this.leaveVersus();
    const myId = (this.user && this.user.id) || ('gast-' + Math.floor(Math.random() * 1e9));
    const ch = this.sb.channel('smash-mm', { config: { broadcast: { self: false } } });
    const mm = { ch, myId, paired: false, seek: null };
    this._mm = mm;
    // rank-matchmaking: eerst RANK_WINDOW ms alleen binnen RANK_TOL ranks, daarna tegen wie dan ook online.
    // Ruime marges (±2 ranks / kort venster) omdat de spelersbasis nog klein is — zo matchen bv.
    // Bronze I en Bronze III meteen i.p.v. allebei op een bot terug te vallen.
    const myRp = (window.Storage && Storage.rp) ? Storage.rp() : 0;
    const myRank = (typeof rankForRp === 'function') ? rankForRp(myRp) : 0;
    const startAt = Date.now(), RANK_WINDOW = 2500, RANK_TOL = 2;
    const pairWith = (otherId) => {
      if (mm.paired || !otherId || otherId === myId) return;
      mm.paired = true;
      if (mm.seek) { clearInterval(mm.seek); mm.seek = null; }
      try { ch.unsubscribe(); } catch (e) {}
      this._mm = null;
      const host = (myId < otherId) ? myId : otherId;
      const code = this._mmCode(myId, otherId);
      this._versusJoin(code, myId === host ? 'host' : 'guest', cbs).catch(() => {});   // fout = UI valt na 8s terug op bot
    };
    ch.on('broadcast', { event: 'seek' }, (m) => {
      const p = m.payload, o = p && p.id;
      if (!o || o === myId) return;
      try { ch.send({ type: 'broadcast', event: 'seek', payload: { id: myId, rp: myRp } }); } catch (e) {}
      const oRank = (typeof rankForRp === 'function') ? rankForRp(p.rp || 0) : 0;
      const inRange = Math.abs(oRank - myRank) <= RANK_TOL;         // binnen ±RANK_TOL ranks (bv. hele Bronze-tier)
      const windowOpen = (Date.now() - startAt) >= RANK_WINDOW;      // niemand met die rank gevonden -> iedereen mag
      if (inRange || windowOpen) pairWith(o);
    });
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED' && this._mm === mm) {
        const seek = () => { if (!mm.paired) { try { ch.send({ type: 'broadcast', event: 'seek', payload: { id: myId, rp: myRp } }); } catch (e) {} } };
        seek(); mm.seek = setInterval(seek, 700);
      }
    });
    return true;
  },
  cancelMatchmaking() {
    const mm = this._mm; this._mm = null;
    if (!mm) return;
    if (mm.seek) clearInterval(mm.seek);
    try { mm.ch.unsubscribe(); } catch (e) {}
  },

  async _versusJoin(code, role, cbs) {
    if (!this.ready) throw new Error('Geen verbinding met de server.');
    this.leaveVersus();
    const myId = (this.user && this.user.id) || ('gast-' + Math.floor(Math.random() * 1e7));
    const ch = this.sb.channel('versus-' + code, { config: { broadcast: { self: false } } });
    const v = { channel: ch, code, role, myId, cbs: cbs || {}, matched: false, joinTimer: null };
    this.versus = v;
    // start-handshake via broadcast (betrouwbaarder dan presence)
    ch.on('broadcast', { event: 'join' }, () => {
      if (role === 'host') { this.versusSend('start', {}); this._versusMatch(v, 'host'); }
    });
    ch.on('broadcast', { event: 'start' }, () => {
      if (role === 'guest') this._versusMatch(v, 'guest');
    });
    ch.on('broadcast', { event: 'state' }, (m) => { if (v.cbs.onState) v.cbs.onState(m.payload); });
    ch.on('broadcast', { event: 'hit' }, (m) => { if (v.cbs.onHit) v.cbs.onHit(m.payload); });
    ch.on('broadcast', { event: 'fell' }, (m) => { if (v.cbs.onFell) v.cbs.onFell(m.payload); });
    ch.on('broadcast', { event: 'burn' }, (m) => { if (v.cbs.onBurn) v.cbs.onBurn(m.payload); });
    ch.on('broadcast', { event: 'shot' }, (m) => { if (v.cbs.onShot) v.cbs.onShot(m.payload); });
    ch.on('broadcast', { event: 'lobby' }, (m) => { if (v.cbs.onLobby) v.cbs.onLobby(m.payload); });
    ch.on('broadcast', { event: 'begin' }, (m) => { if (v.cbs.onBegin) v.cbs.onBegin(m.payload); });
    ch.on('broadcast', { event: 'rematch' }, (m) => { if (v.cbs.onRematch) v.cbs.onRematch(m.payload); });
    ch.on('broadcast', { event: 'over' }, (m) => { if (v.cbs.onOver) v.cbs.onOver(m.payload); });
    ch.on('broadcast', { event: 'drop' }, (m) => { if (v.cbs.onDrop) v.cbs.onDrop(m.payload); });
    ch.on('broadcast', { event: 'pickup' }, (m) => { if (v.cbs.onPickup) v.cbs.onPickup(m.payload); });
    ch.on('broadcast', { event: 'nuke' }, (m) => { if (v.cbs.onNuke) v.cbs.onNuke(m.payload); });
    ch.on('broadcast', { event: 'traps' }, (m) => { if (v.cbs.onTraps) v.cbs.onTraps(m.payload); });
    ch.on('broadcast', { event: 'rooted' }, (m) => { if (v.cbs.onRooted) v.cbs.onRooted(m.payload); });
    ch.on('broadcast', { event: 'portal' }, (m) => { if (v.cbs.onPortal) v.cbs.onPortal(m.payload); });
    ch.on('broadcast', { event: 'dragon' }, (m) => { if (v.cbs.onDragon) v.cbs.onDragon(m.payload); });
    ch.on('broadcast', { event: 'stun' }, (m) => { if (v.cbs.onStun) v.cbs.onStun(m.payload); });
    ch.on('broadcast', { event: 'quake' }, (m) => { if (v.cbs.onQuake) v.cbs.onQuake(m.payload); });
    ch.on('broadcast', { event: 'ability' }, (m) => { if (v.cbs.onAbility) v.cbs.onAbility(m.payload); });
    ch.on('broadcast', { event: 'cavearm' }, (m) => { if (v.cbs.onCaveArm) v.cbs.onCaveArm(m.payload); });
    ch.on('broadcast', { event: 'cavewall' }, (m) => { if (v.cbs.onCaveWall) v.cbs.onCaveWall(m.payload); });
    ch.on('broadcast', { event: 'rocks' }, (m) => { if (v.cbs.onRocks) v.cbs.onRocks(m.payload); });
    ch.on('broadcast', { event: 'lava' }, (m) => { if (v.cbs.onLava) v.cbs.onLava(m.payload); });
    ch.on('broadcast', { event: 'tentacle' }, (m) => { if (v.cbs.onTentacle) v.cbs.onTentacle(m.payload); });
    ch.on('broadcast', { event: 'gorilla' }, (m) => { if (v.cbs.onGorilla) v.cbs.onGorilla(m.payload); });
    ch.on('broadcast', { event: 'gorhit' }, (m) => { if (v.cbs.onGorhit) v.cbs.onGorhit(m.payload); });
    ch.on('broadcast', { event: 'monkey' }, (m) => { if (v.cbs.onMonkey) v.cbs.onMonkey(m.payload); });
    ch.on('broadcast', { event: 'ape' }, (m) => { if (v.cbs.onApe) v.cbs.onApe(m.payload); });
    // ---- Journey CO-OP (zelfde kamer-kanaal): level-start, speler/zombie-sync, hits, kratten, finish ----
    ch.on('broadcast', { event: 'jstart' }, (m) => { if (v.cbs.onJStart) v.cbs.onJStart(m.payload); });
    ch.on('broadcast', { event: 'jp' }, (m) => { if (v.cbs.onJP) v.cbs.onJP(m.payload); });
    ch.on('broadcast', { event: 'jz' }, (m) => { if (v.cbs.onJZ) v.cbs.onJZ(m.payload); });
    ch.on('broadcast', { event: 'jhit' }, (m) => { if (v.cbs.onJHit) v.cbs.onJHit(m.payload); });
    ch.on('broadcast', { event: 'jcrate' }, (m) => { if (v.cbs.onJCrate) v.cbs.onJCrate(m.payload); });
    ch.on('broadcast', { event: 'jwin' }, (m) => { if (v.cbs.onJWin) v.cbs.onJWin(m.payload); });
    ch.on('broadcast', { event: 'jrs' }, (m) => { if (v.cbs.onJRS) v.cbs.onJRS(m.payload); });
    ch.on('broadcast', { event: 'jlose' }, (m) => { if (v.cbs.onJLose) v.cbs.onJLose(m.payload); });
    ch.on('broadcast', { event: 'parry' }, (m) => { if (v.cbs.onParry) v.cbs.onParry(m.payload); });
    ch.on('broadcast', { event: 'tide' }, (m) => { if (v.cbs.onTide) v.cbs.onTide(m.payload); });
    ch.on('broadcast', { event: 'ball' }, (m) => { if (v.cbs.onBall) v.cbs.onBall(m.payload); });
    ch.on('broadcast', { event: 'bye' }, () => { if (v.cbs.onPeerLeft) v.cbs.onPeerLeft(); });
    await new Promise((resolve, reject) => {
      let done = false;
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED' && !done) { done = true; v.rejoins = 0; resolve(); }
        else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !done) {
          done = true; reject(new Error('Kon niet verbinden met de kamer.'));
        } else if (done && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')) {
          /* Valt het kanaal MIDDEN in een match weg, dan gebeurde er voorheen niets meer:
             beide kanten werden stil en riepen zichzelf tot winnaar uit. Nu proberen we
             opnieuw aan te haken (met oplopende wachttijd) zolang de match nog loopt. */
          if (this.versus !== v || v.leaving) return;
          v.rejoins = (v.rejoins || 0) + 1;
          if (v.rejoins > 6) return;
          clearTimeout(v.rejoinTimer);
          v.rejoinTimer = setTimeout(() => {
            if (this.versus !== v || v.leaving) return;
            try { ch.subscribe(); } catch (e) {}
          }, Math.min(4000, 400 * v.rejoins));
        }
      });
      setTimeout(() => { if (!done) { done = true; reject(new Error('Time-out bij verbinden.')); } }, 8000);
    });
    // guest klopt herhaaldelijk aan tot de host 'start' terugstuurt
    if (role === 'guest') {
      let tries = 0;
      const ping = () => {
        if (v.matched || tries++ > 20) { if (v.joinTimer) clearInterval(v.joinTimer); v.joinTimer = null; return; }
        this.versusSend('join', { id: myId });
      };
      ping();
      v.joinTimer = setInterval(ping, 600);
    }
    return code;
  },

  _versusMatch(v, role) {
    if (!v || v.matched) return;
    v.matched = true;
    if (v.joinTimer) { clearInterval(v.joinTimer); v.joinTimer = null; }
    if (v.cbs.onMatch) v.cbs.onMatch(role);
  },

  setVersusCallbacks(cbs) { if (this.versus) this.versus.cbs = Object.assign(this.versus.cbs || {}, cbs); },

  versusSend(event, payload) {
    if (this.versus && this.versus.channel) {
      // "ring sluit": onthoud wanneer ik online schade aan de tegenstander deed (melee/kogels via 'hit', vuuraura via 'burn')
      if ((event === 'hit' && payload && payload.dmg > 0) || event === 'burn') {
        if (typeof Game !== 'undefined' && Game && Game.vs) Game.vs.myLastHit = Game.time;
      }
      this.versus.channel.send({ type: 'broadcast', event, payload });
    }
  },

  // ============ LOBBY-CHAT (globaal: chat + wie-is-online + invites) ============
  lobby: null,
  lobbyPeers: {},
  _guestId: null,

  lobbyMyId() { return (this.user && this.user.id) || (this._guestId || (this._guestId = 'gast-' + Math.floor(Math.random() * 1e7))); },
  lobbyMyNick() { return this.nickname() || ('Gast' + this.lobbyMyId().slice(-4)); },

  async lobbyJoin(cbs) {
    if (!this.ready) throw new Error('Geen verbinding met de server.');
    this.lobbyLeave();
    const id = this.lobbyMyId(), nick = this.lobbyMyNick();
    const ch = this.sb.channel('lobby-chat', { config: { broadcast: { self: false } } });
    const L = { channel: ch, cbs: cbs || {}, id, nick, hbTimer: null, pruneTimer: null };
    this.lobbyPeers = {};
    ch.on('broadcast', { event: 'chat' }, (m) => { if (L.cbs.onChat) L.cbs.onChat(m.payload); });
    ch.on('broadcast', { event: 'here' }, (m) => { const p = m.payload; if (p && p.id) { this.lobbyPeers[p.id] = { nick: p.nick, t: Date.now(), guest: p.g === 1 }; this._emitPeers(L); } });
    ch.on('broadcast', { event: 'lbye' }, (m) => { if (m.payload && m.payload.id) { delete this.lobbyPeers[m.payload.id]; this._emitPeers(L); } });
    ch.on('broadcast', { event: 'invite' }, (m) => { if (m.payload && m.payload.to === id && L.cbs.onInvite) L.cbs.onInvite(m.payload); });
    await new Promise((resolve, reject) => {
      let done = false;
      ch.subscribe((st) => {
        if (st === 'SUBSCRIBED' && !done) { done = true; resolve(); }
        else if ((st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') && !done) { done = true; reject(new Error('Kon de chat niet verbinden.')); }
      });
      setTimeout(() => { if (!done) { done = true; reject(new Error('Time-out bij de chat.')); } }, 8000);
    });
    this.lobby = L;
    const beat = () => this.lobbySend('here', { id: L.id, nick: L.nick, g: this.isLoggedIn() ? 0 : 1 });   // leest live id/nick + gast-vlag
    beat();
    L.hbTimer = setInterval(beat, 4000);                 // heartbeat: ik ben online
    L.pruneTimer = setInterval(() => this._prunePeers(L), 3000);
    this._emitPeers(L);
    return true;
  },

  _emitPeers(L) {
    const list = [{ id: L.id, nick: L.nick, me: true, guest: !this.isLoggedIn() }];
    for (const pid in this.lobbyPeers) list.push({ id: pid, nick: this.lobbyPeers[pid].nick, me: false, guest: !!this.lobbyPeers[pid].guest });
    if (L.cbs.onPeers) L.cbs.onPeers(list);
  },
  _prunePeers(L) {
    const now = Date.now(); let changed = false;
    for (const pid in this.lobbyPeers) if (now - this.lobbyPeers[pid].t > 12000) { delete this.lobbyPeers[pid]; changed = true; }
    if (changed) this._emitPeers(L);
  },

  // naam/id van de presence bijwerken (bv. na inloggen) en meteen een heartbeat sturen
  lobbyRefreshNick() {
    const L = this.lobby; if (!L) return;
    const newId = this.lobbyMyId(), newNick = this.lobbyMyNick();
    if (L.id === newId && L.nick === newNick) return;
    if (L.id !== newId) { try { L.channel.send({ type: 'broadcast', event: 'lbye', payload: { id: L.id } }); } catch (e) {} }
    L.id = newId; L.nick = newNick;
    this.lobbySend('here', { id: L.id, nick: L.nick, g: this.isLoggedIn() ? 0 : 1 });
    this._emitPeers(L);   // eigen chip meteen bijwerken
  },

  lobbySend(event, payload) { if (this.lobby && this.lobby.channel) this.lobby.channel.send({ type: 'broadcast', event, payload }); },
  lobbyChat(text) { if (this.lobby) this.lobbySend('chat', { id: this.lobby.id, nick: this.lobby.nick, text: text }); },
  lobbyInvite(toId, code, coop) { if (this.lobby) this.lobbySend('invite', { to: toId, from: this.lobby.nick, fromId: this.lobby.id, code: code, coop: !!coop }); },

  lobbyLeave() {
    if (this.lobby) {
      if (this.lobby.hbTimer) clearInterval(this.lobby.hbTimer);
      if (this.lobby.pruneTimer) clearInterval(this.lobby.pruneTimer);
      try { this.lobby.channel.send({ type: 'broadcast', event: 'lbye', payload: { id: this.lobby.id } }); } catch (e) {}
      try { this.sb.removeChannel(this.lobby.channel); } catch (e) {}
    }
    this.lobby = null; this.lobbyPeers = {};
  },

  // ============ VRIENDEN + DM-CHAT ============
  _dmChannel: null,

  async friendRequest(username) {
    if (!this.user) throw new Error('Log eerst in om vrienden toe te voegen.');
    const { data, error } = await this.sb.rpc('friend_request', { uname: (username || '').trim() });
    if (error) throw error;
    return data;   // 'sent' | 'now_friends' | 'already_sent' | 'already_friends' | 'not_found' | 'self'
  },
  async friendAccept(otherId) {
    const { data, error } = await this.sb.rpc('friend_accept', { other: otherId });
    if (error) throw error; return data;
  },
  async friendRemove(otherId) {
    const { data, error } = await this.sb.rpc('friend_remove', { other: otherId });
    if (error) throw error; return data;
  },
  async friendsOverview() {
    if (!this.user) return [];
    const { data, error } = await this.sb.rpc('friends_overview');
    if (error) { console.warn('[Net] friendsOverview', error); return []; }
    return data || [];
  },

  // DM's (blijven opgeslagen in game_messages)
  async loadMessages(friendId, limit) {
    if (!this.user) return [];
    const me = this.user.id;
    const { data, error } = await this.sb.from('game_messages')
      .select('sender,recipient,body,created_at')
      .or('and(sender.eq.' + me + ',recipient.eq.' + friendId + '),and(sender.eq.' + friendId + ',recipient.eq.' + me + ')')
      .order('created_at', { ascending: true })
      .limit(limit || 100);
    if (error) { console.warn('[Net] loadMessages', error); return []; }
    return data || [];
  },
  async sendMessage(friendId, body) {
    if (!this.user) throw new Error('Niet ingelogd.');
    const text = (body || '').trim().slice(0, 500);
    if (!text) return null;
    const { data, error } = await this.sb.from('game_messages')
      .insert({ sender: this.user.id, recipient: friendId, body: text })
      .select('sender,recipient,body,created_at').single();
    if (error) throw error;
    return data;
  },
  // realtime: binnenkomende DM's (voor de badge + live in het open gesprek)
  subscribeDMs(onMessage) {
    if (!this.user) return;
    this.unsubscribeDMs();
    const ch = this.sb.channel('dm-inbox-' + this.user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_messages', filter: 'recipient=eq.' + this.user.id },
        (payload) => { if (onMessage && payload && payload.new) onMessage(payload.new); });
    ch.subscribe();
    this._dmChannel = ch;
  },
  unsubscribeDMs() {
    if (this._dmChannel) { try { this.sb.removeChannel(this._dmChannel); } catch (e) {} this._dmChannel = null; }
  },
  // is deze speler nu online? (via de lobby-presence)
  isOnline(id) {
    if (!id) return false;
    if (id === this.lobbyMyId()) return true;
    return !!this.lobbyPeers[id];
  },

  // ============ TRAINING LOBBY (gedeeld kanaal: N spelers in één sandbox) ============
  train: null,
  trainMyId() { return this.lobbyMyId(); },
  trainMyNick() { return this.lobbyMyNick(); },

  async trainJoin(cbs) {
    if (!this.ready) throw new Error('Geen verbinding met de server.');
    this.trainLeave();
    const id = this.trainMyId(), nick = this.trainMyNick();
    const ch = this.sb.channel('train-lobby-1', { config: { broadcast: { self: false } } });
    const T = { channel: ch, cbs: cbs || {}, id, nick };
    ch.on('broadcast', { event: 'ts' }, (m) => { if (T.cbs.onState) T.cbs.onState(m.payload); });     // speler-state
    ch.on('broadcast', { event: 'thit' }, (m) => { if (T.cbs.onHit) T.cbs.onHit(m.payload); });        // treffer op iemand
    ch.on('broadcast', { event: 'tbye' }, (m) => { if (T.cbs.onBye) T.cbs.onBye(m.payload); });        // iemand verliet de lobby
    await new Promise((resolve, reject) => {
      let done = false;
      ch.subscribe((st) => {
        if (st === 'SUBSCRIBED' && !done) { done = true; resolve(); }
        else if ((st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') && !done) { done = true; reject(new Error('Kon de training-lobby niet verbinden.')); }
      });
      setTimeout(() => { if (!done) { done = true; reject(new Error('Time-out bij de training-lobby.')); } }, 8000);
    });
    this.train = T;
    return { id, nick };
  },
  trainSend(event, payload) { if (this.train && this.train.channel) this.train.channel.send({ type: 'broadcast', event, payload }); },
  trainLeave() {
    if (this.train) {
      try { this.train.channel.send({ type: 'broadcast', event: 'tbye', payload: { id: this.train.id } }); } catch (e) {}
      try { this.sb.removeChannel(this.train.channel); } catch (e) {}
    }
    this.train = null;
  },

  leaveVersus() {
    if (this.versus) {
      this.versus.leaving = true;                                   // lopende herverbind-pogingen staken
      if (this.versus.rejoinTimer) clearTimeout(this.versus.rejoinTimer);
      if (this.versus.joinTimer) { clearInterval(this.versus.joinTimer); }
      if (this.versus.channel) {
        try { this.versus.channel.send({ type: 'broadcast', event: 'bye', payload: {} }); } catch (e) {}
        try { this.sb.removeChannel(this.versus.channel); } catch (e) {}
      }
    }
    this.versus = null;
  },
};
window.Net = Net;   // zodat de window.Net-checks in storage.js/ui.js werken
