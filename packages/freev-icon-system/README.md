# FREEV Icon System V2.6 Final

Version corrigée après le second audit complet. Les 8 masters originaux restent inchangés.

## Corrections majeures
- masques navigateur RGBA/alpha réellement fonctionnels ;
- TaskFlow nettoyé et DataVault simplifié aux petites tailles ;
- animations localisées sur le symbole/élément interne, jamais sur l'icône complète ;
- Android Studio-ready (`res/`, Adaptive Icons API 26+, Monochrome API 33+) ;
- iOS Any/Dark/Tinted + sources Icon Composer ;
- cache borné en mémoire et résolution Canvas plafonnée ;
- CORS + événement d'erreur ;
- mode interactif clavier/focus ;
- packaging développeur et tests.

## Web
```html
<script type="module" src="web/freev-icon.js"></script>
<freev-icon app="DataVault" theme="inherit" variant="glass" badge="update" animation="auto" size="128" interactive></freev-icon>
```

`theme="inherit"` suit `document.documentElement.dataset.freevTheme`.

## Runtime tuning
- `FREEV_ICON_CACHE_MB` : plafond LRU, 48 Mo par défaut.
- `FREEV_ICON_MAX_RENDER_SIDE` : côté max du canvas, 1024 px par défaut.
- `FREEV_ICON_ASSET_BASE` : base URL globale optionnelle pour les assets.

## Tests
```bash
python tests/run_all.py
node --check web/freev-icon.js
```

## Android
Copier `platform/android/<App>/res/` vers `app/src/main/res/`.

## Apple
- `platform/ios/` : exports historiques multi-tailles.
- `platform/ios-modern/` : Any, Dark, Tinted et sources pour Icon Composer.


## V2.6 — qualité finale
Le pack inclut désormais des tests visuels Chromium automatisés (`python tests/browser_visual_regression.py`) et un audit final (`python tests/final_audit.py`). Les animations utilisent des sous-calques internes, sans déplacer l’icône complète.

## Corrections V2.6

- taille invalide -> fallback sûr à 128 px ;
- icône disabled : activation souris/clavier bloquée ;
- `motion="off"` et `prefers-reduced-motion` rendent exactement l’icône statique ;
- wrappers React/Vue distribués avec chemins corrects et types dédiés ;
- export statique `loading` refusé au profit de `export_animation.py` ;
- six sources Apple Icon Composer : Default, Dark, Clear Light/Dark, Tinted Light/Dark.

## V2.7 — ajout obligatoire des nouveaux jeux et logiciels

À partir de V2.7, il n'est plus nécessaire de fabriquer manuellement toutes les variantes d'une nouvelle icône. Dépose simplement l'image dans `incoming/` puis lance le build : le pipeline FREEV l'enregistre et génère obligatoirement tout le pack multi-plateformes. Si une étape échoue ou si un master est ajouté sans passer par le registre, le build est bloqué.

Commandes : `npm run icons:sync`, `npm run icons:watch`, `npm run icons:check`.

Voir `docs/AUTOMATIC_ICON_ONBOARDING.md`.
