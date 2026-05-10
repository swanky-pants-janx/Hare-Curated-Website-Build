import { getProductBySlug } from '../services/product.service.js';
import { el, setHTML } from '../utils/dom.js';
import { formatPrice } from '../utils/format.js';
import { escapeHTML } from '../utils/sanitize.js';

async function init() {
  const container = el('#product-detail-content');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) {
    container.innerHTML = '<p>Product not found.</p>';
    return;
  }

  try {
    const p = await getProductBySlug(slug);

    document.title = `${p.name} | Hare Curated`;

    setHTML(container, `
      ${p.cover_image_url
        ? `<img class="product-detail-image" src="${p.cover_image_url}" alt="${escapeHTML(p.name)}">`
        : ''}
      <div class="product-detail-info">
        ${p.category ? `<p class="product-detail-category">${escapeHTML(p.category)}</p>` : ''}
        <h1 class="product-detail-name">${escapeHTML(p.name)}</h1>
        ${p.price_from ? `<p class="product-detail-price">From ${formatPrice(p.price_from)}</p>` : ''}
        ${p.description ? `<div class="product-detail-description">${escapeHTML(p.description)}</div>` : ''}
        <a class="btn-back" href="/shop.html">&larr; Back to Shop</a>
      </div>
    `);
  } catch (err) {
    container.innerHTML = '<p>Product not found or unavailable.</p>';
    console.error(err);
  }
}

init();
