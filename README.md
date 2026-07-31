# Freev

Freev est un hub web réunissant logiciels, jeux et assistants IA. Cette version ajoute **Freev ID V2** : une identité visuelle originale, un studio d’ambiance avancé, un socle PWA hors ligne et des règles Firebase renforcées.

## Freev ID V2

- Avatars SVG procéduraux dessinés spécifiquement pour Freev.
- Résultat reproductible grâce à une graine et une `styleVersion`.
- Six familles de composants interchangeables et palettes personnalisables.
- Aucun pack graphique ni style d’avatar tiers incorporé.
- Migration transparente des profils historiques `avatarColor` / `bannerTheme`.
- Studio d’ambiance avec intensité, vitesse, densité et mouvement réduit.
- Configuration compacte enregistrable dans Firestore, sans fichier image.

## Développement

Prérequis : Node.js 20 ou plus récent.

```bash
npm ci
npm test
npm run test:rules
npx playwright install chromium
npm run test:browser
npm run verify
npm run serve
```

Le serveur local écoute par défaut sur `http://127.0.0.1:4173`. La suite repose sur `node:test` et ne nécessite aucun framework de test externe.

## Structure

```text
js/freev-id/              moteur avatar, thèmes, profils et versions cloud
css/freev-id-v2.css       interface responsive et préférences de mouvement
tests/                    tests existants et contrats Freev ID V2
tools/                    serveur local et vérification statique
sw.js / offline.html      application installable et mode hors ligne
firestore.rules           données privées, profils publics et progression
storage.rules             imports d’avatars raster privés et limités
```

## Déploiement Firebase

Le dépôt contient les règles, mais leur activation reste une action volontaire dans la console/projet Firebase :

```bash
firebase deploy --only firestore:rules,storage
```

Avant une mise en production complète :

1. exécuter `npm run test:rules` pour Firestore et Storage dans Firebase Emulator Suite ;
2. créer une clé de site reCAPTCHA Enterprise limitée aux domaines publics de Freev ;
3. enregistrer l’application Web dans App Check et initialiser App Check avant Auth, Firestore et Storage ;
4. déployer d’abord le client avec App Check, puis observer les métriques avant d’appliquer le blocage strict ;
5. activer les fournisseurs de connexion voulus dans Firebase Authentication ;
6. garder les badges/XP en écriture serveur uniquement ;
7. publier un profil dans `publicProfiles` seulement après consentement explicite.

Un jeton App Check de débogage peut servir aux tests locaux, mais il doit rester dans le stockage sécurisé de la CI ou du navigateur. Il ne doit jamais être ajouté au dépôt public.

Les clés de configuration Firebase visibles côté navigateur identifient le projet mais ne remplacent jamais les règles de sécurité, App Check et les restrictions de domaine.

## Compatibilité

La page existante reste la source principale. Les nouvelles fonctions sont ajoutées progressivement et conservent les champs historiques, afin qu’un profil actuel puisse être ouvert et sauvegardé sans migration manuelle.

## Sécurité

Merci d’utiliser les [GitHub Security Advisories](../../security/advisories/new) pour signaler une vulnérabilité. Ne publiez pas de secret, clé API privée ni donnée personnelle dans une issue publique.
