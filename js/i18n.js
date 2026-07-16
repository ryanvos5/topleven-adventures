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
      tile_smash: 'Heroes', badge_online: 'Online', coming_soon: 'Coming Soon!',
      training_lobby: 'Training Lobby', blacksmith: 'Blacksmith',
      shop: 'Shop', inventory: 'Inventory', friends: 'Friends', leaderboard: 'Leaderboard',
      guest: 'Guest', lvl: 'Lvl',
      // ---- instellingen ----
      settings: 'Settings', account: 'Account', login_account: 'Log in / account',
      change_name: 'Change name', logout: 'Log out', delete_account: 'Delete account',
      sound: 'Sound', sound_on: 'Sound: On', sound_off: 'Sound: Off',
      music_on: 'Music: On', music_off: 'Music: Off', sfx_on: 'Sounds: On', sfx_off: 'Sounds: Off', melee_weapons: 'MELEE WEAPONS', empty: 'Empty',
      language: 'Language', update_fresh: 'Update (fresh version)', new_game: 'New game (wipe progress)',
      // ---- account / auth ----
      auth_login: 'LOG IN', auth_register: 'Register', auth_sub: 'Optional — keeps your progress on every device.',
      auth_no_account: 'No account yet? Register', auth_have_account: 'Already have an account? Log in',
      auth_apple: 'Continue with Apple', auth_google: 'Continue with Google', auth_or: 'or with e-mail',
      auth_consent: 'By continuing you agree to our', privacy_policy: 'Privacy Policy',
      ph_nick: 'Nickname', ph_email: 'E-mail', ph_pass: 'Password (min. 6 characters)',
      // ---- shop / inventaris ----
      shop_title: 'SHOP', inv_title: 'INVENTORY',
      tab_characters: 'Heroes', tab_hats: 'Hats', tab_powerups: 'Power-ups',
      tab_armor: 'Armour', tab_materials: 'Materials', tab_crates: 'Crates', tab_rubies: 'Rubies',
      coins: 'Coins', rubies: 'Rubies',
      buy: 'BUY', equip: 'EQUIP', equipped: 'EQUIPPED', in_loadout: 'IN LOADOUT', choose: 'CHOOSE',
      put_on: 'PUT ON', take_off: 'OFF', broken: 'BROKEN', health_word: 'Health',
      test_map_label: 'Test map (vs bot)', test_map_random: 'Random',
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
      // ---- friends / chat / lobby / training ----
      friends_title: 'FRIENDS', ftab_list: 'Friends', ftab_add: 'Add', add: 'Add', send: 'Send',
      add_friend_hint: 'Add a friend by their username.', ph_username: 'Username…', ph_message: 'Message…',
      friends_login: 'Log in via the menu (▸ account) to add friends and chat.',
      challenge: 'Challenge', invite_title: 'INVITE', join: 'JOIN', ignore: 'IGNORE',
      vs_title: '1 VS 1 ONLINE', vs_sub: 'Knock your opponent off the platform! First to 5 points wins.',
      searching: 'Searching for an opponent…', mm_post: 's left — otherwise you face a strong bot',
      create_room: 'CREATE ROOM', play_vs_bot: 'PLAY VS BOT', code: 'CODE',
      room_code: 'Room code: ', waiting_opponent: 'Waiting for opponent…',
      random_map: 'Picking a random map…', vote_map: 'Vote for a map: ', rounds_label: 'Rounds: ',
      host_rounds: 'The host chooses the number of rounds.', pick_next_map: 'Pick the next map:',
      attempts_left: 'Attempts left today: ', from_checkpoint: 'Start from checkpoint', back_to_menu: 'Back to menu',
      settings_word: 'Settings',
      winner: 'WINNER', won_title: 'YOU WON!', lost_title: 'DEFEAT', final_score: 'Final score: ',
      quit: 'Quit', leave: 'Leave', choose_powerups: 'Choose power-ups', choose_a_powerup: 'CHOOSE A POWER-UP',
      paused: 'PAUSED', resume: 'CONTINUE', restart: 'RETRY', to_menu: 'TO MENU', lobby_word: 'LOBBY',
      dead: 'DEAD', out_word: 'OUT!', zombies_killed: 'Zombies killed: ', coins_missed: 'Coins missed: ',
      reach_finish: 'Reach the finish to earn coins!', retry_word: 'RETRY', levels_word: 'LEVELS', menu_word: 'MENU',
      new_record: 'NEW RECORD!', round_reached: 'Round reached: ', coins_earned2: 'Coins earned: ', record_round: 'Record: round ', again_word: 'AGAIN',
      rotate_phone: 'Rotate your phone', rotate_sub: 'landscape plays best', training_lobby_title: 'TRAINING LOBBY',
      select_level: 'SELECT LEVEL', remove_powerup: 'Remove power-up', level_complete: 'LEVEL COMPLETE!',
      next_level: 'NEXT LEVEL', replay_note: 'Replayed level — fixed 15 coins',
      train_hint: 'Tap a power-up to grab and try it. When you die you respawn immediately.',
    },
    nl: {
      back: 'Terug', close: 'Sluiten', cancel: 'Annuleren', save: 'Opslaan', ok: 'OK', play: 'Play',
      tile_journey: 'Journey', tile_journey_sub_w1: 'Wereld 1', badge_solo: 'Singleplayer',
      tile_smash: 'Heroes', badge_online: 'Online', coming_soon: 'Coming Soon!',
      training_lobby: 'Training Lobby', blacksmith: 'Blacksmith',
      shop: 'Shop', inventory: 'Inventaris', friends: 'Friends', leaderboard: 'Leaderboard',
      guest: 'Gast', lvl: 'Lvl',
      settings: 'Instellingen', account: 'Account', login_account: 'Inloggen / account',
      change_name: 'Naam wijzigen', logout: 'Uitloggen', delete_account: 'Account verwijderen',
      sound: 'Geluid', sound_on: 'Geluid: Aan', sound_off: 'Geluid: Uit',
      music_on: 'Muziek: Aan', music_off: 'Muziek: Uit', sfx_on: 'Geluid: Aan', sfx_off: 'Geluid: Uit', melee_weapons: 'MELEE-WAPENS', empty: 'Leeg',
      language: 'Taal', update_fresh: 'Update (verse versie)', new_game: 'Nieuw spel (wis voortgang)',
      auth_login: 'INLOGGEN', auth_register: 'Registreren', auth_sub: 'Optioneel — zo blijft je voortgang op elk toestel bewaard.',
      auth_no_account: 'Nog geen account? Registreren', auth_have_account: 'Al een account? Inloggen',
      auth_apple: 'Doorgaan met Apple', auth_google: 'Doorgaan met Google', auth_or: 'of met e-mail',
      auth_consent: 'Door verder te gaan ga je akkoord met ons', privacy_policy: 'Privacybeleid',
      ph_nick: 'Nickname', ph_email: 'E-mail', ph_pass: 'Wachtwoord (min. 6 tekens)',
      shop_title: 'SHOP', inv_title: 'INVENTARIS',
      tab_characters: 'Heroes', tab_hats: 'Hoeden', tab_powerups: 'Power-ups',
      tab_armor: 'Harnas', tab_materials: 'Materiaal', tab_crates: 'Crates', tab_rubies: 'Robijnen',
      coins: 'Munten', rubies: 'Robijnen',
      buy: 'KOOP', equip: 'UITRUSTEN', equipped: 'UITGERUST', in_loadout: 'IN LOADOUT', choose: 'KIES',
      put_on: 'OPZETTEN', take_off: 'AF', broken: 'KAPOT', health_word: 'Health',
      test_map_label: 'Test-map (vs bot)', test_map_random: 'Willekeurig',
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
      friends_title: 'VRIENDEN', ftab_list: 'Vrienden', ftab_add: 'Toevoegen', add: 'Toevoegen', send: 'Sturen',
      add_friend_hint: 'Voeg een vriend toe met zijn gebruikersnaam.', ph_username: 'Gebruikersnaam…', ph_message: 'Bericht…',
      friends_login: 'Log in via het menu (▸ account) om vrienden toe te voegen en te chatten.',
      challenge: 'Uitdagen', invite_title: 'UITNODIGING', join: 'MEEDOEN', ignore: 'NEGEREN',
      vs_title: '1 VS 1 ONLINE', vs_sub: 'Sla je tegenstander van het platform! Eerst bij 5 punten wint.',
      searching: 'Zoeken naar tegenstander…', mm_post: 's — anders speel je tegen een sterke bot',
      create_room: 'KAMER MAKEN', play_vs_bot: 'SPEEL TEGEN BOT', code: 'CODE',
      room_code: 'Kamercode: ', waiting_opponent: 'Wachten op tegenstander…',
      random_map: 'Willekeurige map wordt gekozen…', vote_map: 'Stem op een map: ', rounds_label: 'Aantal rondes: ',
      host_rounds: 'De host kiest het aantal rondes.', pick_next_map: 'Kies de volgende map:',
      attempts_left: 'Pogingen vandaag over: ', from_checkpoint: 'Start vanaf checkpoint', back_to_menu: 'Terug naar menu',
      settings_word: 'Instellingen',
      winner: 'WINNAAR', won_title: 'GEWONNEN!', lost_title: 'VERLOREN', final_score: 'Eindstand: ',
      quit: 'Stoppen', leave: 'Verlaten', choose_powerups: 'Power-ups kiezen', choose_a_powerup: 'KIES EEN POWER-UP',
      paused: 'GEPAUZEERD', resume: 'DOORGAAN', restart: 'OPNIEUW', to_menu: 'NAAR MENU', lobby_word: 'LOBBY',
      dead: 'DOOD', out_word: 'AF!', zombies_killed: 'Zombies gedood: ', coins_missed: 'Munten misgelopen: ',
      reach_finish: 'Haal de finish om munten te verdienen!', retry_word: 'OPNIEUW', levels_word: 'LEVELS', menu_word: 'MENU',
      new_record: 'NIEUW RECORD!', round_reached: 'Ronde bereikt: ', coins_earned2: 'Munten verdiend: ', record_round: 'Record: ronde ', again_word: 'NOG EEN KEER',
      rotate_phone: 'Draai je telefoon', rotate_sub: 'landscape speelt het lekkerst', training_lobby_title: 'TRAINING LOBBY',
      select_level: 'KIES LEVEL', remove_powerup: 'Power-up verwijderen', level_complete: 'LEVEL VOLTOOID!',
      next_level: 'VOLGENDE LEVEL', replay_note: 'Herhaald level — vaste 15 munten',
      train_hint: "Tik een power-up om 'm te pakken en uit te proberen. Bij dood spawn je meteen weer.",
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
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.setAttribute('title', this.t(el.getAttribute('data-i18n-title'))); });
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
      just: { desc: 'Stocky, slow but strong (+20 HP, +20% melee). Ground-pound deals area damage on landing.' },
      timo: { desc: 'Small & agile (small hitbox). Has an extra (smaller) double jump.' },
      vince: { desc: 'Balanced. Every 30s a fire aura (5s): whoever you touch burns for 3s.' },
      jenze: { desc: 'Big & tough: +40 HP, +30% melee, a bit slower.' },
      ricky: { desc: 'Every 15s, 3s of RAGE (2× damage). 85 HP.' },
      yarno: { desc: 'Balanced, a bit faster. Starts with a dagger.' },
      skeleton: { name: 'Skeleton Knight', desc: 'Skeleton knight (250 rubies). Soul Drain: steals 20 HP from your opponent — 20 damage and you gain +20 HP.' },
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
      longreach: { name: 'Long Reach', desc: 'Tygo stretches his arms and makes a huge swing: 40% more reach and slightly more knockback for 6s. No extra damage, just more control.' },
      fireaura10: { name: 'Fire Aura', desc: 'Fire aura 6s: whoever you touch burns.' },
      triplejump: { name: 'Double Jump', desc: 'An extra double jump — for the rest of the match.' },
      acrobat: { name: 'Acrobat', desc: 'Backflip: jumps over attacks (briefly invulnerable) and lands with a small shockwave. Low damage, high mobility.' },
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
      souldrain: { name: 'Soul Drain', desc: 'Steals 20 HP from your opponent: 20 damage and you gain +20 HP.' },
    },
    powerups: {
      heal: { name: 'Medipack', desc: 'Instantly restores 40 HP.' },
      shield: { name: 'Shield', desc: 'Shield that absorbs a big hit.' },
      speed: { name: 'Speed', desc: 'Move a lot faster for a bit.' },
      rage: { name: 'Rage', desc: 'A lot more hit damage for a bit.' },
      fireball: { name: 'Fireball', desc: '3 fireballs that also set enemies alight.' },
      dragon: { name: 'Dragon', desc: 'Summon a dragon that breathes fire at your opponent.' },
      smokevanish: { name: 'Smoke Vanish', desc: 'Turn invisible for 3s and leave a smoke cloud behind.' },
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

// ---- cutscene-onderschriften: NL blijft in game.js (bron); Engelse overlay hieronder ----
I18N.CUT_EN = {
  'Na een zware storm word je wakker op een verlaten strand…': 'After a heavy storm you wake up on a deserted beach…',
  'Je schip is verdwenen — overal liggen wrakstukken.': 'Your ship is gone — wreckage everywhere.',
  'In de verte zie je een dicht oerwoud… en je hoort vreemde geluiden.': 'In the distance you see a dense jungle… and you hear strange sounds.',
  'Je loopt het oerwoud in… en wordt plots omsingeld door mensapen.': 'You walk into the jungle… and are suddenly surrounded by apes.',
  'Ze staren je woedend aan en laten dreigende kreten horen.': 'They glare at you furiously and let out threatening cries.',
  'Je merkt meteen dat je hier niet welkom bent…': 'You sense at once that you are not welcome here…',
  'De leider — de GORILLA KING — brult luid en wijst naar jou!': 'The leader — the GORILLA KING — roars loudly and points at you!',
  'De GORILLA KING en de hele groep zetten de achtervolging in!': 'The GORILLA KING and the whole group give chase!',
  'Er is maar één optie: VECHT!': 'There is only one option: FIGHT!',
  'Met de laatste slag versla je de machtige GORILLA KING… de jungle wordt eindelijk stil.': 'With the final blow you defeat the mighty GORILLA KING… the jungle finally falls silent.',
  'Tussen de ruïnes ontdek je een verborgen pad uit het dichte oerwoud.': 'Among the ruins you discover a hidden path out of the dense jungle.',
  'Voor je liggen eeuwenoude tempels… maar een vijandige stam INDIANEN wacht je al op.': 'Ancient temples lie before you… but a hostile tribe of WARRIORS already awaits you.',
  'Voorzichtig zet je een stap tussen de oude stenen tempels.': 'Carefully you step between the old stone temples.',
  'Plotseling verschijnen krijgers uit de schaduwen — met speren en bogen.': 'Suddenly warriors appear from the shadows — with spears and bows.',
  'Ze zien je als een indringer en maken zich klaar voor de aanval.': 'They see you as an intruder and ready themselves to attack.',
  'De STAMLEIDER stapt naar voren en geeft een luid strijdsein!': 'The CHIEFTAIN steps forward and gives a loud battle cry!',
  'De krijgers omsingelen je en blokkeren alle uitgangen.': 'The warriors surround you and block every exit.',
  'Er is nog maar één optie: vecht je een weg door de tempels!': 'Only one option remains: fight your way through the temples!',
  'Je verslaat de laatste vijanden… en plots wordt het doodstil.': 'You defeat the last enemies… and suddenly it goes dead quiet.',
  'Tussen de bomen hoor je snelle voetstappen — maar je ziet niemand.': 'Between the trees you hear quick footsteps — but you see no one.',
  'Iets houdt je vanuit de schaduwen nauwlettend in de gaten…': 'Something watches you closely from the shadows…',
  'Uit de struiken springt een kleine, gespierde krijger: BONZO!': 'From the bushes leaps a small, muscular warrior: BONZO!',
  'Hij grijnst, slaat op zijn borst en daagt je uit.': 'He grins, beats his chest and challenges you.',
  'Laat je niet misleiden door zijn formaat — hij is razendsnel en agressief.': 'Don’t be fooled by his size — he is lightning fast and aggressive.',
  'Bonzo sprint met hoge snelheid op je af!': 'Bonzo sprints at you at high speed!',
  'Zijn aanvallen zijn snel, onvoorspelbaar en dodelijk.': 'His attacks are fast, unpredictable and deadly.',
  'Versla BONZO voordat hij jóu uitschakelt — VECHT!': 'Defeat BONZO before he takes YOU out — FIGHT!',
  'Terwijl je dieper de jungle in loopt, begint de grond zacht te trillen.': 'As you walk deeper into the jungle, the ground starts to tremble softly.',
  'Gebroken bomen en enorme voetafdrukken liggen verspreid om je heen.': 'Broken trees and huge footprints lie scattered around you.',
  'Je voelt dat iets gigantisch dichtbij is…': 'You sense something gigantic is near…',
  'Uit de dichte begroeiing verschijnt KOBA, een enorme gespierde mensaap.': 'From the thick undergrowth appears KOBA, an enormous muscular ape.',
  'Met een oorverdovende brul slaat hij op zijn borst en staart je woedend aan.': 'With a deafening roar he beats his chest and glares at you furiously.',
  'Zijn kracht is ongekend en hij lijkt vastbesloten je tegen te houden.': 'His strength is unmatched and he seems determined to stop you.',
  'Koba zet een stap naar voren en de grond beeft onder zijn gewicht.': 'Koba steps forward and the ground quakes under his weight.',
  'Ontsnappen is geen optie — het gevecht is begonnen.': 'Escape is not an option — the fight has begun.',
  'Versla KOBA om je weg dieper de jungle in vrij te maken — VECHT!': 'Defeat KOBA to clear your way deeper into the jungle — FIGHT!',
  'Na een lange tocht bereik je een eeuwenoude troon diep in de jungle.': 'After a long trek you reach an ancient throne deep in the jungle.',
  'Overal liggen botten en kapotgeslagen wapens van eerdere uitdagers.': 'Bones and shattered weapons of earlier challengers lie everywhere.',
  'Een ijzige stilte hangt in de lucht…': 'An icy silence hangs in the air…',
  'Langzaam staat de GORILLA KING op van zijn stenen troon.': 'Slowly the GORILLA KING rises from his stone throne.',
  'Met een oorverdovende brul slaat hij op zijn borst en kijkt hij je recht aan.': 'With a deafening roar he beats his chest and looks you dead in the eye.',
  'Zijn enorme kracht maakt meteen duidelijk: dit is de heerser van de jungle.': 'His enormous strength makes it clear at once: this is the ruler of the jungle.',
  'De GORILLA KING stapt van zijn troon en blokkeert de enige uitweg.': 'The GORILLA KING steps off his throne and blocks the only way out.',
  'Hij heft zijn gigantische vuisten en daagt je uit voor een laatste gevecht.': 'He raises his gigantic fists and challenges you to a final fight.',
  'Versla de GORILLA KING en ontsnap uit de jungle — VECHT!': 'Defeat the GORILLA KING and escape the jungle — FIGHT!',
  'Na een lange reis bereik je de ingang van een gigantische eeuwenoude tempel.': 'After a long journey you reach the entrance of a gigantic ancient temple.',
  'Hoge stenen pilaren en mysterieuze symbolen wijzen erop dat niemand hier welkom is.': 'Tall stone pillars and mysterious symbols make clear that no one is welcome here.',
  'De zware tempeldeuren beginnen langzaam open te schuiven…': 'The heavy temple doors slowly begin to slide open…',
  'Uit de duisternis verschijnt de TEMPLE BEWAKER, gehuld in eeuwenoud pantser.': 'From the darkness appears the TEMPLE GUARDIAN, clad in ancient armour.',
  'Hij heft zijn wapen en gaat zwijgend voor de ingang staan.': 'He raises his weapon and stands silently before the entrance.',
  'Niemand mag de tempel betreden zolang hij nog leeft.': 'No one may enter the temple while he still lives.',
  'De TEMPLE BEWAKER zet een stap naar voren en sluit de doorgang af.': 'The TEMPLE GUARDIAN steps forward and seals the passage.',
  'Zijn ogen lichten op terwijl hij zich klaarmaakt voor de strijd.': 'His eyes light up as he readies himself for battle.',
  'Versla de TEMPLE BEWAKER en baan je een weg naar de geheimen van de tempel — VECHT!': 'Defeat the TEMPLE GUARDIAN and carve your way to the temple’s secrets — FIGHT!',
  'Je loopt dieper de eeuwenoude tempel in, waar het donker en doodstil is.': 'You walk deeper into the ancient temple, where it is dark and dead quiet.',
  'Fakkels flikkeren langs de muren en vreemde tekens bedekken de stenen.': 'Torches flicker along the walls and strange symbols cover the stones.',
  'In het midden van de zaal zit een oude monnik te mediteren.': 'In the middle of the hall an old monk sits meditating.',
  'Langzaam opent de monnik zijn ogen en kijkt hij je streng aan.': 'Slowly the monk opens his eyes and looks at you sternly.',
  'Zonder een woord te zeggen staat hij op en grijpt zijn wapen.': 'Without a word he stands up and grabs his weapon.',
  'Je bent niet welkom in zijn tempel.': 'You are not welcome in his temple.',
  'De oude monnik neemt een gevechtshouding aan en wijst naar de uitgang.': 'The old monk takes a fighting stance and points to the exit.',
  'Hij zal je niet verder laten gaan zonder een gevecht.': 'He will not let you pass without a fight.',
  'Bereid je voor en versla de oude monnik — VECHT!': 'Get ready and defeat the old monk — FIGHT!',
  'Je bereikt een donkere schatkamer vol goud, juwelen en oude relikwieën.': 'You reach a dark treasure chamber full of gold, jewels and ancient relics.',
  'Alles lijkt verlaten, maar de stilte voelt onheilspellend aan.': 'Everything seems abandoned, but the silence feels ominous.',
  'Terwijl je een stap vooruit zet, doven de fakkels plotseling uit…': 'As you step forward, the torches suddenly go out…',
  'Uit de schaduwen verschijnt geruisloos een mysterieuze NINJA.': 'From the shadows a mysterious NINJA appears without a sound.',
  'Met zijn zwaard in de hand blokkeert hij de enige uitgang.': 'Sword in hand, he blocks the only exit.',
  'Hij is de bewaker van de schat en zal niemand laten ontsnappen.': 'He is the guardian of the treasure and will let no one escape.',
  'De NINJA pakt zijn ninja sterren en neemt een gevechtshouding aan.': 'The NINJA draws his throwing stars and takes a fighting stance.',
  'Zijn snelheid en precisie maken hem een levensgevaarlijke tegenstander.': 'His speed and precision make him a deadly opponent.',
  'Versla de NINJA en claim de schat als jouw beloning — VECHT!': 'Defeat the NINJA and claim the treasure as your reward — FIGHT!',
  'De ninja valt op de grond en verdwijnt langzaam in de schaduwen…': 'The ninja falls to the ground and slowly vanishes into the shadows…',
  'De schatkamer is eindelijk veilig.': 'The treasure chamber is finally safe.',
  'Het goud en de robijnen liggen voor het oprapen.': 'The gold and the rubies are there for the taking.',
  'Je vult je tas met zoveel goud en robijnen als je kunt dragen.': 'You fill your bag with as much gold and rubies as you can carry.',
  'Tussen de schatten ontdek je een oude kaart en een verborgen hendel.': 'Among the treasures you discover an old map and a hidden lever.',
  'Met een zwaar gerommel schuift een geheime doorgang open…': 'With a heavy rumble a secret passage slides open…',
  'Je volgt de geheime tunnel en laat de tempel achter je.': 'You follow the secret tunnel and leave the temple behind.',
  'Het daglicht schijnt je tegemoet terwijl je de uitgang bereikt.': 'Daylight shines toward you as you reach the exit.',
  'Met de schat op zak begin je aan je volgende avontuur.': 'With the treasure in your pack, you set off on your next adventure.',
  'Wordt vervolgd…': 'To be continued…',
};
I18N.cut = function (s) { return this.lang === 'en' ? (this.CUT_EN[s] || s) : s; };

// ---- losse dynamische UI-teksten: NL blijft bron, Engelse overlay hieronder (tl('...')) ----
I18N.UI_EN = {
  'Uit de match gezet — te lang weg (AFK). Je verliest.': 'Removed from the match — away too long (AFK). You lose.',
  'TIJD!': 'TIME!', 'Jij': 'You', 'Tegenstander': 'Opponent', 'NIET VLUCHTEN — VAL AAN!': "DON'T RUN — ATTACK!",
  'Tegenstander gevonden!': 'Opponent found!', 'Geen online speler gevonden — Bot Lv ': 'No online player found — Bot Lv ',
  'Speciale ability': 'Special Ability', '(vol)': '(full)',
  // rank-scherm
  'naar': 'to', 'kist': 'chest', 'JIJ': 'YOU', 'Winst': 'Win', 'Verlies': 'Loss', 'Hogere rank': 'Higher rank',
  // 1v1 uitslag-scherm (onder de Final score)
  'munten': 'coins', 'Winreeks': 'Win streak', 'Hogere rank verslagen': 'Beat a higher rank', 'NIEUWE RANK': 'NEW RANK',
  '(log in om je rank & munten mee te tellen)': '(log in to count your rank & coins)',
  'Tegen de bot — telt niet mee voor rank of XP': "Against the bot — doesn't count for rank or XP",
  'Tegenstander heeft de match verlaten.': 'Opponent left the match.',
  // map-intro-hints
  'Stun-darts schieten door de arena': 'Stun darts fly across the arena',
  'Pas op voor de zeemonster-tentakel': 'Watch out for the sea-monster tentacle',
  'Lavastraal barst uit het midden': 'A lava jet erupts from the center',
  'Deuren teleporteren je naar de overkant': 'Doors teleport you across',
  'Vogels + inzakkende wolk-platforms': 'Birds + collapsing cloud platforms',
  'Een duikende draak knalt je van de map': 'A diving dragon blasts you off the map',
  'Kleine ring — sla ze er snel af': 'Tiny ring — knock them off fast',
  'Bliksem + vallende rotsblokken': 'Lightning + falling boulders',
  'Getij + kaatsende strandbal': 'Tides + a bouncing beach ball',
  'Sla je tegenstander van de map!': 'Knock your opponent off the map!',
  // co-op / friends / lobby
  '✓ Verbonden! Kies een level om samen te spelen.': '✓ Connected! Pick a level to play together.',
  '✓ Verbonden! Je maat kiest een level…': '✓ Connected! Your buddy is picking a level…',
  'Geen verbinding met de server.': 'No connection to the server.',
  'Uitnodiging naar ': 'Invite sent to ', ' gestuurd… wachten tot die meedoet.': '… waiting for them to join.',
  'Uitnodigen': 'Invite', 'Offline': 'Offline',
  'Laden…': 'Loading…', 'Verzoeken': 'Requests', 'Verzonden verzoeken': 'Sent requests',
  'Nog geen vrienden. Voeg er een toe via "Toevoegen".': 'No friends yet. Add one via "Add".',
  'Meedoen…': 'Joining…', 'Kamer aanmaken…': 'Creating room…', 'Verbinden…': 'Connecting…',
  'Vul de kamercode in.': 'Enter the room code.', 'Kon geen kamer maken: ': 'Could not create a room: ',
  'Nog geen spelers met een account. Log in en speel!': 'No players with an account yet. Log in and play!',
  'Tegenstander is weg — geen rematch mogelijk.': 'Opponent left — no rematch possible.',
  'Geen verbinding meer — terug naar lobby.': 'Connection lost — back to the lobby.',
  'Beiden moeten op rematch drukken.': 'Both must press rematch.',
  'Kies een map en speel tegen de bot:': 'Pick a map and play against the bot:',
  'De training-lobby heeft internet nodig om andere spelers te zien.': 'The training lobby needs internet to see other players.',
  ' nodigt je uit voor CO-OP!': ' invites you to CO-OP!', ' nodigt je uit voor een 1v1!': ' invites you to a 1v1!',
  'Iemand': 'Someone', 'Winnaar': 'Winner',
  // account / auth
  'Updaten…': 'Updating…', 'Bezig…': 'Working…',
  // onboarding-coach (eerste keer)
  'WELKOM, HELD!': 'WELCOME, HERO!',
  'Maak een account zodat je voortgang op elk toestel bewaard blijft.': 'Create an account so your progress is saved on every device.',
  'Optioneel — bewaar je voortgang op elk toestel.': 'Optional — keeps your progress on every device.',
  'Later — speel als gast': 'Later — play as guest',
  'Cancel': 'Cancel',
  'Inloggen mislukt — probeer e-mail.': 'Sign-in failed — try e-mail instead.',
  'Volgende': 'Next', 'Overslaan': 'Skip', 'Klaar!': 'Done!',
  // shop: crates + robijnen
  'Crate': 'Crate', 'Robijnen': 'Rubies', 'Munten': 'Coins', 'Beste deal': 'Best deal',
  'Koop met Apple Pay': 'Buy with Apple Pay',
  'Koop via de App Store': 'Buy in the App Store',
  'Vrij te spelen bij': 'Unlock at', 'Oplaadtijd': 'Charge time', 'Sprong': 'Jump', 'sprong': 'jump',
  'Gekochte crates gaan meteen open — je buit wordt direct bijgeschreven.': 'Purchased crates open instantly — your loot is added right away.',
  'Beste buit: veel munten, XP, materialen en kans op zeldzame items.': 'Best loot: lots of coins, XP, materials and a chance at rare items.',
  'Rijke buit: munten, XP, materialen en items.': 'Rich loot: coins, XP, materials and items.',
  'Kist-slots vol (3/3)': 'Chest slots full (3/3)',
  'Crate toegevoegd aan je kist-balk!': 'Crate added to your chest bar!',
  'Je kist-balk zit vol (max 3). Open eerst een kist.': 'Your chest bar is full (max 3). Open a chest first.',
  'Niet genoeg robijnen. Koop er via de Rubies-tab.': 'Not enough rubies. Buy some in the Rubies tab.',
  'In-app aankopen worden binnenkort geactiveerd.': 'In-app purchases are coming soon.',
  'Aankoop niet voltooid.': 'Purchase not completed.',
  'Aankoop wacht op goedkeuring.': 'Purchase is awaiting approval.',
  'Hoi, ik ben Ryan! Welkom bij Rymr Heroes. Ik leer je in 20 seconden hoe je vecht.': 'Hi, I\'m Ryan! Welcome to Rymr Heroes. I\'ll teach you to fight in 20 seconds.',
  'LOPEN — gebruik de pijltjes ◀ ▶ links onderin om te bewegen.': 'MOVE — use the ◀ ▶ arrows at the bottom left to walk around.',
  'SPRINGEN — tik ▲ om te springen. Tik nóg eens in de lucht voor een dubbele sprong!': 'JUMP — tap ▲ to jump. Tap again in mid-air for a double jump!',
  'BLOKKEREN — houd ▼ ingedrukt om klappen te blokkeren en minder schade te krijgen.': 'BLOCK — hold ▼ to block hits and take less damage.',
  'SLAAN — tik op de wapen-knop om te meppen. Probeer de oefen-pop nu te raken!': 'HIT — tap the weapon button to swing. Try to hit the practice dummy now!',
  'SPECIAAL — de vlammende knop is je krachtaanval. Die laadt op terwijl je vecht.': 'SPECIAL — the flaming button is your power move. It charges up as you fight.',
  'DOEL — sla je tegenstander van het platform óf versla ’m. Wie de meeste rondes wint, wint de match!': 'GOAL — knock your opponent off the platform or beat them. Win the most rounds to win the match!',
  'Je bent er klaar voor, held! Druk op Klaar om te beginnen. 💪': 'You\'re ready, hero! Press Done to begin. 💪',
  'Vul e-mail en wachtwoord in.': 'Enter e-mail and password.', 'Kies een nickname.': 'Choose a nickname.',
  'Wachtwoord moet minstens 6 tekens zijn.': 'Password must be at least 6 characters.',
  'Account aangemaakt!': 'Account created!', 'Ingelogd!': 'Logged in!',
  'Bevestig je e-mail via de link die we stuurden, en log daarna in.': 'Confirm your e-mail via the link we sent, then log in.',
  'Al een account? Inloggen': 'Already have an account? Log in', 'Nog geen account? Registreren': 'No account yet? Register',
  'Kies je speler-naam (zo sta je op de leaderboard):': 'Choose your player name (this is how you appear on the leaderboard):',
  'Naam mag niet leeg zijn.': 'Name cannot be empty.', 'Kon de naam niet opslaan: ': 'Could not save the name: ',
  // journey / result
  'Je bent verslagen — je kunt vanaf de vlag verder.': 'You were defeated — you can continue from the flag.',
  'Je bent verslagen.': 'You were defeated.', ' Opnieuw (vanaf begin)': ' Retry (from start)',
  'Level ': 'Level ', ' gehaald!': ' cleared!', 'Probeer het opnieuw.': 'Try again.',
  // inventaris / blacksmith hints
  'Nog geen harnas. Smeed er een bij de Blacksmith.': 'No armour yet. Forge some at the Blacksmith.',
  'Repareren: ': 'Repairing: ', 'Smeden: ': 'Forging: ',
  'Kies max <b>3</b> power-ups voor je loadout (': 'Pick up to <b>3</b> power-ups for your loadout (',
  ')/3). In een match activeer je ze; per gebruik gaat er 1 af.': ')/3). Activate them in a match; each use spends one.',
  'Harnas geeft <b>extra HP</b> (grijs balkje). Rust per slot 1 stuk uit. Smeed nieuwe stukken bij de <b>Blacksmith</b>.': 'Armour gives <b>extra HP</b> (grey bar). Equip one piece per slot. Forge new pieces at the <b>Blacksmith</b>.',
  'Materialen vind je in <b>kisten</b>. Gebruik ze bij de <b>Blacksmith</b> om harnas te smeden.': 'Materials come from <b>chests</b>. Use them at the <b>Blacksmith</b> to forge armour.',
  // in-game
  'VERSLAGEN!': 'DEFEATED!', 'JIJ': 'YOU',
  'JIJ wint de ronde!': 'YOU win the round!', 'TEGENSTANDER wint de ronde': 'OPPONENT wins the round',
  'online': 'online', 'OVERLEEF!': 'SURVIVE!', 'VERSLA ZE!': 'DEFEAT THEM!',
  'INLOGGEN': 'LOG IN', 'REGISTREREN': 'REGISTER', 'ACCOUNT AANMAKEN': 'CREATE ACCOUNT',
  'LEVEL GEHAALD!': 'LEVEL CLEARED!', 'GEWONNEN! ': 'YOU WON! ',
  'Willekeurige map wordt gekozen…': 'Picking a random map…', 'Wachten op tegenstander…': 'Waiting for opponent…',
  'Versla ALLE zombies! Sla met de melee-knop of schiet': 'Defeat ALL zombies! Hit with the melee button or shoot',
  'Versla eerst de bot-mensaap!': 'Defeat the ape bot first!',
  // shop/inventaris character- & wapen-stats
  'snel': 'fast', 'iets trager': 'a bit slower', 'traag': 'slow', 'normaal': 'normal', 'snelheid': 'speed',
  'XP-balk vullen': 'Fill XP bar', 'VUURWAPEN': 'FIREARM', 'Schade': 'Damage',
  'Je hebt nu ': 'You now have ', 'kogels': 'bullets', 'kogels per koop': 'bullets per purchase',
  'raketten': 'rockets', 'krachtig & explosief (AoE)': 'powerful & explosive (AoE)',
  // versus-uitslag
  ' VERSLAGEN! ': ' DEFEATED! ', 'VERLOREN': 'DEFEAT', ' OPNIEUW': ' RETRY', ' REMATCH': ' REMATCH',
  'Beiden moeten op rematch drukken.': 'Both players must press rematch.',
  // arena / daglimiet
  'Kon de daglimiet niet controleren: ': 'Could not check the daily limit: ',
  'Nieuw spel starten? Al je munten, wapens, characters en levelvoortgang worden gewist.': 'Start a new game? All your coins, weapons, characters and level progress will be wiped.',
  // coop panel sub-teksten (innerHTML)
  '<p class="screen-sub">Log in (menu ▸ account) en voeg vrienden toe om samen te spelen.</p>': '<p class="screen-sub">Log in (menu ▸ account) and add friends to play together.</p>',
  '<p class="screen-sub">Laden…</p>': '<p class="screen-sub">Loading…</p>',
  '<p class="screen-sub">Nog geen vrienden. Voeg ze toe via de Friends-knop.</p>': '<p class="screen-sub">No friends yet. Add them via the Friends button.</p>',
};
I18N.ui = function (s) { return this.lang === 'en' ? (this.UI_EN[s] || s) : s; };
window.tl = function (s) { return I18N.ui(s); };

I18N.init();
window.I18N = I18N;
window.t = function (k, f) { return I18N.t(k, f); };
