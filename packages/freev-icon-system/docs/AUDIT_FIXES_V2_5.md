# FREEV Icon System V2.5 — Corrections issues de l'audit V2.4

## Corrigé

- `freev-activate` est désormais émis **exactement une fois** pour un clic pointeur sur une icône `interactive`.
- Entrée et Espace utilisent le même chemin d'activation que le pointeur : aucun double événement custom.
- Une icône `state="disabled"` bloque toujours clic, clavier et `freev-activate`.
- Une icône non interactive conserve son événement `click` natif mais n'émet pas `freev-activate`.
- La taille publique maximale est ramenée de 4096 px à **2048 px** ; les valeurs non numériques continuent de retomber à 128 px.
- L'exporteur Python applique la même borne 12–2048 px.
- Ajout d'un test Chromium dédié couvrant : clic, Entrée, Espace, non-interactif, disabled et borne 2048.
- Suppression des `__pycache__` / `.pyc` du build distribuable.
- Numéro de version, démo, build, changelog et audit mis à jour en V2.5.

## Validation

Les suites suivantes passent :
- tests statiques du pack ;
- edge cases V2.4 ;
- interaction V2.5 ;
- régression visuelle Chromium ;
- `node --check` ;
- build ;
- `npm pack --dry-run` ;
- audit final V2.5.
