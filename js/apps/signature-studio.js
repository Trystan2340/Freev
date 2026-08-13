(() => {
  'use strict';
  const T = window.FreevToolkit;
  const key = 'freev.signature-studio.v1';
  const canvas = T.byId('signature-canvas');
  const wrap = T.byId('signature-wrap');
  const pad = new SignaturePad(canvas, { minWidth: 1.2, maxWidth: 3.8, penColor: '#111827', backgroundColor: 'rgba(0,0,0,0)' });

  function resize() {
    const data = pad.toData();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.max(280, wrap.clientWidth - 2) * ratio;
    canvas.height = Math.max(300, Math.min(440, window.innerHeight * .48)) * ratio;
    canvas.style.width = `${canvas.width / ratio}px`;
    canvas.style.height = `${canvas.height / ratio}px`;
    canvas.getContext('2d').scale(ratio, ratio);
    pad.clear();
    if (data.length) pad.fromData(data);
  }

  function saveLocal() {
    T.writeLocal(key, { data: pad.toData(), color: pad.penColor, width: pad.maxWidth });
  }

  function settings() {
    const width = Number(T.byId('signature-width').value);
    pad.penColor = T.byId('signature-color').value;
    pad.minWidth = Math.max(.5, width * .45);
    pad.maxWidth = width;
    T.byId('signature-width-value').textContent = width.toFixed(1);
    saveLocal();
  }

  T.byId('signature-color').addEventListener('input', settings);
  T.byId('signature-width').addEventListener('input', settings);
  T.byId('signature-undo').addEventListener('click', () => { const data = pad.toData(); data.pop(); pad.fromData(data); saveLocal(); });
  T.byId('signature-clear').addEventListener('click', () => { pad.clear(); saveLocal(); T.setStatus('Zone effacée.', 'success'); });
  T.byId('signature-png').addEventListener('click', () => {
    if (pad.isEmpty()) return T.setStatus('Dessine une signature avant l’export.', 'error');
    const link = document.createElement('a'); link.href = pad.toDataURL('image/png'); link.download = 'signature-freev.png'; link.click();
  });
  T.byId('signature-svg').addEventListener('click', () => {
    if (pad.isEmpty()) return T.setStatus('Dessine une signature avant l’export.', 'error');
    const data = atob(pad.toDataURL('image/svg+xml').split(',')[1]); T.downloadText(data, 'signature-freev.svg', 'image/svg+xml;charset=utf-8');
  });
  pad.addEventListener('endStroke', saveLocal);
  window.addEventListener('resize', resize);
  resize();
  const saved = T.readLocal(key);
  if (saved.color) T.byId('signature-color').value = saved.color;
  if (saved.width) T.byId('signature-width').value = saved.width;
  settings();
  if (Array.isArray(saved.data)) pad.fromData(saved.data);

  window.freevGetSaveData = () => ({ app: 'SignatureStudio', version: 1, color: pad.penColor, width: pad.maxWidth, strokes: pad.toData() });
  window.freevApplySaveData = (data) => { if (Array.isArray(data?.strokes)) pad.fromData(data.strokes); if (data?.color) T.byId('signature-color').value = data.color; if (data?.width) T.byId('signature-width').value = data.width; settings(); };
})();
