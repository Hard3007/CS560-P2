import { Router, json } from 'express';
import {
  readProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  matchProductRecalls,
} from '../db/products.js';

export const productsRouter = Router();
productsRouter.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!req.user)
    return res.status(400).json({ error: 'X-User-Id is required.' });
  next();
});
productsRouter.use(json({ limit: '8kb' }));

const fieldLimits = {
  name: 160,
  brand: 80,
  category: 80,
  model: 100,
  country: 2,
};
function productFields(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object') return null;
  if (Object.keys(body).some((key) => !Object.hasOwn(fieldLimits, key)))
    return null;
  const fields = {};
  for (const [key, maximum] of Object.entries(fieldLimits)) {
    const value = body[key] ?? '';
    if (typeof value !== 'string' || value.trim().length > maximum) return null;
    fields[key] = value.trim();
  }
  return fields.name && ['', 'US', 'CA'].includes(fields.country)
    ? fields
    : null;
}

function pagination(query) {
  const { page = '1', limit = '20' } = query;
  if (
    typeof page !== 'string' ||
    typeof limit !== 'string' ||
    !/^[1-9]\d*$/.test(page) ||
    !/^[1-9]\d*$/.test(limit) ||
    !Number.isSafeInteger(Number(page) * Number(limit)) ||
    Number(limit) > 100
  )
    return null;
  return { page: Number(page), limit: Number(limit) };
}

productsRouter.param('id', (req, res, next, id) => {
  if (!/^[0-9a-f]{24}$/i.test(id))
    return res.status(400).json({ error: 'Invalid product identifier.' });
  next();
});

productsRouter.get('/', async (req, res) => {
  const pages = pagination(req.query);
  const { q = '', brand = '', category = '' } = req.query;
  if (
    !pages ||
    Object.keys(req.query).some(
      (key) => !['q', 'brand', 'category', 'page', 'limit'].includes(key),
    ) ||
    typeof q !== 'string' ||
    q.length > 160 ||
    typeof brand !== 'string' ||
    brand.length > 80 ||
    typeof category !== 'string' ||
    category.length > 80
  )
    return res
      .status(400)
      .json({ error: 'Choose valid filters and pagination.' });
  res.json(
    await readProducts(req.user.userId, {
      ...pages,
      q: q.trim(),
      brand: brand.trim(),
      category: category.trim(),
    }),
  );
});

productsRouter.post('/', async (req, res) => {
  const fields = productFields(req.body);
  if (!fields)
    return res
      .status(400)
      .json({ error: 'Enter a product name and valid fields.' });
  res.status(201).json(await createProduct(req.user, fields));
});

productsRouter.put('/:id', async (req, res) => {
  const fields = productFields(req.body);
  if (!fields)
    return res
      .status(400)
      .json({ error: 'Enter a product name and valid fields.' });
  const product = await updateProduct(req.user, req.params.id, fields);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json(product);
});

productsRouter.delete('/:id', async (req, res) => {
  if (!(await deleteProduct(req.user.userId, req.params.id)))
    return res.status(404).json({ error: 'Product not found.' });
  res.status(204).end();
});

productsRouter.get('/:id/recalls', async (req, res) => {
  const pages = pagination(req.query);
  const { q = '' } = req.query;
  if (
    !pages ||
    typeof q !== 'string' ||
    q.length > 160 ||
    Object.keys(req.query).some((key) => !['q', 'page', 'limit'].includes(key))
  )
    return res
      .status(400)
      .json({ error: 'Choose valid search and pagination.' });
  const result = await matchProductRecalls(
    req.user.userId,
    req.params.id,
    pages.page,
    pages.limit,
    q.trim(),
  );
  if (!result) return res.status(404).json({ error: 'Product not found.' });
  res.json(result);
});

productsRouter.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'Send a valid JSON product.' });
  if (error.type === 'entity.too.large')
    return res.status(413).json({ error: 'Product data is too large.' });
  res.status(503).json({ error: 'Product data is currently unavailable.' });
});
