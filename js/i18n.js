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
      collect: 'COLLECT',
      // ---- journey ----
      journey_title: 'JOURNEY', world: 'World', story_next: 'Next', story_skip: 'Skip',
      // ---- versus ----
      you: 'YOU', vs: 'VS', you_vs: 'YOU · VS',
      // ---- blacksmith ----
      set_squire: 'Squire', set_knight: 'Knight', set_royal: 'Royal Knight',
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
      collect: 'OPHALEN',
      journey_title: 'JOURNEY', world: 'Wereld', story_next: 'Verder', story_skip: 'Overslaan',
      you: 'JIJ', vs: 'VS', you_vs: 'JIJ · TEGEN',
      set_squire: 'Schildknaap', set_knight: 'Ridder', set_royal: 'Royal Knight',
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
I18N.init();
window.I18N = I18N;
window.t = function (k, f) { return I18N.t(k, f); };
