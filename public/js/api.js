import { getUserId } from './user.js';

async function fetchJson(url, signal, { method = 'GET', data } = {}) {
  const userId = getUserId();
  let response;
  try {
    response = await fetch(url, {
      signal,
      method,
      headers: {
        'X-User-Id': userId,
        ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Unable to connect. Please try again.', { cause: error });
  }
  if (response.status === 204) return null;
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || 'Unable to complete the request.');
  return body;
}

export async function fetchRecalls({
  page = 1,
  limit = 20,
  country = '',
  q = '',
  category = '',
  risk = '',
  sort = 'latest',
  updatedFrom = '',
  updatedTo = '',
  signal,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    country,
    q,
    category,
    risk,
    sort,
    updatedFrom,
    updatedTo,
  });
  return fetchJson(`/api/recalls?${query}`, signal);
}

export const fetchRecallFilters = () => fetchJson('/api/recalls/filters');
export const fetchRecall = (source, id) =>
  fetchJson(
    `/api/recalls/${encodeURIComponent(source)}/${encodeURIComponent(id)}`,
  );

export function fetchProducts({
  page = 1,
  q = '',
  brand = '',
  category = '',
  signal,
} = {}) {
  const query = new URLSearchParams({ page, q, brand, category });
  return fetchJson(`/api/products?${query}`, signal);
}

export const createProduct = (data) =>
  fetchJson('/api/products', undefined, { method: 'POST', data });
export const updateProduct = (id, data) =>
  fetchJson(`/api/products/${encodeURIComponent(id)}`, undefined, {
    method: 'PUT',
    data,
  });
export const deleteProduct = (id) =>
  fetchJson(`/api/products/${encodeURIComponent(id)}`, undefined, {
    method: 'DELETE',
  });
export function fetchProductRecalls(id, { page = 1, q = '', signal } = {}) {
  const query = new URLSearchParams({ page, limit: 10, q });
  return fetchJson(
    `/api/products/${encodeURIComponent(id)}/recalls?${query}`,
    signal,
  );
}
