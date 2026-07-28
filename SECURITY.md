# Politique de sécurité

## Signaler une vulnérabilité

Utilisez un **GitHub Security Advisory privé** dans l’onglet Security du dépôt. N’ouvrez pas d’issue publique contenant une preuve d’exploitation, une clé, un jeton ou une donnée personnelle.

Indiquez si possible :

- la page et la fonction concernées ;
- les préconditions et étapes minimales de reproduction ;
- l’impact observé ;
- une proposition de correction, si vous en avez une.

## Principes du projet

- Firestore et Storage refusent tout accès non explicitement autorisé.
- Les photos importées sont privées, limitées à 2 Mio et aux formats PNG/JPEG/WebP.
- Les avatars procéduraux sont des données SVG générées par le code Freev ; aucun SVG utilisateur n’est accepté.
- Les secrets fournisseurs Nova ne doivent jamais apparaître dans le dépôt ni dans un profil public.
- XP, badges et récompenses restent non modifiables par le navigateur.
- Toute nouvelle intégration Firebase doit être testée dans Emulator Suite avant le déploiement des règles.
