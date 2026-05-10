import { getVisibleProducts } from '../services/product.service.js';
import { initNav } from '../components/nav.js';
import { el, setHTML } from '../utils/dom.js';
import { formatPrice } from '../utils/format.js';
import { escapeHTML } from '../utils/sanitize.js';

async function init() {
  await initNav();

  const grid = el('#product-grid');
  const heading = el('#shop-heading');
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');

  if (heading) {
    heading.textContent = category ? category : 'Shop';
  }

  grid.textContent = 'Loading...';

  try {
    const products = await getVisibleProducts(category);

    if (!products.length) {
      grid.innerHTML = `<p class="empty-state">No products ${category ? `in "${escapeHTML(category)}"` : 'available'} right now.</p>`;
      return;
    }

    setHTML(grid, products.map((p) => `
      <article class="product-card">
        ${p.cover_image_url
          ? `<a href="/product.html?slug=${encodeURIComponent(p.slug)}">
               <img class="product-card-image" src="${p.cover_image_url}" alt="${escapeHTML(p.name)}">
             </a>`
          : ''}
        <div class="product-card-body">
          ${p.category ? `<p class="product-card-category">${escapeHTML(p.category)}</p>` : ''}
          <h2 class="product-card-name">
            <a href="/product.html?slug=${encodeURIComponent(p.slug)}">${escapeHTML(p.name)}</a>
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
