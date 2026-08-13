(() => {
  'use strict';
  const T = window.FreevToolkit;
  const image = T.byId('crop-image');
  let cropper = null;
  let objectUrl = '';
  let flipped = false;

  T.byId('crop-file').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return T.setStatus('L’image dépasse 10 Mo.', 'error');
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return T.setStatus('Format non pris en charge.', 'error');
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    cropper?.destroy();
    objectUrl = URL.createObjectURL(file);
    image.src = objectUrl;
    image.hidden = false;
    T.byId('crop-empty').hidden = true;
    image.onload = () => {
      cropper = new Cropper(image, { viewMode: 1, autoCropArea: .86, responsive: true, background: false });
      T.byId('crop-download').disabled = false;
      T.setStatus('Image prête à être recadrée.', 'success');
    };
  });
  T.byId('crop-ratio').addEventListener('change', (event) => cropper?.setAspectRatio(Number(event.target.value)));
  document.querySelectorAll('[data-rotate]').forEach((button) => button.addEventListener('click', () => cropper?.rotate(Number(button.dataset.rotate))));
  T.byId('crop-flip').addEventListener('click', () => { flipped = !flipped; cropper?.scaleX(flipped ? -1 : 1); });
  T.byId('crop-reset').addEventListener('click', () => { flipped = false; cropper?.reset(); });
  T.byId('crop-download').addEventListener('click', () => {
    if (!cropper) return;
    const type = T.byId('crop-format').value;
    const extension = type.split('/')[1].replace('jpeg', 'jpg');
    cropper.getCroppedCanvas({ maxWidth: 2400, maxHeight: 2400, imageSmoothingQuality: 'high' }).toBlob((blob) => {
      if (!blob) return T.setStatus('Export impossible.', 'error');
      T.downloadBlob(blob, `image-freev.${extension}`);
      T.setStatus('Image exportée.', 'success');
    }, type, .92);
  });
  window.addEventListener('beforeunload', () => { if (objectUrl) URL.revokeObjectURL(objectUrl); });

  window.freevGetSaveData = () => ({ app: 'CropStudio', version: 1, ratio: T.byId('crop-ratio').value, format: T.byId('crop-format').value, note: 'Les images ne sont jamais copiées dans le cloud.' });
  window.freevApplySaveData = (data) => { if (data?.ratio) T.byId('crop-ratio').value = data.ratio; if (data?.format) T.byId('crop-format').value = data.format; cropper?.setAspectRatio(Number(T.byId('crop-ratio').value)); };
})();
