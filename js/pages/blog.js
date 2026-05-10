import { getPublishedBlogs } from '../services/blog.service.js';
import { initNav } from '../components/nav.js';
import { el, setHTML } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';
import { escapeHTML } from '../utils/sanitize.js';

function featuredPostHTML(post) {
  return `
    <div class="main-blog-display">
      <div class="main-blog-content">
        <p class="blog-featured-date">${formatDate(post.published_at)}</p>
        <h2 class="blog-featured-title">${escapeHTML(post.title)}</h2>
        ${post.excerpt ? `<p class="blog-featured-excerpt">${escapeHTML(post.excerpt)}</p>` : ''}
        <a href="/blog-post.html?slug=${encodeURIComponent(post.slug)}" class="btn btn-rose">Read Full Article</a>
      </div>
      <div class="main-blog-image">
        ${post.cover_image_url
          ? `<img src="${post.cover_image_url}" alt="${escapeHTML(post.title)}" loading="eager">`
          : '<div class="blog-image-placeholder"></div>'}
      </div>
    </div>
  `;
}

function blogCardHTML(post) {
  return `
    <article class="blog-block">
      <a href="/blog-post.html?slug=${encodeURIComponent(post.slug)}" class="blog-block-image">
        ${post.cover_image_url
          ? `<img src="${post.cover_image_url}" alt="${escapeHTML(post.title)}" loading="lazy">`
          : '<div class="blog-image-placeholder"></div>'}
      </a>
      <div class="blog-block-timestamp">
        <p>${formatDate(post.published_at)}</p>
      </div>
      <div class="blog-block-description">
        <h3><a href="/blog-post.html?slug=${encodeURIComponent(post.slug)}">${escapeHTML(post.title)}</a></h3>
        ${post.excerpt ? `<p>${escapeHTML(post.excerpt)}</p>` : ''}
      </div>
      <div class="blog-block-icon">
        <a href="/blog-post.html?slug=${encodeURIComponent(post.slug)}" class="blog-read-link" aria-label="Read ${escapeHTML(post.title)}">
          <span>Read More</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </article>
  `;
}

async function init() {
  await initNav();

  const featuredContainer = el('#blog-featured');
  const gridContainer     = el('#blogs-display');
  if (!featuredContainer || !gridContainer) return;

  try {
    const posts = await getPublishedBlogs();

    if (!posts.length) {
      featuredContainer.innerHTML = '<p class="empty-state">No posts published yet. Check back soon.</p>';
      gridContainer.innerHTML = '';
      return;
    }

    const [featured, ...rest] = posts;

    setHTML(featuredContainer, featuredPostHTML(featured));

    if (rest.length) {
      setHTML(gridContainer, rest.map(blogCardHTML).join(''));
    } else {
      gridContainer.innerHTML = '';
    }
  } catch (err) {
    featuredContainer.innerHTML = '<p class="empty-state">Could not load posts at this time.</p>';
    console.error(err);
  }
}

init();
