import { saveButton } from './save-recall.js';
import { fetchRecalls, fetchRecallFilters } from './api.js';
import { countries, formatDate } from './recall-utils.js';
import { Dropdown } from './dropdown.js';

const form = document.querySelector('#filters');
const rows = document.querySelector('#recall-rows');
const results = document.querySelector('#results');
const count = document.querySelector('#result-count');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const message = document.querySelector('#list-message');
const retry = document.querySelector('#retry');
const sortToggle = document.querySelector('#sort-toggle');
const tableContainer = document.querySelector('.table-container');
const moreFilters = document.querySelector('#more-filters');
const advancedFilters = document.querySelector('#advanced-filters');
let page = 1;
let controller;
let timer;
let pendingRisk = '';
const dropdowns = [...document.querySelectorAll('[data-dropdown]')].map(
  (root) => new Dropdown(root),
);
const categoryDropdown = dropdowns.find(
  (dropdown) => dropdown.field.name === 'category',
);

function syncSort() {
  const oldest = form.elements.sort.value === 'oldest';
  sortToggle.dataset.order = oldest ? 'oldest' : 'latest';
  document.querySelector('#sort-value').textContent = oldest
    ? 'Oldest'
    : 'Newest';
  const description = oldest
    ? 'Oldest updates first. Switch to newest first.'
    : 'Newest updates first. Switch to oldest first.';
  sortToggle.setAttribute('aria-label', description);
  sortToggle.title = description;
}

function setAdvancedOpen(open) {
  advancedFilters.hidden = !open;
  moreFilters.setAttribute('aria-expanded', String(open));
  if (!open) categoryDropdown.close();
}

function syncAdvancedFilters() {
  const { category, updatedFrom, updatedTo } = form.elements;
  updatedFrom.max = updatedTo.value || '9999-12-31';
  updatedTo.min = updatedFrom.value || '0001-01-01';
  const active =
    Number(Boolean(category.value.trim())) +
    Number(Boolean(updatedFrom.value || updatedTo.value));
  const indicator = document.querySelector('#advanced-count');
  indicator.textContent = active ? `(${active})` : '';
  indicator.hidden = !active;
}

function restoreFilters() {
  const query = new URLSearchParams(location.search);
  page = Math.max(1, Number(query.get('page')) || 1);
  const country = query.get('country') || '';
  for (const input of form.elements.country)
    input.checked = input.value === (countries[country] ? country : '');
  for (const name of ['q', 'brand', 'category', 'updatedFrom', 'updatedTo'])
    form.elements[name].value = query.get(name) || '';
  form.elements.sort.value =
    query.get('sort') === 'oldest' ? 'oldest' : 'latest';
  syncSort();
  pendingRisk = query.get('risk') || '';
  form.elements.risk.value = [...form.elements.risk.options].some(
    (option) => option.value === pendingRisk,
  )
    ? pendingRisk
    : '';
  dropdowns.forEach((dropdown) => dropdown.sync());
  syncAdvancedFilters();
}

function filters() {
  const values = Object.fromEntries(new FormData(form));
  values.risk = form.elements.risk.value || pendingRisk;
  return {
    ...values,
    q: values.q.trim(),
    category: values.category.trim(),
    page,
  };
}

function updateUrl(values) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (
      value &&
      !(key === 'page' && value === 1) &&
      !(key === 'sort' && value === 'latest')
    )
      query.set(key, value);
  }
  history.replaceState(
    null,
    '',
    `${location.pathname}${query.size ? `?${query}` : ''}`,
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
  const row = fragment.querySelector('tr');
  const link = fragment.querySelector('.recall-link');
  const name =
    recall.products.map((product) => product.name).join(', ') || recall.title;
  const query = new URLSearchParams({
    source: recall.source,
    id: recall.sourceId,
    return: location.search,
  });
  link.href = `/recall.html?${query}`;
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
  fragment
    .querySelector('.recall-cell')
    .append(saveButton(recall.source, recall.sourceId));
  row.addEventListener('click', (event) => {
    if (
      event.target.closest('a, button') ||
      event.button !== 0 ||
      window.getSelection()?.toString()
    )
      return;
    if (event.metaKey || event.ctrlKey)
      window.open(link.href, '_blank', 'noopener');
    else location.href = link.href;
  });
  return fragment;
}

async function loadRecalls() {
  clearTimeout(timer);
  syncAdvancedFilters();
  if (!form.checkValidity()) {
    setAdvancedOpen(true);
    form.reportValidity();
    return;
  }
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  const values = filters();
  updateUrl(values);
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
          ? 'Choose Previous or clear the filters to return to the results.'
          : 'Try a different keyword or clear a filter.',
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

function applyFilters() {
  page = 1;
  loadRecalls();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  applyFilters();
});
form.addEventListener('input', (event) => {
  if (!['q', 'brand', 'category'].includes(event.target.name)) return;
  clearTimeout(timer);
  timer = setTimeout(applyFilters, 350);
});
form.addEventListener('change', (event) => {
  if (
    !['country', 'category', 'risk', 'updatedFrom', 'updatedTo'].includes(
      event.target.name,
    )
  )
    return;
  if (event.target.name === 'risk') pendingRisk = event.target.value;
  applyFilters();
});
form.addEventListener('reset', () => {
  pendingRisk = '';
  setTimeout(() => {
    form.elements.sort.value = 'latest';
    syncSort();
    dropdowns.forEach((dropdown) => dropdown.sync());
    applyFilters();
  }, 0);
});
moreFilters.addEventListener('click', () =>
  setAdvancedOpen(advancedFilters.hidden),
);
sortToggle.addEventListener('click', () => {
  form.elements.sort.value =
    form.elements.sort.value === 'oldest' ? 'latest' : 'oldest';
  syncSort();
  applyFilters();
});
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
  restoreFilters();
  loadRecalls();
});

restoreFilters();
loadRecalls();
fetchRecallFilters()
  .then((data) => {
    categoryDropdown.setOptions([
      { value: '', label: 'All categories' },
      ...data.categories.map((category) => ({
        value: category,
        label: category,
      })),
    ]);
    for (const risk of data.risks) {
      const option = document.createElement('option');
      option.value = risk.value;
      option.textContent = risk.label;
      form.elements.risk.append(option);
    }
    form.elements.risk.value = pendingRisk;
    dropdowns.forEach((dropdown) => dropdown.sync());
  })
  .catch(() => {
    form.elements.risk.disabled = true;
    form.elements.risk.title =
      'Risk filters could not be loaded. Reload the page to try again.';
    dropdowns.forEach((dropdown) => dropdown.sync());
  });
