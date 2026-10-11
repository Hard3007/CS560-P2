async function fetchJson(url, signal) {
  const response = await fetch(url, { signal });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || 'Unable to load recall records.');
  return body;
}

export async function fetchRecalls({ page = 1, limit = 20, signal } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return fetchJson(`/api/recalls?${query}`, signal);
}
