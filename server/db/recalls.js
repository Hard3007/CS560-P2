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

export async function readRecalls({ page, limit }) {
  const collection = getDatabase().collection('recalls');
  const [items, total] = await Promise.all([
    collection
      .find(
        {},
        {
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
        },
      )
      .sort({ sourceUpdatedDate: -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .maxTimeMS(5000)
      .toArray(),
    collection.countDocuments({}, { maxTimeMS: 5000 }),
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
