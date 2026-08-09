# FREEV Auto-Icon Inbox

Dépose ici **une image carrée PNG/JPG/WebP de 512 px minimum**.

Exemple : `Nova_Racer.png`

Au prochain `npm run build`, `npm run icons:sync` ou `python tools/icon_pipeline.py sync --enforce`, FREEV la traite obligatoirement :

- master natif + master 1024 + nettoyage de transparence ;
- extraction automatique du symbole ;
- variantes transparentes / monochromes / glass / small ;
- 9 thèmes et tailles 16/24/32 ;
- animation interne ;
- Web / favicon / PWA maskable ;
- Android Adaptive + monochrome ;
- iOS/iPadOS + apparences Apple ;
- Windows ICO + macOS ICNS ;
- inscription dans le registre, le runtime Web, la démo et TypeScript ;
- validation finale. Un build est refusé si l'ajout reste incomplet.

## Métadonnées facultatives

Tu peux ajouter `Nova_Racer.json` à côté :

```json
{
  "id": "Nova_Racer",
  "label": "Nova Racer",
  "kind": "game",
  "shortName": "Nova Racer",
  "animation": "pulse-play"
}
```

Animations disponibles : `glow-code`, `pulse-play`, `flow-cards`, `draw-pencil`, `lock-vault`, `convert-swap`, `pixel-spark`, `resume-reveal`.

Si l'extraction automatique du symbole n'atteint pas le niveau de confiance requis, ajoute `Nova_Racer.mask.png` : image 1024×1024, transparence = forme du symbole. Le pipeline **échoue au lieu de publier une mauvaise icône**.
