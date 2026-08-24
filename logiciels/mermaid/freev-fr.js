(() => {
  'use strict';

  const translations = new Map([
    ['Edit', 'Éditer'], ['View', 'Aperçu'], ['Code', 'Code'], ['Config', 'Configuration'],
    ['History', 'Historique'], ['Share', 'Partager'], ['Save diagram', 'Enregistrer le diagramme'],
    ['Actions', 'Actions'], ['PNG size', 'Taille PNG'], ['Auto', 'Auto'], ['Width', 'Largeur'],
    ['Height', 'Hauteur'], ['Copy Image', 'Copier l’image'], ['Copy Markdown', 'Copier le Markdown'],
    ['Enter Gist URL', 'Saisis l’URL du Gist'], ['Load Gist', 'Charger le Gist'],
    ['Syntax error', 'Erreur de syntaxe'], ['Light', 'Clair'], ['Dark', 'Sombre'],
    ['Controls', 'Contrôles'], ['Grid', 'Grille'], ['Preview', 'Aperçu'], ['Theme', 'Thème'],
    ['Look', 'Style'], ['Embed', 'Intégrer'], ['Shareable links', 'Liens de partage'],
    ['Share your diagrams with others.', 'Partage tes diagrammes avec d’autres personnes.'],
    ['The content of the diagrams you create never leaves your browser.', 'Le contenu de tes diagrammes ne quitte jamais ton navigateur.'],
    ['Embed a live, interactive diagram in your own website or blog.', 'Intègre un diagramme interactif dans ton site ou ton blog.'],
    ['Web component', 'Composant web'], ['Close', 'Fermer'], ['Return to Home', 'Retour à l’accueil']
  ]);

  const translate = () => {
    document.title = 'Freev Mermaid - Éditeur de diagrammes';
    for (const element of document.querySelectorAll('body *')) {
      if (element.children.length === 0) {
        const text = element.textContent?.trim();
        const translatedText = text && translations.get(text);
        if (translatedText && translatedText !== text) element.textContent = translatedText;
      }
      if (element instanceof HTMLInputElement && element.placeholder && translations.has(element.placeholder)) {
        element.placeholder = translations.get(element.placeholder);
      }
      const label = element.getAttribute('aria-label');
      if (label && translations.has(label)) element.setAttribute('aria-label', translations.get(label));
      const title = element.getAttribute('title');
      if (title && translations.has(title)) element.setAttribute('title', translations.get(title));
    }
  };

  const addReturnButton = () => {
    if (document.getElementById('freev-return-to-catalog')) return;
    const button = document.createElement('a');
    button.id = 'freev-return-to-catalog';
    button.href = '../';
    button.textContent = '← Retour à Freev';
    button.setAttribute('aria-label', 'Retour au catalogue Freev');
    Object.assign(button.style, {
      position: 'fixed', left: '16px', bottom: '16px', zIndex: '9999', padding: '10px 14px',
      borderRadius: '10px', background: '#171717', color: '#fff', font: '600 14px system-ui, sans-serif',
      textDecoration: 'none', border: '1px solid rgba(255,255,255,.24)', boxShadow: '0 8px 24px rgba(0,0,0,.28)'
    });
    button.addEventListener('mouseenter', () => { button.style.background = '#303030'; });
    button.addEventListener('mouseleave', () => { button.style.background = '#171717'; });
    document.body.append(button);
  };

  const refresh = () => { translate(); addReturnButton(); };
  new MutationObserver(refresh).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('DOMContentLoaded', refresh);
  refresh();
})();
