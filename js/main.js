/* ============================================================
   MAIN — start alles op.
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  // ---- native app (Capacitor / iOS-schil) herkennen ----
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (isNative) {
    document.body.classList.add('native');                 // CSS verbergt o.a. de web-only "Update"-knop
    const P = window.Capacitor.Plugins || {};
    try { P.StatusBar && P.StatusBar.hide(); } catch (e) {}   // volledig scherm voor de game
    try { P.SplashScreen && P.SplashScreen.hide(); } catch (e) {}
  }

  Storage.load();
  // eenmalig voortgang herstellen via een ?restore=... link (ook handig op iOS)
  try { if (Storage.applyRestoreFromURL()) setTimeout(() => alert('✅ Voortgang hersteld!'), 300); } catch (e) {}
  try { Net.init(); } catch (e) { console.warn('Net.init', e); }
  try { if (window.IAP) IAP.init(); } catch (e) {}   // in-app aankopen (inert tot een plugin gekoppeld is)
  try { Sfx.init(); } catch (e) {}

  Input.init();
  UI.init();
  Game.init(document.getElementById('game-canvas'));
  UI.show('menu');

  // eerste keer opstarten: coach Ryan legt een oefen-match uit, daarna inloggen/registreren
  try {
    if (!localStorage.getItem('zombiedash_onboarded')) {
      setTimeout(() => { try { UI.startOnboarding(); } catch (e) { console.warn('onboarding', e); } }, 500);
    }
  } catch (e) {}

  // oriëntatie bijhouden (voor de draai-hint) + canvas herschalen
  function updateOrientation() {
    const portrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle('portrait', portrait);
    Game.resize();
  }
  updateOrientation();
  window.addEventListener('resize', updateOrientation);
  window.addEventListener('orientationchange', () => setTimeout(updateOrientation, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', updateOrientation);

  // pinch-zoom blokkeren (dubbeltik-zoom wordt al door touch-action:none voorkomen)
  document.addEventListener('gesturestart', (e) => e.preventDefault());
});
