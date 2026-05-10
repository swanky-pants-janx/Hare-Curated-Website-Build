import { supabase } from '../lib/supabase-client.js';
import { uploadPDF } from '../services/storage.service.js';
import { getPitchDecks } from '../services/quote.service.js';
import { el, on, setHTML, showError, clearError } from '../utils/dom.js';
import { escapeHTML } from '../utils/sanitize.js';

let decks = [];
let rules = [];
let editingRuleId = null;

export async function initPitchDeckManager() {
  on(el('#deck-upload-btn'), 'click', () => {
    el('#deck-upload-wrapper').style.display = 'block';
    el('#deck-upload-btn').style.display = 'none';
  });
  on(el('#deck-cancel-btn'), 'click', () => {
    el('#deck-upload-wrapper').style.display = 'none';
    el('#deck-upload-btn').style.display = '';
  });
  on(el('#deck-form'), 'submit', handleDeckUpload);

  on(el('#rule-new-btn'), 'click', () => openRuleForm());
  on(el('#rule-cancel-btn'), 'click', closeRuleForm);
  on(el('#rule-form'), 'submit', handleRuleSubmit);

  await loadDecks();
  await loadRules();
}

// ── Pitch Decks ─────────────────────────────────────────────────────────────

async function loadDecks() {
  const list = el('#deck-list');
  list.textContent = 'Loading...';
  try {
    decks = await getPitchDecks();
    renderDecks();
    populateDeckSelect();
  } catch (err) {
    list.textContent = 'Failed to load pitch decks.';
    console.error(err);
  }
}

function renderDecks() {
  const list = el('#deck-list');
  if (!decks.length) {
    list.innerHTML = '<p class="empty-state">No pitch decks uploaded yet.</p>';
    return;
  }
  setHTML(list, decks.map((d) => `
    <div class="item-row" data-id="${d.id}">
      <div class="item-info">
        <strong>${escapeHTML(d.name)}</strong>
        <a href="${d.pdf_url}" target="_blank" rel="noopener" class="btn-secondary btn-sm">View PDF</a>
      </div>
      <div class="item-actions">
        <button class="btn-danger btn-sm deck-delete-btn" data-id="${d.id}">Delete</button>
      </div>
    </div>
  `).join(''));

  list.querySelectorAll('.deck-delete-btn').forEach((btn) =>
    btn.addEventListener('click', () => handleDeckDelete(btn.dataset.id)));
}

function populateDeckSelect() {
  const select = el('#rule-deck-id');
  const current = select.value;
  select.innerHTML = '<option value="">Select a pitch deck...</option>' +
    decks.map((d) => `<option value="${d.id}">${escapeHTML(d.name)}</option>`).join('');
  if (current) select.value = current;
}

async function handleDeckUpload(e) {
  e.preventDefault();
  clearError('deck-form-error');

  const name = el('#deck-name').value.trim();
  const file = el('#deck-file').files[0];

  if (!name || !file) {
    showError('deck-form-error', 'Name and PDF file are required.');
    return;
  }

  const submitBtn = el('#deck-form [type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';

  try {
    const pdf_url = await uploadPDF('pitch-decks', 'decks', file);

    const { error } = await supabase.from('pitch_decks').insert([{ name, pdf_url }]);
    if (error) throw error;

    el('#deck-form').reset();
    el('#deck-upload-wrapper').style.display = 'none';
    el('#deck-upload-btn').style.display = '';
    await loadDecks();
  } catch (err) {
    showError('deck-form-error', err.message ?? 'Upload failed.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload';
  }
}

async function handleDeckDelete(id) {
  if (!confirm('Delete this pitch deck? Rules referencing it will break.')) return;
  try {
    const { error } = await supabase.from('pitch_decks').delete().eq('id', id);
    if (error) throw error;
    await loadDecks();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

// ── Mapping Rules ────────────────────────────────────────────────────────────

async function loadRules() {
  const list = el('#rule-list');
  list.textContent = 'Loading...';
  try {
    const { data, error } = await supabase
      .from('pitch_deck_rules')
      .select('*, pitch_decks(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    rules = data;
    renderRules();
  } catch (err) {
    list.textContent = 'Failed to load rules.';
    console.error(err);
  }
}

function renderRules() {
  const list = el('#rule-list');
  if (!rules.length) {
    list.innerHTML = '<p class="empty-state">No rules yet. Add one to map answers to a pitch deck.</p>';
    return;
  }
  setHTML(list, rules.map((r) => `
    <div class="item-row" data-id="${r.id}">
      <div class="item-info">
        <strong>${escapeHTML(r.name)}</strong>
        <span class="item-meta">Deck: ${escapeHTML(r.pitch_decks?.name ?? 'Unknown')}</span>
        <details><summary>Conditions</summary><pre>${escapeHTML(JSON.stringify(r.conditions, null, 2))}</pre></details>
      </div>
      <div class="item-actions">
        <button class="btn-secondary btn-sm rule-edit-btn" data-id="${r.id}">Edit</button>
        <button class="btn-danger btn-sm rule-delete-btn" data-id="${r.id}">Delete</button>
      </div>
    </div>
  `).join(''));

  list.querySelectorAll('.rule-edit-btn').forEach((btn) =>
    btn.addEventListener('click', () => openRuleForm(btn.dataset.id)));
  list.querySelectorAll('.rule-delete-btn').forEach((btn) =>
    btn.addEventListener('click', () => handleRuleDelete(btn.dataset.id)));
}

function openRuleForm(id = null) {
  editingRuleId = id;
  clearError('rule-form-error');
  el('#rule-form-wrapper').style.display = 'block';

  if (id) {
    const r = rules.find((x) => x.id === id);
    el('#rule-form-title').textContent = 'Edit Rule';
    el('#rule-id').value = r.id;
    el('#rule-name').value = r.name;
    el('#rule-conditions').value = JSON.stringify(r.conditions, null, 2);
    el('#rule-deck-id').value = r.pitch_deck_id;
  } else {
    el('#rule-form-title').textContent = 'New Rule';
    el('#rule-form').reset();
  }
}

function closeRuleForm() {
  el('#rule-form-wrapper').style.display = 'none';
  editingRuleId = null;
}

async function handleRuleSubmit(e) {
  e.preventDefault();
  clearError('rule-form-error');

  const name = el('#rule-name').value.trim();
  const pitch_deck_id = el('#rule-deck-id').value;
  const conditionsRaw = el('#rule-conditions').value.trim();

  let conditions;
  try {
    conditions = conditionsRaw ? JSON.parse(conditionsRaw) : {};
  } catch {
    showError('rule-form-error', 'Conditions must be valid JSON.');
    return;
  }

  if (!name || !pitch_deck_id) {
    showError('rule-form-error', 'Name and pitch deck are required.');
    return;
  }

  const submitBtn = el('#rule-form [type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    if (editingRuleId) {
      const { error } = await supabase
        .from('pitch_deck_rules')
        .update({ name, conditions, pitch_deck_id })
        .eq('id', editingRuleId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('pitch_deck_rules')
        .insert([{ name, conditions, pitch_deck_id }]);
      if (error) throw error;
    }

    closeRuleForm();
    await loadRules();
  } catch (err) {
    showError('rule-form-error', err.message ?? 'Failed to save rule.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Rule';
  }
}

async function handleRuleDelete(id) {
  if (!confirm('Delete this rule?')) return;
  try {
    const { error } = await supabase.from('pitch_deck_rules').delete().eq('id', id);
    if (error) throw error;
    await loadRules();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}
