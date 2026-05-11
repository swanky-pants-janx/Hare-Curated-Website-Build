import { getProductCategories } from '../services/product.service.js';
import { getActiveBanners } from '../services/banner.service.js';
import { escapeHTML } from '../utils/sanitize.js';

async function loadBanner() {
  const bannerEl = document.getElementById('site-banner');
  if (!bannerEl) return;
  try {
    const banners = await getActiveBanners();
    if (!banners.length) return;
    const b = banners[0];
    bannerEl.innerHTML = `
      <p>${escapeHTML(b.text ?? '')}</p>
      ${b.button_label ? `<a href="${escapeHTML(b.button_url ?? '#')}">${escapeHTML(b.button_label)}</a>` : ''}
    `;
    bannerEl.classList.add('is-active');
  } catch (_) {}
}

// Renders the site nav into any element with id="site-nav".
// Highlights the active page link automatically.
// Builds a dynamic SHOP dropdown from live Supabase categories.
export async function initNav() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  loadBanner();

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  function link(href, label, extra = '') {
    const active = currentPath === href ? ' class="active"' : '';
    return `<a href="${href}"${active}${extra}>${label}</a>`;
  }

  // Fetch categories; fall back gracefully if Supabase is unreachable.
  let categories = [];
  try {
    categories = await getProductCategories();
  } catch (_) {}

  const shopDropdown = categories.length
    ? `<div class="nav-dropdown">
        <div class="nav-dropdown-trigger">
          ${link('shop.html', 'SHOP')}
          <button class="nav-dropdown-chevron" aria-label="Toggle shop menu" aria-expanded="false">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="nav-dropdown-menu">
          <a href="shop.html">All Products</a>
          ${categories.map((cat) =>
            `<a href="shop.html?category=${encodeURIComponent(cat)}">${cat}</a>`
          ).join('')}
        </div>
      </div>`
    : link('shop.html', 'SHOP');

  nav.innerHTML = `
    ${link('index.html', 'HOME')}
    ${link('about-us.html', 'ABOUT US')}
    ${shopDropdown}
    ${link('blog.html', 'BLOG')}
    ${link('portfolio.html', 'PORTFOLIO')}
    ${link('contact-us.html', 'CONTACT US')}
  `;

  // Mobile tap-to-toggle for the shop dropdown
  const chevronBtn = nav.querySelector('.nav-dropdown-chevron');
  if (chevronBtn) {
    chevronBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dropdown = chevronBtn.closest('.nav-dropdown');
      const isOpen = dropdown.classList.toggle('is-open');
      chevronBtn.setAttribute('aria-expanded', isOpen);
    });
  }
}
