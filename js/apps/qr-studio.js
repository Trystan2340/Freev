(() => {
  'use strict';
  const T = window.FreevToolkit;
  const key = 'freev.qr-studio.v1';
  const fields = ['qr-content', 'qr-size', 'qr-dark', 'qr-light'];

  function state() {
    return Object.fromEntries(fields.map((id) => [id, T.byId(id).value]));
  }

  function apply(data = {}) {
    fields.forEach((id) => { if (data[id] != null) T.byId(id).value = data[id]; });
    generate();
  }

  function generate() {
    const value = T.byId('qr-content').value.trim();
    if (!value) return T.setStatus('Ajoute un texte ou une adresse.', 'error');
    const output = T.byId('qr-output');
    output.replaceChildren();
    try {
      new QRCode(output, {
        text: value,
        width: Number(T.byId('qr-size').value),
        height: Number(T.byId('qr-size').value),
        colorDark: T.byId('qr-dark').value,
        colorLight: T.byId('qr-light').value,
        correctLevel: QRCode.CorrectLevel.H,
      });
      T.writeLocal(key, state());
      T.setStatus('QR code généré localement.', 'success');
    } catch (error) {
      T.setStatus(`Impossible de générer ce QR code : ${error.message}`, 'error');
    }
  }

  function download() {
    const canvas = T.byId('qr-output').querySelector('canvas');
    const image = T.byId('qr-output').querySelector('img');
    const href = canvas?.toDataURL('image/png') || image?.src;
    if (!href) return T.setStatus('Génère d’abord un QR code.', 'error');
    const link = document.createElement('a');
    link.href = href;
    link.download = 'freev-qr-code.png';
    link.click();
    T.setStatus('QR code téléchargé.', 'success');
  }

  T.byId('qr-generate').addEventListener('click', generate);
  T.byId('qr-download').addEventListener('click', download);
  T.byId('qr-copy').addEventListener('click', () => T.copyText(T.byId('qr-content').value));
  fields.forEach((id) => T.byId(id).addEventListener('change', generate));
  apply(T.readLocal(key));

  window.freevGetSaveData = () => ({ app: 'QRStudio', version: 1, ...state() });
  window.freevApplySaveData = (data) => { apply(data); T.writeLocal(key, state()); };
})();
