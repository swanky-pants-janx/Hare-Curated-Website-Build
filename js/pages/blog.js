import { getPublishedBlogs } from '../services/blog.service.js';
import { el, setHTML } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';
import { escapeHTML } from '../utils/sanitize.js';

async function init() {
  const grid = el('#blog-grid');
  if (!grid) return;

  grid.textContent = 'Loading...';

  try {
    const posts = await getPublishedBlogs();

    if (!posts.length) {
      grid.innerHTML = '<p class="empty-state">No posts published yet. Check back soon.</p>';
      return;
    }

    setHTML(grid, posts.map((post) => `
      <article class="blog-card">
        ${post.cover_image_url
          ? `<a href="/blog-post.html?slug=${encodeURIComponent(post.slug)}">
               <img class="blog-card-image" src="${post.cover_image_url}" alt="${escapeHTML(post.title)}">
             </a>`
          : ''}
        <div class="blog-card-body">
          <p class="blog-card-date">${formatDate(post.published_at)}</p>
          <h2 class="blog-card-title">
            <a href="/blog-post.html?slug=${encodeURIComponent(post.slug)}">${escapeHTML(post.title)}</a>
          </h2>
          ${post.excerpt ? `<p class="blog-card-excerpt">${escapeHTML(post.excerpt)}</p>` : ''}
          <a class="blog-card-link" href="/blog-post.html?slug=${encodeURIComponent(post.slug)}">Read more</a>
        </div>
      </article>
    `).join(''));
  } catch (err) {
    grid.textContent = 'Could not load posts at this time.';
    console.error(err);
  }
}

init();
