const retentionMilliseconds = 365 * 24 * 60 * 60 * 1000;
const personalCollections = ['products', 'watchlist'];

export async function ensureUserIndexes(database) {
  await Promise.all(
    ['users', ...personalCollections].map((name) =>
      database
        .collection(name)
        .createIndex(
          { expiresAt: 1 },
          { name: 'inactive_user_expiry', expireAfterSeconds: 0 },
        ),
    ),
  );
  await Promise.all(
    personalCollections.map((name) =>
      database.collection(name).createIndex({ userId: 1 }),
    ),
  );
}

export async function recordUserActivity(database, userId, now = new Date()) {
  const expiresAt = new Date(now.getTime() + retentionMilliseconds);

  // Remove expired records before renewing, even if MongoDB's TTL pass is late.
  await Promise.all(
    personalCollections.map((name) =>
      database
        .collection(name)
        .deleteMany({ userId, expiresAt: { $lte: now } }),
    ),
  );
  await Promise.all([
    database.collection('users').updateOne(
      { _id: userId },
      {
        $max: { lastSeenAt: now, expiresAt },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    ),
    ...personalCollections.map((name) =>
      database
        .collection(name)
        .updateMany(
          { userId, expiresAt: { $gt: now } },
          { $max: { expiresAt } },
        ),
    ),
  ]);

  return { userId, lastSeenAt: now, expiresAt };
}
