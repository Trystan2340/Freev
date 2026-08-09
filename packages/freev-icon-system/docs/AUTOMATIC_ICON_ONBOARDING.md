# FREEV V2.7 — ajout automatique obligatoire des nouvelles icônes

Le registre `registry/apps.json` est désormais la **source de vérité unique**.

## Méthode la plus simple

1. Déposer `Mon_Nouveau_Jeu.png` dans `incoming/`.
2. Lancer normalement le build (`npm run build`).
3. Le build exécute d'abord le pipeline obligatoire.

Le pipeline crée automatiquement le master 1024, la version nettoyée, les masques, les variantes, les 9 thèmes Small, l'animation, Web/PWA, Android, iOS, Windows, macOS, le registre Web, TypeScript et la démo.

Une icône incomplète **bloque le build**. Un master copié manuellement sans inscription dans le registre **bloque aussi le build**.

## Ajout direct par commande

```bash
python tools/icon_pipeline.py add ./mon-icone.png --id Nova_Racer --label "Nova Racer" --kind game
```

Ou :

```bash
npm run icons:sync
npm run icons:watch
npm run icons:check
```

`icons:watch` surveille le dossier `incoming/` et traite les nouvelles images dès qu'elles apparaissent.

## Métadonnées facultatives

Créer un JSON du même nom que l'image :

```json
{
  "id": "Nova_Racer",
  "label": "Nova Racer",
  "kind": "game",
  "shortName": "Nova Racer",
  "animation": "pulse-play"
}
```

Sans JSON, le nom de fichier est transformé automatiquement en identifiant et en libellé.

## Garde-fous

- source carrée obligatoire ;
- 512×512 minimum ;
- identifiant unique ;
- détection automatique du symbole avec seuil de confiance ;
- si le symbole ne peut pas être extrait proprement, le traitement s'arrête ;
- possibilité de fournir `Nom.mask.png` pour imposer un masque propre ;
- validation de tous les fichiers de plateforme ;
- aucun ajout partiel n'est accepté.

Le principe est volontaire : **mieux vaut refuser une mauvaise icône que l'ajouter automatiquement avec un rendu dégradé.**

## Raccourcis inclus

- Windows : `START_ICON_WATCHER.bat` pour traiter immédiatement chaque nouvelle image déposée dans `incoming/`.
- Windows : `SYNC_NEW_ICONS.bat` pour lancer une synchronisation manuelle complète.
- macOS/Linux : `./start-icon-watcher.sh` et `./sync-new-icons.sh`.

Même si le watcher n'est pas lancé, **le build reste protégé** : `npm run build` exécute automatiquement la synchronisation et refuse de continuer si une icône n'a pas été entièrement générée.
