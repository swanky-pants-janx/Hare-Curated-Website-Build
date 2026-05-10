// Strip HTML tags from user-supplied strings before inserting into the DOM.
// Use textContent for plain text fields; this is a fallback for rich text.
export function stripTags(str) {
  return String(str ?? '').replace(/<[^>]*>/g, '');
}

// Encode for safe insertion into innerHTML where plain text is expected.
export function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Validate email format.
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? ''));
}

// Clamp a string to a maximum length.
export function clamp(str, max = 500) {
  return String(str ?? '').slice(0, max);
}
