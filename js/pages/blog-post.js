import { getBlogBySlug } from '../services/blog.service.js';
import { el, setHTML } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';
import { escapeHTML } from '../utils/sanitize.js';

function renderBody(text) {
  if (!text) return '';
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHTML(para.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

async function init() {
  const container = el('#blog-post-content');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) {
    container.innerHTML = '<p>Post not found.</p>';
    return;
  }

  try {
    const post = await getBlogBySlug(slug);

    document.title = `${post.title} | Hare Curated`;

    setHTML(container, `
      ${post.cover_image_url
        ? `<img class="blog-post-cover" src="${post.cover_image_url}" alt="${escapeHTML(post.title)}">`
        : ''}
      <div class="blog-post-meta">
        <span>${formatDate(post.published_at)}</span>
      </div>
      <h1 class="blog-post-title">${escapeHTML(post.title)}</h1>
      <div class="blog-post-body">${renderBody(post.body)}</div>
      <div class="blog-post-back">
        <a href="/blog.html">&larr; Back to Blog</a>
      </div>
    `);
  } catch (err) {
    container.innerHTML = '<p>Post not found or unavailable.</p>';
    console.error(err);
  }
}

init();
