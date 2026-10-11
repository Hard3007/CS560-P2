export async function fetchRecalls({ page = 1, limit = 20 } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const response = await fetch(`/api/recalls?${query}`);
  if (!response.ok) throw new Error('Unable to load recall records.');
  return response.json();
}
