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
  const grid = el('#featured-products');
  if (!grid) return;

  try {
    const products = await getVisibleProducts();
    // Show up to 5 featured products on the homepage.
    const featured = products.slice(0, 5);
    if (!featured.length) {
      grid.style.display = 'none';
      return;
    }
    setHTML(grid, featured.map((p) => `
      <a class="featured-product-card" href="/product.html?slug=${encodeURIComponent(p.slug)}">
        ${p.cover_image_url
          ? `<img src="${p.cover_image_url}" alt="${escapeHTML(p.name)}">`
          : ''}
        <div class="featured-product-info">
          <span>${escapeHTML(p.name)}</span>
          ${p.price_from ? `<span>From ${formatPrice(p.price_from)}</span>` : ''}
        </div>
      </a>
    `).join(''));
  } catch (err) {
    console.error(err);
  }
}

initNav();
loadBanner();
loadFeaturedProducts();
