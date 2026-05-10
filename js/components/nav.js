import { getProductCategories } from '../services/product.service.js';

// Renders the site nav into any element with id="site-nav".
// Highlights the active page link automatically.
// Builds a dynamic SHOP dropdown from live Supabase categories.
export async function initNav() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

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
        ${link('shop.html', 'SHOP')}
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
}
