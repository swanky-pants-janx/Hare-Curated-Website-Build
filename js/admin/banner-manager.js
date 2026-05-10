import {
  getAllBanners, createBanner, updateBanner, deleteBanner, toggleBannerActive,
} from '../services/banner.service.js';
import { uploadImage } from '../services/storage.service.js';
import { el, on, setHTML, showError, clearError } from '../utils/dom.js';
import { escapeHTML } from '../utils/sanitize.js';

let banners = [];
let editingId = null;

export async function initBannerManager() {
  on(el('#banner-new-btn'), 'click', () => openForm());
  on(el('#banner-cancel-btn'), 'click', closeForm);
  on(el('#banner-image-file'), 'change', handleImagePreview);
  on(el('#banner-form'), 'submit', handleSubmit);

  await loadList();
}

async function loadList() {
  const list = el('#banner-list');
  list.textContent = 'Loading...';
  try {
    banners = await getAllBanners();
    renderList();
  } catch (err) {
    list.textContent = 'Failed to load banners.';
    console.error(err);
  }
}

function renderList() {
  const list = el('#banner-list');
  if (!banners.length) {
    list.innerHTML = '<p class="empty-state">No banners yet. Create your first one.</p>';
    return;
  }
  setHTML(list, banners.map((b) => `
    <div class="item-row" data-id="${b.id}">
      ${b.image_url
        ? `<img class="item-thumbnail" src="${b.image_url}" alt="Banner">`
        : '<div class="item-thumbnail item-thumbnail-empty"></div>'}
      <div class="item-info">
        <strong>${escapeHTML(b.text ?? '(no text)')}</strong>
        <span class="item-meta">Order: ${b.sort_order} &middot; ${b.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-grey">Inactive</span>'}</span>
      </div>
      <div class="item-actions">
        <button class="btn-secondary btn-sm banner-toggle-btn" data-id="${b.id}" data-active="${b.active}">
          ${b.active ? 'Deactivate' : 'Activate'}
        </button>
        <button class="btn-secondary btn-sm banner-edit-btn" data-id="${b.id}">Edit</button>
        <button class="btn-danger btn-sm banner-delete-btn" data-id="${b.id}">Delete</button>
      </div>
    </div>
  `).join(''));

  list.querySelectorAll('.banner-edit-btn').forEach((btn) =>
    btn.addEventListener('click', () => openForm(btn.dataset.id)));

  list.querySelectorAll('.banner-delete-btn').forEach((btn) =>
    btn.addEventListener('click', () => handleDelete(btn.dataset.id)));

  list.querySelectorAll('.banner-toggle-btn').forEach((btn) =>
    btn.addEventListener('click', () =>
      handleToggle(btn.dataset.id, btn.dataset.active === 'true')));
}

function openForm(id = null) {
  editingId = id;
  clearError('banner-form-error');
  el('#banner-form-wrapper').style.display = 'block';
  el('#banner-list').style.display = 'none';
  el('#banner-new-btn').style.display = 'none';

  if (id) {
    const b = banners.find((x) => x.id === id);
    el('#banner-form-title').textContent = 'Edit Banner';
    el('#banner-id').value = b.id;
    el('#banner-text').value = b.text ?? '';
    el('#banner-button-label').value = b.button_label ?? '';
    el('#banner-button-url').value = b.button_url ?? '';
    el('#banner-sort-order').value = b.sort_order ?? 0;
    el('#banner-image-url').value = b.image_url ?? '';
    el('#banner-image-preview').innerHTML = b.image_url
      ? `<img src="${b.image_url}" alt="Banner">`
      : '';
  } else {
    el('#banner-form-title').textContent = 'New Banner';
    el('#banner-form').reset();
    el('#banner-image-preview').innerHTML = '';
    el('#banner-image-url').value = '';
  }
}

function closeForm() {
  el('#banner-form-wrapper').style.display = 'none';
  el('#banner-list').style.display = 'block';
  el('#banner-new-btn').style.display = '';
  editingId = null;
}

function handleImagePreview(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    el('#banner-image-preview').innerHTML = `<img src="${reader.result}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

async function handleSubmit(e) {
  e.preventDefault();
  clearError('banner-form-error');

  const text = el('#banner-text').value.trim();
  const button_label = el('#banner-button-label').value.trim();
  const button_url = el('#banner-button-url').value.trim();
  const sort_order = parseInt(el('#banner-sort-order').value, 10) || 0;
  const imageFile = el('#banner-image-file').files[0];
  let image_url = el('#banner-image-url').value;

  const submitBtn = el('#banner-form [type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    if (imageFile) {
      image_url = await uploadImage('banner-images', 'banners', imageFile);
    }

    const payload = { text, button_label, button_url, sort_order, image_url };

    if (editingId) {
      await updateBanner(editingId, payload);
    } else {
      await createBanner(payload);
    }

    closeForm();
    await loadList();
  } catch (err) {
    showError('banner-form-error', err.message ?? 'Failed to save banner.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Banner';
  }
}

async function handleDelete(id) {
  if (!confirm('Delete this banner? This cannot be undone.')) return;
  try {
    await deleteBanner(id);
    await loadList();
  } catch (err) {
    alert('Failed to delete banner: ' + err.message);
  }
}

async function handleToggle(id, currentActive) {
  try {
    await toggleBannerActive(id, currentActive);
    await loadList();
  } catch (err) {
    alert('Failed to update banner: ' + err.message);
  }
}
