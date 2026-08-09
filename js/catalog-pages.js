(() => {
  'use strict';

  const page = document.body.dataset.page;
  if (!['logiciels', 'jeux'].includes(page)) return;

  const state = { data: null, filter: 'all', query: '', featureIndex: 0, board: 'week', timer: null };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const byId = (id) => document.getElementById(id);

  function normalized(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function createButtonLink(href, label, primary = false) {
    const link = document.createElement('a');
    link.className = `button${primary ? ' primary' : ''}`;
    link.href = href;
    link.textContent = label;
    return link;
  }

  function softwareCard(item, index) {
    const card = document.createElement('article');
    card.className = 'catalog-card reveal';
    card.style.setProperty('--accent', ['#22d3ee', '#a855f7', '#34d399', '#ec4899'][index % 4]);
    card.style.animationDelay = `${Math.min(index, 8) * 55}ms`;

    const top = document.createElement('div');
    top.className = 'software-top';
    const icon = document.createElement('freev-icon');
    icon.setAttribute('app', item.iconId);
    icon.setAttribute('variant', 'glass');
    icon.setAttribute('animation', 'auto');
    icon.setAttribute('size', '72');
    icon.setAttribute('label', `Icône ${item.title}`);
    const copy = document.createElement('div');
    const category = document.createElement('span');
    category.className = 'tag';
    category.textContent = item.categoryLabel;
    const title = document.createElement('h3');
    title.textContent = item.title;
    const description = document.createElement('p');
    description.textContent = item.description;
    copy.append(category, title, description);
    top.append(icon, copy);

    const tags = document.createElement('div');
    tags.className = 'tag-row';
    item.tags.forEach((value) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = value;
      tags.appendChild(tag);
    });

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const technology = document.createElement('span');
    technology.textContent = item.technology;
    const version = document.createElement('span');
    version.textContent = item.version;
    meta.append(technology, version);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.appendChild(createButtonLink(item.launchTarget, 'Ouvrir', true));
    card.append(top, tags, meta, actions);
    return card;
  }

  function renderSoftware() {
    const grid = byId('software-grid');
    if (!grid || !state.data) return;
    const query = normalized(state.query);
    const items = state.data.softwares.filter((item) => {
      const categoryMatches = state.filter === 'all' || item.category === state.filter;
      const haystack = normalized([item.title, item.description, item.categoryLabel, item.technology, ...item.tags].join(' '));
      return categoryMatches && (!query || haystack.includes(query));
    });
    grid.replaceChildren(...items.map(softwareCard));
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Aucun logiciel ne correspond à cette recherche.';
      grid.appendChild(empty);
    }
    byId('catalog-count').textContent = `${items.length} logiciel${items.length > 1 ? 's' : ''}`;
  }

  function renderFeatured() {
    const featured = state.data.games.filter((game) => game.featured);
    const host = byId('featured-game');
    if (!host || !featured.length) return;
    state.featureIndex = (state.featureIndex + featured.length) % featured.length;
    const game = featured[state.featureIndex];
    host.replaceChildren();
    const image = document.createElement('img');
    image.src = game.cover;
    image.alt = '';
    image.width = 900;
    image.height = 900;
    const dots = document.createElement('div');
    dots.className = 'feature-dots';
    dots.setAttribute('aria-label', 'Choisir le jeu mis en avant');
    featured.forEach((entry, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `feature-dot${index === state.featureIndex ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Afficher ${entry.title}`);
      dot.setAttribute('aria-pressed', String(index === state.featureIndex));
      dot.addEventListener('click', () => {
        state.featureIndex = index;
        renderFeatured();
        restartRotation();
      });
      dots.appendChild(dot);
    });
    const copy = document.createElement('div');
    copy.className = 'featured-copy';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = game.subtitle;
    const title = document.createElement('h2');
    title.textContent = game.title;
    const description = document.createElement('p');
    description.textContent = game.description;
    copy.append(eyebrow, title, description, createButtonLink(game.launchTarget, 'Jouer maintenant', true));
    host.append(image, dots, copy);
  }

  function restartRotation() {
    clearInterval(state.timer);
    state.timer = null;
    if (reduceMotion.matches || document.hidden) return;
    state.timer = window.setInterval(() => {
      state.featureIndex += 1;
      renderFeatured();
    }, 7000);
  }

  function gameCard(game, index) {
    const card = document.createElement('article');
    card.className = 'game-card reveal';
    card.style.animationDelay = `${Math.min(index, 8) * 55}ms`;
    const image = document.createElement('img');
    image.src = game.cover;
    image.alt = `Illustration du jeu ${game.title}`;
    image.loading = 'lazy';
    image.width = 600;
    image.height = 600;
    const body = document.createElement('div');
    body.className = 'game-body';
    const title = document.createElement('h3');
    title.textContent = game.title;
    const description = document.createElement('p');
    description.textContent = game.description;
    body.append(title, description, createButtonLink(game.launchTarget, 'Lancer le jeu', true));
    card.append(image, body);
    return card;
  }

  function renderGames() {
    const grid = byId('game-grid');
    if (!grid || !state.data) return;
    const query = normalized(state.query);
    const games = state.data.games.filter((game) => !query || normalized([game.title, game.subtitle, game.description].join(' ')).includes(query));
    grid.replaceChildren(...games.map(gameCard));
    if (!games.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Aucun jeu ne correspond à cette recherche.';
      grid.appendChild(empty);
    }
    byId('catalog-count').textContent = `${games.length} jeu${games.length > 1 ? 'x' : ''}`;
  }

  function renderBoard() {
    const list = byId('board-list');
    const rows = state.data?.leaderboards?.[state.board] || [];
    if (!list) return;
    list.replaceChildren(...rows.map(([name, score], index) => {
      const row = document.createElement('div');
      row.className = 'board-row';
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = String(index + 1);
      const player = document.createElement('span');
      player.textContent = name;
      const points = document.createElement('strong');
      points.textContent = score;
      row.append(rank, player, points);
      return row;
    }));
  }

  async function init() {
    try {
      const response = await fetch('../data/catalog.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.data = await response.json();
      if (page === 'logiciels') {
        renderSoftware();
        document.querySelectorAll('[data-filter]').forEach((button) => {
          button.addEventListener('click', () => {
            state.filter = button.dataset.filter || 'all';
            document.querySelectorAll('[data-filter]').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
            renderSoftware();
          });
        });
      } else {
        renderFeatured();
        renderGames();
        renderBoard();
        restartRotation();
        document.querySelectorAll('[data-board]').forEach((button) => {
          button.addEventListener('click', () => {
            state.board = button.dataset.board || 'week';
            document.querySelectorAll('[data-board]').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
            renderBoard();
          });
        });
        byId('featured-game')?.addEventListener('mouseenter', () => clearInterval(state.timer));
        byId('featured-game')?.addEventListener('mouseleave', restartRotation);
        reduceMotion.addEventListener?.('change', restartRotation);
        document.addEventListener('visibilitychange', restartRotation);
      }
      byId('catalog-search')?.addEventListener('input', (event) => {
        state.query = event.target.value;
        if (page === 'logiciels') renderSoftware();
        else renderGames();
      });
    } catch (error) {
      const grid = byId(page === 'logiciels' ? 'software-grid' : 'game-grid');
      if (grid) {
        const message = document.createElement('p');
        message.className = 'empty-state';
        message.textContent = 'Le catalogue est momentanément indisponible. Recharge la page dans quelques instants.';
        grid.replaceChildren(message);
      }
    }
  }

  void init();
})();
