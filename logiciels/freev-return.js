(() => {
  'use strict';

  const id = 'freev-return-to-catalog';
  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.textContent = `
    #${id} {
      position: fixed;
      z-index: 2147483647;
      left: 16px;
      bottom: 16px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      padding: 0 14px;
      border: 1px solid rgba(103, 232, 249, .55);
      border-radius: 999px;
      background: rgba(5, 15, 30, .92);
      color: #ecfeff;
      box-shadow: 0 10px 28px rgba(0, 0, 0, .32);
      font: 600 14px/1.1 system-ui, -apple-system, "Segoe UI", sans-serif;
      text-decoration: none;
      letter-spacing: .01em;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    #${id}:hover, #${id}:focus-visible {
      background: #0e7490;
      color: #fff;
      outline: 3px solid rgba(103, 232, 249, .45);
      outline-offset: 3px;
    }
    #${id} .freev-return-mark { font-size: 18px; line-height: 1; }
    @media (max-width: 640px) {
      #${id} { left: 10px; bottom: 10px; min-height: 38px; padding: 0 11px; font-size: 13px; }
    }
  `;

  const link = document.createElement('a');
  link.id = id;
  link.href = '../';
  link.setAttribute('aria-label', 'Retourner au catalogue des logiciels Freev');
  link.innerHTML = '<span class="freev-return-mark" aria-hidden="true">←</span><span>Retour à Freev</span>';

  document.head.append(style);
  document.body.append(link);
})();
