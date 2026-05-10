export function formatPrice(amount) {
  if (amount == null) return '';
  return `R${Number(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

export function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Convert a title to a URL-safe slug.
export function toSlug(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
