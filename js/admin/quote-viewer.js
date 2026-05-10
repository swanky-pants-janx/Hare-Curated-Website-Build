import { getAllInquiries } from '../services/quote.service.js';
import { el, setHTML } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';
import { escapeHTML } from '../utils/sanitize.js';

export async function initQuoteViewer() {
  await loadList();
}

async function loadList() {
  const list = el('#quotes-list');
  list.textContent = 'Loading...';
  try {
    const inquiries = await getAllInquiries();
    if (!inquiries.length) {
      list.innerHTML = '<p class="empty-state">No inquiries received yet.</p>';
      return;
    }
    setHTML(list, inquiries.map((q) => `
      <div class="item-row inquiry-row">
        <div class="item-info">
          <strong>${escapeHTML(q.visitor_name ?? 'Anonymous')}</strong>
          <span class="item-meta">${escapeHTML(q.visitor_email)} &middot; ${formatDate(q.created_at)}</span>
          <details class="inquiry-responses">
            <summary>View Answers</summary>
            <pre>${escapeHTML(JSON.stringify(q.responses, null, 2))}</pre>
          </details>
          ${q.pitch_deck_url
            ? `<a class="btn-secondary btn-sm" href="${q.pitch_deck_url}" target="_blank" rel="noopener">View Pitch Deck</a>`
            : '<span class="badge badge-grey">No deck matched</span>'}
        </div>
      </div>
    `).join(''));
  } catch (err) {
    list.textContent = 'Failed to load inquiries.';
    console.error(err);
  }
}
