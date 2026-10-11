export const countries = {
  US: {
    name: 'United States',
    flag: '/assets/flag-us.svg',
    source: 'U.S. CPSC',
  },
  CA: { name: 'Canada', flag: '/assets/flag-ca.svg', source: 'Health Canada' },
};

export function formatDate(value) {
  if (!value) return 'Not provided';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export function safeUrl(value, official = false) {
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    if (
      official &&
      (url.protocol !== 'https:' ||
        !['www.cpsc.gov', 'cpsc.gov', 'recalls-rappels.canada.ca'].includes(
          url.hostname,
        ))
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
