import { getDatabase } from './connection.js';

const risks = [
  { value: 'fire', label: 'Fire', pattern: /\bfire\b|\b(flammab|ignit)/i },
  {
    value: 'burn',
    label: 'Burns',
    pattern: /\b(burns?|burning|scald\w*|thermal)\b/i,
  },
  { value: 'choking', label: 'Choking', pattern: /\b(chok|aspirat)/i },
  { value: 'ingestion', label: 'Ingestion', pattern: /\bingest/i },
  { value: 'fall', label: 'Falls', pattern: /\b(fall|tip.?over|collaps)/i },
  {
    value: 'cut',
    label: 'Cuts',
    pattern: /\blacerat|\b(cuts?|cutting)\b|\bsharp (edge|point)/i,
  },
  { value: 'drowning', label: 'Drowning', pattern: /\bdrown/i },
  { value: 'entrapment', label: 'Entrapment', pattern: /\bentrap/i },
  {
    value: 'suffocation',
    label: 'Suffocation',
    pattern: /\b(suffocat|asphyx|strangul)/i,
  },
  {
    value: 'electric',
    label: 'Electric shock',
    pattern: /\b(electric.?shock|electrocut)/i,
  },
  {
    value: 'chemical',
    label: 'Chemical',
    pattern: /\b(chemical|toxic|cadmium|phthalate)|\blead\b(?!\s+to\b)/i,
  },
  { value: 'crash', label: 'Crash', pattern: /\b(crash|collision)/i },
];

export const riskOptions = risks.map(({ value, label }) => ({ value, label }));
const anyRiskPattern = new RegExp(
  risks.map(({ pattern }) => `(?:${pattern.source})`).join('|'),
  'i',
);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function recallFilter({
  country,
  q,
  brand,
  category,
  risk,
  updatedFrom,
  updatedTo,
}) {
  const filter = {};
  if (country) filter.country = country;
  if (q) filter.searchText = { $regex: escapeRegex(q), $options: 'i' };
  if (brand)
    filter.$and = [
      {
        $or: ['brands', 'manufacturers', 'searchText', 'consumerContact'].map(
          (field) => ({
            [field]: { $regex: escapeRegex(brand), $options: 'i' },
          }),
        ),
      },
    ];
  if (category)
    filter.categories = { $regex: escapeRegex(category), $options: 'i' };
  if (updatedFrom || updatedTo) {
    filter.sourceUpdatedDate = {};
    if (updatedFrom) filter.sourceUpdatedDate.$gte = updatedFrom;
    if (updatedTo) filter.sourceUpdatedDate.$lte = updatedTo;
  }
  if (risk) {
    const pattern = risks.find((item) => item.value === risk).pattern;
    filter.$or = [
      { title: pattern },
      { title: { $not: anyRiskPattern }, hazards: pattern },
    ];
  }
  return filter;
}

export async function readRecallFilters() {
  const categories = await getDatabase()
    .collection('recalls')
    .distinct('categories', {}, { maxTimeMS: 5000 });
  return {
    categories: categories.filter(Boolean).sort((a, b) => a.localeCompare(b)),
    risks: riskOptions,
  };
}

export async function readRecall(source, sourceId) {
  return getDatabase()
    .collection('recalls')
    .findOne({ source, sourceId }, { maxTimeMS: 5000 });
}

export async function readRecalls({
  page,
  limit,
  sort = 'latest',
  ...filters
}) {
  const collection = getDatabase().collection('recalls');
  const filter = recallFilter(filters);
  const [items, total] = await Promise.all([
    collection
      .find(filter, {
        projection: {
          source: 1,
          sourceId: 1,
          country: 1,
          title: 1,
          products: 1,
          categories: 1,
          hazards: 1,
          sourceUpdatedDate: 1,
          recallDate: 1,
        },
      })
      .sort({ sourceUpdatedDate: sort === 'oldest' ? 1 : -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .maxTimeMS(5000)
      .toArray(),
    collection.countDocuments(filter, { maxTimeMS: 5000 }),
  ]);

  return {
    items: items.map((item) => {
      const titleRisks = risks.filter(({ pattern }) =>
        pattern.test(item.title),
      );
      const matched = titleRisks.length
        ? titleRisks
        : risks.filter(({ pattern }) => pattern.test(item.hazards.join(' ')));
      return { ...item, riskLabels: matched.map(({ label }) => label) };
    }),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
