import { getDatabase } from './connection.js';

export async function readRecalls({ page, limit }) {
  const collection = getDatabase().collection('recalls');
  const [items, total] = await Promise.all([
    collection
      .find({})
      .sort({ sourceUpdatedDate: -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .maxTimeMS(5000)
      .toArray(),
    collection.countDocuments({}, { maxTimeMS: 5000 }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
