import { saveRecall } from './api.js';
export function saveButton(source, sourceId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Save to Watchlist';
  button.addEventListener('click', async (event) => {
    event.stopPropagation();
    button.disabled = true;
    try {
      await saveRecall(source, sourceId);
      button.textContent = 'Saved to Watchlist';
    } catch (error) {
      button.textContent = `${error.message} Click to retry.`;
      button.disabled = false;
    }
  });
  return button;
}
