# Corrections de l’audit

1. **Transparent** : corrigé. Le fichier/moteur utilise désormais uniquement le symbole fonctionnel extrait des pixels originaux.
2. **Monochrome** : corrigé. Blanc/noir/brand sont produits depuis le même masque de symbole.
3. **Small** : corrigé. 16/24/32 n’utilisent plus une simple réduction du master ; ils utilisent le symbole exact dérivé sur un fond minimal.
4. **Styles runtime** : corrigé. Standard, Glass, Transparent, Monochrome White/Black/Brand et Small sont de vraies options du Web Component.
5. **Animations** : 8 animations distinctes, une par logiciel.
6. **Loading** : active automatiquement l’animation du logiciel.
7. **Thème site** : `theme=inherit` + surveillance de `data-freev-theme`.
8. **Chemins** : module-relative + `asset-base` + variable globale de secours.
9. **Performance** : cache des images source et cache LRU des rendus.
10. **Coins noirs** : copies runtime nettoyées par suppression uniquement du matte noir connecté aux bords.
11. **Plateformes** : Web favicon, PWA maskable, Android Adaptive, iOS, Windows ICO, macOS PNG/ICNS.
12. **Accessibilité** : aria-label, decorative, disabled/loading ARIA, reduced-motion et contraste renforcé.
