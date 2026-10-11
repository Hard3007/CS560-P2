const storageKey = 'recallguard.userId';
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getUserId() {
  const storedId = localStorage.getItem(storageKey);
  if (storedId && uuidPattern.test(storedId)) return storedId;

  const userId = crypto.randomUUID();
  localStorage.setItem(storageKey, userId);
  return userId;
}

async function recordVisit() {
  const response = await fetch('/api/user', {
    method: 'POST',
    headers: { 'X-User-Id': getUserId() },
  });
  if (!response.ok) throw new Error('Unable to record this visit.');
}

recordVisit().catch(() => console.error('Unable to record this visit.'));
