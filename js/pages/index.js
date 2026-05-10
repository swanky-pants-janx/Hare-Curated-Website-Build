import { getActiveBanners } from '../services/banner.service.js';
import { getVisibleProducts } from '../services/product.service.js';
import { initNav } from '../components/nav.js';
import { el, setHTML } from '../utils/dom.js';
import { formatPrice } from '../utils/format.js';
import { escapeHTML } from '../utils/sanitize.js';

async function loadBanner() {
  const bannerEl = el('#site-banner');
  if (!bannerEl) return;

  try {
    const banners = await getActiveBanners();
    if (!banners.length) {
      bannerEl.style.display = 'none';
      return;
    }
    // Show the first active banner (sort_order determines priority).
    const b = banners[0];
    setHTML(bannerEl, `
      <p>${escapeHTML(b.text ?? '')}</p>
      ${b.button_label
        ? `<a href="${escapeHTML(b.button_url ?? '#')}">${escapeHTML(b.button_label)}</a>`
        : ''}
    `);
  } catch (err) {
    bannerEl.style.display = 'none';
    console.error(err);
  }
}

async function loadFeaturedProducts() {
  const grid    = el('#featured-products');
  const section = grid?.closest('.products-section');
  if (!grid) return;

  try {
    const products = await getVisibleProducts();
    const featured = products.slice(0, 5);
    if (!featured.length) {
      if (section) section.style.display = 'none';
      return;
    }
    setHTML(grid, featured.map((p) => `
      <article class="product-card">
        <div class="product-card-image">
          ${p.cover_image_url
            ? `<img src="${p.cover_image_url}" alt="${escapeHTML(p.name)}" loading="lazy">`
            : '<div class="product-image-placeholder"></div>'}
          <div class="product-card-overlay">
            <a href="/product.html?slug=${encodeURIComponent(p.slug)}" class="btn btn-gold-sm">View</a>
          </div>
        </div>
        <div class="product-card-body">
          <h3 class="product-name">${escapeHTML(p.name)}</h3>
          ${p.price_from ? `<p class="product-price">From ${formatPrice(p.price_from)}</p>` : ''}
        </div>
      </article>
    `).join(''));
  } catch (err) {
    console.error(err);
  }
}

initNav();
loadBanner();
loadFeaturedProducts();
