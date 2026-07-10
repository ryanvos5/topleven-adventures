/* ============================================================
   STORAGE — bewaart voortgang in de browser (localStorage).
   ============================================================ */

const SAVE_KEY = 'zombiedash_save_v1';

const DEFAULT_SAVE = {
  coins: 0,
  rubies: 0,                // premium-munt (robijnen): kist-wachttijd skippen (binnenkort meer)
  ammo: 100,                // blijvende kogelvoorraad (carry-over tussen levels)
  rockets: 0,               // blijvende raket-voorraad (Rocket Launcher)
  ownedWeapons: ['bat'],
  equippedMelee: 'bat',     // apart slot voor melee
  equippedRanged: null,     // apart slot voor vuurwapen (null = geen)
  ownedCharacters: ['ryan'],
  equippedCharacter: 'ryan',
  ownedHats: ['none'],
  equippedHat: 'none',
  // hoogst voltooide level per wereld: { "1": 0 } -> nog niets, level 1 speelbaar
  progress: { '1': 0 },
  arenaBest: 0,                 // hoogste ronde in Zombie Knock-out (oude mode)
  arenaPlays: { date: '', count: 0 }, // dagelijkse speel-limiet
  journey1: 0,                  // hoogst gehaalde Journey-level in wereld 1 (0 = nog niets)
  powerups: {},                 // gekochte power-ups in de inventaris: { id: aantal }
  loadout: [],                  // max 3 power-up-ids die je meeneemt in een match
  chests: [],                   // kist-slots (max 3): { r: rarity, u: unlockAt(ms) 0=nog niet begonnen }
  xp: 0,                        // ervaring uit multiplayer-duels (level = playerLevel(xp))
  level: 1,                     // laatst-uitgekeerde level (voor de level-up-popup + beloning)
  mpWins: 0,                    // gewonnen 1v1-duels (alleen tegen echte spelers)
  mpLosses: 0,                  // verloren 1v1-duels (alleen tegen echte spelers)
  rp: 0,                        // rank-punten (matchmaking-ranking)
  winStreak: 0,                 // huidige win-streak (voor de +10 bonus)
  rankRewarded: 0,              // hoogste rank-index waarvoor al munten/kisten zijn uitgekeerd
  charXp: {},                   // XP per character (voor de level-balk): { id: xp }
  charLevel: {},                // level per character (1..20): { id: lvl }
  materials: { leather: 0, nails: 0, iron: 0, steel: 0 },   // smeed-materialen (uit kisten)
  armor: {},                    // bezeten harnas-stukken: { pieceId: { dur } }
  equippedArmor: { hat: null, chest: null, bottom: null, feet: null },   // uitgerust harnas per slot
  forge: null,                  // smederij-slot (1 tegelijk): { id, repair, doneAt }
};

const Storage = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      this.data = raw ? Object.assign({}, DEFAULT_SAVE, JSON.parse(raw)) : Object.assign({}, DEFAULT_SAVE);
      // zorg dat geneste objecten/arrays bestaan
      this.data.ownedWeapons = this.data.ownedWeapons || ['bat'];
      this.data.ownedCharacters = this.data.ownedCharacters || ['ryan'];
      this.data.ownedHats = this.data.ownedHats || ['none'];
      if (!this.data.ownedHats.includes('none')) this.data.ownedHats.unshift('none');
      if (!this.data.equippedHat) this.data.equippedHat = 'none';
      this.data.progress = this.data.progress || { '1': 0 };
      if (typeof this.data.ammo !== 'number') this.data.ammo = STARTING_AMMO;
      if (typeof this.data.rockets !== 'number') this.data.rockets = 0;
      if (typeof this.data.arenaBest !== 'number') this.data.arenaBest = 0;
      if (typeof this.data.journey1 !== 'number') this.data.journey1 = 0;
      if (!this.data.powerups || typeof this.data.powerups !== 'object') this.data.powerups = {};
      if (!Array.isArray(this.data.loadout)) this.data.loadout = [];
      if (!Array.isArray(this.data.chests)) this.data.chests = [];
      if (typeof this.data.xp !== 'number') this.data.xp = 0;
      if (typeof this.data.level !== 'number') this.data.level = (typeof playerLevel === 'function') ? playerLevel(this.data.xp || 0) : 1;
      if (typeof this.data.mpWins !== 'number') this.data.mpWins = 0;
      if (typeof this.data.mpLosses !== 'number') this.data.mpLosses = 0;
      if (!this.data.charXp || typeof this.data.charXp !== 'object') this.data.charXp = {};
      if (!this.data.charLevel || typeof this.data.charLevel !== 'object') this.data.charLevel = {};
      if (!this.data.arenaPlays) this.data.arenaPlays = { date: '', count: 0 };
      // migratie van oude opslag (één slot -> twee slots)
      if (this.data.equippedMelee === undefined) this.data.equippedMelee = 'bat';
      if (this.data.equippedRanged === undefined) this.data.equippedRanged = null;
      if (this.data.equippedWeapon) {
        const w = WEAPONS[this.data.equippedWeapon];
        if (w && w.type === 'ranged') this.data.equippedRanged = this.data.equippedWeapon;
        else if (w) this.data.equippedMelee = this.data.equippedWeapon;
        delete this.data.equippedWeapon;
      }
    } catch (e) {
      this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }
    return this.data;
  },

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) {}
    try { if (window.Net && Net.queueCloudSave) Net.queueCloudSave(); } catch (e) {}
  },

  // cloud-save samenvoegen met de lokale stand: neem overal het BESTE,
  // zodat je op geen enkel toestel voortgang verliest bij het inloggen.
  mergeCloud(cloud) {
    if (!cloud) return;
    const d = this.data;
    d.coins = Math.max(d.coins || 0, cloud.coins || 0);
    d.rubies = Math.max(d.rubies || 0, cloud.rubies || 0);
    d.ammo = Math.max(d.ammo || 0, cloud.ammo || 0);
    d.rockets = Math.max(d.rockets || 0, cloud.rockets || 0);
    d.arenaBest = Math.max(d.arenaBest || 0, cloud.arenaBest || 0);
    d.journey1 = Math.max(d.journey1 || 0, cloud.journey1 || 0);
    d.xp = Math.max(d.xp || 0, cloud.xp || 0);
    d.level = Math.max(d.level || 0, cloud.level || 0);   // al-uitgekeerde levels niet dubbel belonen
    // power-ups: neem per soort het hoogste aantal (anti-verlies); loadout: houd de lokale keuze
    d.powerups = d.powerups || {};
    const cpu = cloud.powerups || {};
    for (const k of Object.keys(cpu)) d.powerups[k] = Math.max(d.powerups[k] || 0, cpu[k] || 0);
    if ((!d.loadout || !d.loadout.length) && Array.isArray(cloud.loadout)) d.loadout = cloud.loadout.slice(0, 3);
    // kisten: neem de rij met de meeste kisten (anti-verlies)
    if (Array.isArray(cloud.chests) && cloud.chests.length > (d.chests || []).length) d.chests = cloud.chests;
    d.mpWins = Math.max(d.mpWins || 0, cloud.mpWins || 0);
    d.mpLosses = Math.max(d.mpLosses || 0, cloud.mpLosses || 0);
    d.rp = Math.max(d.rp || 0, cloud.rp || 0);
    d.rankRewarded = Math.max(d.rankRewarded || 0, cloud.rankRewarded || 0);
    if (typeof cloud.winStreak === 'number' && (d.winStreak || 0) === 0) d.winStreak = cloud.winStreak;
    for (const w of (cloud.ownedWeapons || [])) if (!d.ownedWeapons.includes(w)) d.ownedWeapons.push(w);
    for (const c of (cloud.ownedCharacters || [])) if (!d.ownedCharacters.includes(c)) d.ownedCharacters.push(c);
    for (const h of (cloud.ownedHats || [])) if (!(d.ownedHats || (d.ownedHats = ['none'])).includes(h)) d.ownedHats.push(h);
    if (cloud.equippedHat && (!d.equippedHat || d.equippedHat === 'none')) d.equippedHat = cloud.equippedHat;
    const cp = cloud.progress || {};
    for (const k of Object.keys(cp)) d.progress[k] = Math.max(d.progress[k] || 0, cp[k] || 0);
    // character-levels: neem per character het hoogste level (+ bijbehorende XP)
    d.charLevel = d.charLevel || {}; d.charXp = d.charXp || {};
    const clv = cloud.charLevel || {}, cxp = cloud.charXp || {};
    for (const k of Object.keys(clv)) if ((clv[k] || 0) > (d.charLevel[k] || 0)) { d.charLevel[k] = clv[k]; d.charXp[k] = cxp[k] || 0; }
    for (const k of Object.keys(cxp)) if ((clv[k] || 1) === (d.charLevel[k] || 1)) d.charXp[k] = Math.max(d.charXp[k] || 0, cxp[k] || 0);
    this.save();
  },

  // voortgang herstellen via een URL-link, bv:
  //   ?restore=coins:5000,w1:10,w2:10,w3:0,weapons:all,chars:all,ammo:300
  // (werkt ook op iOS zonder console; neemt steeds de hoogste/meeste waarde)
  applyRestoreFromURL() {
    let q = '';
    try { q = (location.search || '').replace(/^\?/, ''); } catch (e) { return false; }
    if (!q) return false;
    let restore = '';
    q.split('&').forEach((kv) => {
      const i = kv.indexOf('=');
      const k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i));
      const v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1));
      if (k === 'restore') restore = v;
    });
    if (!restore) return false;
    // eenmalig per unieke link: voorkomt dat munten bij elke (koude) start "terugkomen"
    let already = '';
    try { already = localStorage.getItem('zombiedash_restored') || ''; } catch (e) {}
    if (already === restore) return false;
    let changed = false;
    restore.split(',').forEach((pair) => {
      const [key, valRaw] = pair.split(':');
      const val = valRaw || '';
      if (key === 'coins') { this.data.coins = Math.max(this.data.coins || 0, parseInt(val, 10) || 0); changed = true; }
      else if (key === 'ammo') { this.data.ammo = Math.max(this.data.ammo || 0, parseInt(val, 10) || 0); changed = true; }
      else if (key === 'rockets') { this.data.rockets = Math.max(this.data.rockets || 0, parseInt(val, 10) || 0); changed = true; }
      else if (/^w\d+$/.test(key)) { const w = key.slice(1); this.data.progress[w] = Math.max(this.data.progress[w] || 0, parseInt(val, 10) || 0); changed = true; }
      else if (key === 'weapons') { const ids = val === 'all' ? WEAPON_ORDER.slice() : val.split('|'); for (const id of ids) if (WEAPONS[id] && !this.data.ownedWeapons.includes(id)) this.data.ownedWeapons.push(id); changed = true; }
      else if (key === 'chars') { const ids = val === 'all' ? CHARACTER_ORDER.slice() : val.split('|'); for (const id of ids) if (CHARACTERS[id] && !this.data.ownedCharacters.includes(id)) this.data.ownedCharacters.push(id); changed = true; }
      else if (key === 'hats') { const ids = val === 'all' ? HAT_ORDER.slice() : val.split('|'); this.data.ownedHats = this.data.ownedHats || ['none']; for (const id of ids) if (HATS[id] && !this.data.ownedHats.includes(id)) this.data.ownedHats.push(id); changed = true; }
    });
    if (changed) {
      this.save();
      try { localStorage.setItem('zombiedash_restored', restore); } catch (e) {}
    }
    return changed;
  },

  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    this.save();
  },

  // ---- munten ----
  addCoins(n) { this.data.coins += n; this.save(); },
  rubies() { return this.data.rubies || 0; },
  addRubies(n) { this.data.rubies = (this.data.rubies || 0) + n; this.save(); },
  spendRubies(n) { if ((this.data.rubies || 0) < n) return false; this.data.rubies -= n; this.save(); return true; },
  spendCoins(n) {
    if (this.data.coins < n) return false;
    this.data.coins -= n; this.save(); return true;
  },

  // ---- munitie (blijvende voorraad) ----
  setAmmo(n) { this.data.ammo = Math.max(0, Math.min(AMMO_MAX, Math.round(n))); this.save(); },
  buyAmmo() {
    if (this.data.ammo >= AMMO_MAX) return false;
    if (!this.spendCoins(AMMO_PACK.cost)) return false;
    this.data.ammo = Math.min(AMMO_MAX, this.data.ammo + AMMO_PACK.amount);
    this.save();
    return true;
  },
  // ---- raketten ----
  setRockets(n) { this.data.rockets = Math.max(0, Math.round(n)); this.save(); },
  buyRocket() {
    if (!this.spendCoins(ROCKET_COST)) return false;
    this.data.rockets++;
    this.save();
    return true;
  },

  // ---- wapens ----
  ownsWeapon(id) { return this.data.ownedWeapons.includes(id); },
  buyWeapon(id) {
    const w = WEAPONS[id];
    if (!w || this.ownsWeapon(id)) return false;
    if (!this.spendCoins(w.cost)) return false;
    this.data.ownedWeapons.push(id);
    this.save();
    return true;
  },
  // rust uit in het juiste slot (melee of ranged) op basis van het wapentype
  equipWeapon(id) {
    if (!this.ownsWeapon(id)) return false;
    const w = WEAPONS[id];
    if (w.type === 'ranged') this.data.equippedRanged = id;
    else this.data.equippedMelee = id;
    this.save();
    return true;
  },
  isEquipped(id) {
    const w = WEAPONS[id];
    return w && (w.type === 'ranged' ? this.data.equippedRanged === id : this.data.equippedMelee === id);
  },

  // ---- characters ----
  ownsCharacter(id) { return this.data.ownedCharacters.includes(id); },
  buyCharacter(id) {
    const c = CHARACTERS[id];
    if (!c || this.ownsCharacter(id)) return false;
    if (c.journeyOnly) return false;                                   // alleen via Journey vrij te spelen
    if (playerLevel(this.data.xp || 0) < (c.lvl || 0)) return false;   // nog niet vrijgespeeld
    if (c.costRubies) { if (!this.spendRubies(c.costRubies)) return false; }   // sommige characters kosten robijnen i.p.v. munten
    else if (!this.spendCoins(c.cost || 0)) return false;
    this.data.ownedCharacters.push(id);
    this.save();
    return true;
  },
  equipCharacter(id) {
    if (!this.ownsCharacter(id)) return false;
    this.data.equippedCharacter = id; this.save(); return true;
  },

  // ---- character-leveling (per character tot lvl 20) ----
  charLevelOf(id) { return Math.max(1, Math.min(CHAR_MAX_LEVEL, (this.data.charLevel && this.data.charLevel[id]) || 1)); },
  charXpOf(id) { return (this.data.charXp && this.data.charXp[id]) || 0; },
  charStats(id) {
    const lvl = this.charLevelOf(id);
    return { lvl, hpBonus: charHpBonus(lvl), speedMul: charSpeedMul(lvl), abilityDurMul: charAbilityDurMul(lvl) };
  },
  // XP toevoegen aan een character (balk vult tot vol; bij max level niets meer)
  addCharXp(id, amount) {
    if (!id || !(amount > 0)) return;
    const lvl = this.charLevelOf(id);
    if (lvl >= CHAR_MAX_LEVEL) return;
    this.data.charXp = this.data.charXp || {};
    const need = charXpNeeded(lvl);
    this.data.charXp[id] = Math.min(need, (this.data.charXp[id] || 0) + amount);
    this.save();
  },
  charXpFull(id) {
    const lvl = this.charLevelOf(id);
    return lvl < CHAR_MAX_LEVEL && this.charXpOf(id) >= charXpNeeded(lvl);
  },
  charUpgradeCost(id) { return charUpgradeCost(CHARACTERS[id], this.charLevelOf(id)); },
  canUpgradeChar(id) { return this.charXpFull(id) && (this.data.coins || 0) >= this.charUpgradeCost(id); },
  upgradeChar(id) {
    if (!this.canUpgradeChar(id)) return false;
    this.data.coins -= this.charUpgradeCost(id);
    this.data.charLevel = this.data.charLevel || {};
    this.data.charLevel[id] = this.charLevelOf(id) + 1;
    this.data.charXp = this.data.charXp || {}; this.data.charXp[id] = 0;   // balk reset na upgrade
    this.save();
    return true;
  },

  // ---- hoeden (cosmetisch) ----
  ownsHat(id) { return id === 'none' || (this.data.ownedHats || []).includes(id); },
  buyHat(id) {
    const h = HATS[id];
    if (!h || this.ownsHat(id)) return false;
    if (h.journeyOnly) return false;                                   // alleen via Journey vrij te spelen
    if (playerLevel(this.data.xp || 0) < (h.lvl || 0)) return false;   // nog niet vrijgespeeld
    if (!this.spendCoins(h.cost)) return false;
    this.data.ownedHats.push(id);
    this.save();
    return true;
  },
  equipHat(id) {
    if (!this.ownsHat(id)) return false;
    this.data.equippedHat = id; this.save(); return true;
  },

  // ---- level-up: keert 300 munten per nieuw level uit; geeft info terug voor de popup ----
  claimLevelUps() {
    const cur = (typeof playerLevel === 'function') ? playerLevel(this.data.xp || 0) : 1;
    if (typeof this.data.level !== 'number') { this.data.level = cur; this.save(); return null; }
    if (cur > this.data.level) {
      const levels = cur - this.data.level, coins = levels * 300;
      this.data.coins = (this.data.coins || 0) + coins;
      this.data.level = cur;
      this.save();
      return { level: cur, levels, coins };
    }
    return null;
  },

  // ---- power-ups (inventaris + loadout) ----
  powerupCount(id) { return (this.data.powerups && this.data.powerups[id]) || 0; },
  buyPowerup(id) {
    const pu = SHOP_POWERUPS[id]; if (!pu) return false;
    if (!this.spendCoins(pu.cost)) return false;
    this.data.powerups = this.data.powerups || {};
    this.data.powerups[id] = (this.data.powerups[id] || 0) + 1;
    this.save(); return true;
  },
  // 1 exemplaar verbruiken (bij activeren in een match); geeft true als het lukte
  usePowerup(id) {
    if (this.powerupCount(id) <= 0) return false;
    this.data.powerups[id]--;
    if (this.data.powerups[id] <= 0) delete this.data.powerups[id];
    this.save(); return true;
  },
  // loadout (max 3): een power-up aan/uit zetten voor de volgende match
  loadout() { return (this.data.loadout || []).filter((id) => SHOP_POWERUPS[id]); },
  inLoadout(id) { return (this.data.loadout || []).includes(id); },
  toggleLoadout(id) {
    if (!SHOP_POWERUPS[id]) return false;
    this.data.loadout = this.data.loadout || [];
    const i = this.data.loadout.indexOf(id);
    if (i >= 0) this.data.loadout.splice(i, 1);
    else { if (this.data.loadout.length >= 3) return false; this.data.loadout.push(id); }
    this.save(); return true;
  },

  // ---- smederij: materialen + harnas ----
  materials() { return this.data.materials || (this.data.materials = { leather: 0, nails: 0, iron: 0, steel: 0 }); },
  addMaterial(id, n) { const m = this.materials(); m[id] = (m[id] || 0) + n; this.save(); },
  hasMaterials(cost) { const m = this.materials(); for (const k in cost) if ((m[k] || 0) < cost[k]) return false; return true; },
  spendMaterials(cost) { if (!this.hasMaterials(cost)) return false; const m = this.materials(); for (const k in cost) m[k] -= cost[k]; this.save(); return true; },
  ownedArmor() { return this.data.armor || (this.data.armor = {}); },
  hasArmor(id) { return !!this.ownedArmor()[id]; },
  armorDur(id) { const a = this.ownedArmor()[id]; return a ? (a.dur || 0) : 0; },
  equippedArmor() { return this.data.equippedArmor || (this.data.equippedArmor = { hat: null, chest: null, bottom: null, feet: null }); },
  equipArmor(id) {   // aan/uit (per slot)
    const p = ARMOR_PIECES[id]; if (!p || !this.hasArmor(id)) return false;
    const eq = this.equippedArmor();
    if (eq[p.slot] === id) { eq[p.slot] = null; this.save(); return true; }   // uitdoen mag altijd
    if (this.armorDur(id) <= 0) return false;                                  // kapot -> niet aan te doen
    eq[p.slot] = id; this.save(); return true;
  },
  // effectieve HP van een stuk: schaalt mee met de duurzaamheid (meer schade = minder HP)
  armorEffHp(id) {
    const p = ARMOR_PIECES[id]; if (!p) return 0;
    const dur = this.armorDur(id); if (dur <= 0) return 0;
    return Math.max(1, Math.round(p.hp * dur / p.maxDur));
  },
  // som van de (met duurzaamheid geschaalde) HP-bonus van de uitgeruste, niet-kapotte stukken
  armorHpBonus() {
    const eq = this.equippedArmor(); let hp = 0;
    for (const slot of ARMOR_SLOTS) { const id = eq[slot]; if (id && this.armorDur(id) > 0) hp += this.armorEffHp(id); }
    return hp;
  },
  // uitgeruste stukken (voor HUD/rendering): { slot: {id, piece, dur, maxDur, broken, effHp} }
  equippedArmorInfo() {
    const eq = this.equippedArmor(), out = {};
    for (const slot of ARMOR_SLOTS) { const id = eq[slot]; if (id && this.hasArmor(id)) { const p = ARMOR_PIECES[id]; const dur = this.armorDur(id); out[slot] = { id, piece: p, set: p.set, dur: dur, maxDur: p.maxDur, broken: dur <= 0, effHp: this.armorEffHp(id) }; } }
    return out;
  },
  craftCost(id, repair) {
    const p = ARMOR_PIECES[id]; if (!p) return null;
    if (!repair) return p.craft;
    const c = {}; for (const k in p.craft) c[k] = Math.max(1, Math.ceil(p.craft[k] / 2)); return c;   // reparatie = helft materiaal
  },
  craftMs(id, repair) { const p = ARMOR_PIECES[id]; if (!p) return 0; return repair ? Math.round(p.craftMs / 6) : p.craftMs; },   // reparatie = 1/6 van de smeedtijd (10min -> 30min -> 60min)
  canCraft(id, repair) {
    if (this.data.forge) return false;                                  // maar 1 tegelijk
    const p = ARMOR_PIECES[id]; if (!p) return false;
    if (repair) { if (!this.hasArmor(id) || this.armorDur(id) >= p.maxDur) return false; }
    else if (this.hasArmor(id)) return false;                           // elk stuk maak je maar 1x
    return this.hasMaterials(this.craftCost(id, repair));
  },
  startCraft(id, repair) {
    if (!this.canCraft(id, repair)) return false;
    this.spendMaterials(this.craftCost(id, repair));
    this.data.forge = { id, repair: !!repair, doneAt: this.now() + this.craftMs(id, repair) };
    this.save(); return true;
  },
  forge() { return this.data.forge || null; },
  forgeSecondsLeft() { const f = this.data.forge; if (!f) return -1; return Math.max(0, Math.ceil((f.doneAt - this.now()) / 1000)); },
  forgeReady() { const f = this.data.forge; return !!(f && this.now() >= f.doneAt); },
  forgeSkipCost() { const s = this.forgeSecondsLeft(); if (s <= 0) return 0; return Math.max(1, Math.ceil(s / 3600)); },   // 1 robijn / begonnen uur
  skipForge() { const f = this.data.forge; if (!f || this.now() >= f.doneAt) return false; if (!this.spendRubies(this.forgeSkipCost())) return false; f.doneAt = this.now(); this.save(); return true; },
  collectForge() {
    if (!this.forgeReady()) return null;
    const f = this.data.forge, p = ARMOR_PIECES[f.id], a = this.ownedArmor();
    if (!a[f.id]) a[f.id] = { dur: p.maxDur }; else a[f.id].dur = p.maxDur;   // nieuw of gerepareerd -> vol
    this.data.forge = null; this.save();
    return { id: f.id, repair: f.repair };
  },
  // slijtage na een match: verdeeld over de uitgeruste stukken op basis van geabsorbeerde schade
  applyArmorWear(absorbed) {
    if (!absorbed || absorbed <= 0) return;
    const eq = this.equippedArmor(), ids = [];
    for (const slot of ARMOR_SLOTS) { const id = eq[slot]; if (id && this.armorDur(id) > 0) ids.push(id); }
    if (!ids.length) return;
    const wear = Math.max(1, Math.round(absorbed * 0.14 / ids.length));   // slechts ~14% van de opgevangen schade -> gaat lang mee
    const a = this.ownedArmor();
    for (const id of ids) {
      a[id].dur = Math.max(0, a[id].dur - wear);
      if (a[id].dur <= 0) { const p = ARMOR_PIECES[id]; if (p && eq[p.slot] === id) eq[p.slot] = null; }   // kapot -> automatisch afgedaan
    }
    this.save();
  },

  // ---- kisten (loot uit online matches) ----
  now() { try { return Date.now(); } catch (e) { return 0; } },
  chests() { return this.data.chests || (this.data.chests = []); },
  canReceiveChest() { return this.chests().length < CHEST_SLOTS; },
  addChest(rarity) {
    if (!CHEST_TYPES[rarity] || !this.canReceiveChest()) return false;
    this.chests().push({ r: rarity, u: 0 }); this.save(); return true;
  },

  // ---- rank (matchmaking) ----
  rp() { return this.data.rp || 0; },
  rankIndex() { return rankForRp(this.rp()); },
  rank() { return RANKS[this.rankIndex()]; },
  winStreak() { return this.data.winStreak || 0; },
  rankProgress() {
    const rp = this.rp(), idx = rankForRp(rp), cur = RANKS[idx], next = RANKS[idx + 1] || null;
    const floor = cur.rp, ceil = next ? next.rp : cur.rp;
    const pct = next ? Math.max(0, Math.min(1, (rp - floor) / (ceil - floor))) : 1;
    return { rp, idx, rank: cur, next, toNext: next ? Math.max(0, ceil - rp) : 0, pct };
  },
  // een afgeronde matchmaking-match verwerken -> RP + eventuele rank-up-beloningen
  applyRankedResult(opts) {
    opts = opts || {};
    const d = this.data;
    const oldRp = d.rp || 0, oldIdx = rankForRp(oldRp);
    let delta = 0, streakBonus = 0, higherBonus = 0;
    if (opts.quit) { delta = RANK_RP.quit; d.winStreak = 0; }
    else if (opts.won) {
      delta = RANK_RP.win;
      d.winStreak = (d.winStreak || 0) + 1;
      if (d.winStreak >= 3 && d.winStreak % 3 === 0) { streakBonus = RANK_RP.streakBonus; delta += streakBonus; }
      if (typeof opts.oppRp === 'number' && rankForRp(opts.oppRp) > oldIdx) { higherBonus = RANK_RP.higherRankBonus; delta += higherBonus; }
    } else { delta = RANK_RP.loss; d.winStreak = 0; }
    let newRp = Math.max(0, oldRp + delta);
    const floorRp = rankFloorRp(Math.max(d.rankRewarded || 0, oldIdx));   // checkpoint-vloer: onder Brons/Zilver/Goud III of Champion zak je niet meer terug
    if (newRp < floorRp) newRp = floorRp;
    d.rp = newRp;
    const newIdx = rankForRp(newRp);
    // beloningen: eenmalig per bereikte rank (rankRewarded = hoogste ooit uitgekeerd)
    const rewarded = d.rankRewarded || 0, rewards = [];
    if (newIdx > rewarded) {
      for (let i = rewarded + 1; i <= newIdx; i++) {
        const rk = RANKS[i]; let gotChest = false;
        if (rk.coins) d.coins = (d.coins || 0) + rk.coins;
        if (rk.chest && this.canReceiveChest()) { this.chests().push({ r: rk.chest, u: 0 }); gotChest = true; }
        rewards.push({ rank: rk, coins: rk.coins || 0, chest: gotChest ? rk.chest : null });
      }
      d.rankRewarded = newIdx;
    }
    this.save();
    return { delta, streakBonus, higherBonus, oldRp, newRp, oldIdx, newIdx, rankedUp: newIdx > oldIdx, demoted: newIdx < oldIdx, rewards, streak: d.winStreak };
  },
  startChest(i) {
    const c = this.chests()[i]; if (!c || c.u > 0) return false;
    c.u = this.now() + CHEST_TYPES[c.r].dur; this.save(); return true;
  },
  chestSecondsLeft(i) {
    const c = this.chests()[i]; if (!c || c.u <= 0) return -1;      // -1 = nog niet gestart
    return Math.max(0, Math.ceil((c.u - this.now()) / 1000));
  },
  chestReady(i) { const c = this.chests()[i]; return !!(c && c.u > 0 && this.now() >= c.u); },
  // robijnen-kosten om de resterende wachttijd over te slaan (1 robijn per begonnen uur, min 1)
  chestSkipCost(i) { const s = this.chestSecondsLeft(i); if (s <= 0) return 0; return Math.max(1, Math.ceil(s / 3600)); },
  skipChest(i) {   // betaal robijnen -> kist meteen klaar
    const c = this.chests()[i]; if (!c || c.u <= 0 || this.now() >= c.u) return false;
    if (!this.spendRubies(this.chestSkipCost(i))) return false;
    c.u = this.now(); this.save(); return true;
  },
  // kans op een kist na een online match (win = grotere kans); geeft de rarity terug of null
  rollChestDrop(won) {
    if (!this.canReceiveChest()) return null;
    if (Math.random() >= (won ? CHEST_WIN_CHANCE : CHEST_LOSS_CHANCE)) return null;
    let tot = 0; for (const k of CHEST_ORDER) tot += CHEST_RARITY_WEIGHTS[k];
    let r = Math.random() * tot, rarity = 'common';
    for (const k of CHEST_ORDER) { r -= CHEST_RARITY_WEIGHTS[k]; if (r <= 0) { rarity = k; break; } }
    this.addChest(rarity);
    return rarity;
  },
  // beloningen bepalen voor een kist-rarity
  rollChestRewards(rarity) {
    const t = CHEST_TYPES[rarity] || CHEST_TYPES.common;
    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const wpick = (pairs) => { let tot = 0; for (const p of pairs) tot += p[1]; let r = Math.random() * tot; for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; } return pairs[0][0]; };
    const gold = ri(t.gold[0], t.gold[1]), xp = ri(t.xp[0], t.xp[1]);
    const pus = {}; const add = (id) => { pus[id] = (pus[id] || 0) + 1; };
    const simple = ['heal', 'shield', 'speed', 'rage'];
    if (rarity === 'common') { if (Math.random() < 0.45) add(pick(simple)); }
    else if (rarity === 'rare') { if (Math.random() < 0.75) add(pick(simple)); if (Math.random() < 0.30) add(pick(simple)); }
    else if (rarity === 'epic') {
      const pool = [['heal', 5], ['shield', 5], ['speed', 5], ['rage', 5],
        ['fireball', 3], ['beachball', 3], ['coco', 3], ['boom', 3], ['dart', 3], ['cannon', 2.5],
        ['ak47', 2], ['rocket', 1.3]];
      const n = ri(2, 4); for (let i = 0; i < n; i++) add(wpick(pool));
    } else {   // legendary: ALLE power-ups uit het spel, de goede zeldzamer
      const pool = [['heal', 6], ['shield', 6], ['speed', 6], ['rage', 6],
        ['fireball', 3], ['beachball', 3], ['coco', 3], ['boom', 3], ['dart', 3], ['cannon', 2.6],
        ['ak47', 2.2], ['rocket', 1.6], ['dragon', 1], ['rock', 1.4], ['lightning', 1.2]];
      const n = ri(5, 8); for (let i = 0; i < n; i++) add(wpick(pool));
    }
    // smeed-materialen (schalen met rarity) — de nieuwe drop
    const mats = {}; const addMat = (id, n2) => { if (n2 > 0) mats[id] = (mats[id] || 0) + n2; };
    if (rarity === 'common') { addMat('leather', ri(1, 3)); if (Math.random() < 0.5) addMat('nails', ri(1, 2)); }
    else if (rarity === 'rare') { addMat('leather', ri(2, 4)); addMat('nails', ri(1, 3)); if (Math.random() < 0.4) addMat('iron', ri(1, 2)); }
    else if (rarity === 'epic') { addMat('nails', ri(2, 4)); addMat('iron', ri(2, 4)); if (Math.random() < 0.4) addMat('steel', 1); }
    else { addMat('iron', ri(3, 5)); addMat('steel', ri(1, 3)); addMat('nails', ri(2, 4)); }
    // robijnen: alleen uit epic (2-10) en legendary (5-20)
    let rubies = 0;
    if (rarity === 'epic') rubies = ri(2, 10);
    else if (rarity === 'legendary') rubies = ri(5, 20);
    return { rarity, gold, xp, pus, mats, rubies };
  },
  // een klaar-staande kist ophalen -> beloning toepassen + slot vrijmaken
  collectChest(i) {
    if (!this.chestReady(i)) return null;
    const c = this.chests()[i];
    const rw = this.rollChestRewards(c.r);
    this.data.coins = (this.data.coins || 0) + rw.gold;
    this.data.xp = (this.data.xp || 0) + rw.xp;
    this.data.powerups = this.data.powerups || {};
    for (const id in rw.pus) this.data.powerups[id] = (this.data.powerups[id] || 0) + rw.pus[id];
    if (rw.mats) { const m = this.materials(); for (const k in rw.mats) m[k] = (m[k] || 0) + rw.mats[k]; }   // materialen bijschrijven
    if (rw.rubies) this.data.rubies = (this.data.rubies || 0) + rw.rubies;                                    // robijnen bijschrijven
    this.chests().splice(i, 1);
    this.save();
    return rw;
  },

  // ---- Journey (singleplayer) — per wereld (world 1 = eiland, 2 = tempel) ----
  journeyCleared(level, world) { return (this.data['journey' + (world || 1)] || 0) >= level; },
  journeyUnlocked(level, world) { return level <= (this.data['journey' + (world || 1)] || 0) + 1; },
  // markeer een level als gehaald + ken de unlocks toe; geeft een lijst met nieuwe items terug
  clearJourneyLevel(level, world) {
    world = world || 1;
    const got = [], key = 'journey' + world;
    if (level > (this.data[key] || 0)) this.data[key] = level;
    const unl = (JOURNEY[world] && JOURNEY[world].unlocks && JOURNEY[world].unlocks[level]) || null;
    if (unl) {
      if (unl.char && !this.ownsCharacter(unl.char)) { this.data.ownedCharacters.push(unl.char); got.push({ type: 'char', id: unl.char, name: (CHARACTERS[unl.char] || {}).name }); }
      if (unl.hat && !this.ownsHat(unl.hat)) { (this.data.ownedHats = this.data.ownedHats || ['none']).push(unl.hat); got.push({ type: 'hat', id: unl.hat, name: (HATS[unl.hat] || {}).name }); }
    }
    this.save();
    return got;
  },

  // ---- arena (Zombie Knock-out, oude mode) ----
  todayStr() { try { return new Date().toISOString().slice(0, 10); } catch (e) { return 'x'; } },
  arenaPlaysLeft() {
    const d = this.todayStr();
    if (this.data.arenaPlays.date !== d) return ARENA_PLAYS_PER_DAY;
    return Math.max(0, ARENA_PLAYS_PER_DAY - this.data.arenaPlays.count);
  },
  useArenaPlay() {
    const d = this.todayStr();
    if (this.data.arenaPlays.date !== d) this.data.arenaPlays = { date: d, count: 0 };
    this.data.arenaPlays.count++;
    this.save();
  },
  setArenaBest(round) {
    if (round > this.data.arenaBest) { this.data.arenaBest = round; this.save(); return true; }
    return false;
  },

  // ---- levels ----
  highestCleared(worldId) { return this.data.progress[String(worldId)] || 0; },
  isLevelUnlocked(worldId, levelId) { return levelId <= this.highestCleared(worldId) + 1; },
  clearLevel(worldId, levelId) {
    const key = String(worldId);
    if (levelId > (this.data.progress[key] || 0)) {
      this.data.progress[key] = levelId;
      this.save();
    }
  },
};
