/* ============================================================
   i18n — vertalingen (Engels standaard, Nederlands schakelbaar).
   Statische HTML: elementen met data-i18n / data-i18n-html / data-i18n-ph / data-i18n-aria.
   Dynamische JS-teksten: t('key').
   ============================================================ */
const I18N = {
  lang: 'en',
  DICT: {
    en: {
      // ---- algemeen / knoppen ----
      back: 'Back', close: 'Close', cancel: 'Cancel', save: 'Save', ok: 'OK', play: 'Play',
      // ---- hoofdmenu ----
      tile_journey: 'Journey', tile_journey_sub_w1: 'World 1', badge_solo: 'Singleplayer',
      tile_smash: 'Power Smash', badge_online: 'Online', coming_soon: 'Coming Soon!',
      training_lobby: 'Training Lobby', blacksmith: 'Blacksmith',
      shop: 'Shop', inventory: 'Inventory', friends: 'Friends', leaderboard: 'Leaderboard',
      guest: 'Guest', lvl: 'Lvl',
      // ---- instellingen ----
      settings: 'Settings', account: 'Account', login_account: 'Log in / account',
      change_name: 'Change name', logout: 'Log out', delete_account: 'Delete account',
      sound: 'Sound', sound_on: 'Sound: On', sound_off: 'Sound: Off',
      language: 'Language', update_fresh: 'Update (fresh version)', new_game: 'New game (wipe progress)',
      // ---- account / auth ----
      auth_login: 'LOG IN', auth_register: 'Register', auth_sub: 'Optional — keeps your progress on every device.',
      auth_no_account: 'No account yet? Register', auth_have_account: 'Already have an account? Log in',
      ph_nick: 'Nickname', ph_email: 'E-mail', ph_pass: 'Password (min. 6 characters)',
      // ---- shop / inventaris ----
      shop_title: 'SHOP', inv_title: 'INVENTORY',
      tab_characters: 'Characters', tab_hats: 'Hats', tab_powerups: 'Power-ups',
      tab_armor: 'Armour', tab_materials: 'Materials',
      coins: 'Coins', rubies: 'Rubies',
      buy: 'BUY', equip: 'EQUIP', equipped: 'EQUIPPED', in_loadout: 'IN LOADOUT', choose: 'CHOOSE',
      too_few: '(not enough)', made: 'MADE', forge_btn: 'FORGE', repair_btn: 'REPAIR', smith_busy: 'SMITH BUSY',
      collect: 'COLLECT', out_loadout: 'REMOVE', buy_in_shop: 'Buy in shop', collect_ready: 'COLLECT!',
      // ---- journey ----
      journey_title: 'JOURNEY', world: 'World', story_next: 'Next', story_skip: 'Skip',
      // ---- versus ----
      you: 'YOU', vs: 'VS', you_vs: 'YOU · VS',
      // ---- blacksmith ----
      set_squire: 'Squire', set_knight: 'Knight', set_royal: 'Royal Knight',
      // ---- journey / beloningen ----
      world_map: 'WORLD MAP', both_defeated: 'You were both defeated — level failed.',
      unlock_gk_pre: 'Beat the GORILLA KING first to unlock ', level_word: 'Level',
      unlocked: 'UNLOCKED!', new_char: 'New character: ', new_hat: 'New hat: ',
      reward_powerup: 'POWER-UP', reward_material: 'MATERIAL', new_chest: 'NEW CHEST!',
      chest_open_suffix: ' chest — open it in the menu!', level_up: 'LEVEL UP!', reward: 'REWARD',
      coins_word: 'coins', xp_word: 'XP', rubies_word: 'rubies',
      coop: 'Play together (co-op)', coop_hint: 'Invite an online friend, then pick a level together.',
    },
    nl: {
      back: 'Terug', close: 'Sluiten', cancel: 'Annuleren', save: 'Opslaan', ok: 'OK', play: 'Play',
      tile_journey: 'Journey', tile_journey_sub_w1: 'Wereld 1', badge_solo: 'Singleplayer',
      tile_smash: 'Power Smash', badge_online: 'Online', coming_soon: 'Coming Soon!',
      training_lobby: 'Training Lobby', blacksmith: 'Blacksmith',
      shop: 'Shop', inventory: 'Inventaris', friends: 'Friends', leaderboard: 'Leaderboard',
      guest: 'Gast', lvl: 'Lvl',
      settings: 'Instellingen', account: 'Account', login_account: 'Inloggen / account',
      change_name: 'Naam wijzigen', logout: 'Uitloggen', delete_account: 'Account verwijderen',
      sound: 'Geluid', sound_on: 'Geluid: Aan', sound_off: 'Geluid: Uit',
      language: 'Taal', update_fresh: 'Update (verse versie)', new_game: 'Nieuw spel (wis voortgang)',
      auth_login: 'INLOGGEN', auth_register: 'Registreren', auth_sub: 'Optioneel — zo blijft je voortgang op elk toestel bewaard.',
      auth_no_account: 'Nog geen account? Registreren', auth_have_account: 'Al een account? Inloggen',
      ph_nick: 'Nickname', ph_email: 'E-mail', ph_pass: 'Wachtwoord (min. 6 tekens)',
      shop_title: 'SHOP', inv_title: 'INVENTARIS',
      tab_characters: 'Characters', tab_hats: 'Hoeden', tab_powerups: 'Power-ups',
      tab_armor: 'Harnas', tab_materials: 'Materiaal',
      coins: 'Munten', rubies: 'Robijnen',
      buy: 'KOOP', equip: 'UITRUSTEN', equipped: 'UITGERUST', in_loadout: 'IN LOADOUT', choose: 'KIES',
      too_few: '(te weinig)', made: 'GEMAAKT', forge_btn: 'SMEED', repair_btn: 'REPAREER', smith_busy: 'SMID BEZIG',
      collect: 'OPHALEN', out_loadout: 'UIT LOADOUT', buy_in_shop: 'Koop in shop', collect_ready: 'OPHALEN!',
      journey_title: 'JOURNEY', world: 'Wereld', story_next: 'Verder', story_skip: 'Overslaan',
      you: 'JIJ', vs: 'VS', you_vs: 'JIJ · TEGEN',
      set_squire: 'Schildknaap', set_knight: 'Ridder', set_royal: 'Royal Knight',
      world_map: 'WERELDKAART', both_defeated: 'Jullie zijn allebei verslagen — level mislukt.',
      unlock_gk_pre: 'Versla eerst de GORILLA KING om ', level_word: 'Level',
      unlocked: 'VRIJGESPEELD!', new_char: 'Nieuw character: ', new_hat: 'Nieuwe hoed: ',
      reward_powerup: 'POWER-UP', reward_material: 'MATERIAAL', new_chest: 'NIEUWE KIST!',
      chest_open_suffix: '-kist — open in het menu!', level_up: 'LEVEL UP!', reward: 'BELONING',
      coins_word: 'munten', xp_word: 'XP', rubies_word: 'robijnen',
      coop: 'Samen spelen (co-op)', coop_hint: 'Nodig een online vriend uit; kies daarna samen een level.',
    },
  },
  init() {
    let l = null; try { l = localStorage.getItem('tps_lang'); } catch (e) {}
    this.lang = (l === 'nl' || l === 'en') ? l : 'en';   // standaard Engels
  },
  t(key, fallback) {
    const d = this.DICT[this.lang] || this.DICT.en;
    if (d[key] != null) return d[key];
    if (this.DICT.en[key] != null) return this.DICT.en[key];
    return fallback != null ? fallback : key;
  },
  set(lang) {
    if (lang !== 'nl' && lang !== 'en') return;
    this.lang = lang;
    try { localStorage.setItem('tps_lang', lang); } catch (e) {}
    this.apply();
    if (this.applyContent) this.applyContent();
    if (window.UI && UI.onLangChange) UI.onLangChange();
  },
  // statische HTML-teksten (via data-attributen) invullen voor de huidige taal
  apply() {
    try { document.documentElement.setAttribute('lang', this.lang); } catch (e) {}
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = this.t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = this.t(el.getAttribute('data-i18n-html')); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.setAttribute('placeholder', this.t(el.getAttribute('data-i18n-ph'))); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', this.t(el.getAttribute('data-i18n-aria'))); });
  },
};
// ---- CONTENT-vertaling: config-strings staan in het Nederlands (NL-bron);
// hieronder de Engelse overlay. Bij taal 'en' overschrijven we de config-velden met Engels,
// bij 'nl' herstellen we het origineel. Zo hoeft de weergavecode nergens aangepast te worden.
I18N.CONTENT = {
  en: {
    weapons: {
      bat: { desc: 'Your trusty starter weapon.' },
      club: { desc: 'Cheap and hard: big knockback.' },
      machete: { desc: 'Sharper and faster than the bat.' },
      sword: { desc: 'Balanced: solid damage and speed.' },
      dagger: { desc: 'Lightning fast, but short reach and low damage.' },
      axe: { desc: 'Heavy hit with big knockback — but slow.' },
      spear: { desc: 'Extra long reach — hit enemies from afar.' },
      mace: { desc: 'Knocks enemies far away (huge knockback).' },
      flail: { desc: 'Swings in an arc — hits enemies on both sides.' },
      bostaff: { desc: 'Fast, wide sweeps that push back crowds around you.' },
      katana: { desc: 'Razor sharp: high damage and fast.' },
      halberd: { desc: 'Long reach and heavy damage, but slow.' },
      zapblade: { name: 'Zap Blade', desc: 'Special blade: fast and hard.' },
      pistol: { desc: 'Your first firearm. Hit them from range.' },
      uzi: { desc: 'Fires blazingly fast. Mows down crowds (eats ammo).' },
      ak47: { desc: 'High damage and fast. The king.' },
      rocket: { desc: 'Explosive rockets (AoE). Needs separate rockets — scarce!' },
      shield: { desc: 'Shield bash + block.' },
      chainsaw: { name: 'Chainsaw', desc: 'Cuts through anything: 60 damage, but slow.' },
      deagle: { desc: 'Heavy pistol with recoil: half HP per hit, 3 bullets.' },
      crossbow: { name: 'Crossbow', desc: 'Fires arrows: 35 damage, 7 arrows.' },
    },
    chars: {
      ryan: { desc: 'Balanced. Fastest runner.' },
      tygo: { desc: 'Tall & tough (+10 HP). Higher double jump. Uses any melee weapon.' },
      just: { desc: 'Stocky, slow but strong (+30 HP, +20% melee). Ground-pound deals area damage on landing.' },
      timo: { desc: 'Small & agile (small hitbox). Has an extra (smaller) double jump.' },
      vince: { desc: 'Balanced. Every 30s a fire aura (5s): whoever you touch burns for 3s.' },
      jenze: { desc: 'Big & tough: +40 HP, +30% melee, a bit slower.' },
      ricky: { desc: 'Every 15s, 3s of RAGE (2× damage). 85 HP.' },
      yarno: { desc: 'Balanced, a bit faster. Starts with a dagger.' },
      bonzo: { desc: 'Chimp: fast & agile, extra jump. Journey only.' },
      koba: { desc: 'Brute: big & strong (+25% melee). Journey only.' },
      kong: { name: 'Gorilla King', desc: 'Gorilla king: enormous power. Ability King’s Wrath (3× damage), but long charge time.' },
      guardian: { name: 'Temple Guardian', desc: 'Temple Guardian: gets 3 traps you place one by one (ground/platform). Beat him in the Temple world.' },
      monnik: { name: 'Monk', desc: 'Monk: tough + stun pulse (stuns everyone nearby). Beat him in the Temple world.' },
      ninja: { name: 'Ninja', desc: 'Ninja: double jump + 6s invisibility. Beat him in the Temple world.' },
      indiaan: { name: 'Warrior' }, aapje: { name: 'Little Ape' }, baviaan: { name: 'Baboon' },
    },
    abilities: {
      zapdash: { name: 'Zap Dash', desc: 'Dash to your opponent: damage + knockback.' },
      heal: { name: 'Heal', desc: 'Instantly restores all your HP.' },
      highjump: { name: 'High Jump', desc: 'Jumps higher — for the rest of the match.' },
      fireaura10: { name: 'Fire Aura', desc: 'Fire aura 10s: whoever you touch burns.' },
      triplejump: { name: 'Double Jump', desc: 'An extra double jump — for the rest of the match.' },
      earthquake: { name: 'Earthquake', desc: 'The map shakes 5s; your opponent gets shaken off.' },
      rage10: { name: 'Rage', desc: 'Rage 10s (2× damage).' },
      rage8: { name: 'Rage', desc: 'Rage 8s (2× damage).' },
      ultrarage: { name: 'Ultra Rage', desc: 'Ultra rage 5s (4× damage).' },
      rage3: { name: 'King’s Wrath', desc: 'Rage 8s (3× damage) — long charge time.' },
      knife: { name: 'Zap Blade', desc: 'Special blade for 1 round (fast + hard).' },
      katanacombo: { name: 'Katana Combo', desc: 'Attack twice as fast with the katana for 5s.' },
      traps: { name: 'Traps', desc: 'Get 3 traps — place them one by one on the ground or a platform. If your opponent steps on one: stuck 8s.' },
      stunstrike: { name: 'Stun Strike', desc: 'For 5s: your next hit stuns your opponent.' },
      stunpulse: { name: 'Stun Pulse', desc: 'Wave of energy: stuns everyone nearby for 1.6s.' },
      invisible: { name: 'Invisible', desc: '6s invisible — your opponent can’t see you.' },
    },
    powerups: {
      heal: { name: 'Medipack', desc: 'Instantly restores 40 HP.' },
      shield: { name: 'Shield', desc: 'Shield that absorbs a big hit.' },
      speed: { name: 'Speed', desc: 'Move a lot faster for a bit.' },
      rage: { name: 'Rage', desc: 'A lot more hit damage for a bit.' },
      fireball: { name: 'Fireball', desc: '3 fireballs that also set enemies alight.' },
      giant: { name: 'Giant', desc: 'Become a huge giant for a bit.' },
      dragon: { name: 'Dragon', desc: 'Summon a dragon that breathes fire at your opponent.' },
      ak47: { desc: 'Machine gun with 50 bullets. Chests only.' },
      rocket: { name: 'Rocket', desc: 'Rocket launcher. Chests only.' },
      cannon: { name: 'Cannon', desc: 'Cannonball that homes in on your opponent. Chests only.' },
      beachball: { name: 'Beach Ball', desc: 'Bounce your opponent away with the beach ball. Chests only.' },
      coco: { name: 'Coconut Bomb', desc: 'Lobs and explodes with knockback. Chests only.' },
      boom: { name: 'Boomerang', desc: 'Flies out and returns. Chests only.' },
      dart: { name: 'Poison Dart', desc: 'Fast dart that stuns. Chests only.' },
      rock: { name: 'Boulder', desc: 'Drops boulders on your opponent. Chests only.' },
      lightning: { name: 'Lightning', desc: 'Stun your opponent with lightning. Chests only.' },
      ninjastar: { name: 'Ninja Stars', desc: '3 spinning ninja stars.' },
      deagle: { name: 'Desert Eagle', desc: 'Heavy pistol with recoil: half HP, 3 bullets.' },
      crossbow: { name: 'Crossbow', desc: 'Fires arrows: 35 damage, 7 arrows.' },
      chainsaw: { name: 'Chainsaw', desc: 'Melee: 60 damage, but slow.' },
    },
    hats: {
      none: { name: 'No hat', desc: 'No headwear.' },
      cap: { name: 'Cap', desc: 'Classic red cap.' },
      beanie: { name: 'Beanie', desc: 'Warm beanie with a pom.' },
      party: { name: 'Party Hat', desc: 'Party!' },
      fedora: { name: 'Fedora', desc: 'Stylish fedora.' },
      cowboy: { name: 'Cowboy Hat', desc: 'Yeehaw.' },
      chef: { name: 'Chef Hat', desc: 'For the chef.' },
      grad: { name: 'Graduation Cap', desc: 'Graduated!' },
      tophat: { name: 'Top Hat', desc: 'Dapper.' },
      propeller: { name: 'Propeller Cap', desc: 'With a spinning propeller.' },
      wizard: { name: 'Wizard Hat', desc: 'Magical.' },
      viking: { name: 'Viking Helmet', desc: 'With horns.' },
      crown: { name: 'Crown', desc: 'For the king.' },
      halo: { name: 'Halo', desc: 'Angelic.' },
      leafcrown: { name: 'Leaf Crown', desc: 'Island crown of leaves. Via Journey.' },
      tikimask: { name: 'Tiki Mask', desc: 'Wooden tribal mask. Via Journey.' },
      bananahat: { name: 'Banana', desc: 'A banana on your head. Via Journey.' },
    },
    materials: { leather: { name: 'Leather' }, nails: { name: 'Nails' }, iron: { name: 'Iron' }, steel: { name: 'Steel' } },
    sets: { leather: { name: 'Squire' }, iron: { name: 'Knight' }, steel: { name: 'Royal Knight' } },
    slots: { hat: 'Helmet', chest: 'Chestplate', bottom: 'Legplate', feet: 'Boots' },
    worlds: { 1: 'Uninhabited Island', 2: 'Lost Temple' },
    levels: {
      1: ['Washed Ashore', 'Breakers', 'Palm Reef', 'Monkey Business', 'BONZO', 'Lagoon', 'Clifftops', 'Sandbank', 'Forbidden Beach', 'KOBA', 'Coconut Palace', 'Storm Cape', 'Spring Tide', 'Ape Hill', 'GORILLA KING'],
      2: ['Gate', 'Courtyard', 'Colonnade', 'Altar', 'TEMPLE GUARDIAN', 'Cloister', 'Meditation Garden', 'Bell Tower', 'Hidden Chamber', 'MONK', 'Roof Gardens', 'Shadow Path', 'Trap Halls', 'Dojo', 'NINJA'],
    },
  },
};
I18N._maps = [
  { key: 'weapons', ref: function () { return typeof WEAPONS !== 'undefined' ? WEAPONS : null; }, fields: ['name', 'desc'] },
  { key: 'chars', ref: function () { return typeof CHARACTERS !== 'undefined' ? CHARACTERS : null; }, fields: ['name', 'desc'] },
  { key: 'abilities', ref: function () { return typeof ABILITIES !== 'undefined' ? ABILITIES : null; }, fields: ['name', 'desc'] },
  { key: 'powerups', ref: function () { return typeof SHOP_POWERUPS !== 'undefined' ? SHOP_POWERUPS : null; }, fields: ['name', 'desc'] },
  { key: 'hats', ref: function () { return typeof HATS !== 'undefined' ? HATS : null; }, fields: ['name', 'desc'] },
  { key: 'materials', ref: function () { return typeof MATERIALS !== 'undefined' ? MATERIALS : null; }, fields: ['name'] },
  { key: 'sets', ref: function () { return typeof ARMOR_SETS !== 'undefined' ? ARMOR_SETS : null; }, fields: ['name'] },
];
I18N._orig = null; I18N._origSlots = null;
I18N.snapshotContent = function () {
  if (this._orig) return;
  this._orig = {};
  for (const m of this._maps) {
    const o = m.ref(); if (!o) continue; const s = this._orig[m.key] = {};
    for (const id in o) { s[id] = {}; for (const f of m.fields) if (o[id] && o[id][f] != null) s[id][f] = o[id][f]; }
  }
  if (typeof ARMOR_SLOT_NAME !== 'undefined') this._origSlots = Object.assign({}, ARMOR_SLOT_NAME);
};
I18N.applyContent = function () {
  this.snapshotContent();
  const useEn = this.lang === 'en', EN = this.CONTENT.en;
  for (const m of this._maps) {
    const o = m.ref(); if (!o) continue; const eo = EN[m.key] || {}, orig = this._orig[m.key] || {};
    for (const id in o) {
      for (const f of m.fields) {
        const v = (useEn && eo[id] && eo[id][f] != null) ? eo[id][f] : (orig[id] ? orig[id][f] : undefined);
        if (v != null) o[id][f] = v;
      }
    }
  }
  // harnas: slot-namen + herbereken de stuk-namen (set + slot)
  if (typeof ARMOR_SLOT_NAME !== 'undefined' && typeof ARMOR_PIECES !== 'undefined' && typeof ARMOR_SETS !== 'undefined') {
    const sl = useEn ? EN.slots : (this._origSlots || {});
    for (const k in sl) ARMOR_SLOT_NAME[k] = sl[k];
    for (const id in ARMOR_PIECES) { const p = ARMOR_PIECES[id]; if (ARMOR_SETS[p.set]) p.name = ARMOR_SETS[p.set].name + ' ' + ARMOR_SLOT_NAME[p.slot]; }
  }
  // Journey: wereld- + level-namen (genest)
  if (typeof JOURNEY !== 'undefined') {
    if (!this._origJourney) {
      this._origJourney = { worlds: {}, levels: {} };
      for (const w of [1, 2]) { if (!JOURNEY[w]) continue; this._origJourney.worlds[w] = JOURNEY[w].name; this._origJourney.levels[w] = (JOURNEY[w].levels || []).map(function (l) { return l.name; }); }
    }
    for (const w of [1, 2]) {
      if (!JOURNEY[w]) continue;
      JOURNEY[w].name = (useEn && EN.worlds && EN.worlds[w]) ? EN.worlds[w] : this._origJourney.worlds[w];
      const lv = (useEn && EN.levels && EN.levels[w]) ? EN.levels[w] : this._origJourney.levels[w];
      (JOURNEY[w].levels || []).forEach(function (l, i) { if (lv && lv[i] != null) l.name = lv[i]; });
    }
  }
};

I18N.init();
window.I18N = I18N;
window.t = function (k, f) { return I18N.t(k, f); };
