# Mise en production Firebase — Freev ID V2

Ce guide évite une migration irréversible. Les commandes doivent être lancées
depuis une session Firebase/Google Cloud autorisée pour le projet `freev-52df2`.
Aucun compte de service ne doit être ajouté au dépôt.

## 1. Sauvegarde et point de retour

1. Noter le SHA Git validé et créer une étiquette de version avant déploiement.
2. Copier `firestore.rules`, `storage.rules`, `firebase.json` et la valeur
   actuelle de la clé App Check dans le journal de version privé.
3. Si les exports Firestore sont activés, lancer un export géré vers un bucket
   privé prévu à cet effet et attendre sa réussite avant toute migration.
4. Ne jamais exporter `privateApiKeys` vers un emplacement public. Les documents
   ne contiennent que du ciphertext, mais restent des données privées.

## 2. Validation préalable

```powershell
npm ci
npm run verify
npm run test:rules
npm run test:browser
```

Tester ensuite avec deux vrais comptes : un profil historique et un nouveau
profil. Vérifier profil, avatar, thème, photo privée, publication volontaire,
sauvegarde/restauration cloud, Nova, export, déconnexion et reconnexion.

## 3. Migration des profils publics historiques

Un document `publicProfiles` qui contient encore `ownerUid` reste illisible aux
visiteurs. Le propriétaire le migre sans fuite en ouvrant son centre de compte
et en choisissant « Publier / actualiser » : l’écriture remplace entièrement la
projection par les champs publics autorisés. Ne pas rendre `ownerUid` lisible
temporairement pour faciliter la migration.

## 4. Ordre de déploiement

1. Déployer d’abord l’image privée Render compatible avec App Check mais avec
   `FREEV_REQUIRE_APP_CHECK=false`.
2. Déployer `firestore.rules` et `storage.rules`.
3. Déployer le site et laisser App Check en mode observation.
4. Contrôler les erreurs Render, les refus Firestore/Storage et les métriques
   App Check pendant une fenêtre réelle ordinateur/mobile.
5. Activer l’application web App Check et renseigner la clé publique dans les
   trois balises `freev-app-check-site-key`.
6. Après validation des jetons légitimes, passer Render à
   `FREEV_REQUIRE_APP_CHECK=true`, puis activer l’application des règles App
   Check produit par produit.

## 5. Retour arrière

1. Remettre temporairement `FREEV_REQUIRE_APP_CHECK=false` si les utilisateurs
   légitimes sont bloqués.
2. Redéployer l’image Render privée précédente par son digest, jamais par un tag
   mutable.
3. Restaurer les règles depuis le SHA Git validé précédent et les déployer.
4. Redéployer le site précédent puis purger uniquement le cache de l’URL Freev.
5. Restaurer un export Firestore uniquement si des données ont réellement été
   altérées ; une simple règle trop restrictive ne nécessite pas de restauration.

## 6. Critères d’arrêt

Stopper la mise en ligne si un test réel échoue, si `ownerUid` est publiquement
lisible, si une clé apparaît dans le navigateur ou les logs, si App Check refuse
des sessions légitimes, ou si le nouveau service worker ne termine pas son
installation atomique.
