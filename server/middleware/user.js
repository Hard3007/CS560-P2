import { getDatabase } from '../db/connection.js';
import { recordUserActivity } from '../db/users.js';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function trackUserActivity(req, res, next) {
  const userId = req.get('X-User-Id');
  if (userId === undefined) return next();
  if (!uuidPattern.test(userId)) {
    return res.status(400).json({ error: 'X-User-Id must be a valid UUID.' });
  }

  res.set('Cache-Control', 'no-store');
  try {
    req.user = await recordUserActivity(getDatabase(), userId.toLowerCase());
    next();
  } catch {
    res.status(503).json({ error: 'User data is currently unavailable.' });
  }
}
