(() => {
  'use strict';
  const id = 'freev-return-to-catalog';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.textContent = `#${id}{position:fixed;z-index:2147483647;left:16px;bottom:16px;display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:0 14px;border:1px solid rgba(103,232,249,.55);border-radius:999px;background:rgba(5,15,30,.92);color:#ecfeff;box-shadow:0 10px 28px rgba(0,0,0,.32);font:600 14px/1.1 system-ui,-apple-system,"Segoe UI",sans-serif;text-decoration:none}#${id}:hover,#${id}:focus-visible{border-color:#67e8f9;background:#083344;color:#fff;outline:none}@media(max-width:640px){#${id}{left:10px;bottom:10px}}`;
  const link = document.createElement('a');
  link.id = id;
  link.href = '../';
  link.setAttribute('aria-label', 'Retourner au catalogue des logiciels Freev');
  link.innerHTML = '<span aria-hidden="true">←</span><span>Retour à Freev</span>';
  document.head.append(style);
  document.body.append(link);
})();
