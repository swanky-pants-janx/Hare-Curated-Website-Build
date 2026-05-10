import { getVisibleProducts, getProductCategories } from '../services/product.service.js';
import { initNav } from '../components/nav.js';
import { el, setHTML } from '../utils/dom.js';
import { formatPrice, formatDate } from '../utils/format.js';
import { escapeHTML } from '../utils/sanitize.js';

function productCardHTML(p) {
  return `
    <article class="product-block">
      <a href="/product.html?slug=${encodeURIComponent(p.slug)}" class="product-block-image">
        ${p.cover_image_url
          ? `<img src="${p.cover_image_url}" alt="${escapeHTML(p.name)}" loading="lazy">`
          : '<div class="product-image-placeholder"></div>'}
      </a>
      <div class="product-block-timestamp">
        ${p.category ? `<p class="product-block-category">${escapeHTML(p.category)}</p>` : '<p></p>'}
        ${p.price_from ? `<p class="product-block-price">From ${formatPrice(p.price_from)}</p>` : ''}
      </div>
      <div class="product-block-description">
        <h3><a href="/product.html?slug=${encodeURIComponent(p.slug)}">${escapeHTML(p.name)}</a></h3>
        ${p.description ? `<p>${escapeHTML(p.description)}</p>` : ''}
      </div>
      <div class="product-block-icon">
        <a href="/product.html?slug=${encodeURIComponent(p.slug)}" class="product-shop-link" aria-label="Shop ${escapeHTML(p.name)}">
          <span>Shop Now</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </article>
  `;
}

async function loadProducts(category = null) {
  const container = el('#product-display');
  const heading   = el('#shop-heading');
  if (!container) return;

  if (heading) {
    heading.textContent = category || 'Shop';
  }

  container.innerHTML = '<div class="blog-loading">Loading products…</div>';

  try {
    const products = await getVisibleProducts(category);

    if (!products.length) {
      container.innerHTML = `<p class="empty-state">No products${category ? ` in "${escapeHTML(category)}"` : ''} available right now.</p>`;
      return;
    }

    setHTML(container, products.map(productCardHTML).join(''));
  } catch (err) {
    container.innerHTML = '<p class="empty-state">Could not load products at this time.</p>';
    console.error(err);
  }
}

async function init() {
  await initNav();

  const params   = new URLSearchParams(window.location.search);
  const category = params.get('category') || null;

  // Build category filter buttons
  const filtersContainer = el('#shop-filters');
  if (filtersContainer) {
    try {
      const categories = await getProductCategories();
      if (categories.length) {
        const catButtons = categories.map((cat) =>
          `<button class="filter-btn${category === cat ? ' active' : ''}" data-category="${escapeHTML(cat)}">${escapeHTML(cat)}</button>`
        ).join('');
        // Update the "All" button active state
        const allBtn = filtersContainer.querySelector('[data-category=""]');
        if (allBtn) allBtn.classList.toggle('active', !category);
        allBtn.insertAdjacentHTML('afterend', catButtons);
      }
    } catch (_) {}

    filtersContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filtersContainer.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      loadProducts(btn.dataset.category || null);
    });
  }

  loadProducts(category);
}

init();
