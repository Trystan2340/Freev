(() => {
  'use strict';
  const T = window.FreevToolkit;
  const key = 'freev.markdown-studio.v1';
  const input = T.byId('markdown-input');
  const preview = T.byId('markdown-preview');
  const forbidden = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM']);

  function safeHtml(source) {
    const documentFragment = new DOMParser().parseFromString(source, 'text/html');
    documentFragment.body.querySelectorAll('*').forEach((element) => {
      if (forbidden.has(element.tagName)) return element.remove();
      [...element.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith('on') || name === 'style' || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
          element.removeAttribute(attribute.name);
        }
      });
      if (element.tagName === 'A') {
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      }
    });
    return documentFragment.body.innerHTML;
  }

  function render() {
    const value = input.value;
    preview.innerHTML = safeHtml(marked.parse(value, { gfm: true, breaks: true }));
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    T.byId('markdown-stats').textContent = `${words} mot${words > 1 ? 's' : ''} · ${value.length} caractères`;
    T.writeLocal(key, { content: value });
  }

  function exportHtml() {
    const title = (input.value.match(/^#\s+(.+)$/m)?.[1] || 'Document Freev').replace(/[<>]/g, '');
    const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{max-width:850px;margin:40px auto;padding:0 20px;font:17px/1.65 system-ui;color:#172033}pre{overflow:auto;padding:16px;border-radius:10px;background:#0f172a;color:#e2e8f0}img{max-width:100%}blockquote{border-left:4px solid #22d3ee;padding-left:14px;color:#475569}</style><main>${preview.innerHTML}</main></html>`;
    T.downloadText(html, 'document-freev.html', 'text/html;charset=utf-8');
    T.setStatus('Document HTML exporté.', 'success');
  }

  input.addEventListener('input', render);
  T.byId('markdown-download').addEventListener('click', () => T.downloadText(input.value, 'document-freev.md', 'text/markdown;charset=utf-8'));
  T.byId('markdown-html').addEventListener('click', exportHtml);
  T.byId('markdown-copy').addEventListener('click', () => T.copyText(input.value));
  const saved = T.readLocal(key);
  if (typeof saved.content === 'string') input.value = saved.content;
  render();

  window.freevGetSaveData = () => ({ app: 'MarkdownStudio', version: 1, content: input.value.slice(0, 60000) });
  window.freevApplySaveData = (data) => { if (typeof data?.content === 'string') { input.value = data.content; render(); } };
})();
