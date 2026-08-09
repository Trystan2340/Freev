# FREEV Icon System V2.6 — Corrections de durcissement

- Validation stricte de `app`, `theme`, `mode`, `state`, `badge`, `animation`, `motion` et `variant`.
- Suppression du risque d’injection via `animation`.
- Une animation invalide revient à `none` sans calque fantôme.
- Un badge invalide revient à `none`.
- À 32 px et moins, les badges textuels deviennent des points compacts.
- Validation robuste de `FREEV_ICON_CACHE_MB`, `FREEV_ICON_MAX_RENDER_SIDE` et du DPR.
- `asset-base` invalide ou protocole non autorisé : événement `freev-icon-error` + fallback local.
- App inconnue : événement d’erreur cohérent sur toutes les variantes + fallback sûr.
- Import du Web Component compatible SSR/Node.
- Tests Chromium portables sans chemin `/usr/bin/chromium` obligatoire.
- Noms courts PWA nettoyés.
- Versions npm/Python/manifest synchronisées en 2.6.0.
