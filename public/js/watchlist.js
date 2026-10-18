import { fetchWatchlist, updateWatchlist, deleteWatchlist } from './api.js';

const list = document.querySelector('#watchlist-items');
const message = document.querySelector('#watchlist-message');
const reload = document.querySelector('#reload');
const pagination = document.querySelector('#watchlist-pagination');
const previous = document.querySelector('#watchlist-previous');
const next = document.querySelector('#watchlist-next');
const confirmation = document.querySelector('#watchlist-confirm');
const requested = Number(new URLSearchParams(location.search).get('page'));
let page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
let totalPages = 0;
let loading = false;
let pendingActions = 0;
let controller;

function confirmAction(title, description, label) {
  if (confirmation.open) return Promise.resolve(false);
  document.querySelector('#watchlist-confirm-title').textContent = title;
  document.querySelector('#watchlist-confirm-message').textContent =
    description;
  document.querySelector('#watchlist-confirm-accept').textContent = label;
  confirmation.returnValue = 'cancel';
  return new Promise((resolve) => {
    confirmation.addEventListener(
      'close',
      () => resolve(confirmation.returnValue === 'confirm'),
      { once: true },
    );
    confirmation.showModal();
  });
}

document
  .querySelector('#watchlist-confirm-cancel')
  .addEventListener('click', () => confirmation.close('cancel'));
document
  .querySelector('#watchlist-confirm-accept')
  .addEventListener('click', () => confirmation.close('confirm'));

function updateNavigation() {
  const busy = loading || pendingActions > 0;
  reload.disabled = busy;
  previous.disabled = busy || page <= 1;
  next.disabled = busy || page >= totalPages;
}

function collectDrafts() {
  return new Map(
    [...list.querySelectorAll('form[data-dirty="true"]')].map((form) => [
      form.dataset.id,
      { status: form.elements.status.value, notes: form.elements.notes.value },
    ]),
  );
}

function render(item, draft) {
  const article = document.createElement('article');
  const heading = document.createElement('h2');
  const link = document.createElement('a');
  link.href =
    '/recall.html?' +
    new URLSearchParams({
      source: item.source,
      id: item.sourceId,
      from: 'watchlist',
      return: location.search || '?',
    });
  link.textContent = item.displayName || item.title;
  link.title = item.title;
  heading.append(link);
  const form = document.createElement('form');
  form.dataset.id = item._id;
  const label = document.createElement('label');
  label.textContent = 'Status';
  const select = document.createElement('select');
  select.name = 'status';
  for (const value of ['Reviewing', 'Contacted Manufacturer', 'Resolved']) {
    const option = document.createElement('option');
    option.value = option.textContent = value;
    select.append(option);
  }
  select.value = draft?.status ?? item.status;
  label.append(select);
  const notesLabel = document.createElement('label');
  notesLabel.textContent = 'Notes';
  const notes = document.createElement('textarea');
  notes.name = 'notes';
  notes.maxLength = 2000;
  notes.rows = 4;
  notes.value = draft?.notes ?? item.notes;
  notesLabel.append(notes);
  const save = document.createElement('button');
  save.type = 'submit';
  save.textContent = 'Save changes';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove';
  const feedback = document.createElement('p');
  feedback.setAttribute('role', 'status');
  function updateDirty() {
    form.dataset.dirty = String(
      select.value !== item.status || notes.value !== item.notes,
    );
  }
  form.addEventListener('input', updateDirty);
  form.addEventListener('change', updateDirty);
  updateDirty();
  async function action(operation) {
    if (save.disabled) return;
    pendingActions++;
    save.disabled = remove.disabled = select.disabled = notes.disabled = true;
    updateNavigation();
    feedback.textContent = '';
    try {
      await operation();
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      pendingActions--;
      save.disabled =
        remove.disabled =
        select.disabled =
        notes.disabled =
          false;
      updateNavigation();
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(async () => {
      const updated = await updateWatchlist(item._id, {
        status: select.value,
        notes: notes.value,
      });
      item.status = updated.status;
      item.notes = updated.notes;
      updateDirty();
      feedback.textContent = 'Changes saved.';
    });
  });
  remove.addEventListener('click', async () => {
    if (
      !(await confirmAction(
        'Remove saved recall',
        'Remove this recall from your watchlist?',
        'Remove recall',
      ))
    )
      return;
    action(async () => {
      await deleteWatchlist(item._id);
      article.remove();
      await load({ drafts: collectDrafts() });
    });
  });
  form.append(label, notesLabel, save, remove, feedback);
  article.append(heading, form);
  return article;
}

async function load({
  requestedPage = page,
  drafts = new Map(),
  focus = false,
} = {}) {
  controller?.abort();
  const request = new AbortController();
  controller = request;
  loading = true;
  updateNavigation();
  pagination.hidden = true;
  list.inert = true;
  list.setAttribute('aria-busy', 'true');
  message.textContent = 'Loading watchlist…';
  try {
    const data = await fetchWatchlist({
      page: requestedPage,
      signal: request.signal,
    });
    if (request.signal.aborted) return;
    if (requestedPage > Math.max(1, data.totalPages))
      return load({
        requestedPage: Math.max(1, data.totalPages),
        drafts,
        focus,
      });
    page = data.page;
    totalPages = data.totalPages;
    const query = new URLSearchParams(location.search);
    if (page > 1) query.set('page', page);
    else query.delete('page');
    history.replaceState(
      null,
      '',
      location.pathname + (query.size ? '?' + query : ''),
    );
    list.replaceChildren(
      ...data.items.map((item) => render(item, drafts.get(item._id))),
    );
    message.textContent = data.total
      ? data.total.toLocaleString() +
        ' saved ' +
        (data.total === 1 ? 'recall' : 'recalls')
      : 'Your watchlist is empty. Save a recall in Recall Explorer.';
    const start = data.items.length ? (page - 1) * data.limit + 1 : 0;
    const end = data.items.length ? start + data.items.length - 1 : 0;
    document.querySelector('#watchlist-page-summary').textContent =
      start.toLocaleString() +
      '–' +
      end.toLocaleString() +
      ' of ' +
      data.total.toLocaleString();
    document.querySelector('#watchlist-page-number').textContent =
      'Page ' + page + ' of ' + totalPages;
    pagination.hidden = totalPages < 2;
    if (focus) document.querySelector('#watchlist-title').focus();
  } catch (error) {
    if (request.signal.aborted) return;
    message.textContent = error.message;
  } finally {
    if (controller === request) {
      loading = false;
      list.inert = false;
      list.setAttribute('aria-busy', 'false');
      updateNavigation();
    }
  }
}

async function goToPage(requestedPage, focus = false) {
  if (loading || pendingActions) return;
  if (
    collectDrafts().size &&
    !(await confirmAction(
      'Unsaved changes',
      'Discard unsaved changes and reload the list?',
      'Discard changes',
    ))
  )
    return;
  load({ requestedPage, focus });
}

reload.addEventListener('click', () => goToPage(page));
previous.addEventListener('click', () => {
  if (page > 1) goToPage(page - 1, true);
});
next.addEventListener('click', () => {
  if (page < totalPages) goToPage(page + 1, true);
});
load();
