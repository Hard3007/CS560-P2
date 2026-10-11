import { ObjectId } from 'mongodb';
import { getDatabase } from './connection.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const productFields = { userId: 0, expiresAt: 0 };
const owned = (userId) => ({ userId, expiresAt: { $gt: new Date() } });

export async function readProducts(
  userId,
  { q, brand, category, page, limit },
) {
  const collection = getDatabase().collection('products');
  const owner = owned(userId);
  const filter = { ...owner };
  if (q) {
    filter.$or = ['name', 'brand', 'model', 'category'].map((field) => ({
      [field]: { $regex: escapeRegex(q), $options: 'i' },
    }));
  }
  if (brand) filter.brand = brand;
  if (category) filter.category = category;
  const [items, total, brands, categories] = await Promise.all([
    collection
      .find(filter, { projection: productFields })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .maxTimeMS(5000)
      .toArray(),
    collection.countDocuments(filter, { maxTimeMS: 5000 }),
    collection.distinct('brand', owner, { maxTimeMS: 5000 }),
    collection.distinct('category', owner, { maxTimeMS: 5000 }),
  ]);
  const options = (values) =>
    values.filter(Boolean).sort((a, b) => a.localeCompare(b));
  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    filters: { brands: options(brands), categories: options(categories) },
  };
}

export async function createProduct(user, fields) {
  const now = new Date();
  const product = {
    ...fields,
    userId: user.userId,
    expiresAt: user.expiresAt,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await getDatabase()
    .collection('products')
    .insertOne(product);
  return { ...fields, _id: insertedId, createdAt: now, updatedAt: now };
}

export async function updateProduct(user, id, fields) {
  return getDatabase()
    .collection('products')
    .findOneAndUpdate(
      { ...owned(user.userId), _id: new ObjectId(id) },
      {
        $set: { ...fields, updatedAt: new Date() },
        $max: { expiresAt: user.expiresAt },
      },
      { returnDocument: 'after', projection: productFields },
    );
}

export async function deleteProduct(userId, id) {
  const result = await getDatabase()
    .collection('products')
    .deleteOne({ ...owned(userId), _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

export async function matchProductRecalls(userId, id, page, limit, q = '') {
  const database = getDatabase();
  const product = await database
    .collection('products')
    .findOne({ ...owned(userId), _id: new ObjectId(id) });
  if (!product) return null;
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'and',
    'for',
    'with',
    'of',
    'my',
  ]);
  const terms = (value) => [
    ...new Set(
      value
        .normalize('NFKC')
        .toLowerCase()
        .match(/[\p{L}\p{N}]+(?:[-.][\p{L}\p{N}]+)*/gu)
        ?.filter((word) => !stopWords.has(word)) || [],
    ),
  ];
  const keywords = terms(product.name);
  const details = [
    ...terms(product.brand || '').map((word) => ({
      word,
      includeContact: true,
    })),
    ...terms(product.model || '').map((word) => ({
      word,
      includeContact: false,
    })),
  ].filter(({ word }) => !keywords.includes(word));
  if (!keywords.length) return { items: [], total: 0, page, totalPages: 0 };

  const pattern = (word) =>
    word.length < 4
      ? `(?:^|[^\\p{L}\\p{N}])${escapeRegex(word)}(?=$|[^\\p{L}\\p{N}])`
      : escapeRegex(word);
  const textFilter = (regex) => ({
    $or: ['searchText', 'consumerContact'].map((field) => ({
      [field]: { $regex: regex, $options: 'i' },
    })),
  });

  const filter = {
    ...(product.country ? { country: product.country } : {}),
    $and: keywords.map((word) => ({
      searchText: { $regex: pattern(word), $options: 'i' },
    })),
  };
  if (q) filter.$and.push(textFilter(escapeRegex(q)));
  const collection = database.collection('recalls');
  const [items, total] = await Promise.all([
    collection
      .aggregate([
        { $match: filter },
        {
          $set: {
            detailsMatch: details.length
              ? {
                  $and: details.map(({ word, includeContact }) => ({
                    $regexMatch: {
                      input: includeContact
                        ? {
                            $concat: [
                              { $ifNull: ['$searchText', ''] },
                              ' ',
                              { $ifNull: ['$consumerContact', ''] },
                            ],
                          }
                        : { $ifNull: ['$searchText', ''] },
                      regex: pattern(word),
                      options: 'i',
                    },
                  })),
                }
              : { $literal: false },
          },
        },
        { $sort: { detailsMatch: -1, sourceUpdatedDate: -1, _id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            source: 1,
            sourceId: 1,
            country: 1,
            title: 1,
            sourceUpdatedDate: 1,
          },
        },
      ])
      .maxTimeMS(5000)
      .toArray(),
    collection.countDocuments(filter, { maxTimeMS: 5000 }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) };
}
