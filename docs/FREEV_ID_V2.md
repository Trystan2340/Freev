# Freev ID V2 — architecture et déploiement

## Objectif

Freev ID devient une identité commune aux logiciels, jeux et expériences IA. La configuration reste portable, versionnée et indépendante d’un fournisseur d’avatars.

## Modèle de profil

```json
{
  "schemaVersion": 2,
  "nickname": "Freev_User",
  "avatarColor": "#22d3ee",
  "bannerTheme": "aurora",
  "avatar": {
    "seed": "freev-user",
    "styleVersion": 1,
    "parts": {
      "face": "orb",
      "eyes": "visor",
      "mouth": "signal",
      "hair": "halo",
      "outfit": "nova",
      "backdrop": "portal"
    },
    "palette": {
      "primary": "#22d3ee",
      "secondary": "#a855f7",
      "accent": "#f472b6",
      "skin": "#fed7aa"
    }
  },
  "theme": {
    "preset": "aurora",
    "intensity": 68,
    "speed": 50,
    "particles": 24,
    "reduceMotion": false
  }
}
```

`avatarColor` et `bannerTheme` sont maintenus pendant la transition. Les nouvelles interfaces lisent les objets structurés ; les anciennes continuent à lire les deux champs historiques.

## Originalité des avatars

Le moteur assemble uniquement des primitives SVG créées dans `avatar-generator.js`. Chaque composant possède un identifiant Freev et chaque profil sauvegarde les composants résolus, pas seulement une graine. Une modification future de l’algorithme ne change donc pas silencieusement les avatars existants.

Règles de contribution :

- ne jamais copier un composant provenant d’un pack d’avatars ;
- documenter l’auteur et la date lors de l’ajout d’une nouvelle famille ;
- incrémenter `AVATAR_STYLE_VERSION` lors d’une rupture visuelle ;
- conserver le rendu des anciennes versions ou proposer une migration explicite ;
- ne pas accepter de SVG importé par l’utilisateur.

## Données publiques et privées

Le document `users/{uid}` reste privé. La collection `publicProfiles/{nicknameLower}` est une projection volontaire ne contenant que surnom, nom affiché, bio, avatar et thème. L’email, l’UID privé, les souvenirs Nova et les réglages de sécurité n’y sont jamais copiés.

## Sauvegardes cloud

`cloud-saves.js` fournit le format v3 :

- sérialisation stable et empreinte ;
- identifiant déterministe par page/date/contenu ;
- conservation de la version perdante lors d’un conflit ;
- historique dédupliqué, trié et plafonné.

Le raccordement progressif des applications doit conserver une sauvegarde principale dans `users/{uid}/saves/{pageId}` et les instantanés dans `history/{versionId}`.

## Déploiement progressif

1. Fusionner l’interface et vérifier les profils historiques.
2. Déployer les règles Firestore et Storage.
3. Activer App Check et surveiller les refus.
4. Raccorder chaque logiciel/jeu au format de sauvegarde v3.
5. Ajouter ensuite une fonction serveur pour XP, badges et suppression complète de compte.

Les étapes Console Firebase ne sont pas automatisées depuis le dépôt : elles exigent les droits du projet et une validation humaine.
