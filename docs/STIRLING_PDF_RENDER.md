# Stirling PDF sur Render

Le fichier `render.yaml` crée un service distinct nommé `freev-stirling-pdf`.

- Offre : Render Free.
- Région : Francfort.
- Image : Stirling PDF 2.14.3 Ultra-Lite, personnalisée avec le bouton
  « Retour à Freev ».
- Interface : français.
- Limite d’envoi : 25 Mo.
- Données persistantes : aucune.

## Mise en ligne

Dans le tableau de bord Render, créer un **Blueprint** depuis le dépôt Freev et choisir la branche qui contient ce fichier. Render créera alors le service `freev-stirling-pdf`.

Une fois le déploiement terminé, l’adresse attendue est :

`https://freev-stirling-pdf.onrender.com`

Vérifier l’adresse `/api/v1/info/status` : elle doit répondre `UP`.

## Limites du plan gratuit

Le service s’endort après une période d’inactivité. La première ouverture peut donc prendre environ une minute. Il n’y a pas de disque persistant : les documents sont traités temporairement, sans conservation prévue par Freev.

L'image Ultra-Lite fournit les opérations PDF essentielles. Les fonctions lourdes, comme l'OCR et certaines conversions Office, ne sont pas incluses pour rester utilisables sur l'offre gratuite.

Le démarrage lent après une longue période sans visite est une limite de
Render Free : le service est arrêté après 15 minutes sans activité et le
prochain accès le redémarre. Cette attente ne peut pas être supprimée tout en
restant sur l'offre gratuite.
