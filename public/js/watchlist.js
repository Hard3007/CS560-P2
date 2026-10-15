import { fetchWatchlist, updateWatchlist, deleteWatchlist } from './api.js';
const list = document.querySelector('#watchlist-items');
const message = document.querySelector('#watchlist-message');
function render(item) {
  const article = document.createElement('article');
  const heading = document.createElement('h2');
  const link = document.createElement('a');
  link.href = `/recall.html?${new URLSearchParams({ source: item.source, id: item.sourceId, from: 'watchlist' })}`;
  link.textContent = item.displayName || item.title;
  link.title = item.title;
  heading.append(link);
  const form = document.createElement('form');
  const label = document.createElement('label');
  label.textContent = 'Status';
  const select = document.createElement('select');
  for (const value of ['Reviewing', 'Contacted Manufacturer', 'Resolved']) {
    const option = document.createElement('option');
    option.value = option.textContent = value;
    select.append(option);
  }
  select.value = item.status;
  label.append(select);
  const notesLabel = document.createElement('label');
  notesLabel.textContent = 'Notes';
  const notes = document.createElement('textarea');
  notes.maxLength = 2000;
  notes.rows = 4;
  notes.value = item.notes;
  notesLabel.append(notes);
  const save = document.createElement('button');
  save.type = 'submit';
  save.textContent = 'Save changes';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove';
  const feedback = document.createElement('p');
  feedback.setAttribute('role', 'status');
  async function action(operation) {
    save.disabled = remove.disabled = true;
    try {
      await operation();
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      save.disabled = remove.disabled = false;
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(async () => {
      await updateWatchlist(item._id, {
        status: select.value,
        notes: notes.value,
      });
      feedback.textContent = 'Changes saved.';
    });
  });
  remove.addEventListener('click', () => {
    if (!confirm('Remove this recall from your watchlist?')) return;
    action(async () => {
      await deleteWatchlist(item._id);
      article.remove();
      message.textContent = list.childElementCount
        ? 'Recall removed.'
        : 'Your watchlist is empty. Save a recall in Recall Explorer.';
    });
  });
  form.append(label, notesLabel, save, remove, feedback);
  article.append(heading, form);
  return article;
}
async function load() {
  const reload = document.querySelector('#reload');
  reload.disabled = true;
  list.setAttribute('aria-busy', 'true');
  message.textContent = 'Loading watchlist…';
  try {
    const { items } = await fetchWatchlist();
    list.replaceChildren(...items.map(render));
    message.textContent = items.length
      ? `${items.length} saved recalls`
      : 'Your watchlist is empty. Save a recall in Recall Explorer.';
  } catch (error) {
    message.textContent = error.message;
  } finally {
    reload.disabled = false;
    list.setAttribute('aria-busy', 'false');
  }
}
document.querySelector('#reload').addEventListener('click', load);
load();
