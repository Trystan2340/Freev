(() => {
  'use strict';

  const root = document.body.dataset.root || '../';
  const current = document.body.dataset.page || '';
  document.documentElement.dataset.freevTheme = 'cyan';

  const link = (page, href, label) => {
    const active = current === page ? ' aria-current="page"' : '';
    return `<a href="${root}${href}"${active}>${label}</a>`;
  };

  const header = document.querySelector('[data-site-header]');
  if (header) {
    header.className = 'site-header';
    header.innerHTML = `
      <div class="wrap nav-shell">
        <a class="brand" href="${root}index.html" aria-label="Accueil Freev">
          <span class="brand-mark" aria-hidden="true">F</span>
          <span>FREEV<b>.</b></span>
        </a>
        <nav class="desktop-nav" aria-label="Navigation principale">
          ${link('home', 'index.html', 'ACCUEIL')}
          ${link('logiciels', 'logiciels/', 'LOGICIELS')}
          ${link('jeux', 'jeux/', 'JEUX')}
          ${link('outils-ia', 'outils-ia/', 'OUTILS IA')}
          ${link('nova', 'nova.html', 'NOVA')}
        </nav>
        <a class="header-action" href="${root}profil.html">MON COMPTE</a>
        <button class="mobile-toggle" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="site-mobile-nav">
          <span aria-hidden="true">☰</span>
        </button>
      </div>
      <nav class="mobile-nav wrap" id="site-mobile-nav" aria-label="Navigation mobile">
        ${link('home', 'index.html', 'Accueil')}
        ${link('logiciels', 'logiciels/', 'Logiciels')}
        ${link('jeux', 'jeux/', 'Jeux')}
        ${link('outils-ia', 'outils-ia/', 'Outils IA')}
        ${link('nova', 'nova.html', 'Freev Nova')}
        <a href="${root}profil.html">Mon compte</a>
      </nav>`;

    const toggle = header.querySelector('.mobile-toggle');
    const mobileNav = header.querySelector('.mobile-nav');
    const closeMenu = () => {
      mobileNav?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      toggle?.setAttribute('aria-label', 'Ouvrir le menu');
    };
    toggle?.addEventListener('click', () => {
      const open = !mobileNav?.classList.contains('open');
      mobileNav?.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    mobileNav?.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 820) closeMenu();
    });
  }

  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="wrap footer-grid">
        <section class="footer-brand" aria-labelledby="footer-brand-title">
          <a class="brand" href="${root}index.html" id="footer-brand-title"><span class="brand-mark" aria-hidden="true">F</span><span>FREEV<b>.</b></span></a>
          <p>Un espace numérique indépendant : logiciels, jeux, intelligence artificielle et création.</p>
          <div class="socials" aria-label="Réseaux et communauté">
            <a class="social" href="https://github.com/Trystan2340" target="_blank" rel="noopener noreferrer" aria-label="GitHub de Trystan2340">GH</a>
            <span class="social" aria-disabled="true" title="Discord bientôt disponible">DC</span>
          </div>
        </section>
        <section class="footer-column">
          <h2>Plateforme</h2>
          <nav aria-label="Plateforme">
            <a href="${root}logiciels/">Logiciels</a>
            <a href="${root}jeux/">Jeux</a>
            <a href="${root}outils-ia/">Outils IA</a>
            <a href="${root}nova.html">Freev Nova</a>
          </nav>
        </section>
        <section class="footer-column">
          <h2>Compte</h2>
          <nav aria-label="Compte et services">
            <a href="${root}profil.html">Profil Freev ID</a>
            <a href="${root}index.html#contact">Aide</a>
            <a href="mailto:freevunited@gmail.com">Contact</a>
          </nav>
        </section>
        <section class="footer-column">
          <h2>Légal</h2>
          <nav aria-label="Informations légales">
            <a href="${root}legal/mentions-legales.html">Mentions légales</a>
            <a href="${root}legal/confidentialite.html">Confidentialité</a>
            <a href="${root}legal/conditions-utilisation.html">Conditions d’utilisation</a>
            <a href="${root}legal/cookies.html">Cookies</a>
            <a href="${root}legal/">Tous les documents</a>
          </nav>
        </section>
        <section class="footer-column">
          <h2>Contact</h2>
          <p>Une question, un projet ou un signalement&nbsp;?</p>
          <nav><a href="mailto:freevunited@gmail.com">freevunited@gmail.com</a></nav>
        </section>
      </div>
      <div class="footer-bottom"><div class="wrap">© <span data-current-year></span> Freev by Trystan2340. Tous droits réservés.</div></div>`;
    footer.querySelector('[data-current-year]').textContent = String(new Date().getFullYear());
  }
})();
