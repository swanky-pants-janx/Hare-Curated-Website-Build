import { getVisibleProducts } from '../services/product.service.js';
import { el, setHTML } from '../utils/dom.js';
import { formatPrice, escapeHTML } from '../utils/format.js';
import { escapeHTML as escape } from '../utils/sanitize.js';

async function init() {
  const grid = el('#product-grid');
  if (!grid) return;

  grid.textContent = 'Loading...';

  try {
    const products = await getVisibleProducts();

    if (!products.length) {
      grid.innerHTML = '<p class="empty-state">No products available right now. Check back soon.</p>';
      return;
    }

    setHTML(grid, products.map((p) => `
      <article class="product-card">
        ${p.cover_image_url
          ? `<a href="/product.html?slug=${encodeURIComponent(p.slug)}">
               <img class="product-card-image" src="${p.cover_image_url}" alt="${escape(p.name)}">
             </a>`
          : ''}
        <div class="product-card-body">
          ${p.category ? `<p class="product-card-category">${escape(p.category)}</p>` : ''}
          <h2 class="product-card-name">
            <a href="/product.html?slug=${encodeURIComponent(p.slug)}">${escape(p.name)}</a>
          </h2>
          ${p.price_from ? `<p class="product-card-price">From ${formatPrice(p.price_from)}</p>` : ''}
          <a class="product-card-link" href="/product.html?slug=${encodeURIComponent(p.slug)}">Shop Now</a>
        </div>
      </article>
    `).join(''));
  } catch (err) {
    grid.textContent = 'Could not load products at this time.';
    console.error(err);
  }
}

init();
