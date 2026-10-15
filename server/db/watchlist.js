import { ObjectId } from 'mongodb';
import { getDatabase } from './connection.js';
const projection = { userId: 0, expiresAt: 0 };
const owned = (userId) => ({ userId, expiresAt: { $gt: new Date() } });
export async function readWatchlist(userId) {
  const database = getDatabase();
  const items = await database
    .collection('watchlist')
    .find(owned(userId), { projection })
    .sort({ createdAt: -1, _id: -1 })
    .maxTimeMS(5000)
    .toArray();
  if (!items.length) return items;
  // Resolve product names from shared recalls, including previously saved entries.
  const recalls = await database
    .collection('recalls')
    .find(
      { $or: items.map(({ source, sourceId }) => ({ source, sourceId })) },
      { projection: { source: 1, sourceId: 1, products: 1, title: 1 } },
    )
    .maxTimeMS(5000)
    .toArray();
  const names = new Map(
    recalls.map((recall) => [
      `${recall.source}:${recall.sourceId}`,
      (recall.products || []).map((product) => product.name).join(', ') ||
        recall.title,
    ]),
  );
  return items.map((item) => ({
    ...item,
    displayName: names.get(`${item.source}:${item.sourceId}`) || item.title,
  }));
}
export async function saveRecall(user, recall) {
  const key = {
    userId: user.userId,
    source: recall.source,
    sourceId: recall.sourceId,
  };
  const now = new Date();
  const collection = getDatabase().collection('watchlist');
  const update = {
    $setOnInsert: {
      title: recall.title,
      status: 'Reviewing',
      notes: '',
      createdAt: now,
      updatedAt: now,
    },
    $max: { expiresAt: user.expiresAt },
  };
  try {
    return await collection.findOneAndUpdate(key, update, {
      upsert: true,
      returnDocument: 'after',
      projection,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return collection.findOneAndUpdate(
      key,
      { $max: { expiresAt: user.expiresAt } },
      { returnDocument: 'after', projection },
    );
  }
}
export async function updateWatchlist(userId, id, fields) {
  return getDatabase()
    .collection('watchlist')
    .findOneAndUpdate(
      { ...owned(userId), _id: new ObjectId(id) },
      { $set: { ...fields, updatedAt: new Date() } },
      { returnDocument: 'after', projection },
    );
}
export async function deleteWatchlist(userId, id) {
  return (
    (
      await getDatabase()
        .collection('watchlist')
        .deleteOne({ ...owned(userId), _id: new ObjectId(id) })
    ).deletedCount > 0
  );
}
