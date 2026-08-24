(() => {
  'use strict';

  const translations = new Map([
    ['Download CyberChef', 'Télécharger CyberChef'],
    ['Options', 'Options'],
    ['About / Support', 'À propos / Aide'],
    ['Operations', 'Opérations'],
    ['Recipe', 'Recette'],
    ['Input', 'Entrée'],
    ['Output', 'Sortie'],
    ['Search...', 'Rechercher…'],
    ['Step', 'Exécuter une étape'],
    ['Bake!', 'Exécuter'],
    ['Auto Bake', 'Exécution automatique'],
    ['Save recipe', 'Enregistrer la recette'],
    ['Load recipe', 'Charger une recette'],
    ['Clear recipe', 'Effacer la recette'],
    ['Open file as input', 'Ouvrir un fichier'],
    ['Open folder as input', 'Ouvrir un dossier'],
    ['Clear input and output', 'Effacer l’entrée et la sortie'],
    ['Reset pane layout', 'Réinitialiser la disposition'],
    ['Edit Favourites', 'Modifier les favoris'],
    ['Save output to file', 'Enregistrer la sortie'],
    ['Close', 'Fermer'],
    ['Cancel', 'Annuler'],
    ['Save', 'Enregistrer'],
    ['Loading', 'Chargement'],
  ]);

  function translateText(node) {
    const value = node.nodeValue;
    const trimmed = value.trim();
    const translated = translations.get(trimmed);
    if (!translated) return;
    node.nodeValue = value.replace(trimmed, translated);
  }

  function translate(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateText(node);
    document.title = 'Freev CyberChef';
    document.documentElement.lang = 'fr';
    const search = document.getElementById('search');
    if (search) search.placeholder = 'Rechercher…';
  }

  function addReturnButton() {
    if (document.getElementById('freev-return-to-catalog')) return;
    const style = document.createElement('style');
    style.textContent = `
      #freev-return-to-catalog {
        position: fixed; z-index: 2147483647; left: 16px; bottom: 16px;
        display: inline-flex; align-items: center; gap: 8px; min-height: 42px;
        padding: 0 14px; border: 1px solid rgba(103,232,249,.55);
        border-radius: 999px; background: rgba(5,15,30,.92); color: #ecfeff;
        box-shadow: 0 10px 28px rgba(0,0,0,.32);
        font: 600 14px/1.1 system-ui,-apple-system,"Segoe UI",sans-serif;
        text-decoration: none; letter-spacing: .01em;
      }
      #freev-return-to-catalog:hover, #freev-return-to-catalog:focus-visible {
        border-color: #67e8f9; background: #083344; color: #fff; outline: none;
      }
      @media (max-width: 640px) { #freev-return-to-catalog { left: 10px; bottom: 10px; } }
    `;
    const link = document.createElement('a');
    link.id = 'freev-return-to-catalog';
    link.href = '../';
    link.setAttribute('aria-label', 'Retourner au catalogue des logiciels Freev');
    link.innerHTML = '<span aria-hidden="true">←</span><span>Retour à Freev</span>';
    document.head.append(style);
    document.body.append(link);
  }

  const observer = new MutationObserver(() => translate());
  document.addEventListener('DOMContentLoaded', () => {
    translate();
    addReturnButton();
    observer.observe(document.body, { childList: true, subtree: true });
  }, { once: true });
})();
