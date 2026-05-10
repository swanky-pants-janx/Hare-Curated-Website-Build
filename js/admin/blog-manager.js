import {
  getAllBlogs, createBlog, updateBlog, deleteBlog, toggleBlogPublished,
} from '../services/blog.service.js';
import { uploadImage } from '../services/storage.service.js';
import { el, on, setHTML, showError, clearError } from '../utils/dom.js';
import { toSlug } from '../utils/format.js';
import { escapeHTML, clamp } from '../utils/sanitize.js';
import { formatDate } from '../utils/format.js';

let blogs = [];
let editingId = null;
let quill = null;

function initQuill() {
  if (quill) return;

  const toolbarOptions = [
    [{ header: [1, 2, 3, false] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ script: 'sub' }, { script: 'super' }],
    ['table-insert'],
    ['clean'],
  ];

  quill = new Quill('#blog-body-editor', {
    theme: 'snow',
    modules: {
      toolbar: {
        container: toolbarOptions,
        handlers: {
          'table-insert': insertTable,
        },
      },
    },
    placeholder: 'Write your blog post here…',
  });

  // Style the custom table button
  const tableBtn = document.querySelector('.ql-table-insert');
  if (tableBtn) {
    tableBtn.innerHTML = '&#x229E; Table';
    tableBtn.title = 'Insert Table';
  }
}

function insertTable() {
  const rows = parseInt(prompt('Number of rows:', '3'), 10);
  const cols = parseInt(prompt('Number of columns:', '3'), 10);
  if (!rows || !cols || rows < 1 || cols < 1) return;

  let html = '<table border="1" style="border-collapse:collapse;width:100%;margin:8px 0;">';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      const cell = r === 0 ? 'th' : 'td';
      html += `<${cell} style="border:1px solid #ccc;padding:6px 10px;">&nbsp;</${cell}>`;
    }
    html += '</tr>';
  }
  html += '</table><p><br></p>';

  const range = quill.getSelection(true);
  quill.clipboard.dangerouslyPasteHTML(range.index, html);
}

export async function initBlogManager() {
  on(el('#blog-new-btn'), 'click', () => openForm());
  on(el('#blog-cancel-btn'), 'click', closeForm);
  on(el('#blog-title'), 'input', () => {
    el('#blog-slug').value = toSlug(el('#blog-title').value);
  });
  on(el('#blog-image-file'), 'change', handleImagePreview);
  on(el('#blog-form'), 'submit', handleSubmit);

  await loadList();
}

async function loadList() {
  const list = el('#blog-list');
  list.textContent = 'Loading...';
  try {
    blogs = await getAllBlogs();
    renderList();
  } catch (err) {
    list.textContent = 'Failed to load posts.';
    console.error(err);
  }
}

function renderList() {
  const list = el('#blog-list');
  if (!blogs.length) {
    list.innerHTML = '<p class="empty-state">No blog posts yet. Create your first one.</p>';
    return;
  }
  setHTML(list, blogs.map((post) => `
    <div class="item-row" data-id="${post.id}">
      <div class="item-info">
        <strong>${escapeHTML(post.title)}</strong>
        <span class="item-meta">${formatDate(post.created_at)} &middot; ${post.published ? '<span class="badge badge-green">Published</span>' : '<span class="badge badge-grey">Draft</span>'}</span>
      </div>
      <div class="item-actions">
        <button class="btn-secondary btn-sm blog-toggle-btn" data-id="${post.id}" data-published="${post.published}">
          ${post.published ? 'Unpublish' : 'Publish'}
        </button>
        <button class="btn-secondary btn-sm blog-edit-btn" data-id="${post.id}">Edit</button>
        <button class="btn-danger btn-sm blog-delete-btn" data-id="${post.id}">Delete</button>
      </div>
    </div>
  `).join(''));

  list.querySelectorAll('.blog-edit-btn').forEach((btn) =>
    btn.addEventListener('click', () => openForm(btn.dataset.id)));

  list.querySelectorAll('.blog-delete-btn').forEach((btn) =>
    btn.addEventListener('click', () => handleDelete(btn.dataset.id)));

  list.querySelectorAll('.blog-toggle-btn').forEach((btn) =>
    btn.addEventListener('click', () =>
      handleToggle(btn.dataset.id, btn.dataset.published === 'true')));
}

function openForm(id = null) {
  editingId = id;
  clearError('blog-form-error');
  el('#blog-form-wrapper').style.display = 'block';
  el('#blog-list').style.display = 'none';
  el('#blog-new-btn').style.display = 'none';
  initQuill();

  if (id) {
    const post = blogs.find((b) => b.id === id);
    el('#blog-form-title').textContent = 'Edit Post';
    el('#blog-id').value = post.id;
    el('#blog-title').value = post.title;
    el('#blog-slug').value = post.slug;
    el('#blog-excerpt').value = post.excerpt ?? '';
    quill.clipboard.dangerouslyPasteHTML(post.body ?? '');
    el('#blog-image-url').value = post.cover_image_url ?? '';
    el('#blog-image-preview').innerHTML = post.cover_image_url
      ? `<img src="${post.cover_image_url}" alt="Cover">`
      : '';
  } else {
    el('#blog-form-title').textContent = 'New Post';
    el('#blog-form').reset();
    quill.setContents([]);
    el('#blog-image-preview').innerHTML = '';
    el('#blog-image-url').value = '';
  }
}

function closeForm() {
  el('#blog-form-wrapper').style.display = 'none';
  el('#blog-list').style.display = 'block';
  el('#blog-new-btn').style.display = '';
  editingId = null;
}

function handleImagePreview(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    el('#blog-image-preview').innerHTML = `<img src="${reader.result}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

async function handleSubmit(e) {
  e.preventDefault();
  clearError('blog-form-error');

  const title = el('#blog-title').value.trim();
  const slug = el('#blog-slug').value.trim();
  const excerpt = clamp(el('#blog-excerpt').value.trim(), 300);
  const body = quill.root.innerHTML.trim() === '<p><br></p>' ? '' : quill.root.innerHTML.trim();
  const imageFile = el('#blog-image-file').files[0];
  let cover_image_url = el('#blog-image-url').value;

  if (!title || !slug) {
    showError('blog-form-error', 'Title and slug are required.');
    return;
  }

  const submitBtn = el('#blog-form [type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    if (imageFile) {
      cover_image_url = await uploadImage('blog-images', 'covers', imageFile);
    }

    const payload = { title, slug, excerpt, body, cover_image_url };

    if (editingId) {
      await updateBlog(editingId, payload);
    } else {
      await createBlog(payload);
    }

    closeForm();
    await loadList();
  } catch (err) {
    showError('blog-form-error', err.message ?? 'Failed to save post.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Post';
  }
}

async function handleDelete(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  try {
    await deleteBlog(id);
    await loadList();
  } catch (err) {
    alert('Failed to delete post: ' + err.message);
  }
}

async function handleToggle(id, currentPublished) {
  try {
    await toggleBlogPublished(id, currentPublished);
    await loadList();
  } catch (err) {
    alert('Failed to update post: ' + err.message);
  }
}
