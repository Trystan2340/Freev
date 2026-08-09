# FREEV Icon System V2.3 — Corrections de l’audit V2.2

1. **Animations** — masques en sous-calques réels : 3 groupes TaskFlow, 2 flèches Convert, 2 groupes PixelForge, lignes seules ResumeMaster, bouton Play seul, crayon seul, cadran DataVault. Les masques restent alignés sur le canvas 1024 original.
2. **Ghosting raster** — les éléments mobiles/reveal utilisent un masque de couverture avant le nouveau calque animé.
3. **Cache `asset-base`** — la clé LRU contient désormais l’URL finale du master.
4. **Erreur réseau** — une Promise d’image rejetée est retirée du cache pour permettre un retry.
5. **PWA** — chaque application possède maintenant un `manifest.webmanifest` complet en plus du snippet.
6. **Packaging** — package npm non privé, exports racine/React/Vue, types enrichis, build complet, métadonnées Python V2.3.
7. **Démo** — version corrigée en V2.3 Final.
8. **Tests visuels navigateur** — Chromium vérifie les masques réellement rendus, le changement de thème, les animations localisées et l’activation clavier.

9. **Attribut HTML** — l’option visuelle utilise désormais `variant`, pas l’attribut natif `style`, afin d’éviter les rerenders/collisions avec CSS. `icon-style` reste un alias de compatibilité.
10. **Layout Shadow DOM** — le wrapper `.w` est explicitement `display:block`, ce qui garantit le rendu des masques CSS sans canvas.
