async function fetchJson(url, signal) {
  const response = await fetch(url, { signal });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || 'Unable to load recall records.');
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
