/* Couche de traduction française pour l'interface statique d'OpenCut. */
(() => {
  "use strict";
  if (!location.pathname.toLowerCase().includes("/logiciels/opencut")) return;

  const messages = {
    "Media": "Médias", "Sounds": "Sons", "Text": "Texte", "Stickers": "Autocollants",
    "Effects": "Effets", "Transitions": "Transitions", "Captions": "Sous-titres", "Adjustment": "Ajustements", "Settings": "Réglages",
    "Assets": "Ressources", "Scenes": "Scènes", "Scene": "Scène", "Main scene": "Scène principale", "Video": "Vidéo", "Audio": "Audio", "Image": "Image",
    "Unknown": "Inconnu", "Name": "Nom", "Type": "Type", "Duration": "Durée", "File size": "Taille du fichier", "Created": "Créé le", "Modified": "Modifié le", "Project ID": "ID du projet",
    "Project thumbnail": "Miniature du projet", "Project not found": "Projet introuvable", "Projects not found": "Projets introuvables", "No active project": "Aucun projet actif", "No Scene": "Aucune scène",
    "Please try again": "Veuillez réessayer", "Some projects could not be found": "Certains projets sont introuvables", "Cancel": "Annuler", "Close": "Fermer", "Save": "Enregistrer", "Delete": "Supprimer",
    "Duplicate": "Dupliquer", "Rename": "Renommer", "Select": "Sélectionner", "Select all": "Tout sélectionner", "Deselect all": "Tout désélectionner", "Confirm": "Confirmer", "Continue": "Continuer", "Back": "Retour", "Next": "Suivant", "Done": "Terminé", "Open": "Ouvrir",
    "Search...": "Rechercher…", "Enter a new name": "Saisissez un nouveau nom", "Add a note...": "Ajouter une note…", "Import": "Importer", "Import media": "Importer des médias", "Add media": "Ajouter des médias", "Export": "Exporter", "Light": "Clair", "Dark": "Sombre", "Fit": "Ajuster", "Send feedback": "Envoyer un retour", "It's empty here": "C’est vide ici", "Click an element on the timeline to edit its properties": "Cliquez sur un élément de la timeline pour modifier ses propriétés",
    "Drag and drop videos, photos, and audio files here": "Glissez-déposez des vidéos, photos et fichiers audio ici", "Add to timeline or drag to position": "Ajouter à la timeline ou glisser pour positionner",
    "Switch to list view": "Passer à la vue en liste", "Switch to grid view": "Passer à la vue en grille", "No stickers available yet.": "Aucun autocollant disponible pour le moment.", "Sticker categories": "Catégories d’autocollants", "Add sticker": "Ajouter un autocollant", "Failed to add sticker to timeline": "Impossible d’ajouter l’autocollant à la timeline",
    "Export project": "Exporter le projet", "Exporting project": "Exportation du projet", "Export video": "Exporter la vidéo", "Exporting video": "Exportation de la vidéo", "Unknown error occurred": "Une erreur inconnue s’est produite",
    "Welcome to OpenCut Beta! 🎉": "Bienvenue dans OpenCut Beta ! 🎉", "OpenCut Onboarding": "Présentation d’OpenCut", "You're among the first to try OpenCut - the fully open source CapCut alternative.": "Vous faites partie des premiers à essayer OpenCut, l’alternative entièrement open source à CapCut.",
    "There's still a ton of things to do to make this editor amazing.": "Il reste encore beaucoup à faire pour rendre cet éditeur encore meilleur.", "A lot of features are still missing. We're working hard to build them out!": "De nombreuses fonctions manquent encore. Nous travaillons activement à les ajouter !", "If you're curious, check out our roadmap [here](https://opencut.app/roadmap)": "Si vous êtes curieux, consultez notre feuille de route [ici](https://opencut.app/roadmap)",
    "Press any key combination...": "Appuyez sur une combinaison de touches…", "Click to edit shortcut": "Cliquez pour modifier le raccourci", "Keyboard shortcuts": "Raccourcis clavier", "Timeline": "Timeline", "Timeline ruler": "Règle de la timeline", "Timeline playhead": "Tête de lecture de la timeline", "Drag playhead": "Déplacer la tête de lecture", "Select keyframe": "Sélectionner l’image-clé", "Expand keyframes": "Développer les images-clés", "Collapse keyframes": "Réduire les images-clés", "Edit graph": "Modifier le graphique", "Open graph editor": "Ouvrir l’éditeur de graphique",
    "Split element": "Scinder l’élément", "Split left": "Scinder à gauche", "Split right": "Scinder à droite", "Duplicate element": "Dupliquer l’élément", "Delete element": "Supprimer l’élément", "Freeze frame (coming soon)": "Figer l’image (bientôt disponible)", "Extract audio": "Extraire l’audio", "Add bookmark": "Ajouter un repère", "Remove bookmark": "Supprimer le repère", "Auto snapping": "Alignement automatique", "Ripple editing": "Montage à propagation", "Mute": "Couper le son", "Unmute": "Activer le son", "Show": "Afficher", "Hide": "Masquer",
    "Transform": "Transformation", "Blending": "Fusion", "Speed": "Vitesse", "Masks": "Masques", "Graphic": "Graphique", "Scale": "Échelle", "Width": "Largeur", "Height": "Hauteur", "Position": "Position", "Rotation": "Rotation", "Opacity": "Opacité", "Volume": "Volume", "Color": "Couleur", "Font": "Police", "Size": "Taille", "Letter spacing": "Espacement des lettres", "Line height": "Hauteur de ligne", "Corner radius": "Rayon des coins", "Feather": "Contour progressif", "Stroke": "Contour", "Add mask": "Ajouter un masque", "Background": "Arrière-plan", "Colors": "Couleurs", "Value": "Valeur", "Curve": "Courbe", "Smooth": "Lisse", "Ease out": "Ralenti final", "Ease in": "Ralenti initial", "In out": "Entrée-sortie", "Linear": "Linéaire",
    "Select scenes to delete": "Sélectionnez les scènes à supprimer", "Switch between scenes in your project": "Passez d’une scène à l’autre dans votre projet", "Updating project": "Mise à jour du projet", "Updating projects": "Mise à jour des projets", "Type \"DELETE\" to confirm": "Saisissez « SUPPRIMER » pour confirmer", "DELETE": "SUPPRIMER",
    "Failed to save new project": "Impossible d’enregistrer le nouveau projet", "Failed to save project": "Impossible d’enregistrer le projet", "Failed to load project": "Impossible de charger le projet", "Failed to rename project": "Impossible de renommer le projet", "Failed to delete project": "Impossible de supprimer le projet", "Failed to duplicate projects": "Impossible de dupliquer les projets", "Failed to load saved sounds": "Impossible de charger les sons enregistrés", "Failed to save sound": "Impossible d’enregistrer le son", "Failed to remove sound": "Impossible de supprimer le son", "Failed to clear saved sounds": "Impossible d’effacer les sons enregistrés", "Sound file not available": "Fichier audio indisponible", "Failed to add sound to timeline": "Impossible d’ajouter le son à la timeline", "Transcribing...": "Transcription…", "Extracting audio...": "Extraction de l’audio…", "Preparing audio...": "Préparation de l’audio…"
  };
  const attributes = ["aria-label", "title", "placeholder", "alt"];
  const translate = (value) => {
    if (!value || typeof value !== "string") return value;
    const trimmed = value.trim();
    const localized = messages[trimmed] || trimmed
      .replace(/^Delete (\d+) items$/, "Supprimer $1 éléments")
      .replace(/^Select scenes \((\d+)\)$/, "Sélectionner les scènes ($1)")
      .replace(/^(Left|Right) resize handle$/, (_, side) => `${side === "Left" ? "Poignée gauche" : "Poignée droite"} de redimensionnement`);
    return localized === trimmed ? value : value.replace(trimmed, localized);
  };
  const localize = (element) => {
    if (!(element instanceof Element) || element.closest("script,style,code,pre")) return;
    for (const name of attributes) if (element.hasAttribute(name)) {
      const value = element.getAttribute(name), localized = translate(value);
      if (localized !== value) element.setAttribute(name, localized);
    }
    for (const node of element.childNodes) if (node.nodeType === Node.TEXT_NODE) {
      const localized = translate(node.nodeValue);
      if (localized !== node.nodeValue) node.nodeValue = localized;
    }
  };
  const localizeTree = (root) => {
    if (root instanceof Element) localize(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) localize(walker.currentNode);
  };
  const start = () => {
    const returnScript = document.createElement("script");
    returnScript.src = "../freev-return.js";
    returnScript.defer = true;
    document.head.append(returnScript);
    document.documentElement.lang = "fr";
    localizeTree(document.body);
    new MutationObserver((records) => records.forEach((record) => {
      if (record.type === "characterData") {
        const localized = translate(record.target.nodeValue);
        if (localized !== record.target.nodeValue) record.target.nodeValue = localized;
      }
      record.addedNodes.forEach(localizeTree);
      if (record.type === "attributes") localize(record.target);
    })).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: attributes });
  };
  document.body ? start() : document.addEventListener("DOMContentLoaded", start, { once: true });
})();
