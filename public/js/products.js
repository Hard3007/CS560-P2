import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchProductRecalls,
} from './api.js';
import { Dropdown } from './dropdown.js';
import { countries, formatDate } from './recall-utils.js';

const $ = (selector) => document.querySelector(selector);
const filters = $('#product-filters');
const rows = $('#product-rows');
const results = $('#product-results');
const table = $('#product-table-container');
const editor = $('#product-dialog');
const productForm = $('#product-form');
const deletion = $('#delete-dialog');
const matches = $('#matches-dialog');
const dropdowns = [
  ...document.querySelectorAll('#product-filters [data-dropdown]'),
].map((root) => new Dropdown(root));
const categoryDropdown = new Dropdown($('#product-category-dropdown'));
const defaultCategories = [
  'Appliances',
  'Electronics',
  'Furniture',
  "Children's products",
  'Clothing',
  'Sports and outdoors',
  'Tools',
  'Other',
];
function updateCategorySuggestions(categories = []) {
  categoryDropdown.setOptions([
    { value: '', label: 'No category' },
    ...[...new Set([...defaultCategories, ...categories])].map((value) => ({
      value,
      label: value,
    })),
  ]);
}
updateCategorySuggestions();
let page = 1;
let items = [];
let listController;
let matchController;
let timer;
let editingId;
let deletingProduct;
let matchingProduct;
let matchPage = 1;
let matchTimer;

function showError(node, error) {
  node.textContent = error.message;
  node.hidden = false;
}

function notice(text) {
  $('#product-notice').textContent = text;
  $('#product-notice').hidden = false;
}

function restoreFilters() {
  const query = new URLSearchParams(location.search);
  filters.elements.q.value = query.get('q') || '';
  for (const key of ['brand', 'category']) {
    const value = query.get(key) || '';
    if (value) filters.elements[key].add(new Option(value, value));
    filters.elements[key].value = value;
  }
  const requested = Number(query.get('page'));
  page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  dropdowns.forEach((dropdown) => dropdown.sync());
}

function updateUrl() {
  const query = new URLSearchParams();
  for (const [key, value] of new FormData(filters))
    if (value.trim()) query.set(key, value.trim());
  if (page > 1) query.set('page', page);
  history.replaceState(
    null,
    '',
    `${location.pathname}${query.size ? `?${query}` : ''}`,
  );
}

function updateOptions(options) {
  updateCategorySuggestions(options.categories);
  for (const [key, values] of [
    ['brand', options.brands],
    ['category', options.categories],
  ]) {
    const field = filters.elements[key];
    const selected = field.value;
    const choices = [...new Set([...values, ...(selected ? [selected] : [])])];
    field.replaceChildren(
      new Option(key === 'brand' ? 'All brands' : 'All categories', ''),
      ...choices.map((value) => new Option(value, value)),
    );
    field.value = selected;
  }
  dropdowns.forEach((dropdown) => dropdown.sync());
}

function renderProducts(products) {
  rows.replaceChildren(
    ...products.map((product) => {
      const row = $(
        '#product-row-template',
      ).content.firstElementChild.cloneNode(true);
      row.dataset.id = product._id;
      row.querySelector('.product-name').textContent = product.name;
      const country = countries[product.country];
      if (country) {
        const badge = row.querySelector('.product-country');
        badge.hidden = false;
        badge.title = country.name;
        badge.querySelector('img').src = country.flag;
        badge.querySelector('img').alt = country.name;
        badge.querySelector('span').textContent = product.country;
        row.querySelector('.product-country-all').hidden = true;
      }
      row.querySelector('.product-model').textContent = product.model
        ? `Model ${product.model}`
        : '';
      row.querySelector('.product-brand').textContent = product.brand || '—';
      row.querySelector('.product-category').textContent =
        product.category || '—';
      for (const button of row.querySelectorAll('button'))
        button.setAttribute(
          'aria-label',
          `${button.dataset.action === 'check' ? 'Check recalls for' : button.textContent.trim()} ${product.name}`,
        );
      return row;
    }),
  );
}

async function loadProducts() {
  clearTimeout(timer);
  listController?.abort();
  const controller = new AbortController();
  listController = controller;
  results.setAttribute('aria-busy', 'true');
  table.inert = true;
  $('#product-message').hidden = true;
  $('#product-pagination').hidden = true;
  $('#product-count').textContent = 'Loading products…';
  updateUrl();
  try {
    const data = await fetchProducts({
      ...Object.fromEntries(new FormData(filters)),
      page,
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    if (page > Math.max(1, data.totalPages)) {
      page = Math.max(1, data.totalPages);
      return loadProducts();
    }
    items = data.items;
    renderProducts(items);
    updateOptions(data.filters);
    $('#product-count').textContent =
      `${data.total.toLocaleString()} ${data.total === 1 ? 'product' : 'products'}`;
    table.hidden = !items.length;
    if (!items.length) {
      const filtered = [...new FormData(filters).values()].some((value) =>
        value.trim(),
      );
      $('#product-message-title').textContent = filtered
        ? 'No matching products'
        : 'Your product list is empty';
      $('#product-message-description').textContent = filtered
        ? 'Try another search or clear the filters.'
        : 'Choose Add product to keep track of something you own.';
      $('#product-retry').hidden = true;
      $('#product-message').hidden = false;
    }
    $('#product-pagination').hidden = data.totalPages < 2;
    $('#product-page').textContent = `Page ${page} of ${data.totalPages}`;
    $('#product-previous').disabled = page <= 1;
    $('#product-next').disabled = page >= data.totalPages;
  } catch (error) {
    if (error.name === 'AbortError') return;
    items = [];
    rows.replaceChildren();
    table.hidden = true;
    $('#product-count').textContent = 'Products unavailable';
    $('#product-message-title').textContent = 'Unable to load your products';
    $('#product-message-description').textContent = error.message;
    $('#product-retry').hidden = false;
    $('#product-message').hidden = false;
  } finally {
    if (listController === controller) {
      results.setAttribute('aria-busy', 'false');
      table.inert = false;
    }
  }
}

function openEditor(product) {
  editingId = product?._id;
  productForm.reset();
  $('#product-form-error').hidden = true;
  $('#product-dialog-title').textContent = product
    ? 'Edit product'
    : 'Add product';
  for (const key of ['name', 'brand', 'model', 'category']) {
    productForm.elements[key].value = product?.[key] || '';
    productForm.elements[key].setCustomValidity('');
  }
  productForm.elements.country.value = countries[product?.country]
    ? product.country
    : '';
  categoryDropdown.close();
  editor.showModal();
  productForm.elements.name.focus();
}

function setBusy(dialog, busy) {
  if (dialog === editor && busy) categoryDropdown.close();
  dialog.dataset.busy = String(busy);
  dialog.setAttribute('aria-busy', String(busy));
  for (const control of dialog.querySelectorAll('input, button'))
    control.disabled = busy;
}

function focusProduct(id) {
  const row = [...rows.children].find((node) => node.dataset.id === id);
  (row?.querySelector('[data-action="edit"]') || $('#add-product')).focus({
    preventScroll: true,
  });
}

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (editor.dataset.busy === 'true') return;
  const data = Object.fromEntries(new FormData(productForm));
  for (const key of Object.keys(data)) data[key] = data[key].trim();
  if (!data.name) {
    productForm.elements.name.setCustomValidity('Enter a product name.');
    productForm.elements.name.reportValidity();
    return;
  }
  $('#product-form-error').hidden = true;
  setBusy(editor, true);
  $('#save-product').textContent = 'Saving…';
  try {
    const product = editingId
      ? await updateProduct(editingId, data)
      : await createProduct(data);
    editor.close();
    notice(editingId ? 'Product updated.' : 'Product added.');
    if (!editingId) page = 1;
    await loadProducts();
    focusProduct(product._id);
  } catch (error) {
    showError($('#product-form-error'), error);
  } finally {
    setBusy(editor, false);
    $('#save-product').textContent = 'Save product';
  }
});
productForm.elements.name.addEventListener('input', () =>
  productForm.elements.name.setCustomValidity(''),
);

$('#delete-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (deletion.dataset.busy === 'true') return;
  $('#delete-error').hidden = true;
  setBusy(deletion, true);
  $('#confirm-delete').textContent = 'Deleting…';
  try {
    await deleteProduct(deletingProduct._id);
    deletion.close();
    notice('Product deleted.');
    await loadProducts();
    $('#add-product').focus({ preventScroll: true });
  } catch (error) {
    showError($('#delete-error'), error);
  } finally {
    setBusy(deletion, false);
    $('#confirm-delete').textContent = 'Delete product';
  }
});

async function loadMatches() {
  clearTimeout(matchTimer);
  matchController?.abort();
  const controller = new AbortController();
  matchController = controller;
  $('#match-results').setAttribute('aria-busy', 'true');
  $('#match-list').replaceChildren();
  $('#match-message').hidden = true;
  $('#match-pagination').hidden = true;
  $('#match-count').textContent = 'Checking recalls…';
  try {
    const data = await fetchProductRecalls(matchingProduct._id, {
      page: matchPage,
      q: $('#match-search').value.trim(),
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    $('#match-count').textContent =
      `${data.total.toLocaleString()} possible ${data.total === 1 ? 'match' : 'matches'}`;
    $('#match-list').replaceChildren(
      ...data.items.map((recall) => {
        const item =
          $('#match-template').content.firstElementChild.cloneNode(true);
        const link = item.querySelector('a');
        link.textContent = recall.title;
        link.href = `/recall.html?source=${encodeURIComponent(recall.source)}&id=${encodeURIComponent(recall.sourceId)}&from=products&return=${encodeURIComponent(location.search || '?')}`;
        const country = countries[recall.country];
        item.querySelector('img').src = country.flag;
        item.querySelector('.match-country span').textContent = country.source;
        item.querySelector('.match-date').textContent = recall.sourceUpdatedDate
          ? `Updated ${formatDate(recall.sourceUpdatedDate)}`
          : '';
        return item;
      }),
    );
    if (!data.total) {
      $('#match-message-text').textContent = $('#match-search').value.trim()
        ? 'No matching recalls. Try another search or clear the search field.'
        : 'No possible matches found. Try editing the product name or search Recall Explorer.';
      $('#match-retry').hidden = true;
      $('#match-message').hidden = false;
    }
    $('#match-pagination').hidden = data.totalPages < 2;
    $('#match-page').textContent = `Page ${matchPage} of ${data.totalPages}`;
    $('#match-previous').disabled = matchPage <= 1;
    $('#match-next').disabled = matchPage >= data.totalPages;
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('#match-count').textContent = 'Recall check unavailable';
    $('#match-message-text').textContent = error.message;
    $('#match-retry').hidden = false;
    $('#match-message').hidden = false;
  } finally {
    if (matchController === controller)
      $('#match-results').setAttribute('aria-busy', 'false');
  }
}

rows.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const product = items.find(
    (item) => item._id === button.closest('tr').dataset.id,
  );
  if (!product) return;
  if (button.dataset.action === 'edit') openEditor(product);
  if (button.dataset.action === 'delete') {
    deletingProduct = product;
    $('#delete-product-name').textContent = product.name;
    $('#delete-error').hidden = true;
    deletion.showModal();
    deletion.querySelector('.dialog-actions .close-dialog').focus();
  }
  if (button.dataset.action === 'check') {
    matchingProduct = product;
    matchPage = 1;
    $('#match-search-form').reset();
    matches.showModal();
    loadMatches();
  }
});

for (const dialog of [editor, deletion, matches]) {
  for (const button of dialog.querySelectorAll('.close-dialog'))
    button.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', (event) => {
    if (dialog.dataset.busy === 'true') event.preventDefault();
  });
}
matches.addEventListener('close', () => {
  clearTimeout(matchTimer);
  matchController?.abort();
});
$('#match-search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  matchPage = 1;
  loadMatches();
});
$('#match-search').addEventListener('input', () => {
  clearTimeout(matchTimer);
  matchController?.abort();
  matchPage = 1;
  $('#match-pagination').hidden = true;
  matchTimer = setTimeout(() => {
    loadMatches();
  }, 300);
});
editor.addEventListener('close', () => categoryDropdown.close());
$('#add-product').addEventListener('click', () => openEditor());
$('#product-retry').addEventListener('click', loadProducts);
$('#match-retry').addEventListener('click', loadMatches);
filters.addEventListener('submit', (event) => {
  event.preventDefault();
  page = 1;
  loadProducts();
});
filters.addEventListener('input', (event) => {
  if (event.target.name !== 'q') return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    page = 1;
    loadProducts();
  }, 300);
});
filters.addEventListener('change', (event) => {
  if (['brand', 'category'].includes(event.target.name)) {
    page = 1;
    loadProducts();
  }
});
filters.addEventListener('reset', () =>
  queueMicrotask(() => {
    for (const key of ['q', 'brand', 'category'])
      filters.elements[key].value = '';
    dropdowns.forEach((dropdown) => dropdown.sync());
    page = 1;
    loadProducts();
  }),
);
for (const [id, difference] of [
  ['product-previous', -1],
  ['product-next', 1],
])
  $(`#${id}`).addEventListener('click', () => {
    page += difference;
    loadProducts();
  });
for (const [id, difference] of [
  ['match-previous', -1],
  ['match-next', 1],
])
  $(`#${id}`).addEventListener('click', () => {
    matchPage += difference;
    loadMatches();
  });
window.addEventListener('popstate', () => {
  restoreFilters();
  loadProducts();
});
restoreFilters();
loadProducts();
