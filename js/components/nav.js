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

export function initNav() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  loadBanner();

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  function link(href, label) {
    const active = currentPath === href ? ' class="active"' : '';
    return `<a href="${href}"${active}>${label}</a>`;
  }

  nav.innerHTML = `
    ${link('index.html', 'HOME')}
    ${link('about-us.html', 'ABOUT US')}
    ${link('shop.html', 'SHOP')}
    ${link('blog.html', 'BLOG')}
    ${link('portfolio.html', 'PORTFOLIO')}
    ${link('contact-us.html', 'CONTACT US')}
  `;
}
