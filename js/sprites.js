/* ============================================================
   SPRITES — alle pixel-art wordt hier in code getekend.
   Geen externe afbeeldingen nodig.
   ============================================================ */

const Sprites = {
  // klein hulpmiddel: teken een "pixel"-blok (afgerond op hele pixels)
  px(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },

  // kleur lichter/donkerder maken (f > 0 = lichter, f < 0 = donkerder), voor 2.5D-shading
  _shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))));
    return '#' + ((ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, '0');
  },

  // ---- 2.5D "inkt-outline": teken een figuur in een offscreen, blit eerst het donkere
  // silhouet op 4 offsets (de outline) en dan de figuur er bovenop. Geeft de cartoon-look. ----
  _inkInit() {
    if (this._ocA) return true;
    try {
      this._ocA = document.createElement('canvas'); this._ocA.width = 160; this._ocA.height = 160;
      this._ocB = document.createElement('canvas'); this._ocB.width = 160; this._ocB.height = 160;
      this._ocAx = this._ocA.getContext('2d'); this._ocBx = this._ocB.getContext('2d');
      this._ocAx.imageSmoothingEnabled = false; this._ocBx.imageSmoothingEnabled = false;
      return true;
    } catch (e) { this._ocA = null; return false; }
  },
  // anchor (ax,ay) van de figuur wordt op (80,110) in de offscreen gelegd
  ink(ctx, ax, ay, drawFn) {
    if (!this._inkInit()) { drawFn(ctx); return; }        // vangnet: zonder offscreen gewoon plat tekenen
    const A = this._ocAx, B = this._ocBx;
    A.clearRect(0, 0, 160, 160);
    A.save(); A.translate(80 - Math.round(ax), 110 - Math.round(ay));
    drawFn(A);
    A.restore();
    // silhouet in outline-kleur
    B.clearRect(0, 0, 160, 160);
    B.drawImage(this._ocA, 0, 0);
    B.globalCompositeOperation = 'source-in';
    B.fillStyle = '#10131c'; B.fillRect(0, 0, 160, 160);
    B.globalCompositeOperation = 'source-over';
    const dx = Math.round(ax) - 80, dy = Math.round(ay) - 110;
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._ocB, dx - 1, dy); ctx.drawImage(this._ocB, dx + 1, dy);   // outline: 4 richtingen
    ctx.drawImage(this._ocB, dx, dy - 1); ctx.drawImage(this._ocB, dx, dy + 1);
    ctx.drawImage(this._ocA, dx, dy);                                             // figuur er bovenop
    ctx.imageSmoothingEnabled = sm;
  },

  // vliegende draak (drakenei-powerup) — gecentreerd op (cx,cy), klappert met de vleugel
  drawDragon(ctx, cx, cy, dir, t) {
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(cy));
    if (dir < 0) ctx.scale(-1, 1);                       // lokaal: kop naar rechts
    const body = '#b3402e', bodyDk = '#7e2a1f', belly = '#e0a23a', wing = '#8a2f22', wingMem = '#c75a3a', horn = '#f0e0c0';
    const flap = Math.round(Math.sin(t / 110) * 4);
    this.px(ctx, bodyDk, -16, -1, 7, 3);                 // staartpunt
    this.px(ctx, body, -12, -3, 7, 5);                   // staartbasis
    this.px(ctx, body, -7, -4, 14, 9);                   // lijf
    this.px(ctx, belly, -5, 3, 10, 2);                   // buik
    this.px(ctx, wing, -3, -4 - flap, 9, 2);             // vleugel (flapt)
    this.px(ctx, wingMem, -2, -3 - flap, 8, Math.max(1, 3 + flap));
    this.px(ctx, body, 6, -5, 5, 6);                     // hals
    this.px(ctx, body, 9, -7, 7, 6);                     // kop
    this.px(ctx, horn, 10, -10, 2, 3);                   // horens
    this.px(ctx, horn, 13, -10, 2, 3);
    this.px(ctx, '#1a1a1a', 13, -5, 2, 2);              // oog
    this.px(ctx, '#ffd24a', 16, -3, 3, 3);              // muil-gloed
    this.px(ctx, '#ff7a2a', 18, -2, 2, 2);
    ctx.restore();
  },

  /* ---------- POWER-UP-ICOON (shop / inventaris) ----------
     Vernieuwde 2.5D-iconen: elk figuur in code getekend met licht/schaduw-
     shading en daarna de inkt-outline eromheen (net als characters). ----- */
  drawPowerupIcon(ctx, kind, cx, cy) {
    const self = this;
    this.ink(ctx, cx, cy, (c) => self._powerupRaw(c, kind, cx, cy));
  },
  // ---- gedeelde AK47-vorm (grip op oorsprong, loop naar +x) — gebruikt in-game + iconen ----
  _akShape(P, S) {
    const body = '#3a3f46', bodyLt = '#565d66', dark = '#23262b', wood = '#7a4e24', woodLt = '#9a6a34', woodDk = '#4a2f16', mag = '#a86a2e', magDk = '#7a4818';
    P(wood, -9, -3, 4, 4); P(woodLt, -9, -3, 4, 1); P(woodDk, -9, 0, 4, 1);   // houten kolf (achter)
    P(body, -6, -3, 2, 3);                                                     // kolf-hals
    P(body, -5, -3, 8, 4); P(bodyLt, -5, -3, 8, 1); P(dark, -5, 0, 8, 1);      // grijze ontvanger
    P(bodyLt, -3, -5, 8, 1);                                                    // gasbuis bovenop
    P(body, 2, -6, 1, 2); P(body, 9, -6, 1, 2);                               // vizier + korrel
    P(body, 3, -2, 9, 2); P(bodyLt, 3, -2, 9, 1);                             // loop vooruit
    P(wood, 3, 0, 4, 2); P(woodLt, 3, 0, 4, 1); P(woodDk, 3, 2, 4, 1);        // houten voorgreep
    P(wood, -1, 1, 2, 4); P(woodDk, 0, 1, 1, 4);                              // houten pistoolgreep
    P(mag, 1, 1, 3, 2); P(mag, 2, 3, 3, 2); P(magDk, 3, 5, 3, 2);             // gebogen banaan-magazijn
    P(S(mag, 0.3), 1, 1, 3, 1);
  },
  _powerupRaw(ctx, kind, cx, cy) {
    const P = (col, x, y, w, h) => this.px(ctx, col, cx + x, cy + y, w, h);
    const S = (hex, f) => this._shade(hex, f);
    switch (kind) {
      case 'health': {                                   // Medipack — witte doos + rood kruis
        const b = '#eef3f7';
        P(b, -7, -7, 14, 14);
        P(S(b, 0.7), -7, -7, 14, 3);                     // top-highlight
        P(S(b, -0.22), -7, 4, 14, 3);                    // onderrand-schaduw
        P('#e23b3b', -2, -6, 4, 12); P('#e23b3b', -6, -2, 12, 4);   // kruis
        P('#ff7676', -2, -6, 2, 12); P('#ff7676', -6, -2, 12, 1);   // kruis-highlight
        P('#b81f1f', 0, 4, 2, 2); P('#b81f1f', 4, -2, 2, 4);        // kruis-schaduw
        break;
      }
      case 'shield': {                                   // Schild — blauw met glans
        const b = '#2f7ad0';
        P(b, -6, -6, 12, 8); P(b, -5, 2, 10, 2); P(b, -3, 4, 6, 2); P(b, -1, 6, 2, 2);
        P(S(b, 0.55), -6, -6, 12, 2);                    // top-highlight
        P(S(b, -0.35), -6, -6, 2, 8);                    // linker donkere kant
        P(S(b, -0.35), 3, 2, 2, 3);                      // rechter schaduw onder
        P('#eaf6ff', -1, -3, 2, 6); P('#eaf6ff', -3, -1, 6, 2);     // embleem (kruis/glans)
        break;
      }
      case 'speed': { this._boltRaw(P, S, '#35d2ff'); break; }        // Speed — cyaan bliksem
      case 'lightning': {                                // Bliksem — gele schicht + gloed
        P('#fff6b0', -1, -8, 3, 3); P('#fff6b0', -3, 4, 3, 3);       // gloed-vonkjes
        this._boltRaw(P, S, '#ffd24a');
        P('#ffffff', -1, -2, 2, 3);                      // witte kern
        break;
      }
      case 'rage': {                                     // Rage — zwaard (meer klap-schade)
        P('#d7dde3', -1, -8, 3, 9); P('#ffffff', -1, -8, 1, 9);     // kling + snede-highlight
        P('#9aa3ad', 1, -8, 1, 9);                       // kling-schaduwkant
        P('#c9962e', -3, 1, 7, 2); P('#e6b954', -3, 1, 7, 1);       // pareerstang
        P('#6b4423', 0, 3, 2, 4);                        // handvat
        P('#c9962e', -1, 7, 3, 2);                       // pommel
        P('#ff5a3a', 3, -7, 2, 2); P('#ff9a3a', -4, -4, 2, 2);      // rage-vonken
        break;
      }
      case 'fireball': {                                 // Vuurbal — oranje/gele vlam
        P('#ff7a2a', -4, -3, 8, 8); P('#ff7a2a', -1, -7, 3, 4);
        P('#ff9a3a', -4, -4, 8, 3);
        P('#ffd24a', -2, -2, 4, 6); P('#fff0a0', -1, 0, 2, 3);
        P('#d94a1a', -4, 4, 8, 2);                       // onderschaduw
        break;
      }
      case 'giant': {                                    // Reus — grote groene vuist
        const b = '#2f9a3a';
        P(b, -5, -3, 11, 8); P(S(b, 0.4), -5, -4, 11, 3);
        P(S(b, -0.3), -5, 3, 11, 2);
        P(S(b, -0.3), -2, -4, 1, 4); P(S(b, -0.3), 1, -4, 1, 4);    // knokkel-groeven
        P(b, 5, 0, 2, 4);                                // duim
        P('#cfffe0', 3, -7, 2, 2);                       // sprankel
        break;
      }
      case 'dragon': {                                   // Draak — paars ei met schubben
        const b = '#7a4ac0';
        P(b, -5, -7, 10, 13);
        P(S(b, 0.4), -5, -7, 10, 5); P(S(b, -0.3), -5, 3, 10, 3);
        P('#4f2a86', -5, -1, 10, 1); P('#4f2a86', -4, 2, 8, 1);     // schub-banden
        P('#d9c0ff', -3, -6, 2, 3);                      // glans
        P('#ffd24a', 3, -9, 2, 2);                       // zeldzaam-sprankel
        break;
      }
      case 'ak47': {                                     // AK47 (gedeelde vorm, gecentreerd)
        const P2 = (c, x, y, w, h) => P(c, x - 1, y, w, h);
        this._akShape(P2, S);
        break;
      }
      case 'ninjastar': {                                // Ninja-ster (shuriken)
        const st = '#d7dde3', stDk = '#8a929c';
        P(st, -1, -7, 3, 5); P(st, -1, 3, 3, 5); P(st, -7, -1, 5, 3); P(st, 3, -1, 5, 3);   // 4 punten
        P(st, -2, -2, 5, 5); P(stDk, -2, 1, 5, 1);       // naaf
        P('#3a3f46', 0, 0, 1, 1);                        // gaatje
        break;
      }
      case 'deagle': {                                   // Desert Eagle (fors pistool)
        const body = '#4a5058', bodyLt = '#6a727c', dark = '#23262b';
        P(body, -6, -3, 13, 4); P(bodyLt, -6, -3, 13, 1);           // slede
        P(dark, -6, -3, 2, 2);                                       // achterkant
        P(body, 6, -2, 3, 2);                                        // loop-mond
        P('#8a5e36', -3, 1, 3, 6); P('#6b4426', -3, 1, 1, 6);        // houten greep (schuin)
        P(dark, 0, 1, 2, 4);                                         // trekkerbeugel
        P('#caa84a', 5, -4, 2, 2);                                   // goud accent
        break;
      }
      case 'crossbow': {                                 // Kruisboog
        const wood = '#7a5230', woodLt = '#9a6a34', steel = '#cfd6df';
        P(wood, -2, -1, 12, 3); P(woodLt, -2, -1, 12, 1);           // lade (stock)
        P('#4a3320', -6, -7, 2, 15);                                 // boog-arm (verticaal)
        P('#4a3320', -6, -7, 3, 2); P('#4a3320', -6, 6, 3, 2);       // boog-uiteinden
        P('#888f99', -5, 0, 12, 1);                                  // pees
        P(steel, 6, -1, 5, 2); P('#ffffff', 9, -1, 2, 1);           // pijl op de lade
        P('#3a2f22', 0, 2, 2, 3);                                    // trekker/greep
        break;
      }
      case 'smoke': {                                    // Smoke Vanish — grijze rookwolk + paars vonkje
        const g = '#c8ced6', gl = '#e2e6ea', gd = '#9aa3ad';
        P(g, -6, -2, 12, 7); P(gl, -6, -2, 12, 2);
        P(g, -8, 0, 3, 5); P(g, 5, 0, 3, 5);             // pluizige zijkanten
        P(gl, -3, -6, 6, 3);                             // bolletje bovenop
        P(gd, -5, 5, 10, 1);                             // onderrand-schaduw
        P('#b06bff', 4, -7, 2, 2); P('#d9b8ff', -6, -6, 2, 2);   // vanish-vonkjes
        break;
      }
      case 'chainsaw': {                                 // Kettingzaag
        P('#c8402a', -6, -3, 6, 7); P('#e05a3a', -6, -3, 6, 2);      // rode motor
        P('#2a2a2e', -2, 0, 3, 4);                                   // greep
        P('#9aa3ad', 0, -2, 12, 3); P('#cfd6df', 0, -2, 12, 1);      // grijze zaagbalk
        for (let i = 0; i < 12; i += 2) P('#e8edf2', 1 + i, 1, 1, 1);   // tanden
        P('#3a3f46', 0, -2, 2, 3);                                   // aandrijving
        P('#ffd24a', -4, -1, 1, 1);                                  // vonk
        break;
      }
      case 'rocket': {                                   // Raket (verticaal)
        P('#e4e8ec', -2, -6, 4, 10); P('#ffffff', -2, -6, 1, 10);   // romp + highlight
        P('#b6bcc2', 1, -6, 1, 10);                      // schaduwkant
        P('#d94343', -2, -9, 4, 3); P('#e86a6a', -2, -9, 2, 2);     // neuskegel
        P('#d94343', -4, 1, 2, 3); P('#d94343', 2, 1, 2, 3);        // vinnen
        P('#ffd24a', -1, 4, 2, 2); P('#ff7a2a', -1, 6, 2, 2);       // vlam
        break;
      }
      case 'cannon': {                                   // Kanonskogel
        P('#141414', -5, -4, 10, 10);
        P('#454545', -4, -4, 5, 3); P('#8a8a8a', -3, -3, 2, 2);     // sheen
        P('#050505', -5, 4, 10, 2);                      // onderschaduw
        P('#6a4a2a', 0, -7, 2, 3); P('#ff8a3a', 0, -9, 2, 2); P('#ffe08a', 1, -10, 1, 1);  // lont + vonk
        break;
      }
      case 'beachball': {                                // Strandbal
        P('#ffffff', -5, -5, 10, 10);
        P('#e8483b', -5, -5, 10, 3); P('#3aa0e0', -5, 2, 10, 3); P('#f2c94c', -1, -5, 2, 10);
        P('#ffffff', -3, -3, 3, 3);                      // glans
        P('#c9ccd2', -5, 4, 10, 1);                      // onderrand
        break;
      }
      case 'coco': {                                     // Kokosbom
        const b = '#6e4423';
        P(b, -5, -5, 10, 10); P(S(b, 0.4), -5, -5, 10, 3); P(S(b, -0.3), -5, 3, 10, 2);
        P('#3a2614', -2, -1, 2, 2); P('#3a2614', 1, 1, 2, 2);       // "ogen"
        P('#3a8a4a', -1, -8, 2, 3);                      // steeltje
        break;
      }
      case 'boom': {                                     // Boemerang
        const b = '#b8894a';
        P(b, -6, -4, 3, 6); P(b, -5, 1, 6, 3);
        P(S(b, 0.35), -6, -4, 3, 1); P(S(b, 0.35), -5, 1, 6, 1);    // highlight
        P(S(b, -0.3), -6, 1, 2, 3);                      // hoek-schaduw
        break;
      }
      case 'dart': {                                     // Gifdart
        P('#2f7a3a', -6, -1, 8, 2); P('#49a457', -6, -1, 8, 1);     // schacht
        P('#cfd6df', 2, -1, 4, 2); P('#ffffff', 5, -1, 1, 2);       // metalen punt
        P('#1f5a28', -7, -2, 2, 4);                      // fletching
        P('#7affa0', 3, 1, 2, 1);                        // gif-druppel
        break;
      }
      case 'rock': {                                     // Rotsblok
        const b = '#6a5e50';
        P(b, -5, -4, 11, 9); P(S(b, 0.35), -5, -4, 11, 3); P(S(b, -0.35), -5, 4, 11, 2);
        P(S(b, -0.2), -1, -1, 3, 3); P(S(b, 0.2), 2, -3, 2, 2);     // facetten
        break;
      }
      default: {                                         // vangnet: gele ster
        P('#ffd24a', -4, -4, 8, 8); P('#fff0a0', -4, -4, 8, 3);
      }
    }
  },
  // bliksem/pijl-vorm (gedeeld door speed + lightning)
  _boltRaw(P, S, col) {
    P(col, 0, -8, 3, 4);
    P(col, -2, -5, 4, 3);
    P(col, -1, -3, 3, 3);
    P(col, -3, 0, 4, 3);
    P(col, -1, 2, 3, 5);
    P(S(col, 0.5), 0, -8, 1, 4); P(S(col, 0.5), -3, 0, 1, 3);       // highlight-randen
    P(S(col, -0.3), 2, -1, 1, 3);                                   // schaduwkant
  },

  /* ---------- CHARACTER (Ryan & later anderen) ----------
     cx = horizontale midden, footY = grond (voeten),
     dir = 1 (rechts) of -1 (links),
     pose = { walkPhase, airborne, ducking, attacking, weapon } */
  drawCharacter(ctx, cx, footY, dir, pal, pose) {
    pose = pose || {};
    // 2.5D: eerst het donkere inkt-silhouet (outline), dan de figuur — cartoon-look
    if (!pose.noInk) {
      const self = this, p2 = Object.assign({}, pose, { noInk: true });
      this.ink(ctx, cx, footY, (c) => self.drawCharacter(c, cx, footY, dir, pal, p2));
      return;
    }
    // platgedrukt (steen-powerup): hele figuur in elkaar gedrukt
    if (pose.squash) { ctx.save(); ctx.translate(cx, footY); ctx.scale(1.5, 0.45); ctx.translate(-cx, -footY); }
    const duck = pose.ducking;
    const weapon = pose.weapon;
    const bulky = pose.build === 'bulky';
    const tall = pose.build === 'tall';
    const small = pose.build === 'small';
    const stocky = pose.build === 'stocky';               // dik & klein
    const curly = pose.hair === 'curly';
    const spiky = pose.hair === 'spiky';
    const bald = pose.hair === 'bald';
    const back = pose.hair === 'back';

    // breedtes (fors = breder, lang = dunner, klein = smaller, stevig = breed & laag)
    const bh = bulky ? 6 : (tall ? 4 : (small ? 4 : (stocky ? 6 : 5)));   // halve romp-breedte
    const hh = bulky ? 5 : (small ? 3 : (stocky ? 5 : 4));                // halve hoofd-breedte
    const legW = bulky ? 4 : (tall ? 2 : (small ? 2 : (stocky ? 4 : 3)));

    // hoogtematen (lang = hoger, klein/stevig = lager)
    const hM = tall ? 1.32 : (small ? 0.8 : (stocky ? 0.82 : 1));
    const legH = Math.round((duck ? 4 : 9) * hM);
    const torsoH = Math.round((duck ? 8 : 11) * hM);
    const headH = duck ? 8 : (small ? 8 : 9);

    const legTop = footY - legH;
    const torsoTop = legTop - torsoH;
    const headTop = torsoTop - headH;

    // --- benen: pendelbeweging vanuit de heup (om en om voor/achter, zoals Minecraft) ---
    const amp = small ? 3 : 4;                              // hoe ver de voet uitslaat
    let offA = 0, offB = 0;                                 // horizontale uitslag van de voet
    if (duck) {
      offA = offB = 0;                                      // gehurkt: benen recht
    } else if (pose.airborne) {
      offA = amp * dir; offB = -amp * dir;                  // sprong: vaste spreidstand (één voor, één achter)
    } else {
      const s = Math.sin(pose.walkPhase || 0);
      offA = Math.round(amp * s) * dir;                     // been A
      offB = -Math.round(amp * s) * dir;                    // been B tegengesteld
    }
    // teken een been schuin: heup (boven, vast) -> voet (onder, verschoven) = pendel
    const drawLeg = (hipX, foot) => {
      const rows = Math.max(2, legH);
      for (let i = 0; i < rows; i++) {
        const x = Math.round(hipX + foot * (i / (rows - 1)));
        this.px(ctx, pal.pants, x, legTop + i, legW, 1);
      }
      // schoen: de teen (1px extra) wijst in de kijkrichting
      const sx = Math.round(hipX + foot) - (dir < 0 ? 1 : 0);
      this.px(ctx, pal.shoe, sx, footY - 2, legW + 1, 2);
    };
    const hipX = cx - Math.floor(legW / 2);                 // beide benen draaien vanuit dezelfde heup
    drawLeg(hipX, offB);                                    // achterbeen
    drawLeg(hipX, offA);                                    // voorbeen

    // --- torso (shirt) — met licht-van-boven shading (2.5D) ---
    this.px(ctx, pal.shirt, cx - bh, torsoTop, bh * 2, torsoH);
    this.px(ctx, this._shade(pal.shirt, 0.28), cx - bh + 2, torsoTop, bh * 2 - 2, 1);   // highlight bovenop
    this.px(ctx, pal.shirtDark, cx - bh, torsoTop, 2, torsoH);             // schaduw (schaduwkant)
    this.px(ctx, this._shade(pal.shirt, -0.25), cx - bh, torsoTop + torsoH - 2, bh * 2, 2);   // donkere onderrand
    if (bulky) this.px(ctx, pal.shirtDark, cx - bh, torsoTop, bh * 2, 2);  // brede schouders

    // --- hoofd — met lichtkant (2.5D) ---
    this.px(ctx, pal.skin, cx - hh, headTop, hh * 2, headH);
    this.px(ctx, this._shade(pal.skin, 0.22), cx + (dir > 0 ? hh - 2 : -hh + 1), headTop + 1, 1, headH - 3);   // highlight op de kijk-/lichtkant
    this.px(ctx, pal.skinDark, cx - hh, headTop, 2, headH);
    this.px(ctx, this._shade(pal.skin, -0.18), cx - hh + 2, headTop + headH - 1, hh * 2 - 2, 1);               // kin-schaduw

    // --- haar ---
    if (bald) {
      // kaal bovenop, klein beetje blond haar achter op het hoofd + dun randje
      const backX = dir > 0 ? cx - hh - 1 : cx + hh - 1;                   // achterkant van het hoofd
      this.px(ctx, pal.hair, backX, headTop + 1, 2, headH - 2);            // pluk haar achter
      this.px(ctx, pal.hairDark, backX, headTop + 1, 1, headH - 2);
      this.px(ctx, pal.hair, cx - hh, headTop + headH - 3, hh * 2, 2);     // dun randje onderaan
    } else if (spiky) {
      // basis + opstaande zwarte stekels
      this.px(ctx, pal.hair, cx - hh - 1, headTop - 1, hh * 2 + 2, 3);
      this.px(ctx, pal.hair, cx - hh - 1, headTop, 2, 4);                  // links
      this.px(ctx, pal.hair, cx + hh - 1, headTop, 2, 4);                  // rechts
      const heights = [4, 6, 3, 7, 4, 6, 3];
      for (let i = 0; i < heights.length; i++) {
        const sxp = cx - hh - 1 + i * 2;
        if (sxp > cx + hh) break;
        this.px(ctx, pal.hair, sxp, headTop - 1 - heights[i], 2, heights[i] + 1);
        this.px(ctx, pal.hairDark, sxp, headTop - 1 - heights[i], 1, heights[i] + 1);
      }
    } else if (back) {
      // strak naar achteren gekamd, kort
      this.px(ctx, pal.hair, cx - hh - 1, headTop - 2, hh * 2 + 2, 4);        // kapsel bovenop
      this.px(ctx, pal.hairDark, cx - hh - 1, headTop - 2, hh * 2 + 2, 1);
      const backX = dir > 0 ? cx - hh - 2 : cx + hh;                          // achterkant van het hoofd
      this.px(ctx, pal.hair, backX, headTop - 1, 3, 6);                       // pluk naar achteren
      this.px(ctx, pal.hairDark, backX + (dir > 0 ? 0 : 2), headTop - 1, 1, 6);
      this.px(ctx, pal.hair, cx - hh - 1, headTop, 2, 3);                     // korte bakkebaarden
      this.px(ctx, pal.hair, cx + hh - 1, headTop, 2, 3);
    } else if (curly) {
      // bobbelige krullen bovenop + aan de zijkanten
      for (let i = -hh - 1; i <= hh - 1; i += 2) {
        this.px(ctx, pal.hair, cx + i, headTop - 3, 3, 4);
        this.px(ctx, pal.hairDark, cx + i, headTop - 3, 3, 1);
      }
      this.px(ctx, pal.hair, cx - hh - 1, headTop, 2, 5);                  // linkerkrul
      this.px(ctx, pal.hair, cx + hh - 1, headTop, 2, 5);                  // rechterkrul
      this.px(ctx, pal.hair, cx - hh, headTop, hh * 2, 2);                 // pony
    } else {
      this.px(ctx, pal.hair, cx - hh - 1, headTop - 2, hh * 2 + 2, 4);
      this.px(ctx, pal.hair, cx - hh - 1, headTop, 2, 4);                  // links bakkebaard
      this.px(ctx, pal.hair, cx + hh - 1, headTop, 2, 4);                  // rechts
      this.px(ctx, pal.hairDark, cx - hh - 1, headTop - 2, hh * 2 + 2, 1);
      this.px(ctx, pal.hair, cx + (dir > 0 ? 2 : -3), headTop - 3, 2, 2);  // losse pluk
    }
    // oog (kijkrichting) — rood bij rage
    this.px(ctx, pose.rage ? '#ff2020' : pal.eye, cx + (dir > 0 ? 1 : -2), headTop + 3, 2, 2);

    // boze streepjes boven het hoofd (rage)
    if (pose.rage) {
      this.px(ctx, '#ff3030', cx - hh - 3, headTop - 5, 3, 1);
      this.px(ctx, '#ff3030', cx - hh - 4, headTop - 3, 3, 1);
      this.px(ctx, '#ff3030', cx + hh, headTop - 5, 3, 1);
      this.px(ctx, '#ff3030', cx + hh + 1, headTop - 3, 3, 1);
      this.px(ctx, '#ff5a5a', cx - 1, headTop - 6, 2, 2);
    }

    // --- outfit: ninja-masker / monniks-gewaad (over hoofd & romp) ---
    if (pose.outfit === 'ninja') {
      const hood = pal.hair, hoodDk = pal.hairDark, hoodLt = this._shade(hood, 0.22);
      // volle donkere kap over het hele hoofd (dekt het haar)
      this.px(ctx, hood, cx - hh - 1, headTop - 1, hh * 2 + 2, headH + 1);
      this.px(ctx, hoodDk, cx - hh - 1, headTop - 1, 2, headH + 1);                 // schaduwkant
      this.px(ctx, hoodLt, cx - hh, headTop - 1, hh * 2, 1);                        // highlight bovenop de kap
      this.px(ctx, hoodDk, cx - hh - 1, headTop + headH - 1, hh * 2 + 2, 1);        // donkere onderrand
      // oogspleet (lichte band) met felle rode ogen
      const slitY = headTop + 3;
      this.px(ctx, '#2b2f38', cx - hh, slitY, hh * 2, 2);
      this.px(ctx, '#ff3a3a', cx + (dir > 0 ? 1 : -2), slitY, 2, 2);                // vooroog (fel)
      this.px(ctx, '#a82424', cx + (dir > 0 ? -3 : 2), slitY, 1, 2);                // achteroog (dof)
      // hoofdband-staarten die achter het hoofd wapperen
      const backX = dir > 0 ? cx - hh - 1 : cx + hh + 1, tdir = dir > 0 ? -1 : 1;
      for (let k = 0; k < 2; k++) {
        const len = 6 - k * 2, wob = Math.round(Math.sin((pose.t || 0) / 130 + k) * 2);
        const x0 = tdir > 0 ? backX : backX - len;
        this.px(ctx, k ? hoodDk : hood, x0, headTop + 2 + k * 3 + wob, len, 2);
      }
      // sjaal om de nek
      this.px(ctx, hoodDk, cx - hh, torsoTop - 1, hh * 2, 2);
    } else if (pose.outfit === 'monk') {
      const robe = pal.shirt, robeDk = pal.shirtDark, robeLt = this._shade(robe, 0.24);
      // diagonale sjerp van schouder tot heup (klassieke kasaya-drapering)
      const denom = Math.max(1, torsoH - 1);
      for (let i = 0; i < torsoH; i++) {
        const x = Math.round(cx - bh + 1 + (i / denom) * (bh * 1.5));
        this.px(ctx, robeLt, x, torsoTop + i, 3, 1);
        this.px(ctx, robeDk, x, torsoTop + i, 1, 1);
      }
      // één blote schouder (huid) — het gewaad laat de arm-kant vrij
      const shX = cx + (dir > 0 ? bh - 3 : -bh);
      this.px(ctx, pal.skin, shX, torsoTop, 3, 3);
      this.px(ctx, pal.skinDark, shX, torsoTop, 1, 3);
      // lichte zoom onderaan het gewaad
      this.px(ctx, robeLt, cx - bh, torsoTop + torsoH - 3, bh * 2, 1);
      // gebedskralen om de nek
      for (let i = -2; i <= 2; i++) this.px(ctx, i % 2 ? '#3a2614' : '#7a5024', cx + i * 2, torsoTop, 1, 1);
    }

    // --- harnas (blacksmith): ridder-plaatwerk — over lijf/hoofd, ONDER de cosmetische hoed ---
    if (pose.armor) {
      const A = pose.armor, sh = (c, a) => this._shade(c, a);
      // rode MANTEL achter het lijf (van de schouders omlaag), alleen bij sets met cape
      const cape = (A.chest && A.chest.cape) ? A.chest : null;
      if (cape) {
        const cw = 5, cxp = dir > 0 ? (cx - bh - cw + 1) : (cx + bh), ch2 = torsoH + legH + 2, sway = Math.round(Math.sin((pose.t || 0) / 220) * 1);
        this.px(ctx, '#8a1f1a', cxp, torsoTop, cw, ch2);
        this.px(ctx, '#c0392b', cxp, torsoTop, cw, 3);                                   // lichte bovenkant
        this.px(ctx, '#6a1512', cxp + (dir > 0 ? -sway : sway), torsoTop + ch2 - 4, cw, 4);   // wapperende donkere zoom
      }
      // zilveren LAARZEN
      if (A.feet) { const f = A.feet; for (const off of [offB, offA]) { const x = Math.round(hipX + off) - (dir < 0 ? 1 : 0); this.px(ctx, f.col, x, footY - 3, legW + 1, 3); this.px(ctx, sh(f.col, 0.3), x, footY - 3, legW + 1, 1); this.px(ctx, f.colDk, x, footY - 1, legW + 1, 1); } }
      // been/heup-platen (faulds)
      if (A.bottom) { const b = A.bottom, h = Math.min(legH + 1, 6); this.px(ctx, b.col, cx - bh, legTop - 1, bh * 2, h); this.px(ctx, sh(b.col, 0.3), cx - bh, legTop - 1, bh * 2, 1); this.px(ctx, b.colDk, cx - bh, legTop - 1, 1, h); this.px(ctx, sh(b.col, -0.25), cx - bh, legTop - 1 + h - 1, bh * 2, 1); if (b.trim) this.px(ctx, b.trim, cx - bh, legTop - 1, bh * 2, 1); }
      // BORSTPLAAT + schouderstukken + middenribbel + (gouden) randen
      if (A.chest) { const c2 = A.chest, y0 = torsoTop + 1, h0 = Math.max(3, torsoH - 2);
        this.px(ctx, c2.col, cx - bh, y0, bh * 2, h0);
        this.px(ctx, sh(c2.col, 0.34), cx - bh + 1, y0, bh * 2 - 2, 1);                   // highlight bovenop
        this.px(ctx, c2.colDk, cx - bh, y0, 1, h0);                                       // schaduwkant
        this.px(ctx, sh(c2.col, -0.22), cx - bh, y0 + h0 - 1, bh * 2, 1);                 // onderrand
        this.px(ctx, sh(c2.col, 0.42), cx - 1, y0 + 1, 2, h0 - 2);                        // glanzende middenribbel
        this.px(ctx, c2.col, cx - bh - 1, y0 - 1, 3, 3); this.px(ctx, c2.col, cx + bh - 2, y0 - 1, 3, 3);   // pauldrons (schouders)
        this.px(ctx, sh(c2.col, 0.3), cx - bh - 1, y0 - 1, 3, 1); this.px(ctx, sh(c2.col, 0.3), cx + bh - 2, y0 - 1, 3, 1);
        if (c2.trim) { this.px(ctx, c2.trim, cx - bh, y0, bh * 2, 1); this.px(ctx, c2.trim, cx - bh, y0 + h0 - 1, bh * 2, 1); }   // gouden randen (royal)
      }
      // HELM (dekt het hoofd) + vizier-spleet + rode pluim
      if (A.hat) { const h2 = A.hat;
        this.px(ctx, h2.col, cx - hh - 1, headTop - 1, hh * 2 + 2, headH + 1);
        this.px(ctx, sh(h2.col, 0.3), cx - hh - 1, headTop - 1, hh * 2 + 2, 1);           // helm-highlight
        this.px(ctx, h2.colDk, cx - hh - 1, headTop - 1, 2, headH + 1);                   // schaduwkant
        this.px(ctx, '#2b2f38', cx - hh, headTop + 3, hh * 2, 2);                         // vizier-spleet
        this.px(ctx, pose.rage ? '#ff3030' : '#8fd0ff', cx + (dir > 0 ? 1 : -2), headTop + 3, 2, 2);   // oog-glim
        if (h2.trim) this.px(ctx, h2.trim, cx - hh - 1, headTop + headH - 1, hh * 2 + 2, 1);   // gouden helmrand
        if (h2.plume) { const pw = Math.round(Math.sin((pose.t || 0) / 150) * 1);         // pluim
          this.px(ctx, '#6a1512', cx - 1, headTop - 5, 2, 5);
          this.px(ctx, h2.plume, cx - 1 + pw, headTop - 9, 3, 5);
          this.px(ctx, sh(h2.plume, 0.3), cx + pw, headTop - 9, 1, 4);
        }
      }
    }

    // --- hoed (cosmetisch) ---
    if (pose.hat && pose.hat !== 'none') this.drawHat(ctx, pose.hat, cx, headTop, hh, dir, pose.t || 0);

    // --- arm + wapen ---
    this.drawArmAndWeapon(ctx, cx, torsoTop, dir, pal, weapon, pose.attacking, bh, pose.shielding, pose.swing);

    // --- in brand staan (burn) ---
    if (pose.burning) {
      const t = pose.t || 0;
      for (let i = -1; i <= 1; i++) {
        const fx = cx + i * (hh + 1);
        const fl = Math.round(Math.sin(t / 70 + i) * 2);
        this.px(ctx, '#ff7a2a', fx - 1, footY - 14 - fl, 3, 8);            // vlamtong
        this.px(ctx, '#ffd24a', fx, footY - 11 - fl, 1, 4);                // hete kern
      }
      const fl2 = Math.round(Math.sin(t / 55) * 2);
      this.px(ctx, '#ff9a3a', cx - 2, torsoTop - 5 - fl2, 4, 5);           // vlam bovenop
      this.px(ctx, '#ffe27a', cx - 1, torsoTop - 4 - fl2, 2, 3);
    }

    if (pose.squash) ctx.restore();
  },

  // hoed bovenop het hoofd (cx = midden, top = bovenkant hoofd, hh = halve hoofdbreedte)
  drawHat(ctx, id, cx, top, hh, dir, t) {
    const P = (c, x, y, w, h) => this.px(ctx, c, Math.round(x), Math.round(y), w, h);
    const w = hh * 2;
    switch (id) {
      case 'cap':
        P('#d23b3b', cx - hh - 1, top - 1, w + 2, 3);
        P('#a82a2a', cx - hh - 1, top + 1, w + 2, 1);
        P('#b83030', cx + dir * (hh + 1), top + 1, dir * 4, 2);          // klep
        break;
      case 'beanie':
        P('#2e6bd2', cx - hh - 1, top - 2, w + 2, 4);
        P('#234f9e', cx - hh - 1, top + 1, w + 2, 2);                    // omslag
        P('#ffffff', cx - 1, top - 5, 2, 3);                            // pom
        break;
      case 'party':
        // gekleurde kegel (breed onder, smal boven) + pompon
        for (let k = 0; k < 5; k++) P(['#ff5ec4', '#ffd24a', '#5ad0ff', '#7affa0', '#ff8a3a'][k], cx - (4 - k), top - 1 - k * 2, (4 - k) * 2 + 2, 2);
        P('#5ad0ff', cx - 4, top + 1, 8, 1);                            // rand
        P('#ffffff', cx - 1, top - 11, 2, 2);                           // pompon
        break;
      case 'fedora':
        P('#6b4a2b', cx - hh - 2, top + 1, w + 4, 1);                   // rand
        P('#4a3320', cx - hh, top - 3, w, 4);                          // bol
        P('#1c130a', cx - hh, top, w, 1);                              // band
        break;
      case 'cowboy':
        P('#9a6a3a', cx - hh - 3, top + 1, w + 6, 2);                   // brede rand
        P('#7a4f28', cx - hh + 1, top - 3, w - 2, 4);                  // bol
        P('#3a2614', cx - hh + 1, top, w - 2, 1);
        break;
      case 'chef':
        P('#ffffff', cx - hh, top, w, 3);                              // band
        P('#ffffff', cx - hh - 1, top - 5, w + 2, 4);                  // pof
        P('#e6e6e6', cx - hh - 1, top - 5, w + 2, 1);
        break;
      case 'grad':
        P('#1a1a22', cx - hh, top - 1, w, 3);                          // kapje
        P('#15151c', cx - hh - 3, top - 3, w + 6, 2);                  // plank
        P('#ffd24a', cx + hh + 1, top - 3, 1, 5);                      // kwastje
        P('#ffd24a', cx + hh, top + 2, 2, 2);
        break;
      case 'tophat':
        P('#15151c', cx - hh - 2, top + 1, w + 4, 1);                  // rand
        P('#1a1a22', cx - hh, top - 7, w, 8);                         // cilinder
        P('#b23b5b', cx - hh, top - 1, w, 1);                         // band
        break;
      case 'propeller': {
        P('#3aa0e0', cx - hh - 1, top - 1, w + 2, 3);                  // pet
        for (let i = 0; i < w + 2; i += 2) P(i % 4 ? '#ffd24a' : '#e84d4d', cx - hh - 1 + i, top - 1, 2, 1);
        P('#888', cx - 1, top - 4, 2, 3);                            // staaf
        const a = (Math.sin(t / 90) > 0);                             // simpele "draai"
        if (a) P('#cfd6df', cx - 5, top - 5, 10, 1); else P('#cfd6df', cx - 1, top - 7, 2, 5);
        break;
      }
      case 'wizard':
        P('#3a2a6b', cx - hh - 2, top + 1, w + 4, 1);                  // rand
        P('#4a2f8e', cx - 1, top - 11, 2, 12);                        // punt
        for (let k = 0; k < 5; k++) P('#5a3aa8', cx - 3 + Math.floor(k / 2), top - 1 - k * 2, 6 - k, 2);
        P('#ffd24a', cx - 2, top - 5, 1, 1); P('#ffd24a', cx + 1, top - 8, 1, 1);  // sterren
        break;
      case 'viking':
        P('#9aa3ad', cx - hh - 1, top - 2, w + 2, 4);                  // helm
        P('#c8ced6', cx - hh - 1, top - 2, w + 2, 1);
        P('#f0ead0', cx - hh - 3, top - 5, 2, 5); P('#f0ead0', cx + hh + 1, top - 5, 2, 5);  // horens
        P('#f0ead0', cx - hh - 4, top - 7, 2, 3); P('#f0ead0', cx + hh + 2, top - 7, 2, 3);
        break;
      case 'crown':
        P('#ffcf33', cx - hh - 1, top - 1, w + 2, 3);                  // band
        P('#e0a800', cx - hh - 1, top + 1, w + 2, 1);
        P('#ffcf33', cx - hh - 1, top - 4, 2, 4); P('#ffcf33', cx - 1, top - 5, 2, 5); P('#ffcf33', cx + hh - 1, top - 4, 2, 4);  // punten
        P('#ff4d4d', cx - 1, top - 1, 2, 2);                         // robijn
        break;
      case 'halo':
        P('#ffe27a', cx - hh - 1, top - 5, w + 2, 1);
        P('#fff3b0', cx - hh, top - 6, w, 1);
        P('#ffe27a', cx - hh - 1, top - 5, 2, 2); P('#ffe27a', cx + hh - 1, top - 5, 2, 2);
        break;
      case 'leafcrown':
        P('#2f7a3a', cx - hh - 1, top - 1, w + 2, 2);                   // band
        P('#3a9a4a', cx - hh - 2, top - 4, 3, 4); P('#3a9a4a', cx - 2, top - 6, 4, 6); P('#3a9a4a', cx + hh - 1, top - 4, 3, 4);  // blaadjes
        P('#2f7a3a', cx - 1, top - 5, 2, 4);
        break;
      case 'tikimask':
        P('#6b4a2a', cx - hh - 1, top - 2, w + 2, hh + 4);             // houten masker over het gezicht
        P('#8a5e36', cx - hh - 1, top - 2, w + 2, 2);
        P('#1a1a1a', cx - hh + 1, top + 1, 2, 2); P('#1a1a1a', cx + hh - 3, top + 1, 2, 2);  // ogen
        P('#d23a2a', cx - 1, top - 1, 2, 2); P('#f2c94c', cx - hh - 1, top - 4, w + 2, 1);   // versiering
        break;
      case 'bananahat':
        P('#f2c94c', cx - hh, top - 5, w, 3);                          // banaan-boog
        P('#e0b030', cx - hh, top - 3, w, 2);
        P('#3a2a14', cx - hh, top - 2, 2, 2); P('#3a2a14', cx + hh - 2, top - 5, 2, 2);      // uiteinden
        break;
    }
  },

  // ---------- HOED-ICOON (shop / inventaris) — 2.5D buste met de hoed erop ----------
  drawHatBust(ctx, id, cx, cy, t) {
    const self = this;
    this.ink(ctx, cx, cy, (c) => self._hatBustRaw(c, id, cx, cy, t || 0));
  },
  _hatBustRaw(ctx, id, cx, cy, t) {
    const P = (col, x, y, w, h) => this.px(ctx, col, cx + x, cy + y, w, h);
    const S = (hex, f) => this._shade(hex, f);
    const skin = '#e0ac7a', shirt = '#3a4756';
    const hh = 4, headTop = 2, headH = 9;
    // schouders / borst (buste)
    P(shirt, -6, headTop + headH, 12, 4);
    P(S(shirt, 0.25), -6, headTop + headH, 12, 1);              // licht bovenop
    P(S(shirt, -0.28), -6, headTop + headH + 3, 12, 1);        // schaduw onder
    P(S(skin, -0.15), -1, headTop + headH - 1, 2, 2);          // nek
    // kop met 2.5D-shading
    P(skin, -hh, headTop, hh * 2, headH);
    P(S(skin, 0.22), -hh, headTop, 1, headH);                   // licht (links)
    P(S(skin, -0.2), hh - 1, headTop, 1, headH);                // schaduw (rechts)
    P(S(skin, -0.2), -hh, headTop + headH - 1, hh * 2, 1);      // kin-schaduw
    P(S(skin, -0.12), -hh + 1, headTop + 5, hh * 2 - 2, 1);     // neus/wang-lijn
    P('#26262c', -2, headTop + 3, 1, 2); P('#26262c', 1, headTop + 3, 1, 2);   // ogen
    // de hoed erop (of kaal hoofd bij 'none')
    if (id && id !== 'none') this.drawHat(ctx, id, cx, cy + headTop, hh, 1, t);
    else P(S(skin, 0.32), -hh + 1, headTop, hh * 2 - 2, 1);     // kale-hoofd glans
  },

  drawArmAndWeapon(ctx, cx, torsoTop, dir, pal, weaponId, attacking, bh, shielding, swing) {
    const armY = torsoTop + 3;
    const reach = attacking ? 9 : 5;
    const sh = (bh || 5) - 2;   // schouder-offset (breder bij fors lijf)
    const w = WEAPONS[weaponId] || WEAPONS.bat;

    // schild (Tygo): voor het lijf in blok-stand, anders naar voren als melee
    if (w.id === 'shield') {
      const armX = cx + (dir > 0 ? sh : -sh - reach);
      this.px(ctx, pal.skin, armX, armY, reach + 3, 3);   // arm
      const sx = shielding
        ? cx + (dir > 0 ? sh + 3 : -(sh + 3) - 4)          // voor het lijf bij blokken
        : cx + (dir > 0 ? sh + reach + 1 : -(sh + reach + 1) - 4);
      const sy = shielding ? armY - 6 : armY - (attacking ? 5 : 3);
      const sH = shielding ? 16 : 13;
      this.px(ctx, '#9aa3ad', sx, sy, 4, sH);                                // metaal
      this.px(ctx, '#c8ced6', sx + (dir > 0 ? 0 : 2), sy + 1, 2, sH - 2);    // glans
      this.px(ctx, '#6b7480', sx + (dir > 0 ? 3 : 0), sy, 1, sH);            // rand-schaduw
      this.px(ctx, '#e2c558', sx + 1, sy + (sH >> 1) - 1, 2, 2);            // embleem
      return;
    }

    // echte zwaai: arm + wapen roteren rond de schouder (van omhoog-achter naar omlaag-voor)
    const doSwing = w.type === 'melee' && attacking;
    if (doSwing) {
      const p = (swing == null) ? 1 : Math.max(0, Math.min(1, swing));
      const e = 1 - Math.pow(1 - p, 3);                 // easeOutCubic -> snelle chop
      const angle = -0.95 + (0.75 - (-0.95)) * e;       // -0.95 rad (omhoog/achter) .. +0.75 rad (omlaag/voor)
      const pivotX = cx + dir * (sh - 1), pivotY = armY + 1;
      ctx.save();
      ctx.translate(pivotX, pivotY); ctx.rotate(dir * angle); ctx.translate(-pivotX, -pivotY);
    }

    // arm (huidskleur)
    this.px(ctx, pal.skin, cx + (dir > 0 ? sh : -sh - reach), armY, reach + 3, 3);

    const handX = cx + (dir > 0 ? sh + reach + 2 : -(sh + reach + 2));

    // wapen in LOKALE ruimte tekenen: oorsprong = de hand, +x = voorwaarts, -y = omhoog.
    // Handvat zit in/onder de vuist, het blad steekt naar voren/boven — dus niet "in het midden vasthouden".
    ctx.save();
    ctx.translate(handX, armY);
    if (dir < 0) ctx.scale(-1, 1);
    const P = (col, x, y, w2, h2) => this.px(ctx, col, x, y, w2, h2);
    const S = (hex, f) => this._shade(hex, f);
    const atk = attacking;
    const steel = '#cbd3db', steelDk = '#8a929c', steelLt = '#f2f6fa', wood = '#7a5230', woodDk = '#5a3a22', gold = '#caa84a';

    if (weaponId === 'rocketlauncher') {
      // RAKETWERPER (RPG): lange buis vooruit, brede uitlaat achter, raketpunt voor
      const tube = '#414852', tubeLt = '#5e6874', tubeDk = '#262b31', warhead = '#c24a2a';
      P('#23262b', -1, 0, 2, 4);              // greep in de vuist
      P(tube, -5, -3, 16, 5);                 // hoofdbuis
      P(tubeLt, -5, -3, 16, 1);               // highlight bovenop
      P(tubeDk, -5, 1, 16, 1);                // schaduw onder
      P(tube, -8, -4, 3, 7);                  // brede achterkant (uitlaat)
      P(tubeDk, -9, -4, 1, 7);
      P('#0e0e0e', -10, -1, 1, 3);            // uitlaat-opening
      P(warhead, 11, -3, 3, 5);               // raketpunt (kop)
      P('#e8703a', 11, -3, 3, 1);             // punt-highlight
      P('#ffd24a', 14, -1, 1, 2);             // spitse neus
      P('#2a2f36', 2, -5, 3, 1); P('#2a2f36', 3, -6, 1, 1);   // vizier bovenop
    } else if (weaponId === 'ninjastar') {
      // NINJA-STER (shuriken) klaar in de hand
      const st = '#d7dde3', stDk = '#8a929c';
      P('#241f1a', -1, 0, 2, 3);                              // greep in de vuist
      P(st, 3, -4, 3, 3); P(st, 3, 1, 3, 3);                  // boven/onder punt
      P(st, 0, -2, 3, 3); P(st, 6, -2, 3, 3);                 // links/rechts punt
      P(st, 3, -2, 3, 3);                                     // naaf
      P(stDk, 3, 0, 3, 1);                                    // schaduwrand
      P('#3a3f46', 4, -1, 1, 1);                              // gaatje in het midden
    } else if (w.type === 'melee') {
      const id = w.id;
      if (id === 'katana') {
        // tsuka (handvat) in de vuist + wikkel-accenten
        P('#201c17', -1, -1, 2, 6); P('#4a3f34', -1, 1, 2, 1); P('#4a3f34', -1, 3, 2, 1);
        // tsuba (ronde stootplaat)
        P('#2a2a2a', -2, -2, 5, 1); P(gold, -1, -2, 2, 1);
        // kling: enkelzijdig, licht gebogen, heldere snijkant aan de voorzijde
        const bl = atk ? 18 : 15;
        for (let i = 0; i < bl; i++) {
          const curve = Math.round((i * i) / (bl * 5));            // subtiele buiging naar voren
          const x = curve, y = -3 - i;
          P('#b9c2cb', x, y, 2, 1);                                // kling-body (rug)
          P('#ffffff', x + 1, y, 1, 1);                            // snijkant, helder
        }
        const tx = Math.round((bl * bl) / (bl * 5)), ty = -3 - bl;
        P('#dfe6ec', tx, ty, 2, 1); P('#ffffff', tx + 1, ty - 1, 1, 1);   // kissaki (schuine punt)
      } else if (id === 'sword') {
        P(woodDk, -1, 0, 2, 4); P(gold, -1, 4, 2, 1);             // greep + pommel
        P(gold, -3, -1, 6, 1);                                    // kruisstang
        const bl = atk ? 16 : 12;
        P(steel, -1, -1 - bl, 3, bl);                             // kling
        P(steelLt, -1, -1 - bl, 1, bl); P(steelLt, 1, -1 - bl, 1, bl);    // dubbele snede
        P(steelDk, 0, -1 - bl, 1, bl);                            // bloedgeul
        P(steel, -1, -2 - bl, 3, 1); P(steelLt, 0, -3 - bl, 1, 1);        // punt
      } else if (id === 'machete') {
        P(woodDk, -1, 0, 2, 4);                                   // greep
        const bl = atk ? 13 : 11;
        P(steel, 0, -1 - bl, 3, bl);                              // breed lemmet
        P(steelDk, 0, -1 - bl, 1, bl);                            // rug
        P(steelLt, 2, -1 - bl, 1, bl);                            // snijkant
        P(steel, 1, -2 - bl, 2, 1);                               // schuine punt
      } else if (id === 'dagger') {
        P(woodDk, -1, 0, 2, 3); P(gold, -2, -1, 4, 1);            // greep + guard
        const bl = atk ? 9 : 6;
        P(steel, -1, -1 - bl, 2, bl); P(steelLt, 0, -1 - bl, 1, bl);
        P(steel, -1, -2 - bl, 2, 1);                              // punt
      } else if (id === 'club') {
        P(woodDk, -1, 0, 2, 4);                                   // greep
        const bl = atk ? 8 : 6;
        P(wood, -1, -2 - bl, 3, bl + 1);                          // slaghout
        P(S(wood, 0.28), -1, -2 - bl, 1, bl + 1); P(woodDk, 1, -2 - bl, 1, bl + 1);
        P(wood, -2, -3 - bl, 4, 2); P(S(wood, 0.28), -2, -3 - bl, 4, 1);  // dikke knobbel-kop
      } else if (id === 'axe') {
        const sl = atk ? 13 : 12;
        P(wood, -1, -sl + 2, 2, sl);                              // steel door de hand
        P(woodDk, 0, -sl + 2, 1, sl);
        P(steel, 1, -sl + 1, 5, 6); P(steelDk, 1, -sl + 1, 5, 2);         // bijlblad voor
        P(steelLt, 5, -sl + 3, 1, 3);                             // snijkant
        P(steel, -3, -sl + 2, 2, 4);                              // tegenpunt achter
      } else if (id === 'spear') {
        const ln = atk ? 30 : 26;                                 // extra lange schacht (groot bereik)
        P(wood, -4, 0, ln, 2); P(woodDk, -4, 1, ln, 1);           // schacht (achter -> voor)
        P(S(wood, 0.28), -4, 0, ln, 1);                           // highlight langs de schacht
        P(steel, ln - 5, -2, 4, 5); P(steelLt, ln - 5, -2, 4, 1);         // bladpunt
        P(steel, ln - 1, -1, 3, 2);                               // spitse tip
      } else if (id === 'chainsaw') {
        P('#c8402a', -3, -2, 5, 6); P('#e05a3a', -3, -2, 5, 2);   // rode motor-behuizing
        P('#2a2a2e', 0, 0, 2, 3);                                 // greep
        const bl = atk ? 16 : 13;
        P('#9aa3ad', 2, -1, bl, 3); P('#cfd6df', 2, -1, bl, 1);   // grijze zaagbalk
        for (let i = 0; i < bl; i += 2) P('#eef3f7', 3 + i, 2, 1, 1);   // tanden onderaan
        P('#3a3f46', 2, -1, 1, 3);                                // aandrijving
      } else if (id === 'mace') {
        P(woodDk, -1, 0, 2, 4); const hh2 = atk ? 8 : 6;
        P(wood, -1, -hh2, 2, hh2);                                // steel
        P('#6b7480', -2, -4 - hh2, 6, 6); P('#9aa3ad', -2, -4 - hh2, 6, 2);   // bal
        P('#4a4f57', -3, -1 - hh2, 2, 2); P('#4a4f57', 3, -1 - hh2, 2, 2);    // spikes zij
        P('#4a4f57', 0, -6 - hh2, 2, 2);                          // spike top
      } else if (id === 'flail') {
        P(woodDk, -1, 0, 2, 6);                                   // handvat
        P('#888f99', 0, -3, 1, 4);                                // ketting
        P('#6b7480', -1, -3 - (atk ? 5 : 4), 5, 5); P('#9aa3ad', -1, -3 - (atk ? 5 : 4), 5, 2);   // bal
        P('#4a4f57', 1, -5 - (atk ? 5 : 4), 2, 2);                // spike
      } else if (id === 'bostaff') {
        const ln = atk ? 24 : 20;
        P(wood, -(ln >> 1), 0, ln, 2); P(woodDk, -(ln >> 1), 1, ln, 1);
        P(S(wood, 0.28), -(ln >> 1), 0, ln, 1);                   // lange staf, beide kanten
        P('#3a2f22', -(ln >> 1), 0, 2, 2); P('#3a2f22', (ln >> 1) - 2, 0, 2, 2);  // metalen doppen
      } else if (id === 'halberd') {
        const ln = atk ? 20 : 17;
        P(wood, -3, 0, ln, 2); P(woodDk, -3, 1, ln, 1);           // schacht
        P(steel, ln - 8, -6, 6, 6); P(steelDk, ln - 8, -6, 6, 2);         // bijlblad
        P(steelLt, ln - 3, -7, 2, 7);                             // punt bovenop
        P(steel, ln - 5, 2, 2, 2);                                // haak onder
      } else { // bat
        P(woodDk, -1, 0, 2, 4);                                   // greep
        const bl = atk ? 10 : 8;
        P(wood, -1, -1 - bl, 2, bl);                              // dun bij de hand
        P(wood, -2, -2 - bl, 4, 4);                               // dikke top
        P(S(wood, 0.28), -2, -2 - bl, 1, 4); P(woodDk, 1, -2 - bl, 1, 4);
      }
    } else {
      // vuurwapens
      const gunBody = '#3a3f46', gunDark = '#23262b', gunWood = '#6b4a2a', gunLt = '#565d66';
      if (w.id === 'pistol') {
        P(gunBody, 0, -2, 6, 3); P(gunLt, 0, -2, 6, 1);           // slede
        P(gunDark, 0, 1, 2, 3);                                   // greep
      } else if (w.id === 'uzi') {
        P(gunBody, 0, -2, 8, 3); P(gunLt, 0, -2, 8, 1);
        P(gunDark, 1, 1, 2, 4);                                   // magazijn
        P(gunDark, -2, -2, 2, 2);                                 // achterkant
      } else if (w.id === 'ak47') {
        this._akShape(P, S);                                      // gedetailleerde AK47 (kolf/greep/voorgreep/magazijn)
      } else if (w.id === 'deagle') {
        P(gunBody, 0, -2, 9, 3); P(gunLt, 0, -2, 9, 1);           // slede
        P('#6b4426', -1, 1, 2, 4);                                // houten greep
        P(gunDark, 1, 1, 2, 2);                                   // trekkerbeugel
        P('#caa84a', 7, -2, 2, 1);                                // goud accent aan de loop
      } else if (w.id === 'crossbow') {
        P('#5a3a22', -6, -6, 2, 13);                              // boog-arm (verticaal)
        P('#888f99', -5, -1, 3, 1); P('#888f99', -5, 1, 3, 1);    // pees
        P('#7a5230', -3, -1, 12, 2); P(S('#7a5230', 0.3), -3, -1, 12, 1);   // lade
        P('#cfd6df', 6, -1, 5, 2); P('#ffffff', 10, -1, 1, 1);    // pijl
        P('#3a2f22', -1, 1, 2, 3);                                // greep
      }
    }
    ctx.restore();
    if (doSwing) ctx.restore();
  },

  /* ---------- ZOMBIE (dispatch op type) ---------- */
  drawZombie(ctx, cx, footY, dir, z) {
    const self = this;
    this.ink(ctx, cx, footY, (c) => self._drawZombieRaw(c, cx, footY, dir, z));   // 2.5D inkt-outline
  },
  _drawZombieRaw(ctx, cx, footY, dir, z) {
    const id = (z && z.type) ? z.type.id : 'walker';
    if (id === 'brawler') return this.drawBrawlerApe(ctx, cx, footY, dir, z);
    if (id === 'apeling' || id === 'boomape') return this.drawApeling(ctx, cx, footY, dir, z);
    if (id === 'bird') return this.drawBird(ctx, cx, footY, dir, z);
    if (id === 'boss') return this.drawBoss(ctx, cx, footY, dir, z);
    if (id === 'ape') return this.drawApe(ctx, cx, footY, dir, z);
    if (id === 'balloon') return this.drawBalloon(ctx, cx, footY, dir, z);
    if (id === 'dropper') return this.drawDropper(ctx, cx, footY, dir, z);
    if (id === 'flyer') return this.drawFlyer(ctx, cx, footY, dir, z);
    if (id === 'brute') return this.drawBrute(ctx, cx, footY, dir, z);
    if (id === 'crawler') return this.drawCrawler(ctx, cx, footY, dir, z);
    return this.drawWalker(ctx, cx, footY, dir, z);
  },

  // gemuteerde zombie-vogel (cy = midden, want flyers hebben cyOff 0)
  drawFlyer(ctx, cx, cy, dir, z) {
    const flap = ((z && z.walkPhase) % 2 === 0) ? -3 : 1;
    this.px(ctx, '#5a7a3a', cx - 7, cy - 1 + flap, 6, 2);   // vleugel achter
    this.px(ctx, '#5a7a3a', cx + 1, cy - 1 + flap, 6, 2);   // vleugel voor
    this.px(ctx, '#6a8c4a', cx - 4, cy - 3, 8, 6);          // lijf
    this.px(ctx, '#4e6a32', cx - 4, cy + 2, 8, 1);          // buik-schaduw
    this.px(ctx, '#2e3a22', cx - dir * 6, cy, 3, 2);        // staart
    const hx = cx + dir * 4;                                 // kop richting speler
    this.px(ctx, '#6a8c4a', hx - 1, cy - 4, 4, 4);
    this.px(ctx, '#caa84a', hx + dir * 2, cy - 2, 2, 2);     // snavel
    this.px(ctx, '#ff3838', hx + (dir > 0 ? 0 : 1), cy - 3, 1, 1); // rood oog
    this.px(ctx, '#8a2222', cx - 1, cy, 2, 1);              // bloedvlek
  },

  // kleine luchtballon die zombies dropt (wereld 3)
  drawDropper(ctx, cx, cy, dir, z) {
    const top = cy - 13;
    // ballon-bol
    ctx.fillStyle = '#5aa0c0'; ctx.beginPath(); ctx.ellipse(cx, top, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
    this.px(ctx, '#3f7f9c', cx - 1, top - 13, 2, 26);          // verticale streep
    this.px(ctx, '#cfe6f0', cx - 3, top - 13, 6, 2);           // bovenkapje
    this.px(ctx, '#3f7f9c', cx - 5, top, 10, 1);               // glansband
    // touwen + mandje
    this.px(ctx, '#2a2018', cx - 5, cy - 2, 1, 6);
    this.px(ctx, '#2a2018', cx + 4, cy - 2, 1, 6);
    this.px(ctx, '#6b4a2a', cx - 6, cy + 3, 12, 6);            // mand
    this.px(ctx, '#54381f', cx - 6, cy + 7, 12, 2);
    // groen zombiekopje dat over de rand kijkt
    this.px(ctx, '#5a8a3a', cx - 3, cy, 6, 5);
    this.px(ctx, '#ff3030', cx + (dir > 0 ? 1 : -2), cy + 1, 2, 2); // rood oog
  },

  // eindbaas: zombie in een luchtballon
  drawBalloon(ctx, cx, cy, dir, z) {
    // ballon-bol met strepen
    const top = cy - 20;
    ctx.fillStyle = '#b33a3a'; ctx.beginPath(); ctx.ellipse(cx, top, 19, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a2626';
    for (let i = -2; i <= 2; i++) this.px(ctx, '#8a2626', cx + i * 7 - 1, top - 20, 2, 40);
    ctx.fillStyle = '#d9d0b0'; this.px(ctx, '#d9d0b0', cx - 4, top - 22, 8, 3); // bovenkapje
    // touwen
    this.px(ctx, '#2a2018', cx - 8, cy - 2, 1, 9);
    this.px(ctx, '#2a2018', cx + 7, cy - 2, 1, 9);
    // mand
    this.px(ctx, '#6b4a2a', cx - 10, cy + 7, 20, 9);
    this.px(ctx, '#54381f', cx - 10, cy + 13, 20, 3);
    // zombie in de mand
    this.px(ctx, '#4a7a2e', cx - 5, cy - 2, 10, 10);        // torso
    this.px(ctx, '#5a8a3a', cx - 4, cy - 9, 8, 8);          // kop
    this.px(ctx, '#3a5a22', cx - 4, cy - 10, 8, 2);         // haar
    this.px(ctx, '#ff3030', cx + (dir > 0 ? 1 : -2), cy - 6, 2, 2); // rood oog
    this.px(ctx, '#5a8a3a', cx + (dir > 0 ? 5 : -9), cy - 1, 4, 3); // gestrekte arm

    // onkwetsbaar schild-bubbel (alleen tijdens de schild-fase)
    if (z && z.shielded) {
      ctx.save();
      const pulse = 0.55 + 0.25 * Math.sin((z._frameT || 0) / 90);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#8fd0ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy - 6, 26, 34, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = pulse * 0.25;
      ctx.fillStyle = '#bfe6ff';
      ctx.fill();
      ctx.restore();
    }
  },

  // zwevend parkour-platform (rotsrichel)
  drawPlatform(ctx, cx, y, w, style) {
    const x = Math.round(cx - w / 2);
    w = Math.round(w);
    this.px(ctx, '#10131c', x - 1, y - 2, w + 2, 18);   // 2.5D: donkere inkt-rand rond de hele plaat
    if (style === 'wood') {
      this.px(ctx, '#6b4a2b', x, y - 1, w, 2);   // plankrand
      this.px(ctx, '#8a5e36', x, y + 1, w, 3);   // licht hout
      this.px(ctx, '#5a3d22', x, y + 4, w, 9);   // hout-body
      this.px(ctx, '#3a2615', x, y + 11, w, 4);  // schaduw
      this.px(ctx, '#4a3219', x + 4, y + 4, 1, 9);   // plank-naad
      this.px(ctx, '#4a3219', x + Math.round(w / 2), y + 4, 1, 9);
      this.px(ctx, '#4a3219', x + w - 8, y + 4, 1, 9);
      return;
    }
    if (style === 'dohyo') {
      // sumo-ring: lichte klei/zand met strobalen-rand (tawara) bovenop
      this.px(ctx, '#efdca6', x, y - 1, w, 2);    // wit zand bovenop
      this.px(ctx, '#dcbd80', x, y + 1, w, 3);    // klei-top
      this.px(ctx, '#c19a58', x, y + 4, w, 9);    // klei-body
      this.px(ctx, '#8a6a38', x, y + 11, w, 4);   // schaduw onderkant
      this.px(ctx, '#a87f3e', x + 4, y + 5, 2, 5); // textuur
      this.px(ctx, '#a87f3e', x + w - 7, y + 6, 2, 4);
      // strobalen (tawara) langs de bovenrand
      for (let i = 0; i < w; i += 8) { this.px(ctx, '#d8b24e', x + i, y - 3, 6, 3); this.px(ctx, '#b08c30', x + i, y - 1, 6, 1); }
      // rand-balen op de hoeken iets hoger
      this.px(ctx, '#d8b24e', x - 1, y - 4, 5, 6); this.px(ctx, '#d8b24e', x + w - 4, y - 4, 5, 6);
      return;
    }
    if (style === 'sand') {
      this.px(ctx, '#f0dca0', x, y - 1, w, 2);    // licht zand bovenop
      this.px(ctx, '#e3c882', x, y + 1, w, 3);    // zand-top
      this.px(ctx, '#caa860', x, y + 4, w, 9);    // zand-body
      this.px(ctx, '#9a7e44', x, y + 11, w, 4);   // schaduw
      this.px(ctx, '#b89a52', x + 4, y + 5, 2, 2); this.px(ctx, '#b89a52', x + w - 8, y + 6, 2, 2); // korrels
      return;
    }
    if (style === 'stone') {
      this.px(ctx, '#7a756e', x, y - 1, w, 2);   // stenen rand bovenop (geen gras)
      this.px(ctx, '#5e5a54', x, y + 1, w, 3);   // steen-topvlak
      this.px(ctx, '#46423c', x, y + 4, w, 9);   // steen-body
      this.px(ctx, '#2e2b27', x, y + 11, w, 4);  // schaduw onderkant
      this.px(ctx, '#3a362f', x + 3, y + 5, 2, 5); // textuur
      this.px(ctx, '#3a362f', x + w - 6, y + 6, 2, 4);
      return;
    }
    this.px(ctx, '#5c7e5a', x, y - 1, w, 2);     // mossige/grasrand bovenop
    this.px(ctx, '#4a5e72', x, y + 1, w, 3);     // steen-topvlak
    this.px(ctx, '#384a5c', x, y + 4, w, 9);     // steen-body
    this.px(ctx, '#28323e', x, y + 11, w, 4);    // schaduw onderkant
    this.px(ctx, '#2a3540', x + 3, y + 5, 2, 5); // textuur
    this.px(ctx, '#2a3540', x + w - 6, y + 6, 2, 4);
  },

  // kleurvariatie per zombie
  zPal(z) {
    const base = (z && z.type && z.type.color) || '#6a9c4a';
    const tint = z ? z.tint : 0;
    const skins = ['#5e8a40', '#6a9c4a', '#7caa54'];
    const skin = tint === 0 ? base : skins[tint + 1] || base;
    return {
      skin, skinDark: '#42662a',
      shirt: ['#5a4a3a', '#4a4a55', '#5a3a3a'][(z && z.tint + 1) || 1],
      shirtDark: '#332a22', pants: '#34384a', blood: '#8a2222', eye: '#ff4040',
    };
  },

  // arm-pose op basis van aanval-state
  zArms(ctx, pal, cx, torsoTop, dir, z) {
    const st = z ? z.atk : 'walk';
    if (st === 'windup') {
      // armen omhoog/achteruit (haalt uit)
      this.px(ctx, pal.skin, cx + (dir > 0 ? 2 : -6), torsoTop - 4, 4, 3);
      this.px(ctx, pal.skin, cx + (dir > 0 ? 4 : -8), torsoTop - 6, 4, 3);
    } else if (st === 'strike') {
      // armen ver naar voren (uitval)
      this.px(ctx, pal.skin, cx + (dir > 0 ? 4 : -13), torsoTop + 1, 9, 3);
      this.px(ctx, pal.skinDark, cx + (dir > 0 ? 11 : -13), torsoTop + 1, 2, 3); // klauw
    } else {
      // gestrekt vooruit (slome zombiehouding)
      this.px(ctx, pal.skin, cx + (dir > 0 ? 4 : -10), torsoTop + 2, 6, 3);
    }
  },

  // Journey-mensaap (klein): patrouilleert; bruine vacht, lichte snuit. boomape houdt een boemerang vast.
  drawApeling(ctx, cx, footY, dir, z) {
    const ph = (z && z.walkPhase) || 0;
    const swing = (ph === 1) ? 2 : (ph === 3) ? -2 : 0;
    const boom = z && z.type && z.type.id === 'boomape';
    const fur = boom ? '#5a3f28' : '#6a4a2c', furDk = '#3f2c18', belly = '#b98a5a';
    const legTop = footY - 7, torsoTop = legTop - 10, headTop = torsoTop - 8;
    // benen
    this.px(ctx, furDk, cx - 4 - swing, footY - 3, 4, 3); this.px(ctx, furDk, cx + 1 + swing, footY - 3, 4, 3);
    // armen (lang, aap-achtig)
    this.px(ctx, fur, cx - 7, torsoTop + 1, 3, 8); this.px(ctx, fur, cx + 5, torsoTop + 1, 3, 8);
    // lijf
    this.px(ctx, fur, cx - 5, torsoTop, 10, 11); this.px(ctx, furDk, cx - 5, torsoTop, 2, 11);
    this.px(ctx, belly, cx - 2, torsoTop + 3, 5, 6);                       // lichte buik
    // kop
    this.px(ctx, fur, cx - 5, headTop, 10, 8); this.px(ctx, furDk, cx - 5, headTop, 10, 2);
    this.px(ctx, '#e8c8a0', cx - 3, headTop + 3, 6, 4);                    // snuit
    this.px(ctx, '#1a0e06', cx + (dir > 0 ? 1 : -2), headTop + 3, 2, 2);   // oog
    this.px(ctx, '#1a0e06', cx - 1, headTop + 5, 2, 1);                    // neusgaten
    // SCHILD: metalen helm op de kop (2x bespringen) — eerste stamp slaat 'm eraf, tweede maakt dood
    if (z && z.shieldHp > 0) {
      this.px(ctx, '#9aa6b4', cx - 6, headTop - 3, 12, 4);                 // helm-koepel
      this.px(ctx, '#c8d2dc', cx - 6, headTop - 3, 12, 1);                 // glans bovenop
      this.px(ctx, '#5a6675', cx - 6, headTop, 12, 1);                     // schaduwrand
      this.px(ctx, '#6b7684', cx - 7, headTop, 14, 1);                     // brede helmrand
      this.px(ctx, '#3f4855', cx - 1, headTop - 5, 2, 2);                  // knop bovenop
    }
    if (boom) { this.drawBoomerangHeld(ctx, cx + dir * 8, torsoTop + 3, dir); }
  },
  // vastgehouden / vliegende boemerang (hout, gebogen)
  drawBoomerangHeld(ctx, x, y, dir) {
    this.px(ctx, '#a8824a', x - 3, y, 6, 2); this.px(ctx, '#a8824a', x + dir * 2, y - 3, 2, 6);
    this.px(ctx, '#caa860', x - 3, y, 3, 1);
  },
  drawBoomerangFly(ctx, x, y, spin) {
    const f = Math.floor(spin) % 2;
    this.px(ctx, '#8a6a30', x - 4, y - 1, 8, 2); this.px(ctx, '#8a6a30', x - 1, y - 4, 2, 8);
    if (f) { this.px(ctx, '#caa860', x - 4, y - 4, 3, 3); this.px(ctx, '#caa860', x + 1, y + 1, 3, 3); }
    else { this.px(ctx, '#caa860', x + 1, y - 4, 3, 3); this.px(ctx, '#caa860', x - 4, y + 1, 3, 3); }
  },
  // BOT-MENSAAP (mini-boss): grote, boze mensaap — rode ogen, brede schouders, hp-balk
  drawBrawlerApe(ctx, cx, footY, dir, z) {
    const ph = (z && z.walkPhase) || 0;
    const swing = (ph === 1) ? 3 : (ph === 3) ? -3 : 0;
    const fur = '#5a3f28', furDk = '#3a2818', chest = '#8a5e38', enraged = z && z.hp < z.maxHp * 0.35;
    const legTop = footY - 12, torsoTop = legTop - 17, headTop = torsoTop - 13;
    // benen
    this.px(ctx, furDk, cx - 8 - swing, footY - 4, 7, 4); this.px(ctx, furDk, cx + 2 + swing, footY - 4, 7, 4);
    // armen (dik, aap-achtig, tot op de grond)
    const atk = z && (z.atk === 'strike' || z.atk === 'windup');
    this.px(ctx, fur, cx - 13, torsoTop + (atk ? -3 : 2), 5, 16); this.px(ctx, fur, cx + 8, torsoTop + (atk ? -3 : 2), 5, 16);
    this.px(ctx, furDk, cx - 13, torsoTop + 12, 5, 4); this.px(ctx, furDk, cx + 8, torsoTop + 12, 5, 4);   // vuisten
    // lijf (brede schouders)
    this.px(ctx, fur, cx - 10, torsoTop, 20, 17); this.px(ctx, furDk, cx - 10, torsoTop, 3, 17);
    this.px(ctx, chest, cx - 5, torsoTop + 4, 10, 10);                     // borst
    this.px(ctx, furDk, cx - 10, torsoTop, 20, 3);                        // schouderschaduw
    // kop
    this.px(ctx, fur, cx - 8, headTop, 16, 13); this.px(ctx, furDk, cx - 8, headTop, 16, 3);
    this.px(ctx, '#e8c8a0', cx - 5, headTop + 5, 10, 6);                  // snuit
    const eye = enraged ? '#ff2020' : '#1a0e06';
    this.px(ctx, eye, cx - 4, headTop + 4, 3, 2); this.px(ctx, eye, cx + 2, headTop + 4, 3, 2);   // ogen (rood bij razernij)
    this.px(ctx, '#fff', cx - 4, headTop + 9, 3, 1); this.px(ctx, '#fff', cx + 2, headTop + 9, 3, 1);   // ontblote tanden
    if (enraged) { for (let i = 0; i < 2; i++) this.px(ctx, '#ff3030', cx - 10 + i * 18, headTop - 3 - i, 3, 1); }   // boze streepjes
    // hp-balk boven de kop
    if (z && z.hp < z.maxHp) {
      const bw = 30; this.px(ctx, '#11151e', cx - bw / 2 - 1, headTop - 8, bw + 2, 4);
      this.px(ctx, '#e5484d', cx - bw / 2, headTop - 7, Math.round(bw * Math.max(0, z.hp / z.maxHp)), 2);
    }
  },

  // tropische vogel (Journey): zweeft heen en weer, klappert met de vleugels
  drawBird(ctx, cx, cy, dir, z) {
    const t = (z && z._t) || 0;
    const flap = Math.round(Math.sin((z && z.walkPhase || 0) * 1.6 + cx) * 3);
    const body = (z && z.type && z.type.color) || '#d2662e', wing = '#a8481e', belly = '#ffd24a';
    ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); if (dir < 0) ctx.scale(-1, 1);
    this.px(ctx, wing, -6, -2 - flap, 7, 3);              // vleugel (klappert)
    this.px(ctx, body, -5, -2, 10, 6);                    // lijf
    this.px(ctx, belly, -3, 1, 6, 2);                     // buik
    this.px(ctx, body, 4, -4, 5, 5);                      // kop
    this.px(ctx, '#ffe27a', 8, -2, 3, 2);                 // snavel
    this.px(ctx, '#1a1a1a', 6, -3, 2, 2);                 // oog
    this.px(ctx, wing, -8, 0, 4, 2);                      // staart
    ctx.restore();
  },

  drawWalker(ctx, cx, footY, dir, z) {
    const pal = this.zPal(z);
    const runner = z && z.type && z.type.id === 'runner';
    const legH = 8, torsoH = 11, headH = 8;
    const legTop = footY - legH, torsoTop = legTop - torsoH, headTop = torsoTop - headH;
    const ph = (z && z.walkPhase) || 0;
    const swing = (ph === 1) ? 2 : (ph === 3) ? -2 : 0;

    // benen
    this.px(ctx, pal.pants, cx - 4, legTop, 3, legH);
    this.px(ctx, pal.pants, cx + 1, legTop, 3, legH);
    this.px(ctx, '#1a1a1a', cx - 4 - swing, footY - 2, 4, 2);
    this.px(ctx, '#1a1a1a', cx + 1 + swing, footY - 2, 4, 2);

    // torso (gescheurd shirt + scheuren)
    this.px(ctx, pal.shirt, cx - 5, torsoTop, 10, torsoH);
    this.px(ctx, pal.shirtDark, cx - 5, torsoTop, 2, torsoH);
    this.px(ctx, pal.skin, cx + 2, torsoTop + 6, 2, 3);   // gat in shirt (huid)
    this.px(ctx, pal.blood, cx + 1, torsoTop + 4, 3, 2);

    this.zArms(ctx, pal, cx, torsoTop, dir, z);

    // hoofd
    this.px(ctx, pal.skin, cx - 4, headTop, 8, headH);
    this.px(ctx, pal.skinDark, cx - 4, headTop, 2, headH);
    this.px(ctx, pal.eye, cx + (dir > 0 ? 1 : -2), headTop + 3, 2, 2);
    this.px(ctx, '#fff', cx + (dir > 0 ? 1 : -2), headTop + 3, 1, 1); // glinster
    this.px(ctx, '#2e3a22', cx - 4, headTop - 1, runner ? 5 : 8, 2);  // haarplukken
    this.px(ctx, '#3a1a1a', cx + (dir > 0 ? 0 : 2), headTop + 6, 3, 1); // mond/wond
  },

  drawCrawler(ctx, cx, footY, dir, z) {
    const pal = this.zPal(z);
    const ph = (z && z.walkPhase) || 0;
    const swing = (ph === 1) ? 2 : (ph === 3) ? -2 : 0;
    const bodyTop = footY - 11;

    // achterpoten
    this.px(ctx, pal.pants, cx - 6, footY - 5, 3, 5);
    this.px(ctx, pal.pants, cx - 1, footY - 5, 3, 5);
    this.px(ctx, '#1a1a1a', cx - 6 + swing, footY - 2, 3, 2);

    // langwerpig lichaam (kruipend, voorover)
    this.px(ctx, pal.shirt, cx - 7, bodyTop, 13, 6);
    this.px(ctx, pal.shirtDark, cx - 7, bodyTop, 13, 2);
    this.px(ctx, pal.blood, cx - 2, bodyTop + 2, 3, 2);

    // gestrekte voorarmen/klauwen vooruit (laag bij de grond)
    const ax = cx + (dir > 0 ? 5 : -12);
    this.px(ctx, pal.skin, ax, footY - 4, 7, 3);
    this.px(ctx, pal.skinDark, cx + (dir > 0 ? 11 : -12), footY - 4, 2, 3);

    // kop vooruit gestoken
    const hx = cx + (dir > 0 ? 3 : -10);
    this.px(ctx, pal.skin, hx, bodyTop - 1, 7, 6);
    this.px(ctx, pal.skinDark, hx, bodyTop - 1, 7, 1);
    this.px(ctx, pal.eye, cx + (dir > 0 ? 7 : -7), bodyTop + 1, 2, 2);
  },

  drawBrute(ctx, cx, footY, dir, z) {
    const pal = this.zPal(z);
    pal.skin = '#4e7c3a'; pal.skinDark = '#365626';
    const ph = (z && z.walkPhase) || 0;
    const swing = (ph === 1) ? 2 : (ph === 3) ? -2 : 0;
    const legH = 11, torsoH = 17, headH = 11;
    const legTop = footY - legH, torsoTop = legTop - torsoH, headTop = torsoTop - headH;

    // dikke benen
    this.px(ctx, pal.pants, cx - 7, legTop, 6, legH);
    this.px(ctx, pal.pants, cx + 1, legTop, 6, legH);
    this.px(ctx, '#141414', cx - 7 - swing, footY - 3, 6, 3);
    this.px(ctx, '#141414', cx + 1 + swing, footY - 3, 6, 3);

    // brede romp
    this.px(ctx, pal.shirt, cx - 9, torsoTop, 18, torsoH);
    this.px(ctx, pal.shirtDark, cx - 9, torsoTop, 3, torsoH);
    this.px(ctx, pal.skin, cx + 3, torsoTop + 5, 4, 5);   // gescheurde huid
    this.px(ctx, pal.blood, cx - 2, torsoTop + 7, 5, 3);

    // grote armen (pose)
    const st = z ? z.atk : 'walk';
    if (st === 'strike') {
      this.px(ctx, pal.skin, cx + (dir > 0 ? 7 : -20), torsoTop + 2, 14, 5);
      this.px(ctx, pal.skinDark, cx + (dir > 0 ? 19 : -20), torsoTop + 1, 3, 6);
    } else if (st === 'windup') {
      this.px(ctx, pal.skin, cx + (dir > 0 ? 4 : -9), torsoTop - 6, 6, 5);
    } else {
      this.px(ctx, pal.skin, cx + (dir > 0 ? 7 : -16), torsoTop + 3, 9, 5);
    }

    // grote kop, ingezonken
    this.px(ctx, pal.skin, cx - 6, headTop, 12, headH);
    this.px(ctx, pal.skinDark, cx - 6, headTop, 3, headH);
    this.px(ctx, pal.eye, cx + (dir > 0 ? 1 : -3), headTop + 4, 3, 2);
    this.px(ctx, '#fff', cx + (dir > 0 ? 2 : -3), headTop + 4, 1, 1);
    this.px(ctx, '#2e3a22', cx - 6, headTop - 1, 12, 2);
    this.px(ctx, '#3a1a1a', cx - 3, headTop + 8, 6, 1); // grommende mond
  },

  /* ---------- MEGA-ZOMBIE BAAS ---------- */
  drawBoss(ctx, cx, footY, dir, z) {
    const skin = '#4a7a2e', skinDk = '#33581e', shirt = '#3a3026', shirtDk = '#241d15';
    const blood = '#8a1f1f', bone = '#cfcab0';
    const ph = (z && z.walkPhase) || 0;
    const sw = (ph === 1) ? 4 : (ph === 3) ? -4 : 0;
    const st = z ? z.atk : 'walk';
    // afmetingen (mega)
    const legH = 26, torsoH = 40, headH = 22;
    const legTop = footY - legH, torsoTop = legTop - torsoH, headTop = torsoTop - headH;

    // dikke poten
    this.px(ctx, shirt, cx - 16, legTop, 12, legH);
    this.px(ctx, shirt, cx + 4, legTop, 12, legH);
    this.px(ctx, '#141414', cx - 16 - sw, footY - 4, 13, 4);
    this.px(ctx, '#141414', cx + 4 + sw, footY - 4, 13, 4);

    // enorme romp
    this.px(ctx, shirt, cx - 20, torsoTop, 40, torsoH);
    this.px(ctx, shirtDk, cx - 20, torsoTop, 5, torsoH);
    // blootliggende ribben + bloed
    this.px(ctx, bone, cx + 4, torsoTop + 8, 12, 2);
    this.px(ctx, bone, cx + 4, torsoTop + 14, 12, 2);
    this.px(ctx, bone, cx + 4, torsoTop + 20, 12, 2);
    this.px(ctx, blood, cx - 10, torsoTop + 12, 10, 6);
    this.px(ctx, skin, cx - 18, torsoTop + 4, 6, 10);

    // gigantische armen + klauwen (pose)
    if (st === 'strike') {
      this.px(ctx, skin, cx + (dir > 0 ? 16 : -44), torsoTop + 6, 28, 9);
      this.px(ctx, skinDk, cx + (dir > 0 ? 42 : -44), torsoTop + 2, 4, 16); // klauw
    } else if (st === 'windup') {
      this.px(ctx, skin, cx + (dir > 0 ? 10 : -22), torsoTop - 12, 12, 10);
      this.px(ctx, skinDk, cx + (dir > 0 ? 10 : -22), torsoTop - 16, 12, 5);
    } else {
      this.px(ctx, skin, cx + (dir > 0 ? 16 : -34), torsoTop + 8, 18, 9);
      this.px(ctx, skinDk, cx + (dir > 0 ? 32 : -34), torsoTop + 6, 4, 12);
    }
    // andere arm (achter)
    this.px(ctx, skinDk, cx + (dir > 0 ? -22 : 16), torsoTop + 10, 8, 7);

    // grote kop
    this.px(ctx, skin, cx - 11, headTop, 22, headH);
    this.px(ctx, skinDk, cx - 11, headTop, 5, headH);
    this.px(ctx, '#2a3a1c', cx - 11, headTop - 2, 22, 3); // haar/rotte kruin
    // gloeiende rode ogen
    this.px(ctx, '#ff2a2a', cx + (dir > 0 ? 0 : -7), headTop + 8, 5, 4);
    this.px(ctx, '#ff7a4a', cx + (dir > 0 ? 1 : -6), headTop + 8, 2, 2);
    // grote grommende muil met tanden
    this.px(ctx, '#1a0a0a', cx - 7, headTop + 15, 14, 4);
    this.px(ctx, bone, cx - 6, headTop + 15, 2, 3);
    this.px(ctx, bone, cx - 2, headTop + 15, 2, 3);
    this.px(ctx, bone, cx + 2, headTop + 15, 2, 3);
    this.px(ctx, blood, cx - 4, headTop + 19, 8, 1); // kwijl/bloed
  },

  /* ---------- MEGA ZOMBIE-AAP (wereld 3 boss) ---------- */
  drawApe(ctx, cx, footY, dir, z) {
    const enraged = z && z.enraged;
    const fur = enraged ? '#5a3424' : '#3a5a2a', furDk = enraged ? '#3e2014' : '#27411c', furLt = enraged ? '#a8603a' : '#4e7236';
    const skin = '#6a8a4a', blood = '#7a1f1f', bone = '#d2ccb0';
    const crouch = z && z.crouchT > 0;        // ineengedoken vóór de sprong
    const air = z && !z.onGround;              // mid-sprong (armen omhoog)
    // razende rode gloed
    if (enraged) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin((z._frameT || footY * 7) / 80);
      ctx.fillStyle = '#ff3018';
      ctx.beginPath(); ctx.ellipse(cx, footY - 44, 34, 56, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const ph = (z && z.walkPhase) || 0;
    const sw = (ph === 1) ? 4 : (ph === 3) ? -4 : 0;

    // afmetingen — gehurkt = lager & breder
    const bodyH = crouch ? 30 : 42;
    const legH = crouch ? 12 : 18;
    const legTop = footY - legH;
    const torsoTop = legTop - bodyH;
    const headH = 20;
    const headTop = torsoTop - headH + 6;      // kop zakt iets in de schouders

    // korte krachtige benen
    this.px(ctx, fur, cx - 18, legTop, 14, legH);
    this.px(ctx, fur, cx + 4, legTop, 14, legH);
    this.px(ctx, furDk, cx - 18, legTop, 4, legH);
    this.px(ctx, '#161208', cx - 18 - sw, footY - 4, 15, 4);    // grote voeten
    this.px(ctx, '#161208', cx + 4 + sw, footY - 4, 15, 4);

    // enorme gespierde romp (breed bovenaan = aap-schouders)
    this.px(ctx, fur, cx - 22, torsoTop, 44, bodyH);
    this.px(ctx, furLt, cx - 22, torsoTop, 44, 6);             // lichte schouderband
    this.px(ctx, furDk, cx - 22, torsoTop, 6, bodyH);          // schaduw links
    // kale, gehavende borst met ribben + bloed (zombie)
    this.px(ctx, skin, cx - 9, torsoTop + 10, 18, bodyH - 16);
    this.px(ctx, bone, cx - 6, torsoTop + 14, 12, 2);
    this.px(ctx, bone, cx - 6, torsoTop + 20, 12, 2);
    this.px(ctx, blood, cx - 4, torsoTop + 24, 9, 5);

    // gigantische armen
    const ay = torsoTop + 8;
    if (air) {
      // beide armen hoog omhoog tijdens de sprong (duik-pose)
      this.px(ctx, fur, cx + (dir > 0 ? 14 : -34), torsoTop - 16, 20, 12);
      this.px(ctx, skin, cx + (dir > 0 ? 30 : -34), torsoTop - 22, 6, 10);   // klauw
      this.px(ctx, fur, cx + (dir > 0 ? -30 : 16), torsoTop - 10, 16, 11);
    } else if (crouch) {
      // armen op de grond gesteund (ineengedoken, klaar om te springen)
      this.px(ctx, fur, cx + (dir > 0 ? 12 : -34), ay + 10, 22, 11);
      this.px(ctx, skin, cx + (dir > 0 ? 32 : -34), ay + 16, 6, 6);
      this.px(ctx, fur, cx + (dir > 0 ? -34 : 12), ay + 10, 22, 11);
    } else {
      // lange hangende armen (knokkel-stand)
      this.px(ctx, fur, cx + (dir > 0 ? 16 : -40), ay, 24, 12);
      this.px(ctx, skin, cx + (dir > 0 ? 38 : -42), ay + 6, 6, 12);          // klauw vooraan
      this.px(ctx, furDk, cx + (dir > 0 ? -40 : 16), ay + 2, 18, 10);        // arm achter
    }

    // brede kop met zware kaak
    this.px(ctx, fur, cx - 13, headTop, 26, headH);
    this.px(ctx, furDk, cx - 13, headTop, 5, headH);
    this.px(ctx, '#1f2e14', cx - 13, headTop - 2, 26, 3);       // ruige kruin
    // ingevallen snuit
    this.px(ctx, skin, cx - 7, headTop + 9, 14, 9);
    // gloeiende rode ogen onder zware wenkbrauw
    this.px(ctx, furDk, cx - 11, headTop + 5, 22, 2);
    this.px(ctx, '#ff2a2a', cx + (dir > 0 ? 1 : -8), headTop + 8, 5, 4);
    this.px(ctx, '#ffa060', cx + (dir > 0 ? 2 : -7), headTop + 8, 2, 2);
    // grommende muil met slagtanden
    this.px(ctx, '#160808', cx - 7, headTop + 15, 15, 4);
    this.px(ctx, bone, cx - 6, headTop + 14, 2, 4);
    this.px(ctx, bone, cx + 4, headTop + 14, 2, 4);
    this.px(ctx, blood, cx - 4, headTop + 19, 9, 1);
  },

  /* ---------- FINISH: stok met wapperende vlag ---------- */
  drawFlag(ctx, x, groundY, time, boss) {
    const poleH = 62;
    const top = groundY - poleH;
    // voet in de grond
    this.px(ctx, '#2a313e', x - 4, groundY - 2, 11, 3);
    this.px(ctx, '#3a4456', x - 2, groundY - 4, 6, 3);
    // houten stok
    this.px(ctx, '#8a6438', x, top, 3, poleH);
    this.px(ctx, '#6b4a28', x, top, 1, poleH);   // schaduwkant
    this.px(ctx, '#caa84a', x - 1, top - 2, 4, 2); // knop bovenop

    // driehoekige vlag (pennant) die naar rechts wappert vanaf de top
    const fy = top + 2;        // bovenrand van de vlag
    const len = 26;            // lengte van de punt
    const tall = 16;           // hoogte bij de stok
    const cloth = boss ? '#d94343' : '#6abe30';
    const clothDk = boss ? '#a82e2e' : '#4a8c1f';
    for (let i = 0; i < len; i++) {
      const wave = Math.round(Math.sin(time / 150 + i / 4) * 2);
      const hh = Math.round(tall * (1 - i / len));   // taps mooi naar de punt
      if (hh <= 0) continue;
      this.px(ctx, (i % 6 < 3) ? cloth : clothDk, x + 3 + i, fy + wave, 1, hh);
      this.px(ctx, clothDk, x + 3 + i, fy + wave + hh - 1, 1, 1); // onderrand
    }
    // embleem (doodskop op de laatste-level-vlag)
    if (boss) {
      const sx = x + 8, sy = fy + 5 + Math.round(Math.sin(time / 150 + 2) * 2);
      this.px(ctx, '#f4f8f0', sx, sy, 6, 5);
      this.px(ctx, '#7a1a1a', sx + 1, sy + 1, 1, 2);
      this.px(ctx, '#7a1a1a', sx + 3, sy + 1, 1, 2);
      this.px(ctx, '#f4f8f0', sx + 1, sy + 5, 4, 1);
    }
  },

  /* ---------- DOOD LIJK (blijft liggen) ---------- */
  drawCorpse(ctx, x, groundY, dir, cp) {
    const pal = this.zPal(cp);
    const id = cp.type && cp.type.id;
    const s = id === 'boss' ? 2.4 : id === 'brute' ? 1.4 : 1;
    const d = cp.flip ? -dir : dir;     // willekeurig of hoofd links/rechts ligt
    const y = groundY - 1;

    // bloedplas
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#5e1414';
    ctx.beginPath();
    ctx.ellipse(x, groundY, 14 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // liggend lichaam (horizontaal)
    const bw = Math.round(12 * s), bh = Math.round(5 * s);
    this.px(ctx, pal.shirt, x - bw / 2, y - bh, bw, bh);
    this.px(ctx, pal.shirtDark, x - bw / 2, y - 1, bw, 1);
    this.px(ctx, pal.blood, x - 2, y - bh + 1, 3, 2);

    // gespreide benen aan één kant
    this.px(ctx, pal.pants, x - d * (bw / 2 + 3), y - 3, Math.round(5 * s), 2);
    this.px(ctx, pal.pants, x - d * (bw / 2 + 2), y - 1, Math.round(5 * s), 2);

    // arm gespreid
    this.px(ctx, pal.skin, x + d * 1, y - bh - 1, Math.round(5 * s), 2);

    // hoofd aan de andere kant
    const hx = x + d * (bw / 2 + Math.round(3 * s));
    const hr = Math.round(5 * s);
    this.px(ctx, pal.skin, hx - hr / 2, y - hr, hr, hr);
    this.px(ctx, pal.skinDark, hx - hr / 2, y - 1, hr, 1);
    // dood (X-)oog
    this.px(ctx, '#3a1a1a', hx - 1, y - hr + 1, 2, 2);
  },

  /* ---------- MUNITIEDOOSJE (grond-pickup) ---------- */
  drawAmmoBox(ctx, x, y, bob) {
    const oy = Math.round(Math.sin(bob) * 1); // klein dobber-effectje
    const top = y - 7 + oy;
    // kogels die uit het doosje steken
    this.px(ctx, '#caa84a', x - 3, top - 3, 2, 3);
    this.px(ctx, '#caa84a', x, top - 3, 2, 3);
    this.px(ctx, '#e8c860', x - 3, top - 3, 2, 1);
    this.px(ctx, '#e8c860', x, top - 3, 2, 1);
    // doosje
    this.px(ctx, '#4a5a2e', x - 5, top, 11, 7);
    this.px(ctx, '#5e7038', x - 5, top, 11, 2);
    this.px(ctx, '#2e3a1c', x - 5, top + 6, 11, 1);
    // bandje + tekst-suggestie
    this.px(ctx, '#caa84a', x - 5, top + 3, 11, 1);
  },

  /* ---------- EHBO-DOOSJE (grond-pickup) ---------- */
  drawHealthBox(ctx, x, y, bob) {
    const oy = Math.round(Math.sin(bob) * 1);
    const top = y - 9 + oy;
    // wit doosje
    this.px(ctx, '#e8ecf1', x - 5, top, 11, 9);
    this.px(ctx, '#ffffff', x - 5, top, 11, 2);
    this.px(ctx, '#b8c0cc', x - 5, top + 8, 11, 1);
    // rood kruis
    this.px(ctx, '#d94343', x - 1, top + 2, 3, 5);
    this.px(ctx, '#d94343', x - 3, top + 3, 7, 3);
    this.px(ctx, '#ff6b6b', x - 1, top + 2, 1, 5);
  },

  /* ---------- OBSTAKELS ---------- */
  drawObstacle(ctx, o, groundY) {
    if (o.type === 'car') {
      const x = o.x, w = o.w, top = groundY - o.h;
      // wielen
      this.px(ctx, '#0e0e0e', x - w / 2 + 3, groundY - 5, 7, 5);
      this.px(ctx, '#0e0e0e', x + w / 2 - 10, groundY - 5, 7, 5);
      // body
      this.px(ctx, o.color, x - w / 2, groundY - 16, w, 12);
      this.px(ctx, '#00000033', x - w / 2, groundY - 16, w, 3);
      // cabine
      this.px(ctx, o.color, x - w / 2 + 6, top, w - 14, 8);
      // raampjes (kapot)
      this.px(ctx, '#9fb8c8', x - w / 2 + 8, top + 1, 6, 5);
      this.px(ctx, '#6a8090', x + w / 2 - 12, top + 1, 5, 5);
      // roest/bloed
      this.px(ctx, '#5a2a1a', x - 2, groundY - 12, 4, 4);
    } else if (o.type === 'lowbar') {
      const x = o.x, w = o.w;
      const barTop = groundY - 30, barH = 10;
      // steunpalen
      this.px(ctx, '#5a5048', x - w / 2, barTop, 3, 30);
      this.px(ctx, '#5a5048', x + w / 2 - 3, barTop, 3, 30);
      // balk
      this.px(ctx, '#7a6a4a', x - w / 2, barTop, w, barH);
      this.px(ctx, '#9a8a5a', x - w / 2, barTop, w, 3);
      // waarschuwingsstrepen
      for (let i = 0; i < w; i += 6) this.px(ctx, '#caa01e', x - w / 2 + i, barTop + 4, 3, 3);
    } else if (o.type === 'hazard') {
      const x = o.x, w = o.w;
      this.px(ctx, '#1a1410', x - w / 2, groundY, w, 4); // putrand
      // spikes
      for (let i = 0; i < w; i += 5) {
        const sx = x - w / 2 + i;
        this.px(ctx, '#b8c0cc', sx + 1, groundY - 5, 1, 5);
        this.px(ctx, '#cfd6df', sx + 2, groundY - 7, 1, 7);
        this.px(ctx, '#9aa3ad', sx + 3, groundY - 5, 1, 5);
      }
    } else if (o.type === 'barrel') {
      const x = o.x, top = groundY - 20;
      this.px(ctx, '#b33a2a', x - 6, top, 12, 20);          // vat
      this.px(ctx, '#8a2a1e', x - 6, top, 3, 20);           // schaduwkant
      this.px(ctx, '#d9d0b0', x - 6, top + 6, 12, 4);       // band
      this.px(ctx, '#d9d0b0', x - 6, top + 14, 12, 2);
      // gevaar-symbool
      this.px(ctx, '#1a1a1a', x - 2, top + 6, 1, 4);
      this.px(ctx, '#1a1a1a', x, top + 6, 1, 4);
      this.px(ctx, '#1a1a1a', x - 3, top + 9, 5, 1);
    }
  },

  /* ---------- POWER-UP (zwevend, gloeiend) ---------- */
  drawPowerUp(ctx, x, y, kind, bob) {
    const pu = POWERUPS[kind];
    const oy = Math.round(Math.sin(bob) * 2);
    const cy = y - 12 + oy;
    // gloed
    ctx.globalAlpha = 0.22; ctx.fillStyle = pu.color;
    ctx.beginPath(); ctx.arc(x, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // capsule
    this.px(ctx, pu.color, x - 5, cy - 5, 10, 10);
    this.px(ctx, '#ffffff', x - 5, cy - 5, 10, 2);
    this.px(ctx, '#00000033', x - 5, cy + 3, 10, 2);
    // symbool per type
    if (kind === 'rage') {        // zwaard/kruis
      this.px(ctx, '#fff', x - 1, cy - 3, 2, 7);
      this.px(ctx, '#fff', x - 3, cy - 1, 6, 2);
    } else if (kind === 'speed') { // bliksem
      this.px(ctx, '#fff', x, cy - 3, 2, 3);
      this.px(ctx, '#fff', x - 2, cy, 3, 2);
      this.px(ctx, '#fff', x - 1, cy + 1, 2, 3);
    } else {                       // schild
      this.px(ctx, '#fff', x - 3, cy - 3, 6, 4);
      this.px(ctx, '#fff', x - 2, cy + 1, 4, 2);
      this.px(ctx, '#fff', x - 1, cy + 3, 2, 1);
    }
  },

  /* ---------- CHECKPOINT-VLAG (kleiner, halverwege) ---------- */
  drawCheckpoint(ctx, x, groundY, time, reached) {
    const poleH = 40, top = groundY - poleH;
    this.px(ctx, '#2a313e', x - 3, groundY - 2, 8, 3);          // voet
    this.px(ctx, '#9aa3ad', x, top, 2, poleH);                   // paal
    // klein driehoekig vlaggetje (blauw -> groen als gehaald)
    const cloth = reached ? '#6abe30' : '#3a9ad9';
    const clothDk = reached ? '#4a8c1f' : '#2a72a8';
    const len = 16, tall = 11;
    for (let i = 0; i < len; i++) {
      const wave = Math.round(Math.sin(time / 150 + i / 3.5) * 1.5);
      const hh = Math.round(tall * (1 - i / len));
      if (hh <= 0) continue;
      this.px(ctx, (i % 6 < 3) ? cloth : clothDk, x + 2 + i, top + 2 + wave, 1, hh);
    }
    if (reached) this.px(ctx, '#fff', x + 4, top + 4, 3, 3);     // vinkje-achtig stipje
  },

  /* ---------- SCHADUW onder personage ---------- */
  shadow(ctx, cx, footY, w) {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, footY + 1, w, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  /* ---------- BAAS-PROJECTIEL (zuur) ---------- */
  drawEnemyShot(ctx, x, y, spin) {
    // gloed
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#8aff3a';
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // klodder
    this.px(ctx, '#6abe30', x - 4, y - 3, 8, 6);
    this.px(ctx, '#8aff3a', x - 3, y - 3, 5, 3);
    this.px(ctx, '#3f7a18', x - 4, y + 2, 8, 1);
    // spat-druppels (draaiend)
    const o = Math.round(Math.sin(spin) * 2);
    this.px(ctx, '#6abe30', x - 6, y + o, 2, 2);
    this.px(ctx, '#6abe30', x + 4, y - o, 2, 2);
  },

  /* ---------- ZWAKKE PLEK (baas-hoofd) ---------- */
  drawWeakpoint(ctx, cx, cy, halfW, time) {
    const pulse = (Math.sin(time / 220) + 1) / 2;
    const col = pulse > 0.5 ? '#ff4a3a' : '#ffd24a';
    const w = halfW + 5, h = 17, L = 4;
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    // hoek-haakjes rond de kop (richtkruis)
    this.px(ctx, col, cx - w, cy - h, L, 1); this.px(ctx, col, cx - w, cy - h, 1, L);
    this.px(ctx, col, cx + w - L, cy - h, L, 1); this.px(ctx, col, cx + w - 1, cy - h, 1, L);
    this.px(ctx, col, cx - w, cy + h - 1, L, 1); this.px(ctx, col, cx - w, cy + h - L, 1, L);
    this.px(ctx, col, cx + w - L, cy + h - 1, L, 1); this.px(ctx, col, cx + w - 1, cy + h - L, 1, L);
    // bobbende pijl erboven
    const oy = Math.round(Math.sin(time / 220) * 2);
    this.px(ctx, col, cx - 3, cy - h - 8 + oy, 6, 2);
    this.px(ctx, col, cx - 2, cy - h - 6 + oy, 4, 2);
    this.px(ctx, col, cx - 1, cy - h - 4 + oy, 2, 2);
    ctx.globalAlpha = 1;
  },

  /* ---------- RAKET (projectiel) ---------- */
  drawRocket(ctx, x, y, vx) {
    const d = vx >= 0 ? 1 : -1;
    this.px(ctx, '#ffd24a', x - d * 7, y - 1, 3, 2);   // vlam
    this.px(ctx, '#ff8a3a', x - d * 5, y - 2, 3, 4);
    this.px(ctx, '#4a5158', x - 4, y - 2, 8, 4);       // body
    this.px(ctx, '#6a737c', x - 4, y - 2, 8, 1);
    this.px(ctx, '#d94343', x + d * 4, y - 1, 2, 2);   // rode neus
    this.px(ctx, '#2a2e34', x - d * 4, y - 3, 2, 1);   // vinnen
    this.px(ctx, '#2a2e34', x - d * 4, y + 2, 2, 1);
  },

  /* ---------- RAKET-PICKUP ---------- */
  drawRocketPickup(ctx, x, y, bob) {
    const oy = Math.round(Math.sin(bob) * 1), top = y - 9 + oy;
    this.px(ctx, '#4a5158', x - 5, top + 3, 11, 4);
    this.px(ctx, '#6a737c', x - 5, top + 3, 11, 1);
    this.px(ctx, '#d94343', x + 5, top + 2, 3, 5);     // kop
    this.px(ctx, '#2a2e34', x - 6, top + 1, 2, 3);     // vin
    this.px(ctx, '#2a2e34', x - 6, top + 5, 2, 3);
    this.px(ctx, '#ffd24a', x - 7, top + 4, 1, 2);     // staartvlam
  },

  /* ---------- KOGEL ---------- */
  drawBullet(ctx, x, y) {
    this.px(ctx, '#ffd24a', x, y, 4, 2);
    this.px(ctx, '#ff8a3a', x, y, 1, 2);
  },

  /* ---------- MUNT (zwevend) ---------- */
  drawCoin(ctx, x, y, frame) {
    const w = [4, 3, 1, 3][frame % 4]; // draai-effect
    this.px(ctx, '#b8901e', x + (4 - w) / 2, y, w, 5);
    this.px(ctx, '#f2c94c', x + (4 - w) / 2, y, Math.max(1, w - 1), 4);
  },

  /* ---------- WAPEN ICOON (voor shop) ---------- */
  drawWeaponIcon(ctx, weaponId, scale) {
    ctx.save();
    ctx.scale(scale, scale);
    const cx = 26, y = 24;
    const w = WEAPONS[weaponId];
    if (w.type === 'melee') {
      const steel = '#cfd6df', steelDk = '#9aa3ad', wood = '#7a5230', woodDk = '#5a3a22', gold = '#caa84a';
      const L = cx - 14;
      if (weaponId === 'machete') {
        this.px(ctx, steel, cx - 12, y - 8, 20, 5); this.px(ctx, steelDk, cx - 12, y - 8, 20, 2); this.px(ctx, woodDk, cx + 6, y - 9, 6, 7);
      } else if (weaponId === 'sword') {
        this.px(ctx, woodDk, L, y - 2, 5, 4); this.px(ctx, gold, L + 5, y - 4, 2, 8);
        this.px(ctx, steel, L + 7, y - 3, 18, 5); this.px(ctx, steelDk, L + 7, y - 3, 18, 2);
      } else if (weaponId === 'dagger') {
        this.px(ctx, woodDk, L + 2, y - 2, 4, 4); this.px(ctx, gold, L + 6, y - 3, 2, 6);
        this.px(ctx, steel, L + 8, y - 2, 12, 4); this.px(ctx, steelDk, L + 8, y - 2, 12, 1);
      } else if (weaponId === 'club') {
        this.px(ctx, wood, L + 2, y - 2, 12, 5); this.px(ctx, wood, L + 12, y - 4, 10, 9); this.px(ctx, woodDk, L + 12, y - 4, 10, 2);
      } else if (weaponId === 'axe') {
        this.px(ctx, wood, L + 4, y - 6, 4, 16); this.px(ctx, woodDk, L + 4, y - 6, 2, 16);
        this.px(ctx, steel, L + 8, y - 7, 12, 9); this.px(ctx, steelDk, L + 8, y - 7, 12, 3);
      } else if (weaponId === 'spear') {
        this.px(ctx, wood, L - 4, y - 1, 30, 3); this.px(ctx, steel, L + 24, y - 3, 8, 7); this.px(ctx, steelDk, L + 24, y - 3, 8, 2);
      } else if (weaponId === 'mace') {
        this.px(ctx, wood, L, y - 1, 16, 4);
        this.px(ctx, '#6b7480', L + 13, y - 7, 12, 12); this.px(ctx, '#9aa3ad', L + 13, y - 7, 12, 4);
        this.px(ctx, '#4a4f57', L + 24, y - 1, 3, 3); this.px(ctx, '#4a4f57', L + 18, y - 9, 3, 3);
      } else if (weaponId === 'flail') {
        this.px(ctx, woodDk, L, y - 1, 12, 4); this.px(ctx, '#888f99', L + 12, y - 3, 6, 2);
        this.px(ctx, '#6b7480', L + 17, y - 6, 10, 10); this.px(ctx, '#9aa3ad', L + 17, y - 6, 10, 3);
      } else if (weaponId === 'bostaff') {
        this.px(ctx, wood, L - 2, y - 1, 30, 4); this.px(ctx, woodDk, L - 2, y + 1, 30, 1);
        this.px(ctx, woodDk, L - 2, y - 1, 2, 4); this.px(ctx, woodDk, L + 26, y - 1, 2, 4);
      } else if (weaponId === 'katana') {
        this.px(ctx, woodDk, L, y - 1, 5, 4); this.px(ctx, '#1a1a1a', L + 5, y - 3, 2, 8);
        this.px(ctx, steel, L + 7, y - 4, 19, 5); this.px(ctx, '#eef2f6', L + 7, y - 4, 19, 2);
      } else if (weaponId === 'halberd') {
        this.px(ctx, wood, L, y - 2, 26, 3); this.px(ctx, steel, L + 14, y - 9, 9, 9);
        this.px(ctx, steelDk, L + 14, y - 9, 9, 3); this.px(ctx, steel, L + 23, y - 11, 4, 6);
      } else if (weaponId === 'chainsaw') {
        this.px(ctx, '#c8402a', cx - 14, y - 6, 9, 11); this.px(ctx, '#e05a3a', cx - 14, y - 6, 9, 3);   // rode motor
        this.px(ctx, '#2a2a2e', cx - 8, y + 3, 5, 6);                                                    // greep
        this.px(ctx, '#9aa3ad', cx - 5, y - 4, 22, 5); this.px(ctx, '#cfd6df', cx - 5, y - 4, 22, 2);    // zaagbalk
        for (let i = 0; i < 22; i += 3) this.px(ctx, '#eef3f7', cx - 4 + i, y + 1, 2, 1);                 // tanden
      } else { // bat
        this.px(ctx, wood, cx - 12, y - 7, 16, 5); this.px(ctx, '#9a6a3a', cx - 12, y - 7, 16, 2); this.px(ctx, woodDk, cx + 2, y - 6, 6, 4);
      }
    } else {
      const body = '#3a3f46', dark = '#23262b', wood = '#6b4a2a';
      if (weaponId === 'pistol') {
        this.px(ctx, body, cx - 8, y - 6, 14, 5);
        this.px(ctx, dark, cx - 4, y - 1, 4, 7);
      } else if (weaponId === 'uzi') {
        this.px(ctx, body, cx - 12, y - 6, 20, 5);
        this.px(ctx, dark, cx - 4, y - 1, 4, 9);
        this.px(ctx, dark, cx + 6, y - 8, 3, 4);
      } else if (weaponId === 'ak47') {
        const S = (hex, f) => this._shade(hex, f);
        const P = (c, dx, dy, w2, h2) => this.px(ctx, c, cx + dx * 1.6, y + dy * 1.6, Math.ceil(w2 * 1.6), Math.ceil(h2 * 1.6));   // 1.6× vergroot, gecentreerd
        this._akShape(P, S);
      } else if (weaponId === 'deagle') {
        this.px(ctx, '#4a5058', cx - 12, y - 6, 22, 6); this.px(ctx, '#6a727c', cx - 12, y - 6, 22, 2);   // slede
        this.px(ctx, '#23262b', cx - 12, y - 6, 3, 3);                                                    // achterkant
        this.px(ctx, '#8a5e36', cx - 6, y, 4, 10); this.px(ctx, '#6b4426', cx - 6, y, 2, 10);            // houten greep
        this.px(ctx, '#caa84a', cx + 8, y - 4, 3, 2);                                                     // goud accent
      } else if (weaponId === 'crossbow') {
        this.px(ctx, '#4a3320', cx - 12, y - 10, 3, 22);                                                  // boog-arm
        this.px(ctx, '#888f99', cx - 10, y - 2, 20, 1); this.px(ctx, '#888f99', cx - 10, y + 1, 20, 1);   // pees
        this.px(ctx, '#7a5230', cx - 6, y - 1, 22, 4); this.px(ctx, '#9a6a34', cx - 6, y - 1, 22, 1);     // lade
        this.px(ctx, '#cfd6df', cx + 6, y - 1, 8, 2); this.px(ctx, '#ffffff', cx + 12, y - 1, 2, 1);      // pijl
      } else if (weaponId === 'rocket') {
        this.px(ctx, '#3a4750', cx - 16, y - 6, 26, 6);    // buis
        this.px(ctx, '#566872', cx - 16, y - 6, 26, 2);
        this.px(ctx, dark, cx - 6, y, 5, 8);               // handvat
        this.px(ctx, '#d94343', cx + 8, y - 7, 5, 8);      // raketkop steekt eruit
        this.px(ctx, '#ffd24a', cx - 18, y - 4, 3, 3);     // achteruitlaat
      }
    }
    ctx.restore();
  },
};
