import { requireAuth } from './auth-guard.js';
import { signOut } from '../services/auth.service.js';
import { el, on, setText } from '../utils/dom.js';
import { initBlogManager } from './blog-manager.js';
import { initProductManager } from './product-manager.js';
import { initBannerManager } from './banner-manager.js';
import { initQuoteViewer } from './quote-viewer.js';
import { initPitchDeckManager } from './pitch-deck-manager.js';

const PANELS = ['blog', 'products', 'banners', 'quotes', 'pitch-decks'];

let currentPanel = null;
const initialised = new Set();

function showPanel(name) {
  PANELS.forEach((p) => {
    const el = document.getElementById(`panel-${p}`);
    if (el) el.style.display = p === name ? 'block' : 'none';
  });

  document.querySelectorAll('.menu-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.panel === name);
  });

  if (!initialised.has(name)) {
    initialised.add(name);
    switch (name) {
      case 'blog':       initBlogManager(); break;
      case 'products':   initProductManager(); break;
      case 'banners':    initBannerManager(); break;
      case 'quotes':     initQuoteViewer(); break;
      case 'pitch-decks': initPitchDeckManager(); break;
    }
  }

  currentPanel = name;
  // Persist last-viewed panel so a refresh returns to the same view.
  sessionStorage.setItem('hc-dashboard-panel', name);
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  setText(el('#admin-email'), session.user.email);

  // Wire sidebar navigation.
  document.querySelectorAll('.menu-link').forEach((link) => {
    on(link, 'click', (e) => {
      e.preventDefault();
      showPanel(link.dataset.panel);
    });
  });

  // Logout.
  on(el('#logout-btn'), 'click', async () => {
    await signOut();
    window.location.href = '/login.html';
  });

  // Restore last panel or default to blog.
  const saved = sessionStorage.getItem('hc-dashboard-panel') ?? 'blog';
  showPanel(PANELS.includes(saved) ? saved : 'blog');
}

init();
