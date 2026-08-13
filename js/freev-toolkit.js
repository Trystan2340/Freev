(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);

  function setStatus(message, type = '') {
    const node = byId('tool-status');
    if (!node) return;
    node.textContent = message;
    node.className = `tool-status${type ? ` ${type}` : ''}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadText(text, filename, type = 'text/plain;charset=utf-8') {
    downloadBlob(new Blob([text], { type }), filename);
  }

  async function copyText(value) {
    await navigator.clipboard.writeText(String(value));
    setStatus('Copié dans le presse-papiers.', 'success');
  }

  function readLocal(key, fallback = {}) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }

  function writeLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  window.FreevToolkit = Object.freeze({ byId, copyText, downloadBlob, downloadText, readLocal, setStatus, writeLocal });
})();
