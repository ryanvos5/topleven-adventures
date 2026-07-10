/* ============================================================
   CONFIG — wapens, levels, characters.
   Dit bestand pas je aan voor toekomstige updates:
   - nieuw wapen?  voeg toe aan WEAPONS
   - nieuwe wereld? voeg levels toe / maak WORLDS aan
   - nieuw character? voeg toe aan CHARACTERS
   ============================================================ */

const CONFIG = {
  // logische (interne) resolutie van de spelwereld; wordt opgeschaald -> pixel look
  // kleiner = meer ingezoomd (zombies komen sneller in beeld). 16:9.
  VIEW_W: 360,
  VIEW_H: 203,
  GROUND_Y: 173,        // y van de grond (voeten staan hier)
  GRAVITY: 0.6,
  JUMP_VELOCITY: -11,
};

/* ---------- WAPENS ----------
   type: 'melee' of 'ranged'
   damage: schade per hit
   cooldown: ms tussen aanvallen
   range: (melee) bereik in px
   bulletSpeed: (ranged) snelheid kogel
   pellets: aantal kogels per schot (uzi/shotgun gevoel)
   cost: prijs in munten (0 = gratis startwapen)
*/
const WEAPONS = {
  bat: {
    id: 'bat', name: 'Bat', type: 'melee',
    damage: 34, cooldown: 360, range: 30, cost: 0,
    desc: 'Je trouwe startwapen.'
  },
  club: {
    id: 'club', name: 'Club', type: 'melee',
    damage: 40, cooldown: 400, range: 28, knock: 14, cost: 120,
    desc: 'Goedkoop en hard: flinke terugslag.'
  },
  machete: {
    id: 'machete', name: 'Machete', type: 'melee',
    damage: 58, cooldown: 300, range: 36, cost: 150,
    desc: 'Scherper en sneller dan de bat.'
  },
  sword: {
    id: 'sword', name: 'Sword', type: 'melee',
    damage: 46, cooldown: 330, range: 34, knock: 9, cost: 250,
    desc: 'Gebalanceerd: degelijke schade én snelheid.'
  },
  dagger: {
    id: 'dagger', name: 'Dagger', type: 'melee',
    damage: 24, cooldown: 150, range: 24, knock: 4, cost: 350,
    desc: 'Razendsnel, maar kort bereik en weinig schade.'
  },
  axe: {
    id: 'axe', name: 'Axe', type: 'melee',
    damage: 74, cooldown: 520, range: 32, knock: 16, cost: 700,
    desc: 'Zware klap met grote terugslag — maar traag.'
  },
  spear: {
    id: 'spear', name: 'Spear', type: 'melee',
    damage: 48, cooldown: 420, range: 76, knock: 8, cost: 900,
    desc: 'Extra lang bereik — raak vijanden van heel veraf.'
  },
  mace: {
    id: 'mace', name: 'Mace', type: 'melee',
    damage: 66, cooldown: 480, range: 30, knock: 20, cost: 1100,
    desc: 'Beukt vijanden ver weg (enorme knockback).'
  },
  flail: {
    id: 'flail', name: 'Flail', type: 'melee',
    damage: 58, cooldown: 430, range: 36, knock: 12, arc: true, cost: 1500,
    desc: 'Zwiept in een boog — raakt vijanden aan béide kanten.'
  },
  bostaff: {
    id: 'bostaff', name: 'Bo Staff', type: 'melee',
    damage: 34, cooldown: 200, range: 44, knock: 13, arc: true, cost: 1800,
    desc: 'Snelle, brede vegen die hordes om je heen wegduwen.'
  },
  katana: {
    id: 'katana', name: 'Katana', type: 'melee',
    damage: 70, cooldown: 300, range: 36, knock: 9, cost: 2200,
    desc: 'Vlijmscherp: hoge schade én snel.'
  },
  halberd: {
    id: 'halberd', name: 'Halberd', type: 'melee',
    damage: 82, cooldown: 560, range: 54, knock: 14, cost: 3200,
    desc: 'Lang bereik én zware schade, maar traag.'
  },
  zapblade: {   // Yarno's ability-mes: snel als een dagger, hard als een katana (niet te koop)
    id: 'zapblade', name: 'Zap-mes', type: 'melee',
    damage: 70, cooldown: 150, range: 30, knock: 10, cost: 0,
    desc: 'Speciaal mes: snel én hard.'
  },
  pistol: {
    id: 'pistol', name: 'Pistol', type: 'ranged',
    damage: 42, cooldown: 380, range: 999, bulletSpeed: 7, pellets: 1, cost: 350,
    desc: 'Je eerste vuurwapen. Raak ze op afstand.'
  },
  uzi: {
    id: 'uzi', name: 'Uzi', type: 'ranged',
    damage: 22, cooldown: 110, range: 999, bulletSpeed: 8, pellets: 1, cost: 1400,
    desc: 'Bliksemsnel vuren. Maait hordes neer (slurpt kogels).'
  },
  ak47: {
    id: 'ak47', name: 'AK47', type: 'ranged',
    damage: 52, cooldown: 150, range: 999, bulletSpeed: 9, pellets: 1, cost: 3000,
    desc: 'Hoge schade én snel. De koning.'
  },
  rocket: {
    id: 'rocket', name: 'Rocket Launcher', type: 'ranged', ammoType: 'rocket',
    damage: 130, cooldown: 950, range: 999, bulletSpeed: 6, pellets: 1, cost: 15000,
    desc: 'Explosieve raketten (AoE). Heeft losse raketten nodig — schaars!'
  },
  // intern melee-wapen van Tygo (niet in de shop)
  shield: {
    id: 'shield', name: 'Shield', type: 'melee',
    damage: 34, cooldown: 360, range: 30, cost: 0,
    desc: 'Shield bash + block.'
  },
  // ---- Training-lobby-only wapens (alleen via de computer) ----
  chainsaw: {
    id: 'chainsaw', name: 'Kettingzaag', type: 'melee',
    damage: 60, cooldown: 640, range: 30, knock: 10, cost: 0,
    desc: 'Zaagt door alles: 60 schade, maar traag.'
  },
  deagle: {
    id: 'deagle', name: 'Desert Eagle', type: 'ranged',
    damage: 50, cooldown: 520, range: 999, bulletSpeed: 11, pellets: 1, cost: 0,
    desc: 'Fors pistool met terugslag: halve HP per treffer, 3 kogels.'
  },
  crossbow: {
    id: 'crossbow', name: 'Kruisboog', type: 'ranged',
    damage: 35, cooldown: 560, range: 999, bulletSpeed: 12, pellets: 1, cost: 0,
    desc: 'Schiet pijlen: 35 schade, 7 pijlen.'
  },
};

// volgorde in de shop: eerst alle melee (oplopend in prijs), dan de vuurwapens
const WEAPON_ORDER = [
  'bat', 'club', 'machete', 'sword', 'dagger', 'axe', 'spear', 'mace', 'flail', 'bostaff', 'katana', 'halberd',
  'pistol', 'uzi', 'ak47', 'rocket',
];
// geweer-stats voor Power Smash / Training (schade per kogel, tempo, terugslag)
const GUN_STATS = {
  ak47:     { cd: 150, dmg: 13, power: 7,  speed: 9,  kind: 'gun' },
  deagle:   { cd: 520, dmg: 50, power: 16, speed: 11, kind: 'deagle', recoil: 10 },   // halve HP + terugslag
  crossbow: { cd: 560, dmg: 35, power: 8,  speed: 12, kind: 'arrow' },
};
// raketten: prijs per stuk in de shop + zeldzame drop-kans (alleen als je de RPG hebt)
const ROCKET_COST = 250;
const ROCKET_DROP_CHANCE = 0.02;   // ~2% per kill -> soms 0 in een heel level
const ROCKET_AOE = 56;             // straal van de explosie

/* ---------- CHARACTERS ----------
   palette: kleuren voor de sprite-tekenaar
   maxHp: levens   speedMul: loopsnelheid (1 = normaal)   meleeMul: melee-schade
   build: 'normal' | 'bulky'   hair: 'natural' | 'curly'
*/
const CHARACTERS = {
  ryan: {
    id: 'ryan', name: 'Ryan', cost: 0,
    maxHp: 100, speedMul: 1.0, meleeMul: 1.0, build: 'normal', hair: 'natural', ability: 'zapdash',
    palette: {
      hair: '#5a3a22', hairDark: '#3f2817',
      skin: '#d8a878', skinDark: '#b8895e',
      eye: '#3a2414',                       // bruine ogen
      shirt: '#1c1c1c', shirtDark: '#0e0e0e',
      pants: '#161616', shoe: '#000000',
    },
    desc: 'Gebalanceerd. Snelste loper.'
  },
  tygo: {
    id: 'tygo', name: 'Tygo', cost: 1200, lvl: 8,
    maxHp: 100, speedMul: 1.0, meleeMul: 1.0, build: 'tall', hair: 'natural', ability: 'highjump', abChargeMul: 3,
    palette: {
      hair: '#a8824a', hairDark: '#7a5e30',  // blond-bruin
      skin: '#dcb088', skinDark: '#b88f64',
      eye: '#3a2414',                          // bruine ogen
      shirt: '#3a5048', shirtDark: '#26352f',  // groen-grijze tuniek
      pants: '#2a2622', shoe: '#161210',
    },
    desc: 'Lang & taai (+10 HP). Hogere dubbel-jump. Gebruikt elk melee-wapen.'
  },
  just: {
    id: 'just', name: 'Just', cost: 7200, lvl: 22,
    maxHp: 140, speedMul: 0.8, meleeMul: 1.1, build: 'stocky', hair: 'bald', ability: 'earthquake',
    palette: {
      hair: '#c8a85a', hairDark: '#9a7e3a',     // klein beetje blond haar
      skin: '#d8a878', skinDark: '#b8895e',
      eye: '#2f6fb0',                            // blauwe ogen
      shirt: '#5a4030', shirtDark: '#3a2820',
      pants: '#2a2622', shoe: '#161210',
    },
    desc: 'Dik & klein, traag maar sterk (+30 HP, +20% melee). Stamp bij de landing schade in de buurt.'
  },
  timo: {
    id: 'timo', name: 'Timo', cost: 4000, lvl: 16,
    maxHp: 90, speedMul: 1.1, meleeMul: 1.0, build: 'small', hair: 'natural', ability: 'triplejump', abChargeMul: 3,
    palette: {
      hair: '#a8824a', hairDark: '#7a5e30',     // blond-bruin, natural
      skin: '#d8a878', skinDark: '#b8895e',
      eye: '#3a2414',                            // bruine ogen
      shirt: '#2e6f8a', shirtDark: '#1d4a5e',
      pants: '#26303a', shoe: '#10161c',
    },
    desc: 'Klein & wendbaar (kleine hitbox). Heeft een extra (kleinere) dubbel-jump.'
  },
  vince: {
    id: 'vince', name: 'Vince', cost: 2500, lvl: 14,
    maxHp: 100, speedMul: 1.0, meleeMul: 1.0, build: 'normal', hair: 'spiky', fireAura: true, ability: 'fireaura10',
    palette: {
      hair: '#1a1a1a', hairDark: '#000000',     // zwarte stekels
      skin: '#d8a878', skinDark: '#b8895e',
      eye: '#3a2414',                            // bruine ogen
      shirt: '#7a2e1e', shirtDark: '#4a1c12',    // vurig roodbruin
      pants: '#22201e', shoe: '#0e0e0e',
    },
    desc: 'Gebalanceerd. Elke 30s een vuuraura (5s): wie je dan aanraakt brandt 3s.'
  },
  jenze: {
    id: 'jenze', name: 'Jenze', cost: 500, lvl: 5,
    maxHp: 120, speedMul: 0.95, meleeMul: 1.05, build: 'bulky', hair: 'curly', ability: 'heal',
    palette: {
      hair: '#6b4426', hairDark: '#4a2e18',  // bruine krullen
      skin: '#dcab7e', skinDark: '#bb8a5e',
      eye: '#2f6fb0',                         // blauwe ogen
      shirt: '#2a3340', shirtDark: '#1a2028', // stevige donkerblauwe outfit
      pants: '#20262e', shoe: '#101418',
    },
    desc: 'Fors & taai: +40 HP, +30% melee, iets trager.'
  },
  ricky: {
    id: 'ricky', name: 'Ricky', cost: 5500, lvl: 17,
    maxHp: 85, speedMul: 1.0, meleeMul: 1.0, build: 'normal', hair: 'natural', ability: 'rage10',
    palette: {
      hair: '#6b4426', hairDark: '#4a2e18',   // bruin haar naar voren
      skin: '#d8a878', skinDark: '#b8895e',
      eye: '#2f6fb0',                          // blauwe ogen
      shirt: '#3a7a4a', shirtDark: '#245030',
      pants: '#24303a', shoe: '#101418',
    },
    desc: 'Elke 15s 3s RAGE (2× schade). 85 HP.'
  },
  yarno: {
    id: 'yarno', name: 'Yarno', cost: 9200, lvl: 24,
    maxHp: 100, speedMul: 1.0, meleeMul: 1.0, build: 'normal', hair: 'back', ability: 'knife', abChargeMul: 3,
    palette: {
      hair: '#161616', hairDark: '#000000',     // zwart, naar achteren
      skin: '#d8a878', skinDark: '#b8895e',
      eye: '#3a2414',                            // bruine ogen
      shirt: '#2f6f6a', shirtDark: '#1c4a46',    // teal outfit
      pants: '#24303a', shoe: '#101418',
    },
    desc: 'Gebalanceerd, iets sneller. Start met een dagger.'
  },
  skeleton: {
    id: 'skeleton', name: 'Skeleton Knight', costRubies: 250,
    maxHp: 95, speedMul: 1.0, meleeMul: 1.05, build: 'normal', hair: 'bald', ability: 'souldrain',
    palette: {
      hair: '#dfe3dc', hairDark: '#aeb2ab',
      skin: '#e8ece4', skinDark: '#b0b6ac',      // botwit
      eye: '#9a3aff',                             // gloeiend paarse ziel-ogen
      shirt: '#39414c', shirtDark: '#222831',     // donker staal-harnas
      pants: '#232830', shoe: '#12141a',
    },
    desc: 'Skeletridder (250 robijnen). Soul Drain: steelt 20 HP van de tegenstander — 20 schade én jij +20 HP.'
  },
  // ---- Journey-only mensapen (alleen vrij te spelen in Journey, niet te koop) ----
  bonzo: {
    id: 'bonzo', name: 'Bonzo', cost: 0, journeyOnly: true,
    maxHp: 80, speedMul: 1.12, meleeMul: 0.95, build: 'small', hair: 'natural', ability: 'triplejump', abChargeMul: 3,
    palette: {
      hair: '#3a2a1c', hairDark: '#241810',
      skin: '#8a5e38', skinDark: '#5e3f22',     // chimp-vacht
      eye: '#2a1a0e',
      shirt: '#5a4030', shirtDark: '#3a281c', pants: '#2a1c12', shoe: '#140d08',
    },
    desc: 'Chimp: snel & wendbaar, extra sprong. Alleen via Journey.'
  },
  koba: {
    id: 'koba', name: 'Koba', cost: 0, journeyOnly: true,
    maxHp: 110, speedMul: 1.0, meleeMul: 1.05, build: 'bulky', hair: 'bald', ability: 'rage8',
    palette: {
      hair: '#7a3a1e', hairDark: '#54260f',
      skin: '#a85e34', skinDark: '#7a421f',     // orang-oetan-rood
      eye: '#3a1a0a',
      shirt: '#6b3a1e', shirtDark: '#451f0e', pants: '#33200f', shoe: '#160d06',
    },
    desc: 'Bruut: fors & sterk (+25% melee). Alleen via Journey.'
  },
  kong: {
    id: 'kong', name: 'Gorilla King', cost: 6000,
    maxHp: 130, speedMul: 0.95, meleeMul: 1.0, build: 'bulky', hair: 'bald', ability: 'rage3', abChargeMul: 4,
    palette: {
      hair: '#2a2622', hairDark: '#15120f',
      skin: '#3a342f', skinDark: '#262220',     // gorilla-zwart
      eye: '#ffcf33',
      shirt: '#3a342f', shirtDark: '#201d1a', pants: '#1a1816', shoe: '#0c0b0a',
    },
    desc: 'Gorillakoning: enorme kracht. Ability Koningswoede (3× schade), maar lange oplaadtijd.'
  },
  // ---- TEMPLE-WERELD BOSSES (unlockbaar door ze te verslaan in Journey) ----
  guardian: {
    id: 'guardian', name: 'Tempelbewaker', cost: 0, journeyOnly: true,
    maxHp: 100, speedMul: 1.0, meleeMul: 1.0, build: 'stocky', hair: 'bald', ability: 'traps', forcedMelee: 'katana',
    palette: {
      hair: '#c9a84a', hairDark: '#8a6f28',
      skin: '#caa06a', skinDark: '#9a734a',
      eye: '#3a2a12',
      shirt: '#b8912e', shirtDark: '#7a5e18', pants: '#4a3a1e', shoe: '#241a0c',
    },
    desc: 'Tempelbewaker: krijgt 3 vallen die je zelf één voor één plaatst (grond/platform). Versla hem in de Temple-wereld.'
  },
  monnik: {
    id: 'monnik', name: 'Monnik', cost: 0, journeyOnly: true,
    maxHp: 120, speedMul: 0.9, meleeMul: 1.0, build: 'normal', hair: 'bald', ability: 'stunpulse', outfit: 'monk',
    palette: {
      hair: '#5a3a22', hairDark: '#3f2817',
      skin: '#d8a878', skinDark: '#b8895e',
      eye: '#3a2414',
      shirt: '#e08a2a', shirtDark: '#a85e14', pants: '#8a4a1a', shoe: '#4a2a10',
    },
    desc: 'Monnik: taai + stun-pulse (verdooft iedereen dichtbij). Versla hem in de Temple-wereld.'
  },
  ninja: {
    id: 'ninja', name: 'Ninja', cost: 0, journeyOnly: true,
    maxHp: 100, speedMul: 1.0, meleeMul: 1.0, build: 'normal', hair: 'bald', ability: 'invisible', outfit: 'ninja',
    palette: {
      hair: '#1a1a1e', hairDark: '#0c0c0e',
      skin: '#c99a6a', skinDark: '#9a7048',
      eye: '#e83030',
      shirt: '#1c1f26', shirtDark: '#0e1014', pants: '#141619', shoe: '#0a0b0d',
    },
    desc: 'Ninja: dubbel-jump + 6s onzichtbaarheid. Versla hem in de Temple-wereld.'
  },
  // ---- INDIAAN: tempel-minion (alleen als bot in de Temple-wereld; niet in de shop / niet in CHARACTER_ORDER) ----
  indiaan: {
    id: 'indiaan', name: 'Indiaan', maxHp: 95, speedMul: 1.05, meleeMul: 1.0, build: 'normal', hair: 'spiky',
    palette: {
      hair: '#1a1a1e', hairDark: '#0c0c0e',
      skin: '#b87848', skinDark: '#8a5630',
      eye: '#2a1a0e',
      shirt: '#8a4a2a', shirtDark: '#5a2c16', pants: '#6b4020', shoe: '#3a2210',
    },
  },
  // ---- vijand-mensapen (alleen als bot in Journey, niet in de shop / niet in CHARACTER_ORDER) ----
  aapje: {
    id: 'aapje', name: 'Aapje', maxHp: 70, speedMul: 1.1, meleeMul: 0.9, build: 'small', hair: 'natural',
    palette: { hair: '#4a3320', hairDark: '#2e2012', skin: '#8a5e38', skinDark: '#5e3f22', eye: '#2a1a0e', shirt: '#6b5030', shirtDark: '#43321c', pants: '#2a1c12', shoe: '#140d08' },
  },
  baviaan: {
    id: 'baviaan', name: 'Baviaan', maxHp: 105, speedMul: 1.0, meleeMul: 1.1, build: 'normal', hair: 'natural',
    palette: { hair: '#5a4030', hairDark: '#3a281c', skin: '#9a6a3a', skinDark: '#6e4824', eye: '#c83838', shirt: '#7a3a2a', shirtDark: '#4a1f14', pants: '#33240f', shoe: '#160d06' },
  },
};
const CHARACTER_ORDER = ['ryan', 'jenze', 'tygo', 'vince', 'timo', 'just', 'ricky', 'yarno', 'skeleton', 'bonzo', 'koba', 'kong', 'guardian', 'monnik', 'ninja'];

// ---- CHARACTER-ABILITIES (oplaadbaar in een match: vlam-knop boven de melee-knop) ----
const ABILITIES = {
  zapdash:    { name: 'Zap Dash',    desc: 'Dash naar je tegenstander: schade + knockback.' },
  heal:       { name: 'HP Herstel',  desc: 'Herstelt in één keer al je HP.' },
  highjump:   { name: 'Hoge Sprong', desc: 'Springt hoger — de rest van de match.' },
  fireaura10: { name: 'Vuuraura',    desc: 'Vuuraura 10s: wie je aanraakt brandt.' },
  triplejump: { name: 'Dubbel Sprong', desc: 'Een extra dubbel-jump — de rest van de match.' },
  earthquake: { name: 'Aardbeving',  desc: 'De map trilt 5s; je tegenstander wordt weggeschud.' },
  rage10:     { name: 'Rage',        desc: 'Rage 10s (2× schade).' },
  rage8:      { name: 'Rage',        desc: 'Rage 8s (2× schade).' },
  ultrarage:  { name: 'Ultra Rage',  desc: 'Ultra rage 5s (4× schade).' },
  rage3:      { name: 'Koningswoede', desc: 'Rage 8s (3× schade) — lange oplaadtijd.' },
  knife:      { name: 'Zap-mes',     desc: 'Speciaal mes voor 1 ronde (snel + hard).' },
  katanacombo:{ name: 'Katana-combo', desc: '5s lang 2× zo snel slaan met de katana.' },
  traps:      { name: 'Vallen',       desc: 'Krijg 3 vallen — plaats ze zelf één voor één op de grond of een platform. Stapt je tegenstander erop: 8s vast.' },
  stunstrike: { name: 'Stun-slag',   desc: '5s lang: je volgende klap verdooft je tegenstander.' },
  stunpulse:  { name: 'Stun-pulse',  desc: 'Golf van energie: verdooft iedereen dichtbij 1,6s.' },
  invisible:  { name: 'Onzichtbaar', desc: '6s onzichtbaar — je tegenstander ziet je niet.' },
  souldrain:  { name: 'Soul Drain',  desc: 'Steelt 20 HP van de tegenstander: 20 schade én jij +20 HP.' },
};
const STUN_PULSE_MS = 1600;      // Monnik-ability: verdovingsduur
const STUN_PULSE_RANGE = 96;     // bereik van de stun-pulse (px)
const ABILITY_CHARGE_MS = 42000;   // basis-oplaadtijd van de ability (combos versnellen dit)
// Journey-enemy-stats blijven ongewijzigd (online zijn koba/kong aangepast)
const JOURNEY_ENEMY_OVERRIDE = {
  koba: { maxHp: 135, speedMul: 0.94, meleeMul: 1.25 },
  kong: { maxHp: 150, speedMul: 0.95, meleeMul: 1.3, autoRage: true, rageEvery: 14000 },
};
const SHIELD_BLOCK_CD = 3000;   // ms cooldown nadat Tygo's schild een treffer blokt

/* ---------- LEVELS (Wereld 1: Verlaten Stad) ----------
   length: lengte van het level in px (hoe ver lopen)
   zombieCount: totaal aantal zombies dat spawnt
   spawnEvery: ms tussen spawns
   zombieHp: basis-HP per zombie
   zombieSpeed: loopsnelheid zombies
   runnerChance: kans (0-1) op een snelle "runner" zombie
*/
/* ---------- ZOMBIE TYPES ----------
   hpMul/speedMul: vermenigvuldigers t.o.v. het level-basis
   dmg: schade per beet
   biteCd: ms tussen aanvallen
   reach: afstand waarop hij kan bijten
   lunge: 'true' = haalt uit en schiet vooruit om te bijten (bestraft stilstaan)
   scale: grootte (1 = normaal)
   coin: munten bij kill
*/
/* knockChance: kans dat een beet de speler terugslaat
   knockPlayer: hoeveel px de speler terugvliegt
   (brute: knockback:true = altijd terugslaan) */
/* healChance: kans dat deze zombie een EHBO-doosje dropt
   ammoDrop: aantal kogels in een doosje
   ammoDropChance: kans dat er überhaupt een doosje valt (lager = schaarser) */
const ZOMBIE_TYPES = {
  walker: {
    id: 'walker', hpMul: 1.0, speedMul: 1.0, dmg: 10, biteCd: 700,
    reach: 22, lunge: true, lungeSpeed: 3.2, scale: 1.0, coin: 6,
    ammoDrop: 5, ammoDropChance: 0.26, color: '#6a9c4a',
    knockChance: 0.28, knockPlayer: 8, healChance: 0.07,
  },
  runner: {
    id: 'runner', hpMul: 0.55, speedMul: 1.55, dmg: 8, biteCd: 520,
    reach: 20, lunge: true, lungeSpeed: 4.0, scale: 0.92, coin: 11,
    ammoDrop: 4, ammoDropChance: 0.20, color: '#8ab85a',
    knockChance: 0.18, knockPlayer: 6, healChance: 0.05,
  },
  crawler: {
    id: 'crawler', hpMul: 0.7, speedMul: 1.7, dmg: 9, biteCd: 560,
    reach: 22, lunge: true, lungeSpeed: 3.4, scale: 1.0, coin: 14,
    ammoDrop: 5, ammoDropChance: 0.24, jumps: true, low: true, color: '#7c8c3a',
    knockChance: 0.22, knockPlayer: 7, healChance: 0.07,
  },
  brute: {
    id: 'brute', hpMul: 3.0, speedMul: 0.5, dmg: 22, biteCd: 950,
    reach: 32, lunge: true, lungeSpeed: 2.6, scale: 1.55, coin: 28,
    ammoDrop: 14, ammoDropChance: 0.80, knockback: true, knockResist: 0.35, color: '#4e7c3a',
    knockPlayer: 14, healChance: 0.35,
  },
  // mega-zombie eindbaas (level 10). Roept kleine zombies op + spuugt projectielen.
  boss: {
    id: 'boss', hpMul: 1.0, speedMul: 0.32, dmg: 28, biteCd: 1200,
    reach: 16, lunge: true, lungeSpeed: 2.4, scale: 3.0, coin: 250,
    ammoDrop: 0, ammoDropChance: 0, knockback: true, knockResist: 0, // immuun voor knockback
    knockPlayer: 22, healChance: 0, spawner: true, color: '#3a6a2a',
    shootEvery: 1600, shotSpeed: 3.4, shotDmg: 14, // zuur-projectielen: spring eroverheen
  },
  // gemuteerde zombie-vogel (wereld 2): vliegt, dook naar de speler
  flyer: {
    id: 'flyer', hpMul: 0.5, speedMul: 1.25, dmg: 9, biteCd: 800,
    reach: 18, lunge: false, scale: 1.0, coin: 13, ammoDrop: 5, ammoDropChance: 0.45,
    flying: true, color: '#6a8c4a', knockChance: 0.12, knockPlayer: 5, healChance: 0.06,
  },
  // eindbaas wereld 2: zombie in een luchtballon (zweeft, gooit bommen, roept vogels op)
  balloon: {
    id: 'balloon', hpMul: 1.0, speedMul: 0.45, dmg: 22, biteCd: 1400,
    reach: 22, lunge: false, scale: 1.0, coin: 350, ammoDrop: 0, ammoDropChance: 0,
    flying: true, boss: true, knockback: true, knockResist: 0,
    spawner: true, shootEvery: 1700, shotSpeed: 3.2, shotDmg: 16, color: '#3a6a2a',
  },
  // kleine luchtballon (wereld 3): zweeft hoog en dropt af en toe een zombie van bovenaf
  dropper: {
    id: 'dropper', hpMul: 1.3, speedMul: 0.5, dmg: 12, biteCd: 1000,
    reach: 16, lunge: false, scale: 1.0, coin: 22, ammoDrop: 6, ammoDropChance: 0.5,
    flying: true, dropper: true, dropEvery: 3200,
    knockChance: 0, knockPlayer: 0, healChance: 0, color: '#8a9c54',
  },
  // eindbaas wereld 3: mega zombie-aap die in één sprong naar de speler toe duikt
  ape: {
    id: 'ape', hpMul: 1.0, speedMul: 0.7, dmg: 36, biteCd: 700,
    reach: 30, lunge: false, apeLeap: true, scale: 2.8, coin: 450,
    ammoDrop: 0, ammoDropChance: 0, knockback: true, knockResist: 0,
    healChance: 0, color: '#3a5a2a',
  },
  // ---- JOURNEY (Mario-stijl): patrouilleren op een vaste plek, vallen je NIET aan; aanraking = schade ----
  apeling: {              // gewone mensaap: heen en weer op grond of platform
    id: 'apeling', hpMul: 0.8, speedMul: 0.85, dmg: 12, biteCd: 700,
    reach: 16, patrol: true, journeyFoe: true, scale: 1.0, coin: 8,
    ammoDrop: 0, ammoDropChance: 0, healChance: 0, color: '#6a4a2c',
  },
  boomape: {              // mensaap die af en toe een boemerang gooit
    id: 'boomape', hpMul: 1.0, speedMul: 0.7, dmg: 12, biteCd: 700,
    reach: 16, patrol: true, journeyFoe: true, boomerang: true, boomEvery: 2600, scale: 1.05, coin: 14,
    ammoDrop: 0, ammoDropChance: 0, healChance: 0, color: '#5a3f28',
  },
  bird: {                 // tropische vogel: zweeft heen en weer, aanraken = schade
    id: 'bird', hpMul: 0.5, speedMul: 1.1, dmg: 12, biteCd: 700,
    reach: 14, patrol: true, journeyFoe: true, flying: true, scale: 1.0, coin: 10,
    ammoDrop: 0, ammoDropChance: 0, healChance: 0, color: '#d2662e',
  },
  brawler: {              // BOT-MENSAAP: verschijnt af en toe en vecht met je (Power Smash-stijl); moet verslagen
    id: 'brawler', hpMul: 4.5, speedMul: 0.85, dmg: 16, biteCd: 850,
    reach: 26, lunge: true, lungeSpeed: 3.0, journeyFoe: true, brawler: true, scale: 1.7, coin: 120,
    ammoDrop: 0, ammoDropChance: 0, knockback: true, knockResist: 0.55, knockPlayer: 12,
    healChance: 0, color: '#5a3f28',
  },
};

// munitie: beginvoorraad bij een nieuw spel (blijft daarna behouden tussen levels)
const STARTING_AMMO = 100;
// kogels bijkopen in de shop
const AMMO_PACK = { amount: 60, cost: 50 }; // 60 kogels voor 50 munten
const AMMO_MAX = 600;                        // maximale voorraad
// geen zombie wordt sneller dan dit — speler loopt 2.2, dus doorrennen blijft mogelijk
const MAX_ZOMBIE_SPEED = 2.0;
// EHBO-doosje geneest zo veel HP
const HEALTH_PACK_HEAL = 28;
// HP van de mega-zombie eindbaas
const BOSS_HP = 1000;
// HP van de ballon-eindbaas (wereld 2)
const BALLOON_HP = 900;
// HP van de mega zombie-aap (wereld 3)
const APE_HP = 1800;
// vanaf deze wereld kun je dubbel springen
const DOUBLE_JUMP_FROM_WORLD = 2;
// onder deze y val je in het ravijn (instant dood) — alleen in parkour-levels
const FALL_DEATH_Y = CONFIG.VIEW_H - 2;

/* ---------- THEMA'S (omgeving per wereldstuk) ----------
   sky: [boven, midden, onder]  far/near: gebouwkleuren  ground/groundTop: straat
   lamp: lichtkleur  prop: accent  weer: 'rain' | 'fog' | null */
const THEMES = {
  city: {
    name: 'Verlaten Stad',
    sky: ['#1a2438', '#243049', '#3a3142'], far: ['#1e2636', '#222a3a', '#192030'],
    near: ['#2e3a4e', '#34405a', '#283448', '#3a4358'], ground: '#2c2620', groundTop: '#3a342c',
    lamp: '#ffe9a0', weather: null,
  },
  park: {
    name: 'Verwilderd Park',
    sky: ['#16302a', '#1f4038', '#34433a'], far: ['#1c2e22', '#21321f', '#19281a'],
    near: ['#26402c', '#2f4a30', '#28482a', '#244226'], ground: '#283318', groundTop: '#3a4a26',
    lamp: '#d6f0a0', weather: 'fog', tree: true,
  },
  graveyard: {
    name: 'Kerkhof',
    sky: ['#201828', '#2a1f38', '#3a2a42'], far: ['#241a2e', '#2a1f38', '#1f1828'],
    near: ['#332840', '#3a2f4a', '#2a2440', '#3e3358'], ground: '#241f2a', groundTop: '#322a38',
    lamp: '#c0a8ff', weather: 'fog', graves: true,
  },
  sewer: {
    name: 'Riool',
    sky: ['#0e1416', '#13201f', '#182826'], far: ['#142022', '#172a2c', '#101e20'],
    near: ['#1f3034', '#244044', '#1a2e30', '#284044'], ground: '#1a201f', groundTop: '#243030',
    lamp: '#7affd0', weather: 'rain',
  },
  mountain: {
    name: 'De Bergen',
    sky: ['#2a3e5e', '#456589', '#7fa0bd'],            // berglucht (ochtendgloren)
    far: ['#3c5070', '#34465f', '#46607f'],            // verre toppen
    near: ['#4a627e', '#3e5169', '#56708c', '#48607a'],// dichtere bergen
    ground: '#2a3850', groundTop: '#3a4e68',
    lamp: '#ffe6a0', weather: null, mountains: true,
  },
  arena: {
    name: 'Arena',
    sky: ['#10121a', '#181b26', '#222636'],
    far: ['#1c1f2a'], near: ['#2a2e3c'],
    ground: '#241f18', groundTop: '#3a3022',
    lamp: '#ffd24a', weather: null, isArena: true,
  },
  jungle: {
    name: 'Jungle',
    sky: ['#16331f', '#1f472a', '#315a39'],             // dampig groen oerwoud
    far: ['#173a22', '#1e482a', '#143420'],             // verre boomsilhouetten
    near: ['#21512c', '#2a6234', '#255a2e', '#1d4a26'], // dichte begroeiing
    ground: '#21341a', groundTop: '#3a5223',
    lamp: '#c6ec9a', weather: 'fog', jungle: true,
  },
  beach: {
    name: 'Strand',
    sky: ['#5ab0e0', '#8fd0f0', '#cfeef8'],             // heldere eilandlucht
    far: ['#2e6b4a', '#3a7a54', '#28604a'],             // verre palmen
    near: ['#3a8a5c', '#46996a', '#348a58', '#2e7a50'], // dichtere palmen/struiken
    ground: '#caa860', groundTop: '#e3c882',            // zand
    lamp: '#ffe9a0', weather: null, jungle: true,        // zelfde palm-silhouetten als jungle
  },
};

/* ---------- POWER-UPS ---------- */
const POWERUPS = {
  rage:  { id: 'rage',  name: 'RAGE',   dur: 8000, color: '#ff5a3a', icon: '⚔' },
  speed: { id: 'speed', name: 'SPEED',  dur: 8000, color: '#3ad0ff', icon: '⚡' },
  shield:{ id: 'shield',name: 'SCHILD', dur: 6000, color: '#f2c94c', icon: '🛡' },
  fireball:{ id: 'fireball', name: 'FIREBALL', dur: 0, color: '#ff7a2a', icon: '🔥' }, // 3 schoten
};
const POWERUP_LIST = ['rage', 'speed', 'shield'];
const POWERUP_DROP_CHANCE = 0.025; // kans per kill

/* ---------- POWER SMASH (multiplayer-gamemode) ----------
   8 rondes, melee-only start met de knuppel; er vallen wapens/power-ups/health in de arena. */
const SMASH_ROUNDS = 8;
const VERSUS_INTRO_MS = 2600;        // map-intro (zonder muziek, wat sfx) vóór het aftellen van de eerste ronde
const AFK_KICK_MS = 15000;           // >15s geen input / uit de app -> uit de match gekickt (jij verliest, tegenstander wint)
const MATCH_TIME_MS = 180000;        // matchmaking: 3 min tijdslimiet -> meeste rondes wint (gelijk = sudden death)
// Anti-vluchten: staat iemand 2+ voor en doet die 10s geen schade aan de tegenstander, dan krijgt de leider zélf schade ("val aan!")
const FLEE_PUNISH_MS = 10000;        // leider deed 10s geen schade -> hij begint zelf schade te krijgen
const FLEE_DPS_BASE = 14;            // start-schade per seconde
const FLEE_DPS_MAX = 40;             // maximale schade per seconde (loopt op hoe langer hij blijft vluchten)
const SMASH_DROP_EVERY = 5000;       // ms tussen drops (host bepaalt)
const CLOUD_STAND_MS = 5000;         // Airplane: hoe lang je op een wolk-platform kunt staan
const CLOUD_REFORM_MS = 2600;        // Airplane: hoe lang een ingezakte wolk weg blijft
const SMASH_WEAPON_TIME = 13000;     // opgepakt melee-wapen ben je na ~13s weer kwijt
const SMASH_FIREBALL_SHOTS = 3;      // aantal vuurballen
const SMASH_ROCKETS = 3;             // raketten bij een RPG-drop
const SMASH_STARS = 3;               // ninja-sterren bij een ster-drop
const SMASH_AK_AMMO = 30;            // kogels bij een AK47-drop
const GIANT_MS = 8000;               // reus-powerup duurt 8s
const GIANT_HP = 300;                // reus heeft 300 HP (en kan gewoon schade krijgen)
const SMASH_STAR_DMG = 26;           // veel schade per ster
const SMASH_STAR_CD = 200;           // snel achter elkaar gooien
const SMASH_PORTAL_EVERY = 22000;    // ms tussen portalen (host bepaalt) — minder vaak
const SMASH_PORTAL_LIFE = 11000;     // hoe lang een portaalpaar blijft staan
// drakenei: zeldzaam, verdwijnt snel -> snel pakken; roept een draak op die de tegenstander beschiet
const SMASH_DRAGON_LIFE = 4500;      // het ei blijft maar kort liggen
const DRAGON_DUR = 10000;            // de draak blijft 10s
const DRAGON_SPIT_MS = 1600;         // spuugt elke ~1,6s een vuurstraal
const DRAGON_DMG = 10;               // schade per vuurstraal
const SMASH_LIGHTNING_STUN = 1500;   // bliksem (alleen Cave): stunt de tegenstander 1,5s
const SMASH_FIRE_BURN = 1200;        // brand-duur van vuurbal & draak (korter dan de oude 3s)
const NUKE_MS = 15000;               // nuke-powerup: 15s afteltimer; drager overleeft = tegenstander dood
// Cave: midden-knop -> straal die over de map sweept; raakt 'ie je -> schade + harde knockback
const CAVE_ARM_MS = 7000;            // hoe vaak de knop scherp wordt (rood knippert)
const CAVE_WALL_SPEED = 7;           // px/frame dat de straal over de map sweept
const CAVE_BEAM_DMG = 18;            // schade van de straal
const CAVE_BEAM_KNOCK = 24;          // harde knockback
// steen (alleen Cave, Smash): 3 grote stenen vallen; geraakt = 2s platgedrukt
const SMASH_ROCK_COUNT = 3;
const SMASH_ROCK_FLAT = 2000;        // 2s plat (niet bewegen)
const SMASH_SHIELD = 50;             // shield-powerup: +50 hp als blauw balkje (Pirate + Sky)
const SMASH_ROCK_SPREAD = 55;        // spreiding rond de tegenstander
const HELI_MINIGUN = 100;            // gevechtsheli: minigun-kogels (vuurknop)
const HELI_ROCKETS = 3;              // gevechtsheli: raketten (meleeknop)
const HELI_SPEED = 2.8;              // vlieg-snelheid (links/rechts/omhoog/omlaag)
// Beach: getij (vloed) + strandbal
const BEACH_TIDE_EVERY = 9000;       // ms tussen vloeden
const BEACH_RISE = 1600;             // opkomen
const BEACH_FLOOD = 3200;            // hoog water (golven nemen je mee)
const BEACH_RECEDE = 1800;           // terugtrekken
const BEACH_CARRY = 1.5;             // hoe hard de golf je meeneemt
const BEACH_SLOSH = 850;             // ms per golf-richting
const BALL_LIFE = 15000;             // strandbal leeft 15s, dan ontploft
const BALL_KNOCK = 34;               // harde knockback bij een treffer
// Journey-eiland-powerups (NIEUW, niet in gewone smash)
const COCO_AMMO = 2;                 // kokosbom: lobt in een boog, ontploft (AoE)
const COCO_KNOCK = 28;
const BOOM_AMMO = 2;                 // boemerang: vliegt uit en keert terug, raakt beide kanten
const BOOM_KNOCK = 16;
const DART_AMMO = 5;                 // gifdart: snel + recht, korte verdoving bij treffer
const DART_KNOCK = 8;
const DART_STUN = 700;

// bukken/blokken: parry (perfecte timing) + sterker maar breekbaar blok
const PARRY_WINDOW = 220;            // ms na blok-start = perfecte parry (100% blok + counter)
const GUARD_MAX = 2200;             // blok-uithoudingsvermogen (ms aan blokken)
const GUARD_HIT_COST = 520;        // extra verbruik per geblokte treffer
const GUARD_BREAK_STUN = 950;       // verdoving als je guard breekt
const GUARD_REGEN = 1.3;           // herstel-snelheid als je niet blokt

// combo's: opeenvolgende treffers binnen het tijdvenster -> hoger (x1..x5), meer schade + XP
const COMBO_MAX = 5;
const COMBO_WINDOW = 1500;           // ms om de combo door te zetten
function comboMul(n) { return 1 + (Math.min(n, COMBO_MAX) - 1) * 0.15; }                 // x1=1.0 .. x5=1.6
function comboXp(n) { return Math.round(15 + (Math.min(n, COMBO_MAX) - 1) * (60 - 15) / (COMBO_MAX - 1)); }  // 15,26,37,49,60

/* ---------- HOEDEN (cosmetisch, voor je character) ---------- */
const HATS = {
  none:      { name: 'Geen hoed', cost: 0,   lvl: 0,  desc: 'Geen hoofddeksel.' },
  cap:       { name: 'Pet', cost: 450,        lvl: 2,  desc: 'Klassieke rode pet.' },
  beanie:    { name: 'Muts', cost: 600,       lvl: 2,  desc: 'Warme muts met pom.' },
  party:     { name: 'Feesthoedje', cost: 360,lvl: 3,  desc: 'Feestje!' },
  fedora:    { name: 'Gleufhoed', cost: 900,  lvl: 4,  desc: 'Stijlvolle gleufhoed.' },
  cowboy:    { name: 'Cowboyhoed', cost: 1050, lvl: 4,  desc: 'Yeehaw.' },
  chef:      { name: 'Koksmuts', cost: 900,   lvl: 6,  desc: 'Voor de chef.' },
  grad:      { name: 'Diploma-hoed', cost: 1050, lvl: 7, desc: 'Geslaagd!' },
  tophat:    { name: 'Hoge hoed', cost: 1350,  lvl: 7,  desc: 'Deftig.' },
  propeller: { name: 'Propellerpet', cost: 1500, lvl: 7, desc: 'Met draaiende propeller.' },
  wizard:    { name: 'Tovenaarshoed', cost: 1650, lvl: 8, desc: 'Magisch.' },
  viking:    { name: 'Vikinghelm', cost: 1950, lvl: 9,  desc: 'Met horens.' },
  crown:     { name: 'Kroon', cost: 2700,      lvl: 10, desc: 'Voor de koning.' },
  halo:      { name: 'Halo', cost: 2400,       lvl: 15, desc: 'Engelachtig.' },
  // ---- Journey-unlock hoeden (eiland-thema, niet te koop) ----
  leafcrown: { name: 'Bladerkroon', cost: 0, journeyOnly: true, desc: 'Eiland-kroon van bladeren. Via Journey.' },
  tikimask:  { name: 'Tiki-masker', cost: 0, journeyOnly: true, desc: 'Houten stammenmasker. Via Journey.' },
  bananahat: { name: 'Banaan', cost: 0, journeyOnly: true, desc: 'Een banaan op je hoofd. Via Journey.' },
};
const HAT_ORDER = ['none', 'cap', 'beanie', 'party', 'fedora', 'cowboy', 'chef', 'grad', 'tophat', 'propeller', 'wizard', 'viking', 'crown', 'halo', 'leafcrown', 'tikimask', 'bananahat'];

// ============================================================
// JOURNEY — singleplayer tegen bots. Elk level = 1v1 Power Smash.
// Wereld 1: Onbewoond Eiland (mensapen). 15 levels, oplopend, eindbaas = Gorilla King.
// ============================================================
// 15 unieke beach-geïnspireerde layouts (allemaal strand+zee+getij), met val-randen
const BEACH_LAYOUTS = [
  [{ x: 180, y: 150, w: 240 }, { x: 80, y: 112, w: 50 }, { x: 280, y: 112, w: 50 }],
  [{ x: 180, y: 150, w: 200 }, { x: 180, y: 104, w: 72 }],
  [{ x: 110, y: 150, w: 120 }, { x: 250, y: 150, w: 120 }, { x: 180, y: 108, w: 60 }],
  [{ x: 180, y: 150, w: 220 }, { x: 74, y: 116, w: 48 }, { x: 286, y: 116, w: 48 }, { x: 180, y: 78, w: 70 }],
  [{ x: 180, y: 150, w: 180 }, { x: 70, y: 120, w: 46 }, { x: 290, y: 120, w: 46 }, { x: 130, y: 88, w: 44 }, { x: 230, y: 88, w: 44 }],
  [{ x: 180, y: 150, w: 240 }, { x: 96, y: 110, w: 50 }, { x: 264, y: 110, w: 50 }],
  [{ x: 90, y: 150, w: 120 }, { x: 270, y: 150, w: 120 }, { x: 180, y: 118, w: 80 }, { x: 180, y: 78, w: 48 }],
  [{ x: 180, y: 150, w: 200 }, { x: 74, y: 114, w: 44 }, { x: 286, y: 114, w: 44 }, { x: 180, y: 84, w: 64 }],
  [{ x: 180, y: 150, w: 160 }, { x: 80, y: 124, w: 44 }, { x: 280, y: 124, w: 44 }, { x: 180, y: 96, w: 60 }, { x: 180, y: 58, w: 40 }],
  [{ x: 120, y: 150, w: 120 }, { x: 240, y: 150, w: 120 }, { x: 60, y: 112, w: 44 }, { x: 300, y: 112, w: 44 }, { x: 180, y: 96, w: 70 }],
  [{ x: 180, y: 150, w: 230 }, { x: 110, y: 110, w: 50 }, { x: 250, y: 110, w: 50 }, { x: 180, y: 74, w: 60 }],
  [{ x: 180, y: 150, w: 180 }, { x: 80, y: 118, w: 48 }, { x: 280, y: 118, w: 48 }, { x: 130, y: 86, w: 44 }, { x: 230, y: 86, w: 44 }],
  [{ x: 96, y: 150, w: 110 }, { x: 264, y: 150, w: 110 }, { x: 180, y: 124, w: 70 }, { x: 180, y: 88, w: 50 }, { x: 180, y: 52, w: 36 }],
  [{ x: 180, y: 150, w: 210 }, { x: 70, y: 116, w: 46 }, { x: 290, y: 116, w: 46 }, { x: 120, y: 84, w: 44 }, { x: 240, y: 84, w: 44 }],
  [{ x: 180, y: 150, w: 300 }, { x: 78, y: 112, w: 64 }, { x: 282, y: 112, w: 64 }, { x: 180, y: 80, w: 92 }],   // baas-arena
];
// Temple-journey: DICHTE ondergrond (volle brede grond, geen gat) + per level iets andere platforms
const TEMPLE_JOURNEY_LAYOUTS = [
  [{ x: 180, y: 152, w: 360 }, { x: 90, y: 112, w: 56 }, { x: 270, y: 112, w: 56 }],
  [{ x: 180, y: 152, w: 360 }, { x: 180, y: 116, w: 84 }, { x: 82, y: 82, w: 48 }, { x: 278, y: 82, w: 48 }],
  [{ x: 180, y: 152, w: 360 }, { x: 70, y: 120, w: 50 }, { x: 290, y: 120, w: 50 }, { x: 180, y: 86, w: 66 }],
  [{ x: 180, y: 152, w: 360 }, { x: 120, y: 118, w: 54 }, { x: 240, y: 118, w: 54 }, { x: 180, y: 80, w: 56 }],
  [{ x: 180, y: 152, w: 360 }, { x: 60, y: 124, w: 46 }, { x: 300, y: 124, w: 46 }, { x: 130, y: 92, w: 44 }, { x: 230, y: 92, w: 44 }, { x: 180, y: 56, w: 40 }],
  [{ x: 180, y: 152, w: 360 }, { x: 96, y: 108, w: 56 }, { x: 264, y: 108, w: 56 }, { x: 180, y: 74, w: 72 }],
];
// tempel-BINNEN-arena (vanaf wereld 2 level 10): dichte vloer in het MIDDEN, maar smaller dan de map,
// zodat er links en rechts een afgrond is -> je kunt er alleen via de ZIJKANT afgeslagen worden.
// (map is 360 breed, speler geklemd op 8..352; vloer 48..312 -> ~40px afgrond aan elke kant.)
const TEMPLE_INTERIOR_LAYOUTS = [
  [{ x: 180, y: 152, w: 264 }, { x: 96, y: 112, w: 52 }, { x: 264, y: 112, w: 52 }],
  [{ x: 180, y: 152, w: 264 }, { x: 180, y: 116, w: 80 }, { x: 92, y: 84, w: 44 }, { x: 268, y: 84, w: 44 }],
  [{ x: 180, y: 152, w: 264 }, { x: 110, y: 118, w: 50 }, { x: 250, y: 118, w: 50 }, { x: 180, y: 86, w: 60 }],
  [{ x: 180, y: 152, w: 264 }, { x: 130, y: 116, w: 52 }, { x: 230, y: 116, w: 52 }, { x: 180, y: 82, w: 52 }],
  [{ x: 180, y: 152, w: 264 }, { x: 96, y: 120, w: 46 }, { x: 264, y: 120, w: 46 }, { x: 180, y: 92, w: 44 }, { x: 180, y: 58, w: 40 }],
  [{ x: 180, y: 152, w: 264 }, { x: 104, y: 110, w: 54 }, { x: 256, y: 110, w: 54 }, { x: 180, y: 76, w: 68 }],
];
// jungle-varianten (vanaf level 10, dieper het oerwoud in); laatste = troonzaal-eindbaas
const JUNGLE_LAYOUTS = [
  [{ x: 180, y: 150, w: 210 }, { x: 80, y: 112, w: 52 }, { x: 280, y: 112, w: 52 }],
  [{ x: 110, y: 150, w: 120 }, { x: 250, y: 150, w: 120 }, { x: 180, y: 110, w: 64 }],
  [{ x: 180, y: 150, w: 190 }, { x: 70, y: 118, w: 46 }, { x: 290, y: 118, w: 46 }, { x: 180, y: 84, w: 66 }],
  [{ x: 90, y: 150, w: 120 }, { x: 270, y: 150, w: 120 }, { x: 180, y: 120, w: 78 }, { x: 180, y: 82, w: 50 }],
  [{ x: 180, y: 150, w: 170 }, { x: 78, y: 122, w: 46 }, { x: 282, y: 122, w: 46 }, { x: 130, y: 88, w: 44 }, { x: 230, y: 88, w: 44 }],
  [{ x: 180, y: 150, w: 300 }, { x: 80, y: 114, w: 60 }, { x: 280, y: 114, w: 60 }, { x: 180, y: 82, w: 84 }],   // troonzaal-eindbaas
];
/* ---------- JOURNEY: Mario-stijl eiland-levels ----------
   Elk level is een side-scroller (adventure-engine): ren naar de finish, zombies
   doen bij AANRAKING meteen de helft van je HP, halverwege een checkpoint-vlag
   (respawn-punt), en kratten met power-ups die je kapot kunt smashen.
   Levels 5/10/15: eerst het gewone level, bij de finish begint de BOSS FIGHT
   (bestaande 1v1 smash-duels: Baviaan, Koba, Gorilla King). */
function buildJourneyIsland() {
  const names = ['Aangespoeld', 'Brekers', 'Palmenrif', 'Apenstreken', 'BONZO',
    'Lagune', 'Kliftoppen', 'Zandbank', 'Verboden strand', 'KOBA',
    'Kokospaleis', 'Stormkaap', 'Springvloed', 'Aapheuvel', 'GORILLA KING'];
  const bosses = { 5: { bot: 'bonzo', diff: 5, drops: ['dart', 'coco'] },
                   10: { bot: 'koba', diff: 7, drops: ['dart', 'coco', 'boom'] },
                   15: { bot: 'kong', diff: 10, drops: ['coco', 'boom', 'dart'], boss: true } };
  const levels = [];
  for (let n = 1; n <= 15; n++) {
    const t = (n - 1) / 14;                              // 0..1 moeilijkheid
    const bossInfo = bosses[n];
    const lv = {
      id: n, name: names[n - 1], mario: true,
      theme: n <= 7 ? 'beach' : 'jungle',                 // strand -> dieper het oerwoud in
      mode: 'reach', killAll: false,                      // Mario: haal de finish (doden mag, hoeft niet)
      noObstacles: true, doorChance: 0,
      length: bossInfo ? 2200 : Math.round(2600 + n * 300),        // fors langer; boss-aanloop iets korter
      zombieCount: bossInfo ? 8 : Math.round(9 + n * 1.6),
      spawnEvery: Math.round(1750 - t * 700),
      zombieHp: Math.round(34 + t * 46),                  // 1-2 meppen per zombie
      zombieSpeed: +(0.55 + t * 0.5).toFixed(2),
      runnerChance: n >= 3 ? +(0.06 + t * 0.22).toFixed(2) : 0,
      crawlerChance: n >= 6 ? +(0.05 + t * 0.15).toFixed(2) : 0,
      bruteChance: n >= 9 ? +(0.05 + t * 0.12).toFixed(2) : 0,
      maxAlive: Math.round(3 + t * 5),
      midFlag: true,                                      // checkpoint-vlag halverwege (respawn)
      crates: bossInfo ? 2 : (3 + Math.floor(n / 5)),     // smashbare power-up-kratten
      reward: 0,                                          // journey heeft eigen beloningen
    };
    if (bossInfo) Object.assign(lv, bossInfo, { bossFight: true });
    else { lv.bot = (n % 2 ? 'aapje' : 'baviaan'); lv.diff = Math.round(2 + t * 7); lv.drops = ['coco']; }   // smash: elk level een bot-duel
    levels.push(lv);
  }
  return levels;
}
// ---- TEMPLE-WERELD: 15 smash-duels, bosses op 5/10/15 (unlockbaar) ----
function buildTempleWorld() {
  const names = ['Poort', 'Binnenhof', 'Zuilengang', 'Altaar', 'TEMPELBEWAKER',
    'Kloostergang', 'Meditatietuin', 'Klokkentoren', 'Verborgen kamer', 'MONNIK',
    'Daktuinen', 'Schaduwpad', 'Val-gangen', 'Dojo', 'NINJA'];
  const bosses = { 5: { bot: 'guardian', diff: 6 },
                   10: { bot: 'monnik', diff: 8 },
                   15: { bot: 'ninja', diff: 10, boss: true } };
  const levels = [];
  for (let n = 1; n <= 15; n++) {
    const t = (n - 1) / 14;
    const lv = { id: n, name: names[n - 1], temple: true, reward: 0, drops: ['ninjastar'], layout: (n - 1) % 6 };   // elk level iets andere layout
    if (bosses[n]) Object.assign(lv, bosses[n], { bossFight: true, drops: ['ninjastar', 'dart', 'coco'] });
    else { lv.bot = 'indiaan'; lv.diff = Math.round(3 + t * 6); }   // minions = indianen (geen shop/wereld-1 characters)
    levels.push(lv);
  }
  return levels;
}

const JOURNEY = {
  1: {
    id: 1, name: 'Onbewoond Eiland',
    levels: buildJourneyIsland(),
    unlocks: { 3: { hat: 'leafcrown' }, 5: { char: 'bonzo' }, 8: { hat: 'tikimask' }, 10: { char: 'koba' }, 12: { hat: 'bananahat' }, 15: { char: 'kong' } },
  },
  2: {
    id: 2, name: 'Verloren Tempel',
    levels: buildTempleWorld(),
    unlocks: { 5: { char: 'guardian' }, 10: { char: 'monnik' }, 15: { char: 'ninja' } },
  },
};
const JOURNEY_ORDER = [1, 2];

/* ---------- SHOP-POWERUPS (koop met munten -> inventaris; activeer 1 per keer in een match) ----------
   'kind' = welk drop-effect wordt toegepast (hergebruikt applyDrop). Meermaals te kopen (stapelt). */
const SHOP_POWERUPS = {
  heal:     { name: 'Medipack', cost: 60,  kind: 'health',   icon: '➕', desc: 'Herstelt meteen 40 HP.' },
  shield:   { name: 'Schild',   cost: 90,  kind: 'shield',   icon: '🛡', desc: 'Schild dat een flinke klap opvangt.' },
  speed:    { name: 'Speed',    cost: 70,  kind: 'speed',    icon: '⚡', desc: 'Even een stuk sneller.' },
  rage:     { name: 'Rage',     cost: 100, kind: 'rage',     icon: '⚔', desc: 'Even veel meer klap-schade.' },
  fireball: { name: 'Vuurbal',  cost: 120, kind: 'fireball', icon: '🔥', desc: '3 vuurballen die ook laten branden.' },
  dragon:   { name: 'Draak',    cost: 1000, kind: 'dragon',  icon: '🐉', desc: 'Roep een draak op die vuur spuwt naar je tegenstander.' },
  ak47:      { name: 'AK47',        cost: 0, kind: 'ak47',      icon: '🔫', desc: 'Machinegeweer met 50 kogels. Alleen uit kisten.', chestOnly: true },
  rocket:    { name: 'Raket',       cost: 0, kind: 'rocket',    icon: '🚀', desc: 'Raketwerper. Alleen uit kisten.', chestOnly: true },
  cannon:    { name: 'Kanon',       cost: 0, kind: 'cannon',    icon: '💣', desc: 'Kanonskogel die richt op je tegenstander. Alleen uit kisten.', chestOnly: true },
  beachball: { name: 'Strandbal',   cost: 0, kind: 'beachball', icon: '🏐', desc: 'Kaats de tegenstander weg met de strandbal. Alleen uit kisten.', chestOnly: true },
  coco:      { name: 'Kokosbom',    cost: 0, kind: 'coco',      icon: '🥥', desc: 'Lobt en ontploft met knockback. Alleen uit kisten.', chestOnly: true },
  boom:      { name: 'Boemerang',   cost: 0, kind: 'boom',      icon: '🪃', desc: 'Vliegt uit en keert terug. Alleen uit kisten.', chestOnly: true },
  dart:      { name: 'Gifdart',     cost: 0, kind: 'dart',      icon: '🎯', desc: 'Snelle dart die verdooft. Alleen uit kisten.', chestOnly: true },
  rock:      { name: 'Rotsblok',    cost: 0, kind: 'rock',      icon: '🪨', desc: 'Laat rotsblokken op je tegenstander vallen. Alleen uit kisten.', chestOnly: true },
  lightning: { name: 'Bliksem',     cost: 0, kind: 'lightning', icon: '🌩', desc: 'Verdoof je tegenstander met de bliksem. Alleen uit kisten.', chestOnly: true },
  smokevanish: { name: 'Smoke Vanish', cost: 0, kind: 'smoke', icon: '💨', desc: 'Word 3s onzichtbaar en laat een rookwolk achter.', chestOnly: true },
  // ---- alleen in de Training-lobby-computer ----
  ninjastar: { name: 'Ninja-sterren', cost: 0, kind: 'ninjastar', icon: '🌟', desc: '3 draaiende ninja-sterren.', trainingOnly: true },
  deagle:     { name: 'Desert Eagle',  cost: 0, kind: 'deagle',    icon: '🔫', desc: 'Fors pistool met terugslag: halve HP, 3 kogels.', trainingOnly: true },
  crossbow:   { name: 'Kruisboog',     cost: 0, kind: 'crossbow',  icon: '🏹', desc: 'Schiet pijlen: 35 schade, 7 pijlen.', trainingOnly: true },
  chainsaw:   { name: 'Kettingzaag',   cost: 0, kind: 'chainsaw',  icon: '🪚', desc: 'Melee: 60 schade, maar traag.', trainingOnly: true },
};
const POWERUP_ORDER = ['heal', 'shield', 'speed', 'rage', 'fireball', 'dragon', 'ak47', 'rocket', 'cannon', 'beachball', 'coco', 'boom', 'dart', 'rock', 'lightning'];
// volgorde in de Training-lobby-computer: alles wat je kunt uitproberen (incl. training-only wapens)
const TRAINING_POWERUP_ORDER = ['heal', 'shield', 'speed', 'rage', 'fireball', 'dragon', 'smokevanish', 'ak47', 'deagle', 'crossbow', 'rocket', 'cannon', 'ninjastar', 'beachball', 'coco', 'boom', 'dart', 'rock', 'lightning'];
// melee-wapens die je in de Training-lobby-computer kunt kiezen (blijven na respawn)
const TRAINING_MELEE_ORDER = ['bat', 'club', 'machete', 'sword', 'dagger', 'axe', 'spear', 'mace', 'flail', 'bostaff', 'katana', 'halberd', 'chainsaw'];

/* ---------- KISTEN (loot uit online matches, Clash-stijl met unlock-timers) ---------- */
const CHEST_TYPES = {
  common:    { name: 'Common',    col: '#b0763a', band: '#e6b070', dur: 2 * 3600e3,   gold: [50, 100],   xp: [25, 150] },
  rare:      { name: 'Rare',      col: '#3a7ad0', band: '#9fceff', dur: 3.5 * 3600e3, gold: [100, 220],  xp: [75, 250] },
  epic:      { name: 'Epic',      col: '#8a3ad0', band: '#cf9dff', dur: 8 * 3600e3,   gold: [350, 550],  xp: [150, 400] },
  legendary: { name: 'Legendary', col: '#e8a81c', band: '#fff0a0', dur: 14 * 3600e3,  gold: [500, 1000], xp: [250, 700] },
};
const CHEST_ORDER = ['common', 'rare', 'epic', 'legendary'];

/* ---------- RANK-systeem (alleen echte online matchmaking-potjes; bots tellen niet) ---------- */
const RANKS = [
  { name: 'Bronze I',   rp: 0,    tier: 'bronze',   sub: 1, col: '#cd7f32', glow: '#e59b52', coins: 0,    chest: null },
  { name: 'Bronze II',  rp: 100,  tier: 'bronze',   sub: 2, col: '#cd7f32', glow: '#e59b52', coins: 100,  chest: 'common' },
  { name: 'Bronze III', rp: 200,  tier: 'bronze',   sub: 3, col: '#cd7f32', glow: '#e59b52', coins: 150,  chest: 'common' },
  { name: 'Silver I',   rp: 350,  tier: 'silver',   sub: 1, col: '#c3ccd6', glow: '#eaf1f8', coins: 250,  chest: 'rare' },
  { name: 'Silver II',  rp: 500,  tier: 'silver',   sub: 2, col: '#c3ccd6', glow: '#eaf1f8', coins: 300,  chest: 'rare' },
  { name: 'Silver III', rp: 650,  tier: 'silver',   sub: 3, col: '#c3ccd6', glow: '#eaf1f8', coins: 400,  chest: 'rare',      title: 'Arena Fighter' },
  { name: 'Gold I',     rp: 850,  tier: 'gold',     sub: 1, col: '#ffcf40', glow: '#ffe680', coins: 600,  chest: 'epic',      title: 'Kampioen' },
  { name: 'Gold II',    rp: 1050, tier: 'gold',     sub: 2, col: '#ffcf40', glow: '#ffe680', coins: 700,  chest: 'epic' },
  { name: 'Gold III',   rp: 1250, tier: 'gold',     sub: 3, col: '#ffcf40', glow: '#ffe680', coins: 850,  chest: 'epic' },
  { name: 'Platinum',   rp: 1500, tier: 'platinum', sub: 0, col: '#5fe6d0', glow: '#a9fff2', coins: 1200, chest: 'epic' },
  { name: 'Diamond',    rp: 1800, tier: 'diamond',  sub: 0, col: '#6fb2ff', glow: '#c4e2ff', coins: 1600, chest: 'legendary' },
  { name: 'Champion',   rp: 2200, tier: 'champion', sub: 0, col: '#b06bff', glow: '#e2c8ff', coins: 2200, chest: 'legendary' },
  { name: 'Elite',      rp: 2700, tier: 'elite',    sub: 0, col: '#ff5a5a', glow: '#ffd0d0', coins: 3000, chest: 'legendary' },
];
const RANK_RP = { win: 30, loss: -15, streakBonus: 10, higherRankBonus: 5, quit: -30 };
function rankForRp(rp) { rp = rp || 0; let idx = 0; for (let i = 0; i < RANKS.length; i++) if (rp >= RANKS[i].rp) idx = i; return idx; }
// Checkpoint-ranks: eenmaal bereikt zak je nooit meer onder deze rank (RP-vloer). Brons III, Zilver III, Goud III, Champion.
const RANK_CHECKPOINTS = [2, 5, 8, 11];
function rankFloorRp(highestIdx) { let f = 0; for (const cp of RANK_CHECKPOINTS) if ((highestIdx || 0) >= cp) f = RANKS[cp].rp; return f; }
// bijpassende edelsteen-kleur per tier
const RANK_GEM = { bronze: '#ff9a3c', silver: '#d3ecff', gold: '#ffe14a', platinum: '#4ff0d6', diamond: '#8fd6ff', champion: '#c88bff', elite: '#ff5a6a' };
function rankShade(hex, amt) {
  hex = (hex || '#888888').replace('#', ''); if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  let r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  const to = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (to - r) * p); g = Math.round(g + (to - g) * p); b = Math.round(b + (to - b) * p);
  return '#' + [r, g, b].map((x) => ('0' + Math.max(0, Math.min(255, x)).toString(16)).slice(-2)).join('');
}
// rank-embleem: schildje met edelsteen; hoe hoger de rank, hoe rijker versierd
function rankShieldSVG(idx, px) {
  const rk = RANKS[idx] || RANKS[0], i = idx;
  const metal = rk.col, mlt = rankShade(metal, 0.55), mdk = rankShade(metal, -0.5), trim = rankShade(metal, -0.7);
  const gem = RANK_GEM[rk.tier] || '#ffffff', glt = rankShade(gem, 0.55), gdk = rankShade(gem, -0.45), glow = rk.glow;
  const mg = 'rkm' + i, gg = 'rkg' + i, fg = 'rkf' + i;
  const shield = 'M24 10 L40 15 L40 30 C40 45 32 52 24 55 C16 52 8 45 8 30 L8 15 Z';
  const dim = px ? (' width="' + px + '" height="' + Math.round(px * 60 / 48) + '"') : ' width="100%" height="100%"';
  let o = '<svg viewBox="0 0 48 60"' + dim + ' xmlns="http://www.w3.org/2000/svg" class="rank-shield" preserveAspectRatio="xMidYMid meet">';
  o += '<defs><linearGradient id="' + mg + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + mlt + '"/><stop offset="0.5" stop-color="' + metal + '"/><stop offset="1" stop-color="' + mdk + '"/></linearGradient>'
    + '<radialGradient id="' + gg + '" cx="0.5" cy="0.36" r="0.72"><stop offset="0" stop-color="' + glt + '"/><stop offset="0.6" stop-color="' + gem + '"/><stop offset="1" stop-color="' + gdk + '"/></radialGradient>';
  if (i >= 10) o += '<filter id="' + fg + '" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.7"/></filter>';
  o += '</defs>';
  if (i >= 10) o += '<path d="' + shield + '" fill="' + glow + '" opacity="0.6" filter="url(#' + fg + ')"/>';                 // gloed (Diamond+)
  if (i >= 12) { o += '<g stroke="' + glow + '" stroke-width="1.5" opacity="0.75">'; for (let a = 0; a < 12; a++) { const an = a * Math.PI / 6, c = Math.cos(an), s = Math.sin(an); o += '<line x1="' + (24 + c * 15).toFixed(1) + '" y1="' + (32 + s * 17).toFixed(1) + '" x2="' + (24 + c * 21).toFixed(1) + '" y2="' + (32 + s * 23).toFixed(1) + '"/>'; } o += '</g>'; }   // stralen (Elite)
  if (i >= 9) o += '<g fill="' + mlt + '" stroke="' + trim + '" stroke-width="0.8"><path d="M9 15 C-1 14 -3 22 2 27 C5 22 9 22 11 23 Z"/><path d="M39 15 C49 14 51 22 46 27 C43 22 39 22 37 23 Z"/></g>';   // vleugels (Platinum+)
  if (i >= 6) o += '<g><path d="M15 11 L15 4 L20 8 L24 2 L28 8 L33 4 L33 11 Z" fill="#ffd24a" stroke="#a9781a" stroke-width="0.8" stroke-linejoin="round"/><circle cx="24" cy="5.4" r="1.5" fill="' + gem + '"/><circle cx="16.4" cy="6.2" r="1" fill="' + gem + '"/><circle cx="31.6" cy="6.2" r="1" fill="' + gem + '"/></g>';   // kroontje (Gold+)
  o += '<path d="' + shield + '" fill="url(#' + mg + ')" stroke="' + trim + '" stroke-width="2.4" stroke-linejoin="round"/>';
  o += '<path d="M24 12.5 L37 16.5 L37 22 C30 20 18 20 11 22 L11 16.5 Z" fill="#ffffff" opacity="0.2"/>';                    // bevel-highlight
  if (i >= 6) o += '<path d="' + shield + '" fill="none" stroke="' + glow + '" stroke-width="1" opacity="0.9" transform="translate(24 33) scale(0.8) translate(-24 -33)"/>';   // binnenrand (Gold+)
  if (i >= 3) o += '<g fill="' + glt + '" stroke="' + trim + '" stroke-width="0.5"><circle cx="12" cy="19" r="1.5"/><circle cx="36" cy="19" r="1.5"/><circle cx="24" cy="50" r="1.5"/></g>';   // klinknagels (Silver+)
  o += '<g><polygon points="24,21 33,30 24,42 15,30" fill="url(#' + gg + ')" stroke="' + gdk + '" stroke-width="0.6"/>'
    + '<polygon points="24,21 33,30 24,30 15,30" fill="' + glt + '" opacity="0.5"/>'
    + '<line x1="24" y1="21" x2="24" y2="42" stroke="' + gdk + '" stroke-width="0.4" opacity="0.5"/><line x1="15" y1="30" x2="33" y2="30" stroke="' + gdk + '" stroke-width="0.4" opacity="0.5"/>'
    + '<circle cx="20.5" cy="27" r="1.5" fill="#ffffff" opacity="0.85"/></g>';   // edelsteen
  o += '</svg>';
  return o;
}
const CHEST_WIN_CHANCE = 0.5, CHEST_LOSS_CHANCE = 0.15;               // kans op een kist na een online match
const CHEST_RARITY_WEIGHTS = { common: 62, rare: 26, epic: 9, legendary: 3 };   // betere kisten veel zeldzamer
const CHEST_SLOTS = 3;                                                // je kunt er max 3 hebben

/* ---------- SMEDERIJ (blacksmith): materialen + harnassen ---------- */
// materialen vind je in kisten; bij de smid smeed je er harnas-stukken mee (kost tijd, te skippen met robijnen).
const MATERIALS = {
  leather: { id: 'leather', name: 'Leer',     col: '#9a5a2a' },
  nails:   { id: 'nails',   name: 'Spijkers', col: '#c0c6cc' },
  iron:    { id: 'iron',    name: 'IJzer',    col: '#aab2ba' },
  steel:   { id: 'steel',   name: 'Staal',    col: '#8fa8c4' },
};
const MATERIAL_ORDER = ['leather', 'nails', 'iron', 'steel'];

const ARMOR_SLOTS = ['hat', 'chest', 'bottom', 'feet'];
const ARMOR_SLOT_NAME = { hat: 'Helm', chest: 'Borststuk', bottom: 'Beenstuk', feet: 'Laarzen' };
// 3 sets: Leer (goedkoop, weinig HP) -> IJzer -> Staal (duur, veel HP). Elk stuk geeft extra HP + heeft duurzaamheid.
// ridder-harnassen (intern nog leather/iron/steel als tier-id, maar met ridder-namen & zilverlook).
// col = plaatkleur, plume = pluim/mantel-rood, trim = randwerk (goud bij de royal), cape = rode mantel.
const ARMOR_SETS = {
  leather: { id: 'leather', name: 'Schildknaap',  col: '#aab2ba', colDk: '#6a727a', plume: '#c0392b', trim: null,      cape: false },
  iron:    { id: 'iron',    name: 'Ridder',       col: '#c6ced6', colDk: '#79818a', plume: '#c0392b', trim: '#9aa3ad', cape: true },
  steel:   { id: 'steel',   name: 'Royal Knight', col: '#dae2ea', colDk: '#8a929c', plume: '#d13a2e', trim: '#e8b431', cape: true },
};
const ARMOR_SET_ORDER = ['leather', 'iron', 'steel'];
function buildArmorPieces() {
  const slotHp   = { chest: 1.0, bottom: 0.7, hat: 0.55, feet: 0.45 };   // borst geeft het meest
  const tierBase = { leather: 14, iron: 26, steel: 40 };                 // basis-HP per set
  const tierDur  = { leather: 60, iron: 110, steel: 170 };               // duurzaamheid (slijt langzaam)
  const tierMs   = { leather: 60 * 60e3, iron: 180 * 60e3, steel: 360 * 60e3 };   // smeedtijd: 1u -> 3u -> 6u (hoe beter, hoe langer)
  // elke set heeft leer + ijzer nodig; hogere sets ook staal (meer naarmate het beter wordt)
  const cost = {
    leather: { hat: { iron: 2, leather: 2, nails: 2 }, chest: { iron: 4, leather: 3, nails: 3 }, bottom: { iron: 3, leather: 2, nails: 2 }, feet: { iron: 2, leather: 2, nails: 1 } },
    iron:    { hat: { iron: 3, steel: 1, leather: 1, nails: 3 }, chest: { iron: 5, steel: 2, leather: 2, nails: 4 }, bottom: { iron: 4, steel: 1, leather: 1, nails: 3 }, feet: { iron: 3, steel: 1, nails: 2 } },
    steel:   { hat: { steel: 3, iron: 2, leather: 1, nails: 3 }, chest: { steel: 6, iron: 3, leather: 2, nails: 4 }, bottom: { steel: 4, iron: 2, leather: 1, nails: 3 }, feet: { steel: 3, iron: 2, nails: 2 } },
  };
  const pieces = {};
  for (const set of ARMOR_SET_ORDER) for (const slot of ARMOR_SLOTS) {
    const id = set + '_' + slot;
    pieces[id] = {
      id, set, slot, name: ARMOR_SETS[set].name + ' ' + ARMOR_SLOT_NAME[slot],
      hp: Math.round(tierBase[set] * slotHp[slot]),
      maxDur: tierDur[set], craft: cost[set][slot], craftMs: tierMs[set],
    };
  }
  return pieces;
}
const ARMOR_PIECES = buildArmorPieces();
const ARMOR_ORDER = Object.keys(ARMOR_PIECES);

/* ---------- BOT-MOEILIJKHEID (level 1..10) ----------
   Elk level heeft een eigen speelstijl. Velden:
   meleeCd = ms tussen meppen, block = blokkans, aggro = hoe vaak 'ie de aanval zoekt,
   react = reactietijd vóór 'ie mept (ms), shootCd = ms tussen schoten (beide-wapens),
   jumpy = kans dat 'ie naar platforms springt, standoff = gewenste afstand tot de speler */
const BOT_PROFILES = [
  { name: 'Luiaard',      meleeCd: 1300, block: 0.00, aggro: 0.45, react: 700, shootCd: 2600, jumpy: 0.45, standoff: 70, mistake: 0.45 },
  { name: 'Schuchter',    meleeCd: 1100, block: 0.05, aggro: 0.55, react: 600, shootCd: 2200, jumpy: 0.50, standoff: 56, mistake: 0.40 },
  { name: 'Straatvechter',meleeCd: 950,  block: 0.10, aggro: 0.70, react: 520, shootCd: 1900, jumpy: 0.60, standoff: 30, mistake: 0.34 },
  { name: 'Verdediger',   meleeCd: 850,  block: 0.45, aggro: 0.65, react: 460, shootCd: 1700, jumpy: 0.60, standoff: 34, mistake: 0.28 },
  { name: 'Jager',        meleeCd: 750,  block: 0.20, aggro: 0.95, react: 400, shootCd: 1500, jumpy: 0.70, standoff: 24, mistake: 0.22 },
  { name: 'Springer',     meleeCd: 760,  block: 0.20, aggro: 0.85, react: 380, shootCd: 1500, jumpy: 0.95, standoff: 28, mistake: 0.18 },
  { name: 'Schutter',     meleeCd: 560,  block: 0.25, aggro: 0.80, react: 320, shootCd: 560,  jumpy: 0.65, standoff: 64, mistake: 0.16 },
  { name: 'Razend',       meleeCd: 520,  block: 0.15, aggro: 1.00, react: 300, shootCd: 1300, jumpy: 0.80, standoff: 22, mistake: 0.10 },
  { name: 'Tacticus',     meleeCd: 600,  block: 0.55, aggro: 0.85, react: 300, shootCd: 1100, jumpy: 0.85, standoff: 32, mistake: 0.06 },
  { name: 'Meester',      meleeCd: 400,  block: 0.62, aggro: 1.00, react: 220, shootCd: 750,  jumpy: 0.95, standoff: 24, mistake: 0.03 },
];
// dropsoorten + relatieve kans
const SMASH_DROPS = [
  { kind: 'weapon', w: 34 },         // willekeurig melee-wapen
  { kind: 'fireball', w: 16 },
  { kind: 'rocket', w: 10 },
  { kind: 'health', w: 20 },
  { kind: 'rage', w: 10 },
  { kind: 'speed', w: 10 },
  { kind: 'dragon', w: 5 },           // drakenei: zeldzaam
];
// melee-wapens die kunnen vallen (alle echte melee, geen knuppel/schild)
const SMASH_WEAPON_POOL = ['club', 'machete', 'sword', 'dagger', 'axe', 'spear', 'mace', 'flail', 'bostaff', 'katana', 'halberd'];

/* ---------- XP / LEVELS (multiplayer-duels) ----------
   XP per duel: winst geeft meer dan verlies. Langzame, oplopende curve:
   level L vereist 75*L*(L-1) totale XP -> L2=150, L3=450, L4=900, L5=1500, L10=6750.
   Met +50/win en +15/loss duurt levelen flink (niet te snel). */
const XP_WIN = 50;
const XP_LOSS = 15;
function playerLevel(xp) {
  return Math.floor((1 + Math.sqrt(1 + (4 * (xp || 0)) / 75)) / 2);
}
function xpForLevel(L) { return 75 * L * (L - 1); }   // totale XP nodig voor level L

/* ---------- CHARACTER-LEVELING (per character, tot lvl 20) ----------
   Je character verzamelt XP door ermee te spelen. Is de XP-balk vol, dan kun je
   'm upgraden voor munten (1000, 2500, 4500, 7000, ...). Betere characters kosten meer.
   Elke level: +2 HP; vanaf lvl 10 ook wat sneller; vanaf lvl 5 duren abilities langer. */
const CHAR_MAX_LEVEL = 20;
function charXpNeeded(lvl) { return 150 * lvl; }                 // XP voor de balk van lvl -> lvl+1 (langzaam)
function charTierMul(ch) {
  if (!ch) return 1;
  if (ch.journeyOnly) return 1.5;                                // boss-characters (monnik/ninja/bewaker)
  const c = ch.cost || 0;
  if (c === 0) return 1.0;
  if (c < 2000) return 1.25;
  if (c < 8000) return 1.6;
  return 2.0;
}
function charUpgradeCost(ch, lvl) { return Math.round(250 * lvl * (lvl + 3) * charTierMul(ch)); }   // L1->2:1000, L2->3:2500, ...
function charHpBonus(lvl) { return (lvl - 1) * 2; }                          // +2 HP per level
function charSpeedMul(lvl) { return 1 + Math.max(0, lvl - 10) * 0.01; }      // vanaf lvl 10: tot +10% snelheid
function charAbilityDurMul(lvl) { return 1 + Math.max(0, lvl - 5) * 0.05; }  // vanaf lvl 5: tot +75% ability-duur

/* ---------- Jungle: gorilla in de kooi ---------- */
const GORILLA_HP = 280;            // sterk, maar te verslaan
const GORILLA_RESPAWN = 16000;     // komt na ~16s terug
const GORILLA_SWIPE_CD = 1100;     // ms tussen klappen
const GORILLA_REACH = 44;          // bereik van de klap

/* ---------- Jungle: wilde aap in het midden (springt + mept je van de map) ---------- */
const APE_JUMP_EVERY = 3000;       // ms dat de aap op de grond wacht tussen sprongen
const APE_JUMP_VY = -6.4;          // opwaartse sprongkracht
const APE_GRAV = 0.34;             // zwaartekracht voor de aap-sprong

/* ---------- Pirate Ship: zeemonster-tentakel ---------- */
const PIRATE_TENT_EVERY = 7000;    // ms tussen tentakels
const PIRATE_TENT_WARN = 1100;     // waarschuwing (water borrelt) vóór de slag
const PIRATE_TENT_STRIKE = 700;    // duur van de slag

/* ---------- Sky Castle-map: draak die af en toe een snoekduik maakt ---------- */
const CASTLE_DRAGON_EVERY = 9000;   // ms tussen duiken (+ random)
const CASTLE_DRAGON_DUR = 1500;     // duur van één duik (van de ene kant naar de andere)

/* ---------- Vulcan-map: lavastraal + schuine platforms ---------- */
const VULCAN_EVERY = 6500;     // ms tussen uitbarstingen
const VULCAN_BUBBLE = 1300;    // borrel-waarschuwing vóór de uitbarsting
const VULCAN_ERUPT = 950;      // duur van de lavastraal
const VULCAN_SLIDE = 0.85;     // afglijsnelheid op schuine platforms (px/frame)

/* ---------- 1 vs 1 MAPS ----------
   Elke map past op één scherm (geen camera-scroll, beide spelers altijd in beeld).
   platform: { x, y, w, mv? } — mv = { axis:'x'|'y', amp, speed, phase } beweegt het platform.
   sky = [boven, onder] kleuren, void = afgrond-kleur onderin. */
// ---- TRAINING LOBBY: grote online sandbox-map met dichte ondergrond (je valt er niet af) ----
const TRAINING_MAP = {
  id: 'training', name: 'Training Lobby', sky: ['#26314a', '#0e131f'], void: '#0a0e16',
  plat: 'stone', stone: true, training: true, w: 1280, groundY: CONFIG.GROUND_Y,
  spawn: { x: 640, y: CONFIG.GROUND_Y },
  computer: { x: 96, y: CONFIG.GROUND_Y },       // computer in de linker hoek
  platforms: [
    { x: 300, y: 128, w: 96 }, { x: 520, y: 96, w: 84 }, { x: 760, y: 128, w: 96 },
    { x: 980, y: 104, w: 84 }, { x: 640, y: 58, w: 72 },
  ],
  // respawn-plekken (verspreid over de map) — bij dood spawn je meteen op een willekeurige
  spawns: [
    { x: 220, y: CONFIG.GROUND_Y }, { x: 640, y: CONFIG.GROUND_Y }, { x: 1060, y: CONFIG.GROUND_Y },
    { x: 420, y: CONFIG.GROUND_Y }, { x: 860, y: CONFIG.GROUND_Y },
  ],
};
const VERSUS_MAPS = [
  {
    // Jungle: grootste map. Oerwoud-achtergrond + papegaaien.
    // Af en toe schieten er stun-darts door de map (verdoven kort wie ze raken). Portalen komen hier minder vaak.
    id: 'jungle', name: 'Jungle', sky: ['#163a24', '#08160e'], void: '#06120a', plat: 'leaf', jungle2: true,
    w: 960, fallY: 240, camTop: -60, camBottom: 30, darts: true, portalMul: 2.4,
    spawnL: { x: 120, y: 176 }, spawnR: { x: 840, y: 176 },
    platforms: [
      { x: 120, y: 176, w: 170 }, { x: 840, y: 176, w: 170 },   // grond links/rechts
      { x: 480, y: 176, w: 150 },                                // midden-grond
      { x: 300, y: 120, w: 76 }, { x: 660, y: 120, w: 76 },      // midden
      { x: 160, y: 66, w: 52 }, { x: 800, y: 66, w: 52 },       // hoog links/rechts
      { x: 480, y: 80, w: 80 },                                  // centraal hoog platform
      { x: 420, y: 132, w: 40 }, { x: 540, y: 132, w: 40 },      // kleine richels naast het midden
    ],
  },
  {
    // Sky Castle: een zwevend kasteel hoog in de lucht (ontworpen in de Map Maker).
    // Twee grond-vleugels met een lagere midden-plaat, gaten ertussen (je valt eraf),
    // een stenen middentoren en 4 zwevende platforms. Af en toe maakt een draak een
    // snoekduik dwars over de map -> raakt hij je, dan word je hard van de map af geknald.
    id: 'castle', name: 'Sky Castle', sky: ['#2a4a86', '#0e1c3a'], void: '#0a1226',
    plat: 'stone', stone: true, castle: true,
    w: 702, fallY: 230, camTop: -56, camBottom: 30,
    spawnL: { x: 130, y: 178 }, spawnR: { x: 572, y: 178 },
    platforms: [
      { x: 154, y: 178, w: 168 }, { x: 548, y: 178, w: 168 },   // grond-vleugels links/rechts
      { x: 351, y: 182, w: 140 },                                // lagere midden-plaat
      { x: 190, y: 140, w: 54 }, { x: 512, y: 140, w: 54 },      // lage zwevende platforms
      { x: 283, y: 117, w: 54 }, { x: 419, y: 117, w: 54 },      // midden zwevende platforms
      { x: 351, y: 70, w: 54 },                                  // hoog midden
      { x: 222, y: 42, w: 54 }, { x: 480, y: 42, w: 54 },        // hoge toppen links/rechts
    ],
  },
  {
    // Dohyo: kleine Japanse sumo-ring. Eén klein rond platform -> je wordt er makkelijk afgeslagen.
    // Alle power-ups vallen hier.
    id: 'dohyo', name: 'Dohyo', sky: ['#caa066', '#7a5a36'], void: '#140a06', plat: 'dohyo', dohyo: true, noPortals: true, w: 360,
    spawnL: { x: 145, y: 150 }, spawnR: { x: 215, y: 150 },
    platforms: [
      { x: 180, y: 150, w: 138 },   // de ring (midden, onder)
      { x: 64, y: 104, w: 58 },     // zwevend platform links
      { x: 296, y: 104, w: 58 },    // zwevend platform rechts
    ],
  },
  {
    // Piratenschip: heel het dek is begaanbaar, 4 platforms, 2 masten (kraaiennest) om bovenin te staan.
    // Af en toe komt er een zeemonster-tentakel uit het water die je platslaat of van de boot af mept.
    id: 'pirate', name: 'Pirate Ship', sky: ['#1f4e7a', '#0c1d33'], void: '#06121f', plat: 'wood', wood: true, pirate: true,
    w: 720, fallY: 232, camTop: -20, camBottom: 30,
    spawnL: { x: 200, y: 178 }, spawnR: { x: 520, y: 178 },
    platforms: [
      { x: 360, y: 178, w: 520 },                              // het dek (heel de ondergrond)
      { x: 175, y: 132, w: 64 }, { x: 545, y: 132, w: 64 },    // 2 lage platforms
      { x: 300, y: 96, w: 56 }, { x: 420, y: 96, w: 56 },      // 2 hogere platforms
      { x: 230, y: 40, w: 34, mast: true }, { x: 490, y: 40, w: 34, mast: true },  // 2 masten (kraaiennest)
    ],
  },
  {
    // Temple: stenen tempel-arena (net zo groot als Pirate Ship). Getrapte muur-blokken links/rechts
    // (langs lopen op de grond + erop springen), een GROOT GAT in het midden (val = eraf), 2 zwevende
    // platforms, en 2 deuren die je naar de overkant teleporteren. Géén portals op deze map.
    id: 'temple', name: 'Temple', sky: ['#f2b96a', '#9a5a4a'], void: '#0a0604', plat: 'stone', stone: true, temple: true, noPortals: true,
    w: 720, fallY: 232, camTop: -20, camBottom: 30,
    spawnL: { x: 90, y: 178 }, spawnR: { x: 630, y: 178 },
    platforms: [
      { x: 110, y: 180, w: 180, wall: true }, { x: 610, y: 180, w: 180, wall: true },   // grond links/rechts (midden = het grote gat)
      { x: 150, y: 132, w: 118, wall: true }, { x: 570, y: 132, w: 118, wall: true },    // getrapte muur-blokken (met een deur erin)
      { x: 268, y: 90, w: 60 }, { x: 452, y: 90, w: 60 },                                 // 2 zwevende platforms (deur-bestemmingen)
    ],
    doors: [
      { x: 150, y: 132, tx: 452, ty: 76 },   // linker deur (2) -> rechter zwevend platform
      { x: 570, y: 132, tx: 268, ty: 76 },   // rechter deur (1) -> linker zwevend platform
    ],
  },
  {
    // Vulcan: net zo groot als Cave. Stenen platforms, lavastraal in het midden,
    // schuine platforms naast de opening waar je vanaf glijdt; achtergrond met uitbarstingen + rook.
    id: 'lava', name: 'Volcano', sky: ['#3a1410', '#1a0805'], void: '#5a1408', plat: 'stone', stone: true, vulcan: true,
    w: 720, fallY: 232, camTop: -30, camBottom: 30, vulcanX: 360,
    spawnL: { x: 90, y: 176 }, spawnR: { x: 630, y: 176 },
    platforms: [
      { x: 110, y: 176, w: 130 }, { x: 610, y: 176, w: 130 },   // grond links/rechts (midden = opening)
      { x: 230, y: 138, w: 56 }, { x: 490, y: 138, w: 56 },     // mid steen
      { x: 296, y: 96, w: 54, slide: -1 }, { x: 424, y: 96, w: 54, slide: 1 },  // schuine slide-platforms naast de opening
      { x: 175, y: 70, w: 40 }, { x: 545, y: 70, w: 40 },       // hoog steen
    ],
  },
  {
    // Airplane: je vecht op het dak van een vliegend vliegtuig. Het dak is de hele ondergrond
    // (je valt er alleen vanaf de zijkanten af). In de lucht wolk-platforms (max 5s, dan zak je erdoor).
    // Af en toe scheren er vogels langs vanaf de voorkant (links) — raken ze je: mega knockback naar achter.
    id: 'airplane', name: 'Airplane', sky: ['#4a9ad8', '#a9d8f0'], void: '#3a7ab0',
    plat: 'metal', airplane: true, clouds: true,
    w: 760, fallY: 240, camTop: -120, camBottom: 30,
    spawnL: { x: 260, y: 176 }, spawnR: { x: 500, y: 176 },
    platforms: [
      { x: 380, y: 178, w: 452, roof: true },                          // vliegtuigdak = hele ondergrond
      { x: 200, y: 120, w: 66, cloud: true }, { x: 560, y: 120, w: 66, cloud: true },   // wolk-platforms (5s)
      { x: 380, y: 98, w: 76, cloud: true },
      { x: 288, y: 54, w: 60, cloud: true }, { x: 472, y: 54, w: 60, cloud: true },
    ],
  },
  {
    // grot: net zo groot als Sky. Diepe grotten op de achtergrond, vleermuizen, waterdruppels.
    // Knoppen onder/boven die af en toe rood knipperen -> een muur gooit de tegenstander aan de andere kant eraf.
    id: 'cave', name: 'Cave', sky: ['#241f33', '#0b0810'], void: '#050308', plat: 'rock', cave: true,
    w: 720, fallY: 232, camTop: -30, camBottom: 30,
    spawnL: { x: 90, y: 176 }, spawnR: { x: 630, y: 176 },
    platforms: [
      { x: 110, y: 176, w: 120 }, { x: 610, y: 176, w: 120 },   // grond (groot)
      { x: 360, y: 150, w: 150 },                                // grote middenplaat
      { x: 215, y: 120, w: 30 }, { x: 505, y: 120, w: 30 },      // kleine
      { x: 360, y: 98, w: 96 },                                  // grote
      { x: 150, y: 80, w: 28 }, { x: 570, y: 80, w: 28 },        // kleine hoog
      { x: 300, y: 60, w: 30 }, { x: 420, y: 60, w: 30 },        // kleine top
      { x: 360, y: 60, w: 40 },                                  // center-top (bovenste knop)
    ],
    buttons: [
      { at: 'mid', x: 360, y: 98 },                              // 1 knop in het midden -> straal sweept de map
    ],
  },
  {
    // Beach: strand met zee + golven op de achtergrond. Af en toe vloed: water stijgt over de map
    // en de golven nemen je mee. Powerup: strandbal (stuitert, harde knockback, ontploft na 15s).
    id: 'beach', name: 'Beach', sky: ['#8ad0f0', '#cde7f7'], void: '#1c4a5e', plat: 'sand', sand: true, beach: true, w: 360, fallY: 214,
    spawnL: { x: 120, y: 150 }, spawnR: { x: 240, y: 150 },
    platforms: [
      { x: 180, y: 150, w: 232 },                  // het strand (smaller -> je kunt er aan de zijkanten afvallen)
      { x: 74, y: 112, w: 56 }, { x: 286, y: 112, w: 56 },   // houten vlonders links/rechts (boven het water)
      { x: 180, y: 76, w: 78 },                    // hoog plankier
    ],
  },
];

function buildWorld1() {
  const levels = [];
  const themeFor = (id) => id <= 3 ? 'city' : id <= 6 ? 'park' : id <= 9 ? 'graveyard' : 'sewer';
  // levels 1 t/m 9: oplopende moeilijkheid
  for (let i = 0; i < 9; i++) {
    const t = i / 8; // 0..1 moeilijkheid
    const id = i + 1;
    // afwisselende missietypes voor variatie
    let mode = 'reach';
    if (id === 3) mode = 'horde';        // overleef de horde
    else if (id === 7) mode = 'melee';   // wapens geblokkeerd, alleen melee
    const lvl = {
      id, name: 'Level ' + id, theme: themeFor(id), mode,
      killAll: (mode === 'reach' || mode === 'melee'), // eerst alle zombies doden, dan de finish
      hordeTime: 32000,                                  // alleen voor horde-modus
      length: Math.round(1400 + i * 230),               // 1400 -> 3240
      zombieCount: Math.round(6 + i * 2),               // 6 -> 22
      spawnEvery: Math.round(1850 - t * 720),           // 1850ms -> 1130ms
      zombieHp: Math.round(36 + i * 8),                 // 36 -> 100
      zombieSpeed: +(0.55 + t * 0.55).toFixed(2),       // 0.55 -> 1.10 (gecapt op MAX)
      runnerChance: i >= 2 ? +(0.05 + t * 0.22).toFixed(2) : 0,
      crawlerChance: i >= 3 ? +(0.05 + t * 0.18).toFixed(2) : 0,
      bruteChance: i >= 5 ? +(0.04 + t * 0.12).toFixed(2) : 0,
      doorChance: 0.40,
      obstacleDensity: 0.5 + t * 0.6,                   // hoe vol met obstakels (0.5 -> 1.1)
      healMult: 1,
      maxAlive: Math.round(4 + i * 0.7),                // max zombies tegelijk levend (4 -> 10) — waves, niet overspoeld
      reward: 30 + i * 12,
    };
    // melee-only levels apart en eerlijker afstemmen (geen vuurwapen-vangnet)
    if (mode === 'melee') {
      lvl.length = 2100;          // korter
      lvl.zombieCount = 14;       // wat minder dan normaal
      lvl.zombieHp = 34;          // knuppel (34) velt walkers in 1 klap
      lvl.spawnEvery = 1800;      // ruimte tussen spawns
      lvl.zombieSpeed = 0.82;     // iets trager
      lvl.runnerChance = 0.12;
      lvl.crawlerChance = 0.05;   // crawlers zijn lastig te meleeën
      lvl.bruteChance = 0;        // GEEN brutes (oneerlijk zonder gun)
      lvl.obstacleDensity = 0.4;  // minder obstakels in de weg
      lvl.healMult = 2.6;         // veel meer EHBO-doosjes
      lvl.maxAlive = 5;           // weinig tegelijk (geen vuurwapen)
      lvl.reward = 120;           // mooie beloning voor de uitdaging
    }
    // checkpoint halverwege: haal 'm binnen de tijd, anders game over (dwingt doorlopen)
    if (lvl.killAll) lvl.midTime = Math.round(lvl.length * 9 + 3000);
    levels.push(lvl);
  }
  // level 10: BOSS-arena (geen normale spawns; baas roept zelf adds op)
  levels.push({
    id: 10, name: 'BOSS', theme: 'sewer', mode: 'boss', isBoss: true,
    length: 1500, zombieCount: 0, spawnEvery: 999999,
    zombieHp: 55, zombieSpeed: 1.0,
    runnerChance: 0.45, crawlerChance: 0, bruteChance: 0,
    doorChance: 0, obstacleDensity: 0.4, maxAlive: 8, reward: 300,
  });
  return levels;
}

/* ---------- WERELD 2: DE BERGEN (parkour) ----------
   parkour: true  -> platforms in de lucht, val = dood (ravijn), dubbel-jump aan
   flyerOnly: true -> alleen vliegende zombie-vogels (af en toe)
   gap/platW/yRange sturen de platform-generator in game.buildPlatforms() */
function buildWorld2() {
  const levels = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    levels.push({
      id: i + 1, name: 'Berg ' + (i + 1), theme: 'mountain', mode: 'reach',
      parkour: true, flyerOnly: true,
      length: Math.round(1500 + i * 220),               // 1500 -> 3260
      zombieCount: 999,                                  // doorlopend (vogels)
      spawnEvery: Math.round(3000 - t * 1100),          // 3000ms -> 1900ms (af en toe)
      zombieHp: Math.round(28 + i * 6),                 // 28 -> 76 (vogels zijn broos)
      zombieSpeed: +(0.8 + t * 0.5).toFixed(2),
      maxAlive: 2 + Math.floor(i / 3),                  // 2 -> 4 vogels tegelijk (niet te veel)
      // gaten: 66 -> 114. Enkele sprong haalt ~81, dus de grotere gaten VEREISEN dubbel-jump
      gapMin: 44 + i * 3, gapMax: 66 + i * 6,
      platMin: 48 - i, platMax: 74 - i,                 // smallere platforms (preciezer landen)
      yJump: 18 + i * 3,                                // groter hoogteverschil (18 -> 42)
      reward: 60 + i * 16,                              // munten bij het halen (60 -> 188)
    });
  }
  // level 10: BALLON-BOSS (parkour-arena, baas zweeft in een luchtballon)
  levels.push({
    id: 10, name: 'BALLON BOSS', theme: 'mountain', mode: 'boss', isBoss: true,
    parkour: true, balloonBoss: true,
    length: 1300, zombieCount: 0, spawnEvery: 999999,
    zombieHp: 34, zombieSpeed: 1.1, maxAlive: 4,
    gapMin: 40, gapMax: 60, platMin: 70, platMax: 100, yJump: 18,
    reward: 400,
  });
  return levels;
}

/* ---------- WERELD 3: JUNGLE ----------
   Normale gevechtslevels (vaste grond, veel zombies, af en toe een vogel) afgewisseld
   met een paar ECHTE parkour-levels (ravijn + platforms, zoals wereld 2) in jungle-stijl.
   Boss = mega zombie-aap (springt in één keer naar je toe). */
function buildWorld3() {
  const levels = [];
  const PARKOUR_LEVELS = [3, 6, 9];   // deze levels zijn pure parkour (jungle, zoals wereld 2)
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const id = i + 1;
    if (PARKOUR_LEVELS.includes(id)) {
      // ---- pure parkour-level (jungle-stijl): ravijn + zwevende platforms + vogels ----
      levels.push({
        id, name: 'Jungle ' + id, theme: 'jungle', mode: 'reach',
        parkour: true, flyerOnly: true,
        length: Math.round(1700 + i * 220),               // 1700 -> 3460
        zombieCount: 999,                                  // doorlopend (vogels)
        spawnEvery: Math.round(2700 - t * 1000),
        zombieHp: Math.round(30 + i * 6),
        zombieSpeed: +(0.85 + t * 0.5).toFixed(2),
        maxAlive: 2 + Math.floor(i / 3),
        gapMin: 46 + i * 3, gapMax: 72 + i * 6,            // gaten in het ravijn
        platMin: 50 - i, platMax: 76 - i,
        yJump: 18 + i * 3,
        reward: 130 + i * 18,
      });
    } else {
      // ---- normaal jungle-gevechtslevel: vaste grond, VEEL en taaie zombies ----
      const length = Math.round(2600 + i * 300);          // 2600 -> 5000
      levels.push({
        id, name: 'Jungle ' + id, theme: 'jungle', mode: 'reach',
        killAll: true, noObstacles: true,                 // geen straat-obstakels in de jungle
        flyerChance: +(0.12 + t * 0.10).toFixed(2),        // af en toe een vogel (gewone schade)
        dropperChance: +(0.12 + t * 0.10).toFixed(2),      // kleine luchtballon die zombies dropt
        endWave: true,                                      // extra golf bij de finish
        length,
        zombieCount: Math.round(34 + i * 8),               // 34 -> 98 (veel meer zombies)
        spawnEvery: Math.round(1150 - t * 550),            // 1150 -> 600 (sneller)
        zombieHp: Math.round(60 + i * 11),                 // 60 -> 148 (taaier — AK47 loopt er niet meer doorheen)
        zombieSpeed: +(0.8 + t * 0.5).toFixed(2),          // 0.8 -> 1.3
        runnerChance: +(0.16 + t * 0.26).toFixed(2),       // meer snelle zombies
        crawlerChance: +(0.10 + t * 0.20).toFixed(2),
        bruteChance: i >= 2 ? +(0.06 + t * 0.16).toFixed(2) : 0,  // brutes eerder en vaker
        doorChance: 0,
        maxAlive: Math.round(9 + i * 1.4),                 // 9 -> 20 tegelijk (drukker)
        reward: 110 + i * 22,
        midTime: Math.round(length * 11 + 5000),           // royale checkpoint-tijd
      });
    }
  }
  // level 10: MEGA ZOMBIE-AAP (springt in één keer naar je toe) — KLEINE arena: ontwijken!
  levels.push({
    id: 10, name: 'AAP BOSS', theme: 'jungle', mode: 'boss', isBoss: true, apeBoss: true,
    length: 380, zombieCount: 0, spawnEvery: 999999,
    zombieHp: 60, zombieSpeed: 1.1, maxAlive: 4,
    doorChance: 0, noObstacles: true, reward: 600,
  });
  return levels;
}

const WORLDS = [
  { id: 1, name: 'Verlaten Stad', levels: buildWorld1() },
  { id: 2, name: 'De Bergen', levels: buildWorld2() },
  { id: 3, name: 'Jungle', levels: buildWorld3() },
];

/* ---------- ZOMBIE KNOCK-OUT (arena wave-survival) ---------- */
const ARENA_PLAYS_PER_DAY = 3;   // max keer per dag
const ARENA_START_AMMO = 150;    // startmunitie per potje (los van je voorraad)
const ARENA_COIN_MULT = 0.3;     // munten per kill in de arena (lager dan verhaalmodus)
// het "level"-object voor de arena (bounded, geen finish/checkpoint)
const ARENA_LEVEL = {
  id: 0, name: 'Arena', theme: 'arena', mode: 'arena', arena: true,
  length: 600, doorChance: 0, obstacleDensity: 0,
};
// per-ronde-instellingen (elke ronde zwaarder)
function arenaRound(round) {
  const t = round - 1;
  return {
    target: 4 + Math.round(t * 1.5),                          // te doden zombies deze ronde
    zombieHp: 28 + t * 9,
    zombieSpeed: +Math.min(MAX_ZOMBIE_SPEED, 0.7 + t * 0.05).toFixed(2),
    runnerChance: round >= 2 ? Math.min(0.4, 0.08 + t * 0.04) : 0,
    crawlerChance: round >= 4 ? Math.min(0.35, 0.05 + t * 0.03) : 0,
    bruteChance: round >= 6 ? Math.min(0.28, 0.03 + t * 0.025) : 0,
    maxAlive: Math.min(11, 3 + Math.floor(t * 0.7)),
    spawnEvery: Math.max(450, 1300 - t * 70),
    bonus: 5 + round * 3,                                     // munten per voltooide ronde (bescheiden)
  };
}

/* ---------- Map-rotatie: welke maps staan uit (beheerd via de Map Maker, gesynct via de cloud) ----------
   window.MAP_DISABLED bevat de uitgezette map-id's. activeVersusMaps() geeft de actieve maps. */
try {
  var _tpsRot = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem('tps_maprotation')) || '{}');
  window.MAP_DISABLED = new Set((_tpsRot && _tpsRot.disabled) || []);
} catch (e) { window.MAP_DISABLED = new Set(); }
function activeVersusMaps() {
  var dis = (typeof window !== 'undefined' && window.MAP_DISABLED) ? window.MAP_DISABLED : null;
  if (!dis || !dis.size) return VERSUS_MAPS;
  var a = VERSUS_MAPS.filter(function (m) { return !dis.has(m.id); });
  return a.length ? a : VERSUS_MAPS;   // altijd minstens 1 map actief houden
}
