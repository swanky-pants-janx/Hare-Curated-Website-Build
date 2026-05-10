import {
  getAllProducts, createProduct, updateProduct, deleteProduct, toggleProductVisibility,
} from '../services/product.service.js';
import { uploadImage } from '../services/storage.service.js';
import { el, on, setHTML, showError, clearError } from '../utils/dom.js';
import { toSlug, formatPrice } from '../utils/format.js';
import { escapeHTML, clamp } from '../utils/sanitize.js';

let products = [];
let editingId = null;

export async function initProductManager() {
  on(el('#product-new-btn'), 'click', () => openForm());
  on(el('#product-cancel-btn'), 'click', closeForm);
  on(el('#product-name'), 'input', () => {
    el('#product-slug').value = toSlug(el('#product-name').value);
  });
  on(el('#product-image-file'), 'change', handleImagePreview);
  on(el('#product-form'), 'submit', handleSubmit);

  await loadList();
}

async function loadList() {
  const list = el('#product-list');
  list.textContent = 'Loading...';
  try {
    products = await getAllProducts();
    renderList();
  } catch (err) {
    list.textContent = 'Failed to load products.';
    console.error(err);
  }
}

function renderList() {
  const list = el('#product-list');
  if (!products.length) {
    list.innerHTML = '<p class="empty-state">No products yet. Add your first one.</p>';
    return;
  }
  setHTML(list, products.map((p) => `
    <div class="item-row" data-id="${p.id}">
      ${p.cover_image_url
        ? `<img class="item-thumbnail" src="${p.cover_image_url}" alt="${escapeHTML(p.name)}">`
        : '<div class="item-thumbnail item-thumbnail-empty"></div>'}
      <div class="item-info">
        <strong>${escapeHTML(p.name)}</strong>
        <span class="item-meta">${escapeHTML(p.category ?? '')} &middot; ${formatPrice(p.price_from)} &middot; ${p.visible ? '<span class="badge badge-green">Visible</span>' : '<span class="badge badge-grey">Hidden</span>'}</span>
      </div>
      <div class="item-actions">
        <button class="btn-secondary btn-sm product-toggle-btn" data-id="${p.id}" data-visible="${p.visible}">
          ${p.visible ? 'Hide' : 'Show'}
        </button>
        <button class="btn-secondary btn-sm product-edit-btn" data-id="${p.id}">Edit</button>
        <button class="btn-danger btn-sm product-delete-btn" data-id="${p.id}">Delete</button>
      </div>
    </div>
  `).join(''));

  list.querySelectorAll('.product-edit-btn').forEach((btn) =>
    btn.addEventListener('click', () => openForm(btn.dataset.id)));

  list.querySelectorAll('.product-delete-btn').forEach((btn) =>
    btn.addEventListener('click', () => handleDelete(btn.dataset.id)));

  list.querySelectorAll('.product-toggle-btn').forEach((btn) =>
    btn.addEventListener('click', () =>
      handleToggle(btn.dataset.id, btn.dataset.visible === 'true')));
}

function openForm(id = null) {
  editingId = id;
  clearError('product-form-error');
  el('#product-form-wrapper').style.display = 'block';
  el('#product-list').style.display = 'none';
  el('#product-new-btn').style.display = 'none';

  if (id) {
    const p = products.find((x) => x.id === id);
    el('#product-form-title').textContent = 'Edit Product';
    el('#product-id').value = p.id;
    el('#product-name').value = p.name;
    el('#product-slug').value = p.slug;
    el('#product-category').value = p.category ?? '';
    el('#product-price').value = p.price_from ?? '';
    el('#product-description').value = p.description ?? '';
    el('#product-image-url').value = p.cover_image_url ?? '';
    el('#product-image-preview').innerHTML = p.cover_image_url
      ? `<img src="${p.cover_image_url}" alt="Cover">`
      : '';
  } else {
    el('#product-form-title').textContent = 'New Product';
    el('#product-form').reset();
    el('#product-image-preview').innerHTML = '';
    el('#product-image-url').value = '';
  }
}

function closeForm() {
  el('#product-form-wrapper').style.display = 'none';
  el('#product-list').style.display = 'block';
  el('#product-new-btn').style.display = '';
  editingId = null;
}

function handleImagePreview(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    el('#product-image-preview').innerHTML = `<img src="${reader.result}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

async function handleSubmit(e) {
  e.preventDefault();
  clearError('product-form-error');

  const name = el('#product-name').value.trim();
  const slug = el('#product-slug').value.trim();
  const category = el('#product-category').value.trim();
  const price_from = parseFloat(el('#product-price').value) || null;
  const description = clamp(el('#product-description').value.trim(), 2000);
  const imageFile = el('#product-image-file').files[0];
  let cover_image_url = el('#product-image-url').value;

  if (!name || !slug) {
    showError('product-form-error', 'Name and slug are required.');
    return;
  }

  const submitBtn = el('#product-form [type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    if (imageFile) {
      cover_image_url = await uploadImage('product-images', 'covers', imageFile);
    }

    const payload = { name, slug, category, price_from, description, cover_image_url };

    if (editingId) {
      await updateProduct(editingId, payload);
    } else {
      await createProduct(payload);
    }

    closeForm();
    await loadList();
  } catch (err) {
    showError('product-form-error', err.message ?? 'Failed to save product.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Product';
  }
}

async function handleDelete(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  try {
    await deleteProduct(id);
    await loadList();
  } catch (err) {
    alert('Failed to delete product: ' + err.message);
  }
}

async function handleToggle(id, currentVisible) {
  try {
    await toggleProductVisibility(id, currentVisible);
    await loadList();
  } catch (err) {
    alert('Failed to update product: ' + err.message);
  }
}
