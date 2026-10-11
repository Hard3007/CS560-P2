const dialog = document.querySelector('#image-viewer');
const stage = document.querySelector('#image-viewer-stage');
const image = document.querySelector('#image-viewer-image');
const status = document.querySelector('#image-viewer-status');
const caption = document.querySelector('#image-viewer-caption');
const zoomOut = document.querySelector('#image-zoom-out');
const zoomIn = document.querySelector('#image-zoom-in');
const reset = document.querySelector('#image-zoom-reset');
const level = document.querySelector('#image-zoom-level');
let scale = 1;
let x = 0;
let y = 0;
let width = 0;
let height = 0;
let drag;
let opener;

function render() {
  const bounds = stage.getBoundingClientRect();
  const limitX = Math.max(0, (width * scale - bounds.width) / 2);
  const limitY = Math.max(0, (height * scale - bounds.height) / 2);
  x = Math.max(-limitX, Math.min(limitX, x));
  y = Math.max(-limitY, Math.min(limitY, y));
  image.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
  stage.dataset.zoomed = String(scale > 1);
  level.textContent = `${Math.round(scale * 100)}%`;
  zoomOut.disabled = !width || scale <= 1;
  zoomIn.disabled = !width || scale >= 6;
  reset.disabled = !width;
}

function fitImage() {
  if (!dialog.open || !image.complete || !image.naturalWidth) return;
  const bounds = stage.getBoundingClientRect();
  const fit = Math.min(
    Math.max(1, bounds.width - 32) / image.naturalWidth,
    Math.max(1, bounds.height - 32) / image.naturalHeight,
    1,
  );
  width = image.naturalWidth * fit;
  height = image.naturalHeight * fit;
  image.style.width = `${width}px`;
  image.style.height = `${height}px`;
  render();
}

function zoom(next, clientX, clientY) {
  if (!width) return;
  next = Math.max(1, Math.min(6, next));
  const bounds = stage.getBoundingClientRect();
  const pointX =
    clientX === undefined ? 0 : clientX - bounds.left - bounds.width / 2;
  const pointY =
    clientY === undefined ? 0 : clientY - bounds.top - bounds.height / 2;
  const ratio = next / scale;
  x = pointX - (pointX - x) * ratio;
  y = pointY - (pointY - y) * ratio;
  scale = next;
  render();
}

export function openImageViewer(thumbnail, description) {
  opener = document.activeElement;
  scale = 1;
  x = y = width = height = 0;
  image.hidden = true;
  image.alt = thumbnail.alt;
  image.referrerPolicy = 'no-referrer';
  status.textContent = 'Loading image…';
  status.hidden = false;
  caption.textContent = description;
  caption.hidden = !description;
  document.documentElement.classList.add('image-viewer-open');
  dialog.showModal();
  render();
  image.src = thumbnail.currentSrc || thumbnail.src;
}

image.addEventListener('load', () => {
  if (!dialog.open) return;
  image.hidden = false;
  status.hidden = true;
  fitImage();
});
image.addEventListener('error', () => {
  if (!dialog.open) return;
  status.textContent =
    'Unable to load this image. Close the preview and try again.';
  status.hidden = false;
});
stage.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const unit =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? stage.clientHeight
          : 1;
    const delta = Math.max(-200, Math.min(200, event.deltaY * unit));
    zoom(scale * Math.exp(-delta * 0.002), event.clientX, event.clientY);
  },
  { passive: false },
);
stage.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || scale <= 1) return;
  drag = {
    id: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    x,
    y,
  };
  stage.setPointerCapture(event.pointerId);
  stage.dataset.dragging = 'true';
});
stage.addEventListener('pointermove', (event) => {
  if (!drag || drag.id !== event.pointerId) return;
  x = drag.x + event.clientX - drag.startX;
  y = drag.y + event.clientY - drag.startY;
  render();
});
function stopDragging() {
  drag = undefined;
  stage.dataset.dragging = 'false';
}
stage.addEventListener('pointerup', stopDragging);
stage.addEventListener('pointercancel', stopDragging);
stage.addEventListener('lostpointercapture', stopDragging);
stage.addEventListener('click', (event) => {
  if (scale > 1 || !width) return;
  const bounds = image.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    dialog.close();
});
zoomOut.addEventListener('click', () => zoom(scale / 1.25));
zoomIn.addEventListener('click', () => zoom(scale * 1.25));
reset.addEventListener('click', () => zoom(1));
document
  .querySelector('#image-viewer-close')
  .addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', (event) => {
  if (!['+', '=', '-', '0'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === '0') zoom(1);
  else zoom(event.key === '-' ? scale / 1.25 : scale * 1.25);
});
dialog.addEventListener('close', () => {
  document.documentElement.classList.remove('image-viewer-open');
  stopDragging();
  image.removeAttribute('src');
  opener?.focus({ preventScroll: true });
});
new ResizeObserver(fitImage).observe(stage);
