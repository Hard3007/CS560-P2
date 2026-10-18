import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createWatchlistRouter } from '../server/routes/watchlist.js';
import { recallFilter } from '../server/db/recalls.js';

test('watchlist HTTP CRUD, pagination, validation and owner isolation', async () => {
  const items = new Map();
  const id = '0123456789abcdef01234567';
  const repository = {
    async readWatchlist(userId, { page, limit }) {
      const records = [...items.values()].filter(
        (item) => item.userId === userId,
      );
      return {
        items: records.slice((page - 1) * limit, page * limit),
        total: records.length,
        page,
        limit,
        totalPages: Math.ceil(records.length / limit),
      };
    },
    async saveRecall(user, recall) {
      if (!items.has(user.userId))
        items.set(user.userId, {
          _id: id,
          ...recall,
          userId: user.userId,
          status: 'Reviewing',
          notes: '',
        });
      return items.get(user.userId);
    },
    async updateWatchlist(userId, itemId, fields) {
      const item = items.get(userId);
      if (!item || item._id !== itemId) return null;
      Object.assign(item, fields);
      return item;
    },
    async deleteWatchlist(userId, itemId) {
      if (items.get(userId)?._id !== itemId) return false;
      return items.delete(userId);
    },
  };
  const app = express();
  app.use((req, _res, next) => {
    if (req.get('X-User-Id')) req.user = { userId: req.get('X-User-Id') };
    next();
  });
  app.use(
    '/api/watchlist',
    createWatchlistRouter(repository, async (source, sourceId) =>
      sourceId === '1' ? { source, sourceId, title: 'Test notice' } : null,
    ),
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/watchlist`;
  async function request(path = '', method = 'GET', data, user = 'alice') {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(user ? { 'X-User-Id': user } : {}),
        'Content-Type': 'application/json',
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    return {
      status: res.status,
      body: res.status === 204 ? null : await res.json(),
    };
  }
  try {
    assert.equal((await request('', 'GET', undefined, '')).status, 400);
    assert.deepEqual((await request()).body.items, []);
    assert.equal(
      (await request('', 'POST', { source: 'cpsc', sourceId: '1' })).status,
      201,
    );
    assert.equal(
      (
        await request(`/${id}`, 'PATCH', {
          status: 'Resolved',
          notes: '<script>literal text</script>',
        })
      ).body.status,
      'Resolved',
    );
    assert.equal(
      (await request('', 'POST', { source: 'cpsc', sourceId: '1' })).body
        .status,
      'Resolved',
    );
    assert.equal((await request()).body.items.length, 1);
    assert.equal(
      (await request('', 'GET', undefined, 'bob')).body.items.length,
      0,
    );
    assert.equal(
      (await request(`/${id}`, 'PATCH', { notes: 'other' }, 'bob')).status,
      404,
    );
    assert.equal(
      (await request(`/${id}`, 'DELETE', undefined, 'bob')).status,
      404,
    );
    for (const data of [
      { status: 'Bad' },
      { notes: 'x'.repeat(2001) },
      { userId: 'bob' },
      {},
      [],
      { notes: null },
    ])
      assert.equal((await request(`/${id}`, 'PATCH', data)).status, 400);
    assert.equal((await request('/bad', 'DELETE')).status, 400);
    assert.equal(
      (await request('', 'POST', { source: 'cpsc', sourceId: '2' })).status,
      404,
    );
    assert.equal(
      (await request('', 'POST', { source: 'cpsc', sourceId: 1 })).status,
      400,
    );
    const malformed = await fetch(base, {
      method: 'POST',
      headers: { 'X-User-Id': 'alice', 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.equal((await request(`/${id}`, 'DELETE')).status, 204);
    assert.equal((await request(`/${id}`, 'DELETE')).status, 404);
    assert.deepEqual((await request()).body.items, []);
    for (let index = 0; index < 45; index++)
      items.set('paged-' + index, { _id: String(index), userId: 'alice' });
    const first = await request();
    assert.equal(first.body.total, 45);
    assert.equal(first.body.limit, 20);
    assert.equal(first.body.totalPages, 3);
    assert.equal(first.body.items.length, 20);
    const second = await request('?page=2&limit=20');
    assert.equal(second.body.page, 2);
    assert.equal(second.body.items.length, 20);
    assert.equal(second.body.items[0]._id, '20');
    const last = await request('?page=3&limit=20');
    assert.equal(last.body.items.length, 5);
    assert.equal(last.body.items[0]._id, '40');
    assert.deepEqual((await request('?page=4')).body.items, []);
    assert.equal((await request('', 'GET', undefined, 'bob')).body.total, 0);
    for (const query of [
      '?page=0',
      '?page=-1',
      '?page=1.5',
      '?page=1&page=2',
      '?limit=0',
      '?limit=101',
      '?limit=20&limit=10',
      '?page=9007199254740991&limit=100',
      '?userId=bob',
    ])
      assert.equal((await request(query)).status, 400, query);
    items.clear();
    repository.readWatchlist = async () => {
      throw new Error('secret should not leak');
    };
    assert.deepEqual(await request(), {
      status: 503,
      body: { error: 'Watchlist data is currently unavailable.' },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('recall filters combine escaped searches, risk and dates', () => {
  const filter = recallFilter({
    country: 'US',
    q: 'a.*',
    brand: 'ACME+',
    category: 'Baby',
    risk: 'fire',
    updatedFrom: '2026-01-01',
    updatedTo: '2026-10-14',
  });
  assert.equal(filter.searchText.$regex, 'a\\.\\*');
  assert.equal(filter.$and[0].$or[0].brands.$regex, 'ACME\\+');
  assert.equal(filter.country, 'US');
  assert.equal(filter.categories.$regex, 'Baby');
  assert.equal(filter.$or[0].title.test('Fire hazard'), true);
  assert.deepEqual(filter.sourceUpdatedDate, {
    $gte: '2026-01-01',
    $lte: '2026-10-14',
  });
});
