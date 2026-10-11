import { fetchRecalls } from './api.js';
import { countries, formatDate } from './recall-utils.js';
const rows = document.querySelector('#recall-rows');
const results = document.querySelector('#results');
const count = document.querySelector('#result-count');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const message = document.querySelector('#list-message');
const retry = document.querySelector('#retry');
const tableContainer = document.querySelector('.table-container');
let page = 1;
let controller;
function restorePage() {
  page = Math.max(
    1,
    Number(new URLSearchParams(location.search).get('page')) || 1,
  );
}
function showMessage(title, description, canRetry = false) {
  message.hidden = false;
  document.querySelector('#message-title').textContent = title;
  document.querySelector('#message-description').textContent = description;
  retry.hidden = !canRetry;
}

function renderRow(recall) {
  const fragment = document
    .querySelector('#row-template')
    .content.cloneNode(true);
  const link = fragment.querySelector('.recall-link');
  const name =
    recall.products.map((product) => product.name).join(', ') || recall.title;
  link.textContent = name;
  fragment.querySelector('.recall-subtitle').textContent =
    name === recall.title ? '' : recall.title;
  const country = countries[recall.country];
  const countryLabel = fragment.querySelector('.country-label');
  countryLabel.setAttribute('aria-label', country.name);
  countryLabel.title = country.name;
  countryLabel.querySelector('img').src = country.flag;
  countryLabel.querySelector('img').alt = country.name;
  countryLabel.querySelector('span').textContent = recall.country;
  const category = recall.categories.join(', ') || 'Not provided';
  fragment.querySelector('.category-cell').textContent = category;
  fragment.querySelector('.risk-cell').textContent =
    recall.riskLabels.join(' · ') || 'See notice';
  fragment.querySelector('.date-cell').textContent = formatDate(
    recall.sourceUpdatedDate,
  );
  fragment.querySelector('.mobile-meta').textContent =
    `Updated ${formatDate(recall.sourceUpdatedDate)}`;
  return fragment;
}

async function loadRecalls() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  const values = { page };
  history.replaceState(
    null,
    '',
    `${location.pathname}${page > 1 ? `?page=${page}` : ''}`,
  );
  results.setAttribute('aria-busy', 'true');
  tableContainer.inert = true;
  count.textContent = 'Loading recalls…';
  previous.disabled = true;
  next.disabled = true;
  message.hidden = true;
  try {
    const data = await fetchRecalls({ ...values, signal });
    if (signal.aborted) return;
    count.textContent = `${data.total.toLocaleString('en-US')} ${data.total === 1 ? 'notice' : 'notices'}`;
    rows.replaceChildren(...data.items.map(renderRow));
    if (!data.items.length) {
      showMessage(
        data.total ? 'No recalls on this page' : 'No recalls found',
        data.total
          ? 'Choose Previous to return to the results.'
          : 'No records are available.',
      );
    }
    const start = data.items.length ? (page - 1) * data.limit + 1 : 0;
    const end = data.items.length ? start + data.items.length - 1 : 0;
    document.querySelector('#page-summary').textContent =
      `${start.toLocaleString('en-US')}–${end.toLocaleString('en-US')} of ${data.total.toLocaleString('en-US')}`;
    document.querySelector('#page-number').textContent = data.total
      ? `Page ${page} of ${data.totalPages.toLocaleString('en-US')}`
      : 'Page 0 of 0';
    previous.disabled = page <= 1;
    next.disabled = page >= data.totalPages;
  } catch (error) {
    if (signal.aborted) return;
    rows.replaceChildren();
    document.querySelector('#page-summary').textContent = '';
    document.querySelector('#page-number').textContent = '';
    count.textContent = 'Recalls unavailable';
    showMessage('Could not load recalls', error.message, true);
  } finally {
    if (!signal.aborted) {
      results.setAttribute('aria-busy', 'false');
      tableContainer.inert = false;
    }
  }
}

previous.addEventListener('click', () => {
  if (page > 1) {
    page--;
    loadRecalls().then(() => results.scrollIntoView({ block: 'start' }));
  }
});
next.addEventListener('click', () => {
  page++;
  loadRecalls().then(() => results.scrollIntoView({ block: 'start' }));
});
retry.addEventListener('click', loadRecalls);
window.addEventListener('popstate', () => {
  restorePage();
  loadRecalls();
});
restorePage();
loadRecalls();
